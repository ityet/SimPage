/**
 * SimPage API —— EdgeOne Makers Edge Function（V8 运行时）
 *
 * 挂载方式：文件位于 edge-functions/api/[[default]].js，
 * 捕获 /api/ 下的所有未匹配路由（/api/login、/api/data、/api/weather 等）。
 *
 * 运行时约束（务必遵守）：
 *   - V8 运行时，不是 Node.js：无 fs / path / require() / npm 包 / process.env
 *   - Response.json() 不存在，一律用 new Response(JSON.stringify(...), { headers })
 *   - 不使用 new Headers()，用普通对象字面量
 *   - 单次调用 CPU ≤ 200ms（fetch / KV 的 I/O 等待不计入 CPU）
 *
 * KV：EdgeOne Makers 的 KV 命名空间在控制台绑定时指定全局变量名，
 *     本项目绑定名为 `KV`，直接以全局变量 `KV` 访问（不在 context.env 上）。
 *     未绑定 / 本地未 link 时优雅降级到模块级内存 Map，接口仍返回 200。
 */

// =================================================================================
// 常量：KV 键位、安全参数、默认值（单一来源）
// =================================================================================

// KV 键只能是「字母 / 数字 / 下划线」，且长度 ≤ 512 bytes
const KEY_NAVIGATION = "data_navigation"; // 导航数据主体：{ settings, apps, bookmarks }
const KEY_ADMIN = "data_admin"; // 密码哈希体：{ passwordHash, passwordSalt, iterations }
const KEY_VISITOR_COUNT = "stats_visitor_count"; // 访客计数（纯数字字符串）
const SESSION_KEY_PREFIX = "session_"; // 会话：session_<tokenHex>

// 管理员密码哈希：PBKDF2-HMAC-SHA256（用 HMAC 原语手写，见 derivePasswordHash）
// ---------------------------------------------------------------------------
// 迭代次数取 10000 的推导（实测 HMAC sign 链式吞吐 ≈ 4.2 µs / 次）：
//   · 登录 = verify 一次             ≈ 10000 × 4.2µs ≈ 42ms
//   · 改密 = 3 次计算：
//       verify(当前密码) + verify(新密码，用于「新旧密码相同」检查) + hash(新密码)
//                                    ≈ 30000 × 4.2µs ≈ 126ms
//   · 若取 20000：改密路径 ≈ 252ms，将突破 Edge Function 200ms CPU 上限 ❌
// 结论：「改密路径是 3 次计算」才是迭代次数的真正上限约束（不是登录），
//       10000 是安全强度与 CPU 预算的平衡点。请勿再调高。
//
// 安全权衡：该运行时未实现原生 PBKDF2，迭代次数由原方案的 100000 降到 10000，
// 即 10 倍的安全强度折让，属运行时能力受限下的无奈取舍，用户需知情。
const DEFAULT_PBKDF2_ITERATIONS = 10000; // 新哈希使用（推导见上）
const LEGACY_PBKDF2_ITERATIONS = 100000; // 旧记录缺 iterations 字段时的回落值（尽力而为）
const PBKDF2_SALT_BYTES = 16;
const ADMIN_ALGO = "pbkdf2-hmac-sha256"; // 写入 data_admin，便于将来算法演进
const TOKEN_BYTES = 16; // 32 位十六进制 token

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 会话有效期 12 小时
const AUTH_HEADER_PREFIX = "Bearer ";

const KV_LIST_LIMIT = 256; // KV.list 单页上限
const KV_LIST_MAX_PAGES = 2; // 会话清理时最多翻 2 页（512 个 key）

const DEFAULT_ADMIN_PASSWORD = "admin123";

// 上游图标抓取服务（真实抓取目标站点的 favicon + 标题 + 描述）
const FAVICON_API_ENDPOINT = "https://favicon.yy.luler.top/api/favicon";
// 上游是香港的小型 VPS，跨境链路拥塞时单次可达 9.5s+（实测抓 github.com 用了 9.55s），
// 原先的 12s 会把"慢但成功"的请求误判成超时，故放宽到 25s。
const FAVICON_REQUEST_TIMEOUT_MS = 25000;
const FAVICON_TARGET_MAX_LENGTH = 2048;

// 上游是 Go 写的，会把「连不上目标站点」这类故障也塞进 5xx 返回。需要区分两层：
// - 连接层 / TLS 层失败（dial tcp / tls: / x509:）→ 目标站点根本不可达，
//   兜底填入的 <origin>/favicon.ico 会被浏览器以相同原因拒绝加载，必须不兜底。
//   实测：不存在的域名 → "dial tcp: lookup xxx: no such host"；
//         证书过期     → "tls: failed to verify certificate: x509: certificate has expired"；
//         端口不通     → "dial tcp 127.0.0.1:9: connect: connection refused"。
// - HTTP 层失败（"Website returned status code: 404" / "context deadline exceeded"）
//   → 目标站点可达，兜底有意义，仍走降级。
const UPSTREAM_TARGET_FAULT_PATTERN =
  /dial tcp|tls:|x509:|no Host in request URL|unsupported protocol scheme|Invalid URL/i;

// 默认站点配置（以 public/data/navigation.json 为准，全仓唯一来源）
const DEFAULT_SETTINGS = Object.freeze({
  siteName: "Navs",
  siteLogo: "🎐",
  greeting: "",
  footer: "** LeoNavs ** 不断学习，不断尝试，不断进步！！",
  weather: Object.freeze({ city: "杭州" }),
  // 书签分类：决定后台编辑时的候选列表，以及前台书签分组的展示顺序
  categories: Object.freeze(["技术社区", "实用工具", "知识学习"]),
});
const DEFAULT_WEATHER_CITY = DEFAULT_SETTINGS.weather.city;
const DEFAULT_STATS = Object.freeze({ visitorCount: 0 });

// 单个分类名的长度上限与分类数量上限（防止异常入参撑爆存储与前台渲染）
const CATEGORY_MAX_LENGTH = 24;
const CATEGORY_MAX_COUNT = 30;

