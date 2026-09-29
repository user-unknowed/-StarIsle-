import 'package:flutter/material.dart';
import '../services/api_service.dart';

/// 管理员页面 - 审核帮帮者认证申请与投稿
class AdminScreen extends StatefulWidget {
  final String userId;

  const AdminScreen({super.key, required this.userId});

  @override
  State<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends State<AdminScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<dynamic> _helperApps = [];
  List<dynamic> _pendingSubs = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        ApiService.getHelperApplications(),
        ApiService.getPendingSubmissions(),
      ]);
      setState(() {
        _helperApps = results[0];
        _pendingSubs = results[1];
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  Future<void> _reviewHelper(String targetUserId, bool approved) async {
    try {
      await ApiService.reviewHelper(userId: targetUserId, approved: approved);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(approved ? '已通过认证' : '已拒绝申请')),
      );
      _loadData();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('操作失败: $e')),
      );
    }
  }

  Future<void> _reviewSubmission(String subId, bool approved) async {
    try {
      await ApiService.reviewSubmission(submissionId: subId, approved: approved);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(approved ? '投稿已发布' : '投稿已拒绝')),
      );
      _loadData();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('操作失败: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('管理后台'),
        backgroundColor: const Color(0xFF6C8CD5),
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(text: '帮帮认证 (${_helperApps.length})'),
            Tab(text: '投稿审核 (${_pendingSubs.length})'),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildHelperList(),
                _buildSubmissionList(),
              ],
            ),
    );
  }

  Widget _buildHelperList() {
    if (_helperApps.isEmpty) {
      return const Center(child: Text('暂无待审核的帮帮者申请', style: TextStyle(color: Colors.grey)));
    }
    return ListView.builder(
      itemCount: _helperApps.length,
      itemBuilder: (context, index) {
        final app = _helperApps[index];
        final appInfo = app['application'] ?? {};
        return Card(
          margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const CircleAvatar(child: Icon(Icons.person)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(app['nickname'] ?? '匿名', style: const TextStyle(fontWeight: FontWeight.bold)),
                          Text('资质: ${appInfo['qualification'] ?? '未填写'}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text('姓名: ${appInfo['real_name'] ?? '未填写'}'),
                Text('简介: ${appInfo['description'] ?? '未填写'}'),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: () => _reviewHelper(app['user_id'], false),
                      child: const Text('拒绝', style: TextStyle(color: Colors.red)),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: () => _reviewHelper(app['user_id'], true),
                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF6C8CD5)),
                      child: const Text('通过'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildSubmissionList() {
    if (_pendingSubs.isEmpty) {
      return const Center(child: Text('暂无待审核投稿', style: TextStyle(color: Colors.grey)));
    }
    return ListView.builder(
      itemCount: _pendingSubs.length,
      itemBuilder: (context, index) {
        final sub = _pendingSubs[index];
        return Card(
          margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(sub['title'] ?? '无标题', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                const SizedBox(height: 4),
                Text('类型: ${sub['type'] ?? 'article'} · 分类: ${sub['category'] ?? '未分类'}',
                    style: const TextStyle(fontSize: 12, color: Colors.grey)),
                const SizedBox(height: 8),
                Text(
                  sub['content'] ?? '',
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 14),
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: () => _reviewSubmission(sub['submission_id'], false),
                      child: const Text('拒绝', style: TextStyle(color: Colors.red)),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: () => _reviewSubmission(sub['submission_id'], true),
                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF6C8CD5)),
                      child: const Text('发布'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
