// 火山 AI MediaKit 视频画质增强 — Bearer-token REST API (cn-beijing).
// Reuses the 火山方舟 data-plane API Key (same Bearer key as video generation).
//   submit → task_id ; poll GET /tasks/{id} → status + result.video_url.
const MEDIAKIT_HOST = 'https://mediakit.cn-beijing.volces.com';

interface EnhanceResult { video_url?: string; resolution?: string; tool_version?: string }
interface TaskResponse {
  success?: boolean;
  task_id?: string;
  status?: string;
  result?: EnhanceResult;
  message?: string;
  error?: string | { message?: string };
}

function errMsg(d: TaskResponse, fallback: string): string {
  if (typeof d.error === 'string') return d.error;
  if (d.error?.message) return d.error.message;
  return d.message || fallback;
}

/** Submit an enhancement task. `scene` defaults to 'aigc' (these shots are AI-generated). Returns task_id. */
export async function submitEnhance(apiKey: string, opts: { videoUrl: string; scene?: string; targetRes: string }): Promise<string> {
  const res = await fetch(`${MEDIAKIT_HOST}/api/v1/tools/enhance-video`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ video_url: opts.videoUrl, scene: opts.scene ?? 'aigc', resolution: opts.targetRes.toLowerCase() }),
  });
  const text = await res.text();
  let data: TaskResponse;
  try { data = JSON.parse(text); } catch { throw new Error(`MediaKit ${res.status}: ${text.slice(0, 200)}`); }
  if (!res.ok || data.success === false) throw new Error(errMsg(data, `MediaKit ${res.status}`));
  const taskId = data.task_id;
  if (!taskId) throw new Error('MediaKit: no task_id returned');
  console.log('[mediakit] submit enhance task', taskId);
  return taskId;
}

export interface EnhanceStatus {
  state: 'queued' | 'processing' | 'succeeded' | 'failed';
  progress: number;
  videoUrl?: string;
  error?: string;
}

export async function getEnhance(apiKey: string, taskId: string): Promise<EnhanceStatus> {
  const res = await fetch(`${MEDIAKIT_HOST}/api/v1/tasks/${encodeURIComponent(taskId)}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const text = await res.text();
  let data: TaskResponse;
  try { data = JSON.parse(text); } catch { return { state: 'failed', progress: 0, error: `MediaKit ${res.status}` }; }
  if (!res.ok || data.success === false) return { state: 'failed', progress: 0, error: errMsg(data, '增强失败') };
  const status = String(data.status ?? '').toLowerCase();
  if (status === 'completed' || status === 'success' || status === 'succeeded') {
    return { state: 'succeeded', progress: 100, videoUrl: data.result?.video_url };
  }
  if (status === 'failed' || status === 'error' || status === 'cancelled') {
    return { state: 'failed', progress: 0, error: errMsg(data, '增强失败') };
  }
  if (status === 'running' || status === 'processing') return { state: 'processing', progress: 50 };
  return { state: 'queued', progress: 10 }; // pending / queued / unknown
}
