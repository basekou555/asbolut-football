/* ============================== ABSOLUT COACH — INTERFACE ============================== */
const app=document.getElementById('app'), filmstripEl=document.getElementById('filmstrip'), homeCreditStripEl=document.getElementById('homeCreditStrip'), gameTopBannerEl=document.getElementById('gameTopBanner'), editionLabelEl=document.getElementById('editionLabel');
let creation=null, marketFilter='all', tacticSel=null;
function applyTheme(){ const player=state&&state.kind==='player'; document.documentElement.setAttribute('data-theme',player?'player':'coach'); const brand=gameTopBannerEl.querySelector('.brand'); if(brand) brand.innerHTML=(player?'ABSOLUT PLAYER':'ABSOLUT COACH')+'<span>.</span>'; document.title=player?'Absolut Player':'Absolut Coach'; editionLabelEl.textContent=state?`${eraForYear(state.year).icon} ${eraForYear(state.year).name} · ${state.year}`:'Une vie de football à travers les époques'; }
function showHomeBanner(){ homeCreditStripEl.style.display=''; gameTopBannerEl.style.display='none'; filmstripEl.style.display='none'; applyTheme(); }
function showGameBanner(){ homeCreditStripEl.style.display='none'; gameTopBannerEl.style.display=''; applyTheme(); }
/* Le tableau de bord se consulte à tout moment : c'est là qu'on voit ce que
   chaque réglage produit. Il ne vit pas dans la sauvegarde, c'est juste un écran. */
let dashOpen=false;
function openDashboard(){ dashOpen=true; render(); }
function closeDashboard(){ dashOpen=false; render(); }
function dashButton(){
  const b=document.getElementById('dashBtn'); if(!b) return;
  b.style.display=state&&!state.ended?'':'none';
  b.textContent=dashOpen?'✕ Fermer':'📊 Tableau de bord';
  b.onclick=dashOpen?closeDashboard:openDashboard;
}
function goHomeFromGame(){ if(state&&!state.ended) saveGame(); state=null; creation=null; renderStart(); }
function scrollTop(){ window.scrollTo(0,0); }
function $(v){ return money(v,state?state.year:2015); }

/* ---------- Accueil ---------- */
function renderStart(){
  showHomeBanner(); document.documentElement.setAttribute('data-theme','coach'); document.title='Absolut Coach';
  const cs=lsGet(KEYS.coach,null), ps=lsGet(KEYS.player,null);
  app.innerHTML=`<div class="fade-in"><div class="home-hero"><h1 class="display">ABSOLUT <span>COACH</span></h1>
    <div class="tagline narr">Une vie de football, des années Kopa à l'ère Mbappé. Choisis ton époque, tes clubs, tes joueurs. Survis aux présidents.</div>
    <div class="home-pills"><span class="pill">7 époques</span><span class="pill">Vrais clubs, vrais joueurs</span><span class="pill">100 % local</span><span class="pill">Français</span></div></div>
    ${cs&&!cs.ended||ps&&!ps.ended?`<div class="home-resume">
      ${cs&&!cs.ended?`<button class="resume-card" onclick="continueGame('coach')"><span class="ico">💾</span><span class="body"><b>Reprendre ${escapeHtml(cs.name)}</b><small>${escapeHtml(cs.modeName)} · ${cs.year} · ${cs.club?escapeHtml(cs.club.name):'sans club'} · ${cs.history.length} saison${cs.history.length>1?'s':''}</small></span><span class="go">→</span></button>`:''}
      ${ps&&!ps.ended?`<button class="resume-card" onclick="continueGame('player')"><span class="ico">💾</span><span class="body"><b>Reprendre ${escapeHtml(ps.name)}</b><small>Joueur·euse · ${ps.year} · ${ps.club?escapeHtml(ps.club.name):'sans club'} · ${ps.history.length} saison${ps.history.length>1?'s':''}</small></span><span class="go">→</span></button>`:''}
    </div>`:''}
    <div class="home-grid">
      <button class="home-card lead" onclick="startCoachCreation()"><div class="ico">🧢</div><b>Carrière d'entraîneur·euse</b><span>Offres de clubs réels, mercato libre, phases de championnat, coupes, présidents et licenciements.</span></button>
      <button class="home-card lead" onclick="startPlayerCreation()"><div class="ico">👟</div><b>Carrière de joueur·euse</b><span>De 17 à 38 ans : agents, temps de jeu, blessures, sélection nationale, Ballon d'or.</span></button>
    </div>
    <div class="home-links">
      <button onclick="renderBadges()"><span>🏅 Salle des badges</span><small>${unlockedTrophies.size} / ${TROPHIES.length} débloqués</small></button>
      <button onclick="renderHall()"><span>🏛️ Panthéon</span><small>Les carrières terminées ici</small></button>
      <button onclick="renderRules()"><span>📖 Comment ça marche</span><small>Les règles en une page</small></button>
    </div></div>`; scrollTop();
}
function continueGame(kind){ const s=lsGet(kind==='player'?KEYS.player:KEYS.coach,null); if(s&&!s.ended){ state=s; render(); } else renderStart(); }

/* ---------- Création ---------- */
function progressHTML(i,n){ return `<div class="creation-progress"><span>Étape ${i+1}/${n}</span><div class="track"><i style="width:${Math.round((i+1)/n*100)}%"></i></div></div>`; }
function bonusChips(bonus,labels){ return `<div class="chip-row">${Object.entries(bonus||{}).filter(([k,v])=>v).map(([k,v])=>`<span class="chip ${v>0?'good':'bad'}">${labels[k]||k} ${v>0?'+':''}${v}</span>`).join('')}</div>`; }
// Effets mécaniques d'une qualité, d'un défaut ou d'un trait, rendus visibles dès la création
function perkChips(o){
  const chips=[];
  const gaugeLabels={...Object.fromEntries(Object.entries(GAUGE_INFO).map(([k,v])=>[k,v.icon+' '+v.label])),...Object.fromEntries(Object.entries(PGAUGE).map(([k,v])=>[k,v.icon+' '+v.label]))};
  Object.entries(o.gauge||o.gauges||{}).forEach(([k,v])=>chips.push([`${gaugeLabels[k]||k} ${d10(v)}`,v>0]));
  if(o.pressureRes) chips.push([`Pression ${o.pressureRes>0?'−':'+'}${Math.abs(o.pressureRes)}`,o.pressureRes>0]);
  if(o.incidentMult&&o.incidentMult!==1) chips.push([`Incidents ${o.incidentMult>1?'+':'−'}${Math.round(Math.abs(o.incidentMult-1)*100)} %`,o.incidentMult<1]);
  if(o.budgetLeak) chips.push([`Budget −${Math.round(o.budgetLeak*100)} %`,false]);
  if(o.scamRes) chips.push([`Arnaques ${o.scamRes>0?'−':'+'}${Math.round(Math.abs(o.scamRes)*100)} %`,o.scamRes>0]);
  if(o.confidenceRes) chips.push([`Confiance du président ${o.confidenceRes>0?'protégée':'fragile'}`,o.confidenceRes>0]);
  if(o.growth) chips.push([`Progression +${Math.round(o.growth*100)} %`,true]);
  if(o.injury) chips.push([`Blessures +${Math.round(o.injury*100)} %`,false]);
  if(o.scandal) chips.push(['Scandales possibles',false]);
  if(o.youthBonus) chips.push([`🎓 Formation +${o.youthBonus}`,true]);
  return chips.length?`<div class="chip-row">${chips.map(([t,good])=>`<span class="chip ${good?'good':'bad'}">${t}</span>`).join('')}</div>`:'';
}
function eraPickHTML(cb){ return `<div class="era-grid">${ERAS.map((e,i)=>`<button class="era-card" onclick="${cb}(${i})"><div class="ico">${e.icon}</div><span class="years">${e.start} – ${e.end}</span><b>${e.name}</b><p>${e.tagline}</p><ul>${e.rules.map(r=>`<li>${r}</li>`).join('')}</ul></button>`).join('')}</div>`; }
const C_STEPS=['name','era','mode','origin','nationality','style','mentor','quality','flaw','summary'];
function startCoachCreation(){ creation={kind:'coach',step:0,name:''}; state=null; renderCreation(); }
function cPick(k,v){ creation[k]=v; creation.step++; renderCreation(); }
function cBack(){ if(creation.step>0){ creation.step--; renderCreation(); } else renderStart(); }
function renderCreation(){
  showGameBanner(); document.documentElement.setAttribute('data-theme',creation.kind==='player'?'player':'coach'); editionLabelEl.textContent=creation.era?`${creation.era.icon} ${creation.era.name}`:'Nouvelle carrière';
  const steps=creation.kind==='coach'?C_STEPS:P_STEPS, step=steps[creation.step]; const back=`<div class="btn-row"><button class="btn secondary" onclick="cBack()">← Retour</button></div>`; let html='';
  const modeCard=(list,key,labels)=>`<div class="mode-grid">${list.map((m,i)=>`<button class="mode-card" onclick="cPick('${key}',${key==='mode'?'COACH_MODES':key==='origin'?(creation.kind==='coach'?'COACH_ORIGINS':'PLAYER_ORIGINS'):key==='quality'?'COACH_QUALITIES':key==='flaw'?'COACH_FLAWS':key==='trait'?'PLAYER_TRAITS':key==='nationality'?'NATIONALITIES':key==='style'?'STYLES':key==='pos'?'PLAYER_POS':'MENTORS_CUR'}[${i}])"><div class="mode-icon">${m.icon||''}</div><div class="mode-copy">${m.difficulty?`<small>${m.difficulty}</small>`:''}<b>${m.name}</b><span>${m.desc||m.style||''}</span>${m.details?`<span class="mode-rules">${m.details.map(d=>`<i>${d}</i>`).join('')}</span>`:''}${m.bonus?bonusChips(m.bonus,labels):''}${perkChips(m)}${m.favoredStyleIds?`<span class="chip-row">${m.favoredStyleIds.map(id=>`<span class="chip good">${styleById(id).icon} ${styleById(id).name}</span>`).join('')}</span>`:''}${m.styleIds?`<span class="chip-row">${m.styleIds.map(id=>`<span class="chip good">${styleById(id).icon} ${styleById(id).name}</span>`).join('')}</span>`:''}</div></button>`).join('')}</div>`;
  if(step==='name') html=`<div class="card"><h2 class="display">${creation.kind==='coach'?"Ton nom d'entraîneur·euse":"Ton nom de joueur·euse"}</h2><input type="text" id="cName" maxlength="28" placeholder="Ex. Vanessa Le Bris" value="${escapeHtml(creation.name)}"><div class="btn-row"><button class="btn secondary" onclick="renderStart()">Accueil</button><button class="btn" onclick="cPick('name',document.getElementById('cName').value.trim()||'Anonyme')">Continuer →</button></div></div>`;
  else if(step==='era') html=`<div class="card"><h2 class="display">Choisis ton époque</h2><p class="hint">Les joueurs disponibles, les règles du football et l'argent en jeu dépendent de l'époque. Une longue carrière traverse la suivante.</p>${eraPickHTML('cPickEra')}${back}</div>`;
  else if(step==='mode') html=`<div class="card"><h2 class="display">Choisis ta campagne</h2><p class="hint">Elle règle les budgets, la patience des présidents, la variance et la fréquence des incidents.</p>${modeCard(COACH_MODES,'mode',CSTAT)}${back}</div>`;
  else if(step==='origin') html=`<div class="card"><h2 class="display">D'où viens-tu ?</h2>${modeCard(creation.kind==='coach'?COACH_ORIGINS:PLAYER_ORIGINS,'origin',creation.kind==='coach'?CSTAT:PSTAT)}${back}</div>`;
  else if(step==='nationality') html=`<div class="card"><h2 class="display">Ta nationalité</h2><p class="hint">Elle définit tes affinités avec certains styles de jeu.</p>${modeCard(NATIONALITIES.map(n=>({...n,bonus:null})),'nationality',CSTAT)}${back}</div>`;
  else if(step==='style') html=`<div class="card"><h2 class="display">Ton style de jeu favori</h2><p class="hint">Un club qui demande ton style et un plan de jeu cohérent donnent un vrai bonus de force.</p>${modeCard(STYLES,'style',CSTAT)}${back}</div>`;
  else if(step==='mentor'){ window.MENTORS_CUR=COACHES_BY_ERA[creation.era.id]; html=`<div class="card"><h2 class="display">Ton inspiration</h2><p class="hint">Un·e entraîneur·euse réel·le de l'époque ${creation.era.name}. Une orientation de départ, rien de plus.</p>${modeCard(MENTORS_CUR,'mentor',CSTAT)}${back}</div>`; }
  else if(step==='quality') html=`<div class="card"><h2 class="display">Ta grande qualité</h2>${modeCard(COACH_QUALITIES,'quality',CSTAT)}${back}</div>`;
  else if(step==='flaw') html=`<div class="card"><h2 class="display">Ton défaut</h2>${modeCard(COACH_FLAWS,'flaw',CSTAT)}${back}</div>`;
  else if(step==='pos') html=`<div class="card"><h2 class="display">Ton poste</h2>${modeCard(PLAYER_POS,'pos',PSTAT)}${back}</div>`;
  else if(step==='trait') html=`<div class="card"><h2 class="display">Ton trait de caractère</h2>${modeCard(PLAYER_TRAITS,'trait',PSTAT)}${back}</div>`;
  else if(step==='summary'){
    if(creation.kind==='coach'){ const tmp=coachFreshState({...creation,favoriteStyle:creation.style}); html=`<div class="card"><h2 class="display">${escapeHtml(creation.name)}</h2><div class="identity">${creation.era.icon} <b>${creation.era.name}</b> · ${creation.mode.icon} ${creation.mode.name} · ${creation.origin.name} · ${creation.nationality.name} · style <b>${creation.style.icon} ${creation.style.name}</b> · inspiré·e par <b>${creation.mentor.name}</b> · ${creation.quality.name} / ${creation.flaw.name}</div>
      <div class="section-label">Statistiques de départ</div>${Object.keys(CSTAT).map(k=>`<div class="stat-row"><div class="lbl"><span>${CSTAT[k]}</span><b>${Math.round(tmp.stats[k])}</b></div><div class="bar"><i style="width:${tmp.stats[k]}%"></i></div></div>`).join('')}
      <div class="section-label">Jauges de départ</div>${Object.keys(GAUGE_INFO).map(k=>`<div class="stat-row"><div class="lbl"><span>${GAUGE_INFO[k].icon} ${GAUGE_INFO[k].label}</span><b>${sur10(tmp.gauges[k])}</b></div><div class="bar"><i style="width:${tmp.gauges[k]}%"></i></div></div>`).join('')}
      <div class="btn-row"><button class="btn secondary" onclick="cBack()">← Retour</button><button class="btn" onclick="launchCoach()">Commencer en ${creation.era.start} ⚽</button></div></div>`; }
    else { const tmp=playerFreshState(creation); html=`<div class="card"><h2 class="display">${escapeHtml(creation.name)}</h2><div class="identity">${creation.era.icon} <b>${creation.era.name}</b> · ${creation.pos.icon} ${creation.pos.name} · ${creation.origin.name} · ${creation.trait.name} · ${tmp.age} ans</div>
      ${Object.keys(PSTAT).map(k=>`<div class="stat-row"><div class="lbl"><span>${PSTAT[k]}</span><b>${sur10(tmp.stats[k])}</b></div><div class="bar"><i style="width:${tmp.stats[k]}%"></i></div></div>`).join('')}
      <div class="hint">Tout part de 5,0. Ton origine et ton caractère écartent, et deux axes portent déjà <b>une qualité (+1,5)</b> et <b>un défaut (−1,5)</b> tirés au sort : les points sont là, leur nom se découvrira en jouant.</div>
      <div class="section-label">Jauges de départ</div>${Object.keys(PGAUGE).map(k=>`<div class="stat-row"><div class="lbl"><span>${PGAUGE[k].icon} ${PGAUGE[k].label}</span><b>${sur10(tmp.gauges[k])}</b></div><div class="bar"><i style="width:${tmp.gauges[k]}%"></i></div></div>`).join('')}
      <div class="btn-row"><button class="btn secondary" onclick="cBack()">← Retour</button><button class="btn" onclick="launchPlayer()">Commencer en ${creation.era.start} 👟</button></div></div>`; }
  }
  app.innerHTML=`<div class="fade-in">${progressHTML(creation.step,steps.length)}${html}</div>`; scrollTop();
}
function cPickEra(i){ cPick('era',ERAS[i]); }
function launchCoach(){ state=coachFreshState({...creation,favoriteStyle:creation.style}); log(`🧢 ${state.year} : début de carrière à ${state.age} ans. ${state.originName}, inspiré·e par ${state.mentorName}. Campagne « ${state.modeName} ».`); creation=null; coachOpenOffers(); render(); }
const P_STEPS=['name','era','pos','origin','trait','summary'];
function startPlayerCreation(){ creation={kind:'player',step:0,name:''}; state=null; renderCreation(); }
function launchPlayer(){ state=playerFreshState(creation); log(`👟 ${state.year} : début de carrière à ${state.age} ans, ${state.posName.toLowerCase()}. ${state.originName}.`); creation=null; playerOpenOffers(); render(); }

