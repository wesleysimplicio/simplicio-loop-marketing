#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const POLICY = join(ROOT, "config", "json-boundaries.toml");
const SKIP = new Set([".git", "node_modules", "dist", "build", "coverage", "test-results", "playwright-report"]);
const JSON_SUFFIXES = new Set([".json", ".jsonl", ".ndjson"]);
const INTERNAL = new Set(["internal_persistence", "internal_cache", "internal_ipc", "internal_fixture_or_evidence", "internal_index"]);
const SOURCE_SUFFIXES = new Set([".js", ".mjs", ".ts", ".tsx", ".py", ".rs", ".sh", ".ps1"]);

function parsePolicy() {
  const entries = [];
  let current = null;
  for (const raw of readFileSync(POLICY, "utf8").split(/\r?\n/)) {
    const line = raw.split("#", 1)[0].trim();
    if (!line) continue;
    if (line === "[[paths]]") {
      if (current) entries.push(current);
      current = {};
      continue;
    }
    if (!current || !line.includes("=")) continue;
    const [key, ...rest] = line.split("=");
    current[key.trim()] = rest.join("=").trim().replace(/^"|"$/g, "");
  }
  if (current) entries.push(current);
  return entries;
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

function findEntry(path, entries) {
  return entries.find((entry) => {
    const pattern = entry.pattern ?? "";
    return pattern.endsWith("/**")
      ? path.startsWith(pattern.slice(0, -2))
      : path === pattern;
  });
}

function sourceUsesInternalJson(text) {
  return /(^|\\s)(import|from)\\s+json\\b|serde_json|JSON\\.parse\\s*\\(|JSON\\.stringify\\s*\\(|\\.jsonl\\b|\\.ndjson\\b/.test(text);
}

function main() {
  const strict = process.argv.includes("--strict") || process.env.SIMPLICIO_FORMAT_STRICT === "1";
  const entries = parsePolicy();
  const unknown = [];
  const migration = [];
  const bounded = [];
  for (const absolute of walk(ROOT)) {
    const path = relative(ROOT, absolute).replaceAll("\\\\", "/");
    const suffix = extname(path).toLowerCase();
    const entry = findEntry(path, entries);
    if (JSON_SUFFIXES.has(suffix)) {
      if (!entry) unknown.push(path);
      else if (INTERNAL.has(entry.category)) migration.push(path + " (" + entry.target_format + ")");
      else bounded.push(path + " (" + entry.category + ")");
    }
    if (SOURCE_SUFFIXES.has(suffix) && path !== "scripts/check-internal-formats.mjs" && path !== "scripts/lint.js") {
      const text = readFileSync(absolute, "utf8");
      if (sourceUsesInternalJson(text)) {
        if (!entry) unknown.push(path + " (source JSON usage)");
        else if (INTERNAL.has(entry.category)) migration.push(path + " (source JSON usage)");
        else bounded.push(path + " (boundary JSON usage)");
      }
    }
  }
  console.log("# Simplicio internal-format policy");
  console.log("\\nMode: " + (strict ? "strict" : "baseline"));
  console.log("\\n## Allowed or explicitly bounded");
  console.log(bounded.length ? bounded.sort().map((item) => "- " + item).join("\\n") : "- none");
  console.log("\\n## Migration required");
  console.log(migration.length ? migration.sort().map((item) => "- " + item).join("\\n") : "- none");
  console.log("\\n## Unclassified");
  console.log(unknown.length ? unknown.sort().map((item) => "- " + item).join("\\n") : "- none");
  if (unknown.length) process.exitCode = 1;
  else if (strict && migration.length) process.exitCode = 2;
}

main();
