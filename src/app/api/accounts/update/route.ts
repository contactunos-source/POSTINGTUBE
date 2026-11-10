import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, username, displayName, avatarUrl } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing account id' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client not initialized' }, { status: 500 });
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (username) {
      updates.username = username.replace(/^@/, '').trim().toLowerCase();
    }
    if (displayName) {
      updates.display_name = displayName.trim();
    }
    if (avatarUrl) {
      updates.avatar_url = avatarUrl.trim();
    }

    const { data, error } = await supabase
      .from('connected_accounts')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, account: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
