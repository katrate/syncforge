/**
 * SyncForge Server — Standalone Entry Point
 *
 * Starts the SyncForge server independently (without the agent).
 * This is useful for running a persistent server on a cloud instance.
 *
 * Usage:
 *   npx tsx src/server.ts
 *   SYNCFORGE_PORT=4200 npx tsx src/server.ts
 */

import { loadConfig } from './config/index.js';
import { SyncForgeServer } from './server/app.js';

async function main(): Promise<void> {
  const config = loadConfig();

  console.log(`\n  ⚡ SyncForge Server v${process.env.npm_package_version || '0.1.0'}\n`);
  console.log(`  ${'Server:'}  ${config.serverHost}:${config.serverPort}`);
  console.log(`  ${'Storage:'} ${config.storageDir}`);
  console.log();

  const server = new SyncForgeServer(config);
  await server.start();

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log('\n  Shutting down...');
    await server.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
