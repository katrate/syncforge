/**
 * SyncForge Agent — File Watcher
 *
 * Uses chokidar to monitor project directories for file changes.
 * Detects: create, modify, delete, rename, move operations.
 *
 * The watcher is completely file-type agnostic — every file change
 * is an event, regardless of content.
 */

import * as chokidar from 'chokidar';
import path from 'path';
import * as fs from 'fs/promises';
import { IgnoreParser } from './ignore.js';

export type WatchEventType = 'create' | 'modify' | 'delete' | 'rename';

export interface WatchEvent {
  type: WatchEventType;
  filePath: string; // absolute path
  relativePath: string; // relative to project root
  oldRelativePath?: string; // for rename events
}

export type WatchCallback = (event: WatchEvent) => void;

export class FileWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  private projectDir: string;
  private ignoreParser: IgnoreParser;
  private callback: WatchCallback;
  private debounceMs: number;
  private pendingEvents = new Map<string, NodeJS.Timeout>();

  constructor(
    projectDir: string,
    ignoreParser: IgnoreParser,
    callback: WatchCallback,
    debounceMs: number = 100
  ) {
    this.projectDir = projectDir;
    this.ignoreParser = ignoreParser;
    this.callback = callback;
    this.debounceMs = debounceMs;
  }

  /**
   * Start watching the project directory.
   */
  async start(): Promise<void> {
    // Use chokidar's well-tuned defaults
    this.watcher = chokidar.watch(this.projectDir, {
      ignored: (testPath: string) => {
        // Always ignore the .syncignore and .syncignore.local themselves
        const basename = path.basename(testPath);
        if (basename === '.syncignore' || basename === '.syncignore.local') return false;

        const relative = path.relative(this.projectDir, testPath);
        if (!relative || relative.startsWith('..')) return true;

        // Check against ignore patterns
        return this.ignoreParser.isIgnored(relative);
      },
      persistent: true,
      ignoreInitial: true,
      followSymlinks: false,
      depth: 99,
    });

    this.watcher.on('add', (filePath: string) => {
      this.debounceEvent(filePath, 'create');
    });

    this.watcher.on('change', (filePath: string) => {
      this.debounceEvent(filePath, 'modify');
    });

    this.watcher.on('unlink', (filePath: string) => {
      this.debounceEvent(filePath, 'delete');
    });

    this.watcher.on('rename', (filePath: string, oldPath: string | null) => {
      if (oldPath) {
        // This is a move/rename
        const relative = path.relative(this.projectDir, filePath);
        const oldRelative = path.relative(this.projectDir, oldPath);
        this.emitEvent({
          type: 'rename',
          filePath,
          relativePath: relative,
          oldRelativePath: oldRelative,
        });
      }
    });

    this.watcher.on('error', (error: unknown) => {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[SyncForge Watcher] Error: ${msg}`);
    });
  }

  /**
   * Debounce rapid events (e.g., editor auto-save)
   */
  private debounceEvent(filePath: string, type: WatchEventType): void {
    const key = `${type}:${filePath}`;

    const existing = this.pendingEvents.get(key);
    if (existing) clearTimeout(existing);

    const timeout = setTimeout(() => {
      this.pendingEvents.delete(key);
      const relative = path.relative(this.projectDir, filePath);
      this.emitEvent({ type, filePath, relativePath: relative });
    }, this.debounceMs);

    this.pendingEvents.set(key, timeout);
  }

  /**
   * Emit a watch event to the registered callback.
   */
  private emitEvent(event: WatchEvent): void {
    if (!this.ignoreParser.isIgnored(event.relativePath)) {
      this.callback(event);
    }
  }

  /**
   * Stop watching.
   */
  async stop(): Promise<void> {
    // Clear all pending debounces
    for (const timeout of this.pendingEvents.values()) {
      clearTimeout(timeout);
    }
    this.pendingEvents.clear();

    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }
}
