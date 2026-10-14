#!/usr/bin/env node
/**
 * build-icon-library.mjs —— 生成 SimPage 的「图标库」数据与共用选择器组件。
 *
 * 产物：
 *   1. public/icons/twemoji/*.svg         —— **自托管图标体**（构建产物，需随仓库提交，部署要用）
 *   2. public/data/icon-library.json      —— 管理后台按需 fetch（与下面 .js 数据内容逐字节一致）
 *   3. extension/lib/icon-data.js         —— 扩展侧 import（MV3 弹窗不能跨域 fetch 站点资源）
 *   4. public/data/emoji-batches/*.json   —— **图标批次**：每 128 个图标一批，整批内联为 data URI
 *   5. extension/lib/emoji-batches/*.json —— 批次随扩展包分发（内容与 4 逐字节一致）；
 *                                            扩展页 fetch 自己的包内资源**同源，不需要 host 权限**。
 *   另会把 public/scripts/icon-picker.js 逐字节复制为 extension/lib/icon-picker.js。
 *
 * 说明：选择器只提供**彩色 Emoji**（Twemoji）；单色图标集（Bootstrap Icons）与「字符」样式已移除。
 *
 * 上游数据（版本固定，升级请同时改这里与产物横幅，并重跑本脚本）：
 *   - @iconify-json/twemoji@1.2.5     彩色 emoji 体 CC-BY-4.0 © Twitter, Inc. and contributors（Iconify 打包、Twemoji fork v16.0.1；落盘为 public/icons/twemoji/）
 *   - unicode-emoji-json@0.9.0        MIT          （emoji 分组与英文名）
 *   - cldr-annotations-full@48.2.0    Unicode License（中文注释 / 关键词 / emoji 英文名 → slug）
 *   - cldr-annotations-derived-full@48.2.0  Unicode License（旗帜与 ZWJ 组合等派生中文名）
 *
 * 用法：
 *   node tools/build-icon-library.mjs                 # 优先读默认缓存目录 /tmp/icondata，缺失才联网
 *   node tools/build-icon-library.mjs --cache <dir>   # 指定缓存目录
 *   node tools/build-icon-library.mjs --offline       # 禁用联网（缺缓存即报错；自检本就不联网）
 *
 * 设计取舍：
 *   - 关键词与分类都只取「上游真实出现过的值」，绝不硬编码猜测的 slug（避免与官网漂移）。
 *   - 图标体**自托管**：构建期从 npmmirror 抓 `@iconify-json/twemoji`，
 *     把 SVG 体逐个写成 `public/icons/twemoji/<name>.svg`，运行时 URL 变成我们自己域名的
 *     静态文件，**没有任何外部 CDN 依赖**。
 *     为什么不再用 `https://api.iconify.design`（公共图标 API）：实测它有约 **60 请求 / 5 分钟 / 每 IP**
 *     的限额（两组独立测量互相印证）。选择器网格每批就是 120 个请求，一次就超额；429 的响应体不是
 *     图片，`<img>` 直接裂开，须等约 5 分钟回填。对导航站这条路走不通，因此彻底离开运行时。
 *   - Iconify 数据里的 `body` 是**不带 `<svg>` 外壳**的片段，落盘时要自己包外壳并补齐 viewBox：
 *     `width/height` 取「图标级覆盖 ?? 集合级 ?? 默认」。别名（`aliases[name].parent`）要解析成真实图标
 *     （取 parent 的 body 与尺寸）。
 *   - 数据里的 base 是**路径**（`/icons/twemoji/`）而非绝对 URL：站点可能部署在任意域名，扩展里的站点
 *     地址也是用户可配的，绝对 URL 交给消费端用「自己知道的 origin」拼（见 icon-picker.js 的 origin 参数）。
 *   - 彩色 emoji 数据里存的是「slug」而不是图标体本身：1700+ 条内联 SVG 会让**数据文件**从 KB 级
 *     膨胀到 MB 级（图标体已另存为独立文件，数据文件只留 slug），且扩展（MV3）无需跨域 fetch 也能由
 *     `styles[].base + slug + suffix` 现拼 URL。
 *   - **图标批次（v5）**：每屏渲染 120 项，若逐项 `<img src="/icons/twemoji/x.svg">` 就是 120 个请求；
 *     而 EdgeOne Makers 只走 **HTTP/1.1**（同域最多 6 并发），实测首屏 120 个请求要 4.4s 才全部解码、
 *     重载后复访（静态资源带 `max-age=0,must-revalidate`）反而更慢到 8.4s。
 *     因此把图标体按 128 个一批整包内联进 JSON，前端 `img.src = "data:image/svg+xml," + <encoded>`，
 *     首屏就只剩 **1 个**请求（且浏览器按批次缓存，后续屏幕不再重复取图）。
 *     编码选 `encodeURIComponent` 而不是 base64：实测 128 个 SVG 分别是 46100B（原文连缀）/
 *     **49601B（encodeURIComponent）** / 63538B（base64）——base64 把文本变成随机字符后 brotli
 *     反而压不动，比原文还大 38%（传输体积才是真实成本）。
 *     ⚠️ 批次路径**不写进数据产物**（否则两份产物的 JSON 主体就不再逐字节一致），
 *     由宿主用 `batchBase` 选项传入；扩展侧 path 来自 `chrome.runtime.getURL("lib/emoji-batches")`。
 *   - emoji 的 slug 复用 CLDR **英文**注释（Iconify 的 emoji 名就是它 kebab 化），不引入新依赖；
 *     一套 slug 可同时服务 twemoji / fluent-emoji-flat / noto（实测命名 100% 一致）。
 *   - CLDR 的 key 不带变体选择符 U+FE0F，而上游 emoji 字符串常常带 U+FE0F；
 *     因此必须按「移除所有 U+FE0F 后的基础码点序列」建索引再匹配，否则会丢失数百条中文名。
 *   - 中文注释拆在 annotations 与 annotationsDerived 两个包里：主注释缺旗帜与大量 ZWJ 组合，
 *     两份都要读并合并（主优先、派生兜底），否则覆盖率只有约 83%。
 *   - 自检全部改为**本地文件完整性校验**（不再打联网抽检）：既更快、又不受任何限流影响。
 *     附带好处：旧版脚本末尾那 60 个联网抽检会把用户 IP 的额度打空、导致紧接着刷新页面满屏裂图，
 *     改成纯本地校验后这个「自我伤害」也一并消失。
 *   - 不写生成时间戳：否则每次重跑都会产生无意义 diff，难以 code review。
 *   - 产物溯源信息：`.js` 产物用注释横幅；`.json` 产物**不能有注释**（必须是严格合法 JSON），
 *     出处 / 许可 / 重生成说明写成顶层合法字段 `_generated`。两份产物的 JSON 主体逐字节一致。
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// =====================================================================================
// 常量：版本、地址、路径
// =====================================================================================

const EMOJI_JSON_VERSION = "0.9.0";
const CLDR_VERSION = "48.2.0";
/** Iconify 打包的彩色图标集版本（图标体来源，构建期用，不再有运行时 CDN 依赖） */
const TW_JSON_VERSION = "1.2.5";
/** Iconify 的 Twemoji fork 对应的上游 Twemoji 版本（仅记录；官方 @twemoji/svg 是 15.0.0 且缺 Emoji 16.0） */
const TWEMOJI_VERSION = "16.0.1";

