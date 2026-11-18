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
- `fonts`：`ui` 只允许 `wenyuan-serif`、`wenyuan-sans`、`anthropic`、`system`，缺省 `wenyuan-serif`。`code` 只允许 `maple-bright`、`maple-mono`、`anthropic`、`sarasa`，缺省 `maple-bright`。空字符串或其他值也回退默认 id。原生字体下拉不控制这两层。
- `modules`：六个布尔开关。可以写成别名 `features`。`metrics` 可以写成 `metricsCapsule`，但同一份配置里不要两个都写不同值。`i18n` 缺省 `false`；已有 `true` / `false` 安装时保留。
- `themeVars`：CSS 变量名到字符串。空对象表示不覆盖。
- `selectors`：只放需要替换的选择器。没写的键继续用 `runtime.js` 里的默认值。

不要在 `config.json` 里塞词典或 CSS 正文。

## 默认英文契约

用户要求本分支默认使用英文界面。合入上游、升级和部署时，保留现有字体及 Anthropic 默认主题配置；不要为了同步上游而开启汉化。

- 仓库模板、守护进程与浏览器运行时的 `modules.i18n` 缺省值均为 `false`。本机已安装配置也应保持 `false`；只有用户明确要求中文时才开启。
- 默认英文指宿主菜单、侧栏、设置、按钮与提示文字为英文。用户的中文项目名、会话标题和对话正文应原样保留，不能作为汉化失败的判据。
- `metricsLang=auto` 在英文宿主且汉化关闭时应显示英文指标文案。字体选择、配色预设与语言开关相互独立。
- 升级时保留已有显式布尔值；若发现 `true` 与本次用户明确要求英文冲突，只修正已安装配置，不用 `--sync-user` 覆盖整份改装层。

### 验收与异常处理

配置中的 `i18n=false`、`<html lang="en">` 及 `verify.ok=true` 都不能单独证明界面已经是英文。必须查看实际宿主固定标签，并在设置页核验；例如 Workspace、New conversation、Settings、General、Appearance（具体拼写以当前客户端原文为准）。升级或重新加载后重复检查，确认没有再次被翻译。

若开关关闭后仍显示中文：

1. 检查 `window.__AG_PATCH_CTX__.modules.i18n` 和中文节点的 `window.__ag_orig_text_map` 记录。无记录的译文不能由本补丁的 WeakMap 还原。
2. 排查独立汉化器与 Electron preload 的隔离上下文；主页面查不到汉化全局变量，不代表隔离上下文没有汉化引擎。已观察到 Context Meter / AntigravityChinese 的独立 preload 汉化可在船板开关关闭时继续翻译。
3. 独立汉化器配置显示关闭，也必须检查实际运行态。仅当页面没有未发送输入及运行中的操作时，才可尝试重新加载；重载后仍为中文就记录为验收失败，继续追踪独立引擎，不宣称已恢复英文。
4. 不做中文到英文的反向词典替换，不误改用户内容；不通过修改客户端安装目录或 `.asar` 修复。需要跨越该边界时，应明确报告来源与尚未解决的限制。

错误示例：读取 `modules.i18n=false` 后回复“英文界面已验证”。正确做法：同时核对配置、实际固定 UI 文案和重新加载后的结果；若仍有中文，报告未通过验收。

## custom.css / i18n / custom.js

- `custom.css`：原生 CSS，文件头注释说明它排在内核之后、升级不覆盖。排障命令写在注释里，保持这样。
- `i18n.override.json`：扁平 `"英文原文": "中文"`，或包在 `"exact"` 里。`_comment` 可以被留下，运行时会丢弃 `_` 开头的键。
- `custom.js`：默认文件只有注释、没有语句。注释列出的 `ctx` 字段必须和 `runtime.js` 里 `window.__AG_PATCH_CTX__` 一致。脚本抛错不应拖垮页面；内核已经隔离。注释里指出用 `verify --safe-mode` 排障，不要删。

用户脚本可以读 `ctx.dict` 和 `ctx.metrics`，不要从脚本里再开一个 CDP 连接或去读会话 sqlite。指标只从 `ctx.metrics` 来。

## 什么时候改仓库里的 user/

只有用户明确说「把这次改装写回默认模板」时，才改仓库 `user/`。否则只改已安装副本。私人配置不要提交。

## 反模式

- 升级或重装时用仓库模板覆盖已安装的 `user/`。`install.mjs` 已经跳过已存在文件。
- 为了这一台机器关汉化，去把产品缺省改回 `true` 或改掉别人已有的布尔值。产品缺省已经是 `false`；单机开关只改已安装 `config.json`。
- 在 `custom.js` 里重写汉化 walker 或再插一个 `#ag-custom-fonts`。
- 把 `enabled` 设 `false` 还另外手动删 DOM。运行时那条卸载路径会做完。

## 参考

- `user/config.json`、`user/custom.css`、`user/custom.js`、`user/i18n.override.json`
- `core/daemon.mjs`：`userFiles` 列表与 `SAFE_MODE` 分支
- `SKILL.md` 第五节
