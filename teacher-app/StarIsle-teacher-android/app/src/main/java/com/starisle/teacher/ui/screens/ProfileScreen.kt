package com.starisle.teacher.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
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
import com.starisle.teacher.data.models.AuthorizationRequest
import com.starisle.teacher.data.models.KnowledgeBaseItem
import com.starisle.teacher.data.models.SelfHelpRequest
import com.starisle.teacher.data.models.TeacherMoodRecord
import com.starisle.teacher.data.models.TeacherRole
import com.starisle.teacher.theme.RiskGreen
import com.starisle.teacher.theme.RiskOrange
import com.starisle.teacher.theme.RiskRed
import com.starisle.teacher.theme.RiskYellow
import com.starisle.teacher.theme.StarNightBlue
import com.starisle.teacher.theme.StarNightBlueLight
import com.starisle.teacher.theme.TextSecondaryLight
import com.starisle.teacher.ui.components.TextBadge
import com.starisle.teacher.ui.viewmodel.TeacherViewModel
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

/**
 * 我的页面。
 *
 * 对应 Dart 端 `screens/profile_screen.dart`：
 * - 教师头像 + 基本信息卡（渐变背景）
 * - 今日心情打卡（5 个等级 + 7 日趋势）
 * - 舒压空间（5 个小游戏入口）
 * - 我的求助记录
 * - 知识库（按角色过滤）
 * - 隐私与安全
 * - 设置
 * - KnowledgeDetailScreen 知识详情页
 * - SelfHelpRequestScreen 自助求助页（复用 Chat 中的）
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    viewModel: TeacherViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val teacher = state.currentTeacher
    val role = teacher.role
    var selectedKnowledge by remember { mutableStateOf<KnowledgeBaseItem?>(null) }

    selectedKnowledge?.let { item ->
        KnowledgeDetailScreen(item = item, onBack = { selectedKnowledge = null })
        return
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text("我的") }) },
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
        ) {
            ProfileHeader(
                name = teacher.name,
                roleLabel = teacher.roleLabel,
                school = teacher.school,
                className = teacher.className,
                studentCount = teacher.studentCount,
            )
            Spacer(Modifier.height(20.dp))

            MoodCheckInCard(
                records = state.moodRecords,
                onCheckIn = { level ->
                    viewModel.addMoodRecord(
                        TeacherMoodRecord(
                            moodLevel = level,
                            stressTags = emptyList(),
                            recordedAt = LocalDateTime.now(),
                        ),
                    )
                },
            )
            Spacer(Modifier.height(20.dp))

            SectionTitle("舒压空间")
            RelaxationSpace()
            Spacer(Modifier.height(20.dp))

            SectionTitle("我的求助记录")
            HelpRecordsList(state.selfHelpRequests)
            Spacer(Modifier.height(20.dp))

            SectionTitle("知识库")
            KnowledgeBaseList(
                items = state.knowledgeBase,
                role = role,
                onItemClick = { selectedKnowledge = it },
            )
            Spacer(Modifier.height(20.dp))

            SectionTitle("隐私与安全")
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("数据存储", fontWeight = FontWeight.SemiBold)
                    Text(
                        "本地数据库已加密；维护窗口默认 22:00-06:00；定期自动清理过期数据。",
                        fontSize = 12.sp,
                        color = TextSecondaryLight,
                    )
                }
            }
            Spacer(Modifier.height(20.dp))

            SectionTitle("设置")
            Card(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { }
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Filled.Settings, contentDescription = null, tint = StarNightBlue)
                    Spacer(Modifier.width(12.dp))
                    Text("通用设置", modifier = Modifier.weight(1f))
                    Text("→", color = TextSecondaryLight)
                }
            }
            Spacer(Modifier.height(30.dp))
        }
    }
}

@Composable
private fun ProfileHeader(
    name: String,
    roleLabel: String,
    school: String,
    className: String,
    studentCount: Int,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(
                Brush.linearGradient(
                    colors = listOf(StarNightBlue, StarNightBlueLight),
                ),
            )
            .padding(20.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(60.dp)
                    .clip(CircleShape)
                    .background(Color.White),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = name.first().toString(),
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    color = StarNightBlue,
                )
            }
            Spacer(Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(name, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = Color.White)
                Spacer(Modifier.height(4.dp))
                Text(
                    "$roleLabel · $school",
                    fontSize = 14.sp,
                    color = Color.White.copy(alpha = 0.8f),
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    "负责 $className · $studentCount 名学生",
                    fontSize = 12.sp,
                    color = Color.White.copy(alpha = 0.7f),
                )
            }
            IconButton(onClick = {}) {
                Icon(Icons.Filled.Edit, contentDescription = "编辑", tint = Color.White)
            }
        }
    }
}

@Composable
private fun MoodCheckInCard(
    records: List<TeacherMoodRecord>,
    onCheckIn: (Int) -> Unit,
) {
    val today = LocalDateTime.now().toLocalDate()
    val todayRecord = records.lastOrNull { it.recordedAt.toLocalDate() == today }
    val last7 = records.takeLast(7).reversed()
    val dateFormatter = DateTimeFormatter.ofPattern("M/d")

    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("今日心情", fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                MoodButton(1, "很糟", "😢", todayRecord?.moodLevel, onCheckIn)
                MoodButton(2, "不太好", "😔", todayRecord?.moodLevel, onCheckIn)
                MoodButton(3, "一般", "😐", todayRecord?.moodLevel, onCheckIn)
                MoodButton(4, "不错", "🙂", todayRecord?.moodLevel, onCheckIn)
                MoodButton(5, "很棒", "😄", todayRecord?.moodLevel, onCheckIn)
            }
            todayRecord?.let { rec ->
                if (rec.moodLevel > 0) {
                    Spacer(Modifier.height(12.dp))
                    Text(
                        "今日已打卡：${rec.moodEmoji} ${rec.moodLabel}",
                        fontSize = 14.sp,
                        color = StarNightBlue,
                    )
                }
            }
            Spacer(Modifier.height(8.dp))
            // 简化的 7 日趋势：使用 Box 高度直接渲染（替代 fl_chart）
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(80.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                last7.forEach { record ->
                    Column(
                        modifier = Modifier
                            .padding(horizontal = 2.dp)
                            .weight(1f),
                        verticalArrangement = Arrangement.Bottom,
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Box(
                            modifier = Modifier
                                .height((record.moodLevel * 14).dp)
                                .clip(RoundedCornerShape(4.dp))
                                .background(moodColor(record.moodLevel)),
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(
                            record.recordedAt.format(dateFormatter),
                            fontSize = 10.sp,
                            color = TextSecondaryLight,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun MoodButton(
    level: Int,
    label: String,
    emoji: String,
    currentLevel: Int?,
    onCheckIn: (Int) -> Unit,
) {
    val isSelected = currentLevel == level
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        IconButton(onClick = { onCheckIn(level) }) {
            Text(
                emoji,
                fontSize = 28.sp,
                color = if (isSelected) StarNightBlue else Color.LightGray,
            )
        }
        Text(
            label,
            fontSize = 12.sp,
            color = if (isSelected) StarNightBlue else TextSecondaryLight,
        )
    }
}

private fun moodColor(level: Int): Color = when (level) {
    1 -> RiskRed
    2 -> RiskOrange
    3 -> RiskYellow
    4 -> StarNightBlueLight
    5 -> RiskGreen
    else -> Color.LightGray
}

@Composable
private fun RelaxationSpace() {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        RelaxGameCard("深呼吸", "🫁", Modifier.weight(1f))
        RelaxGameCard("冥想", "🧘", Modifier.weight(1f))
        RelaxGameCard("音乐", "🎵", Modifier.weight(1f))
    }
    Spacer(Modifier.height(8.dp))
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        RelaxGameCard("绘画", "🎨", Modifier.weight(1f))
        RelaxGameCard("日记", "📔", Modifier.weight(1f))
        Box(Modifier.weight(1f))
    }
}

@Composable
private fun RelaxGameCard(label: String, emoji: String, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier
            .clickable { }
            .padding(vertical = 4.dp),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(emoji, fontSize = 28.sp)
            Spacer(Modifier.height(4.dp))
            Text(label, fontSize = 12.sp)
        }
    }
}

@Composable
private fun HelpRecordsList(requests: List<SelfHelpRequest>) {
    val timeFormatter = DateTimeFormatter.ofPattern("MM-dd HH:mm")
    if (requests.isEmpty()) {
        Text("暂无求助记录", fontSize = 13.sp, color = TextSecondaryLight)
        return
    }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        requests.forEach { req ->
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(req.description, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                        TextBadge(
                            text = if (req.isConnected) "已连接" else "待处理",
                            color = if (req.isConnected) StarNightBlue else TextSecondaryLight,
                        )
                    }
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "类型：${req.supportType} · 紧急：${req.urgency}",
                        fontSize = 12.sp,
                        color = TextSecondaryLight,
                    )
                    Text(
                        "提交：${req.submittedAt.format(timeFormatter)}",
                        fontSize = 11.sp,
                        color = TextSecondaryLight,
                    )
                }
            }
        }
    }
}

@Composable
private fun KnowledgeBaseList(
    items: List<KnowledgeBaseItem>,
    role: TeacherRole,
    onItemClick: (KnowledgeBaseItem) -> Unit,
) {
    // 心理老师可访问全部；其他教师仅访问非专业内容
    val filtered = if (role == TeacherRole.COUNSELOR) items else items.filter { !it.isProfessional }
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        filtered.forEach { item ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onItemClick(item) },
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(item.title, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                        TextBadge(text = item.category, color = StarNightBlue)
                    }
                    Spacer(Modifier.height(4.dp))
                    Text(item.summary, fontSize = 12.sp, color = TextSecondaryLight)
                    Text("作者：${item.author}", fontSize = 11.sp, color = TextSecondaryLight)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun KnowledgeDetailScreen(
    item: KnowledgeBaseItem,
    onBack: () -> Unit,
) {
    val timeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd")
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(item.title) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = "返回")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
        ) {
            Row {
                TextBadge(text = item.category, color = StarNightBlue)
                Spacer(Modifier.width(8.dp))
                if (item.isProfessional) {
                    TextBadge(text = "专业", color = RiskOrange)
                }
            }
            Spacer(Modifier.height(8.dp))
            Text(
                "作者：${item.author} · ${item.createdAt.format(timeFormatter)}",
                fontSize = 12.sp,
                color = TextSecondaryLight,
            )
            Spacer(Modifier.height(12.dp))
            Text(item.summary, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(12.dp))
            Text(item.content, fontSize = 14.sp)
        }
    }
}

@Composable
private fun SectionTitle(title: String) {
    Text(
        text = title,
        fontSize = 16.sp,
        fontWeight = FontWeight.SemiBold,
        modifier = Modifier.padding(bottom = 8.dp),
    )
}
