/**
 * SyncForge Configuration
 *
 * Loaded from environment variables with sensible defaults for development.
 */

export interface SyncForgeConfig {
  /* Server */
  serverPort: number;
  serverHost: string;

  /* Agent */
  projectDir: string;
  syncIgnoreFile: string;
  syncIgnoreLocalFile: string;

  /* Auth */
  jwtSecret: string;

  /* WebSocket */
  wsReconnectIntervalMs: number;
  wsMaxReconnectAttempts: number;

  /* File watching */
  watchDebounceMs: number;

  /* Storage */
  storageDir: string;
}

export function loadConfig(overrides?: Partial<SyncForgeConfig>): SyncForgeConfig {
  const config: SyncForgeConfig = {
    serverPort: parseInt(process.env.SYNCFORGE_PORT || '4200', 10),
    serverHost: process.env.SYNCFORGE_HOST || '0.0.0.0',
    projectDir: process.env.SYNCFORGE_PROJECT_DIR || process.cwd(),
    syncIgnoreFile: process.env.SYNCFORGE_IGNORE_FILE || '.syncignore',
    syncIgnoreLocalFile: process.env.SYNCFORGE_IGNORE_LOCAL_FILE || '.syncignore.local',
    jwtSecret: process.env.SYNCFORGE_JWT_SECRET || 'syncforge-dev-secret-change-in-production',
    wsReconnectIntervalMs: parseInt(process.env.SYNCFORGE_WS_RECONNECT_MS || '2000', 10),
    wsMaxReconnectAttempts: parseInt(process.env.SYNCFORGE_WS_MAX_RECONNECT || '10', 10),
    watchDebounceMs: parseInt(process.env.SYNCFORGE_WATCH_DEBOUNCE_MS || '100', 10),
    storageDir: process.env.SYNCFORGE_STORAGE_DIR || './syncforge_data',
  };

  if (overrides) {
    Object.assign(config, overrides);
  }

  return config;
}
