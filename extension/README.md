# SimPage 快速添加（Chrome / Edge 扩展）

点一下浏览器工具栏上的图标，把当前网页存成 SimPage 导航页的书签 —— 自动带出标题、地址与图标，可先在弹窗里改名称、描述、分类。

Manifest V3，无构建步骤，纯静态文件。

## 安装（加载已解压的扩展）

1. 打开 `chrome://extensions/`（Edge 为 `edge://extensions/`）
2. 右上角打开 **开发者模式**
3. 点 **加载已解压的扩展程序**，选择本目录（`extension/`）
4. 工具栏会出现 SimPage 图标（可固定到显眼位置）

> 也可以把本项目里的 `extension/` 目录打包成 zip 分发，对方解压后按上面三步加载。

## 首次配置

1. 点扩展图标 → 右上角齿轮 ⚙，或直接在扩展管理页点「扩展程序选项」
2. 填写：
   - **站点地址**：你的 SimPage 域名，如 `https://nav.itmax.cn`（带 `/admin` 之类的路径会自动去掉）
   - **管理员密码**：与后台登录同一个密码
   - **默认分类**（可选）：添加书签时预填的分类
3. 点「保存并测试连接」—— 会真实登录一次，成功后提示读到多少个应用 / 书签 / 分类候选

## 使用

1. 在任意网页点一下工具栏的 SimPage 图标
2. 弹窗自动带出网页标题、地址、描述与图标；按需修改（分类有下拉候选，也可手输新分类）
3. 点「保存到 SimPage」，刷新导航页即可看到

标题或描述缺失时，可点「自动补全」调用站点自带的图标服务（`POST /api/fetch-logo`）抓取。

## 图标选择

弹窗里的「图标」字段支持三类来源，任选其一：

| 方式 | 说明 |
|---|---|
| 自动获取 | 点「自动补全」调站点图标服务抓取站点图标，或点同行的「自动获取」按钮（管理后台内） |
| Emoji | 点「选择图标」→ 切到 **Emoji** 页，按中文名 / 关键词 / emoji 字符搜索（如「书签」「收藏」）。页内还有 **「字符 \| 彩色」** 两种渲染样式（见下） |
| Bootstrap 图标 | 点「选择图标」→ 切到 **Bootstrap 图标** 页，按中文别名 / 英文名 / 关键词搜索（如「闹钟」「bookmark」） |

- 也可以不点按钮，直接在输入框里手输 emoji 或图片 URL。
- 选择器支持分类筛选、关键词搜索（空格分隔多词为 AND）、方向键移动 + 回车选中、`Esc` 关闭，并有「清除图标」。
- **打开时的默认页签 / 样式**由当前值决定（`detectIconKind`，纯函数、可单测）：

  | 当前值 | 默认页签 | 默认样式 |
  |---|---|---|
  | 含 `/icons/twemoji/` 或 `api.iconify.design/twemoji/`（彩色 emoji） | Emoji | **彩色** |
  | 含 `/icons/bi/`、`bootstrap-icons`、或 `api.iconify.design/bi/`（Bootstrap 图标） | Bootstrap 图标 | — |
  | 其它 `http(s)://` / `data:image/`（如 favicon） | Bootstrap 图标 | — |
  | emoji 字符（非空） | Emoji | 字符 |
  | **空值**（新建条目 / 页面没抓到图标） | Bootstrap 图标 | — |

- **存储语义**：
  - Emoji · 字符样式 → 存**字符本身**（`🚀`）；离线也能显示，无网络依赖。
  - Emoji · 彩色样式 → 存**完整 URL**（`<站点 origin>/icons/twemoji/<slug>.svg`），前台按图片渲染，图片由**本站自托管**。
  - Bootstrap 图标 → 存**完整 URL**（`<站点 origin>/icons/bi/<name>.svg`），同样自托管。
  - 之所以存**绝对 URL** 而不是相对路径：扩展页里没有可用的 `location.origin`，相对路径会被解析成**扩展自身**的 origin 而裂图。因此选择器要求传 `origin`——扩展侧传用户配置的站点地址（去尾斜杠），网页后台传 `location.origin`；缺省回退 `location.origin`，仍为空则退回相对路径（不抛错）。
