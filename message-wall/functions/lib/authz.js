// 管理端鉴权辅助（Bearer token，无状态 HMAC）
import { respond, bearerToken, verifyToken } from './common.js';

export async function requireAdmin(context) {
  const token = bearerToken(context.request);
  if (!token || !(await verifyToken(token, context.env.ADMIN_PASSWORD))) {
    return respond(401, { error: '未登录或登录已过期' });
  }
  return null;
}