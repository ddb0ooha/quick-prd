// api.js — AI API 调用层（Prompt 定义已迁移至 prompts.js）

const API_PROVIDERS = {
  deepseek: {
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/chat/completions",
    model: "deepseek-chat",
  },
  openrouter: {
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1/chat/completions",
    model: "deepseek/deepseek-chat",
  },
};

// ========== 共享常量 ==========

const GROUP_ORDER = [
  "业务目标",
  "用户范围",
  "核心指标",
  "关键规则",
  "边界异常",
  "风控/技术约束",
];

const STREAM_TIMEOUT_MS = 60000; // 流式统一 60 秒无数据超时

// ========== API Key / Provider 管理 ==========

function getApiKey() {
  return localStorage.getItem(STORAGE_KEYS.API_KEY) || "";
}

function setApiKey(key) {
  localStorage.setItem(STORAGE_KEYS.API_KEY, key.trim());
}

function getProvider() {
  return localStorage.getItem(STORAGE_KEYS.API_PROVIDER) || "deepseek";
}

function setProvider(provider) {
  localStorage.setItem(STORAGE_KEYS.API_PROVIDER, provider);
}

// ========== 通用 API 调用 ==========

/**
 * 构建请求 headers
 */
function buildHeaders(apiKey, providerId) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  if (providerId === "openrouter") {
    headers["HTTP-Referer"] = window.location.href;
    headers["X-Title"] = "QuickPRD";
  }
  return headers;
}

/**
 * 处理 HTTP 错误状态码
 */
function handleHttpError(status, errorBody) {
  let message = `API 请求失败 (${status})`;
  try {
    const parsed = JSON.parse(errorBody);
    message = parsed.error?.message || message;
  } catch (_) {}

  if (status === 401) throw new Error("API_KEY_INVALID");
  if (status === 429) throw new Error("RATE_LIMITED");
  throw new Error(message);
}

/**
 * 流式调用 AI（SSE）
 * @param {Array} messages - 消息列表
 * @param {object} options - { responseFormat, onChunk }
 * @returns {Promise<string>} - 完整的响应文本
 */
async function streamAI(messages, options = {}) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("API_KEY_MISSING");

  const providerId = getProvider();
  const provider = API_PROVIDERS[providerId] || API_PROVIDERS.deepseek;
  const headers = buildHeaders(apiKey, providerId);

  const body = {
    model: provider.model,
    messages,
    max_tokens: 4096,
    temperature: 0.3,
    stream: true,
  };
  if (options.responseFormat) {
    body.response_format = options.responseFormat;
  }

  const controller = new AbortController();
  let timeoutTimer = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);

  // 每收到数据就重置超时
  function resetTimeout() {
    clearTimeout(timeoutTimer);
    timeoutTimer = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);
  }

  let response;
  try {
    response = await fetch(provider.baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutTimer);
    if (err.name === "AbortError") {
      throw new Error("请求超时，请检查网络连接后重试。");
    }
    throw new Error("网络请求失败，请检查网络连接。（" + err.message + "）");
  }

  if (!response.ok) {
    clearTimeout(timeoutTimer);
    const errorBody = await response.text();
    handleHttpError(response.status, errorBody);
  }

  // 读取 SSE 流
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      resetTimeout();
      buffer += decoder.decode(value, { stream: true });

      // 按行解析 SSE
      const lines = buffer.split("\n");
      buffer = lines.pop(); // 保留未完成的行

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;

        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            accumulated += delta;
            if (options.onChunk) {
              options.onChunk(delta, accumulated);
            }
          }
        } catch (_) {
          // 忽略无法解析的行
        }
      }
    }
  } finally {
    clearTimeout(timeoutTimer);
  }

  return accumulated;
}

// ========== AI 分析调用 ==========

/**
 * 调用 AI 分析需求文本（流式，完成后返回完整 JSON）
 * @param {string} requirementText - 需求描述
 * @param {function} [onProgress] - 进度回调，接收已接收字符数
 * @returns {Promise<string>} - AI 返回的原始 JSON 文本
 */
