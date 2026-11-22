/* Hasta-Kala Lens v7: search the shop by photo, in the browser (no server, no API key).
   How it works, in short:
   1. The photo is cut into several "views" (whole picture, the product cut out from its background, crops, small tilts, sliding windows).
   2. Every product picture is reduced once to a fingerprint (silhouette, colours, edge directions, layout) and cached in IndexedDB.
   3. A product scores by how well its best view agrees with the photo's best view. Blurry photos lean on shape and colour.
   4. The first scan reads every cover picture (a few seconds); later scans are instant. The leading products are then checked from their other angles.
   Source of the engine: LensCore (pure functions, runs in Node for testing). */
/* ===== LensCore: pure image-matching engine (no DOM). Works on RGBA pixel arrays, so it can be tested in Node. =====
   One picture -> several "views" (whole picture, centred square, the object cut out from a plain background, crops, small tilts).
   Each view -> one packed fingerprint made of four signals that survive blur, noise, glare and different lighting:
     hist  soft colour histogram (hue bins weighted by saturation + 4 grey levels)
     grid  6x6 colour layout, centred on its own average so a brighter or yellower photo still matches
     hog   edge directions in a 4x4 grid (shape and pattern)
     thumb 12x12 blurred grey thumbnail (overall light/dark structure)
   A product matches a photo when its best view agrees with the photo's best view. When the photo is blurry the
   fine-detail signal (hog) is trusted less and the colour and layout signals more. */
/* ===== LensCore: pure image-matching engine (no DOM). Works on RGBA pixel arrays, so it can be tested in Node. =====
   One picture -> several "views" (whole picture, centred square, the object cut out from a plain background, crops, small tilts).
   Each view -> one packed fingerprint made of four signals that survive blur, noise, glare and different lighting:
     hist  soft colour histogram (hue bins weighted by saturation + 4 grey levels)
     grid  6x6 colour layout, centred on its own average so a brighter or yellower photo still matches
     hog   edge directions in a 4x4 grid (shape and pattern)
     thumb 12x12 blurred grey thumbnail (overall light/dark structure)
   A product matches a photo when its best view agrees with the photo's best view. When the photo is blurry the
   fine-detail signal (hog) is trusted less and the colour and layout signals more. */
const LensCore=(()=>{
const S=48,HB=12,GR=6,TH=12,HC=4,HO=8;
const SG=16,L_HIST=HB+4,L_GRID=GR*GR*3,L_HOG=HC*HC*HO,L_THUMB=TH*TH,L_SIL=SG*SG,LEN=L_HIST+L_GRID+L_HOG+L_THUMB+L_SIL+1;
const O_HIST=0,O_GRID=L_HIST,O_HOG=O_GRID+L_GRID,O_THUMB=O_HOG+L_HOG,O_SIL=O_THUMB+L_THUMB,O_OBJ=O_SIL+L_SIL;
/* float RGB image {w,h,d} from an RGBA buffer */
const fromRGBA=(a,w,h)=>{const d=new Float32Array(w*h*3);for(let i=0,n=w*h;i<n;i++){d[i*3]=a[i*4];d[i*3+1]=a[i*4+1];d[i*3+2]=a[i*4+2]}return{w,h,d}};
/* box-resample a rectangle (x,y,cw,ch) of img into W x H */
const sample=(m,x,y,cw,ch,W,H)=>{const o=new Float32Array(W*H*3),{w,h,d}=m;
 for(let j=0;j<H;j++){const y0=y+j*ch/H,y1=y+(j+1)*ch/H,ya=Math.max(0,Math.min(h-1,Math.floor(y0))),yb=Math.max(ya+1,Math.min(h,Math.ceil(y1)));
  for(let i=0;i<W;i++){const x0=x+i*cw/W,x1=x+(i+1)*cw/W,xa=Math.max(0,Math.min(w-1,Math.floor(x0))),xb=Math.max(xa+1,Math.min(w,Math.ceil(x1)));
   let r=0,g=0,b=0,n=0;for(let v=ya;v<yb;v++)for(let u=xa;u<xb;u++){const k=(v*w+u)*3;r+=d[k];g+=d[k+1];b+=d[k+2];n++}
   const p=(j*W+i)*3;o[p]=r/n;o[p+1]=g/n;o[p+2]=b/n}}
 return{w:W,h:H,d:o}};
/* rotate about the centre (edges are clamped, so no black corners) */
const rotate=(m,deg)=>{const{w,h,d}=m,o=new Float32Array(d.length),a=deg*Math.PI/180,c=Math.cos(a),s=Math.sin(a),cx=w/2,cy=h/2;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const dx=x-cx,dy=y-cy,sx=Math.max(0,Math.min(w-1,Math.round(cx+dx*c+dy*s))),sy=Math.max(0,Math.min(h-1,Math.round(cy-dx*s+dy*c))),k=(sy*w+sx)*3,p=(y*w+x)*3;o[p]=d[k];o[p+1]=d[k+1];o[p+2]=d[k+2]}
 return{w,h,d:o}};
const grey=m=>{const n=m.w*m.h,g=new Float32Array(n);for(let i=0;i<n;i++)g[i]=m.d[i*3]*.299+m.d[i*3+1]*.587+m.d[i*3+2]*.114;return g};
const blur=(g,W,H)=>{const o=new Float32Array(W*H);for(let y=0;y<H;y++)for(let x=0;x<W;x++){let a=0;for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++)a+=g[Math.min(H-1,Math.max(0,y+j))*W+Math.min(W-1,Math.max(0,x+i))]*(i?1:2)*(j?1:2);o[y*W+x]=a/16}return o};
/* sharpness: variance of the Laplacian of a normalised-size grey picture (low = blurry) */
const sharpness=m=>{const q=sample(m,0,0,m.w,m.h,64,64),g=grey(q),W=64;let s=0,s2=0,n=0;
 for(let y=1;y<W-1;y++)for(let x=1;x<W-1;x++){const l=4*g[y*W+x]-g[y*W+x-1]-g[y*W+x+1]-g[(y-1)*W+x]-g[(y+1)*W+x];s+=l;s2+=l*l;n++}
 const mean=s/n;return s2/n-mean*mean};
