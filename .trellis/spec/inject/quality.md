# 注入层质量

没有前端测试、lint 或类型检查。`core/runtime.js` 不经过打包，语法错误会直接变成页面里的注入失败。

## 改内核注入体之后

动过 `core/runtime.js`、`core/theme.css` 或 `core/i18n.json`：

```bash
node install.mjs build-manifest
node install.mjs doctor
```

然后在客户端开着的前提下：

```bash
node install.mjs verify
```

只改了仓库 `user/` 模板时，不必重建 manifest（`user/` 不在哈希清单里）。已安装副本的 `user/` 改动靠 2.5 秒热重载，用 `verify` 看 `themeStyle`，不要重启服务来「让它生效」。

改装层怀疑有问题时，对照：

```bash
node install.mjs verify --safe-mode
```

安全模式正常、普通模式不正常，就查已安装 `user/`，不要先改 `core/`。

## 审查时看这些

- 文件仍以 `})(__AG_BOOT_PAYLOAD__);` 结尾，守护进程的 `replace` 还能对上。
- 顶层窗口判断还在。
- 新的 `window.__ag_*` 句柄在再次注入前会被清掉。
- 新词典键是普通英文短语，查找仍要求 `typeof === 'string'`。
- 新 CSS 能被 `themeVars` 覆盖的部分使用变量，而不是把颜色只写死在一处又在 `custom.css` 里复制一份。
- 预设的历史别名选择器还在。
- `excludeI18n` 仍排除代码、终端、对话正文和指标胶囊。

## 反模式

- 用浏览器里临时改 DOM 的结果当「已修好」，但不改源文件、不跑 `verify`。
- 为了通过完整性检查去手改 `manifest.json`。
- 引入 JSX、CSS Modules 或 PostCSS。这一层就是手写 CSS 和一段 IIFE。
