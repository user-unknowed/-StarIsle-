import 'package:flutter/material.dart';
import '../services/api_service.dart';

/// 树人互助 Tab - 求助帖列表 + 发帖
///
/// 求助帖按紧急等级优先排序。已认证帮帮者可回复。
class CommunityTabScreen extends StatefulWidget {
  final String userId;

  const CommunityTabScreen({super.key, required this.userId});

  @override
  State<CommunityTabScreen> createState() => _CommunityTabScreenState();
}

class _CommunityTabScreenState extends State<CommunityTabScreen> {
  List<dynamic> _posts = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadPosts();
  }

  Future<void> _loadPosts() async {
    setState(() => _loading = true);
    try {
      final data = await ApiService.getPosts();
      setState(() => _posts = data['posts'] ?? []);
    } catch (_) {
      setState(() => _posts = []);
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('树人互助')),
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => CreatePostScreen(userId: widget.userId),
            ),
          );
          _loadPosts();
        },
        backgroundColor: const Color(0xFF6C8CD5),
        child: const Icon(Icons.add),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _posts.isEmpty
              ? const Center(child: Text('还没有求助帖，来发起第一个吧～'))
              : RefreshIndicator(
                  onRefresh: _loadPosts,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: _posts.length,
                    itemBuilder: (context, index) {
                      final post = _posts[index];
                      return _PostCard(post: post, userId: widget.userId);
                    },
                  ),
                ),
    );
  }
}

class _PostCard extends StatelessWidget {
  final dynamic post;
  final String userId;

  const _PostCard({required this.post, required this.userId});

