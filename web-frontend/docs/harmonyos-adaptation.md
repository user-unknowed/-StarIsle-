# 星屿心理健康管理系统 - 鸿蒙平台适配方案

## 1. 概述

### 1.1 适配目标
本方案旨在将星屿心理健康管理系统适配到鸿蒙（HarmonyOS）平台，确保应用在鸿蒙设备上能够正常运行，并提供与原生应用一致的用户体验。

### 1.2 适配策略
采用WebView容器方式将现有的React Web应用封装为鸿蒙应用，同时针对鸿蒙平台的特性进行优化和适配。

### 1.3 适配范围
- 功能适配：确保所有核心功能在鸿蒙平台正常运行
- 界面适配：优化界面布局和交互，适配鸿蒙设计规范
- 性能优化：针对鸿蒙平台进行性能优化
- 体验优化：提供符合鸿蒙用户习惯的交互体验

## 2. 技术架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────┐
│                   鸿蒙应用层                         │
│  ┌─────────────────────────────────────────────┐   │
│  │              MainAbility                    │   │
│  │  ┌─────────────────────────────────────┐   │   │
│  │  │         WebView组件                  │   │   │
│  │  │  ┌───────────────────────────────┐  │   │   │
│  │  │  │   React Web应用               │  │   │   │
│  │  │  │  ┌─────────────────────────┐  │  │   │   │
│  │  │  │  │  学生端/教师端/家长端   │  │  │   │   │
│  │  │  │  └─────────────────────────┘  │  │   │   │
│  │  │  └───────────────────────────────┘  │   │   │
│  │  └─────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│                   鸿蒙系统层                         │
│  - ArkUI框架                                        │
│  - WebView组件                                      │
│  - 系统能力（通知、存储、网络等）                      │
└─────────────────────────────────────────────────────┘
```

### 2.2 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| Web层 | React + TypeScript + Vite | 核心业务逻辑 |
| 容器层 | HarmonyOS WebView | Web应用容器 |
| 原生层 | ArkUI（Stage模型） | 原生UI组件 |
| 构建工具 | DevEco Studio | 鸿蒙应用开发环境 |

## 3. 适配方案

### 3.1 WebView容器配置

#### 3.1.1 创建鸿蒙工程

1. 打开DevEco Studio
2. 创建新工程，选择"Empty Ability"模板
3. 配置工程信息：
   - 工程名称：StarIsle
   - 包名：com.starisle.app
   - 设备类型：Phone/Tablet

#### 3.1.2 配置WebView

在`entry/src/main/ets/pages/Index.ets`中配置WebView：

```typescript
@Entry
@Component
struct WebViewPage {
  controller: WebViewController = new WebViewController();

  build() {
    Column() {
      Web({ src: $rawfile('dist/index.html'), controller: this.controller })
        .width('100%')
        .height('100%')
        .onLoad(() => {
          console.info('WebView loaded');
        })
        .onError((event) => {
          console.error('WebView error: ' + event.message);
        })
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#f5f5f5')
  }
}
```

#### 3.1.3 配置网络权限

在`entry/src/main/resources/base/profile/main_pages.json`中添加网络权限：

```json
{
  "module": {
    "name": "entry",
    "type": "entry",
    "description": "$string:module_desc",
    "mainElement": "entry",
    "deviceTypes": ["phone", "tablet"],
    "deliveryWithInstall": true,
    "installationFree": false,
    "pages": "$profile:main_pages",
    "abilities": [
      {
        "name": "MainAbility",
        "srcEntry": "./ets/MainAbility.ts",
        "description": "$string:main_ability_desc",
        "icon": "$media:icon",
        "label": "$string:main_ability_label",
        "startWindowIcon": "$media:icon",
        "startWindowBackground": "$color:start_window_background",
        "exported": true,
        "skills": [
          {
            "entities": ["entity.system.home"],
            "actions": ["action.system.home"]
          }
        ]
      }
    ],
    "requestPermissions": [
      {
        "name": "ohos.permission.INTERNET"
      },
      {
        "name": "ohos.permission.ACCESS_NETWORK_STATE"
      }
    ]
  }
}
```

### 3.2 Web应用优化

#### 3.2.1 安全区适配

在`src/design/platform.css`中已包含安全区适配样式：

```css
.safe-area-top {
  padding-top: env(safe-area-inset-top);
}

.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
```

#### 3.2.2 鸿蒙浏览器特性处理

针对鸿蒙浏览器内核的特性进行处理：

```typescript
export const isHarmonyOS = (): boolean => {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('harmonyos') || ua.includes('huawei');
};

export const getPlatform = (): 'ios' | 'android' | 'harmony' | 'unknown' => {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('iphone') || ua.includes('ipad')) {
    return 'ios';
  } else if (ua.includes('harmonyos')) {
    return 'harmony';
  } else if (ua.includes('android')) {
    return 'android';
  }
  return 'unknown';
};
```

#### 3.2.3 性能优化

针对鸿蒙WebView的性能优化：

1. **禁用不必要的动画**：在低端设备上禁用复杂动画
2. **优化图片加载**：使用适当的图片格式和尺寸
3. **减少内存占用**：及时清理无用的DOM元素和事件监听器
4. **使用虚拟滚动**：对于长列表使用虚拟滚动技术

### 3.3 原生能力集成

#### 3.3.1 JavaScript与原生通信

通过WebView的`onMessage`和`postMessage`实现JS与原生通信：

**原生端（鸿蒙）：**

```typescript
@Entry
@Component
struct WebViewPage {
  controller: WebViewController = new WebViewController();

