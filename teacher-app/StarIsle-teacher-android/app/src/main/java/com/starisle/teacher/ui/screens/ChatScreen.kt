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
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
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
import com.starisle.teacher.data.models.AuthorizationRequest
import com.starisle.teacher.data.models.ChatMessage
import com.starisle.teacher.data.models.NotificationItem
import com.starisle.teacher.data.models.StudentChatSession
import com.starisle.teacher.data.models.TeacherRole
import com.starisle.teacher.data.repo.TeacherRepository
import com.starisle.teacher.theme.StarNightBlue
import com.starisle.teacher.theme.StarNightBlueLight
import com.starisle.teacher.theme.TextSecondaryLight
import com.starisle.teacher.ui.components.RiskLevelBadge
import com.starisle.teacher.ui.components.TextBadge
import com.starisle.teacher.ui.viewmodel.TeacherViewModel
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.UUID

/**
 * 对话页面。
 *
 * 对应 Dart 端 `screens/chat_screen.dart`：
 * - 心理老师 Tab：可观察对话 / 系统通知
 * - 普通教师 Tab：自我求助 / 系统通知
 * - CounselorChatListView：学生聊天会话卡片
 * - ChatObservationScreen：观察介入 + 笔记记录
 * - TeacherHelpChatView：发起自助请求
 * - SystemNotificationsView：系统通知列表
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(
    viewModel: TeacherViewModel = hiltViewModel(),
) {
    val state by viewModel.uiState.collectAsState()
    val role = state.currentTeacher.role
    var selectedTab by remember { mutableStateOf(0) }
    var selectedSession by remember { mutableStateOf<StudentChatSession?>(null) }
    var showSelfHelp by remember { mutableStateOf(false) }

    selectedSession?.let { session ->
        ChatObservationScreen(
            session = session,
            messages = state.chatSessions.firstOrNull { it.id == session.id }?.messages
                ?: session.messages,
            isIntervening = state.chatSessions.firstOrNull { it.id == session.id }?.isIntervening
                ?: session.isIntervening,
            onBack = { selectedSession = null },
            onSendMessage = { msg ->
                viewModel.addChatMessage(session.id, msg)
            },
            onToggleIntervention = { intervening ->
                viewModel.toggleIntervention(session.id, intervening)
            },
        )
        return
    }
    if (showSelfHelp) {
        SelfHelpRequestScreen(
            onSubmit = { request ->
                viewModel.addSelfHelpRequest(request)
                showSelfHelp = false
            },
            onBack = { showSelfHelp = false },
        )
        return
    }

    val tabs = if (role == TeacherRole.COUNSELOR) {
        listOf("可观察对话", "系统通知")
    } else {
        listOf("自我求助", "系统通知")
    }

    Scaffold(
        topBar = { TopAppBar(title = { Text("对话") }) },
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            TabRow(selectedTabIndex = selectedTab) {
                tabs.forEachIndexed { index, title ->
                    Tab(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        text = { Text(title) },
                    )
                }
            }
            when (selectedTab) {
                0 -> if (role == TeacherRole.COUNSELOR) {
                    CounselorChatListView(
                        sessions = state.chatSessions,
                        onSessionClick = { selectedSession = it },
                    )
                } else {
                    TeacherHelpChatView(
                        selfHelpRequests = state.selfHelpRequests,
                        onNewRequest = { showSelfHelp = true },
                    )
                }
                else -> SystemNotificationsView(notifications = state.notifications)
            }
        }
    }
}

@Composable
private fun CounselorChatListView(
    sessions: List<StudentChatSession>,
    onSessionClick: (StudentChatSession) -> Unit,
) {
    val timeFormatter = DateTimeFormatter.ofPattern("MM-dd HH:mm")
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        items(sessions) { session ->
            val lastMessage = session.messages.lastOrNull()
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onSessionClick(session) },
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
                            session.studentName.first().toString(),
                            color = StarNightBlue,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(session.studentName, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                            Spacer(Modifier.width(8.dp))
                            Text(session.className, fontSize = 12.sp, color = TextSecondaryLight)
                        }
                        Spacer(Modifier.height(4.dp))
                        Text(
                            lastMessage?.content ?: "暂无消息",
                            fontSize = 12.sp,
                            color = TextSecondaryLight,
                            maxLines = 1,
                        )
                        Text(
                            session.lastActive.format(timeFormatter),
                            fontSize = 10.sp,
                            color = TextSecondaryLight,
                        )
                    }
                    if (session.isIntervening) {
                        TextBadge(text = "介入中", color = StarNightBlue)
                    }
                    Spacer(Modifier.width(4.dp))
                    RiskLevelBadge(level = session.riskLevel)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ChatObservationScreen(
    session: StudentChatSession,
    messages: List<ChatMessage>,
    isIntervening: Boolean,
    onBack: () -> Unit,
    onSendMessage: (ChatMessage) -> Unit,
    onToggleIntervention: (Boolean) -> Unit,
) {
    var input by remember { mutableStateOf("") }
    val timeFormatter = DateTimeFormatter.ofPattern("HH:mm")

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("${session.studentName} 的对话") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = "返回")
                    }
                },
                actions = {
                    TextBadge(
                        text = if (isIntervening) "介入中" else "仅观察",
                        color = if (isIntervening) StarNightBlue else TextSecondaryLight,
                        modifier = Modifier
                            .clickable { onToggleIntervention(!isIntervening) }
                            .padding(8.dp),
                    )
                },
            )
        },
        bottomBar = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                OutlinedTextField(
                    value = input,
                    onValueChange = { input = it },
                    modifier = Modifier.weight(1f),
                    placeholder = { Text("输入观察笔记或介入消息") },
                    enabled = isIntervening,
                )
                Spacer(Modifier.width(8.dp))
                IconButton(
                    onClick = {
                        if (input.isNotBlank() && isIntervening) {
                            onSendMessage(
                                ChatMessage(
                                    id = UUID.randomUUID().toString(),
                                    senderId = "teacher",
                                    senderName = "教师",
                                    isTeacher = true,
                                    content = input,
                                    sentAt = LocalDateTime.now(),
                                ),
                            )
                            input = ""
                        }
                    },
                    enabled = isIntervening && input.isNotBlank(),
                ) {
                    Icon(Icons.Filled.Send, contentDescription = "发送")
                }
            }
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(messages) { msg ->
                MessageBubble(msg = msg, timeText = msg.sentAt.format(timeFormatter))
            }
        }
    }
}

@Composable
private fun MessageBubble(msg: ChatMessage, timeText: String) {
    val isTeacher = msg.isTeacher
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isTeacher) Arrangement.End else Arrangement.Start,
    ) {
        Column(
            modifier = Modifier
                .clip(
                    RoundedCornerShape(
                        topStart = 12.dp,
                        topEnd = 12.dp,
                        bottomEnd = if (isTeacher) 0.dp else 12.dp,
                        bottomStart = if (isTeacher) 12.dp else 0.dp,
                    ),
                )
                .background(if (isTeacher) StarNightBlue else StarNightBlueLight.copy(alpha = 0.1f))
                .padding(10.dp),
        ) {
            Text(
                text = msg.content,
                fontSize = 13.sp,
                color = if (isTeacher) Color.White else StarNightBlue,
            )
            Spacer(Modifier.height(2.dp))
            Text(
                text = "${msg.senderName} · $timeText",
                fontSize = 9.sp,
                color = if (isTeacher) Color.White.copy(alpha = 0.7f) else TextSecondaryLight,
            )
        }
    }
}

@Composable
private fun TeacherHelpChatView(
    selfHelpRequests: List<com.starisle.teacher.data.models.SelfHelpRequest>,
    onNewRequest: () -> Unit,
) {
    val timeFormatter = DateTimeFormatter.ofPattern("MM-dd HH:mm")
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onNewRequest() },
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("发起新的求助请求", fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                    Text("→", color = StarNightBlue)
                }
            }
        }
        items(selfHelpRequests) { req ->
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
                        "支持类型：${req.supportType} · 紧急程度：${req.urgency}",
                        fontSize = 12.sp,
                        color = TextSecondaryLight,
                    )
                    Text(
                        "提交时间：${req.submittedAt.format(timeFormatter)}",
                        fontSize = 11.sp,
                        color = TextSecondaryLight,
                    )
                }
            }
        }
    }
}

@Composable
private fun SystemNotificationsView(notifications: List<NotificationItem>) {
    val timeFormatter = DateTimeFormatter.ofPattern("MM-dd HH:mm")
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        items(notifications) { n ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = n.type.color.copy(alpha = 0.08f)),
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        TextBadge(text = n.type.label, color = n.type.color)
                        Text(n.time.format(timeFormatter), fontSize = 11.sp, color = TextSecondaryLight)
                    }
                    Spacer(Modifier.height(6.dp))
                    Text(n.title, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                    Spacer(Modifier.height(4.dp))
                    Text(n.description, fontSize = 12.sp, color = TextSecondaryLight)
                }
            }
        }
    }
}

/**
 * 自助求助请求表单。
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SelfHelpRequestScreen(
    onSubmit: (com.starisle.teacher.data.models.SelfHelpRequest) -> Unit,
    onBack: () -> Unit,
) {
    var description by remember { mutableStateOf("") }
    var supportType by remember { mutableStateOf("心理支持") }
    var urgency by remember { mutableStateOf("一般") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("发起求助") },
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
            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                label = { Text("描述你的困扰") },
                modifier = Modifier.fillMaxWidth(),
            )
            Text("支持类型：$supportType")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("心理支持", "情绪疏导", "工作压力", "其他").forEach { t ->
                    TextBadge(
                        text = t,
                        color = if (t == supportType) StarNightBlue else TextSecondaryLight,
                        modifier = Modifier
                            .clickable { supportType = t }
                            .padding(4.dp),
                    )
                }
            }
            Text("紧急程度：$urgency")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("一般", "较急", "紧急").forEach { u ->
                    TextBadge(
                        text = u,
                        color = if (u == urgency) StarNightBlue else TextSecondaryLight,
                        modifier = Modifier
                            .clickable { urgency = u }
                            .padding(4.dp),
                    )
                }
            }
            androidx.compose.material3.Button(
                onClick = {
                    if (description.isBlank()) return@Button
                    onSubmit(
                        com.starisle.teacher.data.models.SelfHelpRequest(
                            teacherId = "",
                            teacherName = "当前教师",
                            description = description,
                            supportType = supportType,
                            urgency = urgency,
                            submittedAt = LocalDateTime.now(),
                        ),
                    )
                },
                modifier = Modifier.fillMaxWidth(),
            ) { Text("提交求助") }
        }
    }
}
