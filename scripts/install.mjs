#!/usr/bin/env node

/**
 * SyncForge Installer
 *
 * Downloads and installs the latest SyncForge release from GitHub.
 *
 * One-liner:
 *   npx github:katrate/syncforge scripts/install.mjs
 *   curl -fsSL https://raw.githubusercontent.com/katrate/syncforge/master/scripts/install.mjs | node
 *
 * Or clone and install manually:
 *   git clone https://github.com/katrate/syncforge.git
 *   cd syncforge
 *   npm install
 *   npm run build
 *   npm install -g .
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { createInterface } from 'readline';

const REPO = 'katrate/syncforge';
const API_URL = `https://api.github.com/repos/${REPO}/releases/latest`;
const TAR_URL = `https://github.com/${REPO}/archive/refs/tags/`;

/* ─── Colors ─── */

const c = (s, code) => process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s;
const green = (s) => c(s, '32');
const cyan = (s) => c(s, '36');
const yellow = (s) => c(s, '33');
const red = (s) => c(s, '31');
const bold = (s) => c(s, '1');
const dim = (s) => c(s, '2');

/* ─── Helpers ─── */

function run(cmd, opts = {}) {
  console.log(`  ${dim('$')} ${cmd}`);
  return execSync(cmd, { stdio: 'pipe', ...opts }).toString().trim();
}

async function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => { rl.close(); resolve(answer); });
  });
}

/* ─── Main ─── */

async function main() {
  const args = process.argv.slice(2);
  const installDir = args[0] || process.cwd();
  const targetDir = path.resolve(installDir, 'syncforge');

  console.log(bold(`\n  ⚡ SyncForge Installer\n`));

  // Step 1: Check prerequisites
  console.log(`${cyan('◇')} Checking prerequisites...`);

  try {
    run('node --version');
  } catch {
    console.error(`${red('✖')} Node.js is required. Install it from https://nodejs.org`);
    process.exit(1);
  }

  try {
    run('git --version');
  } catch {
    console.error(`${red('✖')} Git is required. Install it from https://git-scm.com`);
    process.exit(1);
  }

  const nodeVersion = run('node --version');
  console.log(`  ${dim('Node:')} ${nodeVersion}`);
  console.log(`  ${dim('Git:')}  ${run('git --version')}`);

  // Step 2: Confirm install location
  console.log(`\n${cyan('◇')} Install location: ${bold(targetDir)}`);
  console.log(`  ${dim('This will download SyncForge to the above directory.')}`);

  if (fs.existsSync(targetDir)) {
    const answer = await ask(`\n${yellow('?')} Directory already exists. Overwrite? [y/N] `);
    if (answer.toLowerCase() !== 'y') {
      console.log('  Installation cancelled.');
      return;
    }
    fs.rmSync(targetDir, { recursive: true });
  }

  // Step 3: Clone the repo
  console.log(`\n${cyan('◇')} Downloading SyncForge...`);
  run(`git clone --depth 1 https://github.com/${REPO}.git "${targetDir}"`);
  console.log(`  ${green('✔')} Downloaded`);

  // Step 4: Install dependencies
  console.log(`\n${cyan('◇')} Installing dependencies...`);
  run('npm install', { cwd: targetDir, timeout: 120000 });
  console.log(`  ${green('✔')} Dependencies installed`);

  // Step 5: Build
  console.log(`\n${cyan('◇')} Building...`);
  run('npm run build', { cwd: targetDir });
  console.log(`  ${green('✔')} Built`);

  // Step 6: Install globally (optional)
  console.log(`\n${cyan('◇')} Would you like to install syncforge globally?`);
  const answer = await ask(`${yellow('?')} Install globally so you can run 'syncforge' from anywhere? [Y/n] `);

  if (answer.toLowerCase() !== 'n') {
    try {
      run('npm install -g .', { cwd: targetDir });
      console.log(`  ${green('✔')} Installed globally! Use: syncforge`);
    } catch (err) {
      console.log(`  ${yellow('⚠')} Global install failed (may need admin rights).`);
      console.log(`  ${dim('You can still use:')} npx tsx ${targetDir}/src/agent.ts`);
    }
  }

  // Done!
  console.log(`\n${green('✔')} SyncForge installed successfully!`);
  console.log();
  console.log(`  ${bold('Location:')} ${targetDir}`);
  console.log();
  console.log(`  ${green('syncforge server')}    — Start the sync server`);
  console.log(`  ${green('syncforge init')}      — Create a project`);
  console.log(`  ${green('syncforge join <id>')} — Join a project`);
  console.log(`  ${green('syncforge update')}    — Check for updates`);
  console.log();
  console.log(dim('(these commands work after global install from anywhere)'));
  console.log();
  console.log(dim('Documentation: https://github.com/katrate/syncforge/blob/master/DOCUMENTATION.md'));
}

main().catch((err) => {
  console.error(`\n${red('✖')} Installation failed:`, err.message);
  process.exit(1);
});
