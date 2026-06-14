/**
 * SyncForge Protocol — Event Types
 *
 * Events represent file system changes detected by agents.
 * They are serialized to JSON and transmitted over WebSocket.
 */

export type ChangeType = 'create' | 'modify' | 'delete' | 'rename' | 'move';

export interface FileEvent {
  /** Unique event ID (server-assigned sequence number) */
  id: string;
  /** Project the event belongs to */
  projectId: string;
  /** Which collaborator originated this event */
  senderId: string;
  /** Type of file change */
  changeType: ChangeType;
  /** Path relative to project root (forward-slash normalized) */
  path: string;
  /** Previous path (for rename/move operations) */
  oldPath?: string;
  /** File content as base64 (for create/modify) */
  content?: string;
  /** File mode / permissions info */
  mode?: number;
  /** Server-assigned sequence number for ordering */
  sequence: number;
  /** ISO-8601 timestamp when the event was generated */
  timestamp: string;
}

export interface BatchFileEvent {
  events: FileEvent[];
  projectId: string;
  senderId: string;
}
