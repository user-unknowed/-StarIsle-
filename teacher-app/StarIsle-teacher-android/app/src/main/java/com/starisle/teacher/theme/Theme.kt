package com.starisle.teacher.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// 浅色色彩方案
private val LightColorScheme = lightColorScheme(
    primary = StarNightBlue,
    onPrimary = CardBgLight,
    primaryContainer = StarNightBlueLight,
    onPrimaryContainer = CardBgLight,
    secondary = WarmOrange,
    onSecondary = CardBgLight,
    tertiary = WarmOrangeLight,
    background = ScaffoldBgLight,
    onBackground = TextPrimaryLight,
    surface = CardBgLight,
    onSurface = TextPrimaryLight,
    surfaceVariant = ScaffoldBgLight,
    onSurfaceVariant = TextSecondaryLight,
    error = ErrorColor,
    outline = TextSecondaryLight,
)

// 暗色色彩方案
private val DarkColorScheme = darkColorScheme(
    primary = StarNightBlueLight,
    onPrimary = CardBgLight,
    primaryContainer = StarNightBlue,
    onPrimaryContainer = CardBgLight,
    secondary = WarmOrangeLight,
    onSecondary = DeepBluePurple,
    tertiary = WarmOrange,
    background = ScaffoldBgDark,
    onBackground = TextPrimaryDark,
    surface = CardBgDark,
    onSurface = TextPrimaryDark,
    surfaceVariant = StarNightBlue,
    onSurfaceVariant = TextSecondaryDark,
    error = ErrorColor,
    outline = TextSecondaryDark,
)

// 教师端 Typography（对齐 Flutter 浅色主题文本规格）
private val TeacherTypography = Typography(
    headlineLarge = TextStyle(fontSize = 28.sp, fontWeight = FontWeight.Bold, color = StarNightBlue),
    headlineMedium = TextStyle(fontSize = 22.sp, fontWeight = FontWeight.SemiBold, color = StarNightBlue),
    headlineSmall = TextStyle(fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = StarNightBlue),
    bodyLarge = TextStyle(fontSize = 16.sp, color = DeepBluePurple),
    bodyMedium = TextStyle(fontSize = 14.sp, color = DeepBluePurple),
    bodySmall = TextStyle(fontSize = 12.sp, color = TextSecondaryLight),
    labelLarge = TextStyle(fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = CardBgLight),
    labelMedium = TextStyle(fontSize = 12.sp, fontWeight = FontWeight.Medium, color = StarNightBlue),
)

/** 教师端 Compose Material3 主题入口。 */
@Composable
fun StarIsleTeacherTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    MaterialTheme(
        colorScheme = colorScheme,
        typography = TeacherTypography,
        content = content,
    )
}
