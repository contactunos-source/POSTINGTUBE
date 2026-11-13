import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const getSupabaseClient = () => {
  if (supabaseServiceKey && supabaseUrl) {
    return createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
  }
  if (supabaseAnonKey && supabaseUrl) {
    return createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
  }
  return null;
};

// GET: Fetch all user feedback for the Owner Super Admin Panel
export async function GET(req: NextRequest) {
  try {
    const client = getSupabaseClient();
    if (!client) {
      return NextResponse.json({ success: true, feedback: [] });
    }

    const { data, error } = await client
      .from('user_feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Feedback API] Query error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      feedback: data || [],
      count: data?.length || 0,
    });
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_')) throw err;
    console.error('[Feedback API] Exception in GET:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch feedback' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a feedback record by ID
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing feedback ID' }, { status: 400 });
    }

    const client = getSupabaseClient();
    if (!client) {
      return NextResponse.json({ success: false, error: 'Database unavailable' }, { status: 500 });
    }

    const { error } = await client.from('user_feedback').delete().eq('id', id);
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Feedback entry deleted' });
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_')) throw err;
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to delete' },
      { status: 500 }
    );
  }
}

// POST: Save user feedback & dispatch notifications
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

    const client = getSupabaseClient();

    // 1. Store feedback record permanently in Supabase database
    let dbSuccess = false;
    let savedRecord: any = null;
    if (client) {
      try {
        const { data, error: dbError } = await client
          .from('user_feedback')
          .insert({
            user_id: userId || null,
            user_email: userEmail || null,
            trying_to_do: tryingToDo.trim(),
            got_in_way: gotInWay.trim(),
            attachment_url: attachmentUrl || null,
            page_url: pageUrl || null,
            user_agent: req.headers.get('user-agent') || null,
            status: 'new',
          })
          .select()
          .single();

        if (dbError) {
          console.warn('[Feedback API] Database insert notice:', dbError);
        } else {
          dbSuccess = true;
          savedRecord = data;
        }
      } catch (insertErr) {
        console.warn('[Feedback API] Database insert exception:', insertErr);
      }
    }

    // 2. Dispatch secure server-side email to all configured owner inboxes
    const rawEmails = process.env.OWNER_EMAILS || process.env.OWNER_EMAIL || 'planposter.team@gmail.com';
    const ownerEmails = rawEmails
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.includes('@'));

    const emailPayload = {
      _subject: `[PlanPoster Issue/Feedback] Report from ${userEmail || 'User'}`,
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

    // Send asynchronously without blocking the user response
    ownerEmails.forEach((email) => {
      try {
        const mailController = new AbortController();
        const mailTimeout = setTimeout(() => mailController.abort(), 6000);

        fetch(`https://formsubmit.co/ajax/${encodeURIComponent(email)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(emailPayload),
          signal: mailController.signal,
        })
          .then((res) => {
            clearTimeout(mailTimeout);
            if (!res.ok) {
              console.warn(`[Feedback API] Mail dispatch to ${email} returned ${res.status}`);
            }
          })
          .catch((mailErr) => {
            clearTimeout(mailTimeout);
            console.warn(`[Feedback API] Mail dispatch notice for ${email}:`, mailErr?.message);
          });
      } catch (e) {}
    });

    return NextResponse.json({
      success: true,
      message: 'Thank you for your feedback! Our team has received your report.',
      stored: dbSuccess,
      feedbackId: savedRecord?.id,
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