- 选择器在扩展里以**内联面板**（非浮层）呈现：Chrome 弹窗按内容自适应高度，固定定位浮层会被裁切。

### 彩色 Emoji（Twemoji）

Emoji 页签顶部有 **「字符 | 彩色」** 分段控件（数据驱动，读产物里的 `emoji.styles`，将来加彩色集只需加一条 `styles`）：

| 样式 | 渲染 | 选中后写入 | 说明 |
|---|---|---|---|
| 字符 | 直接渲染 emoji 字符 | `🚀` | 零网络依赖，**离线可用**；跨平台字形由系统字体决定 |
| 彩色 | 自托管的 Twemoji SVG | `<站点 origin>/icons/twemoji/rocket.svg` | 各平台外观一致、彩色；由本站自托管，无第三方依赖 |

- **两种样式共用同一套中文索引**（中文名 / 关键词 / emoji 字符），**搜索逻辑与搜索框行为完全一致**，切换样式只换取值与渲染节点。
- 图标体**自托管**在本仓库 `public/icons/twemoji/<slug>.svg`；产物里**只存 slug**（`rocket`），URL 由 `styles[].base + slug + suffix` 现拼 —— 若把 1914 个图标体内联进 `extension/lib/icon-data.js`，数据文件会从 KB 级膨胀到 MB 级（扩展侧也不需要跨域 fetch）。
- 图片加载失败时该格子**回退渲染字符本身**，不会出现裂图。
- ⚠️ **Twemoji 图形许可是 CC-BY 4.0（需署名）**，见「第三方数据」。
- 为什么选 Twemoji：见「为什么是 Twemoji（以及为什么不做 Emoji 17.0）」。

## 深色主题下的图标反色（改样式前必读）

**单色图标集**的 SVG 根节点是 `fill="currentColor"`，而 **`currentColor` 在 `<img src>` 里恒为黑色** —— 与 `color-scheme`、`prefers-color-scheme` 都无关（8 组隔离实验：`color-scheme: light` / `dark` / `light dark` / `inherit`(父元素为 dark) × 系统亮/暗，每一组读出的填充色**都是黑**）。深色底上就是整片黑，图标完全不可见。

所以站点与扩展各有一处反色规则，缺一处就有一片区域瞎掉：

```css
/* public/styles.css —— 前台 tile、后台列表、后台编辑预览位、选择器网格都靠它。
   站点主题开关同时设 body.dark-theme 类与 :root[data-theme] 属性
   （见 public/scripts/theme-toggle.js），两条选择器都要写，少一条就漏一片。 */
body.dark-theme :is(
  img[src*="bootstrap-icons"],
  img[src*="/icons/bi/"],
  img[src*="api.iconify.design"]:not([src*="/twemoji/"])
),
:root[data-theme="dark"] :is(
  img[src*="bootstrap-icons"],
  img[src*="/icons/bi/"],
  img[src*="api.iconify.design"]:not([src*="/twemoji/"])
) {
  filter: invert(1);
}

/* extension/popup.css —— 弹窗预览位与内联选择器；扩展跟随系统主题，故写在 @media 内 */
@media (prefers-color-scheme: dark) {
  :is(
    img[src*="bootstrap-icons"],
    img[src*="/icons/bi/"],
    img[src*="api.iconify.design"]:not([src*="/twemoji/"])
  ) {
    filter: invert(1);
  }
}
```

记住这几条：

- **必须用 URL 子串属性选择器**：`icon` 字段只是一条 URL 字符串，消费端（`public/scripts/main.js`、`public/scripts/admin.js`）拿不到「这是单色图标」的类型信息，URL 子串是唯一可靠、且**零数据改动**的信号。
- **必须覆盖三种历史形态的地址**（少一个就有一批数据瞎掉）：
  - `bootstrap-icons` —— **最早**的存量数据地址（旧 npmmirror CDN）；
  - `api.iconify.design/bi/` —— **中间一版**曾用的 Iconify 单色集；
  - `/icons/bi/` —— **现行自托管**路径。
  用 `:is()` 把三者并列。
