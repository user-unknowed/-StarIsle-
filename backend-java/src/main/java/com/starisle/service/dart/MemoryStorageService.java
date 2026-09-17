package com.starisle.service.dart;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.security.SecureRandom;
import java.sql.*;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 内存存储服务
 * 基于加密 SQLite 数据库提供单例存储能力，封装表创建、数据增删改查、
 * 过期清理与压缩等操作，供维护调度器与监控器使用。
 * 通过 SQLCipher PRAGMA 设置数据库加密密钥与兼容模式。
 */
@Service
public class MemoryStorageService {
    /** 单例实例，懒加载并同步保证线程安全 */
    private static MemoryStorageService instance;

    /** 数据库连接，懒加载并复用 */
    private Connection database;
    /** 数据库加密密钥，Base64 编码的 32 字节随机数 */
    private final String encryptionKey;

    /** 数据库文件名，可通过配置 starisle.database.name 覆盖 */
    @Value("${starisle.database.name:starisle_student.db}")
    private String dbName;

    /** 数据库文件存放目录，可通过配置 starisle.database.path 覆盖 */
    @Value("${starisle.database.path:./data}")
    private String dbPath;

    /**
     * 私有构造方法
     * 生成随机加密密钥以保护数据库内容。
     */
    private MemoryStorageService() {
        this.encryptionKey = generateSecureKey();
    }

    /**
     * 获取单例实例
     * 使用同步方法保证多线程环境下只创建一个实例。
     *
     * @return 内存存储服务单例
     */
    public static synchronized MemoryStorageService getInstance() {
        if (instance == null) {
            instance = new MemoryStorageService();
        }
        return instance;
    }

    /**
     * 生成安全加密密钥
     * 使用安全随机数生成器生成 32 字节随机数据，并 Base64 编码。
     *
     * @return Base64 编码的加密密钥
     */
    private String generateSecureKey() {
        SecureRandom random = new SecureRandom();
        byte[] key = new byte[32];
        random.nextBytes(key);
        return Base64.getEncoder().encodeToString(key);
    }

    /**
     * 初始化回调
     * Spring 容器启动后触发数据库连接初始化，确保表结构提前创建。
     *
     * @throws Exception 当数据库初始化失败时抛出
     */
    @PostConstruct
    public void init() throws Exception {
        getDatabase();
    }

    /**
     * 获取数据库连接
     * 若连接已存在且未关闭则直接复用，否则重新初始化连接。
     *
     * @return 可用的数据库连接
     * @throws Exception 当连接获取失败时抛出
     */
    public synchronized Connection getDatabase() throws Exception {
        if (database != null && !database.isClosed()) {
            return database;
        }
        database = initDatabase();
        return database;
    }

    /**
     * 初始化数据库连接
     * 拼接数据库路径、设置加密 PRAGMA 并创建所需表结构。
     *
     * @return 已初始化的数据库连接
     * @throws Exception 当连接或建表失败时抛出
     */
    private Connection initDatabase() throws Exception {
        String dbFullPath = dbPath + "/" + dbName;

        Connection conn = DriverManager.getConnection("jdbc:sqlite:" + dbFullPath);

        // 设置 SQLCipher 加密密钥
        conn.createStatement().execute("PRAGMA key = '" + encryptionKey + "'");
        // 设置 SQLCipher 兼容模式为 3，保证与旧版数据库文件兼容
        conn.createStatement().execute("PRAGMA cipher_compatibility = 3");

        createTables(conn);

        return conn;
    }

