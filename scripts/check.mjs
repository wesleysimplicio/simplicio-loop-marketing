import { spawnSync } from "node:child_process";
const python = process.platform === "win32" ? "python" : "python3";
const sections = [["typecheck", "npm", ["run", "typecheck"]], ["e2e", "npm", ["run", "test:e2e"]], ["action-gate", python, ["hooks/action_gate.py", "selftest"]], ["doctor", "node", ["bin/marketing-engine.mjs", "doctor"]], ["claims-audit", "node", ["scripts/claims-audit.mjs"]]];
let failed = 0;
const summary = [];
for (const [name, command, args] of sections) {
  const r = spawnSync(command, args, { stdio: "inherit" });
  const ok = r.status === 0;
  summary.push(`- ${ok ? "PASS" : "FAIL"} ${name} :: ${command} ${args.join(" ")}`);
  console.error(`check: ${ok ? "PASS" : "FAIL"} ${name}`);
  if (!ok) failed++;
}
console.error("check: summary");
for (const line of summary) console.error(line);
process.exit(failed ? 1 : 0);
