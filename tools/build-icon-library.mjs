#!/usr/bin/env node
/**
 * build-icon-library.mjs —— 生成 SimPage 的「图标库」数据与共用选择器组件。
 *
 * 产物：
 *   1. public/icons/{bi,twemoji}/*.svg  —— **自托管图标体**（构建产物，需随仓库提交，部署要用）
 *   2. public/data/icon-library.json    —— 管理后台按需 fetch（与下面 .js 数据内容逐字节一致）
 *   3. extension/lib/icon-data.js        —— 扩展侧 import（MV3 弹窗不能跨域 fetch 站点资源）
 *   另会把 public/scripts/icon-picker.js 逐字节复制为 extension/lib/icon-picker.js。
 *
 * 上游数据（版本固定，升级请同时改这里与产物横幅，并重跑本脚本）：
 *   - bootstrap-icons@1.13.2          图标名与分类  MIT  © The Bootstrap Authors   https://icons.getbootstrap.com
 *   - @iconify-json/bi@1.2.7          单色图标体    MIT  © The Bootstrap Authors（Iconify 打包；图标体落盘为 public/icons/bi/）
 *   - @iconify-json/twemoji@1.2.5     彩色 emoji 体 CC-BY-4.0 © Twitter, Inc. and contributors（Iconify 打包、Twemoji fork v16.0.1；落盘为 public/icons/twemoji/）
 *   - icons.getbootstrap.com 分类目录  MIT          （分类 slug 与英文标签）
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
 *   - 图标体**自托管**：构建期从 npmmirror 抓 `@iconify-json/bi` 与 `@iconify-json/twemoji`，
 *     把 SVG 体逐个写成 `public/icons/{bi,twemoji}/<name>.svg`，运行时 URL 变成我们自己域名的
 *     静态文件，**没有任何外部 CDN 依赖**。
 *     为什么不再用 `https://api.iconify.design`（公共图标 API）：实测它有约 **60 请求 / 5 分钟 / 每 IP**
 *     的限额（两组独立测量互相印证）。选择器网格每批就是 120 个请求，一次就超额；429 的响应体不是
 *     图片，`<img>` 直接裂开，须等约 5 分钟回填。对导航站这条路走不通，因此彻底离开运行时。
 *   - Iconify 数据里的 `body` 是**不带 `<svg>` 外壳**的片段，落盘时要自己包外壳并补齐 viewBox：
 *     `width/height` 取「图标级覆盖 ?? 集合级 ?? 默认」。别名（`aliases[name].parent`）要解析成真实图标
 *     （取 parent 的 body 与尺寸）。bi 的 body 用 `currentColor`，深色反色规则继续生效。
 *   - 数据里的 base 是**路径**（`/icons/bi/`）而非绝对 URL：站点可能部署在任意域名，扩展里的站点
 *     地址也是用户可配的，绝对 URL 交给消费端用「自己知道的 origin」拼（见 icon-picker.js 的 origin 参数）。
 *   - 彩色 emoji 数据里存的是「slug」而不是图标体本身：1700+ 条内联 SVG 会让**数据文件**从 KB 级
 *     膨胀到 MB 级（图标体已另存为独立文件，数据文件只留 slug），且扩展（MV3）无需跨域 fetch 也能由
 *     `styles[].base + slug + suffix` 现拼 URL。
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

const BOOTSTRAP_VERSION = "1.13.2";
const EMOJI_JSON_VERSION = "0.9.0";
const CLDR_VERSION = "48.2.0";
/** Iconify 打包的两个图标集版本（图标体来源，构建期用，不再有运行时 CDN 依赖） */
const BI_JSON_VERSION = "1.2.7";
const TW_JSON_VERSION = "1.2.5";
/** Iconify 的 Twemoji fork 对应的上游 Twemoji 版本（仅记录；官方 @twemoji/svg 是 15.0.0 且缺 Emoji 16.0） */
const TWEMOJI_VERSION = "16.0.1";

/**
 * Bootstrap 图标体的 base **路径**。
 *
 * 为什么是路径而不是绝对 URL：站点可能部署在任意域名，扩展里的站点地址也是用户可配的，
 * 构建期写死域名会让换域名后图标全挂。消费端用「自己知道的 origin」拼出绝对 URL
 * （`icon-picker.js` 的 `origin` 参数），因此这里只给路径。
 *
 * 为什么自托管：原本计划用公共图标 API `https://api.iconify.design`，但它实测有约
 * **60 请求 / 5 分钟 / 每 IP** 的限额（两组独立测量互相印证）；选择器网格每批 120 个请求会
 * 立刻超额，429 的响应体不是图片 → `<img>` 裂开、须等约 5 分钟回填。于是把图标体逐个落盘
 * 到本仓库（见 `public/icons/`），运行时零外部依赖。
 */
const BOOTSTRAP_BASE = "/icons/bi/";

/**
 * Emoji 的渲染样式（字符 / 彩色）。
 *
 * `char` 直接渲染 emoji 字符（零网络依赖，离线可用）；`twemoji` 用自托管的 Twemoji 图形，
 * 产物里只存 slug，URL 由 `base + slug + suffix` 现拼（base 同样是**路径**）。
 * ⚠️ Twemoji 图形是 **CC-BY 4.0**，商用/分发必须保留署名（见 `license` 字段与 README）。
 * 为什么选 Twemoji 而不是 fluent-emoji-flat：后者覆盖率仅 81.7%（**不含国旗**），导航页会大片空档。
 * 为什么用 Iconify 的 twemoji fork（v16.0.1）而不是官方 @twemoji/svg（15.0.0）：官方只有 91.2%
 * 且**完全缺 Emoji 16.0 新字符**（🫩 🫆 🪾 🫟 🪉 🪏 🇨🇶 全部缺失）。
 */
