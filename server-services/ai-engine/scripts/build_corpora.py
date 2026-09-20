"""
build_corpora.py - 构建中文与英文心理健康语料库

所属模块：ai-engine/scripts
功能简述：
    1. 从 knowledge_base.json 提取中文心理学知识，生成 chinese_corpus.txt
    2. 从 combined_cleaned_text.txt 过滤英文行，补充 PRD 对齐句式，生成 english_corpus_augmented.txt
    3. 补充 PRD 对齐的青少年心理健康句式（心情打卡/AI对话/放松工具/风险检测/投射测评）
"""
import json
import re
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"

# ============================================================
# PRD 对齐的青少年心理健康中文补充语料
# 每组围绕核心词的共现关系设计，提升 Word2Vec 语义关联
# ============================================================
PRD_ALIGNED_CN = [
    # 心情打卡（5 档表情）— 心情/打卡/开心/平静/低落/焦虑/难过 共现
    "学生每天的心情打卡帮助记录情绪变化，开心平静低落焦虑难过都可以表达。",
    "今日心情打卡让青少年选择开心平静低落焦虑难过五种表情，追踪情绪状态。",
    "心情打卡记录开心平静低落焦虑难过，帮助教师识别异常情绪和风险学生。",
    "通过心情打卡数据可视化，班级状态展示学生心情趋势和预警人数。",
    "心情打卡功能让学生选择开心平静低落焦虑难过，记录每天的心情变化。",
    "教师通过心情打卡了解学生开心平静低落焦虑难过的情绪状态。",
    "心情打卡的五种表情包括开心平静低落焦虑难过，追踪青少年情绪趋势。",
    "学生心情打卡选择低落焦虑难过时，系统提示教师关注该学生风险。",
    "心情打卡数据统计显示近七天学生开心平静低落焦虑难过的变化趋势。",
    "今日心情是开心平静低落焦虑难过中的哪一种？心情打卡帮助学生记录。",
    # AI 对话 / CBT — 焦虑/抑郁/情绪/认知/信念 共现
    "AI对话基于认知行为疗法帮助青少年识别和调整负面情绪认知扭曲。",
    "星宝AI对话通过苏格拉底提问引导学生觉察不合理信念，缓解焦虑抑郁。",
    "AI对话检测到负面情绪时，引导青少年进行认知重构和情绪调节。",
    "聊一聊功能提供AI心理咨询对话，话题卡片引导学生表达内心感受。",
    "AI对话帮助青少年识别焦虑抑郁的负面认知扭曲，调整不合理信念。",
    "认知行为疗法通过AI对话引导学生觉察焦虑抑郁情绪，进行认知重构。",
    "星宝AI对话缓解青少年焦虑抑郁，通过苏格拉底提问调整不合理信念。",
    "AI对话检测负面情绪和焦虑抑郁，引导青少年认知重构和情绪调节。",
    "聊一聊AI对话话题卡片帮助青少年表达焦虑抑郁和内心情绪感受。",
    "认知行为疗法的AI对话帮助青少年识别不合理信念，缓解焦虑抑郁症状。",
    # 放松工具 — 放松/压力/焦虑/冥想/音乐/拼图 共现
    "放松工具包括拼图游戏冥想引导和音乐播放器，帮助青少年缓解压力焦虑。",
    "冥想引导通过正念呼吸练习帮助学生放松身心，减轻焦虑和压力症状。",
    "解压小游戏拼图帮助学生转移注意力，缓解学业压力和同伴关系困扰。",
    "音乐播放器提供舒缓音乐，帮助青少年调节情绪，减轻焦虑症状。",
    "放松工具的拼图游戏和冥想引导帮助青少年缓解学业压力和焦虑情绪。",
    "冥想引导的正念呼吸练习让学生放松身心，减轻焦虑压力和负面情绪。",
    "音乐播放器播放舒缓音乐帮助青少年放松，缓解压力焦虑和情绪困扰。",
    "放松工具帮助青少年缓解压力焦虑，包括拼图冥想和音乐三种放松方式。",
    "学业压力和同伴关系困扰可以通过放松工具的拼图冥想音乐来缓解焦虑。",
    "放松工具冥想引导音乐播放器拼图游戏，帮助青少年减轻压力焦虑症状。",
    # 风险检测 / 危机干预 — 风险/自杀/自伤/危机/检测/关键词/干预 共现
    "风险检测系统识别学生自伤自杀等危机关键词，触发紧急危机干预流程。",
    "当AI对话检测到自伤自杀风险关键词时立即启动安全引导和危机响应。",
    "危机干预包括紧急联系人通知、专业心理热线转介和安全陪伴。",
    "教师端班级状态页面显示风险预警学生，帮助及时发现自杀自伤风险。",
    "风险检测识别自伤自杀危机关键词，触发紧急危机干预和安全引导。",
    "AI对话检测到自杀自伤风险关键词时，立即启动危机干预和安全引导。",
    "危机干预流程包括紧急联系人通知和心理热线转介，应对自杀自伤风险。",
    "教师班级状态页面显示风险预警学生，及时发现自杀自伤危机。",
    "风险检测系统通过关键词识别自杀自伤危机，触发紧急干预和安全引导。",
    "当检测到自杀自伤关键词时，风险检测系统立即启动危机干预和紧急响应。",
    # 青少年心理发展 — 青少年/抑郁/焦虑/压力/情绪/认同/同伴 共现
    "青少年心理健康关注12到18岁初高中生的情绪发展和心理适应。",
    "青春期核心发展任务包括自我认同建立同伴关系深化和自主性发展。",
    "初高中生面临学业压力同伴关系困扰和自我认同危机，需要心理支持。",
    "学校心理健康教师通过班级情绪数据识别需要关注的学生群体。",
    "青少年心理健康关注初高中生抑郁焦虑情绪压力和自我认同发展。",
    "青春期自我认同建立和同伴关系深化，青少年面临学业压力和焦虑抑郁。",
    "初高中生同伴关系困扰和自我认同危机，需要情绪支持和心理压力缓解。",
    "学校心理健康教师通过班级情绪数据识别青少年抑郁焦虑和压力风险。",
    "青少年抑郁焦虑和学业压力需要情绪支持和同伴关系引导以及自我认同建立。",
    "12到18岁初高中生心理健康关注抑郁焦虑情绪压力同伴关系和自我认同。",
    # 投射测评（罗夏 + TAT）— 罗夏/TAT/投射/墨迹/图片/测评 共现
    "罗夏墨迹测验通过对称墨迹图片分析青少年的心理投射和情绪状态。",
    "TAT主题统觉测验通过图片场景引导青少年讲述故事，揭示内心冲突。",
    "投射测评结合罗夏墨迹和TAT图片，分析青少年潜意识内容和情绪困扰。",
    "心理测评小程序提供罗夏和TAT图片库，支持教师进行投射测评分析。",
    "罗夏墨迹测验和TAT主题统觉测验是投射测评的两种主要图片分析方法。",
    "罗夏墨迹图片通过对称墨迹分析青少年心理投射，TAT图片揭示内心冲突。",
    "投射测评使用罗夏墨迹和TAT图片，分析青少年潜意识内容和情绪状态。",
    "心理测评小程序的罗夏和TAT图片库支持投射测评和潜意识内容分析。",
    "罗夏墨迹测验通过图片对称墨迹分析投射心理，TAT通过场景图片揭示冲突。",
    "投射测评的罗夏墨迹图片和TAT主题统觉图片，帮助分析青少年情绪困扰。",
]

