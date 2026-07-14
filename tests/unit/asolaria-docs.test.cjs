'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

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

test('demo-asolaria-loop.mjs --check passes with exactly 5 reproducible iterations', () => {
  const result = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'demo-asolaria-loop.mjs'), '--check'], {
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /5\/5/);
  assert.match(result.stderr, /PASS/);
});

test('reductions-benchmark.mjs --check confirms every REDUCTIONS.md proof link resolves', () => {
  const result = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'reductions-benchmark.mjs'), '--check'], {
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /PASS/);
  assert.doesNotMatch(result.stderr, /stale proof link/);
});

test('static site pages are self-contained (no external CDN/network references)', () => {
  for (const rel of ['site/simplicio-on-metal/index.html', 'site/asolaria-integration/index.html']) {
    const body = read(rel);
    assert.doesNotMatch(body, /https?:\/\/(?!github\.com)/, `${rel} should not reference external hosts besides github.com links`);
  }
});
