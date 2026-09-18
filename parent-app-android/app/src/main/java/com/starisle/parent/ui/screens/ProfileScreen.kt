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
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.BrokenImage
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.starisle.parent.theme.AlertRed500
import com.starisle.parent.theme.Indigo500
import com.starisle.parent.theme.Indigo600
import com.starisle.parent.theme.Purple500
import com.starisle.parent.theme.SafeGreen500
import com.starisle.parent.theme.Warm400
import com.starisle.parent.theme.Warm500
import com.starisle.parent.theme.Warm600
import com.starisle.parent.ui.viewmodel.AuthViewModel
import com.starisle.parent.ui.viewmodel.ParentViewModel
import java.time.LocalDate
import java.time.format.DateTimeFormatter

/**
 * 家长「我的」页面（对应 ParentProfile.tsx 双源）。
 *
 * 含：资料编辑、孩子绑定管理、知识库、通知设置、隐私、深色模式开关、登出。
 */
@Composable
fun ProfileScreen(
    onLogout: () -> Unit,
    onNavigateChildren: () -> Unit = {},
    authViewModel: AuthViewModel = hiltViewModel(),
    viewModel: ParentViewModel = hiltViewModel()
) {
    val auth by authViewModel.state.collectAsStateWithLifecycle()
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.fetchChildren()
        viewModel.fetchKnowledgeArticles()
        viewModel.fetchNotificationSettings()
    }

    var isEditing by remember { mutableStateOf(false) }
    var editNickname by remember { mutableStateOf(auth?.user?.nickname ?: "家长") }
    var selectedArticleId by remember { mutableStateOf<String?>(null) }
    var isDarkMode by remember { mutableStateOf(false) }

    val displayName = state.parentProfile?.nickname ?: auth.user?.nickname ?: "家长"
    val phone = state.parentProfile?.phone ?: auth.user?.phone ?: "未绑定"
    val childCount = state.children.size
    val pendingAlerts = state.emergencyAlerts.count { !it.confirmed }
    val followDays = state.parentProfile?.createdAt?.let {
        runCatching {
            val created = java.time.OffsetDateTime.parse(it).toEpochSecond() * 1000
            val now = System.currentTimeMillis()
            ((now - created) / (24 * 3600 * 1000L)).coerceAtLeast(1).toInt()
        }.getOrNull()
    } ?: "--"

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            // 个人信息卡片
            Card(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Color.Transparent)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            Brush.horizontalGradient(listOf(Warm400, Warm600))
                        )
                        .padding(20.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            modifier = Modifier.size(64.dp).clip(CircleShape),
                            color = Color.White.copy(alpha = 0.2f)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(displayName.firstOrNull()?.toString() ?: "P",
                                    color = Color.White, fontSize = 28.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                        Spacer(Modifier.width(16.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            if (isEditing) {
                                androidx.compose.material3.OutlinedTextField(
                                    value = editNickname,
                                    onValueChange = { editNickname = it },
                                    label = { Text("昵称") },
                                    singleLine = true
                                )
                            } else {
                                Text(displayName, color = Color.White,
                                    fontSize = 22.sp, fontWeight = FontWeight.Bold)
                                Text(phone, color = Color.White.copy(alpha = 0.85f), fontSize = 13.sp)
                            }
                        }
                        IconButton(onClick = {
                            if (isEditing) {
                                authViewModel.updateProfile(editNickname, null)
                                isEditing = false
                            } else {
                                editNickname = displayName
                                isEditing = true
                            }
                        }) {
                            Icon(if (isEditing) Icons.Default.Edit else Icons.Default.Edit,
                                contentDescription = if (isEditing) "保存" else "编辑",
                                tint = Color.White)
                        }
                    }
                    if (state.isUsingMockData) {
                        Text("(后端未连接，展示示例数据)",
                            color = Color.White.copy(alpha = 0.8f),
                            fontSize = 11.sp,
                            modifier = Modifier.padding(top = 80.dp))
                    }
                }
            }
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                StatCard("$childCount", "绑定孩子", Modifier.weight(1f))
                StatCard("$pendingAlerts", "待处理告警", Modifier.weight(1f))
                StatCard("$followDays", "关注天数", Modifier.weight(1f))
            }
        }

        // 我的孩子
        item {
            SectionCard(title = "我的孩子", action = "绑定新孩子", onAction = onNavigateChildren) {
                if (state.children.isEmpty()) {
                    EmptyChild(onNavigateChildren)
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        state.children.forEach { child ->
                            ChildRow(child)
                        }
                    }
                }
            }
        }

        // 知识库
        item {
            SectionCard(title = "知识库", icon = Icons.Default.Book, action = "查看全部") {
                state.knowledgeArticles.forEach { article ->
                    ArticleRow(article) { selectedArticleId = article.id }
                }
            }
        }

        // 通知设置
        item {
            SectionCard(title = "通知设置", icon = Icons.Default.Notifications) {
                NotificationRow("情绪异常提醒", "当孩子情绪出现异常时提醒",
                    state.notificationSettings.moodAlert) {
                    viewModel.updateNotificationSettings(state.notificationSettings.copy(moodAlert = it))
                }
                NotificationRow("打卡提醒",
                    "孩子未打卡超过${state.notificationSettings.checkinThreshold}天时提醒",
                    state.notificationSettings.checkinReminder) {
                    viewModel.updateNotificationSettings(state.notificationSettings.copy(checkinReminder = it))
                }
                NotificationRow("知识库更新通知", "当有新的知识文章时通知",
                    state.notificationSettings.knowledgeUpdate) {
                    viewModel.updateNotificationSettings(state.notificationSettings.copy(knowledgeUpdate = it))
                }
                NotificationRow("应急预案通知", "安全保护，强制开启",
                    state.notificationSettings.emergencyAlert,
                    enabled = false) { }
            }
        }

        // 隐私与安全
        item {
            SectionCard(title = "隐私与安全", icon = Icons.Default.Shield) {
                PrivacyRow(Icons.Default.Shield, "数据收集清单", SafeGreen500)
                PrivacyRow(Icons.Default.Edit, "数据导出", Indigo500)
                PrivacyRow(Icons.Default.Person, "数据访问记录", Purple500)
                PrivacyRow(Icons.Default.Warning, "账号注销", AlertRed500, tint = AlertRed500)
            }
        }

        // 深色模式与关于
        item {
            SectionCard(title = "其它设置") {
                Row(modifier = Modifier.fillMaxWidth().padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically) {
                    Text(if (isDarkMode) "深色模式" else "浅色模式", modifier = Modifier.weight(1f))
                    Switch(checked = isDarkMode, onCheckedChange = { isDarkMode = it })
                }
                Row(modifier = Modifier.fillMaxWidth().padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Settings, contentDescription = null)
                    Spacer(Modifier.width(8.dp))
                    Text("关于星屿", modifier = Modifier.weight(1f))
                    Icon(Icons.Default.ChevronRight, contentDescription = null)
                }
            }
        }

        // 退出登录
        item {
            OutlinedButton(
                onClick = { authViewModel.logout(); onLogout() },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp)
            ) {
                Text("退出登录", color = AlertRed500, fontWeight = FontWeight.Bold)
            }
        }
    }

    // 文章详情弹窗
    selectedArticleId?.let { id ->
        state.knowledgeArticles.firstOrNull { it.id == id }?.let { article ->
            AlertDialog(
                onDismissRequest = { selectedArticleId = null },
                confirmButton = {
                    Button(onClick = { selectedArticleId = null }) { Text("关闭") }
                },
                title = { Text(article.title, fontWeight = FontWeight.Bold) },
                text = {
                    Column {
                        Text(article.category, color = Warm600, fontSize = 12.sp)
                        Spacer(Modifier.height(8.dp))
                        Text("${article.readTime}分钟阅读",
                            color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                        Spacer(Modifier.height(12.dp))
                        Text(article.content, fontSize = 14.sp)
                    }
                }
            )
        }
    }
}

