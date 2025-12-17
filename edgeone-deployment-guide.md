# EdgeOne Pages 部署指南

## 概述

本项目已完全适配 EdgeOne Pages，支持使用 KV 存储来管理导航数据和用户会话。

## 核心功能

### 1. KV 存储架构

- **navigation_data**: 存储导航配置（应用、书签、设置等）
- **session_data**: 存储用户登录会话
- **config_data**: 存储其他配置信息

### 2. 存储策略

- **KV 优先**: 首先从 KV 存储读取数据
- **外部数据源**: 如果 KV 为空，从外部 URL 获取数据并缓存到 KV
- **默认数据**: 如果外部数据也无法获取，使用内置默认配置
- **过期管理**: 自动清理过期会话（12小时TTL）

### 3. 兼容性

- **EdgeOne Pages**: 主要部署平台，完整 KV 支持
- **Cloudflare Workers**: 备用部署平台
- **本地开发**: 内存存储作为后备方案

## 部署步骤

### 1. 准备工作

1. 注册并登录 EdgeOne 控制台
2. 创建新的 Pages 项目
3. 配置域名（可选）

### 2. KV 命名空间配置

在 EdgeOne 控制台中：

1. 进入"KV存储"页面
2. 创建新的 KV 命名空间，命名为 `simpage-kv`
3. 绑定到函数，变量名设为 `KV_NAMESPACE`

### 3. 部署代码

#### 方式1：EdgeOne 控制台部署

1. 上传项目文件到 EdgeOne Pages
2. 确保函数代码在 `node-functions/api/[[default]].js`
3. 配置函数运行时为 Node.js 18.x

#### 方式2：使用 CLI 部署

```bash
# 安装 EdgeOne CLI
npm install -g @tencent-cloud/edgeone-cli

# 登录
eo login

# 部署
eo pages deploy
```

### 4. 环境变量配置

在 EdgeOne 控制台中设置以下环境变量：

- `NODE_ENV`: production
- `ENVIRONMENT`: edgeone-pages

### 5. 验证部署

访问部署后的域名，检查：

1. 主页是否能正常加载
2. API 接口是否响应正常
3. 登录功能是否工作
4. 数据修改是否能保存

## API 接口

### 认证相关

- `POST /api/login` - 用户登录
- `PUT /api/admin/password` - 修改密码

### 数据获取

- `GET /api/data` - 获取导航数据（公开）
- `GET /api/admin/data` - 获取完整数据（需认证）
- `GET /api/weather` - 获取天气信息
- `GET /api/proxy/navigation` - 代理获取外部导航数据

### 数据管理

- `PUT /api/data` - 更新导航数据（需认证）
- `GET /api/fetch-logo` - 获取网站图标（需认证）

## 数据管理

### 导航数据结构

```json
{
  "settings": {
    "siteName": "网站名称",
    "siteLogo": "网站图标",
    "greeting": "欢迎语",
    "footer": "页脚信息",
    "weather": {
      "city": "城市名称"
    }
  },
  "apps": [
    {
      "id": "唯一ID",
      "name": "应用名称",
      "url": "应用链接",
      "description": "描述",
      "icon": "图标"
    }
  ],
  "bookmarks": [
    {
      "id": "唯一ID",
      "name": "书签名称",
      "url": "书签链接",
      "description": "描述",
      "icon": "图标",
      "category": "分类"
    }
  ],
  "stats": {
    "visitorCount": 0
  },
  "admin": {
    "passwordHash": "密码哈希",
    "passwordSalt": "密码盐"
  }
}
```

### 会话管理

- 会话存储在 KV 中，自动过期
- 支持多设备同时登录
- 定期清理过期会话

## 性能优化

### 1. KV 缓存策略

- 数据读取优先从 KV 获取
- 写入操作同时更新 KV 和内存缓存
- 设置合理的 TTL 避免数据过期

### 2. 外部数据源

- 支持从外部 URL 获取初始数据
- 数据获取失败时自动降级到默认配置
- 支持数据热更新，无需重启服务

### 3. 错误处理

- 完善的错误处理机制
- 优雅降级策略
- 详细的日志记录

## 监控和日志

### 1. 日志级别

- `INFO`: 正常操作日志
- `WARN`: 警告信息
- `ERROR`: 错误信息

### 2. 监控指标

- API 响应时间
- KV 操作成功率
- 会话创建和清理频率
- 外部数据源可用性

## 安全考虑

### 1. 认证机制

- Token-based 认证
- PBKDF2 密码哈希
- 会话自动过期

### 2. 数据安全

- 敏感数据加密存储
- HTTPS 强制传输
- CORS 跨域控制

### 3. 访问控制

- 管理接口需认证
- 公开接口访问限制
- IP 地址记录

## 故障排除

### 常见问题

1. **KV 连接失败**
   - 检查 KV 命名空间配置
   - 验证绑定变量名
   - 确认权限设置

2. **数据无法保存**
   - 检查 KV 写入权限
   - 验证数据格式
   - 查看 TTL 设置

3. **登录功能异常**
   - 检查会话存储
   - 验证密码哈希
   - 确认 Token 生成

### 调试方法

1. 使用 EdgeOne 控制台查看日志
2. 使用浏览器开发者工具检查网络请求
3. 使用 Postman 测试 API 接口

## 更新维护

### 版本更新

1. 备份当前 KV 数据
2. 更新代码文件
3. 部署新版本
4. 验证功能正常

### 数据迁移

1. 导出现有数据
2. 转换数据格式
3. 导入到新存储
4. 验证数据完整性

## 技术支持

如遇到问题，请：

1. 查看本文档的故障排除部分
2. 检查 EdgeOne 官方文档
3. 联系技术支持团队

---

**注意**: 本项目需要 EdgeOne Pages 支持的运行时环境，请确保部署环境符合要求。