# 漫剧工坊 ManjuStudio

开源的 **AI 漫剧创作与协作管理系统**：从剧本 → 分镜 → 角色一致性 → AI 镜头生成 → 配音/增强 → 下载/合成，面向小团队，内置用户、RBAC、操作审计与积分计费，一键部署到 Cloudflare。

> 建立在「火山方舟 Seedance / 即梦」视频生成能力之上，但**视频模型 / LLM / TTS 三类能力均可插拔**，火山只是首个实现。

## 一键部署到 Cloudflare

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/gongbin/manju-studio)

点击按钮 → Cloudflare 会 fork 本仓库、按引导**自动创建 D1 / R2 / KV / Queues 资源并注入绑定**、构建并部署 Worker（前端 SPA + `/api/*` 同一 Worker）。引导中若询问构建设置，请填：

| 项 | 值 |
|---|---|
| Root directory（根目录） | `app` |
| Build command（构建命令） | `npm run cf:build` |
| Deploy command（部署命令） | `npx wrangler deploy` |
| Static assets / Output directory（静态资源目录） | `dist` |

部署完成后，首次访问需灌入演示数据：`POST /api/_seed`，请求头 `x-seed-key: dev`（生产请改 `SEED_KEY`）。
更完整的部署/对接真实火山生成说明见 [`app/DEPLOY.md`](./app/DEPLOY.md)（含命令行一键脚本 `npm run cf:provision`）。

## 仓库结构

| 目录 | 内容 |
|---|---|
| [`app/`](./app) | **真实应用**：前端 TanStack + Base UI（Vite/TS）+ 后端 Cloudflare Worker（Hono + Drizzle + D1 + R2 + KV + Queues） |

> 注：UI 设计原型 `demo-ui/` 与规划文档 `docs/`（PRD、技术设计）仅在本地保留，未纳入本仓库。

## 快速开始

```bash
cd app
npm install
npm run dev            # 纯前端 + 内存 mock：http://localhost:5173
```

接后端 / 部署见 [`app/DEPLOY.md`](./app/DEPLOY.md)。

## 三条核心设计约束

1. **多 Provider 可插拔** —— 视频 / LLM / TTS 是相互独立的 Provider 家族，新增厂商≈一个文件，业务/UI/计费/审计零改动。
2. **后续流程解耦** —— 镜头「已生成」即可下载并结束；增强 / 配音 / 合成 / 审核均为可选旁路，不作完成前置。
3. **剧本/LLM 不绑定** —— 剧本可外部平台写好导入，或在站内可插拔 LLM 间切换；提示词字段永远可手填。

## 技术栈

TypeScript · TanStack Router/Query · Base UI · Vite · Hono · Drizzle ORM · Cloudflare Pages(Static Assets) + Workers + D1 + R2 + KV + Queues + Cron。

许可证：见各目录；建议 MIT / Apache-2.0。
