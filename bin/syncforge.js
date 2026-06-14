#!/usr/bin/env node

/**
 * SyncForge CLI — Global entry point
 *
 * This file is used when syncforge is installed globally via npm.
 * It forwards all arguments to the agent's CLI handler.
 * Runs directly from TypeScript source via tsx — no build needed.
 *
 * Usage:
 *   syncforge server           Start the sync server
 *   syncforge init             Create a new project
 *   syncforge share            Generate invite link
 *   syncforge join <id>        Join a project
 *   syncforge start            Start file sync
 *   syncforge status           Show status
 *   syncforge leave            Leave a project
 *   syncforge stop             Stop sync
 *   syncforge update           Check for updates
 *   syncforge uninstall        Remove SyncForge
 */

import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const distPath = resolve(ROOT, 'dist', 'agent.js');
const srcPath = resolve(ROOT, 'src', 'agent.ts');
const argv = process.argv.slice(2);

async function main() {
  // Try built version first (dist/agent.js)
  if (existsSync(distPath)) {
    const { runCLI } = await import(pathToFileURL(distPath).href);
    await runCLI(argv);
    return;
  }

  // Run from source via tsx — no build needed
  if (existsSync(srcPath)) {
    const { execSync } = await import('child_process');
    execSync(`npx tsx "${srcPath}" ${argv.map(a => `"${a}"`).join(' ')}`, { stdio: 'inherit' });
    return;
  }

  console.error('SyncForge installation incomplete. Run: npm run build');
  process.exit(1);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