  build() {
    Column() {
      Web({ 
        src: $rawfile('dist/index.html'), 
        controller: this.controller 
      })
        .width('100%')
        .height('100%')
        .onMessage((event: WebMessageResult) => {
          const message = event.message;
          this.handleMessage(message);
        })
    }
    .width('100%')
    .height('100%')
  }

  handleMessage(message: string) {
    const data = JSON.parse(message);
    switch (data.type) {
      case 'getDeviceInfo':
        this.sendDeviceInfo();
        break;
      case 'showToast':
        this.showToast(data.content);
        break;
      case 'share':
        this.share(data.content);
        break;
    }
  }

  sendDeviceInfo() {
    const deviceInfo = {
      type: 'deviceInfo',
      data: {
        platform: 'harmonyos',
        version: '3.0.0',
        screenWidth: 0,
        screenHeight: 0
      }
    };
    this.controller.postMessage(JSON.stringify(deviceInfo));
  }

  showToast(content: string) {
    // 调用鸿蒙Toast API
  }

  share(content: string) {
    // 调用鸿蒙分享API
  }
}
```

**Web端（React）：**

```typescript
export const useNativeBridge = () => {
  const sendMessage = useCallback((type: string, data: Record<string, unknown>) => {
    const message = JSON.stringify({ type, data });
    if ((window as unknown as { webview?.postMessage: (msg: string) => void }).webview) {
      (window as unknown as { webview: { postMessage: (msg: string) => void } }).webview.postMessage(message);
    } else {
      console.log('Native bridge not available');
    }
  }, []);

  const showToast = useCallback((content: string) => {
    sendMessage('showToast', { content });
  }, [sendMessage]);

  const share = useCallback((content: string) => {
    sendMessage('share', { content });
  }, [sendMessage]);

  return { sendMessage, showToast, share };
};
```

#### 3.3.2 通知能力集成

```typescript
import { common } from '@kit.BasicServicesKit';

const notificationManager = common.NotificationManager;

