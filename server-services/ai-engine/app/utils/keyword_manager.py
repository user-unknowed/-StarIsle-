class KeywordManager:
    """
    关键词管理器 - 管理风险检测关键词库
    """
    
    def __init__(self):
        # 加载关键词库
        self.keywords = self._load_keywords()
    
    def _load_keywords(self) -> dict:
        """
        加载关键词库
        """
        return {
            "high_risk": {
                "自杀意念": ["自杀", "想死", "不想活", "活着没意义", "没意义"],
                "自伤行为": ["自残", "割腕", "跳楼", "伤害自己", "割自己"],
                "绝望感": ["绝望", "没希望", "看不到未来", "没有未来"]
            },
            "medium_risk": {
                "抑郁情绪": ["抑郁", "情绪低落", "心情不好", "很丧"],
                "焦虑症状": ["焦虑", "紧张", "担心", "慌", "不安"],
                "睡眠问题": ["失眠", "睡不着", "睡不着觉", "整夜睡不着"],
                "社交困扰": ["孤独", "被孤立", "没人理解", "没朋友"]
            },
            "low_risk": {
                "学业压力": ["压力大", "喘不过气", "学习压力", "考试压力"],
                "人际关系": ["和朋友吵架", "被朋友孤立", "人际问题"],
                "家庭矛盾": ["和父母吵架", "家庭矛盾", "爸妈不理解"]
            }
        }
    
    def check_keywords(self, content: str) -> dict:
        """
        检查关键词
        
        Returns:
            {
                "risk_level": "high" / "medium" / "low",
                "matched_keywords": [],
                "categories": []
            }
        """
        matched_keywords = []
        risk_level = "low"
        categories = []
        
        # 检查高风险关键词
        for category, keywords in self.keywords["high_risk"].items():
            for keyword in keywords:
                if keyword in content:
                    matched_keywords.append(keyword)
                    categories.append(category)
                    risk_level = "high"
        
        # 如果没有高风险，检查中风险
        if risk_level == "low":
            for category, keywords in self.keywords["medium_risk"].items():
                for keyword in keywords:
                    if keyword in content:
                        matched_keywords.append(keyword)
                        categories.append(category)
                        risk_level = "medium"
        
        # 如果没有中风险，检查低风险
        if risk_level == "low":
            for category, keywords in self.keywords["low_risk"].items():
                for keyword in keywords:
                    if keyword in content:
                        matched_keywords.append(keyword)
                        categories.append(category)
        
        return {
            "risk_level": risk_level,
            "matched_keywords": matched_keywords,
            "categories": categories
        }
    
    def update_keywords(self, category: str, keywords: list):
        """
        更新关键词库
        """
        # TODO: 实现关键词库更新逻辑
        pass