- **必须排除彩色集**：`api.iconify.design/twemoji/…` 用 `:not([src*="/twemoji/"])` 排除（反色会毁掉配色）。自托管的彩色 emoji（`/icons/twemoji/…`）天然不匹配上面任何一条，无需额外处理。**新增单色图标集时要在 `:is()` 列表里登记；彩色集一律用 `:not()` 排除。**
- **绝不要对全部 `<img>` 反色**：favicon、PNG logo、彩色 emoji、由 emoji 生成的 data URI 都会被毁掉。
- 源色是**纯黑**（`currentColor` → `#000`），`invert(1)` 之后即纯白，**不需要** `hue-rotate` 补色。

## 图标库数据

- 数据文件：`extension/lib/icon-data.js`（扩展侧 `import`）+ `public/data/icon-library.json`（网页后台按需 `fetch`），**两者数据完全一致**。
- 图标体文件：`public/icons/bi/<name>.svg`（2078 个）+ `public/icons/twemoji/<slug>.svg`（1914 个），**自托管、须随仓库提交**（部署要用）。
- 上游：Bootstrap Icons 官方图标名全集（`bootstrap-icons@1.13.2`，2078 个）+ 官方分类目录，Unicode 官方 emoji 分组（1914 个），CLDR 中英文注释，**图标体由 `@iconify-json/bi@1.2.7` 与 `@iconify-json/twemoji@1.2.5` 生成并落盘自托管**。
- 产物结构（`version: 3`）：

  ```jsonc
  {
    "_generated": "……出处与许可（JSON 不能写注释，故用合法字段）",
    "version": 3,
    "bootstrap": {
      "package": "bootstrap-icons",
      "packageVersion": "1.13.2",     // 记录性字段：URL 里不带版本号
      "license": "MIT © The Bootstrap Authors",
      "base": "/icons/bi/",             // 路径，不是绝对 URL（origin 由消费端拼）
      "suffix": ".svg",
      "categories": [["alerts-and-status", "提醒与状态"], "…"],
      "icons": [["bookmark-star", "bookmarks", "书签 星标 收藏 bookmark star …"], "…"]
    },
    "emoji": {
      "sources": ["…"],
      "styles": [
        { "id": "char", "label": "字符" },
        { "id": "twemoji", "label": "彩色", "base": "/icons/twemoji/",
          "suffix": ".svg", "license": "Twemoji graphics CC-BY 4.0 © Twitter, Inc. and contributors" }
      ],
      "groups": [{ "id": "smileys-emotion", "label": "表情与情绪",
                   "items": [["🚀", "火箭", "火箭 发射 太空 旅行", "rocket"], "…"] }]
    }
  }
  ```

  - ⚠️ **`base` 是路径**（`/icons/bi/`、`/icons/twemoji/`），**不是绝对 URL**：站点可能部署在任意域名，扩展里的站点地址也是用户可配的，构建期写死域名会让换域名后图标全挂。消费端用自己知道的 origin 拼出绝对 URL（`icon-picker.js` 的 `origin` 参数）。
  - emoji 每条是**四元组** `[emoji, 中文名, 关键词, slug]`；`slug` 是 Iconify 的 emoji 名（见下），也是 `public/icons/twemoji/<slug>.svg` 的文件名。
  - `styles` 是**数据驱动**的：选择器的「字符 | 彩色」分段按钮由它生成，加一条就多一个分段。
- ⚠️ **数据文件只存 slug，不内联图标体**：图标体已另存为 `public/icons/` 下的独立文件；把 1914+ 个 SVG 内联进 `extension/lib/icon-data.js` 会让数据文件从 KB 级涨到 MB 级（MV3 弹窗也不能跨域 fetch）。

### 为什么自托管（以及为什么不用 Iconify 公共 API）

**先走过的弯路**：一度把图标体统一到公共图标 API `https://api.iconify.design`（一个宿主同时提供单色集 `bi` 与彩色集 `twemoji`，URL 形状统一，深色反色规则也好写）。但**实测它有约 60 请求 / 5 分钟 / 每 IP 的限额**——两组独立测量互相印证（并发 6、125 个请求得 58 个 200 / 65 个 429；序贯 300ms 间隔第 9 个即 429，`retry-after` 达 300）。这对我们是致命的：**选择器网格每批就是 120 个请求**，一次即超额；而 429 的响应体不是图片，`<img>` 会被浏览器拒渲染（Chrome 报 `ERR_BLOCKED_BY_ORB`），表现是**一片图标同时不显示**，须等约 5 分钟回填。前台导航页存 60+ 条图标也会裂一半。

