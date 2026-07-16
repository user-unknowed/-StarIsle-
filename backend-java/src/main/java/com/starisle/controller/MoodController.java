package com.starisle.controller;

import com.starisle.dto.ApiResponse;
import com.starisle.entity.MoodRecord;
import com.starisle.repository.MoodRecordRepository;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/mood")
@RequiredArgsConstructor
@Validated
public class MoodController {

    private final MoodRecordRepository moodRecordRepository;

    @Data
    public static class MoodCheckinRequest {
        @NotBlank(message = "用户ID不能为空")
        private String userId;

        @Min(value = 1, message = "心情等级最小为1")
        @Max(value = 5, message = "心情等级最大为5")
        private int moodLevel;

        private List<String> tags;
    }

    @PostMapping("/checkin")
    public ResponseEntity<ApiResponse<Map<String, Object>>> moodCheckin(@Validated @RequestBody MoodCheckinRequest request) {
        String currentUserId = getCurrentUserId();
        if (!currentUserId.equals(request.getUserId())) {
            return ResponseEntity.ok(ApiResponse.forbidden("无权替他人打卡"));
        }

        MoodRecord record = MoodRecord.builder()
                .userId(request.getUserId())
                .moodLevel(request.getMoodLevel())
                .tags(request.getTags())
                .checkinDate(LocalDate.now())
                .build();

        moodRecordRepository.save(record);

        long continuousDays = moodRecordRepository.countContinuousCheckinDays(request.getUserId());

        return ResponseEntity.ok(ApiResponse.success("心情打卡成功", Map.of(
            "checkin_date", LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")),
            "mood_level", request.getMoodLevel(),
            "continuous_days", continuousDays
        )));
    }

    @GetMapping("/history/{userId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMoodHistory(
            @PathVariable String userId,
            @RequestParam(defaultValue = "7") @Min(1) @Max(90) Integer days) {
        String currentUserId = getCurrentUserId();
        if (!currentUserId.equals(userId)) {
            return ResponseEntity.ok(ApiResponse.forbidden("无权查看他人心情记录"));
        }

        LocalDate startDate = LocalDate.now().minusDays(days - 1);
        List<MoodRecord> records = moodRecordRepository.findByUserIdAndCheckinDateBetween(
                userId, startDate, LocalDate.now());

        List<Map<String, Object>> history = records.stream()
                .map(r -> Map.of(
                    "date", r.getCheckinDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")),
                    "mood_level", r.getMoodLevel(),
                    "tags", r.getTags() != null ? r.getTags() : List.of()
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(Map.of(
            "user_id", userId,
            "days", days,
            "history", history
        )));
    }

    @GetMapping("/chart/{userId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMoodChart(@PathVariable String userId) {
        String currentUserId = getCurrentUserId();
        if (!currentUserId.equals(userId)) {
            return ResponseEntity.ok(ApiResponse.forbidden("无权查看他人心情图表"));
        }

        LocalDate startDate = LocalDate.now().minusDays(6);
        List<MoodRecord> records = moodRecordRepository.findByUserIdAndCheckinDateBetween(
                userId, startDate, LocalDate.now());

        List<Map<String, Object>> chartData = records.stream()
                .map(r -> Map.of(
                    "date", r.getCheckinDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")),
                    "value", r.getMoodLevel()
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(Map.of(
            "user_id", userId,
            "chart_type", "bar",
            "data", chartData
        )));
    }

    private String getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getPrincipal().toString() : null;
    }
}