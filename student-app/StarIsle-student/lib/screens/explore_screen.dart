/// @file explore_screen.dart
/// @description 学生端"探索"页面，提供情绪探索入口、冥想放松列表与呼吸练习入口，
///              通过命名路由跳转到对应子页面。
/// @module student-app/screens

import 'package:flutter/material.dart';

/// 探索页面，展示心理放松相关功能入口。
class ExploreScreen extends StatelessWidget {
  /// 构造函数。
  const ExploreScreen({super.key});

  /// 构建页面主体。
  ///
  /// 返回：包含情绪探索、冥想放松与呼吸练习卡片的 [Scaffold]。
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // 顶部 AppBar：标题"探索"
      appBar: AppBar(
        title: const Text('探索'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 情绪探索入口
          Card(
            child: ListTile(
              leading: const Icon(Icons.explore),
              title: const Text('情绪探索'),
              subtitle: const Text('了解自己的情绪状态'),
              trailing: const Icon(Icons.arrow_forward_ios),
              onTap: () {
                Navigator.pushNamed(context, '/assessment');
              },
            ),
          ),

          const SizedBox(height: 16),

          // 冥想放松卡片：包含多个引导项目
          Card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 区块标题
                const Padding(
                  padding: EdgeInsets.all(16),
                  child: Text(
                    '冥想放松',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),

                // 考前放松引导
                ListTile(
                  leading: const Icon(Icons.self_improvement),
                  title: const Text('考前放松'),
                  subtitle: const Text('5分钟'),
                  trailing: const Icon(Icons.play_circle_outline),
                  onTap: () {
                    Navigator.pushNamed(context, '/meditation');
                  },
                ),

                // 入睡引导
                ListTile(
                  leading: const Icon(Icons.bedtime),
                  title: const Text('入睡引导'),
                  subtitle: const Text('8分钟'),
                  trailing: const Icon(Icons.play_circle_outline),
                  onTap: () {
                    Navigator.pushNamed(context, '/meditation');
                  },
                ),

                // 情绪安抚引导
                ListTile(
                  leading: const Icon(Icons.spa),
                  title: const Text('情绪安抚'),
                  subtitle: const Text('5分钟'),
                  trailing: const Icon(Icons.play_circle_outline),
                  onTap: () {
                    Navigator.pushNamed(context, '/meditation');
                  },
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // 呼吸练习入口
          Card(
            child: ListTile(
              leading: const Icon(Icons.air),
              title: const Text('呼吸练习'),
              subtitle: const Text('跟随节奏，放松身心'),
              trailing: const Icon(Icons.arrow_forward_ios),
              onTap: () {
                Navigator.pushNamed(context, '/breathing');
              },
            ),
          ),
        ],
      ),
    );
  }
}