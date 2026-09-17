"""
import_supervision_knowledge.py - 儿少心理咨询督导知识库导入脚本

所属模块：ai-engine/scripts
功能简述：
    将儿童青少年心理咨询督导教学（B 站 BV1LG9wBhEMP）提炼的 4 个督导技能包
    结构化为知识条目，导入 KnowledgeService，供对话时作为 RAG 上下文增强，
    与 supervision_case_skill 的技能注入形成互补。

    技能包来源：
      A. 父母观察法（卢林督导精华）
      B. 循环发展督导五步（萧文）
      C. 结构性概念化四维评估（岳晓东）
      D. 家庭系统视角（杜亚松）

依赖关系：
    - app.services.knowledge_service.KnowledgeService：知识库服务
    - app.models.knowledge.KnowledgeDocument：知识文档数据模型
用法：
    python scripts/import_supervision_knowledge.py --dry-run   # 预览待导入条目
    python scripts/import_supervision_knowledge.py --apply     # 实际写入知识库
"""
import os
import sys
import asyncio
import argparse

# 添加项目路径，便于直接以脚本方式运行时导入 app 包
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 注意：KnowledgeService/KnowledgeDocument 延迟到 apply 分支导入，
# 使 --dry-run 预览不依赖 pydantic 等运行时依赖，可独立运行。


# 督导知识条目：4 个技能包结构化为 RAG 可检索的知识文档
SUPERVISION_ENTRIES = [
    {
        "title": "父母观察法",
        "source": "internal/supervision-teaching",
        "author": "卢林",
        "category": "supervision",
        "tags": ["父母观察", "看见孩子", "亲子错位", "不上学", "不出门", "关在家里", "不理解孩子"],
        "content": (
            "父母观察法（卢林督导精华）：核心动作是不批评、不教育、不干扰。"
            "父母每周观察孩子一小时并记录片段，咨询师督导父母理解孩子"
            "\"话里的话\"。识别信号：亲子错位（孩子怎么说 vs 父母怎么接/误解/错过）；"
            "孩子\"关在家里\"=给父母机会而非拒绝世界。"
            "干预取向：帮助父母重新看见孩子，而非急于改变孩子。"
        ),
        "techniques": ["父母观察记录", "亲子错位识别", "话里的话解读"],
        "applicable_issues": ["不上学", "不出门", "亲子冲突", "父母不理解孩子"]
    },
    {
        "title": "循环发展督导五步",
        "source": "internal/supervision-teaching",
        "author": "萧文",
        "category": "supervision",
        "tags": ["督导", "概念化", "策略检核", "咨询计划", "专业发展"],
        "content": (
            "循环发展督导五步（萧文）：①了解咨询师对来访者的解读与感受 → "
            "②了解已用策略与技巧 → ③核验假设与理论基础 → "
            "④再检核技巧策略适当性 → ⑤重新整理咨询计划与目标。"
            "强调督导是一个循环发展的过程，而非一次性评判，"
            "通过五步循环帮助咨询师提升专业能力与个案概念化质量。"
        ),
        "techniques": ["循环发展督导", "策略检核", "咨询计划重整"],
        "applicable_issues": ["咨询师专业发展", "个案概念化", "策略适当性检核"]
    },
    {
        "title": "结构性概念化四维评估",
        "source": "internal/supervision-teaching",
        "author": "岳晓东",
        "category": "supervision",
        "tags": ["厌学", "概念化", "防御", "逃避", "否认", "退缩", "完美主义", "自我认同"],
        "content": (
            "结构性概念化四维评估（岳晓东）：从四个维度系统评估来访者。"
            "行为层面：请假、逃避、暴食等行为表现。"
            "情绪层面：焦虑、自责、无助等情绪体验。"
            "认知层面：\"考砸就完了\"等非理性信念。"
            "家庭系统：纠缠依附、控制欲、被冷落等互动模式。"
            "防御链条识别：\"逃避—否认—退缩\"循环。"
            "核心话术：\"我们不是要改变来访者的意愿，而是要看见他们背后的无力\"；"
            "\"你不是不行，而是你不敢说自己行\"。"
        ),
        "techniques": ["四维概念化", "防御链条识别", "非理性信念挑战"],
        "applicable_issues": ["厌学", "完美主义", "自我认同困惑", "防御机制"]
    },
    {
        "title": "家庭系统视角",
        "source": "internal/supervision-teaching",
        "author": "杜亚松",
        "category": "supervision",
        "tags": ["家庭", "亲子", "高控制", "缺乏回应", "家庭系统", "谁的错", "脱落"],
        "content": (
            "家庭系统视角（杜亚松）：两类家庭模式——\"缺乏回应\" vs \"高控制\"。"
            "系统信号映射：进食障碍=难以言说的情绪表达；"
            "厌学=家庭关系失衡的外在映射；问题行为=家庭报警器。"
            "干预取向：从\"追究谁的错\"转向\"探索可能改变的路径\"；"
            "中立立场；聚焦\"现在\"而非\"过去\"；尊重脱落与节律。"
            "不评判家庭，而是帮助家庭看见互动模式并寻找改变路径。"
        ),
        "techniques": ["家庭系统评估", "模式识别", "中立立场干预"],
        "applicable_issues": ["家庭冲突", "厌学", "进食障碍", "亲子关系失衡"]
    }
]


