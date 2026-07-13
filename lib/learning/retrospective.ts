import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { readJournal } from "../loop/journal";
import { readSnapshots, computeAccrual, classifyByAccrual } from "../analytics/score";
import { detectStreaks } from "../compliance/loader";
export type LearningConfidence = "MEASURED" | "UNVERIFIED";
export interface LearningEntry { schema: "marketing-learning/v1"; id: string; campaign_id: string; client: string; lesson: string; evidence: string[]; confidence: LearningConfidence; evidence_count: number; created_at: string; }
export interface RetrospectiveOptions { client: string; maxEntries?: number; evidenceRoot?: string; }
export interface RetrospectiveResult { lessons: LearningEntry[]; deduped: number; compacted: number; }
const dataPath = (root: string) => resolve(root, "data", "learnings.jsonl"); const clientPath = (root: string, client: string) => resolve(root, ".marketing-engine", "clients", client, "learnings.md"); const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
interface CommunityRecord { source_url?: string; channel?: string; classification?: string; evidence_cited?: boolean; }
function readJsonl<T>(path: string): T[] { if (!existsSync(path)) return []; return readFileSync(path, "utf8").split("\n").filter(Boolean).flatMap((line) => { try { return [JSON.parse(line) as T]; } catch { return []; } }); }
function readEntries(root: string): LearningEntry[] { const p = dataPath(root); if (!existsSync(p)) return []; return readFileSync(p, "utf8").split("\n").filter(Boolean).flatMap((line) => { try { return [JSON.parse(line) as LearningEntry]; } catch { return []; } }); }
function writeEntries(root: string, entries: LearningEntry[]) { const p = dataPath(root); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, entries.map((entry) => JSON.stringify(entry)).join("\n") + (entries.length ? "\n" : ""), "utf8"); }
function confidenceRank(value: LearningConfidence): number { return value === "MEASURED" ? 2 : 1; }
function stronger(a: LearningConfidence, b: LearningConfidence): LearningConfidence { return confidenceRank(a) >= confidenceRank(b) ? a : b; }
export async function runRetrospective(root: string, campaignId: string, options: RetrospectiveOptions): Promise<RetrospectiveResult> {
  const evidenceRoot = options.evidenceRoot ?? root, scores = classifyByAccrual(computeAccrual(readSnapshots(evidenceRoot))), journal = readJournal(evidenceRoot); const candidates: Array<{ lesson: string; evidence: string[]; confidence: LearningConfidence }> = [];
  for (const loser of scores.losers) candidates.push({ lesson: `Avoid ${loser.piece_id}: ${loser.metric} accrual was ${loser.delta_rate_per_day.toFixed(2)} per day`, evidence: [resolve(evidenceRoot, "data", "analytics-snapshots.jsonl")], confidence: "MEASURED" });
  for (const row of journal.filter((item) => item.gate === "blocked" || item.gate === "fail").slice(-10)) candidates.push({ lesson: `Review ${row.item_id}: repeated ${row.action} ${row.note ?? "gate failure"}`, evidence: [resolve(evidenceRoot, ".simplicio", "loop", "journal.jsonl")], confidence: "MEASURED" });
  for (const streak of detectStreaks(evidenceRoot)) if (streak.client === options.client) candidates.push({ lesson: `Avoid compliance rule ${streak.rule_id}: it blocked ${streak.count} recent pieces for ${streak.client}`, evidence: [resolve(evidenceRoot, "data", "compliance-history.jsonl")], confidence: "MEASURED" });
  for (const record of readJsonl<CommunityRecord>(resolve(evidenceRoot, "data", "community-comments.jsonl"))) {
    if (!record.classification || !record.channel) continue;
    if (!["objection", "pricing_concern", "question", "integration_request"].includes(record.classification)) continue;
    candidates.push({ lesson: `Address recurring ${record.classification.replace(/_/g, " ")} on ${record.channel}`, evidence: [record.source_url ?? resolve(evidenceRoot, "data", "community-comments.jsonl")], confidence: record.evidence_cited ? "MEASURED" : "UNVERIFIED" });
  }
  const byKey = new Map(readEntries(root).map((e) => [key(e.lesson), e])); let deduped = 0; const added: LearningEntry[] = [];
  for (const c of candidates) { const id = key(c.lesson), prior = byKey.get(id); if (prior) { prior.evidence_count++; prior.evidence = [...new Set([...prior.evidence, ...c.evidence])]; prior.confidence = stronger(prior.confidence, c.confidence); deduped++; continue; } const e: LearningEntry = { schema: "marketing-learning/v1", id, campaign_id: campaignId, client: options.client, lesson: c.lesson, evidence: c.evidence, confidence: c.confidence, evidence_count: 1, created_at: new Date().toISOString() }; byKey.set(id, e); added.push(e); }
  const max = options.maxEntries ?? 100, all = [...byKey.values()].sort((a, b) => confidenceRank(b.confidence) - confidenceRank(a.confidence) || b.evidence_count - a.evidence_count || a.created_at.localeCompare(b.created_at) || a.lesson.localeCompare(b.lesson)), compacted = Math.max(0, all.length - max), kept = all.slice(0, max); writeEntries(root, kept); const p = clientPath(root, options.client); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, kept.filter((e) => e.client === options.client).map((e) => `- [${e.confidence}] ${e.lesson} (evidence: ${e.evidence.join(", ")}; count: ${e.evidence_count})`).join("\n") + "\n", "utf8"); return { lessons: added, deduped, compacted };
}
export function readLearningsForBrief(root: string, client: string): string[] { return readEntries(root).filter((e) => e.client === client && e.confidence === "MEASURED").sort((a, b) => b.evidence_count - a.evidence_count).map((e) => e.lesson); }


