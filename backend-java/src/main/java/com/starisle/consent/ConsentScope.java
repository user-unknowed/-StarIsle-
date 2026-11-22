package com.starisle.consent;

import java.util.Arrays;
import java.util.Optional;

/**
 * 个人数据同意范围
 * 每个枚举值对应一类需要本人显式授权后才能访问或写入的个人数据。
 */
public enum ConsentScope {

    /** 对话记忆与对话历史 */
    CHAT_MEMORY("对话记忆与对话历史", "保存并读取你与小星的聊天内容，用于连续对话"),
    /** 心情记录 */
    MOOD("心情记录", "保存并查询你的心情打卡、标签与趋势"),
    /** 心理测评结果 */
    ASSESSMENT("心理测评结果", "保存并回看你的测评得分与建议"),
    /** 监护人查看心情与风险 */
    GUARDIAN_MOOD_VIEW("监护人查看心情与风险", "允许已绑定的监护人查看你的心情与风险摘要");

    /** 中文名称 */
    private final String displayName;
    /** 用途说明 */
    private final String purpose;

    ConsentScope(String displayName, String purpose) {
        this.displayName = displayName;
        this.purpose = purpose;
    }

    /**
     * 获取中文名称
     *
     * @return 中文名称
     */
    public String getDisplayName() {
        return displayName;
    }

    /**
     * 获取用途说明
     *
     * @return 用途说明
     */
    public String getPurpose() {
        return purpose;
    }

    /**
     * 将外部传入的范围字符串解析为枚举
     *
     * @param raw 范围字符串（忽略大小写）
     * @return 匹配的枚举，非法时为空
     */
    public static Optional<ConsentScope> from(String raw) {
        if (raw == null || raw.isBlank()) {
            return Optional.empty();
        }
        String normalized = raw.trim().toUpperCase();
        return Arrays.stream(values())
                .filter(scope -> scope.name().equals(normalized))
                .findFirst();
    }
}
