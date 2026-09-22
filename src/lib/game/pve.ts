import type { GameState, Monster } from './types';
import { busy, endAt, seasonAt } from './rules';
import { questionById } from './questions';
import { log, pickQuestion, random } from './simulation';

export function spawnWave(s:GameState,at:number){
 if(at+17000>endAt(s))return;
 const season=seasonAt(s,at);
 const kind:Monster['kind']=season>=3&&random(s)<.25?'boss':random(s)<.5?'doi':'dot';
 const question=pickQuestion(s,kind==='doi'?'people':'rights');
 for(const g of s.gardens){
  if(busy(s,g.id))continue;
  const slots=g.plots.map((p,i)=>({p,i})).filter(({p})=>p&&p.type===(kind==='doi'?'hanh-phuc':'tu-do'));
  const slot=slots.length?slots[Math.floor(random(s)*slots.length)].i:null;
  s.monsters.push({id:++s.serial,garden:g.id,kind,question,slot,arrivesAt:at+5000,endsAt:at+17000,botAt:at+9000});
 }
 log(s,'monster','Chiêng cảnh báo: '+(kind==='doi'?'Giặc Đói':kind==='dot'?'Giặc Dốt':'Giặc ngoại xâm')+' tới sau 5 giây. Vườn đang đấu được miễn đợt này.',at);
}
export function resolveMonster(s:GameState,m:Monster,answer:number|null,at:number){
 if(!s.monsters.some(x=>x.id===m.id))return;
 const g=s.gardens.find(g=>g.id===m.garden)!;
 const q=questionById(m.question),correct=answer===q.answer;
 let text=correct?'Vườn an toàn.':'';
 if(correct){
  if(random(s)<.3){const card=random(s)<.65?'growth':'trap';if(g.cards[card]<3){g.cards[card]++;text=card==='growth'?'+1 thẻ Tăng tốc.':'+1 thẻ Bẫy.';}}
 }else{
  const p=m.slot===null?null:g.plots[m.slot];
  if(p){const loss=Math.min(p.remaining,Math.ceil(p.remaining*.4));p.remaining-=loss;g.lost+=loss;text='Quả ô '+(m.slot!+1)+' mất '+loss+' điểm.';}
  else text='Không mất điểm.';
  if(m.kind==='boss'&&random(s)<.15){
   const tree=g.plots.find(p=>p?.type==='doc-lap');
   if(tree){const loss=Math.ceil(tree.remaining*.4);tree.remaining-=loss;g.lost+=loss;text+=' Quả Độc lập mất thêm '+loss+' điểm.';}
  }
 }
 // Damage never changes plantedAt/readyAt, so timers cannot restart.
 s.monsters=s.monsters.filter(x=>x.id!==m.id);
 if(!g.bot){log(s,'monster',text,at);s.outcome={id:++s.serial,title:correct?'Đúng · Đã đuổi quái':answer===null?'Hết giờ':'Sai đáp án',text,question:q.id,answer,correct,at};}
}
