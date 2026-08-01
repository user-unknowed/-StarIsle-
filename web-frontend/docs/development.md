# 星屿心理健康管理系统 - 开发指南

## 1. 环境搭建

### 1.1 前置条件

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **Git**: >= 2.0.0

### 1.2 安装步骤

1. **克隆仓库**
   ```bash
   git clone https://github.com/user-unknowed/-StarIsle-.git
   cd -StarIsle-/web-frontend
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动开发服务器**
   ```bash
   npm run dev
   ```

4. **构建生产版本**
   ```bash
   npm run build
   ```

## 2. 项目结构

### 2.1 目录说明

```
web-frontend/
├── src/                  # 源代码目录
│   ├── components/       # 组件目录
│   │   ├── ui/           # UI基础组件
│   │   ├── common/       # 通用业务组件
│   │   └── ...           # 其他组件
│   ├── pages/            # 页面目录
│   │   ├── student/      # 学生端页面
│   │   ├── teacher/      # 教师端页面
│   │   └── Login.tsx     # 登录页面
│   ├── store/            # 状态管理
│   ├── design/           # 设计系统
│   ├── hooks/            # 自定义Hooks
│   ├── lib/              # 工具函数
│   ├── types/            # TypeScript类型定义
│   ├── App.tsx           # 应用入口组件
│   ├── main.tsx          # 应用启动文件
│   └── index.css         # 全局样式
├── docs/                 # 文档目录
├── public/               # 静态资源目录
├── index.html            # HTML模板
├── package.json          # 项目配置
├── vite.config.ts        # Vite配置
├── tailwind.config.js    # Tailwind配置
├── tsconfig.json         # TypeScript配置
└── postcss.config.js     # PostCSS配置
```

### 2.2 文件命名规范

- **组件文件**: PascalCase (如 `Button.tsx`)
- **页面文件**: PascalCase (如 `StudentHome.tsx`)
- **工具文件**: camelCase (如 `utils.ts`)
- **状态管理**: camelCase (如 `authStore.ts`)

## 3. 开发规范

### 3.1 TypeScript规范

- **使用类型定义**: 为所有函数参数和返回值添加类型
- **避免any**: 使用具体类型代替any
- **接口命名**: 使用I前缀 (如 `IUser`)
- **类型命名**: 使用Type后缀 (如 `UserType`)

### 3.2 React规范

- **组件命名**: PascalCase
- **Hook命名**: use前缀 (如 `useAuth`)
- **Props命名**: camelCase
- **状态管理**: 使用Zustand

### 3.3 CSS规范

- **使用Tailwind**: 优先使用Tailwind CSS类名
- **自定义样式**: 放在CSS模块或全局样式文件中
- **响应式设计**: 使用Tailwind断点系统
- **平台适配**: 使用design/platform.css中的类名

### 3.4 Git规范

- **提交信息**: 使用规范的提交信息格式
  ```
  feat: 添加新功能
  fix: 修复bug
  docs: 更新文档
  style: 代码格式
  refactor: 重构代码
  test: 添加测试
  chore: 构建/工具变更
  ```

- **分支管理**: 
  - `main`: 主分支
  - `develop`: 开发分支
  - `feature/xxx`: 功能分支
  - `fix/xxx`: 修复分支

## 4. 组件开发指南

### 4.1 创建新组件

1. **创建文件**: 在`src/components/ui/`或`src/components/common/`目录下创建文件
2. **导入依赖**: 导入必要的依赖包
3. **定义Props**: 使用TypeScript接口定义组件属性
4. **实现组件**: 使用React函数组件实现
5. **导出组件**: 使用默认导出

示例:
```tsx
import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface MyComponentProps {
  className?: string;
  children: React.ReactNode;
}

export const MyComponent: React.FC<MyComponentProps> = ({
  className,
  children,
}) => {
  return (
    <div className={twMerge(clsx('base-class', className))}>
      {children}
    </div>
  );
};

export default MyComponent;
```

### 4.2 UI组件设计原则

- **可组合性**: 组件应设计为可组合的小单元
- **可扩展性**: 通过props支持自定义样式和行为
- **一致性**: 遵循统一的设计令牌和交互模式
- **可访问性**: 支持键盘导航和屏幕阅读器

### 4.3 使用现有组件

```tsx
import { Button, Input, Modal } from '../components/ui';

function MyPage() {
  return (
    <div>
      <Button variant="primary" size="md">
        点击按钮
      </Button>
      <Input label="用户名" placeholder="请输入用户名" />
      <Modal isOpen={true} onClose={() => {}} title="弹窗标题">
        弹窗内容
      </Modal>
    </div>
  );
}
```

## 5. 状态管理指南

### 5.1 创建新Store

1. **创建文件**: 在`src/store/`目录下创建文件
2. **定义接口**: 使用TypeScript接口定义状态和方法
3. **实现Store**: 使用Zustand创建store
4. **导出Store**: 导出useStore hook

示例:
```tsx
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MyStoreState {
  data: string[];
  addItem: (item: string) => void;
  removeItem: (index: number) => void;
}

export const useMyStore = create<MyStoreState>()(
  persist(
    (set) => ({
      data: [],
      addItem: (item) => set((state) => ({ data: [...state.data, item] })),
      removeItem: (index) => set((state) => ({ data: state.data.filter((_, i) => i !== index) })),
    }),
    { name: 'my-store' }
  )
);
```

### 5.2 使用Store

```tsx
import { useMyStore } from '../store/myStore';

