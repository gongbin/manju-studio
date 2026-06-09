import { useState } from 'react';
import { Screen, Crumb } from '@/app/Shell';
import { Icon } from '@/ui/icon';
import { Menu } from '@/ui/menu';
import { Switch } from '@/ui/controls';
import { Modal } from '@/ui/dialog';
import { Empty } from '@/ui/primitives';
import { toast } from '@/ui/toast';
import { models } from '@/lib/mock';
import { useSettings, settingsStore, ruleFor, priceYuan, yuanToCredits } from '@/lib/settings';

type Sec = 'general' | 'providers' | 'defaults' | 'storage' | 'billing' | 'deploy';
const SECS: [Sec, string, string][] = [
  ['general', '通用', 'settings'], ['providers', 'Provider 凭据', 'lock'],
  ['defaults', '默认生成参数', 'film'], ['storage', '素材存储', 'layers'], ['billing', '计费规则', 'coins'], ['deploy', '部署', 'bolt'],
];

interface CredModal { plane: 'data' | 'control'; name?: string }

function chip(on: boolean) {
  return { height: 28, cursor: 'pointer', background: on ? 'var(--accent-soft)' : undefined, borderColor: on ? 'var(--accent-line)' : undefined, color: on ? 'var(--accent-text)' : undefined } as const;
}
const VIDEO_MODELS = models.filter((m) => m.caps.includes('image-to-video') || m.caps.includes('text-to-video'));

export function Settings() {
  const [sec, setSec] = useState<Sec>('providers');
  const [cred, setCred] = useState<CredModal | null>(null);
  const s = useSettings();
  const def = s.defaults;
  const defModel = models.find((m) => m.id === def.model) || models[0];
  const DUR_OPTS: (number | 'smart')[] = ['smart', ...[3, 4, 5, 6, 8, 10, 12].filter((d) => d >= defModel.dur[0] && d <= defModel.dur[1])];

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
            <Empty icon="settings" title="通用设置" sub="品牌、空间名称、语言与时区等在此配置（演示中略）。" />
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
