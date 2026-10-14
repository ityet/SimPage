/* eslint-disable */
/* ⚠️ 本文件由 tools/build-icon-library.mjs 从 public/scripts/icon-picker.js 自动生成，请勿直接修改。 */
/**
 * SimPage 共用图标选择器（规范源）—— 彩色 Emoji 选择器
 *
 * 一处实现、两处复用：网页端 fetch `/data/icon-library.json`，扩展端 import `lib/icon-data.js`。
 * 之所以同时支持 `library`（已加载对象）与 `libraryUrl`（组件内 fetch）：
 *   - 扩展弹窗（MV3）不能跨域 fetch 站点资源，只能把数据打包进扩展后用 import 传入；
 *   - 网页端不想为 400KB 数据额外打包，按需 fetch 更合适。
 * 两种用法共用「字节完全相同」的这一份文件，避免两份实现漂移。
 *
 * ⚠️ 本文件顶层不得触碰 document / window：只允许常量与函数定义。
 *   这样既能被浏览器加载，也能在 Node 里用 `import()` 做语法与导出校验。
 *
 * 样式隔离：所有选择器以 `.sp-icon-picker` 前缀，模块自行向 document.head 注入一次 <style>。
 * 颜色按「宿主变量 → 通用变量 → 内置回退」三级链取值，既不污染宿主也能被宿主覆盖：
 *   --sp-ip-surface → --surface → #fff
 *   --sp-ip-text    → --text    → #1d2130
 *   --sp-ip-border  → --border  → #e3e6ef
 *   --sp-ip-accent  → --accent  → #7f5af0
 *   --sp-ip-soft    → --surface-soft → #f1f3f9
 *   --sp-ip-muted   → --text-muted   → #8b91a6
 * 站点 styles.css 用的是另一套命名（--glass-bg / --text-primary / …），因此站点侧靠显式设置
 * `--sp-ip-*` 接入；扩展 popup.css 则天然提供 --surface/--text/--border/--accent/--surface-soft/--text-muted。
 *
 * 图标体自托管：数据里的 `base` 是**路径**（`/icons/twemoji/`），不是绝对 URL。
 * 选择器通过 `origin` 参数（缺省取 `location.origin`）拼出绝对 URL 用于显示与入库——
 * 因为扩展页里没有可用的 `location.origin` 语义，相对路径会被解析成扩展自身 origin 而裂图。
 * 没有 origin 时退回相对路径（不抛错）。
 *
 * 本选择器只提供**彩色 Emoji**（自托管的 Twemoji SVG）。渲染样式**数据驱动**（读 `library.emoji.styles`）：
 * 当前只有一种彩色样式（`base + slug + suffix`），选中时写**完整 URL**。
 * 历史数据里已存的「emoji 字符」与「图片 URL」由宿主（main.js / admin.js / popup.js）自行渲染，
 * 与本选择器无关——本文件不再提供「字符」样式，也不再涉及单色图标集。
 */

/** 组件版本，便于宿主判断能力。v4：只提供彩色 Emoji（移除 Bootstrap 图标与「字符」样式）。 */
export const ICON_PICKER_VERSION = 4;

/** 注入样式的 <style> id（只注入一次） */
const STYLE_ID = "sp-icon-picker-style";
/** 首屏渲染条数 */
const ITEM_BATCH = 120;

