import React, { useEffect, useState, useCallback } from 'react';
import { create } from 'zustand';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  onClose: (id: string) => void;
  duration?: number;
}

interface ToastState {
  toasts: ToastProps[];
  addToast: (type: ToastType, message: string, duration?: number) => string;
  removeToast: (id: string) => void;
}

interface ToastContainerProps {
  toasts?: ToastProps[];
}

const typeClasses: Record<ToastType, string> = {
  success: 'bg-success-500 text-white',
  error: 'bg-danger-500 text-white',
  warning: 'bg-warning-500 text-white',
  info: 'bg-primary-500 text-white',
};

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

const ToastItem: React.FC<ToastProps> = ({ id, type, message, onClose, duration = 3000 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));

    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(() => onClose(id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

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
 */
export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts }) => {
  const storeToasts = useToastStore((s) => s.toasts);
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
 */
export const useToast = () => {
  const toasts = useToastStore((s) => s.toasts);

  const addToast = useCallback((type: ToastType, message: string, duration?: number) => {
    return useToastStore.getState().addToast(type, message, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    useToastStore.getState().removeToast(id);
  }, []);

  const success = useCallback((message: string, duration?: number) => addToast('success', message, duration), [addToast]);
  const error = useCallback((message: string, duration?: number) => addToast('error', message, duration), [addToast]);
  const warning = useCallback((message: string, duration?: number) => addToast('warning', message, duration), [addToast]);
  const info = useCallback((message: string, duration?: number) => addToast('info', message, duration), [addToast]);

  return { toasts, addToast, removeToast, success, error, warning, info };
};

export default ToastContainer;
