package com.starisle.student.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Air
import androidx.compose.material.icons.filled.Bedtime
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material.icons.filled.SelfImprovement
import androidx.compose.material.icons.filled.Spa
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.starisle.student.theme.StarNightBlue

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExploreScreen(navController: NavController? = null) {
    val meditationItems = listOf(
        MeditationItem("考前放松", "5分钟", Icons.Filled.SelfImprovement),
        MeditationItem("入睡引导", "8分钟", Icons.Filled.Bedtime),
        MeditationItem("情绪安抚", "5分钟", Icons.Filled.Spa),
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("探索") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = StarNightBlue,
                    titleContentColor = Color.White,
                ),
            )
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(16.dp),
        ) {
            // 情绪探索入口
            item {
                ExploreCard(
                    icon = Icons.Filled.Explore,
                    title = "情绪探索",
                    subtitle = "了解自己的情绪状态",
                    onClick = { navController?.navigate("ai-tools") },
                )
            }

            // 冥想放松区
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("冥想放松", fontSize = 18.sp, fontWeight = FontWeight.W600)
                        Spacer(Modifier.height(8.dp))
                        meditationItems.forEach { item ->
                            MeditationRow(item)
                            Spacer(Modifier.height(4.dp))
                        }
                    }
                }
            }

            // 呼吸练习入口
            item {
                ExploreCard(
                    icon = Icons.Filled.Air,
                    title = "呼吸练习",
                    subtitle = "跟随节奏，放松身心",
                    onClick = { /* TODO: /breathing */ },
                )
            }
        }
    }
}

private data class MeditationItem(
    val title: String,
    val subtitle: String,
    val icon: ImageVector,
)

@Composable
private fun ExploreCard(
    icon: ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        onClick = onClick,
    ) {
        androidx.compose.foundation.layout.Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
        ) {
            Icon(icon, contentDescription = null)
            Spacer(Modifier.height(8.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(title)
                Text(subtitle, fontSize = 12.sp, color = Color.Gray)
            }
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null)
        }
    }
}

@Composable
private fun MeditationRow(item: MeditationItem) {
    androidx.compose.foundation.layout.Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        verticalAlignment = androidx.compose.ui.Alignment.CenterVertically,
    ) {
        Icon(item.icon, contentDescription = null)
        Spacer(Modifier.height(8.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(item.title)
            Text(item.subtitle, fontSize = 12.sp, color = Color.Gray)
        }
        Icon(Icons.Filled.PlayCircle, contentDescription = null, modifier = Modifier.alpha(0.5f))
    }
}
