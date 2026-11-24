package com.starisle.parent.ui.components

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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.starisle.parent.theme.AlertRed500
import com.starisle.parent.theme.AlertOrange500
import com.starisle.parent.theme.AlertYellow500
import com.starisle.parent.theme.SafeGreen500

/**
 * 情绪趋势柱状图（对应 ParentHome.tsx 与 MoodDetail.tsx 的趋势条形图）。
 *
 * 直接用 Compose Canvas/Column 绘制，避免引入 MPAndroidChart。
 */
@Composable
fun MoodTrendChart(
    levels: List<Int>,
    dates: List<String>,
    modifier: Modifier = Modifier
) {
    if (levels.isEmpty()) {
        Box(modifier.fillMaxWidth().height(160.dp), contentAlignment = Alignment.Center) {
            Text("暂无心情记录", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        return
    }
    val maxV = (levels.max() ?: 5).coerceAtLeast(1)
    val minV = (levels.min() ?: 1).coerceAtLeast(1)
    val range = (maxV - minV).coerceAtLeast(1)

    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(160.dp),
        verticalAlignment = Alignment.Bottom,
        horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(4.dp)
    ) {
        levels.forEachIndexed { idx, level ->
            val ratio = ((level - minV).toFloat() / range.toFloat()) * 0.8f + 0.2f
            val color = when (level) {
                in 1..2 -> AlertRed500
                3 -> AlertYellow500
                4 -> Indigo400
                else -> SafeGreen500
            }
            Column(
                modifier = Modifier.weight(1f),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height((ratio * 120).dp)
                        .clip(RoundedCornerShape(topStart = 6.dp, topEnd = 6.dp))
                        .background(color)
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    text = dates.getOrNull(idx)?.substring(5) ?: "",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

private val Indigo400 = Color(0xFF5C6BC0)
