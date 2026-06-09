import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { eq, and, desc } from 'drizzle-orm';
import { getDb, type Env } from './env';
import * as S from './db/schema';
import { seed, TEAM_ID } from './db/seed';
import { audit, hold, ids, providerKey, refund } from './services';
import { registry, runBreakdown } from './providers';
import { encryptSecret, encKeyOf, hashPassword, verifyPassword } from './crypto';
import { ensureSchema } from './ensure-schema';
import type { Context } from 'hono';
import { models as MODELS } from '../src/lib/mock';
import type { BreakdownResult } from '../src/lib/breakdown';

const pad2 = (n: number) => String(n).padStart(2, '0');

// Map known 火山 Ark errors to a clear, actionable Chinese message for the task.
function friendlyArkError(raw: string): string {
  if (/SensitiveContent|PrivacyInformation|real person|真人/i.test(raw)) return '参考图疑似包含真人，被火山内容安全拦截。请改用非真人参考图（插画 / 场景 / AI 生成角色），或使用火山已授权的公共人像资产。';
  if (/invalid asset uri|InvalidParameter/i.test(raw)) return '参数无效：多为参考图 URL 无法公开访问或资产未注册。请用可公开访问的 https 图片链接。';
  if (/Unauthorized|InvalidApiKey|401|403|AccessDenied/i.test(raw)) return '火山 API Key 无效或无权限，请在「设置 · Provider 凭据 · 火山数据面」更新 Key。';
  if (/model/i.test(raw) && /(not|invalid|exist)/i.test(raw)) return '模型 ID 不存在或无权限，请确认你的火山模型 / 接入点 id。';
  return raw.slice(0, 220);
}

export const api = new Hono<{ Bindings: Env }>();
api.use('/api/*', cors());

// Self-heal the D1 schema once per isolate (Cloudflare Builds doesn't run
// `d1 migrations apply`, so new columns/tables would otherwise be missing in prod).
let schemaReady: Promise<unknown> | null = null;
api.use('/api/*', async (c, next) => {
  if (!schemaReady) schemaReady = ensureSchema(c.env).catch((e) => { console.error('ensureSchema failed', e); });
  await schemaReady;
  await next();
});

const sessionUser = async (c: { env: Env; req: { raw: Request } }) => {
  const sid = getCookie(c as never, 'ms_sess');
  if (!sid) return null;
  return (await c.env.SESSIONS.get(`sess:${sid}`)) ?? null;
};

const credentialKey = (env: Env, family: string) => providerKey(getDb(env), TEAM_ID, env, family);

