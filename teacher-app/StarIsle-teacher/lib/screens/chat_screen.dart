/// @file chat_screen.dart
/// @description 教师端对话页面，按角色（心理老师 / 普通教师）区分可观察对话与自我求助两类入口，
///              提供学生聊天会话观察、介入、笔记记录、自助请求发起与系统通知展示等功能。
/// @module teacher-app/screens/chat

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../providers/teacher_providers.dart';
import '../models/teacher_models.dart';
import '../theme/teacher_theme.dart';

/// 对话页面根 Widget。
///
/// 继承自 [ConsumerWidget]，根据 [currentRoleProvider] 渲染不同 Tab 选项：
/// 心理老师显示「可观察对话 / 系统通知」，其他教师显示「自我求助 / 系统通知」。
class ChatScreen extends ConsumerWidget {
  /// 构造函数。
  const ChatScreen({super.key});

  /// 构建页面主体。
  ///
  /// 参数：
  /// - [context]：构建上下文；
  /// - [ref]：Riverpod [WidgetRef]，用于读取 [currentRoleProvider]。
  ///
  /// 返回：配置 TabBar 与 TabBarView 的 [Scaffold]。
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final teacherRole = ref.watch(currentRoleProvider);

    return DefaultTabController(
      length: teacherRole == TeacherRole.counselor ? 2 : 2,
      child: Scaffold(
        // 顶部栏：标题与 Tab 切换
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
        // 主体：根据角色切换两个 Tab 页面
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

/// 心理老师的可观察对话列表。
///
/// 监听 [chatSessionsProvider]，渲染学生聊天会话卡片，点击进入观察详情。
class CounselorChatListView extends ConsumerWidget {
  /// 构造函数。
  const CounselorChatListView({super.key});

  /// 构建列表。
  ///
  /// 参数：
  /// - [context]：构建上下文；
  /// - [ref]：Riverpod [WidgetRef]。
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

  /// 构建单个会话卡片，展示头像、姓名、最后消息、风险等级与时间。
  ///
  /// 参数：
  /// - [context]：构建上下文；
  /// - [session]：会话数据。
  ///
  /// 返回：可点击的 [InkWell] 卡片。
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
              // 学生头像（首字母）
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
              // 中部：姓名、班级、最后消息
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
                        // 介入中标签
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
              // 右侧：风险等级与时间
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

/// 聊天观察详情页面。
///
/// 展示某学生与 AI 的完整对话，支持心理老师介入对话、记录观察笔记与切换脱敏视图。
class ChatObservationScreen extends ConsumerStatefulWidget {
  /// 当前观察的会话。
  final StudentChatSession session;

  /// 构造函数。
  ///
  /// 参数：
  /// - [session]：待观察的会话实例。
  const ChatObservationScreen({super.key, required this.session});

  /// 创建状态对象。
  @override
  ConsumerState<ChatObservationScreen> createState() => _ChatObservationScreenState();
}

/// 聊天观察页面状态类。
///
/// 维护介入状态、脱敏视图开关与消息、笔记输入控制器。
class _ChatObservationScreenState extends ConsumerState<ChatObservationScreen> {
  /// 是否处于介入状态。
  bool _isIntervening = false;

  /// 是否展示原文（非脱敏）。
  bool _showOriginal = false;

  /// 介入消息输入控制器。
  final _messageController = TextEditingController();

  /// 观察笔记输入控制器。
  final _notesController = TextEditingController();

  /// 初始化状态，从会话读取初始介入状态。
  @override
  void initState() {
    super.initState();
    _isIntervening = widget.session.isIntervening;
  }

  /// 切换介入/退出介入状态。
  void _toggleIntervention() {
    setState(() {
      _isIntervening = !_isIntervening;
    });
  }

  /// 发送一条介入消息到当前会话。
  ///
  /// 内容为空时直接返回，否则通过 [chatSessionsProvider] 追加消息并清空输入框。
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

  /// 构建页面主体。
  ///
  /// 参数：
  /// - [context]：构建上下文。
  ///
  /// 返回：包含 AppBar、消息列表与底部操作区的 [Scaffold]。
  @override
  Widget build(BuildContext context) {
    final sessions = ref.watch(chatSessionsProvider);
    final session = sessions.firstWhere((s) => s.id == widget.session.id, orElse: () => widget.session);

    return Scaffold(
      appBar: AppBar(
        title: Text(session.studentName),
        actions: [
          // 脱敏视图切换（仅未介入时）
          if (!_isIntervening)
            IconButton(
              icon: const Icon(Icons.visibility),
              onPressed: () => setState(() => _showOriginal = !_showOriginal),
            ),
          // 观察笔记入口
          IconButton(
            icon: const Icon(Icons.note_add),
            onPressed: () => _showNotesDialog(),
          ),
        ],
      ),
      body: Column(
        children: [
          // 脱敏提示横幅
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
          // 消息列表
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
          // 底部：介入输入区或观察者操作区
          _isIntervening ? _buildInterventionInput(context) : _buildObserverActions(context),
        ],
      ),
    );
  }

  /// 构建单条消息气泡，区分教师/学生方向，并展示风险等级与策略提示。
  ///
  /// 参数：
  /// - [context]：构建上下文；
  /// - [message]：消息数据。
  ///
  /// 返回：消息 [Padding] Widget。
  Widget _buildMessageItem(BuildContext context, ChatMessage message) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 学生侧头像（左侧）
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
          // 消息气泡主体
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
                      // 风险等级标签
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
                      // AI 策略提示
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
          // 教师侧头像（右侧）
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

  /// 构建观察者操作区，提供「介入对话」按钮。
  ///
  /// 参数：
  /// - [context]：构建上下文。
  ///
  /// 返回：底部操作区 [Container]。
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

  /// 构建介入输入区，包含提示、消息输入与结束介入按钮。
  ///
  /// 参数：
  /// - [context]：构建上下文。
  ///
  /// 返回：介入输入区 [Container]。
  Widget _buildInterventionInput(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: Colors.grey[200]!)),
      ),
      child: Column(
        children: [
          // 介入提示横幅
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
          // 消息输入与发送
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
          // 结束介入按钮
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

  /// 弹出观察笔记对话框，支持保存（此处仅模拟提示）。
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

/// 教师自助求助列表视图。
///
/// 监听 [selfHelpRequestsProvider]，展示求助请求卡片，空列表时提供发起求助入口。
class TeacherHelpChatView extends ConsumerWidget {
  /// 构造函数。
  const TeacherHelpChatView({super.key});

  /// 构建列表或空状态。
  ///
  /// 参数：
  /// - [context]：构建上下文；
  /// - [ref]：Riverpod [WidgetRef]。
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final requests = ref.watch(selfHelpRequestsProvider);

    // 空列表：展示发起求助入口
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

  /// 构建单个求助请求卡片，展示状态、描述、支持类型与对接老师。
  ///
  /// 参数：
  /// - [context]：构建上下文；
  /// - [request]：求助请求。
  ///
  /// 返回：求助请求 [Card] Widget。
  Widget _buildHelpCard(BuildContext context, SelfHelpRequest request) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 标题与对接状态
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
            // 描述
            Text(request.description, style: const TextStyle(fontSize: 14)),
            const SizedBox(height: 8),
            // 支持类型与紧急程度
            Row(
              children: [
                Text('支持类型：${request.supportType}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                const SizedBox(width: 16),
                Text('紧急程度：${request.urgency}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
              ],
            ),
            // 已对接时展示对接老师与进入对话入口
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

/// 自助求助发起页面。
///
/// 提供困扰描述、支持类型与紧急程度表单，提交后模拟匹配心理老师流程。
class SelfHelpRequestScreen extends ConsumerStatefulWidget {
  /// 构造函数。
  const SelfHelpRequestScreen({super.key});

  /// 创建状态对象。
  @override
  ConsumerState<SelfHelpRequestScreen> createState() => _SelfHelpRequestScreenState();
}

/// 自助求助页面状态类。
///
/// 维护表单 Key、描述、支持类型与紧急程度。
class _SelfHelpRequestScreenState extends ConsumerState<SelfHelpRequestScreen> {
  /// 表单 Key。
  final _formKey = GlobalKey<FormState>();

  /// 困扰描述。
  String _description = '';

  /// 选定的支持类型。
  String _supportType = '倾听';

  /// 选定的紧急程度。
  String _urgency = '一般';

  /// 可选支持类型列表。
  final supportTypes = ['倾听', '建议', '正式咨询', '紧急支持'];

  /// 可选紧急程度列表。
  final urgencyLevels = ['紧急', '较紧急', '一般'];

  /// 提交求助请求，校验通过后展示提示并返回。
  void _submitRequest() {
    if (_formKey.currentState!.validate()) {
      _formKey.currentState!.save();

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('求助请求已提交，将匹配心理老师')),
      );

      Navigator.pop(context);
    }
  }

  /// 构建页面主体。
  ///
  /// 参数：
  /// - [context]：构建上下文。
  ///
  /// 返回：包含表单的 [Scaffold]。
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
              // 保密提示
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
              // 困扰描述输入
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
              // 支持类型选择
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
              // 紧急程度选择
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
              // 提交按钮
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

/// 系统通知列表视图。
///
/// 展示高风险告警、报告回执、授权请求与系统提示等通知项。
class SystemNotificationsView extends ConsumerWidget {
  /// 构造函数。
  const SystemNotificationsView({super.key});

  /// 构建通知列表。
  ///
  /// 参数：
  /// - [context]：构建上下文；
  /// - [ref]：Riverpod [WidgetRef]。
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

  /// 构建单条通知项卡片。
  ///
  /// 参数：
  /// - [context]：构建上下文；
  /// - [item]：通知项数据。
  ///
  /// 返回：通知 [Card] Widget。
  Widget _buildNotificationItem(BuildContext context, NotificationItem item) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            // 类型图标
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
            // 标题与描述
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
            // 时间
            Text(
              DateFormat('HH:mm').format(item.time),
              style: const TextStyle(fontSize: 10, color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }

  /// 根据通知类型返回对应图标。
  ///
  /// 参数：
  /// - [type]：通知类型标识。
  ///
  /// 返回：对应 [IconData]。
  IconData _getNotificationIcon(String type) {
    switch (type) {
      case 'alert': return Icons.warning;
      case 'report': return Icons.file_text;
      case 'auth': return Icons.lock_open;
      default: return Icons.info;
    }
  }

  /// 根据通知类型返回对应颜色。
  ///
  /// 参数：
  /// - [type]：通知类型标识。
  ///
  /// 返回：对应 [Color]。
  Color _getNotificationColor(String type) {
    switch (type) {
      case 'alert': return TeacherTheme.riskRed;
      case 'report': return TeacherTheme.starNightBlueLight;
      case 'auth': return TeacherTheme.warmOrange;
      default: return Colors.grey;
    }
  }
}

/// 通知项数据模型。
///
/// 描述单条系统通知的标题、内容、时间与类型。
class NotificationItem {
  /// 通知标题。
  final String title;

  /// 通知描述。
  final String description;

  /// 通知时间。
  final DateTime time;

  /// 通知类型标识（alert/report/auth/system）。
  final String type;

  /// 构造通知项实例。
  ///
  /// 参数：
  /// - [title]：标题；
  /// - [description]：描述；
  /// - [time]：时间；
  /// - [type]：类型标识。
  NotificationItem(this.title, this.description, this.time, this.type);
}
