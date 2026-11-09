# Agents 窗口跟随暗色

## Goal

Antigravity Agents 整窗切到暗色后，补丁要跟上已有的 `scheme=auto` 判定，使用现有暗色令牌。不要继续把亮色墨水和亮纸盖在原生暗色表面上。

用户价值：设置弹窗和主壳在暗色下可读，并且和上一轮 IDE Agent 面板用的是同一套书卷暗色，而不是原生冷灰，也不是亮色预设。

## Confirmed facts

- 截图是经典版 Agents 整窗，端口 2142，不是 IDE。IDE 的 9222 这次没有响应。
- 已安装配置 `scheme` 为 `auto`。页面 boot 也是 `auto`。body 已有 `theme-dark`，html 有 `color-scheme: dark`，但 `data-ag-scheme` 停在 `light`。
- Agents 不写 `localStorage['theme-mode']`。现有同步只在注入时和三个 localStorage 键写入时发生（`core/runtime.js:359-362`、`core/runtime.js:368`）。类名变化没有监听。
- 判定函数本身是对的。故障页上手动调用现有同步后，`data-ag-scheme` 变为 `dark`，壳和设置弹窗底色为 `rgb(28, 25, 23)`，侧栏为 `rgb(36, 32, 28)`，文字为 `rgb(244, 239, 230)`。暗色 CSS 不用改。
- 配置里的 `light` / `dark` 仍必须压过页面类名。这是上一轮契约，本次不改顺序。
- 证据在 `research/agents-scheme-stale.md`。

## Requirements

1. `scheme=auto` 时，Agents 整窗在 body 或 documentElement 出现或改成 `theme-dark` / `theme-light` 之后，必须重新走现有判定，并更新 `data-ag-scheme`。不依赖用户重载，也不依赖 `localStorage['theme-mode']`。
2. 注入发生在 body 还不存在、或类名尚未写上时，类名稍后出现也要补上同一次判定。不要新开轮询。
3. 配置 `scheme` 为 `light` 或 `dark` 时，类名变化不能把强制值改掉。`enabled: false` 仍删除 `data-ag-scheme`，并断开新句柄。再次注入不得叠多个 observer。
4. 暗色外观继续用上一轮令牌。不新增色值，不复制一套暗色选择器，不改三套亮色预设。
5. 不放宽 iframe 白名单，不新写主题消息通道。IDE 面板 URL 的 `hostTheme` 不更新时，仍按现有说明重载面板。
6. `SKILL.md` 写明：Agents 整窗跟随 `theme-dark` / `theme-light` 类，不需要为这次同步重载窗口。IDE 的重载说明保留。

## Acceptance Criteria

- [ ] `node --check core/runtime.js` 通过。改过内核后 `node install.mjs build-manifest`，再 `node install.mjs doctor`，`coreIntegrity.clean` 为 true。
- [ ] Agents 已是暗色并完成注入后，不手动调用同步函数，`data-ag-scheme` 为 `dark`。`.agy-shell` 与设置弹窗底色为 `rgb(28, 25, 23)`，侧栏为 `rgb(36, 32, 28)`，文字为 `rgb(244, 239, 230)`。设置里「默认」「高对比度」一类控件不再是深底深字。
- [ ] 在 Agents 外观设置里切换明暗后，`data-ag-scheme` 跟着变，不需要重载窗口。切回暗色后底色仍是 `rgb(28, 25, 23)`。
- [ ] 已安装配置临时写成 `"scheme": "light"` 时，暗色 Agents 仍保持亮色；测完把该字段恢复为 `auto`。
- [ ] `enabled: false` 的卸载路径仍删除 `data-ag-scheme`。词典仍是 450 条。没有新的 `postMessage` 通道，Artifact / HTML 预览 iframe 仍不注入。
- [ ] IDE 没开或 9222 连不上时，不把这记成代码失败。开着则现有 `hostTheme` 行为不变。

## Out of scope

- 改暗色令牌、亮色预设，或为 Agents 再写一套选择器。
- 改设置里显示的 Google Sans 和原生取色值。那是客户端自己的外观配置。
- 为 IDE 实时主题新写消息通道，或放宽来源白名单。
- 改 `core/i18n.json`、指标、字体安装、守护进程端点发现。
- 覆盖已安装 `user/`，或把本机配置提交进仓库。
