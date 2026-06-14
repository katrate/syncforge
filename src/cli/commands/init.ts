/**
 * syncforge init — Create a new project
 *
 * Usage: syncforge init [--name <project-name>]
 *
 * Creates a project on the sync server and returns
 * a project ID and invite token.
 */

import { loadConfig } from '../../config/index.js';
import { v4 as uuid } from 'uuid';
import { readConfig, saveConfig, type AgentConfig } from '../config-store.js';
import chalk from 'chalk';
import path from 'path';
import os from 'os';

const API_BASE = process.env.SYNCFORGE_API_URL || 'http://localhost:4200';

interface InitOptions {
  name?: string;
}

export async function initCommand(options: InitOptions): Promise<void> {
  const config = loadConfig();
  const projectName = options.name || path.basename(config.projectDir);
  const userId = uuid().slice(0, 8);

  console.log(chalk.blue('◇'), 'Creating project...');

  try {
    const response = await fetch(`${API_BASE}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: projectName,
        ownerId: userId,
        ownerName: process.env.USER || os.userInfo().username,
      }),
    });

    if (!response.ok) {
      const err: any = await response.json();
      console.error(chalk.red('✖'), `Failed to create project: ${err.error}`);
      process.exit(1);
    }

    const data = await response.json() as {
      projectId: string;
      name: string;
      sessionToken: string;
      inviteToken: string;
    };

    // Save local agent config
    const agentConfig: AgentConfig = {
      projectId: data.projectId,
      userId,
      sessionToken: data.sessionToken,
      serverUrl: API_BASE.replace('http', 'ws') + '/ws',
      projectDir: config.projectDir,
    };
    await saveConfig(agentConfig);

    console.log(chalk.green('✔'), `Project "${data.name}" created!`);
    console.log();
    console.log(`  ${chalk.bold('Project ID:')}  ${chalk.cyan(data.projectId)}`);
    console.log(`  ${chalk.bold('Invite Token:')} ${chalk.yellow(data.inviteToken)}`);
    console.log();
    console.log(chalk.dim('Share the invite token with collaborators:'));
    console.log(`  ${chalk.bold('syncforge share')}  — to copy the invite link`);
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
    console.log(chalk.dim('Start the server with: syncforge start --server'));
    process.exit(1);
  }
}


