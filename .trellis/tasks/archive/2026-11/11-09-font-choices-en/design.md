# 字体目录与英文默认设计

需求见 `prd.md`。字体 id 是闭合目录，不接受任意 CSS 字体串。

## Boundaries

改 `core/theme.css`、`core/runtime.js`、`core/daemon.mjs`、`install.mjs`、仓库 `user/config.json`、`SKILL.md`、`AGENTS.md`。`core/manifest.json` 只由 `build-manifest` 重写。

不改 `core/i18n.json`。不把已安装 `user/config.json` 提交进仓库。

## Font contract

配置对象：

```json
"fonts": { "ui": "wenyuan-serif", "code": "maple-bright" }
```

Node 和浏览器都只认精确 id。`fonts` 不是对象、字段缺失或值不在目录里，就用上面的默认 id。不让整个 `install` 失败。

守护进程把合法 id 放进 `bootPayload.fonts` 和 `bootPayload.config.fonts`。内容哈希对象加上 `fonts`。`BASE_VERSION` 仍是 `20261104-v5.0.0`。

浏览器把 id 写到 `data-ag-font-ui` 和 `data-ag-font-code`。`enabled: false` 时连同现有属性一起删掉。不新开轮询，也不监听原生 `data-agy-font`。

## CSS

目录项用 `html[data-ag-font-ui]` / `html[data-ag-font-code]` 设置变量，放在现有 Anthropic `!important` 规则之后。选择器要压过 `body[data-agy-font="google-sans"]`，否则变量仍停在 Anthropic。

- `--font-sans`：界面控件。
- 对话正文改为读同一套外观变量，不再写死 Anthropic Serif。
- `--font-mono`：代码、终端、文件名。
- 输入框改为读 `var(--font-mono)`，不再写死更纱 Slab。

`wenyuan-serif` 的家族名是 `WenYuan Serif SC`。`maple-bright` 的家族名是 `MapleBright`。后面仍接现有中文和系统回退。`@font-face` 继续只用 `local()`。

## i18n default

`core/daemon.mjs`、`core/runtime.js` 和仓库模板的缺省 `i18n` 改为 `false`。安装器看到已有布尔值就保留。当前机器的已安装配置单独写成 `false`，只动这个字段。

## Rollback

仓库改动用 git 回退后再 `build-manifest` 和 `install`。已安装 `i18n` 若要恢复中文，把该字段改回 `true`。不删除 Antigravity 安装目录里的文件。
