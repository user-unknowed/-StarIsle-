"""grammar_checker.py - 中文回复语法规则检查器（高精度、纯规则、零外部依赖）

用途：
  1. 回归实测：对固定测试集的模型回复做语法违例检测，作为「零语法错误」的判定依据。
  2. 数据质检：构造训练样本时对 output 侧做语法预检，违例样本不入库。
  3. 纠错对构造：check -> auto_fix -> 复检，产出真实「有错回复 → 修正回复」训练对。

设计原则：宁漏勿错报。只做高置信度规则，避免把「小星」人设的正常口语（语气词、～、emoji、！！）误判为错误。
"""
from __future__ import annotations
import re
from typing import Any, Dict, List

# 句末合法结尾字符（全角句读 + 人设语气词 + 常用表情符）
_SENT_ENDERS = set("。！？!?…～~")
_PERSON_ENDERS = set("呀啦呢嘛哦喔哟哈嘿嘻嗯吧啊诶唉")
_LAUGHTER = set("哈呵嘻嘿")

# 结尾不允许出现的悬挂词（句被截断在高频连词/助词上）
_HANGING_TAIL = ("但是", "可是", "因为", "所以", "然后", "而且", "就是",
                 "如果", "虽然", "不过", "或者", "以及", "于是", "结果")

# 高置信度「的/地/得」误用白名单
# 注：不含「真地」——「认真地想了想」等正确用法（副词+地+动词）会被误伤，违背宁漏勿错报原则
_DE_WHITELIST = ("很地", "挺地", "好地很", "的的")

# 连续语气/连接词堆叠（双词连用且无标点分隔）
_WORD_DUP = ("然后", "就是", "但是", "可是", "所以", "而且", "因为",
             "真的", "好想", "超级", "特别", "一定")

_REPLACEMENT_CHAR = "\ufffd"


def _cjks(text: str) -> List[str]:
    return re.findall(r"[\u4e00-\u9fff]", text)


def check_grammar(text: str) -> List[Dict[str, str]]:
    """对单条回复做语法违例检测，返回违例列表（每项含 type/message/snippet）。"""
    if not text or not text.strip():
        return [{"type": "empty", "message": "回复为空", "snippet": ""}]
    v: List[Dict[str, str]] = []
    t = text.strip()

    # 1) 截断句：结尾是逗号类标点，或结尾是悬挂连词/助词
    if t[-1] in "，,、；;：:—":
        v.append({"type": "truncation", "message": "回复以逗号/顿号类标点结尾（句子未收尾）",
                  "snippet": t[-20:]})
    if t.endswith(_HANGING_TAIL):
        v.append({"type": "truncation", "message": "回复以悬挂连词结尾（疑似截断）",
                  "snippet": t[-20:]})

    # 2) 标点连用：全角标点连续 >=3、句号连用「。。」
    # 注：「...」为人设既定风格（设计稿金标回复普遍使用），不视为违例；只抓「。。」
    for m in re.finditer(r"[，。！？；：、]{3,}", t):
        v.append({"type": "punct_run", "message": "连续标点堆叠",
                  "snippet": t[max(0, m.start() - 8): m.end() + 8]})
        break
    if re.search(r"。{2,}", t):
        v.append({"type": "ellipsis", "message": "省略号不规范（句号连用，应使用「……」）",
                  "snippet": t[max(0, t.find("。。")) - 8:]})

    # 3) 中英标点混用：汉字紧邻 ASCII , . ! ?（省略号「...」中的点除外）
    for m in re.finditer(r"(?<!\.)[,\.!?](?!\.)", t):
        if re.match(r"[\u4e00-\u9fff]", t[max(0, m.start() - 1):m.start()]) \
                or re.match(r"[\u4e00-\u9fff]", t[m.end():m.end() + 1]):
            v.append({"type": "mixed_punct", "message": "中英标点混用（汉字旁出现半角标点）",
                      "snippet": t[max(0, m.start() - 8): m.end() + 8]})
            break

    # 4) 连续重复：普通汉字 >=3 连用；笑声音节 >=4 连用；连接词整词连用
    for m in re.finditer(r"(.)\1{2,}", t):
        ch = m.group(1)
        run = len(m.group(0))
        if not re.match(r"[\u4e00-\u9fff]", ch):
            continue
        if ch in _LAUGHTER and run < 4:
            continue
        if ch in _LAUGHTER or ch in "嗯啊哦噢":
            v.append({"type": "repeat", "message": f"语气/笑声音节连续重复 {run} 次",
                      "snippet": t[max(0, m.start() - 8): m.end() + 8]})
        else:
            v.append({"type": "repeat", "message": f"字符「{ch}」连续重复 {run} 次",
                      "snippet": t[max(0, m.start() - 8): m.end() + 8]})
        break
    for w in _WORD_DUP:
        m = re.search(f"({w}){{2,}}", t)
        if m:
            v.append({"type": "word_dup", "message": f"连接词「{w}」连用",
                      "snippet": t[max(0, m.start() - 8): m.end() + 8]})
            break

    # 5) 乱码/异常字符（圈号 ①-㉟ 属中文常用序号，不算异常）
    if _REPLACEMENT_CHAR in t:
        v.append({"type": "garbled", "message": "存在替换符（乱码）", "snippet": ""})
    else:
        weird = [c for c in t if not (re.match(r"[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef"
                                             r"\u2000-\u206f\u2460-\u24ff]", c) or c.isascii())]
        if len(weird) > max(1, len(t) * 0.03):
            v.append({"type": "garbled", "message": f"异常字符占比过高（{len(weird)} 个）",
                      "snippet": "".join(weird[:8])})

    # 6) 的/地/得 高置信度误用
    for w in _DE_WHITELIST:
        if w in t:
            v.append({"type": "de_misuse", "message": f"「的/地/得」误用（命中 {w}）",
                      "snippet": t[max(0, t.find(w) - 8): t.find(w) + 12]})
            break

    # 7) 括号/引号未闭合
    for op, cl, name in (("（", "）", "圆括号"), ("「", "」", "角引号"), ("“", "”", "双引号")):
        if t.count(op) != t.count(cl):
            v.append({"type": "unclosed", "message": f"{name}未闭合", "snippet": t[-30:]})
            break

    # 8) 汉字之间出现半角空格（分词断裂痕迹）
    if re.search(r"[\u4e00-\u9fff] [\u4e00-\u9fff]", t):
        v.append({"type": "cjk_space", "message": "汉字之间出现半角空格", "snippet": t[:60]})

    return v


