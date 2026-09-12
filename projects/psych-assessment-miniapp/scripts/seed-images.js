/**
 * scripts/seed-images.js
 *
 * 生成 images 集合 20 条系统预置图片的元数据种子 JSON。
 * 仅存元数据（占位 storageFileID），**不**下载任何真实图片二进制。
 *
 * 罗夏卡片 (Rorschach inkblot): 10 张 (sys_ro1 ~ sys_ro10)
 * TAT 卡片 (Thematic Apperception Test Murray): 10 张 (sys_tat1 ~ sys_tat10)
 *
 * 用法：
 *   node scripts/seed-images.js
 * 输出：
 *   scripts/seed/seed_images_20.json
 */

const fs = require('fs');
const path = require('path');

const OUT_DIR = path.resolve(__dirname, 'seed');
const OUT_FILE = path.join(OUT_DIR, 'seed_images_20.json');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const now = Date.now();

// 罗夏 10 张 — 通用中文描述（仅描述轮廓/常见首反应，不构成完整施测）
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
  },
  {
    n: 7,
    name: '罗夏卡片 VII · 双人头部或发饰',
    desc: '浅灰对称墨迹 VII，上部常见两个相对的人头侧影或女性发饰，与人际、亲密主题关联。'
  },
  {
    n: 8,
    name: '罗夏卡片 VIII · 多色动物与脊柱',
    desc: '粉橙绿黄多色对称墨迹 VIII，两侧常被感知为动物（鼠/兔/熊），中央脊柱样结构。'
  },
  {
    n: 9,
    name: '罗夏卡片 IX · 暖色人与妖魔轮廓',
    desc: '橙黄绿粉混合的对称墨迹 IX，常见解读为双人、人形或妖魔轮廓，色彩反应较突出。'
  },
  {
    n: 10,
    name: '罗夏卡片 X · 终末卡与多样感知',
    desc: '色彩最丰富的对称墨迹 X，常见螃蟹、蜘蛛、兔等多样感知，反映整合与终末情绪。'
  }
];

// TAT 10 张 — 选取 Murray 经典卡片 + 青少年主题卡（仅场景描述，非版权扫描图）
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
  },
  {
    n: 7,
    name: 'TAT 卡片 7 · 课堂少年与同伴',
    desc: '校园课堂或操场场景，少年与同伴互动，常引出同伴关系、校园适应、归属感主题，贴合青少年群体。'
  },
  {
    n: 8,
    name: 'TAT 卡片 8 · 灯下独坐少年',
    desc: '夜晚台灯下独坐学习的少年，神情疲惫或凝思，常引出学业压力、孤独、自我期待主题。'
  },
  {
    n: 9,
    name: 'TAT 卡片 9 · 母子隔门对话',
    desc: '少年立于卧室门外，与门内母亲隔门交谈的场景，常引出亲子沟通、边界、独立与依赖主题。'
  },
  {
    n: 10,
    name: 'TAT 卡片 10 · 手机屏幕前的少年',
    desc: '少年独自凝视手机屏幕的近景，背景虚化，常引出网络成瘾、虚拟社交、孤独感与自我认同主题。'
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
