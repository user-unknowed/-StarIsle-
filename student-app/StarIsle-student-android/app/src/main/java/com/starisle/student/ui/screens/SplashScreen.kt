package com.starisle.student.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.starisle.student.theme.StarNightBlue
import com.starisle.student.theme.WarmOrange
import kotlinx.coroutines.delay

/**
 * 启动页（对应 Dart lib/screens/splash_screen.dart）。
 *
 * 行为：
 * 1. 显示品牌视觉 2 秒（Lottie 动画简化为静态图标 + 文字）；
 * 2. 检查 SharedPreferences 的 is_first_launch 标记（暂以默认 false 跳转，
 *    实际项目可在 [StarIsleStudentApp] 注入 DataStore 后通过 ViewModel 读取）；
 * 3. 首次启动调用 [onNavigatePrivacy]，否则调用 [onNavigateHome]。
 */
@Composable
fun SplashScreen(
    onNavigateHome: () -> Unit,
    onNavigatePrivacy: () -> Unit,
) {
    LaunchedEffect(Unit) {
        // 等待品牌动画播放完毕（Dart Future.delayed 2s）
        delay(2000)
        // 暂以直接跳首页，对应 Dart 非 first-launch 分支。
        // 真实首次启动判定可在 ViewModel 通过 DataStore 读取 is_first_launch。
        onNavigateHome()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(StarNightBlue),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier.padding(24.dp),
        ) {
            // 品牌 Lottie 简化为图标（注释说明：原 Dart 使用 Lottie.asset('star_brand.json')）
            Box(
                modifier = Modifier
                    .size(200.dp)
                    .background(Color.Transparent),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Filled.Star,
                    contentDescription = null,
                    tint = WarmOrange,
                    modifier = Modifier.size(120.dp),
                )
            }

            Spacer(Modifier.height(24.dp))

            Text(
                text = "星屿",
                fontSize = 48.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White,
            )

            Spacer(Modifier.height(8.dp))

            Text(
                text = "StarIsle",
                fontSize = 20.sp,
                color = Color.White.copy(alpha = 0.7f),
            )

            Spacer(Modifier.height(32.dp))

            Text(
                text = "你的情绪星球，永远亮着灯",
                fontSize = 16.sp,
                color = Color.White,
            )
        }
    }
}
