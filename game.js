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
function save(){localStorage.setItem(SAVE_KEY,JSON.stringify(S))}
function load(){try{const j=localStorage.getItem(SAVE_KEY);if(j){S=JSON.parse(j);migrate();return}}catch(e){}S=newState()}
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
  $("#r-level").textContent=S.level;const sc=$("#r-scroll");if(sc)sc.textContent=S.scrolls||0;const sp=$("#r-sp");if(sp)sp.textContent=S.sp||0;$("#r-xp").style.width=(S.xp/xpNeed(S.level)*100)+"%";
}
function xpNeed(l){return l<XP_TABLE.length?XP_TABLE[l]:Math.round(120*Math.pow(l,1.7))}
function addXP(n){S.xp+=n;while(S.xp>=xpNeed(S.level)){S.xp-=xpNeed(S.level);S.level++;S.gems+=5;S.gold+=500*S.level;S.scrolls=(S.scrolls||0)+3;const unl=[...ISLANDS.filter(i=>i.req===S.level).map(i=>"🏝️ "+i.name),...Object.entries(BUILDINGS).filter(([k,b])=>b.req===S.level).map(([k,b])=>b.ico+" "+b.name),...DRAGONS.filter(dr=>DRAGON_REQ[dr.id]===S.level&&!isSpecial(dr.id)).map(dr=>"🐲 "+dr.name)];modal(`<h2>⭐ Уровень ${S.level}!</h2><p class="center">+5 💎, +🪙${500*S.level}, +📜3</p>${unl.length?`<p><b>Открыто:</b></p><ul style="margin-left:18px">${unl.map(u=>`<li>${u}</li>`).join("")}</ul>`:""}<div class="row" style="justify-content:center"><button class="btn green" onclick="closeModal()">Ура!</button><button class="btn blue" onclick="showRoad()">🛣️ Дорога наград</button></div>`)}updateTop()}
function canPay(cost){return (!cost.gold||S.gold>=cost.gold)&&(!cost.gems||S.gems>=cost.gems)&&(!cost.food||S.food>=cost.food)}
function pay(cost){S.gold-=cost.gold||0;S.gems-=cost.gems||0;S.food-=cost.food||0;updateTop()}
function costStr(c){return [c.gold&&`🪙${fmt(c.gold)}`,c.food&&`🍖${fmt(c.food)}`,c.gems&&`💎${c.gems}`,c.scrolls&&`📜${c.scrolls}`].filter(Boolean).join(" ")}

/* ================= ДРАКОНЫ: СТАТЫ ================= */
function dragonStats(id, ov){
  const d=dInfo(id); const o=ov||S.dragons[id]||{lvl:1,stars:1};
  const m=RARITY[d.rarity].mult*(1+(o.lvl-1)*0.12)*(1+(o.stars-1)*0.25);
  const hpm=ov&&ov.enemy?1.6:2.4; // у врагов запас HP меньше — бои короче
  const tb=treeBonuses(id,o);const pk=k=>1+(tb[k]||0);
  return {hp:Math.round(d.base.hp*m*hpm*pk("hp")),atk:Math.round(d.base.atk*m*pk("atk")),def:Math.round(d.base.def*m*pk("def")),spd:Math.round(d.base.spd*(1+(o.lvl-1)*0.02)*(1+(o.stars-1)*0.1)*pk("spd")),crit:0.1+(tb.crit||0),timeb:tb.timing||0,lifesteal:tb.lifesteal||0,startshield:tb.startshield||0,dmg:tb.dmg||{}};
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
function feedCost(id){const o=S.dragons[id];return Math.round(15*Math.pow(1.22,o.lvl-1)*RARITY[dInfo(id).rarity].mult)}
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
  if(!B)playMusic(scr==="battle"?"select":scr==="pvp"?"select":scr==="campaign"?"campaign":"map");
}
$$("#navbar button").forEach(b=>b.onclick=()=>{if(B){toast("⚔️ Сначала закончи бой (или сдайся)");SFX.debuff();return}show(b.dataset.scr)});
document.addEventListener("click",e=>{if(e.target.closest&&e.target.closest("button:not(.skillbtn)"))SFX.click()},true);

