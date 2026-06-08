import { useNavigate } from '@tanstack/react-router';

/**
 * Loosely-typed navigation for code-based routing with dynamic path strings.
 * TanStack's typed `navigate` requires literal route paths; when the target
 * comes from data (nav config, breadcrumbs) we go through this helper.
 */
export function useGo() {
  const navigate = useNavigate();
  return (to: string, params?: Record<string, string>) => navigate({ to, params } as never);
}
