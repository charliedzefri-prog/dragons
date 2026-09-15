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
let saveT=null;const saveDB=()=>{clearTimeout(saveT);saveT=setTimeout(()=>{try{fs.writeFileSync(DB_FILE,JSON.stringify(DB))}catch(e){console.error("db save",e.message)}},500)};
const code=()=>{let c;do{c=crypto.randomBytes(3).toString("hex").toUpperCase()}while(Object.values(DB.players).some(p=>p.code===c));return c};

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
const pub=(p)=>({id:p.id,name:p.name,avatar:p.avatar,power:p.power||0,rating:p.rating||1000,code:p.code,online:online.has(p.id),team:p.team||[],wins:p.wins||0,losses:p.losses||0});
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
    if(m.t==="hello"){
      let p=m.token&&Object.values(DB.players).find(x=>x.token===m.token);
      if(!p){const id="p"+crypto.randomBytes(5).toString("hex");p=DB.players[id]={id,token:crypto.randomBytes(16).toString("hex"),code:code(),name:"Хранитель",avatar:"av0",rating:1000,friends:[],requests:[],wins:0,losses:0,created:Date.now()}}
      me=p;p.name=String(m.name||p.name).slice(0,20);p.avatar=m.avatar||p.avatar;p.power=m.power|0;p.team=(m.team||[]).slice(0,3);p.last=Date.now();
      const old=online.get(p.id);if(old&&old!==ws){try{old.close()}catch(e){}}
      online.set(p.id,ws);saveDB();
      send(ws,{t:"welcome",me:pub(p),token:p.token,online:online.size,top:leaderboard()});pushFriends(p.id);notifyFriends(p.id);return}
    if(!me)return;
    if(m.t==="profile"){me.name=String(m.name||me.name).slice(0,20);me.avatar=m.avatar||me.avatar;me.power=m.power|0;me.team=(m.team||[]).slice(0,3);saveDB();notifyFriends(me.id);send(ws,{t:"me",me:pub(me)});return}
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
