import { renderMarkdown } from "./markdown.js";

const appsEditor = document.getElementById("apps-editor");
const bookmarksEditor = document.getElementById("bookmarks-editor");
const addButtons = document.querySelectorAll(".add-button");
const saveButton = document.getElementById("save-button");
const reloadButton = document.getElementById("reload-button");
const statusBar = document.getElementById("status-bar");
const modal = document.getElementById("editor-modal");
const modalForm = document.getElementById("editor-form");
const modalTitle = document.getElementById("editor-modal-title");
const modalError = document.getElementById("editor-error");
const modalHint = document.getElementById("editor-hint");
const modalNameInput = document.getElementById("editor-name");
const modalUrlInput = document.getElementById("editor-url");
const modalDescriptionInput = document.getElementById("editor-description");
const modalIconInput = document.getElementById("editor-icon");
const modalCategoryField = document.getElementById("editor-category-field");
const modalCategoryInput = document.getElementById("editor-category");
const modalCategoryPlaceholder =
  modalCategoryField ? document.createComment("modal-category-placeholder") : null;

if (modalCategoryField && modalCategoryPlaceholder && modalCategoryField.parentNode) {
  modalCategoryField.replaceWith(modalCategoryPlaceholder);
  if (modalCategoryInput) {
    modalCategoryInput.disabled = true;
  }
}

const modalCancelButton = document.getElementById("editor-cancel-button");
const modalCloseButton = document.getElementById("editor-close-button");
const modalOverlay = document.getElementById("editor-modal-overlay");
const siteNameInput = document.getElementById("site-name");
const siteLogoInput = document.getElementById("site-logo");
const siteGreetingInput = document.getElementById("site-greeting");
const siteFooterInput = document.getElementById("site-footer-content");
const siteFooterPreview = document.getElementById("site-footer-preview");
const siteWeatherCityInput = document.getElementById("site-weather-city");
const siteWeatherSummary = document.getElementById("site-weather-summary");
const siteCategoriesInput = document.getElementById("site-categories");
const categorySuggestions = document.getElementById("category-suggestions");
const authOverlay = document.getElementById("auth-overlay");
const loginForm = document.getElementById("login-form");
const loginPasswordInput = document.getElementById("login-password");
const loginError = document.getElementById("login-error");
const logoutButton = document.getElementById("logout-button");
const passwordForm = document.getElementById("password-form");
const currentPasswordInput = document.getElementById("current-password");
const newPasswordInput = document.getElementById("new-password");
const confirmPasswordInput = document.getElementById("confirm-password");
const passwordMessage = document.getElementById("password-message");
const backToTopButton = document.getElementById("back-to-top");
const faviconLink = document.getElementById("site-favicon");
const backToAppsButton = document.getElementById("back-to-apps-button");
const backToBookmarksButton = document.getElementById("back-to-bookmarks-button");

const typeLabels = {
  apps: "应用",
  bookmarks: "书签",
};

function replaceChildrenSafe(target, ...nodes) {
  if (!target) return;
  if (typeof target.replaceChildren === "function") {
    target.replaceChildren(...nodes);
    return;
  }
  target.innerHTML = "";
  nodes.forEach((node) => {
    if (node) {
      target.appendChild(node);
    }
  });
}

const STORAGE_KEY = "modern-navigation-admin-token";
const DATA_ENDPOINT = "/api/admin/data";
const LOGIN_ENDPOINT = "/api/login";
const PASSWORD_ENDPOINT = "/api/admin/password";

const defaultDocumentTitle = document.title || "导航后台编辑";
const defaultFaviconHref = faviconLink?.getAttribute("href") || "data:,";
const defaultFaviconType = faviconLink?.getAttribute("type") || "";
const defaultFaviconSizes = faviconLink?.getAttribute("sizes") || "";
const DEFAULT_FAVICON_SYMBOL = "🧭";
const ADMIN_TITLE_SUFFIX = " · 后台管理";
const faviconCache = new Map();
const BACK_TO_TOP_THRESHOLD = 320;

const DEFAULT_WEATHER_SETTINGS = {
  city: "北京",
};

// 单个分类名的长度上限与分类数量上限；与后端 CATEGORY_MAX_* 保持一致
const CATEGORY_MAX_LENGTH = 24;
const CATEGORY_MAX_COUNT = 30;

const defaultSettings = {
  siteName: siteNameInput && siteNameInput.value.trim() ? siteNameInput.value.trim() : "SimPage",
  siteLogo: siteLogoInput && siteLogoInput.value.trim() ? siteLogoInput.value.trim() : "",
  greeting: siteGreetingInput && siteGreetingInput.value.trim() ? siteGreetingInput.value.trim() : "",
  footer: siteFooterInput && siteFooterInput.value ? normaliseFooterValue(siteFooterInput.value) : "",
  weather: createDefaultWeatherSettings(),
  categories: [],
};

const state = {
  apps: [],
  bookmarks: [],
  settings: {
    siteName: defaultSettings.siteName,
    siteLogo: defaultSettings.siteLogo,
    greeting: defaultSettings.greeting,
    footer: defaultSettings.footer,
    weather: { ...defaultSettings.weather },
    categories: [...defaultSettings.categories],
  },
};

let authToken = "";
let isDirty = false;
let modalContext = null;
// 拖拽排序进行中的上下文；未拖拽时为 null。存放 { type, index }。
let draggingContext = null;

function setStatus(message, variant = "neutral") {
  if (!statusBar) return;
  statusBar.textContent = message;
  if (variant === "neutral") {
    statusBar.removeAttribute("data-variant");
  } else {
    statusBar.dataset.variant = variant;
  }
}

function markDirty() {
  if (!isDirty) {
    isDirty = true;
    if (saveButton) {
      saveButton.disabled = false;
    }
  }
}

function resetDirty() {
  isDirty = false;
  if (saveButton) {
    saveButton.disabled = true;
  }
}

function createBlankItem(type) {
  return {
    id: "",
    name: "",
    url: "",
    description: "",
    icon: "",
    ...(type === "bookmarks" ? { category: "" } : {}),
  };
}

function normaliseIncoming(collection, type) {
  if (!Array.isArray(collection)) return [];
  return collection.map((item) => ({
    id: typeof item.id === "string" ? item.id : "",
    name: typeof item.name === "string" ? item.name : "",
    url: typeof item.url === "string" ? item.url : "",
    description: typeof item.description === "string" ? item.description : "",
    icon: typeof item.icon === "string" ? item.icon : "",
    ...(type === "bookmarks"
      ? { category: typeof item.category === "string" ? item.category : "" }
      : {}),
  }));
}

function normaliseFooterValue(value) {
  if (typeof value !== "string") {
    return "";
  }
  const normalised = value.replace(/\r\n?/g, "\n");
  return normalised.trim() ? normalised : "";
}

