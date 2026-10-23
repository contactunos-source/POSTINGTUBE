import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

/**
 * YouTube Video Publishing Endpoint using YouTube Data API v3
 * Supports:
 * 1. Resumable Upload protocol to upload video binary
 * 2. Title, Description, Tags, Category, and Privacy status (Public, Unlisted, Private)
 * 3. Native YouTube scheduled publishing via status.publishAt
 * 4. Automatic token refresh using refresh_token if access_token is expired
 * 5. Optional custom thumbnail upload
 */

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
    if (data.access_token) {
      console.log('[YouTube Publish] Access token refreshed successfully');
      return data.access_token;
    }
  } catch (err) {
    console.warn('[YouTube Publish] Token refresh warning:', err);
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let {
      channelId,
      accessToken,
      refreshToken,
      title,
      description,
      tags = [],
      mediaUrl,
      thumbnailUrl,
      privacyStatus = 'public',
      scheduledTimestamp,
      categoryId = '22',
    } = body;

    // 1. Content Validation: YouTube ONLY supports video files
    if (!mediaUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'YouTube requires a video file. Text-only posts cannot be published to YouTube.',
        },
        { status: 400 }
      );
    }

    const isVideo =
      /\.(mp4|mov|webm|m4v|avi|mkv)$/i.test(mediaUrl) ||
      mediaUrl.startsWith('data:video/') ||
      body.postType === 'video' ||
      body.postType === 'reel' ||
      body.postType === 'short';

    if (!isVideo) {
      return NextResponse.json(
        {
          success: false,
          error:
            'YouTube only supports video uploads (MP4, MOV, WEBM). Images and photo carousels cannot be published to YouTube.',
        },
        { status: 400 }
      );
    }

    // 2. Token Extraction & Unpacking
    let currentToken = accessToken;
    let currentRefreshToken = refreshToken;

    if (currentToken && currentToken.startsWith('{')) {
      try {
        const parsed = JSON.parse(currentToken);
        currentToken = parsed.access_token || currentToken;
        if (!currentRefreshToken && parsed.refresh_token) {
          currentRefreshToken = parsed.refresh_token;
        }
      } catch {}
    }

    if (!currentToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing YouTube access token. Please connect a valid YouTube channel.',
        },
        { status: 400 }
      );
    }

    // 3. Format Title & Description
    const videoTitle = (title || description?.split('\n')[0] || 'Scheduled Video').trim().slice(0, 100);
    const videoDescription = description || '';

    // 4. Video Buffer Resolution
    let videoBuffer: Buffer;
    let contentType = 'video/mp4';

    if (mediaUrl.startsWith('/uploads/')) {
      const localPath = path.join(process.cwd(), 'public', mediaUrl);
      videoBuffer = await readFile(localPath);
      if (mediaUrl.endsWith('.webm')) contentType = 'video/webm';
      if (mediaUrl.endsWith('.mov')) contentType = 'video/quicktime';
    } else if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
      const fetchRes = await fetch(mediaUrl);
      if (!fetchRes.ok) {
        throw new Error(`Failed to fetch video asset from URL: ${fetchRes.statusText}`);
      }
      const arrayBuf = await fetchRes.arrayBuffer();
      videoBuffer = Buffer.from(arrayBuf);
      const ctHeader = fetchRes.headers.get('content-type');
      if (ctHeader) contentType = ctHeader;
    } else if (mediaUrl.startsWith('data:video/')) {
      const commaIdx = mediaUrl.indexOf(',');
      const meta = mediaUrl.slice(0, commaIdx);
      const mime = meta.split(';')[0].replace('data:', '');
      if (mime) contentType = mime;
      videoBuffer = Buffer.from(mediaUrl.slice(commaIdx + 1), 'base64');
    } else {
      throw new Error('Unsupported video media format.');
    }

    // Helper to perform YouTube Resumable Upload
    async function executeUpload(token: string) {
      // Configure snippet and status
      const isScheduled =
        scheduledTimestamp && new Date(scheduledTimestamp).getTime() > Date.now() + 60 * 1000;

      const videoMetadata: any = {
        snippet: {
          title: videoTitle,
          description: videoDescription,
          tags: Array.isArray(tags) ? tags : [],
          categoryId: String(categoryId || '22'),
        },
        status: {
          privacyStatus: isScheduled ? 'private' : privacyStatus,
          selfDeclaredMadeForKids: false,
        },
      };

      if (isScheduled) {
        videoMetadata.status.publishAt = new Date(scheduledTimestamp).toISOString();
      }

      // Step 1: Initiate Resumable Upload Session
      const initUrl =
        'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';

      const initRes = await fetch(initUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': contentType,
          'X-Upload-Content-Length': String(videoBuffer.length),
        },
        body: JSON.stringify(videoMetadata),
      });

      if (!initRes.ok) {
        const errJson = await initRes.json().catch(() => ({}));
        return {
          ok: false,
          status: initRes.status,
          error: errJson.error?.message || `YouTube initiation failed with status ${initRes.status}`,
        };
      }

      const uploadLocation = initRes.headers.get('location');
      if (!uploadLocation) {
        return { ok: false, error: 'YouTube did not return a valid upload location header.' };
      }

      // Step 2: Upload Video Binary to Resumable Location
      const uploadRes = await fetch(uploadLocation, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(videoBuffer.length),
        },
        body: new Uint8Array(videoBuffer),
      });

      const videoData = await uploadRes.json();
      if (!uploadRes.ok || !videoData.id) {
        return {
          ok: false,
          status: uploadRes.status,
          error: videoData.error?.message || `YouTube video upload failed (${uploadRes.status})`,
        };
      }

      // Step 3: Optional Custom Thumbnail
      if (thumbnailUrl && videoData.id) {
        try {
          let thumbBuf: Buffer | null = null;
          if (thumbnailUrl.startsWith('/uploads/')) {
            thumbBuf = await readFile(path.join(process.cwd(), 'public', thumbnailUrl));
          } else if (thumbnailUrl.startsWith('http')) {
            const tRes = await fetch(thumbnailUrl);
            if (tRes.ok) thumbBuf = Buffer.from(await tRes.arrayBuffer());
          }

          if (thumbBuf) {
            await fetch(
              `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoData.id}`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'image/jpeg',
                },
                body: new Uint8Array(thumbBuf),
              }
            );
          }
        } catch (tErr) {
          console.warn('[YouTube Publish] Thumbnail upload warning:', tErr);
        }
      }

      return {
        ok: true,
        data: videoData,
      };
    }

    // Attempt upload with current token
    let result = await executeUpload(currentToken);

    // If 401 Unauthorized and we have a refresh_token, refresh and retry once!
    if (!result.ok && result.status === 401 && currentRefreshToken) {
      console.log('[YouTube Publish] Token expired, attempting automatic refresh...');
      const newToken = await refreshGoogleAccessToken(currentRefreshToken);
      if (newToken) {
        currentToken = newToken;
        result = await executeUpload(newToken);
      }
    }

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to publish video to YouTube.',
        },
        { status: 400 }
      );
    }

    const videoId = result.data.id;
    const videoUrl = `https://youtu.be/${videoId}`;

    return NextResponse.json({
      success: true,
      videoId,
      videoUrl,
      channelId,
      title: result.data.snippet?.title || videoTitle,
      publishedAt: new Date().toISOString(),
      details: {
        id: videoId,
        url: videoUrl,
        privacyStatus: result.data.status?.privacyStatus || privacyStatus,
        publishAt: result.data.status?.publishAt,
        kind: result.data.kind,
      },
    });
  } catch (err: unknown) {
    console.error('[YouTube Publish] Unexpected error:', err);
    const msg = err instanceof Error ? err.message : 'Internal server error while publishing to YouTube';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
