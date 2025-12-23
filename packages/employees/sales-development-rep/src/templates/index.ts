/**
 * SDR Communication Templates
 * 
 * Templates for all SDR communications across channels.
 */

import type { CommunicationChannel } from '@aibos/employee-core';
import type { Lead, MeetingType, FollowUpType } from '../types';

// ============================================
// TEMPLATE CONTEXT TYPES
// ============================================

export interface TemplateContext {
  leadName: string;
  leadFirstName?: string;
  companyName: string;
  sdrName: string;
  sdrTitle?: string;
  sdrSignature?: string;
  customContent?: string;
}

export interface OutreachContext extends TemplateContext {
  painPoint?: string;
  valueProposition?: string;
  caseStudy?: string;
  calendarLink?: string;
  proposedTimes?: string;
}

export interface FollowUpContext extends TemplateContext {
  followUpType: FollowUpType;
  previousMessage?: string;
  daysSinceLastContact?: number;
  calendarLink?: string;
}

export interface MeetingContext extends TemplateContext {
  meetingType: MeetingType;
  proposedTimes?: string;
  meetingLink?: string;
  meetingDate?: string;
  meetingTime?: string;
  agenda?: string[];
}

// ============================================
// INITIAL OUTREACH TEMPLATES
// ============================================

export const initialOutreachTemplates = {
  email: {
    demo_request: (ctx: OutreachContext) => ({
      subject: `Re: Your Demo Request`,
      body: `Hi ${ctx.leadFirstName || ctx.leadName},

Thanks for your interest in our platform! I noticed you requested a demo and I'd love to help.

I have a few questions to make sure we make the best use of your time:
- What specific challenges are you looking to solve?
- Is there a particular feature or capability you're most interested in?

I have availability this week if you'd like to schedule a quick call. Here's my calendar: ${ctx.calendarLink || '[Calendar Link]'}

Looking forward to connecting!

${ctx.sdrSignature || ctx.sdrName}`,
    }),

    cold_initial_pain: (ctx: OutreachContext) => ({
      subject: `${ctx.companyName} + [Your Company] - Quick question`,
      body: `Hi ${ctx.leadFirstName || ctx.leadName},

I've been researching companies in your space and noticed ${ctx.companyName} ${ctx.painPoint || 'is growing rapidly'}.

Many companies like yours struggle with ${ctx.painPoint || 'scaling their operations efficiently'}. We've helped similar teams ${ctx.valueProposition || 'achieve 3x productivity gains'}.

${ctx.caseStudy ? `Quick example: ${ctx.caseStudy}` : ''}

Would you be open to a brief conversation to see if we might be able to help?

${ctx.sdrSignature || ctx.sdrName}`,
    }),

    cold_initial_value: (ctx: OutreachContext) => ({
      subject: `Idea for ${ctx.companyName}`,
      body: `Hi ${ctx.leadFirstName || ctx.leadName},

I came across ${ctx.companyName} and thought our solution might be a great fit for your team.

In short, we help companies like yours ${ctx.valueProposition || 'streamline their workflow and boost productivity'}.

Would a quick 15-minute call make sense to see if there's a fit?

${ctx.sdrSignature || ctx.sdrName}`,
    }),

    inbound_lead: (ctx: OutreachContext) => ({
      subject: `Thanks for reaching out, ${ctx.leadFirstName || ctx.leadName}!`,
      body: `Hi ${ctx.leadFirstName || ctx.leadName},

Thanks for your interest in our platform! I saw you ${ctx.customContent || 'visited our website recently'}.

I'd love to learn more about what you're looking for and see if we can help.

Do you have 15 minutes this week for a quick call? Here are a few times that work for me, or feel free to suggest others:
${ctx.proposedTimes || '- [Time options]'}

Looking forward to connecting!

${ctx.sdrSignature || ctx.sdrName}`,
    }),

    content_download: (ctx: OutreachContext) => ({
      subject: `Your download + a quick question`,
      body: `Hi ${ctx.leadFirstName || ctx.leadName},

I noticed you downloaded ${ctx.customContent || 'one of our resources'} - hope you found it helpful!

I'm curious: what prompted you to check it out? Are you currently exploring solutions for ${ctx.painPoint || 'this area'}?

If you have any questions about what you read, or want to see how it applies to ${ctx.companyName}, I'm happy to chat.

${ctx.sdrSignature || ctx.sdrName}`,
    }),
  },

  linkedin: {
    connection_request: (ctx: OutreachContext) => ({
      text: `Hi ${ctx.leadFirstName || ctx.leadName}, I came across your profile while researching ${ctx.companyName}. Would love to connect and share some insights that might be valuable for your team.`,
    }),

    connection_message: (ctx: OutreachContext) => ({
      text: `Thanks for connecting, ${ctx.leadFirstName || ctx.leadName}!

I noticed ${ctx.companyName} ${ctx.painPoint || 'is doing impressive things'}. We've helped similar companies ${ctx.valueProposition || 'solve key challenges'}.

Would you be open to a quick chat?`,
    }),
  },

  slack: {
    initial_message: (ctx: OutreachContext) => ({
      text: `Hey ${ctx.leadFirstName || ctx.leadName}!`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Hey ${ctx.leadFirstName || ctx.leadName}! I'm ${ctx.sdrName} from [Company]. I noticed your interest and would love to help you explore our platform.`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Would any of these work for a quick call?\n${ctx.proposedTimes || '- Suggest some times'}`,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Schedule Call' },
              action_id: 'schedule_call',
              style: 'primary',
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Learn More First' },
              action_id: 'learn_more',
            },
          ],
        },
      ],
    }),
  },
};