const l2=(v,o,len)=>{let q=0;for(let i=0;i<len;i++)q+=v[o+i]*v[o+i];q=Math.sqrt(q)||1;for(let i=0;i<len;i++)v[o+i]/=q};
const zmean=(v,o,len)=>{let m=0;for(let i=0;i<len;i++)m+=v[o+i];m/=len;for(let i=0;i<len;i++)v[o+i]-=m};
/* a square-ish region of the image -> packed fingerprint (Float32Array of LEN numbers) */
const describe=(m,x,y,cw,ch)=>{const q=sample(m,x,y,cw,ch,S,S),v=new Float32Array(LEN),N=S*S;
 /* colour histogram, hue soft-binned */
 for(let i=0;i<N;i++){if(Math.abs(q.d[i*3]-128)+Math.abs(q.d[i*3+1]-128)+Math.abs(q.d[i*3+2]-128)<1.5)continue;
  const r=q.d[i*3]/255,g=q.d[i*3+1]/255,b=q.d[i*3+2]/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),dl=mx-mn,s=mx?dl/mx:0;
  if(s>.18&&mx>.16){let hh=dl?(mx==r?((g-b)/dl+6)%6:mx==g?(b-r)/dl+2:(r-g)/dl+4):0;hh=hh/6*HB;const b0=Math.floor(hh)%HB,fr=hh-Math.floor(hh),wt=s*(.4+mx);v[O_HIST+b0]+=wt*(1-fr);v[O_HIST+(b0+1)%HB]+=wt*fr}
  else{const l=(mx+mn)/2,bi=l<.2?0:l<.5?1:l<.8?2:3;v[O_HIST+HB+bi]+=.35}}
 {let t=0;for(let i=0;i<L_HIST;i++)t+=v[O_HIST+i];t=t||1;for(let i=0;i<L_HIST;i++)v[O_HIST+i]/=t}
 /* 6x6 colour layout, per-channel centred and scaled */
 const cs=S/GR;for(let cy=0;cy<GR;cy++)for(let cx=0;cx<GR;cx++){let r=0,g=0,b=0;for(let j=0;j<cs;j++)for(let i=0;i<cs;i++){const k=((cy*cs+j)*S+cx*cs+i)*3;r+=q.d[k];g+=q.d[k+1];b+=q.d[k+2]}
  const p=O_GRID+(cy*GR+cx)*3;v[p]=r/(cs*cs);v[p+1]=g/(cs*cs);v[p+2]=b/(cs*cs)}
 for(let c=0;c<3;c++){let mean=0;for(let i=0;i<GR*GR;i++)mean+=v[O_GRID+i*3+c];mean/=GR*GR;for(let i=0;i<GR*GR;i++)v[O_GRID+i*3+c]-=mean}
 l2(v,O_GRID,L_GRID);
 /* edge directions, 4x4 cells x 8 unsigned orientations */
 const G=blur(grey(q),S,S),cw2=S/HC;
 for(let y=1;y<S-1;y++)for(let x=1;x<S-1;x++){const gx=G[y*S+x+1]-G[y*S+x-1],gy=G[(y+1)*S+x]-G[(y-1)*S+x],mag=Math.hypot(gx,gy);if(mag<1e-3)continue;
  let an=Math.atan2(gy,gx);if(an<0)an+=Math.PI;if(an>=Math.PI)an-=Math.PI;const ob=Math.min(HO-1,Math.floor(an/Math.PI*HO)),cell=Math.floor(y/cw2)*HC+Math.floor(x/cw2);v[O_HOG+cell*HO+ob]+=mag}
 for(let i=0;i<L_HOG;i++)v[O_HOG+i]=Math.sqrt(v[O_HOG+i]);l2(v,O_HOG,L_HOG);
 /* tiny grey thumbnail, centred and unit length */
 const ts=S/TH;for(let ty=0;ty<TH;ty++)for(let tx=0;tx<TH;tx++){let a=0;for(let j=0;j<ts;j++)for(let i=0;i<ts;i++)a+=G[(ty*ts+j)*S+tx*ts+i];v[O_THUMB+ty*TH+tx]=a/(ts*ts)}
 zmean(v,O_THUMB,L_THUMB);l2(v,O_THUMB,L_THUMB);
 return v};
