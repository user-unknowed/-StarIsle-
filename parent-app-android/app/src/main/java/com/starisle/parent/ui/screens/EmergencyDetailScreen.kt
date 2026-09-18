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
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
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
import androidx.compose.runtime.mutableIntStateOf
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
import com.starisle.parent.data.models.EmergencyResource
import com.starisle.parent.theme.AlertRed500
import com.starisle.parent.theme.AlertRed600
import com.starisle.parent.theme.AlertYellow500
import com.starisle.parent.theme.Indigo500
import com.starisle.parent.theme.Purple500
import com.starisle.parent.theme.SafeGreen500
import com.starisle.parent.theme.Warm400
import com.starisle.parent.theme.Warm500
import com.starisle.parent.theme.Warm600
import com.starisle.parent.ui.viewmodel.ParentViewModel
import kotlinx.coroutines.delay
import java.util.Locale

/**
 * 红色预警详情页（对应 EmergencyDetail.tsx）。
 *
 * - 顶部红色预警卡片
 * - 4 步行动建议（按优先级排列）
 * - 「我已了解并开始行动」确认回执
 * - 心理援助热线 / 最近医院 / 学校联系人
 * - 72 小时跟进倒计时
 */
@Composable
fun EmergencyDetailScreen(
    alertId: String? = null,
    onBack: () -> Unit,
    viewModel: ParentViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current

    var isConfirmed by remember { mutableStateOf(false) }
    var countdown by remember { mutableIntStateOf(72 * 60 * 60) }

    LaunchedEffect(Unit) {
        viewModel.fetchResources()
        val alert = state.emergencyAlerts.firstOrNull { it.alertId == alertId }
        if (alert?.confirmed == true) isConfirmed = true
    }

    // 72 小时倒计时
    LaunchedEffect(Unit) {
        while (countdown > 0) {
            delay(1000)
            countdown = (countdown - 1).coerceAtLeast(0)
        }
    }

    val hotlines = state.emergencyResources.filter { it.type == "hotline" }
    val hospitals = state.emergencyResources.filter { it.type == "hospital" }
    val teachers = state.emergencyResources.filter { it.type == "teacher" }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(listOf(AlertRed500.copy(alpha = 0.08f), Warm400.copy(alpha = 0.12f)))),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(bottom = 32.dp)
    ) {
        // 顶部栏
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surface)
                    .padding(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "返回")
                }
                Column {
                    Text("预警详情", fontWeight = FontWeight.Bold)
                    Text("紧急情况，请立即关注",
                        color = AlertRed600, fontSize = 12.sp)
                }
            }
        }

        // 红色预警卡片
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(AlertRed600)
                    .padding(20.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        modifier = Modifier.size(48.dp).clip(RoundedCornerShape(12.dp)),
                        color = Color.White.copy(alpha = 0.2f)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.Warning, contentDescription = null,
                                tint = Color.White)
                        }
                    }
                    Spacer(Modifier.width(12.dp))
                    Column {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = Color.White.copy(alpha = 0.2f)
                        ) {
                            Text("红色预警", color = Color.White,
                                fontWeight = FontWeight.Bold, fontSize = 12.sp,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp))
                        }
                        Spacer(Modifier.height(4.dp))
                        Text("事态紧急，请立即关注",
                            color = Color.White.copy(alpha = 0.9f), fontSize = 12.sp)
                    }
                }
                Spacer(Modifier.height(12.dp))
                Text(
                    "大星检测到孩子目前的情绪状态比较紧急。孩子可能正在经历非常困难的时刻。请保持冷静，按照以下建议采取行动。",
                    color = Color.White.copy(alpha = 0.95f), fontSize = 13.sp
                )
            }
        }

        // 行动建议 / 已确认
        item {
            if (!isConfirmed) {
                ActionStepsCard(onConfirm = {
                    alertId?.let { viewModel.confirmAlert(it) }
                    isConfirmed = true
                })
            } else {
                ConfirmedCard()
            }
        }

        // 心理援助热线
        if (hotlines.isNotEmpty()) {
            item {
                ResourceSectionCard(
                    title = "心理援助热线",
                    iconTint = SafeGreen500,
                    resources = hotlines,
                    context = context
                )
            }
        }

        // 最近医院
        if (hospitals.isNotEmpty()) {
            item {
                ResourceSectionCard(
                    title = "最近医院",
                    iconTint = Indigo500,
                    resources = hospitals,
                    context = context,
                    showAddress = true
                )
            }
        }

        // 学校联系人
        if (teachers.isNotEmpty()) {
            item {
                ResourceSectionCard(
                    title = "学校联系人",
                    iconTint = Purple500,
                    resources = teachers,
                    context = context
                )
            }
        }

        // 72 小时跟进倒计时
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(Brush.horizontalGradient(listOf(Warm500, AlertRed500)))
                    .padding(20.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        modifier = Modifier.size(40.dp).clip(RoundedCornerShape(12.dp)),
                        color = Color.White.copy(alpha = 0.2f)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(Icons.Default.AccessTime, contentDescription = null,
                                tint = Color.White)
                        }
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text("预警跟进倒计时",
                            color = Color.White.copy(alpha = 0.9f), fontSize = 12.sp)
                        Text(formatCountdown(countdown),
                            color = Color.White, fontWeight = FontWeight.Bold, fontSize = 22.sp)
                    }
                }
                Spacer(Modifier.height(12.dp))
                Text(
                    "在接下来的72小时内，大星会持续关注孩子的状态。请保持手机畅通。",
                    color = Color.White.copy(alpha = 0.9f), fontSize = 12.sp
                )
            }
        }
    }
}

