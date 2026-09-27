/* ============================================================
   ABSOLUT COACH 2 — LES ÉCRANS
   Une règle, tenue partout : aucune valeur de jauge n'arrive ici.
   Le moteur ne donne que des phrases (`dire`, `direCorps`,
   `direFraicheur`) et des directions (`m.mvt`). Les seuls chiffres
   affichés sont le score, la note de match, les minutes, les
   journées et le classement.
   ============================================================ */

const ANNEES = [
  { a:1962, ico:'📻', nom:"Années 60", sub:"Reims et Saint-Étienne, pas de remplaçants, des trains de nuit." },
  { a:1975, ico:'📺', nom:"Années 70", sub:"Le football total, les Verts, deux remplaçants." },
  { a:1987, ico:'📼', nom:"Années 80", sub:"Le carré magique, Bordeaux, des tacles par derrière." },
  { a:1998, ico:'💿', nom:"Années 90", sub:"Bosman, les droits télé, le mercato qui s'emballe." },
  { a:2008, ico:'📱', nom:"Années 2000", sub:"Lyon en série, les agents partout." },
  { a:2018, ico:'💻', nom:"Aujourd'hui", sub:"La data, les réseaux, les corps qui tiennent plus longtemps." },
];

let ETAPE = 0;
const NEW = { nom:"", poste:'M', annee:2018, origine:null, ambition:null };

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
const app = () => document.getElementById('app');
const ordinal = n => n === 1 ? "1<sup>re</sup>" : n + "<sup>e</sup>";

function pills(dit){
  if (!dit || !dit.length) return '';
  return `<span class="pills">${dit.map(d => `<i class="pill ${d.c || 'neutre'}">${esc(d.t)}</i>`).join('')}</span>`;
}
function optHTML(ico, titre, sub, dit, onclick){
  return `<button class="opt" onclick="${onclick}"><span class="ico">${ico}</span><span>`
    + `<b>${esc(titre)}</b>${sub ? `<span class="sub">${esc(sub)}</span>` : ''}${pills(dit)}</span></button>`;
}

/* ---------------- rendu ---------------- */
function rendre(){
  const el = app(); if (!el) return;
  if (!S) { el.innerHTML = creationHTML(); window.scrollTo(0, 0); return; }
  const f = { semaine:ecranSemaine, arret:ecranArret, moment:ecranMoment,
    resultat:ecranResultat, bilan:ecranBilan, journal:ecranJournal,
    ete:ecranEte, offres:ecranOffres, mercato:ecranMercato,
    carriere:ecranCarriere, tirage:ecranTirage }[S.ecran];
  el.innerHTML = (S.ecran === 'tirage' ? '' : topHTML()) + (f ? f() : `<div class="card"><h2>Écran inconnu</h2><p class="sub">${esc(S.ecran)}</p></div>`);
  window.scrollTo(0, 0);
}

/* ---------------- création ---------------- */
function creationHTML(){
  if (ETAPE === 0) return `<div class="card">
    <div class="step">Création · étape 1 sur 4</div>
    <h2>Qui tu es, et quand</h2>
    <p class="narr">Un nom, un poste, une époque. Le reste, tu le découvriras en jouant.</p>
    <h3>Ton nom</h3>
    <input id="nom" class="txt" placeholder="Ton nom" value="${esc(NEW.nom)}" maxlength="24">
    <h3>Ton poste</h3>
    <div class="row">${POSTES.map(p => `<button class="chip${NEW.poste === p.id ? ' on' : ''}" onclick="setPoste('${p.id}')">${esc(p.nom)}</button>`).join('')}</div>
    <p class="sub" style="margin-top:6px">À ce poste, le quatrième axe s'appelle <b>${esc(POSTES.find(p => p.id === NEW.poste).spec)}</b>.</p>
    <h3>Ton époque</h3>
    ${ANNEES.map(e => `<button class="opt${NEW.annee === e.a ? ' on' : ''}" onclick="setAnnee(${e.a})"><span class="ico">${e.ico}</span><span><b>${e.nom}</b><span class="sub">${esc(e.sub)}</span></span></button>`).join('')}
    <div class="btn-row"><button class="btn" onclick="etape(1)">Continuer</button></div>
  </div>`;

  if (ETAPE === 1) return `<div class="card">
    <div class="step">Création · étape 2 sur 4</div>
    <h2>Où tu as appris à jouer</h2>
    <p class="narr">Ton époque et ton poste sont derrière toi. Reste le plus lourd : d'où tu viens.</p>
    ${ORIGINES.map((o, i) => optHTML(o.ico, o.nom, o.sub, origineDit(o), `setOrigine(${i})`)).join('')}
    <div class="btn-row"><button class="btn ghost" onclick="etape(0)">Retour</button></div>
    <p class="sub">Une qualité et un défaut seront tirés au sort à la fin de la création. Tu ne les choisis pas, et ils te tiendront toute la carrière.</p>
  </div>`;

  return `<div class="card">
    <div class="step">Création · étape 3 sur 4</div>
    <h2>Ce que tu veux de cette vie</h2>
    <p class="narr">À dix-huit ans, on a tous une idée de pourquoi on court. Elle changera peut-être.</p>
    ${AMBITIONS.map((a, i) => optHTML(a.ico, a.nom, a.sub, null, `setAmbition(${i})`)).join('')}
    <div class="btn-row"><button class="btn ghost" onclick="etape(1)">Retour</button></div>
  </div>`;
}
function origineDit(o){
  const d = [];
  Object.entries(o.axes).forEach(([a, v]) => d.push({ c: v > 0 ? 'foot' : 'risk', t: `${v > 0 ? '▲' : '▼'} ${AXE_NOM[a]}` }));
  Object.entries(o.liens || {}).forEach(([k, v]) => d.push({ c: v > 0 ? 'foot' : 'risk', t: `${v > 0 ? '▲' : '▼'} ${LIEN_NOM[k] || k}` }));
  return d;
}
function setPoste(id){ NEW.poste = id; rendre(); }
function setAnnee(a){ NEW.annee = a; rendre(); }
function etape(n){
  if (ETAPE === 0){ const i = document.getElementById('nom'); if (i) NEW.nom = i.value.trim(); }
  ETAPE = n; rendre();
}
function setOrigine(i){ NEW.origine = ORIGINES[i]; ETAPE = 2; rendre(); }
function setAmbition(i){
  NEW.ambition = AMBITIONS[i];
  if (!NEW.nom) NEW.nom = "Le joueur";
  nouvellePartie({ nom:NEW.nom, poste:NEW.poste, annee:NEW.annee, origine:NEW.origine, ambition:NEW.ambition });
  S.ecran = 'tirage'; sauver(); rendre();
}

