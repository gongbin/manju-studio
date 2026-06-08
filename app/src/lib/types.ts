// Domain types — mirror the data model in docs/TECH_DESIGN.md (§5) and demo-ui.

export type Role = 'owner' | 'admin' | 'director' | 'creator' | 'reviewer' | 'viewer';
export type Tone = 'a' | 'b' | 'c' | 'd';

export type ShotStatus = 'draft' | 'queued' | 'running' | 'generated' | 'failed' | 'review' | 'approved' | 'dubbed';
export type EpisodeStatus = 'draft' | 'producing' | 'review' | 'published';
export type TaskState = 'queued' | 'running' | 'succeeded' | 'failed';
export type Capability = 'text-to-video' | 'image-to-video' | 'text-to-image' | 'video-enhance' | 'text-to-speech';

export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  title: string;
  online: boolean;
}

export interface Wallet {
  balance: number;
  monthSpent: number;
  monthBudget: number;
}

export interface Character {
  id: string;
  name: string;
  project: string;
  tone: Tone;
  voice: string;
  tag: string;
  refs: number;
  asset: string;
  desc: string;
}

export interface Project {
  id: string;
  name: string;
  tone: Tone;
  style: string[];
  ratio: string;
  res: string;
  episodes: number;
  status: EpisodeStatus;
  updated: string;
  synopsis: string;
  members: string[];
}

export interface Episode {
  id: string;
  project: string;
  index: number;
  title: string;
  status: EpisodeStatus;
  shots: number;
  done: number;
  updated: string;
  assignee: string | null;
}

export interface Scene {
  id: string;
  title: string;
  loc: string;
  mood: string;
  time: string;
  chars: string[];
}

/** Structured manju prompt — same fields as seedance-app PromptFields. */
export interface PromptFields {
  visual: string;
  dialogue: string;
  voiceover: string;
  soundEffects: string;
  cameraPosition: string;
  cameraMovement: string;
}

export interface ShotParams {
  resolution: string;
  ratio: string;
  duration: number;
  generateAudio: boolean;
  webSearch: boolean;
  watermark: boolean;
}

export interface EnhanceState {
  status: 'idle' | 'queued' | 'processing' | 'succeeded' | 'failed';
  type?: string;
  res?: string;
  progress?: number;
}

export interface Shot {
  id: string;
  scene: string;
  index: number;
  status: ShotStatus;
  model: string;
  chars: string[];
  keyframe: boolean;
  assignee: string | null;
  tone: Tone;
  progress?: number;
  error?: string | null;
  prompt: PromptFields;
  params: ShotParams;
  enhance?: EnhanceState;
}

export interface GenerationTask {
  id: string;
  shot: string;
  shotIdx: number;
  ep: string;
  cap: Capability;
  model: string;
  state: TaskState;
  progress: number;
  cost: number;
  by: string;
  created: string;
  ptid: string;
  error?: string;
}

/** Provider-driven model descriptor — drives the parameter panel (docs §3). */
export interface VideoModel {
  id: string;
  label: string;
  provider: string;
  caps: Capability[];
  res: string[];
  ratios: string[];
  dur: [number, number];
  refImg: boolean;
  refVid: boolean;
  refAud: boolean;
  audio: boolean;
  charAsset: boolean;
  base: number;
}

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  diff: string;
  time: string;
  src: string;
}
