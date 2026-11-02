// GET /api/messages —— 公开留言墙；POST /api/messages —— 匿名提交
import { withCollection } from '../lib/mongo.js';
import { respond, readJson, clientIp, isRateLimited, containsCrisisKeyword, corsHeaders } from '../lib/common.js';

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestGet(context) {
  try {
    const list = await withCollection(context.env, (col) =>
      col.find({ status: 'approved' }, { projection: { nickname: 1, content: 1, createdAt: 1, _id: 0 } })
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray()
    );
    return respond(200, { ok: true, list });
  } catch (e) {
    return respond(500, { error: '留言墙加载失败，请稍后再试' });
  }
}

export async function onRequestPost(context) {
  const body = await readJson(context.request);
  const nickname = String(body.nickname || '').trim().slice(0, 20);
  const content = String(body.content || '').trim();
  if (!content) return respond(400, { error: '留言内容不能为空' });
  if (content.length > 200) return respond(400, { error: '留言不能超过 200 字' });
  if (isRateLimited(clientIp(context.request))) {
    return respond(429, { error: '提交太频繁了，请稍等一分钟再试' });
  }
  try {
    await withCollection(context.env, (col) =>
      col.insertOne({
        nickname: nickname || '匿名',
        content,
        status: 'pending',
        flagged: containsCrisisKeyword(content),
        ipHash: '',
        createdAt: new Date(),
        reviewedAt: null,
      })
    );
    return respond(200, { ok: true, message: '已收到，审核通过后会出现在留言墙上' });
  } catch (e) {
    return respond(500, { error: '服务暂时不可用，请稍后再试' });
  }
}