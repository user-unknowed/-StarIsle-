/**
 * @file Toast.tsx
 * @description 全局轻提示（Toast）组件，基于 zustand 维护共享队列，支持成功/错误/警告/信息四种类型与自动消失动画
 * @module web-frontend/components/ui
 */
import React, { useEffect, useState, useCallback } from 'react';
import { create } from 'zustand';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Toast 类型 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * 单条 Toast 的属性
 */
export interface ToastProps {
  id: string; // 唯一标识
  type: ToastType; // 类型
  message: string; // 显示文本
  onClose: (id: string) => void; // 关闭回调
  duration?: number; // 持续时长（毫秒）
}

/**
 * Toast store 状态
 */
interface ToastState {
  toasts: ToastProps[]; // 当前队列
  addToast: (type: ToastType, message: string, duration?: number) => string; // 新增并返回 id
  removeToast: (id: string) => void; // 按 id 移除
}

/**
 * Toast 容器属性（可选外部传入 toast 列表，默认取 store）
 */
interface ToastContainerProps {
  toasts?: ToastProps[];
}

/** 各类型对应的背景与文字色 */
const typeClasses: Record<ToastType, string> = {
  success: 'bg-success-500 text-white',
  error: 'bg-danger-500 text-white',
  warning: 'bg-warning-500 text-white',
  info: 'bg-primary-500 text-white',
};

/** 各类型对应的图标（内联 SVG） */
const iconMap: Record<ToastType, React.ReactNode> = {
  success: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

// 全局 Toast store：所有页面共享同一个 toast 队列
export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  addToast: (type, message, duration) => {
    // 生成带时间戳与随机串的唯一 id
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    set((state) => ({
      toasts: [...state.toasts, { id, type, message, duration, onClose: useToastStore.getState().removeToast }],
    }));
    return id;
  },
  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
  },
}));

/**
 * 单条 Toast 组件：负责入场/出场动画与自动关闭
 * @param props - Toast 属性
 * @returns JSX 元素
 */
const ToastItem: React.FC<ToastProps> = ({ id, type, message, onClose, duration = 3000 }) => {
  // 是否已进入可见态
  const [isVisible, setIsVisible] = useState(false);
  // 是否处于离场动画
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // 下一帧触发进入动画
    requestAnimationFrame(() => setIsVisible(true));

    // duration 后触发离场动画，再延迟调用 onClose 真正移除
    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(() => onClose(id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  /**
   * 手动关闭：触发离场动画后移除
   */
  const handleClose = useCallback(() => {
    setIsLeaving(true);
    setTimeout(() => onClose(id), 300);
  }, [id, onClose]);

  return (
    <div
      className={twMerge(
        clsx(
          'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg transition-all duration-fast',
          typeClasses[type],
          // 进入且未离场时显示，否则上移淡出
          isVisible && !isLeaving ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
        )
      )}
    >
      {iconMap[type]}
      <span className="flex-1 text-sm font-medium">{message}</span>
      <button
        onClick={handleClose}
        aria-label="关闭"
        className="p-1 hover:bg-white/20 rounded transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

/**
 * 全局 Toast 容器。自包含：从 useToastStore 读取 toasts，无需传 props。
 * 保留可选 toasts prop 以兼容尚未迁移的旧调用方。
 * @param props - 容器属性
 * @returns JSX 元素
 */
export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts }) => {
  const storeToasts = useToastStore((s) => s.toasts);
  // 优先使用外部传入，否则使用 store 队列
  const list = toasts ?? storeToasts;

  return (
    <div
      role="region"
      aria-live="polite"
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm"
    >
      {list.map((toast) => (
        <ToastItem key={toast.id} {...toast} />
      ))}
    </div>
  );
};

/**
 * Toast hook。保持原有返回形状以兼容调用方：
 * const toast = useToast(); toast.info('msg');
 * @returns 含 addToast/removeToast 及 success/error/warning/info 快捷方法的对象
 */
export const useToast = () => {
  const toasts = useToastStore((s) => s.toasts);

  // 直接调用 store 的 addToast（不依赖渲染期 state）
  const addToast = useCallback((type: ToastType, message: string, duration?: number) => {
    return useToastStore.getState().addToast(type, message, duration);
  }, []);

  // 直接调用 store 的 removeToast
  const removeToast = useCallback((id: string) => {
    useToastStore.getState().removeToast(id);
  }, []);

  // 各类型快捷方法
  const success = useCallback((message: string, duration?: number) => addToast('success', message, duration), [addToast]);
  const error = useCallback((message: string, duration?: number) => addToast('error', message, duration), [addToast]);
  const warning = useCallback((message: string, duration?: number) => addToast('warning', message, duration), [addToast]);
  const info = useCallback((message: string, duration?: number) => addToast('info', message, duration), [addToast]);

  return { toasts, addToast, removeToast, success, error, warning, info };
};

export default ToastContainer;
