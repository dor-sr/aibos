/**
 * Standup Communication Templates
 */

import type { CommunicationChannel } from '@aibos/employee-core';

export interface TemplateContext {
  contactName: string;
  pmName: string;
  projectName?: string;
  customGreeting?: string;
}

/**
 * Standup request templates
 */
export const standupRequestTemplates = {
  email: (ctx: TemplateContext) => ({
    subject: `Daily Standup - ${new Date().toLocaleDateString()}`,
    body: `${ctx.customGreeting || `Hi ${ctx.contactName},`}

Time for your daily standup! Please reply with your update:

1. **What did you work on yesterday?**
2. **What are you working on today?**
3. **Any blockers or concerns?**

Just reply to this email with your answers.

Best,
${ctx.pmName}`,
    html: `<p>${ctx.customGreeting || `Hi ${ctx.contactName},`}</p>
<p>Time for your daily standup! Please reply with your update:</p>
<ol>
<li><strong>What did you work on yesterday?</strong></li>
<li><strong>What are you working on today?</strong></li>
<li><strong>Any blockers or concerns?</strong></li>
</ol>
<p>Just reply to this email with your answers.</p>
<p>Best,<br>${ctx.pmName}</p>`,
  }),

  slack: (ctx: TemplateContext) => ({
    text: `Hey ${ctx.contactName}! Time for your daily standup.`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Hey ${ctx.contactName}! Time for your daily standup.`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Please share:\n1. What did you work on yesterday?\n2. What are you working on today?\n3. Any blockers?`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Submit Standup' },
            action_id: 'submit_standup',
            style: 'primary',
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Skip Today' },
            action_id: 'skip_standup',
          },
        ],
      },
    ],
  }),

  whatsapp: (ctx: TemplateContext) => ({
    text: `Hi ${ctx.contactName}! Time for your daily standup.

Please share:
1. What did you work on yesterday?
2. What are you working on today?
3. Any blockers?

Just reply with your update!`,
  }),

  widget: (ctx: TemplateContext) => ({
    text: `Hi ${ctx.contactName}! Quick standup check-in.

What did you work on yesterday?
What's on your plate today?
Any blockers I should know about?`,
  }),
};

/**
 * Standup reminder templates
 */
export const standupReminderTemplates = {
  email: (ctx: TemplateContext) => ({
    subject: `Reminder: Daily Standup`,
    body: `Hi ${ctx.contactName},

Just a friendly reminder to submit your daily standup when you get a chance.

Your team is counting on your update!

${ctx.pmName}`,
  }),

  slack: (ctx: TemplateContext) => ({
    text: `Hey ${ctx.contactName}, just a friendly reminder about your standup! Your update helps the team stay in sync.`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Hey ${ctx.contactName}, just a friendly reminder about your standup! Your update helps the team stay in sync.`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Submit Now' },
            action_id: 'submit_standup',
            style: 'primary',
          },
        ],
      },
    ],
  }),

  whatsapp: (ctx: TemplateContext) => ({
    text: `Hi ${ctx.contactName}, friendly reminder about your standup! Just reply with a quick update when you can.`,
  }),
};

/**
 * Standup summary templates
 */
export const standupSummaryTemplates = {
  email: (ctx: TemplateContext & {
    date: string;
    responsesReceived: number;
    totalTeam: number;
    blockers: Array<{ name: string; blocker: string }>;
    highlights: string[];
  }) => ({
    subject: `Standup Summary - ${ctx.date}`,
    body: `Team Standup Summary for ${ctx.date}

Participation: ${ctx.responsesReceived}/${ctx.totalTeam} team members

${ctx.blockers.length > 0 ? `Blockers Reported (${ctx.blockers.length}):
${ctx.blockers.map(b => `- ${b.name}: ${b.blocker}`).join('\n')}` : 'No blockers reported.'}

${ctx.highlights.length > 0 ? `Highlights:
${ctx.highlights.map(h => `- ${h}`).join('\n')}` : ''}

${ctx.pmName}`,
  }),

  slack: (ctx: TemplateContext & {
    date: string;
    responsesReceived: number;
    totalTeam: number;
    blockers: Array<{ name: string; blocker: string }>;
    highlights: string[];
  }) => ({
    text: `Team Standup Summary for ${ctx.date}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `Standup Summary - ${ctx.date}` },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Participation:* ${ctx.responsesReceived}/${ctx.totalTeam} team members`,
        },
      },
      ...(ctx.blockers.length > 0
        ? [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Blockers (${ctx.blockers.length}):*\n${ctx.blockers.map(b => `- ${b.name}: ${b.blocker}`).join('\n')}`,
              },
            },
          ]
        : [
            {
              type: 'section',
              text: { type: 'mrkdwn', text: 'No blockers reported.' },
            },
          ]),
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
    ],
  }),
};

/**
 * Get template for channel
 */
export function getStandupRequestTemplate(channel: CommunicationChannel, ctx: TemplateContext) {
  switch (channel) {
    case 'email':
      return standupRequestTemplates.email(ctx);
    case 'slack':
      return standupRequestTemplates.slack(ctx);
    case 'whatsapp':
      return standupRequestTemplates.whatsapp(ctx);
    case 'widget':
      return standupRequestTemplates.widget(ctx);
    default:
      return standupRequestTemplates.email(ctx);
  }
}

export function getStandupReminderTemplate(channel: CommunicationChannel, ctx: TemplateContext) {
  switch (channel) {
    case 'email':
      return standupReminderTemplates.email(ctx);
    case 'slack':
      return standupReminderTemplates.slack(ctx);
    case 'whatsapp':
      return standupReminderTemplates.whatsapp(ctx);
    default:
      return standupReminderTemplates.slack(ctx);
  }
}

