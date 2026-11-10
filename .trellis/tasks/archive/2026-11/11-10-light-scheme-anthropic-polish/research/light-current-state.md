# 亮色现状：截图量色与代码锚点

2026-11-10。来源是用户给的 Agents 整窗截图（Windows，亮色，`preset=high-contrast`，首页，输入框处于聚焦态）和当天的仓库源码。客户端当时没开，`node install.mjs doctor` 的 `liveWindow.reachable` 为 false，所以这里没有 CDP 读数。

## 截图量色

截图是 2000×1194 的缩放图。大面积色块的读数可信。1px 线条被缩放和抗锯齿冲淡，读数偏浅，线条深浅以源码令牌为准。

| 表面 | 量到的颜色 | 对应令牌 | 说明 |
| --- | --- | --- | --- |
| 标题栏（菜单那一行） | `#F7F5F0` | `--sidebar` | 预设的燕麦色在这里生效 |
| 外壳：工具行和整个侧栏区 | `#F3F3F3` | 无 | 原生中性灰，补丁在亮色下没有接管 |
| 主区纸面 | `#FCFCFB` | `--background` | 采样的三列从上到下都是同一个值，没有可见的顶部渐变 |
| 主区外框线 | 约 `#ACACAB` | `--ag-line` | 35% 纯黑 |
| 侧栏与主区的中缝 | `#9C9C9C`，紧挨外框线 | `--ag-line` | 两条线并排，合成 2 到 3px 的深色带 |
| 「New Conversation」按钮 | 底 `#FFFFFF`，边 `#C1C1C1` 到 `#C8C8C8` | `--card`、`--ag-line` | 灰底上的白块加灰框 |
| 「Open IDE」胶囊 | 底 `#F3F3F3`，边 `#C6C6C6` | 原生底、`--ag-line` | |
| 输入框外层 | `#F7EFE6` | `--ag-composer-bg` | 偏粉的桃色 |
| 输入框外框线 | `#BE9990` 到 `#C7A49B` | `--ag-wax-soft` | 36% 的 `#74221A` 压在奶油底上，读成灰粉色 |
| 输入框内卡 | `#FFFFFF` | `--ag-composer-card-bg` | |
| 发送按钮 | `#D97757` | 字面量 | |

文字和图标取每个区域里最深的像素：

| 文字 | 量到的颜色 | 对应令牌 |
| --- | --- | --- |
| 输入框底栏（模型名、Turbo）、项目胶囊、「Open IDE」 | `#000000` 到 `#0F0F0F` | `--ag-ink-strong` `#0A0A0A` |
| 侧栏条目和会话标题 | `#100E0B` 到 `#161312` | `--ag-ink` `#262422`，ClearType 让笔画更深 |
| 侧栏小标题「Projects」、筛选图标 | `#8B8A89`、`#747069` | `--ag-ink-muted` `#7A7670` |
| 「See all (23)」「No conversations yet」 | `#908C88`、`#B1B0AF` | 原生弱化色 |
| 输入框占位符 | `#757474` | 原生 |
| 菜单栏文字「Workspace」 | `#5E5B66` | 原生，偏冷紫灰 |
| 工具行的前进后退箭头 | `#777777` | 原生中性灰 |

## 读出来的问题

1. 同一屏有三种色温。外壳是原生冷灰 `#F3F3F3`，标题栏是燕麦 `#F7F5F0`，输入框是桃粉 `#F7EFE6`。标题栏和外壳之间在 y≈41 处有一条色差接缝。
2. 线条是纯黑 35% 到 38%，不带纸色。中缝和外框线叠在一起显得更重。
3. 强调色有两个红：蜡封暗红 `#74221A` 和发送按钮陶土橙 `#D97757`。蜡封淡线落在桃色底上读成粉色。
4. 控件文字接近纯黑。`high-contrast` 把 `--muted-foreground` 也提到 `#1A1A1A`，弱化层级被压平。
5. 菜单文字和工具行图标还是原生冷灰。

暗色那一块没有这些问题：它把 `.agy-shell`、`.agy-sheet`、`.bg-background`、`.bg-sidebar` 全部显式铺成同一暖色族，线条是 18% 的奶油墨，蜡封是陶土红 `#C46A58`。亮色没有做过同样的一遍。

## 代码锚点（`core/theme.css`，2026-11-10）

亮色的值分两层。

共享亮色令牌，`:root`，不带 `!important`，对三套预设都生效：

