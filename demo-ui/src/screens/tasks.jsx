/* tasks.jsx — GenerationDrawer + TaskCenterScreen. */
(function () {
  const { useState } = React;
  const { useApp, Screen, Crumb, Overlay, StatusPill, Switch, Check, Avatar, Menu, TASK_STATUS, Progress, Thumb, Empty } = window;
  const Icon = window.Icon;
  const { DATA, fmt } = window;
  const nameOf = (id) => (DATA.members.find(m => m.id === id) || {}).name || '—';
  const charOf = (id) => DATA.characters.find(c => c.id === id) || { name: id };

  // ---------------- Generation Drawer ----------------
  function GenerationDrawer() {
    const app = useApp();
    const drawer = app.genDrawer;
    if (!drawer) return null;
    const shots = app.shots.filter(s => drawer.shotIds.includes(s.id));
    const [modelId, setModelId] = useState(shots[0] ? shots[0].model : 'seedance-2.0');
    const model = DATA.models.find(m => m.id === modelId) || DATA.models[0];
    const [res, setRes] = useState('1080p');
    const [ratio, setRatio] = useState('adaptive');
    const [dur, setDur] = useState('smart'); // 'smart' | number
    const [audio, setAudio] = useState(true);
    const [web, setWeb] = useState(false);
    const [wm, setWm] = useState(true);
    const initFigures = [...new Set(shots.flatMap(s => s.chars))].map(charOf).filter(c => c.asset).map(c => c.asset);
    const [refImg, setRefImg] = useState([]);
    const [refVid, setRefVid] = useState([]);
    const [refAud, setRefAud] = useState([]);
    const [figures, setFigures] = useState(initFigures);
    const [figInput, setFigInput] = useState('');
    const close = () => app.setGenDrawer(null);

    const durSec = dur === 'smart' ? 5 : dur;
    const perShot = Math.round(model.base * durSec * ({ '480p': 1, '720p': 1.8, '1080p': 3, '4K': 6 }[res] || 1) * (audio ? 1.15 : 1) / 5);
    const total = perShot * shots.length;
    const durOpts = ['smart', ...[3, 4, 5, 6, 8, 10, 12].filter(d => d >= model.dur[0] && d <= model.dur[1])];
    const addFig = () => { const v = figInput.trim().replace(/^asset:\/\//, ''); if (v) { setFigures(f => [...new Set([...f, 'asset://' + v])]); setFigInput(''); } };
    const Chk = ({ on, set, label }) => (
      <div onClick={() => set(!on)} className="row gap6" style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', fontSize: 12.5, padding: '6px 10px', borderRadius: 8, border: '1px solid ' + (on ? 'var(--accent-line)' : 'var(--line-2)'), background: on ? 'var(--accent-soft)' : 'transparent', color: on ? 'var(--accent-text)' : 'var(--text-2)' }}>
        <Check on={on} onChange={set} />{label}
      </div>
    );

    return (
      <Overlay onClose={close} type="drawer">
        <div className="row gap10" style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
          <Icon name="sparkle" size={18} className="acc" />
          <div className="grow"><b style={{ fontSize: 15 }}>提交镜头生成</b><div className="faint" style={{ fontSize: 12 }}>{shots.length} 个镜头 · 参数面板由 Provider 模型驱动</div></div>
          <button className="icon-btn" onClick={close}><Icon name="x" size={18} /></button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 18 }} className="col gap20">
          {/* prompt fields (single shot) or shot list */}
          {shots.length === 1 ? (() => { const s = shots[0]; const onP = (k, v) => app.updateShot(s.id, { prompt: { ...s.prompt, [k]: v } }); return (
            <div>
              <div className="row gap8" style={{ marginBottom: 10 }}><Icon name="film" size={15} className="acc" /><b style={{ fontSize: 13.5 }}>镜头 #{String(s.index).padStart(2, '0')} · 提示词</b></div>
              <div className="col gap12">
                <div><div className="lbl">画面提示词 Visual Prompt <span style={{ color: 'var(--st-failed)' }}>*</span></div>
                  <textarea className="field" rows={3} value={s.prompt.visual} onChange={e => onP('visual', e.target.value)} placeholder="描述视频的主要画面内容…" /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div><div className="lbl">对话 Dialogue</div><textarea className="field" rows={2} value={s.prompt.dialogue} onChange={e => onP('dialogue', e.target.value)} placeholder="人物对话内容…" /></div>
                  <div><div className="lbl">旁白 Voiceover</div><textarea className="field" rows={2} value={s.prompt.voiceover} onChange={e => onP('voiceover', e.target.value)} placeholder="背景旁白解说…" /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div><div className="lbl">音效 SFX</div><input className="field" value={s.prompt.soundEffects} onChange={e => onP('soundEffects', e.target.value)} placeholder="如：海浪声…" /></div>
                  <div><div className="lbl">机位 Camera</div><input className="field" value={s.prompt.cameraPosition} onChange={e => onP('cameraPosition', e.target.value)} placeholder="如：特写、全景…" /></div>
                  <div><div className="lbl">运镜 Movement</div><input className="field" value={s.prompt.cameraMovement} onChange={e => onP('cameraMovement', e.target.value)} placeholder="如：推镜头…" /></div>
                </div>
              </div>
            </div>
          ); })() : (
            <div>
              <div className="lbl">将生成的镜头 · {shots.length}</div>
              <div className="col gap6" style={{ maxHeight: 150, overflow: 'auto' }}>
                {shots.map(s => (
                  <div key={s.id} className="row gap10" style={{ padding: '6px 8px', background: 'var(--surface-2)', borderRadius: 8 }}>
                    <Thumb w={48} h={28} tone={s.tone} label="" />
                    <span className="mono faint" style={{ fontSize: 11 }}>#{String(s.index).padStart(2, '0')}</span>
                    <span className="grow ellipsis" style={{ fontSize: 12 }}>{s.prompt.visual}</span>
                    <span className="mono faint" style={{ fontSize: 11 }}>{s.params.duration}s</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* model */}
          <div>
            <div className="lbl">视频模型 · Provider</div>
            <Menu align="left" trigger={
              <button className="field row gap8" style={{ justifyContent: 'flex-start', cursor: 'pointer' }}>
                <span className="av" style={{ width: 20, height: 20, fontSize: 9, background: 'linear-gradient(140deg,#e8623d,#d4542f)' }}>火</span>
                <span className="grow" style={{ textAlign: 'left' }}>{model.label}</span>
                <span className="faint mono" style={{ fontSize: 11 }}>{model.provider}</span><Icon name="chevDown" size={14} />
              </button>
            } items={DATA.models.filter(m => m.caps.includes('image-to-video') || m.caps.includes('text-to-video')).map(m => ({ icon: m.id === modelId ? 'check' : 'cpu', label: m.label, onClick: () => setModelId(m.id) }))} />
          </div>

          {/* generation params */}
          <div>
            <div className="row gap8" style={{ marginBottom: 12 }}><Icon name="settings" size={15} className="acc" /><b style={{ fontSize: 13.5 }}>生成参数</b></div>
            <div className="col gap14">
              <div>
                <div className="lbl">分辨率 Resolution</div>
                <div className="row gap6 wrap">{model.res.map(r => <button key={r} onClick={() => setRes(r)} className="tag" style={{ height: 28, cursor: 'pointer', background: res === r ? 'var(--accent-soft)' : undefined, borderColor: res === r ? 'var(--accent-line)' : undefined, color: res === r ? 'var(--accent-text)' : undefined }}>{r}</button>)}</div>
              </div>
              <div>
                <div className="lbl">画面比例 Video Ratio</div>
                <div className="row gap6 wrap">{['adaptive', ...model.ratios].map(r => <button key={r} onClick={() => setRatio(r)} className={'tag' + (r === 'adaptive' ? '' : ' mono')} style={{ height: 28, cursor: 'pointer', background: ratio === r ? 'var(--accent-soft)' : undefined, borderColor: ratio === r ? 'var(--accent-line)' : undefined, color: ratio === r ? 'var(--accent-text)' : undefined }}>{r === 'adaptive' ? 'adaptive · 智能匹配' : r}</button>)}</div>
              </div>
              {model.dur[1] > 0 && (
                <div>
                  <div className="lbl">时长 Duration</div>
                  <div className="row gap6 wrap">{durOpts.map(d => <button key={d} onClick={() => setDur(d)} className="tag" style={{ height: 28, cursor: 'pointer', background: dur === d ? 'var(--accent-soft)' : undefined, borderColor: dur === d ? 'var(--accent-line)' : undefined, color: dur === d ? 'var(--accent-text)' : undefined }}>{d === 'smart' ? '智能指定 Smart' : d + 's'}</button>)}</div>
                </div>
              )}
              <div className="row gap8 wrap" style={{ paddingTop: 2 }}>
                <Chk on={web} set={setWeb} label="Web Search 联网检索" />
                {model.audio && <Chk on={audio} set={setAudio} label="Generate Audio 生成音频" />}
                {model.watermark !== false && <Chk on={wm} set={setWm} label="Add Watermark 水印" />}
              </div>
            </div>
          </div>

          {/* reference materials */}
          <div>
            <div className="row gap8" style={{ marginBottom: 3 }}><Icon name="image" size={15} className="acc" /><b style={{ fontSize: 13.5 }}>参考素材 Reference Materials</b></div>
            <div className="faint" style={{ fontSize: 11.5, marginBottom: 10 }}>注入为 reference_image / video / audio，提升一致性与运镜还原</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { icon: 'image', label: 'Images', max: 9, list: refImg, set: setRefImg, ext: 'png', on: model.refImg },
                { icon: 'film', label: 'Video', max: 3, list: refVid, set: setRefVid, ext: 'mp4', on: model.refVid },
                { icon: 'mic', label: 'Audio', max: 3, list: refAud, set: setRefAud, ext: 'mp3', on: model.refAud },
              ].map(z => (
                <div key={z.label} style={{ border: '1px dashed var(--line-2)', borderRadius: 10, padding: 9, opacity: z.on ? 1 : .45, pointerEvents: z.on ? 'auto' : 'none' }}>
                  <div className="center col gap3" style={{ color: 'var(--text-3)', padding: '4px 0 6px' }}><Icon name={z.icon} size={20} /><span style={{ fontSize: 11.5, color: 'var(--text-2)', fontWeight: 600 }}>{z.label}</span><span className="faint" style={{ fontSize: 10 }}>Max {z.max}{z.on ? '' : ' · 不支持'}</span></div>
                  <div className="row gap4">
                    <button className="btn btn-soft" style={{ height: 24, fontSize: 11, flex: 1, padding: 0 }} disabled={z.list.length >= z.max} onClick={() => z.set(l => [...l, 'upload_' + (l.length + 1) + '.' + z.ext])}>Upload</button>
                    <button className="btn btn-ghost" style={{ height: 24, fontSize: 11, flex: 1, padding: 0 }} disabled={z.list.length >= z.max} onClick={() => z.set(l => [...l, 'https://r2/…/ref' + (l.length + 1) + '.' + z.ext])}>URL</button>
                  </div>
                  {z.list.length > 0 && <div className="col gap4" style={{ marginTop: 6 }}>{z.list.map((it, i) => (
                    <div key={i} className="row gap4" style={{ fontSize: 10, background: 'var(--surface-2)', borderRadius: 5, padding: '2px 4px 2px 6px' }}><span className="grow ellipsis mono">{it}</span><button onClick={() => z.set(l => l.filter((_, x) => x !== i))} className="faint"><Icon name="x" size={11} /></button></div>
                  ))}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* public figure */}
          {model.charAsset && (
            <div>
              <div className="row gap8" style={{ marginBottom: 3 }}><Icon name="users" size={15} className="acc" /><b style={{ fontSize: 13.5 }}>公共人像素材 Public Figure</b></div>
              <div className="faint" style={{ fontSize: 11.5, marginBottom: 10 }}>角色一致性资产 asset:// 自动注入；可访问方舟公共素材库复制 assetid</div>
              <div className="row gap6">
                <div className="search grow" style={{ height: 34 }}><span className="mono faint" style={{ fontSize: 11 }}>asset://</span><input value={figInput} onChange={e => setFigInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addFig(); }} placeholder="asset-20260224225818-2r9ls" /></div>
                <button className="btn btn-soft" onClick={addFig}><Icon name="plus" size={14} />Add</button>
              </div>
              {figures.length > 0 && <div className="col gap6" style={{ marginTop: 8 }}>
                {figures.map((a, i) => { const c = DATA.characters.find(x => x.asset === a); return (
                  <div key={i} className="row gap8" style={{ padding: '6px 8px', background: 'var(--surface-2)', borderRadius: 8, fontSize: 12 }}>
                    {c ? <Avatar name={c.name} size={20} /> : <span className="center" style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--surface-4)', color: 'var(--text-3)' }}><Icon name="users" size={12} /></span>}
                    {c && <b>{c.name}</b>}
                    <span className="grow ellipsis mono faint" style={{ fontSize: 10.5 }}>{a}</span>
                    <button onClick={() => setFigures(f => f.filter((_, x) => x !== i))} className="faint"><Icon name="x" size={13} /></button>
                  </div>
                ); })}
              </div>}
            </div>
          )}
        </div>

        {/* footer: cost + submit */}
        <div style={{ borderTop: '1px solid var(--line)', padding: 16 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div className="faint" style={{ fontSize: 12 }}>预扣积分 · {shots.length} 镜头 × ~{perShot}</div>
              <div className="row gap6" style={{ alignItems: 'baseline' }}><span className="mono acc" style={{ fontSize: 22, fontWeight: 700 }}>{fmt.credits(total)}</span><span className="faint" style={{ fontSize: 12 }}>积分</span></div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 12 }}>
              <div className="faint">钱包余额</div>
              <div className="mono" style={{ fontWeight: 600 }}>{fmt.credits(app.wallet.balance)}</div>
            </div>
          </div>
          <div className="row gap8">
            <button className="btn btn-ghost grow" onClick={close}>取消</button>
            <button className="btn btn-pri grow" onClick={() => app.submitGenerate(drawer.shotIds, { model: modelId, res, ratio, dur, audio }, total)}>
              <Icon name="sparkle" size={16} />提交生成 · 预扣 {fmt.credits(total)}
            </button>
          </div>
        </div>
      </Overlay>
    );
  }

  // ---------------- Enhance Drawer ----------------
  function EnhanceDrawer() {
    const app = useApp();
    const d = app.enhanceDrawer;
    if (!d) return null;
    const s = app.shots.find(x => x.id === d.shotId);
    if (!s) return null;
    const enh = s.enhance;
    const [type, setType] = useState((enh && enh.type) || 'professional');
    const [res, setRes] = useState((enh && enh.res) || '2K');
    const close = () => app.setEnhanceDrawer(null);
    const TYPES = [
      { id: 'standard', label: '标准版', en: 'standard', desc: '快速基础增强 · 去噪与锐化', mult: 1 },
      { id: 'professional', label: '专业版', en: 'professional', desc: '更强细节恢复与色彩还原', mult: 1.5 },
      { id: 'ai-model', label: '大模型', en: 'ai-model', desc: '最佳画质 · 重绘细节 · 耗时较长', mult: 2.4 },
    ];
    const RES = ['720p', '1080p', '2K', '4K'];
    const resMult = { '720p': 1, '1080p': 1.6, '2K': 2.6, '4K': 4 };
    const tMult = (TYPES.find(t => t.id === type) || {}).mult || 1;
    const cost = Math.round(80 * resMult[res] * tMult);
    const busy = enh && (enh.status === 'queued' || enh.status === 'processing');
    const done = enh && enh.status === 'succeeded';

    return (
      <Overlay onClose={close} type="drawer">
        <div className="row gap10" style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
          <Icon name="bolt" size={18} className="acc" />
          <div className="grow"><b style={{ fontSize: 15 }}>视频画质增强</b><div className="faint" style={{ fontSize: 12 }}>火山 CV MediaKit · SubmitVideoEnhanceTask · 走控制面 AK/SK</div></div>
          <button className="icon-btn" onClick={close}><Icon name="x" size={18} /></button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 18 }} className="col gap20">
          {/* source */}
          <div>
            <div className="lbl">源镜头</div>
            <div className="row gap10" style={{ padding: 8, background: 'var(--surface-2)', borderRadius: 10 }}>
              <Thumb w={84} h={48} tone={s.tone} label="原片" playable />
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="row gap8"><span className="mono faint" style={{ fontSize: 11 }}>#{String(s.index).padStart(2, '0')}</span><span className="mono faint" style={{ fontSize: 11 }}>{s.params.resolution} · {s.params.ratio}</span></div>
                <div className="ellipsis" style={{ fontSize: 12.5, marginTop: 3 }}>{s.prompt.visual}</div>
              </div>
            </div>
          </div>

          {/* live status / result */}
          {busy && (
            <div className="card" style={{ padding: 12, borderColor: 'var(--accent-line)', background: 'var(--accent-soft)' }}>
              <div className="row gap8" style={{ fontSize: 13 }}><Icon name="refresh" size={15} className="spin acc" /><b>{enh.status === 'queued' ? '排队中…' : '增强处理中…'}</b><span className="grow"></span><span className="mono acc">{enh.progress || 0}%</span></div>
              <div style={{ marginTop: 8 }}><Progress value={enh.progress || 0} amber /></div>
              <div className="faint" style={{ fontSize: 11, marginTop: 6 }}>目标 {enh.res} · {(TYPES.find(t => t.id === enh.type) || {}).label} · 每 5s 轮询 GetVideoEnhanceTask</div>
            </div>
          )}
          {done && (
            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="row gap8" style={{ padding: '9px 12px', background: 'var(--st-done-bg)', color: 'var(--st-done)', fontSize: 12.5, fontWeight: 600 }}><Icon name="check" size={14} />增强完成 · {enh.res} · {(TYPES.find(t => t.id === enh.type) || {}).label}</div>
              <div className="row gap8" style={{ padding: 10 }}>
                <div className="col gap3" style={{ flex: 1 }}><span className="faint mono" style={{ fontSize: 10 }}>原片 {s.params.resolution}</span><Thumb w="100%" h={70} tone={s.tone} label="" playable /></div>
                <div className="center" style={{ color: 'var(--text-3)' }}><Icon name="arrowRight" size={16} /></div>
                <div className="col gap3" style={{ flex: 1 }}><span className="acc mono" style={{ fontSize: 10 }}>增强 {enh.res}</span><Thumb w="100%" h={70} tone={s.tone} label="HD" playable /></div>
              </div>
              <div style={{ padding: '0 10px 10px' }}><button className="btn btn-soft btn-sm" style={{ width: '100%' }}><Icon name="download" size={13} />下载增强视频</button></div>
            </div>
          )}

          {/* enhance type */}
          <div>
            <div className="lbl">增强类型 Enhance Type</div>
            <div className="col gap8">
              {TYPES.map(t => (
                <div key={t.id} onClick={() => setType(t.id)} className="row gap10" style={{ cursor: 'pointer', padding: '10px 12px', borderRadius: 10, border: '1px solid ' + (type === t.id ? 'var(--accent-line)' : 'var(--line-2)'), background: type === t.id ? 'var(--accent-soft)' : 'transparent' }}>
                  <span className="center" style={{ width: 18, height: 18, borderRadius: '50%', flex: '0 0 auto', border: '2px solid ' + (type === t.id ? 'var(--accent)' : 'var(--line-3)'), color: 'var(--accent)' }}>{type === t.id ? <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }}></span> : null}</span>
                  <div className="grow">
                    <div className="row gap6"><b style={{ fontSize: 13 }}>{t.label}</b><span className="mono faint" style={{ fontSize: 10.5, whiteSpace: 'nowrap' }}>{t.en}</span>{t.id === 'ai-model' && <span className="tag" style={{ height: 17, fontSize: 9.5, color: 'var(--accent-text)' }}>推荐</span>}</div>
                    <div className="faint" style={{ fontSize: 11.5, marginTop: 1 }}>{t.desc}</div>
                  </div>
                  <span className="mono faint" style={{ fontSize: 11 }}>×{t.mult}</span>
                </div>
              ))}
            </div>
          </div>

          {/* target resolution */}
          <div>
            <div className="lbl">目标分辨率 Target Resolution</div>
            <div className="row gap6 wrap">{RES.map(r => <button key={r} onClick={() => setRes(r)} className="tag" style={{ height: 30, padding: '0 14px', cursor: 'pointer', background: res === r ? 'var(--accent-soft)' : undefined, borderColor: res === r ? 'var(--accent-line)' : undefined, color: res === r ? 'var(--accent-text)' : undefined }}>{r}</button>)}</div>
          </div>

          <div className="row gap8" style={{ fontSize: 11.5, color: 'var(--text-2)', padding: '9px 11px', background: 'var(--surface-2)', borderRadius: 9 }}><Icon name="shield" size={16} className="acc" /><span>调用控制面 AK/SK（CV MediaKit，HMAC-SHA256 v4 签名）。视频须为可公开访问 URL；大模型效果最佳但耗时较长。</span></div>
        </div>

        {/* footer */}
        <div style={{ borderTop: '1px solid var(--line)', padding: 16 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div className="faint" style={{ fontSize: 12 }}>预扣积分 · {res} × {(TYPES.find(t => t.id === type) || {}).label}</div>
              <div className="row gap6" style={{ alignItems: 'baseline' }}><span className="mono acc" style={{ fontSize: 22, fontWeight: 700 }}>{fmt.credits(cost)}</span><span className="faint" style={{ fontSize: 12 }}>积分</span></div>
            </div>
            <div style={{ textAlign: 'right', fontSize: 12 }}><div className="faint">钱包余额</div><div className="mono" style={{ fontWeight: 600 }}>{fmt.credits(app.wallet.balance)}</div></div>
          </div>
          <div className="row gap8">
            <button className="btn btn-ghost grow" onClick={close}>{done ? '关闭' : '取消'}</button>
            <button className="btn btn-pri grow" disabled={busy} onClick={() => app.submitEnhance(s.id, { type, res }, cost)}>
              <Icon name={busy ? 'refresh' : done ? 'retry' : 'bolt'} size={16} className={busy ? 'spin' : ''} />{busy ? '增强中…' : done ? '重新增强' : '提交增强 · 预扣 ' + fmt.credits(cost)}
            </button>
          </div>
        </div>
      </Overlay>
    );
  }

  // ---------------- Task Center ----------------
  function TaskCenterScreen() {
    const app = useApp();
    const [fState, setFState] = useState('all');
    const [fModel, setFModel] = useState('all');
    const tasks = app.tasks.filter(t => (fState === 'all' || t.state === fState) && (fModel === 'all' || t.model === fModel));
    const shotOf = (id) => app.shots.find(s => s.id === id);

    const stats = [
      { k: '运行中', v: app.tasks.filter(t => t.state === 'running').length, c: 'var(--st-running)' },
      { k: '排队', v: app.tasks.filter(t => t.state === 'queued').length, c: 'var(--st-queued)' },
      { k: '已完成', v: app.tasks.filter(t => t.state === 'succeeded').length, c: 'var(--st-done)' },
      { k: '失败', v: app.tasks.filter(t => t.state === 'failed').length, c: 'var(--st-failed)' },
    ];
    const succ = app.tasks.filter(t => t.state === 'succeeded').length;
    const fin = app.tasks.filter(t => ['succeeded', 'failed'].includes(t.state)).length;

    return (
      <Screen crumb={<Crumb parts={[{ label: '任务中心' }]} />}>
        <div className="page">
          <div className="page-head">
            <div className="grow">
              <div className="page-title">任务中心</div>
              <div className="page-sub">聚合全部生成任务 · 对应 Provider「查询任务列表」分页过滤 · 每分钟兜底轮询对账</div>
            </div>
            <button className="btn btn-ghost btn-sm"><Icon name="download" size={14} />导出 CSV</button>
            <button className="btn btn-ghost btn-sm"><Icon name="refresh" size={14} />刷新</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 18 }}>
            {stats.map(s => (
              <div className="stat" key={s.k}>
                <div className="k"><span className="dot" style={{ width: 8, height: 8, borderRadius: '50%', background: s.c }}></span>{s.k}</div>
                <div className="v mono">{s.v}</div>
              </div>
            ))}
            <div className="stat">
              <div className="k"><Icon name="check" size={14} />成功率</div>
              <div className="v mono">{fin ? Math.round(succ / fin * 100) : 100}%</div>
            </div>
          </div>

          {/* filters */}
          <div className="row gap8 wrap" style={{ marginBottom: 12 }}>
            <Menu align="left" trigger={<button className="btn btn-ghost btn-sm"><Icon name="filter" size={13} />状态：{fState === 'all' ? '全部' : fState}<Icon name="chevDown" size={12} /></button>}
              items={['all', 'running', 'queued', 'succeeded', 'failed'].map(s => ({ icon: s === fState ? 'check' : 'cpu', label: s === 'all' ? '全部' : s, onClick: () => setFState(s) }))} />
            <Menu align="left" trigger={<button className="btn btn-ghost btn-sm"><Icon name="cpu" size={13} />模型：{fModel === 'all' ? '全部' : fModel}<Icon name="chevDown" size={12} /></button>}
              items={['all', ...DATA.models.map(m => m.id)].map(s => ({ icon: s === fModel ? 'check' : 'cpu', label: s === 'all' ? '全部' : s, onClick: () => setFModel(s) }))} />
            <span className="grow"></span>
            <span className="faint" style={{ fontSize: 12 }}>共 {tasks.length} 条</span>
          </div>

          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl" style={{ fontSize: 12.5, minWidth: 880 }}>
                <thead><tr><th>任务 ID</th><th>镜头</th><th>能力</th><th>模型</th><th>状态 / 进度</th><th>消耗</th><th>提交人</th><th>提交时间</th><th></th></tr></thead>
                <tbody>
                  {tasks.map(t => {
                    const sh = shotOf(t.shot);
                    return (
                      <tr className="trow" key={t.id}>
                        <td><div className="col"><span className="mono">{t.id}</span><span className="mono faint" style={{ fontSize: 10.5 }}>{t.ptid}</span></div></td>
                        <td><div className="row gap8">{sh && <Thumb w={40} h={24} tone={sh.tone} label="" />}<span className="mono faint">#{String(t.shotIdx).padStart(2, '0')}</span></div></td>
                        <td><span className="tag mono" style={{ fontSize: 10.5 }}>{t.cap}</span></td>
                        <td className="mono faint" style={{ fontSize: 11 }}>{t.model.replace('seedance-', 'sd-')}</td>
                        <td style={{ width: 160 }}>
                          <StatusPill status={t.state} map={TASK_STATUS} mono />
                          {t.state === 'running' && <div style={{ marginTop: 5 }}><Progress value={t.progress} amber /></div>}
                          {t.state === 'failed' && t.error && <div style={{ fontSize: 10.5, color: 'var(--st-failed)', marginTop: 3 }}>{t.error}</div>}
                        </td>
                        <td className="mono">{t.cost ? t.cost : <span className="faint">—</span>}</td>
                        <td><div className="row gap6"><Avatar name={nameOf(t.by)} size={20} /><span className="muted">{nameOf(t.by)}</span></div></td>
                        <td className="faint">{fmt.ago(t.created)}</td>
                        <td>
                          {t.state === 'failed'
                            ? <button className="btn btn-ghost btn-sm" onClick={() => t.cap === 'video-enhance' ? app.openEnhance(t.shot) : app.openGenerate([t.shot])}><Icon name="retry" size={13} />重试</button>
                            : t.state === 'succeeded'
                              ? <button className="icon-btn" style={{ width: 26, height: 26 }}><Icon name="download" size={15} /></button>
                              : <span className="faint mono" style={{ fontSize: 11 }}>{t.progress || 0}%</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {tasks.length === 0 && <Empty icon="cpu" title="没有匹配的任务" sub="调整筛选条件，或从分镜表提交新的生成任务。" />}
          </div>
        </div>
      </Screen>
    );
  }

  Object.assign(window, { GenerationDrawer, EnhanceDrawer, TaskCenterScreen });
})();
