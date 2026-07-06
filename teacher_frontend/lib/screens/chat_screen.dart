import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../providers/teacher_providers.dart';
import '../models/teacher_models.dart';
import '../theme/teacher_theme.dart';

class ChatScreen extends ConsumerWidget {
  const ChatScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final teacherRole = ref.watch(currentRoleProvider);

    return DefaultTabController(
      length: teacherRole == TeacherRole.counselor ? 2 : 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('对话'),
          bottom: TabBar(
            tabs: teacherRole == TeacherRole.counselor
                ? const [
                    Tab(text: '可观察对话'),
                    Tab(text: '系统通知'),
                  ]
                : const [
                    Tab(text: '自我求助'),
                    Tab(text: '系统通知'),
                  ],
          ),
        ),
        body: TabBarView(
          children: teacherRole == TeacherRole.counselor
              ? const [
                  CounselorChatListView(),
                  SystemNotificationsView(),
                ]
              : const [
                  TeacherHelpChatView(),
                  SystemNotificationsView(),
                ],
        ),
      ),
    );
  }
}

class CounselorChatListView extends ConsumerWidget {
  const CounselorChatListView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessions = ref.watch(chatSessionsProvider);

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: sessions.length,
      itemBuilder: (context, index) {
        final session = sessions[index];
        return _buildSessionCard(context, session);
      },
    );
  }

  Widget _buildSessionCard(BuildContext context, StudentChatSession session) {
    return InkWell(
      onTap: () {
        Navigator.push(context, MaterialPageRoute(builder: (_) => ChatObservationScreen(session: session)));
      },
      borderRadius: BorderRadius.circular(12),
      child: Card(
        margin: const EdgeInsets.only(bottom: 12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  color: session.riskLevel.color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(25),
                ),
                child: Center(
                  child: Text(
                    session.studentName.substring(0, 1),
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: session.riskLevel.color),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          session.studentName,
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(width: 8),
                        if (session.isIntervening)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: TeacherTheme.warmOrange.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text('介入中', style: TextStyle(fontSize: 10, color: TeacherTheme.warmOrange)),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      session.className,
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      session.messages.last.content,
                      style: const TextStyle(fontSize: 14, color: Colors.grey),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              Column(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: session.riskLevel.color.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      session.riskLevel.label,
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.w500, color: session.riskLevel.color),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    DateFormat('MM-dd HH:mm').format(session.lastActive),
                    style: const TextStyle(fontSize: 10, color: Colors.grey),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class ChatObservationScreen extends ConsumerStatefulWidget {
  final StudentChatSession session;

  const ChatObservationScreen({super.key, required this.session});

  @override
  ConsumerState<ChatObservationScreen> createState() => _ChatObservationScreenState();
}

class _ChatObservationScreenState extends ConsumerState<ChatObservationScreen> {
  bool _isIntervening = false;
  bool _showOriginal = false;
  final _messageController = TextEditingController();
  final _notesController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _isIntervening = widget.session.isIntervening;
  }

  void _toggleIntervention() {
    setState(() {
      _isIntervening = !_isIntervening;
    });
  }

  void _sendMessage() {
    if (_messageController.text.trim().isEmpty) return;

    ref.read(chatSessionsProvider.notifier).addMessage(
          widget.session.id,
          ChatMessage(
            senderId: 't2',
            senderName: '王丽老师',
            isTeacher: true,
            content: _messageController.text.trim(),
            sentAt: DateTime.now(),
          ),
        );

    _messageController.clear();
  }

  @override
  Widget build(BuildContext context) {
    final sessions = ref.watch(chatSessionsProvider);
    final session = sessions.firstWhere((s) => s.id == widget.session.id, orElse: () => widget.session);

    return Scaffold(
      appBar: AppBar(
        title: Text(session.studentName),
        actions: [
          if (!_isIntervening)
            IconButton(
              icon: const Icon(Icons.visibility),
              onPressed: () => setState(() => _showOriginal = !_showOriginal),
            ),
          IconButton(
            icon: const Icon(Icons.note_add),
            onPressed: () => _showNotesDialog(),
          ),
        ],
      ),
      body: Column(
        children: [
          if (!_isIntervening && !_showOriginal)
            Container(
              padding: const EdgeInsets.all(12),
              color: Colors.yellow[50],
              child: const Text(
                '当前为脱敏视图，点击右上角图标查看原文',
                style: TextStyle(fontSize: 12, color: Colors.yellow[800]),
                textAlign: TextAlign.center,
              ),
            ),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: session.messages.length,
              itemBuilder: (context, index) {
                final message = session.messages[index];
                return _buildMessageItem(context, message);
              },
            ),
          ),
          _isIntervening ? _buildInterventionInput(context) : _buildObserverActions(context),
        ],
      ),
    );
  }

  Widget _buildMessageItem(BuildContext context, ChatMessage message) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!message.isTeacher) ...[
            Container(
              width: 36,
              height: 36,
              decoration: const BoxDecoration(
                color: TeacherTheme.warmOrange,
                borderRadius: BorderRadius.circular(18),
              ),
              child: const Center(child: Text('小', style: TextStyle(color: Colors.white))),
            ),
            const SizedBox(width: 12),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: message.isTeacher ? CrossAxisAlignment.end : CrossAxisAlignment.start,
              children: [
                Text(
                  message.senderName,
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: message.isTeacher ? TeacherTheme.starNightBlue : Colors.grey[100],
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        message.content,
                        style: TextStyle(
                          fontSize: 14,
                          color: message.isTeacher ? Colors.white : Colors.black,
                        ),
                      ),
                      if (message.riskLevel != null) ...[
                        const SizedBox(height: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: message.riskLevel!.color.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            message.riskLevel!.label,
                            style: TextStyle(fontSize: 10, color: message.riskLevel!.color),
                          ),
                        ),
                      ],
                      if (message.strategyHint != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          '策略：${message.strategyHint}',
                          style: const TextStyle(fontSize: 10, color: Colors.grey),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  DateFormat('HH:mm').format(message.sentAt),
                  style: const TextStyle(fontSize: 10, color: Colors.grey),
                ),
              ],
            ),
          ),
          if (message.isTeacher) ...[
            const SizedBox(width: 12),
            Container(
              width: 36,
              height: 36,
              decoration: const BoxDecoration(
                color: TeacherTheme.starNightBlue,
                borderRadius: BorderRadius.circular(18),
              ),
              child: const Center(child: Text('王', style: TextStyle(color: Colors.white))),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildObserverActions(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: Colors.grey[200]!)),
      ),
      child: Row(
        children: [
          Expanded(
            child: ElevatedButton(
              onPressed: _toggleIntervention,
              child: const Text('介入对话'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInterventionInput(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: Colors.grey[200]!)),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: TeacherTheme.warmOrange.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Text(
              '心理老师介入中，小星已退到一旁',
              style: TextStyle(color: Color(0xFFFF9800), fontSize: 14),
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _messageController,
                  decoration: const InputDecoration(
                    hintText: '输入回复内容...',
                    border: OutlineInputBorder(),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              ElevatedButton(
                onPressed: _sendMessage,
                child: const Text('发送'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () {
                    _toggleIntervention();
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('老师先去忙啦，小星继续陪你~')),
                    );
                  },
                  child: const Text('结束介入'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _showNotesDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('观察笔记'),
        content: TextField(
          controller: _notesController,
          maxLines: 4,
          decoration: const InputDecoration(hintText: '记录你的观察笔记...'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('笔记已保存')),
              );
            },
            child: const Text('保存'),
          ),
        ],
      ),
    );
  }
}

