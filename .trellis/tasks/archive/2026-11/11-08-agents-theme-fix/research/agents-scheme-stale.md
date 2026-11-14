# Agents 窗口 scheme 停在 light

2026-11-08 实机。截图是经典版 Agents 整窗（标题栏有「打开 IDE」），不是 Antigravity IDE。

## 端点

- 经典版端口文件指向 2142。页面是 `https://127.0.0.1:2159/?settingsOpen=true&settingsScreen=General`。
- IDE 端口文件指向 9222，本次 fetch 失败。IDE 不在这次验收里。
- 已安装 `user/config.json` 的 `scheme` 是 `auto`，`preset` 是 `high-contrast`。`localStorage['theme-mode']` 为 null。只有 `theme-color-flavor=high-contrast`。

## 故障时的计算样式

`body.className` 已是 `theme-standalone dark dark-theme theme-dark`。html 的 style 含 `color-scheme: dark`。`data-ag-scheme` 仍是 `light`。

| 表面 | 背景 | 文字 |
| --- | --- | --- |
| `.agy-shell` | `rgb(18, 18, 22)` 原生暗色 | `rgb(31, 30, 29)` 亮色墨 |
| `[role=dialog]` | `rgb(252, 252, 251)` 高对比亮纸 | `rgb(31, 30, 29)` |
| 设置里的分段按钮（「默认」「高对比度」「详细 (Verbose)」「排队等待」「内置浏览器」） | `rgb(36, 37, 42)` | `rgb(31, 30, 29)`，亮度差约 0.03 |

这就是截图里设置弹窗被刷成亮纸、深色控件上的字读不清。注入版本是 `20261104-v5.0.0-stable-415ed0a0`。页面里的 `resolveAgScheme` 已经包含 `theme-dark` 判断，boot `scheme` 是 `auto`。

## 为什么判定函数没生效

`core/runtime.js:368` 只在注入时调用一次 `syncChuanbanPreset()`。之后只有 `localStorage.setItem` 写到 `theme-preset-light`、`theme-mode`、`theme-color-flavor` 才会再调（`core/runtime.js:359-362`）。Agents 改的是 body 类，不写 `theme-mode`。

`Page.addScriptToEvaluateOnNewDocument`（`core/daemon.mjs:842`）可能在 body 类写上之前就跑完。版本没变时守护进程不会再次 evaluate，所以属性停在第一次的 `light`。

在已打开的页面上调用现有的 `window.__ag_sync_preset_fn()` 后，`data-ag-scheme` 变成 `dark`，现有暗色令牌直接生效：

| 表面 | 背景 | 文字 |
| --- | --- | --- |
| `.agy-shell` / `[role=dialog]` / `.agy-sheet` | `rgb(28, 25, 23)` | `rgb(244, 239, 230)` |
| `.bg-sidebar` | `rgb(36, 32, 28)` | `rgb(244, 239, 230)` |

不需要新色值，也不需要新的 CSS 选择器。这次调用只改了当前页的属性。重载后、源码未改之前，故障会回来。不能把它当成修复。

## 不相关的表面

字体计算值已经是 Anthropic Sans / 更纱。设置里显示的 Google Sans 和 `#FFFFFF` / `#070709` 是客户端自己的外观配置，不是补丁令牌。
