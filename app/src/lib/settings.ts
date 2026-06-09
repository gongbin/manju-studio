// Workspace settings — editable default generation params, storage backend
// (Cloudflare R2 ↔ 火山 TOS), and per-model billing rules. Persisted to
// localStorage (demo); the same shape can be promoted to a D1 settings table.
// Pricing rules drive 计费: 火山 Seedance ≈ ¥1/s @1080p, scaled by resolution.
import { useSyncExternalStore } from 'react';

export interface PricingRule {
  yuanPerSecond: number;            // 基准单价：参考分辨率(1080p)下 ¥/秒
  resMult: Record<string, number>;  // 分辨率倍率
  audioSurcharge: number;           // 生成音频加价（0.15 = +15%）
}
export interface GenDefaults {
  model: string;
  resolution: string;
  ratio: string;
  duration: number | 'smart';
  generateAudio: boolean;
  watermark: boolean;
}
export interface StorageSettings {
  backend: 'r2' | 'tos';
  tosBucket: string;
  tosRegion: string;
}
export interface Settings {
  defaults: GenDefaults;
  storage: StorageSettings;
  creditsPerYuan: number;           // 100 → 1 积分 = ¥0.01
  pricing: Record<string, PricingRule>;
}

const RES_MULT = { '480p': 0.4, '720p': 0.7, '1080p': 1, '2K': 1.6, '4K': 2.2 };
function defaultPricing(): Record<string, PricingRule> {
  return {
    'seedance-2.0': { yuanPerSecond: 1.0, resMult: { ...RES_MULT }, audioSurcharge: 0.15 },
    'seedance-2.0-fast': { yuanPerSecond: 0.5, resMult: { ...RES_MULT }, audioSurcharge: 0.15 },
    'seedance-lite': { yuanPerSecond: 0.2, resMult: { ...RES_MULT }, audioSurcharge: 0 },
  };
}
const DEFAULTS: Settings = {
  defaults: { model: 'seedance-2.0', resolution: '480p', ratio: 'adaptive', duration: 'smart', generateAudio: true, watermark: true },
  storage: { backend: 'r2', tosBucket: 'manju-assets', tosRegion: 'cn-beijing' },
  creditsPerYuan: 100,
  pricing: defaultPricing(),
};

const KEY = 'ms.settings';
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function load(): Settings {
  try {
    const raw = typeof localStorage !== 'undefined' && localStorage.getItem(KEY);
    if (!raw) return clone(DEFAULTS);
    const p = JSON.parse(raw) as Partial<Settings>;
    return {
      ...DEFAULTS, ...p,
      defaults: { ...DEFAULTS.defaults, ...p.defaults },
      storage: { ...DEFAULTS.storage, ...p.storage },
      pricing: { ...defaultPricing(), ...(p.pricing ?? {}) },
    };
  } catch { return clone(DEFAULTS); }
}

let state: Settings = load();
const subs = new Set<() => void>();
function commit(next: Settings) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  subs.forEach((f) => f());
}

export const settingsStore = {
  get: () => state,
  subscribe: (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; },
  setDefaults: (patch: Partial<GenDefaults>) => commit({ ...state, defaults: { ...state.defaults, ...patch } }),
  setStorage: (patch: Partial<StorageSettings>) => commit({ ...state, storage: { ...state.storage, ...patch } }),
  setCreditsPerYuan: (n: number) => commit({ ...state, creditsPerYuan: Math.max(1, n || 1) }),
  setRule: (modelId: string, patch: Partial<PricingRule>) => commit({ ...state, pricing: { ...state.pricing, [modelId]: { ...ruleFor(state, modelId), ...patch } } }),
  setResMult: (modelId: string, res: string, mult: number) => {
    const r = ruleFor(state, modelId);
    commit({ ...state, pricing: { ...state.pricing, [modelId]: { ...r, resMult: { ...r.resMult, [res]: mult } } } });
  },
  reset: () => commit(clone(DEFAULTS)),
};

export function useSettings(): Settings {
  return useSyncExternalStore(settingsStore.subscribe, settingsStore.get, settingsStore.get);
}

/* ---------------- pricing helpers ---------------- */
export function ruleFor(s: Settings, modelId: string): PricingRule {
  return s.pricing[modelId] ?? { yuanPerSecond: 1, resMult: { ...RES_MULT }, audioSurcharge: 0.15 };
}
export function priceYuan(rule: PricingRule, durationSec: number, res: string, audio: boolean): number {
  const m = rule.resMult[res] ?? 1;
  return rule.yuanPerSecond * durationSec * m * (1 + (audio ? rule.audioSurcharge : 0));
}
export function yuanToCredits(s: Settings, yuan: number): number {
  return Math.round(yuan * s.creditsPerYuan);
}
export const STORAGE_LABEL: Record<StorageSettings['backend'], string> = { r2: 'Cloudflare R2', tos: '火山 TOS' };
export const STORAGE_SHORT: Record<StorageSettings['backend'], string> = { r2: 'R2', tos: 'TOS' };
