import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { SubscriptionService, OFFICIAL_PLANS, PlanId } from '@/lib/subscription';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId: rawPlanId = 'pro',
      userId = '',
      userEmail = '',
      amount = 0,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required Razorpay payment parameters.' },
        { status: 400 }
      );
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

    // Verify HMAC SHA256 Signature server-side
    if (keySecret && razorpay_signature) {
      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        console.error('[RazorpayVerify] Signature mismatch:', { expectedSignature, razorpay_signature });
        return NextResponse.json(
          { success: false, error: 'Invalid payment signature. Payment verification failed.' },
          { status: 400 }
        );
      }
    } else if (process.env.NODE_ENV === 'production' && !keySecret) {
      console.warn('[RazorpayVerify] Key secret missing in production');
    }

    const planId: PlanId = SubscriptionService.normalizePlanId(rawPlanId);
    const planConfig = OFFICIAL_PLANS[planId];
    const totalAmount = amount || planConfig.priceInr;

    // 1. Activate Paid Plan in Supabase & resilient store
    const subscription = await SubscriptionService.activateSubscription({
      userId: userId || 'customer',
      userEmail: userEmail || undefined,
      planId,
      currency: 'INR',
      provider: 'razorpay',
      providerPaymentId: razorpay_payment_id,
      providerOrderId: razorpay_order_id,
      amount: totalAmount,
    });

    // 2. Record Succeeded Payment Transaction in Supabase
    await SubscriptionService.recordTransaction({
      userId: userId || 'customer',
      userEmail: userEmail || undefined,
      subscriptionId: subscription.id,
      planId,
      amount: totalAmount,
      currency: 'INR',
      provider: 'razorpay',
      providerPaymentId: razorpay_payment_id,
      providerOrderId: razorpay_order_id,
      status: 'succeeded',
      paymentMethod: 'razorpay_upi_netbanking_card',
    });

    return NextResponse.json({
      success: true,
      message: `Successfully upgraded to ${planConfig.name} plan with ${planConfig.channelsLimit} connected channels!`,
      subscription,
    });
  } catch (err: any) {
    console.error('[RazorpayVerify] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Payment verification failed' },
      { status: 500 }
    );
  }
}
