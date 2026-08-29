"""PII 脱敏模块 · v2.0
对训练素材执行全程模糊化处理，覆盖 5 类敏感字段：
  1. 人名（真实姓名/用户名）  → [NAME]
  2. 联系方式（手机/座机/邮箱/微信QQ号） → [PHONE] / [EMAIL] / [CONTACT]
  3. 证件/编号（身份证/ORCID/DOI/伦理批件/病例号） → [ID] / [ORCID] / [DOI] / [ETHICS_ID] / [CASE_ID]
  4. 机构/地点（医院/学校/大学/公司/城市/国家/地址） → [INSTITUTION] / [LOCATION]
  5. URL（非 DOI 链接） → [URL]

用法：
  python scripts/anonymize_pii.py            # 脱敏 data/ 下全部素材
  python scripts/anonymize_pii.py --scan      # 仅扫描不修改，输出 PII 命中统计
  python scripts/anonymize_pii.py --file <p>   # 脱敏单个文件
"""
from __future__ import annotations
import argparse, json, logging, re, shutil, sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Tuple

log = logging.getLogger("anon")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s",
    handlers=[logging.FileHandler("anonymize_pii.log"), logging.StreamHandler()])

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

# ============ 1. 联系方式 ============
# 中国手机号 1[3-9]xxxxxxxxx
RE_PHONE_MOBILE = re.compile(r"(?<!\d)1[3-9]\d{9}(?!\d)")
# 中国座机 0XX-XXXXXXX / 0XXX-XXXXXXXX
RE_PHONE_LANDLINE = re.compile(r"(?<!\d)0\d{2,3}-\d{7,8}(?!\d)")
# 国际号码 +86-xxx / +1-xxx
RE_PHONE_INTL = re.compile(r"\+\d{1,3}[-\s]?\d{3,}[-\s]?\d{3,}[-\s]?\d{0,4}")
# 邮箱（支持跨行：logan.harvey@\nsydney.edu.au）
RE_EMAIL = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.\-]+[\s]*\.[A-Za-z]{2,}")
RE_EMAIL_MULTILINE = re.compile(
    r"([A-Za-z0-9._%+-]+@[A-Za-z0-9.\-]+)[\s\n]+([A-Za-z]{2,}(?:\.[A-Za-z]{2,})*)"
)
# 微信号 / QQ号（纯数字 5-11 位且前后非数字，且非年份/章节号上下文难判，保守用 6-11 位）
RE_QQ = re.compile(r"(?<![A-Za-z0-9])[1-9]\d{5,10}(?![A-Za-z0-9.])")

# ============ 2. 证件/编号 ============
# 中国身份证 18 位（末位 X）
RE_ID_CARD = re.compile(r"(?<!\d)\d{17}[\dXx](?!\d)")
# ORCID 0000-0001-9502-5216
RE_ORCID = re.compile(r"\d{4}-\d{4}-\d{4}-\d{3,4}[\dXx]")
# DOI URL
RE_DOI = re.compile(r"https?://(?:dx\.)?doi\.org/\S+")
# 伦理批件号 HREC/18/WMEAD/441 / IRB-xxx / 伦理审查号
RE_ETHICS = re.compile(r"(?:HREC|IRB|伦理审查|批件号)\s*[/\-]?\s*[A-Za-z0-9/\-]+", re.I)
# 病例号/工号 2026-27653-001 这类（年-编号-子序号）
RE_CASE_ID = re.compile(r"(?<!\d)(?:19|20)\d{2}-\d{4,6}-\d{2,3}(?!\d)")
# ISSN
RE_ISSN = re.compile(r"\d{4}-\d{4}")

# ============ 3. URL（非 DOI） ============
RE_URL = re.compile(r"https?://[^\s<>\"]+")

