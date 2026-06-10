// Data layer. Talks to the Cloudflare Worker API (`/api/*`); when no backend is
// reachable (e.g. plain `vite dev` with no worker) it transparently falls back
// to an in-memory store + polling simulation so the UI still works.
import * as mock from './mock';
import { heuristicBreakdown, type BreakdownResult } from './breakdown';
import type { Asset, Character, Episode, GenerationTask, Invite, Member, Project, Role, Scene, Shot, ShotRefs, Wallet, Capability } from './types';

const API = '/api';
let useMock: boolean | null = null;

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(API + path, { headers: { 'Content-Type': 'application/json' }, credentials: 'include', ...opts });
  // Not logged in / not authorized → drop the client auth flag and bounce to login.
  if (r.status === 401 || r.status === 403) {
    try { localStorage.removeItem('ms.auth'); } catch { /* ignore */ }
    if (typeof location !== 'undefined' && location.pathname !== '/login') location.href = '/login';
    throw new Error(`${r.status}`);
  }
  if (!r.ok) throw new Error(`${r.status}`);
  return (await r.json()) as T;
}
async function remoteOrLocal<T>(remote: () => Promise<T>, local: () => T | Promise<T>): Promise<T> {
  if (useMock === true) return local();
  try { const v = await remote(); useMock = false; return v; }
  catch { useMock = true; return local(); }
}

// Auth must NOT fall back to a fake "success" on an HTTP error (that's the
// no-password bypass). Only a genuine network failure (no backend) → demo mode.
async function authPost<T>(path: string, body: unknown): Promise<T> {
  if (useMock === true) return { ok: true } as T;
  let r: Response;
  try { r = await fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) }); }
  catch { useMock = true; return { ok: true } as T; }
  useMock = false;
  if (!r.ok) { const e = (await r.json().catch(() => ({}))) as { error?: string }; throw new Error(e.error || `登录失败 (${r.status})`); }
  return (await r.json()) as T;
}

// ---- in-memory fallback store ----
const store = {
  shots: mock.shots.map((s) => ({ ...s })) as Shot[],
  tasks: mock.tasks.map((t) => ({ ...t })) as GenerationTask[],
  wallet: { ...mock.wallet } as Wallet,
  projects: mock.projects.map((p) => ({ ...p })),
  episodes: mock.episodes.map((e) => ({ ...e })),
  characters: mock.characters.map((c) => ({ ...c })) as Character[],
  assets: mock.assets.map((a) => ({ ...a })) as Asset[],
  members: mock.members.map((m) => ({ ...m })) as Member[],
  invites: [] as Invite[],
  scenes: mock.scenes.map((s) => ({ ...s })) as Scene[],
  creds: { llm: { set: false, hint: '' }, tts: { set: false, hint: '' }, video: { set: false, hint: '' }, cv: { set: false, hint: '' }, mediakit: { set: false, hint: '' } } as Record<string, { set: boolean; hint: string }>,
};

export type CredStatus = Record<string, { set: boolean; hint: string }>;
export type AuthResult = { ok: boolean; authorized?: boolean; userId?: string };
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

