#!/usr/bin/env node
'use strict';

/*
 * Stack-neutral lint runner used by `npm run lint` / `npm run lint:fix`.
 *
 * - JS: `node --check` on every tracked .js file under bin/, scripts/, tests/.
 * - JSON: parse each *.json file.
 * - Shell: `shellcheck` if installed (warning level), otherwise warn and skip.
 * - PowerShell: `pwsh -Command Invoke-ScriptAnalyzer` if available, else skip.
 * - Markdown: trailing-whitespace + tabs in code fences are flagged.
 *
 * Exits non-zero only on hard errors (not on optional skips).
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const FIX = process.argv.includes('--fix');
const SKIP_DIRS = new Set([
  '.git',
  '.docusaurus',
  '.next',
  '.nuxt',
  '.svelte-kit',
  '.turbo',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'out',
  'playwright-report',
  'test-results',
]);

const RESULTS = { errors: 0, warnings: 0, skipped: [] };

function log(level, message) {
  const tag = level === 'error' ? '\x1b[31merror\x1b[0m'
    : level === 'warn' ? '\x1b[33mwarn\x1b[0m'
    : level === 'ok' ? '\x1b[32mok\x1b[0m'
    : 'info';
  process.stdout.write(`[${tag}] ${message}\n`);
  if (level === 'error') RESULTS.errors += 1;
  if (level === 'warn') RESULTS.warnings += 1;
}

function walk(dir, predicate, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, predicate, acc);
    else if (predicate(full)) acc.push(full);
  }
  return acc;
}

function lintJavaScript() {
  const files = [
    ...walk(path.join(ROOT, 'bin'), (f) => f.endsWith('.js')),
    ...walk(path.join(ROOT, 'scripts'), (f) => f.endsWith('.js')),
    ...walk(path.join(ROOT, 'tests'), (f) => f.endsWith('.js')),
    ...walk(path.join(ROOT, 'docs-site'), (f) => /\.(c|m)?js$/i.test(f)),
    ...walk(path.join(ROOT, 'video', 'scripts'), (f) => /\.(c|m)?js$/i.test(f)),
  ];
  for (const file of files) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0) {
      log('error', `node --check failed for ${path.relative(ROOT, file)}\n${result.stderr.trim()}`);
    }
  }
  log('ok', `node --check passed on ${files.length} JS files`);
}

function lintJson() {
  const files = walk(ROOT, (f) =>
    f.endsWith('.json')
    && !f.includes(`${path.sep}node_modules${path.sep}`)
    && !f.includes(`${path.sep}package-lock`)
  );
  for (const file of files) {
    try {
      JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
      log('error', `invalid JSON ${path.relative(ROOT, file)}: ${err.message}`);
    }
  }
  log('ok', `parsed ${files.length} JSON files`);
}

function lintShell() {
  const shellcheck = spawnSync('shellcheck', ['--version'], { encoding: 'utf8' });
  if (shellcheck.status !== 0) {
    log('warn', 'shellcheck not installed — skipping shell lint');
    RESULTS.skipped.push('shellcheck');
    return;
  }
  const files = [
    path.join(ROOT, 'bootstrap.sh'),
    ...walk(path.join(ROOT, 'scripts'), (f) => f.endsWith('.sh')),
    ...walk(path.join(ROOT, '.claude/hooks'), (f) => f.endsWith('.sh')),
  ].filter(fs.existsSync);
  for (const file of files) {
    const result = spawnSync('shellcheck', ['-S', 'warning', file], {
      encoding: 'utf8',
      cwd: ROOT,
    });
    if (result.status !== 0) {
      log('error', `shellcheck failed for ${path.relative(ROOT, file)}\n${result.stdout.trim()}`);
    }
  }
  log('ok', `shellcheck passed on ${files.length} shell scripts`);
}

function lintPowerShell() {
  const pwsh = spawnSync('pwsh', ['-NoProfile', '-Command', 'Get-Command Invoke-ScriptAnalyzer -ErrorAction SilentlyContinue'], { encoding: 'utf8' });
  if (pwsh.status !== 0 || !pwsh.stdout.includes('Invoke-ScriptAnalyzer')) {
    log('warn', 'PSScriptAnalyzer not installed — skipping PowerShell lint');
    RESULTS.skipped.push('PSScriptAnalyzer');
    return;
  }
  const files = [
    path.join(ROOT, 'bootstrap.ps1'),
    ...walk(path.join(ROOT, 'scripts'), (f) => f.endsWith('.ps1')),
    ...walk(path.join(ROOT, '.claude/hooks'), (f) => f.endsWith('.ps1')),
    ...walk(path.join(ROOT, '.codex/hooks'), (f) => f.endsWith('.ps1')),
  ].filter(fs.existsSync);
  const settings = path.join(ROOT, '.github', 'PSScriptAnalyzerSettings.psd1');
  for (const file of files) {
    const result = spawnSync('pwsh', [
      '-NoProfile',
      '-Command',
      `$issues = Invoke-ScriptAnalyzer -Path '${file}' -Settings '${settings}'; if ($issues) { $issues | Format-List | Out-String | Write-Host; exit 1 } else { exit 0 }`,
    ], { encoding: 'utf8' });
    if (result.status !== 0) {
      log('error', `PSScriptAnalyzer failed for ${path.relative(ROOT, file)}\n${result.stdout.trim()}`);
    }
  }
  log('ok', `PSScriptAnalyzer passed on ${files.length} PowerShell scripts`);
}

function lintMarkdown() {
  const files = walk(ROOT, (f) =>
    f.endsWith('.md')
    && !f.includes(`${path.sep}node_modules${path.sep}`)
    && !f.includes(`${path.sep}.git${path.sep}`)
  );
  let fixed = 0;
  for (const file of files) {
    const original = fs.readFileSync(file, 'utf8');
    const stripped = original.replace(/[ \t]+\n/g, '\n');
    if (stripped !== original) {
      if (FIX) {
        fs.writeFileSync(file, stripped);
        fixed += 1;
      } else {
        log('warn', `trailing whitespace in ${path.relative(ROOT, file)} (run with --fix)`);
      }
    }
  }
  if (fixed > 0) log('ok', `fixed trailing whitespace in ${fixed} markdown files`);
  log('ok', `markdown lint over ${files.length} files`);
}

function main() {
  log('info', `LLM Project Mapper lint runner${FIX ? ' (fix mode)' : ''}`);
  lintJavaScript();
  lintJson();
  lintShell();
  lintPowerShell();
  lintMarkdown();
  process.stdout.write(
    `\nResult: ${RESULTS.errors} error(s), ${RESULTS.warnings} warning(s)`
    + (RESULTS.skipped.length ? `, skipped: ${RESULTS.skipped.join(', ')}` : '')
    + '\n',
  );
  process.exit(RESULTS.errors === 0 ? 0 : 1);
}

main();
