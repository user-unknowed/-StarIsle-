import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../providers/teacher_providers.dart';
import '../models/teacher_models.dart';
import '../theme/teacher_theme.dart';
import 'students_screen.dart';
import 'chat_screen.dart';

class WorkbenchScreen extends ConsumerWidget {
  const WorkbenchScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final teacher = ref.watch(currentTeacherProvider);
    final alerts = ref.watch(alertsProvider);
    final todos = ref.watch(todosProvider);
    final reports = ref.watch(reportsProvider);
    final emotionalOverview = ref.watch(emotionalOverviewProvider);

    final highRiskAlerts = alerts.where((a) => a.riskLevel == RiskLevel.red || a.riskLevel == RiskLevel.orange).toList();
    final pendingTodos = todos.where((t) => !t.isCompleted).toList();
    
    final teacherRole = teacher.role;
    final reportCount = reports.where((r) => r.reporterId == teacher.id).length;
    final processedCount = reports.where((r) => r.reporterId == teacher.id && r.status == ReportStatus.processed).length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('工作台'),
        actions: [
          IconButton(
            icon: const Icon(Icons.bell),
            onPressed: () {},
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildIdentityCard(context, teacher),
            const SizedBox(height: 20),
            _buildOverviewCard(context, teacherRole, reportCount, processedCount, highRiskAlerts.length, pendingTodos.length),
            const SizedBox(height: 20),
            if (highRiskAlerts.isNotEmpty) _buildAlertsSection(context, highRiskAlerts, ref),
            const SizedBox(height: 20),
            _buildQuickActions(context, teacherRole),
            const SizedBox(height: 20),
            _buildTodoList(context, pendingTodos, ref),
            const SizedBox(height: 20),
            _buildEmotionalOverview(context, emotionalOverview),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildIdentityCard(BuildContext context, Teacher teacher) {
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
        ],
      ),
    );
  }

  Widget _buildOverviewCard(BuildContext context, TeacherRole role, int reportCount, int processedCount, int alertCount, int todoCount) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  '今日概览',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                ),
                Text(
                  DateFormat('yyyy-MM-dd').format(DateTime.now()),
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
              ],
            ),
            const SizedBox(height: 16),
            GridView.count(
              shrinkWrap: true,
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              children: [
                _buildStatCard(
                  context,
                  role == TeacherRole.counselor ? '待处理报告' : '本月上报',
                  role == TeacherRole.counselor ? '${processedCount} 条' : '${reportCount} 条',
                  Icons.file_text,
                  TeacherTheme.starNightBlue,
                ),
                _buildStatCard(
                  context,
                  '高风险告警',
                  '${alertCount} 条',
                  Icons.warning,
                  alertCount > 0 ? TeacherTheme.riskRed : TeacherTheme.riskYellow,
                ),
                _buildStatCard(
                  context,
                  '今日待办',
                  '${todoCount} 项',
                  Icons.check_circle,
                  TeacherTheme.warmOrange,
                ),
                _buildStatCard(
                  context,
                  role == TeacherRole.counselor ? '已处理' : '已接收回执',
                  '${processedCount} 条',
                  Icons.done_all,
                  TeacherTheme.riskGreen,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(BuildContext context, String title, String value, IconData icon, Color color) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        children: [
          Icon(icon, color: color, size: 28),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: const TextStyle(fontSize: 12, color: Colors.grey),
          ),
        ],
      ),
    );
  }

  Widget _buildAlertsSection(BuildContext context, List<Alert> alerts, WidgetRef ref) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '高风险告警',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 12),
        ListView.builder(
          shrinkWrap: true,
          itemCount: alerts.length,
          itemBuilder: (context, index) {
            final alert = alerts[index];
            return _buildAlertCard(context, alert, ref);
          },
        ),
      ],
    );
  }

  Widget _buildAlertCard(BuildContext context, Alert alert, WidgetRef ref) {
    return Card(
      color: alert.riskLevel == RiskLevel.red ? const Color(0xFFFFEBEE) : const Color(0xFFFFF8E1),
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: alert.riskLevel.color,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Center(
                child: Icon(
                  alert.riskLevel == RiskLevel.red ? Icons.error : Icons.warning,
                  color: Colors.white,
                  size: 20,
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
                        alert.studentName,
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        alert.className,
                        style: const TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    alert.triggerReason,
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    DateFormat('HH:mm').format(alert.triggeredAt),
                    style: const TextStyle(fontSize: 10, color: Colors.grey),
                  ),
                ],
              ),
            ),
            Text(
              alert.riskLevel.label,
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: alert.riskLevel.color),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActions(BuildContext context, TeacherRole role) {
    final actions = [
      QuickAction('上报学生情况', Icons.send, TeacherTheme.starNightBlue, () {
        Navigator.push(context, MaterialPageRoute(builder: (_) => const SymptomReportScreen()));
      }),
      QuickAction('我要找人聊聊', Icons.chat, TeacherTheme.warmOrange, () {}),
      if (role == TeacherRole.counselor)
        QuickAction('观察对话', Icons.visibility, TeacherTheme.riskGreen, () {
          Navigator.push(context, MaterialPageRoute(builder: (_) => const ChatScreen()));
        }),
      QuickAction('舒压一下', Icons.waves, TeacherTheme.starNightBlueLight, () {}),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '快捷操作',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 12),
        GridView.count(
          shrinkWrap: true,
          crossAxisCount: 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          children: actions.map((action) => _buildQuickActionCard(context, action)).toList(),
        ),
      ],
    );
  }

  Widget _buildQuickActionCard(BuildContext context, QuickAction action) {
    return InkWell(
      onTap: action.onTap,
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
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(action.icon, color: action.color, size: 28),
            const SizedBox(height: 8),
            Text(
              action.label,
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: action.color),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTodoList(BuildContext context, List<TodoItem> todos, WidgetRef ref) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              '待办事项',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
            ),
            Text(
              '${todos.length} 项',
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
        const SizedBox(height: 12),
        ListView.builder(
          shrinkWrap: true,
          itemCount: todos.length,
          itemBuilder: (context, index) {
            final todo = todos[index];
            return _buildTodoItem(context, todo, ref);
          },
        ),
      ],
    );
  }

  Widget _buildTodoItem(BuildContext context, TodoItem todo, WidgetRef ref) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Checkbox(
              value: todo.isCompleted,
              onChanged: (value) {
                ref.read(todosProvider.notifier).toggleComplete(todo.id);
              },
              activeColor: TeacherTheme.starNightBlue,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    todo.title,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      decoration: todo.isCompleted ? TextDecoration.lineThrough : null,
                      color: todo.isCompleted ? Colors.grey : null,
                    ),
                  ),
                  if (todo.description != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      todo.description!,
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                  ],
                ],
              ),
            ),
            Text(
              _formatDeadline(todo.deadline),
              style: const TextStyle(fontSize: 10, color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDeadline(DateTime deadline) {
    final now = DateTime.now();
    final diff = deadline.difference(now);
    
    if (diff.inHours < 1) {
      return '即将到期';
    } else if (diff.inHours < 24) {
      return '${diff.inHours}小时后';
    } else {
      return '${diff.inDays}天后';
    }
  }

  Widget _buildEmotionalOverview(BuildContext context, EmotionalOverview overview) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  '班级情绪概览',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
                ),
                Text(
                  DateFormat('HH:mm').format(overview.updatedAt),
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Container(
                  width: 60,
                  height: 60,
                  decoration: BoxDecoration(
                    color: TeacherTheme.starNightBlue,
                    borderRadius: BorderRadius.circular(30),
                  ),
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          overview.averageMood.toStringAsFixed(1),
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                        const Text('平均心情', style: TextStyle(fontSize: 10, color: Colors.white70)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Text('总人数：', style: TextStyle(fontSize: 12, color: Colors.grey)),
                          Text('${overview.totalStudents}人', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Text('高风险：', style: TextStyle(fontSize: 12, color: Colors.grey)),
                          Text('${overview.highRiskCount}人', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: TeacherTheme.riskRed)),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _buildMoodDistribution(overview.moodDistribution),
          ],
        ),
      ),
    );
  }

  Widget _buildMoodDistribution(Map<String, int> distribution) {
    final total = distribution.values.reduce((a, b) => a + b);
    final moods = ['很糟', '不太好', '一般', '不错', '很棒'];
    
    return Column(
      children: moods.map((mood) {
        final count = distribution[mood] ?? 0;
        final percentage = total > 0 ? (count / total) * 100 : 0;
        
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            children: [
              SizedBox(
                width: 36,
                child: Text(mood, style: const TextStyle(fontSize: 12)),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: LinearProgressIndicator(
                  value: percentage / 100,
                  backgroundColor: Colors.grey[200],
                  valueColor: AlwaysStoppedAnimation(_getMoodColor(mood)),
                  borderRadius: BorderRadius.circular(4),
                  minHeight: 8,
                ),
              ),
              const SizedBox(width: 8),
              Text('${count}人', style: const TextStyle(fontSize: 12, color: Colors.grey)),
            ],
          ),
        );
      }).toList(),
    );
  }

  Color _getMoodColor(String mood) {
    switch (mood) {
      case '很糟': return TeacherTheme.riskRed;
      case '不太好': return TeacherTheme.riskOrange;
      case '一般': return TeacherTheme.riskYellow;
      case '不错': return TeacherTheme.starNightBlueLight;
      case '很棒': return TeacherTheme.riskGreen;
      default: return Colors.grey;
    }
  }
}

class QuickAction {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  QuickAction(this.label, this.icon, this.color, this.onTap);
}