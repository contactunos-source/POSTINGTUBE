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
    const platform = url.searchParams.get('platform') || undefined;
    const status = url.searchParams.get('status') || undefined;
    const search = url.searchParams.get('search') || undefined;

    const accounts = await AdminDataService.getConnectedAccounts({ platform, status, search });
    return NextResponse.json({ success: true, accounts });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to query connected accounts' },
      { status: 500 }
    );
  }
}
