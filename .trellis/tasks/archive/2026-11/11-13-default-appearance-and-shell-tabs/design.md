# 技术设计：侧边栏与标签页样式统一及仅默认外观生效改造

## 1. 架构与模块边界

本次改造严格限定在仓库只读内核与诊断契约内，保持**零 npm 依赖、零构建打包、零客户端文件侵入**：

| 文件 | 所属层 | 职责边界 |
| :--- | :--- | :--- |
| `core/runtime.js` | `inject` | 判定当前激活模式是否属于 Antigravity 默认 Appearance；维护 `data-ag-appearance` / `data-ag-preset` / `data-ag-scheme` 属性；通过 `MutationObserver` + `nativeStorage.onChanged` 实现零轮询毫秒级响应；在非默认外观下保留字体、实时指标胶囊、汉化、死锁/缩放修复。 |
| `core/theme.css` | `inject` | （1）将全部主题色彩、壳层表面、输入框蜡封、陶土橙按钮与墨色字重颜色收口至 `html[data-ag-preset]`；（2）补齐暗色及三套亮色预设的 `--shell`、`--shell-canvas`、`--secondary`、`--muted`、`--glass*`、`--onyx-*` 全壳层令牌与内嵌卡片层次；（3）为 `html:not([data-ag-preset])` 提供基于原生主题变量动态混色的 `#ag-live-metrics-pill` / `#ag-live-metrics-tooltip` 自适应令牌。 |
| `install.mjs` | `node` | 在 `inspectLiveWindow()` 返回状态中补充 `appearance`（`data-ag-appearance`）与 `shellBg`（左侧栏/外壳实测计算底色）字段，便于 `doctor` / `verify` 精确观测全壳层染色与外观让位状态。 |
| `core/manifest.json` | `node` | 由 `node install.mjs build-manifest` 自动重算 `core/*` SHA-256 与字节数，严禁手改。 |
| `SKILL.md` / `AGENTS.md` | 文档契约 | 简要同步「仅默认 Appearance 接管配色、非默认主题保留非配色增强模块」的运行契约。 |

**不触碰边界**：`core/daemon.mjs`（无需改动守护轮询与 SQLite 逻辑）、`core/i18n.json`、Antigravity 安装目录与 `.asar`、`~/.antigravity-ide/*`、本机已有的 `user/*` 个性化文件。

---

## 2. 数据流与核心契约

### 2.1 默认 Appearance 判定契约（`core/runtime.js`）

Antigravity 前端工作台（`main.js` 中 `YZ`、`o7b`、`T6b`、`H6b`）在每次外观变更时同步更新 `document.documentElement.style` 与 `document.body` 属性，并将预设名持久化到 `window.nativeStorage`（键 `theme-preset-light` / `theme-preset-dark`）。

1. **宿主亮/暗极性 `hostScheme` 与有效极性 `effectiveScheme`**：
   - `hostScheme`：依次读取 Agent 面板 URL `?hostTheme=dark|light` → `body` / `html` 的 `theme-dark` / `dark` / `theme-light` 类 → `localStorage` `'theme-mode'` → 回退 `'light'`。
   - `effectiveScheme`：若 `user/config.json` 显式配置 `scheme: "light" | "dark"` 则取 `BOOT_SCHEME`，否则等于 `hostScheme`。`html[data-ag-scheme]` **始终**写入 `effectiveScheme`。
