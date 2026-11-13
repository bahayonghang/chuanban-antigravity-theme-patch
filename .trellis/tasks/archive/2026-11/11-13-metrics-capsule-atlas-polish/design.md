# 技术设计：会话指标胶囊上下文校准与 Design-Atlas 重塑

## 1. 架构与边界

跨层链路：`core/daemon.mjs`（SQLite 只读解析与 HTML 载荷生成）→ CDP `window.__ag_render_metrics` → `core/runtime.js`（DOM 挂载、响应式测量、悬停/聚焦/键盘控制）→ `core/theme.css` + `DESIGN.md`（语义令牌、特异性隔离、胶囊与详情卡样式）。

- 修改文件：`core/daemon.mjs`、`core/runtime.js`、`core/theme.css`、`core/manifest.json`（由 `build-manifest` 生成）、`DESIGN.md`。
- 不改 `install.mjs`、不改仓库 `user/` 默认模板（兼容既有 `"contextLimit": 256000` 字段）、不改已安装目录 `~/.gemini/antigravity/theme-patch/user/*`。

## 2. Protobuf 遥测解析与双上限推导（`core/daemon.mjs`）

### 2.1 有符号 Varint 与字段提取

1. `parseProto(buf)` 将 wire type `0`（varint）改为 `BigInt` 精确解码并处理 64 位二补数负数（如 `c9.get(2) = -1`），避免超过 53 位精度时变成 `18446744073709552000`。
2. 从最后一条有效 `gen_metadata` 记录（或回溯最近一条含模型/检查点信息的记录）提取：
   - `modelSlug`: `chat.get(19)` UTF-8 字符串（如 `gemini-4-carbon`、`claude-opus-5-5-high`）。
   - `modelLabel`: `chat.get(21)` UTF-8 字符串（如 `Gemini 4 Carbon (High)`）。
   - `compactionLimit`: `chat.get(9) -> c9.get(10) -> c10.get(4)`（正整数，实测 Gemini `256000`、Claude 5.5 `840000`、Claude 4.6 `160000`）。
   - `compactionCount`: 若 `c9.has(1)` 为真，则 `(c9.has(2) && c9.get(2) >= 0 ? c9.get(2) : 0) + 1`，否则 `0`。

### 2.2 模型原生窗口与上限优先级

- `inferModelWindowTokens(modelSlug, modelLabel, compactionLimit)`：
  - `gemini-4-*`、`gemini-3.8-*`、`gemini-3-*`、`gemini-2.5-*` → `1048576`（展示为 `1M`）。
  - `claude-opus-5-*`、`claude-sonnet-5-*`（或 `compactionLimit >= 500000`）→ `1000000`（展示为 `1M`）。
  - `claude-*-4-*`（或 `compactionLimit > 0 && compactionLimit <= 200000`）→ `200000`（展示为 `200k`）。
  - 未知新型号且 `compactionLimit > 0`：不虚构原生窗口（遵循 `design-atlas` Gate 46a 不编造事实原则），仅展示实测 `compactionLimit`。
- **配置兼容策略**：既有 `user/config.json` 出厂默认含 `"contextLimit": 256000`。为避免旧默认值覆盖 Claude 5.5 的 `840k` 或 Claude 4.6 的 `160k`：
  - 优先支持显式 `userCfg.contextLimitOverride`（`> 0` 时强制覆盖）；
  - 否则优先采用 SQLite 实测 `c10.get(4)`；
  - 若旧会话无 `c10.get(4)`，再回退 `activeConfig.contextLimit || 256000`。
- **紧凑单位格式化 `fmtLimitTok(n)`**：`1048576` 或 `1000000` → `'1M'`；`>= 1000000` 整百万 → `X + 'M'`，非整百万 → `(n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'`；`>= 1000` → `Math.round(n / 1000) + 'k'`。

## 3. Design-Atlas 视觉与无障碍设计（`DESIGN.md` + `core/theme.css` + `core/runtime.js`）

### 3.1 语义令牌层：三级墨色与四阶矿物水位色（亮色暖纸 / 暗色暖炭双态）

在 `:root` 与 `html[data-ag-scheme="dark"]` 定义统一的 `--ag-metric-*` 角色令牌（组件样式严禁裸写 hex/rgba，含悬停与底色徽标叠加实测对比度全部 `>= 4.86:1`，实机 DOM 最低 `5.61:1`）：

