import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen, Crumb } from '@/app/Shell';
import { Icon } from '@/ui/icon';
import { Menu } from '@/ui/menu';
import { Switch } from '@/ui/controls';
import { Modal } from '@/ui/dialog';
import { toast } from '@/ui/toast';
import { models } from '@/lib/mock';
import { useTheme } from '@/theme';
import { api } from '@/lib/api';
import { useSettings, settingsStore, ruleFor, priceYuan, yuanToCredits, llmFamily } from '@/lib/settings';
import type { LlmProvider } from '@/lib/settings';

const ACCENTS: [string, string][] = [['orange', '#e8623d'], ['violet', '#7c5cf0'], ['blue', '#3b7ff0'], ['teal', '#16a394']];
const LOCALES: [string, string][] = [['zh-CN', '简体中文'], ['en-US', 'English']];
const TIMEZONES = ['Asia/Shanghai', 'Asia/Tokyo', 'Asia/Singapore', 'Europe/London', 'America/Los_Angeles', 'America/New_York', 'UTC'];

type Sec = 'general' | 'providers' | 'defaults' | 'storage' | 'billing' | 'deploy';
const SECS: [Sec, string, string][] = [
  ['general', '通用', 'settings'], ['providers', 'Provider 凭据', 'lock'],
  ['defaults', '默认生成参数', 'film'], ['storage', '素材存储', 'layers'], ['billing', '计费规则', 'coins'], ['deploy', '部署', 'bolt'],
];

interface CredModal { plane: 'data' | 'control'; tts?: boolean; name?: string }

function chip(on: boolean) {
  return { height: 28, cursor: 'pointer', background: on ? 'var(--accent-soft)' : undefined, borderColor: on ? 'var(--accent-line)' : undefined, color: on ? 'var(--accent-text)' : undefined } as const;
}
const VIDEO_MODELS = models.filter((m) => m.caps.includes('image-to-video') || m.caps.includes('text-to-video'));

