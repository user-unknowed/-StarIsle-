package com.starisle.model.dart;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public enum TeacherRole {
    homeroomTeacher, subjectTeacher, counselor;

    public String getRoleLabel() {
        switch (this) {
            case homeroomTeacher: return "班主任";
            case subjectTeacher: return "科任老师";
            case counselor: return "心理老师";
            default: return name();
        }
    }
}

public enum RiskLevel {
    green, yellow, orange, red;

    public String getLabel() {
        switch (this) {
            case green: return "轻微关注";
            case yellow: return "需要关注";
            case orange: return "较为紧急";
            case red: return "紧急";
            default: return name();
        }
    }

    public String getColor() {
        switch (this) {
            case green: return "#66BB6A";
            case yellow: return "#FFCA28";
            case orange: return "#FF9800";
            case red: return "#EF5350";
            default: return "#9E9E9E";
        }
    }

    public String getEmoji() {
        switch (this) {
            case green: return "🟢";
            case yellow: return "🟡";
            case orange: return "🟠";
            case red: return "🔴";
            default: return "⚪";
        }
    }
}

public enum ReportStatus {
    submitted, received, processing, processed;

    public String getLabel() {
        switch (this) {
            case submitted: return "已提交";
            case received: return "已接收";
            case processing: return "处理中";
            case processed: return "已处理";
            default: return name();
        }
    }

    public String getColor() {
        switch (this) {
            case submitted: return "#9E9E9E";
            case received: return "#2196F3";
            case processing: return "#FF9800";
            case processed: return "#4CAF50";
            default: return "#9E9E9E";
        }
    }
}

public enum SymptomType {
    emotionalLow, irritable, socialWithdrawal, academicDrop, sleepAbnormal, selfHarmTraces, other;
}

public enum EmotionalExpression {
    crying, numb, anxious, irritable, abnormallyCalm;
}

public enum DurationType {
    lessThan1Week, oneToTwoWeeks, twoToFourWeeks, moreThan1Month;
}

public enum SeverityLevel {
    mildAttention, needAttention, somewhatUrgent, urgent;

    public RiskLevel toRiskLevel() {
        switch (this) {
            case mildAttention: return RiskLevel.green;
            case needAttention: return RiskLevel.yellow;
            case somewhatUrgent: return RiskLevel.orange;
            case urgent: return RiskLevel.red;
            default: return RiskLevel.green;
        }
    }
}

public enum TodoType {
    reportProcessing, interventionFollowup, receiptReview, observationTask;
}

public class Teacher {
    private final String id;
    private final String name;
    private final TeacherRole role;
    private final String school;
    private final String className;
    private final int studentCount;
    private final String avatar;

    public Teacher(String name, TeacherRole role, String school, String className, int studentCount) {
        this(UUID.randomUUID().toString(), name, role, school, className, studentCount, "");
    }

    public Teacher(String id, String name, TeacherRole role, String school, String className, int studentCount, String avatar) {
        this.id = id;
        this.name = name;
        this.role = role;
        this.school = school;
        this.className = className;
        this.studentCount = studentCount;
        this.avatar = avatar;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public TeacherRole getRole() { return role; }
    public String getSchool() { return school; }
    public String getClassName() { return className; }
    public int getStudentCount() { return studentCount; }
    public String getAvatar() { return avatar; }

    public String getRoleLabel() {
        return role.getRoleLabel();
    }
}

public class Student {
    private final String id;
    private final String name;
    private final String className;
    private final int grade;
    private final RiskLevel riskLevel;
    private final LocalDateTime lastStatusUpdate;
    private final String statusSummary;
    private final boolean hasRealIdentity;
    private final int moodTrend;

    public Student(String name, String className, int grade, RiskLevel riskLevel, 
                   LocalDateTime lastStatusUpdate, String statusSummary) {
        this(UUID.randomUUID().toString(), name, className, grade, riskLevel, 
             lastStatusUpdate, statusSummary, true, 0);
    }

