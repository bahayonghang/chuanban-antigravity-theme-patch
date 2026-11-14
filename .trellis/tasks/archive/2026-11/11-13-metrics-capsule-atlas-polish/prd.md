# 会话指标胶囊上下文校准与样式重塑

## Goal

消除底部会话指标胶囊将所有模型上下文静态显示为 `256k` 的误导，动态读取 Antigravity 真实会话遥测中的自动压缩阈值与模型原生窗口，并遵循 `$design-atlas`（`DESIGN.md` 暖纸与陶土体系）重塑胶囊与悬浮详情卡的视觉层级、告警对比度及键盘无障碍体验。

## Background

1. **网络与本机 `gen_metadata` 双重实证**（详见 `research/context-window-and-protobuf.md`）：
   - Gemini 4 Carbon / Argon / 3.8 Flash 原生窗口为 **1M（`1,048,576`）**，但 Antigravity 宿主检查点引擎在 `gen_metadata` 的 `chat[9][10][4]` 中对 Gemini 强制施加 **`256,000`（256k）** 自动压缩线（用户截图同源会话 `61721a71-...db` 已在 `246.8k` 与 `248.1k` 两次自动压缩）；Claude Opus/Sonnet 5.5 的 `chat[9][10][4]` 为 **`840,000`（840k）**，Claude Opus 4.6 为 **`160,000`（160k）**。Antigravity 当前未开放设置项调整或关闭该自动压缩阈值。
   - `core/daemon.mjs:240,485,582` 未解析 `chat[9][10][4]`、`chat[9][2]`（压缩次数）与 `chat[19]`/`chat[21]`（模型标识），直接回退静态 `contextLimit: 256000` 并用 `Math.round(limit / 1000) + 'k'` 格式化，导致跨模型上限失真且用户误把自动压缩线当作模型总容量。
2. **`$design-atlas` 实机审计发现**（详见 `research/design-atlas-capsule-audit.md`）：
   - **高优缺陷（特异性碾压）**：`core/theme.css:417`（特异性 `(1, 4, 2)`）将输入框内所有非语音按钮 `span` 强制为 `color: var(--ag-ink-strong) !important; opacity: 1 !important;`，导致 `#ag-live-metrics-pill` 内的 `.ag-sep`、`.ag-ctx-warn`、`.ag-ctx-crit` 颜色与透明度全部失效，整串指标变为刺眼纯亮白/纯黑，与左侧模型主按钮争抢视觉中心。
   - **容器与标点模板味**：`core/theme.css:573-648` 的 `#ag-live-metrics-pill` 背景透明、圆角为 0，仅靠 `·` 中点拼接四段文本（命中 Gate 63），缺少真实胶囊边界与键值主次层级。
   - **交互与动效缺口**：`core/runtime.js:535-549` 仅支持鼠标 `mouseenter`/`mouseleave`，无键盘 `tabindex="0"`、`:focus-visible`、`focus`/`blur`/`Escape` 关闭；`core/theme.css:649-678` 含裸色值（Gate 48）且缺少 `@media (prefers-reduced-motion: reduce)` 回退（Gate 27）。

## Requirements

