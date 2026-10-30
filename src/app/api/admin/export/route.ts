import { NextRequest, NextResponse } from 'next/server';
import { verifyOwnerRequest, logAdminAudit } from '@/lib/admin/auth';
import { AdminDataService } from '@/lib/admin/service';

export async function GET(req: NextRequest) {
  const auth = verifyOwnerRequest(req);
  if (!auth.valid || !auth.email) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Owner access required' }, { status: 401 });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get('type') || 'users';

  await logAdminAudit({
    eventType: 'ADMIN_REPORT_EXPORTED',
    actorEmail: auth.email,
    details: { exportType: type },
    status: 'success',
  });

  try {
    if (type === 'users') {
      const { users } = await AdminDataService.getUsers({ limit: 1000 });
      const headers = ['ID', 'Email', 'Full Name', 'Status', 'Plan', 'Payment Status', 'Connected Accounts', 'Total Posts', 'Registered At'];
      const rows = users.map((u) => [
        `"${u.id}"`,
        `"${u.email}"`,
        `"${u.fullName}"`,
        `"${u.status}"`,
        `"${u.plan}"`,
        `"${u.paymentStatus}"`,
        u.connectedAccountsCount,
        u.postsCount.total,
        `"${u.registeredAt}"`,
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="postingtube_users_${Date.now()}.csv"`,
        },
      });
    }

    if (type === 'posts') {
      const { posts } = await AdminDataService.getPosts({ limit: 1000 });
      const headers = ['Post ID', 'Status', 'Post Type', 'Scheduled For', 'Published At', 'Destinations', 'Created At'];
      const rows = posts.map((p) => [
        `"${p.id}"`,
        `"${p.status}"`,
        `"${p.postType}"`,
        `"${p.scheduledFor || ''}"`,
        `"${p.publishedAt || ''}"`,
        p.targetAccountIds.length,
        `"${p.createdAt}"`,
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="postingtube_posts_${Date.now()}.csv"`,
        },
      });
    }

    if (type === 'billing') {
      const billing = await AdminDataService.getBilling();
      const headers = ['Subscription ID', 'User ID', 'Plan Name', 'Amount', 'Currency', 'Interval', 'Status', 'Provider', 'Renewal Date'];
      const rows = billing.subscriptions.map((s) => [
        `"${s.id}"`,
        `"${s.user_id}"`,
        `"${s.plan_name}"`,
        s.amount,
        `"${s.currency}"`,
        `"${s.billing_interval}"`,
        `"${s.status}"`,
        `"${s.provider}"`,
        `"${s.current_period_end}"`,
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="postingtube_billing_${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown export type' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Export error' },
      { status: 500 }
    );
  }
}
