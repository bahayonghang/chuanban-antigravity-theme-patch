<!-- TRELLIS:START -->
# Trellis Instructions

These instructions are for AI assistants working in this project.

This project is managed by Trellis. The working knowledge you need lives under `.trellis/`:

- `.trellis/workflow.md` — development phases, when to create tasks, skill routing
- `.trellis/spec/` — package- and layer-scoped coding guidelines (read before writing code in a given layer)
- `.trellis/workspace/` — per-developer journals and session traces
- `.trellis/tasks/` — active and archived tasks (PRDs, research, jsonl context)

If a Trellis command is available on your platform (e.g. `/trellis:finish-work`, `/trellis:continue`), prefer it over manual steps. Not every platform exposes every command.

If you're using Codex or another agent-capable tool, additional project-scoped helpers may live in:
- `.agents/skills/` — reusable Trellis skills
- `.codex/agents/` — optional custom subagents

Managed by Trellis. Edits outside this block are preserved; edits inside may be overwritten by a future `trellis update`.

<!-- TRELLIS:END -->

# 船板 Antigravity 主题补丁

给编码代理的仓库说明。给人看的介绍在 `README.md`；部署、改装和排障的完整契约在 `SKILL.md`。这里只保留动手前必须遵守的事实、命令和边界。

这是 Google Antigravity 的运行时主题、字体与汉化补丁（v5.0.0）。零 npm 依赖，无构建步骤。通过本机 CDP（`127.0.0.1:9222`）注入，不修改 Antigravity 安装包或 `.asar`。Node.js `>= 22.0.0`；`>= 22.13.0` 才启用 `node:sqlite` 指标胶囊，更低的 22.x 必须优雅降级，不能因此崩溃。

## 先分清两套目录

| 位置 | 是什么 | 代理可以做什么 |
| :--- | :--- | :--- |
| 本仓库 `core/` | 随版本发布的只读黄金内核 | 只在用户明确要求改内核时修改，改完必须重建 manifest |
| 本仓库 `user/` | 安装时带去的默认改装模板 | 改「出厂默认」，不是改某台机器上已经装好的皮肤 |
| `~/.gemini/antigravity/theme-patch/`（Windows：`%USERPROFILE%\.gemini\antigravity\theme-patch\`） | 已安装的运行副本 | 给用户换配色、字号、词条、CSS、JS 时只改这里的 `user/` |

个性化改装保存后约 2.5 秒热重载，不要为此重启守护进程或 Antigravity。

## 命令

在仓库根目录执行。没有 `npm install`，也没有测试脚本。

```bash
node install.mjs doctor
node install.mjs install
node install.mjs verify
node install.mjs install-fonts --from <解压后的字体目录>
node install.mjs verify --safe-mode
node install.mjs rollback
node install.mjs uninstall
node install.mjs build-manifest
```

可选参数以 `install.mjs` 文件头为准：`install` / `doctor` / `verify` 接受 `--channel auto|stable|insiders`；`install` 另接受 `--preset` 与 `--target-dir`。默认 `channel=auto`，一个守护进程同时照看 Stable 和 Insiders。

部署顺序：`doctor` →（缺字体时先 `install-fonts` 或让用户自行安装）→ `install` → 确认 Antigravity 在运行 → `verify`。字体不在本仓库，从 `core/manifest.json` 的 `distribution.googleDriveFullBundle` 获取。`install-fonts` 在 Windows 上除了复制到 `%LOCALAPPDATA%\Microsoft\Windows\Fonts`，还会写当前用户字体注册表；不要只 `copy` 字体文件。

验收看 `verify` 的 JSON：`"ok": true`，且 `themeStyle` 为 true、版本与当前包一致。异常时先 `doctor`，再用 `verify --safe-mode` 判断是不是 `user/` 层造成的；需要回到上一份内核快照时用 `rollback`。`uninstall` 只停服务，保留已安装的 `user/`。

首次 `install` 会给 `~/.antigravity/argv.json`（以及 Insiders 对应文件）写入 `"remote-debugging-port": 9222`。若客户端当时已经开着，要请用户完全退出再打开一次，否则 `verify` 连不上。

改过 `core/daemon.mjs`、`core/runtime.js`、`core/theme.css` 或 `core/i18n.json` 之后，运行 `node install.mjs build-manifest`，让 `core/manifest.json` 的 SHA-256 和字节数与文件一致。不要手改这些哈希。

## 边界

始终：

- 部署和改装先读 `SKILL.md`，再调用现成的 `install.mjs`。
- 用户的配色、字号、词条、追加 CSS、前端钩子只写已安装目录的 `user/config.json`、`user/custom.css`、`user/i18n.override.json`、`user/custom.js`。
- `custom.css` 写原生 CSS，不要做反斜杠转义。`i18n.override.json` 用扁平 `"英文原文": "中文"`，或包在 `"exact"` 里。
- 预设只用 `"high-contrast"`、`"claude-desktop-purewhite"`、`"vintage-deep"`。`modules` 可别名 `features`，`metrics` 可别名 `metricsCapsule`。
- 关闭整套补丁时把已安装 `user/config.json` 的 `"enabled"` 设为 `false`，不要去删客户端文件。

先问再做：

- 改 `core/`、`install.mjs`，或把某次个人改装写回仓库 `user/` 当作新的默认模板。
- `uninstall`、`rollback`，或锁定 `--channel stable|insiders`。
- 杀毒软件拦截启动项时，改用任务计划程序注册 `node.exe`。不要另写一套守护脚本。

禁止：

- 现场重写、拆分或「重新生成」`core/` 守护进程、注入引擎、样式或词典来完成安装。
- 修改 Antigravity 安装目录、重签或解包 `.asar`。
- 把调试端口绑到非回环地址。CDP 来源只允许 `install.mjs` 里的 `127.0.0.1`、`localhost` 和 `vscode-file://`。
- 升级或重装时覆盖用户已有的 `user/`。同一版本重复安装也不要冲掉上一份 `core.prev/` 快照。
- 把本机 `~/.gemini/...` 的私人配置提交进仓库。字体文件也不入库。

## 源码约定

- 运行时是原生 ESM：`install.mjs` 与 `core/daemon.mjs` 使用 `node:` 内置模块。浏览器注入体是 `core/runtime.js`，不要引入打包器或依赖。
- 文件头用简短中文注释说明不变量；不要把 `SKILL.md` 整段复制进代码。
- 汉化词典挂到 `Object.create(null)`。不要给 `core/i18n.json` 添加会撞上原型键的条目，也不要翻译代码块、终端、对话正文和 `user/config.json` 里 `selectors.excludeI18n` 覆盖的节点。
- 会话 id 只接受 UUID。指标只读本地会话库，写操作不属于这个补丁。
- 仓库没有单元测试。内核改动用 `build-manifest` 加 `doctor`；涉及注入效果时用正在运行的客户端跑 `verify`。验证不了就说明缺什么，不要声称已经生效。

## 继续往下读

- 三步部署、`user/` 字段、Windows 字体与自启：`SKILL.md`
- 版本历程和给用户的提示词：`README.md`
- 校验、最低 Node 版本、字体包地址：`core/manifest.json`
