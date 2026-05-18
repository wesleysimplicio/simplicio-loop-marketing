export interface PieceFrontmatter {
  id: string;
  client: string;
  campaign?: string;
  date: string;
  status: "draft" | "scheduled" | "published" | "measured" | "review";
  type: string;
  pillar: string;
  platforms: string[];
  provider_override?: {
    llm_text?: string | null;
    image?: string | null;
    video?: string | null;
    ads?: string | null;
  };
  locale?: string;
  compliance_report?: string;
  compliance_block?: Array<{ rule_id: string; snippet?: string }>;
}

export interface ParsedPiece {
  frontmatter: PieceFrontmatter;
  body: string;
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;

function parseScalar(raw: string): string | number | boolean | null {
  const v = raw.trim();
  if (v === "null" || v === "~") return null;
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1);
  }
  return v;
}

function parseInline(raw: string): unknown {
  const t = raw.trim();
  if (t.startsWith("[") && t.endsWith("]")) {
    const inner = t.slice(1, -1).trim();
    if (inner === "") return [];
    return inner.split(",").map((s) => {
      const v = s.trim();
      return parseScalar(v.replace(/^['"]|['"]$/g, ""));
    });
  }
  if (t.startsWith("{") && t.endsWith("}")) {
    const inner = t.slice(1, -1).trim();
    if (inner === "") return {};
    const out: Record<string, unknown> = {};
    for (const pair of inner.split(",")) {
      const [k, v] = pair.split(":").map((s) => s.trim());
      if (k) out[k.replace(/^['"]|['"]$/g, "")] = parseScalar(v ?? "");
    }
    return out;
  }
  return parseScalar(t);
}

interface YamlNode {
  indent: number;
  key: string;
  value: unknown;
  children: YamlNode[];
}

function parseSimpleYaml(text: string): Record<string, unknown> {
  const lines = text.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#"));
  const root: YamlNode[] = [];
  const stack: Array<{ indent: number; container: YamlNode[] }> = [
    { indent: -1, container: root },
  ];

  for (const line of lines) {
    const indent = line.length - line.trimStart().length;
    const trimmed = line.trim();
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }
    const parent = stack[stack.length - 1];
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    const rawVal = trimmed.slice(colonIdx + 1).trim();
    const node: YamlNode = {
      indent,
      key,
      value: rawVal === "" ? undefined : parseInline(rawVal),
      children: [],
    };
    parent.container.push(node);
    if (rawVal === "") {
      stack.push({ indent, container: node.children });
    }
  }

  const obj: Record<string, unknown> = {};
  function flatten(nodes: YamlNode[], target: Record<string, unknown>): void {
    for (const node of nodes) {
      if (node.value !== undefined) {
        target[node.key] = node.value;
      } else if (node.children.length > 0) {
        const sub: Record<string, unknown> = {};
        flatten(node.children, sub);
        target[node.key] = sub;
      } else {
        target[node.key] = null;
      }
    }
  }
  flatten(root, obj);
  return obj;
}

const REQUIRED_KEYS: Array<keyof PieceFrontmatter> = [
  "id",
  "client",
  "date",
  "status",
  "type",
  "pillar",
  "platforms",
  "locale",
];

export function parsePiece(text: string): ParsedPiece {
  const match = FRONTMATTER_RE.exec(text);
  if (!match) {
    throw new Error("piece: missing or malformed frontmatter (expected --- block)");
  }
  const fmText = match[1];
  const body = match[2] ?? "";
  const raw = parseSimpleYaml(fmText);
  for (const k of REQUIRED_KEYS) {
    if (raw[k] === undefined || raw[k] === null) {
      throw new Error(`piece: required frontmatter key missing: ${k}`);
    }
  }
  return {
    frontmatter: raw as unknown as PieceFrontmatter,
    body: body.trimStart(),
  };
}

export function serializePiece(fm: PieceFrontmatter, body: string): string {
  const lines: string[] = ["---"];
  function writeValue(key: string, value: unknown, indent = 0): void {
    const pad = " ".repeat(indent);
    if (value === null || value === undefined) {
      lines.push(`${pad}${key}: null`);
    } else if (Array.isArray(value)) {
      const inline = `[${value.map((v) => JSON.stringify(v)).join(", ")}]`;
      lines.push(`${pad}${key}: ${inline}`);
    } else if (typeof value === "object") {
      lines.push(`${pad}${key}:`);
      for (const [k, v] of Object.entries(value)) {
        writeValue(k, v, indent + 2);
      }
    } else if (typeof value === "string") {
      lines.push(`${pad}${key}: ${value}`);
    } else {
      lines.push(`${pad}${key}: ${String(value)}`);
    }
  }
  for (const [k, v] of Object.entries(fm)) {
    writeValue(k, v);
  }
  lines.push("---");
  return `${lines.join("\n")}\n${body}`;
}
