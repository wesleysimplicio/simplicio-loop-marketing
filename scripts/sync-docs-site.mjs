#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const siteRoot = path.join(repoRoot, 'docs-site');
const docsRoot = path.join(siteRoot, 'docs');
const staticRoot = path.join(siteRoot, 'static');

const githubBlobBase = 'https://github.com/wesleysimplicio/llm-project-mapper/blob/main/';
const githubRawBase = 'https://raw.githubusercontent.com/wesleysimplicio/llm-project-mapper/main/';

const routeMap = new Map([
  ['README.md', '/quickstart/get-going'],
  ['INSTALL.en.md', '/guide/private-overlay'],
  ['docs/architecture-map.md', '/concepts/architecture-map'],
  ['docs/domain-map.md', '/concepts/domain-map'],
  ['INIT.en.md', '/reference/init-handoff'],
  ['docs/sessionstart-hook.md', '/reference/session-start-hook'],
  ['SHOWCASE.md', '/community/showcase'],
  ['.specs/workflow/CONTRIBUTING.md', '/community/contributing'],
]);

const categories = [
  {dir: 'quickstart', label: 'Quickstart', position: 1},
  {dir: 'guide', label: 'Guide', position: 2},
  {dir: 'concepts', label: 'Concepts', position: 3},
  {dir: 'reference', label: 'Reference', position: 4},
  {dir: 'community', label: 'Community', position: 5},
];