/* ================= КАРТА ================= */
function habLvl(t){return t.lvl||1}
function habRate(t){const b=BUILDINGS[t.b];let r=0;t.dragons.forEach(id=>{const o=S.dragons[id];if(o)r+=GOLD_PER_MIN(b,o.lvl,RARITY[dInfo(id).rarity].mult)});return r}
function habStored(t){const b=BUILDINGS[t.b];if(!b||!b.el)return 0;return Math.min(HAB_STORE(b,habLvl(t)),Math.floor(habRate(t)*(Date.now()-t.last)/60000))}
function tileIncome(t){const b=BUILDINGS[t.b];if(!b)return null;
  if(b.el){return {gold:habStored(t)}}
  if(b.food)return {food:b.food};if(b.gems)return {gems:b.gems};return null}
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
  <div class="island-name">🏝️ ${def.name}</div>
  <div class="iso-scroll"><div class="iso" style="width:${W}px;height:${H+120}px"><div class="iso-base" style="width:${W+60}px;height:${H+60}px;left:-30px;top:-10px;background:radial-gradient(ellipse at 50% 40%,${def.theme},${def.theme} 60%,#2c5a22)"></div>${tiles}</div></div>
  ${moveFrom!==null?`<div class="map-hint" style="background:#c0506e">📦 Режим перемещения: выбери пустую клетку (или нажми на здание ещё раз для отмены)</div>`:""}<div class="row" style="justify-content:center"><button class="btn green" id="collectall">🪙 Собрать всё (${fmt(allTiles().reduce((a,t)=>a+habStored(t),0))})</button></div><div class="map-hint">Драконы в жилищах генерируют 🪙 каждую минуту (больше уровень и редкость — больше золота). Жилище накапливает золото до лимита — улучшай его, чтобы поднять лимит и число мест. Фермы дают 🍖 каждые 60 сек.</div></div>`;
  $$(".itile",root).forEach(el=>el.onclick=()=>tileClick(+el.dataset.i));
  $("#collectall",root).onclick=()=>{let g=0;allTiles().forEach(t=>{const v=habStored(t);if(v>0){g+=v;t.last=Date.now()}});if(!g){toast("Пока нечего собирать");return}S.gold+=g;addXP(Math.min(120,10+Math.ceil(g/20)));save();updateTop();renderMap();toast(`+🪙${fmt(g)}`)};
  $$("[data-isl]",root).forEach(b=>b.onclick=()=>{const df=ISLANDS[+b.dataset.isl];const ci=S.islands.findIndex(x=>x.id===df.id);
    if(ci>=0){S.cur=ci;moveFrom=null;save();renderMap();return}
    if(S.level<df.req){toast(`Остров откроется на уровне ${df.req}`);return}
    modal(`<h2>🏝️ ${df.name}</h2><p>Купить новый остров за <b>${costStr(df.cost)}</b>? Размер ${df.w}×${df.h}.</p><div class="row"><button class="btn green" id="ok" ${canPay(df.cost)?"":"disabled"}>Купить</button></div>`);
    $("#ok").onclick=()=>{pay(df.cost);S.islands.push(makeIsland(df));S.cur=S.islands.length-1;addXP(500);save();closeModal();renderMap();toast("🏝️ Новый остров открыт!")}});
  // авто-скролл к центру
  const sc=$(".iso-scroll",root);sc.scrollLeft=(sc.scrollWidth-sc.clientWidth)/2;
}
function tileHtml(t,i,left,top,z){
  const style=`left:${left}px;top:${top}px;z-index:${z}`;
  if(!t.unlocked)return `<div class="itile locked" data-i="${i}" style="${style}"><div class="rhomb"></div><span class="lock">🔒</span></div>`;
  if(!t.b)return `<div class="itile" data-i="${i}" style="${style}"><div class="rhomb"></div></div>`;
  const b=BUILDINGS[t.b];const inc=tileIncome(t);let ready=inc&&tileReady(t)&&(inc.gold>0||inc.food||inc.gems);const lib=b.special==="library"&&tileReady(t);
  const dr=t.dragons.map((id,k)=>`<img class="dr-mini walk ${dInfo(id).noflip?"noflip":""}" style="left:${14+k*30}px;animation-delay:-${(i*7+k*3)%6}s;animation-duration:${5+((i+k)%3)}s" src="assets/${id}.png">`).join("");
  const cnt=b.cap?`<span class="count">${t.dragons.length}/${HAB_CAP(b,habLvl(t))}${habLvl(t)>1?" ⬆"+habLvl(t):""}</span>`:"";
  const col=b.el?ELEMENTS[b.el].color:b.farm?"#d8b54a":"#8fd36a";
  return `<div class="itile built" data-i="${i}" title="${b.name}" style="${style}"><div class="rhomb" style="background:linear-gradient(135deg,#fff8,${col})"><div class="rside" style="background:${col}"></div></div><span class="bico">${b.ico}</span>${dr}${cnt}${ready?`<span class="ready">${inc.gold?"🪙":inc.food?"🍖":"💎"}</span>`:lib?`<span class="ready">📜</span>`:""}</div>`;
}
let moveFrom=null;
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
    const free=ownedIds().filter(id=>!allTiles().some(tt=>tt.dragons.includes(id))&&dInfo(id).els.includes(b.el));
    if(t.dragons.length<HAB_CAP(b,habLvl(t)))html+=`<p><b>Можно поселить:</b></p><div class="picker">${free.map(id=>`<img src="assets/${id}.png" title="${dInfo(id).name}" data-add="${id}">`).join("")||"<i>Нет свободных драконов этой стихии</i>"}</div>`;
  }else html+=`<p>Производит <b>${inc.food?"🍖"+inc.food:"💎"+inc.gems}</b> за сбор.</p>`;
  html+=`<div class="row"><button class="btn green" id="collect" ${(inc.gold||inc.food||inc.gems)?"":"disabled"}>${b.el?"Собрать 🪙"+inc.gold:ready?"Собрать":"Готово через "+left+" с"}</button><button class="btn blue" id="mv">📦 Переместить</button><button class="btn red" id="del">Снести</button>${b.el&&t.dragons.length?`<button class="btn purple" id="enter">🚪 Зайти в жилище</button>`:""}</div>`;
  const m=modal(html);
  $("#mv",m).onclick=()=>{moveFrom=i;closeModal();renderMap()};
  const en=$("#enter",m);if(en)en.onclick=()=>enterHabitat(i);
  $$("[data-add]",m).forEach(im=>im.onclick=()=>{const id=im.dataset.add;if(isHoused(id)){toast("Этот дракон уже поселён");closeModal();return}t.dragons.push(id);S.pending=(S.pending||[]).filter(x=>x!==id);save();closeModal();renderMap();toast("🐲 Дракон поселён!")});
  $$("[data-rm]",m).forEach(im=>im.onclick=()=>{t.dragons=t.dragons.filter(x=>x!==im.dataset.rm);save();closeModal();renderMap()});
  const hu=$("#hup",m);if(hu)hu.onclick=()=>{const g=habStored(t);S.gold+=g;pay(HAB_UP(habLvl(t)));t.lvl=habLvl(t)+1;t.last=Date.now();addXP(80);save();toast(`⬆ ${b.name} улучшено до ур.${t.lvl}`);closeModal();tileClick(i)};
  $("#collect",m).onclick=()=>{S.gold+=inc.gold||0;S.food+=inc.food||0;S.gems+=inc.gems||0;t.last=Date.now();addXP(b.el?Math.min(60,10+Math.floor((inc.gold||0)/20)):15);save();closeModal();renderMap();toast(`+${costStr(inc)}`)};
  $("#del",m).onclick=()=>{if(t.dragons.length){toast("Сначала выселите драконов");return}S.gold+=Math.floor((b.cost.gold||0)/2);t.b=null;save();closeModal();renderMap();updateTop()};
}
function enterHabitat(i){
  const t=S.tiles[i],b=BUILDINGS[t.b],col=ELEMENTS[b.el].color;
  const m=modal(`<h2>${b.ico} ${b.name}</h2><div class="hab-scene" style="background:linear-gradient(#bfe9ff,${col}aa 60%,${col})">
   <div class="hab-ground"></div><div class="hab-deco">${b.ico}</div>
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
  return `<div class="dr-card ${o?"":"locked"} ${o&&!isHoused(id)?"unhoused":""}" data-id="${id}">${o&&!isHoused(id)?'<span class="badge" style="position:absolute;bottom:4px;left:4px;z-index:2">⚠️ не поселён</span>':""}<span class="rar" style="background:${r.color}">${o||S.level>=DRAGON_REQ[id]?r.name:"🔒 ур."+DRAGON_REQ[id]}</span>${o?`<span class="lv">${o.lvl}</span>`:""}<img src="assets/${id}.png"><div class="nm">${d.name}</div><div class="els">${d.els.map(elIco).join("")}</div>${o?`<div class="stars">${"★".repeat(o.stars)}${"☆".repeat(5-o.stars)} · ⚡${power(id)}</div>`:""}${extra}</div>`}
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
  $("#dsearch",root).oninput=e=>{S._q=e.target.value;draw()};$$(".chip",root).forEach(b=>b.onclick=()=>{S._f=b.dataset.f;$$(".chip",root).forEach(x=>x.classList.toggle("on",x===b));draw()});draw();
}
function dragonDetail(id){
  const d=dInfo(id),o=S.dragons[id],r=RARITY[d.rarity];
  if(!o){modal(`<h2>${d.name} <span class="badge" style="background:${r.color}">${r.name}</span></h2><div class="dd-top"><img src="assets/${id}.png"><div><div class="desc">${d.desc}</div><div>${d.els.map(elIco).join("")}</div><p>Этот дракон ещё не в вашей коллекции.${S.level<DRAGON_REQ[d.id]?` <b>🔒 Нужен уровень ${DRAGON_REQ[d.id]}</b>`:""}</p><div class="row">${isSpecial(id)?`<span class="badge" style="background:#ff4fe6">${isEvent(id)?"🎪 Только в событии ("+(ZODIAC_IDS.includes(id)?"Испытание зодиаков":"Звонок MR 333")+")":isTyrant(id)?"💀 Только разведение: Божество+Божество ур."+TYRANT_BREED.minLvl:isDivine(id)?"🔱 Только разведение: Легенда+Легенда ур."+DIVINE_BREED.minLvl:"👑 Только разведение: оба родителя ур."+LEGEND_BREED.minLvl}</span>`:`${S.level<DRAGON_REQ[d.id]?`<button class="btn" disabled>🔒 Уровень ${DRAGON_REQ[d.id]}</button>`:`<button class="btn ${canPay(dragonPrice(d))?"green":""}" id="buy">Купить за ${costStr(dragonPrice(d))}</button>`}`}</div></div></div>`);
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
function feed(id,n){const o=S.dragons[id];let k=0;for(let i=0;i<n;i++){const c=feedCost(id);if(o.lvl>=maxLevel(o.stars)||S.food<c)break;S.food-=c;o.lvl++;k++;addXP(25)}
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
  <div class="panel"><h2>⚔️ Команда (до 3 драконов)</h2><div class="picker" id="pk">${own.map(id=>`<img src="assets/${id}.png" title="${dInfo(id).name} ур.${S.dragons[id].lvl}" data-id="${id}" class="${team.includes(id)?"sel":""}">`).join("")}</div><p style="margin-top:8px;font-size:13px">Сила команды: <b id="tp">${team.reduce((a,id)=>a+power(id),0)}</b></p>
  <div class="desc">Бой как в оригинале: очередь по скорости, выбираешь атаку и цель, затем <b>тайминг</b> — нажми, когда маркер в зелёной зоне (Идеально ×1.3, Хорошо ×1.0, Мимо ×0.8). При атаке врага нажми вовремя — <b>блок</b> до 50% урона. Стихии: сильная ×1.5, слабая ×0.5. 👑 Легенда сильна против всех базовых стихий и не имеет слабостей к ним, слаба лишь к 🔱 Божеству.</div></div>
  <div class="panel"><h2>🏟️ Подбор соперника <button class="btn sm blue" id="eltable" style="margin-left:auto">📊 Таблица стихий</button></h2>
  <small>Соперники подбираются под <b>твоих лучших драконов</b>: уровень и стихии врагов подстраиваются под сильнейшую тройку (даже если она сейчас не в команде), а комбинации стихий берутся с учётом того, против чего твои лучшие слабы — придётся думать над составом.</small>
  <div class="mm-grid">${["easy","normal","hard"].map(k=>{const o=matchmake(k);const p=o.ids.reduce((a,id)=>a+power(id,{lvl:o.lvl,stars:1+Math.floor(o.lvl/10)}),0);return `<div class="opp mm ${k}"><div>${o.ids.map(id=>`<img src="assets/${id}.png">`).join("")}</div><div style="flex:1;font-size:13px"><b>${o.name}</b><br><small>ур. ${o.lvl} · ⚡${p} · ${o.ids.map(id=>dInfo(id).els.map(elIco).join("")).join(" | ")}</small></div><button class="btn sm red" data-mm="${k}">В бой!</button></div>`}).join("")}</div>
  <div class="row"><button class="btn purple" id="rndfight">🔄 Другие соперники</button></div>
  <p style="font-size:12px;margin-top:6px">Побед: <b>${S.wins}</b> · Боёв: ${S.battles}. Сюжетные бои — в 📖 Кампании.</p></div></div>`;
  $$("[data-mm]",root).forEach(b=>b.onclick=()=>startBattle(matchmake(b.dataset.mm)));
  $$("#pk img",root).forEach(im=>im.onclick=()=>{const id=im.dataset.id;if(team.includes(id))team=team.filter(x=>x!==id);else if(team.length<3)team.push(id);else toast("Максимум 3 дракона");renderBattleMenu()});
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
function enemySkills(id,lvl){const d=dInfo(id);const b=baseSkills(id).filter((k,i)=>lvl>=SLOT_LEVEL[i]);if(lvl>=8)b.push(ELEMENT_SPREAD[d.els[0]]);if(lvl>=12)b.push(ELEMENT_ABILITY[d.els[0]]);return b}
function mkFighter(id,ov,side,i){const st=dragonStats(id,ov);const d=dInfo(id);return {id,side,i,name:d.name,els:d.els,skills:ov?enemySkills(id,ov.lvl):dSkills(id),hp:st.hp,maxhp:st.hp,atk:st.atk,def:st.def,spd:st.spd,cds:{},buffAtk:0,buffDef:0,debuff:0,crit:st.crit,timeb:st.timeb,lifesteal:st.lifesteal||0,dmgB:st.dmg||{},shield:Math.round(st.hp*(st.startshield||0)),fx:[],lvl:ov?ov.lvl:S.dragons[id].lvl}}
function startBattle(opp){
  if(team.length===0){toast("Выбери хотя бы одного дракона!");return}
  const ov={lvl:opp.lvl,stars:1+Math.floor(opp.lvl/10),enemy:true};
  show("battle");
  RNG=opp.seed?seededRng(opp.seed):Math.random;
  B={opp,allies:team.map((id,i)=>{const f=mkFighter(id,null,"ally",i);if(opp.carry&&opp.carry[id]){f.hp=Math.min(f.maxhp,opp.carry[id])}return f}),enemies:opp.ids.map((id,i)=>mkFighter(id,ov,"enemy",i)),log:[],round:0,queue:[],busy:false,sel:null,pvp:!!opp.pvp,turnNo:0};
  if(opp.pvp){B.enemies=opp.enemyFighters;B.allies.forEach(f=>{f.hp=f.maxhp})}
  playMusic(opp.music||(opp.pvp?"pvp":"battle"));
  S.battles++;nextTurn(true);
}
function alive(arr){return arr.filter(f=>f.hp>0)}
function elMult(skillEl,attacker,target){
  const e=skillEl||attacker.els[0];let m=1;
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
  if(!B.queue.length){B.round++;const src=B.pvp&&!B.opp.host?[...B.enemies,...B.allies]:[...B.allies,...B.enemies];src.forEach((f,i)=>{f._j=(RNG()-.5)*4;f._o=i});B.queue=alive(src).sort((a,b)=>(b.spd+b._j)-(a.spd+a._j)||a._o-b._o);
    // тик баффов/кд
    [...B.allies,...B.enemies].forEach(f=>{Object.keys(f.cds).forEach(k=>f.cds[k]=Math.max(0,f.cds[k]-1));if(f.buffAtk>0)f.buffAtkT--;if(f.buffAtkT<=0)f.buffAtk=0;if(f.buffDef>0)f.buffDefT--;if(f.buffDefT<=0)f.buffDef=0;if(f.debuff>0)f.debuffT--;if(f.debuffT<=0)f.debuff=0});
    log(`— Раунд ${B.round} —`)}
  B.cur=B.queue.shift();if(B.cur.hp<=0){nextTurn();return}
  // тик эффектов текущего бойца
  const f0=B.cur;let skip=false;
  f0.fx=(f0.fx||[]).filter(e=>{e.t--;
    if(e.k==="burn"){const dm=Math.max(1,Math.round(f0.maxhp*0.06));f0.hp=Math.max(0,f0.hp-dm);log(`🔥 ${f0.name} горит: -${dm}`)}
    if(e.k==="hot"){const h=Math.round(f0.maxhp*0.1);f0.hp=Math.min(f0.maxhp,f0.hp+h);log(`💚 ${f0.name} восстанавливает ${h}`)}
    if(e.k==="stun"||e.k==="freeze"){skip=true;log(`${e.k==="stun"?"💫":"🧊"} ${f0.name} пропускает ход!`)}
    return e.t>0});
  if(f0.hp<=0){renderBattle();setTimeout(nextTurn,500);return}
  if(skip){renderBattle();setTimeout(nextTurn,900);return}
  B.sel=null;B.turnNo++;$("#navbar").classList.add("locked");renderBattle();
  if(B.pvp){pvpTurnStart();return}
  if(B.cur.side==="enemy"){B.busy=true;setTimeout(aiTurn,900)}
}
function log(s){B.log.push(s);if(B.log.length>40)B.log.shift()}
function renderBattle(){
  const root=$("#scr-battle");const f=B.cur;
  const fh=(x)=>`<div class="fighter ${x.side} ${dInfo(x.id).noflip?"noflip":""} ${x.hp<=0?"dead":""} ${x===f?"active":""} pos${x.i}" data-side="${x.side}" data-i="${x.i}"><img src="assets/${x.id}.png"><div class="hpbar"><div class="${x.hp/x.maxhp<.3?"low":""}" style="width:${x.hp/x.maxhp*100}%"></div>${x.shield?`<div class="shieldbar" style="width:${Math.min(100,x.shield/x.maxhp*100)}%"></div>`:""}</div><div class="fn">${x.name} <small>ур.${x.lvl}</small></div><div>${x.els.map(elIco).join("")}</div>${x.buffAtk?"<small>⚔️↑</small>":""}${x.buffDef?"<small>🛡️↑</small>":""}${x.debuff?"<small>⚔️↓</small>":""}${x.shield?`<small>🔰${x.shield}</small>`:""}${(x.fx||[]).map(e=>({burn:"🔥",hot:"💚",stun:"💫",freeze:"🧊",slow:"🐌",vuln:"💔"})[e.k]||"").join("")}</div>`;
  root.innerHTML=`<div class="arena">
   ${B.pvp?`<div class="pvp-head"><span>${S.profile.name} ${leagueOf(S.pvp.rating).ico}</span><span class="pvp-timer" id="pvpt">10</span><span>${B.opp.name}</span></div>`:""}<div class="turn-order">${[f,...B.queue].map(x=>`<img src="assets/${x.id}.png" class="${x===f?"now":""} ${x.side==="enemy"?"en":""}">`).join("")}</div>
   <div class="arena-field iso-arena"><div class="arena-floor"></div><div class="team allies">${B.allies.map(fh).join("")}</div><div class="team enemies">${B.enemies.map(fh).join("")}</div></div>
   <div class="battle-log" id="blog">${B.log.map(l=>`<div>${l}</div>`).join("")}</div>
   <div class="skills" id="sk">${f.side==="ally"?f.skills.map(k=>{const s=SKILLS[k];const cd=f.cds[k]||0;return `<button class="skillbtn ${B.sel===k?"sel":""}" data-k="${k}" ${cd?"disabled":""} style="${s.el?`border-color:${ELEMENTS[s.el].color}`:""}"><b>${s.el?ELEMENTS[s.el].ico:"⚪"} ${s.name}</b><small>${s.desc}</small>${cd?`<span class="cd">⏳${cd}</span>`:""}</button>`}).join(""):`<div style="grid-column:1/-1;color:#ffe9b8;font-weight:900;text-align:center;padding:14px">Ход противника: ${f.name}…</div>`}
   <button class="btn red sm" style="grid-column:1/-1" id="flee">🏳️ Сдаться</button></div></div>`;
  $("#blog").scrollTop=1e9;
  $("#flee").onclick=()=>{if(confirm("Сдаться?")){if(B.pvp)pvpForfeit();else endBattle(false)}};
  if(f.side==="ally"){
    $$(".skillbtn",root).forEach(b=>b.onclick=()=>{SFX.select();B.sel=b.dataset.k;renderBattle();const s=SKILLS[B.sel];
      if(s.aoe||s.type==="buff"||s.type==="debuff"){useSkill(f,B.sel,null)}
      else{const tgtSide=s.type==="heal"?"ally":"enemy";$$(`.fighter[data-side="${tgtSide}"]`).forEach(el=>{const t=(tgtSide==="ally"?B.allies:B.enemies)[+el.dataset.i];if(t.hp>0){el.classList.add("target");el.onclick=()=>useSkill(f,B.sel,t)}});toast(s.type==="heal"?"Выбери союзника":"Выбери цель")}});
    // автовыбор цели, если навык уже выбран - подсветить
    if(B.sel){const s=SKILLS[B.sel];if(!(s.aoe||s.type==="buff"||s.type==="debuff")){const tgtSide=s.type==="heal"?"ally":"enemy";$$(`.fighter[data-side="${tgtSide}"]`).forEach(el=>{const t=(tgtSide==="ally"?B.allies:B.enemies)[+el.dataset.i];if(t.hp>0){el.classList.add("target");el.onclick=()=>useSkill(f,B.sel,t)}})}}
  }
}
function vfx(el,kind){if(!el)return;const f=document.createElement("div");f.className="vfx vfx-"+(kind||"basic");
  const ico={tyrant:"💀",digit:"🔢",clock:"🕒",night:"🌙",cat:"🐱",doc:"💉",bird:"🐦",cyber:"💾",glitch:"🧩",sheep:"🐏",royal:"💎",beast:"🐾",money:"💰",zodiac:"♈",fire:"🔥",water:"💧",plant:"🌿",earth:"🪨",wind:"🌪️",energy:"⚡",metal:"⚙️",ice:"❄️",shadow:"🌑",light:"✨",legend:"👑",basic:"💥",heal:"💚",buff:"🔺",debuff:"🔻"}[kind]||"💥";
  f.innerHTML=`<span>${ico}</span><span>${ico}</span><span>${ico}</span><i></i>`;el.append(f);setTimeout(()=>f.remove(),900)}
function lunge(el,dir){if(!el)return;el.classList.add(dir>0?"lunge-r":"lunge-l");setTimeout(()=>el.classList.remove("lunge-r","lunge-l"),450)}
function flash(kind){const a=$(".arena-field");if(!a)return;const f=document.createElement("div");f.className="screenflash";f.style.background=ELEMENTS[kind]?ELEMENTS[kind].color:"#fff";a.append(f);setTimeout(()=>f.remove(),400)}
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
  if(B.busy&&actor.side==="ally"&&!fromNet)return;B.busy=true;clearTimeout(B.turnTimer);
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
  if(s.aoe)flash(s.el);
  const foes=actor.side==="ally"?B.enemies:B.allies,friends=actor.side==="ally"?B.allies:B.enemies;
  if(s.type==="attack"){
    const targets=s.aoe?alive(foes):[target];
    let healed=0;
    targets.forEach(t=>{const m=elMult(s.el,actor,t);const crit=RNG()<(actor.crit||0.1);const vuln=(t.fx||[]).some(e=>e.k==="vuln")?1.4:1;
      let dmg=atkM*(1-blk)*(actor.atk*(1+actor.buffAtk-actor.debuff)*s.power*(1+((actor.dmgB||{})[s.el]||0))*(s.aoe?0.7:1))*(100/(100+t.def*(1+t.buffDef)))*m*vuln*rnd(90,110)/100*(crit?1.7:1);
      dmg=Math.max(1,Math.round(dmg));
      if(t.shield>0){const ab=Math.min(t.shield,dmg);t.shield-=ab;dmg-=ab;if(ab)log(`🔰 щит ${t.name} поглотил ${ab}`)}
      t.hp=Math.max(0,t.hp-dmg);healed+=dmg;
      if(s.effect&&t.hp>0){const ch=s.chance||1;if(RNG()<ch){t.fx=t.fx||[];
        if(s.effect==="burn")t.fx.push({k:"burn",t:3});
        else if(s.effect==="stun")t.fx.push({k:"stun",t:1});
        else if(s.effect==="freeze")t.fx.push({k:"freeze",t:1});
        else if(s.effect==="slow"){t.spd=Math.round(t.spd*0.7);t.fx.push({k:"slow",t:2})}
        else if(s.effect==="weaken"){t.debuff=0.3;t.debuffT=3}
        log(`✴️ ${t.name}: ${({burn:"горение",stun:"оглушение",freeze:"заморозка",slow:"замедление",weaken:"ослабление"})[s.effect]}`)}}
      SFX.el(s.el||actor.els[0]);const el=fEl(t);if(el){el.classList.add("hit");vfx(el,s.el||actor.els[0]);pop(el,(m>1?"💥":m<1?"🛡":"")+"-"+dmg,crit?"crit":m<1?"weak":"")}
      log(`${actor.name} → ${s.name} → ${t.name}: <b>${dmg}</b>${atkM>1?" ИДЕАЛЬНО":""}${blk?" блок "+Math.round(blk*100)+"%":""}${m>1?" (эффективно!)":m<1?" (слабо)":""}${crit?" КРИТ!":""}${t.hp<=0?" ☠️":""}`)});
    const ls=(s.effect==="lifesteal"?0.5:0)+(actor.lifesteal||0);if(ls>0&&healed>0){const h=Math.round(healed*ls);actor.hp=Math.min(actor.maxhp,actor.hp+h);pop(fEl(actor),"+"+h,"heal");log(`🩸 ${actor.name} восстановил ${h}`)}
  }else if(s.type==="heal"){
    const targets=s.aoe?alive(friends):[target];
    targets.forEach(t=>{const h=Math.round(t.maxhp*s.power*(1+((actor.dmgB||{})[s.el]||0)));t.hp=Math.min(t.maxhp,t.hp+h);
      if(s.effect==="hot"){t.fx=t.fx||[];t.fx.push({k:"hot",t:2})}
      if(s.effect==="cleanse"){t.fx=(t.fx||[]).filter(e=>e.k==="hot");t.debuff=0}SFX.heal();vfx(fEl(t),"heal");pop(fEl(t),"+"+h,"heal");log(`${actor.name} лечит ${t.name} на ${h}`)});
  }else if(s.type==="buff"){
    alive(friends).forEach(t=>{if(k==="armor"){t.buffDef=1;t.buffDefT=3}else{t.buffAtk=s.power;t.buffAtkT=3}vfx(fEl(t),"buff");pop(fEl(t),k==="armor"?"🛡️↑":"⚔️↑","heal")});SFX.buff();log(`${actor.name}: ${s.name} на всю команду!`);
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
  if(win){gold=200*opp.lvl+rnd(0,100);xp=40+60*opp.lvl;food=50*opp.lvl;const idx=OPPONENTS.indexOf(opp);if(idx>=0&&idx===S.wins){S.wins++;gems=10;}else if(idx<0)gems=opp.diff==="hard"?rnd(3,6):opp.diff==="normal"?rnd(1,3):rnd(0,1);
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
    if(S.dragons[e.id]){const g=Math.round(RARITY[d.rarity].price*.4);S.gold+=g;S.food+=200;save();updateTop();modal(`<h2>🐣 ${d.name}</h2><div class="center"><img src="assets/${e.id}.png" style="height:150px"><p>У вас уже есть такой дракон — дубликат превращён в 🪙${g} и 🍖200.</p><button class="btn" onclick="openIncubator()">Назад</button></div>`);return}
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
function isHoused(id){return allTiles().some(t=>t.dragons.includes(id))}

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
        html+=`<div class="tnode ${st}" style="--c:${E.color}"><div class="tico">${nd.ico}</div><div class="tt"><b>Ур. ${lv}</b> ${nd.n}${lv===6&&L>=6&&t.final!=null?`<br><small>✅ ${FINAL_OPTIONS[el][t.final].n}</small>`:""}</div>${st==="next"?`<button class="btn sm green" data-tl="${lv}" ${dSP(id)<c?"disabled":""}>📘${c}</button>`:st==="done"?"✅":"🔒"}</div>`});
      html+=`</div>`;
      if(L>=6&&t.final==null)html+=`<p><b>🏁 Выбери финальный бонус:</b></p>`+FINAL_OPTIONS[el].map((f,i)=>`<div class="skill"><span>${f.n}</span><button class="btn sm purple" data-final="${i}">Выбрать</button></div>`).join("");
      body.innerHTML=html;
      $$("[data-tl]",m).forEach(b=>b.onclick=()=>{const lv=+b.dataset.tl;o.sp-=TREE_COST[lv-1];t.lvl=lv;save();toast(`${E.ico} ${E.name}: уровень ${lv}`);$$(".tabs button",m).forEach(bt=>{if(bt.dataset.t===el)bt.innerHTML=`${E.ico} ${E.name} ${lv}/${TREE_MAX}`});draw()});
      $$("[data-final]",m).forEach(b=>b.onclick=()=>{t.final=+b.dataset.final;save();toast("🏁 "+FINAL_OPTIONS[el][t.final].n);draw()})}}
  $$(".tabs button",m).forEach(b=>b.onclick=()=>{tab=b.dataset.t;draw()});draw();
}
setInterval(()=>{if($("#scr-academy").classList.contains("active")&&!$("#modal-root").innerHTML)renderAcademy()},3000);

/* ================= РАЗВЕДЕНИЕ ================= */
let breedSel=[];
function breedResult(a,b){const da=dInfo(a),db=dInfo(b);const els=[...new Set([...da.els,...db.els])];
  const lc=legendChance(a,b);if(lc&&Math.random()<lc.p){const pool=DRAGONS.filter(d=>!isEvent(d.id)&&!d.boss&&(lc.kind==="tyrant"?isTyrant(d.id):lc.kind==="divine"?isDivine(d.id):isLegend(d.id)));return pick(pool).id}
  if(isDivine(a)&&isDivine(b)){return pick(DRAGONS.filter(d=>isDivine(d.id)&&!isEvent(d.id))).id}
  if(isLegend(a)&&isLegend(b)){return pick(DRAGONS.filter(d=>isLegend(d.id)&&!isEvent(d.id))).id}
  let pool=DRAGONS.filter(d=>d.id!==a&&d.id!==b&&!isSpecial(d.id)&&d.els.every(e=>els.includes(e)));if(!pool.length)pool=DRAGONS.filter(d=>!isSpecial(d.id)&&d.els.every(e=>els.includes(e)));if(!pool.length)pool=DRAGONS.filter(d=>!isSpecial(d.id));
  const rw={common:50,rare:30,epic:14,legendary:5,divine:1};
  const pr=Math.max(RARITY[da.rarity].mult,RARITY[db.rarity].mult);
  const weighted=pool.map(d=>({d,w:rw[d.rarity]*(pr>1.4&&["epic","legendary","divine"].includes(d.rarity)?3:1)*(d.els.filter(e=>els.includes(e)).length)}));
  let tot=weighted.reduce((s,x)=>s+x.w,0),r=Math.random()*tot;for(const x of weighted){r-=x.w;if(r<=0)return x.d.id}return pool.length?pool[0].id:a}
function isLegend(id){return dInfo(id).els.includes("legend")}function isDivine(id){return dInfo(id).els.includes("divine")}function isTyrant(id){return dInfo(id).els.includes("tyrant")}function isEvent(id){return !!dInfo(id).eventOnly}function isSpecial(id){return isLegend(id)||isDivine(id)||isTyrant(id)||isEvent(id)}
function possibleChildren(a,b){const els=[...new Set([...dInfo(a).els,...dInfo(b).els])];return DRAGONS.filter(d=>d.id!==a&&d.id!==b&&!isSpecial(d.id)&&d.els.every(e=>els.includes(e))).map(d=>d.id)}
function legendChance(a,b){const la=S.dragons[a].lvl,lb=S.dragons[b].lvl;if(isDivine(a)&&isDivine(b)&&la>=TYRANT_BREED.minLvl&&lb>=TYRANT_BREED.minLvl)return {kind:"tyrant",p:TYRANT_BREED.chance};if(isLegend(a)&&isLegend(b)&&la>=DIVINE_BREED.minLvl&&lb>=DIVINE_BREED.minLvl)return {kind:"divine",p:DIVINE_BREED.chance};if(la>=LEGEND_BREED.minLvl&&lb>=LEGEND_BREED.minLvl)return {kind:"legend",p:LEGEND_BREED.chance+(isLegend(a)||isLegend(b)?0.15:0)};return null}
function renderBreed(){
  const root=$("#scr-breed");const br=S.breeding;const own=housedIds();
  const eggs=[];
  let html=`<div style="padding:14px"><div class="panel"><h2>💞 Гнездо разведения</h2><small>Потомок — <b>только</b> из стихий родителей. 👑 <b>Легендарных</b> нельзя купить: их можно вывести только если оба родителя ур. 10+ (шанс 10%, время 5 мин), Легенда+Легенда всегда даёт Легенду, а на ур. 20+ — шанс 🔱 Божественного. Как в оригинале!</small>`;
  if(br){const left=Math.max(0,br.end-Date.now());html+=`<div class="breed-box"><img src="assets/${br.a}.png"><span class="heart">💞</span><img src="assets/${br.b}.png"><div style="flex:1"><b>${dInfo(br.a).name}</b> + <b>${dInfo(br.b).name}</b><div class="bar" style="margin:6px 0"><div style="width:${100-left/(br.total||BREED_TIME)*100}%"></div></div><button class="btn ${left<=0?"green":""}" id="hatchb" ${left<=0?"":"disabled"}>${left<=0?"🥚 Получить яйцо!":"⏳ "+Math.ceil(left/1000)+" с"}</button> <button class="btn sm purple" id="speed" ${left<=0?"disabled":""}>💎${Math.ceil(left/20000)} ускорить</button></div></div>`}
  else{html+=`<div class="breed-box">${[0,1].map(i=>breedSel[i]?`<img src="assets/${breedSel[i]}.png" data-un="${i}" title="убрать">`:`<div class="acad-slot empty" style="width:90px;height:100px">?</div>`).join('<span class="heart">💞</span>')}<div style="flex:1">${breedSel.length===2?`${(()=>{const lc=legendChance(breedSel[0],breedSel[1]);return lc?`<div class="badge gold">${lc.kind==="tyrant"?"💀 шанс Тиранского":lc.kind==="divine"?"🔱 шанс Божественного":"👑 шанс Легендарного"}: ${Math.round(lc.p*100)}%</div>`:`<small>👑 Легендарный шанс появится, если оба родителя ур. ${LEGEND_BREED.minLvl}+</small>`})()}<br><small>Возможные потомки:</small><div class="picker">${possibleChildren(breedSel[0],breedSel[1]).map(id=>`<img src="assets/${id}.png" title="${dInfo(id).name}" style="width:44px;height:48px">`).join("")||"<i>нет</i>"}</div>`:""}<button class="btn green" id="breed" ${breedSel.length===2?"":"disabled"}>Начать (🪙500)</button></div></div>`}
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
  const m=modal(`<h2>📞 Телефонная будка</h2><div class="phone-card"><img src="assets/d71.png"><div><b>MR 333</b><br><small>«Алло? Три часа ночи. Ты знаешь, что делать. Приводи своих — я приведу своих.»</small><br><br>Его команда: ${PHONE_EVENT.team.map(id=>`<img src="assets/${id}.png" style="height:44px;vertical-align:middle" title="${dInfo(id).name}">`).join("")}<br><small>Уровень команды: <b>${S.level+PHONE_EVENT.lvlBonus}</b> (всегда выше твоего). Побед: ${wins}</small></div></div>
  <p>Награда за победу: ${costStr(PHONE_EVENT.reward)}. Каждая <b>3-я победа</b> — 🥚 яйцо самого <b>MR 333</b> (только так его и можно получить)!</p>
  <div class="row"><button class="btn red" id="call" ${left>0?"disabled":""}>${left>0?"📵 Занято: "+tleft(Date.now()+left):"📞 Позвонить"}</button></div>`);
  $("#call",m).onclick=()=>{closeModal();pickTeamModal("📞 MR 333 отвечает…","<div class='desc'>«3:33. Ровно. Не опаздывай.» Команда 3:00 очень сильна — бери драконов, сильных против 🕒 3:00 (🔢 Цифра и 💉 Медицина) и берегись 🌙 Ночи.</div>",()=>{
    const lvl=S.level+PHONE_EVENT.lvlBonus;S.phoneLast=Date.now();save();
    startBattle({name:"Команда 3:00 (MR 333)",lvl,ids:PHONE_EVENT.team,onEnd:(win)=>{
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
      startBattle({name:"Зодиак: "+dInfo(id).name,lvl,ids:[id,...(st>=6?[ZODIAC_IDS[(st+5)%13]]:[]),...(st>=10?[ZODIAC_IDS[(st+9)%13]]:[])],carry:z.hp||null,onEnd:(win,hpLeft)=>{
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
    startBattle({name:"Темница, этаж "+(g.floor+1),lvl,ids:g.next,carry:g.hp||null,onEnd:(win,hpLeft)=>{
      if(win){g.floor++;g.best=Math.max(g.best,g.floor);g.hp=hpLeft;g.next=dgEnemies(g.floor);const gold=400*g.floor+rnd(0,200),food=100*g.floor;S.gold+=gold;S.food+=food;S.scrolls=(S.scrolls||0)+1;addXP(80+30*g.floor);let chest="";if(g.floor%5===0){S.gems+=10+g.floor;S.scrolls+=5;chest=`<p><b>🎁 Сундук: +💎${10+g.floor} +📜5</b></p>`}
        save();updateTop();modal(`<div class="result win">ЭТАЖ ${g.floor} ЗАЧИЩЕН</div><div class="center" style="font-weight:900">+🪙${gold} +🍖${food} +📜1</div>${chest}<div class="row" style="justify-content:center"><button class="btn green" id="dn">Дальше</button></div>`,{closable:false});$("#dn").onclick=()=>{closeModal();openDungeon()}}
      else{g.floor=0;g.hp=null;g.next=null;save();modal(`<div class="result lose">ТЕМНИЦА ПОГЛОТИЛА ВАС</div><p class="center">Серия прервана. Рекорд: ${g.best}.</p><div class="row" style="justify-content:center"><button class="btn" onclick="closeModal();show('map')">Ок</button></div>`,{closable:false})}}})})};
  const dh=$("#dheal",m);if(dh)dh.onclick=()=>{const c=3+Math.floor(g.floor/3);if(S.gems<c){toast("Не хватает 💎");return}S.gems-=c;g.hp=null;save();updateTop();openDungeon()};
  const de=$("#dexit",m);if(de)de.onclick=()=>{g.floor=0;g.hp=null;g.next=null;save();closeModal();toast("Вы вышли из темницы")}}

/* ================= ДОРОГА НАГРАД ================= */
function levelRewards(l){const r=[];
  r.push({ico:"💎",t:"+5 самоцветов"});r.push({ico:"📜",t:"+3 свитка"});r.push({ico:"🪙",t:"+"+fmt(500*l)+" золота"});
  ISLANDS.filter(i=>i.req===l).forEach(i=>r.push({ico:"🏝️",t:i.name,big:true}));
  Object.values(BUILDINGS).filter(b=>b.req===l).forEach(b=>r.push({ico:b.ico,t:b.name,big:!!b.el||!!b.special}));
  DRAGONS.filter(d=>DRAGON_REQ[d.id]===l&&!isSpecial(d.id)).forEach(d=>r.push({img:d.id,t:d.name,rar:d.rarity}));
  if(ROOM_REQ.includes(l))r.push({ico:"🏫",t:"Комната Академии №"+(ROOM_REQ.indexOf(l)+1)});
  if(l===7||l===15)r.push({ico:"🥚",t:"Гнездо инкубатора №"+(l===7?2:3)});
  if(l===ZODIAC_EVENT.req)r.push({ico:"♈",t:"Испытание зодиаков",big:true});
  if(l===LEGEND_BREED.minLvl)r.push({ico:"👑",t:"Разведение легендарных (драконы ур.10+)",big:true});
  if(l===DIVINE_BREED.minLvl)r.push({ico:"🔱",t:"Разведение божественных",big:true});
  if(l===TYRANT_BREED.minLvl)r.push({ico:"💀",t:"Разведение тиранских (Божество+Божество)",big:true});
  return r}
function showRoad(){const MAXL=30;
  const m=modal(`<h2>🛣️ Дорога наград <span class="badge gold">ур. ${S.level}</span></h2><small>Что открывается на каждом уровне Хранителя. Опыт даётся за бои, постройки, кормление и сбор дохода.</small>
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
function renderEvents(){
  const f=featured();const root=$("#scr-events");
  const feat=(d,title,badge,end,key,disc)=>{const own=S.dragons[d.id];const r=RARITY[d.rarity];const price=Math.round(r.price*disc);const claimed=S.quests["claim_"+key];
    return `<div class="panel"><h2>${title} <span class="badge ${badge}">${badge==="gold"?"МЕСЯЦ":"НЕДЕЛЯ"}</span></h2>
    <div class="feature"><img src="assets/${d.id}.png"><div style="flex:1"><div style="font-size:18px;font-weight:900">${d.name}</div><span class="badge" style="background:${r.color}">${r.name}</span> ${d.els.map(elIco).join("")}<div class="desc">${d.desc}</div>
    <div>До конца: <span class="timer" data-end="${end.getTime()}">${tleft(end)}</span></div>
    <div class="row">${own?`<button class="btn" disabled>✅ Уже в коллекции</button>`:`<button class="btn green" data-buy="${d.id}" data-price="${price}">Купить со скидкой 🪙${fmt(price)} <s style="opacity:.6">${fmt(r.price)}</s></button>`}
    ${claimed?`<button class="btn" disabled>🎁 Награда получена</button>`:`<button class="btn purple" data-claim="${key}">🎁 Награда события</button>`}</div>
    <small>Бонус: драконы стихии ${d.els.map(e=>ELEMENTS[e].name).join("/")} получают +25% атаки на арене в этот период.</small></div></div></div>`};
  root.innerHTML=`<div class="ev-wrap">${feat(f.dom,"🏆 Дракон месяца","gold",f.endM,f.mk,0.6)}${feat(f.dow,"📅 Дракон недели","",f.endW,f.wk,0.75)}
  ${renderZodiacCard()}
  <div class="panel"><h2>🎪 Другие события</h2><div class="skill"><span>📞 <b>Звонок MR 333</b><br><small>Построй Телефонную будку (ур.${BUILDINGS.phone.req}) и брось вызов команде 3:00. Каждая 3-я победа — яйцо MR 333.</small></span><button class="btn sm" id="gophone" ${allTiles().some(t=>t.b==="phone")?"":"disabled"}>${allTiles().some(t=>t.b==="phone")?"📞":"нет будки"}</button></div>
  <div class="skill"><span>🏚️ <b>Темница</b><br><small>Построй Темницу (ур.${BUILDINGS.dungeon.req}): бесконечный спуск по этажам с растущей наградой.</small></span><button class="btn sm" id="godg" ${allTiles().some(t=>t.b==="dungeon")?"":"disabled"}>${allTiles().some(t=>t.b==="dungeon")?"⬇":"нет темницы"}</button></div></div>
  <div class="panel"><h2>📜 Задания</h2>${QUESTS.map(q=>{const p=Math.min(q.need,S.quests[q.id]||0);const done=S.quests["done_"+q.id];return `<div class="quest ${done?"done":""}"><span>${q.name}<br><small>${p}/${q.need}</small></span>${done?"✅":`<button class="btn sm green" data-q="${q.id}" ${p>=q.need?"":"disabled"}>${costStr(q.reward)}</button>`}</div>`}).join("")}</div>
  <div class="panel"><h2>📊 Статистика</h2><div class="stat"><span>Драконов</span><span>${ownedIds().length}/${DRAGONS.filter(d=>!d.boss).length}</span></div><div class="stat"><span>Побед</span><span>${S.wins}</span></div><div class="stat"><span>Боёв</span><span>${S.battles}</span></div><div class="stat"><span>Островов</span><span>${S.islands.length}/${ISLANDS.length}</span></div><div class="stat"><span>Построек</span><span>${allTiles().filter(t=>t.b).length}</span></div><div class="stat"><span>Открыто клеток</span><span>${allTiles().filter(t=>t.unlocked).length}/${allTiles().length}</span></div>
  <div class="row"><button class="btn red sm" id="reset">Сбросить прогресс</button></div></div></div>`;
  bindZodiac(root);const gp=$("#gophone",root);if(gp)gp.onclick=openPhone;const gd=$("#godg",root);if(gd)gd.onclick=openDungeon;
  $$("[data-buy]",root).forEach(b=>b.onclick=()=>{const p=+b.dataset.price;if(S.level<DRAGON_REQ[b.dataset.buy]){toast("Нужен уровень "+DRAGON_REQ[b.dataset.buy]);return}if(S.gold<p){toast("Не хватает золота");return}S.gold-=p;giveEgg(b.dataset.buy,"event");addXP(150);save();renderEvents()});
  $$("[data-claim]",root).forEach(b=>b.onclick=()=>{S.quests["claim_"+b.dataset.claim]=1;S.gold+=1000;S.gems+=10;S.food+=300;S.scrolls=(S.scrolls||0)+5;addXP(50);save();toast("🎁 +🪙1000 +💎10 +🍖300 +📜5");renderEvents()});
  $$("[data-q]",root).forEach(b=>b.onclick=()=>{const q=QUESTS.find(x=>x.id===b.dataset.q);S.quests["done_"+q.id]=1;S.gold+=q.reward.gold||0;S.gems+=q.reward.gems||0;S.food+=q.reward.food||0;S.scrolls=(S.scrolls||0)+(q.reward.scrolls||0);addXP(80);save();toast("✅ "+costStr(q.reward));renderEvents()});
  $("#reset").onclick=()=>{if(confirm("Точно удалить весь прогресс?")){localStorage.removeItem(SAVE_KEY);location.reload()}};
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
  if(name==="gbt"){const a=new Audio("assets/gbt.mp3");a.loop=true;a.volume=.6;a.play().catch(()=>{});MUSIC.mp3=a;return}
  const T=TRACKS[name];if(!T)return;try{MUSIC.ctx=MUSIC.ctx||new (window.AudioContext||window.webkitAudioContext)();}catch(e){return}
  const ctx=MUSIC.ctx;if(ctx.state==="suspended")ctx.resume();
  const master=ctx.createGain();master.gain.value=T.gain;master.connect(ctx.destination);MUSIC.master=master;
  const step=60/T.bpm/2;let i=0;let next=ctx.currentTime+.05;
  const f=n=>220*Math.pow(2,n/12);
  function note(freq,t,d,wave,vol){const o=ctx.createOscillator(),gn=ctx.createGain();o.type=wave;o.frequency.value=freq;gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(vol,t+.01);gn.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(gn);gn.connect(master);o.start(t);o.stop(t+d+.02)}
  function sched(){if(MUSIC.cur!==name)return;while(next<ctx.currentTime+.4){const b=T.bass[Math.floor(i/2)%T.bass.length],l=T.lead[i%T.lead.length];
      if(i%2===0)note(f(b-12),next,step*1.8,"sine",.9);note(f(l),next,step*.9,T.wave,.5);
      if(name==="battle"||name==="pvp"){if(i%4===0)note(60,next,.08,"square",.6)} // «барабан»
      next+=step;i++}MUSIC.timer=setTimeout(sched,120)}
  sched()}
function stopMusic(){clearTimeout(MUSIC.timer);MUSIC.timer=null;if(MUSIC.master){try{MUSIC.master.gain.linearRampToValueAtTime(0,MUSIC.ctx.currentTime+.3)}catch(e){}const m=MUSIC.master;setTimeout(()=>m.disconnect(),400);MUSIC.master=null}if(MUSIC.mp3){MUSIC.mp3.pause();MUSIC.mp3=null}MUSIC.cur=null}
function toggleMusic(){S.music=!S.music;save();const c=MUSIC.cur;stopMusic();if(S.music){MUSIC.cur=null;playMusic(c||"map")}$("#musbtn").textContent=S.music?"🔊":"🔇"}
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
    startBattle({name:n.name,lvl:n.lvl,ids:n.ids,campaign:true,music:n.music,onEnd:(win)=>{if(win){const mult=replay?.3:1;const gold=Math.round((300*n.lvl+(n.boss?1500:0))*mult),xp=Math.round((60+80*n.lvl)*mult),gems=replay?0:(n.boss?25:8),sc=Math.round((2+Math.floor(n.lvl/3))*mult);S.gold+=gold;S.gems+=gems;S.scrolls=(S.scrolls||0)+sc;addXP(xp);
        if(!replay){S.camp.done=i+1;if(i+1>S.wins)S.wins=i+1;S.quests.wins=(S.quests.wins||0)+1}
        let extra="";if(n.final&&!replay){S.gems+=300;S.scrolls=(S.scrolls||0)+50;giveEgg("d107","campaign");extra="<p><b>🏆 Кампания пройдена! +💎300 +📜50 и 🥚 яйцо Алмазного Голема.</b></p>"}
        save();updateTop();playDialog(n.post,()=>{playMusic("campaign");modal(`<div class="result win">ПОБЕДА!</div><div class="center" style="font-weight:900">+🪙${gold} +💎${gems} +📜${sc} +⭐${xp}</div>${extra}<div class="row" style="justify-content:center"><button class="btn green" onclick="closeModal();show('campaign')">Дальше</button></div>`,{closable:false})})}
      else{addXP(10);save();playMusic("campaign");modal(`<div class="result lose">ПОРАЖЕНИЕ</div><p class="center">${n.name} оказался сильнее. Прокачай драконов в Академии и вернись.</p><div class="row" style="justify-content:center"><button class="btn" onclick="closeModal();show('campaign')">Ок</button></div>`,{closable:false})}}})})})}}
