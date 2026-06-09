-- ManjuStudio · invite links (token-based join flow)
CREATE TABLE IF NOT EXISTS invites (
  token TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  inviter_id TEXT,
  team_name TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  accepted INTEGER NOT NULL DEFAULT 0
);
