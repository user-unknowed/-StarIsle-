package com.starisle.parent.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(
    primary = Warm500,
    onPrimary = Color.White,
    primaryContainer = Warm400,
    onPrimaryContainer = Color.White,
    secondary = Purple500,
    onSecondary = Color.White,
    tertiary = Indigo500,
    background = BgWindow,
    onBackground = TextPrimary,
    surface = CardWhite,
    onSurface = TextPrimary,
    surfaceVariant = Warm50,
    onSurfaceVariant = TextSecondary,
    outline = Divider,
    error = AlertRed500,
    onError = Color.White
)

private val DarkColors = darkColorScheme(
    primary = Warm400,
    onPrimary = Color.Black,
    secondary = Purple600,
    tertiary = Indigo400,
    background = Color(0xFF15171C),
    onBackground = Color(0xFFE7E9EE),
    surface = Color(0xFF1F242B),
    onSurface = Color(0xFFE7E9EE),
    error = AlertRed500
)

@Composable
fun StarIsleParentTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colors = if (darkTheme) DarkColors else LightColors
    MaterialTheme(
        colorScheme = colors,
        content = content
    )
}