const CSS = `
.sp-icon-picker {
  --sp-ip-fb-surface: #ffffff;
  --sp-ip-fb-text: #1d2130;
  --sp-ip-fb-border: #e3e6ef;
  --sp-ip-fb-accent: #7f5af0;
  --sp-ip-fb-soft: #f1f3f9;
  --sp-ip-fb-muted: #8b91a6;
  color-scheme: light dark;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.5;
  color: var(--sp-ip-text, var(--text, var(--sp-ip-fb-text)));
}
@media (prefers-color-scheme: dark) {
  .sp-icon-picker {
    --sp-ip-fb-surface: #1c1f27;
    --sp-ip-fb-text: #edf0f7;
    --sp-ip-fb-border: #2d323f;
    --sp-ip-fb-accent: #7f5af0;
    --sp-ip-fb-soft: #232733;
    --sp-ip-fb-muted: #767d91;
  }
}
.sp-icon-picker,
.sp-icon-picker * { box-sizing: border-box; }

/* modal：全屏遮罩 + 居中面板 */
.sp-icon-picker--modal {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background: rgba(15, 18, 30, 0.5);
}
/* panel：参与宿主正常流（扩展弹窗按内容自适应高度，不能用 fixed 浮层） */
.sp-icon-picker--panel { position: relative; display: block; width: 100%; }

.sp-ip-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 420px;
  max-height: min(560px, calc(100vh - 24px));
  background: var(--sp-ip-surface, var(--surface, var(--sp-ip-fb-surface)));
  border: 1px solid var(--sp-ip-border, var(--border, var(--sp-ip-fb-border)));
  border-radius: 12px;
  box-shadow: 0 18px 48px rgba(15, 18, 30, 0.28);
  overflow: hidden;
}
.sp-icon-picker--panel .sp-ip-panel { max-width: 100%; }

.sp-ip-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 14px 8px;
}
.sp-ip-title { margin: 0; font-size: 13.5px; font-weight: 600; }
.sp-ip-close {
  flex: none;
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  font-size: 17px;
  line-height: 1;
  color: var(--sp-ip-muted, var(--text-muted, var(--sp-ip-fb-muted)));
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
}
.sp-ip-close:hover {
  background: var(--sp-ip-soft, var(--surface-soft, var(--sp-ip-fb-soft)));
  color: var(--sp-ip-text, var(--text, var(--sp-ip-fb-text)));
}

.sp-ip-search { padding: 0 14px 8px; }
.sp-ip-search input {
  width: 100%;
  padding: 7px 10px;
  font: inherit;
  font-size: 12.5px;
  color: var(--sp-ip-text, var(--text, var(--sp-ip-fb-text)));
  background: var(--sp-ip-soft, var(--surface-soft, var(--sp-ip-fb-soft)));
  border: 1px solid var(--sp-ip-border, var(--border, var(--sp-ip-fb-border)));
  border-radius: 9px;
  outline: none;
}
.sp-ip-search input:focus {
  border-color: var(--sp-ip-accent, var(--accent, var(--sp-ip-fb-accent)));
}

.sp-ip-cats {
  display: flex;
  gap: 6px;
  padding: 0 14px 8px;
  overflow-x: auto;
  scrollbar-width: none;
}
.sp-ip-cats::-webkit-scrollbar { display: none; }
.sp-ip-cat {
  flex: none;
  padding: 3px 10px;
  font: inherit;
  font-size: 11.5px;
  color: var(--sp-ip-muted, var(--text-muted, var(--sp-ip-fb-muted)));
  background: transparent;
  border: 1px solid var(--sp-ip-border, var(--border, var(--sp-ip-fb-border)));
  border-radius: 999px;
  white-space: nowrap;
  cursor: pointer;
}
.sp-ip-cat.is-active {
  color: #fff;
  background: var(--sp-ip-accent, var(--accent, var(--sp-ip-fb-accent)));
  border-color: transparent;
}

.sp-ip-grid {
  flex: 1;
  min-height: 120px;
  max-height: 340px;
  overflow: auto;
  padding: 4px 12px 8px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(32px, 1fr));
  gap: 4px;
  align-content: start;
}
.sp-ip-item {
  aspect-ratio: 1 / 1;
  display: grid;
  place-items: center;
  padding: 0;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  outline: none;
}
.sp-ip-item:hover,
.sp-ip-item:focus-visible {
  background: var(--sp-ip-soft, var(--surface-soft, var(--sp-ip-fb-soft)));
  border-color: var(--sp-ip-border, var(--border, var(--sp-ip-fb-border)));
}
.sp-ip-item.is-selected {
  border-color: var(--sp-ip-accent, var(--accent, var(--sp-ip-fb-accent)));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--sp-ip-accent, var(--accent, var(--sp-ip-fb-accent))) 30%, transparent);
}
.sp-ip-item img { width: 22px; height: 22px; display: block; }
.sp-ip-emoji { font-size: 22px; line-height: 1; }

/* 哨兵：仅用于 IntersectionObserver 触底检测，不产生可见高度 */
.sp-ip-sentinel { grid-column: 1 / -1; height: 1px; }

.sp-ip-empty,
.sp-ip-state {
  grid-column: 1 / -1;
  padding: 24px 8px;
  text-align: center;
  color: var(--sp-ip-muted, var(--text-muted, var(--sp-ip-fb-muted)));
  font-size: 12px;
}
.sp-ip-state button {
  margin-top: 8px;
  padding: 5px 12px;
  font: inherit;
  font-size: 12px;
  color: #fff;
  background: var(--sp-ip-accent, var(--accent, var(--sp-ip-fb-accent)));
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
.sp-ip-skeleton {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(32px, 1fr));
  gap: 4px;
}
.sp-ip-skeleton span {
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  background: var(--sp-ip-soft, var(--surface-soft, var(--sp-ip-fb-soft)));
}

.sp-ip-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 14px;
  border-top: 1px solid var(--sp-ip-border, var(--border, var(--sp-ip-fb-border)));
}
.sp-ip-current {
  min-width: 0;
  flex: 1;
  font-size: 11.5px;
  color: var(--sp-ip-muted, var(--text-muted, var(--sp-ip-fb-muted)));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sp-ip-clear {
  flex: none;
  padding: 5px 12px;
  font: inherit;
  font-size: 12px;
  color: var(--sp-ip-accent, var(--accent, var(--sp-ip-fb-accent)));
  background: transparent;
  border: 1px solid var(--sp-ip-border, var(--border, var(--sp-ip-fb-border)));
  border-radius: 8px;
  cursor: pointer;
}
.sp-ip-clear:hover { border-color: var(--sp-ip-accent, var(--accent, var(--sp-ip-fb-accent))); }
`;

