// Provider abstraction (docs §3). Video / LLM / TTS are independent, pluggable
// families. VolcengineProvider is the first video implementation; new vendors
// implement the same interface and self-register — business code is untouched.
import { breakdownMessages, heuristicBreakdown, normalizeBreakdown, parseJsonLoose, DEFAULT_BREAKDOWN_PROMPT, type BreakdownResult } from '../src/lib/breakdown';

export type Capability = 'text-to-video' | 'image-to-video' | 'text-to-image' | 'video-enhance' | 'text-to-speech';
export type ProviderState = 'queued' | 'running' | 'succeeded' | 'failed';

export interface GenerateInput {
  modelId: string;
  capability: Capability;
  prompt: { visual?: string; dialogue?: string; voiceover?: string; soundEffects?: string; cameraPosition?: string; cameraMovement?: string };
  params: { resolution?: string; ratio?: string; duration?: number; generateAudio?: boolean; watermark?: boolean; webSearch?: boolean };
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
  /** Returns null when no API key is available (caller falls back to simulation). */
  createTask(input: GenerateInput, apiKey: string | null): Promise<ProviderTask | null>;
  getTask(providerTaskId: string, apiKey: string): Promise<ProviderTask>;
}

const ARK_BASE = 'https://ark.cn-beijing.volces.com/api/v3';
// Internal model id → real 火山方舟 Ark model id (matches seedance-app). Already-real
// ids (doubao-* / ep-*) pass through, so users can also pick a custom endpoint id.
const ARK_MODEL: Record<string, string> = {
  'seedance-2.0': 'doubao-seedance-2-0-260128',
  'seedance-2.0-fast': 'doubao-seedance-2-0-fast-260128',
};
const arkModelId = (id: string) => (/^(doubao-|ep-)/i.test(id) ? id : ARK_MODEL[id] ?? id);

export class VolcengineProvider implements VideoProvider {
  readonly name = 'volcengine';
  readonly capabilities: Capability[] = ['text-to-video', 'image-to-video', 'text-to-image', 'video-enhance'];