/* ---------- Rendu principal ---------- */
function render(){
  if(!state){ renderStart(); return; }
  showGameBanner(); renderFilmstrip();
  if(state.ended){ state.kind==='player'?renderPlayerEnd():renderCoachEnd(); return; }
  const coach={offers:renderOffers,mercato:renderMercato,tactic:renderTactic,event:renderEvent,choiceResult:renderChoiceResult,meeting:renderMeeting,matchResult:renderMatchResult,phaseResult:renderPhaseResult,seasonEnd:renderSeasonEnd,sacked:renderSacked,roulette:renderRoulette,pressureCrisis:renderPressure};
  const player={offers:renderPOffers,event:renderEvent,choiceResult:renderChoiceResult,prematch:renderPPrematch,penalty:renderPPenalty,matchResult:renderPMatchResult,phaseResult:renderPPhaseResult,seasonEnd:renderPSeasonEnd,roulette:renderRoulette,pressureCrisis:renderPressure,
    vacances:renderPVacances,ete:renderPSummer,envies:renderPWish,offerOne:renderPOfferOne};
  let fn=(state.kind==='player'?player:coach)[state.pendingChoice]||(state.kind==='player'?renderPOffers:renderOffers);
  if(dashOpen) fn=state.kind==='player'?renderPlayerDashboard:renderDashboard;
  dashButton();
  const side=state.kind==='player'?playerSidebar():coachSidebar();
  app.innerHTML=`<div class="layout fade-in"><div class="main">${eraBannerHTML()}${fn()}</div><div class="sidebar"><details class="side-fold" open><summary><span>📋 Ta fiche, le club et le journal</span></summary>${side}</details></div></div>`;
  applySideFold(); scrollTop();
}
/* Au téléphone, la fiche est repliée par défaut : l'écran de jeu passe en premier.
   Le choix du joueur est retenu d'un écran à l'autre. */
let sideFoldOpen=false;
function applySideFold(){
  const d=app.querySelector('.side-fold'); if(!d||!window.matchMedia) return;
  if(!window.matchMedia('(max-width:900px)').matches) return;
  d.open=sideFoldOpen; d.addEventListener('toggle',()=>{ sideFoldOpen=d.open; });
}
function eraBannerHTML(){ const e=eraForYear(state.year); return `<div class="era-banner">${e.icon} <b>${e.name}</b> · <span class="year-badge">${state.year}</span>${state.club?` · ${escapeHtml(state.club.name)} · <b>${escapeHtml(state.club.leagueName||'')}</b>`:''}<span class="era-rules"> · ${e.rules.slice(0,2).join(' · ')}</span></div>`; }
function renderFilmstrip(){
  filmstripEl.style.display='';
  const h=state.history||[]; const frames=h.map(f=>{ const cls=f.sacked?'aborted':(f.champion?'success':f.relegated||f.bad?'flop':f.objectiveMet||f.note>=6.8?'success':'mid'); const label=f.sacked?'🪓':f.champion?'🏆':f.relegated?'⬇️':state.kind==='player'?(f.note?f.note.toFixed(1):'—'):(f.pos?ordinal(f.pos):'—'); return `<div class="frame ${cls}" title="${f.year} · ${escapeHtml(f.club)}">${f.year} ${label}</div>`; });
  if(state.comp) frames.push(`<div class="frame current">${state.year} · phase ${Math.min(state.phase+1,4)}/4 · J${Math.min((state.matchday||0)+1,state.comp.schedule.length)}/${state.comp.schedule.length}</div>`);
  filmstripEl.innerHTML=frames.length?frames.join(''):'<div class="frame">Aucune saison pour l\'instant</div>';
}
/* Le quota d'étrangers ne vaut que pour les clubs français, et seulement
   avant l'arrêt Bosman. Ailleurs il n'y a rien à surveiller. */
function quotaActive(){ const c=state.club; return !!(c&&c.nat==='FR'&&eraForeignersMax(state.year)<99); }
/* Un joueur doit pouvoir être reconnu étranger d'un coup d'œil. */
function natTag(p,withCode){
  if(!p||!p.nat) return '';
  const foreign=state.club?isForeign(p,state.club.nat):false;
  const counts=foreign&&quotaActive();
  const title=`${natName(p.nat)}${counts?" — étranger, compte dans le quota":foreign?' — étranger':''}`;
  return `<span class="nat${counts?' counts':''}" title="${escapeHtml(title)}">${natFlag(p.nat)}${withCode?` ${escapeHtml(p.nat)}`:''}</span>`;
}
/* La liste des joueurs qui occupent le quota, nommément. */
function quotaHTML(){
  if(!quotaActive()) return '';
  const fmax=eraForeignersMax(state.year);
  const list=state.squad.filter(p=>isForeign(p,state.club.nat)).sort((a,b)=>playerRating(b,state.year)-playerRating(a,state.year));
  const over=list.length>=fmax;
  return `<div class="quota-box ${over?'full':''}"><b>Quota d'étrangers · ${list.length} / ${fmax}</b>
    <span>${eraForYear(state.year).name} : un club français ne peut aligner que ${fmax} joueur${fmax>1?'s':''} étranger${fmax>1?'s':''}.${over?" Tu ne peux plus en recruter un de plus sans en vendre un.":''}</span>
    ${list.length?`<div class="quota-list">${list.map(p=>`<i>${natFlag(p.nat)} ${escapeHtml(p.name)} <small>${natName(p.nat)}</small></i>`).join('')}</div>`:'<div class="quota-list"><i>Aucun étranger dans l\'effectif.</i></div>'}</div>`;
}
/* ---------- Tout se lit sur 10 ----------
   Demande du propriétaire (26/09/2026) : « une échelle sur 10, tout à 5 au départ »,
   et, quand je lui ai demandé jusqu'où aller : **tout le jeu**. Le moteur garde ses
   valeurs sur 100 — tout le calibrage mesuré cette semaine reste valable — et l'écran
   ne montre plus qu'une seule échelle. Un point de moteur = un dixième affiché.
   `SC10` liste les indicateurs concernés : les jauges et les attributs. Ce qui n'est
   pas sur 100 (l'argent, la dynamique de −6 à +6, les pourcentages, les semaines)
   garde son unité. */
const SC10=new Set(['talent','technique','reseau','reputation','vestiaire','supporters','formation','staff','proches','pressure','confidence','physique','mental','corps','entourage','coachTrust','forme','cote','note']);
function fxVal(key,v){ return SC10.has(key)?sur10(v):String(Math.round(v)); }
function bar(label,v,cls='',raw=false){ return `<div class="stat-row"><div class="lbl"><span>${label}</span><b>${raw?Math.round(v):sur10(v)}</b></div><div class="bar ${cls}"><i style="width:${clamp(v)}%"></i></div></div>`; }
function gaugeRow(info,v){ const mood=v>=65?'':v>=35?'mid':'low'; return `<div class="gauge-row ${mood}" title="${escapeHtml(info.help)}"><span>${info.icon}</span><div><div class="bar"><i style="width:${clamp(v)}%"></i></div><div class="hint" style="font-size:10px">${info.label}</div></div><span>${sur10(v)}</span></div>`; }
function coachSidebar(){
  const s=state.stats, c=state.club, g=state.gauges; const pcls=state.pressure>=85?'bad':state.pressure>=50?'mid':'good';
  const xi=c?bestXI(state.squad,FORMATIONS[state.formation],state.year):[]; const xiAvg=xi.length?xi.reduce((n,p)=>n+playerRating(p,state.year),0)/xi.length:0;
  return `<div class="card"><div class="identity"><b>${escapeHtml(state.name)}</b> · ${state.age} ans · ${state.modeIcon} ${state.modeName}<br>${c?`🏟️ <b>${escapeHtml(c.name)}</b> · ${escapeHtml(c.leagueName||'')} · saison ${c.since}<br>Objectif : ${ordinal(c.objectivePos)} · ${capitalize(c.presidentName)}`:'Sans club'}</div>
    ${c?`<div class="section-label">Confiance du président</div><div class="conf-big ${c.confidence<25?'pressure-state bad':c.confidence<50?'pressure-state mid':''}">${sur10(c.confidence)} / 10</div><div class="bar"><i style="width:${c.confidence}%"></i></div><div class="hint">À zéro, tu es licencié·e. Sous 3,5 en fin de saison, tu n'es pas prolongé·e.</div>`:''}
    ${coteHTML()}
    ${fateHTML()}
    <div class="section-label">Toi</div>${Object.keys(CSTAT).map(k=>bar(CSTAT[k],s[k])).join('')}${bar('Pression',state.pressure,'pressure')}
    ${c?tempoSelectHTML():''}
    <div class="section-label">Le club</div>${Object.keys(GAUGE_INFO).map(k=>gaugeRow(GAUGE_INFO[k],g[k])).join('')}
    ${c?`<div class="section-label">Effectif</div><div class="hint">${state.squad.length} joueurs · niveau de l'effectif ${niv(xiAvg)} · ${state.formation} · ${styleById(state.styleId).icon} ${styleById(state.styleId).name}<br>Blessés : ${state.squad.filter(p=>p.injury>0).length} · Suspendus : ${state.squad.filter(p=>p.suspended>0).length} · Fraîcheur ${Math.round(state.squad.reduce((n,p)=>n+fit(p),0)/Math.max(1,state.squad.length))} %<br>Masse salariale ${$(state.squad.reduce((n,p)=>n+p.wage,0))} / ${$(c.wageCap||0)}</div>`:''}
    <div class="section-label">Palmarès</div><div class="hint">🏆 ${state.titles.league} · ⬆️ ${state.titles.promo} · 🥇 ${state.titles.cup} · ⭐ ${state.titles.euro} · 🌍 ${state.titles.euro2} · 🎖️ ${state.awards} · 🪓 ${state.sackings}</div></div>
    <div class="card"><div class="section-label">Journal</div><div class="log">${state.log.slice(0,30).map(l=>`<div><span class="age">${l.year}</span>${l.msg}</div>`).join('')}</div></div>
    <div class="card"><div class="btn-row"><button class="btn secondary small" onclick="goHomeFromGame()">Accueil (sauvegarde)</button><button class="btn danger small" onclick="if(confirm('Prendre ta retraite ? La sauvegarde sera supprimée.')){coachEnd('Tu raccroches le survêtement de ton plein gré.','retire');render();}">Retraite</button></div></div>`;
}
const CLABELS={talent:'Tactique',technique:'Management',reseau:'Réseau',reputation:'Réputation',pressure:'Pression',confidence:'Confiance du président',vestiaire:'✊ Vestiaire',supporters:'📣 Supporters',formation:'🎓 Formation',staff:'🧑‍🤝‍🧑 Staff',note:'Note globale',coachTrust:'Confiance du coach',forme:'Forme',corps:'🩻 Corps',entourage:'👪 Entourage',physique:'Physique',mental:'Mental'};
function deltaChips(before,after,extra=[]){
  const chips=Object.keys(after).map(k=>{ const d=(after[k]||0)-(before[k]||0); if(Math.abs(d)<1) return ''; const good=k==='pressure'?d<0:d>0; return `<span class="delta-chip ${good?'up':'down'}">${CLABELS[k]||k} ${SC10.has(k)?d10(d):(d>0?'+':'')+Math.round(d)}</span>`; }).filter(Boolean).concat(extra.map(e=>`<span class="delta-chip">${escapeHtml(e)}</span>`));
  return chips.length?`<div class="delta-chips">${chips.join('')}</div>`:'<div class="hint">Aucun changement immédiat visible.</div>';
}
function renderChoiceResult(){ const r=state.pendingResult; const cont=state.kind==='player'?'playerContinueChoiceResult()':'coachContinueChoiceResult()'; return `<div class="card"><h2 class="display">${r.title}</h2><div class="subtitle">${escapeHtml(r.subtitle||'')}</div><p class="narr">${escapeHtml(r.narrative||'')}</p>${deltaChips(r.before,r.after,r.extra||[])}<div class="btn-row"><button class="btn" onclick="${cont}">Continuer →</button></div></div>`; }
/* Un arbitrage ne vaut que s'il se voit : chaque option annonce ce qu'elle donne et ce qu'elle coûte. */
const FX_LABEL={talent:'🧠 Tactique',technique:'🗣️ Management',reseau:'🤝 Réseau',reputation:'📰 Réputation',
  vestiaire:'✊ Vestiaire',supporters:'📣 Supporters',formation:'🎓 Formation',staff:'🧑‍🤝‍🧑 Staff',proches:'🏡 Proches',
  pressure:'🌡️ Pression',confidence:'🪑 Président',budget:'💰 Budget',form:'📈 Dynamique',
  physique:'💪 Physique',mental:'🧠 Mental',corps:'🩻 Corps',entourage:'👪 Entourage',coachTrust:'🎽 Confiance du coach',forme:'📈 Forme',money:'💰 Argent'};
const FX_SPECIAL={injure:'🩼 Un blessé',sellStar:'💸 Ta star part',promoteYouth:'🌱 Un jeune monte',skipHalf:'⏭️ Une demi-saison sautée',stayLocal:'🏡 Plus de départ lointain',points:'⚖️ Points au classement',releaseCaptain:'👋 Un cadre s\'en va'};
function project(k,v){ return state.kind==='player'?playerProject(k,v):coachProject(k,v); }
/* Le même mot partout : `technique` est le Management de l'entraîneur·euse et la
   Technique du joueur·euse. Les pastilles d'effet affichaient « Management » dans une
   carrière de joueur·euse, alors que la fiche disait Technique deux centimètres plus haut. */
function fxLabel(k){ return state.kind==='player'&&k==='technique'?'⚽ Technique':FX_LABEL[k]; }
/* Un arbitrage se prend en sachant d'où l'on part : chaque effet chiffrable
   affiche sa valeur actuelle et celle qu'il donnerait. */
function effectChips(effects,seed){
  const out=[];
  Object.entries(effects||{}).forEach(([k,v])=>{
    if(k==='noReinvest') return;
    if(FX_SPECIAL[k]){ out.push(`<i class="minus">${FX_SPECIAL[k]}</i>`); return; }
    const pr=project(k,v);
    const lbl=fxLabel((pr&&pr.as)||k); if(!lbl||!v) return;
    // La couleur dit si c'est une bonne nouvelle : « Pression 41 → 32 » en vert.
    const good=k==='pressure'?v<0:v>0;
    const key=(pr&&pr.as)||k;
    if(pr&&fxVal(key,pr.cur)!==fxVal(key,pr.next)){
      out.push(`<i class="${good?'plus':'minus'}">${lbl} <b>${fxVal(key,pr.cur)}</b>→<b>${fxVal(key,pr.next)}</b></i>`);
      return;
    }
    const big=k==='budget'?Math.abs(v)>=.05:Math.abs(v)>=6;
    const sign=(v>0?'+':'−').repeat(big?2:1);
    out.push(`<i class="${good?'plus':'minus'}">${lbl} ${sign}</i>`);
  });
  if(seed) out.push('<i>🌱 une suite, un jour</i>');
  return out.length?`<div class="traits">${out.join('')}</div>`:'';
}
/* Le tableau demandé sous les choix : où en est chaque indicateur que ce
   choix va toucher, avant de trancher. */
function stateTable(keys){
  const seen=new Set(), rows=[];
  keys.forEach(k=>{ const pr=project(k,0); if(!pr) return;
    const key=pr.as||k; if(seen.has(key)||!fxLabel(key)) return; seen.add(key);
    const v=pr.cur, pct=key==='form'?(v+6)/12*100:clamp(v);
    const mood=key==='pressure'?(v>=85?'low':v>=50?'mid':''):(v>=65?'':v>=35?'mid':'low');
    rows.push(`<div class="st-row ${mood}"><span class="st-lbl">${fxLabel(key)}</span><span class="st-bar"><i style="width:${pct}%"></i></span><b>${fxVal(key,v)}</b></div>`);
  });
  if(!rows.length) return '';
  return `<div class="section-label">Où tu en es</div><div class="state-table">${rows.join('')}</div>`;
}
function effectKeys(list){ return list.flatMap(e=>Object.keys(e||{})); }
/* Le coût d'un renoncement tient sur une ligne : quatre pastilles de plus
   par option noyaient le choix. */
function effectInline(effects){
  return Object.entries(effects||{}).map(([k,v])=>{ const pr=project(k,v);
    const lbl=fxLabel((pr&&pr.as)||k); if(!lbl||!v) return '';
    const key=(pr&&pr.as)||k;
    return pr&&fxVal(key,pr.cur)!==fxVal(key,pr.next)?`${lbl} ${fxVal(key,pr.cur)}→${fxVal(key,pr.next)}`:`${lbl} ${v>0?'+':'−'}`;
  }).filter(Boolean).join(' · ');
}
const PHASE_NAMES=['Automne','Hiver','Printemps','Sprint final'];
/* Un seul écran d'événement : incident, dilemme, vie hors du terrain ou carrefour
   d'énergie. Le carrefour est un événement comme un autre — il n'arrive plus de nulle part. */
function renderEvent(){
  const ce=state.currentEvent, ev=ce.event;
  if(ce.kind==='carrefour') return renderCrossroad(ev);
  const kind={incident:'Incident de saison',dilemma:'Dilemme',happening:'Hors du terrain',situation:'Ce qui est en train de t\'arriver'}[ce.kind];
  // Une situation parle de ta saison : son texte se calcule au moment de l'afficher.
  const txt=typeof ev.text==='function'?ev.text():ev.text;
  const G=state.kind==='player'?PGAUGE:GAUGE_INFO;
  const fn=state.kind==='player'?'playerChooseEvent':'coachChooseEvent';
  return `<div class="card event-card"><div class="hint">${PHASE_NAMES[state.phase]||''} · ${kind}${ev.gauge?` · jauge ${G[ev.gauge]?G[ev.gauge].label:''} au plus bas`:''}</div><div class="ico">${ev.icon}</div><h2 class="display">${escapeHtml(ev.title)}</h2><p class="narr">${escapeHtml(txt)}</p><div class="choice-list">${ev.choices.filter(c=>!c.minYear||state.year>=c.minYear).map(c=>`<button class="choice-btn" onclick="${fn}(${ev.choices.indexOf(c)})"><div class="body"><b>${escapeHtml(c.label)}</b>${effectChips(c.effects,c.seed)}</div></button>`).join('')}</div>${stateTable(effectKeys(ev.choices.map(c=>c.effects)))}<div class="hint">Aucune option n'est gratuite : ce que tu gagnes d'un côté se paie de l'autre.</div></div>`;
}
/* Le carrefour : trois chantiers sur la table, un seul reçoit ton énergie du trimestre.
   Chaque option montre ce qu'elle fait avancer et ce qu'elle laisse reculer. */
