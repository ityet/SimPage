# EdgeOne 文件存储配置指南

## 存储架构

为了简化 EdgeOne 部署，SimPage 现在使用文件存储而不是 KV 存储：

### 1. 数据文件
- **文件**: `data/navigation.json`
- **用途**: 存储应用主要数据（设置、应用、书签等）
- **访问方式**: 通过 HTTP 请求读取

### 2. 会话存储
- **方式**: 内存存储
- **用途**: 临时存储用户登录会话令牌
- **说明**: 重启后会话会丢失，适合演示和简单部署

## 配置方法

### 步骤 1: 确保数据文件可访问
1. 确保 `data/navigation.json` 文件存在
2. 在 `edgeone.json` 中配置正确的重写规则：
   ```json
   {
     "source": "/data/*",
     "destination": "/data/:splat"
   }
   ```

### 步骤 2: 配置静态文件服务
确保 EdgeOne 能够提供以下静态文件：
- `/data/navigation.json` - 应用数据
- `/public/admin.html` - 管理页面
- `/public/index.html` - 主页面

## 文件访问方式

### 读取应用数据
```javascript
// 通过 fetch 读取数据文件
const response = await fetch('/data/navigation.json');
const data = await response.json();
```

### 会话管理
```javascript
// 使用内存存储管理会话
const sessions = new Map();

// 设置会话
sessions.set(token, 'active');

// 获取会话
const session = sessions.get(token);
```

## 数据文件格式

`data/navigation.json` 文件结构：
```json
{
  "settings": {
    "siteName": "SimPage",
    "siteLogo": "",
    "greeting": "",
    "footer": "欢迎来到我的主页",
    "weather": {
      "city": "北京"
    }
  },
  "apps": [...],
  "bookmarks": [...],
  "stats": {
    "visitorCount": 0
  },
  "admin": {
    "passwordHash": "...",
    "passwordSalt": "..."
  }
}
```

## 修改数据

### 方法 1: 直接编辑文件
1. 修改 `data/navigation.json` 文件
2. 重新部署

### 方法 2: 通过管理页面
1. 访问 `/admin` 页面
2. 使用默认密码 `admin123` 登录
3. 修改设置（修改会保存在内存中，重启后丢失）

## 限制说明

1. **只读数据**: 应用数据只能通过修改文件来更新
2. **临时会话**: 会话存储在内存中，重启后需要重新登录
3. **访客计数**: 访客计数不会持久化保存

## 错误排查

### 如果出现 "存储服务不可用，请检查配置" 错误：

1. **检查环境变量**: 确保 `SIMPAGE_DATA` 和 `SESSIONS` 环境变量已正确配置
2. **检查 KV 命名空间**: 确保对应的 KV 命名空间已创建并可访问
3. **检查权限**: 确保函数有访问 KV 命名空间的权限
4. **查看日志**: 检查函数运行日志，查看调试信息
5. **尝试不同命名**: 如果标准命名不工作，尝试 `SIMPAGE_DATA_KV` 和 `SESSIONS_KV`

### EdgeOne 特定配置步骤：

1. **创建 KV 命名空间**:
   - 在 EdgeOne 控制台中创建两个 KV 命名空间
   - 记录命名空间 ID

2. **配置函数环境变量**:
   - 进入函数计算 -> SimPage 函数
   - 在环境变量中添加：
     ```
     SIMPAGE_DATA=kv_namespace_id_for_data
     SESSIONS=kv_namespace_id_for_sessions
     ```

3. **绑定 KV 权限**:
   - 确保函数有读写这两个 KV 命名空间的权限
   - 可能需要在角色或策略中添加相关权限

4. **重新部署**:
   - 保存配置后重新部署函数

## 数据初始化

首次运行时，如果 KV 存储为空，系统会自动创建默认数据结构：
- 默认管理员密码: `admin123`
- 默认城市: `北京`
- 空的应用和书签列表

建议首次登录后立即修改默认密码。