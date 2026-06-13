export function timeLeft(endsAt: number): string {
  const ms = endsAt - Date.now();
  if (ms <= 0) return '已結束';
  const h = Math.floor(ms / (1000 * 60 * 60));
  const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (h > 0) return `剩 ${h} 小時 ${m} 分`;
  return `剩 ${m} 分`;
}

export function timeAgo(ts: number): string {
  const ms = Date.now() - ts;
  const h = Math.floor(ms / (1000 * 60 * 60));
  if (h < 1) return '剛剛';
  if (h < 24) return `${h} 小時前`;
  const d = Math.floor(h / 24);
  return `${d} 天前`;
}
