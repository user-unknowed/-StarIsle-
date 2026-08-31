/// @file app.dart
/// @description 学生端 StarIsle 应用的根 Widget，基于 Riverpod ConsumerWidget 构建 MaterialApp，
///              统一管理主题、初始路由与命名路由表。
/// @module student-app/src/app

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../screens/splash_screen.dart';
import '../screens/home_screen.dart';
import '../screens/chat_screen.dart';
import '../screens/explore_screen.dart';
import '../screens/profile_screen.dart';
import '../screens/ai_tools_screen.dart';
import '../theme/app_theme.dart';

/// 应用根 Widget。
///
/// 继承自 [ConsumerWidget]，可在 build 方法中通过 [WidgetRef] 读取 Riverpod Provider。
/// 负责配置应用的标题、主题、暗色主题、主题模式以及命名路由表。
class StarIsleApp extends ConsumerWidget {
  /// 构造函数，传入可选的 [Key]。
  const StarIsleApp({super.key});

  /// 构建应用根 [MaterialApp]。
  ///
  /// 参数：
  /// - [context]：构建上下文。
  /// - [ref]：Riverpod [WidgetRef]，用于读取 Provider 状态。
  ///
  /// 返回：配置好主题与命名路由的 [MaterialApp]。
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp(
      // 应用显示标题
      title: '星屿 StarIsle',
      // 关闭调试模式横幅
      debugShowCheckedModeBanner: false,
      // 浅色主题
      theme: AppTheme.lightTheme,
      // 暗色主题
      darkTheme: AppTheme.darkTheme,
      // 跟随系统主题模式
      themeMode: ThemeMode.system,
      // 应用启动初始路由
      initialRoute: '/splash',
      // 命名路由表，映射路由名到对应页面 Widget
      routes: {
        '/splash': (context) => const SplashScreen(),
        '/home': (context) => const HomeScreen(),
        '/chat': (context) => const ChatScreen(),
        '/explore': (context) => const ExploreScreen(),
        '/profile': (context) => const ProfileScreen(),
        '/ai-tools': (context) => const AiToolsScreen(),
      },
    );
  }
}