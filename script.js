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

// PRD 相关
const generatePrdBtn = document.getElementById("generate-prd-btn");
const backToFinalPrdBtn = document.getElementById("back-to-final-prd-btn");
const prdSection = document.getElementById("prd-section");
const prdLoading = document.getElementById("prd-loading");
const prdContent = document.getElementById("prd-content");
const prdBackBtn = document.getElementById("prd-back-btn");
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

// 导出全套文档相关
const exportAllBtn = document.getElementById("export-all-btn");
const exportAllModal = document.getElementById("export-all-modal");
const exportAllCancelBtn = document.getElementById("export-all-cancel-btn");
const exportAllConfirmBtn = document.getElementById("export-all-confirm-btn");
const exportIncludeFlowchart = document.getElementById("export-include-flowchart");
const exportIncludeWireframe = document.getElementById("export-include-wireframe");
const exportFlowchartOption = document.getElementById("export-flowchart-option");
const exportWireframeOption = document.getElementById("export-wireframe-option");

// 历史记录相关
const historyBtn = document.getElementById("history-btn");
const historyModal = document.getElementById("history-modal");
const historyList = document.getElementById("history-list");
const historyCloseBtn = document.getElementById("history-close-btn");
const historyClearBtn = document.getElementById("history-clear-btn");

// ========== 工具函数 ==========

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
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
  try {
    document.execCommand("copy");
  } catch (_) {}
  document.body.removeChild(ta);
  return Promise.resolve();
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

// ========== 答案持久化 ==========

function saveAnswers() {
  const inputs = output.querySelectorAll(".answer-input");
  const answers = {};
  inputs.forEach((el) => {
    if (el.value.trim()) {
      answers[el.id] = el.value;
    }
  });
  localStorage.setItem(STORAGE_KEYS.ANSWERS, JSON.stringify(answers));
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
  localStorage.setItem(STORAGE_KEYS.SESSION_QA_LIST, JSON.stringify(lastQAList));
  localStorage.setItem(STORAGE_KEYS.SESSION_PRD, lastPrdMarkdown);
  localStorage.setItem(STORAGE_KEYS.SESSION_REVIEW, lastReviewMarkdown);
  localStorage.setItem(STORAGE_KEYS.SESSION_IS_FINAL, isFinalPrd ? "1" : "");
  localStorage.setItem(STORAGE_KEYS.SESSION_FLOWCHART, lastFlowchartData ? JSON.stringify(lastFlowchartData) : "");
  localStorage.setItem(STORAGE_KEYS.SESSION_WIREFRAME, lastWireframeData ? JSON.stringify(lastWireframeData) : "");
}

function saveReviewQuestions(questions) {
  localStorage.setItem(STORAGE_KEYS.SESSION_REVIEW_QUESTIONS, JSON.stringify(questions));
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.SESSION_QA_LIST);
  localStorage.removeItem(STORAGE_KEYS.SESSION_PRD);
  localStorage.removeItem(STORAGE_KEYS.SESSION_REVIEW);
  localStorage.removeItem(STORAGE_KEYS.SESSION_REVIEW_QUESTIONS);
  localStorage.removeItem(STORAGE_KEYS.SESSION_IS_FINAL);
  localStorage.removeItem(STORAGE_KEYS.SESSION_FLOWCHART);
  localStorage.removeItem(STORAGE_KEYS.SESSION_WIREFRAME);
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
            <textarea class="answer-input" id="${id}" data-group="${safeGroup}" data-question="${safeQ}" placeholder="填写补充信息（可留空）" rows="1"></textarea>
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

  // 绑定答案自动保存
  output.querySelectorAll(".answer-input").forEach((el) => {
    el.addEventListener("input", saveAnswers);
  });
}

function showLoading() {
  loading.classList.remove("hidden");
  output.innerHTML = "";
  exportBtn.classList.add("hidden");
  generatePrdBtn.classList.add("hidden");
  generateBtn.disabled = true;
  generateBtn.textContent = "分析中…";
}

