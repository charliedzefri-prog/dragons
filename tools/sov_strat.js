// strategic ally AI vs soviets: control charging ones, focus fire lowest
const {w}=require('./tier.js');
(async()=>{await new Promise(r=>setTimeout(r,500));const b=w.document.querySelector('#b_local');if(b)b.click();await new Promise(r=>setTimeout(r,300));
const TEAM=(process.argv[2]||"d02,d32,d07").split(","),N=+process.argv[3]||6;let wins=0,rs=[];
w.eval(`const ai0=aiTurn;aiTurn=function(){if(!B)return;const f=B.cur;if(f.side!=="ally")return ai0();const foes=alive(B.enemies);const ready=f.skills.filter(k=>!(f.cds[k]>0));const S_=k=>SKILLS[k];
 const ctrl=ready.filter(k=>S_(k).type==="attack"&&(S_(k).effect==="stun"||S_(k).effect==="freeze"));const danger=foes.filter(x=>(x.charge||0)>=2&&!(x.fx||[]).some(e=>e.k==="stun"||e.k==="freeze"));
 let k,t;if(ctrl.length&&danger.length){k=ctrl[0];t=danger[0]}else{const heal=ready.find(k=>S_(k).type==="heal");if(heal&&B.allies.some(a=>a.hp>0&&a.hp<a.maxhp*.4)){useSkill(f,heal,null);return}const atks=ready.filter(k=>S_(k).type==="attack"&&!S_(k).oneshot).sort((a,b)=>S_(b).power-S_(a).power);k=atks[0]||ready[0];t=foes.slice().sort((a,b)=>a.hp-b.hp)[0]}
 useSkill(f,k,t)}`);
for(let i=0;i<N;i++){await new Promise(res=>{w.__H=(win,r,hp)=>{w.__H=null;if(win)wins++;rs.push((win?"W":"L")+r);res()};
 w.eval(`S.level=30;__setup(${JSON.stringify(TEAM)},50);S.team=team;S.sovietFound=true;window.playDialog=(l,cb)=>cb&&cb();modal=(h)=>{const d=document.createElement("div");d.innerHTML=h;document.body.append(d);return d};pickTeamModal=(t,d,go)=>go();log=m=>{if(B.round<=3)console.log(m.replace(/<[^>]+>/g,""))};log=m=>{if(B.round>=3&&B.round<=4)console.log(m.replace(/<[^>]+>/g,""),"|",B.enemies.map(x=>x.hp+"c"+(x.charge||0)).join())};startSoviet();`);
 setTimeout(()=>{if(w.__H){w.__H=null;w.eval('B=null');rs.push("T");res()}},20000)})}
console.log("STRAT",TEAM.join(","),"wins",wins+"/"+N,rs.join(" "));process.exit(0)})();
