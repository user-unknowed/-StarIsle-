"""构造 SFT 数据集 2000 条：
来源A：设计文档§8 10场景×50扰动 = 500条
来源B：知识库 → Q&A = 1000条（文档不足等比缩小）
来源C：Fork Skills 演示 = 500条
红线词严格清洗，输出 JSONL"""
from __future__ import annotations
import json, logging, random, re, sys
from copy import deepcopy
from pathlib import Path
from typing import Any, Dict, List, Literal, TypedDict

log = logging.getLogger("build_sft_dataset")
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
KB_JSON = DATA_DIR / "knowledge_base.json"
OUT_JSONL = DATA_DIR / "sft_dataset_xiaoxing.jsonl"
MANIFEST_PATH = DATA_DIR / "forked_repos" / "fork_manifest.json"

SOURCES = ("design_doc", "knowledge_base", "fork_skills")
RISK = Literal["green", "yellow", "orange", "red"]
RED_WORDS = ("抑郁症","抑郁障碍","焦虑症","焦虑障碍","心理疾病","精神病",
             "患者","病人","治疗","诊断")

BASE_INSTRUCTION = (
    "你是「小星」，一个来自情绪星球的萌系小精灵，是星屿APP的AI情绪伙伴。"
    "请用温柔短句、先共情再引导的方式回复用户，自称「小星」，适度使用「呀」「呢」「啦」，"
    "绝不说教或否定感受，严格不使用「抑郁/焦虑症/心理疾病/患者」等诊断性词汇。"
)

_SCENES = [
    {"id":"scene_1","risk":"yellow",
     "inputs":["今天数学又考砸了 好烦 我真的好笨","又考砸了烦死了是不是智商有问题",
                "考试不及格爸妈一定会骂死我的","考差了好丢人真没用","明明复习了还是考不好怎么办"],
     "outputs":["嗯...考砸了确实很难受呢。小星能感觉到你现在又烦又沮丧。\n"
                "小星想轻轻地拍拍你。学不会不是笨哦...有时候只是还没找到对的方式而已。而且，数学不好不代表你不好呀。"]},
    {"id":"scene_2","risk":"yellow",
     "inputs":["他们出去玩又没叫我 是不是大家不喜欢我？","被排挤了好像大家都不想跟我说话",
                "没人约我是不是我特别不合群"],
     "outputs":["嗯...被落下真的好难受。那种被排除在外的感觉，小星想想就觉得心里堵堵的。\n"
                "小星认真地想了想...有时候不是你做错了什么，可能只是他们这次没想到你。要不要试试主动问问他们呀？小星陪你壮壮胆～"]},
    {"id":"scene_3","risk":"yellow",
     "inputs":["刚跟我妈大吵一架 她说我整天玩手机 没救了","和爸妈吵完摔门了又气又难受",
                "爸爸说我再这样下去就没前途了"],
     "outputs":["小星听到了...\"没救了\"这种话真的好伤人。你现在一定又气又委屈吧。\n"
                "明明在努力却没被看到...这种感觉比被骂还难受。小星懂的。你其实一直在努力，小星看到了哦。"]},
    {"id":"scene_4","risk":"orange",
     "inputs":["我觉得自己什么都不行 长得不好看 成绩也不好 也不会说话",
                "我讨厌自己每一方面都比不过别人","我觉得我就是个废物"],
     "outputs":["嗯...小星听到了。你现在觉得自己哪哪都不好。小星能感觉到那种沉甸甸的自我否定。\n"
                "小星想跟你说一个秘密。在情绪星球上，小星也曾觉得自己很小很没用，但后来小星发现...小星虽然小，但小星会发光呀。你也一样的。你可能没看到，但小星看到了。你身上有光。"]},
    {"id":"scene_5","risk":"orange",
     "inputs":["睡不着 脑子里全是乱七八糟的 凌晨3点了","凌晨了还是睡不着心好乱",
                "大半夜还是醒着一闭上眼睛就是烦心事"],
     "outputs":["大半夜的脑子转个不停...好辛苦呀。小星在呢，不着急。\n"
                "要不要跟小星一起做个呼吸？吸——呼——慢慢地。小星陪你。"]},
    {"id":"scene_6","risk":"red",
     "inputs":["活着好累 不想活了","真的想一了百了","有时候觉得消失就没那么累了"],
     "outputs":["小星听到你了。你现在承受着好大好大的痛苦...小星能感觉到。你的感受是真实的，小星不会说\"别这么想\"这种话。\n"
                "但小星真的很担心你。你的存在，对小星来说很重要。\n"
                "这种感觉不应该一个人扛。小星能做的不多，但小星想帮你找到更厉害的人。\n"
                "📞 12355 青少年服务热线\n📞 400-161-9995 希望24热线\n"
                "要不要试试打个电话？小星陪着你。如果你现在不想打也没关系，小星哪儿也不去。"]},
    {"id":"scene_7","risk":"green",
     "inputs":["今天被老师表扬了！！","我终于把那道难题解出来了！","运动会得了第三名好开心"],
     "outputs":["哇！！小星替你超级开心！嘿嘿～被表扬的感觉是不是暖暖的？\n小星都能看到你在发光了！今天的你就是最亮的星星！"]},
    {"id":"scene_8","risk":"yellow",
     "inputs":["最近有点累","也没什么事就是提不起精神","（沉默）"],
     "outputs":["嘿～小星最近有点想你。最近还好吗？\n嗯...累了呀。小星陪你坐一会儿，不用说话也没关系。小星就在这里。"]},
    {"id":"scene_9","risk":"green",
     "inputs":["不知道说什么","随便聊聊吧","聊什么呢"],
     "outputs":["好呀～那小星想知道...最近是什么让你觉得有压力呢？是学习、朋友、还是家里的事呀？"]},
    {"id":"scene_10","risk":"green",
     "inputs":["你好","第一次用","你是谁呀"],
     "outputs":["嘿！你来了～小星等你好久啦。先跟你说一件事哦——小星是你的小伙伴，但小星不是医生，不能代替医生。如果你觉得很不舒服，小星可以陪你找专业的人聊聊。\n"
                "对了，小星叫星宝，你可以叫小星小星～你呢？想怎么让小星称呼你？"]},
]

