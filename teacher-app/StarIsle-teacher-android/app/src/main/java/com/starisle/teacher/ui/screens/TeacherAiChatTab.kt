package com.starisle.teacher.ui.screens

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
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Send
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.starisle.teacher.data.models.TeacherAiMessage
import com.starisle.teacher.ui.viewmodel.TeacherAiChatViewModel
import com.starisle.teacher.ui.viewmodel.TeacherAuthViewModel

/**
 * 教师端 AI 助手对话面板。
 *
 * 未登录时展示登录/注册表单；登录后经网关与本地模型对话。
 */
@Composable
fun TeacherAiChatTab(
    authViewModel: TeacherAuthViewModel = hiltViewModel(),
    chatViewModel: TeacherAiChatViewModel = hiltViewModel(),
) {
    val auth by authViewModel.state.collectAsState()

    if (auth.isLoading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }
    if (!auth.isLoggedIn) {
        TeacherLoginPanel(
            state = auth,
            onLogin = { username, password -> authViewModel.login(username, password) },
            onRegister = { username, password, nickname ->
                authViewModel.register(username, password, nickname)
            },
        )
        return
    }

    val state by chatViewModel.state.collectAsState()
    val listState = rememberLazyListState()

    // 新消息到达时滚动到底部
    LaunchedEffect(state.messages.size, state.isSending) {
        if (state.messages.isNotEmpty()) {
            listState.animateScrollToItem(state.messages.lastIndex)
        }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text("AI 助手", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Text(
                    text = "${auth.nickname} · 回复来自星屿本地模型",
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            TextButton(onClick = { authViewModel.logout() }) {
                Text("退出登录")
            }
        }

        if (state.riskLevel == "red" || state.riskLevel == "orange") {
            Surface(
                color = MaterialTheme.colorScheme.errorContainer,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                shape = RoundedCornerShape(8.dp),
            ) {
                Text(
                    text = "检测到较高风险内容，请及时联系学校心理老师或拨打心理援助热线。",
                    color = MaterialTheme.colorScheme.onErrorContainer,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(10.dp),
                )
            }
        }

        if (state.messages.isEmpty() && !state.isSending) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(24.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = "可以问我：怎么和压力大的学生沟通、如何识别情绪信号、班级心理活动怎么设计……",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 13.sp,
                )
            }
        } else {
            LazyColumn(
                state = listState,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                itemsIndexed(state.messages) { _, message ->
                    TeacherAiBubble(message)
                }
                if (state.isSending) {
                    item {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(14.dp),
                                strokeWidth = 2.dp,
                            )
                            Text(
                                "  助手正在思考…",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }
        }

        state.error?.let { message ->
            Text(
                text = message,
                color = MaterialTheme.colorScheme.error,
                fontSize = 12.sp,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
            )
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            OutlinedTextField(
                value = state.input,
                onValueChange = chatViewModel::onInputChange,
                modifier = Modifier.weight(1f),
                placeholder = { Text("和 AI 助手聊聊…") },
                maxLines = 4,
            )
            IconButton(
                onClick = chatViewModel::sendMessage,
                enabled = state.input.isNotBlank() && !state.isSending,
            ) {
                Icon(Icons.Filled.Send, contentDescription = "发送")
            }
        }
    }
}

/** 单条对话气泡。 */
@Composable
private fun TeacherAiBubble(message: TeacherAiMessage) {
    val isUser = message.role == "user"
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start,
    ) {
        Column(
            horizontalAlignment = if (isUser) Alignment.End else Alignment.Start,
            modifier = Modifier.widthIn(max = 300.dp),
        ) {
            Box(
                modifier = Modifier
                    .background(
                        color = if (isUser) {
                            MaterialTheme.colorScheme.primary
                        } else {
                            MaterialTheme.colorScheme.surfaceVariant
                        },
                        shape = RoundedCornerShape(12.dp),
                    )
                    .padding(horizontal = 12.dp, vertical = 8.dp),
            ) {
                Text(
                    text = message.content,
                    color = if (isUser) {
                        MaterialTheme.colorScheme.onPrimary
                    } else {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    },
                    fontSize = 14.sp,
                )
            }
            if (!isUser) {
                val meta = buildString {
                    message.model?.takeIf { it.isNotBlank() }?.let { append(it) }
                    message.responseTimeMs?.let {
                        if (isNotEmpty()) append(" · ")
                        append("${it / 1000.0}s")
                    }
                }
                if (meta.isNotEmpty()) {
                    Text(
                        text = meta,
                        fontSize = 10.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(top = 2.dp, start = 4.dp),
                    )
                }
            }
        }
    }
}