// 默认应用列表（来自 public/data/navigation.json）
const DEFAULT_APPS = Object.freeze([
  {
    id: "f479451e-579d-4ca1-be9e-31bc7d708cae",
    name: "群晖QC",
    url: "https://mumupudding.quickconnect.cn/",
    description: "群晖quickconnect,其它自定义域名nas.itmax|ityet.cn|only.ydns.eu|igogo.dns.navy",
    icon: "🖥️",
  },
  {
    id: "e879451e-579d-4ca1-be9e-31bc7d708cae",
    name: "ITmax短链接",
    url: "https://dwz.ityet.com/",
    description: "ITyet短链接",
    icon: "🏠",
  },
  {
    id: "d979451e-579d-4ca1-be9e-31bc7d708cae",
    name: "ITmax短链接",
    url: "https://dwz.itmax.cn/",
    description: "ITmax短链接",
    icon: "🧭",
  },
  {
    id: "f379451e-579d-4ca1-be9e-31bc7d708cae",
    name: "Edge短链接",
    url: "https://tz.itmax.cn/",
    description: "短链接生成与管理",
    icon: "🔗",
  },
  {
    id: "e979451e-579d-4ca1-be9e-31bc7d708cae",
    name: "Alist网盘",
    url: "https://alist.ityet.com/",
    description: "多网盘聚合管理工具",
    icon: "📁",
  },
  {
    id: "e779451e-579d-4ca1-be9e-31bc7d708cae",
    name: "DNS聚合",
    url: "https://ddns.ityet.com/",
    description: "动态DNS管理平台",
    icon: "",
  },
  {
    id: "e679451e-579d-4ca1-be9e-31bc7d708cae",
    name: "New API",
    url: "https://openai.ityet.com:99/",
    description: "OpenAI接口代理服务",
    icon: "🤖",
  },
  {
    id: "e579451e-579d-4ca1-be9e-31bc7d708cae",
    name: "CloudPaste",
    url: "https://aot.dpdns.org/",
    description: "在线剪贴板服务",
    icon: "📋",
  },
  {
    id: "e279451e-579d-4ca1-be9e-31bc7d708cae",
    name: "TTS语音",
    url: "https://tts.itmax.cn/",
    description: "语音合成测试页面",
    icon: "🎙️",
  },
  {
    id: "e079451e-579d-4ca1-be9e-31bc7d708cae",
    name: "SubsCheck",
    url: "https://kmikcibdsomx.ap-northeast-1.clawcloudrun.com/admin",
    description: "订阅有效性检测工具",
    icon: "✅",
  },
  {
    id: "d879451e-579d-4ca1-be9e-31bc7d708cae",
    name: "禅道",
    url: "https://zentao.ityet.com/index.php?m=my&f=index",
    description: "项目管理平台",
    icon: "📊",
  },
  {
    id: "d779451e-579d-4ca1-be9e-31bc7d708cae",
    name: "NanoBanana",
    url: "https://banana.itmax.cn/",
    description: "轻量级服务工具",
    icon: "🍌",
  },
  {
    id: "f779451e-579d-4ca1-be9e-31bc7d708cae",
    name: "Omnibox",
    url: "https://omni.ityet.com/",
    description: "电影动漫资源站，支持网盘搜索",
    icon: "🍿",
  },
  {
    id: "1deddfd0-93a9-4955-a1b9-d529c2f3d86d",
    name: "LibreTV",
    url: "https://libre.itmax.cn/",
    description: "Libre电影动漫资源站，部署在腾讯Eadge上",
    icon: "🎬",
  },
  {
    id: "d5acc4fb-20f2-4edb-a1b3-9eb519b12e81",
    name: "青龙面板",
    url: "https://dragon.ityet.com/",
    description: "青龙面板",
    icon: "🐉",
  },
  {
    id: "d6399012-3909-4164-93bb-96aca15bd721",
    name: "订阅聚合",
    url: "https://subs.ityet.com:99/subs",
    description: "聚合所有订阅",
    icon: "🦄",
  },
  {
    id: "dffb313a-075a-4de5-86f9-3ae35e69ccbe",
    name: "Cloudflare生图",
    url: "https://imgen.coffe.dpdns.org/",
    description: "Cloudflare生图",
    icon: "🎆",
  },
  {
    id: "1cfb10f0-9629-4096-b2b7-95102d314159",
    name: "Lobe",
    url: "https://lobe.ityet.com/",
    description: "LobeAI助手，部署在Vercel",
    icon: "https://lobe.ityet.com/favicon.ico",
  },
  {
    id: "9d8b47d5-c7aa-40de-a21e-9cb09792028f",
    name: "Download",
    url: "https://down.ityet.com:99/",
    description: "文件托管&下载",
    icon: "💾",
  },
  {
    id: "f1f34344-864b-4382-ae69-1b6a08dfb109",
    name: "Danmu",
    url: "https://danmu.itmax.cn/danmu",
    description: "自建弹幕服务",
    icon: "🎼",
  },
  {
    id: "bc0fc626-f5a3-4d8e-9548-08a4ff488469",
    name: "订阅转换",
    url: "https://sub.ityet.com/",
    description: "自建订阅转换",
    icon: "🥨",
  },
]);

// 默认书签列表（来自 public/data/navigation.json）
const DEFAULT_BOOKMARKS = Object.freeze([
  {
    id: "bookmark-oschina",
    name: "开源中国",
    url: "https://www.oschina.net/",
    description: "聚焦开源信息与技术社区。",
    icon: "🌐",
    category: "技术社区",
  },
  {
    id: "bookmark-sspai",
    name: "少数派",
    url: "https://sspai.com/",
    description: "关注效率工具与生活方式的媒体。",
    icon: "📰",
    category: "效率与生活",
  },
  {
    id: "bookmark-zhihu",
    name: "知乎",
    url: "https://www.zhihu.com/",
    description: "问答与知识分享社区。",
    icon: "❓",
    category: "知识学习",
  },
  {
    id: "bookmark-jike",
    name: "即刻",
    url: "https://m.okjike.com/",
    description: "兴趣社交与资讯聚合平台。",
    icon: "📮",
    category: "资讯聚合",
  },
  {
    id: "bookmark-juejin",
    name: "稀土掘金",
    url: "https://juejin.cn/",
    description: "开发者技术社区与优质内容。",
    icon: "💡",
    category: "技术社区",
  },
  {
    id: "1441d3db-027b-42d3-ab54-3a9c0fbcc616",
    name: "LinuxDO",
    url: "https://linux.do/",
    description: "LinuxDO社区",
    icon: "🥥",
    category: "技术社区",
  },
  {
    id: "b5a03869-5de8-40df-b4a9-b74e890606b9",
    name: "Github加速聚合",
    url: "https://github.akams.cn/",
    description: "Github加速聚合",
    icon: "🗻",
    category: "实用工具",
  },
  {
    id: "17646223-cbf9-42d5-9f3b-afc8b261cdfc",
    name: "Ghfast加速",
    url: "https://ghfast.top/",
    description: "Github镜像加速",
    icon: "🚀",
    category: "实用工具",
  },
]);

const WEATHER_API_TIMEOUT_MS = 5000;
const GEOLOCATION_MAX_RETRIES = 3;
const GEOLOCATION_RETRY_DELAY_BASE_MS = 300;

// =================================================================================
// KV 访问层（含降级）
// =================================================================================

// 模块级内存兜底：KV 不可用时模拟读写，随 isolate 生命周期存在
const memoryFallback = new Map();

/**
 * 判断控制台绑定的全局 KV 是否可用。
 * 使用 typeof 探测，避免未定义时抛 ReferenceError。
 * @returns {boolean}
 */
function kvAvailable() {
  return typeof KV !== "undefined" && KV !== null && typeof KV.get === "function";
}

/**
 * 当前存储模式，便于排查数据来源。
 * @returns {"kv" | "memory-fallback"}
 */
function storageMode() {
  return kvAvailable() ? "kv" : "memory-fallback";
}

/**
 * 读取原始字符串值。
 * @param {string} key
 * @returns {Promise<string | null>}
 */
async function kvGetRaw(key) {
  if (kvAvailable()) {
    try {
      const value = await KV.get(key);
      return typeof value === "string" ? value : value === undefined ? null : value;
    } catch (error) {
      console.warn(`[KV] get("${key}") 失败，回退到内存：`, error && error.message);
    }
  }
  return memoryFallback.has(key) ? memoryFallback.get(key) : null;
}

/**
 * 写入字符串值。KV 无 TTL，过期需业务自行实现。
 * @param {string} key
 * @param {string} value
 * @returns {Promise<void>}
 */
