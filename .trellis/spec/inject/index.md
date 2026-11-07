# 注入层规范

> 适用于打进 Antigravity 页面的那一层：`core/runtime.js`、`core/theme.css`、`core/i18n.json`，以及仓库 `user/` 模板。Node 守护进程怎么把它们拼起来，见 [node](../node/index.md)。

没有组件框架、没有自定义 hook、没有打包器、没有 TypeScript。`core/runtime.js` 是一个浏览器 IIFE，由 `core/daemon.mjs` 在末尾替换 `__AG_BOOT_PAYLOAD__`。

---

## 适用范围

| 文件 | 角色 |
|------|------|
| `core/runtime.js` | 页面引擎：样式节点、汉化、蜡封状态、指标胶囊、`custom.js` 沙箱 |
| `core/theme.css` | 内核样式，挂到 `#ag-custom-fonts` |
| `core/i18n.json` | 英文原文到中文的基准词典 |
| `user/config.json` | 开关、预设、`themeVars`、选择器 |
| `user/custom.css` | 追加样式，挂到 `#antigravity-user-custom-style` |
| `user/i18n.override.json` | 覆盖或新增词条 |
| `user/custom.js` | 内核跑完后的用户脚本 |

给某一台机器换皮肤时，改已安装目录的 `user/`，不要改仓库 `core/`。

---

## Guidelines Index

| Guide | 何时读 |
|-------|--------|
| [Runtime](./runtime.md) | 改注入脚本、全局状态、模块开关或 boot 载荷时 |
| [Theme and i18n](./theme-and-i18n.md) | 改 CSS、预设、词典或「不要翻译」的节点时 |
| [User layer](./user-layer.md) | 改默认模板，或指导用户改 `config` / `custom.css` / 词条 / `custom.js` 时 |
| [Quality](./quality.md) | 改完内核注入体，要重建 manifest 或做安全模式对照时 |

---

## Pre-Development Checklist

- [ ] 确认改的是内核还是某台机器的 `user/`。没被要求改内核，就停在 `user/`
- [ ] `runtime.js` 保持零依赖、无模板字符串拼 CSS/词典。样式和词典是 boot 对象上的普通字符串和对象
- [ ] 新的界面行为优先用 CSS（`:has`、`data-ag-*`），不要再加一套轮询
- [ ] 汉化改动同时看 `selectors.excludeI18n`：代码块、终端、对话正文、侧栏会话标题不翻译
- [ ] 词典键是界面上的英文原文，值是中文。不要加会撞上原型的键；运行时会挂到 `Object.create(null)`

## Quality Check

- [ ] 非 Agent 面板的子 iframe 仍在开头返回。Agent 面板只限本机 `http:` / `https:`，且查询串有 `extensionView=true` 或 `hostTheme`
- [ ] `enabled: false` 仍会卸掉样式节点、指标胶囊和已翻译文本
- [ ] `user/custom.js` 仍在独立 `try/catch` 里，失败只打 `[Antigravity Patch] Error in user/custom.js`
- [ ] 改了 `runtime.js` / `theme.css` / `i18n.json` 后跑了 `node install.mjs build-manifest`
- [ ] 没有把用户私人 `custom.css` 或词条覆盖写回仓库，除非用户明确要求更新默认模板

**Language**: 规范与文件头注释使用中文。页面上的词典键保持英文原文。
