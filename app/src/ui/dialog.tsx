import { Dialog } from '@base-ui/react/dialog';
import type { ReactNode } from 'react';

function Shell({ open, onClose, className, children }: { open: boolean; onClose: () => void; className: string; children: ReactNode }) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="scrim" />
        <Dialog.Popup className={className}>{children}</Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export const Modal = (p: { open: boolean; onClose: () => void; children: ReactNode }) => <Shell {...p} className="modal" />;
export const Drawer = (p: { open: boolean; onClose: () => void; children: ReactNode }) => <Shell {...p} className="drawer" />;