/* the object cut out from a plain/uniform background: bounding box of pixels unlike the border colour (null if there is none) */
const salient=m=>{const W=32,q=sample(m,0,0,m.w,m.h,W,W),b=[0,0,0];let n=0;
 for(let i=0;i<W;i++)for(const[x,y]of[[i,0],[i,W-1],[0,i],[W-1,i]]){const k=(y*W+x)*3;b[0]+=q.d[k];b[1]+=q.d[k+1];b[2]+=q.d[k+2];n++}
 b[0]/=n;b[1]/=n;b[2]/=n;const dist=new Float32Array(W*W);let mean=0;
 for(let i=0;i<W*W;i++){dist[i]=Math.hypot(q.d[i*3]-b[0],q.d[i*3+1]-b[1],q.d[i*3+2]-b[2]);mean+=dist[i]}mean/=W*W;
 const th=Math.max(28,mean*1.1),xs=[],ys=[];for(let y=2;y<W-2;y++)for(let x=2;x<W-2;x++)if(dist[y*W+x]>th){xs.push(x);ys.push(y)}
 if(xs.length<W*W*.04)return null;xs.sort((a,b)=>a-b);ys.sort((a,b)=>a-b);const p=a=>[a[Math.floor(a.length*.02)],a[Math.min(a.length-1,Math.floor(a.length*.98))]],[x0,x1]=p(xs),[y0,y1]=p(ys),
 bw=x1-x0+1,bh=y1-y0+1,area=bw*bh/(W*W);if(area<.1||area>.9)return null;
 const side=Math.max(bw,bh)*1.12,cx=(x0+x1+1)/2,cy=(y0+y1+1)/2,k=m.w/W,kh=m.h/W;
 return{x:(cx-side/2)*k,y:(cy-side/2)*kh,w:side*k,h:side*kh}};

/* ---- object cut-out: find the product against its background, so the match is about the PRODUCT and not the backdrop ---- */
const med=a=>{a.sort((x,y)=>x-y);return a[a.length>>1]};
const segment=m=>{const W=80,q=sample(m,0,0,m.w,m.h,W,W),d=q.d,N=W*W,ring=[];
 for(let y=0;y<W;y++)for(let x=0;x<W;x++)if(x<3||y<3||x>=W-3||y>=W-3)ring.push(y*W+x);
 const cor=[];for(const[cx,cy]of[[0,0],[W-8,0],[0,W-8],[W-8,W-8]])for(let y=0;y<8;y++)for(let x=0;x<8;x++)cor.push((cy+y)*W+cx+x);
 const bg=[0,1,2].map(c=>med(cor.map(i=>d[i*3+c]))),dist=new Float32Array(N);
 for(let i=0;i<N;i++)dist[i]=Math.hypot(d[i*3]-bg[0],d[i*3+1]-bg[1],d[i*3+2]-bg[2]);
 const rd=cor.map(i=>dist[i]).sort((a,b)=>a-b),th=Math.max(26,rd[Math.floor(rd.length*.9)]*1.5+8);
 let mk=new Uint8Array(N);for(let i=0;i<N;i++)mk[i]=dist[i]>th?1:0;
 const morph=(src,on)=>{const o=new Uint8Array(N);for(let y=1;y<W-1;y++)for(let x=1;x<W-1;x++){let c=0;for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++)c+=src[(y+j)*W+x+i];o[y*W+x]=on?(c>=1?1:0):(c==9?1:0)}return o};
  /* connected pieces; keep the big ones (a set of cups is several pieces) */
 const lab=new Int32Array(N),comps=[];let n=0;const st=[];
 for(let i=0;i<N;i++){if(!mk[i]||lab[i])continue;n++;let a=0,sx=0,sy=0;st.push(i);lab[i]=n;
  while(st.length){const p=st.pop(),x=p%W,y=(p-x)/W;a++;sx+=x;sy+=y;for(const[nx,ny]of[[x-1,y],[x+1,y],[x,y-1],[x,y+1]])if(nx>=0&&ny>=0&&nx<W&&ny<W){const k=ny*W+nx;if(mk[k]&&!lab[k]){lab[k]=n;st.push(k)}}}
  comps.push({id:n,a,cx:sx/a,cy:sy/a})}
 if(!comps.length)return null;
 for(const c of comps)c.s=c.a*(1.2-Math.hypot(c.cx/W-.5,c.cy/W-.5));
 comps.sort((a,b)=>b.s-a.s);const top=comps[0],keep=new Set(comps.filter(c=>c.a>=top.a*.18&&c.a>=N*.006).map(c=>c.id));
 const obj=new Uint8Array(N);let x0=W,y0=W,x1=0,y1=0,area=0;
 for(let i=0;i<N;i++)if(lab[i]&&keep.has(lab[i])){obj[i]=1;area++;const x=i%W,y=(i-x)/W;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
 if(area<N*.025||area>N*.9)return null;
 /* soft edge: grow by one pixel so the outline is kept */
 const grown=morph(obj,1);return{q,mask:grown,box:[x0,y0,x1+1,y1+1],area:area/N}};
/* the product alone on a neutral grey, as a fingerprint that also holds its silhouette. null when no clean cut-out is possible. */
const objectVec=(m,seg)=>{seg=seg||segment(m);if(!seg)return null;const{q,mask,box}=seg,W=q.w,[x0,y0,x1,y1]=box,side=Math.max(x1-x0,y1-y0)*1.14,cx=(x0+x1)/2,cy=(y0+y1)/2,sx=cx-side/2,sy=cy-side/2,
 md=new Float32Array(W*W*3);for(let i=0;i<W*W;i++){const k=mask[i]?1:0;md[i*3]=k?q.d[i*3]:128;md[i*3+1]=k?q.d[i*3+1]:128;md[i*3+2]=k?q.d[i*3+2]:128}
 const v=describe({w:W,h:W,d:md},sx,sy,side,side),mf=new Float32Array(W*W*3);for(let i=0;i<W*W;i++)mf[i*3]=mf[i*3+1]=mf[i*3+2]=mask[i]*255;
 const sg=sample({w:W,h:W,d:mf},sx,sy,side,side,SG,SG),sl=new Float32Array(SG*SG);for(let i=0;i<SG*SG;i++)sl[i]=sg.d[i*3];
 const sb=blur(sl,SG,SG);for(let i=0;i<SG*SG;i++)v[O_SIL+i]=sb[i];zmean(v,O_SIL,L_SIL);l2(v,O_SIL,L_SIL);v[O_OBJ]=1;return v};
