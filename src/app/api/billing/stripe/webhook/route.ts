import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { SubscriptionService, OFFICIAL_PLANS, PlanId } from '@/lib/subscription';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const sigHeader = req.headers.get('stripe-signature') || '';
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    // Verify Stripe signature if secret is available
    if (webhookSecret && sigHeader) {
      const parts = sigHeader.split(',').reduce((acc: Record<string, string>, part: string) => {
        const [k, v] = part.trim().split('=');
        if (k && v) acc[k] = v;
        return acc;
      }, {});

      const t = parts['t'];
      const v1 = parts['v1'];

      if (t && v1) {
        const signedPayload = `${t}.${rawBody}`;
        const expectedSignature = crypto
          .createHmac('sha256', webhookSecret)
          .update(signedPayload)
          .digest('hex');

        if (expectedSignature !== v1) {
          console.warn('[StripeWebhook] Signature mismatch');
          return NextResponse.json({ error: 'Invalid Stripe signature' }, { status: 400 });
        }
      }
    }

    const event = JSON.parse(rawBody);
    const eventId = event.id;
    const eventType = event.type;
    const session = event.data?.object || {};

    console.log(`[StripeWebhook] Processing event: ${eventType} (${eventId})`);

    // Webhook Idempotency Check in Supabase
    if (supabase) {
      try {
        const { data: existingEvent } = await supabase
          .from('payment_webhook_events')
          .select('id')
          .eq('event_id', eventId)
          .maybeSingle();

        if (existingEvent) {
          console.log(`[StripeWebhook] Event ${eventId} already processed, skipping duplicate.`);
          return NextResponse.json({ status: 'ok', message: 'Duplicate event skipped' });
        }

        await supabase.from('payment_webhook_events').insert({
          event_id: eventId,
          provider: 'stripe',
          event_type: eventType,
          payload: event,
          status: 'processing',
        });
      } catch (err) {
        console.warn('[StripeWebhook] Idempotency record warning:', err);
      }
    }

    if (eventType === 'checkout.session.completed') {
      const metadata = session.metadata || {};
      const planId: PlanId = SubscriptionService.normalizePlanId(metadata.planId || 'pro');
      const userId = session.client_reference_id || metadata.userId || session.customer_email || 'customer';
      const email = session.customer_email || session.customer_details?.email;
      const amount = Number(session.amount_total || 0) / 100 || OFFICIAL_PLANS[planId].priceInr;

      await SubscriptionService.activateSubscription({
        userId,
        userEmail: email,
        planId,
        currency: (session.currency || 'inr').toUpperCase() as any,
        provider: 'stripe',
        providerPaymentId: session.payment_intent || session.id,
        providerSubscriptionId: session.subscription,
        customerId: session.customer,
        amount,
      });

      await SubscriptionService.recordTransaction({
        userId,
        userEmail: email,
        planId,
        amount,
        currency: (session.currency || 'inr').toUpperCase() as any,
        provider: 'stripe',
        providerPaymentId: session.payment_intent || session.id,
        status: 'succeeded',
        paymentMethod: 'card',
      });

      if (supabase) {
        try {
          await supabase
            .from('payment_webhook_events')
            .update({ status: 'completed', processed_at: new Date().toISOString() })
            .eq('event_id', eventId);
        } catch {}
      }
    }

    return NextResponse.json({ status: 'ok', received: true });
  } catch (err: any) {
    console.error('[StripeWebhook] Processing error:', err);
    return NextResponse.json({ error: err?.message || 'Webhook failed' }, { status: 500 });
  }
}
