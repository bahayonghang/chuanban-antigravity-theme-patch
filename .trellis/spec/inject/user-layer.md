# user/ 改装层

`user/` 是默认模板。用户机器上真正生效的是已安装副本：

`~/.gemini/antigravity/theme-patch/user/`

（Windows：`%USERPROFILE%\.gemini\antigravity\theme-patch\user\`）

守护进程每 2.5 秒看这四个文件的 mtime 和大小：`config.json`、`custom.css`、`i18n.override.json`、`custom.js`。保存后等下一轮即可，不要重启守护进程或 Antigravity。

`--safe-mode` 完全不读这四件。页面异常时先用它区分是内核还是改装层。

## config.json

仓库模板里的形状就是契约，见 `user/config.json`：

- `enabled`：`false` 时整套补丁无损卸载。关补丁用这个字段，不要去删客户端文件。
- `channel`：`auto`、`stable` 或 `insiders`。默认 `auto`。
- `preset`：只写 `high-contrast`、`claude-desktop-purewhite`、`vintage-deep`。
- `scheme`：只写 `auto`、`light`、`dark`。缺字段或别的值在运行时当 `auto`。
- `contextLimit`：默认 `256000`。非正数会被守护进程打回 256000。
- `modules`：六个布尔开关。可以写成别名 `features`。`metrics` 可以写成 `metricsCapsule`，但同一份配置里不要两个都写不同值。
- `themeVars`：CSS 变量名到字符串。空对象表示不覆盖。
- `selectors`：只放需要替换的选择器。没写的键继续用 `runtime.js` 里的默认值。

不要在 `config.json` 里塞词典或 CSS 正文。

## custom.css / i18n / custom.js

- `custom.css`：原生 CSS，文件头注释说明它排在内核之后、升级不覆盖。排障命令写在注释里，保持这样。
- `i18n.override.json`：扁平 `"英文原文": "中文"`，或包在 `"exact"` 里。`_comment` 可以被留下，运行时会丢弃 `_` 开头的键。
- `custom.js`：默认文件只有注释、没有语句。注释列出的 `ctx` 字段必须和 `runtime.js` 里 `window.__AG_PATCH_CTX__` 一致。脚本抛错不应拖垮页面；内核已经隔离。注释里指出用 `verify --safe-mode` 排障，不要删。

用户脚本可以读 `ctx.dict` 和 `ctx.metrics`，不要从脚本里再开一个 CDP 连接或去读会话 sqlite。指标只从 `ctx.metrics` 来。

## 什么时候改仓库里的 user/

只有用户明确说「把这次改装写回默认模板」时，才改仓库 `user/`。否则只改已安装副本。私人配置不要提交。

## 反模式

- 升级或重装时用仓库模板覆盖已安装的 `user/`。`install.mjs` 已经跳过已存在文件。
- 为了关一个模块去改 `core/runtime.js` 的默认 `true`。用已安装 `config.json`。
- 在 `custom.js` 里重写汉化 walker 或再插一个 `#ag-custom-fonts`。
- 把 `enabled` 设 `false` 还另外手动删 DOM。运行时那条卸载路径会做完。

## 参考

- `user/config.json`、`user/custom.css`、`user/custom.js`、`user/i18n.override.json`
- `core/daemon.mjs`：`userFiles` 列表与 `SAFE_MODE` 分支
- `SKILL.md` 第五节
