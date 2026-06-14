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

import { runCLI } from '../dist/cli/index.js';

const argv = process.argv.slice(2);

runCLI(argv).catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