function CredentialBody({ cred, onClose }: { cred: CredModal; onClose: () => void }) {
  const s = useSettings();
  const qc = useQueryClient();
  const tts = cred.tts;
  // 火山 数据面 (Ark video) → 'video'; TTS → 'tts'; AI MediaKit 视频增强 API Key → 'cv'.
  const family = tts ? 'tts' : cred.plane === 'control' ? 'cv' : 'video';
  const { data: creds } = useQuery({ queryKey: ['credentials'], queryFn: api.getCredentials });
  const status = creds?.[family];
  const [keyInput, setKeyInput] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      if (keyInput.trim()) { await api.saveCredential(family, keyInput.trim()); qc.invalidateQueries({ queryKey: ['credentials'] }); }
      toast('凭据已加密保存', 'lock');
      onClose();
    } catch (e) { toast('保存失败：' + (e instanceof Error ? e.message : e), 'warn'); setSaving(false); }
  };
  const removeKey = async () => { await api.deleteCredential(family); qc.invalidateQueries({ queryKey: ['credentials'] }); setKeyInput(''); toast('已删除该 Key', 'trash'); };
  return (
    <div style={{ width: 'min(460px, 94vw)' }}>
      <div className="row gap10" style={{ padding: '16px 18px', borderBottom: '1px solid var(--line)' }}>
        <Icon name={cred.plane === 'control' ? 'lock' : 'cpu'} size={18} className="acc" />
        <div className="grow"><b style={{ fontSize: 15 }}>{cred.name || (cred.plane === 'data' ? '数据面 · API Key' : 'AI MediaKit · API Key')}</b><div className="faint" style={{ fontSize: 12 }}>{tts ? '配置 TTS base_url / 模型名 / API Key · 支持第三方 / 自建端点' : cred.name ? '配置 Provider 凭据' : '火山方舟 · ' + (cred.plane === 'data' ? 'content_generation 视频生成' : 'AI MediaKit 视频画质增强')}</div></div>
        <button className="icon-btn" onClick={onClose}><Icon name="x" size={18} /></button>
      </div>
      <div style={{ padding: 18 }} className="col gap14">
        {tts ? (
          <>
            <label><span className="lbl">Base URL（接口地址）</span><input className="field" value={s.tts.baseUrl} onChange={(e) => settingsStore.setTts({ baseUrl: e.target.value })} placeholder="如：https://api.openai.com/v1" /></label>
            <label><span className="lbl">模型名称 Model</span><input className="field" value={s.tts.model} onChange={(e) => settingsStore.setTts({ model: e.target.value })} placeholder="如：tts-1 / cosyvoice-v1" /></label>
            <label><span className="lbl">API Key {status?.set && <span className="faint">· 已配置 <span className="mono">{status.hint}</span></span>}</span>
              <div className="search" style={{ height: 38 }}><Icon name="lock" size={15} className="faint" /><input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder={status?.set ? '留空则保留现有 Key' : '粘贴第三方 / 自建端点的 API Key'} /></div></label>
            {status?.set && <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={removeKey}><Icon name="trash" size={13} />删除已保存的 Key</button>}
            <div className="faint" style={{ fontSize: 11 }}>兼容任意 OpenAI 风格 TTS 端点（第三方代理或自建）；base_url 与模型名即时保存，密钥加密落库，<b>改 Key 无需重新部署</b>。</div>
          </>
        ) : cred.plane === 'data' ? (
          <>
            <label><span className="lbl">火山方舟 数据面 API Key {status?.set && <span className="faint">· 已配置 <span className="mono">{status.hint}</span></span>}</span>
              <div className="search" style={{ height: 38 }}><Icon name="lock" size={15} className="faint" /><input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder={status?.set ? '留空则保留现有 Key' : '粘贴火山方舟 Ark APIKey（视频生成）'} /></div></label>
            {status?.set && <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={removeKey}><Icon name="trash" size={13} />删除已保存的 Key</button>}
            <div className="faint" style={{ fontSize: 11 }}>用于 content_generation 视频生成（Authorization: Bearer）。配置后镜头生成走真实火山 API，<b>改 Key 无需重新部署</b>；未配置则走本地模拟。</div>
          </>
        ) : (
          <>
            <label><span className="lbl">AI MediaKit API Key {status?.set && <span className="faint">· 已配置 <span className="mono">{status.hint}</span></span>}</span>
              <div className="search" style={{ height: 38 }}><Icon name="lock" size={15} className="faint" /><input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder={status?.set ? '留空则保留现有 Key' : '粘贴 AI MediaKit API Key'} /></div></label>
            {status?.set && <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={removeKey}><Icon name="trash" size={13} />删除已保存的 Key</button>}
            <div className="faint" style={{ fontSize: 11 }}>用于 AI MediaKit 视频画质增强（Authorization: Bearer · cn-beijing）。配置后画质增强走真实火山 API，<b>改 Key 无需重新部署</b>；未配置则走模拟。</div>
          </>
        )}
        <div className="row gap8" style={{ fontSize: 11.5, color: 'var(--text-2)', padding: '9px 11px', background: 'var(--surface-2)', borderRadius: 9 }}><Icon name="shield" size={16} className="acc" /><span>密钥提交后经 AES-GCM 加密落库，仅 Owner / Admin 可写，调用瞬间于服务端内存解密，<b>前端永不回明文</b>。</span></div>
      </div>
      <div className="row gap8" style={{ padding: 16, borderTop: '1px solid var(--line)' }}>
        <button className="btn btn-ghost grow" onClick={onClose}>取消</button>
        <button className="btn btn-pri grow" disabled={saving} onClick={save}><Icon name={saving ? 'refresh' : 'check'} size={15} className={saving ? 'spin' : ''} />加密保存</button>
      </div>
    </div>
  );
}

