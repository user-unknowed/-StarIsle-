package com.starisle.service;

import com.starisle.entity.*;
import com.starisle.repository.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * 数据迁移服务测试
 * 覆盖校验和计算、一致性报告、迁移结果结构与错误收集、
 * 以及用户、心情、聊天消息等数据迁移场景。
 */
@ExtendWith(MockitoExtension.class)
public class MigrationServiceTest {

    /** 源数据库 JDBC 模板 Mock */
    @Mock
    private JdbcTemplate sourceJdbcTemplate;

    /** 目标数据库 JDBC 模板 Mock */
    @Mock
    private JdbcTemplate targetJdbcTemplate;

    /** 用户仓库 Mock */
    @Mock
    private UserRepository userRepository;

    /** 心情记录仓库 Mock */
    @Mock
    private MoodRecordRepository moodRecordRepository;

    /** 聊天消息仓库 Mock */
    @Mock
    private ChatMessageRepository chatMessageRepository;

    /** 测评结果仓库 Mock */
    @Mock
    private AssessmentResultRepository assessmentResultRepository;

    /** 紧急预警仓库 Mock */
    @Mock
    private EmergencyAlertRepository emergencyAlertRepository;

    /** 家长用户仓库 Mock */
    @Mock
    private ParentUserRepository parentUserRepository;

    /** 亲子绑定仓库 Mock */
    @Mock
    private ParentStudentBindingRepository parentStudentBindingRepository;

    /** 待测迁移服务，依赖注入上述 Mock */
    @InjectMocks
    private MigrationService migrationService;

    /**
     * 测试计算表校验和，结果应为 64 位十六进制
     */
    @Test
    @DisplayName("测试计算校验和")
    void testCalculateChecksum() {
        when(sourceJdbcTemplate.queryForObject(anyString(), eq(Long.class)))
                .thenReturn(1234567890L);

        String checksum = migrationService.calculateChecksum("users");

        assertNotNull(checksum);
        assertFalse(checksum.isEmpty());
        assertEquals(64, checksum.length());
    }

    /**
     * 测试所有表记录数一致时报告显示全部一致
     */
    @Test
    @DisplayName("测试验证数据一致性报告")
    void testVerifyDataConsistency() {
        when(sourceJdbcTemplate.queryForObject("SELECT COUNT(*) FROM users", Long.class))
                .thenReturn(10L);
        when(userRepository.count()).thenReturn(10L);

        when(sourceJdbcTemplate.queryForObject("SELECT COUNT(*) FROM mood_records", Long.class))
                .thenReturn(100L);
        when(moodRecordRepository.count()).thenReturn(100L);

        when(sourceJdbcTemplate.queryForObject("SELECT COUNT(*) FROM chat_messages", Long.class))
                .thenReturn(500L);
        when(chatMessageRepository.count()).thenReturn(500L);

        when(sourceJdbcTemplate.queryForObject("SELECT COUNT(*) FROM assessment_results", Long.class))
                .thenReturn(50L);
        when(assessmentResultRepository.count()).thenReturn(50L);

        when(sourceJdbcTemplate.queryForObject("SELECT COUNT(*) FROM emergency_alerts", Long.class))
                .thenReturn(5L);
        when(emergencyAlertRepository.count()).thenReturn(5L);

        when(sourceJdbcTemplate.queryForObject("SELECT COUNT(*) FROM parent_users", Long.class))
                .thenReturn(20L);
        when(parentUserRepository.count()).thenReturn(20L);

        when(sourceJdbcTemplate.queryForObject("SELECT COUNT(*) FROM parent_student_bindings", Long.class))
                .thenReturn(15L);
        when(parentStudentBindingRepository.count()).thenReturn(15L);

        MigrationService.DataConsistencyReport report = migrationService.verifyDataConsistency();

        assertNotNull(report);
        assertTrue(report.isAllConsistent());
        assertEquals(7, report.getTableChecks().size());
    }

