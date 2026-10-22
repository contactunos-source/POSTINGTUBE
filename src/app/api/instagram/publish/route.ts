import { NextRequest, NextResponse } from 'next/server';

/**
 * Publishes photos, carousels, and reels to an Instagram Professional (Business/Creator) account
 * via official Meta Graph API v20.0.
 *
 * Requirements:
 * 1. Account must be an Instagram Business or Creator account connected to a Facebook Page.
 * 2. Token must have `instagram_basic` and `instagram_content_publish`.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let { igUserId, accessToken, caption, mediaUrl, postType } = body;

    if (!igUserId && process.env.INSTAGRAM_ACCOUNT_ID) {
      igUserId = process.env.INSTAGRAM_ACCOUNT_ID;
    }
    if (!accessToken && process.env.FACEBOOK_PAGE_ACCESS_TOKEN) {
      accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
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

    const baseUrl =
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    // Ensure full public URL for local uploads so Meta can fetch the media
    let publicMediaUrl = mediaUrl;
    if (mediaUrl.startsWith('/')) {
      publicMediaUrl = `${baseUrl}${mediaUrl}`;
    }

    const isVideo =
      postType === 'reel' ||
      postType === 'video' ||
      /\.(mp4|mov|webm|m4v|avi)$/i.test(mediaUrl) ||
      mediaUrl.startsWith('data:video/');

    const cleanIgUserId = igUserId.trim();
    const cleanToken = accessToken.trim();

    // STEP 1: Create Instagram Media Container
    const containerUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(cleanIgUserId)}/media`;
    const containerParams = new URLSearchParams();
    containerParams.append('access_token', cleanToken);
    if (caption) containerParams.append('caption', caption);

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

    const creationId = containerData.id;
    if (!creationId) {
      return NextResponse.json(
        { success: false, error: 'Meta did not return a valid creation container ID.' },
        { status: 400 }
      );
    }

    // STEP 2: If Reel/Video, poll container until video processing status is FINISHED
    if (isVideo) {
      let isReady = false;
      let attempts = 0;
      while (!isReady && attempts < 10) {
        await new Promise((r) => setTimeout(r, 2000));
        attempts++;

        const statusRes = await fetch(
          `https://graph.facebook.com/v20.0/${encodeURIComponent(
            creationId
          )}?fields=status_code&access_token=${encodeURIComponent(cleanToken)}`
        );
        const statusData = await statusRes.json();

        if (statusData.status_code === 'FINISHED') {
          isReady = true;
        } else if (statusData.status_code === 'ERROR' || statusData.status_code === 'EXPIRED') {
          return NextResponse.json(
            {
              success: false,
              error: `Instagram video processing ended with status: ${statusData.status_code}`,
            },
            { status: 400 }
          );
        }
      }
    }

    // STEP 3: Publish Media Container
    const publishUrl = `https://graph.facebook.com/v20.0/${encodeURIComponent(cleanIgUserId)}/media_publish`;
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
    const postUrl = `https://instagram.com/p/${publishedMediaId}`;

    return NextResponse.json({
      success: true,
      postId: publishedMediaId,
      postUrl,
      details: {
        containerId: creationId,
        publishedMediaId,
        mediaType: isVideo ? 'REELS' : 'IMAGE',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error publishing to Instagram';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
