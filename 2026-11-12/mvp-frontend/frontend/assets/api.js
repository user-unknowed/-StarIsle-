/* 星屿 StarIsle · API 适配层
   ---------------------------------------------------------------
   唯一职责：把「界面要的数据」和「后端怎么给」隔离开。
   界面只认 StarIsleAPI 的方法与返回结构，不认 fetch / 路径 / 字段名。

   切换点只有一个：下面的 USE_MOCK。
     USE_MOCK = true   → 全部走内置演示数据（localStorage 持久化，file:// 也能跑）
     USE_MOCK = false  → 全部走 BASE_URL 下的真实接口（契约见 docs/api-contract.md）

   返回结构统一为：
     成功 { ok: true,  data: <业务数据> }
     失败 { ok: false, error: { code, message } }

   真实接口的响应壳按项目既有约定 { code, message, data }，code 为 0/200 视为成功。
   依赖：无。全局暴露 window.StarIsleAPI。
   --------------------------------------------------------------- */

(function (global) {
  'use strict';

  /* ================= 0. 开关与常量 ================= */

  var USE_MOCK = true;          // ←←← 唯一切换点
  var BASE_URL = '/api';        // 真实后端前缀，与 web-frontend/src/services/http.ts 一致
  var TIMEOUT_MS = 10000;
  var TOKEN_KEY = 'starisle-auth';
  var DB_KEY = 'starisle-demo-db';
  var DB_VERSION = 3;

  /* ================= 1. 基础工具 ================= */

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  function dayKey(offset) {
    var d = new Date();
    d.setDate(d.getDate() - (offset || 0));
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function stamp(offset) {
    var d = new Date();
    d.setDate(d.getDate() - (offset || 0));
    return d.toISOString();
  }

  function uid(prefix) {
    return prefix + '-' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  }

  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }

  function delay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function ok(data) { return { ok: true, data: data }; }
  function fail(code, message) { return { ok: false, error: { code: code, message: message } }; }

  /* 演示用的「拟真延迟」，让骨架屏与按钮 loading 有机会被看到 */
  function mockLatency() { return delay(160 + Math.floor(Math.random() * 220)); }

  /* ================= 2. 存储（localStorage 不可用时退化为内存） ================= */

  var memStore = {};

  function readRaw(key) {
    try {
      var v = global.localStorage.getItem(key);
      if (v != null) return v;
    } catch (e) { /* file:// 或隐私模式下会抛错 */ }
    return Object.prototype.hasOwnProperty.call(memStore, key) ? memStore[key] : null;
  }

  function writeRaw(key, val) {
    try {
      global.localStorage.setItem(key, val);
      return;
    } catch (e) { /* 落到内存 */ }
    memStore[key] = val;
  }

  function removeRaw(key) {
    try { global.localStorage.removeItem(key); } catch (e) { /* ignore */ }
    delete memStore[key];
  }

  function getSession() {
    var raw = readRaw(TOKEN_KEY);
    if (!raw) return null;
    try {
      var box = JSON.parse(raw);
      var s = (box && box.state) ? box.state : box;
      if (!s || !s.role) return null;
      return s;
    } catch (e) { return null; }
  }

  function setSession(session) {
    writeRaw(TOKEN_KEY, JSON.stringify({ state: session }));
  }

  function clearSession() { removeRaw(TOKEN_KEY); }

  /* ================= 3. 演示数据库 ================= */

  var db = null;

  function loadDB() {
    if (db) return db;
    var raw = readRaw(DB_KEY);
    if (raw) {
      try {
        db = JSON.parse(raw);
        if (!db || db.version !== DB_VERSION) db = null;
      } catch (e) { db = null; }
    }
    if (!db) { db = seed(); persist(); }
    return db;
  }

  function persist() { writeRaw(DB_KEY, JSON.stringify(db)); }

  /* ---------- 3.1 心情记录种子（学生 stu-1001：林小满） ---------- */

  function seedMood() {
    var levels = [3, 2, 2, 3, 4, 4, 5, 3, 2, 3, 4, 5, 4, 3];
    var tagPool = [
      ['学习压力'], ['睡眠'], ['人际关系', '学习压力'], [], ['家庭'],
      [], ['学习压力'], ['考试焦虑'], ['睡眠'], [], ['人际关系'], [], ['学习压力'], ['身体不适']
    ];
    var out = [];
    for (var i = 0; i < levels.length; i++) {
      var d = 13 - i;
      out.push({
        id: 'mood-' + d,
        userId: 'stu-1001',
        moodLevel: levels[i],
        tags: tagPool[i] || [],
        note: i === 1 ? '作业写到很晚，有点撑不住。' : (i === 10 ? '和同桌说开了，轻松一些。' : ''),
        checkinDate: dayKey(d),
        createdAt: stamp(d)
      });
    }
    return out;
  }

  /* ---------- 3.2 班级学生 ---------- */

  function seedStudents() {
    return [
      { id: 'stu-1001', nickname: '林小满', avatar: '🌱', classId: 'cls-201', riskLevel: 'green', latestMood: 5, latestMoodDate: dayKey(0), checkinToday: true, tags: [], note: '' },
      { id: 'stu-1002', nickname: '陈亦舟', avatar: '🐳', classId: 'cls-201', riskLevel: 'yellow', latestMood: 3, latestMoodDate: dayKey(1), checkinToday: false, tags: ['学习压力'], note: '最近几次模考排名下滑。' },
      { id: 'stu-1003', nickname: '周予安', avatar: '🕯️', classId: 'cls-201', riskLevel: 'red', latestMood: 1, latestMoodDate: dayKey(0), checkinToday: true, tags: ['家庭', '睡眠'], note: '不想说话，觉得没人需要我。' },
      { id: 'stu-1004', nickname: '苏念', avatar: '🌙', classId: 'cls-201', riskLevel: 'green', latestMood: 4, latestMoodDate: dayKey(0), checkinToday: true, tags: [], note: '' },
      { id: 'stu-1005', nickname: '何知遥', avatar: '🍂', classId: 'cls-201', riskLevel: 'orange', latestMood: 2, latestMoodDate: dayKey(2), checkinToday: false, tags: ['人际关系'], note: '和宿舍同学有摩擦。' },
      { id: 'stu-1006', nickname: '罗清让', avatar: '🐚', classId: 'cls-201', riskLevel: 'green', latestMood: 4, latestMoodDate: dayKey(3), checkinToday: false, tags: [], note: '' },
      { id: 'stu-1007', nickname: '温叙白', avatar: '🪐', classId: 'cls-201', riskLevel: 'yellow', latestMood: 3, latestMoodDate: dayKey(1), checkinToday: false, tags: ['考试焦虑'], note: '' },
      { id: 'stu-1008', nickname: '许澄', avatar: '🌾', classId: 'cls-201', riskLevel: 'green', latestMood: 5, latestMoodDate: dayKey(0), checkinToday: true, tags: [], note: '' }
    ];
  }

  /* ---------- 3.3 预警 ---------- */

  function seedAlerts() {
    return [
      {
        id: 'alt-3001',
        classId: 'cls-201',
        studentId: 'stu-1003',
        studentName: '周予安',
        studentAvatar: '🕯️',
        riskLevel: 'red',
        reason: '连续 4 天心情 ≤ 2，今日打卡留言出现「没人需要我」的自否定表述',
        source: 'mood+risk',
        createdAt: stamp(0),
        handled: false,
        reviewed: false,
        reviewDecision: '',
        reviewNote: ''
      },
      {
        id: 'alt-3002',
        classId: 'cls-201',
        studentId: 'stu-1005',
        studentName: '何知遥',
        studentAvatar: '🍂',
        riskLevel: 'orange',
        reason: '本周 3 次记录「人际关系」标签，2 天未打卡',
        source: 'mood',
        createdAt: stamp(1),
        handled: false,
        reviewed: false,
        reviewDecision: '',
        reviewNote: ''
      },
      {
        id: 'alt-3003',
        classId: 'cls-201',
        studentId: 'stu-1002',
        studentName: '陈亦舟',
        studentAvatar: '🐳',
        riskLevel: 'yellow',
        reason: '近 7 天平均心情 2.9，低于班级均值',
        source: 'mood',
        createdAt: stamp(2),
        handled: true,
        reviewed: true,
        reviewDecision: 'observe',
        reviewNote: '已约谈，家庭沟通正常，转为两周观察。',
        reviewedAt: stamp(1)
      }
    ];
  }

  /* ---------- 3.4 知识库文章 ---------- */

  function seedKnowledge() {
    return [
      {
        id: 'kb-001',
        title: '情绪低落到不想说话时，先做这三件小事',
        category: '情绪管理',
        source: '星屿心理教研组',
        summary: '低落不是故障，是身体在提醒你需要被照顾。',
        techniques: ['情绪命名', '4-7-8 呼吸', '行为激活'],
        keywords: ['低落', '难过', '情绪', '没动力', '不想说话', '疲惫'],
        content: [
          '## 先说一句',
          '',
          '情绪低落的时候，你不是"变差了"，只是**能量储备见底**了。这时候逼自己"振作一点"通常无效，反而会增加一层自责。',
          '',
          '## 一、给情绪起个名字',
          '',
          '把"我不太好"换成更具体的描述，比如：',
          '',
          '- 我有点**空**，像被抽走了力气',
          '- 我有点**堵**，想说又说不出来',
          '- 我有点**怕**，怕自己一直这样',
          '',
          '研究里把这一步叫「情绪标注」。仅仅说清楚，就能让大脑的警报响得没那么急。',
          '',
          '## 二、做一次 4-7-8 呼吸',
          '',
          '1. 吸气 4 秒',
          '2. 屏住 7 秒',
          '3. 缓慢呼气 8 秒',
          '4. 重复 4 轮',
          '',
          '> 呼气比吸气长，是在给身体发"现在安全"的信号。做不完 4 轮也没关系，做 1 轮就算完成。',
          '',
          '## 三、找一件 5 分钟能完成的事',
          '',
          '不是"我要把作业写完"，而是"我要把桌上那杯水喝掉"。',
          '',
          '**行为激活**的核心是：先动起来，情绪才跟上；而不是等情绪好了再动。',
          '',
          '## 什么时候该找人',
          '',
          '如果以下任意一条持续**两周以上**，建议尽快联系学校心理老师：',
          '',
          '- 几乎每天都不想起床',
          '- 对以前喜欢的事完全失去兴趣',
          '- 出现"我不该存在"这类念头',
          '',
          '这不是矫情，是需要专业支持的信号。'
        ].join('\n')
      },
      {
        id: 'kb-002',
        title: '考前焦虑：把"我完了"拆成可处理的小块',
        category: '学业压力',
        source: '星屿心理教研组',
        summary: '焦虑不是敌人，它是没被安排的注意力。',
        techniques: ['认知拆解', '最小行动', '番茄钟'],
        keywords: ['考试', '焦虑', '压力', '排名', '复习', '成绩'],
        content: [
          '## 焦虑在说什么',
          '',
          '考试前的紧张，本质是大脑在预演失败。它并不想害你，只是**用力过猛**。',
          '',
          '真正让人卡住的往往不是"紧张"，而是那句笼统的：',
          '',
          '> 我完了。',
          '',
          '这句话没有出口，所以大脑只能一直空转。',
          '',
          '## 拆解三步',
          '',
          '| 原句 | 拆成 | 下一步 |',
          '| --- | --- | --- |',
          '| 我完了 | 我这次数学可能考不好 | 列出最不稳的 2 个章节 |',
          '| 我什么都没复习 | 我复习了 6 章，剩 3 章 | 今晚只做第 7 章 5 道题 |',
          '| 考不好就全毁了 | 考不好会影响排名 | 排名之外，我还能做什么 |',
          '',
          '## 一个 25 分钟的约定',
          '',
          '跟自己约定：**只做 25 分钟，做完就允许停**。',
          '',
          '大部分时候，真正难的是"开始"，不是"继续"。',
          '',
          '## 身体的帮手',
          '',
          '- 考前 10 分钟：慢呼气 6 次',
          '- 手心出汗：握拳 5 秒再松开，重复 3 次',
          '- 脑子空白：先把会做的题写完，让手先动起来'
        ].join('\n')
      },
      {
        id: 'kb-003',
        title: '被孤立的感觉是真的，但你不必一个人扛',
        category: '人际关系',
        source: '星屿心理教研组',
        summary: '关系里的痛和身体的痛，在大脑里用的是同一套回路。',
        techniques: ['事实/解释分离', '求助脚本', '支持网络'],
        keywords: ['孤立', '人际关系', '朋友', '排挤', '宿舍', '同桌', '孤独'],
        content: [
          '## 为什么这么疼',
          '',
          '被排除在群体之外时，大脑激活的区域和被烫到时有重叠。所以"只是没叫我"这种话，劝不动你。',
          '',
          '## 先分开两件事',
          '',
          '- **事实**：这周三次午饭他们没叫我。',
          '- **解释**：他们认为我不重要。',
          '',
          '事实可以被核对，解释只是其中一种可能。也可能是：他们以为你要回家吃。',
          '',
          '## 一个可用的开口句式',
          '',
          '> 我这两天有点在意，午饭的时候你们没叫我，是有什么安排吗？我想确认一下，不是要怪谁。',
          '',
          '这句话包含三个要素：**说感受、说事实、说明意图**。它给对方留了台阶，也给你自己留了退路。',
          '',
          '## 如果确实被排挤',
          '',
          '1. 记下时间、地点、在场的人（保护自己，不是报复）',
          '2. 告诉一个成年人：班主任、心理老师、家长，任选一个你信得过的',
          '3. 同时维持至少一条校外的支持关系',
          '',
          '被排挤不是你的错，但**结束它需要成年人介入**，这不是打小报告。'
        ].join('\n')
      },
      {
        id: 'kb-004',
        title: '睡不着的时候，别在床上跟自己较劲',
        category: '睡眠与身体',
        source: '星屿心理教研组',
        summary: '床只用来睡觉，这是最有效的一条睡眠指令。',
        techniques: ['刺激控制', '睡前仪式', '屏幕断联'],
        keywords: ['睡眠', '失眠', '熬夜', '睡不着', '身体', '头痛'],
        content: [
          '## 一条反直觉的建议',
          '',
          '躺了 20 分钟还睡不着，**起来**。去客厅做点无聊的事，等困了再回床上。',
          '',
          '这叫「刺激控制」：让大脑重新把"床"和"睡着"绑在一起，而不是和"翻来覆去"绑在一起。',
          '',
          '## 睡前 40 分钟的仪式',
          '',
          '- 关掉短视频（不是放下手机，是关掉那个 App）',
          '- 把明天的三件事写在纸上，让大脑卸货',
          '- 洗个热水澡，或者用热水泡脚',
          '',
          '## 关于"必须睡够 8 小时"',
          '',
          '这个数字是人群平均值，不是及格线。**固定起床时间**比固定入睡时间更有用。',
          '',
          '## 需要看医生的情况',
          '',
          '- 连续两周以上入睡困难，且白天明显受影响',
          '- 打鼾伴随憋醒',
          '- 靠酒精或药物才能睡'
        ].join('\n')
      },
      {
        id: 'kb-005',
        title: '识别危机信号：哪些话不能当玩笑听',
        category: '危机识别',
        source: '星屿心理教研组',
        summary: '谈到"不想活了"时，直接问不会把人推向危险，回避才会。',
        techniques: ['直接询问', '陪伴不劝解', '转介'],
        keywords: ['危机', '自伤', '自杀', '不想活', '危险', '紧急', '预警'],
        content: [
          '## 常见误解',
          '',
          '> 问他"你是不是想自杀"，会不会反而提醒他？',
          '',
          '不会。多项研究结论一致：**直接询问不会增加风险**，反而让对方感到被认真对待。',
          '',
          '## 值得警惕的表达',
          '',
          '- "我不该存在"、"没有我大家会更好"',
          '- "我已经把东西都送人了"',
          '- 突然从极度低落转为异常平静',
          '- 反复说"以后你们就轻松了"',
          '',
          '## 你可以做的四步',
          '',
          '1. **直接问**：你最近有没有想过伤害自己？',
          '2. **不劝解**：先别说"想开点"，先说"我听到了"',
          '3. **不独扛**：立刻联系心理老师或家长，哪怕对方要求你保密',
          '4. **不离开**：在成年人接手前，尽量有人陪着',
          '',
          '## 保密例外',
          '',
          '当生命安全受到威胁时，保密要让位。这不是背叛信任，是保命。'
        ].join('\n')
      },
      {
        id: 'kb-006',
        title: '和爸妈说话总吵架？试试"三句半"',
        category: '亲子沟通',
        source: '星屿心理教研组',
        summary: '冲突里最先失控的通常不是内容，是语气。',
        techniques: ['非暴力沟通', '我句式', '暂停键'],
        keywords: ['家庭', '父母', '吵架', '沟通', '家长', '亲子'],
        content: [
          '## 三句半结构',
          '',
          '1. **事实**：这周我有三天晚上 11 点后还在写作业。',
          '2. **感受**：我有点累，也有点急。',
          '3. **需要**：我想每天留 20 分钟自己待着。',
          '4. **半句请求**：能不能先不催我？',
          '',
          '## 为什么"我句式"更有用',
          '',
          '"你总是催我"会让对方立刻进入防御；"我有点急"描述的是你自己，对方没有必须反击的东西。',
          '',
          '## 暂停键',
          '',
          '提前约定一句安全词，比如"我们先停十分钟"。任何一方说出，双方都暂停。',
          '',
          '这不是逃避，是让情绪从 90 分降到 60 分再谈。'
        ].join('\n')
      },
      {
        id: 'kb-007',
        title: '家长篇：孩子说"没事"时，怎么接住',
        category: '亲子沟通',
        source: '星屿家庭支持中心',
        summary: '追问细节会关门，描述观察会开门。',
        techniques: ['观察式提问', '情绪确认', '边界尊重'],
        keywords: ['家长', '孩子', '沟通', '没事', '情绪', '陪伴'],
        content: [
          '## 为什么"怎么了"问不出东西',
          '',
          '孩子说"没事"，往往不是拒绝你，而是**还没整理好**，或者担心说了会更麻烦。',
          '',
          '## 换成描述观察',
          '',
          '- ✗ 你今天怎么了？',
          '- ✓ 我发现你这周晚饭吃得很少，是胃口不好，还是有心事？',
          '',
          '描述观察把"审问"变成"我在看着你"，压力小很多。',
          '',
          '## 情绪确认的三句话',
          '',
          '1. 这听起来确实挺难受的。',
          '2. 换成我，我可能也会烦。',
          '3. 你想让我听着，还是一起想办法？',
          '',
          '第 3 句尤其重要：**大多数时候孩子要的是被听见，不是被解决**。',
          '',
          '## 三条边界',
          '',
          '- 不翻手机、不偷看日记',
          '- 不在饭桌上公开讨论',
          '- 不把"我都是为你好"当结束语'
        ].join('\n')
      },
      {
        id: 'kb-008',
        title: '教师篇：一次 10 分钟的守护性谈话',
        category: '危机识别',
        source: '星屿教师支持组',
        summary: '不是谈心，是收集信息并给出确定感。',
        techniques: ['结构化提问', '确定感', '转介流程'],
        keywords: ['教师', '谈话', '预警', '干预', '守护', '班主任'],
        content: [
          '## 目标不是解决，是判断',
          '',
          '一次守护性谈话只需要回答三个问题：',
          '',
          '1. 现在的风险等级是什么？',
          '2. 有没有可用的支持者？',
          '3. 下一步交给谁？',
          '',
          '## 推荐的开口',
          '',
          '> 我看到你最近打卡的记录变化比较大，我不是来批评你的，是想知道你还好吗。',
          '',
          '## 中间不要做的三件事',
          '',
          '- 不要承诺绝对保密',
          '- 不要用"很多人都这样"淡化',
          '- 不要在走廊、办公室公共区域谈',
          '',
          '## 结束时要给确定感',
          '',
          '> 接下来我会做两件事：一是今天把情况同步给心理老师，二是明天中午我再找你一次。',
          '',
          '确定的下一步，比空洞的安慰更能降低失控感。'
        ].join('\n')
      }
    ];
  }

  /* ---------- 3.5 树人互助 ---------- */

  function seedPosts() {
    return [
      {
        id: 'post-5001',
        userId: 'stu-1001',
        nickname: '林小满',
        avatar: '🌱',
        title: '每次考完试都觉得自己特别没用',
        content: '明明复习了，成绩出来还是不行。我知道不该和别人比，但看到排名就控制不住难受。有人也是这样吗？',
        tags: ['学业压力', '自我否定'],
        urgencyLevel: 'normal',
        replyCount: 2,
        createdAt: stamp(1),
        liked: false
      },
      {
        id: 'post-5002',
        userId: 'stu-1004',
        nickname: '苏念',
        avatar: '🌙',
        title: '宿舍里感觉自己像个透明人',
        content: '她们聊天我插不上话，慢慢就不叫我了。我不知道是自己太敏感，还是真的被排挤。',
        tags: ['人际关系'],
        urgencyLevel: 'normal',
        replyCount: 1,
        createdAt: stamp(2),
        liked: false
      },
      {
        id: 'post-5003',
        userId: 'stu-1006',
        nickname: '罗清让',
        avatar: '🐚',
        title: '熬夜到凌晨三点，第二天又会恨自己',
        content: '白天困得不行，晚上又睡不着，一直刷手机。想问问大家有没有真的管用的办法。',
        tags: ['睡眠', '自责'],
        urgencyLevel: 'high',
        replyCount: 0,
        createdAt: stamp(0),
        liked: false
      }
    ];
  }

  function seedReplies() {
    return [
      {
        id: 'rep-6001',
        postId: 'post-5001',
        userId: 'stu-1004',
        nickname: '苏念',
        avatar: '🌙',
        content: '我也这样。后来我把"排名"换成"比上次多对了哪几道题"，难受会少一点。',
        createdAt: stamp(1)
      },
      {
        id: 'rep-6002',
        postId: 'post-5001',
        userId: 'stu-1005',
        nickname: '何知遥',
        avatar: '🍂',
        content: '抱一下。你愿意说出来已经很不容易了。',
        createdAt: stamp(0)
      },
      {
        id: 'rep-6003',
        postId: 'post-5002',
        userId: 'stu-1001',
        nickname: '林小满',
        avatar: '🌱',
        content: '我上学期也这样。可以试试先找一个相对好说话的人，单独约一次饭。',
        createdAt: stamp(2)
      }
    ];
  }

  /* ---------- 3.6 家长绑定 ---------- */

  function seedBindings() {
    return [
      {
        bindingId: 'bind-7001',
        studentId: 'stu-1001',
        studentNickname: '林小满',
        studentAvatar: '🌱',
        relation: '妈妈',
        authorized: true,
        createdAt: stamp(30)
      }
    ];
  }

  /* ---------- 3.7 量表题库 ---------- */

  var SCALE_OPTIONS = [
    { value: 0, label: '完全不会' },
    { value: 1, label: '好几天' },
    { value: 2, label: '一半以上天数' },
    { value: 3, label: '几乎每天' }
  ];

  function buildScale(type, title, intro, stems, bands, advice) {
    return {
      type: type,
      title: title,
      intro: intro,
      duration: '约 ' + Math.max(2, Math.round(stems.length * 0.4)) + ' 分钟',
      options: SCALE_OPTIONS,
      questions: stems.map(function (s, i) {
        return { id: type + '-q' + (i + 1), index: i + 1, text: s, options: SCALE_OPTIONS };
      }),
      bands: bands,
      advice: advice
    };
  }

  function seedScales() {
    return [
      buildScale(
        'phq9',
        '情绪状态自评（PHQ-9 结构）',
        '请根据最近两周的真实感受作答。结果仅用于自我了解与支持性建议，不构成医学诊断。',
        [
          '做事时提不起劲或没有兴趣',
          '感到心情低落、沮丧或绝望',
          '入睡困难、睡不安稳或睡眠过多',
          '感觉疲倦或没有活力',
          '食欲不振或吃太多',
          '觉得自己很糟，或觉得自己让家人失望',
          '对事物专注有困难，例如阅读或看视频时',
          '动作或说话速度明显变慢，或烦躁坐不住',
          '有不如死掉或用某种方式伤害自己的念头'
        ],
        [
          { min: 0, max: 4, level: 'green', label: '状态平稳', desc: '当前没有明显的情绪困扰信号。' },
          { min: 5, max: 9, level: 'yellow', label: '轻度困扰', desc: '有一些低落信号，可以先从作息与行动入手。' },
          { min: 10, max: 14, level: 'orange', label: '中度困扰', desc: '建议主动和学校心理老师聊一次。' },
          { min: 15, max: 19, level: 'orange', label: '中重度困扰', desc: '建议尽快预约专业评估。' },
          { min: 20, max: 27, level: 'red', label: '重度困扰', desc: '请尽快联系专业人员，不要独自承担。' }
        ],
        [
          '把结果截图或记下来，方便和心理老师沟通时使用',
          '接下来 7 天保持每日心情打卡，让变化有据可循',
          '如果第 9 题不为 0，请立刻使用「紧急帮助」'
        ]
      ),
      buildScale(
        'gad7',
        '焦虑水平自评（GAD-7 结构）',
        '请根据最近两周的真实感受作答。',
        [
          '感到紧张、焦虑或急切',
          '不能停止或控制担忧',
          '对各种各样的事情担忧过多',
          '很难放松下来',
          '由于不安而无法静坐',
          '变得容易烦恼或急躁',
          '感到似乎将有可怕的事情发生而害怕'
        ],
        [
          { min: 0, max: 4, level: 'green', label: '状态平稳', desc: '焦虑水平在常见范围内。' },
          { min: 5, max: 9, level: 'yellow', label: '轻度焦虑', desc: '可以通过呼吸练习与规律作息缓解。' },
          { min: 10, max: 14, level: 'orange', label: '中度焦虑', desc: '建议寻求心理老师支持。' },
          { min: 15, max: 21, level: 'red', label: '重度焦虑', desc: '建议尽快进行专业评估。' }
        ],
        [
          '每天做 2 次 4-7-8 呼吸，每次 4 轮',
          '把担忧写下来，区分「可行动」与「不可控」',
          '减少睡前 1 小时的短视频'
        ]
      ),
      buildScale(
        'stress',
        '学业压力自评',
        '针对最近一个月的学习状态作答。',
        [
          '我常因为作业或考试感到透不过气',
          '我会因为成绩波动否定自己',
          '我很难在学习之外找到放松的方式',
          '我常拖延到最后一刻才开始',
          '我觉得自己的努力没有回报',
          '我会因为怕落后而不敢休息'
        ],
        [
          { min: 0, max: 3, level: 'green', label: '压力可控', desc: '当前学习压力在可调节范围内。' },
          { min: 4, max: 8, level: 'yellow', label: '压力偏高', desc: '需要主动安排恢复时间。' },
          { min: 9, max: 13, level: 'orange', label: '压力过载', desc: '建议与老师一起调整学习节奏。' },
          { min: 14, max: 18, level: 'red', label: '严重过载', desc: '请尽快寻求支持，不要硬扛。' }
        ],
        [
          '把「必须完成」清单压缩到每天 3 项',
          '每天留 20 分钟不做任何"有用"的事',
          '和信任的人说出你现在的负荷'
        ]
      )
    ];
  }

  /* ---------- 3.8 冥想 / 呼吸 ---------- */

  function seedMeditations() {
    return [
      { id: 'med-1', title: '三分钟落脚', duration: 180, category: '快速安定', audioUrl: '', description: '把注意力从思绪拉回脚底与呼吸，适合课间。' },
      { id: 'med-2', title: '睡前身体扫描', duration: 600, category: '睡前', audioUrl: '', description: '从脚趾到额头逐段放松，帮助入睡。' },
      { id: 'med-3', title: '考前五分钟', duration: 300, category: '考试', audioUrl: '', description: '稳定心率，减少进场前的空转。' },
      { id: 'med-4', title: '情绪允许练习', duration: 480, category: '情绪', audioUrl: '', description: '不驱赶情绪，只给它一个位置。' }
    ];
  }

  var BREATHING = {
    '478': {
      type: '478',
      name: '4-7-8 呼吸',
      recommendedDuration: 240,
      desc: '呼气长于吸气，帮助身体切换到放松状态。',
      steps: [
        { name: '吸气', duration: 4, instruction: '用鼻子吸气，数到 4' },
        { name: '屏息', duration: 7, instruction: '轻轻屏住，数到 7' },
        { name: '呼气', duration: 8, instruction: '用嘴缓慢呼出，数到 8' }
      ]
    },
    'box': {
      type: 'box',
      name: '4-4-4-4 箱式呼吸',
      recommendedDuration: 240,
      desc: '四段等长，适合考前稳定注意力。',
      steps: [
        { name: '吸气', duration: 4, instruction: '数到 4' },
        { name: '屏息', duration: 4, instruction: '数到 4' },
        { name: '呼气', duration: 4, instruction: '数到 4' },
        { name: '屏息', duration: 4, instruction: '数到 4' }
      ]
    }
  };

  /* ---------- 3.9 紧急资源 ---------- */

  function seedResources() {
    return [
      { id: 'res-1', type: 'hotline', title: '全国青少年服务台', content: '24 小时青少年心理与权益咨询', contact: '12355', phone: '12355', priority: 1 },
      { id: 'res-2', type: 'hotline', title: '希望 24 热线', content: '24 小时危机干预与情绪支持', contact: '400-161-9995', phone: '4001619995', priority: 2 },
      { id: 'res-3', type: 'hotline', title: '北京心理危机研究与干预中心', content: '24 小时心理危机干预', contact: '010-82951332', phone: '01082951332', priority: 3 },
      { id: 'res-4', type: 'hospital', title: '市第一医院 心理科', content: '周一至周日 8:00–17:30，可现场挂号', contact: '门诊三楼', phone: '', priority: 1 },
      { id: 'res-5', type: 'school', title: '校心理发展中心', content: '工作日 9:00–17:00，可线上预约', contact: '图书馆 B 座 201', phone: '', priority: 1 },
      { id: 'res-6', type: 'emergency', title: '急救 / 报警', content: '出现即时人身危险时立刻拨打', contact: '120 / 110', phone: '120', priority: 1 }
    ];
  }

  function seed() {
    return {
      version: DB_VERSION,
      mood: seedMood(),
      students: seedStudents(),
      alerts: seedAlerts(),
      knowledge: seedKnowledge(),
      posts: seedPosts(),
      replies: seedReplies(),
      bindings: seedBindings(),
      scales: seedScales(),
      assessments: [],
      meditations: seedMeditations(),
      resources: seedResources(),
      reviews: [],
      createdAt: stamp(0)
    };
  }

  /* ================= 4. 演示数据的小工具 ================= */

  function currentUserId() {
    var s = getSession();
    return (s && s.userId) || 'stu-1001';
  }

  function continuousDays(records) {
    var set = {};
    records.forEach(function (r) { set[r.checkinDate] = true; });
    var n = 0;
    for (var i = 0; i < 400; i++) {
      if (set[dayKey(i)]) n++;
      else break;
    }
    return n;
  }

  function avg(nums) {
    if (!nums.length) return 0;
    var s = 0;
    for (var i = 0; i < nums.length; i++) s += nums[i];
    return Math.round((s / nums.length) * 10) / 10;
  }

  function byDateAsc(a, b) { return a.checkinDate < b.checkinDate ? -1 : (a.checkinDate > b.checkinDate ? 1 : 0); }

  function moodOf(userId, days) {
    var d = loadDB();
    var from = dayKey((days || 7) - 1);
    return d.mood
      .filter(function (r) { return r.userId === userId && r.checkinDate >= from; })
      .sort(byDateAsc);
  }

  function trendOf(records) {
    if (records.length < 2) return 'flat';
    var half = Math.ceil(records.length / 2);
    var first = avg(records.slice(0, half).map(function (r) { return r.moodLevel; }));
    var last = avg(records.slice(half).map(function (r) { return r.moodLevel; }));
    if (last - first >= 0.4) return 'up';
    if (first - last >= 0.4) return 'down';
    return 'flat';
  }

  /* ================= 5. Mock 实现 ================= */

  var Mock = {

    /* ---- auth ---- */
    login: function (payload) {
      var role = (payload && payload.role) || 'student';
      var names = { student: '林小满', teacher: '沈明', parent: '林慧' };
      var avatars = { student: '🌱', teacher: '🛰️', parent: '🏠' };
      var ids = { student: 'stu-1001', teacher: 'tea-2001', parent: 'par-4001' };
      var session = {
        token: 'demo.' + role + '.' + Date.now().toString(36),
        role: role,
        userId: ids[role] || 'stu-1001',
        nickname: names[role] || '访客',
        avatar: avatars[role] || '⭐',
        classId: role === 'teacher' ? 'cls-201' : '',
        loginAt: new Date().toISOString()
      };
      setSession(session);
      return mockLatency().then(function () { return ok({ session: session }); });
    },

    /* ---- mood ---- */
    checkin: function (payload) {
      var d = loadDB();
      var level = Number(payload && payload.moodLevel);
      if (!(level >= 1 && level <= 5)) return delay(80).then(function () { return fail(400, '心情等级需在 1–5 之间'); });
      var userId = currentUserId();
      var today = dayKey(0);
      var rec = null;
      for (var i = 0; i < d.mood.length; i++) {
        if (d.mood[i].userId === userId && d.mood[i].checkinDate === today) { rec = d.mood[i]; break; }
      }
      if (rec) {
        rec.moodLevel = level;
        rec.tags = (payload.tags || []).slice();
        rec.note = payload.note || '';
        rec.createdAt = new Date().toISOString();
      } else {
        rec = {
          id: uid('mood'),
          userId: userId,
          moodLevel: level,
          tags: (payload.tags || []).slice(),
          note: payload.note || '',
          checkinDate: today,
          createdAt: new Date().toISOString()
        };
        d.mood.push(rec);
      }
      persist();
      var mine = d.mood.filter(function (r) { return r.userId === userId; });
      var days = continuousDays(mine);
      return mockLatency().then(function () {
        return ok({
          message: days > 1 ? '已记录，连续打卡 ' + days + ' 天' : '今天的心情已记下',
          checkinDate: today,
          continuousDays: days,
          record: clone(rec)
        });
      });
    },

    history: function (payload) {
      var days = Number((payload && payload.days) || 7);
      var list = moodOf(currentUserId(), days);
      return mockLatency().then(function () {
        return ok({ history: clone(list), trend: trendOf(list) });
      });
    },

    chart: function () {
      var list = moodOf(currentUserId(), 14);
      return mockLatency().then(function () {
        return ok({
          user_id: currentUserId(),
          chart_type: 'bar',
          data: list.map(function (r) { return { date: r.checkinDate, value: r.moodLevel }; })
        });
      });
    },

    /* ---- knowledge ---- */
    search: function (payload) {
      var q = String((payload && payload.query) || '').trim().toLowerCase();
      var cat = (payload && payload.category) || '';
      var d = loadDB();
      var rows = d.knowledge.filter(function (a) {
        if (cat && a.category !== cat) return false;
        if (!q) return true;
        if (a.title.toLowerCase().indexOf(q) >= 0) return true;
        if (a.summary.toLowerCase().indexOf(q) >= 0) return true;
        if (a.content.toLowerCase().indexOf(q) >= 0) return true;
        return a.keywords.some(function (k) { return k.toLowerCase().indexOf(q) >= 0; });
      }).map(function (a) {
        var matched = a.keywords.filter(function (k) { return q && k.toLowerCase().indexOf(q) >= 0; });
        return {
          id: a.id,
          title: a.title,
          source: a.source,
          category: a.category,
          content_preview: a.summary,
          techniques: a.techniques,
          score: q ? Math.max(0.42, Math.min(0.99, 0.55 + matched.length * 0.12 + (a.title.toLowerCase().indexOf(q) >= 0 ? 0.22 : 0))) : 0.5,
          matched_keywords: matched
        };
      });
      return mockLatency().then(function () {
        return ok({ query: q, total_results: rows.length, results: rows });
      });
    },

    article: function (id) {
      var d = loadDB();
      var a = null;
      for (var i = 0; i < d.knowledge.length; i++) if (d.knowledge[i].id === id) { a = d.knowledge[i]; break; }
      return mockLatency().then(function () {
        return a ? ok({ article: clone(a) }) : fail(404, '文章不存在或已下线');
      });
    },

    categories: function () {
      var d = loadDB();
      var map = {};
      d.knowledge.forEach(function (a) { map[a.category] = (map[a.category] || 0) + 1; });
      var list = Object.keys(map).map(function (k) { return { key: k, label: k, count: map[k] }; });
      return delay(60).then(function () { return ok({ categories: list }); });
    },

    stats: function () {
      var d = loadDB();
      return delay(60).then(function () {
        return ok({ total_documents: d.knowledge.length, updated_at: stamp(0) });
      });
    },

    /* ---- community ---- */
    posts: function (payload) {
      var d = loadDB();
      var page = Number((payload && payload.page) || 1);
      var size = Number((payload && payload.pageSize) || 10);
      var all = d.posts.slice().sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
      var slice = all.slice((page - 1) * size, page * size);
      return mockLatency().then(function () {
        return ok({ posts: clone(slice), total: all.length });
      });
    },

    post: function (postId) {
      var d = loadDB();
      var p = null;
      for (var i = 0; i < d.posts.length; i++) if (d.posts[i].id === postId) { p = d.posts[i]; break; }
      if (!p) return mockLatency().then(function () { return fail(404, '帖子不存在'); });
      var reps = d.replies.filter(function (r) { return r.postId === postId; })
        .sort(function (a, b) { return a.createdAt < b.createdAt ? -1 : 1; });
      return mockLatency().then(function () { return ok({ post: clone(p), replies: clone(reps) }); });
    },

    createPost: function (payload) {
      var title = String((payload && payload.title) || '').trim();
      var content = String((payload && payload.content) || '').trim();
      if (!title) return delay(80).then(function () { return fail(400, '请填写标题'); });
      if (!content) return delay(80).then(function () { return fail(400, '请写点内容，让同伴知道怎么帮你'); });
      var d = loadDB();
      var s = getSession();
      var post = {
        id: uid('post'),
        userId: currentUserId(),
        nickname: (s && s.nickname) || '匿名同学',
        avatar: (s && s.avatar) || '🌱',
        title: title,
        content: content,
        tags: (payload.tags || []).slice(0, 4),
        urgencyLevel: payload.urgencyLevel === 'high' ? 'high' : 'normal',
        replyCount: 0,
        createdAt: new Date().toISOString(),
        liked: false
      };
      d.posts.unshift(post);
      persist();
      return mockLatency().then(function () { return ok({ post: clone(post) }); });
    },

    reply: function (postId, payload) {
      var content = String((payload && payload.content) || '').trim();
      if (!content) return delay(80).then(function () { return fail(400, '回复内容不能为空'); });
      var d = loadDB();
      var p = null;
      for (var i = 0; i < d.posts.length; i++) if (d.posts[i].id === postId) { p = d.posts[i]; break; }
      if (!p) return delay(80).then(function () { return fail(404, '帖子不存在'); });
      var s = getSession();
      var rep = {
        id: uid('rep'),
        postId: postId,
        userId: currentUserId(),
        nickname: (s && s.nickname) || '匿名同学',
        avatar: (s && s.avatar) || '🌱',
        content: content,
        createdAt: new Date().toISOString()
      };
      d.replies.push(rep);
      p.replyCount = (p.replyCount || 0) + 1;
      persist();
      return mockLatency().then(function () { return ok({ reply: clone(rep) }); });
    },

    /* ---- assessment ---- */
    types: function () {
      var d = loadDB();
      return delay(60).then(function () {
        return ok({
          types: d.scales.map(function (s) {
            return { type: s.type, title: s.title, intro: s.intro, duration: s.duration, count: s.questions.length };
          })
        });
      });
    },

    questions: function (type) {
      var d = loadDB();
      var s = null;
      for (var i = 0; i < d.scales.length; i++) if (d.scales[i].type === type) { s = d.scales[i]; break; }
      return mockLatency().then(function () {
        return s ? ok({ scale: clone(s) }) : fail(404, '量表不存在');
      });
    },

    submitAssessment: function (payload) {
      var d = loadDB();
      var type = payload && payload.type;
      var s = null;
      for (var i = 0; i < d.scales.length; i++) if (d.scales[i].type === type) { s = d.scales[i]; break; }
      if (!s) return delay(80).then(function () { return fail(404, '量表不存在'); });
      var answers = (payload && payload.answers) || {};
      var total = 0;
      s.questions.forEach(function (q) { total += Number(answers[q.id] || 0); });
      var band = s.bands[0];
      for (var j = 0; j < s.bands.length; j++) {
        if (total >= s.bands[j].min && total <= s.bands[j].max) { band = s.bands[j]; break; }
      }
      var result = {
        resultId: uid('ar'),
        type: s.type,
        title: s.title,
        totalScore: total,
        maxScore: s.questions.length * 3,
        level: band.level,
        levelLabel: band.label,
        levelDesc: band.desc,
        advice: s.advice.slice(),
        answers: clone(answers),
        createdAt: new Date().toISOString()
      };
      d.assessments.push(result);
      persist();
      return mockLatency().then(function () { return ok({ result: clone(result) }); });
    },

    result: function (resultId) {
      var d = loadDB();
      var r = null;
      for (var i = 0; i < d.assessments.length; i++) if (d.assessments[i].resultId === resultId) { r = d.assessments[i]; break; }
      return mockLatency().then(function () {
        return r ? ok({ result: clone(r) }) : fail(404, '结果不存在');
      });
    },

    myAssessments: function () {
      var d = loadDB();
      return delay(80).then(function () {
        return ok({ results: clone(d.assessments.slice().sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; })) });
      });
    },

    /* ---- classroom ---- */
    classStats: function (classId) {
      var d = loadDB();
      var students = d.students.filter(function (s) { return s.classId === classId; });
      var unhandled = d.alerts.filter(function (a) { return a.classId === classId && !a.handled; });
      var moods = students.filter(function (s) { return s.latestMood; }).map(function (s) { return s.latestMood; });
      return mockLatency().then(function () {
        return ok({
          classId: classId,
          className: '高一 (3) 班',
          totalStudents: students.length,
          averageMood: avg(moods),
          alertCount: unhandled.length,
          todayCheckinCount: students.filter(function (s) { return s.checkinToday; }).length,
          checkinRate: students.length ? Math.round(students.filter(function (s) { return s.checkinToday; }).length / students.length * 100) : 0
        });
      });
    },

    classStudents: function (classId) {
      var d = loadDB();
      var list = d.students.filter(function (s) { return s.classId === classId; })
        .sort(function (a, b) {
          var order = { red: 0, orange: 1, yellow: 2, green: 3 };
          return order[a.riskLevel] - order[b.riskLevel];
        });
      return mockLatency().then(function () { return ok({ students: clone(list) }); });
    },

    classAlerts: function (classId) {
      var d = loadDB();
      var order = { red: 0, orange: 1, yellow: 2, green: 3 };
      var list = d.alerts.filter(function (a) { return a.classId === classId && !a.reviewed; })
        .sort(function (a, b) {
          if (a.handled !== b.handled) return a.handled ? 1 : -1;
          return order[a.riskLevel] - order[b.riskLevel];
        });
      return mockLatency().then(function () { return ok({ alerts: clone(list) }); });
    },

    reviewAlert: function (alertId, payload) {
      var d = loadDB();
      var a = null;
      for (var i = 0; i < d.alerts.length; i++) if (d.alerts[i].id === alertId) { a = d.alerts[i]; break; }
      if (!a) return delay(80).then(function () { return fail(404, '预警不存在'); });
      var decision = (payload && payload.decision) || 'observe';
      a.handled = true;
      a.reviewed = true;
      a.reviewDecision = decision;
      a.reviewNote = (payload && payload.note) || '';
      a.reviewedAt = new Date().toISOString();
      persist();
      return mockLatency().then(function () { return ok({ alert: clone(a) }); });
    },

    /* ---- parents ---- */
    children: function () {
      var d = loadDB();
      return mockLatency().then(function () { return ok({ children: clone(d.bindings) }); });
    },

    bind: function (payload) {
      var sid = String((payload && payload.studentId) || '').trim();
      if (!sid) return delay(80).then(function () { return fail(400, '请填写孩子的星屿号'); });
      var d = loadDB();
      var hit = null;
      for (var i = 0; i < d.students.length; i++) if (d.students[i].id === sid) { hit = d.students[i]; break; }
      if (!hit) return delay(80).then(function () { return fail(404, '没有找到这个星屿号，请核对后重试'); });
      for (var j = 0; j < d.bindings.length; j++) {
        if (d.bindings[j].studentId === sid) {
          return delay(80).then(function () { return fail(409, '已经绑定过这个孩子'); });
        }
      }
      var b = {
        bindingId: uid('bind'),
        studentId: hit.id,
        studentNickname: hit.nickname,
        studentAvatar: hit.avatar,
        relation: (payload && payload.relation) || '家长',
        authorized: false,
        createdAt: new Date().toISOString()
      };
      d.bindings.push(b);
      persist();
      return mockLatency().then(function () { return ok({ binding: clone(b) }); });
    },

    authorize: function (bindingId, authorized) {
      var d = loadDB();
      var b = null;
      for (var i = 0; i < d.bindings.length; i++) if (d.bindings[i].bindingId === bindingId) { b = d.bindings[i]; break; }
      if (!b) return delay(80).then(function () { return fail(404, '绑定关系不存在'); });
      b.authorized = !!authorized;
      persist();
      return mockLatency().then(function () { return ok({ binding: clone(b) }); });
    },

    unbind: function (bindingId) {
      var d = loadDB();
      var before = d.bindings.length;
      d.bindings = d.bindings.filter(function (b) { return b.bindingId !== bindingId; });
      persist();
      return mockLatency().then(function () {
        return d.bindings.length < before ? ok({ removed: true }) : fail(404, '绑定关系不存在');
      });
    },

    childMood: function (bindingId, payload) {
      var d = loadDB();
      var b = null;
      for (var i = 0; i < d.bindings.length; i++) if (d.bindings[i].bindingId === bindingId) { b = d.bindings[i]; break; }
      if (!b) return delay(80).then(function () { return fail(404, '绑定关系不存在'); });
      if (!b.authorized) return delay(80).then(function () { return fail(403, '孩子尚未授权查看情绪数据'); });
      var days = Number((payload && payload.days) || 7);
      var list = moodOf(b.studentId, days);
      var levels = list.map(function (r) { return r.moodLevel; });
      return mockLatency().then(function () {
        return ok({
          studentId: b.studentId,
          studentNickname: b.studentNickname,
          history: clone(list),
          trend: trendOf(list),
          summary: {
            days: days,
            checkinCount: list.length,
            averageMood: avg(levels),
            lowDays: levels.filter(function (v) { return v <= 2; }).length,
            lastCheckinDate: list.length ? list[list.length - 1].checkinDate : ''
          }
        });
      });
    },

    emergencyAlert: function () {
      var d = loadDB();
      var a = null;
      for (var i = 0; i < d.alerts.length; i++) {
        if (d.alerts[i].riskLevel === 'red' && !d.alerts[i].confirmedByParent) { a = d.alerts[i]; break; }
      }
      return mockLatency().then(function () {
        return ok({
          alert: a ? {
            alertId: a.id,
            studentId: a.studentId,
            studentName: a.studentName,
            level: a.riskLevel,
            reason: a.reason,
            createdAt: a.createdAt,
            confirmed: !!a.confirmedByParent
          } : null
        });
      });
    },

    confirmAlert: function (alertId) {
      var d = loadDB();
      var a = null;
      for (var i = 0; i < d.alerts.length; i++) if (d.alerts[i].id === alertId) { a = d.alerts[i]; break; }
      if (!a) return delay(80).then(function () { return fail(404, '预警不存在'); });
      a.confirmedByParent = true;
      persist();
      return mockLatency().then(function () {
        return ok({
          alert: {
            alertId: a.id,
            studentId: a.studentId,
            studentName: a.studentName,
            level: a.riskLevel,
            reason: a.reason,
            createdAt: a.createdAt,
            confirmed: true
          }
        });
      });
    },

    resources: function (type) {
      var d = loadDB();
      var list = d.resources.filter(function (r) { return !type || r.type === type; })
        .sort(function (a, b) { return a.priority - b.priority; });
      return delay(60).then(function () { return ok({ resources: clone(list) }); });
    },

    /* ---- risk / content ---- */
    riskLevel: function () {
      var lv = 'green';
      var mine = moodOf(currentUserId(), 7);
      var low = mine.filter(function (r) { return r.moodLevel <= 2; }).length;
      if (low >= 4) lv = 'red';
      else if (low >= 3) lv = 'orange';
      else if (low >= 2) lv = 'yellow';
      return delay(60).then(function () {
        return ok({ userId: currentUserId(), level: lv, lowDays: low, updatedAt: stamp(0) });
      });
    },

    hotlines: function () {
      var d = loadDB();
      return delay(40).then(function () {
        return ok({ hotlines: clone(d.resources.filter(function (r) { return r.type === 'hotline' || r.type === 'emergency'; })) });
      });
    },

    meditations: function (category) {
      var d = loadDB();
      return delay(80).then(function () {
        return ok({ meditations: clone(d.meditations.filter(function (m) { return !category || m.category === category; })) });
      });
    },

    breathing: function (type) {
      var ex = BREATHING[type || '478'] || BREATHING['478'];
      return delay(60).then(function () { return ok({ exercise: clone(ex) }); });
    }
  };

  /* ================= 6. 真实网络实现 ================= */

  function request(method, path, body) {
    var headers = { 'Content-Type': 'application/json' };
    var tk = '';
    var s = getSession();
    if (s && s.token) tk = s.token;
    if (tk) headers['Authorization'] = 'Bearer ' + tk;

    var ctrl = (typeof global.AbortController !== 'undefined') ? new global.AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, TIMEOUT_MS);

    return fetch(BASE_URL + path, {
      method: method,
      headers: headers,
      body: body == null ? undefined : JSON.stringify(body),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      clearTimeout(timer);
      return res.json().catch(function () { return null; }).then(function (json) {
        if (res.status === 401) clearSession();
        if (!res.ok) {
          var msg = (json && (json.message || json.error)) || ('请求失败（HTTP ' + res.status + '）');
          return fail(res.status, msg);
        }
        if (json && typeof json.code !== 'undefined') {
          if (json.code !== 0 && json.code !== 200) {
            return fail(json.code, json.message || '接口返回异常');
          }
          return ok(json.data);
        }
        return ok(json);
      });
    }).catch(function (err) {
      clearTimeout(timer);
      if (err && err.name === 'AbortError') return fail(408, '请求超时，请稍后重试');
      return fail(0, '网络不可用，请检查连接');
    });
  }

  /* ================= 6b. 后端字段适配（真实模式） ================= */
  /* 契约见 mvp-frontend/docs/api-contract.md。此处只做字段/结构归一化，
     不做业务判断；mock 分支的数据本身已是 UI 结构，不经过本区块。 */

  var LEVEL_LABEL = { green: '平稳', yellow: '需关注', orange: '需重点跟进', red: '高危' };
  var LEVEL_DESC = {
    green: '近期情绪状态平稳，保持规律作息与适度运动即可。',
    yellow: '近期情绪有波动，建议多关注睡眠与压力来源。',
    orange: '情绪持续偏低，建议尽快与心理老师沟通。',
    red: '存在较高风险信号，请立即联系学校心理老师或拨打心理援助热线。'
  };
  var LEVEL_ALIAS = {
    low: 'green', normal: 'green', good: 'green', stable: 'green',
    mild: 'yellow', moderate: 'yellow', medium: 'orange',
    high: 'orange', severe: 'red', critical: 'red', danger: 'red'
  };
  var RELATION_TO_BIND = {
    '妈妈': 'mother', '爸爸': 'father',
    '爷爷': 'grandparent', '奶奶': 'grandparent', '其他监护人': 'other'
  };
  var BIND_TO_RELATION = {
    mother: '妈妈', father: '爸爸',
    grandparent: '奶奶', guardian: '其他监护人', other: '其他监护人'
  };

  var lastScale = null;   /* 最近一次拉取的量表：答案拍平与分值换算要用 */
  var childIndex = {};    /* bindingId -> 绑定对象：真实接口按 studentId 取心情 */

  function pick(obj, camel, snake, fallback) {
    if (!obj) return fallback;
    if (typeof obj[camel] !== 'undefined' && obj[camel] !== null) return obj[camel];
    if (typeof obj[snake] !== 'undefined' && obj[snake] !== null) return obj[snake];
    return fallback;
  }

  function num(v, fallback) {
    var n = Number(v);
    if (isFinite(n)) return n;
    return typeof fallback === 'number' ? fallback : 0;
  }

  function normLevel(v) {
    var k = String(v == null ? '' : v).toLowerCase();
    if (LEVEL_LABEL[k]) return k;
    if (LEVEL_ALIAS[k]) return LEVEL_ALIAS[k];
    return 'green';
  }

  function normalizeOptions(options, weight) {
    var list = Array.isArray(options) ? options : [];
    var w = Array.isArray(weight) ? weight : [];
    return list.map(function (o, i) {
      if (o && typeof o === 'object') {
        var v = (typeof o.value !== 'undefined') ? o.value
          : ((typeof o.score !== 'undefined') ? o.score : i);
        return { value: num(v, i), label: String(o.label || o.text || o.name || '') };
      }
      return { value: num(w[i], i), label: String(o) };
    });
  }

  function adaptSession(raw) {
    var box = raw || {};
    var user = box.user || box;
    var prev = getSession();
    var token = pick(box, 'token', 'access_token', '') || pick(user, 'token', 'access_token', '');
    if (!token && prev) token = prev.token;
    var role = String(user.role || box.role || '').toLowerCase();
    if (['student', 'teacher', 'parent'].indexOf(role) < 0) role = (prev && prev.role) || 'student';
    return {
      token: token,
      role: role,
      userId: String(pick(user, 'userId', 'user_id', pick(user, 'id', 'id', ''))),
      nickname: String(pick(user, 'nickname', 'nickname', pick(user, 'username', 'username', ''))),
      avatar: String(pick(user, 'avatar', 'avatar', '')),
      classId: String(pick(user, 'classId', 'class_id', '')),
      loginAt: String(pick(box, 'loginAt', 'login_at', new Date().toISOString()))
    };
  }

  function adaptScale(raw, typeHint) {
    var box = (raw && raw.scale) ? raw.scale : (raw || {});
    var qs = Array.isArray(box.questions) ? box.questions : [];
    var questions = qs.map(function (q, i) {
      return {
        id: String(pick(q, 'id', 'id', i + 1)),
        index: i + 1,
        text: String(pick(q, 'text', 'question', pick(q, 'title', 'title', '题目 ' + (i + 1)))),
        options: normalizeOptions(q.options, q.weight)
      };
    });
    var maxScore = 0;
    questions.forEach(function (q) {
      var mx = 0;
      q.options.forEach(function (o) { if (o.value > mx) mx = o.value; });
      maxScore += mx;
    });
    if (!maxScore) maxScore = num(pick(box, 'maxScore', 'max_score', 0), 0);
    var scale = {
      type: String(box.type || typeHint || ''),
      title: String(pick(box, 'title', 'title', '心理量表')),
      intro: String(pick(box, 'intro', 'intro', pick(box, 'description', 'description', ''))),
      questions: questions,
      maxScore: maxScore,
      bands: Array.isArray(box.bands) ? box.bands : []
    };
    lastScale = scale;
    return scale;
  }

  function fetchScale(type) {
    return request('GET', '/v1/assessment/questions/' + encodeURIComponent(type)).then(function (res) {
      if (!res.ok) return res;
      return ok({ scale: adaptScale(res.data, type) });
    });
  }

  function adaptResult(raw, typeHint) {
    var box = (raw && raw.result) ? raw.result : (raw || {});
    var scale = (lastScale && (!typeHint || lastScale.type === typeHint)) ? lastScale : null;
    var level = normLevel(pick(box, 'level', 'risk_level', 'green'));
    var advice = [];
    var a1 = box.suggestions || box.advice;
    if (Array.isArray(a1)) advice = advice.concat(a1);
    if (Array.isArray(box.recommendations)) advice = advice.concat(box.recommendations);
    advice = advice.filter(function (x) { return x != null && String(x).trim() !== ''; }).map(String);
    var maxScore = num(pick(box, 'maxScore', 'max_score', 0), 0) || (scale ? scale.maxScore : 0);
    return {
      resultId: String(pick(box, 'resultId', 'result_id', uid('res'))),
      type: String(box.type || typeHint || (scale && scale.type) || ''),
      title: String(box.title || (scale && scale.title) || '测评结果'),
      totalScore: num(pick(box, 'totalScore', 'total_score', 0), 0),
      maxScore: maxScore,
      level: level,
      levelLabel: String(pick(box, 'levelLabel', 'level_label', LEVEL_LABEL[level])),
      levelDesc: String(pick(box, 'levelDesc', 'level_desc', pick(box, 'description', 'description', LEVEL_DESC[level]))),
      advice: advice,
      createdAt: String(pick(box, 'createdAt', 'created_at', new Date().toISOString()))
    };
  }

  function adaptClassStats(raw, classId) {
    var box = raw || {};
    var st = box.statistics || box.stats || box;
    var chart = box.chartData || box.chart_data || {};
    var rate = num(pick(st, 'checkinRate', 'checkin_rate', 0), 0);
    if (rate > 0 && rate <= 1) rate = rate * 100;
    return {
      classId: String(pick(box, 'classId', 'class_id', classId || '')),
      className: String(pick(box, 'className', 'class_name', '班级')),
      totalStudents: num(pick(st, 'totalStudents', 'total_students', 0), 0),
      averageMood: Math.round(num(pick(st, 'averageMood', 'average_mood', 0), 0) * 10) / 10,
      alertCount: num(pick(st, 'alertCount', 'alert_count', 0), 0),
      todayCheckinCount: num(pick(st, 'todayCheckinCount', 'today_checkin_count', 0), 0),
      checkinRate: Math.round(rate),
      trend: Array.isArray(chart.trend) ? chart.trend : (Array.isArray(box.trend) ? box.trend : [])
    };
  }

  function adaptStudents(raw, classId) {
    var box = raw || {};
    var list = Array.isArray(box) ? box : (box.students || box.list || box.items || []);
    var students = list.map(function (s, i) {
      var date = String(pick(s, 'latestMoodDate', 'latest_mood_date', ''));
      var today = pick(s, 'checkinToday', 'checkin_today', null);
      if (today === null) today = !!date && date === dayKey(0);
      return {
        id: String(pick(s, 'id', 'student_id', 'stu-' + (i + 1))),
        nickname: String(pick(s, 'nickname', 'nickname', pick(s, 'name', 'name', '学生'))),
        avatar: String(pick(s, 'avatar', 'avatar', '🙂')),
        classId: String(pick(s, 'classId', 'class_id', classId || '')),
        riskLevel: normLevel(pick(s, 'riskLevel', 'risk_level', 'green')),
        latestMood: num(pick(s, 'latestMood', 'latest_mood', 0), 0) || null,
        latestMoodDate: date,
        checkinToday: !!today,
        tags: Array.isArray(s.tags) ? s.tags : [],
        note: String(pick(s, 'note', 'note', ''))
      };
    });
    var order = { red: 0, orange: 1, yellow: 2, green: 3 };
    students.sort(function (a, b) { return order[a.riskLevel] - order[b.riskLevel]; });
    return students;
  }

  function adaptAlerts(raw, classId) {
    var box = raw || {};
    var list = Array.isArray(box) ? box : (box.alerts || box.list || box.items || []);
    var alerts = list.filter(function (a) { return pick(a, 'reviewed', 'reviewed', false) !== true; })
      .map(function (a, i) {
        return {
          id: String(pick(a, 'id', 'alert_id', pick(a, 'alertId', 'alert_id', 'alt-' + (i + 1)))),
          classId: String(pick(a, 'classId', 'class_id', classId || '')),
          studentId: String(pick(a, 'studentId', 'student_id', '')),
          studentName: String(pick(a, 'studentName', 'student_name', pick(a, 'studentNickname', 'student_nickname', '学生'))),
          studentAvatar: String(pick(a, 'studentAvatar', 'student_avatar', '🙂')),
          riskLevel: normLevel(pick(a, 'riskLevel', 'risk_level', 'yellow')),
          reason: String(pick(a, 'reason', 'reason', '情绪指标异常')),
          source: String(pick(a, 'source', 'source', '系统监测')),
          createdAt: String(pick(a, 'createdAt', 'created_at', '')),
          handled: !!pick(a, 'handled', 'handled', false),
          reviewed: false,
          reviewDecision: '',
          reviewNote: '',
          reviewedAt: ''
        };
      });
    return alerts;
  }

  function adaptChildren(raw) {
    var box = raw || {};
    var list = Array.isArray(box) ? box : (box.children || box.list || box.items || []);
    var children = list.map(function (c) {
      var bindType = String(pick(c, 'bindType', 'bind_type', ''));
      var item = {
        bindingId: String(pick(c, 'bindingId', 'binding_id', pick(c, 'id', 'id', ''))),
        studentId: String(pick(c, 'studentId', 'student_id', '')),
        studentNickname: String(pick(c, 'studentNickname', 'student_nickname', pick(c, 'nickname', 'nickname', '孩子'))),
        studentAvatar: String(pick(c, 'studentAvatar', 'student_avatar', '🌱')),
        relation: String(c.relation || BIND_TO_RELATION[bindType] || '家长'),
        authorized: pick(c, 'authorized', 'authorized', true) !== false,
        createdAt: String(pick(c, 'createdAt', 'created_at', ''))
      };
      childIndex[item.bindingId] = item;
      return item;
    });
    return { children: children };
  }

  function adaptChildMood(raw, bindingId, studentId) {
    var box = raw || {};
    var list = Array.isArray(box.history) ? box.history : (Array.isArray(box.records) ? box.records : []);
    var history = list.map(function (r) {
      return {
        checkinDate: String(pick(r, 'checkinDate', 'checkin_date', pick(r, 'date', 'date', ''))),
        moodLevel: num(pick(r, 'moodLevel', 'mood_level', pick(r, 'value', 'value', 3)), 3)
      };
    }).sort(function (a, b) { return a.checkinDate < b.checkinDate ? -1 : 1; });

    var sum = box.summary || {};
    var count = pick(sum, 'checkinCount', 'checkin_count', null);
    var avgMood = pick(sum, 'averageMood', 'average_mood', null);
    var lowDays = pick(sum, 'lowDays', 'low_days', null);
    var lastDate = pick(sum, 'lastCheckinDate', 'last_checkin_date', '');
    if (count === null || avgMood === null || lowDays === null) {
      var total = 0, low = 0;
      history.forEach(function (r) {
        total += r.moodLevel;
        if (r.moodLevel <= 2) low += 1;
      });
      if (count === null) count = history.length;
      if (avgMood === null) avgMood = history.length ? Math.round(total / history.length * 10) / 10 : 0;
      if (lowDays === null) lowDays = low;
      if (!lastDate && history.length) lastDate = history[history.length - 1].checkinDate;
    }
    var child = childIndex[bindingId] || {};
    return {
      studentId: String(pick(box, 'studentId', 'student_id', studentId || child.studentId || '')),
      studentNickname: String(pick(box, 'studentNickname', 'student_nickname', child.studentNickname || '孩子')),
      history: history,
      trend: String(pick(box, 'trend', 'trend', 'flat')),
      summary: {
        days: num(pick(sum, 'days', 'days', 14), 14),
        checkinCount: num(count, 0),
        averageMood: num(avgMood, 0),
        lowDays: num(lowDays, 0),
        lastCheckinDate: String(lastDate || '')
      }
    };
  }

  function adaptEmergencyAlert(raw) {
    var box = raw || {};
    var a = box.alert || box.data || box;
    if (!a) return { alert: null };
    var id = pick(a, 'alertId', 'alert_id', pick(a, 'id', 'id', ''));
    if (!id) return { alert: null };
    return {
      alert: {
        alertId: String(id),
        studentId: String(pick(a, 'studentId', 'student_id', '')),
        studentName: String(pick(a, 'studentName', 'student_name', pick(a, 'studentNickname', 'student_nickname', '孩子'))),
        level: normLevel(pick(a, 'level', 'risk_level', 'red')),
        reason: String(pick(a, 'reason', 'reason', '出现高危情绪信号')),
        createdAt: String(pick(a, 'createdAt', 'created_at', '')),
        confirmed: !!pick(a, 'confirmed', 'confirmed', false)
      }
    };
  }

  function adaptRiskLevel(raw) {
    var box = raw || {};
    var level = normLevel(pick(box, 'level', 'current_risk_level', 'green'));
    var lowDays = pick(box, 'lowDays', 'low_days', null);
    if (lowDays === null) {
      lowDays = 0;
      var hist = Array.isArray(box.history) ? box.history : [];
      hist.forEach(function (h) {
        var v = num(pick(h, 'value', 'mood_level', pick(h, 'moodLevel', 'mood_level', 0)), 0);
        if (v > 0 && v <= 2) lowDays += 1;
      });
    }
    return {
      userId: String(pick(box, 'userId', 'user_id', currentUserId())),
      level: level,
      lowDays: num(lowDays, 0),
      updatedAt: String(pick(box, 'updatedAt', 'updated_at', new Date().toISOString()))
    };
  }

  function adaptList(raw, key) {
    var box = raw || {};
    if (Array.isArray(box)) { var o = {}; o[key] = box; return o; }
    if (Array.isArray(box[key])) return box;
    var list = box.list || box.items || box.results || [];
    var out = {};
    out[key] = Array.isArray(list) ? list : [];
    return out;
  }

  /* ================= 7. 对外接口 ================= */

  function call(mockFn, liveArgs) {
    if (USE_MOCK) return mockFn();
    return request(liveArgs[0], liveArgs[1], liveArgs[2]);
  }

  var API = {
    /* ---- 元信息 ---- */
    get mode() { return USE_MOCK ? 'mock' : 'live'; },
    get baseUrl() { return BASE_URL; },

    configure: function (opts) {
      opts = opts || {};
      if (typeof opts.useMock === 'boolean') USE_MOCK = opts.useMock;
      if (opts.baseUrl) BASE_URL = String(opts.baseUrl).replace(/\/$/, '');
    },

    resetDemo: function () {
      removeRaw(DB_KEY);
      db = null;
      loadDB();
      return Promise.resolve(ok({ reset: true }));
    },

    /* ---- auth ---- */
    auth: {
      login: function (payload) {
        if (USE_MOCK) return Mock.login(payload);
        payload = payload || {};
        var req;
        if (payload.phone && payload.code) {
          req = request('POST', '/v1/auth/login/phone', { phone: payload.phone, code: payload.code });
        } else if (payload.username && payload.password) {
          req = request('POST', '/v1/auth/login', {
            username: payload.username,
            password: payload.password,
            role: payload.role
          });
        } else {
          return Promise.resolve(fail(400, '真实模式需要输入账号密码或手机验证码'));
        }
        return req.then(function (res) {
          if (!res.ok) return res;
          var session = adaptSession(res.data);
          if (!session.token) return fail(401, '登录成功但未返回 token');
          setSession(session);
          return ok({ session: session });
        });
      },
      logout: function () {
        if (USE_MOCK) { clearSession(); return Promise.resolve(ok({ loggedOut: true })); }
        var req = request('POST', '/v1/auth/logout', null);
        return req.then(function (res) {
          clearSession();
          return res.ok ? ok({ loggedOut: true }) : res;
        });
      },
      current: function () { return getSession(); },
      updateProfile: function (patch) {
        var s = getSession();
        if (!s) return Promise.resolve(fail(401, '尚未登录'));
        var next = {};
        for (var k in s) if (Object.prototype.hasOwnProperty.call(s, k)) next[k] = s[k];
        for (var j in patch) if (Object.prototype.hasOwnProperty.call(patch, j)) next[j] = patch[j];
        setSession(next);
        return delay(40).then(function () { return ok({ session: next }); });
      }
    },

    /* ---- 心情打卡 ---- */
    mood: {
      checkin: function (payload) {
        if (USE_MOCK) return Mock.checkin(payload);
        return request('POST', '/v1/mood/checkin', {
          userId: currentUserId(),
          moodLevel: payload && payload.moodLevel,
          tags: (payload && payload.tags) || [],
          note: (payload && payload.note) || ''
        });
      },
      history: function (payload) {
        var days = (payload && payload.days) || 7;
        if (USE_MOCK) return Mock.history(payload);
        return request('GET', '/v1/mood/history/' + encodeURIComponent(currentUserId()) + '?days=' + days);
      },
      chart: function () {
        if (USE_MOCK) return Mock.chart();
        return request('GET', '/v1/mood/chart/' + encodeURIComponent(currentUserId()));
      }
    },

    /* ---- 知识库 ---- */
    knowledge: {
      search: function (payload) {
        if (USE_MOCK) return Mock.search(payload);
        return request('POST', '/v1/knowledge/search', {
          query: (payload && payload.query) || '',
          category: (payload && payload.category) || '',
          top_k: (payload && payload.topK) || 10
        });
      },
      article: function (id) {
        if (USE_MOCK) return Mock.article(id);
        return request('GET', '/v1/knowledge/articles/' + encodeURIComponent(id));
      },
      categories: function () {
        if (USE_MOCK) return Mock.categories();
        return request('GET', '/v1/knowledge/categories');
      },
      stats: function () {
        if (USE_MOCK) return Mock.stats();
        return request('GET', '/v1/knowledge/stats');
      }
    },

    /* ---- 树人互助 ---- */
    community: {
      list: function (payload) {
        var page = (payload && payload.page) || 1;
        var size = (payload && payload.pageSize) || 10;
        if (USE_MOCK) return Mock.posts(payload);
        return request('GET', '/v1/community/posts?page=' + page + '&page_size=' + size);
      },
      get: function (postId) {
        if (USE_MOCK) return Mock.post(postId);
        return request('GET', '/v1/community/posts/' + encodeURIComponent(postId));
      },
      create: function (payload) {
        if (USE_MOCK) return Mock.createPost(payload);
        return request('POST', '/v1/community/posts', {
          userId: currentUserId(),
          title: payload && payload.title,
          content: payload && payload.content,
          tags: (payload && payload.tags) || [],
          urgencyLevel: (payload && payload.urgencyLevel) || 'normal'
        });
      },
      reply: function (postId, payload) {
        if (USE_MOCK) return Mock.reply(postId, payload);
        return request('POST', '/v1/community/posts/' + encodeURIComponent(postId) + '/reply', {
          userId: currentUserId(),
          content: payload && payload.content
        });
      }
    },

    /* ---- 量表 ---- */
    assessment: {
      types: function () { return USE_MOCK ? Mock.types() : request('GET', '/v1/assessment/types'); },
      questions: function (type) {
        return USE_MOCK ? Mock.questions(type) : fetchScale(type);
      },
      submit: function (payload) {
        if (USE_MOCK) return Mock.submitAssessment(payload);
        payload = payload || {};
        var type = payload.type;
        var answers = payload.answers || {};
        var go = function (scale) {
          /* 后端要数组且顺序与题目一致；UI 侧是 {qid: score} 对象 */
          var arr = scale.questions.map(function (q) {
            var v = answers[q.id];
            return num(v, 0);
          });
          return request('POST', '/v1/assessment/submit', {
            userId: currentUserId(),
            type: scale.type || type,
            answers: arr
          }).then(function (res) {
            if (!res.ok) return res;
            return ok({ result: adaptResult(res.data, scale.type || type) });
          });
        };
        if (lastScale && (!type || lastScale.type === type)) return go(lastScale);
        return fetchScale(type).then(function (res) {
          if (!res.ok) return res;
          return go(res.data.scale);
        });
      },
      result: function (resultId) {
        if (USE_MOCK) return Mock.result(resultId);
        return request('GET', '/v1/assessment/result/' + encodeURIComponent(resultId)).then(function (res) {
          if (!res.ok) return res;
          return ok({ result: adaptResult(res.data) });
        });
      },
      mine: function () {
        if (USE_MOCK) return Mock.myAssessments();
        return request('GET', '/v1/assessment/results').then(function (res) {
          if (!res.ok) return res;
          var box = res.data || {};
          var list = Array.isArray(box) ? box : (box.results || box.list || box.items || []);
          return ok({ results: list.map(function (r) { return adaptResult(r); }) });
        });
      }
    },

    /* ---- 班级 / 教师端 ---- */
    classroom: {
      stats: function (classId) {
        if (USE_MOCK) return Mock.classStats(classId);
        return request('GET', '/v1/classroom/' + encodeURIComponent(classId) + '/stats').then(function (res) {
          if (!res.ok) return res;
          return ok(adaptClassStats(res.data, classId));
        });
      },
      students: function (classId) {
        if (USE_MOCK) return Mock.classStudents(classId);
        return request('GET', '/v1/classroom/' + encodeURIComponent(classId) + '/students').then(function (res) {
          if (!res.ok) return res;
          return ok({ students: adaptStudents(res.data, classId) });
        });
      },
      alerts: function (classId) {
        if (USE_MOCK) return Mock.classAlerts(classId);
        return request('GET', '/v1/classroom/' + encodeURIComponent(classId) + '/alerts').then(function (res) {
          if (!res.ok) return res;
          return ok({ alerts: adaptAlerts(res.data, classId) });
        });
      },
      review: function (alertId, payload) {
        if (USE_MOCK) return Mock.reviewAlert(alertId, payload);
        payload = payload || {};
        return request('POST', '/v1/classroom/alerts/' + encodeURIComponent(alertId) + '/review', {
          reviewerId: currentUserId(),
          decision: payload.decision,
          note: payload.note || ''
        });
      }
    },

    /* ---- 家长端 ---- */
    parents: {
      children: function () {
        if (USE_MOCK) return Mock.children();
        return request('GET', '/v1/parents/children').then(function (res) {
          if (!res.ok) return res;
          return ok(adaptChildren(res.data));
        });
      },
      bind: function (payload) {
        if (USE_MOCK) return Mock.bind(payload);
        payload = payload || {};
        return request('POST', '/v1/parents/children/bind', {
          studentId: payload.studentId,
          bindType: RELATION_TO_BIND[payload.relation] || 'other',
          relation: payload.relation
        }).then(function (res) {
          if (!res.ok) return res;
          var box = res.data || {};
          var item = box.binding || box;
          return ok({ binding: adaptChildren([item]).children[0] });
        });
      },
      authorize: function (bindingId, authorized) {
        if (USE_MOCK) return Mock.authorize(bindingId, authorized);
        if (authorized === false) return Promise.resolve(fail(501, '后端暂未提供取消授权接口，请使用「解除绑定」'));
        return request('POST', '/v1/parents/children/' + encodeURIComponent(bindingId) + '/authorize', null);
      },
      unbind: function (bindingId) {
        if (USE_MOCK) return Mock.unbind(bindingId);
        return request('DELETE', '/v1/parents/children/' + encodeURIComponent(bindingId));
      },
      childMood: function (bindingId, payload) {
        var days = (payload && payload.days) || 7;
        if (USE_MOCK) return Mock.childMood(bindingId, payload);
        var fetchMood = function (studentId) {
          return request('GET', '/v1/parent/mood/' + encodeURIComponent(studentId) + '?days=' + days)
            .then(function (res) {
              if (!res.ok) return res;
              return ok(adaptChildMood(res.data, bindingId, studentId));
            });
        };
        var known = childIndex[bindingId];
        if (known && known.studentId) return fetchMood(known.studentId);
        /* 未绑定索引时先补一次绑定列表，再按 studentId 取心情 */
        return API.parents.children().then(function (res) {
          if (!res.ok) return res;
          var hit = childIndex[bindingId];
          if (!hit || !hit.studentId) return fail(404, '绑定关系不存在');
          return fetchMood(hit.studentId);
        });
      },
      emergencyAlert: function () {
        if (USE_MOCK) return Mock.emergencyAlert();
        return request('GET', '/v1/parents/emergency/alert').then(function (res) {
          if (!res.ok) return res;
          return ok(adaptEmergencyAlert(res.data));
        });
      },
      confirmAlert: function (alertId) {
        if (USE_MOCK) return Mock.confirmAlert(alertId);
        return request('POST', '/v1/parents/emergency/alert/' + encodeURIComponent(alertId) + '/confirm', null)
          .then(function (res) {
            if (!res.ok) return res;
            var out = adaptEmergencyAlert(res.data);
            return ok({ alert: out.alert });
          });
      },
      resources: function (type) {
        return USE_MOCK ? Mock.resources(type)
          : request('GET', '/v1/parents/emergency/resources' + (type ? '/' + encodeURIComponent(type) : ''));
      }
    },

    /* ---- 风险 / 内容 ---- */
    risk: {
      level: function () {
        if (USE_MOCK) return Mock.riskLevel();
        return request('GET', '/v1/risk/level/' + encodeURIComponent(currentUserId())).then(function (res) {
          if (!res.ok) return res;
          return ok(adaptRiskLevel(res.data));
        });
      },
      hotlines: function () {
        if (USE_MOCK) return Mock.hotlines();
        return request('GET', '/v1/risk/crisis/hotlines').then(function (res) {
          if (!res.ok) return res;
          return ok(adaptList(res.data, 'hotlines'));
        });
      }
    },

    content: {
      meditations: function (payload) {
        var cat = (payload && payload.category) || '';
        if (USE_MOCK) return Mock.meditations(cat);
        return request('GET', '/v1/content/meditations' + (cat ? '?category=' + encodeURIComponent(cat) : ''))
          .then(function (res) {
            if (!res.ok) return res;
            return ok(adaptList(res.data, 'meditations'));
          });
      },
      breathing: function (type) {
        if (USE_MOCK) return Mock.breathing(type);
        return request('GET', '/v1/content/breathing/' + encodeURIComponent(type || '478')).then(function (res) {
          if (!res.ok) return res;
          var box = res.data || {};
          return ok({ exercise: box.exercise || box });
        });
      }
    }
  };

  global.StarIsleAPI = API;
})(window);
