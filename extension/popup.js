/**
 * SimPage 快速添加 · 弹窗逻辑
 *
 * 打开流程：
 *   1. 读本地配置，未配置则引导去设置页
 *   2. 取当前标签页，注入脚本抓取标题 / 描述 / 图标
 *   3. 回填表单，异步刷新分类候选（失败静默）
 * 保存：POST /api/bookmarks —— 只追加一条，不需要持有完整数据集。
 */

import { ApiError, addBookmark, fetchCategories, fetchLogo, readConfig } from "./lib/api.js";

const NAME_MAX = 60;
const DESCRIPTION_MAX = 200;
const CATEGORY_MAX = 24;

const els = {
  siteLabel: document.getElementById("site-label"),
  openOptions: document.getElementById("open-options"),
  gotoOptions: document.getElementById("goto-options"),

  unconfigured: document.getElementById("view-unconfigured"),
  blocked: document.getElementById("view-blocked"),
  blockedReason: document.getElementById("blocked-reason"),
  form: document.getElementById("view-form"),

  pageIcon: document.getElementById("page-icon"),
  pageTitle: document.getElementById("page-title"),
  pageUrl: document.getElementById("page-url"),

  name: document.getElementById("field-name"),
  url: document.getElementById("field-url"),
  description: document.getElementById("field-description"),
  icon: document.getElementById("field-icon"),
  category: document.getElementById("field-category"),
  categoryOptions: document.getElementById("category-options"),

  refetch: document.getElementById("refetch"),
  save: document.getElementById("save"),
  openSite: document.getElementById("open-site"),
  status: document.getElementById("status"),
};

/** 页面上下文，保存时用于回填与提示 */
const state = {
  siteUrl: "",
  saved: false,
};

// =================================================================================
// 工具函数
// =================================================================================

/**
 * 折叠空白、剔除控制字符并截断到指定长度。
 * 网页标题/描述里常混入换行与大量空白（甚至整段导航链接），直接写库会很难看。
 * @param {*} value
 * @param {number} maxLength 上限；非有限数时只做清洗不做截断
 * @returns {string}
 */
function sanitiseText(value, maxLength) {
  if (typeof value !== "string") return "";
  const collapsed = value
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!collapsed) return "";
  if (!Number.isFinite(maxLength) || collapsed.length <= maxLength) return collapsed;
  return `${collapsed.slice(0, maxLength).trim()}…`;
}

/**
 * 返回第一个非空字符串（已 trim）。
 * @param {...*} values
 * @returns {string}
 */
function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

/**
 * 图标值是否可直接作为图片地址（与前台 main.js:653 的判定保持一致）。
 * @param {string} value
 * @returns {boolean}
 */
function isImageIcon(value) {
  return /^https?:\/\//i.test(value) || value.startsWith("data:image/");
}

/**
 * 从错误对象取出可展示文案。
 * @param {*} error
 * @returns {string}
 */
function messageOf(error) {
  if (error instanceof ApiError) return error.message;
  return String((error && error.message) || error || "未知错误");
}

// =================================================================================
// 视图切换
// =================================================================================

/**
 * 只显示一个面板。
 * @param {"unconfigured" | "blocked" | "form"} name
 */
function showView(name) {
  els.unconfigured.hidden = name !== "unconfigured";
  els.blocked.hidden = name !== "blocked";
  els.form.hidden = name !== "form";
}

/**
 * 设置底部状态提示。
 * @param {string} message
 * @param {"success" | "warning" | "error" | "info"} [tone]
 */
function setStatus(message, tone = "info") {
  if (!message) {
    els.status.hidden = true;
    return;
  }
  els.status.textContent = message;
  els.status.className = `status is-${tone}`;
  els.status.hidden = false;
}

/**
 * 用占位文字（emoji 或 🔖）渲染图标位。
 * @param {string} icon
 */
function renderIconPlaceholder(icon) {
  els.pageIcon.replaceChildren(document.createTextNode(icon ? Array.from(icon)[0] : "🔖"));
  els.pageIcon.classList.add("is-fallback");
}

/**
 * 刷新「当前页」卡片里的图标预览。
 *
 * 图标位是容器而非 <img>：因为 `<img>` 无法渲染文本子节点，emoji 占位永远显示不出来。
 * 图片加载失败（404 / 连不上）时自动退回占位符，避免界面出现裂图。
 *
 * @param {string} value emoji 或图片地址
 */
function renderIconPreview(value) {
  const icon = String(value || "").trim();
  els.pageIcon.replaceChildren();

  if (isImageIcon(icon)) {
    const img = document.createElement("img");
    img.alt = "";
    img.addEventListener(
      "error",
      () => {
        renderIconPlaceholder("");
      },
      { once: true },
    );
    img.src = icon;
    els.pageIcon.appendChild(img);
    els.pageIcon.classList.remove("is-fallback");
    return;
  }

  renderIconPlaceholder(icon);
}

/**
 * 渲染分类候选（datalist）。
 * @param {string[]} categories
 */
