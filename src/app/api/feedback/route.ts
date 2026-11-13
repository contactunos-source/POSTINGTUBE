import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const OWNER_EMAIL = process.env.OWNER_EMAIL || 'planposter.team@gmail.com';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tryingToDo, gotInWay, attachmentUrl, pageUrl, userId, userEmail } = body;

    if (!tryingToDo?.trim() || !gotInWay?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Please answer both questions before submitting.' },
        { status: 400 }
      );
    }

    const client = supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
      : (supabaseUrl && supabaseAnonKey
          ? createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } })
          : null);

    // 1. Store feedback record permanently in Supabase database
    let dbSuccess = false;
    if (client) {
      try {
        const { error: dbError } = await client.from('user_feedback').insert({
          user_id: userId || null,
          user_email: userEmail || null,
          trying_to_do: tryingToDo.trim(),
          got_in_way: gotInWay.trim(),
          attachment_url: attachmentUrl || null,
          page_url: pageUrl || null,
          user_agent: req.headers.get('user-agent') || null,
        });

        if (dbError) {
          console.warn('[Feedback API] Database insert notice:', dbError);
        } else {
          dbSuccess = true;
        }
      } catch (insertErr) {
        console.warn('[Feedback API] Database insert exception:', insertErr);
      }
    }

    // 2. Dispatch secure server-side email to owner without exposing email to client
    try {
      const emailPayload = {
        _subject: `[PlanPoster Feedback] New User Report from ${userEmail || 'User'}`,
        _template: 'table',
        _captcha: 'false',
        'What were you trying to do': tryingToDo.trim(),
        'What got in your way, and what might help': gotInWay.trim(),
        'Attachment / Screenshot': attachmentUrl || 'None',
        'Submitted From Page': pageUrl || 'PlanPoster Dashboard',
        'User Email': userEmail || 'Not provided',
        'User ID': userId || 'Guest',
        'Submitted At': new Date().toLocaleString('en-US', { timeZoneName: 'short' }),
      };

      const mailController = new AbortController();
      const mailTimeout = setTimeout(() => mailController.abort(), 6000);

      fetch(`https://formsubmit.co/ajax/${encodeURIComponent(OWNER_EMAIL)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(emailPayload),
        signal: mailController.signal,
      })
        .then(async (res) => {
          clearTimeout(mailTimeout);
          if (!res.ok) {
            console.warn('[Feedback API] Mail forwarder status:', res.status);
          }
        })
        .catch((mailErr) => {
          clearTimeout(mailTimeout);
          console.warn('[Feedback API] Mail dispatch notice:', mailErr?.message);
        });
    } catch (mailDispatchErr) {
      console.warn('[Feedback API] Mail dispatch exception:', mailDispatchErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for your feedback! Our team has received your report.',
      stored: dbSuccess,
    });
  } catch (error: any) {
    if (error?.digest?.startsWith('NEXT_')) throw error;
    console.error('[Feedback API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}
