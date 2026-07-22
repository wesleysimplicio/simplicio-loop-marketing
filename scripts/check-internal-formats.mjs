#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { runPolicyCli } from "../lib/policy/internal-formats.mjs";

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runPolicyCli(process.argv.slice(2));
}
