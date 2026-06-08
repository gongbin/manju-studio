/* ui.jsx — shared primitives. Exports to window. */
(function () {
  const { useState, useEffect, useRef } = React;
  const Icon = window.Icon;

  // ---------- shot / episode status meta ----------
  const SHOT_STATUS = {
    draft:     { label: '待生成', c: 'var(--st-draft)',   bg: 'var(--st-draft-bg)' },
    queued:    { label: '排队中', c: 'var(--st-queued)',  bg: 'var(--st-queued-bg)' },
    running:   { label: '生成中', c: 'var(--st-running)', bg: 'var(--st-running-bg)', live: true },
    generated: { label: '已生成', c: 'var(--st-done)',    bg: 'var(--st-done-bg)' },
    failed:    { label: '失败',   c: 'var(--st-failed)',  bg: 'var(--st-failed-bg)' },
    review:    { label: '待审',   c: 'var(--st-review)',  bg: 'var(--st-review-bg)' },
    approved:  { label: '通过',   c: 'var(--st-done)',    bg: 'var(--st-done-bg)' },
    dubbed:    { label: '已配音', c: 'var(--st-dubbed)',  bg: 'var(--st-dubbed-bg)' },
  };
  const EP_STATUS = {
    draft:     { label: '草稿',   c: 'var(--st-draft)',   bg: 'var(--st-draft-bg)' },
    producing: { label: '制作中', c: 'var(--st-running)', bg: 'var(--st-running-bg)' },
    review:    { label: '待审',   c: 'var(--st-review)',  bg: 'var(--st-review-bg)' },
    published: { label: '已发布', c: 'var(--st-published)', bg: 'var(--st-published-bg)' },
  };
  const TASK_STATUS = {
    queued:    { label: 'queued',    c: 'var(--st-queued)',  bg: 'var(--st-queued-bg)' },
    running:   { label: 'running',   c: 'var(--st-running)', bg: 'var(--st-running-bg)', live: true },
    succeeded: { label: 'succeeded', c: 'var(--st-done)',    bg: 'var(--st-done-bg)' },
    failed:    { label: 'failed',    c: 'var(--st-failed)',  bg: 'var(--st-failed-bg)' },
  };

  function StatusPill({ status, map = SHOT_STATUS, mono }) {
    const m = (map || SHOT_STATUS)[status] || { label: status, c: 'var(--text-2)', bg: 'var(--surface-3)' };
    return (
      <span className={'pill' + (mono ? ' mono' : '')} style={{ color: m.c, background: m.bg }}>
        <span className="dot" style={m.live ? { animation: 'pulse 1.2s infinite' } : null}></span>
        {m.label}
      </span>
    );
  }

  // ---------- avatar ----------
  const AV_COLORS = ['#e8623d','#7c5cf0','#3b7ff0','#119e94','#d4a017','#d6457f','#5b8def','#46b96a'];
  function Avatar({ name = '?', size = 24, src }) {
    const init = name.replace(/\s/g,'').slice(0, name.match(/[\u4e00-\u9fa5]/) ? 1 : 2);
    const color = AV_COLORS[(name.charCodeAt(0) + (name.charCodeAt(1)||0)) % AV_COLORS.length];
    return (
      <span className="av" style={{ width: size, height: size, fontSize: size * 0.42, background: src ? 'none' : `linear-gradient(140deg, ${color}, ${color}bb)` }} title={name}>
        {init.toUpperCase()}
      </span>
    );
  }
  function AvatarStack({ names = [], size = 22, max = 4 }) {
    const show = names.slice(0, max);
    const extra = names.length - show.length;
    return (
      <span className="row" style={{ paddingLeft: 4 }}>
        {show.map((n, i) => (
          <span key={i} style={{ marginLeft: -6, border: '1.5px solid var(--surface)', borderRadius: '50%', display: 'inline-flex' }}>
            <Avatar name={n} size={size} />
          </span>
        ))}
        {extra > 0 && <span className="av" style={{ marginLeft: -6, width: size, height: size, fontSize: 10, background: 'var(--surface-4)', color: 'var(--text-2)', border: '1.5px solid var(--surface)' }}>+{extra}</span>}
      </span>
    );
  }

  // ---------- thumbnail placeholder ----------
  function Thumb({ w = '100%', h = 64, label = 'FRAME', tone = 'a', rounded = 8, playable, seed = 0 }) {
    const tones = { a: 'var(--thumb-a)', b: 'var(--thumb-b)', c: 'var(--thumb-c)', d: 'var(--thumb-d)' };
    const tc = tones[tone] || tones.a;
    return (
      <div className="thumb" data-label={label} style={{ width: w, height: h, borderRadius: rounded, '--tc': tc }}>
        {playable && <span className="play"><Icon name="play" size={13} /></span>}
      </div>
    );
  }

  // ---------- checkbox ----------
  function Check({ on, onChange, indeterminate }) {
    return (
      <span className={'cbx' + (on || indeterminate ? ' on' : '')} onClick={(e) => { e.stopPropagation(); onChange && onChange(!on); }}>
        {on && <Icon name="check" size={11} sw={3} />}
        {!on && indeterminate && <span style={{ width: 8, height: 2, background: 'currentColor', borderRadius: 2 }}></span>}
      </span>
    );
  }

  // ---------- toggle switch ----------
  function Switch({ on, onChange }) {
    return (
      <button onClick={() => onChange && onChange(!on)} style={{
        width: 34, height: 20, borderRadius: 12, padding: 2, flex: '0 0 auto',
        background: on ? 'var(--accent)' : 'var(--surface-4)', transition: 'background .16s', display: 'flex'
      }}>
        <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', transform: on ? 'translateX(14px)' : 'none', transition: 'transform .16s', boxShadow: '0 1px 2px rgba(0,0,0,.3)' }}></span>
      </button>
    );
  }

  // ---------- segmented ----------
  function Seg({ value, onChange, options }) {
    return (
      <div className="seg">
        {options.map((o) => (
          <button key={o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
            {o.icon && <Icon name={o.icon} size={14} />}{o.label}
          </button>
        ))}
      </div>
    );
  }

  // ---------- progress ----------
  function Progress({ value = 0, amber }) {
    return <div className={'prog' + (amber ? ' amber' : '')}><i style={{ width: Math.max(0, Math.min(100, value)) + '%' }}></i></div>;
  }

  // ---------- modal / drawer ----------
  function Overlay({ onClose, children, type = 'modal' }) {
    useEffect(() => {
      const onKey = (e) => { if (e.key === 'Escape') onClose && onClose(); };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, []);
    return (
      <React.Fragment>
        <div className="scrim" onClick={onClose}></div>
        <div className={type} role="dialog" aria-modal="true">{children}</div>
      </React.Fragment>
    );
  }

  // ---------- dropdown menu ----------
  function Menu({ trigger, items, align = 'right' }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
      if (!open) return;
      const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
      document.addEventListener('mousedown', h);
      return () => document.removeEventListener('mousedown', h);
    }, [open]);
    return (
      <span style={{ position: 'relative' }} ref={ref}>
        <span onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>{trigger}</span>
        {open && (
          <div style={{
            position: 'absolute', top: '100%', [align]: 0, marginTop: 4, zIndex: 50,
            background: 'var(--surface-2)', border: '1px solid var(--line-2)', borderRadius: 10,
            boxShadow: 'var(--shadow-lg)', padding: 5, minWidth: 168, animation: 'pop .14s ease'
          }}>
            {items.map((it, i) => it.sep ? <div key={i} className="hr" style={{ margin: '5px 0' }}></div> : (
              <button key={i} onClick={(e) => { e.stopPropagation(); setOpen(false); it.onClick && it.onClick(); }}
                style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '7px 9px', borderRadius: 7, fontSize: 13, color: it.danger ? 'var(--st-failed)' : 'var(--text)', textAlign: 'left' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                {it.icon && <Icon name={it.icon} size={15} />}{it.label}
                {it.kbd && <span className="kbd" style={{ marginLeft: 'auto' }}>{it.kbd}</span>}
              </button>
            ))}
          </div>
        )}
      </span>
    );
  }

  // ---------- empty ----------
  function Empty({ icon = 'film', title, sub, action }) {
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

  // ---------- app context ----------
  const Ctx = React.createContext(null);
  const useApp = () => React.useContext(Ctx);

  Object.assign(window, {
    StatusPill, Avatar, AvatarStack, Thumb, Check, Switch, Seg, Progress, Overlay, Menu, Empty,
    SHOT_STATUS, EP_STATUS, TASK_STATUS, Ctx, useApp,
  });
})();
