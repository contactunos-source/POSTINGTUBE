import { NextRequest, NextResponse } from 'next/server';
import { SubscriptionService, PRICING_CONFIG } from '@/lib/subscription';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId, email, newChannelsCount } = body;

    if (!userId && !email) {
      return NextResponse.json({ success: false, error: 'User identifier required' }, { status: 400 });
    }

    const currentSub = await SubscriptionService.getUserSubscription(userId, email);
    if (currentSub.planId !== 'pro' || currentSub.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Only active Pro subscribers can modify channel capacity.' },
        { status: 400 }
      );
    }

    const channels = Math.max(1, Math.min(100, Math.round(Number(newChannelsCount) || 1)));
    const pricePerChannel = currentSub.currency === 'USD'
      ? PRICING_CONFIG.pro.pricePerChannelUsd
      : PRICING_CONFIG.pro.pricePerChannelInr;
    const newAmount = channels * pricePerChannel;

    const updated = await SubscriptionService.activateProSubscription({
      userId: currentSub.userId,
      userEmail: currentSub.userEmail || email,
      channelsCount: channels,
      currency: currentSub.currency,
      provider: currentSub.provider === 'manual' ? 'razorpay' : currentSub.provider,
      providerPaymentId: currentSub.providerPaymentId || `chg_${Date.now()}`,
      providerOrderId: currentSub.providerOrderId,
      amount: newAmount,
    });

    return NextResponse.json({
      success: true,
      message: `Your channel capacity has been updated to ${channels} channels (${currentSub.currency === 'USD' ? '$' : '₹'}${newAmount}/mo).`,
      subscription: updated,
    });
  } catch (err: any) {
    console.error('[ChangeChannelsAPI] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to update channel capacity' },
      { status: 500 }
    );
  }
}
