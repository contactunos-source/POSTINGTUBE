import { NextRequest, NextResponse } from 'next/server';
import { verifyOwnerRequest } from '@/lib/admin/auth';
import { AdminDataService } from '@/lib/admin/service';

export async function GET(req: NextRequest) {
  const auth = verifyOwnerRequest(req);
  if (!auth.valid) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Owner access required' }, { status: 401 });
  }

  try {
    const data = await AdminDataService.getBilling();
    return NextResponse.json({ success: true, ...data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to query billing records' },
      { status: 500 }
    );
  }
}
