/* Hasta-Kala language layer: English (en), Hindi (hi), Kannada (kn).
   Works without editing each page: it translates text, placeholders, aria-labels and titles
   as they appear (and when JS draws new content), using the tables in i18n-dict.js.
   Anything not in the tables stays in English. Add ?i18n=debug to the URL to list missing strings in the console. */
(()=>{
const LANGS=[['en','English','EN'],['hi','हिन्दी','HI'],['kn','ಕನ್ನಡ','KN']],LOC={en:'en-IN',hi:'hi-IN',kn:'kn-IN'};
let lang='en';
try{const q=new URLSearchParams(location.search).get('lang');if(LANGS.some(l=>l[0]==q))localStorage.hk_lang=q;lang=localStorage.hk_lang||'en'}catch{}
if(!LANGS.some(l=>l[0]==lang))lang='en';
const debug=/[?&]i18n=debug/.test(location.search),missed=new Set();
const norm=s=>s.replace(/\s+/g,' ').trim();
const I18N=window.I18N={lang,loc:LOC[lang],LANGS,
 D:window.HK_DICT||{},P:window.HK_PATTERNS||[],
 /* tr(): translate one English string. Exact match first, then patterns like "{0} left". */
 tr(s){
  if(lang=='en'||s==null)return s;s=String(s);const k=norm(s);if(!k)return s;
  const col=lang=='hi'?0:1,lead=s.match(/^\s*/)[0],trail=s.match(/\s*$/)[0],wrap=o=>lead+o+trail,hit=I18N.D[k];
  if(hit&&hit[col])return wrap(hit[col]);
  for(const[re,hi,kn]of I18N.P){const m=k.match(re);if(m){const tpl=col?kn:hi;if(!tpl)continue;
    return wrap(tpl.replace(/\{(\d+)\}/g,(_,i)=>{const v=m[+i+1]??'';return I18N.D[v]?.[col]||v}))}}
  if(debug&&/[A-Za-z]{3,}/.test(k)&&!missed.has(k)){missed.add(k);console.info('[i18n missing]',k)}
  return s},
 /* t('Order #{0}',12): for strings built in code. Falls back to English if there is no entry. */
 t(s,...a){const r=I18N.tr(s);return a.length?String(r).replace(/\{(\d+)\}/g,(_,i)=>a[+i]??''):r},
 setLang(l){if(!LANGS.some(x=>x[0]==l))return;try{localStorage.hk_lang=l}catch{}const u=new URL(location.href);u.searchParams.delete('lang');location.href=u.toString()},
 switcher(){return `<label class="sr-only" for="hklang">Language</label><select id="hklang" class="hklang" aria-label="Language" data-no-i18n>${LANGS.map(([c,n])=>`<option value="${c}" ${c==lang?'selected':''}>${n}</option>`).join('')}</select>`},
 bindSwitcher(root=document){root.querySelectorAll('select.hklang').forEach(s=>{if(s.dataset.b)return;s.dataset.b=1;s.onchange=()=>I18N.setLang(s.value)})}
};
document.documentElement.lang=lang;
/* sign-in pages have no site header: give them their own small picker (every language, including English) */
const authUI=()=>{if(document.body.classList.contains('auth')&&!document.querySelector('.auth-lang'))document.body.insertAdjacentHTML('beforeend','<div class="auth-lang">'+I18N.switcher()+'</div>');I18N.bindSwitcher()};
document.readyState=='loading'?document.addEventListener('DOMContentLoaded',authUI):authUI();
if(lang=='en')return;
/* confirm() and alert() pop-ups are not part of the page, so translate them here */
const _c=window.confirm.bind(window),_a=window.alert.bind(window);window.confirm=m=>_c(I18N.tr(m));window.alert=m=>_a(I18N.tr(String(m)));
const SKIP=new Set(['SCRIPT','STYLE','TEXTAREA','CODE','PRE','NOSCRIPT','SVG','OPTION_NOPE']);
const ATTRS=['placeholder','aria-label','title','alt'];
const skip=n=>{for(let e=n.nodeType==1?n:n.parentElement;e;e=e.parentElement){if(SKIP.has(e.tagName)||e.hasAttribute&&e.hasAttribute('data-no-i18n'))return true}return false};
const doText=n=>{const v=n.nodeValue;if(!v||!/[A-Za-z]{2,}/.test(v)||skip(n))return;const r=I18N.tr(v);if(r!==v)n.nodeValue=r};
const doEl=e=>{if(e.nodeType!=1||skip(e))return;
 for(const a of ATTRS){const v=e.getAttribute(a);if(v&&/[A-Za-z]{2,}/.test(v)){const r=I18N.tr(v);if(r!==v)e.setAttribute(a,r)}}
 if(e.tagName=='INPUT'&&/^(submit|button)$/.test(e.type)&&e.value){const r=I18N.tr(e.value);if(r!==e.value)e.value=r}};
const walk=root=>{if(root.nodeType==3)return doText(root);if(root.nodeType!=1||skip(root))return;doEl(root);
 const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT);let n;while(n=w.nextNode()){n.nodeType==3?doText(n):doEl(n)}};
const title=()=>{const r=I18N.tr(document.title);if(r!==document.title)document.title=r};
let busy=false,pend=new Set(),timer=0;
const flush=()=>{timer=0;busy=true;try{pend.forEach(n=>{if(n.isConnected)walk(n)});pend.clear();title()}finally{busy=false}};
const mo=new MutationObserver(ms=>{if(busy)return;for(const m of ms){
  if(m.type=='childList')m.addedNodes.forEach(n=>pend.add(n));
  else if(m.type=='characterData')pend.add(m.target);
  else if(m.type=='attributes')pend.add(m.target)}
 if(!timer)timer=setTimeout(flush,0)});
const start=()=>{walk(document.body);title();I18N.bindSwitcher();
 mo.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTRS})};
document.readyState=='loading'?document.addEventListener('DOMContentLoaded',start):start();
})();
