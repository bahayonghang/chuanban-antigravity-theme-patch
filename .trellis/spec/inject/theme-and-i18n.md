# 主题 CSS 与汉化词典

## CSS 放哪

| 层 | 文件 | 挂载点 |
|----|------|--------|
| 内核 | `core/theme.css` | `#ag-custom-fonts`，整份 `textContent` 替换 |
| 用户追加 | `user/custom.css` 或已安装副本 | `#antigravity-user-custom-style`，排在内核样式之后 |

`custom.css` 写原生 CSS。不要做反斜杠转义，不要包成 JS 字符串。

内核样式靠具体选择器和 `!important` 压过客户端，而不是靠再包一层 CSS-in-JS。改选择器时同时看 `user/config.json` 的 `selectors`：`inputBoxId`、`branchPillInBox`、`homeGreeting`、`excludeI18n`。运行时用 `Object.assign` 盖默认值，所以用户只覆盖要改的键。

## 字体与四层分工

补丁字体不看原生 `data-agy-font`。`@font-face` 继续只用 `local()`，不把字体文件打进仓库。

`fonts` 是闭合目录：

- `fonts.ui`：`wenyuan-serif`（默认，`WenYuan Serif SC`，保留现有中文回退）、`wenyuan-sans`、`anthropic`、`system`。覆盖界面控件和对话正文，变量 `--font-sans`。
- `fonts.code`：`maple-bright`（默认，`MapleBright`，保留等宽回退）、`maple-mono`、`anthropic`、`sarasa`。覆盖代码、终端、文件名和输入框，变量 `--font-mono`。

缺字段、空字符串或其他值分别回到这两个默认 id。目录规则必须放在 Anthropic `!important` 之后，选择器压过 `body[data-agy-font="google-sans"]`，否则变量仍停在 Anthropic。原生字体下拉不控制这两层。对话正文和输入框读变量，不要再写死家族名。

字重刻度固定为 300/400/500/600/700/900。不要把 Insiders 的 250/350/450 写回来。注释在 `:root` 那段。

Windows 上字体光复制到用户字体目录不够，要走 `node install.mjs install-fonts --from <目录>`，它会写当前用户字体注册表。`WenYuan` / `MapleBright` 不由这个命令下载。

## Scenario: 字体目录

### 1. Scope / Trigger

换外观或代码字体时，改已安装 `user/config.json` 的 `fonts`，不要改原生下拉，也不要让 `data-agy-font` 驱动补丁字体。

### 2. Signatures

- `fonts.ui`：`wenyuan-serif` | `wenyuan-sans` | `anthropic` | `system`
- `fonts.code`：`maple-bright` | `maple-mono` | `anthropic` | `sarasa`
- 页面属性：`data-ag-font-ui`、`data-ag-font-code`

### 3. Contracts

守护进程把合法 id 放进 `boot.fonts` 和 `boot.config.fonts`。内容哈希对象必须包含 `fonts`。`enabled: false` 时连同现有属性删掉这两个 data 属性。

### 4. Validation & Error Matrix

- 目录规则放在 Anthropic `!important` 前面，或选择器压不过 `body[data-agy-font="google-sans"]` → 计算字体仍是 Anthropic。
- 哈希不含 `fonts` → 只改字体 id 不会热重载。
- 非法 id 写成空字体栈 → 页面丢字。必须回退默认 id。

### 5. Good/Base/Bad Cases

- Good：默认 id 下，界面和对话正文包含 `WenYuan Serif SC`，代码、终端、文件名和输入框包含 `MapleBright`。
- Base：缺 `fonts` 时同样是这两个默认 id。
- Bad：切原生下拉指望补丁字体跟着变。

### 6. Tests Required

没有单测。客户端开着时用 CDP 读计算字体。改 id 后约 2.5 秒应离开旧家族，测完改回默认。词典仍是 450 条。

### 7. Wrong vs Correct

#### Wrong

往原生字体菜单注入选项，或把任意 CSS 字体串写进 `fonts.ui`。

#### Correct

只接受目录 id。家族名留在 `theme.css` 的目录规则里。


## 预设与蜡封