/* ---------------- le tirage ----------------
   Le propriétaire, 27/09/2026 : « pour les qualités et défauts, il faut que ce
   soit dans la page de création qu'on les découvre. Une fois qu'on a choisi ce
   qu'on voulait pour la partie hors football, on doit les voir apparaître.
   C'est bien s'il y a une petite animation comme une roulette et tout. » Ils
   étaient révélés au fil des matchs, donc ils apparaissaient dans « Ta
   situation » sans qu'on sache ce qu'ils étaient. */
function ecranTirage(){
  setTimeout(lancerRoulette, 40);
  return `<div class="card">
    <div class="step">Création · étape 4 sur 4</div>
    <div class="big-ico">🎰</div>
    <h2>Ce qu'on ne t'a pas demandé</h2>
    <p class="narr">Un joueur ne choisit pas tout. Il y a ce que tu as depuis toujours,
      et ce qui te manquera toujours. On te le dit une fois, maintenant.</p>
    <div class="roul" id="rq"><span class="i">✨</span>
      <div><b id="rqn">—</b><span class="sub" id="rqd">Ta qualité</span></div></div>
    <div class="roul bad" id="rf"><span class="i">⚠️</span>
      <div><b id="rfn">—</b><span class="sub" id="rfd">Ton défaut</span></div></div>
    <p class="sub" id="rtxt" style="opacity:0">Quinze points en plus sur un axe, quinze en moins sur
      un autre, dans tes chiffres dès le premier match. Ça ne bougera plus : c'est ce que tu es.</p>
    <div class="btn-row" id="rbtn" style="opacity:0;pointer-events:none">
      <button class="btn" onclick="finirTirage()">Commencer la saison</button></div>
  </div>`;
}
function lancerRoulette(){
  const q = QUALITES.find(x => x.id === S.moi.qual.id), f = DEFAUTS.find(x => x.id === S.moi.def.id);
  const poser = (id, it, cb) => {
    const n = document.getElementById(id + 'n'), d = document.getElementById(id + 'd');
    if (n){ n.textContent = it.nom; d.textContent = `${motAxe(it.axe)} — ${it.dit}`; }
    const box = document.getElementById(id); if (box) box.classList.add('pose');
    if (cb) cb();
  };
  const fini = () => ['rtxt', 'rbtn'].forEach(id => { const e = document.getElementById(id);
    if (e){ e.style.transition = 'opacity .5s'; e.style.opacity = '1'; e.style.pointerEvents = 'auto'; } });
  // on respecte ceux qui ne veulent pas d'animation
  const calme = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (calme){ poser('rq', q); poser('rf', f); return fini(); }
  const tourner = (id, liste, cible, duree, cb) => {
    const n = document.getElementById(id + 'n'); if (!n) return cb();
    const t0 = Date.now();
    const tic = () => {
      const t = Date.now() - t0;
      if (t >= duree) return poser(id, cible, cb);
      n.textContent = liste[Math.floor(Math.random() * liste.length)].nom;
      // ça ralentit en arrivant : c'est ce qui fait la roulette
      setTimeout(tic, 55 + 240 * Math.pow(t / duree, 3));
    };
    tic();
  };
  tourner('rq', QUALITES, q, 1500, () => tourner('rf', DEFAUTS, f, 1500, fini));
}
function finirTirage(){ S.ecran = 'semaine'; sauver(); rendre(); }

/* ---------------- bandeau ---------------- */
const LIEN_NOM = { coach:"Le coach", vestiaire:"Le vestiaire", club:"Le club", supporters:"Le stade", agent:"Ton agent" };
/* LES CASES RÉELLEMENT AFFICHÉES. « Le vestiaire » n'en est plus une : c'est, au
   mot près, **la moyenne des trois ententes de ligne**, déjà lisibles dans « Ta
   ligne » et dans l'effectif — et il ne pèse que −0,43 à +0,77 sur la force de
   l'équipe quand l'avantage du terrain en vaut 2,40. Une case qui redit une
   moyenne et ne décide de rien n'a pas sa place. Le moteur, lui, garde
   `vestiaire()` : deux familles d'arrêts s'y accrochent. */
const LIENS_VUS = ['coach', 'club', 'supporters', 'agent'];
const LIEN_ICO = { coach:"🎽", vestiaire:"✊", club:"🏟️", supporters:"📣", agent:"🤝",
  fraicheur:"🫁", blessure:"🩼", suspension:"🟥",
  def:"🛡️", mil:"🧭", att:"🎯", reserve:"🧱" };

function topHTML(){
  // hors saison, la journée et le classement sont ceux de l'année d'avant : on ne
  // les affiche pas, on dit où on en est vraiment
  const hors = { ete:"L'été", offres:'Les offres', mercato:'Mercato', carriere:'Fin de carrière' }[S.ecran];
  const pos = hors ? 0 : maPlace();
  return `<div class="top">
    <div><div class="who">${esc(S.moi.nom)}</div>
      <div class="sub">${esc(S.moi.posteNom)} · ${esc(S.club.nom)}${S.moi.age ? ` · ${S.moi.age} ans` : ''}</div></div>
    <div class="meta">${S.annee}${hors ? '' : `-${S.annee + 1}`}<br>${hors
      ? esc(hors) : `${ordinal(Math.min(S.journee + 1, JOURNEES))} journée sur ${JOURNEES}`}
      <br>${hors ? (S.carriere ? `${S.carriere.saisons} saison${S.carriere.saisons > 1 ? 's' : ''}` : '')
        : `${esc(S.club.nom)} ${ordinal(pos)} · ${abrDivision()}`}</div>
  </div>`;
}
function maPlace(){ return classementTrie().findIndex(x => x.nom === S.club.nom) + 1; }

/* « Ta situation » en cases, pas en lignes. Le propriétaire, 27/09/2026 :
   « l'écran il est quand même très long… sur la page situation, si on a les bons
   icônes et mis dans la bonne forme, plutôt que tout faire par ligne, ça peut
   permettre de faire de la place. » Une case par chose, deux colonnes sur un
   téléphone, quatre sur un écran large : la fiche passe de quatorze lignes
   empilées à sept rangées.
   **Chaque icône est celle de la séance qui nourrit la chose** — ⚽ la technique,
   💪 le corps, 🧠 le mental, 🎯 ton poste — pour qu'on n'ait jamais à deviner. */