async function startSession(c: Context<{ Bindings: Env }>, uid: string) {
  const sid = crypto.randomUUID();
  await c.env.SESSIONS.put(`sess:${sid}`, uid, { expirationTtl: 60 * 60 * 24 * 7 });
  setCookie(c, 'ms_sess', sid, { httpOnly: true, secure: true, sameSite: 'Lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
}

/* ---------------- auth ---------------- */
// Authorization = an ACTIVE membership in the team. Self-registration creates a
// 'pending' member with no access until an admin invites or approves them.
const membershipOf = (db: ReturnType<typeof getDb>, uid: string) =>
  db.select().from(S.memberships).where(and(eq(S.memberships.teamId, TEAM_ID), eq(S.memberships.userId, uid))).get();

api.post('/api/auth/login', async (c) => {
  const { email, password } = await c.req.json<{ email?: string; password?: string }>();
  if (!email?.trim() || !password) return c.json({ error: '请输入邮箱和密码' }, 400);
  const db = getDb(c.env);
  const user = await db.select().from(S.users).where(eq(S.users.email, email.trim())).get();
  if (!user || !user.passwordHash) return c.json({ error: '账号不存在或尚未设置密码，请先注册' }, 401);
  if (!(await verifyPassword(password, user.passwordHash))) return c.json({ error: '邮箱或密码错误' }, 401);
  const mem = await membershipOf(db, user.id);
  const authorized = mem?.status === 'active';
  if (authorized) { await startSession(c, user.id); await audit(db, TEAM_ID, { actor: user.id, action: 'auth.login', target: email.trim(), diff: '登录' }); }
  return c.json({ ok: true, authorized, userId: user.id });
});

api.post('/api/auth/register', async (c) => {
  const { email, password, name } = await c.req.json<{ email?: string; password?: string; name?: string }>();
  if (!email?.trim() || !/.+@.+\..+/.test(email.trim())) return c.json({ error: '请输入有效邮箱' }, 400);
  if (!password || password.length < 6) return c.json({ error: '密码至少 6 位' }, 400);
  const db = getDb(c.env);
  const hash = await hashPassword(password);
  const existing = await db.select().from(S.users).where(eq(S.users.email, email.trim())).get();
  let uid: string;
  if (existing) {
    if (existing.passwordHash) return c.json({ error: '该邮箱已注册，请直接登录' }, 409);
    // claim a pre-seeded / invited account (no password yet) by setting one.
    uid = existing.id;
    await db.update(S.users).set({ passwordHash: hash, name: name?.trim() || existing.name }).where(eq(S.users.id, uid));
  } else {
    // Bootstrap: the first account on a team with no active members becomes the owner.
    const actives = await db.select().from(S.memberships).where(and(eq(S.memberships.teamId, TEAM_ID), eq(S.memberships.status, 'active'))).all();
    const boot = actives.length === 0;
    uid = 'u_' + Math.random().toString(36).slice(2, 8);
    await db.insert(S.users).values({ id: uid, email: email.trim(), name: name?.trim() || email.trim().split('@')[0], role: boot ? 'owner' : 'creator', title: boot ? '主理人' : '注册用户', passwordHash: hash, createdAt: ids.now() });
    // Without an invite/authorization → pending (admin approves). First-ever account → active owner.
    await db.insert(S.memberships).values({ id: `mem_${uid}`, teamId: TEAM_ID, userId: uid, role: boot ? 'owner' : 'creator', status: boot ? 'active' : 'pending', projectRoles: {} });
  }
  const mem = await membershipOf(db, uid);
  const authorized = mem?.status === 'active';
  if (authorized) await startSession(c, uid);
  await audit(db, TEAM_ID, { actor: uid, action: 'auth.register', target: email.trim(), diff: existing ? '设置密码并登录' : '注册（待管理员授权）' });
  return c.json({ ok: true, authorized, userId: uid });
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

// ---- Authorization guard: everything below requires an ACTIVE membership ----
// (public: invite lookup/accept, R2 file serving, key-protected seed/migrate, health).
api.use('/api/*', async (c, next) => {
  const p = c.req.path;
  if (p.startsWith('/api/files/') || p.startsWith('/api/invites/') || p === '/api/_seed' || p === '/api/_migrate' || p === '/api/health') return next();
  const uid = await sessionUser(c);
  if (!uid) return c.json({ error: '请先登录' }, 401);
  const mem = await membershipOf(getDb(c.env), uid);
  if (mem?.status !== 'active') return c.json({ error: '账号未授权，请联系管理员邀请或授权' }, 403);
  return next();
});

/* ---------------- reads ---------------- */
api.get('/api/projects', async (c) => c.json(await getDb(c.env).select().from(S.projects).where(eq(S.projects.teamId, TEAM_ID)).all()));
api.get('/api/episodes', async (c) => c.json(await getDb(c.env).select().from(S.episodes).where(eq(S.episodes.teamId, TEAM_ID)).all()));
api.get('/api/shots', async (c) => c.json(await getDb(c.env).select().from(S.shots).where(eq(S.shots.teamId, TEAM_ID)).all()));
api.get('/api/scenes', async (c) => c.json(await getDb(c.env).select().from(S.scenes).where(eq(S.scenes.teamId, TEAM_ID)).all()));
api.get('/api/characters', async (c) => c.json(await getDb(c.env).select().from(S.characters).where(eq(S.characters.teamId, TEAM_ID)).all()));
api.get('/api/assets', async (c) => {
  const rows = await getDb(c.env).select().from(S.assets).where(eq(S.assets.teamId, TEAM_ID)).orderBy(desc(S.assets.created)).all();
  return c.json(rows.map((a) => ({ id: a.id, name: a.name ?? a.id, kind: a.kind ?? a.type, ext: a.ext ?? '', tone: a.tone ?? 'a', store: a.storeLabel ?? 'R2', size: a.sizeLabel ?? '', url: a.url ?? undefined, created: a.created })));
});
api.get('/api/members', async (c) => {
  const db = getDb(c.env);
  const ms = await db.select().from(S.memberships).where(eq(S.memberships.teamId, TEAM_ID)).all();
  const us = await db.select().from(S.users).all();
  const byId = new Map(us.map((u) => [u.id, u]));
  return c.json(ms.map((m) => {
    const u = byId.get(m.userId);
    return { id: m.userId, name: u?.name ?? m.userId, email: u?.email ?? '', role: m.role, title: u?.title ?? '', online: false, status: m.status, projectRoles: m.projectRoles ?? {} };
  }));
});
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

api.post('/api/characters', async (c) => {
  const d = await c.req.json<{ name: string; tag?: string; tone?: string; voice?: string; desc?: string; asset?: boolean; project?: string }>();
  const db = getDb(c.env);
  const id = 'c_' + Math.random().toString(36).slice(2, 7);
  await db.insert(S.characters).values({ id, teamId: TEAM_ID, project: d.project ?? 'p_qm', name: d.name, tone: d.tone ?? 'a', voice: d.voice ?? '', tag: d.tag ?? '配角', refs: 0, asset: d.asset ? `asset://qm/${id}` : '', desc: d.desc ?? '' });
  await audit(db, TEAM_ID, { actor: (await sessionUser(c)) ?? 'u_lin', action: 'character.create', target: d.name, diff: '新建角色' });
  return c.json({ id });
});

api.post('/api/assets', async (c) => {
  const d = await c.req.json<{ name: string; kind: string; ext?: string; size?: string; tone?: string; store?: string; url?: string; project?: string }>();
  const db = getDb(c.env);
  const id = 'as_' + Math.random().toString(36).slice(2, 7);
  const storeLabel = d.store ?? 'R2';
  await db.insert(S.assets).values({ id, teamId: TEAM_ID, project: d.project ?? 'p_qm', type: d.kind, storage: storeLabel === 'TOS' ? 'tos' : 'r2', url: d.url ?? null, size: 0, name: d.name, kind: d.kind, ext: d.ext ?? '', tone: d.tone ?? 'a', storeLabel, sizeLabel: d.size ?? '', created: ids.now() });
  await audit(db, TEAM_ID, { actor: (await sessionUser(c)) ?? 'u_lin', action: 'asset.upload', target: d.name, diff: `上传素材 · ${d.kind} · ${storeLabel}` });
  return c.json({ id });
});

api.patch('/api/characters/:id', async (c) => {
  const id = c.req.param('id');
  const d = await c.req.json<{ name: string; tag: string; tone: string; voice: string; desc: string; asset: boolean }>();
  const db = getDb(c.env);
  const existing = await db.select().from(S.characters).where(and(eq(S.characters.id, id), eq(S.characters.teamId, TEAM_ID))).get();
  const asset = d.asset ? (existing?.asset || `asset://qm/${id}`) : '';
  await db.update(S.characters).set({ name: d.name, tag: d.tag, tone: d.tone, voice: d.voice, desc: d.desc, asset }).where(and(eq(S.characters.id, id), eq(S.characters.teamId, TEAM_ID)));
  await audit(db, TEAM_ID, { actor: (await sessionUser(c)) ?? 'u_lin', action: 'character.update', target: d.name, diff: '编辑角色' });
  return c.json({ ok: true });
});

api.delete('/api/characters/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDb(c.env);
  const ch = await db.select().from(S.characters).where(and(eq(S.characters.id, id), eq(S.characters.teamId, TEAM_ID))).get();
  await db.delete(S.characters).where(and(eq(S.characters.id, id), eq(S.characters.teamId, TEAM_ID)));
  await audit(db, TEAM_ID, { actor: (await sessionUser(c)) ?? 'u_lin', action: 'character.delete', target: ch?.name ?? id, diff: '删除角色' });
  return c.json({ ok: true });
});

api.delete('/api/assets/:id', async (c) => {
  const id = c.req.param('id');
  const db = getDb(c.env);
  const a = await db.select().from(S.assets).where(and(eq(S.assets.id, id), eq(S.assets.teamId, TEAM_ID))).get();
  await db.delete(S.assets).where(and(eq(S.assets.id, id), eq(S.assets.teamId, TEAM_ID)));
  await audit(db, TEAM_ID, { actor: (await sessionUser(c)) ?? 'u_lin', action: 'asset.delete', target: a?.name ?? id, diff: '删除素材' });
  return c.json({ ok: true });
});

// ---- R2 upload + public serve (so 火山 Ark can fetch reference URLs) ----
api.post('/api/upload', async (c) => {
  const form = await c.req.formData();
  const entry = form.get('file');
  if (!entry || typeof entry === 'string') return c.json({ error: 'no file' }, 400);
  const file = entry as unknown as File;
  const dot = file.name.lastIndexOf('.');
  const ext = dot >= 0 ? file.name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : 'bin';
  const key = `up/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext || 'bin'}`;
  await c.env.ASSETS_BUCKET.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type || 'application/octet-stream' } });
  const url = `${new URL(c.req.url).origin}/api/files/${key}`;
  return c.json({ url, key, name: file.name, size: file.size, type: file.type });
});

