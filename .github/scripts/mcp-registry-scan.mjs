#!/usr/bin/env node
// Scans every experimental/*/server.json and productionized/*/server.json,
// joins each one against the "MCP Registry" column in the root README and
// the current latest version on the registry, and prints a JSON candidate
// list of servers that need publishing.
//
// Used by .github/workflows/publish-mcp-registry.yml.

import fs from 'node:fs';
import path from 'node:path';

const README_PATH = 'README.md';
const REGISTRY_BASE = 'https://registry.modelcontextprotocol.io';
const PUBLISH_COLUMN_HEADER = /^mcp registry$/i;

function log(msg) {
  process.stderr.write(`${msg}\n`);
}

function parsePublishColumn(readme) {
  const map = {};
  const lines = readme.split('\n');
  let headers = null;
  let publishColIdx = -1;
  let nameColIdx = -1;
  let seenSeparator = false;

  for (const line of lines) {
    if (!line.startsWith('|')) {
      headers = null;
      publishColIdx = -1;
      nameColIdx = -1;
      seenSeparator = false;
      continue;
    }
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());
    if (headers === null) {
      headers = cells;
      nameColIdx = 0;
      publishColIdx = headers.findIndex((h) => PUBLISH_COLUMN_HEADER.test(h));
      seenSeparator = false;
      continue;
    }
    if (!seenSeparator) {
      // Markdown separator rows are made of dashes, colons, pipes, and whitespace
      // only. Anything else means the table is malformed (separator missing),
      // and skipping this row as if it were one would silently drop the first
      // real data row — bail on the table instead.
      if (!/^[\s|:-]+$/.test(line)) {
        headers = null;
        publishColIdx = -1;
        nameColIdx = -1;
        continue;
      }
      seenSeparator = true;
      continue;
    }
    if (publishColIdx < 0) continue;
    const nameCell = cells[nameColIdx] || '';
    const match = nameCell.match(/\[([^\]]+)\]/);
    if (!match) continue;
    map[match[1]] = (cells[publishColIdx] || '').trim();
  }
  return map;
}

async function getRegistryVersion(name) {
  const encoded = encodeURIComponent(name);
  const url = `${REGISTRY_BASE}/v0/servers/${encoded}/versions/latest`;
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Registry lookup for ${name} failed: HTTP ${res.status}`);
  }
  const data = await res.json();
  return data?.server?.version ?? null;
}

async function main() {
  const readme = fs.readFileSync(README_PATH, 'utf8');
  const publishMap = parsePublishColumn(readme);

  const candidates = [];
  const skipped = [];
  // Hard errors fail the workflow (config-level problems we don't want to
  // silently paper over): missing or invalid "MCP Registry" column entries.
  // Soft errors warn but don't fail the workflow: a broken server.json
  // shouldn't block every other server's publish. They surface in the job
  // summary so we can fix them in the upstream monorepo.
  const errors = [];
  const warnings = [];

  for (const root of ['experimental', 'productionized']) {
    if (!fs.existsSync(root)) continue;
    for (const dir of fs.readdirSync(root).sort()) {
      const serverDir = path.join(root, dir);
      const sjPath = path.join(serverDir, 'server.json');
      if (!fs.existsSync(sjPath)) continue;

      let manifest;
      try {
        manifest = JSON.parse(fs.readFileSync(sjPath, 'utf8'));
      } catch (e) {
        warnings.push({ dir: serverDir, reason: `Invalid JSON: ${e.message}` });
        continue;
      }

      const name = manifest.name;
      const version = manifest.version;
      if (!name || !version) {
        warnings.push({ dir: serverDir, reason: 'Missing name or version in server.json' });
        continue;
      }

      const publishFlag = publishMap[dir];
      if (!publishFlag) {
        errors.push({
          dir: serverDir,
          reason: `No "MCP Registry" column entry in README.md for "${dir}". Add a row with Yes or No.`,
        });
        continue;
      }

      if (/^no$/i.test(publishFlag)) {
        log(`⏭  ${name}@${version}: README MCP Registry = "No" — skipping`);
        skipped.push({ dir: serverDir, name, version, reason: 'README Publish = No' });
        continue;
      }
      if (!/^yes$/i.test(publishFlag)) {
        errors.push({
          dir: serverDir,
          reason: `Invalid "MCP Registry" value for "${dir}" in README.md: "${publishFlag}" (expected "Yes" or "No")`,
        });
        continue;
      }

      let registryVersion;
      try {
        registryVersion = await getRegistryVersion(name);
      } catch (e) {
        warnings.push({ dir: serverDir, reason: e.message });
        continue;
      }

      if (registryVersion === version) {
        log(`✅ ${name}@${version}: already on registry — skipping`);
        skipped.push({ dir: serverDir, name, version, reason: 'Already published' });
        continue;
      }

      log(`📦 ${name}@${version}: enqueue (registry has ${registryVersion ?? 'nothing'})`);
      candidates.push({
        dir: serverDir,
        sjPath,
        name,
        version,
        registryVersion,
      });
    }
  }

  if (warnings.length > 0) {
    log('\n=== Warnings (skipped, did not block the run) ===');
    for (const w of warnings) log(`  ${w.dir}: ${w.reason}`);
  }
  if (errors.length > 0) {
    log('\n=== Errors ===');
    for (const e of errors) log(`  ${e.dir}: ${e.reason}`);
    process.exitCode = 1;
  }

  const result = { candidates, skipped, errors, warnings };
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

main().catch((e) => {
  log(`Scan failed: ${e.stack || e.message}`);
  process.exit(2);
});
