-- ManjuStudio · membership status + per-project role overrides
ALTER TABLE memberships ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE memberships ADD COLUMN project_roles TEXT NOT NULL DEFAULT '{}';
