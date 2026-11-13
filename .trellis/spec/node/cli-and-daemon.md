# CLI、守护进程、错误与指标

## 运行时形态

两个文件都是原生 ESM，只用 `node:` 内置模块。没有 `package.json`，没有构建。

```js
import fs from 'node:fs';
```

入口用 `fileURLToPath(import.meta.url)` 取 `__dirname`。Windows 上再把路径交给别的 Node 进程时，用 `pathToFileURL`，不要把 `C:\...` 塞进裸 `import()` 字符串。包装脚本的写法在 `runInstall()` 写 `antigravity-font-daemon.mjs` 处。

文件头用简短中文注释说明不变量。不要把 `SKILL.md` 整段复制进代码。

## 参数解析

`install.mjs` 和 `core/daemon.mjs` 各自有一份本地 `hasFlag` / `getArg`，同时接受 `--flag value` 和 `--flag=value`。子命令是第一个不以 `-` 开头的参数。不要引入 commander、yargs 或第三份解析器；若两处行为要一起变，两处一起改。

现有子命令都是文件底部的 `runX()`，最后用 `subcommand` 分发。新子命令沿这个形状加，不要拆成 `commands/` 目录。

`doctor` / `verify` / `install-fonts` 的机器可读结果是 stdout 上的 JSON。硬失败走 stderr 的 `[ERROR] ...` 加 `process.exit(1)`，例如 Node 版本不够。不要把错误码塞进 JSON 的同时再 exit 一套不同语义。

## 降级，而不是崩溃

| 条件 | 实际行为 | 位置 |
|------|----------|------|
| Node `< 22` | `doctor` / `install` 拒绝并退出 | `detectEnvironment`、`runDoctor`、`runInstall` |
| `node:sqlite` 不存在或没有 `DatabaseSync` | 捕获后置 `null`，指标模块强制关闭 | `core/daemon.mjs` 顶部动态 `import`；`rebuildBundleIfNeeded` 里 `if (!DatabaseSync) modules.metrics = false` |
| 字体目录、argv 修补、CDP `/json/list` 失败 | 空 `catch` 或 resolve `[]`，继续 | `detectEnvironment`、`ensureArgvRemoteDebugging`、`fetchTargets` |
| `--safe-mode` | 不读 `user/` 四件套，只注入 `core/` | `rebuildBundleIfNeeded` 的 `userFiles` |

低版本 22.x 必须能跑主题、字体和汉化。缺 SQLite 不是安装失败。

预期内的 IO 失败用空 `catch` 吞掉并走兜底返回值。不要为了「可观测性」把字体目录不存在打成未处理异常。真正要人看到的失败只用 `console.error`，前缀保持现有的 `[ERROR]`、`[Daemon]`。

成功路径的日志也是前缀字符串，不是结构化日志库：

- `[Antigravity Daemon] Started ...`
- `[Daemon] Injected ...` / `[Daemon] Attached target: ...`
- `[Install Complete]` 后跟 JSON
- `[Uninstall] Stopped background daemon services...`

没有 log level 配置。不要加 winston / pino。

## 守护循环

`sync()` 用 `isSyncing` 防止重入。非常驻的 `--once` 跑完一轮就关 WebSocket 并 `process.exit(0)`；常驻模式 `setInterval(sync, 2500)`。热重载不是 chokidar，而是 `getFileMtimeSig()`（mtime + size）拼进 `cachedBundleSig`。

PID 锁文件是 `os.tmpdir()` 下的 `ag-theme-daemon-${pidKey}.pid`。`--once` 不加锁。已有活进程先 `SIGTERM`。清理只删「内容仍是自己 pid」的文件。

通道默认 `auto`：一个进程只看 Stable 与 Insiders。目录 `~/.antigravity-ide` 存在也不附加 IDE 端点，不写 `~/.antigravity-ide/argv.json`，不连 `%APPDATA%/Antigravity IDE/DevToolsActivePort`。`user/config.json` 里的 `portFile`、`conversationsDir`、`fallbackPort` 在 `auto` 下不能把另一套挤掉；只有命令行 `--port-file` 才锁定单一端口。锁定通道只通过已有的 `--channel stable|insiders`。不要再写一个只盯单一通道的守护进程，也不要为了打进 IDE 工作台去连 IDE 端口。

## CDP 与会话指标

- 列页面只用 `http.get({ host: '127.0.0.1', port, path: '/json/list' })`。
- 注入前过滤：有 `webSocketDebuggerUrl`、不是 `devtools://`、`isAllowedOrigin`、标题不含 `Launchpad`，并且是 `type === 'page'`，或是符合 Agent 面板判定的 `iframe`。`install.mjs` 的 `verify` 使用同一判定，并在多个端口里优先选 Agent 面板。
- 会话 id 只接受 `/^[0-9a-f-]{36}$/i`。不匹配直接 `return null`，见 `parseConversationMetrics`。
- 打开会话库必须 `{ readOnly: true }`。这个补丁不写会话库。
- `parseProto` 的 wire type `0`（varint）必须按 64 位 `BigInt` 二补数解码有符号负值（如未发生自动压缩时 `chat[9][2] = -1`），不能用浮点 `Math.pow(2, s)` 导致 53 位精度溢出。
- 动态上下文与自动压缩遥测从 `valid`（`ctx > 0 || outTok > 0` 的有效调用，跳过仅切换模型未发消息产生的尾部 `ctx = 0` 快照行）尾部回溯提取：`chat[9][10][4]` 为宿主实时自动压缩阈值（如 Gemini `256000`、Claude 5.5 `840000`、Claude 4.6 `160000`），`chat[19]` / `chat[21]` 成对取自同一有效调用以推导模型原生窗口（未知新模型不编造原生窗口）。仅当配置了 `contextLimitOverride > 0` 或非默认 `contextLimit !== 256000` 时才覆盖 SQLite 实测压缩线。
- 指标缓存是进程内 `Map`，上限 `MAX_METRICS_CACHE_SIZE = 30`。不要把指标落到仓库或 `user/`。

