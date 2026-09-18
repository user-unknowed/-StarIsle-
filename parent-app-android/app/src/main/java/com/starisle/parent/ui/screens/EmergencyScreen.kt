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
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.LocalHospital
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.starisle.parent.data.models.EmergencyAlert
import com.starisle.parent.data.models.EmergencyResource
import com.starisle.parent.theme.AlertRed500
import com.starisle.parent.theme.AlertRed600
import com.starisle.parent.theme.SafeGreen500
import com.starisle.parent.theme.Warm400
import com.starisle.parent.theme.Warm500
import com.starisle.parent.theme.Warm600
import com.starisle.parent.ui.viewmodel.ParentViewModel
import kotlinx.coroutines.delay
import java.util.Locale

/**
 * 应急中心（对应 ParentEmergency.tsx + EmergencyDetail.tsx）。
 *
 * - 红色告警全屏阻断 + 二次确认
 * - 应急流程引导
 * - 告警超时升级（2 小时未确认 → 追加超时提示）
 */
@Composable
fun EmergencyScreen(
    onBack: () -> Unit,
    viewModel: ParentViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        viewModel.fetchAlerts()
        viewModel.fetchResources()
    }

    val activeAlerts = state.emergencyAlerts.filter { !it.confirmed }
    val confirmedAlerts = state.emergencyAlerts.filter { it.confirmed }
    val hasUnconfirmedRed = activeAlerts.any { it.level == "red" }

    var redAlertDismissed by remember { mutableStateOf(false) }
    var confirmingAlertId by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(hasUnconfirmedRed) {
        if (!hasUnconfirmedRed) redAlertDismissed = false
    }

    Box(modifier = Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = androidx.compose.foundation.layout.PaddingValues(bottom = 24.dp)
        ) {
            // 顶部
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Brush.horizontalGradient(listOf(Warm600, Warm400)))
                        .padding(16.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            modifier = Modifier.size(40.dp).clip(RoundedCornerShape(12.dp)),
                            color = Color.White.copy(alpha = 0.2f)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(Icons.Default.Warning, contentDescription = null, tint = Color.White)
                            }
                        }
                        Spacer(Modifier.width(12.dp))
                        Column {
                            Text("应急中心", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                            Text("紧急告警处理 · 应急资源查询",
                                color = Color.White.copy(alpha = 0.9f), fontSize = 12.sp)
                        }
                    }
                    if (state.isUsingMockData) {
                        Text("(后端未连接，展示示例数据)",
                            color = Color.White.copy(alpha = 0.8f), fontSize = 11.sp,
                            modifier = Modifier.padding(top = 60.dp))
                    }
                }
            }

            // 紧急告警列表
            item {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Warning, contentDescription = null, tint = AlertRed500)
                    Spacer(Modifier.width(6.dp))
                    Text("紧急告警", fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                    if (activeAlerts.isNotEmpty()) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = AlertRed500.copy(alpha = 0.15f)
                        ) {
                            Text("${activeAlerts.size} 条待处理",
                                color = AlertRed500, fontSize = 11.sp,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                        }
                    }
                }
            }

            if (activeAlerts.isEmpty() && confirmedAlerts.isEmpty()) {
                item {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(Icons.Default.Check, contentDescription = null,
                            tint = SafeGreen500, modifier = Modifier.size(48.dp))
                        Spacer(Modifier.height(8.dp))
                        Text("暂无告警记录",
                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }

            items(activeAlerts) { alert ->
                AlertCard(
                    alert = alert,
                    confirming = confirmingAlertId == alert.alertId,
                    onConfirm = {
                        if (confirmingAlertId != alert.alertId) {
                            confirmingAlertId = alert.alertId
                        } else {
                            viewModel.confirmAlert(alert.alertId)
                            confirmingAlertId = null
                        }
                    }
                )
            }

            // 已确认告警
            items(confirmedAlerts) { alert ->
                Card(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Check, contentDescription = null, tint = SafeGreen500)
                        Spacer(Modifier.width(8.dp))
                        Text(alert.reason,
                            color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                    }
                }
            }

            // 应急资源
            item {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Phone, contentDescription = null, tint = Warm500)
                    Spacer(Modifier.width(6.dp))
                    Text("应急资源", fontWeight = FontWeight.Bold)
                }
            }
            // 筛选 chips
            item {
                val types = listOf("all" to "全部", "hotline" to "热线",
                    "hospital" to "医院", "community" to "社区", "teacher" to "老师")
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    types.forEach { (key, label) ->
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = Warm400.copy(alpha = 0.2f),
                            onClick = { viewModel.fetchResources(if (key == "all") null else key) }
                        ) {
                            Text(label, fontSize = 11.sp,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp))
                        }
                    }
                }
            }
            items(state.emergencyResources) { res ->
                ResourceCard(res, context)
            }
        }

        // 红色告警阻断弹窗
        if (hasUnconfirmedRed && !redAlertDismissed) {
            AlertDialog(
                onDismissRequest = { redAlertDismissed = true },
                confirmButton = {},
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Warning, contentDescription = null, tint = AlertRed600)
                        Spacer(Modifier.width(8.dp))
                        Text("紧急告警", color = AlertRed600, fontWeight = FontWeight.Bold)
                    }
                },
                text = {
                    Column {
                        Text("检测到高风险信号，请立即确认处理",
                            color = AlertRed600, fontSize = 12.sp)
                        Spacer(Modifier.height(8.dp))
                        activeAlerts.filter { it.level == "red" }.forEach { alert ->
                            Text(alert.reason, fontSize = 12.sp)
                        }
                        Spacer(Modifier.height(8.dp))
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = AlertRed500.copy(alpha = 0.1f)
                        ) {
                            Column(Modifier.padding(8.dp)) {
                                Text("建议行动：", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                Text("1. 确保孩子当前安全，不要离开孩子", fontSize = 11.sp)
                                Text("2. 拨打危机热线：12355 / 400-161-9995", fontSize = 11.sp)
                                Text("3. 前往最近医院急诊或心理卫生中心", fontSize = 11.sp)
                                Text("4. 联系学校心理老师或班主任", fontSize = 11.sp)
                            }
                        }
                        Spacer(Modifier.height(12.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            TextButton(onClick = { redAlertDismissed = true }) { Text("稍后处理") }
                            Button(onClick = {
                                val id = activeAlerts.firstOrNull { it.level == "red" }?.alertId
                                if (id != null) {
                                    if (confirmingAlertId != id) {
                                        confirmingAlertId = id
                                    } else {
                                        viewModel.confirmAlert(id)
                                        confirmingAlertId = null
                                        redAlertDismissed = true
                                    }
                                }
                            }) {
                                Text(if (confirmingAlertId != null &&
                                        confirmingAlertId == activeAlerts.firstOrNull { it.level == "red" }?.alertId)
                                    "再次点击确认告警"
                                else "确认已处理")
                            }
                        }
                    }
                }
            )
        }
    }
}

