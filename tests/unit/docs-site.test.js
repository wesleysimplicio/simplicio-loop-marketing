'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

test('README advertises the docs site near the top', () => {
  const lines = read('README.md').split('\n').slice(0, 8).join('\n');
  assert.match(lines, /wesleysimplicio\.github\.io\/llm-project-mapper/);
});

test('docs site config enables mermaid, local search, and root docs routing', () => {
  const config = read('docs-site/docusaurus.config.cjs');
  assert.match(config, /@docusaurus\/theme-mermaid/);
  assert.match(config, /@easyops-cn\/docusaurus-search-local/);
  assert.match(config, /routeBasePath:\s*'\/'/);
  assert.match(config, /label:\s*'v0\.x'/);
});

test('current docs home doc uses slug / so the current version resolves to /next/', () => {
  const introDoc = read('docs-site/docs/intro.md');
  assert.match(introDoc, /slug:\s*\/\s*/);
});

test('docs site ships a landing page at the site root', () => {
  const landingPage = read('docs-site/src/pages/index.mdx');
  assert.match(landingPage, /\[Current docs \(v0\.x\)\]\(\/next\/\)/);
  assert.match(landingPage, /\[Stable snapshot\]\(\/intro\)/);
});

test('docs site package includes the Mermaid ELK dependency required by the theme bundle', () => {
  const packageJson = JSON.parse(read('docs-site/package.json'));
  assert.equal(
    packageJson.dependencies['@mermaid-js/layout-elk'],
    '^0.1.9',
  );
});

test('docs deployment workflow publishes to GitHub Pages on main', () => {
  const workflow = read('.github/workflows/docs-site.yml');
  assert.match(workflow, /push:/);
  assert.match(workflow, /branches:\s*\n\s*-\s*main/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
});
