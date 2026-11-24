package com.starisle.teacher

import android.app.AlertDialog
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.starisle.teacher.data.security.Verification
import com.starisle.teacher.theme.StarIsleTeacherTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        verifySignature()
        setContent {
            StarIsleTeacherTheme {
                StarIsleTeacherRoot()
            }
        }
    }

    private fun verifySignature() {
        val prefs = getSharedPreferences("starisle_security", MODE_PRIVATE)
        val result = Verification.verifySignature(this)
        when (result) {
            is Verification.SignatureResult.PASS -> { }
            is Verification.SignatureResult.PASS_BUILD_TYPE_DEBUG -> { }
            is Verification.SignatureResult.FAIL -> {
                val warned = prefs.getBoolean("signature_warned", false)
                if (!warned) {
                    AlertDialog.Builder(this)
                        .setTitle("安装包签名异常")
                        .setMessage("检测到安装包签名与官方签名不一致。应用可能已被篡改，存在安全风险。\n\n${result.reason}\n\n是否继续使用？")
                        .setPositiveButton("继续使用") { _, _ -> prefs.edit().putBoolean("signature_warned", true).apply() }
                        .setNegativeButton("退出") { _, _ -> finish() }
                        .setCancelable(false)
                        .show()
                }
            }
        }
    }
}
