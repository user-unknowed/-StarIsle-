// POST /api/admin/messages/:id/review —— 通过 / 拒绝（需鉴权）
import { ObjectId } from 'mongodb';
import { withCollection } from '../../../../lib/mongo.js';
import { respond, readJson, corsHeaders } from '../../../../lib/common.js';
import { requireAdmin } from '../../../../lib/authz.js';

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestPost(context) {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  const body = await readJson(context.request);
  if (!['approve', 'reject'].includes(body.action)) return respond(400, { error: '无效操作' });
  let objectId;
  try { objectId = new ObjectId(context.params.id); } catch (e) { return respond(400, { error: '无效 ID' }); }
  try {
    const result = await withCollection(context.env, (col) =>
      col.findOneAndUpdate(
        { _id: objectId },
        { $set: { status: body.action === 'approve' ? 'approved' : 'rejected', reviewedAt: new Date() } },
        { returnDocument: 'after' }
      )
    );
    if (!result) return respond(404, { error: '留言不存在' });
    return respond(200, { ok: true, message: result });
  } catch (e) {
    return respond(500, { error: '操作失败' });
  }
}