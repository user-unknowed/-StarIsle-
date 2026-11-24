package com.starisle.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * 系统健康检查与连通性探测控制器
 * 暴露一组无需鉴权的公开端点，供三端 Android 应用做：
 * - 冷启动后台探活；
 * - 「服务地址」页手动测试连通；
 * - 版本号比对（取 [version] 字段）。
 *
 * 注意：这些端点故意不校验 JWT，便于用户在未登录状态下也能确认
 * 公网隧道 / 局域网转发是否可达。
 */
@RestController
@RequestMapping("/api/v1/system")
@RequiredArgsConstructor
public class SystemController {

    /** 版本号，从 application.yml 读取，缺省 1.1.2 */
    @Value("${starisle.version:1.1.2}")
    private String version;

    /** 应用健康检查（无鉴权） */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> body = new HashMap<>();
        body.put("status", "healthy");
        body.put("service", "starisle-api");
        body.put("version", version);
        body.put("timestamp", Instant.now().toEpochMilli());
        return ResponseEntity.ok(body);
    }

    /**
     * 轻量连通性探测（客户端查验入口）
     * 与 /health 返回相同字段，但语义更明确是供客户端 ping 使用。
     *
     * @HTTP GET /api/v1/system/ping
     */
    @GetMapping("/ping")
    public ResponseEntity<Map<String, Object>> ping() {
        Map<String, Object> body = new HashMap<>();
        body.put("status", "ok");
        body.put("version", version);
        body.put("timestamp", Instant.now().toEpochMilli());
        return ResponseEntity.ok(body);
    }
}
