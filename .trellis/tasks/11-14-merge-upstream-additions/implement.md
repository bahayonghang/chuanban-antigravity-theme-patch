# 实施顺序

从 `research/upstream-additions.md` 取上游片段。每步完成后工作区应仍能 `node --check`。

1. `.gitattributes`：保留现有 Trellis 注释和 `journal-*.md merge=union`。追加上游的 `* text=auto eol=lf` 和 png/jpg/ttf/ttc/otf/woff2 的 `binary`。
2. 新建 `CHANGELOG.md`：复制 `upstream/main:CHANGELOG.md`。在标题下加一段中文说明：此文件记录上游 `v5.0.1`–`v5.2.0`；本分支未实现冷启动自愈、Swarm 注入、onyx 暗色整表替换、schtasks 主自启。本地行为以 `AGENTS.md` 为准。
3. `git checkout upstream/main -- core/i18n.json`。检查键数量 1630、值皆为字符串、无原型键。不要 checkout 其他路径。
4. `core/runtime.js`：
   - 按研究笔记追加三类选择器，不删除旧片段，分支药丸仍带输入框前缀。
   - 精确匹配失败后做一次弯引号折叠重查。
   - 追加研究笔记列出的、本地没有的 `RE_*`。字面量从上游文件拷贝。本地已有正则一个字符都不改。
   - 新正则插到对应首字母桶里、本地判断之后。唯一例外是 `RE_WORKED_FOR_UPDATES` 放在本地 `RE_WORKED_FOR` 之前。
   - 不改文件末尾 `})(__AG_BOOT_PAYLOAD__);`。
   - 不改注入门、字体 id、scheme、外观门控、指标胶囊。
5. `user/config.json`：只在 `selectors` 三个字符串里追加与运行时相同的新片段。不改 `modules`、`scheme`、`fonts`，不添加 `coldBootHealer` 或 `zoomShortcuts`。
6. `install.mjs`：
   - 增加 `canonicalPath`、`isSameTargetPath`。
   - `runInstall` 增加 `--sync-user` 和自定义目录沙箱。默认复制循环保持「缺文件才复制全部 user 条目」。
   - 文档复制列表加入 `CHANGELOG.md`。
   - `runRollback`、`runVerify`、`runUninstall`、`runDoctor` 在自定义沙箱且无 `--register-service` 时不碰本机服务和 argv。
   - `rollback` 使用 `isValidCoreBackup`，排除 `*-user`。
   - `runInstallFonts` 在现有注册表写入之后追加 PowerShell 广播。失败不改变 `ok: true`。
   - 搬入 `buildDistZip`，底部 `switch` 增加 `pack`。
   - 不改 `registerSystemService` 的 Windows VBS 分支。
7. `SKILL.md`：在现有命令列举附近用几行写上 `--sync-user`、`--target-dir` 沙箱、`--register-service`、`rollback` 备份校验、`pack`、`install-fonts` 的会话广播。不改字体目录、scheme、IDE 禁令和汉化默认关闭的段落。
8. 运行验证命令。`core/manifest.json` 只允许 `build-manifest` 改哈希和字节数，版本号仍是 `5.0.0`。

## 验证

```bash
node --check install.mjs
node --check core/runtime.js
node --check core/daemon.mjs
node install.mjs build-manifest
node install.mjs doctor
```

用一段临时 Node 脚本断言 AC4 的四个旧例句和新 MCP 例句。脚本放在临时目录，跑完删除，不写入仓库。

`git diff --stat HEAD -- core/daemon.mjs core/theme.css README.md` 应为空。

Antigravity 未在 `127.0.0.1:9222` 监听时，不把 `verify` 失败当成回归。说明没做实机注入验收。

## 风险与回滚点

- 风险最高的是 `core/runtime.js` 的正则插入点。插错会改变已有译文。AC4 的四个例句就是这个检查。
- 其次是 `runInstall` 的旗标分支。用阅读 diff 确认不带旗标的路径仍调用 `ensureArgvRemoteDebugging` 和 `registerSystemService`。
- 任一步异常：对该文件 `git checkout -- <file>`。词典和清单一起回滚。

## 开工前

`task.py start` 之前，`implement.jsonl` 和 `check.jsonl` 已写入规格与本目录 `research/upstream-additions.md`。用户确认本规划之后才开始改产品代码。
