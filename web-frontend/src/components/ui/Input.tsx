import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type InputVariant = 'default' | 'error' | 'success';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  variant?: InputVariant;
}

const variantClasses: Record<InputVariant, string> = {
  default: 'border-gray-300 focus:border-primary-500 focus:ring-primary-500/20',
  error: 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20',
  success: 'border-success-500 focus:border-success-500 focus:ring-success-500/20',
};

export const Input: React.FC<InputProps> = ({
  label,
  error,
  success,
  icon,
  iconRight,
  variant = 'default',
  className,
  type = 'text',
  ...props
}) => {
  const computedVariant = error ? 'error' : success ? 'success' : variant;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={twMerge(
            clsx(
              'w-full px-4 py-2.5 text-base bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-2 rounded-lg transition-all duration-fast focus:outline-none focus:ring-2',
              icon && 'pl-10',
              iconRight && 'pr-10',
              variantClasses[computedVariant],
              className
            )
          )}
          {...props}
        />
        {iconRight && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {iconRight}
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm text-danger-600">{error}</p>
      )}
      {success && (
        <p className="text-sm text-success-600">{success}</p>
      )}
    </div>
  );
};

export default Input;