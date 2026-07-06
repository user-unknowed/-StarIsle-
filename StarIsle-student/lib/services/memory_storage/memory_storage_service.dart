import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'package:path_provider/path_provider.dart';
import 'package:sqflite_sqlcipher/sqflite.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class MemoryStorageService {
  static MemoryStorageService? _instance;
  Database? _database;
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();
  static const String _dbName = 'starisle_student.db';
  static const String _encryptionKey = 'starisle_student_encryption_key';

  MemoryStorageService._internal();

  factory MemoryStorageService() {
    _instance ??= MemoryStorageService._internal();
    return _instance!;
  }

  Future<String> _getDatabaseKey() async {
    String? key = await _secureStorage.read(key: _encryptionKey);
    if (key == null) {
      key = _generateSecureKey();
      await _secureStorage.write(key: _encryptionKey, value: key);
    }
    return key;
  }

  String _generateSecureKey() {
    return base64Encode(List<int>.generate(32, (_) => Random.secure().nextInt(256)));
  }

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }

  Future<Database> _initDatabase() async {
    Directory documentsDirectory = await getApplicationDocumentsDirectory();
    String path = '${documentsDirectory.path}/$_dbName';
    
    String key = await _getDatabaseKey();
    
    return await openDatabase(
      path,
      version: 1,
      onConfigure: (db) async {
        await db.execute('PRAGMA key = "key"');
        await db.execute('PRAGMA cipher_compatibility = 3');
      },
      onCreate: (db, version) async {
        await _createTables(db);
      },
    );
  }

  Future<void> _createTables(Database db) async {
    await db.execute('''
      CREATE TABLE mood_records (
        id TEXT PRIMARY KEY,
        mood_value INTEGER NOT NULL,
        mood_note TEXT,
        recorded_at INTEGER NOT NULL,
        expires_at INTEGER
      )
    ''');

    await db.execute('''
      CREATE TABLE chat_history (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        sender_name TEXT NOT NULL,
        content TEXT NOT NULL,
        sent_at INTEGER NOT NULL,
        expires_at INTEGER,
        FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
      )
    ''');

    await db.execute('''
      CREATE TABLE chat_sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        last_message TEXT,
        last_message_at INTEGER,
        created_at INTEGER NOT NULL,
        expires_at INTEGER
      )
    ''');

    await db.execute('''
      CREATE TABLE coping_strategies (
        id TEXT PRIMARY KEY,
        strategy_type TEXT NOT NULL,
        content TEXT NOT NULL,
        used_count INTEGER DEFAULT 0,
        last_used_at INTEGER,
        created_at INTEGER NOT NULL,
        expires_at INTEGER
      )
    ''');

    await db.execute('''
      CREATE TABLE emotion_tracks (
        id TEXT PRIMARY KEY,
        emotion_type TEXT NOT NULL,
        intensity INTEGER NOT NULL,
        recorded_at INTEGER NOT NULL,
        context TEXT,
        expires_at INTEGER
      )
    ''');

    await db.execute('''
      CREATE TABLE maintenance_history (
        id TEXT PRIMARY KEY,
        action_type TEXT NOT NULL,
        details TEXT,
        items_processed INTEGER DEFAULT 0,
        storage_saved INTEGER DEFAULT 0,
        started_at INTEGER NOT NULL,
        completed_at INTEGER
      )
    ''');

    await db.execute('''
      CREATE TABLE app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    ''');

    await db.execute('CREATE INDEX idx_mood_records_date ON mood_records(recorded_at)');
    await db.execute('CREATE INDEX idx_chat_history_session ON chat_history(session_id)');
    await db.execute('CREATE INDEX idx_emotion_tracks_date ON emotion_tracks(recorded_at)');
  }

  Future<void> insert(String table, Map<String, dynamic> data) async {
    Database db = await database;
    await db.insert(table, data, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<List<Map<String, dynamic>>> query(String table, {
    String? where,
    List<dynamic>? whereArgs,
    String? orderBy,
    int? limit,
  }) async {
    Database db = await database;
    return await db.query(table, where: where, whereArgs: whereArgs, orderBy: orderBy, limit: limit);
  }

  Future<int> update(String table, Map<String, dynamic> data, {
    required String where,
    required List<dynamic> whereArgs,
  }) async {
    Database db = await database;
    return await db.update(table, data, where: where, whereArgs: whereArgs);
  }

  Future<int> delete(String table, {
    required String where,
    required List<dynamic> whereArgs,
  }) async {
    Database db = await database;
    return await db.delete(table, where: where, whereArgs: whereArgs);
  }

  Future<void> clearExpiredData() async {
    Database db = await database;
    int now = DateTime.now().millisecondsSinceEpoch;
    
    await db.delete('mood_records', where: 'expires_at < ?', whereArgs: [now]);
    await db.delete('chat_history', where: 'expires_at < ?', whereArgs: [now]);
    await db.delete('chat_sessions', where: 'expires_at < ?', whereArgs: [now]);
    await db.delete('coping_strategies', where: 'expires_at < ?', whereArgs: [now]);
    await db.delete('emotion_tracks', where: 'expires_at < ?', whereArgs: [now]);
  }

  Future<void> compactDatabase() async {
    Database db = await database;
    await db.execute('VACUUM');
  }

  Future<Map<String, int>> getStorageStats() async {
    Database db = await database;
    
    var moodCount = await db.rawQuery('SELECT COUNT(*) as count FROM mood_records');
    var chatCount = await db.rawQuery('SELECT COUNT(*) as count FROM chat_history');
    var sessionCount = await db.rawQuery('SELECT COUNT(*) as count FROM chat_sessions');
    var strategyCount = await db.rawQuery('SELECT COUNT(*) as count FROM coping_strategies');
    var emotionCount = await db.rawQuery('SELECT COUNT(*) as count FROM emotion_tracks');

    return {
      'mood_records': moodCount.first['count'] as int,
      'chat_history': chatCount.first['count'] as int,
      'chat_sessions': sessionCount.first['count'] as int,
      'coping_strategies': strategyCount.first['count'] as int,
      'emotion_tracks': emotionCount.first['count'] as int,
    };
  }

  Future<int> getDatabaseSize() async {
    Directory documentsDirectory = await getApplicationDocumentsDirectory();
    String path = '${documentsDirectory.path}/$_dbName';
    File file = File(path);
    if (await file.exists()) {
      return await file.length();
    }
    return 0;
  }

  Future<void> close() async {
    if (_database != null) {
      await _database!.close();
      _database = null;
    }
  }

  Future<void> clearAllData() async {
    Database db = await database;
    await db.delete('mood_records');
    await db.delete('chat_history');
    await db.delete('chat_sessions');
    await db.delete('coping_strategies');
    await db.delete('emotion_tracks');
    await compactDatabase();
  }
}