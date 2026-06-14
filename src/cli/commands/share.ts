/**
 * syncforge share — Generate an invite link
 *
 * Usage: syncforge share
 *
 * Displays the invite token/link that collaborators
 * can use to join the project.
 */

import { loadConfig } from '../../config/index.js';
import { readConfig } from '../config-store.js';
import chalk from 'chalk';
import os from 'os';

export async function shareCommand(): Promise<void> {
  const agentConfig = readConfig();

  if (!agentConfig) {
    console.error(chalk.red('✖'), 'No project found. Run', chalk.bold('syncforge init'), 'first.');
    process.exit(1);
  }

  const config = loadConfig();
  const apiBase = process.env.SYNCFORGE_API_URL || `http://localhost:${config.serverPort}`;

  console.log(chalk.blue('◇'), 'Fetching project info...');

  try {
    const response = await fetch(`${apiBase}/api/projects/${agentConfig.projectId}`);
    if (!response.ok) {
      console.error(chalk.red('✖'), 'Project not found on server.');
      process.exit(1);
    }

    const project = await response.json() as { id: string; name: string; members: { userId: string; displayName: string }[] };

    console.log(chalk.green('✔'), `Project: ${chalk.bold(project.name)}`);
    console.log();
    // Auto-detect local IP
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

    console.log(`  ${chalk.bold('Invite your partner:')}`);
    console.log(`  ${chalk.yellow(`syncforge join ${project.id} --server http://${localIp}:4200`)}`);
    console.log(`  ${chalk.dim('Run the above command on their machine')}`);
    console.log();
    console.log(chalk.dim('Members:'));
    if (project.members.length === 0) {
      console.log(chalk.dim('  (No other members yet)'));
    } else {
      for (const member of project.members) {
        console.log(`  ${chalk.green('●')} ${member.displayName} (${member.userId})`);
      }
    }
  } catch {
    console.error(chalk.red('✖'), 'Could not connect to server. Is it running?');
    process.exit(1);
  }
}
