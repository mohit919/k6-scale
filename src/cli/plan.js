#!/usr/bin/env node

import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { buildWorkloadPlan, formatWorkloadPlan } from '../model/plan.js';

function usage() {
  return [
    'Usage: node src/cli/plan.js <profile.js> [options]',
    '',
    'Options:',
    '  --load-factor <number>  Scale the profile volume before planning (default: 1)',
    '  --json                  Print JSON instead of the human-readable report',
    '  --output <path>         Write the selected output format to a file',
    '  --help                  Show this help',
  ].join('\n');
}

function parseArgs(argv) {
  const args = { loadFactor: 1, json: false, output: null, profilePath: null };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help') {
      args.help = true;
    } else if (arg === '--json') {
      args.json = true;
    } else if (arg === '--load-factor') {
      const value = Number(argv[++i]);
      if (!Number.isFinite(value) || value <= 0) throw new Error('--load-factor must be > 0');
      args.loadFactor = value;
    } else if (arg === '--output') {
      const value = argv[++i];
      if (!value) throw new Error('--output requires a path');
      args.output = value;
    } else if (arg.startsWith('-')) {
      throw new Error(`unknown option: ${arg}`);
    } else if (!args.profilePath) {
      args.profilePath = arg;
    } else {
      throw new Error(`unexpected argument: ${arg}`);
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.profilePath) {
    console.log(usage());
    process.exitCode = args.help ? 0 : 1;
    return;
  }

  const profileUrl = pathToFileURL(resolve(args.profilePath)).href;
  const imported = await import(profileUrl);
  const profile = imported.default;
  if (!profile) throw new Error('profile module must export a default profile object');

  const plan = buildWorkloadPlan(profile, { loadFactor: args.loadFactor });
  const output = args.json
    ? `${JSON.stringify(plan, null, 2)}\n`
    : `${formatWorkloadPlan(plan)}\n`;

  if (args.output) {
    writeFileSync(resolve(args.output), output, 'utf8');
  } else {
    process.stdout.write(output);
  }
}

main().catch((error) => {
  console.error(`k6-scale plan: ${error.message}`);
  process.exitCode = 1;
});
