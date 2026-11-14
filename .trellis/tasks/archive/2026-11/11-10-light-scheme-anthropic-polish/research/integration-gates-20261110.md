# 集成验收记录

2026-11-10，Windows Stable Agents；原客户端为暗色，验证后恢复原状态。实现基线 commit c832ff5。

## 已完成

- core/theme.css 新增 53 行，限定默认亮色 high-contrast 及历史别名。暗色块、共享规则、其它预设原始内容保持不变。
- 实际容器接管暖纸与燕麦表面；修复子层 --shell-canvas 覆盖和 onyx 选中行令牌绕过预设的问题；文字最终弱化墨色为 #65635D。
- 独立 trellis-check 已复核并修复选中行，见 check-review.md。DESIGN.md 已同步最终色值。
- 真实 DOM 对照 24 组（原生 body light/dark × scheme light/dark × 三预设与别名），抽查 51 个实际节点、每节点 30 项计算属性及普通/前/后伪元素。20 组不应改变的组合全部零差异。完整 JSON 在 live-comparison.json。
- 默认亮色全部 .bg-sidebar（包括真实侧栏）、外壳与中间层为 rgb(240,238,230)，纸面/面板为 rgb(250,249,245)，内卡白色；选中行为 rgb(227,224,213)。原生冷色顶光已移除。
- themeVars 输入框底色与蜡封颜色的行内覆盖仍生效。
- 实际输入框上临时切换 page-type 验证：首页常态透明、聚焦 40% 陶土；会话常态 40% 陶土、聚焦实色陶土；边框宽度均为 1.33333 CSS px（浏览器对 1.5px 的设备像素取整），未跳动。测试禁用了过渡并还原了行内样式/焦点。
- 三种修改的文字令牌对页面、外壳、白卡、选中、悬停五种背景，共 15 对 sRGB 对比度均 >=4.5，最小约 4.54。
- 整窗截图已检查，实际侧栏和选中行不再残留冷黑底，中缝不再形成粗黑带。截图暂存 %TEMP%/antigravity-light-polish-20261110/（before.png、after.png），包含用户会话画面，不入库。
- node install.mjs build-manifest 通过，manifest 仅更新 CSS 字节数与 SHA-256；node install.mjs install 通过，沿用 channel=auto。已有 4 个 user/ 文件逐项 SHA-256 前后完全一致；安装器保留备份。
- node install.mjs verify 返回 ok=true、themeStyle=true、version=20261104-v5.0.0-stable-dec129cf。node install.mjs doctor 返回 ok=true，coreIntegrity.clean=true。
- 部署后实际客户端仍为 scheme=dark，页面 rgb(28,25,23)、输入框 rgb(42,35,30)、内卡 rgb(31,27,24)、蜡封 #C46A58，与基线一致。
- git diff --check、task.py validate 通过。独立复核中的 3 个 Node 语法检查通过。仓库无 lint、TypeScript 或单元测试命令。

## 验证限制

亮色截图通过真实 Agents DOM 临时属性/样式覆盖取得，没有保存主题选择，也没有通过客户端设置切换持久化原生亮色。首页测试复用了真实会话输入框的 page-type=home 回退路径，没有导航离开用户会话；hover 与 focus-within 共用既有规则，本轮实际执行的是聚焦路径。移动端、其它平台、Insiders 未运行，均不属于本轮范围。

对比度结论只覆盖修改的文字令牌/背景色，不包括原生禁用态、低透明度标签、任意用户内容。design-atlas 静态扫描命令退出 0 但未输出 findings；不以此代替 Chromium 解析和视觉复核。

## 提交边界

用户已确认本次提交和任务归档，并要求删除交接 txt。提交范围：core/theme.css、core/manifest.json、DESIGN.md、.trellis/spec/inject/theme-and-i18n.md、本任务目录。工作提交后由 task.py archive 归档并记录会话；不推送。原有 暗色主题修改方案.md 删除不纳入提交；交接 txt 为未跟踪文件，按要求从工作区删除。
