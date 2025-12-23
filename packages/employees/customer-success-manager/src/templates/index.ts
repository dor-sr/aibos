/**
 * CSM Communication Templates
 * 
 * Templates for all Customer Success Manager communications.
 */

import type { CommunicationChannel } from '@aibos/employee-core';
import type { 
  ClientAccount, 
  CheckInType, 
  OnboardingStepType,
  ChurnAlert,
  UpsellOpportunity,
} from '../types';

// ============================================
// TEMPLATE CONTEXT TYPES
// ============================================

export interface TemplateContext {
  clientName: string;
  contactName: string;
  csmName: string;
  companyName?: string;
  customContent?: string;
}

export interface OnboardingContext extends TemplateContext {
  stepName: string;
  stepType: OnboardingStepType;
  planTier: string;
  progress: number;
}

export interface CheckInContext extends TemplateContext {
  checkInType: CheckInType;
  healthScore?: number;
  daysUntilRenewal?: number;
  lastCheckInDays?: number;
}

export interface AlertContext extends TemplateContext {
  alert: ChurnAlert;
  urgencyLevel: string;
}

export interface UpsellContext extends TemplateContext {
  opportunity: UpsellOpportunity;
  valueProposition: string;
}

// ============================================
// WELCOME TEMPLATES
// ============================================

export const welcomeTemplates = {
  email: {
    starter: (ctx: OnboardingContext) => ({
      subject: `Welcome to ${ctx.companyName || 'Our Platform'}!`,
      body: `Hi ${ctx.contactName},

Welcome aboard! I'm ${ctx.csmName}, your Customer Success Manager, and I'm here to ensure you get the most value from your new account.

Here's what to expect:
- Quick start guide coming your way
- 7-day check-in to see how you're doing
- I'm always available if you have questions

The best way to reach me is by replying to this email.

Looking forward to your success!

Best,
${ctx.csmName}
Customer Success Manager`,
      html: `<p>Hi ${ctx.contactName},</p>
<p>Welcome aboard! I'm <strong>${ctx.csmName}</strong>, your Customer Success Manager, and I'm here to ensure you get the most value from your new account.</p>
<h3>Here's what to expect:</h3>
<ul>
<li>Quick start guide coming your way</li>
<li>7-day check-in to see how you're doing</li>
<li>I'm always available if you have questions</li>
</ul>
<p>The best way to reach me is by replying to this email.</p>
<p>Looking forward to your success!</p>
<p>Best,<br>${ctx.csmName}<br><em>Customer Success Manager</em></p>`,
    }),

    pro: (ctx: OnboardingContext) => ({
      subject: `Welcome to Your Pro Account - Let's Get Started`,
      body: `Hi ${ctx.contactName},

Welcome to your Pro account! I'm ${ctx.csmName}, your dedicated Customer Success Manager.

As a Pro customer, you have access to:
- Priority support
- Advanced analytics and reporting
- Custom integrations
- Dedicated onboarding support

I'd love to schedule a kickoff call to understand your goals and set you up for success. Would any of these times work for you?

In the meantime, feel free to explore the platform - I'll be sending over some resources shortly.

Looking forward to working together!

Best,
${ctx.csmName}
Customer Success Manager`,
    }),

    enterprise: (ctx: OnboardingContext) => ({
      subject: `Welcome to ${ctx.companyName || 'Our Platform'} Enterprise - Your Success Team`,
      body: `Dear ${ctx.contactName},

On behalf of the entire team, welcome to your Enterprise partnership with us.

I'm ${ctx.csmName}, your dedicated Customer Success Manager, and I'll be your primary point of contact for all things related to your success.

As an Enterprise customer, you'll receive:
- Dedicated account management
- Custom implementation support
- Executive business reviews
- Priority 24/7 support
- Custom integrations and development

I'll be reaching out shortly to schedule an executive alignment call with your leadership team.

Welcome aboard!

Best regards,
${ctx.csmName}
Customer Success Manager`,
    }),
  },

  slack: {
    starter: (ctx: OnboardingContext) => ({
      text: `Welcome to the team, ${ctx.contactName}!`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Hey ${ctx.contactName}! Welcome! I'm ${ctx.csmName}, your Customer Success Manager. I'm here to help you get the most out of your account.`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Quick links to get started:*\n- Getting Started Guide\n- Help Center\n- Book a Demo`,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Schedule Call' },
              action_id: 'schedule_onboarding_call',
              style: 'primary',
            },
          ],
        },
      ],
    }),
  },
};

// ============================================
// CHECK-IN TEMPLATES
// ============================================

