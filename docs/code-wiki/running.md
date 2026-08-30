# 项目运行方式

## 环境要求总览

| 组件 | 最低版本 | 说明 |
|------|---------|------|
| Node.js | 18.0.0 | Web 前端 / API 文档 |
| Java JDK | 21 | backend-java |
| Maven | 3.8 | Java 构建 |
| Go | 1.21 | API 网关 |
| Python | 3.10 | AI 引擎 |
| Flutter SDK | 3.0 | 移动端 |
| Docker | 20.10+ | 容器化部署 |
| Docker Compose | 2.0+ | 多服务编排 |

---

## 方式一：Docker Compose 一键启动（推荐）

适用于：本地完整环境搭建、集成测试、演示

### 步骤

```bash
cd server-services/deployment

# 1. 复制环境变量模板（模板位于 server-services/ 根目录，不在 deployment/）
cp ../.env.template .env

# 2. 编辑 .env 文件，配置以下必填项
# MYSQL_PASSWORD=your_mysql_password
# MYSQL_ROOT_PASSWORD=your_root_password
# MONGO_PASSWORD=your_mongo_password
# REDIS_PASSWORD=your_redis_password
# JWT_SECRET=your_jwt_secret
# ENCRYPTION_KEY=starisle2026securekey32byteslong        # 必须为精确 32 字节
# ENCRYPTION_MASTER_KEY=starmaster2026securekey32byteslo  # 必须为精确 32 字节
# MODEL_API_KEY=your_deepseek_api_key

# 3. 一键启动所有服务
docker-compose up -d --build

# 4. 查看服务状态
docker-compose ps

# 5. 查看日志
docker-compose logs -f backend-java
docker-compose logs -f ai-engine
```

### 启动的服务与端口

| 服务 | 容器名 | 端口 | 说明 |
|------|--------|------|------|
| MySQL | starisle-mysql | 3306 | 生产关系数据库 |
| MongoDB | starisle-mongodb | 27017 | 文档数据库 |
| Redis | starisle-redis | 6379 | 缓存服务 |
| backend-java | starisle-backend-java | 8080 | Java 核心业务后端 |
| ai-engine | starisle-ai | 8000 | Python AI 对话引擎 |

### 健康检查

```bash
# backend-java 健康检查
curl http://localhost:8080/health

# ai-engine 健康检查
curl http://localhost:8000/health
```

### 停止服务

```bash
# 停止并删除容器
docker-compose down

# 停止并删除容器 + 数据卷（谨慎）
docker-compose down -v
```

---

## 方式二：各模块独立启动

适用于：日常开发、调试单个模块

### 1. Web 前端 (`web-frontend/`)

```bash
cd web-frontend

# 安装依赖
npm install

# 开发模式（热更新）
npm run dev

# 访问 http://localhost:5173

# 代码检查
npm run check      # TypeScript 类型检查
npm run lint       # ESLint 代码规范

# 生产构建
npm run build

# 预览生产构建
npm run preview
```

#### 环境变量（可选）

在 `web-frontend/` 下创建 `.env.local`：

```env
VITE_API_BASE_URL=http://localhost:8080
```

### 2. Java 后端 (`backend-java/`)

```bash
cd backend-java

# 编译
mvn clean compile

# 开发模式启动（使用 H2 内存数据库，无需外部依赖）
mvn spring-boot:run

# 服务运行在 http://localhost:8080

# 运行测试
mvn test

# 打包
mvn package

# 运行打包后的 JAR
java -jar target/starisle-backend-1.0.0.jar
```

#### 切换数据库（开发 -> 生产）

编辑 `src/main/resources/application.yml` 或通过环境变量：

```bash
# 使用 PostgreSQL
export DATABASE_URL=jdbc:postgresql://localhost:5432/starisle
export DATABASE_USERNAME=postgres
export DATABASE_PASSWORD=your_password
export DATABASE_DRIVER=org.postgresql.Driver
export DDL_AUTO=update
export HIBERNATE_DIALECT=org.hibernate.dialect.PostgreSQLDialect
export H2_CONSOLE_ENABLED=false

# 启用 MongoDB 和 Redis（注释掉 autoconfigure.exclude 中的相关项）
export MONGODB_URL=mongodb://localhost:27017/starisle
export REDIS_HOST=localhost
export REDIS_PORT=6379

mvn spring-boot:run
```

