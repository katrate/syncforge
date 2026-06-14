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

#!/usr/bin/env node

/**
 * SyncForge CLI — Global entry point
 *
 * Usage:
 *   syncforge server    syncforge init    syncforge join <id>
 *   syncforge start     syncforge status  syncforge leave
 *   syncforge stop      syncforge update  syncforge uninstall
 */

import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const distPath = resolve(ROOT, 'dist', 'agent.js');
const srcPath = resolve(ROOT, 'src', 'agent.ts');
const argv = process.argv.slice(2);
const argsStr = argv.map(a => `"${a}"`).join(' ');

// Try built version first (compiled from TypeScript)
if (existsSync(distPath)) {
  execSync(`node "${distPath}" ${argsStr}`, { stdio: 'inherit' });
} else if (existsSync(srcPath)) {
  // Run from source via tsx — no build needed
  execSync(`npx tsx "${srcPath}" ${argsStr}`, { stdio: 'inherit' });
} else {
  console.error('SyncForge installation incomplete. Run: npm run build');
  process.exit(1);
}
