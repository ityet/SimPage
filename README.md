<p align="center">
  <img src="./public/simpage-logo.svg" alt="SimPage Logo" width="160" />
</p>

# SimPage · 现代化导航页

一个集成时间问候、天气信息、智能搜索，以及应用与书签快捷入口的现代化导航页示例。项目基于 **EdgeOne Makers** 构建：静态资源 + Edge Functions（V8 运行时）+ KV 存储，提供后台编辑页面，便于轻量快速地部署与管理。

## 功能特性

- **概览区域**：展示当前时间、日期、问候语及实时天气信息，并提供全局搜索入口，支持亮暗主题切换并可随系统主题自动切换。
- **应用与书签分区**：两大模块采用自适应 4-5 列网格排布，支持自由缩放，卡片包含图标、名称与描述信息。
- **后台编辑页面**：无需额外数据库，通过后台页面即可新增、修改或删除应用与书签条目。
- **后台权限控制**：后台页面需密码登录（默认密码 `admin123`），密码以 PBKDF2 哈希形式存储，可随时在后台修改。
- **站点信息配置**：可在后台设置网站名称、Logo、自定义问候语以及书签分类，前台实时同步展示。
- **开放天气服务**：使用完全免费的 Open-Meteo API 获取天气信息，无需注册和 API Key，后台直接填写城市名称即可，可输入多个城市以空格隔开，首页间隔 5 秒滚动显示。
- **书签分类可配置**：在后台用 `|` 分隔集中配置分类（如 `技术社区|实用工具|知识学习`）。该列表既是录入书签时的候选项（仍可临时输入未列出的分类），也决定**前台书签分组的展示顺序**；未列出的分类排在最后。未配置时自动回退为「从现有书签推导并按名称排序」的旧行为。
- **KV 数据存储**：导航数据、管理员凭据与访客计数保存在 EdgeOne Makers KV 中，确保高性能与高可用性。
- **浏览器扩展**：`extension/` 内置 Chrome/Edge 扩展（Manifest V3），点一下工具栏图标即可把当前网页存为书签，自动带出标题、地址与图标。详见 [`extension/README.md`](./extension/README.md)。
- **图标库选择**：后台编辑与扩展弹窗均内置图标选择器，除「自动获取」站点图标外，还可从 **彩色 Emoji**（自托管的 Twemoji 图形，Unicode 官方分组 1914 个，带中文名与关键词，可直接搜索）中下拉选择。数据由 `tools/build-icon-library.mjs` 从上游生成（详见 [`extension/README.md`](./extension/README.md) 的「图标库数据」「第三方数据」小节），重新生成命令：`node tools/build-icon-library.mjs`。
  - **图标体自托管**：彩色 emoji 的 SVG 体**落盘在本仓库** `public/icons/twemoji/`（构建期从 `@iconify-json/twemoji@1.2.5` 生成，共 1914 个文件 / 约 3.3MB），运行时 URL 是我们自己域名的静态文件（`/icons/twemoji/<slug>.svg`），**没有任何外部 CDN 依赖**。彩色 emoji 在产物里只存 **slug**（由 CLDR 英文注释生成），URL 现拼，避免数据文件从 KB 级涨到 MB 级。⚠️ `public/icons/` 是**构建产物但必须随仓库提交**（部署要用）。
  - **图标批次（v5，首屏提速的关键）**：选择器每屏渲染 120 项，若逐项请求 `/icons/twemoji/x.svg` 就是 **120 个请求**；而 EdgeOne Makers **只走 HTTP/1.1**（同域最多 6 并发），实测首屏要 4.4s 才全部解码、重载后复访（静态资源带 `max-age=0,must-revalidate`）反而更慢到 8.4s。因此构建期把图标体按 **128 个一批**整包内联成 `public/data/emoji-batches/<n>.json`，选择器只取当前屏需要的那一批，用 `data:image/svg+xml,<encodeURIComponent(svg)>` 喂给 `<img>` —— 首屏从 120 个请求降到 **1 个**，且浏览器按批次缓存，往下滚才按需补拉。
    - 为什么是 `encodeURIComponent` 而不是 base64：整批传输体积才是成本。实测 `0.json` 226KB → gzip **47.9KB（21%）**；而 120 个独立 SVG 单文件 gzip 率是 **64%**（小文件拿不到共享字典）→ 合并后传输体积约减半。base64 还会把文本变成随机字符，brotli 压不动。
    - ⚠️ 批次**路径刻意不写进数据产物**（写了 `public/data/icon-library.json` 与 `extension/lib/icon-data.js` 的 JSON 主体就不再逐字节一致），由宿主用 `batchBase` 传入；缺省会从 `libraryUrl` 的目录推导。扩展侧传 `chrome.runtime.getURL("lib/emoji-batches")`（批次随扩展包分发，扩展页 fetch 自己的资源**同源，无需 host 权限**）。
    - 数据无 `emoji.batching`（老产物）或拿不到 `batchBase` 时**自动退回**逐图 URL，不会空白。
  - **为什么不再用 Iconify 公共 API**：曾计划把宿主统一到 `https://api.iconify.design`，但实测它有约 **60 请求 / 5 分钟 / 每 IP** 的限额（两组独立测量互相印证）；选择器网格每批就是 120 个请求，一次即超额，429 的响应体不是图片 → `<img>` 被浏览器拒渲染（`ERR_BLOCKED_BY_ORB`），须等约 5 分钟回填。于是改为自托管，彻底离开运行时外部依赖。
  - **数据源注意**：CLDR 的 key 不带变体选择符 U+FE0F（而 emoji 常带），需按基础码点建索引；中文名必须合并主注释与派生注释两个包（只用主包覆盖率仅 83%，缺的 326 条 —— 旗帜 262 + 卷发/红发等 ZWJ 组合 61 + 按键符号 3 —— 全在派生包；且两包外层结构不同，取值需兼容）；emoji 的 slug 由 CLDR **英文**注释按固定规则表生成。详见「生成时的五条硬约束」。
