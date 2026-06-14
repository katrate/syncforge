/**
 * SyncForge CLI — Local Config Store
 *
 * Persists agent configuration (project ID, tokens, etc.)
 * to a local JSON file so the user doesn't need to re-authenticate.
 */

import fs from 'fs';
import path from 'path';

export interface AgentConfig {
  projectId: string;
  userId: string;
  sessionToken: string;
  serverUrl: string;
  projectDir: string;
}

function configPath(): string {
  const home = process.env.HOME || process.env.USERPROFILE || '.';
  return path.join(home, '.syncforge.json');
}

/**
 * Save agent configuration to disk.
 */
export function saveConfig(config: AgentConfig): void {
  const filePath = configPath();
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Read agent configuration from disk.
 */
export function readConfig(): AgentConfig | null {
  try {
    const filePath = configPath();
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as AgentConfig;
  } catch {
    return null;
  }
}

/**
 * Clear agent configuration from disk.
 */
export function clearConfig(): void {
  try {
    const filePath = configPath();
    fs.unlinkSync(filePath);
  } catch {
    // File doesn't exist — that's fine
  }
}
