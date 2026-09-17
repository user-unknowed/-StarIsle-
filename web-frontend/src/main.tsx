/**
 * @file main.tsx
 * @description 应用入口文件，负责将根组件挂载到 DOM、启用严格模式并挂载全局 Toast 容器
 * @module web-frontend
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ToastContainer } from './components/ui/Toast'
import './index.css'

// 将应用挂载到 #root 节点：严格模式帮助在开发期暴露潜在副作用问题，ToastContainer 提供全局提示能力
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <ToastContainer />
  </StrictMode>,
)