2. **默认 Appearance 布尔判定 `isDefaultAppearance(hostScheme)`**：
   - 若为独立 Agent 面板子窗口（`isAgentPanelWindow() === true` 且无 `body[data-agy-theme]`）：默认视为 `true`（保持与宿主面板同步）。
   - 在主窗口中同时满足以下三项才判定为 `true`（默认外观）：
     1. **存储预设名校验**：从内存缓存 `window.__ag_ns_presets[hostScheme]`（由 `window.nativeStorage.getItems()` 初始化并由 `onChanged` 实时更新，回退读取 `localStorage`）读取当前极性预设名 `presetName`。允许集合：
        - `light`：`undefined`、`null`、`""`、`"Default"`、`"Default Light"`（以及历史兼容清洗前的自定义预设名）
        - `dark`：`undefined`、`null`、`""`、`"Default"`、`"Default Dark"`
     2. **Legacy 主题排除**：当 `document.body?.hasAttribute('data-agy-theme')` 为 `true` 时，`document.body.hasAttribute('data-agy-home-glow')` 必须为 `true`（原生 `YZ` 在 `Legacy Light` / `Legacy Dark` 下会移除 `data-agy-home-glow`）。
     3. **原生行内种子色校验（捕获「默认预设下拉 + 手动拾色器改色」与首屏未完成异步读取时的非默认预设）**：
        读取 `document.documentElement.style` 上的 `--background`、`--foreground`、`--primary`（仅检查未被用户 `THEME_VARS` 显式接管的键；值为空字符串或 `var(...)` 时放行以避免早启动闪烁）：
        - `hostScheme === 'light'` 允许种子集合（大小写不敏感）：
          - `--background` ∈ `{#ffffff, #f9f9f9}`
          - `--foreground` ∈ `{#0a0a0c, #000000, #101010}`
          - `--primary` ∈ `{#2f75c3, #2560a3, #007acc}`
        - `hostScheme === 'dark'` 允许种子集合（大小写不敏感）：
          - `--background` ∈ `{#070708, #050507, #101010}`
          - `--foreground` ∈ `{#ffffff, #cccccc}`
          - `--primary` ∈ `{#2f71e3, #007acc}`
3. **根节点状态输出契约**：
   - **`isDefaultAppearance === true`**：
     - `html[data-ag-appearance="default"]`
     - `html[data-ag-preset="<targetPreset>"]`（`high-contrast` | `claude-desktop-purewhite` | `vintage-deep`）
     - `applyThemeVars(THEME_VARS, /* allowColorVars */ true)`
   - **`isDefaultAppearance === false`**：
     - `html[data-ag-appearance="custom"]`
     - `document.documentElement.removeAttribute('data-ag-preset')`
     - `applyThemeVars(THEME_VARS, /* allowColorVars */ false)`：仅保留非色彩排版变量（白名单 `--ag-chat-font-size`），移除补丁此前写入的任何色彩变量，确保绝不覆盖原生 `document.documentElement.style`。
4. **事件订阅与防死循环守卫**：
   - `MutationObserver`：监听 `document.documentElement` (`attributeFilter: ['class', 'style']`) 与 `document.body` (`attributeFilter: ['class', 'data-agy-theme', 'data-agy-home-glow']`)。
   - **自写隔离守卫**：`applyThemeVars` 与根属性写入前设置 `window.__ag_internal_dom_mutating = true`，并在微任务 `queueMicrotask` 中复位；且所有 `setProperty` / `removeProperty` / `setAttribute` 先做等值比较，无变化不写 DOM，彻底杜绝 `style` 监听自触发死循环。
   - **`nativeStorage` 订阅生命周期**：在 `disconnectSchemeObservers()` 中统一调用并清理 `window.__ag_ns_unsubscribe`（若 `nativeStorage.onChanged` 返回解绑函数则直接调用；否则通过单实例代理回调 `window.__ag_ns_change_handler` 保证多次热重载绝不叠加监听器）。`!ENABLED` 卸载分支同步移除 `data-ag-appearance`。

---

### 2.2 全壳层统一与作用域门控契约（`core/theme.css`）

#### A. 默认外观下全壳层（顶栏 + 左栏 + 顶部 Tab 条 + 辅助 Tab + 浮层）令牌矩阵

所有预设与暗色规则均以 `html[data-ag-preset]` 为前置门控：