const fit=(m,r)=>{const x=Math.max(0,r.x),y=Math.max(0,r.y),x2=Math.min(m.w,r.x+r.w),y2=Math.min(m.h,r.y+r.h);return[x,y,Math.max(2,x2-x),Math.max(2,y2-y)]};
const sq=(m,f=1)=>{const s=Math.min(m.w,m.h)*f;return[(m.w-s)/2,(m.h-s)/2,s,s]};
/* views of a PRODUCT picture (kept small so the cache stays light) */
const productViews=m=>{const V=[describe(m,0,0,m.w,m.h),describe(m,...sq(m))],s=salient(m);if(s)V.push(describe(m,...fit(m,s)));const o=objectVec(m);if(o)V.push(o);return V};
/* views of the customer's PHOTO: more of them, because the product can be anywhere in it, at any size or a little tilted.
   Each view has a small weight w (<1) when it is a guess rather than the natural framing. */
const queryViews=(m,opt={})=>{const V=[{v:describe(m,0,0,m.w,m.h),w:1,n:'whole'},{v:describe(m,...sq(m)),w:1,n:'centre'},{v:describe(m,...sq(m,.72)),w:.985,n:'centre-zoom'}];
 if(opt.box)V.unshift({v:describe(m,...fit(m,opt.box)),w:1.02,n:'selected'});
 const sg=segment(m),ov=objectVec(m,sg);if(ov)V.push({v:ov,w:1.0,n:'cutout'});
 if(sg||opt.tiltAlways)for(const deg of[-18,-9,9,18]){const r=rotate(m,deg),o=objectVec(r);if(o)V.push({v:o,w:.985,n:'cutout-tilt'})}
 const s=salient(m);if(s)V.push({v:describe(m,...fit(m,s)),w:1,n:'object'});
 const f=.6,mw=m.w*f,mh=m.h*f;for(const[a,b]of[[0,0],[1,0],[0,1],[1,1],[.5,.5]])V.push({v:describe(m,a*(m.w-mw),b*(m.h-mh),mw,mh),w:.97,n:'crop'});
 const f2=.45,w2=m.w*f2,h2=m.h*f2;for(const[a,b]of[[.25,.25],[.75,.25],[.25,.75],[.75,.75]])V.push({v:describe(m,a*m.w-w2/2,b*m.h-h2/2,w2,h2),w:.95,n:'small'});
 /* sliding windows at two sizes: finds a product that fills only part of a busy photo (a shelf, a screen, a hand) */
 const ms=Math.min(m.w,m.h);for(const f of[.36,.52]){const ws=ms*f,nx=Math.max(1,Math.round((m.w-ws)/(ws*.5))),ny=Math.max(1,Math.round((m.h-ws)/(ws*.5)));
  for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++)V.push({v:describe(m,nx?i*(m.w-ws)/nx:(m.w-ws)/2,ny?j*(m.h-ws)/ny:(m.h-ws)/2,ws,ws),w:.94,n:'window'})}
 for(const deg of[-12,12]){const r=rotate(m,deg);V.push({v:describe(r,...sq(r,.85)),w:.975,n:'tilt'})}
 return V};
/* weights of the four signals; sharp photos trust edges more, blurry ones trust colour + layout more */
const weights=sh=>{const k=Math.max(0,Math.min(1,(Math.log10(Math.max(sh,1))-1.2)/1.6));/* 0 = very blurry, 1 = sharp */
 return{h:.30-.04*k,g:.24,o:.18+.14*k,t:.28-.10*k,
  /* cut-out against cut-out: the silhouette and the product's own colours decide */
  oh:.24,og:.10,oo:.14+.10*k,ot:.08,os:.44-.06*k,sv:.80}};
/* similarity of two packed fingerprints, 0..1 */
const sim=(a,b,W)=>{let hs=0;for(let i=0;i<L_HIST;i++)hs+=Math.min(a[O_HIST+i],b[O_HIST+i]);
 let gs=0,os=0,ts=0;for(let i=0;i<L_GRID;i++)gs+=a[O_GRID+i]*b[O_GRID+i];for(let i=0;i<L_HOG;i++)os+=a[O_HOG+i]*b[O_HOG+i];for(let i=0;i<L_THUMB;i++)ts+=a[O_THUMB+i]*b[O_THUMB+i];
 gs=Math.max(0,gs);ts=Math.max(0,ts);os=Math.max(0,(os-.55)/.45);
 if(a[O_OBJ]&&b[O_OBJ]){let ss=0;for(let i=0;i<L_SIL;i++)ss+=a[O_SIL+i]*b[O_SIL+i];ss=Math.max(0,ss);const full=W.oh*hs+W.og*gs+W.oo*os+W.ot*ts+W.os*ss,shape=(W.oo*os+W.ot*ts+W.os*ss)/(W.oo+W.ot+W.os);return Math.max(full,shape*W.sv)}
 return W.h*hs+W.g*gs+W.o*os+W.t*ts};
