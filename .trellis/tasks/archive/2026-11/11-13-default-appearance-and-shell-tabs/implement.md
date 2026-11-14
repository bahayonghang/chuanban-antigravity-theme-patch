# 执行计划：侧边栏与标签页样式统一及仅默认外观生效改造

## 1. 有序实施清单（Ordered Implementation Checklist）

1. **`core/runtime.js` — 默认 Appearance 零轮询判定与状态门控**：
   - 在 `applyThemeVars(varsObj, allowColorVars = true)` 中增加自写守卫 `window.__ag_internal_dom_mutating` 与等值判断；当 `allowColorVars === false` 时仅保留非色彩排版变量（`--ag-chat-font-size`），移除已挂载的颜色类变量。
   - 新增 `isDefaultAppearance(hostScheme)`：综合 `window.__ag_ns_presets`（来自 `window.nativeStorage.getItems()` 与 `onChanged` 增量缓存，回退 `localStorage`）、`body[data-agy-theme]` 下的 `data-agy-home-glow` 属性校验（识别 `Legacy Light/Dark`）、以及 `document.documentElement.style` 原生种子色集合（`--background` / `--foreground` / `--primary`，跳过用户 `THEME_VARS` 已接管的键）。
   - 重构 `syncChuanbanPreset()`：
     - 始终同步 `html[data-ag-scheme]`（`'light'` | `'dark'`）；
     - 默认外观时设置 `html[data-ag-appearance="default"]`、`html[data-ag-preset="<targetPreset>"]` 并应用全量 `THEME_VARS`；
     - 非默认外观时设置 `html[data-ag-appearance="custom"]`、移除 `data-ag-preset`，并调用 `applyThemeVars(THEME_VARS, false)` 退让全部色彩覆盖；字体、`metrics`、`i18n`、`deadlockHealer`、`customCss`、`customJs` 保持常驻。
   - 升级 `installSchemeObserver()` 与 `disconnectSchemeObservers()`：
     - `MutationObserver` 观测 `documentElement` (`['class', 'style']`) 与 `body` (`['class', 'data-agy-theme', 'data-agy-home-glow']`)，回调内若 `window.__ag_internal_dom_mutating` 为真则直接返回；
     - 单实例安全订阅 `window.nativeStorage?.onChanged`，在 `disconnectSchemeObservers()` 与 `!ENABLED` 分支中完整解绑/清理并移除 `data-ag-appearance`。
2. **`core/theme.css` — 全壳层统一染色、颜色规则门控收口与指标胶囊自适应**：
   - 保持字体定义与排版映射（`1-152`、`[role="menu"]`/`[role="dialog"]` `font-family`、`html[data-ag-custom-font-size="true"]`）全局常驻。
   - 为三套亮色预设（`high-contrast`、`claude-desktop-purewhite`、`vintage-deep`）与暗色分支（`html[data-ag-preset][data-ag-scheme="dark"]`）补齐完整 NewUX 令牌：`--shell`、`--shell-canvas`、`--secondary`、`--muted`、`--glass`、`--glass-border`、`--onyx-frame`、`--onyx-well`、`--onyx-raised`、`--onyx-selected`、`--onyx-key`、`--home-glow`。
   - 修正壳层与内嵌卡片选择器：
     - `html[data-ag-preset] :is(.agy-shell, .agy-inset-shell, .bg-sidebar)` 统一绑定 `--shell: var(--sidebar) !important; --shell-canvas: var(--sidebar) !important; background-color: var(--sidebar) !important;`；
     - `html[data-ag-preset] .agy-sheet[data-sheet-inset]` 保持透明无背景图，将 `--background` 与暗色微暖顶光精准落在 `[data-main-content-body]`、`[data-side-panel-body]` 与非内嵌 `.agy-sheet:not([data-sheet-inset])` 上。
   - 将原 `346-580`、`1079-1081`、`1096-1101` 中所有裸全局颜色/边框/蜡封/陶土橙发送按钮/搜索聚焦环/`--ag-ink*` 墨色字重选择器统一挂载到 `html[data-ag-preset]` 作用域下。
   - 新增 `html:not([data-ag-preset])`（及 `[data-ag-scheme="dark"]`）下的 `--ag-metric-*` 自适应派生变量（基于 `--foreground`、`--muted-foreground`、`--primary`、`--popover`、`--card`、`--border` `color-mix`），确保非默认主题下实时指标胶囊与详情浮层视觉和谐。
