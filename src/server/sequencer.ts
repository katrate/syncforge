/**
 * SyncForge Server — Event Sequencer
 *
 * Assigns monotonically increasing sequence numbers to events
 * within a project to establish total ordering.
 *
 * Implements Last-Write-Wins (LWW) conflict resolution:
 * the event with the highest sequence number is authoritative.
 */

import type { FileEvent } from '../protocol/events.js';

export class Sequencer {
  private counter = 0;
  private lastEvents = new Map<string, FileEvent>();
  private projectId: string;

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  /**
   * Assign the next sequence number to an event.
   */
  next(event: Omit<FileEvent, 'sequence'>): FileEvent {
    this.counter++;
    const sequenced: FileEvent = {
      ...event,
      sequence: this.counter,
    };
    this.lastEvents.set(event.path, sequenced);
    return sequenced;
  }

  /**
   * Get the latest event for a given file path.
   */
  getLastEvent(path: string): FileEvent | undefined {
    return this.lastEvents.get(path);
  }

  /**
   * Get the current sequence counter value.
   */
  currentSequence(): number {
    return this.counter;
  }

  /**
   * Resolve a conflict between two events for the same path.
   * Last-Write-Wins: highest sequence number wins.
   */
  resolve(base: FileEvent, incoming: FileEvent): FileEvent {
    return incoming.sequence >= base.sequence ? incoming : base;
  }
}
