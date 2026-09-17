/**
 * @file ErrorBoundary.tsx
 * @description 全局错误边界（类组件），捕获子树渲染异常并展示友好的兜底 UI，提供刷新页面按钮
 * @module web-frontend/components/common
 */
import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * 错误边界内部状态
 */
interface ErrorBoundaryState {
  hasError: boolean; // 是否已捕获到错误
}

/**
 * 错误边界组件属性
 */
interface ErrorBoundaryProps {
  children: React.ReactNode; // 被包裹的子组件树
}

/**
 * 全局错误边界：捕获子树渲染异常，展示友好的错误页，避免白屏。
 * 提供"刷新页面"按钮调用 window.location.reload()。
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  /**
   * 构造函数：初始化无错误状态
   * @param props - 组件属性
   */
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  /**
   * 静态生命周期：捕获到错误时切换状态为已出错，触发重新渲染展示兜底 UI
   * @returns 新的状态对象
   */
  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  /**
   * 捕获错误后的副作用钩子，用于日志记录
   * @param error - 捕获到的错误对象
   * @param info - React 组件栈信息
   */
  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // 记录错误便于排查
    console.error('[ErrorBoundary] 捕获到渲染异常:', error, info);
  }

  /**
   * 点击"刷新页面"按钮的回调，触发整页重新加载
   */
  handleReload = (): void => {
    window.location.reload();
  };

  /**
   * 渲染：已出错时展示错误兜底页，否则正常渲染子组件
   * @returns React 节点
   */
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