### 3. AI 引擎 (`server-services/ai-engine/`)

```bash
cd server-services/ai-engine

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
export MODEL_API_KEY=your_deepseek_api_key
export MODEL_API_BASE=https://api.deepseek.com

# 启动服务
python app/main.py

# 服务运行在 http://localhost:8000
```

#### 使用本地模型（可选）

```bash
export USE_LOCAL_MODEL=true
export MODEL_NAME=deepseek-ai/deepseek-chat
python app/main.py
```

#### 小星训练流水线 `v2.0新增`（可选）

**场景**: 需要将任意 GitHub Fork 仓库的代码能力/RAG知识/训练语料三层接入小星形象。`scripts/orchestrate_fork_integration.py` 为一键入口。

```bash
cd server-services/ai-engine

# (推荐) Smoke 仿真模式 — 不依赖 GPU，验证6步流水线全部贯通：
# M1 Fork发现 → M2 三层集成 → M3a MLM → M3b SFT(SIM) → M4 6维评估 → 汇总报告
python scripts/orchestrate_fork_integration.py --smoke --force-sft-mode simulation

# 有 GPU 的完整训练模式（显存降级链 FULL→LoRA→CPU Offload→SIM 自动选择）
python scripts/orchestrate_fork_integration.py --fork-paths /path/to/my/fork_list.yml

# 单步跑：只做 MLM 继续预训练
python scripts/continued_pretrain_mlm.py --input data/combined_cleaned_text.txt --output-dir runs/mlm_v1

# 单步跑：SFT 微调（指定 mode 或自动检测）
python scripts/sft_full_finetune.py --dataset data/sft_dataset.jsonl --mode auto

# 单步跑：6 维评估（LLM-as-Judge，需要 MODEL_API_KEY）
python scripts/evaluate_model.py --model runs/sft_last --judge-provider deepseek

# 运行 20 项单元测试，验证 Skill / RAG / 训练脚手架（pytest）：
cd tests && pytest -v  # 或 python -m pytest -v
```

**产物**: 训练完成后目录中生成 `integration_report.json`（Fork 统计、训练 loss、6 维打分、Skill 注册清单）。

### 4. Go API 网关 (`server-services/backend/`)

```bash
cd server-services/backend

# 下载依赖
go mod download

# 启动
export PORT=8080
go run cmd/api-gateway/main.go

# 服务运行在 http://localhost:8080
```

### 5. 学生端 Flutter App (`student-app/StarIsle-student/`)

```bash
cd student-app/StarIsle-student

# 获取依赖
flutter pub get

# 运行到已连接设备/模拟器
flutter run

# 构建 APK
flutter build apk

# 构建 iOS（需 macOS + Xcode）
flutter build ios
```

### 6. 教师端 Flutter App (`teacher-app/StarIsle-teacher/`)

```bash
cd teacher-app/StarIsle-teacher

flutter pub get
flutter run
```

### 7. API 文档桌面应用 (`api-docs/`)

```bash
cd api-docs

npm install

# Web 模式开发
npm run dev

# Electron 桌面模式开发
npm run electron:dev

# 构建 Electron 安装包
npm run electron:build
```

---

## 方式三：VSCode 调试配置

项目已包含 `.vscode/settings.json`，可配合以下 launch 配置：

### Java 后端调试

在 `.vscode/launch.json` 中添加：

```json
{
  "type": "java",
  "name": "StarIsle Backend",
  "request": "launch",
  "mainClass": "com.starisle.StarIsleApplication",
  "projectName": "starisle-backend",
  "env": {
    "DATABASE_URL": "jdbc:h2:mem:starisle;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
    "JWT_SECRET": "dev-secret-key"
  }
}
```

---

## 测试账号

| 角色 | 账号 | 密码 |
|------|------|------|
| 学生 | student1 | 123456 |
| 教师 | teacher1 | 123456 |
| 家长 | parent1 | 123456 |