- **响应式与毛玻璃视觉**：延续灰白极简风格与毛玻璃效果，在桌面与移动端均有优秀的浏览体验。

## 品牌视觉

- 仓库内提供了 `public/simpage-logo.svg` 作为轻量级的 SimPage 品牌 Logo，顶部展示的图标即来源于该文件。
- 部署时可直接复用该 Logo，或在此基础上调整配色与排版以匹配自有品牌。

## 目录结构

```
├── edge-functions/
│   └── api/
│       └── [[default]].js    # Edge Function（V8）：托管 /api/* 全部接口
├── public/                   # 静态资源目录（构建输出根目录）
│   ├── index.html            # 前台导航页
│   ├── admin.html            # 后台编辑页（经 /admin 重写访问）
│   ├── styles.css
│   ├── simpage-logo.svg
│   ├── data/                 # 静态数据（默认导航数据、城市列表、图标库 icon-library.json）
│   │   └── emoji-batches/    # 【构建产物，须提交】图标批次：15 个 JSON，每批 128 个图标整包内联为 data URI
│   ├── icons/                # 【构建产物，须提交】自托管图标体：twemoji/ 1914 个 SVG
│   └── scripts/              # 前台 / 后台脚本（含共用图标选择器 icon-picker.js）
├── tools/                    # 构建脚本（build-icon-library.mjs：生成图标库数据、自托管图标体、图标批次与选择器产物）
├── edgeone.json              # EdgeOne Makers 项目配置
├── extension/                # Chrome / Edge 浏览器扩展（Manifest V3，不参与站点部署）
├── .env.example              # 环境变量示例（KV 非环境变量，见文件内说明）
├── legacy/                   # 历史方案（Cloudflare Workers / Docker / Node 服务器）
└── README.md
```

## 快速开始（EdgeOne Makers · 推荐）

### 1. 安装 EdgeOne CLI

```bash
npm install -g edgeone
```

### 2. 配置 KV 命名空间（控制台三步）

Edge Functions 的数据持久化依赖 **KV Storage**。请在 EdgeOne Makers 控制台完成：

1. **启用 KV**：进入「存储 → KV」，为账号启用 KV Storage（若尚未启用）。
2. **创建命名空间**：新建一个命名空间，例如 `simpage-kv`。
3. **绑定到项目**：在项目 `simpage` 的绑定设置里，将该命名空间绑定为变量，**「变量名」必须填 `KV`**。

> 说明：绑定后，代码中以**全局变量 `KV`** 直接访问（`KV.get` / `KV.put` / `KV.delete` / `KV.list`），它**不在** `context.env` 上。
> 切勿把命名空间名当成环境变量字符串（如 `SIMPAGE_DATA: "simpage-kv"`）——那只是字符串，不会变成可用的 KV 句柄。
> 未绑定或本地未 link 时，函数会**优雅降级**到进程内内存兜底：接口仍返回 `200`，响应中的 `storage` 字段会显示 `memory-fallback`（长期运行请务必绑定 KV）。

### 3. 本地开发

```bash
edgeone makers dev --name simpage --skip-env-sync
```

