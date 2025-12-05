import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
} from '@aibos/notifications';

/**
 * GET /api/notifications/preferences
 * Get notification preferences for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get workspace ID from query params
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    const preferences = await getUserNotificationPreferences(user.id, workspaceId);

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/notifications/preferences
 * Update notification preferences for the current user
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { workspaceId, preferences } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspaceId is required' },
        { status: 400 }
      );
    }

    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json(
        { error: 'preferences object is required' },
        { status: 400 }
      );
    }

    // Validate preference values
    const validPreferences: Record<string, boolean | string | undefined> = {};

    // Boolean preferences
    const booleanFields = [
      'emailEnabled',
      'slackEnabled',
      'inAppEnabled',
      'pushEnabled',
      'weeklyReports',
      'anomalyAlerts',
      'syncNotifications',
      'insightNotifications',
      'systemNotifications',
      'quietHoursEnabled',
      'emailDigestEnabled',
    ];

    for (const field of booleanFields) {
      if (field in preferences && typeof preferences[field] === 'boolean') {
        validPreferences[field] = preferences[field];
      }
    }

    // String preferences
    const stringFields = [
      'anomalySeverityThreshold',
      'quietHoursStart',
      'quietHoursEnd',
      'quietHoursTimezone',
      'emailDigestFrequency',
    ];

    for (const field of stringFields) {
      if (field in preferences && typeof preferences[field] === 'string') {
        validPreferences[field] = preferences[field];
      }
    }

    // Validate specific string values
    if (validPreferences.anomalySeverityThreshold) {
      const validSeverities = ['low', 'medium', 'high', 'critical'];
      if (!validSeverities.includes(validPreferences.anomalySeverityThreshold as string)) {
        return NextResponse.json(
          { error: 'Invalid anomalySeverityThreshold value' },
          { status: 400 }
        );
      }
    }

    if (validPreferences.emailDigestFrequency) {
      const validFrequencies = ['daily', 'weekly'];
      if (!validFrequencies.includes(validPreferences.emailDigestFrequency as string)) {
        return NextResponse.json(
          { error: 'Invalid emailDigestFrequency value' },
          { status: 400 }
        );
      }
    }

    // Validate quiet hours format (HH:MM)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (validPreferences.quietHoursStart && !timeRegex.test(validPreferences.quietHoursStart as string)) {
      return NextResponse.json(
        { error: 'Invalid quietHoursStart format (use HH:MM)' },
        { status: 400 }
      );
    }
    if (validPreferences.quietHoursEnd && !timeRegex.test(validPreferences.quietHoursEnd as string)) {
      return NextResponse.json(
        { error: 'Invalid quietHoursEnd format (use HH:MM)' },
        { status: 400 }
      );
    }

    await updateUserNotificationPreferences(user.id, workspaceId, validPreferences);

    // Return updated preferences
    const updatedPreferences = await getUserNotificationPreferences(user.id, workspaceId);

    return NextResponse.json({
      success: true,
      preferences: updatedPreferences,
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}



