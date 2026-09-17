/// @file app.dart
/// @description 教师端 StarIsle Teacher 应用根 Widget，基于 Riverpod ConsumerWidget 构建 MaterialApp，
///              采用底部导航栏切换工作台、学生、对话、我的四个 Tab。
/// @module teacher-app/src/app

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../theme/teacher_theme.dart';
import '../screens/workbench_screen.dart';
import '../screens/students_screen.dart';
import '../screens/chat_screen.dart';
import '../screens/profile_screen.dart';
import '../screens/ai_tools_screen.dart';

/// 教师端应用根 Widget。
///
/// 继承自 [ConsumerWidget]，监听 [selectedTabProvider] 控制当前显示的 Tab 页面，
/// 并通过底部导航栏切换。
class StarIsleTeacherApp extends ConsumerWidget {
  /// 构造函数，初始化各 Tab 页面与导航项。
  StarIsleTeacherApp({super.key});

  // 底部导航对应的页面列表
  final List<Widget> _tabs = [
    const WorkbenchScreen(),
    const StudentsScreen(),
    const ChatScreen(),
    const ProfileScreen(),
  ];

  // 底部导航项列表
  final List<BottomNavigationBarItem> _navItems = const [
    BottomNavigationBarItem(
      icon: Icon(Icons.dashboard),
      label: '工作台',
    ),
    BottomNavigationBarItem(
      icon: Icon(Icons.school),
      label: '学生',
    ),
    BottomNavigationBarItem(
      icon: Icon(Icons.message),
      label: '对话',
    ),
    BottomNavigationBarItem(
      icon: Icon(Icons.person),
      label: '我的',
    ),
  ];

  /// 构建应用主体。
  ///
  /// 参数：
  /// - [context]：构建上下文；
  /// - [ref]：Riverpod [WidgetRef]，用于读取 [selectedTabProvider]。
  ///
  /// 返回：配置主题与底部导航的 [MaterialApp]。
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // 监听当前选中的 Tab 索引
    final selectedIndex = ref.watch(selectedTabProvider);

    return MaterialApp(
      // 应用标题
      title: '星屿教师端',
      // 关闭调试横幅
      debugShowCheckedModeBanner: false,
      // 浅色主题
      theme: TeacherTheme.lightTheme,
      // 暗色主题
      darkTheme: TeacherTheme.darkTheme,
      // 跟随系统主题模式
      themeMode: ThemeMode.system,
      // 主页：Scaffold + 动态 Tab 内容 + 底部导航
      home: Scaffold(
        // 根据 selectedIndex 切换显示页面
        body: _tabs[selectedIndex],
        // 底部导航栏
        bottomNavigationBar: BottomNavigationBar(
          items: _navItems,
          currentIndex: selectedIndex,
          type: BottomNavigationBarType.fixed,
          // 点击切换 Tab
          onTap: (index) => ref.read(selectedTabProvider.notifier).state = index,
        ),
      ),
    );
  }
}

/// 当前选中 Tab 索引的 Provider，默认 0（工作台）。
final selectedTabProvider = StateProvider<int>((ref) => 0);