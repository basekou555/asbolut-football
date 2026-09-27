/* Simulation automatique : joue 14 carrières d'entraîneur·euse et 8 carrières de joueur·euse dans un Chromium headless,
   en passant par tous les écrans (avant-match, mi-temps, résultat, penalty) ; la colonne « goals/m » etc. sert à juger le réalisme du moteur de match.
   Usage : npm i -g playwright-core (ou PLAYWRIGHT_CORE=/chemin/vers/playwright-core) puis node tests/simulate.js
   Sortie : une ligne par carrière, puis 'ERRORS: none' si aucune erreur d'exécution. */
const { chromium } = require(process.env.PLAYWRIGHT_CORE||'playwright-core');
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--js-flags=--max-old-space-size=4096']});
  const page=await browser.newPage();
  const errors=[]; page.on('pageerror',e=>errors.push('PAGEERROR: '+e.message+' '+(e.stack||'').split('\n').slice(0,2).join(' | '))); page.on('console',m=>{ if(m.type()==='error'&&!m.text().includes('CERT')) errors.push('CONSOLE: '+m.text()); });
  await page.goto('file://'+require('path').resolve(__dirname,'..','index.html')+''); await page.waitForTimeout(500);
  const out=await page.evaluate(async()=>{
    const res={coach:[],player:[]}; const rnd=n=>Math.floor(Math.random()*n);
    for(let run=0;run<14;run++){
      try{
        localStorage.clear();
        const era=ERAS[run%ERAS.length], mode=COACH_MODES[run%COACH_MODES.length];
        creation={kind:'coach',step:0,name:'C'+run,era,mode,origin:pick(COACH_ORIGINS),nationality:pick(NATIONALITIES),style:pick(STYLES),mentor:pick(COACHES_BY_ERA[era.id]),quality:pick(COACH_QUALITIES),flaw:pick(COACH_FLAWS)};
        launchCoach(); state.tempo=pick(Object.keys(TEMPOS));
        let steps=0, screens={}, gaps=[], wagesR=[], onceSeen=new Set(), onceEv=new Set(), mstat={n:0,g:0,y:0,r:0,inj:0,pen:0,sub:0,ht:0}, cstat={carrefours:0}, dashSeen=false, natSeen=false, projChecks=0;
        while(!state.ended&&steps<6000){
          steps++; const pc=state.pendingChoice; screens[pc]=(screens[pc]||0)+1; if(steps%100===0) await new Promise(r=>setTimeout(r,0)); // laisse respirer le moteur de rendu
          if(pc==='offers'){ if(state.currentOffers.length){ const stay=state.currentOffers.findIndex(o=>o.stay); if(stay>=0&&state.currentOffers[stay].underContract&&Math.random()<.1){ coachBreakContract(); if(!state.currentOffers.length){ coachSkipYear(); render(); continue; } } coachAcceptOffer(stay>=0&&Math.random()<.7?stay:rnd(state.currentOffers.length)); } else coachSkipYear(); }
          else if(pc==='mercato'){ if(!natSeen){ natSeen=true; const h=renderMercato();
              if(state.squad.some(p=>!p.nat)) throw new Error('un joueur sans nationalité');
              if(!/class="nat/.test(h)) throw new Error('nationalités absentes du mercato');
              if(state.club.nat==='FR'&&eraForeignersMax(state.year)<99&&!/quota-box/.test(h)) throw new Error('quota d\'étrangers non affiché'); }
            const m=state.market; let tries=0;
            const h=renderMercato(); if(!h||!/mk-card|mk-empty/.test(h)) throw new Error('carte de mercato absente');
            // Un joueur se décrit par sa manière de jouer, et l'écran le dit.
            if(state.squad.some(p=>!p.profil&&!p.trait)) throw new Error('un joueur sans profil de jeu');
            if(marketCurrent()&&!/class="profil/.test(h)) throw new Error('profil de jeu absent du mercato');
            // Écarter un dossier doit vraiment raccourcir la pile, et ne pas le faire revenir.
            { const cur0=marketCurrent();
              if(cur0){ const n0=cur0.total, id0=cur0.i; coachDropTarget(id0);
                const after=marketDeck();
                if(after.length!==n0-1) throw new Error(`dossier écarté : pile de ${after.length} au lieu de ${n0-1}`);
                if(after.some(x=>x.i===id0)) throw new Error('un dossier écarté revient dans la pile');
                coachUndropAll();
                if(marketDeck().length!==n0) throw new Error('remettre les dossiers sur la table ne les rend pas tous'); } }
            while(tries<6){ tries++; coachMarketGo(1); const cur=marketCurrent(); if(!cur) break;
              if(!coachBlockers(cur.t).length&&Math.random()<.6) coachBuy(cur.i);
              if(state.pendingChoice!=='mercato') break; }
            if(state.squad.length>25) coachSell(state.squad[state.squad.length-1].id); coachCloseMercato(); }
          else if(pc==='tactic'){ coachSetTactic(pick(Object.keys(FORMATIONS)),Math.random()<.6?state.club.styleWanted:state.favoriteStyleId); }
          else if(pc==='event'){ const ce=state.currentEvent;
            // Ce qui n'arrive qu'une fois dans une vie ne doit jamais revenir.
            if(ce.event.once){ const k=ce.event.id||ce.event.title;
              if(onceEv.has(k)) throw new Error('événement unique rejoué : '+k); onceEv.add(k); }
            if(ce.kind==='carrefour'){ cstat.carrefours++; coachChooseCrossroad(rnd(ce.event.menu.length)); }
            else { cstat[ce.kind]=(cstat[ce.kind]||0)+1;
              const j=rnd(ce.event.choices.length), ch=ce.event.choices[j];
              // Ce que l'écran a annoncé doit être exactement ce qui est appliqué.
              const expect={}; Object.entries(ch.effects||{}).forEach(([k,v])=>{ const pr=coachProject(k,v); if(pr) expect[k]=pr.next; });
              coachChooseEvent(j);
              Object.entries(expect).forEach(([k,want])=>{ const pr=coachProject(k,0);
                if(pr&&Math.abs(pr.cur-want)>0.02) throw new Error(`projection fausse (${k}) : annoncé ${want.toFixed(2)}, appliqué ${pr.cur.toFixed(2)}`); });
              projChecks++; } }
          else if(pc==='choiceResult'){ coachContinueChoiceResult(); }
          else if(pc==='meeting'){ const mt=state.meeting; mstat.ht++; (cstat[mt.kind]=(cstat[mt.kind]||0)+1);
            if(!mt.choices.length) throw new Error('rendez-vous sans option : '+mt.title);
            // Ces histoires ne se jouent qu'une fois par joueur et par carrière :
            // leur intitulé porte son nom, il ne doit donc jamais revenir.
            if(mt.aboutId!=null){
              const key=mt.kind+':'+mt.aboutId;
              if(onceSeen.has(key)) throw new Error(`histoire rejouée sur le même joueur : ${key} (${mt.title})`);
              onceSeen.add(key); }
            const h=renderMeeting(); if(!h||h.length<300) throw new Error('écran de rendez-vous vide');
            coachChooseMeeting(rnd(mt.choices.length)); }
          else if(pc==='matchResult'){ const m=state.lastMatch; mstat.n++; mstat.g+=m.gh+m.ga; mstat.y+=m.events.filter(e=>e.kind==='yellow').length; mstat.r+=m.events.filter(e=>e.kind==='red'&&e.side==='us').length; mstat.inj+=m.events.filter(e=>e.kind==='injury').length; mstat.pen+=m.events.filter(e=>e.kind==='goal'&&/penalty/.test(e.text)||e.kind==='penmiss').length; mstat.sub+=m.events.filter(e=>e.kind==='sub').length; if(!m.ratings||!Object.keys(m.ratings).length) throw new Error('no ratings'); coachAfterMatch(); }
          else if(pc==='phaseResult'){ if(!dashSeen){ dashSeen=true; const h=renderDashboard(); if(!h||h.length<500) throw new Error('tableau de bord entraîneur vide'); }
            // Le tableau de bord, le « pourquoi » du match et le moteur doivent additionner la même chose.
            { const bd=coachStrengthBreakdown(), moteur=teamStrength(state.squad,FORMATIONS[state.formation],state.year,{bonus:coachBonus(false)+activeBoost()});
              if(Math.abs(bd.total-moteur)>.02) throw new Error(`force affichée ${bd.total.toFixed(2)} pour une force jouée de ${moteur.toFixed(2)}`);
              const somme=bd.rows.reduce((n,r)=>n+r.v,0); if(Math.abs(somme-bd.total)>.001) throw new Error('le détail de la force ne fait pas le total'); }
            { const ph=state.lastPhase; if(ph&&ph.confWhy){ const somme=ph.confWhy.reduce((n,l)=>n+l.d,0);
                if(Math.abs(somme-ph.dConf)>1.1) throw new Error(`confiance : le détail (${somme.toFixed(1)}) ne fait pas le total (${ph.dConf})`); } }
            coachAfterPhase(); }
          else if(pc==='seasonEnd'){ { const co=state.history[state.history.length-1].cote;
              const somme=co.why.map(w=>parseFloat((w.match(/(-|−|\+)?\d+(,\d+)?$/)||['0'])[0].replace('−','-').replace(',','.'))).reduce((a,b)=>a+b,0);
              if(Math.abs(somme-(co.after-co.before))>1.2) throw new Error(`cote : le détail (${somme.toFixed(1)}) ne fait pas le total (${co.after-co.before})`); }
            gaps.push(Math.round((state.lastPhase.strength-state.club.strength)*10)/10); wagesR.push(Math.round(state.squad.reduce((n,p)=>n+p.wage,0)/state.club.wageCap*100)/100); coachAfterSeasonEnd();
            // une carrière sur trois force un destin de roulette, pour couvrir les suites (exclusivité, bannissement)
            if(run%3===0&&!state.ended&&!state.rouletteFate&&state.history.length===3){ state.currentRoulette={event:pick(COACH_ROULETTES.filter(r=>r.fate&&r.fate.kind!=='death'&&r.fate.kind!=='banned')),outcomes:['end','jackpot','small','malus']}; state.pendingChoice='roulette'; } }
          else if(pc==='sacked'){ coachIntersaison(); }
          else if(pc==='roulette'){ coachChooseRoulette(rnd(4)); }
          else if(pc==='pressureCrisis'){ coachChoosePressure(rnd(3)); }
          else { res.coach.push({run,error:'unknown pc '+pc}); break; }
          render();
        }
        render();
        res.coach.push({run,era:era.id,mode:mode.id,fate:(state.rouletteFate&&state.rouletteFate.kind)||'-',cause:state.endingCause,age:state.age,year:state.year,seasons:state.history.length,sackings:state.sackings,titles:state.titles,awards:state.awards,steps,screens,clubs:state.clubsCoached.length,rep:Math.round(state.stats.reputation),scams:state.scamsSuffered,gap:(gaps.reduce((a,b)=>a+b,0)/Math.max(1,gaps.length)).toFixed(1),gapMax:Math.max(...gaps,0),wr:(wagesR.reduce((a,b)=>a+b,0)/Math.max(1,wagesR.length)).toFixed(2),m:mstat,ev:cstat,proj:projChecks,proches:Math.round(state.gauges.proches)});
      }catch(e){ res.coach.push({run,error:e.message+' @ '+(e.stack||'').split('\n')[1],pc:state&&state.pendingChoice}); }
    }
    for(let run=0;run<8;run++){
      try{
        localStorage.clear(); const era=ERAS[run%ERAS.length];
        const psup=[]; let pidle=0, prev=0; creation={kind:'player',step:0,name:'P'+run,era,pos:PLAYER_POS[run%4],origin:pick(PLAYER_ORIGINS),trait:pick(PLAYER_TRAITS)}; launchPlayer(); state.tempo=pick(Object.keys(TEMPOS));
        { const q=pQual(), f=pFlaw(); if(!q||!f) throw new Error('qualité ou défaut manquant');
          if(q.axe===f.axe) throw new Error('qualité et défaut sur le même axe : '+q.axe); }
        let steps=0, pstat={n:0,played:0,start:0,pen:0,g:0,inj:0}, pcar={carrefours:0}, pdashSeen=false, onceEv=new Set();
        while(!state.ended&&steps<5000){
          steps++; const pc=state.pendingChoice; if(steps%100===0) await new Promise(r=>setTimeout(r,0));
          // L'intersaison du joueur·euse est une suite : vacances → été → envies → offres une par une.
          if(pc==='vacances'){ const h=renderPVacances(); if(!/playerChooseVacances/.test(h)) throw new Error("écran des vacances vide"); playerChooseVacances(rnd(PVACANCES.length)); }
          else if(pc==='ete'){ const h=renderPSummer(); if(!/playerChooseSummer/.test(h)) throw new Error("écran de préparation vide"); playerChooseSummer(rnd(PSUMMER.length)); }
          else if(pc==='envies'){ const h=renderPWish(); if(!/playerChooseWish/.test(h)) throw new Error("écran des envies vide"); playerChooseWish(rnd(PWISHES.length)); }
          else if(pc==='offerOne'){ const n0=(state.offerQueue||[]).length;
            const h=renderPOfferOne(); if(!/playerSignOffer/.test(h)) throw new Error("offre unique non affichée");
            // Ce que le club a décidé au bilan doit être dit sur l'écran des offres.
            if(state.clubLeft&&!/ne te prolonge pas/.test(h)) throw new Error("non-renouvellement non affiché");
            // Après 35 ans, un super-club ne construit plus avec toi.
            (state.offerQueue||[]).forEach(o=>{ if(pAge()>=35&&o.tier==='superclub'&&!o.stay) throw new Error('offre de super-club à '+pAge()+' ans'); if(o.tier==='superclub'&&!o.stay) psup.push([pAge(),Math.round(pRating()),o.strength]); });
            if(n0>1&&Math.random()<.45){ playerRefuseOffer();
              const n1=(state.offerQueue||[]).length; if(n1!==n0-1) throw new Error(`refus : file de ${n1} au lieu de ${n0-1}`); }
            else playerSignOffer(); }
          else if(pc==='offers'){ if(state.currentOffers.length){ const stay=state.currentOffers.findIndex(o=>o.stay); if(stay>=0&&state.currentOffers[stay].underContract&&Math.random()<.1){ playerBreakContract(); if(!state.currentOffers.length){ playerSkipYear(); render(); continue; } } playerAcceptOffer(rnd(state.currentOffers.length)); } else playerSkipYear(); }
          else if(pc==='event'){ const ce=state.currentEvent;
            // Ce qui n'arrive qu'une fois dans une vie ne doit jamais revenir.
            if(ce.event.once){ const k=ce.event.id||ce.event.title;
              if(onceEv.has(k)) throw new Error('événement unique rejoué : '+k); onceEv.add(k); } if(ce.kind==='carrefour'){ pcar.carrefours++; playerChooseCrossroad(rnd(ce.event.menu.length)); } else { pcar[ce.kind]=(pcar[ce.kind]||0)+1; playerChooseEvent(rnd(ce.event.choices.length)); } }
          else if(pc==='choiceResult'){ playerContinueChoiceResult(); }
          else if(pc==='prematch'){
            // L'avant-match est devenu une décision : la semaine d'entraînement.
            const h=renderPPrematch(); if(!/playerChooseTraining/.test(h)) throw new Error("l'avant-match ne propose pas de semaine d'entraînement");
            if(Math.random()<.35) playerSimPhase(); else playerChooseTraining(rnd(PTRAINING.length)); }
          else if(pc==='penalty'){ pstat.pen++; playerPenaltyChoice(Math.random()<.7); }
          else if(pc==='matchResult'){ const m=state.lastMatch; pstat.n++; if(m.played) pstat.played++; if(m.start) pstat.start++; pstat.g+=m.gh+m.ga; if(m.inj) pstat.inj++;
            if(m.reveal){ prev++; const h=renderPMatchResult(); if(!h.includes(m.reveal.name)) throw new Error("révélation non affichée : "+m.reveal.name); }
            playerAfterMatch(); }
          else if(pc==='phaseResult'){ if(!pdashSeen){ pdashSeen=true; const h=renderPlayerDashboard(); if(!h||h.length<400) throw new Error('tableau de bord joueur vide'); } playerAfterPhase(); }
          else if(pc==='seasonEnd'){ const h=renderPSeasonEnd(); const f=state.lastSeason;
            if(f.idle&&!/Mental/.test(h)) throw new Error("saison sans jouer non expliquée");
            if(f.clubMood&&!f.clubMood.keep&&!/ne te prolonge pas/.test(h)) throw new Error("non-renouvellement absent du bilan");
            if(f.idle) pidle++;
            playerAfterSeasonEnd(); }
          else if(pc==='roulette'){ playerChooseRoulette(rnd(4)); }
          else if(pc==='pressureCrisis'){ playerChoosePressure(rnd(3)); }
          else { res.player.push({run,error:'unknown pc '+pc}); break; }
          render();
        }
        render();
        if(state.totals.apps>=13&&(!state.qual.seen||!state.flaw.seen)) throw new Error('qualité ou défaut jamais révélé après '+state.totals.apps+' matchs');
        res.player.push({run,era:era.id,pos:state.pos,cause:state.endingCause,age:pAge(),seasons:state.history.length,totals:state.totals,note:Math.round(pRating()),clubs:state.clubs.length,sup:psup.length,idle:pidle,rev:prev,best:state.history.reduce((b,h)=>Math.max(b,h.note||0),0).toFixed(2),p:pstat,ev:pcar,entourage:Math.round(state.gauges.entourage)});
      }catch(e){ res.player.push({run,error:e.message+' @ '+(e.stack||'').split('\n')[1],pc:state&&state.pendingChoice}); }
    }
    try{ renderBadges(); renderHall(); renderRules(); state=null; renderStart(); startCoachCreation(); cPick('name','X'); cPickEra(2); render; startPlayerCreation(); cPick('name','Y'); cPickEra(5); cPick('pos',PLAYER_POS[3]); cPick('origin',PLAYER_ORIGINS[0]); cPick('trait',PLAYER_TRAITS[0]); }catch(e){ res.ui='UI error: '+e.message+' '+(e.stack||'').split('\n')[1]; }
    return res;
  });
  console.log('COACH'); out.coach.forEach(c=>console.log(c.error?JSON.stringify(c):[c.run,c.era,c.mode,c.cause,'age'+c.age,c.year,'seasons'+c.seasons,'sack'+c.sackings,'L'+c.titles.league+'/P'+c.titles.promo+'/C'+c.titles.cup+'/E'+c.titles.euro,'aw'+c.awards,'clubs'+c.clubs,'rep'+c.rep,'scams'+c.scams,'gap'+c.gap,'gapMax'+c.gapMax,'wages'+c.wr,'matches'+c.m.n,'goals/m'+(c.m.g/Math.max(1,c.m.n)).toFixed(2),'yel/m'+(c.m.y/Math.max(1,c.m.n)).toFixed(2),'red/m'+(c.m.r/Math.max(1,c.m.n)).toFixed(3),'inj/m'+(c.m.inj/Math.max(1,c.m.n)).toFixed(3),'pen/m'+(c.m.pen/Math.max(1,c.m.n)).toFixed(3),'sub/m'+(c.m.sub/Math.max(1,c.m.n)).toFixed(2),'carrefours'+c.ev.carrefours,'dilemmes'+(c.ev.dilemma||0),'vie'+(c.ev.happening||0),'incidents'+(c.ev.incident||0),'projOK'+c.proj,'proches'+c.proches].join(' ')));
  console.log('PLAYER'); out.player.forEach(p=>console.log(p.error?JSON.stringify(p):[p.run,p.era,p.pos,p.cause,'age'+p.age,'seasons'+p.seasons,'apps'+p.totals.apps,'goals'+p.totals.goals,'titles'+p.totals.titles,'caps'+p.totals.caps,'ballons'+p.totals.ballons,'note'+p.note,'best'+p.best,'clubs'+p.clubs,'m'+p.p.n,'played'+p.p.played,'starts'+p.p.start,'pen'+p.p.pen,'inj'+p.p.inj,'carrefours'+p.ev.carrefours,'dilemmes'+(p.ev.dilemma||0),'vie'+(p.ev.happening||0),'incidents'+(p.ev.incident||0),'entourage'+p.entourage,'situations'+(p.ev.situation||0),'idle'+p.idle,'rev'+p.rev].join(' ')));
  console.log('UI',out.ui||'ok'); console.log('ERRORS:',errors.length?errors.slice(0,10).join('\n'):'none');
  await browser.close();
})();