const minuscule = t => t ? t.charAt(0).toLowerCase() + t.slice(1) : t;
function celSit(ico, nom, txt, cle){
  return `<div${cle ? ' class="cle"' : ''}><span class="k">${ico} ${esc(nom)}</span>
    <span class="v">${esc(txt)}</span></div>`;
}
function situationHTML(ouvert){
  const gens = LIENS_VUS.map(k => celSit(LIEN_ICO[k], LIEN_NOM[k], dire(k))).join('');
  /* Une seule ligne ici : celle qui te sert, avec son enjeu. Les trois ententes
     sont avec les joueurs, dans l'effectif — c'est là qu'elles ont des noms. */
  /* Le propriétaire, 27/09/2026 : « il y a un onglet attaque à côté de le club,
     le vestiaire, etc., j'ai pas trop compris ce qu'il faisait là. » Le libellé
     était le nom de la ligne, qui se lisait comme une jauge de plus ; c'est
     **ta ligne** qu'il faut annoncer, et la phrase dit laquelle. */
  const cle = LIGNE_CLE[S.moi.poste];
  const maLigne = celSit(LIEN_ICO[cle], "Ta ligne",
    `Avec ${LIGNE_LA[cle]} : ${minuscule(direLigne(cle))}${direTendance(cle)} ${ENJEU_LIGNE[S.moi.poste]}`, true);
  /* Les mots du joueur, pas les miens : blessure, corps, technique, mental.
     « Je comprends pas pourquoi on a des mots différents. » */
  /* Le groupe : c'est ce qui rend vingt-deux joueurs utiles plut\u00f4t que d\u00e9coratifs.
     Qui manque, et ce que \u00e7a co\u00fbte au onze de samedi. */
  // une seule case : qui manque, et ce que \u00e7a co\u00fbte au onze
  const grp = celSit('\u{1F465}', "Le groupe", direGroupe());
  /* Le rang dans la hi\u00e9rarchie du poste, et la phrase qui nomme le levier le plus
     court : \u00ab je sais pas trop quoi faire pour entrer dedans \u00bb. */
  const toi = celSit('\u{1FAC1}', "Fra\u00eecheur", direFraicheur() + " avant le match.")
    + celSit('\u{1FA7C}', "Blessure", direCorps())
    + celSit('\u{1F4AA}', "Ton corps", direFond())
    + celSit('\u26bd', "Technique", direGeste())
    + celSit('\u{1F9E0}', "Mental", direEncaisse());
  /* TA QUALITÉ ET TON DÉFAUT NE SONT PAS DES JAUGES (le propriétaire, 27/09/2026 :
     « je ne comprends pas ce que représente nerfs d'acier et ischios en verre,
     pourquoi ils sont là et comme cela »). Ils étaient rangés dans la même grille
     que la fraîcheur et le mental, sans dire de quel axe ils parlent : « DES NERFS
     D'ACIER » (+15 de mental, pour toujours) se lisait à côté de « MENTAL : quand
     ça se tend, tu joues petit » (ta réserve, en ce moment) — et les deux se
     contredisaient à l'œil. Ils ont désormais leur propre section, chacun nomme
     son axe, et une ligne dit d'où ils viennent. */
  let tire = '';
  if (S.moi.qual.vu){ const q = QUALITES.find(x => x.id === S.moi.qual.id);
    tire += celSit('\u2728', q.nom, `${motAxe(q.axe)} — ${q.dit}`, true); }
  if (S.moi.def.vu){ const f = DEFAUTS.find(x => x.id === S.moi.def.id);
    tire += celSit('\u26a0\ufe0f', f.nom, `${motAxe(f.axe)} — ${f.dit}`, true); }
  return `<details class="fold sit-fold"${ouvert ? ' open' : ''}><summary>Ta situation</summary>
    <h3>Autour de toi</h3><div class="sit">${gens}${maLigne}${grp}</div>
    ${concurrenceHTML()}
    <h3>Toi</h3><div class="sit">${toi}${tire}</div>
    <p class="narr" style="margin-top:12px">${esc(direStaff())}</p>
    <p class="sub">${S.stats.matchs} match${S.stats.matchs > 1 ? 's' : ''} jou\u00e9${S.stats.matchs > 1 ? 's' : ''}${S.stats.titus ? `, dont ${S.stats.titus} comme titulaire` : ''}${S.stats.buts ? ` \u00b7 ${S.stats.buts} but${S.stats.buts > 1 ? 's' : ''}` : ''}${S.stats.notes.length ? ` \u00b7 moyenne ${virg(moyenneNotes())}` : ''}.</p>
  </details>`;
}

/* L'effectif, rang\u00e9 par ligne et en tuiles. Le propri\u00e9taire, 27/09/2026 :
   « peut-\u00eatre qu'on peut mettre une forme diff\u00e9rente pour sortir du sch\u00e9ma tableau
   ligne par ligne qui prend beaucoup de place et qui fait beaucoup d\u00e9filer. »
   Treize rang\u00e9es pleine largeur deviennent trois blocs de tuiles \u00e0 trois colonnes —
   et chaque bloc porte l'entente de sa ligne, l\u00e0 o\u00f9 elle a enfin des noms. */
const GROUPES = [['G', "Les gardiens", "\u{1F9E4}", null], ['D', "La d\u00e9fense", "\u{1F6E1}\ufe0f", 'def'],
  ['M', "Le milieu", "\u{1F9ED}", 'mil'], ['A', "L'attaque", "\u{1F3AF}", 'att']];
function effectifHTML(){
  if (!S.equipe || !S.equipe.length) return '';
  const l = effectifTrie();
  /* Quatre groupes, pas trois : « dans l'onglet effectif il n'y a pas la colonne
     des gardiens » — ils étaient fondus dans la défense, dont ils partagent bien
     l'entente, mais pas le poste. L'entente reste sur les trois lignes. */
  const bloc = ([po, nom, ico, k]) => {
    const j = l.filter(x => x.poste === po);
    if (!j.length) return '';
    return `<div class="lineHead">${ico} ${esc(nom)}<span>${k ? esc(direLigne(k)) : ''}</span></div>
      <div class="lineup">${j.map(x => `<div class="${x.moi ? 'me' : ''}${x.blesse || x.susp ? ' out' : ''}">
        <b>${esc(x.nom)}</b><span class="n">${x.moy == null ? (x.res == null ? '\u2014' : virg(x.res)) : virg(x.moy)}</span>
        <span class="s">${x.moy == null && x.res != null ? `${x.age} ans \u00b7 ${x.nbR} m en r\u00e9serve` : `${x.age} ans \u00b7 ${x.nb} m${x.nbR ? ` \u00b7 ${x.nbR} r\u00e9s.` : ''}`}${x.moi ? ' \u00b7 toi' : x.rival ? ' \u00b7 ton poste' : x.monte ? ' \u00b7 il monte' : ''}${x.blesse ? ' \u00b7 \u{1FA7C}' : x.susp ? ' \u00b7 \u{1F7E5}' : x.boude ? ' \u00b7 \u{1F624}' : ''}</span>
      </div>`).join('')}</div>`;
  };
  return `<details class="fold"><summary>L'effectif</summary>
    ${GROUPES.map(bloc).join('')}
    <p class="sub">Vingt-deux joueurs, onze titulaires. La moyenne de chacun sur la saison, et le nombre de matchs not\u00e9s.<br>
      L'entente du vestiaire, c'est la moyenne de ces trois lignes.</p>
  </details>`;
}
const virg = v => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');

