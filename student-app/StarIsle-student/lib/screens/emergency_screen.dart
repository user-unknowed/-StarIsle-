import 'package:flutter/material.dart';
import '../services/api_service.dart';

/// 紧急求助页面 - 展示心理援助热线与一键求助
class EmergencyScreen extends StatefulWidget {
  final String userId;

  const EmergencyScreen({super.key, required this.userId});

  @override
  State<EmergencyScreen> createState() => _EmergencyScreenState();
}

class _EmergencyScreenState extends State<EmergencyScreen> {
  List<dynamic> _resources = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadResources();
  }

  Future<void> _loadResources() async {
    try {
      final data = await ApiService.getEmergencyResources();
      setState(() {
        _resources = data;
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  Future<void> _requestHelp() async {
    try {
      await ApiService.requestHelp(userId: widget.userId, reason: '一键紧急求助');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('求助已发出，星宝正在为你联系资源 🌟')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('求助失败: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('紧急求助'),
        backgroundColor: const Color(0xFF6C8CD5),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // 一键求助按钮
                Card(
                  color: const Color(0xFFFF6B6B),
                  child: InkWell(
                    onTap: _requestHelp,
                    child: const Padding(
                      padding: EdgeInsets.all(24),
                      child: Column(
                        children: [
                          Icon(Icons.sos, size: 48, color: Colors.white),
                          SizedBox(height: 12),
                          Text(
                            '一键求助',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          SizedBox(height: 4),
                          Text(
                            '当你感到难以承受时，请按下按钮',
                            style: TextStyle(color: Colors.white70, fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  '心理援助热线',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                ..._resources.map((r) => Card(
                      child: ListTile(
                        leading: const Icon(Icons.phone, color: Color(0xFF6C8CD5)),
                        title: Text(r['name'] ?? '援助热线'),
                        subtitle: Text(r['phone'] ?? ''),
                        trailing: Text(
                          r['service_time'] ?? '',
                          style: const TextStyle(fontSize: 12, color: Colors.grey),
                        ),
                      ),
                    )),
                const SizedBox(height: 24),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0F4FF),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text(
                    '💙 请记住：你并不孤单。无论此刻多么艰难，都有人愿意倾听你、帮助你。\n\n如果有伤害自己的念头，请立即拨打上方热线或前往最近的医院急诊。',
                    style: TextStyle(fontSize: 14, height: 1.6, color: Color(0xFF4A5568)),
                  ),
                ),
              ],
            ),
    );
  }
}
