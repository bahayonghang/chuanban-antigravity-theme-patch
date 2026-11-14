# 上游新增内容锚点

对照：`HEAD`（`dev` @ `c975bae`）与 `upstream/main` @ `9e54996`（v5.2.0，2026-11-14）。分叉点 `b319dba`（2026-11-04）。`git merge-tree --write-tree HEAD upstream/main` 在 `.gitattributes`、`SKILL.md`、`core/daemon.mjs`、`core/manifest.json`、`core/runtime.js`、`core/theme.css`、`install.mjs` 冲突。`user/config.json` 能自动合并，但会丢掉本地 `selectors`，并写入本地运行时不认识的 `coldBootHealer` / `zoomShortcuts`。因此禁止 `git merge upstream/main`。

## 词典

- 本地 `core/i18n.json` 自分叉后未改，450 条扁平字符串。
- 上游 1630 条，仍是扁平 `"英文": "中文"`，抽查无嵌套值。合入后须再查键名不含 `__proto__`、`constructor`、`toString`、`valueOf`。
- 本地运行时 `core/runtime.js:1113` 只做精确匹配加句号回退。`DICT_CI` 在上游 `core/runtime.js:1613`，不移植。

## 选择器

本地默认在 `core/runtime.js:53-61`，仓库模板又在 `user/config.json` 的 `selectors` 里整段覆盖。只改运行时默认值，新安装仍会被模板盖掉。两处都要追加，不能删已有片段。

上游放宽后的片段（只追加，分支药丸继续限制在输入框内）：

- `branchPillInBox` 追加：`[data-testid="project-branch-picker"]`、`[data-testid="project-selector-trigger"]`、`[data-testid="location-selector-trigger"]`
- `homeGreeting` 追加：`[data-testid="home-splash-content"]`
- `excludeI18n` 追加：`[data-markdown-root]`、`[data-testid="user-message-content"]`、`.agy-user-bubble`、`.monaco-editor`、`.monaco-diff-editor`、`.xterm`、`[class*="onyx-key"]`、`[data-testid="conversation-navigator-turn"]`、`.msg-body`、`#raw`、`[data-testid="swarm-raw"]`、`#swarm-title`

`core/runtime.js:968` 用 `branchPillInBox` 判断页面类型。不要改成上游那种不限定输入框的全局选择器。

## 动态模板

本地已有正则在 `core/runtime.js:1084-1101`，分发在 `1131-1179`，aria 在 `1231-1243`。这些字面量保持不动。

上游多出来、本地没有的名字（从 `upstream/main:core/runtime.js` 声明行拷贝，连同它的替换字符串）：

