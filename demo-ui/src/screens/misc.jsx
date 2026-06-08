/* misc.jsx — Characters, Assets, Billing, Members, Audit, Settings screens. */
(function () {
  const { useState } = React;
  const { useApp, Screen, Crumb, Thumb, Avatar, AvatarStack, StatusPill, Menu, Switch, Overlay, Progress, Empty } = window;
  const Icon = window.Icon;
  const { DATA, fmt } = window;
  const nameOf = (id) => (DATA.members.find(m => m.id === id) || {}).name || '—';

  // ---------------- Characters ----------------
  function CharactersScreen() {
    return (
      <Screen crumb={<Crumb parts={[{ label: '角色库' }]} />}>
        <div className="page">
          <div className="page-head">
            <div className="grow"><div className="page-title">角色库</div><div className="page-sub">角色卡 · 参考图集 · 一致性资产，跨集跨镜头复用</div></div>
            <button className="btn btn-pri"><Icon name="plus" size={16} />新建角色</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 16 }}>
            {DATA.characters.map(c => (
              <div key={c.id} className="card" style={{ overflow: 'hidden' }}>
                <div style={{ position: 'relative' }}>
                  <Thumb w="100%" h={140} tone={c.tone} rounded={0} label={`REF ×${c.refs}`} />
                  <div style={{ position: 'absolute', top: 8, right: 8 }} className="row gap6">
                    {c.asset ? <span className="pill" style={{ color: 'var(--st-done)', background: 'var(--st-done-bg)' }}><Icon name="link" size={11} />一致性</span> : null}
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

  // ---------------- Assets ----------------
  function AssetsScreen() {
    const [type, setType] = useState('all');
    const kinds = [
      ['IMG', 'a', 'image'], ['VIDEO', 'b', 'video'], ['AUDIO', 'c', 'audio'], ['VIDEO', 'd', 'video'],
      ['IMG', 'b', 'image'], ['VIDEO', 'a', 'video'], ['IMG', 'c', 'image'], ['VIDEO', 'd', 'video'],
      ['AUDIO', 'a', 'audio'], ['VIDEO', 'b', 'video'], ['IMG', 'd', 'image'], ['VIDEO', 'c', 'video'],
    ];
    const list = kinds.filter(k => type === 'all' || k[2] === type);
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
                  <span className="mono faint">{k[2] === 'audio' ? '·mp3' : k[2] === 'video' ? '·mp4' : '·png'}</span>
                  <span className="faint">R2</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Screen>
    );
  }

  // ---------------- Billing ----------------
  function BillingScreen() {
    const app = useApp();
    const w = DATA.wallet;
    const usageByMember = [
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
    const TT = { hold: { l: '预扣', c: 'var(--st-running)' }, settle: { l: '结算', c: 'var(--st-queued)' }, refund: { l: '退回', c: 'var(--st-done)' }, topup: { l: '充值', c: 'var(--accent-text)' } };
    return (
      <Screen crumb={<Crumb parts={[{ label: '计费与用量' }]} />}>
        <div className="page">
          <div className="page-head"><div className="grow"><div className="page-title">计费与用量</div><div className="page-sub">积分制钱包 · 预扣→结算→退款 · 配额与用量报表</div></div>
            <button className="btn btn-ghost"><Icon name="download" size={15} />导出 CSV</button><button className="btn btn-pri"><Icon name="coins" size={15} />充值积分</button></div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 14, marginBottom: 22 }}>
            <div className="card" style={{ padding: 18, background: 'linear-gradient(135deg, var(--accent-soft), transparent)' }}>
              <div className="k muted row gap6"><Icon name="wallet" size={15} />团队钱包余额</div>
              <div className="row" style={{ alignItems: 'baseline', gap: 8, marginTop: 8 }}><span className="mono" style={{ fontSize: 34, fontWeight: 700 }}>{fmt.credits(app.wallet.balance)}</span><span className="faint">积分</span></div>
              <div className="row gap16" style={{ marginTop: 14, fontSize: 12 }}><span className="muted">本月已用 <b className="mono" style={{ color: 'var(--text)' }}>{fmt.credits(w.monthSpent)}</b></span><span className="muted">预算 <b className="mono" style={{ color: 'var(--text)' }}>{fmt.credits(w.monthBudget)}</b></span></div>
              <div style={{ marginTop: 8 }}><Progress value={w.monthSpent / w.monthBudget * 100} amber /></div>
            </div>
            <div className="stat"><div className="k"><Icon name="cpu" size={14} />本月任务</div><div className="v mono">147</div><div className="d muted">平均 168 积分/镜头</div></div>
            <div className="stat"><div className="k"><Icon name="film" size={14} />本月镜头</div><div className="v mono">186</div><div className="d acc">成功率 94%</div></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--line)', fontWeight: 600, fontSize: 13 }}>成员用量排行</div>
              <table className="tbl" style={{ fontSize: 12.5 }}>
                <tbody>{usageByMember.map(u => (
                  <tr className="trow" key={u.m}><td style={{ width: 150 }}><div className="row gap8"><Avatar name={nameOf(u.m)} size={22} />{nameOf(u.m)}</div></td>
                    <td className="mono faint">{u.tasks} 任务</td>
                    <td><div className="row gap8"><div className="grow"><Progress value={u.credits / 9820 * 100} /></div><span className="mono" style={{ fontSize: 11.5, width: 48, textAlign: 'right' }}>{fmt.credits(u.credits)}</span></div></td></tr>
                ))}</tbody>
              </table>
            </div>
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--line)', fontWeight: 600, fontSize: 13 }}>积分流水</div>
              <table className="tbl" style={{ fontSize: 12.5 }}>
                <tbody>{txns.map((x, i) => (
                  <tr className="trow" key={i}><td><span className="pill" style={{ color: TT[x.t].c, background: 'var(--surface-3)' }}>{TT[x.t].l}</span></td>
                    <td className="grow"><span className="ellipsis">{x.ref}</span><div className="faint" style={{ fontSize: 10.5 }}>{nameOf(x.by) === '—' ? x.by : nameOf(x.by)} · {fmt.ago(Date.now() - x.time * 60000)}</div></td>
                    <td className="mono" style={{ textAlign: 'right', fontWeight: 600, color: x.a > 0 ? 'var(--st-done)' : 'var(--text)' }}>{x.a > 0 ? '+' : ''}{fmt.credits(x.a)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </div>
      </Screen>
    );
  }

  // ---------------- Members ----------------
  const PERMS = ['project.write', 'shot.generate', 'shot.review', 'shot.publish', 'member.manage', 'credential.write', 'billing.manage', 'audit.read'];
  const ROLE_PERMS = {
    owner: PERMS, admin: PERMS.filter(p => p !== 'credential.write' || true),
    director: ['project.write', 'shot.generate', 'shot.review', 'shot.publish'],
    creator: ['project.write', 'shot.generate'], reviewer: ['shot.review', 'audit.read'], viewer: [],
  };
  function MembersScreen() {
    const [tab, setTab] = useState('members');
    return (
      <Screen crumb={<Crumb parts={[{ label: '成员与权限' }]} />}>
        <div className="page">
          <div className="page-head"><div className="grow"><div className="page-title">成员与权限</div><div className="page-sub">工作空间级角色 + 项目级覆盖 · 后端强制鉴权 RBAC</div></div>
            <div className="seg">{[['members', '成员'], ['roles', '角色权限']].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
            <button className="btn btn-pri"><Icon name="mail" size={15} />邀请成员</button></div>

          {tab === 'members' ? (
            <div className="card" style={{ overflow: 'hidden' }}>
              <table className="tbl"><thead><tr><th>成员</th><th>邮箱</th><th>工作空间角色</th><th>状态</th><th></th></tr></thead>
                <tbody>{DATA.members.map(m => (
                  <tr className="trow" key={m.id}>
                    <td><div className="row gap10"><Avatar name={m.name} size={28} /><div><b>{m.name}</b><div className="faint" style={{ fontSize: 11.5 }}>{m.title}</div></div></div></td>
                    <td className="mono faint" style={{ fontSize: 12 }}>{m.email}</td>
                    <td><Menu align="left" trigger={<button className="tag" style={{ height: 26, cursor: 'pointer' }}>{DATA.ROLE_LABEL[m.role]}<Icon name="chevDown" size={12} /></button>} items={Object.entries(DATA.ROLE_LABEL).map(([k, v]) => ({ icon: k === m.role ? 'check' : 'shield', label: v }))} /></td>
                    <td>{m.online ? <span className="pill" style={{ color: 'var(--st-done)', background: 'var(--st-done-bg)' }}><span className="dot"></span>在线</span> : <span className="faint" style={{ fontSize: 12 }}>离线</span>}</td>
                    <td><Menu trigger={<button className="icon-btn"><Icon name="more" size={16} /></button>} items={[{ icon: 'shield', label: '项目级角色覆盖' }, { icon: 'history', label: '操作记录' }, { sep: true }, { icon: 'trash', label: '移出空间', danger: true }]} /></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : (
            <div className="card" style={{ overflow: 'auto' }}>
              <table className="tbl" style={{ fontSize: 12 }}>
                <thead><tr><th>权限点</th>{Object.keys(ROLE_PERMS).map(r => <th key={r} style={{ textAlign: 'center' }}>{DATA.ROLE_LABEL[r]}</th>)}</tr></thead>
                <tbody>{PERMS.map(perm => (
                  <tr className="trow" key={perm}><td className="mono">{perm}</td>
                    {Object.keys(ROLE_PERMS).map(r => <td key={r} style={{ textAlign: 'center' }}>{ROLE_PERMS[r].includes(perm) ? <Icon name="check" size={15} className="acc" /> : <span className="faint">·</span>}</td>)}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      </Screen>
    );
  }

  // ---------------- Audit ----------------
  function AuditScreen() {
    const ACT = { 'shot.generate': 'cpu', 'shot.write': 'edit', 'member.invite': 'mail', 'credential.write': 'lock', 'billing.topup': 'coins' };
    return (
      <Screen crumb={<Crumb parts={[{ label: '审计日志' }]} />}>
        <div className="page">
          <div className="page-head"><div className="grow"><div className="page-title">审计日志</div><div className="page-sub">所有写操作只追加、不可篡改 · actor / action / target / diff / IP·UA</div></div>
            <button className="btn btn-ghost btn-sm"><Icon name="filter" size={14} />筛选</button>
            <button className="btn btn-ghost"><Icon name="download" size={15} />导出 CSV</button></div>
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="tbl" style={{ fontSize: 12.5 }}>
              <thead><tr><th>操作人</th><th>动作</th><th>目标对象</th><th>差异摘要</th><th>来源</th><th>时间</th></tr></thead>
              <tbody>{DATA.audit.map(a => (
                <tr className="trow" key={a.id}>
                  <td><div className="row gap8"><Avatar name={nameOf(a.actor)} size={22} />{nameOf(a.actor)}</div></td>
                  <td><span className="tag mono" style={{ fontSize: 11 }}><Icon name={ACT[a.action] || 'edit'} size={12} />{a.action}</span></td>
                  <td className="muted">{a.target}</td>
                  <td className="faint">{a.diff}</td>
                  <td><span className="mono faint" style={{ fontSize: 11 }}>{a.src}</span></td>
                  <td className="faint">{fmt.ago(a.time)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </Screen>
    );
  }

  // ---------------- Settings ----------------
  function SettingsScreen() {
    const app = useApp();
    const [sec, setSec] = useState('providers');
    const [credModal, setCredModal] = useState(null); // { plane: 'data' | 'control' }
    const SECS = [['general', '通用', 'settings'], ['providers', 'Provider 凭据', 'lock'], ['defaults', '默认生成参数', 'film'], ['billing', '计费规则', 'coins'], ['deploy', '部署', 'bolt']];
    return (
      <Screen crumb={<Crumb parts={[{ label: '工作空间设置' }]} />}>
        <div className="page" style={{ display: 'grid', gridTemplateColumns: '190px 1fr', gap: 26, maxWidth: 1100 }}>
          <div className="col gap2" style={{ position: 'sticky', top: 0, alignSelf: 'start' }}>
            <div className="page-title" style={{ marginBottom: 12 }}>设置</div>
            {SECS.map(([k, l, ic]) => <a key={k} className={'nav-item' + (sec === k ? ' active' : '')} onClick={() => setSec(k)}><Icon name={ic} size={16} />{l}</a>)}
          </div>
          <div className="col gap16">
            {sec === 'providers' && (
              <React.Fragment>
                <div><div style={{ fontWeight: 700, fontSize: 17 }}>Provider 凭据</div><div className="muted" style={{ fontSize: 13, marginTop: 3 }}>AES-GCM 加密落库，仅服务端调用时解密，<b>前端永不下发明文</b>。三类能力相互独立。</div></div>

                {/* 火山方舟 — dual credential planes */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div className="row gap12" style={{ padding: 14, borderBottom: '1px solid var(--line)' }}>
                    <span className="av" style={{ width: 34, height: 34, background: 'linear-gradient(140deg,#e8623d,#d4542f)', color: '#fff', fontSize: 15 }}>火</span>
                    <div className="grow"><div className="row gap8"><b style={{ fontSize: 14 }}>火山方舟 Volcengine</b><span className="tag" style={{ height: 19, fontSize: 10.5 }}>视频 · LLM · TTS</span></div><div className="mono faint" style={{ fontSize: 11, marginTop: 3 }}>volcengine · 双凭据平面（数据面 API Key + 控制面 AK/SK）</div></div>
                    <span className="pill" style={{ color: 'var(--st-done)', background: 'var(--st-done-bg)' }}><Icon name="check" size={11} />已启用</span>
                  </div>
                  <div className="row gap12" style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
                    <Icon name="cpu" size={16} className="faint" />
                    <div className="grow"><div className="row gap8"><b style={{ fontSize: 13 }}>数据面 · API Key</b><span className="tag" style={{ height: 18, fontSize: 10 }}>视频 / 文生图 / LLM / TTS</span></div><div className="faint" style={{ fontSize: 11, marginTop: 2 }}>调用 content_generation（Seedance / 即梦）· Authorization: Bearer</div><div className="mono" style={{ fontSize: 11, marginTop: 4 }}>APIKey ••••••••••••3a91 <span className="faint">(已加密)</span></div></div>
                    <button className="btn btn-ghost btn-sm" onClick={() => setCredModal({ plane: 'data' })}>更新</button>
                  </div>
                  <div className="row gap12" style={{ padding: '12px 14px' }}>
                    <Icon name="lock" size={16} className="faint" />
                    <div className="grow"><div className="row gap8"><b style={{ fontSize: 13 }}>控制面 · AK / SK</b><span className="tag" style={{ height: 18, fontSize: 10 }}>视频增强 / 资源管理</span></div><div className="faint" style={{ fontSize: 11, marginTop: 2 }}>CV MediaKit 等控制面 API · HMAC-SHA256 v4 签名</div><div className="mono" style={{ fontSize: 11, marginTop: 4 }}>AK AKLT••••7f3a · SK •••••••••••• <span className="faint">(已加密)</span></div></div>
                    <button className="btn btn-ghost btn-sm" onClick={() => setCredModal({ plane: 'control' })}>更新</button>
                  </div>
                </div>

                {[
                  { fam: 'LLM 文案', name: 'Anthropic · Claude', prov: 'anthropic', set: false },
                  { fam: 'TTS 配音', name: 'OpenAI 兼容 · 自建 TTS', prov: 'openai-compatible', set: false },
                ].map((c, i) => (
                  <div key={i} className="card" style={{ padding: 14 }}>
                    <div className="row gap12">
                      <span className="av" style={{ width: 34, height: 34, background: c.set ? 'linear-gradient(140deg,#e8623d,#d4542f)' : 'var(--surface-4)', color: c.set ? '#fff' : 'var(--text-3)' }}><Icon name="cpu" size={16} /></span>
                      <div className="grow">
                        <div className="row gap8"><b style={{ fontSize: 14 }}>{c.name}</b><span className="tag" style={{ height: 19, fontSize: 10.5 }}>{c.fam}</span></div>
                        <div className="mono faint" style={{ fontSize: 11, marginTop: 3 }}>{c.prov} · 单 API Key · 未配置</div>
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={() => setCredModal({ plane: 'data', name: c.name })}>配置</button>
                    </div>
                  </div>
                ))}
                <div className="row gap8" style={{ fontSize: 12, color: 'var(--text-2)', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 9 }}><Icon name="shield" size={15} className="acc" />凭据读写均记入审计日志。运行时仅在 Provider 调用瞬间于内存解密。</div>
              </React.Fragment>
            )}
            {sec === 'defaults' && (
              <React.Fragment>
                <div><div style={{ fontWeight: 700, fontSize: 17 }}>默认生成参数</div><div className="muted" style={{ fontSize: 13, marginTop: 3 }}>新建镜头时的默认值，可在镜头级覆盖。</div></div>
                <div className="card col gap14" style={{ padding: 16 }}>
                  {[['默认视频模型', 'Seedance 2.0'], ['默认分辨率', '1080p'], ['默认比例', '16:9'], ['默认时长', '5s']].map(([k, v]) => (
                    <div key={k} className="row" style={{ justifyContent: 'space-between' }}><span className="muted" style={{ fontSize: 13 }}>{k}</span><button className="tag" style={{ height: 28 }}>{v}<Icon name="chevDown" size={12} /></button></div>
                  ))}
                  <div className="hr"></div>
                  <div className="row" style={{ justifyContent: 'space-between' }}><span className="row gap8" style={{ fontSize: 13 }}><Icon name="mic" size={15} className="faint" />默认生成音频</span><Switch on={true} onChange={() => { }} /></div>
                  <div className="row" style={{ justifyContent: 'space-between' }}><span className="row gap8" style={{ fontSize: 13 }}><Icon name="eye" size={15} className="faint" />默认水印</span><Switch on={false} onChange={() => { }} /></div>
                </div>
              </React.Fragment>
            )}
            {sec === 'deploy' && (
              <React.Fragment>
                <div><div style={{ fontWeight: 700, fontSize: 17 }}>一键部署到 Cloudflare</div><div className="muted" style={{ fontSize: 13, marginTop: 3 }}>Pages + Workers + D1 + R2 + KV + Queues + Cron，零自建服务器。</div></div>
                <div className="card" style={{ padding: 16 }}>
                  <div className="row gap8 wrap">{['D1', 'R2', 'KV', 'Queues', 'Cron'].map(b => <span key={b} className="tag" style={{ height: 26 }}><Icon name="check" size={12} className="acc" />{b}</span>)}</div>
                  <div className="mono" style={{ marginTop: 14, padding: '12px 14px', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 9, fontSize: 12.5, color: 'var(--text-2)' }}>
                    <span className="faint">$</span> pnpm i && pnpm db:migrate && pnpm deploy
                  </div>
                  <button className="btn btn-pri" style={{ marginTop: 14 }}><Icon name="bolt" size={15} />Deploy to Cloudflare</button>
                </div>
              </React.Fragment>
            )}
            {(sec === 'general' || sec === 'billing') && (
              <Empty icon={sec === 'billing' ? 'coins' : 'settings'} title={sec === 'billing' ? '计费规则配置' : '通用设置'} sub="品牌、计费倍率与配额规则在此配置（演示中略）。" />
            )}
          </div>
        </div>
        {credModal && (
          <Overlay onClose={() => setCredModal(null)} type="modal">
            <div className="row gap10" style={{ padding: '16px 18px', borderBottom: '1px solid var(--line)' }}>
              <Icon name={credModal.plane === 'data' ? 'cpu' : 'lock'} size={18} className="acc" />
              <div className="grow">
                <b style={{ fontSize: 15 }}>{credModal.name ? credModal.name : credModal.plane === 'data' ? '数据面 · API Key' : '控制面 · AK / SK'}</b>
                <div className="faint" style={{ fontSize: 12 }}>{credModal.name ? '配置 Provider 凭据' : '火山方舟 · ' + (credModal.plane === 'data' ? 'content_generation 视频生成' : 'CV MediaKit 控制面签名')}</div>
              </div>
              <button className="icon-btn" onClick={() => setCredModal(null)}><Icon name="x" size={18} /></button>
            </div>
            <div style={{ padding: 18 }} className="col gap14">
              {credModal.plane === 'data' ? (
                <label><span className="lbl">API Key（数据面）</span>
                  <div className="search" style={{ height: 38 }}><Icon name="lock" size={15} className="faint" /><input type="password" defaultValue="ak-volc-7f3a91d2c4b8e6f0" placeholder="粘贴火山方舟 APIKey" /></div>
                  <div className="faint" style={{ fontSize: 11, marginTop: 6 }}>用于 <span className="mono">Authorization: Bearer</span> 调用视频 / 图像生成接口。</div></label>
              ) : (
                <React.Fragment>
                  <label><span className="lbl">Access Key ID（AK）</span>
                    <div className="search" style={{ height: 38 }}><Icon name="users" size={15} className="faint" /><input defaultValue="AKLTN2QwM2I5N2f3a" placeholder="AKLT…" /></div></label>
                  <label><span className="lbl">Secret Access Key（SK）</span>
                    <div className="search" style={{ height: 38 }}><Icon name="lock" size={15} className="faint" /><input type="password" defaultValue="N2EwYzhkZmM5MWI2ZTRkMA==" placeholder="粘贴 SK" /></div></label>
                  <label><span className="lbl">区域 Region（可选）</span>
                    <input className="field" defaultValue="cn-beijing" /></label>
                </React.Fragment>
              )}
              <div className="row gap8" style={{ fontSize: 11.5, color: 'var(--text-2)', padding: '9px 11px', background: 'var(--surface-2)', borderRadius: 9 }}><Icon name="shield" size={16} className="acc" /><span>提交后经 AES-GCM 加密落库，仅 Owner / Admin 可写，调用瞬间于服务端内存解密，<b>前端永不回明文</b>。读写记入审计。</span></div>
            </div>
            <div className="row gap8" style={{ padding: 16, borderTop: '1px solid var(--line)' }}>
              <button className="btn btn-ghost grow" onClick={() => setCredModal(null)}>取消</button>
              <button className="btn btn-pri grow" onClick={() => { setCredModal(null); app.toast('凭据已加密保存', 'lock'); }}><Icon name="check" size={15} />加密保存</button>
            </div>
          </Overlay>
        )}
      </Screen>
    );
  }

  Object.assign(window, { CharactersScreen, AssetsScreen, BillingScreen, MembersScreen, AuditScreen, SettingsScreen });
})();
