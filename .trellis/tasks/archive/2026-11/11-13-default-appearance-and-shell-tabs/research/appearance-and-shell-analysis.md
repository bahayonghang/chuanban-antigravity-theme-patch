# 侧边栏与标签页样式未统一 & 仅默认 Appearance 生效：根因与可行性分析

## 1. 现场证据概览

- **运行环境**：Windows (`win32`), Node.js `v26.7.0`, Antigravity Stable 2.0 NewUX (`body.theme-standalone.theme-dark[data-agy-theme][data-newux-theme="onyx"]`), CDP 端口 `4027` (`https://127.0.0.1:4037/`)。
- **用户反馈现象**：
  1. **现象 A（侧边栏与顶部 Tab/标题栏割裂）**：在默认暗色（`Default Dark`）及部分预设下，只有最顶部系统菜单栏（`Antigravity Workspace View Window`，高 35px）与右侧主对话卡片/输入框变成了船板暖棕（`#24201C` / `#1C1917` / `#2A231E`），而左侧边栏（`+ New Conversation`、项目会话列表）与顶部内嵌标题/Tab 条仍保持冷调蓝黑（`#121216`，选中行 `#1F1F24`），在 `y=35px` 处形成明显色阶断层。
  2. **现象 B（切换其它主题失效）**：在 `Settings → Appearance` 将主题预设切为 `Everforest`（`Background #2D353B`、`Foreground #D3C6AA`、`Accent #A7C080`）时，仅左侧边栏底色变为 Everforest 绿灰，右侧主区域、输入框、发送按钮和设置弹窗依然被锁死在船板暖棕配色。

---

## 2. 问题一分析：为什么侧边栏与 Tab 没有被修改？能否修改和优化？

### 2.1 根因 1：`onyx` 外壳令牌链 `--shell` → `--shell-canvas` → 行内 `--sidebar` 覆盖了补丁规则

通过 CDP 实测运行态 DOM 层级与原生样式表，Antigravity 2.0 NewUX（`data-newux-theme="onyx"`）的壳层结构如下：

```text
body.theme-standalone.theme-dark[data-agy-theme][data-newux-theme="onyx"]
└─ div.h-screen.w-screen.flex.flex-col.bg-background
   ├─ div[data-testid="title-menu-bar"].h-[35px].bg-sidebar       ← 顶栏 (y=0..35)：直接读取 body 的 --sidebar (#24201C)
   └─ div.agy-inset-shell.bg-[var(--shell-canvas)]                ← 内嵌外框 (y=35..bottom)：背景读 --shell-canvas
      └─ div[data-testid="sidebar-split"]
         ├─ div.contents[style="--color-sidebar: var(--shell-canvas); --sidebar: var(--shell-canvas);"]
         │  └─ div[role="navigation"][aria-label="Sidebar"].bg-sidebar  ← 左栏：其 --sidebar 被父节点行内样式重绑到 --shell-canvas！
         └─ div.agy-sheet[data-sheet-inset]
            ├─ div[data-main-content-header]                      ← 顶部 40px 标题/分栏 Tab 栏 (y=35..75)
            └─ div[data-main-content-body]                        ← 右侧主对话圆角内嵌卡片 (y=75..bottom)
```

关键冲突链路：
1. 原生 CSS 规则 `body[data-agy-theme] .agy-inset-shell { --shell-canvas: var(--shell); }`（特异性 `(0,2,1)`）将 `--shell-canvas` 绑定到原生根级内联变量 `--shell`（`Default Dark` 下为 `#121216`）。
2. 左栏外层 `<div class="contents" style="--color-sidebar: var(--shell-canvas); --sidebar: var(--shell-canvas);">` 使用**行内样式**把 `--sidebar` 重绑回 `var(--shell-canvas)`。
3. 因此，`core/theme.css:337-339` 虽然写了：
   ```css
   html[data-ag-scheme="dark"] .bg-sidebar {
     background-color: var(--sidebar) !important;
   }
   ```
   但在 `[aria-label="Sidebar"].bg-sidebar` 上解析 `var(--sidebar)` 时，命中了父节点 `.contents` 的行内 `--sidebar: var(--shell-canvas)`，最终落回原生的 `--shell`（`#121216`）！
4. 此前 `11-10-light-scheme-anthropic-polish` 任务仅在亮色 `high-contrast` 分支（`core/theme.css:232, 260-263`）补了 `--shell-canvas: #F0EEE6 !important`，而：
   - **暗色分支**（`core/theme.css:275-343`）未设置 `--shell` 与 `--shell-canvas`；
   - **其余两套亮色预设**（`vintage-deep` `core/theme.css:155-170`、`claude-desktop-purewhite` `core/theme.css:173-192`）同样未设置 `--shell` 与 `--shell-canvas`。

