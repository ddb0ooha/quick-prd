// script.js — UI 编排层

// ========== DOM 元素 ==========
const textarea = document.getElementById("requirement");
const generateBtn = document.getElementById("generate-btn");
const copyBtn = document.getElementById("copy-btn");
const exportBtn = document.getElementById("export-btn");
const outputSection = document.getElementById("output-section");
const output = document.getElementById("output");
const loading = document.getElementById("loading");
const settingsBtn = document.getElementById("settings-btn");
const settingsModal = document.getElementById("settings-modal");
const apiKeyInput = document.getElementById("api-key-input");
const saveKeyBtn = document.getElementById("save-key-btn");
const cancelKeyBtn = document.getElementById("cancel-key-btn");
const providerSelect = document.getElementById("provider-select");
const providerLink = document.getElementById("provider-link");
const promptVersionSelect = document.getElementById("prompt-version-select");
const themeSelect = document.getElementById("theme-select");

// PRD 相关
const generatePrdBtn = document.getElementById("generate-prd-btn");
const backToFinalPrdBtn = document.getElementById("back-to-final-prd-btn");
const prdSection = document.getElementById("prd-section");
const prdLoading = document.getElementById("prd-loading");
const prdContent = document.getElementById("prd-content");
const prdBackBtn = document.getElementById("prd-back-btn");
const prdEditBtn = document.getElementById("prd-edit-btn");
const prdExportBtn = document.getElementById("prd-export-btn");
const prdCopyBtn = document.getElementById("prd-copy-btn");

// 评审相关
const prdReviewBtn = document.getElementById("prd-review-btn");
const reviewSection = document.getElementById("review-section");
const reviewContent = document.getElementById("review-content");
const reviewCopyBtn = document.getElementById("review-copy-btn");
const reviewExportBtn = document.getElementById("review-export-btn");
const generateFinalPrdBtn = document.getElementById("generate-final-prd-btn");
const reviewQuestionsSection = document.getElementById("review-questions-section");
const reviewQuestionsList = document.getElementById("review-questions-list");

// PRD 附加操作
const prdExtraActions = document.getElementById("prd-extra-actions");

// 流程图相关
const generateFlowchartBtn = document.getElementById("generate-flowchart-btn");
const flowchartSection = document.getElementById("flowchart-section");
const flowchartLoading = document.getElementById("flowchart-loading");
const flowchartContent = document.getElementById("flowchart-content");
const flowchartCopyBtn = document.getElementById("flowchart-copy-btn");

// 页面结构说明相关
const generateWireframeBtn = document.getElementById("generate-wireframe-btn");
const wireframeSection = document.getElementById("wireframe-section");
const wireframeLoading = document.getElementById("wireframe-loading");
const wireframeContent = document.getElementById("wireframe-content");
const wireframeCopyBtn = document.getElementById("wireframe-copy-btn");

// 时序图相关
const generateSequenceBtn = document.getElementById("generate-sequence-btn");
const sequenceSection = document.getElementById("sequence-section");
const sequenceLoading = document.getElementById("sequence-loading");
const sequenceContent = document.getElementById("sequence-content");
const sequenceCopyBtn = document.getElementById("sequence-copy-btn");

// 导出全套文档相关
const exportAllBtn = document.getElementById("export-all-btn");
const exportAllModal = document.getElementById("export-all-modal");
const exportAllCancelBtn = document.getElementById("export-all-cancel-btn");
const exportAllConfirmBtn = document.getElementById("export-all-confirm-btn");
const exportIncludeFlowchart = document.getElementById("export-include-flowchart");
const exportIncludeWireframe = document.getElementById("export-include-wireframe");
const exportFlowchartOption = document.getElementById("export-flowchart-option");
const exportWireframeOption = document.getElementById("export-wireframe-option");
const exportIncludeSequence = document.getElementById("export-include-sequence");
const exportSequenceOption = document.getElementById("export-sequence-option");
const exportFormatToggle = document.getElementById("export-format-toggle");
const exportFormatMenu = document.getElementById("export-format-menu");
const exportHtmlBtn = document.getElementById("export-html-btn");

// 新建会话
const newSessionBtn = document.getElementById("new-session-btn");

// 历史记录相关
const historyBtn = document.getElementById("history-btn");
const historyModal = document.getElementById("history-modal");
const historyList = document.getElementById("history-list");
const historyCloseBtn = document.getElementById("history-close-btn");
const historyClearBtn = document.getElementById("history-clear-btn");

// ========== 主题（深色模式） ==========

function getThemePreference() {
  return localStorage.getItem(STORAGE_KEYS.THEME) || "system";
}

function applyTheme(pref) {
  const resolved = pref === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : pref;
  document.documentElement.setAttribute("data-theme", resolved);
}

// 页面加载时立即应用主题
applyTheme(getThemePreference());

// 监听系统主题变化（仅在「跟随系统」时响应）
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (getThemePreference() === "system") {
    applyTheme("system");
  }
});

// ========== 工具函数 ==========

function showSavedIndicator(el) {
  el.parentNode.querySelector(".saved-indicator")?.remove();
  const indicator = document.createElement("span");
  indicator.className = "saved-indicator";
  indicator.textContent = "已保存";
  el.after(indicator);
  setTimeout(() => indicator.remove(), 1800);
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

const _copyTimers = new WeakMap();
function handleCopyButton(btn, text, originalLabel) {
  copyToClipboard(text).then(() => {
    const prev = _copyTimers.get(btn);
    if (prev) clearTimeout(prev);
    btn.textContent = "已复制";
    btn.classList.add("copied");
    _copyTimers.set(btn, setTimeout(() => {
      btn.textContent = originalLabel;
      btn.classList.remove("copied");
      _copyTimers.delete(btn);
    }, 1500));
  }).catch(() => {
    const prev = _copyTimers.get(btn);
    if (prev) clearTimeout(prev);
    btn.textContent = "复制失败";
    btn.classList.add("copy-failed");
    _copyTimers.set(btn, setTimeout(() => {
      btn.textContent = originalLabel;
      btn.classList.remove("copy-failed");
      _copyTimers.delete(btn);
    }, 1500));
  });
}

function autoResize(el) {
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

let _storageWarningShown = false;
function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.error("localStorage 写入失败:", e);
    if (!_storageWarningShown) {
      _storageWarningShown = true;
      showToast("本地存储空间不足，部分数据可能无法保存。请清理历史记录后重试。", "warning", 4000);
    }
  }
}

// ========== Toast 通知 ==========

