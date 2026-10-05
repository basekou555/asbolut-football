/* ============================================================
   LES ÉCRANS DE L'ENTRAÎNEUR·EUSE
   Ils réutilisent tout ce qui est commun — le classement, l'effectif, le film du
   match, les notes, le journal — et n'écrivent que ce qui change. Les sept verrous
   tiennent : aucun chiffre de jauge n'arrive ici, seulement des phrases.
   « Un écran ne doit pas ressembler au précédent » : la semaine est une carte de
   décisions, le match une situation, le résultat un film, le bilan un temps où
   l'on souffle.
   ============================================================ */

function cTopHTML(){
  const hors = { cbilan:"Le bilan", cvire:"La porte", coffres:"Les offres",
    cmercato:"Mercato", cvie:"La vie", cprepa:"Pr\u00e9paration",
    ccarriere:"Fin du parcours" }[S.ecran];
  const pos = hors ? 0 : cPlace();
  return `<div class="top">
    <div><div class="who">${esc(S.moi.nom)}</div>
      <div class="sub">Entraîneur·euse · ${esc(S.club.nom)} · ${S.moi.age} ans</div></div>
    <div class="meta">${S.annee}${hors ? '' : `-${S.annee + 1}`}<br>${hors
      ? esc(hors) : `${ordinal(Math.min(S.journee + 1, JOURNEES))} journée sur ${JOURNEES}`}
      <br>${hors ? (S.carriere ? `${S.carriere.saisons} saison${S.carriere.saisons > 1 ? 's' : ''}` : '')
        : `${ordinal(pos)} · objectif ${S.objectif}ᵉ · ${abrDivision()}`}
      <br><button class="rap" onclick="ouvrirRapport()" title="Signaler un problème">⚠</button></div>
  </div>`;
}

/* ---------------- ta situation ---------------- */
/* La fiche, en cases et non en lignes — c'est la forme qu'il a validée le
   27/09/2026 pour le joueur·euse (971 → 651 px à 430 px de large). Chaque case
   porte son libellé, sa phrase, et **la conséquence** en dessous : sans elle,
   une jauge affichée n'aurait pas sa place ici. */
const CLIENS_VUS = ['president', 'direction', 'presse', 'supporters'];
const CLIEN_ICO = { president:'🏛️', direction:'💼', presse:'📰', supporters:'📣' };
const CLIEN_NOM = { president:"Le président", direction:"La direction",
  presse:"La presse", supporters:"Le stade" };
function cSituationHTML(ouvert){
  const gens = CLIENS_VUS.map(k => celSit(CLIEN_ICO[k], CLIEN_NOM[k], cDire(k), k, cPourquoi(k))).join('');
  const maLigne = k => `${LIGNE_NOM[k]} : ${minuscule(direLigne(k))} ${direTendance(k)}`;
  /* « LE VESTIAIRE » NE PEUT PAS ÊTRE DEUX CASES (le propriétaire, 05/10/2026 :
     « la ligne vestiaire dans l'entraîneur ne donne pas les bonnes infos »). Il y
     en avait deux, **même nom et même icône ✊**, à une section d'écart : celle-ci
     lisait `vestiaire()` (la moyenne des trois ententes) et celle de « Ton métier »
     lit `cAxe('groupe')` (ton métier d'homme de vestiaire, ce que la séance
     construit). Mesuré sur 5 006 semaines : **les deux diffèrent de dix points ou
     plus 85 % du temps** (médiane 17, maximum 42), donc on ne pouvait pas lire
     l'une en croyant l'autre sans se tromper.
     Et elle était fausse deux fois de plus : (1) elle parlait avec `MOTS.vestiaire`,
     **le vocabulaire du joueur·euse** — « On te sert volontiers », « Tu es un joueur
     du groupe » : 31 % des semaines un entraîneur lisait une phrase qui n'a de sens
     que pour quelqu'un qui joue (le seul usage de `MOTS.*` de ce fichier, même
     famille que la fuite du mercredi du 05/10) ; (2) elle passait par `bande()`, les
     bandes générales de seize points, là où une entente a ses huit bandes
     resserrées et sa direction depuis le 27/09 — mesuré, **4 lectures sur 6** et la
     plus fréquente à 45 %.
     Elle est donc retirée, comme elle l'a été côté joueur·euse le 02/10 et pour la
     même raison : c'est au mot près la moyenne de trois nombres **déjà lisibles
     deux sections plus bas**, dans la bonne voix et avec les bonnes bandes. Sa
     conséquence mécanique n'est pas perdue pour autant — elle passe dans l'en-tête
     des trois lignes, là où les trois nombres sont. */
  const equipe = [
    celSit('🫁', "Les jambes", cDireJambes(), 'fit',
      "C'est ce que l'équipe produira samedi — et ce qu'une semaine chargée coûte."),
    celSit('🏥', "Le groupe", cDireInfirmerie(), 'grp', null),
    celSit('🏋️', "La condition", cDireCondition(), 'cond',
      "C'est ce que la semaine athlétique construit : la vitesse de récupération et les blessures."),
    celSit('📋', "L'objectif", cDireObjectif(), 'obj',
      cPourquoi('president')),
  ].join('');
  const toi = CAXES.map(a => celSit(
    { jeu:'🧠', groupe:'✊', banc:'🪑', reseau:'🤝' }[a], CAXE_NOM[a], cDireAxe(a), a,
    { jeu:"Il entre dans la force de l'équipe à chaque match.",
      groupe:"Les ententes montent plus vite, et tombent moins.",
      banc:"C'est la réussite de tes décisions en cours de match.",
      reseau:"C'est lui qui fait qu'un club t'appelle, et que la direction te suit." }[a])).join('');
  const q = CQUALITES.find(x => x.id === S.moi.qual.id), f = CDEFAUTS.find(x => x.id === S.moi.def.id);
  const perso = [
    q ? celSit('⭐', q.nom, q.t, 'q', `Quinze points de plus sur ${CAXE_MOT[q.axe]}, pour toujours.`) : '',
    f ? celSit('🔻', f.nom, f.t, 'f', `Quinze points de moins sur ${CAXE_MOT[f.axe]}, pour toujours.`) : '',
  ].join('');
  return `<details class="fold"${ouvert ? ' open' : ''}><summary>Ta situation</summary>
    <div class="sitHead">Autour de toi</div><div class="sit">${gens}</div>
    <div class="sitHead">Ton équipe</div><div class="sit">${equipe}</div>
    <div class="sitHead">Ton métier</div><div class="sit">${toi}</div>
    <div class="sitHead">Ce qu'on sait de toi</div><div class="sit">${perso}</div>
    <div class="lineHead">Les trois lignes<span>Leur moyenne est l'entente du vestiaire, et elle entre dans la force de l'équipe.</span></div>
    <div class="sit">${LIGNES.map(k => celSit(
      { def:'🛡️', mil:'🧭', att:'🎯' }[k], LIGNE_NOM[k], maLigne(k), k,
      ENJEU_LIGNE_COACH[k])).join('')}</div>
  </details>`;
}
const ENJEU_LIGNE_COACH = {
  def:"Plus ils se trouvent, moins vous encaissez.",
  mil:"C'est par eux que le jeu passe, ou ne passe pas.",
  att:"Plus ils sont servis, plus vous marquez." };