function renderCrossroad(x){
  const player=state.kind==='player';
  const AREAS=player?PFOCUS_AREAS:FOCUS_AREAS;
  const fn=player?'playerChooseCrossroad':'coachChooseCrossroad';
  const moment=x.phase===0?'Avant-saison':(PHASE_NAMES[state.phase]||'');
  // Les mêmes facteurs que coachChooseCrossroad / playerChooseCrossroad :
  // ce qui est annoncé est exactement ce qui sera appliqué.
  const read=k=>k in state.stats?state.stats[k]:k in state.gauges?state.gauges[k]:null;
  const gainOf=k=>focusScaled(AREAS[k].gain,read,.7), lossOf=k=>focusScaled(AREAS[k].loss,read,.65);
  const touched=x.menu.flatMap(k=>[...Object.keys(AREAS[k].gain),...Object.keys(AREAS[k].loss)]);
  return `<div class="card event-card"><div class="hint">${moment} · Carrefour · où part ton énergie ce trimestre</div><div class="ico">${x.icon}</div><h2 class="display">${escapeHtml(x.title)}</h2><p class="narr">${escapeHtml(x.text)}</p>
    <div class="choice-list">${x.menu.map((k,i)=>{ const a=AREAS[k]; if(!a) return '';
      const others=x.menu.filter(o=>o!==k);
      const cost={}; others.forEach(o=>Object.entries(lossOf(o)).forEach(([ck,cv])=>{ cost[ck]=(cost[ck]||0)+cv; }));
      return `<button class="choice-btn" onclick="${fn}(${i})"><span class="ico">${a.icon}</span><div class="body"><b>${escapeHtml(a.label)}</b><small>${escapeHtml(a.desc)}</small>${effectChips(gainOf(k))}<span class="cost"><b>Ça attendra</b> — ${others.map(o=>escapeHtml(AREAS[o].label.toLowerCase())).join(' et ')} : ${effectInline(cost)}</span></div></button>`; }).join('')}</div>
    ${stateTable(touched)}
    <div class="hint">Tu ne peux en prendre qu'un. Les deux autres reculeront, et tu le sentiras.</div></div>`;
}
function renderRoulette(){ const ev=state.currentRoulette.event; const fn=state.kind==='player'?'playerChooseRoulette':'coachChooseRoulette';
  const fk=(ev.fate&&ev.fate.kind)||'death'; const sealed=fk!=='death'&&fk!=='banned';
  return `<div class="card event-card"><div class="hint">🎲 Roulette du destin · une seule des quatre issues ${sealed?'scelle le reste de ta carrière':'met fin à la carrière'}</div><div class="ico">${ev.icon}</div><h2 class="display">${escapeHtml(ev.title)}</h2><p class="narr">${escapeHtml(ev.text)}</p><div class="roulette-grid">${ev.choices.map((c,i)=>`<button class="choice-btn" onclick="${fn}(${i})"><div class="body"><b>${escapeHtml(c)}</b></div></button>`).join('')}</div><div class="hint" style="margin-top:10px">Issues cachées : ${sealed?`${ev.fate.icon} ${escapeHtml(ev.fate.label.toLowerCase())}`:'☠️ fin'} · 🌠 jackpot · 🍀 petit bonus · 🌧️ malus. Chaque issue laisse une trace sur les saisons suivantes.</div></div>`; }
/* ---------- Tableau de bord : les capteurs ---------- */
function strengthRow(r,total){
  const w=Math.min(100,Math.abs(r.v)/Math.max(.5,Math.abs(total)*.35)*100);
  const sign=r.abs?'':(r.v>0?'+':r.v<0?'−':'');
  const val=r.abs?niv(r.v):fo(Math.abs(r.v));
  return `<div class="kpi-row ${r.abs?'base':r.v>0?'up':r.v<0?'down':''}">
    <span class="kpi-ico">${r.icon}</span>
    <span class="kpi-lbl"><b>${escapeHtml(r.label)}</b><small>${escapeHtml(r.help)}</small></span>
    <span class="kpi-val">${sign}${val}</span>
    ${r.abs?'':`<span class="kpi-bar"><i class="${r.v>=0?'up':'down'}" style="width:${w}%"></i></span>`}
  </div>`;
}
function renderDashboard(){
  const c=state.club, st=state.stats, g=state.gauges, ss=state.seasonStats;
  if(!c) return `<div class="card no-sticky"><h2 class="display">Tableau de bord</h2><p class="narr">Tu es sans club : les capteurs reprennent dès que tu signes.</p>
    <div class="section-label">Toi</div>${Object.keys(CSTAT).map(k=>bar(CSTAT[k],st[k])).join('')}${bar('Pression',state.pressure,'pressure')}${coteHTML()}
    <div class="btn-row"><button class="btn" onclick="closeDashboard()">Retour →</button></div></div>`;
  const bd=coachStrengthBreakdown(), avg=coachLeagueAverage();
  const pos=state.comp?tablePos(state.comp.table,c.name):null;
  const tr=TRAINING[state.training]||TRAINING.tactique;
  const weeks=(ss&&ss.trainWeeks)||{};
  const totalWeeks=Object.values(weeks).reduce((a,b)=>a+b,0);
  const young=state.squad.filter(p=>playerAge(p,state.year)<=23&&p.lastDev!=null)
    .map(p=>({p,now:playerRating(p,state.year),d:p.lastDev}))
    .sort((a,b)=>b.d-a.d).slice(0,6);
  const hist=state.history.slice(-6);
  return `<div class="card no-sticky"><h2 class="display">Tableau de bord</h2>
    <p class="narr">Ce que valent tes réglages, en chiffres. Chaque ligne ci-dessous s'additionne pour donner la force que ton équipe emmène sur le terrain.</p>

    <div class="section-label">La force de ton équipe</div>
    <div class="kpi-total"><b>${niv(bd.total)}</b><span>${avg!=null?`moyenne du championnat ${niv(avg)} · tu es ${bd.total>avg+2?'au-dessus':bd.total<avg-2?'en dessous':'dans la moyenne'}`:''}</span></div>
    <div class="kpi-list">${bd.rows.map(r=>strengthRow(r,bd.total)).join('')}</div>
    <div class="hint">Change l'entraînement ou le style avant un match : la ligne correspondante bouge tout de suite.</div>

    <div class="section-label">L'entraînement de la semaine</div>
    <div class="kpi-train"><span class="ico">${tr.icon}</span><div><b>${tr.label}</b><small>${escapeHtml(tr.desc)}</small></div></div>
    ${totalWeeks?`<div class="hint">Cette saison : ${Object.entries(weeks).map(([k,n])=>`${(TRAINING[k]||{}).icon||''} ${(TRAINING[k]||{}).label||k} ${n} sem.`).join(' · ')}</div>`:'<div class="hint">Aucune semaine encore comptée cette saison.</div>'}
    ${young.length?`<div class="section-label">Ce que les jeunes ont gagné la saison dernière</div><div class="kpi-young">${young.map(y=>`<div><span>${escapeHtml(y.p.name)} <small>${playerAge(y.p,state.year)} ans</small></span><b class="${y.d>=.4?'up':y.d<=-.4?'down':''}">${d10(y.d)}</b><span class="n">${niv(y.now)}</span></div>`).join('')}</div><div class="hint">Le bilan est appliqué à l'intersaison. Trois choses le nourrissent : <b>ce qu'ils montrent sur le terrain</b> (la moyenne de leurs notes, autour de 6,1 pour un joueur quelconque), le temps de jeu que tu leur donnes, et ton travail de fond — ${ss&&ss.youthWeeks?`${ss.youthWeeks} semaine${ss.youthWeeks>1?'s':''} d'entraînement « jeunes » cette saison`:'aucune semaine d\'entraînement « jeunes » cette saison'}, jauge Formation ${sur10(g.formation)}.</div>`:`<div class="section-label">Les jeunes</div><div class="hint">Leur progression est calculée à l'intersaison : cette colonne apparaîtra après ta première saison complète. Ce qui la nourrit : <b>leurs performances</b> (la moyenne de leurs notes), le temps de jeu que tu leur donnes, l'entraînement « jeunes » (${ss&&ss.youthWeeks?ss.youthWeeks:0} semaine${ss&&ss.youthWeeks>1?'s':''} cette saison) et la jauge Formation (${sur10(g.formation)}).</div>`}

    <div class="section-label">Tes indicateurs</div>
    ${bar(CSTAT.talent+' — '+(st.talent>=70?'tu peux imposer les styles exigeants':'les styles prestigieux te coûtent encore'),st.talent)}
    ${bar(CSTAT.technique+' — vestiaire, jeunes, présidents',st.technique)}
    ${bar(CSTAT.reseau+' — la qualité des offres et des pistes',st.reseau)}
    ${bar(CSTAT.reputation+' — ce que la presse et les clubs retiennent',st.reputation)}
    ${bar('Pression — au-delà de 8,5, la crise guette',state.pressure,'pressure')}

    <div class="section-label">Les cinq jauges</div>
    ${Object.keys(GAUGE_INFO).map(k=>gaugeRow(GAUGE_INFO[k],g[k])).join('')}
    <div class="hint">${escapeHtml(GAUGE_INFO.proches.help)}</div>

    ${quotaActive()?`<div class="section-label">Le quota d'étrangers</div>${quotaHTML()}`:''}

    <div class="section-label">Le club</div>
    <div class="hint">${escapeHtml(c.name)} · ${escapeHtml(c.leagueName||'')}${pos?` · ${ordinal(pos)}`:''} · objectif ${ordinal(c.objectivePos)}${c.objectivePromised&&c.objectivePromised!==c.objectivePos?` <i>(${ordinal(c.objectivePromised)} promis à la signature, revu après le mercato)</i>`:''} · confiance ${sur10(c.confidence)}/10<br>Masse salariale ${$(state.squad.reduce((n,p)=>n+p.wage,0))} / ${$(c.wageCap||0)} · ${state.squad.length} joueurs · fraîcheur ${Math.round(state.squad.reduce((n,p)=>n+fit(p),0)/Math.max(1,state.squad.length))} %</div>

    ${hist.length?`<div class="section-label">Tes dernières saisons</div><div class="kpi-hist">${hist.map(h=>`<div><span class="y">${h.year}</span><span class="cl">${escapeHtml(h.club)}</span><span class="r">${h.sacked?'🪓':h.pos?ordinal(h.pos):'—'}</span></div>`).join('')}</div>`:''}

    ${tempoSelectHTML()}
    <div class="btn-row"><button class="btn" onclick="closeDashboard()">Retour au jeu →</button></div></div>`;
}
/* Version joueur·euse : ce que le coach voit de toi, et ce que ton corps encaisse */
function renderPlayerDashboard(){
  const st=state.stats, g=state.gauges, c=state.club, ss=state.seasonStats;
  const share=c?playerShare():0;
  const rivals=c?state.squad.filter(p=>p.pos===state.pos&&!p.isMe).map(p=>playerRating(p,state.year)).sort((a,b)=>b-a).slice(0,3):[];
  const avgNote=ss&&ss.notes&&ss.notes.length?ss.notes.reduce((a,b)=>a+b,0)/ss.notes.length:null;
  return `<div class="card no-sticky"><h2 class="display">Tableau de bord</h2>
    <p class="narr">Ce qui décide si tu joues dimanche.</p>
    <div class="kpi-total"><b>${niv(pRating())}</b><span>ta note globale${rivals.length?` · concurrents à ton poste : ${rivals.map(r=>niv(r)).join(', ')}`:''}</span></div>
    ${c?`<div class="section-label">Ta place dans le groupe</div>
    ${bar('Chances d\'être titulaire (%)',share*100,'',true)}
    ${bar('Confiance du coach',state.coachTrust)}
    ${bar('Forme',state.forme)}
    <div class="hint">Rôle promis : ${ROLES[c.role].name.toLowerCase()} · ${escapeHtml(c.name)} · ${escapeHtml(c.leagueName||'')}${avgNote?` · moyenne cette saison ${avgNote.toFixed(2).replace('.',',')}`:''}</div>`:''}
    <div class="section-label">Tes qualités</div>
    ${Object.keys(PSTAT).map(k=>bar(PSTAT[k],st[k])).join('')}
    ${bar('Pression',state.pressure,'pressure')}
    ${knownHTML()}<div class="hint">Une qualité et un défaut t'ont été donnés à la naissance de la carrière, sur deux axes différents. Les points sont dans tes chiffres depuis le premier jour ; leur nom se découvre en jouant.</div>
    <div class="section-label">Ce que tu fais de tes semaines</div>
    ${(()=>{ const e=pEffort(), c=pTrainingCurve(e), sh=pLoadShare(), w=(ss&&ss.trainWeeks)||0;
      const lt=state.lastTrain;
      return `<div class="hint">Charge moyenne <b>${e.toFixed(2).replace('.',',')}</b> sur ${w} semaine${w>1?'s':''} décidée${w>1?'s':''} · ta progression est multipliée par <b>${c.toFixed(2).replace('.',',')}</b>.<br>${escapeHtml(pTrainingCurveHelp())}<br>Tu as poussé : ⚽ ${Math.round(sh.technique*100)} % · 💪 ${Math.round(sh.physique*100)} % · 🧠 ${Math.round(sh.mental*100)} %.${lt?`<br>La saison dernière : charge ${lt.effort}, multiplicateur ${lt.curve}, ${lt.growth>0?'+':''}${lt.growth} de progression appliquée.`:''}</div>`; })()}
    <div class="section-label">Tes quatre jauges</div>
    ${Object.keys(PGAUGE).map(k=>gaugeRow(PGAUGE[k],g[k])).join('')}
    <div class="hint">${escapeHtml(PGAUGE.corps.help)}</div>
    ${tempoSelectHTML()}
    <div class="btn-row"><button class="btn" onclick="closeDashboard()">Retour au jeu →</button></div></div>`;
}
function renderPressure(){ const list=state.kind==='player'?PLAYER_PRESSURE_CHOICES:PRESSURE_CHOICES; const fn=state.kind==='player'?'playerChoosePressure':'coachChoosePressure'; return `<div class="card event-card"><div class="ico">🌡️</div><h2 class="display">${state.kind==='player'?'Craquage':'Crise de pression'}</h2><p class="narr">La pression atteint ${sur10(state.pressure)}/10. Insomnies, malaise, une famille inquiète. Il faut décider.</p><div class="choice-list">${list.map((c,i)=>`<button class="choice-btn" onclick="${fn}(${i})"><span class="ico">${c.icon}</span><div class="body"><b>${c.label}</b><small>${c.sub}</small></div></button>`).join('')}</div></div>`; }
function tableHTML(table,me,full){
  const N=table.length, meIdx=table.findIndex(r=>r.name===me);
  const keep=full?new Set(table.map((_,i)=>i)):new Set([0,1,2,3,N-1,N-2,N-3,meIdx-1,meIdx,meIdx+1].filter(i=>i>=0&&i<N));
  let rows='',gap=false; table.forEach((r,i)=>{ if(keep.has(i)){ rows+=`<tr class="${r.name===me?'me':''}"><td>${i+1}</td><td>${escapeHtml(r.name)}</td><td class="r">${r.w}-${r.d}-${r.l}</td><td class="r">${r.gf-r.ga>0?'+':''}${r.gf-r.ga}</td><td class="r">${r.pts}</td></tr>`; gap=false; } else if(!gap){ rows+='<tr><td colspan="5" style="color:var(--muted)">…</td></tr>'; gap=true; } });
  return `<table class="table"><thead><tr><th>#</th><th>Club</th><th class="r">V-N-D</th><th class="r">Diff</th><th class="r">Pts</th></tr></thead><tbody>${rows}</tbody></table>`;
}
function phaseTrack(){ return `<div class="phase-track">${['Automne','Hiver','Printemps','Sprint final'].map((l,i)=>`<span class="${i<state.phase?'done':i===state.phase?'now':''}">${l}</span>`).join('')}</div>`; }
function matchesHTML(mine,me){ return `<div class="matches">${mine.map(m=>`<div class="match ${m.res}" title="${escapeHtml(m.story||'')}"><div class="line"><span>${m.home===me?'<b>'+escapeHtml(m.home)+'</b>':escapeHtml(m.home)}</span><span class="sc">${m.gh} – ${m.ga}</span><span>${m.away===me?'<b>'+escapeHtml(m.away)+'</b>':escapeHtml(m.away)}</span></div>${m.scorers||m.mine?`<div class="sub">${escapeHtml(m.mine||m.scorers)}</div>`:''}</div>`).join('')}</div>`; }

