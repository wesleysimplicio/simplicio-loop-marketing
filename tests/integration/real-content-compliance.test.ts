import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { auditSync } from "../../lib/compliance/generic.ts";
import { loadTemplate, renderTemplate, type TemplateId } from "../../lib/content/templates.ts";

const fixture = JSON.parse(readFileSync(resolve("tests/fixtures/real-content-asolaria.json"), "utf8"));

test("golden: realistic Portuguese multi-paragraph copy passes the reviewed compliance result", () => {
  const report = auditSync({ piece_id: fixture.piece_id, text: fixture.text });
  assert.deepEqual({ pass: report.pass, violations: report.violations, warnings: report.warnings }, {
    pass: fixture.golden.pass, violations: fixture.golden.violations, warnings: fixture.golden.warnings,
  });
});

test("golden: all five authentic-content templates preserve real multilingual formatting and compliance", () => {
  for (const id of fixture.golden.template_ids as TemplateId[]) {
    const { text, meta } = loadTemplate(resolve(`.specs/pieces/templates/${id}.md`));
    const result = renderTemplate(text, meta, fixture.data);
    assert.deepEqual(result.missing_evidence, []);
    assert.doesNotMatch(result.rendered, /\{\{\w+\}\}/);
    assert.match(result.rendered, /[áãéíóúç☀️]/u);
    assert.equal(auditSync({ piece_id: `${fixture.piece_id}-${id}`, text: result.rendered }).pass, true);
  }
});
