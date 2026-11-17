# 小星 SFT 微调训练报告

> 生成时间：2026-11-16 ｜ 数据来源：本机训练日志 `output.log` ｜ 结论仅依据真实日志，无仿真数据

## 1. 概览

| 项 | 值 |
|---|---|
| 基座模型 | Qwen2.5-1.5B-Instruct（本地 `.starisle-train/models/Qwen2.5-1.5B-Instruct`） |
| 微调方式 | LoRA（r=16, alpha=32, dropout=0.05） |
| 目标模块 | q_proj / k_proj / v_proj / o_proj / gate_proj / up_proj / down_proj |
| 训练步数 | 216 / 216（2 epoch，108 步/epoch） |
| 训练状态 | ✅ 完成（`training_summary.json`：`completed=true`，`completed_at=21:03:32`） |
| 最终权重 | ✅ `final_model/model.safetensors` 2.87GB 已合并落盘 |
| 训练耗时 | 1 小时 32 分（train_runtime 5525s） |
| 整体指标 | train_loss **0.4903**（全量平均）｜eval_loss **0.0335**｜perplexity **1.034** |

## 2. 训练配置

| 参数 | 值 |
|---|---|
| 训练样本 / 评估样本 | 1740 / 92（总计 1832 条） |
| batch size | 1（gradient accumulation 16，全局 batch 16） |
| 学习率 | 1e-4（cosine 衰减至 4.88e-7） |
| epoch | 2 |
| max_seq_len | 1024 |
| 精度 | bfloat16 + fp16 AMP |
| gradient checkpointing | 开启（use_reentrant=False） |
| 可训练参数 | 18,464,768 / 1,562,179,072（1.18%） |
| 硬件 | RTX 5060 Laptop 8GB，torch 2.8.0+cu128，CUDA 12.8 |

## 3. 损失曲线（真实日志摘录）

| 阶段 | 值 |
|---|---|
| 首个 step loss（epoch 0.05） | **3.7736** |
| epoch 0.18 | 1.7410 |
| epoch 0.28 | 1.1415 |
| epoch 0.74 | 0.2645 |
| epoch 0.99（第 1 轮 eval） | eval_loss **0.0742** |
| epoch 1.33 | 0.0420 |
| epoch 1.75 | 0.0319 |
| epoch 1.98 | 0.0316 |
| epoch 1.99（第 2 轮 eval） | eval_loss **0.0335** |

结论：首步 3.77 → 末段约 0.032，loss 稳定单调下降；两轮 eval_loss 从 0.0742 降到 0.0335，无回升或发散，训练有效。

> 说明：第 1 轮 eval（0.0742）略高于第 2 轮末段训练损失，属正常现象（eval 样本未参与梯度更新）；第 2 轮 eval 已降至 0.0335，与训练损失接近，未见明显过拟合迹象。

## 4. 产物清单

| 路径 | 状态 |
|---|---|
| `models/sft_xiaoxing_v1/checkpoint-108/` | ✅ 第 1 轮 checkpoint（adapter） |
| `models/sft_xiaoxing_v1/checkpoint-216/` | ✅ 第 2 轮 checkpoint（adapter） |
| `models/sft_xiaoxing_v1/final_model/config.json` | ✅ 已更新（20:55:02） |
| `models/sft_xiaoxing_v1/final_model/model.safetensors` | ✅ 3,087,467,144 字节（2.87GB），21:03:32 写入 |
| `models/sft_xiaoxing_v1/checkpoint-216/adapter_model.safetensors` | ✅ 73.9MB |
| `models/sft_xiaoxing_v1/training_summary.json` | ✅ 已重写为全量结果（`completed=true`、`eval_loss=0.0335`、`completed_at=21:03:32`） |

## 5. 验收结论

- ✅ 训练完整跑完 216 步，非中断、非仿真（无 `simulated` 字段，`mode=lora`）
- ✅ loss 真实下降：首步 3.7736 → 末步 0.0316；全程平均 train_loss 0.4903
- ✅ eval_loss 0.0742（第 1 轮）→ 0.0335（第 2 轮），perplexity 1.034
- ✅ 两个 epoch 的 checkpoint 与合并后的 `final_model` 全部落盘
- ✅ `training_summary.json` 已刷新为全量真实结果

## 6. 后续步骤

1. 启动 ai-engine，`POST http://localhost:8000/chat` 验证回复连贯、`model` 指向本地模型
2. 启动 Java 后端，`POST /api/v1/chat/message` 验证 `response` 正文与 `responseTimeMs` 正常返回
3. 确认 `.gitignore` 已排除模型权重与训练环境
