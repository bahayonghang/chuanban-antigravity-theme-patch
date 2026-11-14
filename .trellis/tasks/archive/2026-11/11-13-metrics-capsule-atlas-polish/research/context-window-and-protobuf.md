# Antigravity 上下文窗口与自动压缩机制验证记录

## 1. 网络公开资料验证结论

1. **模型原生窗口 vs 宿主自动压缩阈值（Compaction Clamp）**：
   - **Gemini 4 Carbon (`gemini-4-carbon`) / Gemini 4 Argon / Gemini 3.8 Flash**：模型底层原生支持统一的 **1M（`1,048,576` tokens）** 上下文窗口（输入 + 思考链 + 输出共享）；但 Google Antigravity 桌面端与 `agy` CLI 的检查点调度器（`GetCheckpointConfig`）为保障长程 Agent 延迟、缓存效率与稳定性，对 Gemini 系列默认施加了 **`256,000` tokens（`0x3e800`，即 256k）** 的自动压缩阈值（Compression / Compaction Limit）。
   - 当会话上下文逼近 256k 时，Antigravity 后台自动触发历史摘要压缩（Checkpoint Compaction），将早期消息与工具轨迹折叠为摘要，上下文回落至约 24k–32k，同时当轮隐式缓存重置。
2. **Antigravity 内是否支持手动调大或关闭 256k 自动压缩阈值**：
   - **当前版本不支持直接配置**：Antigravity 的 Settings 面板、`~/.antigravity/argv.json` 以及 `~/.gemini/antigravity/antigravity_state.pbtxt` 均未开放修改自动压缩阈值或 `--disable-auto-compact` 的用户开关（社区已有相关 Feature Request）。
   - **官方与实操可控手段**：
     - 在阶段边界主动执行 `/compact`，避免在编码中途被动触发压缩丢细节；
     - 在 CLI 使用 `/context` 查看 System Prompt / Tools / MCP / Skills 的静态占用并精简冗余插件；
     - 用子代理（`invoke_subagent` / `/teamwork`）隔离大范围代码检索，每个子代理享有独立上下文窗口；
     - 将需求与设计持久化到工作区文件（如 `.trellis/tasks/`），压缩后仍可无损按需重读；
     - 若单线程确需 >256k 未压缩上下文，可切换至当前在 Antigravity 中放宽到 **840k** 压缩线的 Claude 5.5 系列模型。

## 2. 本机 SQLite `gen_metadata` Protobuf 实证（417 个会话库扫描）

只读扫描 `~/.gemini/antigravity/conversations/*.db` 的 `gen_metadata` 表，解码 `top.get(1)`（`chat` 消息）：

- `chat.get(19)`（string）：模型标识 `modelSlug`（如 `gemini-4-carbon`、`claude-opus-5-5-high`、`claude-opus-4-6-thinking`）。
- `chat.get(21)`（string）：模型展示名 `modelLabel`（如 `Gemini 4 Carbon (High)`）。
- `chat.get(9)`（submessage）：检查点与上下文遥测：
  - `c9.get(1)`（varint）：最近一次压缩检查点对应的 `steps.idx`（未压缩时缺省）。
  - `c9.get(2)`（int64 varint）：检查点序号；未压缩时为 `-1`（无符号解码 `>= 2^63`），第 1 次压缩后为 `0`（proto3 省略 `0`，此时 `c9.has(1)` 为真），第 2 次压缩后为 `1`，依此类推。因此精确压缩次数为：`c9.has(1) ? ((c9.has(2) && c9.get(2) >= 0 ? c9.get(2) : 0) + 1) : 0`。
  - `c9.get(10)`（submessage，即 `/context` 面板同源遥测）：
    - `c10.get(1)`（varint）：预估当前上下文 token 数。
    - `c10.get(2)`（varint）：本步刚完成自动压缩时为 `2`。
    - `c10.get(3)`（submessage）：`System Prompt` / `Tools` / `Chat Messages` 分项明细。
    - **`c10.get(4)`（varint）**：**宿主当前模型实际生效的自动压缩上限（Compaction Limit）**。

### 本机实测各模型 `c10.get(4)` 与真实压缩轨迹

| 模型 (`chat[19]` / `chat[21]`) | 模型原生窗口 | 宿主自动压缩线 `c10[4]` | 本机真实会话证据 |
| :--- | :---: | :---: | :--- |
| `gemini-4-carbon` / `Gemini 4 Carbon (High)` | 1M (`1,048,576`) | **`256,000` (256k)** | 截图同源会话 `61721a71-...db`：`idx=8` 达 `246,792` 后在 `idx=9` 压缩至 `24,851`；`idx=34` 为截图时刻 `189,815` (`190k/256k, 74%`)；`idx=38` 达 `248,149` 后在 `idx=39` 第 2 次压缩至 `24,472` |
| `gemini-4-argon-trial` / `Gemini 4 Argon (Medium)` | 1M (`1,048,576`) | **`256,000` (256k)** | `a7299569-...db` 实测 `c10[4] = 256000` |
| `gemini-3.8-flash-n` / `Gemini 3.8 Flash` | 1M (`1,048,576`) | **`256,000` (256k)** | `4bb5c034-...db` 连续 8 次在 `253k–256.1k` 触发自动压缩回落至 `22k–28k` |
| `claude-opus-5-5-high` / `claude-sonnet-5-5-medium` | 1M (`1,000,000`) | **`840,000` (840k)** | `75b7596c-...db`、`a4a35ce1-...db` 实测 `c10[4] = 840000` |
| `claude-opus-4-6-thinking` / `Claude Opus 4.6` | 200k (`200,000`) | **`160,000` (160k)** | `1e1e7821-...db` 实测 `c10[4] = 160000` |

## 3. 现有补丁 `core/daemon.mjs` 的两个真实缺陷

1. **分母静态写死 `256000`，未读取 `c10[4]`**：
   - `core/daemon.mjs:240` 与 `:485` 直接用 `activeConfig.contextLimit || 256000`，导致切换到 Claude 5.5（真实压缩线 `840k`）或 Claude 4.6（真实压缩线 `160k`）时仍然错误显示 `/256k`。
   - 同时 `core/daemon.mjs:582` 使用 `Math.round(contextLimitTokens / 1000) + 'k'`，当上限 `>= 1,000,000` 时会格式化成 `1000k` 而非 `1M`。
2. **概念混淆（把「宿主自动压缩线」标成笼统的 `Ctx` 上限，且缺失「模型原生窗口」与「已压缩次数」说明）**：
   - 用户看到 Gemini 4 Carbon 显示 `Ctx 190k/256k (74%)` 时，会误以为补丁把 Gemini 4 Carbon 的模型总窗口算成了 256k，不知道 `1M` 是模型原生容量而 `256k` 是 Antigravity 的自动压缩水位线，也不知道当前会话其实已经发生过自动压缩。
