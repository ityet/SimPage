/**
 * SimPage 快速添加 · 设置页逻辑
 *
 * 「保存并测试连接」做三件事：
 *   1. 规范化地址并落盘
 *   2. 清掉旧会话，用新密码真实登录一次（同时验证地址可达、CORS 放行、密码正确）
 *   3. 拉取后台分类写入本地缓存，供弹窗的候选与默认分类使用
 */

import { ApiError, clearToken, normaliseSiteUrl, readConfig, saveConfig, testConnection } from "./lib/api.js";

const els = {
  siteUrl: document.getElementById("site-url"),
  password: document.getElementById("password"),
  togglePassword: document.getElementById("toggle-password"),
  defaultCategory: document.getElementById("default-category"),
  categoryOptions: document.getElementById("category-options"),
  save: document.getElementById("save"),
  clearSession: document.getElementById("clear-session"),
  status: document.getElementById("status"),
};

/**
 * 展示状态提示。
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
 * 取出可展示的错误文案。
 * @param {*} error
 * @returns {string}
 */
function messageOf(error) {
  if (error instanceof ApiError) return error.message;
  return String((error && error.message) || error || "未知错误");
}

/**
 * 渲染分类候选。
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
 * 载入已保存的配置。
 */
async function load() {
  const config = await readConfig();
  els.siteUrl.value = config.siteUrl;
  els.password.value = config.password;
  els.defaultCategory.value = config.defaultCategory;
  renderCategoryOptions(config.categories);
}

/**
 * 保存并测试连接。
 */
async function handleSave() {
  const siteUrl = normaliseSiteUrl(els.siteUrl.value);
  const password = els.password.value;

  if (!siteUrl) {
    setStatus("站点地址无法解析，请填写形如 https://nav.itmax.cn 的地址。", "error");
    els.siteUrl.focus();
    return;
  }
  if (!password) {
    setStatus("请填写管理员密码。", "error");
    els.password.focus();
    return;
  }

  els.save.disabled = true;
  els.save.textContent = "测试中…";
  setStatus("正在连接站点…", "info");

  try {
    // 地址或密码可能已变，先落盘再清会话，确保后续请求用的是新配置
    await saveConfig({
      siteUrl,
      password,
      defaultCategory: els.defaultCategory.value.trim(),
    });
    await clearToken();

    const result = await testConnection();
    els.siteUrl.value = siteUrl;
    renderCategoryOptions(result.categories);

    const storageNote =
      result.storage === "kv" || result.storage === "kv-storage"
        ? ""
        : `（注意：服务端存储模式为 ${result.storage}）`;
    setStatus(
      `连接成功！已读到 ${result.appCount} 个应用、${result.bookmarkCount} 条书签${
        result.categories.length > 0 ? `，分类候选 ${result.categories.length} 个` : ""
      }。${storageNote}`,
      result.storage === "memory-fallback" ? "warning" : "success",
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      setStatus("密码不对：站点可以访问，但管理员密码校验失败。", "error");
    } else {
      setStatus(messageOf(error), "error");
    }
  } finally {
    els.save.disabled = false;
    els.save.textContent = "保存并测试连接";
  }
}

/**
 * 清除本地缓存的会话 token（不动配置）。
 */
async function handleClearSession() {
  await clearToken();
  setStatus("已清除本地会话缓存，下次添加时会用保存的密码重新登录。", "info");
}

async function main() {
  await load();

  els.save.addEventListener("click", handleSave);
  els.clearSession.addEventListener("click", handleClearSession);
  els.togglePassword.addEventListener("click", () => {
    const isPassword = els.password.type === "password";
    els.password.type = isPassword ? "text" : "password";
    els.togglePassword.textContent = isPassword ? "隐藏" : "显示";
  });
  els.defaultCategory.addEventListener("input", () => {
    // 输入即落盘，避免用户以为「没点保存就丢了」
    saveConfig({ defaultCategory: els.defaultCategory.value.trim() }).catch(() => {});
  });
}

main().catch((error) => {
  setStatus(`设置页初始化失败：${messageOf(error)}`, "error");
});
