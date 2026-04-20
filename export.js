// export.js — 需求文档导出

// GROUP_ORDER 定义在 api.js 中（全局共享）

/**
 * 生成 Markdown 需求澄清文档
 * @param {string} originalText - 原始需求描述
 * @param {object} grouped - 分组问题 { "业务目标": ["q1","q2"], ... }
 * @param {Array<{group: string, question: string, answer: string}>} [qaList] - 问答列表（可选）
 * @returns {string} - Markdown 文档内容
 */
function generateMarkdown(originalText, grouped, qaList) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const activeGroups = GROUP_ORDER.filter(
    (g) => grouped[g] && grouped[g].length > 0
  );

  let md = "";

  md += `# 需求澄清文档\n\n`;
  md += `> 生成时间：${dateStr}  \n`;
  md += `> 工具：QuickPRD (AI)\n\n`;
  md += `---\n\n`;

  // 第一部分：原始需求
  md += `## 原始需求描述\n\n`;
  md += `${originalText}\n\n`;
  md += `---\n\n`;

  // 第二部分：待澄清问题
  md += `## 待澄清问题\n\n`;

  if (activeGroups.length === 0) {
    md += `需求描述已经很完整，暂无需要澄清的问题。\n\n`;
  } else {
    for (const groupName of activeGroups) {
      md += `### ${groupName}\n\n`;
      grouped[groupName].forEach((q, i) => {
        const qText = typeof q === "string" ? q : q.q;
        md += `${i + 1}. ${qText}\n`;
      });
      md += `\n`;
    }
  }

  md += `---\n\n`;

  // 第三部分：澄清记录
  if (activeGroups.length > 0) {
    // 构建问答查找表
    const answerMap = {};
    if (qaList) {
      for (const qa of qaList) {
        answerMap[`${qa.group}::${qa.question}`] = qa.answer;
      }
    }

    const hasAnyAnswer = qaList && qaList.some((qa) => qa.answer);
    md += `## 澄清记录\n\n`;
    if (!hasAnyAnswer) {
      md += `> 请在下方记录各问题的澄清结果：\n\n`;
    }
    for (const groupName of activeGroups) {
      md += `### ${groupName}\n\n`;
      grouped[groupName].forEach((q, i) => {
        const qText = typeof q === "string" ? q : q.q;
        md += `**${i + 1}. ${qText}**\n\n`;
        const answer = answerMap[`${groupName}::${qText}`];
        md += answer ? `答：${answer}\n\n` : `答：\n\n`;
      });
    }
  }

  return md;
}

/**
 * 轻量 Markdown → HTML 渲染（用于页面预览）
 * 支持：标题、加粗、有序/无序列表、段落、分隔线、待确认标记
 */
