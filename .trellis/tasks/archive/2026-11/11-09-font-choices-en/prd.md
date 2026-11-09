# 界面字体选择与英文默认

## Goal

界面可以在补丁配置里更换外观字体和代码字体。默认外观是本机的 WenYuan Serif SC，默认代码是 MapleBright。界面默认英文；中文词典保留，但不再默认打开。

## Confirmed facts

- 用户已选择：字体选择放在 `user/config.json` 的两套目录里，不注入原生「字体设置」下拉。
- 外观覆盖界面控件和对话正文。代码覆盖代码、终端、文件名和输入框。
- 原生下拉只有 System UI、Inter、Google Sans，而且 `core/theme.css:41-47` 用 `!important` 把它们全盖成 Anthropic。本任务不修这个下拉。
- 本机注册表已有 `WenYuan Serif SC`、`WenYuan Sans SC`、`MapleBright`。字体文件不入库。
- 汉化目前默认开启。关掉 `modules.i18n` 会还原英文（`core/runtime.js:1058-1060`）。安装器不会覆盖已有的 `i18n: true`。
- 内容哈希目前不含字体字段（`core/daemon.mjs:324`）。只改配置而不加入哈希，热重载不会换注入版本。

## Requirements

1. `fonts.ui` 只允许 `wenyuan-serif`、`wenyuan-sans`、`anthropic`、`system`。缺字段、空字符串或其他值都当 `wenyuan-serif`。
2. `fonts.code` 只允许 `maple-bright`、`maple-mono`、`anthropic`、`sarasa`。缺字段、空字符串或其他值都当 `maple-bright`。
3. `wenyuan-serif` 用 `WenYuan Serif SC`，并保留现有中文回退。`maple-bright` 用 `MapleBright`，并保留等宽回退。其他目录项沿用现有 Anthropic、更纱或系统字体栈，不新增要下载的字体。
4. 外观字体用于界面控件和对话正文。代码字体用于代码、终端、文件名和输入框。原生下拉继续不控制这两层。
5. 仓库模板和运行时缺省的 `modules.i18n` 改为 `false`。已有合法 `true` / `false` 在安装时保留。当前这台机器的已安装配置把 `modules.i18n` 写成 `false`，因为用户要求现在就是英文。不删词典，不改 `i18n.override.json`。
6. 安装时只有字体字段缺失或非法才写入默认 id。已有合法值保留。不覆盖已安装 `user/` 的其他文件。
7. `SKILL.md` 写明两个字段、合法值和「原生字体下拉不控制补丁字体」。`AGENTS.md` 写明 `i18n` 默认关闭。

## Acceptance Criteria

- [ ] `node --check core/daemon.mjs`、`node --check core/runtime.js`、`node --check install.mjs` 通过。`build-manifest` 后 `doctor` 的 `coreIntegrity.clean` 为 true。
- [ ] 当前 Agents 窗口在注入新版本后，界面和对话正文的计算字体包含 `WenYuan Serif SC`，代码、终端、文件名和输入框包含 `MapleBright`。设置里的可见文字是英文。
- [ ] 已安装配置把 `fonts.ui` 改成 `anthropic`、`fonts.code` 改成 `sarasa` 后，约 2.5 秒内计算字体离开 WenYuan / MapleBright。改回默认 id 后恢复。测完恢复默认。
- [ ] 非法 `fonts.ui` 不当成空字体。页面仍用 WenYuan Serif SC。
- [ ] 词典仍是 450 条。`modules.i18n` 改回 `true` 后，约 2.5 秒内「Appearance」再次显示为「外观界面」。测完保持 `false`。
- [ ] 原生下拉仍是 System UI / Inter / Google Sans。切换它不改变上述计算字体。

## Out of scope

- 往原生字体菜单注入选项，或让 `data-agy-font` 驱动补丁字体。
- 删除或改写 `core/i18n.json`。
- 把字体文件提交进仓库，或改 `install-fonts` 去下载这两套字体。
- 改配色、scheme、暗色令牌。
- 覆盖已安装 `user/` 里除 `fonts` 缺省补齐和这一次 `i18n: false` 之外的字段。
