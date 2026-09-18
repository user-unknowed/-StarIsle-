package com.starisle.parent.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp

enum class ParentTab(val route: String, val label: String, val icon: ImageVector) {
    Home("home", "首页", Icons.Default.Favorite),
    Chat("chat", "聊一聊", Icons.Default.Chat),
    Profile("profile", "我的", Icons.Default.AccountCircle);

    companion object {
        fun fromRoute(route: String?): ParentTab =
            entries.firstOrNull { it.route == route } ?: Home
    }
}

@Composable
fun BottomNavBar(
    current: ParentTab,
    onSelected: (ParentTab) -> Unit
) {
    Surface(shadowElevation = 4.dp) {
        NavigationBar(
            containerColor = MaterialTheme.colorScheme.surface,
            modifier = Modifier.fillMaxWidth()
        ) {
            ParentTab.entries.forEach { tab ->
                NavigationBarItem(
                    selected = current == tab,
                    onClick = { onSelected(tab) },
                    icon = { Icon(tab.icon, contentDescription = tab.label) },
                    label = { Text(tab.label) }
                )
            }
        }
    }
}

