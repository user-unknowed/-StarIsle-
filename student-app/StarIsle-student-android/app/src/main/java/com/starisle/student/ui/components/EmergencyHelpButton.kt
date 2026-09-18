package com.starisle.student.ui.components

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.starisle.student.theme.PalePink
import com.starisle.student.theme.WarmOrange

/**
 * 紧急帮助按钮（对应 Dart widgets/emergency_help_widget.dart）。
 *
 * 点击后通过 ACTION_VIEW Intent 拨打心理援助热线（北京心理危机研究与干预中心热线）。
 * Dart 版用 url_launcher 实现同等行为。
 */
@Composable
fun EmergencyHelpButton(
    phoneNumber: String = "010-82951332",
) {
    val context = LocalContext.current
    IconButton(
        onClick = {
            val intent = Intent(Intent.ACTION_VIEW).apply {
                data = Uri.parse("tel:$phoneNumber")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            runCatching { context.startActivity(intent) }
        },
        modifier = Modifier.size(48.dp),
        colors = IconButtonDefaults.iconButtonColors(
            containerColor = WarmOrange,
            contentColor = PalePink,
        ),
    ) {
        Icon(Icons.Filled.Phone, contentDescription = "紧急帮助")
    }
}