@Composable
private fun ActionStepsCard(onConfirm: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        shape = RoundedCornerShape(24.dp),
        colors = androidx.compose.material3.CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Column(Modifier.padding(20.dp)) {
            Text("行动建议", fontWeight = FontWeight.Bold, fontSize = 16.sp)
            Spacer(Modifier.height(12.dp))
            ActionStep(1, "立即与孩子建立安全连接",
                "先陪伴，不说教。告诉孩子\"无论发生什么，爸爸妈妈都在你身边\"。",
                AlertRed500, AlertRed500.copy(alpha = 0.08f))
            Spacer(Modifier.height(8.dp))
            ActionStep(2, "联系学校心理老师",
                "寻求专业心理老师的帮助和指导。",
                Warm500, Warm400.copy(alpha = 0.12f))
            Spacer(Modifier.height(8.dp))
            ActionStep(3, "拨打心理援助热线",
                "24小时专业心理援助，随时为您提供支持。",
                AlertYellow500, AlertYellow500.copy(alpha = 0.12f))
            Spacer(Modifier.height(8.dp))
            ActionStep(4, "前往最近医院急诊",
                "如情况严重，请立即前往医院寻求专业医疗帮助。",
                Indigo500, Indigo500.copy(alpha = 0.08f))
            Spacer(Modifier.height(16.dp))
            Button(
                onClick = onConfirm,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = AlertRed500),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.Check, contentDescription = null)
                Spacer(Modifier.width(6.dp))
                Text("我已了解并开始行动", fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun ActionStep(
    index: Int,
    title: String,
    desc: String,
    accentColor: Color,
    bgColor: Color
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(bgColor)
            .padding(16.dp)
    ) {
        Surface(
            modifier = Modifier.size(40.dp).clip(RoundedCornerShape(12.dp)),
            color = accentColor.copy(alpha = 0.15f)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Text("$index", color = accentColor, fontWeight = FontWeight.Bold)
            }
        }
        Spacer(Modifier.width(12.dp))
        Column {
            Text(title, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            Spacer(Modifier.height(4.dp))
            Text(desc, fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun ConfirmedCard() {
    Card(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        shape = RoundedCornerShape(24.dp),
        colors = androidx.compose.material3.CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Column(Modifier.padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    modifier = Modifier.size(48.dp).clip(RoundedCornerShape(12.dp)),
                    color = SafeGreen500.copy(alpha = 0.12f)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.Check, contentDescription = null,
                            tint = SafeGreen500)
                    }
                }
                Spacer(Modifier.width(12.dp))
                Column {
                    Text("已确认预警信息", fontWeight = FontWeight.Bold)
                    Text("教师端已收到您的确认回执",
                        color = SafeGreen500, fontSize = 12.sp)
                }
            }
            Spacer(Modifier.height(12.dp))
            Text(
                "感谢您的及时响应。请继续关注孩子的状态，如有需要，随时可以联系心理老师或拨打援助热线。",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun ResourceSectionCard(
    title: String,
    iconTint: Color,
    resources: List<EmergencyResource>,
    context: android.content.Context,
    showAddress: Boolean = false
) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        shape = RoundedCornerShape(24.dp),
        colors = androidx.compose.material3.CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        )
    ) {
        Column(Modifier.padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Phone, contentDescription = null, tint = iconTint)
                Spacer(Modifier.width(8.dp))
                Text(title, fontWeight = FontWeight.Bold, fontSize = 16.sp)
            }
            Spacer(Modifier.height(12.dp))
            resources.forEach { res ->
                ResourceRow(res, iconTint, context, showAddress)
                Spacer(Modifier.height(8.dp))
            }
        }
    }
}

@Composable
private fun ResourceRow(
    res: EmergencyResource,
    accentColor: Color,
    context: android.content.Context,
    showAddress: Boolean
) {
    val title = res.title ?: res.name ?: "未命名"
    val phone = res.phone
    val address = res.address ?: res.contact
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = accentColor.copy(alpha = 0.05f)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(title, fontWeight = FontWeight.Medium, fontSize = 13.sp)
                phone?.let {
                    Text(it, fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                if (showAddress && address != null) {
                    Text(address, fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            if (phone != null) {
                Surface(
                    modifier = Modifier.size(40.dp).clip(CircleShape),
                    color = accentColor,
                    onClick = {
                        val intent = android.content.Intent(
                            android.content.Intent.ACTION_DIAL,
                            android.net.Uri.parse("tel:$phone")
                        )
                        context.startActivity(intent)
                    }
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.Phone, contentDescription = "拨号",
                            tint = Color.White)
                    }
                }
            } else if (showAddress && address != null) {
                Surface(
                    modifier = Modifier.size(40.dp).clip(CircleShape),
                    color = accentColor,
                    onClick = {
                        val intent = android.content.Intent(
                            android.content.Intent.ACTION_VIEW,
                            android.net.Uri.parse("geo:0,0?q=${android.net.Uri.encode(address)}")
                        )
                        context.startActivity(intent)
                    }
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.LocationOn, contentDescription = "导航",
                            tint = Color.White)
                    }
                }
            }
        }
    }
}

private fun formatCountdown(seconds: Int): String {
    val hours = seconds / 3600
    val minutes = (seconds % 3600) / 60
    val secs = seconds % 60
    return String.format(Locale.getDefault(), "%02d:%02d:%02d", hours, minutes, secs)
}