function normaliseSettingsIncoming(input) {
  const prepared = {
    siteName: defaultSettings.siteName,
    siteLogo: defaultSettings.siteLogo,
    greeting: defaultSettings.greeting,
    footer: defaultSettings.footer,
    weather: { ...defaultSettings.weather },
    categories: [...defaultSettings.categories],
  };

  if (!input || typeof input !== "object") {
    return prepared;
  }

  if (typeof input.siteName === "string" && input.siteName.trim()) {
    prepared.siteName = input.siteName.trim();
  }
  if (typeof input.siteLogo === "string") {
    prepared.siteLogo = input.siteLogo.trim();
  }
  if (typeof input.greeting === "string") {
    prepared.greeting = input.greeting.trim();
  }
  if (typeof input.footer === "string") {
    prepared.footer = normaliseFooterValue(input.footer);
  }

  if (input.weather && typeof input.weather === "object") {
    prepared.weather = normaliseWeatherSettingsIncoming(input.weather);
  } else if (input.weatherLocation && typeof input.weatherLocation === "object") {
    prepared.weather = normaliseWeatherSettingsIncoming({ weatherLocation: input.weatherLocation });
  } else {
    prepared.weather = normaliseWeatherSettingsIncoming(null);
  }

  prepared.categories = parseCategoryList(input.categories);

  return prepared;
}

function createDefaultWeatherSettings() {
  return {
    city: DEFAULT_WEATHER_SETTINGS.city,
  };
}

/**
 * 解析分类列表，规则与后端 normaliseCategoriesInput 保持一致。
 *
 * 接受数组或 `|` 分隔的字符串（兼容全角竖线、逗号、换行），统一 trim、
 * 丢弃空值与超长项、按大小写不敏感去重并保留首次出现的原形，最后截断数量。
 *
 * @param {*} raw 原始值，可为数组、字符串或其它类型
 * @returns {string[]} 规范化后的分类列表
 */
function parseCategoryList(raw) {
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
    ? raw.split(/[|｜,，\n\r]+/)
    : [];

  const seen = new Set();
  const result = [];
  list.forEach((entry) => {
    if (typeof entry !== "string") return;
    const label = entry.trim();
    if (!label || label.length > CATEGORY_MAX_LENGTH) return;
    const key = label.toLowerCase();
    if (seen.has(key)) return;
    if (result.length >= CATEGORY_MAX_COUNT) return;
    seen.add(key);
    result.push(label);
  });
  return result;
}

/**
 * 把分类列表渲染成输入框里的文本（`|` 分隔）。
 * @param {string[]} list
 * @returns {string}
 */
function formatCategoriesText(list) {
  if (!Array.isArray(list)) return "";
  return list
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .join("|");
}

function normaliseWeatherSettingsIncoming(raw) {
  const fallback = createDefaultWeatherSettings();
  if (!raw || typeof raw !== "object") {
    return { ...fallback };
  }

  if (raw.weatherLocation && typeof raw.weatherLocation === "object") {
    const legacy = raw.weatherLocation;
    const city =
      typeof legacy.label === "string" && legacy.label.trim()
        ? legacy.label.trim()
        : typeof legacy.id === "string" && legacy.id.trim()
        ? legacy.id.trim()
        : "";
    return {
      city: city || fallback.city,
    };
  }

  const weather = { ...fallback };

  if (typeof raw.city === "string" && raw.city.trim()) {
    weather.city = raw.city.trim();
  } else if (typeof raw.label === "string" && raw.label.trim()) {
    weather.city = raw.label.trim();
  } else if (typeof raw.name === "string" && raw.name.trim()) {
    weather.city = raw.name.trim();
  }

  if (!weather.city) {
    weather.city = fallback.city;
  }

  return weather;
}

function collectWeatherSettingsFromInputs(previous = state.settings.weather) {
  const base =
    previous && typeof previous === "object" ? { ...previous } : createDefaultWeatherSettings();

  const cityRaw = siteWeatherCityInput ? siteWeatherCityInput.value : "";

  return {
    ...base,
    city: cityRaw.trim(),
  };
}

function updateWeatherSummary(weather) {
  if (!siteWeatherSummary) return;

  const city = typeof weather?.city === "string" ? weather.city.trim() : "";

  if (!city) {
    siteWeatherSummary.textContent = "请填写城市名称，以便显示天气信息。";
    return;
  }

  siteWeatherSummary.textContent = `${city} · 使用 Open-Meteo 免费天气服务。`;
}

function handleWeatherInputChange() {
  const nextWeather = collectWeatherSettingsFromInputs();
  state.settings.weather = nextWeather;
  updateWeatherSummary(nextWeather);
  markDirty();
  setStatus("天气配置已更新，记得保存。", "neutral");
}

function validateWeatherSettings(weather) {
  const resolved = weather && typeof weather === "object" ? weather : createDefaultWeatherSettings();
  const city = typeof resolved.city === "string" ? resolved.city.trim() : "";
  if (!city) {
    return { valid: false, message: "请填写天气城市。", focus: siteWeatherCityInput };
  }
  return {
    valid: true,
    value: {
      city,
    },
  };
}

function buildWeatherPayload(weather) {
  const city = typeof weather?.city === "string" ? weather.city.trim() : "";
  return { city };
}

function updateFooterPreview(content) {
  if (!siteFooterPreview) return;
  const clean = normaliseFooterValue(content);
  if (!clean) {
    siteFooterPreview.innerHTML = "<span class=\"footer-preview-empty\">暂无内容</span>";
    return;
  }
  siteFooterPreview.innerHTML = renderMarkdown(clean);
}

function applySettingsToInputs(settings) {
  if (siteNameInput) siteNameInput.value = settings.siteName || "";
  if (siteLogoInput) siteLogoInput.value = settings.siteLogo || "";
  if (siteGreetingInput) siteGreetingInput.value = settings.greeting || "";
  if (siteFooterInput) siteFooterInput.value = settings.footer || "";
  updateFooterPreview(settings.footer);

  const normalisedWeather = normaliseWeatherSettingsIncoming(settings.weather);
  state.settings.weather = normalisedWeather;

  if (siteWeatherCityInput) {
    siteWeatherCityInput.value = normalisedWeather.city || "";
  }

  updateWeatherSummary(normalisedWeather);

  state.settings.categories = parseCategoryList(settings.categories);
  if (siteCategoriesInput) {
    siteCategoriesInput.value = formatCategoriesText(state.settings.categories);
  }
  updateCategorySuggestions();

  updatePageIdentity(settings);
}

function handleSettingsChange(field, value) {
  if (!state.settings) return;
  let nextValue = value;
  if (field === "footer") {
    nextValue = normaliseFooterValue(value);
    updateFooterPreview(nextValue);
  } else if (field === "categories") {
    nextValue = parseCategoryList(value);
  }
  state.settings[field] = nextValue;
  // 必须在写入 state 之后再刷新候选，否则读到的仍是上一次的分类
  if (field === "categories") {
    updateCategorySuggestions();
  }
  updatePageIdentity(state.settings);
  markDirty();
  setStatus("站点信息已更新，记得保存。", "neutral");
}

function updatePageIdentity(settings) {
  const siteName = settings?.siteName;
  const siteLogo = settings?.siteLogo;
  updateDocumentTitle(siteName);
  updateFavicon(siteLogo, siteName);
}

