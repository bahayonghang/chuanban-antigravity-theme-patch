# 代码锚点

对照 `暗色主题修改方案.md` 与 2026-11-07 的仓库。方案里的行号若与这里差 1，以实现时的源码为准。

## 注入与明暗

- `core/runtime.js:8`：`if (window.top !== window) return;`
- `core/runtime.js:134`：卸载时删除 `data-ag-preset`。同函数还删除页面类型和蜡封属性。
- `core/runtime.js:248-297`：`syncChuanbanPreset()` 只写 `data-ag-preset`。合法预设三个，另有三个历史别名。
- `core/runtime.js:319-323`：`theme-preset-light`、`theme-mode`、`theme-color-flavor` 的 `setItem` 都会延迟调用预设同步。

## 样式

- `core/theme.css:90-154`：三套亮色预设。`vintage-deep` 与 `absoulutely-chuanban` 的 `--background` 是 `#FBF9F5`。`high-contrast` 的 `--background` 是 `#FCFCFB`。
- `core/theme.css:130`：预设选择器包含 `body.theme-light`，特异性高于单个属性选择器。
- `core/theme.css:157-168`：外框和中缝写死 `rgba(0, 0, 0, 0.35)`。
- `core/theme.css:173`：输入框外层 `#F7EFE6`。
- `core/theme.css:188-205`：蜡封淡线使用 `rgba(116, 34, 26, 0.36)`，浓线已经读 `--ag-wax-seal-hover`，默认 `#74221A`。
- `core/theme.css:220`：输入卡片 `#FFFFFF`。
- `core/theme.css:240-241`：焦点 `#D97757`。
- `core/theme.css:262-275`：发送按钮 `#D97757` / `#FFFFFF`。
- 方案点名的墨色行：296、305、428 是 `#262422`；256、326、440、466 一带是 `#0A0A0A`；215、358、365、383、389 是 `#1F1E1D`；334 是 `#7A7670`。
- 方案表没有点名、但同属近黑文字：210 `#383431`、312 `#383533`、318 `#2C2B29`、372 `#1A1A1A`。

## 守护进程

- `core/daemon.mjs:70-117`：`resolveChannelPaths()` 只认识 Stable 和 Insiders 的 argv、端口文件、会话目录。
- `core/daemon.mjs:120-136`：`auto` 返回这两个端点。显式 `--port-file` 或用户配置会短路成单端点。
- `core/daemon.mjs:204-207`：从配置读 `enabled` 和 `preset`，没有 `scheme`。
- `core/daemon.mjs:259-291`：哈希对象和 `bootPayload.config` 含 `preset`，不含 `scheme`。
- `core/daemon.mjs:636`：`isAllowedOrigin()`。
- `core/daemon.mjs:868-875`：只附着 `type === 'page'`。

## 安装器

- `install.mjs:29-36`：五项来源白名单。
- `install.mjs:148-176`：`checkSingleChannel()` 的平台端口路径。应用目录名是 `Antigravity` 或 `Antigravity - Insiders`。
- `install.mjs:209-213`：`auto` 的 argv 目录只有 `.antigravity` 和 `.antigravity-insiders`。
- `install.mjs:329-334`：`verify` 的页面过滤。
- `install.mjs:349-360`：求值结果有 `preset`，没有 `scheme` 或底色。随后第一个命中的端口会被采用。
- `install.mjs:659-675`：配置只在字段缺失或 CLI 显式传入时补 `channel` / `preset`。
- `install.mjs:720-746`：`verify` JSON 的 `ok` 和 `themeStyle`。

## 不要误改

- `core/i18n.json` 不在本任务里。词典条数验收只用来确认 iframe 放行没有拆掉排除规则。
- `user/` 复制循环不会覆盖已存在文件。给已安装配置补 `scheme` 只能走后面的字段合并。
