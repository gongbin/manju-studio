import { Menu as BaseMenu } from '@base-ui/react/menu';
import type { ReactElement } from 'react';
import { Icon } from './icon';

export interface MenuItem {
  label?: string;
  icon?: string;
  onClick?: () => void;
  danger?: boolean;
  sep?: boolean;
  kbd?: string;
}

export function Menu({
  trigger,
  items,
  align = 'start',
}: {
  trigger: ReactElement;
  items: (MenuItem | null | false | undefined)[];
  align?: 'start' | 'center' | 'end';
}) {
  const list = items.filter(Boolean) as MenuItem[];
  return (
    <BaseMenu.Root>
      <BaseMenu.Trigger render={trigger} />
      <BaseMenu.Portal>
        <BaseMenu.Positioner align={align} side="bottom" sideOffset={6}>
          <BaseMenu.Popup className="menu-pop">
            {list.map((it, i) =>
              it.sep ? (
                <BaseMenu.Separator key={i} className="menu-sep" />
              ) : (
                <BaseMenu.Item
                  key={i}
                  className={'menu-item' + (it.danger ? ' danger' : '')}
                  onClick={() => it.onClick?.()}
                >
                  {it.icon && <Icon name={it.icon} size={15} />}
                  <span style={{ flex: 1 }}>{it.label}</span>
                  {it.kbd && <span className="kbd">{it.kbd}</span>}
                </BaseMenu.Item>
              ),
            )}
          </BaseMenu.Popup>
        </BaseMenu.Positioner>
      </BaseMenu.Portal>
    </BaseMenu.Root>
  );
}
