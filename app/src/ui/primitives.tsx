import type { ReactNode } from 'react';
import { Icon } from './icon';
import { SHOT_STATUS, type StatusMeta } from '@/lib/status';

const AV_COLORS = ['#e8623d', '#7c5cf0', '#3b7ff0', '#119e94', '#d4a017', '#d6457f', '#5b8def', '#46b96a'];

export function Avatar({ name = '?', size = 24 }: { name?: string; size?: number }) {
  const isCJK = /[一-龥]/.test(name);
  const init = name.replace(/\s/g, '').slice(0, isCJK ? 1 : 2);
  const color = AV_COLORS[(name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % AV_COLORS.length];
  return (
    <span className="av" title={name} style={{ width: size, height: size, fontSize: size * 0.42, background: `linear-gradient(140deg, ${color}, ${color}bb)` }}>
      {init.toUpperCase()}
    </span>
  );
}

export function AvatarStack({ names = [], size = 22, max = 4 }: { names?: string[]; size?: number; max?: number }) {
  const show = names.slice(0, max);
  const extra = names.length - show.length;
  return (
    <span className="row" style={{ paddingLeft: 4 }}>
      {show.map((n, i) => (
        <span key={i} style={{ marginLeft: -6, border: '1.5px solid var(--surface)', borderRadius: '50%', display: 'inline-flex' }}>
          <Avatar name={n} size={size} />
        </span>
      ))}
      {extra > 0 && (
        <span className="av" style={{ marginLeft: -6, width: size, height: size, fontSize: 10, background: 'var(--surface-4)', color: 'var(--text-2)', border: '1.5px solid var(--surface)' }}>+{extra}</span>
      )}
    </span>
  );
}

export function StatusPill({ status, map = SHOT_STATUS, mono }: { status: string; map?: Record<string, StatusMeta>; mono?: boolean }) {
  const m = map[status] || { label: status, c: 'var(--text-2)', bg: 'var(--surface-3)' };
  return (
    <span className={'pill' + (mono ? ' mono' : '')} style={{ color: m.c, background: m.bg }}>
      <span className="dot" style={m.live ? { animation: 'pulse 1.2s infinite' } : undefined} />
      {m.label}
    </span>
  );
}

export function Thumb({ w = '100%', h = 64, label = '', tone = 'a', rounded = 8, playable }: { w?: number | string; h?: number | string; label?: string; tone?: string; rounded?: number; playable?: boolean }) {
  const tones: Record<string, string> = { a: 'var(--thumb-a)', b: 'var(--thumb-b)', c: 'var(--thumb-c)', d: 'var(--thumb-d)' };
  return (
    <div className="thumb" data-label={label || undefined} style={{ width: w, height: h, borderRadius: rounded, ['--tc' as string]: tones[tone] || tones.a }}>
      {playable && <span className="play"><Icon name="play" size={13} /></span>}
    </div>
  );
}

export function Empty({ icon = 'film', title, sub, action }: { icon?: string; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="center" style={{ padding: '56px 20px', textAlign: 'center' }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--surface-2)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', color: 'var(--text-3)', marginBottom: 14 }}>
        <Icon name={icon} size={24} />
      </div>
      <div style={{ fontWeight: 600, fontSize: 15 }}>{title}</div>
      {sub && <div className="muted" style={{ marginTop: 5, fontSize: 13, maxWidth: 340 }}>{sub}</div>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}
