import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Screen, Crumb } from '@/app/Shell';
import { Icon } from '@/ui/icon';
import { Menu } from '@/ui/menu';
import { Thumb, Avatar } from '@/ui/primitives';
import { Progress } from '@/ui/controls';
import { api } from '@/lib/api';
import { fmt } from '@/lib/format';
import { characters, members, audit, ROLE_LABEL, nameOf, wallet as walletSeed } from '@/lib/mock';
import type { Role } from '@/lib/types';

/* ---------------- Characters ---------------- */
export function Characters() {
  return (
    <Screen crumb={<Crumb parts={[{ label: '角色库' }]} />}>
      <div className="page">
        <div className="page-head"><div className="grow"><div className="page-title">角色库</div><div className="page-sub">角色卡 · 参考图集 · 一致性资产，跨集跨镜头复用</div></div><button className="btn btn-pri"><Icon name="plus" size={16} />新建角色</button></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 16 }}>
          {characters.map((c) => (
            <div key={c.id} className="card" style={{ overflow: 'hidden' }}>
              <div style={{ position: 'relative' }}>
                <Thumb w="100%" h={140} tone={c.tone} rounded={0} label={`REF ×${c.refs}`} />
                <div style={{ position: 'absolute', top: 8, right: 8 }} className="row gap6">
                  {c.asset && <span className="pill" style={{ color: 'var(--st-done)', background: 'var(--st-done-bg)' }}><Icon name="link" size={11} />一致性</span>}
                  <span className="tag" style={{ height: 21 }}>{c.tag}</span>
                </div>
              </div>
              <div style={{ padding: 13 }}>
                <div className="row gap8"><Avatar name={c.name} size={26} /><b style={{ fontSize: 15 }}>{c.name}</b></div>
                <div className="muted clamp2" style={{ fontSize: 12.5, marginTop: 8, minHeight: 34 }}>{c.desc}</div>
                <div className="row gap6" style={{ marginTop: 10, fontSize: 11.5 }}><Icon name="mic" size={13} className="faint" /><span className="muted">{c.voice}</span></div>
                {c.asset && <div className="mono faint" style={{ fontSize: 10.5, marginTop: 8, padding: '5px 8px', background: 'var(--surface-2)', borderRadius: 6 }}>{c.asset}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Screen>
  );
}

/* ---------------- Assets ---------------- */
export function Assets() {
  const [type, setType] = useState('all');
  const kinds: [string, string, string][] = [
    ['IMG', 'a', 'image'], ['VIDEO', 'b', 'video'], ['AUDIO', 'c', 'audio'], ['VIDEO', 'd', 'video'],
    ['IMG', 'b', 'image'], ['VIDEO', 'a', 'video'], ['IMG', 'c', 'image'], ['VIDEO', 'd', 'video'],
    ['AUDIO', 'a', 'audio'], ['VIDEO', 'b', 'video'], ['IMG', 'd', 'image'], ['VIDEO', 'c', 'video'],
  ];
  const list = kinds.filter((k) => type === 'all' || k[2] === type);
  return (
    <Screen crumb={<Crumb parts={[{ label: '素材库' }]} />}>
      <div className="page">
        <div className="page-head">
          <div className="grow"><div className="page-title">素材库</div><div className="page-sub">图 / 视频 / 音频统一管理 · 默认 Cloudflare R2 · 可选火山 TOS</div></div>
          <div className="seg">{[['all', '全部'], ['image', '图片'], ['video', '视频'], ['audio', '音频']].map(([k, l]) => <button key={k} className={type === k ? 'on' : ''} onClick={() => setType(k)}>{l}</button>)}</div>
          <button className="btn btn-pri"><Icon name="plus" size={16} />上传</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 12 }}>
          {list.map((k, i) => (
            <div key={i} className="card" style={{ overflow: 'hidden' }}>
              <div style={{ position: 'relative' }}>
                <Thumb w="100%" h={108} tone={k[1]} rounded={0} label={k[0] + ' ' + String(i + 1).padStart(3, '0')} playable={k[2] === 'video'} />
                {k[2] === 'audio' && <div className="center" style={{ position: 'absolute', inset: 0 }}><Icon name="mic" size={24} className="faint" /></div>}
              </div>
              <div className="row" style={{ padding: '8px 10px', justifyContent: 'space-between', fontSize: 11.5 }}>
                <span className="mono faint">{k[2] === 'audio' ? '·mp3' : k[2] === 'video' ? '·mp4' : '·png'}</span><span className="faint">R2</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Screen>
  );
}

/* ---------------- Billing ---------------- */
export function Billing() {
  const { data: wallet = walletSeed } = useQuery({ queryKey: ['wallet'], queryFn: api.getWallet, initialData: walletSeed });
  const usage = [
    { m: 'u_qi', tasks: 64, credits: 9820 }, { m: 'u_chen', tasks: 41, credits: 6240 },
    { m: 'u_su', tasks: 22, credits: 3180 }, { m: 'u_zhou', tasks: 12, credits: 1500 }, { m: 'u_lin', tasks: 8, credits: 1000 },
  ];
  const txns = [
    { t: 'hold', a: -240, ref: 'tk_8821 · Shot#05', by: 'u_qi', time: 2 },
    { t: 'hold', a: -120, ref: 'tk_8820 · Shot#06', by: 'u_qi', time: 3 },
    { t: 'refund', a: +120, ref: 'tk_8814 失败退回', by: 'system', time: 26 },
    { t: 'settle', a: -160, ref: 'tk_8809 · Shot#04', by: 'u_qi', time: 52 },
    { t: 'topup', a: +50000, ref: 'Owner 充值', by: 'u_lin', time: 1440 },
  ];
  const TT: Record<string, { l: string; c: string }> = { hold: { l: '预扣', c: 'var(--st-running)' }, settle: { l: '结算', c: 'var(--st-queued)' }, refund: { l: '退回', c: 'var(--st-done)' }, topup: { l: '充值', c: 'var(--accent-text)' } };
  return (
    <Screen crumb={<Crumb parts={[{ label: '计费与用量' }]} />}>
      <div className="page">
        <div className="page-head"><div className="grow"><div className="page-title">计费与用量</div><div className="page-sub">积分制钱包 · 预扣→结算→退款 · 配额与用量报表</div></div><button className="btn btn-ghost"><Icon name="download" size={15} />导出 CSV</button><button className="btn btn-pri"><Icon name="coins" size={15} />充值积分</button></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 14, marginBottom: 22 }}>
          <div className="card" style={{ padding: 18, background: 'linear-gradient(135deg, var(--accent-soft), transparent)' }}>
            <div className="k muted row gap6"><Icon name="wallet" size={15} />团队钱包余额</div>
            <div className="row" style={{ alignItems: 'baseline', gap: 8, marginTop: 8 }}><span className="mono" style={{ fontSize: 34, fontWeight: 700 }}>{fmt.credits(wallet.balance)}</span><span className="faint">积分</span></div>
            <div className="row gap16" style={{ marginTop: 14, fontSize: 12 }}><span className="muted">本月已用 <b className="mono" style={{ color: 'var(--text)' }}>{fmt.credits(wallet.monthSpent)}</b></span><span className="muted">预算 <b className="mono" style={{ color: 'var(--text)' }}>{fmt.credits(wallet.monthBudget)}</b></span></div>
            <div style={{ marginTop: 8 }}><Progress value={(wallet.monthSpent / wallet.monthBudget) * 100} amber /></div>
          </div>
          <div className="stat"><div className="k"><Icon name="cpu" size={14} />本月任务</div><div className="v mono">147</div><div className="d muted">平均 168 积分/镜头</div></div>
          <div className="stat"><div className="k"><Icon name="film" size={14} />本月镜头</div><div className="v mono">186</div><div className="d acc">成功率 94%</div></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--line)', fontWeight: 600, fontSize: 13 }}>成员用量排行</div>
            <table className="tbl" style={{ fontSize: 12.5 }}><tbody>{usage.map((u) => (
              <tr className="trow" key={u.m}><td style={{ width: 150 }}><div className="row gap8"><Avatar name={nameOf(u.m)} size={22} />{nameOf(u.m)}</div></td><td className="mono faint">{u.tasks} 任务</td><td><div className="row gap8"><div className="grow"><Progress value={(u.credits / 9820) * 100} /></div><span className="mono" style={{ fontSize: 11.5, width: 48, textAlign: 'right' }}>{fmt.credits(u.credits)}</span></div></td></tr>
            ))}</tbody></table>
          </div>
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--line)', fontWeight: 600, fontSize: 13 }}>积分流水</div>
            <table className="tbl" style={{ fontSize: 12.5 }}><tbody>{txns.map((x, i) => (
              <tr className="trow" key={i}><td><span className="pill" style={{ color: TT[x.t].c, background: 'var(--surface-3)' }}>{TT[x.t].l}</span></td><td className="grow"><span className="ellipsis">{x.ref}</span><div className="faint" style={{ fontSize: 10.5 }}>{nameOf(x.by) === '—' ? x.by : nameOf(x.by)} · {fmt.ago(Date.now() - x.time * 60000)}</div></td><td className="mono" style={{ textAlign: 'right', fontWeight: 600, color: x.a > 0 ? 'var(--st-done)' : 'var(--text)' }}>{x.a > 0 ? '+' : ''}{fmt.credits(x.a)}</td></tr>
            ))}</tbody></table>
          </div>
        </div>
      </div>
    </Screen>
  );
}

