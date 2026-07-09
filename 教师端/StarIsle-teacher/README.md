# 星屿 StarIsle - 教师端 APP

> 青少年心理守护协同工作台 - 教师端

## 项目简介

星屿教师端是为班主任、科任老师与心理老师打造的青少年心理守护协同工作台，让一线教师能轻松识别、安全上报、专业介入，让学生在最需要时被看见。

## 核心功能

### 工作台
- 角色身份卡、今日概览
- 高风险告警（红/橙色卡片置顶）
- 快捷操作、待办列表
- 班级情绪概览

### 学生模块
- 学生列表（风险等级筛选）
- 学生详情（情绪趋势、风险时间线）
- 症状反馈表填写
- 上报记录与处理回执

### 对话模块
- 心理老师：对话观察、介入干预
- 班主任：自我求助对话
- 系统通知

### 我的模块
- 个人资料、心情打卡
- 舒压空间（5个解压小游戏）
- 知识库（基础版/完整版）
- 隐私与安全、设置

### 本地记忆存储管理
- 加密数据库存储、定时自动整理、存储状态监控

## 技术栈

- **框架**：Flutter 3.x
- **状态管理**：Riverpod
- **加密**：AES-256-GCM 端到端加密、SQLCipher 本地数据库加密
- **图表**：FL Chart
- **本地数据库**：sqflite_sqlcipher
- **后台任务调度**：workmanager
- **本地通知**：flutter_local_notifications
- **安全存储**：flutter_secure_storage

## 项目结构

```
StarIsle-teacher/
├── lib/
│   ├── main.dart                    # 入口文件
│   ├── src/
│   │   └── app.dart                 # 应用配置
│   ├── screens/                     # 页面组件
│   │   ├── workbench_screen.dart
│   │   ├── students_screen.dart
│   │   ├── chat_screen.dart
│   │   ├── profile_screen.dart
│   │   └── ai_tools_screen.dart     # AI工具页面
│   ├── models/
│   │   └── teacher_models.dart
│   ├── providers/
│   │   ├── teacher_providers.dart
│   │   └── ai_provider.dart
│   ├── services/                    # 服务层
│   │   ├── ai_service.dart          # AI服务接口
│   │   └── memory_storage/          # 本地存储管理
│   │       ├── memory_storage_service.dart  # 加密数据库服务
│   │       ├── maintenance_scheduler.dart   # 定时整理调度器
│   │       └── storage_monitor.dart         # 存储状态监控
│   └── theme/
│       └── teacher_theme.dart
├── assets/                          # 资源文件
│   ├── images/
│   ├── audio/
│   ├── animations/
│   ├── icons/
│   └── fonts/
├── pubspec.yaml                     # 依赖配置
└── README.md
```

## 本地存储管理

### 功能特点

- **数据加密**：使用 SQLCipher 加密本地数据库，密钥存储在安全存储中
- **定时整理**：每天夜间 22:00-06:00 自动执行数据清理和数据库压缩
- **存储监控**：实时监控存储占用情况，记录整理历史
- **数据隔离**：所有数据仅存储在本地设备，不进行云端同步

### 整理内容

- 清理过期或冗余数据
- 优化存储结构以提升访问效率
- 压缩数据库体积以节省存储空间

## 角色权限

| 功能 | 班主任/科任老师 | 心理老师 |
|------|:---:|:---:|
| 症状反馈-发起 | ✅ | ✅ |
| 症状反馈-处理 | ❌ | ✅ |
| 对话观察 | ❌ | ✅ |
| 对话介入 | ❌ | ✅ |
| 知识库-专业版 | ❌ | ✅ |

## 运行方式

```bash
# 安装依赖
flutter pub get

# 运行应用
flutter run

# 构建 APK
flutter build apk
```

## 设计文档

详细设计文档请参考项目根目录下的 `docs/教师端/` 文件夹。

## 许可证

本项目遵循 MIT 许可证。