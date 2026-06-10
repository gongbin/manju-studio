// Mock domain data — ported from ../../demo-ui/src/data.jsx.
// In the real app these are served by Cloudflare Workers + D1 (docs §5/§12).
import type {
  Asset, AuditEntry, Character, Episode, GenerationTask, Member, Project,
  Role, Scene, Shot, PromptFields, ShotParams, Tone, VideoModel, Wallet,
} from './types';

const now = Date.now();
export const mins = (m: number) => new Date(now - m * 60000).toISOString();

export const team = { name: '青冥工作室', slug: 'qingming', plan: '团队版' };

export const ROLE_LABEL: Record<Role, string> = {
  owner: '拥有者', admin: '管理员', director: '导演', creator: '创作者', reviewer: '审核', viewer: '观察者',
};

export const members: Member[] = [
  { id: 'u_lin', name: '林深', email: 'linshen@qm.studio', role: 'owner', title: '主理人 / 导演', online: true, status: 'active' },
  { id: 'u_zhou', name: '周宴', email: 'zhouyan@qm.studio', role: 'admin', title: '制片管理', online: true, status: 'active' },
  { id: 'u_su', name: '苏拾光', email: 'sushi@qm.studio', role: 'director', title: '分镜导演', online: true, status: 'active', projectRoles: { p_yj: 'creator' } },
  { id: 'u_chen', name: '陈默', email: 'chenmo@qm.studio', role: 'creator', title: '原画 / 创作', online: false, status: 'active' },
  { id: 'u_qi', name: '阿杞', email: 'aqi@qm.studio', role: 'creator', title: '生成 / 创作', online: true, status: 'active', projectRoles: { p_qm: 'director' } },
  { id: 'u_gu', name: '顾辞', email: 'guci@qm.studio', role: 'reviewer', title: '内容审核', online: false, status: 'active' },
  { id: 'u_man', name: '小满', email: 'xiaoman@qm.studio', role: 'viewer', title: '运营观察', online: false, status: 'active' },
];
export const me = members[0];

export const wallet: Wallet = { balance: 48260, monthSpent: 21740, monthBudget: 60000 };

export const characters: Character[] = [
  { id: 'c_shen', name: '沈砚', project: 'p_qm', tone: 'b', voice: '青年·清冷男声', tag: '男主', refs: 4, asset: 'asset://qm/shen-yan-v3', desc: '玄色长衫，眉目沉静，剑客出身，惯用左手。' },
  { id: 'c_su', name: '苏陌', project: 'p_qm', tone: 'a', voice: '少女·温润女声', tag: '女主', refs: 5, asset: 'asset://qm/su-mo-v2', desc: '月白裙衫，发束玉簪，医毒双修，眼角有泪痣。' },
  { id: 'c_lao', name: '陆船夫', project: 'p_qm', tone: 'c', voice: '老年·沙哑男声', tag: '配角', refs: 2, asset: '', desc: '蓑衣斗笠，常年行船，左眼有疤。' },
  { id: 'c_yan', name: '燕三娘', project: 'p_qm', tone: 'd', voice: '成年·爽利女声', tag: '配角', refs: 3, asset: 'asset://qm/yan-3rd', desc: '客栈掌柜，红衣描金，泼辣机敏。' },
];

export const projects: Project[] = [
  { id: 'p_qm', name: '青冥录', tone: 'b', style: ['国风', '仙侠', '水墨'], ratio: '16:9', res: '1080p', episodes: 6, status: 'producing', updated: mins(48), synopsis: '剑客沈砚雨夜入青冥城，卷入一桩十年前的旧案。', members: ['u_lin', 'u_su', 'u_chen', 'u_qi', 'u_gu'] },
  { id: 'p_yj', name: '雾隐食肆', tone: 'c', style: ['治愈', '日常', '美食'], ratio: '16:9', res: '1080p', episodes: 12, status: 'producing', updated: mins(180), synopsis: '深巷小馆，每道菜背后都藏着一段都市怪谈。', members: ['u_lin', 'u_chen', 'u_man'] },
  { id: 'p_xc', name: '星轨补完计划', tone: 'a', style: ['科幻', '赛博', '悬疑'], ratio: '21:9', res: '4K', episodes: 4, status: 'review', updated: mins(620), synopsis: '2099 年，记忆可被剪辑，一名修复师发现了不该存在的片段。', members: ['u_lin', 'u_zhou', 'u_qi'] },
  { id: 'p_hd', name: '海岛旧事', tone: 'd', style: ['言情', '怀旧'], ratio: '9:16', res: '1080p', episodes: 8, status: 'published', updated: mins(2600), synopsis: '一座即将拆迁的海岛小镇，三代人的夏天。', members: ['u_lin', 'u_su'] },
];

