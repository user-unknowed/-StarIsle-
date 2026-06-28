import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../providers/teacher_providers.dart';
import '../models/teacher_models.dart';
import '../theme/teacher_theme.dart';

class StudentsScreen extends ConsumerWidget {
  const StudentsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final students = ref.watch(studentsProvider);
    final teacherRole = ref.watch(currentRoleProvider);

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('学生'),
          bottom: const TabBar(
            tabs: [
              Tab(text: '学生列表'),
              Tab(text: '上报记录'),
            ],
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.search),
              onPressed: () {},
            ),
            IconButton(
              icon: const Icon(Icons.filter_list),
              onPressed: () {},
            ),
          ],
        ),
        body: const TabBarView(
          children: [
            StudentListView(),
            ReportRecordsView(),
          ],
        ),
        floatingActionButton: teacherRole != TeacherRole.counselor
            ? FloatingActionButton(
                onPressed: () {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const SymptomReportScreen()));
                },
                child: const Icon(Icons.add),
              )
            : null,
      ),
    );
  }
}

class StudentListView extends ConsumerWidget {
  const StudentListView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final students = ref.watch(studentsProvider);

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: students.length,
      itemBuilder: (context, index) {
        final student = students[index];
        return _buildStudentCard(context, student);
      },
    );
  }

  Widget _buildStudentCard(BuildContext context, Student student) {
    return InkWell(
      onTap: () {
        Navigator.push(context, MaterialPageRoute(builder: (_) => StudentDetailScreen(student: student)));
      },
      borderRadius: BorderRadius.circular(12),
      child: Card(
        margin: const EdgeInsets.only(bottom: 12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: student.riskLevel.color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Center(
                  child: Text(
                    student.name.substring(0, 1),
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: student.riskLevel.color),
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
                        Text(
                          student.name,
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: student.riskLevel.color.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            student.riskLevel.label,
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w500, color: student.riskLevel.color),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${student.className} · 高一',
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      student.statusSummary,
                      style: const TextStyle(fontSize: 14, color: Colors.grey),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              Column(
                children: [
                  student.moodTrend != 0
                      ? Icon(
                          student.moodTrend > 0 ? Icons.trending_up : Icons.trending_down,
                          color: student.moodTrend > 0 ? TeacherTheme.riskGreen : TeacherTheme.riskRed,
                          size: 18,
                        )
                      : const SizedBox(width: 24),
                  const SizedBox(height: 8),
                  Text(
                    DateFormat('MM-dd HH:mm').format(student.lastStatusUpdate),
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

class StudentDetailScreen extends ConsumerWidget {
  final Student student;

  const StudentDetailScreen({super.key, required this.student});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final teacherRole = ref.watch(currentRoleProvider);
    final reports = ref.watch(reportsProvider).where((r) => r.studentId == student.id).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('学生详情'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            _buildHeader(context, student),
            const SizedBox(height: 20),
            if (teacherRole == TeacherRole.counselor) _buildEmotionalTrend(context),
            const SizedBox(height: 20),
            _buildRiskTimeline(context),
            const SizedBox(height: 20),
            if (teacherRole != TeacherRole.counselor) _buildMyReports(context, reports),
            if (teacherRole == TeacherRole.counselor) _buildConsultHistory(context),
          ],
        ),
      ),
      floatingActionButton: teacherRole != TeacherRole.counselor
          ? FloatingActionButton.extended(
              onPressed: () {
                Navigator.push(context, MaterialPageRoute(builder: (_) => SymptomReportScreen(studentId: student.id)));
              },
              label: const Text('上报情况'),
              icon: const Icon(Icons.send),
            )
          : null,
    );
  }

  Widget _buildHeader(BuildContext context, Student student) {
    return Container(
      decoration: BoxDecoration(
        color: student.riskLevel.color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
      ),
      padding: const EdgeInsets.all(20),
      child: Row(
        children: [
          Container(
            width: 70,
            height: 70,
            decoration: BoxDecoration(
              color: student.riskLevel.color,
              borderRadius: BorderRadius.circular(35),
            ),
            child: Center(
              child: Text(
                student.name.substring(0, 1),
                style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  student.name,
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                Text(
                  '${student.className} · 高一(${student.grade}年级)',
                  style: const TextStyle(fontSize: 14, color: Colors.grey),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: student.riskLevel.color,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        student.riskLevel.label,
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Colors.white),
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Text('风险等级', style: TextStyle(fontSize: 12, color: Colors.grey)),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmotionalTrend(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('情绪趋势', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            SizedBox(
              height: 100,
              child: Row(
                children: List.generate(7, (index) {
                  final heights = [0.6, 0.4, 0.5, 0.3, 0.5, 0.7, 0.5];
                  return Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Container(
                            height: heights[index] * 80,
                            decoration: BoxDecoration(
                              color: TeacherTheme.starNightBlueLight,
                              borderRadius: BorderRadius.circular(4),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            DateFormat('M/d').format(DateTime.now().subtract(Duration(days: 6 - index))),
                            style: const TextStyle(fontSize: 10, color: Colors.grey),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRiskTimeline(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('风险等级时间线', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            Column(
              children: [
                _buildTimelineItem(RiskLevel.green, '两周前', '状态平稳'),
                _buildTimelineItem(RiskLevel.yellow, '一周前', '开始出现情绪波动'),
                _buildTimelineItem(RiskLevel.orange, '3天前', '连续多天心情低落'),
                _buildTimelineItem(RiskLevel.red, '1天前', '检测到自伤倾向', isCurrent: true),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTimelineItem(RiskLevel level, String time, String description, {bool isCurrent = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Container(
            width: 20,
            height: 20,
            decoration: BoxDecoration(
              color: level.color,
              borderRadius: BorderRadius.circular(10),
              border: isCurrent ? Border.all(color: Colors.white, width: 3) : null,
              boxShadow: isCurrent ? [BoxShadow(color: level.color, blurRadius: 8)] : null,
            ),
          ),
          const SizedBox(width: 12),
          Container(
            width: 2,
            height: 40,
            color: Colors.grey[200],
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(time, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                const SizedBox(height: 4),
                Text(description, style: const TextStyle(fontSize: 14)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMyReports(BuildContext context, List<SymptomReport> reports) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('我的上报记录', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            if (reports.isEmpty)
              const Center(child: Text('暂无上报记录'))
            else
              Column(
                children: reports.map((report) => _buildReportItem(context, report)).toList(),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildReportItem(BuildContext context, SymptomReport report) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: report.status.color,
              borderRadius: BorderRadius.circular(4),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  DateFormat('yyyy-MM-dd HH:mm').format(report.submittedAt),
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                ),
                const SizedBox(height: 4),
                Text(
                  '症状：${report.symptoms.map((s) => _symptomLabel(s)).join(', ')}',
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
              ],
            ),
          ),
          Text(
            report.status.label,
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: report.status.color),
          ),
        ],
      ),
    );
  }

  Widget _buildConsultHistory(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('咨询与介入历史', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            Column(
              children: [
                _buildConsultItem('2026-06-28', '初步面谈', '了解基本情况，建立信任关系'),
                _buildConsultItem('2026-06-25', '介入干预', '引导情绪表达，提供支持'),
                _buildConsultItem('2026-06-22', '首次接触', '电话沟通，评估风险'),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildConsultItem(String date, String type, String description) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(date, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: TeacherTheme.starNightBlueLight.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(type, style: TextStyle(fontSize: 10, color: TeacherTheme.starNightBlueLight)),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(description, style: const TextStyle(fontSize: 12, color: Colors.grey)),
        ],
      ),
    );
  }

  String _symptomLabel(SymptomType type) {
    switch (type) {
      case SymptomType.emotionalLow: return '情绪低落';
      case SymptomType.irritable: return '易怒';
      case SymptomType.socialWithdrawal: return '社交退缩';
      case SymptomType.academicDrop: return '学业骤降';
      case SymptomType.sleepAbnormal: return '睡眠异常';
      case SymptomType.selfHarmTraces: return '自伤痕迹';
      case SymptomType.other: return '其他';
    }
  }
}

class ReportRecordsView extends ConsumerWidget {
  const ReportRecordsView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reports = ref.watch(reportsProvider);
    final teacher = ref.watch(currentTeacherProvider);
    final teacherRole = teacher.role;

    final myReports = teacherRole == TeacherRole.counselor
        ? reports
        : reports.where((r) => r.reporterId == teacher.id).toList();

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: myReports.length,
      itemBuilder: (context, index) {
        final report = myReports[index];
        return _buildReportCard(context, report, teacherRole);
      },
    );
  }

  Widget _buildReportCard(BuildContext context, SymptomReport report, TeacherRole role) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Row(
              children: [
                Text(
                  report.studentName,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                ),
                const SizedBox(width: 8),
                Text(report.className, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: report.riskLevel.color.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    report.riskLevel.label,
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.w500, color: report.riskLevel.color),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Text(report.reporterName, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                const SizedBox(width: 12),
                Text(DateFormat('yyyy-MM-dd HH:mm').format(report.submittedAt), style: const TextStyle(fontSize: 12, color: Colors.grey)),
                const Spacer(),
                Text(
                  report.status.label,
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: report.status.color),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              report.description,
              style: const TextStyle(fontSize: 14),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            if (role == TeacherRole.counselor && report.status == ReportStatus.processing) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {},
                      child: const Text('标记已查看'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {},
                      child: const Text('处理报告'),
                    ),
                  ),
                ],
              ),
            ],
            if (role != TeacherRole.counselor && report.status == ReportStatus.processed) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: TeacherTheme.riskGreen.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('处理回执', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                    const SizedBox(height: 4),
                    Text(report.processingOpinion ?? '已接收并跟进', style: const TextStyle(fontSize: 12)),
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

class SymptomReportScreen extends ConsumerStatefulWidget {
  final String? studentId;

  const SymptomReportScreen({super.key, this.studentId});

  @override
  ConsumerState<SymptomReportScreen> createState() => _SymptomReportScreenState();
}

class _SymptomReportScreenState extends ConsumerState<SymptomReportScreen> {
  final _formKey = GlobalKey<FormState>();
  
  String? _selectedStudent;
  List<SymptomType> _selectedSymptoms = [];
  List<EmotionalExpression> _selectedEmotions = [];
  DurationType? _selectedDuration;
  SeverityLevel? _selectedSeverity;
  String _description = '';
  bool _hasCommunicated = false;
  bool _hasContactedParent = false;

  final symptomOptions = [
    (SymptomType.emotionalLow, '情绪低落'),
    (SymptomType.irritable, '易怒'),
    (SymptomType.socialWithdrawal, '社交退缩'),
    (SymptomType.academicDrop, '学业骤降'),
    (SymptomType.sleepAbnormal, '睡眠异常'),
    (SymptomType.selfHarmTraces, '自伤痕迹'),
    (SymptomType.other, '其他'),
  ];

  final emotionOptions = [
    (EmotionalExpression.crying, '哭泣'),
    (EmotionalExpression.numb, '麻木'),
    (EmotionalExpression.anxious, '焦虑'),
    (EmotionalExpression.irritable, '暴躁'),
    (EmotionalExpression.abnormallyCalm, '异常平静'),
  ];

  final durationOptions = [
    (DurationType.lessThan1Week, '<1周'),
    (DurationType.oneToTwoWeeks, '1-2周'),
    (DurationType.twoToFourWeeks, '2-4周'),
    (DurationType.moreThan1Month, '>1月'),
  ];

  final severityOptions = [
    (SeverityLevel.mildAttention, '轻微关注', RiskLevel.green),
    (SeverityLevel.needAttention, '需要关注', RiskLevel.yellow),
    (SeverityLevel.somewhatUrgent, '较为紧急', RiskLevel.orange),
    (SeverityLevel.urgent, '紧急', RiskLevel.red),
  ];

  void _submitReport() {
    if (_formKey.currentState!.validate()) {
      _formKey.currentState!.save();
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('报告提交成功')),
      );
      
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final students = ref.watch(studentsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('症状反馈表'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              _buildStudentSelect(context, students),
              const SizedBox(height: 20),
              _buildMultiSelectSection('行为表现', symptomOptions, _selectedSymptoms, (type) {
                setState(() {
                  if (_selectedSymptoms.contains(type)) {
                    _selectedSymptoms.remove(type);
                  } else {
                    _selectedSymptoms.add(type);
                  }
                });
              }),
              const SizedBox(height: 20),
              _buildMultiSelectSection('情绪表现', emotionOptions, _selectedEmotions, (type) {
                setState(() {
                  if (_selectedEmotions.contains(type)) {
                    _selectedEmotions.remove(type);
                  } else {
                    _selectedEmotions.add(type);
                  }
                });
              }),
              const SizedBox(height: 20),
              _buildSingleSelectSection('持续时间', durationOptions, _selectedDuration, (type) {
                setState(() => _selectedDuration = type);
              }),
              const SizedBox(height: 20),
              _buildSeveritySection(),
              const SizedBox(height: 20),
              _buildDescriptionSection(),
              const SizedBox(height: 20),
              _buildCheckboxSection(),
              const SizedBox(height: 30),
              ElevatedButton(
                onPressed: _submitReport,
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 50),
                ),
                child: const Text('提交报告'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStudentSelect(BuildContext context, List<Student> students) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('选择学生', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          value: _selectedStudent,
          decoration: const InputDecoration(
            border: OutlineInputBorder(),
            hintText: '请选择学生',
          ),
          items: students.map((s) => DropdownMenuItem(value: s.id, child: Text(s.name))).toList(),
          onChanged: (value) => setState(() => _selectedStudent = value),
          validator: (value) => value == null ? '请选择学生' : null,
        ),
      ],
    );
  }

  Widget _buildMultiSelectSection<T>(String title, List<(T, String)> options, List<T> selected, Function(T) onTap) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: options.map((opt) {
            final isSelected = selected.contains(opt.$1);
            return ElevatedButton(
              onPressed: () => onTap(opt.$1),
              style: ElevatedButton.styleFrom(
                backgroundColor: isSelected ? TeacherTheme.starNightBlue : Colors.grey[100],
                foregroundColor: isSelected ? Colors.white : Colors.black,
                elevation: 0,
              ),
              child: Text(opt.$2),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildSingleSelectSection<T>(String title, List<(T, String)> options, T? selected, Function(T) onTap) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: options.map((opt) {
            final isSelected = selected == opt.$1;
            return ElevatedButton(
              onPressed: () => onTap(opt.$1),
              style: ElevatedButton.styleFrom(
                backgroundColor: isSelected ? TeacherTheme.starNightBlue : Colors.grey[100],
                foregroundColor: isSelected ? Colors.white : Colors.black,
                elevation: 0,
              ),
              child: Text(opt.$2),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildSeveritySection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('严重程度', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: severityOptions.map((opt) {
            final isSelected = _selectedSeverity == opt.$1;
            return ElevatedButton(
              onPressed: () => setState(() => _selectedSeverity = opt.$1),
              style: ElevatedButton.styleFrom(
                backgroundColor: isSelected ? opt.$3.color : Colors.grey[100],
                foregroundColor: isSelected ? Colors.white : Colors.black,
                elevation: 0,
              ),
              child: Text(opt.$2),
            );
          }).toList(),
        ),
        if (_selectedSeverity != null && (_selectedSeverity == SeverityLevel.somewhatUrgent || _selectedSeverity == SeverityLevel.urgent))
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: TeacherTheme.riskRed.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: TeacherTheme.riskRed),
              ),
              child: const Text(
                '建议立即联系心理老师进行专业介入',
                style: TextStyle(color: Color(0xFFEF5350), fontSize: 14),
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildDescriptionSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('具体描述', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        TextFormField(
          maxLines: 4,
          decoration: const InputDecoration(
            border: OutlineInputBorder(),
            hintText: '请描述观察到的具体情况（选填但强烈建议）',
          ),
          onSaved: (value) => _description = value ?? '',
        ),
      ],
    );
  }

  Widget _buildCheckboxSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CheckboxListTile(
          title: const Text('是否已与学生沟通'),
          value: _hasCommunicated,
          onChanged: (value) => setState(() => _hasCommunicated = value ?? false),
        ),
        CheckboxListTile(
          title: const Text('是否已联系家长'),
          value: _hasContactedParent,
          onChanged: (value) => setState(() => _hasContactedParent = value ?? false),
        ),
      ],
    );
  }
}