/* best score of one product (a list of fingerprints, one per view of each of its pictures) against the photo */
const score=(qv,pv,W)=>{let best=0,second=0;for(const q of qv)for(const p of pv){const s=sim(q.v,p,W)*q.w;if(s>best){second=best;best=s}else if(s>second)second=s}return best*.9+second*.1};
return{S,LEN,fromRGBA,sample,describe,salient,segment,objectVec,productViews,queryViews,sharpness,weights,sim,score,rotate,grey};
})();
if(typeof module!='undefined')module.exports=LensCore;

/* ===================================================================================================================
   Hasta-Kala Lens: the screen, the camera, the product catalogue and the cache.  Uses app.js: sb, Cart, prodCard, notice, icons, inr, esc, safeUrl, fetchAll, errBox
   =================================================================================================================== */
(()=>{
if(typeof document=='undefined')return;
const C=LensCore,KEY='v7',WORKQ=192,WORKP=160,MAXP=1500,STAGE2=40;
const T=s=>window.I18N&&I18N.t?I18N.t(s):s;
try{localStorage.removeItem('hk_lens_v6')}catch{}
let runId=0;                         /* every scan gets a number; closing the window or starting a new scan cancels the old one */
const tick=()=>new Promise(r=>setTimeout(r));
/* ---- fingerprint store: IndexedDB (big, survives reloads), memory when the browser blocks it ---- */
const Store=(()=>{let db=null;const mem=new Map(),ready=new Promise(res=>{try{const r=indexedDB.open('hk_lens',1);r.onupgradeneeded=()=>r.result.createObjectStore('fp');r.onsuccess=()=>{db=r.result;res()};r.onerror=r.onblocked=()=>res()}catch{res()}});
 return{async get(k){if(mem.has(k))return mem.get(k);await ready;if(!db)return null;return new Promise(res=>{try{const q=db.transaction('fp').objectStore('fp').get(k);q.onsuccess=()=>{if(q.result)mem.set(k,q.result);res(q.result||null)};q.onerror=()=>res(null)}catch{res(null)}})},
  async put(k,v){mem.set(k,v);await ready;if(!db)return;try{db.transaction('fp','readwrite').objectStore('fp').put(v,k)}catch{}}}})();
/* ---- pictures ---- */
const load1=(src,cors)=>new Promise((ok,no)=>{const i=new Image();if(cors)i.crossOrigin='anonymous';i.onload=()=>ok(i);i.onerror=()=>no(new Error('img'));i.src=src});
const loadImg=async src=>{try{return await load1(src,true)}catch{return load1(src,false)}};
const free=im=>{try{im.onload=im.onerror=null;im.removeAttribute('src')}catch{}};
const imgUrl=x=>{x=String(x||'').trim();return !x?'':/^(https?:)?\/\//i.test(x)||x[0]=='/'?x:'/'+x};
const cv=document.createElement('canvas'),cx=cv.getContext('2d',{willReadFrequently:true});
/* picture -> float pixels, at most `max` px on the long side. Shrinks in halves so thin details are averaged, not skipped. */
function pixels(src,max){let w=src.naturalWidth||src.videoWidth||src.width||300,h=src.naturalHeight||src.videoHeight||src.height||300;const k=Math.min(1,max/Math.max(w,h)),tw=Math.max(8,Math.round(w*k)),th=Math.max(8,Math.round(h*k));
 let cur=src,cw=w,ch=h;while(cw/2>tw*1.5){const c=document.createElement('canvas');c.width=cw=Math.round(cw/2);c.height=ch=Math.round(ch/2);const x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(cur,0,0,c.width,c.height);cur=c}
 cv.width=tw;cv.height=th;cx.imageSmoothingQuality='high';cx.fillStyle='#fff';cx.fillRect(0,0,tw,th);cx.drawImage(cur,0,0,tw,th);
 const d=cx.getImageData(0,0,tw,th);return C.fromRGBA(d.data,tw,th)}
const fpOf=async src=>{const key=KEY+'|'+src;let f=await Store.get(key);if(f)return f;const im=await loadImg(src);let m;try{m=pixels(im,WORKP)}finally{free(im)}f=C.productViews(m);Store.put(key,f);return f};
const pool=async(items,n,fn)=>{let k=0;await Promise.all(Array.from({length:n},async()=>{while(k<items.length){const it=items[k++];try{await fn(it)}catch{}}}))};
/* ---- catalogue ---- */
const SEL='id,name,price,mrp,stock,images,image_url,shop_id,shops!inner(id,name,city,approved)';
let cat={at:0,items:null};
async function catalogue(){if(cat.items&&Date.now()-cat.at<120000)return cat.items;
 const rows=await fetchAll((a,b)=>sb.from('products').select(SEL).eq('shops.approved',true).gt('stock',0).order('id',{ascending:false}).range(a,b),MAXP);
 /* things already in the cart are always candidates, even if they just sold out */
 const have=new Set(rows.map(r=>r.id)),ids=Cart.get().map(i=>i.id).filter(i=>!have.has(i));
 if(ids.length){try{const{data}=await sb.from('products').select(SEL).in('id',ids);(data||[]).forEach(r=>rows.push(r))}catch{}}
 cat={at:Date.now(),items:rows};return rows}
/* ---- screen pieces ---- */
const modal=()=>document.getElementById('lens');
let stream=null;const stopCam=()=>{if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}};
const close=()=>{runId++;stopCam();const m=modal();if(m){m.remove();document.body.style.overflow=''}};
const pick=(live=true)=>{const hasLive=live&&navigator.mediaDevices&&navigator.mediaDevices.getUserMedia;return `<div class="lx-pick">${hasLive?`<button type="button" class="btn b1" data-cam><i data-lucide="scan-line" class="w-4 h-4"></i> ${T('Live camera')}</button>`:`<label class="btn b1 cursor-pointer"><input type="file" accept="image/*" capture="environment" class="sr-only" data-f><i data-lucide="camera" class="w-4 h-4"></i> ${T('Take a photo')}</label>`}<label class="btn b2 cursor-pointer"><input type="file" accept="image/*" class="sr-only" data-f><i data-lucide="upload" class="w-4 h-4"></i> ${T('Upload a picture')}</label></div>`};
const wire=m=>{m.querySelectorAll('[data-f]').forEach(i=>i.onchange=()=>{const f=i.files&&i.files[0];i.value='';if(f)run(f,m)});const c=m.querySelector('[data-cam]');if(c)c.onclick=()=>camera(m)};
const home=m=>{m.querySelector('.lx-body').innerHTML=`<div class="lx-hero0"><div class="lx-ring"><i data-lucide="scan-search" class="w-9 h-9"></i></div><h3>${T('Find a product from a photo')}</h3><p class="mute">${T('Take a photo or upload a picture of a craft. We will show the most similar products on Hasta·Kala.')}</p></div>${pick()}<ul class="lx-tips"><li><i data-lucide="sun" class="w-4 h-4"></i>${T('Good light, no glare')}</li><li><i data-lucide="crop" class="w-4 h-4"></i>${T('Fill the frame with the item')}</li><li><i data-lucide="mouse-pointer-square-dashed" class="w-4 h-4"></i>${T('Drag on your photo to pick just one item')}</li></ul><p class="lx-drop mute text-sm">${T('You can also drop or paste a picture here.')}</p>`;wire(m);icons()};
const camWhy=e=>{const n=e&&e.name||'';
 if(!window.isSecureContext)return T('The camera only works on a secure (https) page.');
 if(n=='NotAllowedError'||n=='SecurityError')return T('Camera access is blocked. Tap the lock or camera icon in the address bar, allow Camera, then try again.');
 if(n=='NotFoundError'||n=='DevicesNotFoundError')return T('No camera was found on this device.');
 if(n=='NotReadableError'||n=='TrackStartError'||n=='AbortError')return T('The camera is being used by another app. Close it and try again.');
 return T('Camera access is blocked. Tap the lock or camera icon in the address bar, allow Camera, then try again.')};
/* try the best settings first, then plainer ones: some phones refuse a request they cannot satisfy before they even ask for permission */
async function openStream(){const tries=[{video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:960}},audio:false},{video:{facingMode:'environment'},audio:false},{video:true,audio:false}];let last;
 for(const c of tries){try{return await navigator.mediaDevices.getUserMedia(c)}catch(e){last=e;if(e&&(e.name=='NotAllowedError'||e.name=='SecurityError'))break}}throw last}
