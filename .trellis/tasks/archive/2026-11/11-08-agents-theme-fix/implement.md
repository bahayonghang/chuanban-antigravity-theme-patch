# Agents scheme 同步执行

设计见 `design.md`。不要改判定顺序，不要改 `theme.css`。

## Checklist

1. 在 `core/runtime.js` 增加 `window.__ag_scheme_observer`。注入时先断开旧句柄。`enabled: false` 的卸载分支同样断开，再删 `data-ag-scheme`。
2. 观察 `documentElement` 与 `body` 的 `class`。`body` 尚不存在时，用可断开的一次性 `childList` 等待它出现，出现后立刻 `syncChuanbanScheme()`。类名变化只调这个函数。
3. `SKILL.md` 的 `scheme` 段补一句：Agents 整窗跟随 `theme-dark` / `theme-light`，不必为此重载。IDE `hostTheme` 不变时仍要重载面板。
4. `node install.mjs build-manifest`。不要手改 `core/manifest.json`。

## Validation

```bash
node --check core/runtime.js
node install.mjs build-manifest
node install.mjs doctor
```

Agents 开着时用 CDP 读 2142 上的工作台页面，不要把结果停在 IDE 端口。重载 Agents 后确认没有手动调用同步函数，`data-ag-scheme`、壳、弹窗、侧栏符合 `prd.md`。再在外观设置里切一次明暗。

临时把已安装 `user/config.json` 的 `scheme` 写成 `light`，确认暗色窗口仍是亮色，然后改回 `auto`。不要提交这份本机配置。

9222 连不上只记录，不算失败。词典条数仍是 450。

## Rollback point

observer 接上之前，当前页的诊断同步会在重载后失效。源码改坏时回退 `core/runtime.js` 和 `SKILL.md`，再 `build-manifest`。

## After check

用 `trellis-update-spec` 把「类名变化必须重判 scheme」和 `__ag_scheme_observer` 写进 `.trellis/spec/inject/runtime.md`。不要把汉化 observer 的属性过滤改掉。
