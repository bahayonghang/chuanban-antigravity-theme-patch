# 暗色主题

## Goal

让 Antigravity IDE 的 Agent 面板在暗色宿主下使用这套书卷配色的暗色令牌，而不是继续被亮色预设盖住，也不是退回原生暗色。亮色预设、字体和汉化保持原样。`preset` 仍是配色轴，新增的 `scheme` 只负责明暗。

来源：仓库根目录 `暗色主题修改方案.md`。用户已授权改该方案列出的仓库文件。不改 Antigravity 安装目录，不解包 `.asar`。

## Confirmed facts

- 三套预设都是亮色。`vintage-deep` 的 `--background` 是 `#FBF9F5`（`core/theme.css:91`）。不能把它改成暗色。
- `core/runtime.js:8` 对任何子 iframe 直接 `return`。Agent 面板在带 `hostTheme` 的本机 iframe 里，所以现在收不到补丁。
- 亮色字面色带 `!important`，暗色根变量盖不住。输入框外层是 `#F7EFE6`（`core/theme.css:173`），输入卡片是 `#FFFFFF`（`core/theme.css:220`）。
- 预设选择器含 `html[data-ag-preset] body.theme-light`，特异性高于单独的 `html[data-ag-scheme="dark"]`。暗色规则必须压过这一条，否则 `body.theme-light` 仍会留下亮色变量。
- `rebuildBundleIfNeeded()` 的内容哈希（`core/daemon.mjs:266`）目前不含 `scheme`。只改这个字段不会换注入版本。
- `enabled: false` 会删 `data-ag-preset`（`core/runtime.js:134`），还没有 `data-ag-scheme`。
- `localStorage.setItem` 已监听 `theme-mode`，但回调只调用 `syncChuanbanPreset`（`core/runtime.js:319-323`）。
- 守护进程和 `verify` 都只收 `type === 'page'`（`core/daemon.mjs:868-875`，`install.mjs:329-334`）。`http://127.0.0.1` 已在来源白名单里。
- `ensureArgvRemoteDebugging('auto')` 只处理 `~/.antigravity` 和 `~/.antigravity-insiders`（`install.mjs:209-213`）。本机 IDE 的 argv 在 `~/.antigravity-ide/argv.json`。
- `auto` 通道同时探测 Stable 与 Insiders（`core/daemon.mjs:120-136`），没有 IDE 端点。`verify` 在第一个有目标的端口就停（`install.mjs` 的 `inspectLiveWindow`）。
- 安装写配置时，`--preset` 缺省且字段已存在则保留原值；字段缺失才写默认值（`install.mjs:670-673`）。已有 `user/` 文件不覆盖。
- 现有规范 `.trellis/spec/inject/index.md` 仍要求所有子 iframe 在开头返回。本任务会收窄这条，实现后必须改规范，不能让下一轮把放行改回去。

行号细节见 `research/code-anchors.md`。

## Requirements