function updateDocumentTitle(siteName) {
  const clean = typeof siteName === "string" ? siteName.trim() : "";
  document.title = clean ? `${clean}${ADMIN_TITLE_SUFFIX}` : defaultDocumentTitle;
}

function applyDefaultFavicon() {
  if (!faviconLink) return false;
  if (!defaultFaviconHref || defaultFaviconHref === "data:,") {
    return false;
  }
  faviconLink.href = defaultFaviconHref;
  if (defaultFaviconType) {
    faviconLink.setAttribute("type", defaultFaviconType);
  } else {
    faviconLink.removeAttribute("type");
  }
  if (defaultFaviconSizes) {
    faviconLink.setAttribute("sizes", defaultFaviconSizes);
  } else {
    faviconLink.removeAttribute("sizes");
  }
  return true;
}

function updateFavicon(rawValue, siteName) {
  if (!faviconLink) return;
  const cleanValue = typeof rawValue === "string" ? rawValue.trim() : "";

  if (cleanValue) {
    if (isLogoUrl(cleanValue)) {
      faviconLink.href = cleanValue;
      faviconLink.removeAttribute("type");
      faviconLink.removeAttribute("sizes");
      return;
    }

    const emojiUrl = createEmojiFavicon(cleanValue);
    if (emojiUrl) {
      faviconLink.href = emojiUrl;
      faviconLink.setAttribute("type", "image/png");
      faviconLink.setAttribute("sizes", "64x64");
      return;
    }
  }

  if (applyDefaultFavicon()) {
    return;
  }

  const fallbackUrl = createEmojiFavicon(deriveFaviconSymbol(siteName));
  if (fallbackUrl) {
    faviconLink.href = fallbackUrl;
    faviconLink.setAttribute("type", "image/png");
    faviconLink.setAttribute("sizes", "64x64");
    return;
  }

  if (defaultFaviconHref) {
    faviconLink.href = defaultFaviconHref;
  } else {
    faviconLink.href = "data:,";
  }
  faviconLink.removeAttribute("type");
  faviconLink.removeAttribute("sizes");
}

function deriveFaviconSymbol(siteName) {
  if (typeof siteName === "string" && siteName.trim()) {
    const units = Array.from(siteName.trim());
    if (units.length > 0) {
      return units[0];
    }
  }
  return DEFAULT_FAVICON_SYMBOL;
}

