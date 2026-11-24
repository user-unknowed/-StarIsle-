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
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.HourglassEmpty
import androidx.compose.material.icons.filled.PersonRemove
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.starisle.parent.data.models.ChildBinding
import com.starisle.parent.theme.AlertRed500
import com.starisle.parent.theme.Warm400
import com.starisle.parent.theme.Warm600
import com.starisle.parent.ui.viewmodel.ParentViewModel

/**
 * 孩子绑定与授权管理页（对应 ParentChildren.tsx）。
 */
@Composable
fun ChildrenScreen(
    onBack: () -> Unit,
    viewModel: ParentViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) { viewModel.fetchChildren() }

    var showBindDialog by remember { mutableStateOf(false) }
    var bindStudentId by remember { mutableStateOf("") }
    var bindNickname by remember { mutableStateOf("") }
    var submitting by remember { mutableStateOf(false) }
    var confirmUnbind by remember { mutableStateOf<String?>(null) }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(bottom = 24.dp)
    ) {
        // 顶部
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Brush.horizontalGradient(listOf(Warm400, Warm600)))
                    .padding(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        modifier = Modifier.size(40.dp).clip(RoundedCornerShape(12.dp)),
                        color = Color.White.copy(alpha = 0.2f)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.Group, contentDescription = null, tint = Color.White)
                        }
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text("我的孩子", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        Text("管理已绑定的孩子与数据授权",
                            color = Color.White.copy(alpha = 0.9f), fontSize = 12.sp)
                    }
                    TextButton(onClick = { showBindDialog = true }) {
                        Icon(Icons.Default.Add, contentDescription = null, tint = Color.White)
                        Spacer(Modifier.width(4.dp))
                        Text("绑定孩子", color = Color.White)
                    }
                }
                if (state.isUsingMockData) {
                    Text("(后端未连接，展示示例数据)",
                        color = Color.White.copy(alpha = 0.8f), fontSize = 11.sp,
                        modifier = Modifier.padding(top = 80.dp))
                }
            }
        }

        if (state.children.isEmpty()) {
            item {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 48.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(Icons.Default.Group, contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(64.dp))
                    Spacer(Modifier.height(16.dp))
                    Text("还没有绑定孩子", fontWeight = FontWeight.Bold)
                    Text("绑定孩子后可查看其心情状态与告警信息",
                        color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                    Spacer(Modifier.height(12.dp))
                    Button(onClick = { showBindDialog = true }) {
                        Icon(Icons.Default.QrCodeScanner, contentDescription = null)
                        Spacer(Modifier.width(4.dp))
                        Text("立即绑定")
                    }
                }
            }
        } else {
            items(state.children) { child ->
                ChildCard(
                    child = child,
                    onAuthorize = { viewModel.authorizeChild(child.bindingId) },
                    onUnbind = { confirmUnbind = child.bindingId }
                )
            }
        }
    }

    // 绑定弹窗
    if (showBindDialog) {
        AlertDialog(
            onDismissRequest = { if (!submitting) showBindDialog = false },
            confirmButton = {
                Button(
                    onClick = {
                        if (bindStudentId.isBlank()) return@Button
                        submitting = true
                        viewModel.bindChild(
                            bindStudentId.trim(),
                            bindNickname.trim().ifEmpty { null },
                            bindType = "manual"
                        ) { _ ->
                            submitting = false
                            showBindDialog = false
                            bindStudentId = ""
                            bindNickname = ""
                        }
                    },
                    enabled = !submitting && bindStudentId.isNotBlank()
                ) { Text("确认绑定") }
            },
            dismissButton = {
                TextButton(onClick = { showBindDialog = false }) { Text("取消") }
            },
            title = { Text("绑定孩子") },
            text = {
                Column {
                    Text("请输入孩子的学生ID（可向孩子或老师索取），绑定后需完成授权才能查看数据。",
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value = bindStudentId,
                        onValueChange = { bindStudentId = it },
                        label = { Text("孩子学生ID") },
                        placeholder = { Text("例如 student1") },
                        singleLine = true
                    )
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value = bindNickname,
                        onValueChange = { bindNickname = it },
                        label = { Text("孩子昵称（可选）") },
                        placeholder = { Text("例如 小明同学") },
                        singleLine = true
                    )
                }
            }
        )
    }

    // 解绑确认弹窗
    confirmUnbind?.let { id ->
        AlertDialog(
            onDismissRequest = { confirmUnbind = null },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.unbindChild(id)
                        confirmUnbind = null
                    }
                ) { Text("确认解绑") }
            },
            dismissButton = {
                TextButton(onClick = { confirmUnbind = null }) { Text("取消") }
            },
            title = { Text("确认解除绑定") },
            text = { Text("解除绑定后将无法查看该孩子的状态与告警，确定继续吗？") }
        )
    }
}

@Composable
private fun ChildCard(
    child: ChildBinding,
    onAuthorize: () -> Unit,
    onUnbind: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    modifier = Modifier.size(48.dp).clip(CircleShape),
                    color = Warm400
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(child.studentNickname.firstOrNull()?.toString() ?: "?",
                            color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    }
                }
                Spacer(Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(child.studentNickname, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.width(6.dp))
                        if (child.authorized) {
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = Color(0xFF43A047).copy(alpha = 0.15f)
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(Icons.Default.VerifiedUser, contentDescription = null,
                                        tint = Color(0xFF2E7D32), modifier = Modifier.size(12.dp))
                                    Text("已授权", color = Color(0xFF2E7D32), fontSize = 10.sp)
                                }
                            }
                        } else {
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = Color(0xFFFBC02D).copy(alpha = 0.15f)
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(Icons.Default.HourglassEmpty, contentDescription = null,
                                        tint = Color(0xFFB45309), modifier = Modifier.size(12.dp))
                                    Text("待授权", color = Color(0xFFB45309), fontSize = 10.sp)
                                }
                            }
                        }
                    }
                    Text("孩子ID：${child.studentId}",
                        color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                    Text("绑定时间：${child.createdAt.take(10)}",
                        color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 10.sp)
                }
            }
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (!child.authorized) {
                    Button(onClick = onAuthorize) {
                        Icon(Icons.Default.VerifiedUser, contentDescription = null)
                        Spacer(Modifier.width(4.dp))
                        Text("授权访问")
                    }
                }
                OutlinedButton(onClick = onUnbind) {
                    Icon(Icons.Default.PersonRemove, contentDescription = null,
                        tint = AlertRed500)
                    Spacer(Modifier.width(4.dp))
                    Text("解除绑定", color = AlertRed500)
                }
            }
        }
    }
}
