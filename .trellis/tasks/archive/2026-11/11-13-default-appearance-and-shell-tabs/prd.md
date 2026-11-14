# 侧边栏与标签页样式统一及仅默认外观生效改造

## Goal

消除船板主题补丁在 Antigravity 2.0 NewUX（`data-newux-theme="onyx"`）下的全壳层割裂与换肤锁死问题：
1. 在客户端处于**默认外观**（`Default Light` / `Default Dark` 且未手动改写种子颜色）时，让顶栏菜单、左侧边栏、顶部标题/分栏 Tab 条、右侧辅助面板标签胶囊（`.agy-aux-tab`）、浮层弹窗与主对话卡片呈现无缝统一的暖色纸墨层次；
2. 当用户在 `Settings → Appearance` 切换到任何**非默认主题**（如 `Everforest`、`Dracula`、`Catppuccin`、`Legacy Light/Dark` 或手动修改拾色器颜色）时，毫秒级实时撤出全部主题色与蜡封视觉覆盖，同时**保持自定义字体、实时指标胶囊、汉化与死锁/缩放修复等非配色增强模块正常工作**。

## Background & Key Decisions

- **运行态主题引擎事实（`main.js` 实测）**：新版 Antigravity 将外观预设存储于异步 `window.nativeStorage`（键 `theme-preset-light` / `theme-preset-dark`，支持 `onChanged` 监听；默认预设集合为 `""` / `"Default"` / `"Default Light"` 或 `"Default Dark"`），并在每次切换模式、对比度、预设或拾色器（`Background` / `Foreground` / `Accent`）时由 `YZ(...)` / `o7b(...)` 同步刷新 `document.documentElement.style` 的 `--background`、`--foreground`、`--primary`、`--shell`、`--glass*`、`--onyx-*` 以及 `document.body` 的 `data-agy-theme` / `data-agy-home-glow` 属性。
- **已确认产品边界决策（D1）**：切换到非默认主题时，仅卸除色彩皮肤、壳层铺底、输入框蜡封与墨色字色覆盖；**非配色增强模块（`fonts`、`metrics`、`i18n`、`deadlockHealer`、`customCss`、`customJs`）保持常驻生效**，其中实时指标胶囊自动跟随宿主主题原生变量自适应着色。

## Requirements

- **R1 — 默认外观下全壳层（侧边栏 + 顶栏 + 分栏/辅助 Tab + 浮层）统一染色**（高优先级缺陷修复）：
  - *证据与锚点*：原生 `.agy-inset-shell` 绑定 `--shell-canvas: var(--shell)`，且左栏外层 `.contents` 用行内样式重绑 `--sidebar: var(--shell-canvas)`。当前仅亮色 `high-contrast`（`core/theme.css:232, 260-263, 270-272`）设置了 `--shell-canvas` 与 `--onyx-selected`；暗色分支（`core/theme.css:275-343`）及另外两套亮色预设（`vintage-deep` `core/theme.css:155-170`、`claude-desktop-purewhite` `core/theme.css:173-192`）漏配了 `--shell`、`--shell-canvas`、`--secondary`、`--muted`、`--glass`、`--glass-border` 与 `--onyx-*`（`--onyx-frame`、`--onyx-well`、`--onyx-raised`、`--onyx-selected`、`--onyx-key`、`--home-glow`），导致左栏落回冷黑 `#121216`、选中行落回 `#1F1F24`、`.agy-aux-tab` 胶囊与弹窗毛玻璃残留冷色。同时 `core/theme.css:331-343` 对外层 `.agy-sheet` 强铺 `--background` 与顶光，破坏了顶部 40px `[data-main-content-header]` / 分栏 `[data-tiling-pane]` 与左栏共享 `--shell-canvas` 的内嵌卡片层次。
  - *要求*：在暗色及三套亮色预设下完整映射上述壳层、交互、毛玻璃与 `onyx` 令牌；保持内嵌容器 `.agy-sheet[data-sheet-inset]` 透明无背景图，将 `--background` 与暗色暖顶光收敛至内嵌圆角卡片 `[data-main-content-body]`、`[data-side-panel-body]` 及非内嵌 `.agy-sheet:not([data-sheet-inset])`。

- **R2 — 仅默认 Appearance 启用主题色覆盖（零轮询实时切换）**（高优先级功能与缺陷修复）：
  - *证据与锚点*：`core/runtime.js:321-447` 无条件在 `<html>` 设置 `data-ag-preset` / `data-ag-scheme`，且仅读取旧版 `localStorage`（未读取 `window.nativeStorage` 的 `theme-preset-light` / `theme-preset-dark` 及 DOM 种子色）。
  - *要求*：在 `core/runtime.js` 中结合 `window.nativeStorage`（`getItems` 初始化 + `onChanged` 增量缓存，兼容回退 `localStorage`）、`body[data-agy-home-glow]`（排除 `Legacy Light/Dark`）与 `document.documentElement.style` 原生默认种子色集合（亮色 bg `{#ffffff,#f9f9f9}` / fg `{#0a0a0c,#000000,#101010}` / primary `{#2f75c3,#2560a3,#007acc}`；暗色 bg `{#070708,#050507,#101010}` / fg `{#ffffff,#cccccc}` / primary `{#2f71e3,#007acc}`）实时判定默认外观：
    - 默认外观：设置 `html[data-ag-appearance="default"]` 与 `html[data-ag-preset]`，应用全量 `themeVars`（`core/runtime.js:104-128`）；
    - 非默认外观：设置 `html[data-ag-appearance="custom"]`，移除 `data-ag-preset`，并在 `applyThemeVars` 中仅保留非色彩排版变量（`--ag-chat-font-size`）；
    - 全程使用带自写守卫的 `MutationObserver` + 单实例 `nativeStorage.onChanged` 驱动，禁止轮询，且在热重载与 `enabled: false`（`core/runtime.js:147-186`）时完整解绑清理。