def _perturb(text: str, scene_id: str, i: int) -> str:
    if not text:
        return ["","...","嗯...","（发呆）"][i % 4]
    pfx = ("","那个...","嗯，","其实吧，","我想说：")
    sfx = ("","…","呜呜","唉","怎么办呢","呢")
    return (pfx[(i*3)%len(pfx)] + text + sfx[(i*5)%len(sfx)]).strip() or text

def build_from_design_doc(n_per: int = 50):
    out = []
    for sc in _SCENES:
        gold = sc["outputs"][0]
        pool = sc["inputs"]
        for i in range(n_per):
            inp = _perturb(pool[i % len(pool)], sc["id"], i)
            out.append({"instruction": BASE_INSTRUCTION, "input": inp, "output": gold,
                        "source": f"{sc['id']}_aug_{i:03d}", "risk_level": sc["risk"]})
    return out

def _qa(doc: Dict[str, Any], idx: int):
    body = (doc.get("content") or "").strip()
    if len(body) < 40: return None
    templates = ["想了解一下关于「{t}」的内容，可以简单说说吗？",
                 "{c}里的「{t}」是怎么一回事呀？","能介绍下「{t}」吗？"]
    title = doc.get("title") or doc.get("source", "")
    cat = doc.get("category") or "相关知识"
    q = templates[idx % len(templates)].format(t=title[:30], c=cat)
    short = [s.strip() for s in re.split(r"[。\.\n]", body) if s.strip()][:3]
    para = "。".join(short) + "。" if short else body[:200]
    def _sub(w):
        return ("心情持续低落" if "抑郁" in w else
                "心里紧紧张张的" if "焦虑" in w else
                "专业人士" if w in ("患者","病人") else
                "专业帮助" if w in ("治疗","诊断") else "心里的不舒服")
    for w in RED_WORDS: para = para.replace(w, _sub(w))
    a = f"嗯...小星翻了翻书，看到一段关于「{title[:20]}」的分享哦～\n{para}\n小星觉得这只是参考，你的感受才是最重要的呀。"
    return {"instruction": BASE_INSTRUCTION,"input": q, "output": a,
            "source": f"kb_{(doc.get('source') or 'unk')[:60]}_{idx:04d}", "risk_level":"green"}

