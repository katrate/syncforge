/**
 * SyncForge Agent — Entry Point
 *
 * This is the main entry point for the SyncForge CLI.
 * It dispatches to the appropriate command handler.
 *
 * Usage:
 *   syncforge init          — Create a project
 *   syncforge share         — Share invite link
 *   syncforge join <id>     — Join a project
 *   syncforge start         — Start sync
 *   syncforge status        — Show status
 *   syncforge leave         — Leave project
 *   syncforge stop          — Stop sync
 */

import { runCLI } from './cli/index.js';

const argv = process.argv.slice(2);
runCLI(argv).catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
