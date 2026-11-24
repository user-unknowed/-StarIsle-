package com.starisle.parent.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.EmojiEmotions
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.ShowChart
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.starisle.parent.data.models.ChildBinding
import com.starisle.parent.theme.AlertRed500
import com.starisle.parent.theme.Indigo500
import com.starisle.parent.theme.Indigo600
import com.starisle.parent.theme.Purple500
import com.starisle.parent.theme.Purple600
import com.starisle.parent.theme.SafeGreen500
import com.starisle.parent.theme.Warm400
import com.starisle.parent.theme.Warm50
import com.starisle.parent.theme.Warm500
import com.starisle.parent.theme.Warm600
import com.starisle.parent.ui.components.MoodTrendChart
import com.starisle.parent.ui.viewmodel.ParentViewModel
import java.time.format.DateTimeFormatter

/**
 * 家长首页（对应 ParentHome.tsx 双源）。
 *
 * 孩子概览卡片、情绪趋势图、打卡日历、AI 关怀建议、快捷入口、推荐阅读。
 */
@Composable
fun HomeScreen(
    onNavigateChat: () -> Unit,
    onNavigateMoodDetail: () -> Unit,
    onNavigateEmergency: () -> Unit,
    onNavigateChildren: () -> Unit,
    onNavigateProfile: () -> Unit,
    viewModel: ParentViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.fetchChildren()
        viewModel.fetchAlerts()
    }
    LaunchedEffect(state.selectedChildId) {
        val id = state.selectedChildId
        if (!id.isNullOrEmpty()) {
            viewModel.fetchChildMood(7)
            val studentId = state.children.firstOrNull { it.bindingId == id }?.studentId
            if (!studentId.isNullOrEmpty()) {
                viewModel.fetchMoodTrend(studentId, 7)
                viewModel.fetchMoodSummary(studentId)
            }
        }
    }

    val selectedChild = state.children.firstOrNull { it.bindingId == state.selectedChildId }
    val currentMood = state.childMood.lastOrNull()?.moodLevel
    val continuousDays = state.childMood.size
    val activeAlert = state.emergencyAlerts.firstOrNull { !it.confirmed }
    val riskLevel = activeAlert?.level ?: selectedChild?.riskLevel ?: "green"
    val knowledgeArticles = state.knowledgeArticles
    LaunchedEffect(Unit) { viewModel.fetchKnowledgeArticles() }

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Warm50, Color.White, Color(0xFFFFF8F0)))),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(bottom = 100.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // 顶部孩子情绪状态
        item {
            Card(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Color.Transparent)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Brush.horizontalGradient(listOf(Warm400, Warm600)))
                        .padding(20.dp)
                ) {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.EmojiEmotions, contentDescription = null, tint = Color.White)
                            Spacer(Modifier.width(6.dp))
                            Text("孩子情绪状态", color = Color.White.copy(alpha = 0.9f), fontSize = 13.sp)
                        }
                        Spacer(Modifier.height(6.dp))
                        Text(selectedChild?.studentNickname ?: "请先绑定孩子",
                            color = Color.White, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                        Spacer(Modifier.height(4.dp))
                        Text(
                            if (selectedChild != null)
                                "当前心情 ${moodEmoji(currentMood)} · 关注孩子每一天"
                            else "请先绑定孩子以查看状态",
                            color = Color.White.copy(alpha = 0.85f), fontSize = 12.sp
                        )
                        if (state.isUsingMockData) {
                            Text("(后端未连接，展示示例数据)",
                                color = Color.White.copy(alpha = 0.8f), fontSize = 11.sp)
                        }
                    }
                    Surface(
                        modifier = Modifier.align(Alignment.TopEnd).size(56.dp).clip(RoundedCornerShape(16.dp)),
                        color = Color.White.copy(alpha = 0.2f)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text(moodEmoji(currentMood), fontSize = 32.sp)
                        }
                    }
                }
            }
        }

        // 三项核心指标
        item {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                MetricCard("当前心情", "${moodEmoji(currentMood)} ${currentMood ?: "-"}/${if (currentMood != null) 5 else "-"}",
                    Warm400, Modifier.weight(1f))
                MetricCard("连续打卡", "${continuousDays}天", Indigo500, Modifier.weight(1f))
                MetricCard("风险等级", riskLabel(riskLevel), riskColor(riskLevel), Modifier.weight(1f))
            }
        }

        // 情绪趋势
        item {
            Card(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                shape = RoundedCornerShape(24.dp)
            ) {
                Column(Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.ShowChart, contentDescription = null, tint = Warm600)
                        Spacer(Modifier.width(6.dp))
                        Text("情绪趋势", fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                        TextButton(onClick = onNavigateMoodDetail) {
                            Text("7天趋势", color = Warm600, fontSize = 12.sp)
                            Icon(Icons.Default.ChevronRight, contentDescription = null, tint = Warm600)
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                    if (state.childMood.isEmpty()) {
                        Box(Modifier.fillMaxWidth().height(120.dp), contentAlignment = Alignment.Center) {
                            Text("暂无心情记录", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    } else {
                        MoodTrendChart(
                            levels = state.childMood.takeLast(7).map { it.moodLevel },
                            dates = state.childMood.takeLast(7).map { it.checkinDate }
                        )
                    }
                }
            }
        }

        // 打卡日历（最近 14 天）
        item {
            Card(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                shape = RoundedCornerShape(24.dp)
            ) {
                Column(Modifier.padding(16.dp)) {
                    Text("打卡日历", fontWeight = FontWeight.Bold)
                    Spacer(Modifier.height(12.dp))
                    CheckinCalendar(state.moodSummary?.checkinCalendar ?: emptyList())
                }
            }
        }

        // AI 关怀建议
        state.moodSummary?.let { summary ->
            item {
                Card(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.Transparent)
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Brush.horizontalGradient(listOf(Indigo500, Purple600)))
                            .padding(16.dp)
                    ) {
                        Row(verticalAlignment = Alignment.Top) {
                            Surface(
                                modifier = Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)),
                                color = Color.White.copy(alpha = 0.2f)
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(Icons.Default.AutoAwesome, contentDescription = null, tint = Color.White)
                                }
                            }
                            Spacer(Modifier.width(12.dp))
                            Column {
                                Text("AI 关怀建议", color = Color.White, fontWeight = FontWeight.Bold)
                                Spacer(Modifier.height(4.dp))
                                Text(summary.aiSuggestion, color = Color.White.copy(alpha = 0.9f), fontSize = 12.sp)
                            }
                        }
                    }
                }
            }
        }

        // 未授权引导
        if (selectedChild != null && !selectedChild.authorized) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF9E6))
                ) {
                    Column(Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Warning, contentDescription = null, tint = Color(0xFFCA8A04))
                            Spacer(Modifier.width(6.dp))
                            Text("孩子还未授权", fontWeight = FontWeight.Bold, color = Color(0xFF854D0E))
                        }
                        Spacer(Modifier.height(4.dp))
                        Text("您可以在家庭中与孩子沟通后开启情绪状态查看权限。",
                            color = Color(0xFF854D0E), fontSize = 12.sp)
                        Spacer(Modifier.height(8.dp))
                        TextButton(onClick = onNavigateChat) {
                            Text("如何跟孩子聊这件事 ›", color = Color(0xFF854D0E))
                        }
                    }
                }
            }
        }

        // 快捷入口
        item {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                QuickEntry("跟大星聊聊", Warm400, onNavigateChat, Modifier.weight(1f))
                QuickEntry("情绪趋势", Indigo500, onNavigateMoodDetail, Modifier.weight(1f))
                QuickEntry("知识库", Purple500, onNavigateProfile, Modifier.weight(1f))
            }
        }

        // 推荐阅读
        if (knowledgeArticles.isNotEmpty()) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                    shape = RoundedCornerShape(24.dp)
                ) {
                    Column(Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("推荐阅读", fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                            Text("查看全部", color = Warm600, fontSize = 12.sp)
                        }
                        Spacer(Modifier.height(8.dp))
                        knowledgeArticles.take(2).forEach { art ->
                            Column(modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 6.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f))
                                .padding(12.dp)
                            ) {
                                Row {
                                    Text(art.category, color = Warm600, fontSize = 11.sp)
                                    Spacer(Modifier.width(8.dp))
                                    Text("${art.readTime}分钟阅读",
                                        color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                                }
                                Spacer(Modifier.height(4.dp))
                                Text(art.title, fontWeight = FontWeight.Medium)
                                Spacer(Modifier.height(2.dp))
                                Text(art.summary, fontSize = 12.sp, maxLines = 2,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun MetricCard(label: String, value: String, color: Color, modifier: Modifier = Modifier) {
    Card(modifier = modifier, shape = RoundedCornerShape(16.dp)) {
        Column(Modifier.padding(12.dp)) {
            Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
            Spacer(Modifier.height(4.dp))
            Text(value, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = color)
        }
    }
}

@Composable
private fun QuickEntry(label: String, color: Color, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Card(modifier = modifier, shape = RoundedCornerShape(16.dp), onClick = onClick) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Surface(
                modifier = Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)),
                color = color.copy(alpha = 0.15f)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Favorite, contentDescription = null, tint = color)
                }
            }
            Spacer(Modifier.height(6.dp))
            Text(label, fontSize = 12.sp)
        }
    }
}

