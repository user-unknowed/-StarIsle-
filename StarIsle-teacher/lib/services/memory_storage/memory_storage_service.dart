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
  static const String _dbName = 'starisle_teacher.db';
  static const String _encryptionKey = 'starisle_teacher_encryption_key';

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
<<<<<<< HEAD
        await db.execute('PRAGMA key = "key"');
=======
        await db.execute('PRAGMA key = "$key"');
>>>>>>> e70e7a7 (feat: 实现本地记忆存储管理系统)
        await db.execute('PRAGMA cipher_compatibility = 3');
      },
      onCreate: (db, version) async {
        await _createTables(db);
      },
    );
  }

  Future<void> _createTables(Database db) async {
    await db.execute('''
      CREATE TABLE observation_notes (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        student_name TEXT NOT NULL,
        content TEXT NOT NULL,
        risk_level TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER,
        expires_at INTEGER
      )
    ''');

    await db.execute('''
      CREATE TABLE symptom_reports (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        student_name TEXT NOT NULL,
        symptoms TEXT NOT NULL,
        report_type TEXT NOT NULL,
        severity INTEGER,
        created_at INTEGER NOT NULL,
        expires_at INTEGER
      )
    ''');

    await db.execute('''
      CREATE TABLE alerts (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        student_name TEXT NOT NULL,
        class_name TEXT,
        risk_level TEXT NOT NULL,
        trigger_reason TEXT NOT NULL,
        resolved INTEGER DEFAULT 0,
        resolved_at INTEGER,
        triggered_at INTEGER NOT NULL,
        expires_at INTEGER
      )
    ''');

    await db.execute('''
      CREATE TABLE todo_items (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        priority INTEGER DEFAULT 0,
        completed INTEGER DEFAULT 0,
        due_date INTEGER,
        created_at INTEGER NOT NULL,
        expires_at INTEGER
      )
    ''');

    await db.execute('''
      CREATE TABLE chat_sessions (
        id TEXT PRIMARY KEY,
        student_id TEXT,
        student_name TEXT,
        type TEXT NOT NULL,
        last_message TEXT,
        last_message_at INTEGER,
        created_at INTEGER NOT NULL,
        expires_at INTEGER
      )
    ''');

    await db.execute('''
      CREATE TABLE chat_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        sender_name TEXT NOT NULL,
        is_teacher INTEGER DEFAULT 0,
        content TEXT NOT NULL,
        sent_at INTEGER NOT NULL,
        expires_at INTEGER,
        FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
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

    await db.execute('CREATE INDEX idx_observation_student ON observation_notes(student_id)');
    await db.execute('CREATE INDEX idx_alerts_risk ON alerts(risk_level)');
    await db.execute('CREATE INDEX idx_todo_priority ON todo_items(priority)');
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
    
    await db.delete('observation_notes', where: 'expires_at < ?', whereArgs: [now]);
    await db.delete('symptom_reports', where: 'expires_at < ?', whereArgs: [now]);
    await db.delete('alerts', where: 'expires_at < ?', whereArgs: [now]);
    await db.delete('todo_items', where: 'expires_at < ?', whereArgs: [now]);
    await db.delete('chat_sessions', where: 'expires_at < ?', whereArgs: [now]);
    await db.delete('chat_messages', where: 'expires_at < ?', whereArgs: [now]);
  }

  Future<void> compactDatabase() async {
    Database db = await database;
    await db.execute('VACUUM');
  }

  Future<Map<String, int>> getStorageStats() async {
    Database db = await database;
    
    var observationCount = await db.rawQuery('SELECT COUNT(*) as count FROM observation_notes');
    var reportCount = await db.rawQuery('SELECT COUNT(*) as count FROM symptom_reports');
    var alertCount = await db.rawQuery('SELECT COUNT(*) as count FROM alerts');
    var todoCount = await db.rawQuery('SELECT COUNT(*) as count FROM todo_items');
    var messageCount = await db.rawQuery('SELECT COUNT(*) as count FROM chat_messages');

    return {
      'observation_notes': observationCount.first['count'] as int,
      'symptom_reports': reportCount.first['count'] as int,
      'alerts': alertCount.first['count'] as int,
      'todo_items': todoCount.first['count'] as int,
      'chat_messages': messageCount.first['count'] as int,
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
    await db.delete('observation_notes');
    await db.delete('symptom_reports');
    await db.delete('alerts');
    await db.delete('todo_items');
    await db.delete('chat_sessions');
    await db.delete('chat_messages');
    await compactDatabase();
  }
}