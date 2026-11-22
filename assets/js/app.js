/* If config.js still has placeholder values the page used to stay blank. Show a clear message instead. */
(()=>{const C=window.CFG||{},bad=typeof supabase=='undefined'||!/^https:\/\/[^\s/]+\.[^\s/]+/.test(C.url||'')||/PASTE|YOUR/i.test((C.url||'')+(C.key||''))||String(C.key||'').length<40;if(!bad)return;
const msg=typeof supabase=='undefined'?'The Supabase library could not load. Check your internet connection and reload.':'<code>config.js</code> still has placeholder values. Open <b>Supabase → Project Settings → API</b>, copy the <b>Project URL</b> and the <b>anon public</b> key, paste them into <code>config.js</code>, then save, commit and redeploy.';
const show=()=>{document.body.innerHTML='<main style="max-width:34rem;margin:12vh auto;padding:1.5rem;font:16px/1.6 system-ui,sans-serif"><h1 style="font-size:1.4rem;margin:0 0 .6rem">Setup needed</h1><p>'+msg+'</p></main>'};
document.readyState=='loading'?document.addEventListener('DOMContentLoaded',show):show();throw new Error('Setup needed: config.js is not filled in')})();
const sb=supabase.createClient(CFG.url,CFG.key);
const $=s=>document.querySelector(s),inr=n=>'₹'+Number(n).toLocaleString('en-IN');
const esc=v=>String(v??'').replace(/[&<>"'`]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c]));
const safeUrl=(u,d='')=>/^(https?:\/\/|\/)/i.test(String(u||'').trim())?String(u).trim():d;
const B='btn b1',I='in';
// Cities we serve (Karnataka). a = other common spellings, so older shop records still match. Keep in sync with api/create-owner.js.
const CITIES=[{n:'Bengaluru',a:['Bangalore'],la:12.9716,lo:77.5946},{n:'Mysuru',a:['Mysore'],la:12.2958,lo:76.6394},{n:'Mangalore',a:['Mangaluru'],la:12.9141,lo:74.8560},{n:'Hubballi',a:['Hubli'],la:15.3647,lo:75.1240},{n:'Belagavi',a:['Belgaum'],la:15.8497,lo:74.4977},{n:'Shivamogga',a:['Shimoga'],la:13.9299,lo:75.5681}];
const cityOpts=(sel,all)=>(all?'<option value="">All cities</option>':'')+CITIES.map(c=>`<option ${c.n==sel?'selected':''}>${c.n}</option>`).join('')+(sel&&!CITIES.some(c=>c.n==sel)?`<option selected>${esc(sel)}</option>`:'');
const nearestCity=(la,lo)=>CITIES.map(c=>({c,km:Math.hypot(c.la-la,(c.lo-lo)*Math.cos(la*Math.PI/180))*111})).sort((x,y)=>x.km-y.km)[0];
const LOGIN={customer:'/login',staff:'/staff-login',owner:'/owner-login',super_admin:'/super-login'};
const Cart={get:()=>JSON.parse(localStorage.hk_cart||'[]'),set(c){localStorage.hk_cart=JSON.stringify(c);if(!c.length)localStorage.removeItem('hk_shop');Cart.badge()},
add(p,q=1){let c=Cart.get();if(c.length&&localStorage.hk_shop!=p.shop_id){if(!confirm('Your cart has items from another store. Clear it and add this item?'))return false;c=[]}localStorage.hk_shop=p.shop_id;const x=c.find(i=>i.id==p.id);x?x.qty=Math.min(x.qty+q,p.stock||x.qty+q):c.push({id:p.id,name:p.name,price:p.price,image_url:p.images?.[0]||p.image_url,stock:p.stock,qty:q});Cart.set(c);return true},
badge(){const n=Cart.get().reduce((a,i)=>a+i.qty,0);document.querySelectorAll('#cb,.cb-m').forEach(e=>e.textContent=n)}};
/* ===== v2.3 UI layer: inline notices (replace floating toasts), skeletons, empty + error screens ===== */
const icons=()=>window.lucide&&lucide.createIcons();
const msgOf=e=>{const m=String(e?.message||e||'');return /failed to fetch|networkerror|load failed|network request/i.test(m)||!navigator.onLine?'We couldn’t reach the server. Check your internet connection and try again.':m||'Something went wrong. Please try again.'};
function notice(msg,type='ok'){const n=$('#notice');if(!n)return alert(msg);clearTimeout(notice.t);const bad=type=='err';
n.innerHTML=`<div class="note ${bad?'err':'ok'}" role="${bad?'alert':'status'}"><i data-lucide="${bad?'circle-alert':'circle-check'}" class="w-5 h-5 shrink-0"></i><span>${esc(bad?msgOf(msg):msg)}</span><button type="button" aria-label="Dismiss">✕</button></div>`;
n.querySelector('button').onclick=()=>{n.innerHTML=''};icons();if(!bad)notice.t=setTimeout(()=>{n.innerHTML=''},6000)}
const skCards=(n=8)=>Array.from({length:n},()=>'<div class="pc" aria-hidden="true"><div class="sk pc-img"></div><div class="pc-body"><div class="sk h-4 rounded"></div><div class="sk h-4 w-1/2 rounded"></div><div class="sk h-8 rounded-full mt-2"></div></div></div>').join('');
const skRows=(n=3)=>Array.from({length:n},()=>'<div class="surf rounded-lg p-4 mb-3" aria-hidden="true"><div class="sk h-5 w-1/3 rounded mb-3"></div><div class="sk h-3 w-2/3 rounded mb-2"></div><div class="sk h-3 w-1/2 rounded"></div></div>').join('');
const skGrid=n=>`<div class="pgrid" role="status" aria-label="Loading">${skCards(n)}</div>`;
const skProduct='<div class="grid md:grid-cols-2 gap-6 surf p-4 rounded-lg" role="status" aria-label="Loading"><div class="sk aspect-square rounded"></div><div><div class="sk h-8 w-3/4 rounded mb-3"></div><div class="sk h-4 w-1/3 rounded mb-4"></div><div class="sk h-10 w-1/2 rounded mb-4"></div><div class="sk h-4 rounded mb-2"></div><div class="sk h-4 w-5/6 rounded"></div></div></div>';
const emptyBox=(icon,title,text='',action='')=>`<div class="surf rounded-lg p-10 text-center"><i data-lucide="${icon}" class="w-10 h-10 mx-auto mb-3 mute"></i><h2 class="font-bold text-lg mb-1">${title}</h2>${text?`<p class="mute mb-4">${text}</p>`:''}${action}</div>`;
const errBox=(e,o={})=>{console.error(e);const off=!navigator.onLine;return `<div class="surf rounded-lg p-10 text-center" role="alert"><i data-lucide="${off?'wifi-off':'triangle-alert'}" class="w-10 h-10 mx-auto mb-3 text-bad"></i><h2 class="font-bold text-lg mb-1">${off?'You’re offline':esc(o.title||'Something went wrong')}</h2><p class="mute mb-4">${esc(msgOf(e))}</p><div class="flex gap-2 justify-center flex-wrap"><button type="button" class="btn b1" onclick="location.reload()">Try again</button>${o.home===false?'':'<a href="/" class="btn b2">Back to stores</a>'}</div></div>`};
const must=r=>{if(r.error)throw r.error;return r.data};
const chk=r=>{if(r.error)throw r.error;return r};
const when=d=>new Date(d).toLocaleString(window.I18N?I18N.loc:'en-IN',{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'});
const day=d=>new Date(d).toLocaleDateString(window.I18N?I18N.loc:'en-IN',{day:'numeric',month:'short',year:'numeric'});
/* boot(): skeleton at once, builds the header, runs the page; any failure becomes an error screen with Retry. */
async function boot(fn,sk=skRows(3)){const A=$('#app');A.innerHTML=`<div role="status" aria-label="Loading">${sk}</div>`;
new MutationObserver(()=>{if(A.querySelector('i[data-lucide]'))icons()}).observe(A,{childList:true,subtree:true});
try{const U=await header();await fn(U,A)}catch(e){A.innerHTML=errBox(e)}icons()}
/* Back/forward button restores the old page (with the old owner header) from the browser cache: reload it so the header matches who is logged in now */
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload()});
window.addEventListener('unhandledrejection',e=>{notice(e.reason,'err')});
/* paged(): "Load more" list. load(from,to) must return a Supabase query fetched with {count:'exact'}. */
function paged({box,size=12,load,card,none,after}){let off=0;const foot=document.createElement('div');foot.className='text-center mt-6';box.after(foot);
const go=async()=>{const first=off==0;foot.innerHTML=first?'':'<button class="btn b2" disabled>Loading…</button>';
try{const{data,count,error}=await load(off,off+size-1);if(error)throw error;
if(first){box.innerHTML='';if(!data.length){box.className='';box.innerHTML=none;foot.remove();return}}
box.insertAdjacentHTML('beforeend',data.map(card).join(''));off+=data.length;after&&after(data);
foot.innerHTML=off<count?`<button class="btn b2" id="lm">Load more <span class="mute">(${off} of ${count})</span></button>`:count>size?`<p class="text-sm mute">You’ve reached the end (${count})</p>`:'';
const b=foot.querySelector('#lm');if(b)b.onclick=go}
catch(e){if(first){box.className='';box.innerHTML=errBox(e);foot.remove()}else{foot.innerHTML=`<p class="text-bad mb-2" role="alert">${esc(msgOf(e))}</p><button class="btn b2" id="lm">Try again</button>`;foot.querySelector('#lm').onclick=go}}};return go()}
/* Wishlist (customers only) */
const Wish={ids:new Set(),async load(U){if(!U.session||!U.buyer)return;Wish.ids=new Set(must(await sb.from('wishlist').select('product_id')).map(r=>r.product_id))},
heart:id=>`<button type="button" class="wish ${Wish.ids.has(id)?'on':''}" data-w="${id}" aria-pressed="${Wish.ids.has(id)}" aria-label="Save to wishlist"><i data-lucide="heart" class="w-5 h-5"></i></button>`,
async toggle(U,id,btn){if(!U.session)return location='/login?next='+encodeURIComponent(location.pathname+location.search);const on=Wish.ids.has(id);btn&&(btn.disabled=true);
const r=on?await sb.from('wishlist').delete().eq('product_id',id):await sb.from('wishlist').insert({product_id:id});btn&&(btn.disabled=false);
if(r.error){notice(r.error,'err');return on}on?Wish.ids.delete(id):Wish.ids.add(id);btn&&(btn.classList.toggle('on',!on),btn.setAttribute('aria-pressed',String(!on)));notice(on?'Removed from your wishlist':'Saved to your wishlist');return !on},
bind(box,U,onChange){box.addEventListener('click',async e=>{const b=e.target.closest('[data-w]');if(!b)return;e.preventDefault();const id=+b.dataset.w,now=await Wish.toggle(U,id,b);onChange&&onChange(id,now)})}};
/* Order progress (timeline) + payment labels, shared by customer orders and shop sales */
const STEPS=[['placed','Placed','clipboard-check'],['packed','Packed','package'],['shipped','Shipped','truck'],['delivered','Delivered','house']];
const PICK_STEPS=[['placed','Placed','clipboard-check'],['packed','Ready for pickup','package'],['delivered','Collected','house']];
const stepsFor=o=>o.fulfilment=='pickup'?PICK_STEPS:STEPS;
/* How an order was bought: home delivery, pickup from the store, or sold at the shop counter */
const ordType=o=>o.channel=='pos'||o.fulfilment=='counter'?['In store (counter)','t-info']:o.fulfilment=='pickup'?['Store pickup','t-info']:['Home delivery','t-ok'];
const payTag=o=>o.payment_status=='cod'&&o.fulfilment=='pickup'?['Pay at store','surf2']:(PS[o.payment_status]||[o.payment_status,'']);
const PS={paid:['Paid','t-ok'],pending:['Payment pending','t-bad'],cod:['Cash on delivery','surf2'],refund_due:['Refund due','t-bad']};
function timeline(o){const ev={};(o.order_events||[]).forEach(e=>{if(!ev[e.status]||e.created_at<ev[e.status])ev[e.status]=e.created_at});
const ST=stepsFor(o),cell=(s,cls,t)=>`<li class="tl-s ${cls}"><span class="tl-d"><i data-lucide="${s[2]}" class="w-4 h-4"></i></span><b>${s[1]}</b>${t?`<span>${esc(when(t))}</span>`:''}</li>`;
if(o.status=='cancelled')return `<ol class="tl" aria-label="Order progress">${ST.filter(s=>ev[s[0]]||s[0]=='placed').map(s=>cell(s,'done',ev[s[0]]||o.created_at)).join('')}${cell(['cancelled','Cancelled','ban'],'bad',ev.cancelled)}</ol>`;
const cur=ST.findIndex(s=>s[0]==o.status);return `<ol class="tl" aria-label="Order progress: ${esc(o.status)}">${ST.map((s,i)=>cell(s,i<=cur?'done':'',ev[s[0]]||(s[0]=='placed'?o.created_at:null))).join('')}</ol>`}
async function header(){let{data:{session}}=await sb.auth.getSession();let pf=null,out=false;
if(session)pf=must(await sb.from('profiles').select('*').eq('id',session.user.id).single());
/* Owner, staff and super admin who come back to the customer side of the site (store, product, cart...) are signed out automatically, so the customer pages never show a work header */
const at=location.pathname.replace(/\.html$/,'').replace(/\/index$/,'/')||'/';
if(session&&pf?.role&&pf.role!='customer'&&['/','/shop','/product','/cart','/wishlist','/orders','/profile'].includes(at)){await sb.auth.signOut();session=null;pf=null;out=true}
const role=pf?.role||null,TABS={customer:[['/orders','My Orders','package'],['/wishlist','Wishlist','heart'],['/profile','Profile','user']],staff:[['/pos','Billing','receipt'],['/sales','Sales','trending-up'],['/inventory','Inventory','boxes']],owner:[['/dashboard','Dashboard','layout-dashboard'],['/pos','Billing','receipt'],['/sales','Sales','trending-up'],['/inventory','Inventory','boxes'],['/delivery','Delivery','truck'],['/plans','Plan','crown'],['/settings','Settings','settings']],super_admin:[['/super','Super Admin','shield-check']]}[role]||[];
const here=location.pathname.replace(/\.html$/,''),shopPg=here.startsWith('/shop'),sid=esc(new URLSearchParams(location.search).get('id')),buyer=!role||role=='customer';
const tab=(h,l,i,x='')=>`<a href="${h}" class="tab ${here==h?'on':''}" ${x}><i data-lucide="${i}" class="w-4 h-4"></i>${l}</a>`;
document.querySelectorAll('body>header,body>.app-footer,#notice').forEach(e=>e.remove());/* never stack a second header/footer */
document.body.insertAdjacentHTML('afterbegin',`<header class="sticky top-0 z-40" style="background:#14181D;border-bottom:1px solid #2C343D"><div class="hk-head max-w-6xl mx-auto flex flex-wrap items-center gap-x-4 gap-y-2 p-3">
<a href="/" class="flex items-center gap-3 no-underline text-white min-w-0"><img src="/assets/icons/mark.svg" class="w-10 h-10 rounded-full object-cover shrink-0" alt="Hasta-Kala logo"><div class="leading-tight min-w-0"><div class="brand brand-name truncate">Hasta&#x200A;·&#x200A;Kala</div><div class="brand-sub">Handcrafted Heritage</div></div></a>
<div class="hk-actions">${buyer?'<a href="/cart" class="hk-ic" aria-label="Cart"><i data-lucide="shopping-cart" class="w-5 h-5"></i><b class="cb-m tab-cnt">0</b></a>':''}<button type="button" id="hkm" class="hk-ic" aria-label="Menu" aria-expanded="false" aria-controls="hknav"><i data-lucide="menu" class="w-5 h-5"></i></button></div>
${buyer?`<form action="${shopPg?'/shop':'/'}" class="hk-search flex-1 min-w-[10rem]">${shopPg?`<input type="hidden" name="id" value="${sid}">`:''}<input name="q" class="in" style="min-height:38px" placeholder="${shopPg?'Search in this store':'Search crafts, stores or city'}"><button type="button" id="lensb" class="hk-lens" aria-label="Search by photo" title="Search by photo"><i data-lucide="scan-search" class="w-5 h-5"></i></button></form>`:'<div class="hk-spacer flex-1"></div>'}
<nav id="hknav" class="hk-nav flex flex-wrap gap-1 items-center max-w-full" aria-label="Main">${TABS.map(t=>tab(...t)).join('')}${session?'<a href="#" id="lo" class="tab"><i data-lucide="log-out" class="w-4 h-4"></i>Logout</a>':tab('/login','Login','log-in')+tab('/owner-login','Seller login','store')+tab('/staff-login','Staff','users')}${buyer?`<a href="/cart" class="tab hk-navcart ${here=='/cart'?'on':''}"><i data-lucide="shopping-cart" class="w-4 h-4"></i>Cart <b id="cb" class="tab-cnt">0</b></a>`:''}<span class="hk-lang">${I18N.switcher()}</span></nav></div></header><div id="notice" role="region" aria-label="Messages"></div>`);
const hh=()=>document.documentElement.style.setProperty('--hh',($('body>header')?.offsetHeight||64)+'px');hh();addEventListener('resize',hh);addEventListener('orientationchange',hh);if(window.ResizeObserver)new ResizeObserver(hh).observe($('body>header'));
const hd=$('body>header'),mb=$('#hkm'),setM=o=>{hd.classList.toggle('hk-open',o);mb.setAttribute('aria-expanded',o);mb.innerHTML=`<i data-lucide="${o?'x':'menu'}" class="w-5 h-5"></i>`;window.lucide&&lucide.createIcons()};mb.addEventListener('click',e=>{e.stopPropagation();setM(!hd.classList.contains('hk-open'))});document.addEventListener('click',e=>{if(hd.classList.contains('hk-open')&&!e.target.closest('#hknav'))setM(false)});document.addEventListener('keydown',e=>{if(e.key=='Escape')setM(false)});
document.body.insertAdjacentHTML('beforeend',`<footer class="app-footer"><img src="/assets/icons/mark.svg" class="w-5 h-5 rounded-full" alt=""><span class="app-footer-brand">© ${new Date().getFullYear()} <b class="brand-foot">Hasta&#x200A;·&#x200A;Kala</b><span class="fsep" aria-hidden="true"></span>Handcrafted Heritage</span><nav class="app-footer-links" aria-label="Footer" style="margin-left:auto"><a href="/about">About</a><a href="/contact">Contact</a><a href="/add-shop">Add your shop</a><a href="/shipping-returns">Shipping &amp; Returns</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav></footer>`);
$('#lo')?.addEventListener('click',async e=>{e.preventDefault();await sb.auth.signOut();location.replace('/')});I18N.bindSwitcher();$('#lensb')?.addEventListener('click',()=>window.Lens&&Lens.open());Cart.badge();window.lucide&&lucide.createIcons();if(out)notice('You were signed out because you went back to the store.');return{session,role,shop:pf?.shop_id,pf,buyer}}
function guard(U,roles){if(!U.session){location=LOGIN[roles[0]]+'?next='+location.pathname;return false}
if(!roles.includes(U.role)){$('#app').innerHTML=emptyBox('lock','Access denied','This page is not available for your account type.','<a href="/" class="btn b1">Back to stores</a>');icons();return false}return true}
const GSVG='<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>';
async function loginPage(role){const A=$('#app'),nx=(n=>/^\/(?![\/\\])/.test(n||'')?n:null)(new URLSearchParams(location.search).get('next')),HOME={customer:'/',staff:'/pos',owner:'/dashboard',super_admin:'/super'};
const M={customer:{i:'shopping-bag',t:'Customer sign in',su:'Create customer account',d:'Browse stores, order handcrafted goods and track your purchases.',nu:'New here?'},
staff:{i:'store',t:'Staff sign in',su:'Create staff account',d:'Sell, check stock and review sales at the counter. Your shop owner creates your account.'},
owner:{i:'crown',t:'Owner sign in',su:'Create owner account',d:'Run your shop: products, staff, sales analytics and subscription. Your account is created by Hasta·Kala.',g:1},
super_admin:{i:'shield-check',t:'Super admin sign in',d:'Manage shops, subscriptions and users across Hasta·Kala.',g:1}}[role];
const ic=()=>window.lucide&&lucide.createIcons(),err=m=>{const e=A.querySelector('.auth-err');if(!e)return;e.hidden=!m;e.lastElementChild.textContent=m||''};
const field=(l,i,a,pw)=>`<label class="block"><span class="lbl">${l}</span><span class="ctl"><i data-lucide="${i}"></i><input class="in${pw?' pw':''}" ${pw?'data-pw':''} ${a}>${pw?'<button type="button" class="eye" aria-label="Show password" aria-pressed="false"><i data-lucide="eye"></i></button>':''}</span></label>`;
const done=async()=>{const{data:{session}}=await sb.auth.getSession();if(!session)return false;const{data:p}=await sb.from('profiles').select('role').eq('id',session.user.id).single();
if(p.role!=role){await sb.auth.signOut();err('This is not a '+M.t.replace(' sign in','').toLowerCase()+' account'+(role=='staff'?' yet. Ask your shop owner to create it.':role=='owner'?' yet. Ask Hasta·Kala to create it.':'.'));return false}
location=nx||HOME[role];return true};
/* Email verification by one-time code (6 digits). Needs Supabase "Confirm email" ON and {{ .Token }} in the Confirm signup email template. */
const otpStep=email=>{A.innerHTML=`<div class="auth-role"><span class="ico"><i data-lucide="mail-check"></i></span><div><h1>Check your email</h1><p>We sent an email to <b>${esc(email)}</b>. Open it and click the <b>confirmation link</b>, then sign in. If the email shows a 6-digit code instead, enter it below. Check the spam folder if you do not see it.</p></div></div>
<form id="of" class="auth-form" novalidate>${field('Code (only if your email has one)','shield-check','name="otp" inputmode="numeric" autocomplete="one-time-code" maxlength="10" required')}<div class="auth-err" role="alert" hidden><i data-lucide="circle-alert"></i><span></span></div><button class="btn auth-btn">Verify code</button></form>
<p class="text-center text-sm mt-3"><button type="button" id="rs" class="auth-link">Resend code</button> · <a href="#" id="bk" class="auth-link">Use a different email</a></p>`;ic();
 const cool=()=>{let n=60;const b=$('#rs');b.disabled=true;b.textContent='Resend code in '+n+'s';const t=setInterval(()=>{n--;if(!$('#rs')||$('#rs')!==b)return clearInterval(t);if(n<=0){clearInterval(t);b.disabled=false;b.textContent='Resend code'}else b.textContent='Resend code in '+n+'s'},1000)};cool();
 A.querySelector('.auth-form').addEventListener('input',()=>err(''));
 $('#bk').onclick=e=>{e.preventDefault();up=true;draw()};
 $('#rs').onclick=async()=>{const{error}=await sb.auth.resend({type:'signup',email});if(error)return err(/rate|seconds|too many/i.test(error.message)?'Please wait a minute before asking for another code.':error.message);err('');cool()};
 $('#of').onsubmit=async e=>{e.preventDefault();const t=String(e.target.otp.value).replace(/\s/g,'');if(!/^\d{6,10}$/.test(t))return err('Enter the code from your email.');
  const btn=A.querySelector('.auth-btn');btn.disabled=true;const{error}=await sb.auth.verifyOtp({email,token:t,type:'signup'});btn.disabled=false;
  if(error)return err(/expired|invalid/i.test(error.message)?'That code is wrong or has expired. Check it, or tap Resend code.':error.message);await done()}};
let up=false;const canUp=role=='customer';
const draw=()=>{A.innerHTML=`<div class="auth-role"><span class="ico"><i data-lucide="${M.i}"></i></span><div><h1>${up?M.su:M.t}</h1><p>${M.d}</p></div></div>
<form id="f" class="auth-form" novalidate>${up?field('Full name','id-card','name="fn" autocomplete="name"'):''}${field('Email','mail','type="email" name="em" autocomplete="email" required')}${field('Password','lock','type="password" name="pw" autocomplete="'+(up?'new':'current')+'-password" required',1)}
${up&&M.hint?`<p class="auth-hint">${M.hint}</p>`:''}<div class="auth-err" role="alert" hidden><i data-lucide="circle-alert"></i><span></span></div><button class="btn auth-btn ${M.g?'gold':''}">${up?'Create account':'Sign in'}</button></form>
${canUp?`<div class="auth-or">or</div><button type="button" id="gg" class="btn b2 w-full">${GSVG} Continue with Google</button>`:''}
${!up&&role!='super_admin'?'<p class="text-center text-sm mt-3"><a href="/forgot-password?r='+role+'" class="auth-link">Forgot password?</a></p>':''}
${canUp?`<p class="text-center text-sm mt-4 mute">${up?'Already have an account?':M.nu} <a href="#" id="tg" class="auth-link">${up?'Sign in':'Create account'}</a></p>`:''}`;ic();
A.querySelector('.auth-form').addEventListener('input',()=>err(''));
A.querySelectorAll('.eye').forEach(b=>b.onclick=()=>{const on=b.getAttribute('aria-pressed')!=='true';A.querySelectorAll('[data-pw]').forEach(i=>i.type=on?'text':'password');b.setAttribute('aria-pressed',on);b.innerHTML='<i data-lucide="'+(on?'eye-off':'eye')+'"></i>';ic()});
$('#tg')&&($('#tg').onclick=e=>{e.preventDefault();up=!up;draw()});
$('#gg')&&($('#gg').onclick=async()=>{const{error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname+(nx?'?next='+encodeURIComponent(nx):'')}});if(error)err(error.message)});
$('#f').onsubmit=async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.target));if(!d.em||!d.pw)return err('Enter your email and password.');
const btn=A.querySelector('.auth-btn'),c={email:d.em.trim(),password:d.pw},signup=up&&canUp;
if(signup&&d.pw.length<8)return err('Use a password of at least 8 characters.');
btn.disabled=true;const{data,error}=signup?await sb.auth.signUp({...c,options:{emailRedirectTo:location.origin+'/login',data:{full_name:(d.fn||'').trim()}}}):await sb.auth.signInWithPassword(c);btn.disabled=false;
if(error){if(/not confirmed/i.test(error.message)){await sb.auth.resend({type:'signup',email:c.email});return otpStep(c.email)}
 return err(/rate|seconds|too many/i.test(error.message)?'Too many attempts. Please wait a minute and try again.':error.message)}
