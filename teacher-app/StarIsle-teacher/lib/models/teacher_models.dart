/// @file teacher_models.dart
/// @description 教师端核心数据模型定义，包含教师、学生、症状报告、预警、待办、聊天会话、
///              心情记录、自助请求、知识库、干预记录、情绪概览与授权请求等数据结构，
///              以及风险等级、报告状态等枚举及其扩展方法，是教师端业务逻辑与状态管理的基础。
/// @module teacher-app/models

import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';

/// 教师角色枚举。
///
/// 区分教师在系统中的职责，用于权限控制与界面展示。
enum TeacherRole {
  homeroomTeacher, // 班主任
  subjectTeacher, // 科任老师
  counselor, // 心理老师
}

/// 风险等级枚举。
///
/// 描述学生当前心理风险严重程度，从绿色（轻微）到红色（紧急）递增。
enum RiskLevel {
  green, // 轻微关注
  yellow, // 需要关注
  orange, // 较为紧急
  red, // 紧急
}

/// 报告处理状态枚举。
///
/// 标识症状报告从提交到处理完成的流转状态。
enum ReportStatus {
  submitted, // 已提交
  received, // 已接收
  processing, // 处理中
  processed, // 已处理
}

/// 症状类型枚举。
///
/// 描述学生表现出的具体症状类别，一份报告可包含多个症状类型。
enum SymptomType {
  emotionalLow, // 情绪低落
  irritable, // 烦躁易怒
  socialWithdrawal, // 社交退缩
  academicDrop, // 学业下滑
  sleepAbnormal, // 睡眠异常
  selfHarmTraces, // 自伤痕迹
  other, // 其他
}

/// 情绪表达类型枚举。
///
/// 描述观察到的学生外在情绪表现。
enum EmotionalExpression {
  crying, // 哭泣
  numb, // 麻木
  anxious, // 焦虑
  irritable, // 烦躁
  abnormallyCalm, // 异常平静
}

/// 症状持续时长枚举。
///
/// 标识症状持续的时间区间，用于评估严重程度。
enum DurationType {
  lessThan1Week, // 不足 1 周
  oneToTwoWeeks, // 1-2 周
  twoToFourWeeks, // 2-4 周
  moreThan1Month, // 超过 1 个月
}

/// 严重程度枚举。
///
/// 对应风险等级，用于在报告中对症状进行分级评估。
enum SeverityLevel {
  mildAttention, // 轻微关注
  needAttention, // 需要关注
  somewhatUrgent, // 较为紧急
  urgent, // 紧急
}

/// [RiskLevel] 扩展方法。
///
/// 为风险等级提供中文标签、展示颜色与 Emoji，便于在 UI 中统一渲染。
extension RiskLevelExtension on RiskLevel {
  /// 风险等级对应的中文标签。
  String get label {
    switch (this) {
      case RiskLevel.green: return '轻微关注';
      case RiskLevel.yellow: return '需要关注';
      case RiskLevel.orange: return '较为紧急';
      case RiskLevel.red: return '紧急';
    }
  }

  /// 风险等级对应的展示颜色。
  Color get color {
    switch (this) {
      case RiskLevel.green: return const Color(0xFF66BB6A);
      case RiskLevel.yellow: return const Color(0xFFFFCA28);
      case RiskLevel.orange: return const Color(0xFFFF9800);
      case RiskLevel.red: return const Color(0xFFEF5350);
    }
  }

  /// 风险等级对应的 Emoji 图标。
  String get emoji {
    switch (this) {
      case RiskLevel.green: return '🟢';
      case RiskLevel.yellow: return '🟡';
      case RiskLevel.orange: return '🟠';
      case RiskLevel.red: return '🔴';
    }
  }
}

