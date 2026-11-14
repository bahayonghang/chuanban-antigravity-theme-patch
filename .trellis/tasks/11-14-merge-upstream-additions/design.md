# 设计：选择性搬入上游新增块

## 边界

不合并历史。以本地文件为底，按块搬入 `research/upstream-additions.md` 里点名的上游片段。

不动的行为面：

| 面 | 守住的位置 |
| --- | --- |
| 注入窗口 | `core/runtime.js:19`，只放行顶层与本机 Agent 面板 |
| 外观门控与 scheme | `data-ag-appearance`、`data-ag-scheme` 的现有写入 |
| 字体目录 | `core/runtime.js:48-52` 的两组 id |
| 汉化缺省 | `core/runtime.js:33` 的 `i18n: false`；`user/config.json` 的同字段 |
| IDE | `core/daemon.mjs` 不改，因此不会新增 IDE 端口 |
| Windows 自启 | `install.mjs:580-622` 的 VBS + Run 保持为唯一默认路径 |
| 清单版本 | `install.mjs:80` 继续写 `5.0.0` |

## 数据流

词典和 CSS 仍由守护进程读文件后放进 boot。这次不改 `core/daemon.mjs`，所以 boot 字段形状不变。新选择器要同时写进：

1. `core/runtime.js` 的 `SELECTORS` 默认对象。
2. 仓库 `user/config.json` 的 `selectors`。

守护进程用配置里的 `selectors` 覆盖默认值。只改 (1) 时，新安装仍得到旧排除列表。已安装副本不在这次复制范围内。

动态模板只在精确词典未命中后运行，顺序是：

1. `DICT[trimmed]`，再试去句号。
2. 未命中则把弯单引号折成 `'` 再做一次 1。
3. 仍未命中才进入现有首字母分发。
4. 每个字母桶先执行本地已有正则，再执行新正则。

这样 `Worked for 5s` 仍走本地 `RE_WORKED_FOR`。`Worked for 5s · 3 updates` 现在匹配不到本地正则，新的 `RE_WORKED_FOR_UPDATES` 必须写在它前面才能吃到，并且不得放宽本地那条正则。

## 安装器契约

默认 `node install.mjs install`：

- 目标目录算法不变（`install.mjs:634-635`）。
- `user/` 仍是「目标没有该文件才复制」。
- 然后照旧写 argv、包装脚本、VBS 自启，并 `--once`。
- 文档复制列表加上 `CHANGELOG.md`。有文件才复制，与现有 `SKILL.md` / `README.md` 相同。

`--sync-user`：

- 先把已有 `user/` 拷到 `backups/<timestamp>-user/`。
- 再覆盖那四个模板：`config.json`、`custom.css`、`i18n.override.json`、`custom.js`。
- 不删除用户多出来的文件。
- 不带此旗标时，覆盖循环不执行。

自定义 `--target-dir` 且路径与默认安装目录不同，并且没有 `--register-service`：

- 仍复制 `core/` 和缺失的 `user/`。
- 跳过 `ensureArgvRemoteDebugging`、包装脚本、`registerSystemService` 和针对本机服务的 `--once`。
- `doctor` / `verify` / `rollback` / `uninstall` 在同一条件下也不要停或改本机服务。
- `--register-service` 时恢复现在的全局注册行为。

`rollback`：

- `core.prev` 必须同时含 `daemon.mjs` 和 `runtime.js` 才采用。
- `backups/` 跳过以 `-user` 结尾的目录，其余同样做这两个文件的校验。
- 找到的合法备份仍整目录覆盖 `core/`。合法 `core.prev` 的成功路径与现在相同。

`install-fonts`：

- 保留复制和 `HKCU\...\Fonts` 注册表写入。
- Windows 上在此之后用 PowerShell 调用 `AddFontResource` 和 `SendNotifyMessage`。
- JSON 数组用 `foreach` 摊平后再枚举，避免 Windows PowerShell 5.1 把数组包成一层外层数组。
- 广播失败只影响新增的 `fontRegisteredCount` / `fontBroadcastOk`，不让整个命令失败，已复制的字体仍然算安装成功。

`pack`：

- 新子命令，调用从上游搬来的 `buildDistZip`。
- 不参与 `install` / `doctor` / `verify`。

## 取舍

- 不搬 schtasks 主自启。上游会在注册成功后删除 VBS 和 Run 键，这会换掉本机现在的启动方式。规格要求杀毒软件拦截 VBS 时才改用任务计划程序，而不是替换默认路径。
- 不搬 `DICT_CI`。大小写不敏感会让现在故意留在英文的不同大小写句子被译掉。
- 不把分支药丸改成全局选择器。那会改变 `runtime.js:968` 的页面类型。
- 词典整文件替换会改变「汉化打开之后」已有 450 条的中文措辞。默认开关是关的，所以未打开汉化时界面不变。这是相对「只追加新键」的选择，因为本地词条没有私人修改，上游精校就是要替换这些值。

## 回滚

改动都在 git 工作区。合入不合预期时 `git checkout -- <file>` 即可回到 `c975bae` 的对应文件。`build-manifest` 只重写 `core/manifest.json` 的哈希。不要在这次任务里执行会改本机已安装 `user/` 的 `install --sync-user`。

## 验证不到的部分

仓库没有单测。`doctor` 只证明哈希和命令可运行。选择器和动态模板要在开着的 Antigravity 里看界面。客户端没开时，验收停在 `node --check` 和 `doctor`，并写明没有做 `verify`。