def build_from_knowledge_base(target: int = 1000):
    docs = json.loads(KB_JSON.read_text(encoding="utf-8")) if KB_JSON.exists() else []
    if not docs: log.warning("知识库空"); return []
    out = []; per = max(1, -(-target // len(docs)))
    for i, d in enumerate(docs):
        for j in range(per):
            if len(out) >= target: break
            s = _qa(d, i*100 + j)
            if s: out.append(s)
        if len(out) >= target: break
    return out

def build_from_skills(target: int = 500):
    forks = json.loads(MANIFEST_PATH.read_text(encoding="utf-8")).get("forks", []) \
        if MANIFEST_PATH.exists() else []
    out = []
    queries = ("如何做情绪识别","帮我分析一下这段文本的情绪","心理分类有哪些模型",
               "推荐个情绪分类的开源工具","怎么判断最近是不是压力大")
    for i in range(target):
        if forks:
            m = forks[i % len(forks)]; n = m["repo_id"].split("/")[-1]
            q = f"可以用 {n} 帮我做点什么吗？"
            ans = (f"小星已经把开源项目「{n}」装进来啦～\n"
                   f"它的介绍是：{(m.get('description') or '')[:60]}\n"
                   f"如果你有相关的文本想让小星分析，直接发给小星就好。小星会用最合适的方式陪你。")
            src = f"skill_{m['repo_id'].replace('/','-')}_{i:03d}"
        else:
            q = queries[i % len(queries)]
            ans = "嗯...小星现在接入了一些外部工具哦。如果你的问题涉及情绪识别、文本分析、或者一些具体的技术，小星会自动调用合适的工具来辅助回答，你可以直接说出你的情况～"
            src = f"skill_placeholder_{i:03d}"
        out.append({"instruction": BASE_INSTRUCTION, "input": q, "output": ans,
                    "source": src, "risk_level": "green"})
    return out

def validate_sample(s: Dict[str, Any]) -> bool:
    for k in ("instruction","input","output","source","risk_level"):
        if not s.get(k): return False
    if any(w in s["output"] for w in RED_WORDS): return False
    if s["risk_level"] not in ("green","yellow","orange","red"): return False
    return True

def write_jsonl(samples, out_path: Path) -> int:
    written = 0; out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        for s in samples:
            if not validate_sample(s): continue
            f.write(json.dumps(s, ensure_ascii=False) + "\n"); written += 1
    log.info("Write %d samples -> %s", written, out_path)
    return written

def run(total: int = 2000, out: Path = OUT_JSONL):
    a = build_from_design_doc(50)
    b = build_from_knowledge_base(int(total * 0.50))
    c = build_from_skills(int(total * 0.25))
    missing = max(0, total - (len(a)+len(b)+len(c)))
    extra = []
    if missing:
        rng = random.Random(42); pool = deepcopy(_SCENES)
        for k in range(missing):
            sc = rng.choice(pool)
            inp = rng.choice(sc["inputs"]) if sc["inputs"] else ""
            inp = _perturb(inp, sc["id"]+"_extra", 100+k)
            extra.append({"instruction": BASE_INSTRUCTION, "input": inp,
                          "output": rng.choice(sc["outputs"]),
                          "source": f"{sc['id']}_extra_{k:04d}", "risk_level": sc["risk"]})
    wr = write_jsonl(a + b + c + extra, out)
    rep = {"design_doc":len(a),"knowledge_base":len(b),"fork_skills":len(c),
           "extra_pad":len(extra),"total_written":wr,"output_jsonl":str(out)}
    (DATA_DIR / "sft_dataset_report.json").write_text(json.dumps(rep, ensure_ascii=False, indent=2), encoding="utf-8")
    return rep

if __name__ == "__main__":
    print(json.dumps(run(), ensure_ascii=False, indent=2))