function playDialog(lines,done){if(!lines||!lines.length){done();return}let i=0;
  const root=$("#modal-root");
  function draw(){const [img,who,text]=lines[i];const isAv=img.startsWith("av");root.innerHTML=`<div class="dlg-overlay"><div class="dlg"><img class="dlg-img" src="assets/${isAv?"av/"+img+".jpg":img+".png"}"><div class="dlg-box"><div class="dlg-who">${who}</div><div class="dlg-text" id="dtext"></div><div class="dlg-hint">нажми, чтобы продолжить ▸ &nbsp; <a id="dskip">пропустить</a></div></div></div></div>`;
    const el=$("#dtext");let k=0;const tw=setInterval(()=>{el.textContent=text.slice(0,++k);if(k>=text.length)clearInterval(tw)},18);
    $(".dlg-overlay").onclick=e=>{if(e.target.id==="dskip"){clearInterval(tw);root.innerHTML="";done();return}if(k<text.length){clearInterval(tw);el.textContent=text;k=text.length;return}i++;if(i<lines.length)draw();else{root.innerHTML="";done()}}}
  draw()}

/* ================= СЕТЬ: PvP + друзья ================= */
const NET={ws:null,me:null,friends:[],requests:[],top:[],online:0,status:"offline",queued:false,room:null,retry:1000};
function serverUrl(){const c=localStorage.getItem("dml_server");if(c)return c;const l=location;if(l.protocol==="file:")return "";return (l.protocol==="https:"?"wss://":"ws://")+l.host}
function netConnect(){const url=serverUrl();if(!url){NET.status="offline";return}try{NET.ws=new WebSocket(url)}catch(e){NET.status="offline";return}
  NET.status="connecting";const ws=NET.ws;
  ws.onopen=()=>{NET.retry=1000;NET.status="online";netSend({t:"hello",token:localStorage.getItem("dml_token"),name:S.profile.name,avatar:S.profile.avatar,power:team.reduce((a,id)=>a+power(id),0),team})};
  ws.onclose=()=>{NET.status="offline";NET.queued=false;refreshNetUI();setTimeout(netConnect,Math.min(15000,NET.retry*=1.6))};
  ws.onerror=()=>{};
  ws.onmessage=ev=>{let m;try{m=JSON.parse(ev.data)}catch(e){return}netHandle(m)}}
