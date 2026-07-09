import 'dart:async';
import 'package:workmanager/workmanager.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'memory_storage_service.dart';

const String _maintenanceTaskTag = 'starisle_teacher_maintenance';

void callbackDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    if (task == _maintenanceTaskTag) {
      await _performMaintenance();
    }
    return Future.value(true);
  });
}

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

class MaintenanceScheduler {
  final MemoryStorageService _storageService = MemoryStorageService();
  
  static const Map<String, int> defaultTimeWindows = {
    'startHour': 22,
    'startMinute': 0,
    'endHour': 6,
    'endMinute': 0,
  };

  Future<void> initialize() async {
    await Workmanager().initialize(
      callbackDispatcher,
      isInDebugMode: false,
    );
    
    await _scheduleMaintenance();
  }

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

  Future<Duration> _calculateNextDelay() async {
    DateTime now = DateTime.now();
    Map<String, int> window = await getMaintenanceWindow();
    
    DateTime targetTime = DateTime(now.year, now.month, now.day, window['startHour']!, window['startMinute']!);
    
    if (now.isAfter(targetTime)) {
      targetTime = targetTime.add(const Duration(days: 1));
    }
    
    return targetTime.difference(now);
  }

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

  Future<Map<String, int>> getMaintenanceWindow() async {
    SharedPreferences prefs = await SharedPreferences.getInstance();
    
    return {
      'startHour': prefs.getInt('maintenance_start_hour') ?? defaultTimeWindows['startHour']!,
      'startMinute': prefs.getInt('maintenance_start_minute') ?? defaultTimeWindows['startMinute']!,
      'endHour': prefs.getInt('maintenance_end_hour') ?? defaultTimeWindows['endHour']!,
      'endMinute': prefs.getInt('maintenance_end_minute') ?? defaultTimeWindows['endMinute']!,
    };
  }

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

  Future<void> cancelMaintenance() async {
    await Workmanager().cancelByTag(_maintenanceTaskTag);
  }

  Future<void> pauseMaintenance() async {
    await Workmanager().cancelByTag(_maintenanceTaskTag);
  }

  Future<void> resumeMaintenance() async {
    await _scheduleMaintenance();
  }
}