// 火山 CV MediaKit 视频画质增强 (control-plane, AK/SK signed) — ports seedance-app.
// Credential is stored as "ak:sk". submit → TaskId; poll → status + enhanced VideoUrl.
import { signCv } from './volc-sign';

const CV_HOST = 'https://cv.volcengineapi.com';
const VERSION = '2023-07-01';
const ENHANCE_MODE: Record<string, string> = { standard: 'standard', professional: 'professional', 'ai-model': 'ai_model' };

function splitAkSk(akSk: string): [string, string] {
  const i = akSk.indexOf(':');
  return i < 0 ? [akSk, ''] : [akSk.slice(0, i), akSk.slice(i + 1)];
}

async function cvCall(akSk: string, action: string, bodyData: Record<string, unknown>): Promise<{ Result?: Record<string, unknown>; Error?: { Message?: string } }> {
  const [ak, sk] = splitAkSk(akSk);
  const params = { Action: action, Version: VERSION };
  const body = JSON.stringify(bodyData);
  const headers = await signCv(ak, sk, 'POST', '/', params, body);
  const res = await fetch(`${CV_HOST}/?Action=${action}&Version=${VERSION}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body,
  });
  const text = await res.text();
  let data: { Result?: Record<string, unknown>; Error?: { Message?: string } };
  try { data = JSON.parse(text); } catch { throw new Error(`CV ${res.status}: ${text.slice(0, 200)}`); }
  if (!res.ok && !data.Error) throw new Error(`CV ${res.status}: ${text.slice(0, 200)}`);
  return data;
}

export async function submitEnhance(akSk: string, opts: { videoUrl: string; type: string; targetRes: string }): Promise<string> {
  const data = await cvCall(akSk, 'SubmitVideoEnhanceTask', {
    VideoUrl: opts.videoUrl,
    EnhanceMode: ENHANCE_MODE[opts.type] ?? 'standard',
    TargetResolution: opts.targetRes.toLowerCase(),
  });
  if (data.Error) throw new Error(data.Error.Message || 'CV submit error');
  const taskId = data.Result?.TaskId as string | undefined;
  if (!taskId) throw new Error('CV: no TaskId returned');
  console.log('[cv] submit enhance task', taskId);
  return taskId;
}

export interface EnhanceStatus {
  state: 'queued' | 'processing' | 'succeeded' | 'failed';
  progress: number;
  videoUrl?: string;
  error?: string;
}
export async function getEnhance(akSk: string, taskId: string): Promise<EnhanceStatus> {
  const data = await cvCall(akSk, 'GetVideoEnhanceTask', { TaskId: taskId });
  if (data.Error) return { state: 'failed', progress: 0, error: data.Error.Message || '增强失败' };
  const r = data.Result ?? {};
  const status = String(r.Status ?? '');
  if (status === 'Success') return { state: 'succeeded', progress: 100, videoUrl: r.VideoUrl as string | undefined };
  if (status === 'Failed') return { state: 'failed', progress: 0, error: (r.ErrorMessage as string) || '增强失败' };
  if (status === 'Processing') return { state: 'processing', progress: Number(r.Progress ?? 50) };
  return { state: 'queued', progress: 10 };
}