**结论**：图标体必须完全离开运行时外部依赖，于是改为**自托管**——构建期从 npmmirror 抓 `@iconify-json/bi`、`@iconify-json/twemoji`（npmmirror 无此限流），把 SVG 体逐个写成 `public/icons/{bi,twemoji}/<name>.svg`，运行时 URL 是我们自己域名的静态文件。附带收益：

- **没有任何外部 CDN 依赖**，不受第三方限流 / 宕机影响（原先「图标依赖 CDN 可达」这条已知限制就此消失）；
- `bi` 的图标名与上游 2078 个名字**完全一致**（脚本有集合相等断言），`twemoji` 对我们 1914 个 slug 覆盖 **100%**（其中 2 个是别名，脚本按 `aliases[name].parent` 解析成真实图标），名字 / 分类 / 关键词一个字都不用动；
- 代价：**换域名后旧图标 URL 会失效**（库里存的是绝对 URL），需重新选择图标（见「已知限制」）；`public/icons/` 体积约 4.4MB（见「重新生成」）。

### 重新生成

```bash
node tools/build-icon-library.mjs            # 优先读缓存 /tmp/icondata，缺失才联网
node tools/build-icon-library.mjs --offline  # 纯离线（缺缓存即报错；自检本就不联网）
```

⚠️ 沙箱/CI 里跑要**清掉注入的失效代理**，否则全部 502：

```bash
env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy node tools/build-icon-library.mjs
```

- 该脚本同时生成：`public/icons/{bi,twemoji}/*.svg`（自托管图标体）、`public/data/icon-library.json`、`extension/lib/icon-data.js`，并把 `public/scripts/icon-picker.js` 逐字节复制为 `extension/lib/icon-picker.js`。
- ⚠️ **`public/icons/`、`extension/lib/icon-data.js` 与 `extension/lib/icon-picker.js` 都是生成产物，请勿手改**：改数据改 `tools/build-icon-library.mjs`，改组件改 `public/scripts/icon-picker.js`，改完都要重跑脚本。**`public/icons/` 虽是产物但必须随仓库提交**（部署要用，且**不要**写进 `.gitignore`）。
- ⚠️ **图标体落盘前会先清空 `public/icons/{bi,twemoji}/` 再写**（防止图标名变动后残留陈旧文件）；清空前脚本会**断言目标路径确实在仓库的 `public/icons/` 之下**，避免路径写错时误删他处。
- 脚本会把 `public/scripts/icon-picker.js` 逐字节复制到 `extension/lib/icon-picker.js`（只加两行横幅），并在复制后**断言**去掉横幅的内容与源文件一致，不一致直接抛错。
- 脚本自带断言（任一失败即退出码非 0）：JSON 严格合法、两份产物主体逐字节一致、bi 图标名与上游集合相等（2078）、每条 emoji 有非空 slug 且唯一数 = 1914、中文名覆盖率 ≥ 95%、5 条 `emojiSlug` 单元用例；以及**本地**图标体完整性校验——`public/icons/bi/` 恰好 2078 个、`public/icons/twemoji/` 恰好 1914 个、各自与名字 / slug 集合一一对应（无多无缺）、每个文件非空且以 `<svg` 开头、以 `</svg>` 结尾、**`viewBox="0 0 <正数> <正数>"`（数值必须存在且为正数：Iconify 集级与图标级都未声明尺寸时缺省为 16×16，漏了会写成 `viewBox="0 0 undefined undefined"` → 浏览器按 0×0 渲染 → 图标不可见）**，并汇总总体积与平均大小、抽 5 个文件打印前 120 字符。
  - 另有一条**例外白名单**断言：全量 3992 个文件里「非整数 viewBox」只允许 1 个例外 —— 上游自带的 `twemoji/watermelon.svg`（Iconify 给它 `height: 25.22`）。要改它就会与上游快照逐字节比对失败，所以保留并把例外钉死，反而能立刻暴露「误写小数 / 上游新增异常尺寸」。
  - 另有 4 条 **viewBox 定点抽检**（回归用）：`bi/alarm.svg`、`bi/check.svg` = `0 0 16 16`；`twemoji/grinning-face.svg`、`twemoji/flag-china.svg` = `0 0 36 36`。
  - ℹ️ 这些校验**全是本地文件读取、不联网**：比旧的联网直链抽检更快、不受任何限流影响，也不会再把用户 IP 的额度打空（旧版结尾那 60 个联网抽检会把额度打空 → 紧接着刷新页面满屏裂图，这是自我伤害，现已消除）。
