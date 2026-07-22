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

@ExtendWith(MockitoExtension.class)
public class MigrationServiceTest {

    @Mock
    private JdbcTemplate sourceJdbcTemplate;

    @Mock
    private JdbcTemplate targetJdbcTemplate;

    @Mock
    private UserRepository userRepository;

    @Mock
    private MoodRecordRepository moodRecordRepository;

    @Mock
    private ChatMessageRepository chatMessageRepository;

    @Mock
    private AssessmentResultRepository assessmentResultRepository;

    @Mock
    private EmergencyAlertRepository emergencyAlertRepository;

    @Mock
    private ParentUserRepository parentUserRepository;

    @Mock
    private ParentStudentBindingRepository parentStudentBindingRepository;

    @InjectMocks
    private MigrationService migrationService;

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