# ============================================================
# PRD 对齐的青少年心理健康英文补充语料
# 每组围绕核心词的共现关系设计，提升 Word2Vec 语义关联
# ============================================================
PRD_ALIGNED_EN = [
    # Mood check-in (5-level) — mood/happy/calm/low/anxious/sad/daily/student 共现
    "Students record daily mood check-ins choosing from happy calm low anxious sad emotions.",
    "The mood check-in feature lets adolescents track happy calm low anxious sad feelings over time.",
    "Mood check-in data helps teachers identify at-risk students through class mood visualization.",
    "The class status page displays mood trends and warning counts for student risk detection.",
    "Daily mood check-in lets students choose happy calm low anxious sad to record their mood.",
    "Teachers use mood check-in data to see student happy calm low anxious sad emotions daily.",
    "The mood check-in tracks happy calm low anxious sad helping teachers identify at-risk students.",
    "When students select low anxious sad in mood check-in the system alerts teachers to student risk.",
    "Mood check-in statistics show daily trends of student happy calm low anxious sad changes.",
    "Today mood is happy calm low anxious or sad mood check-in helps students record daily feelings.",
    # AI chat / CBT — anxiety/depression/emotion/cognitive/beliefs 共现
    "The AI chat uses cognitive behavioral therapy to help adolescents identify negative thought distortions.",
    "Star AI chat uses Socratic questioning to guide students to recognize irrational beliefs and relieve anxiety depression.",
    "When the AI chat detects negative emotions it guides adolescents through cognitive restructuring and emotion regulation.",
    "The chat feature provides AI psychological counseling with topic cards guiding students to express inner feelings.",
    "AI chat helps adolescents identify anxiety depression and negative cognitive distortions adjusting irrational beliefs.",
    "Cognitive behavioral therapy through AI chat guides students to recognize anxiety depression and emotion for cognitive restructuring.",
    "Star AI chat relieves adolescent anxiety depression through Socratic questioning adjusting irrational beliefs.",
    "AI chat detects negative emotion and anxiety depression guiding adolescent cognitive restructuring and emotion regulation.",
    "Chat topic cards help adolescents express anxiety depression and inner emotion feelings.",
    "Cognitive behavioral therapy AI chat helps adolescents identify irrational beliefs relieving anxiety depression symptoms.",
    # Relaxation tools — relaxation/stress/anxiety/meditation/music/puzzle 共现
    "Relaxation tools include puzzle games meditation guides and music players to help adolescents relieve stress and anxiety.",
    "Meditation guides use mindfulness breathing exercises to help students relax and reduce anxiety and stress symptoms.",
    "Puzzle games help students shift attention and relieve academic stress and peer relationship difficulties.",
    "The music player provides soothing music to help adolescents regulate emotions and reduce anxiety symptoms.",
    "Relaxation tools puzzle games and meditation guides help adolescents relieve academic stress and anxiety emotion.",
    "Meditation guide mindfulness breathing exercises let students relax reducing anxiety stress and negative emotion.",
    "Music player soothing music helps adolescents relax relieving stress anxiety and emotional distress.",
    "Relaxation tools help adolescents relieve stress anxiety including puzzle meditation and music relaxation methods.",
    "Academic stress and peer relationship difficulties can be relieved by relaxation tools puzzle meditation and music for anxiety.",
    "Relaxation tools meditation guides music players puzzle games help adolescents reduce stress and anxiety symptoms.",
    # Risk detection / crisis intervention — risk/suicide/self-harm/crisis/detection/keywords/intervention 共现
    "The risk detection system identifies crisis keywords like self-harm and suicide triggering emergency crisis intervention.",
    "When the AI chat detects self-harm or suicide risk keywords it immediately initiates safety guidance and crisis response.",
    "Crisis intervention includes emergency contact notification professional hotline referral and safety companionship.",
    "The teacher dashboard shows risk-warning students helping detect suicide and self-harm risks in a timely manner.",
    "Risk detection identifies self-harm suicide and crisis keywords triggering emergency crisis intervention and safety guidance.",
    "When AI chat detects suicide self-harm risk keywords it immediately starts crisis intervention and safety guidance.",
    "Crisis intervention includes emergency contact notification and hotline referral for suicide self-harm risk.",
    "Teacher dashboard shows risk warning students detecting suicide self-harm crisis in a timely manner.",
    "Risk detection system identifies suicide self-harm crisis through keywords triggering emergency intervention and safety.",
    "When suicide self-harm keywords are detected the risk detection system immediately starts crisis intervention and emergency response.",
    # Adolescent psychological development — adolescent/depression/anxiety/stress/emotion/identity/peer 共现
    "Adolescent mental health focuses on emotional development and psychological adaptation of students aged 12 to 18.",
    "Core developmental tasks of adolescence include identity formation peer relationship deepening and autonomy development.",
    "Junior and senior high school students face academic stress peer relationship difficulties and identity crises requiring psychological support.",
    "School mental health teachers identify students needing attention through class-level emotion data.",
    "Adolescent mental health focuses on student depression anxiety emotion stress and identity development.",
    "Adolescence identity formation and peer relationship deepening students face academic stress and anxiety depression.",
    "Junior high students peer relationship difficulties and identity crisis need emotion support and stress relief.",
    "School mental health teachers identify adolescent depression anxiety and stress risk through class emotion data.",
    "Adolescent depression anxiety and academic stress need emotion support peer guidance and identity formation.",
    "Students aged 12 to 18 mental health focuses on depression anxiety emotion stress peer relationship and identity.",
    # Projective assessment (Rorschach + TAT) — rorschach/TAT/projective/inkblot/images/assessment 共现
    "The Rorschach inkblot test analyzes adolescent psychological projection and emotional states through symmetric inkblot images.",
    "The TAT thematic apperception test uses picture scenes to guide adolescents in telling stories revealing inner conflicts.",
    "Projective assessment combines Rorschach inkblots and TAT images to analyze adolescent unconscious content and emotional distress.",
    "The psych assessment mini-program provides Rorschach and TAT image libraries supporting teacher projective assessment analysis.",
    "Rorschach inkblot test and TAT thematic apperception test are two main projective assessment image analysis methods.",
    "Rorschach inkblot images analyze adolescent psychological projection TAT images reveal inner conflicts.",
    "Projective assessment uses Rorschach inkblots and TAT images analyzing adolescent unconscious content and emotion.",
    "Psych assessment mini-program Rorschach and TAT image libraries support projective assessment and unconscious analysis.",
    "Rorschach inkblot test uses symmetric inkblot images for projective analysis TAT uses picture scenes to reveal conflicts.",
    "Projective assessment Rorschach inkblot images and TAT thematic apperception images help analyze adolescent emotional distress.",
]


