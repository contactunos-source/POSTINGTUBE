import { NextRequest, NextResponse } from 'next/server';

/**
 * Publishes content to Meta Threads using the official Meta Threads API.
 * Supports:
 * 1. Text Threads (up to 500 characters)
 * 2. Single Photo Threads
 * 3. Video Threads
 * 4. Multi-Image / Video Carousel Threads (2-10 items)
 */
const recentThreadsPublishes = new Map<string, { timestamp: number; result: any }>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      threadsUserId,
      accessToken,
      message,
      mediaUrl,
      mediaUrls: rawMediaUrls,
      postType,
    } = body;

    const mediaUrls: string[] = Array.isArray(rawMediaUrls) && rawMediaUrls.length > 0
      ? rawMediaUrls
      : mediaUrl ? [mediaUrl] : [];

    if (!threadsUserId || !accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing Threads User ID or Access Token.',
        },
        { status: 400 }
      );
    }

    if (!message && mediaUrls.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Post must contain either text or media.',
        },
        { status: 400 }
      );
    }

    const cleanUserId = threadsUserId.trim();
    const token = accessToken.trim();

    // Idempotency: prevent accidental duplicate API dispatches within 30s
    const idempotencyKey = `${cleanUserId}:${(message || '').trim()}:${mediaUrls.join(',')}`;
    const cached = recentThreadsPublishes.get(idempotencyKey);
    if (cached && Date.now() - cached.timestamp < 30000) {
      return NextResponse.json({
        ...cached.result,
        idempotent: true,
      });
    }

    const isCarousel = mediaUrls.length > 1;
    let creationId = '';

    // =========================================================================
    // CASE 1: MULTI-IMAGE / VIDEO CAROUSEL
    // =========================================================================
    if (isCarousel) {
      const childContainerIds: string[] = [];
      const slides = mediaUrls.slice(0, 10);

      for (let i = 0; i < slides.length; i++) {
        const slideUrl = slides[i];
        const isVideo = /\.(mp4|mov|webm)$/i.test(slideUrl);

        const childParams = new URLSearchParams();
        childParams.append('access_token', token);
        childParams.append('is_carousel_item', 'true');

        if (isVideo) {
          childParams.append('media_type', 'VIDEO');
          childParams.append('video_url', slideUrl);
        } else {
          childParams.append('media_type', 'IMAGE');
          childParams.append('image_url', slideUrl);
        }

        const childRes = await fetch(
          `https://graph.threads.net/v1.0/${encodeURIComponent(cleanUserId)}/threads`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: childParams.toString(),
          }
        );

        const childData = await childRes.json();
        if (!childRes.ok || !childData.id) {
          throw new Error(
            childData.error?.message ||
              `Failed to create carousel item ${i + 1} on Threads.`
          );
        }

        childContainerIds.push(childData.id);

        // If video, poll status until container is ready
        if (isVideo) {
          await waitForContainerReady(childData.id, token);
        }
      }

      // Create Carousel Container
      const carouselParams = new URLSearchParams();
      carouselParams.append('access_token', token);
      carouselParams.append('media_type', 'CAROUSEL');
      carouselParams.append('children', childContainerIds.join(','));
      if (message?.trim()) {
        carouselParams.append('text', message.trim());
      }

      const carouselRes = await fetch(
        `https://graph.threads.net/v1.0/${encodeURIComponent(cleanUserId)}/threads`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: carouselParams.toString(),
        }
      );

      const carouselData = await carouselRes.json();
      if (!carouselRes.ok || !carouselData.id) {
        throw new Error(
          carouselData.error?.message || 'Failed to create carousel container on Threads.'
        );
      }

      creationId = carouselData.id;
    }
    // =========================================================================
    // CASE 2: SINGLE PHOTO
    // =========================================================================
    else if (mediaUrls.length === 1 && !/\.(mp4|mov|webm)$/i.test(mediaUrls[0])) {
      const photoParams = new URLSearchParams();
      photoParams.append('access_token', token);
      photoParams.append('media_type', 'IMAGE');
      photoParams.append('image_url', mediaUrls[0]);
      if (message?.trim()) {
        photoParams.append('text', message.trim());
      }

      const photoRes = await fetch(
        `https://graph.threads.net/v1.0/${encodeURIComponent(cleanUserId)}/threads`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: photoParams.toString(),
        }
      );

      const photoData = await photoRes.json();
      if (!photoRes.ok || !photoData.id) {
        throw new Error(photoData.error?.message || 'Failed to create photo container on Threads.');
      }

      creationId = photoData.id;
    }
    // =========================================================================
    // CASE 3: SINGLE VIDEO
    // =========================================================================
    else if (mediaUrls.length === 1 && /\.(mp4|mov|webm)$/i.test(mediaUrls[0])) {
      const videoParams = new URLSearchParams();
      videoParams.append('access_token', token);
      videoParams.append('media_type', 'VIDEO');
      videoParams.append('video_url', mediaUrls[0]);
      if (message?.trim()) {
        videoParams.append('text', message.trim());
      }

      const videoRes = await fetch(
        `https://graph.threads.net/v1.0/${encodeURIComponent(cleanUserId)}/threads`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: videoParams.toString(),
        }
      );

      const videoData = await videoRes.json();
      if (!videoRes.ok || !videoData.id) {
        throw new Error(videoData.error?.message || 'Failed to create video container on Threads.');
      }

      creationId = videoData.id;
      await waitForContainerReady(creationId, token);
    }
    // =========================================================================
    // CASE 4: PURE TEXT THREAD
    // =========================================================================
    else {
      const textParams = new URLSearchParams();
      textParams.append('access_token', token);
      textParams.append('media_type', 'TEXT');
      textParams.append('text', (message || '').trim());

      const textRes = await fetch(
        `https://graph.threads.net/v1.0/${encodeURIComponent(cleanUserId)}/threads`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: textParams.toString(),
        }
      );

      const textData = await textRes.json();
      if (!textRes.ok || !textData.id) {
        throw new Error(textData.error?.message || 'Failed to create text container on Threads.');
      }

      creationId = textData.id;
    }

    // =========================================================================
    // FINAL STEP: PUBLISH THE CONTAINER
    // =========================================================================
    const publishParams = new URLSearchParams();
    publishParams.append('access_token', token);
    publishParams.append('creation_id', creationId);

    const publishRes = await fetch(
      `https://graph.threads.net/v1.0/${encodeURIComponent(cleanUserId)}/threads_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: publishParams.toString(),
      }
    );

    const publishData = await publishRes.json();

    if (!publishRes.ok || !publishData.id) {
      throw new Error(
        publishData.error?.message || 'Failed to publish container on Threads.'
      );
    }

    const publishedId = publishData.id;
    const result = {
      success: true,
      postId: publishedId,
      threadId: publishedId,
      url: `https://www.threads.net/@user/post/${publishedId}`,
    };

    recentThreadsPublishes.set(idempotencyKey, {
      timestamp: Date.now(),
      result,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Threads Publish Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to publish to Threads.',
      },
      { status: 500 }
    );
  }
}

/**
 * Polls container status until video processing is FINISHED or times out (up to 30s)
 */
async function waitForContainerReady(containerId: string, accessToken: string, maxAttempts = 12) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 2500));
    try {
      const res = await fetch(
        `https://graph.threads.net/v1.0/${encodeURIComponent(
          containerId
        )}?fields=status,error_message&access_token=${encodeURIComponent(accessToken)}`
      );
      const data = await res.json();
      if (data.status === 'FINISHED') {
        return true;
      }
      if (data.status === 'ERROR') {
        throw new Error(data.error_message || 'Video processing failed on Threads.');
      }
    } catch (e: any) {
      if (e?.message?.includes('Video processing failed')) throw e;
    }
  }
  return true;
}