function showToast(message, type = "success", duration = 2500) {
  const container = document.getElementById("toast-container");
  const el = document.createElement("div");
  el.className = `toast-item toast-${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add("toast-out");
    el.addEventListener("animationend", () => el.remove());
  }, duration);
}

// ========== 模态框动画 ==========

function openModal(overlay) {
  overlay.classList.remove("hidden");
  // 强制 reflow 以触发过渡
  void overlay.offsetHeight;
  overlay.classList.add("visible");
}

function closeModal(overlay) {
  overlay.classList.remove("visible");
  const onEnd = () => {
    overlay.classList.add("hidden");
    overlay.removeEventListener("transitionend", onEnd);
  };
  overlay.addEventListener("transitionend", onEnd);
  // 兜底：确保 hidden 一定被添加
  setTimeout(() => {
    if (!overlay.classList.contains("hidden")) {
      overlay.classList.add("hidden");
    }
  }, 400);
}

// ========== 步骤指示器 ==========

function updateStepIndicator(currentStep) {
  const steps = ["input", "clarify", "prd", "review", "artifacts"];
  const currentIndex = steps.indexOf(currentStep);
  document.querySelectorAll("#step-indicator .step").forEach((el, i) => {
    el.classList.remove("active", "completed");
    el.removeAttribute("aria-current");
    if (i < currentIndex) el.classList.add("completed");
    else if (i === currentIndex) {
      el.classList.add("active");
      el.setAttribute("aria-current", "step");
    }
  });
}

// ========== 工作流切换过渡 ==========

function transitionSection(hideEl, showEl) {
  if (hideEl.classList.contains("section-fade")) {
    hideEl.classList.add("fading-out");
    setTimeout(() => {
      hideEl.classList.add("hidden");
      hideEl.classList.remove("fading-out");
      showEl.classList.remove("hidden");
      showEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
  } else {
    hideEl.classList.add("hidden");
    showEl.classList.remove("hidden");
  }
}

// ========== 流式生成进度条 ==========

let _streamingBar = null;

function showStreamingBar() {
  if (_streamingBar) return;
  _streamingBar = document.createElement("div");
  _streamingBar.className = "streaming-bar";
  document.body.appendChild(_streamingBar);
}

function hideStreamingBar() {
  if (_streamingBar) {
    _streamingBar.remove();
    _streamingBar = null;
  }
}

// ========== 按钮生成态 ==========

function setBtnGenerating(btn, text) {
  btn.disabled = true;
  btn.textContent = text;
  btn.classList.add("btn-generating");
}

function clearBtnGenerating(btn, text) {
  btn.disabled = false;
  btn.textContent = text;
  btn.classList.remove("btn-generating");
}

// ========== 区块展开动画 ==========

function showSection(el) {
  el.classList.remove("hidden");
  if (el.classList.contains("section-animate")) {
    requestAnimationFrame(() => {
      el.classList.add("expanded");
    });
  }
}

function hideSection(el) {
  if (el.classList.contains("section-animate")) {
    el.classList.remove("expanded");
    el.addEventListener("transitionend", function handler() {
      el.classList.add("hidden");
      el.removeEventListener("transitionend", handler);
    });
    setTimeout(() => {
      if (!el.classList.contains("hidden")) {
        el.classList.add("hidden");
      }
    }, 500);
  } else {
    el.classList.add("hidden");
  }
}

function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  // fallback for file:// or non-HTTPS
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch (_) {}
  document.body.removeChild(ta);
  return ok ? Promise.resolve() : Promise.reject(new Error("COPY_FAILED"));
}

// ========== 状态 ==========
let lastResult = null;
let lastInput = "";
let lastPrdMarkdown = "";
let lastReviewMarkdown = "";
let lastQAList = [];
let isFinalPrd = false;
let isGenerating = false;
let lastFlowchartData = null;
let lastWireframeData = null;
let lastSequenceData = null;
let currentTemplate = "general";
let _mermaidIdCounter = 0;
let prdManuallyEdited = false;

// ========== 答案持久化 ==========

function saveAnswers() {
  const inputs = output.querySelectorAll(".answer-input");
  const answers = {};
  inputs.forEach((el) => {
    if (el.value.trim()) {
      answers[el.id] = el.value;
    }
  });
  safeSetItem(STORAGE_KEYS.ANSWERS, JSON.stringify(answers));
}

function restoreAnswers() {
  const saved = localStorage.getItem(STORAGE_KEYS.ANSWERS);
  if (!saved) return;
  try {
    const answers = JSON.parse(saved);
    for (const [id, value] of Object.entries(answers)) {
      const el = document.getElementById(id);
      if (el) el.value = value;
    }
  } catch (_) {}
}

// ========== 会话持久化 ==========

function saveSession() {
  safeSetItem(STORAGE_KEYS.SESSION_QA_LIST, JSON.stringify(lastQAList));
  safeSetItem(STORAGE_KEYS.SESSION_PRD, lastPrdMarkdown);
  safeSetItem(STORAGE_KEYS.SESSION_REVIEW, lastReviewMarkdown);
  safeSetItem(STORAGE_KEYS.SESSION_IS_FINAL, isFinalPrd ? "1" : "");
  safeSetItem(STORAGE_KEYS.SESSION_FLOWCHART, lastFlowchartData ? JSON.stringify(lastFlowchartData) : "");
  safeSetItem(STORAGE_KEYS.SESSION_WIREFRAME, lastWireframeData ? JSON.stringify(lastWireframeData) : "");
  safeSetItem(STORAGE_KEYS.SESSION_SEQUENCE, lastSequenceData ? JSON.stringify(lastSequenceData) : "");
  safeSetItem(STORAGE_KEYS.SESSION_TEMPLATE, currentTemplate);
}

function saveReviewQuestions(questions) {
  safeSetItem(STORAGE_KEYS.SESSION_REVIEW_QUESTIONS, JSON.stringify(questions));
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.SESSION_QA_LIST);
  localStorage.removeItem(STORAGE_KEYS.SESSION_PRD);
  localStorage.removeItem(STORAGE_KEYS.SESSION_REVIEW);
  localStorage.removeItem(STORAGE_KEYS.SESSION_REVIEW_QUESTIONS);
  localStorage.removeItem(STORAGE_KEYS.SESSION_IS_FINAL);
  localStorage.removeItem(STORAGE_KEYS.SESSION_FLOWCHART);
  localStorage.removeItem(STORAGE_KEYS.SESSION_WIREFRAME);
  localStorage.removeItem(STORAGE_KEYS.SESSION_SEQUENCE);
  localStorage.removeItem(STORAGE_KEYS.SESSION_TEMPLATE);
}

// ========== 示例需求 ==========
const examples = {
  新人弹窗送券: "用户首次打开APP时弹窗发放优惠券，引导用户下单。",
  订单取消流程: "用户可以取消未发货的订单，取消后自动退款到原支付方式。",
  会员签到奖励: "会员每日签到可获得积分奖励，连续签到天数越多奖励越高。",
};

// GROUP_ORDER 定义在 api.js 中（全局共享）

// ========== 渲染（问题清单 + 答案输入框） ==========

function render(grouped) {
  const groups = GROUP_ORDER.filter(
    (g) => grouped[g] && grouped[g].length > 0
  );

  if (groups.length === 0) {
    output.innerHTML =
      '<p class="no-result">你的需求描述已经很完整了，暂无需要澄清的问题。</p>';
    exportBtn.classList.add("hidden");
    generatePrdBtn.classList.add("hidden");
    return;
  }

  let qIndex = 0;
  output.innerHTML = groups
    .map((groupName) => {
      const items = grouped[groupName]
        .map((q) => {
          const id = `answer-${qIndex++}`;
          const safeQ = escapeHTML(q);
          const safeGroup = escapeHTML(groupName);
          return `<li>
            <span class="question-text">${safeQ}</span>
            <textarea class="input-base answer-input" id="${id}" data-group="${safeGroup}" data-question="${safeQ}" placeholder="填写补充信息（可留空）" rows="1"></textarea>
          </li>`;
        })
        .join("");
      return `
        <div class="group-card">
          <h3>${groupName}</h3>
          <ol>${items}</ol>
        </div>`;
    })
    .join("");

  exportBtn.classList.remove("hidden");
  generatePrdBtn.classList.remove("hidden");

  // 恢复已保存的答案
  restoreAnswers();

  // 绑定答案自动保存 + 自动扩展高度
  output.querySelectorAll(".answer-input").forEach((el) => {
    let saveIndicatorTimer;
    el.addEventListener("input", () => {
      saveAnswers();
      autoResize(el);
      clearTimeout(saveIndicatorTimer);
      saveIndicatorTimer = setTimeout(() => showSavedIndicator(el), 600);
    });
    autoResize(el);
  });
}

function showLoading() {
  loading.innerHTML = `
    <div class="skeleton-block">
      <div class="skeleton-line"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line"></div>
    </div>`;
  loading.classList.remove("hidden");
  output.innerHTML = "";
  exportBtn.classList.add("hidden");
  generatePrdBtn.classList.add("hidden");
}

function hideLoading() {
  loading.classList.add("hidden");
}

function showError(error, container) {
  let msg = "分析失败，请稍后重试。";
  if (error.message === "API_KEY_MISSING") {
    msg = '请先设置 API Key。点击右上角 ⚙️ 按钮进行设置。';
  } else if (error.message === "API_KEY_INVALID") {
    msg = "API Key 无效，请点击右上角 ⚙️ 检查后重新设置。";
  } else if (error.message === "RATE_LIMITED") {
    msg = "请求过于频繁，请稍后再试。";
  } else if (error.message) {
    msg = error.message;
  }
  const div = document.createElement("div");
  div.className = "error-msg";
  div.textContent = msg;
  const target = container || output;
  target.innerHTML = "";
  target.appendChild(div);
}

// ========== 收集问答对 ==========

function collectQAList() {
  const inputs = output.querySelectorAll(".answer-input");
  const qaList = [];
  inputs.forEach((el) => {
    qaList.push({
      group: el.dataset.group,
      question: el.dataset.question,
      answer: el.value.trim(),
    });
  });
  return qaList;
}

// ========== 评审待确认问题 ==========

/**
 * 从评审结果 markdown 中提取待确认问题 JSON
 */
function parseReviewQuestions(markdown) {
  const match = markdown.match(/```json\s*\n([\s\S]*?)\n\s*```/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[1]);
    return Array.isArray(parsed.review_questions) ? parsed.review_questions : [];
  } catch (_) {
    showToast("评审问题解析失败，已跳过", "warning");
    return [];
  }
}

/**
 * 从评审 markdown 中移除"待确认问题"标题和 JSON 代码块，用于页面展示
 */
function stripReviewQuestionsBlock(markdown) {
  return markdown.replace(/##\s*待确认问题\s*\n+```json\s*\n[\s\S]*?\n\s*```\s*\n*/g, "");
}

/**
 * 渲染评审待确认问题输入框
 */
function renderReviewQuestions(questions) {
  if (!questions || questions.length === 0) {
    reviewQuestionsSection.classList.add("hidden");
    return;
  }
  reviewQuestionsList.innerHTML = questions
    .map((q, i) => {
      const safeQ = escapeHTML(q.question);
      const safeCtx = escapeHTML(q.context);
      return `<div class="review-question-item">
        <div class="review-question-text">${safeQ}</div>
        <div class="review-question-context">${safeCtx}</div>
        <textarea class="input-base review-question-input" id="review-answer-${i}" data-question="${safeQ}" data-context="${safeCtx}" placeholder="填写您的决策（可留空，AI 将按最简方案处理）" rows="2"></textarea>
      </div>`;
    })
    .join("");
  reviewQuestionsSection.classList.remove("hidden");

  // 绑定自动扩展高度
  reviewQuestionsList.querySelectorAll(".review-question-input").forEach((el) => {
    el.addEventListener("input", () => autoResize(el));
  });
}

/**
 * 收集用户对评审问题的回答
 */
function collectReviewAnswers() {
  const inputs = reviewQuestionsList.querySelectorAll(".review-question-input");
  const answers = [];
  inputs.forEach((el) => {
    answers.push({
      question: el.dataset.question,
      context: el.dataset.context,
      answer: el.value.trim(),
    });
  });
  return answers;
}

// ========== 设置弹窗 ==========

const providerLinks = {
  deepseek: "https://platform.deepseek.com/api_keys",
  openrouter: "https://openrouter.ai/keys",
};

const providerPlaceholders = {
  deepseek: "sk-...",
  openrouter: "sk-or-v1-...",
};

function updateProviderUI() {
  const p = providerSelect.value;
  providerLink.href = providerLinks[p] || providerLinks.deepseek;
  apiKeyInput.placeholder = providerPlaceholders[p] || "sk-...";
}

providerSelect.addEventListener("change", updateProviderUI);

function openSettings() {
  providerSelect.value = getProvider();
  apiKeyInput.value = getApiKey();
  themeSelect.value = getThemePreference();
  updateProviderUI();

  // 动态渲染 Prompt 版本选项
  const versions = getPromptVersionList();
  const currentVersion = getPromptVersion();
  promptVersionSelect.innerHTML = versions
    .map((v) => `<option value="${v}"${v === currentVersion ? " selected" : ""}>${v}</option>`)
    .join("");

  openModal(settingsModal);
  apiKeyInput.focus();
}

function closeSettings() {
  closeModal(settingsModal);
}

settingsBtn.addEventListener("click", openSettings);
cancelKeyBtn.addEventListener("click", closeSettings);

saveKeyBtn.addEventListener("click", () => {
  setProvider(providerSelect.value);
  setApiKey(apiKeyInput.value);
  const selectedVersion = promptVersionSelect.value;
  setPromptVersion(selectedVersion);
  applyPromptVersion(selectedVersion);
  // 保存并应用主题
  const selectedTheme = themeSelect.value;
  safeSetItem(STORAGE_KEYS.THEME, selectedTheme);
  applyTheme(selectedTheme);
  closeSettings();
});

settingsModal.addEventListener("click", (e) => {
  if (e.target === settingsModal) closeSettings();
});

// 确保 settings modal 关闭时不会同时触发 closeModal 检测逻辑
// (closeSettings 已内部调用 closeModal)

// ========== ESC 关闭模态框 ==========

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (settingsModal.classList.contains("visible")) {
      closeSettings();
    } else if (historyModal.classList.contains("visible")) {
      closeModal(historyModal);
    } else if (exportAllModal.classList.contains("visible")) {
      closeModal(exportAllModal);
    }
  }
});

// ========== 示例按钮 ==========

document.querySelectorAll(".example-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.getAttribute("data-example");
    textarea.value = examples[key] || key;
    textarea.focus();
  });
});

// ========== 模板选择器 ==========

const templateSelect = document.getElementById("template-select");
templateSelect.addEventListener("change", () => {
  currentTemplate = templateSelect.value;
  safeSetItem(STORAGE_KEYS.SESSION_TEMPLATE, currentTemplate);
  if (lastResult || lastPrdMarkdown) {
    showToast("模板已切换，下次重新生成时将应用新模板，当前已有内容不受影响", "warning", 4000);
  }
});

// ========== 快捷键 ==========

textarea.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    generateBtn.click();
  }
});

// ========== 生成澄清问题 ==========

generateBtn.addEventListener("click", async () => {
  if (isGenerating) return;
  const text = textarea.value.trim();

  if (!text) {
    showToast("请先输入需求描述", "warning");
    return;
  }

  const MAX_INPUT_LENGTH = 5000;
  if (text.length > MAX_INPUT_LENGTH) {
    if (!confirm(`输入内容较长（${text.length} 字），可能影响 AI 分析效果。是否继续？`)) return;
  }

  try {
    if (!getApiKey()) {
      openSettings();
      return;
    }

    // 如果已有用户填写的答案，提醒用户将被清除
    const savedAnswers = JSON.parse(localStorage.getItem(STORAGE_KEYS.ANSWERS) || "{}");
    const filledAnswerCount = Object.values(savedAnswers).filter(v => String(v).trim()).length;
    if (filledAnswerCount > 0) {
      if (!confirm(`当前已有 ${filledAnswerCount} 个填写的答案，重新分析将清空这些内容，是否继续？`)) return;
    }

    // 如果已有流程图或页面结构或时序图，提醒用户将被覆盖
    if (lastFlowchartData || lastWireframeData || lastSequenceData) {
      if (!confirm("重新分析将清除已生成的流程图、页面结构说明和时序图，是否继续？")) return;
    }

    // 切换到问题清单视图，重置终稿状态
    prdSection.classList.add("hidden");
    outputSection.classList.remove("hidden");
    isFinalPrd = false;
    updateStepIndicator("clarify");
    backToFinalPrdBtn.classList.add("hidden");
    prdExtraActions.classList.add("hidden");
    flowchartSection.classList.add("hidden");
    wireframeSection.classList.add("hidden");
    sequenceSection.classList.add("hidden");
    lastFlowchartData = null;
    lastWireframeData = null;
    lastSequenceData = null;
    showLoading();
    isGenerating = true;
    showStreamingBar();
    setBtnGenerating(generateBtn, "分析中…");

    const loadingText = loading.querySelector("p");
    const rawJson = await analyzeWithAI(text, (charCount) => {
      loadingText.textContent = `AI 正在分析需求，已接收 ${charCount} 字…`;
    }, currentTemplate);
    const grouped = parseAIResponse(rawJson);

    lastResult = grouped;
    lastInput = text;

    render(grouped);

    safeSetItem(STORAGE_KEYS.INPUT, text);
    safeSetItem(STORAGE_KEYS.RESULT, JSON.stringify(grouped));
    localStorage.removeItem(STORAGE_KEYS.ANSWERS);
    clearSession();
    saveToHistory(text, grouped);
  } catch (error) {
    console.error("Analysis failed:", error);
    outputSection.classList.remove("hidden");
    showError(error);
  } finally {
    isGenerating = false;
    hideStreamingBar();
    clearBtnGenerating(generateBtn, "生成澄清问题");
    hideLoading();
  }
});

// ========== 生成 PRD ==========

generatePrdBtn.addEventListener("click", async () => {
  if (isGenerating) return;
  try {
    if (!getApiKey()) {
      openSettings();
      return;
    }

    const qaList = collectQAList();
    const hasAnyAnswer = qaList.some((qa) => qa.answer);
    if (!hasAnyAnswer) {
      if (!confirm("您尚未回答任何澄清问题，生成的 PRD 可能不够完整。是否继续？")) return;
    }
    lastQAList = qaList;

    // 如果已有流程图或页面结构或时序图，提醒用户将被覆盖
    if (lastFlowchartData || lastWireframeData || lastSequenceData) {
      if (!confirm("重新生成 PRD 将清除已生成的流程图、页面结构说明和时序图，是否继续？")) return;
    }

    // 清空评审状态，恢复标题
    exitPrdEditMode();
    lastReviewMarkdown = "";
    isFinalPrd = false;
    backToFinalPrdBtn.classList.add("hidden");
    prdExtraActions.classList.add("hidden");
    flowchartSection.classList.add("hidden");
    wireframeSection.classList.add("hidden");
    sequenceSection.classList.add("hidden");
    lastFlowchartData = null;
    lastWireframeData = null;
    lastSequenceData = null;
    reviewSection.classList.add("hidden");
    prdSection.querySelector(".output-header h2").textContent = "PRD 文档预览";

    // 切换到 PRD 视图
    transitionSection(outputSection, prdSection);
    updateStepIndicator("prd");
    prdContent.innerHTML = "";
    prdLoading.classList.remove("hidden");
    isGenerating = true;
    showStreamingBar();
    setBtnGenerating(generatePrdBtn, "生成中…");

    // 流式渲染：每收到新内容就更新预览
    prdLoading.classList.add("hidden");
    const markdown = await generatePRDWithAI(lastInput, qaList, (_delta, accumulated) => {
      prdContent.innerHTML = renderMarkdownToHTML(accumulated);
    }, currentTemplate);
    lastPrdMarkdown = markdown;
    prdManuallyEdited = false;

    // 最终完整渲染一次，确保格式正确
    prdContent.innerHTML = renderMarkdownToHTML(markdown);
    prdEditBtn.classList.remove("hidden");
    saveSession();
  } catch (error) {
    console.error("PRD generation failed:", error);
    showError(error, prdContent);
  } finally {
    isGenerating = false;
    hideStreamingBar();
    prdLoading.classList.add("hidden");
    clearBtnGenerating(generatePrdBtn, "生成 PRD 文档");
  }
});

// ========== PRD 操作按钮 ==========

prdBackBtn.addEventListener("click", () => {
  transitionSection(prdSection, outputSection);
  updateStepIndicator("clarify");
  if (isFinalPrd) {
    backToFinalPrdBtn.classList.remove("hidden");
  }
});

backToFinalPrdBtn.addEventListener("click", () => {
  transitionSection(outputSection, prdSection);
  backToFinalPrdBtn.classList.add("hidden");
  updateStepIndicator(isFinalPrd ? "artifacts" : "prd");
});

prdExportBtn.addEventListener("click", () => {
  if (!lastPrdMarkdown?.trim()) return;
  downloadMarkdown(lastPrdMarkdown, "PRD文档");
});

prdCopyBtn.addEventListener("click", () => {
  if (!lastPrdMarkdown?.trim()) return;
  handleCopyButton(prdCopyBtn, lastPrdMarkdown, "复制");
});

// ========== PRD 编辑模式 ==========

let prdEditMode = false;

function enterPrdEditMode() {
  if (!lastPrdMarkdown?.trim() || isGenerating) return;
  prdEditMode = true;

  // 创建编辑区域
  const editContainer = document.createElement("div");
  editContainer.id = "prd-edit-container";

  const textarea = document.createElement("textarea");
  textarea.className = "prd-edit-textarea";
  textarea.value = lastPrdMarkdown;

  const actions = document.createElement("div");
  actions.className = "prd-edit-actions";

  const saveBtn = document.createElement("button");
  saveBtn.className = "btn btn-primary";
  saveBtn.textContent = "保存";

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "btn btn-secondary";
  cancelBtn.textContent = "取消";

  actions.appendChild(cancelBtn);
  actions.appendChild(saveBtn);
  editContainer.appendChild(textarea);
  editContainer.appendChild(actions);

  // 隐藏预览，显示编辑
  prdContent.classList.add("hidden");
  prdContent.parentNode.insertBefore(editContainer, prdContent.nextSibling);

  // 切换按钮状态
  prdEditBtn.textContent = "编辑中…";
  prdEditBtn.disabled = true;

  textarea.focus();

  saveBtn.addEventListener("click", () => {
    const newMarkdown = textarea.value;
    if (newMarkdown.trim()) {
      lastPrdMarkdown = newMarkdown;
      prdManuallyEdited = true;
      prdContent.innerHTML = renderMarkdownToHTML(newMarkdown);
      saveSession();
      showToast("PRD 已更新", "success");
    }
    exitPrdEditMode();
  });

  cancelBtn.addEventListener("click", () => {
    exitPrdEditMode();
  });
}

function exitPrdEditMode() {
  prdEditMode = false;
  const editContainer = document.getElementById("prd-edit-container");
  if (editContainer) editContainer.remove();
  prdContent.classList.remove("hidden");
  prdEditBtn.textContent = "编辑";
  prdEditBtn.disabled = false;
}

prdEditBtn.addEventListener("click", () => {
  if (prdEditMode) return;
  enterPrdEditMode();
});

// ========== 风险评审 ==========

prdReviewBtn.addEventListener("click", async () => {
  if (isGenerating) return;
  try {
    if (!getApiKey()) {
      openSettings();
      return;
    }

    if (!lastPrdMarkdown?.trim()) return;

    if (prdManuallyEdited) {
      showToast("当前 PRD 已手动编辑，评审将基于最新内容进行", "warning", 4000);
    }

    // 显示评审区域，清空内容
    reviewSection.classList.remove("hidden");
    reviewContent.innerHTML = "";
    reviewQuestionsSection.classList.add("hidden");
    isGenerating = true;
    showStreamingBar();
    setBtnGenerating(prdReviewBtn, "评审中…");
    updateStepIndicator("review");

    const markdown = await reviewPRDWithAI(
      lastInput,
      lastQAList,
      lastPrdMarkdown,
      (_delta, accumulated) => {
        reviewContent.innerHTML = renderMarkdownToHTML(accumulated);
      },
      currentTemplate
    );
    lastReviewMarkdown = markdown;

    // 提取待确认问题，从展示内容中移除 JSON 块，再渲染
    const reviewQuestions = parseReviewQuestions(markdown);
    const cleanedMarkdown = stripReviewQuestionsBlock(markdown);
    reviewContent.innerHTML = renderMarkdownToHTML(cleanedMarkdown);

    // 渲染待确认问题 UI
    renderReviewQuestions(reviewQuestions);
    saveReviewQuestions(reviewQuestions);
    saveSession();

    // 滚动到评审区域
    reviewSection.scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    console.error("Review failed:", error);
    showError(error, reviewContent);
  } finally {
    isGenerating = false;
    hideStreamingBar();
    clearBtnGenerating(prdReviewBtn, "风险评审");
  }
});

reviewCopyBtn.addEventListener("click", () => {
  if (!lastReviewMarkdown) return;
  handleCopyButton(reviewCopyBtn, lastReviewMarkdown, "复制评审结果");
});

reviewExportBtn.addEventListener("click", () => {
  if (!lastReviewMarkdown) return;
  downloadMarkdown(lastReviewMarkdown, "技术风控评审报告");
});

generateFinalPrdBtn.addEventListener("click", async () => {
  if (isGenerating) return;
  try {
    if (!getApiKey()) {
      openSettings();
      return;
    }

    if (!lastPrdMarkdown?.trim() || !lastReviewMarkdown?.trim()) return;

    // 收集用户对评审问题的回答
    const reviewAnswers = collectReviewAnswers();

    // 隐藏评审区域，回到 PRD 内容区显示最终版
    exitPrdEditMode();
    reviewSection.classList.add("hidden");
    prdContent.innerHTML = "";
    isGenerating = true;
    showStreamingBar();
    setBtnGenerating(generateFinalPrdBtn, "生成中…");

    // 更新标题标识
    const prdTitle = prdSection.querySelector(".output-header h2");
    prdTitle.textContent = "PRD 文档（最终版）";

    // 滚动到顶部
    prdSection.scrollIntoView({ behavior: "smooth" });

    const markdown = await generateFinalPRDWithAI(
      lastInput,
      lastQAList,
      lastPrdMarkdown,
      lastReviewMarkdown,
      reviewAnswers,
      (_delta, accumulated) => {
        prdContent.innerHTML = renderMarkdownToHTML(accumulated);
      }
    );
    lastPrdMarkdown = markdown;

    // 最终完整渲染
    prdContent.innerHTML = renderMarkdownToHTML(markdown);
    prdEditBtn.classList.remove("hidden");

    // 标记为最终版，清空评审状态
    isFinalPrd = true;
    lastReviewMarkdown = "";
    prdManuallyEdited = false;

    // 显示附加操作按钮（流程图 + 页面结构说明）
    prdExtraActions.classList.remove("hidden");
    updateStepIndicator("artifacts");
    saveSession();
  } catch (error) {
    console.error("Final PRD generation failed:", error);
    reviewSection.classList.remove("hidden");
    showError(error, prdContent);
  } finally {
    isGenerating = false;
    hideStreamingBar();
    clearBtnGenerating(generateFinalPrdBtn, "按照修改建议进行补充并生成最终 PRD");
  }
});

// ========== 新建会话 ==========

newSessionBtn.addEventListener("click", () => {
  if (isGenerating) return;

  const hasData = lastResult || lastPrdMarkdown || lastReviewMarkdown || lastFlowchartData || lastWireframeData || lastSequenceData;
  if (hasData && !confirm("将清空当前工作区的所有内容，是否继续？")) return;

  // 清除 localStorage
  clearSession();
  localStorage.removeItem(STORAGE_KEYS.INPUT);
  localStorage.removeItem(STORAGE_KEYS.RESULT);
  localStorage.removeItem(STORAGE_KEYS.ANSWERS);

  // 重置状态变量
  lastResult = null;
  lastInput = "";
  lastPrdMarkdown = "";
  lastReviewMarkdown = "";
  lastQAList = [];
  isFinalPrd = false;
  prdManuallyEdited = false;
  lastFlowchartData = null;
  lastWireframeData = null;
  lastSequenceData = null;
  currentTemplate = "general";

  // 退出编辑模式（如果在编辑中）
  exitPrdEditMode();
  prdEditBtn.classList.add("hidden");

  // 重置 UI
  textarea.value = "";
  output.innerHTML = "";
  prdContent.innerHTML = "";
  reviewContent.innerHTML = "";
  flowchartContent.innerHTML = "";
  wireframeContent.innerHTML = "";
  sequenceContent.innerHTML = "";
  reviewQuestionsList.innerHTML = "";

  outputSection.classList.add("hidden");
  prdSection.classList.add("hidden");
  reviewSection.classList.add("hidden");
  flowchartSection.classList.add("hidden");
  wireframeSection.classList.add("hidden");
  sequenceSection.classList.add("hidden");
  reviewQuestionsSection.classList.add("hidden");
  prdExtraActions.classList.add("hidden");
  backToFinalPrdBtn.classList.add("hidden");
  exportBtn.classList.add("hidden");
  generatePrdBtn.classList.add("hidden");

  templateSelect.value = "general";
  prdSection.querySelector(".output-header h2").textContent = "PRD 文档预览";
  updateStepIndicator("input");

  textarea.focus();
});

// ========== 复制问题清单 ==========

copyBtn.addEventListener("click", () => {
  const cards = output.querySelectorAll(".group-card");
  if (cards.length === 0) return;

  const text = Array.from(cards)
    .map((card) => {
      const title = card.querySelector("h3").textContent;
      const items = Array.from(card.querySelectorAll("li")).map(
        (li, i) => `${i + 1}. ${li.querySelector(".question-text").textContent}`
      );
      return `【${title}】\n${items.join("\n")}`;
    })
    .join("\n\n");

  handleCopyButton(copyBtn, text, "复制结果");
});

// ========== 导出澄清文档 ==========

exportBtn.addEventListener("click", () => {
  if (!lastResult || !lastInput) return;
  const qaList = collectQAList();
  const md = generateMarkdown(lastInput, lastResult, qaList);
  downloadMarkdown(md, "需求澄清文档");
});

// ========== 历史记录 ==========

const MAX_HISTORY = 20;

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY)) || [];
  } catch (_) {
    return [];
  }
}

function saveToHistory(inputText, result) {
  const history = getHistory();
  // 去重：如果已有相同输入，先移除旧的
  const idx = history.findIndex((h) => h.input === inputText);
  if (idx !== -1) history.splice(idx, 1);

  history.unshift({
    input: inputText,
    result,
    time: Date.now(),
  });

  // 限制数量
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  safeSetItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
}

function renderHistory() {
  const history = getHistory();
  if (history.length === 0) {
    historyList.innerHTML = '<div class="history-empty"><img class="empty-illustration" src="assets/empty-history.png" alt="" aria-hidden="true"><p>暂无历史记录</p></div>';
    return;
  }

  historyList.innerHTML = history
    .map((h, i) => {
      const date = new Date(h.time).toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
      const preview = h.input.length > 40 ? h.input.slice(0, 40) + "…" : h.input;
      const questionCount = Object.values(h.result).reduce((sum, qs) => sum + qs.length, 0);
      return `<div class="history-item" data-index="${i}">
        <div class="history-item-content">
          <div class="history-item-text">${escapeHTML(preview)}</div>
          <div class="history-item-meta">${date} · ${questionCount} 个问题</div>
        </div>
        <button class="history-item-delete" data-delete="${i}" title="删除">✕</button>
      </div>`;
    })
    .join("");
}

function loadHistoryItem(index) {
  const history = getHistory();
  const item = history[index];
  if (!item) return;

  textarea.value = item.input;
  lastInput = item.input;
  lastResult = item.result;

  safeSetItem(STORAGE_KEYS.INPUT, item.input);
  safeSetItem(STORAGE_KEYS.RESULT, JSON.stringify(item.result));
  localStorage.removeItem(STORAGE_KEYS.ANSWERS);
  clearSession();

  prdSection.classList.add("hidden");
  outputSection.classList.remove("hidden");
  render(lastResult);
  closeModal(historyModal);
  updateStepIndicator("clarify");
}

historyBtn.addEventListener("click", () => {
  renderHistory();
  openModal(historyModal);
});

historyCloseBtn.addEventListener("click", () => {
  closeModal(historyModal);
});

historyModal.addEventListener("click", (e) => {
  if (e.target === historyModal) closeModal(historyModal);
});

historyList.addEventListener("click", (e) => {
  // 删除按钮
  const deleteBtn = e.target.closest("[data-delete]");
  if (deleteBtn) {
    e.stopPropagation();
    const idx = parseInt(deleteBtn.dataset.delete, 10);
    const history = getHistory();
    history.splice(idx, 1);
    safeSetItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    renderHistory();
    return;
  }
  // 点击条目加载
  const item = e.target.closest(".history-item");
  if (item) {
    loadHistoryItem(parseInt(item.dataset.index, 10));
  }
});

historyClearBtn.addEventListener("click", () => {
  if (!confirm("确定要清空所有历史记录吗？此操作不可恢复。")) return;
  localStorage.removeItem(STORAGE_KEYS.HISTORY);
  _storageWarningShown = false;
  renderHistory();
});

// ========== 流程图 ==========

generateFlowchartBtn.addEventListener("click", async () => {
  if (isGenerating) return;
  try {
    if (!getApiKey()) {
      openSettings();
      return;
    }
    if (!lastPrdMarkdown) return;
    if (!isFinalPrd) {
      showToast("请先完成评审并生成最终版 PRD，再生成此产出物", "warning");
      return;
    }

    // 显示加载状态
    flowchartSection.classList.remove("hidden");
    flowchartContent.innerHTML = "";
    flowchartLoading.classList.remove("hidden");
    isGenerating = true;
    showStreamingBar();
    setBtnGenerating(generateFlowchartBtn, "分析中…");

    const loadingText = flowchartLoading.querySelector("p");
    const rawJson = await generateFlowchartWithAI(lastPrdMarkdown, (charCount) => {
      loadingText.textContent = `AI 正在分析流程，已接收 ${charCount} 字…`;
    });

    const data = parseFlowchartResponse(rawJson);
    lastFlowchartData = data;
    saveSession();

    flowchartLoading.classList.add("hidden");
    renderFlowcharts(data);

    // 滚动到流程图区域
    flowchartSection.scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    console.error("Flowchart generation failed:", error);
    flowchartLoading.classList.add("hidden");
    showError(error, flowchartContent);
  } finally {
    isGenerating = false;
    hideStreamingBar();
    clearBtnGenerating(generateFlowchartBtn, "生成业务流程图");
  }
});

/**
 * 渲染流程图结果
 * @param {object} data - { needed, reason, charts }
 */
async function renderFlowcharts(data) {
  if (!data.needed || data.charts.length === 0) {
    flowchartContent.innerHTML = `
      <div class="flowchart-not-needed">
        <img class="empty-illustration" src="assets/empty-check.png" alt="" aria-hidden="true">
        <p class="flowchart-not-needed-text">${escapeHTML(data.reason || "该 PRD 功能较为简单，无需流程图辅助理解。")}</p>
      </div>`;
    flowchartCopyBtn.classList.add("hidden");
    return;
  }

  flowchartCopyBtn.classList.remove("hidden");

  // 检查 Mermaid 库是否可用
  const mermaidAvailable = typeof mermaid !== "undefined";

  let html = "";
  data.charts.forEach((chart, index) => {
    const safeTitle = escapeHTML(chart.title);
    const safeWhy = escapeHTML(chart.why);
    const chartId = `mermaid-chart-${index}`;

    html += `
      <div class="flowchart-card">
        <h3>${safeTitle}</h3>
        <p class="flowchart-reason">${safeWhy}</p>
        <div class="flowchart-diagram" id="${chartId}">
          ${mermaidAvailable ? `<pre class="mermaid">${escapeHTML(chart.mermaid)}</pre>` : ""}
        </div>
        <details class="flowchart-source">
          <summary>查看 Mermaid 源码</summary>
          <pre class="flowchart-source-code"><code>${escapeHTML(chart.mermaid)}</code></pre>
        </details>
      </div>`;
  });

  flowchartContent.innerHTML = html;

  if (!mermaidAvailable) {
    // Mermaid CDN 加载失败，显示提示并展开所有源码
    flowchartContent.querySelectorAll(".flowchart-diagram").forEach((el) => {
      el.innerHTML = `<div class="flowchart-render-error"><p>流程图渲染库加载失败，请检查网络连接后刷新页面重试。</p></div>`;
    });
    flowchartContent.querySelectorAll(".flowchart-source").forEach((el) => {
      el.open = true;
    });
    return;
  }

  // 初始化 Mermaid
  mermaid.initialize({
    startOnLoad: false,
    theme: "default",
    flowchart: { useMaxWidth: true, htmlLabels: true },
    securityLevel: "strict",
  });

  // 逐个顺序渲染，单个失败不影响其他图
  const mermaidEls = flowchartContent.querySelectorAll(".mermaid");
  for (let i = 0; i < mermaidEls.length; i++) {
    const el = mermaidEls[i];
    try {
      const { svg } = await mermaid.render(`mermaid-svg-${_mermaidIdCounter++}`, el.textContent);
      el.innerHTML = svg;
    } catch (err) {
      console.error(`Mermaid chart ${i} render failed:`, err);
      el.innerHTML = `<div class="flowchart-render-error"><p>该流程图渲染失败，请展开下方源码查看</p></div>`;
      const card = el.closest(".flowchart-card");
      if (card) {
        const details = card.querySelector(".flowchart-source");
        if (details) details.open = true;
      }
      showToast("流程图渲染失败，已展开源码供参考", "warning");
    }
  }
}

flowchartCopyBtn.addEventListener("click", () => {
  if (!lastFlowchartData || !lastFlowchartData.charts.length) return;

  const text = lastFlowchartData.charts
    .map((chart) => `## ${chart.title}\n\n\`\`\`mermaid\n${chart.mermaid}\n\`\`\``)
    .join("\n\n---\n\n");

  handleCopyButton(flowchartCopyBtn, text, "复制 Mermaid 源码");
});