    /**
     * 测试用户表记录数不一致时报告标识不一致
     */
    @Test
    @DisplayName("测试数据不一致时报告显示不一致")
    void testDataInconsistencyReport() {
        when(sourceJdbcTemplate.queryForObject("SELECT COUNT(*) FROM users", Long.class))
                .thenReturn(10L);
        when(userRepository.count()).thenReturn(9L);

        when(sourceJdbcTemplate.queryForObject("SELECT COUNT(*) FROM mood_records", Long.class))
                .thenReturn(100L);
        when(moodRecordRepository.count()).thenReturn(100L);

        when(sourceJdbcTemplate.queryForObject("SELECT COUNT(*) FROM chat_messages", Long.class))
                .thenReturn(500L);
        when(chatMessageRepository.count()).thenReturn(500L);

        when(sourceJdbcTemplate.queryForObject("SELECT COUNT(*) FROM assessment_results", Long.class))
                .thenReturn(50L);
        when(assessmentResultRepository.count()).thenReturn(50L);

        when(sourceJdbcTemplate.queryForObject("SELECT COUNT(*) FROM emergency_alerts", Long.class))
                .thenReturn(5L);
        when(emergencyAlertRepository.count()).thenReturn(5L);

        when(sourceJdbcTemplate.queryForObject("SELECT COUNT(*) FROM parent_users", Long.class))
                .thenReturn(20L);
        when(parentUserRepository.count()).thenReturn(20L);

        when(sourceJdbcTemplate.queryForObject("SELECT COUNT(*) FROM parent_student_bindings", Long.class))
                .thenReturn(15L);
        when(parentStudentBindingRepository.count()).thenReturn(15L);

        MigrationService.DataConsistencyReport report = migrationService.verifyDataConsistency();

        assertNotNull(report);
        assertFalse(report.isAllConsistent());

        MigrationService.TableCheck usersCheck = report.getTableChecks().stream()
                .filter(c -> "users".equals(c.getTableName()))
                .findFirst().orElse(null);

        assertNotNull(usersCheck);
        assertFalse(usersCheck.isConsistent());
        assertEquals(10L, usersCheck.getSourceCount());
        assertEquals(9L, usersCheck.getTargetCount());
    }

    /**
     * 测试迁移结果对象的基本属性与错误列表初始化
     */
    @Test
    @DisplayName("测试迁移结果结构")
    void testMigrationResultStructure() {
        MigrationService.MigrationResult result = new MigrationService.MigrationResult();

        result.setMigrationId("test-migration-id");
        result.setStartTime(LocalDateTime.now());
        result.setStatus("running");
        result.setAffectedRows(100);

        assertNotNull(result.getMigrationId());
        assertNotNull(result.getStartTime());
        assertEquals("running", result.getStatus());
        assertEquals(100, result.getAffectedRows());
        assertNotNull(result.getErrors());
        assertTrue(result.getErrors().isEmpty());
    }

    /**
     * 测试向迁移结果中新增错误明细
     */
    @Test
    @DisplayName("测试添加迁移错误")
    void testAddMigrationError() {
        MigrationService.MigrationResult result = new MigrationService.MigrationResult();

        result.addError("users", "user123", "Duplicate username");

        assertEquals(1, result.getErrors().size());
        MigrationService.MigrationError error = result.getErrors().get(0);
        assertEquals("users", error.getTable());
        assertEquals("user123", error.getIdentifier());
        assertEquals("Duplicate username", error.getMessage());
    }

