import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Persistent fallback directory for guaranteed admin panel synchronization
const DATA_DIR = path.resolve(process.cwd(), 'src/data');
const SYNCED_USERS_FILE = path.join(DATA_DIR, 'synced_users.json');

function ensureDataFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(SYNCED_USERS_FILE)) {
      fs.writeFileSync(SYNCED_USERS_FILE, JSON.stringify([]), 'utf8');
    }
  } catch (e) {
    console.warn('[UserSyncAPI] Notice creating data dir:', e);
  }
}

export function getSyncedUsersFromFile(): any[] {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(SYNCED_USERS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export function saveSyncedUserToFile(user: any) {
  ensureDataFile();
  try {
    const users = getSyncedUsersFromFile();
    const existingIndex = users.findIndex(
      (u) => u.id === user.id || u.email?.toLowerCase() === user.email?.toLowerCase()
    );

    const record = {
      id: user.id,
      email: user.email,
      full_name: user.fullName || user.full_name || (user.email ? user.email.split('@')[0] : 'Customer'),
      avatar_url: user.avatarUrl || user.avatar_url || '',
      role: user.role || 'customer',
      status: user.status || 'active',
      plan: user.plan || 'free',
      billing_cycle: user.billingCycle || user.billing_cycle || 'monthly',
      payment_status: user.paymentStatus || user.payment_status || 'free',
      country: user.country || 'India',
      city: user.city || '',
      device_category: user.deviceCategory || user.device_category || 'desktop',
      browser: user.browser || 'Chrome',
      os: user.os || 'Windows',
      created_at: user.createdAt || user.created_at || new Date().toISOString(),
      last_active_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      users[existingIndex] = { ...users[existingIndex], ...record, created_at: users[existingIndex].created_at };
    } else {
      users.unshift(record);
    }

    fs.writeFileSync(SYNCED_USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (e) {
    console.warn('[UserSyncAPI] Failed to save user to backup file:', e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, email, fullName, avatarUrl, createdAt } = body;

    if (!id || !email) {
      return NextResponse.json({ error: 'Missing required user parameters (id, email)' }, { status: 400 });
    }

    // 1. Persist to server backup store for guaranteed zero-drop admin visibility
    saveSyncedUserToFile({
      id,
      email,
      fullName,
      avatarUrl,
      createdAt,
    });

    // 2. Persist to Supabase public.user_profiles
    const client = supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
      : (supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } }) : null);

    if (client) {
      try {
        await client.from('user_profiles').upsert(
          {
            id,
            email,
            full_name: fullName || email.split('@')[0],
            avatar_url: avatarUrl || '',
            role: email === (process.env.OWNER_EMAIL || 'onmansonu@gmail.com') ? 'owner' : 'customer',
            status: 'active',
            plan: 'free',
            created_at: createdAt || new Date().toISOString(),
            last_active_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
      } catch (dbErr) {
        console.warn('[UserSyncAPI] Notice upserting to Supabase user_profiles:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'User profile synchronized successfully',
      user: { id, email, fullName },
    });
  } catch (err: any) {
    console.error('[UserSyncAPI] Error synchronizing user:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to synchronize user profile' },
      { status: 500 }
    );
  }
}
