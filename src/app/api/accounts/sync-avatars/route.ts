import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthoritativeAvatar, mapDbAccountToAccount } from '@/lib/db';
import { mirrorAvatarToPermanentStorage } from '@/lib/avatarStorage';

export async function POST(req: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase client not initialized' }, { status: 500 });
  }

  try {
    let workspaceId: string | null = null;
    try {
      const body = await req.json();
      workspaceId = body?.workspaceId || null;
    } catch {
      workspaceId = req.nextUrl.searchParams.get('workspaceId');
    }

    let query = supabase.from('connected_accounts').select('*');
    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }
    const { data: rows, error } = await query;

    if (error || !Array.isArray(rows)) {
      return NextResponse.json({ error: error?.message || 'Failed to fetch accounts' }, { status: 500 });
    }

    let updatedCount = 0;

    for (const row of rows) {
      let freshAvatar = row.avatar_url;
      const platform = row.platform;
      const pageId = row.page_id || row.id;

      let accessToken = row.access_token;
      if (accessToken && accessToken.startsWith('{') && accessToken.includes('access_token')) {
        try {
          const parsed = JSON.parse(accessToken);
          accessToken = parsed.access_token || accessToken;
        } catch {}
      }

      // 1. YouTube Live Avatar Fetch
      if (platform === 'youtube') {
        const tokenToUse = accessToken;
        if (tokenToUse) {
          try {
            // Check YouTube Data API channels endpoint
            const ytRes = await fetch(
              'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
              { headers: { Authorization: `Bearer ${tokenToUse}` } }
            );
            if (ytRes.ok) {
              const ytData = await ytRes.json();
              const item = ytData.items?.[0];
              const thumb =
                item?.snippet?.thumbnails?.high?.url ||
                item?.snippet?.thumbnails?.medium?.url ||
                item?.snippet?.thumbnails?.default?.url;
              if (thumb) {
                freshAvatar = thumb;
              }
            }

            // Fallback to Google OAuth userinfo picture if channel snippet has no custom thumbnail
            if (!freshAvatar || freshAvatar.includes('unsplash.com')) {
              const uRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${tokenToUse}` },
              });
              if (uRes.ok) {
                const uData = await uRes.json();
                if (uData.picture) {
                  freshAvatar = uData.picture;
                }
              }
            }
          } catch (e) {
            console.warn('[AvatarSync] Error querying YouTube API for channel avatar:', e);
          }
        }
      }

      // 2. Facebook Live Page Avatar Fetch
      if (platform === 'facebook' && pageId) {
        const tokenToUse = accessToken || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
        const cleanId = String(pageId).replace(/^fb_/, '');
        if (tokenToUse && cleanId) {
          try {
            const fbRes = await fetch(
              `https://graph.facebook.com/v20.0/${cleanId}?fields=id,name,picture.type(large)&access_token=${encodeURIComponent(
                tokenToUse
              )}`
            );
            if (fbRes.ok) {
              const fbData = await fbRes.json();
              if (fbData.picture?.data?.url) {
                freshAvatar = fbData.picture.data.url;
              }
            }
          } catch (e) {
            console.warn('[AvatarSync] Error querying Facebook Graph API for page avatar:', e);
          }
        }
        if (!freshAvatar || freshAvatar.includes('unsplash.com')) {
          if (/^\d+$/.test(cleanId)) {
            freshAvatar = `https://graph.facebook.com/${cleanId}/picture?type=large`;
          }
        }
      }

      // 3. Instagram Live Profile Picture Fetch
      if (platform === 'instagram') {
        const tokenToUse = accessToken || process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
        const cleanId = String(pageId || row.id).replace(/^ig_/, '');
        if (tokenToUse) {
          try {
            if (tokenToUse.startsWith('IGA') || tokenToUse.startsWith('IGQ')) {
              // Instagram User Access Token
              const igRes = await fetch(
                `https://graph.instagram.com/me?fields=id,username,profile_picture_url&access_token=${encodeURIComponent(
                  tokenToUse
                )}`
              );
              if (igRes.ok) {
                const igData = await igRes.json();
                if (igData.profile_picture_url) {
                  freshAvatar = igData.profile_picture_url;
                }
              }
            } else if (cleanId) {
              // Meta Page Access Token
              const igRes = await fetch(
                `https://graph.facebook.com/v20.0/${cleanId}?fields=id,username,name,profile_picture_url&access_token=${encodeURIComponent(
                  tokenToUse
                )}`
              );
              if (igRes.ok) {
                const igData = await igRes.json();
                if (igData.profile_picture_url) {
                  freshAvatar = igData.profile_picture_url;
                }
              }
            }
          } catch (e) {
            console.warn('[AvatarSync] Error querying Instagram Graph API for avatar:', e);
          }
        }
      }

      // 4. Mirror remote avatars to permanent Supabase Storage
      if (
        freshAvatar &&
        !freshAvatar.includes('supabase.co/storage') &&
        (freshAvatar.includes('fbcdn.net') ||
          freshAvatar.includes('cdninstagram.com') ||
          freshAvatar.includes('facebook.com') ||
          freshAvatar.includes('googleusercontent.com') ||
          freshAvatar.includes('ggpht.com'))
      ) {
        try {
          const permanentUrl = await mirrorAvatarToPermanentStorage(row.id, freshAvatar);
          if (permanentUrl) {
            freshAvatar = permanentUrl;
          }
        } catch (mErr) {
          console.warn('[AvatarSync] Error mirroring to Supabase Storage:', mErr);
        }
      }

      // Fallback: If still empty or unsplash, resolve authoritative branded avatar
      if (!freshAvatar || freshAvatar.includes('unsplash.com')) {
        freshAvatar = getAuthoritativeAvatar({
          platform: row.platform,
          avatarUrl: '',
          displayName: row.display_name,
          username: row.username,
          pageId: row.page_id,
          id: row.id,
        });
      }

      // If avatar changed or was unsplash, update in Supabase
      if (freshAvatar && freshAvatar !== row.avatar_url) {
        const { error: updateErr } = await supabase
          .from('connected_accounts')
          .update({
            avatar_url: freshAvatar,
            updated_at: new Date().toISOString(),
          })
          .eq('id', row.id);

        if (!updateErr) {
          updatedCount++;
        }
      }
    }

    // Return the updated accounts for this workspace
    let retQuery = supabase.from('connected_accounts').select('*');
    if (workspaceId) {
      retQuery = retQuery.eq('workspace_id', workspaceId);
    }
    const { data: updatedRows } = await retQuery;
    const mapped = (updatedRows || []).map(mapDbAccountToAccount);

    return NextResponse.json({
      success: true,
      updatedCount,
      accounts: mapped,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to sync account avatars';
    console.error('[AvatarSync] Exception:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