- **R3 — 全局颜色规则严格收口与非配色增强模块常驻适配**（高优先级架构约束）：
  - *证据与锚点*：`core/theme.css:346-580`、`1079-1081`、`1096-1101` 中存在未挂载 `html[data-ag-preset]` 的全局颜色规则（壳层描边、输入框蜡封三态、搜索聚焦环 `#D97757`、发送按钮陶土橙 `#D97757`、侧栏/菜单/弹窗 `--ag-ink*` 字色）；而字体层（`core/theme.css:1-152`、`539-541`、`565-567`、`1090-1094`）与指标胶囊层（`core/theme.css:582-1033`）需跨主题常驻，但 `:root`（`core/theme.css:1050-1076`）上的 `--ag-metric-*` 写死了暖白配色。
  - *要求*：将全部色彩、表面、蜡封与 `--ag-ink*` 选择器收口至 `html[data-ag-preset]` 下；保持字体规则、`i18n`、`deadlockHealer` 与指标胶囊布局常驻，并在 `html:not([data-ag-preset])` 下使用宿主原生 `--foreground`、`--muted-foreground`、`--primary`、`--popover`、`--card`、`--border` 动态派生 `--ag-metric-*` 令牌（利用常驻 `data-ag-scheme` 区分亮/暗语义状态色）。

- **R4 — 诊断探针、清单哈希与文档契约同步**：
  - *证据与锚点*：`install.mjs:371-397`（`inspectLiveWindow`）与 `install.mjs:765-793`（`runVerify`）负责实机验收；`core/manifest.json` 维护内核 SHA-256 完整性。
  - *要求*：在 `inspectLiveWindow` 中补充 `appearance` 与 `shellBg` 状态字段，同步更新 `SKILL.md` / `AGENTS.md` 中的默认外观让位说明，并通过 `node install.mjs build-manifest` 重建清单哈希。

## Technical Notes

- `MutationObserver` 监听 `documentElement` 的 `style` 属性时，必须在 `applyThemeVars` 内启用内部写入标志与等值短路比较，确保零重入死循环。
- 升级或重装时严禁覆盖用户已有的 `~/.gemini/antigravity/theme-patch/user/*` 配置。

## Acceptance Criteria

- [x] **AC1（映射 R1 — 默认外观全壳层统一）**：在 `Default Dark` 与 `Default Light`（含全部三套预设）下，顶部 35px 菜单栏、左侧边栏、顶部 40px 标题/分栏 Tab 条底色完全一致无断层；右栏主卡片圆角内嵌层次清晰；侧边栏选中行、悬停操作遮罩、分段切换槽、设置弹窗毛玻璃及右侧 `.agy-aux-tab` 胶囊均为协调暖色。
- [x] **AC2（映射 R2, R3 — 非默认主题完整让位）**：在 `Settings → Appearance` 切换至 `Everforest`（或 `Legacy Dark` 等其它非默认预设，或手动调整 Background/Foreground/Accent 拾色器）时，`html[data-ag-appearance]` 即时变为 `"custom"` 且移除 `data-ag-preset`；左栏、右栏主画布、输入框、发送按钮及设置弹窗 100% 呈现目标主题原生配色，零船板暖棕或陶土橙残留。
- [x] **AC3（映射 R3, D1 — 非配色模块常驻与自适应）**：在非默认主题下，补丁字体（`fonts.ui` / `fonts.code`）、实时指标胶囊（`#ag-live-metrics-pill` 及其详情浮层，自动适配当前主题前景色与卡片底色）、`i18n` 与快捷键修复均保持正常生效。
- [x] **AC4（映射 R2 — 往返恢复与生命周期安全）**：从非默认主题切回 `Default Dark` / `Default Light`（默认种子色）时，船板全壳层暖色立即无损恢复；重复热重载注入或设置 `"enabled": false` 时无监听器叠加或 `MutationObserver` 循环。
- [x] **AC5（映射 R4 — 完整性与实机校验）**：`node --check`、`node install.mjs build-manifest`、`node install.mjs doctor`、`node install.mjs verify` 与 `node install.mjs verify --safe-mode` 全部通过（`ok: true`、`coreIntegrity.clean: true`）。

## Out of Scope

- 修改 Antigravity 或 Antigravity IDE 的安装目录、二进制或 `.asar`。
- 探测、连接或修改 `~/.antigravity-ide/*`（包括 `argv.json` 与 `extensions`）。
- 引入任何 npm 依赖、构建打包工具或修改 `core/daemon.mjs` SQLite 采集逻辑。
