package com.starisle.student.ui.screens

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
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import com.starisle.student.data.api.ChatUiMessage
import com.starisle.student.theme.StarNightBlue
import com.starisle.student.theme.WarmOrange
import com.starisle.student.ui.components.EmergencyHelpButton
import com.starisle.student.ui.viewmodel.AiViewModel
import java.util.UUID

// 危机关键词列表（前端检测，与 Dart chat_screen 风格一致）
private val crisisKeywords = listOf(
    "自杀", "想死", "活着没意思", "结束生命", "不想活了",
    "self-harm", "suicide", "kill myself",
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(
    navController: NavController? = null,
    viewModel: AiViewModel = hiltViewModel(),
) {
    val messages = remember { mutableStateListOf<ChatUiMessage>() }
    var input by remember { mutableStateOf("") }
    val listState = rememberLazyListState()
    val keyboard = LocalSoftwareKeyboardController.current

    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size - 1)
        }
    }

    val aiState by viewModel.state.collectAsStateWithLifecycle()

    // 自动回复占位：发送后 AI 简单 echo（接入真实 Chat 后端时替换为调用 AiRepository）
    fun sendMessage() {
        val text = input.trim()
        if (text.isEmpty()) return

        val userMessage = ChatUiMessage(
            id = UUID.randomUUID().toString(),
            senderId = "me",
            senderName = "我",
            content = text,
            sentAt = System.currentTimeMillis(),
            isUser = true,
        )
        messages.add(userMessage)
        input = ""
        keyboard?.hide()

        // 危机关键词检测：触发紧急帮助（此处仅占位提示）
        if (crisisKeywords.any { text.contains(it) }) {
            messages.add(
                ChatUiMessage(
                    id = UUID.randomUUID().toString(),
                    senderId = "xiaoxing",
                    senderName = "小星",
                    content = "我感受到了你的痛苦，你不是一个人。如果你需要立即帮助，请拨打心理援助热线 010-82951332。",
                    sentAt = System.currentTimeMillis(),
                    isUser = false,
                )
            )
            return
        }

        // 临时 echo 回复占位
        messages.add(
            ChatUiMessage(
                id = UUID.randomUUID().toString(),
                senderId = "xiaoxing",
                senderName = "小星",
                content = "我在这里陪你。你刚刚说：$text",
                sentAt = System.currentTimeMillis(),
                isUser = false,
            )
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("小星") },
                actions = {
                    IconButton(onClick = { /* TODO: 打开更多选项 */ }) {
                        Icon(Icons.Filled.MoreVert, contentDescription = "更多")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = StarNightBlue,
                    titleContentColor = Color.White,
                    actionIconContentColor = Color.White,
                ),
            )
        },
        bottomBar = {
            ChatInputBar(
                input = input,
                onInputChange = { input = it },
                onSend = { sendMessage() },
            )
        },
    ) { padding ->
        Box(modifier = Modifier
            .fillMaxSize()
            .padding(padding)) {
            if (messages.isEmpty()) {
                TopicCard()
            } else {
                LazyColumn(
                    state = listState,
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    items(messages) { msg ->
                        MessageBubble(message = msg)
                    }
                }
            }
        }
    }
}

@Composable
private fun ChatInputBar(
    input: String,
    onInputChange: (String) -> Unit,
    onSend: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.background)
            .padding(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        EmergencyHelpButton()
        Spacer(Modifier.padding(horizontal = 4.dp))
        OutlinedTextField(
            value = input,
            onValueChange = onInputChange,
            modifier = Modifier.weight(1f),
            placeholder = { Text("想跟小星说什么...") },
            shape = RoundedCornerShape(24.dp),
            maxLines = 5,
        )
        Spacer(Modifier.padding(horizontal = 4.dp))
        IconButton(
            onClick = onSend,
            colors = IconButtonDefaults.iconButtonColors(
                containerColor = StarNightBlue,
                contentColor = Color.White,
            ),
        ) {
            Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "发送")
        }
    }
}

@Composable
private fun TopicCard() {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        shape = RoundedCornerShape(16.dp),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("来聊聊吧", fontSize = 18.sp, fontWeight = FontWeight.W600)
            Spacer(Modifier.height(8.dp))
            Text(
                "你可以告诉我今天发生了什么，或者你此刻的感受。",
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
            )
        }
    }
}

@Composable
private fun MessageBubble(message: ChatUiMessage) {
    val isUser = message.isUser
    val alignment = if (isUser) Alignment.End else Alignment.Start
    val bubbleColor = if (isUser) StarNightBlue else WarmOrange.copy(alpha = 0.2f)
    val textColor = if (isUser) Color.White else MaterialTheme.colorScheme.onSurface

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start,
    ) {
        Box(
            modifier = Modifier
                .widthIn(max = 280.dp)
                .background(bubbleColor, shape = RoundedCornerShape(16.dp))
                .padding(horizontal = 14.dp, vertical = 10.dp),
        ) {
            Column {
                Text(
                    text = message.senderName,
                    fontSize = 12.sp,
                    color = textColor.copy(alpha = 0.7f),
                )
                Spacer(Modifier.height(2.dp))
                Text(text = message.content, color = textColor)
            }
        }
    }
}
