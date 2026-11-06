import { NextResponse } from 'next/server';
import { SubscriptionService, OFFICIAL_PLANS } from '@/lib/subscription';

export async function GET() {
  try {
    const plans = SubscriptionService.getPlans();
    return NextResponse.json({
      success: true,
      plans,
      officialPlans: OFFICIAL_PLANS,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to load plans' },
      { status: 500 }
    );
  }
}
