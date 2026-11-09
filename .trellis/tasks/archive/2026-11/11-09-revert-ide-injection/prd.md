# 还原 IDE 侧改动

## Goal

Antigravity IDE 已登记的 12 个插件目录恢复到被删前的版本，重载后不再因为缺 `package.json` 而全部 Invalid。Agents 窗口保持现有主题注入。补丁停止探测 IDE、停止改 IDE 的 `argv.json`、停止把运行时打进 IDE 工作台。这条边界写入 `.trellis/spec/`。

## Confirmed facts

- 截图横幅是 IDE 自己的 `Invalid Extensions detected. Review them.` Agents 侧栏仍可对话。
- `AppData/Roaming/Antigravity IDE/User/profiles/-75c033e1/extensions.json`（2026-11-03 20:05）仍登记 12 个插件，路径都在 `~/.antigravity-ide/extensions/<relativeLocation>/`。
- 该目录现在只剩 `extensions.json`（`[]`，2026-11-09 03:30 由 IDE 重写）和残缺的 `myriad-dreamin.tinymist-0.15.12-win32-x64`（无 `package.json`，只剩 `out/tinymist.exe`）。
- `20261108T213630/window3/fileWatcher.log` 在 `2026-11-09 02:49:24` 记下 `watched path got deleted`。`20261109T033028/main.log` 启动时读不到 tinymist 的 `package.json`。这是文件缺失，不是 CSS。
- `core/runtime.js` 是页面 IIFE，不能删除本机扩展目录。本项目会话里没有对该目录的删除命令，回收站里也没有这些目录。
- IDE 安装目录文件日期是 2026-10-26。`resources/app/package.json` 的 mtime 是 2026-11-06，内容仍是 1.107.0，不是这次主题补丁改的。
- 当前 `~/.antigravity-ide/argv.json` 没有 `remote-debugging-port`。`install.mjs` 的 `ensureArgvRemoteDebugging` 在 `channel=auto` 时会给已存在的 `.antigravity-ide` 补这个字段。
- `core/daemon.mjs` 的 `resolveIdeEndpoint` 在 `auto` 下附加 IDE 端点；`isInjectableTarget` 接受任意 `type === 'page'`。连上 IDE 端口就会把运行时打进工作台。Agents 整窗走经典版端口，不依赖 IDE 端点。
- 用户已选择：停掉 IDE 注入和 argv 修补，并把这 12 个插件按登记版本装回去。本地有同版本就复制，没有再从 Marketplace 下载。
- Marketplace 的 `vspackage` 地址对 clangd 0.6.0 和 debugpy 2026.6.0 win32-x64 返回 `200`、`application/vsix`。

登记版本：

| id | version | platform | 本地同版本 |
| --- | --- | --- | --- |
| catppuccin.catppuccin-vsc | 3.19.0 | universal | `.cursor/extensions/catppuccin.catppuccin-vsc-3.19.0-universal` |
| catppuccin.catppuccin-vsc-icons | 1.26.0 | universal | 无 |
| ms-python.vscode-python-envs | 1.20.1 | universal | 无 |
| ms-python.debugpy | 2026.6.0 | win32-x64 | `.qoder-cn/extensions/ms-python.debugpy-2026.6.0-win32-x64` |
| ms-python.python | 2026.4.0 | universal | 无 |
| james-yu.latex-workshop | 10.13.1 | universal | 无 |
| llvm-vs-code-extensions.vscode-clangd | 0.6.0 | universal | 无 |
| meta.pyrefly | 1.4.0 | win32-x64 | 无 |
| shopify.ruby-lsp | 0.10.6 | universal | 无 |
| golang.go | 0.56.1 | universal | 无 |
| pkief.material-icon-theme | 5.40.0 | universal | `.cursor/extensions/pkief.material-icon-theme-5.40.0-universal` |
| myriad-dreamin.tinymist | 0.15.12 | win32-x64 | `.cursor` 与 `.qoder-cn` 都有同名目录 |

## Requirements

1. Agents 的主题、scheme 跟随和字体选择保持现状。不回退只服务 Agents 的行为。
2. `channel=auto` 不再探测 Antigravity IDE，不再给 `~/.antigravity-ide/argv.json` 写入 `remote-debugging-port`。`stable` / `insiders` 不变。
3. 守护进程和 `verify` 不再把 IDE 端口加入候选。`type === 'page'` 仍接受，因为经典版 Agents 整窗就是 page。不要改成拒绝所有 page。
4. 不修改 Antigravity IDE 安装目录，不重签，不解包 `.asar`。不改配置档里的 `extensions.json`。
5. 把上表 12 个目录装回 `~/.antigravity-ide/extensions/<relativeLocation>/`。复制或解压前核对 `package.json` 的 publisher、name、version 与登记一致。平台不是 `universal` 的包使用 `win32-x64`。
6. 把边界写入 `.trellis/spec/`，并改掉 `SKILL.md` / `AGENTS.md` 里仍要求探测 IDE、修补 IDE argv 的句子。不改已归档任务和 `暗色主题修改方案.md`。

## Acceptance Criteria

- [ ] `node --check core/daemon.mjs` 与 `node --check install.mjs` 通过。`build-manifest` 后 `doctor` 的 `coreIntegrity.clean` 为 true。
- [ ] 源码不再给 `.antigravity-ide/argv.json` 写入调试端口，`auto` 端点列表不再包含 IDE。
- [ ] Agents 注入判定仍在：非 Agent 面板的子 iframe 开头返回；Agent 面板仍限本机 `http:` / `https:`，且查询串有 `extensionView=true` 或 `hostTheme`。
- [ ] 12 个登记目录都有可读的 `package.json`，版本与上表一致。
- [ ] spec 写明：扩展目录缺 `package.json` 时 IDE 会把已登记插件全部标成 Invalid；禁止注入 IDE 工作台，禁止改 IDE 扩展目录和安装目录。
- [ ] 不声称未重载的 IDE 窗口里插件已经变绿。恢复后的扫描要等用户重载。

## Out of scope

- 回退 Agents 暗色 scheme、字体目录、英文默认。
- 修改 IDE 的 `product.json`、`workbench.desktop.main.js` 或其他安装文件。
- 把这 12 个插件升到比登记版本更新的版本。
- 把本机扩展包、`~/.antigravity-ide` 或 `~/.gemini` 提交进仓库。
- 改写已归档任务或 `暗色主题修改方案.md`。
