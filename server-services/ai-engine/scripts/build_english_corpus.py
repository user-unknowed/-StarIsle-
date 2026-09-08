"""
build_english_corpus.py - 英文心理健康语料增强脚本

所属模块：ai-engine/scripts
功能简述：
    将 combined_cleaned_text.txt（英文学术文献）与 PRD 对齐的青少年心理健康英文句式
    合并为 english_corpus_augmented.txt，供英文 Word2Vec 预训练使用。
背景：
    原英文模型仅基于学术 PTSD/抑郁文献训练，缺少青少年情绪管理、心情打卡、放松工具、
    风险检测等 PRD 核心功能词汇。本脚本补充这些词汇的英文语境，使模型更符合 PRD。
"""
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"
SRC_PATH = DATA_DIR / "combined_cleaned_text.txt"
OUT_PATH = DATA_DIR / "english_corpus_augmented.txt"

# ========== PRD 对齐的青少年心理健康英文补充语料 ==========
PRD_ALIGNED_SENTENCES = [
    # —— Mood check-in (PRD 今日心情: happy/calm/low/anxious/sad) ——
    "Students record daily mood check-ins choosing from happy calm low anxious sad emotions.",
    "The mood check-in feature lets adolescents track happy calm low anxious sad feelings over time.",
    "Mood records show a student shifting from happy to low, signaling emotional distress to investigate.",
    "Consecutive low and anxious mood check-ins trigger risk alerts for teachers to support the student.",
    "Happy and calm moods indicate good emotional states, while low anxious and sad moods need support.",
    "Daily mood tracking helps adolescents build emotional awareness and recognize anxiety and depression.",
    "Teachers view class mood trends to identify students with low anxious or sad emotional patterns.",
    "The five mood levels happy calm low anxious sad help students express their daily emotions.",
    # —— AI chat / CBT (PRD 聊一聊: CBT-based) ——
    "The AI chat uses cognitive behavioral therapy to help adolescents identify negative thought distortions.",
    "Star AI chat uses Socratic questioning to guide students to recognize irrational beliefs and relieve anxiety depression.",
    "Cognitive behavioral therapy holds that thoughts emotions and behaviors interact, so changing cognition improves depression and anxiety.",
    "AI chat helps students record automatic thoughts and challenge catastrophizing and personalization cognitive distortions.",
    "CBT thought records help clients test anxious and depressive cognitive distortions.",
    "The AI chat uses gradual exposure to help adolescents face feared situations and reduce anxiety symptoms.",
    "Cognitive restructuring is a core CBT technique helping students with depression and anxiety replace irrational beliefs.",
    "Star AI chat incorporates relaxation training and coping skills to reduce student stress and anxiety.",
    "CBT-based AI chat is effective for adolescent depression anxiety and emotional distress.",
    # —— Relaxation tools (PRD 放松一下: puzzle, meditation, music) ——
    "Relaxation tools include puzzle games meditation guides and music players to help adolescents relieve stress and anxiety.",
    "Meditation guides use mindfulness breathing exercises to help students relax and reduce anxiety and stress symptoms.",
    "The stress-relief music player lets students regulate emotions through music when feeling low or sad.",
    "Puzzle games serve as relaxation tools to distract from academic stress and relieve anxiety.",
    "Mindfulness meditation helps adolescents observe present emotions and return to calm from anxiety and low mood.",
    "The relax feature offers multiple stress-relief methods suited for student emotional management.",
    "Music therapy through soothing music improves mood and relieves depression and anxiety symptoms.",
    "Deep breathing relaxation training rapidly lowers anxiety and is a practical emotional regulation skill for students.",
    # —— Risk detection / crisis intervention (PRD 风险检测与危机响应) ——
    "The risk detection system identifies self-harm and suicide crisis keywords to trigger emergency crisis intervention.",
    "When AI chat detects self-harm or suicide risk keywords, it immediately initiates safety guidance and crisis response.",
    "Crisis intervention includes suicide prevention, safety planning, and emotional stabilization to protect student safety.",
    "The teacher workbench shows high-risk student alerts to identify students needing crisis intervention for depression and anxiety.",
    "The risk detection service uses semantic analysis to assess student self-harm and suicide risk levels for timely alerts.",
    "The emergency help button lets students dial a mental health crisis hotline for immediate support during psychological crisis.",
    "Self-harm and suicide risk keyword detection is a core safety feature of the adolescent mental health system.",
    "The six-step crisis intervention model ensures students at suicide risk receive timely support and safety plans.",
    "School mental health teachers handle crisis intervention and referral services for high-risk students.",
    # —— Adolescent mental health (PRD target: ages 12-18) ——
    "Adolescent mental health focuses on emotional development and psychological adaptation in students aged 12 to 18.",
    "Core developmental tasks of adolescence include identity formation, deepening peer relationships, and autonomy development.",
    "Academic stress is a major source of adolescent anxiety and depression, requiring psychological counseling support.",
    "Peer relationships significantly impact adolescent mental health; loneliness and social anxiety need attention.",
    "Parent-child conflicts are common in adolescence; family therapy and communication improvement help adolescent emotional issues.",
    "Adolescent identity exploration involves emotional turbulence and requires school psychological counseling resources.",
    "Internet addiction affects adolescent mental health and is associated with depression, anxiety, and low mood.",
    "Adolescent emotion regulation skills are still developing, requiring training in emotional management and stress coping.",
    "School mental health education helps identify adolescent depression and anxiety symptoms for early intervention.",
    "Counselors must respect adolescent autonomy and privacy to build trust and conduct effective therapy.",
    # —— Symptoms and treatment ——
    "Depression symptoms include persistent low mood, loss of interest, sleep disturbance, and low self-evaluation.",
    "Anxiety symptoms include excessive worry, tension, palpitations, and avoidance behavior requiring professional treatment.",
    "Post-traumatic stress disorder PTSD symptoms include flashbacks, avoidance, and hyperarousal requiring trauma treatment.",
    "Psychotherapy approaches include cognitive behavioral therapy, psychoanalysis, family therapy, and combined medication treatment.",
    "Comorbid depression and anxiety are common in adolescents, requiring comprehensive treatment and ongoing psychological support.",
    "Emotional symptom assessment uses scales like PHQ-9 and SCL-90 to diagnose depression and anxiety severity.",
    "The effectiveness of psychotherapy depends on the therapeutic relationship and the client motivation to change.",
    "Early identification and timely treatment of adolescent depression and anxiety symptoms improves prognosis and functional recovery.",
    "Psychological counseling helps adolescents handle academic stress, peer conflict, and family relationship issues.",
    "Mental health is the foundation of healthy adolescent development, with emotion regulation skills affecting overall growth.",
    # —— Home-school collaboration (PRD core value) ——
    "The home-school collaboration model lets parents and teachers jointly support student mental health and emotional status.",
    "Parents view their children's emotional trends through the parent app to understand changes in psychological state.",
    "The teacher class status page displays student mood trends and alert information to support home-school collaboration.",
    "The parent AI counselor provides family education advice to improve parent-child communication and adolescent mental health.",
    "Home-school collaboration achieves zero-pressure psychological guardianship, providing comprehensive emotional support for students.",
    "Parents concerned about their child's low or anxious emotional changes can seek professional psychological support.",
    "Schools and families collaborate to identify student psychological risks and jointly develop support plans to protect adolescents.",
    # —— Emotion management (PRD core) ——
    "Emotion management helps adolescents identify, express, and regulate happy calm low anxious sad emotions.",
    "Emotion records let students track daily mood changes to discover emotional patterns and triggers.",
    "Emotion regulation skills include recognizing emotions, identifying triggers, and using relaxation strategies to relieve stress.",
    "Emotion trend charts visualize a student's mood changes over seven days to identify anxious and low patterns.",
    "Emotional distress like persistent low and anxious mood needs professional psychological support to avoid developing depression symptoms.",
    "Emotional awareness is the foundation of mental health, helping adolescents understand and manage their emotional states.",
    "Emotion management tools help students recover from sad and low moods, building positive emotion regulation strategies.",
    "Emotional data statistics let students understand their emotional rhythms and stress coping methods.",
    # —— Projective assessment (PRD v2.1) ——
    "The Rorschach inkblot test uses projective techniques to assess adolescent emotions and personality features.",
    "The Thematic Apperception Test TAT uses image scenes to elicit students' inner conflicts and emotional themes.",
    "The psych assessment mini-program supports Rorschach and TAT image projection feedback to help teachers understand students.",
    "AI analysis of student projective assessment feedback generates emotional analysis reports to assist psychological evaluation.",
    "Teachers review student projective assessment results combined with clinical interviews to judge psychological status.",
    "Psychological assessment is an auxiliary tool that cannot replace clinical judgment and professional interviews.",
    "Projective techniques like Rorschach inkblots and Thematic Apperception Tests help explore unconscious emotional content.",
    "Combining psychological assessment scales with projective tests improves adolescent psychological diagnostic accuracy.",
]


