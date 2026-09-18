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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.starisle.teacher.data.models.RiskLevel
import com.starisle.teacher.data.models.SymptomReport
import com.starisle.teacher.data.models.SymptomType
import com.starisle.teacher.data.models.Student
import com.starisle.teacher.theme.StarNightBlue
import com.starisle.teacher.theme.StarNightBlueLight
import com.starisle.teacher.theme.TextSecondaryLight
import com.starisle.teacher.ui.components.RiskLevelBadge
import com.starisle.teacher.ui.components.TextBadge
import com.starisle.teacher.ui.viewmodel.TeacherViewModel
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

/**
 * 学生页面。
 *
 * 对应 Dart 端 `screens/students_screen.dart`：
 * - Tab：学生列表 / 上报记录
 * - 学生卡片（含风险等级 + 状态摘要 + 上次更新时间）
 * - 报告列表
 * - 学生详情页（StudentDetailScreen）：基本信息 + 风险趋势 + 报告历史
 * - 上报页面（SymptomReportScreen）：症状类型/情绪/持续时长/严重程度/描述
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StudentsScreen(
    viewModel: TeacherViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    var selectedTab by remember { mutableStateOf(0) }
    var selectedStudent by remember { mutableStateOf<Student?>(null) }
    var showReportScreen by remember { mutableStateOf(false) }

    if (showReportScreen) {
        SymptomReportScreen(
            students = state.students,
            onSubmit = { report ->
                viewModel.addReport(report)
                showReportScreen = false
            },
            onBack = { showReportScreen = false },
        )
        return
    }
    selectedStudent?.let { student ->
        StudentDetailScreen(
            student = student,
            reports = state.reports.filter { it.studentId == student.id },
            onBack = { selectedStudent = null },
        )
        return
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text("学生") }) },
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            TabRow(selectedTabIndex = selectedTab) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    text = { Text("学生列表") },
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    text = { Text("上报记录") },
                )
            }
            when (selectedTab) {
                0 -> StudentList(
                    students = state.students,
                    onStudentClick = { selectedStudent = it },
                    onAddReport = { showReportScreen = true },
                )
                else -> ReportList(
                    reports = state.reports,
                    onStatusChange = { id, status ->
                        viewModel.updateReportStatus(id, status)
                    },
                )
            }
        }
    }
}

@Composable
private fun StudentList(
    students: List<Student>,
    onStudentClick: (Student) -> Unit,
    onAddReport: () -> Unit,
) {
    val timeFormatter = DateTimeFormatter.ofPattern("MM-dd HH:mm")
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("共 ${students.size} 名学生", fontSize = 13.sp, color = TextSecondaryLight)
                IconButton(onClick = onAddReport) {
                    Icon(Icons.Filled.Notifications, contentDescription = "新增上报")
                }
            }
        }
        items(students) { student ->
            StudentCard(
                student = student,
                onClick = { onStudentClick(student) },
                timeText = student.lastStatusUpdate.format(timeFormatter),
            )
        }
    }
}

@Composable
private fun StudentCard(student: Student, onClick: () -> Unit, timeText: String) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(StarNightBlue.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    student.name.first().toString(),
                    color = StarNightBlue,
                    fontWeight = FontWeight.SemiBold,
                )
            }
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(student.name, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                    Spacer(Modifier.width(8.dp))
                    Text(student.className, fontSize = 12.sp, color = TextSecondaryLight)
                }
                Spacer(Modifier.height(4.dp))
                Text(student.statusSummary, fontSize = 12.sp, color = TextSecondaryLight)
                Text("上次更新：$timeText", fontSize = 10.sp, color = TextSecondaryLight)
            }
            RiskLevelBadge(level = student.riskLevel)
        }
    }
}

@Composable
private fun ReportList(
    reports: List<SymptomReport>,
    onStatusChange: (String, com.starisle.teacher.data.models.ReportStatus) -> Unit,
) {
    val timeFormatter = DateTimeFormatter.ofPattern("MM-dd HH:mm")
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        items(reports) { report ->
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            "${report.studentName} · ${report.className}",
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                        )
                        RiskLevelBadge(level = report.riskLevel)
                    }
                    Spacer(Modifier.height(6.dp))
                    Text(
                        "症状：${report.symptoms.joinToString("、") { it.label }}",
                        fontSize = 12.sp,
                    )
                    Text(
                        "情绪：${report.emotions.joinToString("、") { it.label }}",
                        fontSize = 12.sp,
                    )
                    Text(
                        "持续：${report.duration.label}",
                        fontSize = 12.sp,
                        color = TextSecondaryLight,
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(report.description, fontSize = 12.sp, color = TextSecondaryLight)
                    Spacer(Modifier.height(6.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            "提交人：${report.reporterName} · ${report.submittedAt.format(timeFormatter)}",
                            fontSize = 11.sp,
                            color = TextSecondaryLight,
                        )
                        TextBadge(
                            text = report.status.label,
                            color = report.status.color,
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun StudentDetailScreen(
    student: Student,
    reports: List<SymptomReport>,
    onBack: () -> Unit,
) {
    val timeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(student.name) },
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
                .padding(16.dp),
        ) {
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(student.name, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.width(8.dp))
                        Text(student.className, fontSize = 13.sp, color = TextSecondaryLight)
                        Spacer(Modifier.weight(1f))
                        RiskLevelBadge(level = student.riskLevel)
                    }
                    Spacer(Modifier.height(8.dp))
                    Text("年级：${student.grade}", fontSize = 12.sp, color = TextSecondaryLight)
                    Text(
                        "上次更新：${student.lastStatusUpdate.format(timeFormatter)}",
                        fontSize = 12.sp,
                        color = TextSecondaryLight,
                    )
                    Spacer(Modifier.height(8.dp))
                    Text("状态摘要", fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    Text(student.statusSummary, fontSize = 13.sp)
                }
            }
            Spacer(Modifier.height(16.dp))
            Text("历史报告", fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(8.dp))
            if (reports.isEmpty()) {
                Text("暂无报告", fontSize = 13.sp, color = TextSecondaryLight)
            } else {
                reports.forEach { report ->
                    Card(modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp)) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(
                                report.submittedAt.format(timeFormatter),
                                fontSize = 11.sp,
                                color = TextSecondaryLight,
                            )
                            Spacer(Modifier.height(4.dp))
                            Text(
                                "症状：${report.symptoms.joinToString("、") { it.label }}",
                                fontSize = 12.sp,
                            )
                            Text(report.description, fontSize = 12.sp)
                        }
                    }
                }
            }
        }
    }
}

/**
 * 上报页面：表单输入并提交一条症状报告。
 *
 * 简化实现：使用一系列选择项 + 多行文本输入。
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SymptomReportScreen(
    students: List<Student>,
    onSubmit: (SymptomReport) -> Unit,
    onBack: () -> Unit,
) {
    var selectedStudent by remember { mutableStateOf(students.firstOrNull()) }
    var symptoms by remember { mutableStateOf(setOf<SymptomType>()) }
    var duration by remember { mutableStateOf(com.starisle.teacher.data.models.DurationType.LESS_THAN_1_WEEK) }
    var severity by remember { mutableStateOf(com.starisle.teacher.data.models.SeverityLevel.NEED_ATTENTION) }
    var description by remember { mutableStateOf("") }
    var hasCommunicated by remember { mutableStateOf(false) }
    var hasContactedParent by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("新增症状报告") },
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
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text("选择学生", fontWeight = FontWeight.SemiBold)
            students.forEach { student ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { selectedStudent = student }
                        .padding(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    androidx.compose.material3.RadioButton(
                        selected = selectedStudent?.id == student.id,
                        onClick = { selectedStudent = student },
                    )
                    Text("${student.name} · ${student.className}")
                }
            }

            Text("症状类型（多选）", fontWeight = FontWeight.SemiBold)
            SymptomType.entries.forEach { type ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable {
                            symptoms = if (type in symptoms) symptoms - type else symptoms + type
                        }
                        .padding(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    androidx.compose.material3.Checkbox(
                        checked = type in symptoms,
                        onCheckedChange = {
                            symptoms = if (it) symptoms + type else symptoms - type
                        },
                    )
                    Text(type.label)
                }
            }

            Text("持续时长", fontWeight = FontWeight.SemiBold)
            com.starisle.teacher.data.models.DurationType.entries.forEach { d ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { duration = d }
                        .padding(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    androidx.compose.material3.RadioButton(
                        selected = duration == d,
                        onClick = { duration = d },
                    )
                    Text(d.label)
                }
            }

            Text("严重程度", fontWeight = FontWeight.SemiBold)
            com.starisle.teacher.data.models.SeverityLevel.entries.forEach { s ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { severity = s }
                        .padding(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    androidx.compose.material3.RadioButton(
                        selected = severity == s,
                        onClick = { severity = s },
                    )
                    Text(s.label)
                }
            }

            androidx.compose.material3.OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                label = { Text("详细描述") },
                modifier = Modifier.fillMaxWidth(),
            )

            Row(verticalAlignment = Alignment.CenterVertically) {
                androidx.compose.material3.Checkbox(
                    checked = hasCommunicated,
                    onCheckedChange = { hasCommunicated = it },
                )
                Text("已与学生沟通")
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                androidx.compose.material3.Checkbox(
                    checked = hasContactedParent,
                    onCheckedChange = { hasContactedParent = it },
                )
                Text("已联系家长")
            }

            androidx.compose.material3.Button(
                onClick = {
                    val s = selectedStudent ?: return@Button
                    onSubmit(
                        SymptomReport(
                            studentId = s.id,
                            studentName = s.name,
                            className = s.className,
                            reporterId = "",
                            reporterName = "当前教师",
                            symptoms = symptoms.toList(),
                            emotions = emptyList(),
                            duration = duration,
                            severity = severity,
                            description = description,
                            hasCommunicated = hasCommunicated,
                            hasContactedParent = hasContactedParent,
                            submittedAt = LocalDateTime.now(),
                            status = com.starisle.teacher.data.models.ReportStatus.SUBMITTED,
                        ),
                    )
                },
                modifier = Modifier.fillMaxWidth(),
            ) { Text("提交报告") }
        }
    }
}
