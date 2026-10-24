import { NextRequest, NextResponse } from 'next/server';

/**
 * Standard official YouTube video categories with actual numeric category IDs
 * Returned by YouTube Data API v3 videoCategories.list endpoint.
 */
export const OFFICIAL_YOUTUBE_CATEGORIES = [
  { id: '1', title: 'Film & Animation' },
  { id: '2', title: 'Autos & Vehicles' },
  { id: '10', title: 'Music' },
  { id: '15', title: 'Pets & Animals' },
  { id: '17', title: 'Sports' },
  { id: '18', title: 'Short Movies' },
  { id: '19', title: 'Travel & Events' },
  { id: '20', title: 'Gaming' },
  { id: '21', title: 'Videoblogging' },
  { id: '22', title: 'People & Blogs' }, // YouTube default
  { id: '23', title: 'Comedy' },
  { id: '24', title: 'Entertainment' },
  { id: '25', title: 'News & Politics' },
  { id: '26', title: 'Howto & Style' },
  { id: '27', title: 'Education' },
  { id: '28', title: 'Science & Technology' },
  { id: '29', title: 'Nonprofits & Activism' },
  { id: '30', title: 'Movies' },
  { id: '31', title: 'Anime/Animation' },
  { id: '32', title: 'Action/Adventure' },
  { id: '33', title: 'Classics' },
  { id: '34', title: 'Comedy' },
  { id: '35', title: 'Documentary' },
  { id: '36', title: 'Drama' },
  { id: '37', title: 'Family' },
  { id: '38', title: 'Foreign' },
  { id: '39', title: 'Horror' },
  { id: '40', title: 'Sci-Fi/Fantasy' },
  { id: '41', title: 'Thriller' },
  { id: '42', title: 'Shorts' },
  { id: '43', title: 'Shows' },
  { id: '44', title: 'Trailers' },
];

export async function GET(req: NextRequest) {
  try {
    const accessToken = req.nextUrl.searchParams.get('accessToken');
    const regionCode = req.nextUrl.searchParams.get('regionCode') || 'US';

    if (accessToken) {
      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/videoCategories?part=snippet&regionCode=${regionCode}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            const categories = data.items
              .filter((item: any) => item.snippet?.assignable)
              .map((item: any) => ({
                id: item.id,
                title: item.snippet.title,
              }));
            if (categories.length > 0) {
              return NextResponse.json({ success: true, categories });
            }
          }
        }
      } catch (apiErr) {
        console.warn('[YouTube Categories] API fetch warning, using standard fallback:', apiErr);
      }
    }

    return NextResponse.json({
      success: true,
      categories: OFFICIAL_YOUTUBE_CATEGORIES,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch categories';
    return NextResponse.json({ success: false, error: msg, categories: OFFICIAL_YOUTUBE_CATEGORIES });
  }
}
