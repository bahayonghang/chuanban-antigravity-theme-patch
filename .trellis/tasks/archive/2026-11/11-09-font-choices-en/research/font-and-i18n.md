# 字体与汉化默认

2026-11-09。用户选择：字体选择放在补丁配置的两套目录里，不改原生下拉。

## 现有字体层

- `core/theme.css:41-47`：`body[data-agy-font]`、`google-sans`、`inter` 都把 `--font-sans` / `--font-mono` 设成 Anthropic，带 `!important`。原生下拉因此不改变渲染字体。
- `core/theme.css:64`：界面控件用 `var(--font-sans)`。
- `core/theme.css:70`：对话正文写死 Anthropic Serif，没有 `!important`。
- `core/theme.css:80`：代码、终端、文件名用 `var(--font-mono)`。
- `core/theme.css:85`：输入框写死更纱 Slab，带 `!important`，不读 `--font-mono`。
- 实机 `body[data-agy-font]="google-sans"`。下拉选项只有 System UI、Inter、Google Sans，触发器类名 `agy-select-trigger`。

## 本机字体

注册表家族名，不是文件名：

- `WenYuan Serif SC`
- `WenYuan Sans SC`
- `MapleBright`
- Maple Mono 也已安装

字体文件不入库。CSS 用 `local()`。

## 汉化

- `core/daemon.mjs:273`、`core/runtime.js` 模块默认值、仓库 `user/config.json:8`、已安装配置都是 `modules.i18n: true`。
- `core/runtime.js:1058-1060`：关掉模块会还原英文。
- `core/daemon.mjs:324` 的内容哈希含 `preset`、`scheme`、`modules`、`themeVars`，不含字体字段。新字段必须加入这个对象，否则只改字体不会换注入版本。
- `install.mjs` 只在 `preset` / `scheme` 缺失时补默认值。已有 `i18n: true` 不会因改模板而变成 `false`。