function renderMarkdownToHTML(md) {
  const lines = md.split("\n");
  const html = [];
  let inOl = false;
  let inUl = false;
  let inBlockquote = false;
  let inCodeBlock = false;
  let codeBlockContent = [];

  function closeLists() {
    if (inOl) { html.push("</ol>"); inOl = false; }
    if (inUl) { html.push("</ul>"); inUl = false; }
  }

  function closeBlockquote() {
    if (inBlockquote) { html.push("</blockquote>"); inBlockquote = false; }
  }

  function closeAll() {
    closeLists();
    closeBlockquote();
  }

  function escapeHTML(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function inline(text) {
    return escapeHTML(text)
      .replace(/\*\*\[待确认\]\*\*/g, '<span class="prd-pending">[待确认]</span>')
      .replace(/`([^`]+?)`/g, "<code>$1</code>")
      .replace(/\*\*([\s\S]+?)\*\*/g, (_, inner) => `<strong>${inner.replace(/\*(.+?)\*/g, "<em>$1</em>")}</strong>`)
      .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 代码块
    if (/^```/.test(line.trim())) {
      if (inCodeBlock) {
        html.push(`<pre><code>${escapeHTML(codeBlockContent.join("\n"))}</code></pre>`);
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        closeAll();
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // 标题
    if (line.startsWith("#### ")) {
      closeAll();
      html.push(`<h4>${inline(line.slice(5))}</h4>`);
    } else if (line.startsWith("### ")) {
      closeAll();
      html.push(`<h3>${inline(line.slice(4))}</h3>`);
    } else if (line.startsWith("## ")) {
      closeAll();
      html.push(`<h2>${inline(line.slice(3))}</h2>`);
    } else if (line.startsWith("# ")) {
      closeAll();
      html.push(`<h1>${inline(line.slice(2))}</h1>`);
    }
    // 分隔线
    else if (/^---+$/.test(line.trim())) {
      closeAll();
      html.push("<hr>");
    }
    // 引用块
    else if (/^>\s?/.test(line)) {
      closeLists();
      if (!inBlockquote) { html.push("<blockquote>"); inBlockquote = true; }
      html.push(`<p>${inline(line.replace(/^>\s?/, ""))}</p>`);
    }
    // 有序列表
    else if (/^\d+\.\s/.test(line)) {
      closeBlockquote();
      if (!inOl) { closeLists(); html.push("<ol>"); inOl = true; }
      html.push(`<li>${inline(line.replace(/^\d+\.\s/, ""))}</li>`);
    }
    // 无序列表
    else if (/^[-*]\s/.test(line)) {
      closeBlockquote();
      if (!inUl) { closeLists(); html.push("<ul>"); inUl = true; }
      html.push(`<li>${inline(line.replace(/^[-*]\s/, ""))}</li>`);
    }
    // 空行
    else if (line.trim() === "") {
      closeAll();
    }
    // 普通段落
    else {
      closeAll();
      html.push(`<p>${inline(line)}</p>`);
    }
  }
  // 处理未关闭的代码块
  if (inCodeBlock) {
    html.push(`<pre><code>${escapeHTML(codeBlockContent.join("\n"))}</code></pre>`);
  }
  closeAll();
  return html.join("\n");
}

/**
 * 组装全套文档 Markdown
 * @param {string} prdMarkdown - 最终版 PRD Markdown
 * @param {object|null} flowchartData - 流程图数据 { needed, charts: [{title, mermaid}] }
 * @param {object|null} wireframeData - 页面结构数据 { needed, pages: [{name, entry, structure}] }
 * @param {object|null} sequenceData - 时序图数据 { needed, diagrams: [{title, mermaid}] }
 * @param {object} options - { includeFlowchart, includeWireframe, includeSequence }
 * @returns {string} - 完整 Markdown
 */
function generateFullDocument(prdMarkdown, flowchartData, wireframeData, sequenceData, options) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  let md = `# QuickPRD - 全套文档\n\n`;
  md += `> 导出时间：${dateStr}\n\n`;

  // PRD 文档
  md += `---\n\n`;
  md += prdMarkdown + "\n\n";

  // 业务流程图
  if (options.includeFlowchart && flowchartData && flowchartData.needed && flowchartData.charts.length > 0) {
    md += `---\n\n`;
    md += `## 业务流程图\n\n`;
    flowchartData.charts.forEach((chart) => {
      md += `### ${chart.title}\n\n`;
      md += `\`\`\`mermaid\n${chart.mermaid}\n\`\`\`\n\n`;
    });
  }

  // 页面结构说明
  if (options.includeWireframe && wireframeData && wireframeData.needed && wireframeData.pages.length > 0) {
    md += `---\n\n`;
    md += `## 页面结构说明\n\n`;
    wireframeData.pages.forEach((page) => {
      md += `### ${page.name}\n\n`;
      if (page.entry) md += `**入口**：${page.entry}\n\n`;
      md += page.structure + "\n\n";
    });
  }

  // 时序图
  if (options.includeSequence && sequenceData && sequenceData.needed && sequenceData.diagrams.length > 0) {
    md += `---\n\n`;
    md += `## 时序图\n\n`;
    sequenceData.diagrams.forEach((diagram) => {
      md += `### ${diagram.title}\n\n`;
      md += `\`\`\`mermaid\n${diagram.mermaid}\n\`\`\`\n\n`;
    });
  }

  return md;
}

/**
 * 下载 Markdown 文件
 * @param {string} content - 文件内容
 * @param {string} filename - 文件名（不含扩展名）
 */
function downloadMarkdown(content, filename) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 从 DOM 提取已渲染的 SVG，若不存在则返回 null
 * @param {string} containerId - 容器元素 ID
 * @returns {string|null} - SVG outerHTML 或 null
 */
function extractSVG(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return null;
  const svg = container.querySelector("svg");
  if (!svg) return null;
  const clone = svg.cloneNode(true);
  if (!clone.getAttribute("xmlns")) {
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }
  return new XMLSerializer().serializeToString(clone);
}

/**
 * 生成 HTML 独立页面（内嵌样式，Mermaid 图优先 SVG，fallback 为源码+CDN）
 * @param {string} prdMarkdown
 * @param {object|null} flowchartData - { needed, charts: [{title, mermaid}] }
 * @param {object|null} wireframeData - { needed, pages: [{name, entry, structure}] }
 * @param {object|null} sequenceData - { needed, diagrams: [{title, mermaid}] }
 * @param {object} options - { includeFlowchart, includeWireframe, includeSequence }
 * @returns {string} - 完整 HTML 字符串
 */
