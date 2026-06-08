/* data.jsx — mock domain data + helpers. window.DATA, window.uid, window.fmt */
(function () {
  const uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 8);
  window.uid = uid;

  const fmt = {
    credits: (n) => n.toLocaleString('en-US'),
    time: (d) => { const x = new Date(d); return x.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); },
    ago: (d) => {
      const s = (Date.now() - new Date(d)) / 1000;
      if (s < 60) return '刚刚';
      if (s < 3600) return Math.floor(s / 60) + ' 分钟前';
      if (s < 86400) return Math.floor(s / 3600) + ' 小时前';
      return Math.floor(s / 86400) + ' 天前';
    },
    dur: (s) => `${s}s`,
  };
  window.fmt = fmt;

  const now = Date.now();
  const mins = (m) => new Date(now - m * 60000).toISOString();

  // ---------- workspace & members ----------
  const team = { name: '青冥工作室', slug: 'qingming', plan: '团队版' };

  const members = [
    { id: 'u_lin',  name: '林深',   email: 'linshen@qm.studio',  role: 'owner',    title: '主理人 / 导演', online: true },
    { id: 'u_zhou', name: '周宴',   email: 'zhouyan@qm.studio',  role: 'admin',    title: '制片管理',     online: true },
    { id: 'u_su',   name: '苏拾光', email: 'sushi@qm.studio',    role: 'director', title: '分镜导演',     online: true },
    { id: 'u_chen', name: '陈默',   email: 'chenmo@qm.studio',   role: 'creator',  title: '原画 / 创作',  online: false },
    { id: 'u_qi',   name: '阿杞',   email: 'aqi@qm.studio',      role: 'creator',  title: '生成 / 创作',  online: true },
    { id: 'u_gu',   name: '顾辞',   email: 'guci@qm.studio',     role: 'reviewer', title: '内容审核',     online: false },
    { id: 'u_man',  name: '小满',   email: 'xiaoman@qm.studio',  role: 'viewer',   title: '运营观察',     online: false },
  ];
  const me = members[0];

  const ROLE_LABEL = { owner: '拥有者', admin: '管理员', director: '导演', creator: '创作者', reviewer: '审核', viewer: '观察者' };

  // ---------- wallet ----------
  const wallet = { balance: 48260, monthSpent: 21740, monthBudget: 60000 };

  // ---------- characters ----------
  const characters = [
    { id: 'c_shen', name: '沈砚',   project: 'p_qm', tone: 'b', voice: '青年·清冷男声', tag: '男主', refs: 4, asset: 'asset://qm/shen-yan-v3', desc: '玄色长衫，眉目沉静，剑客出身，惯用左手。' },
    { id: 'c_su',   name: '苏陌',   project: 'p_qm', tone: 'a', voice: '少女·温润女声', tag: '女主', refs: 5, asset: 'asset://qm/su-mo-v2',   desc: '月白裙衫，发束玉簪，医毒双修，眼角有泪痣。' },
    { id: 'c_lao',  name: '陆船夫', project: 'p_qm', tone: 'c', voice: '老年·沙哑男声', tag: '配角', refs: 2, asset: '',                       desc: '蓑衣斗笠，常年行船，左眼有疤。' },
    { id: 'c_yan',  name: '燕三娘', project: 'p_qm', tone: 'd', voice: '成年·爽利女声', tag: '配角', refs: 3, asset: 'asset://qm/yan-3rd',     desc: '客栈掌柜，红衣描金，泼辣机敏。' },
  ];

  // ---------- projects ----------
  const projects = [
    { id: 'p_qm',  name: '青冥录',     tone: 'b', style: ['国风', '仙侠', '水墨'],   ratio: '16:9', res: '1080p', episodes: 6, status: 'producing', updated: mins(48),   synopsis: '剑客沈砚雨夜入青冥城，卷入一桩十年前的旧案。', members: ['u_lin','u_su','u_chen','u_qi','u_gu'] },
    { id: 'p_yj',  name: '雾隐食肆',   tone: 'c', style: ['治愈', '日常', '美食'],   ratio: '16:9', res: '1080p', episodes: 12, status: 'producing', updated: mins(180),  synopsis: '深巷小馆，每道菜背后都藏着一段都市怪谈。', members: ['u_lin','u_chen','u_man'] },
    { id: 'p_xc',  name: '星轨补完计划', tone: 'a', style: ['科幻', '赛博', '悬疑'], ratio: '21:9', res: '4K',    episodes: 4,  status: 'review',    updated: mins(620),  synopsis: '2099 年，记忆可被剪辑，一名修复师发现了不该存在的片段。', members: ['u_lin','u_zhou','u_qi'] },
    { id: 'p_hd',  name: '海岛旧事',   tone: 'd', style: ['言情', '怀旧'],          ratio: '9:16', res: '1080p', episodes: 8,  status: 'published',  updated: mins(2600), synopsis: '一座即将拆迁的海岛小镇，三代人的夏天。', members: ['u_lin','u_su'] },
  ];

  // ---------- episodes for 青冥录 ----------
  const episodes = [
    { id: 'e1', project: 'p_qm', index: 1, title: '惊蛰',     status: 'published', shots: 14, done: 14, updated: mins(4200), assignee: 'u_su' },
    { id: 'e2', project: 'p_qm', index: 2, title: '故人来',   status: 'published', shots: 16, done: 16, updated: mins(3600), assignee: 'u_su' },
    { id: 'e3', project: 'p_qm', index: 3, title: '雨夜入城', status: 'producing', shots: 10, done: 4,  updated: mins(48),   assignee: 'u_qi' },
    { id: 'e4', project: 'p_qm', index: 4, title: '长街杀',   status: 'review',    shots: 12, done: 12, updated: mins(220),  assignee: 'u_chen' },
    { id: 'e5', project: 'p_qm', index: 5, title: '旧案',     status: 'draft',     shots: 0,  done: 0,  updated: mins(900),  assignee: 'u_su' },
    { id: 'e6', project: 'p_qm', index: 6, title: '青冥灯',   status: 'draft',     shots: 0,  done: 0,  updated: mins(1400), assignee: null },
  ];

  // ---------- script (episode 3) ----------
  const script = {
    episode: 'e3',
    version: 7,
    updatedBy: 'u_qi',
    content: `# 第三集 · 雨夜入城

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
  };

  const scenes = [
    { id: 's1', title: '场一 · 城门外', loc: '青冥城·城门', mood: '压抑 / 肃杀', time: '夜·雨', chars: ['c_shen', 'c_lao'] },
    { id: 's2', title: '场二 · 长街',   loc: '青冥城·长街', mood: '诡谲 / 孤寂', time: '夜·雨', chars: ['c_shen', 'c_su'] },
    { id: 's3', title: '场三 · 客栈',   loc: '青冥城·客栈二楼', mood: '隐秘 / 复杂', time: '夜', chars: ['c_yan'] },
  ];

  // ---------- shots (episode 3) — the core ----------
  const mkPrompt = (o) => ({ visual: '', dialogue: '', voiceover: '', soundEffects: '', cameraPosition: '', cameraMovement: '', ...o });
  const mkParams = (o) => ({ resolution: '1080p', ratio: '16:9', duration: 5, generateAudio: false, webSearch: false, watermark: false, ...o });

  const shots = [
    { id: 'sh1', scene: 's1', index: 1, status: 'generated', model: 'seedance-2.0', chars: ['c_shen','c_lao'], keyframe: true, assignee: 'u_qi', tone: 'b',
      prompt: mkPrompt({ visual: '暴雨夜，青冥城巨大城门在闪电下显出轮廓，仰拍，城楼"青冥"匾额特写后拉', cameraPosition: '大远景·仰拍', cameraMovement: '缓推 + 闪电定格', soundEffects: '暴雨、闷雷、城门吱呀', voiceover: '十年了，他终究还是回来了。' }),
      params: mkParams({ duration: 6, generateAudio: true }) },
    { id: 'sh2', scene: 's1', index: 2, status: 'generated', model: 'seedance-2.0', chars: ['c_shen'], keyframe: true, assignee: 'u_qi', tone: 'b',
      prompt: mkPrompt({ visual: '沈砚立于城门前，玄色长衫被雨浸透，背影，水珠从伞沿滑落', dialogue: '我等的人，在里面。', cameraPosition: '中景·背身', cameraMovement: '固定·浅景深', soundEffects: '雨声、衣料滴水' }),
      params: mkParams({ duration: 5 }) },
    { id: 'sh3', scene: 's1', index: 3, status: 'generated', model: 'seedance-2.0-fast', chars: ['c_lao'], keyframe: true, assignee: 'u_qi', tone: 'c',
      prompt: mkPrompt({ visual: '陆船夫蓑衣斗笠，畏缩着抬头，雨水顺斗笠流下，左眼疤痕在闪电中清晰', dialogue: '客官，这城夜里不太平……', cameraPosition: '近景·侧脸', cameraMovement: '轻微手持晃动', soundEffects: '雨打斗笠' }),
      params: mkParams({ duration: 4 }) },
    { id: 'sh4', scene: 's1', index: 4, status: 'generated', model: 'seedance-2.0', chars: ['c_shen'], keyframe: true, assignee: 'u_qi', tone: 'd',
      prompt: mkPrompt({ visual: '沈砚抬眸望向城楼，雨幕中目光沉静，眼神特写', cameraPosition: '特写·眼部', cameraMovement: '极缓推近', soundEffects: '雷声渐弱' }),
      params: mkParams({ duration: 4 }) },
    { id: 'sh5', scene: 's2', index: 5, status: 'running', model: 'seedance-2.0', chars: ['c_shen'], keyframe: true, assignee: 'u_qi', tone: 'b', progress: 62,
      prompt: mkPrompt({ visual: '长街空寂，红灯笼在雨中摇晃，沈砚撑伞缓行，地面水洼倒映身影', cameraPosition: '全景·跟拍', cameraMovement: '横向轨道跟移', soundEffects: '脚步踏水、灯笼吱呀' }),
      params: mkParams({ duration: 6, generateAudio: true }) },
    { id: 'sh6', scene: 's2', index: 6, status: 'queued', model: 'seedance-2.0', chars: ['c_su'], keyframe: true, assignee: 'u_qi', tone: 'a',
      prompt: mkPrompt({ visual: '街角一道红影一闪而过，只留残影与飞溅的雨水', cameraPosition: '中景·街角', cameraMovement: '快速摇镜', soundEffects: '衣袂破空' }),
      params: mkParams({ duration: 3 }) },
    { id: 'sh7', scene: 's2', index: 7, status: 'failed', model: 'seedance-2.0', chars: ['c_shen','c_su'], keyframe: false, assignee: 'u_chen', tone: 'b', error: '参考图与角色资产冲突',
      prompt: mkPrompt({ visual: '水洼倒影中，沈砚身后多出一道模糊红影，水面泛起涟漪', cameraPosition: '俯拍·水面', cameraMovement: '俯视下降', soundEffects: '水滴入洼' }),
      params: mkParams({ duration: 4 }) },
    { id: 'sh8', scene: 's3', index: 8, status: 'draft', model: 'seedance-2.0', chars: ['c_yan'], keyframe: false, assignee: null, tone: 'c',
      prompt: mkPrompt({ visual: '燕三娘推开木窗，烛火映出半边脸，神色复杂地望向楼下', dialogue: '沈家的人……终于回来了。', cameraPosition: '近景·窗内', cameraMovement: '固定·烛光闪烁', voiceover: '' }),
      params: mkParams({ duration: 5 }) },
    { id: 'sh9', scene: 's3', index: 9, status: 'draft', model: 'seedance-2.0', chars: ['c_yan'], keyframe: false, assignee: null, tone: 'd',
      prompt: mkPrompt({ visual: '从二楼窗口俯视，楼下撑伞的沈砚身影在雨中渐行渐远', cameraPosition: '大全景·俯拍', cameraMovement: '固定·雨幕前景', soundEffects: '雨声、远处更鼓' }),
      params: mkParams({ duration: 6 }) },
    { id: 'sh10', scene: 's3', index: 10, status: 'draft', model: 'seedance-2.0', chars: [], keyframe: false, assignee: null, tone: 'a',
      prompt: mkPrompt({ visual: '空镜：客栈灯笼在雨夜中明灭，镜头拉远至整座青冥城笼罩在雨雾里', cameraPosition: '空镜·大远景', cameraMovement: '持续后拉上升', soundEffects: '雨声渐起、配乐进' }),
      params: mkParams({ duration: 7, generateAudio: true }) },
  ];

  // ---------- generation tasks ----------
  const tasks = [
    { id: 'tk_8821', shot: 'sh5', shotIdx: 5, ep: 'e3', cap: 'image-to-video', model: 'seedance-2.0',      state: 'running',   progress: 62, cost: 240, by: 'u_qi',   created: mins(2),   ptid: 'cgt-7f3a91' },
    { id: 'tk_8820', shot: 'sh6', shotIdx: 6, ep: 'e3', cap: 'text-to-video',  model: 'seedance-2.0',      state: 'queued',    progress: 0,  cost: 120, by: 'u_qi',   created: mins(3),   ptid: 'cgt-7f3a72' },
    { id: 'tk_8814', shot: 'sh7', shotIdx: 7, ep: 'e3', cap: 'image-to-video', model: 'seedance-2.0',      state: 'failed',    progress: 0,  cost: 0,   by: 'u_chen', created: mins(28),  ptid: 'cgt-7f38d0', error: '参考图与角色资产冲突 (ref_conflict)' },
    { id: 'tk_8809', shot: 'sh4', shotIdx: 4, ep: 'e3', cap: 'image-to-video', model: 'seedance-2.0',      state: 'succeeded', progress: 100, cost: 160, by: 'u_qi',  created: mins(52),  ptid: 'cgt-7f3601' },
    { id: 'tk_8808', shot: 'sh3', shotIdx: 3, ep: 'e3', cap: 'image-to-video', model: 'seedance-2.0-fast', state: 'succeeded', progress: 100, cost: 90,  by: 'u_qi',  created: mins(58), ptid: 'cgt-7f35aa' },
    { id: 'tk_8802', shot: 'sh2', shotIdx: 2, ep: 'e3', cap: 'image-to-video', model: 'seedance-2.0',      state: 'succeeded', progress: 100, cost: 200, by: 'u_qi',  created: mins(74),  ptid: 'cgt-7f3410' },
    { id: 'tk_8801', shot: 'sh1', shotIdx: 1, ep: 'e3', cap: 'text-to-video',  model: 'seedance-2.0',      state: 'succeeded', progress: 100, cost: 280, by: 'u_qi',  created: mins(88),  ptid: 'cgt-7f33f1' },
    { id: 'tk_8788', shot: 'sh12', shotIdx: 9, ep: 'e4', cap: 'image-to-video', model: 'seedance-2.0',     state: 'succeeded', progress: 100, cost: 200, by: 'u_chen', created: mins(220), ptid: 'cgt-7f30aa' },
  ];

  // ---------- models (provider-driven) ----------
  const models = [
    { id: 'seedance-2.0',      label: 'Seedance 2.0',      provider: 'volcengine', caps: ['text-to-video','image-to-video','text-to-image'], res: ['480p','720p','1080p','4K'], ratios: ['16:9','9:16','21:9','1:1','4:3'], dur: [3,12], refImg: true, refVid: true, refAud: true, audio: true, charAsset: true, base: 40 },
    { id: 'seedance-2.0-fast', label: 'Seedance 2.0 Fast', provider: 'volcengine', caps: ['text-to-video','image-to-video'], res: ['480p','720p','1080p'], ratios: ['16:9','9:16','1:1'], dur: [3,8], refImg: true, refVid: false, refAud: false, audio: true, charAsset: true, base: 22 },
    { id: 'seedance-lite',     label: 'Seedance Lite',     provider: 'volcengine', caps: ['text-to-image'], res: ['720p','1080p'], ratios: ['16:9','9:16','1:1'], dur: [0,0], refImg: true, refVid: false, refAud: false, audio: false, charAsset: false, base: 8 },
  ];

  // ---------- audit log (sample) ----------
  const audit = [
    { id: 'a1', actor: 'u_qi',   action: 'shot.generate', target: 'Shot #05 雨夜入城', diff: '提交 image-to-video · 预扣 240 积分', time: mins(2),  src: 'Web' },
    { id: 'a2', actor: 'u_qi',   action: 'shot.generate', target: 'Shot #06 雨夜入城', diff: '提交 text-to-video · 预扣 120 积分',  time: mins(3),  src: 'Web' },
    { id: 'a3', actor: 'u_chen', action: 'shot.write',    target: 'Shot #07 雨夜入城', diff: '编辑画面提示词 + 机位',               time: mins(26), src: 'Web' },
    { id: 'a4', actor: 'u_zhou', action: 'member.invite', target: '阿杞 (creator)',     diff: '邀请加入工作空间 · 角色 创作者',     time: mins(120),src: 'Web' },
    { id: 'a5', actor: 'u_lin',  action: 'credential.write', target: '火山方舟 凭据',   diff: '更新 APIKey（密文）',                 time: mins(300),src: 'Web' },
    { id: 'a6', actor: 'u_lin',  action: 'billing.topup', target: '团队钱包',           diff: '+ 50,000 积分',                       time: mins(1440),src: 'Web' },
  ];

  window.DATA = { team, members, me, ROLE_LABEL, wallet, characters, projects, episodes, script, scenes, shots, tasks, models, audit };
})();
