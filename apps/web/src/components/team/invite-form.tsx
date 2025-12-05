'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Mail,
  Send,
  Loader2,
  X,
  Copy,
  Clock,
  Check,
} from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string | null;
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  roleId: string;
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
}

interface InviteFormProps {
  workspaceId: string;
}

export function InviteForm({ workspaceId }: InviteFormProps) {
  const { toast } = useToast();
  const [email, setEmail] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [selectedRoleId, setSelectedRoleId] = React.useState<string>('');
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [pendingInvites, setPendingInvites] = React.useState<PendingInvite[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSending, setIsSending] = React.useState(false);
  const [lastInviteLink, setLastInviteLink] = React.useState<string | null>(null);
  const [copiedLink, setCopiedLink] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    try {
      const [rolesRes, invitesRes] = await Promise.all([
        fetch(`/api/team/roles?workspaceId=${workspaceId}`),
        fetch(`/api/team/invites?workspaceId=${workspaceId}`),
      ]);

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setRoles(rolesData.roles);
        // Set default role if available
        if (rolesData.roles.length > 0 && !selectedRoleId) {
          const memberRole = rolesData.roles.find((r: Role) => 
            r.name.toLowerCase() === 'member'
          );
          setSelectedRoleId(memberRole?.id || rolesData.roles[0].id);
        }
      }

      if (invitesRes.ok) {
        const invitesData = await invitesRes.json();
        setPendingInvites(invitesData.invites);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, selectedRoleId]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an email address.',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch('/api/team/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          email: email.trim(),
          roleId: selectedRoleId || undefined,
          message: message.trim() || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setLastInviteLink(data.inviteLink);
        toast({
          title: 'Invite sent',
          description: `Invitation sent to ${email}.`,
        });
        setEmail('');
        setMessage('');
        fetchData();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send invite');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send invite.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      const response = await fetch('/api/team/invites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, inviteId }),
      });

      if (response.ok) {
        toast({
          title: 'Invite revoked',
          description: 'The invitation has been revoked.',
        });
        fetchData();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to revoke invite');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to revoke invite.',
        variant: 'destructive',
      });
    }
  };

  const copyInviteLink = () => {
    if (lastInviteLink) {
      navigator.clipboard.writeText(lastInviteLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const formatExpiry = (expiresAt: string) => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return `${days} day${days !== 1 ? 's' : ''}`;
  };

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
    <div className="space-y-6">
      {/* Invite Form */}
      <Card>
        <CardHeader>
          <CardTitle>Invite Team Members</CardTitle>
          <CardDescription>
            Send invitations to add new members to your workspace
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendInvite} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Personal Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Add a personal note to the invitation..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between">
              <Button type="submit" disabled={isSending || !email.trim()}>
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Invite
                  </>
                )}
              </Button>

              {lastInviteLink && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={copyInviteLink}
                  className="ml-2"
                >
                  {copiedLink ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Invite Link
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>
              {pendingInvites.length} pending invite{pendingInvites.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-medium">{invite.email}</div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">{invite.role}</Badge>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Expires in {formatExpiry(invite.expiresAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRevokeInvite(invite.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
