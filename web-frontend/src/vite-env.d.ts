/**
 * @file vite-env.d.ts
 * @description Vite 环境变量类型声明，扩展 import.meta.env 的 TS 类型，使业务代码可安全访问自定义环境变量
 * @module web-frontend
 */
/// <reference types="vite/client" />

/**
 * 自定义环境变量集合（对应 .env 文件中以 VITE_ 前缀定义的变量）
 */
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string; // 后端 REST API 基础地址
  readonly VITE_AI_ENGINE_URL: string; // AI 引擎服务地址
  readonly VITE_WS_URL: string; // WebSocket 连接地址
  readonly VITE_AI_CHAT_ENABLED?: string; // 是否启用 AI 对话（可选，运行期字符串开关）
}

/**
 * 对 Vite 内置的 ImportMeta 进行扩展，使其携带上述自定义环境变量类型
 */
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