function classementHTML(){
  const t = classementTrie();
  const N = t.length;
  return `<details class="fold"><summary>Le classement · ${esc(nomDivision())}</summary><div class="rank">
    ${t.map((e, i) => `<div${e.nom === S.club.nom ? ' style="border-color:var(--gold-dim)"' : ''}>
      <span class="m">${i + 1}</span><span>${esc(e.nom)}</span>
      <span class="tag">${e.pts} pts · ${e.j} j · ${e.v || 0}V ${e.n || 0}N ${e.d || 0}D · ${e.bp - e.bc > 0 ? '+' : ''}${e.bp - e.bc}</span></div>`).join('')}
  </div><p class="sub">${(S.division || 1) === 1
    ? `Les ${MONTEES} derniers descendent en ${esc(nomDivision(2))}.`
    : `Les ${MONTEES} premiers montent en ${esc(nomDivision(1))}.`}</p></details>`;
}
function liensJournal(){
  return `<div class="btn-row"><button class="btn ghost" onclick="ouvrirJournal()">📓 Le journal</button></div>`;
}

/* ---------------- la semaine ---------------- */
function ecranSemaine(){
  const adv = adversaire(S.journee);
  const empeche = S.etats.blessure > 0 ? "blessure" : S.etats.suspension > 0 ? "suspension" : null;
  const entete = adv.dom ? `${S.club.nom} reçoit ${adv.nom}` : `${S.club.nom} se déplace à ${adv.nom}`;
  /* L'ordre qu'il a demand\u00e9 : ta situation d'abord, les choix ensuite, puis
     l'effectif, puis le classement — « le classement qui est plus annexe ». */
  return `${situationHTML(true)}
  <div class="card">
    <div class="step">${esc(entete)}</div>
    <h2>Ta semaine</h2>
    ${direMercredi() ? `<p class="narr" style="margin:0 0 8px"><b>${esc(direMercredi())}</b> Ce que tu travailles se paiera deux fois cette semaine.</p>` : ''}
    ${empeche === 'blessure' ? `<div class="lack"><b>Tu es à l'infirmerie.</b> Encore ${S.etats.blessure} journée${S.etats.blessure > 1 ? 's' : ''}. Ce que tu fais de la semaine compte quand même.</div>` : ''}
    ${empeche === 'suspension' ? `<div class="lack"><b>Tu es suspendu.</b> Encore ${S.etats.suspension} match${S.etats.suspension > 1 ? 's' : ''}. Tu t'entraînes sans jouer.</div>` : ''}
    <h3>Ce que tu travailles</h3>
    ${SEMAINES.map(s => optHTML(s.ico, s.nom, s.sub, s.dit, `choisirSemaine('${s.id}')`)).join('')}
  </div>
  ${effectifHTML()}${classementHTML()}${liensJournal()}`;
}

/* Qui se bat avec toi pour la place — **tout le poste**, pas deux noms. Le
   propriétaire, 27/09/2026 : « si le titulaire se blesse, faut que le remplaçant
   devienne titulaire et que celui qui était hors du groupe passe dans le groupe
   pour compenser ; là il n'y a pas cette logique. » Maintenant elle se voit. */
function concurrenceHTML(){
  const l = monPoste();
  if (l.length < 2) return '';
  const places = FORMATION[S.moi.poste];
  let rang = 0;
  const lignes = l.map(x => {
    const dedans = x.dispo && rang < places;
    if (x.dispo) rang++;
    return `<div${x.moi ? ' class="me"' : ''}><span class="i">${
      !x.dispo ? (x.raison === 'suspendu' ? '\u{1F7E5}' : '\u{1FA7C}') : dedans ? '\u{1F7E2}' : '\u{1F518}'
    }</span><span>${esc(x.nom)}${x.moi ? ' <i>toi</i>' : ''}${
      !x.dispo ? ` <i>${esc(x.raison || '')}</i>` : dedans ? ' <i>dans le onze</i>' : ''}</span></div>`;
  }).join('');
  return `<h3>Ta place</h3>
    <p class="sub" style="margin:0 0 8px">${esc(direRang())} ${esc(direCommentMonter())}</p>
    <div class="words">${lignes}</div>`;
}

/* ---------------- un arrêt ---------------- */
function ecranArret(){
  const a = S.arret;
  return `<div class="card">
    <div class="step">Avant ${esc(adversaire(S.journee).nom)} · ce qui est en train de t'arriver</div>
    <h2>${esc(a.titre)}</h2>
    <p class="narr">${esc(a.texte)}</p>
    ${a.options.map((o, i) => optHTML(o.ico || '💬', o.l, o.sub, o.dit, `choisirArret(${i})`)).join('')}
  </div>`;
}

/* ---------------- un fait de match ---------------- */
function ecranMoment(){
  const m = S.match, f = m.moments[S.momentIdx];
  let n = 0, e = 0;
  m.evs.filter(x => x.type === 'but' && x.min <= f.min).forEach(x => x.nous ? n++ : e++);
  const gauche = m.adv.dom ? S.club.nom : m.adv.nom;
  const droite = m.adv.dom ? m.adv.nom : S.club.nom;
  const score = m.adv.dom ? `${n}-${e}` : `${e}-${n}`;
  return `<div class="card">
    <div class="step">${esc(gauche)} – ${esc(droite)} · ${ordinal(f.min)} minute · ${score}</div>
    <h2>${esc(f.q)}</h2>
    ${f.ctx ? `<div class="lack"><b>${esc(f.ctx)}</b> ${esc(direTete())}</div>` : ''}
    <p class="narr">${m.entree ? `Tu es entré à la ${ordinal(m.entree)}. ` : ''}Une seconde pour décider.</p>
    ${f.opts.map((o, i) => `<button class="opt" onclick="choisirMoment(${i})"><span class="ico">⚡</span><span><b>${esc(o.l)}</b></span></button>`).join('')}
    <p class="sub">Tes axes et le hasard trancheront. Tu ne sauras jamais si l'autre option aurait marché.</p>
  </div>`;
}

/* ---------------- le résultat ---------------- */
/* Le mercredi de coupe ou d'Europe : lu, pas opéré — « la coupe doit devenir
   jouable comme suite de décisions, pas de matchs à opérer ». Ce qu'on en retient
   à l'écran : le résultat, ton temps de jeu, et ce que ça coûte à samedi. */
const COMP_NOM = { coupe:"Coupe", euro:"Europe" };
function annexeHTML(a){
  if (!a) return '';
  const tours = a.comp === 'coupe' ? TOURS_COUPE : TOURS_EURO;
  const ton = a.res === 'V' ? 'gagne' : a.res === 'D' ? 'perdu' : '';
  const ico = a.comp === 'coupe' ? '🏅' : '⭐';
  return `<h3>Mercredi — ${COMP_NOM[a.comp]}</h3>
    <div class="bloc ${ton}"><span class="i">${ico}</span><div>
      <h4>${esc(tours[a.tour])} · ${a.bn}–${a.be} contre ${esc(a.adv)}${a.prolong ? ' (après prolongation)' : ''}</h4>
      <p class="narr" style="margin:0">${a.minutes
        ? `Tu as joué ${a.minutes} min, note ${virg(a.note)}${a.buts ? `, ${a.buts} but${a.buts > 1 ? 's' : ''}` : ''}${a.passes ? `, ${a.passes} passe${a.passes > 1 ? 's' : ''} décisive${a.passes > 1 ? 's' : ''}` : ''}. Samedi partira de plus loin.`
        : a.statut === 'banc' ? `Tu étais sur le banc et tu n'es pas entré.`
        : `Tu n'étais pas du voyage.`}</p></div></div>`;
}

function ecranResultat(){
  const m = S.dernier;
  const gauche = m.adv.dom ? S.club.nom : m.adv.nom, droite = m.adv.dom ? m.adv.nom : S.club.nom;
  const score = m.adv.dom ? `${m.bn} – ${m.be}` : `${m.be} – ${m.bn}`;
  const maLigne = m.minutes
    ? `${m.entree ? `Entré à la ${ordinal(m.entree)}` : "Titulaire"} · ${m.minutes} minutes · note ${virg(m.note)}${m.buts ? ` · ${m.buts} but${m.buts > 1 ? 's' : ''}` : ''}${m.passes ? ` · ${m.passes} passe${m.passes > 1 ? 's' : ''} décisive${m.passes > 1 ? 's' : ''}` : ''}`
    : m.statut === 'banc' ? "Resté sur le banc toute la rencontre"
    : m.statut === 'blesse' ? "À l'infirmerie" : m.statut === 'suspendu' ? "Suspendu"
    : m.noteReserve != null ? `Hors du groupe · match avec la réserve, note ${virg(m.noteReserve)}`
    : "Hors du groupe";
  const fin = S.journee + 1 >= JOURNEES;
  return `<div class="card">
    <div class="step">${ordinal(S.journee + 1)} journée · terminé</div>
    <div class="score"><span class="big">${score}</span><div><b>${esc(gauche)}</b> – ${esc(droite)}<br><span class="sub">${maLigne}</span></div></div>
    ${annexeHTML(m.annexe)}
    ${m.arret || m.seance ? `<h3>Ta semaine</h3>
      ${m.arret ? `<p class="narr" style="margin-bottom:6px"><b>${esc(m.arret.titre)}</b> \u2014 tu as choisi : \u00ab ${esc(m.arret.choix)} \u00bb.</p>` : ''}
      ${m.seance ? `<p class="narr">${esc(m.seance.texte)}</p>` : ''}` : ''}
    <h3>Le film du match</h3>
    <div class="tl">${filmHTML(m)}</div>
    ${m.notes && m.notes.length > 1 ? `<h3>Les notes du match</h3>
      ${m.jugement ? `<p class="narr">${esc(m.jugement)}</p>` : ''}
      <div class="notes">${m.notes.map(j => `<div${j.moi ? ' class="me"' : ''}>
        <span class="p">${j.poste}</span><span>${esc(j.nom)}${j.rival ? ' <i>(ton poste)</i>' : ''}${faitsHTML(j.f)}${j.min && j.min < 90 ? ` <i>${j.min} min</i>` : ''}</span>
        <span class="n">${virg(j.note)}</span></div>`).join('')}</div>` : ''}
    ${m.reserveVue && m.reserveVue.length ? `<h3>Avec la réserve</h3>
      <div class="notes">${m.reserveVue.map(j => `<div>
        <span class="p">${j.poste}</span><span>${esc(j.nom)}</span>
        <span class="n">${virg(j.note)}</span></div>`).join('')}</div>
      <p class="sub">Ceux qui n'étaient pas dans le groupe ont joué avec la réserve.</p>` : ''}
    ${m.mvt && m.mvt.length ? `<h3>Ce que ça change</h3><div class="mvt">${m.mvt.map(x =>
      `<div><span class="${x.up ? 'up' : 'dn'}">${LIEN_ICO[x.k] || '•'}</span><span>${esc(x.mot)}</span></div>`).join('')}</div>` : ''}
    <div class="btn-row"><button class="btn" onclick="apresMatch()">${fin ? "Le bilan de la saison" : "La semaine suivante"}</button></div>
  </div>
  ${classementHTML()}${liensJournal()}`;
}
/* Ce qu'un joueur a fait, à côté de sa note. Les minutes ne s'affichent que
   quand elles ne valent pas 90 — « l'économie d'affichage, je trouve que c'est
   une bonne idée » (le propriétaire, 27/09/2026) — donc ces pastilles sont la
   seule chose qui explique un joueur sorti sans remplaçant : l'expulsé.
   Le vocabulaire est celui de la 1.0 (⚽ 🅰️ 🟨 🟥 🩼) : « comme on avait fait avant ». */
function faitsHTML(f){
  if (!f) return '';
  const l = [];
  if (f.b) l.push('⚽'.repeat(Math.min(f.b, 3)) + (f.b > 3 ? `×${f.b}` : ''));
  // le 🅰️ se lit comme un carton sur un téléphone : on prend le crampon
  if (f.p) l.push('👟'.repeat(Math.min(f.p, 3)));
  if (f.j) l.push('🟨');
  if (f.r) l.push('🟥');
  if (f.bl) l.push('🩼');
  return l.length ? ` <span class="fa">${l.join('')}</span>` : '';
}
function filmHTML(m){
  const lignes = [];
  m.evs.forEach(e => {
    const eux = !e.nous, qui = e.qui || (eux ? `un joueur de ${m.adv.nom}` : "un coéquipier");
    if (e.type === 'but') lignes.push({ min:e.min, moi:!!(e.moi || e.passeMoi), ico:'⚽',
      t: e.moi ? `<b>Ton but</b>` : e.passeMoi ? `But de ${esc(qui)}, <b>sur ta passe</b>`
        : eux ? `But de ${esc(qui)} <i>(${esc(m.adv.nom)})</i>`
        : e.passe ? `But de ${esc(qui)}, servi par ${esc(e.passe)}` : `But de ${esc(qui)}` });
    if (e.type === 'jaune') lignes.push({ min:e.min, moi:!!e.moi, ico:'🟨', t: `${esc(e.moi ? S.moi.nom : qui)} averti` });
    if (e.type === 'rouge') lignes.push({ min:e.min, moi:!!e.moi, ico:'🟥', t: `${esc(e.moi ? S.moi.nom : qui)} exclu` });
    if (e.type === 'penalty') lignes.push({ min:e.min, moi:!!e.arrete, ico:'🎪',
      t: e.arrete ? `Penalty pour ${esc(m.adv.nom)} — <b>tu l'arrêtes</b>`
        : `Penalty pour ${esc(e.nous ? S.club.nom : m.adv.nom)}` });
    if (e.type === 'blessure') lignes.push({ min:e.min, moi:false, ico:'🩼', t: `Sortie sur blessure — ${esc(qui)}` });
  });
  // le coach change : ça fait vivre le groupe, et ça te concerne quand c'est toi
  (m.chgVus || []).forEach(c => {
    // un changement de poste à poste ne se commente pas ; un changement tactique si
    const tact = c.tact ? ` <i>— ${c.pe === 'A' ? 'trois devant' : c.pe === 'D' ? 'on referme' : 'il change de plan'}</i>` : '';
    lignes.push({ min:c.min, moi: c.moiE || c.moiS, ico:'🔄',
      t: (c.moiE ? `<b>Tu entres</b>, ${esc(c.s)} sort`
        : c.moiS ? `<b>Tu sors</b>, ${esc(c.e)} entre`
        : `${esc(c.e)} entre, ${esc(c.s)} sort`) + tact });
  });
  m.moments.forEach(f => lignes.push({ min:f.min, moi:true, ico: f.reussi ? '🎯' : '💨',
    t: `${f.chaud ? '<b>' + (f.reussi ? 'Sous pression' : 'Sous pression') + '</b> · ' : ''}${esc(f.choix)} — ${esc(f.reussi ? f.ok : f.ko)}` }));
  if (m.perduLeFil) lignes.push({ min:m.perduLeFil + 1, moi:true, ico:'🌫️',
    t: "<b>Tu as perdu le fil</b> — vingt minutes à côté de la partie" });
  lignes.sort((a, b) => a.min - b.min);
  if (!lignes.length) return `<div><span class="min">—</span><span>😐</span><span>Rien à raconter. Ça arrive.</span></div>`;
  return lignes.map(l => `<div${l.moi ? ' class="me"' : ''}><span class="min">${ordinal(l.min)}</span><span>${l.ico}</span><span>${l.t}</span></div>`).join('');
}

