// =================================================================================
// EdgeOne KV Storage Class
// =================================================================================

class EdgeOneKVStorage {
  constructor(env) {
    this.env = env;
  }

  async readFullData() {
    const DATA_KEY = "data";
    const raw = await this.env.SIMPAGE_DATA.get(DATA_KEY);
    if (!raw) {
      const defaultData = await this.createDefaultData();
      await this.writeFullData(defaultData);
      return defaultData;
    }
    const parsed = JSON.parse(raw);
    return parsed;
  }

  async writeFullData(fullData) {
    const DATA_KEY = "data";
    await this.env.SIMPAGE_DATA.put(DATA_KEY, JSON.stringify(fullData, null, 2));
  }

  async getSession(token) {
    return await this.env.SESSIONS.get(token);
  }

  async setSession(token, value, options = {}) {
    await this.env.SESSIONS.put(token, value, { expirationTtl: options.ttl });
  }

  async createDefaultData() {
    const DEFAULT_ADMIN_PASSWORD = "admin123";
    const { passwordHash, passwordSalt } = await this.hashPassword(DEFAULT_ADMIN_PASSWORD);
    
    return {
      settings: {
        siteName: "SimPage",
        siteLogo: "",
        greeting: "",
        footer: "",
        weather: { city: ["北京"] }
      },
      apps: [],
      bookmarks: [],
      stats: { visitorCount: 0 },
      admin: { passwordHash, passwordSalt }
    };
  }

  async hashPassword(password) {
    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
    const saltHex = this.bufferToHex(salt);

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      512
    );

    const hashHex = this.bufferToHex(new Uint8Array(derivedBits));
    return { passwordHash: hashHex, passwordSalt: saltHex };
  }

  bufferToHex(buffer) {
    return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
}

// 存储实例
let storage = null;

// 初始化存储
function getStorage(env) {
  if (!storage) {
    storage = new EdgeOneKVStorage(env);
  }
  return storage;
}

// =================================================================================
// Constants and Defaults
// =================================================================================

const BASE_DEFAULT_SETTINGS = Object.freeze({
  siteName: "SimPage",
  siteLogo: "",
  greeting: "",
  footer: "",
});

const DEFAULT_STATS = Object.freeze({
  visitorCount: 0,
});

const DEFAULT_WEATHER_CONFIG = Object.freeze({
  city: "北京",
});

const SESSION_TTL_SECONDS = 12 * 60 * 60; // 12 hours
const AUTH_HEADER_PREFIX = "Bearer ";

// =================================================================================
// API Handlers
// =================================================================================

async function handleLogin(request, env) {
  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!password) {
    return jsonResponse({ success: false, message: "请输入密码。" }, 400);
  }

  const storage = getStorage(env);
  const fullData = await storage.readFullData();
  const admin = fullData.admin;
  if (!admin || !admin.passwordSalt || !admin.passwordHash) {
    return jsonResponse({ success: false, message: "登录功能暂不可用，请稍后再试。" }, 500);
  }

  const isMatch = await verifyPassword(password, admin.passwordSalt, admin.passwordHash);
  if (!isMatch) {
    return jsonResponse({ success: false, message: "密码错误。" }, 401);
  }

  const token = generateToken();
  await storage.setSession(token, "active", { ttl: SESSION_TTL_SECONDS });

  return jsonResponse({ success: true, token });
}

async function handleGetData(request, env) {
  try {
    const storage = getStorage(env);
    const data = await incrementVisitorCountAndReadData(storage);
    return jsonResponse(data);
  } catch (error) {
    console.error("Error in handleGetData:", error);
    return jsonResponse(
      {
        success: false,
        message: `Error fetching data: ${error.message}`,
        stack: error.stack,
      },
      500
    );
  }
}

