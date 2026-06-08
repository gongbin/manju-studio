import { useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen, Crumb } from '@/app/Shell';
import { Icon } from '@/ui/icon';
import { Menu } from '@/ui/menu';
import { Seg, Progress } from '@/ui/controls';
import { Modal } from '@/ui/dialog';
import { Thumb, StatusPill, Avatar, AvatarStack } from '@/ui/primitives';
import { toast } from '@/ui/toast';
import { api } from '@/lib/api';
import { fmt } from '@/lib/format';
import { EP_STATUS } from '@/lib/status';
import { nameOf, projects as pSeed, episodes as eSeed, members } from '@/lib/mock';
import type { Episode, Project as TProject } from '@/lib/types';

const COLS = (['draft', 'producing', 'review', 'published'] as const).map((k) => ({ key: k, ...EP_STATUS[k] }));

function NewEpisodeModal({ open, project, nextIndex, onClose }: { open: boolean; project: TProject; nextIndex: number; onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState<string | null>(null);
  const submit = async () => {
    if (!title.trim()) return;
    await api.addEpisode(project.id, { title: title.trim(), assignee });
    qc.invalidateQueries({ queryKey: ['episodes'] });
    qc.invalidateQueries({ queryKey: ['projects'] });
    toast('已新建剧集 · ' + title.trim(), 'clapper');
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose}>
      <div style={{ width: 'min(440px, 94vw)' }}>
        <div className="row gap10" style={{ padding: '15px 18px', borderBottom: '1px solid var(--line)' }}>
          <span className="center" style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent-text)' }}><Icon name="clapper" size={17} /></span>
          <div className="grow"><b style={{ fontSize: 15 }}>新建剧集</b><div className="faint" style={{ fontSize: 12 }}>{project.name} · 第 {nextIndex} 集</div></div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div style={{ padding: 18 }} className="col gap16">
          <div className="row gap10">
            <div style={{ flex: '0 0 64px' }}><div className="lbl">集号</div><div className="field center mono" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>EP{fmt.pad2(nextIndex)}</div></div>
            <label className="grow"><span className="lbl">剧集标题 <span style={{ color: 'var(--st-failed)' }}>*</span></span>
              <input className="field" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如：雨夜入城" onKeyDown={(e) => e.key === 'Enter' && submit()} /></label>
          </div>
          <div><div className="lbl">负责人</div>
            <div className="row gap6 wrap">
              <button onClick={() => setAssignee(null)} className="tag" style={{ height: 30, cursor: 'pointer', background: assignee === null ? 'var(--accent-soft)' : undefined, borderColor: assignee === null ? 'var(--accent-line)' : undefined, color: assignee === null ? 'var(--accent-text)' : undefined }}>未指派</button>
              {members.filter((m) => project.members.includes(m.id)).map((m) => { const on = assignee === m.id; return <button key={m.id} onClick={() => setAssignee(m.id)} className="tag" style={{ height: 30, cursor: 'pointer', paddingLeft: 4, background: on ? 'var(--accent-soft)' : undefined, borderColor: on ? 'var(--accent-line)' : undefined, color: on ? 'var(--accent-text)' : undefined }}><Avatar name={m.name} size={20} />{m.name}</button>; })}
            </div>
          </div>
          <div className="row gap8" style={{ fontSize: 11.5, color: 'var(--text-2)', padding: '9px 11px', background: 'var(--surface-2)', borderRadius: 9 }}><Icon name="info" size={15} className="faint" />创建后进入剧本编辑，可用智能分镜生成镜头草稿。</div>
        </div>
        <div className="row gap8" style={{ padding: 16, borderTop: '1px solid var(--line)' }}>
          <button className="btn btn-ghost grow" onClick={onClose}>取消</button>
          <button className="btn btn-pri grow" disabled={!title.trim()} onClick={submit}><Icon name="plus" size={15} />新建剧集</button>
        </div>
      </div>
    </Modal>
  );
}

