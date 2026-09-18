/* ================= I18N (RU → EN) =================
   Russian is the source language of the game. When the language is English,
   we (1) translate all data tables in place before game.js runs and
   (2) watch the DOM and translate every text node / title / placeholder
   that the game renders, using the dictionary in lang/en.js. */
(function(){
  const CYR=/[А-Яа-яЁё]/;
  const stored=localStorage.getItem("dml_lang");
  const auto=(navigator.language||"ru").toLowerCase().startsWith("ru")?"ru":"en";
  const LANG=stored||auto;
  window.LANG=LANG;
  window.setLang=l=>{localStorage.setItem("dml_lang",l);location.reload()};

  // language toggle button in the top bar (always available, in both languages)
  function addToggle(){
    const bar=document.getElementById("topbar");if(!bar||document.getElementById("langbtn"))return;
    const b=document.createElement("button");b.id="langbtn";b.className="btn sm";b.textContent=LANG==="en"?"RU":"EN";
    b.title=LANG==="en"?"Переключить на русский":"Switch to English";b.onclick=()=>setLang(LANG==="en"?"ru":"en");bar.append(b)}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",addToggle);else addToggle();
  // game.js appends music controls later — keep the language button last
  setTimeout(addToggle,0);setTimeout(()=>{const b=document.getElementById("langbtn");if(b)b.parentNode.append(b)},50);

  if(LANG!=="en"||!window.LANG_EN)return;
  document.documentElement.lang="en";

  const D=window.LANG_EN;
  const keys=Object.keys(D).sort((a,b)=>b.length-a.length);
  const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  // longest-first alternation; keys that start/end with a Cyrillic letter must not match inside a longer Cyrillic word
  const RE=new RegExp("(?<![А-Яа-яЁё])(?:"+keys.map(esc).join("|")+")(?![А-Яа-яЁё])","g");
  const cache=new Map();
  function tr(s){
    if(typeof s!=="string"||!CYR.test(s))return s;
    let v=cache.get(s);if(v!==undefined)return v;
    v=s.replace(RE,m=>D[m]);
    // second pass for pieces that only become matchable after the first one (rare)
    if(CYR.test(v))v=v.replace(RE,m=>D[m]);
    cache.set(s,v);return v}
  window.t=tr;

  // ---- 1) data tables ----
  const SKIP_KEYS=new Set(["id","img","src","bg","ico","code","el","els","key","k","kind","type","cls","file","sound","music"]);
  const seen=new WeakSet();
  function walk(o){
    if(!o||typeof o!=="object"||seen.has(o))return;seen.add(o);
    if(Array.isArray(o)){for(let i=0;i<o.length;i++){const v=o[i];if(typeof v==="string")o[i]=tr(v);else walk(v)}return}
    for(const k of Object.keys(o)){const v=o[k];if(typeof v==="string"){if(!SKIP_KEYS.has(k))o[k]=tr(v)}else walk(v)}}
  const TABLES=["ELEMENTS","RARITY","SKILLS","PASSIVE_INFO","FINAL_OPTIONS","BUILDINGS","DRAGONS","STAGES","ISLANDS","TRAININGS","TIMING","AVATARS","LEAGUES","CAMPAIGN","PHONE_EVENT","ZODIAC_EVENT","DUNGEON","SOVIET_EVENT","JOHNNY_EVENT","MOOSE_EVENT","RORY_EVENT","CHARA_MISSIONS","CHARA_ROOMS","LIBRARY"];
  window.__i18nData=function(){
    for(const n of TABLES){try{const v=(0,eval)(n);walk(v)}catch(e){}}
    try{const v=(0,eval)("MOOSE_EVENT");if(v&&v.code)v.code="лось.exe"}catch(e){}
  };

  // ---- 2) DOM ----
  const ATTRS=["title","placeholder","aria-label"];
  function fixNode(n){
    if(n.nodeType===3){if(CYR.test(n.nodeValue)){const v=tr(n.nodeValue);if(v!==n.nodeValue)n.nodeValue=v}return}
    if(n.nodeType!==1)return;
    for(const a of ATTRS){const v=n.getAttribute(a);if(v&&CYR.test(v)){const w2=tr(v);if(w2!==v)n.setAttribute(a,w2)}}
    if((n.tagName==="INPUT"&&(n.type==="button"||n.type==="submit"))||n.tagName==="OPTION"){if(CYR.test(n.value)){const w2=tr(n.value);if(w2!==n.value)n.value=w2}}
    const w=document.createTreeWalker(n,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT);
    let c;while(c=w.nextNode()){
      if(c.nodeType===3){if(CYR.test(c.nodeValue)){const v=tr(c.nodeValue);if(v!==c.nodeValue)c.nodeValue=v}}
      else{for(const a of ATTRS){const v=c.getAttribute(a);if(v&&CYR.test(v)){const w2=tr(v);if(w2!==v)c.setAttribute(a,w2)}}
        if((c.tagName==="INPUT"&&(c.type==="button"||c.type==="submit"))||c.tagName==="OPTION"){if(CYR.test(c.value)){const w2=tr(c.value);if(w2!==c.value)c.value=w2}}}}}
  const mo=new MutationObserver(list=>{
    for(const m of list){
      if(m.type==="characterData")fixNode(m.target);
      else if(m.type==="attributes")fixNode(m.target);
      else m.addedNodes.forEach(fixNode)}
    if(list.some(m=>m.addedNodes.length))fixLogo()});
  function fixLogo(){document.querySelectorAll(".logo,.boot-title").forEach(l=>{if(l.dataset.lg)return;const sp=l.querySelector("span");if(!sp)return;l.dataset.lg=1;const first=[...l.childNodes].find(n=>n.nodeType===3&&/Legends/.test(n.nodeValue));if(first&&/Dragon Mania/.test(sp.textContent)){first.nodeValue=first.nodeValue.replace("Legends","");sp.textContent="Dragon Mania";l.append(" Legends")}})}
  function start(){document.title=tr(document.title);fixNode(document.body);fixLogo();
    mo.observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTRS})}
  if(document.body)start();else document.addEventListener("DOMContentLoaded",start);

  // ---- 3) native dialogs ----
  const _c=window.confirm.bind(window),_p=window.prompt.bind(window),_a=window.alert.bind(window);
  window.confirm=m=>_c(tr(String(m)));window.prompt=(m,d)=>_p(tr(String(m)),d);window.alert=m=>_a(tr(String(m)));
})();