/**
 * Emoji 的渲染样式表（数据驱动）。
 *
 * 当前只提供**彩色**一种：`twemoji` 用自托管的 Twemoji 图形，产物里只存 slug，
 * URL 由 `base + slug + suffix` 现拼（base 是**路径**，由消费端用 origin 拼成绝对 URL）。
 * 样式表数据驱动：将来新增彩色集（fluent / noto）只要在产物里加一条，UI 自动多一个分段。
 * ⚠️ Twemoji 图形是 **CC-BY 4.0**，商用/分发必须保留署名（见 `license` 字段与 README）。
 * 为什么选 Twemoji 而不是 fluent-emoji-flat：后者覆盖率仅 81.7%（**不含国旗**），导航页会大片空档。
 * 为什么用 Iconify 的 twemoji fork（v16.0.1）而不是官方 @twemoji/svg（15.0.0）：官方只有 91.2%
 * 且**完全缺 Emoji 16.0 新字符**（🫩 🫆 🪾 🫟 🪉 🪏 🇨🇶 全部缺失）。
 */
const EMOJI_STYLES = [
  {
    id: "twemoji",
    label: "彩色",
    base: "/icons/twemoji/",
    suffix: ".svg",
    license: "Twemoji graphics CC-BY 4.0 © Twitter, Inc. and contributors",
  },
];

/** 上游下载地址（仅在缓存缺失时使用） */
const UPSTREAM = {
  emojiTgz: `https://registry.npmmirror.com/unicode-emoji-json/-/unicode-emoji-json-${EMOJI_JSON_VERSION}.tgz`,
  cldrTgz: `https://registry.npmmirror.com/cldr-annotations-full/-/cldr-annotations-full-${CLDR_VERSION}.tgz`,
  cldrDerivedTgz: `https://registry.npmmirror.com/cldr-annotations-derived-full/-/cldr-annotations-derived-full-${CLDR_VERSION}.tgz`,
  twIconsTgz: `https://registry.npmmirror.com/@iconify-json/twemoji/-/twemoji-${TW_JSON_VERSION}.tgz`,
};

/**
 * 缓存相对路径（解包后）。
 *
 * 为什么要两份 CLDR：`cldr-annotations-full`（主注释）里**没有旗帜与大量
 * ZWJ 组合**（实测 zh 主注释 1966 条，国旗 0 条），这些「派生注释」放在
 * 独立的 `cldr-annotations-derived-full` 包里（annotationsDerived）。只用主注释
 * 时中文名覆盖率仅约 83%，两份合并后可达 100%。合并时以主注释优先、派生注释兜底。
 *
 * 为什么要 `en`：Iconify 的 emoji 名就是 CLDR 英文注释的 kebab 化结果，彩色 emoji 的 slug 靠它
 * 生成（见 `emojiSlug`）。同名主/派生包都要读，坑与 zh 完全一致。
 *
 * `twIcons` 是 Iconify 打包的彩色图标集（`{icons, aliases, width?, height?}`），
 * 用来把 SVG body 落盘成自托管文件；解到独立子目录，避免与 CLDR 的 `package/` 相撞。
 */
const CACHE_FILES = {
  emojiGroups: "x/package/data-by-group.json",
  cldr: "x/package/annotations/zh/annotations.json",
  cldrDerived: "xd/package/annotationsDerived/zh/annotations.json",
  cldrEn: "xe/package/annotations/en/annotations.json",
  cldrDerivedEn: "xde/package/annotationsDerived/en/annotations.json",
  twIcons: "twjson/package/icons.json",
};

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..");
const OUT_JSON = path.join(REPO_ROOT, "public/data/icon-library.json");
const OUT_EMOJI_JS = path.join(REPO_ROOT, "extension/lib/icon-data.js");
const PICKER_SRC = path.join(REPO_ROOT, "public/scripts/icon-picker.js");
const PICKER_COPY = path.join(REPO_ROOT, "extension/lib/icon-picker.js");
/** 自托管图标体根目录（构建产物，必须随仓库提交） */
const ICONS_DIR = path.join(REPO_ROOT, "public/icons");
const ICONS_TWEMOJI_DIR = path.join(ICONS_DIR, "twemoji");

/**
 * 图标批次的批次大小。
 * ⚠️ 必须与数据产物里的 `emoji.batching.size` 一致，也必须与选择器的「全局下标 → 批次」换算一致
 * （前端用 `floor(全局下标 / size)` 定位批次、`% size` 定位批内偏移）。改这里要同步改选择器注释。
 */
const BATCH_SIZE = 128;
/** 数据产物版本。v5：emoji 渲染改为「按批次内联 data URI」（v4 起只提供彩色 Emoji）。 */
const LIBRARY_VERSION = 5;
/** 站点侧批次目录（构建产物，必须随仓库提交，部署要用） */
const OUT_BATCH_SITE = path.join(REPO_ROOT, "public/data/emoji-batches");
/** 扩展侧批次目录（构建产物，随扩展包分发） */
const OUT_BATCH_EXT = path.join(REPO_ROOT, "extension/lib/emoji-batches");

/** 生成产物顶部的「请勿手工修改」横幅（两行，供自检时整体剥离） */
const GENERATED_BANNER_JS =
  "/* eslint-disable */\n" +
  "/* ⚠️ 本文件由 tools/build-icon-library.mjs 从 public/scripts/icon-picker.js 自动生成，请勿直接修改。 */\n";

/** Emoji 9 个分组：组 id（组名 kebab-case）→ 中文标签。顺序沿用上游 data-by-group.json。 */
const EMOJI_GROUPS = [
  ["smileys-emotion", "表情与情绪"],
  ["people-body", "人物与身体"],
  ["animals-nature", "动物与自然"],
  ["food-drink", "食物与饮料"],
  ["travel-places", "旅行与地点"],
  ["activities", "活动"],
  ["objects", "物品"],
  ["symbols", "符号"],
  ["flags", "旗帜"],
];

// =====================================================================================
// 小工具
// =====================================================================================

/** 打印一行普通日志 */
function log(...args) {
  console.log(...args);
}

