/**
 * @file Card.tsx
 * @description 通用卡片容器组件，支持标题、内边距档位与可悬停高亮效果
 * @module web-frontend/components/ui
 */
import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 卡片组件属性
 */
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string; // 可选标题，渲染在内容上方
  children: React.ReactNode; // 卡片主体内容
  padding?: 'none' | 'sm' | 'md' | 'lg'; // 内边距档位
  hoverable?: boolean; // 是否启用悬停高亮与阴影
}

/** 各内边距档位对应的 Tailwind 类名 */
const paddingClasses: Record<string, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

/**
 * 通用卡片容器组件
 * @param props - 卡片属性，含标题、内边距、是否可悬停等
 * @returns JSX 元素
 */
export const Card: React.FC<CardProps> = ({
  title,
  children,
  padding = 'md',
  hoverable = false,
  className,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'bg-white rounded-xl border border-gray-200',
          paddingClasses[padding],
          // 可悬停时：增加阴影、描边变主色、显示手型光标
          hoverable && 'hover:shadow-lg hover:border-primary-300 transition-all duration-fast cursor-pointer',
          className
        )
      )}
      {...props}
    >
      {/* 可选标题 */}
      {title && (
        <h3 className="text-base font-semibold text-gray-900 mb-3">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
};

export default Card;