import React from 'react';

interface EmptyStateProps {
  /** 大型 emoji 作为插画 */
  emoji?: string;
  /** 主标题 */
  title: string;
  /** 描述文案 */
  description?: string;
  /** 可选行动按钮文字 */
  actionText?: string;
  /** 行动按钮回调 */
  onAction?: () => void;
}

/**
 * 通用空状态组件：插画 + 标题 + 描述 + 可选 CTA
 * 用于无心情记录、无聊天历史、无孩子绑定、无告警等场景
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  emoji = '🌱',
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="text-5xl mb-4 select-none" aria-hidden>
        {emoji}
      </div>
      <h3 className="text-base font-semibold text-gray-700 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-400 max-w-xs leading-relaxed">{description}</p>
      )}
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
