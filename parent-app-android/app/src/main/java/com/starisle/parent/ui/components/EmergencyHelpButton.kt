package com.starisle.parent.ui.components

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.starisle.parent.theme.AlertRed500
import com.starisle.parent.theme.AlertRed600

/**
 * 紧急求助悬浮按钮（对应 web-frontend EmergencyHelpButton.tsx）。
 *
 * 点击弹出心理危机援助热线列表，点击即拨号。
 */
@Composable
fun EmergencyHelpButton() {
    val context = LocalContext.current
    val open = remember { mutableStateOf(false) }

    val hotlines = remember {
        listOf(
            Triple("12355 青少年服务热线", "12355", "青少年心理咨询与危机干预"),
            Triple("希望24热线", "400-161-9995", "24小时心理危机干预热线"),
            Triple("北京心理危机干预中心", "010-82951332", "专业心理危机干预")
        )
    }

    Box(modifier = Modifier.fillMaxSize()) {
        // 浮动按钮（右下角）
        Surface(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(16.dp)
                .size(56.dp)
                .clip(CircleShape),
            color = AlertRed600,
            shadowElevation = 6.dp,
            onClick = { open.value = true }
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(Icons.Default.Warning, contentDescription = "紧急帮助", tint = Color.White)
            }
        }
    }

    if (open.value) {
        AlertDialog(
            onDismissRequest = { open.value = false },
            confirmButton = {
                TextButton(onClick = { open.value = false }) { Text("关闭") }
            },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Warning, contentDescription = null, tint = AlertRed500)
                    Spacer(Modifier.width(8.dp))
                    Text("紧急帮助", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                }
            },
            text = {
                Column {
                    Text("如果您或孩子正处于危机情况，请立即拨打以下热线获取专业支持：",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        fontSize = 13.sp)
                    Spacer(Modifier.height(12.dp))
                    hotlines.forEach { (name, number, desc) ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 6.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(AlertRed500.copy(alpha = 0.08f))
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Surface(
                                modifier = Modifier.size(32.dp).clip(CircleShape),
                                color = AlertRed500
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(Icons.Default.Phone, contentDescription = null, tint = Color.White)
                                }
                            }
                            Spacer(Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(name, fontWeight = FontWeight.Medium, fontSize = 14.sp)
                                Text(desc, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            TextButton(onClick = {
                                val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$number"))
                                context.startActivity(intent)
                            }) {
                                Text(number, color = AlertRed600, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            }
                        }
                    }
                    Spacer(Modifier.height(4.dp))
                    Text("如遇生命危险，请立即拨打 120 或 110",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.fillMaxWidth(),
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                }
            }
        )
    }
}