function generateHTMLDocument(prdMarkdown, flowchartData, wireframeData, sequenceData, options) {
  const now = new Date();
  const dateStr = now.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });

  let needsCDN = false;

  const css = `
*, *::before, *::after { box-sizing: border-box; }
body {
  font-family: -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  max-width: 800px;
  margin: 40px auto;
  padding: 0 24px 80px;
  line-height: 1.75;
  color: #1a1a1a;
  background: #fff;
}
h1 { font-size: 2em; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; margin-bottom: 24px; margin-top: 0; }
h2 { font-size: 1.4em; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; margin-top: 40px; }
h3 { font-size: 1.15em; margin-top: 24px; }
h4 { font-size: 1em; margin-top: 16px; }
p { margin: 8px 0; }
ul, ol { padding-left: 24px; }
li { margin: 4px 0; }
blockquote { border-left: 3px solid #ccc; margin: 0; padding: 4px 16px; color: #666; background: #f9f9f9; }
pre { background: #f5f5f5; border-left: 3px solid #ccc; padding: 12px 16px; overflow-x: auto; border-radius: 4px; font-size: 0.9em; }
code { background: #f0f0f0; padding: 1px 5px; border-radius: 3px; font-size: 0.9em; }
pre code { background: none; padding: 0; }
hr { border: none; border-top: 1px solid #e0e0e0; margin: 32px 0; }
table { border-collapse: collapse; width: 100%; margin: 12px 0; }
th, td { border: 1px solid #e0e0e0; padding: 8px 12px; text-align: left; }
th { background: #f5f5f5; font-weight: 600; }
strong { font-weight: 600; }
.meta { color: #888; font-size: 0.9em; margin-bottom: 32px; }
.diagram { margin: 16px 0; overflow-x: auto; }
.diagram svg { max-width: 100%; height: auto; }
.prd-pending { background: #fff3cd; color: #856404; padding: 1px 4px; border-radius: 3px; font-size: 0.85em; }
@media print {
  body { max-width: 100%; margin: 0; padding: 16px; }
}`.trim();

  let body = "";
  body += `<h1>QuickPRD 全套文档</h1>\n`;
  body += `<p class="meta">导出时间：${dateStr}</p>\n`;
  body += renderMarkdownToHTML(prdMarkdown) + "\n";

  if (options.includeFlowchart && flowchartData && flowchartData.needed && flowchartData.charts.length > 0) {
    body += `<hr>\n<h2>业务流程图</h2>\n`;
    flowchartData.charts.forEach((chart, index) => {
      body += `<h3>${escapeHTML(chart.title)}</h3>\n`;
      const svgHtml = extractSVG(`mermaid-chart-${index}`);
      if (svgHtml) {
        body += `<div class="diagram">${svgHtml}</div>\n`;
      } else {
        needsCDN = true;
        body += `<div class="diagram"><pre class="mermaid">${escapeHTML(chart.mermaid)}</pre></div>\n`;
      }
    });
  }

  if (options.includeWireframe && wireframeData && wireframeData.needed && wireframeData.pages.length > 0) {
    body += `<hr>\n<h2>页面结构说明</h2>\n`;
    wireframeData.pages.forEach((page) => {
      body += `<h3>${escapeHTML(page.name)}</h3>\n`;
      if (page.entry) body += `<p><strong>入口</strong>：${escapeHTML(page.entry)}</p>\n`;
      body += renderMarkdownToHTML(page.structure) + "\n";
    });
  }

  if (options.includeSequence && sequenceData && sequenceData.needed && sequenceData.diagrams.length > 0) {
    body += `<hr>\n<h2>时序图</h2>\n`;
    sequenceData.diagrams.forEach((diagram, index) => {
      body += `<h3>${escapeHTML(diagram.title)}</h3>\n`;
      const svgHtml = extractSVG(`sequence-chart-${index}`);
      if (svgHtml) {
        body += `<div class="diagram">${svgHtml}</div>\n`;
      } else {
        needsCDN = true;
        body += `<div class="diagram"><pre class="mermaid">${escapeHTML(diagram.mermaid)}</pre></div>\n`;
      }
    });
  }

  const cdnScript = needsCDN
    ? `\n  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"><\/script>`
    : "";

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QuickPRD 全套文档</title>
  <style>
${css}
  </style>
</head>
<body>
${body}${cdnScript}
</body>
</html>`;
}

/**
 * 下载 HTML 文件
 * @param {string} content - HTML 字符串
 * @param {string} filename - 文件名（不含扩展名）
 */
function downloadHTML(content, filename) {
  const blob = new Blob([content], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