    public Student(String id, String name, String className, int grade, RiskLevel riskLevel,
                   LocalDateTime lastStatusUpdate, String statusSummary, 
                   boolean hasRealIdentity, int moodTrend) {
        this.id = id;
        this.name = name;
        this.className = className;
        this.grade = grade;
        this.riskLevel = riskLevel;
        this.lastStatusUpdate = lastStatusUpdate;
        this.statusSummary = statusSummary;
        this.hasRealIdentity = hasRealIdentity;
        this.moodTrend = moodTrend;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getClassName() { return className; }
    public int getGrade() { return grade; }
    public RiskLevel getRiskLevel() { return riskLevel; }
    public LocalDateTime getLastStatusUpdate() { return lastStatusUpdate; }
    public String getStatusSummary() { return statusSummary; }
    public boolean isHasRealIdentity() { return hasRealIdentity; }
    public int getMoodTrend() { return moodTrend; }
}

public class SymptomReport {
    private final String id;
    private final String studentId;
    private final String studentName;
    private final String className;
    private final String reporterId;
    private final String reporterName;
    private final List<SymptomType> symptoms;
    private final List<EmotionalExpression> emotions;
    private final DurationType duration;
    private final SeverityLevel severity;
    private final String description;
    private final boolean hasCommunicated;
    private final boolean hasContactedParent;
    private final LocalDateTime submittedAt;
    private final ReportStatus status;
    private final String assigneeId;
    private final String assigneeName;
    private final String processingOpinion;
    private final LocalDateTime processedAt;

    public SymptomReport(String studentId, String studentName, String className, String reporterId,
                         String reporterName, List<SymptomType> symptoms, List<EmotionalExpression> emotions,
                         DurationType duration, SeverityLevel severity, String description,
                         boolean hasCommunicated, boolean hasContactedParent, LocalDateTime submittedAt,
                         ReportStatus status) {
        this(UUID.randomUUID().toString(), studentId, studentName, className, reporterId, reporterName,
             symptoms, emotions, duration, severity, description, hasCommunicated, hasContactedParent,
             submittedAt, status, null, null, null, null);
    }

    public SymptomReport(String id, String studentId, String studentName, String className,
                         String reporterId, String reporterName, List<SymptomType> symptoms,
                         List<EmotionalExpression> emotions, DurationType duration,
                         SeverityLevel severity, String description, boolean hasCommunicated,
                         boolean hasContactedParent, LocalDateTime submittedAt, ReportStatus status,
                         String assigneeId, String assigneeName, String processingOpinion,
                         LocalDateTime processedAt) {
        this.id = id;
        this.studentId = studentId;
        this.studentName = studentName;
        this.className = className;
        this.reporterId = reporterId;
        this.reporterName = reporterName;
        this.symptoms = symptoms;
        this.emotions = emotions;
        this.duration = duration;
        this.severity = severity;
        this.description = description;
        this.hasCommunicated = hasCommunicated;
        this.hasContactedParent = hasContactedParent;
        this.submittedAt = submittedAt;
        this.status = status;
        this.assigneeId = assigneeId;
        this.assigneeName = assigneeName;
        this.processingOpinion = processingOpinion;
        this.processedAt = processedAt;
    }

    public RiskLevel getRiskLevel() {
        return severity.toRiskLevel();
    }

    public String getId() { return id; }
    public String getStudentId() { return studentId; }
    public String getStudentName() { return studentName; }
    public String getClassName() { return className; }
    public String getReporterId() { return reporterId; }
    public String getReporterName() { return reporterName; }
    public List<SymptomType> getSymptoms() { return symptoms; }
    public List<EmotionalExpression> getEmotions() { return emotions; }
    public DurationType getDuration() { return duration; }
    public SeverityLevel getSeverity() { return severity; }
    public String getDescription() { return description; }
    public boolean isHasCommunicated() { return hasCommunicated; }
    public boolean isHasContactedParent() { return hasContactedParent; }
    public LocalDateTime getSubmittedAt() { return submittedAt; }
    public ReportStatus getStatus() { return status; }
    public String getAssigneeId() { return assigneeId; }
    public String getAssigneeName() { return assigneeName; }
    public String getProcessingOpinion() { return processingOpinion; }
    public LocalDateTime getProcessedAt() { return processedAt; }
}

public class Alert {
    private final String id;
    private final String studentId;
    private final String studentName;
    private final String className;
    private final RiskLevel riskLevel;
    private final String triggerReason;
    private final LocalDateTime triggeredAt;
    private final boolean isRead;

    public Alert(String studentId, String studentName, String className, RiskLevel riskLevel,
                 String triggerReason, LocalDateTime triggeredAt) {
        this(UUID.randomUUID().toString(), studentId, studentName, className, riskLevel,
             triggerReason, triggeredAt, false);
    }

