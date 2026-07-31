-- 星屿心理健康管理系统 - MySQL数据库初始化脚本
-- 版本: 1.0.0
-- 日期: 2026-07-22

SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
SET FOREIGN_KEY_CHECKS = 0;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) NOT NULL PRIMARY KEY COMMENT '用户ID',
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
    nickname VARCHAR(50) COMMENT '昵称',
    avatar VARCHAR(255) COMMENT '头像URL',
    age_group VARCHAR(20) COMMENT '年龄组',
    role VARCHAR(20) NOT NULL COMMENT '角色: student/teacher/parent',
    class_id VARCHAR(36) COMMENT '班级ID',
    school_name VARCHAR(100) COMMENT '学校名称',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '更新时间',
    last_login_at DATETIME COMMENT '最后登录时间',
    is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否活跃',
    INDEX idx_users_username (username),
    INDEX idx_users_role (role),
    INDEX idx_users_class_id (class_id),
    INDEX idx_users_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 心情记录表
CREATE TABLE IF NOT EXISTS mood_records (
    id CHAR(36) NOT NULL PRIMARY KEY COMMENT '记录ID',
    user_id CHAR(36) NOT NULL COMMENT '用户ID',
    mood_level TINYINT NOT NULL COMMENT '心情等级(1-5)',
    checkin_date DATE NOT NULL COMMENT '打卡日期',
    note LONGTEXT COMMENT '心情备注',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_mood_records_user_id (user_id),
    INDEX idx_mood_records_checkin_date (checkin_date),
    UNIQUE KEY uk_mood_records_user_date (user_id, checkin_date),
    CONSTRAINT fk_mood_records_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='心情记录表';

-- 心情标签表 (@ElementCollection)
CREATE TABLE IF NOT EXISTS mood_tags (
    mood_record_id CHAR(36) NOT NULL COMMENT '心情记录ID',
    tag VARCHAR(50) NOT NULL COMMENT '标签',
    PRIMARY KEY (mood_record_id, tag),
    CONSTRAINT fk_mood_tags_record FOREIGN KEY (mood_record_id) REFERENCES mood_records(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='心情标签表';

-- 聊天消息表
CREATE TABLE IF NOT EXISTS chat_messages (
    id CHAR(36) NOT NULL PRIMARY KEY COMMENT '消息ID',
    user_id CHAR(36) NOT NULL COMMENT '用户ID',
    role VARCHAR(20) NOT NULL COMMENT '角色: user/assistant',
    content LONGTEXT NOT NULL COMMENT '消息内容',
    message_type VARCHAR(50) COMMENT '消息类型',
    risk_level VARCHAR(20) COMMENT '风险等级',
    response_time_ms BIGINT COMMENT '响应时间(毫秒)',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_chat_messages_user_id (user_id),
    INDEX idx_chat_messages_created_at (created_at),
    CONSTRAINT fk_chat_messages_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='聊天消息表';

-- 测评结果表
CREATE TABLE IF NOT EXISTS assessment_results (
    id CHAR(36) NOT NULL PRIMARY KEY COMMENT '结果ID',
    user_id CHAR(36) NOT NULL COMMENT '用户ID',
    type VARCHAR(50) NOT NULL COMMENT '测评类型',
    total_score INT NOT NULL COMMENT '总分',
    risk_level VARCHAR(20) NOT NULL COMMENT '风险等级',
    description LONGTEXT COMMENT '结果描述',
    answers_json LONGTEXT COMMENT '答案JSON',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_assessment_results_user_id (user_id),
    INDEX idx_assessment_results_risk_level (risk_level),
    CONSTRAINT fk_assessment_results_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='测评结果表';

-- 紧急资源表
CREATE TABLE IF NOT EXISTS emergency_resources (
    id CHAR(36) NOT NULL PRIMARY KEY COMMENT '资源ID',
    title VARCHAR(100) NOT NULL COMMENT '资源标题',
    type VARCHAR(50) NOT NULL COMMENT '资源类型',
    content LONGTEXT COMMENT '资源内容',
    url VARCHAR(500) COMMENT '资源URL',
    phone VARCHAR(20) COMMENT '联系电话',
    is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否活跃',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_emergency_resources_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='紧急资源表';

-- 紧急告警表
CREATE TABLE IF NOT EXISTS emergency_alerts (
    id CHAR(36) NOT NULL PRIMARY KEY COMMENT '告警ID',
    student_id CHAR(36) NOT NULL COMMENT '学生ID',
    parent_id CHAR(36) NOT NULL COMMENT '家长ID',
    trigger_source VARCHAR(50) NOT NULL DEFAULT 'system' COMMENT '触发来源',
    risk_level VARCHAR(20) NOT NULL DEFAULT 'red' COMMENT '风险等级',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '状态: pending/confirmed/resolved',
    confirmed_at DATETIME COMMENT '确认时间',
    description VARCHAR(500) COMMENT '告警描述',
    triggered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '触发时间',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_emergency_alerts_student_id (student_id),
    INDEX idx_emergency_alerts_parent_id (parent_id),
    INDEX idx_emergency_alerts_status (status),
    CONSTRAINT fk_emergency_alerts_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_emergency_alerts_parent FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='紧急告警表';

-- 家长用户表
CREATE TABLE IF NOT EXISTS parent_users (
    id CHAR(36) NOT NULL PRIMARY KEY COMMENT '家长ID',
    phone VARCHAR(20) NOT NULL UNIQUE COMMENT '手机号',
    password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
    nickname VARCHAR(50) COMMENT '昵称',
    avatar VARCHAR(255) COMMENT '头像URL',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '更新时间',
    last_login_at DATETIME COMMENT '最后登录时间',
    is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否活跃',
    INDEX idx_parent_users_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='家长用户表';

-- 家长学生绑定表
CREATE TABLE IF NOT EXISTS parent_student_bindings (
    id CHAR(36) NOT NULL PRIMARY KEY COMMENT '绑定ID',
    parent_id CHAR(36) NOT NULL COMMENT '家长ID',
    student_id CHAR(36) NOT NULL COMMENT '学生ID',
    bind_type VARCHAR(20) NOT NULL DEFAULT 'scan' COMMENT '绑定类型',
    authorized TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否授权',
    authorized_at DATETIME COMMENT '授权时间',
    student_nickname VARCHAR(50) COMMENT '学生昵称',
    student_avatar VARCHAR(255) COMMENT '学生头像',
    latest_mood TINYINT NOT NULL DEFAULT 3 COMMENT '最新心情',
    risk_level VARCHAR(20) NOT NULL DEFAULT 'green' COMMENT '风险等级',
    last_checkin_date DATE COMMENT '最后打卡日期',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_parent_student_bindings_parent_id (parent_id),
    INDEX idx_parent_student_bindings_student_id (student_id),
    UNIQUE KEY uk_parent_student_bindings (parent_id, student_id),
    CONSTRAINT fk_parent_student_bindings_parent FOREIGN KEY (parent_id) REFERENCES parent_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_parent_student_bindings_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='家长学生绑定表';

-- 密钥存储表
CREATE TABLE IF NOT EXISTS encryption_keys (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    key_id VARCHAR(36) NOT NULL UNIQUE COMMENT '密钥标识',
    key_version VARCHAR(20) NOT NULL COMMENT '密钥版本',
    key_type VARCHAR(20) NOT NULL COMMENT '密钥类型: encryption/signing',
    key_value TEXT NOT NULL COMMENT '密钥值(加密存储)',
    is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否活跃',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    expires_at DATETIME COMMENT '过期时间',
    INDEX idx_encryption_keys_key_version (key_version),
    INDEX idx_encryption_keys_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='加密密钥存储表';

-- 迁移日志表
CREATE TABLE IF NOT EXISTS migration_logs (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    migration_id VARCHAR(50) NOT NULL UNIQUE COMMENT '迁移标识',
    migration_name VARCHAR(200) NOT NULL COMMENT '迁移名称',
    status VARCHAR(20) NOT NULL COMMENT '状态: pending/running/success/failed',
    source_db VARCHAR(100) COMMENT '源数据库',
    target_db VARCHAR(100) COMMENT '目标数据库',
    start_time DATETIME COMMENT '开始时间',
    end_time DATETIME COMMENT '结束时间',
    affected_rows BIGINT NOT NULL DEFAULT 0 COMMENT '影响行数',
    checksum_before VARCHAR(64) COMMENT '迁移前校验和',
    checksum_after VARCHAR(64) COMMENT '迁移后校验和',
    error_message TEXT COMMENT '错误信息',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_migration_logs_status (status),
    INDEX idx_migration_logs_migration_id (migration_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='数据迁移日志表';

-- 创建更新时间触发器
DELIMITER //

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW SET NEW.updated_at = CURRENT_TIMESTAMP;
//

CREATE TRIGGER update_parent_users_updated_at BEFORE UPDATE ON parent_users
FOR EACH ROW SET NEW.updated_at = CURRENT_TIMESTAMP;
//

CREATE TRIGGER update_parent_student_bindings_updated_at BEFORE UPDATE ON parent_student_bindings
FOR EACH ROW SET NEW.updated_at = CURRENT_TIMESTAMP;
//

CREATE TRIGGER update_emergency_resources_updated_at BEFORE UPDATE ON emergency_resources
FOR EACH ROW SET NEW.updated_at = CURRENT_TIMESTAMP;
//

DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;
