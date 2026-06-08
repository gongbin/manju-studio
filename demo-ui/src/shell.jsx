/* shell.jsx — Sidebar + Topbar. window.Sidebar, window.Topbar */
(function () {
  const { useApp, Avatar, Menu, Progress } = window;
  const Icon = window.Icon;
  const { DATA, fmt } = window;

  const NAV = [
    { group: '创作', items: [
      { id: 'projects',   label: '项目 / 剧集', icon: 'layers' },
      { id: 'tasks',      label: '任务中心',   icon: 'cpu' },
      { id: 'characters', label: '角色库',     icon: 'users' },
      { id: 'assets',     label: '素材库',     icon: 'gallery' },
    ]},
    { group: '管理', items: [
      { id: 'billing',  label: '计费与用量', icon: 'wallet' },
      { id: 'members',  label: '成员与权限', icon: 'shield' },
      { id: 'audit',    label: '审计日志',   icon: 'history' },
      { id: 'settings', label: '工作空间设置', icon: 'settings' },
    ]},
  ];

  function Sidebar() {
    const app = useApp();
    const { route, go, railOpen, setRailOpen } = app;
    const active = route.name;
    const taskRunning = DATA.tasks.filter(t => t.state === 'running' || t.state === 'queued').length;

    const isActive = (id) => {
      if (id === 'projects') return ['projects','project','script','storyboard'].includes(active);
      return active === id;
    };

    return (
      <aside className="rail">
        <div className="rail-head">
          <div className="brand-mark">漫</div>
          <div className="grow" style={{ minWidth: 0 }}>
            <div className="brand-name">漫剧工坊</div>
            <div className="brand-sub mono">ManjuStudio</div>
          </div>
          <button className="icon-btn only-mobile" onClick={() => setRailOpen(false)}><Icon name="x" size={18} /></button>
        </div>

        <button className="ws-switch" onClick={() => go('settings')}>
          <span className="av" style={{ width: 26, height: 26, fontSize: 11, background: 'linear-gradient(140deg,#7c5cf0,#3b7ff0)' }}>青</span>
          <span className="grow" style={{ minWidth: 0 }}>
            <span className="ellipsis" style={{ display: 'block', fontWeight: 600, fontSize: 13 }}>{DATA.team.name}</span>
            <span className="faint" style={{ fontSize: 11 }}>{DATA.team.plan}</span>
          </span>
          <Icon name="chevDown" size={15} className="faint" />
        </button>

        <nav className="nav">
          {NAV.map((g) => (
            <React.Fragment key={g.group}>
              <div className="nav-label">{g.group}</div>
              {g.items.map((it) => (
                <a key={it.id} className={'nav-item' + (isActive(it.id) ? ' active' : '')}
                   onClick={() => { go(it.id); setRailOpen(false); }}>
                  <Icon name={it.icon} size={17} />
                  <span>{it.label}</span>
                  {it.id === 'tasks' && taskRunning > 0 && <span className="count alert mono">{taskRunning}</span>}
                </a>
              ))}
            </React.Fragment>
          ))}
        </nav>

        <div className="rail-foot">
          <div className="row gap8" style={{ marginBottom: 10, padding: '0 2px' }}>
            <Icon name="coins" size={15} className="acc" />
            <span className="grow">
              <span className="row" style={{ justifyContent: 'space-between', fontSize: 11.5 }}>
                <span className="muted">团队积分</span>
                <span className="mono" style={{ fontWeight: 600 }}>{fmt.credits(app.wallet.balance)}</span>
              </span>
              <div style={{ marginTop: 5 }}><Progress value={(DATA.wallet.monthSpent / DATA.wallet.monthBudget) * 100} amber /></div>
            </span>
          </div>
          <Menu align="left" trigger={
            <button className="ws-switch" style={{ margin: 0, width: '100%' }}>
              <Avatar name={DATA.me.name} size={26} />
              <span className="grow" style={{ minWidth: 0, textAlign: 'left' }}>
                <span className="ellipsis" style={{ display: 'block', fontWeight: 600, fontSize: 13 }}>{DATA.me.name}</span>
                <span className="faint" style={{ fontSize: 11 }}>{DATA.ROLE_LABEL[DATA.me.role]}</span>
              </span>
              <Icon name="moreV" size={15} className="faint" />
            </button>
          } items={[
            { icon: 'settings', label: '账户设置' },
            { icon: 'shield', label: '我的权限' },
            { sep: true },
            { icon: 'logout', label: '退出登录', danger: true, onClick: () => go('login') },
          ]} />
        </div>
      </aside>
    );
  }

  function Topbar({ children }) {
    const app = useApp();
    const { theme, setTheme, setRailOpen } = app;
    return (
      <header className="topbar">
        <button className="icon-btn rail-overlay-btn" onClick={() => setRailOpen(true)}><Icon name="menu" size={18} /></button>
        <div className="grow" style={{ minWidth: 0 }}>{children}</div>
        <div className="search hide-mobile" style={{ width: 230 }}>
          <Icon name="search" size={15} />
          <input placeholder="搜索项目、镜头、任务…" />
          <span className="kbd">⌘K</span>
        </div>
        <button className="icon-btn" title="切换主题" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
        </button>
        <Menu trigger={<button className="icon-btn" style={{ position: 'relative' }}><Icon name="bell" size={18} /><span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--bg)' }}></span></button>}
          items={[
            { icon: 'check', label: '镜头 #04 生成成功' },
            { icon: 'warn', label: '镜头 #07 生成失败' },
            { icon: 'sparkle', label: '顾辞 通过了 第四集 终审' },
          ]} />
        <div className="vr hide-mobile"></div>
        <Avatar name={DATA.me.name} size={28} />
      </header>
    );
  }

  function Screen({ crumb, children }) {
    return (
      <React.Fragment>
        <Topbar>{crumb}</Topbar>
        <div className="content">{children}</div>
      </React.Fragment>
    );
  }

  function Crumb({ parts }) {
    const app = useApp();
    return (
      <div className="crumb">
        {parts.map((p, i) => (
          <React.Fragment key={i}>
            {i > 0 && <Icon name="chevRight" size={13} className="sep" />}
            {p.to ? <a onClick={() => app.go(p.to, p.args)} className="ellipsis" style={{ cursor: 'pointer' }}>{p.label}</a>
                  : <span className="cur ellipsis">{p.label}</span>}
          </React.Fragment>
        ))}
      </div>
    );
  }

  Object.assign(window, { Sidebar, Topbar, Screen, Crumb });
})();
