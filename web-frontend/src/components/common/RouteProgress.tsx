import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * 路由切换进度条：固定在页面顶部 2px 高度
 * - 监听 useLocation 变化触发进度增长
 * - 0 → 80% 模拟加载，完成后跳 100% 淡出
 * - 零第三方依赖，纯 CSS 动画 + React state
 */
export function RouteProgress() {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 路由变化时启动进度条
  useEffect(() => {
    setVisible(true);
    setProgress(0);

    // 模拟进度增长：每次 +8~15%，封顶 80%
    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 80) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 80;
        }
        return prev + Math.random() * 12 + 8;
      });
    }, 120);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [location.pathname]);

  // 进度到 80% 后延迟一会完成
  useEffect(() => {
    if (progress >= 80 && visible) {
      const done = setTimeout(() => {
        setProgress(100);
        // 100% 后淡出隐藏
        setTimeout(() => setVisible(false), 200);
      }, 150);
      return () => clearTimeout(done);
    }
  }, [progress, visible]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] h-0.5 pointer-events-none">
      <div
        className="h-full bg-primary-500 transition-all duration-200 ease-out"
        style={{ width: `${Math.min(progress, 100)}%`, opacity: progress >= 100 ? 0 : 1 }}
      />
    </div>
  );
}

export default RouteProgress;
