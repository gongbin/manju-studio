export interface StatusMeta { label: string; c: string; bg: string; live?: boolean }

export const SHOT_STATUS: Record<string, StatusMeta> = {
  draft: { label: '待生成', c: 'var(--st-draft)', bg: 'var(--st-draft-bg)' },
  queued: { label: '排队中', c: 'var(--st-queued)', bg: 'var(--st-queued-bg)' },
  running: { label: '生成中', c: 'var(--st-running)', bg: 'var(--st-running-bg)', live: true },
  generated: { label: '已生成', c: 'var(--st-done)', bg: 'var(--st-done-bg)' },
  failed: { label: '失败', c: 'var(--st-failed)', bg: 'var(--st-failed-bg)' },
  review: { label: '待审', c: 'var(--st-review)', bg: 'var(--st-review-bg)' },
  approved: { label: '通过', c: 'var(--st-done)', bg: 'var(--st-done-bg)' },
  dubbed: { label: '已配音', c: 'var(--st-dubbed)', bg: 'var(--st-dubbed-bg)' },
};

export const EP_STATUS: Record<string, StatusMeta> = {
  draft: { label: '草稿', c: 'var(--st-draft)', bg: 'var(--st-draft-bg)' },
  producing: { label: '制作中', c: 'var(--st-running)', bg: 'var(--st-running-bg)' },
  review: { label: '待审', c: 'var(--st-review)', bg: 'var(--st-review-bg)' },
  published: { label: '已发布', c: 'var(--st-published)', bg: 'var(--st-published-bg)' },
};

export const TASK_STATUS: Record<string, StatusMeta> = {
  queued: { label: 'queued', c: 'var(--st-queued)', bg: 'var(--st-queued-bg)' },
  running: { label: 'running', c: 'var(--st-running)', bg: 'var(--st-running-bg)', live: true },
  succeeded: { label: 'succeeded', c: 'var(--st-done)', bg: 'var(--st-done-bg)' },
  failed: { label: 'failed', c: 'var(--st-failed)', bg: 'var(--st-failed-bg)' },
};
