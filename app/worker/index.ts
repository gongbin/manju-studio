// Worker entry: serves /api/* via Hono, static SPA via the assets binding,
// processes generation tasks on a Queue, and reconciles on a Cron schedule.
import { inArray } from 'drizzle-orm';
import { api } from './api';
import { getDb, type Env, type TaskMessage } from './env';
import * as S from './db/schema';
import { advanceTask } from './services';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return api.fetch(request, env, ctx);
    // Non-API paths are normally served by Static Assets before the Worker runs;
    // this is a safety fallback if the Worker is invoked for them.
    return env.ASSETS.fetch(request);
  },

  // Queue consumer — advances each task one step, re-enqueues until terminal.
  async queue(batch: MessageBatch<TaskMessage>, env: Env): Promise<void> {
    const db = getDb(env);
    for (const msg of batch.messages) {
      try {
        const { taskId, teamId } = msg.body;
        const state = await advanceTask(db, env, taskId, teamId);
        if (state === 'queued' || state === 'running') {
          await env.TASK_QUEUE.send({ taskId, teamId }, { delaySeconds: 2 });
        }
        msg.ack();
      } catch {
        msg.retry();
      }
    }
  },

  // Cron — re-enqueue any non-terminal tasks (covers lost messages / restarts).
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      (async () => {
        const db = getDb(env);
        const pending = await db
          .select({ id: S.generationTasks.id, teamId: S.generationTasks.teamId })
          .from(S.generationTasks)
          .where(inArray(S.generationTasks.state, ['queued', 'running']))
          .all();
        for (const t of pending) await env.TASK_QUEUE.send({ taskId: t.id, teamId: t.teamId });
      })(),
    );
  },
};
