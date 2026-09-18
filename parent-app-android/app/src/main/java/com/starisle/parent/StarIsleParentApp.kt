package com.starisle.parent

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

/**
 * 星屿家长端 Application 入口。
 *
 * @HiltAndroidApp 触发 Hilt 的代码生成（Application 注入器），
 * 是整个 DI 图的根。对应 web-frontend 入口 main.tsx + Zustand provider。
 */
@HiltAndroidApp
class StarIsleParentApp : Application()
