/// @file maintenance_scheduler.dart
/// @description 教师端本地存储维护调度器，基于 Workmanager 注册周期性后台任务，
///              在每日指定时间窗口内自动执行过期数据清理与数据库压缩，并记录维护历史。
/// @module teacher-app/services/memory_storage/maintenance_scheduler

import 'dart:async';
import 'package:workmanager/workmanager.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'memory_storage_service.dart';

/// 后台维护任务标识。
const String _maintenanceTaskTag = 'starisle_teacher_maintenance';

/// Workmanager 任务分发回调。
///
/// 当后台任务触发时由 Workmanager 调用，匹配 [_maintenanceTaskTag] 后执行维护逻辑。
void callbackDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    if (task == _maintenanceTaskTag) {
      await _performMaintenance();
    }
    return Future.value(true);
  });
}

/// 执行一次自动维护。
///
/// 流程：记录起始时间与初始数据库大小 -> 清理过期数据 -> 压缩数据库 ->
/// 计算耗时与节省空间 -> 写入 maintenance_history 历史记录 -> 关闭数据库。
Future<void> _performMaintenance() async {
  final storageService = MemoryStorageService();

  int startTime = DateTime.now().millisecondsSinceEpoch;
  int initialSize = await storageService.getDatabaseSize();

  await storageService.clearExpiredData();
  await storageService.compactDatabase();

  int endTime = DateTime.now().millisecondsSinceEpoch;
  int finalSize = await storageService.getDatabaseSize();
  int storageSaved = initialSize - finalSize;

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

/// 维护调度器。
///
/// 负责初始化 Workmanager、注册周期性维护任务、管理维护时间窗口，
/// 以及提供手动维护、暂停、恢复与取消等能力。
class MaintenanceScheduler {
  /// 注入的本地存储服务实例。
  final MemoryStorageService _storageService = MemoryStorageService();

  /// 默认维护时间窗口（22:00 - 次日 06:00）。
  static const Map<String, int> defaultTimeWindows = {
    'startHour': 22,
    'startMinute': 0,
    'endHour': 6,
    'endMinute': 0,
  };

  /// 初始化调度器并注册周期性维护任务。
  Future<void> initialize() async {
    await Workmanager().initialize(
      callbackDispatcher,
      isInDebugMode: false,
    );

    await _scheduleMaintenance();
  }

  /// 取消旧任务并重新注册周期性维护任务（每 24 小时执行一次）。
  Future<void> _scheduleMaintenance() async {
    await Workmanager().cancelByTag(_maintenanceTaskTag);

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

  /// 计算距离下一个维护时间窗口起点的延迟时长。
  ///
  /// 返回：从当前时刻到目标起始时刻的 [Duration]。
  Future<Duration> _calculateNextDelay() async {
    DateTime now = DateTime.now();
    Map<String, int> window = await getMaintenanceWindow();

    DateTime targetTime = DateTime(now.year, now.month, now.day, window['startHour']!, window['startMinute']!);

    if (now.isAfter(targetTime)) {
      targetTime = targetTime.add(const Duration(days: 1));
    }

    return targetTime.difference(now);
  }

  /// 设置维护时间窗口并重新调度任务。
  ///
  /// 参数：
  /// - [startHour]、[startMinute]：起始时分；
  /// - [endHour]、[endMinute]：结束时分。
  Future<void> setMaintenanceWindow({
    required int startHour,
    required int startMinute,
    required int endHour,
    required int endMinute,
  }) async {
    SharedPreferences prefs = await SharedPreferences.getInstance();

    await prefs.setInt('maintenance_start_hour', startHour);
    await prefs.setInt('maintenance_start_minute', startMinute);
    await prefs.setInt('maintenance_end_hour', endHour);
    await prefs.setInt('maintenance_end_minute', endMinute);

    await _scheduleMaintenance();
  }

  /// 读取维护时间窗口，未配置时回退到 [defaultTimeWindows]。
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

  /// 手动触发一次维护，并记录到维护历史。
  Future<void> runManualMaintenance() async {
    int startTime = DateTime.now().millisecondsSinceEpoch;
    int initialSize = await _storageService.getDatabaseSize();

    await _storageService.clearExpiredData();
    await _storageService.compactDatabase();

    int endTime = DateTime.now().millisecondsSinceEpoch;
    int finalSize = await _storageService.getDatabaseSize();
    int storageSaved = initialSize - finalSize;

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

  /// 取消周期性维护任务。
  Future<void> cancelMaintenance() async {
    await Workmanager().cancelByTag(_maintenanceTaskTag);
  }

  /// 暂停维护（取消已注册任务）。
  Future<void> pauseMaintenance() async {
    await Workmanager().cancelByTag(_maintenanceTaskTag);
  }

  /// 恢复维护（重新注册周期性任务）。
  Future<void> resumeMaintenance() async {
    await _scheduleMaintenance();
  }
}
