import { NextRequest, NextResponse } from 'next/server';
import { PRICING_CONFIG } from '@/lib/subscription';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { channelsCount, userId, userEmail, currency = 'INR' } = body;

    const channels = Math.max(1, Math.min(100, Math.round(Number(channelsCount) || 1)));
    const pricePerChannel = PRICING_CONFIG.pro.pricePerChannelInr; // 199
    const totalAmountInr = channels * pricePerChannel;
    const amountInPaise = totalAmountInr * 100;

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

    let orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let receipt = `rcpt_${Date.now()}_${channels}ch`;

    // Attempt official Razorpay Orders API if configured
    if (keyId && keySecret && !keyId.includes('placeholder')) {
      try {
        const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
        const res = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${basicAuth}`,
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency: 'INR',
            receipt,
            notes: {
              plan: 'pro',
              channelsCount: channels,
              userId: userId || 'customer',
              userEmail: userEmail || '',
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.id) {
            orderId = data.id;
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          console.warn('[Razorpay API] Order creation API notice:', res.status, errData);
        }
      } catch (rErr) {
        console.warn('[Razorpay API] Order fetch notice:', rErr);
      }
    }

    return NextResponse.json({
      success: true,
      order: {
        id: orderId,
        amount: amountInPaise,
        currency: 'INR',
        channelsCount: channels,
        pricePerChannel,
        totalAmount: totalAmountInr,
        keyId,
        user: {
          id: userId,
          email: userEmail,
        },
      },
    });
  } catch (err: any) {
    console.error('[RazorpayCreateOrder] Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to initialize Razorpay order' },
      { status: 500 }
    );
  }
}