function LlmProviderModal({ editing, onClose }: { editing: LlmProvider | 'new' | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: creds } = useQuery({ queryKey: ['credentials'], queryFn: api.getCredentials });
  const ex = editing && editing !== 'new' ? editing : null;
  const [name, setName] = useState('');
  const [style, setStyle] = useState<'openai' | 'anthropic'>('openai');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!editing) return;
    setName(ex?.name ?? ''); setStyle(ex?.style ?? 'openai'); setBaseUrl(ex?.baseUrl ?? ''); setModel(ex?.model ?? ''); setKeyInput('');
  }, [editing, ex]);
  const status = ex ? creds?.[llmFamily(ex.id)] : undefined;
  const valid = !!name.trim() && !!baseUrl.trim() && !!model.trim();
  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      let id = ex?.id;
      if (editing === 'new') id = settingsStore.addLlmProvider({ name: name.trim(), style, baseUrl: baseUrl.trim(), model: model.trim() });
      else if (ex) settingsStore.updateLlmProvider(ex.id, { name: name.trim(), style, baseUrl: baseUrl.trim(), model: model.trim() });
      if (id && keyInput.trim()) { await api.saveCredential(llmFamily(id), keyInput.trim()); qc.invalidateQueries({ queryKey: ['credentials'] }); }
      toast(editing === 'new' ? 'LLM 源已添加' : 'LLM 源已更新', 'check');
      onClose();
    } catch (e) { toast('保存失败：' + (e instanceof Error ? e.message : e), 'warn'); setSaving(false); }
  };
  const removeKey = async () => { if (!ex) return; await api.deleteCredential(llmFamily(ex.id)); qc.invalidateQueries({ queryKey: ['credentials'] }); setKeyInput(''); toast('已删除该 Key', 'trash'); };
  return (
    <Modal open={!!editing} onClose={onClose}>
      {editing && (
        <div style={{ width: 'min(480px, 94vw)' }}>
          <div className="row gap10" style={{ padding: '15px 18px', borderBottom: '1px solid var(--line)' }}>
            <span className="center" style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent-text)' }}><Icon name="cpu" size={17} /></span>
            <div className="grow"><b style={{ fontSize: 15 }}>{editing === 'new' ? '添加 LLM 源' : '配置 LLM 源'}</b><div className="faint" style={{ fontSize: 12 }}>名称 / 接口风格 / base_url / 模型 / API Key</div></div>
            <button className="icon-btn" onClick={onClose}><Icon name="x" size={18} /></button>
          </div>
          <div style={{ padding: 18, maxHeight: '66vh', overflow: 'auto' }} className="col gap14">
            <label><span className="lbl">名称 <span style={{ color: 'var(--st-failed)' }}>*</span></span><input className="field" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="如：OpenAI / 我的自建端点" /></label>
            <div><div className="lbl">接口风格</div><div className="seg">{([['openai', 'OpenAI 兼容'], ['anthropic', 'Anthropic 原生']] as const).map(([k, l]) => <button key={k} className={style === k ? 'on' : ''} onClick={() => setStyle(k)}>{l}</button>)}</div><div className="faint" style={{ fontSize: 11, marginTop: 4 }}>{style === 'anthropic' ? 'POST /v1/messages · x-api-key（api.anthropic.com 直连）' : 'POST /chat/completions · Bearer（OpenAI / ZenMux / DeepSeek / 自建…）'}</div></div>
            <label><span className="lbl">Base URL <span style={{ color: 'var(--st-failed)' }}>*</span></span><input className="field" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder={style === 'anthropic' ? 'https://api.anthropic.com' : 'https://api.openai.com/v1'} /></label>
            <label><span className="lbl">默认模型 <span style={{ color: 'var(--st-failed)' }}>*</span></span><input className="field" value={model} onChange={(e) => setModel(e.target.value)} placeholder={style === 'anthropic' ? 'claude-sonnet-4-20250514' : 'gpt-4o / anthropic/claude-sonnet-4'} /></label>
            <label><span className="lbl">API Key {status?.set && <span className="faint">· 已配置 <span className="mono">{status.hint}</span></span>}</span>
              <div className="search" style={{ height: 38 }}><Icon name="lock" size={15} className="faint" /><input type="password" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder={status?.set ? '留空则保留现有 Key' : '粘贴该源的 API Key'} /></div></label>
            {status?.set && <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={removeKey}><Icon name="trash" size={13} />删除该源的 Key</button>}
            <div className="row gap8" style={{ fontSize: 11.5, color: 'var(--text-2)', padding: '9px 11px', background: 'var(--surface-2)', borderRadius: 9 }}><Icon name="shield" size={16} className="acc" /><span>Key 经 AES-GCM 加密落库，前端永不回明文；切换 / 改 Key 即时生效，<b>无需重新部署</b>。</span></div>
          </div>
          <div className="row gap8" style={{ padding: 16, borderTop: '1px solid var(--line)' }}>
            <button className="btn btn-ghost grow" onClick={onClose}>取消</button>
            <button className="btn btn-pri grow" disabled={!valid || saving} onClick={submit}><Icon name={saving ? 'refresh' : 'check'} size={15} className={saving ? 'spin' : ''} />{editing === 'new' ? '添加' : '保存'}</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function Settings() {
  const [sec, setSec] = useState<Sec>('providers');
  const [cred, setCred] = useState<CredModal | null>(null);
  const [llmModal, setLlmModal] = useState<LlmProvider | 'new' | null>(null);
  const s = useSettings();
  const { theme, accent, density, setTheme, setAccent, setDensity } = useTheme();
  const { data: creds } = useQuery({ queryKey: ['credentials'], queryFn: api.getCredentials });
  const def = s.defaults;
  const defModel = models.find((m) => m.id === def.model) || models[0];
  const DUR_OPTS: (number | 'smart')[] = ['smart', ...[3, 4, 5, 6, 8, 10, 12].filter((d) => d >= defModel.dur[0] && d <= defModel.dur[1])];

  return (
    <Screen crumb={<Crumb parts={[{ label: '工作空间设置' }]} />}>
      <div className="page settings-grid" style={{ display: 'grid', gridTemplateColumns: '190px 1fr', gap: 26, maxWidth: 1100 }}>
        <div className="col gap2 settings-nav" style={{ position: 'sticky', top: 0, alignSelf: 'start' }}>
          <div className="page-title" style={{ marginBottom: 12 }}>设置</div>
          {SECS.map(([k, l, ic]) => <a key={k} className={'nav-item' + (sec === k ? ' active' : '')} onClick={() => setSec(k)}><Icon name={ic} size={16} />{l}</a>)}
        </div>

        <div className="col gap16">
          {sec === 'providers' && (
            <>
              <div><div style={{ fontWeight: 700, fontSize: 17 }}>Provider 凭据</div><div className="muted" style={{ fontSize: 13, marginTop: 3 }}>AES-GCM 加密落库，仅服务端调用时解密，<b>前端永不下发明文</b>。视频 / LLM / TTS 三类能力相互独立。</div></div>

              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="row gap12" style={{ padding: 14, borderBottom: '1px solid var(--line)' }}>
                  <span className="av" style={{ width: 34, height: 34, background: 'linear-gradient(140deg,#e8623d,#d4542f)', color: '#fff', fontSize: 15 }}>火</span>
                  <div className="grow"><div className="row gap8"><b style={{ fontSize: 14 }}>火山方舟 Volcengine</b><span className="tag" style={{ height: 19, fontSize: 10.5 }}>视频 · LLM · TTS</span></div><div className="mono faint" style={{ fontSize: 11, marginTop: 3 }}>volcengine · 双 API Key（方舟数据面 + AI MediaKit 视频增强）</div></div>
                  <span className="pill" style={{ color: 'var(--st-done)', background: 'var(--st-done-bg)' }}><Icon name="check" size={11} />已启用</span>
                </div>
                <div className="row gap12" style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
                  <Icon name="cpu" size={16} className="faint" />
                  <div className="grow"><div className="row gap8 wrap"><b style={{ fontSize: 13 }}>数据面 · API Key</b><span className="tag" style={{ height: 18, fontSize: 10 }}>视频生成</span>{creds?.['video']?.set ? <span className="pill" style={{ color: 'var(--st-done)', background: 'var(--st-done-bg)' }}><Icon name="check" size={11} />Key {creds['video'].hint}</span> : <span className="pill" style={{ color: 'var(--st-draft)', background: 'var(--st-draft-bg)' }}>未配置 Key · 走模拟</span>}</div><div className="faint" style={{ fontSize: 11, marginTop: 2 }}>调用 content_generation（Seedance / 即梦）· Authorization: Bearer</div></div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setCred({ plane: 'data' })}>{creds?.['video']?.set ? '更新' : '配置'}</button>
                </div>
                <div className="row gap12" style={{ padding: '12px 14px' }}>
                  <Icon name="lock" size={16} className="faint" />
                  <div className="grow"><div className="row gap8 wrap"><b style={{ fontSize: 13 }}>AI MediaKit · API Key</b><span className="tag" style={{ height: 18, fontSize: 10 }}>视频画质增强</span>{creds?.['cv']?.set ? <span className="pill" style={{ color: 'var(--st-done)', background: 'var(--st-done-bg)' }}><Icon name="check" size={11} />已配置 {creds['cv'].hint}</span> : <span className="pill" style={{ color: 'var(--st-draft)', background: 'var(--st-draft-bg)' }}>未配置 · 走模拟</span>}</div><div className="faint" style={{ fontSize: 11, marginTop: 2 }}>AI MediaKit · Authorization: Bearer（cn-beijing）</div></div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setCred({ plane: 'control' })}>{creds?.['cv']?.set ? '更新' : '配置'}</button>
                </div>
              </div>

              <div className="row" style={{ alignItems: 'center', marginTop: 4 }}>
                <div className="grow"><b style={{ fontSize: 14 }}>LLM 文案源（智能分镜）</b><div className="faint" style={{ fontSize: 11.5, marginTop: 2 }}>可接入多家并自由切换：ZenMux 聚合 / OpenAI · ChatGPT / Anthropic · Claude / DeepSeek / 自建端点</div></div>
                <button className="btn btn-soft btn-sm" onClick={() => setLlmModal('new')}><Icon name="plus" size={14} />添加 LLM 源</button>
              </div>
              {s.llm.providers.map((pr) => {
                const cs = creds?.[llmFamily(pr.id)];
                const isActive = pr.id === s.llm.activeId;
                return (
                  <div key={pr.id} className="card" style={{ padding: 14, borderColor: isActive ? 'var(--accent-line)' : undefined }}>
                    <div className="row gap12">
                      <span className="av" style={{ width: 34, height: 34, background: 'var(--surface-4)', color: 'var(--text-3)' }}><Icon name="cpu" size={16} /></span>
                      <div className="grow" style={{ minWidth: 0 }}><div className="row gap8 wrap"><b style={{ fontSize: 14 }}>{pr.name}</b><span className="tag" style={{ height: 18, fontSize: 10 }}>{pr.style === 'anthropic' ? 'Anthropic 原生' : 'OpenAI 兼容'}</span><span className="tag mono" style={{ height: 18, fontSize: 10, color: 'var(--accent-text)' }}>{pr.model}</span>{cs?.set ? <span className="pill" style={{ color: 'var(--st-done)', background: 'var(--st-done-bg)' }}><Icon name="check" size={11} />Key {cs.hint}</span> : <span className="pill" style={{ color: 'var(--st-draft)', background: 'var(--st-draft-bg)' }}>未配置 Key</span>}{isActive && <span className="pill" style={{ color: 'var(--accent-text)', background: 'var(--accent-soft)' }}>当前默认</span>}</div><div className="mono faint ellipsis" style={{ fontSize: 11, marginTop: 3 }}>{pr.baseUrl}</div></div>
                      {!isActive && <button className="btn btn-ghost btn-sm" onClick={() => settingsStore.setActiveLlm(pr.id)} title="设为默认">设为默认</button>}
                      <button className="btn btn-ghost btn-sm" onClick={() => setLlmModal(pr)}>配置</button>
                      <Menu align="end" trigger={<button className="icon-btn"><Icon name="more" size={16} /></button>}
                        items={[{ icon: 'edit', label: '编辑 / 设置 Key', onClick: () => setLlmModal(pr) }, { sep: true }, { icon: 'trash', label: '删除该源', danger: true, onClick: () => { if (s.llm.providers.length <= 1) { toast('至少保留一个 LLM 源', 'warn'); return; } if (window.confirm(`删除 LLM 源「${pr.name}」？`)) { settingsStore.removeLlmProvider(pr.id); toast('已删除 · ' + pr.name, 'trash'); } } }]} />
                    </div>
                  </div>
                );
              })}

              {(() => { const ttsCs = creds?.['tts']; return (
                <div className="card" style={{ padding: 14, marginTop: 4 }}>
                  <div className="row gap12">
                    <span className="av" style={{ width: 34, height: 34, background: 'var(--surface-4)', color: 'var(--text-3)' }}><Icon name="mic" size={16} /></span>
                    <div className="grow" style={{ minWidth: 0 }}><div className="row gap8 wrap"><b style={{ fontSize: 14 }}>TTS 配音</b><span className="tag" style={{ height: 19, fontSize: 10.5 }}>OpenAI 兼容 / 自建 / 第三方</span>{s.tts.model && <span className="tag mono" style={{ height: 18, fontSize: 10, color: 'var(--accent-text)' }}>{s.tts.model}</span>}{ttsCs?.set ? <span className="pill" style={{ color: 'var(--st-done)', background: 'var(--st-done-bg)' }}><Icon name="check" size={11} />Key {ttsCs.hint}</span> : <span className="pill" style={{ color: 'var(--st-draft)', background: 'var(--st-draft-bg)' }}>未配置 Key</span>}</div><div className="mono faint ellipsis" style={{ fontSize: 11, marginTop: 3 }}>{s.tts.baseUrl || '未设置 base_url'}</div></div>
                    <button className="btn btn-ghost btn-sm" onClick={() => setCred({ plane: 'data', tts: true, name: 'TTS 配音' })}>配置</button>
                  </div>
                </div>
              ); })()}

              <div className="row gap8" style={{ fontSize: 12, color: 'var(--text-2)', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 9 }}><Icon name="shield" size={15} className="acc" />每个源的 Key 独立加密落库；切换 / 改 Key / 改端点均在平台完成，<b>无需重新部署</b>。读写记入审计。</div>
            </>
          )}

          {sec === 'defaults' && (
            <>
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <div className="grow"><div style={{ fontWeight: 700, fontSize: 17 }}>默认生成参数</div><div className="muted" style={{ fontSize: 13, marginTop: 3 }}>新建镜头 / 打开生成抽屉时的默认值，可在镜头级覆盖。</div></div>
                <button className="btn btn-ghost btn-sm" onClick={() => { settingsStore.reset(); toast('已恢复默认设置', 'retry'); }}><Icon name="retry" size={13} />恢复默认</button>
              </div>
              <div className="card col gap14" style={{ padding: 16 }}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="muted" style={{ fontSize: 13 }}>默认视频模型</span>
                  <Menu align="end" trigger={<button className="tag" style={{ height: 28, cursor: 'pointer' }}>{defModel.label}<Icon name="chevDown" size={12} /></button>}
                    items={VIDEO_MODELS.map((m) => ({ icon: m.id === def.model ? 'check' : 'cpu', label: m.label, onClick: () => settingsStore.setDefaults({ model: m.id }) }))} />
                </div>
                <div className="hr" />
                <div className="col gap6"><span className="muted" style={{ fontSize: 13 }}>默认分辨率</span><div className="row gap6 wrap">{defModel.res.map((r) => <button key={r} className="tag" style={chip(def.resolution === r)} onClick={() => settingsStore.setDefaults({ resolution: r })}>{r}</button>)}</div></div>
                <div className="col gap6"><span className="muted" style={{ fontSize: 13 }}>默认画面比例</span><div className="row gap6 wrap">{['adaptive', ...defModel.ratios].map((r) => <button key={r} className="tag mono" style={chip(def.ratio === r)} onClick={() => settingsStore.setDefaults({ ratio: r })}>{r === 'adaptive' ? 'adaptive' : r}</button>)}</div></div>
                <div className="col gap6"><span className="muted" style={{ fontSize: 13 }}>默认时长</span><div className="row gap6 wrap">{DUR_OPTS.map((d) => <button key={d} className="tag" style={chip(def.duration === d)} onClick={() => settingsStore.setDefaults({ duration: d })}>{d === 'smart' ? '智能指定' : d + 's'}</button>)}</div></div>
                <div className="hr" />
                <div className="row" style={{ justifyContent: 'space-between' }}><span className="row gap8" style={{ fontSize: 13 }}><Icon name="mic" size={15} className="faint" />默认生成音频</span><Switch checked={def.generateAudio} onChange={(v) => settingsStore.setDefaults({ generateAudio: v })} /></div>
                <div className="row" style={{ justifyContent: 'space-between' }}><span className="row gap8" style={{ fontSize: 13 }}><Icon name="eye" size={15} className="faint" />默认水印</span><Switch checked={def.watermark} onChange={(v) => settingsStore.setDefaults({ watermark: v })} /></div>
              </div>
            </>
          )}

          {sec === 'storage' && (
            <>
              <div><div style={{ fontWeight: 700, fontSize: 17 }}>素材存储后端</div><div className="muted" style={{ fontSize: 13, marginTop: 3 }}>新上传素材的落地后端。可在 Cloudflare R2 与 火山 TOS 之间切换。</div></div>
              <div className="card col gap0" style={{ padding: 0, overflow: 'hidden' }}>
                {([['r2', 'Cloudflare R2', '默认 · 零出口费 · 与 Worker 同区', 'layers'], ['tos', '火山 TOS', '与火山生态同源 · 对象存储 Bucket', 'cpu']] as const).map(([k, name, desc, ic], i) => (
                  <div key={k} className="row gap12" style={{ padding: 14, borderBottom: i === 0 ? '1px solid var(--line)' : undefined, cursor: 'pointer', background: s.storage.backend === k ? 'var(--accent-soft)' : undefined }} onClick={() => { settingsStore.setStorage({ backend: k }); toast('存储后端 · ' + name, ic); }}>
                    <span className="center" style={{ width: 18, height: 18, borderRadius: '50%', flex: '0 0 auto', border: '2px solid ' + (s.storage.backend === k ? 'var(--accent)' : 'var(--line-3)') }}>{s.storage.backend === k && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />}</span>
                    <Icon name={ic} size={16} className="faint" />
                    <div className="grow"><b style={{ fontSize: 13.5 }}>{name}</b><div className="faint" style={{ fontSize: 11.5, marginTop: 2 }}>{desc}</div></div>
                    {s.storage.backend === k && <span className="pill" style={{ color: 'var(--st-done)', background: 'var(--st-done-bg)' }}><Icon name="check" size={11} />当前</span>}
                  </div>
                ))}
              </div>
              {s.storage.backend === 'tos' && (
                <div className="card col gap12" style={{ padding: 16 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>火山 TOS 配置</div>
                  <label><span className="lbl">Bucket 名称</span><input className="field" value={s.storage.tosBucket} onChange={(e) => settingsStore.setStorage({ tosBucket: e.target.value })} placeholder="如：manju-assets" /></label>
                  <label><span className="lbl">区域 Region</span><input className="field" value={s.storage.tosRegion} onChange={(e) => settingsStore.setStorage({ tosRegion: e.target.value })} placeholder="如：cn-beijing" /></label>
                  <div className="row gap8" style={{ fontSize: 11.5, color: 'var(--text-2)', padding: '9px 11px', background: 'var(--surface-2)', borderRadius: 9 }}><Icon name="shield" size={15} className="acc" /><span>TOS 上传走控制面 AK/SK 签名（在 Provider 凭据中配置），素材 URL 形如 <span className="mono">https://{s.storage.tosBucket}.tos-{s.storage.tosRegion}.volces.com/…</span></span></div>
                </div>
              )}
            </>
          )}

          {sec === 'billing' && (
            <>
              <div><div style={{ fontWeight: 700, fontSize: 17 }}>计费规则</div><div className="muted" style={{ fontSize: 13, marginTop: 3 }}>按模型配置单价规则，提交生成时据此预扣。火山 Seedance 参考价 ≈ ¥1/秒（1080p）。</div></div>

              <div className="card col gap12" style={{ padding: 16 }}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <div><div style={{ fontSize: 13.5, fontWeight: 600 }}>积分汇率</div><div className="faint" style={{ fontSize: 11.5, marginTop: 2 }}>钱包以积分计价 · 设定 1 元 = 多少积分</div></div>
                  <div className="row gap6" style={{ alignItems: 'center' }}>
                    <span className="faint" style={{ fontSize: 12 }}>1 元 =</span>
                    <input type="number" min={1} className="field mono" style={{ width: 84, textAlign: 'center' }} value={s.creditsPerYuan} onChange={(e) => settingsStore.setCreditsPerYuan(Number(e.target.value))} />
                    <span className="faint" style={{ fontSize: 12 }}>积分</span>
                  </div>
                </div>
              </div>

              {VIDEO_MODELS.map((m) => {
                const rule = ruleFor(s, m.id);
                const exRes = m.res.includes('1080p') ? '1080p' : m.res[m.res.length - 1];
                const exYuan = priceYuan(rule, 5, exRes, false);
                return (
                  <div key={m.id} className="card col gap12" style={{ padding: 16 }}>
                    <div className="row gap8" style={{ alignItems: 'center' }}>
                      <span className="av" style={{ width: 26, height: 26, fontSize: 11, background: 'linear-gradient(140deg,#e8623d,#d4542f)', color: '#fff' }}>火</span>
                      <div className="grow"><b style={{ fontSize: 14 }}>{m.label}</b><div className="mono faint" style={{ fontSize: 10.5 }}>{m.provider} · {m.id}</div></div>
                      <span className="tag" style={{ height: 22, color: 'var(--accent-text)' }}>示例 5s@{exRes} ≈ ¥{exYuan.toFixed(2)} · {yuanToCredits(s, exYuan)} 积分</span>
                    </div>
                    <div className="hr" />
                    <div className="row gap16 wrap">
                      <label className="col gap4"><span className="lbl">基准单价（元/秒 @1080p）</span><input type="number" step="0.1" min={0} className="field mono" style={{ width: 120 }} value={rule.yuanPerSecond} onChange={(e) => settingsStore.setRule(m.id, { yuanPerSecond: Number(e.target.value) })} /></label>
                      <label className="col gap4"><span className="lbl">生成音频加价（%）</span><input type="number" step="1" min={0} className="field mono" style={{ width: 120 }} value={Math.round(rule.audioSurcharge * 100)} onChange={(e) => settingsStore.setRule(m.id, { audioSurcharge: Number(e.target.value) / 100 })} /></label>
                    </div>
                    <div className="col gap6">
                      <span className="lbl">分辨率倍率</span>
                      <div className="row gap10 wrap">
                        {m.res.map((r) => (
                          <label key={r} className="row gap6" style={{ alignItems: 'center' }}>
                            <span className="mono faint" style={{ fontSize: 11.5, width: 44 }}>{r}</span>
                            <input type="number" step="0.1" min={0} className="field mono" style={{ width: 76, textAlign: 'center', padding: '6px 4px' }} value={rule.resMult[r] ?? 1} onChange={(e) => settingsStore.setResMult(m.id, r, Number(e.target.value))} />
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="row gap8" style={{ fontSize: 11.5, color: 'var(--text-2)', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 9 }}><Icon name="info" size={15} className="acc" />单镜头费用 = 单价 × 时长(秒) × 分辨率倍率 ×（含音频则 1+加价）。规则改动即时生效于生成抽屉报价与预扣。</div>
            </>
          )}

          {sec === 'deploy' && (
            <>
              <div><div style={{ fontWeight: 700, fontSize: 17 }}>一键部署到 Cloudflare</div><div className="muted" style={{ fontSize: 13, marginTop: 3 }}>Pages + Workers + D1 + R2 + KV + Queues + Cron，零自建服务器。</div></div>
              <div className="card" style={{ padding: 16 }}>
                <div className="row gap8 wrap">{['D1', 'R2', 'KV', 'Queues', 'Cron'].map((b) => <span key={b} className="tag" style={{ height: 26 }}><Icon name="check" size={12} className="acc" />{b}</span>)}</div>
                <div className="mono" style={{ marginTop: 14, padding: '12px 14px', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 9, fontSize: 12.5, color: 'var(--text-2)' }}><span className="faint">$</span> pnpm i && pnpm db:migrate && pnpm deploy</div>
                <button className="btn btn-pri" style={{ marginTop: 14 }}><Icon name="bolt" size={15} />Deploy to Cloudflare</button>
              </div>
            </>
          )}

          {sec === 'general' && (
            <>
              <div><div style={{ fontWeight: 700, fontSize: 17 }}>通用设置</div><div className="muted" style={{ fontSize: 13, marginTop: 3 }}>工作空间名称、外观主题、语言与时区。</div></div>
              <div className="card col gap14" style={{ padding: 16 }}>
                <label><span className="lbl">工作空间名称</span><input className="field" value={s.general.workspaceName} onChange={(e) => settingsStore.setGeneral({ workspaceName: e.target.value })} placeholder="如：青冥工作室" /></label>
                <div className="hr" />
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="muted" style={{ fontSize: 13 }}>界面主题</span>
                  <div className="seg">{[['dark', '深色'], ['light', '浅色']].map(([k, l]) => <button key={k} className={theme === k ? 'on' : ''} onClick={() => setTheme(k as 'dark' | 'light')}>{l}</button>)}</div>
                </div>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="muted" style={{ fontSize: 13 }}>强调色</span>
                  <div className="row gap8">{ACCENTS.map(([k, col]) => (
                    <button key={k} onClick={() => setAccent(k as never)} title={k} style={{ width: 26, height: 26, borderRadius: '50%', background: col, cursor: 'pointer', border: '2px solid ' + (accent === k ? 'var(--text)' : 'transparent'), boxShadow: accent === k ? '0 0 0 2px var(--bg) inset' : undefined }} />
                  ))}</div>
                </div>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="muted" style={{ fontSize: 13 }}>界面密度</span>
                  <div className="seg">{[['compact', '紧凑'], ['regular', '标准'], ['comfy', '宽松']].map(([k, l]) => <button key={k} className={density === k ? 'on' : ''} onClick={() => setDensity(k as never)}>{l}</button>)}</div>
                </div>
                <div className="hr" />
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="muted" style={{ fontSize: 13 }}>默认语言</span>
                  <Menu align="end" trigger={<button className="tag" style={{ height: 28, cursor: 'pointer' }}>{LOCALES.find(([k]) => k === s.general.locale)?.[1]}<Icon name="chevDown" size={12} /></button>}
                    items={LOCALES.map(([k, l]) => ({ icon: k === s.general.locale ? 'check' : 'type', label: l, onClick: () => settingsStore.setGeneral({ locale: k as 'zh-CN' | 'en-US' }) }))} />
                </div>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="muted" style={{ fontSize: 13 }}>时区</span>
                  <Menu align="end" trigger={<button className="tag mono" style={{ height: 28, cursor: 'pointer' }}>{s.general.timezone}<Icon name="chevDown" size={12} /></button>}
                    items={TIMEZONES.map((tz) => ({ icon: tz === s.general.timezone ? 'check' : 'clock', label: tz, onClick: () => settingsStore.setGeneral({ timezone: tz }) }))} />
                </div>
              </div>
              <div className="row gap8" style={{ fontSize: 11.5, color: 'var(--text-2)', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 9 }}><Icon name="info" size={15} className="acc" />主题 / 强调色 / 密度即时生效并本地保存；工作空间名称用于品牌展示。</div>
            </>
          )}
        </div>
      </div>

      <Modal open={!!cred} onClose={() => setCred(null)}>
        {cred && <CredentialBody cred={cred} onClose={() => setCred(null)} />}
      </Modal>
      <LlmProviderModal editing={llmModal} onClose={() => setLlmModal(null)} />
    </Screen>
  );
}
