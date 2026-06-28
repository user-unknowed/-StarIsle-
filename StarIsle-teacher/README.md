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

## 技术栈

- **框架**：Flutter 3.x
- **状态管理**：Riverpod
- **加密**：AES-256-GCM 端到端加密
- **图表**：FL Chart

## 项目结构

```
StarIsle-teacher/
├── lib/
│   ├── main.dart              # 入口文件
│   ├── src/
│   │   └── app.dart           # 应用配置
│   ├── screens/               # 页面组件
│   │   ├── workbench_screen.dart
│   │   ├── students_screen.dart
│   │   ├── chat_screen.dart
│   │   └── profile_screen.dart
│   ├── models/
│   │   └── teacher_models.dart
│   ├── providers/
│   │   └ teacher_providers.dart
│   └ theme/
│       └── teacher_theme.dart
├── assets/                    # 资源文件
│   ├── images/
│   ├── audio/
│   ├── animations/
│   ├── icons/
│   └── fonts/
├── pubspec.yaml               # 依赖配置
└── README.md
```

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