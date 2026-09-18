// Extract all Cyrillic string literals / template chunks from game.js, data.js, index.html
const acorn=require('acorn');const fs=require('fs');
const CYR=/[А-Яа-яЁё]/;
function extract(file){const src=fs.readFileSync(file,'utf8');const out=[];
  const ast=acorn.parse(src,{ecmaVersion:2022,sourceType:'script',locations:false});
  (function walk(n){if(!n||typeof n.type!=='string')return;
    if(n.type==='Literal'&&typeof n.value==='string'&&CYR.test(n.value))out.push({s:n.start,e:n.end,raw:src.slice(n.start,n.end),v:n.value,kind:'lit'});
    else if(n.type==='TemplateElement'&&CYR.test(n.value.cooked||''))out.push({s:n.start,e:n.end,raw:n.value.raw,v:n.value.cooked,kind:'tpl'});
    for(const k in n){const c=n[k];if(Array.isArray(c))c.forEach(walk);else if(c&&typeof c.type==='string')walk(c)}})(ast);
  return out}
const res={};let set=new Set();
for(const f of ['data.js','game.js']){res[f]=extract(f);res[f].forEach(x=>set.add(x.v))}
// index.html: text nodes & attribute values
const html=fs.readFileSync('index.html','utf8');const hs=[];
html.replace(/>([^<]*[А-Яа-яЁё][^<]*)</g,(m,t,off)=>{hs.push({s:off+1,e:off+1+t.length,v:t});set.add(t.trim());return m});
html.replace(/(placeholder|title|value)="([^"]*[А-Яа-яЁё][^"]*)"/g,(m,a,t,off)=>{const st=off+m.indexOf('"')+1;hs.push({s:st,e:st+t.length,v:t});set.add(t);return m});
res['index.html']=hs;
fs.writeFileSync('/tmp/i18n_index.json',JSON.stringify(res));
const arr=[...set].map(s=>s.trim()).filter(Boolean);arr.sort();
fs.writeFileSync('/tmp/ru_strings.json',JSON.stringify(arr,null,0));
console.log('unique',arr.length,'chars',arr.reduce((a,s)=>a+s.length,0));
