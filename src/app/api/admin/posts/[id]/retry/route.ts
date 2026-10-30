import { NextRequest, NextResponse } from 'next/server';
import { verifyOwnerRequest, logAdminAudit } from '@/lib/admin/auth';
import { AdminDataService } from '@/lib/admin/service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = verifyOwnerRequest(req);
  if (!auth.valid || !auth.email) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Owner access required' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const res = await AdminDataService.retryPost(id);

    await logAdminAudit({
      eventType: 'POST_RETRY_TRIGGERED_BY_OWNER',
      actorEmail: auth.email,
      targetType: 'POST',
      targetId: id,
      status: 'success',
    });

    return NextResponse.json({ success: true, message: res.message });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to retry post' },
      { status: 500 }
    );
  }
}