/* ---------------- le bilan ---------------- */
function ecranBilan(){
  const b = S.bilan;
  return `<div class="card">
    <div class="step">${S.annee}-${S.annee + 1} · saison terminée</div>
    <div class="big-ico">🗓️</div>
    <h2>Ce qu'il en reste</h2>
    <div class="stats">
      <div><div class="v">${S.stats.matchs}</div><div class="k">matchs</div></div>
      <div><div class="v">${S.stats.titus}</div><div class="k">titularisations</div></div>
      <div><div class="v">${S.stats.buts}</div><div class="k">buts</div></div>
      <div><div class="v">${S.stats.passes}</div><div class="k">passes déc.</div></div>
      <div><div class="v">${S.stats.notes.length ? virg(b.note) : '—'}</div><div class="k">moyenne</div></div>
      <div><div class="v">${b.pos}<sup>${b.pos === 1 ? 're' : 'e'}</sup></div><div class="k">${esc(S.club.nom)}</div></div>
    </div>
    <div class="bloc gagne"><span class="i">✅</span><div><h4>Ce que tu as gagné</h4>
      ${b.gagne.map(t => `<p class="narr" style="margin:0 0 5px">${esc(t)}</p>`).join('')}</div></div>
    <div class="bloc perdu"><span class="i">⚠️</span><div><h4>Ce que ça t'a coûté</h4>
      ${b.perdu.map(t => `<p class="narr" style="margin:0 0 5px">${esc(t)}</p>`).join('')}</div></div>
    <div class="bloc suite"><span class="i">➡️</span><div><h4>Ce qui vient</h4>
      ${b.suite.map(t => `<p class="narr" style="margin:0 0 5px">${esc(t)}</p>`).join('')}</div></div>
    ${(S.coupe && (S.coupe.gagnee || S.coupe.hist.length)) || (S.euro && S.euro.engage) ? `
      <div class="bloc ${(S.coupe && S.coupe.gagnee) || (S.euro && S.euro.gagnee) ? 'gagne' : ''}"><span class="i">🏅</span><div><h4>Les coupes</h4>
        <p class="narr" style="margin:0">${[
          S.coupe && S.coupe.gagnee ? `<b>Vous gagnez la Coupe.</b>`
            : S.coupe && S.coupe.hist.length ? `Coupe : éliminés ${TOURS_COUPE[S.coupe.hist[S.coupe.hist.length - 1].t]}.` : '',
          S.euro && S.euro.gagnee ? `<b>Et l'Europe.</b>`
            : S.euro && S.euro.engage ? (S.euro.hist.length > 6
                ? `Europe : éliminés ${TOURS_EURO[S.euro.hist[S.euro.hist.length - 1].t]}.`
                : `Europe : sortis en phase de groupes.`) : ''
        ].filter(Boolean).join(' ')}</p></div></div>` : ''}
    ${carriereHTML()}
    <div class="btn-row"><button class="btn ghost" onclick="ouvrirJournal()">📓 Le journal</button>
      <button class="btn" onclick="ouvrirEte()">L'été →</button></div>
  </div>
  ${effectifHTML()}${classementHTML()}`;
}

