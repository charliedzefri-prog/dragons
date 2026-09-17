// usage: NODE_PATH=server/node_modules node tools/rory_test.js d131,d131,d131 [floor]
const {w}=require('./tier.js');
(async()=>{await new Promise(r=>setTimeout(r,500));const b=w.document.querySelector('#b_local');if(b)b.click();await new Promise(r=>setTimeout(r,300));
const TEAM=(process.argv[2]||"d131,d131,d131").split(","),FL=+process.argv[3]||9;
w.__H=(win,r,hp)=>{console.log("END",win?"WIN":"LOSE","rounds",r,"allyHP",hp,"boss",w.__last);process.exit(0)};
w.eval(`S.level=30;__setup(${JSON.stringify(TEAM)},50);S.team=team;S.roryFound=true;roryState().floor=${FL};window.playDialog=(l,cb)=>cb&&cb();modal=(h)=>{const d=document.createElement("div");d.innerHTML=h;document.body.append(d);return d};pickTeamModal=(t,d,go)=>go();log=m=>{window.__last=B.enemies.map(x=>x.hp+"/"+x.maxhp).join();if(process_env_EQUAL===0&&/Рори →/.test(m)&&B.round<=3)console.log(m.replace(/<[^>]+>/g,""))};openRory();document.querySelector("#rgo").click();`);
setTimeout(()=>{console.log("TIMEOUT");process.exit(0)},20000)})();
