# 实机与静态验收证据（2026-11-13）

## 1. 真实会话库双上限与压缩次数验证（`AC1`）

以生产版 `core/daemon.mjs` 的 `parseConversationMetrics` 只读解析本机 `~/.gemini/antigravity/conversations/*.db`：

| 会话前缀 | 模型（`chat[19]` / `chat[21]`） | 自动压缩线（`chat[9][10][4]`） | 原生窗口推导 | 压缩次数（`chat[9]`） | 内联输出（`pillText`） |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `61721a71` | `gemini-4-carbon` / `Gemini 4 Carbon (High)` | `256000` (`256k`) | `1048576` (`1M`) | `2` (`↻2`) | `182 tok/s TTFT 45.9s Cmp 158k/256k 62% ↻2 Out 772` |
| `76a98efb` | `claude-opus-5-5-high` / `Claude Opus 5.5 (High)` | `840000` (`840k`) | `1000000` (`1M`) | `0` | `84 tok/s TTFT 1.9s Cmp 46k/840k 5% Out 698` |
| `1e1e7821` | `claude-opus-4-6-thinking` / `Claude Opus 4.6 (Thinking)` | `160000` (`160k`) | `200000` (`200k`) | `0` | `32 tok/s TTFT 3.2s Cmp 133k/160k 83% Out 52`（`warn`，已过滤尾部 `idx 19/20` 的 `ctx=0` 切换快照串扰） |
| 实机窗口 | `gemini-4-hydrogen` / `Gemini 4 Hydrogen (High)` | `256000` (`256k`) | `1048576` (`1M`) | `0` | `417 tok/s TTFT 3.0s Cmp 174k/256k 68% Out 175`（`mid` 暖赭金档） |

## 2. 静态检查、构建与无损部署（`AC4`）

- 语法校验：`node --check install.mjs`、`node --check core/daemon.mjs`、`node --check core/runtime.js` 全部退出码 `0`。
- Anti-slop 静态门禁：`node "<design-atlas>/scripts/slop_check.mjs" --design DESIGN.md --scope component <capsule-metrics.css> <capsule-fixture.html>` → 退出码 `0`（`Floor 0 FAIL · House 0 FAIL · Reflex 0 REFLEX`，含 Gate 10a/15/27/39a/63/64 全通过）。
- 清单重建与安装验收：
  - `node install.mjs build-manifest` → `Built core/manifest.json: 5.0.0 files: 4`
  - `node install.mjs doctor` → `"ok": true`，`coreIntegrity.clean: true`
  - `node install.mjs install` + 后台无窗口常驻守护进程重启 + `node install.mjs verify` → `"ok": true`，`"themeStyle": true`，注入版本 `20261104-v5.0.0-stable-40eef97c`（支持中英文自动跟随）
- 已安装目录 `C:\Users\lyh\.gemini\antigravity\theme-patch\user\*` 部署前后 SHA-256 完全一致（零改动）：
  - `config.json`: `77B2431A780B6F7ECE63C37EBE48E87A0435537F04944A0BDAE91D62A14A61E4`
  - `custom.css`: `48A6C2088E15C425F7C9DF4E3BC3E573DE0E69BC26BD279E608B3EBFEF06EB2B`
  - `custom.js`: `924C9C8996C218E985BC63BBBDBD66D7DAE597C99862F48C96A956220D094C08`
  - `i18n.override.json`: `50528407C4216CF08633C5B372EC65C7E247B96E3020B8ACD432CB32199552D3`

## 3. 实机 CDP 计算样式、对比度与无障碍验证（`AC2`、`AC3`）

在正在运行的经典版 Antigravity 窗口（`port: 3320`，`targetId: 0B4F9D4A18E352EF9EA2A854EFA23C0C`）实测并还原：

- **胶囊结构、详情焦点卡与字体分工**：`data-v="4"`，`.ag-m-seg` 共 `4` 段，无 `·` 中点（`hasMiddleDot: false`）；`pillRadius: 999px`，`pillRect: 323x24px`；详情卡顶部渲染 `.ag-tt-ctx-box` 焦点卡（`上下文压缩水位 适中` / `174k / 256k 68%` / `距压缩余 82k` / `原生窗口 1M，未触发压缩`）；键名与说明计算字体为 `WenYuan Serif SC`（`var(--font-sans)`），遥测数值与微胶囊徽标为 `MapleBright`（`var(--font-mono)` + `tabular-nums`）；四态边框宽度恒为 `0.666667px`（150% DPI 下的 `1px` 物理对齐，零位移）。
- **明暗 × 三套预设 × 四阶水位（`ok`/`mid`/`warn`/`crit`）× 十类字色角色实机对比度矩阵**：
  - 遍历 `high-contrast`、`claude-desktop-purewhite`、`vintage-deep` × `dark`/`light` × `ok`/`mid`/`warn`/`crit`（含底色徽标叠加 `.ag-m-pct-stat` / `.ag-tt-pct-stat`、焦点卡 `.ag-tt-ctx-box`、三级墨色与暖陶土强调色 `.ag-v-accent-num`），`failures: []`，**实机全局最低对比度 `5.61:1`**（`high-contrast/dark/tt-pct-crit`），离线含 `:hover` 叠加最苛刻组合亦 `>= 4.86:1`，全面满足 WCAG AA（`>= 4.5:1`）。
- **键盘、动效与响应式回退**：
  - `tabIndex: 0`，`role: "status"`，`aria-describedby: "ag-live-metrics-tooltip"`，详情卡 `role: "tooltip"`。
  - 派发 `FocusEvent('focus')` 立即展开详情卡（`afterFocusEvent: true`），派发 `Escape` 立即收起且保持焦点（`afterEscape: true`）。
  - 本机开启系统减弱动态效果（`prefers-reduced-motion: reduce`）下，实测 `transitionProperty: "none"` 生效。
  - 临时收缩底栏至 `260px`（可用中间宽 `< 150px`）自动切至 `data-ag-row-mode="bottom"` 并挂载于 `bottomRow` 正下方（`placedAfterFooter: true`），恢复宽度后立即回到 `middle`。
- **非指标受保护表面零回归**：
  - `high-contrast` 暗色：`body` `rgb(28, 25, 23)`，输入框外层 `rgb(42, 35, 30)`；
  - `high-contrast` 亮色：`body` `rgb(250, 249, 245)`，输入框外层 `rgb(240, 238, 230)`。