async function kvPutRaw(key, value) {
  if (kvAvailable()) {
    try {
      await KV.put(key, value);
      return;
    } catch (error) {
      console.warn(`[KV] put("${key}") 失败，写入内存兜底：`, error && error.message);
    }
  } else {
    console.warn(`[KV] 不可用，写入内存兜底 key="${key}"（startsWith memory-fallback）`);
  }
  memoryFallback.set(key, value);
}

/**
 * 删除键。
 *
 * 注意：实测该 EdgeOne Makers 运行时 `KV.delete(key)` 会抛
 * `Error: KvStore Delete failed: system_error_111`，但删除「实际已生效」
 * （delete 后立即 get 返回 null），属已知平台行为。因此这里的 catch 只记录一次
 * warning 并「吞掉」异常，绝不向调用方抛出——尤其 `cleanupExpiredSessions()`
 * 在登录流程里同步执行，不能让它的 delete 失败把登录打成 500。
 * @param {string} key
 * @returns {Promise<void>}
 */
async function kvDelete(key) {
  if (kvAvailable()) {
    try {
      await KV.delete(key);
      return;
    } catch (error) {
      // 已知平台行为：报 system_error_111 但删除已生效，只记一次 warning，不刷堆栈
      console.warn(`[KV] delete("${key}") 报错（该运行时已知会返回 system_error_111 但删除已生效，忽略）：`, error && error.message);
    }
  }
  memoryFallback.delete(key);
}

/**
 * 列出指定前缀的所有键名。KV 单次上限 256，跟随 cursor 翻页（最多 KV_LIST_MAX_PAGES 页）。
 *
 * 字段名兼容：实测该运行时返回的每项是 `{ key, expirationTtl, expiration, meta }`，
 * 键名在 `key` 字段；而官方文档写的是 `name`。这里 `item.key ?? item.name` 两者都取，
 * 以免将来任一侧变更再次导致「静默取到 undefined」。
 * @param {string} prefix
 * @returns {Promise<string[]>}
 */
async function listKeys(prefix) {
  if (!kvAvailable()) {
    const names = [];
    for (const key of memoryFallback.keys()) {
      if (key.startsWith(prefix)) names.push(key);
    }
    return names;
  }

  const names = [];
  let cursor = undefined;
  let pages = 0;
  try {
    do {
      const result = await KV.list({ prefix, limit: KV_LIST_LIMIT, cursor });
      for (const item of result.keys || []) {
        const name = item.key ?? item.name; // 真实运行时用 key，官方文档写 name，兼容两者
        if (typeof name === "string") names.push(name);
      }
      cursor = result.complete ? undefined : result.cursor;
      pages += 1;
    } while (cursor && pages < KV_LIST_MAX_PAGES);
  } catch (error) {
    console.warn(`[KV] list("${prefix}") 失败：`, error && error.message);
  }
  return names;
}

/**
 * 读取并解析 JSON 值。
 * @param {string} key
 * @param {*} [fallback=null] 解析失败或不存在时的返回值
 * @returns {Promise<*>}
 */
async function getJSON(key, fallback = null) {
  const raw = await kvGetRaw(key);
  if (raw === null || raw === undefined) return fallback;
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`[KV] getJSON("${key}") 解析失败：`, error && error.message);
    return fallback;
  }
}

/**
 * 序列化并写入 JSON 值（仅两个参数，KV 无 TTL）。
 * @param {string} key
 * @param {*} value
 * @returns {Promise<void>}
 */
async function putJSON(key, value) {
  await kvPutRaw(key, JSON.stringify(value));
}

// =================================================================================
// 数据读写
// =================================================================================

/**
 * 构造内置默认导航数据（首次初始化 / KV 缺省时使用）。
 * @returns {{settings: object, apps: object[], bookmarks: object[]}}
 */
function createDefaultNavigation() {
  return {
    settings: createDefaultSettings(),
    apps: DEFAULT_APPS.map((item) => ({ ...item })),
    bookmarks: DEFAULT_BOOKMARKS.map((item) => ({ ...item })),
  };
}

/**
 * 读取导航数据主体；为空时写入内置默认数据（仅一次）。
 * @returns {Promise<{settings: object, apps: object[], bookmarks: object[]}>}
 */
async function readNavigationData() {
  const stored = await getJSON(KEY_NAVIGATION, null);
  if (stored && typeof stored === "object") {
    return {
      settings: stored.settings && typeof stored.settings === "object" ? stored.settings : {},
      apps: Array.isArray(stored.apps) ? stored.apps : [],
      bookmarks: Array.isArray(stored.bookmarks) ? stored.bookmarks : [],
    };
  }

  const seed = createDefaultNavigation();
  await putJSON(KEY_NAVIGATION, seed);
  return seed;
}

/**
 * 写入导航数据主体。
 * @param {{settings: object, apps: object[], bookmarks: object[]}} navigation
 * @returns {Promise<void>}
 */
async function writeNavigationData(navigation) {
  await putJSON(KEY_NAVIGATION, {
    settings: navigation.settings,
    apps: navigation.apps,
    bookmarks: navigation.bookmarks,
  });
}

/**
 * 读取管理员凭据体；不存在时用默认密码初始化（仅一次）。
 * @returns {Promise<{passwordHash: string, passwordSalt: string, iterations: number}>}
 */
async function readAdminRecord() {
  const record = await getJSON(KEY_ADMIN, null);
  if (record && record.passwordHash && record.passwordSalt) {
    return record;
  }
  const seed = await createAdminRecord(DEFAULT_ADMIN_PASSWORD);
  await putJSON(KEY_ADMIN, seed);
  console.log("已初始化默认管理员密码（data_admin）");
  return seed;
}

/**
 * 写入管理员凭据体。
 * @param {{passwordHash: string, passwordSalt: string, iterations: number}} record
 * @returns {Promise<void>}
 */
async function writeAdminRecord(record) {
  await putJSON(KEY_ADMIN, record);
}

/**
 * 读取访客统计。
 * @returns {Promise<{visitorCount: number}>}
 */
async function readStats() {
  const raw = await kvGetRaw(KEY_VISITOR_COUNT);
  const parsed = parseInt(raw || "0", 10);
  return { visitorCount: Number.isFinite(parsed) ? parsed : 0 };
}

/**
 * 写入访客统计。
 * @param {{visitorCount: number}} stats
 * @returns {Promise<void>}
 */
async function writeStats(stats) {
  const value = Number(stats && stats.visitorCount ? stats.visitorCount : 0);
  await kvPutRaw(KEY_VISITOR_COUNT, String(Number.isFinite(value) ? value : 0));
}

/**
 * 读取完整数据（导航 + 统计），供多数接口使用。
 * 注意：管理员凭据单独通过 readAdminRecord() 读取，避免公共接口无谓地触发哈希初始化。
 * @returns {Promise<{settings: object, apps: object[], bookmarks: object[], stats: object}>}
 */
async function readFullData() {
  const navigation = await readNavigationData();
  const stats = await readStats();
  return {
    settings: navigation.settings,
    apps: navigation.apps,
    bookmarks: navigation.bookmarks,
    stats,
  };
}

// =================================================================================
// 密码哈希（PBKDF2-HMAC-SHA256，用 HMAC 原语手写）
// =================================================================================

