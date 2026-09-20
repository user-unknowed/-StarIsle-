/**
 * crawl_tashan_papers.js v2 - 修复 arXiv 摘要字段名 + OA 论文列表位置
 *
 * 关键发现:
 *  - arXiv 接口返回的摘要字段名是 paperAbstract
 *  - OA 接口的论文列表在 data.allResultsByYear 数组中,摘要字段是 abstractText
 *  - OA 接口拒绝中文字符 (400 错误),所以中文关键词用 arXiv 检索
 *  - arXiv 接口 releaseDate 用于解析年份 (格式 2026-09-18T...)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE_HOST = 'giiisp.com';
const ARXIV_ABSTRACT_API = '/first/paper/searchArxivByAbstract';
const OA_SEARCH_API = '/first/oaPaper/searchArticlesByQuery1';

const ARXIV_QUERIES_EN = [
  'adolescent depression CBT',
  'teenager anxiety intervention',
  'school mental health adolescent',
  'PHQ-9 adolescent screening',
  'thematic apperception test TAT',
  'Rorschach inkblot adolescent',
  'adolescent suicide risk assessment',
  'cognitive behavioral therapy adolescent depression',
];

// 中文关键词走 arXiv (OA 不接受中文字符)
const ARXIV_QUERIES_CN = [
  '青少年抑郁 认知行为疗法',
  '青少年焦虑干预',
  '学校心理健康 青少年',
  'PHQ-9 青少年',
  '主题统觉测验 TAT',
  '罗夏墨迹测验 青少年',
  '青少年 自杀风险 评估',
];

// OA 接口只接受英文关键词数组
const OA_QUERIES_EN = [
  ['adolescent', 'depression', 'CBT'],
  ['teenager', 'anxiety', 'intervention'],
  ['school', 'mental', 'health', 'adolescent'],
  ['PHQ-9', 'adolescent', 'screening'],
  ['thematic', 'apperception', 'test'],
  ['Rorschach', 'inkblot', 'adolescent'],
  ['adolescent', 'suicide', 'risk'],
  ['cognitive', 'behavioral', 'therapy', 'adolescent'],
];

const OUTPUT_DIR = path.resolve('f:\\B_proj\\Big_proj\\-StarIsle-\\server-services\\ai-engine\\data\\tashan_corpora');
const RAW_PAPERS_FILE = path.join(OUTPUT_DIR, 'raw_papers.jsonl');
const ABSTRACTS_CN_FILE = path.join(OUTPUT_DIR, 'abstracts_cn.txt');
const ABSTRACTS_EN_FILE = path.join(OUTPUT_DIR, 'abstracts_en.txt');
const STATS_FILE = path.join(OUTPUT_DIR, 'crawl_stats.json');

const stats = {
  arxiv_calls: 0,
  oa_calls: 0,
  arxiv_hits: 0,
  oa_hits: 0,
  arxiv_failures: 0,
  oa_failures: 0,
  keyword_distribution: {},
  language_cn: 0,
  language_en: 0,
  duplicates_removed: 0,
  papers_with_abstract: 0,
  papers_without_abstract: 0,
};

function postJson(urlHost, urlPath, body, timeoutMs = 30000) {
  return new Promise((resolve) => {
    const bodyStr = JSON.stringify(body);
    const options = {
      hostname: urlHost, port: 443, path: urlPath, method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'Content-Length': Buffer.byteLength(bodyStr, 'utf8'),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) StarIsle-Research/1.0',
        'Accept': 'application/json',
      },
      timeout: timeoutMs,
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', c => { data += c; });
      res.on('end', () => {
        const ct = res.headers['content-type'] || '';
        if (!ct.toLowerCase().includes('json')) {
          resolve({ __error: `non-json content-type: ${ct}`, raw_excerpt: data.slice(0, 300) });
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ __error: `JSON parse error: ${e.message}`, raw_excerpt: data.slice(0, 300) });
        }
      });
    });
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
    req.on('error', (e) => {
      resolve({ __error: `${e.name}: ${e.message}` });
    });
    req.write(bodyStr);
    req.end();
  });
}

function parseYear(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr);
  if (s.length >= 4) {
    const y = parseInt(s.slice(0, 4), 10);
    if (!Number.isNaN(y)) return y;
  }
  return null;
}

function parseArxivResponse(resp, query) {
  if (resp.__error) {
    stats.arxiv_failures += 1;
    console.log(`[arxiv FAIL] ${query}: ${resp.__error}`);
    return [];
  }
  if (resp.code !== 200) {
    stats.arxiv_failures += 1;
    console.log(`[arxiv FAIL] ${query}: code=${resp.code} msg=${resp.msg}`);
    return [];
  }
  const data = Array.isArray(resp.data) ? resp.data : [];
  const results = [];
  for (const item of data) {
    const title = (item.title || '').trim();
    if (!title) continue;
    // 作者按逗号切分
    const authorsRaw = item.author || '';
    let authors = [];
    if (typeof authorsRaw === 'string') {
      authors = authorsRaw.split(',').map(a => a.trim()).filter(Boolean);
    } else if (Array.isArray(authorsRaw)) {
      authors = authorsRaw.map(a => String(a).trim()).filter(Boolean);
    }
    // 关键发现: 摘要字段名是 paperAbstract
    const abstract = (item.paperAbstract || item.abstract || item.summary || item.description || '').trim();
    let arxivId = item.arvixNo || item.arxivNo || item.arxivId || item.mainArxivNo || '';
    arxivId = arxivId.replace(/^arXiv:/, '').trim();
    const year = parseYear(item.releaseDate);
    // 主题作为关键词
    let keywords = [];
    const subjects = item.subjects;
    if (Array.isArray(subjects)) {
      keywords = subjects.filter(s => typeof s === 'string');
    } else if (typeof subjects === 'string') {
      // 去掉 "Subjects:" 前缀,按分号切
      keywords = subjects.replace(/^Subjects:\s*/i, '').split(';').map(s => s.trim()).filter(Boolean);
    }
    const url = arxivId ? `https://arxiv.org/abs/${arxivId}` : (item.url || '');
    const doi = item.doi || null;
    const pdfUrl = item.pdfUrl || '';
    results.push({
      title,
      authors,
      abstract,
      year,
      keywords,
      source_url: url,
      arxiv_id: arxivId || null,
      doi,
      pdf_url: pdfUrl,
      venue: 'arXiv',
      source_api: ARXIV_ABSTRACT_API,
      match_query: query,
      match_reason: `arXiv abstract search hit for: ${query}`,
      verification_status: '待核验',
    });
  }
  return results;
}

