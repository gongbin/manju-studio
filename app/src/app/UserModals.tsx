import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/ui/dialog';
import { Icon } from '@/ui/icon';
import { Switch } from '@/ui/controls';
import { Avatar } from '@/ui/primitives';
import { toast } from '@/ui/toast';
import { api } from '@/lib/api';
import { useAccount, accountStore } from '@/lib/account';
import { PERMS, PERM_LABEL, permsForRole, ROLE_DESC, effectiveRole } from '@/lib/rbac';
import { ROLE_LABEL, projects as projectSeed } from '@/lib/mock';

/* ---------------- 账户设置 ---------------- */
export function AccountSettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const acct = useAccount();
  const [name, setName] = useState(acct.name);
  const [email, setEmail] = useState(acct.email);
  const [title, setTitle] = useState(acct.title);
  const [emailNotify, setEmailNotify] = useState(acct.emailNotify);
  const [pwOpen, setPwOpen] = useState(false);
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');

  const dirty = name !== acct.name || email !== acct.email || title !== acct.title || emailNotify !== acct.emailNotify;
  const save = async () => {
    if (!name.trim() || !email.trim()) return;
    accountStore.set({ name: name.trim(), email: email.trim(), title: title.trim(), emailNotify });
    await api.updateMe({ name: name.trim(), email: email.trim(), title: title.trim() });
    qc.invalidateQueries({ queryKey: ['members'] });
    toast('账户资料已保存', 'check');
    onClose();
  };
  const savePw = () => {
    if (pw1.length < 6) { toast('新密码至少 6 位', 'warn'); return; }
    if (pw1 !== pw2) { toast('两次输入的密码不一致', 'warn'); return; }
    setPw1(''); setPw2(''); setPwOpen(false);
    toast('登录密码已更新', 'lock');
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div style={{ width: 'min(480px, 94vw)' }}>
        <div className="row gap10" style={{ padding: '15px 18px', borderBottom: '1px solid var(--line)' }}>
          <span className="center" style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent-text)' }}><Icon name="settings" size={17} /></span>
          <div className="grow"><b style={{ fontSize: 15 }}>账户设置</b><div className="faint" style={{ fontSize: 12 }}>个人资料 · 通知偏好 · 登录密码</div></div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div style={{ padding: 18, maxHeight: '66vh', overflow: 'auto' }} className="col gap16">
          <div className="row gap12" style={{ alignItems: 'center' }}>
            <Avatar name={name || acct.name} size={48} />
            <div className="grow"><div style={{ fontSize: 14, fontWeight: 600 }}>{name || '—'}</div><div className="row gap6" style={{ marginTop: 3 }}><span className="tag" style={{ height: 19, fontSize: 10.5 }}><Icon name="shield" size={11} className="acc" />{ROLE_LABEL[acct.role]}</span><span className="mono faint" style={{ fontSize: 11 }}>{acct.id}</span></div></div>
          </div>
          <label><span className="lbl">显示名称 <span style={{ color: 'var(--st-failed)' }}>*</span></span><input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="你的名字" /></label>
          <label><span className="lbl">邮箱 <span style={{ color: 'var(--st-failed)' }}>*</span></span><input className="field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@team.studio" /></label>
          <label><span className="lbl">头衔 / 职责</span><input className="field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如：分镜导演" /></label>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="row gap8" style={{ fontSize: 13 }}><Icon name="mail" size={15} className="faint" />邮件通知（任务完成 / 审核）</span>
            <Switch checked={emailNotify} onChange={setEmailNotify} />
          </div>
          <div className="hr" />
          {!pwOpen ? (
            <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setPwOpen(true)}><Icon name="lock" size={14} />修改登录密码</button>
          ) : (
            <div className="col gap10" style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 10 }}>
              <div className="row gap8" style={{ fontSize: 13, fontWeight: 600 }}><Icon name="lock" size={14} className="acc" />修改登录密码</div>
              <label><span className="lbl">新密码</span><input className="field" type="password" value={pw1} onChange={(e) => setPw1(e.target.value)} placeholder="至少 6 位" /></label>
              <label><span className="lbl">确认新密码</span><input className="field" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></label>
              <div className="row gap8"><button className="btn btn-ghost btn-sm grow" onClick={() => { setPwOpen(false); setPw1(''); setPw2(''); }}>取消</button><button className="btn btn-pri btn-sm grow" onClick={savePw}>更新密码</button></div>
            </div>
          )}
          <div className="row gap8" style={{ fontSize: 11.5, color: 'var(--text-2)', padding: '9px 11px', background: 'var(--surface-2)', borderRadius: 9 }}><Icon name="shield" size={15} className="acc" /><span>工作空间角色由管理员在「成员与权限」分配，无法在此自行修改。</span></div>
        </div>
        <div className="row gap8" style={{ padding: 16, borderTop: '1px solid var(--line)' }}>
          <button className="btn btn-ghost grow" onClick={onClose}>取消</button>
          <button className="btn btn-pri grow" disabled={!dirty || !name.trim() || !email.trim()} onClick={save}><Icon name="check" size={15} />保存资料</button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- 我的权限 ---------------- */