/* ---------------- Members ---------------- */
const PERMS = ['project.write', 'shot.generate', 'shot.review', 'shot.publish', 'member.manage', 'credential.write', 'billing.manage', 'audit.read'];
const ROLE_PERMS: Record<Role, string[]> = {
  owner: PERMS, admin: PERMS,
  director: ['project.write', 'shot.generate', 'shot.review', 'shot.publish'],
  creator: ['project.write', 'shot.generate'], reviewer: ['shot.review', 'audit.read'], viewer: [],
};
export function Members() {
  const [tab, setTab] = useState('members');
  return (
    <Screen crumb={<Crumb parts={[{ label: '成员与权限' }]} />}>
      <div className="page">
        <div className="page-head"><div className="grow"><div className="page-title">成员与权限</div><div className="page-sub">工作空间级角色 + 项目级覆盖 · 后端强制鉴权 RBAC</div></div>
          <div className="seg">{[['members', '成员'], ['roles', '角色权限']].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
          <button className="btn btn-pri"><Icon name="mail" size={15} />邀请成员</button></div>
        {tab === 'members' ? (
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="tbl"><thead><tr><th>成员</th><th>邮箱</th><th>工作空间角色</th><th>状态</th><th /></tr></thead>
              <tbody>{members.map((m) => (
                <tr className="trow" key={m.id}>
                  <td><div className="row gap10"><Avatar name={m.name} size={28} /><div><b>{m.name}</b><div className="faint" style={{ fontSize: 11.5 }}>{m.title}</div></div></div></td>
                  <td className="mono faint" style={{ fontSize: 12 }}>{m.email}</td>
                  <td><Menu align="start" trigger={<button className="tag" style={{ height: 26, cursor: 'pointer' }}>{ROLE_LABEL[m.role]}<Icon name="chevDown" size={12} /></button>} items={(Object.entries(ROLE_LABEL) as [Role, string][]).map(([k, v]) => ({ icon: k === m.role ? 'check' : 'shield', label: v }))} /></td>
                  <td>{m.online ? <span className="pill" style={{ color: 'var(--st-done)', background: 'var(--st-done-bg)' }}><span className="dot" />在线</span> : <span className="faint" style={{ fontSize: 12 }}>离线</span>}</td>
                  <td><Menu align="end" trigger={<button className="icon-btn"><Icon name="more" size={16} /></button>} items={[{ icon: 'shield', label: '项目级角色覆盖' }, { icon: 'history', label: '操作记录' }, { sep: true }, { icon: 'trash', label: '移出空间', danger: true }]} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : (
          <div className="card" style={{ overflow: 'auto' }}>
            <table className="tbl" style={{ fontSize: 12 }}>
              <thead><tr><th>权限点</th>{(Object.keys(ROLE_PERMS) as Role[]).map((r) => <th key={r} style={{ textAlign: 'center' }}>{ROLE_LABEL[r]}</th>)}</tr></thead>
              <tbody>{PERMS.map((perm) => (
                <tr className="trow" key={perm}><td className="mono">{perm}</td>{(Object.keys(ROLE_PERMS) as Role[]).map((r) => <td key={r} style={{ textAlign: 'center' }}>{ROLE_PERMS[r].includes(perm) ? <Icon name="check" size={15} className="acc" /> : <span className="faint">·</span>}</td>)}</tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </Screen>
  );
}

/* ---------------- Audit ---------------- */
export function Audit() {
  const ACT: Record<string, string> = { 'shot.generate': 'cpu', 'shot.write': 'edit', 'member.invite': 'mail', 'credential.write': 'lock', 'billing.topup': 'coins' };
  return (
    <Screen crumb={<Crumb parts={[{ label: '审计日志' }]} />}>
      <div className="page">
        <div className="page-head"><div className="grow"><div className="page-title">审计日志</div><div className="page-sub">所有写操作只追加、不可篡改 · actor / action / target / diff / IP·UA</div></div><button className="btn btn-ghost btn-sm"><Icon name="filter" size={14} />筛选</button><button className="btn btn-ghost"><Icon name="download" size={15} />导出 CSV</button></div>
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="tbl" style={{ fontSize: 12.5 }}>
            <thead><tr><th>操作人</th><th>动作</th><th>目标对象</th><th>差异摘要</th><th>来源</th><th>时间</th></tr></thead>
            <tbody>{audit.map((a) => (
              <tr className="trow" key={a.id}>
                <td><div className="row gap8"><Avatar name={nameOf(a.actor)} size={22} />{nameOf(a.actor)}</div></td>
                <td><span className="tag mono" style={{ fontSize: 11 }}><Icon name={ACT[a.action] || 'edit'} size={12} />{a.action}</span></td>
                <td className="muted">{a.target}</td><td className="faint">{a.diff}</td>
                <td><span className="mono faint" style={{ fontSize: 11 }}>{a.src}</span></td><td className="faint">{fmt.ago(a.time)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </Screen>
  );
}
