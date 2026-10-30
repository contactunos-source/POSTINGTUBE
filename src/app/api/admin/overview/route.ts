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
    const timeframe = url.searchParams.get('timeframe') || '30d';

    const data = await AdminDataService.getOverview(timeframe);
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to retrieve overview statistics' },
      { status: 500 }
    );
  }
}
