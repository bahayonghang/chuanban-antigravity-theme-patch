# 实施记录

仅在 `core/theme.css` 原默认预设与暗色块之间新增亮色作用域，不改原有规则。作用域同时要求非暗色和 `high-contrast` / 历史别名 `chuanban-warm-white`。

- 基础令牌同时设置于根节点和带 `.theme-light` / `.theme-dark` 的 body，支持宿主仍为暗色时强制 `scheme=light`。
- `--ag-*` 默认值仅设于根节点且不加 `!important`，保留行内 `themeVars` 覆盖。
- 主纸面、面板 body 使用暖白；外壳、inset gutter、侧栏使用燕麦色；覆盖 `--shell-canvas` 避免原生冷色沟槽露出；sheet 去除冷色渐变。
- 实机截图进一步发现 `.agy-inset-shell` 本地声明 `--shell-canvas`，其下 `div.contents` 的行内 `--sidebar: var(--shell-canvas)` 会引用这个本地值。仅在根节点覆盖不足，因此同样在实际外壳元素上覆盖 `--shell-canvas`；不能以标题栏 `.bg-sidebar` 的颜色代替真实侧栏验收。
- 蜡封只改令牌，保留边框宽度、首页/会话、悬停/聚焦三态；发送按钮、共享阴影、暗色块均不改。
- 弱化文字从初选 `#6B6963` 调为 `#65635D`：前者在选中/悬停底上不足 4.5:1；后者在页面、外壳、白卡、选中、悬停五种底色上最低约 4.54:1。

实施侧检查：`git diff --check` 通过；移除新增作用域后文件与 HEAD 完全相同（统一换行后）；三种文字色对五种底色的 sRGB 对比度核算通过。真实 DOM 对照、manifest、安装验收由主会话负责并写入独立验收记录。
