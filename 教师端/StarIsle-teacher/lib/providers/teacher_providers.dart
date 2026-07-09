import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/teacher_models.dart';

final currentTeacherProvider = StateProvider<Teacher>((ref) => Teacher(
  id: 't1',
  name: '张明',
  role: TeacherRole.homeroomTeacher,
  school: '星光中学',
  className: '高一(3)班',
  studentCount: 45,
));

final currentRoleProvider = Provider<TeacherRole>((ref) {
  return ref.watch(currentTeacherProvider).role;
});

final alertsProvider = StateNotifierProvider<AlertsNotifier, List<Alert>>((ref) {
  return AlertsNotifier([
    Alert(
      id: 'a1',
      studentId: 's1',
      studentName: '李小雨',
      className: '高一(3)班',
      riskLevel: RiskLevel.red,
      triggerReason: 'AI对话中检测到自伤倾向',
      triggeredAt: DateTime.now().subtract(const Duration(hours: 1)),
    ),
    Alert(
      id: 'a2',
      studentId: 's2',
      studentName: '王浩宇',
      className: '高一(3)班',
      riskLevel: RiskLevel.orange,
      triggerReason: '连续7天心情低落',
      triggeredAt: DateTime.now().subtract(const Duration(hours: 3)),
    ),
    Alert(
      id: 'a3',
      studentId: 's3',
      studentName: '陈思琪',
      className: '高一(2)班',
      riskLevel: RiskLevel.orange,
      triggerReason: '测评显示中度焦虑',
      triggeredAt: DateTime.now().subtract(const Duration(hours: 6)),
    ),
  ]);
});

class AlertsNotifier extends StateNotifier<List<Alert>> {
  AlertsNotifier(List<Alert> initial) : super(initial);

  void markAsRead(String alertId) {
    state = state.map((a) => a.id == alertId ? a.copyWith(isRead: true) : a).toList();
  }

  void dismiss(String alertId) {
    state = state.where((a) => a.id != alertId).toList();
  }
}

final todosProvider = StateNotifierProvider<TodosNotifier, List<TodoItem>>((ref) {
  return TodosNotifier([
    TodoItem(
      id: 'todo1',
      title: '处理学生症状反馈报告',
      description: '李小雨 - 情绪低落、睡眠异常',
      deadline: DateTime.now().add(const Duration(hours: 2)),
      type: TodoType.reportProcessing,
      relatedId: 'r1',
    ),
    TodoItem(
      id: 'todo2',
      title: '跟进介入记录',
      description: '王浩宇 - 需要了解本周情况',
      deadline: DateTime.now().add(const Duration(hours: 24)),
      type: TodoType.interventionFollowup,
      relatedId: 'i1',
    ),
    TodoItem(
      id: 'todo3',
      title: '查看处理回执',
      description: '陈思琪 - 心理老师已处理',
      deadline: DateTime.now().add(const Duration(hours: 12)),
      type: TodoType.receiptReview,
      relatedId: 'r2',
    ),
    TodoItem(
      id: 'todo4',
      title: '观察学生对话',
      description: '张婷婷 - 橙色风险',
      deadline: DateTime.now().add(const Duration(hours: 8)),
      type: TodoType.observationTask,
      relatedId: 's4',
    ),
  ]);
});

class TodosNotifier extends StateNotifier<List<TodoItem>> {
  TodosNotifier(List<TodoItem> initial) : super(initial);

  void toggleComplete(String todoId) {
    state = state.map((t) => t.id == todoId ? t.copyWith(isCompleted: !t.isCompleted) : t).toList();
  }

  void remove(String todoId) {
    state = state.where((t) => t.id != todoId).toList();
  }
}

