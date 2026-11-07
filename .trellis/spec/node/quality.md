# Node 层质量

仓库没有单元测试、没有 lint 脚本、也没有 `npm test`。不要为了「补上测试」引入测试框架，除非用户明确要求。

## 改内核之后

按顺序，在仓库根目录：

```bash
node install.mjs build-manifest
node install.mjs doctor
```

`build-manifest` 负责让 `core/manifest.json` 的 SHA-256 和字节数跟这四个文件一致：

- `core/daemon.mjs`
- `core/runtime.js`
- `core/theme.css`
- `core/i18n.json`

只改了 `install.mjs` 时不必为它重建 manifest，它不在哈希清单里。但只要动了守护进程或它注入的三个内核文件，就要重建。

注入是否生效，只能在 Antigravity 已经开着、CDP 可达时看：

```bash
node install.mjs verify
```

通过标准是 JSON 里 `"ok": true`，且 `themeStyle` 为 true，版本与当前包一致。客户端没开、或刚写完 `argv.json` 还没完全退出重开，`verify` 会连不上。这是环境缺口，不要改成「校验失败就算成功」，也不要声称已经生效。

怀疑是 `user/` 把页面打坏时：

```bash
node install.mjs verify --safe-mode
```

## 审查时看这些

- 子命令仍从 `install.mjs` 底部一个分发点出去，没有第二套 CLI。
- 复制到已安装目录的逻辑仍跳过已存在的 `user/` 文件。
- `core.prev/` 仍只在 manifest 哈希变化时被替换。
- 新增的外部输入（端口、通道、预设、目录）沿用 `getArg`，并保持「坏值兜底、不抛到顶层」的风格。
- 日志前缀没有换成另一套风格。
- 没有把 `~/.gemini` 或字体文件写进仓库。

## 反模式

- 手改 `manifest.json` 里的 `sha256` / `bytes` 让检查通过。
- 没有 `doctor` 或 `verify` 输出时，在回复里写「已安装成功」。
- 为了让类型检查通过而把这两个文件改成 TypeScript。它们就是 `.mjs` / 被注入的 `.js`。
