import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'emergency_screen.dart';
import 'admin_screen.dart';

/// 我的 Tab - 个人信息、帮帮认证、紧急求助、管理员入口、投稿入口
class ProfileTabScreen extends StatefulWidget {
  final String userId;
  final String nickname;

  const ProfileTabScreen({super.key, required this.userId, required this.nickname});

  @override
  State<ProfileTabScreen> createState() => _ProfileTabScreenState();
}

class _ProfileTabScreenState extends State<ProfileTabScreen> {
  Map<String, dynamic>? _profile;
  String _helperStatus = 'none';
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final profile = await ApiService.getProfile(widget.userId);
      final helper = await ApiService.getHelperStatus(widget.userId);
      setState(() {
        _profile = profile;
        _helperStatus = helper['helper_status'] ?? 'none';
      });
    } catch (_) {}
    finally {
      setState(() => _loading = false);
    }
  }

  String _helperStatusText() {
    switch (_helperStatus) {
      case 'approved':
        return '✅ 已认证帮帮者';
      case 'pending':
        return '⏳ 认证审核中';
      case 'rejected':
        return '❌ 认证未通过';
      default:
        return '未认证';
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      appBar: AppBar(title: const Text('我的')),
      body: ListView(
        children: [
          // 个人信息卡片
          Container(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                const CircleAvatar(
                  radius: 32,
                  backgroundColor: Color(0xFF6C8CD5),
                  child: Icon(Icons.person, size: 32, color: Colors.white),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _profile?['nickname'] ?? widget.nickname,
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _helperStatusText(),
                        style: TextStyle(
                          color: _helperStatus == 'approved' ? Colors.green : Colors.grey,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.edit_outlined),
                  onPressed: _editProfile,
                ),
              ],
            ),
          ),
          const Divider(),
          // 功能列表
          _buildItem(Icons.shield_outlined, '帮帮认证', _helperStatusText(), () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => HelperApplyScreen(userId: widget.userId)),
            ).then((_) => _load());
          }),
          _buildItem(Icons.article_outlined, '投稿入口', '分享你的心理知识与故事', () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => SubmissionScreen(userId: widget.userId)),
            );
          }),
          _buildItem(Icons.phone_in_talk_outlined, '紧急求助', '心理援助热线', () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => EmergencyScreen(userId: widget.userId)),
            );
          }),
          _buildItem(Icons.admin_panel_settings_outlined, '管理员入口', '审核投稿与认证', () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => AdminScreen(userId: widget.userId)),
            );
          }),
          _buildItem(Icons.info_outline, '关于星屿', 'v1.0.0 · 用 AI 陪伴每一颗心', () {}),
        ],
      ),
    );
  }

  Widget _buildItem(IconData icon, String title, String subtitle, VoidCallback onTap) {
    return ListTile(
      leading: Icon(icon, color: const Color(0xFF6C8CD5)),
      title: Text(title),
      subtitle: Text(subtitle, style: TextStyle(color: Colors.grey[500], fontSize: 12)),
      trailing: const Icon(Icons.chevron_right),
      onTap: onTap,
    );
  }

  Future<void> _editProfile() async {
    final controller = TextEditingController(text: _profile?['nickname'] ?? widget.nickname);
    final result = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('修改昵称'),
        content: TextField(controller: controller, autofocus: true),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('取消')),
          TextButton(onPressed: () => Navigator.pop(ctx, controller.text), child: const Text('保存')),
        ],
      ),
    );
    if (result != null && result.trim().isNotEmpty) {
      try {
        await ApiService.updateProfile(userId: widget.userId, nickname: result.trim());
        _load();
      } catch (_) {}
    }
  }
}

// ==================== 帮帮认证 ====================

class HelperApplyScreen extends StatefulWidget {
  final String userId;

  const HelperApplyScreen({super.key, required this.userId});

  @override
  State<HelperApplyScreen> createState() => _HelperApplyScreenState();
}

class _HelperApplyScreenState extends State<HelperApplyScreen> {
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _qualController = TextEditingController();
  final TextEditingController _descController = TextEditingController();
  bool _submitting = false;

  Future<void> _submit() async {
    if (_nameController.text.trim().isEmpty || _qualController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('请填写姓名和资质说明')));
      return;
    }
    setState(() => _submitting = true);
    try {
      await ApiService.applyHelper(
        userId: widget.userId,
        realName: _nameController.text.trim(),
        qualification: _qualController.text.trim(),
        description: _descController.text.trim(),
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('申请已提交，等待审核～')));
        Navigator.pop(context);
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('提交失败，请稍后再试')));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('帮帮认证')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF6C8CD5).withOpacity( 0.05),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Text(
                '成为帮帮者，你可以在树人互助中回复求助帖，用你的经验和温暖帮助更多人。\n\n认证要求：\n• 心理学相关背景 或\n• 心理援助志愿者经历 或\n• 其他相关资质说明',
                style: TextStyle(height: 1.6),
              ),
            ),
            const SizedBox(height: 20),
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: '真实姓名'),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _qualController,
              decoration: const InputDecoration(labelText: '资质说明', hintText: '如：心理学专业 / 校心理社志愿者 等'),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _descController,
              maxLines: 4,
              decoration: const InputDecoration(labelText: '自我介绍（选填）'),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: _submitting ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF6C8CD5),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _submitting
                    ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2)
                    : const Text('提交申请', style: TextStyle(fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ==================== 紧急求助 ====================

// ==================== 投稿 ====================

class SubmissionScreen extends StatefulWidget {
  final String userId;

  const SubmissionScreen({super.key, required this.userId});

  @override
  State<SubmissionScreen> createState() => _SubmissionScreenState();
}

class _SubmissionScreenState extends State<SubmissionScreen> {
  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _contentController = TextEditingController();
  String _type = 'article';
  bool _submitting = false;

  Future<void> _submit() async {
    if (_titleController.text.trim().isEmpty || _contentController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('请填写标题和内容')));
      return;
    }
    setState(() => _submitting = true);
    try {
      await ApiService.createSubmission(
        userId: widget.userId,
        title: _titleController.text.trim(),
        content: _contentController.text.trim(),
        type: _type,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('投稿已提交，等待审核～')));
        Navigator.pop(context);
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('投稿失败，请稍后再试')));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('投稿')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('投稿类型'),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: [
                ChoiceChip(label: const Text('文章'), selected: _type == 'article', onSelected: (_) => setState(() => _type = 'article')),
                ChoiceChip(label: const Text('问卷'), selected: _type == 'assessment', onSelected: (_) => setState(() => _type = 'assessment')),
              ],
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _titleController,
              decoration: const InputDecoration(labelText: '标题'),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _contentController,
              maxLines: 10,
              decoration: const InputDecoration(labelText: '内容', alignLabelWithHint: true),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: _submitting ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF6C8CD5),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _submitting
                    ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2)
                    : const Text('提交投稿', style: TextStyle(fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ==================== 管理员入口 ====================
// AdminScreen 已迁移至 admin_screen.dart
