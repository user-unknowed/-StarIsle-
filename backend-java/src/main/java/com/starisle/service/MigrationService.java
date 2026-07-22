package com.starisle.service;

import com.starisle.entity.*;
import com.starisle.repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;

@Service
public class MigrationService {

    @Autowired
    @Qualifier("sourceJdbcTemplate")
    private JdbcTemplate sourceJdbcTemplate;

    @Autowired
    private JdbcTemplate targetJdbcTemplate;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MoodRecordRepository moodRecordRepository;

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private AssessmentResultRepository assessmentResultRepository;

    @Autowired
    private EmergencyAlertRepository emergencyAlertRepository;

    @Autowired
    private ParentUserRepository parentUserRepository;

    @Autowired
    private ParentStudentBindingRepository parentStudentBindingRepository;

    @PersistenceContext
    private EntityManager entityManager;

    private static final String HASH_ALGORITHM = "SHA-256";

    public MigrationResult migrateAllData() {
        MigrationResult result = new MigrationResult();
        result.setMigrationId(UUID.randomUUID().toString());
        result.setStartTime(LocalDateTime.now());
        result.setStatus("running");

        try {
            long totalRows = 0;

            totalRows += migrateUsers(result);
            totalRows += migrateMoodRecords(result);
            totalRows += migrateChatMessages(result);
            totalRows += migrateAssessmentResults(result);
            totalRows += migrateEmergencyAlerts(result);
            totalRows += migrateParentUsers(result);
            totalRows += migrateParentStudentBindings(result);

            result.setAffectedRows(totalRows);
            result.setStatus("success");
            result.setEndTime(LocalDateTime.now());

        } catch (Exception e) {
            result.setStatus("failed");
            result.setErrorMessage(e.getMessage());
            result.setEndTime(LocalDateTime.now());
            throw new RuntimeException("数据迁移失败", e);
        }

        return result;
    }

    @Transactional
    public long migrateUsers(MigrationResult result) {
        List<Map<String, Object>> sourceUsers = sourceJdbcTemplate.queryForList(
                "SELECT id, username, password_hash, nickname, avatar, age_group, role, " +
                "class_id, school_name, created_at, updated_at, last_login_at, is_active FROM users");

        int migrated = 0;
        for (Map<String, Object> row : sourceUsers) {
            try {
                User user = User.builder()
                        .id(getString(row, "id", UUID.randomUUID().toString()))
                        .username(getString(row, "username"))
                        .passwordHash(getString(row, "password_hash"))
                        .nickname(getString(row, "nickname"))
                        .avatar(getString(row, "avatar"))
                        .ageGroup(getString(row, "age_group"))
                        .role(getString(row, "role", "student"))
                        .classId(getString(row, "class_id"))
                        .schoolName(getString(row, "school_name"))
                        .createdAt(getLocalDateTime(row, "created_at"))
                        .updatedAt(getLocalDateTime(row, "updated_at"))
                        .lastLoginAt(getLocalDateTime(row, "last_login_at"))
                        .isActive(getBoolean(row, "is_active", true))
                        .build();

                userRepository.save(user);
                migrated++;
            } catch (Exception e) {
                result.addError("users", getString(row, "username"), e.getMessage());
            }
        }
        return migrated;
    }

    @Transactional
    public long migrateMoodRecords(MigrationResult result) {
        List<Map<String, Object>> sourceRecords = sourceJdbcTemplate.queryForList(
                "SELECT id, user_id, mood_level, checkin_date, note, created_at FROM mood_records");

        int migrated = 0;
        for (Map<String, Object> row : sourceRecords) {
            try {
                MoodRecord record = MoodRecord.builder()
                        .id(getString(row, "id", UUID.randomUUID().toString()))
                        .userId(getString(row, "user_id"))
                        .moodLevel(getInteger(row, "mood_level", 3))
                        .checkinDate(getLocalDate(row, "checkin_date"))
                        .note(getString(row, "note"))
                        .createdAt(getLocalDateTime(row, "created_at"))
                        .tags(new ArrayList<>())
                        .build();

                moodRecordRepository.save(record);
                migrated++;
            } catch (Exception e) {
                result.addError("mood_records", getString(row, "id"), e.getMessage());
            }
        }
        return migrated;
    }