/**
 * 解析迭代次数；缺省/非法时回落到旧数据使用的 100000，兼容历史哈希。
 * @param {*} value
 * @returns {number}
 */
function resolveIterations(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : LEGACY_PBKDF2_ITERATIONS;
}

/**
 * 用 HMAC-SHA256 原语手写标准 PBKDF2（PBKDF2-HMAC-SHA256）。
 *
 * 【为什么不直接用 crypto.subtle.deriveBits？】
 * 实测该 EdgeOne Makers V8 运行时「未实现」PBKDF2 与 HKDF：
 * `deriveBits` / `deriveKey` 传 `{ name: "PBKDF2" }` 或 HKDF 一律抛
 * `Error: Param Invalid`（iterations 取 1/1000/20000/100000、hash 取 SHA-1/SHA-256、
 * length 取 256/512 的完整参数矩阵均失败）。该运行时可用的密码学原语只有
 * `crypto.subtle.digest` 与 `crypto.subtle.sign`。因此这里以 `sign("HMAC")`
 * 作为 PBKDF2 的 PRF 驱动，按标准算法手写：
 *   U1 = PRF(P, salt || INT32_BE(1))
 *   Uj = PRF(P, U(j-1))            （j = 2..c）
 *   T  = U1 ⊕ U2 ⊕ ... ⊕ Uc
 * 输出取 32 字节（256 位，恰为 1 个 SHA-256 输出块，故无需处理多块）。
 * 算法本身仍是标准 PBKDF2，只是底层 PRF 换成了可用的 HMAC 原语。
 *
 * @param {string} password 明文口令
 * @param {string} saltHex 十六进制盐
 * @param {number} iterations 迭代次数
 * @returns {Promise<string>} 十六进制哈希（32 字节 → 64 位 hex）
 */
async function derivePasswordHash(password, saltHex, iterations) {
  const hmacKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const salt = hexToBytes(saltHex);

  // 构造 PBKDF2 的第 1 个 block 输入：salt || INT32_BE(1)
  const firstBlock = new Uint8Array(salt.length + 4);
  firstBlock.set(salt, 0);
  firstBlock[salt.length] = 0x00;
  firstBlock[salt.length + 1] = 0x00;
  firstBlock[salt.length + 2] = 0x00;
  firstBlock[salt.length + 3] = 0x01;

  // U1，同时作为累加器 T 的初值
  let u = new Uint8Array(await crypto.subtle.sign("HMAC", hmacKey, firstBlock));
  const result = u.slice();

  // Uj = HMAC(P, U(j-1))，并逐字节异或进累加器
  for (let i = 1; i < iterations; i++) {
    u = new Uint8Array(await crypto.subtle.sign("HMAC", hmacKey, u));
    for (let j = 0; j < result.length; j++) {
      result[j] ^= u[j];
    }
  }

  return bufferToHex(result);
}

/**
 * 生成新的管理员凭据体（含算法标识与迭代次数）。
 * @param {string} password
 * @param {number} [iterations=DEFAULT_PBKDF2_ITERATIONS]
 * @returns {Promise<{passwordHash: string, passwordSalt: string, iterations: number, algo: string}>}
 */
async function createAdminRecord(password, iterations = DEFAULT_PBKDF2_ITERATIONS) {
  const salt = new Uint8Array(PBKDF2_SALT_BYTES);
  crypto.getRandomValues(salt);
  const passwordSalt = bufferToHex(salt);
  const passwordHash = await derivePasswordHash(password, passwordSalt, iterations);
  return { passwordHash, passwordSalt, iterations, algo: ADMIN_ALGO };
}

/**
 * 校验口令是否与记录匹配（按记录里的迭代次数校验，常数时间比较）。
 * @param {string} password
 * @param {{passwordHash: string, passwordSalt: string, iterations?: number}} record
 * @returns {Promise<boolean>}
 */
async function verifyPassword(password, record) {
  if (!record || !record.passwordHash || !record.passwordSalt) return false;
  const iterations = resolveIterations(record.iterations);
  const actualHashHex = await derivePasswordHash(password, record.passwordSalt, iterations);
  return timingSafeEqual(record.passwordHash, actualHashHex);
}

// =================================================================================
// 会话管理（KV 无 TTL，过期自实现；用 list 做治理，不用定时器）
// =================================================================================

/**
 * 生成 32 位十六进制 token（去掉连字符，满足 KV key 命名约束，前端 Bearer token 同值）。
 * @returns {string}
 */
function generateToken() {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return bufferToHex(bytes);
}

/**
 * 创建会话并写 KV（一会话一键：session_<token>）。
 * @param {string} token
 * @returns {Promise<void>}
 */
async function createSession(token) {
  const record = { expires: Date.now() + SESSION_TTL_MS, value: "active" };
  await putJSON(SESSION_KEY_PREFIX + token, record);
}

/**
 * 读取会话；已过期则立即删除并视为未登录。
 * @param {string} token
 * @returns {Promise<string | null>}
 */
async function getSession(token) {
  const key = SESSION_KEY_PREFIX + token;
  const record = await getJSON(key, null);
  if (!record || typeof record !== "object") return null;
  if (!record.expires || Date.now() > record.expires) {
    await kvDelete(key);
    return null;
  }
  return record.value || "active";
}

/**
 * 扫描 session_ 前缀，清理已过期会话。登录成功后顺手调用一次，替代原定时器。
 * @returns {Promise<number>} 清理数量
 */
async function cleanupExpiredSessions() {
  try {
    const keys = await listKeys(SESSION_KEY_PREFIX);
    const now = Date.now();
    let cleaned = 0;
    for (const key of keys) {
      const record = await getJSON(key, null);
      if (!record || typeof record !== "object" || !record.expires || now > record.expires) {
        await kvDelete(key);
        cleaned += 1;
      }
    }
    if (cleaned > 0) {
      console.log(`已清理 ${cleaned} 个过期会话`);
    }
    return cleaned;
  } catch (error) {
    console.warn("清理过期会话失败：", error && error.message);
    return 0;
  }
}

// =================================================================================
// 认证中间件
// =================================================================================

/**
 * 校验 Authorization: Bearer <token>。通过返回 null，否则返回 401 响应。
 * @param {Request} request
 * @returns {Promise<Response | null>}
 */
async function requireAuth(request) {
  const raw = request.headers.get("authorization");
  if (!raw || !raw.startsWith(AUTH_HEADER_PREFIX)) {
    return jsonResponse({ success: false, message: "请登录后再执行此操作。" }, 401);
  }
  const token = raw.slice(AUTH_HEADER_PREFIX.length).trim();
  if (!token) {
    return jsonResponse({ success: false, message: "请登录后再执行此操作。" }, 401);
  }
  const session = await getSession(token);
  if (!session) {
    return jsonResponse({ success: false, message: "登录状态已失效，请重新登录。" }, 401);
  }
  return null;
}

// =================================================================================
// API 处理器
// =================================================================================

