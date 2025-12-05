'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, MessageSquare, Bell, Smartphone, Save, Loader2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { MemberList, InviteForm, ActivityLogComponent } from '@/components/team';
import { createBrowserClient } from '@supabase/ssr';

interface NotificationPreferences {
  emailEnabled: boolean;
  slackEnabled: boolean;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  weeklyReports: boolean;
  anomalyAlerts: boolean;
  syncNotifications: boolean;
  insightNotifications: boolean;
  anomalySeverityThreshold: string;
  quietHoursEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  emailDigestEnabled: boolean;
  emailDigestFrequency: string;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [workspaceId, setWorkspaceId] = React.useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [preferences, setPreferences] = React.useState<NotificationPreferences>({
    emailEnabled: true,
    slackEnabled: true,
    inAppEnabled: true,
    pushEnabled: false,
    weeklyReports: true,
    anomalyAlerts: true,
    syncNotifications: false,
    insightNotifications: true,
    anomalySeverityThreshold: 'medium',
    quietHoursEnabled: false,
    quietHoursStart: null,
    quietHoursEnd: null,
    emailDigestEnabled: false,
    emailDigestFrequency: 'daily',
  });

  // Get workspace ID and user ID from localStorage/Supabase
  React.useEffect(() => {
    const storedWorkspaceId = localStorage.getItem('currentWorkspaceId');
    if (storedWorkspaceId) {
      setWorkspaceId(storedWorkspaceId);
    } else {
      setIsLoading(false);
    }

    // Get current user ID from Supabase
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
      }
    });
  }, []);

  // Fetch preferences
  React.useEffect(() => {
    const fetchPreferences = async () => {
      if (!workspaceId) return;

      try {
        const response = await fetch(`/api/notifications/preferences?workspaceId=${workspaceId}`);
        if (response.ok) {
          const data = await response.json();
          setPreferences(data.preferences);
        }
      } catch (error) {
        console.error('Error fetching preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (workspaceId) {
      fetchPreferences();
    }
  }, [workspaceId]);

  // Save preferences
  const handleSave = async () => {
    if (!workspaceId) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, preferences }),
      });

      if (response.ok) {
        toast({
          title: 'Settings saved',
          description: 'Your notification preferences have been updated.',
        });
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save notification preferences.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Update preference helper
  const updatePreference = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your workspace settings and preferences.
        </p>
      </div>

      <Tabs defaultValue="team" className="space-y-6">
        <TabsList>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="api">API Access</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-6">
          {!workspaceId || !currentUserId ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  Please select a workspace to manage team settings.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <MemberList workspaceId={workspaceId} currentUserId={currentUserId} />
              <InviteForm workspaceId={workspaceId} />
              <ActivityLogComponent workspaceId={workspaceId} />
            </>
          )}
        </TabsContent>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Configure your workspace preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                General settings configuration coming soon.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          {!workspaceId ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  Please select a workspace to configure notification settings.
                </p>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <Card>
              <CardContent className="py-8 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Notification Channels */}
              <Card>
                <CardHeader>
                  <CardTitle>Notification Channels</CardTitle>
                  <CardDescription>
                    Choose how you want to receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Mail className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <Label htmlFor="email-enabled" className="font-medium">
                          Email Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Receive notifications via email
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="email-enabled"
                      checked={preferences.emailEnabled}
                      onCheckedChange={(checked) => updatePreference('emailEnabled', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <MessageSquare className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <Label htmlFor="slack-enabled" className="font-medium">
                          Slack Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Receive notifications in Slack
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="slack-enabled"
                      checked={preferences.slackEnabled}
                      onCheckedChange={(checked) => updatePreference('slackEnabled', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Bell className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <Label htmlFor="in-app-enabled" className="font-medium">
                          In-App Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Show notifications in the app
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="in-app-enabled"
                      checked={preferences.inAppEnabled}
                      onCheckedChange={(checked) => updatePreference('inAppEnabled', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Smartphone className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <Label htmlFor="push-enabled" className="font-medium">
                          Push Notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Receive browser push notifications
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="push-enabled"
                      checked={preferences.pushEnabled}
                      onCheckedChange={(checked) => updatePreference('pushEnabled', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Notification Types */}
              <Card>
                <CardHeader>
                  <CardTitle>Notification Types</CardTitle>
                  <CardDescription>
                    Choose which types of notifications you want to receive
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="weekly-reports" className="font-medium">
                        Weekly Reports
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receive weekly performance summaries
                      </p>
                    </div>
                    <Switch
                      id="weekly-reports"
                      checked={preferences.weeklyReports}
                      onCheckedChange={(checked) => updatePreference('weeklyReports', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="anomaly-alerts" className="font-medium">
                        Anomaly Alerts
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when unusual patterns are detected
                      </p>
                    </div>
                    <Switch
                      id="anomaly-alerts"
                      checked={preferences.anomalyAlerts}
                      onCheckedChange={(checked) => updatePreference('anomalyAlerts', checked)}
                    />
                  </div>

                  {preferences.anomalyAlerts && (
                    <div className="ml-0 pl-0 border-l-2 border-muted pl-4">
                      <Label htmlFor="severity-threshold" className="text-sm font-medium">
                        Minimum Severity
                      </Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Only alert for anomalies at or above this severity
                      </p>
                      <Select
                        value={preferences.anomalySeverityThreshold}
                        onValueChange={(value) => updatePreference('anomalySeverityThreshold', value)}
                      >
                        <SelectTrigger id="severity-threshold" className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="insight-notifications" className="font-medium">
                        Insights
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receive proactive business insights
                      </p>
                    </div>
                    <Switch
                      id="insight-notifications"
                      checked={preferences.insightNotifications}
                      onCheckedChange={(checked) => updatePreference('insightNotifications', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="sync-notifications" className="font-medium">
                        Sync Notifications
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified about data sync status
                      </p>
                    </div>
                    <Switch
                      id="sync-notifications"
                      checked={preferences.syncNotifications}
                      onCheckedChange={(checked) => updatePreference('syncNotifications', checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Email Digest */}
              <Card>
                <CardHeader>
                  <CardTitle>Email Digest</CardTitle>
                  <CardDescription>
                    Receive a summary of notifications instead of individual emails
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="email-digest" className="font-medium">
                        Enable Email Digest
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Combine notifications into a single digest email
                      </p>
                    </div>
                    <Switch
                      id="email-digest"
                      checked={preferences.emailDigestEnabled}
                      onCheckedChange={(checked) => updatePreference('emailDigestEnabled', checked)}
                    />
                  </div>

                  {preferences.emailDigestEnabled && (
                    <div>
                      <Label htmlFor="digest-frequency" className="text-sm font-medium">
                        Digest Frequency
                      </Label>
                      <Select
                        value={preferences.emailDigestFrequency}
                        onValueChange={(value) => updatePreference('emailDigestFrequency', value)}
                      >
                        <SelectTrigger id="digest-frequency" className="w-40 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quiet Hours */}
              <Card>
                <CardHeader>
                  <CardTitle>Quiet Hours</CardTitle>
                  <CardDescription>
                    Pause notifications during specified hours
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="quiet-hours" className="font-medium">
                        Enable Quiet Hours
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        No notifications during quiet hours
                      </p>
                    </div>
                    <Switch
                      id="quiet-hours"
                      checked={preferences.quietHoursEnabled}
                      onCheckedChange={(checked) => updatePreference('quietHoursEnabled', checked)}
                    />
                  </div>

                  {preferences.quietHoursEnabled && (
                    <div className="flex gap-4">
                      <div>
                        <Label htmlFor="quiet-start" className="text-sm font-medium">
                          Start Time
                        </Label>
                        <input
                          id="quiet-start"
                          type="time"
                          value={preferences.quietHoursStart || '22:00'}
                          onChange={(e) => updatePreference('quietHoursStart', e.target.value)}
                          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="quiet-end" className="text-sm font-medium">
                          End Time
                        </Label>
                        <input
                          id="quiet-end"
                          type="time"
                          value={preferences.quietHoursEnd || '08:00'}
                          onChange={(e) => updatePreference('quietHoursEnd', e.target.value)}
                          className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Access</CardTitle>
              <CardDescription>
                Manage API keys and access tokens
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                API access management coming soon.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
