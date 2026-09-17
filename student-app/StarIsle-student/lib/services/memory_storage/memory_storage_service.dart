/// @file memory_storage_service.dart
/// @description 学生端本地内存存储服务，基于 sqflite_sqlcipher 提供加密本地数据库，
///              覆盖心情记录、聊天记录、应对策略、情绪轨迹、维护历史、应用设置等表，
///              并提供统一的增删改查、过期数据清理、数据库压缩、存储统计与全量清空能力。
/// @module student-app/services/memory_storage

import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'package:path_provider/path_provider.dart';
import 'package:sqflite_sqlcipher/sqflite.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// 本地加密数据库存储服务。
///
/// 使用单例模式（[MemoryStorageService._internal] + factory 构造）保证全局唯一实例。
/// 数据库通过 SQLCipher 加密，密钥保存在 [FlutterSecureStorage] 中。
class MemoryStorageService {
  // 单例实例
  static MemoryStorageService? _instance;
  // 数据库实例（懒加载）
  Database? _database;
  // 安全存储，用于保存数据库加密密钥
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();
  // 数据库文件名
  static const String _dbName = 'starisle_student.db';
  // 加密密钥在安全存储中的键名
  static const String _encryptionKey = 'starisle_student_encryption_key';

  // 私有构造函数，配合 factory 实现单例
  MemoryStorageService._internal();

  /// 工厂构造函数，返回全局唯一实例。
  factory MemoryStorageService() {
    _instance ??= MemoryStorageService._internal();
    return _instance!;
  }

  /// 获取数据库加密密钥，若不存在则生成并安全存储。
  ///
  /// 返回：Base64 编码的 32 字节随机密钥。
  Future<String> _getDatabaseKey() async {
    String? key = await _secureStorage.read(key: _encryptionKey);
    if (key == null) {
      key = _generateSecureKey();
      await _secureStorage.write(key: _encryptionKey, value: key);
    }
    return key;
  }

  /// 使用加密随机源生成 32 字节的 Base64 密钥。
  String _generateSecureKey() {
    return base64Encode(List<int>.generate(32, (_) => Random.secure().nextInt(256)));
  }

  /// 获取数据库实例，懒初始化。
  ///
  /// 返回：已初始化的 [Database] 实例。
  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }

  /// 初始化加密数据库，配置 PRAGMA 与建表回调。
  ///
  /// 返回：已打开的 [Database] 实例。
  Future<Database> _initDatabase() async {
    // 获取应用文档目录作为数据库存储路径
    Directory documentsDirectory = await getApplicationDocumentsDirectory();
    String path = '${documentsDirectory.path}/$_dbName';

    // 获取加密密钥
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

  /// 创建全部数据表与索引。
  ///
  /// 包含：mood_records、chat_history、chat_sessions、coping_strategies、
  /// emotion_tracks、maintenance_history、app_settings。
  Future<void> _createTables(Database db) async {
    // 心情记录表
    await db.execute('''
      CREATE TABLE mood_records (
        id TEXT PRIMARY KEY,
        mood_value INTEGER NOT NULL,
        mood_note TEXT,
        recorded_at INTEGER NOT NULL,
        expires_at INTEGER
      )
    ''');

    // 聊天记录表（关联会话）
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

    // 聊天会话表
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

    // 应对策略表
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

    // 情绪轨迹表
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

    // 维护历史表
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

    // 应用设置键值表
    await db.execute('''
      CREATE TABLE app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    ''');

    // 性能索引
    await db.execute('CREATE INDEX idx_mood_records_date ON mood_records(recorded_at)');
    await db.execute('CREATE INDEX idx_chat_history_session ON chat_history(session_id)');
    await db.execute('CREATE INDEX idx_emotion_tracks_date ON emotion_tracks(recorded_at)');
  }

  /// 向指定表插入数据（主键冲突时替换）。
  ///
  /// 参数：
  /// - [table]：目标表名；
  /// - [data]：列名到值的映射。
  Future<void> insert(String table, Map<String, dynamic> data) async {
    Database db = await database;
    await db.insert(table, data, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  /// 查询指定表的数据。
  ///
  /// 参数：
  /// - [table]：表名；
  /// - [where]：可选 WHERE 子句；
  /// - [whereArgs]：WHERE 参数；
  /// - [orderBy]：排序字段；
  /// - [limit]：返回行数上限。
  ///
  /// 返回：查询结果列表。
  Future<List<Map<String, dynamic>>> query(String table, {
    String? where,
    List<dynamic>? whereArgs,
    String? orderBy,
    int? limit,
  }) async {
    Database db = await database;
    return await db.query(table, where: where, whereArgs: whereArgs, orderBy: orderBy, limit: limit);
  }

  /// 更新指定表中匹配条件的数据。
  ///
  /// 参数：
  /// - [table]：表名；
  /// - [data]：待更新字段；
  /// - [where]：WHERE 子句（必填）；
  /// - [whereArgs]：WHERE 参数（必填）。
  ///
  /// 返回：受影响的行数。
  Future<int> update(String table, Map<String, dynamic> data, {
    required String where,
    required List<dynamic> whereArgs,
  }) async {
    Database db = await database;
    return await db.update(table, data, where: where, whereArgs: whereArgs);
  }

  /// 删除指定表中匹配条件的数据。
  ///
  /// 参数：
  /// - [table]：表名；
  /// - [where]：WHERE 子句（必填）；
  /// - [whereArgs]：WHERE 参数（必填）。
  ///
  /// 返回：删除的行数。
  Future<int> delete(String table, {
    required String where,
    required List<dynamic> whereArgs,
  }) async {
    Database db = await database;
    return await db.delete(table, where: where, whereArgs: whereArgs);
  }

  /// 清理所有带 expires_at 字段表中的过期数据。
  Future<void> clearExpiredData() async {
    Database db = await database;
    int now = DateTime.now().millisecondsSinceEpoch;

    // 逐表删除已过期记录
    await db.delete('mood_records', where: 'expires_at < ?', whereArgs: [now]);
    await db.delete('chat_history', where: 'expires_at < ?', whereArgs: [now]);
    await db.delete('chat_sessions', where: 'expires_at < ?', whereArgs: [now]);
    await db.delete('coping_strategies', where: 'expires_at < ?', whereArgs: [now]);
    await db.delete('emotion_tracks', where: 'expires_at < ?', whereArgs: [now]);
  }

  /// 执行 VACUUM 命令压缩数据库文件，回收空闲空间。
  Future<void> compactDatabase() async {
    Database db = await database;
    await db.execute('VACUUM');
  }

  /// 获取各表当前记录数统计。
  ///
  /// 返回：表名到记录数的 Map。
  Future<Map<String, int>> getStorageStats() async {
    Database db = await database;

    // 分别统计各表行数
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

  /// 获取数据库文件大小（字节）。
  ///
  /// 返回：文件存在时返回字节数，否则返回 0。
  Future<int> getDatabaseSize() async {
    Directory documentsDirectory = await getApplicationDocumentsDirectory();
    String path = '${documentsDirectory.path}/$_dbName';
    File file = File(path);
    if (await file.exists()) {
      return await file.length();
    }
    return 0;
  }

  /// 关闭数据库连接并清空实例引用。
  Future<void> close() async {
    if (_database != null) {
      await _database!.close();
      _database = null;
    }
  }

  /// 清空所有业务数据表并压缩数据库（保留表结构与维护历史）。
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