import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/mood_provider.dart';
import '../widgets/mood_checkin_widget.dart';
import '../widgets/mood_chart_widget.dart';
import '../widgets/star宝_card_widget.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  @override
  Widget build(BuildContext context) {
    final moodHistory = ref.watch(moodHistoryProvider);
    
    return Scaffold(
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
            
            // 情绪晴雨表
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
                    MoodChartWidget(moodHistory: moodHistory),
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 24),
            
            // 星宝快捷入口
            const Star宝CardWidget(),
            
            const SizedBox(height: 24),
            
            // 今日推荐
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