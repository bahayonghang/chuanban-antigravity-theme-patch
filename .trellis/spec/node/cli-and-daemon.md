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

通道默认 `auto`：一个进程同时看 Stable 与 Insiders。`~/.antigravity-ide`、IDE 端口文件或 `~/.gemini/antigravity-ide/conversations` 已存在时，再附加 IDE 端点，不替换前两个。`user/config.json` 里的 `portFile`、`conversationsDir`、`fallbackPort` 在 `auto` 下不能把另一套挤掉；只有命令行 `--port-file` 才锁定单一端口。锁定通道只通过已有的 `--channel stable|insiders`，这两个通道不探测 IDE。不要再写一个只盯单一通道的守护进程。

## CDP 与会话指标

- 列页面只用 `http.get({ host: '127.0.0.1', port, path: '/json/list' })`。
- 注入前过滤：有 `webSocketDebuggerUrl`、不是 `devtools://`、`isAllowedOrigin`、标题不含 `Launchpad`，并且是 `type === 'page'`，或是符合 Agent 面板判定的 `iframe`。`install.mjs` 的 `verify` 使用同一判定，并在多个端口里优先选 Agent 面板。
- 会话 id 只接受 `/^[0-9a-f-]{36}$/i`。不匹配直接 `return null`，见 `parseConversationMetrics`。
- 打开会话库必须 `{ readOnly: true }`。这个补丁不写会话库。
- 指标缓存是进程内 `Map`，上限 `MAX_METRICS_CACHE_SIZE = 30`。不要把指标落到仓库或 `user/`。

## Scenario: 两个客户端同时注入

### 1. Scope / Trigger

本机可以同时跑经典版 `Antigravity.exe` 和 `Antigravity IDE.exe`。只打中其中一个，另一个会停在原生主题。

### 2. Signatures

- `resolveActiveChannelEndpoints(channelMode, userCfg)` 在 `auto` 下返回经典 Stable、Insiders（目录存在时才有响应）和 IDE 端点。
- 命令行 `getArg('--port-file')` 非空时只返回一个端点。
- `node install.mjs install --scheme auto|light|dark` 只在值精确匹配时写入配置。

### 3. Contracts

| 端点 | 端口文件 | 会话目录 |
| --- | --- | --- |
| stable | `%APPDATA%/Antigravity/DevToolsActivePort` | `~/.gemini/antigravity/conversations` |
| ide | `%APPDATA%/Antigravity IDE/DevToolsActivePort` | `~/.gemini/antigravity-ide/conversations` |

`user/config.json` 的 `portFile`、`conversationsDir`、`fallbackPort` 不参与 `auto` 的端点列表。IDE 的 argv 在 `~/.antigravity-ide/argv.json`。Antigravity IDE 1.107.0 只写这个字段不会打开 9222，必须完全退出后用 `--remote-debugging-port=9222` 启动。

Agent 面板是本机 `http:`/`https:` iframe，查询串有 `extensionView=true` 或 `hostTheme`。端口不固定，来源白名单用 `http://127.0.0.1` 前缀，不要写成 `http://127.0.0.1:9501`。

### 4. Validation & Error Matrix

- 配置 `portFile` 指向 IDE，经典版仍在跑 → `auto` 仍附加经典版端口，不报错。
- `--port-file` 指向不存在的文件 → 该轮 `/json/list` 失败，继续，不退出。
- `--scheme` 不是 `auto|light|dark` → 不写入，安装不失败。
- 9222 没有监听 → `verify` 的 `ok` 可以因别的窗口而为 true，但 IDE 面板未注入；不要把这写成代码失败。

### 5. Good/Base/Bad Cases

- Good：经典版整窗和 IDE 侧栏同时带 `data-ag-scheme`。
- Base：只有其中一个进程在听端口，另一个端点空转。
- Bad：`allowedOrigins` 只剩某一个端口，动态面板被拒。

### 6. Tests Required

仓库没有单测。`node --check core/daemon.mjs` 后，对每个在听的端口看 `/json/list`：经典版 `page` 和 IDE Agent iframe 都应出现在守护进程的 `Attached target` 日志里。

### 7. Wrong vs Correct

#### Wrong

`auto` 看到配置里的 `portFile` 就只探测那一个文件。

#### Correct

`auto` 忽略配置里的单目标字段，经典版和 IDE 各走各的默认路径。只有命令行 `--port-file` 收成一个端点。

## 反模式

- 用 `npm install`、ts-node、esbuild 或再包一层守护脚本来「修安装」。
- 把 CDP 绑到 `0.0.0.0`，或放行白名单以外的 origin。
- SQLite 导入失败时 `process.exit`，或对会话库使用默认可写连接。
- 用非 UUID 的标题、路径当 `cascadeId` 去拼 `${id}.db`。
- 为了热重载去重启 Antigravity 或守护进程。`user/` 保存后下一轮 2.5 秒 `sync` 会重建载荷。

## 参考

- `install.mjs`：`hasFlag`、`buildManifest`、`detectEnvironment`、`runInstall`、`runVerify`
- `core/daemon.mjs`：`rebuildBundleIfNeeded`、`parseConversationMetrics`、`fetchTargets`、`sync`
