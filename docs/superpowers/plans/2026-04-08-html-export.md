# HTML 导出功能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在"导出全套文档"弹窗的"确认导出"按钮旁增加下拉箭头，支持选择导出为 Markdown 或 HTML 独立页面，HTML 中 Mermaid 图优先内嵌 SVG，fallback 为 Mermaid 源码 + CDN。

**Architecture:** 在 `export.js` 新增 `generateHTMLDocument()` 函数，运行时从 DOM 提取已渲染的 SVG（id 规则：`mermaid-chart-{index}` 和 `sequence-chart-{index}`），组装含内嵌 CSS 的单文件 HTML 字符串。`index.html` 将原"确认导出"按钮替换为 `.btn-group` 下拉按钮组，`script.js` 处理菜单开关与 HTML 导出事件。

**Tech Stack:** Vanilla JS, XMLSerializer API（内置）, Mermaid.js v10 CDN（仅 fallback 时引入）

---

## 文件变更一览

| 文件 | 变更 |
|------|------|
| `style.css` | 新增 `.btn-group`、`.btn-split-arrow`、`.btn-group-menu` 样式 |
| `index.html` | 导出弹窗底部按钮区：单按钮 → `.btn-group` 下拉按钮组 |
| `export.js` | 新增 `generateHTMLDocument()` + `downloadHTML()` |
| `script.js` | 新增 DOM 引用、下拉菜单开关逻辑、HTML 导出点击事件 |

---

## Task 1：CSS — 下拉按钮组样式

**Files:**
- Modify: `style.css`（在 `.modal-actions` 规则块之后追加，约第 1703 行后）

- [ ] **Step 1：追加 `.btn-group` 相关样式到 `style.css`**

在 `.modal-actions { ... }` 块之后（第 1702 行后）追加：

```css
/* ===== 下拉按钮组 ===== */
.btn-group {
  position: relative;
  display: inline-flex;
}

.btn-split-arrow {
  padding: 0 10px;
  border-left: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
}

.btn-group > .btn-primary:first-child {
  border-radius: var(--radius-md) 0 0 var(--radius-md);
}

.btn-group-menu {
  position: absolute;
  bottom: calc(100% + 6px);
  right: 0;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  min-width: 130px;
  z-index: 200;
  overflow: hidden;
}

.btn-group-menu button {
  display: block;
  width: 100%;
  padding: 9px 14px;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  font-size: var(--font-size-sm);
  font-family: var(--font-family);
  color: var(--color-text-primary);
  transition: background var(--transition-fast);
}

.btn-group-menu button:hover {
  background: var(--color-bg-hover);
}
```

- [ ] **Step 2：确认 CSS 变量存在**

检查 `style.css` 顶部 `:root` 块中是否有 `--radius-md` 和 `--shadow-md`：

```bash
grep -n "radius-md\|shadow-md" style.css | head -10
```

若不存在，将上述 CSS 中的 `var(--radius-md)` 替换为 `6px`，`var(--shadow-md)` 替换为 `0 4px 12px rgba(0,0,0,0.1)`。

- [ ] **Step 3：提交**

```bash
git add style.css
git commit -m "style: add btn-group dropdown styles for export format selector"
```

---

## Task 2：HTML — 更新导出弹窗按钮区

**Files:**
- Modify: `index.html`（导出弹窗 `#export-all-modal` 内的 `.modal-actions`，约第 305-308 行）

- [ ] **Step 1：替换弹窗底部按钮**

将 `index.html` 中：

```html
      <div class="modal-actions">
        <button id="export-all-cancel-btn" class="btn btn-secondary">取消</button>
        <button id="export-all-confirm-btn" class="btn btn-primary">确认导出</button>
      </div>
```

替换为：

```html
      <div class="modal-actions">
        <button id="export-all-cancel-btn" class="btn btn-secondary">取消</button>
        <div class="btn-group">
          <button id="export-all-confirm-btn" class="btn btn-primary">导出 Markdown</button>
          <button id="export-format-toggle" class="btn btn-primary btn-split-arrow" aria-label="选择导出格式">▾</button>
          <div id="export-format-menu" class="btn-group-menu hidden">
            <button id="export-html-btn">导出 HTML</button>
          </div>
        </div>
      </div>
```

- [ ] **Step 2：提交**

```bash
git add index.html
git commit -m "feat: replace export confirm button with split-button dropdown"
```

---

## Task 3：export.js — 新增 generateHTMLDocument 与 downloadHTML

**Files:**
- Modify: `export.js`（在文件末尾 `downloadMarkdown` 函数之后追加）

- [ ] **Step 1：追加 `generateHTMLDocument` 函数**

在 `export.js` 末尾（`downloadMarkdown` 函数后）追加：

