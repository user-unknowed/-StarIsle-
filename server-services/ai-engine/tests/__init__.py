"""
tests - AI 引擎单元测试包

所属模块：ai-engine/tests
功能简述：
    汇集 AI 引擎各模块的单元测试，覆盖：
    - BaseSkill 抽象基类契约（test_base_skill）
    - SkillRouter 路由与降级（test_skill_router）
    - SFT 数据集构造（test_build_sft_dataset）
    - 显存估算与训练降级链（test_gpu_downgrade）
    - Fork 仓库三层整合（test_integrate_forks）
    - Fork 仓库发现与 manifest（test_discover_forks）
    - 评估器规则指标与场景集合（test_evaluate_safety）
"""
