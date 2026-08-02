import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'line' | 'card' | 'pills';
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'line',
}) => {
  const baseTabClass = 'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium cursor-pointer transition-all duration-fast touch-target';

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
          {activeTab === tab.id && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-t" />
          )}
        </button>
      ))}
    </div>
  );
};

export default Tabs;