function hideLoading() {
  loading.classList.add("hidden");
  generateBtn.disabled = false;
  generateBtn.textContent = "生成澄清问题";
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
        <textarea class="review-question-input" id="review-answer-${i}" data-question="${safeQ}" data-context="${safeCtx}" placeholder="填写您的决策（可留空，AI 将按最简方案处理）" rows="2"></textarea>
      </div>`;
    })
    .join("");
  reviewQuestionsSection.classList.remove("hidden");
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
  updateProviderUI();

  // 动态渲染 Prompt 版本选项
  const versions = getPromptVersionList();
  const currentVersion = getPromptVersion();
  promptVersionSelect.innerHTML = versions
    .map((v) => `<option value="${v}"${v === currentVersion ? " selected" : ""}>${v}</option>`)
    .join("");

  settingsModal.classList.remove("hidden");
  apiKeyInput.focus();
}

function closeSettings() {
  settingsModal.classList.add("hidden");
}

settingsBtn.addEventListener("click", openSettings);
cancelKeyBtn.addEventListener("click", closeSettings);

saveKeyBtn.addEventListener("click", () => {
  setProvider(providerSelect.value);
  setApiKey(apiKeyInput.value);
  const selectedVersion = promptVersionSelect.value;
  setPromptVersion(selectedVersion);
  applyPromptVersion(selectedVersion);
  closeSettings();
});

settingsModal.addEventListener("click", (e) => {
  if (e.target === settingsModal) closeSettings();
});

// ========== 示例按钮 ==========

document.querySelectorAll(".example-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.getAttribute("data-example");
    textarea.value = examples[key] || key;
    textarea.focus();
  });
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
    outputSection.classList.remove("hidden");
    output.innerHTML = '<p class="toast">请先输入需求描述</p>';
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

    // 切换到问题清单视图，重置终稿状态
    prdSection.classList.add("hidden");
    outputSection.classList.remove("hidden");
    isFinalPrd = false;
    backToFinalPrdBtn.classList.add("hidden");
    prdExtraActions.classList.add("hidden");
    flowchartSection.classList.add("hidden");
    wireframeSection.classList.add("hidden");
    lastFlowchartData = null;
    lastWireframeData = null;
    showLoading();
    isGenerating = true;

    const loadingText = loading.querySelector("p");
    const rawJson = await analyzeWithAI(text, (charCount) => {
      loadingText.textContent = `AI 正在分析需求，已接收 ${charCount} 字…`;
    });
    const grouped = parseAIResponse(rawJson);

    lastResult = grouped;
    lastInput = text;

    render(grouped);

    localStorage.setItem(STORAGE_KEYS.INPUT, text);
    localStorage.setItem(STORAGE_KEYS.RESULT, JSON.stringify(grouped));
    localStorage.removeItem(STORAGE_KEYS.ANSWERS);
    clearSession();
    saveToHistory(text, grouped);
  } catch (error) {
    console.error("Analysis failed:", error);
    outputSection.classList.remove("hidden");
    showError(error);
  } finally {
    isGenerating = false;
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

    // 清空评审状态，恢复标题
    lastReviewMarkdown = "";
    isFinalPrd = false;
    backToFinalPrdBtn.classList.add("hidden");
    prdExtraActions.classList.add("hidden");
    flowchartSection.classList.add("hidden");
    wireframeSection.classList.add("hidden");
    lastFlowchartData = null;
    lastWireframeData = null;
    reviewSection.classList.add("hidden");
    prdSection.querySelector(".output-header h2").textContent = "PRD 文档预览";

    // 切换到 PRD 视图
    outputSection.classList.add("hidden");
    prdSection.classList.remove("hidden");
    prdContent.innerHTML = "";
    prdLoading.classList.remove("hidden");
    generatePrdBtn.disabled = true;
    generatePrdBtn.textContent = "生成中…";
    isGenerating = true;

    // 流式渲染：每收到新内容就更新预览
    prdLoading.classList.add("hidden");
    const markdown = await generatePRDWithAI(lastInput, qaList, (_delta, accumulated) => {
      prdContent.innerHTML = renderMarkdownToHTML(accumulated);
    });
    lastPrdMarkdown = markdown;

    // 最终完整渲染一次，确保格式正确
    prdContent.innerHTML = renderMarkdownToHTML(markdown);
    saveSession();
  } catch (error) {
    console.error("PRD generation failed:", error);
    showError(error, prdContent);
  } finally {
    isGenerating = false;
    prdLoading.classList.add("hidden");
    generatePrdBtn.disabled = false;
    generatePrdBtn.textContent = "生成 PRD 文档";
  }
});

// ========== PRD 操作按钮 ==========

prdBackBtn.addEventListener("click", () => {
  prdSection.classList.add("hidden");
  outputSection.classList.remove("hidden");
  if (isFinalPrd) {
    backToFinalPrdBtn.classList.remove("hidden");
  }
});

backToFinalPrdBtn.addEventListener("click", () => {
  outputSection.classList.add("hidden");
  prdSection.classList.remove("hidden");
  backToFinalPrdBtn.classList.add("hidden");
});

prdExportBtn.addEventListener("click", () => {
  if (!lastPrdMarkdown) return;
  downloadMarkdown(lastPrdMarkdown, "PRD文档");
});

prdCopyBtn.addEventListener("click", () => {
  if (!lastPrdMarkdown) return;
  copyToClipboard(lastPrdMarkdown).then(() => {
    prdCopyBtn.textContent = "已复制";
    prdCopyBtn.classList.add("copied");
    setTimeout(() => {
      prdCopyBtn.textContent = "复制";
      prdCopyBtn.classList.remove("copied");
    }, 1500);
  });
});

// ========== 风险评审 ==========

prdReviewBtn.addEventListener("click", async () => {
  if (isGenerating) return;
  try {
    if (!getApiKey()) {
      openSettings();
      return;
    }

    if (!lastPrdMarkdown) return;

    // 显示评审区域，清空内容
    reviewSection.classList.remove("hidden");
    reviewContent.innerHTML = "";
    reviewQuestionsSection.classList.add("hidden");
    prdReviewBtn.disabled = true;
    prdReviewBtn.textContent = "评审中…";
    isGenerating = true;

    const markdown = await reviewPRDWithAI(
      lastInput,
      lastQAList,
      lastPrdMarkdown,
      (_delta, accumulated) => {
        reviewContent.innerHTML = renderMarkdownToHTML(accumulated);
      }
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
    prdReviewBtn.disabled = false;
    prdReviewBtn.textContent = "风险评审";
  }
});

reviewCopyBtn.addEventListener("click", () => {
  if (!lastReviewMarkdown) return;
  copyToClipboard(lastReviewMarkdown).then(() => {
    reviewCopyBtn.textContent = "已复制";
    reviewCopyBtn.classList.add("copied");
    setTimeout(() => {
      reviewCopyBtn.textContent = "复制评审结果";
      reviewCopyBtn.classList.remove("copied");
    }, 1500);
  });
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

    if (!lastPrdMarkdown || !lastReviewMarkdown) return;

    // 收集用户对评审问题的回答
    const reviewAnswers = collectReviewAnswers();

    // 隐藏评审区域，回到 PRD 内容区显示最终版
    reviewSection.classList.add("hidden");
    prdContent.innerHTML = "";
    generateFinalPrdBtn.disabled = true;
    generateFinalPrdBtn.textContent = "生成中…";
    isGenerating = true;

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

    // 标记为最终版，清空评审状态
    isFinalPrd = true;
    lastReviewMarkdown = "";

    // 显示附加操作按钮（流程图 + 页面结构说明）
    prdExtraActions.classList.remove("hidden");
    saveSession();
  } catch (error) {
    console.error("Final PRD generation failed:", error);
    showError(error, prdContent);
  } finally {
    isGenerating = false;
    generateFinalPrdBtn.disabled = false;
    generateFinalPrdBtn.textContent = "按照修改建议进行补充并生成最终 PRD";
  }
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

  copyToClipboard(text).then(() => {
    copyBtn.textContent = "已复制";
    copyBtn.classList.add("copied");
    setTimeout(() => {
      copyBtn.textContent = "复制结果";
      copyBtn.classList.remove("copied");
    }, 1500);
  });
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
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
}

function renderHistory() {
  const history = getHistory();
  if (history.length === 0) {
    historyList.innerHTML = '<p class="history-empty">暂无历史记录</p>';
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

  localStorage.setItem(STORAGE_KEYS.INPUT, item.input);
  localStorage.setItem(STORAGE_KEYS.RESULT, JSON.stringify(item.result));
  localStorage.removeItem(STORAGE_KEYS.ANSWERS);
  clearSession();

  prdSection.classList.add("hidden");
  outputSection.classList.remove("hidden");
  render(lastResult);
  historyModal.classList.add("hidden");
}

historyBtn.addEventListener("click", () => {
  renderHistory();
  historyModal.classList.remove("hidden");
});

historyCloseBtn.addEventListener("click", () => {
  historyModal.classList.add("hidden");
});

historyModal.addEventListener("click", (e) => {
  if (e.target === historyModal) historyModal.classList.add("hidden");
});

historyList.addEventListener("click", (e) => {
  // 删除按钮
  const deleteBtn = e.target.closest("[data-delete]");
  if (deleteBtn) {
    e.stopPropagation();
    const idx = parseInt(deleteBtn.dataset.delete, 10);
    const history = getHistory();
    history.splice(idx, 1);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
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
    if (!lastPrdMarkdown || !isFinalPrd) return;

    // 显示加载状态
    flowchartSection.classList.remove("hidden");
    flowchartContent.innerHTML = "";
    flowchartLoading.classList.remove("hidden");
    generateFlowchartBtn.disabled = true;
    generateFlowchartBtn.textContent = "分析中…";
    isGenerating = true;

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
    generateFlowchartBtn.disabled = false;
    generateFlowchartBtn.textContent = "生成业务流程图";
  }
});

/**
 * 渲染流程图结果
 * @param {object} data - { needed, reason, charts }
 */
function renderFlowcharts(data) {
  if (!data.needed || data.charts.length === 0) {
    flowchartContent.innerHTML = `
      <div class="flowchart-not-needed">
        <p class="flowchart-not-needed-icon">&#x2705;</p>
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

  // 逐个渲染，单个失败不影响其他图
  flowchartContent.querySelectorAll(".mermaid").forEach(async (el, i) => {
    try {
      const { svg } = await mermaid.render(`mermaid-svg-${Date.now()}-${i}`, el.textContent);
      el.innerHTML = svg;
    } catch (err) {
      console.error(`Mermaid chart ${i} render failed:`, err);
      el.innerHTML = `<div class="flowchart-render-error"><p>该流程图渲染失败，请展开下方源码查看</p></div>`;
      const card = el.closest(".flowchart-card");
      if (card) {
        const details = card.querySelector(".flowchart-source");
        if (details) details.open = true;
      }
    }
  });
}

