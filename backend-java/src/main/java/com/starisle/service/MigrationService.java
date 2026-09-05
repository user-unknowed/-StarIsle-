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

/**
 * 数据迁移服务
 * 将源数据库中的用户、心情记录、聊天消息、测评结果、紧急预警、
 * 家长用户与亲子绑定数据迁移至目标 JPA 仓库，并提供数据一致性校验与校验和计算能力。
 */
@Service
public class MigrationService {

    /** 源数据库 JDBC 模板，注入名为 sourceJdbcTemplate 的 Bean */
    @Autowired
    @Qualifier("sourceJdbcTemplate")
    private JdbcTemplate sourceJdbcTemplate;

    /** 目标数据库 JDBC 模板，默认注入主数据源模板 */
    @Autowired
    private JdbcTemplate targetJdbcTemplate;

    /** 用户仓库，用于持久化迁移后的用户数据 */
    @Autowired
    private UserRepository userRepository;

    /** 心情记录仓库，用于持久化迁移后的心情打卡数据 */
    @Autowired
    private MoodRecordRepository moodRecordRepository;

    /** 聊天消息仓库，用于持久化迁移后的对话记录 */
    @Autowired
    private ChatMessageRepository chatMessageRepository;

    /** 测评结果仓库，用于持久化迁移后的心理测评数据 */
    @Autowired
    private AssessmentResultRepository assessmentResultRepository;

    /** 紧急预警仓库，用于持久化迁移后的预警数据 */
    @Autowired
    private EmergencyAlertRepository emergencyAlertRepository;

    /** 家长用户仓库，用于持久化迁移后的家长账号数据 */
    @Autowired
    private ParentUserRepository parentUserRepository;

    /** 亲子绑定仓库，用于持久化迁移后的家长-学生绑定关系 */
    @Autowired
    private ParentStudentBindingRepository parentStudentBindingRepository;

    /** JPA 实体管理器，用于事务内批量操作 */
    @PersistenceContext
    private EntityManager entityManager;

    /** 校验和计算所用的哈希算法 */
    private static final String HASH_ALGORITHM = "SHA-256";

    /**
     * 迁移全部业务数据
     * 依次迁移各业务表数据并累加迁移行数；任一异常将状态置为失败并抛出运行时异常。
     *
     * @return 迁移结果对象，包含迁移标识、起止时间、状态与影响行数
     */
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

    /**
     * 迁移用户数据
     * 从源库查询用户记录并逐条转换保存至目标仓库，单条失败会记录错误但不会中断整体迁移。
     *
     * @param result 迁移结果对象，用于累计错误
     * @return 成功迁移的行数
     */
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

    /**
     * 迁移心情打卡数据
     * 从源库查询心情记录并逐条转换保存至目标仓库，缺失标签字段初始化为空列表。
     *
     * @param result 迁移结果对象，用于累计错误
     * @return 成功迁移的行数
     */
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

    /**
     * 迁移聊天消息数据
     * 从源库查询对话消息并逐条转换保存至目标仓库。
     *
     * @param result 迁移结果对象，用于累计错误
     * @return 成功迁移的行数
     */
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

    /**
     * 迁移测评结果数据
     * 从源库查询测评记录并逐条转换保存至目标仓库。
     *
     * @param result 迁移结果对象，用于累计错误
     * @return 成功迁移的行数
     */
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

    /**
     * 迁移紧急预警数据
     * 从源库查询预警记录并逐条转换保存至目标仓库。
     *
     * @param result 迁移结果对象，用于累计错误
     * @return 成功迁移的行数
     */
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

    /**
     * 迁移家长用户数据
     * 从源库查询家长账号并逐条转换保存至目标仓库。
     *
     * @param result 迁移结果对象，用于累计错误
     * @return 成功迁移的行数
     */
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

    /**
     * 迁移亲子绑定数据
     * 从源库查询家长-学生绑定关系并逐条转换保存至目标仓库。
     *
     * @param result 迁移结果对象，用于累计错误
     * @return 成功迁移的行数
     */
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

    /**
     * 校验数据一致性
     * 对比源库与目标库各业务表的记录总数，生成一致性报告。
     *
     * @return 数据一致性报告
     */
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

    /**
     * 计算表数据校验和
     * 通过 CRC32 聚合全表数据并取 SHA-256 摘要作为校验和，用于核对源库完整性。
     *
     * @param tableName 表名
     * @return 十六进制校验和字符串
     */
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

