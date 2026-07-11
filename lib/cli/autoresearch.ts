import { runAutoresearch } from "../loop/autoresearch";

function value(argv: string[], name: string, fallback: string): string {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] ?? fallback : fallback;
}

export async function cliEntry(argv: string[]): Promise<void> {
  const client = value(argv, "--client", "default");
  const briefs = argv.flatMap((arg, i) => arg === "--brief" ? [argv[i + 1] ?? ""] : []).filter(Boolean);
  const result = await runAutoresearch({ root: process.cwd(), client, briefs: briefs.length ? briefs : ["Improve this product story with a clear call to action."], maxIter: Number(value(argv, "--max-iter", "3")) });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (import.meta.url.endsWith("/autoresearch.ts")) cliEntry(process.argv.slice(2)).catch((err) => { process.stderr.write(`autoresearch failed: ${String(err)}\n`); process.exit(1); });