def build_chinese_corpus():
    """从 knowledge_base.json 提取中文内容 + PRD 对齐句式 → chinese_corpus.txt"""
    kb_path = DATA_DIR / "knowledge_base.json"
    out_path = DATA_DIR / "chinese_corpus.txt"

    with open(kb_path, "r", encoding="utf-8") as f:
        kb = json.load(f)

    sentences = []

    for item in kb:
        # 提取 content 字段并按句号/问号/叹号切分
        content = item.get("content", "")
        for sent in re.split(r"[。！？；]", content):
            sent = sent.strip()
            if len(sent) >= 10:
                sentences.append(sent)

        # 提取 techniques 和 applicable_issues 作为短句
        for tech in item.get("techniques", []):
            sentences.append(tech)
        for issue in item.get("applicable_issues", []):
            sentences.append(issue)

        # title 也加入
        title = item.get("title", "")
        if title:
            sentences.append(title)

    # 补充 PRD 对齐句式
    sentences.extend(PRD_ALIGNED_CN)

    # 去重
    seen = set()
    unique = []
    for s in sentences:
        if s not in seen:
            seen.add(s)
            unique.append(s)

    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(unique))

    print(f"[chinese_corpus] 写入 {len(unique)} 句到 {out_path}")
    return len(unique)


