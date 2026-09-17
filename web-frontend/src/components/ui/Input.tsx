/**
 * @file Input.tsx
 * @description 通用输入框组件，支持标签、错误/成功提示、左右图标与变体（默认/错误/成功）
 * @module web-frontend/components/ui
 */
import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** 输入框视觉变体类型 */
export type InputVariant = 'default' | 'error' | 'success';

/**
 * 输入框组件属性
 */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string; // 标签文本
  error?: string; // 错误提示文本（存在时强制变体为 error）
  success?: string; // 成功提示文本（存在时强制变体为 success）
  icon?: React.ReactNode; // 左侧图标
  iconRight?: React.ReactNode; // 右侧图标
  variant?: InputVariant; // 视觉变体
}

/** 各变体对应的边框与聚焦色 Tailwind 类名 */
const variantClasses: Record<InputVariant, string> = {
  default: 'border-gray-300 focus:border-primary-500 focus:ring-primary-500/20',
  error: 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20',
  success: 'border-success-500 focus:border-success-500 focus:ring-success-500/20',
};

/**
 * 通用输入框组件
 * @param props - 输入框属性，含标签、错误/成功提示、图标、变体等
 * @returns JSX 元素
 */
export const Input: React.FC<InputProps> = ({
  label,
  error,
  success,
  icon,
  iconRight,
  variant = 'default',
  className,
  type = 'text',
  id,
  ...props
}) => {
  // 计算实际生效变体：错误优先，其次成功，最后取传入值
  const computedVariant = error ? 'error' : success ? 'success' : variant;
  // 自动生成 input id（基于 label），用于 label/aria-describedby 关联
  const inputId = id || (label ? `input-${label.replace(/\s+/g, '-')}` : undefined);
  // 错误提示元素的 id，供 aria-describedby 引用
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      {/* 可选标签 */}
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="relative">
        {/* 左侧图标绝对定位 */}
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          type={type}
          aria-invalid={!!error}
          aria-describedby={errorId}
          className={twMerge(
            clsx(
              'w-full px-4 py-2.5 text-base bg-white text-gray-900 border-2 rounded-lg transition-all duration-fast focus:outline-none focus:ring-2',
              icon && 'pl-10',
              iconRight && 'pr-10',
              variantClasses[computedVariant],
              className
            )
          )}
          {...props}
        />
        {/* 右侧图标绝对定位 */}
        {iconRight && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">
            {iconRight}
          </div>
        )}
      </div>
      {/* 错误提示（带 role=alert 便于读屏） */}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-danger-600">{error}</p>
      )}
      {/* 成功提示 */}
      {success && (
        <p className="text-sm text-success-600">{success}</p>
      )}
    </div>
  );
};

export default Input;