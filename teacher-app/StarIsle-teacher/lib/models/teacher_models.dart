import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';

enum TeacherRole { homeroomTeacher, subjectTeacher, counselor }
enum RiskLevel { green, yellow, orange, red }
enum ReportStatus { submitted, received, processing, processed }
enum SymptomType {
  emotionalLow,
  irritable,
  socialWithdrawal,
  academicDrop,
  sleepAbnormal,
  selfHarmTraces,
  other,
}
enum EmotionalExpression {
  crying,
  numb,
  anxious,
  irritable,
  abnormallyCalm,
}
enum DurationType { lessThan1Week, oneToTwoWeeks, twoToFourWeeks, moreThan1Month }
enum SeverityLevel { mildAttention, needAttention, somewhatUrgent, urgent }

extension RiskLevelExtension on RiskLevel {
  String get label {
    switch (this) {
      case RiskLevel.green: return '轻微关注';
      case RiskLevel.yellow: return '需要关注';
      case RiskLevel.orange: return '较为紧急';
      case RiskLevel.red: return '紧急';
    }
  }
  
  Color get color {
    switch (this) {
      case RiskLevel.green: return const Color(0xFF66BB6A);
      case RiskLevel.yellow: return const Color(0xFFFFCA28);
      case RiskLevel.orange: return const Color(0xFFFF9800);
      case RiskLevel.red: return const Color(0xFFEF5350);
    }
  }
  
  String get emoji {
    switch (this) {
      case RiskLevel.green: return '🟢';
      case RiskLevel.yellow: return '🟡';
      case RiskLevel.orange: return '🟠';
      case RiskLevel.red: return '🔴';
    }
  }
}

extension ReportStatusExtension on ReportStatus {
  String get label {
    switch (this) {
      case ReportStatus.submitted: return '已提交';
      case ReportStatus.received: return '已接收';
      case ReportStatus.processing: return '处理中';
      case ReportStatus.processed: return '已处理';
    }
  }
  
  Color get color {
    switch (this) {
      case ReportStatus.submitted: return const Color(0xFF9E9E9E);
      case ReportStatus.received: return const Color(0xFF2196F3);
      case ReportStatus.processing: return const Color(0xFFFF9800);
      case ReportStatus.processed: return const Color(0xFF4CAF50);
    }
  }
}

class Teacher {
  final String id;
  final String name;
  final TeacherRole role;
  final String school;
  final String className;
  final int studentCount;
  final String avatar;

  Teacher({
    String? id,
    required this.name,
    required this.role,
    required this.school,
    required this.className,
    required this.studentCount,
    this.avatar = '',
  }) : id = id ?? const Uuid().v4();

  String get roleLabel {
    switch (role) {
      case TeacherRole.homeroomTeacher: return '班主任';
      case TeacherRole.subjectTeacher: return '科任老师';
      case TeacherRole.counselor: return '心理老师';
    }
  }
}

class Student {
  final String id;
  final String name;
  final String className;
  final int grade;
  final RiskLevel riskLevel;
  final DateTime lastStatusUpdate;
  final String statusSummary;
  final bool hasRealIdentity;
  final int moodTrend;

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

class SymptomReport {
  final String id;
  final String studentId;
  final String studentName;
  final String className;
  final String reporterId;
  final String reporterName;
  final List<SymptomType> symptoms;
  final List<EmotionalExpression> emotions;
  final DurationType duration;
  final SeverityLevel severity;
  final String description;
  final bool hasCommunicated;
  final bool hasContactedParent;
  final DateTime submittedAt;
  final ReportStatus status;
  final String? assigneeId;
  final String? assigneeName;
  final String? processingOpinion;
  final DateTime? processedAt;

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

  RiskLevel get riskLevel {
    switch (severity) {
      case SeverityLevel.mildAttention: return RiskLevel.green;
      case SeverityLevel.needAttention: return RiskLevel.yellow;
      case SeverityLevel.somewhatUrgent: return RiskLevel.orange;
      case SeverityLevel.urgent: return RiskLevel.red;
    }
  }
}

class Alert {
  final String id;
  final String studentId;
  final String studentName;
  final String className;
  final RiskLevel riskLevel;
  final String triggerReason;
  final DateTime triggeredAt;
  final bool isRead;

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

class TodoItem {
  final String id;
  final String title;
  final String? description;
  final DateTime deadline;
  final bool isCompleted;
  final TodoType type;
  final String? relatedId;

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

enum TodoType {
  reportProcessing,
  interventionFollowup,
  receiptReview,
  observationTask,
}

class ChatMessage {
  final String id;
  final String senderId;
  final String senderName;
  final bool isTeacher;
  final String content;
  final DateTime sentAt;
  final RiskLevel? riskLevel;
  final String? strategyHint;

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

class StudentChatSession {
  final String id;
  final String studentId;
  final String studentName;
  final String className;
  final RiskLevel riskLevel;
  final DateTime lastActive;
  final bool isIntervening;
  final List<ChatMessage> messages;

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

class TeacherMoodRecord {
  final String id;
  final int moodLevel;
  final List<String> stressTags;
  final DateTime recordedAt;

  TeacherMoodRecord({
    String? id,
    required this.moodLevel,
    required this.stressTags,
    required this.recordedAt,
  }) : id = id ?? const Uuid().v4();

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

class SelfHelpRequest {
  final String id;
  final String teacherId;
  final String teacherName;
  final String description;
  final String supportType;
  final String urgency;
  final DateTime submittedAt;
  final String? counselorId;
  final String? counselorName;
  final bool isConnected;
  final DateTime? connectedAt;

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

class KnowledgeBaseItem {
  final String id;
  final String title;
  final String category;
  final String summary;
  final String content;
  final String author;
  final DateTime createdAt;
  final bool isProfessional;

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

class InterventionRecord {
  final String id;
  final String studentId;
  final String studentName;
  final String counselorId;
  final String counselorName;
  final DateTime startTime;
  final DateTime endTime;
  final int messageCount;
  final String interventionSummary;
  final RiskLevel beforeRiskLevel;
  final RiskLevel afterRiskLevel;
  final bool needsFollowup;
  final String? followupPlan;

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

class EmotionalOverview {
  final String className;
  final int totalStudents;
  final double averageMood;
  final Map<String, int> moodDistribution;
  final int highRiskCount;
  final DateTime updatedAt;

  EmotionalOverview({
    required this.className,
    required this.totalStudents,
    required this.averageMood,
    required this.moodDistribution,
    required this.highRiskCount,
    required this.updatedAt,
  });
}

class AuthorizationRequest {
  final String id;
  final String studentId;
  final String studentName;
  final String className;
  final String counselorId;
  final String counselorName;
  final String scope;
  final DateTime expiresAt;
  final DateTime requestedAt;
  final bool isApproved;
  final bool isRevoked;

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