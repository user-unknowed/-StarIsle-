package com.starisle.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/content")
@RequiredArgsConstructor
public class ContentController {
    
    @GetMapping("/meditations")
    public ResponseEntity<Map<String, Object>> getMeditationList(
            @RequestParam(defaultValue = "all") String category) {
        return ResponseEntity.ok(Map.of(
            "category", category,
            "meditations", List.of(
                Map.of(
                    "id", "meditation_1",
                    "title", "考前放松",
                    "duration", 5,
                    "category", "学习",
                    "audio_url", "https://cdn.example.com/meditation1.mp3",
                    "description", "帮助缓解考试焦虑，提升专注力"
                ),
                Map.of(
                    "id", "meditation_2",
                    "title", "入睡引导",
                    "duration", 8,
                    "category", "睡眠",
                    "audio_url", "https://cdn.example.com/meditation2.mp3",
                    "description", "深度放松，引导进入睡眠"
                ),
                Map.of(
                    "id", "meditation_3",
                    "title", "情绪安抚",
                    "duration", 5,
                    "category", "情绪",
                    "audio_url", "https://cdn.example.com/meditation3.mp3",
                    "description", "安抚情绪风暴，找回内心平静"
                )
            )
        ));
    }
    
    @GetMapping("/meditation/{id}")
    public ResponseEntity<Map<String, Object>> getMeditationDetail(@PathVariable String id) {
        return ResponseEntity.ok(Map.of(
            "id", id,
            "title", "考前放松",
            "duration", 5,
            "audio_url", "https://cdn.example.com/meditation1.mp3",
            "background_image", "https://cdn.example.com/background1.jpg",
            "script", "闭上眼睛，深呼吸..."
        ));
    }
    
    @GetMapping("/breathing/{type}")
    public ResponseEntity<Map<String, Object>> getBreathingExercise(@PathVariable String type) {
        return ResponseEntity.ok(Map.of(
            "type", type,
            "steps", List.of(
                Map.of("name", "吸气", "duration", 4, "instruction", "慢慢吸气"),
                Map.of("name", "屏息", "duration", 7, "instruction", "屏住呼吸"),
                Map.of("name", "呼气", "duration", 8, "instruction", "慢慢呼气")
            ),
            "recommended_duration", 3,
            "animation_url", "https://cdn.example.com/breathing_animation.json"
        ));
    }
}