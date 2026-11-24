package com.starisle.student.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.SelfImprovement
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material.icons.filled.SentimentDissatisfied
import androidx.compose.material.icons.filled.SentimentSatisfied
import androidx.compose.material.icons.filled.SentimentNeutral
import androidx.compose.material.icons.filled.SentimentVeryDissatisfied
import androidx.compose.material.icons.filled.SentimentVerySatisfied
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.starisle.student.theme.StarNightBlue
import com.starisle.student.theme.WarmOrange

/**
 * 心情档位（对应 Dart mood_checkin_widget 的 5 档表情）。
 */
private data class MoodOption(
    val label: String,
    val value: Int,
    val icon: ImageVector,
    val tint: Color,
)

private val moodOptions = listOf(
    MoodOption("很差", 1, Icons.Filled.SentimentVeryDissatisfied, Color(0xFFEF5350)),
    MoodOption("不好", 2, Icons.Filled.SentimentDissatisfied, Color(0xFFFF9800)),
    MoodOption("一般", 3, Icons.Filled.SentimentNeutral, Color(0xFFFFC107)),
    MoodOption("不错", 4, Icons.Filled.SentimentSatisfied, Color(0xFF8BC34A)),
    MoodOption("很好", 5, Icons.Filled.SentimentVerySatisfied, Color(0xFF4CAF50)),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(navController: NavController? = null) {
    var selectedMood by remember { mutableStateOf<Int?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("今天感觉怎么样？") },
                actions = {
                    IconButton(onClick = { /* TODO: 打开通知设置 */ }) {
                        Icon(Icons.Filled.Notifications, contentDescription = "通知")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = StarNightBlue,
                    titleContentColor = Color.White,
                    actionIconContentColor = Color.White,
                ),
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
        ) {
            // === 心情打卡区域 ===
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        "心情打卡",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.W600,
                    )
                    Spacer(Modifier.height(16.dp))
                    LazyRow(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceEvenly,
                    ) {
                        items(moodOptions) { mood ->
                            MoodButton(
                                mood = mood,
                                isSelected = selectedMood == mood.value,
                                onClick = { selectedMood = mood.value },
                            )
                        }
                    }
                }
            }

            Spacer(Modifier.height(24.dp))

            // === 情绪晴雨表卡片（简化为静态占位）===
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("情绪晴雨表", fontSize = 18.sp, fontWeight = FontWeight.W600)
                    Spacer(Modifier.height(16.dp))
                    Text(
                        "暂无心情历史数据",
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                    )
                }
            }

            Spacer(Modifier.height(24.dp))

            // === 星宝快捷入口 ===
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                onClick = { navController?.navigate("chat") },
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    IconButton(
                        onClick = { navController?.navigate("chat") },
                        modifier = Modifier.size(48.dp),
                    ) {
                        Icon(
                            Icons.Filled.SentimentSatisfied,
                            contentDescription = "星宝",
                            tint = WarmOrange,
                            modifier = Modifier.size(40.dp),
                        )
                    }
                    Spacer(Modifier.height(8.dp))
                    Column {
                        Text("星宝", fontSize = 18.sp, fontWeight = FontWeight.W600)
                        Text(
                            "AI 伙伴，倾听你",
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                        )
                    }
                }
            }

            Spacer(Modifier.height(24.dp))

            // === 今日推荐 ===
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("今日推荐", fontSize = 18.sp, fontWeight = FontWeight.W600)
                    Spacer(Modifier.height(16.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Filled.SelfImprovement, contentDescription = null)
                        Spacer(Modifier.size(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text("考前放松")
                            Text("5分钟冥想", fontSize = 12.sp, color = Color.Gray)
                        }
                        Icon(Icons.Filled.PlayCircle, contentDescription = null)
                    }
                }
            }
        }
    }
}

@Composable
private fun MoodButton(
    mood: MoodOption,
    isSelected: Boolean,
    onClick: () -> Unit,
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.padding(horizontal = 4.dp),
    ) {
        IconButton(
            onClick = onClick,
            modifier = Modifier.size(48.dp),
        ) {
            Icon(
                imageVector = mood.icon,
                contentDescription = mood.label,
                tint = if (isSelected) mood.tint else mood.tint.copy(alpha = 0.5f),
                modifier = Modifier.size(40.dp),
            )
        }
        Text(mood.label, fontSize = 12.sp)
    }
}
