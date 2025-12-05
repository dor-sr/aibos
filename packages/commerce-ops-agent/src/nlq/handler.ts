import { createLogger } from '@aibos/core';
import type {
  CommerceOpsNLQRequest,
  CommerceOpsNLQResponse,
  CommerceOpsIntent,
} from '../types';
import { detectCommerceOpsIntent, getSuggestedQuestions } from './intent';
import {
  formatInventorySummaryResponse,
  formatStockAlertsResponse,
  formatDemandForecastResponse,
  formatReorderRecommendationsResponse,
  formatMarginAnalysisResponse,
  formatPricingSuggestionsResponse,
  formatCommerceOpsMetricsResponse,
  formatSupplierPerformanceResponse,
} from './formatter';
import {
  getInventorySummary,
  getStockAlerts,
  getDemandForecast,
  getReorderRecommendations,
} from '../inventory';
import {
  getMarginAnalysis,
  getPricingSuggestions,
} from '../pricing';
import {
  getMultiChannelInventory,
  getAllocationRecommendations,
} from '../channels';
import {
  getCommerceOpsMetrics,
  getSupplierPerformance,
} from '../metrics';

const logger = createLogger('commerce-ops:nlq-handler');

/**
 * Handle a natural language question about commerce operations
 */
export async function handleCommerceOpsNLQ(
  request: CommerceOpsNLQRequest
): Promise<CommerceOpsNLQResponse> {
  const { question, workspaceId } = request;
  
  logger.info('Handling commerce ops NLQ', { question, workspaceId });

  // Detect intent
  const intent = detectCommerceOpsIntent(question);
  logger.info('Detected intent', { intent });

  try {
    let answer: string;
    let data: unknown;

    switch (intent) {
      case 'inventory_status': {
        const summary = await getInventorySummary(workspaceId);
        answer = formatInventorySummaryResponse(summary);
        data = summary;
        break;
      }

      case 'stock_alerts': {
        const alerts = await getStockAlerts(workspaceId);
        answer = formatStockAlertsResponse(alerts);
        data = alerts;
        break;
      }

      case 'demand_forecast': {
        const forecasts = await getDemandForecast(workspaceId, 30);
        answer = formatDemandForecastResponse(forecasts);
        data = forecasts;
        break;
      }

      case 'reorder_recommendations': {
        const recommendations = await getReorderRecommendations(workspaceId);
        answer = formatReorderRecommendationsResponse(recommendations);
        data = recommendations;
        break;
      }

      case 'pricing_analysis': {
        const suggestions = await getPricingSuggestions(workspaceId);
        answer = formatPricingSuggestionsResponse(suggestions);
        data = suggestions;
        break;
      }

      case 'margin_analysis': {
        const marginAnalysis = await getMarginAnalysis(workspaceId);
        answer = formatMarginAnalysisResponse(marginAnalysis);
        data = marginAnalysis;
        break;
      }

      case 'multi_channel_inventory': {
        const inventory = await getMultiChannelInventory(workspaceId);
        const allocations = await getAllocationRecommendations(workspaceId);
        
        const lines: string[] = [
          `**Multi-Channel Inventory**`,
          ``,
          `Total products: ${inventory.length}`,
          ``,
        ];

        // Group by channel
        const channelTotals = new Map<string, number>();
        for (const product of inventory) {
          for (const channel of product.channels) {
            const current = channelTotals.get(channel.platform) || 0;
            channelTotals.set(channel.platform, current + channel.stock);
          }
        }

        lines.push('**Stock by Channel:**');
        for (const [channel, total] of channelTotals) {
          lines.push(`- ${channel}: ${total} units`);
        }

        if (allocations.length > 0) {
          lines.push('');
          lines.push(`**Allocation Recommendations (${allocations.length}):**`);
          allocations.slice(0, 3).forEach((a) => {
            lines.push(`- ${a.productName}: Transfer ${a.recommendedTransfer} from ${a.sourcePlatform} to ${a.targetPlatform}`);
          });
        }

        answer = lines.join('\n');
        data = { inventory, allocations };
        break;
      }

      case 'supplier_performance': {
        const suppliers = await getSupplierPerformance(workspaceId);
        answer = formatSupplierPerformanceResponse(suppliers);
        data = suppliers;
        break;
      }

      case 'purchase_orders': {
        const metrics = await getCommerceOpsMetrics(workspaceId);
        const lines: string[] = [
          `**Purchase Orders**`,
          ``,
          `- Pending Orders: ${metrics.pendingPurchaseOrders}`,
          `- Pending Value: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: metrics.currency }).format(metrics.pendingPurchaseOrdersValue)}`,
        ];
        answer = lines.join('\n');
        data = { pending: metrics.pendingPurchaseOrders, value: metrics.pendingPurchaseOrdersValue };
        break;
      }

      case 'general_commerce': {
        const metrics = await getCommerceOpsMetrics(workspaceId);
        answer = formatCommerceOpsMetricsResponse(metrics);
        data = metrics;
        break;
      }

      case 'unknown':
      default: {
        answer = `I'm not sure I understand that question. Here are some things I can help you with:

**Inventory:**
- "What is my inventory status?"
- "Show me low stock products"
- "Which products are out of stock?"

**Forecasting:**
- "What's the demand forecast?"
- "Which products will run out first?"
- "What should I reorder?"

**Pricing:**
- "Show me margin analysis"
- "Which products need repricing?"

**Multi-Channel:**
- "How is inventory distributed across channels?"
- "Show me allocation recommendations"

**Suppliers:**
- "Show me supplier performance"
- "Which supplier is most reliable?"`;
        data = null;
        break;
      }
    }

    return {
      answer,
      intent,
      data,
      suggestedQuestions: getSuggestedQuestions(intent),
    };
  } catch (err) {
    logger.error('Error handling commerce ops NLQ', err instanceof Error ? err : undefined, { question, workspaceId });
    
    return {
      answer: 'I encountered an error while processing your question. Please try again or ask a different question.',
      intent,
      data: null,
      suggestedQuestions: getSuggestedQuestions('unknown'),
    };
  }
}
