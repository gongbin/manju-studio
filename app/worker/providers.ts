// Provider abstraction (docs §3). Video / LLM / TTS are independent, pluggable
// families. VolcengineProvider is the first video implementation; new vendors
// implement the same interface and self-register — business code is untouched.
import type { Env } from './env';
import { breakdownMessages, heuristicBreakdown, normalizeBreakdown, parseJsonLoose, type BreakdownResult } from '../src/lib/breakdown';

export type Capability = 'text-to-video' | 'image-to-video' | 'text-to-image' | 'video-enhance' | 'text-to-speech';
export type ProviderState = 'queued' | 'running' | 'succeeded' | 'failed';

export interface GenerateInput {
  modelId: string;
  capability: Capability;
  prompt: { visual?: string; dialogue?: string; voiceover?: string; soundEffects?: string; cameraPosition?: string; cameraMovement?: string };
  params: { resolution?: string; ratio?: string; duration?: number; generateAudio?: boolean; watermark?: boolean };
  references?: { images?: string[]; videos?: string[]; audios?: string[]; characterAssetId?: string };
}

export interface ProviderTask {
  providerTaskId: string;
  state: ProviderState;
  progress?: number;
  videoUrl?: string;
  error?: string;
}

export interface VideoProvider {
  readonly name: string;
  readonly capabilities: Capability[];
  /** Returns null when no real credential is configured (caller falls back to simulation). */
  createTask(input: GenerateInput, env: Env): Promise<ProviderTask | null>;
  getTask(providerTaskId: string, env: Env): Promise<ProviderTask>;
}

const ARK_BASE = 'https://ark.cn-beijing.volces.com/api/v3';

export class VolcengineProvider implements VideoProvider {
  readonly name = 'volcengine';
  readonly capabilities: Capability[] = ['text-to-video', 'image-to-video', 'text-to-image', 'video-enhance'];

  async createTask(input: GenerateInput, env: Env): Promise<ProviderTask | null> {
    const key = env.VOLC_ARK_API_KEY;
    if (!key) return null; // no credential → simulate in the queue consumer

    const content: unknown[] = [{ type: 'text', text: this.composePrompt(input.prompt) }];
    for (const url of input.references?.images ?? []) content.push({ type: 'image_url', image_url: { url }, role: 'reference_image' });
    for (const url of input.references?.videos ?? []) content.push({ type: 'video_url', video_url: { url }, role: 'reference_video' });
    for (const url of input.references?.audios ?? []) content.push({ type: 'audio_url', audio_url: { url }, role: 'reference_audio' });
    if (input.references?.characterAssetId) {
      const id = input.references.characterAssetId.startsWith('asset://') ? input.references.characterAssetId : `asset://${input.references.characterAssetId}`;
      content.push({ type: 'image_url', image_url: { url: id }, role: 'reference_image' });
    }

    const res = await fetch(`${ARK_BASE}/contents/generations/tasks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: input.modelId,
        content,
        generate_audio: !!input.params.generateAudio,
        ratio: input.params.ratio ?? 'adaptive',
        duration: input.params.duration ?? 5,
        watermark: input.params.watermark !== false,
      }),
    });
    if (!res.ok) throw new Error(`Ark create failed: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as { id: string };
    return { providerTaskId: data.id, state: 'queued', progress: 0 };
  }

  async getTask(providerTaskId: string, env: Env): Promise<ProviderTask> {
    const key = env.VOLC_ARK_API_KEY!;
    const res = await fetch(`${ARK_BASE}/contents/generations/tasks/${providerTaskId}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) throw new Error(`Ark get failed: ${res.status}`);
    const d = (await res.json()) as { status: string; content?: { video_url?: string }; error?: { message?: string } };
    const map: Record<string, ProviderState> = { queued: 'queued', running: 'running', succeeded: 'succeeded', failed: 'failed' };
    return {
      providerTaskId,
      state: map[d.status] ?? 'running',
      progress: d.status === 'succeeded' ? 100 : d.status === 'running' ? 50 : 10,
      videoUrl: d.content?.video_url,
      error: d.error?.message,
    };
  }

  private composePrompt(p: GenerateInput['prompt']): string {
    return [p.visual, p.cameraPosition && `机位: ${p.cameraPosition}`, p.cameraMovement && `运镜: ${p.cameraMovement}`, p.soundEffects && `音效: ${p.soundEffects}`]
      .filter(Boolean)
      .join('，');
  }
}

/* ---------------- LLM provider (OpenAI-compatible, e.g. ZenMux) ---------------- */
const llmKey = (env: Env) => env.LLM_API_KEY || env.ZENMUX_API_KEY;

/** One-shot chat completion against any OpenAI-compatible endpoint (ZenMux 默认). */
export async function llmChat(env: Env, opts: { baseUrl: string; model: string; messages: { role: string; content: string }[]; jsonMode?: boolean }): Promise<string> {
  const key = llmKey(env);
  if (!key) throw new Error('no LLM key');
  const base = (opts.baseUrl || 'https://zenmux.ai/api/v1').replace(/\/$/, '');
  const body: Record<string, unknown> = { model: opts.model, messages: opts.messages, temperature: 0.7 };
  if (opts.jsonMode) body.response_format = { type: 'json_object' };
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? '';
}

/** 智能分镜: call the LLM when a key is configured, else fall back to the heuristic split. */
export async function runBreakdown(env: Env, input: { script: string; model: string; baseUrl: string; systemPrompt: string }): Promise<BreakdownResult> {
  if (!llmKey(env)) return heuristicBreakdown(input.script);
  const messages = breakdownMessages(input.systemPrompt, input.script);
  let content: string;
  try {
    content = await llmChat(env, { baseUrl: input.baseUrl, model: input.model, messages, jsonMode: true });
  } catch {
    // Some models/endpoints reject response_format — retry plain. Real errors here surface to the caller.
    content = await llmChat(env, { baseUrl: input.baseUrl, model: input.model, messages });
  }
  return normalizeBreakdown(parseJsonLoose(content));
}

class Registry {
  private video = new Map<string, VideoProvider>();
  registerVideo(p: VideoProvider) { this.video.set(p.name, p); return this; }
  videoProvider(name = 'volcengine') { return this.video.get(name); }
}

export const registry = new Registry().registerVideo(new VolcengineProvider());
