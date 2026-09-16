/* ================= СОСТОЯНИЕ ================= */
const SAVE_KEY = "dml_save_v1";
let S = null;
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
let RNG=Math.random; // в PvP заменяется на seeded
function seededRng(seed){let s=seed>>>0||1;return ()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296}}
const rnd = (a,b)=>Math.floor(RNG()*(b-a+1))+a;
const pick = a=>a[Math.floor(Math.random()*a.length)];
const dInfo = id=>DRAGONS.find(d=>d.id===id);
const fmt = n=>n>=1e6?(n/1e6).toFixed(1)+"M":n>=1e4?(n/1e3).toFixed(1)+"K":Math.floor(n).toLocaleString("ru");

function makeIsland(def){const tiles=[];for(let i=0;i<def.w*def.h;i++)tiles.push({unlocked:false,b:null,dragons:[],last:Date.now()});
  const cx=def.w/2,cy=def.h/2;const dist=i=>{const x=i%def.w+.5,y=Math.floor(i/def.w)+.5;return (x-cx)**2+(y-cy)**2*1.6};
  const idx=[...tiles.keys()].sort((a,b)=>dist(a)-dist(b));idx.slice(0,def.start).forEach(i=>tiles[i].unlocked=true);return {id:def.id,w:def.w,h:def.h,tiles,order:idx}}
function installTilesGetter(st){Object.defineProperty(st,"tiles",{get(){return st.islands[st.cur].tiles},configurable:true,enumerable:false})}
function allTiles(){return S.islands.flatMap(i=>i.tiles)}
function curIsland(){return S.islands[S.cur]}
function newState(){
  const isl=makeIsland(ISLANDS[0]);const tiles=isl.tiles;const idx=isl.order;
  const s={gold:2500,food:800,gems:30,xp:0,level:1,islands:[isl],cur:0,
    dragons:{}, // id -> {lvl,xp,stars}
    wins:0,battles:0,quests:{},lastLogin:Date.now(),eggOpened:0,created:Date.now(),profile:{name:"Хранитель",avatar:"av0"},pvp:{rating:1000,wins:0,games:0},camp:{done:0,seen:{}},music:true};
  // стартовые драконы
  ["d00","d19"].forEach(id=>s.dragons[id]={lvl:1,xp:0,stars:1});
  // стартовые постройки
  const first=idx.slice(0,START_UNLOCKED);
  tiles[first[0]].b="habitat_digit"; tiles[first[0]].dragons=["d00"];
  tiles[first[1]].b="habitat_cat";  tiles[first[1]].dragons=["d19"];
  tiles[first[2]].b="farm";
  tiles[first[3]].b="farm";tiles[first[4]].b="incubator";
  installTilesGetter(s);return s;
}
// Режимы: "local" — офлайн-профиль (localStorage); "account" — прогресс живёт ТОЛЬКО на сервере (в браузере лишь кэш сессии в sessionStorage).
let SAVE_MODE="local";
function save(){if(SAVE_MODE==="account"){sessionStorage.setItem("dml_acc_session",JSON.stringify(S));cloudSave()}else localStorage.setItem(SAVE_KEY,JSON.stringify(S))}
let _cloudT=null,_cloudSeq=0;function cloudSave(){if(!NET.me||SAVE_MODE!=="account")return;clearTimeout(_cloudT);_cloudT=setTimeout(()=>netSend({t:"save",data:JSON.stringify(S),seq:++_cloudSeq}),1200)}
function applyState(obj){S=obj;installTilesGetter(S);migrate();team=[];B=null;updateTop();show("map")}
function load(){try{const j=localStorage.getItem(SAVE_KEY);if(j){S=JSON.parse(j);migrate();return}}catch(e){}S=newState()}
function loadLocalProfile(){SAVE_MODE="local";load()}
function migrate(){
  S.profile=S.profile||{name:"Хранитель",avatar:"av0"};S.pvp=S.pvp||{rating:1000,wins:0,games:0};S.camp=S.camp||{done:Math.min(S.wins||0,CAMPAIGN_NODES.length),seen:{}};if(S.music===undefined)S.music=true;
  if(!S.islands){const isl={id:"main",w:MAP_W,h:MAP_H,tiles:S.tiles};delete S.tiles;S.islands=[isl];S.cur=0;if(!isl.tiles.some(t=>t.b==="incubator")){const f=isl.tiles.find(t=>t.unlocked&&!t.b);if(f)f.b="incubator"}}
  installTilesGetter(S);S.pending=S.pending||[];S.islands.forEach(isl=>isl.tiles.forEach(t=>{const b=BUILDINGS[t.b];if(b&&b.el){const keep=[];t.dragons.forEach(id=>{if(dInfo(id).els.includes(b.el))keep.push(id);else S.pending.push(id)});t.dragons=keep}}));S.eggs=(S.eggs||[]).map(e=>typeof e==="string"?{id:e}:e);S.inv=S.inv||[];S.pending=S.pending||[];S.incub=S.incub||[];S.academy=S.academy||[];{const seen=new Set();S.islands.forEach(isl=>isl.tiles.forEach(t=>{t.dragons=t.dragons.filter(id=>{if(!S.dragons[id]||seen.has(id))return false;seen.add(id);return true})}));S.pending=[...new Set(S.pending.filter(id=>S.dragons[id]&&!seen.has(id)))];Object.keys(S.dragons).forEach(id=>{if(!seen.has(id)&&!S.pending.includes(id))S.pending.push(id)})}const mp={habitat_fire:"habitat_cat",habitat_water:"habitat_digit",habitat_plant:"habitat_doc",habitat_nature:"habitat_doc",habitat_earth:"habitat_beast",habitat_wind:"habitat_bird",habitat_energy:"habitat_cyber",habitat_electric:"habitat_cyber",habitat_metal:"habitat_money",habitat_ice:"habitat_night",habitat_dark:"habitat_night",habitat_shadow:"habitat_night",habitat_light:"habitat_royal",habitat_void:"habitat_glitch"};
  S.islands.forEach(isl=>isl.tiles.forEach(t=>{if(mp[t.b])t.b=mp[t.b];if(t.b&&!BUILDINGS[t.b])t.b=null}));
  Object.values(S.dragons).forEach(o=>{if(o.perks||o.acad||o.sk){const refund=(Object.values(o.perks||{}).reduce((a,l)=>a+l*4,0))+(o.acad?14:0);o.sp=(o.sp||0)+refund;delete o.perks;delete o.acad;delete o.sk}o.tree=o.tree||{}});
  // переселить драконов, чья стихия не совпадает с жилищем
  {S.pending=S.pending||[];S.islands.forEach(isl=>isl.tiles.forEach(t=>{const b=BUILDINGS[t.b];if(b&&b.el){const keep=[];t.dragons.forEach(id=>{if(dInfo(id)&&dInfo(id).els.includes(b.el))keep.push(id);else S.pending.push(id)});t.dragons=keep}}))}
  Object.keys(S.dragons).forEach(id=>{const o=S.dragons[id];if(!dInfo(id))delete S.dragons[id];else delete o.skills});}

/* ================= УТИЛИТЫ UI ================= */
function toast(msg){const t=document.createElement("div");t.className="toast";t.innerHTML=msg;$("#toasts").append(t);setTimeout(()=>t.remove(),3100)}
function modal(html,{closable=true}={}){
  const root=$("#modal-root");root.innerHTML="";
  const m=document.createElement("div");m.className="panel modal";m.innerHTML=(closable?'<button class="x">✕</button>':"")+html;
  root.append(m);if(closable)$(".x",m).onclick=closeModal;
  root.onclick=e=>{if(e.target===root&&closable)closeModal()};
  return m;
}
function closeModal(){$("#modal-root").innerHTML=""}
function elIco(el,small){const e=ELEMENTS[el];return `<span class="el" title="${e.name}" style="background:${e.color}">${e.ico}</span>`}
function updateTop(){const av=$("#avatar");if(av){av.src="assets/av/"+S.profile.avatar+".jpg";av.title=S.profile.name}
  $("#r-gold").textContent=fmt(S.gold);$("#r-food").textContent=fmt(S.food);$("#r-gems").textContent=fmt(S.gems);
  $("#r-level").textContent=S.level>=LEVEL_CAP?"MAX":S.level;const sc=$("#r-scroll");if(sc)sc.textContent=S.scrolls||0;const sp=$("#r-sp");if(sp)sp.textContent=S.sp||0;$("#r-xp").style.width=(S.level>=LEVEL_CAP?0:S.xp/xpNeed(S.level)*100)+"%";
}
function xpNeed(l){return l<XP_TABLE.length?XP_TABLE[l]:Math.round(120*Math.pow(l,1.7))}
function addXP(n){if(S.level>=LEVEL_CAP){S.xp=0;return}S.xp+=Math.round(n*MULT("xpMult"));while(S.level<LEVEL_CAP&&S.xp>=xpNeed(S.level)){S.xp-=xpNeed(S.level);S.level++;S.gems+=5;S.gold+=500*S.level;S.scrolls=(S.scrolls||0)+3;const unl=[...ISLANDS.filter(i=>i.req===S.level).map(i=>"🏝️ "+i.name),...Object.entries(BUILDINGS).filter(([k,b])=>b.req===S.level).map(([k,b])=>b.ico+" "+b.name),...DRAGONS.filter(dr=>DRAGON_REQ[dr.id]===S.level&&!isSpecial(dr.id)).map(dr=>"🐲 "+dr.name)];modal(`<h2>⭐ Уровень ${S.level}!</h2><p class="center">+5 💎, +🪙${500*S.level}, +📜3</p>${unl.length?`<p><b>Открыто:</b></p><ul style="margin-left:18px">${unl.map(u=>`<li>${u}</li>`).join("")}</ul>`:""}<div class="row" style="justify-content:center"><button class="btn green" onclick="closeModal()">Ура!</button><button class="btn blue" onclick="showRoad()">🛣️ Дорога наград</button></div>`)}updateTop()}
function canPay(cost){return (!cost.gold||S.gold>=cost.gold)&&(!cost.gems||S.gems>=cost.gems)&&(!cost.food||S.food>=cost.food)}
function pay(cost){S.gold-=cost.gold||0;S.gems-=cost.gems||0;S.food-=cost.food||0;updateTop()}
function costStr(c){return [c.gold&&`🪙${fmt(c.gold)}`,c.food&&`🍖${fmt(c.food)}`,c.gems&&`💎${c.gems}`,c.scrolls&&`📜${c.scrolls}`].filter(Boolean).join(" ")}

/* ================= ДРАКОНЫ: СТАТЫ ================= */
function dragonStats(id, ov){
  const d=dInfo(id); const o=ov||S.dragons[id]||{lvl:1,stars:1};
  const eL=(id==="d160"&&ov&&ov.enemy)?MOOSE_EVENT.effLvl:o.lvl;const m=RARITY[d.rarity].mult*(1+(eL-1)*0.12)*(1+(o.stars-1)*0.25);
  const hpm=ov&&ov.enemy?1.6:2.4; // у врагов запас HP меньше — бои короче; в PvP 1.8
  const tb=treeBonuses(id,o);const pk=k=>1+(tb[k]||0);
  return {hp:Math.round(d.base.hp*m*hpm*pk("hp")),atk:Math.round(d.base.atk*m*pk("atk")),def:Math.round(d.base.def*m*pk("def")),spd:Math.round(d.base.spd*(1+(o.lvl-1)*0.02)*(1+(o.stars-1)*0.1)*pk("spd")),crit:0.1+(tb.crit||0),timeb:tb.timing||0,lifesteal:tb.lifesteal||0,startshield:tb.startshield||0,dmg:tb.dmg||{},tb};
}
function treeLvl(id,el,o){o=o||S.dragons[id];return (o&&o.tree&&o.tree[el]&&o.tree[el].lvl)||0}
function treeBonuses(id,o){o=o||S.dragons[id];const b={dmg:{}};if(!o||!o.tree)return b;const d=dInfo(id);
  d.els.forEach(el=>{const t=o.tree[el];if(!t)return;const L=t.lvl||0;const p=TREE_PASSIVE[el],pi=PASSIVE_INFO[p];
    if(L>=1)b.dmg[el]=(b.dmg[el]||0)+0.10;
    if(L>=2)b[p]=(b[p]||0)+pi.v;
    if(L>=3)b.dmg[el]=(b.dmg[el]||0)+0.10;
    if(L>=5)b[p]=(b[p]||0)+pi.v;
    if(L>=6&&t.final!=null){const f=FINAL_OPTIONS[el][t.final];b[f.k]=(b[f.k]||0)+f.v}});
  return b}
function feedCost(id){const o=S.dragons[id];const l=o.lvl;const g=l<=20?Math.pow(1.22,l-1):Math.pow(1.22,19)*Math.pow(1.11,l-20);return Math.round(15*g*RARITY[dInfo(id).rarity].mult)}
function maxLevel(stars){return 10+ (stars-1)*10}
function evolveCost(id){const o=S.dragons[id];return {gold:2000*o.stars*o.stars,gems:5*o.stars}}
function power(id,ov){const s=dragonStats(id,ov);return Math.round(s.hp/3+s.atk*4+s.def*3+s.spd*2)}
function ownedIds(){return Object.keys(S.dragons)}
function housedIds(){return ownedIds().filter(isHoused)}

/* ================= ЭКРАНЫ ================= */
function show(scr){
  if(B&&scr!=="battle"){toast("⚔️ Сначала закончи бой");return}
  $$("#navbar button").forEach(b=>b.classList.toggle("active",b.dataset.scr===scr));
  $$(".screen").forEach(s=>s.classList.toggle("active",s.id==="scr-"+scr));
  ({map:renderMap,dragons:renderDragons,battle:renderBattleMenu,events:renderEvents,shop:renderShop,academy:renderAcademy,breed:renderBreed,campaign:renderCampaign,pvp:renderPvp,friends:renderFriends})[scr]();
  if(S.mooseFound&&scr!=="events"){show("events");return}
  if(!B)playMusic(S.mooseFound?"drone":scr==="battle"?"select":scr==="pvp"?"select":scr==="campaign"?"campaign":"map");
}
$$("#navbar button").forEach(b=>b.onclick=()=>{if(B){toast("⚔️ Сначала закончи бой (или сдайся)");SFX.debuff();return}show(b.dataset.scr)});
document.addEventListener("click",e=>{if(e.target.closest&&e.target.closest("button:not(.skillbtn)"))SFX.click()},true);

/* ================= КАРТА ================= */
// Масштабируем остров под доступную ширину/высоту экрана (крупнее на больших мониторах, целиком на маленьких)
function fitIsland(){const fit=$("#isofit");if(!fit)return;const iso=$(".iso",fit);const W=iso.offsetWidth,H=iso.offsetHeight-40;
  const scr=$("#scr-map");const availW=scr.clientWidth-24;
  const availH=Math.max(340,window.innerHeight-fit.getBoundingClientRect().top-($("#navbar")?.offsetHeight||70)-16);
  const s=Math.max(.6,Math.min(availW/(W+40),availH/H,3.2));iso.style.transform=`scale(${s})`;iso.style.transformOrigin="top center";fit.style.width=Math.min(availW,W*s)+"px";fit.style.height=H*s+"px";fit.style.margin="0 auto"}
window.addEventListener("resize",()=>{fitIsland();document.documentElement.style.setProperty("--vw",window.innerWidth+"px")});
function toggleFullscreen(){const d=document;if(!d.fullscreenElement){(d.documentElement.requestFullscreen||d.documentElement.webkitRequestFullscreen).call(d.documentElement).catch(()=>toast("Браузер не разрешил полный экран"))}else (d.exitFullscreen||d.webkitExitFullscreen).call(d)}
document.addEventListener("fullscreenchange",()=>{const b=$("#fsbtn");if(b)b.textContent=document.fullscreenElement?"🗗":"⛶";setTimeout(fitIsland,100)});
function habLvl(t){return t.lvl||1}
const MULT=k=>(NET.settings&&+NET.settings[k])||1;
function islDef(isl){isl=isl||curIsland();return ISLANDS.find(x=>x.id===isl.id)||ISLANDS[0]}
function islBonus(k,t){let isl=curIsland();if(t){isl=S.islands.find(i=>i.tiles.includes(t))||isl}return (islDef(isl).bonus||{})[k]||1}
function habRate(t){const b=BUILDINGS[t.b];let r=0;t.dragons.forEach(id=>{const o=S.dragons[id];if(o)r+=GOLD_PER_MIN(b,o.lvl,RARITY[dInfo(id).rarity].mult)});return Math.round(r*MULT("goldMult")*islBonus("gold",t))}
function habStored(t){const b=BUILDINGS[t.b];if(!b||!b.el)return 0;return Math.min(Math.round(HAB_STORE(b,habLvl(t))*islBonus("store",t)),Math.floor(habRate(t)*(Date.now()-t.last)/60000))}
function tileIncome(t){const b=BUILDINGS[t.b];if(!b)return null;
  if(b.el){return {gold:habStored(t)}}
  if(b.food)return {food:Math.round(b.food*FARM_MULT[(t.lvl||1)-1]*ECON_SCALE(S.level)*islBonus("food",t))};if(b.gems)return {gems:Math.round(b.gems*MULT("gemsMult")*islBonus("gems",t))};return null}
function tileReady(t){const b=BUILDINGS[t.b];if(b&&b.el)return habStored(t)>=Math.max(10,habRate(t));if(b&&b.special==="library")return Date.now()-t.last>=LIBRARY.time;return Date.now()-t.last>=HARVEST_TIME}
function unlockCost(){const isl=curIsland();const df=ISLANDS.find(x=>x.id===isl.id)||ISLANDS[0];const n=isl.tiles.filter(t=>t.unlocked).length;return {gold:Math.round(400*Math.pow(1.35,n-df.start)*(S.islands.indexOf(isl)+1))}}

