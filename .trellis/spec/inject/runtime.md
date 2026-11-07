# 注入运行时

`core/runtime.js` 整个文件是一个箭头函数，最后一行是：

```js
})(__AG_BOOT_PAYLOAD__);
```

`core/daemon.mjs` 的 `rebuildBundleIfNeeded()` 用字符串替换把这一行换成 `})(${JSON.stringify(bootPayload)});`。所以：

- 占位符必须原样留在文件最后。不要改成别的变量名，除非同时改守护进程里的 `replace`。
- 不要在这个文件里写需要再转义一遍的模板字符串来嵌 CSS 或词典。CSS 文本、词典、`custom.js` 源码都放在 boot 对象里。
- 替换回调是 `() => ...`，避免 `replace` 把 JSON 里的 `$&` 当模式处理。保持这个形态。

## 谁可以被注入

函数体第一件事是判断当前窗口要不要注入：

```js
if (window.top !== window && !isAgentPanelWindow()) return;
if (!boot || typeof boot !== 'object') return;
```

Artifact / HTML 预览之类的子 iframe 不注入。唯一例外是本机 Agent 面板：协议为 `http:` 或 `https:`，主机是 `127.0.0.1` 或 `localhost`，并且查询串有 `extensionView=true` 或 `hostTheme`。不要放行其余 iframe，也不要删掉这个判断。

## boot 与模块开关

守护进程放进 boot 的字段包括 `version`、`platform`、`enabled`、`preset`、`scheme`、`cssText`、`customCss`、`themeVars`、`i18nDict`、`modules`、`features`（与 `modules` 同一对象）、`selectors`、`config`、`customJs`。`scheme` 只可能是 `auto`、`light`、`dark`。

页面里模块默认值写在 `runtime.js` 的 `Object.assign`：

- `i18n`
- `metrics`
- `composerWaxSeal`
- `deadlockHealer`
- `customCss`
- `customJs`

别名是既成事实，两边都要认：

- 配置里的 `features` 与 `modules` 合并，`modules` 优先（后写覆盖）。
- `metricsCapsule` 只有在没写 `metrics` 时才当作 `metrics`。
- 运行时再把 `MODULES.metricsCapsule` 设成 `MODULES.metrics`，旧调用点还能读到。

关整个补丁是 `enabled: false`，不是把每个模块都关掉。那条路径会删掉 `#ag-custom-fonts`、`#antigravity-user-custom-style`、`#ag-live-metrics-pill`、`#ag-live-metrics-tooltip`，断开 observer / interval，清掉 `data-ag-preset`、`data-ag-scheme`、`data-ag-page-type`、`data-ag-wax-seal`，并用 WeakMap 把译文还原。

## 页面上的状态

持久状态挂在 `window` 上，热重载时复用，不要改成模块级 `let` 以外再复制一份：

| 名字 | 用途 |
|------|------|
| `window.__ag_orig_text_map` | WeakMap，原文与上次写入值 |
| `window.__ag_applied_theme_vars` | 上一轮写过的 CSS 变量名，用来删掉已移除的键 |
| `window.__ag_i18n_observer` | 汉化 MutationObserver，重建前先 `disconnect` |
| `window.__ag_metrics_route_watcher` | 指标路由 `setInterval`，重建前先 `clearInterval` |
| `window.__ag_last_metrics` | 最近一次指标 |
| `window.__AG_PATCH_CTX__` | 交给 `custom.js` 的 `ctx` / `boot` |

新的长期句柄沿用 `__ag_` 前缀，并在重新注入时先清掉旧的 observer / timer。漏清就会叠多个 observer。

## DOM 与性能约束

汉化 observer 看 `childList`、`subtree`、`characterData`，属性只监听 `title`、`aria-label`、`placeholder`。不要改成监听 `style` 或全部属性。

现有熔断是单帧约 200 个节点，加上 `requestAnimationFrame` 与 80ms `setTimeout` 双触发，避免后台标签里脏根无限堆积。新扫描逻辑沿这个预算，不要对整棵 `document.body` 做无节流的全量 walk。

主题变量经 `applyThemeVars` 写到 `document.documentElement.style`。空字符串会删掉该属性。`--ag-chat-font-size` 还会切换 `data-ag-custom-font-size`。

## 用户脚本沙箱

`custom.js` 不是 `eval` 进内核作用域。运行时用：

```js
const fn = new Function('ctx', 'boot', boot.customJs);
fn(window.__AG_PATCH_CTX__, window.__AG_PATCH_CTX__);
```

包在 `try/catch` 里，失败只 `console.error('[Antigravity Patch] Error in user/custom.js:', err)`。不要让用户脚本的异常中断内核后半段，也不要把它的错误吞掉不打印。

`ctx` 上现有的字段：`version`、`preset`、`config`、`modules`、`features`、`themeVars`、`dict`、`metrics`（getter）、`syncPreset`、`ensureMetricsPill`。加字段可以，删或改名会破坏已经写好的 `user/custom.js`。

## 反模式

- 把 React、打包器或 npm 包引进 `runtime.js`。
- 注入 Agent 面板以外的子 iframe，或在非顶层窗口改 `history`。
- 用 `localStorage.theme-preset-light = ...` 直接赋值。现有代码走 `Storage.prototype.setItem/getItem.call`，并会把非法的 `theme-preset-light` 改回 `Default Light`，避免原生主题选择器白屏。
- 热重载时不 `disconnect` 旧 observer 就 `new` 一个新的。

## 参考

- `core/runtime.js` 开头到 `applyThemeVars`，以及文件末尾 custom.js 段
- `core/daemon.mjs` 的 `bootPayload` 与 `replace('})(__AG_BOOT_PAYLOAD__);'`
