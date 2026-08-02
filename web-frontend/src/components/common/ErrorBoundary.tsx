import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

/**
 * 全局错误边界：捕获子树渲染异常，展示友好的错误页，避免白屏。
 * 提供"刷新页面"按钮调用 window.location.reload()。
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // 记录错误便于排查
    console.error('[ErrorBoundary] 捕获到渲染异常:', error, info);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-5 bg-danger-50 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-danger-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">页面出错了</h2>
            <p className="text-gray-500 mb-6">请刷新页面重试</p>
            <button
              onClick={this.handleReload}
              className="w-full px-4 py-2.5 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 active:bg-primary-700 transition-colors"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
