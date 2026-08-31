package com.starisle.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 健康检查接口控制器
 * 暴露应用健康检查端点，供运维或外部监控探活使用。
 */
@RestController
@RequiredArgsConstructor
public class HealthController {

    /**
     * 应用健康检查
     *
     * @HTTP GET /health
     * @return 包含服务名与版本的状态响应
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        // 返回服务基础信息，标识为健康状态
        return ResponseEntity.ok(Map.of(
            "status", "healthy",
            "service", "starisle-api",
            "version", "1.0.0"
        ));
    }
}