function renderCategoryOptions(categories) {
  const fragment = document.createDocumentFragment();
  (Array.isArray(categories) ? categories : []).forEach((label) => {
    const option = document.createElement("option");
    option.value = label;
    fragment.appendChild(option);
  });
  els.categoryOptions.replaceChildren(fragment);
}

/**
 * 切换保存中的忙碌态；已保存后按钮保持禁用并落到终态文案。
 * @param {boolean} busy
 */
function setBusy(busy) {
  if (state.saved) {
    els.save.disabled = true;
    els.save.textContent = "已保存";
    els.refetch.disabled = true;
    return;
  }
  els.save.disabled = busy;
  els.refetch.disabled = busy;
  els.save.textContent = busy ? "保存中…" : "保存到 SimPage";
}

// =================================================================================
// 读取当前标签页
// =================================================================================

/**
 * 注入到目标页面执行：抓取标题、描述与图标。
 *
 * 注意：本函数会被序列化后送进页面，**不能引用模块作用域的任何变量**。
 * @returns {{title: string, description: string, icon: string, url: string}}
 */
function extractPageMeta() {
  const fromMeta = (key, attribute) => {
    const node = document.querySelector(`meta[${attribute}="${key}"]`);
    const value = node && node.getAttribute("content");
    return typeof value === "string" ? value.trim() : "";
  };

  const pickIconHref = () => {
    const selectors = [
      'link[rel~="icon"][href]',
      'link[rel="apple-touch-icon"][href]',
      'link[rel="apple-touch-icon-precomposed"][href]',
      'link[rel="mask-icon"][href]',
    ];
    for (const selector of selectors) {
      const node = document.querySelector(selector);
      const href = node && node.getAttribute("href");
      if (href && href.trim()) return href.trim();
    }
    return "";
  };

  let icon = "";
  try {
    const href = pickIconHref();
    if (href) icon = new URL(href, location.href).href;
  } catch (error) {
    icon = "";
  }
  if (!icon) {
    try {
      icon = new URL("/favicon.ico", location.origin).href;
    } catch (error) {
      icon = "";
    }
  }

  // 纯锚点（#section 且页面上确有该 id）通常不是想收藏的目标，去掉它；
  // 而 #/path 这类前端路由的 hash 必须保留，否则链接会失效。
  let url = location.href;
  const hash = location.hash || "";
  if (hash.length > 1 && !/^#[/!]/.test(hash)) {
    const id = hash.slice(1);
    try {
      if (document.getElementById(id) || document.getElementsByName(id).length > 0) {
        url = `${location.origin}${location.pathname}${location.search}`;
      }
    } catch (error) {
      /* 忽略选择器异常，保留原 URL */
    }
  }

  return {
    title: (document.title || "").trim(),
    description:
      fromMeta("description", "name") ||
      fromMeta("og:description", "property") ||
      fromMeta("twitter:description", "name"),
    icon,
    url,
  };
}

/**
 * 取得当前标签页的可添加信息。
 * @returns {Promise<{ok: true, data: object} | {ok: false, reason: string}>}
 */
async function readActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs && tabs[0];
  if (!tab) return { ok: false, reason: "读不到当前标签页。" };

  const url = firstNonEmpty(tab.url, tab.pendingUrl);
  if (!url) {
    return { ok: false, reason: "浏览器没有授予读取当前标签页的权限，请重新点一次工具栏图标。" };
  }
  if (!/^https?:\/\//i.test(url)) {
    const scheme = url.split(":")[0];
    return { ok: false, reason: `只有普通网页（http/https）可以添加，当前是 ${scheme}: 页面。` };
  }

  let meta = null;
  try {
    const [injected] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPageMeta,
    });
    meta = injected && injected.result;
  } catch (error) {
    // 受限页面（应用商店、内置查看器等）注入会失败，此时退回标签页自带信息
    console.warn("[SimPage] 无法注入页面脚本：", (error && error.message) || error);
  }

  return {
    ok: true,
    data: {
      title: firstNonEmpty(meta && meta.title, tab.title),
      url: firstNonEmpty(meta && meta.url, url),
      description: firstNonEmpty(meta && meta.description),
      icon: firstNonEmpty(meta && meta.icon),
      tabIcon: firstNonEmpty(tab.favIconUrl),
    },
  };
}

// =================================================================================
// 初始化
// =================================================================================

/**
 * 用标签页信息回填表单。
 * @param {object} info
 * @param {string} defaultCategory
 */
function fillForm(info, defaultCategory) {
  const name = sanitiseText(info.title, NAME_MAX);
  const url = info.url;
  const description = sanitiseText(info.description, DESCRIPTION_MAX);

  els.name.value = name;
  els.url.value = url;
  els.description.value = description;
  els.category.value = defaultCategory;

  // 只把「可直接当图片地址」的图标写进输入框；data: 图标只用于预览，避免超长串污染数据
  const iconForField = isImageIcon(info.icon) ? info.icon : "";
  els.icon.value = iconForField;
  els.icon.title = iconForField;

  const preview = iconForField || info.tabIcon || "";
  renderIconPreview(preview);

  els.pageTitle.textContent = name || url;
  els.pageTitle.title = name;
  els.pageUrl.textContent = url;
  els.pageUrl.title = url;
}