`RE_REL_TIME`、`RE_PCT_LEFT`、`RE_WINDOW_LIMIT_COMBINED`、`RE_WINDOW_LIMIT`、`RE_NAMED_LIMIT_RESETS`、`RE_RESETS_IN`、`RE_SEARCH_GOOGLE`、`RE_UPDATED_AT`、`RE_ARCHIVED_CONVS`、`RE_PINNED_COUNT`、`RE_MODELS_SELECTED`、`RE_BROWSER_STEPS`、`RE_MEDIA_ATTACHMENTS`、`RE_ATTACHMENTS_COUNT`、`RE_COMMENTS_COUNT`、`RE_INSTALLED_COUNT`、`RE_ACCOUNTS_COUNT`、`RE_UPDATES_COUNT`、`RE_PROJECTS_COUNT`、`RE_CALLS_MB`、`RE_TASKS_DONE`、`RE_POSTS_COUNT`、`RE_MEMBERS_COUNT`、`RE_MCP_FAILED_START`、`RE_UP_NEXT_COUNT`、`RE_USES_LOCAL_CLONE`、`RE_PLUS_ATTACHMENTS`、`RE_PLUS_MORE`、`RE_SHOW_MORE_SUBAGENTS`、`RE_SHOW_EARLIER_STEPS`、`RE_SORT_FILTER_ACTIVE`、`RE_STILL_THINKING_SEC`、`RE_MARKED_READ`、`RE_ZIPPING_FOLDER`、`RE_WORKED_FOR_UPDATES`、`RE_WAITING_CMD_SEC`、`RE_HOME_HEY_NAME`、`RE_HOME_WELCOME_NAME`、`RE_HOME_GOOD_SEE_NAME`、`RE_WORK_LOCALLY_ON`、`RE_WORK_IN_TARGET`、`RE_WORKTREE_FROM`、`RE_AUTO_FIG_WORKSPACE`、`RE_THINKING_FOR`、`RE_USING_BROWSER_SEC`、`RE_RUNNING_FOR`、`RE_KEY_QUEUES_AFTER`、`RE_KEY_SENDS_IMMEDIATELY`、`RE_KEY_EMPTY_NEXT_QUEUE`、`RE_EPHEMERAL_SUMMARY`、`RE_EPHEMERAL_COUNT_CLAUSE`、`RE_EPHEMERAL_ACTIVE`、`RE_RUNNING_CMD`、`RE_DELETED_RECORDINGS`、`RE_DELETE_RECORDINGS_CONFIRM`、`RE_ORCHESTRATOR_MODEL`、`RE_MODEL_OFFLOAD_DESC`、`RE_MODEL_REMOVED_ON`、`RE_MODEL_PERIOD_LIMIT`、`RE_QUOTA_RESET_SWITCH`、`RE_QUOTA_REACHED_SWITCH`、`RE_NEED_CREDITS_MODEL`、`RE_BASELINE_QUOTA_REFRESH`、`RE_ARIA_LOCATION`、`RE_ARIA_VERSION`、`RE_ARIA_MODEL`、`RE_ARIA_PERM_SEL`、`RE_ARIA_PERM_FIXED`、`RE_ARIA_TURN`、`RE_ARIA_GOTO_TURN`、`RE_ARIA_LOAD_OLDER`、`RE_EFFORT_SUFFIX`

插入规则：每个首字母桶里，先走本地已有判断，再走新判断。`RE_WORKED_FOR_UPDATES` 放在本地 `RE_WORKED_FOR` 之前，因为带 `· N updates` 的句子现在匹配不到本地正则。弯引号：精确匹配失败后再把 `\u2018` / `\u2019` 折成 `'` 重查一次。上游 `RE_CURLY_APOS` 在 `1611`。

## 安装器

本地入口：

- `runInstall`：`install.mjs:628`。默认目标已是 `~/.gemini/antigravity/theme-patch`（`:634-635`）。`user/` 只补缺失文件（`:679-686`）。文档复制列表不含 `CHANGELOG.md`（`:689`）。随后无条件写 argv、包装脚本和自启（`:728-744`）。
- `runRollback`：`install.mjs:800`。`core.prev` 存在就用，否则用 `backups/` 字典序最后一个名字，不校验内容。
- `runInstallFonts`：`install.mjs:867`。Windows 只复制文件并写当前用户字体注册表，没有 `AddFontResource`。
- `registerSystemService` 的 Windows 分支：`install.mjs:580-622`。Startup VBS + `HKCU\...\Run`。上游 `:967` 起改成 schtasks 优先并删除 VBS。这次不搬。

上游可搬运的块：

- `canonicalPath` / `isSameTargetPath`：`install.mjs:63-84`
- `--sync-user` 与四文件白名单覆盖：`install.mjs:1092-1154`。默认路径仍不得覆盖。本地默认循环继续复制 `user/` 里所有缺失文件，不要改成白名单。
- 自定义 `--target-dir` 跳过 argv、包装脚本、自启和 `--once`：`install.mjs:1096-1098` 与 rollback `:1283`。另需 `--register-service` 才能在自定义目录上恢复现在的全局注册。无此旗标时，默认安装路径行为不变。
- `isValidCoreBackup`：`install.mjs:1288-1297`。要求目录里同时有 `daemon.mjs` 和 `runtime.js`，并排除 `*-user`。
- Windows 字体会话广播：`install.mjs:1442-1478`。`ConvertFrom-Json` 之后用 `foreach` 摊平，避免 PowerShell 5.1 把数组包成单元素外层数组。注册表写入保留。
- `buildDistZip` 与 `pack`：`install.mjs:134` 与 `:1602`。新子命令。发行包逻辑自包含，不改现有子命令分发的语义。

`buildManifest`（`install.mjs:64-93`）继续写 `version: '5.0.0'`。哈希只由 `node install.mjs build-manifest` 生成。
