// Data layer. Talks to the Cloudflare Worker API (`/api/*`); when no backend is
// reachable (e.g. plain `vite dev` with no worker) it transparently falls back
// to an in-memory store + polling simulation so the UI still works.
import * as mock from './mock';
import type { Episode, GenerationTask, Project, Shot, Wallet, Capability } from './types';

const API = '/api';
let useMock: boolean | null = null;

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(API + path, { headers: { 'Content-Type': 'application/json' }, credentials: 'include', ...opts });
  if (!r.ok) throw new Error(`${r.status}`);
  return (await r.json()) as T;
}
async function remoteOrLocal<T>(remote: () => Promise<T>, local: () => T | Promise<T>): Promise<T> {
  if (useMock === true) return local();
  try { const v = await remote(); useMock = false; return v; }
  catch { useMock = true; return local(); }
}

// ---- in-memory fallback store ----
const store = {
  shots: mock.shots.map((s) => ({ ...s })) as Shot[],
  tasks: mock.tasks.map((t) => ({ ...t })) as GenerationTask[],
  wallet: { ...mock.wallet } as Wallet,
  projects: mock.projects.map((p) => ({ ...p })),
  episodes: mock.episodes.map((e) => ({ ...e })),
};
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

export const api = {
  async login(email: string) { return remoteOrLocal(() => req('/auth/login', { method: 'POST', body: JSON.stringify({ email }) }), () => ({ ok: true })); },

  async listProjects() { return remoteOrLocal(() => req<Project[]>('/projects'), () => clone(store.projects)); },
  async listEpisodes() { return remoteOrLocal(() => req<Episode[]>('/episodes'), () => clone(store.episodes)); },
  async listShots() { return remoteOrLocal(() => req<Shot[]>('/shots'), () => clone(store.shots)); },
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

  async submitGenerate(shotIds: string[], params: { model: string }, total: number) {
    return remoteOrLocal(
      () => req('/shots/generate', { method: 'POST', body: JSON.stringify({ ids: shotIds, model: params.model, total }) }),
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
        if (np >= 100) { shotPatch[tk.shot] = enh ? { __enh: { status: 'succeeded', progress: 100 } } : { status: 'generated', progress: 100, keyframe: true }; return { ...tk, state: 'succeeded' as const, progress: 100 }; }
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
