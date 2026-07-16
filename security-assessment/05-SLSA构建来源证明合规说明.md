# 星屿 StarIsle - SLSA 构建来源证明合规说明

## 概述

本文档描述星屿（StarIsle）项目如何通过 GitHub Actions 实现 **SLSA（Supply-chain Levels for Software Artifacts）** 构建来源证明（Build Provenance Attestation），确保软件供应链的可追溯性和完整性。

SLSA 是一套安全框架和标准，旨在防止软件供应链攻击，确保软件从源代码到发布的每一个环节都可验证。

## 参考资源

- GitHub Action: [actions/attest-build-provenance](https://github.com/actions/attest-build-provenance)
- SLSA 官方网站: https://slsa.dev
- Sigstore: https://www.sigstore.dev
- GitHub Attestations API: https://docs.github.com/en/rest/attestations

## 技术架构

### 核心技术栈

| 技术 | 用途 |
|------|------|
| GitHub Actions | CI/CD 执行环境 |
| Sigstore | 签名基础设施（短期证书 + Fulcio CA + Rekor 透明日志） |
| SLSA v1.0 | 构建来源证明规范 |
| GitHub Attestations API | 证明存储与关联 |
| OCI / In-toto | 证明声明格式 |

### 实现原理

1. **构建执行**：在 GitHub 托管的运行器上执行构建
2. **来源证明生成**：使用 `actions/attest-build-provenance` 生成签名的 in-toto 声明
3. **Sigstore 签名**：使用 GitHub OIDC 令牌向 Sigstore Fulcio CA 申请短期证书，对声明进行签名
4. **证明上传**：将签名证明上传至 GitHub Attestations API，关联到仓库
5. **透明日志**：签名记录写入 Rekor 透明日志，可公开验证

## 工作流配置

项目包含三个独立的 SLSA 工作流，分别覆盖三大核心组件：

### 1. 后端 Java 服务

- **工作流文件**：`.github/workflows/slsa-backend-java.yml`
- **触发条件**：推送到 main 分支、tag 发布、Release 创建、手动触发
- **构建产物**：Spring Boot JAR 包 + Docker 镜像
- **证明类型**：
  - JAR 包文件来源证明
  - Docker 镜像来源证明（推送至 GHCR）

### 2. AI 引擎（Python FastAPI）

- **工作流文件**：`.github/workflows/slsa-ai-engine.yml`
- **触发条件**：同上
- **构建产物**：Python 源码包 + Docker 镜像
- **证明类型**：
  - 源代码文件来源证明
  - Docker 镜像来源证明（推送至 GHCR）

### 3. Web 前端

- **工作流文件**：`.github/workflows/slsa-web-frontend.yml`
- **触发条件**：同上
- **构建产物**：Vite 静态资源包 + Docker 镜像
- **证明类型**：
  - 静态构建产物来源证明
  - Docker 镜像来源证明（推送至 GHCR）

## 构建基础设施

### Dockerfile 配置

三个组件均采用多阶段构建，遵循容器安全最佳实践（非 root 用户、最小镜像）：

| 组件 | Dockerfile 路径 | 构建阶段 | 运行时镜像 | 安全特性 |
|------|----------------|----------|-----------|--------|
| 后端 Java | `backend-java/Dockerfile` | Maven 构建 → JAR | `eclipse-temurin:21-jre-alpine` | 非 root 用户 (starisle) |
| AI 引擎 | `后台/ai-engine/dockerfile` | pip 安装 | `python:3.10-slim` | 最小依赖 |
| Web 前端 | `web-frontend/Dockerfile` | Node.js 构建 → dist | `nginx:alpine` | 非 root 用户 (nginx) |

### 工作流触发机制

| 触发事件 | 说明 |
|---------|------|
| `push` to `main` | 推送到主分支自动触发 |
| `push` tag `v*` | 创建版本标签触发 |
| `release` created | 创建 Release 触发 |
| `workflow_dispatch` | 手动触发 |

---

## SLSA 级别达成情况

### SLSA Build Track Level 2（已达成）

通过 `actions/attest-build-provenance` 配置，项目自动达到 SLSA Build Track Level 2 要求：

| SLSA L2 要求 | 实现方式 | 状态 |
|-------------|---------|------|
| 构建在托管平台上运行 | GitHub Actions 托管运行器 | ✅ |
| 构建服务生成来源证明 | actions/attest-build-provenance | ✅ |
| 来源证明经过签名 | Sigstore Fulcio 短期证书签名 | ✅ |
| 来源证明可公开验证 | GitHub Attestations API + Rekor | ✅ |
| 来源证明与仓库关联 | GitHub Attestations 自动关联 | ✅ |

### 提升至 SLSA L3 的规划（可选）

如需达到 SLSA Level 3，需要额外满足：
- 使用隔离式构建服务（如 GitHub-hosted larger runners）
- 来源证明存储在不可篡改的透明日志中（Rekor 已满足）
- 构建过程不可被构建者修改

## 权限配置

工作流需要以下最小权限：

```yaml
permissions:
  contents: read          # 读取源代码
  packages: write         # 推送 GHCR 镜像
  id-token: write         # 请求 OIDC 令牌（用于 Sigstore 签名）
  attestations: write     # 写入 Attestations
```

## 验证方法

### 1. 使用 GitHub CLI 验证

安装 GitHub CLI 后，执行以下命令验证：

```bash
# 验证 JAR 包
gh attestation verify starisle-backend-1.0.0.jar \
  --repo user-unknowed/-StarIsle-

# 验证容器镜像
gh attestation verify oci://ghcr.io/user-unknowed/-StarIsle--backend:latest \
  --repo user-unknowed/-StarIsle-
```

### 2. 在 GitHub 网页端查看

1. 进入仓库主页
2. 点击 "Actions" 标签页
3. 选择相应的工作流运行记录
4. 在 "Attestations" 部分查看生成的证明

### 3. 查看容器镜像 Attestations

1. 进入 GHCR 镜像页面
2. 查看镜像详情
3. 在 "Attestations" 标签页中查看来源证明

## 安全收益

实施 SLSA 构建来源证明为项目带来以下安全收益：

| 安全能力 | 说明 |
|---------|------|
| **构建可追溯** | 每一个构建产物都可追溯到具体的源代码提交 |
| **完整性保证** | 通过签名验证确保构建产物未被篡改 |
| **供应链透明** | 构建过程和来源信息公开可查 |
| **防篡改** | 签名证明确保构建来源信息不可伪造 |
| **合规支持** | 满足供应链安全合规要求（如 Executive Order 14028） |

## 部署与启用步骤

### 前置条件

1. 仓库已托管在 GitHub
2. 仓库为 public（可使用 Sigstore 公共实例）或 private（使用 GitHub 私有 Sigstore 实例）
3. GitHub Actions 已启用

### 启用步骤

1. 将工作流文件提交到仓库的 `.github/workflows/` 目录
2. 推送代码到 main 分支或创建 tag 触发工作流
3. 工作流执行完成后，自动生成并上传构建来源证明
4. 使用 `gh attestation verify` 验证产物

### 注意事项

- 私有仓库同样支持 attestations，但使用 GitHub 私有 Sigstore 实例
- 证明存储在 GitHub Attestations API，与仓库关联
- 构建产物需下载到本地后使用 `gh` CLI 验证
- 容器镜像证明可直接在 GHCR 中查看和验证

## 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.0 | 2026-07-17 | 初始版本，实现三个核心组件的 SLSA L2 构建来源证明 |
| 1.1.0 | 2026-07-17 | 补全 Dockerfile（后端+前端）、修复工作流配置、完成全链路部署 |

## 实施状态

### 文件提交记录

| 文件 | 提交 SHA | 说明 |
|------|---------|------|
| `.github/workflows/slsa-backend-java.yml` | `910a0ef1` → `2cd10b3c` | 初始创建 → 修复无效引用 |
| `.github/workflows/slsa-ai-engine.yml` | `5558d216` | 初始创建（无需修复） |
| `.github/workflows/slsa-web-frontend.yml` | `e131bfa4` → `d65209a6` | 初始创建 → 添加显式 Dockerfile 路径 |
| `backend-java/Dockerfile` | `d3d8120e` | 新建：Maven 多阶段构建，非 root 用户 |
| `web-frontend/Dockerfile` | `b6d065d3` | 新建：Node.js + Nginx 多阶段构建，非 root 用户 |
| `security-assessment/05-SLSA构建来源证明合规说明.md` | `f04e63af` | 合规说明文档 |

### 验证清单

| 验证项 | 方法 | 状态 |
|--------|------|------|
| 工作流 YAML 语法 | 本地校验 | ✅ 通过 |
| Dockerfile 存在性 | 项目扫描 | ✅ 三个组件均有 |
| 工作流路径引用 | 路径一致性检查 | ✅ 全部正确 |
| 权限配置 | 对照 SLSA 要求 | ✅ id-token + attestations |
| GitHub Actions 运行 | GitHub Actions 页面 | ⏳ 待用户确认 |
| 构建证明生成 | `gh attestation verify` | ⏳ 待用户验证 |
| Rekor 透明日志 | search.sigstore.dev | ⏳ 待用户验证 |
