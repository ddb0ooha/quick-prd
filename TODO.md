# QuickPRD — 代办事项

## P0 — 数据安全

- [x] **步骤回退保护**：生成澄清问题前，若已存在用户答案，弹出确认框（"当前已有 N 个答案，重新分析会清空，是否继续？"），防止静默丢失数据
  - 文件：`script.js`
  - 位置：`generateClarifyBtn` 点击处理逻辑，`localStorage.removeItem(STORAGE_KEYS.ANSWERS)` 之前

- [x] **新建会话清空条件完整化**：扩展条件检查，覆盖评审、流程图、页面结构、时序图等所有阶段数据，防止误清空
  - 文件：`script.js`
  - 位置：`newSessionBtn` 点击处理逻辑，当前条件 `lastResult || lastPrdMarkdown` 需扩展

---

## P1 — 流程逻辑

- [x] **产出物按钮先决条件优化**：放宽流程图/页面结构/时序图的生成条件，取消 `isFinalPrd` 硬依赖，改为仅需 `lastPrdMarkdown` 有效即可触发；若保留限制，则在按钮 `disabled` 状态下通过 `title` 属性显示提示文字（"需先完成评审并生成最终版 PRD"）
  - 文件：`script.js`
  - 位置：`generateFlowchartBtn`、`generateWireframeBtn`、`generateSequenceBtn` 点击处理逻辑

- [x] **评审区域持久化**：生成最终 PRD 失败时，评审区域自动恢复可见，确保用户能查看评审建议
  - 文件：`script.js`
  - 位置：`generateFinalPrdBtn` catch 块补充 `reviewSection.classList.remove("hidden")`

- [x] **PRD 编辑后评审提示**：PRD 被手动编辑后，若用户再次触发风险评审，显示一行提示："当前 PRD 已编辑，评审将基于最新内容进行"
  - 文件：`script.js`
  - 位置：`reviewBtn` 点击处理逻辑，检测 `prdManuallyEdited` 标记后插入提示

---

## P2 — 信息架构

- [x] **导出弹窗未生成项灰化**：导出全套文档弹窗中，流程图/页面结构/时序图若尚未生成，对应 checkbox 改为灰化禁用，附说明"尚未生成或不需要"（原代码已实现）
  - 文件：`script.js`
  - 位置：`exportAllBtn` click 处理逻辑（已有 `export-option-disabled` 逻辑）

- [x] **制品按钮 tooltip 提示**：为流程图/页面结构/时序图三个生成按钮添加 `title` 属性，明确说明前置条件
  - 文件：`index.html`

- [x] **会话恢复后下一步引导**：restore() 完成后，根据当前状态通过 toast 显示下一步建议（覆盖澄清/PRD/评审三种中间状态）
  - 文件：`script.js`
  - 位置：`restore()` IIFE 末尾，600ms 延迟显示，持续 5s

- [x] **模板切换说明与保护**：模板选择器添加 `title` tooltip 说明影响范围；切换时若已有澄清问题或 PRD，显示 toast 提醒需重新生成
  - 文件：`index.html`、`script.js`

---

## P4 — 交互细节

- [x] **答案自动保存视觉反馈**：澄清问题的答案输入框在自动保存成功后，在输入框右侧显示极简"已保存"文字指示，1.5s 后淡出消失
  - 文件：`script.js`、`style.css`
  - 位置：`saveAnswers()` 调用处，成功后触发指示动画

- [x] **输入框 focus 样式统一**：所有 `.input-base` 的 `:focus` 状态补充 `box-shadow: 0 0 0 3px` 蓝色光圈反馈，与 `.prd-edit-textarea:focus` 保持一致
  - 文件：`style.css`
  - 位置：`.input-base:focus` 规则，参考 `.prd-edit-textarea:focus` 的实现

- [x] **补全 :focus-visible 样式**：为 `.example-btn`、`.modal-hint a` 等缺少键盘焦点样式的元素补充 `:focus-visible` 规则
  - 文件：`style.css`
  - 位置：对应选择器的 focus 状态定义区域