/**
 * POST /api/login —— 校验密码，签发会话 token。
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function handleLogin(request) {
  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!password) {
    return jsonResponse({ success: false, message: "请输入密码。" }, 400);
  }

  const admin = await readAdminRecord();
  const isMatch = await verifyPassword(password, admin);
  if (!isMatch) {
    return jsonResponse({ success: false, message: "密码错误。" }, 401);
  }

  const token = generateToken();
  await createSession(token);
  // 顺手清理过期会话（替代原 setInterval 定时器）
  await cleanupExpiredSessions();

  return jsonResponse({ success: true, token, storage: storageMode() });
}

/**
 * GET /api/data —— 前台读取导航数据，并递增访客计数。
 * @param {Request} request
 * @param {object} context EdgeOne EventContext（用于可选 waitUntil）
 * @returns {Promise<Response>}
 */
async function handleGetData(request, context) {
  try {
    const navigation = await readNavigationData();

    let visitorCount;
    try {
      visitorCount = await incrementVisitorCount(context);
    } catch (error) {
      // 计数失败不影响主响应
      console.error("访客计数更新失败：", error && error.message);
      visitorCount = (await readStats()).visitorCount;
    }

    const data = sanitiseData({
      settings: navigation.settings,
      apps: navigation.apps,
      bookmarks: navigation.bookmarks,
      stats: { visitorCount },
    });
    data.visitorCount = visitorCount;
    data.storage = storageMode();
    return jsonResponse(data);
  } catch (error) {
    console.error("handleGetData 失败：", error);
    return jsonResponse({ success: false, message: `加载数据失败：${error.message}` }, 500);
  }
}

/**
 * 读-改-写访客计数（独立 key）。写入失败不影响调用方；有 waitUntil 时移出关键路径。
 * @param {object} context
 * @returns {Promise<number>} 新的计数
 */
async function incrementVisitorCount(context) {
  const current = (await readStats()).visitorCount;
  const next = current + 1;
  const writePromise = kvPutRaw(KEY_VISITOR_COUNT, String(next)).catch((error) => {
    console.error("访客计数写入失败：", error && error.message);
  });
  if (context && typeof context.waitUntil === "function") {
    context.waitUntil(writePromise);
  } else {
    await writePromise;
  }
  return next;
}

/**
 * GET /api/weather —— 按配置城市批量查询 Open-Meteo 天气。
 * @returns {Promise<Response>}
 */
async function handleGetWeather() {
  try {
    const navigation = await readNavigationData();
    const weatherSettings = normaliseWeatherSettingsValue(navigation.settings?.weather);
    let cities = weatherSettings.city;
    if (!Array.isArray(cities) || cities.length === 0) {
      cities = [DEFAULT_WEATHER_CITY];
    }

    const results = await Promise.all(
      cities.map((city) =>
        fetchOpenMeteoWeather(city)
          .then((weather) => ({ ...weather, city, success: true }))
          .catch((error) => {
            console.error(`获取城市 ${city} 的天气信息失败：`, error);
            return { city, success: false, message: error.message };
          })
      )
    );

    const successful = results.filter((item) => item.success);
    if (successful.length === 0 && results.length > 0) {
      const firstError = results.find((item) => !item.success);
      return jsonResponse(
        { success: false, message: firstError?.message || "无法获取任何城市的天气信息。" },
        502
      );
    }

    return jsonResponse({ success: true, data: successful, storage: storageMode() });
  } catch (error) {
    const statusCode = error.statusCode || 502;
    return jsonResponse({ success: false, message: error.message }, statusCode);
  }
}

/**
 * GET /api/admin/data —— 后台读取完整数据（含 weather.city 字符串形态）。
 * @returns {Promise<Response>}
 */
async function handleGetAdminData() {
  const fullData = await readFullData();
  const data = sanitiseData(fullData);
  const weather = normaliseWeatherSettingsValue(fullData.settings?.weather);
  const cityString = Array.isArray(weather.city) ? weather.city.join(" ") : weather.city;
  data.settings.weather = { city: cityString };
  return jsonResponse({ success: true, data, storage: storageMode() });
}

/**
 * PUT /api/admin/data 与 PUT /api/data —— 覆盖写入导航数据（不触碰管理员凭据）。
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function handleDataUpdate(request) {
  try {
    const payload = await request.json();
    const { apps, bookmarks, settings } = payload || {};
    const normalisedApps = normaliseCollection(apps, { label: "应用", type: "apps" });
    const normalisedBookmarks = normaliseCollection(bookmarks, { label: "书签", type: "bookmarks" });
    const normalisedSettings = normaliseSettingsInput(settings);

    await writeNavigationData({
      settings: normalisedSettings,
      apps: normalisedApps,
      bookmarks: normalisedBookmarks,
    });

    const stats = await readStats();
    const data = sanitiseData({
      settings: normalisedSettings,
      apps: normalisedApps,
      bookmarks: normalisedBookmarks,
      stats,
    });
    return jsonResponse({ success: true, data, storage: storageMode() });
  } catch (error) {
    return jsonResponse({ success: false, message: error.message }, 400);
  }
}

/**
 * POST /api/admin/password —— 修改管理员密码。
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function handlePasswordUpdate(request) {
  const body = await request.json().catch(() => null);
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPasswordRaw = typeof body?.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword) {
    return jsonResponse({ success: false, message: "请输入当前密码。" }, 400);
  }
  const cleanNewPassword = newPasswordRaw.trim();
  if (!cleanNewPassword || cleanNewPassword.length < 6) {
    return jsonResponse({ success: false, message: "新密码长度至少为 6 位。" }, 400);
  }

  const admin = await readAdminRecord();
  const isMatch = await verifyPassword(currentPassword, admin);
  if (!isMatch) {
    return jsonResponse({ success: false, message: "当前密码不正确。" }, 401);
  }

  const isSameAsOld = await verifyPassword(cleanNewPassword, admin);
  if (isSameAsOld) {
    return jsonResponse({ success: false, message: "新密码不能与当前密码相同。" }, 400);
  }

  const record = await createAdminRecord(cleanNewPassword);
  await writeAdminRecord(record);
  return jsonResponse({ success: true, message: "密码已更新，下次登录请使用新密码。" });
}

/**
 * 返回第一个非空（去空白后）字符串，其余情况返回空串。
 * @param {...string} values
 * @returns {string}
 */
function firstNonEmptyString(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

/**
 * 由站点地址推导传统 favicon 路径 `<origin>/favicon.ico`。
 * 上游偶尔不返回 faviconUrl，此时用它兜底。裸域名（如 `example.com:99`）
 * 会补上 https://，否则 URL 会把 `example.com:` 误判成协议名。
 * @param {string} rawUrl
 * @returns {string}
 */
function deriveFaviconUrl(rawUrl) {
  const value = String(rawUrl || "").trim();
  if (!value) return "";
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const { origin } = new URL(candidate);
    return origin && origin !== "null" ? `${origin}/favicon.ico` : "";
  } catch (error) {
    return "";
  }
}

/**
 * 判断上游给的图标地址能否直接写进 <img src>。
 *
 * 上游是第三方服务，返回内容不受我们控制；这里做一次白名单过滤，
 * 避免 javascript: 之类的串被写进 KV 长期留存。前端的渲染约定见
 * public/scripts/main.js:444（仅 http(s) 或 data: 前缀才当图片渲染），
 * 此处比前端更严一档：data: 只认 data:image/。
 *
 * @param {string} value 待校验的地址
 * @returns {boolean} 可作为图标地址使用时返回 true
 */
function isUsableIconUrl(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:image/");
}

