#!/usr/bin/env node

/**
 * SyncForge CLI — Global entry point
 *
 * This file is used when syncforge is installed globally via npm.
 * It forwards all arguments to the agent's CLI handler.
 *
 * Usage:
 *   syncforge init
 *   syncforge share
 *   syncforge join <id>
 *   syncforge start
 *   syncforge status
 *   syncforge leave
 *   syncforge stop
 */

import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distPath = resolve(__dirname, '..', 'dist', 'cli', 'index.js');
const srcPath = resolve(__dirname, '..', 'src', 'agent.ts');
const argv = process.argv.slice(2);

async function main() {
  // Try built version first
  if (existsSync(distPath)) {
    const { runCLI } = await import(distPath);
    await runCLI(argv);
    return;
  }

  // Fall back to tsx for source version
  if (existsSync(srcPath)) {
    console.warn('SyncForge is not built. Running from source with tsx...');
    const { execSync } = await import('child_process');
    const args = argv.map(a => `"${a}"`).join(' ');
    execSync(`npx tsx "${srcPath}" ${args}`, { stdio: 'inherit' });
    return;
  }

  console.error('SyncForge installation incomplete. Run: npm run build');
  process.exit(1);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
