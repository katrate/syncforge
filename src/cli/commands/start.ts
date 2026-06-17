/**
 * syncforge start — Start file synchronization
 *
 * Usage: syncforge start
 *        syncforge start --server   (also start the server)
 *
 * Begins watching the project directory and connects
 * to the sync server for real-time collaboration.
 */

import { loadConfig } from '../../config/index.js';
import { readConfig } from '../config-store.js';
import { FileWatcher } from '../../agent/watcher.js';
import { SyncClient } from '../../agent/syncer.js';
import { LocalUpdater } from '../../agent/updater.js';
import { IgnoreParser, createIgnoreParser } from '../../agent/ignore.js';
import { SyncForgeServer } from '../../server/app.js';
import type { FileEvent } from '../../protocol/events.js';
import type { PresencePayload, ProjectSnapshotPayload } from '../../protocol/messages.js';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';

interface StartOptions {
  server?: boolean;
}

export async function startCommand(options: StartOptions): Promise<void> {
  const config = loadConfig();
  const agentConfig = readConfig();

  if (!agentConfig) {
    console.error(chalk.red('✖'), 'No project found. Run', chalk.bold('syncforge init'), 'or', chalk.bold('syncforge join'), 'first.');
    process.exit(1);
  }

  // Start server if requested
  let server: SyncForgeServer | undefined;
  if (options.server) {
    const spinner = ora('Starting sync server...').start();
    server = new SyncForgeServer(config);
    await server.start();
    spinner.succeed('Sync server started');
  }

  // Load ignore patterns
  const ignoreParser = await createIgnoreParser(config.projectDir);
  let spinner = ora('Initializing sync agent...').start();

  // Set up the local updater
  const updater = new LocalUpdater(agentConfig.projectDir, ignoreParser);

  // Set up the sync client
  const syncClient = new SyncClient(
    agentConfig.serverUrl,
    agentConfig.projectId,
    agentConfig.userId,
    agentConfig.sessionToken,
    config,
    {
      onStatusChange: (status) => {
        spinner.text = `Sync status: ${status}`;
        if (status === 'connected') {
          spinner.succeed(chalk.green('Connected to sync server'));
        } else if (status === 'error') {
          spinner.fail(chalk.red('Connection error'));
        }
      },
      onRemoteChange: async (event: FileEvent) => {
        await updater.applyEvent(event);
        const action = event.changeType === 'delete' ? 'deleted' :
                       event.changeType === 'create' ? 'created' :
                       event.changeType === 'rename' ? 'renamed' : 'modified';
        console.log(chalk.dim(`  ${chalk.cyan('↻')} ${event.path} ${action} by ${event.senderId}`));
      },
      onPresence: (payload: PresencePayload) => {
        const action = payload.action === 'join' ? 'joined' : 'left';
        console.log(chalk.dim(`  ${chalk.magenta('●')} ${payload.userId} ${action} the project`));
      },
      onSnapshot: async (payload: ProjectSnapshotPayload) => {
        spinner = ora(`Receiving project snapshot (${payload.files.length} files)...`).start();
        try {
          await updater.applySnapshot(payload.files);
          spinner.succeed(chalk.green(`Project snapshot applied — ${payload.files.length} files synced`));
        } catch (err) {
          spinner.fail(chalk.red('Failed to apply project snapshot'));
          const message = err instanceof Error ? err.message : String(err);
          console.error(chalk.red('  ✖'), message);
        }
      },
      onError: (code, message) => {
        console.error(chalk.red('  ✖'), `[${code}] ${message}`);
      },
    }
  );

  // Set up the file watcher
  const watcher = new FileWatcher(
    agentConfig.projectDir,
    ignoreParser,
    (watchEvent) => {
      // Read file content for create/modify events
      const sendEvent = async () => {
        let content: string | undefined;

        if (watchEvent.type === 'create' || watchEvent.type === 'modify') {
          try {
            const fileContent = await fs.readFile(watchEvent.filePath);
            content = fileContent.toString('base64');
          } catch {
            // File might have been deleted in the meantime
            return;
          }
        }

        const changeType = watchEvent.type === 'rename' ? 'rename' :
                           watchEvent.type as FileEvent['changeType'];

        syncClient.sendFileEvent({
          projectId: agentConfig.projectId,
          senderId: agentConfig.userId,
          changeType,
          path: watchEvent.relativePath,
          oldPath: watchEvent.oldRelativePath,
          content,
        });

        const action = changeType === 'delete' ? 'deleted' :
                       changeType === 'create' ? 'created' :
                       changeType === 'rename' ? 'renamed' : 'modified';
        console.log(chalk.dim(`  ${chalk.green('→')} ${watchEvent.relativePath} ${action}`));
      };

      sendEvent().catch(err => {
        console.error(chalk.red('  ✖'), `Failed to process ${watchEvent.relativePath}:`, err);
      });
    },
    config.watchDebounceMs
  );

  spinner.text = 'Starting file watcher...';
  await watcher.start();
  spinner.succeed(chalk.green('File watcher started'));

  // Connect to sync server
  console.log(chalk.blue('◇'), 'Connecting to sync server...');
  syncClient.connect();

  console.log();
  console.log(chalk.green('✔'), 'SyncForge is running!');
  console.log(`  ${chalk.dim('Project:')}  ${chalk.cyan(agentConfig.projectId)}`);
  console.log(`  ${chalk.dim('User:')}     ${chalk.yellow(agentConfig.userId)}`);
  console.log(`  ${chalk.dim('Server:')}   ${chalk.dim(agentConfig.serverUrl)}`);
  console.log();
  console.log(chalk.dim('Watching for file changes... (Ctrl+C to stop)'));

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log();
    console.log(chalk.blue('◇'), 'Shutting down...');
    syncClient.disconnect();
    await watcher.stop();
    if (server) await server.stop();
    console.log(chalk.green('✔'), 'SyncForge stopped');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Keep the process alive
  await new Promise(() => {});
}