function createEmojiFavicon(symbolValue) {
  const base = typeof symbolValue === "string" ? symbolValue.trim() : "";
  const units = base ? Array.from(base) : [];
  const symbol = units.length > 0 ? units[0] : DEFAULT_FAVICON_SYMBOL;

  if (faviconCache.has(symbol)) {
    return faviconCache.get(symbol);
  }

  const canvas = document.createElement("canvas");
  const size = 64;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  context.clearRect(0, 0, size, size);
  context.fillStyle = "rgba(0, 0, 0, 0)";
  context.fillRect(0, 0, size, size);
  context.font = `${Math.round(size * 0.7)}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#111827";
  context.fillText(symbol, size / 2, size / 2);

  const dataUrl = canvas.toDataURL("image/png");
  faviconCache.set(symbol, dataUrl);
  return dataUrl;
}

function isLogoUrl(value) {
  return typeof value === "string" && (/^https?:\/\//i.test(value) || value.startsWith("data:"));
}

function render() {
  // 重绘会换掉整张表，旧的拖拽上下文（行索引）随之失效，必须先复位
  resetSortState();
  renderList("apps", appsEditor, state.apps);
  renderList("bookmarks", bookmarksEditor, state.bookmarks);
  updateCategorySuggestions();
}

function renderList(type, container, items) {
  if (!container) return;

  if (!Array.isArray(items) || !items.length) {
    const hint = document.createElement("p");
    hint.className = "empty-hint";
    hint.textContent =
      type === "apps" ? "暂无应用，点击上方按钮添加。" : "暂无书签，点击上方按钮添加。";
    replaceChildrenSafe(container, hint);
    return;
  }

  const columns = getTableColumns(type);
  const wrapper = document.createElement("div");
  wrapper.className = "admin-table-wrapper";

  const scroller = document.createElement("div");
  scroller.className = "admin-table-scroll";

  const table = document.createElement("table");
  table.className = `admin-table admin-table-${type}`;

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  columns.forEach((column) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.dataset.column = column.key;
    th.textContent = column.label;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  const rowsFragment = document.createDocumentFragment();
  items.forEach((item, index) => {
    rowsFragment.appendChild(buildTableRow(type, item, index, columns));
  });
  tbody.appendChild(rowsFragment);
  bindSortDropping(type, tbody);
  table.appendChild(tbody);

  scroller.appendChild(table);
  wrapper.appendChild(scroller);
  replaceChildrenSafe(container, wrapper);
}

/**
 * 刷新分类候选（datalist）。
 *
 * 优先使用「站点信息」里配置的分类，并保持配置的先后顺序；数据里已存在、
 * 但配置未覆盖的分类追加在后，避免历史数据在候选里消失。若完全没有配置
 * （老数据或管理员主动清空），则回退为改动前的行为：全部取自现有书签并按名称排序。
 */
function updateCategorySuggestions() {
  if (!categorySuggestions) return;

  const configured = parseCategoryList(state.settings?.categories);
  const seen = new Set(configured.map((label) => label.toLowerCase()));
  const extras = [];

  state.bookmarks.forEach((item) => {
    const label = typeof item.category === "string" ? item.category.trim() : "";
    if (!label) return;
    const key = label.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    extras.push(label);
  });

  const tail = configured.length ? extras : extras.sort((a, b) => a.localeCompare(b, "zh-CN"));

  const fragment = document.createDocumentFragment();
  [...configured, ...tail].forEach((label) => {
    const option = document.createElement("option");
    option.value = label;
    fragment.appendChild(option);
  });
  replaceChildrenSafe(categorySuggestions, fragment);
}

function getTableColumns(type) {
  // 首列是拖拽手柄（键盘用户可聚焦后用 ↑ ↓ 移动），无内容需要展示
  const sortColumn = { key: "sort", label: "排序" };

  if (type === "bookmarks") {
    return [
      sortColumn,
      { key: "name", label: "名称" },
      { key: "category", label: "分类" },
      { key: "description", label: "描述" },
      { key: "url", label: "链接" },
      { key: "actions", label: "操作" },
    ];
  }

  return [
    sortColumn,
    { key: "name", label: "名称" },
    { key: "description", label: "描述" },
    { key: "url", label: "链接" },
    { key: "actions", label: "操作" },
  ];
}

function buildTableRow(type, item, index, columns) {
  const row = document.createElement("tr");
  row.dataset.clickable = "true";
  // 拖拽落点要靠 dataset.index 反查行，重绘后也会随之更新
  row.dataset.index = String(index);
  row.tabIndex = 0;

  columns.forEach((column) => {
    const cell = document.createElement("td");
    cell.dataset.column = column.key;

    switch (column.key) {
      case "sort": {
        cell.appendChild(createSortHandle(type, index));
        break;
      }
      case "name": {
        cell.appendChild(createNameCell(type, item, index));
        break;
      }
      case "category": {
        const label = typeof item.category === "string" ? item.category.trim() : "";
        cell.textContent = label || "—";
        break;
      }
      case "description": {
        const description = typeof item.description === "string" ? item.description.trim() : "";
        cell.textContent = description || "—";
        break;
      }
      case "url": {
        const url = typeof item.url === "string" ? item.url.trim() : "";
        cell.textContent = url || "—";
        if (url) {
          cell.title = url;
        }
        break;
      }
      case "actions": {
        cell.appendChild(createActionCell(type, index));
        break;
      }
      default: {
        cell.textContent = "";
      }
    }

    row.appendChild(cell);
  });

  row.addEventListener("click", (event) => {
    if (event.target.closest("button")) return;
    openEditor(type, index);
  });

  row.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && !event.target.closest("button")) {
      event.preventDefault();
      openEditor(type, index);
    }
  });

  return row;
}

function createNameCell(type, item, index) {
  const wrapper = document.createElement("div");
  wrapper.className = "admin-item";

  const displayName =
    typeof item.name === "string" && item.name.trim()
      ? item.name.trim()
      : `${typeLabels[type]} ${index + 1}`;

  const iconWrapper = document.createElement("span");
  iconWrapper.className = "admin-item-icon";
  const iconContent = String(item.icon || "").trim();
  if (iconContent.startsWith("http://") || iconContent.startsWith("https://") || iconContent.startsWith("data:")) {
    const img = document.createElement("img");
    img.src = iconContent;
    img.alt = `${displayName} 图标`;
    iconWrapper.appendChild(img);
  } else if (iconContent) {
    iconWrapper.textContent = iconContent.slice(0, 4);
  } else {
    iconWrapper.textContent = deriveFallbackIcon(displayName);
  }

  wrapper.appendChild(iconWrapper);

  const name = document.createElement("p");
  name.className = "admin-item-name";
  name.textContent = displayName;
  wrapper.appendChild(name);

  return wrapper;
}

function createActionCell(type, index) {
  const actions = document.createElement("div");
  actions.className = "admin-table-actions";

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "secondary-button";
  editButton.textContent = "编辑";
  editButton.addEventListener("click", (event) => {
    event.stopPropagation();
    openEditor(type, index);
  });

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "delete-button";
  deleteButton.textContent = "删除";
  deleteButton.addEventListener("click", (event) => {
    event.stopPropagation();
    handleDelete(type, index);
  });

  actions.appendChild(editButton);
  actions.appendChild(deleteButton);
  return actions;
}

/** 手柄图标：两列共六个圆点，纯装饰，颜色由 CSS 的 currentColor 决定。 */
const SORT_GRIP_MARKUP =
  '<svg viewBox="0 0 10 16" aria-hidden="true" focusable="false">' +
  '<circle cx="2" cy="3" r="1.5"/><circle cx="8" cy="3" r="1.5"/>' +
  '<circle cx="2" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/>' +
  '<circle cx="2" cy="13" r="1.5"/><circle cx="8" cy="13" r="1.5"/>' +
  "</svg>";

/**
 * 生成排序手柄：鼠标可拖动，键盘聚焦后可用 ↑ ↓ 移动（触屏与键盘的兜底通路）。
 * @param {"apps" | "bookmarks"} type 集合类型
 * @param {number} index 该行当前索引
 * @returns {HTMLButtonElement}
 */
function createSortHandle(type, index) {
  const handle = document.createElement("button");
  handle.type = "button";
  handle.className = "sort-handle";
  handle.draggable = true;
  handle.setAttribute(
    "aria-label",
    `第 ${index + 1} 项，拖动或用上下方向键调整${typeLabels[type]}顺序`,
  );
  handle.title = "拖动调整顺序（聚焦后也可用 ↑ ↓ 移动）";
  handle.innerHTML = SORT_GRIP_MARKUP;

  // 整行点击会打开编辑弹窗，手柄上的点击必须截断，否则一按就弹窗
  handle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });

  handle.addEventListener("dragstart", (event) => {
    draggingContext = { type, index };
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      // Firefox 必须写入数据才会真正启动拖拽
      event.dataTransfer.setData("text/plain", String(index));
    }
    const row = handle.closest("tr");
    if (row) {
      row.classList.add("is-dragging");
    }
    if (document.body) {
      document.body.classList.add("is-sorting");
    }
  });

  handle.addEventListener("dragend", () => {
    const row = handle.closest("tr");
    clearDropIndicators(row ? row.parentElement : null);
    if (row) {
      row.classList.remove("is-dragging");
    }
    resetSortState();
  });

  handle.addEventListener("keydown", (event) => {
    const delta = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
    if (!delta) return;
    event.preventDefault();

    const list = state[type];
    if (!Array.isArray(list)) return;
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= list.length) return;
    if (moveCollectionItem(type, index, nextIndex)) {
      settleReorder(type, nextIndex);
    }
  });

  return handle;
}

function deriveFallbackIcon(name) {
  if (!name) return "★";
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "★";
}

function showBookmarkCategoryField(value) {
  if (!modalCategoryField || !modalCategoryPlaceholder) return;
  if (!modalCategoryField.isConnected && modalCategoryPlaceholder.parentNode) {
    modalCategoryPlaceholder.replaceWith(modalCategoryField);
  }
  modalCategoryField.hidden = false;
  modalCategoryField.removeAttribute("hidden");
  modalCategoryField.removeAttribute("aria-hidden");
  if (modalCategoryInput) {
    modalCategoryInput.disabled = false;
    modalCategoryInput.value = value || "";
  }
}

function hideBookmarkCategoryField() {
  if (!modalCategoryField || !modalCategoryPlaceholder) return;
  if (modalCategoryField.isConnected) {
    modalCategoryField.hidden = true;
    modalCategoryField.setAttribute("hidden", "");
    modalCategoryField.setAttribute("aria-hidden", "true");
    modalCategoryField.replaceWith(modalCategoryPlaceholder);
  }
  if (modalCategoryInput) {
    modalCategoryInput.value = "";
    modalCategoryInput.disabled = true;
  }
}

function openEditor(type, index) {
  const fetchLogoButton = document.getElementById("fetch-logo-button");
  if (fetchLogoButton) {
    // 移除旧的监听器以防重复绑定
    fetchLogoButton.removeEventListener("click", handleFetchLogo);
    fetchLogoButton.addEventListener("click", handleFetchLogo);
  }
  const isNew = typeof index !== "number";
  const reference = isNew ? createBlankItem(type) : state[type][index];
  if (!reference) return;

  modalContext = { type, index, isNew };

  if (modalTitle) {
    modalTitle.textContent = isNew ? `添加${typeLabels[type]}` : `编辑${typeLabels[type]}`;
  }

  if (modalNameInput) modalNameInput.value = reference.name || "";
  if (modalUrlInput) modalUrlInput.value = reference.url || "";
  if (modalDescriptionInput) modalDescriptionInput.value = reference.description || "";
  if (modalIconInput) modalIconInput.value = reference.icon || "";

  if (type === "bookmarks") {
    showBookmarkCategoryField(reference.category || "");
  } else {
    hideBookmarkCategoryField();
  }

  if (modalError) {
    modalError.textContent = "";
  }
  setModalHint("");

  showModal();
}

function showModal() {
  if (!modal) return;
  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  if (modalNameInput) {
    modalNameInput.focus();
    modalNameInput.select();
  }
}

function closeEditor() {
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  if (modalError) {
    modalError.textContent = "";
  }
  setModalHint("");
  hideBookmarkCategoryField();
  modalContext = null;
}

function setModalError(message) {
  if (!modalError) return;
  modalError.textContent = message;
}

/**
 * 显示/清除非致命提示（例如图标服务不可用、已按站点自身地址兜底）。
 * 与 setModalError 分开，避免把"有结果但降级了"渲染成错误。
 * @param {string} message 传空串即清除
 */
function setModalHint(message) {
  if (!modalHint) return;
  if (message) {
    modalHint.textContent = message;
    modalHint.hidden = false;
  } else {
    modalHint.textContent = "";
    modalHint.hidden = true;
  }
}

function collectPayloadFromModal() {
  if (!modalContext) return null;

  const type = modalContext.type;
  const name = modalNameInput ? modalNameInput.value.trim() : "";
  const url = modalUrlInput ? modalUrlInput.value.trim() : "";
  const description = modalDescriptionInput ? modalDescriptionInput.value.trim() : "";
  const icon = modalIconInput ? modalIconInput.value.trim() : "";
  const category = modalCategoryInput ? modalCategoryInput.value.trim() : "";

  if (!name) {
    setModalError("请填写名称。");
    if (modalNameInput) modalNameInput.focus();
    return null;
  }

  if (!url) {
    setModalError("请填写链接地址。");
    if (modalUrlInput) modalUrlInput.focus();
    return null;
  }

  const existingId =
    !modalContext.isNew && typeof modalContext.index === "number"
      ? state[type][modalContext.index]?.id || ""
      : "";

  const payload = {
    id: existingId,
    name,
    url,
    description,
    icon,
  };

  if (type === "bookmarks") {
    payload.category = category;
  }

  return payload;
}

function applyModalChanges(event) {
  event.preventDefault();
  if (!modalContext) return;

  const payload = collectPayloadFromModal();
  if (!payload) return;

  const { type, index, isNew } = modalContext;

  if (isNew) {
    state[type].push(payload);
  } else if (typeof index === "number") {
    state[type][index] = { ...state[type][index], ...payload };
  }

  render();
  markDirty();
  setStatus(`${typeLabels[type]}已${modalContext.isNew ? "添加" : "更新"}，记得保存。`, "neutral");
  closeEditor();
}

/**
 * 把「落点在锚点行的上半还是下半」换算成移动后的目标索引。
 *
 * 不能直接把锚点索引当目标索引用：源项被摘除后，位于其后的锚点下标会前移一位。
 * 例如 [A,B,C,D] 把 A 拖到 C 之后，锚点 C 在摘除 A 后的数组里下标从 2 变成 1，
 * 插入位置因而应是 2 而不是 3。
 *
 * @param {number} fromIndex 被拖动项当前的索引
 * @param {number} anchorIndex 落点所在行（锚点）的索引
 * @param {boolean} insertAfter 落点在锚点行的下半部分时为 true
 * @returns {number} 移动后该项应处的新索引
 */
function resolveDropIndex(fromIndex, anchorIndex, insertAfter) {
  // 落回自身所在行：不论落在上半还是下半区都视为原地不动。
  // 少了这一步，「拖到自己行的下半区」会被算成后移一位。
  if (anchorIndex === fromIndex) return fromIndex;

  const anchorInRemaining = anchorIndex > fromIndex ? anchorIndex - 1 : anchorIndex;
  return insertAfter ? anchorInRemaining + 1 : anchorInRemaining;
}

/**
 * 在集合内移动条目（原地修改 state[type]，顺序即前台展示顺序）。
 * @param {"apps" | "bookmarks"} type 集合类型
 * @param {number} fromIndex 原始索引
 * @param {number} toIndex 目标索引（按「摘除源项后」的坐标系给出）
 * @returns {boolean} 顺序是否真的发生了变化
 */
function moveCollectionItem(type, fromIndex, toIndex) {
  const list = state[type];
  if (!Array.isArray(list)) return false;
  if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex)) return false;
  if (fromIndex < 0 || fromIndex >= list.length) return false;

  const target = Math.min(Math.max(toIndex, 0), list.length - 1);
  if (target === fromIndex) return false;

  const [moved] = list.splice(fromIndex, 1);
  list.splice(target, 0, moved);
  return true;
}

/**
 * 清掉行上的落点指示线。
 * @param {HTMLElement | null} container 列表容器
 */
function clearDropIndicators(container) {
  if (!container) return;
  container.querySelectorAll("tr.is-drop-before, tr.is-drop-after").forEach((row) => {
    row.classList.remove("is-drop-before", "is-drop-after");
  });
}

/**
 * 复位拖拽全局状态。重绘前必须调用，否则旧的索引会残留到新 DOM 上。
 */
function resetSortState() {
  draggingContext = null;
  if (document.body) {
    document.body.classList.remove("is-sorting");
  }
}

/**
 * 把焦点移回指定行的手柄。重绘后 DOM 已重建，必须重新查询。
 * @param {"apps" | "bookmarks"} type 集合类型
 * @param {number} index 目标行索引
 */
function focusSortHandle(type, index) {
  const container = type === "bookmarks" ? bookmarksEditor : appsEditor;
  if (!container) return;
  const handle = container.querySelector(`tr[data-index="${index}"] .sort-handle`);
  if (!handle || typeof handle.focus !== "function") return;
  handle.focus({ preventScroll: true });
  if (typeof handle.scrollIntoView === "function") {
    handle.scrollIntoView({ block: "nearest" });
  }
}

/**
 * 键盘重排后的收尾：重绘列表、标记待保存、把焦点交还给移动后的那一行。
 * @param {"apps" | "bookmarks"} type 集合类型
 * @param {number} index 移动后该项的新索引
 */
function settleReorder(type, index) {
  render();
  markDirty();
  setStatus(`${typeLabels[type]}顺序已调整，记得保存修改。`, "neutral");
  focusSortHandle(type, index);
}

/**
 * 在表格体上委托拖拽落点事件。
 *
 * 用事件委托而非逐行绑定，是因为每次重绘都会重建全部行，逐行绑定会随之失效。
 *
 * @param {"apps" | "bookmarks"} type 集合类型
 * @param {HTMLTableSectionElement} tbody 列表的 tbody
 */
function bindSortDropping(type, tbody) {
  const resolveAnchorRow = (target) => {
    if (!target || typeof target.closest !== "function") return null;
    const row = target.closest("tr");
    return row && tbody.contains(row) ? row : null;
  };

  const isDraggingThisList = () => Boolean(draggingContext) && draggingContext.type === type;

  /** 以锚点行的垂直中点为界，判断落点属于上半还是下半。 */
  const insertAfterPoint = (row, clientY) => {
    const rect = row.getBoundingClientRect();
    return clientY > rect.top + rect.height / 2;
  };

  tbody.addEventListener("dragover", (event) => {
    if (!isDraggingThisList()) return;
    // 不 preventDefault 浏览器就不允许放置，后面的 drop 也不会触发
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }

    const row = resolveAnchorRow(event.target);
    clearDropIndicators(tbody);
    if (!row) return;

    const anchorIndex = Number(row.dataset.index);
    if (!Number.isInteger(anchorIndex)) return;
    // 拖回自己所在行时不画指示线，避免给出「会移动」的错觉
    if (anchorIndex === draggingContext.index) return;

    row.classList.add(insertAfterPoint(row, event.clientY) ? "is-drop-after" : "is-drop-before");
  });

  tbody.addEventListener("dragleave", (event) => {
    if (!tbody.contains(event.relatedTarget)) {
      clearDropIndicators(tbody);
    }
  });

  tbody.addEventListener("drop", (event) => {
    if (!isDraggingThisList()) return;
    event.preventDefault();

    const fromIndex = draggingContext.index;
    const row = resolveAnchorRow(event.target);
    const anchorIndex = row ? Number(row.dataset.index) : Number.NaN;

    clearDropIndicators(tbody);
    resetSortState();

    if (!row || !Number.isInteger(anchorIndex)) return;
    // 落回自己所在的行：无论上下半区都视为原地不动，
    // 否则「拖到自己下半部分」会被算成后移一位。
    if (anchorIndex === fromIndex) return;

    const insertAfter = insertAfterPoint(row, event.clientY);
    const toIndex = resolveDropIndex(fromIndex, anchorIndex, insertAfter);

    if (moveCollectionItem(type, fromIndex, toIndex)) {
      render();
      markDirty();
      setStatus(`${typeLabels[type]}顺序已调整，记得保存修改。`, "neutral");
    }
  });
}

function handleDelete(type, index) {
  if (!Array.isArray(state[type])) return;
  const confirmed = window.confirm(`确定要删除该${typeLabels[type]}吗？`);
  if (!confirmed) return;
  state[type].splice(index, 1);
  render();
  markDirty();
  setStatus(`${typeLabels[type]}已删除，记得保存修改。`, "neutral");
}

function buildSettingsPayload(settings) {
  return {
    siteName: (settings.siteName || "").trim(),
    siteLogo: (settings.siteLogo || "").trim(),
    greeting: (settings.greeting || "").trim(),
    footer: normaliseFooterValue(settings.footer),
    weather: buildWeatherPayload(settings.weather),
    categories: parseCategoryList(settings.categories),
  };
}

function updateStateFromResponse(data) {
  state.apps = normaliseIncoming(data?.apps, "apps");
  state.bookmarks = normaliseIncoming(data?.bookmarks, "bookmarks");
  state.settings = normaliseSettingsIncoming(data?.settings);
  applySettingsToInputs(state.settings);
  render();
  resetDirty();
}

function buildAuthHeaders(extra = {}) {
  if (!authToken) {
    return { ...extra };
  }
  return {
    ...extra,
    Authorization: `Bearer ${authToken}`,
  };
}

async function loadData(showStatus = true) {
  if (!authToken) return false;
  try {
    const response = await fetch(DATA_ENDPOINT, {
      headers: buildAuthHeaders(),
    });

    if (response.status === 401) {
      handleUnauthorized("登录已过期，请重新登录。");
      return false;
    }

    if (!response.ok) {
      throw new Error("加载数据失败");
    }

    const payload = await response.json();
    const data = payload && typeof payload === "object" && "data" in payload ? payload.data : payload;

    updateStateFromResponse(data);
    hideAuthOverlay();
    if (logoutButton) logoutButton.disabled = false;
    if (showStatus) {
      setStatus("数据已加载。", "neutral");
    }
    return true;
  } catch (error) {
    console.error("加载数据失败", error);
    setStatus(error.message || "无法加载数据", "error");
    return false;
  }
}

async function saveChanges() {
  if (!saveButton) return;
  if (!authToken) {
    setStatus("请登录后再保存。", "error");
    return;
  }

  saveButton.disabled = true;
  setStatus("正在保存修改...", "neutral");

  const weatherValidation = validateWeatherSettings(state.settings.weather);
  if (!weatherValidation.valid) {
    setStatus(weatherValidation.message, "error");
    saveButton.disabled = false;
    if (weatherValidation.focus && typeof weatherValidation.focus.focus === "function") {
      weatherValidation.focus.focus();
    }
    return;
  }

  state.settings.weather = {
    ...state.settings.weather,
    city: weatherValidation.value.city,
  };

  if (siteWeatherCityInput) {
    siteWeatherCityInput.value = state.settings.weather.city;
  }
  updateWeatherSummary(state.settings.weather);

  const payloadSettings = buildSettingsPayload(state.settings);
  if (!payloadSettings.siteName) {
    setStatus("请填写网站名称。", "error");
    saveButton.disabled = false;
    if (siteNameInput) siteNameInput.focus();
    return;
  }

  const payload = {
    apps: state.apps.map((item) => ({
      id: item.id,
      name: item.name,
      url: item.url,
      description: item.description,
      icon: item.icon,
    })),
    bookmarks: state.bookmarks.map((item) => ({
      id: item.id,
      name: item.name,
      url: item.url,
      description: item.description,
      icon: item.icon,
      category: item.category || "",
    })),
    settings: payloadSettings,
  };

  try {
    const response = await fetch(DATA_ENDPOINT, {
      method: "PUT",
      headers: buildAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });

    if (response.status === 401) {
      handleUnauthorized("登录已过期，请重新登录。");
      return;
    }

    if (!response.ok) {
      const message = await extractErrorMessage(response);
      throw new Error(message || "保存失败");
    }

    const result = await response.json();
    const data = result && typeof result === "object" && "data" in result ? result.data : result;

    // The server response is used to update lists with server-generated IDs.
    // Settings are not updated from the response, as the local state is the source of truth
    // and the server may not return the full settings object on save.
    state.apps = normaliseIncoming(data?.apps, "apps");
    state.bookmarks = normaliseIncoming(data?.bookmarks, "bookmarks");
    render();
    resetDirty();
    setStatus("保存成功！", "success");
  } catch (error) {
    console.error("保存失败", error);
    setStatus(error.message || "保存失败，请稍后再试。", "error");
    if (saveButton) saveButton.disabled = false;
  }
}

async function extractErrorMessage(response) {
  try {
    const data = await response.json();
    if (data && typeof data === "object" && "message" in data) {
      return data.message;
    }
  } catch (_error) {
    // ignore
  }
  return response.statusText;
}

function loadStoredToken() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) || "";
  } catch (_error) {
    return "";
  }
}

function saveToken(token) {
  try {
    window.localStorage.setItem(STORAGE_KEY, token);
  } catch (_error) {
    // ignore storage errors
  }
}

function clearStoredToken() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (_error) {
    // ignore storage errors
  }
}

function handleUnauthorized(message) {
  clearStoredToken();
  authToken = "";
  state.apps = [];
  state.bookmarks = [];
  state.settings = normaliseSettingsIncoming(null);
  applySettingsToInputs(state.settings);
  render();
  resetDirty();
  showAuthOverlay();
  setPasswordMessage("");
  setStatus(message || "登录状态已失效，请重新登录。", "error");
  if (logoutButton) logoutButton.disabled = true;
}

function handleLogout() {
  clearStoredToken();
  authToken = "";
  state.apps = [];
  state.bookmarks = [];
  state.settings = normaliseSettingsIncoming(null);
  applySettingsToInputs(state.settings);
  render();
  resetDirty();
  setPasswordMessage("");
  setStatus("已退出登录，正在返回首页。", "neutral");
  if (logoutButton) {
    logoutButton.disabled = true;
  }
  window.location.replace("/");
}

function showAuthOverlay() {
  if (!authOverlay) return;
  authOverlay.hidden = false;
  setLoginError("");
  setPasswordMessage("");
  if (loginPasswordInput) {
    loginPasswordInput.disabled = false;
    loginPasswordInput.value = "";
    setTimeout(() => {
      loginPasswordInput.focus();
    }, 0);
  }
  if (logoutButton) logoutButton.disabled = true;
}

function hideAuthOverlay() {
  if (!authOverlay) return;
  authOverlay.hidden = true;
  setLoginError("");
  setPasswordMessage("");
  if (loginPasswordInput) {
    loginPasswordInput.value = "";
    loginPasswordInput.disabled = false;
  }
}

function setLoginError(message) {
  if (!loginError) return;
  if (message) {
    loginError.textContent = message;
    loginError.hidden = false;
  } else {
    loginError.textContent = "";
    loginError.hidden = true;
  }
}

function setPasswordMessage(message, variant = "neutral") {
  if (!passwordMessage) return;
  if (!message) {
    passwordMessage.textContent = "";
    passwordMessage.hidden = true;
    passwordMessage.removeAttribute("data-variant");
    return;
  }
  passwordMessage.textContent = message;
  passwordMessage.hidden = false;
  if (variant === "success" || variant === "error") {
    passwordMessage.dataset.variant = variant;
  } else {
    passwordMessage.removeAttribute("data-variant");
  }
}

async function performLogin(password) {
  const response = await fetch(LOGIN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new Error(message || "登录失败");
  }

  const result = await response.json();
  if (!result || !result.success || !result.token) {
    throw new Error(result?.message || "登录失败");
  }

  authToken = result.token;
  saveToken(authToken);
  const success = await loadData(false);
  if (!success) {
    throw new Error("数据加载失败，请重试。");
  }
  setStatus("登录成功，数据已加载。", "success");
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  if (!loginPasswordInput) return;

  const password = loginPasswordInput.value.trim();
  if (!password) {
    setLoginError("请输入密码。");
    loginPasswordInput.focus();
    return;
  }

  setLoginError("");
  const submitButton = loginForm ? loginForm.querySelector('button[type="submit"]') : null;
  if (submitButton) submitButton.disabled = true;
  loginPasswordInput.disabled = true;

  try {
    await performLogin(password);
    setPasswordMessage("");
    loginPasswordInput.value = "";
  } catch (error) {
    console.error("登录失败", error);
    setLoginError(error.message || "登录失败，请重试。");
    loginPasswordInput.focus();
  } finally {
    if (submitButton) submitButton.disabled = false;
    loginPasswordInput.disabled = false;
  }
}

async function handlePasswordSubmit(event) {
  event.preventDefault();
  if (!passwordForm) return;

  if (!authToken) {
    setPasswordMessage("请登录后再修改密码。", "error");
    showAuthOverlay();
    return;
  }

  const currentValue = currentPasswordInput ? currentPasswordInput.value : "";
  const trimmedCurrent = currentValue.trim();
  if (!trimmedCurrent) {
    setPasswordMessage("请输入当前密码。", "error");
    if (currentPasswordInput) currentPasswordInput.focus();
    return;
  }

  const newRaw = newPasswordInput ? newPasswordInput.value : "";
  const confirmRaw = confirmPasswordInput ? confirmPasswordInput.value : "";
  const newValue = newRaw.trim();
  const confirmValue = confirmRaw.trim();

  if (!newValue) {
    setPasswordMessage("请输入新密码。", "error");
    if (newPasswordInput) newPasswordInput.focus();
    return;
  }

  if (newValue.length < 6) {
    setPasswordMessage("新密码长度至少需 6 位。", "error");
    if (newPasswordInput) newPasswordInput.focus();
    return;
  }

  if (!confirmValue) {
    setPasswordMessage("请再次输入新密码。", "error");
    if (confirmPasswordInput) confirmPasswordInput.focus();
    return;
  }

  if (newValue !== confirmValue) {
    setPasswordMessage("两次输入的新密码不一致。", "error");
    if (confirmPasswordInput) confirmPasswordInput.focus();
    return;
  }

  setPasswordMessage("正在更新密码...");
  setStatus("正在更新密码...", "neutral");

  const submitButton = passwordForm.querySelector('button[type="submit"]');
  const passwordInputs = Array.from(passwordForm.querySelectorAll('input[type="password"]'));
  passwordInputs.forEach((input) => {
    input.disabled = true;
  });
  if (submitButton) submitButton.disabled = true;

  let focusCurrentInput = false;

  try {
    const response = await fetch(PASSWORD_ENDPOINT, {
      method: "POST",
      headers: buildAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ currentPassword: trimmedCurrent, newPassword: newValue }),
    });

    if (response.status === 401) {
      const message = await extractErrorMessage(response);
      if (message && message.includes("当前密码")) {
        setPasswordMessage(message, "error");
        setStatus(message, "error");
        focusCurrentInput = true;
        return;
      }
      handleUnauthorized(message || "登录已过期，请重新登录后再修改密码。");
      return;
    }

    if (!response.ok) {
      const message = await extractErrorMessage(response);
      throw new Error(message || "密码更新失败");
    }

    passwordForm.reset();
    setPasswordMessage("密码已更新，下次登录请使用新密码。", "success");
    setStatus("密码已更新，下次登录请使用新密码。", "success");
    focusCurrentInput = true;
  } catch (error) {
    console.error("更新密码失败", error);
    const message = error && error.message ? error.message : "密码更新失败，请稍后再试。";
    setPasswordMessage(message, "error");
    setStatus(message, "error");
  } finally {
    if (submitButton) submitButton.disabled = false;
    passwordInputs.forEach((input) => {
      input.disabled = false;
    });
    if (focusCurrentInput && currentPasswordInput) {
      currentPasswordInput.focus();
    }
  }
}

// 上游抓取回来的站点标题/描述落地到表单时的长度上限
const FETCHED_NAME_MAX_LENGTH = 40;
const FETCHED_DESCRIPTION_MAX_LENGTH = 160;

/**
 * 清洗上游返回的站点标题/描述。
 *
 * 上游偶发把整页导航链接串成一长串文字（实测 github.com 返回的 title 就是
 * 「GitHub · Change is constant. ...DuolingoErnst and YoungFord...」这种），
 * 这里压缩空白、剔除控制字符并按长度截断，避免脏文本整段写进 KV。
 *
 * @param {string} value 上游原始文本
 * @param {number} maxLength 最大保留长度
 * @returns {string} 清洗后的文本，无有效内容时返回空串
 */
function sanitiseFetchedText(value, maxLength) {
  if (typeof value !== "string") return "";
  const collapsed = value
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!collapsed) return "";
  if (collapsed.length <= maxLength) return collapsed;
  return `${collapsed.slice(0, maxLength).trim()}…`;
}

async function handleFetchLogo() {
  if (!modalUrlInput || !modalIconInput) return;
  const fetchLogoButton = document.getElementById("fetch-logo-button");
  if (!fetchLogoButton) return;

  const targetUrl = modalUrlInput.value.trim();
  if (!targetUrl) {
    setModalError("请先填写链接地址。");
    modalUrlInput.focus();
    return;
  }

  const originalButtonText = fetchLogoButton.textContent;
  fetchLogoButton.disabled = true;
  fetchLogoButton.textContent = "获取中...";
  setModalError("");
  setModalHint("");

  try {
    const response = await fetch("/api/fetch-logo", {
      method: "POST",
      headers: buildAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ url: targetUrl }),
    });

    if (response.status === 401) {
      handleUnauthorized("登录已过期，请重新登录。");
      return;
    }

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.success || !result.faviconUrl) {
      throw new Error(result.message || "获取图标失败。");
    }

    modalIconInput.value = result.faviconUrl;

    // 名称/描述仅在用户尚未填写时补全，不覆盖已录入的内容
    if (modalNameInput && !modalNameInput.value.trim()) {
      const fetchedName = sanitiseFetchedText(result.title, FETCHED_NAME_MAX_LENGTH);
      if (fetchedName) modalNameInput.value = fetchedName;
    }
    if (modalDescriptionInput && !modalDescriptionInput.value.trim()) {
      const fetchedDescription = sanitiseFetchedText(
        result.description,
        FETCHED_DESCRIPTION_MAX_LENGTH,
      );
      if (fetchedDescription) modalDescriptionInput.value = fetchedDescription;
    }

    // 后端在上游不可用时降级为「站点自身的 /favicon.ico」，仍算成功但要如实告知
    if (result.degraded) {
      setModalHint(result.message || "图标服务暂时不可用，已按站点自身地址填入图标。");
      console.warn("[admin] 图标走了兜底地址：", result.reason || "unknown");
    }

    markDirty(); // 标记为有修改
  } catch (error) {
    console.error("获取图标失败:", error);
    setModalError(error.message || "获取图标失败，请稍后重试。");
  } finally {
    fetchLogoButton.disabled = false;
    fetchLogoButton.textContent = originalButtonText;
  }
}

function bindEvents() {
  addButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.target;
      if (target !== "apps" && target !== "bookmarks") return;
      openEditor(target);
    });
  });

  if (saveButton) {
    saveButton.addEventListener("click", saveChanges);
  }

  if (reloadButton) {
    reloadButton.addEventListener("click", async () => {
      if (isDirty) {
        const confirmed = window.confirm("确定要放弃未保存的修改吗？");
        if (!confirmed) return;
      }
      const restored = await loadData(false);
      if (restored) {
        setStatus("已恢复为最新数据。", "neutral");
      }
    });
  }

  if (siteNameInput) {
    siteNameInput.addEventListener("input", () => {
      handleSettingsChange("siteName", siteNameInput.value);
    });
  }

  if (siteLogoInput) {
    siteLogoInput.addEventListener("input", () => {
      handleSettingsChange("siteLogo", siteLogoInput.value);
    });
  }

  if (siteGreetingInput) {
    siteGreetingInput.addEventListener("input", () => {
      handleSettingsChange("greeting", siteGreetingInput.value);
    });
  }

  if (siteFooterInput) {
    siteFooterInput.addEventListener("input", () => {
      handleSettingsChange("footer", siteFooterInput.value);
    });
  }

  if (siteWeatherCityInput) {
    siteWeatherCityInput.addEventListener("input", handleWeatherInputChange);
  }

  if (siteCategoriesInput) {
    siteCategoriesInput.addEventListener("input", () => {
      handleSettingsChange("categories", siteCategoriesInput.value);
    });
  }

  if (modalForm) {
    modalForm.addEventListener("submit", applyModalChanges);
  }

  if (modalCancelButton) {
    modalCancelButton.addEventListener("click", (event) => {
      event.preventDefault();
      closeEditor();
    });
  }

  if (modalCloseButton) {
    modalCloseButton.addEventListener("click", () => {
      closeEditor();
    });
  }

  if (modalOverlay) {
    modalOverlay.addEventListener("click", () => {
      closeEditor();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal && !modal.hidden) {
      closeEditor();
    }
  });

  if (passwordForm) {
    passwordForm.addEventListener("submit", handlePasswordSubmit);
    const passwordInputs = passwordForm.querySelectorAll('input[type="password"]');
    passwordInputs.forEach((input) => {
      input.addEventListener("input", () => {
        setPasswordMessage("");
      });
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", handleLoginSubmit);
  }

  if (logoutButton) {
    logoutButton.addEventListener("click", handleLogout);
  }

  if (backToAppsButton) {
    backToAppsButton.addEventListener("click", () => {
      scrollToSection("apps-editor-title");
    });
  }

  if (backToBookmarksButton) {
    backToBookmarksButton.addEventListener("click", () => {
      scrollToSection("bookmarks-editor-title");
    });
  }
}

function scrollToSection(targetId) {
  const targetElement = document.getElementById(targetId);
  if (!targetElement) return;

  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (prefersReducedMotion) {
    targetElement.scrollIntoView();
    return;
  }
  targetElement.scrollIntoView({ behavior: "smooth" });
}

function scrollToTop() {
  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (prefersReducedMotion) {
    window.scrollTo(0, 0);
    return;
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function handleBackToTopVisibility() {
  if (!backToTopButton) return;
  if (window.scrollY > BACK_TO_TOP_THRESHOLD) {
    if (backToTopButton.hasAttribute("hidden")) {
      backToTopButton.removeAttribute("hidden");
    }
  } else if (!backToTopButton.hasAttribute("hidden")) {
    backToTopButton.setAttribute("hidden", "");
  }
}

async function initialise() {
  updatePageIdentity(state.settings);
  if (backToTopButton) {
    backToTopButton.addEventListener("click", (event) => {
      event.preventDefault();
      scrollToTop();
    });
    handleBackToTopVisibility();
    window.addEventListener("scroll", handleBackToTopVisibility, { passive: true });
  }
  bindEvents();
  applySettingsToInputs(state.settings);
  render();
  resetDirty();
  const storedToken = loadStoredToken();
  if (storedToken) {
    authToken = storedToken;
    setStatus("正在验证登录状态...", "neutral");
    const success = await loadData(false);
    if (!success) {
      showAuthOverlay();
    } else {
      setStatus("数据已加载。", "neutral");
    }
  } else {
    showAuthOverlay();
    setStatus("请登录后开始编辑。", "neutral");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialise);
} else {
  initialise();
}
