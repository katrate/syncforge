#!/usr/bin/env node

/**
 * SyncForge Uninstaller
 *
 * Detects SyncForge installation and removes it cleanly.
 *
 * Usage:
 *   node scripts/uninstall.mjs           # Interactive uninstall
 *   node scripts/uninstall.mjs --force   # Non-interactive uninstall
 *   node scripts/uninstall.mjs --check   # Only check what would be removed
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/* ─── Helpers ─── */

function color(s, code) {
  return process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s;
}

const green = (s) => color(s, '32');
const cyan = (s) => color(s, '36');
const yellow = (s) => color(s, '33');
const red = (s) => color(s, '31');
const bold = (s) => color(s, '1');
const dim = (s) => color(s, '2');

function projectRoot() {
  const url = new URL('.', import.meta.url).pathname;
  // Handle Windows paths from file:// URLs (e.g. /C:/Users/...)
  return path.resolve(url.startsWith('/') && /^\/[A-Za-z]:/.test(url) ? url.slice(1) : url, '..');
}

function homeDir() {
  return process.env.HOME || process.env.USERPROFILE || '.';
}

/* ─── Detection ─── */

function findSyncForgeInstallations() {
  const installations = [];

  // 1. Current directory
  const root = projectRoot();
  const pkgPath = path.join(root, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.name === 'syncforge') {
        installations.push({
          type: 'local',
          path: root,
          version: pkg.version,
          description: 'SyncForge project directory',
        });
      }
    } catch {}
  }

  // 2. Global npm installation
  try {
    const globalPath = execSync('npm root -g', { encoding: 'utf-8' }).trim();
    const globalSyncForge = path.join(globalPath, 'syncforge');
    if (fs.existsSync(globalSyncForge)) {
      installations.push({
        type: 'global',
        path: globalSyncForge,
        version: '?',
        description: 'Global npm installation',
      });
    }
  } catch {}

  // 3. Home directory config
  const configFile = path.join(homeDir(), '.syncforge.json');
  if (fs.existsSync(configFile)) {
    installations.push({
      type: 'config',
      path: configFile,
      version: '—',
      description: 'User configuration file',
    });
  }

  return installations;
}

function findSyncForgeArtifacts() {
  const root = projectRoot();
  const artifacts = [];

  // Directories
  const dirs = [
    'node_modules',
    'dist',
    'syncforge_data',
    '.syncforge-update-tmp',
  ];

  for (const dir of dirs) {
    const dirPath = path.join(root, dir);
    if (fs.existsSync(dirPath)) {
      const size = getDirSize(dirPath);
      artifacts.push({ type: 'dir', path: dirPath, size });
    }
  }

  // Config files
  const configFiles = [
    '.syncforge.json',
    '.syncignore.local',
  ];

  for (const file of configFiles) {
    const filePath = path.join(homeDir(), file);
    if (fs.existsSync(filePath)) {
      artifacts.push({ type: 'config', path: filePath, size: fs.statSync(filePath).size });
    }
  }

  return artifacts;
}