@Composable
private fun CheckinCalendar(dates: List<String>) {
    val today = java.time.LocalDate.now()
    val days = (13 downTo 0).map { today.minusDays(it.toLong()) }
    val weekdayNames = listOf("日", "一", "二", "三", "四", "五", "六")
    val columns = 7
    val rows = (days.size + columns - 1) / columns
    val format = DateTimeFormatter.ofPattern("yyyy-MM-dd")
    Column {
        for (r in 0 until rows) {
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                for (c in 0 until columns) {
                    val idx = r * columns + c
                    if (idx >= days.size) {
                        Box(Modifier.weight(1f))
                    } else {
                        val date = days[idx]
                        val checked = dates.any { it == date.format(format) }
                        Column(
                            modifier = Modifier.weight(1f),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(weekdayNames[date.dayOfWeek.value % 7],
                                fontSize = 10.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(Modifier.height(2.dp))
                            Surface(
                                modifier = Modifier.size(28.dp).clip(CircleShape),
                                color = if (checked) Indigo500 else MaterialTheme.colorScheme.surfaceVariant
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Text("${date.dayOfMonth}",
                                        color = if (checked) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                                        fontSize = 12.sp)
                                }
                            }
                        }
                    }
                }
            }
            Spacer(Modifier.height(6.dp))
        }
    }
}

private fun moodEmoji(level: Int?): String = when (level) {
    null -> "❓"
    1 -> "😔"
    2 -> "😞"
    3 -> "😐"
    4 -> "😊"
    5 -> "😄"
    else -> "😐"
}

private fun riskLabel(level: String?): String = when (level) {
    "red" -> "紧急"
    "orange" -> "需关注"
    "yellow" -> "注意"
    else -> "正常"
}

private fun riskColor(level: String?): Color = when (level) {
    "red" -> AlertRed500
    "orange" -> Warm500
    "yellow" -> Color(0xFFFBC02D)
    else -> SafeGreen500
}

private val TextButton: @Composable (
    onClick: () -> Unit,
    content: @Composable androidx.compose.foundation.layout.RowScope.() -> Unit
) -> Unit = { onClick, content ->
    androidx.compose.material3.TextButton(onClick = onClick, content = content)
}
