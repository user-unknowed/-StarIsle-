import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

const paddingClasses: Record<string, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

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
          'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700',
          paddingClasses[padding],
          hoverable && 'hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-600 transition-all duration-fast cursor-pointer',
          className
        )
      )}
      {...props}
    >
      {title && (
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
};

export default Card;