  async createTask(input: GenerateInput, apiKey: string | null): Promise<ProviderTask | null> {
    if (!apiKey) return null; // no credential → simulate in the queue consumer

    // Ark only accepts publicly-resolvable URLs (https) or a registered asset:// uri.
    // Drop placeholders like `upload://name` and demo `asset://qm/...` (unregistered)
    // — otherwise Ark returns 400 "invalid asset uri".
    const ok = (u: string) => /^https?:\/\//i.test(u);
    const content: unknown[] = [{ type: 'text', text: this.composePrompt(input.prompt) }];
    for (const url of (input.references?.images ?? []).filter(ok)) content.push({ type: 'image_url', image_url: { url }, role: 'reference_image' });
    for (const url of (input.references?.videos ?? []).filter(ok)) content.push({ type: 'video_url', video_url: { url }, role: 'reference_video' });
    for (const url of (input.references?.audios ?? []).filter(ok)) content.push({ type: 'audio_url', audio_url: { url }, role: 'reference_audio' });
    const charRef = input.references?.characterAssetId;
    if (charRef && ok(charRef)) content.push({ type: 'image_url', image_url: { url: charRef }, role: 'reference_image' });

    const p = input.params;
    const body: Record<string, unknown> = {
      model: arkModelId(input.modelId),
      content,
      generate_audio: !!p.generateAudio,
      resolution: p.resolution ?? '480p',
      ratio: p.ratio ?? 'adaptive',
      duration: p.duration ?? 5,
      watermark: p.watermark !== false,
    };
    if (p.webSearch) body.tools = [{ type: 'web_search' }];
    console.log('[ark] create', JSON.stringify({ model: body.model, resolution: body.resolution, ratio: body.ratio, duration: body.duration, generate_audio: body.generate_audio, watermark: body.watermark, injectedRefs: content.length - 1, promptChars: (content[0] as { text: string }).text.length }));

    const res = await fetch(`${ARK_BASE}/contents/generations/tasks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) { const t = await res.text(); console.error('[ark] create failed', res.status, t.slice(0, 500)); throw new Error(`Ark create ${res.status}: ${t.slice(0, 300)}`); }
    const data = (await res.json()) as { id: string };
    console.log('[ark] created task', data.id);
    return { providerTaskId: data.id, state: 'queued', progress: 0 };
  }

  async getTask(providerTaskId: string, apiKey: string): Promise<ProviderTask> {
    const res = await fetch(`${ARK_BASE}/contents/generations/tasks/${providerTaskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`Ark get ${res.status}: ${(await res.text()).slice(0, 200)}`);
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

  // Structured prompt → 火山 tag format (matches seedance-app's combined prompt).
  private composePrompt(p: GenerateInput['prompt']): string {
    const parts: string[] = [];
    if (p.visual?.trim()) parts.push(`<画面提示词>${p.visual.trim()}`);
    if (p.dialogue?.trim()) parts.push(`<对话>${p.dialogue.trim()}`);
    if (p.voiceover?.trim()) parts.push(`<旁白>${p.voiceover.trim()}`);
    if (p.soundEffects?.trim()) parts.push(`<音效>${p.soundEffects.trim()}`);
    if (p.cameraPosition?.trim()) parts.push(`<机位>${p.cameraPosition.trim()}`);
    if (p.cameraMovement?.trim()) parts.push(`<运镜>${p.cameraMovement.trim()}`);
    return parts.join('\n');
  }
}

/* ---------------- LLM provider (OpenAI-compatible, e.g. ZenMux) ---------------- */

/** One-shot chat completion against any OpenAI-compatible endpoint (ZenMux 默认). */
export async function llmChat(opts: { apiKey: string; baseUrl: string; model: string; messages: { role: string; content: string }[]; jsonMode?: boolean }): Promise<string> {
  const base = (opts.baseUrl || 'https://zenmux.ai/api/v1').replace(/\/$/, '');
  const body: Record<string, unknown> = { model: opts.model, messages: opts.messages, temperature: 0.7 };
  if (opts.jsonMode) body.response_format = { type: 'json_object' };
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${opts.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? '';
}

/** Anthropic-native chat (Claude direct) — different endpoint/headers/shape than OpenAI. */
export async function anthropicChat(opts: { apiKey: string; baseUrl: string; model: string; system: string; user: string }): Promise<string> {
  const base = (opts.baseUrl || 'https://api.anthropic.com').replace(/\/$/, '');
  const res = await fetch(`${base}/v1/messages`, {
    method: 'POST',
    headers: { 'x-api-key': opts.apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: opts.model, max_tokens: 4096, system: opts.system, messages: [{ role: 'user', content: opts.user }] }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { content?: { text?: string }[] };
  return (data.content ?? []).map((c) => c.text ?? '').join('');
}

/** 智能分镜: call the active LLM source (by style) when a key is available, else heuristic split. */
export async function runBreakdown(input: { script: string; model: string; baseUrl: string; systemPrompt: string; style?: 'openai' | 'anthropic' }, apiKey: string | null): Promise<BreakdownResult> {
  if (!apiKey) return heuristicBreakdown(input.script);
  const system = input.systemPrompt || DEFAULT_BREAKDOWN_PROMPT;
  let content: string;
  if (input.style === 'anthropic') {
    content = await anthropicChat({ apiKey, baseUrl: input.baseUrl, model: input.model, system, user: `剧本如下：\n\n${input.script}` });
  } else {
    const messages = breakdownMessages(input.systemPrompt, input.script);
    try {
      content = await llmChat({ apiKey, baseUrl: input.baseUrl, model: input.model, messages, jsonMode: true });
    } catch {
      // Some models/endpoints reject response_format — retry plain. Real errors here surface to the caller.
      content = await llmChat({ apiKey, baseUrl: input.baseUrl, model: input.model, messages });
    }
  }
  return normalizeBreakdown(parseJsonLoose(content));
}

class Registry {
  private video = new Map<string, VideoProvider>();
  registerVideo(p: VideoProvider) { this.video.set(p.name, p); return this; }
  videoProvider(name = 'volcengine') { return this.video.get(name); }
}

export const registry = new Registry().registerVideo(new VolcengineProvider());