export const episodes: Episode[] = [
  { id: 'e1', project: 'p_qm', index: 1, title: '惊蛰', status: 'published', shots: 14, done: 14, updated: mins(4200), assignee: 'u_su' },
  { id: 'e2', project: 'p_qm', index: 2, title: '故人来', status: 'published', shots: 16, done: 16, updated: mins(3600), assignee: 'u_su' },
  { id: 'e3', project: 'p_qm', index: 3, title: '雨夜入城', status: 'producing', shots: 10, done: 4, updated: mins(48), assignee: 'u_qi' },
  { id: 'e4', project: 'p_qm', index: 4, title: '长街杀', status: 'review', shots: 12, done: 12, updated: mins(220), assignee: 'u_chen' },
  { id: 'e5', project: 'p_qm', index: 5, title: '旧案', status: 'draft', shots: 0, done: 0, updated: mins(900), assignee: 'u_su' },
  { id: 'e6', project: 'p_qm', index: 6, title: '青冥灯', status: 'draft', shots: 0, done: 0, updated: mins(1400), assignee: null },
];

// 各集独立剧本（按 episode id 区分）。新建剧集默认空白，可在「剧本 · 智能分镜」页编辑保存。
export const scripts: Record<string, string> = {
  e1: `# 第一集 · 惊蛰

## 场一 · 沈宅·庭院 · 夜 · 春雷

惊蛰夜，春雷滚过沈宅飞檐。少年沈砚提一柄木剑立于庭中，跟着父亲一招一式。檐下红灯笼写着"沈"字。

沈父（含笑）：剑要稳，心要静。砚儿，记住——青冥灯一旦点亮，沈家便再无退路。

少年沈砚（不解）：父亲，何为退路？

## 场二 · 沈宅·正厅 · 夜

正厅烛火通明。一名黑衣访客奉上一封火漆密信。沈父拆信，神色骤变，握信的手微微发抖。

黑衣人（低沉）：十年之约已到，城里那位，要请沈先生赴一场旧局。

沈父（沉声）：……告诉他，沈家的债，我一人来还。

## 场三 · 沈宅·外墙 · 夜 · 雨将至

雷声大作，第一滴雨落下。无数火把自巷口涌来，将沈宅团团围住。少年沈砚被父亲推入暗格，门缝里只看见满院火光。

沈父（嘶哑）：活下去——十年后，去青冥城，点亮那盏灯。

少年沈砚（嘶喊）：父亲！`,

  e2: `# 第二集 · 故人来

## 场一 · 江畔·渡口 · 晨 · 雾

晨雾锁江。沈砚一袭玄衫立于渡口，左手按剑。陆船夫撑一叶小舟靠岸，斗笠下左眼疤痕隐现。

陆船夫（试探）：客官要过江？这雾里……对岸就是青冥城地界了。

沈砚（淡淡）：等一个人。她说，会在惊蛰后第十日来寻我。

## 场二 · 渡口·茶棚 · 日

破旧茶棚。一袭月白裙衫的女子撑伞而来，眼角一点泪痣。她将一枚锈迹斑斑的铜灯芯放在桌上。

苏陌（轻声）：沈砚，认得它么？这是青冥灯的灯芯，你父亲临终前托我交给你。

沈砚（瞳孔微缩）：……你是谁？为何在他身边。

## 场三 · 江上·小舟 · 暮

暮色四合，小舟驶向对岸。苏陌为沈砚验看掌心一道旧疤，指尖沾了药粉。

苏陌（专注）：这毒在你身上压了十年，发作之日，就是旧案重见天日之时。

沈砚（望向远岸）：青冥城……我回来了。`,

  e3: `# 第三集 · 雨夜入城

## 场一 · 城门外 · 夜 · 雨

大雨。青冥城高耸的城门在闪电中显出轮廓。沈砚立于城门前，玄色长衫已被雨水浸透，他抬头望向城楼上"青冥"二字。

陆船夫（畏缩）：客官，这城……夜里不太平，您当真要进去？

沈砚（不回头）：我等的人，在里面。

## 场二 · 城内长街 · 夜 · 雨

长街空寂，灯笼在雨中摇晃。沈砚撑伞缓行，水洼倒映出他的身影。一道红影自街角掠过。

苏陌（旁白）：他不知道，从踏入城门那一刻起，有人已经等了他整整十年。

## 场三 · 客栈二楼 · 夜

燕三娘推开窗，看着楼下那个撑伞的身影，神色复杂。烛火摇曳，映出她半边脸。

燕三娘（低语）：沈家的人……终于回来了。`,

  e4: `# 第四集 · 长街杀

## 场一 · 青冥城·长街 · 夜

长街灯笼忽明忽灭。一道红影自屋脊扑下，刀光直取沈砚后心。沈砚侧身拔剑，火星四溅。

红衣刺客（厉声）：沈家余孽，也敢回青冥城！

沈砚（冷然）：十年了，终于有人肯露面了。

## 场二 · 长街·药铺檐下 · 夜

苏陌自檐下掷出一把药粉，刺客掩面踉跄。沈砚趁势进逼，剑抵其咽喉，挑落其面巾——竟是一张熟悉的脸。

苏陌（急喝）：别杀他！他认得当年纵火的人！

红衣刺客（狞笑）：你以为……点灯的就只有你一个沈家人么？

## 场三 · 长街·尽头 · 夜 · 雨

刺客咬破毒囊，倒地气绝。雨水冲开他怀中半幅烧焦的画卷，上面赫然是沈宅起火那夜的图景。沈砚拾起残卷，指节发白。

沈砚（低声）：这火……是有人画好了，才烧的。`,

  e5: `# 第五集 · 旧案

## 场一 · 客栈·二楼雅间 · 夜

烛火映照。燕三娘红衣描金，将一壶酒重重搁下，眼底翻涌往事。

燕三娘（冷笑）：十年前那把火，烧的不止沈家。当年签字封案的人，如今就坐在城主府里。

沈砚（盯着她）：你为何要帮我？

## 场二 · 客栈·账房 · 夜

苏陌借烛光比对那半幅焦卷与一册旧卷宗，指尖停在一枚朱红官印上。

苏陌（声音发紧）：青冥城旧案卷宗，结案当夜便被人篡改。这印……是城主亲笔。

燕三娘（在门口）：所以他们才怕你回来——怕这盏灯，照出他们的脸。

## 场三 · 城主府·高墙外 · 夜 · 雨

雨夜，沈砚仰望城主府森严的高墙，墙内灯火通明。他将焦卷收入怀中，左手按剑。

沈砚（自语）：父亲，旧案我已经看见了。接下来，该点灯了。`,

  e6: `# 第六集 · 青冥灯

## 场一 · 城主府·正殿 · 夜

正殿森然。城主高坐，沈砚提剑而入，苏陌、燕三娘随后。沈砚将铜灯芯举起。

城主（强自镇定）：沈家的孽种，你以为一盏破灯能翻得了案？

沈砚（一字一句）：这灯一亮，十年前谁纵的火，满城都会看见。

## 场二 · 城主府·正殿 · 夜 · 灯起

沈砚以灯芯点燃殿中青冥古灯。幽蓝灯火腾起，墙上映出当年纵火、封案、灭口的重重黑影。城主面如死灰，连连后退。

苏陌（扬声）：人证、物证、旧卷俱在。城主，你认是不认？

城主（嘶吼）：来人——给我灭了那盏灯！

## 场三 · 城主府·殿前广场 · 黎明

混战平息。黎明破晓，青冥灯仍在风雨后幽幽燃着。沈砚收剑，望向天边初白。苏陌立于他身侧，眼角泪痣在晨光里很轻。

燕三娘（远远）：天亮了。青冥城这一页，总算翻过去了。

沈砚（轻声）：父亲，灯，我点亮了。`,
};

