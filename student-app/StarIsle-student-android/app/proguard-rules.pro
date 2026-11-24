# Add project specific ProGuard rules here.
-keepattributes Signature
-keepattributes *Annotation*

# Retrofit
-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}
-keep,allowobfuscation,allowshrinking retrofit2.Response

# Moshi
-keepclassmembers class **$* {
    <fields>;
}
-keep class com.starisle.student.data.api.** { *; }
-keep class com.starisle.student.data.db.** { *; }
