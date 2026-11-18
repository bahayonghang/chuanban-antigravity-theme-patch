# 上游同步与选择性移植

适用于同步 `upstream/main`、评估 `dev` 可移植更新及部署本仓库构建的场景。

## 先同步本地 main，再评估 dev

1. 用 `git status --short --branch`、`git branch -vv` 和 `git worktree list` 确认当前分支、远端关系和未提交工作。用 `git fetch upstream` 更新上游引用。
2. 用 `git merge-tree --write-tree main upstream/main` 试合并本地 `main`，退出码 1 表示有冲突。当前工作树在 `dev` 且有未提交改动时，可用 `git worktree add <临时目录> main` 在独立目录合并与验收，完成后移除临时工作树。若 `.gitattributes` 的两边分别包含 Trellis 日志合并规则与上游换行、二进制文件规则，两套规则都保留。
3. 用 `git rev-list --left-right --count main...origin/main` 检查 fork 远端与本地 `main` 的分叉。同步上游以原本的本地 `main` 为基线，推送及合并 fork 远端历史按各自请求处理。
4. 用 `git log --oneline dev..upstream/main` 列出上游独有提交，用 `git merge-tree --write-tree dev upstream/main` 评估整包合并。曾经选择性移植的修复可能仍出现在提交列表中，选取之前要对照 `dev` 的实现和变更内容。

## dev 的移植边界

- 按功能拆解上游发版提交。优先独立移植配置损坏保护、宿主识别和冷启动等能直接验证的修复。Swarm 父子帧同步、WSL2 读库、Windows 自启、深色预设和外观按钮各自评估依赖与验收。
- 合并前后核对 `dev` 的英文默认值、字体目录、`scheme` 和默认外观门控。原生默认外观继续用 Anthropic 暖色，非默认外观的配色由宿主管理。实际界面语言单独看固定标签和设置页。见 [默认英文契约](../inject/user-layer.md#默认英文契约)。
- 宿主识别同时影响守护进程、NewDocument 运行时和 `verify`。验证经典版主窗口、Agent 面板、普通本地网页、早期 DOM 以及已注入窗口导航后的清理。端口仅回环，经典版通道与 IDE 保持隔离。见 [CDP 与会话指标](../node/cli-and-daemon.md#cdp-与会话指标)。
- 配置保护覆盖 UTF-8 BOM、损坏 JSON、非对象根节点和锁定文件。用临时安装目录比较字节，验证合法配置的自定义值及显式参数，无效或锁定文件保持原样。

## 验证和部署

1. 改内核后运行 `node --check`、`node install.mjs build-manifest` 和 `node install.mjs doctor --target-dir .`。哈希由安装器生成。选择性移植可保留本分支版本号，交付时同时记录 Git 提交、manifest 版本和实机载荷版本。
2. 本机安装前先比对目标分支与已装内核的 manifest。当前 `dev` 的最新提交可能沿用比已装上游更低的版本号。通过现有安装器安装，确认 `core.prev` 匹配旧版，已有 `user/` 文件的哈希保持一致。Windows 若已有可用登录任务，核对它调用的是同一安装副本，保留该任务并检查安装器是否新增了重复入口。
3. 实机 `node install.mjs verify` 要同时核对 `ok`、`themeStyle`、`live.state.bodyReady` 和载荷版本。若经典版启动后端口未监听，检查实际进程参数。2026-11-18 在 Windows 的 Antigravity 2.33.0 中，直接启动未打开端口，使用经典版可执行文件显式传入 `--remote-debugging-port=9222 --remote-debugging-address=127.0.0.1` 后通过验收。按实际结果记录沙箱覆盖和真机状态。

## 2026-11-18 同步记录

- 本地 `main` 通过 `7c5b5a2` 合入上游 v5.4.2（`6b3783d`）。直接与上游的合并只需解决 `.gitattributes`，对 `dev` 整包试合并则有 8 个文件冲突。
- `dev` 通过 `ebad03c` 移植 `90a0f6a`、`60d154c` 和 `6b3783d` 的宿主门禁、冷启动及配置保护。该提交是本次验收的 v5.3.0 构建。Windows 实机观察到 `20261115-v5.3.0-stable-164c210f`，原有四个用户文件哈希一致。
