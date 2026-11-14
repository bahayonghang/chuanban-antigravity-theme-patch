# 合并上游新增且不改本地行为

## Goal

把 Anarcadia `v5.2.0` 里相对本分支真正新增、且不改写本地已有行为的部分合进来。用户继续用现在的外观门控、明暗 `scheme`、字体目录、指标胶囊和「不注入 Antigravity IDE」。汉化默认仍然关闭，所以合入词典后，已安装界面在用户打开 `modules.i18n` 之前不变。

## Background

- 工作分支是 `dev`（`c975bae`）。上游是 `upstream/main`（`9e54996`，标签 `v5.2.0`）。共同祖先是 `b319dba`（2026-11-04）。
- 本地 34 个提交改的是主题、运行时、守护进程通道和 Trellis。`core/i18n.json` 自祖先以来没有本地修改。
- 整支 `git merge upstream/main` 会在 7 个文件冲突。`user/config.json` 即使自动合并，也会丢掉 `selectors`。
- 本地硬约束已经写在 `AGENTS.md`、`.trellis/spec/node/cli-and-daemon.md` 和 `.trellis/spec/inject/runtime.md`：经典版 Stable / Insiders only；预设只在 `data-ag-appearance="default"` 时挂上；`scheme` 只有 `auto|light|dark`；`fonts.ui` / `fonts.code` 使用本地 id 目录；`modules.i18n` 缺省 `false`。

## Requirements

- R1. 合入上游整份 `core/i18n.json`（1630 条扁平词条）。不加入原型键。不把 `modules.i18n` 改成 `true`。
- R2. 带入上游 `CHANGELOG.md`，文件开头标明它是上游 `v5.0.1`–`v5.2.0` 的记录，本分支没有照单实现其中的冷启动自愈、Swarm 注入、onyx 暗色替换和 schtasks 主自启。
- R3. `.gitattributes` 同时保留 Trellis 日志 `merge=union`，以及上游的 `eol=lf` 和字体二进制规则。
- R4. 汉化排除、首页问候和输入框内分支药丸只追加新选择器，不删除本地已有片段，也不把分支药丸放成全页选择器。运行时默认值和仓库 `user/config.json` 的 `selectors` 一起改。已安装目录里的 `user/` 不覆盖。
- R5. 在 `computeTextTranslation` 和 aria 翻译里追加上游有、本地没有的动态模板。本地已有正则的字面量和替换字符串保持原样。精确词典未命中时，才把弯引号折成直引号再查一次。
- R6. `install.mjs` 增加这些默认关闭或不改变默认安装路径的能力：`--sync-user`、自定义 `--target-dir` 时跳过全局 argv / 自启 / `--once`（可用 `--register-service` 恢复）、`rollback` 只接受同时含 `daemon.mjs` 与 `runtime.js` 的备份并跳过 `*-user`、Windows `install-fonts` 在现有复制和注册表写入之后做 `AddFontResource` 广播、新子命令 `pack`。
- R7. `SKILL.md` 只补上 R6 里新旗标和 `pack` 的短说明。不替换成上游技能正文。
- R8. 改过 `core/i18n.json` 或 `core/runtime.js` 后运行 `node install.mjs build-manifest`。`buildManifest()` 继续写出 `version: '5.0.0'`。不手改哈希。

## Acceptance Criteria

- AC1. `core/i18n.json` 的键数量为 1630，值都是字符串，且没有 `__proto__`、`constructor`、`toString`、`valueOf`。对应 R1。
- AC2. 仓库 `user/config.json` 的 `modules.i18n` 仍是 `false`，`scheme`、`fonts` 和原有 `selectors` 片段都还在，并包含 R4 追加的选择器。对应 R1、R4。
- AC3. `core/runtime.js` 开头仍只放行顶层窗口和本机 Agent 面板 iframe。`data-ag-appearance`、`data-ag-scheme`、字体 id 目录、指标胶囊绘制函数没有被上游版本替换。对应 R4、R5。
- AC4. 对本地已有例句，`computeTextTranslation` 的结果与改前一致：`3 files changed`、`Worked for 5s`、`Thought for 2m`、`See all (4)`。新例句 `3 MCP servers failed to start` 在词典路径之外能译出。弯引号句子只在直引号精确匹配失败时重查。对应 R5。
- AC5. 不带新旗标时，`runInstall` 仍会修补 `~/.antigravity/argv.json`、写包装脚本并调用现有的 VBS / `HKCU\...\Run` 自启。`registerSystemService` 的 Windows 分支不删除 VBS，也不改成 schtasks 优先。对应 R6。
- AC6. `node --check install.mjs`、`node --check core/runtime.js`、`node --check core/daemon.mjs` 通过。`node install.mjs build-manifest` 后 `node install.mjs doctor` 报告内核哈希一致。对应 R8。
- AC7. `core/daemon.mjs`、`core/theme.css`、`README.md` 相对任务开始时的 `HEAD` 无差异。对应范围外清单。

## Out of Scope

- `git merge upstream/main`，以及用上游文件覆盖 `core/daemon.mjs`、`core/theme.css`、`core/runtime.js`、`install.mjs`、`README.md`、`SKILL.md`。
- Swarm `plugin://swarm--` 注入、`coldBootHealer`、`zoomShortcuts`、`DICT_CI`。
- 用官方 onyx 暗色表替换本地 `data-ag-scheme` 暗色。
- 把 Windows 自启从 VBS + 注册表 Run 改成 schtasks，或在 schtasks 成功后删除现有 VBS。
- DirectWrite `opsz` / `wght` 对本地字体栈的改写。
- 指标胶囊的配色、四阶水位、中英双语和 SQLite 解析。
- 已安装 `~/.gemini/antigravity/theme-patch/user/` 的覆盖。
- 把 `buildManifest()` 的版本号改成 `5.2.0`。

## Decisions

- D1. 「不改变现有功能和实现」指保留本地主题、运行时架构、守护通道和默认安装路径。上游新增旗标、新正则和新词条可以加入。
- D2. 词典整文件采用上游。本地没有改过这个文件。汉化开关保持关闭，所以默认界面不变。
- D3. 选择器只做并集追加。分支药丸继续限定在输入框内，避免 `core/runtime.js:968` 的页面类型判断变宽。
- D4. 自定义 `--target-dir` 不再触碰本机 argv 和自启。这是该旗标的副作用收紧。不带这个旗标的安装与现在相同。需要旧副作用时用 `--register-service`。