// ========== 页面结构说明 ==========

generateWireframeBtn.addEventListener("click", async () => {
  if (isGenerating) return;
  try {
    if (!getApiKey()) {
      openSettings();
      return;
    }
    if (!lastPrdMarkdown) return;
    if (!isFinalPrd) {
      showToast("请先完成评审并生成最终版 PRD，再生成此产出物", "warning");
      return;
    }

    wireframeSection.classList.remove("hidden");
    wireframeContent.innerHTML = "";
    wireframeLoading.classList.remove("hidden");
    isGenerating = true;
    showStreamingBar();
    setBtnGenerating(generateWireframeBtn, "分析中…");

    const loadingText = wireframeLoading.querySelector("p");
    const rawJson = await generateWireframeWithAI(lastPrdMarkdown, (charCount) => {
      loadingText.textContent = `AI 正在分析页面结构，已接收 ${charCount} 字…`;
    });

    const data = parseWireframeResponse(rawJson);
    lastWireframeData = data;
    saveSession();

    wireframeLoading.classList.add("hidden");
    renderWireframes(data);

    wireframeSection.scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    console.error("Wireframe generation failed:", error);
    wireframeLoading.classList.add("hidden");
    showError(error, wireframeContent);
  } finally {
    isGenerating = false;
    hideStreamingBar();
    clearBtnGenerating(generateWireframeBtn, "生成页面结构说明");
  }
});

