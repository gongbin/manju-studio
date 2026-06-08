import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Screen, Crumb } from '@/app/Shell';
import { Icon } from '@/ui/icon';
import { Menu } from '@/ui/menu';
import { Thumb, StatusPill, Avatar, Empty } from '@/ui/primitives';
import { Progress } from '@/ui/controls';
import { api } from '@/lib/api';
import { fmt } from '@/lib/format';
import { TASK_STATUS } from '@/lib/status';
import { nameOf, models, tasks as seed, shots as shotSeed } from '@/lib/mock';

export function Tasks() {
  const [fState, setFState] = useState('all');
  const [fModel, setFModel] = useState('all');
  const { data: tasks = [] } = useQuery({ queryKey: ['tasks'], queryFn: api.listTasks, initialData: seed, refetchInterval: 900 });
  const { data: shots = [] } = useQuery({ queryKey: ['shots'], queryFn: api.listShots, initialData: shotSeed, refetchInterval: 900 });
  const shotOf = (id: string) => shots.find((s) => s.id === id);

  const filtered = tasks.filter((t) => (fState === 'all' || t.state === fState) && (fModel === 'all' || t.model === fModel));
  const stats = [
    { k: '运行中', v: tasks.filter((t) => t.state === 'running').length, c: 'var(--st-running)' },
    { k: '排队', v: tasks.filter((t) => t.state === 'queued').length, c: 'var(--st-queued)' },
    { k: '已完成', v: tasks.filter((t) => t.state === 'succeeded').length, c: 'var(--st-done)' },
    { k: '失败', v: tasks.filter((t) => t.state === 'failed').length, c: 'var(--st-failed)' },
  ];
  const succ = tasks.filter((t) => t.state === 'succeeded').length;
  const fin = tasks.filter((t) => t.state === 'succeeded' || t.state === 'failed').length;

  return (
    <Screen crumb={<Crumb parts={[{ label: '任务中心' }]} />}>
      <div className="page">
        <div className="page-head">
          <div className="grow"><div className="page-title">任务中心</div><div className="page-sub">聚合全部生成任务 · 对应 Provider「查询任务列表」分页过滤 · 每分钟兜底轮询对账</div></div>
          <button className="btn btn-ghost btn-sm"><Icon name="download" size={14} />导出 CSV</button>
          <button className="btn btn-ghost btn-sm"><Icon name="refresh" size={14} />刷新</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 18 }}>
          {stats.map((s) => (
            <div className="stat" key={s.k}>
              <div className="k"><span className="dot" style={{ width: 8, height: 8, borderRadius: '50%', background: s.c }} />{s.k}</div>
              <div className="v mono">{s.v}</div>
            </div>
          ))}
          <div className="stat"><div className="k"><Icon name="check" size={14} />成功率</div><div className="v mono">{fin ? Math.round((succ / fin) * 100) : 100}%</div></div>
        </div>

        <div className="row gap8 wrap" style={{ marginBottom: 12 }}>
          <Menu align="start" trigger={<button className="btn btn-ghost btn-sm"><Icon name="filter" size={13} />状态：{fState === 'all' ? '全部' : fState}<Icon name="chevDown" size={12} /></button>}
            items={['all', 'running', 'queued', 'succeeded', 'failed'].map((s) => ({ icon: s === fState ? 'check' : 'cpu', label: s === 'all' ? '全部' : s, onClick: () => setFState(s) }))} />
          <Menu align="start" trigger={<button className="btn btn-ghost btn-sm"><Icon name="cpu" size={13} />模型：{fModel === 'all' ? '全部' : fModel}<Icon name="chevDown" size={12} /></button>}
            items={['all', ...models.map((m) => m.id)].map((s) => ({ icon: s === fModel ? 'check' : 'cpu', label: s === 'all' ? '全部' : s, onClick: () => setFModel(s) }))} />
          <span className="grow" />
          <span className="faint" style={{ fontSize: 12 }}>共 {filtered.length} 条</span>
        </div>

        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="tbl" style={{ fontSize: 12.5, minWidth: 880 }}>
              <thead><tr><th>任务 ID</th><th>镜头</th><th>能力</th><th>模型</th><th>状态 / 进度</th><th>消耗</th><th>提交人</th><th>提交时间</th><th /></tr></thead>
              <tbody>
                {filtered.map((t) => {
                  const sh = shotOf(t.shot);
                  return (
                    <tr className="trow" key={t.id}>
                      <td><div className="col"><span className="mono">{t.id}</span><span className="mono faint" style={{ fontSize: 10.5 }}>{t.ptid}</span></div></td>
                      <td><div className="row gap8">{sh && <Thumb w={40} h={24} tone={sh.tone} label="" />}<span className="mono faint">#{fmt.pad2(t.shotIdx)}</span></div></td>
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
                        {t.state === 'failed' ? <button className="btn btn-ghost btn-sm"><Icon name="retry" size={13} />重试</button>
                          : t.state === 'succeeded' ? <button className="icon-btn" style={{ width: 26, height: 26 }}><Icon name="download" size={15} /></button>
                            : <span className="faint mono" style={{ fontSize: 11 }}>{t.progress || 0}%</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <Empty icon="cpu" title="没有匹配的任务" sub="调整筛选条件，或从分镜表提交新的生成任务。" />}
        </div>
      </div>
    </Screen>
  );
}
