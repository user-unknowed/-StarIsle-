import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../theme/teacher_theme.dart';
import '../screens/workbench_screen.dart';
import '../screens/students_screen.dart';
import '../screens/chat_screen.dart';
import '../screens/profile_screen.dart';

class StarIsleTeacherApp extends ConsumerWidget {
  StarIsleTeacherApp({super.key});

  final List<Widget> _tabs = [
    const WorkbenchScreen(),
    const StudentsScreen(),
    const ChatScreen(),
    const ProfileScreen(),
  ];

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

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selectedIndex = ref.watch(selectedTabProvider);

    return MaterialApp(
      title: '星屿教师端',
      debugShowCheckedModeBanner: false,
      theme: TeacherTheme.lightTheme,
      darkTheme: TeacherTheme.darkTheme,
      themeMode: ThemeMode.system,
      home: Scaffold(
        body: _tabs[selectedIndex],
        bottomNavigationBar: BottomNavigationBar(
          items: _navItems,
          currentIndex: selectedIndex,
          type: BottomNavigationBarType.fixed,
          onTap: (index) => ref.read(selectedTabProvider.notifier).state = index,
        ),
      ),
    );
  }
}

final selectedTabProvider = StateProvider<int>((ref) => 0);