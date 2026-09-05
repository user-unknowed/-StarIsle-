/**
 * @file Tabs.tsx
 * @description 通用标签页组件，支持三种视觉变体（线条 line / 卡片 card / 胶囊 pills）
 * @module web-frontend/components/ui
 */
import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 单个标签项描述
 */
export interface TabItem {
  id: string; // 标签唯一标识
  label: string; // 显示文案
  icon?: React.ReactNode; // 可选图标
}

/**
 * 标签页组件属性
 */
interface TabsProps {
  tabs: TabItem[]; // 标签列表
  activeTab: string; // 当前激活的标签 id
  onChange: (tabId: string) => void; // 切换回调
  variant?: 'line' | 'card' | 'pills'; // 视觉变体
}

/**
 * 通用标签页组件
 * @param props - 标签页属性
 * @returns JSX 元素
 */
export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'line',
}) => {
  // 所有变体共用的基础类名
  const baseTabClass = 'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium cursor-pointer transition-all duration-fast touch-target';

  // 卡片变体：在灰色容器内切换白色块状选中态
  if (variant === 'card') {
    return (
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={twMerge(
              clsx(
                baseTabClass,
                'rounded-lg',
                activeTab === tab.id
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    );
  }

  // 胶囊变体：圆角胶囊形按钮切换主色填充
  if (variant === 'pills') {
    return (
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={twMerge(
              clsx(
                baseTabClass,
                'rounded-full',
                activeTab === tab.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    );
  }

  // 默认线条变体：底部带主色下划线表示选中态
  return (
    <div className="flex border-b border-gray-200">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={twMerge(
            clsx(
              baseTabClass,
              'relative',
              activeTab === tab.id
                ? 'text-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            )
          )}
        >
          {tab.icon}
          {tab.label}
          {/* 选中时底部下划线 */}
          {activeTab === tab.id && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-t" />
          )}
        </button>
      ))}
    </div>
  );
};

export default Tabs;