function renderMap(){
  const root=$("#scr-map");
  const clouds=[0,1,2,3].map(i=>`<div class="cloud" style="top:${20+i*50}px;width:${90+i*30}px;height:${28+i*8}px;animation-duration:${40+i*15}s;animation-delay:-${i*17}s"></div>`).join("");
  const TW=92,TH=46; // изометрический ромб
  const isl=curIsland();const IW=isl.w,IH=isl.h;const def=ISLANDS.find(x=>x.id===isl.id)||ISLANDS[0];
  const W=(IW+IH)*TW/2, H=(IW+IH)*TH/2;
  let tiles="";
  for(let y=0;y<IH;y++)for(let x=0;x<IW;x++){const i=y*IW+x;const t=S.tiles[i];
    const left=(x-y)*TW/2+W/2-TW/2, top=(x+y)*TH/2;
    tiles+=tileHtml(t,i,left,top,x+y)}
  root.innerHTML=`${clouds}<div class="map-wrap"><div class="isl-tabs">${ISLANDS.map((df,k)=>{const owned=S.islands.some(x=>x.id===df.id);const ci=S.islands.findIndex(x=>x.id===df.id);return `<button class="${ci===S.cur?"active":""} ${owned?"":"lockb"}" data-isl="${k}">${owned?"🏝️":"🔒"} ${df.name}${owned?"":`<br><small>ур.${df.req} · ${costStr(df.cost)}</small>`}</button>`}).join("")}</div>
  <div class="island-name">🏝️ ${def.name}${def.bonusText?` <span class="badge gold" style="font-size:12px;vertical-align:middle">${def.bonusText}</span>`:""}</div>
  ${moveFrom!==null?`<div class="map-hint" style="background:#c0506e">📦 Режим перемещения: выбери пустую клетку (или нажми на здание ещё раз для отмены)</div>`:""}<div class="row map-actions" style="justify-content:center"><button class="btn green" id="collectall">🪙 Собрать всё (${fmt(allTiles().reduce((a,t)=>a+habStored(t),0))})</button></div><div class="map-hint">Драконы в жилищах генерируют 🪙 каждую минуту (больше уровень и редкость — больше золота). Жилище накапливает золото до лимита — улучшай его, чтобы поднять лимит и число мест. Фермы дают 🍖 каждые 60 сек.</div>
  <div class="iso-scroll"><div class="iso-fit" id="isofit"><div class="iso" style="width:${W}px;height:${H+120}px"><div class="iso-base isl-${def.tile||"grass"}" style="width:${W+60}px;height:${H+60}px;left:-30px;top:-10px;background:radial-gradient(ellipse at 50% 40%,${def.ground||def.theme},${def.theme} 60%,${def.edge||"#2c5a22"});box-shadow:0 30px 0 ${def.edge||"#b9955a"},0 46px 0 #3a2a1a,0 60px 40px rgba(0,0,60,.4)"></div>${tiles}${(def.deco||[]).map((d,k)=>`<span class="isl-deco" style="left:${8+k*38}%;top:${-30+(k%2)*20}px">${d}</span>`).join("")}</div></div></div>
</div>`;
  root.style.background=def.sky||"";
  $$(".itile",root).forEach(el=>el.onclick=()=>tileClick(+el.dataset.i));
  fitIsland();
  $("#collectall",root).onclick=()=>{let g=0;allTiles().forEach(t=>{const v=habStored(t);if(v>0){g+=v;t.last=Date.now()}});if(!g){toast("Пока нечего собирать");return}S.gold+=g;addXP(Math.min(120,10+Math.ceil(g/20)));save();updateTop();renderMap();toast(`+🪙${fmt(g)}`)};
  $$("[data-isl]",root).forEach(b=>b.onclick=()=>{const df=ISLANDS[+b.dataset.isl];const ci=S.islands.findIndex(x=>x.id===df.id);
    if(ci>=0){S.cur=ci;moveFrom=null;save();renderMap();return}
    if(S.level<df.req){toast(`Остров откроется на уровне ${df.req}`);return}
    modal(`<h2>🏝️ ${df.name}</h2><p>Купить новый остров за <b>${costStr(df.cost)}</b>? Размер ${df.w}×${df.h}.${df.bonusText?`<br><b>Бонус острова:</b> ${df.bonusText}`:""}</p><div class="row"><button class="btn green" id="ok" ${canPay(df.cost)?"":"disabled"}>Купить</button></div>`);
    $("#ok").onclick=()=>{pay(df.cost);S.islands.push(makeIsland(df));S.cur=S.islands.length-1;addXP(500);save();closeModal();renderMap();toast("🏝️ Новый остров открыт!")}});
  // авто-скролл к центру
  const sc=$(".iso-scroll",root);sc.scrollLeft=(sc.scrollWidth-sc.clientWidth)/2;
}
function tileHtml(t,i,left,top,z){
  const style=`left:${left}px;top:${top}px;z-index:${z}`;
  if(!t.unlocked)return `<div class="itile locked" data-i="${i}" style="${style}"><div class="rhomb"></div><span class="lock">🔒</span></div>`;
  if(!t.b)return `<div class="itile" data-i="${i}" style="${style}"><div class="rhomb" style="background:${islDef().tileColor||"rgba(255,255,255,.12)"}"></div></div>`;
  const b=BUILDINGS[t.b];const inc=tileIncome(t);let ready=inc&&tileReady(t)&&(inc.gold>0||inc.food||inc.gems);const lib=b.special==="library"&&tileReady(t);
  const dr=t.dragons.map((id,k)=>`<img class="dr-mini walk ${dInfo(id).noflip?"noflip":""}" style="left:${14+k*30}px;animation-delay:-${(i*7+k*3)%6}s;animation-duration:${5+((i+k)%3)}s" src="assets/${id}.png">`).join("");
  const cnt=b.cap?`<span class="count">${t.dragons.length}/${HAB_CAP(b,habLvl(t))}${habLvl(t)>1?" ⬆"+habLvl(t):""}</span>`:"";
  const col=b.el?ELEMENTS[b.el].color:b.farm?"#d8b54a":"#8fd36a";
  return `<div class="itile built" data-i="${i}" title="${b.name}" style="${style}"><div class="rhomb" style="background:linear-gradient(135deg,#fff8,${col})"><div class="rside" style="background:${col}"></div></div><span class="bico ${b.special==="phone"?"phone":""}">${b.ico}</span>${dr}${cnt}${ready?`<span class="ready">${inc.gold?"🪙":inc.food?"🍖":"💎"}</span>`:lib?`<span class="ready">📜</span>`:""}</div>`;
}
let moveFrom=null;
function coinBurst(anchor,g){const r=anchor.getBoundingClientRect();for(let k=0;k<6;k++){const c=document.createElement("div");c.className="coinfx";c.textContent="🪙";c.style.left=(r.left+r.width/2+(Math.random()-.5)*60)+"px";c.style.top=(r.top+r.height/2)+"px";c.style.setProperty("--dx",((Math.random()-.5)*120)+"px");c.style.animationDelay=(k*60)+"ms";document.body.append(c);setTimeout(()=>c.remove(),1300)}const t=document.createElement("div");t.className="coinfx big";t.textContent="+"+g;t.style.left=(r.left+r.width/2)+"px";t.style.top=(r.top-6)+"px";document.body.append(t);setTimeout(()=>t.remove(),1300);if(typeof SFX!=="undefined"&&SFX.coin)SFX.coin();else if(typeof SFX!=="undefined"&&SFX.click)SFX.click()}
function tileClick(i){
  const t=S.tiles[i];
  if(moveFrom!==null){const from=S.tiles[moveFrom];
    if(i===moveFrom){moveFrom=null;renderMap();return}
    if(!t.unlocked){toast("Участок закрыт");return}
    if(t.b){toast("Клетка занята — выбери пустую");return}
    Object.assign(t,{b:from.b,dragons:from.dragons,last:from.last,lvl:from.lvl});from.b=null;from.dragons=[];from.lvl=1;moveFrom=null;save();renderMap();toast("📦 Здание перемещено");return}
  if(!t.unlocked){const c=unlockCost();
    modal(`<h2>🔒 Расширение острова</h2><p>Открыть новую территорию за <b>${costStr(c)}</b>?</p><div class="row"><button class="btn green" id="ok" ${canPay(c)?"":"disabled"}>Открыть</button></div>`);
    $("#ok").onclick=()=>{pay(c);t.unlocked=true;addXP(30);save();closeModal();renderMap()};return}
  if(!t.b){buildMenu(i);return}
  const b=BUILDINGS[t.b];
  if(b.special==="academy"){show("academy");return}
  if(b.special==="incubator"){openIncubator();return}
  if(b.special==="phone"){openPhone();return}
  if(b.special==="dungeon"){openDungeon();return}
  if(b.special==="library"){const left=Math.max(0,LIBRARY.time-(Date.now()-t.last));const ready=left<=0;
    const m=modal(`<h2>📚 Библиотека</h2><p>Производит <b>📜${LIBRARY.scrolls} свитка обучения</b> каждые ${LIBRARY.time/60000} мин. Свитки конвертируются в 📘 очки навыков любого дракона в Академии.</p><div class="row"><button class="btn green" id="lc" ${ready?"":"disabled"}>${ready?"Забрать 📜"+LIBRARY.scrolls:"⏳ "+Math.ceil(left/1000)+" с"}</button><button class="btn blue" id="mv">📦 Переместить</button></div>`);
    $("#lc",m).onclick=()=>{S.scrolls=(S.scrolls||0)+LIBRARY.scrolls;t.last=Date.now();addXP(15);save();updateTop();closeModal();renderMap();toast("+📜"+LIBRARY.scrolls)};
    $("#mv",m).onclick=()=>{moveFrom=i;closeModal();renderMap()};return}
  if(b.deco){modal(`<h2>${b.ico} ${b.name}</h2><p>Просто красиво. Украшения радуют драконов.</p><div class="row"><button class="btn blue" id="mv">📦 Переместить</button><button class="btn red" id="del">Снести (вернуть 50%)</button></div>`);$("#mv").onclick=()=>{moveFrom=i;closeModal();renderMap()};$("#del").onclick=()=>{S.gold+=Math.floor(b.cost.gold/2);t.b=null;save();closeModal();renderMap();updateTop()};return}
  const inc=tileIncome(t);const ready=tileReady(t);
  const left=Math.max(0,Math.ceil((HARVEST_TIME-(Date.now()-t.last))/1000));
  let html=`<h2>${b.ico} ${b.name} ${b.el?elIco(b.el):""}</h2>`;
  if(b.el){
    const hl=habLvl(t),cap=HAB_CAP(b,hl),st=HAB_STORE(b,hl),rate=habRate(t);
    html+=`<p>Жилище стихии <b>${ELEMENTS[b.el].name}</b> · уровень <b>${hl}/${HAB_MAX_LVL}</b>. Мест: ${t.dragons.length}/${cap}.</p>
    <div class="stat"><span>💰 Доход</span><span>🪙${rate}/мин</span></div><div class="stat"><span>🏦 Накоплено</span><span>🪙${inc.gold} / ${fmt(st)}</span></div><div class="bar" style="margin:4px 0"><div style="width:${st?inc.gold/st*100:0}%;background:linear-gradient(#ffe37a,#e4a11b)"></div></div>${inc.gold>=st&&st?"<small style='color:#d02010'>Хранилище полно — золото не копится!</small>":""}
    ${hl<HAB_MAX_LVL?`<div class="row"><button class="btn purple sm" id="hup" ${canPay(HAB_UP(hl))?"":"disabled"}>⬆ Улучшить до ур.${hl+1} (${costStr(HAB_UP(hl))}) → ${HAB_CAP(b,hl+1)} мест, лимит 🪙${fmt(HAB_STORE(b,hl+1))}</button></div>`:"<small>Максимальный уровень жилища</small>"}<div class="picker" style="margin:8px 0">${t.dragons.map(id=>`<img src="assets/${id}.png" title="${dInfo(id).name}" data-rm="${id}">`).join("")||"<i>Пусто — посели дракона</i>"}</div>`;
    const free=ownedIds().filter(id=>canHouseMore(id)&&dInfo(id).els.includes(b.el));
    if(t.dragons.length<HAB_CAP(b,habLvl(t)))html+=`<p><b>Можно поселить:</b></p><div class="picker">${free.map(id=>`<img src="assets/${id}.png" title="${dInfo(id).name}" data-add="${id}">`).join("")||"<i>Нет свободных драконов этой стихии</i>"}</div>`;
  }else html+=`<p>${b.food?`Ферма · уровень <b>${t.lvl||1}/${FARM_MAX_LVL}</b>. `:""}Производит <b>${inc.food?"🍖"+inc.food:"💎"+inc.gems}</b> раз в ${Math.round(HARVEST_TIME/1000)} с.</p>${b.food&&(t.lvl||1)<FARM_MAX_LVL?`<div class="row"><button class="btn purple sm" id="fup" ${canPay(FARM_UP(b,t.lvl||1))?"":"disabled"}>⬆ Улучшить до ур.${(t.lvl||1)+1} (${costStr(FARM_UP(b,t.lvl||1))}) → 🍖${Math.round(b.food*FARM_MULT[t.lvl||1]*ECON_SCALE(S.level)*islBonus("food",t))}</button></div>`:""}${ready?"":`<div class="bar" style="margin:4px 0"><div style="width:${Math.min(100,(Date.now()-t.last)/HARVEST_TIME*100)}%;background:linear-gradient(#b8f39a,#4a9a2a)"></div></div>`}`;
  html+=`<div class="row"><button class="btn green" id="collect" ${(b.el?inc.gold>0:ready&&(inc.food||inc.gems))?"":"disabled"}>${b.el?"Собрать 🪙"+inc.gold:ready?"Собрать":"Готово через "+left+" с"}</button><button class="btn blue" id="mv">📦 Переместить</button><button class="btn red" id="del">Снести</button>${b.el&&t.dragons.length?`<button class="btn purple" id="enter">🚪 Зайти в жилище</button>`:""}</div>`;
  const m=modal(html);
  $("#mv",m).onclick=()=>{moveFrom=i;closeModal();renderMap()};
  const en=$("#enter",m);if(en)en.onclick=()=>enterHabitat(i);
  $$("[data-add]",m).forEach(im=>im.onclick=()=>{const id=im.dataset.add;if(!canHouseMore(id)){toast("Все копии этого дракона уже поселены");closeModal();return}t.dragons.push(id);S.pending=(S.pending||[]).filter(x=>x!==id);save();closeModal();renderMap();toast("🐲 Дракон поселён!")});
  $$("[data-rm]",m).forEach(im=>im.onclick=()=>{const ix=t.dragons.indexOf(im.dataset.rm);if(ix>=0)t.dragons.splice(ix,1);save();closeModal();renderMap()});
  const fu=$("#fup",m);if(fu)fu.onclick=()=>{pay(FARM_UP(b,t.lvl||1));t.lvl=(t.lvl||1)+1;addXP(60);save();toast(`⬆ ${b.name} улучшена до ур.${t.lvl}`);closeModal();tileClick(i)};
  const hu=$("#hup",m);if(hu)hu.onclick=()=>{const g=habStored(t);S.gold+=g;pay(HAB_UP(habLvl(t)));t.lvl=habLvl(t)+1;t.last=Date.now();addXP(80);save();toast(`⬆ ${b.name} улучшено до ур.${t.lvl}`);closeModal();tileClick(i)};
  $("#collect",m).onclick=()=>{if(!b.el&&!tileReady(t)){toast("⏳ Ещё не готово");return}S.gold+=inc.gold||0;S.food+=inc.food||0;S.gems+=inc.gems||0;t.last=Date.now();addXP(b.el?Math.min(60,10+Math.floor((inc.gold||0)/20)):15);save();closeModal();renderMap();toast(`+${costStr(inc)}`)};
  $("#del",m).onclick=()=>{if(t.dragons.length){toast("Сначала выселите драконов");return}S.gold+=Math.floor((b.cost.gold||0)/2);t.b=null;save();closeModal();renderMap();updateTop()};
}
function enterHabitat(i){
  const t=S.tiles[i],b=BUILDINGS[t.b],col=ELEMENTS[b.el].color;
  const hbg=HAB_BG[b.el];const m=modal(`<h2>${b.ico} ${b.name}</h2><div class="hab-scene ${hbg?"hab-img":""}" style="background:${hbg?`url(assets/bg/${hbg}.jpg) center/cover`:`linear-gradient(#bfe9ff,${col}aa 60%,${col})`}">
   <div class="hab-ground" ${hbg?'style="background:linear-gradient(transparent,rgba(0,0,0,.45));border:0;height:60px"':""}></div>${hbg?"":`<div class="hab-deco">${b.ico}</div>`}
   ${t.dragons.map((id,k)=>`<div class="hab-dr ${dInfo(id).noflip?"noflip":""}" data-id="${id}" style="left:${15+k*40}%;animation-duration:${6+k*2}s;animation-delay:-${k*3}s"><img src="assets/${id}.png"><div class="hab-tag">${dInfo(id).name} <b>ур.${S.dragons[id].lvl}</b></div></div>`).join("")}
  </div><small>Нажми на дракона, чтобы покормить.</small><div id="hab-info"></div>`);
  $$(".hab-dr",m).forEach(el=>el.onclick=()=>{const id=el.dataset.id,o=S.dragons[id],d=dInfo(id),ml=maxLevel(o.stars),fc=feedCost(id);
    $("#hab-info",m).innerHTML=`<div class="panel" style="margin-top:8px;padding:8px"><b>${d.name}</b> · ${stageName(o.lvl)} · ур.${o.lvl}/${ml} <div class="bar" style="margin:4px 0"><div style="width:${o.lvl/ml*100}%"></div></div><div class="row"><button class="btn green sm" id="hf" ${o.lvl>=ml||S.food<fc?"disabled":""}>🍖 Кормить (${fc})</button><button class="btn blue sm" id="hf10">🍖 x10</button><button class="btn sm" id="hd">Подробнее</button></div></div>`;
    $("#hf",m).onclick=()=>{feed(id,1);el.querySelector("b").textContent="ур."+S.dragons[id].lvl;el.click()};
    $("#hf10",m).onclick=()=>{feed(id,10);el.querySelector("b").textContent="ур."+S.dragons[id].lvl;el.click()};
    $("#hd",m).onclick=()=>dragonDetail(id);
    const img=el.querySelector("img");img.classList.add("hop");setTimeout(()=>img.classList.remove("hop"),500)});
}
function stageName(l){let n=STAGES[0][1];STAGES.forEach(([a,b])=>{if(l>=a)n=b});return n}
function buildMenu(i){
  const cats={"Жилища":k=>BUILDINGS[k].el,"Фермы":k=>BUILDINGS[k].farm,"Особые":k=>BUILDINGS[k].special,"Декор":k=>BUILDINGS[k].deco};
  let cur="Жилища";
  const m=modal(`<h2>🔨 Строительство</h2><div class="tabs">${Object.keys(cats).map(c=>`<button data-c="${c}">${c}</button>`).join("")}</div><div class="build-list" id="bl"></div>`);
  const _cnt=$$(".tabs button",m);if(_cnt[2])_cnt[2].onclick=null;
  function draw(){$$(".tabs button",m).forEach(b=>b.classList.toggle("active",b.dataset.c===cur));
    $("#bl",m).innerHTML=Object.keys(BUILDINGS).filter(cats[cur]).map(k=>{const b=BUILDINGS[k];const lock=S.level<(b.req||1);return `<div class="build-opt ${lock?"lockb":""}" data-k="${k}" data-lock="${lock?1:0}" style="${b.el?`background:linear-gradient(#fff9,${ELEMENTS[b.el].color}88)`:""}"><div class="bico">${b.ico}</div>${b.name}<div class="cost">${lock?"🔒 ур. "+b.req:costStr(b.cost)}</div>${b.el?`<div>${elIco(b.el)}</div>`:""}</div>`}).join("");
    $$(".build-opt",m).forEach(o=>o.onclick=()=>{const k=o.dataset.k,b=BUILDINGS[k];if(o.dataset.lock==="1"){toast("Откроется на уровне "+b.req);return}if(b.unique&&allTiles().some(t=>t.b===k)){toast("Такое здание может быть только одно");return}if(!canPay(b.cost)){toast("Недостаточно ресурсов");return}pay(b.cost);S.tiles[i].b=k;S.tiles[i].last=Date.now();S.tiles[i].dragons=[];addXP(25);save();closeModal();renderMap();toast(`${b.ico} ${b.name} построено!`)})}
  $$(".tabs button",m).forEach(b=>b.onclick=()=>{cur=b.dataset.c;draw()});draw();
}
setInterval(()=>{if($("#scr-map").classList.contains("active")&&!$("#modal-root").innerHTML&&moveFrom===null)renderMap()},10000);

/* ================= ДРАКОНЫ ================= */
function dragonCard(id,extra=""){const d=dInfo(id),o=S.dragons[id];const r=RARITY[d.rarity];
  return `<div class="dr-card ${o?"":"locked"} ${o&&!isHoused(id)?"unhoused":""} ${o&&o.lvl>=50?"maxaura":""}" data-id="${id}">${o&&!isHoused(id)?'<span class="badge" style="position:absolute;bottom:4px;left:4px;z-index:2">⚠️ не поселён</span>':""}<span class="rar" style="background:${r.color}">${o||S.level>=DRAGON_REQ[id]?r.name:"🔒 ур."+DRAGON_REQ[id]}</span>${o?`<span class="lv">${o.lvl}</span>`:""}<img src="assets/${id}.png"><div class="nm">${d.name}</div><div class="els">${d.els.map(elIco).join("")}</div>${o?`<div class="stars">${"★".repeat(o.stars)}${"☆".repeat(5-o.stars)} · ⚡${power(id)}</div>`:""}${extra}</div>`}
function renderDragons(){
  const root=$("#scr-dragons");const own=ownedIds();
  root.innerHTML=`<div style="padding:14px 14px 0"><div class="panel"><h2>🐲 Мои драконы <span class="badge gold">${own.length}/${DRAGONS.filter(d=>!d.boss).length}</span> ${(S.inv||[]).length?`<button class="btn sm" onclick="openIncubator()">🥚 Инкубатор (${S.inv.length} яиц)</button>`:""}</h2><small>Нажми на дракона: кормить (🍖) для уровня, эволюция (★) на 10/20/30 уровне. Заблокированных можно купить в магазине.</small></div></div>
  <div class="dr-search"><input id="dsearch" placeholder="🔍 Поиск по имени, стихии, редкости…" value="${(S._q||"").replace(/"/g,"&quot;")}"><div class="chips">${["all","owned","legend"].map(k=>`<button class="chip ${(S._f||"all")===k?"on":""}" data-f="${k}">${{all:"Все",owned:"Мои",legend:"Особые"}[k]}</button>`).join("")}${BASE_ELEMENTS.map(e=>`<button class="chip ${S._f===e?"on":""}" data-f="${e}" style="border-color:${ELEMENTS[e].color}">${ELEMENTS[e].ico}</button>`).join("")}</div></div>
  <div class="dr-grid" id="drgrid"></div>`;
  const grid=$("#drgrid",root);
  function draw(){const q=(S._q||"").trim().toLowerCase(),f=S._f||"all";
    const list=DRAGONS.filter(d=>!d.boss).filter(d=>{if(f==="owned"&&!S.dragons[d.id])return false;if(f==="legend"&&!isSpecial(d.id))return false;if(ELEMENTS[f]&&!d.els.includes(f))return false;
      if(!q)return true;const hay=[d.name,RARITY[d.rarity].name,...d.els.map(e=>ELEMENTS[e].name),d.desc||""].join(" ").toLowerCase();return q.split(/\s+/).every(w=>hay.includes(w))})
      .sort((a,b)=>(S.dragons[b.id]?1:0)-(S.dragons[a.id]?1:0));
    grid.innerHTML=list.map(d=>dragonCard(d.id)).join("")||`<p class="center" style="grid-column:1/-1">Ничего не найдено</p>`;
    $$(".dr-card",grid).forEach(c=>c.onclick=()=>{const id=c.dataset.id;if(S.dragons[id]&&!isHoused(id)){placeDragon(id);return}dragonDetail(id)})}
  $("#dsearch",root).oninput=e=>{S._q=e.target.value;if(e.target.value.trim().toLowerCase()===MOOSE_EVENT.code&&!S.mooseFound&&S.level>=MOOSE_EVENT.req){S.mooseFound=true;save();mooseGlitch(1400);playMusic("drone");setTimeout(()=>{toast("<b style=\"color:#f00\">он проснулся</b>");show("events");playMusic("drone");$("#navbar").classList.add("locked")},1400)}draw()};$$(".chip",root).forEach(b=>b.onclick=()=>{S._f=b.dataset.f;$$(".chip",root).forEach(x=>x.classList.toggle("on",x===b));draw()});draw();
}
function dragonDetail(id){
  const d=dInfo(id),o=S.dragons[id],r=RARITY[d.rarity];
  if(!o){modal(`<h2>${d.name} <span class="badge" style="background:${r.color}">${r.name}</span></h2><div class="dd-top"><img src="assets/${id}.png"><div><div class="desc">${d.desc}</div><div>${d.els.map(elIco).join("")}</div><p>Этот дракон ещё не в вашей коллекции.${S.level<DRAGON_REQ[d.id]?` <b>🔒 Нужен уровень ${DRAGON_REQ[d.id]}</b>`:""}</p><div class="row">${isSpecial(id)?`<span class="badge" style="background:#ff4fe6">${isEvent(id)?"🎪 Только в событии ("+(ZODIAC_IDS.includes(id)?"Испытание зодиаков":id==="d132"?"Секретный уровень":"Звонок MR 333")+")":isTyrant(id)?"💀 Только разведение: Божество+Божество ур."+TYRANT_BREED.minLvl:isDivine(id)?"🔱 Только разведение: Легенда+Легенда ур."+DIVINE_BREED.minLvl:"👑 Только разведение: оба родителя ур."+LEGEND_BREED.minLvl}</span>`:`${S.level<DRAGON_REQ[d.id]?`<button class="btn" disabled>🔒 Уровень ${DRAGON_REQ[d.id]}</button>`:`<button class="btn ${canPay(dragonPrice(d))?"green":""}" id="buy">Купить за ${costStr(dragonPrice(d))}</button>`}`}</div></div></div>`);
    const bb=$("#buy");if(bb)bb.onclick=()=>buyDragon(id);return}
  const st=dragonStats(id),ml=maxLevel(o.stars),fc=feedCost(id),ec=evolveCost(id);
  const m=modal(`<h2>${d.name} <span class="badge" style="background:${r.color}">${r.name}</span></h2>
  <div class="dd-top"><img src="assets/${id}.png"><div style="flex:1">
   <div>${d.els.map(elIco).join("")} <span class="stars" style="font-size:16px">${"★".repeat(o.stars)}${"☆".repeat(5-o.stars)}</span></div>
   <div class="stat"><span>Стадия</span><span>${stageName(o.lvl)}</span></div><div class="stat"><span>Уровень</span><span>${o.lvl}/${ml}</span></div>
   <div class="bar"><div style="width:${o.lvl/ml*100}%"></div></div>
   <div class="stat"><span>❤️ Здоровье</span><span>${st.hp}</span></div>
   <div class="stat"><span>⚔️ Атака</span><span>${st.atk}</span></div>
   <div class="stat"><span>🛡️ Защита</span><span>${st.def}</span></div>
   <div class="stat"><span>💨 Скорость</span><span>${st.spd}</span></div>
   <div class="stat"><span>⚡ Сила</span><span>${power(id)}</span></div>
  </div></div>
  <div class="desc">${d.desc}</div>
  <div class="elchips"><b>Силён против:</b> ${[...new Set(d.els.flatMap(e=>ELEMENTS[e].strong))].map(e=>`<span style="background:${ELEMENTS[e].color}">${ELEMENTS[e].ico} ${ELEMENTS[e].name}</span>`).join("")}<br><b>Слаб против:</b> ${[...new Set(d.els.flatMap(e=>ELEMENTS[e].weak))].map(e=>`<span style="background:${ELEMENTS[e].color}">${ELEMENTS[e].ico} ${ELEMENTS[e].name}</span>`).join("")||"—"}</div>
  <div><b>Навыки:</b> <small>(${dSkills(id).length}) · древо: ${d.els.map(e=>ELEMENTS[e].ico+treeLvl(id,e)).join(" ")}</small>${dSkills(id).map(k=>{const s=SKILLS[k];return `<div class="skill"><span>${s.el?ELEMENTS[s.el].ico:"⚪"} ${s.name}${skillMult(id,k)>1?` <small>+${Math.round((skillMult(id,k)-1)*100)}%</small>`:""}</span><small>${s.desc}${s.cd?` · КД ${s.cd}`:""}</small></div>`}).join("")}</div>
  <div class="row"><button class="btn green" id="feed" ${o.lvl>=ml||S.food<fc?"disabled":""}>🍖 Кормить (${fc})</button>
  <button class="btn purple" id="evo" ${o.lvl<ml||o.stars>=5||!canPay(ec)?"disabled":""}>★ Эволюция (${costStr(ec)})</button>
  <button class="btn blue" id="feed10" ${o.lvl>=ml?"disabled":""}>🍖 x10</button></div>
  ${o.lvl>=ml&&o.stars<5?`<small>Макс. уровень для ${o.stars}★ — эволюционируй!</small>`:""}${(()=>{const tb=treeBonuses(id);const parts=[];["hp","atk","def","spd"].forEach(k=>{if(tb[k])parts.push(PASSIVE_INFO[k].ico+"+"+Math.round(tb[k]*100)+"%")});if(tb.crit)parts.push("🎯+"+Math.round(tb.crit*100)+"%");if(tb.lifesteal)parts.push("🩸"+Math.round(tb.lifesteal*100)+"%");if(tb.startshield)parts.push("🔰"+Math.round(tb.startshield*100)+"%");return parts.length?`<div class="stat"><span>🎓 Бонусы Академии</span><span>${parts.join(" ")}</span></div>`:""})()}`);
  $("#feed",m).onclick=()=>{feed(id,1);dragonDetail(id)};
  $("#feed10",m).onclick=()=>{feed(id,10);dragonDetail(id)};
  $("#evo",m).onclick=()=>{pay(ec);o.stars++;addXP(200);save();toast(`✨ ${d.name} эволюционировал до ${o.stars}★!`);dragonDetail(id)};
}
function feed(id,n){const o=S.dragons[id];let k=0;for(let i=0;i<n;i++){const c=feedCost(id);if(o.lvl>=maxLevel(o.stars)||S.food<c)break;S.food-=c;o.lvl++;k++;addXP(Math.round(25*islBonus("xp")))}
  if(k)toast(`🍖 ${dInfo(id).name} → уровень ${o.lvl}`);else toast("Не хватает еды или достигнут максимум");save();updateTop()}
function giveEgg(id,src){S.inv=S.inv||[];S.inv.push({id,src:src||"shop"});save();toast(`🥚 Яйцо «${dInfo(id).name}» добавлено в инвентарь. Положи его в Инкубатор!`)}
function buyDragon(id){const d=dInfo(id),r=RARITY[d.rarity];if(isSpecial(id)){toast("👑 Только через разведение или событие");return}if(S.level<DRAGON_REQ[d.id]){toast(`Нужен уровень Хранителя ${DRAGON_REQ[d.id]}`);return}const pr=dragonPrice(d);if(!canPay(pr)){toast("Не хватает "+(pr.gems?"💎 алмазов":"🪙 золота"));return}pay(pr);giveEgg(id,"shop");addXP(50);save();updateTop();closeModal();if($("#scr-dragons").classList.contains("active"))renderDragons();if($("#scr-shop").classList.contains("active"))renderShop()}

/* ================= БОЙ (пошаговый, как в DML) ================= */
let B=null; // battle state
let team=[];  // выбранная команда игрока
const OPPONENTS=[
  {name:"Новичок Пит", lvl:1, ids:["d29"]},
  {name:"Огурчик", lvl:1, ids:["d44","d68"]},
  {name:"Ученик Лофо", lvl:2, ids:["d65","d47"]},
  {name:"Птичий двор", lvl:2, ids:["d90","d47","d44"]},
  {name:"Доктора-стажёры", lvl:3, ids:["d13","d41"]},
  {name:"Стражница Роуз", lvl:3, ids:["d27","d25","d28"]},
  {name:"Банда Четвёрок", lvl:5, ids:["d05","d06","d07"]},
  {name:"Клиника 222-666", lvl:8, ids:["d13","d14","d15"]},
  {name:"Кибер-отряд", lvl:11, ids:["d08","d09","d20"]},
  {name:"Ночной кошмар", lvl:14, ids:["d03","d16","d18"]},
  {name:"Королевы", lvl:17, ids:["d11","d12","d21"]},
  {name:"Тёмный Легион", lvl:20, ids:["d10","d02","d24"]},
  {name:"ДРЕВНИЙ УЖАС", lvl:25, ids:["d30","d31","d10"]},
  {name:"Серафим и Тиран", lvl:30, ids:["d59","d63","d75"]},
];
function renderBattleMenu(){
  const root=$("#scr-battle");const own=housedIds();team=team.filter(isHoused);
  root.innerHTML=`<div class="arena-menu">
  <div class="panel modes"><button class="mode camp" onclick="show('campaign')"><b>📖 Кампания</b><small>Сюжет · ${campProgress()}/${CAMPAIGN_NODES.length}</small></button><button class="mode pvp" onclick="show('pvp')"><b>🏟️ PvP Арена</b><small>Живые игроки · 10 с на ход</small></button><button class="mode fr" onclick="show('friends')"><b>👥 Друзья</b><small>${(NET.friends||[]).filter(f=>f.online).length} онлайн</small></button></div>
  <div class="panel"><h2>⚔️ Команда (до 3 драконов)</h2><div class="picker" id="pk">${own.map(id=>`<span class="pkw"><img src="assets/${id}.png" title="${dInfo(id).name} ур.${S.dragons[id].lvl}${copiesOf(id)>1?" · копий: "+copiesOf(id):""}" data-id="${id}" class="${team.includes(id)?"sel":""}">${copiesOf(id)>1?`<b class="copies">${team.filter(x=>x===id).length}/${Math.min(copiesOf(id),housedCount(id))}</b>`:""}</span>`).join("")}</div><p style="margin-top:8px;font-size:13px">Сила команды: <b id="tp">${team.reduce((a,id)=>a+power(id),0)}</b></p>
  <div class="desc">Бой как в оригинале: очередь по скорости, выбираешь атаку и цель, затем <b>тайминг</b> — нажми, когда маркер в зелёной зоне (Идеально ×1.3, Хорошо ×1.0, Мимо ×0.8). При атаке врага нажми вовремя — <b>блок</b> до 50% урона. Стихии: сильная ×1.5, слабая ×0.5. 👑 Легенда сильна против всех базовых стихий и не имеет слабостей к ним, слаба лишь к 🔱 Божеству.</div></div>
  <div class="panel"><h2>🏟️ Подбор соперника <button class="btn sm blue" id="eltable" style="margin-left:auto">📊 Таблица стихий</button></h2>
  <small>Соперники подбираются под <b>твоих лучших драконов</b>: уровень и стихии врагов подстраиваются под сильнейшую тройку (даже если она сейчас не в команде), а комбинации стихий берутся с учётом того, против чего твои лучшие слабы — придётся думать над составом.</small>
  <div class="mm-grid">${["easy","normal","hard"].map(k=>{const o=matchmake(k);const p=o.ids.reduce((a,id)=>a+power(id,{lvl:o.lvl,stars:1+Math.floor(o.lvl/10)}),0);return `<div class="opp mm ${k}"><div>${o.ids.map(id=>`<img src="assets/${id}.png">`).join("")}</div><div style="flex:1;font-size:13px"><b>${o.name}</b><br><small>ур. ${o.lvl} · ⚡${p} · ${o.ids.map(id=>dInfo(id).els.map(elIco).join("")).join(" | ")}</small></div><button class="btn sm red" data-mm="${k}">В бой!</button></div>`}).join("")}</div>
  <div class="row"><button class="btn purple" id="rndfight">🔄 Другие соперники</button></div>
  <p style="font-size:12px;margin-top:6px">Побед: <b>${S.wins}</b> · Боёв: ${S.battles}. Сюжетные бои — в 📖 Кампании.</p></div></div>`;
  $$("[data-mm]",root).forEach(b=>b.onclick=()=>startBattle(matchmake(b.dataset.mm)));
  $$("#pk img",root).forEach(im=>im.onclick=()=>{const id=im.dataset.id;const n=team.filter(x=>x===id).length;if(n>=Math.min(copiesOf(id),housedCount(id))){team=team.filter(x=>x!==id)}else if(team.length<3)team.push(id);else toast("Максимум 3 дракона");renderBattleMenu()});
  $$("[data-o]",root).forEach(b=>b.onclick=()=>startBattle(OPPONENTS[b.dataset.o]));
  $("#eltable").onclick=()=>modal(`<h2>📊 Стихии (как в оригинале)</h2><table class="eltab"><tr><th>Стихия</th><th>Сильна против (×1.5)</th><th>Слаба к (×0.5)</th></tr>${ELEMENT_KEYS.map(k=>{const e=ELEMENTS[k];return `<tr><td>${elIco(k)} ${e.name}</td><td>${e.strong.length>4?"все базовые":e.strong.map(elIco).join("")}</td><td>${e.weak.map(elIco).join("")||"—"}</td></tr>`}).join("")}</table><small>Множитель считается по стихии навыка против каждой стихии цели, поэтому у двухстихийных врагов можно получить ×2.25 или ×0.25.</small>`);
  $("#rndfight").onclick=()=>{S._mmSeed=Date.now();renderBattleMenu()};
}
/* ---- адаптивный подбор: под лучших драконов игрока ---- */
function bestOwn(n){return housedIds().sort((a,b)=>power(b)-power(a)).slice(0,n)}
function matchmake(diff){const best=bestOwn(3);if(!best.length)return {name:"Соперник",lvl:1,ids:["d29"]};
  const rng=seededRng((S._mmSeed||S.battles*7919+S.level)+{easy:1,normal:2,hard:3}[diff]*104729);
  const avgLvl=best.reduce((a,id)=>a+S.dragons[id].lvl,0)/best.length;const stars=Math.max(...best.map(id=>S.dragons[id].stars));
  const lvl=Math.max(1,Math.round(avgLvl*{easy:.8,normal:1.0,hard:1.25}[diff]+(stars-1)*3+{easy:-1,normal:1,hard:3}[diff]));
  // стихии игрока и то, что против них сильно
  const mine=[...new Set(best.flatMap(id=>dInfo(id).els))];const counters=[...new Set(mine.flatMap(e=>ELEMENT_KEYS.filter(k=>ELEMENTS[k].strong.includes(e)&&BASE_ELEMENTS.includes(k))))];
  const wantCounter={easy:.2,normal:.5,hard:.8}[diff];
  const allowSpecial=diff==="hard"&&avgLvl>=12;
  const pool=DRAGONS.filter(d=>!d.boss&&!isEvent(d.id)&&(allowSpecial||!isSpecial(d.id))&&!isDivine(d.id)&&!isTyrant(d.id));
  const ids=[];let guard=0;while(ids.length<Math.min(3,Math.max(1,best.length))&&guard++<200){const useC=rng()<wantCounter&&counters.length;const el=useC?counters[Math.floor(rng()*counters.length)]:mine[Math.floor(rng()*mine.length)];
    const cand=pool.filter(d=>d.els.includes(el)&&!ids.includes(d.id));const d=cand.length?cand[Math.floor(rng()*cand.length)]:pool[Math.floor(rng()*pool.length)];if(!ids.includes(d.id))ids.push(d.id)}
  const names={easy:["Разминка","Лёгкий спарринг","Новички арены"],normal:["Достойный соперник","Равный бой","Ветераны арены"],hard:["Контр-отряд","Элита арены","Кошмар для твоей тройки"]}[diff];
  return {name:names[Math.floor(rng()*names.length)],lvl,ids,random:true,diff}}
function enemySkills(id,lvl){const d=dInfo(id);if(d.els.includes("soviet"))return ["sovhit","sovhit_s","sovban"];if(id==="d157")return ["staffslam","staffcut","doom"];if(id==="d160")return ["hellgaze","hellfire","hellswap","helldrain","hellheal","hellkara"];const b=baseSkills(id).filter((k,i)=>lvl>=SLOT_LEVEL[i]);if(lvl>=8)b.push(ELEMENT_SPREAD[d.els[0]]);if(lvl>=12)b.push(ELEMENT_ABILITY[d.els[0]]);return b}
function mkFighter(id,ov,side,i){const st=dragonStats(id,ov);const d=dInfo(id);if(d.els.includes("soviet")){st.hp=Math.round(st.hp*0.55)}return {id,side,i,name:d.name,els:d.els,skills:ov?enemySkills(id,ov.lvl):dSkills(id),hp:st.hp,maxhp:st.hp,atk:st.atk,def:st.def,spd:st.spd,cds:{},buffAtk:0,buffDef:0,debuff:0,crit:st.crit,timeb:st.timeb,lifesteal:st.lifesteal||0,dmgB:st.dmg||{},shield:Math.round(st.hp*(st.startshield||0)),fx:[],tb:st.tb||{},reviveUsed:false,soviet:d.els.includes("soviet"),charge:d.els.includes("soviet")?(side==="enemy"?-i:0):0,lvl:ov?ov.lvl:S.dragons[id].lvl}}
function startBattle(opp){
  if(team.length===0){toast("Выбери хотя бы одного дракона!");return}
  const ov={lvl:opp.lvl,stars:Math.min(5,1+Math.floor(opp.lvl/10)),enemy:true};
  show("battle");
  RNG=opp.seed?seededRng(opp.seed):Math.random;
  B={opp,allies:team.map((id,i)=>{const f=mkFighter(id,null,"ally",i);if(opp.carry&&opp.carry[id]){f.hp=Math.min(f.maxhp,opp.carry[id])}return f}),enemies:opp.ids.map((id,i)=>mkFighter(id,ov,"enemy",i)),log:[],round:0,queue:[],busy:false,sel:null,pvp:!!opp.pvp,turnNo:0};
  if(opp.pvp){B.enemies=opp.enemyFighters;[...B.allies,...B.enemies].forEach(f=>{f.maxhp=Math.round(f.maxhp*0.75);f.hp=f.maxhp;f.shield=Math.round((f.shield||0)*0.75)})} // PvP: HP ×0.75 (hpm 1.8) — короче бои
  [B.allies,B.enemies].forEach(team=>{const ta=team.reduce((a,f)=>a+(f.tb.teamatk||0),0),td=team.reduce((a,f)=>a+(f.tb.teamdef||0),0);if(ta||td)team.forEach(f=>{f.atk=Math.round(f.atk*(1+ta));f.def=Math.round(f.def*(1+td))})});
  playMusic(opp.music||(opp.pvp?"pvp":"battle"));
  S.battles++;nextTurn(true);
}
function alive(arr){return arr.filter(f=>f.hp>0)}
function elMult(skillEl,attacker,target){
  const e=skillEl||attacker.els[0];let m=1;
  if(target.id==="d160")return 0.75; // Лось: все стихии — ничто не «эффективно», всё чуть слабее
  if(attacker.id==="d160")return 1.8; // его удары эффективны по всем
  target.els.forEach(t=>{
    if(ELEMENTS[e].strong.includes(t))m*=1.5;
    else if(ELEMENTS[e].weak.includes(t))m*=0.5;
  });
  if(e==="legend"&&(target.els.includes("divine")||target.els.includes("tyrant")))m=0.5;if(e==="divine"&&target.els.includes("tyrant"))m=0.5;
  return Math.min(2.25,Math.max(.25,m));
}
function nextTurn(first){
  if(!B)return;
  if(!alive(B.allies).length||!alive(B.enemies).length){endBattle(alive(B.allies).length>0);return}
  if(!B.queue.length){B.round++;const src=B.pvp&&!B.opp.host?[...B.enemies,...B.allies]:[...B.allies,...B.enemies];src.forEach((f,i)=>{f._j=(RNG()-.5)*4;f._o=i});B.queue=alive(src).sort((a,b)=>(B.round===1?((b.tb.firststrike?1000:0)-(a.tb.firststrike?1000:0)):0)||(b.spd+b._j)-(a.spd+a._j)||a._o-b._o);
    // Стая: разогнанные бойцы (spdT>0) ходят дважды за раунд
    const fast=B.queue.filter(f=>f.spdT>0);if(fast.length){B.queue=B.queue.concat(fast)}
    const mo=B.queue.find(f=>f.id==="d160");if(mo){const rest=B.queue.filter(f=>f!==mo);B.queue=[mo,rest[0],mo,rest[1],mo,rest[2],mo].filter(Boolean).concat(rest.slice(3))}
    // тик баффов/кд
    [...B.allies,...B.enemies].forEach(f=>{Object.keys(f.cds).forEach(k=>f.cds[k]=Math.max(0,f.cds[k]-1));if(f.buffAtk>0)f.buffAtkT--;if(f.buffAtkT<=0)f.buffAtk=0;if(f.buffDef>0)f.buffDefT--;if(f.buffDefT<=0)f.buffDef=0;if(f.debuff>0)f.debuffT--;if(f.debuffT<=0)f.debuff=0;if(f.spdT>0){f.spdT--;if(f.spdT<=0&&f._spd0){f.spd=f._spd0}}});
    log(`— Раунд ${B.round} —${B.round>SUDDEN_DEATH.from?` ⚡ урон +${Math.round((B.round-SUDDEN_DEATH.from)*SUDDEN_DEATH.step*100)}%`:""}`)}
  B.cur=B.queue.shift();if(B.cur.hp<=0){nextTurn();return}
  // тик эффектов текущего бойца
  const f0=B.cur;let skip=false;
  f0.fx=(f0.fx||[]).filter(e=>{e.t--;
    if(e.k==="burn"){const dm=Math.max(1,Math.round(f0.maxhp*0.06));f0.hp=Math.max(0,f0.hp-dm);log(`🔥 ${f0.name} горит: -${dm}`)}
    if(e.k==="bleed"){const dm=Math.max(1,Math.round(f0.maxhp*0.05));f0.hp=Math.max(0,f0.hp-dm);pop(fEl(f0),"🩸-"+dm,"crit");log(`🩸 ${f0.name} истекает кровью: -${dm}`)}
    if(e.k==="hot"&&!(f0.fx||[]).some(x=>x.k==="noheal")){const h=Math.round(f0.maxhp*0.1);f0.hp=Math.min(f0.maxhp,f0.hp+h);log(`💚 ${f0.name} восстанавливает ${h}`)}
    if(e.k==="stun"||e.k==="freeze"){skip=true;log(`${e.k==="stun"?"💫":"🧊"} ${f0.name} пропускает ход!`)}
    return e.t>0});
  if(f0.soviet&&f0.hp>0&&skip){log(`🖥️ ${f0.name}: загрузка прервана (${Math.max(0,f0.charge||0)}/3)`)}
  if(f0.soviet&&f0.hp>0&&!skip){f0.charge=(f0.charge||0)+1;if(f0.charge>=3){log(`🖥️ ${f0.name}: ЦЕЛЬ НАЙДЕНА`)}else{sndPlay("init",.7);log(`🖥️ ${f0.name} загружается… (${Math.max(0,f0.charge)}/3)`)}}
  if(f0.tb.regen&&f0.hp>0&&!(f0.fx||[]).some(x=>x.k==="noheal")){const h=Math.round(f0.maxhp*f0.tb.regen);f0.hp=Math.min(f0.maxhp,f0.hp+h);log(`💚 ${f0.name} регенерирует ${h}`)}
  if(f0.hp<=0){renderBattle();setTimeout(nextTurn,500);return}
  if(skip){renderBattle();setTimeout(nextTurn,900);return}
  B.sel=null;B.turnNo++;$("#navbar").classList.add("locked");renderBattle();
  if(B.pvp){pvpTurnStart();return}
  if(B.cur.side==="enemy"){B.busy=true;setTimeout(aiTurn,900)}
}
function log(s){B.log.push(s);if(B.log.length>40)B.log.shift()}
function lootBonus(){return team.reduce((a,id)=>a+((treeBonuses(id).loot)||0),0)}
function battleBg(){const o=B&&B.opp;if(!o)return null;if(o.bg)return o.bg;if(o.final)return BATTLE_BG.final;if(o.boss)return BATTLE_BG.boss;if(o.campaign)return BATTLE_BG.campaign[o.ch]||BATTLE_BG.default;if(o.pvp)return BATTLE_BG.pvp;return BATTLE_BG.default}
function syncHellAnim(){if(!B||!B.opp.horror)return;const t=performance.now();const set=(el,durs)=>{if(el)el.style.animationDelay=durs.map(d=>(-(t%d))+"ms").join(",")};set($(".arena-field"),[1400,3000]);set($(".fighter.moose img"),[4000]);$$(".fighter.ally img").forEach(e=>set(e,[1100]))}
function renderBattle(){
  const root=$("#scr-battle");const f=B.cur;
  const fh=(x)=>`<div class="fighter ${x.side} ${dInfo(x.id).noflip?"noflip":""} ${dInfo(x.id).flipAlly?"flipally":""} ${dInfo(x.id).big?"bigspr":""} ${x.lvl>=50?"maxaura":""} ${x.id==="d160"?"moose":""} ${x.banned?"banned":""} ${x.hp<=0?"dead":""} ${x===f?"active":""} pos${x.i}" data-side="${x.side}" data-i="${x.i}"><img src="assets/${x.id}.png"><div class="hpbar"><div class="${x.hp/x.maxhp<.3?"low":""}" style="width:${x.hp/x.maxhp*100}%"></div>${x.shield?`<div class="shieldbar" style="width:${Math.min(100,x.shield/x.maxhp*100)}%"></div>`:""}</div>${x.soviet&&x.hp>0?`<div class="charge ${x.charge>=2?"hot":""}"><span style="width:${Math.min(100,(x.charge||0)/3*100)}%"></span><b>${x.charge>=3?"⚠ BANNED!":"⏳ "+Math.max(0,x.charge||0)+"/3"}</b></div>`:""}${x.banned?`<div class="banmark">BANNED</div>`:""}<div class="fn">${x.name} <small>ур.${x.lvl}</small></div><div>${x.els.map(elIco).join("")}</div>${x.buffAtk?"<small>⚔️↑</small>":""}${x.buffDef?"<small>🛡️↑</small>":""}${x.debuff?"<small>⚔️↓</small>":""}${x.shield?`<small>🔰${x.shield}</small>`:""}${(x.fx||[]).map(e=>({burn:"🔥",hot:"💚",stun:"💫",freeze:"🧊",slow:"🐌",vuln:"💔"})[e.k]||"").join("")}</div>`;
  root.innerHTML=`<div class="arena ${B.opp.horror?"horror falling":""}">
   ${B.pvp?`<div class="pvp-head"><span>${S.profile.name} ${leagueOf(S.pvp.rating).ico}</span><span class="pvp-timer" id="pvpt">10</span><span>${B.opp.name}</span></div>`:""}<div class="turn-order">${[f,...B.queue].map(x=>`<img src="assets/${x.id}.png" class="${x===f?"now":""} ${x.side==="enemy"?"en":""}">`).join("")}</div>
   <div class="arena-field iso-arena" style="${battleBg()?`background:url(assets/bg/${battleBg()}.jpg) center/cover`:""}"><div class="arena-floor" ${battleBg()?'style="opacity:.35"':""}></div><div class="team allies">${B.allies.map(fh).join("")}</div><div class="team enemies">${B.enemies.map(fh).join("")}</div></div>
   <div class="battle-log" id="blog">${B.log.map(l=>`<div>${l}</div>`).join("")}</div>
   <div class="skills" id="sk">${f.side==="ally"?f.skills.map(k=>{const s=SKILLS[k];const cd=f.cds[k]||0;const effs=s.type==="attack"?alive(B.enemies).map(t=>elMult(s.el,f,t)):[];const eb=effs.length?Math.max(...effs):0;const ew=effs.length?Math.min(...effs):0;return `<button class="skillbtn ${B.sel===k?"sel":""}" data-k="${k}" ${cd||(k==="sovban"&&(f.charge||0)<3)?"disabled":""} style="${s.el?`border-color:${ELEMENTS[s.el].color}`:""}"><b>${s.el?ELEMENTS[s.el].ico:"⚪"} ${s.name}</b>${s.type==="attack"?`<span class="eff ${eb>1?"strong":ew<1&&eb<=1?"weak":"mid"}">${eb>1?"▲ сильно":ew<1&&eb<=1?"▼ слабо":"● обычно"}</span>`:""}<small>${s.desc}</small>${cd?`<span class="cd">⏳${cd}</span>`:k==="sovban"&&(f.charge||0)<3?`<span class="cd">⏳${Math.max(0,f.charge||0)}/3</span>`:""}</button>`}).join(""):`<div style="grid-column:1/-1;color:#ffe9b8;font-weight:900;text-align:center;padding:14px">Ход противника: ${f.name}…</div>`}
   <button class="btn red sm" style="grid-column:1/-1" id="flee">🏳️ Сдаться</button></div></div>`;
  $("#blog").scrollTop=1e9;
  $("#flee").onclick=()=>{if(confirm("Сдаться?")){if(B.pvp)pvpForfeit();else endBattle(false)}};
  if(f.side==="ally"){
    $$(".skillbtn",root).forEach(b=>b.onclick=()=>{SFX.select();B.sel=b.dataset.k;renderBattle();const s=SKILLS[B.sel];
      if(s.aoe||s.type==="buff"||s.type==="debuff"){useSkill(f,B.sel,null)}
      else{const tgtSide=s.type==="heal"?"ally":"enemy";$$(`.fighter[data-side="${tgtSide}"]`).forEach(el=>{const t=(tgtSide==="ally"?B.allies:B.enemies)[+el.dataset.i];if(t.hp>0){el.classList.add("target");el.onclick=()=>useSkill(f,B.sel,t);if(s.type==="attack")markEff(el,elMult(s.el,f,t))}});toast(s.type==="heal"?"Выбери союзника":"Выбери цель")}});
    // автовыбор цели, если навык уже выбран - подсветить
    if(B.sel){const s=SKILLS[B.sel];if(!(s.aoe||s.type==="buff"||s.type==="debuff")){const tgtSide=s.type==="heal"?"ally":"enemy";$$(`.fighter[data-side="${tgtSide}"]`).forEach(el=>{const t=(tgtSide==="ally"?B.allies:B.enemies)[+el.dataset.i];if(t.hp>0){el.classList.add("target");el.onclick=()=>useSkill(f,B.sel,t);if(s.type==="attack")markEff(el,elMult(s.el,f,t))}})}}
  }
  syncHellAnim();bindInspect(root);
}

/* ===== долгое нажатие: инфо о бойце ===== */
const FX_NAME={burn:["🔥","Горение","−6% HP каждый ход"],bleed:["🩸","Кровотечение","−5% HP каждый ход"],stun:["💫","Оглушение","пропуск хода"],freeze:["🧊","Заморозка","пропуск хода"],slow:["🐌","Замедление","скорость −30%"],hot:["💚","Регенерация","+10% HP каждый ход"],vuln:["🎯","Уязвимость","получаемый урон +40%"],noheal:["🚫","ПРИГОВОР","лечение и регенерация запрещены"]};
function inspectFighter(f){if(!f)return;const d=dInfo(f.id);const rows=[];
  rows.push(["❤️ HP",`${f.hp} / ${f.maxhp}${f.shield?` (+🔰${f.shield})`:""}`]);
  rows.push(["⚔️ Атака",`${f.atk}${f.buffAtk?` <span class="up">+${Math.round(f.buffAtk*100)}%</span>`:""}${f.debuff?` <span class="down">−${Math.round(f.debuff*100)}%</span>`:""}`]);
  rows.push(["🛡️ Защита",`${f.def}${f.buffDef?` <span class="up">+${Math.round(f.buffDef*100)}%</span>`:""}`]);
  rows.push(["💨 Скорость",`${f.spd}${f.spdT>0?" <span class=\"up\">разгон</span>":""}`]);
  rows.push(["🎯 Крит",Math.round((f.crit||.1)*100)+"%"]);
  if(f.lifesteal)rows.push(["🩸 Вампиризм",Math.round(f.lifesteal*100)+"%"]);
  const fx=(f.fx||[]).map(e=>{const n=FX_NAME[e.k]||["✴️",e.k,""];return `<div class="insp-fx">${n[0]} <b>${n[1]}</b> <small>${n[2]}</small> <span class="badge">${e.t} х.</span></div>`});
  if(f.buffAtk>0)fx.push(`<div class="insp-fx">🔺 <b>Усиление атаки</b> <small>+${Math.round(f.buffAtk*100)}%</small> <span class="badge">${f.buffAtkT} х.</span></div>`);
  if(f.buffDef>0)fx.push(`<div class="insp-fx">🔺 <b>Усиление защиты</b> <small>+${Math.round(f.buffDef*100)}%</small> <span class="badge">${f.buffDefT} х.</span></div>`);
  if(f.debuff>0)fx.push(`<div class="insp-fx">🔻 <b>Ослабление</b> <small>атака −${Math.round(f.debuff*100)}%</small> <span class="badge">${f.debuffT} х.</span></div>`);
  if(f.banned)fx.push(`<div class="insp-fx">🚫 <b>BANNED</b> <small>удалён из боя</small></div>`);
  const extra=[];if(f.soviet)extra.push(`🖥️ Зарядка BANNED: <b>${Math.max(0,f.charge||0)}/3</b>${f.charge>=3?" — ЦЕЛЬ НАЙДЕНА":""}`);
  if(f.id==="d160"){extra.push(`👁️ Ходов сделано: <b>${f._mv||0}</b>`);extra.push(`⛧ Все стихии. Эффективные удары по нему ×0.75, его удары ×1.8`);extra.push(`⏳ ОТКАТ: <b>${Math.min(10,f.hcharge||0)}/10</b>`)}
  const tb=f.tb||{};const pas=Object.keys(tb).filter(k=>!["hp","atk","def","spd","dmg"].includes(k)&&tb[k]).map(k=>`${k}: ${typeof tb[k]==="number"?(tb[k]<1?Math.round(tb[k]*100)+"%":tb[k]):"✓"}`);if(pas.length)extra.push("📘 Пассивы: "+pas.join(", "));
  const sk=f.skills.map(k=>{const s=SKILLS[k];if(!s)return "";const cd=f.cds[k]||0;return `<div class="skill insp-sk"><span>${s.el&&ELEMENTS[s.el]?ELEMENTS[s.el].ico:"⚪"} <b>${s.name}</b> <small>${s.type==="attack"?"атака ×"+s.power:s.type==="heal"?"лечение "+Math.round(s.power*100)+"%":s.type}${s.aoe?", по всем":""}${s.effect?", эффект: "+((FX_NAME[s.effect]||[])[1]||s.effect):""}${s.chance&&s.chance<1?" ("+Math.round(s.chance*100)+"%)":""}${s.cd?", кд "+s.cd:""}</small><br><small>${s.desc||""}</small></span>${cd?`<span class="badge">кд ${cd}</span>`:""}</div>`}).join("");
  modal(`<h2>${f.side==="enemy"?"👹":"🐲"} ${f.name} <span class="badge" style="background:${RARITY[d.rarity].color||"#555"}">ур.${f.lvl}</span></h2>
  <div class="feature"><img src="assets/${f.id}.png" style="width:110px;height:130px;object-fit:contain"><div style="flex:1"><div class="hpbar" style="height:10px"><div style="width:${f.hp/f.maxhp*100}%"></div></div><small>Стихии: ${f.els.map(e=>ELEMENTS[e]?ELEMENTS[e].ico+" "+ELEMENTS[e].name:e).join(", ")}</small></div></div>
  <div class="panel" style="margin:8px 0">${rows.map(r=>`<div class="stat"><span>${r[0]}</span><span>${r[1]}</span></div>`).join("")}</div>
  <div class="panel" style="margin:8px 0"><h3>Эффекты</h3>${fx.length?fx.join(""):"<small>нет</small>"}</div>
  ${extra.length?`<div class="panel" style="margin:8px 0"><h3>Доп. инфо</h3>${extra.map(x=>`<div><small>${x}</small></div>`).join("")}</div>`:""}
  <div class="panel" style="margin:8px 0"><h3>Навыки</h3>${sk}</div>`)}
function bindInspect(root){$$(".fighter",root).forEach(el=>{let t=null,moved=false;const f=(el.dataset.side==="ally"?B.allies:B.enemies)[+el.dataset.i];
  const start=e=>{moved=false;clearTimeout(t);t=setTimeout(()=>{t=null;el.classList.add("insp");setTimeout(()=>el.classList.remove("insp"),300);inspectFighter(f)},550)};
  const cancel=()=>{clearTimeout(t);t=null};
  el.addEventListener("pointerdown",start);el.addEventListener("pointerup",cancel);el.addEventListener("pointerleave",cancel);el.addEventListener("pointercancel",cancel);el.addEventListener("pointermove",e=>{if(e.movementX>3||e.movementY>3)cancel()});el.addEventListener("contextmenu",e=>e.preventDefault())})}
function vfx(el,kind){if(!el)return;const f=document.createElement("div");f.className="vfx vfx-"+(kind||"basic");
  const ico={tyrant:"💀",digit:"🔢",clock:"🕒",night:"🌙",cat:"🐱",doc:"💉",bird:"🐦",cyber:"💾",glitch:"🧩",sheep:"🐏",royal:"💎",beast:"🐾",money:"💰",zodiac:"♈",fire:"🔥",water:"💧",plant:"🌿",earth:"🪨",wind:"🌪️",energy:"⚡",metal:"⚙️",ice:"❄️",shadow:"🌑",light:"✨",legend:"👑",basic:"💥",heal:"💚",buff:"🔺",debuff:"🔻"}[kind]||"💥";
  f.innerHTML=`<span>${ico}</span><span>${ico}</span><span>${ico}</span><i></i>`;el.append(f);setTimeout(()=>f.remove(),900)}
function lunge(el,dir){if(!el)return;el.classList.add(dir>0?"lunge-r":"lunge-l");setTimeout(()=>el.classList.remove("lunge-r","lunge-l"),450)}
function flash(kind){const a=$(".arena-field");if(!a)return;const f=document.createElement("div");f.className="screenflash";f.style.background=ELEMENTS[kind]?ELEMENTS[kind].color:"#fff";a.append(f);setTimeout(()=>f.remove(),400)}
function markEff(el,m){if($(".effmark",el))return;const b=document.createElement("div");b.className="effmark "+(m>1?"strong":m<1?"weak":"mid");b.textContent=m>1?"▲ СИЛЬНО ×"+m.toFixed(2).replace(/\.?0+$/,""):m<1?"▼ СЛАБО ×"+m.toFixed(2).replace(/\.?0+$/,""):"● ОБЫЧНО";el.append(b)}
function pop(el,txt,cls){if(!el)return;const p=document.createElement("div");p.className="dmgpop "+(cls||"");p.textContent=txt;el.append(p);setTimeout(()=>p.remove(),1000)}
function fEl(f){return $(`.fighter[data-side="${f.side}"][data-i="${f.i}"]`)}
function showTiming(mode,cb,timeb){timeb=timeb||0;
  const a=$(".arena-field");if(!a){cb("good");return}
  const o=document.createElement("div");o.className="timing";
  o.innerHTML=`<div class="tlabel">${mode==="attack"?"⚔️ Нажми в зелёной зоне для мощного удара!":"🛡️ Нажми вовремя, чтобы заблокировать!"}</div><div class="tbar"><div class="zone good" style="left:${29-timeb*100}%;width:${42+timeb*200}%"></div><div class="zone perfect" style="left:${43-timeb*100}%;width:${14+timeb*200}%"></div><div class="marker"></div></div><small>клик / пробел</small>`;
  if(mode==="attack")SFX.charge();else SFX.click();
  a.append(o);const mk=$(".marker",o);let t0=performance.now(),done=false;const dur=1100;
  function pos(){const p=((performance.now()-t0)%(dur*2))/dur;return p<=1?p:2-p}
  let raf;function loop(){if(done)return;mk.style.left=(pos()*100)+"%";raf=requestAnimationFrame(loop)}loop();
  const to=setTimeout(()=>fin(),dur*2.5);
  function fin(){if(done)return;done=true;clearTimeout(to);cancelAnimationFrame(raf);const p=pos();const dist=Math.abs(p-.5);let r="miss";if(dist<=TIMING.perfect.w/2+timeb)r="perfect";else if(dist<=TIMING.good.w/2+timeb)r="good";
    o.classList.add("res-"+r);$(".tlabel",o).textContent=TIMING[r].label;if(mode==="attack"&&r==="perfect")SFX.perfect();else if(mode==="defend"&&r!=="miss")SFX.block();else SFX.click();document.removeEventListener("keydown",kd);setTimeout(()=>{o.remove();cb(r)},350)}
  function kd(e){if(e.code==="Space"){e.preventDefault();fin()}}
  o.onmousedown=o.ontouchstart=e=>{e.preventDefault();fin()};document.addEventListener("keydown",kd);
}
function useSkill(actor,k,target,fromNet){
  if(B.busy&&actor.side==="ally"&&!fromNet)return;
  if(k==="sovban"){if((actor.charge||0)<3){toast("⏳ Загрузка не завершена ("+Math.max(0,actor.charge||0)+"/3)");return}actor.charge=0}B.busy=true;clearTimeout(B.turnTimer);
  const s=SKILLS[k];
  if(B.pvp&&!fromNet&&actor.side==="ally"){
    if(s.type==="attack"){$$(".target").forEach(e=>{e.classList.remove("target");e.onclick=null});$$(".skillbtn").forEach(b=>b.disabled=true);
      showTiming("attack",r=>{const atkM=TIMING[r].atk;if(r==="perfect")flash("royal");pvpSend({t:"act",k,ti:target?target.i:null,n:B.turnNo,atkM});B.waitBlk={actor,k,target,atkM};toast("⏳ Соперник блокирует…")},actor.timeb);return}
    pvpSend({t:"act",k,ti:target?target.i:null,n:B.turnNo});applySkill(actor,k,target,1,0);return}
  if(s.type==="attack"){
    const mode=actor.side==="ally"?"attack":"defend";
    $$(".target").forEach(e=>{e.classList.remove("target");e.onclick=null});$$(".skillbtn").forEach(b=>b.disabled=true);
    const tb=mode==="attack"?actor.timeb:Math.max(...alive(B.allies).map(a=>a.timeb||0),0);
    showTiming(mode,r=>{const atkM=mode==="attack"?TIMING[r].atk:1;const blk=mode==="defend"?TIMING[r].block:0;
      if(mode==="attack"&&r==="perfect")flash("royal");
      if(mode==="defend"&&r!=="miss")alive(B.allies).forEach(f=>pop(fEl(f),"🛡️ -"+Math.round(blk*100)+"%","heal"));
      applySkill(actor,k,target,atkM,blk)},tb);
    return}
  applySkill(actor,k,target,1,0);
}
/* ---- PvP: сетевой ход ---- */
function pvpTurnStart(){const f=B.cur;const mine=f.side==="ally";let left=PVP_TURN_MS/1000;const tEl=()=>$("#pvpt");
  clearInterval(B.tick);B.tick=setInterval(()=>{left--;const e=tEl();if(e){e.textContent=Math.max(0,left);e.classList.toggle("warn",left<=3)}if(left<=0){clearInterval(B.tick)}},1000);
  if(mine){B.busy=false;clearTimeout(B.turnTimer);B.turnTimer=setTimeout(()=>{if(!B||B.busy)return;toast("⏰ Время вышло — ход сделан автоматически");const k=f.skills.find(x=>SKILLS[x].type==="attack")||f.skills[0];const s=SKILLS[k];const t=(s.aoe||s.type!=="attack")?(s.type==="heal"?alive(B.allies)[0]:null):alive(B.enemies)[0];useSkill(f,k,t)},PVP_TURN_MS)}
  else{B.busy=true;/* ждём act от соперника; если он не пришёл за 10+3 с — сервер/мы делаем автоход тем же правилом */clearTimeout(B.turnTimer);B.turnTimer=setTimeout(()=>{if(!B||B.cur!==f)return;const k=f.skills.find(x=>SKILLS[x].type==="attack")||f.skills[0];const s=SKILLS[k];const t=(s.aoe||s.type!=="attack")?(s.type==="heal"?alive(B.enemies)[0]:null):alive(B.allies)[0];applyNetAct(f,k,t,1)},PVP_TURN_MS+3000)}}
function applyNetAct(f,k,t,atkM){if(!B)return;clearTimeout(B.turnTimer);B.busy=true;const s=SKILLS[k];
  if(s.type==="attack"){$$(".skillbtn").forEach(b=>b.disabled=true);showTiming("defend",r=>{const blk=TIMING[r].block;pvpSend({t:"blk",blk,n:B.turnNo});if(blk)alive(B.allies).forEach(x=>pop(fEl(x),"🛡️ -"+Math.round(blk*100)+"%","heal"));applySkill(f,k,t,atkM||1,blk)},Math.max(...alive(B.allies).map(a=>a.timeb||0),0))}
  else applySkill(f,k,t,1,0)}
function pvpForfeit(){pvpSend({t:"forfeit"});pvpFinish(false,"Вы сдались")}
function pvpFinish(won,why){if(!B)return;$("#navbar").classList.remove("locked");clearInterval(B.tick);clearTimeout(B.turnTimer);B=null;RNG=Math.random;S.pvp.games=(S.pvp.games||0)+1;if(won)S.pvp.wins=(S.pvp.wins||0)+1;
  const rew=won?{gold:800+S.level*100,scrolls:3,gems:3}:{gold:150};S.gold+=rew.gold;S.scrolls=(S.scrolls||0)+(rew.scrolls||0);S.gems+=rew.gems||0;save();updateTop();playMusic("map");
  modal(`<div class="result ${won?"win":"lose"}">${won?"ПОБЕДА В PvP!":"ПОРАЖЕНИЕ"}</div><p class="center">${why||""}</p><div class="center" style="font-weight:900">+${costStr(rew)}</div><p class="center" id="ratingline"><small>рейтинг обновляется…</small></p><div class="row" style="justify-content:center"><button class="btn green" onclick="closeModal();show('pvp')">Ок</button></div>`,{closable:false})}
function applySkill(actor,k,target,atkM,blk){
  const s=SKILLS[k];if(s.cd)actor.cds[k]=s.cd+1;
  lunge(fEl(actor),actor.side==="ally"?1:-1);
  if(actor.id==="d157"){const ae=fEl(actor);const im=ae&&$("img",ae);if(im){im.src="assets/d157_raise.png";setTimeout(()=>{if(im)im.src="assets/d157.png"},900)}
    const tg=s.aoe?alive(actor.side==="ally"?B.enemies:B.allies):[target];setTimeout(()=>tg.forEach((t,j)=>{const te=fEl(t);if(!te)return;const sl=document.createElement("img");sl.className="slashfx";sl.src=`assets/fx_slash${(j%2)+1}.png`;te.append(sl);setTimeout(()=>sl.remove(),700)}),350)}
  if(s.aoe)flash(s.el);
  const foes=actor.side==="ally"?B.enemies:B.allies,friends=actor.side==="ally"?B.allies:B.enemies;
  if(s.type==="attack"&&s.oneshot&&target){sndPlay("found",.9);const t=target;const el=fEl(t);if(el){el.classList.add("hit");vfx(el,"glitch")}
    if(t.tb.dodge&&RNG()<t.tb.dodge){pop(el,"УКЛОНЕНИЕ","weak");log(`💨 ${t.name} чудом уклонился от BANNED!`)}
    else{t.hp=0;t.shield=0;t.banned=true;t.reviveUsed=true;if(el){el.classList.add("banned");const b=document.createElement("div");b.className="banmark";b.textContent="BANNED";el.append(b)}pop(el,"BANNED","crit");log(`🚫 <b>${t.name}</b> ЗАБАНЕН: удалён из боя одним ударом!`)}
    setTimeout(()=>{[...B.allies,...B.enemies].forEach(x=>{const e=fEl(x);if(!e)return;const bar=$(".hpbar div",e);bar.style.width=(x.hp/x.maxhp*100)+"%";e.classList.toggle("dead",x.hp<=0)});B.busy=false;nextTurn()},1200);return}
  if(s.type==="attack"){
    const targets=s.aoe?alive(foes):[target];
    let healed=0;
    targets.forEach(t=>{const m=elMult(s.el,actor,t);const crit=RNG()<(actor.crit||0.1);const vuln=(t.fx||[]).some(e=>e.k==="vuln")?1.4:1;
      if(t.tb.dodge&&RNG()<t.tb.dodge){pop(fEl(t),"УКЛОНЕНИЕ","weak");log(`💨 ${t.name} уклонился!`);return}
      const rage=actor.tb.rage&&actor.hp/actor.maxhp<0.4?1+actor.tb.rage:1;const exec=actor.tb.execute&&t.hp/t.maxhp<(actor.tb.execute)?1.5:1;const cm=crit?1.7+(actor.tb.critdmg||0):1;
      const ramp=B.round>SUDDEN_DEATH.from?1+(B.round-SUDDEN_DEATH.from)*SUDDEN_DEATH.step:1;let dmg=ramp*atkM*(1-blk)*(actor.atk*(1+actor.buffAtk-actor.debuff)*s.power*(1+((actor.dmgB||{})[s.el]||0))*(s.aoe?0.7:1)*rage*exec)*(100/(100+t.def*(1+t.buffDef)))*m*vuln*rnd(90,110)/100*cm;
      dmg=Math.max(1,Math.round(dmg));if(s.execute)dmg=Math.max(dmg,Math.round(t.maxhp*s.execute));
      if(t.tb.thorns&&actor.hp>0){const th=Math.max(1,Math.round(dmg*t.tb.thorns));actor.hp=Math.max(0,actor.hp-th);pop(fEl(actor),"-"+th,"weak");log(`🌵 ${t.name} вернул ${th} урона`)}
      if(t.shield>0){const ab=Math.min(t.shield,dmg);t.shield-=ab;dmg-=ab;if(ab)log(`🔰 щит ${t.name} поглотил ${ab}`)}
      t.hp=Math.max(0,t.hp-dmg);healed+=dmg;
      if(t.hp<=0&&t.tb.revive&&!t.reviveUsed){t.reviveUsed=true;t.hp=Math.round(t.maxhp*t.tb.revive);pop(fEl(t),"✨ ВОСКРЕС","heal");log(`✨ ${t.name} поднимается с ${t.hp} HP!`)}
      if(t.hp>0){t.fx=t.fx||[];if(actor.tb.burnaura&&RNG()<actor.tb.burnaura&&!t.fx.some(e=>e.k==="burn")){t.fx.push({k:"burn",t:3});log(`🔥 ${t.name} подожжён`)}if(actor.tb.stunaura&&RNG()<actor.tb.stunaura&&!t.fx.some(e=>e.k==="stun")){t.fx.push({k:"stun",t:1});log(`💫 ${t.name} оглушён`)}}
      if(s.effect&&t.hp>0){const ch=s.chance||1;if(RNG()<ch){t.fx=t.fx||[];
        if(s.effect==="burn"){const ex=t.fx.find(e=>e.k==="burn");if(ex)ex.t=3;else t.fx.push({k:"burn",t:3})}
        else if(s.effect==="stun")t.fx.push({k:"stun",t:1});
        else if(s.effect==="freeze")t.fx.push({k:"freeze",t:1});
        else if(s.effect==="slow"){t.spd=Math.round(t.spd*0.7);t.fx.push({k:"slow",t:2})}
        else if(s.effect==="weaken"){t.debuff=0.3;t.debuffT=3}
        else if(s.effect==="bleed"){const ex=t.fx.find(e=>e.k==="bleed");if(ex)ex.t=4;else t.fx.push({k:"bleed",t:4});if(s.execute){alive(foes).forEach(x=>{x.fx=x.fx||[];const nh=x.fx.find(e=>e.k==="noheal");if(nh)nh.t=3;else x.fx.push({k:"noheal",t:3})});log(`🚫 ПРИГОВОР: лечение всей команды отключено на 3 хода`);hellToast()}}
        log(`✴️ ${t.name}: ${({burn:"горение",stun:"оглушение",freeze:"заморозка",slow:"замедление",weaken:"ослабление",lifesteal:"кража прогресса",bleed:"кровотечение",execute:"КАРА"})[s.effect]||s.effect}`)}}
      SFX.el(s.el||actor.els[0]);const el=fEl(t);if(el){el.classList.add("hit");vfx(el,s.el||actor.els[0]);pop(el,(m>1?"💥":m<1?"🛡":"")+"-"+dmg,crit?"crit":m<1?"weak":"")}
      log(`${actor.name} → ${s.name} → ${t.name}: <b>${dmg}</b>${atkM>1?" ИДЕАЛЬНО":""}${blk?" блок "+Math.round(blk*100)+"%":""}${m>1?" (эффективно!)":m<1?" (слабо)":""}${crit?" КРИТ!":""}${t.hp<=0?" ☠️":""}`)});
    const ls=(s.effect==="lifesteal"?0.5:0)+(actor.lifesteal||0);if(ls>0&&healed>0&&!(actor.fx||[]).some(x=>x.k==="noheal")){const h=Math.round(healed*ls);actor.hp=Math.min(actor.maxhp,actor.hp+h);pop(fEl(actor),"+"+h,"heal");log(`🩸 ${actor.name} восстановил ${h}`)}
  }else if(s.type==="heal"){
    const targets=s.aoe?alive(friends):[target];
    targets.forEach(t=>{if((t.fx||[]).some(e=>e.k==="noheal")){pop(fEl(t),"ЛЕЧЕНИЕ ЗАПРЕЩЕНО","weak");log(`🚫 ${t.name}: лечение заблокировано (ПРИГОВОР)`);return}const h=Math.round(t.maxhp*s.power*(1+((actor.dmgB||{})[s.el]||0))*(1+(actor.tb.healboost||0)));t.hp=Math.min(t.maxhp,t.hp+h);
      if(s.effect==="hot"){t.fx=t.fx||[];t.fx.push({k:"hot",t:2})}
      if(s.effect==="cleanse"){t.fx=(t.fx||[]).filter(e=>e.k==="hot");t.debuff=0}SFX.heal();vfx(fEl(t),"heal");pop(fEl(t),"+"+h,"heal");log(`${actor.name} лечит ${t.name} на ${h}`)});
  }else if(s.type==="buff"){
    alive(friends).forEach(t=>{if(k==="armor"){t.buffDef=1;t.buffDefT=3}else if(s.effect==="spd"){if(!t._spd0)t._spd0=t.spd;t.spd=Math.round(t._spd0*2.2);t.spdT=3;t.buffAtk=Math.max(t.buffAtk,s.power);t.buffAtkT=3;pop(fEl(t),"💨💨 x2.2","heal")}else{t.buffAtk=s.power;t.buffAtkT=3}vfx(fEl(t),"buff");pop(fEl(t),k==="armor"?"🛡️↑":"⚔️↑","heal")});SFX.buff();log(`${actor.name}: ${s.name} на всю команду!`);
  }else if(s.type==="debuff"){
    alive(foes).forEach(t=>{t.debuff=s.power;t.debuffT=3;vfx(fEl(t),"debuff");pop(fEl(t),"⚔️↓","weak")});SFX.debuff();log(`${actor.name}: ${s.name} на всех врагов!`);
  }
  // обновить полоски без полного перерендера
  [...B.allies,...B.enemies].forEach(t=>{const el=fEl(t);if(!el)return;const bar=$(".hpbar div",el);bar.style.width=(t.hp/t.maxhp*100)+"%";bar.classList.toggle("low",t.hp/t.maxhp<.3);el.classList.toggle("dead",t.hp<=0)});
  $$(".target").forEach(e=>{e.classList.remove("target");e.onclick=null});$$(".skillbtn").forEach(b=>b.disabled=true);
  const bl=$("#blog");if(bl){bl.innerHTML=B.log.map(l=>`<div>${l}</div>`).join("");bl.scrollTop=1e9}
  setTimeout(()=>{B.busy=false;nextTurn()},800);
}
function aiTurn(){
  if(!B)return;const f=B.cur;const foes=alive(B.allies),friends=alive(B.enemies);
  const ready=f.skills.filter(k=>SKILLS[k]&&!(f.cds[k]>0));
  // приоритеты: лечить если кто-то <35%, иначе самый сильный навык, цель — по стихии
  const hurt=friends.find(x=>x.hp/x.maxhp<.35);
  let k=null,t=null;
  if(f.id==="d160"){f._mv=(f._mv||0)+1;f.hcharge=(f.hcharge||0)+1;let k;if(f._mv%3===0){k="hellkara"}else if(f.hcharge>=10&&f.hp<f.maxhp*.9){k="hellheal";f.hcharge=0}else{const ex=["hellfire","helldrain","hellgaze"].filter(x=>!(f.cds[x]>0));const pool=ex.length?ex.concat(RNG()<.25?["hellswap"]:[]):["hellswap"];k=pool[Math.floor(RNG()*pool.length)]}const t=k==="hellfire"?null:k==="hellheal"?f:foes.slice().sort((a,b)=>b.hp-a.hp)[0];if(k==="hellfire"){jumpscare(600)}hellFx(k,t);if(f._mv%3===0)hellSay();useSkill(f,k,t);return}
  if(f.soviet&&f.charge>=3){f.charge=0;const tg=foes.slice().sort((a,b)=>b.hp-a.hp)[0];useSkill(f,"sovban",tg);return}
  if(f.soviet){const r2=ready.filter(k=>k!=="sovban");useSkill(f,r2[Math.floor(RNG()*r2.length)]||"sovhit",foes[Math.floor(RNG()*foes.length)]);return}
  const heals=ready.filter(k=>SKILLS[k].type==="heal");
  if(hurt&&heals.length){k=heals[0];t=hurt}
  else{const atks=ready.filter(k=>SKILLS[k].type==="attack").sort((a,b)=>SKILLS[b].power*(SKILLS[b].aoe?foes.length*.8:1)-SKILLS[a].power*(SKILLS[a].aoe?foes.length*.8:1));
    const others=ready.filter(k=>["buff","debuff"].includes(SKILLS[k].type));
    if(others.length&&RNG()<.4&&B.round>1)k=others[0];else k=atks[0]||"basic";
    if(SKILLS[k].type==="attack"&&!SKILLS[k].aoe){t=foes.slice().sort((a,b)=>elMult(SKILLS[k].el,f,b)*(1+ (1-b.hp/b.maxhp))-elMult(SKILLS[k].el,f,a)*(1+(1-a.hp/a.maxhp)))[0]}}
  useSkill(f,k,t);
}
function endBattle(win){$("#navbar").classList.remove("locked");
  if(B&&B.pvp){const won=win;if(B.opp.host)pvpSend({t:"result",winner:won?0:1});pvpFinish(won,won?"Соперник повержен!":"Соперник оказался сильнее.");return}
  clearInterval(B.tick);playMusic(B.opp.campaign?"campaign":"map");
  const opp=B.opp;const hpLeft={};B.allies.forEach(f=>hpLeft[f.id]=f.hp);B=null;
  if(opp.onEnd){opp.onEnd(win,hpLeft);return}
  let gold=0,xp=0,gems=0,food=0;
  if(win){const es=ECON_SCALE(S.level);gold=Math.round((200*opp.lvl+rnd(0,100))*es);xp=40+60*opp.lvl;food=Math.round(50*opp.lvl*es);const idx=OPPONENTS.indexOf(opp);if(idx>=0&&idx===S.wins){S.wins++;gems=10;}else if(idx<0)gems=opp.diff==="hard"?rnd(3,6):opp.diff==="normal"?rnd(1,3):rnd(0,1);
    S.gold+=gold;S.food+=food;S.gems+=gems;addXP(xp);
    // прогресс квестов
    S.quests.wins=(S.quests.wins||0)+1;S.scrolls=(S.scrolls||0)+SCROLL_PER_WIN(opp.lvl);}
  else{xp=10;addXP(xp)}
  save();updateTop();
  if(win)SFX.win();else SFX.lose();
  modal(`<div class="result ${win?"win":"lose"}">${win?"ПОБЕДА!":"ПОРАЖЕНИЕ"}</div><p class="center">${win?`Противник <b>${opp.name}</b> повержен!`:"Драконы отступают, но станут сильнее."}</p>
  <div class="center" style="font-size:18px;font-weight:900;margin:10px">${win?`+🪙${gold} +🍖${food} ${gems?"+💎"+gems:""} +📜${SCROLL_PER_WIN(opp.lvl)} +⭐${xp} XP`:`+⭐${xp} XP`}</div>
  <div class="row" style="justify-content:center"><button class="btn green" id="ok">Продолжить</button></div>`,{closable:false});
  $("#ok").onclick=()=>{closeModal();if(opp.campaign)show("campaign");else renderBattleMenu()};
}

/* ================= ИНКУБАТОР И ИНВЕНТАРЬ ================= */
function openIncubator(){
  S.inv=S.inv||[];S.incub=S.incub||[];S.pending=S.pending||[];const nests=INCUBATOR_NESTS(S.level);
  const m=modal(`<h2>🥚 Инкубатор <span class="badge gold">${S.incub.length}/${nests} гнёзд</span></h2>
  <div class="acad-slots">${Array.from({length:nests}).map((_,i)=>{const e=S.incub[i];if(!e)return `<div class="acad-slot empty">Свободное гнездо</div>`;const d=dInfo(e.id);const left=Math.max(0,e.end-Date.now()),done=left<=0;const secret=e.secret&&!done;
    return `<div class="acad-slot"><div class="eggpic ${done?"crack":""}" style="background:${secret?"#ddd":ELEMENTS[d.els[0]].color}">${done?"🐣":"🥚"}</div><div><b>${secret?"???":d.name}</b><br><small>${secret?"Неизвестное яйцо":RARITY[d.rarity].name}</small><div class="bar" style="margin:4px 0"><div style="width:${100-left/e.total*100}%"></div></div><button class="btn sm ${done?"green":""}" data-h="${i}" ${done?"":"disabled"}>${done?"Вылупить!":"⏳ "+tleft(e.end)}</button> ${done?"":`<button class="btn sm purple" data-sp="${i}">💎${Math.ceil(left/60000)}</button>`}</div></div>`}).join("")}</div>
  ${S.pending.length?`<h3 style="margin-top:10px">🐣 Вылупились — нужно поселить:</h3>${S.pending.map((id,i)=>`<div class="skill"><span><img src="assets/${id}.png" style="height:40px;vertical-align:middle"> ${dInfo(id).name} ${dInfo(id).els.map(elIco).join("")}</span><button class="btn sm green" data-place="${i}">🏠 Поселить</button></div>`).join("")}`:""}
  <h3 style="margin-top:10px">🎒 Инвентарь яиц (${S.inv.length})</h3><div class="picker">${S.inv.map((e,i)=>`<div class="egg-item" data-egg="${i}" title="${e.secret?"Неизвестное яйцо":dInfo(e.id).name}"><div class="eggpic" style="background:${e.secret?"#ddd":ELEMENTS[dInfo(e.id).els[0]].color}">🥚</div><small>${e.secret?"???":dInfo(e.id).name}</small></div>`).join("")||"<i>Пусто. Яйца появляются после покупки драконов, из магазинных яиц и разведения.</i>"}</div>`);
  $$("[data-egg]",m).forEach(el=>el.onclick=()=>{if(S.incub.length>=nests){toast("Нет свободных гнёзд");return}const e=S.inv.splice(+el.dataset.egg,1)[0];const t=HATCH_TIME[dInfo(e.id).rarity];S.incub.push({...e,end:Date.now()+t,total:t});save();openIncubator()});
  $$("[data-sp]",m).forEach(b=>b.onclick=()=>{const e=S.incub[+b.dataset.sp];const c=Math.ceil((e.end-Date.now())/60000);if(S.gems<c){toast("Не хватает 💎");return}S.gems-=c;e.end=Date.now();save();updateTop();openIncubator()});
  $$("[data-h]",m).forEach(b=>b.onclick=()=>{const e=S.incub.splice(+b.dataset.h,1)[0];const d=dInfo(e.id);
    if(S.dragons[e.id]){const g=Math.round(RARITY[d.rarity].price*.4);save();const mm=modal(`<h2>🐣 ${d.name}</h2><div class="center"><img src="assets/${e.id}.png" style="height:150px"><p>У вас уже есть такой дракон. Оставить <b>копию</b> (можно поселить и взять в команду вторым) или продать за 🪙${g} + 🍖200?</p><div class="row" style="justify-content:center"><button class="btn green" id="dupkeep">Оставить копию</button><button class="btn" id="dupsell">Продать</button></div></div>`);
      $("#dupkeep",mm).onclick=()=>{S.dragons[e.id].copies=(S.dragons[e.id].copies||0)+1;S.pending.push(e.id);save();closeModal();toast("🐲 Копия добавлена — посели её в жилище");openIncubator()};
      $("#dupsell",mm).onclick=()=>{S.gold+=g;S.food+=200;save();updateTop();closeModal();toast(`+🪙${g} +🍖200`);openIncubator()};return}
    S.dragons[e.id]={lvl:1,xp:0,stars:1,sp:0};S.pending.push(e.id);addXP(120);save();
    modal(`<h2>🐣 Вылупился!</h2><div class="center"><img src="assets/${e.id}.png" style="height:160px;animation:float 1s infinite alternate"><h3>${d.name}</h3><span class="badge" style="background:${RARITY[d.rarity].color}">${RARITY[d.rarity].name}</span><div>${d.els.map(elIco).join("")}</div><p class="desc">${d.desc}</p><p><b>Теперь дракона нужно поселить в жилище!</b></p><button class="btn green" id="pl">🏠 Поселить</button></div>`);$("#pl").onclick=()=>placeDragon(e.id)});
  $$("[data-place]",m).forEach(b=>b.onclick=()=>placeDragon(S.pending[+b.dataset.place]));
}
function placeDragon(id){const d=dInfo(id);
  const opts=[];S.islands.forEach((isl,ii)=>isl.tiles.forEach((t,ti)=>{const b=BUILDINGS[t.b];if(b&&b.el&&d.els.includes(b.el)&&t.dragons.length<HAB_CAP(b,habLvl(t)))opts.push({ii,ti,b})}));
  const m=modal(`<h2>🏠 Поселить ${d.name}</h2><div class="center"><img src="assets/${id}.png" style="height:100px"></div><p>Стихии: ${d.els.map(elIco).join("")}. Подходящие жилища:</p>
  ${opts.length?opts.map((o,i)=>`<div class="skill"><span>${o.b.ico} ${o.b.name} ${elIco(o.b.el)} <small>${ISLANDS.find(x=>x.id===S.islands[o.ii].id).name} · ${S.islands[o.ii].tiles[o.ti].dragons.length}/${HAB_CAP(o.b,habLvl(S.islands[o.ii].tiles[o.ti]))}</small></span><button class="btn sm green" data-o="${i}">Сюда</button></div>`).join(""):`<p><b>Нет свободного жилища подходящей стихии.</b> Построй ${d.els.map(e=>BUILDINGS["habitat_"+e]?BUILDINGS["habitat_"+e].ico+" "+BUILDINGS["habitat_"+e].name:"").filter(Boolean).join(" или ")} на острове — дракон подождёт в инкубаторе.</p><button class="btn" id="tomap">🗺️ На остров</button>`}`);
  $$("[data-o]",m).forEach(b=>b.onclick=()=>{const o=opts[+b.dataset.o];if(isHoused(id)){toast("Этот дракон уже поселён");closeModal();return}S.islands[o.ii].tiles[o.ti].dragons.push(id);S.pending=S.pending.filter(x=>x!==id);S.cur=o.ii;save();closeModal();toast(`🏠 ${d.name} поселён!`);show("map")});
  const tm=$("#tomap",m);if(tm)tm.onclick=()=>{closeModal();show("map")};
}
function copiesOf(id){const o=S.dragons[id];return 1+((o&&o.copies)||0)}
function housedCount(id){return allTiles().reduce((a,t)=>a+t.dragons.filter(x=>x===id).length,0)}
function isHoused(id){return housedCount(id)>0}
function canHouseMore(id){return housedCount(id)<copiesOf(id)}

/* ================= АКАДЕМИЯ (как в оригинале): тренировки → очки навыков дракона → древо навыков ================= */
function skillMult(id,k){const o=S.dragons[id];const sk=SKILLS[k];if(!o||!sk||!sk.el)return 1;return 1+(treeBonuses(id,o).dmg[sk.el]||0)}
function baseSkills(id){const d=dInfo(id);return [...new Set(d.els.map(e=>ELEMENT_ATTACK[e]))].slice(0,3)}
function dSkills(id){const o=S.dragons[id];const lvl=o?o.lvl:1;const d=dInfo(id);const out=baseSkills(id).filter((k,i)=>lvl>=SLOT_LEVEL[i]);
  d.els.forEach(el=>{const L=treeLvl(id,el,o);if(L>=3)out.push(ELEMENT_SPREAD[el]);if(L>=4)out.push(ELEMENT_ABILITY[el])});
  return [...new Set(out)].slice(0,8)}
function dSP(id){return (S.dragons[id].sp)||0}
function hasAcademy(){return allTiles().some(t=>t.b==="academy")}
function academyRooms(){return ROOM_REQ.filter(l=>S.level>=l).length}

function renderAcademy(){
  const root=$("#scr-academy");S.academy=S.academy||[];const training=S.academy;const rooms=academyRooms();
  if(!hasAcademy()){root.innerHTML=`<div style="padding:14px"><div class="panel"><h2>🏫 Академия драконов</h2><p>Академия — это здание. Построй его на острове (вкладка «Особые» в меню строительства, доступно с уровня ${BUILDINGS.academy.req}, ${costStr(BUILDINGS.academy.cost)}).</p><p>В Академии драконы проходят <b>тренировки</b> и получают <b>очки навыков</b>, которые тратятся в личном <b>древе навыков</b> дракона: открытие новых слотов и повышение уровня навыков.</p><button class="btn green" onclick="show('map')">🗺️ На остров</button></div></div>`;return}
  root.innerHTML=`<div style="padding:14px"><div class="panel"><h2>🏫 Академия драконов <span class="badge gold">${training.length}/${rooms} комнат</span> <span class="badge" style="background:#2f8fe0">📜 ${S.scrolls||0} свитков</span></h2>
  <small>Тренировки дают дракону <b>очки (📘)</b>. Трать их в <b>древе каждой стихии дракона</b> (6 уровней): 1 — +10% урона стихии, 2 — пассив, 3 — атака по всем, 4 — <b>способность стихии</b> (оглушение, горение, щит, лечение…), 5 — пассив ×2, 6 — <b>выбор одного из двух бонусов</b>. Комнаты: ур. ${ROOM_REQ.join(", ")}.<br><b>📜 Свитки обучения</b> — быстрый способ получить 📘: за победы на арене, ежедневный подарок, задания, 📚 Библиотека (ур.5), магазин и каждый новый уровень. В карточке дракона нажми «+1/+5/Все».</small>
  <div class="acad-slots">${Array.from({length:rooms}).map((_,i)=>{const tr=training[i];if(!tr)return `<div class="acad-slot empty">🏫 Комната ${i+1}<br>свободна</div>`;const d=dInfo(tr.id),T=TRAININGS[tr.t];const left=Math.max(0,tr.end-Date.now());const done=left<=0;
   return `<div class="acad-slot"><img src="assets/${tr.id}.png"><div><b>${d.name}</b><br><small>${T.name} тренировка → +📘${T.sp}</small><div class="bar" style="margin-top:4px"><div style="width:${100-left/T.time*100}%"></div></div><button class="btn sm ${done?"green":""}" data-done="${i}" ${done?"":"disabled"}>${done?"Забрать очки!":"⏳ "+tleft(tr.end)}</button> ${done?"":`<button class="btn sm purple" data-sp="${i}">💎${Math.ceil(left/60000)}</button>`}</div></div>`}).join("")}</div></div>
  <div class="panel" style="margin-top:12px"><h2>Драконы</h2><small>Нажми на дракона: тренировка или древо навыков.</small><div class="dr-grid" style="padding:0">${housedIds().map(id=>dragonCard(id,`<div class="badge" style="background:#2f8fe0">📘 ${dSP(id)}</div>`)).join("")}</div></div></div>`;
  $$("[data-done]",root).forEach(b=>b.onclick=()=>{const tr=training.splice(+b.dataset.done,1)[0];const o=S.dragons[tr.id];o.sp=(o.sp||0)+TRAININGS[tr.t].sp;addXP(40*(tr.t+1));save();toast(`📘 ${dInfo(tr.id).name} +${TRAININGS[tr.t].sp} очков навыков`);renderAcademy()});
  $$("[data-sp]",root).forEach(b=>b.onclick=()=>{const tr=training[+b.dataset.sp];const c=Math.ceil((tr.end-Date.now())/60000);if(S.gems<c){toast("Не хватает 💎");return}S.gems-=c;tr.end=Date.now();save();updateTop();renderAcademy()});
  $$(".dr-card",root).forEach(c=>c.onclick=()=>academyDragon(c.dataset.id));
}
function academyDragon(id){const d=dInfo(id),o=S.dragons[id];const inTrain=S.academy.some(t=>t.id===id);
  const m=modal(`<h2>🏫 ${d.name} <span class="badge" style="background:#2f8fe0">📘 ${dSP(id)}</span></h2><div class="center"><img src="assets/${id}.png" style="height:100px"></div>
  <div class="tabs"><button class="active" data-t="train">Тренировка</button>${d.els.map(el=>`<button data-t="${el}" style="border-color:${ELEMENTS[el].color}">${ELEMENTS[el].ico} ${ELEMENTS[el].name} ${treeLvl(id,el,o)}/${TREE_MAX}</button>`).join("")}</div><div id="acbody"></div>`);
  let tab="train";o.tree=o.tree||{};
  function draw(){$$(".tabs button",m).forEach(b=>b.classList.toggle("active",b.dataset.t===tab));const body=$("#acbody",m);$("h2 .badge",m).textContent="📘 "+dSP(id);
    if(tab==="train"){const scr=S.scrolls||0;body.innerHTML=`<div class="skill" style="border-color:#2f8fe0"><span>📜 Свитки обучения: <b>${scr}</b><br><small>1 свиток = 1 📘 этому дракону мгновенно</small></span><span><button class="btn sm blue" data-conv="1" ${scr<1?"disabled":""}>+1</button> <button class="btn sm blue" data-conv="5" ${scr<5?"disabled":""}>+5</button> <button class="btn sm blue" data-conv="${scr}" ${scr<1?"disabled":""}>Все</button></span></div>`+(inTrain?"<p>Дракон уже тренируется.</p>":S.academy.length>=academyRooms()?"<p>Все комнаты заняты.</p>":TRAININGS.map((T,i)=>`<div class="skill"><span>${T.name} тренировка<br><small>${T.time/60000} мин · +📘${T.sp}</small></span><button class="btn sm green" data-tr="${i}" ${canPay(T.cost)?"":"disabled"}>${costStr(T.cost)}</button></div>`).join(""));
      $$("[data-conv]",m).forEach(b=>b.onclick=()=>{const n=Math.min(+b.dataset.conv,S.scrolls||0);if(n<1)return;S.scrolls-=n;o.sp=(o.sp||0)+n*SCROLL_TO_SP;save();updateTop();toast(`📜${n} → 📘${n*SCROLL_TO_SP} для ${d.name}`);draw()});
      $$("[data-tr]",m).forEach(b=>b.onclick=()=>{const T=TRAININGS[+b.dataset.tr];pay(T.cost);S.academy.push({id,t:+b.dataset.tr,end:Date.now()+T.time});save();closeModal();toast("📚 Тренировка началась");renderAcademy()})}
    else{const el=tab,E=ELEMENTS[el];const t=o.tree[el]=o.tree[el]||{lvl:0,final:null};const L=t.lvl;const p=TREE_PASSIVE[el],pi=PASSIVE_INFO[p];
      const nodes=[
        {n:`+10% урона атак ${E.name}`,ico:"⚔️"},
        {n:`${pi.ico} +${Math.round(pi.v*100)}% ${pi.n}`,ico:pi.ico},
        {n:`Разброс: ${SKILLS[ELEMENT_SPREAD[el]].name} — атака по всем`,ico:"🌐"},
        {n:`Способность: ${SKILLS[ELEMENT_ABILITY[el]].name} — ${SKILLS[ELEMENT_ABILITY[el]].desc}`,ico:"✨"},
        {n:`${pi.ico} ещё +${Math.round(pi.v*100)}% ${pi.n}`,ico:pi.ico},
        {n:"Выбор одного из двух бонусов",ico:"🏁"}];
      let html=`<small>Древо стихии <b>${E.ico} ${E.name}</b> — 6 уровней, как в оригинале. Каждый уровень покупается за 📘 по порядку.</small><div class="tree">`;
      nodes.forEach((nd,i)=>{const lv=i+1;const st=L>=lv?"done":L===lv-1?"next":"lock";const c=TREE_COST[i];
        html+=`<div class="tnode ${st}" style="--c:${E.color}"><div class="tico">${nd.ico}</div><div class="tt"><b>Ур. ${lv}</b> ${nd.n}${lv===6&&L>=6&&t.final!=null?`<br><small>✅ ${FINAL_OPTIONS[el][t.final].n}</small> <button class="btn sm" data-respec="1" ${S.gems<FINAL_RESPEC.gems?"disabled":""}>🔄 Сменить за 💎${FINAL_RESPEC.gems}</button>`:""}</div>${st==="next"?`<button class="btn sm green" data-tl="${lv}" ${dSP(id)<c?"disabled":""}>📘${c}</button>`:st==="done"?"✅":"🔒"}</div>`});
      html+=`</div>`;
      if(L>=6&&t.final==null)html+=`<p><b>🏁 Выбери финальный бонус:</b></p>`+FINAL_OPTIONS[el].map((f,i)=>`<div class="skill"><span>${f.n}</span><button class="btn sm purple" data-final="${i}">Выбрать</button></div>`).join("");
      body.innerHTML=html;
      $$("[data-tl]",m).forEach(b=>b.onclick=()=>{const lv=+b.dataset.tl;o.sp-=TREE_COST[lv-1];t.lvl=lv;save();toast(`${E.ico} ${E.name}: уровень ${lv}`);$$(".tabs button",m).forEach(bt=>{if(bt.dataset.t===el)bt.innerHTML=`${E.ico} ${E.name} ${lv}/${TREE_MAX}`});draw()});
      $$("[data-final]",m).forEach(b=>b.onclick=()=>{t.final=+b.dataset.final;save();toast("🏁 "+FINAL_OPTIONS[el][t.final].n);draw()});
      const rs=$("[data-respec]",m);if(rs)rs.onclick=()=>{if(S.gems<FINAL_RESPEC.gems){toast("Нужно 💎"+FINAL_RESPEC.gems);return}S.gems-=FINAL_RESPEC.gems;t.final=null;save();updateTop();toast("🔄 Финальный бонус сброшен — выбери новый");draw()}}}
  $$(".tabs button",m).forEach(b=>b.onclick=()=>{tab=b.dataset.t;draw()});draw();
}
setInterval(()=>{if($("#scr-academy").classList.contains("active")&&!$("#modal-root").innerHTML)renderAcademy()},3000);

/* ================= РАЗВЕДЕНИЕ ================= */
let breedSel=[];
function breedResult(a,b){const da=dInfo(a),db=dInfo(b);const els=[...new Set([...da.els,...db.els])];
  // Особые (легенда/бог/тиран) выпадают ТОЛЬКО по правилам legendChance; Легенда+любой никогда не даст легенду, Бог+любой — бога.
  const lc=legendChance(a,b);if(lc&&Math.random()<lc.p){const pool=DRAGONS.filter(d=>!isEvent(d.id)&&!d.boss&&(lc.kind==="tyrant"?isTyrant(d.id):lc.kind==="divine"?isDivine(d.id):isLegend(d.id)));return pick(pool).id}
  let pool=DRAGONS.filter(d=>d.id!==a&&d.id!==b&&!isSpecial(d.id)&&!d.boss&&d.els.every(e=>els.includes(e)));if(!pool.length)pool=DRAGONS.filter(d=>!isSpecial(d.id)&&!d.boss&&d.els.some(e=>els.includes(e)));if(!pool.length)pool=DRAGONS.filter(d=>!isSpecial(d.id)&&!d.boss);
  const rw={common:50,rare:30,epic:14,legendary:5,divine:1};
  const pr=Math.max(RARITY[da.rarity].mult,RARITY[db.rarity].mult);
  const weighted=pool.map(d=>({d,w:rw[d.rarity]*(pr>1.4&&["epic","legendary","divine"].includes(d.rarity)?3:1)*Math.max(1,d.els.filter(e=>els.includes(e)).length)}));
  let tot=weighted.reduce((s,x)=>s+x.w,0),r=Math.random()*tot;for(const x of weighted){r-=x.w;if(r<=0)return x.d.id}return pool.length?pool[0].id:a}
function isLegend(id){return dInfo(id).els.includes("legend")}function isDivine(id){return dInfo(id).els.includes("divine")}function isTyrant(id){return dInfo(id).els.includes("tyrant")}function isEvent(id){return !!dInfo(id).eventOnly}function isSpecial(id){return isLegend(id)||isDivine(id)||isTyrant(id)||isEvent(id)}
function possibleChildren(a,b){const els=[...new Set([...dInfo(a).els,...dInfo(b).els])];return DRAGONS.filter(d=>d.id!==a&&d.id!==b&&!isSpecial(d.id)&&d.els.every(e=>els.includes(e))).map(d=>d.id)}
function legendChance(a,b){const la=S.dragons[a].lvl,lb=S.dragons[b].lvl;const ml=Math.min(la,lb);
  const spA=isSpecial(a)||dInfo(a).boss,spB=isSpecial(b)||dInfo(b).boss;
  if(isDivine(a)&&isDivine(b)){return ml>=TYRANT_BREED.minLvl?{kind:"tyrant",p:TYRANT_BREED.chance}:{kind:"tyrant",p:0,need:TYRANT_BREED.minLvl}}
  if(isLegend(a)&&isLegend(b)){return ml>=DIVINE_BREED.minLvl?{kind:"divine",p:DIVINE_BREED.chance}:{kind:"divine",p:0,need:DIVINE_BREED.minLvl}}
  if(spA||spB)return null; // легенда/бог/тиран + любой другой — никогда особого потомка
  if(ml>=LEGEND_BREED.minLvl){const ep=dInfo(a).rarity==="epic"&&dInfo(b).rarity==="epic";return {kind:"legend",p:LEGEND_BREED.chance+(ep?LEGEND_BREED.epicBonus:0)}}
  return {kind:"legend",p:0,need:LEGEND_BREED.minLvl}}
function renderBreed(){
  const root=$("#scr-breed");const br=S.breeding;const own=housedIds();
  const eggs=[];
  let html=`<div style="padding:14px"><div class="panel"><h2>💞 Гнездо разведения</h2><small>Потомок — <b>только</b> из стихий родителей. 👑 <b>Легендарных</b> нельзя купить: шанс ${Math.round(LEGEND_BREED.chance*100)}% (+${Math.round(LEGEND_BREED.epicBonus*100)}% если оба эпики) только у <b>обычных</b> родителей ур. ${LEGEND_BREED.minLvl}+. Легенда+Легенда ур. ${DIVINE_BREED.minLvl}+ — ${Math.round(DIVINE_BREED.chance*100)}% на 🔱 Бога, Бог+Бог ур. ${TYRANT_BREED.minLvl}+ — ${Math.round(TYRANT_BREED.chance*100)}% на 💀 Тирана. <b>Легенда/Бог + любой другой особого потомка не дают никогда.</b></small>`;
  if(br){const left=Math.max(0,br.end-Date.now());html+=`<div class="breed-box"><img src="assets/${br.a}.png"><span class="heart">💞</span><img src="assets/${br.b}.png"><div style="flex:1"><b>${dInfo(br.a).name}</b> + <b>${dInfo(br.b).name}</b><div class="bar" style="margin:6px 0"><div style="width:${100-left/(br.total||BREED_TIME)*100}%"></div></div><button class="btn ${left<=0?"green":""}" id="hatchb" ${left<=0?"":"disabled"}>${left<=0?"🥚 Получить яйцо!":"⏳ "+Math.ceil(left/1000)+" с"}</button> <button class="btn sm purple" id="speed" ${left<=0?"disabled":""}>💎${Math.ceil(left/20000)} ускорить</button></div></div>`}
  else{html+=`<div class="breed-box">${[0,1].map(i=>breedSel[i]?`<img src="assets/${breedSel[i]}.png" data-un="${i}" title="убрать">`:`<div class="acad-slot empty" style="width:90px;height:100px">?</div>`).join('<span class="heart">💞</span>')}<div style="flex:1">${breedSel.length===2?`${(()=>{const lc=legendChance(breedSel[0],breedSel[1]);return lc&&lc.p>0?`<div class="badge gold">${lc.kind==="tyrant"?"💀 шанс Тиранского":lc.kind==="divine"?"🔱 шанс Божественного":"👑 шанс Легендарного"}: ${Math.round(lc.p*100)}%</div>`:lc?`<small>${lc.kind==="tyrant"?"💀 Шанс Тиранского":lc.kind==="divine"?"🔱 Шанс Божественного":"👑 Шанс Легендарного"} появится, если оба родителя ур. ${lc.need}+</small>`:`<small>⛔ Особый + обычный: особого потомка не будет никогда</small>`})()}<br><small>Возможные потомки:</small><div class="picker">${possibleChildren(breedSel[0],breedSel[1]).map(id=>`<img src="assets/${id}.png" title="${dInfo(id).name}" style="width:44px;height:48px">`).join("")||"<i>нет</i>"}</div>`:""}<button class="btn green" id="breed" ${breedSel.length===2?"":"disabled"}>Начать (🪙500)</button></div></div>`}
  html+=`</div>${eggs.length?`<div class="panel" style="margin-top:12px"><h2>🥚 Яйца (${eggs.length})</h2><div class="picker">${eggs.map((id,i)=>`<button class="btn" data-egg="${i}">🥚 Вылупить</button>`).join("")}</div></div>`:""}
  <div class="panel" style="margin-top:12px"><h2>Родители</h2><div class="dr-grid" style="padding:0">${own.map(id=>dragonCard(id,breedSel.includes(id)?'<div class="badge">ВЫБРАН</div>':"")).join("")}</div></div></div>`;
  root.innerHTML=html;
  $$(".dr-card",root).forEach(c=>c.onclick=()=>{if(br)return;const id=c.dataset.id;if(breedSel.includes(id))breedSel=breedSel.filter(x=>x!==id);else if(breedSel.length<2)breedSel.push(id);renderBreed()});
  $$("[data-un]",root).forEach(im=>im.onclick=()=>{breedSel.splice(+im.dataset.un,1);renderBreed()});
  const bb=$("#breed",root);if(bb)bb.onclick=()=>{if(S.gold<500){toast("Нужно 🪙500");return}S.gold-=500;const child=breedResult(breedSel[0],breedSel[1]);const bt=isTyrant(child)?TYRANT_BREED.time:isDivine(child)?DIVINE_BREED.time:isLegend(child)?LEGEND_BREED.time:BREED_TIME;S.breeding={a:breedSel[0],b:breedSel[1],end:Date.now()+bt,total:bt,child};breedSel=[];save();updateTop();toast("💞 Разведение началось!");renderBreed()};
  const hb=$("#hatchb",root);if(hb)hb.onclick=()=>{S.inv=S.inv||[];S.inv.push({id:S.breeding.child,src:"breed",secret:true});S.breeding=null;addXP(80);save();toast("🥚 Яйцо в инвентаре → отнеси в Инкубатор");renderBreed()};
  const sp=$("#speed",root);if(sp)sp.onclick=()=>{const c=Math.ceil((br.end-Date.now())/20000);if(S.gems<c){toast("Не хватает 💎");return}S.gems-=c;br.end=Date.now();save();updateTop();renderBreed()};
  $$("[data-egg]",root).forEach(b=>b.onclick=()=>{const id=S.eggs.splice(+b.dataset.egg,1)[0];const d=dInfo(id);
    if(S.dragons[id]){const g=Math.round(RARITY[d.rarity].price*.4);S.gold+=g;S.food+=200;modal(`<h2>🥚 Вылупился ${d.name}</h2><div class="center"><img src="assets/${id}.png" style="height:150px"><p>Дубликат → 🪙${g} + 🍖200</p></div>`)}
    else{S.dragons[id]={lvl:1,xp:0,stars:1};addXP(120);modal(`<h2>🥚 Новый дракон!</h2><div class="center"><img src="assets/${id}.png" style="height:160px;animation:float 1s infinite alternate"><h3>${d.name}</h3><span class="badge" style="background:${RARITY[d.rarity].color}">${RARITY[d.rarity].name}</span><div>${d.els.map(elIco).join("")}</div><p class="desc">${d.desc}</p></div>`)}
    save();updateTop();renderBreed()});
}
setInterval(()=>{if($("#scr-breed").classList.contains("active")&&!$("#modal-root").innerHTML&&S.breeding)renderBreed()},3000);

/* ================= СОБЫТИЕ: ЗВОНОК MR 333 ================= */
function pickTeamModal(title,desc,onGo){const own=housedIds();let sel=[...team].filter(isHoused);
  const m=modal(`<h2>${title}</h2>${desc}<p><b>Выбери команду (до 3):</b></p><div class="picker" id="pk2">${own.map(id=>`<img src="assets/${id}.png" title="${dInfo(id).name} ур.${S.dragons[id].lvl}" data-id="${id}" class="${sel.includes(id)?"sel":""}">`).join("")}</div><div class="row"><button class="btn red" id="go" ${sel.length?"":"disabled"}>⚔️ В бой!</button></div>`);
  $$("#pk2 img",m).forEach(im=>im.onclick=()=>{const id=im.dataset.id;if(sel.includes(id))sel=sel.filter(x=>x!==id);else if(sel.length<3)sel.push(id);$$("#pk2 img",m).forEach(x=>x.classList.toggle("sel",sel.includes(x.dataset.id)));$("#go",m).disabled=!sel.length});
  $("#go",m).onclick=()=>{team=sel;closeModal();onGo()}}
function openPhone(){
  const last=S.phoneLast||0;const left=Math.max(0,PHONE_EVENT.cooldown-(Date.now()-last));const wins=S.phoneWins||0;
  const m=modal(`<h2>📞 Телефонная будка</h2><div class="phone-card"><img src="assets/phone.png" class="phone-img"><img src="assets/d71.png"><div><b>MR 333</b><br><small>«Алло? Три часа ночи. Ты знаешь, что делать. Приводи своих — я приведу своих.»</small><br><br>Его команда: ${PHONE_EVENT.team.map(id=>`<img src="assets/${id}.png" style="height:44px;vertical-align:middle" title="${dInfo(id).name}">`).join("")}<br><small>Уровень команды: <b>${Math.max(1,...Object.values(S.dragons).map(d=>d.lvl||1))+PHONE_EVENT.lvlAdd}</b> (+40 к твоему сильнейшему дракону). Побед: ${wins}</small></div></div>
  <p>Награда за победу: ${costStr(PHONE_EVENT.reward)}. Каждая <b>3-я победа</b> — 🥚 яйцо самого <b>MR 333</b> (только так его и можно получить)!</p>
  <div class="row"><button class="btn red" id="call" ${left>0?"disabled":""}>${left>0?"📵 Занято: "+tleft(Date.now()+left):"📞 Позвонить"}</button></div>`);
  $("#call",m).onclick=()=>{closeModal();pickTeamModal("📞 MR 333 отвечает…","<div class='desc'>«3:33. Ровно. Не опаздывай.» Команда 3:00 очень сильна — бери драконов, сильных против 🕒 3:00 (🔢 Цифра и 💉 Медицина) и берегись 🌙 Ночи.</div>",()=>{
    const alv=Math.max(1,...Object.values(S.dragons).map(d=>d.lvl||1));const lvl=alv+PHONE_EVENT.lvlAdd;S.phoneLast=Date.now();save();
    startBattle({name:"Команда 3:00 (MR 333)",lvl,ids:PHONE_EVENT.team,bg:BATTLE_BG.phone,onEnd:(win)=>{
      if(win){S.phoneWins=(S.phoneWins||0)+1;const r=PHONE_EVENT.reward;S.gold+=r.gold;S.gems+=r.gems;S.scrolls=(S.scrolls||0)+r.scrolls;addXP(200+40*lvl);let egg="";if(S.phoneWins%3===0){giveEgg(PHONE_EVENT.egg,"event");egg="<p><b>🥚 MR 333 впечатлён — его яйцо в твоём инвентаре!</b></p>"}
        save();updateTop();modal(`<div class="result win">ПОБЕДА!</div><p class="center">«…Ладно. Перезвоню в четыре.»</p><div class="center" style="font-weight:900">+${costStr(r)} +⭐${200+40*lvl}</div>${egg}<p class="center"><small>Побед над MR 333: ${S.phoneWins} (до яйца: ${3-S.phoneWins%3===3?0:3-S.phoneWins%3})</small></p><div class="row" style="justify-content:center"><button class="btn green" onclick="closeModal();show('map')">Ок</button></div>`,{closable:false})}
      else{addXP(30);save();modal(`<div class="result lose">ПОРАЖЕНИЕ</div><p class="center">«Три часа. Каждую ночь. Я подожду.»</p><div class="row" style="justify-content:center"><button class="btn" onclick="closeModal();show('map')">Ок</button></div>`,{closable:false})}}})})}}

/* ================= СОБЫТИЕ: ИСПЫТАНИЕ ЗОДИАКОВ ================= */
function zodiacState(){S.zodiac=S.zodiac||{stage:0,best:0,done:{}};return S.zodiac}
function renderZodiacCard(){const z=zodiacState();const locked=S.level<ZODIAC_EVENT.req;const st=z.stage;const next=ZODIAC_IDS[st];
  return `<div class="panel zodiac"><h2>♈ Испытание зодиаков <span class="badge gold">${st}/${ZODIAC_EVENT.stages}</span></h2>
  <small>13 легендарных знаков зодиака ждут по очереди. Каждый следующий сильнее. HP команды <b>не восстанавливается</b> между боями (как в оригинале) — лечи за 💎 или пройди дальше на том, что есть. Поражение сбрасывает прогресс! Награды за этапы, а на этапах ${ZODIAC_EVENT.eggAt.join("/")} — 🥚 яйца знаков зодиака (только здесь).</small>
  <div class="zod-row">${ZODIAC_IDS.map((id,i)=>`<div class="zod ${i<st?"done":i===st?"now":""}" title="${dInfo(id).name}"><img src="assets/${id}.png">${ZODIAC_EVENT.eggAt.includes(i+1)?"<span>🥚</span>":""}</div>`).join("")}</div>
  ${locked?`<p>🔒 Открывается на уровне ${ZODIAC_EVENT.req}</p>`:st>=ZODIAC_EVENT.stages?`<p><b>🏆 Испытание пройдено!</b> Рекорд: ${z.best}</p><button class="btn purple" id="zreset">Начать заново</button>`:`<p>Следующий: <b>${dInfo(next).name}</b> ур.${ZODIAC_EVENT.baseLvl+st*2} ${dInfo(next).els.map(elIco).join("")}</p><div class="row"><button class="btn red" id="zfight">⚔️ Сразиться</button>${z.hp?`<button class="btn green" id="zheal">💚 Вылечить команду (💎${Math.max(3,Math.ceil(st/2))})</button>`:""}${st>0?`<button class="btn sm" id="zgiveup">Сбросить</button>`:""}</div>${z.hp?`<small>Текущее HP команды: ${Object.entries(z.hp).map(([id,h])=>dInfo(id).name+" "+h).join(", ")}</small>`:""}`}
  <p><small>Рекорд: ${z.best} этапов</small></p></div>`}
function bindZodiac(root){const z=zodiacState();
  const zf=$("#zfight",root);if(zf)zf.onclick=()=>{const st=z.stage;const id=ZODIAC_IDS[st];const lvl=ZODIAC_EVENT.baseLvl+st*2;
    pickTeamModal("♈ "+dInfo(id).name,`<div class="desc">${dInfo(id).desc}</div>${z.hp?"<p>⚠️ HP команды переносится с прошлого боя.</p>":""}`,()=>{
      startBattle({name:"Зодиак: "+dInfo(id).name,lvl,bg:BATTLE_BG.zodiac,ids:[id,...(st>=6?[ZODIAC_IDS[(st+5)%13]]:[]),...(st>=10?[ZODIAC_IDS[(st+9)%13]]:[])],carry:z.hp||null,onEnd:(win,hpLeft)=>{
        if(win){z.stage++;z.best=Math.max(z.best,z.stage);z.hp=hpLeft;const g=1500*(st+1),sc=3+st;S.gold+=g;S.scrolls=(S.scrolls||0)+sc;S.gems+=2+st;addXP(150+50*st);let egg="";if(ZODIAC_EVENT.eggAt.includes(z.stage)){giveEgg(id,"event");egg=`<p><b>🥚 Яйцо знака «${dInfo(id).name}» в инвентаре!</b></p>`}
          save();updateTop();modal(`<div class="result win">ЭТАП ${z.stage} ПРОЙДЕН</div><div class="center" style="font-weight:900">+🪙${g} +📜${sc} +💎${2+st}</div>${egg}<div class="row" style="justify-content:center"><button class="btn green" onclick="closeModal();show('events')">Дальше</button></div>`,{closable:false})}
        else{z.stage=0;z.hp=null;save();modal(`<div class="result lose">ИСПЫТАНИЕ ПРОВАЛЕНО</div><p class="center">Звёзды погасли. Прогресс сброшен, рекорд сохранён: ${z.best}.</p><div class="row" style="justify-content:center"><button class="btn" onclick="closeModal();show('events')">Ок</button></div>`,{closable:false})}}})})};
  const zh=$("#zheal",root);if(zh)zh.onclick=()=>{const c=Math.max(3,Math.ceil(z.stage/2));if(S.gems<c){toast("Не хватает 💎");return}S.gems-=c;z.hp=null;save();updateTop();renderEvents()};
  const zg=$("#zgiveup",root);if(zg)zg.onclick=()=>{if(confirm("Сбросить прогресс испытания?")){z.stage=0;z.hp=null;save();renderEvents()}};
  const zr=$("#zreset",root);if(zr)zr.onclick=()=>{z.stage=0;z.hp=null;save();renderEvents()}}

/* ================= ТЕМНИЦА (как в оригинале: череда боёв с нарастающей сложностью, HP переносится) ================= */
function dgState(){S.dg=S.dg||{floor:0,best:0,hp:null,seed:Date.now()};return S.dg}
function dgEnemies(floor){const r=()=>{const p=DRAGONS.filter(d=>!d.boss).filter(d=>!isSpecial(d.id)||(floor>=8&&isLegend(d.id)&&!isEvent(d.id)));return pick(p).id};const n=floor<3?2:3;const ids=[];while(ids.length<n){const id=r();if(!ids.includes(id))ids.push(id)}return ids}
function openDungeon(){const g=dgState();if(!g.next)g.next=dgEnemies(g.floor);const lvl=Math.max(1,S.level-1)+g.floor*2;
  const m=modal(`<h2>🏚️ Темница <span class="badge gold">этаж ${g.floor+1}</span></h2><small>Спускайся всё глубже: враги сильнее с каждым этажом, HP команды переносится между этажами, лечение — только за 💎. Поражение = выход из темницы с потерей серии. Награды растут с глубиной, каждый 5-й этаж — сундук с 💎 и 📜.</small>
  <p style="margin-top:8px">Следующие враги (ур.${lvl}): ${g.next.map(id=>`<img src="assets/${id}.png" style="height:48px;vertical-align:middle" title="${dInfo(id).name}">`).join("")}</p>
  ${g.hp?`<small>HP команды: ${Object.entries(g.hp).map(([id,h])=>dInfo(id).name+" "+h).join(", ")}</small>`:""}
  <div class="row"><button class="btn red" id="dgo">⬇ Спуститься</button>${g.hp?`<button class="btn green" id="dheal">💚 Лечить (💎${3+Math.floor(g.floor/3)})</button>`:""}${g.floor>0?`<button class="btn" id="dexit">🚪 Выйти (сохранить добычу)</button>`:""}</div><p><small>Рекорд глубины: ${g.best}</small></p>`);
  $("#dgo",m).onclick=()=>{closeModal();pickTeamModal("🏚️ Этаж "+(g.floor+1),g.hp?"<p>⚠️ HP команды переносится.</p>":"",()=>{
    startBattle({name:"Темница, этаж "+(g.floor+1),lvl,bg:BATTLE_BG.dungeon,ids:g.next,carry:g.hp||null,onEnd:(win,hpLeft)=>{
      if(win){g.floor++;g.best=Math.max(g.best,g.floor);g.hp=hpLeft;g.next=dgEnemies(g.floor);const gold=400*g.floor+rnd(0,200),food=100*g.floor;S.gold+=gold;S.food+=food;S.scrolls=(S.scrolls||0)+1;addXP(80+30*g.floor);let chest="";if(g.floor%5===0){S.gems+=10+g.floor;S.scrolls+=5;chest=`<p><b>🎁 Сундук: +💎${10+g.floor} +📜5</b></p>`}
        save();updateTop();modal(`<div class="result win">ЭТАЖ ${g.floor} ЗАЧИЩЕН</div><div class="center" style="font-weight:900">+🪙${gold} +🍖${food} +📜1</div>${chest}<div class="row" style="justify-content:center"><button class="btn green" id="dn">Дальше</button></div>`,{closable:false});$("#dn").onclick=()=>{closeModal();show("events");openDungeon()}}
      else{g.floor=0;g.hp=null;g.next=null;save();modal(`<div class="result lose">ТЕМНИЦА ПОГЛОТИЛА ВАС</div><p class="center">Серия прервана. Рекорд: ${g.best}.</p><div class="row" style="justify-content:center"><button class="btn" onclick="closeModal();show('map')">Ок</button></div>`,{closable:false})}}})})};
  const dh=$("#dheal",m);if(dh)dh.onclick=()=>{const c=3+Math.floor(g.floor/3);if(S.gems<c){toast("Не хватает 💎");return}S.gems-=c;g.hp=null;save();updateTop();openDungeon()};
  const de=$("#dexit",m);if(de)de.onclick=()=>{g.floor=0;g.hp=null;g.next=null;save();closeModal();if(B){clearInterval(B.tick);B=null}$("#navbar").classList.remove("locked");playMusic("map");show("map");toast("Вы вышли из темницы")}}

/* ================= ДОРОГА НАГРАД ================= */
function levelRewards(l){const r=[];
  r.push({ico:"💎",t:"+5 самоцветов"});r.push({ico:"📜",t:"+3 свитка"});r.push({ico:"🪙",t:"+"+fmt(500*l)+" золота"});
  ISLANDS.filter(i=>i.req===l).forEach(i=>r.push({ico:"🏝️",t:i.name,big:true}));
  Object.values(BUILDINGS).filter(b=>b.req===l).forEach(b=>r.push({ico:b.ico,t:b.name,big:!!b.el||!!b.special}));
  DRAGONS.filter(d=>DRAGON_REQ[d.id]===l&&!isSpecial(d.id)).forEach(d=>r.push({img:d.id,t:d.name,rar:d.rarity}));
  if(ROOM_REQ.includes(l))r.push({ico:"🏫",t:"Комната Академии №"+(ROOM_REQ.indexOf(l)+1)});
  if(l===7||l===15)r.push({ico:"🥚",t:"Гнездо инкубатора №"+(l===7?2:3)});
  if(l===ZODIAC_EVENT.req)r.push({ico:"♈",t:"Испытание зодиаков",big:true});
  if(l===LEGEND_BREED.minLvl)r.push({ico:"👑",t:"Разведение легендарных (обычные драконы ур."+LEGEND_BREED.minLvl+"+)",big:true});
  if(l===DIVINE_BREED.minLvl)r.push({ico:"🔱",t:"Разведение божественных",big:true});
  if(l===TYRANT_BREED.minLvl)r.push({ico:"💀",t:"Разведение тиранских (Божество+Божество)",big:true});
  return r}
function showRoad(){const MAXL=30;
  const m=modal(`<h2>🛣️ Дорога наград <span class="badge gold">ур. ${S.level>=LEVEL_CAP?"MAX":S.level}</span></h2><small>Что открывается на каждом уровне Хранителя. Опыт даётся за бои, постройки, кормление и сбор дохода.</small>
  <div class="road">${Array.from({length:MAXL},(_,i)=>i+1).map(l=>{const rw=levelRewards(l);const st=l<S.level?"done":l===S.level?"now":"lock";
    return `<div class="road-row ${st}" ${st==="now"?'id="road-now"':""}><div class="road-lvl">${st==="done"?"✅":st==="now"?"⭐":"🔒"}<b>${l}</b></div><div class="road-items">${rw.map(x=>x.img?`<div class="road-item dr" title="${x.t}" style="border-color:${RARITY[x.rar].color}"><img src="assets/${x.img}.png"><span>${x.t}</span></div>`:`<div class="road-item ${x.big?"big":""}" title="${x.t}"><i>${x.ico}</i><span>${x.t}</span></div>`).join("")}</div>${st==="now"?`<div class="road-xp"><div class="bar"><div style="width:${S.xp/xpNeed(S.level)*100}%"></div></div><small>${fmt(S.xp)} / ${fmt(xpNeed(S.level))} XP</small></div>`:""}</div>`}).join("")}</div>`);
  const now=$("#road-now",m);if(now)setTimeout(()=>now.scrollIntoView({block:"center",behavior:"smooth"}),50);
}
document.addEventListener("DOMContentLoaded",()=>{const lv=$("#topbar .res.lvl");if(lv){lv.style.cursor="pointer";lv.title="Дорога наград";lv.onclick=showRoad}});

/* ================= СОБЫТИЯ: ДРАКОН МЕСЯЦА / НЕДЕЛИ ================= */
function seedIdx(seed,n){let h=2166136261;for(const c of String(seed)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return Math.abs(h)%n}
function weekKey(d){const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));const dn=t.getUTCDay()||7;t.setUTCDate(t.getUTCDate()+4-dn);const y0=new Date(Date.UTC(t.getUTCFullYear(),0,1));return t.getUTCFullYear()+"-W"+Math.ceil(((t-y0)/864e5+1)/7)}
function featured(){const now=new Date();const mk="m"+now.getFullYear()+"-"+now.getMonth(),wk="w"+weekKey(now);
  const rareOrBetter=DRAGONS.filter(d=>["epic","legendary","divine","tyrant"].includes(d.rarity)&&!isEvent(d.id));
  const dom=rareOrBetter[seedIdx(mk,rareOrBetter.length)];const nonEv=DRAGONS.filter(d=>!isEvent(d.id)&&!d.boss);let dow=nonEv[seedIdx(wk,nonEv.length)];if(dow.id===dom.id)dow=nonEv[(seedIdx(wk,nonEv.length)+1)%nonEv.length];
  const endM=new Date(now.getFullYear(),now.getMonth()+1,1);const d=new Date(now);const dn=d.getDay()||7;const endW=new Date(d.getFullYear(),d.getMonth(),d.getDate()+(8-dn));
  return {dom,dow,mk,wk,endM,endW}}
function tleft(t){let s=Math.max(0,Math.floor((t-Date.now())/1000));const d=Math.floor(s/86400);s%=86400;const h=Math.floor(s/3600);s%=3600;const m=Math.floor(s/60);s%=60;return (d?d+"д ":"")+String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0")}
const QUESTS=[
  {id:"wins",name:"Победить в 3 боях",need:3,reward:{gold:1500,gems:5}},
  {id:"feed",name:"Покормить драконов 10 раз",need:10,reward:{food:500,gems:3}},
  {id:"collect",name:"Собрать доход 5 раз",need:5,reward:{gold:800}},
  {id:"build",name:"Построить 3 здания",need:3,reward:{gems:8,scrolls:5}},
  {id:"feed",name:"Покормить драконов 10 раз",need:10,reward:{food:500,gems:3,scrolls:3},dup:true},
];
function sovietUnlocked(){return !!S.sovietFound} // баннер виден только пока «найден»; после боя исчезает, пока не найдёшь снова
function startSoviet(){if(S.level<SOVIET_EVENT.req){toast("Нужен уровень "+SOVIET_EVENT.req);return}closeModal();pickTeamModal("🖥️ Советские Компьютеры","<div class='desc'>init… init… ЦЕЛЬ НАЙДЕНА. Три машины, каждая — BANNED раз в 3 хода.</div>",()=>{
  const lvl=Math.max(S.level,30)+SOVIET_EVENT.lvlBonus;S.sovietLast=Date.now();save();
  playDialog([["d131","Советский Компьютер","INIT… INIT… ЗАГРУЗКА 3%…"],["d131","Советский Компьютер","ХРАНИТЕЛЬ ОБНАРУЖЕН. СТАТУС: НЕЖЕЛАТЕЛЬНЫЙ. ПОДГОТОВКА К УДАЛЕНИЮ."],["av0","Хранитель","Это… три красных ящика? Почему у них лица?"],["d131","Советский Компьютер","BANNED. BANNED. BANNED. НАЧАТЬ."]],()=>{
    startBattle({name:"Советские Компьютеры",lvl,ids:SOVIET_EVENT.ids,bg:BATTLE_BG.dungeon,music:"soviet",boss:true,onEnd:(win)=>{
      if(win){S.sovietWins=(S.sovietWins||0)+1;const r=SOVIET_EVENT.reward;S.gold+=r.gold;S.gems+=r.gems;S.scrolls=(S.scrolls||0)+r.scrolls;addXP(400+40*lvl);let egg="";if(S.sovietWins===1){giveEgg(SOVIET_EVENT.egg,"soviet");egg="<p><b>🥚 Яйцо Бога — божественный юнит!</b></p>"}
        save();updateTop();modal(`<div class="result win">СИСТЕМА ОТКЛЮЧЕНА</div><p class="center">«…ошибка… ошибка… система… отключена…»</p><div class="center" style="font-weight:900">+🪙${fmt(r.gold)} +💎${r.gems} +📜${r.scrolls}</div>${egg}<div class="row" style="justify-content:center"><button class="btn green" onclick="closeModal();S.sovietFound=false;S._sovTap=0;save();show('events');setTimeout(()=>{const t=document.getElementById('stat-title');if(t)t.scrollIntoView({behavior:'smooth',block:'start'})},60)">Ок</button></div>`,{closable:false})}
      else{save();modal(`<div class="result lose">BANNED</div><p class="center">Вся команда удалена. Попробуй снова.</p><div class="row" style="justify-content:center"><button class="btn" onclick="closeModal();S.sovietFound=false;S._sovTap=0;save();show('events');setTimeout(()=>{const t=document.getElementById('stat-title');if(t)t.scrollIntoView({behavior:'smooth',block:'start'})},60)">Ок</button></div>`,{closable:false})}}})})})}
function johnnyLeft(){return Math.max(0,JOHNNY_EVENT.cooldown-(Date.now()-(S.johnnyLast||0)))}
function startJohnny(){if(S.level<JOHNNY_EVENT.req){toast("Нужен уровень "+JOHNNY_EVENT.req);return}if(johnnyLeft()>0){toast("Джонни отдыхает: "+tleft(new Date(Date.now()+johnnyLeft())));return}closeModal();
  pickTeamModal("🕯️ Великий Джонни","<div class='desc'>Жархнне, усиленный порталом. Посох рассекает всех, удар оглушает. Каждая 2-я победа — 🥚 яйцо MR Lulu.</div>",()=>{
  const lvl=Math.max(S.level+JOHNNY_EVENT.lvlBonus,JOHNNY_EVENT.lateLvl);S.johnnyLast=Date.now();save();
  playDialog([["d157_hostage","Жархнне (в плену)","Хранитель… посох… он не мой… он держит меня…"],["d157_raise","Великий Джонни","Я — ВЕЛИКИЙ ДЖОННИ. Портал дал мне посох, посох дал мне ВСЁ."],["d135","MR Lulu","Джонни, опусти палку. Это же я, Лулу!"],["d157","Великий Джонни","Палку?! ЭТО СОЛНЦЕ НА ПАЛКЕ. Смотри, как оно РАССЕКАЕТ."]],()=>{
    startBattle({name:"Великий Джонни",lvl,ids:JOHNNY_EVENT.ids,bg:"citadel",boss:true,music:"johnny",onEnd:(win)=>{
      if(win){S.johnnyWins=(S.johnnyWins||0)+1;const r=JOHNNY_EVENT.reward;S.gold+=r.gold;S.gems+=r.gems;S.scrolls=(S.scrolls||0)+r.scrolls;addXP(500+40*lvl);let egg="";if(S.johnnyWins%JOHNNY_EVENT.eggEvery===0){giveEgg(JOHNNY_EVENT.egg,"johnny");egg="<p><b>🥚 Яйцо MR Lulu!</b></p>"}
        save();updateTop();playDialog([["d157_hostage","Жархнне","…посох упал. Я… я снова просто Жархнне? Спасибо. Наверное."]],()=>modal(`<div class="result win">ПОСОХ СЛОМАН</div><div class="center" style="font-weight:900">+🪙${fmt(r.gold)} +💎${r.gems} +📜${r.scrolls}</div>${egg}<p class="center"><small>Побед над Джонни: ${S.johnnyWins}. Следующее яйцо через ${JOHNNY_EVENT.eggEvery-(S.johnnyWins%JOHNNY_EVENT.eggEvery)} побед(ы).</small></p><div class="row" style="justify-content:center"><button class="btn green" onclick="closeModal();show('events')">Ок</button></div>`,{closable:false}))}
      else{save();modal(`<div class="result lose">РАССЕЧЕНО</div><p class="center">Джонни поднимает посох над головой. Попробуй снова через 6 часов.</p><div class="row" style="justify-content:center"><button class="btn" onclick="closeModal();show('events')">Ок</button></div>`,{closable:false})}}})})})}
/* ================= СЕКРЕТНЫЙ ХОРРОР-БОСС: ЛОСЬ 4 САТАНА ================= */
let HORROR=null;
function mooseGlitch(ms){document.body.classList.add("hell-glitch");setTimeout(()=>document.body.classList.remove("hell-glitch"),ms||500)}
function jumpscare(ms){const j=document.createElement("div");j.className="jumpscare";j.innerHTML=`<img src="assets/scream666.jpg">`;document.body.append(j);sndPlay("scream666.wav",1);setTimeout(()=>j.remove(),ms||450)}
function hellToast(){const lines=["Я ВИЖУ ТЕБЯ","НЕ ВЫКЛЮЧАЙ","ЭТО НЕ ТВОЙ ХОД","ТВОЁ СОХРАНЕНИЕ У МЕНЯ","666","ОНИ УМРУТ ВСЕ РАВНО","ЗАЧЕМ ТЫ ИСКАЛ МЕНЯ","4 4 4 4 4 4","ТЫ ВСЁ ЕЩЁ ЗДЕСЬ?","ЗАКРОЙ ГЛАЗА"];toast(`<b style="color:#f00;font-family:monospace;letter-spacing:2px">${lines[Math.floor(Math.random()*lines.length)]}</b>`)}
function hellFx(k,t){const a=$(".arena-field");if(!a)return;const mk=(cls,ms,par)=>{const d=document.createElement("div");d.className="hfx "+cls;(par||a).append(d);setTimeout(()=>d.remove(),ms);return d};
  if(k==="hellfire"){const d=mk("hfx-penta",1600);d.innerHTML="<b>⛧</b>";$$(".fighter.ally").forEach((e,i)=>setTimeout(()=>mk("hfx-flame",1000,e),200+i*120))}
  else if(k==="hellkara"){const d=mk("hfx-kara",1300);d.innerHTML="<span>КАРА</span>";const e=t&&fEl(t);if(e){setTimeout(()=>{mk("hfx-hand",900,e);const a2=$(".arena");if(a2){a2.classList.add("hell-shake");setTimeout(()=>a2.classList.remove("hell-shake"),700)}},450)}}
  else if(k==="helldrain"){const e=t&&fEl(t);const m=$(".fighter.moose");if(e&&m){const r1=e.getBoundingClientRect(),r2=m.getBoundingClientRect(),ra=a.getBoundingClientRect();for(let i=0;i<7;i++){const o=mk("hfx-orb",900+i*80);o.style.left=(r1.left+r1.width/2-ra.left)+"px";o.style.top=(r1.top+r1.height/2-ra.top)+"px";o.style.setProperty("--tx",(r2.left+r2.width/2-r1.left-r1.width/2)+"px");o.style.setProperty("--ty",(r2.top+r2.height/2-r1.top-r1.height/2)+"px");o.style.animationDelay=(i*.08)+"s"}}}
  else if(k==="hellgaze"){const d=mk("hfx-eye",1100);d.innerHTML="<i></i>";const e=t&&fEl(t);if(e)setTimeout(()=>mk("hfx-gazehit",700,e),350)}}
function hellSay(){if(!B)return;const L=["ты думаешь, это ты нажимаешь кнопки?","я читал твоё сохранение. там скучно.","твои драконы кричат. ты не слышишь.","ещё ход. ещё один. и ещё.","я был здесь до того, как ты открыл игру.","не закрывай вкладку. я всё равно останусь.","они падают. ты тоже падаешь.","4. 4. 4. 4.","ты не выиграешь. но продолжай — мне нравится.","кто создал тьму? я просто зашёл в неё."];const t=L[Math.floor(Math.random()*L.length)];const a=$(".arena-field");if(!a)return;let d=$(".hell-say",a);if(!d){d=document.createElement("div");d.className="hell-say";a.append(d)}d.textContent="ЛОСЬ 4 САТАНА: "+t;d.classList.remove("on");void d.offsetWidth;d.classList.add("on")}
function playDrone(){try{MUSIC.ctx=MUSIC.ctx||new (window.AudioContext||window.webkitAudioContext)();}catch(e){return}const ctx=MUSIC.ctx;if(ctx.state==="suspended")ctx.resume();const master=ctx.createGain();MUSIC.baseGain=.5;master.gain.value=.5*(S.vol==null?1:S.vol);master.connect(ctx.destination);MUSIC.master=master;
  const lp=ctx.createBiquadFilter();lp.type="lowpass";lp.frequency.value=380;lp.Q.value=6;lp.connect(master);const lfo=ctx.createOscillator();lfo.frequency.value=.07;const lg=ctx.createGain();lg.gain.value=220;lfo.connect(lg);lg.connect(lp.frequency);lfo.start();
  [[36.7,"sawtooth",.35],[38.9,"sawtooth",.25],[55,"triangle",.2],[73.4,"sine",.25],[110.7,"sine",.06]].forEach(([f,w,v])=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type=w;o.frequency.value=f;g.gain.value=v;o.connect(g);g.connect(lp);o.start();const d=ctx.createOscillator();d.type="sine";d.frequency.value=.11+Math.random()*.2;const dg=ctx.createGain();dg.gain.value=f*.012;d.connect(dg);dg.connect(o.frequency);d.start()});
  const n=ctx.sampleRate*3,b=ctx.createBuffer(1,n,ctx.sampleRate),ch=b.getChannelData(0);for(let i=0;i<n;i++)ch[i]=(Math.random()*2-1)*.5;const src=ctx.createBufferSource();src.buffer=b;src.loop=true;const nf=ctx.createBiquadFilter();nf.type="bandpass";nf.frequency.value=900;nf.Q.value=.6;const ng=ctx.createGain();ng.gain.value=.05;src.connect(nf);nf.connect(ng);ng.connect(master);src.start()}
function hellTick(){if(!B||!HORROR){return}const r=Math.random();
  if(r<.25)hellToast();
  if(r>.25&&r<.4)mooseGlitch(300);
  if(r>.4&&r<.5)mooseGlitch(500);
  if(r>.5&&r<.65){$$(".skillbtn b").forEach(b=>{if(Math.random()<.5)b.dataset.o=b.dataset.o||b.textContent,b.textContent=["666","ОН","БЕГИ","НЕТ","4"][Math.floor(Math.random()*5)]});setTimeout(()=>$$(".skillbtn b").forEach(b=>{if(b.dataset.o)b.textContent=b.dataset.o}),900)}
  if(r>.65&&r<.75){const t=$("#r-gold");if(t){const o=t.textContent;t.textContent="666";setTimeout(()=>t.textContent=o,800)}}
  if(r>.75&&r<.85){$$(".fighter.ally .hpbar div").forEach(b=>{const o=b.style.width;b.style.width="3%";setTimeout(()=>b.style.width=o,700)})}
  if(r>.85){const a=$(".arena");if(a){a.classList.add("hell-shake");setTimeout(()=>a.classList.remove("hell-shake"),600)}}
  HORROR.t=setTimeout(hellTick,1800+Math.random()*2600)}
function startMoose(){if(S.level<MOOSE_EVENT.req){toast("Нужен уровень "+MOOSE_EVENT.req);return}closeModal();
  pickTeamModal("👁️ ???","<div class='desc' style='color:#f00;font-family:monospace'>он не спрашивает разрешения</div>",()=>{
  const lvl=MOOSE_EVENT.lvl;save();mooseGlitch(900);
  playDialog([["d160","???","…"],["d160","???","ты искал 666. ты нашёл."],["av0","Хранитель","Кто… кто ты?"],["d160","ЛОСЬ 4 САТАНА","Я — ЧЕТВЁРКА, КОТОРАЯ НЕ ВЕРНУЛАСЬ. Я В ТВОЁМ ЭКРАНЕ. Я В ТВОЁМ СОХРАНЕНИИ."],["d160","ЛОСЬ 4 САТАНА","ТЕПЕРЬ Я ИГРАЮ. А ТЫ СМОТРИШЬ."]],()=>{
    HORROR={t:null};jumpscare(500);
    startBattle({name:"ЛОСЬ 4 САТАНА",lvl,ids:MOOSE_EVENT.ids,bg:"nightmare0",music:"moose",boss:true,horror:true,onEnd:(win)=>{
      clearTimeout(HORROR&&HORROR.t);HORROR=null;document.body.classList.remove("hell-glitch");$("#navbar").classList.remove("locked");
      if(win){S.mooseWins=(S.mooseWins||0)+1;const r=MOOSE_EVENT.reward;S.gold+=r.gold;S.gems+=r.gems;S.scrolls=(S.scrolls||0)+r.scrolls;addXP(666);let egg="";if(S.mooseWins===1){giveEgg(MOOSE_EVENT.egg,"moose");egg="<p><b>🥚 Из пентаграммы выкатилось яйцо… Пабло.</b></p>"}
        S.mooseFound=false;save();updateTop();mooseGlitch(1500);modal(`<div class="result win" style="color:#f00;font-family:monospace">…ОН УШЁЛ. ПОКА.</div><div class="center" style="font-weight:900">+🪙${fmt(r.gold)} +💎${r.gems} +📜${r.scrolls}</div>${egg}<p class="center"><small>Побед: ${S.mooseWins}</small></p><div class="row" style="justify-content:center"><button class="btn" onclick="closeModal();show('events')">…</button></div>`,{closable:false})}
      else{S.mooseFound=false;save();jumpscare(900);setTimeout(()=>modal(`<div class="result lose" style="color:#f00;font-family:monospace">ОН ВЫИГРАЛ. КАК ВСЕГДА.</div><p class="center" style="font-family:monospace">твоя команда… помнит его.</p><div class="row" style="justify-content:center"><button class="btn" onclick="closeModal();show('events')">…</button></div>`,{closable:false}),900)}}});
    HORROR.t=setTimeout(hellTick,1500)})})}
function mooseCardHtml(){return `<div class="panel moose-card"><h2 style="font-family:monospace;color:#f00">👁️ 666</h2><div class="feature"><img src="assets/d160.png" class="johnny-img" style="filter:drop-shadow(0 0 14px #f00)"><div style="flex:1"><div class="desc" style="font-family:monospace;color:#f88">ты не должен был это найти.<br>он не подчиняется стихиям. он — все стихии.<br>он играет сам.</div><div class="row"><button class="btn red" id="gomoose">▶ …</button></div></div></div></div>`}
function renderEvents(){
  const f=featured();const root=$("#scr-events");
  const feat=(d,title,badge,end,key,disc)=>{const own=S.dragons[d.id];const r=RARITY[d.rarity];const price=Math.round(r.price*disc);const claimed=S.quests["claim_"+key];
    return `<div class="panel"><h2>${title} <span class="badge ${badge}">${badge==="gold"?"МЕСЯЦ":"НЕДЕЛЯ"}</span></h2>
    <div class="feature"><img src="assets/${d.id}.png"><div style="flex:1"><div style="font-size:18px;font-weight:900">${d.name}</div><span class="badge" style="background:${r.color}">${r.name}</span> ${d.els.map(elIco).join("")}<div class="desc">${d.desc}</div>
    <div>До конца: <span class="timer" data-end="${end.getTime()}">${tleft(end)}</span></div>
    <div class="row">${own?`<button class="btn" disabled>✅ Уже в коллекции</button>`:`<button class="btn green" data-buy="${d.id}" data-price="${price}">Купить со скидкой 🪙${fmt(price)} <s style="opacity:.6">${fmt(r.price)}</s></button>`}
    ${claimed?`<button class="btn" disabled>🎁 Награда получена</button>`:`<button class="btn purple" data-claim="${key}">🎁 Награда события</button>`}</div>
    <small>Бонус: драконы стихии ${d.els.map(e=>ELEMENTS[e].name).join("/")} получают +25% атаки на арене в этот период.</small></div></div></div>`};
  if(S.mooseFound)$("#navbar").classList.add("locked");root.innerHTML=S.mooseFound?`<div class="ev-wrap">${mooseCardHtml()}</div>`:`<div class="ev-wrap">${feat(f.dom,"🏆 Дракон месяца","gold",f.endM,f.mk,0.6)}${feat(f.dow,"📅 Дракон недели","",f.endW,f.wk,0.75)}
  ${renderZodiacCard()}
  
  <div class="panel johnny-card"><h2>🕯️ БОСС: Великий Джонни <span class="badge" style="background:#8a2be2">ур.${JOHNNY_EVENT.req}+</span></h2><div class="feature"><img src="assets/d157.png" class="johnny-img"><div style="flex:1"><div class="desc">Жархнне схватил посох из портала и стал Великим Джонни. С ним MR Lulu и MR Jarkhnne. Награда: ${costStr(JOHNNY_EVENT.reward)}, каждая 2-я победа — 🥚 <b>MR Lulu</b> (баран из семьи Мистеров).</div>
  <div class="row"><button class="btn purple" id="gojohnny" ${S.level<JOHNNY_EVENT.req||johnnyLeft()>0?"disabled":""}>${S.level<JOHNNY_EVENT.req?"🔒 ур."+JOHNNY_EVENT.req:johnnyLeft()>0?"⏳ "+tleft(new Date(Date.now()+johnnyLeft())):"▶ В БОЙ"}${S.johnnyWins?` <small>(побед: ${S.johnnyWins})</small>`:""}</button></div></div></div></div>
  <div class="panel"><h2>🎪 Другие события</h2><div class="skill"><span>📞 <b>Звонок MR 333</b><br><small>Построй Телефонную будку (ур.${BUILDINGS.phone.req}) и брось вызов команде 3:00. Каждая 3-я победа — яйцо MR 333.</small></span><button class="btn sm" id="gophone" ${allTiles().some(t=>t.b==="phone")?"":"disabled"}>${allTiles().some(t=>t.b==="phone")?"📞":"нет будки"}</button></div>
  <div class="skill"><span>🏚️ <b>Темница</b><br><small>Построй Темницу (ур.${BUILDINGS.dungeon.req}): бесконечный спуск по этажам с растущей наградой.</small></span><button class="btn sm" id="godg" ${allTiles().some(t=>t.b==="dungeon")?"":"disabled"}>${allTiles().some(t=>t.b==="dungeon")?"⬇":"нет темницы"}</button></div></div>
  <div class="panel"><h2>📜 Задания</h2>${QUESTS.map(q=>{const p=Math.min(q.need,S.quests[q.id]||0);const done=S.quests["done_"+q.id];return `<div class="quest ${done?"done":""}"><span>${q.name}<br><small>${p}/${q.need}</small></span>${done?"✅":`<button class="btn sm green" data-q="${q.id}" ${p>=q.need?"":"disabled"}>${costStr(q.reward)}</button>`}</div>`}).join("")}</div>
  ${sovietUnlocked()?`<div class="panel soviet-card"><h2>🖥️ СЕКРЕТНЫЙ УРОВЕНЬ: Советские Компьютеры <span class="badge" style="background:#b0201a">???</span></h2><div class="phone-card" style="background:linear-gradient(135deg,#1a0505,#4a0a0a);border-color:#ff4030"><img src="assets/d131.png" style="height:100px;filter:none"><div><b>Три красных ящика.</b><br><small>У них огромный запас HP, а каждый 3-й ход каждый из них <b>удаляет одного твоего бойца одним ударом</b> (BANNED). Следи за индикатором загрузки и убивай самого заряженного первым. Уклонение спасает.</small><br><small>Награда: 🪙${fmt(SOVIET_EVENT.reward.gold)} 💎${SOVIET_EVENT.reward.gems} 📜${SOVIET_EVENT.reward.scrolls}, первая победа — 🥚 <b>Бог</b> (божественный).</small></div></div>
  <div class="row"><button class="btn red" id="gosoviet">▶ ЗАПУСТИТЬ${S.sovietWins?` <small>(побед: ${S.sovietWins})</small>`:""}</button></div></div>`:""}
  <div class="panel"><h2 id="stat-title">📊 Статистика</h2><div class="stat"><span>Драконов</span><span>${ownedIds().length}/${DRAGONS.filter(d=>!d.boss).length}</span></div><div class="stat"><span>Побед</span><span>${S.wins}</span></div><div class="stat"><span>Боёв</span><span>${S.battles}</span></div><div class="stat"><span>Островов</span><span>${S.islands.length}/${ISLANDS.length}</span></div><div class="stat"><span>Построек</span><span>${allTiles().filter(t=>t.b).length}</span></div><div class="stat"><span>Открыто клеток</span><span>${allTiles().filter(t=>t.unlocked).length}/${allTiles().length}</span></div>
  <div class="row"><button class="btn red sm" id="reset">Сбросить прогресс</button></div></div></div>`;
  bindZodiac(root);const gp=$("#gophone",root);if(gp)gp.onclick=openPhone;const gs=$("#gosoviet",root);if(gs)gs.onclick=startSoviet;const gj=$("#gojohnny",root);if(gj)gj.onclick=startJohnny;const gm=$("#gomoose",root);if(gm)gm.onclick=startMoose;
  const stt=$("#stat-title",root);if(stt){stt.onclick=()=>{S._sovTap=(S._sovTap||0)+1;if(S._sovTap>=5&&!S.sovietFound){S.sovietFound=true;S._sovTap=0;save();sndPlay("init",.8);toast("🖥️ …init. Что-то нашлось.");renderEvents()}}}const gd=$("#godg",root);if(gd)gd.onclick=openDungeon;
  $$("[data-buy]",root).forEach(b=>b.onclick=()=>{const p=+b.dataset.price;if(S.level<DRAGON_REQ[b.dataset.buy]){toast("Нужен уровень "+DRAGON_REQ[b.dataset.buy]);return}if(S.gold<p){toast("Не хватает золота");return}S.gold-=p;giveEgg(b.dataset.buy,"event");addXP(150);save();renderEvents()});
  $$("[data-claim]",root).forEach(b=>b.onclick=()=>{S.quests["claim_"+b.dataset.claim]=1;S.gold+=1000;S.gems+=10;S.food+=300;S.scrolls=(S.scrolls||0)+5;addXP(50);save();toast("🎁 +🪙1000 +💎10 +🍖300 +📜5");renderEvents()});
  $$("[data-q]",root).forEach(b=>b.onclick=()=>{const q=QUESTS.find(x=>x.id===b.dataset.q);S.quests["done_"+q.id]=1;S.gold+=q.reward.gold||0;S.gems+=q.reward.gems||0;S.food+=q.reward.food||0;S.scrolls=(S.scrolls||0)+(q.reward.scrolls||0);addXP(80);save();toast("✅ "+costStr(q.reward));renderEvents()});
  const rst=$("#reset");if(rst)rst.onclick=()=>{if(confirm("Точно удалить весь прогресс?")){if(SAVE_MODE==="account"){netSend({t:"save_reset"});sessionStorage.removeItem("dml_acc_session")}else localStorage.removeItem(SAVE_KEY);location.reload()}};
}
setInterval(()=>$$(".timer").forEach(t=>t.textContent=tleft(+t.dataset.end)),1000);
// хуки квестов
const _feed=feed;feed=function(id,n){const before=S.dragons[id].lvl;_feed(id,n);S.quests.feed=(S.quests.feed||0)+(S.dragons[id].lvl-before);save()};

/* ================= МАГАЗИН ================= */
function renderShop(){
  const root=$("#scr-shop");const f=featured();
  const items=[
    {ico:"🥚",name:"Обычное яйцо",desc:"Случайный обычный/редкий дракон",cost:{gold:2000},act:()=>hatch(["common","rare"])},
    {ico:"🥚✨",name:"Эпическое яйцо",desc:"Случайный редкий/эпический дракон",cost:{gems:30},act:()=>hatch(["rare","epic"])},
    {ico:"🥚✨✨",name:"Древнее яйцо",desc:"Гарантированно эпический дракон",cost:{gems:90},act:()=>hatch(["epic"])},
    {ico:"📜",name:"Свиток обучения",desc:"+1 свиток → 1 📘 любому дракону в Академии",cost:SCROLL_SHOP,act:()=>{S.scrolls=(S.scrolls||0)+1}},
    {ico:"📜📜",name:"Связка свитков",desc:"+10 свитков обучения",cost:{gems:15},act:()=>{S.scrolls=(S.scrolls||0)+10}},
    {ico:"🍖",name:"Мешок еды",desc:"+1000 еды",cost:{gold:600},act:()=>{S.food+=1000}},
    {ico:"🪙",name:"Сундук золота",desc:"+3000 золота",cost:{gems:10},act:()=>{S.gold+=3000}},
    {ico:"💎",name:"Самоцветы",desc:"+50 самоцветов (бесплатно раз в час)",cost:{},act:()=>{const t=S.quests.freeGems||0;if(Date.now()-t<3600e3){toast("Ещё "+tleft(t+3600e3));return false}S.quests.freeGems=Date.now();S.gems+=50}},
  ];
  root.innerHTML=`<div style="padding:14px 14px 0"><div class="panel"><h2>🏪 Магазин</h2><small>Яйца дают случайных драконов (дубликат превращается в ресурсы). Ниже — все драконы для прямой покупки.</small></div></div>
  <div class="shop-grid">${items.map((it,i)=>`<div class="panel shop-item"><div class="big">${it.ico}</div><h3>${it.name}</h3><small>${it.desc}</small><button class="btn green sm" data-i="${i}" ${canPay(it.cost)?"":"disabled"}>${costStr(it.cost)||"Забрать"}</button></div>`).join("")}</div>
  <div style="padding:0 14px"><div class="panel"><h2>🐲 Каталог драконов</h2></div></div>
  <div class="shop-grid">${DRAGONS.filter(d=>!S.dragons[d.id]&&!d.boss).sort((a,b)=>DRAGON_REQ[a.id]-DRAGON_REQ[b.id]).map(d=>{const r=RARITY[d.rarity];const disc=d.id===f.dom.id?.6:d.id===f.dow.id?.75:1;const pr0=dragonPrice(d);const pr=pr0.gems?{gems:Math.round(pr0.gems*disc)}:{gold:Math.round(pr0.gold*disc)};const lk=S.level<DRAGON_REQ[d.id];const lg=isSpecial(d.id);return `<div class="panel shop-item ${lk?"lockb":""}"><img src="assets/${d.id}.png"><h3>${d.name}</h3>${lg?`<span class="badge" style="background:#ff4fe6">${isEvent(d.id)?"🎪 событие":"👑 разведение"}</span>`:lk?`<span class="badge">🔒 ур.${DRAGON_REQ[d.id]}</span>`:""}<span class="badge" style="background:${r.color}">${r.name}</span><div>${d.els.map(elIco).join("")}</div>${disc<1?`<span class="badge">СКИДКА</span>`:""}<button class="btn sm ${canPay(pr)?"green":""}" data-d="${d.id}" data-p="${JSON.stringify(pr).replace(/"/g,"&quot;")}" ${lk||lg?"disabled":""}>${lg?"—":lk?"🔒 ур."+DRAGON_REQ[d.id]:costStr(pr)}</button></div>`}).join("")||"<div class='panel'>Вы собрали всех драконов! 🎉</div>"}</div>`;
  $$("[data-i]",root).forEach(b=>b.onclick=()=>{const it=items[b.dataset.i];if(!canPay(it.cost)){toast("Недостаточно ресурсов");return}const r=it.act();if(r===false)return;pay(it.cost);save();updateTop();toast(`${it.ico} ${it.name}!`);renderShop()});
  $$("[data-d]",root).forEach(b=>b.onclick=()=>{const pr=JSON.parse(b.dataset.p);const id=b.dataset.d;if(S.level<DRAGON_REQ[id]){toast("Нужен уровень "+DRAGON_REQ[id]);return}if(!canPay(pr)){toast("Не хватает "+(pr.gems?"💎":"🪙"));return}pay(pr);giveEgg(id,"shop");addXP(50);save();updateTop();renderShop()});
}
function hatch(rars){const pool=DRAGONS.filter(d=>rars.includes(d.rarity)&&!isSpecial(d.id));const d=pick(pool);S.inv=S.inv||[];S.inv.push({id:d.id,src:"egg",secret:true});save();toast("🥚 Яйцо добавлено в инвентарь → Инкубатор");renderShop();return;
  setTimeout(()=>{if(S.dragons[d.id]){const r=RARITY[d.rarity];const g=Math.round(r.price*.4);S.gold+=g;S.food+=200;save();updateTop();modal(`<h2>🥚 Яйцо вылупилось</h2><div class="center"><img src="assets/${d.id}.png" style="height:160px"><h3>${d.name}</h3><p>Дубликат! Превращён в 🪙${g} и 🍖200.</p></div>`)}
    else{S.dragons[d.id]={lvl:1,xp:0,stars:1};addXP(120);save();modal(`<h2>🥚 Яйцо вылупилось!</h2><div class="center"><img src="assets/${d.id}.png" style="height:160px;animation:float 1s infinite alternate"><h3>${d.name}</h3><span class="badge" style="background:${RARITY[d.rarity].color}">${RARITY[d.rarity].name}</span><div>${d.els.map(elIco).join("")}</div><p class="desc">${d.desc}</p></div>`)}
    renderShop()},50)}

/* ================= КВЕСТ-ХУКИ ДЛЯ КАРТЫ ================= */
const _tileClick=tileClick;
document.addEventListener("click",e=>{if(e.target.id==="collect")S.quests.collect=(S.quests.collect||0)+1;if(e.target.closest&&e.target.closest(".build-opt"))S.quests.build=(S.quests.build||0)+1},true);

/* ================= ЗВУКОВЫЕ ЭФФЕКТЫ (WebAudio, синтез) ================= */
function sfxCtx(){try{MUSIC.ctx=MUSIC.ctx||new (window.AudioContext||window.webkitAudioContext)();if(MUSIC.ctx.state==="suspended")MUSIC.ctx.resume();return MUSIC.ctx}catch(e){return null}}
function tone({f=440,f2,type="sine",d=.2,v=.3,t=0,curve="exp"}){const c=sfxCtx();if(!c||!S||S.music===false)return;const o=c.createOscillator(),gn=c.createGain();o.type=type;const t0=c.currentTime+t;o.frequency.setValueAtTime(f,t0);if(f2)o.frequency.exponentialRampToValueAtTime(Math.max(20,f2),t0+d);gn.gain.setValueAtTime(.0001,t0);gn.gain.linearRampToValueAtTime(v,t0+.008);gn.gain.exponentialRampToValueAtTime(.0001,t0+d);o.connect(gn);gn.connect(c.destination);o.start(t0);o.stop(t0+d+.05)}
function noise({d=.2,v=.3,t=0,lp=2000,hp=100}){const c=sfxCtx();if(!c||!S||S.music===false)return;const n=c.sampleRate*d,b=c.createBuffer(1,n,c.sampleRate),ch=b.getChannelData(0);for(let i=0;i<n;i++)ch[i]=(Math.random()*2-1)*(1-i/n);const s=c.createBufferSource();s.buffer=b;const l=c.createBiquadFilter();l.type="lowpass";l.frequency.value=lp;const h=c.createBiquadFilter();h.type="highpass";h.frequency.value=hp;const gn=c.createGain();gn.gain.value=v;s.connect(l);l.connect(h);h.connect(gn);gn.connect(c.destination);s.start(c.currentTime+t)}
const SND={};function sndPlay(n,v){if(!S||S.music===false)return;try{let a=SND[n];if(!a){a=new Audio("assets/"+n+(n.includes(".")?"":".ogg"));SND[n]=a}a.volume=(v||.8)*(S.vol==null?1:S.vol);a.currentTime=0;a.play().catch(()=>{})}catch(e){}}
const SFX={
  click(){tone({f:900,f2:1300,type:"square",d:.06,v:.12})},
  select(){tone({f:600,type:"triangle",d:.08,v:.15});tone({f:900,type:"triangle",d:.1,v:.15,t:.07})},
  charge(){for(let i=0;i<8;i++)tone({f:200+i*90,f2:260+i*90,type:"sawtooth",d:.09,v:.08,t:i*.07});noise({d:.6,v:.06,lp:1200})},
  perfect(){[0,4,7,12].forEach((n,i)=>tone({f:660*Math.pow(2,n/12),type:"square",d:.15,v:.14,t:i*.05}))},
  block(){noise({d:.12,v:.25,lp:900});tone({f:180,f2:90,type:"square",d:.15,v:.2})},
  heal(){[0,4,7].forEach((n,i)=>tone({f:520*Math.pow(2,n/12),type:"sine",d:.35,v:.15,t:i*.09}))},
  buff(){tone({f:300,f2:900,type:"triangle",d:.3,v:.15})},
  debuff(){tone({f:700,f2:150,type:"sawtooth",d:.35,v:.12})},
  win(){[0,4,7,12,16].forEach((n,i)=>tone({f:440*Math.pow(2,n/12),type:"square",d:.25,v:.15,t:i*.12}))},
  lose(){[0,-3,-7,-12].forEach((n,i)=>tone({f:330*Math.pow(2,n/12),type:"sawtooth",d:.4,v:.12,t:i*.25}))},
  // --- удары по стихиям ---
  hit:{
    digit(){for(let i=0;i<3;i++)tone({f:1200+i*300,type:"square",d:.05,v:.15,t:i*.06});noise({d:.08,v:.15,lp:4000})},        // щёлкающий счётчик
    clock(){tone({f:2200,f2:1800,type:"sine",d:.25,v:.25});tone({f:2200,f2:1800,type:"sine",d:.25,v:.2,t:.18});tone({f:1100,type:"triangle",d:.4,v:.15,t:.36})}, // бой часов
    night(){tone({f:180,f2:40,type:"sine",d:.6,v:.35});noise({d:.5,v:.08,lp:400})},                                             // низкий гул
    cat(){noise({d:.12,v:.3,lp:6000,hp:1500});noise({d:.1,v:.25,lp:6000,hp:1500,t:.09});noise({d:.1,v:.2,lp:6000,hp:1500,t:.18})}, // царапки
    doc(){tone({f:1500,f2:3000,type:"sine",d:.12,v:.2});tone({f:400,type:"square",d:.08,v:.15,t:.13})},                            // укол
    bird(){noise({d:.25,v:.2,lp:5000,hp:2000});tone({f:1800,f2:2600,type:"triangle",d:.1,v:.15});tone({f:2600,f2:1800,type:"triangle",d:.1,v:.15,t:.1})}, // клёкот/взмах
    cyber(){tone({f:1200,f2:300,type:"sawtooth",d:.25,v:.2});tone({f:3000,type:"square",d:.05,v:.1,t:.02})},                    // лазер
    glitch(){for(let i=0;i<6;i++)tone({f:200+Math.random()*2500,type:"square",d:.04,v:.12,t:i*.04})},                             // сбой
    sheep(){tone({f:120,f2:60,type:"square",d:.25,v:.35});noise({d:.15,v:.3,lp:600})},                                             // таран
    royal(){[0,7,12].forEach((n,i)=>tone({f:880*Math.pow(2,n/12),type:"triangle",d:.2,v:.15,t:i*.04}));noise({d:.15,v:.1,lp:8000,hp:3000})}, // звон драгоценностей
    beast(){noise({d:.35,v:.35,lp:1500});tone({f:150,f2:70,type:"sawtooth",d:.35,v:.25})},                                        // рык
    money(){for(let i=0;i<4;i++)tone({f:2500+i*400,type:"sine",d:.12,v:.12,t:i*.05});noise({d:.05,v:.1,lp:8000,hp:4000})},         // звон монет
    zodiac(){[0,4,7,11,14].forEach((n,i)=>tone({f:700*Math.pow(2,n/12),type:"sine",d:.3,v:.1,t:i*.04}))},                         // звёздный перелив
    legend(){tone({f:100,f2:50,type:"sawtooth",d:.6,v:.3});[0,7,12].forEach((n,i)=>tone({f:440*Math.pow(2,n/12),type:"square",d:.3,v:.12,t:.1+i*.08}));noise({d:.4,v:.2,lp:2000})},
    divine(){[0,4,7,12,19].forEach((n,i)=>tone({f:523*Math.pow(2,n/12),type:"sine",d:.5,v:.12,t:i*.05}));noise({d:.3,v:.08,lp:9000,hp:5000})},
    tyrant(){tone({f:60,f2:30,type:"sawtooth",d:.9,v:.4});noise({d:.6,v:.3,lp:500});tone({f:900,f2:100,type:"square",d:.5,v:.12,t:.1})},
    basic(){noise({d:.12,v:.25,lp:1500})}
  },
  el(e){(SFX.hit[e]||SFX.hit.basic)()}
};

/* ================= МУЗЫКА (WebAudio, процедурная + mp3 для финала) ================= */
const MUSIC={ctx:null,cur:null,nodes:[],timer:null,mp3:null};
const TRACKS={ // ноты (полутоны от A3), темп, характер
  map:{bpm:92,bass:[0,0,5,5,7,7,3,3],lead:[12,16,19,16,12,14,16,12, 7,11,14,11,7,9,11,7],wave:"triangle",gain:.05},
  select:{bpm:120,bass:[0,0,-2,-2,3,3,5,5],lead:[12,12,15,17,12,12,10,7, 8,8,12,15,8,8,7,5],wave:"square",gain:.035},
  battle:{bpm:150,bass:[0,0,0,0,-2,-2,-2,-2,3,3,3,3,5,5,7,7],lead:[12,15,12,17,12,15,19,15, 10,13,10,15,10,13,17,13],wave:"sawtooth",gain:.035},
  pvp:{bpm:140,bass:[0,3,0,3,5,8,5,8,-2,2,-2,2,3,7,3,7],lead:[12,19,15,19,17,24,20,24, 10,17,13,17,15,22,19,22],wave:"square",gain:.035},
  campaign:{bpm:80,bass:[0,0,0,0,-4,-4,-4,-4,-2,-2,-2,-2,3,3,3,3],lead:[12,14,15,19,15,14,12,10, 8,10,12,15,12,10,8,7],wave:"triangle",gain:.045},
};
function playMusic(name){if(MUSIC.cur===name)return;stopMusic();MUSIC.cur=name;if(!S||!S.music)return;
  if(name==="gbt"||name==="soviet"||name==="johnny"||name==="moose"){const a=new Audio("assets/"+name+".mp3");a.loop=true;a.volume=.6*(S.vol==null?1:S.vol);a.play().catch(()=>{});MUSIC.mp3=a;return}
  if(name==="drone"){playDrone();return}
  const T=TRACKS[name];if(!T)return;try{MUSIC.ctx=MUSIC.ctx||new (window.AudioContext||window.webkitAudioContext)();}catch(e){return}
  const ctx=MUSIC.ctx;if(ctx.state==="suspended")ctx.resume();
  const master=ctx.createGain();MUSIC.baseGain=T.gain;master.gain.value=T.gain*(S.vol==null?1:S.vol);master.connect(ctx.destination);MUSIC.master=master;
  const step=60/T.bpm/2;let i=0;let next=ctx.currentTime+.05;
  const f=n=>220*Math.pow(2,n/12);
  function note(freq,t,d,wave,vol){const o=ctx.createOscillator(),gn=ctx.createGain();o.type=wave;o.frequency.value=freq;gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(vol,t+.01);gn.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(gn);gn.connect(master);o.start(t);o.stop(t+d+.02)}
  function sched(){if(MUSIC.cur!==name)return;while(next<ctx.currentTime+.4){const b=T.bass[Math.floor(i/2)%T.bass.length],l=T.lead[i%T.lead.length];
      if(i%2===0)note(f(b-12),next,step*1.8,"sine",.9);note(f(l),next,step*.9,T.wave,.5);
      if(name==="battle"||name==="pvp"){if(i%4===0)note(60,next,.08,"square",.6)} // «барабан»
      next+=step;i++}MUSIC.timer=setTimeout(sched,120)}
  sched()}
function stopMusic(){clearTimeout(MUSIC.timer);MUSIC.timer=null;if(MUSIC.master){try{MUSIC.master.gain.linearRampToValueAtTime(0,MUSIC.ctx.currentTime+.3)}catch(e){}const m=MUSIC.master;setTimeout(()=>m.disconnect(),400);MUSIC.master=null}if(MUSIC.mp3){MUSIC.mp3.pause();MUSIC.mp3=null}MUSIC.cur=null}
function ctxMusic(){if(B)return B.opp.music||(B.opp.pvp?"pvp":"battle");if(S.mooseFound)return "drone";const a=$(".screen.active");const scr=a?a.id.replace("scr-",""):"map";return scr==="battle"||scr==="pvp"?"select":scr==="campaign"?"campaign":"map"}
function toggleMusic(){S.music=!S.music;save();stopMusic();if(S.music){playMusic(ctxMusic())}$("#musbtn").textContent=S.music?"🔊":"🔇"}
function setVolume(v){S.vol=Math.max(0,Math.min(1,v));save();if(MUSIC.mp3)MUSIC.mp3.volume=.6*S.vol;if(MUSIC.master)try{MUSIC.master.gain.value=(MUSIC.baseGain||1)*S.vol}catch(e){}}
// музыка стартует только после первого жеста пользователя (политика браузеров)
document.addEventListener("pointerdown",()=>{if(MUSIC.ctx&&MUSIC.ctx.state==="suspended")MUSIC.ctx.resume();if(!MUSIC.cur&&S&&S.music)playMusic(B?"battle":"map")},{once:false});

/* ================= КАМПАНИЯ ================= */
function campProgress(){return S.camp.done||0}
function renderCampaign(){const root=$("#scr-campaign");const done=campProgress();
  root.innerHTML=`<div class="camp"><div class="camp-top"><button class="btn sm" onclick="show('battle')">← Арена</button><h2>📖 Кампания: Третий час</h2><span class="badge gold">${done}/${CAMPAIGN_NODES.length}</span></div>
  ${CAMPAIGN.map(ch=>`<div class="chapter" style="--bg:${ch.bg}"><div class="ch-title">${ch.title}</div><div class="ch-path">${ch.nodes.map(n=>{const gi=CAMPAIGN_NODES.findIndex(x=>x.name===n.name);const st=gi<done?"done":gi===done?"now":"lock";return `<div class="cnode ${st} ${n.boss?"boss":""} ${n.final?"final":""}" data-i="${gi}"><div class="cn-img">${n.ids.slice(0,n.boss?3:1).map(id=>`<img src="assets/${id}.png">`).join("")}</div><div class="cn-name">${n.final?"☠️ ":n.boss?"👹 ":""}${n.name}</div><small>ур.${n.lvl}${st==="done"?" ✅":st==="lock"?" 🔒":""}</small></div>`}).join('<div class="cpath"></div>')}</div></div>`).join("")}
  <p class="center"><small>Пройденные бои можно переигрывать (награда меньше). Побеждай по порядку, чтобы открыть сюжет.</small></p></div>`;
  $$(".cnode",root).forEach(n=>n.onclick=()=>{const i=+n.dataset.i;if(i>done){toast("Сначала пройди предыдущий бой");return}openCampNode(i)})}
function openCampNode(i){const n=CAMPAIGN_NODES[i];const replay=i<campProgress();
  const m=modal(`<h2>${n.final?"☠️":n.boss?"👹":"⚔️"} ${n.name}</h2><div class="center">${n.ids.map(id=>`<img src="assets/${id}.png" style="height:90px">`).join("")}</div><p class="center">${n.ids.map(id=>dInfo(id).name+" "+dInfo(id).els.map(elIco).join("")).join("<br>")}</p><p class="center"><small>Уровень врагов: ${n.lvl}${replay?" · повтор (награда ×0.3)":""}</small></p>
  <div class="row" style="justify-content:center"><button class="btn red" id="cgo">В бой</button></div>`);
  $("#cgo",m).onclick=()=>{closeModal();pickTeamModal(n.name,"",()=>{playDialog(n.pre,()=>{
    startBattle({name:n.name,lvl:n.lvl,ids:n.ids,campaign:true,ch:n.ch,boss:n.boss,final:n.final,music:n.music,bg:n.bgi,onEnd:(win)=>{if(win){const mult=replay?.3:1;const gold=Math.round((300*n.lvl+(n.boss?1500:0))*mult*(1+lootBonus())),xp=Math.round((60+80*n.lvl)*mult),gems=replay?0:(n.boss?25:8),sc=Math.round((2+Math.floor(n.lvl/3))*mult);S.gold+=gold;S.gems+=gems;S.scrolls=(S.scrolls||0)+sc;addXP(xp);
        if(!replay){S.camp.done=i+1;if(i+1>S.wins)S.wins=i+1;S.quests.wins=(S.quests.wins||0)+1}
        let extra="";if(n.final&&!replay){S.gems+=300;S.scrolls=(S.scrolls||0)+50;if(n.reward&&n.reward.egg)giveEgg(n.reward.egg,"campaign");extra=`<p><b>🏆 Кампания пройдена! +💎300 +📜50${n.reward&&n.reward.egg?" и 🥚 яйцо: "+dInfo(n.reward.egg).name:""}.</b></p>`}else if(n.name==="Антон Гусев"&&!replay){S.gems+=150;S.scrolls=(S.scrolls||0)+30;giveEgg("d122","campaign");extra="<p><b>🪖 Гусев повержен! +💎150 +📜30 и 🥚 яйцо Антона Гусева. Но где-то открывается портал…</b></p>"}else if(n.name==="Г.Б.Т."&&!replay){S.gems+=150;S.scrolls=(S.scrolls||0)+30;giveEgg("d107","campaign");extra="<p><b>👑 Г.Б.Т. повержен! +💎150 +📜30 и 🥚 яйцо Алмазного Голема. Но история не закончена…</b></p>"}else if(n.reward&&n.reward.egg&&!replay){giveEgg(n.reward.egg,"campaign");extra=`<p><b>🥚 Яйцо: ${dInfo(n.reward.egg).name}!</b></p>`}
        save();updateTop();playDialog(n.post,()=>{playMusic("campaign");modal(`<div class="result win">ПОБЕДА!</div><div class="center" style="font-weight:900">+🪙${gold} +💎${gems} +📜${sc} +⭐${xp}</div>${extra}<div class="row" style="justify-content:center"><button class="btn green" onclick="closeModal();show('campaign')">Дальше</button></div>`,{closable:false})})}
      else{addXP(10);save();playMusic("campaign");modal(`<div class="result lose">ПОРАЖЕНИЕ</div><p class="center">${n.name} оказался сильнее. Прокачай драконов в Академии и вернись.</p><div class="row" style="justify-content:center"><button class="btn" onclick="closeModal();show('campaign')">Ок</button></div>`,{closable:false})}}})})})}}
function playDialog(lines,done){if(!lines||!lines.length){done();return}let i=0;
  const root=$("#modal-root");
  function draw(){const [img,who,text]=lines[i];const isAv=img.startsWith("av"),far=img.startsWith("say_");root.innerHTML=`<div class="dlg-overlay"><div class="dlg"><img class="dlg-img ${far?"far":""}" src="assets/${isAv?"av/"+img+".jpg":img+".png"}"><div class="dlg-box"><div class="dlg-who">${who}</div><div class="dlg-text" id="dtext"></div><div class="dlg-hint">нажми, чтобы продолжить ▸ &nbsp; <a id="dskip">пропустить</a></div></div></div></div>`;
    const el=$("#dtext");let k=0;const tw=setInterval(()=>{el.textContent=text.slice(0,++k);if(k>=text.length)clearInterval(tw)},18);
    $(".dlg-overlay").onclick=e=>{if(e.target.id==="dskip"){clearInterval(tw);root.innerHTML="";done();return}if(k<text.length){clearInterval(tw);el.textContent=text;k=text.length;return}i++;if(i<lines.length)draw();else{root.innerHTML="";done()}}}
  draw()}

/* ================= ЭКРАН ЗАГРУЗКИ ================= */
function showBoot(){const b=document.createElement("div");b.id="boot";b.innerHTML=`<div class="boot-logo">🐉</div><div class="boot-title">Легенды <span>Дракономании</span></div><div class="boot-bar"><div id="bootfill"></div></div><div class="boot-txt" id="boottxt">Загрузка ресурсов…</div>`;document.body.append(b);
  const imgs=["d00","d19","d13","d14","d29","d44","d68"].map(i=>{const im=new Image();im.src="assets/"+i+".png";return im});let p=0;
  const tick=setInterval(()=>{p=Math.min(p+rnd(4,11),NET.status==="online"||NET.bootTimeout||NET.status==="offline"&&p>60?100:88);
    if(p>=88&&!NET.bootTimeout&&!$("#bootskip")){const s=document.createElement("button");s.id="bootskip";s.className="btn sm";s.textContent="Играть офлайн, не ждать";s.style.marginTop="10px";s.onclick=()=>{NET.bootTimeout=true};b.append(s)}$("#bootfill").style.width=p+"%";$("#boottxt").textContent=p<40?"Загрузка ресурсов…":p<88?"Подключение к серверу…":NET.status==="online"?"Готово":"Сервер просыпается… (до 60 с)";
    if(p>=100){clearInterval(tick);setTimeout(()=>{b.classList.add("out");setTimeout(()=>b.remove(),500);if(NET.me)return;bootChoice()},300)}},90);
  // не ждём сервер дольше 25 с
  setTimeout(()=>{if(NET.status!=="online")NET.bootTimeout=true},25000);
  // если WebSocket «висит» (провайдер/антивирус режет WSS), рвём его и пробуем заново
  setTimeout(()=>{if(NET.status==="connecting"&&NET.ws){try{NET.ws.close()}catch(e){}}},12000);}
function bootChoice(){const on=NET.status==="online";
  const m=modal(`<h2>🐉 Добро пожаловать!</h2><p><small>Выбери, как играть. Аккаунт: прогресс хранится <b>на сервере</b>, PvP и друзья. Офлайн: отдельное локальное сохранение в этом браузере.</small></p>
  <div class="boot-opts"><button class="bopt acc" id="b_login" ${on?"":"disabled"}><b>🔐 Войти в аккаунт</b><small>${on?"или зарегистрироваться":"сервер недоступен"}</small></button><button class="bopt loc" id="b_local"><b>💾 Играть офлайн</b><small>локальный профиль${localStorage.getItem(SAVE_KEY)?" · есть сохранение":""}</small></button></div>
  ${!on?`<p><small id="bwait">⏳ Ждём сервер… кнопка входа включится автоматически.</small> <button class="btn sm" id="bretry">🔄 Повторить</button> <button class="btn sm" id="bdiag">🩺 Проверка</button></p>`:""}`,{closable:false});
  const br=$("#bretry",m);if(br)br.onclick=()=>{NET.retry=1000;if(NET.ws){try{NET.ws.close()}catch(e){}}NET.ws=null;netConnect();toast("Переподключение…")};
  const bd=$("#bdiag",m);if(bd)bd.onclick=async()=>{const w=$("#bwait");w.textContent="🩺 Проверяю…";let http="❌";try{const r=await fetch(location.origin+"/health?"+Date.now(),{cache:"no-store"});http=r.ok?"✅":"❌ "+r.status}catch(e){http="❌ нет ответа"}
    const ws=NET.status==="online"?"✅":NET.ws&&NET.ws.readyState===0?"⏳ висит":"❌";w.innerHTML=`HTTP-сервер: ${http} · WebSocket: ${ws}.<br>${http.startsWith("✅")&&ws!=="✅"?"<b>Сервер жив, но WebSocket блокируется</b> — это провайдер, антивирус, VPN или расширение браузера. Попробуй другой браузер/сеть (мобильный интернет) или отключи VPN/антивирус-фильтр HTTPS.":!http.startsWith("✅")?"Сервер не отвечает: подожди 30–60 с (Render просыпается) или проверь интернет.":"Всё в порядке — нажми «Войти»."}`};
  $("#b_login",m).onclick=()=>{closeModal();NET.wantAuth=true;showAuth("login")};
  $("#b_local",m).onclick=()=>{closeModal();sessionStorage.setItem("dml_offline","1");loadLocalProfile();applyState(S);dailyBonus();toast("💾 Офлайн-профиль")};
  NET.onOnline=()=>{const b=$("#b_login");if(b){b.disabled=false;b.querySelector("small").textContent="или зарегистрироваться";const w=$("#bwait");if(w)w.remove()}}}
function dailyBonus(){const _day=new Date().toDateString();if(S.lastDaily!==_day){S.lastDaily=_day;S.scrolls=(S.scrolls||0)+SCROLL_DAILY;S.gems+=2;setTimeout(()=>toast(`🎁 Ежедневный подарок: +📜${SCROLL_DAILY} свитков, +💎2`),800)}
  const _off=allTiles().reduce((a,t)=>a+habStored(t),0);if(_off>0)toast(`🌙 В жилищах накопилось 🪙${fmt(_off)} — собери на острове!`);S.lastLogin=Date.now();save()}
// после входа: облако или продолжить текущую сессию
function afterLogin(m){const cloud=m.save?JSON.parse(m.save):null;const sess=sessionStorage.getItem("dml_acc_session");let local=null;try{local=sess?JSON.parse(sess):null}catch(e){}
  const useCloud=()=>{SAVE_MODE="account";applyState(cloud||newState());S.profile.name=m.me.name;S.pvp.rating=m.me.rating;dailyBonus();save();toast("☁️ Загружено сохранение аккаунта")};
  const useSess=()=>{SAVE_MODE="account";applyState(local);S.profile.name=m.me.name;S.pvp.rating=m.me.rating;save();toast("▶️ Продолжаем текущую сессию")};
  if(!local||!cloud){if(!cloud&&local&&local.profile&&local.profile.acc===m.me.id){useSess();return}useCloud();return}
  if(local.profile&&local.profile.acc&&local.profile.acc!==m.me.id){useCloud();return}
  const fmtS=s=>`ур.${s.level||1} · 🪙${fmt(s.gold||0)} · 💎${s.gems||0} · драконов ${Object.keys(s.dragons||{}).length}`;
  modal(`<h2>👋 ${m.me.name}</h2><p>Найдено два состояния игры. С какого продолжить?</p>
  <div class="boot-opts"><button class="bopt acc" id="c_cloud"><b>☁️ Сохранение аккаунта</b><small>${fmtS(cloud)}${m.saveAt?"<br>сохранено "+new Date(m.saveAt).toLocaleString():""}</small></button><button class="bopt loc" id="c_sess"><b>▶️ Где остановился в этой сессии</b><small>${fmtS(local)}</small></button></div>`,{closable:false});
  $("#c_cloud").onclick=()=>{closeModal();useCloud()};$("#c_sess").onclick=()=>{closeModal();useSess()}}

/* ================= АККАУНТ: регистрация / вход ================= */
function showAuth(mode){mode=mode||"login";if($("#authbox"))return renderAuth(mode);const root=$("#modal-root");root.innerHTML=`<div class="panel modal auth" id="authbox"></div>`;renderAuth(mode)}
function renderAuth(mode){const box=$("#authbox");if(!box)return;const reg=mode==="register";
  box.innerHTML=`<h2>${reg?"📝 Регистрация":"🔐 Вход"}</h2><p><small>Аккаунт нужен для PvP, друзей и облачного сохранения прогресса. Играть можно и без него — офлайн.</small></p>
  <label>Имя игрока<input id="au" maxlength="16" autocomplete="username" placeholder="3–16 символов"></label>
  <label>Пароль<input id="ap" type="password" maxlength="64" autocomplete="${reg?"new-password":"current-password"}"></label>
  ${reg?`<label>Повтори пароль<input id="ap2" type="password" maxlength="64"></label>`:""}
  <div id="autherr" class="autherr"></div>
  <div class="row"><button class="btn green" id="ago">${reg?"Создать аккаунт":"Войти"}</button><button class="btn" id="aswitch">${reg?"У меня есть аккаунт":"Регистрация"}</button></div>
  <div class="row"><button class="btn sm" id="askip">Играть офлайн</button></div>`;
  $("#au").focus();
  const go=()=>{const u=$("#au").value.trim(),p=$("#ap").value;if(reg&&p!==$("#ap2").value){$("#autherr").textContent="Пароли не совпадают";return}if(NET.status!=="online"){$("#autherr").textContent="Нет связи с сервером, попробуй позже";return}
    NET.authFresh=true;netSend({t:reg?"register":"login",user:u,pass:p,avatar:S.profile.avatar,power:team.reduce((a,id)=>a+power(id),0),team})};
  $("#ago").onclick=go;box.onkeydown=e=>{if(e.key==="Enter")go()};
  $("#aswitch").onclick=()=>renderAuth(reg?"login":"register");
  $("#askip").onclick=()=>{closeAuth();sessionStorage.setItem("dml_offline","1");if(!S||SAVE_MODE==="account"){loadLocalProfile();applyState(S);dailyBonus()}toast("Играем офлайн. Войти можно на экране «Друзья».")}}
function closeAuth(){if($("#authbox"))$("#modal-root").innerHTML=""}
function logout(){netSend({t:"logout"});NET.me=null;localStorage.removeItem("dml_token");sessionStorage.removeItem("dml_offline");sessionStorage.removeItem("dml_acc_session");refreshNetUI();location.reload()}

/* ================= СЕТЬ: PvP + друзья ================= */
const NET={ws:null,me:null,friends:[],requests:[],top:[],online:0,status:"offline",queued:false,room:null,retry:1000};
function serverUrl(){const c=localStorage.getItem("dml_server");if(c)return c;const l=location;if(l.protocol==="file:")return "";return (l.protocol==="https:"?"wss://":"ws://")+l.host}
function netConnect(){const url=serverUrl();if(!url){NET.status="offline";return}if(NET.ws&&(NET.ws.readyState===0||NET.ws.readyState===1))return;try{NET.ws=new WebSocket(url)}catch(e){NET.status="offline";return}
  NET.status="connecting";refreshNetUI();const ws=NET.ws;
  ws.onopen=()=>{NET.retry=1000;NET.status="online";if(NET.onOnline)NET.onOnline();if(!localStorage.getItem("dml_token")){refreshNetUI();return}if(!S){NET.booting=false}netSend({t:"hello",token:localStorage.getItem("dml_token"),name:S.profile.name,avatar:S.profile.avatar,power:team.reduce((a,id)=>a+power(id),0),team})};
  ws.onclose=()=>{NET.status="offline";NET.queued=false;refreshNetUI();setTimeout(netConnect,Math.min(10000,NET.retry*=1.5))};
  ws.onerror=()=>{};
  ws.onmessage=ev=>{let m;try{m=JSON.parse(ev.data)}catch(e){return}netHandle(m)}}
function netSend(m){if(NET.ws&&NET.ws.readyState===1)NET.ws.send(JSON.stringify(m))}
function pvpSend(m){netSend(m)}
function netHandle(m){
  if(m.t==="welcome"){NET.settings=m.settings||{};if(NET.settings.motd){setTimeout(()=>toast("📌 "+NET.settings.motd),1500)}NET.me=m.me;localStorage.setItem("dml_token",m.token);NET.top=m.top;NET.online=m.online;NET.isAdmin=!!m.me.admin;
    closeAuth();if($("#b_login"))closeModal();afterLogin(m);S.profile.acc=m.me.id;save();updateTop();refreshNetUI();toast("👋 "+m.me.name+", вы вошли");if(NET.isAdmin)addAdminButton();return}
  if(m.t==="save_ok"){return}
  if(m.t==="save_rejected"){toast("🚫 Сохранение отклонено сервером: "+m.msg);if(m.data){try{applyState(JSON.parse(m.data))}catch(e){}}return}
  if(m.t==="visit"){renderVisit(m);return}
  if(m.t==="admin_data"){renderAdmin(m);return}
  if(m.t==="admin_save"){renderAdminSave(m);return}
  if(m.t==="settings"){NET.settings=m.settings||{};if(NET.settings.motd&&NET.settings.motd!==NET.lastMotd){NET.lastMotd=NET.settings.motd;toast("📌 "+NET.settings.motd)}return}
  if(m.t==="admin_ok"){toast("✅ "+(m.msg||"Готово"));netSend({t:"admin_list"});return}
  if(m.t==="need_auth"){NET.me=null;localStorage.removeItem("dml_token");if(NET.booting){NET.booting=false;return}if(!sessionStorage.getItem("dml_offline")||NET.wantAuth)showAuth();NET.wantAuth=false;return}
  if(m.t==="auth_err"){const e=$("#autherr");if(e)e.textContent=m.msg;else toast("⚠️ "+m.msg);return}
  if(m.t==="broadcast"){modal(`<h2>📢 Сообщение администратора${m.from?" ("+m.from+")":""}</h2><p>${m.msg}</p><div class="row"><button class="btn green" onclick="closeModal()">Ок</button></div>`);return}
  if(m.t==="banned"){modal(`<h2>🚫 Аккаунт заблокирован</h2><p>${m.msg||""}</p>`,{closable:false});return}
  if(m.t==="kicked"){toast("⚠️ В аккаунт вошли с другого устройства");return}
  if(m.t==="me"){NET.me=m.me;S.pvp.rating=m.me.rating;if(NET.top)NET.top.forEach(p=>{if(p.id===m.me.id){p.avatar=m.me.avatar;p.name=m.me.name}});save();refreshNetUI();return}
  if(m.t==="friends"){NET.friends=m.list;NET.requests=m.requests;refreshNetUI();if(m.requests.length&&!$("#scr-friends").classList.contains("active"))toast(`👥 Заявки в друзья: ${m.requests.length}`);return}
  if(m.t==="top"){NET.top=m.top;NET.online=m.online;refreshNetUI();return}
  if(m.t==="err"){toast("⚠️ "+m.msg);return}
  if(m.t==="info"){toast(m.msg);return}
  if(m.t==="queued"){NET.queued=true;refreshNetUI();return}
  if(m.t==="dequeued"){NET.queued=false;refreshNetUI();return}
  if(m.t==="challenged"){modal(`<h2>⚔️ Вызов на бой!</h2><div class="center"><img src="assets/av/${m.from.avatar}.jpg" class="av big"></div><p class="center"><b>${m.from.name}</b> (⚡${m.from.power}, рейтинг ${m.from.rating}) вызывает тебя на PvP.</p><div class="row" style="justify-content:center"><button class="btn green" id="acc">Принять</button><button class="btn" id="dec">Отклонить</button></div>`);
    $("#acc").onclick=()=>{if(!team.length){toast("Сначала собери команду на Арене");return}closeModal();netSend({t:"accept",from:m.from.id})};$("#dec").onclick=()=>{closeModal();netSend({t:"decline",from:m.from.id})};return}
  if(m.t==="match"){NET.queued=false;closeModal();NET.pendingMatch=m;NET.oppFighters=null;const snap=team.map((id,i)=>{const f=mkFighter(id,null,"ally",i);delete f.fx;return f});netSend({t:"team",fighters:snap});toast("🎯 Соперник найден: "+m.opp.name);if(NET.oppFighters)startPvp(m);return}
  if(m.t==="act"){if(!B||!B.pvp)return;const f=B.cur;if(!f||f.side!=="enemy")return;const s=SKILLS[m.k];const t=m.ti==null?null:(s.type==="heal"?B.enemies:B.allies)[m.ti];applyNetAct(f,m.k,t,m.atkM);return}
  if(m.t==="blk"){if(!B||!B.pvp||!B.waitBlk)return;const w=B.waitBlk;B.waitBlk=null;applySkill(w.actor,w.k,w.target,w.atkM,m.blk||0);return}
  if(m.t==="team"){NET.oppFighters=m.fighters;if(NET.pendingMatch)startPvp(NET.pendingMatch);return}
  if(m.t==="opp_left"){if(B&&B.pvp){pvpFinish(true,"Соперник покинул бой")}return}
  if(m.t==="rated"){S.pvp.rating=m.rating;save();const rl=$("#ratingline");if(rl)rl.innerHTML=`<b>${m.delta>0?"+":""}${m.delta}</b> рейтинга → ${m.rating} ${leagueOf(m.rating).ico}`;return}
  if(m.t==="room_end"){NET.room=null;if(B&&B.pvp&&m.reason!=="finished")pvpFinish(m.loser!==undefined&&m.loser!==(B.opp.host?0:1),"Бой прерван");return}
}
function leagueOf(r){let L=LEAGUES[0];LEAGUES.forEach(l=>{if(r>=l.min)L=l});return L}
function refreshNetUI(){const chip=$("#netchip");if(chip){const st=NET.status==="online"?(NET.me?"in":"noauth"):NET.status;chip.className="netchip "+st;chip.innerHTML=st==="in"?`🟢 ${NET.me.name}`:st==="noauth"?"🟡 Войти":st==="connecting"?"⏳ Подключение…":"🔴 Нет связи";chip.title=st==="in"?"В сети как "+NET.me.name:st==="noauth"?"Сервер доступен — войди в аккаунт для PvP и друзей":st==="connecting"?"Соединяемся с сервером (после простоя он просыпается до 1 минуты)":"Сервер недоступен, пробуем переподключиться"}
const st=$("#netdot");if(st){st.className="netdot "+NET.status;st.title=NET.status==="online"?`Онлайн: ${NET.online}`:"Нет связи с сервером"}
  if($("#scr-pvp").classList.contains("active")&&!B)renderPvp();if($("#scr-friends").classList.contains("active"))renderFriends()}
function startPvp(m){if(!NET.oppFighters)return;NET.pendingMatch=null;
  const ef=NET.oppFighters.filter(f=>dInfo(f.id)).map((f,i)=>({...f,side:"enemy",i,fx:[],cds:{},tb:f.tb||{},reviveUsed:false}));if(!ef.length){toast("У соперника нет команды");return}
  NET.room=m.room;B=null;
  startBattle({name:m.opp.name,lvl:Math.max(...ef.map(f=>f.lvl)),ids:ef.map(f=>f.id),pvp:true,host:m.you===0,seed:m.seed,enemyFighters:ef});
}
function renderPvp(){const root=$("#scr-pvp");const r=S.pvp.rating||1000,L=leagueOf(r);const on=NET.status==="online";
  root.innerHTML=`<div class="pvp-menu"><div class="pvp-hero"><button class="btn sm" onclick="show('battle')">← Арена</button><div class="pvp-title">🏟️ PvP АРЕНА</div><div class="league">${L.ico} ${L.n} лига · рейтинг <b>${r}</b></div><div class="pvp-stats">Побед ${S.pvp.wins||0} / боёв ${S.pvp.games||0} · <span id="netdot" class="netdot ${NET.status}"></span> ${on?`онлайн ${NET.online}`:"нет связи"}</div></div>
  <div class="panel"><h2>Твоя команда</h2><div class="picker">${team.map(id=>`<img src="assets/${id}.png" class="sel" title="${dInfo(id).name}">`).join("")||"<small>Собери команду на экране Арены</small>"}</div><p><small>Сила: ⚡${team.reduce((a,id)=>a+power(id),0)}. Правила как в Дракономании: пошаговый бой 3×3, тайминг на атаку и блок, <b>10 секунд на ход</b> — иначе ход делается автоматически. Соперник — живой игрок, подобранный по силе.</small></p>
  <div class="row"><button class="btn red big" id="find" ${!on||!team.length?"disabled":""}>${NET.queued?"⏳ Ищем соперника… (отменить)":"🔍 Подбор живого игрока"}</button></div>${!on?`<p><small>⚠️ Сервер мультиплеера недоступен. Игра работает офлайн; PvP и друзья появятся, когда сервер будет опубликован на Render.</small></p>`:""}</div>
  <div class="panel"><h2>🏆 Топ игроков</h2>${(NET.top||[]).map((p,i)=>`<div class="toprow ${NET.me&&p.id===NET.me.id?"me":""}"><span>${i+1}</span><img src="assets/av/${p.avatar}.jpg" class="av"><b>${p.name}</b><small>${leagueOf(p.rating).ico} ${p.rating}</small><small>⚡${p.power}</small></div>`).join("")||"<small>Пока пусто</small>"}</div>
  <div class="panel"><h2>Лиги</h2>${LEAGUES.map(l=>`<div class="stat"><span>${l.ico} ${l.n}</span><span>от ${l.min}</span></div>`).join("")}</div></div>`;
  const f=$("#find",root);if(f)f.onclick=()=>{netSend({t:"profile",name:S.profile.name,avatar:S.profile.avatar,power:team.reduce((a,id)=>a+power(id),0),team});if(NET.queued)netSend({t:"dequeue"});else netSend({t:"queue"})}}
function renderFriends(){const root=$("#scr-friends");const on=NET.status==="online";const me=NET.me;
  root.innerHTML=`<div class="pvp-menu"><div class="panel"><h2>👤 ${me?"Аккаунт: "+me.name:"Аккаунт"}</h2>${me?`<p><small>☁️ Прогресс сохраняется в аккаунт автоматически.</small> <button class="btn sm" id="alogout">Выйти</button></p>`:`<p>Вы играете офлайн. <button class="btn sm green" id="alogin" ${on?"":"disabled"}>Войти / Регистрация</button></p>`}<div class="prof"><img src="assets/av/${S.profile.avatar}.jpg" class="av big" id="pickav"><div><input id="pname" maxlength="20" value="${S.profile.name.replace(/"/g,"&quot;")}" ${me?"disabled title='Имя = логин аккаунта'":""}><br><small>Твой код друга: <b class="code">${me?me.code:"— (офлайн)"}</b></small><br><small>Нажми на аватар, чтобы сменить</small></div></div>
  <div class="avgrid">${AVATARS.map(a=>`<img src="assets/av/${a.id}.jpg" class="av ${S.profile.avatar===a.id?"sel":""}" data-av="${a.id}" title="${a.n}">`).join("")}</div></div>
  <div class="panel"><h2>➕ Добавить друга</h2><div class="row"><input id="fcode" placeholder="Код друга, напр. A1B2C3" maxlength="6" style="text-transform:uppercase"><button class="btn green" id="fadd" ${on?"":"disabled"}>Отправить заявку</button></div></div>
  ${NET.requests.length?`<div class="panel"><h2>📨 Заявки (${NET.requests.length})</h2>${NET.requests.map(p=>`<div class="frow"><img src="assets/av/${p.avatar}.jpg" class="av"><b>${p.name}</b><small>${leagueOf(p.rating).ico} ${p.rating}</small><button class="btn sm green" data-acc="${p.id}">✓</button><button class="btn sm" data-dec="${p.id}">✕</button></div>`).join("")}</div>`:""}
  <div class="panel"><h2>👥 Друзья (${NET.friends.length})</h2>${NET.friends.map(p=>`<div class="frow"><img src="assets/av/${p.avatar}.jpg" class="av"><span class="dot ${p.online?"on":""}"></span><b>${p.name}</b><small>${leagueOf(p.rating).ico} ${p.rating} · ⚡${p.power}</small><button class="btn sm blue" data-visit="${p.id}" title="Посетить остров и сравнить драконов">🏝️ В гости</button><button class="btn sm red" data-ch="${p.id}" ${p.online&&team.length?"":"disabled"}>⚔️ Вызвать</button><button class="btn sm" data-rm="${p.id}">🗑</button></div>`).join("")||`<small>${on?"Добавь друзей по коду — и вызывай их на PvP-бой.":"Нет связи с сервером."}</small>`}<p><small>Друг показан «не в сети», пока он не <b>вошёл в аккаунт</b> в игре (индикатор в шапке должен быть 🟢).</small></p>${``}</div></div>`;
  const lo=$("#alogout",root);if(lo)lo.onclick=()=>{if(confirm("Выйти из аккаунта?"))logout()};const li=$("#alogin",root);if(li)li.onclick=()=>{NET.wantAuth=true;sessionStorage.removeItem("dml_offline");showAuth("login")};
  $("#pname",root).onchange=e=>{S.profile.name=e.target.value.trim()||"Хранитель";save();updateTop();netSend({t:"profile",name:S.profile.name,avatar:S.profile.avatar,power:team.reduce((a,id)=>a+power(id),0),team})};
  $$("[data-av]",root).forEach(a=>a.onclick=()=>{S.profile.avatar=a.dataset.av;save();updateTop();if(NET.me)NET.me.avatar=S.profile.avatar;netSend({t:"profile",name:S.profile.name,avatar:S.profile.avatar,power:team.reduce((a,id)=>a+power(id),0),team});$$("[data-av]",root).forEach(x=>x.classList.toggle("sel",x.dataset.av===S.profile.avatar));if($("#scr-pvp").classList.contains("active"))renderPvp();else renderFriends()});
  $("#fadd",root).onclick=()=>{const c=$("#fcode",root).value.trim();if(c.length<4)return;netSend({t:"friend_add",code:c});$("#fcode",root).value=""};
  $$("[data-acc]",root).forEach(b=>b.onclick=()=>netSend({t:"friend_accept",id:b.dataset.acc}));$$("[data-dec]",root).forEach(b=>b.onclick=()=>netSend({t:"friend_decline",id:b.dataset.dec}));
  $$("[data-rm]",root).forEach(b=>b.onclick=()=>{if(confirm("Удалить из друзей?"))netSend({t:"friend_remove",id:b.dataset.rm})});
  $$("[data-visit]",root).forEach(b=>b.onclick=()=>{netSend({t:"visit",id:b.dataset.visit});modal(`<h2>🏝️ Летим в гости…</h2><p>Загружаем остров друга.</p>`)});
  $$("[data-ch]",root).forEach(b=>b.onclick=()=>{netSend({t:"profile",name:S.profile.name,avatar:S.profile.avatar,power:team.reduce((a,id)=>a+power(id),0),team});netSend({t:"challenge",to:b.dataset.ch})})}

/* ================= АДМИН-ПАНЕЛЬ ================= */
function addAdminButton(){if($("#adminbtn"))return;const b=document.createElement("button");b.id="adminbtn";b.className="btn sm";b.textContent="🛠";b.title="Админ-панель";b.onclick=()=>{netSend({t:"admin_list"});modal(`<h2>🛠 Админ-панель</h2><p>Загрузка…</p>`)};$("#topbar").append(b)}
const ADM={tab:"players",q:"",sort:"last",data:null};
function admAge(t){if(!t)return "—";const d=Date.now()-t;if(d<6e4)return "только что";if(d<36e5)return Math.floor(d/6e4)+" мин";if(d<864e5)return Math.floor(d/36e5)+" ч";return Math.floor(d/864e5)+" дн"}
function renderAdmin(m){ADM.data=m;const st=m.stats||{players:m.players.length,online:m.online};const cfg=m.settings||{};
  let pl=m.players.filter(p=>!ADM.q||(p.name||"").toLowerCase().includes(ADM.q)||(p.id||"").includes(ADM.q));
  const srt={last:(a,b)=>(b.last||0)-(a.last||0),level:(a,b)=>(b.level||0)-(a.level||0),gold:(a,b)=>(b.gold||0)-(a.gold||0),rating:(a,b)=>(b.rating||0)-(a.rating||0),flags:(a,b)=>(b.flags||0)-(a.flags||0),name:(a,b)=>(a.name||"").localeCompare(b.name||""),created:(a,b)=>(b.created||0)-(a.created||0)}[ADM.sort];
  if(ADM.tab==="flagged")pl=pl.filter(p=>p.flags||p.banned);if(ADM.tab==="online")pl=pl.filter(p=>p.online);
  pl.sort(srt);
  const rows=pl.map(p=>`<tr class="${p.banned?"adm-ban":""}"><td><img src="assets/av/${p.avatar}.jpg" class="av" style="width:24px;height:24px"> <b>${p.name}</b>${p.admin?" 👑":""}${p.banned?" 🚫":""}${p.muted?" 🔇":""}${p.note?` <span title="${p.note.replace(/"/g,"'")}">📝</span>`:""}<br><small style="opacity:.6">${p.id} · рег. ${p.created?new Date(p.created).toLocaleDateString("ru"):"—"}</small></td><td>${p.online?"🟢":"⚪ "+admAge(p.last)}</td><td>ур.${p.level||"-"}<br><small>🐲${p.dragons||0}</small></td><td>🪙${fmt(p.gold||0)}<br>💎${p.gems||0}</td><td>${p.rating}<br><small>${p.wins||0}W/${p.losses||0}L</small></td><td title="${p.lastFlag?p.lastFlag.why+" ("+admAge(p.lastFlag.t)+" назад)":""}">${p.flags?"⚠️"+p.flags:"—"}</td>
   <td class="adm-act"><button class="btn sm" data-a="give" data-id="${p.id}" title="Выдать ресурсы">🎁</button><button class="btn sm" data-a="setres" data-id="${p.id}" title="Установить ресурсы/уровень">✏️</button><button class="btn sm" data-a="dragon" data-id="${p.id}" title="Выдать/забрать дракона">🐲</button><button class="btn sm" data-a="msg" data-id="${p.id}" title="Личное сообщение">✉️</button><button class="btn sm purple" data-a="pvp" data-id="${p.id}" title="PvP с этим игроком (он должен быть онлайн)" ${p.online?"":"disabled"}>⚔️</button><button class="btn sm" data-a="more" data-id="${p.id}" title="Ещё">⋯</button><button class="btn sm ${p.banned?"green":"red"}" data-a="ban" data-id="${p.id}">${p.banned?"разбан":"бан"}</button></td></tr>`).join("");
  const tab=(id,l)=>`<button class="btn sm ${ADM.tab===id?"green":""}" data-tab="${id}">${l}</button>`;
  let body="";
  if(["players","online","flagged"].includes(ADM.tab)){body=`<div class="row" style="align-items:center;gap:6px;flex-wrap:wrap"><input id="adm_q" placeholder="🔍 поиск по имени / id" value="${ADM.q}" style="flex:1;min-width:140px"><select id="adm_sort"><option value="last">по активности</option><option value="created">по дате регистрации</option><option value="level">по уровню</option><option value="gold">по золоту</option><option value="rating">по рейтингу</option><option value="flags">по флагам</option><option value="name">по имени</option></select><span class="badge">${pl.length}</span></div>
    <div class="adm-wrap"><table class="adm"><tr><th>Игрок</th><th>Сеть</th><th>Ур.</th><th>Ресурсы</th><th>Рейт.</th><th>⚠️</th><th>Действия</th></tr>${rows||"<tr><td colspan=7>Пусто</td></tr>"}</table></div>
    <small>🎁 выдать · ✏️ установить точные значения · 🐲 драконы · ✉️ сообщение · ⋯ ещё (переименовать, пароль, рейтинг, заметка, мут, кик, сброс, сохранение, админ, удалить)</small>`}
  if(ADM.tab==="global"){body=`<div class="adm-grid">
    <div class="panel sub"><h3>📢 Рассылка</h3><textarea id="adm_bc" rows="3" placeholder="Текст всем игрокам онлайн"></textarea><button class="btn sm" id="adm_broadcast">Отправить всем</button></div>
    <div class="panel sub"><h3>📌 Сообщение дня</h3><input id="adm_motd" value="${(cfg.motd||"").replace(/"/g,"&quot;")}" placeholder="Показывается при входе"><button class="btn sm" id="adm_motd_save">Сохранить</button></div>
    <div class="panel sub"><h3>🎁 Подарок всем</h3><div class="row"><input id="ga_gold" type="number" placeholder="🪙 золото" style="width:100px"><input id="ga_gems" type="number" placeholder="💎" style="width:70px"><input id="ga_scr" type="number" placeholder="📜" style="width:70px"></div><button class="btn sm green" id="adm_giveall">Выдать всем</button></div>
    <div class="panel sub"><h3>⚡ Множители событий</h3><div class="row">🪙×<input id="m_gold" type="number" step="0.1" value="${cfg.goldMult||1}" style="width:60px"> 💎×<input id="m_gems" type="number" step="0.1" value="${cfg.gemsMult||1}" style="width:60px"> ⭐×<input id="m_xp" type="number" step="0.1" value="${cfg.xpMult||1}" style="width:60px"></div><button class="btn sm" id="adm_mult">Применить</button><br><small>Действуют на доход построек, награды боёв и опыт (0.1–10).</small></div>
    <div class="panel sub"><h3>⚙️ Режим техработ</h3><p>Сейчас: <b>${cfg.maint?"🔴 ВКЛЮЧЁН — вход только админам":"🟢 выключен"}</b></p><button class="btn sm ${cfg.maint?"green":"red"}" id="adm_maint">${cfg.maint?"Выключить":"Включить"}</button> <button class="btn sm" id="adm_kickall">⏏ Отключить всех</button></div>
    <div class="panel sub"><h3>🧹 Обслуживание</h3><button class="btn sm" id="adm_clearflags">Сбросить все флаги</button> <button class="btn sm" id="adm_dl">⬇ Скачать db.json</button></div>
  </div>`}
  if(ADM.tab==="stats"){const p=m.players;const sum=k=>p.reduce((a,x)=>a+(x[k]||0),0);const top=(k,l)=>[...p].sort((a,b)=>(b[k]||0)-(a[k]||0)).slice(0,5).map(x=>`<li>${x.name} — ${l(x)}</li>`).join("");
    body=`<div class="adm-grid"><div class="panel sub"><h3>📊 Сервер</h3><p>Игроков: <b>${st.players}</b> · онлайн: <b>${st.online}</b> · активны за сутки: <b>${st.today||0}</b></p><p>В очереди арены: ${st.queue||0} · боёв идёт: ${st.rooms||0}</p><p>Забанено: ${st.banned||0} · с флагами: ${st.flagged||0}</p><p>Аптайм: ${Math.floor((st.uptime||0)/3600)}ч ${Math.floor(((st.uptime||0)%3600)/60)}м · память: ${st.mem||0} МБ</p></div>
    <div class="panel sub"><h3>💰 Экономика</h3><p>Всего золота: ${fmt(sum("gold"))} · алмазов: ${fmt(sum("gems"))}</p><p>Средний уровень: ${(sum("level")/Math.max(1,p.length)).toFixed(1)} · всего драконов: ${sum("dragons")}</p></div>
    <div class="panel sub"><h3>🏆 Топ по рейтингу</h3><ol>${top("rating",x=>x.rating)}</ol></div><div class="panel sub"><h3>⭐ Топ по уровню</h3><ol>${top("level",x=>"ур."+(x.level||0))}</ol></div><div class="panel sub"><h3>🪙 Топ по золоту</h3><ol>${top("gold",x=>fmt(x.gold||0))}</ol></div><div class="panel sub"><h3>⚠️ Подозрительные</h3><ol>${top("flags",x=>(x.flags||0)+" флаг.")}</ol></div></div>`}
  if(ADM.tab==="log"){body=`<div class="row"><button class="btn sm red" id="adm_clearlog">Очистить журнал</button></div><div class="adm-wrap"><table class="adm"><tr><th>Когда</th><th>Кто</th><th>Что</th></tr>${(m.log||[]).map(l=>`<tr><td>${new Date(l.t).toLocaleString("ru")}</td><td>${l.who}</td><td>${l.what}</td></tr>`).join("")||"<tr><td colspan=3>Журнал пуст</td></tr>"}</table></div>`}
  const box=modal(`<h2>🛠 Админ-панель <span class="badge gold">игроков ${st.players} · онлайн ${st.online}</span> <button class="btn sm" id="adm_refresh">🔄</button></h2>
  <div class="row adm-tabs">${tab("players","👥 Игроки")}${tab("online","🟢 Онлайн")}${tab("flagged","⚠️ Подозрительные")}${tab("global","🌍 Сервер")}${tab("stats","📊 Статистика")}${tab("log","📜 Журнал")}</div>${body}`);
  box.classList.add("wide");
  const rr=()=>renderAdmin(ADM.data);
  $("#adm_refresh").onclick=()=>netSend({t:"admin_list"});
  $$("[data-tab]",box).forEach(b=>b.onclick=()=>{ADM.tab=b.dataset.tab;rr()});
  const q=$("#adm_q");if(q){q.oninput=()=>{ADM.q=q.value.toLowerCase();const pos=q.selectionStart;rr();const nq=$("#adm_q");nq.focus();nq.setSelectionRange(pos,pos)}}
  const so=$("#adm_sort");if(so){so.value=ADM.sort;so.onchange=()=>{ADM.sort=so.value;rr()}}
  const on=(id,f)=>{const e=$("#"+id);if(e)e.onclick=f};
  on("adm_broadcast",()=>{const t=$("#adm_bc").value.trim();if(t)netSend({t:"admin_broadcast",msg:t})});
  on("adm_motd_save",()=>netSend({t:"admin_settings",settings:{motd:$("#adm_motd").value}}));
  on("adm_giveall",()=>{const gold=+$("#ga_gold").value||0,gems=+$("#ga_gems").value||0,scrolls=+$("#ga_scr").value||0;if(confirm(`Выдать ВСЕМ игрокам 🪙${gold} 💎${gems} 📜${scrolls}?`))netSend({t:"admin_giveall",gold,gems,scrolls})});
  on("adm_mult",()=>netSend({t:"admin_settings",settings:{goldMult:+$("#m_gold").value||1,gemsMult:+$("#m_gems").value||1,xpMult:+$("#m_xp").value||1}}));
  on("adm_maint",()=>{if(confirm(cfg.maint?"Выключить техработы?":"Включить техработы? Новые входы будут запрещены (кроме админов)."))netSend({t:"admin_settings",settings:{maint:!cfg.maint}})});
  on("adm_kickall",()=>{if(confirm("Отключить всех игроков?"))netSend({t:"admin_kickall"})});
  on("adm_clearflags",()=>{if(confirm("Сбросить флаги у всех?"))netSend({t:"admin_clearflags"})});
  on("adm_clearlog",()=>{if(confirm("Очистить журнал?"))netSend({t:"admin_clearlog"})});
  on("adm_dl",()=>{const a=document.createElement("a");a.href="data:application/json;charset=utf-8,"+encodeURIComponent(JSON.stringify(m.raw||m.players,null,1));a.download="db_export.json";a.click()});
  $$("[data-a]",box).forEach(b=>b.onclick=()=>{const a=b.dataset.a,id=b.dataset.id,p=m.players.find(x=>x.id===id)||{};
    if(a==="give"){const gold=+prompt("Золото:",0)||0,gems=+prompt("Алмазы:",0)||0,scrolls=+prompt("Свитки:",0)||0;netSend({t:"admin_give",id,gold,gems,scrolls});return}
    if(a==="setres"){const gold=prompt("Золото (пусто — не менять):",p.gold||0),gems=prompt("Алмазы:",p.gems||0),level=prompt("Уровень (1–60):",p.level||1),food=prompt("Еда (пусто — не менять):","");const o={t:"admin_setres",id};if(gold!==null&&gold!=="")o.gold=+gold;if(gems!==null&&gems!=="")o.gems=+gems;if(level!==null&&level!=="")o.level=+level;if(food!==null&&food!=="")o.food=+food;netSend(o);return}
    if(a==="dragon"){renderAdminDragon(p);return}
    if(a==="msg"){const t=prompt("Сообщение игроку "+p.name+":");if(t)netSend({t:"admin_msg",id,msg:t});return}
    if(a==="more"){renderAdminMore(p);return}
    if(a==="pvp"){if(!team.length){toast("Сначала собери команду в Арене");return}netSend({t:"profile",name:S.profile.name,avatar:S.profile.avatar,power:team.reduce((a,id)=>a+power(id),0),team});closeModal();netSend({t:"admin_pvp",id:p.id});toast("⚔️ Запускаю PvP с "+p.name);return}
    netSend({t:"admin_"+a,id})})}
function renderAdminMore(p){const box=modal(`<h2>⋯ ${p.name} <small style="opacity:.6">${p.id}</small></h2>
  <p>Ур.${p.level||"-"} · 🪙${fmt(p.gold||0)} 💎${p.gems||0} · рейтинг ${p.rating} (${p.wins||0}W/${p.losses||0}L) · флаги ${p.flags||0}${p.lastFlag?` — последний: «${p.lastFlag.why}»`:""}</p>
  <p>📝 Заметка: <i>${p.note||"нет"}</i></p>
  <div class="adm-more">
   <button class="btn sm" data-x="rename">✏️ Переименовать</button><button class="btn sm" data-x="password">🔑 Сменить пароль</button><button class="btn sm" data-x="rating">🏆 Рейтинг</button><button class="btn sm" data-x="note">📝 Заметка</button>
   <button class="btn sm" data-x="mute">${p.muted?"🔊 Размьютить":"🔇 Заглушить"}</button><button class="btn sm" data-x="flags">🧹 Снять флаги</button><button class="btn sm" data-x="kick">⏏ Кикнуть</button><button class="btn sm" data-x="getsave">💾 Сохранение (JSON)</button>
   ${p.admin&&p.id!==NET.me.id?"":`<button class="btn sm purple" data-x="admin">${p.admin?"👑 Снять админа":"👑 Сделать админом"}</button>`}<button class="btn sm red" data-x="reset">♻️ Сбросить прогресс</button><button class="btn sm red" data-x="delete">🗑 Удалить аккаунт</button>
  </div><div class="row"><button class="btn sm" id="adm_back">← Назад</button></div>`);
  $("#adm_back").onclick=()=>renderAdmin(ADM.data);
  $$("[data-x]",box).forEach(b=>b.onclick=()=>{const x=b.dataset.x,id=p.id;
    if(x==="rename"){const name=prompt("Новое имя:",p.name);if(name)netSend({t:"admin_rename",id,name});return}
    if(x==="password"){const pass=prompt("Новый пароль (мин. 4):");if(pass)netSend({t:"admin_password",id,pass});return}
    if(x==="rating"){const r=prompt("Рейтинг:",p.rating);if(r===null)return;netSend({t:"admin_rating",id,rating:+r,resetWL:confirm("Обнулить также победы/поражения?")});return}
    if(x==="note"){const note=prompt("Заметка (видна только админам):",p.note||"");if(note!==null)netSend({t:"admin_note",id,note});return}
    if(x==="delete"&&!confirm("Удалить аккаунт безвозвратно?"))return;if(x==="reset"&&!confirm("Сбросить прогресс игрока?"))return;
    netSend({t:"admin_"+x,id})})}
function renderAdminDragon(p){const opts=DRAGONS.map(d=>`<option value="${d.id}">${d.id} — ${d.name} (${d.rarity})${d.boss?" 👹 БОСС":d.eventOnly?" 🎪 событие":""}</option>`).join("");
  const box=modal(`<h2>🐲 Драконы игрока ${p.name}</h2><p>У игрока драконов: ${p.dragons||0}</p>
  <div class="row"><select id="ad_id" style="flex:1">${opts}</select><input id="ad_lvl" type="number" min="1" max="50" value="1" style="width:70px" title="уровень"></div>
  <div class="row"><button class="btn sm green" id="ad_give">Выдать / установить уровень</button><button class="btn sm red" id="ad_rm">Забрать</button><button class="btn sm" id="ad_back">← Назад</button></div><small>Г.Б.Т. (d109) — только босс, выдать нельзя.</small>`);
  $("#ad_back").onclick=()=>renderAdmin(ADM.data);
  $("#ad_give").onclick=()=>netSend({t:"admin_dragon",id:p.id,dragon:$("#ad_id").value,lvl:+$("#ad_lvl").value||1});
  $("#ad_rm").onclick=()=>{if(confirm("Забрать дракона?"))netSend({t:"admin_dragon",id:p.id,dragon:$("#ad_id").value,remove:true})}}
function renderAdminSave(m){const box=modal(`<h2>💾 Сохранение: ${m.name}</h2><textarea id="as_txt" rows="14" style="width:100%;font-family:monospace;font-size:11px">${m.save?JSON.stringify(JSON.parse(m.save),null,1).replace(/</g,"&lt;"):""}</textarea>
  <div class="row"><button class="btn sm green" id="as_save">Записать игроку</button><button class="btn sm" id="as_dl">⬇ Скачать</button><button class="btn sm" id="as_back">← Назад</button></div><small>Осторожно: некорректный JSON может сломать прогресс игрока.</small>`);box.classList.add("wide");
  $("#as_back").onclick=()=>renderAdmin(ADM.data);
  $("#as_dl").onclick=()=>{const a=document.createElement("a");a.href="data:application/json;charset=utf-8,"+encodeURIComponent($("#as_txt").value);a.download=m.name+"_save.json";a.click()};
  $("#as_save").onclick=()=>{try{JSON.parse($("#as_txt").value)}catch(e){toast("⚠️ Некорректный JSON");return}if(confirm("Заменить сохранение игрока?"))netSend({t:"admin_setsave",id:m.id,data:$("#as_txt").value})}}


/* ================= ВИЗИТ К ДРУГУ ================= */
const VISIT={st:null,cur:0,tab:"island"};
function renderVisit(m){if(!m.save){modal(`<h2>🏝️ ${m.name}</h2><p>У друга ещё нет облачного сохранения (он играет офлайн или не заходил в аккаунт).</p><div class="row"><button class="btn" onclick="closeModal()">Ок</button></div>`);return}
  let st;try{st=JSON.parse(m.save)}catch(e){toast("⚠️ Не удалось загрузить остров");return}
  st.islands=st.islands||[];st.dragons=st.dragons||{};st.cur=0;VISIT.st=st;VISIT.cur=0;VISIT.tab="island";VISIT.name=m.name;VISIT.avatar=m.avatar;VISIT.rating=m.rating;drawVisit()}
function drawVisit(){const st=VISIT.st;const real=S;
  const tab=(id,l)=>`<button class="btn sm ${VISIT.tab===id?"green":""}" data-vt="${id}">${l}</button>`;
  let body="";
  if(VISIT.tab==="island"){
    // временно подменяем S, чтобы переиспользовать отрисовку клеток (только чтение)
    S=Object.assign({},st,{cur:VISIT.cur});installTilesGetter(S);
    try{const isl=st.islands[VISIT.cur];const def=ISLANDS.find(x=>x.id===isl.id)||ISLANDS[0];const TW=92,TH=46,IW=isl.w,IH=isl.h,W=(IW+IH)*TW/2,H=(IW+IH)*TH/2;let tiles="";
      for(let y=0;y<IH;y++)for(let x=0;x<IW;x++){const i=y*IW+x;tiles+=tileHtml(isl.tiles[i],i,(x-y)*TW/2+W/2-TW/2,(x+y)*TH/2,x+y)}
      body=`<div class="isl-tabs">${st.islands.map((x,k)=>{const d=ISLANDS.find(q=>q.id===x.id)||ISLANDS[0];return `<button class="${k===VISIT.cur?"active":""}" data-vi="${k}">🏝️ ${d.name}</button>`}).join("")}</div>
      <div class="visit-scroll"><div class="iso" style="width:${W}px;height:${H+120}px;transform:scale(${Math.min(1,(Math.min(window.innerWidth*.9,1050)-40)/(W+60))});transform-origin:top center"><div class="iso-base" style="width:${W+60}px;height:${H+60}px;left:-30px;top:-10px;background:radial-gradient(ellipse at 50% 40%,${def.theme},${def.theme} 60%,#2c5a22)"></div>${tiles}</div></div><small>Остров только для просмотра. Наведи на здание — увидишь название.</small>`}
    finally{S=real}
  }
  if(VISIT.tab==="compare"){
    const mine=Object.keys(real.dragons),his=Object.keys(st.dragons);const both=mine.filter(id=>st.dragons[id]),onlyHis=his.filter(id=>!real.dragons[id]),onlyMine=mine.filter(id=>!st.dragons[id]);
    const pw=(id,o)=>{try{return power(id,Object.assign({lvl:1,stars:1},o))}catch(e){return 0}};
    const sum=(ids,src)=>ids.reduce((a,id)=>a+pw(id,src[id]),0);
    const myTop=[...mine].sort((a,b)=>pw(b,real.dragons[b])-pw(a,real.dragons[a])).slice(0,3),hisTop=[...his].sort((a,b)=>pw(b,st.dragons[b])-pw(a,st.dragons[a])).slice(0,3);
    const card=(id,o)=>{const d=dInfo(id);if(!d)return"";const oo=Object.assign({lvl:1,stars:1},o);return `<div class="vcard"><img src="assets/${id}.png"><b>${d.name}</b><small>ур.${oo.lvl} ${"⭐".repeat(oo.stars||1)} · ⚡${pw(id,o)}</small></div>`};
    const cmp=(a,b)=>a>b?"<span style='color:#1a8a1a'>▲</span>":a<b?"<span style='color:#c02020'>▼</span>":"=";
    const row=id=>{const d=dInfo(id);if(!d)return"";const a=Object.assign({lvl:1,stars:1},real.dragons[id]),b=Object.assign({lvl:1,stars:1},st.dragons[id]);const pa=pw(id,real.dragons[id]),pb=pw(id,st.dragons[id]);return `<tr><td><img src="assets/${id}.png" class="av" style="width:28px;height:28px;border-radius:6px"> ${d.name}</td><td>ур.${a.lvl} ${"⭐".repeat(a.stars||1)}<br>⚡${pa}</td><td style="font-size:1.2rem;text-align:center">${cmp(pa,pb)}</td><td>ур.${b.lvl} ${"⭐".repeat(b.stars||1)}<br>⚡${pb}</td></tr>`};
    body=`<div class="vsum"><div class="panel sub"><h3>Ты</h3><p>🐲 ${mine.length} драконов · ⚡ ${fmt(sum(mine,real.dragons))} общая сила<br>⭐ уровень ${real.level} · 🏆 ${NET.me?NET.me.rating:"—"}</p><div class="vcards">${myTop.map(id=>card(id,real.dragons[id])).join("")}</div></div>
      <div class="panel sub"><h3>${VISIT.name}</h3><p>🐲 ${his.length} драконов · ⚡ ${fmt(sum(his,st.dragons))} общая сила<br>⭐ уровень ${st.level||1} · 🏆 ${VISIT.rating||"—"}</p><div class="vcards">${hisTop.map(id=>card(id,st.dragons[id])).join("")}</div></div></div>
      <h3>Общие драконы (${both.length})</h3><div class="adm-wrap" style="max-height:32vh"><table class="adm"><tr><th>Дракон</th><th>Ты</th><th></th><th>${VISIT.name}</th></tr>${both.map(row).join("")||"<tr><td colspan=4>Общих драконов пока нет</td></tr>"}</table></div>
      <h3>Есть только у ${VISIT.name} (${onlyHis.length})</h3><div class="picker">${onlyHis.map(id=>dInfo(id)?`<img src="assets/${id}.png" title="${dInfo(id).name} ур.${(st.dragons[id]||{}).lvl||1}">`:"").join("")||"<i>—</i>"}</div>
      <h3>Есть только у тебя (${onlyMine.length})</h3><div class="picker">${onlyMine.map(id=>dInfo(id)?`<img src="assets/${id}.png" title="${dInfo(id).name}">`:"").join("")||"<i>—</i>"}</div>`}
  const box=modal(`<h2><img src="assets/av/${VISIT.avatar||"av0"}.jpg" class="av" style="width:32px;height:32px;vertical-align:middle"> В гостях у ${VISIT.name} <span class="badge">ур.${st.level||1} · 🪙${fmt(st.gold||0)}</span></h2>
    <div class="row">${tab("island","🏝️ Остров")}${tab("compare","⚖️ Сравнить драконов")}</div>${body}`);box.classList.add("wide");
  $$("[data-vt]",box).forEach(b=>b.onclick=()=>{VISIT.tab=b.dataset.vt;drawVisit()});
  $$("[data-vi]",box).forEach(b=>b.onclick=()=>{VISIT.cur=+b.dataset.vi;drawVisit()});
  $$(".itile",box).forEach(el=>{el.onclick=null;el.style.cursor="default"})}

/* ================= ФОНОВАЯ ВКЛАДКА: не останавливать игру ================= */
// Браузеры замедляют setTimeout в фоне до 1 раза/сек, а WebAudio продолжает работать. Держим «тикер» через Web Worker, который не троттлится.
const TICKER=(()=>{try{const b=new Blob(["setInterval(()=>postMessage(1),1000)"],{type:"text/javascript"});const w=new Worker(URL.createObjectURL(b));return w}catch(e){return null}})();
if(TICKER)TICKER.onmessage=()=>{if(document.hidden){/* в фоне: обновляем PvP-таймеры и фермы, чтобы при возврате всё было актуально */if(B&&B.pvp&&B.turnTimer){} }};
document.addEventListener("visibilitychange",()=>{if(!document.hidden){if(NET.status!=="online")netConnect();if($("#boot")||$("#b_login"))return;if(MUSIC.ctx&&MUSIC.ctx.state==="suspended")MUSIC.ctx.resume();if(!B)show($("#navbar button.active")?.dataset.scr||"map")}});

/* ================= СТАРТ ================= */
S=newState();SAVE_MODE="local"; // временное состояние на время загрузки; реальное выбирается на экране входа
updateTop();NET.booting=true;netConnect();showBoot();
const _chip=document.createElement("button");_chip.id="netchip";_chip.className="netchip";_chip.onclick=()=>{if(NET.status!=="online"){toast("⏳ Пробуем подключиться…");netConnect();return}if(!NET.me){NET.wantAuth=true;sessionStorage.removeItem("dml_offline");showAuth("login")}else show("friends")};$("#topbar").append(_chip);refreshNetUI();
const _fs=document.createElement("button");_fs.id="fsbtn";_fs.className="btn sm";_fs.textContent="⛶";_fs.title="Полный экран (F11 / F)";_fs.onclick=toggleFullscreen;$("#topbar").append(_fs);
document.addEventListener("keydown",e=>{if(e.code==="KeyF"&&!e.target.matches("input,textarea")&&!B)toggleFullscreen()});
const _mb=document.createElement("button");_mb.id="musbtn";_mb.className="btn sm";_mb.textContent=S.music?"🔊":"🔇";_mb.title="Музыка";_mb.onclick=toggleMusic;const _vs=document.createElement("input");_vs.type="range";_vs.min=0;_vs.max=100;_vs.value=Math.round((S.vol==null?1:S.vol)*100);_vs.id="volslider";_vs.title="Громкость";_vs.oninput=()=>setVolume(_vs.value/100);$("#topbar").append(_vs);$("#topbar").append(_mb);
const _av=document.createElement("img");_av.id="avatar";_av.className="av";_av.onclick=()=>show("friends");$("#topbar").prepend(_av);updateTop();
// приветствие
if(!S.quests.intro){S.quests.intro=1;save();modal(`<h2>🐉 Добро пожаловать, Хранитель!</h2><p>Это твой остров. Строй жилища, собирай драконов, корми их и сражайся на арене в пошаговых боях.</p><ul style="margin:8px 0 8px 18px;font-size:13px"><li>🗺️ <b>Остров</b> — постройки и доход</li><li>🐲 <b>Драконы</b> — прокачка и эволюция</li><li>⚔️ <b>Арена</b> — пошаговые бои 3×3</li><li>🏆 <b>События</b> — дракон месяца и недели</li><li>🏪 <b>Магазин</b> — яйца и драконы</li><li>⭐ Нажми на <b>уровень</b> вверху — увидишь дорогу наград</li></ul><div class="center"><img src="assets/d00.png" style="height:120px"></div><div class="row" style="justify-content:center"><button class="btn green" onclick="closeModal()">Начать!</button></div>`)}