    @Transactional
    public long migrateChatMessages(MigrationResult result) {
        List<Map<String, Object>> sourceMessages = sourceJdbcTemplate.queryForList(
                "SELECT id, user_id, role, content, message_type, risk_level, response_time_ms, created_at FROM chat_messages");

        int migrated = 0;
        for (Map<String, Object> row : sourceMessages) {
            try {
                ChatMessage message = ChatMessage.builder()
                        .id(getString(row, "id", UUID.randomUUID().toString()))
                        .userId(getString(row, "user_id"))
                        .role(getString(row, "role", "user"))
                        .content(getString(row, "content", ""))
                        .messageType(getString(row, "message_type"))
                        .riskLevel(getString(row, "risk_level"))
                        .responseTimeMs(getLong(row, "response_time_ms"))
                        .createdAt(getLocalDateTime(row, "created_at"))
                        .build();

                chatMessageRepository.save(message);
                migrated++;
            } catch (Exception e) {
                result.addError("chat_messages", getString(row, "id"), e.getMessage());
            }
        }
        return migrated;
    }

    @Transactional
    public long migrateAssessmentResults(MigrationResult result) {
        List<Map<String, Object>> sourceResults = sourceJdbcTemplate.queryForList(
                "SELECT id, user_id, type, total_score, risk_level, description, answers_json, created_at FROM assessment_results");

        int migrated = 0;
        for (Map<String, Object> row : sourceResults) {
            try {
                AssessmentResult resultEntity = AssessmentResult.builder()
                        .id(getString(row, "id", UUID.randomUUID().toString()))
                        .userId(getString(row, "user_id"))
                        .type(getString(row, "type", ""))
                        .totalScore(getInteger(row, "total_score", 0))
                        .riskLevel(getString(row, "risk_level", "green"))
                        .description(getString(row, "description"))
                        .answersJson(getString(row, "answers_json"))
                        .createdAt(getLocalDateTime(row, "created_at"))
                        .build();

                assessmentResultRepository.save(resultEntity);
                migrated++;
            } catch (Exception e) {
                result.addError("assessment_results", getString(row, "id"), e.getMessage());
            }
        }
        return migrated;
    }

    @Transactional
    public long migrateEmergencyAlerts(MigrationResult result) {
        List<Map<String, Object>> sourceAlerts = sourceJdbcTemplate.queryForList(
                "SELECT id, student_id, parent_id, trigger_source, risk_level, status, confirmed_at, description, triggered_at, created_at FROM emergency_alerts");

        int migrated = 0;
        for (Map<String, Object> row : sourceAlerts) {
            try {
                EmergencyAlert alert = EmergencyAlert.builder()
                        .id(getString(row, "id", UUID.randomUUID().toString()))
                        .studentId(getString(row, "student_id"))
                        .parentId(getString(row, "parent_id"))
                        .triggerSource(getString(row, "trigger_source", "system"))
                        .riskLevel(getString(row, "risk_level", "red"))
                        .status(getString(row, "status", "pending"))
                        .confirmedAt(getLocalDateTime(row, "confirmed_at"))
                        .description(getString(row, "description"))
                        .triggeredAt(getLocalDateTime(row, "triggered_at"))
                        .createdAt(getLocalDateTime(row, "created_at"))
                        .build();

                emergencyAlertRepository.save(alert);
                migrated++;
            } catch (Exception e) {
                result.addError("emergency_alerts", getString(row, "id"), e.getMessage());
            }
        }
        return migrated;
    }

    @Transactional
    public long migrateParentUsers(MigrationResult result) {
        List<Map<String, Object>> sourceParents = sourceJdbcTemplate.queryForList(
                "SELECT id, phone, password_hash, nickname, avatar, created_at, updated_at, last_login_at, is_active FROM parent_users");

        int migrated = 0;
        for (Map<String, Object> row : sourceParents) {
            try {
                ParentUser parent = ParentUser.builder()
                        .id(getString(row, "id", UUID.randomUUID().toString()))
                        .phone(getString(row, "phone"))
                        .passwordHash(getString(row, "password_hash"))
                        .nickname(getString(row, "nickname"))
                        .avatar(getString(row, "avatar"))
                        .createdAt(getLocalDateTime(row, "created_at"))
                        .updatedAt(getLocalDateTime(row, "updated_at"))
                        .lastLoginAt(getLocalDateTime(row, "last_login_at"))
                        .isActive(getBoolean(row, "is_active", true))
                        .build();

                parentUserRepository.save(parent);
                migrated++;
            } catch (Exception e) {
                result.addError("parent_users", getString(row, "phone"), e.getMessage());
            }
        }
        return migrated;
    }

