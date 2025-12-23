'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  Bot,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Settings,
  MessageSquare,
  TrendingUp,
  ClipboardList,
} from 'lucide-react';

// Mock data for employees
const mockEmployees = [
  {
    id: 'emp_1',
    type: 'project_manager',
    name: 'Alex PM',
    status: 'active',
    trustLevel: 'high_confidence',
    actionsToday: 24,
    pendingApprovals: 3,
    autonomousRate: 78,
  },
];

// Mock data for pending approvals
const mockPendingApprovals = [
  {
    id: 'action_1',
    employeeName: 'Alex PM',
    type: 'send_message',
    description: 'Send standup reminder to Sarah',
    channel: 'slack',
    confidence: 0.82,
    createdAt: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    id: 'action_2',
    employeeName: 'Alex PM',
    type: 'send_email',
    description: 'Weekly report to team leads',
    channel: 'email',
    confidence: 0.71,
    createdAt: new Date(Date.now() - 1000 * 60 * 15),
  },
  {
    id: 'action_3',
    employeeName: 'Alex PM',
    type: 'create_task',
    description: 'Create follow-up task for blocker',
    channel: 'internal',
    confidence: 0.65,
    createdAt: new Date(Date.now() - 1000 * 60 * 30),
  },
];

// Employee type info
const employeeTypes = [
  {
    type: 'project_manager',
    name: 'AI Project Manager',
    description: 'Manages standups, tasks, deadlines, and team coordination',
    icon: ClipboardList,
    available: true,
  },
  {
    type: 'customer_success',
    name: 'AI Customer Success Manager',
    description: 'Handles client onboarding, check-ins, and health monitoring',
    icon: Users,
    available: false,
  },
  {
    type: 'sales_dev',
    name: 'AI Sales Development Rep',
    description: 'Qualifies leads, sends outreach, and schedules meetings',
    icon: TrendingUp,
    available: false,
  },
  {
    type: 'support',
    name: 'AI Support Agent',
    description: 'Handles tickets, FAQs, and customer inquiries',
    icon: MessageSquare,
    available: false,
  },
];

export default function EmployeesPage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Employees</h1>
          <p className="text-muted-foreground">
            Manage your AI workforce and review pending actions
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Hire Employee
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="approvals">
            Pending Approvals
            {mockPendingApprovals.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {mockPendingApprovals.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="hire">Hire New</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
                <Bot className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockEmployees.length}</div>
                <p className="text-xs text-muted-foreground">AI workers on your team</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Actions Today</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {mockEmployees.reduce((sum, e) => sum + e.actionsToday, 0)}
                </div>
                <p className="text-xs text-muted-foreground">Completed by AI employees</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockPendingApprovals.length}</div>
                <p className="text-xs text-muted-foreground">Waiting for your review</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Autonomy Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(
                    mockEmployees.reduce((sum, e) => sum + e.autonomousRate, 0) /
                      mockEmployees.length
                  )}%
                </div>
                <p className="text-xs text-muted-foreground">Actions auto-approved</p>
              </CardContent>
            </Card>
          </div>

          {/* Employee List */}
          <Card>
            <CardHeader>
              <CardTitle>Your AI Employees</CardTitle>
              <CardDescription>
                Click on an employee to view details and configure their behavior
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mockEmployees.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bot className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">No AI Employees Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Hire your first AI employee to get started
                  </p>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Hire Your First Employee
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {mockEmployees.map((employee) => (
                    <div
                      key={employee.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <ClipboardList className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{employee.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            AI Project Manager
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className="text-lg font-semibold">{employee.actionsToday}</div>
                          <div className="text-xs text-muted-foreground">Actions Today</div>
                        </div>

                        <div className="text-center">
                          <div className="text-lg font-semibold">{employee.autonomousRate}%</div>
                          <div className="text-xs text-muted-foreground">Autonomy</div>
                        </div>

                        <Badge
                          variant={
                            employee.trustLevel === 'autonomous'
                              ? 'default'
                              : employee.trustLevel === 'high_confidence'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {employee.trustLevel.replace('_', ' ')}
                        </Badge>

                        {employee.pendingApprovals > 0 && (
                          <Badge variant="destructive">
                            {employee.pendingApprovals} pending
                          </Badge>
                        )}

                        <Button variant="ghost" size="icon">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>
                Review and approve actions your AI employees want to take
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mockPendingApprovals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold">All Caught Up</h3>
                  <p className="text-muted-foreground">
                    No pending actions need your approval
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {mockPendingApprovals.map((approval) => (
                    <div
                      key={approval.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-10 w-10 rounded-full flex items-center justify-center ${
                              approval.confidence > 0.8
                                ? 'bg-green-100 text-green-600'
                                : approval.confidence > 0.6
                                ? 'bg-yellow-100 text-yellow-600'
                                : 'bg-red-100 text-red-600'
                            }`}
                          >
                            {approval.type === 'send_message' ? (
                              <MessageSquare className="h-5 w-5" />
                            ) : approval.type === 'send_email' ? (
                              <MessageSquare className="h-5 w-5" />
                            ) : (
                              <ClipboardList className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium">{approval.description}</h4>
                            <p className="text-sm text-muted-foreground">
                              by {approval.employeeName} via {approval.channel}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">
                            {Math.round(approval.confidence * 100)}% confidence
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatTimeAgo(approval.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <Button size="sm" className="flex-1">
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          Edit & Approve
                        </Button>
                        <Button size="sm" variant="destructive" className="flex-1">
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hire" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available AI Employees</CardTitle>
              <CardDescription>
                Choose an AI employee type to add to your team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {employeeTypes.map((type) => (
                  <div
                    key={type.type}
                    className={`border rounded-lg p-4 ${
                      type.available
                        ? 'hover:border-primary cursor-pointer'
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <type.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{type.name}</h3>
                          {!type.available && (
                            <Badge variant="secondary">Coming Soon</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {type.description}
                        </p>
                        {type.available && (
                          <Button size="sm" className="mt-3">
                            <Plus className="mr-2 h-4 w-4" />
                            Hire
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

