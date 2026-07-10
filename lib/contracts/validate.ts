/**
 * validate.ts — subset JSON Schema validator for versioned artifacts.
 *
 * Port of the simplicio-mapper contract pattern
 * (contracts/mapper-artifacts/v1): every persisted JSON artifact carries a
 * self-describing `schema` field that selects which schema validates it.
 *
 * Deliberately a SUBSET of JSON Schema — `type`, `required`, `properties`,
 * `items`, `enum`, `minItems`, `const` — with `additionalProperties`
 * implicitly always allowed: additive fields never break consumers, only a
 * missing/mistyped required field does. No external validator dependency.
 */

export interface SubsetSchema {
  $id?: string;
  type?: string | string[];
  required?: string[];
  properties?: Record<string, SubsetSchema>;
  items?: SubsetSchema;
  enum?: unknown[];
  const?: unknown;
  minItems?: number;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

function typeOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number" && Number.isInteger(value)) return "integer";
  return typeof value;
}

function typeMatches(actual: string, expected: string): boolean {
  if (expected === actual) return true;
  // JSON Schema: integers satisfy "number".
  if (expected === "number" && actual === "integer") return true;
  return false;
}

function validateNode(
  value: unknown,
  schema: SubsetSchema,
  path: string,
  errors: string[],
): void {
  if (schema.const !== undefined) {
    if (JSON.stringify(value) !== JSON.stringify(schema.const)) {
      errors.push(`${path}: expected const ${JSON.stringify(schema.const)}, got ${JSON.stringify(value)}`);
      return;
    }
  }
  if (schema.enum) {
    const hit = schema.enum.some((e) => JSON.stringify(e) === JSON.stringify(value));
    if (!hit) {
      errors.push(`${path}: value ${JSON.stringify(value)} not in enum ${JSON.stringify(schema.enum)}`);
      return;
    }
  }
  if (schema.type) {
    const actual = typeOf(value);
    const expected = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!expected.some((t) => typeMatches(actual, t))) {
      errors.push(`${path}: expected type ${expected.join("|")}, got ${actual}`);
      return;
    }
  }
  // A key holding `undefined` disappears on JSON.stringify — treat it as
  // absent so in-memory documents validate the same as their serialized form.
  if (typeOf(value) === "object" && schema.properties) {
    const obj = value as Record<string, unknown>;
    for (const key of schema.required ?? []) {
      if (obj[key] === undefined) {
        errors.push(`${path}: missing required property "${key}"`);
      }
    }
    for (const [key, sub] of Object.entries(schema.properties)) {
      if (obj[key] !== undefined) {
        validateNode(obj[key], sub, `${path}.${key}`, errors);
      }
    }
  } else if (schema.required && typeOf(value) === "object") {
    const obj = value as Record<string, unknown>;
    for (const key of schema.required) {
      if (obj[key] === undefined) {
        errors.push(`${path}: missing required property "${key}"`);
      }
    }
  }
  if (typeOf(value) === "array") {
    const arr = value as unknown[];
    if (schema.minItems !== undefined && arr.length < schema.minItems) {
      errors.push(`${path}: expected at least ${schema.minItems} item(s), got ${arr.length}`);
    }
    if (schema.items) {
      arr.forEach((item, i) => validateNode(item, schema.items as SubsetSchema, `${path}[${i}]`, errors));
    }
  }
}

/** Validate a value against a subset schema. */
export function validate(value: unknown, schema: SubsetSchema): ValidationResult {
  const errors: string[] = [];
  validateNode(value, schema, "$", errors);
  return { ok: errors.length === 0, errors };
}

/**
 * Validate a self-describing artifact against a registry keyed by its
 * `schema` field. Artifacts whose `schema` is absent or unknown are SKIPPED
 * (ok with a note), mirroring the mapper contract: unknown artifacts are
 * not failures, only known-and-invalid ones are.
 */
export function validateArtifact(
  artifact: unknown,
  registry: Record<string, SubsetSchema>,
): ValidationResult & { schema?: string; skipped?: boolean } {
  if (typeOf(artifact) !== "object") {
    return { ok: false, errors: ["$: artifact is not an object"] };
  }
  const schemaId = (artifact as Record<string, unknown>).schema;
  if (typeof schemaId !== "string" || !(schemaId in registry)) {
    return { ok: true, errors: [], skipped: true };
  }
  const result = validate(artifact, registry[schemaId]);
  return { ...result, schema: schemaId };
}
