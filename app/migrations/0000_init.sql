-- ManjuStudio · D1 initial schema (matches worker/db/schema.ts)
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT '团队版',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'creator',
  title TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS memberships (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  name TEXT NOT NULL,
  tone TEXT NOT NULL DEFAULT 'a',
  style TEXT NOT NULL DEFAULT '[]',
  ratio TEXT NOT NULL DEFAULT '16:9',
  res TEXT NOT NULL DEFAULT '1080p',
  episodes INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  synopsis TEXT NOT NULL DEFAULT '',
  members TEXT NOT NULL DEFAULT '[]',
  updated TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS episodes (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  project TEXT NOT NULL,
  idx INTEGER NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  shots INTEGER NOT NULL DEFAULT 0,
  done INTEGER NOT NULL DEFAULT 0,
  updated TEXT NOT NULL,
  assignee TEXT
);

CREATE TABLE IF NOT EXISTS characters (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  project TEXT NOT NULL,
  name TEXT NOT NULL,
  tone TEXT NOT NULL DEFAULT 'a',
  voice TEXT,
  tag TEXT,
  refs INTEGER NOT NULL DEFAULT 0,
  asset TEXT NOT NULL DEFAULT '',
  descr TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS scenes (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  episode TEXT,
  idx INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  loc TEXT,
  mood TEXT,
  time TEXT,
  chars TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS shots (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  scene TEXT NOT NULL,
  idx INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  model TEXT NOT NULL DEFAULT 'seedance-2.0',
  chars TEXT NOT NULL DEFAULT '[]',
  keyframe INTEGER NOT NULL DEFAULT 0,
  assignee TEXT,
  tone TEXT NOT NULL DEFAULT 'a',
  progress INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  prompt TEXT NOT NULL,
  params TEXT NOT NULL,
  enhance TEXT,
  updated TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS generation_tasks (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  shot TEXT NOT NULL,
  shot_idx INTEGER NOT NULL DEFAULT 0,
  ep TEXT,
  cap TEXT NOT NULL,
  model TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'volcengine',
  ptid TEXT,
  state TEXT NOT NULL DEFAULT 'queued',
  progress INTEGER NOT NULL DEFAULT 0,
  cost INTEGER NOT NULL DEFAULT 0,
  by_user TEXT,
  error TEXT,
  created TEXT NOT NULL,
  updated TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  project TEXT,
  type TEXT NOT NULL,
  storage TEXT NOT NULL DEFAULT 'r2',
  bucket TEXT,
  key TEXT,
  url TEXT,
  size INTEGER NOT NULL DEFAULT 0,
  created TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS credit_wallets (
  team_id TEXT PRIMARY KEY,
  balance INTEGER NOT NULL DEFAULT 0,
  month_spent INTEGER NOT NULL DEFAULT 0,
  month_budget INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  ref_type TEXT,
  ref_id TEXT,
  actor TEXT,
  note TEXT,
  created TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  actor TEXT,
  action TEXT NOT NULL,
  target TEXT,
  diff TEXT,
  ip TEXT,
  ua TEXT,
  src TEXT NOT NULL DEFAULT 'Web',
  time TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS provider_credentials (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  family TEXT NOT NULL,
  label TEXT,
  secret_ciphertext TEXT,
  is_default INTEGER NOT NULL DEFAULT 0,
  created TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_episodes_project ON episodes (project);
CREATE INDEX IF NOT EXISTS idx_shots_scene ON shots (scene);
CREATE INDEX IF NOT EXISTS idx_tasks_team_state ON generation_tasks (team_id, state);
CREATE INDEX IF NOT EXISTS idx_audit_team_time ON audit_logs (team_id, time);
