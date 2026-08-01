# 测试配置文件

## 测试环境
- **操作系统**: Windows 10/11, macOS 10.14+, Ubuntu 20.04+
- **Flutter版本**: 3.0+
- **Go版本**: 1.21+
- **Python版本**: 3.10+

## 测试策略

### 1. 功能测试（Functional Testing）
- 心情打卡功能测试
- AI对话功能测试
- 情绪探索测评测试
- 冥想播放测试
- 风险检测测试
- 危机响应流程测试

### 2. 性能测试（Performance Testing）
- API响应时间测试（目标P95 < 500ms）
- AI对话首字延迟测试（目标 < 1.5s）
- APP冷启动测试（目标 < 2s）
- WebSocket连接稳定性测试

### 3. 安全测试（Security Testing）
- 端到端加密验证测试
- 数据隐私保护测试
- SQL注入防护测试
- XSS防护测试

### 4. 兼容性测试（Compatibility Testing）
- iOS 15+设备测试
- Android 9+设备测试
- 不同品牌手机测试（华为/小米/OPPO/vivo）

### 5. 用户验收测试（UAT）
- 50个标准对话用例测试
- 5-8名目标用户可用性测试

## 测试指标

| 测试类型 | 目标指标 |
|---------|---------|
| 功能覆盖率 | > 95% |
| API响应时间 | P95 < 500ms |
| AI对话延迟 | < 3s |
| 崩溃率 | < 0.1% |
| 高风险检出率 | > 90% |

## 测试工具
- **单元测试**: Flutter Test, Go Test, Python pytest
- **性能测试**: JMeter, Flutter Performance
- **安全测试**: OWASP ZAP
- **兼容性测试**: 真机测试云平台