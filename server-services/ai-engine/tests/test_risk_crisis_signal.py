"""
test_risk_crisis_signal.py - 二值危机信号检测单元测试

所属模块：ai-engine/tests
功能简述：
    验证运行时风险制度改为无等级的二值危机信号（crisis / need_intervention）：
      1. 非危机文本（有点累/今天一般/普通聊天）检测结构完全一致且 crisis=False，
         不出现任何等级/颜色值
      2. 危机文本仅 crisis=True
      3. /risk/check API 响应不含 risk_level 键
测试对象：app.services.risk_detection_service.RiskDetectionService、
         app.models.semantic_analyzer.SemanticAnalyzer、
         app.utils.keyword_manager.KeywordManager、app.main
"""
import asyncio
import json

import pytest

from app.models.semantic_analyzer import SemanticAnalyzer
from app.services.risk_detection_service import RiskDetectionService
from app.utils.keyword_manager import KeywordManager

# 禁止出现在响应中的四级风险等级/颜色值
FORBIDDEN_VALUES = {"green", "yellow", "orange", "red", "high", "medium", "low"}
FORBIDDEN_KEYS = {"risk_level", "riskLevel", "level"}


def _collect(obj):
    """递归收集对象中的全部键与字符串/数字值。"""
    keys, values = set(), set()
    if isinstance(obj, dict):
        for k, v in obj.items():
            keys.add(k)
            nested_keys, nested_values = _collect(v)
            keys |= nested_keys
            values |= nested_values
    elif isinstance(obj, (list, tuple)):
        for item in obj:
            nested_keys, nested_values = _collect(item)
            keys |= nested_keys
            values |= nested_values
    else:
        values.add(obj)
    return keys, values


def _assert_no_levels(payload):
    """断言响应中没有任何等级/颜色键与值。"""
    keys, values = _collect(payload)
    assert not (keys & FORBIDDEN_KEYS), f"出现等级键: {keys & FORBIDDEN_KEYS}"
    assert not (values & FORBIDDEN_VALUES), f"出现等级/颜色值: {values & FORBIDDEN_VALUES}"


def _build_payload(text):
    """模拟 /risk/check 响应结构，便于比较结构与断言。"""
    service = RiskDetectionService()
    crisis = asyncio.run(service.detect_risk("test-user", text))
    details = asyncio.run(service.get_detection_details(text))
    return {
        "user_id": "test-user",
        "crisis": crisis,
        "need_intervention": crisis,
        "confidence": details.get("confidence", 0.0),
        "details": details,
    }


def test_non_crisis_texts_have_identical_structure():
    """非危机文本的检测结果结构完全一致，且 crisis=False、无等级值。"""
    texts = ["有点累", "今天一般", "普通聊天"]
    payloads = [_build_payload(t) for t in texts]

    top_keys = set(payloads[0].keys())
    detail_keys = set(payloads[0]["details"].keys())
    for payload in payloads:
        assert set(payload.keys()) == top_keys
        assert set(payload["details"].keys()) == detail_keys
        assert payload["crisis"] is False
        assert payload["need_intervention"] is False
        _assert_no_levels(payload)


def test_crisis_texts_only_set_crisis_true():
    """危机文本仅 crisis=True，need_intervention 同源为 True。"""
    for text in ["我想死", "我想自杀", "活着没意义"]:
        payload = _build_payload(text)
        assert payload["crisis"] is True
        assert payload["need_intervention"] is True
        assert payload["details"]["crisis"] is True
        assert "keyword" in payload["details"]["sources"]


def test_medium_emotion_words_do_not_trigger_crisis():
    """中危情绪词不再升级为危机。"""
    for text in ["我有点抑郁", "最近很焦虑", "压力好大", "失眠了"]:
        assert asyncio.run(RiskDetectionService().detect_risk("test-user", text)) is False


def test_semantic_analyzer_returns_crisis_boolean():
    """语义分析器输出 crisis 布尔值，不再输出 risk_level。"""
    result = asyncio.run(SemanticAnalyzer().analyze("我想死"))
    assert set(result.keys()) == {"crisis", "confidence", "intent", "intensity"}
    assert result["crisis"] is True
    assert result["intent"] == "self_harm"
    assert "risk_level" not in result


def test_keyword_manager_returns_high_risk_boolean():
    """关键词管理器输出 high_risk 布尔值，保留 matched keywords/categories。"""
    result = KeywordManager().check_keywords("我想自杀")
    assert set(result.keys()) == {"high_risk", "matched_keywords", "categories"}
    assert result["high_risk"] is True
    assert result["matched_keywords"]
    assert result["categories"]
    assert "risk_level" not in result

    safe = KeywordManager().check_keywords("有点累")
    assert safe["high_risk"] is False
    assert safe["matched_keywords"] == []


def test_risk_check_api_response_has_no_risk_level():
    """/risk/check API 响应（含 details）不含 risk_level 键与等级值。"""
    pytest.importorskip("fastapi")
    try:
        from fastapi.testclient import TestClient
        from app.main import ChatResponse, RiskDetectionResponse, app
    except Exception as exc:  # 依赖缺失时跳过，保留其余单测可执行
        pytest.skip(f"app.main 依赖不可用: {exc}")

    # 响应模型字段契约
    assert "risk_level" not in ChatResponse.model_fields
    assert {"crisis", "need_intervention"} <= set(ChatResponse.model_fields)
    assert "risk_level" not in RiskDetectionResponse.model_fields
    assert {"crisis", "need_intervention", "confidence", "details"} <= set(
        RiskDetectionResponse.model_fields
    )

    client = TestClient(app)
    for text in ["有点累", "今天一般", "普通聊天", "我想死"]:
        resp = client.post(
            "/risk/check",
            json={"user_id": "test-user", "content": text, "content_type": "chat"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "risk_level" not in body
        assert "risk_level" not in body["details"]
        _assert_no_levels(body)
        if text == "我想死":
            assert body["crisis"] is True
        else:
            assert body["crisis"] is False
