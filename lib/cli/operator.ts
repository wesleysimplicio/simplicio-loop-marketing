import { probeCapabilities } from "../extension/contract";

export function operatorDoctor(packageRoot: string) {
  return { schema: "loop.marketing-operator-doctor/v1", generated_at: new Date().toISOString(), probe: probeCapabilities(packageRoot) };
}

export function cliEntry(args = process.argv.slice(2)): void {
  const action = args[0];
  const rootIndex = args.indexOf("--package-root");
  const packageRoot = rootIndex >= 0 ? args[rootIndex + 1] : process.cwd();
  if (action !== "doctor") {
    process.stderr.write("Usage: marketing-engine operator doctor --json\n");
    process.exitCode = 2;
    return;
  }
  const report = operatorDoctor(packageRoot);
  process.stdout.write(`${JSON.stringify(report)}\n`);
  process.exitCode = report.probe.status === "BLOCKED" ? 2 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) cliEntry();