/**
 * 入口。
 */
async function main() {
  els.openOptions.addEventListener("click", () => chrome.runtime.openOptionsPage());
  els.gotoOptions.addEventListener("click", () => chrome.runtime.openOptionsPage());

  const config = await readConfig();
  state.siteUrl = config.siteUrl;
  els.siteLabel.textContent = config.siteUrl ? new URL(config.siteUrl).host : "未配置";

  if (!config.siteUrl || !config.password) {
    showView("unconfigured");
    return;
  }

  const tabResult = await readActiveTab();
  if (!tabResult.ok) {
    els.blockedReason.textContent = tabResult.reason;
    showView("blocked");
    return;
  }

  const info = tabResult.data;
  let defaultCategory = config.defaultCategory;
  if (defaultCategory && Array.isArray(config.categories) && config.categories.length > 0) {
    const known = config.categories.some(
      (item) => item.toLowerCase() === defaultCategory.toLowerCase(),
    );
    if (!known) defaultCategory = "";
  }

  fillForm(info, defaultCategory);
  renderCategoryOptions(config.categories);
  showView("form");

  els.save.addEventListener("click", handleSave);
  els.refetch.addEventListener("click", handleRefetch);
  els.icon.addEventListener("input", () => {
    els.icon.title = els.icon.value.trim();
    renderIconPreview(els.icon.value.trim() || info.tabIcon || "");
  });

  // 分类候选走 /api/admin/data（不递增访客计数），失败静默沿用本地缓存
  fetchCategories()
    .then((categories) => {
      renderCategoryOptions(categories);
      if (defaultCategory && categories.length > 0) return;
      const preferred = categories.find(
        (item) => item.toLowerCase() === config.defaultCategory.toLowerCase(),
      );
      if (preferred && !els.category.value) els.category.value = preferred;
    })
    .catch((error) => {
      console.warn("[SimPage] 拉取分类失败：", messageOf(error));
      if (error instanceof ApiError && error.status === 401) {
        setStatus("管理员密码似乎已变更，请到设置里更新。", "warning");
      }
    });
}

// =================================================================================
// 交互
// =================================================================================

/**
 * 保存书签。
 */
async function handleSave() {
  if (state.saved) return;

  const name = els.name.value.trim();
  const url = els.url.value.trim();
  if (!name) {
    setStatus("请填写名称。", "error");
    els.name.focus();
    return;
  }
  if (!url) {
    setStatus("请填写地址。", "error");
    els.url.focus();
    return;
  }

  setBusy(true);
  setStatus("正在保存…", "info");

  try {
    const result = await addBookmark({
      name: sanitiseText(name, NAME_MAX),
      url,
      description: sanitiseText(els.description.value, DESCRIPTION_MAX),
      icon: els.icon.value.trim(),
      category: sanitiseText(els.category.value, CATEGORY_MAX),
    });

    state.saved = true;
    const category = result.item && result.item.category ? ` · ${result.item.category}` : "";
    setStatus(`已添加到 SimPage${category}，当前共 ${result.total} 条书签。`, "success");
    els.openSite.href = state.siteUrl;
    els.openSite.hidden = false;
    setBusy(false);
  } catch (error) {
    setBusy(false);

    if (error instanceof ApiError && error.code === "duplicate") {
      setStatus(error.message, "warning");
      return;
    }
    if (error instanceof ApiError && error.status === 401) {
      setStatus("登录状态失效，请到设置里检查管理员密码。", "error");
      return;
    }
    setStatus(messageOf(error), "error");
  }
}

/**
 * 调用站点自带的图标服务补全标题 / 描述 / 图标。
 * 只填空字段（避免覆盖用户已改的内容），但图标以服务端结果为准。
 */
async function handleRefetch() {
  const target = els.url.value.trim();
  if (!target) {
    setStatus("请先填写地址。", "error");
    return;
  }

  els.refetch.disabled = true;
  setStatus("正在向图标服务请求，跨境链路偶有波动，请稍候…", "info");

  try {
    const result = await fetchLogo(target);

    if (result.title && !els.name.value.trim()) {
      els.name.value = sanitiseText(result.title, NAME_MAX);
    }
    if (result.description && !els.description.value.trim()) {
      els.description.value = sanitiseText(result.description, DESCRIPTION_MAX);
    }
    if (result.faviconUrl) {
      els.icon.value = result.faviconUrl;
      els.icon.title = result.faviconUrl;
      renderIconPreview(result.faviconUrl);
    }

    if (result.degraded) {
      setStatus(result.message || "图标服务暂时不可用，已按站点自身地址填入图标。", "warning");
    } else {
      setStatus("信息已补全，确认后保存。", "success");
    }
  } catch (error) {
    setStatus(messageOf(error), "error");
  } finally {
    els.refetch.disabled = false;
  }
}

main().catch((error) => {
  console.error("[SimPage] 弹窗初始化失败：", error);
  els.blockedReason.textContent = messageOf(error);
  showView("blocked");
});
