#!/usr/bin/env node
/**
 * Standalone CLI for generating godoc markdown pages without running a
 * full Docusaurus build. Used by `npm run gen-godoc` in consuming sites.
 *
 * Usage: node generate.js --project-root ../.. --output-dir ./docs/sdk-reference --packages ./cmd,./internal/cache
 */

const path = require('path');
const {generateDocs} = require('./generator');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    projectRoot: process.cwd(),
    outputDir: './docs/sdk-reference',
    packages: [],
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--project-root':
        opts.projectRoot = path.resolve(args[++i]);
        break;
      case '--output-dir':
        opts.outputDir = path.resolve(args[++i]);
        break;
      case '--packages':
        opts.packages = args[++i].split(',').map(p => ({
          path: p.trim(),
          name: p.trim().replace(/^\.\//, ''),
        }));
        break;
    }
  }

  return opts;
}

async function main() {
  const opts = parseArgs();
  if (opts.packages.length === 0) {
    console.error('Error: --packages required (comma-separated Go package paths)');
    process.exit(1);
  }
  await generateDocs(opts);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
