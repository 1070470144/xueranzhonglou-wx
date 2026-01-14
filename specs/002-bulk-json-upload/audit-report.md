# Audit Report — 批量 JSON 上传（快速审计）

Date: 2026-01-14

Summary:
- 快速定位若干影响用户体验与可靠性的缺陷，并给出修复优先级与建议实现细节。

Findings:
1. 目录选择回退逻辑（high）
   - 现象：当浏览器支持 `showDirectoryPicker()` 时，代码仅显示提示并返回，不会触发 fallback hidden `input`，导致用户无法完成选择。
   - Repro：在 Chromium 带有 `showDirectoryPicker` 的环境点击“选择文件夹”后观察到提示而非文件选择对话（见 `BulkUploadPanel.vue: triggerFolderInput`）。
   - Fix: 移除早期 `return`，在提示后继续触发 hidden input 的 click；或优先实现完整 `showDirectoryPicker` 递归读取以替代 fallback。

2. Hidden input id/DOM fallback (medium)
   - 现象：hidden inputs 存在，但部分代码通过 `document.getElementById('bulk-folder-input')` 查找，确保 input 元素包含对应 id。
   - Repro：在某些运行时 `this.$refs.folderInput` 不可点击时，DOM fallback 查找失败（未找到 id）。
   - Fix: 给 hidden inputs 添加稳定 id (`bulk-folder-input`, `bulk-file-input`) 并通过 refs 与 DOM 双保险触发 click。

3. Manifest `relativePath` 丢失（medium）
   - 现象：manifest 里只包含 `fileName` 与 `content`，未记录相对路径，影响回溯与审计。
   - Repro：上传结果无法关联原始目录结构。
   - Fix: 在 `onFilesChange` 中读取 `webkitRelativePath`（如果存在）并保存为 `relativePath`，在 `createJob` 时将其一并发送给后端与数据库字段 `sourceFileName`。

4. Backend error format (medium)
   - 现象：后端 `getJobErrors` 返回格式不固定，前端难以稳定导出 CSV。
   - Fix: 统一 `getJobErrors` 返回 `{ code: 0, data: { errors: [{ fileName, error }] } }`。

5. Concurrency control (low)
   - 现象：前端没有明确的并发限流配置（或未暴露），大文件夹可能一次性触发大量请求。
   - Fix: 在前端实现批处理/并发限制（默认并发 5，可配置），后端支持分批处理。

Prioritized fixes (Plan)
1. PR A (quick): fix directory fallback + ensure hidden input ids — immediate UX regression fix.
2. PR B: manifest includes relativePath and stable meta extraction.
3. PR C: backend response formatting and `getJobErrors` standardization.
4. PR D: front-end batching/concurrency and UX polishing.

Next steps:
- Implement PR A immediately (small change in `BulkUploadPanel.vue`).
- After PR A, run manual test with sample folder (10 files) to confirm selection and manifest creation.
- Then implement PR B and PR C in parallel if possible.


