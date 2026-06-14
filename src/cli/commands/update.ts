/**
 * syncforge update — Update SyncForge to the latest version
 *
 * Usage: syncforge update          # Check and update
 *        syncforge update --check  # Only check
 *
 * Delegates to scripts/update.mjs for the actual update logic.
 * Interactive confirmation is handled here (where stdin works in cmd.exe).
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createInterface } from 'readline';
import chalk from 'chalk';

export async function updateCommand(options: { check?: boolean; force?: boolean }): Promise<void> {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const scriptPath = resolve(__dirname, '..', '..', '..', 'scripts', 'update.mjs');

  // First check what version is available (--check mode)
  try {
    execSync(`node "${scriptPath}" --check`, { stdio: 'inherit' });
  } catch {
    // --check already printed the error
    process.exit(1);
  }

  // If only checking, we're done
  if (options.check) {
    return;
  }

  // Confirm with the user (prompt works here — not in nested execSync)
  if (!options.force && process.stdin.isTTY) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise<string>((resolve) => {
      rl.question(chalk.yellow('?') + ' Apply update? [Y/n] ', (ans) => {
        resolve(ans.toLowerCase());
      });
    });
    rl.close();

    if (answer !== 'y' && answer !== '') {
      console.log('  Update cancelled.');
      return;
    }
  }

  // Run the update (no prompt inside the script — we pass --force)
  try {
    execSync(`node "${scriptPath}" --force`, { stdio: 'inherit' });
  } catch {
    console.error(chalk.red('✖'), 'Update failed.');
    process.exit(1);
  }
}
