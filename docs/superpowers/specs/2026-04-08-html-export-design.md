# HTML 导出功能设计文档

**日期：** 2026-04-08  
**功能：** 导出为 HTML 独立页面  
**状态：** 已批准，待实施

---

## 背景

现有"导出全套文档"弹窗仅支持下载 `.md` 文件。本次新增"导出 HTML"选项，生成含样式的单文件 HTML，Mermaid 图优先内嵌为 SVG（离线可用），适合作邮件附件或直接在浏览器打开分享。

---

## 用户决策记录

| 问题 | 用户选择 |
|------|----------|
| Mermaid 图呈现方式 | C：SVG 优先，fallback 到源码 + CDN |
| HTML 视觉风格 | A：简洁阅读风（黑白、打印友好、无外部依赖） |
| 导出入口位置 | B："确认导出"改为下拉按钮组 |
| 实现方案 | A：运行时从 DOM 提取已渲染 SVG |

---

## 架构与文件职责

| 文件 | 变更内容 |
|------|----------|
| `export.js` | 新增 `generateHTMLDocument()` + `downloadHTML()` |
| `script.js` | 导出弹窗新增"导出 HTML"点击事件，下拉菜单开关逻辑 |
| `index.html` | "确认导出"按钮替换为 `.btn-group` 下拉按钮组 |
| `style.css` | 新增 `.btn-group`、`.btn-split-arrow`、`.btn-group-menu` 样式 |

---

## HTML 文档结构

```
<html>
  <head>
    <meta charset="UTF-8">
    <title>QuickPRD 全套文档</title>
    <style> /* 内嵌 CSS，无外部依赖 */ </style>
  </head>
  <body>
    <h1>QuickPRD 全套文档</h1>
    <p class="meta">导出时间：YYYY/MM/DD</p>
    <!-- PRD 正文（renderMarkdownToHTML 转换） -->
    <hr>
    <!-- 业务流程图（如选中且有数据） -->
    <h2>业务流程图</h2>
    <h3>流程图标题</h3>
    <div class="diagram"><!-- 内嵌 SVG 或 fallback --></div>
    <!-- 页面结构说明（如选中且有数据） -->
    <!-- 时序图（如选中且有数据） -->
  </body>
</html>
```

---

## SVG 提取逻辑

- **流程图**：从 `#flowchart-content .mermaid-diagram svg` 读取已渲染 SVG
- **时序图**：从 `#sequence-content .mermaid-diagram svg` 读取已渲染 SVG
- **Fallback**：若 SVG 不存在（未渲染或渲染失败），输出 `<pre class="mermaid">` 源码块（Mermaid CDN 可识别的格式）
- **CDN 脚本**：若有任何图表进入 fallback 分支，则在 HTML `</body>` 前插入 Mermaid CDN `<script>`，打开时在线渲染；若所有图表均为 SVG 则不插入，保持完全离线
- **页面结构说明**：无 Mermaid，直接复用 `renderMarkdownToHTML()` 渲染

SVG 提取时需将 `outerHTML` 序列化，并确保 `xmlns` 属性存在（保证离线 SVG 渲染正常）。

---

## 内嵌 CSS 规格（简洁阅读风）

```css
body {
  font-family: -apple-system, "Segoe UI", "PingFang SC", sans-serif;
  max-width: 800px;
  margin: 40px auto;
  padding: 0 24px;
  line-height: 1.7;
  color: #1a1a1a;
}
h1, h2, h3, h4 { border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; }
pre { background: #f5f5f5; border-left: 3px solid #ccc; padding: 12px 16px; overflow-x: auto; }
code { background: #f0f0f0; padding: 1px 4px; border-radius: 3px; }
blockquote { border-left: 3px solid #ccc; margin: 0; padding-left: 16px; color: #666; }
hr { border: none; border-top: 1px solid #e0e0e0; margin: 32px 0; }
.meta { color: #888; font-size: 0.9em; }
.diagram { margin: 16px 0; overflow-x: auto; }
.mermaid-source { font-size: 0.85em; }
@media print {
  body { max-width: 100%; margin: 0; }
}
```

---

## 下拉按钮组 UI

### HTML 结构

```html
<div class="btn-group">
  <button id="export-all-confirm-btn" class="btn btn-primary">导出 Markdown</button>
  <button id="export-format-toggle" class="btn btn-primary btn-split-arrow" aria-label="选择导出格式">▾</button>
  <div id="export-format-menu" class="btn-group-menu hidden">
    <button id="export-html-btn">导出 HTML</button>
  </div>
</div>
```

### CSS 结构

```css
.btn-group { position: relative; display: inline-flex; }
.btn-split-arrow { padding: 0 10px; border-left: 1px solid rgba(255,255,255,0.3); }
.btn-group-menu {
  position: absolute;
  bottom: calc(100% + 4px);
  right: 0;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  min-width: 120px;
  z-index: 100;
}
.btn-group-menu button {
  display: block;
  width: 100%;
  padding: 8px 14px;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  font-size: var(--font-size-sm);
}
.btn-group-menu button:hover { background: var(--color-bg-hover); }
```

### 交互行为

- 点击"导出 Markdown"：原有逻辑，下载 `.md`，关闭弹窗
- 点击"▾"：展开/收起 `.btn-group-menu`
- 点击"导出 HTML"：调用 `generateHTMLDocument()` 下载 `.html`，关闭弹窗
- 点击弹窗遮罩 / 取消按钮：菜单收起，弹窗关闭

---

## 文件命名

| 格式 | 文件名 |
|------|--------|
| Markdown | `QuickPRD-全套文档.md` |
| HTML | `QuickPRD-全套文档.html` |

---

## 不在本次范围内

- 单独导出澄清文档或评审报告为 HTML（只做"全套文档"入口）
- HTML 文件中支持深色模式
- 字体使用 CDN 加载 DM Serif/DM Sans
