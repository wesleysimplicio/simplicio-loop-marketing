import { gateEvidence } from "../gate/evidence";

export function cliEntry(argv: string[]): void {
  const pieceId = argv[0];
  if (!pieceId) throw new Error("usage: evidence gate <piece-id>");
  const result = gateEvidence(process.env.MARKETING_ENGINE_HOST_ROOT ?? process.cwd(), pieceId);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.pass) process.exitCode = 3;
}