### 2.2 根因 2：侧边栏交互态与 `onyx` 专属表面变量未同步映射

在 `body[data-agy-theme][data-newux-theme="onyx"].dark` 下，原生组件并非只读 `--sidebar-secondary`，而是读取一系列 `--onyx-*` 变量：
- **会话选中行**：`.agy-sidebar-row[data-selected="true"]` 读取 `var(--onyx-selected, #1F1F24)` 并写入 `--row-bg: var(--onyx-selected, #1F1F24) !important`。目前仅亮色 `high-contrast`（`core/theme.css:270-272`）映射了 `--onyx-selected: var(--sidebar-secondary)`，暗色及其他亮色预设均残留冷灰蓝 `#1F1F24` / `#E4E5E9`。
- **会话行悬停操作渐隐遮罩**：`.agy-sidebar-row .agy-row-actions::before` 使用 `linear-gradient(var(--row-bg)...), linear-gradient(var(--sidebar)...), var(--shell)`；若 `--shell` 未同步为暖色，悬停右侧操作按钮时会出现冷黑底块。
- **分段开关槽与按键**：`[data-slot="toggle-group"]`（如 Settings → Theme 切换槽）使用 `--onyx-well`（暗色默认 `#111115`）与 `--onyx-key`（暗色默认 `#24252A`）。

### 2.3 根因 3：顶部标题/分栏 Tab 栏与右侧辅助面板 Tab（`.agy-aux-tab`）未适配

Antigravity 2.0 中存在两类 Tab / 顶栏结构：
1. **主工作区顶栏与分栏会话 Tab（`[data-main-content-header]`、`[data-tiling-pane]`、`[data-testid="pane-titlebar-toolbar"]`）**：
   - 原生设计为「外壳画布（`--shell-canvas`）托住左栏与顶部 40px 栏，右侧 `[data-main-content-body]` 作为圆角内嵌卡片浮在画布中」，因此原生规则令 `body[data-agy-theme] .agy-sheet[data-sheet-inset] { background-color: transparent; }`。
   - 但在 `core/theme.css:331-343` 中，暗色规则直接对 `.agy-sheet` 强制写入 `background-color: var(--background) !important` 和顶光 `radial-gradient(...) !important`，导致右侧 40px 顶栏被涂成 `#1C1917`（不再透出外壳色），而左栏顶栏是 `#121216`、最顶菜单栏是 `#24201C`，三块区域各自为政。
   - 多分栏/多 Tab 模式（`[data-split-panes]`）下，`[data-tiling-pane]::after` 圆角遮罩、`[data-testid="pane-titlebar-toolbar"]`（`--background: var(--shell-canvas)`）与 `[data-splitter-band]` 全部依赖 `--shell-canvas`；右侧 `[data-main-content-body]` 在暗色下还缺少显式 `background-color: var(--background) !important`（亮色 `core/theme.css:256` 已加，暗色 `core/theme.css:331-335` 漏掉了 `[data-main-content-body]` 和 `[data-side-panel-body]`）。
2. **右侧辅助面板 / Artifact / Review 标签条（`[data-side-panel-strip]` 与 `.agy-aux-tab`）**：
   - 位于 `[data-side-panel-strip]`（高 40px，底色来自外层 `.agy-inset-shell` 的 `--shell-canvas`）。
   - 标签胶囊 `.agy-aux-tab` 的类名契约：
     - 激活态：`bg-secondary text-foreground`（拖拽态 `bg-muted text-foreground`）
     - 未激活态：`bg-transparent text-secondary-foreground hover:bg-muted hover:text-foreground`
     - 分割线：`bg-border`
   - 由于 `core/theme.css` 未覆盖 `--secondary` 与 `--muted`（暗色下仍为冷白透明 `rgb(255 255 255 / 0.115)` / `0.068`），且 `--shell-canvas` 未设，导致 Tab 栏底色与激活胶囊均未融入暖色纸墨体系。

### 2.4 可行性与优化结论（问题一）