def build_corpus():
    """合并英文学术语料 + PRD 对齐英文句式，输出增强语料。"""
    parts = []

    # 1) 保留原始英文学术语料
    if SRC_PATH.exists():
        with open(SRC_PATH, "r", encoding="utf-8") as f:
            original = f.read()
        parts.append(original)
        print(f"[build_english_corpus] 原始学术语料字符数: {len(original)}")
    else:
        print(f"[build_english_corpus] WARN: {SRC_PATH} 不存在，仅使用 PRD 句式")

    # 2) 追加 PRD 对齐句式（重复 3 轮以增加词频）
    aug_lines = []
    for _ in range(3):
        for s in PRD_ALIGNED_SENTENCES:
            aug_lines.append(s)
    parts.append("\n".join(aug_lines))

    out_text = "\n\n".join(parts)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write(out_text)

    print(f"[build_english_corpus] PRD 句式数: {len(PRD_ALIGNED_SENTENCES)} (x3 轮)")
    print(f"[build_english_corpus] 总字符数: {len(out_text)}")
    print(f"[build_english_corpus] 输出: {OUT_PATH}")

    # 核心词覆盖检查
    core_words = ["depression", "anxiety", "emotion", "mental", "health",
                  "treatment", "symptoms", "mood", "happy", "calm",
                  "low", "anxious", "sad", "relax", "meditation",
                  "stress", "adolescent", "student", "teacher", "parent",
                  "CBT", "cognitive", "risk", "crisis", "suicide",
                  "Rorschach", "TAT", "projective"]
    print("[build_english_corpus] 核心词覆盖检查:")
    for w in core_words:
        cnt = out_text.lower().count(w.lower())
        print(f"  {w}: {cnt} 次")


if __name__ == "__main__":
    build_corpus()