export const checkInTemplates = {
  email: {
    periodic: (ctx: CheckInContext) => ({
      subject: `Quick Check-in - How's Everything Going?`,
      body: `Hi ${ctx.contactName},

Just wanted to touch base and see how things are going with your account.

A few quick questions:
- Are you finding everything you need?
- Any challenges or blockers I can help with?
- Any upcoming projects where we might be able to help?

Feel free to reply with any thoughts, or we can schedule a quick call if that's easier.

Best,
${ctx.csmName}`,
    }),

    renewal: (ctx: CheckInContext) => ({
      subject: `Your Renewal is Coming Up - Let's Connect`,
      body: `Hi ${ctx.contactName},

I wanted to reach out as your renewal date is ${ctx.daysUntilRenewal} days away.

I'd love to:
1. Review your usage and success over the past year
2. Discuss any new goals or needs for the coming year
3. Ensure we're set up for continued success

Would you have 30 minutes this week or next for a quick call?

Best,
${ctx.csmName}`,
    }),

    risk_mitigation: (ctx: CheckInContext) => ({
      subject: `Following Up - Want to Make Sure You're Getting Value`,
      body: `Hi ${ctx.contactName},

I noticed a few things that suggest you might be running into some challenges, and I wanted to reach out personally.

I'm here to help! Whether it's:
- Technical questions or blockers
- Feature questions or training needs
- Strategic guidance on best practices

Could we schedule a quick call to chat? I want to make sure you're getting the full value from your investment.

Best,
${ctx.csmName}`,
    }),

    post_support: (ctx: CheckInContext) => ({
      subject: `Following Up on Your Recent Support Experience`,
      body: `Hi ${ctx.contactName},

I saw that you had a support request recently and wanted to follow up personally.

Was everything resolved to your satisfaction? Is there anything else I can help with?

Your feedback helps us improve - if you have a moment, I'd love to hear how your experience was.

Best,
${ctx.csmName}`,
    }),

    qbr_prep: (ctx: CheckInContext) => ({
      subject: `Preparing for Our Quarterly Business Review`,
      body: `Hi ${ctx.contactName},

Our quarterly business review is coming up, and I'm putting together an analysis of your success metrics and achievements this quarter.

I'd like to cover:
- Key wins and achievements
- Usage trends and adoption
- Roadmap features that might interest you
- Goals for the upcoming quarter

Are there any specific topics you'd like us to include?

Best,
${ctx.csmName}`,
    }),
  },

  slack: {
    periodic: (ctx: CheckInContext) => ({
      text: `Hey ${ctx.contactName}, quick check-in!`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Hey ${ctx.contactName}! Just wanted to see how things are going. Any questions or anything I can help with?`,
          },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'All Good!' },
              action_id: 'checkin_all_good',
              style: 'primary',
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Need Help' },
              action_id: 'checkin_need_help',
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Schedule Call' },
              action_id: 'checkin_schedule_call',
            },
          ],
        },
      ],
    }),
  },
};

// ============================================
// ONBOARDING STEP TEMPLATES
// ============================================

export const onboardingStepTemplates = {
  email: {
    kickoff_scheduled: (ctx: OnboardingContext) => ({
      subject: `Your Kickoff Call is Scheduled!`,
      body: `Hi ${ctx.contactName},

Great news - your kickoff call is confirmed!

During our call, we'll:
- Get to know your team and goals
- Walk through your account setup
- Create a success plan tailored to your needs

Please come prepared with:
- Your key goals for using the platform
- Questions you might have
- Any specific use cases you want to explore

Looking forward to meeting you!

Best,
${ctx.csmName}`,
    }),

    training_invite: (ctx: OnboardingContext) => ({
      subject: `Your Training Session is Ready`,
      body: `Hi ${ctx.contactName},

It's time for your training session! This is where things get exciting.

We'll cover:
- Key features and workflows
- Best practices for your use case
- Tips and tricks from power users
- Q&A

Please have your team members who will be using the platform join as well.

Best,
${ctx.csmName}`,
    }),

    first_value: (ctx: OnboardingContext) => ({
      subject: `Congratulations on Your First Week!`,
      body: `Hi ${ctx.contactName},

Congratulations on completing your first week! I hope you're starting to see value from the platform.

Quick questions:
- Have you achieved your first "aha moment" yet?
- Any features you'd like to explore more?
- Anything blocking you from getting started?

I'm here to help you succeed!

Best,
${ctx.csmName}`,
    }),

    success_plan: (ctx: OnboardingContext) => ({
      subject: `Let's Define Your Success Plan`,
      body: `Hi ${ctx.contactName},

Now that you've had some time with the platform, let's formalize your success plan.

I'd like to work with you to define:
- Your key success metrics
- Milestones for the first 90 days
- How we'll measure ROI
- Regular check-in cadence

This plan will be our north star for ensuring you achieve your goals.

Best,
${ctx.csmName}`,
    }),
  },
};

// ============================================
// ALERT TEMPLATES
// ============================================

export const alertTemplates = {
  email: {
    churn_risk: (ctx: AlertContext) => ({
      subject: `[Important] I Want to Help - Let's Connect`,
      body: `Hi ${ctx.contactName},

I've noticed some signals that suggest you might be facing challenges with the platform, and I wanted to reach out personally.

Your success is my top priority, and I'm committed to helping you get value from your investment.

Could we schedule a call this week? I'd like to:
- Understand any challenges you're facing
- Share some resources that might help
- Discuss how we can better support your goals

I'm flexible on timing - just let me know what works for you.

Best,
${ctx.csmName}`,
    }),

    payment_issue: (ctx: AlertContext) => ({
      subject: `Quick Note About Your Account`,
      body: `Hi ${ctx.contactName},

I noticed there might be an issue with your payment method on file. I wanted to reach out to make sure there's no interruption to your service.

Could you take a moment to update your payment information?

If there's anything I can help with or any concerns about your account, please let me know.

Best,
${ctx.csmName}`,
    }),
  },
};

