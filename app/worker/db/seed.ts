// Seed the demo workspace into D1 from the shared mock dataset (src/lib/mock).
// Invoked once via POST /api/_seed. Idempotent: clears then re-inserts.
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as S from './schema';
import * as mock from '../../src/lib/mock';

export const TEAM_ID = 't_qm';

export async function seed(db: DrizzleD1Database<typeof S>) {
  const now = new Date().toISOString();

  // wipe (order doesn't matter — no FKs enforced)
  for (const t of [S.teams, S.users, S.memberships, S.projects, S.episodes, S.characters, S.scenes, S.shots, S.generationTasks, S.assets, S.creditWallets, S.creditTransactions, S.auditLogs, S.providerCredentials]) {
    await db.delete(t);
  }

  await db.insert(S.teams).values({ id: TEAM_ID, name: mock.team.name, slug: mock.team.slug, plan: mock.team.plan, createdAt: now });

  await db.insert(S.users).values(mock.members.map((m) => ({ id: m.id, email: m.email, name: m.name, role: m.role, title: m.title, createdAt: now })));
  await db.insert(S.memberships).values(mock.members.map((m) => ({ id: `mem_${m.id}`, teamId: TEAM_ID, userId: m.id, role: m.role })));

  await db.insert(S.creditWallets).values({ teamId: TEAM_ID, balance: mock.wallet.balance, monthSpent: mock.wallet.monthSpent, monthBudget: mock.wallet.monthBudget });

  await db.insert(S.projects).values(mock.projects.map((p) => ({ id: p.id, teamId: TEAM_ID, name: p.name, tone: p.tone, style: p.style, ratio: p.ratio, res: p.res, episodes: p.episodes, status: p.status, synopsis: p.synopsis, members: p.members, updated: p.updated })));

  await db.insert(S.episodes).values(mock.episodes.map((e) => ({ id: e.id, teamId: TEAM_ID, project: e.project, index: e.index, title: e.title, status: e.status, shots: e.shots, done: e.done, updated: e.updated, assignee: e.assignee })));

  await db.insert(S.characters).values(mock.characters.map((c) => ({ id: c.id, teamId: TEAM_ID, project: c.project, name: c.name, tone: c.tone, voice: c.voice, tag: c.tag, refs: c.refs, asset: c.asset, desc: c.desc })));

  await db.insert(S.scenes).values(mock.scenes.map((sc, i) => ({ id: sc.id, teamId: TEAM_ID, episode: 'e3', index: i + 1, title: sc.title, loc: sc.loc, mood: sc.mood, time: sc.time, chars: sc.chars })));

  await db.insert(S.shots).values(mock.shots.map((s) => ({ id: s.id, teamId: TEAM_ID, scene: s.scene, index: s.index, status: s.status, model: s.model, chars: s.chars, keyframe: s.keyframe, assignee: s.assignee, tone: s.tone, progress: s.progress ?? 0, error: s.error ?? null, prompt: s.prompt, params: s.params, enhance: s.enhance ?? null, updated: now })));

  await db.insert(S.generationTasks).values(mock.tasks.map((t) => ({ id: t.id, teamId: TEAM_ID, shot: t.shot, shotIdx: t.shotIdx, ep: t.ep, cap: t.cap, model: t.model, provider: 'volcengine', ptid: t.ptid, state: t.state, progress: t.progress, cost: t.cost, by: t.by, error: t.error ?? null, created: t.created, updated: now })));

  await db.insert(S.auditLogs).values(mock.audit.map((a) => ({ id: a.id, teamId: TEAM_ID, actor: a.actor, action: a.action, target: a.target, diff: a.diff, src: a.src, time: a.time })));

  await db.insert(S.providerCredentials).values([
    { id: 'pc_volc', teamId: TEAM_ID, provider: 'volcengine', family: 'video', label: '火山方舟 Volcengine', isDefault: true, created: now },
    { id: 'pc_claude', teamId: TEAM_ID, provider: 'anthropic', family: 'llm', label: 'Anthropic · Claude', isDefault: true, created: now },
    { id: 'pc_tts', teamId: TEAM_ID, provider: 'openai-compatible', family: 'tts', label: '自建 TTS', isDefault: true, created: now },
  ]);

  return { ok: true, team: TEAM_ID };
}
