# 独立复核

2026-11-10。trellis-check 复核；未改安装器、运行时、用户配置或暗色规则。

## 已修复

`core/theme.css`：真实侧栏选中行仍使用原生 onyx 的独立 `--onyx-selected`。原生亮色规则和 `.dark` 规则都用该变量绘制背景，并用带 `!important` 的 `--row-bg` 引用它。因此只覆盖 `--sidebar-secondary`，或只移除 `.dark`，都不能保证强制亮色时选中行变暖。

新增一个仅限 high-contrast / 历史别名、非暗色的规则，在 `.agy-sidebar-row[data-selected="true"]` 上把 `--onyx-selected` 指向 `--sidebar-secondary`。保留原生背景选择器、阴影和交互。

## 证据与覆盖

- 从 Stable Agents 的真实 DOM 与原生 CSSOM 读取选中行规则，未读取或修改会话正文。
- 临时置亮色后，默认预设和历史别名的选中行背景均由 `rgb(31,31,36)` 变为 `rgb(227,224,213)`，`--row-bg` 为 `#E3E0D5`，标签墨色为 `rgb(61,61,58)`。
- 8 组定向对照：默认预设/别名在亮色更新；默认预设/别名、纯白和复古的暗色，以及纯白和复古的亮色，选中行背景、row-bg、标签色新旧一致。
- 临时 CSS 和根节点属性在同步 finally 中恢复；未保存主题选择。
- 原生 Chromium `CSSStyleSheet.replaceSync()` 解析完整样式，得到 101 条规则。
- `git diff --check` 通过。
- `node --check install.mjs`、`node --check core/runtime.js`、`node --check core/daemon.mjs` 通过。

## 验证边界

仓库没有 lint、TypeScript 或单元测试命令；此项为不适用，未虚构检查。manifest、安装、最终 verify、整窗截图及扩展后的全量计算样式对照由主会话执行。亮色截图使用真实 DOM 的临时亮色属性/CSS，不是用户切换客户端原生主题后的独立持久化验收。

对比度计算覆盖本轮三种文字令牌与五种背景色，不应扩大表述为所有原生禁用态、低透明度标签或任意对话内容的文字均已达到 4.5:1。
