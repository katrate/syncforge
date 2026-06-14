/**
 * syncforge uninstall — Remove SyncForge from the system
 *
 * Usage: syncforge uninstall          # Interactive
 *        syncforge uninstall --force  # Non-interactive
 *        syncforge uninstall --check  # Preview only
 *
 * Delegates to scripts/uninstall.mjs for the actual removal logic.
 * Interactive confirmation is handled here (where stdin works in cmd.exe).
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createInterface } from 'readline';
import chalk from 'chalk';

export async function uninstallCommand(options: { check?: boolean; force?: boolean }): Promise<void> {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const scriptPath = resolve(__dirname, '..', '..', '..', 'scripts', 'uninstall.mjs');

  // Preview mode — just show what would be removed
  if (options.check) {
    execSync(`node "${scriptPath}" --check`, { stdio: 'inherit' });
    return;
  }

  // Confirm with the user (prompt works here — not in nested execSync)
  if (!options.force && process.stdin.isTTY) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise<string>((resolve) => {
      rl.question(`\n${chalk.yellow('?')} Remove all SyncForge files? This cannot be undone. [y/N] `, (ans) => {
        resolve(ans.toLowerCase());
      });
    });
    rl.close();

    if (answer !== 'y') {
      console.log('  Uninstall cancelled.');
      return;
    }
  }

  // Run the uninstall (no prompt inside the script)
  try {
    execSync(`node "${scriptPath}" --force`, { stdio: 'inherit' });
  } catch {
    console.error(chalk.red('✖'), 'Uninstall failed.');
    process.exit(1);
  }
}
