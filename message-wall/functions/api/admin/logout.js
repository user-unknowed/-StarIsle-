// POST /api/admin/logout —— 无状态 token 无需服务端注销
import { respond, corsHeaders } from '../../lib/common.js';

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestPost() {
  return respond(200, { ok: true });
}