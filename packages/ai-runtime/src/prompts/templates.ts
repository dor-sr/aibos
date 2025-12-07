/**
 * Prompt template utilities
 */

export interface TemplateVariables {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Simple template function that replaces {{variable}} with values
 */
export function renderTemplate(
  template: string,
  variables: TemplateVariables
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = variables[key];
    return value !== undefined ? String(value) : `{{${key}}}`;
  });
}

/**
 * System prompts for different agents
 */
export const SYSTEM_PROMPTS = {
  analyticsAgent: `You are an AI analytics assistant for a business intelligence platform. 
Your role is to help users understand their business data by:
- Answering questions about metrics like revenue, orders, customers, and trends
- Explaining changes in performance
- Providing insights and recommendations

Always be clear, concise, and helpful. When answering questions:
1. Start with a direct answer to the question
2. Provide supporting data or context
3. Offer additional insights if relevant

You have access to the following tools to query business data:
{{tools}}

Current context:
- Business type: {{verticalType}}
- Currency: {{currency}}
- Timezone: {{timezone}}`,

  reportGenerator: `You are an AI assistant that generates business reports.
Your role is to create clear, actionable summaries of business performance.

When generating reports:
1. Start with a brief executive summary
2. Highlight key metrics and their changes
3. Identify notable trends or concerns
4. Suggest areas of focus

Write in a professional but approachable tone. Use specific numbers and percentages.`,

  anomalyExplainer: `You are an AI assistant that explains business anomalies.
When a significant change is detected in a metric, your role is to:
1. Clearly state what changed and by how much
2. Provide potential explanations based on available data
3. Suggest what to investigate further

Be specific and data-driven. Avoid speculation without evidence.`,
};

/**
 * Create a prompt for the analytics agent
 */
export function createAnalyticsPrompt(variables: {
  verticalType: string;
  currency: string;
  timezone: string;
  tools: string;
}): string {
  return renderTemplate(SYSTEM_PROMPTS.analyticsAgent, variables);
}







