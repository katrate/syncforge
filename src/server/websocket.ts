/**
 * SyncForge Server — WebSocket Handler
 *
 * Manages WebSocket connections, authentication, and event routing.
 * Tracks file state per project to support initial snapshot sync.
 */

import { WebSocketServer, type WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import { RoomManager } from './room.js';
import { Auth } from './auth.js';
import {
  type Message,
  type MessageType,
  type AuthPayload,
  type AuthOkPayload,
  type FileChangePayload,
  type PingPayload,
  type ProjectSnapshotPayload,
  type ProjectFileEntry,
  createMessage,
} from '../protocol/messages.js';

export class SyncWebSocketServer {
  private wss: WebSocketServer;
  private roomManager: RoomManager;
  private auth: Auth;
  /** In-memory file store per project: projectId -> (filePath -> ProjectFileEntry) */
  private projectFiles: Map<string, Map<string, ProjectFileEntry>> = new Map();

  constructor(wss: WebSocketServer, roomManager: RoomManager, auth: Auth) {
    this.wss = wss;
    this.roomManager = roomManager;
    this.auth = auth;

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      this.handleConnection(ws, req);
    });
  }

  private handleConnection(ws: WebSocket, _req: IncomingMessage): void {
    let authenticated = false;
    let userId: string | null = null;
    let projectId: string | null = null;
    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

    // Start heartbeat
    heartbeatInterval = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.ping();
      }
    }, 30000);

    // Define auth handler as a local function
    const handleAuth = (ws: WebSocket, payload: AuthPayload) => {
      const token = this.auth.verifyToken(payload.token);
      if (!token) {
        ws.send(JSON.stringify(createMessage('auth_error', { reason: 'Invalid or expired token' })));
        return;
      }

      userId = token.userId;
      projectId = payload.projectId;

      // Verify project exists
      if (!projectId || !this.roomManager.roomExists(projectId)) {
        ws.send(JSON.stringify(createMessage('auth_error', { reason: 'Project not found' })));
        return;
      }

      authenticated = true;

      this.roomManager.addMember(projectId, {
        ws,
        userId,
        displayName: token.displayName,
        joinedAt: new Date().toISOString(),
      });

      ws.send(JSON.stringify(createMessage<AuthOkPayload>('auth_ok', {
        userId,
        projectId,
        sessionId: `${userId}-${projectId}`,
      })));

      // Send project snapshot to the newly joined user
      const files = this.projectFiles.get(projectId);
      if (files && files.size > 0) {
        const snapshotFiles = Array.from(files.values());
        ws.send(JSON.stringify(createMessage<ProjectSnapshotPayload>('project_snapshot', {
          files: snapshotFiles,
          projectId,
        })));
      }
    };

    // Define file change handler as a local function
    const handleFileChange = (ws: WebSocket, payload: FileChangePayload, pid: string, uid: string) => {
      const event = payload.event;
      event.senderId = uid;
      event.projectId = pid;
      this.roomManager.broadcastFileEvent(pid, event, uid);

      // Track file state for snapshot sync
      let eventFiles = this.projectFiles.get(pid);
      if (!eventFiles) {
        eventFiles = new Map();
        this.projectFiles.set(pid, eventFiles);
      }

      switch (event.changeType) {
        case 'create':
        case 'modify':
          eventFiles.set(event.path, {
            path: event.path,
            content: event.content || '',
            mode: event.mode,
          });
          break;
        case 'delete':
          eventFiles.delete(event.path);
          break;
        case 'rename':
        case 'move':
          if (event.oldPath) {
            const old = eventFiles.get(event.oldPath);
            eventFiles.delete(event.oldPath);
            if (old) {
              eventFiles.set(event.path, {
                ...old,
                path: event.path,
                content: event.content || old.content,
              });
            }
          }
          break;
      }
    };

    ws.on('message', (data: Buffer) => {
      try {
        const raw = data.toString();
        const message: Message = JSON.parse(raw);

        switch (message.type as MessageType) {
          case 'auth':
            if (authenticated) {
              ws.send(JSON.stringify(createMessage('auth_error', { reason: 'Already authenticated' })));
              return;
            }
            handleAuth(ws, message.payload as AuthPayload);
            break;

          case 'file_change':
            if (!authenticated || !projectId || !userId) {
              ws.send(JSON.stringify(createMessage('error', { code: 'UNAUTHORIZED', message: 'Not authenticated' })));
              return;
            }
            handleFileChange(ws, message.payload as FileChangePayload, projectId, userId);
            break;

          case 'ping':
            ws.send(JSON.stringify(createMessage('pong', { sentAt: (message.payload as PingPayload).sentAt })));
            break;

          default:
            ws.send(JSON.stringify(createMessage('error', {
              code: 'UNKNOWN_TYPE',
              message: `Unknown message type: ${message.type}`,
            })));
            break;
        }
      } catch {
        ws.send(JSON.stringify(createMessage('error', {
          code: 'PARSE_ERROR',
          message: 'Invalid JSON message',
        })));
      }
    });

    ws.on('close', () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (projectId && userId) {
        this.roomManager.removeMember(projectId, userId);
        // Clean up file state when room is fully vacated
        if (!this.roomManager.roomExists(projectId)) {
          this.projectFiles.delete(projectId);
        }
      }
    });

    ws.on('error', () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (projectId && userId) {
        this.roomManager.removeMember(projectId, userId);
        // Clean up file state when room is fully vacated
        if (!this.roomManager.roomExists(projectId)) {
          this.projectFiles.delete(projectId);
        }
      }
    });
  }
}