final studentsProvider = StateNotifierProvider<StudentsNotifier, List<Student>>((ref) {
  return StudentsNotifier([
    Student(
      id: 's1',
      name: '李小雨',
      className: '高一(3)班',
      grade: 10,
      riskLevel: RiskLevel.red,
      lastStatusUpdate: DateTime.now().subtract(const Duration(hours: 1)),
      statusSummary: '情绪低落，有自伤倾向',
      moodTrend: -2,
    ),
    Student(
      id: 's2',
      name: '王浩宇',
      className: '高一(3)班',
      grade: 10,
      riskLevel: RiskLevel.orange,
      lastStatusUpdate: DateTime.now().subtract(const Duration(hours: 3)),
      statusSummary: '连续7天心情低落，睡眠不足',
      moodTrend: -1,
    ),
    Student(
      id: 's3',
      name: '张婷婷',
      className: '高一(3)班',
      grade: 10,
      riskLevel: RiskLevel.orange,
      lastStatusUpdate: DateTime.now().subtract(const Duration(hours: 5)),
      statusSummary: '焦虑，考试压力大',
      moodTrend: 0,
    ),
    Student(
      id: 's4',
      name: '刘畅',
      className: '高一(3)班',
      grade: 10,
      riskLevel: RiskLevel.yellow,
      lastStatusUpdate: DateTime.now().subtract(const Duration(hours: 8)),
      statusSummary: '最近比较沉默，社交活动减少',
      moodTrend: -1,
    ),
    Student(
      id: 's5',
      name: '孙悦',
      className: '高一(3)班',
      grade: 10,
      riskLevel: RiskLevel.green,
      lastStatusUpdate: DateTime.now().subtract(const Duration(hours: 12)),
      statusSummary: '状态平稳',
      moodTrend: 1,
    ),
    Student(
      id: 's6',
      name: '赵文博',
      className: '高一(3)班',
      grade: 10,
      riskLevel: RiskLevel.green,
      lastStatusUpdate: DateTime.now().subtract(const Duration(days: 1)),
      statusSummary: '状态良好',
      moodTrend: 2,
    ),
  ]);
});

class StudentsNotifier extends StateNotifier<List<Student>> {
  StudentsNotifier(List<Student> initial) : super(initial);
}

final reportsProvider = StateNotifierProvider<ReportsNotifier, List<SymptomReport>>((ref) {
  return ReportsNotifier([
    SymptomReport(
      id: 'r1',
      studentId: 's1',
      studentName: '李小雨',
      className: '高一(3)班',
      reporterId: 't1',
      reporterName: '张明',
      symptoms: [SymptomType.emotionalLow, SymptomType.sleepAbnormal],
      emotions: [EmotionalExpression.crying, EmotionalExpression.numb],
      duration: DurationType.oneToTwoWeeks,
      severity: SeverityLevel.urgent,
      description: '近两周情绪低落，上课注意力不集中，晚上失眠，有时会偷偷哭泣',
      hasCommunicated: true,
      hasContactedParent: false,
      submittedAt: DateTime.now().subtract(const Duration(hours: 2)),
      status: ReportStatus.received,
      assigneeId: 't2',
      assigneeName: '王丽',
    ),
    SymptomReport(
      id: 'r2',
      studentId: 's2',
      studentName: '王浩宇',
      className: '高一(3)班',
      reporterId: 't1',
      reporterName: '张明',
      symptoms: [SymptomType.emotionalLow, SymptomType.academicDrop],
      emotions: [EmotionalExpression.numb],
      duration: DurationType.twoToFourWeeks,
      severity: SeverityLevel.somewhatUrgent,
      description: '连续两周成绩下滑明显，不愿与人交流',
      hasCommunicated: true,
      hasContactedParent: true,
      submittedAt: DateTime.now().subtract(const Duration(days: 1)),
      status: ReportStatus.processed,
      assigneeId: 't2',
      assigneeName: '王丽',
      processingOpinion: '已介入跟进，建议家长多关注',
      processedAt: DateTime.now().subtract(const Duration(hours: 6)),
    ),
    SymptomReport(
      id: 'r3',
      studentId: 's3',
      studentName: '张婷婷',
      className: '高一(3)班',
      reporterId: 't1',
      reporterName: '张明',
      symptoms: [SymptomType.anxious, SymptomType.academicDrop],
      emotions: [EmotionalExpression.anxious],
      duration: DurationType.oneToTwoWeeks,
      severity: SeverityLevel.needAttention,
      description: '期中考试临近，压力较大，担心考不好',
      hasCommunicated: false,
      hasContactedParent: false,
      submittedAt: DateTime.now().subtract(const Duration(hours: 8)),
      status: ReportStatus.processing,
      assigneeId: 't2',
      assigneeName: '王丽',
    ),
  ]);
});

class ReportsNotifier extends StateNotifier<List<SymptomReport>> {
  ReportsNotifier(List<SymptomReport> initial) : super(initial);

  void addReport(SymptomReport report) {
    state = [...state, report];
  }

  void updateStatus(String reportId, ReportStatus status) {
    state = state.map((r) => r.id == reportId ? r.copyWith(status: status) : r).toList();
  }
}