// 把剧本挂到对应剧集上，供 store / seed / 页面读取。
episodes.forEach((e) => { e.script = scripts[e.id] ?? ''; });

export const scenes: Scene[] = [
  { id: 's1', episode: 'e3', title: '场一 · 城门外', loc: '青冥城·城门', mood: '压抑 / 肃杀', time: '夜·雨', chars: ['c_shen', 'c_lao'] },
  { id: 's2', episode: 'e3', title: '场二 · 长街', loc: '青冥城·长街', mood: '诡谲 / 孤寂', time: '夜·雨', chars: ['c_shen', 'c_su'] },
  { id: 's3', episode: 'e3', title: '场三 · 客栈', loc: '青冥城·客栈二楼', mood: '隐秘 / 复杂', time: '夜', chars: ['c_yan'] },
];

const mkPrompt = (o: Partial<PromptFields>): PromptFields => ({ visual: '', dialogue: '', voiceover: '', soundEffects: '', cameraPosition: '', cameraMovement: '', ...o });
const mkParams = (o: Partial<ShotParams>): ShotParams => ({ resolution: '1080p', ratio: '16:9', duration: 5, generateAudio: false, webSearch: false, watermark: false, ...o });

export const shots: Shot[] = [
  { id: 'sh1', scene: 's1', index: 1, status: 'generated', model: 'seedance-2.0', chars: ['c_shen', 'c_lao'], keyframe: true, assignee: 'u_qi', tone: 'b', prompt: mkPrompt({ visual: '暴雨夜，青冥城巨大城门在闪电下显出轮廓，仰拍，城楼"青冥"匾额特写后拉', cameraPosition: '大远景·仰拍', cameraMovement: '缓推 + 闪电定格', soundEffects: '暴雨、闷雷、城门吱呀', voiceover: '十年了，他终究还是回来了。' }), params: mkParams({ duration: 6, generateAudio: true }), beats: [{ from: 0, to: 3, action: '暴雨夜，城门在闪电下显出轮廓，仰拍缓推' }, { from: 3, to: 6, action: '"青冥"匾额特写后拉，雷声渐弱' }] },
  { id: 'sh2', scene: 's1', index: 2, status: 'generated', model: 'seedance-2.0', chars: ['c_shen'], keyframe: true, assignee: 'u_qi', tone: 'b', prompt: mkPrompt({ visual: '沈砚立于城门前，玄色长衫被雨浸透，背影，水珠从伞沿滑落', dialogue: '我等的人，在里面。', cameraPosition: '中景·背身', cameraMovement: '固定·浅景深', soundEffects: '雨声、衣料滴水' }), params: mkParams({ duration: 5 }), beats: [{ from: 0, to: 2, action: '沈砚立于城门前，背影，玄色长衫被雨浸透' }, { from: 2, to: 5, action: '水珠从伞沿滑落，他低声开口' }] },
  { id: 'sh3', scene: 's1', index: 3, status: 'generated', model: 'seedance-2.0-fast', chars: ['c_lao'], keyframe: true, assignee: 'u_qi', tone: 'c', prompt: mkPrompt({ visual: '陆船夫蓑衣斗笠，畏缩着抬头，雨水顺斗笠流下，左眼疤痕在闪电中清晰', dialogue: '客官，这城夜里不太平……', cameraPosition: '近景·侧脸', cameraMovement: '轻微手持晃动', soundEffects: '雨打斗笠' }), params: mkParams({ duration: 4 }) },
  { id: 'sh4', scene: 's1', index: 4, status: 'generated', model: 'seedance-2.0', chars: ['c_shen'], keyframe: true, assignee: 'u_qi', tone: 'd', prompt: mkPrompt({ visual: '沈砚抬眸望向城楼，雨幕中目光沉静，眼神特写', cameraPosition: '特写·眼部', cameraMovement: '极缓推近', soundEffects: '雷声渐弱' }), params: mkParams({ duration: 4 }) },
  { id: 'sh5', scene: 's2', index: 5, status: 'running', model: 'seedance-2.0', chars: ['c_shen'], keyframe: true, assignee: 'u_qi', tone: 'b', progress: 62, prompt: mkPrompt({ visual: '长街空寂，红灯笼在雨中摇晃，沈砚撑伞缓行，地面水洼倒映身影', cameraPosition: '全景·跟拍', cameraMovement: '横向轨道跟移', soundEffects: '脚步踏水、灯笼吱呀' }), params: mkParams({ duration: 6, generateAudio: true }) },
  { id: 'sh6', scene: 's2', index: 6, status: 'queued', model: 'seedance-2.0', chars: ['c_su'], keyframe: true, assignee: 'u_qi', tone: 'a', prompt: mkPrompt({ visual: '街角一道红影一闪而过，只留残影与飞溅的雨水', cameraPosition: '中景·街角', cameraMovement: '快速摇镜', soundEffects: '衣袂破空' }), params: mkParams({ duration: 3 }) },
  { id: 'sh7', scene: 's2', index: 7, status: 'failed', model: 'seedance-2.0', chars: ['c_shen', 'c_su'], keyframe: false, assignee: 'u_chen', tone: 'b', error: '参考图与角色资产冲突', prompt: mkPrompt({ visual: '水洼倒影中，沈砚身后多出一道模糊红影，水面泛起涟漪', cameraPosition: '俯拍·水面', cameraMovement: '俯视下降', soundEffects: '水滴入洼' }), params: mkParams({ duration: 4 }) },
  { id: 'sh8', scene: 's3', index: 8, status: 'draft', model: 'seedance-2.0', chars: ['c_yan'], keyframe: false, assignee: null, tone: 'c', prompt: mkPrompt({ visual: '燕三娘推开木窗，烛火映出半边脸，神色复杂地望向楼下', dialogue: '沈家的人……终于回来了。', cameraPosition: '近景·窗内', cameraMovement: '固定·烛光闪烁' }), params: mkParams({ duration: 5 }) },
  { id: 'sh9', scene: 's3', index: 9, status: 'draft', model: 'seedance-2.0', chars: ['c_yan'], keyframe: false, assignee: null, tone: 'd', prompt: mkPrompt({ visual: '从二楼窗口俯视，楼下撑伞的沈砚身影在雨中渐行渐远', cameraPosition: '大全景·俯拍', cameraMovement: '固定·雨幕前景', soundEffects: '雨声、远处更鼓' }), params: mkParams({ duration: 6 }) },
  { id: 'sh10', scene: 's3', index: 10, status: 'draft', model: 'seedance-2.0', chars: [], keyframe: false, assignee: null, tone: 'a', prompt: mkPrompt({ visual: '空镜：客栈灯笼在雨夜中明灭，镜头拉远至整座青冥城笼罩在雨雾里', cameraPosition: '空镜·大远景', cameraMovement: '持续后拉上升', soundEffects: '雨声渐起、配乐进' }), params: mkParams({ duration: 7, generateAudio: true }) },
];

