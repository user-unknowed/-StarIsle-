/// @file main.dart
/// @description 教师端 StarIsle Teacher 应用入口文件，负责初始化 Flutter 绑定、
///              启动内存存储维护调度器与存储监控，并以 Riverpod ProviderScope 包裹应用根 Widget。
/// @module teacher-app/main

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'src/app.dart';
import 'services/memory_storage/maintenance_scheduler.dart';
import 'services/memory_storage/storage_monitor.dart';

/// 应用程序入口函数。
///
/// 异步执行以下启动流程：
/// 1. 确保 Flutter Widgets 绑定初始化；
/// 2. 初始化并启动内存存储维护调度器 [MaintenanceScheduler]；
/// 3. 启动存储监控 [StorageMonitor] 持续监听存储状态；
/// 4. 以 [ProviderScope] 包裹根 Widget [StarIsleTeacherApp] 并运行应用。
void main() async {
  // 初始化 Flutter 绑定，确保引擎就绪
  WidgetsFlutterBinding.ensureInitialized();

  // 创建并初始化内存存储维护调度器
  final maintenanceScheduler = MaintenanceScheduler();
  await maintenanceScheduler.initialize();

  // 启动存储监控
  final storageMonitor = StorageMonitor();
  await storageMonitor.startMonitoring();

  // 使用 Riverpod ProviderScope 包裹根 Widget 启动应用
  runApp(
    ProviderScope(
      child: StarIsleTeacherApp(),
    ),
  );
}