# ============ 4. 机构名（机构/学校/医院等） ============
# 中文机构：XX医院/XX大学/XX中学/XX学院/XX学校/XX中心/XX研究所/XX公司/XX集团
RE_INST_CN = re.compile(
    r"[\u4e00-\u9fff]{1,10}?(?:大学|学院|学校|中学|小学|医院|卫生院|卫生服务中心|"
    r"研究所|研究院|研究中心|机构|集团|公司|实验室|科室|门诊|病房|"
    r"卫生局|教育厅|教育局|政府|街道办|社区)"
)
# 英文机构：University / Hospital / Centre / Center / Institute / Department / School / Health Service / District
RE_INST_EN = re.compile(
    r"(?:The\s+)?[A-Z][A-Za-z]+\s+(?:[A-Z][A-Za-z]+\s+){0,4}"
    r"(?:University|Hospital|Centre|Center|Institute|Department|School|"
    r"Health\s+Service|Health\s+District|Local\s+Health\s+District|"
    r"Faculty|Division|Academy|Laboratory|Foundation|Council|Bureau|Authority)"
)

# ============ 5. 地点（城市/国家/地址） ============
# 已知城市/国家名（保守列表，仅匹配明确地名）
KNOWN_LOCATIONS = [
    # 国家
    "Australia", "China", "America", "United States", "U.S.", "USA", "UK", "United Kingdom",
    "Canada", "Japan", "Korea", "India", "Germany", "France",
    # 城市
    "Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide",
    "Beijing", "Shanghai", "Guangzhou", "Shenzhen", "Nanjing", "Hangzhou",
    "Wuhan", "Chengdu", "Xi'an", "Tianjin", "Chongqing",
    "New York", "Los Angeles", "Boston", "Chicago", "San Francisco",
    "London", "Paris", "Berlin", "Tokyo", "Seoul",
    # 州/省
    "NSW", "VIC", "QLD", "California", "Texas", "Florida",
]
RE_LOCATION = re.compile(r"\b(?:" + "|".join(re.escape(c) for c in KNOWN_LOCATIONS) + r")\b")
# 邮编样式的地址片段（如 NSW 2006）
RE_ADDR_ZIP = re.compile(r"\b[A-Z]{2,3}\s+\d{4,5}\b")
# Building G02 / Room xxx / Floor xx
RE_ADDR_BLDG = re.compile(r"\b(?:Building|Room|Floor|Level)\s+[A-Z0-9-]+\b", re.I)

# ============ 6. 人名 ============
# 英文人名：First Last / First M. Last / First M Last
# 匹配两个或三个首字母大写词的组合（排除句首的常见非人名词）
_NAME_EXCLUDE = {
    # 学术/常见非人名首词
    "The", "This", "These", "Those", "That", "There", "Then", "Thus",
    "However", "Moreover", "Furthermore", "Therefore", "Although", "Because",
    "While", "When", "Where", "What", "Which", "Who", "How", "Why",
    "American", "European", "Asian", "African", "National", "International",
    "Psychological", "Psychiatry", "Medical", "Clinical", "Cognitive",
    "Diagnostic", "Statistical", "Manual", "Disorders", "Edition",
    "Complex", "Posttraumatic", "Substance", "Health", "Mental",
    "Online", "First", "Advance", "Cumulative", "Adverse", "Childhood",
    "Among", "Parent", "Using", "Results", "Method", "Discussion",
    "Introduction", "Conclusion", "References", "Appendix", "Table",
    "Figure", "Copyright", "Abstract", "Keywords", "Correspondence",
    "All", "Some", "Many", "Most", "Both", "Each", "Other", "Another",
    "In", "On", "At", "By", "For", "With", "From", "To", "Of", "And", "Or",
    "We", "They", "He", "She", "It", "Our", "Their", "His", "Her", "Its",
}
# 英文人名：First Last
RE_NAME_EN_2 = re.compile(
    r"\b([A-Z][a-z]{1,15})\s+([A-Z][a-z]{1,15})\b"
)
# 英文人名：First M. Last
RE_NAME_EN_3 = re.compile(
    r"\b([A-Z][a-z]{1,15})\s+([A-Z])\.?\s+([A-Z][a-z]{1,15})\b"
)
# 中文人名：常见姓氏 + 1-2 字名
CN_SURNAMES = list("赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张"
                   "孔曹严华金魏陶姜戚谢邹喻柏水窦章云苏潘葛奚范彭郎"
                   "鲁韦昌马苗凤花方俞任袁柳鲍史唐费廉岑薛雷贺倪汤滕殷"
                   "罗毕郝邬安常乐于时傅皮卞齐康伍余元卜顾孟黄穆萧尹姚"
                   "邵湛汪祁毛禹狄米贝明臧计伏成戴谈宋茅庞熊纪舒屈项祝"
                   "董梁杜阮蓝闵席季麻强贾路娄危江童颜郭梅盛林刁钟徐邱"
                   "骆高夏蔡田樊胡凌霍虞万支柯昝管卢莫经房裘缪干解应宗"
                   "丁宣贲邓郁单杭洪包诸左石崔吉钮龚程嵇邢滑裴陆荣翁荀"
                   "羊於惠甄曲家封芮羿储靳汲邴糜松井段富巫乌焦巴弓牧隗"
                   "山谷车侯宓蓬全郗班仲伊宫宁仇栾暴甘钭历戎祖武符刘")
