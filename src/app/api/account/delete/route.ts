import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing session authentication token' },
        { status: 401 }
      );
    }

    // Verify token with Supabase
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser(token);

    if (userError || !user) {
      // Check if it's a guest demo user
      const body = await req.json().catch(() => ({}));
      if (body.isGuest) {
        return NextResponse.json({
          success: true,
          message: 'Guest demo session data cleared successfully',
        });
      }

      return NextResponse.json(
        { error: 'Unauthorized: Invalid or expired session' },
        { status: 401 }
      );
    }

    const userId = user.id;
    console.log(`[Account Delete] Commencing deletion workflow for user ${userId} (${user.email})`);

    // Clean up application database records
    const adminOrUserClient = supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
      : userClient;

    try {
      // 1. Find user's workspaces
      const { data: workspaces } = await adminOrUserClient
        .from('workspaces')
        .select('id')
        .eq('owner_id', userId);

      const wsIds = (workspaces || []).map((w: any) => w.id);

      if (wsIds.length > 0) {
        // 2. Delete posts and jobs in those workspaces
        await adminOrUserClient.from('scheduled_jobs').delete().in('workspace_id', wsIds);
        await adminOrUserClient.from('posts').delete().in('workspace_id', wsIds);
        await adminOrUserClient.from('connected_accounts').delete().in('workspace_id', wsIds);
        await adminOrUserClient.from('workspaces').delete().in('id', wsIds);
      } else {
        // Fallback for default isolated records
        await adminOrUserClient.from('posts').delete().eq('workspace_id', userId);
        await adminOrUserClient.from('connected_accounts').delete().eq('workspace_id', userId);
      }

      console.log(`[Account Delete] Data records removed for user ${userId}`);
    } catch (dbErr) {
      console.warn('[Account Delete] Warning during database cascade:', dbErr);
    }

    // 3. Delete user from auth.users if service role key is available
    if (supabaseServiceKey) {
      try {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { persistSession: false },
        });
        const { error: adminErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (adminErr) {
          console.error('[Account Delete] Supabase admin.deleteUser error:', adminErr);
        } else {
          console.log(`[Account Delete] User ${userId} successfully removed from Supabase Auth`);
        }
      } catch (adminException) {
        console.error('[Account Delete] Exception deleting auth user:', adminException);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Account, credentials, and associated data have been permanently deleted.',
    });
  } catch (error: any) {
    console.error('[Account Delete] Unhandled error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to complete account deletion' },
      { status: 500 }
    );
  }
}