| 令牌 / 选择器 | 亮色 `high-contrast` | 亮色 `claude-desktop-purewhite` | 亮色 `vintage-deep` | 暗色 `html[data-ag-preset][data-ag-scheme="dark"]` | 解决的问题 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `--background` | `#FAF9F5` | `#FCFCFB` | `#FBF9F5` | `#1C1917` | 右侧主对话与侧面板圆角卡片纸面底色 |
| `--sidebar` / `--shell` / `--shell-canvas` | `#F0EEE6` | `#FBFBF9` | `#F1E8DC` | `#24201C` | 打通顶栏 35px、左栏 `.contents` 行内 `--sidebar: var(--shell-canvas)`、顶部 40px 分栏 Header/Tab 条 |
| `--sidebar-secondary` / `--onyx-selected` / `--secondary` | `#E3E0D5` | `#EDECE9` | `#E6DCCE` | `#2E2924` | 左栏选中会话行、`.agy-aux-tab` 激活胶囊、代码块浅底 |
| `--sidebar-muted` / `--muted` | `#E8E6DC` | `#F3F2EF` | `#E8DFD1` | `#352F29` | 左栏悬停、`.agy-aux-tab` 悬停/拖拽胶囊 |
| `--onyx-frame` | `#F4F2EB` | `#F6F5F2` | `#F4EDE2` | `#211D1A` | 用户消息气泡、接管卡片底框 |
| `--onyx-well` / `--onyx-key` | `rgba(31,30,29,0.06)` / `#FFFFFF` | `rgba(31,30,29,0.05)` / `#FFFFFF` | `rgba(31,30,29,0.06)` / `#FBF9F5` | `#1A1714` / `#352F29` | Settings 等界面的分段切换槽与激活键 |
| `--onyx-raised` / `--card` / `--glass` | `#FFFFFF` | `color-mix(in srgb, #FBF9F5 70%, #fff)` | `#FFFDF9` | `#2A2520` | 卡片、Settings 弹窗 `[role="dialog"]`、下拉菜单 `.agy-overlay` 毛玻璃底色 |
| `--card-border` / `--glass-border` / `--border` | `rgba(31,30,29,0.15)` | `rgba(44,43,41,0.12)` | `#E0D4C3` | `rgba(244,239,230,0.16)` | 卡片、弹窗、Tab 分割线边框 |
| `--home-glow` | `transparent` | `transparent` | `transparent` | `rgba(196, 106, 88, 0.12)` | 替换原生冷蓝 `#2F71E3` 首页辉光 |

#### B. 内嵌卡片与顶栏/分栏 Tab 壳层结构规则

- **外壳铺底**：
  `html[data-ag-preset] :is(.agy-shell, .agy-inset-shell, .bg-sidebar)` 统一设置 `--shell: var(--sidebar) !important; --shell-canvas: var(--sidebar) !important; background-color: var(--sidebar) !important;`。
- **内嵌卡片与非内嵌页面区分**：
  - 原生内嵌模式下 `.agy-sheet[data-sheet-inset]` 必须保持 `background-color: transparent !important; background-image: none !important;`，使 `y=35..75px` 的 `[data-main-content-header]`、分栏 Tab 工具栏 `[data-testid="pane-titlebar-toolbar"]`、分栏圆角遮罩 `[data-tiling-pane]::after` 与右侧 `[data-side-panel-strip]` 全部自然呈现暖色 `--shell-canvas`，与左栏及 35px 顶栏无缝融为一体。
  - 真正的内嵌内容卡片 `[data-main-content-body]`、`[data-side-panel-body]` 以及非内嵌经典 `.agy-sheet:not([data-sheet-inset])`、`.bg-background:not(.agy-inset-shell)` 铺设 `background-color: var(--background) !important;`；暗色微暖顶光 `radial-gradient(62% 38% at 50% 0%, rgba(196, 106, 88, 0.14), transparent 72%)` 仅施加在 `[data-main-content-body]` 与 `.agy-sheet:not([data-sheet-inset])` 上，绝不污染顶部 40px Tab 栏。

#### C. 全局颜色规则收口与非默认主题模块常驻

1. **常驻全局规则（不加 `data-ag-preset` 限制）**：
   - `@font-face` 与 `html[data-ag-font-ui]` / `html[data-ag-font-code]` 字体栈映射（`core/theme.css:1-152`）；
   - `[role="menu"]` / `.agy-overlay` / `[role="dialog"]` 的 `font-family: var(--font-sans) !important` 与字号规则 `html[data-ag-custom-font-size="true"]`；
   - `#ag-live-metrics-pill` 与 `#ag-live-metrics-tooltip` 的布局与排版结构（`core/theme.css:582-1033`）。
