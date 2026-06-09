import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen, Crumb } from '@/app/Shell';
import { Icon } from '@/ui/icon';
import { Menu } from '@/ui/menu';
import { Modal } from '@/ui/dialog';
import { Switch } from '@/ui/controls';
import { Thumb, Avatar } from '@/ui/primitives';
import { Progress } from '@/ui/controls';
import { toast } from '@/ui/toast';
import { api } from '@/lib/api';
import { fmt } from '@/lib/format';
import { characters as charSeed, assets as assetSeed, members, audit, ROLE_LABEL, nameOf, wallet as walletSeed } from '@/lib/mock';
import { useSettings, settingsStore, STORAGE_LABEL, STORAGE_SHORT } from '@/lib/settings';
import type { Asset, Role } from '@/lib/types';

const TONES: [string, string][] = [['b', '青紫'], ['a', '暗棕'], ['c', '暖褐'], ['d', '青绿']];
const TAGS = ['男主', '女主', '配角', '反派', '群演'];
function chipStyle(on: boolean) {
  return { height: 28, cursor: 'pointer', background: on ? 'var(--accent-soft)' : undefined, borderColor: on ? 'var(--accent-line)' : undefined, color: on ? 'var(--accent-text)' : undefined } as const;
}

/* ---------------- Characters ---------------- */
function NewCharacterModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [tag, setTag] = useState('配角');
  const [tone, setTone] = useState('b');
  const [voice, setVoice] = useState('');
  const [desc, setDesc] = useState('');
  const [asset, setAsset] = useState(true);
  const reset = () => { setName(''); setTag('配角'); setTone('b'); setVoice(''); setDesc(''); setAsset(true); };
  const submit = async () => {
    if (!name.trim()) return;
    await api.addCharacter({ name: name.trim(), tag, tone, voice: voice.trim() || '未设定', desc: desc.trim(), asset });
    qc.invalidateQueries({ queryKey: ['characters'] });
    toast('已新建角色 · ' + name.trim(), 'users');
    reset();
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose}>
      <div style={{ width: 'min(520px, 94vw)' }}>
        <div className="row gap10" style={{ padding: '15px 18px', borderBottom: '1px solid var(--line)' }}>
          <span className="center" style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent-text)' }}><Icon name="users" size={17} /></span>
          <div className="grow"><b style={{ fontSize: 15 }}>新建角色</b><div className="faint" style={{ fontSize: 12 }}>角色卡 + 一致性资产，跨集跨镜头复用</div></div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div style={{ padding: 18, maxHeight: '64vh', overflow: 'auto' }} className="col gap16">
          <label><span className="lbl">角色名称 <span style={{ color: 'var(--st-failed)' }}>*</span></span>
            <input className="field" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="如：沈砚" onKeyDown={(e) => e.key === 'Enter' && submit()} /></label>
          <div><div className="lbl">角色定位</div><div className="row gap6 wrap">{TAGS.map((t) => <button key={t} onClick={() => setTag(t)} className="tag" style={chipStyle(tag === t)}>{t}</button>)}</div></div>
          <label><span className="lbl">配音音色</span>
            <input className="field" value={voice} onChange={(e) => setVoice(e.target.value)} placeholder="如：青年·清冷男声" /></label>
          <label><span className="lbl">角色设定 / 外观</span>
            <textarea className="field" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="服饰、神态、关键特征…用于参考图与一致性提示" /></label>
          <div><div className="lbl">封面调性</div><div className="row gap8">{TONES.map(([tk, tl]) => <button key={tk} onClick={() => setTone(tk)} style={{ flex: 1, cursor: 'pointer', borderRadius: 9, overflow: 'hidden', border: '2px solid ' + (tone === tk ? 'var(--accent)' : 'transparent'), padding: 0 }}><Thumb w="100%" h={42} tone={tk} rounded={0} label={tl} /></button>)}</div></div>
          <div className="row gap10" style={{ alignItems: 'center', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 10 }}>
            <div className="grow"><div style={{ fontSize: 13, fontWeight: 600 }}>建立一致性资产</div><div className="faint" style={{ fontSize: 11.5 }}>生成 asset:// 资产，生成镜头时自动注入为 reference_image</div></div>
            <Switch checked={asset} onChange={setAsset} />
          </div>
        </div>
        <div className="row gap8" style={{ padding: 16, borderTop: '1px solid var(--line)' }}>
          <button className="btn btn-ghost grow" onClick={onClose}>取消</button>
          <button className="btn btn-pri grow" disabled={!name.trim()} onClick={submit}><Icon name="plus" size={15} />新建角色</button>
        </div>
      </div>
    </Modal>
  );
}