| 令牌 | 亮色（暖纸） | 暗色（暖炭） | 用途与层级角色 |
| :--- | :--- | :--- | :--- |
| `--ag-metric-value` | `#181715` | `#F5EFE6` | 一级强墨色：主数值（`tok/s`、已用上下文 `77k`、主汇总值） |
| `--ag-metric-value-sec` | `#45433E` | `#D1C6B8` | 二级中阶墨色：次级数值（`TTFT`、`Out`、压缩分母 `/256k`、子项拆分值） |
| `--ag-metric-label` | `#595650` | `#B8AA9A` | 三级弱化墨色：键名、单位与括号说明文字（常规 `var(--font-sans)`） |
| `--ag-metric-accent` | `#82371D` | `#EEB998` | 暖陶土强调色：缓存命中率（`96.4%`）、原生窗口（`1M`）与已压缩次数（`↻N`） |
| `--ag-metric-ok` / `-bg` | `#195935` / `rgba(25,89,53,.10)` | `#8AD8A3` / `rgba(138,216,163,.13)` | `< 55%`（`充裕`）：矿物青瓷绿徽标与进度条填充 |
| `--ag-metric-mid` / `-bg` | `#6E4904` / `rgba(110,73,4,.10)` | `#F0C970` / `rgba(240,201,112,.13)` | `55%–74%`（`适中`）：暖赭金渐进提示色 |
| `--ag-metric-warn` / `-bg` | `#873704` / `rgba(135,55,4,.10)` | `#F9B25C` / `rgba(249,178,92,.13)` | `75%–89%`（`接近压缩`）：柿琥珀预警色 |
| `--ag-metric-crit` / `-bg` | `#961910` / `rgba(150,25,16,.10)` | `#FFA199` / `rgba(255,161,153,.14)` | `>= 90%`（`即将压缩`）：朱砂珊瑚临界色 |
| `--ag-metric-hero-bg` | `rgba(31, 30, 29, 0.038)` | `rgba(244, 239, 230, 0.042)` | 详情卡顶部独立上下文焦点卡底面 |
| `--ag-metric-focus-ring` | `var(--ag-wax)` | `var(--ag-wax)` | 3:1 以上立即显现的 `:focus-visible` 焦点环 |

### 3.2 特异性隔离与内联胶囊层级

1. 在 `core/theme.css:434` 与 `:522` 的输入框 `span` 选择器上显式排除 `:not(#ag-live-metrics-pill):not(#ag-live-metrics-pill *)`，彻底阻断全局强墨色对胶囊内部键名、分隔线和四阶语义色的覆盖。
2. `#ag-live-metrics-pill` 采用 `height: 24px; border-radius: 999px; padding: 0 9px; background: var(--ag-metric-pill-bg); border: 1px solid var(--ag-metric-pill-border)`。
3. 内联 `Cmp` 段将分子 `.ag-m-v-hero`（`11.5px` 加粗主墨色）与分母 `.ag-m-dim-num`（`10.5px` 次级墨色）紧贴对比，右侧配四阶矿物底色微胶囊 `.ag-m-pct-stat`（`ok|mid|warn|crit`）及可选 `↻N` 暖陶土徽标 `.ag-m-cmp-stat`；`TTFT` 与 `Out` 退居二级墨色 `.ag-m-v-sec` 以让出视觉焦点。相邻 `.ag-m-seg + .ag-m-seg` 通过 `1px` 细竖线分隔，零 `·` 字符。
4. 外框在 `warn` / `crit` 时升级为琥珀/朱砂半透明描边（边框宽度恒为 `1px`，符合 Gate 39a 零位移）。

### 3.3 悬浮详情卡焦点区与三级数值排版（`craft-polish.md`）

1. **顶部上下文焦点卡（`.ag-tt-ctx-box`）**：
   - 首行左侧展示 `上下文压缩水位` + 四阶语义词（`充裕` / `适中` / `接近压缩` / `即将压缩`），右侧以 `13.5px` 粗体主数值突出已用上下文（如 **`77k`**），搭配弱化 `/ 256k` 与四阶底色胶囊徽标 **`30%`**；
   - 中部 `5px` 圆角进度条随四阶状态同步换色（仅对 `background-color` 过渡，不声明 `width` 布局过渡，符合 Gate 10a）；
   - 底行双栏对照展示 `距压缩余 Xk` 与 `原生窗口 1M，未触发压缩 / 已压缩 N 次`。
2. **明细行三级墨色拆分**：`.ag-tt-val` 基础文字退为弱化外观字体，仅对核心结果赋 `.ag-v-num`（一级等宽强墨色）、辅助拆分值赋 `.ag-v-sec-num`（二级等宽墨色）、缓存命中率赋 `.ag-v-accent-num`（暖陶土强调色），消除整列同色等宽字墙。
3. **键盘与焦点契约**：
   - `#ag-live-metrics-pill` 设置 `tabIndex = 0`、`role="status"`、`aria-describedby="ag-live-metrics-tooltip"`；
   - 支持 `mouseenter`/`mouseleave` 与 `focus`/`blur` 同步展示/收起详情卡，聚焦状态下按 `Escape` 立即收起详情卡且不丢失焦点；
   - `:focus-visible` 使用 `outline: 1.5px solid var(--ag-metric-focus-ring); outline-offset: 2px;`，**不参与 transition**（符合 Gate 15 焦点环立即出现）；
   - 增加 `@media (prefers-reduced-motion: reduce)` 关闭胶囊与详情卡过渡（符合 Gate 27）。

## 4. 兼容与回滚

- 旧版 `custom.js` 访问的 `window.__ag_last_metrics`、`ctx.metrics`、`ctx.ensureMetricsPill` 签名全部保持兼容，并在 `payload` 中补充结构化 `meta` 字段（`modelSlug`、`compactionLimit`、`modelWindow`、`compactionCount`、`ctxPct`）与双语载荷 `payload.i18n.{en,zh}`；前端按 `metricsLang`（`auto|en|zh`）→ `modules.i18n` → `document.documentElement.lang` 自动跟随中英文界面并在配置热重载时原地切换。
- 若出现任何异常，可通过 `node install.mjs rollback` 秒级退回上一份 `core.prev/` 快照，或 `node install.mjs verify --safe-mode` 定界。
