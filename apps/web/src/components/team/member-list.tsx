'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import {
  MoreHorizontal,
  Shield,
  UserMinus,
  Loader2,
  Crown,
  UserCog,
  User,
  Eye,
} from 'lucide-react';

interface TeamMember {
  id: string;
  userId: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  customRole: { id: string; name: string } | null;
  joinedAt: string | null;
}

interface MemberListProps {
  workspaceId: string;
  currentUserId: string;
}

const roleIcons = {
  owner: Crown,
  admin: Shield,
  member: User,
  viewer: Eye,
};

const roleBadgeColors = {
  owner: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  member: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  viewer: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

export function MemberList({ workspaceId, currentUserId }: MemberListProps) {
  const { toast } = useToast();
  const [members, setMembers] = React.useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentUserRole, setCurrentUserRole] = React.useState<string>('member');

  const fetchMembers = React.useCallback(async () => {
    try {
      const response = await fetch(`/api/team/members?workspaceId=${workspaceId}`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members);

        // Find current user's role
        const currentMember = data.members.find((m: TeamMember) => m.userId === currentUserId);
        if (currentMember) {
          setCurrentUserRole(currentMember.role);
        }
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team members.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, currentUserId, toast]);

  React.useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      const response = await fetch('/api/team/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, memberId, role: newRole }),
      });

      if (response.ok) {
        toast({
          title: 'Role updated',
          description: 'Team member role has been updated.',
        });
        fetchMembers();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update role');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update role.',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${memberEmail} from this workspace?`)) {
      return;
    }

    try {
      const response = await fetch('/api/team/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, memberId }),
      });

      if (response.ok) {
        toast({
          title: 'Member removed',
          description: `${memberEmail} has been removed from the workspace.`,
        });
        fetchMembers();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove member');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove member.',
        variant: 'destructive',
      });
    }
  };

  const canManageTeam = ['owner', 'admin'].includes(currentUserRole);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Members</CardTitle>
        <CardDescription>
          {members.length} member{members.length !== 1 ? 's' : ''} in this workspace
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {members.map((member) => {
            const RoleIcon = roleIcons[member.role] || User;
            const isCurrentUser = member.userId === currentUserId;
            const canModify = canManageTeam && !isCurrentUser && member.role !== 'owner';

            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    {member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt={member.fullName || member.email}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  {/* Name and email */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {member.fullName || member.email.split('@')[0]}
                      </span>
                      {isCurrentUser && (
                        <Badge variant="outline" className="text-xs">
                          You
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">{member.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Role badge */}
                  <div className="flex items-center gap-2">
                    <Badge className={roleBadgeColors[member.role]}>
                      <RoleIcon className="mr-1 h-3 w-3" />
                      {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                    </Badge>
                    {member.customRole && (
                      <Badge variant="outline">{member.customRole.name}</Badge>
                    )}
                  </div>

                  {/* Actions */}
                  {canModify && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleRoleChange(member.id, 'admin')}
                          disabled={member.role === 'admin'}
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          Make Admin
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRoleChange(member.id, 'member')}
                          disabled={member.role === 'member'}
                        >
                          <UserCog className="mr-2 h-4 w-4" />
                          Make Member
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRoleChange(member.id, 'viewer')}
                          disabled={member.role === 'viewer'}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Make Viewer
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleRemoveMember(member.id, member.email)}
                          className="text-destructive focus:text-destructive"
                        >
                          <UserMinus className="mr-2 h-4 w-4" />
                          Remove Member
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
