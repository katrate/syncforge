/**
 * SyncForge Server — Authentication
 *
 * Simple JWT-based authentication for MVP.
 * In production, this would integrate with GitHub, Google, or SSO.
 */

import jwt from 'jsonwebtoken';

export interface TokenPayload {
  userId: string;
  displayName: string;
  projectId?: string;
}

const DEFAULT_SECRET = 'syncforge-dev-secret-change-in-production';

export class Auth {
  private secret: string;

  constructor(secret?: string) {
    this.secret = secret || DEFAULT_SECRET;
  }

  /**
   * Generate an invite token for a project.
   */
  createInviteToken(projectId: string, ownerId: string): string {
    return jwt.sign(
      { projectId, ownerId, type: 'invite' },
      this.secret,
      { expiresIn: '24h' }
    );
  }

  /**
   * Create a session token for an authenticated user.
   */
  createSessionToken(userId: string, displayName: string, projectId?: string): string {
    return jwt.sign(
      { userId, displayName, projectId } satisfies TokenPayload,
      this.secret,
      { expiresIn: '7d' }
    );
  }

  /**
   * Verify and decode a JWT token.
   */
  verifyToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.secret) as TokenPayload & { type?: string };
      return { userId: decoded.userId, displayName: decoded.displayName, projectId: decoded.projectId };
    } catch {
      return null;
    }
  }

  /**
   * Validate an invite token and return the project ID.
   */
  validateInviteToken(token: string): { projectId: string; ownerId: string } | null {
    try {
      const decoded = jwt.verify(token, this.secret) as { projectId: string; ownerId: string; type: string };
      if (decoded.type !== 'invite') return null;
      return { projectId: decoded.projectId, ownerId: decoded.ownerId };
    } catch {
      return null;
    }
  }
}
