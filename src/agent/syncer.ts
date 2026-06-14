/**
 * SyncForge Agent — Sync Client
 *
 * Manages the WebSocket connection to the sync server.
 * Handles authentication, reconnection, event sending, and event reception.
 */

import WebSocket from 'ws';
import { createMessage, type Message, type AuthOkPayload, type FileChangePayload, type PresencePayload } from '../protocol/messages.js';
import type { FileEvent } from '../protocol/events.js';
import type { SyncForgeConfig } from '../config/index.js';

export type SyncStatus = 'disconnected' | 'connecting' | 'authenticating' | 'connected' | 'error';

export interface SyncCallbacks {
  onStatusChange: (status: SyncStatus) => void;
  onRemoteChange: (event: FileEvent) => void;
  onPresence: (payload: PresencePayload) => void;
  onError: (code: string, message: string) => void;
}

export class SyncClient {
  private ws: WebSocket | null = null;
  private config: SyncForgeConfig;
  private serverUrl: string;
  private projectId: string;
  private userId: string;
  private sessionToken: string;
  private callbacks: SyncCallbacks;
  private reconnectAttempt = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private _status: SyncStatus = 'disconnected';
  private intentionalClose = false;

  constructor(
    serverUrl: string,
    projectId: string,
    userId: string,
    sessionToken: string,
    config: SyncForgeConfig,
    callbacks: SyncCallbacks
  ) {
    this.serverUrl = serverUrl;
    this.projectId = projectId;
    this.userId = userId;
    this.sessionToken = sessionToken;
    this.config = config;
    this.callbacks = callbacks;
  }

  get status(): SyncStatus {
    return this._status;
  }

  private setStatus(status: SyncStatus): void {
    this._status = status;
    this.callbacks.onStatusChange(status);
  }

  /**
   * Connect to the sync server.
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.intentionalClose = false;
    this.setStatus('connecting');

    try {
      this.ws = new WebSocket(this.serverUrl);

      this.ws.on('open', () => {
        this.reconnectAttempt = 0;
        this.setStatus('authenticating');

        // Send auth message
        const authMsg = createMessage('auth', {
          token: this.sessionToken,
          projectId: this.projectId,
          userId: this.userId,
        });
        this.ws!.send(JSON.stringify(authMsg));
      });

      this.ws.on('message', (data: Buffer) => {
        try {
          const message: Message = JSON.parse(data.toString());

          switch (message.type) {
            case 'auth_ok':
              this.setStatus('connected');
              this.startHeartbeat();
              break;

            case 'auth_error':
              this.setStatus('error');
              this.callbacks.onError('AUTH_ERROR', (message.payload as { reason: string }).reason);
              break;

            case 'file_change':
              this.handleRemoteChange(message.payload as FileChangePayload);
              break;

            case 'presence':
              this.callbacks.onPresence(message.payload as PresencePayload);
              break;

            case 'pong':
              // Heartbeat response received
              break;

            case 'error':
              this.callbacks.onError(
                (message.payload as { code: string }).code,
                (message.payload as { message: string }).message
              );
              break;
          }
        } catch {
          // Invalid message — ignore
        }
      });

      this.ws.on('close', () => {
        this.stopHeartbeat();
        if (!this.intentionalClose) {
          this.setStatus('disconnected');
          this.scheduleReconnect();
        }
      });

      this.ws.on('error', () => {
        // 'close' event will follow
      });
    } catch {
      this.setStatus('error');
      this.scheduleReconnect();
    }
  }

  /**
   * Send a file change event to the server.
   */
  sendFileEvent(event: Omit<FileEvent, 'id' | 'sequence' | 'timestamp'>): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.warn('[SyncForge] Cannot send event — not connected');
      return;
    }

    const fileChange: FileChangePayload = {
      event: {
        ...event,
        id: `${this.userId}-${Date.now()}`,
        sequence: 0,
        timestamp: new Date().toISOString(),
      } as FileEvent,
    };

    const msg = createMessage('file_change', fileChange);
    this.ws.send(JSON.stringify(msg));
  }

  /**
   * Handle a remote file change received from the server.
   */
  private handleRemoteChange(payload: FileChangePayload): void {
    const event = payload.event;
    if (event.senderId === this.userId) return; // skip own events
    this.callbacks.onRemoteChange(event);
  }

  /**
   * Disconnect from the sync server.
   */
  disconnect(): void {
    this.intentionalClose = true;
    this.stopHeartbeat();
    this.clearReconnect();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setStatus('disconnected');
  }

  /**
   * Start heartbeat pings.
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(createMessage('ping', { sentAt: new Date().toISOString() })));
      }
    }, 25000);
  }

  /**
   * Stop heartbeat pings.
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Schedule reconnection with exponential backoff.
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempt >= this.config.wsMaxReconnectAttempts) {
      this.setStatus('error');
      this.callbacks.onError('MAX_RECONNECT', 'Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(
      this.config.wsReconnectIntervalMs * Math.pow(2, this.reconnectAttempt),
      30000
    );

    this.reconnectAttempt++;
    this.clearReconnect();

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Clear reconnection timer.
   */
  private clearReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
