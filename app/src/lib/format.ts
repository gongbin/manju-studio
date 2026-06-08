export const fmt = {
  credits: (n: number) => n.toLocaleString('en-US'),
  time: (d: string | number) =>
    new Date(d).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
  ago: (d: string | number) => {
    const s = (Date.now() - new Date(d).getTime()) / 1000;
    if (s < 60) return '刚刚';
    if (s < 3600) return `${Math.floor(s / 60)} 分钟前`;
    if (s < 86400) return `${Math.floor(s / 3600)} 小时前`;
    return `${Math.floor(s / 86400)} 天前`;
  },
  pad2: (n: number) => String(n).padStart(2, '0'),
};
