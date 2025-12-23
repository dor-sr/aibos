/**
 * Weekly Report Templates
 */

import type { WeeklyReport, ProjectProgress, TeamWorkload } from '../types';

export interface ReportContext {
  recipientName: string;
  pmName: string;
  report: WeeklyReport;
}

/**
 * Weekly report email template
 */
export function generateWeeklyReportEmail(ctx: ReportContext) {
  const { report, pmName, recipientName } = ctx;

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const weekRange = `${formatDate(report.weekStartDate)} - ${formatDate(report.weekEndDate)}`;

  let projectSummaryHtml = '';
  if (report.projectSummaries.length > 0) {
    projectSummaryHtml = `
      <h3>Project Status</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr style="background: #f3f4f6;">
          <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">Project</th>
          <th style="padding: 10px; text-align: center; border: 1px solid #e5e7eb;">Progress</th>
          <th style="padding: 10px; text-align: center; border: 1px solid #e5e7eb;">Status</th>
        </tr>
        ${report.projectSummaries
          .map(
            p => `
          <tr>
            <td style="padding: 10px; border: 1px solid #e5e7eb;">${p.projectName}</td>
            <td style="padding: 10px; text-align: center; border: 1px solid #e5e7eb;">
              ${p.completionPercentage}%
            </td>
            <td style="padding: 10px; text-align: center; border: 1px solid #e5e7eb;">
              <span style="color: ${getHealthColor(p.healthScore)};">${p.healthScore.toUpperCase()}</span>
            </td>
          </tr>
        `
          )
          .join('')}
      </table>
    `;
  }

  let deadlinesHtml = '';
  if (report.upcomingDeadlines.length > 0) {
    deadlinesHtml = `
      <h3>Upcoming Deadlines</h3>
      <ul>
        ${report.upcomingDeadlines
          .map(
            d => `<li><strong>${d.task}</strong> (${d.project}) - Due ${formatDate(d.dueDate)} - Assigned to ${d.assignee}</li>`
          )
          .join('')}
      </ul>
    `;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #6366f1; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
        .metrics { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: #f9fafb; padding: 15px; border-radius: 8px; text-align: center; flex: 1; }
        .metric-value { font-size: 24px; font-weight: bold; color: #6366f1; }
        .metric-label { font-size: 12px; color: #6b7280; }
        h3 { color: #374151; margin-top: 25px; }
        ul { padding-left: 20px; }
        li { margin-bottom: 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">Weekly Report</h1>
          <p style="margin: 5px 0 0 0;">${weekRange}</p>
        </div>
        <div class="content">
          <p>Hi ${recipientName},</p>
          <p>Here's your weekly team update:</p>
          
          <div class="metrics">
            <div class="metric">
              <div class="metric-value">${report.teamPerformance.tasksCompleted}</div>
              <div class="metric-label">Tasks Completed</div>
            </div>
            <div class="metric">
              <div class="metric-value">${report.teamPerformance.tasksCreated}</div>
              <div class="metric-label">Tasks Created</div>
            </div>
            <div class="metric">
              <div class="metric-value">${report.teamPerformance.blockersResolved}</div>
              <div class="metric-label">Blockers Resolved</div>
            </div>
            <div class="metric">
              <div class="metric-value">${report.teamPerformance.standupParticipation}%</div>
              <div class="metric-label">Standup Participation</div>
            </div>
          </div>

          ${projectSummaryHtml}

          ${report.highlights.length > 0 ? `
            <h3>Highlights</h3>
            <ul>
              ${report.highlights.map(h => `<li>${h}</li>`).join('')}
            </ul>
          ` : ''}

          ${report.concerns.length > 0 ? `
            <h3>Concerns</h3>
            <ul style="color: #dc2626;">
              ${report.concerns.map(c => `<li>${c}</li>`).join('')}
            </ul>
          ` : ''}

          ${deadlinesHtml}

          <p style="margin-top: 30px;">Best regards,<br>${pmName}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textVersion = `
Weekly Report (${weekRange})

Hi ${recipientName},

Here's your weekly team update:

TEAM PERFORMANCE
- Tasks Completed: ${report.teamPerformance.tasksCompleted}
- Tasks Created: ${report.teamPerformance.tasksCreated}
- Blockers Resolved: ${report.teamPerformance.blockersResolved}
- Standup Participation: ${report.teamPerformance.standupParticipation}%

${report.projectSummaries.length > 0 ? `PROJECT STATUS
${report.projectSummaries.map(p => `- ${p.projectName}: ${p.completionPercentage}% (${p.healthScore})`).join('\n')}
` : ''}

${report.highlights.length > 0 ? `HIGHLIGHTS
${report.highlights.map(h => `- ${h}`).join('\n')}
` : ''}

${report.concerns.length > 0 ? `CONCERNS
${report.concerns.map(c => `- ${c}`).join('\n')}
` : ''}

${report.upcomingDeadlines.length > 0 ? `UPCOMING DEADLINES
${report.upcomingDeadlines.map(d => `- ${d.task} (${d.project}) - Due ${formatDate(d.dueDate)}`).join('\n')}
` : ''}

Best regards,
${pmName}
  `.trim();

  return {
    subject: `Weekly Report - ${weekRange}`,
    html,
    text: textVersion,
  };
}

/**
 * Weekly report Slack message
 */
export function generateWeeklyReportSlack(ctx: ReportContext) {
  const { report, pmName } = ctx;

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const weekRange = `${formatDate(report.weekStartDate)} - ${formatDate(report.weekEndDate)}`;

  const blocks: unknown[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `Weekly Report - ${weekRange}` },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Tasks Completed*\n${report.teamPerformance.tasksCompleted}`,
        },
        {
          type: 'mrkdwn',
          text: `*Tasks Created*\n${report.teamPerformance.tasksCreated}`,
        },
        {
          type: 'mrkdwn',
          text: `*Blockers Resolved*\n${report.teamPerformance.blockersResolved}`,
        },
        {
          type: 'mrkdwn',
          text: `*Standup Participation*\n${report.teamPerformance.standupParticipation}%`,
        },
      ],
    },
    { type: 'divider' },
  ];

  // Project summaries
  if (report.projectSummaries.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Project Status*\n' +
          report.projectSummaries
            .map(
              p =>
                `${getHealthEmoji(p.healthScore)} *${p.projectName}* - ${p.completionPercentage}% complete`
            )
            .join('\n'),
      },
    });
  }

  // Highlights
  if (report.highlights.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Highlights*\n' + report.highlights.map(h => `- ${h}`).join('\n'),
      },
    });
  }

  // Concerns
  if (report.concerns.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Concerns*\n' + report.concerns.map(c => `- ${c}`).join('\n'),
      },
    });
  }

  // Upcoming deadlines
  if (report.upcomingDeadlines.length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          '*Upcoming Deadlines*\n' +
          report.upcomingDeadlines
            .map(
              d =>
                `- *${d.task}* (${d.project}) - Due ${formatDate(d.dueDate)} - ${d.assignee}`
            )
            .join('\n'),
      },
    });
  }

  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `Generated by ${pmName}`,
      },
    ],
  });

  return {
    text: `Weekly Report - ${weekRange}`,
    blocks,
  };
}

// Helper functions
function getHealthColor(health: ProjectProgress['healthScore']): string {
  switch (health) {
    case 'good':
      return '#10b981';
    case 'at_risk':
      return '#f59e0b';
    case 'critical':
      return '#ef4444';
    default:
      return '#6b7280';
  }
}

function getHealthEmoji(health: ProjectProgress['healthScore']): string {
  switch (health) {
    case 'good':
      return ':white_check_mark:';
    case 'at_risk':
      return ':warning:';
    case 'critical':
      return ':x:';
    default:
      return ':question:';
  }
}

