# Add project specific ProGuard rules here.
-keepattributes Signature
-keepattributes *Annotation*

# Moshi
-keepclassmembers,allowobfuscation class * {
  @com.squareup.moshi.JsonClass *;
}
-keep @com.squareup.moshi.JsonClass class * { *; }
-keep class **JsonAdapter { *; }

# Retrofit
-keepattributes RuntimeVisibleAnnotations,RuntimeVisibleParameterAnnotations
-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}
