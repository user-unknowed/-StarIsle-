package com.starisle.parent

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.starisle.parent.ui.ParentApp
import dagger.hilt.android.AndroidEntryPoint

/**
 * 家长端唯一 Activity。
 *
 * - @AndroidEntryPoint 让 Hilt 在 Activity 上注入依赖
 * - setContent 直接挂载 [ParentApp] 根 Composable
 * - enableEdgeToEdge 启用全屏沉浸式布局
 */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        setContent {
            ParentApp()
        }
    }
}