// ============================================
// UPSELL TEMPLATES
// ============================================

export const upsellTemplates = {
  email: {
    plan_upgrade: (ctx: UpsellContext) => ({
      subject: `You're Ready for More - Let's Talk Upgrade`,
      body: `Hi ${ctx.contactName},

I've been reviewing your account usage, and I'm impressed with how much value you're getting from the platform!

I noticed you're pushing the limits of your current plan, and I think ${ctx.opportunity.recommendedPlan} would be a great fit for your growing needs.

${ctx.valueProposition}

Would you like to discuss how an upgrade could help you achieve even more?

Best,
${ctx.csmName}`,
    }),

    feature_addon: (ctx: UpsellContext) => ({
      subject: `A Feature That Might Interest You`,
      body: `Hi ${ctx.contactName},

Based on how your team uses the platform, I think you'd really benefit from ${ctx.opportunity.product}.

${ctx.valueProposition}

Many customers with similar usage patterns have seen significant improvements after adding this capability.

Would you like to learn more? I can set up a quick demo.

Best,
${ctx.csmName}`,
    }),

    contract_extension: (ctx: UpsellContext) => ({
      subject: `Lock in Your Rate - Multi-Year Opportunity`,
      body: `Hi ${ctx.contactName},

With your renewal coming up, I wanted to share an opportunity to lock in your current rate with a multi-year commitment.

Benefits of extending:
- Lock in current pricing (protect against increases)
- Enhanced support tier
- Early access to new features
- Dedicated account planning

This could save you ${ctx.opportunity.estimatedValue.toLocaleString()} over the term.

Interested in learning more?

Best,
${ctx.csmName}`,
    }),
  },
};

// ============================================
// NPS AND FEEDBACK TEMPLATES
// ============================================

export const feedbackTemplates = {
  email: {
    nps_request: (ctx: TemplateContext) => ({
      subject: `Quick Question - How Are We Doing?`,
      body: `Hi ${ctx.contactName},

I'd love to get your feedback with one quick question:

On a scale of 0-10, how likely are you to recommend us to a colleague?

Just reply with a number, and if you have a moment, let me know why.

Your feedback helps us improve!

Thanks,
${ctx.csmName}`,
    }),

    referral_request: (ctx: TemplateContext) => ({
      subject: `Know Someone Who Could Benefit?`,
      body: `Hi ${ctx.contactName},

I hope you're getting great value from the platform! If you know anyone who might benefit from what we offer, I'd love an introduction.

We have a referral program that rewards you for successful referrals.

Any names come to mind? Just reply and I'll take it from there.

Thanks for thinking of us!

Best,
${ctx.csmName}`,
    }),
  },
};

// ============================================
// REPORT TEMPLATES
// ============================================

export const reportTemplates = {
  email: {
    qbr_summary: (ctx: TemplateContext & { 
      quarter: string; 
      highlights: string[];
      metrics: { name: string; value: string; trend: string }[];
    }) => ({
      subject: `Your ${ctx.quarter} Success Summary`,
      body: `Hi ${ctx.contactName},

Here's your quarterly business review summary:

**Key Highlights:**
${ctx.highlights.map(h => `- ${h}`).join('\n')}

**Metrics:**
${ctx.metrics.map(m => `- ${m.name}: ${m.value} (${m.trend})`).join('\n')}

I've attached the full report. Let me know if you'd like to discuss any of these points.

Best,
${ctx.csmName}`,
    }),
  },
};

// ============================================
// TEMPLATE HELPERS
// ============================================

export function getCheckInTemplate(
  channel: CommunicationChannel,
  type: CheckInType,
  ctx: CheckInContext
) {
  const templates = checkInTemplates[channel as 'email' | 'slack'];
  if (!templates) return checkInTemplates.email.periodic(ctx);
  
  const template = templates[type as keyof typeof templates];
  if (!template) return checkInTemplates.email.periodic(ctx);
  
  return template(ctx);
}

export function getWelcomeTemplate(
  channel: CommunicationChannel,
  planTier: string,
  ctx: OnboardingContext
) {
  const templates = welcomeTemplates[channel as 'email' | 'slack'];
  if (!templates) return welcomeTemplates.email.starter(ctx);
  
  const template = templates[planTier as keyof typeof templates] || templates.starter;
  return template(ctx);
}

export function getOnboardingStepTemplate(
  stepType: OnboardingStepType,
  ctx: OnboardingContext
) {
  const template = onboardingStepTemplates.email[stepType as keyof typeof onboardingStepTemplates.email];
  if (!template) return null;
  return template(ctx);
}

export function getUpsellTemplate(
  type: UpsellOpportunity['type'],
  ctx: UpsellContext
) {
  const template = upsellTemplates.email[type as keyof typeof upsellTemplates.email];
  if (!template) return upsellTemplates.email.plan_upgrade(ctx);
  return template(ctx);
}

