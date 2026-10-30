import { NextRequest, NextResponse } from 'next/server';
import { verifyOwnerRequest } from '@/lib/admin/auth';
import { AdminDataService } from '@/lib/admin/service';

export async function GET(req: NextRequest) {
  const auth = verifyOwnerRequest(req);
  if (!auth.valid) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Owner access required' }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get('status') || undefined;
    const search = url.searchParams.get('search') || undefined;
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);

    const result = await AdminDataService.getPosts({ status, search, page, limit });
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to query posts' },
      { status: 500 }
    );
  }
}