- `:676-690`：`--ag-composer-bg: #F7EFE6`（678）、`--ag-composer-card-bg: #FFFFFF`（679）、`--ag-ink: #262422`（680）、`--ag-ink-strong: #0A0A0A`（681）、`--ag-ink-soft: #1F1E1D`（682）、`--ag-ink-muted: #7A7670`（683）、`--ag-line: rgba(0, 0, 0, 0.35)`（684）、`--ag-wax: var(--ag-wax-seal-hover, #74221A)`（685）、`--ag-wax-soft: rgba(116, 34, 26, 0.36)`（686）、三级墨晕（687-689）。
- `:692-694`：`html:not([data-ag-scheme="dark"])` 上的 `--ag-wax-seal-hover: #74221A`。

预设层，带 `!important`：

- `:155-162` `vintage-deep`：`--background #FBF9F5`、`--sidebar #F1E8DC` 等六个变量。
- `:173-183` `claude-desktop-purewhite`：`--background #FCFCFB`、`--foreground #1F1E1D`、`--sidebar #FBFBF9`、`--sidebar-border #F0F0EE`、`--card` 和 `--card-border` 用 `color-mix`。
- `:195-210` `high-contrast`：`--background #FCFCFB`、`--foreground #1F1E1D`、`--sidebar #F7F5F0`、`--sidebar-secondary #ECE9E1`、`--sidebar-muted #F2EFE7`、`--sidebar-border` / `--card-border` / `--card-edge` / `--sash-line` 都是 `rgba(0, 0, 0, 0.35)`、`--border rgba(0, 0, 0, 0.38)`、`--card #FFFFFF`、`--secondary-foreground #0A0A0A`、`--muted-foreground #1A1A1A`。
- 每套预设只铺 `.bg-sidebar` 和 `body`（164-170、185-192、212-219）。

暗色块，本任务不改：

- `:222-248`：暗色令牌。它用 `!important` 覆盖了预设层的全部 14 个变量，以及 `--ag-composer-bg`、`--ag-composer-card-bg`、四个 `--ag-ink*`、`--ag-line`、`--ag-wax`、`--ag-wax-soft`。所以改这些变量的亮色值不会漏进暗色。
- `:251-263`：暗色下铺 `.bg-background`、`.agy-shell`、`.agy-sheet`、`.bg-sidebar`，并把 `.agy-sheet` 的顶光换成暖色。亮色没有对应规则。

没有被暗色块覆盖、亮暗共用的值。改它们会动到暗色：

- 三级墨晕 `--ag-ink-shadow-*`（687-689）。
- 蜡封三态的阴影字面量 `rgba(116, 34, 26, …)`（299、307、314）和内卡阴影（332、338）。
- 输入框顶栏悬停底 `rgba(217, 119, 87, 0.08)`（323）。
- 搜索焦点 `#D97757`（349-350）。
- 发送按钮 `#D97757`、`#FFFFFF`、边 `#C45F40`、悬停 `#C86646`（371-378）。
- 指标胶囊的警告色 `#B45309`、`#DC2626`（586、592）。

只对 `high-contrast` 生效的规则：

- `:354-356`：侧栏里所有 `a` 和 `button` 的 `border-color` 用 `--ag-line`。「New Conversation」的灰框从这里来。
- `:359-361`：`.bg-border` 的底色用 `--ag-line`。
- `:364-367`：输入框里的文字、按钮、图标用 `--ag-ink-strong`，并强制 `opacity: 1`。

对所有预设生效的线条：

- `:266-273`：`.agy-inset-shell` 把 `--card-edge` 和 `--sash-line` 指到 `--ag-line`，`[data-main-content-body]::after` 画 1px 内描边。
- `:276-278`：中缝那条 1px 的 `div` 用 `--ag-line`。

## `themeVars` 能盖什么

运行时把 `themeVars` 写成 `documentElement` 的行内样式（`core/runtime.js:108-117`）。行内样式赢过 `:root` 里不带 `!important` 的声明，输给带 `!important` 的声明。

- 亮色下 `--ag-*` 令牌可以被 `themeVars` 覆盖。
- 预设层的 `--background`、`--border` 等带 `!important`，`themeVars` 盖不住。
- 暗色下 `--ag-*` 带 `!important`，只有 `--ag-wax-seal-hover` 通过 `var()` 透进去。

## 没有验证的事

- 外壳的 `#F3F3F3` 画在哪个元素上，是从截图推断的。依据是暗色研究（`archive/2026-11/11-08-agents-theme-fix/research/agents-scheme-stale.md`）里 `.agy-shell` 带原生底色，以及暗色块需要显式铺它。实现前要用 CDP 读 `.agy-shell`、`.agy-sheet`、`.bg-sidebar`、标题栏和侧栏容器的计算背景色。
- 菜单文字 `#5E5B66` 和工具行图标 `#777777` 读的是哪个原生变量。
- 客户端资源里搜不到明文的 `agy-shell`（`resources/app.asar` 与 `resources/bin/language_server.exe`，后者 2026-11-09 更新过）。原生样式被压缩在二进制里，不解包就拿不到，只能等客户端开着时用 CDP 读。
