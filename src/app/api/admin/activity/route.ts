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
    const eventType = url.searchParams.get('eventType') || undefined;
    const search = url.searchParams.get('search') || undefined;
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);

    const logs = await AdminDataService.getActivityLogs({ eventType, search, limit });
    return NextResponse.json({ success: true, logs });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to query activity logs' },
      { status: 500 }
    );
  }
}
