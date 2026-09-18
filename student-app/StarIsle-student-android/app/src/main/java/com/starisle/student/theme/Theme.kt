package com.starisle.student.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColors = lightColorScheme(
    primary = StarNightBlue,
    onPrimary = SurfaceLight,
    primaryContainer = StarNightBlue,
    onPrimaryContainer = SurfaceLight,
    secondary = WarmOrange,
    onSecondary = SurfaceLight,
    secondaryContainer = WarmOrangeLight,
    tertiary = LightGold,
    background = ScaffoldLight,
    onBackground = DeepBluePurple,
    surface = SurfaceLight,
    onSurface = DeepBluePurple,
    surfaceVariant = ScaffoldLight,
    error = ErrorColor,
    onError = SurfaceLight,
)

private val DarkColors = darkColorScheme(
    primary = StarNightBlueLight,
    onPrimary = SurfaceLight,
    primaryContainer = StarNightBlueLight,
    onPrimaryContainer = SurfaceLight,
    secondary = WarmOrangeLight,
    onSecondary = DeepBluePurple,
    secondaryContainer = WarmOrange,
    tertiary = LightGold,
    background = DeepBluePurple,
    onBackground = SurfaceLight,
    surface = SurfaceDark,
    onSurface = SurfaceLight,
    surfaceVariant = StarNightBlue,
    error = ErrorColor,
    onError = SurfaceLight,
)

@Composable
fun StarIsleTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) DarkColors else LightColors
    val view = LocalView.current
    if (!view.isInEditMode) {
        (view.context as? Activity)?.window?.let { window ->
            WindowCompat.setDecorFitsSystemWindows(window, false)
            window.statusBarColor = colorScheme.primary.toArgb()
            WindowCompat.getInsetsController(window, view)?.isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = StarIsleTypography,
        content = content,
    )
}
