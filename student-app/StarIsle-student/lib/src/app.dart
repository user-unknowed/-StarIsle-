import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../screens/splash_screen.dart';
import '../screens/home_screen.dart';
import '../screens/chat_screen.dart';
import '../screens/explore_screen.dart';
import '../screens/profile_screen.dart';
import '../screens/ai_tools_screen.dart';
import '../theme/app_theme.dart';

class StarIsleApp extends ConsumerWidget {
  const StarIsleApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp(
      title: '星屿 StarIsle',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      initialRoute: '/splash',
      routes: {
        '/splash': (context) => const SplashScreen(),
        '/home': (context) => const HomeScreen(),
        '/chat': (context) => const ChatScreen(),
        '/explore': (context) => const ExploreScreen(),
        '/profile': (context) => const ProfileScreen(),
        '/ai-tools': (context) => const AiToolsScreen(),
      },
    );
  }
}