- **R1（动态上下文与压缩遥测解析）**：`core/daemon.mjs` 从 `gen_metadata` 解析当前有效调用的模型标识（`chat[19]`/`chat[21]`）、宿主实时自动压缩阈值（`chat[9][10][4]`）与会话累计自动压缩次数（`chat[9][1]`/`chat[9][2]`），推导模型原生窗口容量（如 Gemini 4 / 3.8 与 Claude 5.5 为 `1M`，Claude 4.6 为 `200k`），`>= 1,000,000` 统一按 `1M` 紧凑格式化；仅当遥测缺失 `chat[9][10][4]` 或用户在配置中显式覆盖非默认上限时回退配置值。
- **R2（清晰的双重上下文语义展示 — 方案 A）**：内联胶囊以宿主真实**自动压缩水位**为主（`Cmp <当前>/<压缩线> <百分比>%`，会话发生过自动压缩时附 `↻N` 计数徽标，全部指标以 CSS 细竖线分段，零 `·` 中点字符）；悬停或键盘聚焦展开的详情卡同时展示「自动压缩线（含距压缩余量与可视化水位进度条）」与「模型原生窗口（如 `1M` / `200k` 及累计自动压缩次数）」，彻底消除「1M 模型为何显示 256k」的歧义。
- **R3（暖纸/暗炭微凹槽胶囊与特异性隔离）**：在 `core/theme.css` 与 `DESIGN.md` 建立明暗双态 `--ag-metric-*` 语义令牌，将 `#ag-live-metrics-pill` 从 `core/theme.css:417,505` 的输入框全局 `span` 强制规则中显式豁免；以圆角微凹槽胶囊、细竖线分栏及「弱化键名 + 等宽主色数值」替代裸 `A · B · C` 中点串，确保正常 / 琥珀预警（>=75%）/ 陶红临界（>=90%）在亮暗三套预设下对比度均满足 WCAG AA（>= 4.5:1）。
- **R4（无障碍详情卡与响应式防挤压）**：`core/runtime.js` 与 `core/theme.css` 为胶囊补齐 `tabindex="0"`、`aria-describedby`、立即显现的 `:focus-visible` 焦点环、`focus`/`blur`/`Escape` 键盘交互及 `@media (prefers-reduced-motion: reduce)` 零位移动效回退；严格保留 `MIDDLE_MIN_WIDTH_PX` 三栏防挤压与窄宽折入第二行的几何契约。
- **R5（构建校验与实机无损部署）**：保持 Node `< 22.13` 缺省 `node:sqlite` 优雅降级、`enabled: false` 完整卸载及 `selectors.excludeI18n` 不翻译胶囊；运行 `build-manifest`、`doctor`、`slop_check.mjs`、实机 `install` + `verify` 与明暗计算样式验证，不覆盖用户已有 `user/` 配置。

## Acceptance Criteria

- [x] **AC1 / R1, R2**：在 Gemini 4 Carbon（压缩线 `256k` / 原生 `1M`）、Claude 5.5（`840k` / `1M`）、Claude 4.6（`160k` / `200k`）真实会话库下，`parseConversationMetrics` 动态输出对应阈值与原生窗口；发生过自动压缩的会话准确显示已压缩次数。
- [x] **AC2 / R3**：实机 CDP 读取 `high-contrast` 亮/暗模式及另两套预设下 `#ag-live-metrics-pill` 计算样式：胶囊具备独立表面底色、细边框与圆角，键名与数值层级分明，无 `·` 中点拼接；模拟 `ok` / `warn` / `crit` 三态时告警文字不被 `theme.css:417` 覆盖，文本对胶囊背景 sRGB 对比度均 `>= 4.5:1`。
- [x] **AC3 / R4**：键盘 `Tab` 可聚焦胶囊并立即显示 `>= 3:1` 焦点环，聚焦与悬停均可展开 `#ag-live-metrics-tooltip`，按 `Escape` 可关闭；`prefers-reduced-motion: reduce` 下无位移动画；窄宽度（可用中间宽 `< 150px`）自动平滑切为 `data-ag-row-mode="bottom"` 第二行且不挤压左右控件。
- [x] **AC4 / R5**：`node "<design-atlas>/scripts/slop_check.mjs"` 报告 `0 FAIL`、`0 REFLEX`；`node --check`、`node install.mjs build-manifest`、`doctor`、`install`、`verify` 全部通过，已安装目录 `user/*` 文件哈希保持不变。

## Out of Scope

- 不修改或破解 Antigravity 客户端二进制、`.asar` 或后端 sidecar 的 `256k` 自动压缩硬编码逻辑。
- 不探测或注入 Antigravity IDE。
- 不改动输入框蜡封三态、全局字体栈或除指标胶囊外的现有主题色值。