/* ---------------- la trêve ---------------- */
/* Ce que ta carrière a déjà laissé : la ligne qui donne envie d'une saison de plus. */
function carriereHTML(){
  const c = S.carriere;
  if (!c || !c.saisons) return '';
  const moy = moyCarriere();
  return `<div class="sit"><div><span class="k">La carrière</span><span class="p">${c.saisons} saison${c.saisons > 1 ? 's' : ''} · ${c.matchs} matchs · ${c.buts} but${c.buts > 1 ? 's' : ''}${moy == null ? '' : ` · ${virg(Math.round(moy * 100) / 100)} de moyenne`}</span></div>
    ${c.titres ? `<div><span class="k">Les titres</span><span class="p">${c.titres} championnat${c.titres > 1 ? 's' : ''}</span></div>` : ''}
    <div><span class="k">Les clubs</span><span class="p">${esc(c.clubs.join(', '))}</span></div></div>`;
}
function ecranEte(){
  return `<div class="card">
    <div class="step">Été ${S.annee} · six semaines à toi</div>
    <div class="big-ico">☀️</div>
    <h2>Ce que tu fais de l'été</h2>
    <p class="narr">Le championnat est fini. Ce que tu choisis maintenant, tu le porteras toute la saison prochaine.</p>
    ${ETE.map(e => optHTML(e.ico, e.nom, e.sub, e.dit, `choisirEte('${e.id}')`)).join('')}
  </div>`;
}
/* Les offres, une à la fois : on ne sait jamais si la suivante sera meilleure. */
function motClub(o){
  const f = o.force == null ? o : o.force;
  const d = o.div || (S.division || 1);
  const liste = d === (S.division || 1) ? (S.ligue.equipes || []) : (S.ligue.autre || []);
  const l = liste.map(x => x.force).sort((a, b) => b - a);
  const r = l.filter(x => x > f).length + 1;
  if (d === 2) return r <= 3 ? "Ils jouent la montée, et ils ont ce qu'il faut pour."
    : r <= 9 ? "Un club de l'échelon inférieur, ambitieux sans plus."
    : "Ils joueront le maintien, un étage plus bas.";
  return r <= 2 ? "Ils jouent le titre, et ils le disent."
    : r <= 6 ? "Le haut du tableau, et l'Europe en ligne de mire."
    : r <= 12 ? "Un club installé, sans histoire."
    : "Ils joueront le maintien, et ils le savent.";
}
function motPlace(f){
  const d = niveau() - f;
  return d >= 5 ? "Tu joues, et tout de suite. Ils t'appellent pour ça."
    : d >= -2 ? "Tu auras ta chance. À toi d'en faire quelque chose."
    : "Tu devras la prendre. Ils ont mieux que toi à ton poste.";
}
function ecranOffres(){
  const o = offreCourante();
  const reste = (S.offres || []).length - (S.offreIdx || 0);
  if (!o) return `<div class="card">
    <div class="step">Mercato ${S.annee} · ${S.moi.age} ans</div>
    <div class="big-ico">📞</div>
    <h2>${S.libre ? "Plus personne n'appelle" : "Le téléphone n'a pas sonné"}</h2>
    <p class="narr">${S.libre
      ? `${esc(S.club.nom)} n'a pas prolongé, et aucun club n'est venu. Il va falloir trouver autre chose.`
      : `Aucune proposition cet été. Tu restes à ${esc(S.club.nom)}, et tu as une saison pour changer ça.`}</p>
    ${situationTete()}
    <div class="btn-row">${S.libre
      ? `<button class="btn" onclick="finCarriere('personne')">Arrêter là</button>`
      : `<button class="btn" onclick="resterAuClub()">La saison qui vient →</button>`}</div>
  </div>`;
  return `<div class="card">
    <div class="step">Mercato ${S.annee} · ${S.moi.age} ans · ${reste > 1 ? "une proposition parmi d'autres" : 'une proposition'}</div>
    <div class="big-ico">📞</div>
    <h2>${esc(o.nom)}</h2>
    <p class="sub">${esc(nomDivision(o.div))}</p>
    <p class="narr">${esc(motClub(o))} ${esc(motPlace(o.force))}</p>
    ${situationTete()}
    ${S.libre ? `<p class="sub">${esc(S.club.nom)} n'a pas prolongé : tu n'as pas de club si tu refuses tout.</p>`
      : `<p class="sub">Refuser la fait disparaître. La suivante peut être pire, ou ne pas venir.</p>`}
    <div class="btn-row">
      <button class="btn ghost" onclick="passerOffre()">Refuser</button>
      <button class="btn" onclick="signerOffre()">Signer</button></div>
    ${S.libre ? '' : `<div class="btn-row"><button class="btn ghost" onclick="resterAuClub()">Rester à ${esc(S.club.nom)}</button></div>`}
  </div>`;
}
/* ================== L'ÉCRAN DU MERCATO ==================
   Le mercato d'un joueur n'est pas un marché qu'on opère, c'est un marché qu'on
   **subit** : on lit qui arrive, qui part, ce que ça fait à sa place dans la
   hiérarchie du poste — puis on décide quoi en faire. L'écran est donc une lecture
   suivie d'une décision, et après la décision, ce qu'elle a produit. */