export const sendNotification = async (title: string, content: string) => {
  const notificationRequest = {
    id: 1,
    content: {
      title: title,
      text: content,
    },
    deliveryTime: new Date().getTime()
  };

  await notificationManager.publish(notificationRequest);
};
```

### 3.4 打包配置

#### 3.4.1 构建Web应用

```bash
cd web-frontend
npm run build
```

#### 3.4.2 将构建产物复制到鸿蒙工程

将`web-frontend/dist`目录下的所有文件复制到`entry/src/main/resources/rawfile/`目录。

#### 3.4.3 配置应用签名

在DevEco Studio中配置签名信息：

1. 打开`File > Project Structure`
2. 选择`Modules > entry > Signing Configs`
3. 点击`+`添加签名配置
4. 填写签名信息：
   - Key alias: StarIsle
   - Key password: ***
   - Store file: starisle.jks
   - Store password: ***

#### 3.4.4 构建HAP包

1. 在DevEco Studio中选择`Build > Build Hap(s) > Build Debug Hap(s)`
2. 构建成功后，HAP包位于`entry/build/outputs/hap/debug/`目录

## 4. 测试方案

### 4.1 测试环境

| 设备类型 | 型号 | HarmonyOS版本 |
|----------|------|---------------|
| 手机 | 华为Mate 40 Pro | 3.0.0 |
| 手机 | 华为P50 | 3.0.0 |
| 平板 | 华为MatePad Pro | 3.0.0 |

### 4.2 测试内容

#### 4.2.1 功能测试

| 测试项 | 测试内容 | 预期结果 |
|--------|----------|----------|
| 登录功能 | 测试各种登录方式 | 正常登录 |
| 心情打卡 | 测试心情选择和标签选择 | 正常打卡 |
| 聊天功能 | 测试与AI聊天 | 正常发送和接收消息 |
| 数据同步 | 测试多设备数据同步 | 数据一致 |

#### 4.2.2 性能测试

| 测试项 | 测试内容 | 预期结果 |
|--------|----------|----------|
| 启动时间 | 从点击图标到首页显示 | ≤ 3秒 |
| 页面切换 | 测试各页面切换 | 流畅无卡顿 |
| 内存占用 | 运行过程中的内存使用 | ≤ 200MB |
| 网络请求 | 测试API请求响应 | ≤ 2秒 |

#### 4.2.3 兼容性测试

| 测试项 | 测试内容 | 预期结果 |
|--------|----------|----------|
| 屏幕适配 | 测试不同屏幕尺寸 | 布局正常 |
| 系统版本 | 测试不同HarmonyOS版本 | 功能正常 |
| 横竖屏切换 | 测试横竖屏切换 | 布局自适应 |

## 5. 发布流程

### 5.1 准备发布包

1. 构建Release版本的HAP包
2. 生成签名文件
3. 准备应用描述信息

### 5.2 华为应用市场发布

1. 登录华为开发者联盟
2. 创建应用
3. 填写应用信息：
   - 应用名称：星屿心理健康管理系统
   - 应用描述：青少年心理健康管理平台
   - 应用分类：健康
   - 应用截图：准备不同尺寸的截图
4. 上传HAP包
5. 提交审核
6. 等待审核通过后发布

## 6. 常见问题处理

### 6.1 WebView加载失败

**问题描述**：WebView无法加载本地HTML文件

**解决方案**：
1. 检查文件路径是否正确
2. 确保文件已复制到rawfile目录
3. 检查网络权限配置

### 6.2 JS与原生通信失败

**问题描述**：JavaScript无法与原生代码通信

**解决方案**：
1. 检查通信接口是否正确
2. 确保WebView已配置`onMessage`监听器
3. 检查消息格式是否正确

### 6.3 性能问题

**问题描述**：应用运行卡顿

**解决方案**：
1. 优化Web应用性能
2. 减少不必要的DOM操作
3. 使用虚拟滚动优化列表性能
4. 禁用复杂动画效果

### 6.4 样式异常

**问题描述**：界面样式显示异常

**解决方案**：
1. 检查CSS兼容性
2. 添加鸿蒙特定的样式适配
3. 测试不同设备的显示效果

## 7. 附录

### 7.1 参考文档

- [HarmonyOS官方文档](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides)
- [DevEco Studio使用指南](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides-V2/devecostudio-overview-0000001478679005-V2)
- [WebView组件文档](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides-V2/webview-overview-0000001477573743-V2)

### 7.2 工具清单

| 工具 | 版本 | 用途 |
|------|------|------|
| DevEco Studio | 4.0+ | 鸿蒙应用开发环境 |
| Node.js | 18+ | Web应用构建 |
| npm | 9+ | 依赖管理 |

### 7.3 注意事项

1. **WebView版本**：确保使用HarmonyOS 3.0及以上版本的WebView组件
2. **网络权限**：必须配置网络权限才能访问外部API
3. **安全策略**：遵循鸿蒙平台的安全策略和隐私保护要求
4. **性能优化**：针对鸿蒙WebView的特性进行性能优化