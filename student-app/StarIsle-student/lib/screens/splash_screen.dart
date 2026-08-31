/// @file splash_screen.dart
/// @description 学生端启动页，展示品牌 Lottie 动画与标语，并根据 SharedPreferences 中
///              的首次启动标记决定跳转到隐私说明页或首页。
/// @module student-app/screens

import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../main.dart';

/// 启动页 Widget，负责品牌展示与首次启动判断。
class SplashScreen extends StatefulWidget {
  /// 构造函数。
  const SplashScreen({super.key});

  /// 创建 State 对象。
  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

/// [SplashScreen] 的 State，在初始化时执行首次启动检测。
class _SplashScreenState extends State<SplashScreen> {
  /// State 初始化时触发首次启动检查。
  @override
  void initState() {
    super.initState();
    _checkFirstLaunch();
  }

  /// 检查是否首次启动，延迟播放品牌动画后依据标记跳转。
  ///
  /// 流程：等待 2 秒品牌动画 → 读取 SharedPreferences 的 is_first_launch →
  /// 首次启动跳转 /privacy，否则跳转 /home。
  Future<void> _checkFirstLaunch() async {
    // 等待品牌动画播放完毕
    await Future.delayed(const Duration(seconds: 2));

    // 读取首次启动标记，默认为 true
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

  /// 构建启动页主体。
  ///
  /// 返回：以主品牌色为背景、居中展示 Lottie 动画与品牌名称、标语的 [Scaffold]。
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // 全屏主品牌色背景
      backgroundColor: Theme.of(context).primaryColor,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // 品牌 Lottie 动画
            Lottie.asset(
              'assets/animations/star_brand.json',
              width: 200,
              height: 200,
            ),

            const SizedBox(height: 24),

            // 品牌中文名称
            const Text(
              '星屿',
              style: TextStyle(
                fontSize: 48,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),

            const SizedBox(height: 8),

            // 品牌英文名称
            const Text(
              'StarIsle',
              style: TextStyle(
                fontSize: 20,
                color: Colors.white70,
              ),
            ),

            const SizedBox(height: 32),

            // 品牌标语
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