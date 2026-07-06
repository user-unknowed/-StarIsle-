-- 星屿数据库初始化脚本 - PostgreSQL
-- MVP版本 v1.0

-- 用户表
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nickname VARCHAR(50) NOT NULL,
    avatar VARCHAR(255) NOT NULL,
    age_group VARCHAR(20) NOT NULL CHECK (age_group IN ('初中生', '高中生')),
    encrypted_public_key TEXT, -- 用户加密公钥
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE, -- 软删除时间
    is_deleted BOOLEAN DEFAULT FALSE
);

-- 心情打卡表
CREATE TABLE mood_checkins (
    checkin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id),
    checkin_date DATE NOT NULL,
    mood_level INTEGER NOT NULL CHECK (mood_level BETWEEN 1 AND 5),
    tags TEXT[], -- 心情标签数组
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, checkin_date) -- 每天只能打卡一次
);

-- 测评结果表
CREATE TABLE assessment_results (
    result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id),
    assessment_type VARCHAR(50) NOT NULL, -- 'emotional' / 'stress' / 'relationship'
    total_score INTEGER NOT NULL,
    answers TEXT NOT NULL, -- JSON格式的答案
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('green', 'yellow', 'orange', 'red')),
    result_text TEXT NOT NULL, -- 结果描述
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 冥想内容表
CREATE TABLE meditation_contents (
    content_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(100) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL,
    category VARCHAR(50) NOT NULL, -- '学习' / '睡眠' / '情绪' / '专注'
    audio_url VARCHAR(255) NOT NULL,
    background_image VARCHAR(255),
    script TEXT, -- 冥想引导脚本
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 风险记录表
CREATE TABLE risk_records (
    record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id),
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('green', 'yellow', 'orange', 'red')),
    trigger_source VARCHAR(50) NOT NULL, -- 'keyword' / 'semantic' / 'assessment'
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    action_taken TEXT, -- 采取的干预措施
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 紧急联系人表
CREATE TABLE emergency_contacts (
    contact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id),
    contact_name VARCHAR(100) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    contact_type VARCHAR(50) NOT NULL, -- 'parent' / 'teacher' / 'friend'
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_users_nickname ON users(nickname);
CREATE INDEX idx_mood_checkins_user_date ON mood_checkins(user_id, checkin_date);
CREATE INDEX idx_assessment_results_user ON assessment_results(user_id);
CREATE INDEX idx_risk_records_user ON risk_records(user_id);

-- 插入初始冥想内容
INSERT INTO meditation_contents (title, description, duration_minutes, category, audio_url, script) VALUES
('考前放松', '帮助缓解考试焦虑，提升专注力', 5, '学习', 'https://cdn.example.com/meditation1.mp3', '闭上眼睛，深呼吸...'),
('入睡引导', '深度放松，引导进入睡眠', 8, '睡眠', 'https://cdn.example.com/meditation2.mp3', '放松身体，慢慢呼吸...'),
('情绪安抚', '安抚情绪风暴，找回内心平静', 5, '情绪', 'https://cdn.example.com/meditation3.mp3', '感受你的情绪...'),
('身体扫描', '全身放松，释放紧张', 10, '专注', 'https://cdn.example.com/meditation4.mp3', '从头顶开始...');

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at();