import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { eq, and, desc } from 'drizzle-orm';
import { getDb, type Env } from './env';
import * as S from './db/schema';
import { seed, TEAM_ID } from './db/seed';
import { audit, hold, ids } from './services';
import { registry } from './providers';
import { models as MODELS } from '../src/lib/mock';

const pad2 = (n: number) => String(n).padStart(2, '0');

export const api = new Hono<{ Bindings: Env }>();
api.use('/api/*', cors());

const sessionUser = async (c: { env: Env; req: { raw: Request } }) => {
  const sid = getCookie(c as never, 'ms_sess');
  if (!sid) return null;
  return (await c.env.SESSIONS.get(`sess:${sid}`)) ?? null;
};

/* ---------------- auth ---------------- */
api.post('/api/auth/login', async (c) => {
  const { email } = await c.req.json<{ email?: string }>();
  const db = getDb(c.env);
  const user = email ? await db.select().from(S.users).where(eq(S.users.email, email)).get() : undefined;
  const uid = user?.id ?? 'u_lin';
  const sid = crypto.randomUUID();
  await c.env.SESSIONS.put(`sess:${sid}`, uid, { expirationTtl: 60 * 60 * 24 * 7 });
  setCookie(c, 'ms_sess', sid, { httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
  await audit(db, TEAM_ID, { actor: uid, action: 'auth.login', target: email ?? '(demo)', diff: '登录' });
  return c.json({ ok: true, userId: uid });
});

api.post('/api/auth/logout', async (c) => {
  const sid = getCookie(c, 'ms_sess');
  if (sid) await c.env.SESSIONS.delete(`sess:${sid}`);
  deleteCookie(c, 'ms_sess', { path: '/' });
  return c.json({ ok: true });
});

api.get('/api/auth/me', async (c) => {
  const uid = await sessionUser(c);
  if (!uid) return c.json({ user: null });
  const user = await getDb(c.env).select().from(S.users).where(eq(S.users.id, uid)).get();
  return c.json({ user: user ?? null });
});

/* ---------------- reads ---------------- */
api.get('/api/projects', async (c) => c.json(await getDb(c.env).select().from(S.projects).where(eq(S.projects.teamId, TEAM_ID)).all()));
api.get('/api/episodes', async (c) => c.json(await getDb(c.env).select().from(S.episodes).where(eq(S.episodes.teamId, TEAM_ID)).all()));
api.get('/api/shots', async (c) => c.json(await getDb(c.env).select().from(S.shots).where(eq(S.shots.teamId, TEAM_ID)).all()));
api.get('/api/scenes', async (c) => c.json(await getDb(c.env).select().from(S.scenes).where(eq(S.scenes.teamId, TEAM_ID)).all()));
api.get('/api/characters', async (c) => c.json(await getDb(c.env).select().from(S.characters).where(eq(S.characters.teamId, TEAM_ID)).all()));
api.get('/api/tasks', async (c) => c.json(await getDb(c.env).select().from(S.generationTasks).where(eq(S.generationTasks.teamId, TEAM_ID)).orderBy(desc(S.generationTasks.created)).all()));
api.get('/api/audit', async (c) => c.json(await getDb(c.env).select().from(S.auditLogs).where(eq(S.auditLogs.teamId, TEAM_ID)).orderBy(desc(S.auditLogs.time)).all()));
api.get('/api/models', (c) => c.json(MODELS));
api.get('/api/wallet', async (c) => {
  const w = await getDb(c.env).select().from(S.creditWallets).where(eq(S.creditWallets.teamId, TEAM_ID)).get();
  return c.json(w ? { balance: w.balance, monthSpent: w.monthSpent, monthBudget: w.monthBudget } : { balance: 0, monthSpent: 0, monthBudget: 0 });
});

/* ---------------- mutations ---------------- */
api.post('/api/projects', async (c) => {
  const d = await c.req.json<{ name: string; synopsis?: string; tone?: string; ratio?: string; res?: string; style?: string[] }>();
  const db = getDb(c.env);
  const id = 'p_' + Math.random().toString(36).slice(2, 7);
  await db.insert(S.projects).values({ id, teamId: TEAM_ID, name: d.name, tone: d.tone ?? 'a', style: d.style ?? [], ratio: d.ratio ?? '16:9', res: d.res ?? '1080p', episodes: 0, status: 'draft', synopsis: d.synopsis ?? '', members: ['u_lin'], updated: ids.now() });
  await audit(db, TEAM_ID, { actor: (await sessionUser(c)) ?? 'u_lin', action: 'project.create', target: d.name, diff: '创建项目' });
  return c.json({ id });
});

api.post('/api/episodes', async (c) => {
  const d = await c.req.json<{ projectId: string; title: string; assignee?: string | null }>();
  const db = getDb(c.env);
  const existing = await db.select().from(S.episodes).where(eq(S.episodes.project, d.projectId)).all();
  const id = 'e_' + Math.random().toString(36).slice(2, 7);
  await db.insert(S.episodes).values({ id, teamId: TEAM_ID, project: d.projectId, index: existing.length + 1, title: d.title, status: 'draft', shots: 0, done: 0, updated: ids.now(), assignee: d.assignee ?? null });
  const proj = await db.select().from(S.projects).where(eq(S.projects.id, d.projectId)).get();
  if (proj) await db.update(S.projects).set({ episodes: proj.episodes + 1, updated: ids.now() }).where(eq(S.projects.id, d.projectId));
  await audit(db, TEAM_ID, { actor: (await sessionUser(c)) ?? 'u_lin', action: 'episode.create', target: d.title, diff: '新建剧集' });
  return c.json({ id });
});

api.patch('/api/shots/:id', async (c) => {
  const id = c.req.param('id');
  const patch = await c.req.json<Record<string, unknown>>();
  const allowed: Record<string, unknown> = {};
  for (const k of ['status', 'model', 'prompt', 'params', 'chars', 'keyframe', 'assignee', 'progress', 'error', 'enhance'] as const) {
    if (k in patch) allowed[k] = patch[k];
  }
  allowed.updated = ids.now();
  await getDb(c.env).update(S.shots).set(allowed).where(and(eq(S.shots.id, id), eq(S.shots.teamId, TEAM_ID)));
  return c.json({ ok: true });
});

api.post('/api/shots/generate', async (c) => {
  const { ids: shotIds, model, total } = await c.req.json<{ ids: string[]; model: string; total: number }>();
  const db = getDb(c.env);
  const actor = (await sessionUser(c)) ?? 'u_lin';
  const ok = await hold(db, TEAM_ID, total, { type: 'generation_batch', id: shotIds.join(',') }, actor);
  if (!ok) return c.json({ error: '积分不足' }, 402);
  const per = Math.round(total / Math.max(1, shotIds.length));
  let n = 8830;
  for (const sid of shotIds) {
    const shot = await db.select().from(S.shots).where(eq(S.shots.id, sid)).get();
    if (!shot) continue;
    const cap = shot.keyframe ? 'image-to-video' : 'text-to-video';
    const taskId = `tk_${n++}`;
    let ptid = `cgt-${Math.random().toString(16).slice(2, 8)}`;
    try {
      const pt = await registry.videoProvider()!.createTask({ modelId: model, capability: cap, prompt: shot.prompt, params: shot.params, references: { characterAssetId: undefined } }, c.env);
      if (pt) ptid = pt.providerTaskId;
    } catch { /* fall back to simulation */ }
    await db.insert(S.generationTasks).values({ id: taskId, teamId: TEAM_ID, shot: sid, shotIdx: shot.index, ep: 'e3', cap, model, provider: 'volcengine', ptid, state: 'queued', progress: 0, cost: per, by: actor, created: ids.now(), updated: ids.now() });
    await db.update(S.shots).set({ status: 'queued', progress: 0, model, error: null, updated: ids.now() }).where(eq(S.shots.id, sid));
    await c.env.TASK_QUEUE.send({ taskId, teamId: TEAM_ID });
    await audit(db, TEAM_ID, { actor, action: 'shot.generate', target: `Shot #${pad2(shot.index)}`, diff: `提交 ${cap} · 预扣 ${per} 积分` });
  }
  return c.json({ ok: true });
});

api.post('/api/shots/:id/enhance', async (c) => {
  const sid = c.req.param('id');
  const { type, res, cost } = await c.req.json<{ type: string; res: string; cost: number }>();
  const db = getDb(c.env);
  const actor = (await sessionUser(c)) ?? 'u_lin';
  const shot = await db.select().from(S.shots).where(eq(S.shots.id, sid)).get();
  if (!shot) return c.json({ error: 'not found' }, 404);
  const ok = await hold(db, TEAM_ID, cost, { type: 'enhance', id: sid }, actor);
  if (!ok) return c.json({ error: '积分不足' }, 402);
  const taskId = `tk_${Math.floor(Math.random() * 9000) + 1000}`;
  await db.update(S.shots).set({ enhance: { status: 'queued', type, res, progress: 0 }, updated: ids.now() }).where(eq(S.shots.id, sid));
  await db.insert(S.generationTasks).values({ id: taskId, teamId: TEAM_ID, shot: sid, shotIdx: shot.index, ep: 'e3', cap: 'video-enhance', model: 'cv-mediakit', provider: 'volcengine', ptid: `enh-${Math.random().toString(16).slice(2, 8)}`, state: 'queued', progress: 0, cost, by: actor, created: ids.now(), updated: ids.now() });
  await c.env.TASK_QUEUE.send({ taskId, teamId: TEAM_ID });
  await audit(db, TEAM_ID, { actor, action: 'shot.enhance', target: `Shot #${pad2(shot.index)}`, diff: `视频增强 ${res} ${type} · 预扣 ${cost}` });
  return c.json({ ok: true });
});

/* ---------------- admin: seed ---------------- */
api.post('/api/_seed', async (c) => {
  if (c.req.header('x-seed-key') !== c.env.SEED_KEY) return c.json({ error: 'forbidden' }, 403);
  return c.json(await seed(getDb(c.env)));
});

api.get('/api/health', (c) => c.json({ ok: true, ts: Date.now() }));
