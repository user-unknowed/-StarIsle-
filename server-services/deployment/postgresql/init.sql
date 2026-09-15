-- 星屿心理健康管理系统 - PostgreSQL 数据库初始化脚本
-- 版本: 1.1.0 (由 MySQL 迁移)
-- 数据库: PostgreSQL 14+
-- 说明: 与 backend-java JPA 实体类配合使用

-- 关闭外键检查以便按字母序执行（PG 等价：临时关闭触发器）
SET session_replication_role = 'replica';

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) NOT NULL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(50),
    avatar VARCHAR(255),
    age_group VARCHAR(20),
    role VARCHAR(20) NOT NULL,
    class_id VARCHAR(36),
    school_name VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_class_id ON users(class_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- 心情记录表
CREATE TABLE IF NOT EXISTS mood_records (
    id CHAR(36) NOT NULL PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    mood_level SMALLINT NOT NULL,
    checkin_date DATE NOT NULL,
    note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_mood_records_user_date UNIQUE (user_id, checkin_date),
    CONSTRAINT fk_mood_records_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_mood_records_user_id ON mood_records(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_records_checkin_date ON mood_records(checkin_date);

-- 心情标签表 (@ElementCollection)
CREATE TABLE IF NOT EXISTS mood_tags (
    mood_record_id CHAR(36) NOT NULL,
    tag VARCHAR(50) NOT NULL,
    PRIMARY KEY (mood_record_id, tag),
    CONSTRAINT fk_mood_tags_record FOREIGN KEY (mood_record_id) REFERENCES mood_records(id) ON DELETE CASCADE
);

-- 聊天消息表
CREATE TABLE IF NOT EXISTS chat_messages (
    id CHAR(36) NOT NULL PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(50),
    risk_level VARCHAR(20),
    response_time_ms BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_chat_messages_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- 测评结果表
CREATE TABLE IF NOT EXISTS assessment_results (
    id CHAR(36) NOT NULL PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    type VARCHAR(50) NOT NULL,
    total_score INT NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    description TEXT,
    answers_json TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_assessment_results_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_assessment_results_user_id ON assessment_results(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_risk_level ON assessment_results(risk_level);

-- 紧急资源表
CREATE TABLE IF NOT EXISTS emergency_resources (
    id CHAR(36) NOT NULL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    content TEXT,
    url VARCHAR(500),
    phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_emergency_resources_type ON emergency_resources(type);

-- 紧急告警表
CREATE TABLE IF NOT EXISTS emergency_alerts (
    id CHAR(36) NOT NULL PRIMARY KEY,
    student_id CHAR(36) NOT NULL,
    parent_id CHAR(36) NOT NULL,
    trigger_source VARCHAR(50) NOT NULL DEFAULT 'system',
    risk_level VARCHAR(20) NOT NULL DEFAULT 'red',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    confirmed_at TIMESTAMP,
    description VARCHAR(500),
    triggered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_emergency_alerts_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_emergency_alerts_parent FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_student_id ON emergency_alerts(student_id);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_parent_id ON emergency_alerts(parent_id);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_status ON emergency_alerts(status);

-- 家长用户表
CREATE TABLE IF NOT EXISTS parent_users (
    id CHAR(36) NOT NULL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(50),
    avatar VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_parent_users_phone ON parent_users(phone);

-- 家长学生绑定表
CREATE TABLE IF NOT EXISTS parent_student_bindings (
    id CHAR(36) NOT NULL PRIMARY KEY,
    parent_id CHAR(36) NOT NULL,
    student_id CHAR(36) NOT NULL,
    bind_type VARCHAR(20) NOT NULL DEFAULT 'scan',
    authorized BOOLEAN NOT NULL DEFAULT FALSE,
    authorized_at TIMESTAMP,
    student_nickname VARCHAR(50),
    student_avatar VARCHAR(255),
    latest_mood SMALLINT NOT NULL DEFAULT 3,
    risk_level VARCHAR(20) NOT NULL DEFAULT 'green',
    last_checkin_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_parent_student_bindings UNIQUE (parent_id, student_id),
    CONSTRAINT fk_parent_student_bindings_parent FOREIGN KEY (parent_id) REFERENCES parent_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_parent_student_bindings_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_parent_student_bindings_parent_id ON parent_student_bindings(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_student_bindings_student_id ON parent_student_bindings(student_id);

-- 密钥存储表 (对应 EncryptionKey 实体的 GenerationType.IDENTITY)
CREATE TABLE IF NOT EXISTS encryption_keys (
    id SERIAL PRIMARY KEY,
    key_id VARCHAR(36) NOT NULL UNIQUE,
    key_version VARCHAR(20) NOT NULL,
    key_type VARCHAR(20) NOT NULL,
    key_value TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_encryption_keys_key_version ON encryption_keys(key_version);
CREATE INDEX IF NOT EXISTS idx_encryption_keys_is_active ON encryption_keys(is_active);

-- 迁移日志表
CREATE TABLE IF NOT EXISTS migration_logs (
    id SERIAL PRIMARY KEY,
    migration_id VARCHAR(50) NOT NULL UNIQUE,
    migration_name VARCHAR(200) NOT NULL,
    status VARCHAR(20) NOT NULL,
    source_db VARCHAR(100),
    target_db VARCHAR(100),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    affected_rows BIGINT NOT NULL DEFAULT 0,
    checksum_before VARCHAR(64),
    checksum_after VARCHAR(64),
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_migration_logs_status ON migration_logs(status);
CREATE INDEX IF NOT EXISTS idx_migration_logs_migration_id ON migration_logs(migration_id);

-- 更新时间触发器（PostgreSQL 等价实现）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_parent_users_updated_at ON parent_users;
CREATE TRIGGER trigger_parent_users_updated_at BEFORE UPDATE ON parent_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_parent_student_bindings_updated_at ON parent_student_bindings;
CREATE TRIGGER trigger_parent_student_bindings_updated_at BEFORE UPDATE ON parent_student_bindings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_emergency_resources_updated_at ON emergency_resources;
CREATE TRIGGER trigger_emergency_resources_updated_at BEFORE UPDATE ON emergency_resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 恢复外键检查
SET session_replication_role = 'origin';
