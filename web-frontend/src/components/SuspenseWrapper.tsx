import React, { Suspense } from 'react';

interface SuspenseWrapperProps {
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const SuspenseWrapper: React.FC<SuspenseWrapperProps> = ({
  fallback = (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div>
    </div>
  ),
  children,
}) => {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
};

export default SuspenseWrapper;