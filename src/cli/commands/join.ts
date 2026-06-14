/**
 * syncforge join — Join a project
 *
 * Usage: syncforge join <project-id> [--token <invite-token>]
 *        syncforge join <invite-token>
 *
 * Joins a project by downloading initial state and
 * preparing the local agent for synchronization.
 */

import { loadConfig } from '../../config/index.js';
import { v4 as uuid } from 'uuid';
import { saveConfig, type AgentConfig, readConfig } from '../config-store.js';
import chalk from 'chalk';
import os from 'os';

const API_BASE = process.env.SYNCFORGE_API_URL || 'http://localhost:4200';

interface JoinOptions {
  token?: string;
}

export async function joinCommand(projectIdOrToken: string, options: JoinOptions): Promise<void> {
  const config = loadConfig();
  const userId = uuid().slice(0, 8);

  // Determine if the argument is a project ID or an invite token
  const inviteToken = options.token || projectIdOrToken;
  const isToken = projectIdOrToken.length > 12; // Tokens are longer than short IDs

  console.log(chalk.blue('◇'), 'Joining project...');

  try {
    const response = await fetch(`${API_BASE}/api/projects/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inviteToken: isToken ? projectIdOrToken : inviteToken,
        userId,
        userName: process.env.USER || os.userInfo().username,
      }),
    });

    if (!response.ok) {
      const err: any = await response.json();
      console.error(chalk.red('✖'), `Failed to join: ${err.error}`);
      process.exit(1);
    }

    const data = await response.json() as {
      projectId: string;
      name: string;
      ownerId: string;
      sessionToken: string;
    };

    // Save local agent config
    const existing = readConfig();
    const agentConfig: AgentConfig = {
      projectId: data.projectId,
      userId,
      sessionToken: data.sessionToken,
      serverUrl: API_BASE.replace('http', 'ws') + '/ws',
      projectDir: existing?.projectDir || config.projectDir,
    };
    await saveConfig(agentConfig);

    console.log(chalk.green('✔'), `Joined project "${chalk.bold(data.name)}"`);
    console.log();
    console.log(`  ${chalk.bold('Project:')}  ${chalk.cyan(data.projectId)}`);
    console.log(`  ${chalk.bold('Owner:')}   ${chalk.dim(data.ownerId)}`);
    console.log();
    console.log(chalk.dim('To start syncing:'));
    console.log(`  ${chalk.bold('syncforge start')}`);
  } catch (err) {
    let message: string;
    if (err instanceof Error) {
      message = err.message;
    } else {
      message = String(err);
    }
    console.error(chalk.red('✖'), `Connection failed: ${message}`);
    process.exit(1);
  }
}


