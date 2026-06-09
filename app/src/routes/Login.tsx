import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Icon } from '@/ui/icon';
import { Thumb } from '@/ui/primitives';
import { api } from '@/lib/api';
import { nameOf, ROLE_LABEL } from '@/lib/mock';
import type { Invite } from '@/lib/types';

const TONES = ['b', 'a', 'd', 'c', 'b', 'a'];
const tokenFrom = (s: string) => { const t = s.trim(); const m = t.match(/[?&]invite=([^&\s]+)/); return m ? m[1] : t; };

export function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register' | 'invite'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [authErr, setAuthErr] = useState<string | null>(null);

  const [invite, setInvite] = useState<Invite | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [inviteInput, setInviteInput] = useState('');
  const [inviteErr, setInviteErr] = useState<string | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(false);

  const loadInvite = async (tk: string) => {
    if (!tk) return;
    setLoadingInvite(true); setInviteErr(null);
    try {
      const inv = await api.getInvite(tk);
      if (!inv) { setInviteErr('邀请无效或不存在'); setInvite(null); setToken(null); return; }
      if (inv.accepted) { setInviteErr('该邀请已被接受，请直接登录'); setInvite(null); return; }
      if (new Date(inv.expiresAt).getTime() < Date.now()) { setInviteErr('邀请链接已过期'); setInvite(null); return; }
      setInvite(inv); setToken(tk); setEmail(inv.email);
    } catch { setInviteErr('加载邀请失败，请稍后重试'); }
    finally { setLoadingInvite(false); }
  };

  useEffect(() => {
    const tk = new URLSearchParams(window.location.search).get('invite');
    if (tk) { setMode('invite'); void loadInvite(tk); }
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthErr(null);
    if (mode === 'login' && (!email.trim() || !pw)) { setAuthErr('请输入邮箱和密码'); return; }
    if (mode === 'register' && (!email.trim() || pw.length < 6)) { setAuthErr('请输入邮箱，密码至少 6 位'); return; }
    if (mode === 'invite' && pw.length < 6) { setAuthErr('请设置至少 6 位的登录密码'); return; }
    setBusy(true);
    try {
      let res: { authorized?: boolean } | undefined;
      if (mode === 'login') res = await api.login(email.trim(), pw);
      else if (mode === 'register') res = await api.register({ email: email.trim(), password: pw, name: name.trim() || undefined });
      else if (mode === 'invite' && token) res = await api.acceptInvite(token, { name: name.trim() || undefined, password: pw });
      if (res && res.authorized === false) {
        setAuthErr(mode === 'register'
          ? '注册成功，但你的账号还需管理员邀请或授权后才能使用，请联系管理员。'
          : '账号尚未获得授权，请联系管理员邀请或授权后再登录。');
        setBusy(false);
        return;
      }
      localStorage.setItem('ms.auth', '1');
      navigate({ to: '/' });
    } catch (e2) {
      setAuthErr(e2 instanceof Error ? e2.message : '操作失败，请重试');
      setBusy(false);
    }
  };

  const daysLeft = invite ? Math.max(0, Math.ceil((new Date(invite.expiresAt).getTime() - Date.now()) / 864e5)) : 0;
  const showForm = mode !== 'invite' || !!invite;

  return (
    <div className="login-split">
      <div className="login-aside">
        <div style={{ position: 'absolute', inset: 0, opacity: 0.5, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gridAutoRows: '1fr', gap: 12, padding: 40, transform: 'rotate(-8deg) scale(1.25)', transformOrigin: 'center' }}>
          {TONES.concat(TONES).map((t, i) => <Thumb key={i} w="100%" h="100%" tone={t} label={'SHOT ' + String(i + 1).padStart(2, '0')} />)}
        </div>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent, color-mix(in oklab, var(--bg) 78%, transparent))' }} />
        <div style={{ position: 'absolute', left: 44, top: 40, right: 44 }}>
          <div className="row gap10">
            <div className="brand-mark" style={{ width: 38, height: 38 }}>漫</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>漫剧工坊</div>
              <div className="faint mono" style={{ fontSize: 11 }}>ManjuStudio · open source</div>
            </div>
          </div>
        </div>
        <div style={{ position: 'absolute', left: 44, bottom: 44, right: 44 }}>
          <h1 style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.25, letterSpacing: '-.02em' }}>从剧本到成片，<br />一支团队的<span className="acc">漫剧</span>生产线。</h1>
          <p className="muted" style={{ marginTop: 14, fontSize: 14, maxWidth: 440 }}>剧本 · 分镜 · 角色一致性 · AI 镜头生成 · 配音合成 —— 协作、计费、审计，一键部署到边缘。</p>
          <div className="row gap16 wrap" style={{ marginTop: 22 }}>
            {['可插拔视频 / LLM / TTS', '积分制计费 · 操作审计', 'RBAC 多人协作'].map((f) => (
              <span key={f} className="row gap6 muted" style={{ fontSize: 12.5 }}><Icon name="check" size={14} className="acc" />{f}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="login-main">
        <div className="rise" style={{ width: 'min(380px, 100%)' }}>
          <div className="login-brand-m">
            <div className="brand-mark" style={{ width: 34, height: 34 }}>漫</div>
            <div><div style={{ fontWeight: 700, fontSize: 15 }}>漫剧工坊</div><div className="faint mono" style={{ fontSize: 10.5 }}>ManjuStudio</div></div>
          </div>

          {mode === 'invite' ? (
            invite ? (
              <div className="card" style={{ padding: 16, marginBottom: 20, background: 'var(--accent-soft)', borderColor: 'var(--accent-line)' }}>
                <div className="row gap10">
                  <span className="av" style={{ width: 34, height: 34, background: 'linear-gradient(140deg,#7c5cf0,#3b7ff0)' }}>{invite.teamName.slice(0, 1)}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{nameOf(invite.inviterId)} 邀请你加入 <b>{invite.teamName}</b></div>
                    <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>预设角色 · <span className="acc">{ROLE_LABEL[invite.role]}</span> · {daysLeft > 0 ? `链接 ${daysLeft} 天后过期` : '今日过期'}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 20 }} className="col gap14">
                <div><h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.01em' }}>接受邀请</h2><p className="muted" style={{ marginTop: 5, fontSize: 13.5 }}>粘贴你收到的邀请链接或邀请码以加入工作空间</p></div>
                <div className="row gap8">
                  <div className="search" style={{ height: 38, flex: 1 }}><Icon name="link" size={16} className="faint" /><input value={inviteInput} onChange={(e) => setInviteInput(e.target.value)} placeholder="粘贴邀请链接 / 邀请码" onKeyDown={(e) => e.key === 'Enter' && loadInvite(tokenFrom(inviteInput))} /></div>
                  <button className="btn btn-soft" style={{ flexShrink: 0 }} disabled={!inviteInput.trim() || loadingInvite} onClick={() => loadInvite(tokenFrom(inviteInput))}>{loadingInvite ? <Icon name="refresh" size={15} className="spin" /> : '加载'}</button>
                </div>
                {inviteErr && <div className="row gap6" style={{ fontSize: 12.5, color: 'var(--st-failed)' }}><Icon name="warn" size={14} />{inviteErr}</div>}
              </div>
            )
          ) : (
            <div style={{ marginBottom: 22 }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.01em' }}>{mode === 'login' ? '欢迎回来' : '创建账户'}</h2>
              <p className="muted" style={{ marginTop: 5, fontSize: 13.5 }}>{mode === 'login' ? '登录以继续你的漫剧创作' : '注册后即可创建或加入工作空间'}</p>
            </div>
          )}

          {showForm && (
            <form onSubmit={submit} className="col gap16">
              {(mode === 'register' || (mode === 'invite' && invite)) && (
                <label><span className="lbl">昵称</span><input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="你的名字" /></label>
              )}
              <label><span className="lbl">邮箱</span>
                <div className="search" style={{ height: 38 }}><Icon name="mail" size={16} className="faint" /><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@studio.com" type="email" readOnly={mode === 'invite'} /></div>
              </label>
              <label><span className="lbl">{mode === 'login' ? '密码' : '设置登录密码'}</span>
                <div className="search" style={{ height: 38 }}><Icon name="lock" size={16} className="faint" /><input value={pw} onChange={(e) => setPw(e.target.value)} type="password" placeholder={mode === 'login' ? '输入密码' : '至少 6 位'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></div>
                {mode !== 'login' && <span className="faint" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>密码至少 6 位，用于后续登录</span>}
              </label>
              {authErr && <div className="row gap6" style={{ fontSize: 12.5, color: 'var(--st-failed)' }}><Icon name="warn" size={14} />{authErr}</div>}
              <button className="btn btn-pri" type="submit" style={{ height: 40, marginTop: 2 }} disabled={busy}>
                {busy ? <Icon name="refresh" size={16} className="spin" /> : <Icon name={mode === 'invite' ? 'check' : 'arrowRight'} size={16} />}
                {busy ? '正在进入…' : mode === 'login' ? '登录' : mode === 'invite' ? '接受邀请并加入' : '注册账户'}
              </button>
            </form>
          )}

          <div className="muted" style={{ textAlign: 'center', marginTop: 22, fontSize: 13 }}>
            {mode === 'login' ? (
              <>还没有账户？<a className="acc" style={{ fontWeight: 600 }} onClick={() => setMode('register')}> 立即注册</a><span className="faint"> · </span><a className="acc" style={{ fontWeight: 600 }} onClick={() => setMode('invite')}>有邀请链接</a></>
            ) : mode === 'register' ? (
              <>已有账户？<a className="acc" style={{ fontWeight: 600 }} onClick={() => setMode('login')}> 去登录</a></>
            ) : (
              <>不是受邀用户？<a className="acc" style={{ fontWeight: 600 }} onClick={() => { setMode('login'); setInvite(null); setInviteErr(null); }}> 去登录</a></>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