**完全可以修改且能做到结构级干净统一，无需 hack 行内样式或轮询 DOM**：
- 在补丁激活主题色的作用域下，同时在根级与 `.agy-shell, .agy-inset-shell` 设置 `--shell: var(--sidebar) !important; --shell-canvas: var(--sidebar) !important;`（三套亮色预设 + 暗色模式全覆盖）。这样左栏 `.contents` 的 `--sidebar: var(--shell-canvas)` 会自然解析为暖色 `--sidebar`（暗色 `#24201C`，亮色 `#F0EEE6` / `#FBFBF9` / `#F1E8DC`），与顶部 35px 菜单栏零色差衔接。
- 在暗色及全部亮色预设下补齐 `[data-main-content-body], [data-side-panel-body] { background-color: var(--background) !important; }`，并让内嵌工作区 `.agy-sheet[data-sheet-inset]` 保持透明（顶光渐变如有需要挂在 `[data-main-content-body]` 而非 `.agy-sheet` 外层），使顶部 40px Header / 分栏 Tab 条与左栏融为一体托起圆角主卡片（与亮色 Anthropic 纸面层次完全一致）。
- 补齐 `--onyx-selected: var(--sidebar-secondary)`、`--onyx-well`、`--onyx-key` 以及 `--secondary: var(--sidebar-secondary)`、`--muted: var(--sidebar-muted)`（或对应暖色阶），让侧边栏选中/悬停行、顶部会话分栏 Tab、右侧 `.agy-aux-tab` 标签胶囊与分段控件全部自然呈现一致暖色。

---

## 3. 问题二分析：为什么切换其它主题不起作用？如何只影响默认 Appearance？

### 3.1 根因：补丁无条件激活预设属性 + 全局无作用域选择器强行覆盖

1. **`core/runtime.js:321-377` 无条件写入 `data-ag-preset` / `data-ag-scheme`**：
   - `syncChuanbanPreset()` 在 `enabled !== false` 时始终在 `<html>` 设置 `data-ag-preset="high-contrast"` 与 `data-ag-scheme="dark"|"light"`，完全不检查用户在 Antigravity `Settings → Appearance` 中选了什么主题。
   - 此外 `core/runtime.js:323-366` 仍只读 `localStorage.getItem('theme-preset-light')`，而新版 Antigravity 早已将设置迁移到了 `window.nativeStorage`（底层持久化在 `%APPDATA%\Antigravity\app_storage.json`），`localStorage` 中甚至没有 `theme-preset-dark`。
2. **`core/theme.css` 存在大量 `!important` 颜色覆盖与无前缀全局规则**：
   - `core/theme.css:275-343` 在 `html[data-ag-scheme="dark"]` 上用 `!important` 锁死了 `--background`、`--foreground`、`--sidebar`、`--card`、`--border`、`.bg-background`、`.agy-sheet`。当用户切换到 `Everforest` 时，Antigravity 原生脚本虽然在 `document.documentElement.style` 写入了 `--background: #2d353b; --shell: color-mix(... #2d353b)`，但被补丁在 `body.theme-dark` 上的 `!important` 规则全部压制（唯独左栏因 `--shell-canvas` 漏配而透出了 Everforest 的 `--shell`！这完美解释了图 2 中「左栏变绿、右栏仍棕」的现象）。
   - 更关键的是，`core/theme.css:346-580` 中大量染色规则**甚至没有挂在 `html[data-ag-preset]` 下**，例如：
     - `.agy-inset-shell` / `[data-main-content-body]::after`（`346-358`）
     - `#antigravity.agentSidePanelInputBox` / `.surface-composer` / `.surface-composer-card`（`361-419`）
     - 搜索框橙色聚焦圈 `#D97757`（`422-431`）
     - 发送按钮 `[data-testid="send-button"]` 陶土橙 `#D97757`（`450-478`）
     - 侧边栏、菜单 `[role="menu"]`、设置弹窗 `[role="dialog"]` 的 `color: var(--ag-ink*) !important`（`482-580`）
     - `:root` 上的 `--ag-*` 默认值（`1036-1077`）

### 3.2 Antigravity 原生主题引擎机制（`main.js` 实测逆向结论）

通过 CDP 检查运行态 `window.nativeStorage` 与工作台 `out/media/main.js`（函数 `YZ`、`o7b`、`T6b`、常量 `H6b`、`$6b`、`l7b`、`m7b`）：
1. **预设存储键与监听接口**：
   - `await window.nativeStorage.getItems()` **异步返回 Promise**（全量键值表 `Record<string, string>`，如 `{ 'theme-preset-dark': 'Default Dark', 'jetski.contrast': '2' }`）。
   - `window.nativeStorage.onChanged(listener)` 在用户在 Appearance 面板切换配置时即时推送增量事件（无需轮询）。
2. **原生对「默认主题」的官方定义（`main.js` 中 `const H6b` 与 `YZ`）**：
   - 亮色默认预设值集合：`undefined` / `null` / `""` / `"Default"` / `"Default Light"`。
   - 暗色默认预设值集合：`undefined` / `null` / `""` / `"Default"` / `"Default Dark"`。
   - `"Legacy Light"` / `"Legacy Dark"` 特判：`YZ` 会保留 `body[data-agy-theme]` 但**移除 `body[data-agy-home-glow]`**，同时 `nativeStorage` 记录 `theme-preset-{light|dark} = "Legacy Light" | "Legacy Dark"`。
   - 其它非默认内置预设（`Everforest`、`Dracula`、`Catppuccin`、`Gruvbox Material`、`Monokai`、`One Dark Pro`、`One Light`、`Tokyo Night`、`Solarized Light/Dark`、`Vesper` 及扩展主题）：`YZ` 同步调用 `o7b` 将该主题的种子色直接写入 `document.documentElement.style`。
