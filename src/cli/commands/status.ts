/**
 * syncforge status — Show synchronization status
 *
 * Usage: syncforge status
 */

import { loadConfig } from '../../config/index.js';
import { readConfig } from '../config-store.js';
import chalk from 'chalk';

export async function statusCommand(): Promise<void> {
  const config = loadConfig();
  const agentConfig = readConfig();

  if (!agentConfig) {
    console.log(chalk.yellow('◇'), 'Not connected to any project.');
    console.log();
    console.log(chalk.dim('Run'), chalk.bold('syncforge init'), chalk.dim('to create a project, or'));
    console.log(chalk.dim('Run'), chalk.bold('syncforge join <project-id>'), chalk.dim('to join one.'));
    return;
  }

  console.log(chalk.bold('\n  SyncForge Status\n'));
  console.log(`  ${chalk.bold('Project:')}   ${chalk.cyan(agentConfig.projectId)}`);
  console.log(`  ${chalk.bold('User:')}      ${chalk.yellow(agentConfig.userId)}`);
  console.log(`  ${chalk.bold('Server:')}    ${chalk.dim(agentConfig.serverUrl)}`);
  console.log(`  ${chalk.bold('Directory:')} ${chalk.dim(agentConfig.projectDir)}`);
  console.log();

  const apiBase = process.env.SYNCFORGE_API_URL || `http://localhost:${config.serverPort}`;

  try {
    const response = await fetch(`${apiBase}/api/projects/${agentConfig.projectId}`);
    if (response.ok) {
      const project = await response.json() as { name: string; createdAt: string; members: { userId: string; displayName: string }[] };
      console.log(`  ${chalk.bold('Name:')}      ${project.name}`);
      console.log(`  ${chalk.bold('Members:')}   ${project.members.length}`);
      for (const m of project.members) {
        console.log(`               ${chalk.green('●')} ${m.displayName}`);
      }
      console.log(`  ${chalk.bold('Created:')}   ${chalk.dim(new Date(project.createdAt).toLocaleString())}`);
    } else {
      console.log(`  ${chalk.yellow('⚠')} Server unreachable — showing local config only`);
    }
  } catch {
    console.log(`  ${chalk.yellow('⚠')} Server unreachable — showing local config only`);
  }

  console.log();
}
