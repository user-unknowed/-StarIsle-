/**
 * @file Modal.tsx
 * @description 通用模态弹窗组件，支持标题、尺寸档位、可关闭遮罩，并实现键盘焦点陷阱与焦点恢复等无障碍特性
 * @module web-frontend/components/ui
 */
import React, { useEffect, useCallback, useRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 模态弹窗组件属性
 */
interface ModalProps {
  isOpen: boolean; // 是否打开
  onClose: () => void; // 关闭回调
  title?: string; // 可选标题
  children: React.ReactNode; // 弹窗主体内容
  size?: 'sm' | 'md' | 'lg' | 'full'; // 尺寸档位
  dismissible?: boolean; // 是否允许点击遮罩与 Esc 关闭
  className?: string; // 自定义类名
}

/** 各尺寸对应的最大宽度类名 */
const sizeClasses: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  full: 'max-w-full',
};

// 可聚焦元素选择器，用于焦点陷阱计算
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

// 模态标题 id 计数器，保证多个 Modal 实例 id 唯一
let modalTitleIdCounter = 0;

/**
 * 通用模态弹窗组件
 * @param props - 弹窗属性
 * @returns JSX 元素（未打开时返回 null）
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  dismissible = true,
  className,
}) => {
  // 弹窗容器 ref，用于焦点管理与遮罩点击判断
  const modalRef = useRef<HTMLDivElement>(null);
  // 触发元素 ref，记录打开前的焦点元素以便关闭后恢复
  const triggerRef = useRef<HTMLElement | null>(null);
  // 为 aria-labelledby 生成稳定 id（每个 Modal 实例一份）
  const titleIdRef = useRef<string>(`modal-title-${++modalTitleIdCounter}`);

  /**
   * 键盘事件处理：Esc 关闭、Tab 在 Modal 内循环（焦点陷阱）
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Esc 关闭（仅在允许关闭时）
      if (e.key === 'Escape' && isOpen && dismissible) {
        onClose();
        return;
      }

      // Tab 焦点陷阱：在 Modal 内循环
      if (e.key === 'Tab' && isOpen && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusable.length === 0) {
          e.preventDefault();
          modalRef.current.focus();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement as HTMLElement | null;

        // Shift+Tab：在首个元素上时跳到末尾
        if (e.shiftKey) {
          if (active === first || !modalRef.current.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          // 普通 Tab：在末尾元素上时跳到首位
          if (active === last || !modalRef.current.contains(active)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [isOpen, onClose, dismissible]
  );

  // 打开/关闭时的副作用：绑定键盘事件、锁滚动、聚焦与恢复
  useEffect(() => {
    if (isOpen) {
      // 记录打开前的焦点元素，关闭时恢复
      triggerRef.current = document.activeElement as HTMLElement | null;

      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      // 打开后聚焦 Modal 内首个可聚焦元素（或容器本身）
      const focusTimeout = setTimeout(() => {
        if (!modalRef.current) return;
        const focusable = modalRef.current.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusable) {
          focusable.focus();
        } else {
          modalRef.current.focus();
        }
      }, 0);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
        clearTimeout(focusTimeout);
        // 恢复焦点到触发元素
        if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
          triggerRef.current.focus();
        }
      };
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  /**
   * 遮罩点击：仅当点击的是遮罩自身（非弹窗内容）且允许关闭时才关闭
   */
  const handleMaskClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && dismissible) {
        onClose();
      }
    },
    [onClose, dismissible]
  );

  // 未打开时不渲染
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-mask"
      onClick={handleMaskClick}
    >
      {/* 半透明遮罩 + 背景模糊 + 渐入动画 */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleIdRef.current : undefined}
        tabIndex={-1}
        className={twMerge(
          clsx(
            'relative w-full bg-white rounded-xl shadow-2xl animate-scale-in outline-none',
            sizeClasses[size],
            className
          )
        )}
      >
        {/* 头部：标题 + 关闭按钮（仅当有标题或可关闭时渲染） */}
        {(title || dismissible) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            {title && (
              <h3 id={titleIdRef.current} className="text-lg font-semibold text-gray-900">
                {title}
              </h3>
            )}
            {dismissible && (
              <button
                onClick={onClose}
                aria-label="关闭"
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        {/* 主体内容 */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
