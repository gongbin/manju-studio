# 漫剧工坊 ManjuStudio · Web App

TanStack + Base UI 实现的漫剧创作协作前端（设计参考 `../demo-ui` 原型与 `../docs` 规格文档，二者仅本地保留、未纳入仓库）。

一键部署：[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/gongbin/manju-studio) · 详见 [`DEPLOY.md`](./DEPLOY.md)。

## 技术栈

| 关注点 | 选型 |
|---|---|
| 语言 / 构建 | TypeScript · Vite 6 · React 19 |
| 路由 | **TanStack Router**（代码式、类型安全） |
| 数据 / 轮询 | **TanStack Query**（任务状态 `refetchInterval` 轮询） |
| UI 组件 | **Base UI**（`@base-ui/react` — Menu / Dialog / Checkbox / Switch） |
| 图标 | lucide-react |
| 设计系统 | 从 `../demo-ui/src/styles.css` 移植的设计令牌（`src/styles.css`） |

> 这是前端层。后端（Cloudflare Workers + D1 + R2 + KV + Queues + Cron）见技术文档 §2/§7；
> 此处用 `src/lib/api.ts` 的内存「服务端」+ 轮询模拟代替，演示生成任务的排队→运行→完成全过程。

## 运行

```bash
npm install      # 需要 @base-ui/react ≥ 1.5.0
npm run dev      # http://localhost:5173
npm run build    # tsc + vite 生产构建
npm run typecheck
```

登录页随意点「登录 / GitHub」即可进入（演示态，鉴权用 localStorage 占位）。

## 目录

```
src/
├─ main.tsx            # Query + Router + Theme providers，启动轮询模拟
├─ router.tsx          # 代码式路由树（含登录守卫 beforeLoad）
├─ theme.tsx           # 明暗 / 强调色 / 密度（写 data-* + localStorage）
├─ styles.css          # 设计令牌（移植自 demo-ui）
├─ app/Shell.tsx       # 侧边栏 + 顶栏 + 面包屑 + 布局
├─ ui/                 # Base UI 封装：menu / dialog / controls(checkbox,switch,seg,progress) / primitives / icon / toast
├─ lib/                # types · mock 数据 · api(内存服务端+轮询) · status · format · nav
└─ routes/
   ├─ Login.tsx        # 登录 / 注册 / 邀请
   ├─ Projects.tsx     # 项目卡片 + 统计 + 新建项目（Base UI Dialog）
   ├─ Project.tsx      # 剧集看板 / 列表 + 新建剧集
   ├─ Script.tsx       # 剧本 · 可插拔 LLM 智能分镜 · 外部粘贴/导入（不绑定单一大模型）
   ├─ Storyboard.tsx   # 分镜工作台（表格/卡片，行内编辑，批量选择，生成/增强 Drawer）
   ├─ drawers.tsx      # 生成 Drawer（参数面板由 Provider 模型驱动）+ 视频增强 Drawer
   ├─ Tasks.tsx        # 任务中心（聚合、状态/模型过滤、实时进度）
   ├─ Settings.tsx     # Provider 凭据（视频/LLM/TTS 三类独立）+ 默认参数 + 一键部署
   └─ Management.tsx    # 角色库 / 素材库 / 计费与用量 / 成员与权限(RBAC 矩阵) / 审计日志
```

## 与文档三条核心约束的对应

1. **多 Provider 可插拔** — `Settings` 的凭据区把视频 / LLM / TTS 列为三类相互独立的 Provider；生成 Drawer 的参数面板由所选模型的能力声明（`lib/mock.ts` 的 `models`）动态渲染。
2. **后续流程解耦** — 镜头「已生成」即可在分镜表/任务中心直接下载；增强 / 配音 / 合成均为可选旁路，不作为完成前置。
3. **剧本/LLM 不绑定** — `Script` 支持手写、外部粘贴 / 导入 JSON·md，以及在豆包 / Claude / GPT / 自建端点间切换的站内分镜。

## 备注

- 生产构建当前为单 chunk（~190KB gzip）；后续可按路由 `lazy` 分包。
