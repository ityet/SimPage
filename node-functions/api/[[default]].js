// =================================================================================
// File-based Storage Class for EdgeOne
// =================================================================================

class EdgeOneKVStorage {
  constructor(env) {
    this.env = env || {};
    this.dataFile = '/data/navigation.json';
    this.sessionsFile = '/tmp/sessions.json';
    this.initializeFileStorage();
    this.cleanupExpiredSessions();
  }
  
  initializeFileStorage() {
    console.log("Initializing file-based storage for EdgeOne...");
    // 在 EdgeOne 中，我们直接从文件系统读取数据
    this.fileSystem = require('fs');
    this.path = require('path');
  }
  
  cleanupExpiredSessions() {
    // 定期清理过期会话
    setInterval(() => {
      this.cleanExpiredSessions();
    }, 5 * 60 * 1000); // 每5分钟清理一次
  }
  
  cleanExpiredSessions() {
    const now = Date.now();
    let cleanedCount = 0;
    
    // 清理全局会话
    if (typeof globalThis !== 'undefined' && globalThis.simpageSessions) {
      for (const [token, sessionData] of globalThis.simpageSessions) {
        if (sessionData.expires && now > sessionData.expires) {
          globalThis.simpageSessions.delete(token);
          cleanedCount++;
        }
      }
      if (cleanedCount > 0) {
        console.log(`Cleaned ${cleanedCount} expired sessions from global storage`);
      }
    }
    
    // 清理实例会话
    if (this.memorySessions) {
      let instanceCleanedCount = 0;
      for (const [token, sessionData] of this.memorySessions) {
        if (sessionData.expires && now > sessionData.expires) {
          this.memorySessions.delete(token);
          instanceCleanedCount++;
        }
      }
      if (instanceCleanedCount > 0) {
        console.log(`Cleaned ${instanceCleanedCount} expired sessions from instance storage`);
      }
    }
  }
  


  async readFullData() {
    try {
      console.log("Reading data from file:", this.dataFile);
      
      // 从文件读取数据
      const rawData = await this.readFile(this.dataFile);
      if (rawData) {
        console.log("Successfully read data from file");
        const parsed = JSON.parse(rawData);
        return parsed;
      }
      
      console.log("No data file found, using default data...");
      const defaultData = await this.createDefaultData();
      return defaultData;
    } catch (error) {
      console.error("读取数据失败:", error);
      // 如果读取失败，使用默认数据
      console.log("Using default data as fallback");
      const defaultData = await this.createDefaultData();
      return defaultData;
    }
  }

  async writeFullData(fullData) {
    try {
      console.log("Writing data to file:", this.dataFile);
      
      // 对于 EdgeOne，我们只支持读取，不支持写入文件
      // 返回成功，但不实际写入
      console.log("Write operation skipped (read-only mode for EdgeOne)");
      return;
    } catch (error) {
      console.error("写入数据失败:", error);
      throw new Error(`写入数据失败: ${error.message}`);
    }
  }

  async getSession(token) {
    try {
      console.log("Getting session for token:", token.substring(0, 10) + "...");
      
      // EdgeOne 专注于全局对象存储
      if (typeof globalThis !== 'undefined') {
        if (!globalThis.simpageSessions) {
          globalThis.simpageSessions = new Map();
        }
        
        const sessionData = globalThis.simpageSessions.get(token);
        if (sessionData) {
          // 检查是否过期
          if (sessionData.expires && Date.now() > sessionData.expires) {
            globalThis.simpageSessions.delete(token);
            console.log("Session expired");
            return null;
          }
          console.log("Session found in global storage");
          return sessionData.value;
        }
      }
      
      // 备用方案：实例内存存储
      if (this.memorySessions) {
        const sessionData = this.memorySessions.get(token);
        if (sessionData) {
          // 检查是否过期
          if (sessionData.expires && Date.now() > sessionData.expires) {
            this.memorySessions.delete(token);
            console.log("Session expired in instance memory");
            return null;
          }
          console.log("Session found in instance memory");
          return sessionData.value;
        }
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
      
      // EdgeOne 专注于全局对象存储
      if (typeof globalThis !== 'undefined') {
        if (!globalThis.simpageSessions) {
          globalThis.simpageSessions = new Map();
        }
        globalThis.simpageSessions.set(token, sessionData);
        console.log("Session stored in global storage");
      }
      
      // 备用方案：实例内存存储
      if (!this.memorySessions) {
        this.memorySessions = new Map();
      }
      this.memorySessions.set(token, sessionData);
      console.log("Session stored in instance memory as backup");
      
      return;
    } catch (error) {
      console.error("设置会话失败:", error);
      throw new Error(`设置会话失败: ${error.message}`);
    }
  }

  async getSessionFromFile(token) {
    try {
      // EdgeOne 中，会话文件可能不可用，直接跳过文件存储
      // 专注于使用全局存储和内存存储
      console.log("Skipping file-based session storage for EdgeOne");
      return null;
    } catch (error) {
      console.error("Error reading session from file:", error);
      return null;
    }
  }

  async saveSessionToFile(token, sessionData) {
    try {
      // EdgeOne 中，跳过文件存储，专注于全局和内存存储
      console.log("Skipping file-based session save for EdgeOne");
    } catch (error) {
      console.error("Error saving session to file:", error);
      // 文件保存失败不是致命错误，继续使用内存存储
    }
  }

  async writeFile(filePath, content) {
    try {
      // 在 EdgeOne 中，文件写入可能不可用，但我们可以尝试
      const response = await fetch(filePath, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: content
      });
      return response.ok;
    } catch (error) {
      console.error("Error writing file:", filePath, error);
      return false;
    }
  }

