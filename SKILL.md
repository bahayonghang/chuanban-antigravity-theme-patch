---
name: chuanban-antigravity-theme-patch
description: 船板的 Antigravity 2.0 主题、字体与深度汉化全栈成品补丁包（v5.3.0 模块化架构 · 适配 Antigravity 2.32.1 / 2.32.0 macOS + Windows 双平台全栈演进 + 冷启动兜底包零流量安全自愈 + Swarm 协作面板跨域子帧同步 + 原生幕布与标题栏底色桥接 + WSL 会话遥测 0-I/O 熔断兼容 + 昼夜双模式独立解耦 + 1740条母语级去机翻零冲突词典与弯引号/DICT_CI 兜底 + SQLite O(1) 增量与子 Agent 血缘遥测）。采用「core/ 只读黄金内核 + user/ 永不覆盖改装层 + install.mjs 一键生命周期 CLI」，支持对方 Agent 零代码生成一键部署、2.5 秒热重载二次定制与 --safe-mode 沙箱排障。当用户提到“安装船板 Antigravity 主题”、“升级/修复 Antigravity 汉化与字体”、“定制 Antigravity 界面样式或汉化词条”时触发。
---

# 船板的 Antigravity 主题、字体与深度汉化全栈成品补丁（v5.3.0 · 昼夜双模式解耦 & Antigravity 2.32.1 适配）

> **前置概括（致用户与执行端 AI Agent）**：
> - **设计目的**：以纯运行时 CDP 非侵入式注入，为 Google Antigravity 提供**白天/黑夜双模式物理隔离**：
>   - **白天模式（`body:not(.dark)`）**：提供三套 Anthropic 暖纸护眼配色预设（默认高对比暖白）与输入框「古朴暗红蜡封」三态交互；
>   - **黑夜模式（`body.dark`）**：当点击客户端「深色 / Dark」按钮（或跟随系统深色）切换时，**100% 保持四层字体排版与 UI 几何形状（`1.5px` 三态边框厚度、单圈搜索聚焦、指标胶囊布局）不变**，同时 `0ms` 还原 Antigravity `2.30.0 ~ 2.32.1` 原版无补丁时的官方 `onyx` Default Dark 碳黑配色方案（`#070708` 主背景 / `#111114` 侧栏 / `#15151A` 悬浮输入卡 / `#2F71E3` 官方品牌蓝），自动关闭深色下发乌的黑色润墨阴影并专项提升深色文字对比度与边界可见性；
>   - **全局共享能力**：四层中西文精密排版（`Anthropic` 官方字体族 + `Sarasa` 更纱黑体超集，完美适配 `2.32.1` `[data-markdown-root]`、`.pdf-sdk-root`、`--sdk-font-family`、`data-agy-font`、Lexical 输入框、`plugin://swarm--` 蜂群协作子帧及 Windows `DirectWrite` 可变字体 `wght/opsz` 全字重轴）、1,740 条全界面母语级去机翻汉化（内置弯引号自动归一化与 `DICT_CI` 首字母大写不敏感兜底，完整覆盖 `2.32.1` / `2.32.0` Swarm 协作面板与纪要员视图、MCP 工具卡片、Markdown 表格工具栏与内嵌跳转胶囊、自动化与协调器、运行环境与 Worktree/WSL/SSH 切换、授权码登录兜底与 GitHub 远程克隆、插件市场、归档筛选、队列快捷键及 `[contenteditable="true"]` 无障碍属性）、冷启动内嵌兜底包漂移零流量安全自愈，以及基于 SQLite `O(1)` 增量游标的同行实时会话指标胶囊（原生支持本地与 Windows WSL 会话库懒探测及 `0-I/O` 熔断保护，`tok/s · TTFT/Hold · 动态模型上下文水位 256k/840k/1M+ · Out · +N sub` 子 Agent/蜂群聚合汇总，内置 `4,096` 节点缓存、冷启动按 `mtime` 降序分片建索与 `SQLITE_BUSY` 隔离保护）。
> - **v5.3.0 核心执行铁律**：
>   1. **Agent 一键部署，内核已预封装无需构建**：全部样式、词典、DOM 引擎与守护进程已封装在 `core/` 只读黄金内核中，**严禁 Agent 从头手写或重生成守护代码**，直接运行 `node install.mjs` 即可 3 秒完成部署；
>   2. **个性化修改永远只在 `user/` 改装层进行（2.5 秒可逆热重载）**：`user/` 目录在升级时 100% 永不覆盖，保存后 2.5 秒自动热更新生效。

