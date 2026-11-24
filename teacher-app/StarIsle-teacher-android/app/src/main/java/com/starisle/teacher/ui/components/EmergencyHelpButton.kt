package com.starisle.teacher.ui.components

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.starisle.teacher.theme.RiskRed
import com.starisle.teacher.theme.StarNightBlue
import com.starisle.teacher.theme.WarmOrange

/**
 * 紧急求助按钮。
 *
 * 提供心理援助热线入口（12355 / 400-161-9995），点击通过隐式 Intent 拨打。
 * 对应 Dart 端 url_launcher 的"危机热线"行为。
 */
@Composable
fun EmergencyHelpButton(
    modifier: Modifier = Modifier,
    primaryHotline: String = "12355",
    secondaryHotline: String = "4001619995",
) {
    val context = LocalContext.current
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = RiskRed.copy(alpha = 0.1f)),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.Phone, contentDescription = "紧急求助", tint = RiskRed)
                Text(
                    text = "紧急求助热线",
                    color = RiskRed,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(start = 8.dp),
                )
            }
            Text(
                text = "如果学生出现自伤倾向或紧急危机，请立即拨打专业热线。",
                fontSize = 12.sp,
                color = Color(0xFF666666),
                modifier = Modifier.padding(top = 8.dp, bottom = 12.dp),
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Button(
                    onClick = { dial(context, primaryHotline) },
                    colors = ButtonDefaults.buttonColors(containerColor = RiskRed),
                    modifier = Modifier.weight(1f),
                ) {
                    Text("心理援助 12355")
                }
                OutlinedButton(
                    onClick = { dial(context, secondaryHotline) },
                    modifier = Modifier.weight(1f),
                ) {
                    Text("希望24热线")
                }
            }
        }
    }
}

/** 触发隐式拨号 Intent（需 android.permission.CALL_PHONE 才能直接拨号，否则跳到拨号界面）。 */
private fun dial(context: android.content.Context, phone: String) {
    val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(intent)
}
