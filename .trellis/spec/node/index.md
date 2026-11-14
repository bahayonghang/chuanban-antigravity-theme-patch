# Node 层规范

> 适用于仓库里的 Node ESM：`install.mjs` 与 `core/daemon.mjs`。浏览器注入体不在这一层，见 [inject](../inject/index.md)。

本仓库不是 Web 后端。没有路由、服务层、ORM、数据库迁移或 npm 依赖。Node 侧只做三件事：安装生命周期、本机 CDP 守护、只读会话指标。

---

## 适用范围

| 文件 | 角色 |
|------|------|
| `install.mjs` | 子命令 CLI：`doctor` / `install` / `verify` / `install-fonts` / `rollback` / `uninstall` / `build-manifest` |
| `core/daemon.mjs` | 常驻守护：合并 `core/` + `user/`、连 `127.0.0.1` CDP、2.5 秒热重载 |
| `core/manifest.json` | `build-manifest` 生成的 SHA-256 与字节数，不要手改 |

人读的部署契约在 `SKILL.md` 与 `AGENTS.md`。改代码时以源码和本目录为准，不要把 `SKILL.md` 整段抄进实现。

---

## Guidelines Index

| Guide | 何时读 |
|-------|--------|
| [Boundaries](./boundaries.md) | 动 `core/`、安装目录、`user/` 覆盖规则、字体或自启之前 |
| [CLI and Daemon](./cli-and-daemon.md) | 改子命令、CDP、SQLite 指标、日志或降级路径时 |
| [Quality](./quality.md) | 改完内核文件，准备跑 `build-manifest` / `doctor` / `verify` 时 |

---

## Pre-Development Checklist

- [ ] 这次改动是用户明确要求的内核修改，而不是「为了装上主题而重写守护进程」
- [ ] 个性化配色、字号、词条、追加 CSS、前端钩子写到已安装的 `user/`，不写进 `core/`
- [ ] 读过 [boundaries](./boundaries.md) 里「升级不许覆盖」的三条
- [ ] 若改 `core/daemon.mjs`，同步确认 [inject](../inject/index.md) 的 boot 载荷契约没有被悄悄改掉
- [ ] 调试端口只走回环；来源白名单保持 `install.mjs` 里已有的五项

## Quality Check

- [ ] 没有新增 npm 依赖、打包器或第二套守护脚本
- [ ] Node `< 22` 仍被 CLI 拒绝；`node:sqlite` 缺失时进程不崩，只关指标
- [ ] 改过 `core/daemon.mjs`、`core/runtime.js`、`core/theme.css` 或 `core/i18n.json` 后跑了 `node install.mjs build-manifest`
- [ ] 没有手改 `core/manifest.json` 的哈希
- [ ] 没有单元测试可跑；注入效果只能在正在运行的客户端上用 `verify` 确认，验证不了就明说

**Language**: 规范、文件头注释与面向仓库的说明使用中文，和 `AGENTS.md`、`SKILL.md` 一致。CLI 打到终端的 `[ERROR]` / JSON 字段保持现有英文。
