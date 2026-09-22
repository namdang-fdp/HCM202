import type { GameState, Garden, Plant, PlantType } from './types';
export const PLANT_TYPES: PlantType[] = ['doc-lap', 'tu-do', 'hanh-phuc'];
export const PLANTS = {
  'doc-lap': { name: 'Độc lập', description: 'Rễ vững, thành quả lớn.', seconds: 45, points: 120 },
  'tu-do': { name: 'Tự do', description: 'Vun bồi quyền làm chủ.', seconds: 28, points: 50 },
  'hanh-phuc': { name: 'Hạnh phúc', description: 'Mùa rau ngắn, niềm vui đều.', seconds: 16, points: 20 },
} as const;
export const SEASONS = [
  { name: 'Gieo mầm', date: '1941', unlock: 'Trồng cây, gom gỗ, xây rào. Trộm mở từ mùa 2.', lore: 'Bắt đầu từ quyền tự quyết; cùng vun trồng tự do và đời sống của con người.' },
  { name: 'Mưa rào', date: '2–3/9/1945', unlock: 'Mở đấu trộm: mỗi người 1 lượt mùa này.', lore: 'Độc lập mở ra khởi đầu. Cơm ăn và học hành là những việc phải tiếp tục chăm lo.' },
  { name: 'Xây làng', date: '10/1945–1/1946', unlock: 'Nhận lượt trộm mới. Giặc ngoại xâm có thể xuất hiện.', lore: 'Quyền cần được bảo vệ. Hạnh phúc và tự do của nhân dân đem lại ý nghĩa thực tế cho độc lập.' },
  { name: 'Đối đầu', date: '1966', unlock: 'Lượt đấu cuối. Giữ thành quả, cân bằng số quả đã hái.', lore: 'Giữ nền tảng, bảo vệ thành quả bạn đã vun trồng. Các mùa là chương kể chuyện, không mô phỏng thời gian lịch sử.' },
];
export const endAt = (s: GameState) => s.startedAt + s.duration*1000;
export const elapsed = (s: GameState, now: number) => Math.max(0, Math.min(s.duration, (now-s.startedAt)/1000));
export const seasonAt = (s: GameState, now: number) => Math.min(4, Math.floor(elapsed(s,now)/120)+1);
export const isFinished = (s: GameState, now: number) => now >= endAt(s);
export const remainingSeconds = (s: GameState,p: Plant,now: number) => Math.max(0,(p.readyAt-Math.min(now,endAt(s)))/1000);
export const progress = (s: GameState,p: Plant,now: number) => Math.min(1,Math.max(0,(Math.min(now,endAt(s))-p.plantedAt)/Math.max(1,p.readyAt-p.plantedAt)));
export const stageOf = (s: GameState,p: Plant,now: number):1|2|3|4 => Math.min(4,Math.floor(progress(s,p,now)*3)+1) as 1|2|3|4;
export const counts = (g: Garden) => PLANT_TYPES.map(t=>g.plots.filter(p=>p?.type===t).length);
export const balanced = (g: Garden) => counts(g).every(n=>n>0);
export const balanceScore = (g: Garden) => {const ns=PLANT_TYPES.map(t=>g.harvests[t]);return Math.max(...ns)?Math.round(Math.min(...ns)/Math.max(...ns)*100):0;};
export const multiplier = (g: Garden) => .5+balanceScore(g)*.015;
// score is the normalized base. PvP transfers are converted back to this base
// using each participant's own multiplier, so the displayed transfer is exact.
export const totalScore = (g: Garden) => Math.max(0,Math.round(g.score*multiplier(g)));
export const hasWoodBalance = (g: Garden) => g.plots.some(p=>p?.type==='doc-lap')&&g.plots.some(p=>p?.type==='hanh-phuc');
export const canBuild = (g: Garden) => g.wood>=3&&g.fence===0;
export const busy = (s: GameState,id: string) => s.monsters.some(m=>m.garden===id)||s.duels.some(d=>d.attacker===id||d.defender===id)||(id==='you'&&s.woodChoice!==null);
export const readyCount = (s: GameState,g: Garden,now: number) => g.plots.filter(p=>p&&progress(s,p,now)>=1).length;
export const formatTime = (seconds: number) => {const n=Math.ceil(Math.max(0,seconds));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');};
