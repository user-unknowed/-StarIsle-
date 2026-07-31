import 'package:flutter/material.dart';

class TeacherTheme {
  static const Color starNightBlue = Color(0xFF2B3A67);
  static const Color starNightBlueLight = Color(0xFF4A6FA5);
  static const Color warmOrange = Color(0xFFFF9A56);
  static const Color warmOrangeLight = Color(0xFFFFC93C);
  static const Color lightGold = Color(0xFFFFE5A0);
  static const Color deepBluePurple = Color(0xFF1A1B3A);
  static const Color palePink = Color(0xFFFFB5B5);
  
  static const Color riskGreen = Color(0xFF66BB6A);
  static const Color riskYellow = Color(0xFFFFCA28);
  static const Color riskOrange = Color(0xFFFF9800);
  static const Color riskRed = Color(0xFFEF5350);
  
  static const Color successColor = Color(0xFF4CAF50);
  static const Color warningColor = Color(0xFFFF9800);
  static const Color errorColor = Color(0xFFF44336);
  static const Color infoColor = Color(0xFF2196F3);

  static ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    primaryColor: starNightBlue,
    scaffoldBackgroundColor: const Color(0xFFF5F7FA),
    
    colorScheme: ColorScheme.light(
      primary: starNightBlue,
      secondary: warmOrange,
      surface: const Color(0xFFFFFFFF),
      error: errorColor,
    ),
    
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
    
    cardTheme: CardTheme(
      color: Colors.white,
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
    ),
    
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
    
    bottomNavigationBarTheme: BottomNavigationBarThemeData(
      backgroundColor: Colors.white,
      selectedItemColor: starNightBlue,
      unselectedItemColor: const Color(0xFF999999),
      selectedLabelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
      unselectedLabelStyle: const TextStyle(fontSize: 12),
      elevation: 8,
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
      error: errorColor,
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
        borderRadius: BorderRadius.circular(12),
      ),
    ),
    
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
    
    bottomNavigationBarTheme: BottomNavigationBarThemeData(
      backgroundColor: const Color(0xFF1A1B3A),
      selectedItemColor: warmOrange,
      unselectedItemColor: const Color(0xFF666666),
      elevation: 8,
    ),
  );
}