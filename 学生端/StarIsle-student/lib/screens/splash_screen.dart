import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../main.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _checkFirstLaunch();
  }

  Future<void> _checkFirstLaunch() async {
    await Future.delayed(const Duration(seconds: 2)); // 品牌动画时间
    
    final prefs = await SharedPreferences.getInstance();
    final isFirstLaunch = prefs.getBool('is_first_launch') ?? true;
    
    if (isFirstLaunch) {
      // 首次启动，跳转到隐私说明页
      Navigator.pushReplacementNamed(context, '/privacy');
    } else {
      // 非首次启动，跳转到首页
      Navigator.pushReplacementNamed(context, '/home');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).primaryColor,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // 品牌动画
            Lottie.asset(
              'assets/animations/star_brand.json',
              width: 200,
              height: 200,
            ),
            
            const SizedBox(height: 24),
            
            // 品牌名称
            const Text(
              '星屿',
              style: TextStyle(
                fontSize: 48,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            
            const SizedBox(height: 8),
            
            const Text(
              'StarIsle',
              style: TextStyle(
                fontSize: 20,
                color: Colors.white70,
              ),
            ),
            
            const SizedBox(height: 32),
            
            const Text(
              '你的情绪星球，永远亮着灯',
              style: TextStyle(
                fontSize: 16,
                color: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }
}