    @Transactional
    public long migrateParentStudentBindings(MigrationResult result) {
        List<Map<String, Object>> sourceBindings = sourceJdbcTemplate.queryForList(
                "SELECT id, parent_id, student_id, bind_type, authorized, authorized_at, " +
                "student_nickname, student_avatar, latest_mood, risk_level, last_checkin_date, created_at, updated_at FROM parent_student_bindings");

        int migrated = 0;
        for (Map<String, Object> row : sourceBindings) {
            try {
                ParentStudentBinding binding = ParentStudentBinding.builder()
                        .id(getString(row, "id", UUID.randomUUID().toString()))
                        .parentId(getString(row, "parent_id"))
                        .studentId(getString(row, "student_id"))
                        .bindType(getString(row, "bind_type", "scan"))
                        .authorized(getBoolean(row, "authorized", false))
                        .authorizedAt(getLocalDateTime(row, "authorized_at"))
                        .studentNickname(getString(row, "student_nickname"))
                        .studentAvatar(getString(row, "student_avatar"))
                        .latestMood(getInteger(row, "latest_mood", 3))
                        .riskLevel(getString(row, "risk_level", "green"))
                        .lastCheckinDate(getString(row, "last_checkin_date"))
                        .createdAt(getLocalDateTime(row, "created_at"))
                        .updatedAt(getLocalDateTime(row, "updated_at"))
                        .build();

                parentStudentBindingRepository.save(binding);
                migrated++;
            } catch (Exception e) {
                result.addError("parent_student_bindings", getString(row, "id"), e.getMessage());
            }
        }
        return migrated;
    }

    public DataConsistencyReport verifyDataConsistency() {
        DataConsistencyReport report = new DataConsistencyReport();

        report.addTableCheck("users", 
                sourceJdbcTemplate.queryForObject("SELECT COUNT(*) FROM users", Long.class),
                userRepository.count());

        report.addTableCheck("mood_records",
                sourceJdbcTemplate.queryForObject("SELECT COUNT(*) FROM mood_records", Long.class),
                moodRecordRepository.count());

        report.addTableCheck("chat_messages",
                sourceJdbcTemplate.queryForObject("SELECT COUNT(*) FROM chat_messages", Long.class),
                chatMessageRepository.count());

        report.addTableCheck("assessment_results",
                sourceJdbcTemplate.queryForObject("SELECT COUNT(*) FROM assessment_results", Long.class),
                assessmentResultRepository.count());

        report.addTableCheck("emergency_alerts",
                sourceJdbcTemplate.queryForObject("SELECT COUNT(*) FROM emergency_alerts", Long.class),
                emergencyAlertRepository.count());

        report.addTableCheck("parent_users",
                sourceJdbcTemplate.queryForObject("SELECT COUNT(*) FROM parent_users", Long.class),
                parentUserRepository.count());

        report.addTableCheck("parent_student_bindings",
                sourceJdbcTemplate.queryForObject("SELECT COUNT(*) FROM parent_student_bindings", Long.class),
                parentStudentBindingRepository.count());

        return report;
    }