class TeacherHelpChatView extends ConsumerWidget {
  const TeacherHelpChatView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final requests = ref.watch(selfHelpRequestsProvider);

    if (requests.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.message, size: 48, color: Colors.grey),
            const SizedBox(height: 16),
            const Text('暂无求助对话'),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SelfHelpRequestScreen())),
              child: const Text('发起求助'),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: requests.length,
      itemBuilder: (context, index) {
        final request = requests[index];
        return _buildHelpCard(context, request);
      },
    );
  }

  Widget _buildHelpCard(BuildContext context, SelfHelpRequest request) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Text('我的求助', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: request.isConnected ? TeacherTheme.riskGreen.withOpacity(0.1) : TeacherTheme.riskOrange.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    request.isConnected ? '已对接' : '等待中',
                    style: TextStyle(
                      fontSize: 12,
                      color: request.isConnected ? TeacherTheme.riskGreen : TeacherTheme.riskOrange,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(request.description, style: const TextStyle(fontSize: 14)),
            const SizedBox(height: 8),
            Row(
              children: [
                Text('支持类型：${request.supportType}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                const SizedBox(width: 16),
                Text('紧急程度：${request.urgency}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
              ],
            ),
            if (request.isConnected && request.counselorName != null) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: TeacherTheme.starNightBlueLight.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('对接心理老师', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                    const SizedBox(height: 4),
                    Text(request.counselorName!, style: const TextStyle(fontSize: 14)),
                    const SizedBox(height: 8),
                    ElevatedButton(
                      onPressed: () {},
                      child: const Text('进入对话'),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class SelfHelpRequestScreen extends ConsumerStatefulWidget {
  const SelfHelpRequestScreen({super.key});

  @override
  ConsumerState<SelfHelpRequestScreen> createState() => _SelfHelpRequestScreenState();
}

class _SelfHelpRequestScreenState extends ConsumerState<SelfHelpRequestScreen> {
  final _formKey = GlobalKey<FormState>();
  String _description = '';
  String _supportType = '倾听';
  String _urgency = '一般';

  final supportTypes = ['倾听', '建议', '正式咨询', '紧急支持'];
  final urgencyLevels = ['紧急', '较紧急', '一般'];

  void _submitRequest() {
    if (_formKey.currentState!.validate()) {
      _formKey.currentState!.save();

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('求助请求已提交，将匹配心理老师')),
      );

      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('我要找人聊聊'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: TeacherTheme.warmOrange.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text(
                  '你的求助信息将被严格保密，仅与对接的心理老师共享，不会被学校管理层查看。',
                  style: TextStyle(fontSize: 14),
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: 20),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('当前困扰描述', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  TextFormField(
                    maxLines: 4,
                    decoration: const InputDecoration(
                      border: OutlineInputBorder(),
                      hintText: '请描述你目前的困扰...',
                    ),
                    validator: (value) => value == null || value.isEmpty ? '请填写困扰描述' : null,
                    onSaved: (value) => _description = value ?? '',
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('希望获得的支持类型', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: supportTypes.map((type) {
                      final isSelected = _supportType == type;
                      return ElevatedButton(
                        onPressed: () => setState(() => _supportType = type),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: isSelected ? TeacherTheme.starNightBlue : Colors.grey[100],
                          foregroundColor: isSelected ? Colors.white : Colors.black,
                          elevation: 0,
                        ),
                        child: Text(type),
                      );
                    }).toList(),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('紧急程度', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: urgencyLevels.map((level) {
                      final isSelected = _urgency == level;
                      return ElevatedButton(
                        onPressed: () => setState(() => _urgency = level),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: isSelected ? TeacherTheme.starNightBlue : Colors.grey[100],
                          foregroundColor: isSelected ? Colors.white : Colors.black,
                          elevation: 0,
                        ),
                        child: Text(level),
                      );
                    }).toList(),
                  ),
                ],
              ),
              const SizedBox(height: 30),
              ElevatedButton(
                onPressed: _submitRequest,
                style: ElevatedButton.styleFrom(minimumSize: const Size(double.infinity, 50)),
                child: const Text('提交求助'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class SystemNotificationsView extends ConsumerWidget {
  const SystemNotificationsView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifications = [
      NotificationItem('高风险告警', '李小雨触发红色风险，已自动开放对话查看权限', DateTime.now().subtract(const Duration(hours: 1)), 'alert'),
      NotificationItem('报告回执', '王浩宇的症状反馈报告已处理完成', DateTime.now().subtract(const Duration(hours: 6)), 'report'),
      NotificationItem('授权请求', '周子涵发起对话观察授权请求', DateTime.now().subtract(const Duration(hours: 2)), 'auth'),
      NotificationItem('系统提示', '今日有3条待办事项需要处理', DateTime.now().subtract(const Duration(hours: 3)), 'system'),
    ];

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: notifications.length,
      itemBuilder: (context, index) {
        final notification = notifications[index];
        return _buildNotificationItem(context, notification);
      },
    );
  }

  Widget _buildNotificationItem(BuildContext context, NotificationItem item) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: _getNotificationColor(item.type).withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Center(
                child: Icon(_getNotificationIcon(item.type), color: _getNotificationColor(item.type), size: 20),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item.title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 4),
                  Text(item.description, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                ],
              ),
            ),
            Text(
              DateFormat('HH:mm').format(item.time),
              style: const TextStyle(fontSize: 10, color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }

  IconData _getNotificationIcon(String type) {
    switch (type) {
      case 'alert': return Icons.warning;
      case 'report': return Icons.file_text;
      case 'auth': return Icons.lock_open;
      default: return Icons.info;
    }
  }

  Color _getNotificationColor(String type) {
    switch (type) {
      case 'alert': return TeacherTheme.riskRed;
      case 'report': return TeacherTheme.starNightBlueLight;
      case 'auth': return TeacherTheme.warmOrange;
      default: return Colors.grey;
    }
  }
}

class NotificationItem {
  final String title;
  final String description;
  final DateTime time;
  final String type;

  NotificationItem(this.title, this.description, this.time, this.type);
}