// Headless tier tester: runs the REAL battle engine (game.js) in jsdom, both sides AI, instant timers.
// usage: NODE_PATH=server/node_modules node tools/tier.js [games] [lvl]
const {JSDOM}=require('jsdom');const fs=require('fs');
const GAMES=+process.argv[2]||600,LVL=+process.argv[3]||30;
let html=fs.readFileSync('index.html','utf8').replace(/<script[^>]*src=[^>]*><\/script>/g,'');
const dom=new JSDOM(html,{runScripts:"dangerously",url:"http://localhost/",pretendToBeVisual:true});const w=dom.window;
w.console.log=console.log;w.addEventListener("error",e=>console.log("WERR",e.message));
["play","pause","load"].forEach(k=>w.HTMLMediaElement.prototype[k]=()=>Promise.resolve());
// instant timers
w.setTimeout=(f,ms,...a)=>{queueMicrotask(()=>{try{f(...a)}catch(e){console.log('TIMER ERR',e.stack.split('\n').slice(0,3).join(' | '))}});return 1};w.clearTimeout=()=>{};
w.requestAnimationFrame=f=>{queueMicrotask(()=>f(0));return 1};
let src=fs.readFileSync('data.js','utf8')+'\n'+fs.readFileSync('game.js','utf8');
// hooks: ally turns via aiTurn, timing = "good", no result modal, capture end
src=src.replace('if(B.cur.side==="enemy"){B.busy=true;setTimeout(aiTurn,900)}','B.busy=false;setTimeout(aiTurn,0)');
src=src.replace('function showTiming(mode,cb,timeb){','function showTiming(mode,cb,timeb){if(window.__H){cb("good");return}');
src=src.replace('function endBattle(win){','function endBattle(win){if(window.__H){const r=B.round;const a=B.allies.map(f=>f.hp);B=null;window.__H(win,r,a);return}');
src=src.replace('function aiTurn(){\n  if(!B)return;const f=B.cur;const foes=alive(B.allies),friends=alive(B.enemies);','function aiTurn(){\n  if(!B)return;const f=B.cur;const foes=alive(f.side==="ally"?B.enemies:B.allies),friends=alive(f.side==="ally"?B.allies:B.enemies);');
const sc=w.document.createElement('script');sc.textContent=src+`const process_env_EQUAL=${process.env.EQUAL?1:0};
toast=()=>{};modal=()=>w.document.createElement('div');closeModal=()=>{};show=()=>{};save=()=>{};updateTop=()=>{};renderBattle=()=>{};playMusic=()=>{};pop=()=>{};vfx=()=>{};lunge=()=>{};flash=()=>{};sndPlay=()=>{};
if(process_env_EQUAL){Object.values(RARITY).forEach(r=>r.mult=1);DRAGONS.forEach(d=>{d.base={hp:120,atk:30,def:16,spd:14}})}
window.__pool=DRAGONS.filter(d=>!d.boss&&!d.eventOnly&&!d.els.includes("soviet"));
window.__setup=function(ids,lvl){S.level=40;S.dragons={};ids.forEach(id=>{S.dragons[id]={lvl,stars:1+Math.floor((lvl-1)/10),xp:0,tree:{}}});team=ids.slice()};
window.__fight=function(a,b,lvl,cb){window.__H=(win,r,hp)=>{window.__H=null;cb(win,r,hp)};__setup(a,lvl);window.__B=()=>B;
  // enemies use PvP-like symmetric stats: build as allies-side fighters then flip
  const ov={lvl,stars:1+Math.floor((lvl-1)/10),enemy:false};
  const saveMk=mkFighter;const en=b.map((id,i)=>{const f=mkFighter(id,ov,"enemy",i);f.skills=dSkillsFor(id,lvl);return f});
  startBattle({name:"T",lvl,ids:b,bg:null});
  B.enemies=en;[...B.allies,...B.enemies].forEach(f=>{f.maxhp=Math.round(f.maxhp*0.75);f.hp=f.maxhp});B.round=0;B.queue=[];nextTurn(true)};
window.dSkillsFor=function(id,lvl){const d=dInfo(id);const out=baseSkills(id).filter((k,i)=>lvl>=SLOT_LEVEL[i]);if(lvl>=8)out.push(ELEMENT_SPREAD[d.els[0]]);if(lvl>=12)out.push(ELEMENT_ABILITY[d.els[0]]);return out};
window.__ready=true;`;
w.document.body.appendChild(sc);
function fight(a,b){return new Promise(res=>{try{w.__fight(a,b,LVL,(win,r)=>res({win,r}))}catch(e){console.log("ERR",e.message);res({win:false,r:0})}})}
module.exports={w,fight,LVL};
if(require.main===module)(async()=>{
 await new Promise(r=>setTimeout(r,500));
 const b=w.document.querySelector('#b_local');if(b)b.click();await new Promise(r=>setTimeout(r,300));
 // silence toasts/modals
 const pool=w.__pool;const R=n=>Math.floor(Math.random()*n);
 const pick3=()=>{const t=[];while(t.length<3){const d=pool[R(pool.length)];if(!t.includes(d))t.push(d)}return t};
 const dw={},dg={},ew={},eg={};let rounds=0,to=0;
 const s1=Date.now();
 for(let g=0;g<GAMES;g++){const A=pick3(),Bt=pick3();const r=await fight(A.map(d=>d.id),Bt.map(d=>d.id));rounds+=r.r;if(r.r>=60)to++;if(g===0)console.log('first fight',r);
  A.forEach(d=>{dg[d.id]=(dg[d.id]||0)+1;if(r.win)dw[d.id]=(dw[d.id]||0)+1;d.els.forEach(e=>{eg[e]=(eg[e]||0)+1;if(r.win)ew[e]=(ew[e]||0)+1})});
  Bt.forEach(d=>{dg[d.id]=(dg[d.id]||0)+1;if(!r.win)dw[d.id]=(dw[d.id]||0)+1;d.els.forEach(e=>{eg[e]=(eg[e]||0)+1;if(!r.win)ew[e]=(ew[e]||0)+1})});
  if(g%100===99)process.stderr.write(`${g+1}/${GAMES} ${((Date.now()-s1)/1000)|0}s\n`)}
 console.log(`games=${GAMES} lvl=${LVL} avgRounds=${(rounds/GAMES).toFixed(1)} timeouts=${to}`);
 const els=Object.keys(eg).map(e=>[e,ew[e]/eg[e],eg[e]]).sort((a,b)=>b[1]-a[1]);
 console.log("ELEMENTS:");els.forEach(([e,p,n])=>console.log(`  ${e.padEnd(8)} ${(p*100).toFixed(0)}%  (n=${n})`));
 const ds=Object.keys(dg).filter(id=>dg[id]>=8).map(id=>[id,dw[id]/dg[id],dg[id]]).sort((a,b)=>b[1]-a[1]);
 console.log("DRAGONS:");ds.forEach(([id,p,n])=>{const d=pool.find(x=>x.id===id);console.log(`  ${id} ${(p*100).toFixed(0)}% ${d.rarity} [${d.els.join(",")}] ${d.name}`)});
 fs.writeFileSync(process.env.EQUAL?'tools/tier_equal.json':'tools/tier_out.json',JSON.stringify({els,ds},null,1));
 process.exit(0)})();