    public String calculateChecksum(String tableName) {
        try {
            String query = "SELECT COALESCE(SUM(ABS(CRC32(CONCAT_WS('|', *)))), 0) FROM " + tableName;
            Long crc = sourceJdbcTemplate.queryForObject(query, Long.class);
            MessageDigest digest = MessageDigest.getInstance(HASH_ALGORITHM);
            byte[] hash = digest.digest(String.valueOf(crc).getBytes());
            return bytesToHex(hash);
        } catch (NoSuchAlgorithmException e) {
            return UUID.randomUUID().toString();
        }
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    private String getString(Map<String, Object> row, String key) {
        return getString(row, key, null);
    }

    private String getString(Map<String, Object> row, String key, String defaultValue) {
        Object value = row.get(key);
        if (value == null) return defaultValue;
        return String.valueOf(value);
    }

    private Integer getInteger(Map<String, Object> row, String key) {
        return getInteger(row, key, null);
    }

    private Integer getInteger(Map<String, Object> row, String key, Integer defaultValue) {
        Object value = row.get(key);
        if (value == null) return defaultValue;
        if (value instanceof Integer) return (Integer) value;
        if (value instanceof Long) return ((Long) value).intValue();
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    private Long getLong(Map<String, Object> row, String key) {
        Object value = row.get(key);
        if (value == null) return null;
        if (value instanceof Long) return (Long) value;
        if (value instanceof Integer) return ((Integer) value).longValue();
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Boolean getBoolean(Map<String, Object> row, String key) {
        return getBoolean(row, key, null);
    }

    private Boolean getBoolean(Map<String, Object> row, String key, Boolean defaultValue) {
        Object value = row.get(key);
        if (value == null) return defaultValue;
        if (value instanceof Boolean) return (Boolean) value;
        if (value instanceof Integer) return ((Integer) value) == 1;
        return Boolean.parseBoolean(String.valueOf(value));
    }

    private LocalDateTime getLocalDateTime(Map<String, Object> row, String key) {
        Object value = row.get(key);
        if (value == null) return null;
        if (value instanceof LocalDateTime) return (LocalDateTime) value;
        if (value instanceof Timestamp) {
            return ((Timestamp) value).toLocalDateTime();
        }
        if (value instanceof Date) {
            return ((Date) value).toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime();
        }
        return null;
    }

    private LocalDate getLocalDate(Map<String, Object> row, String key) {
        Object value = row.get(key);
        if (value == null) return LocalDate.now();
        if (value instanceof LocalDate) return (LocalDate) value;
        if (value instanceof Timestamp) {
            return ((Timestamp) value).toLocalDateTime().toLocalDate();
        }
        if (value instanceof Date) {
            return ((Date) value).toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
        }
        try {
            return LocalDate.parse(String.valueOf(value));
        } catch (Exception e) {
            return LocalDate.now();
        }
    }

    public static class MigrationResult {
        private String migrationId;
        private LocalDateTime startTime;
        private LocalDateTime endTime;
        private String status;
        private long affectedRows;
        private String errorMessage;
        private List<MigrationError> errors = new ArrayList<>();

        public void addError(String table, String identifier, String message) {
            errors.add(new MigrationError(table, identifier, message));
        }

        public String getMigrationId() { return migrationId; }
        public void setMigrationId(String migrationId) { this.migrationId = migrationId; }
        public LocalDateTime getStartTime() { return startTime; }
        public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }
        public LocalDateTime getEndTime() { return endTime; }
        public void setEndTime(LocalDateTime endTime) { this.endTime = endTime; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public long getAffectedRows() { return affectedRows; }
        public void setAffectedRows(long affectedRows) { this.affectedRows = affectedRows; }
        public String getErrorMessage() { return errorMessage; }
        public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
        public List<MigrationError> getErrors() { return errors; }
        public void setErrors(List<MigrationError> errors) { this.errors = errors; }
    }

    public static class MigrationError {
        private String table;
        private String identifier;
        private String message;

        public MigrationError(String table, String identifier, String message) {
            this.table = table;
            this.identifier = identifier;
            this.message = message;
        }

        public String getTable() { return table; }
        public void setTable(String table) { this.table = table; }
        public String getIdentifier() { return identifier; }
        public void setIdentifier(String identifier) { this.identifier = identifier; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
    }

    public static class DataConsistencyReport {
        private List<TableCheck> tableChecks = new ArrayList<>();
        private boolean allConsistent = true;

        public void addTableCheck(String tableName, Long sourceCount, Long targetCount) {
            boolean consistent = Objects.equals(sourceCount, targetCount);
            tableChecks.add(new TableCheck(tableName, sourceCount, targetCount, consistent));
            if (!consistent) {
                allConsistent = false;
            }
        }

        public List<TableCheck> getTableChecks() { return tableChecks; }
        public void setTableChecks(List<TableCheck> tableChecks) { this.tableChecks = tableChecks; }
        public boolean isAllConsistent() { return allConsistent; }
        public void setAllConsistent(boolean allConsistent) { this.allConsistent = allConsistent; }
    }

    public static class TableCheck {
        private String tableName;
        private Long sourceCount;
        private Long targetCount;
        private boolean consistent;

        public TableCheck(String tableName, Long sourceCount, Long targetCount, boolean consistent) {
            this.tableName = tableName;
            this.sourceCount = sourceCount;
            this.targetCount = targetCount;
            this.consistent = consistent;
        }

        public String getTableName() { return tableName; }
        public void setTableName(String tableName) { this.tableName = tableName; }
        public Long getSourceCount() { return sourceCount; }
        public void setSourceCount(Long sourceCount) { this.sourceCount = sourceCount; }
        public Long getTargetCount() { return targetCount; }
        public void setTargetCount(Long targetCount) { this.targetCount = targetCount; }
        public boolean isConsistent() { return consistent; }
        public void setConsistent(boolean consistent) { this.consistent = consistent; }
    }
}