function parseOaResponse(resp, queryArr) {
  if (resp.__error) {
    stats.oa_failures += 1;
    console.log(`[oa FAIL] ${queryArr.join('+')}: ${resp.__error}`);
    return [];
  }
  if (resp.code !== 200) {
    stats.oa_failures += 1;
    console.log(`[oa FAIL] ${queryArr.join('+')}: code=${resp.code} msg=${resp.msg}`);
    return [];
  }
  // 关键发现: 论文列表在 data.allResultsByYear
  const data = resp.data || {};
  const allResults = data.allResultsByYear;
  if (!Array.isArray(allResults)) {
    console.log(`[oa WARN] ${queryArr.join('+')}: allResultsByYear is not an array`);
    return [];
  }
  const queryStr = queryArr.join('+');
  const results = [];
  for (const item of allResults) {
    const title = (item.title || item.paperTitle || item.articleTitle || '').trim();
    if (!title) continue;
    // 摘要字段名是 abstractText
    const abstract = (item.abstractText || item.abstract || item.summary || '').trim();
    const year = parseYear(item.publication_date || item.publishTime || item.year);
    const id = item.id || '';
    const doi = item.doi || null;
    const url = item.url || (doi ? `https://doi.org/${doi}` : `https://giiisp.com/paper/${id}`);
    const venue = item.venue || item.journal || item.index || 'Open Access Paper';
    results.push({
      title,
      authors: [], // OA 响应中没有明确的作者数组,留空
      abstract,
      year,
      keywords: queryArr, // 把检索关键词作为 keywords
      source_url: url,
      arxiv_id: null,
      doi,
      pdf_url: '',
      venue,
      source_api: OA_SEARCH_API,
      match_query: queryStr,
      match_reason: `OA paper search hit for: ${queryStr} (score=${item.score || 'n/a'})`,
      verification_status: '待核验',
    });
  }
  return results;
}

