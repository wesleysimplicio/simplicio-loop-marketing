import { inspectQualityGate } from "../lib/ci/quality-gate.ts";

const report = inspectQualityGate();
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.pass) process.exitCode = 1;