/**
 * 判断查询参数是否为真值开关（`1` / `true` / `yes`，大小写不敏感）。
 * @param {Request} request
 * @param {string} name 参数名
 * @returns {boolean}
 */
function hasQueryFlag(request, name) {
  const raw = new URL(request.url).searchParams.get(name);
  if (!raw) return false;
  return ["1", "true", "yes"].includes(raw.trim().toLowerCase());
}

/**
 * 从上游 `favicons` 映射里筛出合法的尺寸项，剔除格式不符的脏值。
 * @param {*} raw 上游原始 favicons
 * @returns {object} 形如 `{ "16": "data:image/png;base64,..." }`
 */
function pickFaviconSizes(raw) {
  if (!raw || typeof raw !== "object") return {};
  const result = {};
  for (const [size, value] of Object.entries(raw)) {
    if (!/^\d{1,4}$/.test(size)) continue;
    if (typeof value !== "string" || !value.startsWith("data:image/")) continue;
    result[size] = value;
  }
  return result;
}

/** 降级原因码 → 面向用户的说法 */
const FAVICON_DEGRADED_REASONS = Object.freeze({
  "upstream-unreachable": "图标服务暂时不可用",
  "upstream-timeout": "图标服务响应超时",
  "upstream-scrape-failed": "图标服务未能抓取该站点",
});

/**
 * 上游失败时的降级响应：改用站点自身的 `<origin>/favicon.ico`，让「自动获取」始终有结果。
 *
 * 实测该上游是香港的小型 VPS，跨境链路拥塞时既可能整体超时，也可能它自己抓不到
 * 目标站点（返回 500 `context deadline exceeded`）——例如 `down.ityet.com:99` 从国内
 * 访问仅 0.04s，上游却抓不动。这类失败与用户填的链接是否有效无关，直接报错会让用户
 * 误以为是自己写错了地址，故降级为站点自身地址并如实标注。
 *
 * 只有连站点自身地址都推导不出来时，才退化为硬失败。
 *
 * @param {string} rawTarget 用户填写的原始链接
 * @param {string} reason 失败原因码
 * @param {number} [upstreamStatus] 上游 HTTP 状态码（若有）
 * @returns {Response}
 */
function degradedFaviconResponse(rawTarget, reason, upstreamStatus) {
  const label = FAVICON_DEGRADED_REASONS[reason] || "图标服务暂时不可用";
  const fallbackUrl = deriveFaviconUrl(rawTarget);

  if (!fallbackUrl) {
    return jsonResponse(
      {
        success: false,
        reason,
        upstreamStatus,
        message: `${label}，且无法从该链接推导出图标地址，请稍后重试。`,
      },
      502,
    );
  }

  return jsonResponse({
    success: true,
    degraded: true,
    reason,
    upstreamStatus,
    title: "",
    description: "",
    url: rawTarget,
    faviconUrl: fallbackUrl,
    message: `${label}，已按该站点自身地址填入图标（未获取到标题与描述）。`,
  });
}

/**
 * POST /api/fetch-logo —— 调用上游服务真实抓取目标站点的图标与站点信息。
 *
 * 上游：`POST https://favicon.yy.luler.top/api/favicon`，请求体 `{"url":"<链接或域名>"}`。
 * 成功返回 `{ title, description, url, faviconUrl, favicons }`，其中 `favicons` 是
 * 16/32/64/128/256 五档 base64 data URI（实测整包约 55KB，256 档单档就占 33KB）。
 *
 * 默认只回传前端真正用得上的字段（`faviconUrl` 原地址 + 站点标题/描述 + 归一化 `url`），
 * 响应压到几百字节；如需自包含的 data URI 兜底（对方站点 `/favicon.ico` 可能 404），
 * 显式加查询参数 `?includeFavicons=1` 即可取回筛选后的 `favicons` 映射。
 *
 * 所有失败响应都带 `reason` 码（`upstream-*` / `invalid-target` / `url-too-long`），
 * 便于一眼区分"图标服务的问题"与"用户填错了地址"。
 *
 * @param {Request} request 请求体形如 `{ "url": "https://example.com" }`，也接受 `example.com:99` 这类裸地址
 * @returns {Promise<Response>}
 */
async function handleFetchLogo(request) {
  const body = await request.json().catch(() => null);
  const rawTarget = typeof body?.url === "string" ? body.url.trim() : "";

  if (!rawTarget) {
    return jsonResponse(
      { success: false, reason: "empty-url", message: "请先填写链接地址。" },
      400,
    );
  }
  if (rawTarget.length > FAVICON_TARGET_MAX_LENGTH) {
    return jsonResponse(
      { success: false, reason: "url-too-long", message: "链接地址过长，无法解析。" },
      400,
    );
  }

  const fetchOptions = {
    method: "POST",
    headers: {
      // 上游只校验 content-type，实测 origin / referer / sec-* 等浏览器头并非必需
      "Content-Type": "application/json",
      Accept: "*/*",
    },
    body: JSON.stringify({ url: rawTarget }),
  };

  // AbortController / setTimeout 的可用性在不同 V8 运行时上不一致，
  // 检测到才挂超时，避免"为了加超时反而把整条路由搞崩"。
  let timeoutId;
  if (typeof AbortController === "function" && typeof setTimeout === "function") {
    const controller = new AbortController();
    fetchOptions.signal = controller.signal;
    timeoutId = setTimeout(() => controller.abort(), FAVICON_REQUEST_TIMEOUT_MS);
  }

  try {
    const response = await fetch(FAVICON_API_ENDPOINT, fetchOptions);
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const upstreamMessage = typeof payload?.error === "string" ? payload.error : "";
      console.warn(`[fetch-logo] 上游返回 ${response.status}：${upstreamMessage || "(无错误信息)"}`);

      // 两种都算「地址本身不可用」，不做兜底：
      // 1) 4xx —— 上游明确拒收这个地址
      // 2) 5xx 但属连接层 / TLS 层失败或 URL 畸形（目标站点根本连不上，详见 UPSTREAM_TARGET_FAULT_PATTERN）
      const targetUnusable =
        (response.status >= 400 && response.status < 500) ||
        UPSTREAM_TARGET_FAULT_PATTERN.test(upstreamMessage);

      if (targetUnusable) {
        return jsonResponse(
          {
            success: false,
            reason: "invalid-target",
            message: "链接地址无效或无法访问该站点，请检查后重试。",
          },
          400,
        );
      }

      // 真正的上游侧故障（实测：抓取超时 → "context deadline exceeded"）→ 降级兜底
      return degradedFaviconResponse(rawTarget, "upstream-scrape-failed", response.status);
    }

    const resolvedUrl = firstNonEmptyString(payload?.url, rawTarget);
    // 上游回畸形协议时按站点 origin 重新推导，绝不把原串透传给前端
    const upstreamFaviconUrl = firstNonEmptyString(payload?.faviconUrl);
    const faviconUrl = isUsableIconUrl(upstreamFaviconUrl)
      ? upstreamFaviconUrl
      : deriveFaviconUrl(resolvedUrl);

    if (!faviconUrl) {
      return jsonResponse(
        { success: false, reason: "no-favicon", message: "未能从该站点解析出图标地址。" },
        502,
      );
    }

    const result = {
      success: true,
      title: typeof payload?.title === "string" ? payload.title : "",
      description: typeof payload?.description === "string" ? payload.description : "",
      url: resolvedUrl,
      faviconUrl,
    };

    // 五档 base64 整包约 55KB（256 档单档 33KB），默认不带；
    // 显式 ?includeFavicons=1 才回传，用于不依赖对方站点 /favicon.ico 可达的兜底场景。
    if (hasQueryFlag(request, "includeFavicons")) {
      result.favicons = pickFaviconSizes(payload?.favicons);
    }

    return jsonResponse(result);
  } catch (error) {
    if (error && error.name === "AbortError") {
      console.warn(`[fetch-logo] 上游超时（> ${FAVICON_REQUEST_TIMEOUT_MS}ms）`);
      return degradedFaviconResponse(rawTarget, "upstream-timeout");
    }
    console.error("调用上游图标服务失败：", error);
    return degradedFaviconResponse(rawTarget, "upstream-unreachable");
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

// =================================================================================
// Edge Function 入口（EdgeOne Makers）
// =================================================================================

/**
 * EdgeOne Edge Function 入口，捕获 /api/ 下的全部路由。
 * @param {object} context 含 { request, params, env, waitUntil }
 * @returns {Promise<Response>}
 */
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  console.log(`${method} ${path} - ${getClientIp(request)}`);

  try {
    // CORS 预检
    if (method === "OPTIONS") {
      return new Response(null, { status: 200, headers: corsHeaders() });
    }

    if (path === "/api/login" && method === "POST") {
      return await handleLogin(request);
    }

    if (path === "/api/data" && method === "GET") {
      return await handleGetData(request, context);
    }

    if (path === "/api/weather" && method === "GET") {
      return await handleGetWeather();
    }

    if (path === "/api/admin/data" && method === "GET") {
      const deny = await requireAuth(request);
      if (deny) return deny;
      return await handleGetAdminData();
    }

    if ((path === "/api/admin/data" || path === "/api/data") && method === "PUT") {
      const deny = await requireAuth(request);
      if (deny) return deny;
      return await handleDataUpdate(request);
    }

    if (path === "/api/admin/password" && method === "POST") {
      const deny = await requireAuth(request);
      if (deny) return deny;
      return await handlePasswordUpdate(request);
    }

    if (path === "/api/fetch-logo" && method === "POST") {
      const deny = await requireAuth(request);
      if (deny) return deny;
      return await handleFetchLogo(request);
    }

    // 所有落到这里的都是 /api/* 下的未命中请求（含"路径不存在"与"方法不支持"）。
    // 返回 JSON 而非纯文本 "Not Found"：前端一律按 JSON 解析，
    // 纯文本会抛出 "Unexpected token 'N', ..." 这种对用户毫无线索的解析错误。
    return jsonResponse({ success: false, message: "接口不存在或请求方法不支持。" }, 404);
  } catch (error) {
    console.error("未处理的错误：", error);
    return jsonResponse({ success: false, message: error.message }, 500);
  }
}