    public Alert(String id, String studentId, String studentName, String className,
                 RiskLevel riskLevel, String triggerReason, LocalDateTime triggeredAt, boolean isRead) {
        this.id = id;
        this.studentId = studentId;
        this.studentName = studentName;
        this.className = className;
        this.riskLevel = riskLevel;
        this.triggerReason = triggerReason;
        this.triggeredAt = triggeredAt;
        this.isRead = isRead;
    }

    public String getId() { return id; }
    public String getStudentId() { return studentId; }
    public String getStudentName() { return studentName; }
    public String getClassName() { return className; }
    public RiskLevel getRiskLevel() { return riskLevel; }
    public String getTriggerReason() { return triggerReason; }
    public LocalDateTime getTriggeredAt() { return triggeredAt; }
    public boolean isRead() { return isRead; }
}

public class TodoItem {
    private final String id;
    private final String title;
    private final String description;
    private final LocalDateTime deadline;
    private final boolean isCompleted;
    private final TodoType type;
    private final String relatedId;

    public TodoItem(String title, LocalDateTime deadline, TodoType type) {
        this(UUID.randomUUID().toString(), title, null, deadline, false, type, null);
    }

    public TodoItem(String id, String title, String description, LocalDateTime deadline,
                    boolean isCompleted, TodoType type, String relatedId) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.deadline = deadline;
        this.isCompleted = isCompleted;
        this.type = type;
        this.relatedId = relatedId;
    }

    public String getId() { return id; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public LocalDateTime getDeadline() { return deadline; }
    public boolean isCompleted() { return isCompleted; }
    public TodoType getType() { return type; }
    public String getRelatedId() { return relatedId; }
}

public class ChatMessage {
    private final String id;
    private final String senderId;
    private final String senderName;
    private final boolean isTeacher;
    private final String content;
    private final LocalDateTime sentAt;
    private final RiskLevel riskLevel;
    private final String strategyHint;

    public ChatMessage(String senderId, String senderName, boolean isTeacher, String content,
                       LocalDateTime sentAt) {
        this(UUID.randomUUID().toString(), senderId, senderName, isTeacher, content, sentAt, null, null);
    }

    public ChatMessage(String id, String senderId, String senderName, boolean isTeacher,
                       String content, LocalDateTime sentAt, RiskLevel riskLevel, String strategyHint) {
        this.id = id;
        this.senderId = senderId;
        this.senderName = senderName;
        this.isTeacher = isTeacher;
        this.content = content;
        this.sentAt = sentAt;
        this.riskLevel = riskLevel;
        this.strategyHint = strategyHint;
    }

    public String getId() { return id; }
    public String getSenderId() { return senderId; }
    public String getSenderName() { return senderName; }
    public boolean isTeacher() { return isTeacher; }
    public String getContent() { return content; }
    public LocalDateTime getSentAt() { return sentAt; }
    public RiskLevel getRiskLevel() { return riskLevel; }
    public String getStrategyHint() { return strategyHint; }
}

public class StudentChatSession {
    private final String id;
    private final String studentId;
    private final String studentName;
    private final String className;
    private final RiskLevel riskLevel;
    private final LocalDateTime lastActive;
    private final boolean isIntervening;
    private final List<ChatMessage> messages;

    public StudentChatSession(String studentId, String studentName, String className,
                              RiskLevel riskLevel, LocalDateTime lastActive, List<ChatMessage> messages) {
        this(UUID.randomUUID().toString(), studentId, studentName, className, riskLevel,
             lastActive, false, messages);
    }

    public StudentChatSession(String id, String studentId, String studentName, String className,
                              RiskLevel riskLevel, LocalDateTime lastActive, boolean isIntervening,
                              List<ChatMessage> messages) {
        this.id = id;
        this.studentId = studentId;
        this.studentName = studentName;
        this.className = className;
        this.riskLevel = riskLevel;
        this.lastActive = lastActive;
        this.isIntervening = isIntervening;
        this.messages = messages;
    }

    public String getId() { return id; }
    public String getStudentId() { return studentId; }
    public String getStudentName() { return studentName; }
    public String getClassName() { return className; }
    public RiskLevel getRiskLevel() { return riskLevel; }
    public LocalDateTime getLastActive() { return lastActive; }
    public boolean isIntervening() { return isIntervening; }
    public List<ChatMessage> getMessages() { return messages; }
}

public class TeacherMoodRecord {
    private final String id;
    private final int moodLevel;
    private final List<String> stressTags;
    private final LocalDateTime recordedAt;

    public TeacherMoodRecord(int moodLevel, List<String> stressTags, LocalDateTime recordedAt) {
        this(UUID.randomUUID().toString(), moodLevel, stressTags, recordedAt);
    }