    /**
     * 测试从源库迁移单条用户数据成功
     */
    @Test
    @DisplayName("测试迁移用户数据")
    void testMigrateUsers() {
        Map<String, Object> userRow = new HashMap<>();
        userRow.put("id", "user-123");
        userRow.put("username", "testuser");
        userRow.put("password_hash", "hashed-password");
        userRow.put("nickname", "Test User");
        userRow.put("avatar", "avatar.jpg");
        userRow.put("age_group", "高中生");
        userRow.put("role", "student");
        userRow.put("class_id", "class-456");
        userRow.put("school_name", "Test School");
        userRow.put("created_at", LocalDateTime.now());
        userRow.put("updated_at", LocalDateTime.now());
        userRow.put("is_active", true);

        when(sourceJdbcTemplate.queryForList(anyString()))
                .thenReturn(Arrays.asList(userRow));

        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MigrationService.MigrationResult result = new MigrationService.MigrationResult();
        long migrated = migrationService.migrateUsers(result);

        assertEquals(1, migrated);
        assertTrue(result.getErrors().isEmpty());
        verify(userRepository, times(1)).save(any(User.class));
    }

    /**
     * 测试从源库迁移单条心情记录数据成功
     */
    @Test
    @DisplayName("测试迁移心情记录数据")
    void testMigrateMoodRecords() {
        Map<String, Object> moodRow = new HashMap<>();
        moodRow.put("id", "mood-123");
        moodRow.put("user_id", "user-456");
        moodRow.put("mood_level", 4);
        moodRow.put("checkin_date", java.sql.Date.valueOf("2026-07-22"));
        moodRow.put("note", "Good day");
        moodRow.put("created_at", LocalDateTime.now());

        when(sourceJdbcTemplate.queryForList(anyString()))
                .thenReturn(Arrays.asList(moodRow));

        when(moodRecordRepository.save(any(MoodRecord.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MigrationService.MigrationResult result = new MigrationService.MigrationResult();
        long migrated = migrationService.migrateMoodRecords(result);

        assertEquals(1, migrated);
        assertTrue(result.getErrors().isEmpty());
        verify(moodRecordRepository, times(1)).save(any(MoodRecord.class));
    }

    /**
     * 测试从源库迁移单条聊天消息数据成功
     */
    @Test
    @DisplayName("测试迁移聊天消息数据")
    void testMigrateChatMessages() {
        Map<String, Object> messageRow = new HashMap<>();
        messageRow.put("id", "msg-123");
        messageRow.put("user_id", "user-456");
        messageRow.put("role", "user");
        messageRow.put("content", "Hello");
        messageRow.put("message_type", "text");
        messageRow.put("risk_level", "green");
        messageRow.put("response_time_ms", 1500L);
        messageRow.put("created_at", LocalDateTime.now());

        when(sourceJdbcTemplate.queryForList(anyString()))
                .thenReturn(Arrays.asList(messageRow));

        when(chatMessageRepository.save(any(ChatMessage.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MigrationService.MigrationResult result = new MigrationService.MigrationResult();
        long migrated = migrationService.migrateChatMessages(result);

        assertEquals(1, migrated);
        assertTrue(result.getErrors().isEmpty());
        verify(chatMessageRepository, times(1)).save(any(ChatMessage.class));
    }

    /**
     * 测试迁移过程中保存失败时记录错误且不计入迁移行数
     */
    @Test
    @DisplayName("测试迁移失败时记录错误")
    void testMigrateFailureRecordsError() {
        Map<String, Object> userRow = new HashMap<>();
        userRow.put("id", "user-123");
        userRow.put("username", "testuser");
        userRow.put("password_hash", "hashed-password");

        when(sourceJdbcTemplate.queryForList(anyString()))
                .thenReturn(Arrays.asList(userRow));

        when(userRepository.save(any(User.class))).thenThrow(new RuntimeException("Database error"));

        MigrationService.MigrationResult result = new MigrationService.MigrationResult();
        long migrated = migrationService.migrateUsers(result);

        assertEquals(0, migrated);
        assertEquals(1, result.getErrors().size());
        assertEquals("users", result.getErrors().get(0).getTable());
        assertEquals("testuser", result.getErrors().get(0).getIdentifier());
    }
}