// =================================================================================
// 数据规范化与清洗
// =================================================================================

/**
 * 从请求头推断客户端 IP。
 * @param {Request} request
 * @returns {string}
 */
function getClientIp(request) {
  const direct = request.headers.get("eo-connecting-ip");
  if (direct) return direct;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

/**
 * 对外输出的数据（不含管理员凭据）。
 * @param {{settings?: object, apps?: object[], bookmarks?: object[], stats?: object}} fullData
 * @returns {object}
 */
function sanitiseData(fullData) {
  const defaults = createDefaultSettings();
  const sourceSettings = fullData.settings || defaults;
  const weather = normaliseWeatherSettingsValue(sourceSettings.weather);

  return {
    settings: {
      siteName: sourceSettings.siteName || defaults.siteName,
      siteLogo: sourceSettings.siteLogo || defaults.siteLogo,
      greeting: sourceSettings.greeting || defaults.greeting,
      footer: normaliseFooterValue(sourceSettings.footer),
      weather: { city: weather.city },
      categories: resolveCategories(sourceSettings.categories),
    },
    apps: fullData.apps?.map((item) => ({ ...item })) || [],
    bookmarks: fullData.bookmarks?.map((item) => ({ ...item })) || [],
    visitorCount: fullData.stats?.visitorCount ?? DEFAULT_STATS.visitorCount,
    config: {
      weather: {
        defaultCity: DEFAULT_WEATHER_CITY,
      },
    },
  };
}

/**
 * 校验并规范化后台提交的设置（写入路径，宽松容错，缺必填抛错）。
 * @param {object} input
 * @returns {object}
 */
function normaliseSettingsInput(input) {
  const siteName = typeof input?.siteName === "string" ? input.siteName.trim() : "";
  if (!siteName) throw new Error("网站名称不能为空。");

  return {
    siteName,
    siteLogo: typeof input?.siteLogo === "string" ? input.siteLogo.trim() : "",
    greeting: typeof input?.greeting === "string" ? input.greeting.trim() : "",
    footer: normaliseFooterValue(input?.footer),
    weather: normaliseWeatherSettingsInput(input?.weather),
    categories: normaliseCategoriesInput(input?.categories),
  };
}

/**
 * 规范化集合（应用 / 书签），并对重复 id 重新生成。
 * @param {*} value
 * @param {{label: string, type: "apps" | "bookmarks"}} options
 * @returns {object[]}
 */
function normaliseCollection(value, { label, type }) {
  if (!Array.isArray(value)) throw new Error(`${label} 数据格式不正确，应为数组。`);
  const seen = new Set();
  return value.map((item) => {
    const normalised = normaliseItem(item, type);
    if (seen.has(normalised.id)) {
      normalised.id = crypto.randomUUID();
    }
    seen.add(normalised.id);
    return normalised;
  });
}

/**
 * 规范化单个应用 / 书签条目。
 * @param {object} input
 * @param {"apps" | "bookmarks"} type
 * @returns {object}
 */
function normaliseItem(input, type) {
  if (!input || typeof input !== "object") throw new Error("数据项格式不正确。");
  const name = String(input.name || "").trim();
  const url = String(input.url || "").trim();
  if (!name) throw new Error("名称不能为空。");
  if (!url) throw new Error("链接不能为空。");

  const payload = {
    id: typeof input.id === "string" && input.id.trim() ? input.id.trim() : crypto.randomUUID(),
    name,
    url: ensureUrlProtocol(url),
    description: typeof input.description === "string" ? input.description.trim() : "",
    icon: typeof input.icon === "string" ? input.icon.trim() : "",
  };
  if (type === "bookmarks") {
    payload.category = typeof input.category === "string" ? input.category.trim() : "";
  }
  return payload;
}

/**
 * 规范化 footer（统一换行、去首尾空白，空则返回空串）。
 * @param {*} value
 * @returns {string}
 */
function normaliseFooterValue(value) {
  if (typeof value !== "string") return "";
  const normalised = value.replace(/\r\n?/g, "\n");
  return normalised.trim() ? normalised : "";
}

/**
 * 将城市输入拆分为字符串数组（字符串按空白切分，数组逐项 trim）。
 * @param {*} source
 * @returns {string[]}
 */
function splitCityList(source) {
  if (typeof source === "string") {
    return source.split(/\s+/).filter(Boolean);
  }
  if (Array.isArray(source)) {
    return source.map((item) => String(item).trim()).filter(Boolean);
  }
  return [];
}

/**
 * 读取路径的天气规范化：宽松，空值回落到默认城市。
 * @param {*} input
 * @returns {{city: string[]}}
 */
function normaliseWeatherSettingsValue(input) {
  const fallback = createDefaultWeatherSettings();
  let cities = [];
  if (input && typeof input === "object") {
    cities = splitCityList(input.city);
  }
  if (cities.length === 0) {
    cities = fallback.city;
  }
  return { city: cities };
}

/**
 * 写入路径的天气规范化：严格，空值抛错。
 * @param {*} rawWeather
 * @returns {{city: string[]}}
 */
function normaliseWeatherSettingsInput(rawWeather) {
  if (!rawWeather || typeof rawWeather !== "object") {
    return createDefaultWeatherSettings();
  }
  const cities = splitCityList(rawWeather.city);
  if (cities.length === 0) {
    throw new Error("天气城市不能为空。");
  }
  return { city: cities };
}

/**
 * 默认设置（来自唯一常量 DEFAULT_SETTINGS）。
 * @returns {object}
 */
function createDefaultSettings() {
  return {
    siteName: DEFAULT_SETTINGS.siteName,
    siteLogo: DEFAULT_SETTINGS.siteLogo,
    greeting: DEFAULT_SETTINGS.greeting,
    footer: DEFAULT_SETTINGS.footer,
    weather: createDefaultWeatherSettings(),
    categories: [...DEFAULT_SETTINGS.categories],
  };
}

/**
 * 默认天气设置。
 * @returns {{city: string[]}}
 */
function createDefaultWeatherSettings() {
  return { city: [DEFAULT_WEATHER_CITY] };
}

/**
 * 规范化书签分类列表。
 *
 * 接受数组或 `|` 分隔的字符串（兼容全角竖线、逗号、换行），统一 trim、
 * 丢弃空值与超长项、按大小写不敏感去重并保留首次出现的原形，最后截断数量。
 *
 * @param {*} raw 原始值，可为数组、字符串或其它类型
 * @returns {string[]} 规范化后的分类列表
 */
function normaliseCategoriesInput(raw) {
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
    ? raw.split(/[|｜,，\n\r]+/)
    : [];

  const seen = new Set();
  const result = [];
  for (const entry of list) {
    if (typeof entry !== "string") continue;
    const label = entry.trim();
    if (!label || label.length > CATEGORY_MAX_LENGTH) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(label);
    if (result.length >= CATEGORY_MAX_COUNT) break;
  }
  return result;
}

/**
 * 解析出用于展示的分类列表。
 *
 * 与规范化的区别在于对「字段缺失」的处理：null/undefined 视为「从未配置」，
 * 回退到默认分类；而显式的空数组表示管理员主动清空，予以尊重。
 *
 * @param {*} raw 原始值
 * @returns {string[]} 分类列表
 */
function resolveCategories(raw) {
  if (raw === undefined || raw === null) {
    return [...DEFAULT_SETTINGS.categories];
  }
  return normaliseCategoriesInput(raw);
}

/**
 * 确保链接带协议。
 * @param {string} url
 * @returns {string}
 */
function ensureUrlProtocol(url) {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

// =================================================================================
// 天气 API（Open-Meteo，免费无需 Key）
// =================================================================================

/**
 * 带超时的 JSON 请求。
 * @param {string | URL} url
 * @returns {Promise<object>}
 */
async function fetchJsonWithTimeout(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WEATHER_API_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "identity",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    if (!response.ok) {
      throw createWeatherError(`API请求失败: ${response.status}`, response.status);
    }
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 城市名 → 经纬度（带重试）。
 * @param {string} cityName
 * @returns {Promise<{latitude: number, longitude: number, name: string}>}
 */
async function geocodeCity(cityName) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", cityName);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "zh");
  url.searchParams.set("format", "json");

  let lastError = null;
  for (let attempt = 0; attempt < GEOLOCATION_MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const delay = GEOLOCATION_RETRY_DELAY_BASE_MS * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const payload = await fetchJsonWithTimeout(url);
      if (!payload?.results?.[0]) {
        throw createWeatherError(`未找到城市"${cityName}"的地理位置信息。`, 404);
      }
      const { latitude, longitude, name } = payload.results[0];
      if (typeof latitude !== "number" || typeof longitude !== "number") {
        throw createWeatherError("地理位置信息无效。");
      }
      return { latitude, longitude, name: name || cityName };
    } catch (error) {
      lastError = error;
      // 客户端错误（如 404）不重试
      if (error?.statusCode >= 400 && error.statusCode < 500) {
        throw error;
      }
      console.warn(
        `geocodeCity 第 ${attempt + 1}/${GEOLOCATION_MAX_RETRIES} 次失败，重试中...`,
        error.message
      );
    }
  }
  throw lastError || createWeatherError("地理编码服务获取失败，且所有重试均告失败。", 502);
}

/**
 * 查询单城市当前天气。
 * @param {string} cityName
 * @returns {Promise<object>}
 */
async function fetchOpenMeteoWeather(cityName) {
  const location = await geocodeCity(cityName);
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set("current_weather", "true");
  url.searchParams.set("timezone", "auto");

  const payload = await fetchJsonWithTimeout(url);
  const current = payload?.current_weather;
  if (!current || typeof current !== "object") {
    throw createWeatherError("天气数据格式异常。");
  }

  return {
    text: getWeatherDescription(Number(current.weathercode)),
    temperature: Number(current.temperature),
    windspeed: Number(current.windspeed),
    weathercode: Number(current.weathercode),
    time: current.time || null,
  };
}

/**
 * 构造带 statusCode 的天气错误。
 * @param {string} message
 * @param {number} [statusCode=502]
 * @returns {Error}
 */
function createWeatherError(message, statusCode = 502) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/**
 * WMO weathercode → 中文描述。
 * @param {number} code
 * @returns {string}
 */
function getWeatherDescription(code) {
  const map = {
    0: "晴天", 1: "晴朗", 2: "多云", 3: "阴天", 45: "雾", 48: "冻雾",
    51: "小雨", 53: "中雨", 55: "大雨", 56: "小冻雨", 57: "冻雨",
    61: "小雨", 63: "中雨", 65: "大雨", 66: "小冻雨", 67: "冻雨",
    71: "小雪", 73: "中雪", 75: "大雪", 77: "雪粒", 80: "阵雨",
    81: "中阵雨", 82: "大阵雨", 85: "小阵雪", 86: "大阵雪", 95: "雷雨",
    96: "雷雨伴冰雹", 99: "雷雨伴大冰雹",
  };
  return map[code] || "未知";
}

// =================================================================================
// 通用工具
// =================================================================================

/**
 * 统一 CORS 响应头（jsonResponse 与 OPTIONS 预检共用）。
 * @returns {object}
 */
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

/**
 * 构造 JSON 响应（V8 无 Response.json，须手动序列化）。
 * @param {*} data
 * @param {number} [status=200]
 * @returns {Response}
 */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
      ...corsHeaders(),
    },
  });
}

/**
 * 字节数组 → 十六进制字符串。
 * @param {Uint8Array} buffer
 * @returns {string}
 */
function bufferToHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 十六进制字符串 → 字节数组。
 * @param {string} hex
 * @returns {Uint8Array}
 */
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * 常量时间字符串比较。
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function timingSafeEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
