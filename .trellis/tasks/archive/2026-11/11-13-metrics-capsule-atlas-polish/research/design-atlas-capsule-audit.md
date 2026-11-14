# Design-Atlas 指标胶囊审计与八维诊断（Restyle Step 3）

## 1. 设计源与既有契约

项目根目录已存在 `DESIGN.md`（`entry=brand:claude`，暖纸与陶土色语言）。按 `design-atlas` Restyle 分支第 4 节规则：保持现有暖纸/暗色陶土设计语言，在 `DESIGN.md` 中补充底部指标胶囊（`#ag-live-metrics-pill`）与悬浮详情卡（`#ag-live-metrics-tooltip`）的语义令牌、状态与无障碍契约，不运行 `apply` 覆盖既有亮色契约。

## 2. 实机 CDP 计算样式取证与机械门禁检查

- **机械门禁基线**：`node "<design-atlas>/scripts/slop_check.mjs" core/theme.css --design DESIGN.md --scope component` 退出码 `0`（0 open FAIL / REFLEX）。
- **实机目标**：Stable 通道端口 `3320`（会话 `61721a71-d6f8-48c8-b63b-6ff38f91ebe5`，`data-ag-scheme="dark"`，`data-ag-preset="high-contrast"`）。

### 关键实机缺陷证据

1. **选择器特异性碾压导致分隔符与告警色全部失效（Floor / Correctness）**：
   - `core/theme.css:417`：
     `html[data-ag-preset="high-contrast"] #antigravity\.agentSidePanelInputBox span:not([data-testid="voice-live-pill"]):not([data-testid="voice-live-pill"] *)`（特异性 `(1, 4, 2)`，含 `!important`）将输入框内所有普通 `span` 强制设为 `color: var(--ag-ink-strong) !important; opacity: 1 !important;`。
   - 实机读取 `.ag-sep` 计算样式：`color: rgb(247, 241, 232)`、`opacity: "1"`（原意 `0.45` 被覆盖）；读取状态标签 `.ag-ctx-ok` / `.ag-ctx-warn` / `.ag-ctx-crit`：同样被 `(1, 4, 2)` 强制覆盖为纯亮白 `rgb(247, 241, 232)`，导致 75% 琥珀预警与 90% 红色告警在 `high-contrast` 预设下完全失效。
   - `core/theme.css:505` 还对 `#antigravity\.agentSidePanelInputBox span` 统一注入 `font-weight: 500 !important; letter-spacing: -0.012em !important;`。
2. **名为「胶囊」实为裸文本串，触发中点模板标点问题（House Gate 63 & Visual Hierarchy）**：
   - 实机读取 `#ag-live-metrics-pill`：`backgroundColor: rgba(0, 0, 0, 0)`、`borderRadius: 0px`、`borderLeft: 0.666667px solid rgba(244, 239, 230, 0.18)`，视觉上只是一串用 `·` 拼接的亮白等宽字（`135 tok/s · TTFT 10.6s · Ctx 190k/256k (74%) · Out 2.7k`），既命中 Gate 63（`A · B · C` 模板中点串），又因全亮白字重与左侧主控件 `Gemini 4 Carbon High`（`height: 28px`, `rgb(247, 241, 232)`）抢夺视觉焦点。
3. **详情卡仅支持鼠标悬停，缺少键盘聚焦、Escape 关闭与减少动态效果回退（Floor Gates 26a, 27 & `craft-polish.md` Overlay 契约）**：
   - `core/runtime.js:535-549` 仅绑定 `mouseenter` / `mouseleave`，`#ag-live-metrics-pill` 无 `tabIndex = 0`、无 `:focus-visible` 焦点环、无 `focus` / `blur` / `keydown(Escape)` 处理。
   - `core/theme.css:670` 在 `#ag-live-metrics-tooltip` 上对 `transform` 做过渡，但未配置 `@media (prefers-reduced-motion: reduce)` 立即到位规则，且多处直接写裸色值（`#B45309`、`#DC2626`、`#F9F7F2`、`rgba(0,0,0,0.35)`）而非令牌（Gate 48）。

## 3. 八维诊断表（`restyle.md` Section 3）

| 维度 | 实机证据（选择器 / 区域） | 处置（保留 / 修改） |
| :--- | :--- | :--- |
| Typography | `#ag-live-metrics-pill` 使用 `var(--font-mono)` `11px` + `tabular-nums`，但键值（`TTFT`/`Ctx`/`Out`）与数值同字重同亮白，阅读节奏扁平 | **保留** `11px` 等宽数字对齐；**修改** 键名降为次级弱化墨色、数值保持清晰主墨色，消除无层级长串 |
| Whitespace | 仅靠 `border-left` 与 `margin: 0 3.5px` 的 `·` 分隔，用户红框处 `TTFT 10.6s` 与 `Ctx` 视觉粘连 | **修改** 为带内边距与圆角的温和胶囊容器，内部指标组用细竖线/间距分栏替代 `·` 中点串 |
| Visual hierarchy | 左侧模型选择器与右侧发送钮为主操作，中间指标串因全亮 `--ag-ink-strong` 喧宾夺主 | **修改** 胶囊退居精致次级仪表角色，仅在水位告警（warn/crit）或悬停/聚焦时局部提亮 |
| Colour | `.ag-ctx-warn` / `.ag-ctx-crit` 被 line 417 覆盖失效；硬编码 `#B45309` / `#DC2626` 未走明暗双态令牌且暗底对比度未验算 | **修改** 建立 `--ag-metric-*` 明暗双态令牌（正常 / 琥珀预警 / 陶红临界，均满足 WCAG AA >= 4.5:1），隔离输入框全局 `span` 规则 |
| Motion | `#ag-live-metrics-tooltip` 使用 `opacity` + `transform` `120ms ease`，无 `prefers-reduced-motion` | **修改** 仅保留 `opacity` + `transform` 指数缓出，补齐 `@media (prefers-reduced-motion: reduce)` 零动画到位 |
| Micro-interaction | 仅 `mouseenter` 触发详情卡，无 `:focus-visible`、无键盘聚焦展开与 `Escape` 收起 | **修改** 增加 `tabindex="0"`、立即显示的 `:focus-visible` 轮廓、`focus`/`blur`/`Escape` 交互与视口防溢出定位 |
| Responsive | `MIDDLE_MIN_WIDTH_PX = 150`：中间宽度不足时移至 `bottomRow` 下方作第二行 | **保留** 三栏防挤压与 `<150px` 折行机制；**修改** 窄行模式样式与胶囊视觉语言统一 |
| Originality | 裸 `A · B · C` 文本串与普通白底黑框浮层缺乏船板暖纸/陶土蜡封气质 | **修改** 采用与输入框暖纸/暗炭表面同源的微凹槽胶囊（Inset Telemetry Pill）+ 带压缩水位进度条的双层详情卡 |