if(signup&&data.user&&data.user.identities&&!data.user.identities.length)return err('This email is already registered. Please sign in instead.');
if(signup&&!data.session)return otpStep(c.email);
await done()}};
draw();await done()}
async function api(path,body){const{data:{session}}=await sb.auth.getSession();const r=await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify(body)});
const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Server error ('+r.status+'). Are the API env vars set?');return j}
const loadRzp=()=>new Promise((ok,no)=>{if(window.Razorpay)return ok();const s=document.createElement('script');s.src='https://checkout.razorpay.com/v1/checkout.js';s.onload=ok;s.onerror=()=>no(new Error('Could not load Razorpay'));document.head.append(s)});
async function pay(createPath,createBody,verifyPath,verifyBody,desc,email){const c=await api(createPath,createBody);await loadRzp();
return new Promise((ok,no)=>{const rz=new Razorpay({key:c.key,amount:c.amount,currency:'INR',name:'Hasta-Kala',description:desc,order_id:c.razorpay_order_id,prefill:{email},theme:{color:'#f59e0b'},
handler:async r=>{try{await api(verifyPath,{...verifyBody,...r});ok(true)}catch(e){no(e)}},modal:{ondismiss:()=>ok(false)}});rz.on('payment.failed',r=>notice(r.error.description,'err'));rz.open()})}

