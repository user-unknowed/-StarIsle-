# Add project specific ProGuard rules here.
-keepattributes Signature
-keepattributes *Annotation*

# Moshi
-keepclassmembers class ** { @com.squareup.moshi.JsonClass <fields>; }
-keep @com.squareup.moshi.JsonClass { *; }
-keep class com.starisle.parent.data.models.** { *; }

# Retrofit
-keep class retrofit2.** { *; }
-keepclasseswithmembers class * { @retrofit2.http.* <methods>; }

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