function cDireInfirmerie(){
  const out = S.equipe.filter(j => j.blesse > 0 || j.susp > 0);
  if (!out.length) return "Tout le monde est disponible. Le onze est celui que tu veux.";
  const noms = out.slice(0, 3).map(j => j.nom);
  const q = out.length <= 2 ? `Le groupe absorbe.` : out.length <= 4 ? `Ça commence à faire.` : `On est à l'os.`;
  return `${out.length} absent${out.length > 1 ? 's' : ''}, dont ${liste(noms)}. ${q}`;
}

/* ---------------- la semaine ---------------- */
function ecranCSemaine(){
  const adv = adversaire(S.journee);
  const entete = adv.dom ? `${S.club.nom} reçoit ${adv.nom}` : `${S.club.nom} se déplace à ${adv.nom}`;
  const merc = cDireMercredi();
  return `${cSituationHTML(true)}
  <div class="card">
    <div class="step">${esc(entete)}</div>
    <h2>Ta semaine</h2>
    ${merc ? `<p class="narr" style="margin:0 0 8px"><b>${esc(merc)}</b> Les jambes de mercredi seront celles de samedi.</p>` : ''}
    ${S.tribune ? `<div class="lack"><b>Tu es suspendu de banc.</b> Tu suivras le match depuis la tribune : tes décisions passeront moins bien.</div>` : ''}
    <h3>Ce que tu fais de la semaine</h3>
    ${CSEMAINES.map(s => optHTML(s.ico, s.nom, s.sous, s.dits, `cChoisirSemaine('${s.id}')`)).join('')}
  </div>
  ${effectifHTML()}${classementHTML()}${liensJournal()}`;
}
function cDireMercredi(){
  const info = matchAnnexe(S.journee);
  if (!info) return null;
  return info.c === 'coupe' ? `Mercredi, la Coupe ${TOURS_COUPE[info.t]}.`
    : `Mercredi, l'Europe — ${TOURS_EURO[info.t]}.`;
}

/* ---------------- un arrêt ---------------- */
function ecranCArret(){
  const a = S.arret;
  return `<div class="card">
    <div class="step">${ordinal(S.journee + 1)} journée · la semaine</div>
    <div class="big-ico">💬</div>
    <h2>${esc(a.titre)}</h2>
    <p class="narr">${esc(a.texte)}</p>
    ${a.options.map((o, i) => optHTML('▸', o.l, null, o.dits, `cChoisirArret(${i})`)).join('')}
  </div>${liensJournal()}`;
}

/* ---------------- une décision en cours de match ---------------- */
/* L'ÉCRAN DE MI-TEMPS ÉTAIT MORT EN 1.0 (cartographie du 26/09 : « `coachKickoff()`
   n'est plus appelé qu'en mode automatique, il n'existe aucune fonction de rendu et
   la table de dispatch ne le connaît pas — les quatre `HALFTIME_CHOICES` sont
   injouables »). Il revient, et il n'est plus seul. */
function ecranCMoment(){
  const m = S.match, f = m.moments[S.momentIdx];
  const sc = `${f.cx.nous} – ${f.cx.eux}`;
  return `<div class="card">
    <div class="step">${f.min}ᵉ minute · ${esc(S.club.nom)} ${sc} ${esc(m.adv.nom)}</div>
    <div class="big-ico">${f.ico}</div>
    <h2>${esc(f.titre)}</h2>
    <p class="narr">${esc(f.texte)}</p>
    ${f.opts.map((o, i) => optHTML('⚡', o.l, null, o.dits, `cChoisirMoment(${i})`)).join('')}
  </div>`;
}

/* ---------------- le résultat ---------------- */
/* LE MERCREDI VU DU BANC (le propriétaire, 05/10/2026 : « j'ai les mêmes infos que
   quand je suis joueur, en mode entraîneur, pour les coupes et l'Europe »). L'écran de
   résultat du coach appelait `annexeHTML()`, **la fonction du joueur·euse** : mesuré sur
   2 500 écrans de coach, c'était la seule fuite de cette voix-là — mais elle sortait à
   **chaque** match de mercredi, et toujours par la même phrase, « Tu n'étais pas du
   voyage », absurde pour un entraîneur qui y était forcément.
   Ce qu'un coach lit d'un mercredi, ce n'est pas son temps de jeu : c'est **ce que ça
   coûte à samedi** — la rotation qu'il a faite et les jambes qu'il lui reste. */
/* LES BANDES SONT POSÉES LÀ OÙ LES VALEURS PASSENT VRAIMENT, et c'est une mesure.
   Première version écrite à l'estime : `cadres` > 9 / 6 / 3, alors que le onze de
   mercredi compte **5 à 10 cadres** (médiane 8, mesuré sur 371 mercredis) — deux des
   quatre phrases ne seraient jamais sorties, et une bande qui ne sort jamais est de
   la décoration. Même chose pour la fraîcheur : elle va de 0 à 93 avec une médiane à
   36, pas de 30 à 100. */
