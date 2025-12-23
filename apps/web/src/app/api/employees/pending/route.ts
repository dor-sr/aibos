import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/employees/pending - Get all pending actions for workspace
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    // Fetch all pending actions for workspace with employee info
    const { data: actions, error } = await supabase
      .from('employee_actions')
      .select(`
        *,
        employees (
          id,
          name,
          type,
          avatar_url
        )
      `)
      .eq('workspace_id', workspaceId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching pending actions:', error);
      return NextResponse.json({ error: 'Failed to fetch pending actions' }, { status: 500 });
    }

    return NextResponse.json({ actions });
  } catch (error) {
    console.error('Error in GET /api/employees/pending:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/employees/pending/bulk - Bulk approve/reject actions
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { actionIds, action: requestedAction, reason } = body;

    if (!actionIds || !Array.isArray(actionIds) || actionIds.length === 0) {
      return NextResponse.json({ error: 'Action IDs required' }, { status: 400 });
    }

    if (!requestedAction || !['approve', 'reject'].includes(requestedAction)) {
      return NextResponse.json({ error: 'Action must be approve or reject' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const updateFields: Record<string, unknown> = {
      updated_at: now,
    };

    if (requestedAction === 'approve') {
      updateFields.status = 'approved';
      updateFields.approved_by = user.id;
      updateFields.approved_at = now;
    } else {
      updateFields.status = 'rejected';
      updateFields.rejected_by = user.id;
      updateFields.rejected_at = now;
      updateFields.rejection_reason = reason || 'Bulk rejected';
    }

    const { data: updatedActions, error } = await supabase
      .from('employee_actions')
      .update(updateFields)
      .in('id', actionIds)
      .eq('status', 'pending')
      .select();

    if (error) {
      console.error('Error bulk updating actions:', error);
      return NextResponse.json({ error: 'Failed to update actions' }, { status: 500 });
    }

    // Log audit entries
    const auditEntries = actionIds.map((actionId: string) => ({
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action_id: actionId,
      event: `bulk_${requestedAction}`,
      user_id: user.id,
      details: { reason, bulkOperation: true },
    }));

    await supabase.from('action_audit_logs').insert(auditEntries);

    return NextResponse.json({
      success: true,
      updated: updatedActions?.length || 0,
    });
  } catch (error) {
    console.error('Error in POST /api/employees/pending/bulk:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

