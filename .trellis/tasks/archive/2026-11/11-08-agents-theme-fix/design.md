# Agents scheme 同步设计

需求见 `prd.md`。色值和判定顺序不改，只补上「类名变了要再判一次」。

## Boundaries

只改 `core/runtime.js`。`SKILL.md` 加一句 Agents 整窗跟随类名、不必为此重载。`core/manifest.json` 只由 `build-manifest` 重写。

不改 `core/theme.css`、`core/daemon.mjs`、`install.mjs`、`core/i18n.json`、仓库 `user/`。已安装配置除验收时临时写 `scheme` 并立刻恢复外，不动。

## Why this shape

判定函数已经能从 `body.theme-dark` 得到 `dark`。故障是触发缺了：注入可能早于类名，Agents 之后只改类、不写 `theme-mode`。

不采用的做法：

- 轮询类名。规范禁止再加一套轮询，现有路径是事件。
- 把暗色 CSS 直接挂到 `body.theme-dark`。那样配置 `scheme=light` 压不住。
- 把汉化 observer 扩成监听全部属性或 `style`。它只许看 `title`、`aria-label`、`placeholder`。
- 新的 `postMessage` 通道。Agents 的信号已经在本窗口类名上。

## Observer

新句柄 `window.__ag_scheme_observer`。再次注入和 `enabled: false` 都先 `disconnect` 再清空，和 `__ag_i18n_observer` 一样。

只观察 `documentElement` 和 `body` 的 `class` 属性。回调只调用现有的 `syncChuanbanScheme()`，不重写预设，不读父窗口。

`document-start` 时 `body` 可能还不在。那时先观察 `documentElement` 的 `childList`，看到 `body` 后改观察它的 `class`，并立刻再同步一次。这个等待句柄也要能在卸载和再次注入时断开，不要留第二个长期 observer。

配置 `light` / `dark` 仍在 `resolveAgScheme()` 最前面返回。observer 不能绕过它。

不把 `color-scheme` 或单独的 `dark` 类加进判定顺序。实机暗色同时带有 `theme-dark`，现有顺序够用。

## Rollback

仓库改动用 git 回退。已安装副本再 `node install.mjs install`，或有 `core.prev/` 时 `rollback`。不删 Antigravity 安装目录里的文件。

诊断时曾在当前页调用过一次 `window.__ag_sync_preset_fn()`。那只改了内存里的属性。重载后、源码未改之前，故障会回来。