const docSpecs = [
  {
    target: 'intro.md',
    title: 'Docs Home',
    description: 'The documentation hub for LLM Project Mapper.',
    slug: '/',
    content: `# LLM Project Mapper Docs

![LLM Project Mapper hero](/assets/llm-project-mapper-hero.png)

LLM Project Mapper is an AI-friendly project scaffold that turns scattered engineering context into a stable operating model for coding agents and human reviewers.

:::tip What this site is
This docs site is a curated view over the repo's real documentation. The source of truth stays in the repository root, and \`scripts/sync-docs-site.mjs\` regenerates the Docusaurus docs from those markdown files.
:::

## Start here

- **Quickstart**: install the starter in seconds and choose the right bootstrap path.
- **Guide**: use the private overlay workflow on top of an existing host project.
- **Concepts**: understand the architecture and domain map conventions the starter ships.
- **Reference**: inspect CLI flags, the init handoff contract, and the SessionStart hook behavior.
- **Community**: contribute improvements and add your real-world showcase.

## Site map

| Area | What it covers |
| --- | --- |
| [Quickstart](/quickstart/get-going) | Fast install path, prerequisites, and starter overview |
| [Guide](/guide/private-overlay) | Private overlay installation on an existing repo |
| [Concepts](/concepts/skills-and-agents) | How the starter organizes skills, agents, and shared context |
| [Reference](/reference/init-handoff) | Bootstrap contract, CLI flags, hooks, and generated docs |
| [Community](/community/showcase) | Showcase entries and contribution workflow |
`,
  },
  {
    source: 'README.md',
    target: 'quickstart/get-going.md',
    title: 'Get Going in 60 Seconds',
    description: 'Overview, prerequisites, and install paths from the main README.',
    sidebarPosition: 1,
    extractStart: '## TL;DR — get going in 60 seconds',
    extractEnd: '## What LLM Project Mapper Changes',
  },
  {
    source: 'INSTALL.en.md',
    target: 'guide/private-overlay.md',
    title: 'Private Overlay Install',
    description: 'Install the starter into an existing host project without polluting its git history.',
    sidebarPosition: 1,
  },
  {
    target: 'concepts/skills-and-agents.md',
    title: 'Skills and Agents',
    description: 'How LLM Project Mapper turns repeated conventions into reusable operating context.',
    sidebarPosition: 1,
    content: `# Skills and Agents

LLM Project Mapper is built around a simple idea: agents perform better when project conventions are explicit, reusable, and close to the code.

## The three context layers

1. **Instruction layer**: \`AGENTS.md\`, \`CLAUDE.md\`, and \`.github/copilot-instructions.md\` explain how work should be executed.
2. **Reference layer**: \`.specs/\`, \`docs/\`, and the changelog hold durable human-readable context.
3. **Execution layer**: \`.skills/\`, \`.agents/\`, hooks, and validation scripts turn that context into repeatable agent behavior.

## Why skills matter

Skills are not dependencies or code generators. They are small operational manuals that an agent can load on demand when a request matches a known pattern such as E2E testing, commit formatting, or multi-agent execution.

## Why this site exists

The repository already contains the source docs. This site simply gives them a navigable hub with:

- versioned docs
- full-text local search
- predictable categories for quickstart, guide, concepts, reference, and community
- GitHub Pages deployment on every push to \`main\`

For the raw source files, see the repository paths referenced throughout this site.
`,
  },
  {
    source: 'docs/architecture-map.md',
    target: 'concepts/architecture-map.md',
    title: 'Architecture Map Template',
    description: 'Template and examples for documenting system boundaries and request flow.',
    sidebarPosition: 2,
  },
  {
    source: 'docs/domain-map.md',
    target: 'concepts/domain-map.md',
    title: 'Domain Map Template',
    description: 'Template and examples for business entities, rules, and edge cases.',
    sidebarPosition: 3,
  },
  {
    source: 'README.md',
    target: 'reference/cli-flags.md',
    title: 'CLI Flags',
    description: 'CLI flags and update mode behavior from the main README.',
    sidebarPosition: 1,
    extractStart: '#### Full flag list',
    extractEnd: '### B. `bootstrap.sh` — Unix shells (macOS / Linux / Git Bash / WSL)',
  },
  {
    source: 'INIT.en.md',
    target: 'reference/init-handoff.md',
    title: 'INIT Handoff Contract',
    description: 'The initialization contract that agents follow after bootstrap.',
    sidebarPosition: 2,
  },
  {
    source: 'docs/sessionstart-hook.md',
    target: 'reference/session-start-hook.md',
    title: 'SessionStart Hook',
    description: 'How the always-on skills hook works and how to debug or disable it.',
    sidebarPosition: 3,
  },
  {
    source: 'SHOWCASE.md',
    target: 'community/showcase.md',
    title: 'Showcase',
    description: 'Examples and templates for projects using LLM Project Mapper.',
    sidebarPosition: 1,
  },
  {
    source: '.specs/workflow/CONTRIBUTING.md',
    target: 'community/contributing.md',
    title: 'Contributing',
    description: 'Contribution workflow, review expectations, and Definition of Done.',
    sidebarPosition: 2,
  },
];

async function ensureDir(dir) {
  await fs.mkdir(dir, {recursive: true});
}

async function removeDir(dir) {
  await fs.rm(dir, {recursive: true, force: true});
}

function toPosix(input) {
  return input.split(path.sep).join('/');
}