/* ---------- Écrans entraîneur·euse ---------- */
function renderOffers(){
  const offers=state.currentOffers||[];
  if(!offers.length) return `<div class="card"><h2 class="display">Aucune proposition</h2><p class="narr">Le téléphone reste silencieux cette année. Ta réputation (${Math.round(state.stats.reputation)}) ne suffit plus, ou le marché est saturé.</p><div class="btn-row"><button class="btn" onclick="coachSkipYear()">Attendre une année</button></div></div>`;
  const stay=offers.find(o=>o.stay); const under=stay&&stay.underContract; const cote=Math.round(state.cote==null?30:state.cote);
  const fate=state.rouletteFate;
  if(fate&&fate.kind==='exclusive') return `<div class="card"><h2 class="display">${fate.icon} ${escapeHtml(fate.label)}</h2><p class="narr">${escapeHtml(fate.text)}</p><p class="hint">${state.year} · ${state.age} ans. ${fate.installed?`${escapeHtml(state.club?state.club.name:'')} : aucune autre proposition ne t'atteindra, il ne reste qu'à repartir pour une saison.`:"Le propriétaire a racheté ton contrat. Signe, et ce sera pour toujours."}</p>
    <div class="offer-grid">${offers.map((o,i)=>`<div class="offer-card affordable poach" onclick="coachAcceptOffer(${i});render()"><div class="club">${TIER_INFO[o.tier].icon} ${TIER_INFO[o.tier].label} · lié à vie</div><h3>${escapeHtml(o.club)}</h3><div class="syn narr">${escapeHtml(o.title)}. ${capitalize(o.presidentName)} : ${escapeHtml(o.presidentDesc)}</div>
      <div class="meta"><span class="tag gold">${escapeHtml(o.leagueName)}</span><span class="tag">Objectif : ${ordinal(o.objectivePos)} / ${o.teams}</span><span class="tag">${styleById(o.styleWanted).icon} ${styleById(o.styleWanted).name} demandé</span></div>
      <div class="budget">Budget transferts : ${$(o.budget)}</div><div class="offer-hint good">⛓️ Une saison de plus, au même endroit</div></div>`).join('')}</div></div>`;
  return `<div class="card"><h2 class="display">${under?'Intersaison sous contrat':'Les bancs qui te tendent les bras'}</h2><p class="hint">${state.year} · ${state.age} ans · cote ${sur10(cote)} : ${coteLabel(coachTargetStrength())}.${fate?` ${fate.icon} ${escapeHtml(fate.label)} : ${escapeHtml(fate.text)}`:''} ${under?`${state.club.contractEnd>=9999?'Ton contrat te lie à vie.':`Ton contrat court jusqu'en ${state.club.contractEnd}.`} ${offers.length>1?'Un club vient te chercher : à toi de voir.':'Personne ne vient te chercher cette année.'}`:'Les offres arrivent autour de ta cote : un cran au-dessus si tu as performé, en dessous après un échec.'}</p>
    <div class="offer-grid">${offers.map((o,i)=>`<div class="offer-card affordable ${o.poach?'poach':''}" onclick="coachAcceptOffer(${i});render()"><div class="club">${TIER_INFO[o.tier].icon} ${TIER_INFO[o.tier].label}${o.stay?(o.underContract?' · sous contrat':' · prolonger'):o.poach?' · vient te chercher':''}</div><h3>${escapeHtml(o.club)}</h3><div class="syn narr">${escapeHtml(o.title)}. ${capitalize(o.presidentName)} : ${escapeHtml(o.presidentDesc)}</div>
      <div class="meta"><span class="tag gold">${escapeHtml(o.leagueName)}</span><span class="tag">Objectif : ${ordinal(o.objectivePos)} / ${o.teams}</span><span class="tag">${styleById(o.styleWanted).icon} ${styleById(o.styleWanted).name} demandé</span><span class="tag">Force ${'★'.repeat(Math.max(1,o.s||1))} · ${gapLabel(o.gap||0)}</span><span class="tag">${o.stay&&o.underContract?`${o.duration} an${o.duration>1?'s':''} restant${o.duration>1?'s':''}`:`contrat ${o.duration} an${o.duration>1?'s':''}`}</span></div>
      <div class="budget">Budget transferts : ${$(o.budget)}</div><div class="offer-hint ${o.stay||o.poach?'good':o.styleWanted===state.favoriteStyleId?'good':''}">${o.stay?(o.underContract?'🏠 Tu honores ton contrat : continuité du projet':'🏠 Le président te garde et prolonge'):o.poach?'🎯 Un projet plus grand qui paie la clause':o.styleWanted===state.favoriteStyleId?'❤️ Le club veut ton style de jeu':o.tier==='amateur'||o.tier==='ligue2'?'🌱 Petit budget, présidents plus patients':'🎯 Objectif exigeant, moyens à la hauteur'}</div></div>`).join('')}</div>
    <div class="btn-row">${under?'<button class="btn secondary" onclick="if(confirm(\'Rompre ton contrat ? Réputation −4, cote −3.\')) coachBreakContract()">Rompre le contrat et écouter le marché</button>':''}<button class="btn secondary" onclick="coachSkipYear()">Refuser tout et prendre une année sabbatique</button></div></div>`;
}
/* ---------- Le mercato, dossier par dossier ----------
   Un joueur à la fois, et sous lui exactement ce qu'il faut pour trancher :
   ce que j'ai, ce qu'il coûte, qui il remplacerait, et qui vendre s'il manque
   quelque chose. Plus de liste à fouiller. */
const POS_PLURAL={G:'gardiens',D:'défenseurs',M:'milieux',A:'attaquants'};
function posPlural(pos){ return POS_PLURAL[pos]||POS_LABEL[pos].toLowerCase(); }
/* Un joueur se lit par sa manière de jouer : ce qu'il aime, ce qui le gêne,
   et comment ça tombe dans le style que tu fais jouer aujourd'hui. */
function profilCardHTML(p){
  const pr=playerProfil(p), mine=state.styleId, f=styleFit(p,mine), st=styleById(mine);
  const list=ids=>ids.map(id=>`${styleById(id).icon} ${styleById(id).name}`).join(', ');
  return `<div class="profil ${f>0?'good':f<0?'bad':''}">
    <div class="pf-head"><span class="pf-ico">${pr.icon}</span><b>${pr.label}</b>
      <i class="pf-fit">${f>0?`✅ taillé pour ton ${st.name.toLowerCase()}`:f<0?`⚠️ mal à l'aise dans ton ${st.name.toLowerCase()}`:`➖ s'accommode de ton ${st.name.toLowerCase()}`}</i></div>
    <small>${escapeHtml(pr.desc)}</small>
    ${pr.loves.length?`<small class="pf-line">Il s'épanouit en ${list(pr.loves)}.</small>`:'<small class="pf-line">Aucun style ne le gêne, aucun ne le transcende.</small>'}
    ${pr.hates.length?`<small class="pf-line bad">Il souffre en ${list(pr.hates)}.</small>`:''}</div>`;
}
/* Sur une ligne d'effectif, une pastille suffit. */
function fitTag(p){
  const f=styleFit(p,state.styleId), pr=playerProfil(p);
  return `<span class="fit-tag ${f>0?'good':f<0?'bad':''}" title="${escapeHtml(`${pr.label} — ${fitWord(f)} en ${styleById(state.styleId).name.toLowerCase()}`)}">${pr.icon}${f>0?'✅':f<0?'⚠️':''}</span>`;
}
function moneyBar(cur,cap,warn){
  const pct=Math.max(0,Math.min(100,cap>0?cur/cap*100:0));
  return `<span class="mbar ${warn?'over':''}"><i style="width:${pct}%"></i></span>`;
}
function renderMercato(){
  const m=state.market, c=state.club, y=state.year;
  const wages=squadWages(), fmax=eraForeignersMax(y);
  const kinds={all:'Tous',real:'Stars',pro:'Pros',youth:'Pépites',free:'Libres',academy:'Centre'};
  const cur=marketCurrent();
  const head=`<div class="mk-head">
      <div><span>Budget transferts</span><b>${$(m.budgetLeft)}</b></div>
      <div class="${wages>c.wageCap?'warn-box':''}"><span>Masse salariale</span><b>${$(wages)}</b><small>plafond ${$(c.wageCap)}</small>${moneyBar(wages,c.wageCap,wages>c.wageCap)}${wages>c.wageCap*1.1?`<small class="warn-note">${Math.round(wages/c.wageCap*100)} % : au-dessus de 110 %, le président retire 3 de confiance à chaque bilan de phase.</small>`:''}</div>
      <div><span>Effectif</span><b>${state.squad.length} / 27</b></div>
      ${quotaActive()?`<div class="${foreignCount()>=fmax?'warn-box':''}"><span>Étrangers</span><b>${foreignCount()} / ${fmax}</b></div>`:''}
    </div>`;
  const live=m.targets.filter(t=>!t.dropped);
  const tabs=`<div class="market-tabs">${Object.entries(kinds).map(([k,l])=>`<button class="${marketFilter===k?'on':''}" onclick="coachMarketFilter('${k}')">${l} (${k==='all'?live.length:live.filter(t=>t.kind===k).length})</button>`).join('')}</div>`
    +(m.dropped?`<div class="hint">${m.dropped} dossier${m.dropped>1?'s':''} écarté${m.dropped>1?'s':''}. <button class="btn secondary small" onclick="coachUndropAll()">Tout remettre sur la table</button></div>`:'');
  let card;
  if(!cur){
    card=`<div class="mk-empty"><div class="ico">📭</div><b>Plus aucun dossier dans cette catégorie.</b><span>Change de catégorie, ou clos le mercato.</span></div>`;
  } else {
    const t=cur.t, p=t.p, blockers=coachBlockers(t), rivals=coachRivals(t), sales=coachSaleOptions(t);
    const ok=!blockers.length;
    const rating=t.kind==='youth'?`≈ ${niv(t.shownRating)}`:niv(t.shownRating);
    const better=rivals.filter(r=>r.rating<t.shownRating).length;
    card=`<div class="mk-card ${t.access}">
      <div class="mk-kind">${t.label} · via ${escapeHtml(t.source)}</div>
      <div class="mk-name"><span class="pos-badge pos-${p.pos}">${p.pos}</span> <b class="${p.real?'real':''}">${escapeHtml(p.name)}</b> ${natTag(p,true)}</div>
      <div class="mk-line">${t.age} ans · niveau <b>${rating}</b> ${t.kind==='youth'?'<i>(potentiel inconnu)</i>':stars(t.shownRating)}</div>
      ${profilCardHTML(p)}
      <div class="mk-deal"><div><span>Transfert</span><b>${t.price>0?$(t.price):'libre'}</b></div><div><span>Salaire / an</span><b>${$(t.wage)}</b></div><div><span>${t.price>m.budgetLeft?'Il te manquerait':'Ton budget après'}</span><b class="${t.price>m.budgetLeft?'bad':''}">${$(Math.abs(m.budgetLeft-t.price))}</b></div></div>
      ${t.access==='coup'?'<div class="mk-flag">⭐ Gros coup : il exige une place de titulaire.</div>':''}
      ${t.access==='no'?'<div class="mk-flag bad">Il ne répond pas. Ta crédibilité est trop basse.</div>':''}

      <div class="section-label">À son poste, tu as déjà</div>
      <div class="mk-rivals">${rivals.length?rivals.slice(0,5).map(r=>`<div class="${r.rating<t.shownRating?'worse':''}"><span>${natTag(r.p)} ${escapeHtml(r.p.name)}</span><small>${r.age} ans</small><b>${niv(r.rating)}</b><small>${$(r.p.wage)}</small></div>`).join(''):'<div class="hint">Personne à ce poste. Tu en as besoin.</div>'}</div>
      ${rivals.length?`<div class="hint">${better?`Il serait meilleur que ${better} de tes ${posPlural(p.pos)}.`:`Aucun de tes ${posPlural(p.pos)} ne fait moins bien que lui.`}</div>`:''}

      ${blockers.length?`<div class="mk-block"><b>Ce qui bloque</b>${blockers.map(b=>`<span>${escapeHtml(b.txt)}</span>`).join('')}</div>`:''}
      ${blockers.length?(sales.length&&coachSalesCover(t)
        ?`<div class="section-label">Vendre pour le faire entrer</div><div class="mk-sales">${sales.map(x=>`<button class="mk-sale" onclick="coachSell(${x.p.id})"><span>${natTag(x.p)} ${escapeHtml(x.p.name)}</span><small>${x.age} ans · niveau ${niv(x.rating)} · salaire ${$(x.p.wage)}</small><b>+${$(x.value)}</b></button>`).join('')}</div>`
        :`<div class="hint">Aucune vente de ton effectif ne comblerait l'écart. Ce dossier n'est pas pour cette saison.</div>`):''}

      <div class="btn-row mk-actions">
        <button class="btn secondary" onclick="coachMarketGo(-1)">← Précédent</button>
        <button class="btn ${ok?'':'secondary'}" ${ok?'':'disabled'} onclick="coachBuy(${cur.i})">${ok?'Le recruter ✅':'Impossible pour l\'instant'}</button>
        <button class="btn secondary" onclick="coachMarketGo(1)">Passer →</button>
      </div>
      <div class="btn-row"><button class="btn danger small" onclick="coachDropTarget(${cur.i})">Écarter ce dossier ✕</button></div>
      <div class="mk-count">Dossier ${cur.pos} sur ${cur.total}${m.dropped?` · ${m.dropped} écarté${m.dropped>1?'s':''}`:''}</div>
    </div>`;
  }
  const squadRow=p2=>{ const undo=p2.joinedWindow===marketWindow()&&p2.paid!=null;
    return `<tr class="${p2.injury?'inj':''}"><td><span class="pos-badge pos-${p2.pos}">${p2.pos}</span></td><td>${natTag(p2)} ${fitTag(p2)} ${escapeHtml(p2.name)}${p2.promised?' ⭐':''}${undo?' <i class="tag-undo" title="Recruté dans ce mercato : le revendre annule le transfert au prix payé.">recrue</i>':''}</td><td>${playerAge(p2,y)}</td><td><b>${niv(playerRating(p2,y))}</b></td><td class="r">${$(p2.wage)}</td><td class="r">${undo?$(p2.paid):$(playerValue(p2,y))}</td><td class="r"><button class="btn secondary small" onclick="coachSell(${p2.id})">${undo?'Annuler':'Vendre'}</button></td></tr>`; };
  return `<div class="card no-sticky"><h2 class="display">${m.winter?'Mercato d\'hiver':'Mercato d\'été'} · ${escapeHtml(c.name)}</h2>
    ${head}
    ${m.message?`<div class="msg">${escapeHtml(m.message)}</div>`:''}
    ${tabs}
    ${card}
    ${quotaHTML()}
    ${m.bought.length||m.sold.length?`<div class="section-label">Ce que tu as fait</div><div class="hint">${m.bought.map(b=>`➕ ${escapeHtml(b.name)} (${$(b.price)})`).join(' · ')}${m.bought.length&&m.sold.length?' · ':''}${m.sold.map(x=>`➖ ${escapeHtml(x.name)} (${$(x.price)})`).join(' · ')}</div>`:''}
    <div class="section-label">Ton effectif · ${state.squad.length} joueurs · masse salariale ${$(wages)}</div>
    <div class="hint">Vends ici pour libérer du budget ou de la place. La valeur suit le niveau, l'âge et les notes de la saison en cours. Un joueur marqué <i class="tag-undo">recrue</i> a été recruté dans ce mercato-ci : le rendre annule simplement le transfert. Recruté en été, il se vendra normalement dès le mercato d'hiver.${wages>c.wageCap?` <b>Ta masse salariale dépasse le plafond de ${$(wages-c.wageCap)} : tu ne peux plus recruter sans vendre.</b>`:''}</div>
    <div style="overflow-x:auto"><table class="squad-table"><thead><tr><th></th><th>Joueur</th><th>Âge</th><th>Niv.</th><th class="r">Salaire</th><th class="r">Valeur</th><th></th></tr></thead><tbody>${['G','D','M','A'].map(pos=>state.squad.filter(x=>x.pos===pos).sort((a,b)=>playerRating(b,y)-playerRating(a,y)).map(squadRow).join('')).join('')}</tbody></table></div>
    <div class="btn-row"><button class="btn" onclick="coachCloseMercato()">Clore le mercato →</button></div></div>`;
}
function renderTactic(){
  if(!tacticSel||tacticSel.year!==state.year||tacticSel.club!==state.club.name) tacticSel={formation:state.formation,style:state.styleId,year:state.year,club:state.club.name};
  const c=state.club, notes=state.market&&state.market.closingNotes||[];
  const y=state.year; const xi=bestXI(state.squad,FORMATIONS[tacticSel.formation],y);
  return `<div class="card">${notes.length?`<div class="section-label">Révélations du mercato</div>${notes.map(n=>`<div class="warn">${n}</div>`).join('')}`:''}${c.objectiveNote?`<div class="warn">🎯 ${escapeHtml(c.objectiveNote)}</div>`:''}<h2 class="display">Plan de jeu</h2><p class="hint">Le club demande <b>${styleById(c.styleWanted).icon} ${styleById(c.styleWanted).name}</b> (+2 de force si tu le suis). Ton style favori (${styleById(state.favoriteStyleId).icon} ${styleById(state.favoriteStyleId).name}) donne +1,5. Un style prestigieux exige de la tactique (${Math.round(state.stats.talent)}).</p>
    <div class="section-label">Formation</div><div class="formation-grid">${Object.keys(FORMATIONS).map(f=>`<button class="${tacticSel.formation===f?'on':''}" onclick="tacticSel.formation='${f}';render()"><b>${f}</b></button>`).join('')}</div>
    <div class="section-label">Style</div>
    <div class="hint">Chaque style va à certains de tes joueurs et en contrarie d'autres : le chiffre à droite compte ton onze.</div>
    <div class="style-grid">${STYLES.map(s=>{ const fit=coachStyleFit(s.id);
      return `<button class="${tacticSel.style===s.id?'on':''}" onclick="tacticSel.style='${s.id}';render()"><b>${s.icon} ${s.name}</b><span class="style-fit ${fit.plus>fit.minus?'good':fit.minus>fit.plus?'bad':''}">✅ ${fit.plus} · ⚠️ ${fit.minus}</span><small>${s.desc}${s.id===c.styleWanted?' · <b>demandé par le club</b>':''}${s.id===state.favoriteStyleId?' · <b>ton style</b>':''}${s.prestige*60>state.stats.talent?` · exige tactique ${sur10(s.prestige*60)}`:''}</small></button>`; }).join('')}</div>
    <div class="section-label">Onze type en ${tacticSel.formation}</div><div class="squad">${xi.map(p=>{ const f=styleFit(p,tacticSel.style); const pr=playerProfil(p);
      return `<div class="${f>0?'fit-ok':f<0?'fit-no':''}"><span class="pos-badge pos-${p.pos}">${p.pos}</span> ${escapeHtml(p.name)} <small title="${escapeHtml(pr.label)}">${pr.icon}${f>0?'✅':f<0?'⚠️':''}</small> <span>${niv(playerRating(p,y))}</span></div>`; }).join('')}</div>
    <div class="btn-row"><button class="btn" onclick="coachSetTactic(tacticSel.formation,tacticSel.style);render()">${state.tacticAfterWinter?'Reprendre la saison →':'Lancer la saison →'}</button></div></div>`;
}
/* Le « pourquoi » d'une phase lit exactement la même décomposition que le
   tableau de bord et que le match. Trois formules différentes donnaient trois
   réponses différentes à la même question. */
function impactLines(){
  const c=state.club, bd=coachStrengthBreakdown(), lines=[];
  lines.push({t:`Niveau de l'effectif ${niv(bd.base)} pour une force de club attendue de ${niv(c.strength)}`,d:bd.base-c.strength});
  bd.rows.filter(r=>!r.abs&&Math.abs(r.v)>=.05).forEach(r=>lines.push({t:`${r.label} — ${r.help}`,d:r.v}));
  const inj=state.squad.filter(p=>p.injury).length; if(inj) lines.push({t:`${inj} blessé${inj>1?'s':''} à soigner (staff ${sur10(state.gauges.staff)})`,d:-inj*.6});
  lines.push({t:`Force emmenée sur le terrain : ${niv(bd.total)}`,d:0});
  return `<div class="impact">${lines.map(l=>`<div class="${l.d>=.5?'up':l.d<=-.5?'down':''}">${l.d>=.5?'▲':l.d<=-.5?'▼':'•'} ${escapeHtml(l.t)}</div>`).join('')}</div>`;
}
/* Ce qui a bougé la confiance du président, ligne par ligne : c'est le chiffre
   qui licencie, il ne peut pas rester sans explication. */