1. `scheme` 只允许 `auto`、`light`、`dark`。缺字段、空字符串或其他值都当 `auto`。不新增第四个 `preset`，不修改三套亮色预设的色值。
2. 判定顺序固定为：配置里的 `light`/`dark`；当前 URL 的 `hostTheme=dark|light`；`body` 或 `documentElement` 的 `theme-dark` / `theme-light`；`localStorage['theme-mode']` 恰好为 `dark` 或 `light`；否则 `light`。结果写到 `data-ag-scheme`。`enabled: false` 时连同 `data-ag-preset` 一起删掉。
3. 暗色表面使用方案里的令牌：页面 `#1C1917`、正文 `#F4EFE6`、侧栏 `#24201C` / `#2E2924` / `#3A342C`、卡片 `#2A2520`、输入框外层 `#2A231E`、输入卡片 `#1F1B18`、墨色 `#E7E0D6` / `#F7F1E8` / `#F4EFE6` / `#A89888`、线条 `rgba(244, 239, 230, 0.18)`、蜡封 `#C46A58` 与 `rgba(196, 106, 88, 0.55)`。发送按钮仍是 `#D97757` 底、`#FFFFFF` 字；搜索焦点仍是 `#D97757`。已有 `--ag-wax-seal-hover` 仍能盖过蜡封色。
4. 只放行 Agent 面板 iframe：`http:` 或 `https:`，主机是 `127.0.0.1` 或 `localhost`，且查询串有 `extensionView=true` 或 `hostTheme`。Artifact / HTML 预览仍不注入。来源白名单不放宽，端口不绑到非回环地址。
5. `channel=auto` 且本机存在 Antigravity IDE 目录时，同时探测 IDE，不替换 Stable / Insiders。`stable` 和 `insiders` 的现有路径不变。不把某台机器的绝对路径写进仓库。
6. 仓库模板 `user/config.json` 增加 `"scheme": "auto"`。安装时只有显式合法 `--scheme`，或目标配置缺少合法 `scheme`，才写这个字段。已有合法值保留。已安装的其他 `user/` 文件不覆盖。
7. `SKILL.md` 写明 `scheme`、IDE 目录，以及「切换主题后若 URL 未变，重载 Agent 面板」。`AGENTS.md` 在预设白名单下写明 `scheme` 只允许 `auto`、`light`、`dark`。不新写主题消息通道。
8. 改完内核后只通过 `node install.mjs build-manifest` 更新 `core/manifest.json`。不改词典、SQLite 指标、字体安装和自启方式。

## Acceptance Criteria

- [ ] `node --check core/daemon.mjs` 与 `node --check install.mjs` 通过。`node install.mjs build-manifest` 后 `node install.mjs doctor` 的 `coreIntegrity.clean` 为 true。
- [ ] 客户端在跑且 IDE 为暗色时，`node install.mjs verify` 的 `ok` 与 `themeStyle` 为 true。`http://127.0.0.1:9501/` 上 `data-ag-scheme` 为 `dark`，`data-ag-preset` 仍是配置中的预设，页面底色为 `rgb(28, 25, 23)`。
- [ ] IDE 调成亮色并重载 Agent 面板后，`data-ag-scheme` 为 `light`。`high-contrast` 的底色为 `rgb(252, 252, 251)`。
- [ ] 暗色下面板输入框外层为 `#2A231E`，内卡为 `#1F1B18`，悬停蜡封为 `#C46A58`，侧栏文字为 `#E7E0D6`。发送按钮和搜索焦点色不变。
- [ ] Artifact 或 HTML 预览 iframe 没有 `data-ag-preset`，也没有 `data-ag-scheme`。
- [ ] 已安装 `user/config.json` 写 `"scheme": "light"` 后，约 2.5 秒内，暗色 IDE 上的面板仍是亮色。改回 `auto` 后重新跟随 `hostTheme`。
- [ ] 汉化词典仍是 450 条。代码块、终端、对话正文不被翻译。
- [ ] 没有客户端或 CDP 端口时，不把 `verify` 失败写成代码失败，只说明缺的是端口。
- [ ] 实现时切一次 IDE 主题。若 `hostTheme` 和 `data-ag-scheme` 不跟着变，`SKILL.md` 写明要重载面板，且代码里没有新的 `postMessage` 通道。

## Out of scope

- 把 `vintage-deep` 改成暗色，或增加第四个预设。
- 暗色时关闭配色、只留字体和汉化。
- 用 `user/custom.css` 压过亮色，或复制一整份暗色选择器。
- 放行全部 iframe，放宽 `allowedOrigins`，或把调试端口绑到非回环地址。
- 修改 `core/i18n.json`、SQLite 指标逻辑、字体安装、守护进程自启方式。
- 修改 Antigravity 安装目录、重签或解包 `.asar`。
- 覆盖已安装的 `user/`，或在同一版本重复安装时冲掉 `core.prev/`。
- 为实时主题切换新写消息通道。验证发现 URL 不更新时，只补文档。

## Notes

- 这是一个任务，不拆子任务。方案要求暗色令牌和 Agent iframe 放行同一次落地，验收也是同一次 `verify`。
- 技术设计在 `design.md`，执行顺序在 `implement.md`。代码锚点在 `research/code-anchors.md`。
