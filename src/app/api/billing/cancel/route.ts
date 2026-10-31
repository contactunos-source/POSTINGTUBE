import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService } from '@/lib/subscription';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, email } = body;

    if (!userId && !email) {
      return NextResponse.json({ success: false, error: 'User identifier required' }, { status: 400 });
    }

    const result = await SubscriptionService.cancelSubscription(userId, email);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[BillingCancelAPI] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