async def import_supervision(apply: bool = False):
    """
    导入督导知识条目到知识库。

    流程：解析条目 → 预览/写入 → 统计验证。

    Args:
        apply: True 时实际写入知识库，False 时仅预览（dry-run）

    Returns:
        bool: 导入成功返回 True，否则 False
    """
    print("=" * 60)
    print("【督导知识导入】儿少心理咨询督导教学知识包")
    print("=" * 60)

    # 解析知识条目为 KnowledgeDocument 对象（apply 模式才需要）
    documents = []
    if apply:
        from app.models.knowledge import KnowledgeDocument
        for item in SUPERVISION_ENTRIES:
            doc = KnowledgeDocument(
                title=item.get("title", ""),
                source=item.get("source", ""),
                author=item.get("author"),
                category=item.get("category", ""),
                tags=item.get("tags", []),
                content=item.get("content", ""),
                techniques=item.get("techniques", []),
                applicable_issues=item.get("applicable_issues", [])
            )
            documents.append(doc)

    print(f"\n[1] 解析完成，共 {len(SUPERVISION_ENTRIES)} 条督导知识条目：")
    for item in SUPERVISION_ENTRIES:
        print(f"    - [{item.get('category')}] {item.get('title')}"
              f"（作者: {item.get('author')}，标签: {len(item.get('tags', []))} 个）")

    # dry-run 模式：仅预览，不写入
    if not apply:
        print(f"\n[dry-run] 预览模式，未写入知识库。使用 --apply 实际导入。")
        return True

    # apply 模式：实际写入知识库
    from app.services.knowledge_service import KnowledgeService
    knowledge_service = KnowledgeService()
    print(f"\n[2] 写入知识库...")
    try:
        ids = await knowledge_service.bulk_add_documents(documents)
        print(f"    成功导入 {len(ids)} 条督导知识")
    except Exception as e:
        print(f"    导入失败: {e}")
        return False

    # 验证：查询统计
    print(f"\n[3] 验证知识库...")
    stats = await knowledge_service.get_stats()
    print(f"    知识库模式: {stats.get('mode', 'unknown')}")
    print(f"    文档总数: {stats.get('total_documents', 0)}")

    # 验证：搜索测试
    print(f"\n[4] 搜索测试...")
    test_queries = ["父母观察", "督导五步", "厌学概念化", "家庭系统"]
    for q in test_queries:
        results = await knowledge_service.search_knowledge(q, top_k=1)
        print(f"    搜索 '{q}': 命中 {len(results)} 条")
        for r in results:
            print(f"      - [{r.document.category}] {r.document.title}")

    print(f"\n{'=' * 60}")
    print("【导入完成】儿少心理咨询督导知识已就绪")
    print(f"{'=' * 60}")
    return True


if __name__ == "__main__":
    # argparse 支持 --dry-run（默认）与 --apply 两种模式
    parser = argparse.ArgumentParser(description="儿少心理咨询督导知识库导入脚本")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--dry-run", action="store_true", default=True,
                      help="仅预览待导入条目，不写入知识库（默认）")
    mode.add_argument("--apply", action="store_true",
                      help="实际写入知识库")
    args = parser.parse_args()
    asyncio.run(import_supervision(apply=args.apply))
