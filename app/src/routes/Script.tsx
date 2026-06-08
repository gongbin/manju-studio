import { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { Screen, Crumb } from '@/app/Shell';
import { Icon } from '@/ui/icon';
import { Menu } from '@/ui/menu';
import { StatusPill } from '@/ui/primitives';
import { EP_STATUS } from '@/lib/status';
import { fmt } from '@/lib/format';
import { projects as pSeed, episodes as eSeed, scenes, shots, scriptContent, nameOf, charOf } from '@/lib/mock';

const LLMS = [
  { id: 'doubao', label: '火山 · 豆包 Pro', sub: 'volcengine' },
  { id: 'claude', label: 'Claude Sonnet', sub: 'anthropic' },
  { id: 'gpt', label: 'GPT-4o', sub: 'openai' },
  { id: 'local', label: '自建 · OpenAI 兼容端点', sub: 'custom' },
];
const GEN_STEPS = ['解析剧本结构', '拆分场次 Scene', '生成镜头草稿 Shot', '扩写画面提示词', '映射出场角色'];

export function Script() {
  const navigate = useNavigate();
  const { projectId, episodeId } = useParams({ strict: false }) as { projectId: string; episodeId: string };
  const p = pSeed.find((x) => x.id === projectId) || pSeed[0];
  const ep = eSeed.find((e) => e.id === episodeId) || eSeed[2];
  const hasBreakdown = ep.shots > 0 || episodeId === 'e3';

  const [phase, setPhase] = useState<'idle' | 'gen' | 'done'>(hasBreakdown ? 'done' : 'idle');
  const [llm, setLlm] = useState(LLMS[0]);
  const [text, setText] = useState(scriptContent);
  const [genStep, setGenStep] = useState(0);

  const shotsByScene = (sid: string) => shots.filter((s) => s.scene === sid);
  const runBreakdown = () => {
    setPhase('gen'); setGenStep(0);
    let i = 0;
    const t = setInterval(() => {
      i++; setGenStep(i);
      if (i >= GEN_STEPS.length) { clearInterval(t); setTimeout(() => setPhase('done'), 350); }
    }, 520);
  };

  return (
    <Screen crumb={<Crumb parts={[{ label: '项目', to: '/' }, { label: p.name, to: '/project/$projectId', params: { projectId: p.id } }, { label: `EP${fmt.pad2(ep.index)} · ${ep.title}` }]} />}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div className="row gap12 wrap" style={{ padding: '12px 22px', borderBottom: '1px solid var(--line)' }}>
          <div className="grow">
            <div className="row gap10"><span style={{ fontWeight: 700, fontSize: 16 }}>剧本 · 智能分镜</span><StatusPill status={ep.status} map={EP_STATUS} /></div>
            <div className="faint" style={{ fontSize: 12, marginTop: 2 }}>v7 · {nameOf('u_qi')} 编辑于 {fmt.ago(ep.updated)}</div>
          </div>
          <div className="row gap8">
            <button className="btn btn-ghost btn-sm"><Icon name="paste" size={14} />粘贴文本</button>
            <button className="btn btn-ghost btn-sm"><Icon name="import" size={14} />导入 JSON / md</button>
          </div>
        </div>

        <div className="row gap8 wrap" style={{ padding: '10px 22px', fontSize: 12, color: 'var(--text-2)', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}>
          <Icon name="info" size={14} className="faint" />
          剧本不绑定任何单一大模型：可在此手写、从外部 LLM 粘贴 / 导入，或用站内可插拔 LLM 一键分镜 —— 提示词字段永远可手动编辑。
        </div>

        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          <div style={{ borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div className="row gap6" style={{ padding: '8px 14px', borderBottom: '1px solid var(--line)' }}>
              {['type', 'bolt', 'list', 'image', 'mic'].map((ic) => <button key={ic} className="icon-btn" style={{ width: 28, height: 28 }}><Icon name={ic} size={15} /></button>)}
              <span className="grow" /><span className="faint mono" style={{ fontSize: 11 }}>Markdown · {text.length} 字</span>
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} spellCheck={false}
              style={{ flex: 1, border: 'none', outline: 'none', resize: 'none', padding: '18px 22px', background: 'transparent', color: 'var(--text)', lineHeight: 1.85, fontSize: 14, fontFamily: '"Noto Sans SC", system-ui' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--surface-2)' }}>
            <div className="row gap10" style={{ padding: '10px 16px', borderBottom: '1px solid var(--line)' }}>
              <Icon name="wand" size={16} className="acc" /><b style={{ fontSize: 13.5 }}>分场 / 分镜</b><span className="grow" />
              <Menu align="end" trigger={<button className="btn btn-ghost btn-sm"><Icon name="cpu" size={13} />{llm.label}<Icon name="chevDown" size={13} /></button>}
                items={LLMS.map((m) => ({ icon: m.id === llm.id ? 'check' : 'cpu', label: m.label, onClick: () => setLlm(m) }))} />
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
              {phase === 'idle' && (
                <div className="center" style={{ height: '100%', textAlign: 'center', padding: 20 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', color: 'var(--accent-text)', marginBottom: 16 }}><Icon name="wand" size={26} /></div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>把剧本拆成镜头草稿</div>
                  <div className="muted" style={{ fontSize: 13, maxWidth: 320, marginTop: 6 }}>用 <b>{llm.label}</b> 自动拆分场次、生成 Shot 草稿与结构化画面提示词。结果可逐项编辑，也可直接手填。</div>
                  <button className="btn btn-pri" style={{ marginTop: 18 }} onClick={runBreakdown}><Icon name="sparkle" size={16} />智能分镜</button>
                </div>
              )}

              {phase === 'gen' && (
                <div className="col gap10" style={{ paddingTop: 8 }}>
                  {GEN_STEPS.map((s, i) => (
                    <div key={i} className="row gap10" style={{ fontSize: 13, opacity: i <= genStep ? 1 : 0.35, transition: 'opacity .3s' }}>
                      <span className="center" style={{ width: 22, height: 22, borderRadius: '50%', background: i < genStep ? 'var(--st-done-bg)' : 'var(--surface-3)', color: i < genStep ? 'var(--st-done)' : 'var(--text-3)' }}>
                        {i < genStep ? <Icon name="check" size={13} strokeWidth={3} /> : i === genStep ? <Icon name="refresh" size={13} className="spin" /> : <span className="mono" style={{ fontSize: 11 }}>{i + 1}</span>}
                      </span>
                      <span style={{ fontWeight: i === genStep ? 600 : 400 }}>{s}</span>
                    </div>
                  ))}
                </div>
              )}

              {phase === 'done' && (
                <div className="col gap14">
                  <div className="row gap8" style={{ fontSize: 12 }}>
                    <span className="pill" style={{ color: 'var(--st-done)', background: 'var(--st-done-bg)' }}><Icon name="check" size={12} />{scenes.length} 场 · {shots.length} 镜头</span>
                    <span className="faint">由 {llm.label} 生成 · 可编辑</span>
                  </div>
                  {scenes.map((sc) => (
                    <div key={sc.id} className="card" style={{ overflow: 'hidden' }}>
                      <div style={{ padding: '10px 12px', background: 'var(--surface-3)', borderBottom: '1px solid var(--line)' }}>
                        <div className="row gap8"><b style={{ fontSize: 13 }}>{sc.title}</b><span className="grow" /><span className="faint mono" style={{ fontSize: 11 }}>{shotsByScene(sc.id).length} shot</span></div>
                        <div className="row gap10 wrap" style={{ marginTop: 5, fontSize: 11.5 }}>
                          <span className="faint">📍 {sc.loc}</span><span className="faint">· {sc.time}</span><span className="faint">· {sc.mood}</span>
                          <span className="row gap4">{sc.chars.map((c) => <span key={c} className="tag" style={{ height: 18, fontSize: 10.5 }}>{charOf(c)?.name || c}</span>)}</span>
                        </div>
                      </div>
                      <div>
                        {shotsByScene(sc.id).map((sh) => (
                          <div key={sh.id} className="row gap10" style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)' }}>
                            <span className="mono faint" style={{ fontSize: 11, flex: '0 0 26px' }}>#{fmt.pad2(sh.index)}</span>
                            <span className="grow ellipsis" style={{ fontSize: 12.5 }}>{sh.prompt.visual}</span>
                            <span className="tag" style={{ height: 18, fontSize: 10.5 }}>{sh.prompt.cameraPosition.split('·')[0]}</span>
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
                <button className="btn btn-ghost btn-sm" onClick={runBreakdown}><Icon name="refresh" size={13} />重新生成</button>
                <span className="grow" />
                <button className="btn btn-pri" onClick={() => navigate({ to: '/project/$projectId/$episodeId/storyboard', params: { projectId: p.id, episodeId: ep.id } })}>应用到分镜表<Icon name="arrowRight" size={15} /></button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Screen>
  );
}