    /**
     * 字节数组转十六进制字符串
     *
     * @param bytes 字节数组
     * @return 小写十六进制字符串
     */
    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    /**
     * 从行 Map 获取字符串
     *
     * @param row 行数据
     * @param key 字段名
     * @return 字段字符串值，缺失返回 null
     */
    private String getString(Map<String, Object> row, String key) {
        return getString(row, key, null);
    }

    /**
     * 从行 Map 获取字符串
     *
     * @param row          行数据
     * @param key          字段名
     * @param defaultValue 缺失时的默认值
     * @return 字段字符串值或默认值
     */
    private String getString(Map<String, Object> row, String key, String defaultValue) {
        Object value = row.get(key);
        if (value == null) return defaultValue;
        return String.valueOf(value);
    }

    /**
     * 从行 Map 获取整数
     *
     * @param row 行数据
     * @param key 字段名
     * @return 字段整数值，缺失返回 null
     */
    private Integer getInteger(Map<String, Object> row, String key) {
        return getInteger(row, key, null);
    }

    /**
     * 从行 Map 获取整数
     * 兼容 Integer、Long 与字符串数字解析失败的情况。
     *
     * @param row          行数据
     * @param key          字段名
     * @param defaultValue 缺失时的默认值
     * @return 字段整数值或默认值
     */
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

    /**
     * 从行 Map 获取长整型
     * 兼容 Long、Integer 与字符串数字解析失败的情况。
     *
     * @param row 行数据
     * @param key 字段名
     * @return 字段长整型值，缺失或解析失败返回 null
     */
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

    /**
     * 从行 Map 获取布尔值
     *
     * @param row 行数据
     * @param key 字段名
     * @return 字段布尔值，缺失返回 null
     */
    private Boolean getBoolean(Map<String, Object> row, String key) {
        return getBoolean(row, key, null);
    }

    /**
     * 从行 Map 获取布尔值
     * 兼容 Boolean、Integer（1 为 true）与字符串解析。
     *
     * @param row          行数据
     * @param key          字段名
     * @param defaultValue 缺失时的默认值
     * @return 字段布尔值或默认值
     */
    private Boolean getBoolean(Map<String, Object> row, String key, Boolean defaultValue) {
        Object value = row.get(key);
        if (value == null) return defaultValue;
        if (value instanceof Boolean) return (Boolean) value;
        if (value instanceof Integer) return ((Integer) value) == 1;
        return Boolean.parseBoolean(String.valueOf(value));
    }

    /**
     * 从行 Map 获取本地日期时间
     * 兼容 LocalDateTime、Timestamp 与 Date 类型。
     *
     * @param row 行数据
     * @param key 字段名
     * @return 字段本地日期时间值，缺失或类型不支持返回 null
     */
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

    /**
     * 从行 Map 获取本地日期
     * 兼容 LocalDate、Timestamp、Date 与字符串解析，缺失默认返回当前日期。
     *
     * @param row 行数据
     * @param key 字段名
     * @return 字段本地日期值
     */
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

    /**
     * 迁移结果
     * 记录一次迁移任务的标识、起止时间、状态、影响行数、错误信息与错误明细列表。
     */
    public static class MigrationResult {
        /** 迁移任务唯一标识 */
        private String migrationId;
        /** 迁移开始时间 */
        private LocalDateTime startTime;
        /** 迁移结束时间 */
        private LocalDateTime endTime;
        /** 迁移状态：running、success、failed */
        private String status;
        /** 本次迁移影响的总行数 */
        private long affectedRows;
        /** 失败时的错误信息 */
        private String errorMessage;
        /** 迁移过程中收集的错误明细 */
        private List<MigrationError> errors = new ArrayList<>();

        /**
         * 新增错误明细
         *
         * @param table      发生错误的表名
         * @param identifier 出错记录的标识
         * @param message    错误信息
         */
        public void addError(String table, String identifier, String message) {
            errors.add(new MigrationError(table, identifier, message));
        }

