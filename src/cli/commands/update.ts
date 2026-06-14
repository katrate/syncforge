/**
 * syncforge update — Update SyncForge to the latest version
 *
 * Usage: syncforge update          # Check and update
 *        syncforge update --check  # Only check
 *        syncforge update --force  # Force reinstall
 *
 * Delegates to scripts/update.mjs.
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import chalk from 'chalk';

export async function updateCommand(options: { check?: boolean; force?: boolean }): Promise<void> {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const scriptPath = resolve(__dirname, '..', '..', '..', 'scripts', 'update.mjs');
  const args: string[] = [];

  if (options.check) args.push('--check');
  if (options.force) args.push('--force');

  try {
    execSync(`node "${scriptPath}" ${args.join(' ')}`, { stdio: 'inherit' });
  } catch {
    console.error(chalk.red('✖'), 'Update failed.');
    process.exit(1);
  }
}