    public TeacherMoodRecord(String id, int moodLevel, List<String> stressTags, LocalDateTime recordedAt) {
        this.id = id;
        this.moodLevel = moodLevel;
        this.stressTags = stressTags;
        this.recordedAt = recordedAt;
    }

    public String getMoodLabel() {
        switch (moodLevel) {
            case 1: return "很糟";
            case 2: return "不太好";
            case 3: return "一般";
            case 4: return "不错";
            case 5: return "很棒";
            default: return "一般";
        }
    }

    public String getMoodEmoji() {
        switch (moodLevel) {
            case 1: return "😢";
            case 2: return "😔";
            case 3: return "😐";
            case 4: return "🙂";
            case 5: return "😄";
            default: return "😐";
        }
    }

    public String getId() { return id; }
    public int getMoodLevel() { return moodLevel; }
    public List<String> getStressTags() { return stressTags; }
    public LocalDateTime getRecordedAt() { return recordedAt; }
}

public class SelfHelpRequest {
    private final String id;
    private final String teacherId;
    private final String teacherName;
    private final String description;
    private final String supportType;
    private final String urgency;
    private final LocalDateTime submittedAt;
    private final String counselorId;
    private final String counselorName;
    private final boolean isConnected;
    private final LocalDateTime connectedAt;

    public SelfHelpRequest(String teacherId, String teacherName, String description,
                           String supportType, String urgency, LocalDateTime submittedAt) {
        this(UUID.randomUUID().toString(), teacherId, teacherName, description, supportType,
             urgency, submittedAt, null, null, false, null);
    }

    public SelfHelpRequest(String id, String teacherId, String teacherName, String description,
                           String supportType, String urgency, LocalDateTime submittedAt,
                           String counselorId, String counselorName, boolean isConnected,
                           LocalDateTime connectedAt) {
        this.id = id;
        this.teacherId = teacherId;
        this.teacherName = teacherName;
        this.description = description;
        this.supportType = supportType;
        this.urgency = urgency;
        this.submittedAt = submittedAt;
        this.counselorId = counselorId;
        this.counselorName = counselorName;
        this.isConnected = isConnected;
        this.connectedAt = connectedAt;
    }

    public String getId() { return id; }
    public String getTeacherId() { return teacherId; }
    public String getTeacherName() { return teacherName; }
    public String getDescription() { return description; }
    public String getSupportType() { return supportType; }
    public String getUrgency() { return urgency; }
    public LocalDateTime getSubmittedAt() { return submittedAt; }
    public String getCounselorId() { return counselorId; }
    public String getCounselorName() { return counselorName; }
    public boolean isConnected() { return isConnected; }
    public LocalDateTime getConnectedAt() { return connectedAt; }
}

public class KnowledgeBaseItem {
    private final String id;
    private final String title;
    private final String category;
    private final String summary;
    private final String content;
    private final String author;
    private final LocalDateTime createdAt;
    private final boolean isProfessional;

    public KnowledgeBaseItem(String title, String category, String summary, String content,
                             String author, LocalDateTime createdAt) {
        this(UUID.randomUUID().toString(), title, category, summary, content, author, createdAt, false);
    }

    public KnowledgeBaseItem(String id, String title, String category, String summary, String content,
                             String author, LocalDateTime createdAt, boolean isProfessional) {
        this.id = id;
        this.title = title;
        this.category = category;
        this.summary = summary;
        this.content = content;
        this.author = author;
        this.createdAt = createdAt;
        this.isProfessional = isProfessional;
    }

    public String getId() { return id; }
    public String getTitle() { return title; }
    public String getCategory() { return category; }
    public String getSummary() { return summary; }
    public String getContent() { return content; }
    public String getAuthor() { return author; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public boolean isProfessional() { return isProfessional; }
}

public class InterventionRecord {
    private final String id;
    private final String studentId;
    private final String studentName;
    private final String counselorId;
    private final String counselorName;
    private final LocalDateTime startTime;
    private final LocalDateTime endTime;
    private final int messageCount;
    private final String interventionSummary;
    private final RiskLevel beforeRiskLevel;
    private final RiskLevel afterRiskLevel;
    private final boolean needsFollowup;
    private final String followupPlan;

