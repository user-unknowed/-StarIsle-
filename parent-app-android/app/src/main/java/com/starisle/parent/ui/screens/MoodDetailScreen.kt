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
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Tag
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material3.Card
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
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
import com.starisle.parent.data.models.MoodTrendData
import com.starisle.parent.theme.AlertRed500
import com.starisle.parent.theme.AlertYellow500
import com.starisle.parent.theme.Indigo500
import com.starisle.parent.theme.Purple500
import com.starisle.parent.theme.Purple600
import com.starisle.parent.theme.SafeGreen500
import com.starisle.parent.theme.Warm400
import com.starisle.parent.theme.Warm500
import com.starisle.parent.theme.Warm600
import com.starisle.parent.ui.components.MoodTrendChart
import com.starisle.parent.ui.viewmodel.ParentViewModel

/**
 * 情绪趋势详情页（对应 MoodDetail.tsx）。
 *
 * - 7 / 30 / 90 天切换
 * - 柱状图
 * - 标签分布
 * - 打卡日历
 * - AI 关怀建议
 */
@Composable
fun MoodDetailScreen(
    onBack: () -> Unit,
    viewModel: ParentViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var range by remember { mutableStateOf(7) }

    LaunchedEffect(state.selectedChildId, range) {
        val child = state.children.firstOrNull { it.bindingId == state.selectedChildId }
        if (child != null) {
            viewModel.fetchMoodTrend(child.studentId, range)
            viewModel.fetchMoodSummary(child.studentId)
        }
    }

    val child = state.children.firstOrNull { it.bindingId == state.selectedChildId }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(bottom = 24.dp)
    ) {
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surface)
                    .padding(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "返回")
                }
                Column {
                    Text("情绪趋势详情", fontWeight = FontWeight.Bold)
                    Text(child?.studentNickname ?: "",
                        color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                }
            }
        }

        // 趋势图
        item {
            Card(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                shape = RoundedCornerShape(24.dp)
            ) {
                Column(Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.TrendingUp, contentDescription = null, tint = Warm600)
                        Spacer(Modifier.width(6.dp))
                        Text("情绪趋势", fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                        // 范围切换
                        Row(
                            modifier = Modifier
                                .clip(RoundedCornerShape(12.dp))
                                .background(MaterialTheme.colorScheme.surfaceVariant)
                                .padding(2.dp)
                        ) {
                            listOf(7, 30, 90).forEach { r ->
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = if (range == r) MaterialTheme.colorScheme.surface
                                    else Color.Transparent,
                                    onClick = { range = r }
                                ) {
                                    Text("${r}天",
                                        color = if (range == r) Warm600
                                        else MaterialTheme.colorScheme.onSurfaceVariant,
                                        fontSize = 11.sp,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp))
                                }
                            }
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                    if (state.moodTrend.isEmpty()) {
                        Box(Modifier.fillMaxWidth().height(120.dp),
                            contentAlignment = Alignment.Center) {
                            Text("暂无心情记录",
                                color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    } else {
                        MoodTrendChart(
                            levels = state.moodTrend.map { it.moodLevel },
                            dates = state.moodTrend.map { it.date }
                        )
                    }
                    state.moodSummary?.let { s ->
                        Spacer(Modifier.height(12.dp))
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = Indigo500.copy(alpha = 0.08f)
                        ) {
                            Text(s.description,
                                modifier = Modifier.padding(12.dp),
                                fontSize = 12.sp)
                        }
                    }
                }
            }
        }

        // 标签分布
        item {
            Card(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                shape = RoundedCornerShape(24.dp)
            ) {
                Column(Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Tag, contentDescription = null, tint = Purple500)
                        Spacer(Modifier.width(6.dp))
                        Text("情绪标签分布", fontWeight = FontWeight.Bold)
                    }
                    Spacer(Modifier.height(12.dp))
                    val tags = state.moodSummary?.tagDistribution?.entries?.toList().orEmpty()
                    if (tags.isEmpty()) {
                        Text("暂无标签数据", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    } else {
                        val maxCount = tags.maxOf { it.value }.coerceAtLeast(1)
                        tags.forEach { (tag, count) ->
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(tag, modifier = Modifier.width(72.dp), fontSize = 12.sp)
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(24.dp)
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(MaterialTheme.colorScheme.surfaceVariant)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth((count.toFloat() / maxCount.toFloat()).coerceIn(0.05f, 1f))
                                            .height(24.dp)
                                            .clip(RoundedCornerShape(12.dp))
                                            .background(Brush.horizontalGradient(listOf(Purple500, Indigo500)))
                                    ) {
                                        Text("$count 次", color = Color.White, fontSize = 11.sp,
                                            modifier = Modifier
                                                .align(Alignment.CenterEnd)
                                                .padding(horizontal = 6.dp))
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // 打卡日历
        item {
            Card(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                shape = RoundedCornerShape(24.dp)
            ) {
                Column(Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.CalendarMonth, contentDescription = null, tint = Indigo500)
                        Spacer(Modifier.width(6.dp))
                        Text("打卡日历", fontWeight = FontWeight.Bold)
                    }
                    Spacer(Modifier.height(12.dp))
                    CalendarGrid(state.moodTrend, range)
                }
            }
        }

        // AI 建议
        state.moodSummary?.let { s ->
            item {
                Card(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                    shape = RoundedCornerShape(24.dp),
                    colors = androidx.compose.material3.CardDefaults.cardColors(containerColor = Color.Transparent)
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
                                    Icon(Icons.Default.AutoAwesome, contentDescription = null,
                                        tint = Color.White)
                                }
                            }
                            Spacer(Modifier.width(12.dp))
                            Column {
                                Text("AI 关怀建议", color = Color.White, fontWeight = FontWeight.Bold)
                                Spacer(Modifier.height(4.dp))
                                Text(s.aiSuggestion,
                                    color = Color.White.copy(alpha = 0.9f), fontSize = 12.sp)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CalendarGrid(trend: List<MoodTrendData>, range: Int) {
    val today = java.time.LocalDate.now()
    val format = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd")
    val days = (range - 1 downTo 0).map { today.minusDays(it.toLong()) }
    val weekdayNames = listOf("日", "一", "二", "三", "四", "五", "六")
    val columns = 7
    Column {
        for (r in 0 until (days.size + columns - 1) / columns) {
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                for (c in 0 until columns) {
                    val idx = r * columns + c
                    if (idx >= days.size) {
                        Box(Modifier.weight(1f))
                    } else {
                        val date = days[idx]
                        val mood = trend.firstOrNull { it.date == date.format(format) }
                        val color = mood?.moodLevel?.let { level ->
                            when (level) {
                                in 1..2 -> AlertRed500
                                3 -> AlertYellow500
                                4 -> Indigo500
                                else -> SafeGreen500
                            }
                        }
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
                                color = color ?: MaterialTheme.colorScheme.surfaceVariant
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Text(
                                        if (mood != null) moodEmoji(mood.moodLevel)
                                        else "${date.dayOfMonth}",
                                        color = if (mood != null) Color.White
                                        else MaterialTheme.colorScheme.onSurfaceVariant,
                                        fontSize = 12.sp
                                    )
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

private fun moodEmoji(level: Int): String = when (level) {
    1 -> "😔"
    2 -> "😞"
    3 -> "😐"
    4 -> "😊"
    5 -> "😄"
    else -> "😐"
}
