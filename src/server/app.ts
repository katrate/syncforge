/**
 * SyncForge Server — Express Application
 *
 * HTTP API for project management (init, join, share)
 * + WebSocket server for real-time sync.
 */

import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import type { SyncForgeConfig } from '../config/index.js';
import { RoomManager } from './room.js';
import { Auth } from './auth.js';
import { SyncWebSocketServer } from './websocket.js';

export interface ProjectRecord {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  inviteToken?: string;
}

export class SyncForgeServer {
  private app: express.Application;
  private server: http.Server;
  private wss: WebSocketServer;
  private roomManager: RoomManager;
  private auth: Auth;
  private config: SyncForgeConfig;
  /** In-memory project store (MVP — replace with Postgres later) */
  private projects: Map<string, ProjectRecord> = new Map();
  /** Quick lookup by owner */
  private ownerProjects: Map<string, string[]> = new Map();

  constructor(config: SyncForgeConfig) {
    this.config = config;
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    this.roomManager = new RoomManager();
    this.auth = new Auth(config.jwtSecret);

    this.setupMiddleware();
    this.setupRoutes();
    new SyncWebSocketServer(this.wss, this.roomManager, this.auth);
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json({ limit: '50mb' }));
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (_req, res) => {
      res.json({ status: 'ok', uptime: process.uptime() });
    });

    // Initialize a new project
    this.app.post('/api/projects', (req, res) => {
      const { name, ownerId, ownerName } = req.body;

      if (!name || !ownerId) {
        res.status(400).json({ error: 'name and ownerId are required' });
        return;
      }

      const projectId = generateId();
      const record: ProjectRecord = {
        id: projectId,
        name,
        ownerId,
        createdAt: new Date().toISOString(),
      };

      this.projects.set(projectId, record);
      this.roomManager.createRoom(projectId, name, ownerId);

      // Track owner's projects
      const existing = this.ownerProjects.get(ownerId) || [];
      existing.push(projectId);
      this.ownerProjects.set(ownerId, existing);

      // Create session + invite tokens
      const sessionToken = this.auth.createSessionToken(ownerId, ownerName || ownerId, projectId);
      const inviteToken = this.auth.createInviteToken(projectId, ownerId);
      record.inviteToken = inviteToken;

      res.status(201).json({
        projectId,
        name,
        sessionToken,
        inviteToken,
      });
    });

    // Validate invite and get project info
    this.app.post('/api/projects/join', (req, res) => {
      const { inviteToken, userId, userName } = req.body;

      if (!inviteToken || !userId) {
        res.status(400).json({ error: 'inviteToken and userId are required' });
        return;
      }

      const info = this.auth.validateInviteToken(inviteToken);
      if (!info) {
        res.status(401).json({ error: 'Invalid or expired invite token' });
        return;
      }

      const project = this.projects.get(info.projectId);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      const sessionToken = this.auth.createSessionToken(userId, userName || userId, project.id);

      res.json({
        projectId: project.id,
        name: project.name,
        ownerId: project.ownerId,
        sessionToken,
      });
    });

    // Get project info
    this.app.get('/api/projects/:id', (req, res) => {
      const project = this.projects.get(req.params.id);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      res.json({
        id: project.id,
        name: project.name,
        ownerId: project.ownerId,
        createdAt: project.createdAt,
        members: this.roomManager.listMembers(req.params.id),
      });
    });

    // List owner's projects
    this.app.get('/api/projects/owner/:ownerId', (req, res) => {
      const ids = this.ownerProjects.get(req.params.ownerId) || [];
      const projects = ids.map(id => this.projects.get(id)).filter(Boolean);
      res.json({ projects });
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.config.serverPort, this.config.serverHost, () => {
        console.log(`SyncForge server running on ${this.config.serverHost}:${this.config.serverPort}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.wss.close(() => {
        this.server.close(() => resolve());
      });
    });
  }
}

/* ─── Helpers ─── */

function generateId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