flowchartCopyBtn.addEventListener("click", () => {
  if (!lastFlowchartData || !lastFlowchartData.charts.length) return;

  const text = lastFlowchartData.charts
    .map((chart) => `## ${chart.title}\n\n\`\`\`mermaid\n${chart.mermaid}\n\`\`\``)
    .join("\n\n---\n\n");

  copyToClipboard(text).then(() => {
    flowchartCopyBtn.textContent = "已复制";
    flowchartCopyBtn.classList.add("copied");
    setTimeout(() => {
      flowchartCopyBtn.textContent = "复制 Mermaid 源码";
      flowchartCopyBtn.classList.remove("copied");
    }, 1500);
  });
});

// ========== 页面结构说明 ==========

generateWireframeBtn.addEventListener("click", async () => {
  if (isGenerating) return;
  try {
    if (!getApiKey()) {
      openSettings();
      return;
    }
    if (!lastPrdMarkdown || !isFinalPrd) return;

    wireframeSection.classList.remove("hidden");
    wireframeContent.innerHTML = "";
    wireframeLoading.classList.remove("hidden");
    generateWireframeBtn.disabled = true;
    generateWireframeBtn.textContent = "分析中…";
    isGenerating = true;

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
    generateWireframeBtn.disabled = false;
    generateWireframeBtn.textContent = "生成页面结构说明";
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
        <p class="wireframe-not-needed-icon">&#x2705;</p>
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

  copyToClipboard(text).then(() => {
    wireframeCopyBtn.textContent = "已复制";
    wireframeCopyBtn.classList.add("copied");
    setTimeout(() => {
      wireframeCopyBtn.textContent = "复制结构说明";
      wireframeCopyBtn.classList.remove("copied");
    }, 1500);
  });
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

  exportAllModal.classList.remove("hidden");
});

exportAllCancelBtn.addEventListener("click", () => {
  exportAllModal.classList.add("hidden");
});

exportAllModal.addEventListener("click", (e) => {
  if (e.target === exportAllModal) {
    exportAllModal.classList.add("hidden");
  }
});

exportAllConfirmBtn.addEventListener("click", () => {
  if (!lastPrdMarkdown) return;

  const md = generateFullDocument(
    lastPrdMarkdown,
    lastFlowchartData,
    lastWireframeData,
    {
      includeFlowchart: exportIncludeFlowchart.checked,
      includeWireframe: exportIncludeWireframe.checked,
    }
  );

  downloadMarkdown(md, "QuickPRD-全套文档");
  exportAllModal.classList.add("hidden");
});

// ========== 页面加载恢复 ==========

(function restore() {
  const savedInput = localStorage.getItem(STORAGE_KEYS.INPUT);
  const savedResult = localStorage.getItem(STORAGE_KEYS.RESULT);
  if (!savedInput || !savedResult) return;

  textarea.value = savedInput;
  lastInput = savedInput;
  try {
    lastResult = JSON.parse(savedResult);
    outputSection.classList.remove("hidden");
    render(lastResult);
  } catch (_) {
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
  if (savedPrd) {
    lastPrdMarkdown = savedPrd;
    isFinalPrd = savedIsFinal === "1";

    outputSection.classList.add("hidden");
    prdSection.classList.remove("hidden");
    prdContent.innerHTML = renderMarkdownToHTML(savedPrd);

    const prdTitle = prdSection.querySelector(".output-header h2");
    prdTitle.textContent = isFinalPrd ? "PRD 文档（最终版）" : "PRD 文档预览";

    if (isFinalPrd) {
      prdExtraActions.classList.remove("hidden");
    }
  }

  // — 恢复评审 —
  const savedReview = localStorage.getItem(STORAGE_KEYS.SESSION_REVIEW);
  if (savedReview && savedPrd) {
    lastReviewMarkdown = savedReview;
    const cleanedMarkdown = stripReviewQuestionsBlock(savedReview);
    reviewContent.innerHTML = renderMarkdownToHTML(cleanedMarkdown);
    reviewSection.classList.remove("hidden");

    const savedReviewQ = localStorage.getItem(STORAGE_KEYS.SESSION_REVIEW_QUESTIONS);
    if (savedReviewQ) {
      try {
        const questions = JSON.parse(savedReviewQ);
        renderReviewQuestions(questions);
      } catch (_) {}
    }
  }

  // — 恢复流程图 —
  const savedFlowchart = localStorage.getItem(STORAGE_KEYS.SESSION_FLOWCHART);
  if (savedFlowchart && isFinalPrd) {
    try {
      lastFlowchartData = JSON.parse(savedFlowchart);
      flowchartSection.classList.remove("hidden");
      renderFlowcharts(lastFlowchartData);
    } catch (_) {}
  }

  // — 恢复页面结构 —
  const savedWireframe = localStorage.getItem(STORAGE_KEYS.SESSION_WIREFRAME);
  if (savedWireframe && isFinalPrd) {
    try {
      lastWireframeData = JSON.parse(savedWireframe);
      wireframeSection.classList.remove("hidden");
      renderWireframes(lastWireframeData);
    } catch (_) {}
  }
})();

// ========== 首次运行检测 ==========

(function checkFirstRun() {
  if (!getApiKey()) {
    setTimeout(openSettings, 500);
  }
})();
