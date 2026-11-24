package com.starisle.student

import android.app.AlertDialog
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.starisle.student.data.security.Verification
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
        verifySignature()
        setContent {
            StarIsleTheme {
                StarIsleApp()
            }
        }
    }

    private fun verifySignature() {
        val prefs = getSharedPreferences("starisle_security", MODE_PRIVATE)
        val result = Verification.verifySignature(this)
        when (result) {
            is Verification.SignatureResult.PASS -> { /* 正常 */ }
            is Verification.SignatureResult.PASS_BUILD_TYPE_DEBUG -> { /* debug 构建不验签 */ }
            is Verification.SignatureResult.FAIL -> {
                val warned = prefs.getBoolean("signature_warned", false)
                if (!warned) {
                    AlertDialog.Builder(this)
                        .setTitle("安装包签名异常")
                        .setMessage("检测到安装包签名与官方签名不一致。应用可能已被篡改，存在安全风险。\n\n$${result.reason}\n\n是否继续使用？")
                        .setPositiveButton("继续使用") { _, _ -> prefs.edit().putBoolean("signature_warned", true).apply() }
                        .setNegativeButton("退出") { _, _ -> finish() }
                        .setCancelable(false)
                        .show()
                }
            }
        }
    }
}
