import type { Tool } from '@aibos/ai-runtime';

/**
 * Ecommerce metric tools
 */
export const ecommerceMetricTools: Tool[] = [
  {
    name: 'get_revenue',
    description: 'Get total revenue for a time period',
    parameters: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          description: 'Time period (today, last_7_days, last_30_days, this_month, etc.)',
          enum: ['today', 'yesterday', 'last_7_days', 'last_30_days', 'this_month', 'last_month'],
        },
        compare: {
          type: 'boolean',
          description: 'Include comparison to previous period',
        },
      },
      required: ['period'],
    },
  },
  {
    name: 'get_orders',
    description: 'Get order count and statistics for a time period',
    parameters: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          description: 'Time period',
          enum: ['today', 'yesterday', 'last_7_days', 'last_30_days', 'this_month', 'last_month'],
        },
        compare: {
          type: 'boolean',
          description: 'Include comparison to previous period',
        },
      },
      required: ['period'],
    },
  },
  {
    name: 'get_aov',
    description: 'Get average order value for a time period',
    parameters: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          description: 'Time period',
          enum: ['today', 'yesterday', 'last_7_days', 'last_30_days', 'this_month', 'last_month'],
        },
        compare: {
          type: 'boolean',
          description: 'Include comparison to previous period',
        },
      },
      required: ['period'],
    },
  },
  {
    name: 'get_top_products',
    description: 'Get top performing products by revenue or quantity',
    parameters: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          description: 'Time period',
        },
        metric: {
          type: 'string',
          description: 'Metric to rank by',
          enum: ['revenue', 'quantity', 'orders'],
        },
        limit: {
          type: 'number',
          description: 'Number of products to return',
        },
      },
      required: ['period'],
    },
  },
  {
    name: 'get_customer_segments',
    description: 'Get breakdown of new vs returning customers',
    parameters: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          description: 'Time period',
        },
      },
      required: ['period'],
    },
  },
];

/**
 * Calculate an ecommerce metric
 */
export async function calculateEcommerceMetric(
  toolName: string,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  // TODO: Implement actual metric calculations using data-model queries

  // For now, return demo data
  switch (toolName) {
    case 'get_revenue':
      return {
        revenue: 24500,
        currency: 'USD',
        period: args.period,
        change: args.compare ? 12.5 : undefined,
        previousRevenue: args.compare ? 21778 : undefined,
      };

    case 'get_orders':
      return {
        orders: 356,
        period: args.period,
        change: args.compare ? 8.2 : undefined,
        previousOrders: args.compare ? 329 : undefined,
      };

    case 'get_aov':
      return {
        aov: 68.82,
        currency: 'USD',
        period: args.period,
        change: args.compare ? 4.1 : undefined,
        previousAov: args.compare ? 66.11 : undefined,
      };

    case 'get_top_products':
      return {
        products: [
          { name: 'Product A', revenue: 5200, quantity: 52 },
          { name: 'Product B', revenue: 4100, quantity: 41 },
          { name: 'Product C', revenue: 3800, quantity: 76 },
          { name: 'Product D', revenue: 3200, quantity: 32 },
          { name: 'Product E', revenue: 2900, quantity: 58 },
        ].slice(0, (args.limit as number) || 5),
        period: args.period,
        metric: args.metric || 'revenue',
      };

    case 'get_customer_segments':
      return {
        newCustomers: { count: 180, revenue: 9800, percentage: 40 },
        returningCustomers: { count: 120, revenue: 14700, percentage: 60 },
        period: args.period,
      };

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}