- 前台导航页：`http://127.0.0.1:8088/`
- 后台编辑页：`http://127.0.0.1:8088/admin.html`

> 后台首次登录请使用默认密码 `admin123`。
> 本地开发请使用 `/admin.html`；`/admin` 短链在本地会返回 404（原因见下节「路由与访问路径说明」）。

### 4. 部署

通过 EdgeOne Makers 控制台或 CLI 部署本项目。静态资源由 `public/` 提供，Edge Function 由平台按 `/api/*` 自动挂载，无需额外路由配置。

## 路由与访问路径说明（重要）

后台编辑页存在两个地址，行为不同，请务必区分：

| 地址 | 依赖机制 | 本地（`edgeone makers dev`） | 线上 |
|------|----------|------------------------------|------|
| `/admin.html` | 静态文件，无路由依赖 | ✅ 可访问 | ✅ 可访问 |
| `/admin` | `edgeone.json` 的 rewrite 规则（`/admin` → `/admin.html`） | ❌ 返回 404 | ✅ 生效 |

- **后台编辑页的直接可用地址是 `/admin.html`**，本地与线上都已确认可访问，后台功能不受影响。
- **`/admin` 短链依赖 `edgeone.json` 中的 rewrite 规则**（`{ "source": "/admin", "destination": "/admin.html" }`，沿用项目既有做法）。该规则**在线上生效**，但 `edgeone makers dev` 本地开发服务器**不应用 rewrites**（实测：放入探针 rewrite 后对应路径均返回 404，与 destination 写法无关），因此**本地访问 `/admin` 会返回 404 —— 这是预期行为，不是 bug**。本地调试请使用 `/admin.html`；`/admin` 只能等部署后在线上确认。

> 以下三条替代方案均已实测并**排除**，记录于此以免后人重复踩坑：
>
> 1. **`middleware.js` 透明重写（已移除）**：EdgeOne Makers Middleware 可被 dev server 加载（日志 `✅ Middleware loaded successfully`），但 CLI（1.6.17-beta.1 与 1.6.41 均复现）的 dev middleware 执行器存在缺陷，**每个请求**都会抛出 `TypeError: Cannot read properties of undefined (reading 'fetch')`（`at ... executeMiddleware`）。dev 下该异常被吞掉但日志被刷屏，且该异常位于执行器内部、`/api/*` 也在其执行路径上，**存在线上把整站打成 500 的风险**，风险收益不成立，故弃用。
> 2. **静态目录索引（`public/admin/index.html`）**：dev server 会把目录路径当文件读取，访问时抛 `EISDIR: illegal operation on a directory, read` 并**导致进程崩溃**，不可用。
> 3. **依赖 dev server 验证 rewrite**：如上，dev server 不应用 `edgeone.json` 的 rewrites，此路不通。

## API 一览

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| `POST` | `/api/login` | 校验密码并签发会话 token | 否 |
| `GET` | `/api/data` | 前台读取导航数据（并递增访客计数） | 否 |
| `GET` | `/api/weather` | 按配置城市查询天气（Open-Meteo） | 否 |
| `GET` | `/api/admin/data` | 后台读取完整数据 | 是 |
| `PUT` | `/api/admin/data` | 后台保存导航数据 | 是 |
| `PUT` | `/api/data` | 同 `/api/admin/data`（旧端点，兼容保留） | 是 |
| `POST` | `/api/admin/password` | 修改管理员密码 | 是 |
| `POST` | `/api/fetch-logo` | 调用 `favicon.yy.luler.top` 抓取站点图标，返回 `faviconUrl` 与站点标题/描述 | 是 |
| `POST` | `/api/bookmarks` | 追加**单条**书签（供浏览器扩展等外部客户端使用） | 是 |

鉴权方式：请求头 `Authorization: Bearer <token>`，token 由登录接口返回（32 位十六进制，有效期 12 小时）。

`POST /api/bookmarks` 请求体为单条书签（字段与后台一致）：

```jsonc
{
  "name": "开源中国",          // 必填
  "url": "https://www.oschina.net/",  // 必填，无协议时自动补 https://
  "description": "",          // 可选
  "icon": "✈️",               // 可选：emoji 或图片地址
  "category": "技术社区"        // 可选，建议取自 settings.categories
}
```

成功返回 `{ success: true, item, total, storage }`（`item` 为落库后的完整条目，含服务端生成的 `id`）。

**为什么单独开一个端点**：此时若复用 `PUT /api/admin/data`，外部客户端必须先拉全量（约 57KB）再整体覆盖写回，任何一次并发编辑都会被冲掉。本端点把写入面收敛到一条书签。