/// [ReportStatus] 扩展方法。
///
/// 为报告状态提供中文标签与展示颜色。
extension ReportStatusExtension on ReportStatus {
  /// 报告状态对应的中文标签。
  String get label {
    switch (this) {
      case ReportStatus.submitted: return '已提交';
      case ReportStatus.received: return '已接收';
      case ReportStatus.processing: return '处理中';
      case ReportStatus.processed: return '已处理';
    }
  }

  /// 报告状态对应的展示颜色。
  Color get color {
    switch (this) {
      case ReportStatus.submitted: return const Color(0xFF9E9E9E);
      case ReportStatus.received: return const Color(0xFF2196F3);
      case ReportStatus.processing: return const Color(0xFFFF9800);
      case ReportStatus.processed: return const Color(0xFF4CAF50);
    }
  }
}

/// 教师信息模型。
///
/// 描述教师的基本身份与所属班级信息，作为教师端登录后展示与权限判断的依据。
class Teacher {
  /// 教师唯一标识，未传入时自动生成 UUID。
  final String id;

  /// 教师姓名。
  final String name;

  /// 教师角色。
  final TeacherRole role;

  /// 所属学校名称。
  final String school;

  /// 负责班级名称。
  final String className;

  /// 所带学生数量。
  final int studentCount;

  /// 教师头像 URL，默认为空字符串。
  final String avatar;

  /// 构造教师实例。
  ///
  /// 参数：
  /// - [id]：可选标识，缺省时由 [Uuid] 自动生成；
  /// - [name]、[role]、[school]、[className]、[studentCount]：必填基础信息；
  /// - [avatar]：可选头像地址。
  Teacher({
    String? id,
    required this.name,
    required this.role,
    required this.school,
    required this.className,
    required this.studentCount,
    this.avatar = '',
  }) : id = id ?? const Uuid().v4();

  /// 角色对应的中文标签。
  String get roleLabel {
    switch (role) {
      case TeacherRole.homeroomTeacher: return '班主任';
      case TeacherRole.subjectTeacher: return '科任老师';
      case TeacherRole.counselor: return '心理老师';
    }
  }
}

/// 学生信息模型。
///
/// 用于在教师端展示学生概览状态，包含风险等级与最近状态摘要。
class Student {
  /// 学生唯一标识，未传入时自动生成 UUID。
  final String id;

  /// 学生姓名。
  final String name;

  /// 班级名称。
  final String className;

  /// 年级。
  final int grade;

  /// 当前风险等级。
  final RiskLevel riskLevel;

  /// 最近状态更新时间。
  final DateTime lastStatusUpdate;

  /// 状态摘要文字。
  final String statusSummary;

  /// 是否已实名认证。
  final bool hasRealIdentity;

  /// 心情趋势数值（正数为上升趋势，负数为下降）。
  final int moodTrend;

  /// 构造学生实例。
  ///
  /// 参数：
  /// - [id]：可选标识，缺省时自动生成 UUID；
  /// - [name]、[className]、[grade]、[riskLevel]、[lastStatusUpdate]、[statusSummary]：必填字段；
  /// - [hasRealIdentity]：是否实名，默认 true；
  /// - [moodTrend]：心情趋势，默认 0。
  Student({
    String? id,
    required this.name,
    required this.className,
    required this.grade,
    required this.riskLevel,
    required this.lastStatusUpdate,
    required this.statusSummary,
    this.hasRealIdentity = true,
    this.moodTrend = 0,
  }) : id = id ?? const Uuid().v4();
}

/// 症状报告模型。
///
/// 记录教师对学生异常表现的报告内容与处理流转信息，是教师端核心业务数据。
class SymptomReport {
  /// 报告唯一标识，未传入时自动生成 UUID。
  final String id;

  /// 关联学生 ID。
  final String studentId;

  /// 学生姓名。
  final String studentName;

  /// 班级名称。
  final String className;

  /// 报告人 ID。
  final String reporterId;

  /// 报告人姓名。
  final String reporterName;

  /// 症状类型列表。
  final List<SymptomType> symptoms;

