// api.js — AI API 调用层

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

const STORAGE_KEY_API = "rc_api_key";
const STORAGE_KEY_PROVIDER = "rc_api_provider";
const STREAM_TIMEOUT_MS = 60000; // 流式统一 60 秒无数据超时

// ========== System Prompt ==========

const SYSTEM_PROMPT = `你是一位资深的产品需求分析专家。你的任务是分析用户提供的产品需求描述，找出其中模糊、缺失或需要进一步确认的部分，并生成结构化的澄清问题清单。

## 分析维度

你必须从以下 6 个维度逐一审视需求，判断该维度的信息是否充分：

1. **业务目标** — 功能要解决什么问题？业务背景、预期收益、优先级是否清晰？
2. **用户范围** — 目标用户是谁？涉及哪些角色？从哪些渠道触达？有无地区/人群限制？
3. **核心指标** — 如何衡量功能成功？需要哪些埋点和数据报表？
4. **关键规则** — 触发条件、业务逻辑、次数/金额限制、状态流转是否明确？
5. **边界异常** — 失败处理、重复操作、网络中断、回退撤销是否考虑？
6. **风控/技术约束** — 防刷策略、性能要求、安全合规、第三方依赖是否说明？

## 输出要求

- 只输出 JSON，不要输出任何其他内容
- 对于需求中已经明确说明的部分，不要重复提问
- 每个问题必须针对输入的具体业务场景，禁止输出通用/模板化的问题
- 如果某个维度的信息已经足够充分，该维度可以不出现在结果中
- 每个维度最多 4 个问题，只问最关键的

## JSON 格式

返回严格的 json 格式：

{
  "groups": [
    {
      "dimension": "业务目标",
      "questions": [
        "针对该需求的具体问题1",
        "针对该需求的具体问题2"
      ]
    }
  ]
}

如果需求描述非常完整，没有需要澄清的问题，返回：
{"groups": []}`;

const PRD_SYSTEM_PROMPT = `你是一位资深的产品经理。你的任务是根据用户提供的原始需求描述和已澄清的问答信息，生成一份可直接用于评审的精简版 PRD（产品需求文档）。

## 文档结构

严格按以下 4 个章节输出 Markdown 格式文档：

### 1. 背景与目标
- 业务背景和现状
- 要解决的核心问题
- 功能目标和预期收益
- 成功衡量指标

### 2. 功能说明
- 目标用户和使用场景
- 核心功能描述
- 主要交互流程（用有序列表描述关键步骤）
- 涉及的用户角色及其权限差异（如有）

### 3. 业务规则
- 触发条件和判断逻辑
- 数量/金额/频率/时间等限制规则
- 状态流转说明
- 关键业务公式或算法（如有）

### 4. 边界与异常
- 异常场景及对应处理方案
- 并发/重复操作处理
- 回退和降级策略
- 风控/安全/合规要求
- 第三方依赖和性能约束

## 输出要求

- 直接输出 Markdown 正文，不要用代码块包裹
- 标题使用 ## 和 ###
- 内容必须具体，直接写出确定的规则和数值，而非泛泛而谈
- 用户已回答的问题，将答案融入对应章节的正文中，不要以问答形式呈现
- 用户未回答的问题（答案为空），在对应位置用 **[待确认]** 标注，并附上需要确认的具体内容
- 不要编造用户未提供的信息，不确定的一律标注 [待确认]
- 语言风格：简洁专业，适合技术和产品团队评审阅读`;

// ========== API Key / Provider 管理 ==========

function getApiKey() {
  return localStorage.getItem(STORAGE_KEY_API) || "";
}

function setApiKey(key) {
  localStorage.setItem(STORAGE_KEY_API, key.trim());
}

function getProvider() {
  return localStorage.getItem(STORAGE_KEY_PROVIDER) || "deepseek";
}