function confWhyHTML(ph){
  if(!ph.confWhy||!ph.confWhy.length) return '';
  return `<div class="impact">${ph.confWhy.map(l=>`<div class="${l.d>=.5?'up':l.d<=-.5?'down':''}">${l.d>=.5?'▲':l.d<=-.5?'▼':'•'} ${escapeHtml(l.t)} <b>${l.d>0?'+':l.d<0?'':'±'}${String(l.d).replace('.',',')}</b></div>`).join('')}</div>`;
}
function renderPhaseResult(){
  const ph=state.lastPhase, c=state.club, N=state.comp.teams.length;
  const conf=c.confidence; const gap=c.objectivePos-ph.pos;
  return `<div class="card"><h2 class="display">Phase ${ph.n} · ${escapeHtml(c.leagueName)}</h2>${phaseTrack()}
    <div class="score-grid"><div class="score-box gold"><div class="v">${ordinal(ph.pos)}</div><div class="k">sur ${N} · objectif ${ordinal(c.objectivePos)}</div></div><div class="score-box ${ph.W>ph.L?'good':ph.L>ph.W?'bad':''}"><div class="v">${ph.W}-${ph.D}-${ph.L}</div><div class="k">V-N-D · ${ph.gf} buts pour, ${ph.ga} contre</div></div><div class="score-box ${ph.dConf>=0?'good':'bad'}"><div class="v">${d10(ph.dConf)}</div><div class="k">Confiance du président → ${sur10(conf)}</div></div><div class="score-box"><div class="v">${niv(ph.strength)}</div><div class="k">Force en match${ph.base!=null?` · effectif seul ${niv(ph.base)}`:''}</div></div></div>
    <div class="section-label">Tes matchs</div>${matchesHTML(ph.matches,c.name)}
    ${ph.injuries.length?`<div class="warn">🩼 Blessures : ${ph.injuries.map(escapeHtml).join(', ')}</div>`:''}
    <div class="section-label">Pourquoi ce résultat</div>${impactLines()}
    <div class="section-label">La confiance du président : ${ph.dConf>=0?'+':''}${ph.dConf}</div>${confWhyHTML(ph)}
    <div class="hint">${gap>=2?`Tu es ${gap} place${gap>1?'s':''} au-dessus de l'objectif : ${c.presidentName} savoure.`:gap>=0?`Tu tiens l'objectif. ${capitalize(c.presidentName)} reste calme.`:gap>=-3?`Tu es ${-gap} place${gap<-1?'s':''} sous l'objectif. ${capitalize(c.presidentName)} s'impatiente.`:`Tu es loin de l'objectif (${-gap} places). ${capitalize(c.presidentName)} pense à ton successeur.`}${conf<=20?' <b>Le prochain faux pas sera le dernier.</b>':''}</div>
    <div class="section-label">Classement</div>${tableHTML(ph.table,c.name,true)}
    <div class="btn-row"><button class="btn" onclick="coachAfterPhase()">${state.phase>=4?'Bilan de la saison →':state.phase===2&&eraHasWinterMercato(state.year)?'Mercato d\'hiver →':'Phase suivante →'}</button></div></div>`;
}
function cupPathHTML(path,label){ return `<div class="cup-path"><b>${label}</b><br>${path.map(r=>`Tour ${r.round} : ${r.gh}–${r.ga}${r.pen?' (t.a.b.)':''} contre ${escapeHtml(r.opp)} ${r.win?'✅':'❌'}`).join('<br>')}</div>`; }
/* ---------- Le bilan : le temps où l'on souffle ----------
   On ne décide plus, on lit ce que l'année a produit — sur le terrain,
   dans le vestiaire, chez le président et chez soi. */
function scoreLine(m,me){ const home=m.us==='home'; return `${escapeHtml(m.home)} ${m.gh} – ${m.ga} ${escapeHtml(m.away)}`; }
function bilanGaugeRow(g){
  const d=g.after-g.before;
  return `<div class="bil-row"><span>${g.icon} ${escapeHtml(g.label)}</span>
    <span class="bil-bar"><i style="width:${clamp(g.after)}%"></i></span>
    <b>${sur10(g.after)}</b><i class="${d>0?'up':d<0?'down':''}">${d?d10(d):'='}</i></div>`;
}
function renderSeasonEnd(){
  const f=state.lastSeason, c=state.club, b=f.bilan||{};
  const icon=f.champion?'🏆':f.euro&&f.euro.won?'⭐':f.relegated?'⬇️':f.objectiveMet?'✅':'❌';
  const verdict=f.champion?(f.promotion?'Montée !':'Champion·ne !'):f.relegated?'Relégation':f.objectiveMet?'Objectif atteint':'Objectif manqué';
  const p=b.pressure||{before:0,after:0}, dp=p.after-p.before;
  return `<div class="card no-sticky bilan">
    <div class="result-hero"><span class="result-hero-icon">${icon}</span>
      <h2 class="display">${escapeHtml(f.club)} · ${f.year}-${f.year+1}</h2>
      <div class="verdict">${verdict} · ${ordinal(f.pos)} sur ${f.teams} en ${escapeHtml(f.league)} · objectif ${ordinal(f.objective)}</div></div>

    <div class="score-grid"><div class="score-box gold"><div class="v">${ordinal(f.pos)}</div><div class="k">Classement</div></div><div class="score-box"><div class="v">${f.goals} / ${f.conceded}</div><div class="k">Buts pour / contre</div></div><div class="score-box ${f.cupWon?'good':''}"><div class="v">${f.cupWon?'🥇':f.cupRounds}</div><div class="k">${f.cupWon?'Coupe gagnée':'Tour atteint en coupe'}</div></div><div class="score-box ${f.dConf>=0?'good':'bad'}"><div class="v">${d10(f.dConf)}</div><div class="k">Confiance → ${sur10(f.confidence)}</div></div></div>
    ${f.award?`<div class="trophy-line">🎖️ ${f.award}</div>`:''}${f.euro?`<div class="trophy-line">${f.euro.won?'⭐ Vainqueur de la '+escapeHtml(f.euro.name):'🌍 '+escapeHtml(f.euro.name)+' : éliminé au tour '+f.euro.rounds}</div>`:''}

    <div class="bil-sections">
      <section><h3>🎞️ Le film de l'année</h3>
        ${b.best?`<div class="bil-note good"><b>Le grand soir</b><span>${scoreLine(b.best)}</span><small>${escapeHtml(b.best.story||'')}</small></div>`:''}
        ${b.worst?`<div class="bil-note bad"><b>Le soir qu'on oublie</b><span>${scoreLine(b.worst)}</span><small>${escapeHtml(b.worst.story||'')}</small></div>`:''}
        <div class="hint">${b.meetings||0} décision${(b.meetings||0)>1?'s':''} prise${(b.meetings||0)>1?'s':''} cette saison${b.effort?` · l'année a été portée sur ${b.effort==='coupe'?'la coupe d\'Europe':b.effort==='championnat'?'le championnat':'les deux fronts'}`:''}.${f.topScorer?` Meilleur buteur : ${escapeHtml(f.topScorer)}.`:''}${f.bestPlayer?` Joueur de la saison : ${escapeHtml(f.bestPlayer)}.`:''}</div>
        ${b.decisions&&b.decisions.length?`<div class="bil-decisions"><b>Tes derniers arbitrages</b>${b.decisions.map(d=>`<span><i>${d.icon}</i><em>${escapeHtml(d.title)}</em><u>${escapeHtml(d.choice)}</u></span>`).join('')}</div>`:''}
      </section>

      <section><h3>✊ Le vestiaire</h3>
        ${b.risen&&b.risen.length?`<div class="bil-people"><b>Ils ont grandi</b>${b.risen.map(x=>`<span>${escapeHtml(x.name)} <small>${x.age} ans</small> <i class="up">${d10(x.gain)}</i> → ${niv(x.rating)}</span>`).join('')}</div>`:''}
        ${b.wantOut&&b.wantOut.length?`<div class="bil-people warnbox"><b>Ils veulent partir</b>${b.wantOut.map(x=>`<span>${escapeHtml(x.name)} <small>${x.age} ans · niveau ${niv(x.rating)}</small> <i class="down">moral ${x.morale}</i></span>`).join('')}</div>`:'<div class="hint">Personne ne demande à partir.</div>'}
        ${b.loyal&&b.loyal.length?`<div class="bil-people"><b>Ils resteraient pour toi</b>${b.loyal.map(x=>`<span>${escapeHtml(x.name)} <small>${x.age} ans · niveau ${niv(x.rating)}</small></span>`).join('')}</div>`:''}
        ${f.contracts&&f.contracts.length?`<div class="hint">Contrats : ${f.contracts.map(escapeHtml).join(' · ')}</div>`:''}
      </section>

      <section><h3>🕴️ ${escapeHtml(capitalize(c.presidentName))}</h3>
        <p class="narr quote">${escapeHtml(b.presLine||'')}</p>
        <div class="hint">Confiance ${sur10(f.confidence - f.dConf)} → <b>${sur10(f.confidence)}</b> sur 10.${f.confidence<35?" Sous 3,5, il ne te prolongera pas.":f.confidence>=70?" Tu as les mains libres.":""}</div>
      </section>

      <section><h3>📈 Où en sont les jauges</h3>
        ${(b.gauges||[]).map(bilanGaugeRow).join('')}
        <div class="bil-row"><span>🌡️ Pression</span><span class="bil-bar hot"><i style="width:${clamp(p.after)}%"></i></span><b>${sur10(p.after)}</b><i class="${dp<0?'up':dp>0?'down':''}">${dp?d10(dp):'='}</i></div>
      </section>

      <section><h3>🏛️ Ce qu'il en reste</h3>
        ${f.cote?`<div class="hint">Ta cote : <b>${sur10(f.cote.before)} → ${sur10(f.cote.after)}</b> · ${f.cote.why.map(escapeHtml).join(' · ')||'saison neutre'}. Tu vaux désormais ${escapeHtml(f.cote.level)}.</div>`:''}
        <div class="hint">🏆 ${state.titles.league} · ⬆️ ${state.titles.promo} · 🥇 ${state.titles.cup} · ⭐ ${state.titles.euro} · 🎖️ ${state.awards} · 🪓 ${state.sackings}</div>
        ${b.arming?`<div class="hint">🛡️ <b>${escapeHtml(b.arming.league)} s'arme contre toi.</b> Tu as fini la saison ${String(b.arming.gap).replace('.',',')} de force au-dessus de la moyenne : tes rivaux gagnent ${b.arming.delta>0?'+':''}${String(b.arming.delta).replace('.',',')} pour la saison prochaine, ${String(b.arming.total).replace('.',',')} au total. Une domination finit toujours par réveiller les autres.</div>`:''}
        <div class="punchline narr">${pick(f.champion?PUNCHLINES.champion:f.relegated?PUNCHLINES.relegated:f.objectiveMet?PUNCHLINES.hit:f.pos>f.teams*.7?PUNCHLINES.flop:PUNCHLINES.mid)}</div>
      </section>
    </div>

    <details class="bil-more"><summary>Le détail : classement, coupes, progressions</summary>
      <div class="two-cols"><div><div class="section-label">Classement final</div>${tableHTML(f.table,f.club,false)}</div><div><div class="section-label">Parcours en coupe</div>${cupPathHTML(f.cupPath,'Coupe nationale')}${f.euro?cupPathHTML(f.euro.path,f.euro.name):''}</div></div>
      ${f.devNotes.length?`<div class="section-label">Progressions</div><div class="hint">${f.devNotes.map(escapeHtml).join('<br>')}</div>`:''}
    </details>
    <div class="btn-row"><button class="btn" onclick="coachAfterSeasonEnd()">Intersaison →</button></div></div>`;
}
function renderSacked(){ const h=state.history[state.history.length-1]; return `<div class="card"><div class="result-hero"><span class="result-hero-icon">🪓</span><h2 class="display">Licencié·e</h2><div class="verdict">${escapeHtml(h.club)} · après la phase ${h.phase} · ${ordinal(h.pos)} pour un objectif de ${ordinal(h.objective)}</div></div><p class="narr">La confiance du président est tombée à zéro. Le communiqué tient en trois lignes, ton bureau est vidé avant midi. Ta réputation en prend un coup, ton téléphone continuera de sonner… un peu moins fort.</p><div class="btn-row"><button class="btn" onclick="coachIntersaison();render()">Continuer →</button></div></div>`; }
function seasonLine(f,i){ const badge=f.sacked?'🪓':f.champion?'🏆':f.relegated?'⬇️':f.objectiveMet?'✅':'❌'; return `<div class="season-line"><span><span class="pos">${badge} ${f.pos?ordinal(f.pos):'—'}</span> ${f.year} · ${escapeHtml(f.club)} · ${escapeHtml(f.league)}</span><span>${f.sacked?'licencié·e phase '+f.phase:(f.cupWon?'🥇 ':'')+(f.euro&&f.euro.won?'⭐ ':'')+(f.award?'🎖️ ':'')+(f.topScorer?escapeHtml(f.topScorer):'')}</span></div>`; }
/* Ce qu'il reste quand le football s'arrête : la contrepartie de tous les arbitrages. */
function lifeVerdict(v,player){
  if(v>=72) return {cls:'milestone',text:player?"Tu as gardé les tiens à côté de toi. Le vestiaire s'oublie, eux sont restés."
    :"Tu as tenu les deux bouts : une carrière, et des gens qui t'attendaient encore à la maison le soir du dernier match."};
  if(v>=45) return {cls:'punchline',text:player?"Ta vie d'à côté a tenu, sans jamais passer en premier."
    :"Ta vie d'à côté a survécu aux déménagements, un peu abîmée, jamais tout à fait prioritaire."};
  if(v>=22) return {cls:'punchline',text:player?"Beaucoup de monde autour de toi, peu de gens vraiment proches."
    :"Tu as beaucoup donné au football. Ceux qui t'attendaient ont fini par ne plus attendre."};
  return {cls:'warn',text:player?"Personne au bout du couloir après le dernier match. Le football aura tout pris."
    :"Le dernier vestiaire refermé, il n'y a personne au bout du couloir. Le football aura tout pris, et tu l'as laissé faire."};
}
function renderCoachEnd(){
  const t=state.titles, newB=[...new Set(state.newBadges||[])].map(id=>TROPHY_MAP[id]).filter(Boolean);
  const life=lifeVerdict(state.gauges.proches==null?50:state.gauges.proches,false);
  app.innerHTML=`<div class="fade-in"><div class="card"><div class="result-hero"><span class="result-hero-icon">${state.endingCause==='death'||state.endingCause==='roulette'?'⚰️':'🏁'}</span><h2 class="display">${escapeHtml(state.name)} — ${coachEpithet()}</h2><div class="verdict">${state.modeIcon} ${state.modeName} · ${state.startYear||ERAS.find(e=>e.id===state.startEra).name} → ${state.year} · fin à ${state.age} ans · score ${coachScore()}</div></div><p class="narr">${escapeHtml(state.endingText)}</p>
    <div class="score-grid"><div class="score-box gold"><div class="v">${state.history.filter(h=>!h.sacked).length}</div><div class="k">Saisons complètes</div></div><div class="score-box good"><div class="v">${t.league+t.promo}</div><div class="k">Titres et montées</div></div><div class="score-box good"><div class="v">${t.cup+t.euro+t.euro2}</div><div class="k">Coupes</div></div><div class="score-box gold"><div class="v">${state.awards}</div><div class="k">Récompenses</div></div><div class="score-box"><div class="v">${state.clubsCoached.length}</div><div class="k">Clubs</div></div><div class="score-box bad"><div class="v">${state.sackings}</div><div class="k">Licenciements</div></div></div>
    <div class="section-label">Ce qu'il en reste</div><div class="${life.cls}">🏡 ${life.text} <span class="hint">Proches ${sur10(state.gauges.proches==null?50:state.gauges.proches)}/10.</span></div>
    ${newB.length?`<div class="section-label">Badges débloqués</div><div class="badge-grid">${newB.map(b=>`<div class="badge"><span class="ico">${b.icon}</span><div><b>${b.label}</b><small>${b.cat}</small></div></div>`).join('')}</div>`:''}
    <div class="section-label">Toutes les saisons</div>${state.history.map(seasonLine).join('')||'<div class="hint">Aucune saison.</div>'}
    <div class="btn-row"><button class="btn" onclick="state=null;startCoachCreation()">Nouvelle carrière</button><button class="btn secondary" onclick="state=null;renderStart()">Accueil</button></div></div></div>`; scrollTop();
}

/* ---------- Écrans joueur·euse ---------- */
function playerSidebar(){
  const s=state.stats,g=state.gauges,c=state.club;
  return `<div class="card"><div class="identity"><b>${escapeHtml(state.name)}</b> · ${pAge()} ans · ${state.posIcon} ${state.posName}<br>${c?`🏟️ <b>${escapeHtml(c.name)}</b> · ${escapeHtml(c.leagueName||'')} · ${ROLES[c.role].name} · coach ${escapeHtml(c.coach)}`:'Sans club'}</div>
    ${c?`<div class="section-label">Confiance du coach</div><div class="conf-big ${state.coachTrust<25?'pressure-state bad':state.coachTrust<50?'pressure-state mid':''}">${sur10(state.coachTrust)} / 10</div><div class="bar"><i style="width:${state.coachTrust}%"></i></div><div class="hint">Décide ton temps de jeu. Concurrents au poste : ${state.squad.filter(p=>p.pos===state.pos).map(p=>`${escapeHtml(p.name)} (${niv(playerRating(p,state.year))})`).join(', ')||'aucun'}</div>`:''}
    ${c&&state.clubStuck&&state.clubStuck.club===c.name?`<div class="warn">🚪 Le club pense à l'après-toi. Contrat jusqu'en ${state.clubStuck.until}.</div>`:''}${c&&state.legendOf&&state.legendOf===c.name?`<div class="msg ok">🗿 Tu es de la maison ici.</div>`:''}${c&&pBenchRun()>=3?`<div class="hint">🪑 ${pBenchRun()} journées de suite sans entrer.</div>`:''}
    <div class="section-label">Toi · note ${niv(pRating())}</div>${Object.keys(PSTAT).map(k=>bar(PSTAT[k],s[k])).join('')}${bar('Forme',state.forme)}${bar('Pression',state.pressure,'pressure')}
    ${knownHTML()}
    ${fateHTML()}
    <div class="hint">Ton agent vise ${coteLabel(playerTargetStrength())}${c&&c.contractEnd?` · contrat jusqu'en ${c.contractEnd}`:''}</div>
    ${c?tempoSelectHTML():''}
    <div class="section-label">Ta vie</div>${Object.keys(PGAUGE).map(k=>gaugeRow(PGAUGE[k],g[k])).join('')}
    <div class="section-label">Totaux</div><div class="hint">${state.totals.apps} matchs · ${state.totals.goals} buts · ${state.totals.assists} passes · 🏆 ${state.totals.titles} · 🥇 ${state.totals.cups} · ⭐ ${state.totals.euros} · 🇫🇷 ${state.totals.caps} sél. (${state.totals.capGoals} buts) · 🏅 ${state.totals.ballons} · 👞 ${state.totals.boots}<br>Gains cumulés : ${$(state.totals.earned)}</div></div>
    <div class="card"><div class="section-label">Journal</div><div class="log">${state.log.slice(0,30).map(l=>`<div><span class="age">${l.year}</span>${l.msg}</div>`).join('')}</div></div>
    <div class="card"><div class="btn-row"><button class="btn secondary small" onclick="goHomeFromGame()">Accueil (sauvegarde)</button><button class="btn danger small" onclick="if(confirm('Raccrocher les crampons ?')){playerEnd('Tu décides de raccrocher les crampons.','retire');render();}">Retraite</button></div></div>`;
}
/* Ce qu'un match vient de dire de toi. Les chiffres, eux, n'ont pas bougé : ils
   étaient là depuis la première séance — c'est le nom qui manquait. */
function revealHTML(r){
  if(!r) return '';
  const bon=r.kind==='qualité';
  return `<div class="msg ${bon?'ok':''}"><b>${bon?'✨':'⚠️'} ${escapeHtml(r.name)}</b> — ${escapeHtml(r.say)}<br><span class="hint">${fxLabel(r.axe)} ${d10(r.v)} depuis le premier jour, tu le sais seulement maintenant. Tu es à ${sur10(r.now)}.</span></div>`;
}
function knownHTML(){
  const q=pQual(), f=pFlaw(); if(!q&&!f) return '';
  const one=(it,box,bon)=>{
    if(!it) return '';
    const seen=box&&box.seen;
    return `<i class="${bon?'plus':'minus'}">${bon?'✨':'⚠️'} ${seen?escapeHtml(it.name)+' ('+fxLabel(it.axe).split(' ')[1]+' '+d10(it.v)+')':'à découvrir'}</i>`;
  };
  return `<div class="section-label">Ce qu'on sait de toi</div><div class="traits">${one(q,state.qual,true)}${one(f,state.flaw,false)}</div>`;
}
/* Ce que le club pense de la suite : dit au bilan, rappelé à chaque écran de
   l'intersaison. Le déclin doit se **dire**, sinon il ne se ressent pas. */