---

## 常见问题排查

### Web 前端构建错误

```bash
# 先检查类型错误
npm run check

# 再检查代码规范
npm run lint

# 清除缓存后重试
rm -rf node_modules dist
npm install
npm run build
```

### Java 后端启动失败

```bash
# 检查端口占用
lsof -i :8080

# 检查 Maven 依赖
mvn dependency:resolve

# 查看详细日志
mvn spring-boot:run -Dspring-boot.run.arguments=--debug
```

### AI 引擎启动失败

```bash
# 检查环境变量
echo $MODEL_API_KEY

# 检查 Python 版本
python --version  # 需 >= 3.10

# 检查依赖安装
pip list | grep fastapi
```

### Docker Compose 启动失败

```bash
# 检查 .env 是否配置（注意：.env.template 不在 deployment/ 内，需从 server-services/ 复制）
cat .env

# 检查端口占用
docker-compose ps

# 查看具体服务日志
docker-compose logs mysql
docker-compose logs backend-java
docker-compose logs ai-engine

# 重建镜像
docker-compose up -d --build
```

### Java 后端抛出 AES InvalidKeyException

这是因为 `ENCRYPTION_KEY` / `ENCRYPTION_MASTER_KEY` 长度不是 32 字节。
```yaml
# application.yml 中必须为 32 字节的字符串：
ENCRYPTION_KEY=starisle2026securekey32byteslong        # 32字节
ENCRYPTION_MASTER_KEY=starmaster2026securekey32byteslo  # 32字节
```

### 训练流水线失败 / 无 GPU 能跑吗？

SFT 脚本内置显存检测自动降级：`FULL→LoRA→CPU Offload→SIMULATION`。无 GPU 时使用：
```bash
cd server-services/ai-engine
python scripts/orchestrate_fork_integration.py --smoke --force-sft-mode simulation
```
会生成仿真 loss 曲线与 `integration_report.json`，保证链路完整可验证。

### Skill 状态异常（discover 失败后技能被禁用）

```bash
curl http://localhost:8000/skills/status
```
查看每个 adapter 的 error_count 与 status。累计错误达到阈值的 Skill 会进入 `disabled_by_error`。重新启动 ai-engine 或手动刷新注册表可恢复。

### Flutter 运行失败

```bash
# 检查 Flutter 环境
flutter doctor

# 检查设备连接
flutter devices

# 清理构建缓存
flutter clean
flutter pub get
```

---

## 生产环境部署

### 使用 Kubernetes

```bash
cd server-services/deployment/kubernetes

# 应用部署文件
kubectl apply -f starisle-deployment.yml

# 查看状态
kubectl get pods
kubectl get svc
```

### Nginx 反向代理配置

参考 `server-services/deployment/nginx/nginx.conf`：

```nginx
server {
    listen 80;
    server_name api.starisle.com;

    location / {
        proxy_pass http://backend-java:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /ws/ {
        proxy_pass http://backend-java:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 环境变量清单（生产）

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `DATABASE_URL` | MySQL/PostgreSQL 连接串 | `jdbc:mysql://mysql:3306/starisle` |
| `DATABASE_USERNAME` | 数据库用户名 | `starisle_user` |
| `DATABASE_PASSWORD` | 数据库密码 | - |
| `MONGODB_URL` | MongoDB 连接串 | `mongodb://admin:pass@mongodb:27017/starisle` |
| `REDIS_HOST` | Redis 主机 | `redis` |
| `REDIS_PORT` | Redis 端口 | `6379` |
| `REDIS_PASSWORD` | Redis 密码 | - |
| `JWT_SECRET` | JWT 签名密钥 | - |
| `ENCRYPTION_KEY` | AES 加密密钥 | - |
| `ENCRYPTION_MASTER_KEY` | 主密钥（32 字节） | - |
| `AI_SERVICE_URL` | AI 引擎地址 | `http://ai-engine:8000` |
| `MODEL_API_KEY` | 大模型 API Key | - |
| `MODEL_API_BASE` | 大模型 API 地址 | `https://api.deepseek.com` |
