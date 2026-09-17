/// @file profile_screen.dart
/// @description 学生端"我的"页面，展示个人信息卡片、隐私与安全入口、帮助中心与设置项，
///              通过命名路由跳转到对应子页面。
/// @module student-app/screens

import 'package:flutter/material.dart';

/// 学生端个人中心页面。
class ProfileScreen extends StatelessWidget {
  /// 构造函数。
  const ProfileScreen({super.key});

  /// 构建页面主体。
  ///
  /// 返回：包含个人信息、隐私与安全、帮助中心、设置等卡片的 [Scaffold]。
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // 顶部 AppBar：标题"我的"
      appBar: AppBar(
        title: const Text('我的'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 个人信息卡片：头像 + 昵称 + 身份 + 编辑入口
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  // 用户头像
                  CircleAvatar(
                    radius: 32,
                    backgroundColor: Theme.of(context).primaryColor,
                    child: const Icon(
                      Icons.person,
                      size: 32,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(width: 16),
                  // 昵称与身份信息
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '小明',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          '高中生',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey,
                          ),
                        ),
                      ],
                    ),
                  ),
                  // 编辑个人信息按钮
                  IconButton(
                    icon: const Icon(Icons.edit),
                    onPressed: () {
                      // TODO: 编辑个人信息
                    },
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // 隐私与安全入口
          Card(
            child: ListTile(
              leading: const Icon(Icons.security),
              title: const Text('隐私与安全'),
              subtitle: const Text('查看数据收集清单、导出/删除数据'),
              trailing: const Icon(Icons.arrow_forward_ios),
              onTap: () {
                Navigator.pushNamed(context, '/privacy_settings');
              },
            ),
          ),

          const SizedBox(height: 16),

          // 帮助中心卡片：危机资源与使用指南
          Card(
            child: Column(
              children: [
                // 危机资源入口
                ListTile(
                  leading: const Icon(Icons.help_outline),
                  title: const Text('危机资源'),
                  subtitle: const Text('心理援助热线'),
                  trailing: const Icon(Icons.arrow_forward_ios),
                  onTap: () {
                    Navigator.pushNamed(context, '/crisis_resources');
                  },
                ),

                // 使用指南入口
                ListTile(
                  leading: const Icon(Icons.book_outlined),
                  title: const Text('使用指南'),
                  subtitle: const Text('如何使用星屿'),
                  trailing: const Icon(Icons.arrow_forward_ios),
                  onTap: () {
                    Navigator.pushNamed(context, '/user_guide');
                  },
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // 设置卡片：通知、深色模式、关于
          Card(
            child: Column(
              children: [
                // 通知设置入口
                ListTile(
                  leading: const Icon(Icons.notifications_outlined),
                  title: const Text('通知设置'),
                  trailing: const Icon(Icons.arrow_forward_ios),
                  onTap: () {
                    // TODO: 打开通知设置
                  },
                ),

                // 深色模式入口
                ListTile(
                  leading: const Icon(Icons.dark_mode),
                  title: const Text('深色模式'),
                  trailing: const Icon(Icons.arrow_forward_ios),
                  onTap: () {
                    // TODO: 打开深色模式设置
                  },
                ),

                // 关于星屿入口
                ListTile(
                  leading: const Icon(Icons.info_outline),
                  title: const Text('关于星屿'),
                  trailing: const Icon(Icons.arrow_forward_ios),
                  onTap: () {
                    Navigator.pushNamed(context, '/about');
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}