const BIZ=Object.assign({name:'Hasta·Kala',legalName:'[Registered business name]',email:'support@your-domain.example',phone:'',address:'[Registered address]',grievanceOfficer:'[Grievance officer name]',jurisdiction:'[City, State]',returnDays:7,refundDays:7,updated:'15 November 2026'},window.CFG?.biz||{});

/* Delivery (shop-fulfilled). deliveryCalc mirrors the database function delivery_calc, which is the authority at checkout. */
/* Product photos: up to 5 per product, stored in Supabase Storage (bucket product-images). The first photo is the cover. */
const MAX_IMG=5;
const prodImgs=p=>(Array.isArray(p.images)&&p.images.length?p.images:(p.image_url?[p.image_url]:[])).slice(0,MAX_IMG);
async function shrinkImage(file,max=1280,q=.82){
 if(!/^image\/(jpeg|png|webp)$/.test(file.type))throw new Error('Use a JPG, PNG or WebP photo.');
 if(file.size>15*1024*1024)throw new Error('That photo is too large (max 15 MB).');
 const bmp=await createImageBitmap(file),k=Math.min(1,max/Math.max(bmp.width,bmp.height)),c=document.createElement('canvas');
 c.width=Math.round(bmp.width*k);c.height=Math.round(bmp.height*k);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(bmp,0,0,c.width,c.height);bmp.close&&bmp.close();
 const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',q));if(!blob)throw new Error('Could not process that photo.');
 if(blob.size>2*1024*1024)throw new Error('That photo is still too large after shrinking. Try a smaller one.');return blob}