---

> **本分支兼容约定**：已合入上游 v5.3.0，并保留英文默认（`modules.i18n=false`）、独立字体目录（默认文源宋体 / MapleBright）、`scheme` 与默认外观门控。默认外观继续使用本分支 Anthropic 暖色全壳层；非默认外观让出主题配色。下文上游的原版 onyx 暗色说明以此处约定为准。

## 一、核心资源链接与三端官方入口

1. **Google Drive 完全资源包（全项目成品包 + 全套商业/开源字体库）**
   - 链接：<https://drive.google.com/drive/folders/1NX92SgVUqtSjWg6bt6sIJXy-cn7J_boC>
   - 包含：**v5.3.0 完整项目成品包 + 全套必备字体包（Anthropic 官方字体族 `Anthropic Sans` / `Anthropic Serif` / `Anthropic Mono` + 更纱黑体 `Sarasa-SuperTTC.ttc` 超集）**。
   - *备用字体获取渠道*：若大文件 `Sarasa-SuperTTC.ttc`（~791 MB）偶发触发 Google Drive 24 小时下载配额限制，macOS 可直接执行 `brew install --cask font-sarasa-gothic`，Windows / Linux 可从官方开源仓库 [`be5invis/Sarasa-Gothic` GitHub Releases](https://github.com/be5invis/Sarasa-Gothic/releases) 获取同款 `Sarasa-SuperTTC.ttc`。
2. **GitHub 权威代码库（成品补丁仓库与 `SKILL.md` 本体）**
   - 仓库：<https://github.com/Anarcadia/chuanban-antigravity-theme-patch>
   - 包含：全部 `core/` 黄金内核、`user/` 改装模板、`install.mjs` CLI 与本 `SKILL.md`（字体文件请从上方 Google Drive 链接下载）。
3. **Notion 引导主页**
   - 链接：<https://chuanban.notion.site/chuanban-antigravity-theme-patch-db7c5846f37546be9481cd791aed0554>

### 实机样式基准参考
- **三栏对话与工件视图（高对比暖白 + 暗红蜡封 + 同行实时指标胶囊）**：[`assets/preview-workspace-chat-and-artifact.png`](assets/preview-workspace-chat-and-artifact.png)
- **新建对话首页视图（全界面汉化 + 首页蜡封聚焦态）**：[`assets/preview-home-new-conversation.png`](assets/preview-home-new-conversation.png)

---

## 二、Node.js 动态分级兼容策略

守护进程（`core/daemon.mjs`）内置**运行时环境动态分级**，绝不因 Node 小版本差异崩溃或无限重启：

| 运行时版本 | 昼夜双模式主题 / 蜡封三态 / 四层字体 | 1,740 条深度汉化 + 原型安全词典 | 死锁/冷启动自愈 + 缩放快捷键修复 | SQLite 实时会话指标胶囊 (`node:sqlite`) |
| :--- | :---: | :---: | :---: | :---: |
| **Node.js `>= 22.13.0`**（推荐完全体） | ✅ 全量启用 | ✅ 全量启用 | ✅ 全量启用 | ✅ **自动动态解锁**（精确显示生成速度、耗时、上下文窗口与缓存命中率） |
| **Node.js `22.0.0 ~ 22.12.x`** | ✅ 全量启用 | ✅ 全量启用 | ✅ 全量启用 | ⚠️ 自动优雅降级关闭（无需 `--experimental-sqlite` 标志，后台零报错） |
| **Node.js `< 22.0.0`** | ❌ `install.mjs` 拦截提示 | ❌ 需升级至 Node 22+ | — | — |

---

## 三、架构总览：`core/` 只读黄金内核 + `user/` 无损改装层

安装后运行时部署于 `~/.gemini/antigravity/theme-patch/`（macOS / Linux）或 `%USERPROFILE%\.gemini\antigravity\theme-patch\`（Windows）：

```text
chuanban-antigravity-theme-patch/
├── install.mjs                 # 跨平台一键生命周期 CLI（install / install-fonts / doctor / verify / rollback / uninstall / pack）
├── SKILL.md                    # 面向 AI Agent 的极简部署与二次改装指南（本文件）
├── README.md                   # 面向用户的项目说明与快速上手指南
├── CHANGELOG.md                # 历次版本演进与双平台修复记录
├── core/                       # 【只读黄金内核】随版本升级整包原子替换，对方 Agent 严禁直接修改
│   ├── manifest.json           # 版本号（5.3.0）、三端地址与 core/* 文件 SHA-256 校验清单
│   ├── daemon.mjs              # Node CDP 守护进程（SQLite O(1) 增量遥测、子 Agent `+N sub` 聚合与冷启动分片保护、WSL 懒探测与 0-I/O 熔断、Swarm 跨域子帧注入、冷启动重载绑定、2.5s 热重载感知）
│   ├── runtime.js              # 浏览器端注入引擎（昼夜模式与 curtainView/标题栏底色联动、冷启动兜底包安全自愈、弯引号与 DICT_CI 兜底索引、防双倍缩放保护）
│   ├── theme.css               # 四段式 CSS 样式表（Part I 共享排版与几何 / Part II 白天暖纸 / Part III 独立黑夜 / Part IV 指标胶囊）
│   └── i18n.json               # 1,740 条严格零冲突标准 JSON 基准词典（兼容 PowerShell ConvertFrom-Json，挂载至 Object.create(null)）
└── user/                       # 【用户改装层】升级时 100% 永不覆盖，守护进程每 2.5s 自动检测 mtimeMs 热重载注入！
    ├── config.json             # 开关配置（enabled / channel / preset / scheme / fonts / modules(或 features) / themeVars 变量覆盖）
    ├── custom.css              # 用户/对方 Agent 自定义追加 CSS（独立挂载于 #antigravity-user-custom-style）
    ├── i18n.override.json      # 用户自定义词条覆盖或新增（支持扁平键值对或 "exact": { ... }，优先级高于 core/i18n.json）
    └── custom.js               # 开放的前端自定义 JS 钩子（支持 ctx.onCleanup(fn) 热重载自动清理）
```

---

## 四、AI Agent 标准部署流程（3 步极简闭环）

当用户要求安装或更新本补丁时，请按顺序执行以下 3 步：

### Step 1：环境与字体前置检查
```bash
node install.mjs doctor
```
- **若缺少字体**：引导用户从 [Google Drive 完全资源包](https://drive.google.com/drive/folders/1NX92SgVUqtSjWg6bt6sIJXy-cn7J_boC) 下载字体包并安装（macOS: `~/Library/Fonts/`；Windows: 运行 `node install.mjs install-fonts --from <解压目录>`；Linux: `~/.local/share/fonts/`；若 `Sarasa-SuperTTC.ttc` 遇 Google Drive 限流，macOS 可用 `brew install --cask font-sarasa-gothic`，Windows/Linux 可用 [`be5invis/Sarasa-Gothic` Releases](https://github.com/be5invis/Sarasa-Gothic/releases)）。

### Step 2：一键安装并注册守护服务
```bash
# 默认安装（channel="auto"，单守护进程同时自动兼容并守护 Stable 正式版与 Insiders 预览版窗口）
node install.mjs install

# 若需强制锁定只监听单一通道，可显式指定 --channel stable 或 --channel insiders
node install.mjs install --channel stable

# （仅限调试或需重置模板时）先自动备份旧 user/ 至 backups/<timestamp>-user/，再同步最新 user/ 模板
node install.mjs install --sync-user
```
`install.mjs install` 会自动完成：
1. 生成并校验 `core/manifest.json` SHA-256 完整性；
2. 当检测到已安装的 `core/` 与新版本哈希不同时，自动将旧版备份至 `~/.gemini/antigravity/theme-patch/backups/<timestamp>/` 与 `core.prev/`（重复安装同一版本不会冲掉上一版快照）；
3. 原子更新 `core/` 内核，**初始化或无损保留已有的 `user/` 改装文件**；
4. 自动检查并修补 `~/.antigravity/argv.json` 与 `~/.antigravity-insiders/argv.json`（注入 `"remote-debugging-port": 9222`）。不要探测 Antigravity IDE，也不要写 `~/.antigravity-ide/argv.json`；
5. 自动生成 `~/.gemini/antigravity/scripts/antigravity-font-daemon.mjs` 兼容包装入口，并注册/更新系统后台自启服务（macOS `LaunchAgent` / Linux `systemd --user` / Windows Startup VBS）。

上面的默认 `install` 路径不变。另外几个旗标默认关闭：

- `--sync-user`：先把已有 `user/` 备份到 `backups/<时间戳>-user/`，再覆盖 `config.json`、`custom.css`、`i18n.override.json`、`custom.js`。不带此旗标时，已有 `user/` 文件仍然不覆盖。
- `--target-dir <dir>` 不是默认安装目录，且没有 `--register-service` 时，只复制文件，不改 `argv.json`、不写包装脚本、不注册自启，也不对本机正在运行的服务执行 `--once`。同一条件下 `doctor` / `verify` / `rollback` / `uninstall` 也不停、不改本机服务。需要恢复全局注册时加上 `--register-service`。
- `rollback` 只采用同时包含 `daemon.mjs` 与 `runtime.js` 的备份，并跳过名字以 `-user` 结尾的目录。
- `node install.mjs pack` 生成发行 zip。
- Windows 上 `install-fonts` 在复制文件并写入注册表之后广播 `AddFontResource`。广播失败不改变 `ok: true`。

### Step 3：CDP 实机注入验收
```bash
node install.mjs verify
```
当终端输出 `"ok": true` 且显示 `"version": "20261115-v5.3.0-..."`、`"bodyReady": true`、`"themeStyle": true`、`"themeMode": "light" | "dark"` 时，即代表昼夜双模式主题、字体、汉化与指标胶囊已 100% 注入成功。

---

## 五、对方 Agent 如何协助用户做个性化改装与 Debug？

**黄金铁律**：永远在 `~/.gemini/antigravity/theme-patch/user/` 目录下修改，**无需重启守护进程或 Antigravity**（`core/daemon.mjs` 每 2.5 秒自动感知 `user/*` 文件的 `mtimeMs` 变化并热更新到所有打开的窗口）。

### 1. 修改色彩预设、字号变量或模块开关（编辑 `user/config.json`）
```json
{
  "enabled": true,
  "channel": "auto",
  "preset": "high-contrast",
  "scheme": "auto",
  "contextLimit": 256000,
  "fonts": {
    "ui": "wenyuan-serif",
    "code": "maple-bright"
  },
  "modules": {
    "i18n": false,
    "metrics": true,
    "composerWaxSeal": true,
    "deadlockHealer": true,
    "coldBootHealer": true,
    "zoomShortcuts": true,
    "customCss": true,
    "customJs": true
  },
  "themeVars": {
    "--ag-chat-font-size": "16px",
    "--ag-wax-seal-hover": "#74221A",
    "--ag-dark-wax-seal-hover": "rgba(47, 113, 227, 0.72)"
  }
}
```
- **`preset`**：支持 `"high-contrast"`（默认高对比暖白）、`"claude-desktop-purewhite"`（ClaudeDesktop 净白）、`"vintage-deep"`（复古深色羊皮纸），修改保存后 2.5 秒内自动热切换。三套都是亮色，不要把 `vintage-deep` 改成暗色。**仅对客户端默认外观（`Default Light` / `Default Dark`）生效**：当用户在 Settings → Appearance 切换到非默认主题（如 `Everforest`、`Dracula`、`Catppuccin`、`Legacy Dark` 或自定义拾色）时，补丁会 0ms 自动置 `<html data-ag-appearance="custom">` 并移除 `data-ag-preset`，100% 让出全部主题色彩与蜡封样式，同时继续保留自定义字体、自适应主题配色的实时指标胶囊、汉化与路由修复等非配色增强模块；切回 `Default Light` / `Default Dark` 即刻恢复全壳层（顶栏 + 左栏 + 顶部 Tab/分栏栏 + 内嵌卡片）船板暖色皮肤。
- **`scheme`**：只允许 `"auto"`、`"light"`、`"dark"`。`auto` 跟随 Agent 面板 URL 的 `hostTheme`，没有这个参数时再看 `theme-dark` / `theme-light` 和 `localStorage` 的 `theme-mode`，最后回退亮色。`light` 或 `dark` 强制该模式，约 2.5 秒热切换。Agents 整窗跟随 `theme-dark` / `theme-light` 类变化，不必为此重载窗口。切换主题后，若面板 URL 里的 `hostTheme` 没变，重载 Agent 面板即可；不要为此另写消息通道。`channel=auto` 只探测 Stable 与 Insiders，不探测 Antigravity IDE，不连 `%APPDATA%/Antigravity IDE/DevToolsActivePort`，不写 `~/.antigravity-ide/argv.json`。
- **`fonts`**：`ui` 只允许 `wenyuan-serif`（默认，家族名 `WenYuan Serif SC`）、`wenyuan-sans`、`anthropic`、`system`。`code` 只允许 `maple-bright`（默认，家族名 `MapleBright`）、`maple-mono`、`anthropic`、`sarasa`。缺字段、空字符串或其他值分别回到这两个默认 id，安装不会因此失败。外观字体覆盖界面控件和对话正文；代码字体覆盖代码、终端、文件名和输入框。Antigravity 原生字体下拉（System UI / Inter / Google Sans）不控制补丁字体。
- **`modules`（亦兼容别名 `features`，其中 `metrics` 兼容别名 `metricsCapsule`）**：支持单独开关任意子模块。`i18n` 默认 `false`。若将顶层 `"enabled": false` 保存，页面将在 2.5 秒内无损卸载全部样式并将已汉化的界面文字还原为英文原貌。
- **`themeVars`**：任何 CSS 变量键值都会自动挂载到 `document.documentElement`（`<html>` 根节点），删除键时自动清理。

### 2. 追加或微调界面 CSS（编辑 `user/custom.css`）
直接编写标准原生 CSS（**零反斜杠转义**），保存后 2.5 秒内自动在页面独立 `<style id="antigravity-user-custom-style">` 节点热生效（排在 `#ag-user-theme-vars` 之后，拥有最高覆盖优先级）。若只针对白天或黑夜微调，请分别加上 `body:not(.dark)` 或 `body.dark` 前缀。

### 3. 覆盖或新增汉化词条（编辑 `user/i18n.override.json`）
支持直接写入扁平键值对 `"英文原词": "自定义中文"`（或包裹在 `"exact": { ... }` 对象中）。由于运行时内置 `WeakMap` 原始英文文本追踪，**无论新增、修改还是删除覆盖词条，保存后 2.5 秒内页面上已渲染的文字都会实时热更新或还原**！

### 4. 编写前端自定义 JS 扩展（编辑 `user/custom.js`）
脚本在独立 `try/catch` 沙箱中执行，可直接访问入参 `ctx`（或同义入参 `boot`）：
- `ctx.version`、`ctx.preset`、`ctx.config`、`ctx.modules`、`ctx.themeVars`、`ctx.dict`、`ctx.metrics`、`ctx.syncPreset()`、`ctx.ensureMetricsPill(true)`、`ctx.onCleanup(fn)`（注册清理回调，在下一轮热重载或卸载前自动执行）。

### 5. 故障隔离、一键回滚与彻底卸载（Safe Mode / Rollback / Uninstall）
```bash
# 启用安全模式：彻底绕过 user/ 层，仅注入纯净 core/ 黄金内核以定位问题
node install.mjs verify --safe-mode

# 查看所有模块的 SHA-256 校验与守护进程状态
node install.mjs doctor

# 一键回滚到上一次自动备份的快照版本并立即重新注入
node install.mjs rollback

# 彻底卸载：先停止守护进程与开机自启服务，再即时还原当前打开窗口的原始样式与英文界面（保留 user/ 配置）
node install.mjs uninstall
```

---

## 六、Windows (`win32`) 平台 Agent 适配与排障专章（最后一公里）

本项目的 `core/` 黄金内核与 `install.mjs` 已原生支持 Windows 平台（含 `pathToFileURL` 反斜杠转换、`127.0.0.1:9222/9223` 端口自动兜底、UTF-16LE 中文用户名 VBS 兼容、单一权威 `schtasks` 计划任务自启、SQLite `O(1)` 增量只读缓存、ClearType 去重影与 `Ctrl + -/=/0` 缩放）。**Windows 端的 AI Agent 严禁从头手写重写 `core/` 代码**，只需协助处理以下「最后一公里」事项：

1. **Windows 字体安装与 DirectWrite 注册表写入（必检）**：
   - 在 Windows 10/11 下，单纯用 `copy` 将 `.ttf/.otf` 复制到 `%LOCALAPPDATA%\Microsoft\Windows\Fonts` 不会写入注册表，导致 Chromium `local()` 找不到字体。下载解压字体目录后，请直接运行内置命令：
     ```bash
     node install.mjs install-fonts --from "C:\path\to\extracted-fonts"
     ```
   - 复制和当前用户字体注册表写入之后，会再广播一次 `AddFontResource`。这一步失败只影响新增的广播字段，已经复制的字体仍然算安装成功。
2. **首次开启 CDP 端口 (`9222`) 后的客户端重启**：
   - `node install.mjs install` 会自动在 `%USERPROFILE%\.antigravity\argv.json` 与 Insiders 对应文件中注入 `"remote-debugging-port": 9222`。不要给 `%USERPROFILE%\.antigravity-ide\argv.json` 写入调试端口，也不要用 `--remote-debugging-port=9222` 启动 `Antigravity IDE.exe`。
   - Antigravity IDE 显示 `Invalid Extensions detected` 时，先看 `%USERPROFILE%\.antigravity-ide\extensions\<id>\package.json` 是否存在。缺失是目录被删，不是 CSS。不要删除或重写扩展目录，也不要改 IDE 安装目录。
   - Agent 面板端口不固定，来源白名单保持 `http://127.0.0.1` 这一前缀，不要写成某一个端口。
   - 若安装前 Antigravity 已经处于打开状态，首次修补 `argv.json` 后需引导用户**完全退出并重新打开一次 Antigravity**（或帮用户在 Antigravity 桌面快捷方式 `.lnk` 的目标末尾追加 `--remote-debugging-port=9222`），之后 `node install.mjs verify` 即可自动连通 `DevToolsActivePort` 或 `127.0.0.1:9222`。
3. **第三方安全软件拦截 `.vbs` 自启时的备选方案**：
   - 若用户安装了拦截 `wscript.exe` 的第三方杀毒软件，Agent 可直接用 Windows 任务计划程序注册原生 `node.exe` 登录自启：
     ```powershell
     schtasks /create /tn "AntigravityThemeDaemon" /sc onlogon /tr "\"$env:ProgramFiles\nodejs\node.exe\" --disable-warning=ExperimentalWarning \"$HOME\.gemini\antigravity\scripts\antigravity-font-daemon.mjs\"" /f
     ```
