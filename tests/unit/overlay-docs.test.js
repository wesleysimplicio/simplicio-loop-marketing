'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const SVG_PATH = path.join(ROOT, 'assets', 'overlay-install.svg');
const DOCS = [
  'README.md',
  'README.pt-BR.md',
  'INSTALL.md',
  'INSTALL.en.md',
];

test('overlay screencast asset captures the required flow', () => {
  const svg = fs.readFileSync(SVG_PATH, 'utf8');

  assert.match(svg, /Overlay install in 24 seconds/);
  assert.match(svg, /cd host-project/);
  assert.match(svg, /npx @wesleysimplicio\/llm-project-mapper/);
  assert.match(svg, /Append recommended ignores to \.gitignore\?/);
  assert.match(svg, /ls \.specs\//);
  assert.match(svg, /architecture  product  sprints  workflow/);
  assert.match(svg, /@keyframes progress/);
});

test('overlay docs embed the animated screencast', () => {
  for (const rel of DOCS) {
    const body = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    assert.match(body, /<img[^>]+assets\/overlay-install\.svg/i, `${rel} does not embed overlay-install.svg`);
  }
});