// Generated shots already have a downloadable video (按 taskid 回写的视频信息)。
shots.forEach((s) => { if (s.status === 'generated' && !s.videoUrl) s.videoUrl = `https://demo.cdn/manju/${s.id}.mp4`; });

export const tasks: GenerationTask[] = [
  { id: 'tk_8821', shot: 'sh5', shotIdx: 5, ep: 'e3', cap: 'image-to-video', model: 'seedance-2.0', state: 'running', progress: 62, cost: 240, by: 'u_qi', created: mins(2), ptid: 'cgt-7f3a91' },
  { id: 'tk_8820', shot: 'sh6', shotIdx: 6, ep: 'e3', cap: 'text-to-video', model: 'seedance-2.0', state: 'queued', progress: 0, cost: 120, by: 'u_qi', created: mins(3), ptid: 'cgt-7f3a72' },
  { id: 'tk_8814', shot: 'sh7', shotIdx: 7, ep: 'e3', cap: 'image-to-video', model: 'seedance-2.0', state: 'failed', progress: 0, cost: 0, by: 'u_chen', created: mins(28), ptid: 'cgt-7f38d0', error: '参考图与角色资产冲突 (ref_conflict)' },
  { id: 'tk_8809', shot: 'sh4', shotIdx: 4, ep: 'e3', cap: 'image-to-video', model: 'seedance-2.0', state: 'succeeded', progress: 100, cost: 160, by: 'u_qi', created: mins(52), ptid: 'cgt-7f3601' },
  { id: 'tk_8808', shot: 'sh3', shotIdx: 3, ep: 'e3', cap: 'image-to-video', model: 'seedance-2.0-fast', state: 'succeeded', progress: 100, cost: 90, by: 'u_qi', created: mins(58), ptid: 'cgt-7f35aa' },
  { id: 'tk_8802', shot: 'sh2', shotIdx: 2, ep: 'e3', cap: 'image-to-video', model: 'seedance-2.0', state: 'succeeded', progress: 100, cost: 200, by: 'u_qi', created: mins(74), ptid: 'cgt-7f3410' },
  { id: 'tk_8801', shot: 'sh1', shotIdx: 1, ep: 'e3', cap: 'text-to-video', model: 'seedance-2.0', state: 'succeeded', progress: 100, cost: 280, by: 'u_qi', created: mins(88), ptid: 'cgt-7f33f1' },
  { id: 'tk_8788', shot: 'sh12', shotIdx: 9, ep: 'e4', cap: 'image-to-video', model: 'seedance-2.0', state: 'succeeded', progress: 100, cost: 200, by: 'u_chen', created: mins(220), ptid: 'cgt-7f30aa' },
];

