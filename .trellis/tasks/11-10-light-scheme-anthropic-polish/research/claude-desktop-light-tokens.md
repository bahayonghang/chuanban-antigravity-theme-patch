# 亮色参考与边界

2026-11-10，本轮补充完成网络核对。此前后台研究没有返回，不能当作已完成。

- Anthropic 官方品牌规范：<https://github.com/anthropics/skills/blob/main/skills/brand-guidelines/SKILL.md>。给出的色值是正文 `#141413`、暖白 `#FAF9F5`、浅灰 `#E8E6DC`、强调 `#D97757`。这是品牌参考，不是 Claude Desktop 全量组件令牌。
- Claude 官方外观帮助：<https://support.claude.com/en/articles/8887527-customizing-your-appearance-settings>。确认 Light / Match System / Dark 模式，没有公布背景、边框和输入框的完整色值。
- design-atlas 的 `brand:claude` 主要取自营销站，其卡片、字体和布局不能整套搬进 Agents。只采用暖纸与陶土的色温关系，保留补丁原有字体、布局和交互。

实施采用已有预览的 A「象牙暖纸」作为默认 high-contrast 的方向：页面 `#FAF9F5`，外壳/侧栏 `#F0EEE6`，内卡白色，正文深墨，次要文字采用能达到 4.5:1 的暖灰。边框用暖墨透明度取代纯黑 35%，输入框去除桃粉底。

蜡封浓线采用 `#C6613F`，与原发送按钮 `#D97757` 同属陶土色系，发送按钮本身不改。其它两套预设及全部暗色维持原有计算结果。所有新增默认令牌均限定在亮色 high-contrast 及历史别名，保留 user.themeVars 的现有覆盖方式。

当前 doctor 可连接 Stable Agents，scheme=dark。实施前采集真实 DOM 与计算样式；使用同步、可恢复的样式替换对照，避免修改持久化配置或重启客户端。
