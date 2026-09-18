package com.starisle.student

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.starisle.student.theme.StarIsleTheme
import dagger.hilt.android.AndroidEntryPoint

/**
 * 单 Activity Compose 入口（对应 Dart main.dart 中的 runApp(MaterialApp(...))）。
 *
 * 关闭 debug 横幅、配置主题，渲染 [StarIsleApp] 根 Composable。
 */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        setContent {
            StarIsleTheme {
                StarIsleApp()
            }
        }
    }
}
