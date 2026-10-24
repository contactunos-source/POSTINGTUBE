import { NextRequest, NextResponse } from 'next/server';

async function refreshGoogleAccessToken(refreshToken: string): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.YOUTUBE_CLIENT_SECRET;

  if (!clientId || !clientSecret || !refreshToken) return null;

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const data = await res.json();
    return data.access_token || null;
  } catch (err) {
    console.warn('[YouTube Playlists] Token refresh warning:', err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let { accessToken, refreshToken } = body;

    if (!accessToken && !refreshToken) {
      return NextResponse.json({ success: true, playlists: [] });
    }

    async function fetchPlaylists(token: string) {
      const res = await fetch(
        'https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50',
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        }
      );
      return res;
    }

    let response = await fetchPlaylists(accessToken);

    if (response.status === 401 && refreshToken) {
      const newToken = await refreshGoogleAccessToken(refreshToken);
      if (newToken) {
        response = await fetchPlaylists(newToken);
      }
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.warn('[YouTube Playlists] API returned status:', response.status, errData);
      return NextResponse.json({
        success: true,
        playlists: [],
        warning: errData.error?.message || 'Could not fetch playlists',
      });
    }

    const data = await response.json();
    const playlists = (data.items || []).map((item: any) => ({
      id: item.id,
      title: item.snippet?.title || 'Untitled Playlist',
      description: item.snippet?.description || '',
      itemCount: item.contentDetails?.itemCount || 0,
      thumbnailUrl:
        item.snippet?.thumbnails?.medium?.url ||
        item.snippet?.thumbnails?.default?.url ||
        '',
    }));

    return NextResponse.json({
      success: true,
      playlists,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error fetching playlists';
    return NextResponse.json({ success: false, error: msg, playlists: [] }, { status: 500 });
  }
}
