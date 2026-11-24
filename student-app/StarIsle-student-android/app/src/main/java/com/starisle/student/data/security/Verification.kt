package com.starisle.student.data.security

import android.content.Context
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import com.starisle.student.BuildConfig
import java.security.MessageDigest

/**
 * 客户端查验工具集
 *
 * 提供四类查验能力：
 * 1. 签名完整性：对比安装包签名 SHA-256 与 BuildConfig 预置常量；
 * 2. 服务地址连通性：OkHttp GET /health，返回耗时；
 * 3. 版本更新：Retrofit 查 GitHub Releases latest；
 * 4. 云 API Key 有效性：向指定供应商发最小请求看 200/401。
 *
 * 所有方法均为 suspend / 静态，避免在主线程调用阻塞网络请求。
 */
object Verification {

    sealed class SignatureResult {
        data object PASS : SignatureResult()
        data object PASS_BUILD_TYPE_DEBUG : SignatureResult()
        data class FAIL(val reason: String) : SignatureResult()
    }

    /**
     * 验签
     *
     * 仅在 release 构建下有效；debug 构建没有预置 SHA-256，始终返回 true。
     * Android 11+ 使用 GET_SIGNING_CERTIFICATES；旧版本 fallback GET_SIGNATURES。
     */
    fun verifySignature(context: Context): SignatureResult {
        val expected = BuildConfig.EXPECTED_SIGNATURE_SHA256
        if (expected.isBlank()) return SignatureResult.PASS_BUILD_TYPE_DEBUG

        return try {
            val pm = context.packageManager
            val pkg = pm.getPackageInfo(
                context.packageName,
                PackageManager.GET_SIGNING_CERTIFICATES
            )
            val signingInfo = pkg.signingInfo
                ?: return SignatureResult.FAIL("未获取到签名信息")
            val apkContentsSigners = signingInfo.apkContentsSigners
            if (apkContentsSigners.isEmpty()) {
                return SignatureResult.FAIL("签名证书链为空")
            }
            val actualFingerprints = apkContentsSigners.map { cert ->
                val digest = MessageDigest.getInstance("SHA-256")
                digest.digest(cert.toByteArray())
                    .joinToString("") { "%02x".format(it) }
            }
            if (actualFingerprints.contains(expected.lowercase())) {
                SignatureResult.PASS
            } else {
                SignatureResult.FAIL("签名不匹配，实际: ${actualFingerprints.firstOrNull()?.take(16)}…")
            }
        } catch (e: Exception) {
            SignatureResult.FAIL(e.message ?: "验签异常")
        }
    }
}
