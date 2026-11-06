import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { SubscriptionService, OFFICIAL_PLANS, PlanId } from '@/lib/subscription';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || '';
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

    // Verify webhook signature if secret configured
    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        console.warn('[RazorpayWebhook] Invalid webhook signature');
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
      }
    }

    const event = JSON.parse(rawBody);
    const eventId = event.event_id || event.id || `${event.event}_${Date.now()}`;
    const eventType = event.event;
    const payload = event.payload?.payment?.entity || event.payload?.order?.entity || {};

    console.log(`[RazorpayWebhook] Processing event: ${eventType} (${eventId})`);

    // Webhook Idempotency Check in Supabase
    if (supabase) {
      try {
        const { data: existingEvent } = await supabase
          .from('payment_webhook_events')
          .select('id')
          .eq('event_id', eventId)
          .maybeSingle();

        if (existingEvent) {
          console.log(`[RazorpayWebhook] Event ${eventId} already processed, skipping duplicate.`);
          return NextResponse.json({ status: 'ok', message: 'Duplicate event skipped' });
        }

        // Record incoming webhook event
        await supabase.from('payment_webhook_events').insert({
          event_id: eventId,
          provider: 'razorpay',
          event_type: eventType,
          payload: event,
          status: 'processing',
        });
      } catch (err) {
        console.warn('[RazorpayWebhook] Idempotency record warning:', err);
      }
    }

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const notes = payload.notes || {};
      const planId: PlanId = SubscriptionService.normalizePlanId(notes.planId || notes.plan || 'pro');
      const userId = notes.userId || payload.email || 'customer';
      const email = notes.userEmail || payload.email;
      const amount = Number(payload.amount || 0) / 100 || OFFICIAL_PLANS[planId].priceInr;

      await SubscriptionService.activateSubscription({
        userId,
        userEmail: email,
        planId,
        currency: 'INR',
        provider: 'razorpay',
        providerPaymentId: payload.id || `pay_${Date.now()}`,
        providerOrderId: payload.order_id,
        amount,
      });

      await SubscriptionService.recordTransaction({
        userId,
        userEmail: email,
        planId,
        amount,
        currency: 'INR',
        provider: 'razorpay',
        providerPaymentId: payload.id || `pay_${Date.now()}`,
        providerOrderId: payload.order_id,
        status: 'succeeded',
        paymentMethod: payload.method || 'card',
      });

      if (supabase) {
        try {
          await supabase
            .from('payment_webhook_events')
            .update({ status: 'completed', processed_at: new Date().toISOString() })
            .eq('event_id', eventId);
        } catch {}
      }
    } else if (eventType === 'payment.failed') {
      const notes = payload.notes || {};
      const planId: PlanId = SubscriptionService.normalizePlanId(notes.planId || notes.plan || 'pro');
      await SubscriptionService.recordTransaction({
        userId: notes.userId || payload.email || 'customer',
        userEmail: notes.userEmail || payload.email,
        planId,
        amount: Number(payload.amount || 0) / 100,
        currency: 'INR',
        provider: 'razorpay',
        providerPaymentId: payload.id || `fail_${Date.now()}`,
        providerOrderId: payload.order_id,
        status: 'failed',
        errorCode: payload.error_code,
        errorDescription: payload.error_description,
      });

      if (supabase) {
        try {
          await supabase
            .from('payment_webhook_events')
            .update({ status: 'failed', processed_at: new Date().toISOString() })
            .eq('event_id', eventId);
        } catch {}
      }
    }

    return NextResponse.json({ status: 'ok', received: true });
  } catch (err: any) {
    console.error('[RazorpayWebhook] Processing error:', err);
    return NextResponse.json(
      { error: err?.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
