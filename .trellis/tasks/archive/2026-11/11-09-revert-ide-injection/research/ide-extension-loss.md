# IDE 插件目录缺失

2026-11-09 调查。时区是 Windows Eastern Standard Time（UTC-5）。

## 现象

Antigravity IDE 扩展面板显示 `Invalid Extensions detected. Review them.` 每个已安装项都有警告。Agents 窗口仍可对话。

## 磁盘

配置档 `AppData/Roaming/Antigravity IDE/User/profiles/-75c033e1/extensions.json` 仍登记 12 个插件，位置都在 `C:\Users\lyh\.antigravity-ide\extensions\<relativeLocation>`。该文件 mtime 是 2026-11-03 20:05。

扩展目录实际只剩：

- `extensions.json`，内容 `[]`，mtime 2026-11-09 03:30
- `myriad-dreamin.tinymist-0.15.12-win32-x64/out/tinymist.exe`，没有 `package.json`。`out` 目录 mtime 2026-11-09 02:49

## 日志

- `logs/20261108T213630/window3/fileWatcher.log`：`2026-11-09 02:49:24` `Watcher shutdown because watched path got deleted`
- `logs/20261109T033028/main.log`：启动扫描读不到 tinymist 的 `package.json`

## 排除

- 本仓库 `core/runtime.js` 是浏览器 IIFE，不能删除本机扩展目录。
- 本项目会话里没有对该目录的 `Remove-Item` / `rmtree`。字体任务会话在 2026-11-09 02:18 本地时间结束，早于 02:49 的删除。
- 回收站没有这些扩展目录。
- IDE 安装目录主体日期是 2026-10-26。`CachedExtensionVSIXs` 里三个文件的首个成员是 `extension.vsixmanifest`，列出的内容不是这 12 个插件。
- Marketplace `vspackage` 可下载登记版本。clangd 0.6.0 与 debugpy 2026.6.0 win32-x64 均返回 200 和 `application/vsix`。
