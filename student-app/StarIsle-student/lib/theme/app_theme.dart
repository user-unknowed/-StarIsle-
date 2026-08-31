/// @file app_theme.dart
/// @description 学生端 StarIsle 应用主题定义，集中维护品牌色彩、浅色与暗色 [ThemeData]，
///              包含色彩方案、AppBar、卡片、按钮及文本样式等。
/// @module student-app/theme

import 'package:flutter/material.dart';

/// 应用主题配置类。
///
/// 集中存放品牌色板以及浅色主题 [lightTheme] 和暗色主题 [darkTheme]，
/// 由根 Widget [StarIsleApp] 在 [MaterialApp] 中使用。
class AppTheme {
  // === 星屿品牌色彩 ===
  static const Color starNightBlue = Color(0xFF2B3A67); // 主品牌色：星夜蓝
  static const Color starNightBlueLight = Color(0xFF4A6FA5); // 浅色版星夜蓝（暗色主题主色）
  static const Color warmOrange = Color(0xFFFF9A56); // 暖橙色（次要色）
  static const Color warmOrangeLight = Color(0xFFFFC93C); // 浅暖橙
  static const Color lightGold = Color(0xFFFFE5A0); // 浅金色
  static const Color deepBluePurple = Color(0xFF1A1B3A); // 深蓝紫（背景/文本）
  static const Color palePink = Color(0xFFFFB5B5); // 淡粉色

  /// 浅色主题数据。
  static ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    primaryColor: starNightBlue,
    scaffoldBackgroundColor: const Color(0xFFF8F9FE),

    // 浅色色彩方案
    colorScheme: ColorScheme.light(
      primary: starNightBlue,
      secondary: warmOrange,
      surface: const Color(0xFFFFFFFF),
      error: const Color(0xFFFF5252),
    ),

    // AppBar 主题：星夜蓝背景、白色前景、居中标题
    appBarTheme: AppBarTheme(
      backgroundColor: starNightBlue,
      foregroundColor: Colors.white,
      elevation: 0,
      centerTitle: true,
    ),

    // 卡片主题：白色背景、圆角 16
    cardTheme: CardTheme(
      color: Colors.white,
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
    ),

    // 提升按钮主题：星夜蓝背景、圆角 24
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: starNightBlue,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
        ),
      ),
    ),

    // 文本主题：标题使用星夜蓝、正文使用深蓝紫
    textTheme: const TextTheme(
      headlineLarge: TextStyle(
        fontSize: 32,
        fontWeight: FontWeight.bold,
        color: starNightBlue,
      ),
      headlineMedium: TextStyle(
        fontSize: 24,
        fontWeight: FontWeight.w600,
        color: starNightBlue,
      ),
      bodyLarge: TextStyle(
        fontSize: 16,
        color: deepBluePurple,
      ),
      bodyMedium: TextStyle(
        fontSize: 14,
        color: deepBluePurple,
      ),
    ),
  );

  /// 暗色主题数据。
  static ThemeData darkTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    primaryColor: starNightBlueLight,
    scaffoldBackgroundColor: const Color(0xFF1A1B3A),

    // 暗色色彩方案
    colorScheme: ColorScheme.dark(
      primary: starNightBlueLight,
      secondary: warmOrangeLight,
      surface: const Color(0xFF2B3A67),
      error: const Color(0xFFFF5252),
    ),

    // AppBar 主题：深蓝紫背景、白色前景
    appBarTheme: AppBarTheme(
      backgroundColor: deepBluePurple,
      foregroundColor: Colors.white,
      elevation: 0,
      centerTitle: true,
    ),

    // 卡片主题：星夜蓝背景、圆角 16
    cardTheme: CardTheme(
      color: const Color(0xFF2B3A67),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
    ),

    // 文本主题：暗色模式下统一使用白色
    textTheme: const TextTheme(
      headlineLarge: TextStyle(
        fontSize: 32,
        fontWeight: FontWeight.bold,
        color: Colors.white,
      ),
      headlineMedium: TextStyle(
        fontSize: 24,
        fontWeight: FontWeight.w600,
        color: Colors.white,
      ),
      bodyLarge: TextStyle(
        fontSize: 16,
        color: Colors.white,
      ),
      bodyMedium: TextStyle(
        fontSize: 14,
        color: Colors.white,
      ),
    ),
  );
}