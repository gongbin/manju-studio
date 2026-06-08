import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen, Crumb } from '@/app/Shell';
import { Icon } from '@/ui/icon';
import { Seg } from '@/ui/controls';
import { Modal } from '@/ui/dialog';
import { Thumb, StatusPill, AvatarStack } from '@/ui/primitives';
import { toast } from '@/ui/toast';
import { api } from '@/lib/api';
import { fmt } from '@/lib/format';
import { EP_STATUS } from '@/lib/status';
import { nameOf, projects as seed, wallet } from '@/lib/mock';

const RATIOS = ['16:9', '9:16', '21:9', '1:1', '4:3'];
const RESES = ['720p', '1080p', '4K'];
const STYLE_OPTS = ['国风', '仙侠', '水墨', '治愈', '日常', '美食', '科幻', '赛博', '悬疑', '言情', '怀旧', '喜剧'];
const TONES: [string, string][] = [['b', '青紫'], ['a', '暗棕'], ['c', '暖褐'], ['d', '青绿']];

function chip(on: boolean) {
  return { height: 28, cursor: 'pointer', background: on ? 'var(--accent-soft)' : undefined, borderColor: on ? 'var(--accent-line)' : undefined, color: on ? 'var(--accent-text)' : undefined } as const;
}

function NewProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [tone, setTone] = useState('b');
  const [ratio, setRatio] = useState('16:9');
  const [res, setRes] = useState('1080p');
  const [style, setStyle] = useState<string[]>([]);
  const toggleStyle = (s: string) => setStyle((p) => (p.includes(s) ? p.filter((x) => x !== s) : p.length < 3 ? [...p, s] : p));
  const submit = async () => {
    if (!name.trim()) return;
    const id = await api.addProject({ name: name.trim(), synopsis, tone, ratio, res, style });
    qc.invalidateQueries({ queryKey: ['projects'] });
    toast('已创建项目 · ' + name.trim(), 'layers');
    onClose();
    navigate({ to: '/project/$projectId', params: { projectId: id } });
  };
  return (
    <Modal open={open} onClose={onClose}>
      <div style={{ width: 'min(520px, 94vw)' }}>
        <div className="row gap10" style={{ padding: '15px 18px', borderBottom: '1px solid var(--line)' }}>
          <span className="center" style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent-text)' }}><Icon name="layers" size={17} /></span>
          <div className="grow"><b style={{ fontSize: 15 }}>新建项目</b><div className="faint" style={{ fontSize: 12 }}>创建一部漫剧作品并设定基础规格</div></div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div style={{ padding: 18, maxHeight: '64vh', overflow: 'auto' }} className="col gap16">
          <label><span className="lbl">项目名称 <span style={{ color: 'var(--st-failed)' }}>*</span></span>
            <input className="field" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="如：青冥录" onKeyDown={(e) => e.key === 'Enter' && submit()} /></label>
          <label><span className="lbl">一句话简介</span>
            <textarea className="field" rows={2} value={synopsis} onChange={(e) => setSynopsis(e.target.value)} placeholder="概述故事背景与看点…" /></label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><div className="lbl">画面比例</div><div className="row gap6 wrap">{RATIOS.map((r) => <button key={r} onClick={() => setRatio(r)} className="tag mono" style={chip(ratio === r)}>{r}</button>)}</div></div>
            <div><div className="lbl">分辨率</div><div className="row gap6 wrap">{RESES.map((r) => <button key={r} onClick={() => setRes(r)} className="tag" style={chip(res === r)}>{r}</button>)}</div></div>
          </div>
          <div><div className="lbl">风格标签 <span className="faint">· 最多 3</span></div><div className="row gap6 wrap">{STYLE_OPTS.map((s) => { const on = style.includes(s); return <button key={s} onClick={() => toggleStyle(s)} className="tag" style={chip(on)}>{on && <Icon name="check" size={12} />}{s}</button>; })}</div></div>
          <div><div className="lbl">封面调性</div><div className="row gap8">{TONES.map(([tk, tl]) => <button key={tk} onClick={() => setTone(tk)} style={{ flex: 1, cursor: 'pointer', borderRadius: 9, overflow: 'hidden', border: '2px solid ' + (tone === tk ? 'var(--accent)' : 'transparent'), padding: 0 }}><Thumb w="100%" h={42} tone={tk} rounded={0} label={tl} /></button>)}</div></div>
        </div>
        <div className="row gap8" style={{ padding: 16, borderTop: '1px solid var(--line)' }}>
          <button className="btn btn-ghost grow" onClick={onClose}>取消</button>
          <button className="btn btn-pri grow" disabled={!name.trim()} onClick={submit}><Icon name="plus" size={15} />创建项目</button>
        </div>
      </div>
    </Modal>
  );
}

export function Projects() {
  const navigate = useNavigate();
  const [view, setView] = useState('grid');
  const [showNew, setShowNew] = useState(false);
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: api.listProjects, initialData: seed });

  const stats = [
    { k: '进行中项目', v: String(projects.filter((p) => p.status === 'producing').length), d: `共 ${projects.length} 个项目`, icon: 'layers', dc: 'muted' },
    { k: '制作中剧集', v: '2', d: '2 集待审', icon: 'clapper', dc: 'muted' },
    { k: '本月生成镜头', v: '186', d: '+34 较上周', icon: 'film', dc: 'acc' },
    { k: '本月积分消耗', v: fmt.credits(wallet.monthSpent), d: `预算 ${fmt.credits(wallet.monthBudget)}`, icon: 'coins', dc: 'muted' },
  ];

  return (
    <Screen crumb={<Crumb parts={[{ label: '项目 / 剧集' }]} />}>
      <div className="page">
        <div className="page-head">
          <div className="grow"><div className="page-title">项目 / 剧集</div><div className="page-sub">管理工作空间内的全部漫剧作品与剧集进度</div></div>
          <Seg value={view} onChange={setView} options={[{ value: 'grid', icon: 'grid' }, { value: 'list', icon: 'list' }]} />
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
              <div key={p.id} className="card rise" style={{ overflow: 'hidden', cursor: 'pointer', animationDelay: i * 50 + 'ms' }} onClick={() => navigate({ to: '/project/$projectId', params: { projectId: p.id } })}>
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
                  <div className="row gap6 wrap" style={{ marginTop: 10 }}>{p.style.map((s) => <span key={s} className="tag">{s}</span>)}</div>
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
                {projects.map((p) => (
                  <tr className="trow" key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate({ to: '/project/$projectId', params: { projectId: p.id } })}>
                    <td><div className="row gap10"><Thumb w={40} h={28} tone={p.tone} label="" /><b>{p.name}</b></div></td>
                    <td><div className="row gap6">{p.style.map((s) => <span key={s} className="tag">{s}</span>)}</div></td>
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
      <NewProjectModal open={showNew} onClose={() => setShowNew(false)} />
    </Screen>
  );
}
