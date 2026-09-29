import 'package:flutter/material.dart';
import '../services/api_service.dart';

/// AI 陪聊 Tab - 包含「聊天」和「打卡」两个子界面
///
/// 聊天：与 AI 助手「星宝」对话，提供心理陪伴与支持
/// 打卡：记录每日情绪，积累心理韧性数据
class ChatTabScreen extends StatefulWidget {
  final String userId;

  const ChatTabScreen({super.key, required this.userId});

  @override
  State<ChatTabScreen> createState() => _ChatTabScreenState();
}

class _ChatTabScreenState extends State<ChatTabScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('星宝陪你'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: '聊天'),
            Tab(text: '打卡'),
          ],
          labelColor: const Color(0xFF6C8CD5),
          unselectedLabelColor: Colors.grey,
          indicatorColor: const Color(0xFF6C8CD5),
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          ChatScreen(userId: widget.userId),
          CheckInScreen(userId: widget.userId),
        ],
      ),
    );
  }
}

// ==================== 聊天界面 ====================

class ChatScreen extends StatefulWidget {
  final String userId;

  const ChatScreen({super.key, required this.userId});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<Map<String, dynamic>> _messages = [
    {'role': 'ai', 'content': '你好呀～我是星宝，很高兴认识你！今天过得怎么样？有什么想聊的都可以跟我说哦。😊'}
  ];
  bool _isLoading = false;

