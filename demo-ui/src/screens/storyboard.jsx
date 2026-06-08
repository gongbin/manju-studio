/* storyboard.jsx — Shot workbench (table + card, inline edit, batch). window.StoryboardScreen */
(function () {
  const { useState, useRef, useEffect } = React;
  const { useApp, Screen, Crumb, Thumb, StatusPill, Avatar, Check, Seg, Menu, SHOT_STATUS, Progress } = window;
  const Icon = window.Icon;
  const { DATA } = window;
  const nameOf = (id) => (DATA.members.find(m => m.id === id) || {}).name || '—';
  const charOf = (id) => DATA.characters.find(c => c.id === id) || { name: id, tone: 'a' };

  // ---- editable text cell ----
  function EditCell({ value, onCommit, placeholder, multiline, mono, faint }) {
    const [editing, setEditing] = useState(false);
    const [v, setV] = useState(value);
    const ref = useRef(null);
    useEffect(() => { setV(value); }, [value]);
    useEffect(() => { if (editing && ref.current) { ref.current.focus(); ref.current.select && ref.current.select(); } }, [editing]);
    const commit = () => { setEditing(false); if (v !== value) onCommit(v); };
    if (editing) {
      const C = multiline ? 'textarea' : 'input';
      return <C ref={ref} value={v} onChange={e => setV(e.target.value)} onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter' && !multiline) commit(); if (e.key === 'Escape') { setV(value); setEditing(false); } }}
        rows={multiline ? 3 : undefined}
        style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--accent-line)', borderRadius: 6, padding: multiline ? '6px 8px' : '4px 7px', color: 'var(--text)', font: 'inherit', resize: 'vertical', outline: 'none', lineHeight: 1.5 }} />;
    }
    return (
      <div onClick={() => setEditing(true)} className={(mono ? 'mono ' : '') + (faint ? 'faint ' : '')}
        style={{ cursor: 'text', minHeight: 20, padding: '2px 3px', borderRadius: 5, color: !value && placeholder ? 'var(--text-3)' : undefined }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        {value || placeholder || <span className="faint">—</span>}
      </div>
    );
  }

  function ParamMenu({ shot, onChange }) {
    const p = shot.params;
    return (
      <Menu align="right" trigger={
        <button className="tag" style={{ cursor: 'pointer' }}>
          <span className="mono">{p.duration}s · {p.ratio} · {p.resolution}</span><Icon name="chevDown" size={12} />
        </button>
      } items={[
        { label: '时长 ' + p.duration + 's', icon: 'clock' },
        { label: '比例 ' + p.ratio, icon: 'film' },
        { label: '分辨率 ' + p.resolution, icon: 'image' },
        { sep: true },
        { label: (p.generateAudio ? '✓ ' : '') + '生成音频', icon: 'mic', onClick: () => onChange({ params: { ...p, generateAudio: !p.generateAudio } }) },
        { label: (p.watermark ? '✓ ' : '') + '水印', icon: 'eye', onClick: () => onChange({ params: { ...p, watermark: !p.watermark } }) },
      ]} />
    );
  }

  function StoryboardScreen() {
    const app = useApp();
    const p = DATA.projects.find(x => x.id === app.route.projectId) || DATA.projects[0];
    const ep = DATA.episodes.find(e => e.id === app.route.episodeId) || DATA.episodes[2];
    const [view, setView] = useState('table');
    const [sel, setSel] = useState(new Set());
    const [filter, setFilter] = useState('all');

    const shots = app.shots.filter(s => DATA.scenes.some(sc => sc.id === s.scene))
      .filter(s => filter === 'all' || (filter === 'pending' ? ['draft', 'failed'].includes(s.status) : filter === 'done' ? s.status === 'generated' : s.status === filter));

    const toggle = (id) => { const n = new Set(sel); n.has(id) ? n.delete(id) : n.add(id); setSel(n); };
    const allIds = shots.map(s => s.id);
    const allSel = allIds.length > 0 && allIds.every(id => sel.has(id));
    const toggleAll = () => setSel(allSel ? new Set() : new Set(allIds));
    const clear = () => setSel(new Set());

    const update = (id, patch) => app.updateShot(id, patch);
    const genSel = () => { app.openGenerate([...sel]); };

    const counts = {
      all: app.shots.length,
      pending: app.shots.filter(s => ['draft', 'failed'].includes(s.status)).length,
      running: app.shots.filter(s => ['running', 'queued'].includes(s.status)).length,
      done: app.shots.filter(s => s.status === 'generated').length,
    };

    const scenes = DATA.scenes.filter(sc => shots.some(s => s.scene === sc.id));

    return (
      <Screen crumb={<Crumb parts={[{ label: '项目', to: 'projects' }, { label: p.name, to: 'project', args: { projectId: p.id } }, { label: `EP${String(ep.index).padStart(2,'0')} · ${ep.title}` }]} />}>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {/* toolbar */}
          <div className="row gap10 wrap" style={{ padding: '11px 22px', borderBottom: '1px solid var(--line)' }}>
            <div className="grow" style={{ minWidth: 120 }}>
              <div className="row gap10"><b style={{ fontSize: 16 }}>分镜工作台</b><span className="faint mono" style={{ fontSize: 12 }}>{counts.done}/{counts.all} 已生成</span></div>
            </div>
            <div className="row gap4" style={{ background: 'var(--surface-2)', borderRadius: 9, padding: 3, border: '1px solid var(--line)' }}>
              {[['all', '全部'], ['pending', '待生成'], ['running', '进行中'], ['done', '已生成']].map(([k, l]) => (
                <button key={k} onClick={() => setFilter(k)} className="row gap6" style={{ height: 26, padding: '0 10px', borderRadius: 7, fontSize: 12.5, fontWeight: 600, color: filter === k ? 'var(--text)' : 'var(--text-2)', background: filter === k ? 'var(--surface-4)' : 'transparent' }}>
                  {l}<span className="mono faint" style={{ fontSize: 11 }}>{counts[k]}</span>
                </button>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => app.go('script', { projectId: p.id, episodeId: ep.id })}><Icon name="doc" size={14} />剧本</button>
            <button className="btn btn-ghost btn-sm"><Icon name="download" size={14} />批量导出</button>
            <Seg value={view} onChange={setView} options={[{ value: 'table', icon: 'table', label: '' }, { value: 'card', icon: 'grid', label: '' }]} />
            <button className="btn btn-pri btn-sm"><Icon name="plus" size={14} />新增镜头</button>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflow: 'auto', paddingBottom: sel.size ? 70 : 0 }}>
            {view === 'table' ? (
              <table className="tbl sb-tbl" style={{ fontSize: 12.5, tableLayout: 'fixed', minWidth: 1234 }}>
                <colgroup>
                  {[34, 40, 92, 280, 172, 132, 124, 150, 96, 78, 44].map((w, i) => <col key={i} style={{ width: w }} />)}
                </colgroup>
                <thead>
                  <tr>
                    <th><Check on={allSel} indeterminate={sel.size > 0 && !allSel} onChange={toggleAll} /></th>
                    <th>#</th>
                    <th>关键帧</th>
                    <th>画面提示词 Visual</th>
                    <th>对话 / 旁白</th>
                    <th>机位 / 运镜</th>
                    <th>角色</th>
                    <th>参数</th>
                    <th>状态</th>
                    <th>模型</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {scenes.map(sc => (
                    <React.Fragment key={sc.id}>
                      <tr>
                        <td colSpan={11} style={{ padding: '7px 12px', background: 'var(--surface-3)', borderBottom: '1px solid var(--line-2)' }}>
                          <div className="row gap8" style={{ fontSize: 12 }}>
                            <Icon name="folder" size={13} className="faint" /><b>{sc.title}</b>
                            <span className="faint">· {sc.loc} · {sc.mood}</span>
                          </div>
                        </td>
                      </tr>
                      {shots.filter(s => s.scene === sc.id).map(s => {
                        const live = s.status === 'running';
                        return (
                          <tr className={'trow' + (sel.has(s.id) ? ' sel' : '')} key={s.id}>
                            <td><Check on={sel.has(s.id)} onChange={() => toggle(s.id)} /></td>
                            <td className="mono faint">{String(s.index).padStart(2, '0')}</td>
                            <td>
                              {s.keyframe || s.status === 'generated'
                                ? <Thumb w={76} h={44} tone={s.tone} label="" playable={s.status === 'generated'} />
                                : <div className="thumb center" style={{ width: 76, height: 44, '--tc': 'var(--surface-4)' }}><Icon name="image" size={16} className="faint" /></div>}
                              {live && <div style={{ marginTop: 3 }}><Progress value={s.progress || 0} amber /></div>}
                            </td>
                            <td><EditCell value={s.prompt.visual} placeholder="描述画面…" multiline onCommit={v => update(s.id, { prompt: { ...s.prompt, visual: v } })} /></td>
                            <td>
                              {s.prompt.dialogue ? <div><span className="acc" style={{ fontSize: 10, fontWeight: 700 }}>白</span> <span>{s.prompt.dialogue}</span></div> : null}
                              {s.prompt.voiceover ? <div className="muted" style={{ marginTop: 2 }}><span style={{ fontSize: 10, fontWeight: 700, color: 'var(--st-dubbed)' }}>旁</span> {s.prompt.voiceover}</div> : null}
                              {!s.prompt.dialogue && !s.prompt.voiceover && <EditCell value="" placeholder="+ 对白" onCommit={v => update(s.id, { prompt: { ...s.prompt, dialogue: v } })} />}
                            </td>
                            <td className="muted">
                              <div>{s.prompt.cameraPosition}</div>
                              <div className="faint" style={{ marginTop: 2 }}>{s.prompt.cameraMovement}</div>
                            </td>
                            <td>
                              <div className="row gap4 wrap">
                                {s.chars.map(c => { const ch = charOf(c); return <span key={c} className="row gap4" style={{ fontSize: 11.5 }}><Avatar name={ch.name} size={17} />{ch.name}</span>; })}
                                {s.chars.length === 0 && <span className="faint">空镜</span>}
                              </div>
                            </td>
                            <td><ParamMenu shot={s} onChange={patch => update(s.id, patch)} /></td>
                            <td>
                              <StatusPill status={s.status} />
                              {s.status === 'failed' && s.error && <div className="faint" style={{ fontSize: 10.5, marginTop: 3, color: 'var(--st-failed)' }}>{s.error}</div>}
                              {s.enhance && s.enhance.status === 'succeeded' && <div style={{ marginTop: 4 }}><span className="pill" style={{ color: 'var(--accent-text)', background: 'var(--accent-soft)' }}><Icon name="bolt" size={11} />已增强 {s.enhance.res}</span></div>}
                              {s.enhance && (s.enhance.status === 'processing' || s.enhance.status === 'queued') && <div style={{ marginTop: 4 }}><span className="pill" style={{ color: 'var(--st-running)', background: 'var(--st-running-bg)' }}><span className="dot" style={{ animation: 'pulse 1.2s infinite' }}></span>增强 {s.enhance.progress || 0}%</span></div>}
                            </td>
                            <td className="mono faint" style={{ fontSize: 11 }}>{s.model.replace('seedance-', 'sd-')}</td>
                            <td>
                              <Menu trigger={<button className="icon-btn" style={{ width: 26, height: 26 }}><Icon name="more" size={15} /></button>} items={[
                                ['draft', 'failed'].includes(s.status) ? { icon: 'sparkle', label: '提交生成', onClick: () => app.openGenerate([s.id]) } : null,
                                s.status === 'failed' ? { icon: 'retry', label: '重试', onClick: () => app.openGenerate([s.id]) } : null,
                                s.status === 'generated' ? { icon: 'download', label: '下载视频' } : null,
                                s.status === 'generated' ? { icon: 'bolt', label: s.enhance && s.enhance.status === 'succeeded' ? '重新增强' : '视频增强', onClick: () => app.openEnhance(s.id) } : null,
                                (s.status === 'generated' && s.enhance && s.enhance.status === 'succeeded') ? { icon: 'download', label: '下载增强视频' } : null,
                                s.status === 'generated' ? { icon: 'mic', label: 'TTS 配音' } : null,
                                { icon: 'copy', label: '复制镜头' },
                                { sep: true },
                                { icon: 'trash', label: '删除', danger: true },
                              ].filter(Boolean)} />
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 22, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(264px,1fr))', gap: 14 }}>
                {shots.map(s => {
                  const live = s.status === 'running';
                  return (
                    <div key={s.id} className={'card' + (sel.has(s.id) ? '' : '')} style={{ overflow: 'hidden', borderColor: sel.has(s.id) ? 'var(--accent-line)' : 'var(--line)' }}>
                      <div style={{ position: 'relative' }}>
                        {s.keyframe || s.status === 'generated'
                          ? <Thumb w="100%" h={150} tone={s.tone} rounded={0} label={`SHOT ${String(s.index).padStart(2, '0')}`} playable={s.status === 'generated'} />
                          : <div className="thumb center" style={{ width: '100%', height: 150, borderRadius: 0, '--tc': 'var(--surface-4)' }}><Icon name="image" size={26} className="faint" /></div>}
                        <div style={{ position: 'absolute', top: 8, left: 8 }}><Check on={sel.has(s.id)} onChange={() => toggle(s.id)} /></div>
                        <div style={{ position: 'absolute', top: 8, right: 8 }}><StatusPill status={s.status} /></div>
                        {live && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}><Progress value={s.progress || 0} amber /></div>}
                        {s.enhance && s.enhance.status === 'succeeded' && <div style={{ position: 'absolute', bottom: 8, left: 8 }}><span className="pill" style={{ color: 'var(--accent-text)', background: 'color-mix(in oklab, var(--bg) 55%, transparent)', backdropFilter: 'blur(3px)' }}><Icon name="bolt" size={11} />{s.enhance.res}</span></div>}
                        {s.enhance && (s.enhance.status === 'processing' || s.enhance.status === 'queued') && <div style={{ position: 'absolute', bottom: 8, left: 8 }}><span className="pill" style={{ color: 'var(--st-running)', background: 'color-mix(in oklab, var(--bg) 55%, transparent)', backdropFilter: 'blur(3px)' }}><span className="dot" style={{ animation: 'pulse 1.2s infinite' }}></span>增强 {s.enhance.progress || 0}%</span></div>}
                      </div>
                      <div style={{ padding: 12 }}>
                        <div className="row" style={{ justifyContent: 'space-between' }}><span className="mono faint" style={{ fontSize: 11 }}>#{String(s.index).padStart(2, '0')}</span><span className="mono faint" style={{ fontSize: 11 }}>{s.params.duration}s · {s.params.ratio}</span></div>
                        <div className="clamp2" style={{ fontSize: 12.5, marginTop: 6, minHeight: 36 }}>{s.prompt.visual}</div>
                        <div className="row gap4 wrap" style={{ marginTop: 9 }}>
                          {s.chars.map(c => { const ch = charOf(c); return <span key={c} className="row gap4 tag" style={{ height: 20, fontSize: 10.5 }}><Avatar name={ch.name} size={14} />{ch.name}</span>; })}
                          {s.chars.length === 0 && <span className="tag" style={{ height: 20, fontSize: 10.5 }}>空镜</span>}
                        </div>
                        <div className="row gap6" style={{ marginTop: 11 }}>
                          {['draft', 'failed'].includes(s.status)
                            ? <button className="btn btn-pri btn-sm grow" onClick={() => app.openGenerate([s.id])}><Icon name={s.status === 'failed' ? 'retry' : 'sparkle'} size={13} />{s.status === 'failed' ? '重试' : '生成'}</button>
                            : s.status === 'generated'
                              ? <React.Fragment><button className="btn btn-soft btn-sm grow"><Icon name="download" size={13} />下载</button><button className="btn btn-ghost btn-sm btn-icon" title="视频增强" onClick={() => app.openEnhance(s.id)}><Icon name="bolt" size={15} /></button></React.Fragment>
                              : <button className="btn btn-soft btn-sm grow" disabled><Icon name="refresh" size={13} className="spin" />生成中 {s.progress || 0}%</button>}
                          <button className="btn btn-ghost btn-sm btn-icon"><Icon name="more" size={15} /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* batch action bar */}
          {sel.size > 0 && (
            <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 30 }} className="rise">
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px 8px 14px', boxShadow: 'var(--shadow-lg)', background: 'var(--surface-2)', borderColor: 'var(--line-2)' }}>
                <span className="row gap8" style={{ fontSize: 13 }}><b className="mono">{sel.size}</b> 个镜头已选</span>
                <span className="vr"></span>
                <button className="btn btn-pri btn-sm" onClick={genSel}><Icon name="sparkle" size={14} />批量生成</button>
                <Menu align="left" trigger={<button className="btn btn-ghost btn-sm"><Icon name="settings" size={13} />批量改参数<Icon name="chevDown" size={12} /></button>} items={[
                  { label: '统一时长 5s', icon: 'clock' }, { label: '统一比例 16:9', icon: 'film' }, { label: '统一分辨率 1080p', icon: 'image' }, { label: '统一模型 Seedance 2.0', icon: 'cpu' },
                ]} />
                <button className="btn btn-ghost btn-sm"><Icon name="copy" size={13} />复制</button>
                <button className="btn btn-ghost btn-sm"><Icon name="trash" size={13} /></button>
                <span className="vr"></span>
                <button className="icon-btn" onClick={clear}><Icon name="x" size={16} /></button>
              </div>
            </div>
          )}
        </div>
      </Screen>
    );
  }

  window.StoryboardScreen = StoryboardScreen;
})();
