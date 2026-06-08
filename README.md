# 漫剧工坊 ManjuStudio

开源的 **AI 漫剧创作与协作管理系统**：从剧本 → 分镜 → 角色一致性 → AI 镜头生成 → 配音/增强 → 下载/合成，面向小团队，内置用户、RBAC、操作审计与积分计费，一键部署到 Cloudflare。

> 建立在「火山方舟 Seedance / 即梦」视频生成能力之上，但**视频模型 / LLM / TTS 三类能力均可插拔**，火山只是首个实现。

## 仓库结构

| 目录 | 内容 |
|---|---|
| [`docs/`](./docs) | 产品需求文档（PRD）与技术设计文档（TECH_DESIGN） |
| [`demo-ui/`](./demo-ui) | 交互式 UI 设计原型（单文件 React 原型，作为设计参考，勿改） |
| [`app/`](./app) | **真实应用**：前端 TanStack + Base UI（Vite/TS）+ 后端 Cloudflare Worker（Hono + Drizzle + D1 + R2 + KV + Queues） |

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