async function uploadProductImage(shopId,file){const blob=await shrinkImage(file);
 const path=shopId+'/'+(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2))+'.jpg';
 const{error}=await sb.storage.from('product-images').upload(path,blob,{contentType:'image/jpeg',cacheControl:'31536000'});
 if(error)throw new Error(/row-level|policy|bucket|not found/i.test(error.message)?'Photo upload is not set up yet. Run supabase/full_setup.sql again.':error.message);
 return sb.storage.from('product-images').getPublicUrl(path).data.publicUrl}
const dropStoredImage=url=>{const m=String(url).match(/\/object\/public\/product-images\/(.+)$/);m&&sb.storage.from('product-images').remove([decodeURIComponent(m[1])]).catch(()=>{})};
/* ---- Delivery v2.5: three zones (same area / same state / rest of India), a packing time and an estimated delivery date ---- */
const ZONES={local:{n:'Local',d:'Same area as the shop (first 3 pincode digits match)'},state:{n:'Within state',d:'Same state, worked out from the pincode series'},india:{n:'Rest of India',d:'Everywhere else in India'}};
/* state of a pincode from its first two digits (India Post series). Keep in sync with the database function pin_region. */
const pinRegion=pin=>{pin=String(pin||'');if(!/^[1-9]\d{5}$/.test(pin))return null;const a=pin.slice(0,2),n=+a,R=[[12,13,'HR'],[14,16,'PB'],[18,19,'JK'],[20,28,'UP'],[30,34,'RJ'],[36,39,'GJ'],[40,44,'MH'],[45,48,'MP'],[50,53,'TG'],[56,59,'KA'],[60,64,'TN'],[67,69,'KL'],[70,74,'WB'],[75,77,'OD'],[78,79,'NE'],[80,85,'BR']];const r=R.find(x=>n>=x[0]&&n<=x[1]);return r?r[2]:a};
const zoneOf=(s,pin)=>{pin=String(pin||'');if(!/^[1-9]\d{5}$/.test(pin)||!s.pincode)return 'india';return pin.slice(0,3)==s.pincode.slice(0,3)?'local':pinRegion(pin)&&pinRegion(pin)==pinRegion(s.pincode)?'state':'india'};
const zoneFee=(s,z)=>+(z=='local'?s.delivery_local_fee:z=='state'?(s.delivery_state_fee??s.delivery_far_fee):s.delivery_far_fee)||0;
const zoneDays=(s,z)=>String(z=='local'?s.local_days:z=='state'?(s.state_days||s.far_days):s.far_days||'');
const dayNums=t=>(String(t).match(/\d+/g)||[]).map(Number);
const dShort=d=>d.toLocaleDateString(window.I18N?I18N.loc:'en-IN',{weekday:'short',day:'numeric',month:'short'});
/* "3-5" days + 1 day packing  ->  "Tue, 24 Nov – Thu, 26 Nov". Never returns a past date. */
const etaText=(days,handling=1)=>{const n=dayNums(days);if(!n.length)return '';const lo=Math.min(...n)+(+handling||0),hi=Math.max(...n)+(+handling||0),a=new Date(),b=new Date();a.setDate(a.getDate()+lo);b.setDate(b.getDate()+hi);return lo==hi?dShort(a):dShort(a)+' – '+dShort(b)};
const deliveryInfo=s=>{const f=n=>+n?inr(n):'Free',p=[];
if(s.delivery_enabled===false){p.push('Home delivery not offered')}else{p.push('Local '+f(s.delivery_local_fee)+' · '+s.local_days+' days');
if(s.delivery_state_fee!=null&&s.state_days)p.push('Within state '+f(s.delivery_state_fee)+' · '+s.state_days+' days');if(s.ships_india!==false){p.push('Rest of India '+f(s.delivery_far_fee)+' · '+s.far_days+' days')}else p.push('Delivers within its own state only');
if(+s.free_above>0)p.push('Free delivery above '+inr(s.free_above))}
p.push(s.cod_enabled?'Cash on delivery available':'Online payment only');if(s.pickup_enabled)p.push('Store pickup available');return p.join(' · ')};
/* mirrors the database function delivery_calc, which is the authority at checkout */
const deliveryCalc=(s,pin,sub)=>{pin=String(pin||'');if(s.delivery_enabled===false)return{ok:false,msg:'This store does not offer home delivery. Please choose store pickup.'};
const z=zoneOf(s,pin);
if(z=='india'&&s.ships_india===false)return{ok:false,msg:'This store delivers only within its own state. Please choose a different address or store.'};
const free=+s.free_above>0&&sub>=+s.free_above,days=zoneDays(s,z);
return{ok:true,zone:z,local:z=='local',fee:free?0:zoneFee(s,z),days,eta:etaText(days,s.handling_days),freeLeft:+s.free_above>0&&!free?+s.free_above-sub:0}};
const shipInfo=o=>{if(o.fulfilment=='pickup'||(!o.courier&&!o.tracking_no))return '';const t=String(o.tracking_no||''),link=/^https?:\/\//i.test(t)?`<a class="underline" href="${esc(t)}" target="_blank" rel="noopener">Track parcel</a>`:esc(t);
return `<p class="text-sm mt-1"><i data-lucide="truck" class="w-4 h-4 inline"></i> ${o.courier?'Shipped via <b>'+esc(o.courier)+'</b>':'Tracking'}${t?' · '+link:''}</p>`};