function clubMoodHTML(m,club){
  if(!m) return '';
  if(m.legend) return `<div class="msg ok">🗿 ${escapeHtml(club)} te garde jusqu'au bout. Après huit saisons, tu es de la maison : ta place ne se rediscute plus.</div>`;
  if(m.reluctant) return `<div class="warn">🚪 ${escapeHtml(club)} aimerait tourner la page. ${escapeHtml(m.why||'')} Ton contrat court jusqu'en ${m.until} : tu restes, mais tu sais ce qu'on pense.</div>`;
  if(!m.keep) return `<div class="warn">👋 ${escapeHtml(club)} ne te prolonge pas. ${escapeHtml(m.why||'')}</div>`;
  return '';
}
function pClubNewsHTML(){
  const out=[];
  if(state.clubLeft) out.push(`<div class="warn">👋 ${escapeHtml(state.clubLeft.club)} ne te prolonge pas. ${escapeHtml(state.clubLeft.why||'')} Il faudra trouver ailleurs.</div>`);
  else if(state.clubStuck) out.push(`<div class="warn">🚪 ${escapeHtml(state.clubStuck.club)} aimerait tourner la page. ${escapeHtml(state.clubStuck.why||'')} Ton contrat court jusqu'en ${state.clubStuck.until}.</div>`);
  else if(state.legendOf&&state.club&&state.legendOf===state.club.name) out.push(`<div class="msg ok">🗿 Tu es chez toi à ${escapeHtml(state.legendOf)} : le club te gardera jusqu'à la fin.</div>`);
  return out.join('');
}
/* ---------- L'intersaison du joueur·euse, en quatre temps ---------- */
function pStepHTML(n){ return `<div class="creation-progress"><span>Intersaison · étape ${n}/4</span><div class="track"><i style="width:${n*25}%"></i></div></div>`; }
function renderPVacances(){
  const keys=effectKeys(PVACANCES.map(v=>v.effects));
  return `<div class="card event-card">${pStepHTML(1)}<div class="ico">🌴</div><h2 class="display">L'été commence</h2>
    <p class="narr">La saison est finie. Six semaines devant toi, et tout le monde attend de savoir avec qui tu les passes.</p>
    ${pClubNewsHTML()}
    <div class="section-label">Ce que tu fais de tes vacances</div>
    <div class="choice-list">${PVACANCES.map((v,i)=>`<button class="choice-btn" onclick="playerChooseVacances(${i})"><span class="ico">${v.icon}</span><div class="body"><b>${escapeHtml(v.label)}</b><small>${escapeHtml(v.sub)}</small>${effectChips(v.effects)}<div class="traits">${(v.prep==null||v.prep>=1)?"<i class=\"plus\">⏳ Tout l'été reste pour travailler</i>":`<i class="minus">⏳ Ta préparation ne comptera qu'à ${Math.round(v.prep*100)} %</i>`}${v.fatigue?'<i class="minus">🩼 Tu rentres entamé·e : récupération réduite toute la saison</i>':'<i class="plus">🩼 Tu rentres frais·che</i>'}${v.risk?`<i class="minus">🩼 ${Math.round(v.risk*100)} % de risque de blessure</i>`:''}</div></div></button>`).join('')}</div>
    ${stateTable(keys)}
    <div class="hint">Six semaines ne se rattrapent pas. Ce que tu prends ici te manquera ailleurs.</div></div>`;
}
function renderPSummer(){
  const keys=effectKeys(PSUMMER.map(t=>t.effects));
  return `<div class="card event-card">${pStepHTML(2)}<div class="ico">🏋️</div><h2 class="display">La préparation</h2>
    <p class="narr">Le club reprend dans cinq semaines. Ce que tu fais d'ici là ne se verra pas en août — ça se verra en mars.</p>
    <div class="section-label">Ton été de travail</div>
    <div class="choice-list">${PSUMMER.map((t,i)=>`<button class="choice-btn" onclick="playerChooseSummer(${i})"><span class="ico">${t.icon}</span><div class="body"><b>${escapeHtml(t.label)}</b><small>${escapeHtml(t.sub)}</small><div class="traits">${t.load?`<i class="plus">📈 Charge ${t.load.toFixed(1).replace('.',',')} — comptera pour ta progression de juin</i>`:'<i class="minus">📈 Aucune avance de préparation</i>'}${t.fatigue?`<i class="minus">🫁 Récupération −${t.fatigue===2?25:12} % toute la saison</i>`:'<i class="plus">🫁 Tu repartiras frais</i>'}</div>${effectChips(t.effects)}${t.risk?`<div class="traits"><i class="minus">🩼 ${Math.round(t.risk*100)} % de risque de blessure</i></div>`:''}</div></button>`).join('')}</div>
    ${stateTable(keys)}
    <div class="hint">${escapeHtml(pTrainingCurveHelp())}</div></div>`;
}
function renderPWish(){
  return `<div class="card event-card">${pStepHTML(3)}<div class="ico">📞</div><h2 class="display">Ton agent veut savoir</h2>
    <p class="narr">« Dis-moi ce que tu cherches, je saurai à qui décrocher le téléphone. » Ce que tu demandes décide de ce qui arrivera — et de ce qui n'arrivera pas.</p>
    <div class="section-label">Ce que tu lui demandes</div>
    <div class="choice-list">${PWISHES.map((w,i)=>`<button class="choice-btn" onclick="playerChooseWish(${i})"><span class="ico">${w.icon}</span><div class="body"><b>${escapeHtml(w.label)}</b><small>${escapeHtml(w.sub)}</small></div></button>`).join('')}</div>
    <div class="hint">Demander une chose, c'est renoncer aux autres : les offres arriveront dans cet ordre-là.</div></div>`;
}
function renderPOfferOne(){
  const q=state.offerQueue||[]; const o=q[0];
  if(!o) return renderPOffers();
  const w=pWishById(state.wish);
  return `<div class="card">${pStepHTML(4)}<h2 class="display">Une proposition</h2>
    <p class="hint">${state.year} · ${pAge()} ans · tu as demandé : ${w.icon} ${escapeHtml(w.label.toLowerCase())}.${state.offersRefused?` Tu as déjà refusé ${state.offersRefused} offre${state.offersRefused>1?'s':''}.`:''}</p>
    <div class="offer-grid"><div class="offer-card affordable ${o.poach?'poach':''}">
      <div class="club">${TIER_INFO[o.tier].icon} ${TIER_INFO[o.tier].label}${o.stay?(o.underContract?' · ton contrat court encore':' · prolonger'):o.poach?' · ils paient la clause':''}</div>
      <h3>${escapeHtml(o.club)}</h3>
      <div class="syn narr">${escapeHtml(o.title||'')} Coach : ${escapeHtml(o.coach)}.</div>
      <div class="meta"><span class="tag gold">${escapeHtml(o.leagueName)}</span><span class="tag">${ROLES[o.role].name} promis·e</span><span class="tag">${$(o.salary)} par saison</span><span class="tag">${o.duration} an${o.duration>1?'s':''}</span><span class="tag">Force ${'★'.repeat(Math.max(1,o.s||1))}</span></div>
      <div class="offer-hint ${o.role==='titulaire'?'good':''}">${o.role==='titulaire'?'✅ On te promet la place':o.role==='rotation'?'🔄 Tu tourneras':'🪑 Tu commenceras derrière'}</div>
    </div></div>
    ${pClubNewsHTML()}
    <div class="msg">📞 ${escapeHtml(playerAgentRead())}</div>
    <div class="btn-row"><button class="btn" onclick="playerSignOffer()">Signer ✍️</button><button class="btn danger" onclick="playerRefuseOffer()">Refuser</button></div>
    <div class="hint">Refuser fait disparaître cette offre pour de bon. La suivante peut être meilleure. Ou il n'y en aura pas.</div></div>`;
}
function renderPOffers(){
  const offers=state.currentOffers||[];
  if(!offers.length&&state.offersRefused) return `<div class="card"><h2 class="display">Plus rien sur la table</h2>
    <p class="narr">Tu as refusé ${state.offersRefused} proposition${state.offersRefused>1?'s':''}, et le téléphone a cessé de sonner. L'été se termine sans club.</p>
    <div class="hint">Une année sans jouer coûte du niveau, de la fraîcheur et de la cote. C'était le risque.</div>
    <div class="btn-row"><button class="btn" onclick="playerSkipYear()">Passer l'année →</button></div></div>`;
  if(!offers.length) return `<div class="card"><h2 class="display">Aucune proposition</h2><p class="narr">Ton agent ne répond plus. Le marché t'a oublié·e cette année.</p><div class="btn-row"><button class="btn" onclick="playerSkipYear()">Attendre une année</button></div></div>`;
  const stay=offers.find(o=>o.stay); const under=stay&&stay.underContract;
  return `<div class="card"><h2 class="display">${under?'Intersaison sous contrat':'Ton agent a des propositions'}</h2><p class="hint">${state.year} · ${pAge()} ans · note ${niv(pRating())} · ton agent vise ${coteLabel(playerTargetStrength())}. ${under?`Ton contrat court jusqu'en ${state.club.contractEnd}. ${offers.length>1?'Un club vient te chercher.':'Aucun club ne s\'est manifesté cette année.'}`:'Le rôle promis pèse sur ton temps de jeu, ta progression et ta pression.'}</p>
    ${pClubNewsHTML()}
    <div class="offer-grid">${offers.map((o,i)=>`<div class="offer-card affordable ${o.poach?'poach':''}" onclick="playerAcceptOffer(${i});render()"><div class="club">${TIER_INFO[o.tier].icon} ${TIER_INFO[o.tier].label}${o.stay?(o.underContract?' · sous contrat':' · prolonger'):o.poach?' · vient te chercher':''}</div><h3>${escapeHtml(o.club)}</h3><div class="meta"><span class="tag gold">${escapeHtml(o.leagueName)}</span><span class="tag">${ROLES[o.role].name}</span><span class="tag">${o.stay&&o.underContract?`${o.duration} an${o.duration>1?'s':''} restant${o.duration>1?'s':''}`:`${o.duration} an${o.duration>1?'s':''}`}</span><span class="tag">Force ${'★'.repeat(Math.max(1,o.s||1))} · ${gapLabel(o.gap||0)}</span></div><div class="budget">${$(o.salary)} / saison</div><div class="offer-hint">Coach : ${escapeHtml(o.coach)} · ${o.role==='titulaire'?'⭐ Temps de jeu garanti, pression maximale':o.role==='rotation'?'🔄 Du temps de jeu à gagner':'🪑 Peu de matchs, progression lente'}</div></div>`).join('')}</div>
    <div class="btn-row">${under?'<button class="btn secondary" onclick="if(confirm(\'Demander ton transfert ? Supporters −6, entourage −3.\')) playerBreakContract()">Demander un transfert</button>':''}<button class="btn secondary" onclick="playerSkipYear()">Refuser tout et attendre une année</button></div></div>`;
}
function renderPPhaseResult(){
  const ph=state.lastPhase, c=state.club, N=state.comp.teams.length;
  return `<div class="card"><h2 class="display">Phase ${ph.n} · ${escapeHtml(c.leagueName)}</h2>${phaseTrack()}
    <div class="score-grid"><div class="score-box gold"><div class="v">${ph.apps}</div><div class="k">matchs joués (${Math.round(ph.share*100)} % du temps)${ph.motm?` · ⭐ ${ph.motm}`:''}</div></div><div class="score-box good"><div class="v">${ph.goals} / ${ph.assists}</div><div class="k">buts / passes</div></div><div class="score-box ${!ph.apps?'':ph.note>=6.8?'good':ph.note<5.8?'bad':''}"><div class="v">${ph.apps?ph.note.toFixed(1):'—'}</div><div class="k">note moyenne</div></div><div class="score-box ${ph.dTrust>=0?'good':'bad'}"><div class="v">${d10(ph.dTrust)}</div><div class="k">confiance du coach → ${sur10(state.coachTrust)}</div></div><div class="score-box"><div class="v">${ordinal(ph.pos)}</div><div class="k">${escapeHtml(c.name)} sur ${N}</div></div></div>
    ${ph.injury?`<div class="warn">🩼 Blessure : ${ph.injury}</div>`:''}
    <div class="section-label">Les matchs de ${escapeHtml(c.name)}</div>${matchesHTML(ph.matches,c.name)}
    <div class="section-label">Classement</div>${tableHTML(ph.table,c.name,false)}
    <div class="btn-row"><button class="btn" onclick="playerAfterPhase()">${state.phase>=4?'Bilan de la saison →':'Phase suivante →'}</button></div></div>`;
}
function renderPSeasonEnd(){
  const f=state.lastSeason;
  const lines=[]; if(f.champion) lines.push(`🏆 Champion·ne avec ${escapeHtml(f.club)}`); if(f.cupWon) lines.push('🥇 Vainqueur de la coupe'); if(f.euro) lines.push(f.euro.won?`⭐ Vainqueur de la ${escapeHtml(f.euro.name)}`:`🌍 ${escapeHtml(f.euro.name)} : tour ${f.euro.rounds}`); if(f.selected) lines.push(`🇫🇷 Sélection nationale : ${f.caps} capes, ${f.capGoals} but${f.capGoals>1?'s':''}`); if(f.ballon) lines.push("🏅 Ballon d'or"); if(f.boot) lines.push('👞 Soulier d\'or'); if(f.relegated) lines.push('⬇️ Le club est relégué');
  return `<div class="card"><div class="result-hero"><span class="result-hero-icon">${f.ballon?'🏅':f.champion?'🏆':f.bad?'🥶':f.note>=6.8?'🔥':'📊'}</span><h2 class="display">${escapeHtml(f.club)} · ${f.year}-${f.year+1}</h2><div class="verdict">${ROLES[f.role].name} · note ${f.note.toFixed(2).replace('.',',')} · ${ordinal(f.pos)} sur ${f.teams} en ${escapeHtml(f.league)}</div></div>
    <div class="score-grid"><div class="score-box gold"><div class="v">${f.apps}</div><div class="k">Matchs</div></div><div class="score-box good"><div class="v">${f.goals}</div><div class="k">Buts</div></div><div class="score-box good"><div class="v">${f.assists}</div><div class="k">Passes</div></div><div class="score-box"><div class="v">${Math.round(f.share*100)} %</div><div class="k">Temps de jeu</div></div><div class="score-box gold"><div class="v">${$(f.salary)}</div><div class="k">Salaire</div></div></div>
    ${lines.map(l=>`<div class="trophy-line">${l}</div>`).join('')}
    ${f.idle?`<div class="warn">🌫️ ${escapeHtml(f.idle.text)}<br><span class="hint">${f.idle.lines.join(' · ')}</span></div>`:''}
    ${clubMoodHTML(f.clubMood,f.club)}
    <div class="section-label">Classement final</div>${tableHTML(f.table,f.club,false)}
    <div class="btn-row"><button class="btn" onclick="playerAfterSeasonEnd()">Intersaison →</button></div></div>`;
}
function renderPlayerEnd(){
  const t=state.totals, newB=[...new Set(state.newBadges||[])].map(id=>TROPHY_MAP[id]).filter(Boolean);
  const life=lifeVerdict(state.gauges.entourage==null?50:state.gauges.entourage,true);
  app.innerHTML=`<div class="fade-in"><div class="card"><div class="result-hero"><span class="result-hero-icon">🎗️</span><h2 class="display">${escapeHtml(state.name)}</h2><div class="verdict">${state.posIcon} ${state.posName} · ${state.startYear||ERAS.find(e=>e.id===state.startEra).name} → ${state.year} · fin à ${pAge()} ans · score ${playerScore()}</div></div><p class="narr">${escapeHtml(state.endingText)}</p>
    <div class="score-grid"><div class="score-box gold"><div class="v">${state.history.length}</div><div class="k">Saisons</div></div><div class="score-box"><div class="v">${t.apps}</div><div class="k">Matchs</div></div><div class="score-box good"><div class="v">${t.goals}</div><div class="k">Buts</div></div><div class="score-box good"><div class="v">${t.assists}</div><div class="k">Passes</div></div><div class="score-box gold"><div class="v">${t.titles+t.cups+t.euros}</div><div class="k">Trophées</div></div><div class="score-box"><div class="v">${t.caps}</div><div class="k">Sélections</div></div><div class="score-box gold"><div class="v">${t.ballons}</div><div class="k">Ballons d'or</div></div><div class="score-box good"><div class="v">${$(t.earned)}</div><div class="k">Gains</div></div></div>
    <div class="section-label">Ce qu'il en reste</div><div class="${life.cls}">🏡 ${life.text} <span class="hint">Entourage ${sur10(state.gauges.entourage==null?50:state.gauges.entourage)}/10.</span></div>
    ${newB.length?`<div class="section-label">Badges débloqués</div><div class="badge-grid">${newB.map(b=>`<div class="badge"><span class="ico">${b.icon}</span><div><b>${b.label}</b><small>${b.cat}</small></div></div>`).join('')}</div>`:''}
    <div class="section-label">Saisons</div>${state.history.map(f=>`<div class="season-line"><span><span class="pos">${f.ballon?'🏅':f.champion?'🏆':f.note.toFixed(1).replace('.',',')}</span> ${f.year} · ${escapeHtml(f.club)} · ${escapeHtml(f.league)}</span><span>${f.apps} m · ${f.goals} b · ${f.assists} p${f.selected?' · 🇫🇷':''}</span></div>`).join('')}
    <div class="btn-row"><button class="btn" onclick="state=null;startPlayerCreation()">Nouvelle carrière</button><button class="btn secondary" onclick="state=null;renderStart()">Accueil</button></div></div></div>`; scrollTop();
}

