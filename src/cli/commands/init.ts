/**
 * syncforge init — Create a new project
 *
 * Usage: syncforge init [--name <project-name>]
 *
 * Creates a project on the sync server and returns
 * a project ID and invite token. Auto-starts the server
 * if it's not already running.
 */

import { loadConfig } from '../../config/index.js';
import { v4 as uuid } from 'uuid';
import { saveConfig, type AgentConfig } from '../config-store.js';
import { startCommand } from './start.js';
import { SyncForgeServer } from '../../server/app.js';
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

  // Check if the sync server is already running (quick 2s timeout)
  console.log(chalk.blue('◇'), 'Checking sync server...');
  let serverRunning = false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const healthRes = await fetch(`${API_BASE}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    serverRunning = healthRes.ok;
  } catch {
    serverRunning = false;
  }

  if (!serverRunning) {
    console.log(chalk.blue('◇'), 'Starting sync server...');
    await new SyncForgeServer(config).start();
    console.log(chalk.green('✔'), 'Server started');
  } else {
    console.log(chalk.green('✔'), 'Server is running');
  }

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
    // Try to auto-detect local IP for the invite message
    let localIp = 'YOUR_IP';
    try {
      const nets = os.networkInterfaces();
      for (const name of Object.keys(nets)) {
        for (const net of nets[name] || []) {
          if (net.family === 'IPv4' && !net.internal) {
            localIp = net.address;
            break;
          }
        }
        if (localIp !== 'YOUR_IP') break;
      }
    } catch {}

    console.log(chalk.dim('Tell your partner to run this:'));
    console.log(`  ${chalk.bold(`syncforge join ${data.projectId} --server http://${localIp}:4200`)}`);
    console.log();
    console.log(chalk.dim('Starting sync...'));

    // Auto-start syncing
    await startCommand({});


  } catch (err) {
    let message: string;
    if (err instanceof Error) {
      message = err.message;
    } else {
      message = String(err);
    }
    console.error(chalk.red('✖'), `Failed: ${message}`);
    process.exit(1);
  }
}
