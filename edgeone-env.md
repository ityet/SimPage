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

### 方法 1: 通过 EdgeOne 控制台配置（推荐）
1. 登录 EdgeOne 控制台
2. 进入函数计算服务
3. 找到 SimPage 函数
4. 在函数配置中添加环境变量：
   ```
   SIMPAGE_DATA=your_kv_namespace_id
   SESSIONS=your_sessions_kv_namespace_id
   ```

**注意**: EdgeOne 可能使用 KV 命名空间 ID 而不是端点地址。

### 方法 2: EdgeOne 特有命名格式
如果标准命名不工作，尝试：
```
SIMPAGE_DATA_KV=your_kv_namespace_id
SESSIONS_KV=your_sessions_kv_namespace_id
```

### 方法 3: 全局对象配置
如果 EdgeOne 支持全局 KV 对象，代码会自动尝试使用：
- `globalThis.SIMPAGE_DATA`
- `globalThis.SESSIONS`
- `globalThis.kv.SIMPAGE_DATA`
- `globalThis.kv.SESSIONS`

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