    /**
     * 创建业务表结构
     * 包括心情记录、聊天历史、会话、应对策略、情绪轨迹、维护历史与应用设置表，
     * 并建立常用查询索引以提升性能。
     *
     * @param conn 数据库连接
     * @throws SQLException 当建表或建索引失败时抛出
     */
    private void createTables(Connection conn) throws SQLException {
        String[] createTableSqls = {
            """
            CREATE TABLE IF NOT EXISTS mood_records (
                id TEXT PRIMARY KEY,
                mood_value INTEGER NOT NULL,
                mood_note TEXT,
                recorded_at INTEGER NOT NULL,
                expires_at INTEGER
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS chat_history (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                sender_id TEXT NOT NULL,
                sender_name TEXT NOT NULL,
                content TEXT NOT NULL,
                sent_at INTEGER NOT NULL,
                expires_at INTEGER,
                FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS chat_sessions (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                last_message TEXT,
                last_message_at INTEGER,
                created_at INTEGER NOT NULL,
                expires_at INTEGER
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS coping_strategies (
                id TEXT PRIMARY KEY,
                strategy_type TEXT NOT NULL,
                content TEXT NOT NULL,
                used_count INTEGER DEFAULT 0,
                last_used_at INTEGER,
                created_at INTEGER NOT NULL,
                expires_at INTEGER
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS emotion_tracks (
                id TEXT PRIMARY KEY,
                emotion_type TEXT NOT NULL,
                intensity INTEGER NOT NULL,
                recorded_at INTEGER NOT NULL,
                context TEXT,
                expires_at INTEGER
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS maintenance_history (
                id TEXT PRIMARY KEY,
                action_type TEXT NOT NULL,
                details TEXT,
                items_processed INTEGER DEFAULT 0,
                storage_saved INTEGER DEFAULT 0,
                started_at INTEGER NOT NULL,
                completed_at INTEGER
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS app_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at INTEGER NOT NULL
            )
            """,
            "CREATE INDEX IF NOT EXISTS idx_mood_records_date ON mood_records(recorded_at)",
            "CREATE INDEX IF NOT EXISTS idx_chat_history_session ON chat_history(session_id)",
            "CREATE INDEX IF NOT EXISTS idx_emotion_tracks_date ON emotion_tracks(recorded_at)"
        };

        try (Statement stmt = conn.createStatement()) {
            for (String sql : createTableSqls) {
                stmt.execute(sql);
            }
        }
    }