## Scenario: 经典版双通道，不注入 IDE

### 1. Scope / Trigger

本机可以同时跑经典版 `Antigravity.exe` 和 `Antigravity IDE.exe`。补丁只注入经典版。IDE 工作台停在原生主题是预期，不要为了「两个都打中」去连 IDE 端口。

### 2. Signatures

- `resolveActiveChannelEndpoints(channelMode, userCfg)` 在 `auto` 下只返回经典 Stable 与 Insiders。
- 命令行 `getArg('--port-file')` 非空时只返回一个端点。
- `node install.mjs install --scheme auto|light|dark` 只在值精确匹配时写入配置。

### 3. Contracts

| 端点 | 端口文件 | 会话目录 |
| --- | --- | --- |
| stable | `%APPDATA%/Antigravity/DevToolsActivePort` | `~/.gemini/antigravity/conversations` |
| insiders | `%APPDATA%/Antigravity - Insiders/DevToolsActivePort` | `~/.gemini/antigravity-insiders/conversations` |

`user/config.json` 的 `portFile`、`conversationsDir`、`fallbackPort` 不参与 `auto` 的端点列表。不要写 `~/.antigravity-ide/argv.json`。不要把 `%APPDATA%/Antigravity IDE/DevToolsActivePort` 加入 `verify` 候选或守护进程端点。

注入目标仍是经典版的 `page`，以及本机 Agent 面板 iframe。IDE 工作台也是 `page`；隔离方式是不连 IDE 端口，不是拒绝所有 `page`。

Agent 面板是本机 `http:`/`https:` iframe，查询串有 `extensionView=true` 或 `hostTheme`。端口不固定，来源白名单用 `http://127.0.0.1` 前缀，不要写成 `http://127.0.0.1:9501`。

插件全部显示 `Invalid Extensions detected` 时，先看 `~/.antigravity-ide/extensions/<id>/package.json` 是否存在。缺失是目录被删，不是 CSS。不要删除或重写 IDE 扩展目录，不要修改 IDE 安装目录。恢复一次已知删除是任务 `11-09-revert-ide-injection` 的例外，不是新的常规入口。

### 4. Validation & Error Matrix

- 配置 `portFile` 指向 IDE，经典版仍在跑 → `auto` 仍只附加经典版端口，不报错，也不去连 IDE 端口。
- `--port-file` 指向不存在的文件 → 该轮 `/json/list` 失败，继续，不退出。
- `--scheme` 不是 `auto|light|dark` → 不写入，安装不失败。
- 经典版没在听端口 → `verify` 连不上是环境缺口，不要改判定去连 IDE 端口。

### 5. Good/Base/Bad Cases

- Good：经典版整窗带 `data-ag-scheme`。IDE 工作台保持原生。
- Base：只有其中一个经典通道在听端口，另一个端点空转。
- Bad：为了让 IDE 侧栏也带主题而去连 `%APPDATA%/Antigravity IDE/DevToolsActivePort`，或把 `allowedOrigins` 收成某一个端口。

### 6. Tests Required

仓库没有单测。`node --check core/daemon.mjs` 后，对经典版在听的端口看 `/json/list`：经典版 `page` 和 Agent iframe 应出现在守护进程的 `Attached target` 日志里。不要把 IDE 端口加进验收。

### 7. Wrong vs Correct

#### Wrong

`auto` 看到 `~/.antigravity-ide` 就附加 IDE 端点，或看到配置里的 `portFile` 就只探测那一个文件。

#### Correct

`auto` 忽略配置里的单目标字段，只走 Stable 与 Insiders 的默认路径。只有命令行 `--port-file` 收成一个端点。

## 反模式

- 用 `npm install`、ts-node、esbuild 或再包一层守护脚本来「修安装」。
- 把 CDP 绑到 `0.0.0.0`，或放行白名单以外的 origin。
- SQLite 导入失败时 `process.exit`，或对会话库使用默认可写连接。
- 用非 UUID 的标题、路径当 `cascadeId` 去拼 `${id}.db`。
- 为了热重载去重启 Antigravity 或守护进程。`user/` 保存后下一轮 2.5 秒 `sync` 会重建载荷。
- 为了注入 IDE 工作台去连 `%APPDATA%/Antigravity IDE/DevToolsActivePort`，或给 `~/.antigravity-ide/argv.json` 写入调试端口。
- 插件全部 Invalid 时去改 CSS，或删除、重写 `~/.antigravity-ide/extensions` 与 IDE 安装目录。

## 参考

- `install.mjs`：`hasFlag`、`buildManifest`、`detectEnvironment`、`runInstall`、`runVerify`
- `core/daemon.mjs`：`rebuildBundleIfNeeded`、`parseConversationMetrics`、`fetchTargets`、`sync`