- ℹ️ **比字节时的坑**：JSON 产物按 POSIX 习惯写成 `body + "\n"`（尾带换行），JS 产物主体是 `export const … = body;`（无尾换行），所以两个文件的**字节数天然差 1**；余下的差值是注释横幅与 export 包装。比「两份数据一致」时请 **trimEnd 后比 JSON 主体，或直接比 `JSON.parse` 后的对象**，不要比整个文件字节 —— 否则会得到一条假失败。
- ℹ️ 当前体量（version 3）：`public/icons/` 共 **3992 个文件 / 约 4.4MB**（`bi/` 2078 个约 1.16MB、`twemoji/` 1914 个约 3.34MB）。⚠️ 这两个数是**文件内容的字节和**；`du -sh` 会因每个小文件占满 4KB 磁盘块而显示约 16MB。数据文件 `public/data/icon-library.json` ≈ **530KB**、`extension/lib/icon-data.js` ≈ **531KB**（迁到 Iconify / 自托管前的数据文件是 475.8KB / 476.6KB）。
  - ℹ️ 为什么图标体文件比规格预估大：预估的「平均 481B / 1694B」只算了 SVG **body**，而每个落盘文件还要套一层外壳 `<svg xmlns=… width="1em" height="1em" viewBox="…">…</svg>\n`（约 92B / 文件），3992 个共约 +360KB，故实际平均是 573B / 1786B。

### 生成时的五条硬约束（改脚本前必读）

| 约束 | 原因 | 做法 |
|---|---|---|
| **图标体必须自托管并提交** | 运行时**不能有任何外部 CDN 依赖**：公共图标 API `api.iconify.design` 有约 60 请求 / 5 分钟 / 每 IP 的限额，而选择器网格每批就是 120 个请求，一次即超额 → 429 的响应体不是图片 → `<img>` 裂开 | 构建期把 Iconify 图标集的 `body` 包上 `<svg>` 外壳后写到 `public/icons/{bi,twemoji}/`；`public/icons/` 由脚本生成、**先清空再写**、**必须随仓库提交**（不要写进 `.gitignore`） |
| **JSON 产物必须严格合法** | `public/data/icon-library.json` 要能被 `JSON.parse` / `fetch().json()` / `jq` / 编辑器校验直接吃下 | 出处与许可写成 **JSON 内的合法字段 `_generated`**，不写注释横幅；组件侧因此直接 `response.json()`，**没有也不允许**「剥注释」兜底。（JS 产物 `extension/lib/icon-data.js` 相反，可以有注释横幅） |
| **CLDR 的 key 不带变体选择符 U+FE0F** | `unicode-emoji-json` 的 emoji 带 FE0F（`🖥️` = U+1F5A5 U+FE0F），CLDR 的 key 不带（`🖥` = U+1F5A5）。拿带 FE0F 的串直接查表会**大面积落空** | 按「剥掉 U+FE0F 后的基础码点序列」建索引（`stripVariationSelectors`），再回查 |
| **中文名必须合并「主注释 + 派生注释」两个包** | 只用主包覆盖率仅 **83%（1588/1914）** —— 缺的 326 条（`Flags` 262 + `People & Body` 61 + `Symbols` 3）**全在派生包里** | 合并主包 `cldr-annotations-full` 的 `annotations` 与派生包 `cldr-annotations-derived-full` 的 `annotationsDerived`（派生先放、主注释后覆盖，保证主注释优先）；脚本对合并后覆盖率做断言，低于 95% 直接抛错 |
| **emoji slug 必须按 `emojiSlug()` 的规则表生成** | Iconify 的 emoji 名来自 CLDR **英文**注释的 kebab 化，但直接 kebab 会踩四个坑（见下表），缺一步就掉几条 | 用 `emojiSlug()`（`tools/build-icon-library.mjs`），并对 5 个怪例写单元用例；脚本另断言「每条 emoji 都有非空 slug」且「唯一 slug = 1914」 |

