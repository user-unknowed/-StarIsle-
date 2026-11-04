// POST /api/admin/login —— 密码校验，签发无状态 token
import { respond, readJson, issueToken, corsHeaders } from '../../lib/common.js';

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestPost(context) {
  const body = await readJson(context.request);
  const password = String(body.password || '');
  if (!context.env.ADMIN_PASSWORD || password !== context.env.ADMIN_PASSWORD) {
    return respond(401, { error: '密码错误' });
  }
  const token = await issueToken(context.env.ADMIN_PASSWORD);
  return respond(200, { ok: true, token });
}