/**
 * syncforge leave — Leave a project
 *
 * Usage: syncforge leave
 *
 * Disconnects from the project and removes local configuration.
 * Does NOT delete any files.
 */

import { readConfig, clearConfig } from '../config-store.js';
import chalk from 'chalk';

export async function leaveCommand(): Promise<void> {
  const agentConfig = readConfig();

  if (!agentConfig) {
    console.log(chalk.yellow('◇'), 'Not currently in any project.');
    return;
  }

  console.log(chalk.blue('◇'), `Leaving project ${chalk.cyan(agentConfig.projectId)}...`);

  // Clear local config
  clearConfig();

  console.log(chalk.green('✔'), 'Left project. Local files have been preserved.');
  console.log(chalk.dim('To remove project files, delete them manually.'));
}
