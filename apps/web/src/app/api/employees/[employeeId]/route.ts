import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/employees/[employeeId] - Get employee details
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

    // Fetch employee
    const { data: employee, error } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .single();

    if (error || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json({ employee });
  } catch (error) {
    console.error('Error in GET /api/employees/[employeeId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/employees/[employeeId] - Update employee
export async function PATCH(
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
    const updateFields: Record<string, unknown> = {};

    // Only update provided fields
    if (body.name !== undefined) updateFields.name = body.name;
    if (body.avatarUrl !== undefined) updateFields.avatar_url = body.avatarUrl;
    if (body.personaConfig !== undefined) updateFields.persona_config = body.personaConfig;
    if (body.trustConfig !== undefined) updateFields.trust_config = body.trustConfig;
    if (body.knowledgeBaseIds !== undefined) updateFields.knowledge_base_ids = body.knowledgeBaseIds;
    if (body.status !== undefined) updateFields.status = body.status;

    updateFields.updated_at = new Date().toISOString();

    const { data: employee, error } = await supabase
      .from('employees')
      .update(updateFields)
      .eq('id', employeeId)
      .select()
      .single();

    if (error) {
      console.error('Error updating employee:', error);
      return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
    }

    return NextResponse.json({ employee });
  } catch (error) {
    console.error('Error in PATCH /api/employees/[employeeId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/employees/[employeeId] - Delete employee
export async function DELETE(
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

    // Archive employee instead of hard delete
    const { error } = await supabase
      .from('employees')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', employeeId);

    if (error) {
      console.error('Error archiving employee:', error);
      return NextResponse.json({ error: 'Failed to archive employee' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/employees/[employeeId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

