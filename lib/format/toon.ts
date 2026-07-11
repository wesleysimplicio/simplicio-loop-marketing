/**
 * TOON (Token-Oriented Object Notation) — minimal encoder/decoder.
 *
 * Losslessly represents JSON-compatible values with a YAML-like, low-token
 * syntax. Used to embed structured data (piece briefs, compliance reports,
 * caption sets, ...) into LLM PROMPT CONTENT instead of raw JSON, which
 * saves tokens on uniform arrays of objects (tabular block instead of
 * repeating keys per element).
 *
 * This module implements ONLY the encoding rules the pipeline needs; it does
 * not depend on any external package (see github.com/toon-format/toon for
 * the reference implementation and full spec this is modeled after).
 *
 * Rules (see YOOL_TUPLE_HAMT-adjacent spec used to drive this module):
 * - Objects: YAML-style 2-space indentation ("key:" then indented lines).
 * - Arrays of uniform objects (same exact key set, scalar-only fields) use a
 *   tabular block: `key[N]{f1,f2}:` header + one comma-separated row per
 *   indented line.
 * - Arrays of scalars use an inline list: `key[N]: v1,v2,v3`.
 * - Arrays that are empty, non-uniform (differing keys, mixed types, or
 *   nested arrays/objects as field values) fall back to compact JSON for
 *   that value: `key: <compact-json>` — this is the deliberate escape hatch
 *   so the format never loses information.
 * - Scalars are unquoted unless quoting is required to keep the value
 *   unambiguous (see needsQuoting below).
 */

const NUMBER_LIKE_RE = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;
const INDENT_UNIT = "  ";

// ---------------------------------------------------------------------------
// Shared value helpers
// ---------------------------------------------------------------------------

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isScalar(
  value: unknown,
): value is string | number | boolean | null {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function indent(level: number): string {
  return INDENT_UNIT.repeat(level);
}

// ---------------------------------------------------------------------------
// Encoder
// ---------------------------------------------------------------------------

function needsQuoting(s: string): boolean {
  if (s === "") return true;
  if (s !== s.trim()) return true; // leading/trailing whitespace
  if (/[,:\n]/.test(s)) return true; // structural delimiters
  if (s === "true" || s === "false" || s === "null") return true;
  if (NUMBER_LIKE_RE.test(s) || s.startsWith('\"') || s.endsWith('\"')) return true;
  return false;
}

function encodeStringScalar(s: string): string {
  // JSON.stringify here is only used as a string-escaping primitive for a
  // single scalar value inside the TOON grammar, not as the outer format —
  // TOON quoted strings use the same escaping rules as JSON string literals.
  return needsQuoting(s) ? JSON.stringify(s) : s;
}

function encodeScalar(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return encodeStringScalar(value);
  // Defensive: should not happen for values that already passed the
  // uniform/scalar-array checks below.
  return JSON.stringify(value);
}

/**
 * All elements are plain objects with the exact same set of keys, and every
 * field value across every row is itself a scalar (so it fits in a single
 * comma-separated cell). Anything else is non-uniform.
 */
function isUniformObjectArray(
  arr: unknown[],
): arr is Array<Record<string, unknown>> {
  if (arr.length === 0 || !isPlainObject(arr[0])) return false;
  const referenceKeys = Object.keys(arr[0]).sort();
  for (const item of arr) {
    if (!isPlainObject(item)) return false;
    const keys = Object.keys(item).sort();
    if (keys.length !== referenceKeys.length) return false;
    for (let i = 0; i < keys.length; i++) {
      if (keys[i] !== referenceKeys[i]) return false;
    }
    for (const key of keys) {
      const v = item[key];
      // Nested arrays/objects as a cell value can't fit a tabular row —
      // fall back to compact JSON for the whole array (spec requirement).
      if (isPlainObject(v) || Array.isArray(v)) return false;
    }
  }
  return true;
}

function isScalarArray(arr: unknown[]): boolean {
  return arr.length > 0 && arr.every(isScalar);
}

function compactJson(value: unknown): string {
  return JSON.stringify(value);
}

function fallbackLine(key: string, value: unknown): string {
  // Deliberate JSON fallback: empty array, non-uniform array (differing
  // keys/mixed types), or an array whose elements carry nested
  // arrays/objects — none of these fit the tabular or inline-list grammar
  // without losing structure, so we keep the value as compact JSON instead
  // of guessing at a lossy shape.
  return key === "" ? compactJson(value) : `${key}: ${compactJson(value)}`;
}

function encodeArrayBody(
  key: string,
  arr: unknown[],
  indentLevel: number,
): string[] {
  if (arr.length === 0) {
    return [`${indent(indentLevel)}${fallbackLine(key, arr)}`];
  }
  if (isUniformObjectArray(arr)) {
    const fields = Object.keys(arr[0]);
    const header = `${key}[${arr.length}]{${fields.join(",")}}:`;
    const lines = [`${indent(indentLevel)}${header}`];
    for (const row of arr) {
      const cells = fields.map((f) => encodeScalar(row[f]));
      lines.push(`${indent(indentLevel + 1)}${cells.join(",")}`);
    }
    return lines;
  }
  if (isScalarArray(arr)) {
    const header = `${key}[${arr.length}]:`;
    const values = arr.map((v) => encodeScalar(v)).join(",");
    return [`${indent(indentLevel)}${header} ${values}`];
  }
  // Non-uniform objects or mixed scalar/object elements.
  return [`${indent(indentLevel)}${fallbackLine(key, arr)}`];
}

function encodeObjectBody(
  obj: Record<string, unknown>,
  indentLevel: number,
): string[] {
  const lines: string[] = [];
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (value === undefined) continue; // mirrors JSON.stringify semantics
    if (Array.isArray(value)) {
      lines.push(...encodeArrayBody(key, value, indentLevel));
    } else if (isPlainObject(value)) {
      const nestedKeys = Object.keys(value);
      if (nestedKeys.length === 0) {
        lines.push(`${indent(indentLevel)}${key}: {}`);
      } else {
        lines.push(`${indent(indentLevel)}${key}:`);
        lines.push(...encodeObjectBody(value, indentLevel + 1));
      }
    } else {
      lines.push(`${indent(indentLevel)}${key}: ${encodeScalar(value)}`);
    }
  }
  return lines;
}

