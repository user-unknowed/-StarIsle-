import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'src/app.dart';
import 'services/memory_storage/maintenance_scheduler.dart';
import 'services/memory_storage/storage_monitor.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  final maintenanceScheduler = MaintenanceScheduler();
  await maintenanceScheduler.initialize();
  
  final storageMonitor = StorageMonitor();
  await storageMonitor.startMonitoring();
  
  runApp(
    ProviderScope(
      child: StarIsleTeacherApp(),
    ),
  );
}