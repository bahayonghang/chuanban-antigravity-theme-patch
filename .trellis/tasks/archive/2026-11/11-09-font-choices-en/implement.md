# 字体目录执行

设计见 `design.md`。不要改判定以外的配色，不要注入原生下拉。

## Checklist

1. `core/daemon.mjs` 读 `fonts`，非法值换成默认 id，放进 boot 和内容哈希。缺省 `i18n` 改为 `false`。
2. `core/runtime.js` 写 `data-ag-font-ui` / `data-ag-font-code`。卸载时删除。缺省 `i18n` 改为 `false`。
3. `core/theme.css` 按目录设置变量，并让对话正文和输入框改读这些变量。规则放在现有字体 `!important` 之后，特异性压过 `body[data-agy-font="google-sans"]`。
4. `install.mjs` 只在 `fonts.ui` / `fonts.code` 缺失或非法时写默认 id。已有布尔 `i18n` 不覆盖。
5. 仓库 `user/config.json` 写入默认 `fonts`，并把模板 `i18n` 改为 `false`。
6. `SKILL.md` 写明两个字段和原生下拉不控制补丁字体。`AGENTS.md` 写明 `i18n` 默认关闭。
7. `node install.mjs build-manifest`。不要手改 manifest。

## Validation

```bash
node --check core/daemon.mjs
node --check core/runtime.js
node --check install.mjs
node install.mjs build-manifest
node install.mjs doctor
node install.mjs install
```

安装后把已安装 `user/config.json` 的 `modules.i18n` 写成 `false`，只改这个字段。然后用 CDP 读 2142 上的计算字体和可见英文。再临时改两个字体 id，确认约 2.5 秒内热重载，最后改回默认。

`9222` 连不上只记录。词典条数仍是 450。

## Rollback point

字体规则接上之前，现有 Anthropic `!important` 仍会盖住新变量。源码改坏时回退上述文件，再 `build-manifest` 和 `install`。

## After check

用 `trellis-update-spec` 把字体 id、两层覆盖范围和 `i18n` 缺省 `false` 写进 `.trellis/spec/inject/theme-and-i18n.md` 与 `user-layer.md`。
