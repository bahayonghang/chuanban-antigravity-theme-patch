# 暗色主题实施顺序

先读 `prd.md`、`design.md` 和 `research/code-anchors.md`。不要重写守护进程或注入引擎。每改一个内核文件就保持它能被现有加载路径读到。

## Checklist

1. `core/daemon.mjs`
   - [ ] 规范化 `scheme`，写入 `activeConfig`、`bootPayload.scheme`、`bootPayload.config.scheme` 和内容哈希。
   - [ ] `auto` 时在目录存在的前提下追加 IDE 端点。不改 `stable` / `insiders`，不覆盖经典路径。
   - [ ] 目标过滤附加符合设计的 Agent iframe。
2. `core/runtime.js`
   - [ ] 非顶层且非 Agent 面板才返回。
   - [ ] 按 PRD 顺序写 `data-ag-scheme`，并让现有 `theme-mode` 钩子走到它。
   - [ ] `enabled: false` 时删除 `data-ag-scheme`。
3. `core/theme.css`
   - [ ] `:root` 写亮色默认令牌。
   - [ ] 三套预设之后加能压过 `body.theme-light` 的暗色块，变量使用 `!important`。
   - [ ] 方案点名的字面色改成变量。其余近黑文字和表面黑线映射到已有令牌。发送按钮、焦点色和蜡封结构保留。
   - [ ] `--ag-wax` 继续接受 `--ag-wax-seal-hover`。
4. `install.mjs`
   - [ ] `verify` 的目标过滤和端口聚合与守护进程对齐，优先检查 Agent 面板，并读出 `scheme` 与 `backgroundColor`。
   - [ ] `auto` 时处理 IDE 的 argv、端口文件和会话目录。
   - [ ] 只有合法 `--scheme` 或字段缺失时才写配置。
5. 模板和说明
   - [ ] 仓库 `user/config.json` 增加 `"scheme": "auto"`。
   - [ ] `SKILL.md` 补 `scheme`、IDE 目录和重载说明。
   - [ ] `AGENTS.md` 补 `scheme` 白名单。
   - [ ] 更新被行为打脸的 `.trellis/spec/` 句子，尤其是「所有子 iframe 直接返回」。
6. 清单
   - [ ] `node install.mjs build-manifest`。不要手改哈希。

## Validation

仓库内先跑：

```bash
node --check core/daemon.mjs
node --check install.mjs
node install.mjs build-manifest
node install.mjs doctor
```

`doctor` 的 `coreIntegrity.clean` 必须为 true。`runtime.js` 不用 `node --check` 证明注入成功。

然后需要正在运行的 Antigravity IDE。若首次写入了 `remote-debugging-port`，先请用户完全退出再打开。之后：

```bash
node install.mjs install
node install.mjs verify
```

对照 PRD 的验收项读 `verify` JSON，并用 CDP 核对输入框、内卡、蜡封和侧栏文字。再手动验证 `"scheme": "light"` 的 2.5 秒热切换、改回 `auto`、预览 iframe 未被注入，以及词典仍是 450 条。

没有 CDP 时停在 doctor，并写明缺的是端口。不要把 `verify` 失败记成代码失败。

切一次 IDE 主题。属性不跟随 URL 变化时，只补 `SKILL.md`，不添加消息通道。

## Rollback points

- CSS 令牌改坏亮色：先回退 `core/theme.css`，再 `build-manifest`。
- iframe 放行过宽：收紧三处同一判定，确认预览 iframe 没有 `data-ag-*`。
- IDE 探测影响经典通道：确认 `stable` / `insiders` 的路径函数没有被改掉，IDE 只是 `auto` 的附加端点。
- 已安装副本异常：用 git 回退仓库后重新 `install`；有 `core.prev/` 时才 `rollback`。不碰安装目录。

## Before task.py start

- [ ] `prd.md`、`design.md`、`implement.md` 已与最新方案一致。
- [ ] `implement.jsonl` 和 `check.jsonl` 都有真实 spec 或 research 条目。
- [ ] 用户已经明确批准这份规划摘要。创建任务本身不是开始实现的批准。
