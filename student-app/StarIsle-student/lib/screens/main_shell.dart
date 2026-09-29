import 'package:flutter/material.dart';
import 'chat_tab_screen.dart';
import 'knowledge_tab_screen.dart';
import 'community_tab_screen.dart';
import 'profile_tab_screen.dart';

/// 应用主框架 - 底部四 Tab 导航
///
/// Tab 结构：AI 陪聊 / 知识库 / 树人互助 / 我的
class MainShell extends StatefulWidget {
  final String userId;
  final String nickname;

  const MainShell({
    super.key,
    required this.userId,
    required this.nickname,
  });

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _currentIndex = 0;

  late final List<Widget> _pages;

  @override
  void initState() {
    super.initState();
    _pages = [
      ChatTabScreen(userId: widget.userId),
      KnowledgeTabScreen(userId: widget.userId),
      CommunityTabScreen(userId: widget.userId),
      ProfileTabScreen(userId: widget.userId, nickname: widget.nickname),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _pages,
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        type: BottomNavigationBarType.fixed,
        selectedItemColor: const Color(0xFF6C8CD5),
        unselectedItemColor: Colors.grey[400],
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.chat_bubble_outline),
            activeIcon: Icon(Icons.chat_bubble),
            label: 'AI陪聊',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.menu_book_outlined),
            activeIcon: Icon(Icons.menu_book),
            label: '知识库',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.people_outline),
            activeIcon: Icon(Icons.people),
            label: '树人互助',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_outline),
            activeIcon: Icon(Icons.person),
            label: '我的',
          ),
        ],
      ),
    );
  }
}