export function MyPermissionsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const acct = useAccount();
  const { data: members = [] } = useQuery({ queryKey: ['members'], queryFn: api.listMembers });
  const meMember = members.find((m) => m.id === acct.id);
  const myPerms = new Set(permsForRole(acct.role));
  const overrides = Object.entries(meMember?.projectRoles ?? {});

  return (
    <Modal open={open} onClose={onClose}>
      <div style={{ width: 'min(500px, 94vw)' }}>
        <div className="row gap10" style={{ padding: '15px 18px', borderBottom: '1px solid var(--line)' }}>
          <span className="center" style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent-text)' }}><Icon name="shield" size={17} /></span>
          <div className="grow"><b style={{ fontSize: 15 }}>我的权限</b><div className="faint" style={{ fontSize: 12 }}>当前账户在工作空间内的角色与权限点</div></div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div style={{ padding: 18, maxHeight: '66vh', overflow: 'auto' }} className="col gap16">
          <div className="row gap12" style={{ alignItems: 'center', padding: 12, background: 'var(--surface-2)', borderRadius: 10 }}>
            <Avatar name={acct.name} size={40} />
            <div className="grow"><div className="row gap8"><b style={{ fontSize: 14 }}>{acct.name}</b><span className="tag" style={{ height: 20, color: 'var(--accent-text)' }}>{ROLE_LABEL[acct.role]}</span></div><div className="faint" style={{ fontSize: 11.5, marginTop: 2 }}>{ROLE_DESC[acct.role]}</div></div>
          </div>

          <div>
            <div className="lbl">权限点 · 工作空间角色 {ROLE_LABEL[acct.role]}</div>
            <div className="col gap2">
              {PERMS.map((p) => {
                const on = myPerms.has(p);
                return (
                  <div key={p} className="row gap8" style={{ padding: '7px 10px', borderRadius: 8, background: on ? 'var(--st-done-bg)' : 'transparent', opacity: on ? 1 : 0.55 }}>
                    <Icon name={on ? 'check' : 'x'} size={15} className={on ? 'acc' : 'faint'} />
                    <span className="grow" style={{ fontSize: 12.5 }}>{PERM_LABEL[p]}</span>
                    <span className="mono faint" style={{ fontSize: 10.5 }}>{p}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="lbl">项目级角色覆盖</div>
            {overrides.length === 0 ? (
              <div className="faint" style={{ fontSize: 12 }}>无 · 在所有项目中均使用工作空间角色「{ROLE_LABEL[acct.role]}」</div>
            ) : (
              <div className="col gap6">
                {overrides.map(([pid, role]) => {
                  const proj = projectSeed.find((p) => p.id === pid);
                  const eff = effectiveRole(acct.role, meMember?.projectRoles, pid);
                  return (
                    <div key={pid} className="row gap8" style={{ padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 8, fontSize: 12.5 }}>
                      <Icon name="layers" size={14} className="faint" />
                      <b className="grow">{proj?.name ?? pid}</b>
                      <span className="tag" style={{ height: 19, fontSize: 10.5, color: 'var(--accent-text)' }}>{ROLE_LABEL[eff]}</span>
                      <span className="faint" style={{ fontSize: 10.5 }}>{permsForRole(role).length} 项权限</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="row gap8" style={{ fontSize: 11.5, color: 'var(--text-2)', padding: '9px 11px', background: 'var(--surface-2)', borderRadius: 9 }}><Icon name="info" size={15} className="acc" /><span>权限由后端在每次写操作时强制校验。项目级覆盖优先于工作空间角色。</span></div>
        </div>
        <div className="row gap8" style={{ padding: 16, borderTop: '1px solid var(--line)' }}>
          <button className="btn btn-pri grow" onClick={onClose}><Icon name="check" size={15} />知道了</button>
        </div>
      </div>
    </Modal>
  );
}
