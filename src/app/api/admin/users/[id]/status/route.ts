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
    const body = await req.json().catch(() => ({}));
    const { status } = body;

    if (status !== 'active' && status !== 'suspended') {
      return NextResponse.json({ success: false, error: 'Invalid status. Must be active or suspended.' }, { status: 400 });
    }

    const res = await AdminDataService.updateUserStatus(id, status);

    await logAdminAudit({
      eventType: status === 'suspended' ? 'USER_ACCOUNT_SUSPENDED' : 'USER_ACCOUNT_REACTIVATED',
      actorEmail: auth.email,
      targetType: 'USER',
      targetId: id,
      details: { newStatus: status },
      status: 'success',
    });

    return NextResponse.json({ success: true, message: res.message });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to update user status' },
      { status: 500 }
    );
  }
}