```js
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

  // ---- 内嵌 CSS ----
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
}
  `.trim();

  // ---- 主体内容 ----
  let body = "";
  body += `<h1>QuickPRD 全套文档</h1>\n`;
  body += `<p class="meta">导出时间：${dateStr}</p>\n`;
  body += renderMarkdownToHTML(prdMarkdown) + "\n";

  // 业务流程图
  if (options.includeFlowchart && flowchartData && flowchartData.needed && flowchartData.charts.length > 0) {
    body += `<hr>\n<h2>业务流程图</h2>\n`;
    flowchartData.charts.forEach((chart, index) => {
      body += `<h3>${chart.title}</h3>\n`;
      const svgHtml = extractSVG(`mermaid-chart-${index}`);
      if (svgHtml) {
        body += `<div class="diagram">${svgHtml}</div>\n`;
      } else {
        needsCDN = true;
        body += `<div class="diagram"><pre class="mermaid">${chart.mermaid}</pre></div>\n`;
      }
    });
  }

  // 页面结构说明
  if (options.includeWireframe && wireframeData && wireframeData.needed && wireframeData.pages.length > 0) {
    body += `<hr>\n<h2>页面结构说明</h2>\n`;
    wireframeData.pages.forEach((page) => {
      body += `<h3>${page.name}</h3>\n`;
      if (page.entry) body += `<p><strong>入口</strong>：${page.entry}</p>\n`;
      body += renderMarkdownToHTML(page.structure) + "\n";
    });
  }

  // 时序图
  if (options.includeSequence && sequenceData && sequenceData.needed && sequenceData.diagrams.length > 0) {
    body += `<hr>\n<h2>时序图</h2>\n`;
    sequenceData.diagrams.forEach((diagram, index) => {
      body += `<h3>${diagram.title}</h3>\n`;
      const svgHtml = extractSVG(`sequence-chart-${index}`);
      if (svgHtml) {
        body += `<div class="diagram">${svgHtml}</div>\n`;
      } else {
        needsCDN = true;
        body += `<div class="diagram"><pre class="mermaid">${diagram.mermaid}</pre></div>\n`;
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
```

- [ ] **Step 2：提交**

```bash
git add export.js
git commit -m "feat: add generateHTMLDocument and downloadHTML to export.js"
```

---

## Task 4：script.js — 接入事件逻辑

**Files:**
- Modify: `script.js`

### Step 1：添加 DOM 引用

找到 `script.js` 顶部已有的导出相关 DOM 引用区（约第 66-74 行）：

```js
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
```

在这段末尾追加三行：

```js
const exportFormatToggle = document.getElementById("export-format-toggle");
const exportFormatMenu = document.getElementById("export-format-menu");
const exportHtmlBtn = document.getElementById("export-html-btn");
```

- [ ] **Step 2：添加下拉菜单开关逻辑**

找到 `script.js` 中"导出全套文档"事件区（约第 1640 行，`exportAllBtn.addEventListener` 前），在 `exportAllCancelBtn.addEventListener` 之后追加：

```js
exportFormatToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  exportFormatMenu.classList.toggle("hidden");
});

// 点击弹窗任意位置收起菜单
exportAllModal.addEventListener("click", () => {
  exportFormatMenu.classList.add("hidden");
});
```

注意：已有的 `exportAllModal.addEventListener("click", (e) => { if (e.target === exportAllModal) closeModal(exportAllModal); })` 不要删除，两个监听器可以共存。

- [ ] **Step 3：添加"导出 HTML"点击事件**

在上面两段之后追加：

```js
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
```

- [ ] **Step 4：关闭弹窗时重置菜单状态**

找到 `exportAllCancelBtn.addEventListener` 的处理函数：

```js
exportAllCancelBtn.addEventListener("click", () => {
  closeModal(exportAllModal);
});
```

改为：

```js
exportAllCancelBtn.addEventListener("click", () => {
  exportFormatMenu.classList.add("hidden");
  closeModal(exportAllModal);
});
```

- [ ] **Step 5：提交**

```bash
git add script.js
git commit -m "feat: wire up HTML export dropdown in export modal"
```

---

## Task 5：手工验证

- [ ] **Step 1：打开 index.html，完成一轮完整流程**（需求输入 → 澄清 → PRD → 评审 → 最终 PRD → 生成流程图 + 时序图）

- [ ] **Step 2：点击"导出全套文档"，验证下拉按钮出现**
  - "▾" 点击后展开菜单，显示"导出 HTML"
  - 再次点击"▾" 收起菜单
  - 点击弹窗遮罩区域，菜单收起

- [ ] **Step 3：点击"导出 Markdown"，验证 .md 正常下载**（原有行为不变）

- [ ] **Step 4：点击"导出 HTML"，验证 .html 下载后：**
  - 在浏览器打开，PRD 正文正常渲染
  - 流程图 / 时序图显示为内嵌 SVG（与页面上一致）
  - 页面结构说明文字正常渲染
  - 打印预览（Ctrl+P）版式正常

- [ ] **Step 5：验证 fallback 场景**
  - 不生成流程图和时序图，直接导出 HTML
  - 打开 HTML 文件，流程图 / 时序图区域不出现（因为未选中或无数据）

- [ ] **Step 6：提交验证完成**

```bash
git commit --allow-empty -m "chore: verify HTML export feature complete"
```
