import { Checkbox } from '@base-ui/react/checkbox';
import { Switch as BaseSwitch } from '@base-ui/react/switch';
import { Icon } from './icon';

/** Checkbox (Base UI). Stops propagation so it works inside clickable rows. */
export function Check({ checked, indeterminate, onChange }: { checked: boolean; indeterminate?: boolean; onChange: (v: boolean) => void }) {
  return (
    <span onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex' }}>
      <Checkbox.Root className="cbx" checked={checked} indeterminate={indeterminate} onCheckedChange={(v) => onChange(v === true)}>
        <Checkbox.Indicator>
          {indeterminate ? <span style={{ width: 8, height: 2, background: 'currentColor', borderRadius: 2, display: 'block' }} /> : <Icon name="check" size={11} strokeWidth={3} />}
        </Checkbox.Indicator>
      </Checkbox.Root>
    </span>
  );
}

export function Switch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <BaseSwitch.Root className="sw" checked={checked} onCheckedChange={onChange}>
      <BaseSwitch.Thumb className="sw-thumb" />
    </BaseSwitch.Root>
  );
}

export interface SegOption { value: string; label?: string; icon?: string }
export function Seg({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: SegOption[] }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.icon && <Icon name={o.icon} size={14} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Progress({ value = 0, amber }: { value?: number; amber?: boolean }) {
  return (
    <div className={'prog' + (amber ? ' amber' : '')}>
      <i style={{ width: Math.max(0, Math.min(100, value)) + '%' }} />
    </div>
  );
}
