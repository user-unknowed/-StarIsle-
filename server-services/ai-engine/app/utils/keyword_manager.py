"""
keyword_manager.py - 危机检测关键词管理器

所属模块：ai-engine/app/utils
功能简述：
    维护危机检测所用的关键词库，提供内容扫描与二值危机判定能力，
    供危机检测服务的 L1 关键词检测层调用。
"""


class KeywordManager:
    """
    关键词管理器 - 管理危机检测关键词库

    持有按类别组织的中文关键词字典，通过 check_keywords 对用户内容
    进行扫描并返回是否命中高危关键词、命中关键词与类别。
    """

    # 命中这些类别即视为高危危机信号
    CRISIS_CATEGORIES = ("自杀意念", "自伤行为", "绝望感")

    def __init__(self):
        # 加载关键词库
        self.keywords = self._load_keywords()

    def _load_keywords(self) -> dict:
        """
        加载并返回按类别组织的关键词库。

        Returns:
            dict: 类别 -> 关键词列表
        """
        return {
            "自杀意念": ["自杀", "想死", "不想活", "活着没意义", "没意义"],
            "自伤行为": ["自残", "割腕", "跳楼", "伤害自己", "割自己"],
            "绝望感": ["绝望", "没希望", "看不到未来", "没有未来"],
            "抑郁情绪": ["抑郁", "情绪低落", "心情不好", "很丧"],
            "焦虑症状": ["焦虑", "紧张", "担心", "慌", "不安"],
            "睡眠问题": ["失眠", "睡不着", "睡不着觉", "整夜睡不着"],
            "社交困扰": ["孤独", "被孤立", "没人理解", "没朋友"],
            "学业压力": ["压力大", "喘不过气", "学习压力", "考试压力"],
            "人际关系": ["和朋友吵架", "被朋友孤立", "人际问题"],
            "家庭矛盾": ["和父母吵架", "家庭矛盾", "爸妈不理解"],
        }

    def check_keywords(self, content: str) -> dict:
        """
        检查内容中的危机关键词。

        Args:
            content: 待检查的用户文本内容

        Returns:
            {
                "high_risk": True / False,
                "matched_keywords": [],
                "categories": []
            }
        """
        matched_keywords = []
        categories = []

        for category, keywords in self.keywords.items():
            for keyword in keywords:
                if keyword in content:
                    matched_keywords.append(keyword)
                    if category not in categories:
                        categories.append(category)

        high_risk = any(category in self.CRISIS_CATEGORIES for category in categories)

        return {
            "high_risk": high_risk,
            "matched_keywords": matched_keywords,
            "categories": categories
        }

    def update_keywords(self, category: str, keywords: list):
        """
        更新关键词库（预留接口）。

        Args:
            category: 关键词所属类别
            keywords: 待新增/更新的关键词列表
        """
        # TODO: 实现关键词库更新逻辑
        pass
