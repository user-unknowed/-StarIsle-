package com.starisle.teacher

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.starisle.teacher.theme.StarIsleTeacherTheme
import dagger.hilt.android.AndroidEntryPoint

/**
 * 主 Activity。
 *
 * 承载 Compose 根视图 [StarIsleTeacherRoot]，应用主题由 [StarIsleTeacherTheme] 提供。
 * Hilt 通过 [AndroidEntryPoint] 注入依赖。
 */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            StarIsleTeacherTheme {
                StarIsleTeacherRoot()
            }
        }
    }
}
