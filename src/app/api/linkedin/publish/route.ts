import { NextRequest, NextResponse } from 'next/server';

/**
 * LinkedIn Official REST Posts API Publisher
 * Official API: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
 * Version: Active 2026 monthly release (e.g. 202610 / 202609) with auto-fallback
 */
const DEFAULT_LINKEDIN_VERSION = process.env.LINKEDIN_API_VERSION || '202610';
const CANDIDATE_VERSIONS = [
  DEFAULT_LINKEDIN_VERSION,
  '202610',
  '202609',
  '202608',
  '202607',
  '202606',
  '202605',
  '202604',
  '202603',
  '202602',
  '202601',
  '202611',
  '202512',
  '202511',
];

async function fetchLinkedInRest(
  url: string,
  options: {
    method: string;
    accessToken: string;
    body?: any;
    version?: string;
  }
): Promise<Response> {
  let activeVersion = options.version || DEFAULT_LINKEDIN_VERSION;
  const buildHeaders = (v: string) => ({
    Authorization: `Bearer ${options.accessToken}`,
    'LinkedIn-Version': v,
    'X-Restli-Protocol-Version': '2.0.0',
    'Content-Type': 'application/json',
  });

  const bodyStr = options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined;

  let res = await fetch(url, {
    method: options.method,
    headers: buildHeaders(activeVersion),
    body: bodyStr,
  });

  // If LinkedIn reports version is not active (HTTP 426 Upgrade Required or NONEXISTENT_VERSION / 400)
  if (res.status === 426 || res.status === 400) {
    let clonedText = '';
    try {
      clonedText = await res.clone().text();
    } catch {}

    const isVersionError =
      res.status === 426 ||
      clonedText.includes('is not active') ||
      clonedText.includes('NONEXISTENT_VERSION');

    if (isVersionError) {
      for (const fallbackVer of CANDIDATE_VERSIONS) {
        if (fallbackVer === activeVersion) continue;
        console.warn(`[LinkedIn REST] Version ${activeVersion} not active, retrying with ${fallbackVer}...`);
        const retryRes = await fetch(url, {
          method: options.method,
          headers: buildHeaders(fallbackVer),
          body: bodyStr,
        });

        if (retryRes.status !== 426) {
          let retryText = '';
          try {
            retryText = await retryRes.clone().text();
          } catch {}
          if (!retryText.includes('is not active') && !retryText.includes('NONEXISTENT_VERSION')) {
            return retryRes;
          }
        }
      }
    }
  }

  return res;
}
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      authorUrn,
      accessToken,
      message,
      mediaUrl,
      postType,
      title,
    } = body;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'LinkedIn Access Token is required to publish.' },
        { status: 400 }
      );
    }

    if (!authorUrn) {
      return NextResponse.json(
        { success: false, error: 'LinkedIn Author URN (person or organization) is required.' },
        { status: 400 }
      );
    }

    if (!message && !mediaUrl) {
      return NextResponse.json(
        { success: false, error: 'LinkedIn post requires commentary text or media.' },
        { status: 400 }
      );
    }

    let mediaContentPayload: any = null;

    // Handle Media (Image or Video) Upload
    if (mediaUrl) {
      try {
        // Fetch media binary first
        let mediaBuffer: ArrayBuffer | null = null;
        let contentType = 'image/jpeg';

        if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
          const fetchMediaRes = await fetch(mediaUrl);
          if (fetchMediaRes.ok) {
            mediaBuffer = await fetchMediaRes.arrayBuffer();
            contentType = fetchMediaRes.headers.get('content-type') || contentType;
          }
        }

        const isVideo =
          postType === 'video' ||
          postType === 'reel' ||
          contentType.startsWith('video/') ||
          /\.(mp4|mov|webm|m4v|avi|mkv)(\?|$)/i.test(mediaUrl);

        if (mediaBuffer && isVideo) {
          // --- Official LinkedIn REST Videos API Flow ---
          console.log('[LinkedIn Publish] Uploading video to LinkedIn REST API...');
          const initRes = await fetchLinkedInRest('https://api.linkedin.com/rest/videos?action=initializeUpload', {
            method: 'POST',
            accessToken,
            body: {
              initializeUploadRequest: {
                owner: authorUrn,
                fileSizeBytes: mediaBuffer.byteLength,
                uploadCaptions: false,
                uploadThumbnail: false,
              },
            },
          });

          if (initRes.ok) {
            const initData = await initRes.json();
            const videoUrn = initData.value?.video;
            const uploadToken = initData.value?.uploadToken || '';
            const uploadInstructions = initData.value?.uploadInstructions || [];

            if (videoUrn && uploadInstructions.length > 0) {
              const uploadedPartIds: string[] = [];

              for (const instruction of uploadInstructions) {
                const chunk = mediaBuffer.slice(instruction.firstByte, instruction.lastByte + 1);
                const chunkRes = await fetch(instruction.uploadUrl, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/octet-stream',
                  },
                  body: chunk,
                });

                if (!chunkRes.ok) {
                  throw new Error(`Video chunk upload failed with HTTP ${chunkRes.status}`);
                }

                const rawEtag = chunkRes.headers.get('etag') || chunkRes.headers.get('ETag') || '';
                uploadedPartIds.push(rawEtag);
              }

              // Finalize Video Upload
              const finalizeRes = await fetchLinkedInRest('https://api.linkedin.com/rest/videos?action=finalizeUpload', {
                method: 'POST',
                accessToken,
                body: {
                  finalizeUploadRequest: {
                    video: videoUrn,
                    uploadToken,
                    uploadedPartIds,
                  },
                },
              });

              if (finalizeRes.ok) {
                // Poll video status briefly to ensure LinkedIn marks it ready/processing
                for (let attempt = 0; attempt < 4; attempt++) {
                  await new Promise((resolve) => setTimeout(resolve, 2000));
                  try {
                    const statusRes = await fetchLinkedInRest(`https://api.linkedin.com/rest/videos/${encodeURIComponent(videoUrn)}`, {
                      method: 'GET',
                      accessToken,
                    });
                    if (statusRes.ok) {
                      const statusData = await statusRes.json();
                      if (statusData.status === 'AVAILABLE' || statusData.status === 'PROCESSING') {
                        break;
                      }
                    }
                  } catch {}
                }

                mediaContentPayload = {
                  media: {
                    title: title || 'Video',
                    id: videoUrn,
                  },
                };
                console.log('[LinkedIn Publish] Video successfully uploaded and finalized:', videoUrn);
              } else {
                const finalizeErr = await finalizeRes.text();
                console.warn('[LinkedIn Publish] Video finalize returned error:', finalizeErr);
              }
            }
          } else {
            const initErr = await initRes.text();
            console.warn('[LinkedIn Publish] Video initialize returned error:', initErr);
          }
        } else if (mediaBuffer) {
          // --- Official LinkedIn REST Images API Flow ---
          const initRes = await fetchLinkedInRest('https://api.linkedin.com/rest/images?action=initializeUpload', {
            method: 'POST',
            accessToken,
            body: {
              initializeUploadRequest: {
                owner: authorUrn,
              },
            },
          });

          if (initRes.ok) {
            const initData = await initRes.json();
            const uploadUrl = initData.value?.uploadUrl;
            const imageUrn = initData.value?.image;

            if (uploadUrl && imageUrn) {
              const uploadRes = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                  'Content-Type': contentType,
                },
                body: mediaBuffer,
              });

              if (uploadRes.ok) {
                mediaContentPayload = {
                  media: {
                    title: title || 'Post Image',
                    id: imageUrn,
                  },
                };
              } else {
                console.warn('[LinkedIn Publish] Image binary upload returned status:', uploadRes.status);
              }
            }
          } else {
            const initErr = await initRes.text();
            console.warn('[LinkedIn Publish] Initialize media upload skipped or returned:', initErr);
          }
        }
      } catch (mediaErr) {
        console.warn('[LinkedIn Publish] Media processing error:', mediaErr);
      }
    }

    // Construct Posts API payload
    const postPayload: any = {
      author: authorUrn,
      commentary: message || '',
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    };

    if (mediaContentPayload) {
      postPayload.content = mediaContentPayload;
    }

    // Submit post to official LinkedIn REST Posts API
    const postRes = await fetchLinkedInRest('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      accessToken,
      body: postPayload,
    });

    if (postRes.status === 201) {
      const createdPostUrn = postRes.headers.get('x-restli-id') || `urn:li:share:${Date.now()}`;
      const postUrl = `https://www.linkedin.com/feed/update/${encodeURIComponent(createdPostUrn)}`;

      return NextResponse.json({
        success: true,
        postId: createdPostUrn,
        postUrl,
        details: {
          author: authorUrn,
          status: 'PUBLISHED',
          linkedinVersion: DEFAULT_LINKEDIN_VERSION,
        },
      });
    }

    const errorBody = await postRes.text();
    let parsedError: any = null;
    try {
      parsedError = JSON.parse(errorBody);
    } catch {}

    const errorMessage =
      parsedError?.message ||
      parsedError?.errorDetails?.description ||
      `LinkedIn API Error (${postRes.status}): ${errorBody || postRes.statusText}`;

    console.error('[LinkedIn Publish] Failed to publish post:', errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: parsedError,
      },
      { status: postRes.status >= 400 && postRes.status < 600 ? postRes.status : 500 }
    );
  } catch (err: any) {
    console.error('[LinkedIn Publish] Exception:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Internal server error while publishing to LinkedIn',
      },
      { status: 500 }
    );
  }
}
