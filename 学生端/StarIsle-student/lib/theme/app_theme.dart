import 'package:flutter/material.dart';

class AppTheme {
  // 星屿品牌色彩
  static const Color starNightBlue = Color(0xFF2B3A67);
  static const Color starNightBlueLight = Color(0xFF4A6FA5);
  static const Color warmOrange = Color(0xFFFF9A56);
  static const Color warmOrangeLight = Color(0xFFFFC93C);
  static const Color lightGold = Color(0xFFFFE5A0);
  static const Color deepBluePurple = Color(0xFF1A1B3A);
  static const Color palePink = Color(0xFFFFB5B5);
  
  static ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    primaryColor: starNightBlue,
    scaffoldBackgroundColor: const Color(0xFFF8F9FE),
    
    colorScheme: ColorScheme.light(
      primary: starNightBlue,
      secondary: warmOrange,
      surface: const Color(0xFFFFFFFF),
      error: const Color(0xFFFF5252),
    ),
    
    appBarTheme: AppBarTheme(
      backgroundColor: starNightBlue,
      foregroundColor: Colors.white,
      elevation: 0,
      centerTitle: true,
    ),
    
    cardTheme: CardTheme(
      color: Colors.white,
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
    ),
    
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
  
  static ThemeData darkTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    primaryColor: starNightBlueLight,
    scaffoldBackgroundColor: const Color(0xFF1A1B3A),
    
    colorScheme: ColorScheme.dark(
      primary: starNightBlueLight,
      secondary: warmOrangeLight,
      surface: const Color(0xFF2B3A67),
      error: const Color(0xFFFF5252),
    ),
    
    appBarTheme: AppBarTheme(
      backgroundColor: deepBluePurple,
      foregroundColor: Colors.white,
      elevation: 0,
      centerTitle: true,
    ),
    
    cardTheme: CardTheme(
      color: const Color(0xFF2B3A67),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
    ),
    
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