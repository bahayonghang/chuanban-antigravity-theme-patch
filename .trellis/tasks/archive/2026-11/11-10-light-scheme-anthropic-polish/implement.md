# 实施计划

1. 保存当前真实 DOM 与新旧样式对照基线；确认亮色表面所有者。
2. 仅修改 core/theme.css：默认亮色令牌、真实外壳表面、描边和输入框色温。保留暗色及其它预设。
3. 在真实 DOM 与独立 Chromium DOM 中对照新旧暗色三套预设/另外两套亮色；检查默认预设与历史别名、themeVars、首页/会话聚焦状态、文字对比度。记录实际覆盖。
4. node install.mjs build-manifest；node install.mjs doctor；用现成 install 部署并 node install.mjs verify；检查 user/ 文件哈希未变。
5. trellis-check 独立复核；必要修复后重跑受影响检查。更新规范的新增契约、检查 git diff --check，提交本任务文件；仅全部验收达标才归档并记录会话。

不提交原有的暗色方案文档删除或用户提供的交接 txt。对客户端的临时 CSS/属性变更均必须在 finally 中恢复；不重启或改持久化配置。
