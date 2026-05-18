'use strict';

/*
 * Subprocess-based "unit" tests for the install flow.
 * Each test creates a fresh temp dir, runs `node bin/cli.js`, and inspects the side effects.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const CLI = path.resolve(__dirname, '..', '..', 'bin', 'cli.js');
const NODE = process.execPath;

function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'lpm-test-'));
}

function rmTmp(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
}

function writeFile(dir, rel, content) {
  const full = path.join(dir, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

function runCli(args, cwd) {
  return spawnSync(NODE, [CLI, ...args], {
    cwd,
    encoding: 'utf8',
    timeout: 30000,
  });
}

function listUnresolvedPlaceholders(dir) {
  const matches = [];
  const exempt = /docs\/placeholders\.md|docs\/api-examples\/|task-template\.md|ADR-template\.md|sprint-XX|\.template\.|_template\/SKILL\.md|INIT\.md|INSTALL\.md|_BOOTSTRAP\.md|bootstrap\.(sh|ps1)|scripts\/check-placeholders\.sh|tests\/unit\/cli-install\.test\.js|\.github\/workflows-templates\//;

  function walk(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (['node_modules', '.git', 'playwright-report', 'test-results', 'coverage', 'video'].includes(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      const rel = path.relative(dir, full).replace(/\\/g, '/');
      if (exempt.test(rel)) continue;
      if (rel.endsWith('.svg') || rel.endsWith('.lock') || rel.endsWith('package-lock.json')) continue;
      const content = fs.readFileSync(full, 'utf8');
      if (/<[A-Z][A-Z0-9_]+>/.test(content)) {
        matches.push(rel);
      }
    }
  }

  walk(dir);
  return matches.sort();
}

test('dry-run does not write any file to cwd', () => {
  const dir = mkTmp();
  try {
    writeFile(dir, 'package.json', '{"name":"test","dependencies":{"next":"14.0.0"}}');
    const before = fs.readdirSync(dir).sort();
    const res = runCli(['--dry-run', '--yes', '--cli', 'skip', '--append-gitignore', 'no'], dir);
    assert.equal(res.status, 0, `cli failed: ${res.stderr}`);
    const after = fs.readdirSync(dir).sort();
    assert.deepEqual(after, before, 'dry-run wrote files');
    assert.equal(fs.existsSync(path.join(dir, '.starter-meta.json')), false);
  } finally {
    rmTmp(dir);
  }
});

test('fresh install creates .starter-meta.json + AGENTS.md + .specs/', () => {
  const dir = mkTmp();
  try {
    writeFile(dir, 'package.json', '{"name":"my-product","dependencies":{"next":"14.0.0","react":"18.0.0"}}');
    const res = runCli(['--yes', '--cli', 'skip', '--append-gitignore', 'no'], dir);
    assert.equal(res.status, 0, `cli failed: ${res.stderr}`);
    assert.equal(fs.existsSync(path.join(dir, '.starter-meta.json')), true);
    assert.equal(fs.existsSync(path.join(dir, 'AGENTS.md')), true);
    assert.equal(fs.existsSync(path.join(dir, 'CLAUDE.md')), true);
    assert.equal(fs.existsSync(path.join(dir, '.specs')), true);
    assert.equal(fs.existsSync(path.join(dir, 'docs', 'local-setup.md')), true);
    assert.equal(fs.existsSync(path.join(dir, '.specs', 'journal')), true);
  } finally {
    rmTmp(dir);
  }
});

test('automatic mapping fills starter-managed docs without unresolved placeholders', () => {
  const dir = mkTmp();
  try {
    writeFile(dir, 'package.json', JSON.stringify({
      name: '@acme/project-mapper-host',
      description: 'Developer tooling for project mapping and repository workflows',
      scripts: {
        dev: 'next dev',
        build: 'next build',
        lint: 'eslint .',
        test: 'node --test',
        'test:e2e': 'playwright test',
      },
      dependencies: {
        next: '14.0.0',
        react: '18.0.0',
      },
    }));
    const res = runCli(['--yes', '--cli', 'skip', '--append-gitignore', 'no'], dir);
    assert.equal(res.status, 0, `cli failed: ${res.stderr}`);

    const localSetup = fs.readFileSync(path.join(dir, 'docs', 'local-setup.md'), 'utf8');
    assert.match(localSetup, /npm install/);
    assert.match(localSetup, /npm run dev/);
    assert.doesNotMatch(localSetup, /<FRONTEND_URL>|<BACKEND_URL>|<DATABASE_REQUIREMENT>/);

    const vision = fs.readFileSync(path.join(dir, '.specs', 'product', 'VISION.md'), 'utf8');
    assert.match(vision, /Project Mapper Host/);
    assert.doesNotMatch(vision, /<PRODUCT_NAME>|<TEAM>|<DOMAIN>|<STACK>/);

    const unresolved = listUnresolvedPlaceholders(dir);
    assert.deepEqual(unresolved, [], `unresolved placeholders remain:\n${unresolved.join('\n')}`);
  } finally {
    rmTmp(dir);
  }
});

test('.starter-meta.json has the documented shape', () => {
  const dir = mkTmp();
  try {
    writeFile(dir, 'package.json', '{"name":"my-product","dependencies":{"next":"14.0.0"}}');
    const res = runCli(['--yes', '--cli', 'skip', '--append-gitignore', 'no'], dir);
    assert.equal(res.status, 0, `cli failed: ${res.stderr}`);
    const meta = JSON.parse(fs.readFileSync(path.join(dir, '.starter-meta.json'), 'utf8'));
    assert.ok(meta.product_name, 'product_name missing');
    assert.ok(meta.stack, 'stack missing');
    assert.ok(meta.bootstrapped_at, 'bootstrapped_at missing');
    assert.ok(meta.starter_version, 'starter_version missing');
    assert.ok(Array.isArray(meta.read_only_globs), 'read_only_globs not array');
    assert.ok(Array.isArray(meta.init_must_merge), 'init_must_merge not array');
    assert.ok(['root', 'monorepo'].includes(meta.project_mode), 'project_mode invalid');
  } finally {
    rmTmp(dir);
  }
});

test('detects monorepo when ≥2 manifests live under apps/', () => {
  const dir = mkTmp();
  try {
    writeFile(dir, 'package.json', '{"name":"root","workspaces":["apps/*"]}');
    writeFile(dir, 'apps/web/package.json', '{"name":"web","dependencies":{"next":"14.0.0"}}');
    writeFile(dir, 'apps/api/package.json', '{"name":"api","dependencies":{"express":"4.18.0"}}');
    const res = runCli(['--yes', '--cli', 'skip', '--append-gitignore', 'no'], dir);
    assert.equal(res.status, 0, `cli failed: ${res.stderr}`);
    const meta = JSON.parse(fs.readFileSync(path.join(dir, '.starter-meta.json'), 'utf8'));
    assert.equal(meta.project_mode, 'monorepo');
    assert.ok(Array.isArray(meta.projects));
    assert.ok(meta.projects.length >= 2, `expected >=2 projects, got ${meta.projects.length}`);
  } finally {
    rmTmp(dir);
  }
});

test('does NOT overwrite a pre-existing AGENTS.md', () => {
  const dir = mkTmp();
  try {
    writeFile(dir, 'package.json', '{"name":"test","dependencies":{"react":"18.0.0"}}');
    writeFile(dir, 'AGENTS.md', '# CUSTOM HOST AGENTS\n\nDo not destroy me.\n');
    const res = runCli(['--yes', '--cli', 'skip', '--append-gitignore', 'no'], dir);
    assert.equal(res.status, 0, `cli failed: ${res.stderr}`);
    const after = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
    assert.match(after, /CUSTOM HOST AGENTS/, 'AGENTS.md was overwritten');
    const meta = JSON.parse(fs.readFileSync(path.join(dir, '.starter-meta.json'), 'utf8'));
    assert.ok(meta.existing_instruction_files.includes('AGENTS.md'), 'AGENTS.md should be flagged as existing');
  } finally {
    rmTmp(dir);
  }
});

test('--append-gitignore yes appends managed block, idempotent on re-run', () => {
  const dir = mkTmp();
  try {
    writeFile(dir, 'package.json', '{"name":"test","dependencies":{"react":"18.0.0"}}');
    writeFile(dir, '.gitignore', 'node_modules\n');
    const r1 = runCli(['--yes', '--cli', 'skip', '--append-gitignore', 'yes'], dir);
    assert.equal(r1.status, 0, `first run failed: ${r1.stderr}`);
    const after1 = fs.readFileSync(path.join(dir, '.gitignore'), 'utf8');
    assert.match(after1, /LLM Project Mapper/);
    const r2 = runCli(['--yes', '--force', '--cli', 'skip', '--append-gitignore', 'yes'], dir);
    assert.equal(r2.status, 0, `second run failed: ${r2.stderr}`);
    const after2 = fs.readFileSync(path.join(dir, '.gitignore'), 'utf8');
    const occurrences = (after2.match(/LLM Project Mapper \(auto-managed\)/g) || []).length;
    assert.ok(occurrences <= 2, `gitignore block duplicated ${occurrences} times`);
  } finally {
    rmTmp(dir);
  }
});

test('does NOT touch package.json (read-only glob)', () => {
  const dir = mkTmp();
  try {
    const pkgBefore = '{"name":"test","dependencies":{"react":"18.0.0"}}';
    writeFile(dir, 'package.json', pkgBefore);
    const res = runCli(['--yes', '--cli', 'skip', '--append-gitignore', 'no'], dir);
    assert.equal(res.status, 0, `cli failed: ${res.stderr}`);
    const pkgAfter = fs.readFileSync(path.join(dir, 'package.json'), 'utf8');
    assert.equal(pkgAfter, pkgBefore, 'package.json was modified');
  } finally {
    rmTmp(dir);
  }
});

test('--preset nextjs records the hint in .starter-meta.json', () => {
  const dir = mkTmp();
  try {
    writeFile(dir, 'package.json', '{"name":"test","dependencies":{"next":"14.0.0"}}');
    const res = runCli(['--yes', '--cli', 'skip', '--append-gitignore', 'no', '--preset', 'nextjs', '--no-update-check'], dir);
    assert.equal(res.status, 0, `cli failed: ${res.stderr}`);
    const meta = JSON.parse(fs.readFileSync(path.join(dir, '.starter-meta.json'), 'utf8'));
    assert.equal(meta.preset, 'nextjs');
  } finally {
    rmTmp(dir);
  }
});

test('--skip-meta avoids writing .starter-meta.json', () => {
  const dir = mkTmp();
  try {
    writeFile(dir, 'package.json', '{"name":"test","dependencies":{"react":"18.0.0"}}');
    const res = runCli(['--yes', '--cli', 'skip', '--append-gitignore', 'no', '--skip-meta'], dir);
    assert.equal(res.status, 0, `cli failed: ${res.stderr}`);
    assert.equal(fs.existsSync(path.join(dir, '.starter-meta.json')), false);
    assert.equal(fs.existsSync(path.join(dir, 'AGENTS.md')), true);
  } finally {
    rmTmp(dir);
  }
});
