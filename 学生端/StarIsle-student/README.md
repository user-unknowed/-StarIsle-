# 星屿 StarIsle - 学生端 APP

> 青少年心理健康 AI 陪伴应用 - 学生端

## 项目简介

星屿学生端是一款面向青少年的心理健康 AI 陪伴应用，通过虚拟形象「小星」提供温暖、零压力的心理支持体验。

## 核心功能

- **首页**：心情打卡、今日概览、快捷入口
- **聊天**：与小星的 AI 对话，获取心理陪伴与支持
- **探索**：情绪探索、心理测评、知识库
- **AI工具中心**：文本生成、内容摘要、风格转换、主题分析
- **我的**：个人档案、设置、隐私中心
- **本地记忆存储管理**：加密数据库存储、定时自动整理、存储状态监控

## 技术栈

- **框架**：Flutter 3.x
- **状态管理**：Riverpod
- **加密**：AES-256-GCM 端到端加密、SQLCipher 本地数据库加密
- **动画**：Lottie / Rive
- **本地数据库**：sqflite_sqlcipher
- **后台任务调度**：workmanager
- **本地通知**：flutter_local_notifications
- **安全存储**：flutter_secure_storage

## 项目结构

```
StarIsle-student/
├── lib/
│   ├── main.dart                    # 入口文件
│   ├── src/
│   │   └── app.dart                 # 应用配置
│   ├── screens/                     # 页面组件
│   │   ├── home_screen.dart
│   │   ├── chat_screen.dart
│   │   ├── explore_screen.dart
│   │   ├── profile_screen.dart
│   │   ├── splash_screen.dart
│   │   └── ai_tools_screen.dart     # AI工具页面
│   ├── providers/                   # 状态管理
│   │   └── ai_provider.dart
│   ├── services/                    # 服务层
│   │   ├── ai_service.dart          # AI服务接口
│   │   └── memory_storage/          # 本地存储管理
│   │       ├── memory_storage_service.dart  # 加密数据库服务
│   │       ├── maintenance_scheduler.dart   # 定时整理调度器
│   │       └── storage_monitor.dart         # 存储状态监控
│   └── theme/
│       └── app_theme.dart           # 主题配置
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

详细设计文档请参考项目根目录下的 `docs/学生端/` 文件夹。

## 许可证

本项目遵循 MIT 许可证。