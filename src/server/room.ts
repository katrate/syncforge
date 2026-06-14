/**
 * SyncForge Server — Room Management
 *
 * Manages project rooms: a room is a named group of connected
 * agents collaborating on the same project.
 */

import { createMessage, type AuthOkPayload, type FileChangePayload, type PresencePayload } from '../protocol/messages.js';
import type { FileEvent } from '../protocol/events.js';
import { Sequencer } from './sequencer.js';
import type WebSocket from 'ws';

export interface RoomMember {
  ws: WebSocket;
  userId: string;
  displayName: string;
  joinedAt: string;
}

export interface ProjectRoom {
  id: string;
  name: string;
  ownerId: string;
  members: Map<string, RoomMember>;
  createdAt: string;
  sequencer: Sequencer;
}

export class RoomManager {
  private rooms = new Map<string, ProjectRoom>();

  createRoom(projectId: string, name: string, ownerId: string): ProjectRoom {
    const room: ProjectRoom = {
      id: projectId,
      name,
      ownerId,
      members: new Map(),
      createdAt: new Date().toISOString(),
      sequencer: new Sequencer(projectId),
    };
    this.rooms.set(projectId, room);
    return room;
  }

  getRoom(projectId: string): ProjectRoom | undefined {
    return this.rooms.get(projectId);
  }

  addMember(projectId: string, member: RoomMember): void {
    const room = this.rooms.get(projectId);
    if (!room) throw new Error(`Room not found: ${projectId}`);
    room.members.set(member.userId, member);
  }

  removeMember(projectId: string, userId: string): void {
    const room = this.rooms.get(projectId);
    if (!room) return;
    room.members.delete(userId);

    // Notify remaining members
    this.broadcast(projectId, createMessage<PresencePayload>('presence', {
      userId,
      action: 'leave',
      projectId,
    }));

    // Clean up empty rooms
    if (room.members.size === 0) {
      this.rooms.delete(projectId);
    }
  }

  broadcast(projectId: string, message: unknown, excludeUserId?: string): void {
    const room = this.rooms.get(projectId);
    if (!room) return;

    const data = JSON.stringify(message);
    for (const [uid, member] of room.members) {
      if (uid === excludeUserId) continue;
      if (member.ws.readyState === member.ws.OPEN) {
        member.ws.send(data);
      }
    }
  }

  broadcastFileEvent(projectId: string, event: FileEvent, excludeUserId?: string): void {
    const room = this.rooms.get(projectId);
    if (!room) return;

    const seqEvent = room.sequencer.next(event);
    const msg = createMessage<FileChangePayload>('file_change', { event: seqEvent });
    this.broadcast(projectId, msg, excludeUserId);
  }

  listMembers(projectId: string): { userId: string; displayName: string }[] {
    const room = this.rooms.get(projectId);
    if (!room) return [];
    return Array.from(room.members.values()).map(m => ({
      userId: m.userId,
      displayName: m.displayName,
    }));
  }

  roomExists(projectId: string): boolean {
    return this.rooms.has(projectId);
  }
}
