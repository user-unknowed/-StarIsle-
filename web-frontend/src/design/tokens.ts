/**
 * @file tokens.ts
 * @description 设计 token 集中定义：颜色、间距、排版、阴影、圆角、层级、过渡、断点、平台特化等，供全局复用
 * @module web-frontend/design
 */

/**
 * 颜色体系
 * 每个色系按 50~950 的明度阶组织，便于统一取色
 */
export const colors = {
  // StarIsle 品牌：靛蓝 → 紫罗兰，与宣传页 #6B7BFF / #4F46E5 一致
  primary: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6b7bff',  // 品牌主色
    600: '#4f46e5',  // 深靛蓝
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
    950: '#1e1b4b',
  },
  // 次色：紫罗兰系
  secondary: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
  },
  // 成功色：绿色系
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  // 警告色：琥珀系
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  // 危险色：红色系
  danger: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  // 强调色：橙色系（家长端暖色点缀）
  accent: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316',
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
  },
  // 中性色：灰色系
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },
  white: '#ffffff', // 纯白
  black: '#000000', // 纯黑
};

/**
 * 间距体系（rem 单位，配合根字号 16px）
 */
export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
  '4xl': '6rem',
};

/**
 * 排版体系：字号、字重、行高、字体栈
 */
export const typography = {
  /** 字号梯度 */
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
    '6xl': '3.75rem',
  },
  /** 字重梯度 */
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
  /** 行高梯度 */
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },
  /** 字体栈：含中文系统字体，覆盖多平台 */
  fontFamily: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif',
    serif: 'Georgia, "Times New Roman", Times, serif',
    mono: 'Menlo, Monaco, "Courier New", monospace',
  },
};

/**
 * 阴影体系：从小到大，含内阴影
 */
export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: 'none',
};

/**
 * 圆角体系
 */
export const borderRadius = {
  none: '0',
  sm: '0.125rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px',
};

/**
 * 层级（z-index）体系
 */
export const zIndex = {
  auto: 'auto',
  0: '0',
  10: '10',
  20: '20',
  30: '30',
  40: '40',
  50: '50',
  100: '100',
};

/**
 * 过渡体系：时长与缓动函数
 */
export const transitions = {
  duration: {
    fast: '150ms',
    normal: '250ms',
    slow: '350ms',
    slower: '500ms',
  },
  timingFunction: {
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

/**
 * 响应式断点
 */
export const breakpoints = {
  xs: '360px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

/**
 * 平台特化配置：安全区与触控目标尺寸
 */
export const platformSpecific = {
  ios: {
    safeAreaTop: 'env(safe-area-inset-top)',
    safeAreaBottom: 'env(safe-area-inset-bottom)',
    safeAreaLeft: 'env(safe-area-inset-left)',
    safeAreaRight: 'env(safe-area-inset-right)',
    touchTarget: '44px', // iOS 推荐触控目标
  },
  android: {
    safeAreaTop: 'env(safe-area-inset-top)',
    safeAreaBottom: 'env(safe-area-inset-bottom)',
    touchTarget: '48px', // Android 推荐触控目标
  },
  harmony: {
    safeAreaTop: 'env(safe-area-inset-top)',
    safeAreaBottom: 'env(safe-area-inset-bottom)',
    touchTarget: '44px', // 鸿蒙推荐触控目标
  },
};

/**
 * 全部设计 token 的聚合对象
 */
export const designTokens = {
  colors,
  spacing,
  typography,
  shadows,
  borderRadius,
  zIndex,
  transitions,
  breakpoints,
  platformSpecific,
};

export default designTokens;