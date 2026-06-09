// Shared RBAC model — workspace roles → permission points. Backend enforces
// these; the UI uses the same table for the role matrix, 我的权限, and overrides.
import type { Role } from './types';

export const PERMS = ['project.write', 'shot.generate', 'shot.review', 'shot.publish', 'member.manage', 'credential.write', 'billing.manage', 'audit.read'] as const;
export type Perm = (typeof PERMS)[number];

export const PERM_LABEL: Record<Perm, string> = {
  'project.write': '项目 / 剧本编辑',
  'shot.generate': '提交镜头生成',
  'shot.review': '审核镜头',
  'shot.publish': '发布 / 导出',
  'member.manage': '成员与权限管理',
  'credential.write': 'Provider 凭据配置',
  'billing.manage': '计费与充值',
  'audit.read': '查看审计日志',
};

export const ROLE_PERMS: Record<Role, Perm[]> = {
  owner: [...PERMS],
  admin: [...PERMS],
  director: ['project.write', 'shot.generate', 'shot.review', 'shot.publish'],
  creator: ['project.write', 'shot.generate'],
  reviewer: ['shot.review', 'audit.read'],
  viewer: [],
};

export const ROLE_DESC: Record<Role, string> = {
  owner: '工作空间拥有者 · 全部权限，含转让与计费',
  admin: '管理员 · 成员、凭据、计费与全部创作权限',
  director: '导演 · 项目编辑、生成、审核与发布',
  creator: '创作者 · 项目编辑与镜头生成',
  reviewer: '审核 · 镜头审核与审计查看',
  viewer: '观察者 · 只读',
};

export function permsForRole(role: Role): Perm[] {
  return ROLE_PERMS[role] ?? [];
}
/** Effective role for a member in a project: project override wins over workspace role. */
export function effectiveRole(workspaceRole: Role, projectRoles: Record<string, Role> | undefined, projectId: string): Role {
  return projectRoles?.[projectId] ?? workspaceRole;
}
