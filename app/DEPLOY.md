# 部署到 Cloudflare（Workers + D1 + R2 + KV + Queues + Cron）

一个 Worker 同时托管前端 SPA（Static Assets）与 `/api/*` 接口，绑定 D1 / R2 / KV / Queues，Cron 兜底轮询。

## 一键部署（Deploy to Cloudflare 按钮）

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/gongbin/manju-studio)

按钮会 fork 仓库、自动创建并绑定 D1/R2/KV/Queues、构建并部署。引导中若询问构建设置：根目录 `app`、构建命令 `npm run cf:build`、部署命令 `npx wrangler deploy`、静态资源/输出目录 `dist`。部署后调用一次 `POST /api/_seed`（请求头 `x-seed-key: dev`）灌入演示数据。

> 偏好命令行 / 需要精确控制资源，用下面的脚本或手动步骤。

## 架构

```
浏览器 ──HTTP──> Cloudflare Worker (manju-studio)
                  ├─ /api/*           → Hono 接口（Auth / 业务 / 计费 / 审计）
                  ├─ 其它路径          → Static Assets（dist/，SPA 回退 index.html）
                  ├─ D1 (DB)          → 业务主数据
                  ├─ R2 (ASSETS_BUCKET)→ 素材 / 产物
                  ├─ KV (SESSIONS)    → 会话
                  └─ Queue (TASK_QUEUE)→ 生成任务异步处理（消费者推进进度）
                  Cron (* * * * *)    → 兜底重投未完成任务 / 对账
```

生成任务流：`POST /api/shots/generate` → 预扣积分(hold) + 写审计 + 建任务(queued) + 入队 → Queue 消费者逐步推进进度，终态时更新镜头与结算；前端用 TanStack Query 轮询 `/api/tasks`。
> 未配置 `VOLC_ARK_API_KEY` 时，消费者**模拟**进度，开箱即用；配置后 `VolcengineProvider` 走真实火山方舟 Ark 接口。

## 前置

```bash
npm install
npx wrangler login        # 或设置环境变量 CLOUDFLARE_API_TOKEN
```

## 一键部署

```bash
npm run cf:provision      # = bash ./deploy.sh
```

脚本会：创建 D1/R2/KV/Queue → 把生成的 `database_id`/`kv id` 写回 `wrangler.toml` → 设置 `CREDENTIAL_ENC_KEY` 机密 → `build` → 应用迁移 → `wrangler deploy` → 调用 `/api/_seed` 写入演示数据。

## 手动分步（等价）

```bash
npx wrangler d1 create manju-db          # 把 database_id 填入 wrangler.toml
npx wrangler r2 bucket create manju-assets
npx wrangler kv namespace create SESSIONS  # 把 id 填入 wrangler.toml
npx wrangler queues create manju-tasks
openssl rand -base64 32 | npx wrangler secret put CREDENTIAL_ENC_KEY
# 可选：接真实生成
echo -n "你的火山方舟APIKey" | npx wrangler secret put VOLC_ARK_API_KEY
# 可选：智能分镜接 LLM（OpenAI 兼容端点，如 ZenMux https://zenmux.ai/api/v1）
echo -n "你的ZenMux/LLM_APIKey" | npx wrangler secret put LLM_API_KEY

npm run cf:build
npm run db:migrate                        # wrangler d1 migrations apply manju-db --remote
npx wrangler deploy
# 写入演示数据（一次）
curl -X POST https://manju-studio.<子域>.workers.dev/api/_seed -H "x-seed-key: dev"
```

> 生产请把 `wrangler.toml` 里的 `SEED_KEY` 改成强随机值（或删除 `[vars]` 用机密）。

## GitHub 自动构建但不提交私有 Cloudflare 参数

仓库里的 `wrangler.toml` 应保持可公开的模板，不要提交你自己的 `database_id`、KV namespace `id` 或生产 `SEED_KEY`。Cloudflare Workers Builds 会在构建机器上运行 `npm run cf:prepare`，把 Dashboard 中的私有构建变量写入被忽略的 `wrangler.generated.toml`，并通过 `.wrangler/deploy/config.json` 让 `wrangler deploy` 使用这份生成配置；这些生成文件不会进入仓库。

在该 Worker 的 Dashboard 中进入 `Settings` → `Build`，设置：

| 项 | 值 |
|---|---|
| Root directory | `app` |
| Build command | `npm run cf:build` |
| Deploy command | `npx wrangler deploy` |
| Static assets / Output directory | `dist` |

在同一页的 `Build variables and secrets` 中添加：

| 名称 | 类型 | 说明 |
|---|---|---|
| `MANJU_D1_DATABASE_ID` | Variable | 你的 D1 database_id |
| `MANJU_KV_NAMESPACE_ID` | Variable | 你的 KV namespace id |
| `MANJU_REQUIRE_PRIVATE_CONFIG` | Variable | `1`，缺少 D1/KV 时让构建直接失败 |
| `MANJU_SEED_KEY` | Secret | 生产 seed key；脚本不会打印该值 |

可选变量：`MANJU_WORKER_NAME`、`MANJU_R2_BUCKET_NAME`、`MANJU_TASK_QUEUE_NAME`。如果你的资源名仍是默认的 `manju-studio` / `manju-assets` / `manju-tasks`，不需要设置。

运行时机密仍然放在 Worker 的 `Settings` → `Variables & Secrets`，不要写入仓库：

```bash
CREDENTIAL_ENC_KEY
VOLC_ARK_API_KEY   # 可选
```

## 线上访问报 `text/plain` MIME

如果浏览器报 `TypeError: 'text/plain' is not a valid JavaScript MIME type`，通常是 Cloudflare 把源码目录 `app/` 当成静态资源发布了，导致首页仍加载 `/src/main.tsx`。正确部署后，线上首页应该加载 `/assets/*.js`，资源目录来自 `wrangler.toml` 的 `[assets].directory = "./dist"`。

在 Cloudflare Dashboard 的该 Worker 部署设置里确认：

| 项 | 值 |
|---|---|
| Root directory | `app` |
| Build command | `npm run cf:build` |
| Deploy command | `npx wrangler deploy` |
| Static assets / Output directory | `dist` |

改完后重新触发一次生产部署，或在已登录 Wrangler 的本机执行：

```bash
cd app
npm run cf:build
npx wrangler deploy
```

## 本地开发

```bash
# 终端 A：本地 Worker（含本地 D1/R2/KV/Queue 模拟）
npm run dev:worker          # http://localhost:8787
npm run db:migrate:local    # 应用迁移到本地 D1
curl -X POST localhost:8787/api/_seed -H "x-seed-key: dev"   # 本地种子

# 终端 B：前端 HMR（/api 代理到 :8787）
npm run dev                 # http://localhost:5173
```

> 只想看 UI：直接 `npm run dev`，无 Worker 时前端自动回退内存 mock。

## 修改数据模型

```bash
# 改 worker/db/schema.ts 后
npm run db:generate         # drizzle-kit 生成新迁移到 migrations/
npm run db:migrate          # 应用到远端 D1
```
