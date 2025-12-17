class EdgeOneKVStorage {
  constructor(env) {
    this.env = env || {};
    this.NAMESPACE = {
      NAVIGATION: "navigation_data",
      SESSIONS: "session_data",
      CONFIG: "config_data"
    };
    this.DEFAULT_TTL = 30 * 24 * 60 * 60; // 30天
    this.SESSION_TTL = 12 * 60 * 60; // 12小时
    console.log("Initializing EdgeOne Pages KV Storage");
  }
  
  async cleanupExpiredSessions() {
    try {
      const now = Date.now();
      const sessionsData = await this.getKVData(this.NAMESPACE.SESSIONS, {});
      let cleanedCount = 0;
      
      // 清理过期会话
      for (const [token, sessionData] of Object.entries(sessionsData)) {
        if (sessionData.expires && now > sessionData.expires) {
          delete sessionsData[token];
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        await this.setKVData(this.NAMESPACE.SESSIONS, sessionsData);
        console.log(`Cleaned ${cleanedCount} expired sessions from KV storage`);
      }
    } catch (error) {
      console.error("Error during session cleanup:", error);
    }
  }

  // KV存储辅助函数方法
  async getKVData(key, defaultValue = null) {
    try {
      // 在EdgeOne Pages中，通过env访问KV
      if (this.env && this.env.KV_NAMESPACE) {
        const value = await this.env.KV_NAMESPACE.get(key);
        return value ? JSON.parse(value) : defaultValue;
      }
      
      // 备用方案：全局存储
      if (typeof globalThis !== 'undefined' && globalThis.kvStorage) {
        const item = globalThis.kvStorage.get(key);
        if (item) {
          if (item.expires && Date.now() > item.expires) {
            globalThis.kvStorage.delete(key);
            return defaultValue;
          }
          return JSON.parse(item.value);
        }
      }
      
      return defaultValue;
    } catch (error) {
      console.error(`Error getting KV data for key ${key}:`, error);
      return defaultValue;
    }
  }

  async setKVData(key, value, options = {}) {
    try {
      const ttl = options.ttl || this.DEFAULT_TTL;
      const jsonValue = JSON.stringify(value);
      
      // 在EdgeOne Pages中，通过env访问KV
      if (this.env && this.env.KV_NAMESPACE) {
        await this.env.KV_NAMESPACE.put(key, jsonValue, {
          expirationTtl: ttl
        });
        console.log(`Successfully stored data to KV with key: ${key}`);
        return true;
      }
      
      // 备用方案：全局存储
      if (typeof globalThis !== 'undefined') {
        if (!globalThis.kvStorage) {
          globalThis.kvStorage = new Map();
        }
        globalThis.kvStorage.set(key, {
          value: jsonValue,
          expires: ttl ? Date.now() + (ttl * 1000) : null
        });
        console.log(`Stored data in global storage with key: ${key}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Error setting KV data for key ${key}:`, error);
      return false;
    }
  }

  async getExternalData() {
    try {
      const externalUrl = "https://down.ityet.com:99/file/navigation.json";
      console.log("Fetching navigation data from external URL:", externalUrl);
      
      const response = await fetch(externalUrl, {
        headers: {
          'User-Agent': 'SimPage-EdgeOne/1.0',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("Successfully fetched navigation data from external URL");
        return data;
      } else {
        console.log("External fetch failed, status:", response.status);
        return null;
      }
    } catch (error) {
      console.log("External fetch error:", error.message);
      return null;
    }
  }

  async readFullData() {
    try {
      console.log("Reading navigation data from KV storage");
      
      // 首先尝试从KV存储读取
      const kvData = await this.getKVData(this.NAMESPACE.NAVIGATION);
      if (kvData) {
        console.log("Successfully read navigation data from KV");
        return kvData;
      }
      
      // 如果KV中没有数据，尝试从外部URL获取
      console.log("No KV data found, trying external URL...");
      const externalData = await this.getExternalData();
      if (externalData) {
        // 将外部数据存储到KV中
        await this.setKVData(this.NAMESPACE.NAVIGATION, externalData);
        console.log("Stored external data to KV storage");
        return externalData;
      }
      
      // 如果都没有，使用默认数据
      console.log("No external data found, using default data...");
      const defaultData = await this.createDefaultData();
      await this.setKVData(this.NAMESPACE.NAVIGATION, defaultData);
      return defaultData;
    } catch (error) {
      console.error("读取导航数据失败:", error);
      console.log("Using default data as fallback");
      const defaultData = await this.createDefaultData();
      try {
        await this.setKVData(this.NAMESPACE.NAVIGATION, defaultData);
      } catch (e) {
        console.error("Failed to store default data:", e);
      }
      return defaultData;
    }
  }

  async writeFullData(fullData) {
    try {
      console.log("Writing navigation data to KV storage");
      
      // 写入到KV存储
      const success = await this.setKVData(this.NAMESPACE.NAVIGATION, fullData);
      if (success) {
        console.log("Successfully wrote navigation data to KV storage");
        return;
      } else {
        throw new Error("Failed to write to KV storage");
      }
    } catch (error) {
      console.error("写入导航数据失败:", error);
      throw new Error(`写入数据失败: ${error.message}`);
    }
  }

  async getSession(token) {
    try {
      console.log("Getting session for token:", token.substring(0, 10) + "...");
      
      // 首先从KV存储获取会话数据
      const sessionsData = await this.getKVData(this.NAMESPACE.SESSIONS, {});
      const sessionData = sessionsData[token];
      
      if (sessionData) {
        // 检查是否过期
        if (sessionData.expires && Date.now() > sessionData.expires) {
          // 删除过期会话
          delete sessionsData[token];
          await this.setKVData(this.NAMESPACE.SESSIONS, sessionsData);
          console.log("Session expired and removed from KV");
          return null;
        }
        console.log("Session found in KV storage");
        return sessionData.value;
      }
      
      console.log("Session not found");
      return null;
    } catch (error) {
      console.error("获取会话失败:", error);
      return null;
    }
  }

  async setSession(token, value, options = {}) {
    try {
      console.log("Setting session for token:", token.substring(0, 10) + "...");
      
      const sessionData = {
        value: value,
        expires: options && options.ttl ? Date.now() + (options.ttl * 1000) : null
      };
      
      // 获取现有会话数据
      const sessionsData = await this.getKVData(this.NAMESPACE.SESSIONS, {});
      sessionsData[token] = sessionData;
      
      // 存储到KV
      const success = await this.setKVData(this.NAMESPACE.SESSIONS, sessionsData, {
        ttl: this.SESSION_TTL
      });
      
      if (success) {
        console.log("Session stored in KV storage");
      } else {
        console.log("Failed to store session in KV, continuing anyway");
      }
      
      return;
    } catch (error) {
      console.error("设置会话失败:", error);
      throw new Error(`设置会话失败: ${error.message}`);
    }
  }

  getBaseUrl(request) {
    // 在 EdgeOne Pages中，从请求中获取域名
    if (request && request.url) {
      try {
        const url = new URL(request.url);
        return `${url.protocol}//${url.host}`;
      } catch (error) {
        console.error("Error parsing request URL:", error);
      }
    }
    
    // 备用方案：返回默认域名
    return "https://nav.itmax.cn";
  }

  async createDefaultData() {
    const DEFAULT_ADMIN_PASSWORD = "admin123";
    const { passwordHash, passwordSalt } = await this.hashPassword(DEFAULT_ADMIN_PASSWORD);
    
    // 使用实际的 navigation.json 中的数据作为默认配置
    const defaultData = {
      settings: {
        siteName: "Navs",
        siteLogo: "🎐",
        greeting: "",
        footer: "** LeoNavs ** 不断学习，不断尝试，不断进步！！",
        weather: {
          city: "杭州"
        }
      },
      apps: [
        {
          id: "f479451e-579d-4ca1-be9e-31bc7d708cae",
          name: "群晖QC",
          url: "https://mumupudding.quickconnect.cn/",
          description: "群晖quickconnect,其它自定义域名nas.itmax|ityet.cn|only.ydns.eu|igogo.dns.navy",
          icon: "🖥️"
        },
        {
          id: "e879451e-579d-4ca1-be9e-31bc7d708cae",
          name: "ITmax短链接",
          url: "https://dwz.ityet.com/",
          description: "ITyet短链接",
          icon: "🏠"
        },
        {
          id: "f779451e-579d-4ca1-be9e-31bc7d708cae",
          name: "Omnibox",
          url: "https://omni.ityet.com/",
          description: "电影动漫资源站，支持网盘搜索",
          icon: "🍿"
        }
      ],
      bookmarks: [
        {
          id: "bookmark-oschina",
          name: "开源中国",
          url: "https://www.oschina.net/",
          description: "聚焦开源信息与技术社区。",
          icon: "🌐",
          category: "技术社区"
        },
        {
          id: "bookmark-sspai",
          name: "少数派",
          url: "https://sspai.com/",
          description: "关注效率工具与生活方式的媒体。",
          icon: "📰",
          category: "效率与生活"
        },
        {
          id: "bookmark-zhihu",
          name: "知乎",
          url: "https://www.zhihu.com/",
          description: "问答与知识分享社区。",
          icon: "❓",
          category: "知识学习"
        }
      ],
      stats: { visitorCount: 0 },
      admin: { passwordHash, passwordSalt }
    };
    
    console.log("Created default data with admin password:", DEFAULT_ADMIN_PASSWORD);
    return defaultData;
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
    // 启动定期清理任务（在EdgeOne Pages中可能需要谨慎使用）
    if (typeof setInterval !== 'undefined') {
      // 每10分钟清理一次过期会话
      setInterval(() => {
        storage.cleanupExpiredSessions();
      }, 10 * 60 * 1000);
    }
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

async function handleNavigationProxy() {
  try {
    const externalUrl = "https://down.ityet.com:99/file/navigation.json";
    console.log("Proxying navigation data from:", externalUrl);
    
    const response = await fetch(externalUrl, {
      headers: {
        'User-Agent': 'SimPage-EdgeOne/1.0',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
    
    if (!response.ok) {
      console.error("External fetch failed:", response.status, response.statusText);
      return jsonResponse({
        success: false,
        message: `外部数据获取失败: ${response.status} ${response.statusText}`
      }, response.status);
    }
    
    const data = await response.json();
    console.log("Successfully proxied navigation data");
    
    return jsonResponse({
      success: true,
      data: data
    });
    
  } catch (error) {
    console.error("Navigation proxy error:", error);
    return jsonResponse({
      success: false,
      message: `代理请求失败: ${error.message}`
    }, 500);
  }
}

// =================================================================================
// Authentication Middleware
// =================================================================================

async function requireAuth(request, env) {
  const raw = request.headers.get("authorization");
  if (!raw || !raw.startsWith(AUTH_HEADER_PREFIX)) {
    console.log("No authorization header or invalid format");
    return jsonResponse({ success: false, message: "请登录后再执行此操作。" }, 401);
  }

  const token = raw.slice(AUTH_HEADER_PREFIX.length).trim();
  if (!token) {
    console.log("Empty token in authorization header");
    return jsonResponse({ success: false, message: "请登录后再执行此操作。" }, 401);
  }

  const storage = getStorage(env);
  const session = await storage.getSession(token);
  if (!session) {
    console.log("Session not found or expired for token:", token.substring(0, 10) + "...");
    
    return jsonResponse({ success: false, message: "登录状态已失效，请重新登录。" }, 401);
  }
  
  console.log("Session validated successfully for token:", token.substring(0, 10) + "...");
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

async function handleRequest(request, env, runtime, clientIp, context = null) {
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
          'Access-Control-Allow-Methods': "GET, POST, PUT, DELETE, OPTIONS",
          'Access-Control-Allow-Headers': "Content-Type, Authorization",
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
      return handleFetchLogo(request, env);
    }

    if (path === '/api/proxy/navigation' && method === 'GET') {
      return await handleNavigationProxy();
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

// EdgeOne Pages入口函数
export async function onRequest(context) {
  const { request, params, env } = context;
  
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
  return await handleRequest(request, env, "edgeone-pages", clientIp, context);
};

// Cloudflare Workers兼容性入口
export default {
  async fetch(request, env, ctx) {
    // 获取客户端 IP 地址
    let clientIp = 'unknown';
    
    clientIp = request.headers.get('cf-connecting-ip');
    if (!clientIp) {
      const forwardedFor = request.headers.get('x-forwarded-for');
      if (forwardedFor) {
        clientIp = forwardedFor.split(',')[0].trim();
      }
    }

    return await handleRequest(request, env, "cloudflare-workers", clientIp, { request, env, ctx });
  }
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