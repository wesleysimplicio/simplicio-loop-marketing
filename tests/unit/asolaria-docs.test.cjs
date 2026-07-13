'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const fixture = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', 'asolaria-artifacts.json'), 'utf8'),
);

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

test('issue #78 Asolaria docs fixture points at real files with required anchors', () => {
  for (const doc of fixture.required_docs) {
    const abs = path.join(ROOT, doc.path);
    assert.ok(fs.existsSync(abs), `${doc.path} should exist`);
    const body = read(doc.path);
    for (const needle of doc.must_include) {
      assert.match(body, new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
  }
});

test('REDUCTIONS catalog documents at least four reductions', () => {
  const body = read('REDUCTIONS.md');
  const headings = body.match(/^## Reduction /gm) ?? [];
  assert.ok(headings.length >= 4, `expected >=4 reductions, got ${headings.length}`);
});

test('campaign artifacts cross-link the canonical map and external dependency boundaries', () => {
  const routing = read('.specs/strategy/campaigns/2026-Q3-asolaria-on-metal/ROUTING.md');
  const landing = read('.specs/strategy/campaigns/2026-Q3-asolaria-on-metal/LANDING.md');
  const demo = read('.specs/strategy/campaigns/2026-Q3-asolaria-on-metal/DEMO.md');
  assert.match(routing, /SIMPLICIO-MAP-OF-MAPS\.md/);
  assert.match(routing, /REDUCTIONS\.md/);
  assert.match(landing, /This artifact still needs:/);
  assert.match(demo, /To become a public demo, this storyboard still needs:/);
});

test('external dependencies remain explicitly marked as external follow-up', () => {
  for (const dep of fixture.external_dependencies) {
    assert.equal(dep.status, 'external');
    assert.ok(dep.targets.length > 0);
  }
});
