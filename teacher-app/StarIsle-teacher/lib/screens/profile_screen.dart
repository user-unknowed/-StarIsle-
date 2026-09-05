/// @file profile_screen.dart
/// @description 教师端「我的」页面，聚合个人信息卡片、每日心情打卡与趋势、舒压小游戏、
///              求助记录、知识库、隐私安全与设置入口，并附多个舒压小游戏与自助求助表单。
/// @module teacher-app/screens/profile

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../providers/teacher_providers.dart';
import '../models/teacher_models.dart';
import '../theme/teacher_theme.dart';

/// 教师个人中心页面 Widget。
///
/// 继承自 [ConsumerWidget]，监听 [currentTeacherProvider]、[moodRecordsProvider]、
/// [currentRoleProvider]，渲染头像、心情打卡、舒压空间、求助记录、知识库、隐私与设置等模块。
class ProfileScreen extends ConsumerWidget {
  /// 构造函数。
  const ProfileScreen({super.key});

  /// 构建页面主体。
  ///
  /// 参数：
  /// - [context]：构建上下文；
  /// - [ref]：Riverpod [WidgetRef]，用于读取教师信息、心情记录与当前角色。
  ///
  /// 返回：纵向滚动的多模块 [Scaffold]。
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final teacher = ref.watch(currentTeacherProvider);
    final moodRecords = ref.watch(moodRecordsProvider);
    final teacherRole = ref.watch(currentRoleProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('我的'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // 教师头像与基本信息卡片
            _buildProfileHeader(context, teacher),
            const SizedBox(height: 20),
            // 今日心情打卡与趋势
            _buildMoodCheckIn(context, moodRecords),
            const SizedBox(height: 20),
            _buildSectionTitle('舒压空间'),
            _buildRelaxationSpace(context),
            const SizedBox(height: 20),
            _buildSectionTitle('我的求助记录'),
            _buildHelpRecords(context, ref),
            const SizedBox(height: 20),
            _buildSectionTitle('知识库'),
            _buildKnowledgeBase(context, ref, teacherRole),
            const SizedBox(height: 20),
            // 隐私与安全设置入口
            _buildPrivacyAndSecurity(context),
            const SizedBox(height: 20),
            // 通用设置入口
            _buildSettings(context),
            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }

  /// 构建教师头像与基本信息头部卡片。
  ///
  /// 参数：
  /// - [context]：构建上下文；
  /// - [teacher]：当前教师数据。
  ///
  /// 返回：带渐变背景的 [Container]。
  Widget _buildProfileHeader(BuildContext context, Teacher teacher) {
    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [TeacherTheme.starNightBlue, TeacherTheme.starNightBlueLight],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      padding: const EdgeInsets.all(20),
      child: Row(
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.all(Radius.circular(30)),
            ),
            child: Center(
              child: Text(
                teacher.name.substring(0, 1),
                style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: TeacherTheme.starNightBlue),
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  teacher.name,
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 4),
                Text(
                  '${teacher.roleLabel} · ${teacher.school}',
                  style: const TextStyle(fontSize: 14, color: Colors.white70),
                ),
                const SizedBox(height: 4),
                Text(
                  '负责 ${teacher.className} · ${teacher.studentCount} 名学生',
                  style: const TextStyle(fontSize: 12, color: Colors.white60),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.edit, color: Colors.white),
            onPressed: () {},
          ),
        ],
      ),
    );
  }

  Widget _buildMoodCheckIn(BuildContext context, List<TeacherMoodRecord> records) {
    final todayRecord = records.lastWhere((r) => 
      r.recordedAt.day == DateTime.now().day &&
      r.recordedAt.month == DateTime.now().month &&
      r.recordedAt.year == DateTime.now().year,
      orElse: () => TeacherMoodRecord(moodLevel: 0, stressTags: [], recordedAt: DateTime.now())
    );

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('今日心情', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _buildMoodButton(context, 1, '很糟', '😢', todayRecord.moodLevel),
                _buildMoodButton(context, 2, '不太好', '😔', todayRecord.moodLevel),
                _buildMoodButton(context, 3, '一般', '😐', todayRecord.moodLevel),
                _buildMoodButton(context, 4, '不错', '🙂', todayRecord.moodLevel),
                _buildMoodButton(context, 5, '很棒', '😄', todayRecord.moodLevel),
              ],
            ),
            if (todayRecord.moodLevel > 0) ...[
              const SizedBox(height: 12),
              Text(
                '今日已打卡：${todayRecord.moodEmoji} ${todayRecord.moodLabel}',
                style: TextStyle(fontSize: 14, color: TeacherTheme.starNightBlue),
              ),
              if (todayRecord.stressTags.isNotEmpty) ...[
                const SizedBox(height: 4),
                Wrap(
                  spacing: 8,
                  children: todayRecord.stressTags.map((tag) => 
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: TeacherTheme.riskOrange.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(tag, style: TextStyle(fontSize: 12, color: TeacherTheme.riskOrange)),
                    )
                  ).toList(),
                ),
              ],
            ],
            const SizedBox(height: 8),
            _buildMoodTrend(records),
          ],
        ),
      ),
    );
  }

  /// 构建单个心情等级按钮。
  ///
  /// 参数：
  /// - [context]：构建上下文；
  /// - [level]：心情等级（1-5）；
  /// - [label]：按钮文字；
  /// - [emoji]：按钮 Emoji；
  /// - [currentLevel]：当前已选等级，用于高亮。
  ///
  /// 返回：纵向排列的 [Column] 按钮。
  Widget _buildMoodButton(BuildContext context, int level, String label, String emoji, int currentLevel) {
    final isSelected = currentLevel == level;
    return Column(
      children: [
        IconButton(
          iconSize: 40,
          icon: Text(emoji),
          color: isSelected ? TeacherTheme.starNightBlue : Colors.grey[300],
          onPressed: isSelected ? null : () {},
        ),
        Text(label, style: TextStyle(fontSize: 12, color: isSelected ? TeacherTheme.starNightBlue : Colors.grey)),
      ],
    );
  }

  Widget _buildMoodTrend(List<TeacherMoodRecord> records) {
    final last7Days = records.take(7).toList().reversed.toList();
    
    return SizedBox(
      height: 80,
      child: Row(
        children: last7Days.map((record) {
          return Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 2),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Container(
                    height: record.moodLevel * 14,
                    decoration: BoxDecoration(
                      color: _getMoodColor(record.moodLevel),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    DateFormat('M/d').format(record.recordedAt),
                    style: const TextStyle(fontSize: 10, color: Colors.grey),
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  /// 根据心情等级返回对应的展示颜色。
  ///
  /// 参数：
  /// - [level]：心情等级（1-5）。
  ///
  /// 返回：对应等级的 [Color]。
  Color _getMoodColor(int level) {
    switch (level) {
      case 1: return TeacherTheme.riskRed;
      case 2: return TeacherTheme.riskOrange;
      case 3: return TeacherTheme.riskYellow;
      case 4: return TeacherTheme.starNightBlueLight;
      case 5: return TeacherTheme.riskGreen;
      default: return Colors.grey[200]!;
    }
  }

  Widget _buildSectionTitle(String title) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Text(
        title,
        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
      ),
    );
  }

  /// 构建舒压空间网格，包含捏泡泡纸、指尖陀螺、涂色板、白噪音、星空呼吸等入口。
  ///
  /// 参数：
  /// - [context]：构建上下文。
  ///
  /// 返回：3 列 [GridView]。
  Widget _buildRelaxationSpace(BuildContext context) {
    final relaxationItems = [
      RelaxationItem('捏泡泡纸', Icons.bubble_chart, TeacherTheme.riskGreen, () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BubbleWrapGame()))),
      RelaxationItem('指尖陀螺', Icons.spinner, TeacherTheme.starNightBlue, () => Navigator.push(context, MaterialPageRoute(builder: (_) => const FidgetSpinnerGame()))),
      RelaxationItem('涂色板', Icons.palette, TeacherTheme.warmOrange, () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ColoringBoardGame()))),
      RelaxationItem('白噪音', Icons.waves, TeacherTheme.starNightBlueLight, () => Navigator.push(context, MaterialPageRoute(builder: (_) => const WhiteNoiseGenerator()))),
      RelaxationItem('星空呼吸', Icons.cloud_circle, Colors.purple, () => Navigator.push(context, MaterialPageRoute(builder: (_) => const StarBreathingGame()))),
    ];

    return GridView.count(
      shrinkWrap: true,
      crossAxisCount: 3,
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      children: relaxationItems.map((item) => _buildRelaxationCard(context, item)).toList(),
    );
  }

  Widget _buildRelaxationCard(BuildContext context, RelaxationItem item) {
    return InkWell(
      onTap: item.onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: Colors.grey[100]!,
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Icon(item.icon, color: item.color, size: 28),
            const SizedBox(height: 8),
            Text(item.label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: item.color)),
          ],
        ),
      ),
    );
  }

  /// 构建求助记录列表，空列表时显示占位与「发起求助」入口。
  ///
  /// 参数：
  /// - [context]：构建上下文；
  /// - [ref]：Riverpod [WidgetRef]，用于读取 [selfHelpRequestsProvider]。
  ///
  /// 返回：[Card] 包装的求助记录列表或空状态。
  Widget _buildHelpRecords(BuildContext context, WidgetRef ref) {
    final requests = ref.watch(selfHelpRequestsProvider);
    
    if (requests.isEmpty) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Center(
            child: Column(
              children: [
                const Icon(Icons.message, size: 32, color: Colors.grey),
                const SizedBox(height: 8),
                const Text('暂无求助记录'),
                TextButton(
                  onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SelfHelpRequestScreen())),
                  child: const Text('发起求助'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: requests.map((request) => _buildHelpRecordItem(context, request)).toList(),
        ),
      ),
    );
  }

  Widget _buildHelpRecordItem(BuildContext context, SelfHelpRequest request) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                DateFormat('yyyy-MM-dd').format(request.submittedAt),
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: request.isConnected ? TeacherTheme.riskGreen.withOpacity(0.1) : TeacherTheme.riskOrange.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  request.isConnected ? '已对接' : '等待中',
                  style: TextStyle(fontSize: 10, color: request.isConnected ? TeacherTheme.riskGreen : TeacherTheme.riskOrange),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(request.description, style: const TextStyle(fontSize: 12, color: Colors.grey)),
        ],
      ),
    );
  }

  /// 构建知识库列表，按角色过滤专业项。
  ///
  /// 参数：
  /// - [context]：构建上下文；
  /// - [ref]：Riverpod [WidgetRef]，用于读取 [knowledgeBaseProvider]；
  /// - [role]：当前教师角色，非心理老师仅展示非专业项。
  ///
  /// 返回：[Card] 包装的知识条目列表。
  Widget _buildKnowledgeBase(BuildContext context, WidgetRef ref, TeacherRole role) {
    final knowledgeBase = ref.watch(knowledgeBaseProvider);
    
    final visibleItems = role == TeacherRole.counselor
        ? knowledgeBase
        : knowledgeBase.where((item) => !item.isProfessional).toList();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: visibleItems.map((item) => _buildKnowledgeItem(context, item)).toList(),
        ),
      ),
    );
  }

  Widget _buildKnowledgeItem(BuildContext context, KnowledgeBaseItem item) {
    return InkWell(
      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => KnowledgeDetailScreen(item: item))),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: TeacherTheme.starNightBlueLight.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Center(child: Icon(Icons.book, color: TeacherTheme.starNightBlueLight)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item.title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 4),
                  Text(item.summary, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: Colors.grey),
          ],
        ),
      ),
    );
  }

  /// 构建隐私与安全设置卡片，包含数据访问记录、求助隐私说明与账号安全。
  ///
  /// 参数：
  /// - [context]：构建上下文。
  ///
  /// 返回：[Card] 包装的菜单项集合。
  Widget _buildPrivacyAndSecurity(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            _buildMenuItem(context, '数据访问记录', Icons.history, () {}),
            const Divider(height: 1),
            _buildMenuItem(context, '教师求助隐私说明', Icons.lock, () {}),
            const Divider(height: 1),
            _buildMenuItem(context, '账号安全', Icons.security, () {}),
          ],
        ),
      ),
    );
  }

  /// 构建通用设置卡片，包含通知、深色模式、舒压引导、关于与退出登录。
  ///
  /// 参数：
  /// - [context]：构建上下文。
  ///
  /// 返回：[Card] 包装的菜单项集合。
  Widget _buildSettings(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            _buildMenuItem(context, '通知设置', Icons.notifications, () {}),
            const Divider(height: 1),
            _buildMenuItem(context, '深色模式', Icons.dark_mode, () {}),
            const Divider(height: 1),
            _buildMenuItem(context, '舒压引导', Icons.lightbulb, () {}),
            const Divider(height: 1),
            _buildMenuItem(context, '关于星屿', Icons.info, () {}),
            const Divider(height: 1),
            _buildMenuItem(context, '退出登录', Icons.logout, () {}, isDestructive: true),
          ],
        ),
      ),
    );
  }

  /// 构建单个设置菜单项行。
  ///
  /// 参数：
  /// - [context]：构建上下文；
  /// - [title]：菜单项标题；
  /// - [icon]：前置图标；
  /// - [onTap]：点击回调；
  /// - [isDestructive]：是否为危险操作（如退出登录），使用红色样式。
  ///
  /// 返回：可点击的 [InkWell] 行。
  Widget _buildMenuItem(BuildContext context, String title, IconData icon, VoidCallback onTap, {bool isDestructive = false}) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Row(
          children: [
            Icon(icon, color: isDestructive ? TeacherTheme.riskRed : Colors.grey),
            const SizedBox(width: 12),
            Text(
              title,
              style: TextStyle(fontSize: 14, color: isDestructive ? TeacherTheme.riskRed : null),
            ),
            const Spacer(),
            const Icon(Icons.chevron_right, color: Colors.grey),
          ],
        ),
      ),
    );
  }
}

