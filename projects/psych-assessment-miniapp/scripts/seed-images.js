/**
 * scripts/seed-images.js
 *
 * 生成 images 集合 12 条系统预置图片的元数据种子 JSON。
 * 仅存元数据（占位 storageFileID），**不**下载任何真实图片二进制。
 *
 * 罗夏卡片 (Rorschach inkblot): 6 张 (sys_ro1 ~ sys_ro6)
 * TAT 卡片 (Thematic Apperception Test Murray): 6 张 (sys_tat1 ~ sys_tat6)
 *
 * 用法：
 *   node scripts/seed-images.js
 * 输出：
 *   scripts/seed/seed_images_12.json
 */

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.resolve(__dirname, 'seed');
const OUT_FILE = path.join(OUT_DIR, 'seed_images_12.json');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const now = Date.now();

// 罗夏 6 张 — 通用中文描述（仅描述轮廓/常见首反应，不构成完整施测）
const rorschachList = [
  {
    n: 1,
    name: '罗夏卡片 I · 蝙蝠/蝴蝶轮廓',
    desc: '经典对称墨迹 I，整体轮廓常被感知为蝙蝠、蝴蝶或带翼生物；中央纵向折痕对称。'
  },
  {
    n: 2,
    name: '罗夏卡片 II · 双人与黑红图形',
    desc: '黑红两色构成的对称墨迹 II，上部黑色常被感知为两人相对，下部红色块被视作动物或物品。'
  },
  {
    n: 3,
    name: '罗夏卡片 III · 两人抬物图形',
    desc: '灰黑与红色组合的对称墨迹 III，常被感知为两个对称人物共同抬举或操作某个物体。'
  },
  {
    n: 4,
    name: '罗夏卡片 IV · 怪兽/巨影剪影',
    desc: '大面积深灰黑色对称墨迹 IV，轮廓常见解读为巨兽、巨人或自上而下的阴影感。'
  },
  {
    n: 5,
    name: '罗夏卡片 V · 高一致的蝙蝠/蝴蝶',
    desc: '结构简洁的对称墨迹 V，高一致性反应多为蝙蝠或蝴蝶，整体较为"容易"组织。'
  },
  {
    n: 6,
    name: '罗夏卡片 VI · 纹理与毛皮质感',
    desc: '横向扩展的灰色对称墨迹 VI，中央纹理细密，常见解读涉及毛皮、地毯或动物背部。'
  }
];

// TAT 6 张 — 选取 Murray 经典卡片中常见的主题卡（仅场景描述，非版权扫描图）
const tatList = [
  {
    n: 1,
    name: 'TAT 卡片 1 · 男孩凝视小提琴',
    desc: '前景男孩站立凝望放在桌上的小提琴，人物关系与背景留白，可引出成就、家庭与抱负主题。'
  },
  {
    n: 2,
    name: 'TAT 卡片 2 · 乡村田野三人场景',
    desc: '背景为乡村田野，前景一女站立、一男子伏身劳作、远处一人影，常见家庭与劳作主题。'
  },
  {
    n: 3,
    name: 'TAT 卡片 3BM · 倚门少年 + 倒地人影',
    desc: '倚门站立的少年形象与地面上躺卧的人影，常见哀伤、悔恨、冲突或家庭变故主题。'
  },
  {
    n: 4,
    name: 'TAT 卡片 4 · 女子抓握男子手腕',
    desc: '女子正面抓握男子手腕的紧张姿态，男子试图向画面外挣脱，常见亲密关系冲突主题。'
  },
  {
    n: 5,
    name: 'TAT 卡片 5 · 窗边女子侧影',
    desc: '室内窗边侧身而立的女子，注视窗外光线，常见独处、期待、隐秘或思念主题。'
  },
  {
    n: 6,
    name: 'TAT 卡片 6BM · 老妇人与背后青年',
    desc: '前景老妇侧面神色忧虑，其身后站着一位戴帽青年男子，常见母子/代际冲突主题。'
  }
];

// 通用 image 模板 — 与 images 集合 schema 严格一致
function makeRorschach(item) {
  const idx = String(item.n);
  return {
    _id: 'sys_ro' + idx,
    uploaderId: 'SYSTEM',
    uploaderAnonymousNo: '#SYSTEM',
    imageType: 'rorschach',
    name: item.name,
    description: item.desc,
    tags: ['inkblot', 'system'],
    storageFileID: 'cloud://REPLACE_ENV.系统预置占位/ro' + idx + '.jpg',
    isBuiltIn: true,
    allowUse: true,
    createTime: now,
    updateTime: now
  };
}

function makeTAT(item) {
  const idx = String(item.n);
  return {
    _id: 'sys_tat' + idx,
    uploaderId: 'SYSTEM',
    uploaderAnonymousNo: '#SYSTEM',
    imageType: 'tat',
    name: item.name,
    description: item.desc,
    tags: ['thematic-apperception', 'system'],
    storageFileID: 'cloud://REPLACE_ENV.系统预置占位/tat' + idx + '.jpg',
    isBuiltIn: true,
    allowUse: true,
    createTime: now,
    updateTime: now
  };
}

const seed = [].concat(
  rorschachList.map(makeRorschach),
  tatList.map(makeTAT)
);

fs.writeFileSync(OUT_FILE, JSON.stringify(seed, null, 2), 'utf8');
console.log('[seed-images] wrote', seed.length, 'records to', OUT_FILE);
console.log('[seed-images] ids:', seed.map(function (s) { return s._id; }).join(','));