/* Order number shown to people: counts 1,2,3... inside each shop (falls back to the global id until the database migration is run) */
const ordNo=o=>o.shop_order_no||o.id;

/* Expected delivery of a placed order: order date + packing days + zone days (same rule as the cart). Only for home delivery that is still on its way. */
const orderEta=o=>{if(!o||o.status=='cancelled'||o.status=='delivered'||o.channel=='pos'||o.fulfilment!='delivery'||!o.shops)return '';
const pin=o.address&&o.address.pincode,z=zoneOf(o.shops,pin),n=dayNums(zoneDays(o.shops,z));if(!n.length)return '';
const h=+o.shops.handling_days||0,base=new Date(o.created_at),a=new Date(base),b=new Date(base);a.setDate(a.getDate()+Math.min(...n)+h);b.setDate(b.getDate()+Math.max(...n)+h);
const t=new Date();t.setHours(0,0,0,0);
const txt=a.toDateString()==b.toDateString()?dShort(a):dShort(a)+' – '+dShort(b);
return `<div class="eta ord-eta mt-3"><i data-lucide="truck" class="w-5 h-5 shrink-0"></i><span class="ord-eta-t"><span class="block text-xs">Expected delivery</span>${b<t?'<b>Arriving any day now</b>':'<b>'+esc(txt)+'</b>'}</span></div>`};

