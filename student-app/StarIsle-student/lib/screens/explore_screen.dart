import 'package:flutter/material.dart';

class ExploreScreen extends StatelessWidget {
  const ExploreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('探索'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 情绪探索
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
          
          // 冥想放松
          Card(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
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
                
                ListTile(
                  leading: const Icon(Icons.self_improvement),
                  title: const Text('考前放松'),
                  subtitle: const Text('5分钟'),
                  trailing: const Icon(Icons.play_circle_outline),
                  onTap: () {
                    Navigator.pushNamed(context, '/meditation');
                  },
                ),
                
                ListTile(
                  leading: const Icon(Icons.bedtime),
                  title: const Text('入睡引导'),
                  subtitle: const Text('8分钟'),
                  trailing: const Icon(Icons.play_circle_outline),
                  onTap: () {
                    Navigator.pushNamed(context, '/meditation');
                  },
                ),
                
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
          
          // 呼吸练习
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