预设写在 `<html data-ag-preset>` 上，并由 `<html data-ag-appearance="default|custom">` 控制是否挂载：仅当宿主处于默认外观（`Default Light` / `Default Dark`）时才设置 `data-ag-preset`；一旦用户在 Settings → Appearance 切换到非默认主题（如 `Everforest`、`Dracula`、`Catppuccin`、`Legacy Light/Dark` 或自定义三原色），运行时即刻置 `data-ag-appearance="custom"` 并移除 `data-ag-preset`。

**色彩门控铁律**：`core/theme.css` 中所有涉及主题表面色、边框色、阴影色、输入框蜡封、发送按钮陶土橙、侧边栏/菜单/弹窗墨色的规则，必须全部限定在 `html[data-ag-preset]`（或指定预设选择器）之下，严禁写无门控的全局颜色覆盖。非默认外观下保留全局字体、`--ag-chat-font-size`、汉化，以及通过 `html:not([data-ag-preset])` / `html:not([data-ag-preset])[data-ag-scheme="dark"]` 自适应宿主 `--foreground` / `--primary` / `--background` / `--border` 的实时指标胶囊。

合法用户配置值只有三个：

- `high-contrast`（样式里同时认历史别名 `chuanban-warm-white`）
- `claude-desktop-purewhite`（同时认 `claude-desktop-official`）
- `vintage-deep`（同时认 `absoulutely-chuanban`，拼写是源码里的历史值，不要「修正」后删掉旧选择器）

新预设要同时加：`runtime.js` 里的预设同步、`theme.css` 里带旧别名的选择器、以及 `user/custom.js` 头注释里的联合类型。不要只改其中一处。

明暗不是第四个预设。`scheme` 写到 `data-ag-scheme`，只允许 `auto`、`light`、`dark`。默认外观暗色是三套亮色预设之后的 `html[data-ag-preset][data-ag-scheme="dark"]` 令牌，选择器要压过 `body.theme-light`，并且变量带 `!important`。不要改 `vintage-deep` 的浅色色值，也不要复制一整份暗色选择器。

蜡封三态是纯 CSS，不靠 JS 轮询：

- 首页：`html:has([data-testid="home-greeting"])`，默认透明，悬停/聚焦才出淡蜡封。
- 会话里：输入框常驻淡蜡封，悬停/聚焦用 `--ag-wax-seal-hover`（默认亮色 high-contrast 为 `#C6613F`，其它亮色预设为 `#74221A`）。
- 关蜡封是 `data-ag-wax-seal="off"`，对应模块 `composerWaxSeal: false`。

输入框底部的全局 `span` 强墨色与字重规则（`#antigravity\.agentSidePanelInputBox span...`）必须通过 `:not(#ag-live-metrics-pill):not(#ag-live-metrics-pill *)` 显式豁免实时指标胶囊，避免 `(1, 4, 2)` 特异性覆盖胶囊键名弱化色与四阶水位语义色。胶囊与 `#ag-live-metrics-tooltip` 统一消费 `:root`（亮色）与 `html[data-ag-scheme="dark"]`（暗色）的 `--ag-metric-*` 令牌：详情卡顶部设独立焦点卡 `.ag-tt-ctx-box` 突出当前压缩水位，文字采用三级墨色（主数值 `--ag-metric-value`、次级数值 `--ag-metric-value-sec`、键名与括号说明 `--ag-metric-label`）配暖陶土强调色 `--ag-metric-accent`，上下文压缩百分比按 `ok`（`<55%` 青瓷绿）、`mid`（`55%–74%` 暖赭金）、`warn`（`75%–89%` 琥珀橙）、`crit`（`>=90%` 朱砂红）四阶矿物色渲染微底色胶囊徽标。守护进程同时生成 `payload.i18n.{en,zh}` 双语文案（并把 `metricsLang` 纳入内容哈希），前端 `resolveMetricsLang()` 默认（`metricsLang="auto"`）在 `modules.i18n === true` 或 `<html lang="zh*">` 时选中文、其余英文界面选英文，热重载时即刻重绘已缓存的 `window.__ag_last_metrics`。键名用 `var(--font-sans)`，等宽数值类名统一带 `-num` / `-stat` 后缀以对齐 `var(--font-mono)` + `tabular-nums` 数据语义门禁；组间用 CSS 细竖线而非 `·` 中点串，进度条不声明布局 `width` 过渡，保持恒定 `1px` 边框零位移、立即显现的 `:focus-visible` 焦点环及 `prefers-reduced-motion: reduce` 回退。热重载升级已有胶囊节点时通过 `data-v` 版本号原位替换，避免匿名事件监听器重复挂载或丢失键盘事件。