> ⚠️ **两包的外层结构不同，取值时必须兼容**：主包是 `{ annotations: { identity, annotations } }`（`annotations` 里**再套一层** `annotations`），派生包是 `{ annotationsDerived: { identity, annotations } }`。照抄一层的写法会静默取到 `{ identity, annotations }` 这个壳、命中数变 0（不报错，最坑）。中英文四份注释都一样。

### emoji slug 映射规则

`slug` 是 Iconify emoji 集的图标名，也是**彩色 emoji 文件的文件名 / URL 末段**（`/icons/twemoji/<slug>.svg`）。规则按顺序执行，每一步都必要：

| 步骤 | 规则 | 例子 |
|---|---|---|
| 0 | 两个特例 | `keycap: #` → `keycap-pound`；`keycap: *` → `keycap-asterisk` |
| 1 | NFD 分解并剥掉组合记号 `[\u0300-\u036f]` | `piñata` → `pinata`（不处理会得到 `pi-ata`） |
| 2 | `U.S.` → `us` | `flag: U.S. Outlying Islands` → `flag-us-outlying-islands`（不处理会得到 `u-s-outlying-islands`） |
| 3 | 去掉弯/直引号 `’‘ʼ'\`` | `one o’clock` → `one-oclock`（U+2019 不在 a-z 白名单里，会变成 `one-o-clock`） |
| 4 | 前缀 `flag:` → `flag-`、`keycap:` → `keycap-` | `flag: China` → `flag-China` |
| 5 | 转小写 | — |
| 6 | `&` → ` and ` | `São Tomé & Príncipe` → `sao-tome-and-principe` |
| 7 | 括号 → 空格 | `A button (blood type)` → `a-button-blood-type` |
| 8 | 非 `[a-z0-9]` → `-`，再去首尾连字符 | `1st place medal` → `1st-place-medal` |

- **实测覆盖率：twemoji 1914/1914 = 100%**（对 Iconify 的 twemoji 全集比对；1914 个 slug 里有 **2 个是别名**——`on-arrow → on-exclamation-arrow`、`up-button → upwards-button`——脚本按 `aliases[name].parent` 解析成真实图标体）。构建脚本的自检已改为**本地**比对：落盘的 1914 个文件名与 slug 集合一一对应（无多无缺）。
- 参考值：`openmoji` 1912/1914（99.9%）、`noto` 1653（86.4%）、`fluent-emoji-flat` 1564（81.7%，**不含国旗**，故不选它做主样式）。
- **字符 ↔ 图片共用一份索引**：各彩色集命名**完全一致**（fluent-emoji-flat 的 1563 个 slug 在 twemoji 里 100% 同名存在），所以一套 slug 能服务所有彩色集。代价实测：slug 文本本身 **24.6KB**（1914 条，平均 12.9 字符），加上 2 空格缩进 JSON 下每个四元组多出的换行/缩进/引号/逗号（每条约 14B），产物共增约 **54.5KB**（475.8KB → 530.4KB）。

### 为什么是 Twemoji（以及为什么不做 Emoji 17.0）

各彩色 emoji 集在我们 1914 个 emoji 上的覆盖率（用 Iconify collection 接口对全集比对）：

| 彩色集 | 覆盖率 | 结论 |
|---|---|---|
| `twemoji` | **1914/1914 = 100%** | ✅ 选它：覆盖完整、含全部国旗 |
| `openmoji` | 1912/1914 = 99.9% | 备选（许可更宽松，但风格偏线描） |
| `noto` | 1653/1914 = 86.4% | 缺得多 |
| `fluent-emoji-flat` | 1564/1914 = 81.7% | ❌ **不含国旗**，导航页会大片空档 |