@Composable
private fun StatCard(value: String, label: String, modifier: Modifier = Modifier) {
    Card(modifier = modifier, shape = RoundedCornerShape(16.dp)) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(value, fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Warm500)
            Text(label, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun SectionCard(
    title: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector? = null,
    action: String? = null,
    onAction: () -> Unit = {},
    content: @Composable () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        shape = RoundedCornerShape(24.dp)
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (icon != null) {
                    Icon(icon, contentDescription = null, tint = Warm500)
                    Spacer(Modifier.width(8.dp))
                }
                Text(title, fontWeight = FontWeight.Bold, fontSize = 16.sp, modifier = Modifier.weight(1f))
                if (action != null) {
                    TextButton(onClick = onAction) {
                        Text(action, color = Warm600, fontSize = 13.sp)
                        Icon(Icons.Default.ChevronRight, contentDescription = null, tint = Warm600)
                    }
                }
            }
            Spacer(Modifier.height(12.dp))
            content()
        }
    }
}

@Composable
private fun EmptyChild(onBind: () -> Unit) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(Icons.Default.Person, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(48.dp))
        Spacer(Modifier.height(8.dp))
        Text("还没有绑定孩子", color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(8.dp))
        Button(onClick = onBind) {
            Icon(Icons.Default.QrCodeScanner, contentDescription = null)
            Spacer(Modifier.width(4.dp))
            Text("扫码绑定")
        }
    }
}

