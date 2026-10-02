# 番禺校园指南

面向暨南大学番禺校区学生的校园生活导航网站。从入学到毕业，按衣食住行医、学习办事、毕业就业、校园账号、网络、缴费、快递与校园地图共 12 个分类组织，支持搜索、图文详情、外部网站跳转和校园向导。

## 运行

需要 Node.js 22 或更新版本。

```bash
npm ci
npm run build
npm start
```

访问 http://127.0.0.1:8787 。默认无需模型密钥，可使用明确标注的站内智能检索。

开发时分别运行 `npm start` 与 `npm run dev`，访问 Vite 打印的本地地址。Vite 将 `/api` 代理至 8787。

## AI 接入

复制 `.env.example` 为 `.env`，设置 `AI_BASE_URL`、`AI_MODEL`、`AI_API_KEY`。三个值必须同时配置。接口采用兼容 Chat Completions 的格式：程序在 `AI_BASE_URL` 后追加 `/chat/completions`；服务端发送 `response_format: {type: "json_object"}`，提供商需支持此格式。

例如供应商提供 `https://供应商域名/v1/chat/completions`，则 `AI_BASE_URL` 填写 `https://供应商域名/v1`。密钥仅保存在服务器环境变量，绝不写入前端或提交仓库。配置完成后重启服务器，向导状态将显示为 AI 校园向导。

AI 只能推荐目录中已存在的条目 ID；前端通过本地目录解析跳转网址，模型不能构造新的链接。模型服务失败时显示错误，不伪造回答。未配置时使用本地中文标签和同义词检索，明确标注为站内智能检索。聊天不自动打开外部网址，由学生确认点击。

## 内容来源与当前限制

- 已逐页整理用户提供的 50 页 `Untitled.pdf`，导入 51 条指南；另保留 19 条补充导航，共 70 条。每条 PDF 指南带来源页码、完整说明及步骤，交通时刻表与五校区网络服务点以表格展示。
- WPS 在线原文仍要求登录，PDF 内容不代表在线文档实时同步。PDF 中 2024/2025 年界面、班次、营业状态与优惠均为历史资料，整理日期不代表其当前有效。
- 已纳入可访问的暨南大学、番禺校区、图书馆、学生处、就业、教务、广州地铁与 12306 官网。教务需要学校账号登录。
- 不编造食堂价格、商家地址、就医地点、校车时刻或学校政策。所有具体安排以官网为准。
- 网站提供导航与查询线索，目前不具备学校业务办理、预约、支付或报修系统接口。
- 没有接入大模型密钥，初始交付使用站内智能检索。

编辑 `src/catalog.json` 可维护分类、标签、正文、步骤、表格、图片、页码和直接链接。每个条目都有对应的详情顶部图片，原图支持在新窗口查看。详见 [内容核对说明](docs/source-notes.md) 和 [50 页内容索引](docs/pdf-page-map.json)。

## 动画与界面

React、TypeScript、Vite、GSAP、ScrollTrigger、Lucide。包含页面进出切换、分类条目错峰入场、校园图片视差、悬浮标签、交互反馈、详情弹窗与向导面板。动画响应系统减少动态效果偏好，页面提供暂停按钮。移动端支持折叠导航与触屏操作。

## 图片

校园意象插画使用内置 imagegen 生成。提示词保存在 `public/images/campus-illustration.prompt.txt`。WebP 为网页优化版本，PNG 为原始生成文件。该插画不是暨南大学实景。

生活场景照片来自 Unsplash，非特定校园设施：

- 衣物 `photo-1483985988355-763728e1935b`
- 饮食 `photo-1546069901-ba9599a7e63c`
- 居住 `photo-1615874959474-d609969a20ed`
- 出行 `photo-1485965120184-e220f721d03e`
- 医疗 `photo-1505751172876-fa1923c5c528`

另新增 10 张主题场景图，来源、许可与说明见 [主题图片清单](docs/section-image-sources.json)。从 PDF 提取 17 张原图：校园地图、餐饮分布图、裕华堂、KFC、三种班车、外卖柜与九个小程序分享卡片，来源见 [PDF 图片清单](docs/pdf-image-sources.json)。原 PDF 中个人身份与账号信息未发布。

来源：https://unsplash.com/ 。许可：https://unsplash.com/license 。GSAP 许可随安装包提供。

## 验证

```bash
npm run check
```

包含 TypeScript 编译、生产构建，以及 14 项目录检索、模型目标限制、50 页覆盖、全条目图片、完整表格和小程序独立搜索测试。浏览器交互检查脚本位于 `tests/browser-check.mjs`，PDF 图文检查位于 `tests/pdf-browser-check.mjs`，运行前启动服务；通过 `BROWSER_EXECUTABLE` 指定可用的 Chromium 可执行文件。

服务器默认仅监听本机；对外运行可设置 `HOST=0.0.0.0`，正式部署时由 HTTPS 网关提供访问控制与请求限制。仓库本身不等于已部署网站，GitHub 私有仓库只保存源码。

## GitHub Pages 部署

仓库包含 `.github/workflows/pages.yml`。在 GitHub 仓库 Settings → Pages 中选择 GitHub Actions，启用成功后，在仓库 Actions Variables 中设置 `PAGES_ENABLED=true`，随后推送 main 或手动执行 Deploy campus guide to GitHub Pages。工作流完成构建、测试和部署。

Pages 构建采用相对资源路径，支持项目子目录；使用 hash 导航，刷新分类页面无需服务器重写。Pages 上的校园向导明确使用浏览器内站内检索，不请求不存在的服务端接口。Node AI 接口仍保留在源码中，但 GitHub Pages 不运行 Node 服务。

私有仓库启用 Pages 取决于账号套餐与仓库设置。部署不会自动修改仓库为公开。正式地址以 GitHub Pages 返回的 URL 为准。

当前账号的私有仓库 Pages 启用请求被 GitHub 套餐规则拒绝。构建工作流仍可运行，部署步骤默认跳过；不会自动改变仓库可见性。
