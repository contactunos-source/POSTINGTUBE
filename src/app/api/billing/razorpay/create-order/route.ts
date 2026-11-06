import { NextRequest, NextResponse } from 'next/server';
import { OFFICIAL_PLANS, PlanId, SubscriptionService } from '@/lib/subscription';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { planId: rawPlanId, userId, userEmail } = body;

    const planId = SubscriptionService.normalizePlanId(rawPlanId);
    if (planId === 'free') {
      return NextResponse.json(
        { success: false, error: 'Free plan does not require checkout' },
        { status: 400 }
      );
    }

    const planConfig = OFFICIAL_PLANS[planId];
    if (!planConfig) {
      return NextResponse.json(
        { success: false, error: `Invalid plan specified: ${rawPlanId}` },
        { status: 400 }
      );
    }

    const totalAmountInr = planConfig.priceInr;
    const amountInPaise = totalAmountInr * 100;

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

    let orderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const receipt = `rcpt_${planId}_${Date.now()}`.slice(0, 40);

    // Call official Razorpay Orders API if configured
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
              planId,
              planName: planConfig.name,
              channelsLimit: planConfig.channelsLimit,
              billingInterval: 'monthly',
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
          console.warn('[Razorpay API] Order creation notice:', res.status, errData);
        }
      } catch (rErr) {
        console.warn('[Razorpay API] Order request notice:', rErr);
      }
    }

    return NextResponse.json({
      success: true,
      order: {
        id: orderId,
        amount: amountInPaise,
        currency: 'INR',
        planId,
        planName: planConfig.name,
        channelsLimit: planConfig.channelsLimit,
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