// ============================================
// FOLLOW-UP TEMPLATES
// ============================================

export const followUpTemplates = {
  email: {
    no_reply_1: (ctx: FollowUpContext) => ({
      subject: `Re: ${ctx.companyName} - Following up`,
      body: `Hi ${ctx.leadFirstName || ctx.leadName},

Just wanted to follow up on my previous message. I know things can get busy!

I'd still love to learn about what ${ctx.companyName} is working on and see if we can help.

Would a brief call work sometime this week?

${ctx.sdrSignature || ctx.sdrName}`,
    }),

    no_reply_2: (ctx: FollowUpContext) => ({
      subject: `Re: ${ctx.companyName} - Quick follow up`,
      body: `Hi ${ctx.leadFirstName || ctx.leadName},

Haven't heard back yet, so I wanted to try one more time.

I'm reaching out because companies like ${ctx.companyName} often see great results with our platform, and I think there could be a fit here.

If now isn't the right time, no worries at all - just let me know and I won't take up more of your inbox space.

${ctx.sdrSignature || ctx.sdrName}`,
    }),

    breakup: (ctx: FollowUpContext) => ({
      subject: `Should I close your file?`,
      body: `Hi ${ctx.leadFirstName || ctx.leadName},

I've reached out a few times and haven't heard back, so I wanted to check in one last time.

If you're not interested or the timing isn't right, that's totally fine - just let me know and I'll close out your file.

But if something has changed or you'd like to revisit, I'm here to help.

Either way, wishing you and the ${ctx.companyName} team all the best!

${ctx.sdrSignature || ctx.sdrName}`,
    }),

    after_email_open: (ctx: FollowUpContext) => ({
      subject: `Re: ${ctx.companyName} - Quick thought`,
      body: `Hi ${ctx.leadFirstName || ctx.leadName},

Wanted to bump this to the top of your inbox - I think there could be a great fit for ${ctx.companyName}.

Any interest in a quick call to explore?

${ctx.sdrSignature || ctx.sdrName}`,
    }),

    after_meeting: (ctx: FollowUpContext) => ({
      subject: `Great talking with you, ${ctx.leadFirstName || ctx.leadName}!`,
      body: `Hi ${ctx.leadFirstName || ctx.leadName},

Thanks for taking the time to chat today! I really enjoyed learning about ${ctx.companyName} and the challenges you're tackling.

As discussed, here are the next steps:
${ctx.customContent || '- [Next steps from meeting]'}

I'll send over the resources we mentioned shortly. In the meantime, feel free to reach out if any questions come up.

Talk soon!

${ctx.sdrSignature || ctx.sdrName}`,
    }),

    post_demo: (ctx: FollowUpContext) => ({
      subject: `Re: ${ctx.companyName} Demo Follow-up`,
      body: `Hi ${ctx.leadFirstName || ctx.leadName},

Thanks again for joining the demo! I hope it gave you a good sense of how we can help ${ctx.companyName}.

As promised, I'm attaching:
${ctx.customContent || '- Demo recording\n- Relevant case studies\n- Pricing overview'}

What questions came up after our session? I'd love to address anything that's on your mind.

Would it make sense to schedule a follow-up call to discuss next steps?

${ctx.sdrSignature || ctx.sdrName}`,
    }),

    missed_call: (ctx: FollowUpContext) => ({
      subject: `Tried to reach you`,
      body: `Hi ${ctx.leadFirstName || ctx.leadName},

I just tried giving you a call but wasn't able to reach you.

I was hoping to discuss ${ctx.customContent || 'how we might be able to help'} ${ctx.companyName}.

Would you prefer to schedule a time that works better for you? Here's my calendar: ${ctx.calendarLink || '[Calendar Link]'}

${ctx.sdrSignature || ctx.sdrName}`,
    }),
  },

  sms: {
    quick_follow: (ctx: FollowUpContext) => ({
      text: `Hi ${ctx.leadFirstName}, this is ${ctx.sdrName}. Following up on my email about ${ctx.companyName}. Would love to chat when you have a moment. What time works?`,
    }),
  },
};