/// 舒压空间单项数据模型。
///
/// 描述舒压入口的标签、图标、主题色与点击跳转回调。
class RelaxationItem {
  /// 入口标签。
  final String label;
  /// 入口图标。
  final IconData icon;
  /// 主题色。
  final Color color;
  /// 点击回调，通常跳转到对应小游戏页面。
  final VoidCallback onTap;

  /// 构造舒压入口项。
  RelaxationItem(this.label, this.icon, this.color, this.onTap);
}

/// 知识库详情页面 Widget。
///
/// 展示知识条目的分类、正文内容、作者与发布时间。
class KnowledgeDetailScreen extends StatelessWidget {
  /// 待展示的知识条目。
  final KnowledgeBaseItem item;

  /// 构造函数。
  const KnowledgeDetailScreen({super.key, required this.item});

  /// 构建详情页面。
  ///
  /// 参数：
  /// - [context]：构建上下文。
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(item.title),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: TeacherTheme.starNightBlueLight.withOpacity(0.1),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(item.category, style: TextStyle(fontSize: 12, color: TeacherTheme.starNightBlueLight)),
            ),
            const SizedBox(height: 12),
            Text(
              item.content,
              style: const TextStyle(fontSize: 14, lineHeight: 1.8),
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey[50],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      const Text('作者：', style: TextStyle(fontSize: 12, color: Colors.grey)),
                      Text(item.author, style: const TextStyle(fontSize: 12)),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Text('发布时间：', style: TextStyle(fontSize: 12, color: Colors.grey)),
                      Text(DateFormat('yyyy-MM-dd').format(item.createdAt), style: const TextStyle(fontSize: 12)),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class BubbleWrapGame extends StatefulWidget {
  const BubbleWrapGame({super.key});

  @override
  State<BubbleWrapGame> createState() => _BubbleWrapGameState();
}

class _BubbleWrapGameState extends State<BubbleWrapGame> {
  List<bool> bubbles = List.generate(24, (index) => false);

  void _popBubble(int index) {
    setState(() {
      bubbles[index] = true;
    });
    if (bubbles.every((b) => b)) {
      Future.delayed(const Duration(seconds: 1), () {
        setState(() {
          bubbles = List.generate(24, (index) => false);
        });
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('捏泡泡纸')),
      body: Center(
        child: GridView.count(
          shrinkWrap: true,
          crossAxisCount: 6,
          padding: const EdgeInsets.all(20),
          crossAxisSpacing: 10,
          mainAxisSpacing: 10,
          children: bubbles.asMap().entries.map((entry) {
            return InkWell(
              onTap: () => _popBubble(entry.key),
              child: Container(
                decoration: BoxDecoration(
                  color: entry.value ? Colors.grey[200] : TeacherTheme.starNightBlueLight,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: entry.value ? [] : [
                    const BoxShadow(color: Colors.black12, blurRadius: 2, offset: Offset(2, 2)),
                  ],
                ),
                child: Center(
                  child: entry.value ? const Icon(Icons.check, color: Colors.grey) : const SizedBox(),
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }
}

/// 指尖陀螺舒压小游戏。
///
/// 通过拖动手势赋予旋转速度，并随时间衰减，模拟真实指尖陀螺。
class FidgetSpinnerGame extends StatefulWidget {
  /// 构造函数。
  const FidgetSpinnerGame({super.key});

  /// 创建状态对象。
  @override
  State<FidgetSpinnerGame> createState() => _FidgetSpinnerGameState();
}

/// 指尖陀螺游戏状态类，使用 [SingleTickerProviderStateMixin] 驱动动画。
class _FidgetSpinnerGameState extends State<FidgetSpinnerGame> with SingleTickerProviderStateMixin {
  /// 动画控制器，用于驱动持续刷新。
  late AnimationController _controller;
  /// 当前旋转角度。
  double _rotation = 0;
  /// 当前旋转速度。
  double _velocity = 0;
  /// 是否正在旋转。
  bool _isSpinning = false;

  /// 初始化动画控制器并启动循环刷新。
  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 16));
    _controller.addListener(() {
      if (_isSpinning) {
        setState(() {
          _rotation += _velocity;
          _velocity *= 0.995;
          if (_velocity.abs() < 0.001) {
            _isSpinning = false;
            _velocity = 0;
          }
        });
      }
    });
    _controller.repeat();
  }

  /// 释放动画控制器。
  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  /// 处理拖动手势更新，根据水平位移更新旋转速度。
  ///
  /// 参数：
  /// - [details]：拖动事件详情。
  void _onPanUpdate(DragUpdateDetails details) {
    setState(() {
      _velocity = details.delta.dx * 0.05;
      _isSpinning = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('指尖陀螺')),
      body: Center(
        child: GestureDetector(
          onPanUpdate: _onPanUpdate,
          child: Transform.rotate(
            angle: _rotation,
            child: Container(
              width: 200,
              height: 200,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: [TeacherTheme.starNightBlue, TeacherTheme.starNightBlueLight],
                ),
              ),
              child: Stack(
                children: [
                  Positioned(top: 0, left: 50, right: 50, child: _buildArm()),
                  Positioned(bottom: 0, left: 50, right: 50, child: _buildArm()),
                  Positioned(left: 0, top: 50, bottom: 50, child: _buildArm()),
                  Positioned(right: 0, top: 50, bottom: 50, child: _buildArm()),
                  const Center(
                    child: CircleAvatar(
                      radius: 30,
                      backgroundColor: Colors.white,
                      child: Icon(Icons.star, color: TeacherTheme.warmOrange),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildArm() {
    return Container(
      width: 100,
      height: 20,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.all(Radius.circular(10)),
      ),
      child: const Center(child: Icon(Icons.circle, color: TeacherTheme.starNightBlue)),
    );
  }
}

/// 涂色板舒压小游戏。
///
/// 提供调色板与 20×20 像素格，可点击选色（涂色逻辑为占位）。
class ColoringBoardGame extends StatefulWidget {
  /// 构造函数。
  const ColoringBoardGame({super.key});

  /// 创建状态对象。
  @override
  State<ColoringBoardGame> createState() => _ColoringBoardGameState();
}

/// 涂色板游戏状态类。
class _ColoringBoardGameState extends State<ColoringBoardGame> {
  /// 当前选定的画笔颜色。
  Color _selectedColor = TeacherTheme.starNightBlue;
  /// 可选颜色列表。
  final List<Color> colors = [
    TeacherTheme.starNightBlue,
    TeacherTheme.starNightBlueLight,
    TeacherTheme.warmOrange,
    TeacherTheme.riskRed,
    TeacherTheme.riskOrange,
    TeacherTheme.riskYellow,
    TeacherTheme.riskGreen,
    Colors.purple,
    Colors.pink,
    Colors.grey,
    Colors.black,
    Colors.white,
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('涂色板')),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(border: Border(bottom: BorderSide(color: Colors.grey[200]!))),
            child: Wrap(
              spacing: 8,
              children: colors.map((color) {
                return InkWell(
                  onTap: () => setState(() => _selectedColor = color),
                  child: Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: color,
                      borderRadius: BorderRadius.circular(8),
                      border: _selectedColor == color ? Border.all(color: Colors.black, width: 2) : null,
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
          Expanded(
            child: GridView.count(
              crossAxisCount: 20,
              childAspectRatio: 1,
              children: List.generate(400, (index) {
                return InkWell(
                  onTap: () {},
                  child: Container(
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey[100]!),
                    ),
                  ),
                );
              }),
            ),
          ),
        ],
      ),
    );
  }
}

class WhiteNoiseGenerator extends StatefulWidget {
  const WhiteNoiseGenerator({super.key});

  @override
  State<WhiteNoiseGenerator> createState() => _WhiteNoiseGeneratorState();
}

class _WhiteNoiseGeneratorState extends State<WhiteNoiseGenerator> {
  bool _isPlaying = false;
  final List<NoiseSource> noiseSources = [
    NoiseSource('雨声', Icons.cloud_rain, Colors.blue),
    NoiseSource('海浪', Icons.waves, Colors.cyan),
    NoiseSource('篝火', Icons.flame, Colors.orange),
    NoiseSource('风铃', Icons.music_note, Colors.purple),
    NoiseSource('白噪音', Icons.graphic_eq, Colors.grey),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('白噪音生成器')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Expanded(
              child: GridView.count(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                children: noiseSources.map((source) => _buildNoiseCard(source)).toList(),
              ),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () => setState(() => _isPlaying = !_isPlaying),
              style: ElevatedButton.styleFrom(minimumSize: const Size(double.infinity, 50)),
              child: Text(_isPlaying ? '停止播放' : '开始播放'),
            ),
          ],
        ),
      ),
    );
  }

  /// 构建单个噪音源卡片。
  ///
  /// 参数：
  /// - [source]：噪音源数据。
  ///
  /// 返回：含图标、名称与音量滑块的 [Card]。
  Widget _buildNoiseCard(NoiseSource source) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(source.icon, color: source.color, size: 32),
            const SizedBox(height: 8),
            Text(source.name, style: TextStyle(fontSize: 14, color: source.color)),
            const SizedBox(height: 8),
            Slider(
              value: 0.5,
              onChanged: (value) {},
              activeColor: source.color,
            ),
          ],
        ),
      ),
    );
  }
}

class NoiseSource {
  final String name;
  final IconData icon;
  final Color color;

  NoiseSource(this.name, this.icon, this.color);
}

class StarBreathingGame extends StatefulWidget {
  const StarBreathingGame({super.key});

  @override
  State<StarBreathingGame> createState() => _StarBreathingGameState();
}

class _StarBreathingGameState extends State<StarBreathingGame> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;
  String _phase = '吸气';
  int _currentSecond = 0;
  int _totalSeconds = 0;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(seconds: 4));
    _animation = Tween<double>(begin: 0.5, end: 1.0).animate(_controller);
    _startBreathingCycle();
  }

  /// 启动呼吸循环：吸气 4s -> 屏息 3s -> 呼气 4s，循环往复。
  void _startBreathingCycle() {
    _controller.reset();
    _controller.forward();
    _phase = '吸气';
    _currentSecond = 0;
    
    Future.doWhile(() async {
      await Future.delayed(const Duration(seconds: 1));
      setState(() => _currentSecond++);
      
      if (_currentSecond == 4) {
        _controller.reverse();
        _phase = '屏息';
      } else if (_currentSecond == 7) {
        _phase = '呼气';
      } else if (_currentSecond == 11) {
        _controller.forward();
        _phase = '吸气';
        _currentSecond = 0;
      }
      
      setState(() {
        _totalSeconds++;
      });
      
      return true;
    });
  }

  /// 释放动画控制器。
  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  /// 构建星空呼吸页面，含缩放星球、阶段文案与计时。
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('星空呼吸')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            AnimatedBuilder(
              animation: _animation,
              builder: (context, child) {
                return Transform.scale(
                  scale: _animation.value,
                  child: Container(
                    width: 200,
                    height: 200,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        colors: [TeacherTheme.starNightBlue, TeacherTheme.starNightBlueLight],
                      ),
                    ),
                    child: const Center(
                      child: Icon(Icons.star, color: Colors.white, size: 60),
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 30),
            Text(
              _phase,
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 10),
            Text(
              '${_currentSecond}s',
              style: const TextStyle(fontSize: 18, color: Colors.grey),
            ),
            const SizedBox(height: 30),
            Text(
              '总时长：${_totalSeconds}s',
              style: const TextStyle(fontSize: 14, color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }
}

/// 自助求助发起页面 Widget。
///
/// 继承自 [ConsumerStatefulWidget]，提供困扰描述、支持类型与紧急程度的表单，
/// 提交后提示并将匹配心理老师。
class SelfHelpRequestScreen extends ConsumerStatefulWidget {
  /// 构造函数。
  const SelfHelpRequestScreen({super.key});

  /// 创建状态对象。
  @override
  ConsumerState<SelfHelpRequestScreen> createState() => _SelfHelpRequestScreenState();
}

/// 自助求助表单状态类。
class _SelfHelpRequestScreenState extends ConsumerState<SelfHelpRequestScreen> {
  /// 表单全局 Key。
  final _formKey = GlobalKey<FormState>();
  /// 困扰描述文本。
  String _description = '';
  /// 期望的支持类型。
  String _supportType = '倾听';
  /// 紧急程度。
  String _urgency = '一般';

  /// 可选支持类型。
  final supportTypes = ['倾听', '建议', '正式咨询', '紧急支持'];
  /// 可选紧急程度。
  final urgencyLevels = ['紧急', '较紧急', '一般'];

  /// 提交求助请求，校验通过后提示并返回上一页。
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
      appBar: AppBar(title: const Text('我要找人聊聊')),
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