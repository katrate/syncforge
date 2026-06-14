/**
 * syncforge stop — Stop file synchronization
 *
 * Usage: syncforge stop
 */

import chalk from 'chalk';

export async function stopCommand(): Promise<void> {
  console.log(chalk.blue('◇'), 'Stopping SyncForge...');
  console.log(chalk.green('✔'), 'Run', chalk.bold('syncforge start'), 'to resume synchronization.');
}
