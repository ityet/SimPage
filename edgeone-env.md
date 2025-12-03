# EdgeOne 环境变量配置

## 必需的 KV 命名空间

为了使 SimPage 在 EdgeOne 上正常运行，需要配置以下 KV 命名空间：

### 1. SIMPAGE_DATA
- **用途**: 存储应用主要数据（设置、应用、书签等）
- **类型**: KV 存储
- **说明**: 用于存储 `data` 键下的完整应用配置

### 2. SESSIONS  
- **用途**: 存储用户登录会话令牌
- **类型**: KV 存储
- **说明**: 用于管理用户认证会话，支持 TTL 过期

## 配置方法

### 方法 1: 通过 EdgeOne 控制台配置
1. 登录 EdgeOne 控制台
2. 进入函数计算服务
3. 找到 SimPage 函数
4. 在环境变量配置中添加：
   ```
   SIMPAGE_DATA=your_kv_namespace_endpoint
   SESSIONS=your_sessions_kv_namespace_endpoint
   ```

### 方法 2: 通过配置文件配置
在函数部署配置中添加环境变量绑定。

### 方法 3: 通过全局对象配置
如果 EdgeOne 支持全局 KV 对象，代码会自动尝试使用 `globalThis.SIMPAGE_DATA` 和 `globalThis.SESSIONS`。

## 错误排查

如果出现 "Cannot read properties of undefined (reading 'get')" 错误：

1. **检查环境变量**: 确保 `SIMPAGE_DATA` 和 `SESSIONS` 环境变量已正确配置
2. **检查 KV 命名空间**: 确保对应的 KV 命名空间已创建并可访问
3. **检查权限**: 确保函数有访问 KV 命名空间的权限
4. **查看日志**: 检查函数运行日志，通常会有更详细的错误信息

## 数据初始化

首次运行时，如果 KV 存储为空，系统会自动创建默认数据结构：
- 默认管理员密码: `admin123`
- 默认城市: `北京`
- 空的应用和书签列表

建议首次登录后立即修改默认密码。