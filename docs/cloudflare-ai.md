# GitHub Pages + Cloudflare Workers 校园向导

前端保持 GitHub Pages 托管，Worker 仅提供 `/api/status` 与 `/api/ask`。
服务目录由 `src/catalog.json` 打包，包含86条图文指南；索引覆盖全部指南，服务端先检索相关全文，模型可用受限的 `read_guides` 工具读取其他完整指南。
教程图片在模型上下文中保留说明，实际图片及官方入口通过回答下方的站内详情展示。

## 已部署地址

- 前端：https://campus.sonh.me/
- 代理：https://panyu-campus-ai.3518872137.workers.dev
- 模型：`deepseek-v4-flash-0731`

## 密钥与访问控制

移动云密钥使用 Cloudflare Secret `AI_API_KEY`，不放入 `VITE_*`、GitHub 仓库或构建产物。
`wrangler.toml` 只包含公开的模型、API地址和允许来源。
默认允许 `https://campus.sonh.me`、`https://sonh66.github.io`，只开放 JSON 问答和必要 CORS 预检。
两项 Cloudflare Rate Limiting bindings 分别限制单IP每分钟6次、共享键每分钟30次；限制按 Cloudflare 数据中心执行，属于近似限流，不能作为严格的账户总量或费用上限。
急症词即时返回120求助指引，不等待模型。供应商故障明确显示错误，用户仍可浏览分类。

## 本机部署与更新

```powershell
npm ci
npx wrangler login
npm run deploy:worker
```

首次部署后，通过 `npx wrangler secret put AI_API_KEY` 交互输入密钥。
本地调试密钥可放 `.dev.vars`，该文件被 Git 忽略；不得提交。
Windows 使用系统代理时，可为当前终端设置 `HTTPS_PROXY`、`HTTP_PROXY` 指向现有代理再执行 Wrangler。

GitHub 仓库 Actions Variable `VITE_API_BASE_URL` 设置为代理地址，Pages 构建自动注入该公开地址。
保留 `PAGES_ENABLED=true`，推送 main 即部署前端。
清空 `VITE_API_BASE_URL` 后重新构建 Pages，可恢复明确标注的站内检索。
目录或代理代码变更后，需要在已授权的本机重新执行 `npm run deploy:worker` 同步 Worker；前端 Pages 工作流不会替代这一步。

## 调用格式

`POST /api/ask` 的JSON正文：

```json
{
  "message": "下一步怎么办？",
  "history": [
    { "role": "user", "content": "宿舍空调坏了" },
    { "role": "assistant", "content": "先提交报修并保存工单。" }
  ]
}
```

仅接受 user/assistant 历史，最多8条、总计12000字，当前问题1–1000字。
前端发送最近6条，不在浏览器长期保存聊天记录。
服务端将模型自然语言回答和检索得到的合法站内ID组合；工具及结构化返回均校验目标是否存在。
最终响应含 `mode`、`answer`、`recommendations`、`categories`，前端只用本地目录解析跳转，不能执行模型生成的代码。
真实问答与追问必须实际验证；单元测试只证明请求校验、检索、限流和工具调用逻辑。
