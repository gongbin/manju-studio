import { useEffect, useState } from 'react';
import { Icon } from './icon';

interface Toast { id: number; msg: string; icon: string }
type Listener = (t: Toast) => void;

let listeners: Listener[] = [];
let seq = 0;

export function toast(msg: string, icon = 'check') {
  const t = { id: ++seq, msg, icon };
  listeners.forEach((l) => l(t));
}

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const l: Listener = (t) => {
      setItems((p) => [...p, t]);
      setTimeout(() => setItems((p) => p.filter((x) => x.id !== t.id)), 2600);
    };
    listeners.push(l);
    return () => { listeners = listeners.filter((x) => x !== l); };
  }, []);
  return (
    <div className="toasts">
      {items.map((t) => (
        <div className="toast" key={t.id}><Icon name={t.icon} size={16} className="acc" />{t.msg}</div>
      ))}
    </div>
  );
}