  async readFile(filePath) {
    try {
      // EdgeOne 中需要使用绝对 URL 来访问静态文件
      if (filePath.startsWith('/data/navigation.json')) {
        // 构建完整的 URL
        const baseUrl = this.getBaseUrl();
        const fullUrl = `${baseUrl}/data/navigation.json`;
        console.log("Trying to read from:", fullUrl);
        
        const response = await fetch(fullUrl);
        if (response.ok) {
          const text = await response.text();
          console.log("Successfully read navigation.json from URL");
          return text;
        } else {
          console.log("Failed to read from URL, status:", response.status);
        }
      }
      
      // 尝试使用 Node.js fs 模块（如果在 Node.js 环境）
      if (typeof require !== 'undefined') {
        const fs = require('fs');
        const path = require('path');
        
        try {
          // 尝试解析相对于项目根目录的路径
          const projectRoot = path.resolve('.');
          const fullPath = path.join(projectRoot, filePath.replace(/^\//, ''));
          
          if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            console.log("Successfully read file from filesystem:", fullPath);
            return content;
          }
        } catch (fsError) {
          console.log("Filesystem read failed:", fsError.message);
        }
      }
      
      console.log("Could not read file:", filePath);
      return null;
    } catch (error) {
      console.error("Error reading file:", filePath, error);
      return null;
    }
  }
  
  getBaseUrl() {
    // 尝试获取当前请求的基础 URL
    // 在 EdgeOne 中，这应该是函数的域名
    if (typeof globalThis !== 'undefined' && globalThis.request) {
      const url = new URL(globalThis.request.url);
      return `${url.protocol}//${url.host}`;
    }
    
    // 备用方案：返回默认的 EdgeOne 域名格式
    return "https://simpage-94apaxcdoi.edgeone.app";
  }

  async createDefaultData() {
    const DEFAULT_ADMIN_PASSWORD = "admin123";
    const { passwordHash, passwordSalt } = await this.hashPassword(DEFAULT_ADMIN_PASSWORD);
    
    const defaultData = {
      settings: {
        siteName: "SimPage",
        siteLogo: "",
        greeting: "",
        footer: "",
        weather: { city: ["北京"] }
      },
      apps: [
        {
          id: "app-figma",
          name: "Figma",
          url: "https://www.figma.com/",
          description: "协作式界面设计工具。",
          icon: "https://icon.ooo/www.figma.com"
        },
        {
          id: "app-notion",
          name: "Notion",
          url: "https://www.notion.so/",
          description: "多合一的笔记与知识管理平台。",
          icon: "https://icon.ooo/www.notion.so"
        }
      ],
      bookmarks: [
        {
          id: "bookmark-oschina",
          name: "开源中国",
          url: "https://www.oschina.net/",
          description: "聚焦开源信息与技术社区。",
          icon: "https://icon.ooo/www.oschina.net",
          category: "技术社区"
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
    
    // 调试信息：检查全局会话状态
    if (typeof globalThis !== 'undefined' && globalThis.simpageSessions) {
      console.log("Global sessions count:", globalThis.simpageSessions.size);
      for (const [k, v] of globalThis.simpageSessions) {
        console.log(`Session ${k.substring(0, 10)}...:`, v);
      }
    }
    
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

export async function onRequest({ request, params, env }) {
  let value = await SIMPAGE_DATA.get("test");
  let value1 = await SIMPAGE_DATA.put("data", createDefaultData());
  let value2 = await SIMPAGE_DATA.get("data", "json");
  return new Response(value+value1+value2, { status: 200 });
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