import 'dart:async';
import 'memory_storage_service.dart';

class StorageMonitor {
  final MemoryStorageService _storageService = MemoryStorageService();
  
  StreamSubscription? _monitorSubscription;
  Timer? _checkTimer;
  
  final StreamController<StorageStatus> _statusController = StreamController<StorageStatus>.broadcast();
  
  Stream<StorageStatus> get statusStream => _statusController.stream;

  Future<void> startMonitoring({Duration checkInterval = const Duration(minutes: 5)}) async {
    await _updateStatus();
    
    _checkTimer = Timer.periodic(checkInterval, (_) async {
      await _updateStatus();
    });
  }

  Future<void> stopMonitoring() async {
    _checkTimer?.cancel();
    _monitorSubscription?.cancel();
    await _statusController.close();
  }

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

  Future<List<MaintenanceRecord>> getMaintenanceHistory({int limit = 20}) async {
    List<Map<String, dynamic>> history = await _storageService.query(
      'maintenance_history',
      orderBy: 'started_at DESC',
      limit: limit,
    );
    return history.map((item) => MaintenanceRecord.fromMap(item)).toList();
  }

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

class StorageStatus {
  final int databaseSize;
  final Map<String, int> recordCounts;
  final List<MaintenanceRecord> maintenanceHistory;

  StorageStatus({
    required this.databaseSize,
    required this.recordCounts,
    required this.maintenanceHistory,
  });
}

class MaintenanceRecord {
  final String id;
  final String actionType;
  final String details;
  final int itemsProcessed;
  final int storageSaved;
  final DateTime startedAt;
  final DateTime? completedAt;

  MaintenanceRecord({
    required this.id,
    required this.actionType,
    required this.details,
    required this.itemsProcessed,
    required this.storageSaved,
    required this.startedAt,
    this.completedAt,
  });

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