版本上限：两个 registry 双向确认数据源停在 **Emoji 16.0**（`unicode-emoji-json@0.9.0` / `emoji-datasource@16.0.0`），**17.0 只在 git 未发布**；且主流平台要到 2026 年底才逐步铺开，现在加进来只会得到一堆**豆腐块**（□）。等数据源跟上再升。

### 派生注释的名字清洗

`cldr-annotations-derived-full` 的 `tts[0]` 是「A: B」形态，直接当显示名很别扭。实测派生包 2376 条里 **2356 条**是「A: B」（绝大多数是肤色变体，如 `挥手: 较浅肤色`），进入产物的 326 条按分组清洗**显示名**：

| 分组 | 条数 | CLDR 原始 `tts[0]` | 清洗后的显示名 | 规则 |
|---|---|---|---|---|
| Flags | 262 | `旗: 中国` | `中国` | 旗帜组只取冒号右侧 |
| People & Body | 61 | `男人: 卷发` | `卷发男人` | 其它组拼接为「右 + 左」 |
| Symbols | 3 | `按键: 10` | `10按键` | 同上（`#按键`、`*按键` 同理，观感略怪但规则一致） |

- 清洗**只作用于显示名**：关键词里同时保留「清洗后的显示名」与「CLDR 原始 `tts[0]`」，所以搜「中国」「旗」「卷发」都能命中 —— 名字好看，搜索面不缩水。例如 `🇨🇳` 的关键词是 `中国 旗: 中国 旗`。
- 冒号同时匹配半角 `:` 与全角 `：`；不含「A: B」形态的原样保留。
- ℹ️ 派生包里另有 20 条不含冒号（货币符号如 `未知货币`、`泰铢`，以及肤色变体），但它们**不在** `unicode-emoji-json` 的 1914 个 emoji 之列，因此不会进入产物 —— 不必为它们写专门分支。

## 第三方数据