function mvtHTML(l, sens){
  return `<div class="mvts">${l.map(m => `<div class="${sens}">
    <span class="i">${sens === 'in' ? '⬅' : '➡'}</span>
    <span><b>${esc(m.nom)}</b> <i>${esc(POSTES.find(p => p.id === (m.poste || m.p)) ? POSTES.find(p => p.id === (m.poste || m.p)).nom.toLowerCase() : '')}${m.age ? `, ${m.age} ans` : ''} — ${sens === 'in'
      ? (m.de ? `arrive de ${esc(m.de)}${m.div && m.div !== (S.division || 1) ? ` (${esc(abrDivision(m.div))})` : ''}` : 'sort du centre de formation')
      : (m.vers ? `part à ${esc(m.vers)}${m.div && m.div !== (S.division || 1) ? ` (${esc(abrDivision(m.div))})` : ''}`
        : m.age >= 33 ? 'raccroche' : "part à l'étranger")}</i></span>
  </div>`).join('')}</div>`;
}
function ecranMercato(){
  const M = S.mercato || {};
  /* Les arrivées : celles qui viennent d'un club nommé le disent, les autres sortent
     du centre de formation — c'est la même liste, et elle ne mélange rien. */
  const achats = {};
  (M.achats || []).forEach(a => achats[a.nom] = a);
  const arrivees = (M.arrivees || []).map(a => ({ ...a, ...(achats[a.nom] || {}) }));
  const ventes = {};
  (M.ventes || []).forEach(v => ventes[v.nom] = v);
  const departs = (M.partis || []).map(x => ventes[x.nom] || x);
  const bouge = arrivees.length || departs.length;
  const fait = !!M.choix;
  return `<div class="card no-sticky">
    <div class="step">Mercato ${S.annee} · ${esc(S.club.nom)} · ${esc(nomDivision())}</div>
    <div class="big-ico">🔁</div>
    <h2>${fait ? esc(M.choix.nom) : "L'été de ton club"}</h2>
    ${fait ? `<p class="narr">${esc(M.suite)}</p>` : `<p class="narr">${M.reste
      ? `Le groupe que tu retrouveras en août n'est pas celui que tu as quitté en mai.`
      : `Tu arrives. Le vestiaire, lui, était déjà là.`}</p>`}
    ${bouge ? `<h3>Ce que le club a fait</h3>
      ${arrivees.length ? mvtHTML(arrivees, 'in') : ''}
      ${departs.length ? mvtHTML(departs, 'out') : ''}` : `<p class="sub">Rien n'a bougé au club cet été.</p>`}
    <h3>Ta place</h3>
    <p class="narr">${esc(direMercatoPlace())}</p>
    ${(M.montent || []).length || (M.descendent || []).length ? `<h3>Les divisions</h3>
      <p class="sub">${(M.montent || []).length ? `Montent : ${esc((M.montent || []).join(', '))}.` : ''}
        ${(M.descendent || []).length ? ` Descendent : ${esc((M.descendent || []).join(', '))}.` : ''}</p>` : ''}
    ${(M.ailleurs || []).length ? `<details class="fold"><summary>Le mercato des autres</summary>
      <div class="mvts">${M.ailleurs.map(m => `<div>
        <span class="i">🔁</span><span><b>${esc(m.nom)}</b> <i>${m.age} ans — ${esc(m.de)} → ${esc(m.vers)}</i></span></div>`).join('')}</div>
      </details>` : ''}
    ${fait ? `<div class="btn-row"><button class="btn" onclick="finirMercato()">La saison qui vient →</button></div>`
      : `<h3>Ce que tu fais de juillet</h3>
        ${MERCATO_CHOIX.map(c => optHTML(c.ico, c.nom, c.sub, c.dit, `choisirMercato('${c.id}')`)).join('')}`}
  </div>`;
}

/* Ce que l'été a changé en toi, en mots : jamais un chiffre d'axe à l'écran. */
function situationTete(){
  const g = S.progres || {};
  const monte = AXES.filter(a => g[a] > .8), baisse = AXES.filter(a => g[a] < -.8);
  const mot = { tech:'la technique', phys:'le physique', ment:'le mental', spec:'ton poste' };
  const l = [];
  if (monte.length) l.push(`Tu as pris de l'épaisseur : ${monte.map(a => mot[a]).join(', ')}.`);
  if (baisse.length) l.push(`Ça s'en va, aussi : ${baisse.map(a => mot[a]).join(', ')}.`);
  if (!l.length) l.push("Une année pour rien de plus, ni rien de moins.");
  if (S.partis && S.partis.length) l.push(`Au club : ${esc(S.partis.join(', '))} ${S.partis.length > 1 ? 'sont partis' : 'est parti'}.`);
  return `<p class="sub">${l.join(' ')}</p>`;
}
/* ---------------- le bilan de carrière ---------------- */
function ecranCarriere(){
  const c = S.carriere || { saisons:0, matchs:0, buts:0, passes:0, titres:0, clubs:[], annees:[] };
  const moy = moyCarriere();
  const meilleure = (c.annees || []).slice().sort((a, b) => (b.note || 0) - (a.note || 0))[0];
  return `<div class="card no-sticky">
    <div class="step">${S.annee} · ${S.moi.age} ans · c'est fini</div>
    <div class="big-ico">🏁</div>
    <h2>Ce qu'il restera</h2>
    <p class="narr">${S.fin && S.fin.raison === 'personne'
      ? "Personne n'a rappelé. On ne décide pas toujours du moment."
      : "Tu as fait le tour. Il y a un âge où le corps tranche à ta place."}</p>
    <div class="stats">
      <div><div class="v">${c.saisons}</div><div class="k">saisons</div></div>
      <div><div class="v">${c.matchs}</div><div class="k">matchs</div></div>
      <div><div class="v">${c.buts}</div><div class="k">buts</div></div>
      <div><div class="v">${c.passes}</div><div class="k">passes déc.</div></div>
      <div><div class="v">${moy == null ? '—' : virg(Math.round(moy * 100) / 100)}</div><div class="k">moyenne</div></div>
      <div><div class="v">${c.titres}${c.coupes ? `+${c.coupes}` : ''}${c.europes ? `+${c.europes}` : ''}</div>
        <div class="k">${[c.titres ? 'championnat' : '', c.coupes ? 'coupe' : '', c.europes ? 'europe' : ''].filter(Boolean).join(' · ') || 'trophée'}</div></div>
    </div>
    ${meilleure ? `<div class="bloc gagne"><span class="i">⭐</span><div><h4>Ta saison</h4>
      <p class="narr" style="margin:0">${meilleure.annee}-${meilleure.annee + 1} à ${esc(meilleure.club)} : ${meilleure.matchs} matchs, ${meilleure.buts} but${meilleure.buts > 1 ? 's' : ''}${meilleure.note == null ? '' : `, ${virg(meilleure.note)} de moyenne`}${meilleure.pos ? ` — ${meilleure.pos}ᵉ du championnat` : ''}.</p></div></div>` : ''}
    <h3>Saison par saison</h3>
    <div class="notes">${(c.annees || []).map(a => `<div>
      <span class="p">${String(a.annee).slice(2)}</span>
      <span>${esc(a.club)} <i>${a.matchs} m·${a.buts} b${a.pos ? ` · ${a.pos}ᵉ` : ''}</i>${a.pos === 1 ? ' 🏆' : ''}${a.coupe ? ' 🏅' : ''}${a.euro ? ' ⭐' : ''}</span>
      <span class="n">${a.note == null ? '—' : virg(a.note)}</span></div>`).join('')}</div>
    <p class="sub">Les clubs : ${esc((c.clubs || []).join(', ')) || '—'}.</p>
    <div class="btn-row"><button class="btn ghost" onclick="ouvrirJournal()">📓 Le journal</button>
      <button class="btn" onclick="recommencer()">Une autre carrière</button></div>
  </div>`;
}