async function camera(m){const body=m.querySelector('.lx-body');
 if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||!window.isSecureContext){camFail(body,m,{name:window.isSecureContext?'':'SecurityError'});return}
 body.insertAdjacentHTML('afterbegin',`<p class="text-sm mute mb-2" id="camwait" role="status">${T('Starting the camera… tap Allow if asked.')}</p>`);
 try{stream=await openStream()}catch(e){camFail(body,m,e);return}
 body.innerHTML=`<div class="lx-cam"><video playsinline muted autoplay></video><div class="lx-frame" aria-hidden="true"></div></div><div class="lx-pick" style="justify-content:center"><button type="button" class="btn b1" data-shot><i data-lucide="aperture" class="w-4 h-4"></i> ${T('Capture')}</button><button type="button" class="btn b2" data-back>${T('Cancel')}</button></div>`;icons();
 const v=body.querySelector('video');v.srcObject=stream;v.play().catch(()=>{});
 body.querySelector('[data-back]').onclick=()=>{stopCam();home(m)};
 body.querySelector('[data-shot]').onclick=()=>{if(!v.videoWidth)return;const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);stopCam();run(c,m)}}
/* photo given as a File (shrunk first: a 12 MP camera photo can make a phone browser run out of memory) or as a canvas */
async function intake(x){if(x instanceof HTMLCanvasElement)return{c:x,u:x.toDataURL('image/jpeg',.85)};
 if(!x||!/^image\//.test(x.type))throw new Error('type');const u=URL.createObjectURL(x);let im;try{im=await load1(u,false)}catch{URL.revokeObjectURL(u);throw new Error('read')}
 const w=im.naturalWidth||im.width,h=im.naturalHeight||im.height,k=Math.min(1,1024/Math.max(w,h)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*k));c.height=Math.max(1,Math.round(h*k));const g=c.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);free(im);
 return{c,u:c.toDataURL('image/jpeg',.85)}}
function camFail(body,m,e){const w=body.querySelector('#camwait');if(w)w.remove();body.querySelector('.lx-camerr')?.remove();
 body.insertAdjacentHTML('afterbegin',`<div class="lx-unsure lx-camerr" role="alert"><i data-lucide="camera-off" class="w-4 h-4"></i><span>${camWhy(e)}<br><b>${T('You can still use the Upload a picture button: on a phone it lets you take a photo.')}</b></span></div>`);icons()}