export const models: VideoModel[] = [
  { id: 'seedance-2.0', label: 'Seedance 2.0', provider: 'volcengine', caps: ['text-to-video', 'image-to-video', 'text-to-image'], res: ['480p', '720p', '1080p', '4K'], ratios: ['16:9', '9:16', '21:9', '1:1', '4:3'], dur: [3, 12], refImg: true, refVid: true, refAud: true, audio: true, charAsset: true, base: 40 },
  { id: 'seedance-2.0-fast', label: 'Seedance 2.0 Fast', provider: 'volcengine', caps: ['text-to-video', 'image-to-video'], res: ['480p', '720p', '1080p'], ratios: ['16:9', '9:16', '1:1'], dur: [3, 8], refImg: true, refVid: false, refAud: false, audio: true, charAsset: true, base: 22 },
  { id: 'seedance-lite', label: 'Seedance Lite', provider: 'volcengine', caps: ['text-to-image'], res: ['720p', '1080p'], ratios: ['16:9', '9:16', '1:1'], dur: [0, 0], refImg: true, refVid: false, refAud: false, audio: false, charAsset: false, base: 8 },
];

export const audit: AuditEntry[] = [
  { id: 'a1', actor: 'u_qi', action: 'shot.generate', target: 'Shot #05 雨夜入城', diff: '提交 image-to-video · 预扣 240 积分', time: mins(2), src: 'Web' },
  { id: 'a2', actor: 'u_qi', action: 'shot.generate', target: 'Shot #06 雨夜入城', diff: '提交 text-to-video · 预扣 120 积分', time: mins(3), src: 'Web' },
  { id: 'a3', actor: 'u_chen', action: 'shot.write', target: 'Shot #07 雨夜入城', diff: '编辑画面提示词 + 机位', time: mins(26), src: 'Web' },
  { id: 'a4', actor: 'u_zhou', action: 'member.invite', target: '阿杞 (creator)', diff: '邀请加入工作空间 · 角色 创作者', time: mins(120), src: 'Web' },
  { id: 'a5', actor: 'u_lin', action: 'credential.write', target: '火山方舟 凭据', diff: '更新 APIKey（密文）', time: mins(300), src: 'Web' },
  { id: 'a6', actor: 'u_lin', action: 'billing.topup', target: '团队钱包', diff: '+ 50,000 积分', time: mins(1440), src: 'Web' },
];

