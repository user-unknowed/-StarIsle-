package com.starisle.controller;

import com.starisle.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 内容资源接口控制器
 * 提供冥想列表、冥想详情与呼吸练习等心理健康辅助内容查询接口（公开访问）。
 */
@RestController
@RequestMapping("/api/v1/content")
@RequiredArgsConstructor
@Validated
public class ContentController {

    /**
     * 获取冥想列表（公开接口）
     *
     * @HTTP GET /api/v1/content/meditations
     * @param category 内容分类，默认 all
     * @return 冥想内容列表
     */
    @GetMapping("/meditations")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMeditationList(
            @RequestParam(defaultValue = "all") String category) {
        // 返回内置的冥想内容列表
        return ResponseEntity.ok(ApiResponse.success(Map.of(
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
        )));
    }

    /**
     * 获取冥想详情（公开接口）
     *
     * @HTTP GET /api/v1/content/meditation/{id}
     * @param id 冥想 ID
     * @return 冥想详情
     */
    @GetMapping("/meditation/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMeditationDetail(@PathVariable String id) {
        // 返回内置的冥想详情
        return ResponseEntity.ok(ApiResponse.success(Map.of(
            "id", id,
            "title", "考前放松",
            "duration", 5,
            "audio_url", "https://cdn.example.com/meditation1.mp3",
            "background_image", "https://cdn.example.com/background1.jpg",
            "script", "闭上眼睛，深呼吸..."
        )));
    }

    /**
     * 获取呼吸练习详情（公开接口）
     *
     * @HTTP GET /api/v1/content/breathing/{type}
     * @param type 呼吸练习类型
     * @return 呼吸练习步骤与推荐时长
     */
    @GetMapping("/breathing/{type}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getBreathingExercise(@PathVariable String type) {
        // 返回内置的呼吸练习步骤
        return ResponseEntity.ok(ApiResponse.success(Map.of(
            "type", type,
            "steps", List.of(
                Map.of("name", "吸气", "duration", 4, "instruction", "慢慢吸气"),
                Map.of("name", "屏息", "duration", 7, "instruction", "屏住呼吸"),
                Map.of("name", "呼气", "duration", 8, "instruction", "慢慢呼气")
            ),
            "recommended_duration", 3,
            "animation_url", "https://cdn.example.com/breathing_animation.json"
        )));
    }
}