/** 已加载过的图标库缓存：URL → Promise<library>（同一 URL 只 fetch 一次） */
const libraryCache = new Map();

/**
 * 幂等地把样式注入宿主 document.head。
 * @param {Document} doc
 */
function ensureStyle(doc) {
  if (!doc || !doc.head) return;
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = CSS;
  doc.head.appendChild(style);
}

/**
 * 读取（并缓存）图标库。
 *
 * ⚠️ 该 JSON 必须是**严格合法 JSON**：产物头部不允许有任何注释 / 横幅
 * （出处与许可写在顶层 `_generated` 字段里）。这里刻意不做「剥注释」兜底——
 * 保留兜底等于默许 .json 文件可以不合法，会把问题埋给 jq / 编辑器校验 / 未来消费者。
 *
 * @param {string} url
 * @returns {Promise<object>}
 */
function loadLibraryFromUrl(url) {
  if (libraryCache.has(url)) return libraryCache.get(url);
  const promise = (async () => {
    const response = await fetch(url, { credentials: "same-origin" });
    if (!response.ok) {
      throw new Error(`图标库加载失败（HTTP ${response.status}）。`);
    }
    return response.json();
  })();
  // 失败时清缓存，允许用户点「重试」重新拉取
  promise.catch(() => libraryCache.delete(url));
  libraryCache.set(url, promise);
  return promise;
}

/**
 * 搜索词分词：小写、按空白切分。
 * @param {string} query
 * @returns {string[]}
 */
