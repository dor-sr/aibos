/**
 * Reminder and Deadline Templates
 */

import type { CommunicationChannel } from '@aibos/employee-core';

export interface DeadlineContext {
  contactName: string;
  pmName: string;
  taskTitle: string;
  projectName?: string;
  dueDate: string;
  daysUntilDue: number;
  daysOverdue?: number;
}

export interface BlockerContext {
  contactName: string;
  pmName: string;
  blockerDescription: string;
  daysOpen: number;
  taskTitle?: string;
}

/**
 * Deadline reminder templates
 */
export const deadlineReminderTemplates = {
  upcoming: {
    email: (ctx: DeadlineContext) => ({
      subject: `Upcoming Deadline: ${ctx.taskTitle}`,
      body: `Hi ${ctx.contactName},

Just a heads up that "${ctx.taskTitle}" is due in ${ctx.daysUntilDue} day${ctx.daysUntilDue !== 1 ? 's' : ''} (${ctx.dueDate}).

${ctx.projectName ? `Project: ${ctx.projectName}\n` : ''}
Let me know if you need any help or if there are any blockers!

${ctx.pmName}`,
    }),

    slack: (ctx: DeadlineContext) => ({
      text: `Heads up ${ctx.contactName}! "${ctx.taskTitle}" is due in ${ctx.daysUntilDue} day${ctx.daysUntilDue !== 1 ? 's' : ''}.`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Heads up ${ctx.contactName}! *${ctx.taskTitle}* is due in ${ctx.daysUntilDue} day${ctx.daysUntilDue !== 1 ? 's' : ''}.`,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Due: ${ctx.dueDate}${ctx.projectName ? ` | Project: ${ctx.projectName}` : ''}`,
            },
          ],
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'On Track' },
              action_id: 'task_on_track',
              style: 'primary',
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Need Help' },
              action_id: 'task_need_help',
            },
          ],
        },
      ],
    }),

    whatsapp: (ctx: DeadlineContext) => ({
      text: `Hi ${ctx.contactName}! Quick reminder: "${ctx.taskTitle}" is due in ${ctx.daysUntilDue} day${ctx.daysUntilDue !== 1 ? 's' : ''} (${ctx.dueDate}). Let me know if you need any help!`,
    }),
  },

  overdue: {
    email: (ctx: DeadlineContext) => ({
      subject: `Overdue: ${ctx.taskTitle}`,
      body: `Hi ${ctx.contactName},

"${ctx.taskTitle}" was due on ${ctx.dueDate} and is now ${ctx.daysOverdue} day${ctx.daysOverdue !== 1 ? 's' : ''} overdue.

${ctx.projectName ? `Project: ${ctx.projectName}\n` : ''}
Could you provide a quick update on the status? If there are blockers, let me know and I can help.

${ctx.pmName}`,
    }),

    slack: (ctx: DeadlineContext) => ({
      text: `${ctx.contactName}, "${ctx.taskTitle}" is ${ctx.daysOverdue} day${ctx.daysOverdue !== 1 ? 's' : ''} overdue.`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${ctx.contactName}, *${ctx.taskTitle}* is ${ctx.daysOverdue} day${ctx.daysOverdue !== 1 ? 's' : ''} overdue.`,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Was due: ${ctx.dueDate}${ctx.projectName ? ` | Project: ${ctx.projectName}` : ''}`,
            },
          ],
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Mark Complete' },
              action_id: 'task_complete',
              style: 'primary',
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Update Status' },
              action_id: 'task_update',
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Report Blocker' },
              action_id: 'report_blocker',
              style: 'danger',
            },
          ],
        },
      ],
    }),

    whatsapp: (ctx: DeadlineContext) => ({
      text: `Hi ${ctx.contactName}, "${ctx.taskTitle}" is now ${ctx.daysOverdue} day${ctx.daysOverdue !== 1 ? 's' : ''} overdue. Can you share a quick status update?`,
    }),
  },
};

/**
 * Blocker follow-up templates
 */