final chatSessionsProvider = StateNotifierProvider<ChatSessionsNotifier, List<StudentChatSession>>((ref) {
  return ChatSessionsNotifier([
    StudentChatSession(
      id: 'cs1',
      studentId: 's1',
      studentName: '李小雨',
      className: '高一(3)班',
      riskLevel: RiskLevel.red,
      lastActive: DateTime.now().subtract(const Duration(hours: 1)),
      isIntervening: false,
      messages: [
        ChatMessage(
          id: 'm1',
          senderId: 'ai',
          senderName: '小星',
          isTeacher: false,
          content: '你好呀，我是小星，今天过得怎么样？',
          sentAt: DateTime.now().subtract(const Duration(hours: 2)),
        ),
        ChatMessage(
          id: 'm2',
          senderId: 's1',
          senderName: '李小雨',
          isTeacher: false,
          content: '我觉得活着没什么意思...',
          sentAt: DateTime.now().subtract(const Duration(hours: 2)),
          riskLevel: RiskLevel.red,
        ),
        ChatMessage(
          id: 'm3',
          senderId: 'ai',
          senderName: '小星',
          isTeacher: false,
          content: '听到你这么说，我很担心你。能告诉我发生了什么吗？',
          sentAt: DateTime.now().subtract(const Duration(hours: 2)),
          strategyHint: '共情回应',
        ),
        ChatMessage(
          id: 'm4',
          senderId: 's1',
          senderName: '李小雨',
          isTeacher: false,
          content: '学习压力太大了，爸妈也不理解我...',
          sentAt: DateTime.now().subtract(const Duration(hours: 1)),
          riskLevel: RiskLevel.orange,
        ),
      ],
    ),
    StudentChatSession(
      id: 'cs2',
      studentId: 's2',
      studentName: '王浩宇',
      className: '高一(3)班',
      riskLevel: RiskLevel.orange,
      lastActive: DateTime.now().subtract(const Duration(hours: 3)),
      isIntervening: true,
      messages: [
        ChatMessage(
          id: 'm5',
          senderId: 'ai',
          senderName: '小星',
          isTeacher: false,
          content: '嗨！最近感觉怎么样？',
          sentAt: DateTime.now().subtract(const Duration(hours: 4)),
        ),
        ChatMessage(
          id: 'm6',
          senderId: 's2',
          senderName: '王浩宇',
          isTeacher: false,
          content: '不太好，每天都很累',
          sentAt: DateTime.now().subtract(const Duration(hours: 4)),
          riskLevel: RiskLevel.yellow,
        ),
        ChatMessage(
          id: 'm7',
          senderId: 't2',
          senderName: '王丽老师',
          isTeacher: true,
          content: '王浩宇同学你好，我是学校的心理老师王丽。小星和我说了你最近的情况，我很愿意听你说说。',
          sentAt: DateTime.now().subtract(const Duration(hours: 3)),
        ),
        ChatMessage(
          id: 'm8',
          senderId: 's2',
          senderName: '王浩宇',
          isTeacher: false,
          content: '老师好...',
          sentAt: DateTime.now().subtract(const Duration(hours: 3)),
        ),
      ],
    ),
  ]);
});

class ChatSessionsNotifier extends StateNotifier<List<StudentChatSession>> {
  ChatSessionsNotifier(List<StudentChatSession> initial) : super(initial);

  void addMessage(String sessionId, ChatMessage message) {
    state = state.map((s) {
      if (s.id == sessionId) {
        return s.copyWith(
          messages: [...s.messages, message],
          lastActive: DateTime.now(),
        );
      }
      return s;
    }).toList();
  }

  void toggleIntervention(String sessionId, bool isIntervening) {
    state = state.map((s) => s.id == sessionId ? s.copyWith(isIntervening: isIntervening) : s).toList();
  }
}