function stripFirstTitle(markdown) {
  return markdown.replace(/^# .+\n+/u, '').trimStart();
}

function extractRange(markdown, startMarker, endMarker) {
  const start = startMarker ? markdown.indexOf(startMarker) : 0;
  if (start === -1) {
    throw new Error(`Could not find start marker "${startMarker}"`);
  }

  const sliced = markdown.slice(start);
  if (!endMarker) {
    return sliced.trim();
  }

  const end = sliced.indexOf(endMarker);
  if (end === -1) {
    throw new Error(`Could not find end marker "${endMarker}"`);
  }

  return sliced.slice(0, end).trim();
}

function stripVideoSection(markdown) {
  return markdown.replace(
    /### Watch: why llm-project-mapper\? \(53s\)[\s\S]+?---\n\n/u,
    '',
  );
}

function resolveRelativePath(sourceRel, target) {
  const sourceDir = path.posix.dirname(sourceRel);
  return path.posix.normalize(path.posix.join(sourceDir, target));
}

function withHash(url, hash) {
  return hash ? `${url}#${hash}` : url;
}

function rewriteUrl(rawUrl, sourceRel) {
  if (!rawUrl || rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('mailto:') || rawUrl.startsWith('#')) {
    return rawUrl;
  }

  const cleaned = rawUrl.replace(/^<|>$/g, '');
  const [pathPart, hash = ''] = cleaned.split('#');
  const resolved = resolveRelativePath(sourceRel, pathPart);

  if (routeMap.has(resolved)) {
    return withHash(routeMap.get(resolved), hash);
  }

  if (resolved.startsWith('assets/')) {
    return withHash(`/${resolved}`, hash);
  }

  if (/\.(png|jpe?g|svg|gif|webp)$/iu.test(resolved)) {
    return withHash(`${githubRawBase}${resolved}`, hash);
  }

  if (/\.(mp4|pdf|pptx)$/iu.test(resolved)) {
    return withHash(`${githubBlobBase}${resolved}`, hash);
  }

  if (resolved.endsWith('.md')) {
    return withHash(`${githubBlobBase}${resolved}`, hash);
  }

  return withHash(`${githubBlobBase}${resolved}`, hash);
}

function rewriteMarkdown(content, sourceRel) {
  let output = content;

  output = output.replace(
    /<img\s+src="([^"]+)"\s+alt="([^"]*)"[^>]*>/giu,
    (_, src, alt) => `![${alt}](${rewriteUrl(src, sourceRel)})`,
  );

  output = output.replace(
    /(!?)\[([^\]]*)\]\(([^)]+)\)/gu,
    (match, bang, label, target) => `${bang}[${label}](${rewriteUrl(target, sourceRel)})`,
  );

  return output;
}

function toFrontMatter({title, description, sidebarPosition, slug}) {
  const lines = ['---', `title: ${title}`];
  if (description) lines.push(`description: ${description}`);
  if (typeof sidebarPosition === 'number') lines.push(`sidebar_position: ${sidebarPosition}`);
  if (slug) lines.push(`slug: ${slug}`);
  lines.push('---', '');
  return lines.join('\n');
}

async function writeDoc(doc) {
  const targetPath = path.join(docsRoot, doc.target);
  await ensureDir(path.dirname(targetPath));

  let body;
  if (doc.content) {
    body = doc.content.trim();
  } else {
    const sourcePath = path.join(repoRoot, doc.source);
    const raw = await fs.readFile(sourcePath, 'utf8');
    const extracted = extractRange(raw, doc.extractStart, doc.extractEnd);
    body = stripFirstTitle(extracted);
    body = stripVideoSection(body);
    body = rewriteMarkdown(body, doc.source);
  }

  const frontMatter = toFrontMatter({
    title: doc.title,
    description: doc.description,
    sidebarPosition: doc.sidebarPosition,
    slug: doc.slug,
  });

  await fs.writeFile(targetPath, `${frontMatter}${body.trim()}\n`);
}

async function writeCategories() {
  for (const category of categories) {
    const categoryPath = path.join(docsRoot, category.dir, '_category_.json');
    await ensureDir(path.dirname(categoryPath));
    await fs.writeFile(
      categoryPath,
      `${JSON.stringify(
        {
          label: category.label,
          position: category.position,
          collapsible: false,
          collapsed: false,
        },
        null,
        2,
      )}\n`,
    );
  }
}

async function copyAssets() {
  const sourceAssets = path.join(repoRoot, 'assets');
  const targetAssets = path.join(staticRoot, 'assets');
  await removeDir(targetAssets);
  await ensureDir(staticRoot);
  await fs.cp(sourceAssets, targetAssets, {recursive: true});
}

async function main() {
  await removeDir(docsRoot);
  await ensureDir(docsRoot);
  await copyAssets();
  await writeCategories();

  for (const doc of docSpecs) {
    await writeDoc(doc);
  }

  process.stdout.write('docs-site sync complete\n');
}

main().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
});