    /**
     * 插入或替换数据
     * 使用 INSERT OR REPLACE 语义，主键冲突时覆盖旧记录。
     * 字段名与占位符按 Map 迭代顺序拼接。
     *
     * @param table 目标表名
     * @param data  字段名到字段值的映射
     * @throws Exception 当执行失败时抛出
     */
    public void insert(String table, Map<String, Object> data) throws Exception {
        Connection conn = getDatabase();

        StringBuilder columns = new StringBuilder();
        StringBuilder placeholders = new StringBuilder();
        List<Object> values = new java.util.ArrayList<>();

        int index = 0;
        for (Map.Entry<String, Object> entry : data.entrySet()) {
            if (index > 0) {
                columns.append(", ");
                placeholders.append(", ");
            }
            columns.append(entry.getKey());
            placeholders.append("?");
            values.add(entry.getValue());
            index++;
        }

        String sql = "INSERT OR REPLACE INTO " + table + " (" + columns + ") VALUES (" + placeholders + ")";

        try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
            for (int i = 0; i < values.size(); i++) {
                pstmt.setObject(i + 1, values.get(i));
            }
            pstmt.executeUpdate();
        }
    }

    /**
     * 查询数据
     * 动态拼接 SELECT、WHERE、ORDER BY 与 LIMIT 子句，结果以 Map 列表形式返回。
     *
     * @param table     目标表名
     * @param where     WHERE 条件语句，可为空
     * @param whereArgs WHERE 条件参数列表，可为空
     * @param orderBy   排序字段，如 "created_at DESC"，可为空
     * @param limit     返回记录上限，非正数表示不限制
     * @return 查询结果列表
     * @throws Exception 当查询失败时抛出
     */
    public List<Map<String, Object>> query(String table, String where, List<Object> whereArgs,
                                           String orderBy, Integer limit) throws Exception {
        Connection conn = getDatabase();

        StringBuilder sql = new StringBuilder("SELECT * FROM " + table);

        if (where != null && !where.isEmpty()) {
            sql.append(" WHERE ").append(where);
        }

        if (orderBy != null && !orderBy.isEmpty()) {
            sql.append(" ORDER BY ").append(orderBy);
        }

        if (limit != null && limit > 0) {
            sql.append(" LIMIT ").append(limit);
        }

        try (PreparedStatement pstmt = conn.prepareStatement(sql.toString())) {
            if (whereArgs != null) {
                for (int i = 0; i < whereArgs.size(); i++) {
                    pstmt.setObject(i + 1, whereArgs.get(i));
                }
            }

            try (ResultSet rs = pstmt.executeQuery()) {
                List<Map<String, Object>> results = new java.util.ArrayList<>();
                ResultSetMetaData metaData = rs.getMetaData();
                int columnCount = metaData.getColumnCount();

                while (rs.next()) {
                    Map<String, Object> row = new HashMap<>();
                    for (int i = 1; i <= columnCount; i++) {
                        row.put(metaData.getColumnName(i), rs.getObject(i));
                    }
                    results.add(row);
                }

                return results;
            }
        }
    }

    /**
     * 更新数据
     * 根据 SET 字段与 WHERE 条件构造 UPDATE 语句并执行。
     *
     * @param table     目标表名
     * @param data      待更新字段映射
     * @param where     WHERE 条件语句
     * @param whereArgs WHERE 条件参数列表，可为空
     * @return 受影响行数
     * @throws Exception 当更新失败时抛出
     */
    public int update(String table, Map<String, Object> data, String where, List<Object> whereArgs) throws Exception {
        Connection conn = getDatabase();

        StringBuilder setClause = new StringBuilder();
        List<Object> values = new java.util.ArrayList<>();

        int index = 0;
        for (Map.Entry<String, Object> entry : data.entrySet()) {
            if (index > 0) {
                setClause.append(", ");
            }
            setClause.append(entry.getKey()).append(" = ?");
            values.add(entry.getValue());
            index++;
        }

        String sql = "UPDATE " + table + " SET " + setClause + " WHERE " + where;

        try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
            for (int i = 0; i < values.size(); i++) {
                pstmt.setObject(i + 1, values.get(i));
            }
            if (whereArgs != null) {
                for (int i = 0; i < whereArgs.size(); i++) {
                    pstmt.setObject(values.size() + i + 1, whereArgs.get(i));
                }
            }
            return pstmt.executeUpdate();
        }
    }

    /**
     * 删除数据
     * 根据指定 WHERE 条件构造 DELETE 语句并执行。
     *
     * @param table     目标表名
     * @param where     WHERE 条件语句
     * @param whereArgs WHERE 条件参数列表，可为空
     * @return 受影响行数
     * @throws Exception 当删除失败时抛出
     */
    public int delete(String table, String where, List<Object> whereArgs) throws Exception {
        Connection conn = getDatabase();

        String sql = "DELETE FROM " + table + " WHERE " + where;

        try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
            if (whereArgs != null) {
                for (int i = 0; i < whereArgs.size(); i++) {
                    pstmt.setObject(i + 1, whereArgs.get(i));
                }
            }
            return pstmt.executeUpdate();
        }
    }

    /**
     * 清理过期数据
     * 删除所有含 expires_at 字段且小于当前时间戳的记录。
     *
     * @throws Exception 当清理失败时抛出
     */
    public void clearExpiredData() throws Exception {
        Connection conn = getDatabase();
        long now = System.currentTimeMillis();

        String[] tables = {"mood_records", "chat_history", "chat_sessions",
                          "coping_strategies", "emotion_tracks"};

        try (PreparedStatement pstmt = conn.prepareStatement("DELETE FROM ? WHERE expires_at < ?")) {
            for (String table : tables) {
                pstmt.setString(1, table);
                pstmt.setLong(2, now);
                pstmt.executeUpdate();
            }
        }
    }

    /**
     * 压缩数据库
     * 执行 VACUUM 命令回收未使用空间，优化存储布局。
     *
     * @throws Exception 当压缩失败时抛出
     */
    public void compactDatabase() throws Exception {
        Connection conn = getDatabase();
        conn.createStatement().execute("VACUUM");
    }

    /**
     * 获取存储统计
     * 统计各业务表的当前记录数量。
     *
     * @return 表名到记录数量的映射
     * @throws Exception 当统计失败时抛出
     */
    public Map<String, Integer> getStorageStats() throws Exception {
        Connection conn = getDatabase();

        Map<String, Integer> stats = new ConcurrentHashMap<>();
        String[] tables = {"mood_records", "chat_history", "chat_sessions",
                          "coping_strategies", "emotion_tracks"};

        for (String table : tables) {
            try (Statement stmt = conn.createStatement();
                 ResultSet rs = stmt.executeQuery("SELECT COUNT(*) as count FROM " + table)) {
                if (rs.next()) {
                    stats.put(table, rs.getInt("count"));
                }
            }
        }

        return stats;
    }

    /**
     * 获取数据库文件大小
     * 读取磁盘上数据库文件的字节大小。
     *
     * @return 数据库文件字节大小，不存在返回 0
     * @throws Exception 当读取失败时抛出
     */
    public long getDatabaseSize() throws Exception {
        String dbFullPath = dbPath + "/" + dbName;
        java.io.File file = new java.io.File(dbFullPath);
        return file.exists() ? file.length() : 0;
    }

    /**
     * 关闭数据库连接
     * 释放当前连接并将引用置空，便于后续重新初始化。
     *
     * @throws Exception 当关闭失败时抛出
     */
    public void close() throws Exception {
        if (database != null) {
            database.close();
            database = null;
        }
    }

    /**
     * 清空所有业务数据
     * 删除各业务表全部记录并执行压缩，保留表结构与系统设置。
     *
     * @throws Exception 当清理失败时抛出
     */
    public void clearAllData() throws Exception {
        Connection conn = getDatabase();

        String[] tables = {"mood_records", "chat_history", "chat_sessions",
                          "coping_strategies", "emotion_tracks"};

        for (String table : tables) {
            conn.createStatement().execute("DELETE FROM " + table);
        }

        compactDatabase();
    }
}