    public InterventionRecord(String studentId, String studentName, String counselorId,
                              String counselorName, LocalDateTime startTime, LocalDateTime endTime,
                              int messageCount, String interventionSummary,
                              RiskLevel beforeRiskLevel, RiskLevel afterRiskLevel) {
        this(UUID.randomUUID().toString(), studentId, studentName, counselorId, counselorName,
             startTime, endTime, messageCount, interventionSummary, beforeRiskLevel, afterRiskLevel,
             false, null);
    }

    public InterventionRecord(String id, String studentId, String studentName, String counselorId,
                              String counselorName, LocalDateTime startTime, LocalDateTime endTime,
                              int messageCount, String interventionSummary,
                              RiskLevel beforeRiskLevel, RiskLevel afterRiskLevel,
                              boolean needsFollowup, String followupPlan) {
        this.id = id;
        this.studentId = studentId;
        this.studentName = studentName;
        this.counselorId = counselorId;
        this.counselorName = counselorName;
        this.startTime = startTime;
        this.endTime = endTime;
        this.messageCount = messageCount;
        this.interventionSummary = interventionSummary;
        this.beforeRiskLevel = beforeRiskLevel;
        this.afterRiskLevel = afterRiskLevel;
        this.needsFollowup = needsFollowup;
        this.followupPlan = followupPlan;
    }

    public String getId() { return id; }
    public String getStudentId() { return studentId; }
    public String getStudentName() { return studentName; }
    public String getCounselorId() { return counselorId; }
    public String getCounselorName() { return counselorName; }
    public LocalDateTime getStartTime() { return startTime; }
    public LocalDateTime getEndTime() { return endTime; }
    public int getMessageCount() { return messageCount; }
    public String getInterventionSummary() { return interventionSummary; }
    public RiskLevel getBeforeRiskLevel() { return beforeRiskLevel; }
    public RiskLevel getAfterRiskLevel() { return afterRiskLevel; }
    public boolean isNeedsFollowup() { return needsFollowup; }
    public String getFollowupPlan() { return followupPlan; }
}

public class EmotionalOverview {
    private final String className;
    private final int totalStudents;
    private final double averageMood;
    private final java.util.Map<String, Integer> moodDistribution;
    private final int highRiskCount;
    private final LocalDateTime updatedAt;

    public EmotionalOverview(String className, int totalStudents, double averageMood,
                             java.util.Map<String, Integer> moodDistribution, int highRiskCount,
                             LocalDateTime updatedAt) {
        this.className = className;
        this.totalStudents = totalStudents;
        this.averageMood = averageMood;
        this.moodDistribution = moodDistribution;
        this.highRiskCount = highRiskCount;
        this.updatedAt = updatedAt;
    }

    public String getClassName() { return className; }
    public int getTotalStudents() { return totalStudents; }
    public double getAverageMood() { return averageMood; }
    public java.util.Map<String, Integer> getMoodDistribution() { return moodDistribution; }
    public int getHighRiskCount() { return highRiskCount; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}

public class AuthorizationRequest {
    private final String id;
    private final String studentId;
    private final String studentName;
    private final String className;
    private final String counselorId;
    private final String counselorName;
    private final String scope;
    private final LocalDateTime expiresAt;
    private final LocalDateTime requestedAt;
    private final boolean isApproved;
    private final boolean isRevoked;

    public AuthorizationRequest(String studentId, String studentName, String className,
                                String counselorId, String counselorName, String scope,
                                LocalDateTime expiresAt, LocalDateTime requestedAt) {
        this(UUID.randomUUID().toString(), studentId, studentName, className, counselorId,
             counselorName, scope, expiresAt, requestedAt, false, false);
    }

    public AuthorizationRequest(String id, String studentId, String studentName, String className,
                                String counselorId, String counselorName, String scope,
                                LocalDateTime expiresAt, LocalDateTime requestedAt,
                                boolean isApproved, boolean isRevoked) {
        this.id = id;
        this.studentId = studentId;
        this.studentName = studentName;
        this.className = className;
        this.counselorId = counselorId;
        this.counselorName = counselorName;
        this.scope = scope;
        this.expiresAt = expiresAt;
        this.requestedAt = requestedAt;
        this.isApproved = isApproved;
        this.isRevoked = isRevoked;
    }

    public String getId() { return id; }
    public String getStudentId() { return studentId; }
    public String getStudentName() { return studentName; }
    public String getClassName() { return className; }
    public String getCounselorId() { return counselorId; }
    public String getCounselorName() { return counselorName; }
    public String getScope() { return scope; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public LocalDateTime getRequestedAt() { return requestedAt; }
    public boolean isApproved() { return isApproved; }
    public boolean isRevoked() { return isRevoked; }
}