const pct=s=>Math.max(1,Math.min(99,Math.round((s-.5)/.5*100)));
/* ranking + the verdict */
function verdict(rk){const a=rk[0],b=rk[1];if(!a)return{exact:null};const gap=a.s-(b?b.s:0);return{exact:a.s>=.80&&gap>=.05?a:null,strong:a.s>=.80}}
async function run(src,box,opt={}){
 const body=box.querySelector('.lx-body'),my=++runId,msgErr=t=>body.insertAdjacentHTML('afterbegin',`<p class="text-bad text-sm mb-2" role="alert">${t}</p>`);
 let me;try{me=await intake(src)}catch(e){msgErr(e.message=='type'?T('Please choose an image file.'):T('Could not read that photo. Please try another one.'));return}
 const m=pixels(me.c,WORKQ),sh=C.sharpness(m),blurry=sh<150;
 body.innerHTML=`<div class="lx-mine"><div class="lx-prev" data-prev><img src="${me.u}" alt="${T('Your photo')}" draggable="false"><div class="lx-sel" hidden></div></div><div class="lx-meta"><b>${T('Your photo')}</b><p id="lp" class="text-sm mute" role="status">${T('Looking for similar products…')}</p><div id="lchips" class="lx-chips"></div></div></div><div id="lr"></div>`;
 const lr=body.querySelector('#lr'),prog=body.querySelector('#lp'),chips=body.querySelector('#lchips');
 const chip=(ic,t)=>chips.insertAdjacentHTML('beforeend',`<span class="lx-chip"><i data-lucide="${ic}" class="w-3.5 h-3.5"></i>${t}</span>`);
 if(blurry)chip('droplet',T('Blurry photo: matching on shape and colour'));if(opt.sel)chip('crop',T('Searching the area you picked'));icons();
 let items;try{items=opt.items||await catalogue()}catch(e){if(my!=runId)return;prog.textContent='';lr.innerHTML=errBox(e,{home:false})+`<div class="mt-3">${pick()}</div>`;wire(box);icons();return}
 if(my!=runId)return;
 const W=C.weights(sh),qv=C.queryViews(m,{box:opt.sel}),inCart=new Set(Cart.get().map(i=>i.id)),fps=new Map();let done=0,failed=0;
 const imgs=p=>[...new Set((Array.isArray(p.images)&&p.images.length?p.images:[p.image_url]).map(imgUrl).filter(Boolean))];
 /* step 1: the cover picture of every product (cached on this device, so only the first scan is slow) */
 await pool(items,6,async p=>{if(my!=runId)return;const u=imgs(p)[0];if(!u){failed++;return}
  try{fps.set(p.id,[...await fpOf(u)]);done++}catch{failed++;return}
  if(done%8==0){prog.textContent=`${T('Looking for similar products…')} ${done}/${items.length}`;await tick()}});
 if(my!=runId)return;
 const rate=()=>items.filter(p=>fps.has(p.id)).map(p=>({p,s:C.score(qv,fps.get(p.id),W)+(inCart.has(p.id)?.025:0)})).sort((a,b)=>b.s-a.s);
 let rank=rate();await tick();
 /* step 2: the other pictures (other angles) of the leading products */
 const lead=rank.slice(0,STAGE2);prog.textContent=T('Checking other angles…');
 await pool(lead,4,async x=>{if(my!=runId)return;for(const u of imgs(x.p).slice(1,4)){try{fps.get(x.p.id).push(...await fpOf(u))}catch{}}});
 if(my!=runId)return;rank=rate();prog.textContent='';
 show(box,lr,rank,{blurry,failed,total:items.length,me:me.c,sel:opt.sel,m,items});wire(box);icons()}
