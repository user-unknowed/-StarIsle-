import React, { useEffect, useCallback, useRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
  dismissible?: boolean;
  className?: string;
}

const sizeClasses: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  full: 'max-w-full',
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

let modalTitleIdCounter = 0;

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  dismissible = true,
  className,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  // 为 aria-labelledby 生成稳定 id（每个 Modal 实例一份）
  const titleIdRef = useRef<string>(`modal-title-${++modalTitleIdCounter}`);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
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

        if (e.shiftKey) {
          if (active === first || !modalRef.current.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last || !modalRef.current.contains(active)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [isOpen, onClose, dismissible]
  );

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

  const handleMaskClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && dismissible) {
        onClose();
      }
    },
    [onClose, dismissible]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-mask"
      onClick={handleMaskClick}
    >
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
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
