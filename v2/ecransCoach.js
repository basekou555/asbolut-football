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
    cmercato:"Mercato", ccarriere:"Fin du parcours" }[S.ecran];
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
  const equipe = [
    celSit('✊', "Le vestiaire", MOTS.vestiaire[bande(vestiaire())], 'vestiaire',
      "C'est la moyenne des trois lignes, et elle entre dans la force de l'équipe."),
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
    <div class="lineHead">Les trois lignes<span></span></div>
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
function ecranCResultat(){
  const m = S.dernier;
  const gauche = m.adv.dom ? S.club.nom : m.adv.nom, droite = m.adv.dom ? m.adv.nom : S.club.nom;
  const score = m.adv.dom ? `${m.bn} – ${m.be}` : `${m.be} – ${m.bn}`;
  const fin = S.journee + 1 >= JOURNEES;
  const ligne = `${m.res === 'V' ? 'Victoire' : m.res === 'N' ? 'Match nul' : 'Défaite'} · ${cPlace()}ᵉ au classement`;
  return `<div class="card">
    <div class="step">${ordinal(S.journee + 1)} journée · terminé</div>
    <div class="score"><span class="big">${score}</span><div><b>${esc(gauche)}</b> – ${esc(droite)}<br><span class="sub">${esc(ligne)}</span></div></div>
    ${annexeHTML(m.annexe)}
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
    <h2>${esc(o.nom)}</h2>
    <p class="narr">${esc(cMotClub(o))} ${esc(cMotObjectif(o))}</p>
    <div class="sit">
      ${celSit('🪜', "La division", nomDivision(o.division), 'd', null)}
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
function ecranCMercato(){
  const mien = (S.mercatoVu || []).filter(x => x.vers === S.club.nom || x.de === S.club.nom);
  const ar = mien.filter(x => x.vers === S.club.nom), pa = mien.filter(x => x.de === S.club.nom);
  return `<div class="card no-sticky">
    <div class="step">${S.annee}-${S.annee + 1} · ${esc(S.club.nom)} · ${esc(nomDivision())}</div>
    <div class="big-ico">🔁</div>
    <h2>Ce que l'été a fait à ton groupe</h2>
    <p class="narr">Objectif ${S.objectif}ᵉ. ${esc(cMotObjectif({ objectif: S.objectif }))}</p>
    ${ar.length ? `<h3>Ils arrivent</h3><div class="notes">${ar.map(x => `<div>
      <span class="p">${esc(x.poste || '?')}</span><span>${esc(x.nom)} <i>de ${esc(x.de)}</i></span>
      <span class="n">${x.age || ''}</span></div>`).join('')}</div>` : ''}
    ${pa.length ? `<h3>Ils partent</h3><div class="notes">${pa.map(x => `<div>
      <span class="p">${esc(x.poste || '?')}</span><span>${esc(x.nom)} <i>à ${esc(x.vers)}</i></span>
      <span class="n">${x.age || ''}</span></div>`).join('')}</div>` : ''}
    ${!mien.length ? `<p class="narr">Rien. Ni entrée, ni sortie : tu commences la saison avec le groupe que tu avais.</p>` : ''}
    <div class="btn-row"><button class="btn" onclick="cFinirMercato()">La première journée →</button></div>
  </div>
  ${effectifHTML()}${classementHTML()}`;
}

/* ---------------- la fin du parcours ---------------- */
function ecranCCarriere(){
  const c = S.carriere || { saisons:0, clubs:[], annees:[], titres:0, coupes:0, europes:0, montees:0, virages:0 };
  return `<div class="card no-sticky">
    <div class="step">${S.annee} · ${S.moi.age} ans · c'est fini</div>
    <div class="big-ico">🏁</div>
    <h2>Ce qu'il restera</h2>
    <p class="narr">${esc(S.fin && S.fin.raison === "personne n'a rappelé"
      ? "Personne n'a rappelé. Un banc ne se reprend pas quand on veut."
      : "Tu as fait le tour.")}</p>
    <div class="stats">
      <div><div class="v">${c.saisons}</div><div class="k">saisons</div></div>
      <div><div class="v">${c.clubs.length}</div><div class="k">clubs</div></div>
      <div><div class="v">${c.titres}</div><div class="k">titres</div></div>
      <div><div class="v">${c.coupes}+${c.europes}</div><div class="k">coupes</div></div>
      <div><div class="v">${c.virages || 0}</div><div class="k">fois remercié</div></div>
    </div>
    ${cCarriereHTML()}
    <p class="sub">Les clubs : ${esc(c.clubs.join(', ')) || '—'}.</p>
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