function cMotMercredi(fr){
  return fr > 78 ? "Le groupe rentre sans trop de dégâts."
    : fr > 58 ? "Ça laisse des jambes, mais samedi reste jouable."
    : fr > 38 ? "Ils reviennent émoussés : samedi partira de plus loin."
    : fr > 18 ? "Ce déplacement se paie. Samedi se jouera sur les nerfs."
    : "Ils rentrent vidés. Samedi, il ne restera rien.";
}
function cAnnexeHTML(a){
  if (!a) return '';
  const tours = a.comp === 'coupe' ? TOURS_COUPE : TOURS_EURO;
  const ton = a.res === 'V' ? 'gagne' : a.res === 'D' ? 'perdu' : '';
  const ico = a.comp === 'coupe' ? '🏅' : '⭐';
  /* Une sauvegarde d'avant ce lot n'a ni `fr` ni `cadres` : on retombe sur les jambes
     du moment et on se tait sur la rotation, plutôt que d'inventer un chiffre. */
  const fr = a.fr == null ? S.grp.fr : a.fr;
  const rot = a.cadres == null ? ''
    : a.cadres >= 9 ? `Tu as sorti le grand jeu : ${a.cadres} de tes onze les plus forts sur le terrain. `
    : a.cadres >= 8 ? `Tu as aligné ${a.cadres} de tes cadres. `
    : a.cadres >= 7 ? `Tu as laissé souffler deux ou trois cadres : ${a.cadres} sur le terrain. `
    : `Tu as fait tourner : ${a.cadres} cadres seulement. `;
  return `<h3>Mercredi — ${COMP_NOM[a.comp]}</h3>
    <div class="bloc ${ton}"><span class="i">${ico}</span><div>
      <h4>${enTeteAnnexe(a, tours)}</h4>
      <p class="narr" style="margin:0">${suiteAnnexeHTML(a)}${esc(rot)}${esc(cMotMercredi(fr))}</p></div></div>`;
}
function ecranCResultat(){
  const m = S.dernier;
  const gauche = m.adv.dom ? S.club.nom : m.adv.nom, droite = m.adv.dom ? m.adv.nom : S.club.nom;
  const score = m.adv.dom ? `${m.bn} – ${m.be}` : `${m.be} – ${m.bn}`;
  const fin = S.journee + 1 >= JOURNEES;
  const ligne = `${m.res === 'V' ? 'Victoire' : m.res === 'N' ? 'Match nul' : 'Défaite'} · ${cPlace()}ᵉ au classement`;
  return `<div class="card">
    <div class="step">${ordinal(S.journee + 1)} journée · terminé</div>
    <div class="score"><span class="big">${score}</span><div><b>${esc(gauche)}</b> – ${esc(droite)}<br><span class="sub">${esc(ligne)}</span></div></div>
    ${cAnnexeHTML(m.annexe)}
    ${m.arret || m.seance ? `<h3>Ta semaine</h3>
      ${m.arret ? `<p class="narr" style="margin-bottom:6px"><b>${esc(m.arret.titre)}</b> — tu as choisi : « ${esc(m.arret.choix)} ».${
        m.arret.suite ? ` ${esc(m.arret.suite)}` : ''}</p>` : ''}
      ${m.seance ? `<p class="narr">${esc(m.seance.texte)}</p>` : ''}` : ''}
    ${m.faits && m.faits.length ? `<h3>Ce que tu as décidé</h3>
      ${m.faits.map(f => `<div class="bloc ${f.ok ? 'gagne' : 'perdu'}"><span class="i">${f.ok ? '✅' : '❌'}</span><div>
        <h4>${f.min}ᵉ · ${esc(f.titre)} — « ${esc(f.choix)} »</h4>
        <p class="narr" style="margin:0">${esc(f.t)}</p></div></div>`).join('')}` : ''}
    <h3>Le film du match</h3>
    <div class="tl">${filmHTML(m)}</div>
    ${m.notes && m.notes.length ? `<h3>Les notes du match</h3>
      <div class="notes">${m.notes.map(j => `<div>
        <span class="p">${j.poste}</span><span>${esc(j.nom)}${faitsHTML(j.f)}${j.min && j.min < 90 ? ` <i>${j.min} min</i>` : ''}</span>
        <span class="n">${virg(j.note)}</span></div>`).join('')}</div>` : ''}
    ${m.reserveVue && m.reserveVue.length ? `<h3>Avec la réserve</h3>
      <div class="notes">${m.reserveVue.map(j => `<div>
        <span class="p">${j.poste}</span><span>${esc(j.nom)}</span>
        <span class="n">${virg(j.note)}</span></div>`).join('')}</div>` : ''}
    ${m.mvt && m.mvt.length ? `<h3>Ce que ça change</h3><div class="mvt">${m.mvt.map(x =>
      `<div><span class="${x.up ? 'up' : 'dn'}">${CLIEN_ICO[x.k] || LIEN_ICO[x.k] || '•'}</span><span>${esc(x.mot)}</span></div>`).join('')}</div>` : ''}
    <div class="btn-row"><button class="btn" onclick="cApresMatch()">${fin ? "Le bilan de la saison" : "La semaine suivante"}</button></div>
  </div>
  ${classementHTML()}${liensJournal()}`;
}

/* ---------------- le bilan : le temps où l'on souffle ---------------- */
/* « La fin de saison est un écran-bilan — réussites, échecs, qui veut partir, qui
   veut rester, le club, le président, les supporters — pas une liste de plus »
   (le propriétaire, 21/09/2026). C'était la meilleure page de la 1.0. */