export const api = {
  async login(email: string, password: string) { return authPost<AuthResult>('/auth/login', { email, password }); },
  async register(data: { email: string; password: string; name?: string }) { return authPost<AuthResult>('/auth/register', data); },

  async listProjects() { return remoteOrLocal(() => req<Project[]>('/projects'), () => clone(store.projects)); },
  async listEpisodes() { return remoteOrLocal(() => req<Episode[]>('/episodes'), () => clone(store.episodes)); },
  async listShots() { return remoteOrLocal(() => req<Shot[]>('/shots'), () => clone(store.shots)); },
  async listCharacters() { return remoteOrLocal(() => req<Character[]>('/characters'), () => clone(store.characters)); },
  async listAssets() { return remoteOrLocal(() => req<Asset[]>('/assets'), () => clone(store.assets)); },
  async listMembers() { return remoteOrLocal(() => req<Member[]>('/members'), () => clone(store.members)); },
  async listScenes() { return remoteOrLocal(() => req<Scene[]>('/scenes'), () => clone(store.scenes)); },
  async getCredentials() { return remoteOrLocal(() => req<CredStatus>('/credentials'), () => clone(store.creds)); },

  async uploadFile(file: File): Promise<{ url: string; key: string; name: string; size: number; type: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return remoteOrLocal(
      async () => {
        const r = await fetch(API + '/upload', { method: 'POST', body: fd, credentials: 'include' });
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json() as Promise<{ url: string; key: string; name: string; size: number; type: string }>;
      },
      () => ({ url: `https://demo.local/${encodeURIComponent(file.name)}`, key: file.name, name: file.name, size: file.size, type: file.type }),
    );
  },

  async saveCredential(family: string, apiKey: string) {
    const hint = '••••' + apiKey.trim().slice(-4);
    return remoteOrLocal(
      () => req<{ ok: boolean; hint: string }>(`/credentials/${family}`, { method: 'PUT', body: JSON.stringify({ apiKey }) }),
      () => { store.creds[family] = { set: true, hint }; return { ok: true, hint }; },
    );
  },

  async deleteCredential(family: string) {
    return remoteOrLocal(
      () => req(`/credentials/${family}`, { method: 'DELETE' }),
      () => { store.creds[family] = { set: false, hint: '' }; return { ok: true }; },
    );
  },

  async breakdown(input: { script: string; providerId: string; style: 'openai' | 'anthropic'; model: string; baseUrl: string; systemPrompt: string }): Promise<BreakdownResult> {
    return remoteOrLocal(
      () => req<BreakdownResult>('/breakdown', { method: 'POST', body: JSON.stringify(input) }),
      () => heuristicBreakdown(input.script),
    );
  },

  async applyBreakdown(episodeId: string, result: BreakdownResult): Promise<{ scenes: number; shots: number }> {
    return remoteOrLocal(
      () => req<{ scenes: number; shots: number }>('/breakdown/apply', { method: 'POST', body: JSON.stringify({ episodeId, result }) }),
      () => localApplyBreakdown(episodeId, result),
    );
  },
  async listTasks() { return remoteOrLocal(() => req<GenerationTask[]>('/tasks'), () => clone(store.tasks)); },
  async getWallet() { return remoteOrLocal(() => req<Wallet>('/wallet'), () => clone(store.wallet)); },

  async updateShot(id: string, patch: Partial<Shot>) {
    return remoteOrLocal(
      () => req(`/shots/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      () => { store.shots = store.shots.map((s) => (s.id === id ? { ...s, ...patch } : s)); return { ok: true }; },
    );
  },

  async addProject(data: { name: string; synopsis: string; tone: string; ratio: string; res: string; style: string[] }): Promise<string> {
    return remoteOrLocal(
      async () => (await req<{ id: string }>('/projects', { method: 'POST', body: JSON.stringify(data) })).id,
      () => {
        const id = 'p_' + Math.random().toString(36).slice(2, 7);
        store.projects = [{ id, name: data.name, tone: data.tone as never, style: data.style, ratio: data.ratio, res: data.res, episodes: 0, status: 'draft', updated: new Date().toISOString(), synopsis: data.synopsis, members: [mock.me.id] }, ...store.projects];
        return id;
      },
    );
  },

  async addEpisode(projectId: string, data: { title: string; assignee: string | null }): Promise<string> {
    return remoteOrLocal(
      async () => (await req<{ id: string }>('/episodes', { method: 'POST', body: JSON.stringify({ projectId, ...data }) })).id,
      () => {
        const idx = store.episodes.filter((e) => e.project === projectId).length + 1;
        const id = 'e_' + Math.random().toString(36).slice(2, 7);
        store.episodes = [...store.episodes, { id, project: projectId, index: idx, title: data.title, status: 'draft', shots: 0, done: 0, updated: new Date().toISOString(), assignee: data.assignee }];
        store.projects = store.projects.map((p) => (p.id === projectId ? { ...p, episodes: p.episodes + 1 } : p));
        return id;
      },
    );
  },

  async saveScript(episodeId: string, script: string) {
    return remoteOrLocal(
      () => req(`/episodes/${episodeId}/script`, { method: 'PUT', body: JSON.stringify({ script }) }),
      () => { store.episodes = store.episodes.map((e) => (e.id === episodeId ? { ...e, script, updated: new Date().toISOString() } : e)); return { ok: true }; },
    );
  },

  async addCharacter(data: { name: string; tag: string; tone: string; voice: string; desc: string; assetUrl?: string; project?: string }): Promise<string> {
    return remoteOrLocal(
      async () => (await req<{ id: string }>('/characters', { method: 'POST', body: JSON.stringify(data) })).id,
      () => {
        const id = 'c_' + Math.random().toString(36).slice(2, 7);
        store.characters = [{ id, name: data.name, project: data.project || 'p_qm', tone: data.tone as never, voice: data.voice, tag: data.tag, refs: 0, asset: (data.assetUrl ?? '').trim(), desc: data.desc }, ...store.characters];
        return id;
      },
    );
  },

  async addAsset(data: { name: string; kind: Asset['kind']; ext: string; size: string; tone: string; store?: string; url?: string }): Promise<string> {
    return remoteOrLocal(
      async () => (await req<{ id: string }>('/assets', { method: 'POST', body: JSON.stringify(data) })).id,
      () => {
        const id = 'as_' + Math.random().toString(36).slice(2, 7);
        store.assets = [{ id, name: data.name, kind: data.kind, ext: data.ext, tone: data.tone as never, store: data.store ?? 'R2', size: data.size, url: data.url, created: new Date().toISOString() }, ...store.assets];
        return id;
      },
    );
  },

  async updateCharacter(id: string, data: { name: string; tag: string; tone: string; voice: string; desc: string; assetUrl?: string }) {
    return remoteOrLocal(
      () => req(`/characters/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
      () => {
        store.characters = store.characters.map((c) => (c.id === id
          ? { ...c, name: data.name, tag: data.tag, tone: data.tone as never, voice: data.voice, desc: data.desc, asset: (data.assetUrl ?? '').trim() }
          : c));
        return { ok: true };
      },
    );
  },

  async deleteCharacter(id: string) {
    return remoteOrLocal(
      () => req(`/characters/${id}`, { method: 'DELETE' }),
      () => { store.characters = store.characters.filter((c) => c.id !== id); return { ok: true }; },
    );
  },

  async deleteAsset(id: string) {
    return remoteOrLocal(
      () => req(`/assets/${id}`, { method: 'DELETE' }),
      () => { store.assets = store.assets.filter((a) => a.id !== id); return { ok: true }; },
    );
  },

  async inviteMember(data: { email: string; role: Role; name?: string; title?: string }): Promise<{ id: string; token: string }> {
    return remoteOrLocal(
      () => req<{ id: string; token: string }>('/members', { method: 'POST', body: JSON.stringify(data) }),
      () => {
        const id = 'u_' + Math.random().toString(36).slice(2, 7);
        const token = 'inv_' + Math.random().toString(36).slice(2, 12);
        const name = data.name?.trim() || data.email.split('@')[0];
        store.members = [...store.members, { id, name, email: data.email, role: data.role, title: data.title || '受邀成员', online: false, status: 'invited', projectRoles: {} }];
        store.invites = [{ token, email: data.email, role: data.role, inviterId: mock.me.id, teamName: mock.team.name, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 6 * 864e5).toISOString(), accepted: false }, ...store.invites];
        return { id, token };
      },
    );
  },

  async getInvite(token: string): Promise<Invite | null> {
    return remoteOrLocal(
      () => req<Invite | null>(`/invites/${token}`),
      () => clone(store.invites.find((i) => i.token === token) ?? null),
    );
  },

  async acceptInvite(token: string, data: { name?: string; password: string }) {
    return authPost<AuthResult>(`/invites/${token}/accept`, data);
  },

  async removeMember(id: string) {
    return remoteOrLocal(
      () => req(`/members/${id}`, { method: 'DELETE' }),
      () => { store.members = store.members.filter((m) => m.id !== id); return { ok: true }; },
    );
  },

  async setMemberRole(id: string, role: Role) {
    return remoteOrLocal(
      () => req(`/members/${id}`, { method: 'PATCH', body: JSON.stringify({ role }) }),
      () => { store.members = store.members.map((m) => (m.id === id ? { ...m, role } : m)); return { ok: true }; },
    );
  },

  async setMemberStatus(id: string, status: 'active' | 'invited' | 'pending') {
    return remoteOrLocal(
      () => req(`/members/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
      () => { store.members = store.members.map((m) => (m.id === id ? { ...m, status } : m)); return { ok: true }; },
    );
  },

  async setProjectRole(id: string, projectId: string, role: Role | null) {
    return remoteOrLocal(
      () => req(`/members/${id}/project-role`, { method: 'PATCH', body: JSON.stringify({ projectId, role }) }),
      () => {
        store.members = store.members.map((m) => {
          if (m.id !== id) return m;
          const pr = { ...(m.projectRoles ?? {}) };
          if (role) pr[projectId] = role; else delete pr[projectId];
          return { ...m, projectRoles: pr };
        });
        return { ok: true };
      },
    );
  },

  async updateMe(data: { name?: string; email?: string; title?: string }) {
    return remoteOrLocal(
      () => req('/me', { method: 'PATCH', body: JSON.stringify(data) }),
      () => { store.members = store.members.map((m) => (m.id === mock.me.id ? { ...m, ...data } : m)); return { ok: true }; },
    );
  },

  async submitGenerate(
    shotIds: string[],
    params: { model: string; resolution?: string; ratio?: string; duration?: number | 'smart'; generateAudio?: boolean; watermark?: boolean },
    total: number,
    refs?: Record<string, ShotRefs>,
    charIds?: string[],
  ) {
    return remoteOrLocal(
      () => req('/shots/generate', { method: 'POST', body: JSON.stringify({ ids: shotIds, model: params.model, params, refs, total, charIds }) }),
      () => { localGenerate(shotIds, params, total); return { ok: true }; },
    );
  },

  async submitEnhance(shotId: string, params: { type: string; res: string }, cost: number) {
    return remoteOrLocal(
      () => req(`/shots/${shotId}/enhance`, { method: 'POST', body: JSON.stringify({ ...params, cost }) }),
      () => { localEnhance(shotId, params, cost); return { ok: true }; },
    );
  },
};

// ---- fallback mutations ----
const TONES = ['b', 'a', 'c', 'd'] as const;
function localApplyBreakdown(episodeId: string, result: BreakdownResult): { scenes: number; shots: number } {
  const nameToId = (name: string) => store.characters.find((c) => c.name === name)?.id ?? name;
  const rid = () => Math.random().toString(36).slice(2, 8);
  const oldScenes = new Set(store.scenes.filter((s) => s.episode === episodeId).map((s) => s.id));
  store.shots = store.shots.filter((s) => !oldScenes.has(s.scene));
  store.scenes = store.scenes.filter((s) => s.episode !== episodeId);
  const newScenes: Scene[] = [];
  const newShots: Shot[] = [];
  let idx = 1;
  result.scenes.forEach((sc, si) => {
    const sceneId = `sc_${rid()}`;
    const chars = sc.characters.map(nameToId);
    newScenes.push({ id: sceneId, episode: episodeId, title: sc.title, loc: sc.loc, mood: sc.mood, time: sc.time, chars });
    sc.shots.forEach((sh) => {
      newShots.push({
        id: `sh_${rid()}`, scene: sceneId, index: idx++, status: 'draft', model: 'seedance-2.0', chars, keyframe: false, assignee: null, tone: TONES[si % 4],
        prompt: { visual: sh.visual, dialogue: sh.dialogue, voiceover: sh.voiceover, soundEffects: sh.soundEffects, cameraPosition: sh.cameraPosition, cameraMovement: sh.cameraMovement },
        params: { resolution: '1080p', ratio: '16:9', duration: sh.duration, generateAudio: false, webSearch: false, watermark: false },
      });
    });
  });
  store.scenes = [...store.scenes, ...newScenes];
  store.shots = [...store.shots, ...newShots];
  store.episodes = store.episodes.map((e) => (e.id === episodeId ? { ...e, shots: newShots.length, done: 0 } : e));
  return { scenes: newScenes.length, shots: newShots.length };
}

function localGenerate(ids: string[], params: { model: string }, total: number) {
  store.wallet.balance -= total;
  store.wallet.monthSpent += total;
  const per = Math.round(total / Math.max(1, ids.length));
  store.shots = store.shots.map((s) => (ids.includes(s.id) ? { ...s, status: 'queued', progress: 0, model: params.model, error: null } : s));
  let n = 8830;
  const newTasks: GenerationTask[] = ids.map((sid, i) => {
    const sh = store.shots.find((s) => s.id === sid);
    const cap: Capability = sh && sh.keyframe ? 'image-to-video' : 'text-to-video';
    return { id: `tk_${n + i}`, shot: sid, shotIdx: sh ? sh.index : 0, ep: 'e3', cap, model: params.model, state: 'queued', progress: 0, cost: per, by: mock.me.id, created: new Date().toISOString(), ptid: `cgt-${Math.random().toString(16).slice(2, 8)}` };
  });
  store.tasks = [...newTasks, ...store.tasks];
}
function localEnhance(shotId: string, params: { type: string; res: string }, cost: number) {
  store.wallet.balance -= cost;
  store.wallet.monthSpent += cost;
  store.shots = store.shots.map((s) => (s.id === shotId ? { ...s, enhance: { status: 'queued', type: params.type, res: params.res, progress: 0 } } : s));
  const sh = store.shots.find((s) => s.id === shotId);
  store.tasks = [{ id: `tk_${Math.floor(Math.random() * 9000) + 1000}`, shot: shotId, shotIdx: sh ? sh.index : 0, ep: 'e3', cap: 'video-enhance', model: 'cv-mediakit', state: 'queued', progress: 0, cost, by: mock.me.id, created: new Date().toISOString(), ptid: `enh-${Math.random().toString(16).slice(2, 8)}` }, ...store.tasks];
}

// ---- fallback polling simulation (mirrors the Queue/Cron worker) ----
let started = false;
export function startSimulation() {
  if (started) return;
  started = true;
  setInterval(() => {
    if (useMock === false) return; // backend is driving task state
    const shotPatch: Record<string, Partial<Shot> & { __enh?: Shot['enhance'] }> = {};
    let next = store.tasks.map((tk) => {
      if (tk.state === 'running') {
        const np = Math.min(100, (tk.progress || 0) + 7 + Math.random() * 11);
        const enh = tk.cap === 'video-enhance';
        if (np >= 100) { shotPatch[tk.shot] = enh ? { __enh: { status: 'succeeded', progress: 100 } } : { status: 'generated', progress: 100, keyframe: true, videoUrl: `https://demo.cdn/manju/${tk.shot}.mp4` }; return { ...tk, state: 'succeeded' as const, progress: 100, videoUrl: enh ? tk.videoUrl : `https://demo.cdn/manju/${tk.shot}.mp4` }; }
        shotPatch[tk.shot] = enh ? { __enh: { status: 'processing', progress: Math.round(np) } } : { status: 'running', progress: Math.round(np) };
        return { ...tk, progress: Math.round(np) };
      }
      return tk;
    });
    const slots = Math.max(0, 2 - next.filter((t) => t.state === 'running').length);
    let promoted = 0;
    next = next.map((tk) => {
      if (tk.state === 'queued' && promoted < slots) { promoted++; const enh = tk.cap === 'video-enhance'; shotPatch[tk.shot] = enh ? { __enh: { status: 'processing', progress: 5 } } : { status: 'running', progress: 5 }; return { ...tk, state: 'running' as const, progress: 5 }; }
      return tk;
    });
    store.tasks = next;
    if (Object.keys(shotPatch).length) {
      store.shots = store.shots.map((s) => {
        const p = shotPatch[s.id];
        if (!p) return s;
        if (p.__enh) return { ...s, enhance: { ...(s.enhance || { status: 'idle' }), ...p.__enh } };
        return { ...s, ...p };
      });
    }
  }, 850);
}
