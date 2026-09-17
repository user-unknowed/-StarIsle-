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

/**
 * 心情打卡接口控制器
 * 提供心情打卡、心情历史记录查询与心情图表数据等接口，
 * 帮助学生持续记录情绪状态。
 */
@RestController
@RequestMapping("/api/v1/mood")
@RequiredArgsConstructor
@Validated
public class MoodController {

    // 心情记录仓储
    private final MoodRecordRepository moodRecordRepository;

    /**
     * 心情打卡请求 DTO
     */
    @Data
    public static class MoodCheckinRequest {
        // 用户 ID
        @NotBlank(message = "用户ID不能为空")
        private String userId;

        // 心情等级（1-5）
        @Min(value = 1, message = "心情等级最小为1")
        @Max(value = 5, message = "心情等级最大为5")
        private int moodLevel;

        // 标签列表
        private List<String> tags;
    }

    /**
     * 心情打卡
     *
     * @HTTP POST /api/v1/mood/checkin
     * @param request 打卡请求
     * @return 含打卡日期、心情等级与连续天数的响应
     */
    @PostMapping("/checkin")
    public ResponseEntity<ApiResponse<Map<String, Object>>> moodCheckin(@Validated @RequestBody MoodCheckinRequest request) {
        // 校验权限，禁止替他人打卡
        String currentUserId = getCurrentUserId();
        if (!currentUserId.equals(request.getUserId())) {
            return ResponseEntity.ok(ApiResponse.forbidden("无权替他人打卡"));
        }

        // 构造心情记录实体并保存
        MoodRecord record = MoodRecord.builder()
                .userId(request.getUserId())
                .moodLevel(request.getMoodLevel())
                .tags(request.getTags())
                .checkinDate(LocalDate.now())
                .build();

        moodRecordRepository.save(record);

        // 统计连续打卡天数
        long continuousDays = moodRecordRepository.countContinuousCheckinDays(request.getUserId());

        // 返回打卡结果
        return ResponseEntity.ok(ApiResponse.success("心情打卡成功", Map.of(
            "checkin_date", LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")),
            "mood_level", request.getMoodLevel(),
            "continuous_days", continuousDays
        )));
    }

    /**
     * 查询心情历史记录
     *
     * @HTTP GET /api/v1/mood/history/{userId}
     * @param userId 用户 ID
     * @param days   查询天数（默认 7，最大 90）
     * @return 心情历史列表
     */
    @GetMapping("/history/{userId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMoodHistory(
            @PathVariable String userId,
            @RequestParam(defaultValue = "7") @Min(1) @Max(90) Integer days) {
        // 校验权限，仅可查看本人记录
        String currentUserId = getCurrentUserId();
        if (!currentUserId.equals(userId)) {
            return ResponseEntity.ok(ApiResponse.forbidden("无权查看他人心情记录"));
        }

        // 计算时间范围并查询历史记录
        LocalDate startDate = LocalDate.now().minusDays(days - 1);
        List<MoodRecord> records = moodRecordRepository.findByUserIdAndCheckinDateBetween(
                userId, startDate, LocalDate.now());

        // 转换为响应格式
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

    /**
     * 获取近 7 天心情图表数据
     *
     * @HTTP GET /api/v1/mood/chart/{userId}
     * @param userId 用户 ID
     * @return 柱状图数据
     */
    @GetMapping("/chart/{userId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMoodChart(@PathVariable String userId) {
        // 校验权限
        String currentUserId = getCurrentUserId();
        if (!currentUserId.equals(userId)) {
            return ResponseEntity.ok(ApiResponse.forbidden("无权查看他人心情图表"));
        }

        // 查询近 7 天心情记录
        LocalDate startDate = LocalDate.now().minusDays(6);
        List<MoodRecord> records = moodRecordRepository.findByUserIdAndCheckinDateBetween(
                userId, startDate, LocalDate.now());

        // 组装图表数据
        List<Map<String, Object>> chartData = records.stream()
                .map(r -> {
                    Map<String, Object> item = new java.util.HashMap<>();
                    item.put("date", r.getCheckinDate().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")));
                    item.put("value", r.getMoodLevel());
                    return item;
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success(Map.of(
            "user_id", userId,
            "chart_type", "bar",
            "data", chartData
        )));
    }

    /**
     * 从 Spring Security 上下文获取当前登录用户 ID
     *
     * @return 当前登录用户 ID
     */
    private String getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getPrincipal().toString() : null;
    }
}
