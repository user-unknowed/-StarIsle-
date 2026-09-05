/// @file maintenance_scheduler.dart
/// @description 学生端内存存储维护调度器，基于 Workmanager 注册周期性后台任务，
///              在指定维护时间窗口内清理过期数据并压缩数据库，同时支持手动维护与窗口配置。
/// @module student-app/services/memory_storage

import 'dart:async';
import 'package:workmanager/workmanager.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'memory_storage_service.dart';

// 后台维护任务的唯一标识标签
const String _maintenanceTaskTag = 'starisle_student_maintenance';

/// Workmanager 后台任务分发回调。
///
/// 当系统触发后台任务时被调用，根据任务名分发到对应处理逻辑。
void callbackDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    if (task == _maintenanceTaskTag) {
      await _performMaintenance();
    }
    return Future.value(true);
  });
}

/// 执行实际的数据库维护操作（清理过期数据 + 压缩数据库），并写入维护历史记录。
///
/// 该函数运行在后台隔离上下文中，需自行创建并关闭 [MemoryStorageService] 实例。
Future<void> _performMaintenance() async {
  final storageService = MemoryStorageService();

  // 记录维护开始时间与初始数据库大小
  int startTime = DateTime.now().millisecondsSinceEpoch;
  int initialSize = await storageService.getDatabaseSize();

  // 清理过期数据并压缩数据库
  await storageService.clearExpiredData();
  await storageService.compactDatabase();

  // 记录维护结束时间与最终数据库大小，计算节省空间
  int endTime = DateTime.now().millisecondsSinceEpoch;
  int finalSize = await storageService.getDatabaseSize();
  int storageSaved = initialSize - finalSize;

  // 写入维护历史记录
  await storageService.insert('maintenance_history', {
    'id': DateTime.now().toIso8601String(),
    'action_type': 'auto_maintenance',
    'details': '自动整理：清理过期数据并压缩数据库',
    'items_processed': 0,
    'storage_saved': storageSaved,
    'started_at': startTime,
    'completed_at': endTime,
  });

  await storageService.close();
}

/// 内存存储维护调度器。
///
/// 负责初始化 Workmanager、注册周期性维护任务、计算下次执行延迟、
/// 以及管理维护时间窗口的持久化配置。默认维护窗口为 22:00 - 次日 06:00。
class MaintenanceScheduler {
  // 内部使用的存储服务实例
  final MemoryStorageService _storageService = MemoryStorageService();

  /// 默认维护时间窗口（22:00 - 06:00）。
  static const Map<String, int> defaultTimeWindows = {
    'startHour': 22,
    'startMinute': 0,
    'endHour': 6,
    'endMinute': 0,
  };

  /// 初始化 Workmanager 并注册周期性维护任务。
  ///
  /// 返回：[Future] 在初始化与首次调度完成后完成。
  Future<void> initialize() async {
    await Workmanager().initialize(
      callbackDispatcher,
      isInDebugMode: false,
    );

    await _scheduleMaintenance();
  }

  /// 取消已有任务并重新注册周期性维护任务（每 24 小时执行一次）。
  Future<void> _scheduleMaintenance() async {
    // 先取消同标签任务，避免重复注册
    await Workmanager().cancelByTag(_maintenanceTaskTag);

    // 注册周期性任务，初始延迟为到下次维护窗口的时间
    await Workmanager().registerPeriodicTask(
      _maintenanceTaskTag,
      _maintenanceTaskTag,
      frequency: const Duration(hours: 24),
      initialDelay: await _calculateNextDelay(),
      constraints: Constraints(
        networkType: NetworkType.not_required,
        requiresBatteryNotLow: false,
        requiresCharging: false,
        requiresDeviceIdle: false,
        requiresStorageNotLow: false,
      ),
    );
  }

  /// 计算距离下一次维护窗口的延迟时长。
  ///
  /// 返回：从当前时刻到目标维护开始时刻的 [Duration]。
  Future<Duration> _calculateNextDelay() async {
    DateTime now = DateTime.now();
    Map<String, int> window = await getMaintenanceWindow();

    // 构造今天的目标时刻
    DateTime targetTime = DateTime(now.year, now.month, now.day, window['startHour']!, window['startMinute']!);

    // 若已过今日目标时刻，则顺延到明天
    if (now.isAfter(targetTime)) {
      targetTime = targetTime.add(const Duration(days: 1));
    }

    return targetTime.difference(now);
  }

  /// 设置自定义维护时间窗口并持久化到 SharedPreferences，随后重新调度任务。
  ///
  /// 参数：
  /// - [startHour] / [startMinute]：维护窗口开始时分；
  /// - [endHour] / [endMinute]：维护窗口结束时分。
  Future<void> setMaintenanceWindow({
    required int startHour,
    required int startMinute,
    required int endHour,
    required int endMinute,
  }) async {
    SharedPreferences prefs = await SharedPreferences.getInstance();

    // 持久化维护窗口配置
    await prefs.setInt('maintenance_start_hour', startHour);
    await prefs.setInt('maintenance_start_minute', startMinute);
    await prefs.setInt('maintenance_end_hour', endHour);
    await prefs.setInt('maintenance_end_minute', endMinute);

    // 配置变更后重新调度任务
    await _scheduleMaintenance();
  }

  /// 读取维护时间窗口配置，未配置时返回默认值。
  ///
  /// 返回：包含 startHour/startMinute/endHour/endMinute 的 Map。
  Future<Map<String, int>> getMaintenanceWindow() async {
    SharedPreferences prefs = await SharedPreferences.getInstance();

    return {
      'startHour': prefs.getInt('maintenance_start_hour') ?? defaultTimeWindows['startHour']!,
      'startMinute': prefs.getInt('maintenance_start_minute') ?? defaultTimeWindows['startMinute']!,
      'endHour': prefs.getInt('maintenance_end_hour') ?? defaultTimeWindows['endHour']!,
      'endMinute': prefs.getInt('maintenance_end_minute') ?? defaultTimeWindows['endMinute']!,
    };
  }

  /// 手动触发一次维护操作，并将记录写入 maintenance_history 表。
  Future<void> runManualMaintenance() async {
    int startTime = DateTime.now().millisecondsSinceEpoch;
    int initialSize = await _storageService.getDatabaseSize();

    // 执行清理与压缩
    await _storageService.clearExpiredData();
    await _storageService.compactDatabase();

    int endTime = DateTime.now().millisecondsSinceEpoch;
    int finalSize = await _storageService.getDatabaseSize();
    int storageSaved = initialSize - finalSize;

    // 写入手动维护历史
    await _storageService.insert('maintenance_history', {
      'id': DateTime.now().toIso8601String(),
      'action_type': 'manual_maintenance',
      'details': '手动整理：清理过期数据并压缩数据库',
      'items_processed': 0,
      'storage_saved': storageSaved,
      'started_at': startTime,
      'completed_at': endTime,
    });
  }

  /// 取消已注册的周期性维护任务。
  Future<void> cancelMaintenance() async {
    await Workmanager().cancelByTag(_maintenanceTaskTag);
  }

  /// 暂停维护任务（实现同取消，语义上表示临时暂停）。
  Future<void> pauseMaintenance() async {
    await Workmanager().cancelByTag(_maintenanceTaskTag);
  }

  /// 恢复维护任务，重新注册周期性调度。
  Future<void> resumeMaintenance() async {
    await _scheduleMaintenance();
  }
}