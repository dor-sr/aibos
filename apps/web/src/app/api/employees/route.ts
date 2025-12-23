import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/employees - List all employees for workspace
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get workspace from query params or user's default
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    // Fetch employees
    const { data: employees, error } = await supabase
      .from('employees')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching employees:', error);
      return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
    }

    return NextResponse.json({ employees });
  } catch (error) {
    console.error('Error in GET /api/employees:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/employees - Create a new employee
export async function POST(request: NextRequest) {
  try {
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
      name,
      avatarUrl,
      personaConfig,
      trustConfig,
      knowledgeBaseIds,
    } = body;

    if (!workspaceId || !type || !name || !personaConfig) {
      return NextResponse.json(
        { error: 'Missing required fields: workspaceId, type, name, personaConfig' },
        { status: 400 }
      );
    }

    // Validate employee type
    const validTypes = ['project_manager', 'customer_success', 'sales_dev', 'support', 'executive_assistant'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid employee type' }, { status: 400 });
    }

    // Create employee
    const employeeId = `emp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const { data: employee, error } = await supabase
      .from('employees')
      .insert({
        id: employeeId,
        workspace_id: workspaceId,
        type,
        name,
        avatar_url: avatarUrl,
        persona_config: personaConfig,
        trust_config: trustConfig || {
          defaultLevel: 'requires_approval',
          actionOverrides: {},
          autoApproveThreshold: 0.85,
          escalationRules: [],
        },
        knowledge_base_ids: knowledgeBaseIds || [],
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating employee:', error);
      return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
    }

    return NextResponse.json({ employee }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/employees:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