按 `url` **查重**（补全协议、host/path 小写、忽略末尾斜杠与 `#`，保留 query 与端口）：命中已有条目时返回 **409** `{ success: false, duplicate: true, message, item }`，`item` 是已存在的那条，便于客户端提示「已在书签中」。

> 已知限制：KV 无原子 CAS，同一瞬间的并发追加仍可能互相覆盖（个人导航页的写入频率下可接受，未引入分布式锁）。

`/api/fetch-logo` 默认只返回 `faviconUrl`（响应约 200B）；若需要自包含、不依赖对方站点 `/favicon.ico` 可达的 base64 data URI，加查询参数 `?includeFavicons=1`，会额外返回筛选后的 `favicons` 映射（16/32/64/128/256 五档，整包约 55KB，256 档单档约 33KB）。

该接口依赖的上游是**香港的一台小型 VPS**，跨境链路拥塞时会失败（实测单次耗时从 1s 波动到 9.5s+，偶发整体超时）。因此：

- 上游失败时**降级兜底**：改用站点自身的 `<origin>/favicon.ico`，响应为 `{ success: true, degraded: true, reason, faviconUrl, message }`，前端会填入图标并在弹窗里标注「已按站点自身地址填入」；只有连站点地址都推导不出来时才硬失败。
- **地址本身不可用**（不兜底，直接 400 `invalid-target`）有两种来源：① 上游返回 4xx，明确拒收该地址；② 上游返回 5xx，但错误指向**目标站点本身不可达**——上游是 Go 写的，会把**连接层**（`dial tcp`：域名解析失败、连接被拒、连接超时、路由不可达）与 **TLS 层**（`tls:` / `x509:`：证书过期、自签证书不可信）故障也塞进 5xx。此时兜底填入的 `<origin>/favicon.ico` 会被浏览器以相同原因拒绝加载，故一并归为「地址无效或无法访问」。反之，目标站点**可达**但抓取失败（`Website returned status code: 404`、`context deadline exceeded`）仍走降级兜底。
- 所有失败响应都带 `reason` 码，便于区分「图标服务的问题」与「链接填错了」：`upstream-unreachable` / `upstream-timeout` / `upstream-scrape-failed` / `invalid-target` / `url-too-long` / `empty-url` / `no-favicon`。
- 上游返回的 `faviconUrl` 会过一次白名单（仅 `http(s)://` 或 `data:image/`），其余一律退回按站点 origin 推导，避免第三方返回的畸形协议被写进 KV。
- 上游超时为 25s（原先 12s 会误杀"慢但成功"的请求）。

## KV 键位说明

| Key | 内容 | 说明 |
|-----|------|------|
| `data_navigation` | `{ settings, apps, bookmarks }` | 导航数据主体 |
| `data_admin` | `{ passwordHash, passwordSalt, iterations }` | 管理员凭据，与导航数据分键存储 |
| `stats_visitor_count` | 数字字符串 | 访客计数 |
| `session_<tokenHex>` | `{ expires, value }` | 会话，一会话一键；登录时顺带清理过期会话 |

> KV 键只允许字母、数字与下划线；KV **无 TTL**，会话过期由 `expires` 字段自行判定与清理。

## 数据管理

- 首次运行时，若 KV 为空，函数会自动写入内置默认导航数据与默认管理员密码（`admin123`）。
- 所有数据（导航内容、后台密码）均可通过后台页面管理与修改。
- 默认站点配置以 `public/data/navigation.json` 为准（`siteName: Navs`、`siteLogo: 🎐`、默认城市 `杭州`、默认分类 `技术社区 / 实用工具 / 知识学习`）。
- `settings.categories` 为**字符串数组**，读写两侧使用同一套规范化规则：接受数组或 `|` 分隔的字符串（兼容全角竖线 `｜`、逗号、换行），逐项 trim 后按大小写不敏感去重、保留首次出现的原形，单项上限 24 字符、总量上限 30 个。
- 对「字段缺失」有特意区分：`null` / 不存在（老数据）视为**从未配置**，回退到默认分类；显式的**空数组**表示管理员主动清空，予以尊重（此时前台回到「按数据出现顺序」分组）。

## 历史方案

Cloudflare Workers（`worker.js` / `wrangler.toml`）、Node.js 服务器（`server.js`）、Docker（`Dockerfile` / `docker-compose.yml`）等早期部署方式已归档到 `legacy/`，仅作回溯参考，不再是推荐路径。
