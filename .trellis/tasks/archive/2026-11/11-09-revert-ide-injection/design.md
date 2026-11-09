# 还原 IDE 侧改动

需求以 `prd.md` 为准。这里只记实现必须遵守的技术决定。

## Boundaries

改这些仓库文件：

- `core/daemon.mjs`：删掉 `idePortFilePath`、`resolveIdeEndpoint`，以及 `resolveActiveChannelEndpoints` 里对 IDE 端点的 push。文件头「附加 Antigravity IDE」那句一起改掉。
- `install.mjs`：删掉 `ideChannelInfo`、`channels.ide`、`verify` 候选里的 IDE 端口文件，以及 `ensureArgvRemoteDebugging` 对 `.antigravity-ide` 的处理。
- `SKILL.md`、`AGENTS.md`：去掉「探测 IDE / 修补 IDE argv / 用启动参数打开 IDE 的 9222」这些仍在要求做的句子。
- `.trellis/spec/node/boundaries.md`、`.trellis/spec/node/cli-and-daemon.md`：把 IDE 端点从 `auto` 契约里拿掉，并写入插件目录缺失的诊断和禁止项。

不改 `core/runtime.js`、`core/theme.css`、`core/i18n.json`。Agents 的 page 注入和 Agent 面板 iframe 判定保持原样。`isInjectableTarget` 继续接受 `type === 'page'`。IDE 工作台也是 page，隔离方式是不连 IDE 端口，不是拒绝所有 page。

不改已归档任务，不改 `暗色主题修改方案.md`。

`core/manifest.json` 只由 `build-manifest` 重写。`install.mjs` 不在那四个哈希文件里。

## Extension restore

目标目录是 `~/.antigravity-ide/extensions/<relativeLocation>/`。`package.json` 放在该目录根上，不要留在 `extension/` 子目录里。

先复制本地同版本。复制前读源 `package.json`，publisher、name、version 必须和登记表一致，否则改走下载。下载用已经验证过的地址：

```text
https://marketplace.visualstudio.com/_apis/public/gallery/publishers/{publisher}/vsextensions/{name}/{version}/vspackage
```

`targetPlatform` 不是 `universal` 时加上 `?targetPlatform=win32-x64`。请求带 `User-Agent: VSCode` 和 `Accept: application/octet-stream`。响应 `content-type` 应为 `application/vsix`。VSIX 解压后去掉 `extension/` 前缀。

下载和解压放在临时目录，成功后删掉。VSIX 不进仓库，也不留在扩展目录里。

tinymist 的目标目录已经存在，而且 `out/tinymist.exe` 可能被 IDE 锁住。不要先删整个目录。其余文件覆盖写入；exe 复制失败就留下现有的，只要根上的 `package.json` 版本正确。

不改两份 `extensions.json`。配置档那份仍是登记来源；扩展目录里的 `[]` 是 IDE 自己重写的，扫描靠目录，不要手填回去。

不结束 IDE 进程。文件写完后，当前窗口不会自己变绿，要等用户重载。

## Daemon cutover

先改完会写 argv 的代码，再跑 `node install.mjs install`。顺序反了，安装器会再次给 `~/.antigravity-ide/argv.json` 写入 `remote-debugging-port`。

Windows 上 `registerSystemService` 会停掉现有守护再拉起新的。用这一次 `install` 更新已安装的 `core/` 并换掉旧进程。不要另写守护脚本，不要 `uninstall`。

`install` 不得覆盖已安装 `user/`。不要传会改字体或 scheme 的参数。

## Spec contract

写入 spec 的可执行边界：

- `auto` 只探测 Stable 与 Insiders。目录 `~/.antigravity-ide` 存在也不附加 IDE 端点，也不写它的 `argv.json`。
- 注入目标仍是经典版的 `page`，以及本机 Agent 面板 iframe。不连 `%APPDATA%/Antigravity IDE/DevToolsActivePort`。
- 插件全部显示 `Invalid Extensions detected` 时，先看 `~/.antigravity-ide/extensions/<id>/package.json` 是否存在。缺失是目录被删，不是 CSS。
- 禁止删除、覆盖或「清理」IDE 扩展目录，禁止改 IDE 安装目录。恢复一次已知删除是这次任务的例外，不是新的常规入口。

## Rollback

仓库改动用 git 回退。已安装内核用 `core.prev/` 加现成的 `rollback`。已恢复的扩展目录不要在回退时代码删除；那是用户的插件，不是补丁文件。