const EMOJI_STYLES = [
  { id: "char", label: "字符" },
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
  bootstrapTgz: `https://cdn.npmmirror.com/packages/bootstrap-icons/${BOOTSTRAP_VERSION}/bootstrap-icons-${BOOTSTRAP_VERSION}.tgz`,
  catalog: "https://icons.getbootstrap.com/icons/index.json",
  emojiTgz: `https://registry.npmmirror.com/unicode-emoji-json/-/unicode-emoji-json-${EMOJI_JSON_VERSION}.tgz`,
  cldrTgz: `https://registry.npmmirror.com/cldr-annotations-full/-/cldr-annotations-full-${CLDR_VERSION}.tgz`,
  cldrDerivedTgz: `https://registry.npmmirror.com/cldr-annotations-derived-full/-/cldr-annotations-derived-full-${CLDR_VERSION}.tgz`,
  biIconsTgz: `https://registry.npmmirror.com/@iconify-json/bi/-/bi-${BI_JSON_VERSION}.tgz`,
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
 * `biIcons` / `twIcons` 是 Iconify 打包的两个图标集（`{icons, aliases, width?, height?}`），
 * 用来把 SVG body 落盘成自托管文件；各自解到独立子目录，避免与 CLDR 的 `package/` 相撞。
 */
const CACHE_FILES = {
  names: "x/package/font/bootstrap-icons.json",
  catalog: "catalog.json",
  emojiGroups: "x/package/data-by-group.json",
  cldr: "x/package/annotations/zh/annotations.json",
  cldrDerived: "xd/package/annotationsDerived/zh/annotations.json",
  cldrEn: "xe/package/annotations/en/annotations.json",
  cldrDerivedEn: "xde/package/annotationsDerived/en/annotations.json",
  biIcons: "bijson/package/icons.json",
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
const ICONS_BI_DIR = path.join(ICONS_DIR, "bi");
const ICONS_TWEMOJI_DIR = path.join(ICONS_DIR, "twemoji");
/** Iconify 数据里集合未声明 width/height 时的默认边长（Iconify 对多数集约定为 16） */
const DEFAULT_ICON_SIZE = 16;

/** 生成产物顶部的「请勿手工修改」横幅（两行，供自检时整体剥离） */
const GENERATED_BANNER_JS =
  "/* eslint-disable */\n" +
  "/* ⚠️ 本文件由 tools/build-icon-library.mjs 从 public/scripts/icon-picker.js 自动生成，请勿直接修改。 */\n";

/**
 * Bootstrap 官方 29 个分类：slug → 中文标签，顺序即官网侧边栏顺序，用于排序。
 * slug 是官网分类名的 slugify 结果（例如 `Alerts & Status` → `alerts-and-status`）。
 * 这里写死顺序只用于「排序与中文标签」，实际分类集合仍以 catalog.json 的真实值为准。
 */
const BOOTSTRAP_CATEGORIES = [
  ["alerts-and-status", "提醒与状态"],
  ["apps", "应用"],
  ["arrows", "箭头"],
  ["badges", "徽标"],
  ["brand", "品牌"],
  ["buildings", "建筑"],
  ["commerce", "商业"],
  ["communications", "通讯"],
  ["data", "数据"],
  ["date-and-time", "日期时间"],
  ["devices", "设备"],
  ["emoji", "表情"],
  ["entertainment", "娱乐"],
  ["files-and-folders", "文件与文件夹"],
  ["geo", "地理"],
  ["graphics", "图形"],
  ["layout", "布局"],
  ["media", "媒体"],
  ["medical", "医疗"],
  ["people", "人物"],
  ["real-world", "现实世界"],
  ["security", "安全"],
  ["shapes", "形状"],
  ["tools", "工具"],
  ["transportation", "交通"],
  ["travel", "旅行"],
  ["typography", "字体排版"],
  ["ui-and-keyboard", "界面与键盘"],
  ["weather", "天气"],
];

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

/**
 * 人工精选的中文别名表：icon-name → 空格分隔的中文别名。
 *
 * 为什么需要它：Bootstrap 官方只有英文标签，中文用户搜「书签 / 收藏」时命中不了 `bookmark`。
 * 这里覆盖导航、设置、媒体、开发、天气、购物等高频场景。
 * 表里出现的每个名字都会被脚本断言必须存在于 2078 个上游名字里，写错会直接报错退出。
 */
const ICON_ALIASES = {
  // —— 导航 / 主页 ——
  house: "首页 主页 房子 家 导航",
  "house-door": "首页 门户 入口",
  building: "建筑 公司 办公室 机构",
  buildings: "楼群 建筑 公司",
  compass: "指南针 导航 探索",
  signpost: "路标 指示 导航",
  "signpost-2": "路标 指示 导航",
  map: "地图 位置 路线",
  geo: "位置 坐标",
  "geo-alt": "定位 地点 位置",
  "pin-map": "地图标记 定位 位置",
  // —— 搜索 / 筛选 ——
  search: "搜索 查找 放大镜",
  "zoom-in": "放大 缩放",
  "zoom-out": "缩小 缩放",
  funnel: "漏斗 筛选 过滤",
  filter: "筛选 过滤",
  // —— 书签 / 收藏 / 星标 ——
  bookmark: "书签 收藏 标记",
  "bookmark-star": "书签 星标 收藏",
  "bookmark-heart": "书签 喜欢 收藏",
  bookmarks: "书签 收藏夹",
  star: "星标 收藏 星级 星星",
  "star-fill": "星标 收藏 星",
  stars: "星星 收藏 群星",
  heart: "喜欢 爱心 点赞 心",
  "heart-fill": "喜欢 爱心 点赞",
  hearts: "爱心 喜欢",
  // —— 标签 ——
  tag: "标签 标记 价格",
  tags: "标签 多个标签",
  hash: "井号 话题 标签",
  // —— 设置 / 齿轮 / 工具 ——
  gear: "设置 齿轮 配置 偏好",
  "gear-wide": "设置 齿轮 配置",
  sliders: "滑块 设置 调节 参数",
  sliders2: "滑块 设置 调节",
  wrench: "扳手 工具 维修 设置",
  tools: "工具 工具箱 设置",
  screwdriver: "螺丝刀 工具 维修",
  nut: "螺母 螺栓 设置",
  hammer: "锤子 工具 建造",
  magic: "魔法 神奇 自动",
  // —— 用户 / 人 / 团队 ——
  person: "用户 人 个人 账号",
  "person-circle": "用户 头像 个人",
  people: "团队 用户组 人群 用户",
  "person-plus": "添加用户 新增成员",
  "person-gear": "用户设置 账号管理",
  "person-badge": "用户 名片 工牌",
  "person-check": "用户确认 已认证",
  "person-lock": "用户锁定 权限",
  "person-workspace": "工作区 用户 办公",
  "person-vcard": "名片 联系人 通讯录",
  robot: "机器人 智能 助手 AI",
  "universal-access": "无障碍 通用访问",
  eyeglasses: "眼镜 视力",
  // —— 文件夹 / 文件 / 文档 ——
  folder: "文件夹 目录",
  "folder-plus": "新建文件夹 添加目录",
  "folder2-open": "打开文件夹 目录",
  file: "文件 文档",
  "file-text": "文件 文档 文本",
  "file-earmark": "文件 文档 页",
  "file-earmark-text": "文件 文档 文本",
  files: "文件 多个文件",
  "file-pdf": "PDF 文档",
  "file-code": "代码文件 源码",
  "file-word": "Word 文档",
  "file-excel": "Excel 表格",
  "file-image": "图片文件 图像",
  "file-zip": "压缩包 归档",
  "filetype-pdf": "PDF 文档",
  "filetype-doc": "Word 文档",
  "filetype-xls": "Excel 表格",
  "filetype-ppt": "PPT 演示",
  "filetype-md": "Markdown 文档",
  "filetype-json": "JSON 数据",
  "filetype-js": "JavaScript 脚本",
  "filetype-html": "HTML 网页",
  "filetype-css": "CSS 样式",
  "filetype-png": "图片 PNG",
  "filetype-jpg": "图片 JPG",
  "filetype-svg": "矢量图 SVG",
  clipboard: "剪贴板 复制 粘贴",
  "clipboard-check": "剪贴板 完成",
  // —— 日历 / 时间 ——
  calendar: "日历 日程 日期",
  "calendar-event": "日历 日程 事件",
  "calendar-week": "日历 周 日程",
  "calendar2-week": "日历 周 日程",
  "calendar-check": "日历 完成 待办",
  clock: "时钟 时间 计时",
  "clock-history": "历史 时间 最近",
  alarm: "闹钟 提醒 定时",
  stopwatch: "秒表 计时 计时器",
  hourglass: "沙漏 等待 计时",
  "hourglass-split": "沙漏 时间 处理中",
  watch: "手表 时间",
  smartwatch: "智能手表 手表",
  speedometer: "仪表盘 速度 性能",
  speedometer2: "仪表盘 速度",
  // —— 邮件 / 聊天 / 通知 ——
  envelope: "邮件 信封 消息",
  "envelope-fill": "邮件 信封",
  "envelope-at": "邮件 邮箱 电子邮箱",
  "envelope-open": "打开邮件 已读",
  chat: "聊天 消息 对话 评论",
  "chat-dots": "聊天 消息 输入中",
  "chat-left-text": "聊天 消息 评论",
  "chat-square": "聊天 消息 会话",
  "chat-quote": "引用 评论 回复",
  mailbox: "邮箱 信箱",
  send: "发送 提交 发送邮件",
  paperclip: "附件 回形针",
  megaphone: "喇叭 公告 通知 广播",
  bell: "铃铛 通知 提醒",
  "bell-slash": "静音 免打扰 关闭通知",
  inbox: "收件箱 收信",
  // —— 电话 ——
  telephone: "电话 拨打 座机",
  "telephone-fill": "电话 拨打",
  phone: "手机 电话 移动端",
  "phone-vibrate": "手机 震动 来电",
  // —— 云 / 上传下载 / 同步 ——
  cloud: "云 云端 云服务",
  "cloud-upload": "上传 云上传 备份",
  "cloud-download": "下载 云下载",
  download: "下载 保存",
  upload: "上传 提交",
  "arrow-repeat": "同步 刷新 循环 重试",
  "arrow-clockwise": "刷新 重载 顺时针",
  "arrow-counterclockwise": "撤销 逆时针 回退",
  // —— 网络 / 信号 ——
  wifi: "无线 网络 WIFI 信号",
  "wifi-off": "网络断开 无信号 离线",
  "wifi-1": "信号弱 网络",
  "wifi-2": "信号 网络",
  "reception-4": "信号 满格 网络",
  signal: "信号 网络",
  broadcast: "广播 信号 推送",
  router: "路由器 网络",
  ethernet: "网线 以太网 有线网络",
  modem: "调制解调器 网络 光猫",
  bluetooth: "蓝牙 连接",
  // —— 安全 / 锁 / 钥匙 / 隐私 ——
  lock: "锁 锁定 加密 安全",
  unlock: "解锁 开锁 公开",
  key: "钥匙 密码 密钥",
  shield: "盾牌 安全 防护 盾",
  "shield-check": "安全 验证 已保护",
  "shield-lock": "安全 加密 锁",
  fingerprint: "指纹 生物识别 身份",
  incognito: "隐身 隐私 无痕",
  eye: "眼睛 查看 可见 显示",
  "eye-slash": "隐藏 不可见 隐私 关闭显示",
  safe: "保险箱 安全 金库",
  pass: "通行证 凭证 证件",
  passport: "护照 证件 出国",
  // —— 删除 / 编辑 ——
  trash: "删除 垃圾 垃圾桶 移除",
  trash2: "删除 垃圾桶 移除",
  trash3: "删除 垃圾桶",
  pencil: "编辑 铅笔 修改 撰写",
  "pencil-square": "编辑 修改 撰写",
  pen: "钢笔 编辑 写作",
  eraser: "橡皮 清除 擦除",
  highlighter: "荧光笔 高亮 标记",
  brush: "画笔 刷子 绘图",
  palette: "调色板 配色 主题 绘画",
  "paint-bucket": "填充 油漆桶 颜色",
  scissors: "剪刀 剪切",
  copy: "复制 拷贝",
  backspace: "退格 删除",
  // —— 增删 / 勾叉 ——
  plus: "加号 添加 新增 新建",
  "plus-circle": "添加 加号 新增",
  dash: "减号 移除 减",
  "dash-circle": "减号 移除",
  check: "勾 对 完成 正确 确认",
  "check-circle": "完成 正确 勾选 成功",
  check2: "对勾 完成 确认",
  x: "叉 关闭 取消 错误 删除",
  "x-circle": "关闭 错误 取消 失败",
  "x-lg": "关闭 叉号",
  // —— 箭头 ——
  "arrow-up": "向上 上 上升",
  "arrow-down": "向下 下 下降",
  "arrow-left": "向左 左 返回 上一个",
  "arrow-right": "向右 右 前进 下一个",
  "arrow-up-short": "向上 上",
  "arrow-down-short": "向下 下",
  "arrow-left-short": "向左 左 返回",
  "arrow-right-short": "向右 右 前进",
  "arrow-return-left": "返回 后退",
  "arrow-return-right": "前进 前往",
  "arrow-left-right": "左右 交换 对比",
  "arrow-down-up": "上下 排序 交换",
  "chevron-up": "展开 向上 收起",
  "chevron-down": "下拉 向下 展开",
  "chevron-left": "左 上一个 上一页",
  "chevron-right": "右 下一个 下一页",
  "chevron-double-left": "首页 最前 上一页",
  "chevron-double-right": "末页 最后 下一页",
  "caret-down": "下拉 展开",
  "caret-up": "收起 上拉",
  "caret-left": "左 上一个",
  "caret-right": "右 下一个",
  "skip-backward": "后退 上一个 快退",
  "skip-forward": "前进 下一个 快进",
  "skip-start": "上一首 开头 回到开头",
  "skip-end": "下一首 末尾 跳到末尾",
  // —— 播放 / 音量 / 影音 ——
  play: "播放 开始",
  "play-fill": "播放 开始",
  pause: "暂停 停留",
  "pause-fill": "暂停",
  stop: "停止 终止",
  "stop-fill": "停止",
  rewind: "后退 快退 倒带",
  "fast-forward": "快进 前进",
  "volume-up": "音量 增大 声音",
  "volume-down": "音量 减小 声音",
  "volume-mute": "静音 关闭声音",
  "volume-off": "静音 关闭声音",
  eject: "弹出 退出",
  "music-note": "音乐 音符 歌曲",
  "music-note-beamed": "音乐 音符 歌曲",
  "music-player": "音乐播放器 播放器",
  headphones: "耳机 音乐",
  headset: "耳机 耳麦 客服",
  speaker: "扬声器 喇叭 音量",
  mic: "麦克风 录音 语音",
  "mic-mute": "麦克风 静音 关闭录音",
  camera: "相机 拍照 摄像头",
  "camera-video": "摄像机 视频 录像",
  webcam: "摄像头 视频通话",
  image: "图片 照片 图像",
  images: "图片 相册 图库",
  film: "电影 影片 胶片",
  boombox: "录音机 音响 音乐",
  vinyl: "唱片 黑胶 音乐",
  disc: "光盘 唱片",
  "collection-play": "播放列表 合集",
  // —— 购物 / 支付 ——
  cart: "购物车 购物 订单",
  "cart-plus": "加入购物车 添加订单",
  bag: "购物袋 购物 包",
  handbag: "手提包 购物 包",
  "credit-card": "信用卡 支付 银行卡 卡",
  wallet: "钱包 支付 余额",
  wallet2: "钱包 余额",
  cash: "现金 钱 货币",
  "cash-stack": "现金 钞票 货币",
  coin: "硬币 货币 金币",
  "currency-dollar": "美元 货币 价格",
  "currency-exchange": "货币兑换 汇率 换算",
  gift: "礼物 赠品 礼品",
  shop: "商店 店铺 商城 购物",
  "shop-window": "商店 店面 店铺",
  receipt: "收据 账单 订单",
  basket: "购物篮 购物 篮子",
  "piggy-bank": "存钱罐 储蓄 省钱",
  // —— 地球 / 位置 ——
  globe: "地球 全球 世界 国际化",
  globe2: "地球 世界 语言",
  "globe-americas": "地球 美洲 世界",
  pin: "图钉 固定 定位",
  // —— 天气 / 自然 ——
  sun: "太阳 晴天 亮度 明亮",
  "sun-fill": "太阳 晴天 明亮",
  moon: "月亮 夜间 深夜 睡眠",
  "moon-stars": "月亮 夜晚 睡眠 星空",
  "cloud-sun": "多云 天气 晴间多云",
  "cloud-rain": "下雨 降雨 天气",
  "cloud-snow": "下雪 天气 雪",
  snow: "雪 下雪 雪花",
  snow2: "雪 雪花",
  lightning: "闪电 雷电 闪",
  "lightning-charge": "闪电 充电 快充",
  thunderbolt: "闪电 雷电 电力",
  "cloud-lightning": "雷电 雷雨 天气",
  fire: "火 火焰 热门 燃烧",
  droplet: "水滴 湿度 液体",
  water: "水 液体 水位",
  umbrella: "雨伞 下雨 保护",
  wind: "风 大风 天气",
  tornado: "龙卷风 旋风 天气",
  rainbow: "彩虹 天气",
  thermometer: "温度计 温度 气温",
  clouds: "云 多云 天气",
  cloudy: "多云 阴天 天气",
  // —— 代码 / 开发 ——
  code: "代码 编程 开发",
  "code-slash": "代码 编程 斜杠",
  "code-square": "代码 编程",
  terminal: "终端 命令行 控制台",
  github: "GitHub 代码托管 开源",
  gitlab: "GitLab 代码托管",
  git: "Git 版本控制",
  braces: "花括号 代码 变量",
  regex: "正则 表达式 匹配",
  bug: "缺陷 漏洞 调试 BUG",
  // —— 品牌 / 浏览器 ——
  google: "谷歌 搜索",
  "google-play": "谷歌商店 应用市场 安卓",
  "browser-chrome": "Chrome 谷歌浏览器 浏览器",
  "browser-edge": "Edge 浏览器 微软浏览器",
  "browser-firefox": "Firefox 火狐浏览器 浏览器",
  "browser-safari": "Safari 苹果浏览器 浏览器",
  windows: "Windows 微软 视窗 系统",
  apple: "苹果 系统 手机",
  android: "安卓 安卓系统 手机",
  // —— 翻译 / 字体 ——
  translate: "翻译 语言 多语言",
  alphabet: "字母 文字 字符",
  fonts: "字体 文字 排版",
  // —— 硬件 / 存储 ——
  cpu: "处理器 CPU 芯片 计算",
  "gpu-card": "显卡 GPU 图形",
  memory: "内存 芯片 记忆",
  motherboard: "主板 电路板 硬件",
  nvme: "固态硬盘 NVMe 存储",
  hdd: "硬盘 磁盘 存储",
  "device-hdd": "硬盘 机械硬盘 存储",
  "device-ssd": "固态硬盘 SSD 存储",
  "sd-card": "存储卡 SD 卡",
  server: "服务器 主机 后端",
  "usb-drive": "U盘 移动存储 优盘",
  database: "数据库 数据存储",
  stack: "堆叠 分层 栈",
  archive: "归档 压缩 存档",
  // —— 图表 ——
  "bar-chart": "柱状图 条形图 图表 统计",
  "bar-chart-line": "折线图 图表 趋势",
  "graph-up": "增长 上升 趋势 上涨",
  "graph-down": "下降 下跌 趋势",
  "pie-chart": "饼图 图表 占比",
  activity: "活跃 脉搏 心率 动态",
  "clipboard-data": "数据 剪贴板 统计",
  // —— 列表 / 表格 / 网格 ——
  list: "列表 清单 菜单",
  "list-ul": "无序列表 列表 项目符号",
  "list-ol": "有序列表 编号列表 排行",
  "list-check": "清单 待办 已完成",
  "list-task": "任务列表 待办",
  table: "表格 数据表",
  grid: "网格 栅格 九宫格",
  "grid-3x3": "网格 九宫格 布局",
  kanban: "看板 任务板 项目",
  "view-list": "列表视图 列表",
  "view-stacked": "堆叠视图 卡片",
  columns: "分栏 列 列布局",
  "layout-sidebar": "侧边栏 布局 分栏",
  // —— 窗口 / 盒子 / 全屏 ——
  window: "窗口 界面 视窗",
  "window-fullscreen": "全屏 最大化 窗口",
  fullscreen: "全屏 放大",
  "fullscreen-exit": "退出全屏 缩小",
  "arrows-fullscreen": "全屏 放大 展开",
  box: "盒子 方块 组件",
  boxes: "盒子 组件 包裹",
  "layout-split": "分栏 布局 拆分",
  "layout-three-columns": "三栏布局 分栏",
  layers: "图层 层次 堆叠",
  "aspect-ratio": "比例 宽高比 尺寸",
  "bounding-box": "边界框 选择 框选",
  // —— 交通 ——
  "car-front": "汽车 轿车 车辆",
  truck: "卡车 货车 物流 配送",
  airplane: "飞机 航班 出行",
  "airplane-engines": "飞机 引擎 航班",
  "train-front": "火车 列车 高铁",
  "train-lightrail-front": "轻轨 地铁 列车",
  bicycle: "自行车 单车 骑行",
  scooter: "踏板车 摩托 电动车",
  "bus-front": "公交车 巴士 公交",
  rocket: "火箭 发射 上线 快速",
  "fuel-pump": "加油站 加油 燃油",
  "ev-station": "充电站 充电桩 新能源",
  "taxi-front": "出租车 的士 打车",
  "sign-railroad": "铁路 道口 火车",
  // —— 场所 ——
  bank: "银行 金融 机构 存钱",
  hospital: "医院 医疗 诊所",
  mortarboard: "学位帽 学校 毕业 教育",
  book: "书 书籍 阅读 文档",
  bookshelf: "书架 图书馆 藏书",
  briefcase: "公文包 工作 商务 职位",
  "door-open": "门 打开 出口",
  "door-closed": "门 关闭 入口",
  // —— 书本 / 新闻 / 订阅 ——
  "book-half": "书 阅读 半开",
  journal: "日志 日记 笔记",
  "journal-text": "日志 笔记 文本",
  journals: "日志 期刊 合集",
  newspaper: "报纸 新闻 资讯",
  rss: "RSS 订阅 源 聚合",
  "rss-fill": "RSS 订阅 源",
  collection: "收藏集 集合 合集",
  sticky: "便签 备忘 贴纸",
  stickies: "便签 记事 贴纸",
  lightbulb: "灯泡 灵感 想法 创意",
  "lightbulb-off": "灵感 关闭 熄灭",
  // —— 链接 / 分享 / 标记 ——
  link: "链接 超链接 网址",
  "link-45deg": "链接 超链接",
  share: "分享 共享 转发",
  "pin-angle": "图钉 固定 置顶",
  flag: "旗帜 旗标 标记 报告",
  "flag-fill": "旗帜 旗标 标记",
  reply: "回复 应答",
  "reply-all": "回复全部 群发",
  "qr-code": "二维码 扫码 扫描",
  // —— 表情 / 绘画 ——
  "emoji-smile": "笑脸 微笑 表情",
  "emoji-wink": "眨眼 调皮 表情",
  "emoji-grin": "大笑 开心 表情",
  "emoji-heart-eyes": "喜欢 爱心眼 表情",
  "emoji-laughing": "大笑 笑哭 表情",
  eyedropper: "吸管 取色 拾色",
  gem: "宝石 钻石 会员",
  diamond: "钻石 菱形 宝石",
  // —— 娱乐 ——
  ticket: "票 门票 券",
  "ticket-perforated": "票 门票 撕票",
  tv: "电视 电视机 直播",
  projector: "投影仪 放映 演示",
  controller: "游戏手柄 游戏 主机",
  joystick: "摇杆 游戏 操纵杆",
  dpad: "方向键 手柄 游戏",
  puzzle: "拼图 插件 扩展",
  "dice-5": "骰子 随机 概率",
  trophy: "奖杯 成就 冠军 荣誉",
  award: "奖项 勋章 荣誉 获奖",
  balloon: "气球 庆祝 节日",
  // —— 电源 / 设备 ——
  battery: "电池 电量",
  "battery-full": "满电 电池 电量",
  "battery-charging": "充电 电池 充电中",
  "battery-half": "电量 电池 半电",
  "battery-low": "低电量 电池 电量不足",
  plug: "插头 电源 插电",
  outlet: "插座 电源 电源插座",
  power: "电源 开关 关机",
  fan: "风扇 散热 通风",
  display: "显示器 屏幕 显示",
  displayport: "接口 显示器 DisplayPort",
  hdmi: "接口 HDMI 高清",
  usb: "USB 接口 外设",
  laptop: "笔记本 电脑 便携",
  pc: "电脑 台式机 主机",
  "pc-display": "电脑 显示器 一体机",
  keyboard: "键盘 输入",
  mouse: "鼠标 点击",
  printer: "打印机 打印 输出",
  tablet: "平板 平板电脑",
  // —— 生活 / 医疗 / 手势 ——
  leaf: "叶子 环保 自然 绿色",
  flower1: "花 花朵 美化",
  tree: "树 树木 环保 森林",
  egg: "蛋 鸡蛋 食物",
  "cup-hot": "咖啡 热饮 茶杯",
  "cup-straw": "饮料 饮品 杯子",
  cookie: "饼干 甜点 曲奇",
  "fork-knife": "餐具 用餐 餐厅",
  recycle: "回收 循环 环保",
  radioactive: "辐射 危险 核",
  virus: "病毒 疫情 防疫",
  bandaid: "创可贴 医疗 伤口",
  capsule: "胶囊 药品 医疗",
  "capsule-pill": "药丸 药品 医疗",
  "heart-pulse": "心跳 健康 心率",
  lungs: "肺 呼吸 健康",
  sunglasses: "墨镜 太阳镜 酷",
  earbuds: "耳机 耳塞 无线耳机",
  "person-standing": "站立 人 人物",
  "gender-male": "男性 男",
  "gender-female": "女性 女",
  "gender-ambiguous": "性别 未知",
  "gender-trans": "跨性别 性别",
  "gender-neuter": "中性 性别",
  "hand-thumbs-up": "点赞 赞 支持 好的",
  "hand-thumbs-down": "踩 反对 差评",
  "hand-index": "手势 点击 指向",
  "hand-index-thumb": "点赞 手势 支持",
  "arrow-through-heart": "心动 恋爱 喜欢",
  heartbreak: "心碎 失恋 难过",
  peace: "和平 胜利 手势",
  "yin-yang": "阴阳 平衡 太极",
  infinity: "无限 循环 无穷",
  percent: "百分比 折扣 比例",
  calculator: "计算器 计算 算账",
  magnet: "磁铁 吸引 吸附",
  binoculars: "望远镜 观察 搜索",
  feather: "羽毛 轻量 写作",
};

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
 * ⚠️ viewBox 这一条是**必需**的：Iconify 的集级与图标级都可能不声明 `width`/`height`（`bi` 两边都没有），
 * 此时按约定缺省为 16×16；若漏了这层缺省，会写出 `viewBox="0 0 undefined undefined"`，
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
// 构建 Bootstrap 部分
// =====================================================================================

/**
 * 构建 bootstrap 段。
 * @param {Record<string, number>} nameMap font/bootstrap-icons.json（名字 → 码点）
 * @param {Array<{n: string, c?: string[], t?: string[]}>} catalog 官网分类目录
 */
function buildBootstrap(nameMap, catalog) {
  const names = Object.keys(nameMap);

  // 官方分类顺序（含兜底 other 放最后）
  const order = new Map(BOOTSTRAP_CATEGORIES.map(([slug], index) => [slug, index]));
  const labelOf = new Map(BOOTSTRAP_CATEGORIES);

  // 收集 catalog.json 里真实出现过的 slug（不猜）
  const observedSlugs = new Set();
  const catalogByName = new Map();
  for (const entry of catalog) {
    if (!entry || typeof entry.n !== "string") continue;
    catalogByName.set(entry.n, entry);
    if (Array.isArray(entry.c)) {
      for (const slug of entry.c) if (typeof slug === "string") observedSlugs.add(slug);
    }
  }

  // 断言：别名表里的图标名必须真实存在
  for (const name of Object.keys(ICON_ALIASES)) {
    if (!names.includes(name)) {
      throw new Error(`中文别名表里出现不存在的 Bootstrap 图标名：${name}`);
    }
  }

  const unknownSlugs = [];
  const categories = BOOTSTRAP_CATEGORIES.filter(([slug]) => observedSlugs.has(slug)).map(
    ([slug, label]) => [slug, label],
  );
  for (const slug of observedSlugs) {
    if (!order.has(slug)) unknownSlugs.push(slug);
  }
  // 列表外的 slug 用原文兜底（正常应为空）
  for (const slug of unknownSlugs.sort()) {
    categories.push([slug, slug]);
    order.set(slug, BOOTSTRAP_CATEGORIES.length + categories.length);
    labelOf.set(slug, slug);
  }

  const icons = [];
  const counts = new Map();
  for (const name of names) {
    const entry = catalogByName.get(name);
    let slug = "other";
    if (entry && Array.isArray(entry.c) && entry.c.length > 0 && typeof entry.c[0] === "string") {
      slug = entry.c[0];
    }
    const label = labelOf.has(slug) ? labelOf.get(slug) : slug;

    // 关键词 = 中文别名 + 官方英文标签 + 分类 slug 词 + 名字词
    const words = [
      ...(ICON_ALIASES[name] ? ICON_ALIASES[name].split(/\s+/) : []),
      ...((entry && Array.isArray(entry.t) ? entry.t : []) || []),
      ...String(slug).split("-"),
      ...name.split("-"),
    ];
    const keyword = clampWords(uniqueWords(words), 60);

    icons.push([name, slug, keyword]);
    counts.set(slug, (counts.get(slug) || 0) + 1);
  }

  // 排序：分类顺序 → 名字升序
  const rankOf = (slug) => (slug === "other" ? 9999 : order.has(slug) ? order.get(slug) : 5000);
  icons.sort((a, b) => {
    const ra = rankOf(a[1]);
    const rb = rankOf(b[1]);
    if (ra !== rb) return ra - rb;
    return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
  });

  return { categories, icons, counts, unknownSlugs, categoryLabels: labelOf };
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
  "上游数据与许可：" +
  `bootstrap-icons@${BOOTSTRAP_VERSION}（图标名与分类，MIT © The Bootstrap Authors，https://icons.getbootstrap.com）；` +
  `图标体**自托管**于 public/icons/（由 @iconify-json/bi@${BI_JSON_VERSION} 与 @iconify-json/twemoji@${TW_JSON_VERSION} 生成，运行时无外部 CDN 依赖）；` +
  "icons.getbootstrap.com 分类目录（MIT）；" +
  `unicode-emoji-json@${EMOJI_JSON_VERSION}（MIT）；` +
  `cldr-annotations-full@${CLDR_VERSION} 与 cldr-annotations-derived-full@${CLDR_VERSION}（Unicode License，中英文注释）；` +
  "Twemoji graphics CC-BY 4.0 © Twitter, Inc. and contributors。";

const JS_DATA_BANNER =
  "/*\n" +
  " * SimPage 图标库数据（生成产物，请勿手工修改）。\n" +
  " * 由 tools/build-icon-library.mjs 生成；数据与 public/data/icon-library.json 完全一致。\n" +
  " *\n" +
  " * 上游数据与许可：\n" +
  ` *   - bootstrap-icons@${BOOTSTRAP_VERSION}            图标名与分类  MIT              © The Bootstrap Authors（https://icons.getbootstrap.com）\n` +
  ` *   - @iconify-json/bi@${BI_JSON_VERSION}              单色图标体    MIT              （已落盘为 public/icons/bi/）\n` +
  ` *   - @iconify-json/twemoji@${TW_JSON_VERSION}         彩色 emoji 体 CC-BY-4.0       © Twitter, Inc. and contributors（Twemoji fork v${TWEMOJI_VERSION}，已落盘为 public/icons/twemoji/）\n` +
  " *   - icons.getbootstrap.com 分类目录   分类目录      MIT              （分类 slug 与英文标签）\n" +
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
  const namesPath = await ensureData({ kind: "file", relPath: CACHE_FILES.names, url: UPSTREAM.bootstrapTgz }, cacheDir, offline).catch(
    async (error) => {
      // font/bootstrap-icons.json 来自 tgz；失败时再试一次解包
      if (offline) throw error;
      const tgzPath = path.join(cacheDir, `bootstrap-icons-${BOOTSTRAP_VERSION}.tgz`);
      await downloadTo(UPSTREAM.bootstrapTgz, tgzPath);
      extractTgz(tgzPath, cacheDir);
      return path.join(cacheDir, CACHE_FILES.names);
    },
  );
  const catalogPath = await ensureData({ kind: "file", relPath: CACHE_FILES.catalog, url: UPSTREAM.catalog }, cacheDir, offline);
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
  // 两个 Iconify 打包的图标集（图标体来源）；各自解到独立子目录，避免与 CLDR 的 package/ 相撞。
  const biIconsPath = await ensureData(
    { kind: "tgz", relPath: CACHE_FILES.biIcons, url: UPSTREAM.biIconsTgz, extractTo: "bijson" },
    cacheDir,
    offline,
  );
  const twIconsPath = await ensureData(
    { kind: "tgz", relPath: CACHE_FILES.twIcons, url: UPSTREAM.twIconsTgz, extractTo: "twjson" },
    cacheDir,
    offline,
  );

  const nameMap = readJSON(namesPath);
  const catalog = readJSON(catalogPath);
  const emojiGroupsRaw = readJSON(emojiPath);
  const cldrRaw = readJSON(cldrPath);
  const cldrDerivedRaw = readJSON(cldrDerivedPath);
  const cldrEnRaw = readJSON(cldrEnPath);
  const cldrDerivedEnRaw = readJSON(cldrDerivedEnPath);
  const biSetData = readJSON(biIconsPath);
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
  const boot = buildBootstrap(nameMap, catalog);
  const emoji = buildEmoji(emojiGroupsRaw, annotations, derivedAnnotations, enAnnotations, enDerivedAnnotations);
  const allEmoji = emoji.groups.flatMap((group) => group.items);

  // 3. 落盘自托管图标体：把 Iconify 的 body 逐个包成完整 SVG。
  //    bi：2078 个名字（全部在 Iconify bi 集里找得到，含别名解析）；
  //    twemoji：1914 个 slug（有 2 个是别名，如 on-arrow → on-exclamation-arrow，需解析 parent）。
  const biFiles = boot.icons.map((item) => {
    const name = item[0];
    const resolved = resolveIcon(biSetData, name, DEFAULT_ICON_SIZE);
    if (!resolved) throw new Error(`Iconify bi 集里找不到图标体：${name}`);
    return { name, svg: wrapSvg(resolved.body, resolved.width, resolved.height) };
  });
  const twemojiFiles = allEmoji.map((item) => {
    const slug = item[3];
    const resolved = resolveIcon(twSetData, slug, 36);
    if (!resolved) throw new Error(`Iconify twemoji 集里找不到 emoji：${slug}`);
    return { name: slug, svg: wrapSvg(resolved.body, resolved.width, resolved.height) };
  });
  const biWrite = writeIconFiles(ICONS_BI_DIR, biFiles);
  const twWrite = writeIconFiles(ICONS_TWEMOJI_DIR, twemojiFiles);

  /** @type {object} */
  const library = {
    // 出处 / 许可 / 重生成说明写在合法字段里（JSON 不允许注释）
    _generated: GENERATED_NOTE,
    version: 3,
    bootstrap: {
      package: "bootstrap-icons",
      packageVersion: BOOTSTRAP_VERSION,
      license: "MIT © The Bootstrap Authors",
      base: BOOTSTRAP_BASE,
      suffix: ".svg",
      categories: boot.categories,
      icons: boot.icons,
    },
    emoji: {
      sources: [
        `unicode-emoji-json@${EMOJI_JSON_VERSION} (MIT)`,
        `cldr-annotations-full@${CLDR_VERSION} (Unicode License)`,
        `cldr-annotations-derived-full@${CLDR_VERSION} (Unicode License)`,
        `CLDR en 注释 → emoji 名（slug）；彩色图形取自 @iconify-json/twemoji@${TW_JSON_VERSION}（Twemoji fork v${TWEMOJI_VERSION}，CC-BY 4.0），自托管于 ${EMOJI_STYLES[1].base}`,
      ],
      styles: EMOJI_STYLES,
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

  // 4. 统计与自检
  log("\n================ 统计 ================");
  log(`Bootstrap 图标条数：${boot.icons.length}（期望 ${Object.keys(nameMap).length}）`);
  log(`Bootstrap 分类数（含 other）：${boot.categories.length}`);
  for (const [slug, label] of boot.categories) {
    log(`  - ${slug}（${label}）：${boot.counts.get(slug) || 0}`);
  }
  const otherCount = boot.counts.get("other") || 0;
  log(`  - other（其他，未归类）：${otherCount}`);
  if (boot.unknownSlugs.length > 0) {
    log(`  ⚠️ 出现在 catalog.json 但不在官方 29 分类里的 slug：${boot.unknownSlugs.join(", ")}`);
  }
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
    `自托管图标体：public/icons/bi/ = ${biWrite.count} 个（${(biWrite.bytes / 1024).toFixed(1)}KB，平均 ${biWrite.avg}B）；` +
      `public/icons/twemoji/ = ${twWrite.count} 个（${(twWrite.bytes / 1024).toFixed(1)}KB，平均 ${twWrite.avg}B）`,
  );

  log("\n================ 抽检（人工目视） ================");
  const sampleIcon = () => boot.icons[Math.floor(Math.random() * boot.icons.length)];
  log("随机 5 个 Bootstrap 图标 [name, 分类, 关键词]：");
  for (let i = 0; i < 5; i += 1) log("  ", JSON.stringify(sampleIcon()));
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

  // 6. 断言：bi 图标名与上游名单**集合相等**（无多无缺，迁移后必须仍然成立）
  const upstreamNames = new Set(Object.keys(nameMap));
  const producedNames = new Set(boot.icons.map((item) => item[0]));
  const missing = [...upstreamNames].filter((name) => !producedNames.has(name));
  const extra = [...producedNames].filter((name) => !upstreamNames.has(name));
  if (boot.icons.length !== 2078 || producedNames.size !== 2078 || missing.length || extra.length) {
    throw new Error(
      `bi 图标名与上游不一致：条数=${boot.icons.length}（期望 2078）唯一名=${producedNames.size} 缺 ${missing.length} 个、多 ${extra.length} 个` +
        `（缺：${missing.slice(0, 5).join(",")}；多：${extra.slice(0, 5).join(",")}）`,
    );
  }
  log(`✅ 自检：bi 图标名与上游 bootstrap-icons@${BOOTSTRAP_VERSION} 集合相等（各 2078，无多无缺）`);

  // 7. 断言：每条 emoji 都有非空 slug，且唯一 slug 数 = 1914
  const emptySlug = allEmoji.filter((item) => !item[3]).length;
  if (emptySlug !== 0) throw new Error(`有 ${emptySlug} 条 emoji 的 slug 为空。`);
  if (emoji.uniqueSlugCount !== 1914) {
    throw new Error(`唯一 slug 数 = ${emoji.uniqueSlugCount}，期望 1914（有重名，需要检查 emojiSlug 规则）。`);
  }
  log(`✅ 自检：全部 ${emoji.total} 条 emoji 均有非空 slug，唯一 slug 数 = 1914`);

  // 8. 断言：slug 规则单元用例（全是实测踩出来的怪例，改动 emojiSlug 时这里会先炸）
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

  // 9. 本地自检：自托管图标体的文件完整性（取代旧版结尾那 60 个联网直链抽检）。
  //    纯本地校验 → 更快、不受任何限流影响，也不会再把用户 IP 的额度打空（旧版会自我伤害）。
  log("\n================ 自检（自托管图标体完整性） ================");
  const biVerify = verifyIconDir(
    ICONS_BI_DIR,
    boot.icons.map((item) => item[0]),
    "bi",
  );
  const twVerify = verifyIconDir(
    ICONS_TWEMOJI_DIR,
    allEmoji.map((item) => item[3]),
    "twemoji",
  );
  log(`✅ 自检：public/icons/bi/ 共 ${biVerify.count} 个 SVG，与 bootstrap.icons 名字集合一一对应（无多无缺）`);
  log(`✅ 自检：public/icons/twemoji/ 共 ${twVerify.count} 个 SVG，与全部 emoji 的 slug 集合一一对应（无多无缺）`);
  log(
    `✅ 自检：每个文件都非空、以 <svg 开头、以 </svg> 结尾、含 viewBox="0 0 <正数> <正数>"；` +
      `bi ${(biVerify.bytes / 1024).toFixed(1)}KB（平均 ${biVerify.avg}B，最小 ${biVerify.min}B，最大 ${biVerify.max}B）；` +
      `twemoji ${(twVerify.bytes / 1024).toFixed(1)}KB（平均 ${twVerify.avg}B，最小 ${twVerify.min}B，最大 ${twVerify.max}B）`,
  );
  log(`✅ 自检：全部 ${biVerify.count + twVerify.count} 个文件的 viewBox 数值均为正数（已在上一步逐文件校验）`);

  // 例外白名单：全量里「非整数 viewBox」只允许上游自带的 twemoji/watermelon.svg（height=25.22）。
  // 这条断言让「有人把某个图标误写成小数/undefined」或者「上游新增了异常尺寸」都能立刻暴露。
  const nonIntegerFiles = [...biVerify.nonInteger, ...twVerify.nonInteger.map((n) => `twemoji/${n}`)];
  if (JSON.stringify(nonIntegerFiles) !== JSON.stringify(["twemoji/watermelon.svg"])) {
    throw new Error(
      `非整数 viewBox 的文件集合与预期不符：实际 ${JSON.stringify(nonIntegerFiles)}，期望 ["twemoji/watermelon.svg"]。`,
    );
  }
  log(`✅ 自检：非整数 viewBox 仅上游自带的 1 例（twemoji/watermelon.svg，height=25.22），其余全为整数`);

  // 定点抽检：缺省尺寸约定必须生效（bi 集级/图标级都无 width/height → 16×16）
  const viewBoxCases = [
    ["bi", path.join(ICONS_BI_DIR, "alarm.svg"), "0 0 16 16"],
    ["bi", path.join(ICONS_BI_DIR, "check.svg"), "0 0 16 16"],
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
  log(`✅ 自检：${viewBoxCases.length} 条 viewBox 定点抽检全部通过（含 bi 缺省 16×16 的回归）`);

  log("\n================ 抽检：icon 文件前 120 字符（人工目视） ================");
  const sampleFiles = [
    path.join(ICONS_BI_DIR, `${boot.icons[0][0]}.svg`),
    path.join(ICONS_BI_DIR, `${boot.icons[Math.floor(boot.icons.length / 2)][0]}.svg`),
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
