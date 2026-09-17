/// @file home_screen.dart
/// @description 学生端首页，展示心情打卡、情绪晴雨表、星宝快捷入口与今日推荐，
///              通过 [moodHistoryProvider] 获取心情历史驱动图表渲染。
/// @module student-app/screens

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/mood_provider.dart';
import '../widgets/mood_checkin_widget.dart';
import '../widgets/mood_chart_widget.dart';
import '../widgets/star宝_card_widget.dart';

/// 学生端首页 Widget，聚合心情打卡与推荐内容。
class HomeScreen extends ConsumerStatefulWidget {
  /// 构造函数。
  const HomeScreen({super.key});

  /// 创建 State 对象。
  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

/// [HomeScreen] 的 State，监听心情历史并渲染首页各模块。
class _HomeScreenState extends ConsumerState<HomeScreen> {
  /// 构建页面主体。
  ///
  /// 监听 [moodHistoryProvider]，依次渲染心情打卡、情绪晴雨表、星宝入口与今日推荐。
  @override
  Widget build(BuildContext context) {
    final moodHistory = ref.watch(moodHistoryProvider);

    return Scaffold(
      // 顶部 AppBar：标题 + 通知入口
      appBar: AppBar(
        title: const Text('今天感觉怎么样？'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () {
              // TODO: 打开通知设置
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 心情打卡区域
            const MoodCheckinWidget(),

            const SizedBox(height: 24),

            // 情绪晴雨表卡片
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      '情绪晴雨表',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 16),
                    // 心情历史图表
                    MoodChartWidget(moodHistory: moodHistory),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 24),

            // 星宝快捷入口
            const Star宝CardWidget(),

            const SizedBox(height: 24),

            // 今日推荐卡片
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      '今日推荐',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 16),
                    // 推荐项：考前放松冥想
                    ListTile(
                      leading: const Icon(Icons.self_improvement),
                      title: const Text('考前放松'),
                      subtitle: const Text('5分钟冥想'),
                      trailing: const Icon(Icons.play_circle_outline),
                      onTap: () {
                        Navigator.pushNamed(context, '/meditation');
                      },
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}