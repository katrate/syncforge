/**
 * SyncForge Server — WebSocket Handler
 *
 * Manages WebSocket connections, authentication, and event routing.
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
  createMessage,
} from '../protocol/messages.js';

export class SyncWebSocketServer {
  private wss: WebSocketServer;
  private roomManager: RoomManager;
  private auth: Auth;

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
    };

    // Define file change handler as a local function
    const handleFileChange = (ws: WebSocket, payload: FileChangePayload, pid: string, uid: string) => {
      const event = payload.event;
      event.senderId = uid;
      event.projectId = pid;
      this.roomManager.broadcastFileEvent(pid, event, uid);
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
            ws.send(JSON.stringify(createMessage('error', { code: 'UNKNOWN_TYPE', message: `Unknown message type: ${message.type}` })));
        }
      } catch (err) {
        ws.send(JSON.stringify(createMessage('error', { code: 'PARSE_ERROR', message: 'Failed to parse message' })));
      }
    });

    ws.on('close', () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (projectId && userId) {
        this.roomManager.removeMember(projectId, userId);
      }
    });

    ws.on('error', () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (projectId && userId) {
        this.roomManager.removeMember(projectId, userId);
      }
    });
  }
}