function getDirSize(dirPath) {
  try {
    let totalSize = 0;
    let count = 0;
    function walk(dir) {
      if (count > 1000) return; // Cap for performance
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (count > 1000) return;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          totalSize += fs.statSync(fullPath).size;
          count++;
        }
      }
    }
    walk(dirPath);
    return totalSize;
  } catch {
    return 0;
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ─── Removal ─── */

function removeInstallations(installations) {
  for (const inst of installations) {
    try {
      if (inst.type === 'local') {
        // Remove node_modules, dist, and data
        const dirsToRemove = ['node_modules', 'dist', 'syncforge_data'];
        for (const dir of dirsToRemove) {
          const dirPath = path.join(inst.path, dir);
          if (fs.existsSync(dirPath)) {
            fs.rmSync(dirPath, { recursive: true, force: true });
            console.log(`  ${red('✖')} Removed: ${dir}/`);
          }
        }

        // Remove generated config files from project
        const filesToRemove = ['.syncforge.json'];
        for (const file of filesToRemove) {
          const filePath = path.join(inst.path, file);
          if (fs.existsSync(filePath)) {
            fs.rmSync(filePath, { force: true });
            console.log(`  ${red('✖')} Removed: ${file}`);
          }
        }
      } else if (inst.type === 'global') {
        fs.rmSync(inst.path, { recursive: true, force: true });
        console.log(`  ${red('✖')} Removed global installation: ${inst.path}`);
      } else if (inst.type === 'config') {
        fs.rmSync(inst.path, { force: true });
        console.log(`  ${red('✖')} Removed: ${inst.path}`);
      }
    } catch (err) {
      console.error(`  ${yellow('⚠')} Failed to remove ${inst.path}: ${err.message}`);
    }
  }
}

/* ─── Check: is this a global install? ─── */

function isGlobalInstall() {
  try {
    const output = execSync('npm ls -g syncforge --depth=0 --json', { encoding: 'utf-8', stdio: 'pipe' });
    const parsed = JSON.parse(output);
    return parsed.dependencies && parsed.dependencies.syncforge !== undefined;
  } catch {
    return false;
  }
}

/* ─── Main ─── */

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const checkOnly = args.includes('--check');

  console.log(bold(`\n  ⚡ SyncForge Uninstaller\n`));

  // Detect installations
  const installations = findSyncForgeInstallations();
  const artifacts = findSyncForgeArtifacts();

  if (installations.length === 0 && artifacts.length === 0) {
    console.log(`${yellow('◇')} No SyncForge installation found.`);
    return;
  }

  console.log(bold('Detected installations:'));
  for (const inst of installations) {
    console.log(`  ${green('●')} ${inst.description}`);
    console.log(`      ${dim('Path:')}    ${inst.path}`);
    console.log(`      ${dim('Version:')} ${inst.version}`);
  }

  if (artifacts.length > 0 && installations.length === 0) {
    console.log();
    console.log(bold('Detected artifacts:'));
    for (const art of artifacts) {
      const sizeStr = art.size ? ` (${formatSize(art.size)})` : '';
      console.log(`  ${yellow('●')} ${art.path}${sizeStr}`);
    }
  }

  if (checkOnly) {
    return;
  }

  // Prompt is handled in the CLI command (uninstall.ts) — always run with --force here.
  // If --force wasn't passed, the CLI prompts first and then passes it.
  if (!force) {
    console.log(`  ${dim('Running uninstall...')}`);
  }

  console.log();

  // Perform removal
  if (installations.length > 0) {
    console.log(bold('Removing installations...'));
    removeInstallations(installations);
  }

  // Clean up any remaining artifacts not covered by installations
  const remainingArtifacts = artifacts.filter(art => {
    if (art.type === 'config') return true;
    if (art.type === 'dir') {
      // Skip dirs that were already removed as part of installation
      const baseDir = path.basename(art.path);
      return !['node_modules', 'dist', 'syncforge_data'].includes(baseDir);
    }
    return true;
  });

  if (remainingArtifacts.length > 0) {
    console.log(bold('Removing additional artifacts...'));
    for (const art of remainingArtifacts) {
      try {
        if (art.type === 'config') {
          fs.rmSync(art.path, { force: true });
          console.log(`  ${red('✖')} Removed: ${art.path}`);
        } else if (art.type === 'dir') {
          fs.rmSync(art.path, { recursive: true, force: true });
          console.log(`  ${red('✖')} Removed: ${art.path}/`);
        }
      } catch (err) {
        console.error(`  ${yellow('⚠')} Failed to remove ${art.path}: ${err.message}`);
      }
    }
  }

  // Unlink global command if installed globally
  if (isGlobalInstall()) {
    try {
      execSync('npm uninstall -g syncforge', { stdio: 'pipe' });
      console.log(`  ${red('✖')} Removed global syncforge command`);
    } catch {}
  }

  console.log();
  console.log(`${green('✔')} SyncForge has been uninstalled.`);
  console.log(`  ${dim('Source files (src/) and project configuration remain.')}`);
  console.log(`  ${dim('To fully remove the project, delete this directory.')}`);
}

main().catch((err) => {
  console.error(`${red('✖')} Uninstall failed:`, err.message);
  process.exit(1);
});