@Composable
private fun ChildRow(child: com.starisle.parent.data.models.ChildBinding) {
    val riskColor = when (child.riskLevel) {
        "red" -> AlertRed500
        "orange" -> Warm500
        "yellow" -> Color(0xFFFBC02D)
        else -> SafeGreen500
    }
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Surface(
            modifier = Modifier.size(40.dp).clip(CircleShape),
            color = Indigo500
        ) {
            Box(contentAlignment = Alignment.Center) {
                Text(child.studentNickname.firstOrNull()?.toString() ?: "?",
                    color = Color.White, fontWeight = FontWeight.Bold)
            }
        }
        Spacer(Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(child.studentNickname, fontWeight = FontWeight.Medium)
                Spacer(Modifier.width(6.dp))
                Box(
                    modifier = Modifier.size(8.dp).clip(CircleShape).background(riskColor)
                )
            }
            Text("${if (child.authorized) "已授权" else "未授权"} · 绑定于 ${child.createdAt.take(10)}",
                fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        TextButton(onClick = { /* 解绑流程 */ }) {
            Text("解除绑定", color = AlertRed500)
        }
    }
}

@Composable
private fun ArticleRow(
    article: com.starisle.parent.data.models.KnowledgeArticle,
    onClick: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f))
            .padding(12.dp)
    ) {
        Row {
            Text(article.category, color = Warm600, fontSize = 11.sp,
                modifier = Modifier.background(Warm400.copy(alpha = 0.2f)).padding(horizontal = 6.dp, vertical = 2.dp))
            Spacer(Modifier.width(8.dp))
            Text("${article.readTime}分钟阅读", fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Spacer(Modifier.height(4.dp))
        Text(article.title, fontWeight = FontWeight.Medium)
        Spacer(Modifier.height(2.dp))
        Text(article.summary, fontSize = 12.sp, maxLines = 2, overflow = TextOverflow.Ellipsis,
            color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun NotificationRow(
    title: String, desc: String, checked: Boolean,
    enabled: Boolean = true,
    onChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(title, fontWeight = FontWeight.Medium)
            Text(desc, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Switch(checked = checked, onCheckedChange = onChange, enabled = enabled)
    }
}

@Composable
private fun PrivacyRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    color: Color,
    tint: Color? = null
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Surface(
            modifier = Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)),
            color = color.copy(alpha = 0.15f)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(icon, contentDescription = null, tint = color)
            }
        }
        Spacer(Modifier.width(12.dp))
        Text(label, modifier = Modifier.weight(1f), color = tint ?: MaterialTheme.colorScheme.onSurface)
        Icon(Icons.Default.ChevronRight, contentDescription = null)
    }
}