export const blockerFollowupTemplates = {
  email: (ctx: BlockerContext) => ({
    subject: `Following up: Blocker - ${ctx.taskTitle || 'Your issue'}`,
    body: `Hi ${ctx.contactName},

I'm following up on the blocker you reported ${ctx.daysOpen} day${ctx.daysOpen !== 1 ? 's' : ''} ago:

"${ctx.blockerDescription}"

Has this been resolved? If not, is there anything I can do to help unblock you?

${ctx.pmName}`,
  }),

  slack: (ctx: BlockerContext) => ({
    text: `Following up on your blocker, ${ctx.contactName}.`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Following up on your blocker from ${ctx.daysOpen} day${ctx.daysOpen !== 1 ? 's' : ''} ago, ${ctx.contactName}:`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `> ${ctx.blockerDescription}`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Resolved' },
            action_id: 'blocker_resolved',
            style: 'primary',
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Still Blocked' },
            action_id: 'still_blocked',
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Need Escalation' },
            action_id: 'escalate_blocker',
            style: 'danger',
          },
        ],
      },
    ],
  }),

  whatsapp: (ctx: BlockerContext) => ({
    text: `Hi ${ctx.contactName}, following up on the blocker you mentioned ${ctx.daysOpen} day${ctx.daysOpen !== 1 ? 's' : ''} ago: "${ctx.blockerDescription}". Has this been resolved?`,
  }),
};

/**
 * Progress update templates
 */
export const progressUpdateTemplates = {
  email: (ctx: {
    recipientName: string;
    pmName: string;
    projectName: string;
    completionPercentage: number;
    tasksCompleted: number;
    tasksRemaining: number;
    highlights: string[];
    concerns: string[];
  }) => ({
    subject: `Project Update: ${ctx.projectName}`,
    body: `Hi ${ctx.recipientName},

Here's a quick update on ${ctx.projectName}:

Progress: ${ctx.completionPercentage}% complete
- Tasks completed: ${ctx.tasksCompleted}
- Tasks remaining: ${ctx.tasksRemaining}

${ctx.highlights.length > 0 ? `Highlights:\n${ctx.highlights.map(h => `- ${h}`).join('\n')}\n` : ''}
${ctx.concerns.length > 0 ? `Concerns:\n${ctx.concerns.map(c => `- ${c}`).join('\n')}\n` : ''}
Let me know if you have any questions!

${ctx.pmName}`,
  }),

  slack: (ctx: {
    recipientName: string;
    pmName: string;
    projectName: string;
    completionPercentage: number;
    tasksCompleted: number;
    tasksRemaining: number;
    highlights: string[];
    concerns: string[];
  }) => ({
    text: `Project Update: ${ctx.projectName}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `Project Update: ${ctx.projectName}` },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Progress:* ${ctx.completionPercentage}% complete\n*Completed:* ${ctx.tasksCompleted} tasks | *Remaining:* ${ctx.tasksRemaining} tasks`,
        },
      },
      ...(ctx.highlights.length > 0
        ? [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Highlights:*\n${ctx.highlights.map(h => `- ${h}`).join('\n')}`,
              },
            },
          ]
        : []),
      ...(ctx.concerns.length > 0
        ? [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Concerns:*\n${ctx.concerns.map(c => `- ${c}`).join('\n')}`,
              },
            },
          ]
        : []),
    ],
  }),
};

/**
 * Get deadline reminder template
 */
export function getDeadlineReminderTemplate(
  channel: CommunicationChannel,
  ctx: DeadlineContext,
  isOverdue: boolean
) {
  const templates = isOverdue
    ? deadlineReminderTemplates.overdue
    : deadlineReminderTemplates.upcoming;

  switch (channel) {
    case 'email':
      return templates.email(ctx);
    case 'slack':
      return templates.slack(ctx);
    case 'whatsapp':
      return templates.whatsapp(ctx);
    default:
      return templates.slack(ctx);
  }
}

/**
 * Get blocker follow-up template
 */
export function getBlockerFollowupTemplate(channel: CommunicationChannel, ctx: BlockerContext) {
  switch (channel) {
    case 'email':
      return blockerFollowupTemplates.email(ctx);
    case 'slack':
      return blockerFollowupTemplates.slack(ctx);
    case 'whatsapp':
      return blockerFollowupTemplates.whatsapp(ctx);
    default:
      return blockerFollowupTemplates.slack(ctx);
  }
}

