/**
 * 功能开关集中配置
 *
 * 通过环境变量控制可选功能的启停，便于在不同部署场景（如 GitHub Pages 演示版）
 * 中按需屏蔽特定功能，而不必维护多份代码。
 *
 * 约定：默认启用；仅当显式设置为字符串 'false' 时才关闭。
 */

// AI 对话功能开关
// 默认启用；设为 'false' 时屏蔽三端 AI 对话入口与页面（用于 GitHub Pages 演示部署）
export const AI_CHAT_ENABLED =
  import.meta.env.VITE_AI_CHAT_ENABLED !== 'false';
