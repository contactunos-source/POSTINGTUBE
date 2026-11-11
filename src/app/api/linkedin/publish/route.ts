import { NextRequest, NextResponse } from 'next/server';

/**
 * LinkedIn Official REST Posts API Publisher
 * Official API: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
 * Version: 202401
 */
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
          const initRes = await fetch('https://api.linkedin.com/rest/videos?action=initializeUpload', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'LinkedIn-Version': '202401',
              'X-Restli-Protocol-Version': '2.0.0',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              initializeUploadRequest: {
                owner: authorUrn,
                fileSizeBytes: mediaBuffer.byteLength,
                uploadCaptions: false,
                uploadThumbnail: false,
              },
            }),
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
              const finalizeRes = await fetch('https://api.linkedin.com/rest/videos?action=finalizeUpload', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'LinkedIn-Version': '202401',
                  'X-Restli-Protocol-Version': '2.0.0',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  finalizeUploadRequest: {
                    video: videoUrn,
                    uploadToken,
                    uploadedPartIds,
                  },
                }),
              });

              if (finalizeRes.ok) {
                // Poll video status briefly to ensure LinkedIn marks it ready/processing
                for (let attempt = 0; attempt < 4; attempt++) {
                  await new Promise((resolve) => setTimeout(resolve, 2000));
                  try {
                    const statusRes = await fetch(`https://api.linkedin.com/rest/videos/${encodeURIComponent(videoUrn)}`, {
                      headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'LinkedIn-Version': '202401',
                        'X-Restli-Protocol-Version': '2.0.0',
                      },
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
          const initRes = await fetch('https://api.linkedin.com/rest/images?action=initializeUpload', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'LinkedIn-Version': '202401',
              'X-Restli-Protocol-Version': '2.0.0',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              initializeUploadRequest: {
                owner: authorUrn,
              },
            }),
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
    const postRes = await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'LinkedIn-Version': '202401',
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postPayload),
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
          linkedinVersion: '202401',
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
