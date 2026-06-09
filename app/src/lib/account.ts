// Current-user account profile — editable in 账户设置, persisted to localStorage
// (demo). Defaults from the seed member (mock.me); the same shape maps to the
// users row server-side via PATCH /api/me.
import { useSyncExternalStore } from 'react';
import { me } from './mock';
import type { Role } from './types';

export interface Account {
  id: string;
  name: string;
  email: string;
  title: string;
  role: Role;          // governed by membership; read-only in account settings
  emailNotify: boolean;
}

const KEY = 'ms.account';
const DEFAULT: Account = { id: me.id, name: me.name, email: me.email, title: me.title, role: me.role, emailNotify: true };

function load(): Account {
  try {
    const raw = typeof localStorage !== 'undefined' && localStorage.getItem(KEY);
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : { ...DEFAULT };
  } catch { return { ...DEFAULT }; }
}

let state: Account = load();
const subs = new Set<() => void>();
function commit(next: Account) {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  subs.forEach((f) => f());
}

export const accountStore = {
  get: () => state,
  subscribe: (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; },
  set: (patch: Partial<Account>) => commit({ ...state, ...patch }),
};

export function useAccount(): Account {
  return useSyncExternalStore(accountStore.subscribe, accountStore.get, accountStore.get);
}