改颜色优先加 CSS 变量，让 `user/config.json` 的 `themeVars` 能覆盖。变量写到 `documentElement`，删除键时运行时会 `removeProperty`。

### 默认亮色表面

`high-contrast` / `chuanban-warm-white` 的亮色纸面为 `#FAF9F5`，外壳、侧栏和输入框外层为 `#F0EEE6`，内卡为白色；弱化墨色为 `#65635D`，分隔线为暖墨 15%。规则必须同时限定预设和 `:not([data-ag-scheme="dark"])`，不能改共享 `:root` 或暗色块来实现亮色优化。

实际外壳包括 `.agy-shell`、`.agy-inset-shell`、`.bg-sidebar`。`.agy-inset-shell` 会本地重定义 `--shell-canvas`，其下 `.contents` 通过行内 `--sidebar: var(--shell-canvas)` 转接；因此根节点令牌不够，需在外壳元素覆盖本地 `--shell-canvas`。验收要读所有 `.bg-sidebar`，不能只读标题栏的第一个匹配节点。

原生 onyx 主题的 `.agy-sidebar-row[data-selected="true"]` 读取 `--onyx-selected`，不读 `--sidebar-secondary`。默认亮色应在选中行上用 `--onyx-selected: var(--sidebar-secondary)` 接回预设选中底色；只改 body 类名不能验证这条兼容路径。

改动后对照新旧暗色三套预设、另外两套亮色及历史别名的计算样式；强制亮色时宿主 body 可能仍带 `.theme-dark`，基础变量也必须覆盖该组合。测聚焦边框颜色时先禁用该元素的 transition，避免把动画中的插值误认为规则失效；测后恢复行内样式和焦点。

## Scenario: scheme 与暗色表面

### 1. Scope / Trigger

暗色不是新预设。经典版整窗和 IDE Agent 面板共用 `boot.scheme` 与 `data-ag-scheme`。

### 2. Signatures

- 配置和 `boot.scheme`：精确字符串 `auto`、`light`、`dark`。其他值在守护进程里变成 `auto`。
- 页面属性：`document.documentElement.dataset` 对应 `data-ag-scheme="dark"|"light"`。
- 内容哈希对象必须包含 `scheme`，否则只改这个字段不会换注入版本。

### 3. Contracts

判定顺序：配置里的 `light`/`dark`；当前 URL 的 `hostTheme`；`theme-dark` / `theme-light` 类；`localStorage['theme-mode']` 恰好为 `dark` 或 `light`；否则 `light`。

这个顺序在注入时跑一次不够。`documentElement` 或 `body` 的 `class` 后来才出现、或之后被改掉时，必须用同一函数再判一次。Agents 整窗不写 `theme-mode`，也不需要为这次同步重载。IDE 面板若 URL 里的 `hostTheme` 没变，仍要重载面板。不要把 `color-scheme` 或单独的 `dark` 类加进顺序。

暗色表面令牌：页面 `#1C1917`，侧栏 `#24201C`，输入框外层 `#2A231E`，内卡 `#1F1B18`，正文 `#F4EFE6`，侧栏字 `#E7E0D6`，蜡封 `#C46A58`。发送按钮保持 `#D97757` / `#FFFFFF`。

经典版 NewUX（`data-newux-theme="onyx"`）整窗由「外层暖色画布框架 + 内嵌圆角内容卡片」组成：
- 外层统一外壳：顶部菜单栏、左侧边栏与顶部 40px 标题/分栏/Tab 工具栏通过 `--sidebar`、`--shell`、`--shell-canvas` 及 `:is(.agy-shell, .agy-inset-shell, .bg-sidebar)` 同色铺底；`.agy-sheet[data-sheet-inset]` 本身保持透明（去除冷蓝渐变），让顶部 `[data-main-content-header]` 直接落在外壳画布上，避免左栏与主区顶栏出现色差断层。
- 内嵌内容卡片：`[data-main-content-body]`、`[data-side-panel-body]` 与 `.agy-sheet:not([data-sheet-inset])` 承接 `--background`（暗色叠加暖陶土微光径向渐变），并配合 `--onyx-frame`、`--onyx-well`、`--onyx-raised`、`--onyx-selected`、`--onyx-key`、`--glass`、`--glass-border` 与 `.agy-aux-tab` 完成全壳层、分段控件、标签胶囊与弹窗表面统一。