/** 读取 JSON 文件 */
function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/** 确保目录存在 */
function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/** 组名 → kebab-case id（`Smileys & Emotion` → `smileys-emotion`） */
function kebab(name) {
  return name
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** 去重（大小写不敏感）并按原顺序保留首次出现 */
function uniqueWords(words) {
  const seen = new Set();
  const out = [];
  for (const raw of words) {
    const word = String(raw || "").trim();
    if (!word) continue;
    const key = word.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(word);
  }
  return out;
}

/**
 * 把词数组拼成关键词串，并在 maxLength 处截断到单词边界。
 * @param {string[]} words
 * @param {number} maxLength
 * @returns {string}
 */
function clampWords(words, maxLength) {
  const out = [];
  let length = 0;
  for (const word of words) {
    const extra = out.length === 0 ? word.length : word.length + 1;
    if (length + extra > maxLength) break;
    out.push(word);
    length += extra;
  }
  return out.join(" ");
}

/** 移除所有变体选择符 U+FE0F，得到「基础码点序列」，用于与 CLDR key 对齐 */
function stripVariationSelectors(value) {
  return String(value).replace(/\uFE0F/g, "");
}

/**
 * 清洗 CLDR 派生注释的显示名。
 *
 * `cldr-annotations-derived-full` 的 `tts[0]` 是「A: B」形态（如 `旗: 中国`、`男人: 卷发`），
 * 直接作为名字很别扭。清洗规则：
 *   - Flags 组 `旗: X` → `X`（得到「中国」「菲律宾」）
 *   - 其它 `A: B`   → `BA`（`男人: 卷发` → 「卷发男人」，`人: 红发` → 「红发人」）
 * 只作用于**显示名**；关键词里仍保留原始 `tts[0]`，搜索面不缩水。
 *
 * @param {string} name CLDR tts[0] 原名
 * @param {boolean} isFlag 是否属于 Flags 分组
 * @returns {string}
 */
function cleanDisplayName(name, isFlag) {
  const match = /^(.+?)\s*[:：]\s*(.+)$/.exec(name);
  if (!match) return name;
  const left = match[1].trim();
  const right = match[2].trim();
  if (!left || !right) return name;
  return isFlag ? right : `${right}${left}`;
}

/**
 * CLDR 英文注释 → Iconify emoji 名（slug）。
 *
 * Iconify 的 emoji 集（twemoji / fluent-emoji-flat / noto）名就是 CLDR 英文 `tts[0]` 的
 * kebab 化结果，但直接 `kebab()` 会踩四个坑，全部靠实测踩出来的，缺一步就掉几十条：
 *   1. `piñata` → 不去变音符会得到 `pi-ata`（NFD 分解后要剥掉组合记号）；
 *   2. `U.S. Outlying Islands` → 不特殊处理会得到 `u-s-outlying-islands`；
 *   3. `one o’clock` → 弯引号 U+2019 不在 `[^a-z0-9]` 白名单外的处理里，会变成 `one-o-clock`；
 *   4. `keycap: #` / `keycap: *` 不是 `keycap-<字符>` 而是 `keycap-pound` / `keycap-asterisk`。
 *
 * 实测 1914 条 emoji 的 twemoji 覆盖率 **1914/1914 = 100%**（openmoji 99.9%、noto 86.4%）。
 *
 * @param {string} name CLDR 英文 tts[0]（如 `flag: China`、`rocket`）
 * @returns {string} kebab-case slug（如 `flag-china`、`rocket`）
 */
function emojiSlug(name) {
  if (name === "keycap: #") return "keycap-pound";
  if (name === "keycap: *") return "keycap-asterisk";
  return String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // piñata → pinata（不去变音符会得到 pi-ata）
    .replace(/\bU\.S\./g, "us") // U.S. → us（不处理会得到 u-s-outlying-islands）
    .replace(/[\u2018\u2019\u02BC'`]/g, "") // o’clock → oclock（弯引号，U+2019）
    .replace(/^flag:\s*/i, "flag-") // flag: China → flag-China
    .replace(/^keycap:\s*/i, "keycap-")
    .toLowerCase()
    .replace(/&/g, " and ") // São Tomé & Príncipe
    .replace(/[()]/g, " ") // A button (blood type)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// =====================================================================================
// 加载上游数据（优先缓存，缺失再联网）
// =====================================================================================

/** 关闭会被沙箱注入的代理环境变量，避免请求走失效代理 */
function scrubProxyEnv() {
  for (const key of [
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "http_proxy",
    "https_proxy",
    "ALL_PROXY",
    "all_proxy",
  ]) {
    delete process.env[key];
  }
  process.env.NO_PROXY = "*";
  process.env.no_proxy = "*";
}

/** 下载文件到目标路径（跟随重定向） */
async function downloadTo(url, dest) {
  scrubProxyEnv();
  ensureDir(path.dirname(dest));
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`下载失败：${url} → HTTP ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(dest, buffer);
  return buffer.length;
}

/**
 * 解包 tgz 到 <cache>/<sub>（tgz 内为 package/... 结构）
 * @param {string} tgzPath
 * @param {string} cacheDir
 * @param {string} [sub="x"]
 */
function extractTgz(tgzPath, cacheDir, sub = "x") {
  const target = path.join(cacheDir, sub);
  ensureDir(target);
  const result = spawnSync("tar", ["-xzf", tgzPath, "-C", target], { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`解包失败：${tgzPath}`);
  }
}

/**
 * 保证某份上游数据已就绪（缓存命中直接用，否则下载）。
 * @param {{kind: "file"|"tgz", relPath: string, url: string, extractTo?: string, tgzName?: string}} spec
 *   `tgzName` 是 tgz 的本地缓存文件名（同一个 tgz 被多次解到不同子目录时复用同一份，避免重复下载）；
 *   省略时按 URL 的 basename 取名。
 * @param {string} cacheDir
 * @param {boolean} offline
 */
async function ensureData(spec, cacheDir, offline) {
  const localPath = path.join(cacheDir, spec.relPath);
  if (fs.existsSync(localPath)) {
    return localPath;
  }
  if (offline) {
    throw new Error(`离线模式但缓存缺失：${localPath}`);
  }
  log(`  ↳ 缓存缺失，联网下载：${spec.url}`);
  if (spec.kind === "file") {
    await downloadTo(spec.url, localPath);
  } else {
    const tgzFile = spec.tgzName || path.basename(spec.url);
    const tgzPath = path.join(cacheDir, tgzFile);
    if (!fs.existsSync(tgzPath)) await downloadTo(spec.url, tgzPath);
    extractTgz(tgzPath, cacheDir, spec.extractTo || "x");
  }
  if (!fs.existsSync(localPath)) {
    throw new Error(`下载/解包后仍找不到：${localPath}`);
  }
  return localPath;
}

// =====================================================================================
// 自托管图标体：把 Iconify 的 body 片段包成完整 SVG 并落盘
// =====================================================================================

/**
 * 把 Iconify 的 `body` 片段包成完整 SVG 字符串。
 *
 * ⚠️ Iconify 数据里的 `body` **不含 `<svg>` 外壳**（形如 `<path fill="currentColor" d="…"/>`），
 * 必须自己补外壳与 `viewBox`，否则写出来的不是合法 SVG。
 * `width/height="1em"`：给出内在尺寸，`<img>` 才会有非 0 的 `naturalWidth`（便于消费端探测加载成功），
 * 显示尺寸仍由 CSS 决定。
 *
 * @param {string} body
 * @param {number} width
 * @param {number} height
 * @returns {string}
 */
function wrapSvg(body, width, height) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 ${width} ${height}">${body}</svg>\n`;
}

/**
 * 解析一个图标名对应的 body 与尺寸，自动跟随别名（alias）。
 *
 * 尺寸取值链：图标级 `width/height` → 集合级 `width/height` → `fallback`。
 * 别名（`aliases[name].parent`）指向真实图标，取 parent 的 body 与尺寸；若别名自带尺寸则优先。
 *
 * @param {{icons: Record<string, {body: string, width?: number, height?: number}>, aliases?: Record<string, {parent: string, width?: number, height?: number}>, width?: number, height?: number}} setData
 * @param {string} name
 * @param {number} fallback 集合级未声明尺寸时的默认值
 * @returns {{body: string, width: number, height: number} | null} 找不到返回 null
 */
function resolveIcon(setData, name, fallback) {
  const direct = setData.icons && setData.icons[name];
  if (direct && direct.body) {
    return {
      body: direct.body,
      width: direct.width ?? setData.width ?? fallback,
      height: direct.height ?? setData.height ?? fallback,
    };
  }
  const alias = setData.aliases && setData.aliases[name];
  if (alias && alias.parent) {
    const parent = setData.icons && setData.icons[alias.parent];
    if (parent && parent.body) {
      return {
        body: parent.body,
        width: alias.width ?? parent.width ?? setData.width ?? fallback,
        height: alias.height ?? parent.height ?? setData.height ?? fallback,
      };
    }
  }
  return null;
}

/**
 * 清空目录并写入一批 SVG 文件。
 *
 * ⚠️ 清空前**断言目标路径确实位于仓库的 `public/icons/` 之下**，避免路径写错时误删他处。
 * 每次构建都整体重建目录（先 rm 再写），保证图标名变动后不会残留陈旧文件。
 *
 * @param {string} dir
 * @param {Array<{name: string, svg: string}>} files
 * @returns {{count: number, bytes: number, min: number, max: number, avg: number}}
 */
function writeIconFiles(dir, files) {
  const resolved = path.resolve(dir);
  const root = path.resolve(ICONS_DIR);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error(`拒绝写入：${resolved} 不在 ${root} 之内（保护性断言，避免误删）。`);
  }
  fs.rmSync(resolved, { recursive: true, force: true });
  ensureDir(resolved);

  let bytes = 0;
  let min = Infinity;
  let max = 0;
  for (const file of files) {
    const size = Buffer.byteLength(file.svg);
    bytes += size;
    if (size < min) min = size;
    if (size > max) max = size;
    fs.writeFileSync(path.join(resolved, `${file.name}.svg`), file.svg, "utf8");
  }
  return {
    count: files.length,
    bytes,
    min: min === Infinity ? 0 : min,
    max,
    avg: files.length ? Math.round(bytes / files.length) : 0,
  };
}

/**
 * 校验一个图标目录：文件数与名字集合一一对应，且每个文件都是「非空、以 <svg 开头、以 </svg> 结尾、
 * 含 `viewBox="0 0 <正数> <正数>"`」。
 *
 * ⚠️ viewBox 这一条是**必需**的：Iconify 的集级与图标级都可能不声明 `width`/`height`，
 * 此时必须按约定补缺省（本仓库的 twemoji 集级已声明 36×36，落入 `resolveIcon` 的 fallback 分支）；
 * 若漏了这层缺省，会写出 `viewBox="0 0 undefined undefined"`，
 * 浏览器按 0×0 处理 → 图标不可见。这里抽出两个数值并断言为**正有限数**，把这类问题钉死在构建期。
 * （允许小数是必要的：上游 twemoji 的 `watermelon` 自带 `height: 25.22`，把它强改成整数会与上游快照
 * 逐字节比对失败。`main()` 里另有一条断言：全量里「非整数 viewBox」只允许这一个例外。）
 *
 * 这就是自托管方案的**本地自检**——取代了旧版结尾那 60 个联网直链抽检：
 * 更快、不受任何限流影响，也不会再把用户 IP 的额度打空（旧版会自我伤害）。
 *
 * @param {string} dir
 * @param {string[]} expectedNames
 * @param {string} label
 * @returns {{count: number, bytes: number, min: number, max: number, avg: number, nonInteger: string[]}}
 */
function verifyIconDir(dir, expectedNames, label) {
  const entries = fs.readdirSync(dir).filter((name) => name.endsWith(".svg"));
  const actual = new Set(entries.map((name) => name.slice(0, -".svg".length)));
  const expected = new Set(expectedNames);
  const missing = [...expected].filter((name) => !actual.has(name));
  const extra = [...actual].filter((name) => !expected.has(name));
  if (
    entries.length !== expected.size ||
    actual.size !== expected.size ||
    missing.length > 0 ||
    extra.length > 0
  ) {
    throw new Error(
      `${label} 图标文件不一致：实际 ${entries.length} 个（唯一 ${actual.size}），期望 ${expected.size} 个；` +
        `缺 ${missing.length} 个（${missing.slice(0, 5).join(", ")}）、多 ${extra.length} 个（${extra.slice(0, 5).join(", ")}）`,
    );
  }

  let bytes = 0;
  let min = Infinity;
  let max = 0;
  const nonInteger = [];
  for (const entry of entries) {
    const text = fs.readFileSync(path.join(dir, entry), "utf8");
    const size = Buffer.byteLength(text);
    bytes += size;
    if (size < min) min = size;
    if (size > max) max = size;
    if (!text || !text.startsWith("<svg") || !text.trimEnd().endsWith("</svg>")) {
      throw new Error(`${label} 图标文件内容非法（非空 / SVG 外壳检查未通过）：${entry}`);
    }
    // viewBox 必须是 `0 0 <正数> <正数>`；数值缺失（undefined/NaN）或非正数一律 fail。
    const match = text.match(/viewBox="([^"]+)"/);
    const parts = match ? match[1].trim().split(/\s+/) : [];
    const w = Number(parts[2]);
    const h = Number(parts[3]);
    if (
      !match ||
      parts.length !== 4 ||
      parts[0] !== "0" ||
      parts[1] !== "0" ||
      !Number.isFinite(w) ||
      !Number.isFinite(h) ||
      w <= 0 ||
      h <= 0
    ) {
      throw new Error(`${label} 图标文件的 viewBox 非法（应为 0 0 <正数> <正数>）：${entry} → "${match ? match[1] : "(缺失)"}"`);
    }
    if (!Number.isInteger(w) || !Number.isInteger(h)) nonInteger.push(entry);
  }
  return { count: entries.length, bytes, min, max, avg: Math.round(bytes / entries.length), nonInteger };
}

// =====================================================================================
// 构建 Emoji 部分
// =====================================================================================

/**
 * 构建 emoji 段。
 * @param {Array<{name: string, emojis: Array<{emoji: string, name: string, slug: string}>}>} groups
 * @param {Record<string, {default?: string[], tts?: string[]}>} annotations         CLDR 主注释（zh）
 * @param {Record<string, {default?: string[], tts?: string[]}>} derivedAnnotations  CLDR 派生注释（zh，兜底）
 * @param {Record<string, {default?: string[], tts?: string[]}>} enAnnotations       CLDR 主注释（en）
 * @param {Record<string, {default?: string[], tts?: string[]}>} enDerivedAnnotations CLDR 派生注释（en，兜底）
 */
function buildEmoji(groups, annotations, derivedAnnotations, enAnnotations, enDerivedAnnotations) {
  // 按「移除 FE0F 后的基础码点序列」建索引（CLDR key 不带 FE0F）。
  // 先放派生注释、再用主注释覆盖，保证主注释优先。
  const byBase = new Map();
  for (const [emoji, info] of Object.entries(derivedAnnotations)) {
    byBase.set(stripVariationSelectors(emoji), info);
  }
  for (const [emoji, info] of Object.entries(annotations)) {
    byBase.set(stripVariationSelectors(emoji), info);
  }
  // 英文索引同理（主/派生合并策略与中文完全一致）
  const enByBase = new Map();
  for (const [emoji, info] of Object.entries(enDerivedAnnotations)) {
    enByBase.set(stripVariationSelectors(emoji), info);
  }
  for (const [emoji, info] of Object.entries(enAnnotations)) {
    enByBase.set(stripVariationSelectors(emoji), info);
  }

  const labelOf = new Map(EMOJI_GROUPS);
  const outGroups = [];
  let total = 0;
  let withChinese = 0;
  let slugFallbacks = 0;

  for (const group of groups) {
    const id = kebab(group.name);
    const label = labelOf.get(id) || group.name;
    const items = [];

    for (const entry of group.emojis) {
      const emoji = entry.emoji;
      const info = byBase.get(stripVariationSelectors(emoji)) || annotations[emoji] || null;
      const tts = info && Array.isArray(info.tts) ? info.tts : [];
      const defaults = info && Array.isArray(info.default) ? info.default : [];

      const rawName = typeof tts[0] === "string" ? tts[0].trim() : "";
      let cnName = rawName;
      let keywords;
      if (rawName) {
        withChinese += 1;
        cnName = cleanDisplayName(rawName, id === "flags");
        // 关键词同时保留「清洗后的显示名」与「CLDR 原始 tts[0]」，
        // 这样搜「中国」「旗」「卷发」都能命中（显示名好看，搜索面不缩水）。
        keywords = clampWords(uniqueWords([cnName, rawName, ...defaults.slice(0, 4)]), 60);
      } else {
        cnName = entry.name || "";
        keywords = clampWords(uniqueWords(String(entry.slug || "").split("_")), 60);
      }

      // slug：优先用 CLDR 英文 tts[0] 生成（Iconify 的 emoji 名来源）。
      // 理论覆盖 100%，这里保留一个兜底分支（上游 emoji 名转 kebab），但会计数并在自检里断言为 0。
      const enInfo = enByBase.get(stripVariationSelectors(emoji)) || enAnnotations[emoji] || null;
      const enTts = enInfo && Array.isArray(enInfo.tts) ? enInfo.tts : [];
      const enName = typeof enTts[0] === "string" ? enTts[0].trim() : "";
      let slug = enName ? emojiSlug(enName) : "";
      if (!slug) {
        slug = emojiSlug(String(entry.slug || "").replace(/_/g, " "));
        slugFallbacks += 1;
      }

      // 四元组：[字符, 中文名, 关键词, slug]
      items.push([emoji, cnName, keywords, slug]);
      total += 1;
    }

    outGroups.push({ id, label, items });
  }

  const uniqueSlugs = new Set(outGroups.flatMap((group) => group.items.map((item) => item[3])));

  return { groups: outGroups, total, withChinese, slugFallbacks, uniqueSlugCount: uniqueSlugs.size };
}

// =====================================================================================
// 落盘
// =====================================================================================

/**
 * JSON 产物的出处 / 许可 / 重生成说明。
 *
 * ⚠️ 这里刻意写成 **JSON 内的合法字段**（`_generated`）而不是注释：
 * `.json` 文件必须是严格合法 JSON，否则 `JSON.parse` / `jq` / 编辑器校验 / 任何未来消费者都会失败。
 * 组件侧因此可以直接 `response.json()`，不需要也不允许「剥注释」兜底。
 */
const GENERATED_NOTE =
  "本文件由 tools/build-icon-library.mjs 生成，请勿手工修改；重新生成：node tools/build-icon-library.mjs。" +
  "本图标库只提供**彩色 Emoji**（Twemoji）。" +
  `v5：图标体按 emoji.batching.size=${BATCH_SIZE} 个一批整包内联为 data URI，` +
  "前端每屏只需 1 个请求（批次路径由宿主用 batchBase 传入，不写在本文件里）。" +
  "上游数据与许可：" +
  `图标体**自托管**于 public/icons/twemoji/（由 @iconify-json/twemoji@${TW_JSON_VERSION} 生成，运行时无外部 CDN 依赖）；` +
  `unicode-emoji-json@${EMOJI_JSON_VERSION}（MIT）；` +
  `cldr-annotations-full@${CLDR_VERSION} 与 cldr-annotations-derived-full@${CLDR_VERSION}（Unicode License，中英文注释）；` +
  "Twemoji graphics CC-BY 4.0 © Twitter, Inc. and contributors。";

const JS_DATA_BANNER =
  "/*\n" +
  " * SimPage 图标库数据（生成产物，请勿手工修改）。\n" +
  " * 由 tools/build-icon-library.mjs 生成；数据与 public/data/icon-library.json 完全一致。\n" +
  " *\n" +
  " * 本图标库只提供**彩色 Emoji**（Twemoji）。\n" +
  ` * v5：图标体按 ${BATCH_SIZE} 个一批内联为 data URI（见 emoji.batching），前端每屏只需 1 个请求。\n` +
  " * 上游数据与许可：\n" +
  ` *   - @iconify-json/twemoji@${TW_JSON_VERSION}         彩色 emoji 体 CC-BY-4.0       © Twitter, Inc. and contributors（Twemoji fork v${TWEMOJI_VERSION}，已落盘为 public/icons/twemoji/）\n` +
  ` *   - unicode-emoji-json@${EMOJI_JSON_VERSION}          emoji 分组与英文名  MIT\n` +
  ` *   - cldr-annotations-full@${CLDR_VERSION}     中英文注释      Unicode License\n` +
  ` *   - cldr-annotations-derived-full@${CLDR_VERSION}  派生中英文注释  Unicode License\n` +
  " *\n" +
  " * 修改数据请改 tools/build-icon-library.mjs 后重新生成，不要直接编辑本文件。\n" +
  " */\n";

/**
 * 从产物文本中抽取 JSON 主体：从第一个 `{` 起、去掉尾部 `;` 与空白。
 * JSON 产物无横幅，JS 产物前面是注释横幅 + `export const ICON_LIBRARY = `，两者主体应逐字节相同。
 * @param {string} text
 * @returns {string}
 */
function extractJsonBody(text) {
  const start = text.indexOf("{");
  if (start < 0) return "";
  return text.slice(start).replace(/;\s*$/, "").trimEnd();
}

/** 拷贝选择器组件到扩展（加两行横幅），并断言正文一致 */
function copyIconPicker() {
  if (!fs.existsSync(PICKER_SRC)) {
    throw new Error(`找不到选择器源文件：${PICKER_SRC}`);
  }
  const source = fs.readFileSync(PICKER_SRC, "utf8");
  ensureDir(path.dirname(PICKER_COPY));
  fs.writeFileSync(PICKER_COPY, GENERATED_BANNER_JS + source, "utf8");

  const written = fs.readFileSync(PICKER_COPY, "utf8");
  const stripped = written.slice(GENERATED_BANNER_JS.length);
  if (stripped !== source) {
    throw new Error("extension/lib/icon-picker.js 去掉横幅后与源文件不一致");
  }
  return { bytes: Buffer.byteLength(written), sourceBytes: Buffer.byteLength(source) };
}

/**
 * 生成「图标批次」文件：把图标体按 `BATCH_SIZE` 个一批，整批内联成一个 JSON 数组。
 *
 * 动机：前端每屏渲染 120 项，逐项 `<img src="/icons/twemoji/x.svg">` 就是 120 个请求；
 * 而 EdgeOne Makers 只走 HTTP/1.1（同域最多 6 并发），实测首屏要 4.4s 才全部解码。
 * 内联后前端 `img.src = "data:image/svg+xml," + <encoded>`，首屏只剩 1 个请求。
 *
 * 编码选 `encodeURIComponent`：实测 128 个 SVG 为 46100B（原文）/ 49601B（encodeURIComponent）/
 * 63538B（base64）；base64 把文本变成随机字符后 brotli 压不动，比原文还大。
 * 注意属性值里的 `#` 会被编码成 `%23`，正好补上 data URI 里 `#` 会被当片段标识符的坑。
 *
 * ⚠️ 两处产物（public/data/emoji-batches 与 extension/lib/emoji-batches）必须**逐字节一致**；
 * ⚠️ 批次顺序必须与 `emoji.groups` 展平后的顺序完全一致——前端按下标定位：
 *   批次号 = `floor(全局下标 / BATCH_SIZE)`，批内偏移 = `全局下标 % BATCH_SIZE`。
 *
 * @param {Array<{name: string, svg: string}>} files 图标体，顺序必须 = 全部 emoji 的展平顺序
 * @returns {{count: number, bytes: number, removed: number, lastSize: number}}
 */
function writeBatches(files) {
  const batches = [];
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    batches.push(files.slice(i, i + BATCH_SIZE).map((file) => encodeURIComponent(file.svg)));
  }
  ensureDir(OUT_BATCH_SITE);
  ensureDir(OUT_BATCH_EXT);

  let bytes = 0;
  for (let i = 0; i < batches.length; i += 1) {
    // 不加多余空白：数组形状与前端 decode 后按下标取值的方式一一对应
    const text = `${JSON.stringify(batches[i])}\n`;
    fs.writeFileSync(path.join(OUT_BATCH_SITE, `${i}.json`), text, "utf8");
    fs.writeFileSync(path.join(OUT_BATCH_EXT, `${i}.json`), text, "utf8");
    bytes += Buffer.byteLength(text);
  }

  // 清掉上一轮遗留的多余文件（批次数变少时旧文件不会被覆盖，会变成"孤儿"被打包/部署）
  const expected = new Set(batches.map((_, i) => `${i}.json`));
  let removed = 0;
  for (const dir of [OUT_BATCH_SITE, OUT_BATCH_EXT]) {
    for (const entry of fs.readdirSync(dir)) {
      if (!entry.endsWith(".json") || expected.has(entry)) continue;
      fs.unlinkSync(path.join(dir, entry));
      removed += 1;
    }
  }

  return {
    count: batches.length,
    bytes,
    removed,
    lastSize: batches.length > 0 ? batches[batches.length - 1].length : 0,
  };
}

/**
 * 自检「图标批次」：两处目录逐字节一致 + 每条 decode 后与图标体逐字节一致 + 顺序正确。
 *
 * 刻意**独立重算**一遍（按全局下标顺序从 `files` 取，而不是复用 writeBatches 的中间结果），
 * 避免「写的时候算错、检查的时候用同一份算错的中间值」这种自证式通过。
 *
 * @param {Array<{name: string, svg: string}>} files
 * @param {{count: number}} info
 */
function verifyBatches(files, info) {
  let byteDiff = 0;
  let notEncoded = 0;
  let mismatch = 0;
  let decodedCount = 0;
  const mismatched = [];

  for (let b = 0; b < info.count; b += 1) {
    const name = `${b}.json`;
    const siteText = fs.readFileSync(path.join(OUT_BATCH_SITE, name), "utf8");
    const extText = fs.readFileSync(path.join(OUT_BATCH_EXT, name), "utf8");
    if (siteText !== extText) byteDiff += 1;
    const batch = JSON.parse(siteText);
    for (let i = 0; i < batch.length; i += 1) {
      const encoded = batch[i];
      const globalIndex = b * BATCH_SIZE + i;
      if (typeof encoded !== "string" || !encoded.startsWith("%3C")) notEncoded += 1;
      if (decodeURIComponent(encoded) !== files[globalIndex].svg) {
        mismatch += 1;
        if (mismatched.length < 5) mismatched.push(`${b}.json[${i}]`);
      }
      decodedCount += 1;
    }
  }

  if (byteDiff !== 0) throw new Error(`站点与扩展两处批次目录有 ${byteDiff} 个文件不一致。`);
  if (notEncoded !== 0) throw new Error(`有 ${notEncoded} 条不是 encodeURIComponent 形式（期望以 %3C 开头，即 "<svg"）。`);
  if (mismatch !== 0) throw new Error(`有 ${mismatch} 条 decode 后与图标体不一致：${mismatched.join(",")}`);
  if (decodedCount !== files.length) {
    throw new Error(`批次条目总数 ${decodedCount} ≠ 图标体总数 ${files.length}。`);
  }
  return { decodedCount };
}

// =====================================================================================
// 主流程
// =====================================================================================

async function main() {
  const argv = process.argv.slice(2);
  let cacheDir = "/tmp/icondata";
  let offline = false;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--cache" && argv[i + 1]) cacheDir = argv[i + 1];
    if (argv[i] === "--offline") offline = true;
  }
  log(`[构建] 缓存目录：${cacheDir}${offline ? "（离线模式）" : ""}`);

  // 1. 准备上游数据
  const emojiPath = await ensureData({ kind: "file", relPath: CACHE_FILES.emojiGroups, url: UPSTREAM.emojiTgz }, cacheDir, offline);
  // 四份 CLDR 注释：zh 主/派生（显示名与关键词）+ en 主/派生（emoji slug）。
  // 同一个 tgz 被解到不同子目录，故显式指定 tgzName 复用同一份缓存，避免重复下载。
  const cldrPath = await ensureData(
    { kind: "tgz", relPath: CACHE_FILES.cldr, url: UPSTREAM.cldrTgz, extractTo: "x", tgzName: "cldr.tgz" },
    cacheDir,
    offline,
  );
  const cldrDerivedPath = await ensureData(
    { kind: "tgz", relPath: CACHE_FILES.cldrDerived, url: UPSTREAM.cldrDerivedTgz, extractTo: "xd", tgzName: "cldrder.tgz" },
    cacheDir,
    offline,
  );
  const cldrEnPath = await ensureData(
    { kind: "tgz", relPath: CACHE_FILES.cldrEn, url: UPSTREAM.cldrTgz, extractTo: "xe", tgzName: "cldr.tgz" },
    cacheDir,
    offline,
  );
  const cldrDerivedEnPath = await ensureData(
    { kind: "tgz", relPath: CACHE_FILES.cldrDerivedEn, url: UPSTREAM.cldrDerivedTgz, extractTo: "xde", tgzName: "cldrder.tgz" },
    cacheDir,
    offline,
  );
  // Iconify 打包的彩色图标集（图标体来源）；解到独立子目录，避免与 CLDR 的 package/ 相撞。
  const twIconsPath = await ensureData(
    { kind: "tgz", relPath: CACHE_FILES.twIcons, url: UPSTREAM.twIconsTgz, extractTo: "twjson" },
    cacheDir,
    offline,
  );

  const emojiGroupsRaw = readJSON(emojiPath);
  const cldrRaw = readJSON(cldrPath);
  const cldrDerivedRaw = readJSON(cldrDerivedPath);
  const cldrEnRaw = readJSON(cldrEnPath);
  const cldrDerivedEnRaw = readJSON(cldrDerivedEnPath);
  const twSetData = readJSON(twIconsPath);
  // CLDR 结构：主包 { annotations: { identity, annotations } }；派生包 { annotationsDerived: { identity, annotations } }
  // ⚠️ 两个包的外层 key 不同，照抄一层会静默取到 { identity, annotations } 这个壳、命中数变 0（且不报错）。
  const pickAnnotations = (raw, key) => {
    const holder = raw[key];
    if (holder && holder.annotations) return holder.annotations;
    return holder || {};
  };
  const annotations = pickAnnotations(cldrRaw, "annotations");
  const derivedAnnotations = pickAnnotations(cldrDerivedRaw, "annotationsDerived");
  const enAnnotations = pickAnnotations(cldrEnRaw, "annotations");
  const enDerivedAnnotations = pickAnnotations(cldrDerivedEnRaw, "annotationsDerived");

  // 2. 构建数据对象
  const emoji = buildEmoji(emojiGroupsRaw, annotations, derivedAnnotations, enAnnotations, enDerivedAnnotations);
  const allEmoji = emoji.groups.flatMap((group) => group.items);

  // 3. 落盘自托管图标体：把 Iconify 的 body 逐个包成完整 SVG。
  //    twemoji：1914 个 slug（有 2 个是别名，如 on-arrow → on-exclamation-arrow，需解析 parent）。
  const twemojiFiles = allEmoji.map((item) => {
    const slug = item[3];
    const resolved = resolveIcon(twSetData, slug, 36);
    if (!resolved) throw new Error(`Iconify twemoji 集里找不到 emoji：${slug}`);
    return { name: slug, svg: wrapSvg(resolved.body, resolved.width, resolved.height) };
  });
  const twWrite = writeIconFiles(ICONS_TWEMOJI_DIR, twemojiFiles);

  /**
   * 批次数由图标体总数决定；写进产物供选择器换算（`emoji.batching`）。
   * 注意这里只写 size/count 两个数字，**不写路径**——路径由宿主用 batchBase 传。
   */
  const batchCount = Math.ceil(allEmoji.length / BATCH_SIZE);

  /** @type {object} */
  const library = {
    // 出处 / 许可 / 重生成说明写在合法字段里（JSON 不允许注释）
    _generated: GENERATED_NOTE,
    version: LIBRARY_VERSION,
    emoji: {
      sources: [
        `unicode-emoji-json@${EMOJI_JSON_VERSION} (MIT)`,
        `cldr-annotations-full@${CLDR_VERSION} (Unicode License)`,
        `cldr-annotations-derived-full@${CLDR_VERSION} (Unicode License)`,
        `CLDR en 注释 → emoji 名（slug）；彩色图形取自 @iconify-json/twemoji@${TW_JSON_VERSION}（Twemoji fork v${TWEMOJI_VERSION}，CC-BY 4.0），自托管于 ${EMOJI_STYLES[0].base}`,
      ],
      styles: EMOJI_STYLES,
      // 图标批次声明：只有尺寸与数量，**路径不写进产物**（否则两份产物主体就无法逐字节一致）
      batching: { size: BATCH_SIZE, count: batchCount },
      groups: emoji.groups,
    },
  };

  // 两份产物共享同一段 JSON 主体（逐字节相同）；
  // JSON 产物是严格合法 JSON（无注释、无横幅），JS 产物前加注释横幅 + export 包装。
  const body = JSON.stringify(library, null, 2);
  const jsonText = `${body}\n`;
  const jsText = `${JS_DATA_BANNER}export const ICON_LIBRARY = ${body};\n`;

  ensureDir(path.dirname(OUT_JSON));
  ensureDir(path.dirname(OUT_EMOJI_JS));
  fs.writeFileSync(OUT_JSON, jsonText, "utf8");
  fs.writeFileSync(OUT_EMOJI_JS, jsText, "utf8");

  const pickerCopy = copyIconPicker();

  // 3b. 落盘图标批次：站点与扩展两处，内容逐字节一致。
  //     放在数据产物之后写，但批次数已在上面算好并写进 emoji.batching。
  const batchWrite = writeBatches(twemojiFiles);

  // 4. 统计与自检
  log("\n================ 统计 ================");
  log(`Emoji 条数：${emoji.total}（期望 1914）`);
  const coverage = emoji.withChinese / emoji.total;
  log(
    `Emoji 中文名覆盖率：${(coverage * 100).toFixed(1)}%（${emoji.withChinese}/${emoji.total}）`,
  );
  if (coverage < 0.95) {
    throw new Error(
      `Emoji 中文名覆盖率 ${(coverage * 100).toFixed(1)}% 低于 95%，请检查 CLDR 主/派生注释是否都已合并。`,
    );
  }
  log(`Emoji slug：唯一 ${emoji.uniqueSlugCount} 个（其中 ${emoji.slugFallbacks} 条走了兜底分支）`);
  log(`产物字节数：public/data/icon-library.json = ${Buffer.byteLength(jsonText)}B，extension/lib/icon-data.js = ${Buffer.byteLength(jsText)}B`);
  log(`选择器组件拷贝：extension/lib/icon-picker.js = ${pickerCopy.bytes}B（源 ${pickerCopy.sourceBytes}B）`);
  log(
    `自托管图标体：public/icons/twemoji/ = ${twWrite.count} 个（${(twWrite.bytes / 1024).toFixed(1)}KB，平均 ${twWrite.avg}B）`,
  );
  log(
    `图标批次：${batchWrite.count} 个文件（每批 ${BATCH_SIZE} 个，末批 ${batchWrite.lastSize} 个），` +
      `站点侧合计 ${(batchWrite.bytes / 1024).toFixed(0)}KB（均 ${(batchWrite.bytes / batchWrite.count / 1024).toFixed(0)}KB）` +
      `${batchWrite.removed ? `；清理多余旧文件 ${batchWrite.removed} 个` : ""}`,
  );

  log("\n================ 抽检（人工目视） ================");
  log("随机 5 个 Emoji [emoji, 中文名, 关键词, slug]：");
  for (let i = 0; i < 5; i += 1) log("  ", JSON.stringify(allEmoji[Math.floor(Math.random() * allEmoji.length)]));

  // 5. 断言：JSON 产物是严格合法 JSON，且两份产物主体逐字节一致
  JSON.parse(fs.readFileSync(OUT_JSON, "utf8")); // 不合法会直接抛错
  const jsonBody = extractJsonBody(jsonText);
  const jsBody = extractJsonBody(jsText);
  if (jsonBody !== body || jsBody !== body) {
    throw new Error(
      `两份产物的数据主体不一致：jsonBody=${Buffer.byteLength(jsonBody)}B jsBody=${Buffer.byteLength(jsBody)}B body=${Buffer.byteLength(body)}B`,
    );
  }
  log(`\n✅ 自检：public/data/icon-library.json 是严格合法 JSON（JSON.parse 通过，无注释）`);
  log(
    `✅ 自检：两份产物的 JSON 主体逐字节一致（各 = ${Buffer.byteLength(body)}B，jsonBody=${Buffer.byteLength(jsonBody)}B jsBody=${Buffer.byteLength(jsBody)}B）`,
  );

  // 6. 断言：每条 emoji 都有非空 slug，且唯一 slug 数 = 1914
  const emptySlug = allEmoji.filter((item) => !item[3]).length;
  if (emptySlug !== 0) throw new Error(`有 ${emptySlug} 条 emoji 的 slug 为空。`);
  if (emoji.uniqueSlugCount !== 1914) {
    throw new Error(`唯一 slug 数 = ${emoji.uniqueSlugCount}，期望 1914（有重名，需要检查 emojiSlug 规则）。`);
  }
  log(`✅ 自检：全部 ${emoji.total} 条 emoji 均有非空 slug，唯一 slug 数 = 1914`);

  // 7. 断言：slug 规则单元用例（全是实测踩出来的怪例，改动 emojiSlug 时这里会先炸）
  const slugCases = [
    ["piñata", "pinata"],
    ["one o’clock", "one-oclock"],
    ["flag: U.S. Outlying Islands", "flag-us-outlying-islands"],
    ["keycap: #", "keycap-pound"],
    ["A button (blood type)", "a-button-blood-type"],
  ];
  for (const [input, expected] of slugCases) {
    const actual = emojiSlug(input);
    if (actual !== expected) {
      throw new Error(`emojiSlug 单元用例失败：${JSON.stringify(input)} → ${JSON.stringify(actual)}，期望 ${JSON.stringify(expected)}`);
    }
    log(`  ✓ emojiSlug(${JSON.stringify(input)}) = ${JSON.stringify(actual)}`);
  }
  log(`✅ 自检：${slugCases.length} 条 emojiSlug 单元用例全部通过`);

  // 8. 本地自检：自托管图标体的文件完整性（取代旧版结尾那 60 个联网直链抽检）。
  //    纯本地校验 → 更快、不受任何限流影响，也不会再把用户 IP 的额度打空（旧版会自我伤害）。
  log("\n================ 自检（自托管图标体完整性） ================");
  const twVerify = verifyIconDir(
    ICONS_TWEMOJI_DIR,
    allEmoji.map((item) => item[3]),
    "twemoji",
  );
  log(`✅ 自检：public/icons/twemoji/ 共 ${twVerify.count} 个 SVG，与全部 emoji 的 slug 集合一一对应（无多无缺）`);
  log(
    `✅ 自检：每个文件都非空、以 <svg 开头、以 </svg> 结尾、含 viewBox="0 0 <正数> <正数>"；` +
      `twemoji ${(twVerify.bytes / 1024).toFixed(1)}KB（平均 ${twVerify.avg}B，最小 ${twVerify.min}B，最大 ${twVerify.max}B）`,
  );
  log(`✅ 自检：全部 ${twVerify.count} 个文件的 viewBox 数值均为正数（已在上一步逐文件校验）`);

  // 例外白名单：全量里「非整数 viewBox」只允许上游自带的 twemoji/watermelon.svg（height=25.22）。
  // 这条断言让「有人把某个图标误写成小数/undefined」或者「上游新增了异常尺寸」都能立刻暴露。
  const nonIntegerFiles = twVerify.nonInteger.map((n) => `twemoji/${n}`);
  if (JSON.stringify(nonIntegerFiles) !== JSON.stringify(["twemoji/watermelon.svg"])) {
    throw new Error(
      `非整数 viewBox 的文件集合与预期不符：实际 ${JSON.stringify(nonIntegerFiles)}，期望 ["twemoji/watermelon.svg"]。`,
    );
  }
  log(`✅ 自检：非整数 viewBox 仅上游自带的 1 例（twemoji/watermelon.svg，height=25.22），其余全为整数`);

  // 定点抽检：缺省尺寸约定必须生效（twemoji 集级未声明时缺省 36×36）
  const viewBoxCases = [
    ["twemoji", path.join(ICONS_TWEMOJI_DIR, "grinning-face.svg"), "0 0 36 36"],
    ["twemoji", path.join(ICONS_TWEMOJI_DIR, "flag-china.svg"), "0 0 36 36"],
  ];
  for (const [label, file, expected] of viewBoxCases) {
    const text = fs.readFileSync(file, "utf8");
    const match = text.match(/viewBox="([^"]+)"/);
    const actual = match ? match[1] : "(缺失)";
    if (actual !== expected) {
      throw new Error(`viewBox 抽检失败：${path.relative(REPO_ROOT, file)} = "${actual}"，期望 "${expected}"`);
    }
    log(`  ✓ ${label} ${path.basename(file)} viewBox = ${actual}`);
  }
  log(`✅ 自检：${viewBoxCases.length} 条 viewBox 定点抽检全部通过`);

  // 9. 自检：图标批次（两处逐字节一致 + decode 后与图标体逐字节一致 + 顺序 = 展平顺序）
  log("\n================ 自检（图标批次） ================");
  const batchVerify = verifyBatches(twemojiFiles, batchWrite);
  log(
    `✅ 自检：public/data/emoji-batches/ 与 extension/lib/emoji-batches/ 各 ${batchWrite.count} 个文件、逐字节一致`,
  );
  log(
    `✅ 自检：${batchVerify.decodedCount} 条全部 decode 后与图标体逐字节一致，且顺序 = emoji.groups 展平顺序 ` +
      `（前端按 floor(全局下标 / ${BATCH_SIZE}) 取批次、% ${BATCH_SIZE} 取批内偏移）`,
  );
  log(`✅ 自检：数据产物里的 emoji.batching = size ${BATCH_SIZE} / count ${batchCount}（与落盘批次数一致）`);
  // 反向断言：批次路径一旦被写进产物，两份产物的 JSON 主体就会带上只有一边合理的路径。
  if (jsonText.includes("emoji-batches")) {
    throw new Error("数据产物里出现了批次路径字面量「emoji-batches」——路径必须由宿主 batchBase 传入。");
  }
  log("✅ 自检：数据产物不含批次路径字面量「emoji-batches」（路径由宿主 batchBase 传入）");

  log("\n================ 抽检：icon 文件前 120 字符（人工目视） ================");
  const sampleFiles = [
    path.join(ICONS_TWEMOJI_DIR, `${allEmoji[0][3]}.svg`),
    path.join(ICONS_TWEMOJI_DIR, `${allEmoji[Math.floor(allEmoji.length / 2)][3]}.svg`),
    path.join(ICONS_TWEMOJI_DIR, `${allEmoji[allEmoji.length - 1][3]}.svg`),
  ];
  for (const file of sampleFiles) {
    log(`  ${path.relative(REPO_ROOT, file)}`);
    log(`    ${fs.readFileSync(file, "utf8").slice(0, 120)}`);
  }

  log("\n完成。");
}

main().catch((error) => {
  console.error("\n❌ 构建失败：", error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
