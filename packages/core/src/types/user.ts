import type { Timestamps } from './common';

/**
 * User profile
 */
export interface User extends Timestamps {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
}

/**
 * Workspace membership - links users to workspaces
 */
export interface WorkspaceMembership extends Timestamps {
  id: string;
  userId: string;
  workspaceId: string;
  role: MemberRole;
  invitedBy: string | null;
  invitedAt: Date | null;
  joinedAt: Date | null;
}

/**
 * Member roles within a workspace
 */
export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer';

/**
 * Role permissions mapping
 */
export const ROLE_PERMISSIONS: Record<MemberRole, string[]> = {
  owner: [
    'workspace:delete',
    'workspace:update',
    'members:manage',
    'billing:manage',
    'connectors:manage',
    'data:read',
    'data:write',
    'agents:configure',
  ],
  admin: [
    'workspace:update',
    'members:manage',
    'connectors:manage',
    'data:read',
    'data:write',
    'agents:configure',
  ],
  member: [
    'connectors:manage',
    'data:read',
    'data:write',
    'agents:configure',
  ],
  viewer: [
    'data:read',
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: MemberRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Invite user input
 */
export interface InviteUserInput {
  email: string;
  role: MemberRole;
  workspaceId: string;
}