function EpCard({ ep, onOpen }: { ep: Episode; onOpen: () => void }) {
  const pct = ep.shots ? Math.round((ep.done / ep.shots) * 100) : 0;
  return (
    <div className="card" style={{ padding: 12, cursor: 'pointer' }} onClick={onOpen}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="mono faint" style={{ fontSize: 11.5 }}>EP {fmt.pad2(ep.index)}</span>
        <Menu align="end" trigger={<button className="icon-btn" style={{ width: 24, height: 24 }} onClick={(e) => e.stopPropagation()}><Icon name="more" size={15} /></button>}
          items={[{ icon: 'doc', label: '打开剧本' }, { icon: 'table', label: '打开分镜' }, { sep: true }, { icon: 'copy', label: '复制剧集' }, { icon: 'trash', label: '归档', danger: true }]} />
      </div>
      <div style={{ fontWeight: 600, fontSize: 14.5, marginTop: 2 }}>{ep.title}</div>
      {ep.shots > 0 ? (
        <>
          <div className="row" style={{ justifyContent: 'space-between', margin: '11px 0 5px', fontSize: 11.5 }}>
            <span className="muted">{ep.done}/{ep.shots} 镜头</span><span className="mono faint">{pct}%</span>
          </div>
          <Progress value={pct} />
        </>
      ) : <div className="faint" style={{ fontSize: 12, margin: '11px 0 5px' }}>尚无分镜，从剧本开始 →</div>}
      <div className="row" style={{ justifyContent: 'space-between', marginTop: 11 }}>
        {ep.assignee ? <div className="row gap6"><Avatar name={nameOf(ep.assignee)} size={20} /><span className="faint" style={{ fontSize: 11.5 }}>{nameOf(ep.assignee)}</span></div> : <span className="faint" style={{ fontSize: 11.5 }}>未指派</span>}
        <span className="faint" style={{ fontSize: 11 }}>{fmt.ago(ep.updated)}</span>
      </div>
    </div>
  );
}

export function Project() {
  const navigate = useNavigate();
  const { projectId } = useParams({ strict: false }) as { projectId: string };
  const [view, setView] = useState('kanban');
  const [showNew, setShowNew] = useState(false);
  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: api.listProjects, initialData: pSeed });
  const { data: episodes = [] } = useQuery({ queryKey: ['episodes'], queryFn: api.listEpisodes, initialData: eSeed });

  const p = projects.find((x) => x.id === projectId) || projects[0];
  const eps = episodes.filter((e) => e.project === p.id);
  const openEp = (ep: Episode) => navigate({ to: ep.shots > 0 ? '/project/$projectId/$episodeId/storyboard' : '/project/$projectId/$episodeId/script', params: { projectId: p.id, episodeId: ep.id } });

  return (
    <Screen crumb={<Crumb parts={[{ label: '项目', to: '/' }, { label: p.name }]} />}>
      <div className="page">
        <div className="card" style={{ padding: 16, marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center' }}>
          <Thumb w={120} h={72} tone={p.tone} label={p.res} />
          <div className="grow">
            <div className="row gap10"><div className="page-title">{p.name}</div><StatusPill status={p.status} map={EP_STATUS} /></div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{p.synopsis}</div>
            <div className="row gap16 wrap" style={{ marginTop: 10, fontSize: 12 }}>
              <span className="row gap6 faint"><Icon name="film" size={14} />{p.ratio} · {p.res}</span>
              <span className="row gap6 faint"><Icon name="clapper" size={14} />{p.episodes} 集</span>
              <span className="row gap6">{p.style.map((s) => <span key={s} className="tag">{s}</span>)}</span>
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
            {COLS.map((col) => {
              const list = eps.filter((e) => e.status === col.key);
              return (
                <div key={col.key} style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 12, padding: 10, minHeight: 120 }}>
                  <div className="row gap8" style={{ padding: '2px 4px 10px' }}>
                    <span className="dot" style={{ width: 8, height: 8, borderRadius: '50%', background: col.c }} />
                    <b style={{ fontSize: 13 }}>{col.label}</b>
                    <span className="faint mono" style={{ fontSize: 11.5 }}>{list.length}</span>
                  </div>
                  <div className="col gap8">
                    {list.map((ep) => <EpCard key={ep.id} ep={ep} onOpen={() => openEp(ep)} />)}
                    {list.length === 0 && <div className="faint" style={{ fontSize: 12, padding: '8px 4px' }}>—</div>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="tbl">
              <thead><tr><th>#</th><th>标题</th><th>状态</th><th>进度</th><th>负责人</th><th>更新</th><th /></tr></thead>
              <tbody>
                {eps.map((ep) => (
                  <tr className="trow" key={ep.id} style={{ cursor: 'pointer' }} onClick={() => openEp(ep)}>
                    <td className="mono faint">EP{fmt.pad2(ep.index)}</td>
                    <td><b>{ep.title}</b></td>
                    <td><StatusPill status={ep.status} map={EP_STATUS} /></td>
                    <td style={{ width: 180 }}>{ep.shots > 0 ? <div className="row gap8"><div className="grow"><Progress value={Math.round((ep.done / ep.shots) * 100)} /></div><span className="mono faint" style={{ fontSize: 11.5 }}>{ep.done}/{ep.shots}</span></div> : <span className="faint">—</span>}</td>
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
      <NewEpisodeModal open={showNew} project={p} nextIndex={eps.length + 1} onClose={() => setShowNew(false)} />
    </Screen>
  );
}