  /// 情绪表达列表。
  final List<EmotionalExpression> emotions;

  /// 症状持续时长。
  final DurationType duration;

  /// 严重程度。
  final SeverityLevel severity;

  /// 详细描述。
  final String description;

  /// 是否已与学生沟通。
  final bool hasCommunicated;

  /// 是否已联系家长。
  final bool hasContactedParent;

  /// 提交时间。
  final DateTime submittedAt;

  /// 当前报告状态。
  final ReportStatus status;

  /// 处理人 ID，未分配时为 null。
  final String? assigneeId;

  /// 处理人姓名，未分配时为 null。
  final String? assigneeName;

  /// 处理意见，未填写时为 null。
  final String? processingOpinion;

  /// 处理完成时间，未处理时为 null。
  final DateTime? processedAt;

  /// 构造症状报告实例。
  ///
  /// 参数：
  /// - [id]：可选标识，缺省时自动生成 UUID；
  /// - [studentId]、[studentName]、[className]、[reporterId]、[reporterName]、[symptoms]、[emotions]、
  ///   [duration]、[severity]、[description]、[hasCommunicated]、[hasContactedParent]、[submittedAt]、[status]：必填字段；
  /// - [assigneeId]、[assigneeName]、[processingOpinion]、[processedAt]：可选处理信息。
  SymptomReport({
    String? id,
    required this.studentId,
    required this.studentName,
    required this.className,
    required this.reporterId,
    required this.reporterName,
    required this.symptoms,
    required this.emotions,
    required this.duration,
    required this.severity,
    required this.description,
    required this.hasCommunicated,
    required this.hasContactedParent,
    required this.submittedAt,
    required this.status,
    this.assigneeId,
    this.assigneeName,
    this.processingOpinion,
    this.processedAt,
  }) : id = id ?? const Uuid().v4();

  /// 根据严重程度推导出的风险等级。
  RiskLevel get riskLevel {
    switch (severity) {
      case SeverityLevel.mildAttention: return RiskLevel.green;
      case SeverityLevel.needAttention: return RiskLevel.yellow;
      case SeverityLevel.somewhatUrgent: return RiskLevel.orange;
      case SeverityLevel.urgent: return RiskLevel.red;
    }
  }
}

/// 预警信息模型。
///
/// 当学生触发风险阈值时生成的预警记录，用于教师及时跟进处理。
class Alert {
  /// 预警唯一标识，未传入时自动生成 UUID。
  final String id;

  /// 关联学生 ID。
  final String studentId;

  /// 学生姓名。
  final String studentName;

  /// 班级名称。
  final String className;

  /// 风险等级。
  final RiskLevel riskLevel;

  /// 触发原因描述。
  final String triggerReason;

  /// 触发时间。
  final DateTime triggeredAt;

  /// 是否已被教师阅读。
  final bool isRead;

  /// 构造预警实例。
  ///
  /// 参数：
  /// - [id]：可选标识，缺省时自动生成 UUID；
  /// - [studentId]、[studentName]、[className]、[riskLevel]、[triggerReason]、[triggeredAt]：必填字段；
  /// - [isRead]：是否已读，默认 false。
  Alert({
    String? id,
    required this.studentId,
    required this.studentName,
    required this.className,
    required this.riskLevel,
    required this.triggerReason,
    required this.triggeredAt,
    this.isRead = false,
  }) : id = id ?? const Uuid().v4();
}

/// 待办事项模型。
///
/// 描述教师需要处理的工作任务，可关联报告、干预等具体业务对象。
class TodoItem {
  /// 待办唯一标识，未传入时自动生成 UUID。
  final String id;

  /// 待办标题。
  final String title;

  /// 待办描述，可为空。
  final String? description;

  /// 截止时间。
  final DateTime deadline;

  /// 是否已完成。
  final bool isCompleted;

  /// 待办类型。
  final TodoType type;

