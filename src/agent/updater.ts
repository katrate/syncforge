/**
 * SyncForge Agent — Local Update Engine
 *
 * Receives remote events and applies them to the local file system.
 * Also handles bulk project snapshots when joining a project.
 */

import fs from 'fs/promises';
import path from 'path';
import type { FileEvent } from '../protocol/events.js';
import type { ProjectFileEntry } from '../protocol/messages.js';
import { IgnoreParser } from './ignore.js';

export class LocalUpdater {
  private projectDir: string;
  private ignoreParser: IgnoreParser;

  constructor(projectDir: string, ignoreParser: IgnoreParser) {
    this.projectDir = projectDir;
    this.ignoreParser = ignoreParser;
  }

  /**
   * Apply a remote file event to the local file system.
   */
  async applyEvent(event: FileEvent): Promise<void> {
    // Skip ignored files
    if (this.ignoreParser.isIgnored(event.path)) return;

    const fullPath = path.join(this.projectDir, event.path);

    switch (event.changeType) {
      case 'create':
      case 'modify':
        await this.writeFile(fullPath, event.content || '');
        break;

      case 'delete':
        await this.deleteFile(fullPath);
        break;

      case 'rename':
      case 'move':
        if (event.oldPath) {
          const oldFullPath = path.join(this.projectDir, event.oldPath);
          await this.moveFile(oldFullPath, fullPath);
        }
        break;
    }
  }

  /**
   * Apply a batch of events (e.g., when syncing state).
   */
  async applyBatch(events: FileEvent[]): Promise<void> {
    for (const event of events) {
      await this.applyEvent(event);
    }
  }

  /**
   * Apply a full project snapshot (used when joining a project).
   */
  async applySnapshot(files: ProjectFileEntry[]): Promise<void> {
    for (const entry of files) {
      const fullPath = path.join(this.projectDir, entry.path);

      // Skip ignored files
      if (this.ignoreParser.isIgnored(entry.path)) continue;

      // Ensure directory exists
      await fs.mkdir(path.dirname(fullPath), { recursive: true });

      // Write file content (base64 decoded)
      const content = Buffer.from(entry.content, 'base64');
      await fs.writeFile(fullPath, content);
    }
  }

  /**
   * Write (create or modify) a file.
   */
  private async writeFile(fullPath: string, contentBase64: string): Promise<void> {
    try {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      const content = Buffer.from(contentBase64, 'base64');
      await fs.writeFile(fullPath, content);
    } catch (err) {
      console.error(`[SyncForge] Failed to write ${fullPath}:`, (err as Error).message);
    }
  }

  /**
   * Delete a file.
   */
  private async deleteFile(fullPath: string): Promise<void> {
    try {
      await fs.unlink(fullPath);
    } catch (err) {
      // File might not exist — that's OK
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error(`[SyncForge] Failed to delete ${fullPath}:`, (err as Error).message);
      }
    }
  }

  /**
   * Move/rename a file.
   */
  private async moveFile(oldPath: string, newPath: string): Promise<void> {
    try {
      await fs.mkdir(path.dirname(newPath), { recursive: true });
      await fs.rename(oldPath, newPath);
    } catch (err) {
      console.error(`[SyncForge] Failed to move ${oldPath} -> ${newPath}:`, (err as Error).message);
    }
  }
}
