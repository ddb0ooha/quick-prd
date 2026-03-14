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
        md += `${i + 1}. ${q}\n`;
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
        md += `**${i + 1}. ${q}**\n\n`;
        const answer = answerMap[`${groupName}::${q}`];
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
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");
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
 * @param {object} options - { includeFlowchart: boolean, includeWireframe: boolean }
 * @returns {string} - 完整 Markdown
 */
function generateFullDocument(prdMarkdown, flowchartData, wireframeData, options) {
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