def build_english_corpus():
    """从 combined_cleaned_text.txt 过滤英文行 + PRD 对齐句式 → english_corpus_augmented.txt"""
    combined_path = DATA_DIR / "combined_cleaned_text.txt"
    out_path = DATA_DIR / "english_corpus_augmented.txt"

    sentences = []

    with open(combined_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            # 只保留英文字母开头的行，且长度 > 20
            if len(line) > 20 and re.match(r"^[A-Za-z]", line):
                # 过滤掉纯数字或符号行
                alpha_count = sum(1 for c in line if c.isalpha())
                if alpha_count > len(line) * 0.5:
                    sentences.append(line)

    # 新增：注入他山科研爬取的英文摘要（青少年心理健康论文）
    tashan_path = DATA_DIR / "tashan_corpora" / "abstracts_en.txt"
    if tashan_path.exists():
        tashan_count = 0
        with open(tashan_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and len(line) > 20 and re.match(r"^[A-Za-z]", line):
                    alpha_count = sum(1 for c in line if c.isalpha())
                    if alpha_count > len(line) * 0.5:
                        sentences.append(line)
                        tashan_count += 1
        print(f"[tashan] 注入 {tashan_count} 句英文摘要（来自 {tashan_path.name}）")
    else:
        print(f"[tashan] 跳过：{tashan_path} 不存在")

    # 补充 PRD 对齐句式
    sentences.extend(PRD_ALIGNED_EN)

    # 去重
    seen = set()
    unique = []
    for s in sentences:
        if s not in seen:
            seen.add(s)
            unique.append(s)

    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(unique))

    print(f"[english_corpus] 写入 {len(unique)} 句到 {out_path}")
    return len(unique)


if __name__ == "__main__":
    cn_count = build_chinese_corpus()
    en_count = build_english_corpus()
    print(f"\n构建完成：中文 {cn_count} 句，英文 {en_count} 句")
