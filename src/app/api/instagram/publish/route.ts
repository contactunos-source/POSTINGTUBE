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

function parseMetaErrorMessage(err: any): string {
  const msg = err?.message || '';
  const lower = msg.toLowerCase();

  if (lower.includes('unsupported request') || lower.includes('method type')) {
    return "Meta Authorization Notice: Meta restricts direct publishing for newly connected accounts until 'instagram_business_content_publish' has completed Meta App Review, or until the account is added under App Roles > Instagram Testers in your Meta Developer Console. Please add this account as a tester or reconnect.";
  }
  if (lower.includes('session has expired') || lower.includes('error validating access token') || err?.code === 190) {
    return "Instagram session has expired. Please go to the Connections tab and click 'Reconnect' on your Instagram account to renew authorization.";
  }
  if (lower.includes('does not exist') || lower.includes('missing permissions')) {
    return "Instagram account permission not found. Please ensure your account is an active Instagram Professional (Business or Creator) account and reconnect.";
  }
  return msg || 'Failed to communicate with Instagram API.';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let { igUserId, accessToken, caption, mediaUrl, mediaUrls: rawMediaUrls, postType, isAiGenerated, collaborators } = body;
    const mediaUrls: string[] = Array.isArray(rawMediaUrls) && rawMediaUrls.length > 0
      ? rawMediaUrls
      : mediaUrl ? [mediaUrl] : [];
    if (!mediaUrl && mediaUrls.length > 0) {
      mediaUrl = mediaUrls[0];
    }

    const envIgUserId = process.env.INSTAGRAM_ACCOUNT_ID || '';
    const envFbToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

    // Strip 'ig_' database prefix if present
    let cleanIgUserId = (igUserId || '').replace(/^ig_/, '').trim();
    let cleanToken = (accessToken || '').trim();

    // If accessToken was stored as a JSON string (e.g. {"access_token":"IGAA...","expires_at":...}), extract raw token
    if (cleanToken.startsWith('{') && cleanToken.includes('access_token')) {
      try {
        const parsed = JSON.parse(cleanToken);
        cleanToken = (parsed.access_token || cleanToken).trim();
      } catch {}
    }

    // Only fallback to server credentials if caller provided NO token and NO user ID
    if (!cleanToken && envFbToken) {
      cleanToken = envFbToken;
      if (!cleanIgUserId) {
        cleanIgUserId = envIgUserId;
      }
    }

    if (!cleanIgUserId || !cleanToken) {
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

    // Idempotency: prevent duplicate API requests for the same media & caption within 45 seconds
    const idempotencyKey = `${cleanIgUserId}:${(caption || '').trim()}:${mediaUrl || ''}`;
    const cachedPublish = recentInstagramPublishes.get(idempotencyKey);
    if (cachedPublish && Date.now() - cachedPublish.timestamp < 45000) {
      console.warn(`[Instagram Idempotency] Duplicate request prevented for key: ${idempotencyKey}`);
      return NextResponse.json(cachedPublish.result);
    }

    const isImageFile = Boolean(mediaUrl && (/\.(png|jpe?g|webp|gif)$/i.test(mediaUrl) || mediaUrl.startsWith('data:image/')));
    const isVideoFile = Boolean(mediaUrl && (/\.(mp4|mov|webm|m4v|avi)$/i.test(mediaUrl) || mediaUrl.startsWith('data:video/')));
    let effectivePostType = postType;
    if (effectivePostType === 'reel' && isImageFile && !isVideoFile) {
      console.warn('[Instagram Publish] Auto-correcting Reel format to Post because media is an image.');
      effectivePostType = 'post';
    }

    const isVideo =
      (effectivePostType === 'reel' || effectivePostType === 'video' || isVideoFile) && !isImageFile;

    if (mediaUrl && mediaUrl.startsWith('blob:')) {
      return NextResponse.json(
        {
          success: false,
          error: `Media file has not finished uploading to server yet. Please re-save or replace your media in the composer before publishing.`,
        },
        { status: 400 }
      );
    }

    const isLocalFile = mediaUrl.startsWith('/uploads/');

    // Route dynamically based on token type: IG... tokens go to graph.instagram.com, EAA... tokens go to graph.facebook.com
    const apiHost = cleanToken.startsWith('IG')
      ? 'https://graph.instagram.com/v21.0'
      : 'https://graph.facebook.com/v20.0';

    let creationId = '';
    const isCarousel = (Array.isArray(mediaUrls) && mediaUrls.length > 1) || postType === 'carousel';

    // =========================================================================
    // STRATEGY 0: MULTI-IMAGE CAROUSEL POST VIA META GRAPH API
    // =========================================================================
    if (isCarousel && mediaUrls.length > 1) {
      const itemContainerIds: string[] = [];

      // Instagram allows 2 to 10 carousel items
      const slidesToPublish = mediaUrls.slice(0, 10);

      for (let sIdx = 0; sIdx < slidesToPublish.length; sIdx++) {
        const slideUrl = slidesToPublish[sIdx];
        let publicSlideUrl = slideUrl;

        // If local file, resolve to public accessible URL via CDN or public domain
        if (slideUrl.startsWith('/uploads/')) {
          try {
            const filePath = path.join(process.cwd(), 'public', slideUrl);
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
              publicSlideUrl = cdnData.image.url;
            }
          } catch (cdnErr) {
            console.warn(`[Instagram Carousel Slide ${sIdx + 1}] Local relay notice:`, cdnErr);
          }
        }

        const isSlideVideo = /\.(mp4|mov|webm|m4v)$/i.test(slideUrl);
        const itemParams = new URLSearchParams();
        itemParams.append('access_token', cleanToken);
        itemParams.append('is_carousel_item', 'true');

        if (isSlideVideo) {
          itemParams.append('media_type', 'VIDEO');
          itemParams.append('video_url', publicSlideUrl);
        } else {
          itemParams.append('image_url', publicSlideUrl);
        }

        const itemRes = await fetch(`${apiHost}/${encodeURIComponent(cleanIgUserId)}/media`, {
          method: 'POST',
          body: itemParams,
        });
        const itemData = await itemRes.json();

        if (itemData.error || !itemData.id) {
          return NextResponse.json(
            {
              success: false,
              error: itemData.error?.message || `Failed to create Instagram carousel slide #${sIdx + 1}.`,
              details: itemData.error,
            },
            { status: 400 }
          );
        }

        itemContainerIds.push(itemData.id);

        // If slide is video, poll readiness
        if (isSlideVideo) {
          let isReady = false;
          let attempts = 0;
          while (!isReady && attempts < 10) {
            await new Promise((r) => setTimeout(r, 1500));
            attempts++;
            const sRes = await fetch(
              `${apiHost}/${encodeURIComponent(itemData.id)}?fields=status_code&access_token=${encodeURIComponent(cleanToken)}`
            );
            const sData = await sRes.json();
            if (sData.status_code === 'FINISHED') isReady = true;
            else if (sData.status_code === 'ERROR') break;
          }
        }
      }

      // Create Parent Carousel Container
      const carouselParams = new URLSearchParams();
      carouselParams.append('access_token', cleanToken);
      carouselParams.append('media_type', 'CAROUSEL');
      carouselParams.append('children', itemContainerIds.join(','));
      if (caption) carouselParams.append('caption', caption);
      if (isAiGenerated) carouselParams.append('is_ai_generated', 'true');
      if (collaborators) {
        const list = Array.isArray(collaborators)
          ? collaborators.map((c) => String(c).trim().replace(/^@/, '')).filter(Boolean)
          : String(collaborators).split(',').map((c) => c.trim().replace(/^@/, '')).filter(Boolean);
        if (list.length > 0) {
          carouselParams.append('collaborators', JSON.stringify(list.slice(0, 5)));
        }
      }

      const carouselRes = await fetch(`${apiHost}/${encodeURIComponent(cleanIgUserId)}/media`, {
        method: 'POST',
        body: carouselParams,
      });
      const carouselData = await carouselRes.json();

      if (carouselData.error || !carouselData.id) {
        return NextResponse.json(
          {
            success: false,
            error: carouselData.error?.message || 'Failed to create Instagram carousel container.',
            details: carouselData.error,
          },
          { status: 400 }
        );
      }

      creationId = carouselData.id;
    } else

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
        const errMsg = initData.error.message || '';
        const isAuthOrMethodError =
          initData.error.code === 190 ||
          initData.error.code === 100 ||
          errMsg.toLowerCase().includes('expired') ||
          errMsg.toLowerCase().includes('unsupported request');

        const isServerAccount =
          Boolean(envIgUserId && cleanIgUserId === envIgUserId);

        if (isAuthOrMethodError && envFbToken && isServerAccount && cleanToken !== envFbToken) {
          console.warn('[Instagram Publish Video] Server account credential fallback...');
          cleanToken = envFbToken;
          cleanIgUserId = envIgUserId;
          initParams.set('access_token', envFbToken);

          const retryInitRes = await fetch(
            `https://graph.facebook.com/v20.0/${encodeURIComponent(envIgUserId)}/media`,
            {
              method: 'POST',
              body: initParams,
            }
          );
          const retryInitData = await retryInitRes.json().catch(() => ({}));
          if (retryInitData.id && retryInitData.uri) {
            initData.id = retryInitData.id;
            initData.uri = retryInitData.uri;
            delete initData.error;
          } else {
            return NextResponse.json(
              {
                success: false,
                error: initData.error.message || 'Failed to initialize Instagram video container.',
                details: initData.error,
              },
              { status: 400 }
            );
          }
        } else {
          return NextResponse.json(
            {
              success: false,
              error: parseMetaErrorMessage(initData.error),
              details: initData.error,
            },
            { status: 400 }
          );
        }
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
        const errMsg = containerData.error.message || '';
        const isAuthOrMethodError =
          containerData.error.code === 190 ||
          containerData.error.code === 100 ||
          errMsg.toLowerCase().includes('expired') ||
          errMsg.toLowerCase().includes('unsupported request');

        const isServerAccount =
          Boolean(envIgUserId && cleanIgUserId === envIgUserId);

        if (isAuthOrMethodError && envFbToken && isServerAccount && cleanToken !== envFbToken) {
          console.warn('[Instagram Publish] Server account fallback using verified credentials...');
          const retryParams = new URLSearchParams();
          retryParams.append('access_token', envFbToken);
          if (caption) retryParams.append('caption', caption);
          if (isVideo) {
            retryParams.append('media_type', 'REELS');
            retryParams.append('video_url', publicMediaUrl);
          } else {
            retryParams.append('image_url', publicMediaUrl);
          }
          const retryRes = await fetch(`https://graph.facebook.com/v20.0/${encodeURIComponent(envIgUserId)}/media`, {
            method: 'POST',
            body: retryParams,
          });
          const retryData = await retryRes.json().catch(() => ({}));
          if (retryData.id) {
            creationId = retryData.id;
            cleanToken = envFbToken;
            cleanIgUserId = envIgUserId;
          } else {
            return NextResponse.json(
              {
                success: false,
                error: containerData.error.message || 'Failed to create Instagram media container.',
                details: containerData.error,
              },
              { status: 400 }
            );
          }
        } else {
          return NextResponse.json(
            {
              success: false,
              error: parseMetaErrorMessage(containerData.error),
              details: containerData.error,
            },
            { status: 400 }
          );
        }
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
      const maxPollingAttempts = 35; // Allow up to 70 seconds for high-res video encoding

      while (!isReady && attempts < maxPollingAttempts) {
        await new Promise((r) => setTimeout(r, 2000));
        attempts++;

        const statusRes = await fetch(
          `${apiHost}/${encodeURIComponent(creationId)}?fields=status_code,status&access_token=${encodeURIComponent(
            cleanToken
          )}`
        );
        const statusData = await statusRes.json().catch(() => ({}));

        if (statusData.status_code === 'FINISHED') {
          isReady = true;
          // Meta replication delay: wait 3 seconds after FINISHED so media ID is fully available
          await new Promise((r) => setTimeout(r, 3000));
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

      if (!isReady) {
        return NextResponse.json(
          {
            success: false,
            error: 'Instagram video processing is taking longer than expected on Meta servers. Please wait a minute and retry publishing.',
          },
          { status: 400 }
        );
      }
    }

    // =========================================================================
    // STEP 3: PUBLISH MEDIA CONTAINER LIVE (WITH REPLICATION LAG RETRY)
    // =========================================================================
    const publishUrl = `${apiHost}/${encodeURIComponent(cleanIgUserId)}/media_publish`;
    const publishParams = new URLSearchParams();
    publishParams.append('creation_id', creationId);
    publishParams.append('access_token', cleanToken);

    let publishData: any = null;
    let publishAttempts = 0;
    const maxPublishAttempts = 4;

    while (publishAttempts < maxPublishAttempts) {
      publishAttempts++;
      const publishRes = await fetch(publishUrl, {
        method: 'POST',
        body: publishParams,
      });
      publishData = await publishRes.json().catch(() => ({}));

      if (!publishData.error && publishData.id) {
        break; // Successfully published!
      }

      // Check if error is transient "Media ID is not available" (Code 9007 / Subcode 2207027)
      const errMsg = publishData.error?.message || '';
      const isReplicationLag =
        errMsg.toLowerCase().includes('media id is not available') ||
        publishData.error?.code === 9007 ||
        publishData.error?.error_subcode === 2207027;

      if (isReplicationLag && publishAttempts < maxPublishAttempts) {
        console.warn(`[Instagram Publish] Media ID replication delay on Meta servers (attempt ${publishAttempts}/${maxPublishAttempts}). Waiting 4s before retrying...`);
        await new Promise((r) => setTimeout(r, 4000));
      } else {
        break;
      }
    }

    if (publishData.error) {
      return NextResponse.json(
        {
          success: false,
          error: parseMetaErrorMessage(publishData.error),
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