| 数据 | 版本 | 许可 |
|---|---|---|
| [Bootstrap Icons](https://icons.getbootstrap.com)（2078 个图标名 + `icons.getbootstrap.com` 分类目录） | 1.13.2 / main | MIT © The Bootstrap Authors |
| [`@iconify-json/bi`](https://www.npmjs.com/package/@iconify-json/bi)（`bi` 单色图标体来源，**仅构建期用**） | 1.2.7 | Iconify 打包代码 MIT；图标体许可随上游（`bi` 即 MIT © The Bootstrap Authors） |
| [`@iconify-json/twemoji`](https://www.npmjs.com/package/@iconify-json/twemoji)（彩色 emoji 体来源，**仅构建期用**） | 1.2.5 | Iconify 打包代码 MIT；图形为 **CC-BY 4.0**（见下） |
| [Twemoji graphics](https://github.com/jdecked/twemoji)（彩色 emoji 图形，经 Iconify 的 twemoji fork 分发） | fork v16.0.1（随 `@iconify-json/twemoji@1.2.5`） | **CC-BY 4.0 © Twitter, Inc. and contributors（需署名）** |
| [`unicode-emoji-json`](https://www.npmjs.com/package/unicode-emoji-json)（emoji 分组与英文名） | 0.9.0 | MIT |
| `cldr-annotations-full`、`cldr-annotations-derived-full`（中英文注释、关键词、emoji 英文名 → slug） | 48.2.0 | Unicode License |

> 中文注释需要**主包 + 派生包**一起用：`cldr-annotations-full` 里没有旗帜与大量 ZWJ 组合，`cldr-annotations-derived-full` 才补齐（合并后中文名覆盖率 100%）。英文注释同理解析，用于生成 Iconify 的 emoji slug。
>
> ⚠️ **Twemoji 是 CC-BY 4.0**：使用彩色 emoji 样式即构成再分发，需保留署名。当前做法是在产物字段（`emoji.styles[].license` 与顶层 `_generated`）、本文件与仓库 `README.md` 三处标注。若将来要商用且不便署名，可切到 MIT 的 `openmoji`（覆盖率 99.9%）或改用「字符」样式。
>
> ℹ️ **为什么用 Iconify 的 twemoji fork 而不是官方 `@twemoji/svg`**：官方（15.0.0）只有 91.2% 且**完全缺 Emoji 16.0 新字符**（🫩 🫆 🪾 🫟 🪉 🪏 🇨🇶 全部缺失）；Iconify 的 fork（v16.0.1）覆盖 100%。

## 行为说明

| 场景 | 表现 |
|---|---|
| 页面无图标 | 图标位显示 🔖 占位 |
| 图标地址打不开 | 自动回退为占位符，不出现裂图 |
| 页面标题为空 | 回退用浏览器标签页标题 |
| 页面脚本无法注入（应用商店、内置查看器等） | 回退用标签页信息，仍可保存 |
| 当前页不是 http/https（如 `chrome://`） | 明确提示不可添加 |
| 该链接已在书签中 | 琥珀色提示「该链接已在书签中：XXX（分类）」，不重复写入 |
| 会话过期（12 小时） | 用保存的密码自动重新登录并重试，无需人工干预 |
| 站点连不上 / 地址填错 | 设置页给出可读的中文错误，不丢配置 |

## 权限说明

只申请三项，无站点访问权：

| 权限 | 用途 |
|---|---|
| `storage` | 保存站点地址、密码与 12 小时会话 token（`chrome.storage.local`，仅存本机） |
| `activeTab` | 点击扩展图标时，只临时获得**当前这一个标签页**的读取权（用于取标题/描述/图标） |
| `scripting` | 在获得 `activeTab` 后注入一小段脚本抓取页面元信息 |

没有申请 `tabs`（读取全部浏览记录）或 `<all_urls>`（读取所有网站数据），所以**不会**在后台扫描你的浏览行为。跨域请求也不需要额外声明：SimPage 的接口已开放 `Access-Control-Allow-Origin`。

## 服务端要求

- 该实例需已部署 SimPage，且包含 `POST /api/bookmarks` 接口（本仓库 `edge` 分支起提供）
- 会话有效期 12 小时（服务端 `SESSION_TTL_MS`）

## 文件结构

```
extension/
├── manifest.json        # MV3 清单
├── popup.html/.css/.js  # 点图标后的弹窗
├── options.html/.css/.js# 设置页
├── lib/api.js           # 共享：配置读写、登录与 token 缓存、接口调用
├── lib/icon-data.js     # 【生成产物】图标库数据（勿手改）
├── lib/icon-picker.js   # 【生成产物】图标选择器（与 public/scripts/icon-picker.js 一致，勿手改）
└── icons/               # 16/32/48/128 图标（icon.svg 为源）
```

## 已知限制

- **无法在自动化里模拟「点击工具栏图标」**，因此 `activeTab` 只能在真实点击时授予 —— 自动化测试覆盖到「打开扩展页 + 真实跨域请求」为止，最后一步「点图标 → 保存」需人工点一次确认。
- 添加书签是「读 → 追加 → 写」三步，服务端 KV 没有原子 CAS，同一瞬间的并发追加理论上可能互相覆盖（个人导航页的写入频率下不会遇到）。
- **图标由本站自身提供，没有任何外部 CDN 依赖**：图标体落在 `public/icons/{bi,twemoji}/`，运行时直接从本站取，不受任何第三方限流 / 宕机影响。代价是 **换域名后旧图标 URL 会失效**——库里存的是**绝对 URL**（`<旧 origin>/icons/bi/<name>.svg`），换域名后这些链接仍指向老域名，需**重新选择图标**（或把库里旧 origin 批量替换成新 origin）。之所以存绝对 URL：扩展页没有可用的 `location.origin`，存相对路径会在扩展里裂图。
- ⚠️ **首次部署要带上 `public/icons/`**：它是构建产物但**必须提交 / 上传**，否则所有图标 404。CI 里若只提交源码、把产物 gitignore 掉，就会踩这个坑。
- **Bootstrap 图标名固定为 `bootstrap-icons@1.13.2`**：升级需同时改 `tools/build-icon-library.mjs` 里的版本号并重跑构建脚本（名字集合会变，URL 模板不变）；脚本会断言名字与上游集合相等，升级后漏改会直接报错而非静默漂移。
