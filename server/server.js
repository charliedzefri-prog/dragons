// Сервер мультиплеера «Легенды Дракономании»: статика + WebSocket (PvP, друзья, подбор игрока).
// Запуск: npm start (PORT из окружения — Render задаёт сам).
const http=require("http"),fs=require("fs"),path=require("path"),crypto=require("crypto");
const {WebSocketServer}=require("ws");
const PORT=process.env.PORT||8000;
const ROOT=path.join(__dirname,"..");
const DB_FILE=process.env.DB_FILE||path.join(__dirname,"db.json");
const TURN_MS=10000;
const MIME={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json",".svg":"image/svg+xml",".ico":"image/x-icon"};

// ---------- база (простой JSON) ----------
let DB={players:{}};try{DB=JSON.parse(fs.readFileSync(DB_FILE,"utf8"))}catch(e){}
{const before=Object.keys(DB.players).length;for(const id of Object.keys(DB.players)){if(!DB.players[id].user)delete DB.players[id]}for(const p of Object.values(DB.players)){p.friends=(p.friends||[]).filter(f=>DB.players[f]);p.requests=(p.requests||[]).filter(f=>DB.players[f])}const after=Object.keys(DB.players).length;if(before!==after)console.log("purged anonymous sessions:",before-after)}
let saveT=null;const saveDB=()=>{clearTimeout(saveT);saveT=setTimeout(()=>{try{fs.writeFileSync(DB_FILE,JSON.stringify(DB))}catch(e){console.error("db save",e.message)}},500)};
const code=()=>{let c;do{c=crypto.randomBytes(3).toString("hex").toUpperCase()}while(Object.values(DB.players).some(p=>p.code===c));return c};

// ---------- анти-чит: правдоподобность сохранения ----------
const MAX_GOLD_PER_SEC=400,MAX_GEMS_PER_SEC=2,MAX_SCROLLS_PER_SEC=1,LEVEL_CAP=60;
function validateSave(st,prev,p){
  if(!st||typeof st!=="object")return "неверный формат";
  const n=x=>typeof x==="number"&&isFinite(x)&&x>=0;
  if(!n(st.gold)||!n(st.gems)||!n(st.food)||!n(st.level))return "неверные значения ресурсов";
  if(st.level>LEVEL_CAP||st.gold>5e9||st.gems>5e6)return "значения вне допустимого диапазона";
  if(st.dragons){for(const [id,o] of Object.entries(st.dragons)){if(!o||o.lvl>50||o.stars>5||(o.sp||0)>5000)return "неверные данные дракона "+id;
    if(Object.values(o.tree||{}).some(t=>t.lvl>6))return "неверное древо академии"}}
  if(prev){const dt=Math.max(1,(Date.now()-(p.saveAt||Date.now()))/1000)+30; // +30 с запас
    // допустимый прирост: базовый лимит в секунду + разовые крупные награды (сундуки/кампания) 
    if(st.gold-prev.gold>MAX_GOLD_PER_SEC*dt+50000)return "слишком быстрый прирост золота";
    if(st.gems-prev.gems>MAX_GEMS_PER_SEC*dt+400)return "слишком быстрый прирост алмазов";
    if((st.scrolls||0)-(prev.scrolls||0)>MAX_SCROLLS_PER_SEC*dt+100)return "слишком быстрый прирост свитков";
    if(st.level-prev.level>Math.ceil(dt/60)+2)return "слишком быстрый рост уровня";
    const nd=Object.keys(st.dragons||{}).length-Object.keys(prev.dragons||{}).length;if(nd>Math.ceil(dt/30)+3)return "слишком много новых драконов";
  }
  return null}

// ---------- http: статика ----------
const server=http.createServer((req,res)=>{
  let u=decodeURIComponent(req.url.split("?")[0]);if(u==="/")u="/index.html";
  if(u==="/health"){res.writeHead(200,{"Content-Type":"text/plain"});return res.end("ok")}
  const f=path.normalize(path.join(ROOT,u));
  if(!f.startsWith(ROOT)||f.startsWith(path.join(ROOT,"server"))){res.writeHead(403);return res.end()}
  fs.stat(f,(e,st)=>{if(e||!st.isFile()){res.writeHead(404);return res.end("404")}
    res.writeHead(200,{"Content-Type":MIME[path.extname(f)]||"application/octet-stream","Cache-Control":u.endsWith(".mp3")?"public,max-age=86400":"no-cache"});
    fs.createReadStream(f).pipe(res)});
});

// ---------- ws ----------
const wss=new WebSocketServer({server});
const online=new Map(); // playerId -> ws
let queue=[];           // [{id,ws,power,t}]
const rooms=new Map();  // roomId -> {p:[id,id], turn:0|1, timer, seed}
const send=(ws,m)=>{if(ws&&ws.readyState===1)ws.send(JSON.stringify(m))};
const sendTo=(id,m)=>send(online.get(id),m);
const ADMINS=(process.env.ADMINS||"lulu").toLowerCase().split(",").map(x=>x.trim()).filter(Boolean);
const isAdmin=p=>!!(p&&(p.admin||(p.user&&ADMINS.includes(p.user.toLowerCase()))));
const pub=(p)=>({id:p.id,name:p.name,admin:isAdmin(p),avatar:p.avatar,power:p.power||0,rating:p.rating||1000,code:p.code,online:online.has(p.id),team:p.team||[],wins:p.wins||0,losses:p.losses||0});
function pushFriends(id){const p=DB.players[id];if(!p)return;
  sendTo(id,{t:"friends",list:(p.friends||[]).map(f=>DB.players[f]).filter(Boolean).map(pub),requests:(p.requests||[]).map(f=>DB.players[f]).filter(Boolean).map(pub)})}
function notifyFriends(id){const p=DB.players[id];if(!p)return;(p.friends||[]).forEach(f=>{if(online.has(f))pushFriends(f)})}
function leaderboard(){return Object.values(DB.players).sort((a,b)=>(b.rating||1000)-(a.rating||1000)).slice(0,20).map(pub)}

function startRoom(a,b){const room="r"+crypto.randomBytes(4).toString("hex");const seed=crypto.randomInt(1,2**31);
  const R={id:room,p:[a,b],turn:null,timer:null,seed,started:Date.now()};rooms.set(room,R);
  [a,b].forEach((id,i)=>{const me=DB.players[id],opp=DB.players[i?a:b];me.room=room;sendTo(id,{t:"match",room,you:i,seed,opp:pub(opp),me:pub(me)})});
  console.log("match",a,"vs",b)}
function armTimer(R){clearTimeout(R.timer);R.timer=setTimeout(()=>{R.p.forEach(id=>sendTo(id,{t:"timeout",turn:R.turn,n:R.turnNo}))},TURN_MS+700)}
function endRoom(R,reason,loser){if(!rooms.has(R.id))return;clearTimeout(R.timer);rooms.delete(R.id);R.p.forEach(id=>{const p=DB.players[id];if(p&&p.room===R.id)p.room=null;sendTo(id,{t:"room_end",reason,loser})})}

wss.on("connection",ws=>{
  let me=null;ws.isAlive=true;ws.on("pong",()=>ws.isAlive=true);
  ws.on("message",raw=>{let m;try{m=JSON.parse(raw)}catch(e){return}
    // ---- аккаунты: регистрация / вход / сессия ----
    const finishLogin=(p)=>{me=p;p.avatar=m.avatar||p.avatar;p.power=m.power|0;p.team=(m.team||[]).slice(0,3);p.last=Date.now();
      const old=online.get(p.id);if(old&&old!==ws){send(old,{t:"kicked"});try{old.close()}catch(e){}}
      online.set(p.id,ws);saveDB();
      send(ws,{t:"welcome",me:pub(p),token:p.token,online:online.size,top:leaderboard(),save:p.save||null,saveAt:p.saveAt||null});pushFriends(p.id);notifyFriends(p.id)};
    if(m.t==="register"){const u=String(m.user||"").trim();const pw=String(m.pass||"");
      if(!/^[A-Za-zА-Яа-яЁё0-9_]{3,16}$/.test(u)){send(ws,{t:"auth_err",msg:"Имя: 3–16 символов, буквы/цифры/_"});return}
      if(pw.length<4){send(ws,{t:"auth_err",msg:"Пароль минимум 4 символа"});return}
      if(Object.values(DB.players).some(x=>x.user&&x.user.toLowerCase()===u.toLowerCase())){send(ws,{t:"auth_err",msg:"Имя уже занято"});return}
      const salt=crypto.randomBytes(8).toString("hex");const hash=crypto.scryptSync(pw,salt,32).toString("hex");
      const id="p"+crypto.randomBytes(5).toString("hex");const p=DB.players[id]={id,user:u,name:u,salt,hash,token:crypto.randomBytes(16).toString("hex"),code:code(),avatar:"av0",rating:1000,friends:[],requests:[],wins:0,losses:0,created:Date.now()};
      finishLogin(p);return}
    if(m.t==="login"){const u=String(m.user||"").trim().toLowerCase();const pw=String(m.pass||"");
      const p=Object.values(DB.players).find(x=>x.user&&x.user.toLowerCase()===u);
      if(!p||crypto.scryptSync(pw,p.salt,32).toString("hex")!==p.hash){send(ws,{t:"auth_err",msg:"Неверное имя или пароль"});return}
      if(p.banned){send(ws,{t:"auth_err",msg:"Аккаунт заблокирован"});return}
      p.token=crypto.randomBytes(16).toString("hex"); // новая сессия, старые обнуляются
      finishLogin(p);return}
    if(m.t==="hello"){const p=m.token&&Object.values(DB.players).find(x=>x.token===m.token&&x.user);
      if(!p){send(ws,{t:"need_auth"});return}finishLogin(p);return}
    if(m.t==="logout"){if(me){me.token=crypto.randomBytes(16).toString("hex");saveDB();online.delete(me.id);notifyFriends(me.id);me=null}send(ws,{t:"need_auth"});return}
    if(!me)return;
    if(m.t==="profile"){me.name=String(m.name||me.name).slice(0,20);me.avatar=m.avatar||me.avatar;me.power=m.power|0;me.team=(m.team||[]).slice(0,3);saveDB();notifyFriends(me.id);send(ws,{t:"me",me:pub(me)});return}
    if(m.t==="save"){if(typeof m.data!=="string"||m.data.length>400000)return;let st;try{st=JSON.parse(m.data)}catch(e){return}
      const prev=me.save?JSON.parse(me.save):null;const bad=validateSave(st,prev,me);
      if(bad){me.flags=(me.flags||0)+1;me.lastFlag={t:Date.now(),why:bad};saveDB();send(ws,{t:"save_rejected",msg:bad,data:me.save||null});console.log("save rejected",me.user,bad);return}
      // сервер сам держит рейтинг и имя — клиент их не переписывает
      if(st.pvp)st.pvp.rating=me.rating||1000;if(st.profile)st.profile.name=me.name;
      me.save=JSON.stringify(st);me.saveAt=Date.now();me.level=st.level;me.gold=st.gold;me.gems=st.gems;saveDB();send(ws,{t:"save_ok"});return}
    if(m.t==="save_reset"){me.save=null;me.saveAt=Date.now();saveDB();return}
    // ---- админ ----
    if(m.t&&m.t.startsWith("admin_")){if(!isAdmin(me)){send(ws,{t:"err",msg:"Нет прав"});return}
      const list=()=>send(ws,{t:"admin_data",online:online.size,players:Object.values(DB.players).map(p=>({...pub(p),level:p.level,gold:p.gold,gems:p.gems,flags:p.flags||0,banned:!!p.banned,user:p.user,last:p.last})),raw:DB.players});
      const tgt=DB.players[m.id];
      if(m.t==="admin_list"){list();return}
      if(m.t==="admin_broadcast"){online.forEach(w=>send(w,{t:"broadcast",msg:String(m.msg||"").slice(0,500)}));send(ws,{t:"admin_ok",msg:"Отправлено"});return}
      if(!tgt){send(ws,{t:"err",msg:"Игрок не найден"});return}
      const patchSave=(fn)=>{let st=tgt.save?JSON.parse(tgt.save):null;if(!st)return false;fn(st);tgt.save=JSON.stringify(st);tgt.level=st.level;tgt.gold=st.gold;tgt.gems=st.gems;tgt.saveAt=Date.now();sendTo(tgt.id,{t:"save_rejected",msg:"Администратор изменил ваш прогресс",data:tgt.save});return true};
      if(m.t==="admin_give"){const ok=patchSave(st=>{st.gold=(st.gold||0)+(m.gold|0);st.gems=(st.gems||0)+(m.gems|0);st.scrolls=(st.scrolls||0)+(m.scrolls|0)});saveDB();send(ws,{t:"admin_ok",msg:ok?"Выдано":"У игрока нет сохранения"});return}
      if(m.t==="admin_reset"){tgt.save=null;tgt.level=0;tgt.gold=0;tgt.gems=0;saveDB();sendTo(tgt.id,{t:"save_rejected",msg:"Прогресс сброшен администратором",data:null});send(ws,{t:"admin_ok",msg:"Сброшено"});return}
      if(m.t==="admin_ban"){tgt.banned=!tgt.banned;tgt.token=crypto.randomBytes(16).toString("hex");saveDB();if(tgt.banned){sendTo(tgt.id,{t:"banned",msg:"Обратитесь к администратору"});const w=online.get(tgt.id);if(w)setTimeout(()=>{try{w.close()}catch(e){}},300)}send(ws,{t:"admin_ok",msg:tgt.banned?"Заблокирован":"Разблокирован"});return}
      if(m.t==="admin_kick"){const w=online.get(tgt.id);if(w){send(w,{t:"kicked"});try{w.close()}catch(e){}}send(ws,{t:"admin_ok",msg:"Отключён"});return}
      if(m.t==="admin_admin"){if(tgt.user&&ADMINS.includes(tgt.user.toLowerCase())){send(ws,{t:"err",msg:"Это главный админ"});return}tgt.admin=!tgt.admin;saveDB();send(ws,{t:"admin_ok",msg:tgt.admin?"Назначен админом":"Снят с админа"});return}
      if(m.t==="admin_delete"){if(isAdmin(tgt)&&tgt.id!==me.id){send(ws,{t:"err",msg:"Нельзя удалить админа"});return}const w=online.get(tgt.id);if(w){try{w.close()}catch(e){}}delete DB.players[tgt.id];Object.values(DB.players).forEach(p=>{p.friends=(p.friends||[]).filter(f=>f!==tgt.id);p.requests=(p.requests||[]).filter(f=>f!==tgt.id)});saveDB();send(ws,{t:"admin_ok",msg:"Удалён"});return}
      return}
    if(m.t==="top"){send(ws,{t:"top",top:leaderboard(),online:online.size});return}
    // ---- друзья ----
    if(m.t==="friend_add"){const c=String(m.code||"").trim().toUpperCase();const p=Object.values(DB.players).find(x=>x.code===c);
      if(!p||p.id===me.id){send(ws,{t:"err",msg:"Игрок с таким кодом не найден"});return}
      if(me.friends.includes(p.id)){send(ws,{t:"err",msg:"Уже в друзьях"});return}
      if(me.requests.includes(p.id)){me.requests=me.requests.filter(x=>x!==p.id);me.friends.push(p.id);p.friends.push(me.id)}
      else if(!p.requests.includes(me.id)){p.requests.push(me.id);send(ws,{t:"info",msg:"Заявка отправлена игроку "+p.name})}
      saveDB();pushFriends(me.id);pushFriends(p.id);return}
    if(m.t==="friend_accept"){const p=DB.players[m.id];if(!p||!me.requests.includes(p.id))return;me.requests=me.requests.filter(x=>x!==p.id);if(!me.friends.includes(p.id))me.friends.push(p.id);if(!p.friends.includes(me.id))p.friends.push(me.id);saveDB();pushFriends(me.id);pushFriends(p.id);return}
    if(m.t==="friend_decline"){me.requests=me.requests.filter(x=>x!==m.id);saveDB();pushFriends(me.id);return}
    if(m.t==="friend_remove"){const p=DB.players[m.id];me.friends=me.friends.filter(x=>x!==m.id);if(p)p.friends=p.friends.filter(x=>x!==me.id);saveDB();pushFriends(me.id);if(p)pushFriends(p.id);return}
    // ---- подбор ----
    if(m.t==="queue"){if(me.room){send(ws,{t:"err",msg:"Вы уже в бою"});return}queue=queue.filter(q=>q.id!==me.id);
      // ближайший по силе
      let best=null,bd=1e18;queue.forEach(q=>{const d=Math.abs((q.power||0)-(me.power||0));if(online.has(q.id)&&d<bd){bd=d;best=q}});
      if(best){queue=queue.filter(q=>q.id!==best.id);startRoom(best.id,me.id)}else{queue.push({id:me.id,power:me.power,t:Date.now()});send(ws,{t:"queued",n:queue.length})}return}
    if(m.t==="dequeue"){queue=queue.filter(q=>q.id!==me.id);send(ws,{t:"dequeued"});return}
    if(m.t==="challenge"){const p=DB.players[m.to];if(!p||!online.has(p.id)){send(ws,{t:"err",msg:"Друг не в сети"});return}if(p.room){send(ws,{t:"err",msg:"Друг сейчас в бою"});return}sendTo(p.id,{t:"challenged",from:pub(me)});send(ws,{t:"info",msg:"Вызов отправлен: "+p.name});return}
    if(m.t==="accept"){const p=DB.players[m.from];if(!p||!online.has(p.id)||p.room||me.room){send(ws,{t:"err",msg:"Вызов недоступен"});return}queue=queue.filter(q=>q.id!==me.id&&q.id!==p.id);startRoom(p.id,me.id);return}
    if(m.t==="decline"){sendTo(m.from,{t:"info",msg:me.name+" отклонил вызов"});return}
    // ---- бой: ретрансляция ----
    const R=me.room&&rooms.get(me.room);if(!R)return;const idx=R.p.indexOf(me.id);const other=R.p[1-idx];
    if(m.t==="act"||m.t==="blk"||m.t==="team"){sendTo(other,{...m,from:idx});return}
    if(m.t==="turn"){if(idx!==0)return;R.turn=m.who;R.turnNo=m.n;armTimer(R);return}
    if(m.t==="result"){if(idx!==0)return;const w=R.p[m.winner],l=R.p[1-m.winner];const W=DB.players[w],L=DB.players[l];const d=Math.max(10,Math.round(25+((L.rating||1000)-(W.rating||1000))/20));W.rating=(W.rating||1000)+d;L.rating=Math.max(0,(L.rating||1000)-d);W.wins=(W.wins||0)+1;L.losses=(L.losses||0)+1;saveDB();R.p.forEach(id=>sendTo(id,{t:"rated",delta:id===w?d:-d,rating:DB.players[id].rating,won:id===w}));endRoom(R,"finished");return}
    if(m.t==="forfeit"){R.p.forEach(id=>sendTo(id,{t:"opp_left",who:idx}));const W=DB.players[other],L=me;const d=20;W.rating=(W.rating||1000)+d;L.rating=Math.max(0,(L.rating||1000)-d);W.wins=(W.wins||0)+1;L.losses=(L.losses||0)+1;saveDB();endRoom(R,"forfeit",idx);return}
  });
  ws.on("close",()=>{if(!me)return;if(online.get(me.id)===ws)online.delete(me.id);queue=queue.filter(q=>q.id!==me.id);
    const R=me.room&&rooms.get(me.room);if(R){const idx=R.p.indexOf(me.id);const other=R.p[1-idx];
      // даём 25 сек на переподключение
      setTimeout(()=>{if(!online.has(me.id)&&rooms.has(R.id)){sendTo(other,{t:"opp_left",who:idx});const W=DB.players[other];W.rating=(W.rating||1000)+20;W.wins=(W.wins||0)+1;me.rating=Math.max(0,(me.rating||1000)-20);me.losses=(me.losses||0)+1;saveDB();endRoom(R,"disconnect",idx)}},25000)}
    notifyFriends(me.id)});
});
setInterval(()=>{wss.clients.forEach(ws=>{if(!ws.isAlive)return ws.terminate();ws.isAlive=false;ws.ping()})},30000);
server.listen(PORT,"0.0.0.0",()=>console.log("Dragonmania server on",PORT));
// не даём бесплатному Render засыпать: пингуем сами себя каждые 10 минут
const SELF=process.env.RENDER_EXTERNAL_URL;if(SELF){setInterval(()=>{require("https").get(SELF+"/health",r=>r.resume()).on("error",()=>{})},10*60*1000)}
