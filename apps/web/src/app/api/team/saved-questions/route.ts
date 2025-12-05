import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@aibos/data-model';
import {
  workspaceMemberships,
  savedQuestions,
  activityLogs,
} from '@aibos/data-model/schema';
import { eq, and, or, desc, sql } from 'drizzle-orm';

function generateId(): string {
  return crypto.randomUUID();
}

// GET /api/team/saved-questions - Get saved questions
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const agentType = searchParams.get('agentType');
    const includeShared = searchParams.get('includeShared') !== 'false';

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
    }

    // Verify user has access to this workspace
    const userMembership = await db.query.workspaceMemberships.findFirst({
      where: and(
        eq(workspaceMemberships.userId, user.id),
        eq(workspaceMemberships.workspaceId, workspaceId)
      ),
    });

    if (!userMembership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Build query conditions
    const conditions = [eq(savedQuestions.workspaceId, workspaceId)];

    // User can see their own questions and shared questions
    if (includeShared) {
      conditions.push(
        or(eq(savedQuestions.userId, user.id), eq(savedQuestions.isShared, true))!
      );
    } else {
      conditions.push(eq(savedQuestions.userId, user.id));
    }

    if (agentType) {
      conditions.push(eq(savedQuestions.agentType, agentType));
    }

    const questions = await db.query.savedQuestions.findMany({
      where: and(...conditions),
      orderBy: [desc(savedQuestions.isPinned), desc(savedQuestions.updatedAt)],
    });

    // Format response
    const formattedQuestions = questions.map((q) => ({
      ...q,
      isOwn: q.userId === user.id,
    }));

    return NextResponse.json({ questions: formattedQuestions });
  } catch (error) {
    console.error('Error fetching saved questions:', error);
    return NextResponse.json({ error: 'Failed to fetch saved questions' }, { status: 500 });
  }
}

// POST /api/team/saved-questions - Save a new question
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { workspaceId, title, question, response, agentType = 'analytics', isShared = false } =
      body;

    if (!workspaceId || !title || !question) {
      return NextResponse.json(
        { error: 'Workspace ID, title, and question are required' },
        { status: 400 }
      );
    }

    // Verify user has access to this workspace
    const userMembership = await db.query.workspaceMemberships.findFirst({
      where: and(
        eq(workspaceMemberships.userId, user.id),
        eq(workspaceMemberships.workspaceId, workspaceId)
      ),
    });

    if (!userMembership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Create the saved question
    const questionId = generateId();
    const insertedQuestions = await db
      .insert(savedQuestions)
      .values({
        id: questionId,
        workspaceId,
        userId: user.id,
        title,
        question,
        response,
        agentType,
        isShared,
      })
      .returning();

    const savedQuestion = insertedQuestions[0];

    // Log the activity
    await db.insert(activityLogs).values({
      id: generateId(),
      workspaceId,
      userId: user.id,
      action: 'resource.question_saved',
      resourceType: 'question',
      resourceId: questionId,
      resourceName: title,
      metadata: {
        agentType,
        isShared,
      },
    });

    return NextResponse.json({ question: savedQuestion }, { status: 201 });
  } catch (error) {
    console.error('Error saving question:', error);
    return NextResponse.json({ error: 'Failed to save question' }, { status: 500 });
  }
}

// PATCH /api/team/saved-questions - Update a saved question
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { workspaceId, questionId, title, isShared, isPinned } = body;

    if (!workspaceId || !questionId) {
      return NextResponse.json(
        { error: 'Workspace ID and question ID are required' },
        { status: 400 }
      );
    }

    // Get the question
    const question = await db.query.savedQuestions.findFirst({
      where: and(
        eq(savedQuestions.id, questionId),
        eq(savedQuestions.workspaceId, workspaceId)
      ),
    });

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Only owner can edit
    if (question.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Build update object
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (title !== undefined) updates.title = title;
    if (isShared !== undefined) updates.isShared = isShared;
    if (isPinned !== undefined) updates.isPinned = isPinned;

    // Update
    const updatedQuestions = await db
      .update(savedQuestions)
      .set(updates)
      .where(eq(savedQuestions.id, questionId))
      .returning();

    // Log sharing activity
    if (isShared !== undefined && isShared !== question.isShared) {
      await db.insert(activityLogs).values({
        id: generateId(),
        workspaceId,
        userId: user.id,
        action: isShared ? 'resource.shared' : 'resource.unshared',
        resourceType: 'question',
        resourceId: questionId,
        resourceName: question.title,
      });
    }

    return NextResponse.json({ question: updatedQuestions[0] });
  } catch (error) {
    console.error('Error updating saved question:', error);
    return NextResponse.json({ error: 'Failed to update question' }, { status: 500 });
  }
}

// DELETE /api/team/saved-questions - Delete a saved question
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { workspaceId, questionId } = body;

    if (!workspaceId || !questionId) {
      return NextResponse.json(
        { error: 'Workspace ID and question ID are required' },
        { status: 400 }
      );
    }

    // Get the question
    const question = await db.query.savedQuestions.findFirst({
      where: and(
        eq(savedQuestions.id, questionId),
        eq(savedQuestions.workspaceId, workspaceId)
      ),
    });

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Only owner can delete
    if (question.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Delete
    await db.delete(savedQuestions).where(eq(savedQuestions.id, questionId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting saved question:', error);
    return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 });
  }
}
