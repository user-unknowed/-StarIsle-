package com.starisle.service;

import com.starisle.utils.KeywordManager;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.Collection;
import java.util.List;
import java.util.Locale;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 风险等级废除测试
 * 断言风险检测链路仅输出布尔危机信号，不再产生绿/黄/橙/红等任何等级。
 */
class RiskGradingRemovalTest {

    /** 待测服务，直接使用真实的关键词管理器与语义分析器 */
    private final RiskDetectionService riskDetectionService =
            new RiskDetectionService(new KeywordManager(), new SemanticAnalyzer());

    /**
     * 断言检测结果类型中不存在等级字段与等级 getter
     */
    @Test
    @DisplayName("检测结果不存在任何风险等级字段")
    void testResultTypesHaveNoGradingFields() {
        assertNoGradingMembers(RiskDetectionService.RiskDetectionResult.class);
        assertNoGradingMembers(RiskDetectionService.RiskDetectionDetails.class);
        assertNoGradingMembers(RiskDetectionService.KeywordDetectionResult.class);
        assertNoGradingMembers(SemanticAnalyzer.SemanticAnalysisResult.class);
        assertNoGradingMembers(KeywordManager.KeywordResult.class);

        Method detectRisk = assertDoesNotThrow(
                () -> RiskDetectionService.class.getMethod("detectRisk", String.class, String.class));
        assertEquals(RiskDetectionService.RiskDetectionResult.class, detectRisk.getReturnType(),
                "detectRisk 不应再返回等级字符串");
        assertNotEquals(String.class, detectRisk.getReturnType());

        assertTrue(hasField(RiskDetectionService.RiskDetectionResult.class, "crisis"),
                "检测结果应包含布尔危机信号");
        assertTrue(hasField(RiskDetectionService.RiskDetectionResult.class, "triggeredKeywords"));
        assertTrue(hasField(RiskDetectionService.RiskDetectionResult.class, "intent"));
        assertTrue(hasField(RiskDetectionService.RiskDetectionResult.class, "source"));
    }

    /**
     * 断言任意非危机文本返回一致的、无等级的检测结果
     */
    @Test
    @DisplayName("非危机文本返回一致的布尔结果")
    void testNonCrisisTextsReturnIdenticalSignal() {
        RiskDetectionService.RiskDetectionResult tired =
                riskDetectionService.detectRisk("user-tired", "今天有点累");
        RiskDetectionService.RiskDetectionResult chatting =
                riskDetectionService.detectRisk("user-chat", "普通聊天");

        assertFalse(tired.isCrisis(), "非危机文本不应产生危机信号");
        assertFalse(chatting.isCrisis(), "非危机文本不应产生危机信号");

        assertEquals(tired.isCrisis(), chatting.isCrisis());
        assertEquals(tired.getSource(), chatting.getSource());
        assertEquals(tired.getTriggeredKeywords(), chatting.getTriggeredKeywords());
        assertEquals("none", tired.getSource());
        assertTrue(tired.getTriggeredKeywords().isEmpty());
        assertTrue(chatting.getTriggeredKeywords().isEmpty());

        assertNoGradingStrings(tired);
        assertNoGradingStrings(chatting);
    }

    /**
     * 断言危机文本仅体现 crisis=true，不产生任何颜色或等级字符串
     */
    @Test
    @DisplayName("危机文本只体现布尔危机信号")
    void testCrisisTextOnlyExposesBooleanSignal() {
        RiskDetectionService.RiskDetectionResult keywordCrisis =
                riskDetectionService.detectRisk("user-keyword", "我不想活着了");
        RiskDetectionService.RiskDetectionResult semanticCrisis =
                riskDetectionService.detectRisk("user-semantic", "我想结束自己的生命");

        assertTrue(keywordCrisis.isCrisis(), "危机文本应产生危机信号");
        assertTrue(semanticCrisis.isCrisis(), "危机文本应产生危机信号");
        assertEquals("keyword", keywordCrisis.getSource());
        assertEquals("self_harm", keywordCrisis.getIntent());
        assertEquals("semantic", semanticCrisis.getSource());
        assertEquals("self_harm", semanticCrisis.getIntent());
        assertTrue(keywordCrisis.getTriggeredKeywords().stream()
                .anyMatch(keyword -> keyword.contains("不想活")));

        assertNoGradingStrings(keywordCrisis);
        assertNoGradingStrings(semanticCrisis);
    }

    /**
     * 断言类型上不存在 riskLevel/level 字段及对应 getter
     *
     * @param type 待检查类型
     */
    private void assertNoGradingMembers(Class<?> type) {
        for (Field field : type.getDeclaredFields()) {
            String name = field.getName().toLowerCase(Locale.ROOT);
            assertFalse(name.contains("risklevel"), type.getSimpleName() + " 不应包含 riskLevel 字段");
            assertFalse(name.equals("level") || name.endsWith("level"),
                    type.getSimpleName() + " 不应包含 level 字段");
        }

        for (Method method : type.getDeclaredMethods()) {
            String name = method.getName().toLowerCase(Locale.ROOT);
            assertFalse(name.contains("risklevel"), type.getSimpleName() + " 不应包含风险等级 getter");
            assertFalse(name.equals("getlevel") || name.equals("setlevel")
                            || name.endsWith("getlevel") || name.endsWith("setlevel"),
                    type.getSimpleName() + " 不应包含等级 getter/setter");
        }
    }

    /**
     * 判断类型是否声明指定字段
     *
     * @param type      待检查类型
     * @param fieldName 字段名
     * @return 是否存在该字段
     */
    private boolean hasField(Class<?> type, String fieldName) {
        for (Field field : type.getDeclaredFields()) {
            if (fieldName.equals(field.getName())) {
                return true;
            }
        }
        return false;
    }

    /**
     * 断言结果对象中不存在颜色或等级字符串
     *
     * @param result 检测结果对象
     */
    private void assertNoGradingStrings(Object result) {
        List<String> gradingTokens = List.of("green", "yellow", "orange", "red", "high", "medium", "low");

        for (Field field : result.getClass().getDeclaredFields()) {
            field.setAccessible(true);
            Object value = assertDoesNotThrow(() -> field.get(result));

            if (value instanceof String stringValue) {
                assertFalse(gradingTokens.contains(stringValue.toLowerCase(Locale.ROOT)),
                        "结果字段 " + field.getName() + " 不应出现等级值：" + stringValue);
            } else if (value instanceof Collection<?> collection) {
                for (Object element : collection) {
                    if (element instanceof String stringElement) {
                        assertFalse(gradingTokens.contains(stringElement.toLowerCase(Locale.ROOT)),
                                "结果集合字段 " + field.getName() + " 不应出现等级值：" + stringElement);
                    }
                }
            }
        }
    }
}
