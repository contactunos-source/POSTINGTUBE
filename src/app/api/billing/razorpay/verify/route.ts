import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { SubscriptionService, PRICING_CONFIG } from '@/lib/subscription';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      channelsCount = 1,
      userId = '',
      userEmail = '',
      amount = 0,
      billingInterval = 'monthly',
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required Razorpay payment parameters.' },
        { status: 400 }
      );
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

    // Verify HMAC SHA256 Signature if secret exists
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
    }

    const validatedChannels = Math.max(1, Math.min(100, Math.round(Number(channelsCount) || 1)));
    const totalAmount = amount || (validatedChannels * PRICING_CONFIG.pro.pricePerChannelInr);

    // 1. Activate Pro Subscription in Supabase & local store
    const subscription = await SubscriptionService.activateProSubscription({
      userId: userId || 'customer',
      userEmail: userEmail || undefined,
      channelsCount: validatedChannels,
      currency: 'INR',
      provider: 'razorpay',
      providerPaymentId: razorpay_payment_id,
      providerOrderId: razorpay_order_id,
      amount: totalAmount,
      billingInterval: billingInterval === 'yearly' ? 'yearly' : 'monthly',
    });

    // 2. Record Succeeded Payment Transaction
    await SubscriptionService.recordTransaction({
      userId: userId || 'customer',
      userEmail: userEmail || undefined,
      subscriptionId: subscription.id,
      amount: totalAmount,
      currency: 'INR',
      provider: 'razorpay',
      providerPaymentId: razorpay_payment_id,
      providerOrderId: razorpay_order_id,
      status: 'succeeded',
      paymentMethod: 'razorpay_netbanking_or_upi_or_card',
    });

    return NextResponse.json({
      success: true,
      message: `Successfully upgraded to Pro with ${validatedChannels} channels!`,
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