function MyComponent() {
  const { data, addItem } = useMyStore();
  
  return (
    <div>
      {data.map((item, index) => (
        <div key={index}>{item}</div>
      ))}
      <button onClick={() => addItem('新项')}>添加</button>
    </div>
  );
}
```

## 6. 页面开发指南

### 6.1 创建新页面

1. **创建文件**: 在`src/pages/`目录下创建文件
2. **导入依赖**: 导入必要的组件和store
3. **实现页面**: 使用React函数组件实现
4. **配置路由**: 在`src/App.tsx`中配置路由

示例:
```tsx
import { useAuthStore } from '../store/authStore';
import { Header } from '../components/common/Header';

export default function MyPage() {
  const user = useAuthStore((state) => state.user);
  
  return (
    <div className="min-h-screen">
      <Header role="student" />
      <main className="pt-20">
        <h1>我的页面</h1>
        <p>欢迎，{user?.nickname}</p>
      </main>
    </div>
  );
}
```

### 6.2 路由配置

```tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MyPage from './pages/MyPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/mypage" element={<MyPage />} />
      </Routes>
    </Router>
  );
}
```

## 7. 设计系统使用指南

### 7.1 设计令牌

设计令牌定义在`src/design/tokens.ts`中，包含以下内容：

```tsx
import { colors, spacing, typography } from '../design/tokens';

// 使用颜色
const primaryColor = colors.primary[500];

// 使用间距
const margin = spacing.md;

// 使用字体
const fontSize = typography.fontSize.base;
```

### 7.2 Tailwind配置

设计令牌已集成到Tailwind CSS中，可以直接使用：

```tsx
<div className="text-primary-500 p-md text-base">
  内容
</div>
```

### 7.3 主题切换

```tsx
import { useState } from 'react';
import { getTheme } from '../design/theme';

function ThemeSwitcher() {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const theme = getTheme(mode);
  
  return (
    <div className={mode === 'dark' ? 'dark' : ''}>
      <button onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}>
        切换主题
      </button>
    </div>
  );
}
```

## 8. 跨平台适配

### 8.1 安全区适配

```tsx
import '../design/platform.css';

function SafeAreaComponent() {
  return (
    <div className="safe-area-top safe-area-bottom">
      内容
    </div>
  );
}
```

### 8.2 触摸目标

```tsx
function TouchTargetButton() {
  return (
    <button className="touch-target">
      可点击按钮
    </button>
  );
}
```

### 8.3 响应式设计

```tsx
function ResponsiveLayout() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      <div>内容1</div>
      <div>内容2</div>
      <div>内容3</div>
      <div>内容4</div>
    </div>
  );
}
```

## 9. 性能优化

### 9.1 代码分割

```tsx
import { lazy, Suspense } from 'react';

const LazyComponent = lazy(() => import('./LazyComponent'));

function MyPage() {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <LazyComponent />
    </Suspense>
  );
}
```

### 9.2 懒加载

```tsx
import { LazyLoad } from '../components/LazyLoad';

function LongPage() {
  return (
    <div>
      <LazyLoad>
        <HeavyComponent />
      </LazyLoad>
    </div>
  );
}
```

### 9.3 图片优化

```tsx
function OptimizedImage() {
  return (
    <img
      src="/image.webp"
      alt="描述"
      loading="lazy"
      decoding="async"
    />
  );
}
```

## 10. 测试指南

### 10.1 运行测试

```bash
npm run test
```

### 10.2 编写测试

```tsx
import { render, screen } from '@testing-library/react';
import Button from './Button';

test('按钮渲染正确', () => {
  render(<Button>点击</Button>);
  expect(screen.getByText('点击')).toBeInTheDocument();
});
```

## 11. 部署指南

### 11.1 构建

```bash
npm run build
```

### 11.2 部署到Web

将`dist`目录部署到任何静态服务器。

### 11.3 打包为原生应用

使用Capacitor打包为Android和iOS应用：

```bash
# 安装Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios

# 初始化Capacitor
npx cap init

# 添加Android平台
npx cap add android

# 添加iOS平台
npx cap add ios

# 同步代码
npx cap sync

# 打开Android Studio
npx cap open android

# 打开Xcode
npx cap open ios
```

## 12. 常见问题

### 12.1 依赖安装失败

```bash
# 清除缓存
npm cache clean --force

# 删除node_modules
rm -rf node_modules

# 删除package-lock.json
rm package-lock.json

# 重新安装
npm install
```

### 12.2 构建失败

```bash
# 检查TypeScript错误
npm run check

# 检查ESLint错误
npm run lint
```

### 12.3 开发服务器无法启动

- 确保端口5173未被占用
- 检查防火墙设置

### 12.4 样式不生效

- 确保正确导入了`index.css`
- 检查Tailwind配置文件
- 重启开发服务器

## 13. 资源链接

- [React文档](https://react.dev/)
- [TypeScript文档](https://www.typescriptlang.org/docs/)
- [Tailwind CSS文档](https://tailwindcss.com/docs)
- [Zustand文档](https://zustand-demo.pmnd.rs/)
- [React Router文档](https://reactrouter.com/)
- [Vite文档](https://vitejs.dev/guide/)
- [Capacitor文档](https://capacitorjs.com/docs)