### 4. Validation & Error Matrix

- 预设规则带 `!important`，暗色变量不带 → 暗色不生效。
- 暗色选择器压不过 `html[data-ag-preset] body.theme-light` → `body` 仍是亮色变量。
- `:root` 上写死 `--ag-wax-seal-hover: #74221A` → 暗色蜡封回退永远用不到 `#C46A58`。亮色默认只放在 `html:not([data-ag-scheme="dark"])`。
- 只在注入时写 `data-ag-scheme`，类名后到不再判 → Agents 暗色窗口停在亮色墨，深底深字。

### 5. Good/Base/Bad Cases

- Good：暗色面板底色 `rgb(28, 25, 23)`；默认 high-contrast 配置 `scheme=light` 后同一暗色宿主变成 `rgb(250, 249, 245)`。
- Base：没有 `hostTheme` 也没有主题类，结果是 `light`。
- Bad：把 `vintage-deep` 的 `#FBF9F5` 改成暗色。
- Bad：Agents 已有 `body.theme-dark`，但因为没有 `theme-mode` 写入就保持 `data-ag-scheme="light"`。

### 6. Tests Required

没有单测。客户端开着时用 CDP 读 `data-ag-scheme`、`backgroundColor`、输入框和侧栏计算样式。`vscode-webview://` 预览 iframe 的这两个属性必须是 `null`。词典仍是 450 条。

### 7. Wrong vs Correct

#### Wrong

只给 `body` 设 `background`，或者复制一整份暗色选择器。

#### Correct

亮色预设继续写原来的变量。暗色块放在预设之后，选择器包含 `html[data-ag-scheme="dark"] body.theme-light`，组件只引用变量。

## 词典

`core/i18n.json` 是扁平 JSON：`"英文原文": "中文"`。运行时：

```js
const DICT = Object.assign(Object.create(null), boot.i18nDict || {});
```

因此：

- 不要添加 `toString`、`valueOf`、`constructor`、`__proto__` 这类会撞原型的键。空原型对象让普通键安全，但不要依赖原型方法，查找结果必须 `typeof replacement === 'string'`。
- 键用界面上真实出现的英文，含大小写。句尾多一个 `.` 时，运行时会回退到不带点的键，并把中文句号补上。
- 带数字的句子用 `runtime.js` 里已有的模块级正则（`RE_FILES_CHANGED`、`RE_WORKED_FOR` 等），不要每条词条各编译一个 `new RegExp`。
- 不翻译 `selectors.excludeI18n` 盖住的节点：`code, pre, kbd, samp, textarea, input`、对话正文、文件标题、侧栏会话行、指标胶囊自身。默认串在 `user/config.json`。

覆盖层是 `user/i18n.override.json`。扁平对象或 `{ "exact": { ... } }` 都可以。`normalizeOverrideDict()` 会丢掉 `_` 开头的键（所以 `_comment` 可以留），非字符串值也会丢掉。下划线键不会进入词典。

译文要能还原：原文存在 WeakMap 里。新增翻译时走现有的 `origTextMap`，不要直接改 `nodeValue` 而不记原始值，否则热重载和 `enabled: false` 还原不回去。

## 反模式

- 在 `custom.css` 里写 `content: "\4e2d\6587"` 这类转义来绕过「零转义」约定。
- 翻译代码块、终端、对话正文或 `config.json` 本身。
- 删掉预设的历史别名选择器，导致旧 `data-ag-preset` 值丢样式。
- 为蜡封状态加 `setInterval` 去改 class。现有路径是 CSS `:has`。

## 参考

- `core/theme.css` 开头字体段、`html[data-ag-preset=...]` 段、`--ag-wax-seal-hover`
- `core/i18n.json` 顶部词条
- `core/runtime.js`：`DICT`、`EXCLUDE_SELECTOR`、`computeTextTranslation`
- `core/daemon.mjs`：`normalizeOverrideDict`
