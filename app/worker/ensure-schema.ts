// Idempotent schema provisioning / repair. Cloudflare Builds runs `wrangler deploy`
// but NOT `d1 migrations apply`, so incremental migrations never reach prod. This
// recreates any missing tables (CREATE IF NOT EXISTS, full current shape) and adds
// any missing columns (ALTER ... ADD COLUMN, ignoring "duplicate column"). Safe to
// run repeatedly; triggered by POST /api/_migrate and at the start of /api/_seed.
import type { Env } from './env';

const CREATE: string[] = [
  `CREATE TABLE IF NOT EXISTS teams (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL, plan TEXT NOT NULL DEFAULT '团队版', created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'creator', title TEXT, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS memberships (id TEXT PRIMARY KEY, team_id TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', project_roles TEXT NOT NULL DEFAULT '{}')`,
  `CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, team_id TEXT NOT NULL, name TEXT NOT NULL, tone TEXT NOT NULL DEFAULT 'a', style TEXT NOT NULL DEFAULT '[]', ratio TEXT NOT NULL DEFAULT '16:9', res TEXT NOT NULL DEFAULT '1080p', episodes INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'draft', synopsis TEXT NOT NULL DEFAULT '', members TEXT NOT NULL DEFAULT '[]', updated TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS episodes (id TEXT PRIMARY KEY, team_id TEXT NOT NULL, project TEXT NOT NULL, idx INTEGER NOT NULL, title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'draft', shots INTEGER NOT NULL DEFAULT 0, done INTEGER NOT NULL DEFAULT 0, updated TEXT NOT NULL, assignee TEXT, script TEXT NOT NULL DEFAULT '')`,
  `CREATE TABLE IF NOT EXISTS characters (id TEXT PRIMARY KEY, team_id TEXT NOT NULL, project TEXT NOT NULL, name TEXT NOT NULL, tone TEXT NOT NULL DEFAULT 'a', voice TEXT, tag TEXT, refs INTEGER NOT NULL DEFAULT 0, asset TEXT NOT NULL DEFAULT '', descr TEXT NOT NULL DEFAULT '')`,
  `CREATE TABLE IF NOT EXISTS scenes (id TEXT PRIMARY KEY, team_id TEXT NOT NULL, episode TEXT, idx INTEGER NOT NULL DEFAULT 0, title TEXT NOT NULL, loc TEXT, mood TEXT, time TEXT, chars TEXT NOT NULL DEFAULT '[]')`,
  `CREATE TABLE IF NOT EXISTS shots (id TEXT PRIMARY KEY, team_id TEXT NOT NULL, scene TEXT NOT NULL, idx INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'draft', model TEXT NOT NULL DEFAULT 'seedance-2.0', chars TEXT NOT NULL DEFAULT '[]', keyframe INTEGER NOT NULL DEFAULT 0, assignee TEXT, tone TEXT NOT NULL DEFAULT 'a', progress INTEGER NOT NULL DEFAULT 0, error TEXT, prompt TEXT NOT NULL, params TEXT NOT NULL, beats TEXT, refs TEXT, video_url TEXT, enhance TEXT, updated TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS generation_tasks (id TEXT PRIMARY KEY, team_id TEXT NOT NULL, shot TEXT NOT NULL, shot_idx INTEGER NOT NULL DEFAULT 0, ep TEXT, cap TEXT NOT NULL, model TEXT NOT NULL, provider TEXT NOT NULL DEFAULT 'volcengine', ptid TEXT, state TEXT NOT NULL DEFAULT 'queued', progress INTEGER NOT NULL DEFAULT 0, cost INTEGER NOT NULL DEFAULT 0, by_user TEXT, error TEXT, video_url TEXT, created TEXT NOT NULL, updated TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS assets (id TEXT PRIMARY KEY, team_id TEXT NOT NULL, project TEXT, type TEXT NOT NULL, storage TEXT NOT NULL DEFAULT 'r2', bucket TEXT, key TEXT, url TEXT, size INTEGER NOT NULL DEFAULT 0, name TEXT, kind TEXT, ext TEXT, tone TEXT, store_label TEXT, size_label TEXT, created TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS credit_wallets (team_id TEXT PRIMARY KEY, balance INTEGER NOT NULL DEFAULT 0, month_spent INTEGER NOT NULL DEFAULT 0, month_budget INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS credit_transactions (id TEXT PRIMARY KEY, team_id TEXT NOT NULL, type TEXT NOT NULL, amount INTEGER NOT NULL, balance_after INTEGER NOT NULL, ref_type TEXT, ref_id TEXT, actor TEXT, note TEXT, created TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, team_id TEXT NOT NULL, actor TEXT, action TEXT NOT NULL, target TEXT, diff TEXT, ip TEXT, ua TEXT, src TEXT NOT NULL DEFAULT 'Web', time TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS provider_credentials (id TEXT PRIMARY KEY, team_id TEXT NOT NULL, provider TEXT NOT NULL, family TEXT NOT NULL, label TEXT, secret_ciphertext TEXT, is_default INTEGER NOT NULL DEFAULT 0, created TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS invites (token TEXT PRIMARY KEY, team_id TEXT NOT NULL, email TEXT NOT NULL, role TEXT NOT NULL, inviter_id TEXT, team_name TEXT, created_at TEXT NOT NULL, expires_at TEXT NOT NULL, accepted INTEGER NOT NULL DEFAULT 0)`,
  `CREATE INDEX IF NOT EXISTS idx_episodes_project ON episodes (project)`,
  `CREATE INDEX IF NOT EXISTS idx_shots_scene ON shots (scene)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_team_state ON generation_tasks (team_id, state)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_team_time ON audit_logs (team_id, time)`,
];

// Columns added by migrations 0001–0003 (for DBs created before those columns existed).
const ADD_COLUMNS: string[] = [
  `ALTER TABLE shots ADD COLUMN beats TEXT`,
  `ALTER TABLE shots ADD COLUMN refs TEXT`,
  `ALTER TABLE shots ADD COLUMN video_url TEXT`,
  `ALTER TABLE generation_tasks ADD COLUMN video_url TEXT`,
  `ALTER TABLE assets ADD COLUMN name TEXT`,
  `ALTER TABLE assets ADD COLUMN kind TEXT`,
  `ALTER TABLE assets ADD COLUMN ext TEXT`,
  `ALTER TABLE assets ADD COLUMN tone TEXT`,
  `ALTER TABLE assets ADD COLUMN store_label TEXT`,
  `ALTER TABLE assets ADD COLUMN size_label TEXT`,
  `ALTER TABLE memberships ADD COLUMN status TEXT NOT NULL DEFAULT 'active'`,
  `ALTER TABLE memberships ADD COLUMN project_roles TEXT NOT NULL DEFAULT '{}'`,
  `ALTER TABLE episodes ADD COLUMN script TEXT NOT NULL DEFAULT ''`,
];

export async function ensureSchema(env: Env): Promise<{ created: number; added: number; skipped: number }> {
  let created = 0;
  let added = 0;
  let skipped = 0;
  for (const sql of CREATE) {
    await env.DB.prepare(sql).run();
    created++;
  }
  for (const sql of ADD_COLUMNS) {
    try {
      await env.DB.prepare(sql).run();
      added++;
    } catch (e) {
      // "duplicate column name" — column already exists; expected on up-to-date DBs.
      if (String(e).toLowerCase().includes('duplicate column')) skipped++;
      else throw e;
    }
  }
  return { created, added, skipped };
}