  /// 关联业务对象 ID，可为空。
  final String? relatedId;

  /// 构造待办实例。
  ///
  /// 参数：
  /// - [id]：可选标识，缺省时自动生成 UUID；
  /// - [title]、[deadline]、[type]：必填字段；
  /// - [description]、[relatedId]：可选项；
  /// - [isCompleted]：是否完成，默认 false。
  TodoItem({
    String? id,
    required this.title,
    this.description,
    required this.deadline,
    this.isCompleted = false,
    required this.type,
    this.relatedId,
  }) : id = id ?? const Uuid().v4();
}

/// 待办类型枚举。
///
/// 区分待办事项的业务来源，便于分类展示与跳转。
enum TodoType {
  reportProcessing, // 报告处理
  interventionFollowup, // 干预跟进
  receiptReview, // 回执审核
  observationTask, // 观察任务
}

/// 聊天消息模型。
///
/// 表示教师与学生对话中的单条消息，可附带风险等级与策略提示信息。
class ChatMessage {
  /// 消息唯一标识，未传入时自动生成 UUID。
  final String id;

  /// 发送者 ID。
  final String senderId;

  /// 发送者姓名。
  final String senderName;

  /// 发送者是否为教师。
  final bool isTeacher;

  /// 消息文本内容。
  final String content;

  /// 发送时间。
  final DateTime sentAt;

  /// 关联的风险等级，可为空。
  final RiskLevel? riskLevel;

  /// AI 策略提示，可为空。
  final String? strategyHint;

  /// 构造聊天消息实例。
  ///
  /// 参数：
  /// - [id]：可选标识，缺省时自动生成 UUID；
  /// - [senderId]、[senderName]、[isTeacher]、[content]、[sentAt]：必填字段；
  /// - [riskLevel]、[strategyHint]：可选项。
  ChatMessage({
    String? id,
    required this.senderId,
    required this.senderName,
    required this.isTeacher,
    required this.content,
    required this.sentAt,
    this.riskLevel,
    this.strategyHint,
  }) : id = id ?? const Uuid().v4();
}

/// 学生聊天会话模型。
///
/// 表示教师与某学生之间的完整对话会话，包含会话元信息与消息列表。
class StudentChatSession {
  /// 会话唯一标识，未传入时自动生成 UUID。
  final String id;

  /// 学生 ID。
  final String studentId;

  /// 学生姓名。
  final String studentName;

  /// 班级名称。
  final String className;

  /// 学生当前风险等级。
  final RiskLevel riskLevel;

  /// 最近活跃时间。
  final DateTime lastActive;

  /// 是否正在干预中。
  final bool isIntervening;

  /// 消息列表。
  final List<ChatMessage> messages;

  /// 构造聊天会话实例。
  ///
  /// 参数：
  /// - [id]：可选标识，缺省时自动生成 UUID；
  /// - [studentId]、[studentName]、[className]、[riskLevel]、[lastActive]、[messages]：必填字段；
  /// - [isIntervening]：是否干预中，默认 false。
  StudentChatSession({
    String? id,
    required this.studentId,
    required this.studentName,
    required this.className,
    required this.riskLevel,
    required this.lastActive,
    this.isIntervening = false,
    required this.messages,
  }) : id = id ?? const Uuid().v4();
}

/// 教师心情记录模型。
///
/// 记录教师自身的心情打卡信息，用于教师心理健康自评与统计。
class TeacherMoodRecord {
  /// 记录唯一标识，未传入时自动生成 UUID。
  final String id;

  /// 心情等级（1-5，1 为最差，5 为最佳）。
  final int moodLevel;

  /// 压力标签列表。
  final List<String> stressTags;

  /// 记录时间。
  final DateTime recordedAt;

