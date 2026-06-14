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
import { statusCommand } from './commands/status.js';
import { leaveCommand } from './commands/leave.js';
import { stopCommand } from './commands/stop.js';
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
