package com.starisle.controller;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/mood")
@RequiredArgsConstructor
public class MoodController {
    
    @PostMapping("/checkin")
    public ResponseEntity<Map<String, Object>> moodCheckin(@RequestBody MoodCheckinRequest request) {
        return ResponseEntity.ok(Map.of(
            "message", "心情打卡成功",
            "checkin_date", LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")),
            "mood_level", request.getMoodLevel(),
            "continuous_days", 1
        ));
    }
    
    @GetMapping("/history/{userId}")
    public ResponseEntity<Map<String, Object>> getMoodHistory(
            @PathVariable String userId,
            @RequestParam(defaultValue = "7") String days) {
        return ResponseEntity.ok(Map.of(
            "user_id", userId,
            "days", days,
            "history", List.of(
                Map.of("date", "2026-01-01", "mood_level", 4, "tags", List.of("学习压力")),
                Map.of("date", "2026-01-02", "mood_level", 3, "tags", List.of("人际"))
            )
        ));
    }
    
    @GetMapping("/chart/{userId}")
    public ResponseEntity<Map<String, Object>> getMoodChart(@PathVariable String userId) {
        return ResponseEntity.ok(Map.of(
            "user_id", userId,
            "chart_type", "bar",
            "data", List.of(
                Map.of("date", "2026-01-01", "value", 4),
                Map.of("date", "2026-01-02", "value", 3),
                Map.of("date", "2026-01-03", "value", 2),
                Map.of("date", "2026-01-04", "value", 5),
                Map.of("date", "2026-01-05", "value", 4),
                Map.of("date", "2026-01-06", "value", 3),
                Map.of("date", "2026-01-07", "value", 4)
            )
        ));
    }
    
    @Data
    public static class MoodCheckinRequest {
        private String userId;
        private int moodLevel;
        private List<String> tags;
    }
}