        /** @return 迁移标识 */
        public String getMigrationId() { return migrationId; }
        /** @param migrationId 迁移标识 */
        public void setMigrationId(String migrationId) { this.migrationId = migrationId; }
        /** @return 开始时间 */
        public LocalDateTime getStartTime() { return startTime; }
        /** @param startTime 开始时间 */
        public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }
        /** @return 结束时间 */
        public LocalDateTime getEndTime() { return endTime; }
        /** @param endTime 结束时间 */
        public void setEndTime(LocalDateTime endTime) { this.endTime = endTime; }
        /** @return 迁移状态 */
        public String getStatus() { return status; }
        /** @param status 迁移状态 */
        public void setStatus(String status) { this.status = status; }
        /** @return 影响行数 */
        public long getAffectedRows() { return affectedRows; }
        /** @param affectedRows 影响行数 */
        public void setAffectedRows(long affectedRows) { this.affectedRows = affectedRows; }
        /** @return 错误信息 */
        public String getErrorMessage() { return errorMessage; }
        /** @param errorMessage 错误信息 */
        public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
        /** @return 错误明细列表 */
        public List<MigrationError> getErrors() { return errors; }
        /** @param errors 错误明细列表 */
        public void setErrors(List<MigrationError> errors) { this.errors = errors; }
    }

    /**
     * 迁移错误明细
     * 描述单条数据迁移失败时的表名、记录标识与错误信息。
     */
    public static class MigrationError {
        /** 发生错误的表名 */
        private String table;
        /** 出错记录的标识 */
        private String identifier;
        /** 错误信息 */
        private String message;

        /**
         * 构造方法
         *
         * @param table      表名
         * @param identifier 记录标识
         * @param message    错误信息
         */
        public MigrationError(String table, String identifier, String message) {
            this.table = table;
            this.identifier = identifier;
            this.message = message;
        }

        /** @return 表名 */
        public String getTable() { return table; }
        /** @param table 表名 */
        public void setTable(String table) { this.table = table; }
        /** @return 记录标识 */
        public String getIdentifier() { return identifier; }
        /** @param identifier 记录标识 */
        public void setIdentifier(String identifier) { this.identifier = identifier; }
        /** @return 错误信息 */
        public String getMessage() { return message; }
        /** @param message 错误信息 */
        public void setMessage(String message) { this.message = message; }
    }

    /**
     * 数据一致性报告
     * 汇总各业务表源库与目标库记录数对比结果，标识是否全部一致。
     */
    public static class DataConsistencyReport {
        /** 各表校验结果列表 */
        private List<TableCheck> tableChecks = new ArrayList<>();
        /** 是否所有表均一致 */
        private boolean allConsistent = true;

        /**
         * 新增表校验结果
         *
         * @param tableName   表名
         * @param sourceCount 源库记录数
         * @param targetCount 目标库记录数
         */
        public void addTableCheck(String tableName, Long sourceCount, Long targetCount) {
            boolean consistent = Objects.equals(sourceCount, targetCount);
            tableChecks.add(new TableCheck(tableName, sourceCount, targetCount, consistent));
            if (!consistent) {
                allConsistent = false;
            }
        }

        /** @return 各表校验结果列表 */
        public List<TableCheck> getTableChecks() { return tableChecks; }
        /** @param tableChecks 各表校验结果列表 */
        public void setTableChecks(List<TableCheck> tableChecks) { this.tableChecks = tableChecks; }
        /** @return 是否全部一致 */
        public boolean isAllConsistent() { return allConsistent; }
        /** @param allConsistent 是否全部一致 */
        public void setAllConsistent(boolean allConsistent) { this.allConsistent = allConsistent; }
    }

    /**
     * 表校验结果
     * 描述单个表的源库记录数、目标库记录数与一致性结论。
     */
    public static class TableCheck {
        /** 表名 */
        private String tableName;
        /** 源库记录数 */
        private Long sourceCount;
        /** 目标库记录数 */
        private Long targetCount;
        /** 是否一致 */
        private boolean consistent;

        /**
         * 构造方法
         *
         * @param tableName   表名
         * @param sourceCount 源库记录数
         * @param targetCount 目标库记录数
         * @param consistent  是否一致
         */
        public TableCheck(String tableName, Long sourceCount, Long targetCount, boolean consistent) {
            this.tableName = tableName;
            this.sourceCount = sourceCount;
            this.targetCount = targetCount;
            this.consistent = consistent;
        }

        /** @return 表名 */
        public String getTableName() { return tableName; }
        /** @param tableName 表名 */
        public void setTableName(String tableName) { this.tableName = tableName; }
        /** @return 源库记录数 */
        public Long getSourceCount() { return sourceCount; }
        /** @param sourceCount 源库记录数 */
        public void setSourceCount(Long sourceCount) { this.sourceCount = sourceCount; }
        /** @return 目标库记录数 */
        public Long getTargetCount() { return targetCount; }
        /** @param targetCount 目标库记录数 */
        public void setTargetCount(Long targetCount) { this.targetCount = targetCount; }
        /** @return 是否一致 */
        public boolean isConsistent() { return consistent; }
        /** @param consistent 是否一致 */
        public void setConsistent(boolean consistent) { this.consistent = consistent; }
    }
}
