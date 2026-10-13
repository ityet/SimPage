/**
 * SimPage 扩展的共享逻辑：配置读写、站点 API 调用、会话 token 缓存。
 *
 * popup 与 options 均以 ES module 引入本文件，避免两份实现漂移。
 *
 * 会话模型与服务端保持一致：
 *   POST /api/login  → { token }（32 位十六进制，服务端有效期 12 小时）
 *   之后所有受保护接口带 Authorization: Bearer <token>
 * 本地缓存 token 并在过期前 5 分钟视为失效；遇到 401 会清缓存并自动重登一次。
 */

const STORAGE = chrome.storage.local;

const KEYS = {
  siteUrl: "siteUrl",
  password: "password",
  defaultCategory: "defaultCategory",
  token: "sessionToken",
  tokenExpiresAt: "sessionTokenExpiresAt",
  categories: "cachedCategories",
};

/** 服务端会话有效期（与 EDGE 端 SESSION_TTL_MS 对齐） */
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;
/** 提前量：剩余不足 5 分钟即当作已过期，避免请求打到临界点上 */
const TOKEN_SAFETY_MS = 5 * 60 * 1000;

/**
 * 带语义的接口错误，便于 UI 区分「没配置」「密码错」「重复」等情况。
 */
export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {{status?: number, code?: string, payload?: object}} [options]
   */
  constructor(message, { status = 0, code = "", payload = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

/**
 * 把用户输入的站点地址规范化成 `https://host`。
 *
 * 允许粘贴带路径的地址（如 `https://nav.itmax.cn/admin`），会剥掉路径只留 origin。
 * 还会对 hostname 做一次字符白名单校验 —— `new URL("https://!!!")` 在浏览器里
 * 不会抛错（会得到 host 为 `!!!` 的结果），若不拦，后面只会在发起请求时才失败，
 * 报错信息也不容易定位。
 *
 * @param {string} value
 * @returns {string} 规范化后的地址；无法解析或 hostname 明显非法时返回空串
 */
export function normaliseSiteUrl(value) {
  let raw = String(value || "").trim();
  if (!raw) return "";
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  try {
    const url = new URL(raw);
    // hostname 已是 punycode（IDN 会被自动转换），故只放行 ASCII 里合法的集合；
    // 方括号与冒号是给 IPv6 用的。
    if (!/^[a-z0-9._:\-[\]]+$/i.test(url.hostname)) return "";
    return `${url.protocol}//${url.host}`;
  } catch (error) {
    return "";
  }
}

/**
 * 读取本地配置。
 * @returns {Promise<{siteUrl: string, password: string, defaultCategory: string, categories: string[]}>}
 */
export async function readConfig() {
  const raw = await STORAGE.get([
    KEYS.siteUrl,
    KEYS.password,
    KEYS.defaultCategory,
    KEYS.categories,
  ]);
  return {
    siteUrl: raw[KEYS.siteUrl] || "",
    password: raw[KEYS.password] || "",
    defaultCategory: raw[KEYS.defaultCategory] || "",
    categories: Array.isArray(raw[KEYS.categories]) ? raw[KEYS.categories] : [],
  };
}

/**
 * 写入本地配置（浅合并）。传 `undefined` 的键会被忽略。
 * @param {{siteUrl?: string, password?: string, defaultCategory?: string, categories?: string[]}} patch
 * @returns {Promise<void>}
 */
export async function saveConfig(patch) {
  const payload = {};
  for (const key of Object.keys(patch)) {
    if (patch[key] === undefined) continue;
    payload[KEYS[key]] = patch[key];
  }
  if (Object.keys(payload).length > 0) {
    await STORAGE.set(payload);
  }
}

/**
 * 读取仍有效的缓存 token；没有或临近过期则返回空串。
 * @returns {Promise<string>}
 */
async function readToken() {
  const raw = await STORAGE.get([KEYS.token, KEYS.tokenExpiresAt]);
  const token = raw[KEYS.token] || "";
  const expiresAt = Number(raw[KEYS.tokenExpiresAt] || 0);
  if (!token || !expiresAt) return "";
  if (Date.now() > expiresAt - TOKEN_SAFETY_MS) return "";
  return token;
}

/**
 * 清空本地缓存的会话（用于「退出」或 401 重登前）。
 * @returns {Promise<void>}
 */
export async function clearToken() {
  await STORAGE.remove([KEYS.token, KEYS.tokenExpiresAt]);
}

/**
 * 发起一次站点请求。非 2xx 统一抛 ApiError（附 status / reason / 原始 payload）。
 *
 * @param {string} path 形如 `/api/login`
 * @param {{method?: string, body?: object, token?: string, timeoutMs?: number}} [options]
 * @returns {Promise<object>}
 */
async function request(path, { method = "GET", body, token = "", timeoutMs = 20000 } = {}) {
  const config = await readConfig();
  if (!config.siteUrl) {
    throw new ApiError("还没有配置 SimPage 站点地址。", { code: "not-configured" });
  }

  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const headers = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${config.siteUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller ? controller.signal : undefined,
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message = (payload && payload.message) || `请求失败（HTTP ${response.status}）。`;
      const code = (payload && payload.duplicate && "duplicate") || (payload && payload.reason) || "";
      throw new ApiError(message, { status: response.status, code, payload });
    }

    return payload || {};
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error && error.name === "AbortError") {
      throw new ApiError(`请求超时（${Math.round(timeoutMs / 1000)} 秒无响应），请检查站点是否可访问。`, {
        code: "timeout",
      });
    }
    throw new ApiError(
      `无法连接到 ${config.siteUrl}，请检查地址、网络或该实例是否允许跨域访问。`,
      { code: "network", payload: { cause: String((error && error.message) || error) } },
    );
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** 进行中的登录请求（并发调用时复用同一个 Promise，避免重复登录） */
let loginInFlight = null;

/**
 * 取得可用 token：优先本地缓存，必要时用密码登录换取。
 * @param {boolean} [force] 忽略缓存强制重新登录
 * @returns {Promise<string>}
 */
export async function ensureToken(force = false) {
  if (!force) {
    const cached = await readToken();
    if (cached) return cached;
  }
  if (loginInFlight) return loginInFlight;

  loginInFlight = (async () => {
    const config = await readConfig();
    if (!config.siteUrl) {
      throw new ApiError("还没有配置 SimPage 站点地址。", { code: "not-configured" });
    }
    if (!config.password) {
      throw new ApiError("还没有配置管理员密码。", { code: "not-configured" });
    }

    const payload = await request("/api/login", {
      method: "POST",
      body: { password: config.password },
      timeoutMs: 15000,
    });
    if (!payload || typeof payload.token !== "string" || !payload.token) {
      throw new ApiError("登录成功但服务端未返回 token。", { code: "bad-response" });
    }

    await STORAGE.set({
      [KEYS.token]: payload.token,
      [KEYS.tokenExpiresAt]: Date.now() + TOKEN_TTL_MS,
    });
    return payload.token;
  })();

  try {
    return await loginInFlight;
  } finally {
    loginInFlight = null;
  }
}

/**
 * 受保护接口调用：自动带 token，遇到 401（会话过期/被清）时清缓存并重登一次再重试。
 * @param {string} path
 * @param {{method?: string, body?: object, timeoutMs?: number}} [options]
 * @returns {Promise<object>}
 */
export async function authedRequest(path, options = {}) {
  const token = await ensureToken();
  try {
    return await request(path, { ...options, token });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await clearToken();
      const fresh = await ensureToken(true);
      return request(path, { ...options, token: fresh });
    }
    throw error;
  }
}

/**
 * 校验配置是否可用，并顺带把服务端分类缓存到本地。
 * @returns {Promise<{storage: string, bookmarkCount: number, appCount: number, categories: string[]}>}
 */
export async function testConnection() {
  const payload = await authedRequest("/api/admin/data", { timeoutMs: 15000 });
  const data = (payload && payload.data) || {};
  const categories = (data.settings && Array.isArray(data.settings.categories) ? data.settings.categories : [])
    .map((item) => String(item).trim())
    .filter(Boolean);

  await saveConfig({ categories });
  return {
    storage: payload.storage || "unknown",
    bookmarkCount: Array.isArray(data.bookmarks) ? data.bookmarks.length : 0,
    appCount: Array.isArray(data.apps) ? data.apps.length : 0,
    categories,
  };
}

/**
 * 拉取分类候选（后台的 `settings.categories`）并写入本地缓存。
 *
 * 刻意使用 `/api/admin/data` 而非公开的 `/api/data`：
 * 后者会递增访客计数，扩展每次打开都请求会把统计刷爆。
 *
 * @returns {Promise<string[]>}
 */
export async function fetchCategories() {
  const payload = await authedRequest("/api/admin/data", { timeoutMs: 15000 });
  const settings = (payload && payload.data && payload.data.settings) || {};
  const categories = (Array.isArray(settings.categories) ? settings.categories : [])
    .map((item) => String(item).trim())
    .filter(Boolean);
  await saveConfig({ categories });
  return categories;
}

/**
 * 追加一条书签。
 * @param {{name: string, url: string, description?: string, icon?: string, category?: string}} item
 * @returns {Promise<{item: object, total: number, storage: string}>}
 */
export async function addBookmark(item) {
  return authedRequest("/api/bookmarks", { method: "POST", body: item, timeoutMs: 20000 });
}

/**
 * 调用站点自带的图标服务抓取标题 / 描述 / 图标（上游为香港 VPS，可能较慢）。
 * @param {string} targetUrl
 * @returns {Promise<object>}
 */
export async function fetchLogo(targetUrl) {
  return authedRequest("/api/fetch-logo", {
    method: "POST",
    body: { url: targetUrl },
    timeoutMs: 30000,
  });
}
