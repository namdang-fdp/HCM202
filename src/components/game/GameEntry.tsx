'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { HappinessGame, type GameConnection } from './HappinessGame';
import type { GameAction, GameState } from '@/lib/game/types';
type Session={code:string;token:string};
type Room={code:string;roomName:string;hostId:string;selfId:string;status:'WAITING'|'PLAYING'|'FINISHED';revision:number;serverNow:number;players:{id:string;name:string}[];game:GameState|null;token?:string;message?:string};
const KEY='happiness:online-room';
async function api(path:string,session:Session|null,method='GET',body?:unknown,key?:string):Promise<Room>{
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),10000);
 try{
  const res=await fetch('/api/backend'+path,{method,cache:'no-store',signal:abort.signal,headers:{'Content-Type':'application/json',...(session?{Authorization:'Bearer '+session.token}:{}),...(key?{'Idempotency-Key':key}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  const data=await res.json().catch(()=>({message:'Không kết nối được máy chủ.'}));
  if(!res.ok)throw new Error(data.message||'Yêu cầu thất bại.');return data;
 }catch(e){if(e instanceof Error&&e.name==='AbortError')throw new Error('Máy chủ phản hồi chậm. Thử lại.');throw e;}
 finally{clearTimeout(timer);}
}
export function GameEntry(){
 const [session,setSession]=useState<Session|null>(null),[room,setRoom]=useState<Room|null>(null),[loaded,setLoaded]=useState(false),[demo,setDemo]=useState(false);
 const [roomName,setRoomName]=useState(''),[guestName,setGuestName]=useState('');
 const [name,setName]=useState(''),[code,setCode]=useState(''),[error,setError]=useState(''),[working,setWorking]=useState(false),[now,setNow]=useState(0),[notice,setNotice]=useState<{text:string;id:number}|null>(null);
 const latest=useRef<Room|null>(null),sync=useRef({server:0,performance:0}),generation=useRef(0),queue=useRef(Promise.resolve());
 useEffect(()=>{try{const value=JSON.parse(sessionStorage.getItem(KEY)||'null');if(value?.code&&value?.token)setSession(value);}catch{}setLoaded(true);},[]);
 const receive=useCallback((data:Room)=>{
  if(latest.current&&latest.current.code===data.code&&data.revision<latest.current.revision)return;
  latest.current=data;setRoom(data);sync.current={server:data.serverNow,performance:performance.now()};setNow(data.serverNow);
 },[]);
 useEffect(()=>{
  if(!session)return;const gen=++generation.current;let timer:ReturnType<typeof setTimeout>;
  const poll=async()=>{try{const data=await api('/rooms/'+session.code,session);if(generation.current!==gen)return;receive(data);setError('');}catch(e){if(generation.current===gen)setError(e instanceof Error?e.message:'Mất kết nối.');}finally{if(generation.current===gen)timer=setTimeout(poll,800);}};
  void poll();const clock=setInterval(()=>setNow(sync.current.server+performance.now()-sync.current.performance),200);
  return()=>{generation.current++;clearTimeout(timer);clearInterval(clock);};
 },[session,receive]);
 useEffect(()=>{if(!notice)return;const id=setTimeout(()=>setNotice(null),3500);return()=>clearTimeout(id);},[notice]);
 const enter=async(join:boolean)=>{
  const playerName=(join?guestName:name).trim();
  if(!playerName){setError('Nhập tên của bạn.');return;}
  if(!join&&!roomName.trim()){setError('Nhập tên phòng.');return;}
  setWorking(true);setError('');
  try{const data=await api(join?'/rooms/'+code.trim().toUpperCase()+'/join':'/rooms',null,'POST',join?{name:playerName}:{name:playerName,roomName:roomName.trim()});const next={code:data.code,token:data.token!};sessionStorage.setItem(KEY,JSON.stringify(next));latest.current=null;receive(data);setSession(next);}
  catch(e){setError(e instanceof Error?e.message:'Không vào được phòng.');}finally{setWorking(false);}
 };
 const start=async()=>{
  if(!session)return;setWorking(true);
  try{receive(await api('/rooms/'+session.code+'/start',session,'POST'));setError('');}
  catch(e){setError(e instanceof Error?e.message:'Chưa bắt đầu được.');}finally{setWorking(false);}
 };
 const leave=()=>{
  const current=session;generation.current++;setSession(null);setRoom(null);latest.current=null;sessionStorage.removeItem(KEY);setError('');setNotice(null);
  if(current)void api('/rooms/'+current.code+'/me',current,'DELETE').catch(()=>{});
 };
 const dispatch=useCallback((action:GameAction)=>{
  if(!session)return;const current=session,gen=generation.current,key=crypto.randomUUID();
  queue.current=queue.current.catch(()=>{}).then(async()=>{
   if(generation.current!==gen)return;
   try{
    let data:Room;
    try{data=await api('/rooms/'+current.code+'/actions',current,'POST',action,key);}
    catch(e){if(e instanceof TypeError)data=await api('/rooms/'+current.code+'/actions',current,'POST',action,key);else throw e;}
    if(generation.current!==gen)return;receive(data);setError('');if(data.message)setNotice({text:data.message,id:Date.now()});
   }catch(e){if(generation.current===gen)setNotice({text:e instanceof Error?e.message:'Thao tác thất bại.',id:Date.now()});}
  });
 },[session,receive]);
 if(demo)return <HappinessGame/>;
 if(!loaded)return <main className="happiness-app garden-loading"><p>Đang mở sảnh…</p></main>;
 if(session&&room?.game){
  const connection:GameConnection={state:room.game,ready:true,now,error,notice,dispatch,reset:leave,start:()=>{}};
  return <HappinessGame connection={connection}/>;
 }
 return <HappinessGame welcomePanel={<section className="garden-paper garden-join room-entry">
  {!session?<>
   <form onSubmit={e=>{e.preventDefault();void enter(false)}}>
    <h2>Mảnh vườn này<br/>đang chờ bạn.</h2>
    <label htmlFor="room-name">Tên phòng</label><input id="room-name" required maxLength={40} value={roomName} onChange={e=>setRoomName(e.target.value)} placeholder="Ví dụ: Vườn lớp SE"/>
    <label htmlFor="host-name">Tên của bạn</label><input id="host-name" required maxLength={24} value={name} onChange={e=>setName(e.target.value)} placeholder="Tên người chơi" autoComplete="nickname"/>
    <button className="garden-button primary" disabled={working} type="submit">Tạo phòng</button>
   </form>
   <form className="room-join-existing" onSubmit={e=>{e.preventDefault();void enter(true)}}>
    <h3>Đã có phòng? Vào cùng bạn bè.</h3>
    <div className="room-entry-fields"><div><label htmlFor="guest-name">Tên của bạn</label><input id="guest-name" required maxLength={24} value={guestName} onChange={e=>setGuestName(e.target.value)} placeholder="Tên người chơi"/></div><div><label htmlFor="room-code">Mã phòng</label><input id="room-code" required minLength={6} maxLength={6} value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="6 ký tự" autoComplete="off"/></div></div>
    <button className="garden-button muted" disabled={working||code.trim().length!==6} type="submit">Vào phòng</button>
   </form>
   <button className="garden-try" disabled={working} onClick={()=>setDemo(true)}>Chơi thử với bot</button>
  </>:<>
   <span className="garden-small-label">SẢNH CHỜ</span><h2>{room?.roomName||'Khu vườn của bạn'}</h2>
   <p className="room-share-code">Mã phòng <strong>{session.code}</strong></p><p className="room-entry-note">Gửi mã cho bạn bè để vào cùng phòng.</p>
   {room?<><ul className="lobby-players">{room.players.map(p=><li key={p.id}><span>{p.name}{p.id===room.selfId?' (bạn)':''}</span><small>{p.id===room.hostId?'Chủ phòng':'Đã vào'}</small></li>)}</ul><p className="room-entry-note">Đã vào {room.players.length} người · Cần ít nhất 2 người</p>{room.selfId===room.hostId?<button className="garden-button primary" disabled={working||room.players.length<2} onClick={()=>void start()}>Bắt đầu cho cả phòng</button>:<p className="lobby-wait">Chờ chủ phòng bắt đầu…</p>}</>:<p>Đang kết nối lại phòng…</p>}
   <button className="garden-try" onClick={leave}>Rời phòng</button>
  </>}
  {error&&<p className="lobby-error" role="alert">{error}</p>}{working&&<p role="status" className="room-entry-note">Đang xử lý…</p>}
 </section>}/>;
}
