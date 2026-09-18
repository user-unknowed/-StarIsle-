package com.starisle.parent.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.starisle.parent.theme.StarIsleParentTheme
import com.starisle.parent.ui.components.BottomNavBar
import com.starisle.parent.ui.components.ParentTab
import com.starisle.parent.ui.screens.ChatScreen
import com.starisle.parent.ui.screens.ChildrenScreen
import com.starisle.parent.ui.screens.EmergencyDetailScreen
import com.starisle.parent.ui.screens.EmergencyScreen
import com.starisle.parent.ui.screens.HomeScreen
import com.starisle.parent.ui.screens.MoodDetailScreen
import com.starisle.parent.ui.screens.ProfileScreen

/**
 * 根 Composable：主题 + NavHost + 底部导航。
 *
 * 对应 web-frontend/src/App.tsx 的路由：
 *  - /parent            → HomeScreen
 *  - /parent/chat       → ChatScreen
 *  - /parent/profile    → ProfileScreen
 *  - /parent/mood        → MoodDetailScreen
 *  - /parent/emergency   → EmergencyScreen
 *  - /parent/emergency/:alertId → EmergencyDetailScreen
 *  - /parent/children    → ChildrenScreen
 *
 * 底部 NavigationBar 仅在主 3 tab（Home/Chat/Profile）显示，
 * 详情页隐藏底栏。
 */
@Composable
fun ParentApp() {
    StarIsleParentTheme {
        val navController = rememberNavController()
        val backStackEntry by navController.currentBackStackEntryAsState()
        val currentRoute = backStackEntry?.destination?.route

        val showBottomBar = ParentTab.entries.any { it.route == currentRoute }
        val currentTab = ParentTab.fromRoute(currentRoute)

        Scaffold(
            bottomBar = {
                if (showBottomBar) {
                    BottomNavBar(
                        current = currentTab,
                        onSelected = { tab ->
                            if (tab.route != currentRoute) {
                                navController.navigate(tab.route) {
                                    popUpTo(ParentTab.Home.route) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            }
                        }
                    )
                }
            }
        ) { innerPadding ->
            NavHost(
                navController = navController,
                startDestination = ParentTab.Home.route,
                modifier = Modifier.padding(innerPadding)
            ) {
                // 首页
                composable(ParentTab.Home.route) {
                    HomeScreen(
                        onNavigateChat = { navController.navigate(ParentTab.Chat.route) },
                        onNavigateMoodDetail = { navController.navigate("moodDetail") },
                        onNavigateEmergency = { navController.navigate("emergency") },
                        onNavigateChildren = { navController.navigate("children") },
                        onNavigateProfile = { navController.navigate(ParentTab.Profile.route) }
                    )
                }
                // 聊一聊
                composable(ParentTab.Chat.route) {
                    ChatScreen()
                }
                // 我的
                composable(ParentTab.Profile.route) {
                    ProfileScreen(
                        onLogout = {
                            navController.navigate(ParentTab.Home.route) {
                                popUpTo(ParentTab.Home.route) { inclusive = true }
                            }
                        },
                        onNavigateChildren = { navController.navigate("children") }
                    )
                }
                // 情绪趋势详情
                composable("moodDetail") {
                    MoodDetailScreen(onBack = { navController.popBackStack() })
                }
                // 应急中心
                composable("emergency") {
                    EmergencyScreen(onBack = { navController.popBackStack() })
                }
                // 应急详情
                composable(
                    route = "emergencyDetail/{alertId}",
                    arguments = listOf(navArgument("alertId") {
                        type = NavType.StringType
                        defaultValue = ""
                        nullable = true
                    })
                ) { entry ->
                    val alertId = entry.arguments?.getString("alertId")?.takeIf { it.isNotBlank() }
                    EmergencyDetailScreen(
                        alertId = alertId,
                        onBack = { navController.popBackStack() }
                    )
                }
                // 孩子绑定管理
                composable("children") {
                    ChildrenScreen(onBack = { navController.popBackStack() })
                }
            }
        }
    }
}