export function encodeToon(value: unknown): string {
  if (Array.isArray(value)) {
    return encodeArrayBody("", value, 0).join("\n");
  }
  if (isPlainObject(value)) {
    return encodeObjectBody(value, 0).join("\n");
  }
  return encodeScalar(value);
}

// ---------------------------------------------------------------------------
// Decoder
// ---------------------------------------------------------------------------

function decodeScalar(raw: string): unknown {
  const s = raw.trim();
  if (s === "null") return null;
  if (s === "true") return true;
  if (s === "false") return false;
  if (NUMBER_LIKE_RE.test(s)) return Number(s);
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) {
    try {
      return JSON.parse(s);
    } catch {
      return s;
    }
  }
  return s;
}

function splitCsv(line: string): string[] {
  if (line === "") return [];
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      cur += ch;
    } else if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

function leadingIndent(line: string): number {
  let n = 0;
  while (line[n] === " ") n++;
  return Math.floor(n / 2);
}

const ARRAY_HEADER_RE = /^([^:[]+)\[(\d+)\](\{([^}]*)\})?:\s?(.*)$/;
const KEY_VALUE_RE = /^([^:]+):\s?(.*)$/;

function decodeArrayHeaderTail(
  count: number,
  fieldsStr: string | undefined,
  inline: string,
  lines: string[],
  rowStartIdx: number,
): { value: unknown[]; nextIdx: number } {
  if (fieldsStr !== undefined) {
    const fields = fieldsStr.length
      ? fieldsStr.split(",").map((f) => f.trim())
      : [];
    const rows: Record<string, unknown>[] = [];
    let i = rowStartIdx;
    for (let r = 0; r < count; r++) {
      const rowLine = lines[i] ?? "";
      const cells = splitCsv(rowLine.trim());
      const rowObj: Record<string, unknown> = {};
      fields.forEach((f, idx) => {
        rowObj[f] = decodeScalar(cells[idx] ?? "");
      });
      rows.push(rowObj);
      i++;
    }
    return { value: rows, nextIdx: i };
  }
  const trimmedInline = inline.trim();
  if (count === 0 || trimmedInline === "") {
    return { value: [], nextIdx: rowStartIdx };
  }
  return {
    value: splitCsv(trimmedInline).map((v) => decodeScalar(v)),
    nextIdx: rowStartIdx,
  };
}

