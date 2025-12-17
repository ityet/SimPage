# EdgeOne CORS 问题解决方案

## 问题描述
在 EdgeOne 环境中，尝试从外部域名 `https://down.ityet.com:99/file/navigation.json` 获取数据时遇到 CORS 错误：
```
Access to fetch at 'https://down.ityet.com:99/file/navigation.json' from origin 'https://nav.itmax.cn' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## 根本原因
1. 浏览器端直接发起跨域请求被安全策略阻止
2. 外部服务器没有设置适当的 CORS 头部
3. 需要绕过浏览器的同源策略限制

## 🎯 **推荐的解决方案：服务端代理**

### 核心思路
**EdgeOne 函数作为代理**：服务端请求没有 CORS 限制，前端只访问本地 API

### 1. 后端代理实现

#### 新增代理API端点
```javascript
// /api/proxy/navigation - 专门代理外部数据
async function handleNavigationProxy() {
  const externalUrl = "https://down.ityet.com:99/file/navigation.json";
  const response = await fetch(externalUrl, {
    headers: {
      'User-Agent': 'SimPage-EdgeOne/1.0',
      'Accept': 'application/json',
    },
  });
  const data = await response.json();
  return jsonResponse({ success: true, data: data });
}
```

#### 修改文件读取策略
```javascript
async readFile(filePath) {
  try {
    // 优先从外部域名获取（EdgeOne服务端无CORS限制）
    const externalUrl = "https://down.ityet.com:99/file/navigation.json";
    const response = await fetch(externalUrl);
    
    if (response.ok) {
      const text = await response.text();
      console.log("Successfully fetched data from external URL");
      return text;
    }
  } catch (error) {
    console.log("External fetch failed, using fallback data");
  }
  
  // 外部获取失败时使用内置数据作为后备
  const defaultData = await this.createDefaultData();
  return JSON.stringify(defaultData);
}
```

### 2. 前端智能加载策略

#### 双重加载机制
```javascript
async function loadData() {
  let data;
  let useExternal = false;
  
  try {
    // 优先尝试代理API（外部数据）
    const proxyResponse = await fetch("/api/proxy/navigation");
    if (proxyResponse.ok) {
      const proxyResult = await proxyResponse.json();
      if (proxyResult.success) {
        data = proxyResult.data;
        useExternal = true;
      }
    }
  } catch (proxyError) {
    console.log("代理获取失败，尝试本地数据");
  }
  
  // 代理失败时使用本地API
  if (!data) {
    const localResponse = await fetch("/api/data");
    data = await localResponse.json();
  }
  
  // 应用数据到界面...
  console.log(useExternal ? "✅ 数据来源于外部" : "📦 数据来源于本地");
}
```

### 3. 路由配置更新

在 `edgeone.json` 中确保路由正确：
```json
{
  "rewrites": [
    {
      "source": "/api/proxy/*",
      "destination": "/node-functions/api/[[default]].js"
    },
    {
      "source": "/api/*", 
      "destination": "/node-functions/api/[[default]].js"
    }
  ]
}
```

## 🔄 **工作流程**

1. **页面加载** → 前端调用 `/api/proxy/navigation`
2. **EdgeOne代理** → 向 `https://down.ityet.com:99/file/navigation.json` 发起请求
3. **数据返回** → EdgeOne将数据转发给前端（无CORS问题）
4. **后备机制** → 如果外部请求失败，自动切换到本地数据

## 🎯 **其他可选方案**

### 方案A：外部服务器配置CORS
如果可以控制 `down.ityet.com` 服务器，添加CORS头部：
```nginx
add_header 'Access-Control-Allow-Origin' 'https://nav.itmax.cn';
add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
```

### 方案B：JSONP方式
如果外部服务器支持JSONP回调：
```javascript
function loadJSONP(url, callback) {
  const script = document.createElement('script');
  script.src = `${url}?callback=${callback.name}`;
  document.body.appendChild(script);
}
```

### 方案C：完全本地化
将数据完全存储在EdgeOne环境中（之前采用的方式）

## 🚀 **部署说明**

1. **部署EdgeOne函数**
   ```bash
   # 确保新的代理路由生效
   edgeone deploy
   ```

2. **更新前端文件**
   ```bash
   # 上传修改后的main.js
   edgeone upload public/scripts/main.js
   ```

3. **测试验证**
   - 打开浏览器开发者工具查看网络请求
   - 检查控制台日志："✅ 数据来源于外部" 或 "📦 数据来源于本地"
   - 验证外部数据更新是否能实时同步

## 📊 **技术优势对比**

| 方案 | CORS问题 | 性能 | 可靠性 | 实时性 | 推荐度 |
|------|----------|------|--------|--------|--------|
| 服务端代理 | ✅ 解决 | ⚡ 快速 | 🛡️ 高 | 🔄 实时 | ⭐⭐⭐⭐⭐ |
| 外部CORS配置 | ✅ 解决 | ⚡ 快速 | 🛡️ 高 | 🔄 实时 | ⭐⭐⭐ |
| 完全本地化 | ✅ 解决 | 🚀 最快 | 🛡️ 最高 | ❌ 延迟 | ⭐⭐ |

## 🎉 **推荐选择**

**服务端代理方案**是最佳选择：
- ✅ **彻底解决CORS**: 通过服务端绕过浏览器限制
- ⚡ **保持实时性**: 数据更新立即生效
- 🛡️ **高可靠性**: 外部失败时有本地后备
- 🔧 **易维护**: 前端代码简洁，后端逻辑集中

这个方案既解决了CORS问题，又保持了从外部获取数据的灵活性！