"""
import_knowledge.py - 心理咨询技术知识库导入脚本

所属模块：ai-engine/scripts
功能简述：
    将 data/knowledge_base.json 中的心理咨询技术知识导入系统，支持 MongoDB 存储和内存缓存两种模式。
    导入后执行搜索功能与 RAG 增强测试，验证知识库可用性。
依赖关系：
    - app.services.knowledge_service：知识库服务
    - app.models.knowledge：知识文档数据模型
"""
import os
import sys
import json
import asyncio

# 添加项目路径，便于直接以脚本方式运行时导入 app 包
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.knowledge_service import KnowledgeService
from app.models.knowledge import KnowledgeDocument


async def import_knowledge():
    """
    导入知识库数据并执行搜索与 RAG 测试。

    流程：加载数据文件 → 解析为 KnowledgeDocument → 批量导入 → 统计验证 → 搜索/RAG 测试。

    Returns:
        bool: 导入成功返回 True，否则返回 False
    """
    print("=" * 60)
    print("【知识库导入工具】心理咨询技术知识库导入")
    print("=" * 60)

    # 初始化知识库服务
    knowledge_service = KnowledgeService()

    # 获取知识库数据路径
    knowledge_file = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "data",
        "knowledge_base.json"
    )

    if not os.path.exists(knowledge_file):
        print(f"[ERROR] 知识库文件不存在: {knowledge_file}")
        return False

    # 加载知识库数据
    print(f"\n[1] 加载知识库数据文件...")
    with open(knowledge_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"    发现 {len(data)} 条知识条目")

    # 转换为 KnowledgeDocument 对象
    print(f"\n[2] 解析知识条目...")
    documents = []
    categories = {}

    for item in data:
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

        # 统计分类
        cat = doc.category
        if cat not in categories:
            categories[cat] = 0
        categories[cat] += 1

    print(f"    解析完成，共 {len(documents)} 份知识文档")
    print(f"    分类统计：")
    for cat, count in sorted(categories.items()):
        print(f"      - {cat}: {count} 条")

    # 导入知识库
    print(f"\n[3] 导入知识库...")
    try:
        ids = await knowledge_service.bulk_add_documents(documents)
        print(f"    成功导入 {len(ids)} 条知识")
    except Exception as e:
        print(f"    导入失败: {e}")
        return False

    # 验证知识库
    print(f"\n[4] 验证知识库...")

    # 统计信息
    stats = await knowledge_service.get_stats()
    print(f"    知识库状态: {stats.get('mode', 'unknown')}")
    print(f"    文档总数: {stats.get('total_documents', 0)}")

    # 测试搜索
    test_queries = [
        "如何帮助情绪低落的来访者",
        "焦虑症的认知行为疗法",
        "青少年自杀风险评估",
        "创伤知情护理",
        "依恋关系修复",
        "沙盘游戏治疗"
    ]

    print(f"\n[5] 搜索功能测试...")
    for query in test_queries:
        results = await knowledge_service.search_knowledge(query, top_k=2)
        print(f"\n    搜索: '{query}'")
        for r in results:
            print(f"      命中: [{r.document.category}] {r.document.title}")
            print(f"      相关度: {r.relevance_score:.2f}")
            if r.matched_keywords:
                print(f"      匹配词: {', '.join(r.matched_keywords[:5])}")

    # 测试聊天RAG增强
    print(f"\n[6] RAG增强测试...")
    test_messages = [
        "我最近心情不好，总是觉得自己没用",
        "考试压力很大，经常失眠",
        "我想知道怎么帮助一个想自杀的朋友"
    ]

    for message in test_messages:
        context = await knowledge_service.get_relevant_knowledge_for_chat(message)
        print(f"\n    用户消息: '{message}'")
        if context:
            print(f"    检索到相关知识（{len(context)}字符）")
        else:
            print(f"    未检索到相关知识")

    print(f"\n{'=' * 60}")
    print("【导入完成】心理咨询技术知识库已就绪")
    print(f"{'=' * 60}")
    print(f"\n提示：知识库已加载，AI引擎在对话时可自动检索相关知识。")
    print(f"      知识来源基于ima知识库中的26本心理学经典书籍。")
    print(f"      AI将在回答中融合循证的心理咨询技术，但不会进行模型训练。")

    return True


if __name__ == "__main__":
    asyncio.run(import_knowledge())
