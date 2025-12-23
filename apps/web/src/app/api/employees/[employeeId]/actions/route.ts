import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/employees/[employeeId]/actions - Get employee actions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { employeeId } = await params;
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query
    let query = supabase
      .from('employee_actions')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: actions, error } = await query;

    if (error) {
      console.error('Error fetching actions:', error);
      return NextResponse.json({ error: 'Failed to fetch actions' }, { status: 500 });
    }

    return NextResponse.json({ actions });
  } catch (error) {
    console.error('Error in GET /api/employees/[employeeId]/actions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/employees/[employeeId]/actions - Create a new action
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const { employeeId } = await params;
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      workspaceId,
      type,
      parameters,
      confidenceScore,
      requiresApproval,
      scheduledFor,
    } = body;

    if (!workspaceId || !type || !parameters) {
      return NextResponse.json(
        { error: 'Missing required fields: workspaceId, type, parameters' },
        { status: 400 }
      );
    }

    const actionId = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const { data: action, error } = await supabase
      .from('employee_actions')
      .insert({
        id: actionId,
        employee_id: employeeId,
        workspace_id: workspaceId,
        type,
        parameters,
        confidence_score: confidenceScore || 0.5,
        requires_approval: requiresApproval !== false,
        status: requiresApproval !== false ? 'pending' : 'approved',
        scheduled_for: scheduledFor,
        retry_count: 0,
        max_retries: 3,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating action:', error);
      return NextResponse.json({ error: 'Failed to create action' }, { status: 500 });
    }

    return NextResponse.json({ action }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/employees/[employeeId]/actions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