// ============================================
// MEETING TEMPLATES
// ============================================

export const meetingTemplates = {
  email: {
    meeting_request: (ctx: MeetingContext) => ({
      subject: `Let's schedule a call - ${ctx.companyName}`,
      body: `Hi ${ctx.leadFirstName || ctx.leadName},

I'd love to schedule a ${ctx.meetingType === 'discovery_call' ? 'quick discovery call' : ctx.meetingType === 'demo' ? 'demo' : 'call'} to learn more about ${ctx.companyName} and see how we can help.

Here are a few times that work on my end:
${ctx.proposedTimes || '- [Available times]'}

Feel free to pick one that works for you, or suggest an alternative!

${ctx.sdrSignature || ctx.sdrName}`,
    }),

    meeting_confirmed: (ctx: MeetingContext) => ({
      subject: `Confirmed: ${ctx.meetingType === 'demo' ? 'Demo' : 'Call'} with ${ctx.leadFirstName || ctx.leadName} - ${ctx.meetingDate}`,
      body: `Hi ${ctx.leadFirstName || ctx.leadName},

Great news - we're confirmed for ${ctx.meetingDate} at ${ctx.meetingTime}!

Here are the details:
- Date: ${ctx.meetingDate}
- Time: ${ctx.meetingTime}
- Link: ${ctx.meetingLink || '[Meeting Link]'}

${ctx.agenda && ctx.agenda.length > 0 ? `What we'll cover:\n${ctx.agenda.map((item, i) => `${i + 1}. ${item}`).join('\n')}` : ''}

Looking forward to it!

${ctx.sdrSignature || ctx.sdrName}`,
    }),

    meeting_reminder: (ctx: MeetingContext) => ({
      subject: `Reminder: Our call tomorrow - ${ctx.meetingTime}`,
      body: `Hi ${ctx.leadFirstName || ctx.leadName},

Just a friendly reminder about our call tomorrow at ${ctx.meetingTime}.

Here's the meeting link: ${ctx.meetingLink || '[Meeting Link]'}

See you soon!

${ctx.sdrSignature || ctx.sdrName}`,
    }),

    meeting_reschedule: (ctx: MeetingContext) => ({
      subject: `Let's reschedule - ${ctx.companyName}`,
      body: `Hi ${ctx.leadFirstName || ctx.leadName},

I need to reschedule our upcoming call. Apologies for any inconvenience!

Here are some new times that work for me:
${ctx.proposedTimes || '- [Available times]'}

Let me know what works best for you.

${ctx.sdrSignature || ctx.sdrName}`,
    }),

    no_show_followup: (ctx: MeetingContext) => ({
      subject: `Missed you on our call`,
      body: `Hi ${ctx.leadFirstName || ctx.leadName},

I was on the call at ${ctx.meetingTime} but didn't see you join. No worries - these things happen!

Would you like to reschedule? Here are some alternative times:
${ctx.proposedTimes || '- [Available times]'}

If something came up, just let me know and we can find a better time.

${ctx.sdrSignature || ctx.sdrName}`,
    }),
  },

  slack: {
    meeting_reminder: (ctx: MeetingContext) => ({
      text: `Reminder: Meeting in 15 minutes`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Hey ${ctx.leadFirstName}! Quick reminder - we have a call in 15 minutes.`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Time:* ${ctx.meetingTime}\n*Link:* ${ctx.meetingLink || 'See calendar invite'}`,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Join Call' },
              url: ctx.meetingLink,
              style: 'primary',
            },
          ],
        },
      ],
    }),
  },
};

// ============================================
// QUALIFICATION TEMPLATES
// ============================================

export const qualificationTemplates = {
  email: {
    budget_question: (ctx: TemplateContext) => ({
      subject: `Quick question about ${ctx.companyName}`,
      body: `Hi ${ctx.leadFirstName || ctx.leadName},

As we continue our conversation, I wanted to ask: does ${ctx.companyName} have budget allocated for this type of solution?

Understanding this helps me tailor our next conversation and make sure I'm presenting options that make sense for you.

No pressure - just trying to be helpful and respect your time!

${ctx.sdrSignature || ctx.sdrName}`,
    }),

    timeline_question: (ctx: TemplateContext) => ({
      subject: `Re: ${ctx.companyName} - Timeline`,
      body: `Hi ${ctx.leadFirstName || ctx.leadName},

Quick question: what's your ideal timeline for getting a solution like this in place?

Are you looking to move quickly, or is this more of a future consideration?

This helps me understand how I can best support you.

${ctx.sdrSignature || ctx.sdrName}`,
    }),

    stakeholder_question: (ctx: TemplateContext) => ({
      subject: `Re: ${ctx.companyName} - Next steps`,
      body: `Hi ${ctx.leadFirstName || ctx.leadName},

As we explore fit, I'm curious: who else at ${ctx.companyName} would typically be involved in evaluating and deciding on a solution like this?

I want to make sure we're including the right people in our conversations.

${ctx.sdrSignature || ctx.sdrName}`,
    }),
  },
};