/**
 * 渲染页面结构说明
 * @param {object} data - { needed, reason, pages }
 */
function renderWireframes(data) {
  if (!data.needed || data.pages.length === 0) {
    wireframeContent.innerHTML = `
      <div class="wireframe-not-needed">
        <img class="empty-illustration" src="assets/empty-check.png" alt="" aria-hidden="true">
        <p class="wireframe-not-needed-text">${escapeHTML(data.reason || "该 PRD 不涉及用户界面页面，无需页面结构说明。")}</p>
      </div>`;
    wireframeCopyBtn.classList.add("hidden");
    return;
  }

  wireframeCopyBtn.classList.remove("hidden");

  let html = "";
  data.pages.forEach((page) => {
    const safeName = escapeHTML(page.name);
    const safeEntry = escapeHTML(page.entry || "");

    html += `
      <div class="wireframe-card">
        <div class="wireframe-card-header">
          <h3>${safeName}</h3>
          ${safeEntry ? `<p class="wireframe-card-entry">入口：${safeEntry}</p>` : ""}
        </div>
        <div class="wireframe-card-body">
          ${renderMarkdownToHTML(page.structure || "")}
        </div>
      </div>`;
  });

  wireframeContent.innerHTML = html;
}

wireframeCopyBtn.addEventListener("click", () => {
  if (!lastWireframeData || !lastWireframeData.pages.length) return;

  const text = lastWireframeData.pages
    .map((page) => {
      let md = `## ${page.name}`;
      if (page.entry) md += `\n\n**入口**：${page.entry}`;
      md += `\n\n${page.structure}`;
      return md;
    })
    .join("\n\n---\n\n");

  handleCopyButton(wireframeCopyBtn, text, "复制结构说明");
});

