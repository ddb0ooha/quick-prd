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
  } catch (_) {}
})();

// ========== 首次运行检测 ==========

(function checkFirstRun() {
  if (!getApiKey()) {
    setTimeout(openSettings, 500);
  }
})();
