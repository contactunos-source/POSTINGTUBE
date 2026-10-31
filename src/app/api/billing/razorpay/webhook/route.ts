import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { SubscriptionService } from '@/lib/subscription';

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
    const eventType = event.event;
    const payload = event.payload?.payment?.entity || event.payload?.order?.entity || {};

    console.log(`[RazorpayWebhook] Received event: ${eventType}`);

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const notes = payload.notes || {};
      const channels = Number(notes.channelsCount || 1);
      const userId = notes.userId || payload.email || 'customer';
      const email = notes.userEmail || payload.email;
      const amount = Number(payload.amount || 0) / 100;

      await SubscriptionService.activateProSubscription({
        userId,
        userEmail: email,
        channelsCount: channels,
        currency: 'INR',
        provider: 'razorpay',
        providerPaymentId: payload.id || `pay_${Date.now()}`,
        providerOrderId: payload.order_id,
        amount,
      });

      await SubscriptionService.recordTransaction({
        userId,
        userEmail: email,
        amount,
        currency: 'INR',
        provider: 'razorpay',
        providerPaymentId: payload.id || `pay_${Date.now()}`,
        providerOrderId: payload.order_id,
        status: 'succeeded',
        paymentMethod: payload.method || 'card',
      });
    } else if (eventType === 'payment.failed') {
      const notes = payload.notes || {};
      await SubscriptionService.recordTransaction({
        userId: notes.userId || payload.email || 'customer',
        userEmail: notes.userEmail || payload.email,
        amount: Number(payload.amount || 0) / 100,
        currency: 'INR',
        provider: 'razorpay',
        providerPaymentId: payload.id || `fail_${Date.now()}`,
        providerOrderId: payload.order_id,
        status: 'failed',
        errorCode: payload.error_code,
        errorDescription: payload.error_description,
      });
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
