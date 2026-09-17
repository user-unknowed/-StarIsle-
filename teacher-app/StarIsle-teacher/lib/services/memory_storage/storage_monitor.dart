/// @file storage_monitor.dart
/// @description 教师端存储监控服务，周期性采集数据库大小、记录数与维护历史，
///              通过 [Stream] 向外推送 [StorageStatus]，并提供维护记录查询与体积格式化能力。
/// @module teacher-app/services/memory_storage/storage_monitor

import 'dart:async';
import 'memory_storage_service.dart';

/// 存储监控服务。
///
/// 通过定时器周期性采集本地存储状态，并向订阅者广播 [StorageStatus]，
/// 同时提供一次性状态查询、维护历史查询与体积格式化工具方法。
class StorageMonitor {
  /// 注入的本地存储服务实例。
  final MemoryStorageService _storageService = MemoryStorageService();

  /// 监听订阅（保留字段，用于扩展）。
  StreamSubscription? _monitorSubscription;

  /// 周期性采集定时器。
  Timer? _checkTimer;

  /// 状态广播控制器。
  final StreamController<StorageStatus> _statusController = StreamController<StorageStatus>.broadcast();

  /// 存储状态广播流。
  Stream<StorageStatus> get statusStream => _statusController.stream;

  /// 启动周期性监控。
  ///
  /// 参数：
  /// - [checkInterval]：检查间隔，默认 5 分钟。
  Future<void> startMonitoring({Duration checkInterval = const Duration(minutes: 5)}) async {
    await _updateStatus();

    _checkTimer = Timer.periodic(checkInterval, (_) async {
      await _updateStatus();
    });
  }

  /// 停止监控，释放定时器与控制器。
  Future<void> stopMonitoring() async {
    _checkTimer?.cancel();
    _monitorSubscription?.cancel();
    await _statusController.close();
  }

  /// 采集一次最新状态并推送到流。
  ///
  /// 异常时通过 [addError] 推送错误。
  Future<void> _updateStatus() async {
    try {
      int dbSize = await _storageService.getDatabaseSize();
      Map<String, int> stats = await _storageService.getStorageStats();
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

  /// 获取一次性的当前存储状态。
  ///
  /// 返回：包含数据库大小、记录数与维护历史的 [StorageStatus]。
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

  /// 查询维护历史记录。
  ///
  /// 参数：
  /// - [limit]：返回条数上限，默认 20。
  ///
  /// 返回：按开始时间倒序排列的 [MaintenanceRecord] 列表。
  Future<List<MaintenanceRecord>> getMaintenanceHistory({int limit = 20}) async {
    List<Map<String, dynamic>> history = await _storageService.query(
      'maintenance_history',
      orderBy: 'started_at DESC',
      limit: limit,
    );
    return history.map((item) => MaintenanceRecord.fromMap(item)).toList();
  }

  /// 将字节数格式化为易读字符串（B/KB/MB）。
  ///
  /// 参数：
  /// - [bytes]：字节数。
  ///
  /// 返回：格式化后的体积字符串。
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

/// 存储状态快照。
///
/// 描述某一时刻的数据库大小、各表记录数与最近的维护历史。
class StorageStatus {
  /// 数据库文件大小（字节）。
  final int databaseSize;

  /// 各业务表记录数。
  final Map<String, int> recordCounts;

  /// 最近维护历史记录列表。
  final List<MaintenanceRecord> maintenanceHistory;

  /// 构造存储状态实例。
  ///
  /// 参数：
  /// - [databaseSize]：数据库大小；
  /// - [recordCounts]：记录数统计；
  /// - [maintenanceHistory]：维护历史列表。
  StorageStatus({
    required this.databaseSize,
    required this.recordCounts,
    required this.maintenanceHistory,
  });
}

/// 维护历史记录模型。
///
/// 描述一次本地存储维护操作的元信息，包括类型、耗时与节省空间等。
class MaintenanceRecord {
  /// 记录 ID。
  final String id;

  /// 维护动作类型。
  final String actionType;

  /// 维护详情描述。
  final String details;

  /// 处理条目数。
  final int itemsProcessed;

  /// 节省的空间（字节）。
  final int storageSaved;

  /// 开始时间。
  final DateTime startedAt;

  /// 完成时间，未完成时为 null。
  final DateTime? completedAt;

  /// 构造维护记录实例。
  ///
  /// 参数：
  /// - [id]、[actionType]、[details]、[itemsProcessed]、[storageSaved]、[startedAt]：必填字段；
  /// - [completedAt]：完成时间，可空。
  MaintenanceRecord({
    required this.id,
    required this.actionType,
    required this.details,
    required this.itemsProcessed,
    required this.storageSaved,
    required this.startedAt,
    this.completedAt,
  });

  /// 从数据库行 Map 构造 [MaintenanceRecord] 实例。
  ///
  /// 参数：
  /// - [map]：数据库行。
  ///
  /// 返回：对应的 [MaintenanceRecord] 实例。
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

  /// 维护耗时的中文描述。
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

  /// 维护动作类型的中文标签。
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
