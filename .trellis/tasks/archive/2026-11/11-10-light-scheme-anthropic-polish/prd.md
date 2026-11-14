# 明亮主题 Anthropic 质感优化

## Goal

修复 Agents 默认亮色混合冷灰外壳、桃粉输入框和粗黑分隔线的问题，形成连贯的暖纸层次。暗色不动。

## Background

用户在交接记录中已要求创建任务并继续实施，本轮继续该任务。原截图取证与源码锚点保留在 research/light-current-state.md；网络参考和可确认的边界在 research/claude-desktop-light-tokens.md。此前只完成规划初稿，没有产品代码改动。当前默认 preset=high-contrast，客户端在线且为暗色。

## Requirements

- R1：优化 high-contrast 亮色及历史别名 chuanban-warm-white，按 DESIGN.md 统一标题栏、外壳、侧栏、主纸面与输入框的暖色层次。
- R2：淡化纯黑分隔与控件描边，恢复正文、强文字、弱化文字层级；修改的正文/强文字/弱化文字令牌对所用五种背景至少 4.5:1。
- R3：输入框去桃粉色，蜡封采用陶土色，保留首页/会话及悬停/聚焦三态和原边框宽度。
- R4：全部暗色和其它两套预设保持原有计算样式；保留用户已有覆盖能力和字体、功能开关。
- R5：只修改必要 CSS 并自动重建 manifest。通过现成安装器验收，保留已安装 user/，不改变持久化主题选择。

## Acceptance Criteria

- [x] AC1 / R1：真实 Agents DOM 中外壳、侧栏为 #F0EEE6，主纸面 #FAF9F5，输入框外层 #F0EEE6、内卡 #FFFFFF；没有冷蓝顶光。
- [x] AC2 / R2：默认亮色分隔线使用暖墨透明色，修改的文字令牌对五种背景对比度达标，视觉检查无黑色重带。
- [x] AC3 / R3：首页默认透明、聚焦淡线；会话默认淡线、聚焦浓线，布局不跳动。
- [x] AC4 / R4：新旧暗色三套预设、另两套亮色的代表节点计算样式对照无差异，覆盖示例仍生效。
- [x] AC5 / R5：build-manifest、doctor、verify 通过；实际覆盖与未运行项写入验收记录。

## Out of scope

不改另两套预设、暗色设计、布局、字体、词典、指标、守护进程、安装器或仓库 user/ 默认模板；不接触 Antigravity IDE。不是 Claude Desktop 的像素级复刻。
