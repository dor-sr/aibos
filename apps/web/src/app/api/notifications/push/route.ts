import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  savePushSubscription,
  removePushSubscription,
  getVapidPublicKey,
} from '@aibos/notifications';

/**
 * GET /api/notifications/push
 * Get VAPID public key for push subscription
 */
export async function GET() {
  try {
    const vapidPublicKey = getVapidPublicKey();

    if (!vapidPublicKey) {
      return NextResponse.json(
        { error: 'Push notifications not configured' },
        { status: 503 }
      );
    }

    return NextResponse.json({ vapidPublicKey });
  } catch (error) {
    console.error('Error getting VAPID key:', error);
    return NextResponse.json(
      { error: 'Failed to get push configuration' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notifications/push
 * Subscribe to push notifications
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
    const { subscription, deviceInfo } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    if (!subscription.keys.p256dh || !subscription.keys.auth) {
      return NextResponse.json(
        { error: 'Missing subscription keys' },
        { status: 400 }
      );
    }

    const savedSubscription = await savePushSubscription(
      user.id,
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
      {
        userAgent: deviceInfo?.userAgent,
        deviceName: deviceInfo?.deviceName,
      }
    );

    return NextResponse.json({
      success: true,
      subscriptionId: savedSubscription.id,
    });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json(
      { error: 'Failed to save push subscription' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/push
 * Unsubscribe from push notifications
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400 }
      );
    }

    const success = await removePushSubscription(user.id, endpoint);

    return NextResponse.json({ success });
  } catch (error) {
    console.error('Error removing push subscription:', error);
    return NextResponse.json(
      { error: 'Failed to remove push subscription' },
      { status: 500 }
    );
  }
}






