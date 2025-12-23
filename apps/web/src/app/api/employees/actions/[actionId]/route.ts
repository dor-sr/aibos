import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/employees/actions/[actionId] - Get action details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ actionId: string }> }
) {
  try {
    const { actionId } = await params;
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: action, error } = await supabase
      .from('employee_actions')
      .select('*')
      .eq('id', actionId)
      .single();

    if (error || !action) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 });
    }

    return NextResponse.json({ action });
  } catch (error) {
    console.error('Error in GET /api/employees/actions/[actionId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/employees/actions/[actionId] - Approve, reject, or execute action
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ actionId: string }> }
) {
  try {
    const { actionId } = await params;
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action: requestedAction, reason, editedParameters } = body;

    if (!requestedAction || !['approve', 'reject', 'execute', 'cancel'].includes(requestedAction)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: approve, reject, execute, or cancel' },
        { status: 400 }
      );
    }

    // Get current action
    const { data: currentAction, error: fetchError } = await supabase
      .from('employee_actions')
      .select('*')
      .eq('id', actionId)
      .single();

    if (fetchError || !currentAction) {
      return NextResponse.json({ error: 'Action not found' }, { status: 404 });
    }

    const now = new Date().toISOString();
    let updateFields: Record<string, unknown> = { updated_at: now };

    switch (requestedAction) {
      case 'approve':
        if (currentAction.status !== 'pending') {
          return NextResponse.json({ error: 'Action is not pending' }, { status: 400 });
        }
        updateFields = {
          ...updateFields,
          status: 'approved',
          approved_by: user.id,
          approved_at: now,
        };
        if (editedParameters) {
          updateFields.parameters = editedParameters;
        }
        break;

      case 'reject':
        if (currentAction.status !== 'pending') {
          return NextResponse.json({ error: 'Action is not pending' }, { status: 400 });
        }
        updateFields = {
          ...updateFields,
          status: 'rejected',
          rejected_by: user.id,
          rejected_at: now,
          rejection_reason: reason,
        };
        break;

      case 'execute':
        if (currentAction.status !== 'approved') {
          return NextResponse.json({ error: 'Action is not approved' }, { status: 400 });
        }
        // Mark as executing - actual execution would be handled by worker
        updateFields = {
          ...updateFields,
          status: 'executing',
        };
        break;

      case 'cancel':
        if (!['pending', 'approved'].includes(currentAction.status)) {
          return NextResponse.json({ error: 'Action cannot be cancelled' }, { status: 400 });
        }
        updateFields = {
          ...updateFields,
          status: 'cancelled',
        };
        break;
    }

    // Update action
    const { data: updatedAction, error: updateError } = await supabase
      .from('employee_actions')
      .update(updateFields)
      .eq('id', actionId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating action:', updateError);
      return NextResponse.json({ error: 'Failed to update action' }, { status: 500 });
    }

    // Log audit entry
    await supabase.from('action_audit_logs').insert({
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action_id: actionId,
      event: requestedAction,
      user_id: user.id,
      details: { reason, editedParameters },
    });

    // Update trust metrics if approved or rejected
    if (requestedAction === 'approve' || requestedAction === 'reject') {
      await updateTrustMetrics(
        supabase,
        currentAction.employee_id,
        currentAction.type,
        requestedAction === 'approve'
      );
    }

    return NextResponse.json({ action: updatedAction });
  } catch (error) {
    console.error('Error in POST /api/employees/actions/[actionId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper to update trust metrics
async function updateTrustMetrics(
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  employeeId: string,
  actionType: string,
  approved: boolean
) {
  const metricId = `trust_${employeeId}_${actionType}`;

  // Try to get existing metric
  const { data: existing } = await supabase
    .from('employee_trust_metrics')
    .select('*')
    .eq('id', metricId)
    .single();

  if (existing) {
    // Update existing
    await supabase
      .from('employee_trust_metrics')
      .update({
        total_actions: existing.total_actions + 1,
        approved_count: existing.approved_count + (approved ? 1 : 0),
        rejected_count: existing.rejected_count + (approved ? 0 : 1),
        updated_at: new Date().toISOString(),
      })
      .eq('id', metricId);
  } else {
    // Create new
    await supabase.from('employee_trust_metrics').insert({
      id: metricId,
      employee_id: employeeId,
      action_type: actionType,
      total_actions: 1,
      approved_count: approved ? 1 : 0,
      rejected_count: approved ? 0 : 1,
      auto_approved_count: 0,
      average_confidence: 0.5,
      current_trust_level: 'requires_approval',
    });
  }
}

