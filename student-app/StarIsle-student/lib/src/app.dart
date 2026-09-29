/// @file app.dart
/// @description 学生端 StarIsle 应用的根 Widget，基于 Riverpod ConsumerWidget 构建 MaterialApp，
///              统一管理主题与初始路由（登录 → 主框架）。
/// @module student-app/src/app

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../screens/login_screen.dart';
import '../theme/app_theme.dart';

/// 应用根 Widget。
///
/// 继承自 [ConsumerWidget]，配置应用标题、主题与初始路由（登录页）。
class StarIsleApp extends ConsumerWidget {
  const StarIsleApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp(
      title: '星屿 StarIsle',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      home: const LoginScreen(),
    );
  }
}
