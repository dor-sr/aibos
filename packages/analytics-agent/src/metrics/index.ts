import type { VerticalType } from '@aibos/core';
import type { ToolRegistry, Tool } from '@aibos/ai-runtime';
import { ecommerceMetricTools, calculateEcommerceMetric } from './ecommerce';
import { saasMetricTools, calculateSaasMetric } from './saas';

/**
 * Register metric tools based on vertical type
 */
export function registerMetricTools(
  registry: ToolRegistry,
  verticalType: VerticalType
): void {
  // Get tools for the vertical
  const tools = getToolsForVertical(verticalType);

  // Register each tool
  for (const tool of tools) {
    registry.register(tool, async (args) => {
      return executeMetricTool(tool.name, args, verticalType);
    });
  }
}

/**
 * Get tools for a specific vertical
 */
function getToolsForVertical(verticalType: VerticalType): Tool[] {
  switch (verticalType) {
    case 'ecommerce':
      return ecommerceMetricTools;
    case 'saas':
      return saasMetricTools;
    default:
      // Return basic tools for other verticals
      return [...ecommerceMetricTools.slice(0, 2)];
  }
}

/**
 * Execute a metric tool
 */
async function executeMetricTool(
  toolName: string,
  args: Record<string, unknown>,
  verticalType: VerticalType
): Promise<string> {
  try {
    let result: Record<string, unknown>;

    if (verticalType === 'ecommerce') {
      result = await calculateEcommerceMetric(toolName, args);
    } else if (verticalType === 'saas') {
      result = await calculateSaasMetric(toolName, args);
    } else {
      result = { error: 'Unsupported vertical type' };
    }

    return JSON.stringify(result);
  } catch (error) {
    return JSON.stringify({ error: (error as Error).message });
  }
}

export { ecommerceMetricTools, saasMetricTools };
export { calculateEcommerceMetric, calculateSaasMetric };