function netSend(m){if(NET.ws&&NET.ws.readyState===1)NET.ws.send(JSON.stringify(m))}
function pvpSend(m){netSend(m)}
function netHandle(m){
  if(m.t==="welcome"){NET.me=m.me;localStorage.setItem("dml_token",m.token);NET.top=m.top;NET.online=m.online;S.pvp.rating=m.me.rating;save();refreshNetUI();return}
  if(m.t==="me"){NET.me=m.me;S.pvp.rating=m.me.rating;save();refreshNetUI();return}
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
function refreshNetUI(){const st=$("#netdot");if(st){st.className="netdot "+NET.status;st.title=NET.status==="online"?`Онлайн: ${NET.online}`:"Нет связи с сервером"}
  if($("#scr-pvp").classList.contains("active")&&!B)renderPvp();if($("#scr-friends").classList.contains("active"))renderFriends()}
function startPvp(m){if(!NET.oppFighters)return;NET.pendingMatch=null;
  const ef=NET.oppFighters.filter(f=>dInfo(f.id)).map((f,i)=>({...f,side:"enemy",i,fx:[],cds:{}}));if(!ef.length){toast("У соперника нет команды");return}
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
  root.innerHTML=`<div class="pvp-menu"><div class="panel"><h2>👤 Профиль</h2><div class="prof"><img src="assets/av/${S.profile.avatar}.jpg" class="av big" id="pickav"><div><input id="pname" maxlength="20" value="${S.profile.name.replace(/"/g,"&quot;")}"><br><small>Твой код друга: <b class="code">${me?me.code:"— (офлайн)"}</b></small><br><small>Нажми на аватар, чтобы сменить</small></div></div>
  <div class="avgrid">${AVATARS.map(a=>`<img src="assets/av/${a.id}.jpg" class="av ${S.profile.avatar===a.id?"sel":""}" data-av="${a.id}" title="${a.n}">`).join("")}</div></div>
  <div class="panel"><h2>➕ Добавить друга</h2><div class="row"><input id="fcode" placeholder="Код друга, напр. A1B2C3" maxlength="6" style="text-transform:uppercase"><button class="btn green" id="fadd" ${on?"":"disabled"}>Отправить заявку</button></div></div>
  ${NET.requests.length?`<div class="panel"><h2>📨 Заявки (${NET.requests.length})</h2>${NET.requests.map(p=>`<div class="frow"><img src="assets/av/${p.avatar}.jpg" class="av"><b>${p.name}</b><small>${leagueOf(p.rating).ico} ${p.rating}</small><button class="btn sm green" data-acc="${p.id}">✓</button><button class="btn sm" data-dec="${p.id}">✕</button></div>`).join("")}</div>`:""}
  <div class="panel"><h2>👥 Друзья (${NET.friends.length})</h2>${NET.friends.map(p=>`<div class="frow"><img src="assets/av/${p.avatar}.jpg" class="av"><span class="dot ${p.online?"on":""}"></span><b>${p.name}</b><small>${leagueOf(p.rating).ico} ${p.rating} · ⚡${p.power}</small><button class="btn sm red" data-ch="${p.id}" ${p.online&&team.length?"":"disabled"}>⚔️ Вызвать</button><button class="btn sm" data-rm="${p.id}">🗑</button></div>`).join("")||`<small>${on?"Добавь друзей по коду — и вызывай их на PvP-бой.":"Нет связи с сервером."}</small>`}</div></div>`;
  $("#pname",root).onchange=e=>{S.profile.name=e.target.value.trim()||"Хранитель";save();updateTop();netSend({t:"profile",name:S.profile.name,avatar:S.profile.avatar,power:team.reduce((a,id)=>a+power(id),0),team})};
  $$("[data-av]",root).forEach(a=>a.onclick=()=>{S.profile.avatar=a.dataset.av;save();updateTop();netSend({t:"profile",name:S.profile.name,avatar:S.profile.avatar,power:team.reduce((a,id)=>a+power(id),0),team});renderFriends()});
  $("#fadd",root).onclick=()=>{const c=$("#fcode",root).value.trim();if(c.length<4)return;netSend({t:"friend_add",code:c});$("#fcode",root).value=""};
  $$("[data-acc]",root).forEach(b=>b.onclick=()=>netSend({t:"friend_accept",id:b.dataset.acc}));$$("[data-dec]",root).forEach(b=>b.onclick=()=>netSend({t:"friend_decline",id:b.dataset.dec}));
  $$("[data-rm]",root).forEach(b=>b.onclick=()=>{if(confirm("Удалить из друзей?"))netSend({t:"friend_remove",id:b.dataset.rm})});
  $$("[data-ch]",root).forEach(b=>b.onclick=()=>{netSend({t:"profile",name:S.profile.name,avatar:S.profile.avatar,power:team.reduce((a,id)=>a+power(id),0),team});netSend({t:"challenge",to:b.dataset.ch})})}

/* ================= ФОНОВАЯ ВКЛАДКА: не останавливать игру ================= */
// Браузеры замедляют setTimeout в фоне до 1 раза/сек, а WebAudio продолжает работать. Держим «тикер» через Web Worker, который не троттлится.
const TICKER=(()=>{try{const b=new Blob(["setInterval(()=>postMessage(1),1000)"],{type:"text/javascript"});const w=new Worker(URL.createObjectURL(b));return w}catch(e){return null}})();
if(TICKER)TICKER.onmessage=()=>{if(document.hidden){/* в фоне: обновляем PvP-таймеры и фермы, чтобы при возврате всё было актуально */if(B&&B.pvp&&B.turnTimer){} }};
document.addEventListener("visibilitychange",()=>{if(!document.hidden){if(MUSIC.ctx&&MUSIC.ctx.state==="suspended")MUSIC.ctx.resume();if(!B)show($("#navbar button.active")?.dataset.scr||"map")}});

/* ================= СТАРТ ================= */
load();
// офлайн-бонус
const _day=new Date().toDateString();if(S.lastDaily!==_day){S.lastDaily=_day;S.scrolls=(S.scrolls||0)+SCROLL_DAILY;S.gems+=2;setTimeout(()=>toast(`🎁 Ежедневный подарок: +📜${SCROLL_DAILY} свитков, +💎2`),800)}
const _off=allTiles().reduce((a,t)=>a+habStored(t),0);if(_off>0)toast(`🌙 В жилищах накопилось 🪙${fmt(_off)} — собери на острове!`);S.lastLogin=Date.now();save();
updateTop();show("map");netConnect();
const _mb=document.createElement("button");_mb.id="musbtn";_mb.className="btn sm";_mb.textContent=S.music?"🔊":"🔇";_mb.title="Музыка";_mb.onclick=toggleMusic;$("#topbar").append(_mb);
const _av=document.createElement("img");_av.id="avatar";_av.className="av";_av.onclick=()=>show("friends");$("#topbar").prepend(_av);updateTop();
// приветствие
if(!S.quests.intro){S.quests.intro=1;save();modal(`<h2>🐉 Добро пожаловать, Хранитель!</h2><p>Это твой остров. Строй жилища, собирай драконов, корми их и сражайся на арене в пошаговых боях.</p><ul style="margin:8px 0 8px 18px;font-size:13px"><li>🗺️ <b>Остров</b> — постройки и доход</li><li>🐲 <b>Драконы</b> — прокачка и эволюция</li><li>⚔️ <b>Арена</b> — пошаговые бои 3×3</li><li>🏆 <b>События</b> — дракон месяца и недели</li><li>🏪 <b>Магазин</b> — яйца и драконы</li><li>⭐ Нажми на <b>уровень</b> вверху — увидишь дорогу наград</li></ul><div class="center"><img src="assets/d00.png" style="height:120px"></div><div class="row" style="justify-content:center"><button class="btn green" onclick="closeModal()">Начать!</button></div>`)}
