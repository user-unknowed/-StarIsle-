package com.starisle.teacher.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.BugReport
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.RadioButtonUnchecked
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
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
import com.starisle.teacher.data.models.Alert
import com.starisle.teacher.data.models.RiskLevel
import com.starisle.teacher.data.models.TodoItem
import com.starisle.teacher.theme.AlertRedBg
import com.starisle.teacher.theme.AlertOrangeBg
import com.starisle.teacher.theme.StarNightBlue
import com.starisle.teacher.theme.StarNightBlueLight
import com.starisle.teacher.theme.WarmOrange
import com.starisle.teacher.theme.TextSecondaryLight
import com.starisle.teacher.ui.components.EmergencyHelpButton
import com.starisle.teacher.ui.components.RiskLevelBadge
import com.starisle.teacher.ui.components.TextBadge
import com.starisle.teacher.ui.viewmodel.TeacherViewModel
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

/**
 * 工作台页面。
 *
 * 对应 Dart 端 `screens/workbench_screen.dart`：
 * - 身份卡（教师头像 + 名称 + 角色 + 学校 + 班级 + 学生数）
 * - 今日概览（待处理预警数 / 待办数 / 报告数 / 高风险数）
 * - 高风险告警列表
 * - 快捷操作（4 个入口）
 * - 今日待办
 * - 班级情绪概览
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WorkbenchScreen(
    viewModel: TeacherViewModel = hiltViewModel(),
    onNavigateToStudents: () -> Unit = {},
    onNavigateToChat: () -> Unit = {},
    onNavigateToAiTools: () -> Unit = {},
    onNavigateToReports: () -> Unit = {},
) {
    val state by viewModel.uiState.collectAsState()
    val teacher = state.currentTeacher
    val highRiskAlerts = state.alerts.filter { it.riskLevel == RiskLevel.RED || it.riskLevel == RiskLevel.ORANGE }
    val pendingTodos = state.todos.filter { !it.isCompleted }
    val overview = state.emotionalOverview

    val timeFormatter = DateTimeFormatter.ofPattern("MM-dd HH:mm")

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("工作台") },
                actions = {
                    IconButton(onClick = onNavigateToChat) {
                        Icon(Icons.Filled.Notifications, contentDescription = "通知")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
        ) {
            // 1. 身份卡
            IdentityCard(
                name = teacher.name,
                roleLabel = teacher.roleLabel,
                school = teacher.school,
                className = teacher.className,
                studentCount = teacher.studentCount,
            )
            Spacer(Modifier.height(20.dp))

            // 2. 今日概览
            SectionTitle("今日概览")
            OverviewGrid(
                alertsCount = state.alerts.size,
                todosCount = pendingTodos.size,
                reportsCount = state.reports.size,
                highRiskCount = overview.highRiskCount,
            )
            Spacer(Modifier.height(20.dp))

            // 3. 高风险告警
            if (highRiskAlerts.isNotEmpty()) {
                SectionTitle("高风险告警")
                highRiskAlerts.forEach { alert ->
                    AlertCard(
                        alert = alert,
                        onMarkRead = { viewModel.markAlertAsRead(alert.id) },
                        onDismiss = { viewModel.dismissAlert(alert.id) },
                        timeText = alert.triggeredAt.format(timeFormatter),
                    )
                    Spacer(Modifier.height(8.dp))
                }
                Spacer(Modifier.height(12.dp))
                EmergencyHelpButton()
                Spacer(Modifier.height(20.dp))
            }

            // 4. 快捷操作
            SectionTitle("快捷操作")
            QuickActions(
                onReport = onNavigateToReports,
                onStudents = onNavigateToStudents,
                onChat = onNavigateToChat,
                onAi = onNavigateToAiTools,
            )
            Spacer(Modifier.height(20.dp))

            // 5. 今日待办
            SectionTitle("今日待办")
            if (pendingTodos.isEmpty()) {
                EmptyHint("暂无待办")
            } else {
                pendingTodos.forEach { todo ->
                    TodoRow(
                        todo = todo,
                        onToggle = { viewModel.toggleTodoComplete(todo.id) },
                        timeText = todo.deadline.format(timeFormatter),
                    )
                    Spacer(Modifier.height(6.dp))
                }
            }
            Spacer(Modifier.height(20.dp))

            // 6. 班级情绪概览
            SectionTitle("班级情绪概览")
            EmotionalOverviewCard(
                className = overview.className,
                totalStudents = overview.totalStudents,
                averageMood = overview.averageMood,
                highRiskCount = overview.highRiskCount,
                moodDistribution = overview.moodDistribution,
            )
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun IdentityCard(
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
private fun OverviewGrid(
    alertsCount: Int,
    todosCount: Int,
    reportsCount: Int,
    highRiskCount: Int,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        OverviewCell("待处理", alertsCount.toString(), WarmOrange, Modifier.weight(1f))
        OverviewCell("待办", todosCount.toString(), StarNightBlueLight, Modifier.weight(1f))
        OverviewCell("报告", reportsCount.toString(), StarNightBlue, Modifier.weight(1f))
        OverviewCell("高风险", highRiskCount.toString(), Color(0xFFEF5350), Modifier.weight(1f))
    }
}

@Composable
private fun OverviewCell(label: String, value: String, color: Color, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = color.copy(alpha = 0.1f)),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(value, fontSize = 24.sp, fontWeight = FontWeight.Bold, color = color)
            Text(label, fontSize = 12.sp, color = TextSecondaryLight)
        }
    }
}

@Composable
private fun AlertCard(
    alert: Alert,
    onMarkRead: () -> Unit,
    onDismiss: () -> Unit,
    timeText: String,
) {
    val bg = when (alert.riskLevel) {
        RiskLevel.RED -> AlertRedBg
        RiskLevel.ORANGE -> AlertOrangeBg
        else -> Color.White
    }
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { if (!alert.isRead) onMarkRead() },
        colors = CardDefaults.cardColors(containerColor = bg),
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = "${alert.studentName}",
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                    color = StarNightBlue,
                )
                Spacer(Modifier.width(8.dp))
                Text(alert.className, fontSize = 12.sp, color = TextSecondaryLight)
                Spacer(Modifier.weight(1f))
                RiskLevelBadge(level = alert.riskLevel)
            }
            Spacer(Modifier.height(6.dp))
            Text(alert.triggerReason, fontSize = 13.sp)
            Spacer(Modifier.height(6.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(timeText, fontSize = 11.sp, color = TextSecondaryLight)
                TextButton(text = "忽略", onClick = onDismiss)
            }
        }
    }
}

@Composable
private fun QuickActions(
    onReport: () -> Unit,
    onStudents: () -> Unit,
    onChat: () -> Unit,
    onAi: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        QuickAction("上报", Icons.Filled.BugReport, onReport, Modifier.weight(1f))
        QuickAction("学生", Icons.Filled.Assignment, onStudents, Modifier.weight(1f))
        QuickAction("对话", Icons.Filled.Chat, onChat, Modifier.weight(1f))
        QuickAction("AI工具", Icons.Filled.Edit, onAi, Modifier.weight(1f))
    }
}

@Composable
private fun QuickAction(
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier
            .clickable(onClick = onClick),
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Icon(icon, contentDescription = label, tint = StarNightBlue)
            Spacer(Modifier.height(4.dp))
            Text(label, fontSize = 12.sp)
        }
    }
}

@Composable
private fun TodoRow(
    todo: TodoItem,
    onToggle: () -> Unit,
    timeText: String,
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp)
                .clickable { onToggle() },
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                if (todo.isCompleted) Icons.Filled.CheckCircle else Icons.Filled.RadioButtonUnchecked,
                contentDescription = if (todo.isCompleted) "已完成" else "未完成",
                tint = if (todo.isCompleted) StarNightBlue else TextSecondaryLight,
            )
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = todo.title,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                )
                Text(text = timeText, fontSize = 11.sp, color = TextSecondaryLight)
            }
            TextBadge(
                text = todo.type.label,
                color = WarmOrange,
            )
        }
    }
}

@Composable
private fun EmotionalOverviewCard(
    className: String,
    totalStudents: Int,
    averageMood: Double,
    highRiskCount: Int,
    moodDistribution: Map<String, Int>,
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(className, fontWeight = FontWeight.SemiBold, color = StarNightBlue)
                Text("共 $totalStudents 人", fontSize = 12.sp, color = TextSecondaryLight)
            }
            Spacer(Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text("平均心情", fontSize = 12.sp, color = TextSecondaryLight)
                Text(String.format("%.1f", averageMood), fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            }
            Spacer(Modifier.height(8.dp))
            // 简化的情绪分布柱状图：使用 Box 直接渲染替代 fl_chart
            if (moodDistribution.isNotEmpty()) {
                val max = moodDistribution.values.max().coerceAtLeast(1)
                moodDistribution.forEach { (label, count) ->
                    val ratio = if (max > 0) count.toFloat() / max else 0f
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 2.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(label, fontSize = 11.sp, modifier = Modifier.width(60.dp))
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .height(8.dp)
                                .clip(RoundedCornerShape(4.dp))
                                .background(StarNightBlue.copy(alpha = 0.15f)),
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth(ratio)
                                    .height(8.dp)
                                    .clip(RoundedCornerShape(4.dp))
                                    .background(StarNightBlue),
                            )
                        }
                        Text(" $count", fontSize = 11.sp, color = TextSecondaryLight)
                    }
                }
            }
            Spacer(Modifier.height(8.dp))
            Text(
                text = "高风险学生：$highRiskCount",
                fontSize = 12.sp,
                color = Color(0xFFEF5350),
            )
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

@Composable
private fun EmptyHint(text: String) {
    Text(
        text = text,
        fontSize = 13.sp,
        color = TextSecondaryLight,
        modifier = Modifier.padding(vertical = 12.dp),
    )
}

@Composable
private fun TextButton(text: String, onClick: () -> Unit) {
    Text(
        text = text,
        fontSize = 11.sp,
        color = StarNightBlue,
        modifier = Modifier.clickable { onClick() },
    )
}