function isChinese(text) {
  if (!text) return false;
  let cnCount = 0, enCount = 0;
  for (const c of text) {
    if (c >= '\u4e00' && c <= '\u9fff') cnCount++;
    else if (c.charCodeAt(0) < 128 && /[a-zA-Z]/.test(c)) enCount++;
  }
  return cnCount > enCount;
}

function deduplicate(papers) {
  const seen = new Set();
  const out = [];
  for (const p of papers) {
    let key = (p.title || '').toLowerCase().trim();
    key = key.replace(/^[\s.,;:!?"'()[\]]+|[\s.,;:!?"'()[\]]+$/g, '');
    if (!key) continue;
    if (seen.has(key)) {
      stats.duplicates_removed += 1;
      continue;
    }
    seen.add(key);
    out.push(p);
  }
  return out;
}

function writePapersJsonl(papers, filePath) {
  const lines = papers.map(p => JSON.stringify({
    title: p.title || null,
    authors: p.authors || [],
    abstract: p.abstract || '',
    year: p.year || null,
    keywords: p.keywords || [],
    source_url: p.source_url || '',
    arxiv_id: p.arxiv_id || null,
    doi: p.doi || null,
    pdf_url: p.pdf_url || '',
    venue: p.venue || '',
    source_api: p.source_api || '',
    match_query: p.match_query || '',
    match_reason: p.match_reason || '',
    verification_status: p.verification_status || '待核验',
  }));
  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf8');
}

function writeAbstracts(papers, cnPath, enPath) {
  const cnLines = [];
  const enLines = [];
  for (const p of papers) {
    const ab = (p.abstract || '').trim();
    if (!ab) continue;
    if (isChinese(ab)) {
      // 中文按 。!? 切句
      const sents = ab.split(/(?<=[。！？!?])/);
      for (const s of sents) {
        const trimmed = s.trim();
        if (trimmed.length >= 4) cnLines.push(trimmed);
      }
      stats.language_cn += 1;
    } else {
      // 英文按 .!? 切句
      const sents = ab.split(/(?<=[.!?])\s+/);
      for (const s of sents) {
        const trimmed = s.trim();
        if (trimmed.length >= 8) enLines.push(trimmed);
      }
      stats.language_en += 1;
    }
  }
  fs.writeFileSync(cnPath, cnLines.join('\n') + (cnLines.length ? '\n' : ''), 'utf8');
  fs.writeFileSync(enPath, enLines.join('\n') + (enLines.length ? '\n' : ''), 'utf8');
  return { cnCount: cnLines.length, enCount: enLines.length };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const allPapers = [];

  // ===== Phase 1: arXiv 搜索 (英文关键词) =====
  console.log('='.repeat(60));
  console.log('Phase 1: arXiv abstract search (English keywords) via Giiisp');
  console.log('='.repeat(60));
  for (const q of ARXIV_QUERIES_EN) {
    const body = { key: q, pageNum: 1, pageSize: 10 };
    console.log(`[arxiv EN] POST ${ARXIV_ABSTRACT_API} key=${q}`);
    const resp = await postJson(BASE_HOST, ARXIV_ABSTRACT_API, body);
    stats.arxiv_calls += 1;
    const papers = parseArxivResponse(resp, q);
    console.log(`  -> ${papers.length} papers parsed (with abstract: ${papers.filter(p => p.abstract).length})`);
    stats.arxiv_hits += papers.length;
    stats.keyword_distribution[`arxiv_en:${q}`] = papers.length;
    allPapers.push(...papers);
    await sleep(500);
  }

  // ===== Phase 2: arXiv 搜索 (中文关键词,可能命中很少) =====
  console.log('\n' + '='.repeat(60));
  console.log('Phase 2: arXiv abstract search (Chinese keywords) via Giiisp');
  console.log('='.repeat(60));
  for (const q of ARXIV_QUERIES_CN) {
    const body = { key: q, pageNum: 1, pageSize: 10 };
    console.log(`[arxiv CN] POST ${ARXIV_ABSTRACT_API} key=${q}`);
    const resp = await postJson(BASE_HOST, ARXIV_ABSTRACT_API, body);
    stats.arxiv_calls += 1;
    const papers = parseArxivResponse(resp, q);
    console.log(`  -> ${papers.length} papers parsed (with abstract: ${papers.filter(p => p.abstract).length})`);
    stats.arxiv_hits += papers.length;
    stats.keyword_distribution[`arxiv_cn:${q}`] = papers.length;
    allPapers.push(...papers);
    await sleep(500);
  }

  // ===== Phase 3: OA 论文搜索 (英文关键词) =====
  console.log('\n' + '='.repeat(60));
  console.log('Phase 3: Open Access paper search (English keywords) via Giiisp');
  console.log('='.repeat(60));
  for (const kw of OA_QUERIES_EN) {
    const body = { titleAndAbs: kw, pageNum: 1, pageSize: 10 };
    console.log(`[oa] POST ${OA_SEARCH_API} titleAndAbs=${JSON.stringify(kw)}`);
    const resp = await postJson(BASE_HOST, OA_SEARCH_API, body);
    stats.oa_calls += 1;
    const papers = parseOaResponse(resp, kw);
    console.log(`  -> ${papers.length} papers parsed (with abstract: ${papers.filter(p => p.abstract).length})`);
    stats.oa_hits += papers.length;
    stats.keyword_distribution[`oa:${kw.join('+')}`] = papers.length;
    allPapers.push(...papers);
    await sleep(500);
  }

  // ===== 去重 =====
  console.log('\n' + '='.repeat(60));
  console.log(`Total raw papers before dedup: ${allPapers.length}`);
  const deduped = deduplicate(allPapers);
  console.log(`Total papers after dedup: ${deduped.length}`);

  // 统计有/无摘要
  for (const p of deduped) {
    if (p.abstract && p.abstract.length > 0) stats.papers_with_abstract += 1;
    else stats.papers_without_abstract += 1;
  }

  // ===== 写文件 =====
  writePapersJsonl(deduped, RAW_PAPERS_FILE);
  const { cnCount, enCount } = writeAbstracts(deduped, ABSTRACTS_CN_FILE, ABSTRACTS_EN_FILE);

  console.log('\n' + '='.repeat(60));
  console.log('Output:');
  console.log(`  raw_papers.jsonl -> ${RAW_PAPERS_FILE} (${fs.statSync(RAW_PAPERS_FILE).size} bytes, ${deduped.length} rows)`);
  console.log(`  abstracts_cn.txt -> ${ABSTRACTS_CN_FILE} (${fs.statSync(ABSTRACTS_CN_FILE).size} bytes, ${cnCount} lines)`);
  console.log(`  abstracts_en.txt -> ${ABSTRACTS_EN_FILE} (${fs.statSync(ABSTRACTS_EN_FILE).size} bytes, ${enCount} lines)`);

  stats.total_unique_papers = deduped.length;
  stats.cn_lines = cnCount;
  stats.en_lines = enCount;
  fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf8');
  console.log(`  crawl_stats.json -> ${STATS_FILE}`);
  console.log('\nStats:');
  console.log(JSON.stringify(stats, null, 2));
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
