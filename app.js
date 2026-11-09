"use strict";
/* ---------- utilitaires ---------- */
const $=id=>document.getElementById(id);
const fmt=n=>String(n).replace(".",",");
const DN=["N","NE","E","SE","S","SO","O","NO"];
const dirName=d=>DN[Math.round((((d%360)+360)%360)/45)%8];
const dl=d=>{const n=dirName(d);return ({N:"nord",E:"est",S:"sud",O:"ouest"})[n]||n};
const TN={point:"Point break",reef:"Récif",beach:"Beach break"};
const SCL=[[8,"Épique","--s4"],[6.5,"Très bon","--s3"],[5,"Bon","--s2"],[3,"Moyen","--s1"],[-1,"Faible","--s0"]];
const lab=s=>SCL.find(x=>s>=x[0]);
const WLN=["glassy","offshore","side-shore","onshore"];
const TZ="Africa%2FCasablanca";
const ms=t=>Date.parse(t.length===16?t+":00Z":t);
const smooth=()=>matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth";
function nowLocal(){try{return new Intl.DateTimeFormat("sv-SE",{timeZone:"Africa/Casablanca",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date()).replace(" ","T")}catch(e){return new Date().toISOString().slice(0,16)}}
const dayName=d=>{try{return new Date(d+"T12:00:00Z").toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",timeZone:"UTC"})}catch(e){return d}};
function dayLabel(d){const today=nowLocal().slice(0,10),tm=new Date(Date.parse(today+"T12:00:00Z")+864e5).toISOString().slice(0,10);return d===today?"Aujourd'hui":d===tm?"Demain":dayName(d).replace(/^./,c=>c.toUpperCase())}
const tideCat=n=>n<.34?0:n<.67?1:2;
const tideName=(n,r)=>["marée basse","mi-marée","marée haute"][tideCat(n)]+(r?" montante":" descendante");
function ago(u){const m=Math.round((Date.now()-Date.parse(u))/60000);return m<2?"à l'instant":m<60?`il y a ${m} min`:m<1440?`il y a ${Math.round(m/60)} h`:`il y a ${Math.round(m/1440)} j`}
const load=k=>{try{return JSON.parse(localStorage.getItem(k)||"null")}catch(e){return null}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};

/* ---------- score (mêmes règles que le calcul serveur) ---------- */
const ang=(a,b)=>{const d=Math.abs(a-b)%360;return Math.min(d,360-d)};
const inr=(d,a,b)=>((d-a)%360+360)%360<=((b-a)%360+360)%360;
function score(s,h,p,sd,ws,wd,n,r){
  const [s0,s1]=s.sz,[p0,p1]=s.p,o0=s.o[0],o1=s.o[1],swc=Array.isArray(s.sw)?s.sw[0]:s.sw;
  const fs=h<s0?(s.smin?Math.max(0,1-(s0-h)/.4):Math.pow(h/s0,1.6)):h<=s1?1:s.sat?Math.max(0,1-(h-s1)/.25):Math.max(.05,1-(h-s1)/(s1*.7));
  const fp=p<p0?(s.pmin?Math.max(0,1-(p0-p)/1.5):Math.max(.15,1-(p0-p)/5)):p<=p1?1:(s.t==="beach"?Math.max(.4,1-(p-p1)/6):.95);
  const da=ang(sd,swc),fd=da<=25?1:da<=45?.8:da<=70?.5:.2;
  const om=(o0+(((o1-o0)%360+360)%360)/2)%360;let fw,wl;
  if(ws<=5){fw=1;wl=0}
  else if(inr(wd,(o0-15+360)%360,(o1+15)%360)){fw=ws<=25?1:ws<=35?.8:.55;wl=1}
  else if(ang(wd,(om+180)%360)<=60){fw=Math.max(.1,.6-(ws-5)/20);wl=3}
  else{fw=Math.max(.2,.85-(ws-5)/25);wl=2}
  let ft={2:1,1:.75,0:.4}[s.tide[tideCat(n)]];if(s.rise&&r)ft=Math.min(1,ft+.1);
  return [Math.round(100*fs*fp*fd*fw*ft)/10,wl];
}

/* ---------- Open-Meteo ---------- */
async function getJSON(u){const r=await fetch(u,{cache:"no-store"});if(!r.ok)throw new Error("HTTP "+r.status);return r.json()}
const arr=x=>Array.isArray(x)?x:[x];
const v=(a,i)=>a&&i>=0&&i<a.length?a[i]:null;
const WM=["gfs_seamless","icon_seamless","ecmwf_ifs025","meteofrance_seamless"];
const MAR="&models=ncep_gfswave025,ecmwf_wam025,meteofrance_wave&hourly=swell_wave_height,swell_wave_period,swell_wave_direction,wave_height,wave_peak_period,wave_direction";
const WIN="&models="+WM.join(",")+"&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m";
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
function circMean(ds){let x=0,y=0;ds.forEach(d=>{x+=Math.sin(d*Math.PI/180);y+=Math.cos(d*Math.PI/180)});return (Math.atan2(x,y)*180/Math.PI+360)%360}
/* houle : moyenne GFS-Wave + Météo-France, ECMWF sert de contrôle ; période : GFS-Wave + pic ECMWF */
function swellEns(M,i){const g=k=>v(M[k],i);
  const sw=[g("swell_wave_height_ncep_gfswave025"),g("swell_wave_height_meteofrance_wave")].filter(x=>x!=null&&x>.05);
  const ec=g("wave_height_ecmwf_wam025");const hs=sw.concat(ec!=null&&ec>.05?[ec]:[]);
  const P=[g("swell_wave_period_ncep_gfswave025"),g("wave_peak_period_ecmwf_wam025")].filter(x=>x!=null&&x>0);
  const Dd=[g("swell_wave_direction_ncep_gfswave025"),g("swell_wave_direction_meteofrance_wave"),g("wave_direction_ecmwf_wam025")].filter(x=>x!=null);
  if(!hs.length||!P.length||!Dd.length)return null;
  return {h:mean(sw.length?sw:hs),p:mean(P),sd:circMean(Dd),hs}}
/* vent : moyenne vectorielle de GFS, ICON, ECMWF et Météo-France */
function windEns(W,i){const mem=[],gs=[];WM.forEach(m=>{const s=v(W["wind_speed_10m_"+m],i),d=v(W["wind_direction_10m_"+m],i),g=v(W["wind_gusts_10m_"+m],i);if(s!=null&&d!=null)mem.push([s,d]);if(g!=null)gs.push(g)});
  if(!mem.length)return {ws:0,wd:0,gu:0,mem:[[0,0]]};
  const U=mean(mem.map(m=>m[0]*Math.sin(m[1]*Math.PI/180))),V=mean(mem.map(m=>m[0]*Math.cos(m[1]*Math.PI/180)));
  return {ws:Math.hypot(U,V),wd:(Math.atan2(U,V)*180/Math.PI+360)%360,gu:gs.length?Math.max(...gs):0,mem}}
function tideAt(sl,i){const w=sl.slice(Math.max(0,i-7),i+8).filter(x=>x!=null),c=v(sl,i);
  const n=c!=null&&w.length>2&&Math.max(...w)>Math.min(...w)?Math.round((c-Math.min(...w))/(Math.max(...w)-Math.min(...w))*100)/100:.5;
  const nx=v(sl,i+1);return [n,nx!=null&&c!=null&&nx>c?1:0]}
/* score + fourchette : on recalcule avec chaque modèle de vent et chaque modèle de houle */
function scoreEns(s,S,W,n,r){const [base,wl]=score(s,S.h,S.p,S.sd,W.ws,W.wd,n,r);let lo=base,hi=base;
  W.mem.forEach(([a,b])=>{const x=score(s,S.h,S.p,S.sd,a,b,n,r)[0];lo=Math.min(lo,x);hi=Math.max(hi,x)});
  S.hs.forEach(h=>{const x=score(s,h,S.p,S.sd,W.ws,W.wd,n,r)[0];lo=Math.min(lo,x);hi=Math.max(hi,x)});
  return [base,wl,lo,hi]}
const r1=x=>Math.round(x*10)/10;
const MV="https://marine-api.open-meteo.com/v1/marine",FV="https://api.open-meteo.com/v1/forecast";
async function fetchDB(){
  const W=`latitude=33.58&longitude=-7.87&timezone=${TZ}&forecast_days=4`,P=`latitude=33.533&longitude=-7.82&timezone=${TZ}&forecast_days=4`;
  const [m,b,w]=await Promise.all([getJSON(`${MV}?${W}${MAR}`),getJSON(`${MV}?${W}&hourly=sea_level_height_msl`),getJSON(`${FV}?${P}${WIN}`)]);
  const M=m.hourly,T=M.time,sl=b.hourly.sea_level_height_msl||[],WH=w.hourly;
  const idx=T.map((t,i)=>i).filter(i=>{const h=+T[i].slice(11,13);return h>=7&&h<=19});
  const c=[],s={};DBS.forEach(x=>s[x.id]=[]);
  idx.forEach(i=>{const S=swellEns(M,i),Wn=windEns(WH,i),[n,r]=tideAt(sl,i);
    if(!S){c.push(null);DBS.forEach(x=>s[x.id].push(null));return}
    c.push([r1(S.h),Math.round(S.p),Math.round(S.sd),Math.round(Wn.ws),Math.round(Wn.wd),Math.round(Wn.gu),n,r,r1(Math.min(...S.hs)),r1(Math.max(...S.hs)),Math.round(Math.min(...Wn.mem.map(x=>x[0]))),Math.round(Math.max(...Wn.mem.map(x=>x[0]))),Wn.mem.length]);
    DBS.forEach(x=>s[x.id].push(scoreEns(x,S,Wn,n,r)))});
  return {u:new Date().toISOString(),v:2,rv:RV,t:idx.map(i=>T[i]),c,s,t0:T[0],sl:sl.map(x=>x==null?null:Math.round(x*100)/100)};
}
function offPt(s){const b=s.sw[0]*Math.PI/180;return [Math.round((s.lat+.3*Math.cos(b))*1000)/1000,Math.round((s.lon+.3*Math.sin(b)/Math.cos(s.lat*Math.PI/180))*1000)/1000]}
async function fetchCoast(){
  const OP=COAST.map(offPt);const tail=`&timezone=${TZ}&forecast_days=4`;
  const qo=`latitude=${OP.map(p=>p[0]).join(",")}&longitude=${OP.map(p=>p[1]).join(",")}`+tail,q=`latitude=${COAST.map(s=>s.lat).join(",")}&longitude=${COAST.map(s=>s.lon).join(",")}`+tail;
  const [Ms,Bs,Ws]=(await Promise.all([getJSON(`${MV}?${qo}${MAR}`),getJSON(`${MV}?${qo}&hourly=sea_level_height_msl`),getJSON(`${FV}?${q}${WIN}`)])).map(arr);
  const T=Ms[0].hourly.time,idx=T.map((t,i)=>i).filter(i=>[8,11,14,17].includes(+T[i].slice(11,13)));const s={};
  COAST.forEach((sp,k)=>{const M=Ms[k].hourly,sl=Bs[k].hourly.sea_level_height_msl||[],WH=Ws[k].hourly;
    s[sp.id]=idx.map(i=>{const S=swellEns(M,i);if(!S)return null;const Wn=windEns(WH,i),[n,r]=tideAt(sl,i),[sc,wl,lo,hi]=scoreEns(sp,S,Wn,n,r);
      return [r1(S.h),Math.round(S.p),Math.round(S.sd),Math.round(Wn.ws),Math.round(Wn.wd),Math.round(Wn.gu),n,r,sc,wl,lo,hi]})});
  return {u:new Date().toISOString(),v:2,rv:RV,t:idx.map(i=>T[i]),s};
}
/* fiabilité : écart entre modèles + échéance */
function conf(lo,hi,t){const rg=hi-lo,lead=(ms(t)-ms(nowLocal()))/3.6e6;let c=rg<=1.5?2:rg<=3?1:0;if(lead>48)c=Math.min(c,1);if(lead>72&&rg>1.5)c=0;return c}
const CONF=["faible","moyenne","haute"];
/* retours de session : correction par spot */
let FB=load("fb")||[];
function bias(id){const a=FB.filter(f=>f.id===id).slice(-10);if(!a.length)return 0;return Math.max(-3,Math.min(3,mean(a.map(f=>f.real-f.pred))*a.length/(a.length+4)))}
const adj=(id,x)=>Math.max(0,Math.min(10,r1(x+bias(id))));
function rate(id,t,pred,real){FB=FB.filter(f=>!(f.id===id&&f.t===t));FB.push({id,t,pred,real});FB=FB.slice(-200);save("fb",FB)}

/* ---------- état ---------- */
/* RV : version des règles des spots. À chaque changement de règle, les anciens scores sont jetés et recalculés. */
const RV=3;let D=load("db-data"),C=load("co-data");if(D&&D.rv!==RV)D=null;if(C&&C.rv!==RV)C=null;let selJ=null,tabDay=null,mode="now",openReg=null;
const busy={db:false,co:false},err={db:"",co:""};
function staleMin(x){return x?(Date.now()-Date.parse(x.u))/60000:1e9}
async function refreshDB(force){if(busy.db||(!force&&staleMin(D)<1))return;busy.db=true;err.db="";renderDBHead();try{D=await fetchDB();save("db-data",D);selJ=null;tabDay=null}catch(e){err.db=(navigator.onLine===false?"Pas de connexion.":"Les prévisions ne répondent pas pour l'instant.")+(D?" Les dernières données restent affichées.":"")}busy.db=false;renderDB()}
async function refreshCO(force){if(busy.co||(!force&&staleMin(C)<1))return;busy.co=true;err.co="";renderCOHead();try{C=await fetchCoast();save("co-data",C)}catch(e){err.co=(navigator.onLine===false?"Pas de connexion.":"Les prévisions ne répondent pas pour l'instant.")+(C?" Les dernières données restent affichées.":"")}busy.co=false;renderCO()}

/* ---------- vue Dar Bouazza ---------- */
function nowJ(F,back){if(!F)return -1;const n=ms(nowLocal())-(back||30)*60000;const j=F.t.findIndex(t=>ms(t)>=n);return j<0?F.t.length-1:j}
const hh=(F,j)=>parseInt(F.t[j].slice(11,13),10)+"h";
const daysOf=F=>F?[...new Set(F.t.map(t=>t.slice(0,10)))]:[];
const scD=(id,j)=>{const a=D&&D.s[id];return a&&a[j]?adj(id,a[j][0]):null};
const rgD=(id,j)=>{const a=D.s[id][j];const b=bias(id);return [Math.max(0,r1(a[2]+b)),Math.min(10,r1(a[3]+b))]};
function renderDBHead(){const f=$("fresh-db");f.textContent=busy.db&&!D?"Chargement des prévisions…":D?"Prévisions "+ago(D.u):"Pas encore de prévisions";f.classList.toggle("old",staleMin(D)>240);
  const b=$("refresh-db");b.disabled=busy.db;b.innerHTML=busy.db?'<span class="spin"></span>Actualisation…':"Actualiser";const g=$("msg-db");g.hidden=!err.db;g.textContent=err.db}
function reasons(s,j){const c=D.c[j];if(!c)return [];const [h,p,sd,ws,wd,gu,n,r]=c,wl=D.s[s.id][j][1],out=[];const tr=s.tide[tideCat(n)];
  out.push([tr===2?"ok":tr===1?"mid":"ko",`${tideName(n,r)} : ${tr===2?"idéale":tr===1?"correcte":"défavorable"} ici (${s.tt.toLowerCase()})`]);
  out.push(h<s.sz[0]?["ko",`houle ${fmt(h)} m : trop petite, il lui faut ${fmt(s.sz[0])} m et plus au large`]:h>s.sz[1]?["ko",s.sat?`houle ${fmt(h)} m : ça sature au-delà de ${fmt(s.sz[1])} m`:`houle ${fmt(h)} m : au-dessus de ce qu'il tient bien (${fmt(s.sz[1])} m)`]:["ok",`houle ${fmt(h)} m de ${dl(sd)} : dans sa fourchette (${fmt(s.sz[0])}–${fmt(s.sz[1])} m)`]);
  out.push(p<s.p[0]?["ko",s.pmin?`période ${p} s : sous son minimum de ${s.p[0]} s`:`période ${p} s : un peu courte, idéal ${s.p[0]}–${s.p[1]} s`]:p>s.p[1]&&s.t==="beach"?["mid",`période ${p} s : longue pour un beach break, ça peut fermer`]:["ok",`période ${p} s : bonne (idéal ${s.p[0]}–${s.p[1]} s)`]);
  out.push([wl<=1?"ok":wl===2?"mid":"ko",`vent ${ws} km/h de ${dl(wd)} : ${WLN[wl]} (offshore ici : ${s.o[2]})`]);return out}
function tideSVG(day,j){if(!D.sl||!D.t0)return "<p>Marée indisponible</p>";const base=Math.round((ms(day+"T00:00")-ms(D.t0))/3600000),pts=[];
  for(let h=0;h<24;h++){const x=D.sl[base+h];if(x!=null)pts.push([h,x])}if(pts.length<6)return "<p>Marée indisponible</p>";
  const lo=Math.min(...pts.map(p=>p[1])),hi=Math.max(...pts.map(p=>p[1])),W=240,H=74,X=h=>8+h/23*(W-16),Y=y=>12+(hi-y)/((hi-lo)||1)*(H-30);
  const d=pts.map((p,i)=>(i?"L":"M")+X(p[0]).toFixed(1)+" "+Y(p[1]).toFixed(1)).join("");let ext="";const T=(x,y,t)=>`<text x="${x}" y="${y}" text-anchor="middle" font-size="9.5" font-family="IBM Plex Mono,monospace" fill="var(--muted)">${t}</text>`;
  for(let i=1;i<pts.length-1;i++){const [h,y]=pts[i];if(y>=pts[i-1][1]&&y>pts[i+1][1])ext+=T(X(h),Y(y)-4,`PM ${h}h`);if(y<=pts[i-1][1]&&y<pts[i+1][1])ext+=T(X(h),Y(y)+12,`BM ${h}h`)}
  const hj=parseInt(D.t[j].slice(11,13),10),vj=D.sl[base+hj];
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Courbe de marée du jour"><rect x="${X(7)}" y="4" width="${X(19)-X(7)}" height="${H-20}" fill="var(--tide-soft)"/><path d="${d}" fill="none" stroke="var(--tide)" stroke-width="2"/>${ext}
  ${vj!=null?`<line x1="${X(hj)}" x2="${X(hj)}" y1="4" y2="${H-16}" stroke="var(--ink)" stroke-dasharray="2 2"/><circle cx="${X(hj)}" cy="${Y(vj)}" r="4" fill="var(--ink)"/>`:""}${[0,6,12,18].map(h=>T(X(h),H-3,h+"h")).join("")}</svg>`}
function renderDB(){
  renderDBHead();const hero=$("hero"),rank=$("rank"),conds=$("conds");
  if(!D){hero.style.setProperty("--sc","var(--line)");hero.innerHTML=`<span class="eyebrow">Spot à cibler</span><h3>${busy.db?"Calcul…":"En attente"}</h3><p class="tip">Le meilleur spot s'affiche dès que les prévisions sont chargées.</p>`;rank.innerHTML="";conds.innerHTML="";$("days").innerHTML="";$("grid").innerHTML="";$("dtabs").innerHTML="";return}
  const nj=nowJ(D),j=selJ==null?nj:selJ,isNow=j===nj;$("vt").textContent=isNow?"Maintenant":`${dayLabel(D.t[j].slice(0,10))} à ${hh(D,j)}`;$("back").hidden=isNow;
  const R=DBS.map(s=>({s,v:scD(s.id,j),wl:D.s[s.id][j]?D.s[s.id][j][1]:0})).filter(x=>x.v!=null).sort((a,b)=>b.v-a.v);
  if(!R.length){hero.innerHTML=`<span class="eyebrow">Spot à cibler</span><h3>Pas de données</h3>`;rank.innerHTML="";conds.innerHTML=""}
  else{const top=R[0],L=lab(top.v);hero.style.setProperty("--sc",`var(${L[2]})`);
    hero.innerHTML=`<div class="row"><div style="min-width:0"><span class="eyebrow">Spot à cibler</span><h3 style="margin-top:6px">${top.s.n}</h3><div class="when">${dayLabel(D.t[j].slice(0,10))} à ${hh(D,j)} · ${TN[top.s.t]} · ${top.s.lv}</div></div><div style="text-align:right"><div class="big">${fmt(top.v)}<small>/10</small></div><span class="pill" style="--sc:var(${L[2]})">${L[1]}</span></div></div>
    ${(()=>{const [lo,hi]=rgD(top.s.id,j),cf=conf(lo,hi,D.t[j]),c=D.c[j];const div=[];if(c&&c[11]-c[10]>=8)div.push(`vent ${c[10]} à ${c[11]} km/h selon les modèles`);if(c&&c[9]-c[8]>=.6)div.push(`houle ${fmt(c[8])} à ${fmt(c[9])} m`);const bb=bias(top.s.id);
      return `<div class="conf c${cf}"><b>Fiabilité ${CONF[cf]}</b> · entre ${fmt(lo)} et ${fmt(hi)} selon les modèles${div.length?" ("+div.join(", ")+")":cf===2?", ils sont d'accord":""}${bb?` · ajusté de ${bb>0?"+":""}${fmt(r1(bb))} d'après tes retours`:""}</div>`})()}
    <ul class="why">${reasons(top.s,j).map(([k,t])=>`<li><i class="${k}">${k==="ok"?"✓":k==="ko"?"✕":"~"}</i><span>${t}</span></li>`).join("")}</ul>
    ${ms(D.t[j])<=ms(nowLocal())+3600000?`<div class="fb" id="fb"><span>Tu y étais ? C'était comment à ${top.s.n} ?</span><div>${[["Nul",1],["Moyen",4],["Bon",6],["Très bon",8],["Épique",10]].map(([l,x])=>`<button type="button" data-v="${x}">${l}</button>`).join("")}</div></div>`:""}
    ${top.v<3?`<p class="tip">Aucun spot ne marche vraiment à ce moment. Regarde les meilleurs créneaux plus bas.</p>`:R[1]?`<p class="tip">Plan B : <b>${R[1].s.n}</b> ${fmt(R[1].v)}/10.</p>`:""}`;
    const fbEl=$("fb");if(fbEl)fbEl.querySelectorAll("button").forEach(b=>b.onclick=()=>{const raw=D.s[top.s.id][j][0];rate(top.s.id,D.t[j],raw,+b.dataset.v);const bb=bias(top.s.id);fbEl.innerHTML=`<span>Merci. ${top.s.n} est maintenant ajusté de ${bb>0?"+":""}${fmt(r1(bb))} d'après tes ${FB.filter(f=>f.id===top.s.id).length} retour(s).</span>`;setTimeout(renderDB,2500)});
    rank.innerHTML=R.map((x,i)=>{const l=lab(x.v);return `<button type="button" data-id="${x.s.id}" aria-current="${i===0}" style="--sc:var(${l[2]})"><span class="n">${i+1}</span><span class="nm">${x.s.n}<small>${l[1]} · ${WLN[x.wl]}</small></span><span class="bar"><i style="width:${Math.max(3,x.v*10)}%"></i></span><span class="v">${fmt(x.v)}</span></button>`}).join("");
    rank.querySelectorAll("button").forEach(b=>b.onclick=()=>{const el=$("card-"+b.dataset.id);if(el)el.scrollIntoView({behavior:smooth(),block:"center"})});
    const c=D.c[j];conds.innerHTML=c?`<div class="tile"><span class="eyebrow">Houle au large</span><div class="val">${fmt(c[0])} <small>m</small> · ${c[1]} <small>s</small></div><p>de ${dl(c[2])} (${c[2]}°)</p></div>
      <div class="tile"><span class="eyebrow">Vent</span><div class="val">${c[3]} <small>km/h</small> · ${dl(c[4])}</div><p>rafales ${c[5]} km/h · offshore sur ce secteur : SE à S</p></div>
      <div class="tile"><span class="eyebrow">Marée · ${tideName(c[6],c[7])}</span>${tideSVG(D.t[j].slice(0,10),j)}</div>`:""}
  const n=ms(nowLocal())-30*60000;
  $("days").innerHTML=daysOf(D).slice(0,4).map(d=>{let b=null;D.t.forEach((t,jj)=>{if(t.slice(0,10)!==d||ms(t)<n)return;DBS.forEach(s=>{const x=scD(s.id,jj);if(x!=null&&(!b||x>b.v))b={v:x,s,j:jj}})});
    if(!b)return `<div class="day" style="--sc:var(--line)"><span class="dn">${dayLabel(d)}</span><b>—</b><span>plus de créneau de jour</span></div>`;const l=lab(b.v);
    return `<button class="day" type="button" data-j="${b.j}" style="--sc:var(${l[2]})"><span class="dn">${dayLabel(d)}</span><b>${b.s.n}</b><span>${hh(D,b.j)} · ${fmt(b.v)}/10 · ${l[1]}</span></button>`}).join("");
  $("days").querySelectorAll("button[data-j]").forEach(b=>b.onclick=()=>{selJ=+b.dataset.j;tabDay=D.t[selJ].slice(0,10);renderDB();window.scrollTo({top:0,behavior:smooth()})});
  renderGrid();
}
function renderGrid(){const g=$("grid"),tb=$("dtabs");$("legend").innerHTML=SCL.slice().reverse().map(x=>`<span style="--sc:var(${x[2]})"><i></i>${x[1]}</span>`).join("")+`<span style="--sc:var(--s3)"><i style="opacity:.4"></i>pâle = modèles en désaccord</span>`;
  const ds=daysOf(D);if(!tabDay||!ds.includes(tabDay))tabDay=D.t[selJ==null?nowJ(D):selJ].slice(0,10);
  tb.innerHTML=ds.map(d=>`<button class="chip" type="button" data-d="${d}" aria-pressed="${d===tabDay}">${dayLabel(d)}</button>`).join("");tb.querySelectorAll("button").forEach(b=>b.onclick=()=>{tabDay=b.dataset.d;renderGrid()});
  const js=D.t.map((t,j)=>j).filter(j=>D.t[j].slice(0,10)===tabDay),nj=nowJ(D),sj=selJ==null?nj:selJ;
  let h=`<tr><th></th>${js.map(j=>`<th>${hh(D,j)}</th>`).join("")}</tr>`;
  DBS.forEach(s=>{h+=`<tr><th class="rowh" scope="row">${s.n}</th>${js.map(j=>{const x=scD(s.id,j);if(x==null)return `<td><button class="na" type="button" disabled>–</button></td>`;const l=lab(x);
    const [lo,hi]=rgD(s.id,j),cf=conf(lo,hi,D.t[j]);return `<td><button type="button" data-j="${j}" class="${j===sj?"sel":""} ${j===nj?"now":""} ${cf===0?"lc":""}" title="fiabilité ${CONF[cf]} : ${fmt(lo)}–${fmt(hi)}" style="--sc:var(${l[2]})" aria-label="${s.n} ${hh(D,j)} : ${fmt(x)} sur 10">${fmt(x)}</button></td>`}).join("")}</tr>`});
  h+=`<tr><th class="rowh" scope="row" style="font:500 10.5px var(--mono);color:var(--muted)">Marée</th>${js.map(j=>{const c=D.c[j];return `<th>${c?["B","M","H"][tideCat(c[6])]+(c[7]?"↗":"↘"):""}</th>`}).join("")}</tr>`;
  h+=`<tr><th class="rowh" scope="row" style="font:500 10.5px var(--mono);color:var(--muted)">Houle · vent</th>${js.map(j=>{const c=D.c[j];return `<th>${c?fmt(c[0])+" m<br>"+c[3]+"<br>"+dirName(c[4]):""}</th>`}).join("")}</tr>`;
  g.innerHTML=h;g.querySelectorAll("button[data-j]").forEach(b=>b.onclick=()=>{selJ=+b.dataset.j;renderDB();$("hero").scrollIntoView({behavior:smooth(),block:"start"})})}
function renderCardsDB(){$("cards-db").innerHTML=DBS.map(s=>`<article class="card t-${s.t}" id="card-${s.id}"><span class="ty">${TN[s.t]}</span><div><h3>${s.n}</h3><p class="d">${s.d}${s.al?" · "+s.al:""}</p></div><p class="pf">${s.pf}</p>
  <dl><dt>Vent offshore</dt><dd class="off">${s.o[2]}</dd><dt>Marée</dt><dd>${s.tt}</dd><dt>Houle au large</dt><dd>${fmt(s.sz[0])} – ${fmt(s.sz[1])} m, nord-ouest</dd><dt>Période</dt><dd>${s.p[0]} – ${s.p[1]} s</dd><dt>Niveau</dt><dd>${s.lv}</dd></dl>
  <p class="hz">${s.hz}</p>${s.note?`<p class="note">${s.note}</p>`:""}</article>`).join("")}

/* ---------- vue Côte ---------- */
function renderCOHead(){const f=$("fresh-co");f.textContent=busy.co&&!C?"Chargement des prévisions…":C?"Prévisions "+ago(C.u):"Pas encore de prévisions";f.classList.toggle("old",staleMin(C)>360);
  const b=$("refresh-co");b.disabled=busy.co;b.innerHTML=busy.co?'<span class="spin"></span>Actualisation…':"Actualiser";const g=$("msg-co");g.hidden=!err.co;g.textContent=err.co}
function stepsCO(){if(!C)return [];if(mode==="now")return [nowJ(C,90)];const today=nowLocal().slice(0,10),n=ms(nowLocal())-90*60000;return C.t.map((t,j)=>j).filter(j=>C.t[j].slice(0,10)===mode&&(mode!==today||ms(C.t[j])>=n))}
function bestCO(id,st){const rows=C.s[id];if(!rows)return null;let b=null;st.forEach(j=>{const r=rows[j];if(r){const x=adj(id,r[8]);if(!b||x>b.sc)b={sc:x,j,r,cf:conf(r[10],r[11],C.t[j])}}});return b}
const condHTML=r=>`<span><b>${fmt(r[0])} m</b> · ${r[1]} s · houle ${dl(r[2])}</span><span class="w${r[9]}">vent ${r[3]} km/h ${dl(r[4])} · ${WLN[r[9]]}</span><span>marée ${["basse","mi-marée","haute"][tideCat(r[6])]}${r[7]?" ↗":" ↘"}</span>`;
function renderCO(){renderCOHead();const tb=$("ctabs"),el=$("rcs");
  if(!C){tb.innerHTML="";el.innerHTML=`<p class="tip">${busy.co?"Calcul des 35 spots en cours…":"Les prévisions s'afficheront ici."}</p>`;return}
  const ds=daysOf(C);if(mode!=="now"&&!ds.includes(mode))mode="now";
  tb.innerHTML=[["now","Maintenant"],...ds.map(d=>[d,dayLabel(d)])].map(([k,t])=>`<button class="chip" type="button" data-m="${k}" aria-pressed="${k===mode}">${t}</button>`).join("");
  tb.querySelectorAll("button").forEach(b=>b.onclick=()=>{mode=b.dataset.m;renderCO()});
  const st=stepsCO();let html="";
  Object.entries(REG).forEach(([k,rn])=>{const ranked=COAST.filter(s=>s.r===k).map(s=>({s,b:bestCO(s.id,st)})).filter(x=>x.b).sort((a,b)=>b.b.sc-a.b.sc);
    if(!ranked.length){html+=`<div class="rc"><span class="rn">${rn}</span><p class="alt">Plus de créneau de jour. Regarde demain.</p><div class="meter"></div></div>`;return}
    const top=ranked[0],L=lab(top.b.sc);
    html+=`<button class="rc" type="button" data-r="${k}" aria-expanded="${openReg===k}" style="--sc:var(${L[2]})"><div class="tp"><div style="min-width:0"><span class="rn">${rn}</span><h3>${top.s.n}</h3><div class="wh">${dayLabel(C.t[top.b.j].slice(0,10)).toLowerCase()} à ${hh(C,top.b.j)} · fiabilité ${CONF[top.b.cf]}</div></div><div class="scr"><b>${fmt(top.b.sc)}<small>/10</small></b><span class="pill">${L[1]}</span></div></div>
      <div class="cond">${condHTML(top.b.r)}</div>${ranked[1]?`<p class="alt">Ensuite : ${ranked.slice(1,3).map(a=>`<b>${a.s.n}</b> ${fmt(a.b.sc)}`).join(" · ")}</p>`:""}<div class="meter"><i style="width:${Math.max(3,top.b.sc*10)}%"></i></div></button>`;
    if(openReg===k)html+=`<div class="rdet">${ranked.map(x=>{const l=lab(x.b.sc);return `<button type="button" style="--sc:var(${l[2]})"><span class="nm">${x.s.n}<small>${TN[x.s.t]} · offshore ${x.s.o[2]} · ${x.s.tt.toLowerCase()}</small></span><span class="ph">${hh(C,x.b.j)}</span><span class="v">${fmt(x.b.sc)}</span></button>`}).join("")}</div>`});
  el.innerHTML=html;el.querySelectorAll(".rc[data-r]").forEach(b=>b.onclick=()=>{openReg=openReg===b.dataset.r?null:b.dataset.r;renderCO()})}

/* ---------- navigation, installation, service worker ---------- */
function show(v){$("view-db").hidden=v!=="db";$("view-coast").hidden=v!=="coast";document.querySelectorAll(".nav button").forEach(b=>b.setAttribute("aria-current",b.dataset.v===v?"page":"false"));
  if(location.hash!==(v==="coast"?"#cote":""))history.replaceState(null,"",v==="coast"?"#cote":location.pathname);window.scrollTo(0,0);
  if(v==="coast")refreshCO()}
document.querySelectorAll(".nav button").forEach(b=>b.onclick=()=>show(b.dataset.v));
$("refresh-db").onclick=()=>refreshDB(true);$("refresh-co").onclick=()=>refreshCO(true);$("back").onclick=()=>{selJ=null;tabDay=null;renderDB()};
let deferred=null;const standalone=matchMedia("(display-mode: standalone)").matches||navigator.standalone;
function installHint(){const el=$("install");if(standalone){el.hidden=true;return}
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
  if(deferred){el.hidden=false;el.innerHTML=`<span><b>Installe l'app</b> sur ton écran d'accueil.</span><button class="btn" id="inst" type="button">Installer</button>`;$("inst").onclick=async()=>{deferred.prompt();await deferred.userChoice;deferred=null;el.hidden=true}}
  else if(ios){el.hidden=false;el.innerHTML=`<span><b>Pour l'installer :</b> touche Partager dans Safari, puis « Sur l'écran d'accueil ».</span>`}}
addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;installHint()});
/* actualisation à l'instant t : à l'ouverture, à chaque retour dans l'app, et toutes les 10 minutes tant qu'elle est ouverte */
function liveRefresh(){refreshDB();if(!$("view-coast").hidden)refreshCO()}
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")liveRefresh()});
addEventListener("pageshow",e=>{if(e.persisted)liveRefresh()});
addEventListener("focus",liveRefresh);addEventListener("online",liveRefresh);
setInterval(()=>{if(document.visibilityState==="visible")liveRefresh()},10*60000);
setInterval(()=>{renderDBHead();renderCOHead();if(D&&selJ==null&&document.visibilityState==="visible")renderDB();if(C&&mode==="now"&&!$("view-coast").hidden)renderCO()},60000);
if("serviceWorker" in navigator&&location.protocol!=="file:")navigator.serviceWorker.register("sw.js").catch(()=>{});
renderCardsDB();renderDB();renderCO();installHint();show(location.hash==="#cote"?"coast":"db");
refreshDB(true);
