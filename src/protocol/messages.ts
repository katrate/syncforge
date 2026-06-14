/**
 * SyncForge Protocol — WebSocket Messages
 *
 * Defines the message envelope and all message types
 * exchanged between agents and the sync server.
 */

import type { FileEvent } from './events.js';

/* ─── Message Envelope ─── */

export type MessageType =
  | 'auth'
  | 'auth_ok'
  | 'auth_error'
  | 'file_change'
  | 'file_batch'
  | 'ping'
  | 'pong'
  | 'project_snapshot'
  | 'project_sync'
  | 'error'
  | 'presence'
  | 'ack';

export interface Message<T = unknown> {
  type: MessageType;
  payload: T;
  timestamp: string;
}

/* ─── Auth ─── */

export interface AuthPayload {
  token: string;
  projectId: string;
  userId: string;
}

export interface AuthOkPayload {
  userId: string;
  projectId: string;
  sessionId: string;
}

export interface AuthErrorPayload {
  reason: string;
}

/* ─── File Changes ─── */

export interface FileChangePayload {
  event: FileEvent;
}

export interface FileBatchPayload {
  events: FileEvent[];
}

/* ─── Project Sync ─── */

export interface ProjectFileEntry {
  path: string;
  content: string; // base64
  mode?: number;
}

export interface ProjectSnapshotPayload {
  files: ProjectFileEntry[];
  projectId: string;
}

export interface ProjectSyncPayload {
  event: FileEvent;
}

/* ─── Presence ─── */

export interface PresencePayload {
  userId: string;
  action: 'join' | 'leave';
  projectId: string;
}

/* ─── Ack ─── */

export interface AckPayload {
  eventId: string;
  sequence: number;
}

/* ─── Error ─── */

export interface ErrorPayload {
  code: string;
  message: string;
}

/* ─── Heartbeat ─── */

export interface PingPayload {
  sentAt: string;
}

export type PongPayload = PingPayload;

/* ─── Typed message helpers ─── */

export function createMessage<T>(type: MessageType, payload: T): Message<T> {
  return { type, payload, timestamp: new Date().toISOString() };
}