function ecranCBilan(){
  const b = S.bilan, ves = b.vestiaire;
  const ton = b.descente ? 'perdu' : b.montee || b.pos === 1 || b.atteint ? 'gagne' : '';
  return `<div class="card no-sticky">
    <div class="step">${S.annee}-${S.annee + 1} · ${esc(S.club.nom)} · c'est fini</div>
    <div class="big-ico">${b.pos === 1 ? '🏆' : b.descente ? '🪜' : b.atteint ? '✅' : '📉'}</div>
    <h2>${b.pos}ᵉ de ${esc(nomDivision(b.division))}</h2>
    <p class="narr">${b.atteint ? `L'objectif était ${b.objectif}ᵉ. Il est tenu.`
      : `L'objectif était ${b.objectif}ᵉ. Il ne l'est pas.`}${
      b.descente ? ` <b>Vous descendez.</b>` : b.montee ? ` <b>Vous montez.</b>` : ''}</p>
    <div class="stats">
      <div><div class="v">${b.v}</div><div class="k">victoires</div></div>
      <div><div class="v">${b.n}</div><div class="k">nuls</div></div>
      <div><div class="v">${b.dd}</div><div class="k">défaites</div></div>
      <div><div class="v">${b.bp}–${b.bc}</div><div class="k">buts</div></div>
      <div><div class="v">${b.decisions}</div><div class="k">décisions</div></div>
    </div>
    <div class="bloc ${ton}"><span class="i">🏛️</span><div><h4>Le président</h4>
      <p class="narr" style="margin:0">${esc(b.phrase)} <i>${esc(cDire('president'))}</i></p></div></div>
    ${b.ambition ? `<div class="bloc ${b.ambition.ok === true ? 'gagne' : b.ambition.ok === false ? 'perdu' : ''}">
      <span class="i">🎯</span><div><h4>Ce que tu étais venu chercher</h4>
      <p class="narr" style="margin:0">${esc(b.ambition.t)}</p></div></div>` : ''}
    ${(S.coupe.gagnee || S.euro.gagnee || (S.coupe.hist || []).length) ? `
      <div class="bloc ${S.coupe.gagnee || S.euro.gagnee ? 'gagne' : ''}"><span class="i">🏅</span><div><h4>Les coupes</h4>
        <p class="narr" style="margin:0">${[
          S.coupe.gagnee ? `<b>Vous gagnez la Coupe.</b>`
            : S.coupe.hist.length ? `Coupe : éliminés ${TOURS_COUPE[S.coupe.hist[S.coupe.hist.length - 1].t]}.` : '',
          S.euro.gagnee ? `<b>Et l'Europe.</b>`
            : S.euro.engage ? (S.euro.hist.length > 6
                ? `Europe : éliminés ${TOURS_EURO[S.euro.hist[S.euro.hist.length - 1].t]}.`
                : `Europe : sortis en phase de groupes.`) : ''
        ].filter(Boolean).join(' ')}</p></div></div>` : ''}
    <h3>Le film de l'année</h3>
    ${b.grand ? `<div class="bloc"><span class="i">⭐</span><div><h4>Le dernier soir</h4>
      <p class="narr" style="margin:0">${esc(b.grand)}</p></div></div>` : ''}
    ${b.oubli ? `<div class="bloc perdu"><span class="i">🌧️</span><div><h4>Le soir qu'on oublie</h4>
      <p class="narr" style="margin:0">${esc(b.oubli)}</p></div></div>` : ''}
    <h3>Le vestiaire</h3>
    ${ves.grandi ? `<div class="bloc gagne"><span class="i">🌱</span><div><h4>Il a grandi</h4>
      <p class="narr" style="margin:0">${esc(ves.grandi.nom)}, ${ves.grandi.age} ans, ${ves.grandi.nb} matchs${
        ves.grandi.moy == null ? '' : ` à ${virg(ves.grandi.moy)} de moyenne`}.</p></div></div>` : ''}
    ${ves.reste ? `<div class="bloc"><span class="i">⚓</span><div><h4>Celui sur qui tu as construit</h4>
      <p class="narr" style="margin:0">${esc(ves.reste.nom)} : ${ves.reste.nb} matchs${
        ves.reste.moy == null ? '' : `, ${virg(ves.reste.moy)} de moyenne`}.</p></div></div>` : ''}
    ${ves.part ? `<div class="bloc perdu"><span class="i">🚪</span><div><h4>Celui qui veut partir</h4>
      <p class="narr" style="margin:0">${esc(ves.part.nom)}, ${ves.part.age} ans, ${ves.part.nb} match${ves.part.nb > 1 ? 's' : ''}. Il n'attendra pas une saison de plus.</p></div></div>` : ''}
    ${(S.vie && (S.vie.chantiers || []).length) ? `<div class="bloc"><span class="i">🏡</span><div>
      <h4>En dehors du terrain</h4><p class="narr" style="margin:0">${(S.vie.chantiers || []).map(x =>
        esc(x.nom) + (x.coule ? ' (a coulé)' : '')).join(' · ')}. <i>${esc(direProches())}</i></p></div></div>` : ''}
    ${cCarriereHTML()}
    <div class="btn-row"><button class="btn ghost" onclick="ouvrirJournal()">📓 Le journal</button>
      <button class="btn" onclick="cOuvrirEte()">L'été →</button></div>
  </div>
  ${effectifHTML()}${classementHTML()}`;
}
function cCarriereHTML(){
  const c = S.carriere; if (!c || !c.annees.length) return '';
  return `<details class="fold"><summary>Ton parcours</summary><div class="notes">
    ${c.annees.map(a => `<div><span class="p">${String(a.annee).slice(2)}</span>
      <span>${esc(a.club)} <i>${a.v}V ${a.n}N ${a.d}D · objectif ${a.objectif}ᵉ</i>${a.pos === 1 && a.div === 1 ? ' 🏆' : ''}${a.coupe ? ' 🏅' : ''}${a.euro ? ' ⭐' : ''}</span>
      <span class="n">${a.pos}ᵉ</span></div>`).join('')}
  </div><p class="sub">${c.saisons} saison${c.saisons > 1 ? 's' : ''} · ${c.titres} titre${c.titres > 1 ? 's' : ''} · ${c.coupes} coupe${c.coupes > 1 ? 's' : ''} · ${c.virages || 0} fois remercié${(c.virages || 0) > 1 ? '' : ''}.</p></details>`;
}

/* ---------------- la porte ---------------- */
/* C'EST LE « NE PAS JOUER » DE L'ENTRAÎNEUR·EUSE, et donc la vraie tension du mode.
   Le propriétaire avait fait fermer l'impasse côté joueur·euse le 27/09 (« je sais
   pas trop quoi faire pour entrer dedans ») : ici l'impasse doit **exister** — mais
   elle a une sortie, et c'est le marché des entraîneurs. */
function ecranCVire(){
  return `<div class="card">
    <div class="step">${S.annee}-${S.annee + 1} · ${S.vire.journee}ᵉ journée</div>
    <div class="big-ico">🚪</div>
    <h2>On te remercie</h2>
    <p class="narr">${esc(S.club.nom)} ${S.vire.place}ᵉ, et un communiqué de huit lignes. Tu rends les clés du centre
      un mardi matin, et personne ne descend du bureau.</p>
    <div class="bloc perdu"><span class="i">🏛️</span><div><h4>Le président</h4>
      <p class="narr" style="margin:0">« On a fait ce qu'il fallait faire. Je ne dirai rien de plus. »</p></div></div>
    <p class="narr">${S.liens.presse > 56
      ? `La presse n'a pas chargé. C'est ce qui fera qu'un téléphone sonnera.`
      : `Personne n'a pris ta défense. Ça va se sentir cet été.`}</p>
    <div class="btn-row"><button class="btn ghost" onclick="ouvrirJournal()">📓 Le journal</button>
      <button class="btn" onclick="cApresVirage()">La suite →</button></div>
  </div>${cCarriereHTML()}`;
}

/* ---------------- les offres ---------------- */
function ecranCOffres(){
  const o = cOffreCourante();
  if (!o) return `<div class="card">
    <div class="step">L'été</div><div class="big-ico">📵</div>
    <h2>Le téléphone ne sonne pas</h2>
    <p class="narr">Tu as regardé la préparation des autres à la télévision.</p>
    <div class="btn-row"><button class="btn" onclick="cFinCarriere('personne n\'a rappelé')">Voir ce qu'il restera</button></div>
  </div>`;
  const reste = (S.offres || []).length - (S.offreIdx || 0) - 1;
  return `<div class="card">
    <div class="step">L'été · une proposition</div>
    <div class="big-ico">📞</div>
    <h2>${o.pays ? (PAYS[o.pays] || {}).dr + ' ' : ''}${esc(o.nom)}</h2>
    <p class="narr">${esc(cMotClub(o))} ${esc(cMotObjectif(o))}</p>
    ${o.pays ? `<p class="narr" style="border-left:3px solid var(--gold-dim);padding-left:10px">
      <b>Changer de pays.</b> Tu entraînerais ${esc(nomChampionnat(o.pays, S.annee))} ·
      le vestiaire, la direction et la presse sont à refaire · les tiens restent ici.</p>` : ''}
    <div class="sit">
      ${celSit('🪜', "La division", o.pays ? nomChampionnat(o.pays, S.annee) : nomDivision(o.division), 'd', null)}
      ${celSit('📋', "Ce qu'on te demande", `${o.objectif}ᵉ, et ils le disent maintenant.`, 'o', null)}
      ${celSit('💰', "Le contrat", `${sous(o.salaire)} par an, ${o.ans} an${o.ans > 1 ? 's' : ''}.`, 's', null)}
      ${celSit('🧱', "L'effectif", cMotEffectif(o), 'e', null)}
    </div>
    <p class="sub">${S.libre ? `Tu es libre. ${reste > 0 ? `Il reste quelque chose derrière, tu ne sais pas quoi.` : `C'est peut-être la dernière.`}`
      : `Tu as encore un banc. Refuser, c'est y rester.`}</p>
    <div class="btn-row">
      ${S.libre ? `<button class="btn ghost" onclick="cPasserOffre()">Refuser</button>`
        : `<button class="btn ghost" onclick="cResterAuClub()">Rester à ${esc(S.club.nom)}</button>`}
      <button class="btn" onclick="cSignerOffre()">Signer</button></div>
    ${raccrocherHTML('cRaccrocher')}
  </div>${liensJournal()}`;
}
function cMotClub(o){
  const d = o.force - S.club.force;
  return d > 6 ? `Un cran au-dessus de ce que tu as entre les mains aujourd'hui.`
    : d > 2 ? `Un peu mieux armé que ton groupe actuel.`
    : d > -3 ? `À peu près le même niveau de groupe que chez toi.`
    : `Moins bien armé. Ce serait un chantier.`;
}
function cMotObjectif(o){
  return o.objectif <= 1 ? `Et on te demandera le titre.`
    : o.objectif <= 3 ? `On te demandera le podium.`
    : o.objectif <= 8 ? `On te demandera la première moitié de tableau.`
    : `On te demandera surtout de ne pas descendre.`;
}
function cMotEffectif(o){
  const e = toutesLesEquipes().find(x => x.nom === o.nom);
  if (!e || !e.sq) return '—';
  const jeunes = e.sq.filter(j => j.a <= 22).length, vieux = e.sq.filter(j => j.a >= 32).length;
  return jeunes >= 7 ? `Un groupe très jeune : tout est à construire.`
    : vieux >= 6 ? `Un groupe vieillissant : ça va falloir reconstruire vite.`
    : `Un groupe équilibré, ni jeune ni vieux.`;
}

