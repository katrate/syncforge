#!/usr/bin/env node

/**
 * SyncForge Updater
 *
 * Checks GitHub releases for the latest version of SyncForge
 * and applies updates automatically.
 *
 * Usage:
 *   node scripts/update.mjs          # Check and update
 *   node scripts/update.mjs --check  # Only check for updates
 *   node scripts/update.mjs --force  # Force reinstall even if up-to-date
 *
 * Environment:
 *   SYNCFORGE_REPO - GitHub repo (default: katrate/syncforge)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const REPO = process.env.SYNCFORGE_REPO || 'katrate/syncforge';
const API_URL = `https://api.github.com/repos/${REPO}/releases/latest`;
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
  // Handle Windows paths from file:// URLs
  return path.resolve(url.startsWith('/') && url.includes(':') ? url.slice(1) : url, '..');
}

function readCurrentVersion() {
  try {
    const pkgPath = path.join(projectRoot(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/* ─── GitHub API ─── */

async function fetchLatestRelease() {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'syncforge-updater',
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  
  const response = await fetch(API_URL, { headers, signal: controller.signal });
  clearTimeout(timeout);

  if (!response.ok) {
    throw new Error(`GitHub API returned ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

/* ─── Compare versions (simple semver) ─── */

function parseVersion(v) {
  return v.replace(/^v/, '').split('.').map(Number);
}

function isNewer(latest, current) {
  const l = parseVersion(latest);
  const c = parseVersion(current);
  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    const lv = l[i] || 0;
    const cv = c[i] || 0;
    if (lv > cv) return true;
    if (lv < cv) return false;
  }
  return false;
}

/* ─── Update logic ─── */

async function checkForUpdates() {
  console.log(`${cyan('◇')} Checking for updates...`);
  const currentVersion = readCurrentVersion();
  console.log(`  ${dim('Current version:')} ${bold(currentVersion)}`);
  console.log(`  ${dim('Repository:')}     ${REPO}`);

  let release;
  try {
    release = await fetchLatestRelease();
  } catch (err) {
    console.error(`\n${red('✖')} Failed to check for updates: ${err.message}`);
    return null;
  }

  const latestVersion = release.tag_name.replace(/^v/, '');
  console.log(`  ${dim('Latest version:')}  ${bold(latestVersion)}`);

  return { release, latestVersion };
}

async function performUpdate(release) {
  const currentVer = readCurrentVersion();
  const latestVersion = release.tag_name.replace(/^v/, '');
  
  console.log(`\n${green('▼')} Updating SyncForge ${bold(currentVer)} → ${bold(latestVersion)}`);

  // Find the source code archive
  const tarballUrl = release.tarball_url || release.zipball_url;
  if (!tarballUrl) {
    console.error(`${red('✖')} No download URL found in release`);
    return false;
  }

  console.log(`  ${dim('Downloading:')} ${tarballUrl}`);

  try {
    // Download the release tarball
    const dlController = new AbortController();
    const dlTimeout = setTimeout(() => dlController.abort(), 60000);
    
    const response = await fetch(tarballUrl, {
      headers: { 'User-Agent': 'syncforge-updater' },
      signal: dlController.signal,
    });
    clearTimeout(dlTimeout);

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Extract to a temporary directory
    const tmpDir = path.join(projectRoot(), `.syncforge-update-tmp`);
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
    fs.mkdirSync(tmpDir, { recursive: true });

    // Save tarball
    const tarballPath = path.join(tmpDir, 'update.tar.gz');
    fs.writeFileSync(tarballPath, buffer);

    // Extract archive — works on macOS, Linux, and Windows 10+
    const isWindows = process.platform === 'win32';
    if (isWindows && tarballUrl.endsWith('.zip')) {
      // Windows with zip: use PowerShell
      execSync(`powershell -Command "Expand-Archive -Path '${tarballPath}' -DestinationPath '${tmpDir}' -Force"`, { stdio: 'pipe' });
    } else {
      // macOS, Linux, or tar.gz on Windows: use tar
      execSync(`tar -xzf "${tarballPath}" -C "${tmpDir}"`, { stdio: 'pipe' });
    }

    // Find the extracted directory (usually repo-name-tag)
    const extractedDirs = fs.readdirSync(tmpDir).filter(f => 
      fs.statSync(path.join(tmpDir, f)).isDirectory() && f !== '.' && f !== '..'
    );

    if (extractedDirs.length === 0) {
      throw new Error('No extracted directory found');
    }

    const extractedDir = path.join(tmpDir, extractedDirs[0]);

    // Copy files, preserving existing config
    const preserveFiles = [
      '.env',
      '.syncignore.local',
      'syncforge_data',
      'node_modules',
      '.syncforge.json',
    ];

    const rootDir = projectRoot();

    // Copy src/, package.json, tsconfig.json, scripts/
    const dirsToCopy = ['src', 'scripts'];
    for (const dir of dirsToCopy) {
      const srcDir = path.join(extractedDir, dir);
      const destDir = path.join(rootDir, dir);
      if (fs.existsSync(srcDir)) {
        // Remove existing, then copy
        if (fs.existsSync(destDir)) {
          fs.rmSync(destDir, { recursive: true });
        }
        fs.cpSync(srcDir, destDir, { recursive: true });
      }
    }

    // Copy root files (package.json, tsconfig.json, etc.)
    const rootFiles = ['package.json', 'tsconfig.json', '.syncignore', 'docker-compose.yml', 'README.md'];
    for (const file of rootFiles) {
      const srcFile = path.join(extractedDir, file);
      const destFile = path.join(rootDir, file);
      if (fs.existsSync(srcFile)) {
        if (!preserveFiles.includes(file)) {
          fs.copyFileSync(srcFile, destFile);
        }
      }
    }

    // Cleanup temp directory
    fs.rmSync(tmpDir, { recursive: true });

    // Reinstall dependencies if needed
    console.log(`  ${cyan('◇')} Reinstalling dependencies...`);
    execSync('npm install', { cwd: rootDir, stdio: 'pipe' });

    // Rebuild
    console.log(`  ${cyan('◇')} Building...`);
    execSync('npm run build', { cwd: rootDir, stdio: 'pipe' });

    console.log(`\n${green('✔')} Updated to ${bold(latestVersion)}!`);
    return true;
  } catch (err) {
    console.error(`\n${red('✖')} Update failed: ${err.message}`);

    const tmpDir = path.join(projectRoot(), `.syncforge-update-tmp`);
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
    return false;
  }
}

/* ─── Main ─── */

async function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check');
  const force = args.includes('--force');

  console.log(bold(`\n  ⚡ SyncForge Updater\n`));

  const result = await checkForUpdates();

  if (!result) {
    process.exit(1);
  }

  const { release, latestVersion } = result;

  const currentVersion = readCurrentVersion();
  const needsUpdate = isNewer(latestVersion, currentVersion);

  if (!needsUpdate && !force) {
    console.log(`\n${green('✔')} SyncForge is up to date (${bold(currentVersion)})`);
    return;
  }

  if (checkOnly) {
    if (needsUpdate) {
      const cv = readCurrentVersion();
      console.log(`\n${yellow('→')} Update available: ${bold(cv)} → ${bold(latestVersion)}`);
      console.log(`  ${dim('Run without --check to update')}`);
    }
    return;
  }

  // Prompt is handled in the CLI command (update.ts) — the script always runs with --force
  // or non-interactively. If --force wasn't passed and we get here, auto-confirm.
  if (!force && !checkOnly) {
    // Non-TTY mode or called without --force — auto-confirm update
    console.log(`  ${dim('Auto-confirming update...')}`);
  }

  const success = await performUpdate(release);
  process.exit(success ? 0 : 1);
}

main().catch((err) => {
  console.error(`${red('✖')} Unexpected error:`, err.message);
  process.exit(1);
});