3. **同步 0ms DOM 种子色信号（`YZ` + `T6b` + `$6b`）**：
   - 每当用户在 Appearance 面板修改 Theme（亮/暗/系统）、Contrast（Default/Strong）、Preset 或手动拖动 `Background` / `Foreground` / `Accent` 拾色器时，`YZ(...)` 都会**同步**更新 `document.documentElement.style` 与 `document.body` 属性。
   - 默认外观下的原生行内种子色集合固定为：
     - Default Light（含 Default / Strong 对比度及经典回退）：`--background` ∈ `{#ffffff, #f9f9f9}`，`--foreground` ∈ `{#0a0a0c, #000000, #101010}`，`--primary` ∈ `{#2f75c3, #2560a3, #007acc}`。
     - Default Dark（含 Default / Strong 对比度及经典回退）：`--background` ∈ `{#070708, #050507, #101010}`，`--foreground` ∈ `{#ffffff, #cccccc}`，`--primary` ∈ `{#2f71e3, #007acc}`。
   - 因此，通过 `MutationObserver` 监听 `documentElement` (`class`, `style`) 与 `body` (`class`, `data-agy-theme`, `data-agy-home-glow`)，再辅以 `nativeStorage` 缓存的 `theme-preset-{light|dark}` 校验，可以在 **0ms 微任务级**精准判定当前是否为默认 Appearance，既无异步闪烁，也无需任何 `setInterval` 轮询。
4. **`$6b` / `l7b` / `m7b` 完整 NewUX 表面令牌清单（必须在默认外观下全量对齐）**：
   - 壳层与侧栏：`--shell`、`--shell-canvas`、`--sidebar`、`--sidebar-secondary`、`--sidebar-muted`
   - 通用交互与标签（含 `.agy-aux-tab`）：`--secondary`、`--secondary-foreground`、`--muted`、`--muted-foreground`、`--placeholder`
   - 卡片与浮层毛玻璃（含 `[role="dialog"]` / `[role="menu"]`）：`--card`、`--card-border`、`--border`、`--glass`、`--glass-border`、`--glass-highlight`
   - `onyx` 专属组件：`--onyx-frame`（用户气泡/接管卡）、`--onyx-well`（分段开关槽）、`--onyx-raised`（抬升卡）、`--onyx-selected`（侧栏选中会话行）、`--onyx-key`（分段开关激活键）、`--home-glow`（首页顶光）

### 3.3 零轮询「仅默认 Appearance 生效 + 非配色模块常驻」架构方案（已确认方案 A）

1. **双正交属性解耦（`core/runtime.js`）**：
   - `data-ag-scheme="light" | "dark"`：**始终设置**，反映当前窗口亮/暗极性，供常驻的非配色模块（如 `#ag-live-metrics-pill` 与 `#ag-live-metrics-tooltip`）选择适配阴影与状态色。
   - `data-ag-appearance="default" | "custom"` 与 `data-ag-preset`：
     - 当 `isDefaultAppearance === true`：设置 `data-ag-appearance="default"` 与 `data-ag-preset="<targetPreset>"`，完整应用 `THEME_VARS`。
     - 当 `isDefaultAppearance === false`：设置 `data-ag-appearance="custom"`，**移除 `data-ag-preset`**，并在 `applyThemeVars` 中仅保留非色彩排版变量（如 `--ag-chat-font-size`），撤回所有颜色类行内变量覆盖，100% 退让给原生主题引擎。
   - 常驻模块（`fonts`、`metrics`、`i18n`、`deadlockHealer`、`customCss`、`customJs`）在 `data-ag-appearance="custom"` 下保持完整运行。
2. **样式作用域收口与指标胶囊自适应（`core/theme.css`）**：
   - 字体层（`1-152`, `539-541`, `565-567`, `1090-1094`）保持全局生效。
   - 全部主题色彩、壳层背景、边框、输入框蜡封、发送按钮陶土橙、搜索聚焦环及 `--ag-ink*` 墨色字色（原 `155-580`, `1079-1081`, `1096-1101`）统一收口到 `html[data-ag-preset]` 门控下。
   - 指标胶囊（`582-1033`）布局常驻；在非默认外观 `html:not([data-ag-preset])` 下，将 `--ag-metric-*` 令牌通过 `color-mix(in srgb, var(--foreground) ..., transparent)`、`var(--popover, var(--card))`、`var(--border)`、`var(--primary)` 动态派生，零硬编码融入任意第三方主题。