// ========== 时序图 ==========

generateSequenceBtn.addEventListener("click", async () => {
  if (isGenerating) return;
  try {
    if (!getApiKey()) {
      openSettings();
      return;
    }
    if (!lastPrdMarkdown) return;
    if (!isFinalPrd) {
      showToast("请先完成评审并生成最终版 PRD，再生成此产出物", "warning");
      return;
    }

    // 显示加载状态
    sequenceSection.classList.remove("hidden");
    sequenceContent.innerHTML = "";
    sequenceLoading.classList.remove("hidden");
    isGenerating = true;
    showStreamingBar();
    setBtnGenerating(generateSequenceBtn, "分析中…");

    const loadingText = sequenceLoading.querySelector("p");
    const rawJson = await generateSequenceWithAI(lastPrdMarkdown, (charCount) => {
      loadingText.textContent = `AI 正在分析系统交互，已接收 ${charCount} 字…`;
    });

    const data = parseSequenceResponse(rawJson);
    lastSequenceData = data;
    saveSession();

    sequenceLoading.classList.add("hidden");
    renderSequenceDiagrams(data);

    // 滚动到时序图区域
    sequenceSection.scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    console.error("Sequence diagram generation failed:", error);
    sequenceLoading.classList.add("hidden");
    showError(error, sequenceContent);
  } finally {
    isGenerating = false;
    hideStreamingBar();
    clearBtnGenerating(generateSequenceBtn, "生成时序图");
  }
});

