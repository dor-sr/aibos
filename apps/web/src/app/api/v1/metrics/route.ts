// Public API v1 - Metrics endpoint
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  withApiAuth, 
  ApiAuthContext 
} from '@/lib/api/auth';
import { 
  createApiSuccess, 
  createApiError,
  parseDateRange,
} from '@/lib/api/response';

// GET - Fetch metrics for workspace
async function handler(request: NextRequest, context: ApiAuthContext) {
  const { workspaceId } = context;
  const searchParams = request.nextUrl.searchParams;
  
  // Parse query parameters
  const metricType = searchParams.get('type') || 'all'; // all, revenue, orders, customers, etc.
  const vertical = searchParams.get('vertical'); // ecommerce, saas
  const { startDate, endDate } = parseDateRange(searchParams);
  const granularity = searchParams.get('granularity') || 'day'; // hour, day, week, month
  
  // Create Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Get workspace to determine vertical
  const { data: workspace, error: workspaceError } = await supabase
    .from('workspaces')
    .select('vertical_type')
    .eq('id', workspaceId)
    .single();
  
  if (workspaceError || !workspace) {
    return createApiError('Workspace not found', 'WORKSPACE_NOT_FOUND', 404);
  }
  
  const workspaceVertical = vertical || workspace.vertical_type || 'ecommerce';
  
  // Build metrics based on vertical
  const metrics: Record<string, unknown> = {};
  
  if (workspaceVertical === 'ecommerce') {
    // Ecommerce metrics
    if (metricType === 'all' || metricType === 'revenue') {
      const { data: orders } = await supabase
        .from('ecommerce_orders')
        .select('total_price, created_at')
        .eq('workspace_id', workspaceId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      const totalRevenue = orders?.reduce((sum, o) => sum + parseFloat(o.total_price || '0'), 0) || 0;
      const orderCount = orders?.length || 0;
      const aov = orderCount > 0 ? totalRevenue / orderCount : 0;
      
      metrics.revenue = {
        total: totalRevenue,
        currency: 'USD',
        orderCount,
        averageOrderValue: aov,
      };
      
      // Revenue over time
      if (orders && orders.length > 0) {
        const revenueByDate: Record<string, number> = {};
        orders.forEach(order => {
          const dateParts = new Date(order.created_at).toISOString().split('T');
          const date = dateParts[0] || 'unknown';
          revenueByDate[date] = (revenueByDate[date] || 0) + parseFloat(order.total_price || '0');
        });
        
        metrics.revenueTimeSeries = Object.entries(revenueByDate)
          .map(([date, value]) => ({ date, value }))
          .sort((a, b) => a.date.localeCompare(b.date));
      }
    }
    
    if (metricType === 'all' || metricType === 'orders') {
      const { count: totalOrders } = await supabase
        .from('ecommerce_orders')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      const { count: pendingOrders } = await supabase
        .from('ecommerce_orders')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('financial_status', 'pending')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      const { count: paidOrders } = await supabase
        .from('ecommerce_orders')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('financial_status', 'paid')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      metrics.orders = {
        total: totalOrders || 0,
        pending: pendingOrders || 0,
        paid: paidOrders || 0,
      };
    }
    
    if (metricType === 'all' || metricType === 'customers') {
      const { count: totalCustomers } = await supabase
        .from('ecommerce_customers')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId);
      
      const { count: newCustomers } = await supabase
        .from('ecommerce_customers')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      metrics.customers = {
        total: totalCustomers || 0,
        new: newCustomers || 0,
      };
    }
    
    if (metricType === 'all' || metricType === 'products') {
      const { count: totalProducts } = await supabase
        .from('ecommerce_products')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId);
      
      metrics.products = {
        total: totalProducts || 0,
      };
    }
  } else if (workspaceVertical === 'saas') {
    // SaaS metrics
    if (metricType === 'all' || metricType === 'mrr') {
      const { data: subscriptions } = await supabase
        .from('saas_subscriptions')
        .select('mrr_amount, status')
        .eq('workspace_id', workspaceId)
        .eq('status', 'active');
      
      const mrr = subscriptions?.reduce((sum, s) => sum + parseFloat(s.mrr_amount || '0'), 0) || 0;
      const arr = mrr * 12;
      
      metrics.mrr = {
        current: mrr,
        arr,
        currency: 'USD',
        activeSubscriptions: subscriptions?.length || 0,
      };
    }
    
    if (metricType === 'all' || metricType === 'subscriptions') {
      const { count: active } = await supabase
        .from('saas_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', 'active');
      
      const { count: trialing } = await supabase
        .from('saas_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', 'trialing');
      
      const { count: canceled } = await supabase
        .from('saas_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', 'canceled')
        .gte('canceled_at', startDate.toISOString())
        .lte('canceled_at', endDate.toISOString());
      
      metrics.subscriptions = {
        active: active || 0,
        trialing: trialing || 0,
        canceledInPeriod: canceled || 0,
      };
    }
    
    if (metricType === 'all' || metricType === 'customers') {
      const { count: totalCustomers } = await supabase
        .from('saas_customers')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId);
      
      const { count: newCustomers } = await supabase
        .from('saas_customers')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      metrics.customers = {
        total: totalCustomers || 0,
        new: newCustomers || 0,
      };
    }
    
    if (metricType === 'all' || metricType === 'invoices') {
      const { data: invoices } = await supabase
        .from('saas_invoices')
        .select('amount_paid, status')
        .eq('workspace_id', workspaceId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      const paidAmount = invoices?.filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + parseFloat(i.amount_paid || '0'), 0) || 0;
      
      metrics.invoices = {
        total: invoices?.length || 0,
        paidAmount,
        currency: 'USD',
      };
    }
  }
  
  return createApiSuccess({
    workspaceId,
    vertical: workspaceVertical,
    period: {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      granularity,
    },
    metrics,
  });
}

export const GET = withApiAuth(handler, {
  requiredScopes: ['read:metrics'],
});

