/// @file main.dart
/// @description 学生端 StarIsle 应用的入口文件，负责初始化 Flutter 绑定、
///              启动内存存储维护调度器与存储监控，并以 Riverpod ProviderScope 包裹应用根 Widget。
/// @module student-app/main

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'src/app.dart';
import 'services/memory_storage/maintenance_scheduler.dart';
import 'services/memory_storage/storage_monitor.dart';

/// 应用程序入口函数。
///
/// 异步执行以下启动流程：
/// 1. 确保 Flutter Widgets 绑定初始化（异步插件依赖）；
/// 2. 初始化并启动内存存储维护调度器 [MaintenanceScheduler]；
/// 3. 启动存储监控 [StorageMonitor] 持续监听存储状态；
/// 4. 以 [ProviderScope] 包裹根 Widget [StarIsleApp] 并运行应用。
void main() async {
  // 初始化 Flutter 绑定，确保在调用原生插件前完成引擎初始化
  WidgetsFlutterBinding.ensureInitialized();

  // 创建并初始化内存存储维护调度器，负责周期性维护任务
  final maintenanceScheduler = MaintenanceScheduler();
  await maintenanceScheduler.initialize();

  // 启动存储监控，持续监听存储使用情况并响应异常
  final storageMonitor = StorageMonitor();
  await storageMonitor.startMonitoring();

  // 使用 Riverpod 的 ProviderScope 包裹根 Widget，启动应用
  runApp(
    ProviderScope(
      child: StarIsleApp(),
    ),
  );
}