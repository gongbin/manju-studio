import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from './db/schema';

export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  ASSETS_BUCKET: R2Bucket;
  SESSIONS: KVNamespace;
  TASK_QUEUE: Queue<TaskMessage>;
  SEED_KEY: string;
  CREDENTIAL_ENC_KEY?: string;
  VOLC_ARK_API_KEY?: string;
  /** LLM (智能分镜) data-plane key — e.g. a ZenMux key (OpenAI-compatible). */
  LLM_API_KEY?: string;
  ZENMUX_API_KEY?: string;
}

export interface TaskMessage {
  taskId: string;
  teamId: string;
}

export const getDb = (env: Env): DrizzleD1Database<typeof schema> => drizzle(env.DB, { schema });
export { schema };
