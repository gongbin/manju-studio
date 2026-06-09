// Workspace settings — editable default generation params, storage backend
// (Cloudflare R2 ↔ 火山 TOS), and per-model billing rules. Persisted to
// localStorage (demo); the same shape can be promoted to a D1 settings table.
// Pricing rules drive 计费: 火山 Seedance ≈ ¥1/s @1080p, scaled by resolution.
import { useSyncExternalStore } from 'react';
import { DEFAULT_BREAKDOWN_PROMPT } from './breakdown';

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
export interface GeneralSettings {
  workspaceName: string;
  locale: 'zh-CN' | 'en-US';
  timezone: string;
}
/** Non-secret config for a pluggable provider (key is encrypted server-side). */
export interface ProviderConfig {
  baseUrl: string;
  model: string;
}
/** One pluggable LLM source — add as many as you want and switch freely. */
export interface LlmProvider {
  id: string;
  name: string;
  style: 'openai' | 'anthropic';   // request format: OpenAI-compatible vs Anthropic-native
  baseUrl: string;
  model: string;
}
export interface BreakdownSettings {
  systemPrompt: string;
  model: string;                    // active model id (overrides the provider's default)
}
export interface Settings {
  general: GeneralSettings;
  defaults: GenDefaults;
  storage: StorageSettings;
  llm: { providers: LlmProvider[]; activeId: string };
  tts: ProviderConfig;
  breakdown: BreakdownSettings;
  creditsPerYuan: number;           // 100 → 1 积分 = ¥0.01
  pricing: Record<string, PricingRule>;
}
/** Server-side credential family key for an LLM provider. */
export const llmFamily = (id: string) => `llm_${id}`;

const RES_MULT = { '480p': 0.4, '720p': 0.7, '1080p': 1, '2K': 1.6, '4K': 2.2 };
function defaultPricing(): Record<string, PricingRule> {
  return {
    'seedance-2.0': { yuanPerSecond: 1.0, resMult: { ...RES_MULT }, audioSurcharge: 0.15 },
    'seedance-2.0-fast': { yuanPerSecond: 0.5, resMult: { ...RES_MULT }, audioSurcharge: 0.15 },
    'seedance-lite': { yuanPerSecond: 0.2, resMult: { ...RES_MULT }, audioSurcharge: 0 },
  };
}
// Seeded sources cover the common open-source setups; users add/remove/edit freely.
const DEFAULT_LLMS: LlmProvider[] = [
  { id: 'zenmux', name: 'ZenMux（聚合网关）', style: 'openai', baseUrl: 'https://zenmux.ai/api/v1', model: 'anthropic/claude-sonnet-4' },
  { id: 'openai', name: 'OpenAI · ChatGPT', style: 'openai', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o' },
  { id: 'anthropic', name: 'Anthropic · Claude', style: 'anthropic', baseUrl: 'https://api.anthropic.com', model: 'claude-sonnet-4-20250514' },
  { id: 'deepseek', name: 'DeepSeek', style: 'openai', baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
];
const DEFAULTS: Settings = {
  general: { workspaceName: '青冥工作室', locale: 'zh-CN', timezone: 'Asia/Shanghai' },
  defaults: { model: 'seedance-2.0', resolution: '480p', ratio: 'adaptive', duration: 'smart', generateAudio: true, watermark: true },
  storage: { backend: 'r2', tosBucket: 'manju-assets', tosRegion: 'cn-beijing' },
  llm: { providers: DEFAULT_LLMS.map((p) => ({ ...p })), activeId: 'zenmux' },
  tts: { baseUrl: 'https://api.openai.com/v1', model: 'tts-1' },
  breakdown: { systemPrompt: DEFAULT_BREAKDOWN_PROMPT, model: 'anthropic/claude-sonnet-4' },
  creditsPerYuan: 100,
  pricing: defaultPricing(),
};

const KEY = 'ms.settings';
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function load(): Settings {
  try {
    const raw = typeof localStorage !== 'undefined' && localStorage.getItem(KEY);
    if (!raw) return clone(DEFAULTS);
    const p = JSON.parse(raw) as Partial<Settings> & { providers?: { llm?: ProviderConfig; tts?: ProviderConfig } };
    const llm = p.llm?.providers?.length
      ? { providers: p.llm.providers, activeId: p.llm.activeId || p.llm.providers[0].id }
      : clone(DEFAULTS.llm);
    return {
      ...DEFAULTS, ...p,
      general: { ...DEFAULTS.general, ...p.general },
      defaults: { ...DEFAULTS.defaults, ...p.defaults },
      storage: { ...DEFAULTS.storage, ...p.storage },
      llm,
      tts: { ...DEFAULTS.tts, ...(p.tts ?? p.providers?.tts) },
      breakdown: { ...DEFAULTS.breakdown, ...p.breakdown },
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
  setGeneral: (patch: Partial<GeneralSettings>) => commit({ ...state, general: { ...state.general, ...patch } }),
  setDefaults: (patch: Partial<GenDefaults>) => commit({ ...state, defaults: { ...state.defaults, ...patch } }),
  setStorage: (patch: Partial<StorageSettings>) => commit({ ...state, storage: { ...state.storage, ...patch } }),
  setTts: (patch: Partial<ProviderConfig>) => commit({ ...state, tts: { ...state.tts, ...patch } }),
  setBreakdown: (patch: Partial<BreakdownSettings>) => commit({ ...state, breakdown: { ...state.breakdown, ...patch } }),
  // ---- LLM sources (multi-provider) ----
  setActiveLlm: (id: string) => {
    const prov = state.llm.providers.find((x) => x.id === id);
    commit({ ...state, llm: { ...state.llm, activeId: id }, breakdown: { ...state.breakdown, model: prov?.model ?? state.breakdown.model } });
  },
  addLlmProvider: (p: Omit<LlmProvider, 'id'>) => {
    const id = 'llm_' + Math.random().toString(36).slice(2, 7);
    commit({ ...state, llm: { providers: [...state.llm.providers, { ...p, id }], activeId: id }, breakdown: { ...state.breakdown, model: p.model } });
    return id;
  },
  updateLlmProvider: (id: string, patch: Partial<Omit<LlmProvider, 'id'>>) => commit({ ...state, llm: { ...state.llm, providers: state.llm.providers.map((x) => (x.id === id ? { ...x, ...patch } : x)) } }),
  removeLlmProvider: (id: string) => {
    const providers = state.llm.providers.filter((x) => x.id !== id);
    if (!providers.length) return;
    const activeId = state.llm.activeId === id ? providers[0].id : state.llm.activeId;
    commit({ ...state, llm: { providers, activeId } });
  },
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

/* ---------------- helpers ---------------- */
export function activeLlm(s: Settings): LlmProvider {
  return s.llm.providers.find((p) => p.id === s.llm.activeId) ?? s.llm.providers[0];
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