/* ---------------- le mercato, vu du banc ---------------- */
/* ================== LE MERCATO, L'ÉCRAN ==================
   Sur la structure de la coquille validée (`v2/coquilles.html`, `V.coach.mercato`) :
   la situation en haut, **un dossier à la fois**, ce qui bloque écrit au centime avec
   la vente qui suffirait, et l'effectif complet sous la carte pour vendre.
   UNE SEULE CHOSE CHANGE PAR RAPPORT À LA MAQUETTE, et c'est un verrou du 2.0 : la
   coquille affichait « Niveau 6,4 », or aucune valeur de jauge n'arrive à l'écran ici.
   Le niveau d'un dossier se lit donc **en mots**, comparé à ton onze (`cMotNiveau`) —
   l'argent, l'âge et les moyennes de match restent chiffrés, comme partout. */
/* « A et B et C » n'est pas du français : des virgules, et un seul « et ». */
function etListe(l){
  if (l.length <= 1) return l[0] || '';
  return l.slice(0, -1).join(', ') + ' et ' + l[l.length - 1];
}
function cSousTitreDossier(x){
  const po = POSTES.find(p => p.id === x.poste);
  const d = [po ? po.nom : x.poste, `${x.age} ans`];
  if (x.de) d.push(`${x.de}${x.div && x.div !== (S.division || 1) ? ` (${abrDivision(x.div)})` : ''}`);
  else if (x.cle === 'centre') d.push("ton centre de formation");
  else if (x.cle === 'libre') d.push(x.age >= 29 ? "libre, son club ne l'a pas prolongé" : "libre, on l'a laissé partir");
  else if (x.cle === 'ds') d.push("le dossier du directeur sportif");
  else d.push("de l'étranger");
  return d.join(' · ');
}
function cDossierHTML(){
  const m = S.marche, x = cCibleCourante();
  if (!x) return `<p class="narr">Plus un dossier sur la table. Ce que tu as, tu le gardes.</p>`;
  const blo = cBlocages(x);
  const ventes = cVentesQuiSuffisent(x);
  const apres = Math.round((m.budget - x.prix) * 1000) / 1000;
  const miens = (S.equipe || []).filter(j => j.poste === x.poste).sort((a, b) => b.niv - a.niv)
    .slice(0, 3).map(j => esc(j.nom)).join(' · ');
  return `<div class="hdr" style="margin-top:16px"><div class="t">${esc(x.nom)}</div>
      <div class="m">${esc(cSousTitreDossier(x))}</div></div>
    <div class="pills"><i class="pill foot">${esc(cMotNiveau(x))}</i>${cMotPotentiel(x)
      ? `<i class="pill neutre">${esc(cMotPotentiel(x))}</i>` : ''}${x.cle === 'centre'
      ? `<i class="pill vie">Il sort de chez toi, et il est libre</i>` : ''}${x.cle === 'libre'
      ? `<i class="pill vie">Aucune indemnité \u2014 mais il se paie sur le salaire</i>` : ''}${x.cle === 'ds'
      ? `<i class="pill vie">Celui que tu as accepté de porter en cours de saison</i>` : ''}</div>
    <div class="sheet">
      <div><span class="l">Indemnité de transfert</span><span class="v money">${x.prix ? esc(sous(x.prix)) : 'libre'}</span></div>
      <div><span class="l">Son salaire</span><span class="v money">${esc(sous(x.sal))} par an</span></div>
      <div><span class="l">Ton budget après l'achat</span><span class="v money">${apres < 0 ? '− ' : ''}${esc(sous(Math.abs(apres)))}</span></div>
      ${miens ? `<div><span class="l">À son poste, tu as</span><span class="v">${miens}</span></div>` : ''}
    </div>
    ${blo.length ? `<div class="lack">⛔ <b>${esc(blo[0])}</b>${blo.slice(1).map(b => ` ${esc(b)}`).join('')}
      ${ventes.length ? `<br><span class="sub">Vendre ${ventes.map(v =>
        `${esc(v.j.nom)} (+ ${esc(sous(v.prix))})`).join(' ou ')} suffirait.</span>`
        : `<br><span class="sub">Aucune vente ne suffirait : ce dossier n'est pas pour cet été.</span>`}</div>` : ''}
    <div class="row" style="margin-top:10px">
      <button class="opt" style="flex:1" onclick="cCiblePrecedente()" ${m.idx ? '' : 'disabled'}><span class="ico">⬅️</span><span><b>Précédent</b></span></button>
      <button class="opt" style="flex:1" onclick="cRecruter()" ${blo.length ? 'disabled' : ''}><span class="ico">✍️</span><span><b>Recruter</b></span></button>
      <button class="opt" style="flex:1" onclick="cCibleSuivante()" ${m.idx < m.deck.length - 1 ? '' : 'disabled'}><span class="ico">➡️</span><span><b>Passer</b></span></button>
    </div>`;
}
/* L'effectif complet, pour vendre. C'est là qu'il choisit qui part (demande du
   propriétaire sur la 1.0 : « c'est là que je choisis qui vendre »). On ne propose le
   bouton que quand la vente est **possible** — jamais descendre sous le onze. */
/* TRIER LA COLONNE, PAS UNE PASTILLE (le propriétaire, 05/10/2026 : « des fois j'ai
   besoin de trier par poste, des fois par note, des fois par valeur marchande ; c'est
   cool si on peut appuyer sur la colonne et ça permet de la trier dans un sens ou dans
   l'autre »). Les pastilles de l'effectif répondaient à la moitié de sa demande, sur
   l'écran de la semaine ; **ici** il y a de vraies colonnes, et c'est l'écran où il
   choisit qui vendre — donc c'est là qu'il l'avait demandé, et c'est la colonne qu'on
   appuie. Son état vit hors de la sauvegarde, comme `triEff` : c'est une façon de
   regarder, pas une donnée de carrière. */
