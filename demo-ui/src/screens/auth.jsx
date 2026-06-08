/* auth.jsx — Login / Register / Invite. window.AuthScreen */
(function () {
  const { useState } = React;
  const { useApp, Thumb } = window;
  const Icon = window.Icon;
  const { DATA } = window;

  function AuthScreen() {
    const app = useApp();
    const [mode, setMode] = useState('login'); // login | register | invite
    const [email, setEmail] = useState('linshen@qm.studio');
    const [pw, setPw] = useState('••••••••••');
    const [busy, setBusy] = useState(false);

    const submit = (e) => {
      e.preventDefault();
      setBusy(true);
      setTimeout(() => { setBusy(false); app.go('projects'); }, 720);
    };

    const tones = ['b','a','d','c','b','a'];

    return (
      <div style={{ height: '100%', display: 'grid', gridTemplateColumns: '1.05fr 1fr', background: 'var(--bg)' }}>
        {/* visual panel */}
        <div className="hide-mobile" style={{ position: 'relative', overflow: 'hidden', borderRight: '1px solid var(--line)', background: 'radial-gradient(120% 100% at 0% 0%, color-mix(in oklab, var(--accent) 16%, var(--bg)), var(--bg) 60%)' }}>
          <div style={{ position: 'absolute', inset: 0, opacity: .5, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gridAutoRows: '1fr', gap: 12, padding: 40, transform: 'rotate(-8deg) scale(1.25)', transformOrigin: 'center' }}>
            {tones.concat(tones).map((t, i) => <Thumb key={i} w="100%" h="100%" tone={t} label={'SHOT ' + String(i + 1).padStart(2, '0')} />)}
          </div>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent, color-mix(in oklab, var(--bg) 78%, transparent))' }}></div>
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
            <h1 style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.25, letterSpacing: '-.02em' }}>从剧本到成片，<br/>一支团队的<span className="acc">漫剧</span>生产线。</h1>
            <p className="muted" style={{ marginTop: 14, fontSize: 14, maxWidth: 440 }}>剧本 · 分镜 · 角色一致性 · AI 镜头生成 · 配音合成 —— 协作、计费、审计，一键部署到边缘。</p>
            <div className="row gap16 wrap" style={{ marginTop: 22 }}>
              {['可插拔视频 / LLM / TTS', '积分制计费 · 操作审计', 'RBAC 多人协作'].map(f => (
                <span key={f} className="row gap6 muted" style={{ fontSize: 12.5 }}><Icon name="check" size={14} className="acc" />{f}</span>
              ))}
            </div>
          </div>
        </div>

        {/* form panel */}
        <div className="center" style={{ padding: 24, overflow: 'auto' }}>
          <div style={{ width: 'min(380px, 100%)' }} className="rise">
            <div className="only-mobile row gap10" style={{ marginBottom: 26, justifyContent: 'center' }}>
              <div className="brand-mark" style={{ width: 34, height: 34 }}>漫</div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>漫剧工坊</div>
            </div>

            {mode === 'invite' ? (
              <div className="card" style={{ padding: 18, marginBottom: 20, background: 'var(--accent-soft)', borderColor: 'var(--accent-line)' }}>
                <div className="row gap10">
                  <span className="av" style={{ width: 34, height: 34, background: 'linear-gradient(140deg,#7c5cf0,#3b7ff0)' }}>青</span>
                  <div>
                    <div style={{ fontWeight: 600 }}>周宴 邀请你加入 <b>青冥工作室</b></div>
                    <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>预设角色 · <span className="acc">创作者 Creator</span> · 链接 6 天后过期</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 22 }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.01em' }}>{mode === 'login' ? '欢迎回来' : '创建账户'}</h2>
                <p className="muted" style={{ marginTop: 5, fontSize: 13.5 }}>{mode === 'login' ? '登录以继续你的漫剧创作' : '注册后即可创建或加入工作空间'}</p>
              </div>
            )}

            <form onSubmit={submit} className="col gap16">
              {(mode === 'register' || mode === 'invite') && (
                <label><span className="lbl">昵称</span>
                  <input className="field" defaultValue="" placeholder="你的名字" /></label>
              )}
              <label><span className="lbl">邮箱</span>
                <div className="search" style={{ height: 38 }}>
                  <Icon name="mail" size={16} className="faint" />
                  <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@studio.com" type="email" />
                </div>
              </label>
              <label><span className="lbl">密码</span>
                <div className="search" style={{ height: 38 }}>
                  <Icon name="lock" size={16} className="faint" />
                  <input value={pw} onChange={e => setPw(e.target.value)} type="password" />
                  {mode === 'login' && <a className="acc" style={{ fontSize: 12, fontWeight: 600 }}>忘记？</a>}
                </div>
              </label>

              <button className="btn btn-pri" type="submit" style={{ height: 40, marginTop: 2 }} disabled={busy}>
                {busy ? <Icon name="refresh" size={16} className="spin" /> : <Icon name={mode === 'invite' ? 'check' : 'arrowRight'} size={16} />}
                {busy ? '正在进入…' : mode === 'login' ? '登录' : mode === 'invite' ? '接受邀请并加入' : '注册账户'}
              </button>
            </form>

            <div className="row gap12" style={{ margin: '18px 0', color: 'var(--text-3)', fontSize: 12 }}>
              <span className="hr grow"></span>或<span className="hr grow"></span>
            </div>
            <button className="btn btn-ghost" style={{ width: '100%', height: 38 }} onClick={() => app.go('projects')}>
              <Icon name="github" size={16} /> 使用 GitHub 继续
            </button>

            <div className="muted" style={{ textAlign: 'center', marginTop: 22, fontSize: 13 }}>
              {mode === 'login' ? (
                <>还没有账户？<a className="acc" style={{ fontWeight: 600 }} onClick={() => setMode('register')}> 立即注册</a>
                  <span className="faint"> · </span>
                  <a className="acc" style={{ fontWeight: 600 }} onClick={() => setMode('invite')}>有邀请链接</a></>
              ) : (
                <>已有账户？<a className="acc" style={{ fontWeight: 600 }} onClick={() => setMode('login')}> 去登录</a></>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  window.AuthScreen = AuthScreen;
})();
