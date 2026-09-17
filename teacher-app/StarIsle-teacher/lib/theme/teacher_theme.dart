/// @file teacher_theme.dart
/// @description 教师端 StarIsle Teacher 主题定义，集中维护品牌色、风险等级色、状态色
///              以及浅色/暗色 [ThemeData]，覆盖色彩方案、AppBar、卡片、按钮、文本与底部导航样式。
/// @module teacher-app/theme

import 'package:flutter/material.dart';

/// 教师端主题配置类。
///
/// 提供品牌色板、风险等级色、状态色，以及浅色主题 [lightTheme] 与暗色主题 [darkTheme]。
class TeacherTheme {
  // === 星屿品牌色彩 ===
  static const Color starNightBlue = Color(0xFF2B3A67); // 主品牌色：星夜蓝
  static const Color starNightBlueLight = Color(0xFF4A6FA5); // 浅色版星夜蓝（暗色主题主色）
  static const Color warmOrange = Color(0xFFFF9A56); // 暖橙色（次要色）
  static const Color warmOrangeLight = Color(0xFFFFC93C); // 浅暖橙
  static const Color lightGold = Color(0xFFFFE5A0); // 浅金色
  static const Color deepBluePurple = Color(0xFF1A1B3A); // 深蓝紫（背景/文本）
  static const Color palePink = Color(0xFFFFB5B5); // 淡粉色

  // === 风险等级色彩 ===
  static const Color riskGreen = Color(0xFF66BB6A); // 低风险：绿
  static const Color riskYellow = Color(0xFFFFCA28); // 中低风险：黄
  static const Color riskOrange = Color(0xFFFF9800); // 中高风险：橙
  static const Color riskRed = Color(0xFFEF5350); // 高风险：红

  // === 状态语义色 ===
  static const Color successColor = Color(0xFF4CAF50); // 成功
  static const Color warningColor = Color(0xFFFF9800); // 警告
  static const Color errorColor = Color(0xFFF44336); // 错误
  static const Color infoColor = Color(0xFF2196F3); // 信息

  /// 浅色主题数据。
  static ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    primaryColor: starNightBlue,
    scaffoldBackgroundColor: const Color(0xFFF5F7FA),

    // 浅色色彩方案
    colorScheme: ColorScheme.light(
      primary: starNightBlue,
      secondary: warmOrange,
      surface: const Color(0xFFFFFFFF),
      error: errorColor,
    ),

    // AppBar 主题：星夜蓝背景、白色前景、居中标题
    appBarTheme: AppBarTheme(
      backgroundColor: starNightBlue,
      foregroundColor: Colors.white,
      elevation: 0,
      centerTitle: true,
      titleTextStyle: const TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.w600,
      ),
    ),

    // 卡片主题：白色背景、圆角 12、elevation 2
    cardTheme: CardTheme(
      color: Colors.white,
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
    ),

    // 提升按钮主题：星夜蓝背景、圆角 20、无 elevation
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: starNightBlue,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        elevation: 0,
      ),
    ),

    // 描边按钮主题：星夜蓝前景与边框、圆角 20
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: starNightBlue,
        side: BorderSide(color: starNightBlue, width: 1),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
      ),
    ),

    // 文本主题：标题使用星夜蓝、正文使用深蓝紫
    textTheme: const TextTheme(
      headlineLarge: TextStyle(
        fontSize: 28,
        fontWeight: FontWeight.bold,
        color: starNightBlue,
      ),
      headlineMedium: TextStyle(
        fontSize: 22,
        fontWeight: FontWeight.w600,
        color: starNightBlue,
      ),
      headlineSmall: TextStyle(
        fontSize: 18,
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
      bodySmall: TextStyle(
        fontSize: 12,
        color: Color(0xFF666666),
      ),
      labelLarge: TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: Colors.white,
      ),
      labelMedium: TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.w500,
        color: starNightBlue,
      ),
    ),

    // 底部导航栏主题：白底、选中星夜蓝
    bottomNavigationBarTheme: BottomNavigationBarThemeData(
      backgroundColor: Colors.white,
      selectedItemColor: starNightBlue,
      unselectedItemColor: const Color(0xFF999999),
      selectedLabelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
      unselectedLabelStyle: const TextStyle(fontSize: 12),
      elevation: 8,
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
      error: errorColor,
    ),

    // AppBar 主题：深蓝紫背景、白色前景
    appBarTheme: AppBarTheme(
      backgroundColor: deepBluePurple,
      foregroundColor: Colors.white,
      elevation: 0,
      centerTitle: true,
    ),

    // 卡片主题：星夜蓝背景、圆角 12
    cardTheme: CardTheme(
      color: const Color(0xFF2B3A67),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
    ),

    // 文本主题：暗色模式下统一使用白色
    textTheme: const TextTheme(
      headlineLarge: TextStyle(
        fontSize: 28,
        fontWeight: FontWeight.bold,
        color: Colors.white,
      ),
      headlineMedium: TextStyle(
        fontSize: 22,
        fontWeight: FontWeight.w600,
        color: Colors.white,
      ),
      headlineSmall: TextStyle(
        fontSize: 18,
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
      bodySmall: TextStyle(
        fontSize: 12,
        color: Color(0xFFAAAAAA),
      ),
    ),

    // 底部导航栏主题：深蓝紫背景、选中暖橙
    bottomNavigationBarTheme: BottomNavigationBarThemeData(
      backgroundColor: const Color(0xFF1A1B3A),
      selectedItemColor: warmOrange,
      unselectedItemColor: const Color(0xFF666666),
      elevation: 8,
    ),
  );
}