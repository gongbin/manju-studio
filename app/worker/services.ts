// Billing (hold/settle/refund), audit logging, and task progression.
import { eq, and } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as S from './db/schema';
import type { Env } from './env';
import { registry } from './providers';

type Db = DrizzleD1Database<typeof S>;
const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}`;
const now = () => new Date().toISOString();

export async function audit(db: Db, teamId: string, e: { actor?: string; action: string; target?: string; diff?: string; src?: string }) {
  await db.insert(S.auditLogs).values({ id: uid('a'), teamId, actor: e.actor ?? null, action: e.action, target: e.target ?? null, diff: e.diff ?? null, src: e.src ?? 'Web', time: now() });
}

export async function wallet(db: Db, teamId: string) {
  return db.select().from(S.creditWallets).where(eq(S.creditWallets.teamId, teamId)).get();
}

/** Hold (pre-deduct) credits when a task is submitted. Returns false if insufficient. */
export async function hold(db: Db, teamId: string, amount: number, ref: { type: string; id: string }, actor?: string) {
  const w = await wallet(db, teamId);
  if (!w || w.balance < amount) return false;
  const balanceAfter = w.balance - amount;
  await db.update(S.creditWallets).set({ balance: balanceAfter, monthSpent: w.monthSpent + amount }).where(eq(S.creditWallets.teamId, teamId));
  await db.insert(S.creditTransactions).values({ id: uid('tx'), teamId, type: 'hold', amount: -amount, balanceAfter, refType: ref.type, refId: ref.id, actor: actor ?? null, note: null, created: now() });
  return true;
}

/** Refund a held amount (e.g. on task failure). */
export async function refund(db: Db, teamId: string, amount: number, ref: { type: string; id: string }) {
  const w = await wallet(db, teamId);
  if (!w) return;
  const balanceAfter = w.balance + amount;
  await db.update(S.creditWallets).set({ balance: balanceAfter, monthSpent: Math.max(0, w.monthSpent - amount) }).where(eq(S.creditWallets.teamId, teamId));
  await db.insert(S.creditTransactions).values({ id: uid('tx'), teamId, type: 'refund', amount, balanceAfter, refType: ref.type, refId: ref.id, actor: 'system', note: '任务失败退回', created: now() });
}

/**
 * Advance one task one step. Uses the real provider when credentials exist,
 * otherwise simulates progress (so the app works out of the box). Returns the
 * resulting state; the queue consumer re-enqueues until terminal.
 */
export async function advanceTask(db: Db, env: Env, taskId: string, teamId: string): Promise<'queued' | 'running' | 'succeeded' | 'failed'> {
  const t = await db.select().from(S.generationTasks).where(and(eq(S.generationTasks.id, taskId), eq(S.generationTasks.teamId, teamId))).get();
  if (!t || t.state === 'succeeded' || t.state === 'failed') return (t?.state as 'succeeded') ?? 'failed';

  const isEnhance = t.cap === 'video-enhance';
  let next = t.progress;
  let state: 'queued' | 'running' | 'succeeded' | 'failed' = t.state as 'running';
  let videoUrl: string | null = null;

  // Real provider path
  if (env.VOLC_ARK_API_KEY && !isEnhance && t.ptid) {
    try {
      const pt = await registry.videoProvider()!.getTask(t.ptid, env);
      state = pt.state;
      next = pt.progress ?? next;
      if (pt.videoUrl) videoUrl = pt.videoUrl;
    } catch (e) {
      state = 'failed';
      await db.update(S.generationTasks).set({ state, error: String(e), updated: now() }).where(eq(S.generationTasks.id, taskId));
      await markShotFailed(db, t.shot, String(e));
      await refund(db, teamId, t.cost, { type: 'generation_task', id: taskId });
      return 'failed';
    }
  } else {
    // Simulation path
    if (t.state === 'queued') { state = 'running'; next = 5; }
    else { next = Math.min(100, t.progress + Math.round(7 + Math.random() * 12)); state = next >= 100 ? 'succeeded' : 'running'; }
  }

  // On success, surface the generated video URL keyed by the (provider) task id.
  if (state === 'succeeded' && !isEnhance && !videoUrl) videoUrl = `https://demo.cdn/manju/${t.shot}.mp4`;

  await db.update(S.generationTasks).set({ state, progress: next, ...(videoUrl ? { videoUrl } : {}), updated: now() }).where(eq(S.generationTasks.id, taskId));

  if (isEnhance) {
    const shot = await db.select().from(S.shots).where(eq(S.shots.id, t.shot)).get();
    const enh = shot?.enhance ?? { status: 'processing' as const };
    await db.update(S.shots).set({ enhance: { ...enh, status: state === 'succeeded' ? 'succeeded' : 'processing', progress: next }, updated: now() }).where(eq(S.shots.id, t.shot));
  } else {
    await db.update(S.shots).set({ status: state === 'succeeded' ? 'generated' : 'running', progress: next, keyframe: true, ...(videoUrl ? { videoUrl } : {}), updated: now() }).where(eq(S.shots.id, t.shot));
  }

  return state;
}

async function markShotFailed(db: Db, shotId: string, error: string) {
  await db.update(S.shots).set({ status: 'failed', error, updated: now() }).where(eq(S.shots.id, shotId));
}

export const ids = { uid, now };