function tokenize(query) {
  return String(query || "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * 创建元素的小工具。
 * @param {Document} doc
 * @param {string} tag
 * @param {string} [className]
 * @param {object} [props]
 * @returns {HTMLElement}
 */
function el(doc, tag, className, props) {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (props) Object.assign(node, props);
  return node;
}

/**
 * 打开图标选择器。
 *
 * @param {object} options
 * @param {object} [options.library]      已加载好的图标库对象（扩展侧 import 后直接传入）
 * @param {string} [options.libraryUrl]   图标库 URL，组件内部 fetch 并缓存（网页侧传入）
 * @param {"modal"|"panel"} [options.layout="modal"]  modal=网页居中浮层；panel=宿主容器内联（扩展弹窗用）
 * @param {HTMLElement} [options.container] panel 模式必传：选择器挂载到哪个容器
 * @param {string} [options.origin]       拼接图标绝对 URL 用的 origin（如 `https://nav.example.com`）。
 *                                        数据里的 `base` 是路径，必须靠 origin 拼成绝对 URL——扩展页
 *                                        没有可用的 `location.origin`，相对路径会被解析成扩展自身 origin
 *                                        而裂图，所以扩展侧必须显式传站点的 origin。
 *                                        缺省回退 `location.origin`；仍为空则退回**相对路径**（不抛错）。
 * @param {string} [options.currentValue] 当前 icon 值，用于高亮与「清除」
 * @param {string} [options.title="选择图标"]
 * @param {(value: string) => void} options.onSelect  选中或清除时回调，清除时传 ""
 * @param {() => void} [options.onClose]
 * @returns {{ destroy(): void, close(): void }}
 * @throws {Error} 既未提供 library 也未提供 libraryUrl 时抛错
 */
export function openIconPicker(options = {}) {
  const doc = options.document || (typeof document !== "undefined" ? document : null);
  if (!doc) throw new Error("openIconPicker 需要在浏览器环境中调用（找不到 document）。");

  const {
    library = null,
    libraryUrl = "",
    layout = "modal",
    container = null,
    origin,
    currentValue = "",
    title = "选择图标",
    onSelect,
    onClose,
  } = options;

  if (typeof onSelect !== "function") {
    throw new TypeError("openIconPicker 需要 onSelect 回调。");
  }
  if (!library && !libraryUrl) {
    throw new Error("openIconPicker 需要 library 或 libraryUrl 之一。");
  }

  // 拼绝对 URL 用的 origin：调用方给的优先（去尾斜杠），否则回退 location.origin，再否则为空串。
  // 为空串时 composeUrl 会退回相对路径——扩展页里相对路径会裂，故扩展侧务必显式传站点 origin。
  const pickerOrigin = (() => {
    const provided = typeof origin === "string" ? origin.trim().replace(/\/+$/, "") : "";
    if (provided) return provided;
    if (typeof location !== "undefined" && location && location.origin) {
      return String(location.origin).replace(/\/+$/, "");
    }
    return "";
  })();

  const isModal = layout !== "panel";
  let closed = false;

  ensureStyle(doc);

  // ---------------------------------------------------------------- 根节点
  const root = el(doc, "div", `sp-icon-picker sp-icon-picker--${isModal ? "modal" : "panel"}`);
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-label", title);
  if (isModal) root.setAttribute("aria-modal", "true");

  const panel = el(doc, "div", "sp-ip-panel");
  root.appendChild(panel);

  // 头部
  const head = el(doc, "div", "sp-ip-head");
  const titleEl = el(doc, "h2", "sp-ip-title", { textContent: title });
  const closeBtn = el(doc, "button", "sp-ip-close", {
    type: "button",
    textContent: "×",
    title: "关闭",
  });
  closeBtn.setAttribute("aria-label", "关闭");
  head.append(titleEl, closeBtn);

  // 搜索
  const searchWrap = el(doc, "div", "sp-ip-search");
  const searchInput = el(doc, "input", null, { type: "search", autocomplete: "off", spellcheck: false });
  searchInput.setAttribute("aria-label", "搜索图标");
  searchWrap.appendChild(searchInput);

  // 分类
  const cats = el(doc, "div", "sp-ip-cats");

  // 网格
  const grid = el(doc, "div", "sp-ip-grid");
  grid.setAttribute("role", "listbox");
  grid.setAttribute("aria-label", "图标列表");
  // 哨兵节点：始终位于网格末尾，进入视口即触发续渲（不产生可见高度）
  const sentinel = el(doc, "div", "sp-ip-sentinel");
  sentinel.setAttribute("aria-hidden", "true");
  grid.appendChild(sentinel);

  // 底部
  const foot = el(doc, "div", "sp-ip-foot");
  const currentEl = el(doc, "span", "sp-ip-current");
  const clearBtn = el(doc, "button", "sp-ip-clear", { type: "button", textContent: "清除图标" });
  foot.append(currentEl, clearBtn);

  panel.append(head, searchWrap, cats, grid, foot);

  // ---------------------------------------------------------------- 状态
  const data = {
    emojiAll: [],
    emojiGroups: [],
    // 彩色样式（数据驱动；applyLibrary 里从 library.emoji.styles 取值，只认带 base 的）
    emojiStyles: [],
    colorStyle: null,
  };
  const state = {
    phase: "loading", // loading | ready | error
    cat: "all",
    filtered: [],
    rendered: 0,
    selected: String(currentValue || "").trim(),
    focusIndex: -1,
  };

  // ---------------------------------------------------------------- 交互辅助
  function close() {
    if (closed) return;
    closed = true;
    doc.removeEventListener("keydown", onKeyDown, true);
    if (isModal) restoreBodyScroll();
    if (root.parentNode) root.parentNode.removeChild(root);
    if (typeof onClose === "function") onClose();
  }

  function select(value) {
    state.selected = String(value || "").trim();
    updateFooter();
    markSelected();
    onSelect(state.selected);
    close();
  }

  function updateFooter() {
    const value = state.selected;
    currentEl.textContent = value ? `当前：${value}` : "当前：未选择";
    currentEl.title = value;
  }

  function markSelected() {
    const items = grid.querySelectorAll(".sp-ip-item");
    for (const item of items) {
      const isMatch = item.dataset.value === state.selected && state.selected !== "";
      item.classList.toggle("is-selected", isMatch);
      item.setAttribute("aria-selected", String(isMatch));
    }
  }

  // ---------------------------------------------------------------- 关键词过滤
  function haystackFor(item) {
    // item = [emoji, cnName, keyword, groupId, slug]
    return `${item[1]} ${item[2]} ${item[0]}`.toLowerCase();
  }

  function computeFiltered() {
    const tokens = tokenize(searchInput.value);
    const source = data.emojiAll;
    return source.filter((item) => {
      if (state.cat !== "all" && item[3] !== state.cat) return false;
      if (tokens.length === 0) return true;
      const hay = haystackFor(item);
      return tokens.every((token) => hay.includes(token));
    });
  }

  // ---------------------------------------------------------------- 渲染
  function resetGrid() {
    state.filtered = computeFiltered();
    state.rendered = 0;
    state.focusIndex = -1;
    // 清空并重新挂回哨兵，保证它始终是最后一个子节点
    grid.replaceChildren(sentinel);
    renderMore();

    // roving tabindex：网格里必须**始终有一个** tabIndex=0，否则键盘用户按 Tab 进不来网格。
    // 命中当前值就把它设为 0 并滚动到可见，否则退而把首项设为 0。
    // 这里只设 tabIndex、不调用 focus()，避免抢走搜索框的焦点。
    const matchIndex = state.selected
      ? state.filtered.findIndex((item) => valueOf(item) === state.selected)
      : -1;
    if (matchIndex >= 0 && matchIndex < state.rendered) {
      setRoving(matchIndex);
      const node = grid.querySelector(`[data-index="${matchIndex}"]`);
      if (node && node.scrollIntoView) node.scrollIntoView({ block: "nearest" });
    } else if (itemCount() > 0) {
      setRoving(0);
    }
  }

  /**
   * 把数据里的 `base`（**路径**）+ 名字 + 后缀拼成「显示与入库都用」的 URL。
   *   - base 已是绝对 URL / data URI（兼容旧产物）→ 原样拼接，绝不加 origin；
   *   - 否则用 pickerOrigin 拼成绝对 URL；pickerOrigin 为空则退回相对路径（如 `/icons/twemoji/rocket.svg`）。
   * @param {string} base
   * @param {string} name
   * @param {string} suffix
   * @returns {string}
   */
  function composeUrl(base, name, suffix) {
    const assembled = `${base}${name}${suffix}`;
    if (/^https?:\/\//i.test(base) || /^data:/i.test(base)) return assembled;
    return pickerOrigin ? `${pickerOrigin}${assembled}` : assembled;
  }

  /** item = [emoji, cnName, keyword, groupId, slug] */
  function valueOf(item) {
    const style = data.colorStyle;
    // 老数据（无 slug）退回字符本身，避免拼出 "undefined" URL
    if (style && style.base && item[4]) {
      return composeUrl(style.base, item[4], style.suffix || ".svg");
    }
    return item[0];
  }

  function renderMore() {
    if (state.phase !== "ready") return;
    const remaining = state.filtered.length - state.rendered;
    if (remaining <= 0) {
      // 空结果只挂一次占位，避免 IntersectionObserver 反复触发导致重复追加
      if (state.filtered.length === 0 && !grid.querySelector(".sp-ip-empty")) {
        grid.insertBefore(el(doc, "div", "sp-ip-empty", { textContent: "没有匹配的图标" }), sentinel);
      }
      if (observer) observer.disconnect();
      return;
    }
    const next = state.filtered.slice(state.rendered, state.rendered + ITEM_BATCH);
    const fragment = doc.createDocumentFragment();
    next.forEach((item, offset) => {
      const index = state.rendered + offset;
      const button = el(doc, "button", "sp-ip-item");
      button.type = "button";
      button.tabIndex = -1;
      button.dataset.index = String(index);
      button.dataset.value = valueOf(item);
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", "false");

      // 彩色 emoji：加载失败时回退为字符本身，避免裂图
      const img = el(doc, "img", null, { alt: "", loading: "lazy", decoding: "async" });
      img.addEventListener(
        "error",
        () => {
          if (img.parentNode) img.parentNode.replaceChild(el(doc, "span", "sp-ip-emoji", { textContent: item[0] }), img);
        },
        { once: true },
      );
      img.src = valueOf(item);
      button.title = item[1] || item[0];
      button.appendChild(img);

      if (button.dataset.value === state.selected && state.selected !== "") {
        button.classList.add("is-selected");
        button.setAttribute("aria-selected", "true");
      }

      button.addEventListener("click", () => select(button.dataset.value));
      button.addEventListener("focus", () => {
        state.focusIndex = Number(button.dataset.index);
      });
      fragment.appendChild(button);
    });
    grid.insertBefore(fragment, sentinel);
    state.rendered += next.length;
    // 还有剩余才需要观察哨兵；已渲染完则断开观察器
    if (state.rendered < state.filtered.length) {
      observeTail();
    } else if (observer) {
      observer.disconnect();
    }
  }

  // ---------------------------------------------------------------- 触底续渲
  let observer = null;
  /** 观察哨兵，进入视口时续渲下一批 */
  function observeTail() {
    if (typeof IntersectionObserver !== "function") {
      // 不支持时退化为一次性渲染（老环境兜底）
      while (state.rendered < state.filtered.length) renderMore();
      return;
    }
    if (!observer) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            observer.disconnect();
            if (state.rendered < state.filtered.length) renderMore();
          }
        },
        { root: grid, rootMargin: "120px" },
      );
    }
    observer.disconnect();
    observer.observe(sentinel);
  }

  // ---------------------------------------------------------------- 复位
  /** 复位到初始状态：全部分类、清空搜索框、重建分类胶囊与网格。 */
  function resetAll() {
    state.cat = "all";
    searchInput.placeholder = "搜索：火箭 / 国旗 / 笑脸";
    searchInput.value = "";
    buildCats();
    resetGrid();
  }

  // ---------------------------------------------------------------- 分类胶囊
  function buildCats() {
    const pills = [["all", "全部"]];
    for (const group of data.emojiGroups) pills.push([group.id, group.label]);
    const fragment = doc.createDocumentFragment();
    for (const [id, label] of pills) {
      const pill = el(doc, "button", "sp-ip-cat", { type: "button", textContent: label });
      pill.dataset.id = id;
      if (id === state.cat) pill.classList.add("is-active");
      pill.addEventListener("click", () => {
        state.cat = id;
        for (const node of cats.querySelectorAll(".sp-ip-cat")) {
          node.classList.toggle("is-active", node.dataset.id === id);
        }
        resetGrid();
      });
      fragment.appendChild(pill);
    }
    cats.replaceChildren(fragment);
  }

  // ---------------------------------------------------------------- 键盘
  function itemCount() {
    return grid.querySelectorAll(".sp-ip-item").length;
  }

  function currentColumns() {
    const template = typeof getComputedStyle === "function" ? getComputedStyle(grid).gridTemplateColumns : "";
    const cols = String(template).split(/\s+/).filter((part) => part && part !== "none").length;
    return cols > 0 ? cols : 1;
  }

  function setFocus(index) {
    setRoving(index);
    const node = grid.querySelector(`[data-index="${state.focusIndex}"]`);
    if (node && typeof node.focus === "function") node.focus({ preventScroll: true });
  }

  /** 只更新 roving tabindex（不移动焦点） */
  function setRoving(index) {
    const items = grid.querySelectorAll(".sp-ip-item");
    if (items.length === 0) return;
    const clamped = Math.max(0, Math.min(index, items.length - 1));
    items.forEach((node, i) => {
      node.tabIndex = i === clamped ? 0 : -1;
    });
    state.focusIndex = clamped;
  }

  function onKeyDown(event) {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
      return;
    }
    // 只在网格项上处理方向键 / 回车，避免影响搜索框与各按钮
    const isInGrid = Boolean(
      event.target && event.target.classList && event.target.classList.contains("sp-ip-item"),
    );
    if (!isInGrid) return;

    if (event.key === "Enter") {
      event.preventDefault();
      select(event.target.dataset.value);
      return;
    }
    const map = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -currentColumns(), ArrowDown: currentColumns() };
    if (!(event.key in map)) return;
    event.preventDefault();
    const index = state.focusIndex >= 0 ? state.focusIndex : 0;
    // 已在首行再按 ↑ → 回到搜索框（按实际列数判断是否处于首行）
    if (event.key === "ArrowUp" && index < currentColumns()) {
      searchInput.focus();
      return;
    }
    const target = index + map[event.key];
    if (target < 0) return;
    // 触底时补渲一批，让键盘可以继续往下走
    if (target >= itemCount() && state.rendered < state.filtered.length) renderMore();
    setFocus(Math.min(target, itemCount() - 1));
  }

  // ---------------------------------------------------------------- 数据就绪
  function applyLibrary(lib) {
    if (!lib || !lib.emoji) {
      throw new Error("图标库数据格式不正确。");
    }
    data.emojiGroups = Array.isArray(lib.emoji.groups) ? lib.emoji.groups : [];
    // 渲染样式由数据驱动；当前只提供彩色 emoji，取第一条带 base 的样式
    data.emojiStyles = Array.isArray(lib.emoji.styles) ? lib.emoji.styles : [];
    data.colorStyle = data.emojiStyles.find((style) => style && style.base) || null;
    if (!data.colorStyle) {
      throw new Error("图标库数据缺少可用的彩色 Emoji 样式。");
    }
    // 四元组 + 分组 id：[emoji, 中文名, 关键词, groupId, slug]
    data.emojiAll = data.emojiGroups.flatMap((group) =>
      (group.items || []).map((item) => [item[0], item[1], item[2], group.id, item[3]]),
    );
    state.phase = "ready";
    resetAll();
    updateFooter();
  }

  function showLoading() {
    state.phase = "loading";
    const wrap = el(doc, "div", "sp-ip-skeleton");
    for (let i = 0; i < 60; i += 1) wrap.appendChild(el(doc, "span"));
    grid.replaceChildren(wrap);
  }

  function showError(message) {
    state.phase = "error";
    const wrap = el(doc, "div", "sp-ip-state");
    const text = el(doc, "div", null, { textContent: message || "图标库加载失败。" });
    const retry = el(doc, "button", null, { type: "button", textContent: "重试" });
    retry.addEventListener("click", () => startLoad());
    wrap.append(text, retry);
    grid.replaceChildren(wrap);
  }

  let loading = false;
  function startLoad() {
    if (library) {
      applyLibrary(library);
      return;
    }
    if (loading) return;
    loading = true;
    showLoading();
    loadLibraryFromUrl(libraryUrl)
      .then((lib) => {
        loading = false;
        applyLibrary(lib);
      })
      .catch((error) => {
        loading = false;
        showError((error && error.message) || String(error));
      });
  }

  // ---------------------------------------------------------------- 事件绑定
  closeBtn.addEventListener("click", close);
  clearBtn.addEventListener("click", () => select(""));
  let searchTimer = null;
  searchInput.addEventListener("input", () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(resetGrid, 120);
  });
  // 搜索框按 ↓ → 进入网格首项（否则键盘用户要从搜索框 Tab 出去才能到网格）
  searchInput.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown") return;
    if (itemCount() === 0) return;
    event.preventDefault();
    setFocus(0);
  });
  if (isModal) {
    root.addEventListener("click", (event) => {
      // 点击遮罩空白处关闭
      if (event.target === root) close();
    });
  }
  doc.addEventListener("keydown", onKeyDown, true);

  // ---------------------------------------------------------------- 挂载
  let savedOverflow = "";
  function lockBodyScroll() {
    savedOverflow = doc.body.style.overflow;
    doc.body.style.overflow = "hidden";
  }
  function restoreBodyScroll() {
    doc.body.style.overflow = savedOverflow;
  }

  if (isModal) {
    lockBodyScroll();
    doc.body.appendChild(root);
  } else if (container) {
    container.appendChild(root);
  } else {
    throw new Error("panel 模式必须提供 container。");
  }

  startLoad();
  updateFooter();
  if (searchInput.focus) {
    try {
      searchInput.focus({ preventScroll: true });
    } catch (error) {
      /* 某些宿主不允许聚焦，忽略即可 */
    }
  }

  return {
    /** 彻底销毁（等同 close 后再清理 DOM 引用） */
    destroy() {
      close();
    },
    /** 关闭选择器 */
    close,
  };
}