  /// 构造心情记录实例。
  ///
  /// 参数：
  /// - [id]：可选标识，缺省时自动生成 UUID；
  /// - [moodLevel]、[stressTags]、[recordedAt]：必填字段。
  TeacherMoodRecord({
    String? id,
    required this.moodLevel,
    required this.stressTags,
    required this.recordedAt,
  }) : id = id ?? const Uuid().v4();

  /// 心情等级对应的中文标签。
  String get moodLabel {
    switch (moodLevel) {
      case 1: return '很糟';
      case 2: return '不太好';
      case 3: return '一般';
      case 4: return '不错';
      case 5: return '很棒';
      default: return '一般';
    }
  }

  /// 心情等级对应的 Emoji。
  String get moodEmoji {
    switch (moodLevel) {
      case 1: return '😢';
      case 2: return '😔';
      case 3: return '😐';
      case 4: return '🙂';
      case 5: return '😄';
      default: return '😐';
    }
  }
}

/// 教师自助请求模型。
///
/// 教师向心理老师发起的求助请求，记录请求内容与连接状态。
class SelfHelpRequest {
  /// 请求唯一标识，未传入时自动生成 UUID。
  final String id;

  /// 发起教师 ID。
  final String teacherId;

  /// 发起教师姓名。
  final String teacherName;

  /// 求助描述。
  final String description;

  /// 支持类型。
  final String supportType;

  /// 紧急程度。
  final String urgency;

  /// 提交时间。
  final DateTime submittedAt;

  /// 接单心理老师 ID，未接单时为 null。
  final String? counselorId;

  /// 接单心理老师姓名，未接单时为 null。
  final String? counselorName;

  /// 是否已建立连接。
  final bool isConnected;

  /// 建立连接时间，未连接时为 null。
  final DateTime? connectedAt;

  /// 构造自助请求实例。
  ///
  /// 参数：
  /// - [id]：可选标识，缺省时自动生成 UUID；
  /// - [teacherId]、[teacherName]、[description]、[supportType]、[urgency]、[submittedAt]：必填字段；
  /// - [counselorId]、[counselorName]、[connectedAt]：可选项；
  /// - [isConnected]：是否已连接，默认 false。
  SelfHelpRequest({
    String? id,
    required this.teacherId,
    required this.teacherName,
    required this.description,
    required this.supportType,
    required this.urgency,
    required this.submittedAt,
    this.counselorId,
    this.counselorName,
    this.isConnected = false,
    this.connectedAt,
  }) : id = id ?? const Uuid().v4();
}

/// 知识库条目模型。
///
/// 描述心理相关知识库文章的元信息与正文，供教师检索学习。
class KnowledgeBaseItem {
  /// 条目唯一标识，未传入时自动生成 UUID。
  final String id;

  /// 标题。
  final String title;

  /// 分类。
  final String category;

  /// 摘要。
  final String summary;

  /// 正文内容。
  final String content;

  /// 作者。
  final String author;

  /// 创建时间。
  final DateTime createdAt;

  /// 是否为专业内容。
  final bool isProfessional;

  /// 构造知识库条目实例。
  ///
  /// 参数：
  /// - [id]：可选标识，缺省时自动生成 UUID；
  /// - [title]、[category]、[summary]、[content]、[author]、[createdAt]：必填字段；
  /// - [isProfessional]：是否专业内容，默认 false。
  KnowledgeBaseItem({
    String? id,
    required this.title,
    required this.category,
    required this.summary,
    required this.content,
    required this.author,
    required this.createdAt,
    this.isProfessional = false,
  }) : id = id ?? const Uuid().v4();
}

/// 干预记录模型。
///
/// 记录心理老师对学生进行的干预过程信息，包含起止时间、消息量与前后风险等级变化。
class InterventionRecord {
  /// 记录唯一标识，未传入时自动生成 UUID。
  final String id;

  /// 学生 ID。
  final String studentId;

  /// 学生姓名。
  final String studentName;

  /// 干预心理老师 ID。
  final String counselorId;

  /// 干预心理老师姓名。
  final String counselorName;

