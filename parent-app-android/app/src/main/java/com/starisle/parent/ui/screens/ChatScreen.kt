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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.starisle.parent.data.models.ChatMessage
import com.starisle.parent.theme.AlertRed500
import com.starisle.parent.theme.AlertYellow500
import com.starisle.parent.theme.Indigo500
import com.starisle.parent.theme.Purple600
import com.starisle.parent.theme.Warm400
import com.starisle.parent.theme.Warm500
import com.starisle.parent.theme.Warm600
import com.starisle.parent.ui.components.EmergencyHelpButton
import com.starisle.parent.ui.viewmodel.AiViewModel
import com.starisle.parent.ui.viewmodel.AuthViewModel

/**
 * 「大星」AI 对话页（对应 ParentChat.tsx 双源）。
 */
@Composable
fun ChatScreen(
    authViewModel: AuthViewModel = hiltViewModel(),
    viewModel: AiViewModel = hiltViewModel()
) {
    val auth by authViewModel.state.collectAsStateWithLifecycle()
    val state by viewModel.state.collectAsStateWithLifecycle()
    val listState = rememberLazyListState()

    val userId = auth.userId ?: "parent1"
    LaunchedEffect(userId) { viewModel.fetchHistory(userId) }
    LaunchedEffect(state.messages.size) {
        if (state.messages.isNotEmpty()) {
            listState.animateScrollToItem(state.messages.lastIndex)
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize()) {
            // 顶部
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Brush.horizontalGradient(listOf(Warm400, Warm600)))
                    .padding(16.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        modifier = Modifier.size(44.dp).clip(CircleShape),
                        color = Color.White.copy(alpha = 0.2f)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Text("大", color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                    Spacer(Modifier.width(12.dp))
                    Column {
                        Text("大星 · AI心理顾问", color = Color.White, fontWeight = FontWeight.Bold)
                        Text("大星在这里陪着你",
                            color = Color.White.copy(alpha = 0.9f), fontSize = 12.sp)
                    }
                }
            }

            if (state.isUsingMock) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(AlertYellow500.copy(alpha = 0.15f))
                        .padding(8.dp)
                ) {
                    Text("后端未连接，当前为示例回复",
                        color = Color(0xFF92400E), fontSize = 11.sp)
                }
            }

            // 消息区
            if (state.messages.isEmpty()) {
                EmptyConversation(
                    onTopic = { id, title -> viewModel.tapTopic(userId, id, title) }
                )
            } else {
                LazyColumn(
                    modifier = Modifier.weight(1f).fillMaxWidth().padding(horizontal = 12.dp),
                    state = listState,
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(vertical = 12.dp)
                ) {
                    items(state.messages) { msg ->
                        MessageBubble(msg, auth.user?.nickname ?: "家长")
                    }
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            Column(Modifier.padding(12.dp)) {
                                Text("更多话题：",
                                    color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                                Spacer(Modifier.height(8.dp))
                                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    viewModel.parentTopics.forEach { topic ->
                                        TopicChip(topic.title) {
                                            viewModel.tapTopic(userId, topic.id, topic.title)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 输入区
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surface)
                    .padding(12.dp),
                verticalAlignment = Alignment.Bottom
            ) {
                OutlinedTextField(
                    value = state.inputDraft,
                    onValueChange = { viewModel.updateInput(it) },
                    placeholder = { Text("和大星说说你的想法...") },
                    modifier = Modifier.weight(1f).heightIn(min = 56.dp, max = 120.dp),
                    shape = RoundedCornerShape(20.dp),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                    keyboardActions = KeyboardActions(
                        onSend = {
                            if (state.inputDraft.isNotBlank() && !state.isTyping) {
                                val text = state.inputDraft.trim()
                                viewModel.sendMessage(userId, text)
                                viewModel.clearInput()
                            }
                        }
                    ),
                    maxLines = 4
                )
                Spacer(Modifier.width(8.dp))
                IconButton(
                    onClick = {
                        if (state.inputDraft.isNotBlank() && !state.isTyping) {
                            val text = state.inputDraft.trim()
                            viewModel.sendMessage(userId, text)
                            viewModel.clearInput()
                        }
                    },
                    enabled = state.inputDraft.isNotBlank() && !state.isTyping,
                    modifier = Modifier.size(48.dp).clip(CircleShape)
                        .background(
                            if (state.inputDraft.isNotBlank() && !state.isTyping)
                                Brush.horizontalGradient(listOf(Indigo500, Purple600))
                            else Brush.horizontalGradient(listOf(Color.Gray, Color.Gray))
                        )
                ) {
                    Icon(Icons.Default.Send, contentDescription = "发送",
                        tint = Color.White)
                }
            }
        }
        EmergencyHelpButton()
    }

    if (state.error != null) {
        AlertDialog(
            onDismissRequest = {},
            confirmButton = { TextButton(onClick = { viewModel.clearInput() }) { Text("知道了") } },
            title = { Text("提示") },
            text = { Text(state.error ?: "") }
        )
    }
}

@Composable
private fun EmptyConversation(onTopic: (String, String) -> Unit) {
    Column(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(Modifier.height(48.dp))
        Surface(
            modifier = Modifier.size(80.dp).clip(CircleShape),
            color = Warm400
        ) {
            Box(contentAlignment = Alignment.Center) {
                Text("大", color = Color.White, fontSize = 32.sp, fontWeight = FontWeight.Bold)
            }
        }
        Spacer(Modifier.height(16.dp))
        Text("你好，我是大星", fontWeight = FontWeight.Bold, fontSize = 18.sp)
        Spacer(Modifier.height(4.dp))
        Text("慢慢来，一切都会好起来的。\n大星很愿意听听你的想法。",
            color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp,
            modifier = Modifier.fillMaxWidth(),
            textAlign = TextAlign.Center)
        Spacer(Modifier.height(24.dp))
        Text("你可以试试这些话题：",
            color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp,
            modifier = Modifier.fillMaxWidth())
        Spacer(Modifier.height(8.dp))
        val topics = listOf(
            "孩子不愿意跟我说话怎么办" to "t1",
            "怎么判断孩子是否需要专业帮助" to "t2",
            "青春期孩子情绪波动正常吗" to "t3",
            "发现孩子自伤怎么办" to "t4"
        )
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            topics.chunked(2).forEach { row ->
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    row.forEach { (title, id) ->
                        TopicChip(title, Modifier.weight(1f)) { onTopic(id, title) }
                    }
                }
            }
        }
    }
}