RE_NAME_CN = re.compile(
    r"(?<=[，,。：:;；、\s\"'（(])"
    r"([" + "".join(CN_SURNAMES) + r"]"
    r"[\u4e00-\u9fff]{1,2})"
    r"(?=[，,。：:;；、\s\"'）)\n]|$)"
)
# 作者上下文：Author: xxx / Correspondence ... addressed to xxx
RE_AUTHOR_CTX = re.compile(
    r"(?:Correspondence.*?addressed to\s+|Author[s]?:\s+|by\s+)"
    r"([A-Z][A-Za-z.\s,]+?)(?=[.\n,，])",
    re.I
)
# 带上标数字的作者名（affiliation 上标）：Harvey1, 2 / Slade1 / Mills1
RE_NAME_AFFIL = re.compile(
    r"\b([A-Z][a-z]{1,15})\s+([A-Z]\.?\s+)?([A-Z][a-z]{1,15})(\d{1,3}(?:\s*,\s*\d{1,3})*)"
)
# 引文中的姓氏：Surname et al. / Surname & Surname / Surname, year
RE_CITATION = re.compile(
    r"\b([A-Z][a-z]{2,15})\s+(?:et\s+al\.?|&\s+[A-Z][a-z]{2,15})\b"
)
# 单独出现的已知作者姓氏（从首次扫描收集，二次扫描处理）
RE_KNOWN_SURNAMES = re.compile(
    r"\b(?:Logan|Harvey|Slade|Marel|Mills|McWilliams|Zhang|Cheng|Wang|Gao|Lu|"
    r"Cohen|Hien|Bowe|Rosenheck|Prior|Patel|Killeen|Mefodeva|Roberts|Gielen|"
    r"Khantzian|Tripp|Coffey|Kaczkurkin|Back|Hien|Najt|Lopez|Castro|"
    r"Debell|Stewart|Tull|McFall|Boland|Love|Torgerson|Khouri|Khoury|"
    r"Dell|Osso|Shipherd|Kingston|McEvoy|Frost|Maercker|Palic|Powers|"
    r"Karatzias|Hyland|Murphy|Facer|Cheetham|Drapkin|Folke|McGinty|"
    r"Bressington|Cloitre|Howard|Santo|Ruglass|Raistrick|Heather|"
    r"Bernstein|Fink|Weathers|Ryan)\b"
)

@dataclass
class MaskStats:
    phone: int = 0
    email: int = 0
    qq: int = 0
    id_card: int = 0
    orcid: int = 0
    doi: int = 0
    ethics: int = 0
    case_id: int = 0
    issn: int = 0
    url: int = 0
    inst_cn: int = 0
    inst_en: int = 0
    location: int = 0
    addr: int = 0
    name_en: int = 0
    name_cn: int = 0
    def total(self) -> int:
        return sum(getattr(self, f) for f in self.__dataclass_fields__)
    def to_dict(self) -> Dict[str, int]:
        return {f: getattr(self, f) for f in self.__dataclass_fields__}

