// DELETE /api/admin/messages/:id —— 硬删除（需鉴权）
import { ObjectId } from 'mongodb';
import { withCollection } from '../../../../lib/mongo.js';
import { respond, corsHeaders } from '../../../../lib/common.js';
import { requireAdmin } from '../../../../lib/authz.js';

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestDelete(context) {
  const denied = await requireAdmin(context);
  if (denied) return denied;
  let objectId;
  try { objectId = new ObjectId(context.params.id); } catch (e) { return respond(400, { error: '无效 ID' }); }
  try {
    const result = await withCollection(context.env, (col) => col.deleteOne({ _id: objectId }));
    if (result.deletedCount === 0) return respond(404, { error: '留言不存在' });
    return respond(200, { ok: true });
  } catch (e) {
    return respond(500, { error: '删除失败' });
  }
}