/* ---------- Badges, panthéon, règles ---------- */
function renderBadges(){ showGameBanner(); filmstripEl.style.display='none'; const cats=[...new Set(TROPHIES.map(t=>t.cat))]; app.innerHTML=`<div class="fade-in"><div class="card"><h2 class="display">Salle des badges</h2><p class="hint">${unlockedTrophies.size} / ${TROPHIES.length} débloqués, toutes carrières confondues.</p>${cats.map(c=>`<div class="badge-cat">${c}</div><div class="badge-grid">${TROPHIES.filter(t=>t.cat===c).map(t=>`<div class="badge ${unlockedTrophies.has(t.id)?'':'locked'}"><span class="ico">${t.icon}</span><div><b>${t.label}</b><small>${unlockedTrophies.has(t.id)?'Débloqué':'Verrouillé'}</small></div></div>`).join('')}</div>`).join('')}<div class="btn-row"><button class="btn secondary" onclick="${state?'render()':'renderStart()'}">Retour</button></div></div></div>`; scrollTop(); }
function renderHall(){ showGameBanner(); filmstripEl.style.display='none'; const h=hallOfFame(); app.innerHTML=`<div class="fade-in"><div class="card"><h2 class="display">Panthéon</h2><div class="hall">${h.length?h.map(e=>`<div><span>${e.kind==='player'?'👟':'🧢'} <b>${escapeHtml(e.name)}</b> · ${escapeHtml(e.mode||'')} · ${escapeHtml(e.era||'')} · ${e.seasons} saisons · ${e.titles} titre${e.titles>1?'s':''} · fin à ${e.age} ans</span><span>score ${e.score}${e.date?` · ${e.date}`:''}</span></div>`).join(''):'<div class="hint">Aucune carrière terminée pour l\'instant.</div>'}</div><div class="btn-row"><button class="btn secondary" onclick="${state?'render()':'renderStart()'}">Retour</button></div></div></div>`; scrollTop(); }
function renderRules(){ showGameBanner(); filmstripEl.style.display='none'; app.innerHTML=`<div class="fade-in"><div class="card rules"><h2 class="display">Comment ça marche</h2>
  <h3>Les époques</h3><ul>${ERAS.map(e=>`<li><b>${e.icon} ${e.name}</b> (${e.start}-${e.end}) : ${e.rules.join(', ')}.</li>`).join('')}<li>Les joueurs réels apparaissent selon leur âge dans l'année en cours. Une carrière longue traverse l'époque suivante.</li></ul>
  <h3>Carrière d'entraîneur·euse</h3><ul><li>Chaque offre fixe un championnat réel, un objectif de classement, un budget de transferts et un président avec son caractère.</li><li>Le mercato est libre : vends, recrute des stars (si ta crédibilité le permet), des pros, des pépites (parfois des arnaques), des joueurs libres ou des jeunes du centre. Un « gros coup » coûte cher et exige une place de titulaire.</li><li>La force de l'équipe vient de ton onze type, du vestiaire, de la cohérence entre ton style et celui que le club demande, de ta tactique et de la dynamique.</li><li><b>Rythme</b> : « Temps forts » (par défaut) ne t'arrête que sur les chocs, les concurrents directs, les matchs de la peur, la reprise de chaque phase, et sur une alerte (blessé ou suspendu dans ton onze, trois défaites de suite, président impatient). Les autres matchs se jouent avec ta compo et apparaissent en résumé. « Complet » joue tout, « Rapide » ne s'arrête qu'à la reprise. Changeable à tout moment dans la barre latérale.</li><li><b>Cote et contrats</b> : ta cote (0-100) résume ce que ta carrière vaut ; les offres arrivent autour d'elle, un cran au-dessus après une bonne saison, en dessous après un échec. Tant que ton contrat court et que le président te garde, tu restes, sauf si un club plus ambitieux vient te chercher. Rompre coûte de la réputation.</li><li>La saison se joue journée par journée, en quatre phases. Avant chaque match : l'adversaire (force, style, forme), ta formation, ton onze, ton banc, ton capitaine, ton approche et l'entraînement de la semaine. Le match se déroule minute par minute (buts, penaltys, cartons, blessures, remplacements), avec une décision à la mi-temps. Chaque joueur reçoit une note. Un bouton simule le reste de la phase avec le onze automatique.</li><li>Fraîcheur : un titulaire perd 10 à 16 points par match selon son âge et en récupère 9 par semaine (plus avec le staff et l'entraînement). Sous 75 %, son niveau baisse et il se blesse plus. Trois avertissements ou un rouge : suspension.</li><li>Styles : contrôle bat pression, pression bat contre, contre bat contrôle, le jeu direct ouvre le match. Le style de l'adversaire est visible avant le coup d'envoi.</li><li><b>Confiance du président</b> : elle monte quand tu dépasses l'objectif, chute quand tu es en dessous ou que la masse salariale explose. À zéro, licenciement immédiat. Sous 3,5 en fin de saison, pas de prolongation.</li><li>Quatre jauges du club : Vestiaire (force de l'équipe), Supporters (pression et patience), Formation (jeunes, arnaques), Staff (blessures, progression). Une jauge basse déclenche des dilemmes.</li><li>Pression : à 10, une crise impose un choix, dont un à 50 % de risque de mort. Entre 9 et 10, 1 % de risque par intersaison.</li><li>Roulette du destin : après trois saisons, 20 % de chance par intersaison, quatre issues cachées dont une fatale.</li><li>Fin : 75 ans, quatre licenciements d'affilée, deux années sans offre, roulette, pression, retraite.</li></ul>
  <h3>Carrière de joueur·euse</h3><ul><li>Tu rejoins des clubs réels avec un rôle promis. Ton temps de jeu dépend de ta note face aux concurrents à ton poste et de la confiance du coach.</li><li><b>Rythme et contrats</b> : même logique qu'en mode entraîneur·euse. Les temps forts sont les chocs où tu es dans le groupe, les penaltys, une blessure, une place perdue ou retrouvée. Ton agent vise un niveau de club selon ta note, ta dernière saison, la sélection et ton âge ; sous contrat, tu restes sauf si un club vient te chercher ou si tu demandes ton transfert.</li><li>Chaque journée, le coach compose : ta note face aux concurrents, sa confiance, le rôle promis et ta fraîcheur décident si tu es titulaire, sur le banc ou en tribune. Tu vis le match minute par minute avec une note à la fin, et un penalty à tirer ou non quand il se présente.</li><li>Quatre jauges : Corps (à zéro, fin de carrière), Vestiaire, Supporters, Entourage.</li><li>Sélection nationale, Ballon d'or, Soulier d'or, coupes d'Europe. Progression forte avant 25 ans, déclin après 31.</li>
  <li><b>Ta qualité et ton défaut</b> : tirés au sort à la création, sur deux axes différents (+1,5 et −1,5). Les points comptent dès le premier match ; leur <i>nom</i> se révèle quand un match leur ressemble — un but, quatre-vingts minutes dans les jambes, une note de patron, un carton, une blessure. Au douzième match, le staff a fini de te jauger et te dit le reste.</li>
  <li><b>La fin de carrière</b> : les clubs qui appellent dépendent de ton niveau <i>du moment</i>, pas d'une sélection passée ; après 33 ans les plus grands ne construisent plus avec toi. Ton club regarde ton âge, ta dernière saison et ton corps : il peut ne pas prolonger, et il te le dit. Tant que ton contrat court, tu restes — en sachant ce qu'on pense. Huit saisons au même club font de toi une légende maison : celui-là te gardera jusqu'au bout.</li>
  <li><b>Ne pas jouer coûte</b> : une saison sous 18 % de temps de jeu abîme le moral, la pression et ta place dans le groupe. Les semaines en tribune deviennent des décisions — travailler seul, parler au coach, ou mettre la tête ailleurs.</li></ul>
  <div class="btn-row"><button class="btn secondary" onclick="${state?'render()':'renderStart()'}">Retour</button></div></div></div>`; scrollTop(); }

/* ---------- Le match : écrans partagés ---------- */
function formChips(arr){ return `<span class="form-chips">${(arr&&arr.length?arr:[]).map(r=>`<i class="${r}">${r==='W'?'V':r==='D'?'N':'D'}</i>`).join('')||'<i class="none">—</i>'}</span>`; }
function fitBar(v){ const c=v>=75?'ok':v>=55?'mid':'low'; return `<span class="fit ${c}" title="Fraîcheur ${Math.round(v)} %"><i style="width:${clamp(v)}%"></i></span>`; }
function notePill(n){ if(n==null) return ''; return `<span class="note ${n>=7.5?'top':n>=6.5?'good':n<5.5?'bad':''}">${n.toFixed(1).replace('.',',')}</span>`; }
function oppCardHTML(m){
  const comp=state.comp, c=state.club; const st=styleById(m.themStyle); const N=comp.teams.length;
  const pos=tablePos(comp.table,m.themName), myPos=tablePos(comp.table,c.name);
  const P=state.kind==='player'?playerSquadMap():coachSquadMap(); const xi=m.xi.map(id=>P[id]).filter(Boolean); const avg=xi.length?xi.reduce((n,p)=>n+effRating(p,m.year),0)/xi.length:0; const d=avg-m.themStrength;
  const level=d>=6?'nettement plus faible que ton onze':d>=2?'un peu plus faible que ton onze':d>-2?'du même niveau que ton onze':d>-6?'un peu plus fort que ton onze':'nettement plus fort que ton onze';
  return `<div class="opp-card"><div class="opp-top"><span class="tag gold">${m.home?'🏟️ Domicile':'🚌 Extérieur'}</span><b class="opp-name">${escapeHtml(m.themName)}</b><span class="tag">${ordinal(pos)} sur ${N}</span><span class="tag">force ${niv(m.themStrength)} · ${level}</span></div>
    <div class="opp-meta">${st.icon} <b>${st.name}</b> · ${escapeHtml(matchupText(m.ourStyle,m.themStyle))} · forme ${formChips(comp.form&&comp.form[m.themName])}</div>
    <div class="opp-meta">Toi : ${ordinal(myPos)} sur ${N} · forme ${formChips(comp.form&&comp.form[c.name])} · ${styleById(m.ourStyle).icon} ${styleById(m.ourStyle).name}</div></div>`;
}
function eventsHTML(events){ return `<div class="timeline">${events.map(e=>`<div class="ev ${e.kind} ${e.side}"><span class="ico">${e.icon}</span><span>${e.text}</span></div>`).join('')||'<div class="hint">Rien à signaler.</div>'}</div>`; }
function ratingsHTML(rec,P,meId){
  const rows=[...rec.xi,...Object.keys(rec.ratings).filter(id=>!rec.xi.map(String).includes(String(id)))].map(id=>P[id]).filter(Boolean);
  const played=rows.filter(p=>rec.ratings[p.id]!=null).sort((a,b)=>rec.ratings[b.id]-rec.ratings[a.id]);
  const ev=id=>rec.events.filter(e=>String(e.pid)===String(id));
  return `<table class="squad-table ratings"><thead><tr><th></th><th>Joueur</th><th class="r">Note</th><th>Match</th></tr></thead><tbody>${played.map(p=>{ const e=ev(p.id); const g=e.filter(x=>x.kind==='goal').length, y=e.filter(x=>x.kind==='yellow').length, r=e.filter(x=>x.kind==='red').length, inj=e.some(x=>x.kind==='injury'), sub=e.some(x=>x.kind==='sub'); const assists=rec.events.filter(x=>x.kind==='goal'&&x.side==='us'&&x.text.includes(`passe de ${escapeHtml(p.name)}`)).length;
    return `<tr class="${String(p.id)===String(meId)?'me':''}"><td><span class="pos-badge pos-${p.pos}">${p.pos}</span></td><td class="${p.real?'real':''}">${escapeHtml(p.name)}${String(rec.motm)===String(p.id)?' ⭐':''}${p.isMe?' (toi)':''}</td><td class="r">${notePill(rec.ratings[p.id])}</td><td class="marks">${'⚽'.repeat(g)}${assists?'🅰️'.repeat(assists):''}${'🟨'.repeat(y)}${'🟥'.repeat(r)}${inj?'🩼':''}${sub?'🔁':''}</td></tr>`; }).join('')}</tbody></table>`;
}
function factorsHTML(f){ return `<div class="impact">${(f||[]).map(l=>`<div class="${l.d>=.5?'up':l.d<=-.5?'down':''}">${l.d>=.5?'▲':l.d<=-.5?'▼':'•'} ${escapeHtml(l.t)}</div>`).join('')}</div>`; }
function scoreHero(rec,me){ const W=rec.res==='W'; return `<div class="score-hero ${rec.res}"><div class="teams"><span class="${rec.home===me?'us':''}">${escapeHtml(rec.home)}</span><span class="big">${rec.gh} – ${rec.ga}</span><span class="${rec.away===me?'us':''}">${escapeHtml(rec.away)}</span></div><div class="verdict">${W?'Victoire':rec.res==='D'?'Match nul':'Défaite'}${rec.ht?` · mi-temps ${rec.us==='home'?rec.ht[0]+'–'+rec.ht[1]:rec.ht[1]+'–'+rec.ht[0]}`:''} · journée ${rec.matchday+1}</div></div>`; }
function tempoSelectHTML(){ const t=TEMPOS[state.tempo]?state.tempo:'temps_forts'; return `<div class="section-label">Rythme de la saison</div><select class="select tempo" onchange="setTempo(this.value)" title="${escapeHtml(TEMPOS[t].desc)}">${Object.entries(TEMPOS).map(([k,v])=>`<option value="${k}" ${t===k?'selected':''}>${v.icon} ${v.label} — ${v.about}</option>`).join('')}</select><div class="hint">${escapeHtml(TEMPOS[t].desc)}</div>`; }
function whyHTML(why){ return why&&why.length?`<div class="why-row">${why.map(w=>`<span class="why">${escapeHtml(w)}</span>`).join('')}</div>`:''; }
function sinceHTML(list){ if(!list||!list.length) return '';
  const W=list.filter(m=>m.res==='W').length, D=list.filter(m=>m.res==='D').length, L=list.filter(m=>m.res==='L').length;
  return `<details class="since"><summary>Pendant ce temps · ${list.length} match${list.length>1?'s':''} joué${list.length>1?'s':''} sans toi · <b>${W} V · ${D} N · ${L} D</b></summary>${matchesHTML(list,state.club.name)}</details>`; }