@Composable
private fun TopicChip(
    title: String,
    modifier: Modifier = Modifier,
    onClick: () -> Unit = {}
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
        onClick = onClick
    ) {
        Box(Modifier.padding(8.dp)) {
            Text(title, fontSize = 12.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
        }
    }
}

@Composable
private fun MessageBubble(message: ChatMessage, userNickname: String) {
    val isUser = message.role == "user"
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
    ) {
        if (!isUser) {
            Surface(
                modifier = Modifier.size(32.dp).clip(CircleShape),
                color = Warm400
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text("大", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
            Spacer(Modifier.width(6.dp))
        }
        Column(modifier = Modifier.widthIn(max = 280.dp)) {
            Text(if (isUser) userNickname else "大星",
                color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 10.sp)
            Spacer(Modifier.height(2.dp))
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = if (isUser) Indigo500 else MaterialTheme.colorScheme.surfaceVariant
            ) {
                Column(Modifier.padding(horizontal = 10.dp, vertical = 6.dp)) {
                    Text(message.content,
                        color = if (isUser) Color.White else MaterialTheme.colorScheme.onSurface,
                        fontSize = 13.sp)
                    if (!isUser && (message.riskLevel == "red" || message.riskLevel == "orange")) {
                        Spacer(Modifier.height(6.dp))
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(
                                    if (message.riskLevel == "red") AlertRed500.copy(alpha = 0.15f)
                                    else AlertYellow500.copy(alpha = 0.15f)
                                )
                                .padding(6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Warning, contentDescription = null,
                                tint = AlertRed500, modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("检测到风险信号，请点击右下角紧急帮助按钮获取支持",
                                fontSize = 10.sp, color = AlertRed500)
                        }
                    }
                }
            }
            Text(
                message.timestamp.take(16).replace("T", " "),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 10.sp,
                modifier = Modifier.padding(top = 2.dp, start = 4.dp)
            )
        }
        if (isUser) {
            Spacer(Modifier.width(6.dp))
            Surface(
                modifier = Modifier.size(32.dp).clip(CircleShape),
                color = Indigo500
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(userNickname.firstOrNull()?.toString() ?: "P",
                        color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
