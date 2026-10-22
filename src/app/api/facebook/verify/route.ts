import { NextRequest, NextResponse } from 'next/server';

/**
 * Verifies Facebook Access Token against the Meta Graph API v20.0.
 * Automatically discovers all Pages managed by the user, and gets Page-scoped tokens.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let { accessToken, pageId } = body;

    // Fallback to server environment variables if not provided
    if (!accessToken && process.env.FACEBOOK_PAGE_ACCESS_TOKEN) {
      accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    }
    if (!pageId && process.env.FACEBOOK_PAGE_ID) {
      pageId = process.env.FACEBOOK_PAGE_ID;
    }

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'Facebook Access Token is required.' },
        { status: 400 }
      );
    }

    const cleanToken = accessToken.trim();
    const cleanPageId = pageId ? pageId.trim() : null;

    interface DetectedPage {
      id: string;
      name: string;
      avatarUrl: string;
      accessToken: string;
    }

    const detectedPages: DetectedPage[] = [];

    // Helper to fetch Page token for a specific Page ID
    async function addPageById(id: string, token: string) {
      try {
        const res = await fetch(
          `https://graph.facebook.com/v20.0/${id}?fields=id,name,picture.type(large),access_token&access_token=${encodeURIComponent(
            token
          )}`
        );
        const data = await res.json();
        if (data.id && data.name) {
          detectedPages.push({
            id: data.id,
            name: data.name,
            avatarUrl: data.picture?.data?.url || '',
            accessToken: data.access_token || token,
          });
        }
      } catch (err) {
        console.error('Error fetching page', err);
      }
    }

    // Check specific known Page ID (or user's target Page 868941086292404)
    if (cleanPageId) {
      await addPageById(cleanPageId, cleanToken);
    }

    // Also check standard /me/accounts
    try {
      const accountsRes = await fetch(
        `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,picture.type(large),access_token&access_token=${encodeURIComponent(
          cleanToken
        )}`
      );
      const accountsData = await accountsRes.json();
      if (accountsData.data && Array.isArray(accountsData.data)) {
        accountsData.data.forEach((p: any) => {
          if (!detectedPages.some((dp) => dp.id === p.id)) {
            detectedPages.push({
              id: p.id,
              name: p.name,
              avatarUrl: p.picture?.data?.url || '',
              accessToken: p.access_token || cleanToken,
            });
          }
        });
      }
    } catch (e) {
      console.error(e);
    }

    // If still empty, check target page 868941086292404 directly
    if (detectedPages.length === 0) {
      await addPageById('868941086292404', cleanToken);
    }

    return NextResponse.json({
      success: true,
      pages: detectedPages,
      page: detectedPages[0] || null,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to connect to Meta Graph API';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
