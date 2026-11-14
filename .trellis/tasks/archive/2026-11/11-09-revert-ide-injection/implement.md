# 还原 IDE 侧改动

按这个顺序做。先改代码，再安装，再恢复插件。反序会再次改写 IDE 的 `argv.json`。

## Checklist

1. 改 `core/daemon.mjs`：去掉 IDE 端点函数和 `auto` 里的 push，改文件头。保留 `type === 'page'` 和 Agent 面板 iframe 判定。
2. 改 `install.mjs`：去掉 IDE 通道、IDE 端口候选、`.antigravity-ide` 的 argv 修补。
3. `node --check core/daemon.mjs` 和 `node --check install.mjs`。
4. `node install.mjs build-manifest`，然后 `node install.mjs doctor`。`coreIntegrity.clean` 必须为 true。
5. `node install.mjs install`。不传 `--preset`、`--scheme`、`--channel`。确认输出没有把 `~/.antigravity-ide/argv.json` 标成 `patched` 或 `created`。确认该文件仍没有 `remote-debugging-port`。
6. 恢复 12 个扩展目录。本地同版本先核对 `package.json` 再复制。其余从 Marketplace 下载到临时目录，去掉 `extension/` 前缀后放入登记的 `relativeLocation`。tinymist 不先删目录。
7. 读回 12 个 `package.json`，核对 publisher、name、version。临时 VSIX 删掉。
8. 更新 `SKILL.md`、`AGENTS.md`、`.trellis/spec/node/boundaries.md`、`.trellis/spec/node/cli-and-daemon.md`。不改归档任务和 `暗色主题修改方案.md`。
9. 不结束 IDE 进程。告诉用户重载窗口后插件才会重新扫描。

## Validation

- 源码检索 `.antigravity-ide`：只允许出现在「不要探测、不要写入」的说明里，不能出现在写入或端点列表里。
- `doctor` JSON 的 `coreIntegrity.clean` 为 true。
- 12 个目标目录的 `package.json` 版本与 `prd.md` 的表一致。
- 经典版若没在听端口，`verify` 连不上是环境缺口，不要改判定去连 IDE 端口。

## Rollback

代码回退用 git。已安装内核用 `node install.mjs rollback`。不要为了回退代码去删除已经恢复的扩展目录。
