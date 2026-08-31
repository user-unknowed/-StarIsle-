/// @file storage_monitor.dart
/// @description 学生端存储监控服务，定期采集数据库大小、记录数与维护历史，
///              通过流式 [StorageStatus] 对外暴露状态变更，并定义 [StorageStatus] 与 [MaintenanceRecord] 数据模型。
/// @module student-app/services/memory_storage

import 'dart:async';
import 'memory_storage_service.dart';

/// 存储监控服务，负责周期性采集本地存储状态并对外广播。
///
/// 通过 [Timer] 定时拉取 [MemoryStorageService] 的统计信息，
/// 并通过 [statusStream] 广播 [StorageStatus] 实例。
class StorageMonitor {
  // 内部存储服务实例
  final MemoryStorageService _storageService = MemoryStorageService();

  // 状态流订阅（保留字段以便后续扩展）
  StreamSubscription? _monitorSubscription;
  // 周期性检查定时器
  Timer? _checkTimer;

  // 状态广播控制器
  final StreamController<StorageStatus> _statusController = StreamController<StorageStatus>.broadcast();

  /// 获取存储状态广播流。
  Stream<StorageStatus> get statusStream => _statusController.stream;

  /// 启动周期性存储监控。
  ///
  /// 参数：
  /// - [checkInterval]：检查间隔，默认 5 分钟。
  Future<void> startMonitoring({Duration checkInterval = const Duration(minutes: 5)}) async {
    // 立即更新一次状态
    await _updateStatus();

    // 注册周期性定时器
    _checkTimer = Timer.periodic(checkInterval, (_) async {
      await _updateStatus();
    });
  }

  /// 停止监控，取消定时器与订阅并关闭状态流。
  Future<void> stopMonitoring() async {
    _checkTimer?.cancel();
    _monitorSubscription?.cancel();
    await _statusController.close();
  }

  /// 采集最新存储状态并广播到状态流。
  Future<void> _updateStatus() async {
    try {
      int dbSize = await _storageService.getDatabaseSize();
      Map<String, int> stats = await _storageService.getStorageStats();
      // 查询最近 10 条维护历史
      List<Map<String, dynamic>> history = await _storageService.query(
        'maintenance_history',
        orderBy: 'started_at DESC',
        limit: 10,
      );

      _statusController.add(StorageStatus(
        databaseSize: dbSize,
        recordCounts: stats,
        maintenanceHistory: history.map((item) => MaintenanceRecord.fromMap(item)).toList(),
      ));
    } catch (e) {
      _statusController.addError(e);
    }
  }

  /// 获取当前存储状态（一次性快照）。
  ///
  /// 返回：包含数据库大小、各表记录数与维护历史的 [StorageStatus]。
  Future<StorageStatus> getCurrentStatus() async {
    int dbSize = await _storageService.getDatabaseSize();
    Map<String, int> stats = await _storageService.getStorageStats();
    List<Map<String, dynamic>> history = await _storageService.query(
      'maintenance_history',
      orderBy: 'started_at DESC',
      limit: 10,
    );

    return StorageStatus(
      databaseSize: dbSize,
      recordCounts: stats,
      maintenanceHistory: history.map((item) => MaintenanceRecord.fromMap(item)).toList(),
    );
  }

  /// 查询维护历史记录列表。
  ///
  /// 参数：
  /// - [limit]：返回记录数上限，默认 20。
  ///
  /// 返回：[MaintenanceRecord] 列表，按开始时间倒序。
  Future<List<MaintenanceRecord>> getMaintenanceHistory({int limit = 20}) async {
    List<Map<String, dynamic>> history = await _storageService.query(
      'maintenance_history',
      orderBy: 'started_at DESC',
      limit: limit,
    );
    return history.map((item) => MaintenanceRecord.fromMap(item)).toList();
  }

  /// 将字节数格式化为人类可读字符串（B / KB / MB）。
  ///
  /// 参数：
  /// - [bytes]：字节数。
  ///
  /// 返回：带单位的字符串。
  String formatSize(int bytes) {
<<<<<<< HEAD
    if (bytes < 1024) return 'bytes B';
    if (bytes < 1024 * 1024) return '{(bytes / 1024).toStringAsFixed(2)} KB';
    return '{(bytes / (1024 * 1024)).toStringAsFixed(2)} MB';
=======
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(2)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(2)} MB';
>>>>>>> e70e7a7 (feat: 实现本地记忆存储管理系统)
  }
}

/// 存储状态快照数据模型。
class StorageStatus {
  final int databaseSize; // 数据库文件字节数
  final Map<String, int> recordCounts; // 各表记录数
  final List<MaintenanceRecord> maintenanceHistory; // 最近的维护历史

  /// 构造函数。
  StorageStatus({
    required this.databaseSize,
    required this.recordCounts,
    required this.maintenanceHistory,
  });
}

/// 维护历史记录数据模型。
class MaintenanceRecord {
  final String id; // 记录 ID
  final String actionType; // 操作类型
  final String details; // 详情描述
  final int itemsProcessed; // 处理条目数
  final int storageSaved; // 节省字节数
  final DateTime startedAt; // 开始时间
  final DateTime? completedAt; // 完成时间（可能为空表示进行中）

  /// 构造函数。
  MaintenanceRecord({
    required this.id,
    required this.actionType,
    required this.details,
    required this.itemsProcessed,
    required this.storageSaved,
    required this.startedAt,
    this.completedAt,
  });

  /// 从数据库 Map 构造 [MaintenanceRecord] 实例。
  factory MaintenanceRecord.fromMap(Map<String, dynamic> map) {
    return MaintenanceRecord(
      id: map['id'] ?? '',
      actionType: map['action_type'] ?? '',
      details: map['details'] ?? '',
      itemsProcessed: map['items_processed'] ?? 0,
      storageSaved: map['storage_saved'] ?? 0,
      startedAt: DateTime.fromMillisecondsSinceEpoch(map['started_at'] ?? 0),
      completedAt: map['completed_at'] != null 
          ? DateTime.fromMillisecondsSinceEpoch(map['completed_at']) 
          : null,
    );
  }

  /// 计算维护操作耗时的人类可读字符串。
  String get duration {
    if (completedAt == null) return '进行中';
    Duration diff = completedAt!.difference(startedAt);
<<<<<<< HEAD
    if (diff.inSeconds < 60) return '{diff.inSeconds}秒';
    if (diff.inMinutes < 60) return '{diff.inMinutes}分钟';
    return '{diff.inHours}小时';
=======
    if (diff.inSeconds < 60) return '${diff.inSeconds}秒';
    if (diff.inMinutes < 60) return '${diff.inMinutes}分钟';
    return '${diff.inHours}小时';
>>>>>>> e70e7a7 (feat: 实现本地记忆存储管理系统)
  }

  /// 根据操作类型返回中文标签。
  String get actionTypeLabel {
    switch (actionType) {
      case 'auto_maintenance':
        return '自动整理';
      case 'manual_maintenance':
        return '手动整理';
      case 'data_cleanup':
        return '数据清理';
      case 'compaction':
        return '数据库压缩';
      default:
        return actionType;
    }
  }
}