package com.starisle.student

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.starisle.student.ui.screens.AiToolsScreen
import com.starisle.student.ui.screens.ChatScreen
import com.starisle.student.ui.screens.ExploreScreen
import com.starisle.student.ui.screens.HomeScreen
import com.starisle.student.ui.screens.ProfileScreen
import com.starisle.student.ui.screens.SplashScreen

/**
 * 应用根 Composable（对应 Dart src/app.dart 的 StarIsleApp）。
 *
 * 配置：
 * - title "星屿 StarIsle"
 * - 主题跟随系统（darkTheme = isSystemInDarkTheme）
 * - 初始路由 /splash
 * - 路由表：/splash /home /chat /explore /profile /ai-tools
 */
@Composable
fun StarIsleApp() {
    val navController = rememberNavController()
    Surface(modifier = Modifier.fillMaxSize()) {
        NavHost(
            navController = navController,
            startDestination = "splash",
        ) {
            composable("splash") {
                SplashScreen(
                    onNavigateHome = {
                        navController.navigate("home") {
                            popUpTo("splash") { inclusive = true }
                        }
                    },
                    onNavigatePrivacy = {
                        navController.navigate("home") {
                            popUpTo("splash") { inclusive = true }
                        }
                    },
                )
            }
            composable("home") { HomeScreen(navController) }
            composable("chat") { ChatScreen(navController) }
            composable("explore") { ExploreScreen(navController) }
            composable("profile") { ProfileScreen(navController) }
            composable("ai-tools") { AiToolsScreen(navController) }
        }
    }
}
