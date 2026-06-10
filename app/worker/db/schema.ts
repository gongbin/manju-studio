// Drizzle schema for Cloudflare D1 (SQLite). Mirrors docs/TECH_DESIGN.md §5.
// JSON-shaped columns use { mode: 'json' } so the ORM (de)serializes them.
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import type { PromptFields, ShotParams, EnhanceState, TimeBeat, ShotRefs } from '../../src/lib/types';

export const teams = sqliteTable('teams', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  plan: text('plan').notNull().default('团队版'),
  createdAt: text('created_at').notNull(),
});

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  name: text('name').notNull(),
  role: text('role').notNull().default('creator'),
  title: text('title'),
  createdAt: text('created_at').notNull(),
});

export const memberships = sqliteTable('memberships', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull(),
  userId: text('user_id').notNull(),
  role: text('role').notNull(),
  status: text('status').notNull().default('active'),
  projectRoles: text('project_roles', { mode: 'json' }).$type<Record<string, string>>().notNull().default({}),
});

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull(),
  name: text('name').notNull(),
  tone: text('tone').notNull().default('a'),
  style: text('style', { mode: 'json' }).$type<string[]>().notNull().default([]),
  ratio: text('ratio').notNull().default('16:9'),
  res: text('res').notNull().default('1080p'),
  episodes: integer('episodes').notNull().default(0),
  status: text('status').notNull().default('draft'),
  synopsis: text('synopsis').notNull().default(''),
  members: text('members', { mode: 'json' }).$type<string[]>().notNull().default([]),
  updated: text('updated').notNull(),
});

export const episodes = sqliteTable('episodes', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull(),
  project: text('project').notNull(),
  index: integer('idx').notNull(),
  title: text('title').notNull(),
  status: text('status').notNull().default('draft'),
  shots: integer('shots').notNull().default(0),
  done: integer('done').notNull().default(0),
  updated: text('updated').notNull(),
  assignee: text('assignee'),
  script: text('script').notNull().default(''),
});

export const characters = sqliteTable('characters', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull(),
  project: text('project').notNull(),
  name: text('name').notNull(),
  tone: text('tone').notNull().default('a'),
  voice: text('voice'),
  tag: text('tag'),
  refs: integer('refs').notNull().default(0),
  asset: text('asset').notNull().default(''),
  desc: text('descr').notNull().default(''),
});

export const scenes = sqliteTable('scenes', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull(),
  episode: text('episode'),
  index: integer('idx').notNull().default(0),
  title: text('title').notNull(),
  loc: text('loc'),
  mood: text('mood'),
  time: text('time'),
  chars: text('chars', { mode: 'json' }).$type<string[]>().notNull().default([]),
});

export const shots = sqliteTable('shots', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull(),
  scene: text('scene').notNull(),
  index: integer('idx').notNull(),
  status: text('status').notNull().default('draft'),
  model: text('model').notNull().default('seedance-2.0'),
  chars: text('chars', { mode: 'json' }).$type<string[]>().notNull().default([]),
  keyframe: integer('keyframe', { mode: 'boolean' }).notNull().default(false),
  assignee: text('assignee'),
  tone: text('tone').notNull().default('a'),
  progress: integer('progress').notNull().default(0),
  error: text('error'),
  prompt: text('prompt', { mode: 'json' }).$type<PromptFields>().notNull(),
  params: text('params', { mode: 'json' }).$type<ShotParams>().notNull(),
  beats: text('beats', { mode: 'json' }).$type<TimeBeat[] | null>(),
  refs: text('refs', { mode: 'json' }).$type<ShotRefs | null>(),
  videoUrl: text('video_url'),
  enhance: text('enhance', { mode: 'json' }).$type<EnhanceState | null>(),
  updated: text('updated').notNull(),
});

export const generationTasks = sqliteTable('generation_tasks', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull(),
  shot: text('shot').notNull(),
  shotIdx: integer('shot_idx').notNull().default(0),
  ep: text('ep'),
  cap: text('cap').notNull(),
  model: text('model').notNull(),
  provider: text('provider').notNull().default('volcengine'),
  ptid: text('ptid'),
  state: text('state').notNull().default('queued'),
  progress: integer('progress').notNull().default(0),
  cost: integer('cost').notNull().default(0),
  by: text('by_user'),
  error: text('error'),
  videoUrl: text('video_url'),
  created: text('created').notNull(),
  updated: text('updated').notNull(),
});

export const assets = sqliteTable('assets', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull(),
  project: text('project'),
  type: text('type').notNull(),
  storage: text('storage').notNull().default('r2'),
  bucket: text('bucket'),
  key: text('key'),
  url: text('url'),
  size: integer('size').notNull().default(0),
  // display fields surfaced to the素材库 UI (frontend Asset shape)
  name: text('name'),
  kind: text('kind'),
  ext: text('ext'),
  tone: text('tone'),
  storeLabel: text('store_label'),
  sizeLabel: text('size_label'),
  created: text('created').notNull(),
});

export const creditWallets = sqliteTable('credit_wallets', {
  teamId: text('team_id').primaryKey(),
  balance: integer('balance').notNull().default(0),
  monthSpent: integer('month_spent').notNull().default(0),
  monthBudget: integer('month_budget').notNull().default(0),
});

export const creditTransactions = sqliteTable('credit_transactions', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull(),
  type: text('type').notNull(), // hold | settle | refund | topup | adjust
  amount: integer('amount').notNull(),
  balanceAfter: integer('balance_after').notNull(),
  refType: text('ref_type'),
  refId: text('ref_id'),
  actor: text('actor'),
  note: text('note'),
  created: text('created').notNull(),
});

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull(),
  actor: text('actor'),
  action: text('action').notNull(),
  target: text('target'),
  diff: text('diff'),
  ip: text('ip'),
  ua: text('ua'),
  src: text('src').notNull().default('Web'),
  time: text('time').notNull(),
});

export const invites = sqliteTable('invites', {
  token: text('token').primaryKey(),
  teamId: text('team_id').notNull(),
  email: text('email').notNull(),
  role: text('role').notNull(),
  inviterId: text('inviter_id'),
  teamName: text('team_name'),
  createdAt: text('created_at').notNull(),
  expiresAt: text('expires_at').notNull(),
  accepted: integer('accepted', { mode: 'boolean' }).notNull().default(false),
});

export const providerCredentials = sqliteTable('provider_credentials', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull(),
  provider: text('provider').notNull(),
  family: text('family').notNull(), // video | llm | tts
  label: text('label'),
  secretCiphertext: text('secret_ciphertext'),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  created: text('created').notNull(),
});
