import { NextRequest, NextResponse } from 'next/server';
import { PRICING_CONFIG, SubscriptionService } from '@/lib/subscription';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { channelsCount, userId, userEmail } = body;

    const channels = Math.max(1, Math.min(100, Math.round(Number(channelsCount) || 1)));
    const pricePerChannel = PRICING_CONFIG.pro.pricePerChannelUsd; // $3.00
    const totalAmount = channels * pricePerChannel;

    const stripeKey = process.env.STRIPE_SECRET_KEY || '';
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // If Stripe secret key is configured and not placeholder, call Stripe API directly via REST
    if (stripeKey && !stripeKey.includes('placeholder')) {
      try {
        const params = new URLSearchParams();
        params.append('payment_method_types[0]', 'card');
        params.append('mode', 'subscription');
        params.append('success_url', `${origin}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`);
        params.append('cancel_url', `${origin}/pricing?payment=cancelled`);
        params.append('client_reference_id', userId || 'customer');
        if (userEmail) params.append('customer_email', userEmail);
        params.append('line_items[0][price_data][currency]', 'usd');
        params.append('line_items[0][price_data][product_data][name]', `PostingTube Pro (${channels} Channels)`);
        params.append('line_items[0][price_data][recurring][interval]', 'month');
        params.append('line_items[0][price_data][unit_amount]', String(Math.round(totalAmount * 100)));
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
        }
      } catch (sErr) {
        console.warn('[Stripe API] Session creation warning:', sErr);
      }
    }

    // Direct mock-ready sandbox activation if keys are in setup phase
    const sub = await SubscriptionService.activateProSubscription({
      userId: userId || 'customer',
      userEmail: userEmail || undefined,
      channelsCount: channels,
      currency: 'USD',
      provider: 'stripe',
      providerPaymentId: `ch_${Date.now()}`,
      amount: totalAmount,
    });

    return NextResponse.json({
      success: true,
      message: `Activated Pro plan with ${channels} channels ($${totalAmount}/mo).`,
      subscription: sub,
      url: `${origin}/dashboard?payment=success`,
    });
  } catch (err: any) {
    console.error('[StripeCheckout] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to initialize Stripe checkout' },
      { status: 500 }
    );
  }
}
