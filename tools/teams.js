// Round-robin of candidate teams using the real engine (reuses tier.js harness)
const fs=require('fs');const {w,fight,LVL}=require('./tier.js');const GAMES=+process.argv[2]||40;
const TEAMS={
 "Тиран+2 Бога":["d63","d59","d30"],
 "3 Легенды часов":["d75","d10","d93"],
 "Ошибка+Паладин+Голем":["d31","d121","d107"],
 "Голем+Сосал+Самолёт":["d107","d52","d48"],
 "Серафим+Т-Рекс+Ошибка":["d59","d30","d31"],
 "Доки-легенды (хил)":["d15","d56","d121"],
 "Dolphy+Ошибка+Сосал":["d63","d31","d52"],
 "Эпики часов (без легенд)":["d130","d86","d85"],
 "Эпик-мех (без легенд)":["d24","d92","d113"],
 "Бюджет: Гнев+Чревоуг+Дримкор":["d49","d50","d86"],
 "Кот-ночь":["d12","d66","d23"],
 "Овцы":["d36","d87","d88"],
};
(async()=>{
 await new Promise(r=>setTimeout(r,500));const b=w.document.querySelector('#b_local');if(b)b.click();await new Promise(r=>setTimeout(r,300));
 const names=Object.keys(TEAMS).filter(n=>TEAMS[n].every(id=>w.__pool.find(d=>d.id===id)));
 const W={},M={};names.forEach(n=>{W[n]=0;M[n]={}});
 for(let i=0;i<names.length;i++)for(let j=i+1;j<names.length;j++){let wi=0;
  for(let g=0;g<GAMES;g++){const swap=g%2;const a=swap?names[j]:names[i],bb=swap?names[i]:names[j];const r=await fight(TEAMS[a],TEAMS[bb]);const winner=r.win?a:bb;if(winner===names[i])wi++}
  M[names[i]][names[j]]=wi/GAMES;M[names[j]][names[i]]=1-wi/GAMES;W[names[i]]+=wi;W[names[j]]+=GAMES-wi;process.stderr.write('.')}
 const tot=(names.length-1)*GAMES;
 console.log("\nTEAM TIER lvl="+LVL);names.sort((a,b)=>W[b]-W[a]).forEach(n=>console.log(`  ${(W[n]/tot*100).toFixed(0).padStart(3)}%  ${n}  [${TEAMS[n].join(",")}]`));
 fs.writeFileSync('tools/teams_out.json',JSON.stringify({W,M,GAMES},null,1));process.exit(0)})();
