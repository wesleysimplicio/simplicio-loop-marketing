#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { auditIssues, fetchAllIssues, renderAuditMarkdown } from "../lib/audit/issues.ts";

const repo = process.env.GITHUB_REPOSITORY || "wesleysimplicio/simplicio-loop-marketing";
const jsonPath = resolve(process.argv[2] || "docs/audits/issues.json");
const markdownPath = resolve(process.argv[3] || "docs/audits/issues.md");
const source = process.env.AUDIT_ISSUES_INPUT;
const issues = source ? JSON.parse(await readFile(resolve(source), "utf8")) : await fetchAllIssues(repo);
const audit = auditIssues(issues);
await Promise.all([mkdir(dirname(jsonPath), { recursive: true }), mkdir(dirname(markdownPath), { recursive: true })]);
await Promise.all([writeFile(jsonPath, JSON.stringify(audit, null, 2) + "\n"), writeFile(markdownPath, renderAuditMarkdown(audit))]);
process.stdout.write(`audited=${audit.total} compliant=${audit.compliant} percent=${audit.compliancePercent}\n`);
