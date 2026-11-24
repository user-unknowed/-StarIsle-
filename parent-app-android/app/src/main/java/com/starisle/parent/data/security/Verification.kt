package com.starisle.parent.data.security

import android.content.Context
import android.content.pm.PackageManager
import com.starisle.parent.BuildConfig
import java.security.MessageDigest

object Verification {

    sealed class SignatureResult {
        data object PASS : SignatureResult()
        data object PASS_BUILD_TYPE_DEBUG : SignatureResult()
        data class FAIL(val reason: String) : SignatureResult()
    }

    fun verifySignature(context: Context): SignatureResult {
        val expected = BuildConfig.EXPECTED_SIGNATURE_SHA256
        if (expected.isBlank()) return SignatureResult.PASS_BUILD_TYPE_DEBUG

        return try {
            val pm = context.packageManager
            val pkg = pm.getPackageInfo(context.packageName, PackageManager.GET_SIGNING_CERTIFICATES)
            val signingInfo = pkg.signingInfo ?: return SignatureResult.FAIL("未获取到签名信息")
            val certs = signingInfo.apkContentsSigners
            if (certs.isEmpty()) return SignatureResult.FAIL("签名证书链为空")
            val fingerprints = certs.map { cert ->
                val digest = MessageDigest.getInstance("SHA-256")
                digest.digest(cert.toByteArray()).joinToString("") { "%02x".format(it) }
            }
            if (fingerprints.contains(expected.lowercase())) {
                SignatureResult.PASS
            } else {
                SignatureResult.FAIL("签名不匹配")
            }
        } catch (e: Exception) {
            SignatureResult.FAIL(e.message ?: "验签异常")
        }
    }
}
