package com.starisle.teacher.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.starisle.teacher.data.models.RiskLevel

/**
 * 风险等级徽标。
 *
 * 复刻 Dart 端 `riskLevel.label` + 风险等级色 + 圆角背景的胶囊样式。
 *
 * @param level 风险等级。
 * @param modifier 外部布局修饰符。
 * @param alpha 背景透明度（默认 0.15，与 Dart 端 withOpacity(0.15) 一致）。
 */
@Composable
fun RiskLevelBadge(
    level: RiskLevel,
    modifier: Modifier = Modifier,
    alpha: Float = 0.15f,
) {
    val bg = level.color.copy(alpha = alpha)
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(4.dp))
            .background(bg)
            .padding(horizontal = 6.dp, vertical = 2.dp),
    ) {
        Text(
            text = level.label,
            color = level.color,
            fontSize = 10.sp,
            fontWeight = FontWeight.Medium,
        )
    }
}

/**
 * 通用文本徽标（用于报告状态、介入中等场景）。
 */
@Composable
fun TextBadge(
    text: String,
    color: Color,
    modifier: Modifier = Modifier,
    alpha: Float = 0.15f,
) {
    val bg = color.copy(alpha = alpha)
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(4.dp))
            .background(bg)
            .padding(horizontal = 6.dp, vertical = 2.dp),
    ) {
        Text(
            text = text,
            color = color,
            fontSize = 10.sp,
            fontWeight = FontWeight.Medium,
        )
    }
}
