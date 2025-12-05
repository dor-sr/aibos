import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  dismissNotification,
} from '@aibos/notifications';

/**
 * GET /api/notifications
 * Get notifications for the current user
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

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspaceId');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const result = await getNotifications(user.id, {
      workspaceId: workspaceId || undefined,
      limit,
      offset,
      unreadOnly,
    });

    return NextResponse.json({
      notifications: result.notifications,
      unreadCount: result.unreadCount,
      totalCount: result.totalCount,
      hasMore: offset + limit < result.totalCount,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications
 * Perform actions on notifications (mark as read, dismiss, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, notificationId, workspaceId } = body;

    switch (action) {
      case 'markAsRead': {
        if (!notificationId) {
          return NextResponse.json(
            { error: 'notificationId is required' },
            { status: 400 }
          );
        }
        const success = await markNotificationAsRead(notificationId, user.id);
        return NextResponse.json({ success });
      }

      case 'markAllAsRead': {
        const count = await markAllNotificationsAsRead(user.id, workspaceId);
        return NextResponse.json({ success: true, count });
      }

      case 'dismiss': {
        if (!notificationId) {
          return NextResponse.json(
            { error: 'notificationId is required' },
            { status: 400 }
          );
        }
        const success = await dismissNotification(notificationId, user.id);
        return NextResponse.json({ success });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error performing notification action:', error);
    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}
