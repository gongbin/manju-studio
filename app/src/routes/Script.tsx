import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen, Crumb } from '@/app/Shell';
import { Icon } from '@/ui/icon';
import { Menu } from '@/ui/menu';
import { Modal } from '@/ui/dialog';
import { StatusPill } from '@/ui/primitives';
import { toast } from '@/ui/toast';
import { EP_STATUS } from '@/lib/status';
import { fmt } from '@/lib/format';
import { projects as pSeed, episodes as eSeed, nameOf } from '@/lib/mock';
import { api } from '@/lib/api';
import { useSettings, settingsStore, activeLlm } from '@/lib/settings';
import { DEFAULT_BREAKDOWN_PROMPT, type BreakdownResult } from '@/lib/breakdown';

function PromptModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useSettings();
  const [val, setVal] = useState(s.breakdown.systemPrompt);
  const save = () => { settingsStore.setBreakdown({ systemPrompt: val.trim() || DEFAULT_BREAKDOWN_PROMPT }); toast('分镜提示词已保存', 'check'); onClose(); };
  return (
    <Modal open={open} onClose={onClose}>
      <div style={{ width: 'min(640px, 94vw)' }}>
        <div className="row gap10" style={{ padding: '15px 18px', borderBottom: '1px solid var(--line)' }}>
          <span className="center" style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent-text)' }}><Icon name="wand" size={17} /></span>
          <div className="grow"><b style={{ fontSize: 15 }}>分镜提示词设置</b><div className="faint" style={{ fontSize: 12 }}>控制如何把剧本拆成场次 / 镜头 / 结构化提示词（System Prompt）</div></div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div style={{ padding: 18 }} className="col gap12">
          <textarea className="field mono" value={val} onChange={(e) => setVal(e.target.value)} spellCheck={false} style={{ minHeight: 320, lineHeight: 1.6, fontSize: 12.5, resize: 'vertical' }} />
          <div className="row gap8" style={{ fontSize: 11.5, color: 'var(--text-2)', padding: '9px 11px', background: 'var(--surface-2)', borderRadius: 9 }}><Icon name="info" size={15} className="acc" /><span>模型须返回严格 JSON（scenes → shots）。改坏了可「恢复默认」。运行时密钥在服务端，前端不持有。</span></div>
        </div>
        <div className="row gap8" style={{ padding: 16, borderTop: '1px solid var(--line)' }}>
          <button className="btn btn-ghost" onClick={() => setVal(DEFAULT_BREAKDOWN_PROMPT)}><Icon name="retry" size={14} />恢复默认</button>
          <span className="grow" />
          <button className="btn btn-ghost" onClick={onClose}>取消</button>
          <button className="btn btn-pri" onClick={save}><Icon name="check" size={15} />保存提示词</button>
        </div>
      </div>
    </Modal>
  );
}

