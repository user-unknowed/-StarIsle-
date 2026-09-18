package com.starisle.teacher

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import com.starisle.teacher.ui.screens.AiToolsScreen
import com.starisle.teacher.ui.screens.ChatScreen
import com.starisle.teacher.ui.screens.ProfileScreen
import com.starisle.teacher.ui.screens.StudentsScreen
import com.starisle.teacher.ui.screens.WorkbenchScreen

/**
 * 教师端根 Composable。
 *
 * 对应 Dart 端 `src/app.dart`：
 * - 4 Tab 底部导航：工作台 / 学生 / 对话 / 我的；
 * - selectedTabProvider StateProvider<int> → remember { mutableStateOf(0) }；
 * - 各 Tab 持有对应 Screen Composable。
 *
 * 注意：原 Dart App 的「我的」Tab 聚合了资料与 AI 工具入口；为保持功能一致，
 * 这里在「我的」中保留 AI 工具入口（参见 [ProfileScreen] 内的快捷操作跳转）。
 * 若需要单独的 AI 工具页，可通过 ProfileScreen 内部入口或扩展第 5 个 Tab。
 *
 * 简化：本实现将 AI 工具单独作为「工具」入口（由 ProfileScreen 内的快捷操作打开）
 * —— 为最小化破坏 Dart 端 4 Tab 结构，这里仅展示 4 个 Tab，AI 工具入口在
 * WorkbenchScreen 的快捷操作中通过回调触发（参见 onNavigateToAiTools）。
 */
@Composable
fun StarIsleTeacherRoot() {
    var selectedTab by remember { mutableStateOf(0) }
    var showAiTools by remember { mutableStateOf(false) }

    val tabs = listOf(
        TabItem("工作台", Icons.Filled.Dashboard),
        TabItem("学生", Icons.Filled.Assignment),
        TabItem("对话", Icons.Filled.Chat),
        TabItem("我的", Icons.Filled.Person),
    )

    // AI 工具覆盖层：由 Workbench 的「快捷操作」触发，关闭后回到原 Tab。
    if (showAiTools) {
        AiToolsScreen(onBack = { showAiTools = false })
        return
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        bottomBar = {
            NavigationBar {
                tabs.forEachIndexed { index, tab ->
                    NavigationBarItem(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        icon = { Icon(tab.icon, contentDescription = tab.label) },
                        label = { Text(tab.label) },
                    )
                }
            }
        },
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
        ) {
            when (selectedTab) {
                0 -> WorkbenchScreen(
                    onNavigateToAiTools = { showAiTools = true },
                )
                1 -> StudentsScreen()
                2 -> ChatScreen()
                else -> ProfileScreen()
            }
        }
    }
}

private data class TabItem(val label: String, val icon: ImageVector)