def _mask(text: str, st: MaskStats) -> str:
    """按从具体到一般的顺序应用脱敏规则。"""
    # 1. DOI（先于 URL，避免 URL 吞掉 DOI）
    text, n = RE_DOI.subn("[DOI]", text); st.doi += n
    # 2. ORCID（先于 ID card，模式更具体）
    text, n = RE_ORCID.subn("[ORCID]", text); st.orcid += n
    # 3. 身份证
    text, n = RE_ID_CARD.subn("[ID]", text); st.id_card += n
    # 4. 伦理批件号
    text, n = RE_ETHICS.subn("[ETHICS_ID]", text); st.ethics += n
    # 5. 病例号 2026-27653-001
    text, n = RE_CASE_ID.subn("[CASE_ID]", text); st.case_id += n
    # 6. ISSN（在 DOI/URL 之后）
    text, n = RE_ISSN.subn("[ISSN]", text); st.issn += n
    # 7. 邮箱（含跨行）
    text, n = RE_EMAIL_MULTILINE.subn("[EMAIL]", text); st.email += n
    text, n = RE_EMAIL.subn("[EMAIL]", text); st.email += n
    # 8. 手机号
    text, n = RE_PHONE_MOBILE.subn("[PHONE]", text); st.phone += n
    # 9. 座机
    text, n = RE_PHONE_LANDLINE.subn("[PHONE]", text); st.phone += n
    # 10. 国际号码
    text, n = RE_PHONE_INTL.subn("[PHONE]", text); st.phone += n
    # 11. URL（非 DOI）
    text, n = RE_URL.subn("[URL]", text); st.url += n
    # 12. 机构（中文 + 英文）
    text, n = RE_INST_CN.subn("[INSTITUTION]", text); st.inst_cn += n
    text, n = RE_INST_EN.subn("[INSTITUTION]", text); st.inst_en += n
    # 13. 地点
    text, n = RE_LOCATION.subn("[LOCATION]", text); st.location += n
    text, n = RE_ADDR_ZIP.subn("[LOCATION]", text); st.addr += n
    text, n = RE_ADDR_BLDG.subn("[LOCATION]", text); st.addr += n
    # 14. QQ号（放在最后，避免与身份证/手机号混淆）
    text, n = RE_QQ.subn("[CONTACT]", text); st.qq += n
    # 15. 人名 - 英文三段式 First M. Last
    def _name3(m):
        f, _, l = m.group(1), m.group(2), m.group(3)
        if f in _NAME_EXCLUDE or l in _NAME_EXCLUDE: return m.group(0)
        st.name_en += 1
        return "[NAME]"
    text = RE_NAME_EN_3.sub(_name3, text)
    # 16. 人名 - 英文两段式 First Last
    def _name2(m):
        f, l = m.group(1), m.group(2)
        if f in _NAME_EXCLUDE or l in _NAME_EXCLUDE: return m.group(0)
        # 过滤常见非人名组合
        if l in {"University","Hospital","Centre","Center","Institute","Department","School"}:
            return m.group(0)
        st.name_en += 1
        return "[NAME]"
    text = RE_NAME_EN_2.sub(_name2, text)
    # 17. 人名 - 中文
    def _name_cn(m):
        st.name_cn += 1
        return "[NAME]"
    text = RE_NAME_CN.sub(_name_cn, text)
    # 18. 带上标 affiliation 的作者名：Logan R. Harvey1, 2
    def _name_affil(m):
        f, _, l, _ = m.group(1), m.group(2), m.group(3), m.group(4)
        if f in _NAME_EXCLUDE or l in _NAME_EXCLUDE: return m.group(0)
        st.name_en += 1
        return "[NAME]" + m.group(4)
    text = RE_NAME_AFFIL.sub(_name_affil, text)
    # 19. 引文姓氏：Surname et al. / Surname & Surname
    text, n = RE_CITATION.subn("[NAME] et al.", text); st.name_en += n
    # 20. 已知作者姓氏（保守列表，仅明确识别的论文作者）
    text, n = RE_KNOWN_SURNAMES.subn("[NAME]", text); st.name_en += n
    return text