function show(box,lr,rank,o){
 const again=`<div class="mt-4">${pick()}</div>`;
 if(!rank.length){lr.innerHTML=`<p class="mute my-4">${o.failed&&o.failed>=o.total?T('Could not load the product photos. Please check your connection and try again.'):T('No products to compare yet.')}</p>${again}`;return}
 const v=verdict(rank),hit=v.exact,rest=rank.filter(x=>x!==hit),near=rest.filter(x=>x.s>=Math.max(.5,rank[0].s-.22)).slice(0,9),list=near.length>=3?near:rest.slice(0,6),pm=new Map(rank.slice(0,30).map(x=>[x.p.id,x.p]));
 const cartTag=p=>Cart.get().some(i=>i.id==p.id)?`<span class="lx-incart"><i data-lucide="shopping-cart" class="w-3 h-3"></i>${T('In your cart')}</span>`:'';
 const heroCard=x=>{const p=x.p,img=esc(safeUrl(p.images?.[0]||p.image_url,'/assets/icons/mark.svg')),off=p.mrp>p.price?Math.round(100-p.price*100/p.mrp):0;
  return `<div class="lx-hero"><a class="lx-himg" href="/product?id=${p.id}"><img src="${img}" alt="${esc(p.name)}"></a><div class="lx-hinfo"><span class="lx-badge"><i data-lucide="badge-check" class="w-4 h-4"></i>${T('Best match')} · ${pct(x.s)}%</span>${cartTag(p)}<a class="lx-hname" href="/product?id=${p.id}">${esc(p.name)}</a><div class="lx-hshop"><i data-lucide="store" class="w-3.5 h-3.5"></i>${esc(p.shops?.name||'')}${p.shops?.city?' · '+esc(p.shops.city):''}</div><div class="lx-hprice"><b>${inr(p.price)}</b>${off?`<s>${inr(p.mrp)}</s><em>${off}% OFF</em>`:''}</div><div class="lx-hact"><button type="button" class="btn b1" data-id="${p.id}"><i data-lucide="shopping-cart" class="w-4 h-4"></i> ${T('Add to cart')}</button><a class="btn b2" href="/product?id=${p.id}">${T('View')}</a></div></div></div>`};
 const cell=x=>`<div class="lx-cell">${prodCard(x.p,{shop:x.p.shops})}<span class="lx-pct" title="${T('Match')}">${pct(x.s)}%</span>${cartTag(x.p)}</div>`;
 const head=hit?`<h3 class="lx-h">${T('Best match')}</h3>${heroCard(hit)}`:`<div class="lx-unsure"><i data-lucide="info" class="w-4 h-4"></i><span>${v.strong?T('Several products look alike. Pick the right one below.'):T('No exact match found. These are the closest products.')}</span></div>`;
 lr.innerHTML=`${head}${list.length?`<h3 class="lx-h mt-5">${hit?T('Other similar products'):v.strong?T('Similar products'):T('Closest matches')}</h3><div class="pgrid">${list.map(cell).join('')}</div>`:''}
 <p class="text-xs mute mt-3">${o.blurry?T('Your photo is blurry, so results are a guide. A sharper photo gives a better match.'):T('Matches are based on shape, colour and pattern, so results are a guide.')}</p>
 ${o.failed?`<p class="text-xs mute">${o.failed} ${T('product photos could not be read and were skipped.')}</p>`:''}${again}`;
 /* actions */
 lr.onclick=e=>{const b=e.target.closest('button[data-id]');if(!b)return;const p=pm.get(+b.dataset.id)||[...pm.values()].find(q=>q.id==+b.dataset.id);if(p&&Cart.add(p)){b.disabled=true;b.innerHTML=`<i data-lucide="check" class="w-4 h-4"></i> ${T('Added to cart')}`;icons();notice(T('Added to cart'))}};
 /* drag on the photo to search just that part, like Google Lens */
 const prev=box.querySelector('[data-prev]'),sel=prev.querySelector('.lx-sel'),img=prev.querySelector('img');let st=null;
 prev.style.touchAction='none';prev.classList.add('lx-live');
 prev.onpointerdown=e=>{const r=img.getBoundingClientRect();st={x:e.clientX-r.left,y:e.clientY-r.top,r};try{prev.setPointerCapture(e.pointerId)}catch{}sel.hidden=true};
 prev.onpointermove=e=>{if(!st)return;const r=st.r,x=Math.max(0,Math.min(r.width,e.clientX-r.left)),y=Math.max(0,Math.min(r.height,e.clientY-r.top)),l=Math.min(st.x,x),t=Math.min(st.y,y),w=Math.abs(x-st.x),h=Math.abs(y-st.y);Object.assign(sel.style,{left:l+'px',top:t+'px',width:w+'px',height:h+'px'});sel.hidden=w<6&&h<6;st.box=[l,t,w,h]};
 prev.onpointerup=()=>{if(!st)return;const s=st;st=null;if(!s.box||s.box[2]<24||s.box[3]<24){sel.hidden=true;return}
  const kx=o.m.w/s.r.width,ky=o.m.h/s.r.height,[l,t,w,h]=s.box;run(o.me,box,{sel:{x:l*kx,y:t*ky,w:w*kx,h:h*ky},items:o.items})};
 if(o.sel){const reset=document.createElement('button');reset.type='button';reset.className='lx-chip lx-reset';reset.innerHTML=`<i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>${T('Search whole photo')}`;box.querySelector('#lchips').append(reset);reset.onclick=()=>run(o.me,box,{items:o.items})}}
window.Lens={open(file){
 if(modal())return;document.body.style.overflow='hidden';
 document.body.insertAdjacentHTML('beforeend',`<div id="lens" class="lens-wrap" role="dialog" aria-modal="true" aria-labelledby="lt"><div class="lens-box surf"><div class="lens-h"><h2 id="lt" class="font-bold text-lg"><i data-lucide="scan-search" class="w-5 h-5 inline"></i> ${T('Search by photo')}</h2><button type="button" class="lens-x" aria-label="${T('Close')}"><i data-lucide="x" class="w-5 h-5"></i></button></div><div class="lx-body"></div></div></div>`);
 const m=modal();m.querySelector('.lens-x').onclick=close;m.addEventListener('click',e=>{if(e.target===m)close()});
 m.addEventListener('dragover',e=>{e.preventDefault();m.classList.add('lx-over')});m.addEventListener('dragleave',e=>{if(e.target===m)m.classList.remove('lx-over')});
 m.addEventListener('drop',e=>{e.preventDefault();m.classList.remove('lx-over');const f=[...(e.dataTransfer?.files||[])].find(f=>/^image\//.test(f.type));if(f)run(f,m)});
 const onPaste=e=>{if(!modal()){document.removeEventListener('paste',onPaste);return}const f=[...(e.clipboardData?.files||[])].find(f=>/^image\//.test(f.type));if(f){e.preventDefault();run(f,m)}};document.addEventListener('paste',onPaste);
 document.addEventListener('keydown',function k(e){if(!modal()){document.removeEventListener('keydown',k);return}if(e.key=='Escape'){close();document.removeEventListener('keydown',k)}});
 icons();m.querySelector('.lens-x').focus();
 if(file)run(file,m);else home(m);
 /* warm the cache while the person is choosing a photo */
 catalogue().then(items=>pool(items,3,async p=>{if(!modal())return;const u=imgs0(p);if(u)await fpOf(u)})).catch(()=>{})}};
const imgs0=p=>imgUrl((Array.isArray(p.images)&&p.images.length?p.images[0]:p.image_url));
})();