async function handleGetWeather(request, env) {
  try {
    const storage = getStorage(env);
    const fullData = await storage.readFullData();
    const weatherSettings = normaliseWeatherSettingsValue(fullData.settings?.weather);
    let cities = weatherSettings.city;
    if (!Array.isArray(cities) || cities.length === 0) {
      cities = [DEFAULT_WEATHER_CONFIG.city];
    }

    const weatherPromises = cities.map(city =>
      fetchOpenMeteoWeather(city)
        .then(weather => ({ ...weather, city, success: true }))
        .catch(error => {
          console.error(`获取城市 ${city} 的天气信息失败：`, error);
          return { city, success: false, message: error.message };
        })
    );

    const results = await Promise.all(weatherPromises);
    const successfulWeatherData = results.filter(r => r.success);

    if (successfulWeatherData.length === 0 && results.length > 0) {
      const firstError = results.find(r => !r.success);
      const errorMessage = firstError?.message || "无法获取任何城市的天气信息。";
      return jsonResponse({ success: false, message: errorMessage }, 502);
    }

    return jsonResponse({ success: true, data: successfulWeatherData });
  } catch (error) {
    const statusCode = error.statusCode || 502;
    return jsonResponse({ success: false, message: error.message }, statusCode);
  }
}

async function handleGetAdminData(request, env) {
  const storage = getStorage(env);
  const fullData = await storage.readFullData();
  const data = sanitiseData(fullData);
  const weather = normaliseWeatherSettingsValue(fullData.settings?.weather);
  const cityString = Array.isArray(weather.city) ? weather.city.join(" ") : weather.city;
  data.settings.weather = { city: cityString };
  return jsonResponse({ success: true, data });
}

async function handleDataUpdate(request, env) {
  try {
    const { apps, bookmarks, settings } = await request.json();
    const normalisedApps = normaliseCollection(apps, { label: "应用", type: "apps" });
    const normalisedBookmarks = normaliseCollection(bookmarks, { label: "书签", type: "bookmarks" });
    const normalisedSettings = normaliseSettingsInput(settings);

    const storage = getStorage(env);
    const existing = await storage.readFullData();
    const payload = {
      settings: normalisedSettings,
      apps: normalisedApps,
      bookmarks: normalisedBookmarks,
      stats: existing.stats,
      admin: existing.admin,
    };

    await storage.writeFullData(payload);
    return jsonResponse({ success: true, data: sanitiseData(payload) });
  } catch (error) {
    return jsonResponse({ success: false, message: error.message }, 400);
  }
}

async function handlePasswordUpdate(request, env) {
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

  const storage = getStorage(env);
  const fullData = await storage.readFullData();
  const admin = fullData.admin;
  if (!admin || !admin.passwordHash || !admin.passwordSalt) {
    return jsonResponse({ success: false, message: "密码修改功能暂不可用。" }, 500);
  }

  const isMatch = await verifyPassword(currentPassword, admin.passwordSalt, admin.passwordHash);
  if (!isMatch) {
    return jsonResponse({ success: false, message: "当前密码不正确。" }, 401);
  }

  const isSameAsOld = await verifyPassword(cleanNewPassword, admin.passwordSalt, admin.passwordHash);
  if (isSameAsOld) {
    return jsonResponse({ success: false, message: "新密码不能与当前密码相同。" }, 400);
  }

  const { passwordHash, passwordSalt } = await hashPassword(cleanNewPassword);
  const updatedData = {
    ...fullData,
    admin: { passwordHash, passwordSalt },
  };

  await storage.writeFullData(updatedData);
  return jsonResponse({ success: true, message: "密码已更新，下次登录请使用新密码。" });
}

function handleFetchLogo(request, env) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get("targetUrl");

    if (!targetUrl || typeof targetUrl !== "string" || !targetUrl.trim()) {
      return jsonResponse({ success: false, message: "缺少有效的 targetUrl 参数" }, 400);
    }

    // 移除协议 (http, https)
    let domain = targetUrl.trim().replace(/^(https?:\/\/)?/, "");
    // 移除第一个斜杠后的所有内容 (路径, 查询参数, 哈希)
    domain = domain.split("/")[0];

    if (!domain) {
      return jsonResponse({ success: false, message: "无法从链接中提取域名。" }, 400);
    }

    const logoUrl = `https://icon.ooo/${domain}`;
    return jsonResponse({ success: true, logoUrl: logoUrl });

  } catch (error) {
    console.error("生成 Logo 链接时发生内部错误:", error);
    return jsonResponse({ success: false, message: "生成 Logo 链接失败" }, 500);
  }
}

// =================================================================================
// Authentication Middleware
// =================================================================================

