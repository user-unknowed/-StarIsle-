package com.starisle.service.dart;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.security.SecureRandom;
import java.sql.*;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class MemoryStorageService {
    private static MemoryStorageService instance;
    
    private Connection database;
    private final String encryptionKey;
    
    @Value("${starisle.database.name:starisle_student.db}")
    private String dbName;
    
    @Value("${starisle.database.path:./data}")
    private String dbPath;

    private MemoryStorageService() {
        this.encryptionKey = generateSecureKey();
    }

    public static synchronized MemoryStorageService getInstance() {
        if (instance == null) {
            instance = new MemoryStorageService();
        }
        return instance;
    }

    private String generateSecureKey() {
        SecureRandom random = new SecureRandom();
        byte[] key = new byte[32];
        random.nextBytes(key);
        return Base64.getEncoder().encodeToString(key);
    }

    @PostConstruct
    public void init() throws Exception {
        getDatabase();
    }

    public synchronized Connection getDatabase() throws Exception {
        if (database != null && !database.isClosed()) {
            return database;
        }
        database = initDatabase();
        return database;
    }

    private Connection initDatabase() throws Exception {
        String dbFullPath = dbPath + "/" + dbName;
        
        Connection conn = DriverManager.getConnection("jdbc:sqlite:" + dbFullPath);
        
        conn.createStatement().execute("PRAGMA key = '" + encryptionKey + "'");
        conn.createStatement().execute("PRAGMA cipher_compatibility = 3");
        
        createTables(conn);
        
        return conn;
    }

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

    public void compactDatabase() throws Exception {
        Connection conn = getDatabase();
        conn.createStatement().execute("VACUUM");
    }

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

    public long getDatabaseSize() throws Exception {
        String dbFullPath = dbPath + "/" + dbName;
        java.io.File file = new java.io.File(dbFullPath);
        return file.exists() ? file.length() : 0;
    }

    public void close() throws Exception {
        if (database != null) {
            database.close();
            database = null;
        }
    }

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