  /// 干预开始时间。
  final DateTime startTime;

  /// 干预结束时间。
  final DateTime endTime;

  /// 干预期间消息数。
  final int messageCount;

  /// 干预总结。
  final String interventionSummary;

  /// 干预前风险等级。
  final RiskLevel beforeRiskLevel;

  /// 干预后风险等级。
  final RiskLevel afterRiskLevel;

  /// 是否需要后续跟进。
  final bool needsFollowup;

  /// 跟进计划，可为空。
  final String? followupPlan;

  /// 构造干预记录实例。
  ///
  /// 参数：
  /// - [id]：可选标识，缺省时自动生成 UUID；
  /// - [studentId]、[studentName]、[counselorId]、[counselorName]、[startTime]、[endTime]、
  ///   [messageCount]、[interventionSummary]、[beforeRiskLevel]、[afterRiskLevel]：必填字段；
  /// - [needsFollowup]：是否需要跟进，默认 false；
  /// - [followupPlan]：跟进计划，可选项。
  InterventionRecord({
    String? id,
    required this.studentId,
    required this.studentName,
    required this.counselorId,
    required this.counselorName,
    required this.startTime,
    required this.endTime,
    required this.messageCount,
    required this.interventionSummary,
    required this.beforeRiskLevel,
    required this.afterRiskLevel,
    this.needsFollowup = false,
    this.followupPlan,
  }) : id = id ?? const Uuid().v4();
}

/// 班级情绪概览模型。
///
/// 汇总班级整体情绪状态，用于工作台展示班级心理健康概览。
class EmotionalOverview {
  /// 班级名称。
  final String className;

  /// 班级总学生数。
  final int totalStudents;

  /// 平均心情分值。
  final double averageMood;

  /// 心情分布，键为心情标签，值为对应人数。
  final Map<String, int> moodDistribution;

  /// 高风险学生数。
  final int highRiskCount;

  /// 更新时间。
  final DateTime updatedAt;

  /// 构造情绪概览实例。
  ///
  /// 参数：
  /// - [className]、[totalStudents]、[averageMood]、[moodDistribution]、[highRiskCount]、[updatedAt]：必填字段。
  EmotionalOverview({
    required this.className,
    required this.totalStudents,
    required this.averageMood,
    required this.moodDistribution,
    required this.highRiskCount,
    required this.updatedAt,
  });
}

/// 授权请求模型。
///
/// 心理老师向学生发起的数据访问授权请求，包含授权范围与有效期。
class AuthorizationRequest {
  /// 请求唯一标识，未传入时自动生成 UUID。
  final String id;

  /// 学生 ID。
  final String studentId;

  /// 学生姓名。
  final String studentName;

  /// 班级名称。
  final String className;

  /// 发起心理老师 ID。
  final String counselorId;

  /// 发起心理老师姓名。
  final String counselorName;

  /// 授权范围说明。
  final String scope;

  /// 授权过期时间。
  final DateTime expiresAt;

  /// 请求发起时间。
  final DateTime requestedAt;

  /// 是否已批准。
  final bool isApproved;

  /// 是否已撤销。
  final bool isRevoked;

  /// 构造授权请求实例。
  ///
  /// 参数：
  /// - [id]：可选标识，缺省时自动生成 UUID；
  /// - [studentId]、[studentName]、[className]、[counselorId]、[counselorName]、[scope]、[expiresAt]、[requestedAt]：必填字段；
  /// - [isApproved]：是否批准，默认 false；
  /// - [isRevoked]：是否撤销，默认 false。
  AuthorizationRequest({
    String? id,
    required this.studentId,
    required this.studentName,
    required this.className,
    required this.counselorId,
    required this.counselorName,
    required this.scope,
    required this.expiresAt,
    required this.requestedAt,
    this.isApproved = false,
    this.isRevoked = false,
  }) : id = id ?? const Uuid().v4();
}
