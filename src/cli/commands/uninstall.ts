/**
 * syncforge uninstall — Remove SyncForge from the system
 *
 * Usage: syncforge uninstall          # Interactive
 *        syncforge uninstall --force  # Non-interactive
 *        syncforge uninstall --check  # Preview only
 *
 * Delegates to scripts/uninstall.mjs.
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import chalk from 'chalk';

export async function uninstallCommand(options: { check?: boolean; force?: boolean }): Promise<void> {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const scriptPath = resolve(__dirname, '..', '..', '..', 'scripts', 'uninstall.mjs');
  const args: string[] = [];

  if (options.check) args.push('--check');
  if (options.force) args.push('--force');

  try {
    execSync(`node "${scriptPath}" ${args.join(' ')}`, { stdio: 'inherit' });
  } catch {
    console.error(chalk.red('✖'), 'Uninstall failed.');
    process.exit(1);
  }
}
