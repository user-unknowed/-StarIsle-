"""纯函数 UT 显存估算与降级链（不需真实GPU）"""
from scripts.sft_full_finetune import (
    estimate_required_gpu_gb, decide_training_mode, TrainingMode,
)

def test_1_8b_fp16_estimate_reasonable():
    g = estimate_required_gpu_gb(1.8e9, "fp16", batch=4, seq_len=2048)
    assert 10 < g < 60, f"unrealistic {g}"

def test_decide_chain():
    labels = []
    for avail in (48, 24, 12, 2, 0.1):
        m = decide_training_mode(params=1.8e9, available_gpu_gb=avail)
        labels.append(m.value)
    # 最小显存一定是 SIMULATION
    assert labels[-1] == TrainingMode.SIMULATION.value
    assert TrainingMode.LORA.value in labels or TrainingMode.CPU_OFFLOAD.value in labels
