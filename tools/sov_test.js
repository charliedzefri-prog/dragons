// usage: NODE_PATH=server/node_modules node tools/sov_test.js d131,d131,d131 [games]
const {w}=require('./tier.js');
(async()=>{await new Promise(r=>setTimeout(r,500));const b=w.document.querySelector('#b_local');if(b)b.click();await new Promise(r=>setTimeout(r,300));
const TEAM=(process.argv[2]||"d131,d131,d131").split(","),N=+process.argv[3]||10;let wins=0,rs=[];
for(let i=0;i<N;i++){await new Promise(res=>{w.__H=(win,r,hp)=>{w.__H=null;if(win)wins++;rs.push((win?"W":"L")+r);res()};
 w.eval(`S.level=30;__setup(${JSON.stringify(TEAM)},50);S.team=team;S.sovietFound=true;window.playDialog=(l,cb)=>cb&&cb();modal=(h)=>{const d=document.createElement("div");d.innerHTML=h;document.body.append(d);return d};pickTeamModal=(t,d,go)=>go();startSoviet();`);
 setTimeout(()=>{if(w.__H){w.__H=null;w.eval('B=null');rs.push("T");res()}},20000)})}
console.log(TEAM.join(","),"wins",wins+"/"+N,rs.join(" "));process.exit(0)})();
