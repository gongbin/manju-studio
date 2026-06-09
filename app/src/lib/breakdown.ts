// Shared 智能分镜 logic — used by the Worker (real LLM call) and the frontend
// fallback (heuristic split when no backend / no LLM key). The LLM is asked to
// return this exact JSON shape so the result maps 1:1 onto scenes + shot drafts.

export interface ShotDraft {
  visual: string;
  dialogue: string;
  voiceover: string;
  soundEffects: string;
  cameraPosition: string;
  cameraMovement: string;
  duration: number;
}
export interface SceneDraft {
  title: string;
  loc: string;
  time: string;
  mood: string;
  characters: string[];
  shots: ShotDraft[];
}
export interface BreakdownResult {
  scenes: SceneDraft[];
}

export const DEFAULT_BREAKDOWN_PROMPT = `你是资深漫剧分镜导演。把用户提供的剧本拆解为「场次(scene) → 镜头(shot)」结构，并为每个镜头补全结构化的画面提示词，用于后续 AI 视频生成。

严格只输出一个 JSON 对象（禁止任何解释文字、禁止 markdown 代码块），结构如下：
{
  "scenes": [
    {
      "title": "场次标题，如：场一 · 城门外",
      "loc": "地点",
      "time": "时间/天气，如：夜·雨",
      "mood": "氛围基调，如：压抑/肃杀",
      "characters": ["出场角色名"],
      "shots": [
        {
          "visual": "画面提示词：镜头主体+动作+环境+光影（必填、可直接喂给视频模型）",
          "dialogue": "本镜头台词，无则空字符串",
          "voiceover": "旁白，无则空字符串",
          "soundEffects": "音效，无则空字符串",
          "cameraPosition": "机位/景别，如：中景·背身",
          "cameraMovement": "运镜，如：缓推/横移跟拍",
          "duration": 5
        }
      ]
    }
  ]
}

要求：
- 每个场次切 2-6 个镜头，镜头之间要有景别与机位变化，体现镜头语言。
- duration 为 3-12 的整数秒，按内容轻重分配。
- characters 使用剧本中真实出现的角色名。
- visual 必须具体、可成片，不要照抄台词。
- 只输出 JSON 对象，不要包含任何额外文字。`;

const clampDur = (n: unknown) => { const v = Math.round(Number(n)); return Number.isFinite(v) && v >= 3 ? Math.min(12, v) : 5; };
const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));

/** Coerce arbitrary LLM JSON into a safe BreakdownResult. */
export function normalizeBreakdown(raw: unknown): BreakdownResult {
  const obj = raw as { scenes?: unknown };
  const scenesRaw = Array.isArray(obj?.scenes) ? obj.scenes : Array.isArray(raw) ? (raw as unknown[]) : [];
  const scenes: SceneDraft[] = scenesRaw.map((s) => {
    const sc = s as Record<string, unknown>;
    const shotsRaw = Array.isArray(sc.shots) ? sc.shots : [];
    const shots: ShotDraft[] = shotsRaw.map((sh) => {
      const o = sh as Record<string, unknown>;
      return {
        visual: str(o.visual).trim(),
        dialogue: str(o.dialogue).trim(),
        voiceover: str(o.voiceover).trim(),
        soundEffects: str(o.soundEffects ?? o.sfx).trim(),
        cameraPosition: str(o.cameraPosition ?? o.camera).trim(),
        cameraMovement: str(o.cameraMovement ?? o.movement).trim(),
        duration: clampDur(o.duration),
      };
    }).filter((sh) => sh.visual || sh.dialogue || sh.voiceover);
    const chars = Array.isArray(sc.characters) ? sc.characters.map(str).map((x) => x.trim()).filter(Boolean) : [];
    return { title: str(sc.title).trim() || '未命名场次', loc: str(sc.loc).trim(), time: str(sc.time).trim(), mood: str(sc.mood).trim(), characters: chars, shots };
  }).filter((sc) => sc.shots.length > 0);
  return { scenes };
}

const DIALOG_EMO = /^(.{1,14}?)（([^）]{1,10})）：(.+)$/;
const DIALOG = /^(.{1,14}?)：(.+)$/;

/** Heuristic markdown split — fallback when no LLM is reachable. */
export function heuristicBreakdown(script: string): BreakdownResult {
  const lines = script.split(/\r?\n/).map((l) => l.trim());
  const scenes: SceneDraft[] = [];
  let cur: SceneDraft | null = null;
  const openScene = (heading: string) => {
    const parts = heading.replace(/^#+\s*/, '').split('·').map((s) => s.trim()).filter(Boolean);
    cur = {
      title: parts.slice(0, 2).join(' · ') || heading.replace(/^#+\s*/, '') || `场${scenes.length + 1}`,
      loc: parts[1] ?? '', time: parts.slice(2).join('·'), mood: '', characters: [], shots: [],
    };
    scenes.push(cur);
  };
  for (const ln of lines) {
    if (!ln) continue;
    if (/^##\s/.test(ln)) { openScene(ln); continue; }
    if (/^#\s/.test(ln)) continue; // episode title
    if (!cur) openScene('场一');
    const dm = ln.match(DIALOG_EMO) || ln.match(DIALOG);
    if (dm) {
      const name = dm[1].trim();
      const emo = dm.length === 4 ? dm[2] : '';
      const line = (dm.length === 4 ? dm[3] : dm[2]).trim();
      const isVO = /旁白|画外/.test(emo);
      if (!isVO && name.length <= 6 && !cur!.characters.includes(name)) cur!.characters.push(name);
      cur!.shots.push({
        visual: isVO ? `空镜/叙事画面，配合旁白：${line}`.slice(0, 70) : `${name}${emo ? '（' + emo + '）' : ''}，${line}`.slice(0, 70),
        dialogue: isVO ? '' : line, voiceover: isVO ? line : '', soundEffects: '',
        cameraPosition: isVO ? '空镜·大远景' : '近景·人物', cameraMovement: isVO ? '缓移' : '固定·浅景深', duration: 5,
      });
      continue;
    }
    // narrative paragraph → establishing shot
    cur!.shots.push({ visual: ln.slice(0, 90), dialogue: '', voiceover: '', soundEffects: '', cameraPosition: '中景·叙事', cameraMovement: '缓推', duration: 6 });
  }
  return normalizeBreakdown({ scenes: scenes.filter((s) => s.shots.length > 0) });
}

/** Build OpenAI-compatible chat messages for a breakdown request. */
export function breakdownMessages(systemPrompt: string, script: string) {
  return [
    { role: 'system' as const, content: systemPrompt || DEFAULT_BREAKDOWN_PROMPT },
    { role: 'user' as const, content: `剧本如下：\n\n${script}` },
  ];
}

/** Extract a JSON object from an LLM text response (tolerant of code fences / prose). */
export function parseJsonLoose(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  const slice = start >= 0 && end > start ? body.slice(start, end + 1) : body;
  return JSON.parse(slice);
}
