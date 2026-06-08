/* app.jsx — App root: context, state, live polling sim, routing, tweaks. */
(function () {
  const { useState, useEffect, useRef, useCallback } = React;
  const Icon = window.Icon;
  const { DATA } = window;
  const { useTweaks, TweaksPanel, TweakSection, TweakRadio } = window;

  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "theme": "dark",
    "accent": "orange",
    "density": "regular"
  }/*EDITMODE-END*/;

  const ACCENTS = [
    { id: 'orange', c: '#e8623d' }, { id: 'violet', c: '#7c5cf0' },
    { id: 'blue', c: '#3b7ff0' }, { id: 'teal', c: '#119e94' },
  ];

  const SCREENS = {
    login: 'AuthScreen', projects: 'ProjectsScreen', project: 'ProjectScreen',
    script: 'ScriptScreen', storyboard: 'StoryboardScreen', tasks: 'TaskCenterScreen',
    characters: 'CharactersScreen', assets: 'AssetsScreen', billing: 'BillingScreen',
    members: 'MembersScreen', audit: 'AuditScreen', settings: 'SettingsScreen',
  };

  function App() {
    const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
    const [route, setRoute] = useState({ name: 'login' });
    const [railOpen, setRailOpen] = useState(false);
    const [shots, setShots] = useState(() => DATA.shots.map(s => ({ ...s })));
    const [tasks, setTasks] = useState(() => DATA.tasks.map(x => ({ ...x })));
    const [wallet, setWallet] = useState({ ...DATA.wallet });
    const [projects, setProjects] = useState(() => DATA.projects.map(p => ({ ...p })));
    const [episodes, setEpisodes] = useState(() => DATA.episodes.map(e => ({ ...e })));
    const [genDrawer, setGenDrawer] = useState(null);
    const [enhanceDrawer, setEnhanceDrawer] = useState(null);
    const [toasts, setToasts] = useState([]);

    // apply theme tokens
    useEffect(() => {
      const r = document.documentElement;
      r.setAttribute('data-theme', t.theme || 'dark');
      r.setAttribute('data-accent', t.accent || 'orange');
      r.setAttribute('data-density', t.density || 'regular');
    }, [t.theme, t.accent, t.density]);

    const go = useCallback((name, args = {}) => { setRoute({ name, ...args }); document.querySelector('.content')?.scrollTo?.(0, 0); }, []);
    const toast = useCallback((msg, icon = 'check') => {
      const id = Math.random(); setToasts(p => [...p, { id, msg, icon }]);
      setTimeout(() => setToasts(p => p.filter(x => x.id !== id)), 2600);
    }, []);

    const updateShot = useCallback((id, patch) => setShots(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s)), []);

    const addProject = useCallback((data) => {
      const id = 'p_' + Math.random().toString(36).slice(2, 7);
      const proj = { id, name: data.name, tone: data.tone, style: data.style, ratio: data.ratio, res: data.res, episodes: 0, status: 'draft', updated: new Date().toISOString(), synopsis: data.synopsis || '', members: [DATA.me.id] };
      setProjects(prev => [proj, ...prev]);
      toast('已创建项目 · ' + data.name, 'layers');
      go('project', { projectId: id });
    }, [toast, go]);

    const addEpisode = useCallback((projectId, data) => {
      const id = 'e_' + Math.random().toString(36).slice(2, 7);
      setEpisodes(prev => {
        const idx = prev.filter(e => e.project === projectId).length + 1;
        return [...prev, { id, project: projectId, index: idx, title: data.title, status: 'draft', shots: 0, done: 0, updated: new Date().toISOString(), assignee: data.assignee || null }];
      });
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, episodes: p.episodes + 1, updated: new Date().toISOString() } : p));
      toast('已新建剧集 · ' + data.title, 'clapper');
    }, [toast]);

    const openGenerate = useCallback((ids) => setGenDrawer({ shotIds: ids }), []);
    const openEnhance = useCallback((id) => setEnhanceDrawer({ shotId: id }), []);
    const submitEnhance = useCallback((shotId, params, cost) => {
      setWallet(w => ({ ...w, balance: w.balance - cost, monthSpent: w.monthSpent + cost }));
      setShots(prev => prev.map(s => s.id === shotId ? { ...s, enhance: { status: 'queued', type: params.type, res: params.res, progress: 0 } } : s));
      const sh = shots.find(s => s.id === shotId);
      setTasks(prev => [{ id: 'tk_' + (Math.floor(Math.random() * 9000) + 1000), shot: shotId, shotIdx: sh ? sh.index : 0, ep: 'e3', cap: 'video-enhance', model: 'cv-mediakit', state: 'queued', progress: 0, cost, by: DATA.me.id, created: new Date().toISOString(), ptid: 'enh-' + Math.random().toString(16).slice(2, 8) }, ...prev]);
      setEnhanceDrawer(null);
      toast(`已提交视频增强 · ${params.res} ${params.type} · 预扣 ${cost} 积分`, 'bolt');
    }, [shots, toast]);

    const submitGenerate = useCallback((ids, params, totalCost) => {
      setWallet(w => ({ ...w, balance: w.balance - totalCost, monthSpent: w.monthSpent + totalCost }));
      const per = Math.round(totalCost / Math.max(1, ids.length));
      setShots(prev => prev.map(s => ids.includes(s.id) ? { ...s, status: 'queued', progress: 0, model: params.model, error: null } : s));
      setTasks(prev => {
        let n = 8830;
        const newTasks = ids.map((sid, i) => {
          const sh = shots.find(s => s.id === sid);
          return { id: 'tk_' + (n + i), shot: sid, shotIdx: sh ? sh.index : 0, ep: 'e3', cap: sh && sh.keyframe ? 'image-to-video' : 'text-to-video', model: params.model, state: 'queued', progress: 0, cost: per, by: DATA.me.id, created: new Date().toISOString(), ptid: 'cgt-' + Math.random().toString(16).slice(2, 8) };
        });
        return [...newTasks, ...prev];
      });
      setGenDrawer(null);
      toast(`已提交 ${ids.length} 个生成任务 · 预扣 ${totalCost.toLocaleString()} 积分`, 'sparkle');
    }, [shots, toast]);

    // ---- live polling simulation ----
    const tasksRef = useRef(tasks); tasksRef.current = tasks;
    useEffect(() => {
      const iv = setInterval(() => {
        const cur = tasksRef.current;
        const shotPatch = {};
        let next = cur.map(tk => {
          if (tk.state === 'running') {
            const np = Math.min(100, (tk.progress || 0) + 7 + Math.random() * 11);
            const enh = tk.cap === 'video-enhance';
            if (np >= 100) { shotPatch[tk.shot] = enh ? { __enh: { status: 'succeeded', progress: 100 } } : { status: 'generated', progress: 100, keyframe: true }; return { ...tk, state: 'succeeded', progress: 100 }; }
            shotPatch[tk.shot] = enh ? { __enh: { status: 'processing', progress: Math.round(np) } } : { status: 'running', progress: Math.round(np) };
            return { ...tk, progress: Math.round(np) };
          }
          return tk;
        });
        const slots = Math.max(0, 2 - next.filter(tk => tk.state === 'running').length);
        let promoted = 0;
        next = next.map(tk => {
          if (tk.state === 'queued' && promoted < slots) { promoted++; const enh = tk.cap === 'video-enhance'; shotPatch[tk.shot] = enh ? { __enh: { status: 'processing', progress: 5 } } : { status: 'running', progress: 5 }; return { ...tk, state: 'running', progress: 5 }; }
          return tk;
        });
        const changed = next.some((tk, i) => tk.state !== cur[i].state || tk.progress !== cur[i].progress);
        if (changed) setTasks(next);
        if (Object.keys(shotPatch).length) setShots(prev => prev.map(s => {
          const p = shotPatch[s.id]; if (!p) return s;
          if (p.__enh) return { ...s, enhance: { ...(s.enhance || {}), ...p.__enh } };
          return { ...s, ...p };
        }));
      }, 850);
      return () => clearInterval(iv);
    }, []);

    const ctx = { route, go, railOpen, setRailOpen, theme: t.theme, setTheme: (v) => setTweak('theme', v), shots, tasks, wallet, projects, episodes, addProject, addEpisode, updateShot, openGenerate, submitGenerate, genDrawer, setGenDrawer, openEnhance, submitEnhance, enhanceDrawer, setEnhanceDrawer, toast };

    const { Ctx, Sidebar, GenerationDrawer, EnhanceDrawer } = window;
    const ScreenComp = window[SCREENS[route.name]] || window.ProjectsScreen;
    const isAuth = route.name === 'login';

    const panel = (
      <TweaksPanel>
        <TweakSection label="主题" />
        <TweakRadio label="明暗" value={t.theme} options={['dark', 'light']} onChange={(v) => setTweak('theme', v)} />
        <div style={{ padding: '4px 2px 10px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>强调色</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {ACCENTS.map(a => (
              <button key={a.id} onClick={() => setTweak('accent', a.id)} title={a.id}
                style={{ width: 30, height: 30, borderRadius: 8, background: a.c, border: t.accent === a.id ? '2px solid var(--text)' : '2px solid transparent', outline: '1px solid var(--line-2)', cursor: 'pointer' }} />
            ))}
          </div>
        </div>
        <TweakSection label="布局" />
        <TweakRadio label="信息密度" value={t.density} options={['compact', 'regular', 'comfy']} onChange={(v) => setTweak('density', v)} />
      </TweaksPanel>
    );

    return (
      <Ctx.Provider value={ctx}>
        {isAuth ? (
          <React.Fragment>
            <ScreenComp />
            {panel}
          </React.Fragment>
        ) : (
          <div className={'app' + (railOpen ? ' rail-open' : '')}>
            <Sidebar />
            <div className="main-col">
              <ScreenComp />
            </div>
            {genDrawer && <GenerationDrawer />}
            {enhanceDrawer && <EnhanceDrawer />}
            <div className="toasts">
              {toasts.map(t => <div className="toast" key={t.id}><Icon name={t.icon} size={16} className="acc" />{t.msg}</div>)}
            </div>
            {panel}
          </div>
        )}
      </Ctx.Provider>
    );
  }

  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