function decodeObjectBody(
  lines: string[],
  startIdx: number,
  indentLevel: number,
): { value: Record<string, unknown>; nextIdx: number } {
  const obj: Record<string, unknown> = {};
  let i = startIdx;
  while (i < lines.length) {
    const rawLine = lines[i];
    if (rawLine.trim() === "") {
      i++;
      continue;
    }
    const lineIndent = leadingIndent(rawLine);
    if (lineIndent < indentLevel) break;
    if (lineIndent > indentLevel) {
      // Malformed/unexpected indentation — skip defensively rather than throw.
      i++;
      continue;
    }
    const content = rawLine.slice(lineIndent * 2);

    const arrMatch = ARRAY_HEADER_RE.exec(content);
    if (arrMatch) {
      const key = arrMatch[1];
      const count = Number(arrMatch[2]);
      const fieldsStr = arrMatch[4];
      const inline = arrMatch[5];
      const { value, nextIdx } = decodeArrayHeaderTail(
        count,
        fieldsStr,
        inline,
        lines,
        i + 1,
      );
      obj[key] = value;
      i = fieldsStr !== undefined ? nextIdx : i + 1;
      continue;
    }

    const kvMatch = KEY_VALUE_RE.exec(content);
    if (kvMatch) {
      const key = kvMatch[1].trim();
      const rest = kvMatch[2];
      if (rest === "") {
        const nested = decodeObjectBody(lines, i + 1, indentLevel + 1);
        obj[key] = nested.value;
        i = nested.nextIdx;
      } else if (rest === "{}") {
        obj[key] = {};
        i++;
      } else if (rest === "[]") {
        obj[key] = [];
        i++;
      } else if (/^[[{]/.test(rest.trim())) {
        try {
          obj[key] = JSON.parse(rest.trim());
        } catch {
          obj[key] = decodeScalar(rest);
        }
        i++;
      } else {
        obj[key] = decodeScalar(rest);
        i++;
      }
      continue;
    }

    // Unrecognized line shape — skip rather than throw, decoder stays lenient.
    i++;
  }
  return { value: obj, nextIdx: i };
}

function decodeRootArray(lines: string[]): unknown {
  const m = /^\[(\d+)\](\{([^}]*)\})?:\s?(.*)$/.exec(lines[0]);
  if (!m) throw new Error("toon: invalid root array header");
  const count = Number(m[1]);
  const fieldsStr = m[3];
  const inline = m[4];
  return decodeArrayHeaderTail(count, fieldsStr, inline, lines, 1).value;
}

export function decodeToon(text: string): unknown {
  const raw = text.replace(/\r\n/g, "\n").replace(/\n+$/, "");
  if (raw.trim() === "") return {};
  const lines = raw.split("\n");
  const first = lines[0];

  // Root-level array header (tabular or inline scalar list), no key prefix.
  if (/^\[\d+\](\{[^}]*\})?:/.test(first)) {
    return decodeRootArray(lines);
  }

  // Whole-text compact JSON fallback: used for empty/non-uniform root
  // arrays, and any other root value the encoder chose to fall back for.
  const firstTrimmed = first.trim();
  if (
    lines.length === 1 &&
    /^[[{]/.test(firstTrimmed) &&
    /[\]}]$/.test(firstTrimmed)
  ) {
    try {
      return JSON.parse(firstTrimmed);
    } catch {
      // Not actually JSON — fall through to object/scalar handling below.
    }
  }

  // Object body: one or more "key: value" / "key[N]{...}:" lines.
  if (/^\S/.test(first) && first.includes(":")) {
    return decodeObjectBody(lines, 0, 0).value;
  }

  // Bare root scalar.
  return decodeScalar(raw.trim());
}
