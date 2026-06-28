# 星屿 StarIsle - 学生端 APP

> 青少年心理健康 AI 陪伴应用 - 学生端

## 项目简介

星屿学生端是一款面向青少年的心理健康 AI 陪伴应用，通过虚拟形象「小星」提供温暖、零压力的心理支持体验。

## 核心功能

- **首页**：心情打卡、今日概览、快捷入口
- **聊天**：与小星的 AI 对话，获取心理陪伴与支持
- **探索**：情绪探索、心理测评、知识库
- **我的**：个人档案、设置、隐私中心

## 技术栈

- **框架**：Flutter 3.x
- **状态管理**：Riverpod
- **加密**：AES-256-GCM 端到端加密
- **动画**：Lottie / Rive

## 项目结构

```
StarIsle-student/
├── lib/
│   ├── main.dart           # 入口文件
│   ├── src/
│   │   └── app.dart        # 应用配置
│   ├── screens/            # 页面组件
│   │   ├── home_screen.dart
│   │   ├── chat_screen.dart
│   │   ├── explore_screen.dart
│   │   ├── profile_screen.dart
│   │   └── splash_screen.dart
│   └── theme/
│       └── app_theme.dart  # 主题配置
├── assets/                 # 资源文件
│   ├── images/
│   ├── audio/
│   ├── animations/
│   ├── icons/
│   └── fonts/
├── pubspec.yaml            # 依赖配置
└── README.md
```

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