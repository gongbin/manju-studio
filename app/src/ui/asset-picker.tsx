import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '@/ui/dialog';
import { Icon } from '@/ui/icon';
import { Thumb } from '@/ui/primitives';
import { api } from '@/lib/api';
import { assets as assetSeed } from '@/lib/mock';
import type { Asset } from '@/lib/types';

export interface PickedItem { label: string; url: string }

const KIND_LABEL: Record<Asset['kind'], string> = { image: 'IMG', video: 'VIDEO', audio: 'AUDIO' };

/** Thumbnail tile — real <img> for images (fallback to Thumb), Thumb/icon otherwise. */
function AssetTile({ a, selected, onClick }: { a: Asset; selected: boolean; onClick: () => void }) {
  const [imgOk, setImgOk] = useState(true);
  const showImg = a.kind === 'image' && !!a.url && imgOk;
  return (
    <button onClick={onClick} className="card" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', position: 'relative', border: '2px solid ' + (selected ? 'var(--accent)' : 'var(--line)'), background: 'transparent', textAlign: 'left' }}>
      <div style={{ position: 'relative', height: 90 }}>
        {showImg
          ? <img src={a.url} alt={a.name} onError={() => setImgOk(false)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <Thumb w="100%" h={90} tone={a.tone} rounded={0} label={KIND_LABEL[a.kind] + ' ' + a.name.replace(/^[A-Z]+_/, '')} playable={a.kind === 'video'} />}
        {a.kind === 'audio' && !showImg && <div className="center" style={{ position: 'absolute', inset: 0 }}><Icon name="mic" size={22} className="faint" /></div>}
        {selected && <span className="center" style={{ position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', color: '#fff' }}><Icon name="check" size={13} /></span>}
      </div>
      <div className="ellipsis" style={{ fontSize: 11, padding: '5px 7px' }} title={a.name}>{a.name}</div>
    </button>
  );
}

/**
 * 从素材库选择已有素材引用到 Reference / 角色参考图。
 * - kind: 过滤素材类型；max: 最多还能再选几个；existingUrls: 已引用的（置灰排除）。
 * - multiple=false 时单选即确认。
 */
export function AssetPicker({ kind, max = 99, existingUrls = [], multiple = true, onPick, onClose }: {
  kind: Asset['kind']; max?: number; existingUrls?: string[]; multiple?: boolean;
  onPick: (items: PickedItem[]) => void; onClose: () => void;
}) {
  const { data: assets = [] } = useQuery({ queryKey: ['assets'], queryFn: api.listAssets, initialData: assetSeed });
  const have = new Set(existingUrls);
  const list = assets.filter((a) => a.kind === kind && !!a.url && !have.has(a.url!));
  const [sel, setSel] = useState<Set<string>>(new Set());
  const KIND_CN = { image: '图片', video: '视频', audio: '音频' }[kind];

  const pick = (items: PickedItem[]) => { onPick(items.slice(0, max)); onClose(); };
  const toggle = (a: Asset) => {
    if (!multiple) { pick([{ label: a.name, url: a.url! }]); return; }
    setSel((s) => {
      const n = new Set(s);
      if (n.has(a.id)) n.delete(a.id);
      else if (n.size < max) n.add(a.id);
      return n;
    });
  };
  const confirm = () => pick(list.filter((a) => sel.has(a.id)).map((a) => ({ label: a.name, url: a.url! })));

  return (
    <Modal open onClose={onClose}>
      <div style={{ width: 'min(680px, 94vw)', display: 'flex', flexDirection: 'column', maxHeight: '82vh' }}>
        <div className="row gap10" style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
          <span className="center" style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent-text)' }}><Icon name="image" size={17} /></span>
          <div className="grow"><b style={{ fontSize: 15 }}>从素材库选择 · {KIND_CN}</b><div className="faint" style={{ fontSize: 12 }}>{multiple ? `可多选 · 最多再选 ${max} 个` : '单选'} · 复用已上传素材，无需重复上传</div></div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {list.length === 0
            ? <div className="center faint" style={{ padding: '48px 0', fontSize: 13 }}>素材库暂无可选{KIND_CN}，先在批量生成里上传或到素材库添加。</div>
            : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 10 }}>
                {list.map((a) => <AssetTile key={a.id} a={a} selected={sel.has(a.id)} onClick={() => toggle(a)} />)}
              </div>}
        </div>
        {multiple && (
          <div className="row gap8" style={{ padding: 14, borderTop: '1px solid var(--line)' }}>
            <span className="faint grow" style={{ fontSize: 12 }}>已选 {sel.size} / 上限 {max}</span>
            <button className="btn btn-ghost" onClick={onClose}>取消</button>
            <button className="btn btn-pri" disabled={sel.size === 0} onClick={confirm}><Icon name="plus" size={15} />添加 {sel.size} 个</button>
          </div>
        )}
      </div>
    </Modal>
  );
}
