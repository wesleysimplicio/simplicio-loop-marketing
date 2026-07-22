export const REQUIRED_SECTIONS = [
  "Contexto e problema", "Objetivo", "Fora de escopo", "Entradas, saídas e contratos",
  "Dependências e ordem", "Passo a passo implementável", "Fluxo de testes",
  "Critérios de aceite verificáveis", "Evidências obrigatórias",
  "Riscos, rollback e decisão de encerramento",
] as const;

export interface GitHubIssue {
  number: number; title: string; state: string; created_at: string; updated_at: string;
  closed_at: string | null; body: string | null; html_url: string;
  labels: Array<{ name: string }>; milestone: { title: string } | null;
  pull_request?: unknown;
}

export interface AuditFinding {
  number: number; state: string; createdAt: string; title: string; url: string;
  labels: string[]; references: number[]; dependencies: number[]; missingSections: string[];
  risks: string[]; decision: "REVIEWED" | "NEEDS-SPEC";
}

const heading = (name: string) => new RegExp(`^#{1,6}\\s+(?:\\d+\\.\\s*)?${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "imu");

export function auditIssue(issue: GitHubIssue): AuditFinding {
  const body = issue.body ?? "";
  const missingSections = REQUIRED_SECTIONS.filter((section) => !heading(section).test(body));
  const references = [...new Set([...body.matchAll(/(?:^|[^\w])#(\d+)\b/g)].map((match) => Number(match[1])))]
    .filter((number) => number !== issue.number).sort((a, b) => a - b);
  const dependencies = [...new Set([...body.matchAll(/(?:depende(?:ncia|ências?|\s+de)|bloquead[oa]\s+por)\D{0,30}#(\d+)/giu)]
    .map((match) => Number(match[1])))].sort((a, b) => a - b);
  const risks: string[] = [];
  if (/\b(?:melhor(?:ar|ia)|r[aá]pid[oa]|econom(?:ia|izar)|cobertura|performance|desempenho)\b/iu.test(body)
      && !/\b(?:ms|segundos?|%|baseline|benchmark|medid[oa]|m[eé]trica)\b/iu.test(body)) risks.push("unmeasured-claim");
  if (/(?:api[_-]?key|token|password|senha)\s*[:=]\s*["']?[A-Za-z0-9_\/-]{12,}/iu.test(body)) risks.push("possible-secret");
  if (!/(?:timeout|tempo limite)/iu.test(body)) risks.push("timeout-unspecified");
  if (!/(?:rollback|revers[aã]o)/iu.test(body)) risks.push("rollback-unspecified");
  return {
    number: issue.number, state: issue.state, createdAt: issue.created_at, title: issue.title,
    url: issue.html_url, labels: issue.labels.map((label) => label.name).sort(), references,
    dependencies, missingSections: [...missingSections], risks,
    decision: missingSections.length === 0 && risks.length === 0 ? "REVIEWED" : "NEEDS-SPEC",
  };
}

export function auditIssues(issues: GitHubIssue[]) {
  const findings = issues.filter((issue) => !issue.pull_request).map(auditIssue)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.number - b.number);
  const byState = Object.fromEntries([...new Set(findings.map((item) => item.state))].sort()
    .map((state) => [state, findings.filter((item) => item.state === state).length]));
  const compliant = findings.filter((item) => item.decision === "REVIEWED").length;
  return { schema: "marketing-issue-audit/v1", generatedAt: new Date().toISOString(), total: findings.length,
    byState, compliant, compliancePercent: findings.length ? Number((compliant * 100 / findings.length).toFixed(2)) : 100,
    findings };
}

export async function fetchAllIssues(repo: string, fetcher: typeof fetch = fetch): Promise<GitHubIssue[]> {
  const results: GitHubIssue[] = [];
  for (let page = 1; ; page++) {
    const response = await fetcher(`https://api.github.com/repos/${repo}/issues?state=all&direction=asc&sort=created&per_page=100&page=${page}`,
      { headers: { Accept: "application/vnd.github+json", "User-Agent": "marketing-engine-meta-audit" } });
    if (!response.ok) throw new Error(`GitHub issues request failed: HTTP ${response.status}`);
    const batch = await response.json() as GitHubIssue[];
    results.push(...batch);
    if (batch.length < 100) return results;
  }
}

export function renderAuditMarkdown(audit: ReturnType<typeof auditIssues>): string {
  const lines = ["# Issue meta-audit", "", `Generated: ${audit.generatedAt}`, "",
    `Inventory: **${audit.total}** issues; compliant: **${audit.compliant} (${audit.compliancePercent}%)**.`, "",
    "## Counts by state", "", "| State | Count |", "|---|---:|",
    ...Object.entries(audit.byState).map(([state, count]) => `| ${state} | ${count} |`), "",
    "## Dependency and decision matrix", "", "| # | Created | State | Labels | References / dependencies | Decision | Missing / risks |",
    "|---:|---|---|---|---|---|---|",
    ...audit.findings.map((item) => `| [${item.number}](${item.url}) | ${item.createdAt.slice(0, 10)} | ${item.state} | ${item.labels.join(", ") || "—"} | ${[...new Set([...item.references, ...item.dependencies])].map((n) => `#${n}`).join(", ") || "—"} | **${item.decision}** | ${[...item.missingSections.map((s) => `section:${s}`), ...item.risks].join("; ") || "—"} |`),
    "", "## Closure decision", "", audit.compliant === audit.total
      ? "All accessible issues satisfy the auditable specification contract."
      : "**BLOCKED:** non-compliant issues remain NEEDS-SPEC; this audit must not be closed until their bodies and evidence are updated.", ""];
  return lines.join("\n");
}
