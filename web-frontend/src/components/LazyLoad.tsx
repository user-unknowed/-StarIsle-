import React, { useState, useEffect, useRef } from 'react';

interface LazyLoadProps {
  threshold?: number;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const LazyLoad: React.FC<LazyLoadProps> = ({
  threshold = 0.1,
  children,
  fallback = <div className="flex items-center justify-center py-8"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin"></div></div>,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  return (
    <div ref={ref} className="w-full">
      {isVisible ? children : fallback}
    </div>
  );
};

export default LazyLoad;