export const assets: Asset[] = (() => {
  const raw: [Asset['kind'], Tone, string][] = [
    ['image', 'a', '320 KB'], ['video', 'b', '12.4 MB'], ['audio', 'c', '1.8 MB'], ['video', 'd', '8.9 MB'],
    ['image', 'b', '512 KB'], ['video', 'a', '15.1 MB'], ['image', 'c', '288 KB'], ['video', 'd', '6.2 MB'],
    ['audio', 'a', '2.4 MB'], ['video', 'b', '9.7 MB'], ['image', 'd', '440 KB'], ['video', 'c', '11.0 MB'],
  ];
  const ext: Record<Asset['kind'], string> = { image: 'png', video: 'mp4', audio: 'mp3' };
  const label: Record<Asset['kind'], string> = { image: 'IMG', video: 'VIDEO', audio: 'AUDIO' };
  return raw.map(([kind, tone, size], i) => ({
    id: 'as_' + (i + 1), name: `${label[kind]}_${String(i + 1).padStart(3, '0')}`, kind, ext: ext[kind], tone, store: 'R2', size, created: mins(30 + i * 47),
  }));
})();

export const nameOf = (id: string) => members.find((m) => m.id === id)?.name || '—';
export const charOf = (id: string) => characters.find((c) => c.id === id);
