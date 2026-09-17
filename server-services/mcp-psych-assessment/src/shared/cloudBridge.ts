// src/shared/cloudBridge.ts
// fetch 微信云开发 webhook；msSecCheck 返回布尔（违规=true）。
// 注入 fetch 便于单测。

export type FetchFn = (
  url: string,
  init?: { method?: string; body?: string; headers?: Record<string, string> },
) => Promise<{ ok: boolean; status: number; json: () => Promise<Record<string, unknown>> }>;

let fetchImpl: FetchFn | null = null;
export function setFetchImpl(fn: FetchFn | null): void {
  fetchImpl = fn;
}

function getFetch(): FetchFn {
  if (fetchImpl) return fetchImpl;
  // 全局 fetch 兜底
  return (globalThis as unknown as { fetch: FetchFn }).fetch;
}

export interface MsSecCheckResult {
  violate: boolean; // true 表示违规
  raw?: unknown;
}

/**
 * 调用微信云开发内容安全 webhook。
 * 返回 true 表示违规，调用方需阻断后续流程。
 */
export async function msSecCheck(content: string): Promise<boolean> {
  const mode = process.env.WX_CLOUD_MODE || '';
  // 若未配置微信云，默认放行（false 表示不违规），便于本地开发
  if (!mode) return false;
  const url = `https://servicewechat.com/cloud/msSecCheck?mode=${encodeURIComponent(mode)}`;
  const f = getFetch();
  if (!f) return false;
  const resp = await f(url, {
    method: 'POST',
    body: JSON.stringify({ content }),
    headers: { 'content-type': 'application/json' },
  });
  if (!resp.ok) return false;
  const body = await resp.json();
  const violate = body.violate === true || body.errcode !== 0;
  return Boolean(violate);
}