api.get('/api/files/*', async (c) => {
  const key = decodeURIComponent(c.req.path.replace(/^\/api\/files\//, ''));
  const obj = await c.env.ASSETS_BUCKET.get(key);
  if (!obj) return c.json({ error: 'not found' }, 404);
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  return new Response(obj.body, { headers });
});

/* ---------------- members & RBAC ---------------- */
api.post('/api/members', async (c) => {
  const d = await c.req.json<{ email: string; role: string; name?: string; title?: string }>();
  const db = getDb(c.env);
  const actor = (await sessionUser(c)) ?? 'u_lin';
  const existingUser = await db.select().from(S.users).where(eq(S.users.email, d.email)).get();
  const uid = existingUser?.id ?? 'u_' + Math.random().toString(36).slice(2, 7);
  if (!existingUser) await db.insert(S.users).values({ id: uid, email: d.email, name: d.name?.trim() || d.email.split('@')[0], role: d.role, title: d.title ?? '受邀成员', createdAt: ids.now() });
  const mem = await db.select().from(S.memberships).where(and(eq(S.memberships.teamId, TEAM_ID), eq(S.memberships.userId, uid))).get();
  if (!mem) await db.insert(S.memberships).values({ id: `mem_${uid}`, teamId: TEAM_ID, userId: uid, role: d.role, status: 'invited', projectRoles: {} });
  const token = 'inv_' + Math.random().toString(36).slice(2, 12);
  const tm = await db.select().from(S.teams).where(eq(S.teams.id, TEAM_ID)).get();
  await db.insert(S.invites).values({ token, teamId: TEAM_ID, email: d.email, role: d.role, inviterId: actor, teamName: tm?.name ?? '工作空间', createdAt: ids.now(), expiresAt: new Date(Date.now() + 6 * 864e5).toISOString(), accepted: false });
  await audit(db, TEAM_ID, { actor, action: 'member.invite', target: d.email, diff: `邀请加入工作空间 · 角色 ${d.role}` });
  return c.json({ id: uid, token });
});

api.get('/api/invites/:token', async (c) => {
  const inv = await getDb(c.env).select().from(S.invites).where(eq(S.invites.token, c.req.param('token'))).get();
  if (!inv) return c.json(null);
  return c.json({ token: inv.token, email: inv.email, role: inv.role, inviterId: inv.inviterId, teamName: inv.teamName, createdAt: inv.createdAt, expiresAt: inv.expiresAt, accepted: inv.accepted });
});

api.post('/api/invites/:token/accept', async (c) => {
  const token = c.req.param('token');
  const d = await c.req.json<{ name?: string; password?: string }>().catch(() => ({} as { name?: string; password?: string }));
  if (!d.password || d.password.length < 6) return c.json({ error: '请设置至少 6 位的登录密码' }, 400);
  const db = getDb(c.env);
  const inv = await db.select().from(S.invites).where(eq(S.invites.token, token)).get();
  if (!inv) return c.json({ error: '邀请无效或不存在' }, 404);
  if (inv.accepted) return c.json({ error: '该邀请已被接受' }, 409);
  const hash = await hashPassword(d.password);
  const user = await db.select().from(S.users).where(eq(S.users.email, inv.email)).get();
  if (!user) return c.json({ error: '邀请用户不存在' }, 404);
  await db.update(S.invites).set({ accepted: true }).where(eq(S.invites.token, token));
  await db.update(S.users).set({ passwordHash: hash, ...(d.name?.trim() ? { name: d.name.trim() } : {}) }).where(eq(S.users.id, user.id));
  await db.update(S.memberships).set({ status: 'active' }).where(and(eq(S.memberships.teamId, inv.teamId), eq(S.memberships.userId, user.id)));
  await startSession(c, user.id);
  await audit(db, inv.teamId, { actor: user.id, action: 'member.accept', target: inv.email, diff: '接受邀请并设置密码' });
  return c.json({ ok: true, userId: user.id });
});

api.patch('/api/members/:id/project-role', async (c) => {
  const uid = c.req.param('id');
  const { projectId, role } = await c.req.json<{ projectId: string; role: string | null }>();
  const db = getDb(c.env);
  const mem = await db.select().from(S.memberships).where(and(eq(S.memberships.teamId, TEAM_ID), eq(S.memberships.userId, uid))).get();
  if (!mem) return c.json({ error: 'not found' }, 404);
  const pr: Record<string, string> = { ...(mem.projectRoles ?? {}) };
  if (role) pr[projectId] = role; else delete pr[projectId];
  await db.update(S.memberships).set({ projectRoles: pr }).where(and(eq(S.memberships.teamId, TEAM_ID), eq(S.memberships.userId, uid)));
  await audit(db, TEAM_ID, { actor: (await sessionUser(c)) ?? 'u_lin', action: 'member.project_role', target: uid, diff: role ? `项目 ${projectId} 覆盖为 ${role}` : `项目 ${projectId} 恢复继承` });
  return c.json({ ok: true });
});

api.patch('/api/members/:id', async (c) => {
  const uid = c.req.param('id');
  const { role, status } = await c.req.json<{ role?: string; status?: string }>();
  const db = getDb(c.env);
  const set: Record<string, unknown> = {};
  if (role) set.role = role;
  if (status) set.status = status;
  if (!Object.keys(set).length) return c.json({ ok: true });
  await db.update(S.memberships).set(set).where(and(eq(S.memberships.teamId, TEAM_ID), eq(S.memberships.userId, uid)));
  await audit(db, TEAM_ID, { actor: (await sessionUser(c)) ?? 'u_lin', action: status ? 'member.status' : 'member.role', target: uid, diff: status ? `状态 → ${status}` : `工作空间角色 → ${role}` });
  return c.json({ ok: true });
});

api.delete('/api/members/:id', async (c) => {
  const uid = c.req.param('id');
  const db = getDb(c.env);
  await db.delete(S.memberships).where(and(eq(S.memberships.teamId, TEAM_ID), eq(S.memberships.userId, uid)));
  await audit(db, TEAM_ID, { actor: (await sessionUser(c)) ?? 'u_lin', action: 'member.remove', target: uid, diff: '移出工作空间' });
  return c.json({ ok: true });
});

api.patch('/api/me', async (c) => {
  const uid = (await sessionUser(c)) ?? 'u_lin';
  const d = await c.req.json<{ name?: string; email?: string; title?: string }>();
  const db = getDb(c.env);
  const patch: Record<string, unknown> = {};
  for (const k of ['name', 'email', 'title'] as const) if (k in d && d[k] != null) patch[k] = d[k];
  if (Object.keys(patch).length) await db.update(S.users).set(patch).where(eq(S.users.id, uid));
  await audit(db, TEAM_ID, { actor: uid, action: 'account.update', target: uid, diff: '更新账户资料' });
  return c.json({ ok: true });
});

api.patch('/api/shots/:id', async (c) => {
  const id = c.req.param('id');
  const patch = await c.req.json<Record<string, unknown>>();
  const allowed: Record<string, unknown> = {};
  for (const k of ['status', 'model', 'prompt', 'params', 'beats', 'refs', 'videoUrl', 'chars', 'keyframe', 'assignee', 'progress', 'error', 'enhance'] as const) {
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
  // Ark key: platform-configured (火山 数据面) first, then env fallback. Null → simulate.
  const arkKey = (await credentialKey(c.env, 'video')) ?? c.env.VOLC_ARK_API_KEY ?? null;
  const created: { id: string; shot: string; ptid: string; real: boolean }[] = [];
  for (const sid of shotIds) {
    const shot = await db.select().from(S.shots).where(eq(S.shots.id, sid)).get();
    if (!shot) continue;
    const cap = shot.refs?.images?.length || shot.keyframe ? 'image-to-video' : 'text-to-video';
    const taskId = ids.uid('tk');
    let ptid = `cgt-${Math.random().toString(16).slice(2, 8)}`;
    let real = false;
    let taskError: string | null = null;
    // Per-shot references (each scene uploads its own) + first character asset for consistency.
    let charAsset: string | undefined;
    for (const cid of shot.chars ?? []) {
      const ch = await db.select().from(S.characters).where(eq(S.characters.id, cid)).get();
      if (ch?.asset) { charAsset = ch.asset; break; }
    }
    const references = { images: shot.refs?.images ?? [], videos: shot.refs?.videos ?? [], audios: shot.refs?.audios ?? [], characterAssetId: charAsset };
    try {
      const pt = await registry.videoProvider()!.createTask({ modelId: shot.model || model, capability: cap, prompt: shot.prompt, params: shot.params, references }, arkKey);
      if (pt) { ptid = pt.providerTaskId; real = true; }
    } catch (e) {
      // Real Ark submission failed — surface it on the task instead of silently simulating.
      if (arkKey) { const rawErr = String(e instanceof Error ? e.message : e); console.error('[shots/generate] Ark create failed', rawErr); taskError = friendlyArkError(rawErr); }
    }
    const initState = taskError ? 'failed' : 'queued';
    await db.insert(S.generationTasks).values({ id: taskId, teamId: TEAM_ID, shot: sid, shotIdx: shot.index, ep: shot.scene, cap, model: shot.model || model, provider: 'volcengine', ptid, state: initState, progress: 0, cost: per, by: actor, error: taskError, created: ids.now(), updated: ids.now() });
    await db.update(S.shots).set({ status: taskError ? 'failed' : 'queued', progress: 0, model: shot.model || model, error: taskError, updated: ids.now() }).where(eq(S.shots.id, sid));
    if (taskError) { await refund(db, TEAM_ID, per, { type: 'generation_task', id: taskId }); }
    else { await c.env.TASK_QUEUE.send({ taskId, teamId: TEAM_ID }); }
    await audit(db, TEAM_ID, { actor, action: 'shot.generate', target: `Shot #${pad2(shot.index)}`, diff: `提交 ${cap} · ${real ? '火山 task ' + ptid : arkKey ? '失败' : '模拟'} · 预扣 ${per} 积分` });
    created.push({ id: taskId, shot: sid, ptid, real });
  }
  return c.json({ ok: true, mode: arkKey ? 'volcengine' : 'simulation', tasks: created });
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
  const taskId = ids.uid('tk');
  await db.update(S.shots).set({ enhance: { status: 'queued', type, res, progress: 0 }, updated: ids.now() }).where(eq(S.shots.id, sid));
  await db.insert(S.generationTasks).values({ id: taskId, teamId: TEAM_ID, shot: sid, shotIdx: shot.index, ep: 'e3', cap: 'video-enhance', model: 'cv-mediakit', provider: 'volcengine', ptid: `enh-${Math.random().toString(16).slice(2, 8)}`, state: 'queued', progress: 0, cost, by: actor, created: ids.now(), updated: ids.now() });
  await c.env.TASK_QUEUE.send({ taskId, teamId: TEAM_ID });
  await audit(db, TEAM_ID, { actor, action: 'shot.enhance', target: `Shot #${pad2(shot.index)}`, diff: `视频增强 ${res} ${type} · 预扣 ${cost}` });
  return c.json({ ok: true });
});

/* ---------------- provider credentials (platform-configured keys) ---------------- */
api.get('/api/credentials', async (c) => {
  const rows = await getDb(c.env).select().from(S.providerCredentials).where(eq(S.providerCredentials.teamId, TEAM_ID)).all();
  const fam = (f: string) => { const r = rows.find((x) => x.family === f && x.secretCiphertext); return r ? { set: true, hint: r.label ?? '' } : { set: false, hint: '' }; };
  return c.json({ llm: fam('llm'), tts: fam('tts'), video: fam('video') });
});

api.put('/api/credentials/:family', async (c) => {
  const family = c.req.param('family');
  const { apiKey, provider } = await c.req.json<{ apiKey?: string; provider?: string }>();
  if (!apiKey?.trim()) return c.json({ error: 'apiKey required' }, 400);
  const db = getDb(c.env);
  const ciphertext = await encryptSecret(encKeyOf(c.env), apiKey.trim());
  const hint = '••••' + apiKey.trim().slice(-4);
  const existing = await db.select().from(S.providerCredentials).where(and(eq(S.providerCredentials.teamId, TEAM_ID), eq(S.providerCredentials.family, family))).get();
  if (existing) await db.update(S.providerCredentials).set({ secretCiphertext: ciphertext, label: hint, provider: provider ?? existing.provider }).where(eq(S.providerCredentials.id, existing.id));
  else await db.insert(S.providerCredentials).values({ id: 'pc_' + Math.random().toString(36).slice(2, 8), teamId: TEAM_ID, provider: provider ?? family, family, label: hint, secretCiphertext: ciphertext, isDefault: true, created: ids.now() });
  await audit(db, TEAM_ID, { actor: (await sessionUser(c)) ?? 'u_lin', action: 'credential.write', target: family, diff: '更新 API Key（密文）' });
  return c.json({ ok: true, hint });
});

api.delete('/api/credentials/:family', async (c) => {
  const family = c.req.param('family');
  const db = getDb(c.env);
  await db.delete(S.providerCredentials).where(and(eq(S.providerCredentials.teamId, TEAM_ID), eq(S.providerCredentials.family, family)));
  await audit(db, TEAM_ID, { actor: (await sessionUser(c)) ?? 'u_lin', action: 'credential.delete', target: family, diff: '删除凭据' });
  return c.json({ ok: true });
});

/* ---------------- 智能分镜 (LLM breakdown) ---------------- */
api.post('/api/breakdown', async (c) => {
  const input = await c.req.json<{ script: string; providerId?: string; style?: 'openai' | 'anthropic'; model: string; baseUrl: string; systemPrompt: string }>();
  if (!input.script?.trim()) return c.json({ error: '剧本为空' }, 400);
  const family = input.providerId ? `llm_${input.providerId}` : 'llm';
  const apiKey = (await credentialKey(c.env, family)) ?? c.env.LLM_API_KEY ?? c.env.ZENMUX_API_KEY ?? null;
  try {
    return c.json(await runBreakdown(input, apiKey));
  } catch (e) {
    return c.json({ error: String(e) }, 502);
  }
});

api.post('/api/breakdown/apply', async (c) => {
  const { episodeId, result } = await c.req.json<{ episodeId: string; result: BreakdownResult }>();
  const db = getDb(c.env);
  const actor = (await sessionUser(c)) ?? 'u_lin';
  const chars = await db.select().from(S.characters).where(eq(S.characters.teamId, TEAM_ID)).all();
  const nameToId = (n: string) => chars.find((x) => x.name === n)?.id ?? n;
  const tones = ['b', 'a', 'c', 'd'];
  // replace this episode's scenes + their shots
  const oldScenes = await db.select().from(S.scenes).where(and(eq(S.scenes.teamId, TEAM_ID), eq(S.scenes.episode, episodeId))).all();
  for (const sc of oldScenes) await db.delete(S.shots).where(and(eq(S.shots.teamId, TEAM_ID), eq(S.shots.scene, sc.id)));
  await db.delete(S.scenes).where(and(eq(S.scenes.teamId, TEAM_ID), eq(S.scenes.episode, episodeId)));
  let idx = 1, sceneCount = 0, shotCount = 0;
  for (let si = 0; si < result.scenes.length; si++) {
    const sc = result.scenes[si];
    const sceneId = 'sc_' + Math.random().toString(36).slice(2, 8);
    const cids = sc.characters.map(nameToId);
    await db.insert(S.scenes).values({ id: sceneId, teamId: TEAM_ID, episode: episodeId, index: si + 1, title: sc.title, loc: sc.loc, mood: sc.mood, time: sc.time, chars: cids });
    sceneCount++;
    for (const sh of sc.shots) {
      await db.insert(S.shots).values({
        id: 'sh_' + Math.random().toString(36).slice(2, 8), teamId: TEAM_ID, scene: sceneId, index: idx++, status: 'draft', model: 'seedance-2.0', chars: cids, keyframe: false, assignee: null, tone: tones[si % 4], progress: 0, error: null,
        prompt: { visual: sh.visual, dialogue: sh.dialogue, voiceover: sh.voiceover, soundEffects: sh.soundEffects, cameraPosition: sh.cameraPosition, cameraMovement: sh.cameraMovement },
        params: { resolution: '1080p', ratio: '16:9', duration: sh.duration, generateAudio: false, webSearch: false, watermark: false },
        beats: null, refs: null, videoUrl: null, enhance: null, updated: ids.now(),
      });
      shotCount++;
    }
  }
  await db.update(S.episodes).set({ shots: shotCount, done: 0, updated: ids.now() }).where(and(eq(S.episodes.id, episodeId), eq(S.episodes.teamId, TEAM_ID)));
  await audit(db, TEAM_ID, { actor, action: 'breakdown.apply', target: episodeId, diff: `应用智能分镜 · ${sceneCount} 场 ${shotCount} 镜头` });
  return c.json({ scenes: sceneCount, shots: shotCount });
});

/* ---------------- admin: schema repair + seed ---------------- */
// Idempotently provision/repair the D1 schema (covers missing migration columns
// when deploying via Cloudflare Builds, which doesn't run `d1 migrations apply`).
api.post('/api/_migrate', async (c) => {
  if (c.req.header('x-seed-key') !== c.env.SEED_KEY) return c.json({ error: 'forbidden' }, 403);
  return c.json(await ensureSchema(c.env));
});

api.post('/api/_seed', async (c) => {
  if (c.req.header('x-seed-key') !== c.env.SEED_KEY) return c.json({ error: 'forbidden' }, 403);
  await ensureSchema(c.env);
  return c.json(await seed(getDb(c.env)));
});

api.get('/api/health', (c) => c.json({ ok: true, ts: Date.now() }));
