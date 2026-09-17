"""
skills 包 - Fork Skills 技能集合

所属模块：ai-engine/app/skills
功能简述：
    该包聚合了所有包装 GitHub Fork 项目为小星可调度能力的技能适配器，
    由 main._autodiscover_skills 在应用启动时自动扫描以 _adapter 或 _skill
    结尾的模块并实例化，随后注入 SkillRouter 供对话服务调用。
"""
