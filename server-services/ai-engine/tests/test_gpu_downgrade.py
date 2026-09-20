"""
test_gpu_downgrade.py - 显存估算与训练模式降级链单元测试

所属模块：ai-engine/tests
功能简述：
    纯函数 UT，不依赖真实 GPU 即可验证 SFT 微调的显存估算与自动降级链：
      1. 1.8B 参数 fp16 估算结果落在合理区间（10~60 GB）
      2. 给定不同可用显存（48/24/12/2/0.1）时，decide_training_mode 应依次降级
         （FULL → LORA / CPU_OFFLOAD → SIMULATION），最小显存场景必须为 SIMULATION。
测试对象：scripts.sft_full_finetune 的 estimate_required_gpu_gb、decide_training_mode
"""
from scripts.sft_full_finetune import (
    estimate_required_gpu_gb, decide_training_mode, TrainingMode,
)


def test_1_8b_fp16_estimate_reasonable():
    """1.8B fp16 模型 + batch4 + seq2048 的显存估算应在 10~60 GB 合理区间内。"""
    g = estimate_required_gpu_gb(1.8e9, "fp16", batch=4, seq_len=2048)
    assert 10 < g < 60, f"unrealistic {g}"


def test_decide_chain():
    """遍历不同可用显存，验证降级链：最小显存必为 SIMULATION，且至少出现 LORA 或 CPU_OFFLOAD。"""
    labels = []
    # 48GB→FULL，24GB→LORA，12GB→CPU_OFFLOAD，2GB/0.1GB→SIMULATION
    for avail in (48, 24, 12, 2, 0.1):
        m = decide_training_mode(params=1.8e9, available_gpu_gb=avail)
        labels.append(m.value)
    # 最小显存一定是 SIMULATION
    assert labels[-1] == TrainingMode.SIMULATION.value
    # 中间档至少出现 LORA 或 CPU_OFFLOAD
    assert TrainingMode.LORA.value in labels or TrainingMode.CPU_OFFLOAD.value in labels
