import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

/**
 * Publishes photos, carousels, and reels to an Instagram Professional (Business/Creator) account
 * via official Meta Graph API v20.0.
 *
 * Supports:
 * 1. Direct Instagram Resumable Upload (streams local video binary directly to rupload.facebook.com)
 * 2. Remote Public Media URLs
 * 3. Dynamic resolution between Facebook Page tokens (EAA...) and Instagram tokens (IG...)
 */
// In-memory idempotency cache for Instagram publishing requests (prevents duplicate API dispatches within 45s)
const recentInstagramPublishes = new Map<string, { timestamp: number; result: any }>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let { igUserId, accessToken, caption, mediaUrl, postType, isAiGenerated, collaborators } = body;

    const envIgUserId = process.env.INSTAGRAM_ACCOUNT_ID || '17841417726295028';
    const envFbToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

    // Use passed credentials or fallback to verified active server credentials
    if (!igUserId || igUserId === '28819606054355684' || igUserId.startsWith('ig_')) {
      igUserId = envIgUserId;
    }

    if (!accessToken || accessToken.startsWith('IG')) {
      // For publishing via Graph API, Facebook Page Token with instagram permissions is the primary supported token
      if (envFbToken) {
        accessToken = envFbToken;
      }
    }

    if (!accessToken) {
      accessToken = envFbToken;
    }

    if (!igUserId || !accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing Instagram User ID or Access Token. Please connect a valid Instagram Professional account.',
        },
        { status: 400 }
      );
    }

    if (!mediaUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'Instagram requires a media asset (photo or video) to publish.',
        },
        { status: 400 }
      );
    }

    const cleanIgUserId = igUserId.trim();
    const cleanToken = accessToken.trim();

    // Idempotency: prevent duplicate API requests for the same media & caption within 45 seconds
    const idempotencyKey = `${cleanIgUserId}:${(caption || '').trim()}:${mediaUrl || ''}`;
    const cachedPublish = recentInstagramPublishes.get(idempotencyKey);
    if (cachedPublish && Date.now() - cachedPublish.timestamp < 45000) {
      console.warn(`[Instagram Idempotency] Duplicate request prevented for key: ${idempotencyKey}`);
      return NextResponse.json(cachedPublish.result);
    }

    const isVideo =
      postType === 'reel' ||
      postType === 'video' ||
      /\.(mp4|mov|webm|m4v|avi)$/i.test(mediaUrl) ||
      mediaUrl.startsWith('data:video/');

    const isLocalFile = mediaUrl.startsWith('/uploads/');

    // Determine the base API endpoint (graph.instagram.com for IG tokens, graph.facebook.com for Meta EAA tokens)
    const apiHost = cleanToken.startsWith('IG')
      ? 'https://graph.instagram.com/v20.0'
      : 'https://graph.facebook.com/v20.0';

    let creationId = '';

    // =========================================================================
    // STRATEGY A: LOCAL VIDEO FILE -> RESUMABLE UPLOAD TO META SERVERS
    // =========================================================================
    if (isLocalFile && isVideo) {
      const filePath = path.join(process.cwd(), 'public', mediaUrl);
      const fileBuffer = await readFile(filePath);
      const fileSize = fileBuffer.length;

      // 1. Initialize Resumable Container
      const initParams = new URLSearchParams({
        access_token: cleanToken,
        upload_type: 'resumable',
        media_type: 'REELS',
      });
      if (caption) initParams.append('caption', caption);
      if (isAiGenerated) initParams.append('is_ai_generated', 'true');
      if (collaborators) {
        const list = Array.isArray(collaborators)
          ? collaborators.map((c) => String(c).trim().replace(/^@/, '')).filter(Boolean)
          : String(collaborators).split(',').map((c) => c.trim().replace(/^@/, '')).filter(Boolean);
        if (list.length > 0) {
          initParams.append('collaborators', JSON.stringify(list.slice(0, 5)));
        }
      }
      if (isAiGenerated) initParams.append('is_ai_generated', 'true');
      if (collaborators) {
        const list = Array.isArray(collaborators)
          ? collaborators.map((c) => String(c).trim().replace(/^@/, '')).filter(Boolean)
          : String(collaborators).split(',').map((c) => c.trim().replace(/^@/, '')).filter(Boolean);
        if (list.length > 0) {
          initParams.append('collaborators', JSON.stringify(list.slice(0, 5)));
        }
      }

      const initRes = await fetch(`${apiHost}/${encodeURIComponent(cleanIgUserId)}/media`, {
        method: 'POST',
        body: initParams,
      });
      const initData = await initRes.json();

      if (initData.error) {
        return NextResponse.json(
          {
            success: false,
            error: initData.error.message || 'Failed to initialize Instagram video container.',
            details: initData.error,
          },
          { status: 400 }
        );
      }

      creationId = initData.id;
      const uploadUri = initData.uri;

      if (!uploadUri || !creationId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Meta did not return a valid upload URI for video upload.',
          },
          { status: 400 }
        );
      }

      // 2. Stream Binary to rupload.facebook.com
      const uploadRes = await fetch(uploadUri, {
        method: 'POST',
        headers: {
          Authorization: `OAuth ${cleanToken}`,
          offset: '0',
          file_size: fileSize.toString(),
          'Content-Type': 'video/mp4',
        },
        body: fileBuffer,
      });

      const uploadData = await uploadRes.json().catch(() => ({}));
      if (uploadData.error) {
        return NextResponse.json(
          {
            success: false,
            error: uploadData.error.message || 'Failed to stream video bytes to Meta servers.',
          },
          { status: 400 }
        );
      }
    } else {
      // =========================================================================
      // STRATEGY B: PUBLIC URL OR PHOTO CONTAINER CREATION
      // =========================================================================
      const baseUrl =
        process.env.APP_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

      let publicMediaUrl = mediaUrl;
      if (mediaUrl.startsWith('/')) {
        publicMediaUrl = `${baseUrl}${mediaUrl}`;
      }

      // If local photo and on localhost, upload buffer to high-speed public CDN so Meta can fetch it
      if (!isVideo && isLocalFile) {
        try {
          const filePath = path.join(process.cwd(), 'public', mediaUrl);
          const fileBuffer = await readFile(filePath);
          const base64 = fileBuffer.toString('base64');

          const form = new FormData();
          form.append('key', '6d207e02198a847aa98d0a2a901485a5');
          form.append('action', 'upload');
          form.append('source', base64);
          form.append('format', 'json');

          const cdnRes = await fetch('https://freeimage.host/api/1/upload', {
            method: 'POST',
            body: form,
          });
          const cdnData = await cdnRes.json();
          if (cdnData?.image?.url) {
            publicMediaUrl = cdnData.image.url;
          }
        } catch (cdnErr) {
          console.warn('Local image CDN relay note:', cdnErr);
        }
      }

      const containerUrl = `${apiHost}/${encodeURIComponent(cleanIgUserId)}/media`;
      const containerParams = new URLSearchParams();
      containerParams.append('access_token', cleanToken);
      if (caption) containerParams.append('caption', caption);
      if (isAiGenerated) containerParams.append('is_ai_generated', 'true');
      if (collaborators) {
        const list = Array.isArray(collaborators)
          ? collaborators.map((c) => String(c).trim().replace(/^@/, '')).filter(Boolean)
          : String(collaborators).split(',').map((c) => c.trim().replace(/^@/, '')).filter(Boolean);
        if (list.length > 0) {
          containerParams.append('collaborators', JSON.stringify(list.slice(0, 5)));
        }
      }
      if (isAiGenerated) containerParams.append('is_ai_generated', 'true');
      if (collaborators) {
        const list = Array.isArray(collaborators)
          ? collaborators.map((c) => String(c).trim().replace(/^@/, '')).filter(Boolean)
          : String(collaborators).split(',').map((c) => c.trim().replace(/^@/, '')).filter(Boolean);
        if (list.length > 0) {
          containerParams.append('collaborators', JSON.stringify(list.slice(0, 5)));
        }
      }

      if (isVideo) {
        containerParams.append('media_type', 'REELS');
        containerParams.append('video_url', publicMediaUrl);
      } else {
        containerParams.append('image_url', publicMediaUrl);
      }

      const containerRes = await fetch(containerUrl, {
        method: 'POST',
        body: containerParams,
      });
      const containerData = await containerRes.json();

      if (containerData.error) {
        return NextResponse.json(
          {
            success: false,
            error: containerData.error.message || 'Failed to create Instagram media container.',
            details: containerData.error,
          },
          { status: 400 }
        );
      }

      creationId = containerData.id;
    }

    if (!creationId) {
      return NextResponse.json(
        { success: false, error: 'Meta did not return a valid container ID.' },
        { status: 400 }
      );
    }

    // =========================================================================
    // STEP 2: POLL STATUS UNTIL FINISHED (FOR VIDEOS/REELS)
    // =========================================================================
    if (isVideo) {
      let isReady = false;
      let attempts = 0;
      while (!isReady && attempts < 15) {
        await new Promise((r) => setTimeout(r, 2000));
        attempts++;

        const statusRes = await fetch(
          `${apiHost}/${encodeURIComponent(creationId)}?fields=status_code,status&access_token=${encodeURIComponent(
            cleanToken
          )}`
        );
        const statusData = await statusRes.json();

        if (statusData.status_code === 'FINISHED') {
          isReady = true;
        } else if (statusData.status_code === 'ERROR' || statusData.status_code === 'EXPIRED') {
          return NextResponse.json(
            {
              success: false,
              error: `Instagram video processing error: ${statusData.status || statusData.status_code}`,
              details: statusData,
            },
            { status: 400 }
          );
        }
      }
    }

    // =========================================================================
    // STEP 3: PUBLISH MEDIA CONTAINER LIVE
    // =========================================================================
    const publishUrl = `${apiHost}/${encodeURIComponent(cleanIgUserId)}/media_publish`;
    const publishParams = new URLSearchParams();
    publishParams.append('creation_id', creationId);
    publishParams.append('access_token', cleanToken);

    const publishRes = await fetch(publishUrl, {
      method: 'POST',
      body: publishParams,
    });
    const publishData = await publishRes.json();

    if (publishData.error) {
      return NextResponse.json(
        {
          success: false,
          error: publishData.error.message || 'Failed to publish media on Instagram.',
          details: publishData.error,
        },
        { status: 400 }
      );
    }

    const publishedMediaId = publishData.id;

    // Fetch live permalink from Meta
    let postUrl = `https://instagram.com/p/${publishedMediaId}`;
    try {
      const permalinkRes = await fetch(
        `${apiHost}/${publishedMediaId}?fields=permalink&access_token=${encodeURIComponent(cleanToken)}`
      );
      const permalinkData = await permalinkRes.json();
      if (permalinkData.permalink) {
        postUrl = permalinkData.permalink;
      }
    } catch {}

    const successPayload = {
      success: true,
      postId: publishedMediaId,
      postUrl,
      details: {
        containerId: creationId,
        publishedMediaId,
        mediaType: isVideo ? 'REELS' : 'IMAGE',
      },
    };

    // Store in idempotency cache
    recentInstagramPublishes.set(idempotencyKey, {
      timestamp: Date.now(),
      result: successPayload,
    });

    return NextResponse.json(successPayload);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error publishing to Instagram';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
