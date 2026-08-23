import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// 骨架屏基础块：带 shimmer 动画的灰色占位
const baseClass =
  'animate-pulse rounded bg-gray-200';

interface SkeletonBaseProps {
  className?: string;
}

/** 单行文本骨架 */
export const SkeletonLine: React.FC<SkeletonBaseProps & { width?: string }> = ({
  width = 'w-full',
  className,
}) => (
  <div className={twMerge(clsx(baseClass, 'h-4', width, className))} />
);

/** 卡片块骨架 */
export const SkeletonCard: React.FC<SkeletonBaseProps> = ({ className }) => (
  <div className={twMerge(clsx(baseClass, 'h-24 w-full', className))} />
);

/** 圆形头像骨架 */
export const SkeletonAvatar: React.FC<SkeletonBaseProps & { size?: string }> = ({
  size = 'h-10 w-10',
  className,
}) => (
  <div className={twMerge(clsx(baseClass, 'rounded-full', size, className))} />
);

/** 心情卡片骨架组：模拟 StudentHome 心情记录列表 */
export const SkeletonMoodList: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3">
        <SkeletonAvatar size="h-8 w-8" />
        <div className="flex-1 space-y-2">
          <SkeletonLine width="w-1/3" />
          <SkeletonLine width="w-2/3" className="h-3" />
        </div>
        <SkeletonAvatar size="h-6 w-6" />
      </div>
    ))}
  </div>
);

/** 班级学生列表骨架 */
export const SkeletonStudentList: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="grid grid-cols-2 gap-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="p-4 rounded-xl border border-gray-200 space-y-3">
        <div className="flex items-center gap-2">
          <SkeletonAvatar size="h-8 w-8" />
          <SkeletonLine width="w-16" />
        </div>
        <SkeletonLine width="w-12" className="h-3" />
        <SkeletonLine width="w-20" className="h-3" />
      </div>
    ))}
  </div>
);

/** 聊天消息骨架 */
export const SkeletonChat: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
        <div className={clsx('space-y-2 max-w-[70%]', i % 2 === 0 ? 'items-start' : 'items-end')}>
          <SkeletonCard className="h-12 w-40" />
        </div>
      </div>
    ))}
  </div>
);

export default { SkeletonLine, SkeletonCard, SkeletonAvatar, SkeletonMoodList, SkeletonStudentList, SkeletonChat };
