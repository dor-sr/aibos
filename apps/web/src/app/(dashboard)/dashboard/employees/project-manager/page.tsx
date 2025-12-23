'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  ClipboardList,
  MessageSquare,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  Settings,
  Send,
  Activity,
  TrendingUp,
} from 'lucide-react';

// Mock data
const mockStandupSummary = {
  date: new Date(),
  responsesReceived: 8,
  totalTeam: 10,
  blockers: [
    { name: 'Sarah', blocker: 'Waiting on API documentation from vendor' },
    { name: 'Mike', blocker: 'Database migration taking longer than expected' },
  ],
};

const mockTeamWorkload = [
  { name: 'Sarah', activeTasks: 5, status: 'normal', completedThisWeek: 8 },
  { name: 'Mike', activeTasks: 8, status: 'heavy', completedThisWeek: 6 },
  { name: 'Alex', activeTasks: 3, status: 'light', completedThisWeek: 10 },
  { name: 'Jordan', activeTasks: 6, status: 'normal', completedThisWeek: 7 },
];

const mockRecentActivity = [
  { type: 'standup_collected', contact: 'Sarah', time: '2 hours ago' },
  { type: 'reminder_sent', contact: 'Mike', time: '3 hours ago' },
  { type: 'blocker_escalated', contact: 'Jordan', time: '5 hours ago' },
  { type: 'weekly_report', contact: 'Team', time: '1 day ago' },
];

export default function ProjectManagerPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [message, setMessage] = useState('');

  const handleSendMessage = () => {
    console.log('Sending message:', message);
    setMessage('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <ClipboardList className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Alex PM</h1>
            <p className="text-muted-foreground">AI Project Manager</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">High Confidence</Badge>
          <Badge variant="outline">78% Autonomous</Badge>
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="standups">Standups</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Standups Today</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {mockStandupSummary.responsesReceived}/{mockStandupSummary.totalTeam}
                </div>
                <p className="text-xs text-muted-foreground">Team responses collected</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Blockers</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockStandupSummary.blockers.length}</div>
                <p className="text-xs text-muted-foreground">Being tracked</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {mockTeamWorkload.reduce((sum, m) => sum + m.completedThisWeek, 0)}
                </div>
                <p className="text-xs text-muted-foreground">This week</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Actions Taken</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">24</div>
                <p className="text-xs text-muted-foreground">Today</p>
              </CardContent>
            </Card>
          </div>

          {/* Chat Interface */}
          <Card>
            <CardHeader>
              <CardTitle>Ask Alex</CardTitle>
              <CardDescription>
                Ask questions about your team, projects, or request actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Ask about standups, blockers, workload..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <Button onClick={handleSendMessage}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <Button variant="outline" size="sm" onClick={() => setMessage("What's the standup summary for today?")}>
                  Standup Summary
                </Button>
                <Button variant="outline" size="sm" onClick={() => setMessage("Who has blockers?")}>
                  Active Blockers
                </Button>
                <Button variant="outline" size="sm" onClick={() => setMessage("Who is overloaded?")}>
                  Team Workload
                </Button>
                <Button variant="outline" size="sm" onClick={() => setMessage("What's due this week?")}>
                  Upcoming Deadlines
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity & Blockers */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Active Blockers</CardTitle>
                <CardDescription>Issues being tracked</CardDescription>
              </CardHeader>
              <CardContent>
                {mockStandupSummary.blockers.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    No active blockers
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mockStandupSummary.blockers.map((blocker, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium">{blocker.name}</p>
                          <p className="text-sm text-muted-foreground">{blocker.blocker}</p>
                        </div>
                        <Button size="sm" variant="outline">
                          Follow Up
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>What Alex has been doing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockRecentActivity.map((activity, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        {activity.type === 'standup_collected' && (
                          <MessageSquare className="h-4 w-4 text-primary" />
                        )}
                        {activity.type === 'reminder_sent' && (
                          <Clock className="h-4 w-4 text-primary" />
                        )}
                        {activity.type === 'blocker_escalated' && (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        )}
                        {activity.type === 'weekly_report' && (
                          <Calendar className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">
                          {activity.type.replace('_', ' ')} - {activity.contact}
                        </p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="standups" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Today&apos;s Standup Summary</CardTitle>
              <CardDescription>
                {mockStandupSummary.date.toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">
                    {mockStandupSummary.responsesReceived}
                  </div>
                  <div className="text-sm text-green-600">Responses</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold">
                    {mockStandupSummary.totalTeam - mockStandupSummary.responsesReceived}
                  </div>
                  <div className="text-sm text-muted-foreground">Pending</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-3xl font-bold text-yellow-600">
                    {mockStandupSummary.blockers.length}
                  </div>
                  <div className="text-sm text-yellow-600">Blockers</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Quick Actions</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline">
                    <Send className="mr-2 h-4 w-4" />
                    Send Reminders
                  </Button>
                  <Button variant="outline">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Post Summary to Slack
                  </Button>
                  <Button variant="outline">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Escalate Blockers
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Workload</CardTitle>
              <CardDescription>Current task distribution across team</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockTeamWorkload.map((member, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{member.name}</h4>
                        <Badge
                          variant={
                            member.status === 'heavy'
                              ? 'destructive'
                              : member.status === 'light'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {member.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {member.activeTasks} active tasks, {member.completedThisWeek} completed this week
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">{member.activeTasks}</div>
                      <div className="text-xs text-muted-foreground">Active</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
              <CardDescription>All actions taken by Alex</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Full activity log coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Standup Settings</CardTitle>
              <CardDescription>Configure daily standup behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Standup Time</Label>
                  <Input type="time" defaultValue="09:00" />
                </div>
                <div className="space-y-2">
                  <Label>Reminder Time</Label>
                  <Input type="time" defaultValue="10:30" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Send via Slack</Label>
                    <p className="text-sm text-muted-foreground">
                      Send standup requests through Slack
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Send via Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Send standup requests through email
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-send Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically remind team members who haven&apos;t responded
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trust Settings</CardTitle>
              <CardDescription>Configure autonomy levels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-approve Standups</Label>
                  <p className="text-sm text-muted-foreground">
                    Send standup requests without approval
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-approve Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Send deadline reminders without approval
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-approve Weekly Reports</Label>
                  <p className="text-sm text-muted-foreground">
                    Send weekly reports without approval
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