async function requireAuth(request, env) {
  const raw = request.headers.get("authorization");
  if (!raw || !raw.startsWith(AUTH_HEADER_PREFIX)) {
    return jsonResponse({ success: false, message: "请登录后再执行此操作。" }, 401);
  }

  const token = raw.slice(AUTH_HEADER_PREFIX.length).trim();
  if (!token) {
    return jsonResponse({ success: false, message: "请登录后再执行此操作。" }, 401);
  }

  const storage = getStorage(env);
  const session = await storage.getSession(token);
  if (!session) {
    return jsonResponse({ success: false, message: "登录状态已失效，请重新登录。" }, 401);
  }
}

// =================================================================================
// Data Management Functions
// =================================================================================

async function incrementVisitorCountAndReadData(storage) {
  const fullData = await storage.readFullData();
  const sanitised = sanitiseData(fullData);

  const currentCount = fullData.stats?.visitorCount || 0;
  const nextVisitorCount = currentCount + 1;
  sanitised.visitorCount = nextVisitorCount;

  const updatedData = {
    ...fullData,
    stats: { ...fullData.stats, visitorCount: nextVisitorCount },
  };

  // Fire-and-forget the write operation
  storage.writeFullData(updatedData).catch(error => {
    console.error("Failed to update visitor count:", error);
  });

  return sanitised;
}

// =================================================================================
// Main Request Handler
// =================================================================================

async function handleRequest(request, env, runtime, clientIp) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  console.log(`${method} ${path} - ${clientIp}`);

  try {
    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }
    
    // API Routes
    if (path === '/api/login' && method === 'POST') {
      return await handleLogin(request, env);
    }

    if (path === '/api/data' && method === 'GET') {
      return await handleGetData(request, env);
    }

    if (path === '/api/weather' && method === 'GET') {
      return await handleGetWeather(request, env);
    }

    if (path === '/api/admin/data' && method === 'GET') {
      const authResult = await requireAuth(request, env);
      if (authResult) return authResult;
      return await handleGetAdminData(request, env);
    }

    if ((path === '/api/admin/data' || path === '/api/data') && method === 'PUT') {
      const authResult = await requireAuth(request, env);
      if (authResult) return authResult;
      return await handleDataUpdate(request, env);
    }

    if (path === '/api/admin/password' && method === 'POST') {
      const authResult = await requireAuth(request, env);
      if (authResult) return authResult;
      return await handlePasswordUpdate(request, env);
    }

    if (path === '/api/fetch-logo' && method === 'GET') {
      const authResult = await requireAuth(request, env);
      if (authResult) return authResult;
      return await handleFetchLogo(request, env);
    }

    // 404 for unknown routes
    return new Response("Not Found", { status: 404 });

  } catch (error) {
    console.error("Unhandled error:", error);
    const errorResponse = {
      success: false,
      message: error.message,
      stack: error.stack,
    };
    return new Response(JSON.stringify(errorResponse, null, 2), {
      status: 500,
      headers: { "Content-Type": "application/json;charset=UTF-8" },
    });
  }
}

export const onRequest = async (context) => {
  const { request, env } = context;

  // 获取客户端 IP 地址
  let clientIp = 'unknown';

  // 尝试从 EO-Connecting-IP 获取客户端 IP
  clientIp = request.headers.get('eo-connecting-ip');
  if (!clientIp) {
    // 如果 EO-Connecting-IP 不存在，尝试从 X-Forwarded-For 获取
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
      // X-Forwarded-For 可能包含多个 IP 地址，选择第一个（最原始客户端 IP）
      clientIp = forwardedFor.split(',')[0].trim();
    }
  }

  // 调用处理函数
  return await handleRequest(request, env, "edgeone", clientIp);
};

// =================================================================================
// Data Normalization and Sanitization Functions
// =================================================================================

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
    },
    apps: fullData.apps?.map((item) => ({ ...item })) || [],
    bookmarks: fullData.bookmarks?.map((item) => ({ ...item })) || [],
    visitorCount: fullData.stats?.visitorCount || DEFAULT_STATS.visitorCount,
    config: {
      weather: {
        defaultCity: DEFAULT_WEATHER_CONFIG.city,
      },
    },
  };
}

function normaliseSettingsInput(input) {
  const siteName = typeof input?.siteName === "string" ? input.siteName.trim() : "";
  if (!siteName) throw new Error("网站名称不能为空。");

  return {
    siteName,
    siteLogo: typeof input?.siteLogo === "string" ? input.siteLogo.trim() : "",
    greeting: typeof input?.greeting === "string" ? input.greeting.trim() : "",
    footer: normaliseFooterValue(input?.footer),
    weather: normaliseWeatherSettingsInput(input?.weather),
  };
}

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