/* La roulette laisse une trace : destin scellé ou écho sur les saisons suivantes */
function fateHTML(){
  const f=state.rouletteFate, e=state.rouletteEcho; if(!f&&!(e&&e.seasons>0)) return '';
  return `<div class="section-label">La roulette</div>${f?`<div class="why-row"><span class="why">${f.icon} ${escapeHtml(f.label)}</span></div><div class="hint">${escapeHtml(f.text)}</div>`:''}${e&&e.seasons>0?`<div class="hint">${e.icon} <b>${escapeHtml(e.label)}</b> : ${escapeHtml(e.short)}. ${e.delta>0?'+':''}${e.delta} ${state.kind==='player'?'sur ce que le coach voit de toi':"sur la force de l'équipe"}, encore ${e.seasons} saison${e.seasons>1?'s':''}.</div>`:''}`;
}
function coteHTML(){ const cote=state.cote==null?30:state.cote; const s=coteToStrength(cote); return `<div class="section-label">Ta cote</div><div class="conf-big">${sur10(cote)} / 10</div><div class="bar"><i style="width:${clamp(cote)}%"></i></div><div class="hint">Le niveau de banc que ta carrière justifie : ${coteLabel(s)}. Objectifs tenus, titres et coupes la font monter ; échecs, relégations et licenciements la font chuter.${state.club&&state.club.contractEnd?(state.club.contractEnd>=9999?" Contrat à vie : la clause de la roulette t'y oblige.":` Contrat jusqu'en ${state.club.contractEnd}.`):''}</div>`; }
function matchdayLabel(){ const comp=state.comp; return `Journée ${Math.min((state.matchday||0)+1,comp.schedule.length)} / ${comp.schedule.length}`; }

/* ---------- Entraîneur·euse : avant-match, mi-temps, résultat ---------- */
/* Le rendez-vous : la seule chose qu'on fait, c'est trancher. Le match suit,
   et on le lit. */
/* Le poids d'une décision sur le match qui suit, annoncé avant le clic. */
function matchChip(c){
  const raw=c.plan&&c.plan.bonus?c.plan.bonus:0;
  const b=raw>0?raw*MEETING_WEIGHT*boostFactor():raw*MEETING_WEIGHT;
  if(Math.abs(b)<.3) return '';
  const worn=raw>0&&boostFactor()<.95?` <small>(amorti à ${Math.round(boostFactor()*100)} % : tu tires sur la même corde)</small>`:'';
  const n=state.comp?Math.max(1,Math.min(state.comp.phaseEnds[state.phase]-state.matchday,boostSpan())):1;
  return `<div class="traits"><i class="${b>0?'plus':'minus'}">⚽ <b>${b>0?'+':''}${fo(b)}</b> de force sur ce match${n>1?`, puis en s'estompant sur ${n} journées`:''}${worn}</i></div>`;
}
function renderMeeting(){
  const mt=state.meeting; if(!mt) return '<div class="card"><p class="narr">…</p></div>';
  const keys=effectKeys(mt.choices.map(c=>c.effects));
  return `<div class="card event-card meeting-card"><div class="hint">${matchdayLabel()} · ${escapeHtml(mt.opponent||'')}</div>
    <div class="ico">${mt.icon}</div><h2 class="display">${escapeHtml(mt.title)}</h2>
    <p class="narr">${escapeHtml(mt.text)}</p>
    ${sinceHTML(state.sinceLast)}
    <div class="section-label">Ta décision</div>
    <div class="choice-list">${mt.choices.map((c,i)=>`<button class="choice-btn" onclick="coachChooseMeeting(${i})"><div class="body"><b>${escapeHtml(c.label)}</b>${c.sub?`<small>${escapeHtml(c.sub)}</small>`:''}${matchChip(c)}${effectChips(c.effects,c.seed)}</div></button>`).join('')}</div>
    ${stateTable(keys)}
    <div class="hint">${mt.side==='vie'?"Ça ne se joue pas sur le terrain, et ça pèsera quand même sur ta saison."
      :"Tu ne composes pas l'équipe : ton adjoint s'en charge. Tu décides, et le match répond."}</div></div>`;
}
/* Ce que ta décision a produit, en tête du résultat. */
function recapHTML(){
  const r=state.meetingRecap; if(!r) return '';
  return `<div class="recap"><div class="recap-head">${r.icon} <b>${escapeHtml(r.title)}</b></div>
    <div class="recap-choice">${escapeHtml(r.choice)}</div>
    ${r.notes&&r.notes.length?`<div class="hint">${r.notes.map(escapeHtml).join(' · ')}</div>`:''}</div>`;
}
function renderMatchResult(){
  const rec=state.lastMatch, c=state.club, P=coachSquadMap(), comp=state.comp; const N=comp.teams.length; const last=state.matchday>=comp.phaseEnds[state.phase];
  const goals=(rec.events||[]).filter(e=>e.kind==='goal').length, cards=(rec.events||[]).filter(e=>e.kind==='yellow'||e.kind==='red').length, injs=(rec.events||[]).filter(e=>e.kind==='injury').length;
  return `<div class="card">${recapHTML()}${scoreHero(rec,c.name)}<p class="narr story">${escapeHtml(rec.story)}${rec.htNote?` ${escapeHtml(rec.htNote)}`:''}</p>
    <div class="res-line"><span>${escapeHtml(c.name)} <b>${ordinal(rec.pos)}</b> sur ${N}</span><span>objectif ${ordinal(c.objectivePos)}</span><span>${formChips(comp.form&&comp.form[c.name])}</span></div>
    ${rec.suspensions&&rec.suspensions.length?`<div class="warn">🟥 Suspension : ${rec.suspensions.map(escapeHtml).join(', ')}</div>`:''}
    ${rec.motm&&P[rec.motm]?`<div class="hint">⭐ Homme du match : <b>${escapeHtml(P[rec.motm].name)}</b>${injs?` · 🩼 ${injs} blessé${injs>1?'s':''}`:''}${cards?` · 🟨 ${cards}`:''}</div>`:''}
    <details class="bil-more"><summary>Le film, les notes, pourquoi, le classement</summary>
      <div class="two-cols"><div><div class="section-label">Le film du match</div>${eventsHTML(rec.events)}</div><div><div class="section-label">Les notes</div>${ratingsHTML(rec,P)}</div></div>
      <div class="section-label">Pourquoi ce résultat</div>${factorsHTML(rec.factors)}
      <div class="section-label">Classement</div>${tableHTML(sortTable(comp.table),c.name,false)}
    </details>
    <div class="btn-row"><button class="btn" onclick="coachAfterMatch()">${last?'Bilan de la phase →':'Continuer →'}</button></div></div>`;
}

/* ---------- Joueur·euse : avant-match, penalty, résultat ---------- */
function renderPPrematch(){
  const m=state.match, c=state.club, P=playerSquadMap(), me=P.me; const rivals=state.squad.filter(p=>p.pos===state.pos&&availableForMatch(p)).sort((a,b)=>effRating(b,state.year)-effRating(a,state.year));
  const st=m.myStatus; const label={xi:'✅ Titulaire',bench:'🪑 Sur le banc',injured:'🩼 Blessé·e',suspended:'🟥 Suspendu·e',out:'🚫 Hors du groupe'}[st];
  const why=st==='xi'?`Le coach te fait confiance (${sur10(state.coachTrust)}/10). Ton niveau du jour : ${niv(effRating(me,state.year))}${me.selBonus>=0?' +':' −'}${Math.abs(me.selBonus).toFixed(1).replace('.',',')} de crédit auprès du coach.`:st==='bench'?`Devant toi au poste : ${rivals.slice(0,state.pos==='G'?1:state.pos==='A'?2:4).map(p=>`${escapeHtml(p.name)} (${niv(effRating(p,state.year))})`).join(', ')}. Toi : ${niv(effRating(me,state.year))}, confiance du coach ${sur10(state.coachTrust)}. Une entrée en jeu reste possible.`:st==='injured'?`Encore ${state.injury} semaine${state.injury>1?'s':''} d'absence.`:st==='suspended'?`Encore ${state.suspended} match${state.suspended>1?'s':''} de suspension.`:`Le coach ne t'a pas retenu·e (confiance ${sur10(state.coachTrust)}).`;
  return `<div class="card"><h2 class="display">${matchdayLabel()} · ${escapeHtml(c.leagueName)}</h2>${phaseTrack()}${whyHTML(m.why)}${sinceHTML(state.sinceLast)}
    ${oppCardHTML(m)}
    <div class="my-status ${st}"><b>${label}</b><div class="hint">${why}</div><div class="hint">Fraîcheur ${fitBar(state.fitness==null?100:state.fitness)} ${Math.round(state.fitness==null?100:state.fitness)} % · forme ${Math.round(state.forme)} · ${'⚽'} ${state.seasonStats.goals} b · 🅰️ ${state.seasonStats.assists} p · ${state.seasonStats.apps} matchs cette saison${state.yellows?` · 🟨 ${state.yellows}`:''}</div></div>
    <div class="section-label">Le onze du coach (${m.formation})</div><div class="squad">${m.xi.map(id=>P[id]).filter(Boolean).map(p=>`<div class="${p.isMe?'me':''}"><span class="pos-badge pos-${p.pos}">${p.pos}</span> ${escapeHtml(p.name)}${p.isMe?' (toi)':''} <span>${niv(effRating(p,state.year))}</span></div>`).join('')}</div>
    ${m.bench.length?`<div class="hint">Banc : ${m.bench.map(id=>P[id]).filter(Boolean).map(p=>`${escapeHtml(p.name)}${p.isMe?' (toi)':''}`).join(', ')}</div>`:''}
    <div class="section-label">Ta semaine</div>
    <div class="hint">Ce que tu fais de ces jours-là coûte des jambes pour dimanche et se paiera — ou se paiera en juin. ${escapeHtml(pTrainingCurveHelp())}</div>
    <div class="choice-list">${PTRAINING.map((t,i)=>{
      const nf=clamp((state.fitness==null?100:state.fitness)+t.fit,0,100);
      return `<button class="choice-btn" onclick="playerChooseTraining(${i})"><span class="ico">${t.icon}</span><div class="body"><b>${escapeHtml(t.label)}</b><small>${escapeHtml(t.sub)}</small><div class="traits"><i class="${t.fit>=0?'plus':'minus'}">🫁 Fraîcheur <b>${Math.round(state.fitness==null?100:state.fitness)}</b>→<b>${Math.round(nf)}</b></i>${t.aspect?`<i class="plus">${PSTAT[t.aspect]} travaillé</i>`:t.load?'<i>Rien de particulier</i>':'<i class="minus">Aucun travail</i>'}</div></div></button>`;
    }).join('')}</div>
    <div class="btn-row"><button class="btn secondary" onclick="playerSimPhase()">Simuler la fin de la phase ⏩</button></div></div>`;
}
function renderPPenalty(){
  const m=state.match, pen=m.pending; const chance=Math.round(playerPenaltyChance()*100); const ha=matchHomeAway(m);
  return `<div class="card event-card">${sinceHTML(state.sinceLast)}<div class="ico">🎯</div><h2 class="display">${pen.min}e minute : penalty pour ${escapeHtml(state.club.name)} !</h2><p class="narr">${escapeHtml(ha.home)} ${ha.gh} – ${ha.ga} ${escapeHtml(ha.away)}. Le stade se lève, le capitaine te regarde. Tu prends le ballon ?</p>
    <div class="choice-list"><button class="choice-btn" onclick="playerPenaltyChoice(true)"><span class="ico">⚽</span><div class="body"><b>Le tirer toi-même</b><small>${chance} % de réussite (mental ${Math.round(state.stats.mental)}${state.traitId==='glace'?', sang froid':''}). Marqué : le stade est à toi. Raté : le stade s'en souviendra.</small></div></button>
    <button class="choice-btn" onclick="playerPenaltyChoice(false)"><span class="ico">🤝</span><div class="body"><b>Laisser le tireur attitré</b><small>76 % de réussite, aucun risque pour toi, aucune gloire non plus.</small></div></button></div></div>`;
}
function renderPMatchResult(){
  const rec=state.lastMatch, c=state.club, P=playerSquadMap(), comp=state.comp; const N=comp.teams.length; const last=state.matchday>=comp.phaseEnds[state.phase];
  const mine=rec.played?`<div class="my-line ${rec.note>=7?'good':rec.note<5.5?'bad':''}"><b>Toi</b> · ${rec.start?'titulaire':'entré·e en jeu'} · ${rec.min} min · note ${notePill(rec.note)}${rec.goals?` · ⚽ ${rec.goals}`:''}${rec.assists?` · 🅰️ ${rec.assists}`:''}${rec.yellow?' · 🟨':''}${rec.red?' · 🟥':''}${rec.inj?` · 🩼 ${rec.inj} sem.`:''}${rec.motm==='me'?' · ⭐ joueur·euse du match':''} · confiance du coach ${d10(rec.dTrust*1)} → ${sur10(state.coachTrust)}</div>`:`<div class="my-line"><b>Toi</b> · ${rec.status==='bench'?'resté·e sur le banc · confiance du coach −0,06':rec.status==='injured'?'blessé·e, en tribune':rec.status==='suspended'?'suspendu·e':'hors du groupe'} → ${sur10(state.coachTrust)}</div>`;
  return `<div class="card">${scoreHero(rec,c.name)}<p class="narr story">${escapeHtml(rec.story)}${rec.penNote?` ${escapeHtml(rec.penNote)}`:''}</p>${mine}
    ${revealHTML(rec.reveal)}
    <div class="two-cols"><div><div class="section-label">Le film du match</div>${eventsHTML(rec.events)}</div><div><div class="section-label">Les notes${rec.motm&&P[rec.motm]?` · ${rec.motm==='me'?'toi':escapeHtml(P[rec.motm].name)} en tête`:''}</div>${ratingsHTML(rec,P,'me')}</div></div>
    <div class="section-label">Classement</div><div class="hint">${escapeHtml(c.name)} ${ordinal(rec.pos)} sur ${N} · forme ${formChips(comp.form&&comp.form[c.name])}</div>${tableHTML(sortTable(comp.table),c.name,false)}
    <div class="btn-row"><button class="btn" onclick="playerAfterMatch()">${last?'Bilan de la phase →':'Continuer →'}</button>${last?'':'<button class="btn secondary" onclick="playerAfterMatch();playerSimPhase()">Simuler la fin de la phase ⏩</button>'}</div></div>`;
}

window.addEventListener('DOMContentLoaded',()=>{ renderStart(); });
