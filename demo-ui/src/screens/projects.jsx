/* projects.jsx — ProjectsScreen + ProjectScreen (episodes kanban/list). */
(function () {
  const { useState } = React;
  const { useApp, Screen, Crumb, Thumb, StatusPill, AvatarStack, Avatar, EP_STATUS, Menu, Seg, Progress, Empty, Overlay } = window;
  const Icon = window.Icon;
  const { DATA, fmt } = window;
  const nameOf = (id) => (DATA.members.find(m => m.id === id) || {}).name || '—';

  const TONES = [['b', '青紫'], ['a', '暗棅'], ['c', '暖褐'], ['d', '青绿']];
  const RATIOS = ['16:9', '9:16', '21:9', '1:1', '4:3'];
  const RESES = ['720p', '1080p', '4K'];
  const STYLE_OPTS = ['国风', '仙侠', '水墨', '治愈', '日常', '美食', '科幻', '赛博', '悬疑', '言情', '怀旧', '喜剧'];

  // ---------------- New Project Modal ----------------
  function NewProjectModal({ onClose }) {
    const app = useApp();
    const [name, setName] = useState('');
    const [synopsis, setSynopsis] = useState('');
    const [tone, setTone] = useState('b');
    const [ratio, setRatio] = useState('16:9');
    const [res, setRes] = useState('1080p');
    const [style, setStyle] = useState([]);
    const toggleStyle = (s) => setStyle(p => p.includes(s) ? p.filter(x => x !== s) : (p.length < 3 ? [...p, s] : p));
    const submit = () => { if (!name.trim()) return; app.addProject({ name: name.trim(), synopsis, tone, ratio, res, style }); onClose(); };
    return (
      <Overlay onClose={onClose} type="modal">
        <div style={{ width: 'min(520px, 94vw)' }}>
          <div className="row gap10" style={{ padding: '15px 18px', borderBottom: '1px solid var(--line)' }}>
            <span className="center" style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent-text)' }}><Icon name="layers" size={17} /></span>
            <div className="grow"><b style={{ fontSize: 15 }}>新建项目</b><div className="faint" style={{ fontSize: 12 }}>创建一部漫剧作品并设定基础规格</div></div>
            <button className="icon-btn" onClick={onClose}><Icon name="x" size={18} /></button>
          </div>
          <div style={{ padding: 18, maxHeight: '64vh', overflow: 'auto' }} className="col gap16">
            <label><span className="lbl">项目名称 <span style={{ color: 'var(--st-failed)' }}>*</span></span>
              <input className="field" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="如：青冥录" onKeyDown={e => { if (e.key === 'Enter') submit(); }} /></label>
            <label><span className="lbl">一句话简介</span>
              <textarea className="field" rows={2} value={synopsis} onChange={e => setSynopsis(e.target.value)} placeholder="概述故事背景与看点…" /></label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><div className="lbl">画面比例</div><div className="row gap6 wrap">{RATIOS.map(r => <button key={r} onClick={() => setRatio(r)} className="tag mono" style={{ height: 28, cursor: 'pointer', background: ratio === r ? 'var(--accent-soft)' : undefined, borderColor: ratio === r ? 'var(--accent-line)' : undefined, color: ratio === r ? 'var(--accent-text)' : undefined }}>{r}</button>)}</div></div>
              <div><div className="lbl">分辨率</div><div className="row gap6 wrap">{RESES.map(r => <button key={r} onClick={() => setRes(r)} className="tag" style={{ height: 28, cursor: 'pointer', background: res === r ? 'var(--accent-soft)' : undefined, borderColor: res === r ? 'var(--accent-line)' : undefined, color: res === r ? 'var(--accent-text)' : undefined }}>{r}</button>)}</div></div>
            </div>
            <div><div className="lbl">风格标签 <span className="faint">· 最多 3</span></div><div className="row gap6 wrap">{STYLE_OPTS.map(s => { const on = style.includes(s); return <button key={s} onClick={() => toggleStyle(s)} className="tag" style={{ height: 28, cursor: 'pointer', background: on ? 'var(--accent-soft)' : undefined, borderColor: on ? 'var(--accent-line)' : undefined, color: on ? 'var(--accent-text)' : undefined }}>{on ? <Icon name="check" size={12} /> : null}{s}</button>; })}</div></div>
            <div><div className="lbl">封面调性</div><div className="row gap8">{TONES.map(([tk, tl]) => <button key={tk} onClick={() => setTone(tk)} style={{ flex: 1, cursor: 'pointer', borderRadius: 9, overflow: 'hidden', border: '2px solid ' + (tone === tk ? 'var(--accent)' : 'transparent'), padding: 0 }}><Thumb w="100%" h={42} tone={tk} rounded={0} label={tl} /></button>)}</div></div>
          </div>
          <div className="row gap8" style={{ padding: 16, borderTop: '1px solid var(--line)' }}>
            <button className="btn btn-ghost grow" onClick={onClose}>取消</button>
            <button className="btn btn-pri grow" disabled={!name.trim()} onClick={submit}><Icon name="plus" size={15} />创建项目</button>
          </div>
        </div>
      </Overlay>
    );
  }

  // ---------------- New Episode Modal ----------------
  function NewEpisodeModal({ project, nextIndex, onClose }) {
    const app = useApp();
    const [title, setTitle] = useState('');
    const [assignee, setAssignee] = useState(null);
    const submit = () => { if (!title.trim()) return; app.addEpisode(project.id, { title: title.trim(), assignee }); onClose(); };
    return (
      <Overlay onClose={onClose} type="modal">
        <div style={{ width: 'min(440px, 94vw)' }}>
          <div className="row gap10" style={{ padding: '15px 18px', borderBottom: '1px solid var(--line)' }}>
            <span className="center" style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent-text)' }}><Icon name="clapper" size={17} /></span>
            <div className="grow"><b style={{ fontSize: 15 }}>新建剧集</b><div className="faint" style={{ fontSize: 12 }}>{project.name} · 第 {nextIndex} 集</div></div>
            <button className="icon-btn" onClick={onClose}><Icon name="x" size={18} /></button>
          </div>
          <div style={{ padding: 18 }} className="col gap16">
            <div className="row gap10">
              <div style={{ flex: '0 0 64px' }}><div className="lbl">集号</div><div className="field center mono" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>EP{String(nextIndex).padStart(2, '0')}</div></div>
              <label className="grow"><span className="lbl">剧集标题 <span style={{ color: 'var(--st-failed)' }}>*</span></span>
                <input className="field" autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="如：雨夜入城" onKeyDown={e => { if (e.key === 'Enter') submit(); }} /></label>
            </div>
            <div><div className="lbl">负责人</div>
              <div className="row gap6 wrap">
                <button onClick={() => setAssignee(null)} className="tag" style={{ height: 30, cursor: 'pointer', background: assignee === null ? 'var(--accent-soft)' : undefined, borderColor: assignee === null ? 'var(--accent-line)' : undefined, color: assignee === null ? 'var(--accent-text)' : undefined }}>未指派</button>
                {DATA.members.filter(m => project.members.includes(m.id)).map(m => { const on = assignee === m.id; return <button key={m.id} onClick={() => setAssignee(m.id)} className="tag" style={{ height: 30, cursor: 'pointer', paddingLeft: 4, background: on ? 'var(--accent-soft)' : undefined, borderColor: on ? 'var(--accent-line)' : undefined, color: on ? 'var(--accent-text)' : undefined }}><Avatar name={m.name} size={20} />{m.name}</button>; })}
              </div>
            </div>
            <div className="row gap8" style={{ fontSize: 11.5, color: 'var(--text-2)', padding: '9px 11px', background: 'var(--surface-2)', borderRadius: 9 }}><Icon name="info" size={15} className="faint" />创建后进入剧本编辑，可用智能分镜生成镜头草稿。</div>
          </div>
          <div className="row gap8" style={{ padding: 16, borderTop: '1px solid var(--line)' }}>
            <button className="btn btn-ghost grow" onClick={onClose}>取消</button>
            <button className="btn btn-pri grow" disabled={!title.trim()} onClick={submit}><Icon name="plus" size={15} />新建剧集</button>
          </div>
        </div>
      </Overlay>
    );
  }

  // ---------------- Projects overview ----------------
  function ProjectsScreen() {
    const app = useApp();
    const [view, setView] = useState('grid');
    const [showNew, setShowNew] = useState(false);
    const projects = app.projects;
    const stats = [
      { k: '进行中项目', v: projects.filter(p => p.status === 'producing').length, d: `共 ${projects.length} 个项目`, icon: 'layers', dc: 'muted' },
      { k: '制作中剧集', v: 2, d: '2 集待审', icon: 'clapper', dc: 'muted' },
      { k: '本月生成镜头', v: 186, d: '+34 较上周', icon: 'film', dc: 'acc' },
      { k: '本月积分消耗', v: fmt.credits(DATA.wallet.monthSpent), d: `预算 ${fmt.credits(DATA.wallet.monthBudget)}`, icon: 'coins', dc: 'muted' },
    ];
    return (
      <Screen crumb={<Crumb parts={[{ label: '项目 / 剧集' }]} />}>
        <div className="page">
          <div className="page-head">
            <div className="grow">
              <div className="page-title">项目 / 剧集</div>
              <div className="page-sub">管理工作空间内的全部漫剧作品与剧集进度</div>
            </div>
            <Seg value={view} onChange={setView} options={[{ value: 'grid', icon: 'grid', label: '' }, { value: 'list', icon: 'list', label: '' }]} />
            <button className="btn btn-pri" onClick={() => setShowNew(true)}><Icon name="plus" size={16} />新建项目</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 12, marginBottom: 22 }}>
            {stats.map((s, i) => (
              <div className="stat rise" key={i} style={{ animationDelay: i * 40 + 'ms' }}>
                <div className="k"><Icon name={s.icon} size={14} />{s.k}</div>
                <div className="v mono">{s.v}</div>
                <div className={'d ' + s.dc}>{s.d}</div>
              </div>
            ))}
          </div>

          {view === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px,1fr))', gap: 16 }}>
              {projects.map((p, i) => (
                <div key={p.id} className="card rise" style={{ overflow: 'hidden', cursor: 'pointer', animationDelay: i * 50 + 'ms', transition: 'border-color .15s, transform .15s' }}
                  onClick={() => app.go('project', { projectId: p.id })}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.transform = 'none'; }}>
                  <div style={{ position: 'relative' }}>
                    <Thumb w="100%" h={132} tone={p.tone} rounded={0} label={p.ratio + ' · ' + p.res} />
                    <div style={{ position: 'absolute', top: 10, right: 10 }}><StatusPill status={p.status} map={EP_STATUS} /></div>
                  </div>
                  <div style={{ padding: 14 }}>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <div style={{ fontWeight: 700, fontSize: 15.5 }}>{p.name}</div>
                      <span className="faint mono" style={{ fontSize: 11.5, whiteSpace: 'nowrap', flexShrink: 0, paddingLeft: 8 }}>{p.episodes} 集</span>
                    </div>
                    <div className="muted clamp2" style={{ fontSize: 12.5, marginTop: 5, minHeight: 34 }}>{p.synopsis}</div>
                    <div className="row gap6 wrap" style={{ marginTop: 10 }}>
                      {p.style.map(s => <span key={s} className="tag">{s}</span>)}
                    </div>
                    <div className="row" style={{ justifyContent: 'space-between', marginTop: 13 }}>
                      <AvatarStack names={p.members.map(nameOf)} />
                      <span className="faint" style={{ fontSize: 11.5 }}>{fmt.ago(p.updated)}更新</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card" style={{ overflow: 'hidden' }}>
              <table className="tbl">
                <thead><tr><th>项目</th><th>风格</th><th>状态</th><th>剧集</th><th>成员</th><th>比例</th><th>更新</th></tr></thead>
                <tbody>
                  {projects.map(p => (
                    <tr className="trow" key={p.id} style={{ cursor: 'pointer' }} onClick={() => app.go('project', { projectId: p.id })}>
                      <td><div className="row gap10"><Thumb w={40} h={28} tone={p.tone} label="" /><b>{p.name}</b></div></td>
                      <td><div className="row gap6">{p.style.map(s => <span key={s} className="tag">{s}</span>)}</div></td>
                      <td><StatusPill status={p.status} map={EP_STATUS} /></td>
                      <td className="mono muted">{p.episodes}</td>
                      <td><AvatarStack names={p.members.map(nameOf)} /></td>
                      <td className="mono muted">{p.ratio}</td>
                      <td className="faint">{fmt.ago(p.updated)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {showNew && <NewProjectModal onClose={() => setShowNew(false)} />}
      </Screen>
    );
  }

  // ---------------- Episodes (kanban / list) ----------------
  const COLS = [
    { key: 'draft', ...EP_STATUS.draft },
    { key: 'producing', ...EP_STATUS.producing },
    { key: 'review', ...EP_STATUS.review },
    { key: 'published', ...EP_STATUS.published },
  ];

  function EpCard({ ep, onOpen }) {
    const pct = ep.shots ? Math.round((ep.done / ep.shots) * 100) : 0;
    return (
      <div className="card" style={{ padding: 12, cursor: 'pointer', transition: 'border-color .15s' }}
        onClick={onOpen}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--line-2)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line)'}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="mono faint" style={{ fontSize: 11.5 }}>EP {String(ep.index).padStart(2, '0')}</span>
          <Menu trigger={<button className="icon-btn" style={{ width: 24, height: 24 }} onClick={e => e.stopPropagation()}><Icon name="more" size={15} /></button>}
            items={[{ icon: 'doc', label: '打开剧本' }, { icon: 'table', label: '打开分镜' }, { sep: true }, { icon: 'copy', label: '复制剧集' }, { icon: 'trash', label: '归档', danger: true }]} />
        </div>
        <div style={{ fontWeight: 600, fontSize: 14.5, marginTop: 2 }}>{ep.title}</div>
        {ep.shots > 0 ? (
          <React.Fragment>
            <div className="row" style={{ justifyContent: 'space-between', margin: '11px 0 5px', fontSize: 11.5 }}>
              <span className="muted">{ep.done}/{ep.shots} 镜头</span>
              <span className="mono faint">{pct}%</span>
            </div>
            <Progress value={pct} />
          </React.Fragment>
        ) : <div className="faint" style={{ fontSize: 12, margin: '11px 0 5px' }}>尚无分镜，从剧本开始 →</div>}
        <div className="row" style={{ justifyContent: 'space-between', marginTop: 11 }}>
          {ep.assignee ? <div className="row gap6"><Avatar name={nameOf(ep.assignee)} size={20} /><span className="faint" style={{ fontSize: 11.5 }}>{nameOf(ep.assignee)}</span></div> : <span className="faint" style={{ fontSize: 11.5 }}>未指派</span>}
          <span className="faint" style={{ fontSize: 11 }}>{fmt.ago(ep.updated)}</span>
        </div>
      </div>
    );
  }

  function ProjectScreen() {
    const app = useApp();
    const [view, setView] = useState('kanban');
    const [showNew, setShowNew] = useState(false);
    const p = app.projects.find(x => x.id === app.route.projectId) || app.projects[0];
    const eps = app.episodes.filter(e => e.project === p.id);
    const openEp = (ep) => app.go(ep.shots > 0 ? 'storyboard' : 'script', { projectId: p.id, episodeId: ep.id });

    return (
      <Screen crumb={<Crumb parts={[{ label: '项目', to: 'projects' }, { label: p.name }]} />}>
        <div className="page">
          {/* project hero */}
          <div className="card" style={{ padding: 16, marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center' }}>
            <Thumb w={120} h={72} tone={p.tone} label={p.res} />
            <div className="grow">
              <div className="row gap10"><div className="page-title">{p.name}</div><StatusPill status={p.status} map={EP_STATUS} /></div>
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{p.synopsis}</div>
              <div className="row gap16 wrap" style={{ marginTop: 10, fontSize: 12 }}>
                <span className="row gap6 faint"><Icon name="film" size={14} />{p.ratio} · {p.res}</span>
                <span className="row gap6 faint"><Icon name="clapper" size={14} />{p.episodes} 集</span>
                <span className="row gap6">{p.style.map(s => <span key={s} className="tag">{s}</span>)}</span>
              </div>
            </div>
            <div className="col gap8" style={{ alignItems: 'flex-end' }}>
              <AvatarStack names={p.members.map(nameOf)} size={26} />
              <button className="btn btn-ghost btn-sm"><Icon name="settings" size={14} />项目设置</button>
            </div>
          </div>

          <div className="page-head" style={{ marginBottom: 14, alignItems: 'center' }}>
            <div className="grow"><div style={{ fontWeight: 700, fontSize: 16 }}>剧集</div></div>
            <Seg value={view} onChange={setView} options={[{ value: 'kanban', icon: 'kanban', label: '看板' }, { value: 'list', icon: 'list', label: '列表' }]} />
            <button className="btn btn-pri" onClick={() => setShowNew(true)}><Icon name="plus" size={16} />新建剧集</button>
          </div>

          {view === 'kanban' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(220px,1fr))', gap: 12, overflowX: 'auto', alignItems: 'start' }}>
              {COLS.map(col => {
                const list = eps.filter(e => e.status === col.key);
                return (
                  <div key={col.key} style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 12, padding: 10, minHeight: 120 }}>
                    <div className="row gap8" style={{ padding: '2px 4px 10px' }}>
                      <span className="dot" style={{ width: 8, height: 8, borderRadius: '50%', background: col.c }}></span>
                      <b style={{ fontSize: 13 }}>{col.label}</b>
                      <span className="faint mono" style={{ fontSize: 11.5 }}>{list.length}</span>
                    </div>
                    <div className="col gap8">
                      {list.map(ep => <EpCard key={ep.id} ep={ep} onOpen={() => openEp(ep)} />)}
                      {list.length === 0 && <div className="faint" style={{ fontSize: 12, padding: '8px 4px' }}>—</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card" style={{ overflow: 'hidden' }}>
              <table className="tbl">
                <thead><tr><th>#</th><th>标题</th><th>状态</th><th>进度</th><th>负责人</th><th>更新</th><th></th></tr></thead>
                <tbody>
                  {eps.map(ep => (
                    <tr className="trow" key={ep.id} style={{ cursor: 'pointer' }} onClick={() => openEp(ep)}>
                      <td className="mono faint">EP{String(ep.index).padStart(2, '0')}</td>
                      <td><b>{ep.title}</b></td>
                      <td><StatusPill status={ep.status} map={EP_STATUS} /></td>
                      <td style={{ width: 180 }}>
                        {ep.shots > 0 ? <div className="row gap8"><div className="grow"><Progress value={Math.round(ep.done / ep.shots * 100)} /></div><span className="mono faint" style={{ fontSize: 11.5 }}>{ep.done}/{ep.shots}</span></div> : <span className="faint">—</span>}
                      </td>
                      <td>{ep.assignee ? <div className="row gap6"><Avatar name={nameOf(ep.assignee)} size={20} /><span className="muted" style={{ fontSize: 12.5 }}>{nameOf(ep.assignee)}</span></div> : <span className="faint">未指派</span>}</td>
                      <td className="faint">{fmt.ago(ep.updated)}</td>
                      <td><Icon name="chevRight" size={16} className="faint" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {showNew && <NewEpisodeModal project={p} nextIndex={eps.length + 1} onClose={() => setShowNew(false)} />}
      </Screen>
    );
  }

  Object.assign(window, { ProjectsScreen, ProjectScreen });
})();