function normaliseFooterValue(value) {
  if (typeof value !== "string") return "";
  const normalised = value.replace(/\r\n?/g, "\n");
  return normalised.trim() ? normalised : "";
}

function normaliseWeatherSettingsValue(input) {
  const fallback = createDefaultWeatherSettings();
  let value = { ...fallback };
  if (input && typeof input === "object") {
    if (typeof input.city === "string" && input.city.trim()) {
      value.city = input.city.trim().split(/\s+/).filter(Boolean);
    } else if (Array.isArray(input.city)) {
      value.city = input.city.map(c => String(c).trim()).filter(Boolean);
    }
  }
  if (!value.city || value.city.length === 0) {
    value.city = fallback.city;
  }
  return value;
}

function normaliseWeatherSettingsInput(rawWeather) {
    if (!rawWeather || typeof rawWeather !== "object") {
        return createDefaultWeatherSettings();
    }
    const citySource = rawWeather.city;
    let cities = [];
    if (typeof citySource === 'string') {
        cities = citySource.split(/\s+/).filter(Boolean);
    } else if (Array.isArray(citySource)) {
        cities = citySource.map(c => String(c).trim()).filter(Boolean);
    }

    if (cities.length === 0) {
        throw new Error("天气城市不能为空。");
    }
    return { city: cities };
}

function createDefaultSettings() {
  return {
    ...BASE_DEFAULT_SETTINGS,
    weather: createDefaultWeatherSettings(),
  };
}

function createDefaultWeatherSettings() {
  return { city: [DEFAULT_WEATHER_CONFIG.city] };
}

// =================================================================================
// Crypto Functions
// =================================================================================

function generateToken() {
  return crypto.randomUUID();
}

function ensureUrlProtocol(url) {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

async function hashPassword(password) {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const saltHex = bufferToHex(salt);

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    512 // 64 bytes
  );

  const hashHex = bufferToHex(new Uint8Array(derivedBits));
  return { passwordHash: hashHex, passwordSalt: saltHex };
}

async function verifyPassword(password, saltHex, expectedHashHex) {
  const salt = hexToBuffer(saltHex);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    512
  );

  const actualHashHex = bufferToHex(new Uint8Array(derivedBits));
  return timingSafeEqual(expectedHashHex, actualHashHex);
}

// =================================================================================
// Weather API Functions
// =================================================================================

const WEATHER_API_TIMEOUT_MS = 5000;
const GEOLOCATION_MAX_RETRIES = 3;
const GEOLOCATION_RETRY_DELAY_BASE_MS = 300;

async function fetchAndCache(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WEATHER_API_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "Accept": "application/json",
        "Accept-Encoding": "identity",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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

      const payload = await fetchAndCache(url);

      if (!payload?.results?.[0]) {
        throw createWeatherError(`未找到城市"${cityName}"的地理位置信息。`, 404);
      }
      const { latitude, longitude, name } = payload.results[0];
      if (typeof latitude !== "number" || typeof longitude !== "number") {
        throw createWeatherError("地理位置信息无效。");
      }
      return { latitude, longitude, name: name || cityName }; // Success
    } catch (error) {
      lastError = error;
      // Don't retry on client errors (e.g., 404 Not Found)
      if (error?.statusCode >= 400 && error.statusCode < 500) {
        throw error;
      }
      console.warn(
        `geocodeCity failed (attempt ${attempt + 1}/${GEOLOCATION_MAX_RETRIES}), retrying...`,
        error.message
      );
    }
  }

  // If the loop completes, all retries have failed.
  throw lastError || createWeatherError("地理编码服务获取失败，且所有重试均告失败。", 502);
}

async function fetchOpenMeteoWeather(cityName) {
  const location = await geocodeCity(cityName);
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(location.latitude));
  url.searchParams.set("longitude", String(location.longitude));
  url.searchParams.set("current_weather", "true");
  url.searchParams.set("timezone", "auto");

  const payload = await fetchAndCache(url);
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

function createWeatherError(message, statusCode = 502) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

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
// Utility Functions
// =================================================================================

function jsonResponse(data, status = 200) {
  const headers = {
    "Content-Type": "application/json;charset=UTF-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
  
  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
}

function bufferToHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBuffer(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

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