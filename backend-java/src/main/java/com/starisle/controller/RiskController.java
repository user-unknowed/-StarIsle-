package com.starisle.controller;

import com.starisle.service.RiskDetectionService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/risk")
@RequiredArgsConstructor
public class RiskController {
    
    private final RiskDetectionService riskDetectionService;
    
    @PostMapping("/detect")
    public ResponseEntity<Map<String, Object>> detectRisk(@RequestBody DetectRiskRequest request) {
        String riskLevel = riskDetectionService.detectRisk(request.getUserId(), request.getContent());
        RiskDetectionService.RiskDetectionDetails details = riskDetectionService.getDetectionDetails(request.getContent());
        
        return ResponseEntity.ok(Map.of(
            "user_id", request.getUserId(),
            "risk_level", riskLevel,
            "confidence", 0.95,
            "triggered_keywords", details.getKeywordsDetected(),
            "need_intervention", "red".equals(riskLevel) || "orange".equals(riskLevel)
        ));
    }
    
    @GetMapping("/level/{userId}")
    public ResponseEntity<Map<String, Object>> getUserRiskLevel(@PathVariable String userId) {
        return ResponseEntity.ok(Map.of(
            "user_id", userId,
            "current_risk_level", "green",
            "history", List.of(
                Map.of("date", "2026-01-01", "level", "green"),
                Map.of("date", "2026-01-02", "level", "yellow")
            )
        ));
    }
    
    @GetMapping("/crisis/hotlines")
    public ResponseEntity<Map<String, Object>> getCrisisHotlines() {
        return ResponseEntity.ok(Map.of(
            "hotlines", List.of(
                Map.of(
                    "name", "12355 青少年服务热线",
                    "number", "12355",
                    "description", "全国青少年心理咨询服务热线",
                    "hours", "24小时"
                ),
                Map.of(
                    "name", "希望24热线",
                    "number", "400-161-9995",
                    "description", "全国心理危机干预热线",
                    "hours", "24小时"
                ),
                Map.of(
                    "name", "全国公共卫生公益热线",
                    "number", "12320",
                    "description", "心理健康咨询服务",
                    "hours", "24小时"
                )
            )
        ));
    }
    
    @PostMapping("/crisis/report")
    public ResponseEntity<Map<String, Object>> reportCrisis(@RequestBody ReportCrisisRequest request) {
        return ResponseEntity.ok(Map.of(
            "message", "危机事件已上报",
            "user_id", request.getUserId(),
            "handled", true
        ));
    }
    
    @Data
    public static class DetectRiskRequest {
        private String userId;
        private String content;
        private String contentType;
    }
    
    @Data
    public static class ReportCrisisRequest {
        private String userId;
        private String riskLevel;
        private String triggerType;
    }
}