final moodRecordsProvider = StateNotifierProvider<MoodRecordsNotifier, List<TeacherMoodRecord>>((ref) {
  return MoodRecordsNotifier([
    TeacherMoodRecord(
      id: 'mood1',
      moodLevel: 3,
      stressTags: ['教学任务', '学生问题'],
      recordedAt: DateTime.now().subtract(const Duration(days: 6)),
    ),
    TeacherMoodRecord(
      id: 'mood2',
      moodLevel: 4,
      stressTags: [],
      recordedAt: DateTime.now().subtract(const Duration(days: 5)),
    ),
    TeacherMoodRecord(
      id: 'mood3',
      moodLevel: 2,
      stressTags: ['家校沟通', '评价考核'],
      recordedAt: DateTime.now().subtract(const Duration(days: 4)),
    ),
    TeacherMoodRecord(
      id: 'mood4',
      moodLevel: 2,
      stressTags: ['学生问题'],
      recordedAt: DateTime.now().subtract(const Duration(days: 3)),
    ),
    TeacherMoodRecord(
      id: 'mood5',
      moodLevel: 3,
      stressTags: [],
      recordedAt: DateTime.now().subtract(const Duration(days: 2)),
    ),
    TeacherMoodRecord(
      id: 'mood6',
      moodLevel: 4,
      stressTags: [],
      recordedAt: DateTime.now().subtract(const Duration(days: 1)),
    ),
    TeacherMoodRecord(
      id: 'mood7',
      moodLevel: 3,
      stressTags: ['教学任务'],
      recordedAt: DateTime.now(),
    ),
  ]);
});

class MoodRecordsNotifier extends StateNotifier<List<TeacherMoodRecord>> {
  MoodRecordsNotifier(List<TeacherMoodRecord> initial) : super(initial);

  void addRecord(TeacherMoodRecord record) {
    state = [...state, record];
  }
}

final selfHelpRequestsProvider = StateNotifierProvider<SelfHelpRequestsNotifier, List<SelfHelpRequest>>((ref) {
  return SelfHelpRequestsNotifier([
    SelfHelpRequest(
      id: 'sh1',
      teacherId: 't1',
      teacherName: '张明',
      description: '最近班级里有几个学生状态不太好，感觉压力很大，不知道该怎么处理',
      supportType: '建议',
      urgency: '一般',
      submittedAt: DateTime.now().subtract(const Duration(days: 1)),
      counselorId: 't3',
      counselorName: '陈静',
      isConnected: true,
      connectedAt: DateTime.now().subtract(const Duration(hours: 12)),
    ),
  ]);
});

class SelfHelpRequestsNotifier extends StateNotifier<List<SelfHelpRequest>> {
  SelfHelpRequestsNotifier(List<SelfHelpRequest> initial) : super(initial);

  void addRequest(SelfHelpRequest request) {
    state = [...state, request];
  }
}

