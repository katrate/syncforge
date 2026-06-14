/**
 * SyncForge CLI — Entry Point
 *
 * Registers all CLI commands using Commander.
 * The CLI is the primary user interface for SyncForge.
 */

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { shareCommand } from './commands/share.js';
import { joinCommand } from './commands/join.js';
import { startCommand } from './commands/start.js';
import { serverCommand } from './commands/server.js';
import { statusCommand } from './commands/status.js';
import { leaveCommand } from './commands/leave.js';
import { stopCommand } from './commands/stop.js';
import { updateCommand } from './commands/update.js';
import { uninstallCommand } from './commands/uninstall.js';
import { readConfig } from './config-store.js';
import { VERSION } from './version.js';

export function createCLI(): Command {
  const program = new Command();

  program
    .name('syncforge')
    .description('Real-time collaboration for local development projects')
    .version(VERSION);

  program
    .command('init')
    .description('Create a new project')
    .option('-n, --name <name>', 'Project name')
    .action(async (options) => {
      await initCommand(options);
    });

  program
    .command('share')
    .description('Generate an invite link for collaborators')
    .action(async () => {
      await shareCommand();
    });

  program
    .command('join')
    .description('Join an existing project')
    .argument('<project-id-or-token>', 'Project ID or invite token')
    .option('-t, --token <token>', 'Invite token')
    .action(async (projectIdOrToken, options) => {
      await joinCommand(projectIdOrToken, options);
    });

  program
    .command('start')
    .description('Start file synchronization')
    .option('--server', 'Also start the sync server')
    .action(async (options) => {
      await startCommand(options);
    });

  program
    .command('status')
    .description('Show synchronization status')
    .action(async () => {
      await statusCommand();
    });

  program
    .command('leave')
    .description('Leave the current project')
    .action(async () => {
      await leaveCommand();
    });

  program
    .command('stop')
    .description('Stop synchronization')
    .action(async () => {
      await stopCommand();
    });

  program
    .command('server')
    .description('Start the sync server (HTTP + WebSocket)')
    .action(async () => {
      await serverCommand();
    });

  program
    .command('update')
    .description('Check for and apply updates')
    .option('--check', 'Only check for updates, don\'t apply')
    .option('--force', 'Force reinstall even if up to date')
    .action(async (options) => {
      await updateCommand(options);
    });

  program
    .command('uninstall')
    .description('Remove SyncForge from the system')
    .option('--check', 'Preview what would be removed')
    .option('--force', 'Non-interactive uninstall')
    .action(async (options) => {
      await uninstallCommand(options);
    });

  return program;
}

/**
 * Run the CLI with the given arguments.
 */
export async function runCLI(argv: string[]): Promise<void> {
  const program = createCLI();

  // Show status by default
  if (argv.length === 0) {
    await statusCommand();
    return;
  }

  await program.parseAsync(argv, { from: 'user' });
}