/**
 * 渲染时序图结果
 * @param {object} data - { needed, reason, diagrams }
 */
async function renderSequenceDiagrams(data) {
  if (!data.needed || data.diagrams.length === 0) {
    sequenceContent.innerHTML = `
      <div class="sequence-not-needed">
        <img class="empty-illustration" src="assets/empty-check.png" alt="" aria-hidden="true">
        <p class="sequence-not-needed-text">${escapeHTML(data.reason || "该 PRD 不涉及多系统交互，无需时序图。")}</p>
      </div>`;
    sequenceCopyBtn.classList.add("hidden");
    return;
  }

  sequenceCopyBtn.classList.remove("hidden");

  const mermaidAvailable = typeof mermaid !== "undefined";

  let html = "";
  data.diagrams.forEach((diagram, index) => {
    const safeTitle = escapeHTML(diagram.title);
    const safeWhy = escapeHTML(diagram.why);
    const chartId = `sequence-chart-${index}`;

    html += `
      <div class="sequence-card">
        <h3>${safeTitle}</h3>
        <p class="sequence-reason">${safeWhy}</p>
        <div class="sequence-diagram" id="${chartId}">
          ${mermaidAvailable ? `<pre class="mermaid">${escapeHTML(diagram.mermaid)}</pre>` : ""}
        </div>
        <details class="sequence-source">
          <summary>查看 Mermaid 源码</summary>
          <pre class="sequence-source-code"><code>${escapeHTML(diagram.mermaid)}</code></pre>
        </details>
      </div>`;
  });

  sequenceContent.innerHTML = html;

  if (!mermaidAvailable) {
    sequenceContent.querySelectorAll(".sequence-diagram").forEach((el) => {
      el.innerHTML = `<div class="sequence-render-error"><p>时序图渲染库加载失败，请检查网络连接后刷新页面重试。</p></div>`;
    });
    sequenceContent.querySelectorAll(".sequence-source").forEach((el) => {
      el.open = true;
    });
    return;
  }

  mermaid.initialize({
    startOnLoad: false,
    theme: "default",
    sequence: { useMaxWidth: true },
    securityLevel: "strict",
  });

  const mermaidEls = sequenceContent.querySelectorAll(".mermaid");
  for (let i = 0; i < mermaidEls.length; i++) {
    const el = mermaidEls[i];
    try {
      const { svg } = await mermaid.render(`mermaid-svg-${_mermaidIdCounter++}`, el.textContent);
      el.innerHTML = svg;
    } catch (err) {
      console.error(`Sequence diagram ${i} render failed:`, err);
      el.innerHTML = `<div class="sequence-render-error"><p>该时序图渲染失败，请展开下方源码查看</p></div>`;
      const card = el.closest(".sequence-card");
      if (card) {
        const details = card.querySelector(".sequence-source");
        if (details) details.open = true;
      }
      showToast("时序图渲染失败，已展开源码供参考", "warning");
    }
  }
}