export function Script() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const s = useSettings();
  const fileRef = useRef<HTMLInputElement>(null);
  const { projectId, episodeId } = useParams({ strict: false }) as { projectId: string; episodeId: string };
  const { data: projects = pSeed } = useQuery({ queryKey: ['projects'], queryFn: api.listProjects, initialData: pSeed });
  const { data: episodes = eSeed } = useQuery({ queryKey: ['episodes'], queryFn: api.listEpisodes, initialData: eSeed });
  const p = projects.find((x) => x.id === projectId) || projects[0];
  const ep = episodes.find((e) => e.id === episodeId) || episodes[0];

  const [phase, setPhase] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [text, setText] = useState(ep.script ?? '');
  const [savedText, setSavedText] = useState(ep.script ?? '');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<BreakdownResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  // 切换剧集时载入该集剧本（避免覆盖正在编辑的内容：仅在 episode 变化时重置）。
  useEffect(() => { setText(ep.script ?? ''); setSavedText(ep.script ?? ''); setPhase('idle'); setResult(null); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [ep.id]);
  const dirty = text !== savedText;

  const prov = activeLlm(s);
  const model = s.breakdown.model;
  const setModel = (m: string) => settingsStore.setBreakdown({ model: m });
  const customModel = () => { const m = window.prompt('输入模型 ID', model); if (m && m.trim()) setModel(m.trim()); };

  const run = async () => {
    if (!text.trim()) { toast('请先输入剧本文本', 'warn'); return; }
    setPhase('running'); setErr(null);
    try {
      const r = await api.breakdown({ script: text, providerId: prov.id, style: prov.style, model, baseUrl: prov.baseUrl, systemPrompt: s.breakdown.systemPrompt });
      if (!r.scenes?.length) { setErr('未能解析出分镜结构，请检查剧本格式或调整提示词后重试。'); setPhase('error'); return; }
      setResult(r); setPhase('done');
    } catch (e) { setErr(String(e instanceof Error ? e.message : e)); setPhase('error'); }
  };
  const apply = async () => {
    if (!result) return;
    setApplying(true);
    try {
      const out = await api.applyBreakdown(ep.id, result);
      qc.invalidateQueries({ queryKey: ['scenes'] });
      qc.invalidateQueries({ queryKey: ['shots'] });
      qc.invalidateQueries({ queryKey: ['episodes'] });
      toast(`已应用到分镜表 · ${out.scenes} 场 ${out.shots} 镜头`, 'check');
      navigate({ to: '/project/$projectId/$episodeId/storyboard', params: { projectId: p.id, episodeId: ep.id } });
    } catch (e) { toast('应用失败：' + (e instanceof Error ? e.message : e), 'warn'); setApplying(false); }
  };
  const save = async () => {
    setSaving(true);
    try {
      await api.saveScript(ep.id, text);
      setSavedText(text);
      qc.invalidateQueries({ queryKey: ['episodes'] });
      toast(`已保存 EP${fmt.pad2(ep.index)} · ${ep.title} 剧本`, 'check');
    } catch (e) { toast('保存失败：' + (e instanceof Error ? e.message : e), 'warn'); }
    finally { setSaving(false); }
  };
  const paste = async () => { try { const t = await navigator.clipboard.readText(); if (t) { setText(t); toast('已粘贴剪贴板文本', 'paste'); } } catch { toast('无法读取剪贴板，请手动粘贴', 'warn'); } };
  const importFile = (f?: File) => { if (!f) return; const r = new FileReader(); r.onload = () => { setText(String(r.result || '')); toast('已导入 ' + f.name, 'import'); }; r.readAsText(f); };

  const totalShots = result?.scenes.reduce((a, sc) => a + sc.shots.length, 0) ?? 0;

  return (
    <Screen crumb={<Crumb parts={[{ label: '项目', to: '/' }, { label: p.name, to: '/project/$projectId', params: { projectId: p.id } }, { label: `EP${fmt.pad2(ep.index)} · ${ep.title}` }]} />}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="row gap12 wrap" style={{ padding: '12px 22px', borderBottom: '1px solid var(--line)' }}>
          <div className="grow">
            <div className="row gap10"><span style={{ fontWeight: 700, fontSize: 16 }}>EP{fmt.pad2(ep.index)} · {ep.title}</span><StatusPill status={ep.status} map={EP_STATUS} />{dirty && <span className="pill" style={{ color: 'var(--st-review)', background: 'var(--st-review-bg)' }}><Icon name="edit" size={11} />未保存</span>}</div>
            <div className="faint" style={{ fontSize: 12, marginTop: 2 }}>剧本 · 智能分镜 · {nameOf('u_qi')} 编辑于 {fmt.ago(ep.updated)}</div>
          </div>
          <div className="row gap8">
            <input ref={fileRef} type="file" accept=".txt,.md,.json,text/*" style={{ display: 'none' }} onChange={(e) => { importFile(e.target.files?.[0]); e.target.value = ''; }} />
            <button className="btn btn-ghost btn-sm" onClick={paste}><Icon name="paste" size={14} />粘贴文本</button>
            <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}><Icon name="import" size={14} />导入 txt / md / json</button>
            <button className="btn btn-pri btn-sm" onClick={save} disabled={!dirty || saving}>{saving ? <Icon name="refresh" size={14} className="spin" /> : <Icon name="check" size={14} />}保存剧本</button>
          </div>
        </div>

        <div className="row gap8 wrap" style={{ padding: '10px 22px', fontSize: 12, color: 'var(--text-2)', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}>
          <Icon name="info" size={14} className="faint" />
          剧本不绑定单一大模型：可手写、外部粘贴 / 导入，或用站内可插拔 LLM 一键分镜。提示词字段永远可手动编辑。
        </div>

        <div className="sb-split" style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          <div style={{ borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div className="row gap6" style={{ padding: '9px 16px', borderBottom: '1px solid var(--line)' }}>
              <Icon name="doc" size={15} className="faint" /><b style={{ fontSize: 13 }}>剧本</b>
              <span className="grow" /><span className="faint mono" style={{ fontSize: 11 }}>Markdown · {text.length} 字</span>
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} placeholder="在此粘贴或编写剧本。建议用 ## 标记场次，「角色（情绪）：台词」标记对白…"
              style={{ flex: 1, border: 'none', outline: 'none', resize: 'none', padding: '18px 22px', background: 'transparent', color: 'var(--text)', lineHeight: 1.85, fontSize: 14, fontFamily: '"Noto Sans SC", system-ui' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--surface-2)' }}>
            <div className="row gap8 wrap" style={{ padding: '9px 16px', borderBottom: '1px solid var(--line)' }}>
              <Icon name="wand" size={16} className="acc" /><b style={{ fontSize: 13.5 }}>分场 / 分镜</b><span className="grow" />
              <button className="btn btn-ghost btn-sm" onClick={() => setShowPrompt(true)}><Icon name="settings" size={13} />提示词</button>
              <Menu align="end" trigger={<button className="btn btn-ghost btn-sm"><Icon name="cpu" size={13} /><span className="ellipsis" style={{ maxWidth: 96 }}>{prov.name}</span><span className="mono faint" style={{ fontSize: 11 }}>{model}</span><Icon name="chevDown" size={13} /></button>}
                items={[
                  ...s.llm.providers.map((pr) => ({ icon: pr.id === prov.id ? 'check' : 'cpu', label: `${pr.name} · ${pr.model}`, onClick: () => settingsStore.setActiveLlm(pr.id) })),
                  { sep: true },
                  { icon: 'edit', label: '自定义模型 ID…', onClick: customModel },
                  { icon: 'settings', label: '管理 LLM 源…', onClick: () => navigate({ to: '/settings' }) },
                ]} />
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
              {phase === 'idle' && (
                <div className="center" style={{ height: '100%', textAlign: 'center', padding: 20 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', color: 'var(--accent-text)', marginBottom: 16 }}><Icon name="wand" size={26} /></div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>把剧本拆成镜头草稿</div>
                  <div className="muted" style={{ fontSize: 13, maxWidth: 340, marginTop: 6 }}>用 <span className="mono acc">{model}</span> 自动拆分场次、生成 Shot 草稿与结构化画面提示词。结果可逐项编辑，也可直接手填。</div>
                  <button className="btn btn-pri" style={{ marginTop: 18 }} onClick={run}><Icon name="sparkle" size={16} />智能分镜</button>
                  <div className="faint" style={{ fontSize: 11, marginTop: 12 }}>{prov.name} · <span className="mono">{prov.baseUrl}</span> · {prov.style === 'anthropic' ? 'Anthropic 原生' : 'OpenAI 兼容'} · 在「设置 · Provider 凭据」配置各源 Key（改动无需重新部署）；未配置时走本地启发式拆分</div>
                </div>
              )}

              {phase === 'running' && (
                <div className="center" style={{ height: '100%', textAlign: 'center', padding: 20 }}>
                  <Icon name="refresh" size={30} className="spin acc" />
                  <div style={{ fontWeight: 600, fontSize: 14.5, marginTop: 14 }}>正在用 {model} 拆分剧本…</div>
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 6, maxWidth: 320 }}>解析结构 → 切分场次 → 生成镜头草稿 → 扩写画面提示词。大模型推理可能需要十几秒。</div>
                </div>
              )}

              {phase === 'error' && (
                <div className="center" style={{ height: '100%', textAlign: 'center', padding: 20 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--st-failed-bg)', display: 'grid', placeItems: 'center', color: 'var(--st-failed)', marginBottom: 14 }}><Icon name="warn" size={24} /></div>
                  <div style={{ fontWeight: 600, fontSize: 14.5 }}>分镜失败</div>
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 6, maxWidth: 360, wordBreak: 'break-word' }}>{err}</div>
                  <button className="btn btn-pri" style={{ marginTop: 16 }} onClick={run}><Icon name="retry" size={15} />重试</button>
                </div>
              )}

              {phase === 'done' && result && (
                <div className="col gap14">
                  <div className="row gap8 wrap" style={{ fontSize: 12 }}>
                    <span className="pill" style={{ color: 'var(--st-done)', background: 'var(--st-done-bg)' }}><Icon name="check" size={12} />{result.scenes.length} 场 · {totalShots} 镜头</span>
                    <span className="faint">由 <span className="mono">{model}</span> 生成 · 应用后可在分镜表逐项编辑</span>
                  </div>
                  {result.scenes.map((sc, si) => (
                    <div key={si} className="card" style={{ overflow: 'hidden' }}>
                      <div style={{ padding: '10px 12px', background: 'var(--surface-3)', borderBottom: '1px solid var(--line)' }}>
                        <div className="row gap8"><b style={{ fontSize: 13 }}>{sc.title}</b><span className="grow" /><span className="faint mono" style={{ fontSize: 11 }}>{sc.shots.length} shot</span></div>
                        <div className="row gap10 wrap" style={{ marginTop: 5, fontSize: 11.5 }}>
                          {sc.loc && <span className="faint">📍 {sc.loc}</span>}{sc.time && <span className="faint">· {sc.time}</span>}{sc.mood && <span className="faint">· {sc.mood}</span>}
                          <span className="row gap4 wrap">{sc.characters.map((c, i) => <span key={i} className="tag" style={{ height: 18, fontSize: 10.5 }}>{c}</span>)}</span>
                        </div>
                      </div>
                      <div>
                        {sc.shots.map((sh, i) => (
                          <div key={i} className="row gap10" style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)', alignItems: 'flex-start' }}>
                            <span className="mono faint" style={{ fontSize: 11, flex: '0 0 26px', paddingTop: 1 }}>#{fmt.pad2(i + 1)}</span>
                            <div className="grow" style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 12.5 }}>{sh.visual}</div>
                              {sh.dialogue && <div className="acc" style={{ fontSize: 11.5, marginTop: 2 }}>「{sh.dialogue}」</div>}
                              {sh.voiceover && <div className="muted" style={{ fontSize: 11.5, marginTop: 2 }}>旁白：{sh.voiceover}</div>}
                            </div>
                            <span className="tag mono" style={{ height: 18, fontSize: 10, flexShrink: 0 }}>{sh.cameraPosition.split('·')[0] || '镜头'} · {sh.duration}s</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {phase === 'done' && (
              <div className="row gap8" style={{ padding: '12px 16px', borderTop: '1px solid var(--line)' }}>
                <button className="btn btn-ghost btn-sm" onClick={run} disabled={applying}><Icon name="refresh" size={13} />重新生成</button>
                <span className="grow" />
                <button className="btn btn-pri" onClick={apply} disabled={applying}>{applying ? <Icon name="refresh" size={15} className="spin" /> : <>应用到分镜表<Icon name="arrowRight" size={15} /></>}</button>
              </div>
            )}
          </div>
        </div>
      </div>
      <PromptModal open={showPrompt} onClose={() => setShowPrompt(false)} />
    </Screen>
  );
}
