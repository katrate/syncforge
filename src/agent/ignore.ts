/**
 * SyncForge Agent — Sync Ignore Parser
 *
 * Parses .syncignore and .syncignore.local files to determine
 * which files/directories should be excluded from synchronization.
 *
 * Supports:
 *  - Glob-style patterns (node_modules/, *.log)
 *  - Comment lines (starting with #)
 *  - Empty lines
 *  - Negation patterns (prefixed with !)
 *  - Two files: .syncignore (shared) and .syncignore.local (local-only)
 */

import fs from 'fs/promises';
import path from 'path';
import { minimatch } from 'minimatch';

export class IgnoreParser {
  private patterns: string[] = [];
  private negations: string[] = [];

  constructor(patterns: string[] = []) {
    this.addPatterns(patterns);
  }

  addPatterns(patterns: string[]): void {
    for (const p of patterns) {
      const trimmed = p.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      if (trimmed.startsWith('!')) {
        this.negations.push(trimmed.slice(1).trim());
      } else {
        this.patterns.push(trimmed);
      }
    }
  }

  /**
   * Load patterns from a .syncignore-style file.
   */
  async loadFile(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split(/\r?\n/);
      this.addPatterns(lines);
    } catch {
      // File doesn't exist — that's fine
    }
  }

  /**
   * Check if a given file path (relative to project root) should be ignored.
   */
  isIgnored(relativePath: string): boolean {
    // Normalize to forward slashes
    const normalized = relativePath.replace(/\\/g, '/');

    // Check negations first
    for (const neg of this.negations) {
      if (this.match(normalized, neg)) return false;
    }

    // Check patterns
    for (const pat of this.patterns) {
      if (this.match(normalized, pat)) return true;
    }

    return false;
  }

  /**
   * Match a path against a single pattern.
   */
  private match(filePath: string, pattern: string): boolean {
    // Patterns ending with / should match directories
    const normalizedPattern = pattern.endsWith('/') ? pattern : pattern;

    // Try exact match, glob match, and directory-prefix match
    return (
      minimatch(filePath, normalizedPattern) ||
      minimatch(filePath, pattern) ||
      // If pattern is a directory name, match anything inside it
      filePath.startsWith(pattern.replace(/\/$/, '') + '/')
    );
  }

  /**
   * Get all current patterns (for display/debug).
   */
  getPatterns(): { ignore: string[]; negation: string[] } {
    return { ignore: [...this.patterns], negation: [...this.negations] };
  }
}

/**
 * Convenience factory: loads both .syncignore and .syncignore.local
 * from the project directory.
 */
export async function createIgnoreParser(projectDir: string): Promise<IgnoreParser> {
  const parser = new IgnoreParser();

  // Load shared .syncignore
  await parser.loadFile(path.join(projectDir, '.syncignore'));

  // Load local .syncignore.local (never shared)
  await parser.loadFile(path.join(projectDir, '.syncignore.local'));

  return parser;
}