sequenceCopyBtn.addEventListener("click", () => {
  if (!lastSequenceData || !lastSequenceData.diagrams.length) return;

  const text = lastSequenceData.diagrams
    .map((d) => `## ${d.title}\n\n\`\`\`mermaid\n${d.mermaid}\n\`\`\``)
    .join("\n\n---\n\n");

  handleCopyButton(sequenceCopyBtn, text, "复制 Mermaid 源码");
});

// ========== 导出全套文档 ==========

exportAllBtn.addEventListener("click", () => {
  // 更新选项状态：未生成的数据禁用对应选项
  const hasFlowchart = lastFlowchartData && lastFlowchartData.needed && lastFlowchartData.charts.length > 0;
  const hasWireframe = lastWireframeData && lastWireframeData.needed && lastWireframeData.pages.length > 0;

  exportIncludeFlowchart.checked = hasFlowchart;
  exportIncludeFlowchart.disabled = !hasFlowchart;
  exportFlowchartOption.classList.toggle("export-option-disabled", !hasFlowchart);

  // 移除旧的提示
  exportFlowchartOption.querySelectorAll(".export-option-hint").forEach((el) => el.remove());
  if (!hasFlowchart) {
    const hint = document.createElement("p");
    hint.className = "export-option-hint";
    hint.textContent = "尚未生成或不需要流程图";
    exportFlowchartOption.appendChild(hint);
  }

  exportIncludeWireframe.checked = hasWireframe;
  exportIncludeWireframe.disabled = !hasWireframe;
  exportWireframeOption.classList.toggle("export-option-disabled", !hasWireframe);

  exportWireframeOption.querySelectorAll(".export-option-hint").forEach((el) => el.remove());
  if (!hasWireframe) {
    const hint = document.createElement("p");
    hint.className = "export-option-hint";
    hint.textContent = "尚未生成或不需要页面结构说明";
    exportWireframeOption.appendChild(hint);
  }

  const hasSequence = lastSequenceData && lastSequenceData.needed && lastSequenceData.diagrams.length > 0;

  exportIncludeSequence.checked = hasSequence;
  exportIncludeSequence.disabled = !hasSequence;
  exportSequenceOption.classList.toggle("export-option-disabled", !hasSequence);

  exportSequenceOption.querySelectorAll(".export-option-hint").forEach((el) => el.remove());
  if (!hasSequence) {
    const hint = document.createElement("p");
    hint.className = "export-option-hint";
    hint.textContent = "尚未生成或不需要时序图";
    exportSequenceOption.appendChild(hint);
  }

  openModal(exportAllModal);
});

