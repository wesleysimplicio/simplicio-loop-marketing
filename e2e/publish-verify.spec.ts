import { test, expect } from "@playwright/test";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  publishVerified,
  producePublishReceiptFixture,
  RECEIPT_SCHEMA,
} from "../lib/publish/verify-pipeline";
import type { PublishClient, PublishPiece, PublishResult } from "../lib/publish/adaptlypost";
import { runGenerateLoop } from "../lib/cli/generate";
import { runLoop } from "../lib/cli/loop";
import { serializePiece } from "../lib/pieces/frontmatter";
import { loadSchemaRegistry } from "../lib/contracts/registry";
import { validateArtifact } from "../lib/contracts/validate";

class FlakyClient implements PublishClient {
  readonly name = "flaky-test";
  calls = 0;
  constructor(private failFirst: number) {}
  async schedule(piece: PublishPiece): Promise<PublishResult> {
    this.calls++;
    if (this.calls <= this.failFirst) {
      throw new Error(`synthetic transport failure #${this.calls}`);
    }
    return { ok: true, draft_url: `https://flaky.test/${piece.id}` };
  }
}

/** Seed a host with one piece taken through the REAL generate pipeline. */
async function seedScheduledPiece(id: string): Promise<{ host: string; ws: string }> {
  process.env.DRY_RUN = "true";
  const host = mkdtempSync(join(tmpdir(), "me-pub-"));
  const ws = join(host, ".marketing-engine");
  mkdirSync(join(ws, "pieces"), { recursive: true });
  mkdirSync(join(ws, "data"), { recursive: true });
  writeFileSync(
    join(ws, "pieces", `${id}.md`),
    serializePiece(
      {
        id,
        client: "acme",
        date: "2026-05-08",
        status: "draft",
        type: "reel",
        pillar: "education",
        platforms: ["instagram"],
        locale: "en",
      },
      "# Brief\n\nLaunch our new product.\n",
    ),
  );
  const prevCwd = process.cwd();
  process.chdir(host);
  try {
    const summary = await runGenerateLoop({ root: host });
    expect(summary.advanced).toBe(1);
  } finally {
    process.chdir(prevCwd);
  }
  return { host, ws };
}

test("publishVerified retries classified provider errors and succeeds (fail 2x, pass 3rd)", async () => {
  const { host, ws } = await seedScheduledPiece("PIECE-pub-001");
  const client = new FlakyClient(2);
  const receipt = await publishVerified("PIECE-pub-001", {
    root: host,
    publishClient: client,
  });
  expect(receipt.verdict).toBe("published");
  expect(receipt.attempts).toBe(3);
  expect(client.calls).toBe(3);
  expect(receipt.dry_run).toBe(true);
  expect(receipt.claims_tag).toBe("MEASURED");
  expect(receipt.stages.map((s) => s.stage)).toEqual([
    "manifest_valid",
    "claims_gate",
    "compliance",
    "publish",
  ]);
  // Receipt persisted next to the manifest and valid against its contract.
  const path = join(ws, "outputs", "acme", "2026-05-08", "PIECE-pub-001", "publish-receipt.json");
  const stored = JSON.parse(readFileSync(path, "utf8"));
  expect(stored.schema).toBe(RECEIPT_SCHEMA);
  expect(validateArtifact(stored, loadSchemaRegistry()).errors).toEqual([]);
  // DRY_RUN honesty: the piece is still scheduled, never fake-published.
  expect(readFileSync(join(ws, "pieces", "PIECE-pub-001.md"), "utf8")).toMatch(/status: scheduled/);
});

test("publishVerified fails closed after MAX attempts of provider errors", async () => {
  const { host } = await seedScheduledPiece("PIECE-pub-002");
  const client = new FlakyClient(99);
  const receipt = await publishVerified("PIECE-pub-002", {
    root: host,
    publishClient: client,
    maxAttempts: 3,
  });
  expect(receipt.verdict).toBe("failed");
  expect(receipt.attempts).toBe(3);
  expect(receipt.failure_class).toBe("provider_error");
});

test("publishVerified blocks without retry when the claims gate is missing", async () => {
  // Hand-built piece dir with a valid manifest but NO watcher report:
  // deterministic gate failure — retrying cannot fix it.
  const { host, ws } = await seedScheduledPiece("PIECE-pub-003");
  const gatePath = join(ws, "data", "gate", "PIECE-pub-003.json");
  expect(existsSync(gatePath)).toBe(true);
  writeFileSync(gatePath, "not json");
  const client = new FlakyClient(0);
  const receipt = await publishVerified("PIECE-pub-003", {
    root: host,
    publishClient: client,
  });
  expect(receipt.verdict).toBe("blocked");
  expect(receipt.failure_class).toBe("claims_gate_blocked");
  expect(client.calls).toBe(0);
});

test("publishVerified blocks on a missing manifest", async () => {
  const host = mkdtempSync(join(tmpdir(), "me-pub-nomanifest-"));
  const ws = join(host, ".marketing-engine");
  mkdirSync(join(ws, "pieces"), { recursive: true });
  writeFileSync(
    join(ws, "pieces", "PIECE-pub-004.md"),
    serializePiece(
      {
        id: "PIECE-pub-004",
        client: "acme",
        date: "2026-05-08",
        status: "scheduled",
        type: "reel",
        pillar: "education",
        platforms: ["instagram"],
        locale: "en",
      },
      "# Brief\n\nx\n",
    ),
  );
  const receipt = await publishVerified("PIECE-pub-004", {
    root: host,
    publishClient: new FlakyClient(0),
  });
  expect(receipt.verdict).toBe("blocked");
  expect(receipt.failure_class).toBe("missing_manifest");
});

test("loop publish pass routes scheduled pieces through the pipeline", async () => {
  process.env.DRY_RUN = "true";
  const host = mkdtempSync(join(tmpdir(), "me-pub-loop-"));
  const ws = join(host, ".marketing-engine");
  mkdirSync(join(ws, "pieces"), { recursive: true });
  mkdirSync(join(ws, "data"), { recursive: true });
  writeFileSync(
    join(ws, "pieces", "PIECE-pub-101.md"),
    serializePiece(
      {
        id: "PIECE-pub-101",
        client: "acme",
        date: "2026-05-08",
        status: "draft",
        type: "reel",
        pillar: "education",
        platforms: ["instagram"],
        locale: "en",
      },
      "# Brief\n\nLaunch our new product.\n",
    ),
  );
  const prevCwd = process.cwd();
  process.chdir(host);
  let summary;
  try {
    summary = await runLoop({ root: host, mode: "drain", maxIter: 3 });
  } finally {
    process.chdir(prevCwd);
  }
  expect(summary.advanced).toBe(1);
  expect(summary.published).toBe(1);
  const receipt = JSON.parse(
    readFileSync(
      join(ws, "outputs", "acme", "2026-05-08", "PIECE-pub-101", "publish-receipt.json"),
      "utf8",
    ),
  );
  expect(receipt.verdict).toBe("published");
  expect(receipt.dry_run).toBe(true);
  // Draft artifact written by the DRY_RUN publish client (which resolves
  // its draft dir from process.cwd(), i.e. the host root during the loop).
  expect(
    existsSync(join(host, "outputs", "acme", "2026-05-08", "PIECE-pub-101", "adaptlypost-draft.json")),
  ).toBe(true);
});

test("the fixture producer matches the receipt contract", () => {
  const fixture = producePublishReceiptFixture();
  expect(validateArtifact(fixture, loadSchemaRegistry()).errors).toEqual([]);
});