def _mask_value(v: Any, st: MaskStats) -> Any:
    """递归脱敏 JSON 结构。"""
    if isinstance(v, str):
        return _mask(v, st)
    if isinstance(v, list):
        return [_mask_value(x, st) for x in v]
    if isinstance(v, dict):
        return {k: _mask_value(x, st) for k, x in v.items()}
    return v

def anonymize_file(path: Path, scan_only: bool = False) -> MaskStats:
    """脱敏单个文件。scan_only=True 时仅统计不写入。"""
    st = MaskStats()
    if not path.exists():
        log.warning("文件不存在: %s", path); return st
    suffix = path.suffix.lower()
    try:
        raw = path.read_text(encoding="utf-8", errors="ignore")
    except Exception as e:
        log.error("读取失败 %s: %s", path, e); return st

    if suffix == ".json":
        try:
            obj = json.loads(raw)
        except json.JSONDecodeError:
            # 非标准 JSON，按纯文本处理
            new = _mask(raw, st)
        else:
            new = _mask_value(obj, st)
            new = json.dumps(new, ensure_ascii=False, indent=2)
    elif suffix == ".jsonl":
        lines = []
        for ln in raw.splitlines():
            if not ln.strip():
                lines.append(ln); continue
            try:
                obj = json.loads(ln)
                obj = _mask_value(obj, st)
                lines.append(json.dumps(obj, ensure_ascii=False))
            except json.JSONDecodeError:
                lines.append(_mask(ln, st))
        new = "\n".join(lines) + ("\n" if raw.endswith("\n") else "")
    else:  # .txt / .md
        new = _mask(raw, st)

    if scan_only:
        log.info("[SCAN] %s : %s", path.name, st.to_dict())
        return st
    if new == raw:
        log.info("[SKIP] %s 无 PII", path.name)
        return st
    # 备份原文件
    bak = path.with_suffix(path.suffix + ".bak")
    if not bak.exists():
        shutil.copy2(path, bak)
    path.write_text(new, encoding="utf-8")
    log.info("[DONE] %s 脱敏 %d 处 → %s", path.name, st.total(), bak.name)
    return st

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--scan", action="store_true", help="仅扫描统计，不修改文件")
    ap.add_argument("--file", type=Path, help="脱敏单个文件")
    ap.add_argument("--all", action="store_true", help="脱敏 data/ 下全部素材")
    args = ap.parse_args()

    targets: List[Path] = []
    if args.file:
        targets = [args.file]
    else:
        # 默认/全部：学术论文 JSON + 语料文本 + 知识库
        targets = [
            DATA / "combined_cleaned_text.txt",
            DATA / "knowledge_base.json",
            DATA / "sft_dataset_xiaoxing.jsonl",
        ]
        targets += sorted(DATA.glob("20*_cleaned.json"))
        targets += sorted(DATA.glob("3020*_cleaned.json"))
        targets = [t for t in targets if t.exists()]

    log.info("==== %s %d 个文件 ====", "扫描" if args.scan else "脱敏", len(targets))
    total = MaskStats()
    per_file = []
    for t in targets:
        s = anonymize_file(t, scan_only=args.scan)
        per_file.append((t.name, s.total()))
        for f in s.__dataclass_fields__:
            setattr(total, f, getattr(total, f) + getattr(s, f))
    log.info("==== 汇总 ====")
    for name, n in per_file:
        log.info("  %-50s %d 处", name, n)
    log.info("总计脱敏 %d 处", total.total())
    print("\n==== ANONYMIZE SUMMARY ====")
    print(f"文件数: {len(targets)}")
    print(f"总脱敏数: {total.total()}")
    for f in total.__dataclass_fields__:
        v = getattr(total, f)
        if v > 0:
            print(f"  {f:12s}: {v}")

if __name__ == "__main__":
    main()