  void _sendMessage() async {
    final text = _controller.text.trim();
    if (text.isEmpty) return;

    setState(() {
      _messages.add({'role': 'user', 'content': text});
      _isLoading = true;
    });
    _controller.clear();
    _scrollToBottom();

    try {
      // 只传最近 10 条历史，节省 token
      final history = _messages
          .sublist(0, _messages.length - 1)
          .take(10)
          .toList();
      final response = await ApiService.sendMessage(
        message: text,
        history: history,
        userId: widget.userId,
      );
      final reply = response['reply'] ?? response['response'] ?? '星宝还在学习中，稍后再试哦～';
      setState(() {
        _messages.add({'role': 'ai', 'content': reply});
      });
      // 检查是否有风险提示
      if (response['risk_level'] != null && response['risk_level'] != 'safe') {
        _showRiskNotice(response);
      }
    } catch (e) {
      setState(() {
        _messages.add({
          'role': 'ai',
          'content': '抱歉，星宝刚刚走神了。请稍后再试一次，好吗？'
        });
      });
    } finally {
      setState(() => _isLoading = false);
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _showRiskNotice(Map<String, dynamic> response) {
    final risk = response['risk_level'] ?? '';
    if (risk == 'high' || risk == 'critical') {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('星宝很担心你'),
          content: const Text('如果你正经历困难，请记得你不是一个人。可以拨打 12355 青少年服务热线或 400-161-9995 希望24热线寻求帮助。'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('我知道了'),
            ),
          ],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: ListView.builder(
            controller: _scrollController,
            padding: const EdgeInsets.all(16),
            itemCount: _messages.length,
            itemBuilder: (context, index) {
              final msg = _messages[index];
              final isUser = msg['role'] == 'user';
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Row(
                  mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
                  children: [
                    if (!isUser)
                      const CircleAvatar(
                        radius: 16,
                        backgroundColor: Color(0xFF6C8CD5),
                        child: Text('星', style: TextStyle(color: Colors.white, fontSize: 14)),
                      ),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: isUser ? const Color(0xFF6C8CD5) : Colors.grey[100],
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Text(
                          msg['content'],
                          style: TextStyle(color: isUser ? Colors.white : Colors.black87),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
        if (_isLoading)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 8),
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
        Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _controller,
                  decoration: InputDecoration(
                    hintText: '跟星宝说说话吧～',
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(24),
                      borderSide: BorderSide.none,
                    ),
                    filled: true,
                    fillColor: Colors.grey[100],
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  ),
                  onSubmitted: (_) => _sendMessage(),
                ),
              ),
              const SizedBox(width: 8),
              CircleAvatar(
                radius: 24,
                backgroundColor: const Color(0xFF6C8CD5),
                child: IconButton(
                  icon: const Icon(Icons.send, color: Colors.white),
                  onPressed: _sendMessage,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ==================== 情绪打卡界面 ====================

class CheckInScreen extends StatefulWidget {
  final String userId;

  const CheckInScreen({super.key, required this.userId});

  @override
  State<CheckInScreen> createState() => _CheckInScreenState();
}

class _CheckInScreenState extends State<CheckInScreen> {
  final List<Map<String, dynamic>> _moods = [
    {'emoji': '😄', 'label': '开心', 'mood': 'happy'},
    {'emoji': '😊', 'label': '平静', 'mood': 'calm'},
    {'emoji': '😐', 'label': '一般', 'mood': 'neutral'},
    {'emoji': '😔', 'label': '低落', 'mood': 'sad'},
    {'emoji': '😢', 'label': '难过', 'mood': 'depressed'},
    {'emoji': '😰', 'label': '紧张', 'mood': 'anxious'},
    {'emoji': '😡', 'label': '生气', 'mood': 'angry'},
  ];

  String? _selectedMood;
  double _intensity = 5;
  final TextEditingController _noteController = TextEditingController();
  bool _submitting = false;
  List<dynamic> _history = [];

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    try {
      final history = await ApiService.getMoodHistory(widget.userId);
      setState(() => _history = history);
    } catch (_) {}
  }

  Future<void> _submitCheckIn() async {
    if (_selectedMood == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('先选一个今天的心情吧～')),
      );
      return;
    }
    setState(() => _submitting = true);
    try {
      await ApiService.checkInMood(
        userId: widget.userId,
        mood: _selectedMood!,
        intensity: _intensity.round(),
        note: _noteController.text.trim(),
      );
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('打卡成功！星宝陪着你 🌟')),
      );
      _noteController.clear();
      setState(() => _selectedMood = null);
      _loadHistory();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('打卡失败，请稍后再试')),
      );
    } finally {
      setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '今天的心情怎么样？',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text('如实选择就好，没有对错之分～', style: TextStyle(color: Colors.grey)),
          const SizedBox(height: 20),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            children: _moods.map((m) {
              final selected = _selectedMood == m['mood'];
              return GestureDetector(
                onTap: () => setState(() => _selectedMood = m['mood']),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: selected ? const Color(0xFF6C8CD5).withOpacity( 0.1) : Colors.grey[100],
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: selected ? const Color(0xFF6C8CD5) : Colors.transparent,
                    ),
                  ),
                  child: Column(
                    children: [
                      Text(m['emoji'], style: const TextStyle(fontSize: 28)),
                      const SizedBox(height: 4),
                      Text(m['label'], style: const TextStyle(fontSize: 12)),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 24),
          const Text('这种感觉有多强烈？', style: TextStyle(fontWeight: FontWeight.w500)),
          Slider(
            value: _intensity,
            min: 1,
            max: 10,
            divisions: 9,
            label: _intensity.round().toString(),
            activeColor: const Color(0xFF6C8CD5),
            onChanged: (v) => setState(() => _intensity = v),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _noteController,
            maxLines: 3,
            decoration: InputDecoration(
              hintText: '想说点什么？（选填）',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
              filled: true,
              fillColor: Colors.grey[100],
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: _submitting ? null : _submitCheckIn,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF6C8CD5),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _submitting
                  ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2)
                  : const Text('完成打卡', style: TextStyle(fontSize: 16)),
            ),
          ),
          const SizedBox(height: 32),
          const Text('最近打卡', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          if (_history.isEmpty)
            const Text('还没有打卡记录，开始你的第一次吧～', style: TextStyle(color: Colors.grey)),
          ..._history.take(7).map((h) {
            final mood = h['mood'] ?? 'neutral';
            final emoji = _moods.firstWhere(
              (m) => m['mood'] == mood,
              orElse: () => {'emoji': '😊'},
            )['emoji'];
            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey[50],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Text(emoji, style: const TextStyle(fontSize: 20)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(h['mood'] ?? '', style: const TextStyle(fontWeight: FontWeight.w500)),
                        if (h['note'] != null && h['note'].toString().isNotEmpty)
                          Text(h['note'].toString(), style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                      ],
                    ),
                  ),
                  Text(
                    h['intensity']?.toString() ?? '',
                    style: TextStyle(color: Colors.grey[400], fontSize: 12),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}