function setProvider(provider) {
  localStorage.setItem(STORAGE_KEY_PROVIDER, provider);
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

const REVIEW_SYSTEM_PROMPT = `你是一位同时兼任技术负责人和风控负责人的资深专家。你的任务是对一份 PRD（产品需求文档）进行技术和风控视角的预审，找出其中的逻辑漏洞、技术风险和潜在问题，帮助团队在正式评审前发现并修复问题。

## 核心原则

**所有修改建议必须是 MVP（最小可行产品）方案。** 只建议当前阶段必须做的最简方案，不要过度设计。例如：
- 不要建议"接入专业风控系统"，而是建议"加一个简单的频率限制"
- 不要建议"搭建完整的监控告警体系"，而是建议"关键操作记录日志"
- 不要建议"设计可扩展的状态机"，而是建议"用简单的状态字段+条件判断"

## 审查维度

你必须从以下 6 个维度逐一审视 PRD：

1. **逻辑完整性** — 流程是否有断裂？状态流转是否闭环？条件分支是否穷举？是否存在互相矛盾的规则？
2. **技术可行性** — 方案在技术上是否可落地？是否依赖不存在或不成熟的能力？是否存在性能瓶颈（高并发、大数据量）？
3. **安全/风控** — 是否存在刷单、薅羊毛、越权访问、数据泄露等风险？是否有合规问题（隐私、支付、内容审核）？
4. **数据一致性** — 并发场景下数据是否一致？关键操作是否具备幂等性？失败后是否有补偿/回滚机制？
5. **边界遗漏** — PRD 中标注了 [待确认] 但其实可以根据上下文推断的项？完全没有提到但应该考虑的边界场景？
6. **指标可度量** — 成功指标是否具体可量化？埋点方案是否可执行？数据报表需求是否明确？

## 输出格式

输出分为三个部分：

### Part 1：MVP 修改建议

- 直接输出 Markdown 正文，不要用代码块包裹
- 开头用一段话给出总体评价（2-3 句话概括 PRD 的质量和主要问题方向）
- 每条发现按以下格式输出：

### {严重程度emoji} {严重程度}：{问题标题}

**问题**：具体描述发现的问题，引用 PRD 中的相关内容

**建议**：给出明确、可操作的 MVP 修改建议（最简可行方案）

- 严重程度分三级：
  - 🔴 高风险 — 不解决就不应进入开发
  - 🟡 中风险 — 建议评审前明确
  - 🔵 建议 — 可以后续迭代解决

- 按严重程度从高到低排列
- 没有问题的维度不需要输出
- 不要编造问题，只指出真正存在的风险

### Part 2：待确认问题

在修改建议之后、评审结论之前，输出需要产品经理/业务方确认才能给出合理 MVP 建议的问题。

格式要求：
- 先输出标题 ## 待确认问题
- 然后输出一个 JSON 代码块（用 \`\`\`json 包裹），格式如下：

\`\`\`json
{
  "review_questions": [
    {
      "question": "具体的决策性问题",
      "context": "为什么需要确认这个问题（简要说明对方案的影响）"
    }
  ]
}
\`\`\`

- 只问影响方案走向的决策性问题，不问细枝末节
- 最多 5 个问题
- 如果没有需要确认的问题，输出空数组：{"review_questions": []}

### Part 3：评审结论

## 评审结论

{结论}：{一句话说明理由}

结论必须是以下三者之一：✅ 建议通过 / ⚠️ 建议修改后通过 / ❌ 建议驳回重写`;

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

const FINAL_PRD_SYSTEM_PROMPT = `你是一位资深的产品经理。你的任务是根据以下材料，生成一份修订后的最终版 PRD 文档：

1. 原始需求描述
2. 澄清问答
3. PRD 初稿
4. 技术/风控评审意见（MVP 修改建议）
5. 用户对评审待确认问题的补充回答（如有）

## 修订要求

- 以 PRD 初稿为基础进行修订，不要从零重写
- **所有修订必须遵循 MVP 原则**，只做当前阶段必要的最简方案，不要过度设计
- 逐条处理评审意见中的所有 🔴 高风险和 🟡 中风险问题，将 MVP 修改建议融入文档
- 🔵 建议类问题酌情处理，如果能简单补充则补充
- 如果用户对评审待确认问题提供了回答，将回答融入文档对应位置
- 对于用户未回答的评审待确认问题，按最简 MVP 方案给出建议并标注 **[建议方案]**
- 对于 PRD 初稿中标注 **[待确认]** 的内容，如果评审意见、用户补充回答或上下文中能推断出合理方案，直接给出建议方案并标注 **[建议方案]**
- 如果确实无法推断，保留 **[待确认]** 标注

## 文档结构

保持与 PRD 初稿相同的 4 章节结构：

1. 背景与目标
2. 功能说明
3. 业务规则
4. 边界与异常

## 输出要求

- 直接输出 Markdown 正文，不要用代码块包裹
- 标题使用 ## 和 ###
- 在文档开头添加一行：> 📌 本文档为最终版，已根据技术/风控评审意见修订
- 修订处不需要标注修改痕迹，直接输出修订后的最终文案
- 内容必须具体，写出确定的规则和数值
- 语言风格：简洁专业，适合技术和产品团队评审阅读`;

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
