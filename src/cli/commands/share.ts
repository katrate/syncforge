/**
 * syncforge share — Generate an invite link
 *
 * Usage: syncforge share
 *
 * Displays the invite token/link that collaborators
 * can use to join the project.
 */

import { loadConfig } from '../../config/index.js';
import { readConfig } from '../config-store.js';
import chalk from 'chalk';

export async function shareCommand(): Promise<void> {
  const agentConfig = readConfig();

  if (!agentConfig) {
    console.error(chalk.red('✖'), 'No project found. Run', chalk.bold('syncforge init'), 'first.');
    process.exit(1);
  }

  const config = loadConfig();
  const apiBase = process.env.SYNCFORGE_API_URL || `http://localhost:${config.serverPort}`;

  console.log(chalk.blue('◇'), 'Fetching project info...');

  try {
    const response = await fetch(`${apiBase}/api/projects/${agentConfig.projectId}`);
    if (!response.ok) {
      console.error(chalk.red('✖'), 'Project not found on server.');
      process.exit(1);
    }

    const project = await response.json() as { id: string; name: string; members: { userId: string; displayName: string }[] };

    console.log(chalk.green('✔'), `Project: ${chalk.bold(project.name)}`);
    console.log();
    console.log(`  ${chalk.bold('Invite Link:')}`);
    console.log(`  ${chalk.yellow(`syncforge join ${project.id}`)}`);
    console.log();
    console.log(`  ${chalk.bold('Direct join:')}  ${chalk.dim(`syncforge join ${project.id}`)}`);
    console.log();
    console.log(chalk.dim('Members:'));
    if (project.members.length === 0) {
      console.log(chalk.dim('  (No other members yet)'));
    } else {
      for (const member of project.members) {
        console.log(`  ${chalk.green('●')} ${member.displayName} (${member.userId})`);
      }
    }
  } catch {
    console.error(chalk.red('✖'), 'Could not connect to server. Is it running?');
    process.exit(1);
  }
}
