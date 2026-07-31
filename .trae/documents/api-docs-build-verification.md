# api-docs 构建验证计划

## 概述

对 StarIsle 项目的 `api-docs` 子目录执行构建验证（`npm run build`），修复所有 TypeScript 编译错误和 Vite 构建问题，确保构建通过后给出最终总结。

## 当前状态分析

### 已完成的工作

阶段一和阶段二的主要开发工作已完成，包括：

- **OpenAPI 规范** (`api-docs/spec/openapi.yaml`)：包含 **61 个端点**，覆盖 8 个分组（学生端、教师端、家长端、认证管理、用户管理、数据迁移、密钥管理、系统），55 个路径。`public/spec/openapi.yaml` 已同步（同样是 61 个端点）。
- **前端组件**：`App.tsx`（三视图模式 + 侧边栏）、`ApiTester.tsx`（内嵌调试面板）、`EndpointOverview.tsx`（总览卡片）、`JsonView.tsx`（JSON 高亮）、`specParser.ts`（spec 分组解析）。
- **类型定义** (`types/index.ts`)：包含 `EndpointSummary`、`ApiEndpointGroup`、`SelectedEndpoint`、`SelectedView` 等类型。
- **样式** (`global.css`)：包含侧边栏、总览卡片、Tester 面板、JSON 视图等完整样式及响应式设计。

### 待完成的工作

唯一待完成任务：**构建验证 `npm run build`**。

### 关键发现

1. **node_modules 不存在**：`api-docs/node_modules/` 目录未找到，需要先执行 `npm install` 安装依赖。
2. **构建命令**：`package.json` 中 `build` 脚本为 `tsc && vite build`（先 TypeScript 类型检查，再 Vite 打包）。
3. **tsconfig 配置**：`strict: true`，`noUnusedLocals: false`，`noUnusedParameters: false`。

### 预测的构建问题

通过代码审查，识别出以下可能触发 `tsc` 错误的风险点：

#### 风险 1（高）：JsonView.tsx 使用 `React.ReactNode` 但未导入 React

- **文件**：`api-docs/src/components/JsonView.tsx`
- **位置**：第 38 行 `function renderNode(value: unknown, indent: string): React.ReactNode`、第 66 行 `renderArray` 返回类型 `React.ReactNode`、第 87 行 `renderObject` 返回类型 `React.ReactNode`
- **问题**：文件仅 `import { useState } from 'react'`，未导入 `React` 命名空间。在 `@types/react` v18 + `jsx: "react-jsx"` 配置下，全局 `React` 命名空间可能不可用，导致 `Cannot find namespace 'React'` 错误。
- **修复方案**：将 `React.ReactNode` 替换为从 `react` 直接导入的 `ReactNode` 类型。具体：在第 1 行改为 `import { useState, type ReactNode } from 'react'`，然后将所有 `React.ReactNode` 替换为 `ReactNode`。

#### 风险 2（中）：App.tsx 中 `@scalar/api-reference-react` 配置类型不匹配

- **文件**：`api-docs/src/App.tsx`
- **位置**：第 280-307 行 `ApiReferenceReact` 的 `configuration` prop
- **潜在问题**：`onRequest`、`customTheme`、`tags` 等配置项的类型签名可能与 `@scalar/api-reference-react` 的类型定义不完全匹配。
- **修复方案**：如果 `tsc` 报错，将 `configuration` 对象断言为 `any` 类型（`configuration={{...} as any}`），或按报错信息调整属性。这是最小改动方案，不引入新依赖。

#### 风险 3（低）：其他可能的类型问题

- `ApiTester.tsx` 第 60 行 `enabled: !p.required ? true : true` 始终为 `true`——逻辑问题但不是编译错误。
- `specParser.ts` 导出的 `findOperation` 未被使用——`noUnusedLocals: false` 不会报错。
- `types/index.ts` 中 `ApiEndpoint` 接口未被使用——同上，不会报错。

## 实施步骤

### 步骤 1：安装依赖

```bash
cd api-docs
npm install
```

### 步骤 2：执行构建

```bash
npm run build
```

构建命令为 `tsc && vite build`，先进行 TypeScript 类型检查，再执行 Vite 打包。

### 步骤 3：修复 TypeScript 编译错误（按需）

根据 `tsc` 输出的错误信息逐一修复。按预测的风险点优先级处理：

1. **JsonView.tsx 的 `React.ReactNode` 问题**（如触发）：
   - 修改 `import { useState } from 'react'` → `import { useState, type ReactNode } from 'react'`
   - 将 `React.ReactNode`（3 处）替换为 `ReactNode`

2. **App.tsx 的 Scalar 配置类型问题**（如触发）：
   - 在 `configuration` prop 上添加类型断言 `as any`，或按错误信息调整具体属性

3. **其他错误**：根据 `tsc` 具体报错信息修复，遵循最小改动原则，不重构、不加新功能。

### 步骤 4：重新构建验证

```bash
npm run build
```

确认 `tsc` 无错误且 Vite 成功输出到 `dist/` 目录。

### 步骤 5：最终总结

向用户报告：
- 改了哪些文件
- openapi 端点数（61）
- 构建是否通过
- 有无遗留问题

## 假设与决策

1. **不引入新依赖**：严格在现有依赖范围内修复问题。
2. **最小改动原则**：只修复构建错误，不重构代码、不优化逻辑、不添加注释。
3. **保持中文 UI 文案**：所有界面文字保持中文不变。
4. **仅在 api-docs/ 目录操作**：不修改 `web-frontend/` 或后端代码。
5. **不提交代码**：任务描述未要求 git commit，仅完成构建验证。

## 验证标准

- `npm run build` 命令成功完成，退出码为 0
- `dist/` 目录生成构建产物
- 无 TypeScript 编译错误
- 无 Vite 构建错误
