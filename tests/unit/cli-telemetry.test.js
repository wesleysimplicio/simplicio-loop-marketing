'use strict';

/*
 * Unit tests for the CLI telemetry surface.
 *
 * We never have a real beacon URL in tests — `LLM_PROJECT_MAPPER_TELEMETRY_URL`
 * is unset, which acts as a hard "no send" gate. That lets us assert the
 * opt-in/out flag plumbing without ever hitting the network.
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
  return fs.mkdtempSync(path.join(os.tmpdir(), 'lpm-tel-'));
}

function rmTmp(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
}

function writeFile(dir, rel, content) {
  const full = path.join(dir, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

function runCli(args, cwd, env = {}) {
  return spawnSync(NODE, [CLI, ...args], {
    cwd,
    encoding: 'utf8',
    timeout: 30000,
    env: { ...process.env, ...env },
  });
}

test('--telemetry on is accepted (no network without URL)', () => {
  const dir = mkTmp();
  try {
    writeFile(dir, 'package.json', '{"name":"t","dependencies":{"react":"18.0.0"}}');
    const res = runCli(
      ['--yes', '--cli', 'skip', '--append-gitignore', 'no', '--no-update-check', '--telemetry', 'on'],
      dir,
      { LLM_PROJECT_MAPPER_TELEMETRY_URL: '' },
    );
    assert.equal(res.status, 0, `cli failed: ${res.stderr}`);
    assert.doesNotMatch(res.stderr, /Unknown flag/);
  } finally {
    rmTmp(dir);
  }
});

test('--telemetry off persists "false" in config', () => {
  const dir = mkTmp();
  const fakeHome = mkTmp();
  try {
    writeFile(dir, 'package.json', '{"name":"t","dependencies":{"react":"18.0.0"}}');
    const res = runCli(
      ['--yes', '--cli', 'skip', '--append-gitignore', 'no', '--no-update-check', '--telemetry', 'off'],
      dir,
      { HOME: fakeHome, USERPROFILE: fakeHome },
    );
    assert.equal(res.status, 0, `cli failed: ${res.stderr}`);
    const cfg = path.join(fakeHome, '.config', 'llm-project-mapper', 'telemetry.json');
    assert.equal(fs.existsSync(cfg), true, 'config file not written');
    const parsed = JSON.parse(fs.readFileSync(cfg, 'utf8'));
    assert.equal(parsed.enabled, false);
  } finally {
    rmTmp(dir);
    rmTmp(fakeHome);
  }
});

test('--telemetry on persists "true" in config', () => {
  const dir = mkTmp();
  const fakeHome = mkTmp();
  try {
    writeFile(dir, 'package.json', '{"name":"t","dependencies":{"react":"18.0.0"}}');
    const res = runCli(
      ['--yes', '--cli', 'skip', '--append-gitignore', 'no', '--no-update-check', '--telemetry', 'on'],
      dir,
      { HOME: fakeHome, USERPROFILE: fakeHome },
    );
    assert.equal(res.status, 0, `cli failed: ${res.stderr}`);
    const cfg = path.join(fakeHome, '.config', 'llm-project-mapper', 'telemetry.json');
    const parsed = JSON.parse(fs.readFileSync(cfg, 'utf8'));
    assert.equal(parsed.enabled, true);
  } finally {
    rmTmp(dir);
    rmTmp(fakeHome);
  }
});

test('telemetry default is OFF — no config written when flag absent', () => {
  const dir = mkTmp();
  const fakeHome = mkTmp();
  try {
    writeFile(dir, 'package.json', '{"name":"t","dependencies":{"react":"18.0.0"}}');
    const res = runCli(
      ['--yes', '--cli', 'skip', '--append-gitignore', 'no', '--no-update-check'],
      dir,
      { HOME: fakeHome, USERPROFILE: fakeHome },
    );
    assert.equal(res.status, 0, `cli failed: ${res.stderr}`);
    const cfg = path.join(fakeHome, '.config', 'llm-project-mapper', 'telemetry.json');
    assert.equal(fs.existsSync(cfg), false, 'config file should not be written when flag absent');
  } finally {
    rmTmp(dir);
    rmTmp(fakeHome);
  }
});

test('--help mentions telemetry flag', () => {
  const res = spawnSync(NODE, [CLI, '--help'], { encoding: 'utf8' });
  assert.equal(res.status, 0);
  assert.match(res.stdout, /--telemetry/);
});