const ORDRE_POSTE = { G:0, D:1, M:2, A:3 };
let triVendre = { cle:'moy', sens:-1 };
/* `sens` −1 = du plus grand au plus petit, comme les pastilles de l'effectif. Pour le
   poste on trie sur l'ordre du terrain (gardien d'abord) et non sur la lettre, sinon
   on lirait A · D · G · M. */
const TRIS_VENDRE = [
  { cle:'poste', nom:"Poste",   v: x => -(ORDRE_POSTE[x.poste] || 0) },
  { cle:'nom',   nom:"Joueur",  v: x => x.nom, txt:true },
  { cle:'age',   nom:"Âge",     v: x => x.age },
  { cle:'moy',   nom:"Moy.",    r:true, v: x => x.moy == null ? -1 : x.moy },
  { cle:'sal',   nom:"Salaire", r:true, v: x => x.sal },
  { cle:'val',   nom:"Valeur",  r:true, v: x => x.val },
];
function cTrierVendre(cle){
  if (triVendre.cle === cle) triVendre.sens = -triVendre.sens;
  else triVendre = { cle, sens:-1 };
  rendre();
}
function cVendreHTML(){
  /* On fabrique la ligne une fois — salaire et valeur comprise — pour que le tri lise
     exactement les nombres affichés. La valeur est celle d'une vente (×.9), celle que
     `cVendre()` te créditera. */
  const l = effectifTrie().map(x => {
    const j = (S.equipe || []).find(y => y.nom === x.nom);
    return j ? Object.assign({}, x, { j, sal: cSalDe(j),
      val: Math.round(cValeur(j.niv, j.age) * .9 * 1000) / 1000 }) : null;
  }).filter(Boolean);
  const t = TRIS_VENDRE.find(x => x.cle === triVendre.cle) || TRIS_VENDRE[3];
  l.sort((a, b) => t.txt
    ? String(t.v(a)).localeCompare(String(t.v(b)), 'fr') * -triVendre.sens
    : (t.v(b) - t.v(a)) * -triVendre.sens);
  const th = c => `<th${c.r ? ' class="r"' : ''}><button class="thtri${
    triVendre.cle === c.cle ? ' on' : ''}" onclick="cTrierVendre('${c.cle}')">${esc(c.nom)}${
    triVendre.cle === c.cle ? (triVendre.sens < 0 ? ' \u2193' : ' \u2191') : ''}</button></th>`;
  return `<div class="card no-sticky"><h3>Ton effectif · vends ici pour libérer du budget ou de la place</h3>
    <div class="scrollx"><table class="sq">
      <thead><tr>${TRIS_VENDRE.map(th).join('')}<th></th></tr></thead>
      <tbody>${l.map(x => {
        const j = x.j;
        const peut = (S.equipe || []).filter(y => y.poste === j.poste).length > FORMATION[j.poste];
        return `<tr><td><span class="pos">${esc(j.poste)}</span></td>
          <td>${esc(j.nom)}${j.recrue ? ' <i class="sub">recrue</i>' : ''}</td>
          <td>${j.age}</td><td class="r">${x.moy == null ? '—' : virg(x.moy)}</td>
          <td class="r money">${esc(sous(x.sal))}</td>
          <td class="r money">${esc(sous(x.val))}</td>
          <td class="r">${peut ? `<button class="mini" onclick="cVendre('${j.nom.replace(/'/g, "\\'")}')">Vendre</button>`
            : `<span class="sub">le onze</span>`}</td></tr>`;
      }).join('')}</tbody>
    </table></div>
    <p class="sub">Appuie sur une colonne pour trier, une deuxième fois pour renverser le sens.
      Les montants sont exacts : rien n'est arrondi. Vendre un titulaire casse sa ligne — pas un remplaçant.</p>
  </div>`;
}
function ecranCMercato(){
  const m = S.marche;
  /* Une sauvegarde d'avant ce lot peut arriver ici sans fenêtre ouverte : on la lui
     ouvre plutôt que de rendre un écran vide. */
  if (!m){ cOuvrirMercato(false); return ''; }
  const masse = cMasse(), plafond = cPlafond();
  const part = Math.min(140, Math.round(masse / plafond * 100));
  const reste = Math.round((plafond - masse) * 1000) / 1000;
  const mien = (S.mercatoVu || []).filter(x => x.de === S.club.nom);
  /* QUI SONT CES JOUEURS QUI ARRIVENT TOUT SEULS. Le centre comble les départs que tu
     n'as pas décidés ; sans cette ligne, un inconnu apparaissait dans ton effectif. */
  const duCentre = (S.mercatoVu || []).filter(x => x.centre && x.vers === S.club.nom);
  return `<div class="card no-sticky">
    <div class="step">Mercato ${m.hiver ? "d'hiver" : "d'été"} · ${esc(S.club.nom)}${m.deck.length
      ? ` · dossier ${m.idx + 1} sur ${m.deck.length}` : ''}</div>
    <div class="sheet" style="margin-top:0">
      <div><span class="l">Budget de transfert</span><span class="v money">${esc(sous(m.budget))}${
        m.vendu ? `<i class="sub"> dont ${esc(sous(m.vendu))} des d\u00e9parts</i>` : ''}</span></div>${
      m.venduBrut ? `<div><span class="l">Ce que le club a gard\u00e9</span><span class="v money">${
        esc(sous(Math.round((m.venduBrut - m.vendu) * 1000) / 1000))} <i class="sub">sur ${esc(sous(m.venduBrut))}</i></span></div>` : ''}
      <div><span class="l">Masse salariale</span><span class="v money">${esc(sous(masse))} / ${esc(sous(plafond))}</span></div>
      <div><span class="l">Effectif</span><span class="v">${(S.equipe || []).length} joueurs / ${C_CAP_EFFECTIF}</span></div>
      <div><span class="l">Ce que ton réseau a sorti</span><span class="v">${m.deck.length} dossier${
        m.deck.length > 1 ? 's' : ''}<i class="sub" style="display:block">${esc(cMotRelais())}</i></span></div>
    </div>
    <div class="bar"><i class="${part > 100 ? 'hot' : ''}" style="width:${Math.min(100, part)}%"></i></div>
    <p class="sub">${reste > 0
      ? `Il te reste ${esc(sous(reste))} de masse salariale avant le plafond.`
      : `Tu es au-dessus du plafond de ${esc(sous(-reste))}. Le président compte les journées.`}</p>
    ${mien.length ? `<div class="lack"><b>On est venu te prendre ${mien.length === 1 ? 'un joueur' : `${mien.length} joueurs`}${
      m.vendu ? ` \u2014 ${esc(sous(m.vendu))} dans le budget` : ''}.</b>
      <span class="sub">${mien.map(x => `${esc(x.nom)} \u2192 ${esc(x.vers || "l'\u00e9tranger")}`).join(' \u00b7 ')}</span>${
      m.venduPart ? `<span class="sub">Le club en garde ${Math.round((1 - m.venduPart) * 100)} % \u2014 ${
        m.venduPart >= .86 ? "ils te laissent la main" : m.venduPart >= .74
        ? "la part habituelle" : "ils gardent large, et tu sais pourquoi"}.</span>` : ''}${
      (S.equipe || []).length < C_CAP_EFFECTIF ? `<span class="sub">${
        C_CAP_EFFECTIF - S.equipe.length === 1 ? "Une place est rest\u00e9e libre dans ton groupe"
        : `${C_CAP_EFFECTIF - S.equipe.length} places sont rest\u00e9es libres dans ton groupe`} \u2014 \u00e0 toi de ${
        C_CAP_EFFECTIF - S.equipe.length === 1 ? 'la' : 'les'} remplir, avec l'argent des d\u00e9parts.</span>` : ''}${
      duCentre.length ? `<span class="sub">${duCentre.length === 1
        ? `${esc(duCentre[0].nom)}, ${duCentre[0].age} ans, est mont\u00e9 du centre pour prendre la place.`
        : `${esc(etListe(duCentre.map(x => `${x.nom} (${x.age} ans)`)))} sont mont\u00e9s du centre pour prendre les places.`}</span>` : ''}</div>` : ''}
    ${cDossierHTML()}
    ${(m.in || []).length ? `<h3>Tes recrues</h3>${mvtHTML(m.in, 'in')}` : ''}
    ${(m.out || []).length ? `<h3>Tes départs</h3>${mvtHTML(m.out.map(o => ({ ...o, de: S.club.nom })), 'out')}` : ''}
    ${!(m.in || []).length && !(m.out || []).length
      ? `<p class="sub">Tu n'as encore rien fait. Ne rien faire est une décision aussi — mais on te la reprochera si le groupe ne tient pas.</p>` : ''}
    ${(S.mercatoVu || []).filter(x => !x.centre && x.de !== S.club.nom && x.vers !== S.club.nom).length
      ? `<details class="fold"><summary>Le mercato des autres</summary><div class="mvts">${
        (S.mercatoVu || []).filter(x => !x.centre && x.de !== S.club.nom && x.vers !== S.club.nom).slice(0, 25)
        .map(x => `<div><span class="i">🔁</span><span><b>${esc(x.nom)}</b>
          <i>${x.age} ans — ${esc(x.de)} → ${esc(x.vers || "l'étranger")}</i></span></div>`).join('')}</div></details>` : ''}
    <div class="btn-row"><button class="btn" onclick="cFermerMercato()">Fermer le mercato →</button></div>
  </div>
  ${cVendreHTML()}${classementHTML()}`;
}

/* ---------------- la fin du parcours ---------------- */
/* ---------------- la vie, et l'argent ---------------- */
/* LE DERNIER TEMPS DE L'INTERSAISON, et le seul qui ne parle pas de football —
   l'ordre est celui du mode joueur·euse : le bilan, l'été, les offres, le mercato,
   **puis** toi. Jusqu'ici l'entraîneur·euse avait un salaire que personne ne lui
   versait et des proches qu'un seul arrêt touchait : il gagne maintenant sa saison,
   et il en fait quelque chose.
   Les chiffres d'argent sont permis à l'écran — ce ne sont pas des jauges, et chacun
   a sa conséquence : un chantier se paie, et un chantier laisse une trace. */
/* LA PRÉPARATION. Un écran qui ne ressemble à aucun autre : pas de classement, pas
   d'effectif, pas d'adversaire — six semaines et une seule décision, et ce qu'elle
   laisse se lit sur l'état du groupe en août. */
function ecranCPrepa(){
  const f = !!S.prepa;
  return `<div class="card">
    <div class="step">Pr\u00e9paration \u00b7 \u00e9t\u00e9 ${S.annee} \u00b7 ${esc(S.club.nom)}</div>
    <div class="big-ico">${f ? esc((CPREPA.find(x => x.id === S.prepa.id) || {}).ico || '\u2705') : '\ud83c\udfd5\ufe0f'}</div>
    <h2>${f ? esc(S.prepa.nom) : "Six semaines avant la premi\u00e8re journ\u00e9e"}</h2>
    <p class="narr">${f ? esc(S.prepaSuite || '')
      : `Le groupe est au complet, le calendrier est tomb\u00e9, et personne n'a encore jou\u00e9. Ce que tu
         fais de ces six semaines, tu le porteras jusqu'en mai.`}</p>
    <div class="sit">${celSit('\ud83e\udec1', "Les jambes du groupe", cDireJambes(), 'jambes',
      "C'est ce que tu d\u00e9penses chaque semaine, et la seule chose qu'un calendrier charg\u00e9 ne pardonne pas.")}
      ${celSit('\ud83c\udfcb\ufe0f', "La condition", cDireCondition(), 'condition',
      "Elle d\u00e9cide de la vitesse \u00e0 laquelle ils r\u00e9cup\u00e8rent, et elle s'en va si on ne l'entretient pas.")}</div>
    ${f ? `<div class="btn-row"><button class="btn ghost" onclick="ouvrirJournal()">\ud83d\udcd3 Le journal</button>
        <button class="btn" onclick="cFinirPrepa()">La premi\u00e8re journ\u00e9e \u2192</button></div>`
      : `<h3>Ce que tu fais de l'\u00e9t\u00e9</h3>
        ${CPREPA.map(x => optHTML(x.ico, x.nom, x.sous, x.dits, `cChoisirPrepa('${x.id}')`)).join('')}`}
  </div>`;
}
function ecranCVie(){
  const v = S.vie || { chantiers:[] };
  const fait = !!v.fait;
  const dispo = cChantiersDispos();
  const primes = v.primes || [];
  const traces = v.chantiers || [];
  return `<div class="card no-sticky">
    <div class="step">Été ${S.annee} · ${S.moi.age} ans · en dehors du terrain</div>
    <div class="big-ico">${fait ? '🤝' : '🏡'}</div>
    <h2>${fait ? esc(v.fait.nom) : "Ce que tu fais de tout ça"}</h2>
    <p class="narr">${fait ? esc(v.suite)
      : "Six semaines sans match, un compte qui a grossi, et des gens qui ont déménagé pour toi sans rien demander."}</p>
    <div class="stats">
      <div><div class="v">${esc(sous(v.gagne || 0))}</div><div class="k">cette saison</div></div>
      <div><div class="v">${esc(sous(S.argent || 0))}</div><div class="k">de côté</div></div>
      <div><div class="v">${traces.length}</div><div class="k">construit</div></div>
    </div>
    ${primes.length ? `<p class="sub">Dont les primes : ${esc(primes.join(', '))}.</p>` : ''}
    <div class="sit">${celSit('🏡', "Les tiens", direProches(), 'proches',
      "C'est ce qu'un vestiaire te coûte, et ce que personne ne te rend à ta place.")}</div>
    ${traces.length ? `<h3>Ce que tu as déjà construit</h3>
      <div class="mvts">${traces.map(c => `<div class="in"><span class="i">${
        esc((CCHANTIERS.find(x => x.id === c.id) || {}).ico || '✅')}</span>
        <span><b>${esc(c.nom)}</b> <i>${c.annee ? `depuis ${c.annee}` : ''}${c.coule ? ' — a coulé' : ''}</i></span></div>`).join('')}</div>` : ''}
    ${fait ? `<div class="btn-row"><button class="btn ghost" onclick="ouvrirJournal()">📓 Le journal</button>
        <button class="btn" onclick="cFinirVie()">La saison qui vient →</button></div>`
      : `${dispo.length ? `<h3>Construire quelque chose</h3>
          ${dispo.map(c => optHTML(c.ico, c.nom, `${c.sub} — ${esc(sous(coutChantier(c)))}`,
            c.dit, `cChoisirVie('${c.id}')`)).join('')}` : ''}
        <h3>Ou simplement cette année</h3>
        ${CVIE_CHOIX.map(c => optHTML(c.ico, c.nom, c.sub, c.dit, `cChoisirVie('${c.id}')`)).join('')}`}
  </div>`;
}
/* CE QU'IL RESTE QUAND LE BANC S'ARRÊTE : le même bloc que côté joueur·euse, parce
   que c'est la même question — une carrière doit laisser une trace. */
function cVieFinaleHTML(){
  const v = S.vie || { chantiers:[] };
  const traces = (v.chantiers || []).filter(x => !x.coule);
  return `<div class="bloc ${traces.length ? 'gagne' : ''}"><span class="i">🏡</span><div>
    <h4>Ce que tu laisses</h4>
    ${traces.length ? `<div class="mvts" style="margin:0 0 6px">${traces.map(x => `<div class="in">
      <span class="i">${esc((CCHANTIERS.find(y => y.id === x.id) || {}).ico || '✅')}</span>
      <span><b>${esc(x.nom)}</b> <i>${esc(x.trace || '')}</i></span></div>`).join('')}</div>`
      : `<p class="narr" style="margin:0 0 6px">Des feuilles de match, et c'est tout.</p>`}
    <p class="sub" style="margin:0">${esc(sous(S.argent || 0))} de côté · ${esc(direProches())}</p>
  </div></div>`;
}
function ecranCCarriere(){
  const c = S.carriere || { saisons:0, clubs:[], annees:[], titres:0, coupes:0, europes:0, montees:0, virages:0 };
  return `<div class="card no-sticky">
    <div class="step">${S.annee} · ${S.moi.age} ans · c'est fini</div>
    <div class="big-ico">🏁</div>
    <h2>Ce qu'il restera</h2>
    <p class="narr">${esc(S.fin && S.fin.raison === 'tu as raccroché'
      ? "Tu as rendu le survêtement au moment que tu avais choisi. Peu de bancs se quittent comme ça."
      : S.fin && S.fin.raison === "personne n'a rappelé"
      ? "Personne n'a rappelé. Un banc ne se reprend pas quand on veut."
      : "Tu as fait le tour.")}</p>
    <div class="stats">
      <div><div class="v">${c.saisons}</div><div class="k">saisons</div></div>
      <div><div class="v">${c.clubs.length}</div><div class="k">clubs</div></div>
      <div><div class="v">${c.titres}</div><div class="k">titres</div></div>
      <div><div class="v">${c.coupes}+${c.europes}</div><div class="k">coupes</div></div>
      <div><div class="v">${c.virages || 0}</div><div class="k">fois remercié</div></div>
    </div>
    ${cVieFinaleHTML()}
    ${cCarriereHTML()}
    <p class="sub">Les clubs : ${esc(c.clubs.join(', ')) || '—'}.</p>
    ${(c.pays || []).length > 1 ? `<p class="sub">Les pays : ${(c.pays || [])
      .map(p => `${(PAYS[p] || {}).dr || ''} ${esc(nomPays(p).replace(/^(la |l')/, ''))}`).join(' · ')}.</p>` : ''}
    <div class="btn-row"><button class="btn ghost" onclick="ouvrirJournal()">📓 Le journal</button>
      <button class="btn" onclick="recommencer()">Un autre parcours</button></div>
  </div>`;
}

/* ---------------- la création d'un entraîneur·euse ---------------- */
function cCreationHTML(){
  if (ETAPE === 0) return `<div class="card">
    <div class="step">Création · étape 1 sur 3</div>
    <h2>Qui tu es, et quand</h2>
    <p class="narr">Un nom, une époque. Le club, on te le donnera — et ce ne sera pas le meilleur.</p>
    <h3>Ton nom</h3>
    <input id="nom" class="txt" placeholder="Ton nom" value="${esc(NEW.nom)}" maxlength="24">
    <h3>Ton époque</h3>
    ${ANNEES.map(e => `<button class="opt${NEW.annee === e.a ? ' on' : ''}" onclick="setAnnee(${e.a})"><span class="ico">${e.ico}</span><span><b>${e.nom}</b><span class="sub">${esc(e.sub)}</span></span></button>`).join('')}
    <div class="btn-row"><button class="btn ghost" onclick="etape(-1)">Retour</button>
      <button class="btn" onclick="etape(1)">Continuer</button></div>
  </div>`;
  if (ETAPE === 1) return `<div class="card">
    <div class="step">Création · étape 2 sur 3</div>
    <h2>D'où tu viens</h2>
    <p class="narr">Un entraîneur·euse arrive toujours de quelque part, et le vestiaire le sait avant toi.</p>
    ${CORIGINES.map((o, i) => optHTML('📋', o.nom, o.sous, cOrigineDit(o), `cSetOrigine(${i})`)).join('')}
    <div class="btn-row"><button class="btn ghost" onclick="etape(0)">Retour</button></div>
    <p class="sub">Une qualité et un défaut seront tirés au sort : tu ne les choisis pas, et ils te tiendront tout le parcours.</p>
  </div>`;
  return `<div class="card">
    <div class="step">Création · étape 3 sur 3</div>
    <h2>Ce que tu es venu faire</h2>
    <p class="narr">C'est là-dessus que tu te jugeras en juin, même si le président juge autre chose.</p>
    ${CAMBITIONS.map((a, i) => optHTML('🎯', a.nom, a.sous, null, `cSetAmbition(${i})`)).join('')}
    <div class="btn-row"><button class="btn ghost" onclick="etape(1)">Retour</button></div>
  </div>`;
}
function cOrigineDit(o){
  const d = [];
  Object.entries(o.axes).forEach(([a, v]) => d.push({ c: v > 0 ? 'foot' : 'risk', t: `${v > 0 ? '▲' : '▼'} ${CAXE_NOM[a]}` }));
  Object.entries(o.liens || {}).forEach(([k, v]) => d.push({ c: v > 0 ? 'foot' : 'risk', t: `${v > 0 ? '▲' : '▼'} ${CLIEN_NOM[k] || k}` }));
  return d;
}
function cSetOrigine(i){ NEW.origine = CORIGINES[i]; ETAPE = 2; rendre(); }
function cSetAmbition(i){
  NEW.ambition = CAMBITIONS[i];
  if (!NEW.nom) NEW.nom = "Le coach";
  cNouvellePartie({ nom:NEW.nom, annee:NEW.annee, origine:NEW.origine, ambition:NEW.ambition });
  rendre();
}