/* ===== v2.5 helpers: paging through all rows, dates, charts, CSV, shop logo ===== */
/* Supabase returns at most 1000 rows per request. fetchAll(f) calls f(from,to) (a query) page by page until everything is read. */
async function fetchAll(f,cap=20000){const out=[];for(let o=0;o<cap;o+=1000){const d=must(await f(o,o+999));out.push(...d);if(d.length<1000)break}return out}
const startOfDay=(d=new Date())=>{const x=new Date(d);x.setHours(0,0,0,0);return x};
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const ymd=d=>{const x=new Date(d);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')};
const pctChange=(c,p)=>p>0?Math.round((c-p)/p*100):(c>0?null:0);
const deltaTag=(c,p,inv)=>{const d=pctChange(c,p);if(d===null)return '<span class="dl dl-n">new</span>';if(d===0)return '<span class="dl dl-n">no change</span>';const good=inv?d<0:d>0;return `<span class="dl ${good?'dl-up':'dl-dn'}">${d>0?'▲':'▼'} ${Math.abs(d)}%</span>`};
const kpi=(l,v,sub='',tip='')=>`<div class="surf rounded-lg p-3 kpi" ${tip?`title="${esc(tip)}"`:''}><div class="text-xs mute">${l}</div><div class="text-xl font-bold">${v}</div>${sub?`<div class="text-xs mute mt-1">${sub}</div>`:''}</div>`;
const chips=(name,opts,cur)=>`<div class="chips" role="group" aria-label="${name}">${opts.map(([v,l])=>`<button type="button" class="chip ${String(v)==String(cur)?'on':''}" data-${name}="${v}" aria-pressed="${String(v)==String(cur)}">${l}</button>`).join('')}</div>`;
/* stacked bar chart as inline SVG. rows=[{l:'Mon',v:[counter,online]}], series=[{n:'Counter',c:'var(--gold)'},...] */
function barChart(rows,series,{h=170,fmt=inr}={}){const W=640,pl=44,pb=22,pt=8,iw=W-pl-6,ih=h-pb-pt,tot=r=>r.v.reduce((a,b)=>a+b,0),mx=Math.max(1,...rows.map(tot)),bw=iw/rows.length,gap=Math.min(6,bw*.25);
const nice=(()=>{const p=Math.pow(10,Math.floor(Math.log10(mx))),f=mx/p;return(f<=1?1:f<=2?2:f<=5?5:10)*p})(),ticks=[0,.5,1].map(t=>nice*t);
const lab=Math.ceil(rows.length/12);
return `<svg viewBox="0 0 ${W} ${h}" class="w-full" role="img" aria-label="Bar chart" style="height:auto;max-height:${h+40}px">${ticks.map(t=>{const y=pt+ih-t/nice*ih;return `<line x1="${pl}" x2="${W-6}" y1="${y}" y2="${y}" style="stroke:var(--line)"/><text x="${pl-6}" y="${y+4}" text-anchor="end" font-size="10" style="fill:var(--mute)">${t>=1e5?(t/1e5).toFixed(t%1e5?1:0)+'L':t>=1e3?(t/1e3).toFixed(t%1e3?1:0)+'k':t}</text>`}).join('')}
${rows.map((r,i)=>{let y=pt+ih;const x=pl+i*bw+gap/2;const bars=r.v.map((v,k)=>{const hh=v/nice*ih;y-=hh;return hh>0?`<rect x="${x}" y="${y}" width="${Math.max(1,bw-gap)}" height="${hh}" rx="2" style="fill:${series[k].c}"></rect>`:''}).join('');
return `<g><title>${esc(r.l)}: ${rows.length&&series.length>1?series.map((s,k)=>s.n+' '+fmt(r.v[k])).join(' · '):fmt(tot(r))}</title><rect x="${x}" y="${pt}" width="${Math.max(1,bw-gap)}" height="${ih}" fill="transparent"/>${bars}${i%lab==0?`<text x="${x+(bw-gap)/2}" y="${h-6}" text-anchor="middle" font-size="10" style="fill:var(--mute)">${esc(r.l)}</text>`:''}</g>`}).join('')}</svg>${series.length>1?`<div class="flex gap-4 text-xs mute mt-1 flex-wrap">${series.map(s=>`<span class="flex items-center gap-1"><i style="width:10px;height:10px;border-radius:2px;background:${s.c};display:inline-block"></i>${esc(s.n)}</span>`).join('')}</div>`:''}`}
/* horizontal bars: rows=[{l,v,s}] (s = small text under the label) */
const hBars=(rows,fmt=inr)=>{const mx=Math.max(1,...rows.map(r=>r.v));return rows.length?rows.map(r=>`<div class="mb-2"><div class="flex justify-between gap-2 text-sm"><span class="min-w-0" style="overflow-wrap:anywhere">${esc(r.l)}${r.s?`<span class="block text-xs mute">${esc(r.s)}</span>`:''}</span><b class="shrink-0">${fmt(r.v)}</b></div><div class="rounded surf2" style="height:6px"><div class="bar rounded" style="height:6px;width:${Math.max(2,r.v/mx*100)}%"></div></div></div>`).join(''):'<p class="text-sm mute">Nothing to show yet.</p>'};
function csvDownload(name,rows){const q=v=>{v=v==null?'':String(v);if(/^[=+\-@\t\r]/.test(v))v="'"+v;return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
const blob=new Blob(['\ufeff'+rows.map(r=>r.map(q).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
/* Shop logo: stored in the same bucket as product photos, in the shop's own folder (the existing storage rules already allow this). */
async function uploadShopLogo(shopId,file){const blob=await shrinkImage(file,600,.9),path=shopId+'/logo-'+(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2))+'.jpg';
const{error}=await sb.storage.from('product-images').upload(path,blob,{contentType:'image/jpeg',cacheControl:'31536000'});
if(error)throw new Error(/row-level|policy|bucket|not found/i.test(error.message)?'Logo upload is not set up yet. Run supabase/full_setup.sql again.':error.message);
return sb.storage.from('product-images').getPublicUrl(path).data.publicUrl}
/* is this order money Hasta-Kala / the shop has actually received? (paid online, or cash collected on delivery / at the store) */
const earnedOrder=o=>o.status!='cancelled'&&(o.payment_status=='paid'||(o.payment_status=='cod'&&o.status=='delivered'));
/* who made the sale, for the Sales list and bills */
const soldBy=o=>o.channel=='pos'?(o.sold_by_name?esc(o.sold_by_name)+' ('+(o.sold_by_role=='owner'?'Owner':'Staff')+')':'Counter (unknown)'):'Customer (online)';

/* ===== v2.6 card design (clean marketplace) ===== */
const shopTags=s=>{const t=[];if(s.delivery_enabled!==false)t.push('<span class="tag dl-t"><i data-lucide="truck"></i>Delivery</span>');if(s.pickup_enabled)t.push('<span class="tag pk-t"><i data-lucide="store"></i>Pickup</span>');
if(s.delivery_enabled!==false&&+s.free_above>0)t.push(`<span class="tag off-t">Free above ${inr(s.free_above)}</span>`);if(!t.length)t.push('<span class="tag off-t">Visit store</span>');return t.join('')};
const shopLogo=s=>esc(safeUrl(s.logo_url,'/assets/icons/mark.svg'));
const storeCard=s=>`<a href="/shop?id=${s.id}" class="sc sc-${(s.id||0)%6}"><div class="sc-band"></div><img src="${shopLogo(s)}" loading="lazy" alt="" class="sc-logo"><div class="sc-body"><div class="sc-name">${esc(s.name)}</div><div class="sc-city"><i data-lucide="map-pin" class="w-3.5 h-3.5"></i>${esc(s.city)}</div><p class="sc-desc">${esc(s.description)}</p><div class="sc-tags">${shopTags(s)}</div></div></a>`;
/* o: heart (show wishlist heart), shop ({id,name} to show the store line), add (show Add button, default true), attr (extra attributes on the card) */
const prodCard=(p,o={})=>{const img=esc(safeUrl(p.images?.[0]||p.image_url,'/assets/icons/mark.svg')),off=p.mrp>p.price?Math.round(100-p.price*100/p.mrp):0,out=p.stock<1,href='/product?id='+p.id,nm=esc(p.name);
return `<div class="pc" ${o.attr||''}><div class="pc-img"><a href="${href}" tabindex="-1" aria-hidden="true" style="display:block;height:100%"><img src="${img}" loading="lazy" alt=""></a>${off?`<span class="pc-badge">${off}% OFF</span>`:''}${!out&&p.stock<=5?`<span class="pc-low">Only ${p.stock} left</span>`:''}${out?'<span class="pc-sold">Sold out</span>':''}${o.heart?Wish.heart(p.id):''}</div>
<div class="pc-body">${o.shop?`<a class="pc-shop" href="/shop?id=${o.shop.id}"><i data-lucide="store"></i><span>${esc(o.shop.name)}</span></a>`:''}<a class="pc-name" href="${href}">${nm}</a>
<div class="pc-foot"><div class="pc-price"><b>${inr(p.price)}</b>${off?`<s>${inr(p.mrp)}</s>`:''}</div>${o.add===false?'':`<button type="button" data-id="${p.id}" class="pc-add" ${out?'disabled':''} aria-label="${out?'Sold out':'Add '+nm+' to cart'}">${out?'<span class="t">Sold out</span>':'<i data-lucide="plus"></i><span class="t">Add</span>'}</button>`}</div></div></div>`};
