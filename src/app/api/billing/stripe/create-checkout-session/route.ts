import { NextRequest, NextResponse } from 'next/server';
import { OFFICIAL_PLANS, PlanId, SubscriptionService } from '@/lib/subscription';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      planId: rawPlanId = 'pro',
      userId,
      userEmail,
      billingInterval = 'monthly',
      currency = 'usd',
    } = body;

    const planId: PlanId = SubscriptionService.normalizePlanId(rawPlanId);
    if (planId === 'free') {
      return NextResponse.json(
        { success: false, error: 'Free plan does not require checkout' },
        { status: 400 }
      );
    }

    const planConfig = OFFICIAL_PLANS[planId];
    const isYearly = billingInterval === 'yearly';
    const isUsd = (currency || 'usd').toLowerCase() === 'usd';
    const unitAmount = isUsd
      ? (isYearly ? planConfig.yearlyPriceUsd : planConfig.priceUsd) * 100
      : (isYearly ? planConfig.yearlyPriceInr : planConfig.priceInr) * 100;

    const stripeKey = process.env.STRIPE_SECRET_KEY || '';
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (!stripeKey || stripeKey.includes('placeholder')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Stripe payments are not configured. Please use Razorpay (INR) or configure STRIPE_SECRET_KEY in server environment.',
        },
        { status: 503 }
      );
    }

    // Call official Stripe Checkout Sessions API directly
    const params = new URLSearchParams();
    params.append('payment_method_types[0]', 'card');
    params.append('mode', 'subscription');
    params.append('success_url', `${origin}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`);
    params.append('cancel_url', `${origin}/pricing?payment=cancelled`);
    params.append('client_reference_id', userId || 'customer');
    if (userEmail) params.append('customer_email', userEmail);
    params.append('metadata[planId]', planId);
    params.append('metadata[userId]', userId || '');
    params.append('metadata[billingInterval]', isYearly ? 'yearly' : 'monthly');
    params.append('metadata[currency]', isUsd ? 'USD' : 'INR');
    params.append('line_items[0][price_data][currency]', isUsd ? 'usd' : 'inr');
    params.append('line_items[0][price_data][product_data][name]', `PostingTube ${planConfig.name} (${planConfig.channelsLimit} Channels)`);
    params.append('line_items[0][price_data][recurring][interval]', isYearly ? 'year' : 'month');
    params.append('line_items[0][price_data][unit_amount]', String(Math.round(unitAmount)));
    params.append('line_items[0][quantity]', '1');

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (stripeRes.ok) {
      const session = await stripeRes.json();
      return NextResponse.json({ success: true, url: session.url, sessionId: session.id });
    } else {
      const err = await stripeRes.json().catch(() => ({}));
      console.error('[StripeCheckout] API error:', err);
      return NextResponse.json(
        { success: false, error: err?.error?.message || 'Failed to create Stripe checkout session' },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error('[StripeCheckout] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to initialize Stripe checkout' },
      { status: 500 }
    );
  }
}
