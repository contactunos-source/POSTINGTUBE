import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

/**
 * Publishes text, photos, and reels/videos to a Facebook Page via Meta Graph API v20.0
 * Supports:
 * - Text Feed Posts (POST /{page-id}/feed)
 * - Binary & URL Photo Posts (POST /{page-id}/photos)
 * - Binary & URL Video / Reel Posts (POST /{page-id}/videos)
 */
// In-memory idempotency cache for Facebook publishing requests (prevents duplicate API dispatches within 30s)
const recentFacebookPublishes = new Map<string, { timestamp: number; result: any }>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let { pageId, accessToken, message, mediaUrl, postType, scheduledTimestamp } = body;

    // Fallback to server env variables if set
    if (!accessToken && process.env.FACEBOOK_PAGE_ACCESS_TOKEN) {
      accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    }
    if (!pageId && process.env.FACEBOOK_PAGE_ID) {
      pageId = process.env.FACEBOOK_PAGE_ID;
    }

    if (!pageId || !accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing Facebook Page ID or Page Access Token.',
        },
        { status: 400 }
      );
    }

    if (!message && !mediaUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'Post must contain either a text caption or a media attachment.',
        },
        { status: 400 }
      );
    }

    const cleanPageId = pageId.trim();
    let currentToken = accessToken.trim();

    // Idempotency: prevent duplicate API requests for the same content within 30 seconds
    const idempotencyKey = `${cleanPageId}:${(message || '').trim()}:${mediaUrl || ''}`;
    const cachedPublish = recentFacebookPublishes.get(idempotencyKey);
    if (cachedPublish && Date.now() - cachedPublish.timestamp < 30000) {
      console.warn(`[Facebook Idempotency] Duplicate request prevented for key: ${idempotencyKey}`);
      return NextResponse.json(cachedPublish.result);
    }

    // Helper to execute publishing with a given token
    async function executePublish(token: string) {
      const isVideo =
        postType === 'reel' ||
        postType === 'video' ||
        (mediaUrl && /\.(mp4|mov|webm|m4v|avi)$/i.test(mediaUrl)) ||
        (mediaUrl && mediaUrl.startsWith('data:video/'));

      // 1. Text-Only Feed Post
      if (!mediaUrl) {
        const feedUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(cleanPageId)}/feed`;
        const params = new URLSearchParams();
        params.append('access_token', token);
        params.append('message', message || '');
        if (scheduledTimestamp) {
          const unixTime = Math.floor(new Date(scheduledTimestamp).getTime() / 1000);
          if (unixTime >= Math.floor(Date.now() / 1000) + 600) {
            params.append('published', 'false');
            params.append('scheduled_publish_time', unixTime.toString());
          }
        }
        const res = await fetch(feedUrl, { method: 'POST', body: params });
        return await res.json();
      }

      // 2. Video / Reel Post
      if (isVideo) {
        const videoUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(cleanPageId)}/videos`;

        // Case A: Local uploaded video file
        if (mediaUrl.startsWith('/uploads/')) {
          const filePath = path.join(process.cwd(), 'public', mediaUrl);
          const fileBuffer = await readFile(filePath);
          const form = new FormData();
          form.append('access_token', token);
          if (message) form.append('description', message);
          form.append('source', new Blob([fileBuffer], { type: 'video/mp4' }), path.basename(mediaUrl));
          const res = await fetch(videoUrl, { method: 'POST', body: form });
          return await res.json();
        }

        // Case B: Public URL
        if (mediaUrl.startsWith('http')) {
          const params = new URLSearchParams();
          params.append('access_token', token);
          params.append('file_url', mediaUrl);
          if (message) params.append('description', message);
          const res = await fetch(videoUrl, { method: 'POST', body: params });
          return await res.json();
        }
      }

      // 3. Photo Post
      const photoUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(cleanPageId)}/photos`;

      // Case A: Local uploaded file in /uploads/
      if (mediaUrl.startsWith('/uploads/')) {
        const filePath = path.join(process.cwd(), 'public', mediaUrl);
        const fileBuffer = await readFile(filePath);
        const ext = path.extname(mediaUrl).toLowerCase();
        const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

        const form = new FormData();
        form.append('access_token', token);
        if (message) form.append('caption', message);
        form.append('source', new Blob([fileBuffer], { type: mimeType }), path.basename(mediaUrl));
        const res = await fetch(photoUrl, { method: 'POST', body: form });
        return await res.json();
      }

      // Case B: Base64 data URL
      if (mediaUrl.startsWith('data:image/')) {
        const matches = mediaUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const mimeType = matches[1];
          const buffer = Buffer.from(matches[2], 'base64');
          const form = new FormData();
          form.append('access_token', token);
          if (message) form.append('caption', message);
          form.append('source', new Blob([buffer], { type: mimeType }), 'image.jpg');
          const res = await fetch(photoUrl, { method: 'POST', body: form });
          return await res.json();
        }
      }

      // Case C: Public HTTP URL
      if (mediaUrl.startsWith('http')) {
        const params = new URLSearchParams();
        params.append('access_token', token);
        params.append('url', mediaUrl);
        if (message) params.append('caption', message);
        const res = await fetch(photoUrl, { method: 'POST', body: params });
        return await res.json();
      }

      // Fallback
      return { error: { message: `Unsupported media format: ${mediaUrl.substring(0, 50)}`, code: 400 } };
    }

    let data = await executePublish(currentToken);

    // If Error #200 (User Token passed instead of Page Token), resolve Page Token and retry
    if (data.error && data.error.code === 200) {
      try {
        const directPageRes = await fetch(
          `https://graph.facebook.com/v20.0/${encodeURIComponent(cleanPageId)}?fields=access_token&access_token=${encodeURIComponent(
            currentToken
          )}`
        );
        const directPageData = await directPageRes.json();
        const resolvedPageToken = directPageData.access_token;

        if (resolvedPageToken) {
          currentToken = resolvedPageToken;
          data = await executePublish(currentToken);
        }
      } catch (tokenErr) {
        console.error('Failed to auto-fetch Page token', tokenErr);
      }
    }

    if (data.error) {
      let friendlyMsg = data.error.message;
      if (data.error.code === 200) {
        friendlyMsg =
          "Facebook Permission Error (#200): Ensure you have admin publishing permission on this Page.";
      } else if (data.error.code === 190) {
        friendlyMsg =
          "Facebook Token Expired (#190): This token has expired. Please refresh your Facebook connection.";
      }

      return NextResponse.json(
        {
          success: false,
          error: friendlyMsg,
          code: data.error.code,
          subcode: data.error.error_subcode,
        },
        { status: 400 }
      );
    }

    const postId = data.id || data.post_id;
    const postUrl = `https://www.facebook.com/${postId}`;

    const successPayload = {
      success: true,
      postId,
      postUrl,
      details: data,
    };

    // Store in idempotency cache
    recentFacebookPublishes.set(idempotencyKey, {
      timestamp: Date.now(),
      result: successPayload,
    });

    return NextResponse.json(successPayload);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Publish request failed';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