/* ---------------- le journal ---------------- */
const JRN_ICO = { debut:'🎬', semaine:'🏋️', arret:'💬', moment:'⚡', match:'⚽', decouverte:'✨', saison:'🗓️', ete:'☀️', offre:'📞', fin:'🏁' };
function ecranJournal(){
  // Groupé par journée, la plus récente en haut : la liste brute était un mur.
  const par = [];
  S.journal.forEach(x => {
    const cle = x.annee + '·' + x.j;
    let g = par.find(y => y.cle === cle);
    if (!g){ g = { cle, annee:x.annee, j:x.j, lignes:[] }; par.push(g); }
    g.lignes.push(x);
  });
  par.reverse();
  return `<div class="card">
    <div class="step">Tout ce qui est arrivé, dans l'ordre</div>
    <h2>Le journal</h2>
    <p class="sub">C'est la seule mémoire du jeu : le bilan, la fin de carrière et le classement de tes parties en sortent.</p>
    ${par.map(g => `<h3>${g.lignes.every(x => x.type === 'saison')
        ? `Fin de saison ${g.annee}-${g.annee + 1}`
        : g.lignes.every(x => x.type === 'debut') ? `${g.annee} · le départ`
        : `${g.annee}-${g.annee + 1} · ${ordinal(Math.min(g.j, JOURNEES))} journée`}</h3>
      <div class="jrn">${g.lignes.map(x =>
        `<div><span>${JRN_ICO[x.type] || '•'}</span><span>${esc(x.txt)}</span></div>`).join('')}</div>`).join('')}
    <div class="btn-row"><button class="btn" onclick="fermerJournal()">Revenir</button></div>
    <p class="sub" style="margin:12px 0 0">Les coulisses : <a href="labo.html" style="color:var(--gold-dim)">le banc d'essai</a>,
      qui rejoue des saisons en accéléré pour vérifier qu'aucune option n'écrase les autres.</p>
  </div>`;
}
let RETOUR = 'semaine';
function ouvrirJournal(){ RETOUR = S.ecran; S.ecran = 'journal'; rendre(); }
function fermerJournal(){ S.ecran = RETOUR; rendre(); }

function recommencer(){
  if (!confirm("Effacer cette carrière et repartir de zéro ?")) return;
  effacer(); ETAPE = 0; NEW.origine = null; NEW.ambition = null; rendre();
}

/* ---------------- démarrage ---------------- */
function demarrer(){
  const d = charger();
  if (d){ S = d; if (S.ecran === 'journal') S.ecran = 'semaine';
    /* Ton club n'a qu'un effectif : le tien. Une sauvegarde d'avant le mercato en
       portait deux (le fantôme de la ligue et le vrai) ; c'est ici que ça se règle. */
    if (S.equipe && S.equipe.length) syncClubSq(); }
  rendre();
}