async function analyzeWithAI(requirementText, onProgress) {
  return streamAI(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: requirementText },
    ],
    {
      responseFormat: { type: "json_object" },
      onChunk: onProgress
        ? (_delta, full) => onProgress(full.length)
        : undefined,
    }
  );
}

// ========== PRD 生成（流式） ==========

/**
 * 调用 AI 生成 PRD 文档（流式输出）
 * @param {string} originalText - 原始需求描述
 * @param {Array<{group: string, question: string, answer: string}>} qaList - 问答列表
 * @param {function} [onChunk] - 流式回调，接收 (delta, accumulated)
 * @returns {Promise<string>} - 完整 Markdown 文本
 */
async function generatePRDWithAI(originalText, qaList, onChunk) {
  let userContent = `## 原始需求描述\n\n${originalText}\n\n## 澄清问答\n\n`;
  for (const qa of qaList) {
    userContent += `**[${qa.group}] ${qa.question}**\n`;
    userContent += qa.answer
      ? `答：${qa.answer}\n\n`
      : `答：（未回答）\n\n`;
  }

  return streamAI(
    [
      { role: "system", content: PRD_SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    { onChunk }
  );
}

// ========== PRD 评审（流式） ==========

/**
 * 调用 AI 对 PRD 进行技术/风控评审（流式输出）
 * @param {string} originalText - 原始需求描述
 * @param {Array<{group: string, question: string, answer: string}>} qaList - 问答列表
 * @param {string} prdMarkdown - PRD 文档 Markdown 全文
 * @param {function} [onChunk] - 流式回调，接收 (delta, accumulated)
 * @returns {Promise<string>} - 完整评审 Markdown 文本
 */
async function reviewPRDWithAI(originalText, qaList, prdMarkdown, onChunk) {
  let userContent = `## 原始需求描述\n\n${originalText}\n\n`;

  userContent += `## 澄清问答\n\n`;
  for (const qa of qaList) {
    userContent += `**[${qa.group}] ${qa.question}**\n`;
    userContent += qa.answer
      ? `答：${qa.answer}\n\n`
      : `答：（未回答）\n\n`;
  }

  userContent += `## PRD 文档\n\n${prdMarkdown}`;

  return streamAI(
    [
      { role: "system", content: REVIEW_SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    { onChunk }
  );
}

// ========== 最终 PRD 生成（流式） ==========

/**
 * 根据评审意见生成最终版 PRD（流式输出）
 * @param {string} originalText - 原始需求描述
 * @param {Array<{group: string, question: string, answer: string}>} qaList - 问答列表
 * @param {string} prdMarkdown - PRD 初稿 Markdown
 * @param {string} reviewMarkdown - 评审意见 Markdown
 * @param {Array<{question: string, context: string, answer: string}>} reviewAnswers - 用户对评审待确认问题的回答
 * @param {function} [onChunk] - 流式回调
 * @returns {Promise<string>} - 最终版 PRD Markdown
 */
async function generateFinalPRDWithAI(originalText, qaList, prdMarkdown, reviewMarkdown, reviewAnswers, onChunk) {
  let userContent = `## 原始需求描述\n\n${originalText}\n\n`;

  userContent += `## 澄清问答\n\n`;
  for (const qa of qaList) {
    userContent += `**[${qa.group}] ${qa.question}**\n`;
    userContent += qa.answer
      ? `答：${qa.answer}\n\n`
      : `答：（未回答）\n\n`;
  }

  userContent += `## PRD 初稿\n\n${prdMarkdown}\n\n`;
  userContent += `## 技术/风控评审意见\n\n${reviewMarkdown}`;

  if (reviewAnswers && reviewAnswers.length > 0) {
    userContent += `\n\n## 评审待确认问题的补充回答\n\n`;
    for (const ra of reviewAnswers) {
      userContent += `**${ra.question}**\n`;
      userContent += ra.answer
        ? `答：${ra.answer}\n\n`
        : `答：（未回答，请按最简 MVP 方案处理）\n\n`;
    }
  }

  return streamAI(
    [
      { role: "system", content: FINAL_PRD_SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    { onChunk }
  );
}

// ========== 流程图生成（流式） ==========

/**
 * 根据最终版 PRD 生成业务流程图（流式传输，完成后返回 JSON）
 * @param {string} finalPrdMarkdown - 最终版 PRD Markdown
 * @param {function} [onProgress] - 进度回调，接收已接收字符数
 * @returns {Promise<string>} - AI 返回的 JSON 文本
 */
async function generateFlowchartWithAI(finalPrdMarkdown, onProgress) {
  const userContent = `## 最终版 PRD\n\n${finalPrdMarkdown}`;

  return streamAI(
    [
      { role: "system", content: FLOWCHART_SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    {
      responseFormat: { type: "json_object" },
      onChunk: onProgress
        ? (_delta, full) => onProgress(full.length)
        : undefined,
    }
  );
}

// ========== 页面结构说明生成（流式） ==========

/**
 * 根据最终版 PRD 生成页面结构说明（流式传输，完成后返回 JSON）
 * @param {string} finalPrdMarkdown - 最终版 PRD Markdown
 * @param {function} [onProgress] - 进度回调，接收已接收字符数
 * @returns {Promise<string>} - AI 返回的 JSON 文本
 */
async function generateWireframeWithAI(finalPrdMarkdown, onProgress) {
  const userContent = `## 最终版 PRD\n\n${finalPrdMarkdown}`;

  return streamAI(
    [
      { role: "system", content: WIREFRAME_SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    {
      responseFormat: { type: "json_object" },
      onChunk: onProgress
        ? (_delta, full) => onProgress(full.length)
        : undefined,
    }
  );
}

// ========== 响应解析 ==========

/**
 * 将 AI 返回的 JSON 解析为分组格式
 * @param {string} jsonText - AI 返回的 JSON 字符串
 * @returns {object} - { "业务目标": ["问题1",...], ... }
 */
function parseAIResponse(jsonText) {
  let cleaned = jsonText.trim();
  // 处理可能的 markdown 代码块包裹
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }

  const parsed = JSON.parse(cleaned);
  const grouped = {};

  if (parsed.groups && Array.isArray(parsed.groups)) {
    for (const group of parsed.groups) {
      if (group.questions && group.questions.length > 0) {
        grouped[group.dimension] = group.questions;
      }
    }
  }

  return grouped;
}

/**
 * 解析流程图 AI 响应
 * @param {string} jsonText - AI 返回的 JSON
 * @returns {object} - { needed, reason, charts: [{title, why, mermaid}] }
 */
function parseFlowchartResponse(jsonText) {
  let cleaned = jsonText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }

  const parsed = JSON.parse(cleaned);
  return {
    needed: !!parsed.needed,
    reason: parsed.reason || "",
    charts: Array.isArray(parsed.charts)
      ? parsed.charts.map((c) => ({
          ...c,
          mermaid: (c.mermaid || "").replace(/\\n/g, "\n"),
        }))
      : [],
  };
}

/**
 * 解析页面结构说明 AI 响应
 * @param {string} jsonText - AI 返回的 JSON
 * @returns {object} - { needed, reason, pages: [{name, entry, structure}] }
 */
function parseWireframeResponse(jsonText) {
  let cleaned = jsonText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }

  const parsed = JSON.parse(cleaned);
  return {
    needed: !!parsed.needed,
    reason: parsed.reason || "",
    pages: Array.isArray(parsed.pages)
      ? parsed.pages.map((p) => ({
          ...p,
          structure: (p.structure || "").replace(/\\n/g, "\n"),
        }))
      : [],
  };
}
