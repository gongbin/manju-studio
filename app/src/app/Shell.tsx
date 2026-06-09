import { useState, type ReactNode } from 'react';
import { Outlet, useRouterState } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@/ui/icon';
import { Menu } from '@/ui/menu';
import { Avatar } from '@/ui/primitives';
import { Progress } from '@/ui/controls';
import { Toaster } from '@/ui/toast';
import { useTheme } from '@/theme';
import { useGo } from '@/lib/nav';
import { api } from '@/lib/api';
import { fmt } from '@/lib/format';
import { useAccount } from '@/lib/account';
import { team, wallet as walletSeed, ROLE_LABEL } from '@/lib/mock';
import { AccountSettingsModal, MyPermissionsModal } from './UserModals';

interface NavItem { id: string; label: string; icon: string; to: string }
const NAV: { group: string; items: NavItem[] }[] = [
  { group: '创作', items: [
    { id: 'projects', label: '项目 / 剧集', icon: 'layers', to: '/' },
    { id: 'tasks', label: '任务中心', icon: 'cpu', to: '/tasks' },
    { id: 'characters', label: '角色库', icon: 'users', to: '/characters' },
    { id: 'assets', label: '素材库', icon: 'gallery', to: '/assets' },
  ] },
  { group: '管理', items: [
    { id: 'billing', label: '计费与用量', icon: 'wallet', to: '/billing' },
    { id: 'members', label: '成员与权限', icon: 'shield', to: '/members' },
    { id: 'audit', label: '审计日志', icon: 'history', to: '/audit' },
    { id: 'settings', label: '工作空间设置', icon: 'settings', to: '/settings' },
  ] },
];

function Sidebar() {
  const go = useGo();
  const acct = useAccount();
  const [modal, setModal] = useState<null | 'account' | 'perms'>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: wallet } = useQuery({ queryKey: ['wallet'], queryFn: api.getWallet, initialData: walletSeed });
  const { data: tasks } = useQuery({ queryKey: ['tasks'], queryFn: api.listTasks, refetchInterval: 900 });
  const running = (tasks ?? []).filter((t) => t.state === 'running' || t.state === 'queued').length;

  const isActive = (item: NavItem) => {
    if (item.id === 'projects') return pathname === '/' || pathname.startsWith('/project');
    return pathname === item.to;
  };

  return (
    <aside className="rail">
      <div className="rail-head">
        <div className="brand-mark">漫</div>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="brand-name">漫剧工坊</div>
          <div className="brand-sub mono">ManjuStudio</div>
        </div>
      </div>

      <button className="ws-switch" onClick={() => go('/settings')}>
        <span className="av" style={{ width: 26, height: 26, fontSize: 11, background: 'linear-gradient(140deg,#7c5cf0,#3b7ff0)' }}>青</span>
        <span className="grow" style={{ minWidth: 0, textAlign: 'left' }}>
          <span className="ellipsis" style={{ display: 'block', fontWeight: 600, fontSize: 13 }}>{team.name}</span>
          <span className="faint" style={{ fontSize: 11 }}>{team.plan}</span>
        </span>
        <Icon name="chevDown" size={15} className="faint" />
      </button>

      <nav className="nav">
        {NAV.map((g) => (
          <div key={g.group}>
            <div className="nav-label">{g.group}</div>
            {g.items.map((it) => (
              <a key={it.id} className={'nav-item' + (isActive(it) ? ' active' : '')} onClick={() => go(it.to)}>
                <Icon name={it.icon} size={17} />
                <span>{it.label}</span>
                {it.id === 'tasks' && running > 0 && <span className="count alert mono">{running}</span>}
              </a>
            ))}
          </div>
        ))}
      </nav>

      <div className="rail-foot">
        <div className="row gap8" style={{ marginBottom: 10, padding: '0 2px' }}>
          <Icon name="coins" size={15} className="acc" />
          <span className="grow">
            <span className="row" style={{ justifyContent: 'space-between', fontSize: 11.5 }}>
              <span className="muted">团队积分</span>
              <span className="mono" style={{ fontWeight: 600 }}>{fmt.credits(wallet?.balance ?? 0)}</span>
            </span>
            <span style={{ marginTop: 5, display: 'block' }}><Progress value={((wallet?.monthSpent ?? 0) / (wallet?.monthBudget ?? 1)) * 100} amber /></span>
          </span>
        </div>
        <Menu
          align="start"
          trigger={
            <button className="ws-switch" style={{ margin: 0, width: '100%' }}>
              <Avatar name={acct.name} size={26} />
              <span className="grow" style={{ minWidth: 0, textAlign: 'left' }}>
                <span className="ellipsis" style={{ display: 'block', fontWeight: 600, fontSize: 13 }}>{acct.name}</span>
                <span className="faint" style={{ fontSize: 11 }}>{ROLE_LABEL[acct.role]}</span>
              </span>
              <Icon name="moreV" size={15} className="faint" />
            </button>
          }
          items={[
            { icon: 'settings', label: '账户设置', onClick: () => setModal('account') },
            { icon: 'shield', label: '我的权限', onClick: () => setModal('perms') },
            { sep: true },
            { icon: 'logout', label: '退出登录', danger: true, onClick: () => { localStorage.removeItem('ms.auth'); go('/login'); } },
          ]}
        />
      </div>
      <AccountSettingsModal open={modal === 'account'} onClose={() => setModal(null)} />
      <MyPermissionsModal open={modal === 'perms'} onClose={() => setModal(null)} />
    </aside>
  );
}

export function Topbar({ children }: { children?: ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const acct = useAccount();
  return (
    <header className="topbar">
      <div className="grow" style={{ minWidth: 0 }}>{children}</div>
      <div className="search" style={{ width: 230 }}>
        <Icon name="search" size={15} />
        <input placeholder="搜索项目、镜头、任务…" />
        <span className="kbd">⌘K</span>
      </div>
      <button className="icon-btn" title="切换主题" onClick={toggleTheme}>
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
      </button>
      <Menu
        align="end"
        trigger={<button className="icon-btn" style={{ position: 'relative' }}><Icon name="bell" size={18} /><span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--bg)' }} /></button>}
        items={[
          { icon: 'check', label: '镜头 #04 生成成功' },
          { icon: 'warn', label: '镜头 #07 生成失败' },
          { icon: 'sparkle', label: '顾辞 通过了 第四集 终审' },
        ]}
      />
      <div className="vr" />
      <Avatar name={acct.name} size={28} />
    </header>
  );
}

export interface CrumbPart { label: string; to?: string; params?: Record<string, string> }
export function Crumb({ parts }: { parts: CrumbPart[] }) {
  const go = useGo();
  return (
    <div className="crumb">
      {parts.map((p, i) => (
        <span key={i} className="row gap6">
          {i > 0 && <Icon name="chevRight" size={13} className="sep" />}
          {p.to ? (
            <a className="ellipsis" onClick={() => go(p.to!, p.params)}>{p.label}</a>
          ) : (
            <span className="cur ellipsis">{p.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}

export function Screen({ crumb, children }: { crumb?: ReactNode; children: ReactNode }) {
  return (
    <>
      <Topbar>{crumb}</Topbar>
      <div className="content">{children}</div>
    </>
  );
}

export function ShellLayout() {
  return (
    <div className="app">
      <Sidebar />
      <div className="main-col">
        <Outlet />
      </div>
      <Toaster />
    </div>
  );
}