// ============================================
// HANDOFF TEMPLATES
// ============================================

export const handoffTemplates = {
  email: {
    ae_introduction: (ctx: TemplateContext & { aeName: string; aeEmail: string }) => ({
      subject: `Introducing ${ctx.aeName} - Your Account Executive`,
      body: `Hi ${ctx.leadFirstName || ctx.leadName},

I wanted to introduce you to ${ctx.aeName}, who will be your dedicated Account Executive moving forward.

${ctx.aeName} is copied on this email and will be reaching out to schedule your next conversation. They're fantastic and will take great care of you!

It's been a pleasure connecting with you, and I'll be here if you need anything.

${ctx.sdrSignature || ctx.sdrName}

---

${ctx.aeName} (${ctx.aeEmail}) - feel free to take it from here!`,
    }),

    internal_handoff: (ctx: TemplateContext & { 
      aeName: string; 
      qualificationNotes: string;
      painPoints: string[];
      timeline: string;
      budget: string;
    }) => ({
      subject: `Lead Handoff: ${ctx.companyName} - ${ctx.leadName}`,
      body: `Hi ${ctx.aeName},

I'm handing off ${ctx.leadName} from ${ctx.companyName}. Here's what you need to know:

**Contact:** ${ctx.leadName} (${ctx.leadFirstName})
**Company:** ${ctx.companyName}

**Qualification Summary:**
${ctx.qualificationNotes}

**Pain Points:**
${ctx.painPoints.map(p => `- ${p}`).join('\n')}

**Budget:** ${ctx.budget}
**Timeline:** ${ctx.timeline}

**Recommended Next Steps:**
- Schedule intro call
- Review their specific use case
- Prepare relevant case studies

Let me know if you need any additional context!

${ctx.sdrSignature || ctx.sdrName}`,
    }),
  },
};

// ============================================
// TEMPLATE HELPERS
// ============================================

export function getInitialOutreachTemplate(
  channel: CommunicationChannel,
  templateId: string,
  ctx: OutreachContext
) {
  if (channel === 'email') {
    const template = initialOutreachTemplates.email[templateId as keyof typeof initialOutreachTemplates.email];
    if (template) return template(ctx);
    return initialOutreachTemplates.email.inbound_lead(ctx);
  }
  if (channel === 'slack' && templateId in initialOutreachTemplates.slack) {
    const template = initialOutreachTemplates.slack[templateId as keyof typeof initialOutreachTemplates.slack];
    if (template) return template(ctx);
  }
  return initialOutreachTemplates.email.inbound_lead(ctx);
}

export function getFollowUpTemplate(
  channel: CommunicationChannel,
  templateId: string,
  ctx: FollowUpContext
) {
  if (channel === 'email') {
    const template = followUpTemplates.email[templateId as keyof typeof followUpTemplates.email];
    if (template) return template(ctx);
    return followUpTemplates.email.no_reply_1(ctx);
  }
  if (channel === 'sms' && templateId in followUpTemplates.sms) {
    const template = followUpTemplates.sms[templateId as keyof typeof followUpTemplates.sms];
    if (template) return template(ctx);
  }
  return followUpTemplates.email.no_reply_1(ctx);
}

export function getMeetingTemplate(
  channel: CommunicationChannel,
  templateId: string,
  ctx: MeetingContext
) {
  const channelTemplates = meetingTemplates[channel as 'email' | 'slack'];
  if (!channelTemplates) return meetingTemplates.email.meeting_request(ctx);

  const template = channelTemplates[templateId as keyof typeof channelTemplates];
  if (!template) return meetingTemplates.email.meeting_request(ctx);

  return template(ctx as MeetingContext);
}

export function personalizeTemplate(
  template: string,
  lead: Lead,
  additionalContext?: Record<string, string>
): string {
  let personalized = template;

  // Replace lead fields
  personalized = personalized.replace(/\{leadName\}/g, lead.name);
  personalized = personalized.replace(/\{leadFirstName\}/g, lead.firstName || lead.name.split(' ')[0] || '');
  personalized = personalized.replace(/\{company\}/g, lead.company);
  personalized = personalized.replace(/\{companyName\}/g, lead.company);
  personalized = personalized.replace(/\{title\}/g, lead.title || '');
  personalized = personalized.replace(/\{industry\}/g, lead.industry || '');

  // Replace additional context
  if (additionalContext) {
    for (const [key, value] of Object.entries(additionalContext)) {
      personalized = personalized.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
    }
  }

  return personalized;
}

