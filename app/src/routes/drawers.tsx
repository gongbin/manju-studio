import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Drawer } from '@/ui/dialog';
import { Icon } from '@/ui/icon';
import { Menu } from '@/ui/menu';
import { Thumb, Avatar } from '@/ui/primitives';
import { Check, Progress } from '@/ui/controls';
import { toast } from '@/ui/toast';
import { api } from '@/lib/api';
import { fmt } from '@/lib/format';
import { models, characters, charOf, wallet as walletSeed } from '@/lib/mock';
import { useSettings, ruleFor, priceYuan, yuanToCredits } from '@/lib/settings';
import type { Shot, ShotRefs, TimeBeat } from '@/lib/types';

const yuan = (n: number) => '¥' + (n < 10 ? n.toFixed(2) : n.toFixed(1));

function ChipBtn({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return <button onClick={onClick} className="tag" style={{ height: 28, cursor: 'pointer', background: on ? 'var(--accent-soft)' : undefined, borderColor: on ? 'var(--accent-line)' : undefined, color: on ? 'var(--accent-text)' : undefined }}>{label}</button>;
}

function Toggle({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) {
  return (
    <div onClick={() => set(!on)} className="row gap6" style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap', fontSize: 12.5, padding: '6px 10px', borderRadius: 8, border: '1px solid ' + (on ? 'var(--accent-line)' : 'var(--line-2)'), background: on ? 'var(--accent-soft)' : 'transparent', color: on ? 'var(--accent-text)' : 'var(--text-2)' }}>
      <Check checked={on} onChange={set} />{label}
    </div>
  );
}

interface RefItem { label: string; url: string }
function RefZone({ icon, label, max, on, accept, multiple, items, setItems }: {
  icon: string; label: string; max: number; on: boolean; accept: string; multiple: boolean;
  items: RefItem[]; setItems: (v: RefItem[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const full = items.length >= max;
  const addFiles = async (fl: FileList | null) => {
    if (!fl) return;
    const files = Array.from(fl).slice(0, max - items.length);
    if (!files.length) return;
    setBusy(true);
    try {
      const uploaded: RefItem[] = [];
      for (const f of files) { const r = await api.uploadFile(f); uploaded.push({ label: f.name, url: r.url }); }
      setItems([...items, ...uploaded]);
    } catch (e) { toast('上传失败：' + (e instanceof Error ? e.message : e), 'warn'); }
    finally { setBusy(false); }
  };
  const addUrl = () => {
    const u = window.prompt(`粘贴 ${label} URL（需可公开访问的 https 链接）`);
    if (u && u.trim() && !full) setItems([...items, { label: u.trim(), url: u.trim() }]);
  };
  return (
    <div style={{ border: '1px dashed var(--line-2)', borderRadius: 10, padding: 9, opacity: on ? 1 : 0.45 }}>
      <input ref={inputRef} type="file" accept={accept} multiple={multiple} style={{ display: 'none' }} onChange={(e) => { void addFiles(e.target.files); e.target.value = ''; }} />
      <div className="center col gap3" style={{ color: 'var(--text-3)', padding: '4px 0 6px' }}>
        <Icon name={busy ? 'refresh' : icon} size={20} className={busy ? 'spin acc' : items.length ? 'acc' : ''} />
        <span style={{ fontSize: 11.5, color: 'var(--text-2)', fontWeight: 600 }}>{label}</span>
        <span className="faint" style={{ fontSize: 10 }}>{on ? `${items.length}/${max}` : `Max ${max} · 不支持`}</span>
      </div>
      {items.length > 0 && (
        <div className="col gap3" style={{ marginBottom: 6 }}>
          {items.map((it, i) => (
            <div key={i} className="row gap4" style={{ fontSize: 10, padding: '2px 5px', background: 'var(--surface-2)', borderRadius: 5 }}>
              <Icon name="check" size={10} className="acc" />
              <span className="grow ellipsis" title={it.url}>{it.label}</span>
              <button className="icon-btn" style={{ width: 16, height: 16 }} onClick={() => setItems(items.filter((_, x) => x !== i))}><Icon name="x" size={10} /></button>
            </div>
          ))}
        </div>
      )}
      <div className="row gap4">
        <button className="btn btn-soft" style={{ height: 24, fontSize: 11, flex: 1, padding: 0 }} disabled={!on || full || busy} onClick={() => inputRef.current?.click()}>{busy ? '上传中' : 'Upload'}</button>
        <button className="btn btn-ghost" style={{ height: 24, fontSize: 11, flex: 1, padding: 0 }} disabled={!on || full || busy} onClick={addUrl}>URL</button>
      </div>
    </div>
  );
}

type Buckets = { images: RefItem[]; videos: RefItem[]; audios: RefItem[] };
const emptyBuckets = (): Buckets => ({ images: [], videos: [], audios: [] });

export function GenerationDrawer({ shots, onClose }: { shots: Shot[]; onClose: () => void }) {
  const qc = useQueryClient();
  const s = useSettings();
  const { data: wallet = walletSeed } = useQuery({ queryKey: ['wallet'], queryFn: api.getWallet, initialData: walletSeed });
  const def = s.defaults;
  const initModel = models.find((m) => m.id === (shots[0]?.model ?? def.model)) || models[0];
  const [modelId, setModelId] = useState(shots[0]?.model ?? def.model);
  const model = models.find((m) => m.id === modelId) || models[0];
  const [res, setRes] = useState(initModel.res.includes(def.resolution) ? def.resolution : initModel.res.includes('480p') ? '480p' : initModel.res[0]);
  const [ratio, setRatio] = useState(def.ratio);
  const [dur, setDur] = useState<number | 'smart'>(def.duration);
  const [audio, setAudio] = useState(def.generateAudio);
  const [web, setWeb] = useState(false);
  const [wm, setWm] = useState(def.watermark);
  const [prompt, setPrompt] = useState(() => ({ ...shots[0]?.prompt }));
  const [beats, setBeats] = useState<TimeBeat[]>(() => (shots[0]?.beats ?? []).map((b) => ({ ...b })));
  const [refs, setRefs] = useState<Record<string, Buckets>>(() => Object.fromEntries(shots.map((sh) => [sh.id, emptyBuckets()])));
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(shots.length === 1 ? [shots[0].id] : []));

  const single = shots.length === 1;
  const rule = ruleFor(s, modelId);
  const durSec = (sh: Shot) => (dur === 'smart' ? sh.params.duration || 5 : Number(dur));
  const totalYuan = shots.reduce((a, sh) => a + priceYuan(rule, durSec(sh), res, !!audio), 0);
  const totalCredits = yuanToCredits(s, totalYuan);
  const durOpts: (number | 'smart')[] = ['smart', ...[3, 4, 5, 6, 8, 10, 12].filter((d) => d >= model.dur[0] && d <= model.dur[1])];

  const setBucket = (id: string, k: keyof Buckets, items: RefItem[]) => setRefs((r) => ({ ...r, [id]: { ...(r[id] ?? emptyBuckets()), [k]: items } }));
  const refCount = (id: string) => { const b = refs[id] ?? emptyBuckets(); return b.images.length + b.videos.length + b.audios.length; };
  const toggleExp = (id: string) => setExpanded((e) => { const n = new Set(e); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const refZones = (id: string) => {
    const b = refs[id] ?? emptyBuckets();
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <RefZone icon="image" label="Images" max={9} on={model.refImg} accept="image/*" multiple items={b.images} setItems={(v) => setBucket(id, 'images', v)} />
        <RefZone icon="film" label="Video" max={3} on={model.refVid} accept="video/*" multiple items={b.videos} setItems={(v) => setBucket(id, 'videos', v)} />
        <RefZone icon="mic" label="Audio" max={3} on={model.refAud} accept="audio/*" multiple items={b.audios} setItems={(v) => setBucket(id, 'audios', v)} />
      </div>
    );
  };

  const submit = async () => {
    const toUrls = (items: RefItem[]) => items.map((i) => i.url);
    const refsPayload: Record<string, ShotRefs> = {};
    for (const sh of shots) { const b = refs[sh.id] ?? emptyBuckets(); refsPayload[sh.id] = { images: toUrls(b.images), videos: toUrls(b.videos), audios: toUrls(b.audios) }; }
    for (const sh of shots) {
      const patch: Partial<Shot> = {
        params: { ...sh.params, resolution: res, ratio: ratio === 'adaptive' ? sh.params.ratio : ratio, generateAudio: !!audio, watermark: !!wm, ...(dur !== 'smart' ? { duration: Number(dur) } : {}) },
        refs: refsPayload[sh.id],
      };
      if (single) { patch.prompt = { ...prompt } as Shot['prompt']; patch.beats = beats; }
      await api.updateShot(sh.id, patch);
    }
    await api.submitGenerate(shots.map((sh) => sh.id), { model: modelId, resolution: res, ratio, duration: dur, generateAudio: !!audio, watermark: !!wm }, totalCredits, refsPayload);
    qc.invalidateQueries({ queryKey: ['shots'] });
    qc.invalidateQueries({ queryKey: ['tasks'] });
    qc.invalidateQueries({ queryKey: ['wallet'] });
    toast(`已分次提交 ${shots.length} 个生成任务 · 预扣 ${yuan(totalYuan)}（${fmt.credits(totalCredits)} 积分）`, 'sparkle');
    onClose();
  };

  const P = (k: keyof typeof prompt, v: string) => setPrompt((p) => ({ ...p, [k]: v }));

  return (
    <Drawer open onClose={onClose}>
      <div className="row gap10" style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
        <Icon name="sparkle" size={18} className="acc" />
        <div className="grow"><b style={{ fontSize: 15 }}>提交镜头生成</b><div className="faint" style={{ fontSize: 12 }}>{shots.length} 个镜头 · 基础参数共用 · 参考素材各镜头独立 · 逐条提交</div></div>
        <button className="icon-btn" onClick={onClose}><Icon name="x" size={18} /></button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 18 }} className="col gap20">
        {single && (
          <div>
            <div className="row gap8" style={{ marginBottom: 10 }}><Icon name="film" size={15} className="acc" /><b style={{ fontSize: 13.5 }}>镜头 #{fmt.pad2(shots[0].index)} · 提示词</b></div>
            <div className="col gap12">
              <div><div className="lbl">画面提示词 Visual <span style={{ color: 'var(--st-failed)' }}>*</span></div><textarea className="field" rows={3} value={prompt.visual} onChange={(e) => P('visual', e.target.value)} placeholder="描述视频的主要画面内容…" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><div className="lbl">对话 Dialogue</div><textarea className="field" rows={2} value={prompt.dialogue} onChange={(e) => P('dialogue', e.target.value)} placeholder="人物对话…" /></div>
                <div><div className="lbl">旁白 Voiceover</div><textarea className="field" rows={2} value={prompt.voiceover} onChange={(e) => P('voiceover', e.target.value)} placeholder="背景旁白…" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div><div className="lbl">音效 SFX</div><input className="field" value={prompt.soundEffects} onChange={(e) => P('soundEffects', e.target.value)} /></div>
                <div><div className="lbl">机位 Camera</div><input className="field" value={prompt.cameraPosition} onChange={(e) => P('cameraPosition', e.target.value)} /></div>
                <div><div className="lbl">运镜 Movement</div><input className="field" value={prompt.cameraMovement} onChange={(e) => P('cameraMovement', e.target.value)} /></div>
              </div>

              <div>
                <div className="row gap8" style={{ marginBottom: 4 }}>
                  <Icon name="clock" size={14} className="acc" />
                  <b style={{ fontSize: 12.5 }}>时长结构 · 镜头节拍 Beats</b>
                  <span className="grow" />
                  <span className="faint mono" style={{ fontSize: 10.5 }}>{beats.length ? `共 ${beats.length} 段 · ${beats.reduce((a, b) => Math.max(a, b.to), 0)}s` : '可选'}</span>
                </div>
                <div className="faint" style={{ fontSize: 11, marginBottom: 8 }}>按时间切分镜头动作（如 5s–9s …），精准控制镜头内的长度与节奏</div>
                <div className="col gap6">
                  {beats.map((b, i) => (
                    <div key={i} className="row gap6" style={{ alignItems: 'center' }}>
                      <input type="number" min={0} className="field mono" style={{ width: 52, textAlign: 'center', padding: '6px 4px' }} value={b.from} onChange={(e) => setBeats(beats.map((x, j) => (j === i ? { ...x, from: Number(e.target.value) } : x)))} />
                      <span className="faint" style={{ fontSize: 11 }}>s –</span>
                      <input type="number" min={0} className="field mono" style={{ width: 52, textAlign: 'center', padding: '6px 4px' }} value={b.to} onChange={(e) => setBeats(beats.map((x, j) => (j === i ? { ...x, to: Number(e.target.value) } : x)))} />
                      <span className="faint" style={{ fontSize: 11 }}>s</span>
                      <input className="field grow" style={{ padding: '6px 8px' }} placeholder="该时间段的画面动作…" value={b.action} onChange={(e) => setBeats(beats.map((x, j) => (j === i ? { ...x, action: e.target.value } : x)))} />
                      <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => setBeats(beats.filter((_, j) => j !== i))}><Icon name="x" size={14} /></button>
                    </div>
                  ))}
                  <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => { const last = beats[beats.length - 1]; const from = last ? last.to : 0; setBeats([...beats, { from, to: from + 2, action: '' }]); }}><Icon name="plus" size={13} />添加节拍</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div>
          <div className="lbl">视频模型 · Provider</div>
          <Menu align="start" trigger={
            <button className="field row gap8" style={{ justifyContent: 'flex-start', cursor: 'pointer' }}>
              <span className="av" style={{ width: 20, height: 20, fontSize: 9, background: 'linear-gradient(140deg,#e8623d,#d4542f)' }}>火</span>
              <span className="grow" style={{ textAlign: 'left' }}>{model.label}</span>
              <span className="faint mono" style={{ fontSize: 11 }}>{model.provider}</span><Icon name="chevDown" size={14} />
            </button>
          } items={models.filter((m) => m.caps.includes('image-to-video') || m.caps.includes('text-to-video')).map((m) => ({ icon: m.id === modelId ? 'check' : 'cpu', label: m.label, onClick: () => setModelId(m.id) }))} />
        </div>

        <div>
          <div className="row gap8" style={{ marginBottom: 12 }}><Icon name="settings" size={15} className="acc" /><b style={{ fontSize: 13.5 }}>基础参数 · 全部镜头共用</b></div>
          <div className="col gap14">
            <div><div className="lbl">分辨率 Resolution</div><div className="row gap6 wrap">{model.res.map((r) => <ChipBtn key={r} on={res === r} label={r} onClick={() => setRes(r)} />)}</div></div>
            <div><div className="lbl">画面比例 Ratio</div><div className="row gap6 wrap">{['adaptive', ...model.ratios].map((r) => <ChipBtn key={r} on={ratio === r} label={r === 'adaptive' ? 'adaptive · 智能匹配' : r} onClick={() => setRatio(r)} />)}</div></div>
            {model.dur[1] > 0 && <div><div className="lbl">时长 Duration</div><div className="row gap6 wrap">{durOpts.map((d) => <ChipBtn key={d} on={dur === d} label={d === 'smart' ? '智能指定 · 按镜头时长' : d + 's'} onClick={() => setDur(d)} />)}</div></div>}
            <div className="row gap8 wrap" style={{ paddingTop: 2 }}>
              <Toggle on={web} set={setWeb} label="Web Search 联网检索" />
              {model.audio && <Toggle on={audio} set={setAudio} label="Generate Audio 生成音频" />}
              <Toggle on={wm} set={setWm} label="Add Watermark 水印" />
            </div>
          </div>
        </div>

        <div>
          <div className="row gap8" style={{ marginBottom: 3 }}><Icon name="image" size={15} className="acc" /><b style={{ fontSize: 13.5 }}>参考素材 Reference · 各镜头独立</b></div>
          <div className="faint" style={{ fontSize: 11.5, marginBottom: 10 }}>注入为 reference_image / video / audio，提升一致性与运镜还原 · 受模型数量上限约束 · {single ? '此镜头单独上传' : '每个镜头分别上传，逐条提交'}</div>
          {single ? (
            refZones(shots[0].id)
          ) : (
            <div className="col gap6">
              {shots.map((sh) => (
                <div key={sh.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <button className="row gap8" style={{ width: '100%', padding: '8px 10px', cursor: 'pointer', background: 'transparent', textAlign: 'left', border: 'none' }} onClick={() => toggleExp(sh.id)}>
                    <Thumb w={40} h={24} tone={sh.tone} label="" />
                    <span className="mono faint" style={{ fontSize: 11 }}>#{fmt.pad2(sh.index)}</span>
                    <span className="grow ellipsis" style={{ fontSize: 12 }}>{sh.prompt.visual}</span>
                    {refCount(sh.id) > 0 && <span className="tag" style={{ height: 18, fontSize: 10, color: 'var(--accent-text)' }}>{refCount(sh.id)} 素材</span>}
                    <span className="mono faint" style={{ fontSize: 11 }}>{durSec(sh)}s</span>
                    <Icon name={expanded.has(sh.id) ? 'chevDown' : 'chevRight'} size={14} className="faint" />
                  </button>
                  {expanded.has(sh.id) && <div style={{ padding: '0 10px 10px' }}>{refZones(sh.id)}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {model.charAsset && (
          <div>
            <div className="row gap8" style={{ marginBottom: 3 }}><Icon name="users" size={15} className="acc" /><b style={{ fontSize: 13.5 }}>公共人像 / 角色一致性</b></div>
            <div className="faint" style={{ fontSize: 11.5, marginBottom: 10 }}>角色 asset:// 资产自动注入为 reference_image</div>
            <div className="col gap6">
              {[...new Set(shots.flatMap((s) => s.chars))].map(charOf).filter((c): c is NonNullable<typeof c> => !!c && !!c.asset).map((c) => (
                <div key={c.id} className="row gap8" style={{ padding: '6px 8px', background: 'var(--surface-2)', borderRadius: 8, fontSize: 12 }}>
                  <Avatar name={c.name} size={20} /><b>{c.name}</b><span className="grow ellipsis mono faint" style={{ fontSize: 10.5 }}>{c.asset}</span>
                </div>
              ))}
              {characters.filter((c) => shots.flatMap((s) => s.chars).includes(c.id) && c.asset).length === 0 && <div className="faint" style={{ fontSize: 12 }}>所选镜头暂无角色一致性资产</div>}
            </div>
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--line)', padding: 16 }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <div><div className="faint" style={{ fontSize: 12 }}>预扣 · {shots.length} 镜头 · {rule.yuanPerSecond}元/秒 @{res}</div><div className="row gap6" style={{ alignItems: 'baseline' }}><span className="mono acc" style={{ fontSize: 22, fontWeight: 700 }}>{yuan(totalYuan)}</span><span className="faint" style={{ fontSize: 12 }}>≈ {fmt.credits(totalCredits)} 积分</span></div></div>
          <div style={{ textAlign: 'right', fontSize: 12 }}><div className="faint">钱包余额</div><div className="mono" style={{ fontWeight: 600 }}>{fmt.credits(wallet.balance)} 积分</div></div>
        </div>
        <div className="row gap8">
          <button className="btn btn-ghost grow" onClick={onClose}>取消</button>
          <button className="btn btn-pri grow" onClick={submit}><Icon name="sparkle" size={16} />逐条提交 · {yuan(totalYuan)}</button>
        </div>
      </div>
    </Drawer>
  );
}

const ENH_TYPES = [
  { id: 'standard', label: '标准版', en: 'standard', desc: '快速基础增强 · 去噪与锐化', mult: 1 },
  { id: 'professional', label: '专业版', en: 'professional', desc: '更强细节恢复与色彩还原', mult: 1.5 },
  { id: 'ai-model', label: '大模型', en: 'ai-model', desc: '最佳画质 · 重绘细节 · 耗时较长', mult: 2.4 },
];
const ENH_RES_MULT: Record<string, number> = { '720p': 1, '1080p': 1.6, '2K': 2.6, '4K': 4 };

export function EnhanceDrawer({ shot, onClose }: { shot: Shot; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: wallet = walletSeed } = useQuery({ queryKey: ['wallet'], queryFn: api.getWallet, initialData: walletSeed });
  const enh = shot.enhance;
  const [type, setType] = useState(enh?.type ?? 'professional');
  const [res, setRes] = useState(enh?.res ?? '2K');
  const tMult = ENH_TYPES.find((t) => t.id === type)?.mult || 1;
  const cost = Math.round(80 * ENH_RES_MULT[res] * tMult);
  const busy = enh && (enh.status === 'queued' || enh.status === 'processing');
  const done = enh && enh.status === 'succeeded';

  const submit = async () => {
    await api.submitEnhance(shot.id, { type, res }, cost);
    qc.invalidateQueries({ queryKey: ['shots'] });
    qc.invalidateQueries({ queryKey: ['tasks'] });
    qc.invalidateQueries({ queryKey: ['wallet'] });
    toast(`已提交视频增强 · ${res} ${type} · 预扣 ${cost} 积分`, 'bolt');
    onClose();
  };

  return (
    <Drawer open onClose={onClose}>
      <div className="row gap10" style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
        <Icon name="bolt" size={18} className="acc" />
        <div className="grow"><b style={{ fontSize: 15 }}>视频画质增强</b><div className="faint" style={{ fontSize: 12 }}>火山 CV MediaKit · SubmitVideoEnhanceTask · 走控制面 AK/SK</div></div>
        <button className="icon-btn" onClick={onClose}><Icon name="x" size={18} /></button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 18 }} className="col gap20">
        <div>
          <div className="lbl">源镜头</div>
          <div className="row gap10" style={{ padding: 8, background: 'var(--surface-2)', borderRadius: 10 }}>
            <Thumb w={84} h={48} tone={shot.tone} label="原片" playable />
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="row gap8"><span className="mono faint" style={{ fontSize: 11 }}>#{fmt.pad2(shot.index)}</span><span className="mono faint" style={{ fontSize: 11 }}>{shot.params.resolution} · {shot.params.ratio}</span></div>
              <div className="ellipsis" style={{ fontSize: 12.5, marginTop: 3 }}>{shot.prompt.visual}</div>
            </div>
          </div>
        </div>

        {busy && (
          <div className="card" style={{ padding: 12, borderColor: 'var(--accent-line)', background: 'var(--accent-soft)' }}>
            <div className="row gap8" style={{ fontSize: 13 }}><Icon name="refresh" size={15} className="spin acc" /><b>{enh!.status === 'queued' ? '排队中…' : '增强处理中…'}</b><span className="grow" /><span className="mono acc">{enh!.progress || 0}%</span></div>
            <div style={{ marginTop: 8 }}><Progress value={enh!.progress || 0} amber /></div>
          </div>
        )}

        {done && enh!.videoUrl && (
          <div className="card" style={{ padding: 12, borderColor: 'var(--st-done)', background: 'var(--st-done-bg)' }}>
            <div className="row gap8" style={{ fontSize: 13 }}><span style={{ color: 'var(--st-done)', display: 'inline-flex' }}><Icon name="check" size={15} /></span><b>增强完成 · {enh!.res}</b><span className="grow" /><button className="btn btn-soft btn-sm" onClick={() => window.open(enh!.videoUrl, '_blank')}><Icon name="download" size={13} />下载增强视频</button></div>
            <div className="mono faint ellipsis" style={{ fontSize: 10.5, marginTop: 6 }} title={enh!.videoUrl}>{enh!.videoUrl}</div>
          </div>
        )}

        {enh?.status === 'failed' && (
          <div className="card" style={{ padding: 12, borderColor: 'var(--st-failed)', background: 'var(--st-failed-bg)' }}>
            <div className="row gap8" style={{ fontSize: 13, color: 'var(--st-failed)' }}><Icon name="warn" size={15} /><b>增强失败</b></div>
            <div className="faint" style={{ fontSize: 11.5, marginTop: 4 }}>{enh.error || '请检查源视频是否为可公开访问的 URL，以及控制面 AK/SK 是否正确。'}</div>
          </div>
        )}

        <div>
          <div className="lbl">增强类型 Enhance Type</div>
          <div className="col gap8">
            {ENH_TYPES.map((t) => (
              <div key={t.id} onClick={() => setType(t.id)} className="row gap10" style={{ cursor: 'pointer', padding: '10px 12px', borderRadius: 10, border: '1px solid ' + (type === t.id ? 'var(--accent-line)' : 'var(--line-2)'), background: type === t.id ? 'var(--accent-soft)' : 'transparent' }}>
                <span className="center" style={{ width: 18, height: 18, borderRadius: '50%', flex: '0 0 auto', border: '2px solid ' + (type === t.id ? 'var(--accent)' : 'var(--line-3)') }}>{type === t.id && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />}</span>
                <div className="grow"><div className="row gap6"><b style={{ fontSize: 13 }}>{t.label}</b><span className="mono faint" style={{ fontSize: 10.5 }}>{t.en}</span>{t.id === 'ai-model' && <span className="tag" style={{ height: 17, fontSize: 9.5, color: 'var(--accent-text)' }}>推荐</span>}</div><div className="faint" style={{ fontSize: 11.5, marginTop: 1 }}>{t.desc}</div></div>
                <span className="mono faint" style={{ fontSize: 11 }}>×{t.mult}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="lbl">目标分辨率 Target Resolution</div>
          <div className="row gap6 wrap">{['720p', '1080p', '2K', '4K'].map((r) => <button key={r} onClick={() => setRes(r)} className="tag" style={{ height: 30, padding: '0 14px', cursor: 'pointer', background: res === r ? 'var(--accent-soft)' : undefined, borderColor: res === r ? 'var(--accent-line)' : undefined, color: res === r ? 'var(--accent-text)' : undefined }}>{r}</button>)}</div>
        </div>

        <div className="row gap8" style={{ fontSize: 11.5, color: 'var(--text-2)', padding: '9px 11px', background: 'var(--surface-2)', borderRadius: 9 }}><Icon name="shield" size={16} className="acc" /><span>调用控制面 AK/SK（CV MediaKit，HMAC-SHA256 v4 签名）。视频须为可公开访问 URL。</span></div>
      </div>

      <div style={{ borderTop: '1px solid var(--line)', padding: 16 }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <div><div className="faint" style={{ fontSize: 12 }}>预扣积分 · {res} × {ENH_TYPES.find((t) => t.id === type)?.label}</div><div className="row gap6" style={{ alignItems: 'baseline' }}><span className="mono acc" style={{ fontSize: 22, fontWeight: 700 }}>{fmt.credits(cost)}</span><span className="faint" style={{ fontSize: 12 }}>积分</span></div></div>
          <div style={{ textAlign: 'right', fontSize: 12 }}><div className="faint">钱包余额</div><div className="mono" style={{ fontWeight: 600 }}>{fmt.credits(wallet.balance)}</div></div>
        </div>
        <div className="row gap8">
          <button className="btn btn-ghost grow" onClick={onClose}>{done ? '关闭' : '取消'}</button>
          <button className="btn btn-pri grow" disabled={!!busy} onClick={submit}><Icon name={busy ? 'refresh' : done ? 'retry' : 'bolt'} size={16} className={busy ? 'spin' : ''} />{busy ? '增强中…' : done ? '重新增强' : '提交增强 · 预扣 ' + fmt.credits(cost)}</button>
        </div>
      </div>
    </Drawer>
  );
}