exportAllCancelBtn.addEventListener("click", () => {
  exportFormatMenu.classList.add("hidden");
  closeModal(exportAllModal);
});

exportAllModal.addEventListener("click", (e) => {
  if (e.target === exportAllModal) {
    closeModal(exportAllModal);
  }
});

// 下拉菜单开关
exportFormatToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  exportFormatMenu.classList.toggle("hidden");
});

// 点击弹窗任意位置收起菜单
exportAllModal.addEventListener("click", () => {
  exportFormatMenu.classList.add("hidden");
});

exportAllConfirmBtn.addEventListener("click", () => {
  if (!lastPrdMarkdown?.trim()) return;

  const md = generateFullDocument(
    lastPrdMarkdown,
    lastFlowchartData,
    lastWireframeData,
    lastSequenceData,
    {
      includeFlowchart: exportIncludeFlowchart.checked,
      includeWireframe: exportIncludeWireframe.checked,
      includeSequence: exportIncludeSequence.checked,
    }
  );

  downloadMarkdown(md, "QuickPRD-全套文档");
  closeModal(exportAllModal);
});

exportHtmlBtn.addEventListener("click", () => {
  if (!lastPrdMarkdown?.trim()) return;

  const html = generateHTMLDocument(
    lastPrdMarkdown,
    lastFlowchartData,
    lastWireframeData,
    lastSequenceData,
    {
      includeFlowchart: exportIncludeFlowchart.checked,
      includeWireframe: exportIncludeWireframe.checked,
      includeSequence: exportIncludeSequence.checked,
    }
  );

  downloadHTML(html, "QuickPRD-全套文档");
  exportFormatMenu.classList.add("hidden");
  closeModal(exportAllModal);
});

// ========== 页面加载恢复 ==========

(function restore() {
  // — 恢复模板选择 —
  const savedTemplate = localStorage.getItem(STORAGE_KEYS.SESSION_TEMPLATE);
  if (savedTemplate && PRD_TEMPLATES[savedTemplate]) {
    currentTemplate = savedTemplate;
    templateSelect.value = currentTemplate;
  }

  const savedInput = localStorage.getItem(STORAGE_KEYS.INPUT);
  const savedResult = localStorage.getItem(STORAGE_KEYS.RESULT);
  if (!savedInput || !savedResult) {
    updateStepIndicator("input");
    return;
  }

  textarea.value = savedInput;
  lastInput = savedInput;
  try {
    lastResult = JSON.parse(savedResult);
    outputSection.classList.remove("hidden");
    render(lastResult);
    updateStepIndicator("clarify");
  } catch (_) {
    updateStepIndicator("input");
    return;
  }

  // — 恢复 QA list —
  const savedQAList = localStorage.getItem(STORAGE_KEYS.SESSION_QA_LIST);
  if (savedQAList) {
    try { lastQAList = JSON.parse(savedQAList); } catch (_) {}
  }

  // — 恢复 PRD —
  const savedPrd = localStorage.getItem(STORAGE_KEYS.SESSION_PRD);
  const savedIsFinal = localStorage.getItem(STORAGE_KEYS.SESSION_IS_FINAL);
  if (savedPrd && savedPrd.trim()) {
    lastPrdMarkdown = savedPrd;
    isFinalPrd = savedIsFinal === "1";

    outputSection.classList.add("hidden");
    prdSection.classList.remove("hidden");
    prdContent.innerHTML = renderMarkdownToHTML(savedPrd);
    prdEditBtn.classList.remove("hidden");

    const prdTitle = prdSection.querySelector(".output-header h2");
    prdTitle.textContent = isFinalPrd ? "PRD 文档（最终版）" : "PRD 文档预览";

    if (isFinalPrd) {
      prdExtraActions.classList.remove("hidden");
      updateStepIndicator("artifacts");
    } else {
      updateStepIndicator("prd");
    }
  } else {
    // PRD 数据无效，重置终稿标志
    isFinalPrd = false;
  }

  // — 恢复评审（仅在非终版状态且 PRD 存在时恢复）—
  const savedReview = localStorage.getItem(STORAGE_KEYS.SESSION_REVIEW);
  if (savedReview && savedReview.trim() && lastPrdMarkdown && !isFinalPrd) {
    lastReviewMarkdown = savedReview;
    const cleanedMarkdown = stripReviewQuestionsBlock(savedReview);
    reviewContent.innerHTML = renderMarkdownToHTML(cleanedMarkdown);
    reviewSection.classList.remove("hidden");
    updateStepIndicator("review");

    const savedReviewQ = localStorage.getItem(STORAGE_KEYS.SESSION_REVIEW_QUESTIONS);
    if (savedReviewQ) {
      try {
        const questions = JSON.parse(savedReviewQ);
        renderReviewQuestions(questions);
      } catch (_) {}
    }
  }

  // — 恢复流程图（需要 PRD 和终稿标志同时有效）—
  const savedFlowchart = localStorage.getItem(STORAGE_KEYS.SESSION_FLOWCHART);
  if (savedFlowchart && savedFlowchart.trim() && isFinalPrd && lastPrdMarkdown) {
    try {
      const parsedFlowchart = JSON.parse(savedFlowchart);
      if (parsedFlowchart && typeof parsedFlowchart.needed !== "undefined") {
        lastFlowchartData = parsedFlowchart;
        flowchartSection.classList.remove("hidden");
        renderFlowcharts(lastFlowchartData);
      }
    } catch (_) {}
  }

  // — 恢复页面结构（需要 PRD 和终稿标志同时有效）—
  const savedWireframe = localStorage.getItem(STORAGE_KEYS.SESSION_WIREFRAME);
  if (savedWireframe && savedWireframe.trim() && isFinalPrd && lastPrdMarkdown) {
    try {
      const parsedWireframe = JSON.parse(savedWireframe);
      if (parsedWireframe && typeof parsedWireframe.needed !== "undefined") {
        lastWireframeData = parsedWireframe;
        wireframeSection.classList.remove("hidden");
        renderWireframes(lastWireframeData);
      }
    } catch (_) {}
  }

  // — 恢复时序图（需要 PRD 和终稿标志同时有效）—
  const savedSequence = localStorage.getItem(STORAGE_KEYS.SESSION_SEQUENCE);
  if (savedSequence && savedSequence.trim() && isFinalPrd && lastPrdMarkdown) {
    try {
      const parsedSequence = JSON.parse(savedSequence);
      if (parsedSequence && typeof parsedSequence.needed !== "undefined") {
        lastSequenceData = parsedSequence;
        sequenceSection.classList.remove("hidden");
        renderSequenceDiagrams(lastSequenceData);
      }
    } catch (_) {}
  }

  // — 恢复完成后显示下一步引导 —
  let nextStepHint = "";
  if (lastReviewMarkdown && !isFinalPrd) {
    nextStepHint = "会话已恢复 — 下一步：确认待决策问题并点击「生成最终版 PRD」";
  } else if (lastPrdMarkdown && !isFinalPrd) {
    nextStepHint = "会话已恢复 — 下一步：点击「风险评审」审查 PRD";
  } else if (lastResult && !lastPrdMarkdown) {
    nextStepHint = "会话已恢复 — 下一步：填写答案后点击「生成 PRD 文档」";
  }
  if (nextStepHint) {
    setTimeout(() => showToast(nextStepHint, "success", 5000), 600);
  }
})();

// ========== 首次运行检测 ==========

(function checkFirstRun() {
  if (!getApiKey()) {
    setTimeout(openSettings, 500);
  }
})();
