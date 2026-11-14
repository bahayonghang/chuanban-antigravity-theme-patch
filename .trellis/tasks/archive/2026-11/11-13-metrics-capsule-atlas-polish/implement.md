# 实施计划：会话指标胶囊上下文校准与样式重塑

## 执行清单

1. **更新设计契约 `DESIGN.md`**：
   - 在不改动既有默认亮色表面承诺的前提下，补充底部指标胶囊（`#ag-live-metrics-pill`）与详情卡（`#ag-live-metrics-tooltip`）的令牌、状态、无障碍与等宽数值声明（使 Gate 64 等宽数字仪表盘在机械门禁中合法声明）。
2. **升级 `core/daemon.mjs` 遥测解析与 HTML 渲染**：
   - 升级 `parseProto` 支持 64 位有符号 varint；
   - 从 `gen_metadata` 提取 `chat[19]`、`chat[21]`、`chat[9][1..2]`、`chat[9][10][4]`，实现动态压缩阈值、模型原生窗口推导、已压缩次数统计与 `fmtLimitTok`（支持 `1M`）；
   - 输出无 `·` 中点串的分段胶囊 HTML（`ag-m-seg` / `ag-m-k` / `ag-m-v`）与含压缩水位进度条及双上限说明的详情卡 HTML，附带 `ctxState`（`ok|warn|crit`）。
3. **升级 `core/runtime.js` 挂载与键盘无障碍**：
   - 为 `#ag-live-metrics-pill` 补充 `tabIndex = 0`、`aria-describedby`、`data-ctx-state` 同步；
   - 绑定 `focus` / `blur` / `Escape` 键盘展开与关闭逻辑，抽取共享定位函数 `showMetricsTooltip` / `hideMetricsTooltip`，并在卸载（`enabled: false`）与重注入时确保无残留监听器。
4. **升级 `core/theme.css` 令牌、特异性隔离与减动效**：
   - 在 `theme.css:417` 与 `:505` 排除 `#ag-live-metrics-pill *`；
   - 定义明暗双态 `--ag-metric-*` 令牌，重写 `#ag-live-metrics-pill`（常态 middle 与窄宽 bottom 两态）及 `#ag-live-metrics-tooltip`（含进度条、`:focus-visible` 立即轮廓、`@media (prefers-reduced-motion: reduce)`）。
5. **静态校验、构建与实机闭环验证**：
   - 运行 `node --check install.mjs`、`node --check core/daemon.mjs`、`node --check core/runtime.js`；
   - 对 Gemini 4 Carbon（`61721a71`）、Claude 5.5（`75b7596c`）、Claude 4.6（`1e1e7821`）三类本地真实 `.db` 只读验证动态上限与压缩次数输出；
   - 运行 `node "<design-atlas>/scripts/slop_check.mjs"` 确认 `0 FAIL`、`0 REFLEX`；
   - 运行 `node install.mjs build-manifest`、`node install.mjs doctor`、`node install.mjs install`、`node install.mjs verify`，核对已安装 `user/*` 哈希不变；
   - 通过 CDP 在实机窗口对照亮/暗模式与三态告警色的真实计算样式及 sRGB 对比度（`finally` 恢复原状态，不改动持久化配置）。
6. **质量门禁与规范沉淀**：
   - 执行 `trellis-check` 与 `design-atlas` 清单复核；
   - 更新 `.trellis/spec/` 记录 `gen_metadata` 动态压缩上限契约与输入框 `span` 特异性隔离规则；
   - 检查 `git diff --check` 并提交确认计划。

## 回滚锚点

- 实机异常时立即执行 `node install.mjs rollback` 恢复 `core.prev/`。
- 所有 CDP 亮色/三态临时探测均在 `try ... finally` 中无损还原 DOM 属性与样式。
