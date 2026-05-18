'use strict';

/*
 * Unit tests for bin/cli.js argument parsing.
 * Uses node:test (no extra dependency) and subprocess invocation so the tests
 * exercise the real binary end-to-end, including --help / --version short-circuit
 * and unknown-flag handling.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const CLI = path.resolve(__dirname, '..', '..', 'bin', 'cli.js');
const NODE = process.execPath;
const PKG_VERSION = require(path.resolve(__dirname, '..', '..', 'package.json')).version;

function runCli(args, opts = {}) {
  return spawnSync(NODE, [CLI, ...args], {
    encoding: 'utf8',
    timeout: 15000,
    ...opts,
  });
}

test('--help prints usage and exits 0', () => {
  const res = runCli(['--help']);
  assert.equal(res.status, 0);
  assert.match(res.stdout, /llm-project-mapper/);
  assert.match(res.stdout, /USAGE/);
});

test('-h is an alias for --help', () => {
  const res = runCli(['-h']);
  assert.equal(res.status, 0);
  assert.match(res.stdout, /USAGE/);
});

test('--version prints package.json version and exits 0', () => {
  const res = runCli(['--version']);
  assert.equal(res.status, 0);
  assert.equal(res.stdout.trim(), PKG_VERSION);
});

test('-v is an alias for --version', () => {
  const res = runCli(['-v']);
  assert.equal(res.status, 0);
  assert.equal(res.stdout.trim(), PKG_VERSION);
});

test('unknown flag exits with code 2 and emits hint to stderr', () => {
  const res = runCli(['--definitely-not-a-flag']);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /Unknown flag/);
  assert.match(res.stderr, /--help/);
});

test('--dry-run flag is recognized (not treated as unknown)', () => {
  // Invoke from inside the package dir → CLI refuses with a specific message (exit 2)
  // BUT stderr should NOT contain the "Unknown flag" error. That is enough to prove
  // --dry-run is in the recognized flag set.
  const res = runCli(['--dry-run', '--yes', '--cli', 'skip', '--append-gitignore', 'no']);
  assert.doesNotMatch(res.stderr, /Unknown flag/, `--dry-run was rejected as unknown: ${res.stderr}`);
});

test('--preset list prints the catalog and exits 0', () => {
  const res = runCli(['--preset', 'list']);
  assert.equal(res.status, 0);
  assert.match(res.stdout, /Available presets:/);
  assert.match(res.stdout, /nextjs/);
  assert.match(res.stdout, /dotnet/);
});

test('--preset <unknown> exits 2 with helpful error', () => {
  const res = runCli(['--preset', 'definitely-not-a-stack']);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /Unknown preset/);
});