final knowledgeBaseProvider = StateNotifierProvider<KnowledgeBaseNotifier, List<KnowledgeBaseItem>>((ref) {
  return KnowledgeBaseNotifier([
    KnowledgeBaseItem(
      id: 'kb1',
      title: '青少年心理预警信号识别指南',
      category: '识别指南',
      summary: '帮助教师识别学生常见的心理预警信号',
      content: '''## 青少年心理预警信号识别指南

### 一、情绪信号
- 持续两周以上的情绪低落
- 突然的情绪波动，易怒或易哭
- 对以前感兴趣的事情失去兴趣
- 过度焦虑或担忧

### 二、行为信号
- 社交退缩，不愿与人交往
- 学业成绩突然下滑
- 睡眠或饮食习惯改变
- 出现自伤行为或谈论死亡

### 三、身体信号
- 不明原因的身体不适（头痛、胃痛等）
- 疲劳乏力，精力下降
- 体重明显变化

### 四、应对建议
1. 保持关注，但不要过度追问
2. 提供支持性环境
3. 及时上报心理老师
4. 注意保护学生隐私''',
      author: '心理教研组',
      createdAt: DateTime.now().subtract(const Duration(days: 7)),
    ),
    KnowledgeBaseItem(
      id: 'kb2',
      title: '如何与情绪困扰学生沟通',
      category: '沟通技巧',
      summary: '掌握与情绪困扰学生沟通的基本技巧',
      content: '''## 如何与情绪困扰学生沟通

### 基本原则
- **共情为先**：先理解学生的感受，再提供建议
- **尊重隐私**：不在公开场合谈论学生的情况
- **保持耐心**：给学生足够的时间表达
- **避免评判**：不用"你应该"等评判性语言

### 沟通技巧
1. **开放式提问**："你最近感觉怎么样？"而不是"你还好吗？"
2. **倾听多于说话**：让学生充分表达，不要急于打断
3. **验证感受**："听起来你真的很不容易"
4. **提供支持**："我很愿意帮助你"

### 注意事项
- 不要试图当心理咨询师
- 如果学生有自伤倾向，立即上报
- 做好记录，但保护隐私''',
      author: '王丽',
      createdAt: DateTime.now().subtract(const Duration(days: 3)),
    ),
    KnowledgeBaseItem(
      id: 'kb3',
      title: '症状反馈上报SOP',
      category: '上报SOP',
      summary: '症状反馈上报的标准操作流程',
      content: '''## 症状反馈上报SOP

### 第一步：观察记录
- 记录观察到的具体行为
- 不要主观推断，只记录事实

### 第二步：初步沟通
- 与学生进行简短沟通
- 了解基本情况

### 第三步：填写反馈表
- 选择学生
- 勾选行为表现和情绪表现
- 选择持续时间和严重程度
- 填写具体描述

### 第四步：提交报告
- 系统会根据严重程度自动推送
- 紧急情况立即联系心理老师

### 第五步：跟进回执
- 关注报告处理状态
- 查看心理老师的处理回执''',
      author: '系统',
      createdAt: DateTime.now().subtract(const Duration(days: 1)),
    ),
    KnowledgeBaseItem(
      id: 'kb4',
      title: '危机干预技术手册',
      category: '干预技术',
      summary: '专业危机干预技术指南（心理老师专用）',
      content: '''## 危机干预技术手册

### 一、危机评估
1. 评估危险等级
2. 确定干预方向
3. 制定干预计划

### 二、核心技术
- **共情技术**：理解并表达学生的感受
- **情绪调节**：帮助学生调节情绪
- **认知重构**：引导积极思维
- **安全计划**：制定安全策略

### 三、干预流程
1. 建立信任关系
2. 评估危机程度
3. 实施干预
4. 跟进与转介

### 四、注意事项
- 保护学生安全是首要任务
- 严格遵守保密原则
- 及时记录干预过程''',
      author: '心理教研组',
      createdAt: DateTime.now().subtract(const Duration(days: 5)),
      isProfessional: true,
    ),
    KnowledgeBaseItem(
      id: 'kb5',
      title: '危机处理SOP',
      category: '危机SOP',
      summary: '高风险危机处理标准流程（心理老师专用）',
      content: '''## 危机处理SOP

### 红色风险处理流程
1. 立即响应（30分钟内）
2. 评估危机程度
3. 启动安全协议
4. 通知相关人员

### 橙色风险处理流程
1. 2小时内响应
2. 安排面谈
3. 制定干预计划
4. 48小时内回访

### 黄色风险处理流程
1. 48小时内响应
2. 关注状态变化
3. 提供自助资源

### 危机热线
- 全国心理援助热线：12355
- 希望24热线：400-161-9995''',
      author: '心理教研组',
      createdAt: DateTime.now().subtract(const Duration(days: 10)),
      isProfessional: true,
    ),
  ]);
});

class KnowledgeBaseNotifier extends StateNotifier<List<KnowledgeBaseItem>> {
  KnowledgeBaseNotifier(List<KnowledgeBaseItem> initial) : super(initial);
}

final emotionalOverviewProvider = StateProvider<EmotionalOverview>((ref) {
  return EmotionalOverview(
    className: '高一(3)班',
    totalStudents: 45,
    averageMood: 3.2,
    moodDistribution: {
      '很棒': 8,
      '不错': 15,
      '一般': 12,
      '不太好': 6,
      '很糟': 4,
    },
    highRiskCount: 3,
    updatedAt: DateTime.now(),
  );
});

final authorizationRequestsProvider = StateNotifierProvider<AuthorizationRequestsNotifier, List<AuthorizationRequest>>((ref) {
  return AuthorizationRequestsNotifier([
    AuthorizationRequest(
      id: 'auth1',
      studentId: 's7',
      studentName: '周子涵',
      className: '高一(4)班',
      counselorId: 't2',
      counselorName: '王丽',
      scope: '持续观察30天',
      expiresAt: DateTime.now().add(const Duration(days: 30)),
      requestedAt: DateTime.now().subtract(const Duration(hours: 2)),
    ),
  ]);
});

class AuthorizationRequestsNotifier extends StateNotifier<List<AuthorizationRequest>> {
  AuthorizationRequestsNotifier(List<AuthorizationRequest> initial) : super(initial);

  void approve(String requestId) {
    state = state.map((a) => a.id == requestId ? a.copyWith(isApproved: true) : a).toList();
  }

  void reject(String requestId) {
    state = state.where((a) => a.id != requestId).toList();
  }
}