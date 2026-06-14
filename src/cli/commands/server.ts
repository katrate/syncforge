/**
 * syncforge server — Start the sync server
 *
 * Usage: syncforge server
 *        SYNCFORGE_PORT=4200 syncforge server
 *
 * Starts the SyncForge server independently (HTTP + WebSocket).
 * Runs until Ctrl+C.
 */

import { loadConfig } from '../../config/index.js';
import { SyncForgeServer } from '../../server/app.js';
import { VERSION } from '../version.js';
import chalk from 'chalk';

export async function serverCommand(): Promise<void> {
  const config = loadConfig();

  console.log(chalk.bold(`\n  ⚡ SyncForge Server v${VERSION}\n`));
  console.log(`  ${chalk.dim('Host:')}  ${config.serverHost}:${config.serverPort}`);
  console.log();

  const server = new SyncForgeServer(config);
  await server.start();

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log(chalk.blue('\n◇'), 'Shutting down...');
    await server.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Keep alive
  await new Promise(() => {});
}
