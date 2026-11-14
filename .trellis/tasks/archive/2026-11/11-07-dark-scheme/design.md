# 暗色主题设计

需求见 `prd.md`。本文只记录实现必须遵守的技术决定。色值以 `暗色主题修改方案.md` 的令牌表为准，不在这里再抄一遍。

## Boundaries

改这些仓库文件：`core/theme.css`、`core/runtime.js`、`core/daemon.mjs`、`install.mjs`、`user/config.json`、`SKILL.md`、`AGENTS.md`。`core/manifest.json` 只由 `build-manifest` 重写。

不新增源码文件，不新增 npm 依赖，不抽公共包。浏览器 IIFE 和两个 Node 入口不能共享模块；Agent 面板判定在三处各写一份，条件必须一致，并用一行注释指向同一不变量。

实现后更新 `.trellis/spec/inject/index.md` 的质量检查：子 iframe 不再无条件返回，只有非 Agent 面板的子 iframe 返回。同步 `inject/quality.md`、`inject/theme-and-i18n.md` 和 `node/boundaries.md` 里会被这条改动打脸的句子。这是收尾，不是新功能。

## Scheme contract

Node 和浏览器都只认精确字符串 `auto`、`light`、`dark`。

- 守护进程读 `user/config.json`。缺字段、空字符串、非字符串或其他值都变成 `auto`，再放进 `bootPayload.scheme` 和 `bootPayload.config.scheme`。
- 内容哈希现有对象加上 `scheme`。`BASE_VERSION` 仍是 `20261104-v5.0.0`，不另造版本常量。
- 浏览器在现在的预设同步里同时写 `data-ag-scheme`。`theme-mode` 的 `setItem` 钩子继续走这个函数，不另开轮询。
- 判定顺序按 PRD。`theme-mode` 只在值正好是 `dark` 或 `light` 时采用。不读父窗口，不猜测别的存储值。
- `enabled: false` 的现有卸载分支删掉 `data-ag-scheme`。

安装器沿用 `--preset` 的字段规则。`--scheme` 只有精确三值才写入；非法值不落盘，也不让整个 `install` 失败。目标配置没有合法 `scheme` 时写 `auto`。已有合法值，且命令行没给 `--scheme`，就保留。

## Dark tokens

`:root` 写新令牌的亮色默认值。三套预设规则保持原色，继续设置 `--background`、`--foreground`、`--sidebar` 等。预设块之后追加暗色块。

暗色块必须带 `!important`。预设变量本身带 `!important`，没有它的后写规则不会赢。选择器还要压过 `html[data-ag-preset] body.theme-light`（0,2,1）：

```css
html[data-ag-scheme="dark"],
html[data-ag-scheme="dark"] body.theme-light,
html[data-ag-scheme="dark"] body.theme-dark
```

组件规则改引用变量，不复制一套暗色选择器。方案点名的字面色都要换。文件里另外的近黑色文字或表面填充（`#383431`、`#383533`、`2C2B29`、`#1A1A1A`，以及方案表未点名、但画在同一批表面上的黑线）映射到已有墨色或线条变量，不新增色值。发送按钮、搜索焦点色、蜡封结构不动。阴影可以保留。

`--ag-wax` 的亮色和暗色都写成 `var(--ag-wax-seal-hover, <该模式色>)`，这样 `themeVars` 里的 `--ag-wax-seal-hover` 仍然生效。Windows ClearType 继续把 `--ag-ink-shadow-*` 设为 `none`，暗色不加发光字影。

## Agent panel

运行时开头改成：不是顶层窗口，且也不是 Agent 面板，才返回。

面板判定：

- 协议是 `http:` 或 `https:`
- 主机是 `127.0.0.1` 或 `localhost`
- 查询串有 `extensionView=true`，或有 `hostTheme`

守护进程和 `verify` 在现有 `page` 过滤之外，接受同时满足这些条件的 `iframe`：有 `webSocketDebuggerUrl`，URL 不以 `devtools://` 开头，通过现有 `isAllowedOrigin`，标题不含 `Launchpad`，URL 符合上面的判定。

`verify` 不能停在第一个有目标的端口，也不能永远取 `pages[0]`。`auto` 下把 Stable、Insiders、IDE 的端口都探完，然后优先选 Agent 面板 iframe；没有时才退回第一个工作台页面。求值结果增加 `scheme` 和 `backgroundColor`。输入框、内卡、蜡封和侧栏文字在同一次实现验证里用 CDP 读计算样式；不把这些读数扩成新的产品接口。

## IDE discovery

只在 `channel=auto` 时追加 IDE，且只在对应目录或文件已经存在时加入。`stable` / `insiders` 不改。

| 用途 | 路径 |
| --- | --- |
| argv | `~/.antigravity-ide/argv.json` |
| 端口文件 | 沿用现有平台分支，应用目录名用 `Antigravity IDE`。Windows 即 `%APPDATA%/Antigravity IDE/DevToolsActivePort` |
| 会话库 | `~/.gemini/antigravity-ide/conversations` |

经典路径保留。两套都存在时两个端点都探测，不互相替换。守护进程也要拿到这个端点；只改 `install.mjs` 的 doctor 显示，注入仍会错过 IDE 的 CDP 端口，验收无法通过。会话库只作为现有只读指标的目录候选，不改 SQLite 读写逻辑。

实时切换不做新通道。实现时切一次 IDE 主题；URL 和 `data-ag-scheme` 不变，就按 PRD 把重载说明写进 `SKILL.md`。

## Rollback

仓库改动用 git 回退。已安装副本再执行 `node install.mjs install`，或在有 `core.prev/` 时 `rollback`。不删除 Antigravity 安装目录里的文件。`uninstall` 仍只停服务。