  @override
  Widget build(BuildContext context) {
    final urgencyColor = _parseColor(post['urgency_color'] ?? '#9E9E9E');
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => PostDetailScreen(postId: post['post_id'], userId: userId),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: urgencyColor.withOpacity( 0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      post['urgency_name'] ?? '',
                      style: TextStyle(color: urgencyColor, fontSize: 11, fontWeight: FontWeight.w500),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      post['title'] ?? '',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                post['content'] ?? '',
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(color: Colors.grey[600], fontSize: 13),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Icon(Icons.chat_bubble_outline, size: 14, color: Colors.grey[400]),
                  const SizedBox(width: 4),
                  Text('${post['reply_count'] ?? 0} 回复', style: TextStyle(color: Colors.grey[500], fontSize: 12)),
                  const Spacer(),
                  ...(post['tags'] ?? []).take(3).map<Widget>(
                        (t) => Padding(
                          padding: const EdgeInsets.only(left: 6),
                          child: Text('#$t', style: TextStyle(color: Colors.grey[500], fontSize: 11)),
                        ),
                      ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _parseColor(String hex) {
    try {
      return Color(int.parse(hex.replaceFirst('#', '0xFF')));
    } catch (_) {
      return Colors.grey;
    }
  }
}

// ==================== 发帖 ====================

class CreatePostScreen extends StatefulWidget {
  final String userId;

  const CreatePostScreen({super.key, required this.userId});

  @override
  State<CreatePostScreen> createState() => _CreatePostScreenState();
}

class _CreatePostScreenState extends State<CreatePostScreen> {
  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _contentController = TextEditingController();
  final TextEditingController _tagController = TextEditingController();
  final List<String> _tags = [];
  int _urgency = 2;
  bool _submitting = false;

  final List<Map<String, dynamic>> _urgencyOptions = [
    {'level': 1, 'name': '日常倾诉', 'color': Colors.grey},
    {'level': 2, 'name': '需要倾听', 'color': Colors.green},
    {'level': 3, 'name': '希望得到建议', 'color': Colors.orange},
    {'level': 4, 'name': '情绪压力较大', 'color': Colors.deepOrange},
    {'level': 5, 'name': '急需陪伴', 'color': Colors.red},
  ];

  Future<void> _submit() async {
    if (_titleController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('请填写标题')));
      return;
    }
    if (_contentController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('请填写内容')));
      return;
    }
    setState(() => _submitting = true);
    try {
      await ApiService.createPost(
        userId: widget.userId,
        title: _titleController.text.trim(),
        content: _contentController.text.trim(),
        tags: _tags,
        urgencyLevel: _urgency,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('发布成功，会有人看到你的 🌟')));
        Navigator.pop(context);
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('发布失败，请稍后再试')));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _addTag() {
    final tag = _tagController.text.trim();
    if (tag.isNotEmpty && !_tags.contains(tag)) {
      setState(() => _tags.add(tag));
      _tagController.clear();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('发起求助')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextField(
              controller: _titleController,
              decoration: const InputDecoration(labelText: '标题', hintText: '一句话说说你的困扰'),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _contentController,
              maxLines: 6,
              decoration: const InputDecoration(labelText: '详细说说', hintText: '想说什么都可以，这里很安全'),
            ),
            const SizedBox(height: 16),
            const Text('紧急程度', style: TextStyle(fontWeight: FontWeight.w500)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: _urgencyOptions.map((opt) {
                final selected = _urgency == opt['level'];
                return ChoiceChip(
                  label: Text(opt['name']),
                  selected: selected,
                  selectedColor: (opt['color'] as Color).withOpacity( 0.2),
                  onSelected: (_) => setState(() => _urgency = opt['level']),
                );
              }).toList(),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _tagController,
                    decoration: const InputDecoration(labelText: '添加标签'),
                    onSubmitted: (_) => _addTag(),
                  ),
                ),
                IconButton(onPressed: _addTag, icon: const Icon(Icons.add)),
              ],
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              children: _tags.map((t) => Chip(
                    label: Text('#$t'),
                    onDeleted: () => setState(() => _tags.remove(t)),
                  )).toList(),
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
                    : const Text('发布', style: TextStyle(fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ==================== 帖子详情 ====================

class PostDetailScreen extends StatefulWidget {
  final String postId;
  final String userId;

  const PostDetailScreen({super.key, required this.postId, required this.userId});

  @override
  State<PostDetailScreen> createState() => _PostDetailScreenState();
}

class _PostDetailScreenState extends State<PostDetailScreen> {
  Map<String, dynamic>? _post;
  bool _loading = true;
  final TextEditingController _replyController = TextEditingController();
  bool _isHelper = false;

  @override
  void initState() {
    super.initState();
    _load();
    _checkHelper();
  }

  Future<void> _checkHelper() async {
    final status = await ApiService.getHelperStatus(widget.userId);
    setState(() => _isHelper = status['helper_status'] == 'approved');
  }

  Future<void> _load() async {
    try {
      final post = await ApiService.getPost(widget.postId);
      setState(() => _post = post);
    } catch (_) {}
    finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _sendReply() async {
    if (_replyController.text.trim().isEmpty) return;
    try {
      await ApiService.replyPost(
        postId: widget.postId,
        userId: widget.userId,
        content: _replyController.text.trim(),
      );
      _replyController.clear();
      _load();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('回复失败：$e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('帖子详情')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _post == null
              ? const Center(child: Text('帖子不存在'))
              : Column(
                  children: [
                    Expanded(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(_post!['title'] ?? '', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 12),
                            Text(_post!['content'] ?? '', style: const TextStyle(height: 1.6)),
                            const SizedBox(height: 16),
                            Wrap(
                              spacing: 6,
                              children: (_post!['tags'] ?? []).map<Widget>(
                                    (t) => Chip(label: Text('#$t'), visualDensity: VisualDensity.compact),
                                  ).toList(),
                            ),
                            const Divider(height: 32),
                            const Text('回复', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                            const SizedBox(height: 12),
                            if ((_post!['replies'] ?? []).isEmpty)
                              const Text('还没有回复，来做第一个倾听者吧～', style: TextStyle(color: Colors.grey)),
                            ...(_post!['replies'] ?? []).map<Widget>((r) => Container(
                                  margin: const EdgeInsets.only(bottom: 12),
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: Colors.grey[50],
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(r['content'] ?? ''),
                                )),
                          ],
                        ),
                      ),
                    ),
                    if (_isHelper)
                      Padding(
                        padding: const EdgeInsets.all(12),
                        child: Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: _replyController,
                                decoration: InputDecoration(
                                  hintText: '写下你的回复…',
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(24),
                                    borderSide: BorderSide.none,
                                  ),
                                  filled: true,
                                  fillColor: Colors.grey[100],
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            CircleAvatar(
                              radius: 22,
                              backgroundColor: const Color(0xFF6C8CD5),
                              child: IconButton(
                                icon: const Icon(Icons.send, color: Colors.white, size: 18),
                                onPressed: _sendReply,
                              ),
                            ),
                          ],
                        ),
                      )
                    else
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(12),
                        color: Colors.grey[50],
                        child: const Text(
                          '🔒 仅已认证帮帮者可回复。前往「我的 → 帮帮认证」申请。',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.grey, fontSize: 13),
                        ),
                      ),
                  ],
                ),
    );
  }
}
