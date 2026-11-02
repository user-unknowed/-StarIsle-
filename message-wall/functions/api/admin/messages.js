// GET /api/admin/messages?status=xxx —— 按状态列出留言（需鉴权）
import { withCollection } from '../../lib/mongo.js';
import { respond, corsHeaders } from '../../lib/common.js';
import { requireAdmin } from '../../lib/authz.js';

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestGet(context) {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  const url = new URL(context.request.url);
  const status = ['pending', 'approved', 'rejected'].includes(url.searchParams.get('status'))
    ? url.searchParams.get('status')
    : 'pending';
  try {
    const list = await withCollection(context.env, (col) =>
      col.find({ status }).sort({ createdAt: -1 }).limit(500).toArray()
    );
    return respond(200, { ok: true, list });
  } catch (e) {
    return respond(500, { error: '加载失败' });
  }
}