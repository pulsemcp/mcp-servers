#!/usr/bin/env node
/**
 * Generate heatmaps and structured output for README examples.
 * Run from: productionized/image-diff/
 * Usage: node scripts/generate-readme-examples.mjs
 */

import { diffImages } from '../shared/build/diff-engine/index.js';
import { writeFileSync, cpSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXAMPLES_DIR = resolve(__dirname, '../docs/examples');

const scenarios = [
  {
    name: 'identical',
    source: 'dashboard-source.png',
    target: 'dashboard-identical.png',
    options: {},
  },
  {
    name: 'color-change',
    source: 'dashboard-source.png',
    target: 'dashboard-color-change.png',
    options: {},
  },
  {
    name: 'font-change',
    source: 'dashboard-source.png',
    target: 'dashboard-font-change.png',
    options: {},
  },
  {
    name: 'font-change-clustered',
    source: 'dashboard-source.png',
    target: 'dashboard-font-change.png',
    options: { clusterGap: 10 },
  },
  {
    name: 'missing-badges',
    source: 'dashboard-source.png',
    target: 'dashboard-missing-badges.png',
    options: {},
  },
  {
    name: 'layout-shift',
    source: 'dashboard-source.png',
    target: 'dashboard-layout-shift.png',
    options: {},
  },
  // Auto-alignment scenarios (different sizes)
  {
    name: 'align-stats-card',
    source: 'fullpage-source.png',
    target: 'mock-stats-card.png',
    options: {},
  },
  {
    name: 'align-sidebar',
    source: 'fullpage-source.png',
    target: 'mock-sidebar.png',
    options: {},
  },
  {
    name: 'align-table-identical',
    source: 'fullpage-source.png',
    target: 'mock-table-identical.png',
    options: {},
  },
];

async function run() {
  const results = {};

  for (const scenario of scenarios) {
    const sourcePath = resolve(EXAMPLES_DIR, scenario.source);
    const targetPath = resolve(EXAMPLES_DIR, scenario.target);

    console.log(`\n=== ${scenario.name} ===`);
    console.log(`  Source: ${scenario.source}`);
    console.log(`  Target: ${scenario.target}`);

    try {
      const result = await diffImages(sourcePath, targetPath, scenario.options);

      // Copy heatmap and composite to examples dir
      if (result.heatmapPath) {
        cpSync(result.heatmapPath, resolve(EXAMPLES_DIR, `${scenario.name}-heatmap.png`));
      }
      if (result.compositePath) {
        cpSync(result.compositePath, resolve(EXAMPLES_DIR, `${scenario.name}-composite.png`));
      }

      // Store structured output (truncate clusters for readability)
      const output = {
        identical: result.identical,
        summary: result.summary,
      };
      if (result.alignment) {
        output.alignment = result.alignment;
      }
      if (result.clusters && result.clusters.length > 0) {
        output.clusters = result.clusters.slice(0, 3);
        if (result.clusters.length > 3) {
          output._note = `${result.clusters.length - 3} more cluster(s) omitted`;
        }
      }

      results[scenario.name] = output;

      console.log(
        `  Result: ${result.identical ? 'IDENTICAL' : `${result.summary.diffPercentage}% diff, ${result.summary.clusterCount} clusters`}`
      );
      if (result.alignment) {
        console.log(
          `  Alignment: (${result.alignment.x}, ${result.alignment.y}) confidence=${result.alignment.confidence} time=${result.alignment.alignmentTimeMs}ms`
        );
      }
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
      results[scenario.name] = { error: err.message };
    }
  }

  // Write all results to a JSON file for README reference
  const outputPath = resolve(EXAMPLES_DIR, 'results.json');
  writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nResults written to ${outputPath}`);
}

run().catch(console.error);
