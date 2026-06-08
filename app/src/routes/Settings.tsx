import { useState } from 'react';
import { Screen, Crumb } from '@/app/Shell';
import { Icon } from '@/ui/icon';
import { Switch } from '@/ui/controls';
import { Modal } from '@/ui/dialog';
import { Empty } from '@/ui/primitives';
import { toast } from '@/ui/toast';

type Sec = 'general' | 'providers' | 'defaults' | 'billing' | 'deploy';
const SECS: [Sec, string, string][] = [
  ['general', '通用', 'settings'], ['providers', 'Provider 凭据', 'lock'],
  ['defaults', '默认生成参数', 'film'], ['billing', '计费规则', 'coins'], ['deploy', '部署', 'bolt'],
];

interface CredModal { plane: 'data' | 'control'; name?: string }

export function Settings() {
  const [sec, setSec] = useState<Sec>('providers');
  const [cred, setCred] = useState<CredModal | null>(null);

  return (
    <Screen crumb={<Crumb parts={[{ label: '工作空间设置' }]} />}>
      <div className="page" style={{ display: 'grid', gridTemplateColumns: '190px 1fr', gap: 26, maxWidth: 1100 }}>
        <div className="col gap2" style={{ position: 'sticky', top: 0, alignSelf: 'start' }}>
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
                  <div className="grow"><div className="row gap8"><b style={{ fontSize: 14 }}>火山方舟 Volcengine</b><span className="tag" style={{ height: 19, fontSize: 10.5 }}>视频 · LLM · TTS</span></div><div className="mono faint" style={{ fontSize: 11, marginTop: 3 }}>volcengine · 双凭据平面（数据面 API Key + 控制面 AK/SK）</div></div>
                  <span className="pill" style={{ color: 'var(--st-done)', background: 'var(--st-done-bg)' }}><Icon name="check" size={11} />已启用</span>
                </div>
                <div className="row gap12" style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
                  <Icon name="cpu" size={16} className="faint" />
                  <div className="grow"><div className="row gap8"><b style={{ fontSize: 13 }}>数据面 · API Key</b><span className="tag" style={{ height: 18, fontSize: 10 }}>视频 / 文生图 / LLM / TTS</span></div><div className="faint" style={{ fontSize: 11, marginTop: 2 }}>调用 content_generation（Seedance / 即梦）· Authorization: Bearer</div><div className="mono" style={{ fontSize: 11, marginTop: 4 }}>APIKey ••••••••••••3a91 <span className="faint">(已加密)</span></div></div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setCred({ plane: 'data' })}>更新</button>
                </div>
                <div className="row gap12" style={{ padding: '12px 14px' }}>
                  <Icon name="lock" size={16} className="faint" />
                  <div className="grow"><div className="row gap8"><b style={{ fontSize: 13 }}>控制面 · AK / SK</b><span className="tag" style={{ height: 18, fontSize: 10 }}>视频增强 / 资源管理</span></div><div className="faint" style={{ fontSize: 11, marginTop: 2 }}>CV MediaKit 等控制面 API · HMAC-SHA256 v4 签名</div><div className="mono" style={{ fontSize: 11, marginTop: 4 }}>AK AKLT••••7f3a · SK •••••••••••• <span className="faint">(已加密)</span></div></div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setCred({ plane: 'control' })}>更新</button>
                </div>
              </div>

              {[{ fam: 'LLM 文案', name: 'Anthropic · Claude', prov: 'anthropic' }, { fam: 'TTS 配音', name: 'OpenAI 兼容 · 自建 TTS', prov: 'openai-compatible' }].map((c, i) => (
                <div key={i} className="card" style={{ padding: 14 }}>
                  <div className="row gap12">
                    <span className="av" style={{ width: 34, height: 34, background: 'var(--surface-4)', color: 'var(--text-3)' }}><Icon name="cpu" size={16} /></span>
                    <div className="grow"><div className="row gap8"><b style={{ fontSize: 14 }}>{c.name}</b><span className="tag" style={{ height: 19, fontSize: 10.5 }}>{c.fam}</span></div><div className="mono faint" style={{ fontSize: 11, marginTop: 3 }}>{c.prov} · 单 API Key · 未配置</div></div>
                    <button className="btn btn-ghost btn-sm" onClick={() => setCred({ plane: 'data', name: c.name })}>配置</button>
                  </div>
                </div>
              ))}
              <div className="row gap8" style={{ fontSize: 12, color: 'var(--text-2)', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 9 }}><Icon name="shield" size={15} className="acc" />凭据读写均记入审计日志。运行时仅在 Provider 调用瞬间于内存解密。</div>
            </>
          )}

          {sec === 'defaults' && (
            <>
              <div><div style={{ fontWeight: 700, fontSize: 17 }}>默认生成参数</div><div className="muted" style={{ fontSize: 13, marginTop: 3 }}>新建镜头时的默认值，可在镜头级覆盖。</div></div>
              <div className="card col gap14" style={{ padding: 16 }}>
                {[['默认视频模型', 'Seedance 2.0'], ['默认分辨率', '1080p'], ['默认比例', '16:9'], ['默认时长', '5s']].map(([k, v]) => (
                  <div key={k} className="row" style={{ justifyContent: 'space-between' }}><span className="muted" style={{ fontSize: 13 }}>{k}</span><button className="tag" style={{ height: 28 }}>{v}<Icon name="chevDown" size={12} /></button></div>
                ))}
                <div className="hr" />
                <div className="row" style={{ justifyContent: 'space-between' }}><span className="row gap8" style={{ fontSize: 13 }}><Icon name="mic" size={15} className="faint" />默认生成音频</span><Switch checked onChange={() => {}} /></div>
                <div className="row" style={{ justifyContent: 'space-between' }}><span className="row gap8" style={{ fontSize: 13 }}><Icon name="eye" size={15} className="faint" />默认水印</span><Switch checked={false} onChange={() => {}} /></div>
              </div>
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

          {(sec === 'general' || sec === 'billing') && (
            <Empty icon={sec === 'billing' ? 'coins' : 'settings'} title={sec === 'billing' ? '计费规则配置' : '通用设置'} sub="品牌、计费倍率与配额规则在此配置（演示中略）。" />
          )}
        </div>
      </div>

      <Modal open={!!cred} onClose={() => setCred(null)}>
        {cred && (
          <div style={{ width: 'min(440px, 94vw)' }}>
            <div className="row gap10" style={{ padding: '16px 18px', borderBottom: '1px solid var(--line)' }}>
              <Icon name={cred.plane === 'data' ? 'cpu' : 'lock'} size={18} className="acc" />
              <div className="grow"><b style={{ fontSize: 15 }}>{cred.name || (cred.plane === 'data' ? '数据面 · API Key' : '控制面 · AK / SK')}</b><div className="faint" style={{ fontSize: 12 }}>{cred.name ? '配置 Provider 凭据' : '火山方舟 · ' + (cred.plane === 'data' ? 'content_generation 视频生成' : 'CV MediaKit 控制面签名')}</div></div>
              <button className="icon-btn" onClick={() => setCred(null)}><Icon name="x" size={18} /></button>
            </div>
            <div style={{ padding: 18 }} className="col gap14">
              {cred.plane === 'data' ? (
                <label><span className="lbl">API Key（数据面）</span>
                  <div className="search" style={{ height: 38 }}><Icon name="lock" size={15} className="faint" /><input type="password" defaultValue="ak-volc-7f3a91d2c4b8e6f0" placeholder="粘贴 APIKey" /></div></label>
              ) : (
                <>
                  <label><span className="lbl">Access Key ID（AK）</span><div className="search" style={{ height: 38 }}><Icon name="users" size={15} className="faint" /><input defaultValue="AKLTN2QwM2I5N2f3a" /></div></label>
                  <label><span className="lbl">Secret Access Key（SK）</span><div className="search" style={{ height: 38 }}><Icon name="lock" size={15} className="faint" /><input type="password" defaultValue="N2EwYzhkZmM5MWI2ZTRkMA==" /></div></label>
                  <label><span className="lbl">区域 Region（可选）</span><input className="field" defaultValue="cn-beijing" /></label>
                </>
              )}
              <div className="row gap8" style={{ fontSize: 11.5, color: 'var(--text-2)', padding: '9px 11px', background: 'var(--surface-2)', borderRadius: 9 }}><Icon name="shield" size={16} className="acc" /><span>提交后经 AES-GCM 加密落库，仅 Owner / Admin 可写，调用瞬间于服务端内存解密，<b>前端永不回明文</b>。</span></div>
            </div>
            <div className="row gap8" style={{ padding: 16, borderTop: '1px solid var(--line)' }}>
              <button className="btn btn-ghost grow" onClick={() => setCred(null)}>取消</button>
              <button className="btn btn-pri grow" onClick={() => { setCred(null); toast('凭据已加密保存', 'lock'); }}><Icon name="check" size={15} />加密保存</button>
            </div>
          </div>
        )}
      </Modal>
    </Screen>
  );
}