3. **`install.mjs` & 文档微同步**：
   - 在 `install.mjs` 的 `inspectLiveWindow()` 状态探针中补充 `appearance: document.documentElement.getAttribute('data-ag-appearance')` 与 `shellBg`（实测 `[aria-label="Sidebar"]` 或 `.agy-inset-shell` 的 `backgroundColor`）。
   - 在 `SKILL.md` 与 `AGENTS.md` 中用简短语句同步默认 Appearance 自动让位与非配色模块常驻契约。
4. **重建哈希、部署与实机多场景验证**：
   - 运行 `node install.mjs build-manifest` 更新 `core/manifest.json`。
   - 运行 `node install.mjs install` 部署至本机运行目录（保护已有 `user/` 不覆盖）。
   - 通过 `doctor`、`verify` 与 CDP 实机验证：
     1. `Default Dark` 下顶栏、左栏、顶部 40px Header/Tab 条、选中行、`.agy-aux-tab`、主卡片与输入框色值全部暖色统一且无断层；
     2. 模拟/验证切换至 `Everforest`（及 `Default Light`）时，`data-ag-appearance="custom"` 立即触发，`data-ag-preset` 移除，左栏、右栏、输入框、发送按钮、设置弹窗全部还原为 `Everforest` 原生配色，同时字体与 `#ag-live-metrics-pill` 正常常驻并自适应配色；
     3. 切回 `Default Dark` 后船板全壳层暖色立即无损恢复（最后确保用户实机状态与验证前一致，不遗留测试主题改动）。

---

## 2. 验证命令（Validation Commands）

```powershell
Set-Location 'D:\Documents\Code\Web\Exp\chuanban-antigravity-theme-patch'
node --check install.mjs
node --check core/daemon.mjs
node --check core/runtime.js
node install.mjs build-manifest
node install.mjs doctor
node install.mjs install
node install.mjs verify
node install.mjs verify --safe-mode
```

---

## 3. 风险文件与回滚点（Risky Files & Rollback Points）

- **高关注度文件**：
  1. `core/runtime.js`：`MutationObserver` 监听 `documentElement` 的 `style` 属性时，若缺少自写守卫或等值判断可能引发微任务循环；必须严格通过 `window.__ag_internal_dom_mutating` + 属性值幂等比较双重防护。
  2. `core/theme.css`：将 `346-580` 行复合选择器挂载到 `html[data-ag-preset]` 时，逗号分隔的每个选择器分支都必须带 `html[data-ag-preset]`（或使用 `html[data-ag-preset] :is(...)`），漏挂任何一个逗号分支都会在非默认主题下残留局部硬编码颜色。
- **回滚点**：
  - 本机运行态回滚：`node install.mjs rollback`（恢复 `~/.gemini/antigravity/theme-patch/core.prev/` 并立即重注入）。
  - 仓库源码回滚：`git checkout -- core/ install.mjs SKILL.md AGENTS.md`。

---

## 4. `task.py start` 前置检查项（Pre-Start Gate）

- [x] `prd.md` 已完成无损收敛（无未决阻塞问题、无临时章节、锚点与验收映射完整）。
- [x] `design.md` 与 `implement.md` 已就绪。
- [x] `implement.jsonl` 与 `check.jsonl` 已注入真实 `spec` / `research` 上下文并通过 `task.py validate`。
- [ ] 已向用户展示最终规划摘要，并获得用户显式批准开始实施。