2. **收口至 `html[data-ag-preset]` 的颜色/质感规则**：
   - `.agy-inset-shell` / `[data-main-content-body]::after` 分割线与内描边（原 `346-358`）；
   - 输入框 `#antigravity.agentSidePanelInputBox` / `.surface-composer` / `.surface-composer-card` 蜡封三态背景、边框与聚焦浮雕阴影（原 `361-419` 及 `1096-1101`）；
   - 搜索框 `#D97757` 聚焦环（原 `422-431`）；
   - 发送按钮与语音胶囊 `#D97757` 陶土橙配色（原 `450-465`；注：`468-478` 针对 `voice-live-pill` 内部 `.opacity-0/.opacity-100` 图标重叠的布局修复可限定在 `html[data-ag-preset]` 下，避免干扰原生主题样式）；
   - 侧边栏、输入框底栏、下拉菜单 `[role="menu"]`、设置弹窗 `[role="dialog"]` 的 `--ag-ink*` 字色与 `--ag-ink-shadow-*` 墨晕规则（原 `482-580`）。
3. **非默认主题下实时指标胶囊自适应配色（`html:not([data-ag-preset])`）**：
   - 利用原生主题在 `<html>` 上实时维护的 `--foreground`、`--muted-foreground`、`--primary`、`--popover`、`--card`、`--border`，通过 `color-mix(in srgb, ...)` 动态派生 `--ag-metric-*` 全套变量，并根据 `html:not([data-ag-preset])[data-ag-scheme="dark"]` 与亮色分别提供高可读性的语义状态色（`ok` / `mid` / `warn` / `crit`）及浮层阴影。

---

## 3. 兼容性与迁移说明

- **旧配置 100% 兼容**：`user/config.json` 无需新增必填字段；已有 `preset`、`scheme`、`fonts`、`modules`、`themeVars`、`custom.css`、`custom.js` 原样生效。
- **用户主动在 `user/custom.css` 写的规则**：按照用户改装层契约，`#antigravity-user-custom-style` 受 `modules.customCss` 控制，不做擅自删改。
- **用户主动在 `user/config.json` 配置 `themeVars`**：
  - 默认外观下全量挂载；
  - 非默认外观下仅保留 `--ag-chat-font-size` 等非颜色排版变量，自动暂存/撤回 `--ag-wax-seal-hover` 或自定义颜色变量，切回默认外观时无损恢复。
- **Node 版本分级不变**：不涉及 `core/daemon.mjs` 与 `node:sqlite`，Node `22.0.0 ~ 22.12.x` 与 `>= 22.13.0` 行为完全保持一致。

---

## 4. 关键权衡（Trade-offs）

1. **双信号判定（DOM 种子色 + `nativeStorage`）vs 单一 `nativeStorage` 判定**：
   - `window.nativeStorage.getItems()` 为异步 Promise，若仅靠它，首帧注入或快速切换拾色器时可能产生 1 帧闪烁，且无法感知「保留 Default Dark 下拉但手动改了 Background 拾色器」。
   - 结合同步 DOM 行内种子色与 `data-agy-home-glow` 属性校验后，首屏与交互切换均为 **0ms 同步微任务响应**，且 `nativeStorage` 缓存作为预设名双保险。
2. **`.agy-sheet[data-sheet-inset]` 透明化 vs 整块涂 `--background`**：
   - 保持 `.agy-sheet[data-sheet-inset]` 透明并将底色收敛至 `[data-main-content-body]` / `[data-side-panel-body]`，完全顺应了 Antigravity 2.0 NewUX 原生的圆角内嵌卡片设计，使顶栏 35px、左栏与顶部 40px 分栏/Tab 栏自然连成同一块暖色外壳画布，同时兼容非内嵌经典视图（`.agy-sheet:not([data-sheet-inset])`）。

---

## 5. 运维与回滚策略

- 部署更新：`node install.mjs build-manifest` → `node install.mjs install` → `node install.mjs verify`。
- `install.mjs install` 在检测到 `core/` 哈希变化时会自动将当前已安装版本快照备份至 `~/.gemini/antigravity/theme-patch/core.prev/` 与 `backups/<timestamp>/`。
- 一旦出现任何预期外渲染异常，执行 `node install.mjs rollback` 即可在 3 秒内原子回退到上一版黄金内核并重注入生效。