@Composable
private fun AlertCard(
    alert: EmergencyAlert,
    confirming: Boolean,
    onConfirm: () -> Unit
) {
    val color = when (alert.level) {
        "red" -> AlertRed500
        "orange" -> Warm500
        "yellow" -> Color(0xFFFBC02D)
        else -> SafeGreen500
    }
    val label = when (alert.level) {
        "red" -> "高风险"
        "orange" -> "中风险"
        "yellow" -> "低风险"
        else -> "正常"
    }
    Card(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = color
                ) {
                    Text(label, color = Color.White, fontSize = 10.sp,
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                }
                Spacer(Modifier.width(8.dp))
                Icon(Icons.Default.AccessTime, contentDescription = null,
                    modifier = Modifier.size(12.dp),
                    tint = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(alert.createdAt.take(16).replace("T", " "),
                    fontSize = 10.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Spacer(Modifier.height(4.dp))
            Text(alert.reason, fontSize = 12.sp)
            if (alert.level == "red" || alert.level == "orange") {
                Spacer(Modifier.height(8.dp))
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = color.copy(alpha = 0.05f)
                ) {
                    Column(Modifier.padding(8.dp)) {
                        Text("建议行动：", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        if (alert.level == "red") {
                            Text("• 确保孩子安全，拨打 12355 危机热线", fontSize = 10.sp)
                        }
                        Text("• 联系学校心理老师或班主任", fontSize = 10.sp)
                        Text("• 关注孩子情绪变化，72小时内跟进", fontSize = 10.sp)
                    }
                }
            }
            Spacer(Modifier.height(8.dp))
            Button(onClick = onConfirm) {
                Icon(Icons.Default.Check, contentDescription = null)
                Spacer(Modifier.width(4.dp))
                Text(if (confirming) "再次点击确认" else "确认告警")
            }
        }
    }
}

@Composable
private fun ResourceCard(res: EmergencyResource, context: android.content.Context) {
    val title = res.title ?: res.name ?: "未命名"
    val phone = res.phone
    val typeLabel = when (res.type) {
        "hotline" -> "心理热线"
        "hospital" -> "医疗机构"
        "community" -> "社区支持"
        "teacher" -> "学校联系人"
        else -> res.type
    }
    val icon = when (res.type) {
        "hotline" -> Icons.Default.Phone
        "hospital" -> Icons.Default.LocalHospital
        "teacher" -> Icons.Default.School
        else -> Icons.Default.Phone
    }
    Card(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
        shape = RoundedCornerShape(16.dp)
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    modifier = Modifier.size(40.dp).clip(RoundedCornerShape(10.dp)),
                    color = Warm400.copy(alpha = 0.15f)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(icon, contentDescription = null, tint = Warm500)
                    }
                }
                Spacer(Modifier.width(8.dp))
                Column {
                    Text(title, fontWeight = FontWeight.Bold)
                    Text(typeLabel, fontSize = 10.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            res.content?.let {
                Spacer(Modifier.height(4.dp))
                Text(it, fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurface)
            }
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                res.contact?.let {
                    Icon(Icons.Default.LocationOn, contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(12.dp))
                    Text(it, fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Spacer(Modifier.width(8.dp))
                if (phone != null) {
                    TextButton(onClick = {
                        val intent = android.content.Intent(
                            android.content.Intent.ACTION_DIAL,
                            android.net.Uri.parse("tel:$phone")
                        )
                        context.startActivity(intent)
                    }) {
                        Icon(Icons.Default.Phone, contentDescription = null,
                            tint = Warm600, modifier = Modifier.size(14.dp))
                        Text(phone, color = Warm600, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}
