# 目录边界与安装不变量

改 Node 侧之前先分清「仓库里的黄金副本」和「用户机器上已经装好的皮肤」。

## 两套目录

| 位置 | 是什么 | 代理可以做什么 |
|------|--------|----------------|
| 仓库 `core/` | 随版本发布的只读黄金内核 | 只在用户明确要求改内核时改，改完必须 `build-manifest` |
| 仓库 `user/` | 安装时带去的默认模板 | 改「出厂默认」，不是改某台机器上已经装好的皮肤 |
| `~/.gemini/antigravity/theme-patch/` | 已安装运行副本 | 给用户换配色、字号、词条、CSS、JS 时只改这里的 `user/` |

`install.mjs` 的 `resolveDefaultTargetDir()` 只在已安装目录存在 `core/daemon.mjs` 时指向它，否则退回仓库自身。不要另写一套路径探测。

## 安装时不许覆盖的东西

`runInstall()` 里已经固定三条，新逻辑不得放宽：

1. **`user/` 已有文件不覆盖。** 只在目标不存在时从仓库 `user/` 复制。见 `install.mjs` 里「user/ 层永不覆盖已有文件」。
2. **同一版本重复安装不冲掉 `core.prev/`。** 只有已安装 `core/manifest.json` 与待安装清单的 SHA-256 不同才备份到 `backups/<timestamp>/` 并刷新 `core.prev/`。
3. **`uninstall` 只停服务。** 保留已安装的 `user/`。不要把卸载写成删目录。

`user/config.json` 只在字段缺失或非法时补写：`--channel` / `--preset` / 合法 `--scheme`，以及 `fonts.ui` / `fonts.code`。`scheme` 只接受 `auto`、`light`、`dark`。字体 id 不在目录里就写成默认 id，不让安装失败。已有布尔 `modules.i18n` 不覆盖。不要整文件重置。

## 禁止

- 修改 Antigravity 安装目录、重签或解包 `.asar`。IDE 安装目录同样不许改。
- 探测 Antigravity IDE，连接 `%APPDATA%/Antigravity IDE/DevToolsActivePort`，或给 `~/.antigravity-ide/argv.json` 写入 `remote-debugging-port`。`channel=auto` 只探测 Stable 与 Insiders。目录 `~/.antigravity-ide` 存在也不附加 IDE 端点。
- 删除、覆盖或「清理」`~/.antigravity-ide/extensions`，也不要手填扩展目录里的 `extensions.json`。恢复一次已知删除是任务 `11-09-revert-ide-injection` 的例外，不是新的常规入口。
- 把调试端口绑到非回环地址。CDP 的 HTTP 主机是字面量 `127.0.0.1`（`fetchTargets` / `fetchTargetsFromPort`）。
- 来源白名单只允许现在这五项：`http://127.0.0.1`、`https://127.0.0.1`、`http://localhost`、`https://localhost`、`vscode-file://`。定义在 `install.mjs` 的 `ALLOWED_ORIGINS`，守护进程默认同一组，可被已安装 `user/config.json` 的 `allowedOrigins` 替换，但代理不要为了「方便调试」改宽。
- 把本机 `~/.gemini/...` 的私人配置提交进仓库。字体文件也不入库。
- 杀毒软件拦截 VBS 时，用任务计划程序注册 `node.exe`（`SKILL.md` 第六节）。不要另写一套守护脚本。

## IDE 插件全部 Invalid

Antigravity IDE 把已登记插件全部标成 `Invalid Extensions detected` 时，先看 `~/.antigravity-ide/extensions/<id>/package.json` 是否存在。缺失是目录被删，不是 CSS，也不是注入脚本的问题。不要为此改 `core/theme.css` 或 `core/runtime.js`，不要删除或重写扩展目录，不要修改 IDE 安装目录。

## 内核改动的入口

用户没点名要改内核时，停在已安装 `user/`。点名要改时：

- 样式、词典、注入引擎、守护进程分别改 `core/theme.css`、`core/i18n.json`、`core/runtime.js`、`core/daemon.mjs`。
- 改完运行 `node install.mjs build-manifest`。`buildManifest()` 只哈希那四个文件，并写回 `version: '5.0.0'`。不要手改哈希。
- 守护进程对外版本串是 `BASE_VERSION`（`20261104-v5.0.0`）加通道和 8 位内容哈希，在 `rebuildBundleIfNeeded()` 里拼出来。不要再发明第三个版本常量。

## 参考

- `install.mjs`：`resolveDefaultTargetDir`、`runInstall`、`ALLOWED_ORIGINS`
- `core/daemon.mjs`：文件头「安全模式」与 `SAFE_MODE` 分支
- `AGENTS.md`「先分清两套目录」「禁止」