export function Characters() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const { data: characters = [] } = useQuery({ queryKey: ['characters'], queryFn: api.listCharacters, initialData: charSeed });
  const del = async (id: string, name: string) => {
    if (!window.confirm(`确认删除角色「${name}」？该角色的一致性资产引用将被移除。`)) return;
    await api.deleteCharacter(id);
    qc.invalidateQueries({ queryKey: ['characters'] });
    toast('已删除角色 · ' + name, 'trash');
  };
  return (
    <Screen crumb={<Crumb parts={[{ label: '角色库' }]} />}>
      <div className="page">
        <div className="page-head"><div className="grow"><div className="page-title">角色库</div><div className="page-sub">角色卡 · 参考图集 · 一致性资产，跨集跨镜头复用</div></div><button className="btn btn-pri" onClick={() => setShowNew(true)}><Icon name="plus" size={16} />新建角色</button></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 16 }}>
          {characters.map((c) => (
            <div key={c.id} className="card" style={{ overflow: 'hidden' }}>
              <div style={{ position: 'relative' }}>
                <Thumb w="100%" h={140} tone={c.tone} rounded={0} label={`REF ×${c.refs}`} />
                <div style={{ position: 'absolute', top: 8, right: 8 }} className="row gap6">
                  {c.asset && <span className="pill" style={{ color: 'var(--st-done)', background: 'var(--st-done-bg)' }}><Icon name="link" size={11} />一致性</span>}
                  <span className="tag" style={{ height: 21 }}>{c.tag}</span>
                  <Menu align="end" trigger={<button className="icon-btn" style={{ width: 24, height: 24, background: 'var(--scrim-2, rgba(0,0,0,.4))' }}><Icon name="more" size={14} /></button>}
                    items={[{ icon: 'edit', label: '编辑角色' }, { sep: true }, { icon: 'trash', label: '删除角色', danger: true, onClick: () => del(c.id, c.name) }]} />
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
      <NewCharacterModal open={showNew} onClose={() => setShowNew(false)} />
    </Screen>
  );
}

/* ---------------- Assets ---------------- */
const KIND_LABEL: Record<Asset['kind'], string> = { image: 'IMG', video: 'VIDEO', audio: 'AUDIO' };
function fmtBytes(n: number) {
  if (n >= 1 << 20) return (n / (1 << 20)).toFixed(1) + ' MB';
  if (n >= 1 << 10) return Math.round(n / (1 << 10)) + ' KB';
  return n + ' B';
}
function kindOf(file: File): Asset['kind'] {
  if (file.type.startsWith('video')) return 'video';
  if (file.type.startsWith('audio')) return 'audio';
  return 'image';
}

function UploadAssetModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const s = useSettings();
  const backend = s.storage.backend;
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const tones: Asset['tone'][] = ['a', 'b', 'c', 'd'];
  const reset = () => setFiles([]);
  const pick = (fl: FileList | null) => { if (fl) setFiles((p) => [...p, ...Array.from(fl)]); };
  const remove = (i: number) => setFiles((p) => p.filter((_, x) => x !== i));
  const submit = async () => {
    if (!files.length) return;
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const dot = f.name.lastIndexOf('.');
      const ext = dot >= 0 ? f.name.slice(dot + 1).toLowerCase() : kindOf(f);
      await api.addAsset({ name: dot >= 0 ? f.name.slice(0, dot) : f.name, kind: kindOf(f), ext, size: fmtBytes(f.size), tone: tones[i % 4], store: STORAGE_SHORT[backend] });
    }
    qc.invalidateQueries({ queryKey: ['assets'] });
    toast(`已上传 ${files.length} 个素材 · ${STORAGE_LABEL[backend]}`, 'gallery');
    reset();
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose}>
      <div style={{ width: 'min(520px, 94vw)' }}>
        <div className="row gap10" style={{ padding: '15px 18px', borderBottom: '1px solid var(--line)' }}>
          <span className="center" style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent-text)' }}><Icon name="gallery" size={17} /></span>
          <div className="grow"><b style={{ fontSize: 15 }}>上传素材</b><div className="faint" style={{ fontSize: 12 }}>图 / 视频 / 音频 · 当前上传至 {STORAGE_LABEL[backend]}</div></div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div style={{ padding: 18, maxHeight: '64vh', overflow: 'auto' }} className="col gap14">
          <div className="row gap8" style={{ fontSize: 11.5, color: 'var(--text-2)', padding: '8px 11px', background: 'var(--surface-2)', borderRadius: 9 }}>
            <Icon name={backend === 'tos' ? 'cpu' : 'layers'} size={15} className="acc" />
            <span>存储后端：<b>{STORAGE_LABEL[backend]}</b>{backend === 'tos' ? `（${s.storage.tosBucket} · ${s.storage.tosRegion}）` : ''}。可在 设置 · 存储 中切换。</span>
          </div>
          <input ref={inputRef} type="file" multiple accept="image/*,video/*,audio/*" style={{ display: 'none' }} onChange={(e) => { pick(e.target.files); e.target.value = ''; }} />
          <div onClick={() => inputRef.current?.click()} className="center col gap8" style={{ cursor: 'pointer', border: '1.5px dashed var(--line-2)', borderRadius: 12, padding: '28px 16px', color: 'var(--text-3)' }}>
            <Icon name="import" size={28} className="acc" />
            <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 600 }}>点击选择文件，或拖入此处</div>
            <div className="faint" style={{ fontSize: 11.5 }}>支持 png / jpg / mp4 / mov / mp3 / wav，可多选</div>
          </div>
          {files.length > 0 && (
            <div className="col gap6">
              <div className="lbl">待上传 · {files.length}</div>
              {files.map((f, i) => (
                <div key={i} className="row gap10" style={{ padding: '7px 10px', background: 'var(--surface-2)', borderRadius: 8, fontSize: 12 }}>
                  <Icon name={kindOf(f) === 'video' ? 'film' : kindOf(f) === 'audio' ? 'mic' : 'image'} size={15} className="acc" />
                  <span className="grow ellipsis">{f.name}</span>
                  <span className="mono faint" style={{ fontSize: 11 }}>{fmtBytes(f.size)}</span>
                  <button className="icon-btn" style={{ width: 22, height: 22 }} onClick={() => remove(i)}><Icon name="x" size={13} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="row gap8" style={{ padding: 16, borderTop: '1px solid var(--line)' }}>
          <button className="btn btn-ghost grow" onClick={onClose}>取消</button>
          <button className="btn btn-pri grow" disabled={!files.length} onClick={submit}><Icon name="import" size={15} />上传 {files.length || ''} 个素材</button>
        </div>
      </div>
    </Modal>
  );
}

export function Assets() {
  const qc = useQueryClient();
  const s = useSettings();
  const [type, setType] = useState('all');
  const [showUpload, setShowUpload] = useState(false);
  const { data: assets = [] } = useQuery({ queryKey: ['assets'], queryFn: api.listAssets, initialData: assetSeed });
  const list = assets.filter((a) => type === 'all' || a.kind === type);
  const del = async (id: string, name: string) => {
    if (!window.confirm(`确认删除素材「${name}」？`)) return;
    await api.deleteAsset(id);
    qc.invalidateQueries({ queryKey: ['assets'] });
    toast('已删除素材 · ' + name, 'trash');
  };
  return (
    <Screen crumb={<Crumb parts={[{ label: '素材库' }]} />}>
      <div className="page">
        <div className="page-head">
          <div className="grow"><div className="page-title">素材库</div><div className="page-sub">图 / 视频 / 音频统一管理 · 存储后端可切换：Cloudflare R2 ↔ 火山 TOS</div></div>
          <Menu align="end" trigger={<button className="btn btn-ghost"><Icon name={s.storage.backend === 'tos' ? 'cpu' : 'layers'} size={15} />{STORAGE_LABEL[s.storage.backend]}<Icon name="chevDown" size={13} /></button>}
            items={[
              { icon: s.storage.backend === 'r2' ? 'check' : 'layers', label: 'Cloudflare R2', onClick: () => { settingsStore.setStorage({ backend: 'r2' }); toast('存储后端已切换 · Cloudflare R2', 'layers'); } },
              { icon: s.storage.backend === 'tos' ? 'check' : 'cpu', label: '火山 TOS', onClick: () => { settingsStore.setStorage({ backend: 'tos' }); toast('存储后端已切换 · 火山 TOS', 'cpu'); } },
            ]} />
          <div className="seg">{[['all', '全部'], ['image', '图片'], ['video', '视频'], ['audio', '音频']].map(([k, l]) => <button key={k} className={type === k ? 'on' : ''} onClick={() => setType(k)}>{l}</button>)}</div>
          <button className="btn btn-pri" onClick={() => setShowUpload(true)}><Icon name="plus" size={16} />上传</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 12 }}>
          {list.map((a) => (
            <div key={a.id} className="card" style={{ overflow: 'hidden' }}>
              <div style={{ position: 'relative' }}>
                <Thumb w="100%" h={108} tone={a.tone} rounded={0} label={KIND_LABEL[a.kind] + ' ' + a.name.replace(/^[A-Z]+_/, '')} playable={a.kind === 'video'} />
                {a.kind === 'audio' && <div className="center" style={{ position: 'absolute', inset: 0 }}><Icon name="mic" size={24} className="faint" /></div>}
                <div style={{ position: 'absolute', top: 6, right: 6 }}>
                  <Menu align="end" trigger={<button className="icon-btn" style={{ width: 24, height: 24, background: 'rgba(0,0,0,.4)' }}><Icon name="more" size={14} /></button>}
                    items={[{ icon: 'download', label: '下载' }, { icon: 'copy', label: '复制链接' }, { sep: true }, { icon: 'trash', label: '删除素材', danger: true, onClick: () => del(a.id, a.name) }]} />
                </div>
              </div>
              <div className="row" style={{ padding: '8px 10px', justifyContent: 'space-between', fontSize: 11.5 }}>
                <span className="mono faint">·{a.ext}</span><span className="faint">{a.size} · {a.store}</span>
              </div>
            </div>
          ))}
          {list.length === 0 && <div className="faint" style={{ fontSize: 13, padding: 20 }}>暂无{type === 'all' ? '' : { image: '图片', video: '视频', audio: '音频' }[type]}素材</div>}
        </div>
      </div>
      <UploadAssetModal open={showUpload} onClose={() => setShowUpload(false)} />
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
