import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { mirrorAvatarToPermanentStorage } from '@/lib/avatarStorage';

const BUCKET_NAME = 'postingtube-media';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Missing account id' }, { status: 400 });
  }

  if (id === 'ig_27268941606137076' || id.includes('27268941606137076')) {
    return NextResponse.redirect(
      'https://mdykqpqhuwfpondyqnms.supabase.co/storage/v1/object/public/postingtube-media/avatars/planposterofficial.png',
      {
        status: 307,
        headers: {
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        },
      }
    );
  }

  const filename = `avatars/${id}.jpg`;
  let matchedAccount: any = null;

  if (supabase) {
    try {
      // 1. Check if already present in Supabase Storage
      const { data: pubData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filename);
      if (pubData?.publicUrl) {
        // Quick HEAD check if file exists in bucket
        const headRes = await fetch(pubData.publicUrl, { method: 'HEAD' });
        if (headRes.ok) {
          return NextResponse.redirect(pubData.publicUrl, {
            status: 307,
            headers: {
              'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
            },
          });
        }
      }

      // 2. Query database for account details & access tokens
      const { data: account } = await supabase
        .from('connected_accounts')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      matchedAccount = account;

      if (account) {
        let token = account.access_token;
        if (token && token.startsWith('{') && token.includes('access_token')) {
          try {
            token = JSON.parse(token).access_token || token;
          } catch {}
        }

        let freshAvatarUrl: string | null = null;

        // Instagram
        if (account.platform === 'instagram' && token) {
          if (token.startsWith('IGA') || token.startsWith('IGQ')) {
            const igRes = await fetch(
              `https://graph.instagram.com/me?fields=id,username,profile_picture_url&access_token=${encodeURIComponent(
                token
              )}`
            );
            if (igRes.ok) {
              const data = await igRes.json();
              freshAvatarUrl = data.profile_picture_url || null;
            }
          } else {
            const cleanPageId = String(account.page_id || account.id).replace(/^ig_/, '');
            const igRes = await fetch(
              `https://graph.facebook.com/v20.0/${cleanPageId}?fields=id,username,name,profile_picture_url&access_token=${encodeURIComponent(
                token
              )}`
            );
            if (igRes.ok) {
              const data = await igRes.json();
              freshAvatarUrl = data.profile_picture_url || null;
            }
          }
        }

        // Facebook
        if (account.platform === 'facebook') {
          const cleanPageId = String(account.page_id || account.id).replace(/^fb_/, '');
          if (token && cleanPageId) {
            const fbRes = await fetch(
              `https://graph.facebook.com/v20.0/${cleanPageId}?fields=id,name,picture.type(large)&access_token=${encodeURIComponent(
                token
              )}`
            );
            if (fbRes.ok) {
              const data = await fbRes.json();
              freshAvatarUrl = data.picture?.data?.url || null;
            }
          }
          if (!freshAvatarUrl && /^\d+$/.test(cleanPageId)) {
            freshAvatarUrl = `https://graph.facebook.com/${cleanPageId}/picture?type=large`;
          }
        }

        // YouTube
        if (account.platform === 'youtube' && token) {
          const ytRes = await fetch(
            'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (ytRes.ok) {
            const data = await ytRes.json();
            freshAvatarUrl =
              data.items?.[0]?.snippet?.thumbnails?.high?.url ||
              data.items?.[0]?.snippet?.thumbnails?.medium?.url ||
              null;
          }
        }

        // LinkedIn
        if (account.platform === 'linkedin' && token) {
          try {
            if (account.account_type === 'business' || id.startsWith('li_org_')) {
              const orgId = String(account.page_id || id).replace(/^li_org_/, '').replace('urn:li:organization:', '');
              const orgRes = await fetch(`https://api.linkedin.com/v2/organizations/${orgId}`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'X-Restli-Protocol-Version': '2.0.0',
                },
              });
              if (orgRes.ok) {
                const orgData = await orgRes.json();
                freshAvatarUrl =
                  orgData.logoV2?.['cropped~']?.elements?.[0]?.identifiers?.[0]?.identifier ||
                  orgData.coverPhotoV2?.['cropped~']?.elements?.[0]?.identifiers?.[0]?.identifier ||
                  null;
              }
            } else {
              const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (userRes.ok) {
                const userData = await userRes.json();
                freshAvatarUrl = userData.picture || null;
              }
            }
          } catch (liErr) {
            console.warn('[AvatarProxy] LinkedIn avatar fetch error:', liErr);
          }
        }

        // Mirror fresh avatar to permanent storage
        if (freshAvatarUrl) {
          const permanentUrl = await mirrorAvatarToPermanentStorage(account.id, freshAvatarUrl);
          if (permanentUrl) {
            return NextResponse.redirect(permanentUrl, {
              status: 307,
              headers: {
                'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
              },
            });
          }
        }
      }
    } catch (err) {
      console.warn('[AvatarProxy] Error resolving avatar:', err);
    }
  }

  const cleanName = (
    matchedAccount?.display_name ||
    matchedAccount?.username ||
    id.replace(/^(ig_|fb_|yt_|tw_|li_|pin_)/, '') ||
    'Account'
  ).replace(/^@/, '');

  const colorMap: Record<string, string> = {
    youtube: 'FF0000',
    facebook: '1877F2',
    instagram: 'E1306C',
    twitter: '000000',
    linkedin: '0A66C2',
    pinterest: 'E60023',
    tiktok: '000000',
  };
  const bg = colorMap[matchedAccount?.platform || ''] || '059669';

  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    cleanName
  )}&background=${bg}&color=fff&size=256&bold=true`;
  return NextResponse.redirect(fallbackUrl, { status: 307 });
}
