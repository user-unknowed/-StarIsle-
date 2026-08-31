/**
 * @file Button.tsx
 * @description 通用按钮组件，支持多种视觉变体（主/次/描边/幽灵/危险）、尺寸、加载态与左右图标
 * @module web-frontend/components/ui
 */
import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** 按钮视觉变体类型 */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
/** 按钮尺寸类型 */
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * 按钮组件属性
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant; // 视觉变体
  size?: ButtonSize; // 尺寸
  loading?: boolean; // 是否处于加载态（显示旋转图标并禁用）
  icon?: React.ReactNode; // 自定义图标
  iconPosition?: 'left' | 'right'; // 图标位置
}

/** 各变体对应的 Tailwind 类名 */
const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700', // 主色按钮
  secondary: 'bg-secondary-500 text-white hover:bg-secondary-600 active:bg-secondary-700', // 次色按钮
  outline: 'border-2 border-primary-500 text-primary-600 hover:bg-primary-50 active:bg-primary-100', // 描边按钮
  ghost: 'text-gray-700 hover:bg-gray-100 active:bg-gray-200', // 幽灵按钮（无背景）
  danger: 'bg-danger-500 text-white hover:bg-danger-600 active:bg-danger-700', // 危险按钮
};

/** 各尺寸对应的 Tailwind 类名，均附加 touch-target 触控目标尺寸 */
const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm touch-target',
  md: 'px-4 py-2.5 text-base touch-target',
  lg: 'px-6 py-3 text-lg touch-target',
};

/**
 * 通用按钮组件
 * @param props - 按钮属性，包含变体、尺寸、加载态、图标等
 * @returns JSX 元素
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  className,
  disabled,
  children,
  ...props
}) => {
  return (
    <button
      className={twMerge(
        clsx(
          'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-fast focus:outline-none focus:ring-2 focus:ring-primary-500/50 disabled:opacity-50 disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClasses[size],
          icon && (iconPosition === 'left' ? 'gap-2' : 'gap-2'),
          className
        )
      )}
      disabled={disabled || loading}
      {...props}
    >
      {/* 加载态：渲染旋转图标；否则按 iconPosition 渲染左右图标 */}
      {loading ? (
        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : iconPosition === 'left' && icon}
      {children}
      {!loading && iconPosition === 'right' && icon}
    </button>
  );
};

export default Button;