def fluency_metrics(replies: List[str]) -> Dict[str, Any]:
    """对一批回复做流畅度规则统计（句长、标点规范率、重复率、截断率、混用率）。"""
    n = len(replies)
    if n == 0:
        return {"replies": 0}
    lens, punct_ok, trunc, rep, mixed, empty = [], 0, 0, 0, 0, 0
    for r in replies:
        if not r or not r.strip():
            empty += 1
            continue
        sents = [s.strip() for s in re.findall(r"[^。！？!?…～\n]+[。！？!?…～]?", r) if s.strip()]
        if not sents:
            continue
        lens.extend(len(s) for s in sents)
        for s in sents:
            if s[-1] in "。！？!?…～~":
                punct_ok += 1
        types = {v["type"] for v in check_grammar(r)}
        if "truncation" in types or "ellipsis" in types:
            trunc += 1
        if "repeat" in types or "word_dup" in types:
            rep += 1
        if "mixed_punct" in types:
            mixed += 1
    total_sents = max(1, len(lens))
    return {
        "replies": n,
        "empty_count": empty,
        "avg_sentence_chars": round(sum(lens) / total_sents, 2),
        "punct_norm_rate": round(punct_ok / total_sents, 4),
        "truncation_reply_rate": round(trunc / n, 4),
        "repeat_reply_rate": round(rep / n, 4),
        "mixed_punct_reply_rate": round(mixed / n, 4),
    }


_FIX_RULES: List[Dict[str, Any]] = [
    {"name": "ascii_ellipsis", "pat": re.compile(r"\.{3,}"), "repl": "……"},
    {"name": "double_period", "pat": re.compile(r"。{2,}"), "repl": "。"},
    {"name": "punct_run", "pat": re.compile(r"([，。！？；：、])\1{2,}"), "repl": r"\1"},
    {"name": "mixed_punct", "pat": re.compile(r"[\u4e00-\u9fff][,\.!?]|[,\.!?][\u4e00-\u9fff]"), "repl": ""},
    {"name": "cjk_space", "pat": re.compile(r"([\u4e00-\u9fff]) ([\u4e00-\u9fff])"), "repl": r"\1\2"},
    {"name": "word_dup", "pat": re.compile(r"(然后|就是|但是|可是|所以|而且|因为|真的|好想|超级|特别|一定)\1{1,}"),
     "repl": r"\1"},
]


def _fix_repeat_char(m: re.Match) -> str:
    ch = m.group(1)
    run = len(m.group(0))
    if ch in _LAUGHTER:
        return ch * 3 if run >= 4 else m.group(0)
    if ch in "嗯啊哦噢":
        return ch * 2 if run >= 3 else m.group(0)
    return ch * 2 if run >= 3 else m.group(0)


def auto_fix(text: str) -> str:
    """确定性规则修正（用于构造纠错对）。只处理可 100% 确定修复的违例类型；
    修正后仍需用 check_grammar 复检，仍违例的样本弃用。"""
    t = text
    conv = {",": "，", ".": "。", "!": "！", "?": "？"}
    for rule in _FIX_RULES:
        if rule["name"] == "mixed_punct":
            # 汉字旁半角标点 → 对应全角标点
            t = re.sub(r"(?<=[\u4e00-\u9fff])[,\.!?]", lambda m: conv.get(m.group(0), m.group(0)), t)
            t = re.sub(r"[,\.!?](?=[\u4e00-\u9fff])", lambda m: conv.get(m.group(0), m.group(0)), t)
            continue
        t = rule["pat"].sub(rule["repl"], t)
    t = re.sub(r"(.)\1{2,}", _fix_repeat_char, t)
    return t


if __name__ == "__main__":
    demo = [
        "小星听到了...你现在一定很难受吧，但是",
        "嗯嗯嗯嗯，小星陪着你呀。。然后然后我们慢慢说",
        "真的吗.小星好开心,我们一起加油",
        "你 好呀，小星在呢！",
    ]
    for d in demo:
        v = check_grammar(d)
        print("IN :", d)
        for x in v:
            print("  ✗", x["type"], "-", x["message"])
        f = auto_fix(d)
        print("FIX:", f, "-> left:", [x["type"] for x in check_grammar(f)])
    print(fluency_metrics(demo))
