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
    resultat:ecranResultat, bilan:ecranBilan, journal:ecranJournal }[S.ecran];
  el.innerHTML = topHTML() + (f ? f() : `<div class="card"><h2>Écran inconnu</h2><p class="sub">${esc(S.ecran)}</p></div>`);
  window.scrollTo(0, 0);
}

/* ---------------- création ---------------- */
function creationHTML(){
  if (ETAPE === 0) return `<div class="card">
    <div class="step">Création · étape 1 sur 3</div>
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
    <div class="step">Création · étape 2 sur 3</div>
    <h2>Où tu as appris à jouer</h2>
    <p class="narr">Ton époque et ton poste sont derrière toi. Reste le plus lourd : d'où tu viens.</p>
    ${ORIGINES.map((o, i) => optHTML(o.ico, o.nom, o.sub, origineDit(o), `setOrigine(${i})`)).join('')}
    <div class="btn-row"><button class="btn ghost" onclick="etape(0)">Retour</button></div>
    <p class="sub">Une qualité et un défaut sont tirés au sort autour de cette origine. Ils sont dans tes chiffres dès le premier match, mais <b>on ne te les nomme pas</b> : tu les découvriras en jouant.</p>
  </div>`;

  return `<div class="card">
    <div class="step">Création · étape 3 sur 3</div>
    <h2>Ce que tu veux de cette vie</h2>
    <p class="narr">À dix-huit ans, on a tous une idée de pourquoi on court. Elle changera peut-être.</p>
    ${AMBITIONS.map((a, i) => optHTML(a.ico, a.nom, a.sub, null, `setAmbition(${i})`)).join('')}
    <div class="btn-row"><button class="btn ghost" onclick="etape(1)">Retour</button></div>
  </div>`;
}
function origineDit(o){
  const d = [];
  const sp = POSTES.find(x => x.id === NEW.poste).spec;
  Object.entries(o.axes).forEach(([a, v]) => d.push({ c: v > 0 ? 'foot' : 'risk', t: `${v > 0 ? '▲' : '▼'} ${a === 'spec' ? sp : AXE_NOM[a]}` }));
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
  rendre();
}

/* ---------------- bandeau ---------------- */
const LIEN_NOM = { coach:"Le coach", vestiaire:"Le vestiaire", club:"Le club", supporters:"Le stade", agent:"Ton agent" };
const LIEN_ICO = { coach:"🎽", vestiaire:"✊", club:"🏟️", supporters:"📣", agent:"🤝",
  fraicheur:"🫁", blessure:"🩼", suspension:"🟥" };

function topHTML(){
  const pos = maPlace();
  return `<div class="top">
    <div><div class="who">${esc(S.moi.nom)}</div>
      <div class="sub">${esc(S.moi.posteNom)} · ${esc(S.club.nom)}</div></div>
    <div class="meta">${S.annee}-${S.annee + 1}<br>${ordinal(Math.min(S.journee + 1, JOURNEES))} journée sur ${JOURNEES}
      <br>${esc(S.club.nom)} ${ordinal(pos)}</div>
  </div>`;
}
function maPlace(){ return classementTrie().findIndex(x => x.nom === S.club.nom) + 1; }

/* « Ta situation » en fiche : le libellé à gauche, la phrase à droite, une ligne
   par chose. Le propriétaire la trouvait encore confuse avec les libellés
   empilés au-dessus de chaque phrase — hachés, ils se lisaient mal. Ici l'œil
   descend une seule colonne de noms et lit en face. */
function ligneSit(nom, txt){
  return `<div><span class="k">${esc(nom)}</span><span>${esc(txt)}</span></div>`;
}
function situationHTML(ouvert){
  const gens = Object.keys(LIEN_NOM).map(k => ligneSit(LIEN_NOM[k], dire(k))).join('')
    + ligneSit("Ta place", direPlace());
  const toi = ligneSit("Fraîcheur", direFraicheur() + " avant le match.")
    + ligneSit("Ton corps", direCorps())
    + ligneSit("Ton fond", direFond())
    + ligneSit("Ton geste", direGeste())
    + ligneSit("Ta tête", direEncaisse());
  let tire = '';
  if (S.moi.qual.vu){ const q = QUALITES.find(x => x.id === S.moi.qual.id); tire += ligneSit(q.nom, q.dit); }
  if (S.moi.def.vu){ const f = DEFAUTS.find(x => x.id === S.moi.def.id); tire += ligneSit(f.nom, f.dit); }
  return `<details class="fold"${ouvert ? ' open' : ''}><summary>Ta situation</summary>
    <h3>Autour de toi</h3><div class="fiche">${gens}</div>
    <h3>Toi</h3><div class="fiche">${toi}</div>
    ${tire ? `<h3>Ce qu'on sait de toi</h3><div class="fiche">${tire}</div>` : ''}
    <p class="narr" style="margin-top:12px">${esc(direStaff())}</p>
    <p class="sub">${S.stats.matchs} match${S.stats.matchs > 1 ? 's' : ''} joué${S.stats.matchs > 1 ? 's' : ''}${S.stats.titus ? `, dont ${S.stats.titus} comme titulaire` : ''}${S.stats.buts ? ` \u00b7 ${S.stats.buts} but${S.stats.buts > 1 ? 's' : ''}` : ''}${S.stats.notes.length ? ` \u00b7 moyenne ${virg(moyenneNotes())}` : ''}.</p>
  </details>`;
}

/* L'effectif, avec la moyenne de chacun : c'est ce qui donne le contexte —
   qui tourne bien, qui décroche, et où tu te situes là-dedans. */
function effectifHTML(){
  if (!S.equipe || !S.equipe.length) return '';
  const l = effectifTrie();
  return `<details class="fold"><summary>L'effectif</summary>
    <div class="squad">${l.map(j => `<div${j.moi ? ' class="me"' : ''}>
      <span class="p">${j.poste}</span>
      <span><b>${esc(j.nom)}</b>${j.moi ? ' <i>toi</i>' : j.rival ? ' <i>ton poste</i>' : j.monte ? ' <i>il monte</i>' : ''}
        <span class="sub2">${j.age} ans${j.blesse ? ' \u00b7 \u00e0 l\u2019infirmerie' : j.rel ? ' \u00b7 ' + j.rel : ''}</span></span>
      <span class="n">${j.moy == null ? '\u2014' : virg(j.moy)}<i>${j.nb} m</i></span></div>`).join('')}</div>
    <p class="sub">La moyenne de chacun sur la saison, et le nombre de matchs notés.</p>
  </details>`;
}
const virg = v => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');

function classementHTML(){
  const t = classementTrie();
  return `<details class="fold"><summary>Le classement</summary><div class="rank">
    ${t.map((e, i) => `<div${e.nom === S.club.nom ? ' style="border-color:var(--gold-dim)"' : ''}>
      <span class="m">${i + 1}</span><span>${esc(e.nom)}</span>
      <span class="tag">${e.pts} pts · ${e.j} j · ${e.v || 0}V ${e.n || 0}N ${e.d || 0}D · ${e.bp - e.bc > 0 ? '+' : ''}${e.bp - e.bc}</span></div>`).join('')}
  </div></details>`;
}
function liensJournal(){
  return `<div class="btn-row"><button class="btn ghost" onclick="ouvrirJournal()">📓 Le journal</button></div>`;
}

/* ---------------- la semaine ---------------- */
function ecranSemaine(){
  const adv = adversaire(S.journee);
  const empeche = S.etats.blessure > 0 ? "blessure" : S.etats.suspension > 0 ? "suspension" : null;
  const entete = adv.dom ? `${S.club.nom} reçoit ${adv.nom}` : `${S.club.nom} se déplace à ${adv.nom}`;
  return `<div class="card">
    <div class="step">${esc(entete)}</div>
    <h2>Ta semaine</h2>
    <p class="narr">Trois jours de travail, et une seule chose que tu peux vraiment décider.</p>
    ${empeche === 'blessure' ? `<div class="lack"><b>Tu es à l'infirmerie.</b> Encore ${S.etats.blessure} journée${S.etats.blessure > 1 ? 's' : ''}. Ce que tu fais de la semaine compte quand même.</div>` : ''}
    ${empeche === 'suspension' ? `<div class="lack"><b>Tu es suspendu.</b> Encore ${S.etats.suspension} match${S.etats.suspension > 1 ? 's' : ''}. Tu t'entraînes sans jouer.</div>` : ''}
    ${concurrenceHTML()}
    <h3>Ce que tu travailles</h3>
    ${SEMAINES.map(s => optHTML(s.ico, s.nom, s.sub, s.dit, `choisirSemaine('${s.id}')`)).join('')}
  </div>
  ${situationHTML(false)}${effectifHTML()}${classementHTML()}${liensJournal()}`;
}

/* Qui se bat avec toi pour la place. Des noms, pas un nombre : c'est ce que le
   coach compare quand il fait son onze. */
function concurrenceHTML(){
  if (!S.concurrents || !S.concurrents.length) return '';
  const moi = valeurAuPoste();
  const l = S.concurrents.map(c => {
    if (c.blesse > 0) return { i:'🩼', t:`${c.nom} est à l'infirmerie` };
    const e = (c.niv + c.forme) - moi;
    return { i: e > 0 ? '🔺' : '🔻',
      t: e > 6 ? `${c.nom} est largement devant toi`
        : e > 2 ? `${c.nom} passe devant toi`
        : e > -2 ? `${c.nom} et toi, c'est au coude à coude`
        : e > -6 ? `tu passes devant ${c.nom}` : `${c.nom} n'est plus une menace` };
  });
  return `<h3>Ta place</h3><div class="words">${l.map(x =>
    `<div><span class="i">${x.i}</span><span>${esc(x.t)}</span></div>`).join('')}</div>`;
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
function ecranResultat(){
  const m = S.dernier;
  const gauche = m.adv.dom ? S.club.nom : m.adv.nom, droite = m.adv.dom ? m.adv.nom : S.club.nom;
  const score = m.adv.dom ? `${m.bn} – ${m.be}` : `${m.be} – ${m.bn}`;
  const maLigne = m.minutes
    ? `${m.entree ? `Entré à la ${ordinal(m.entree)}` : "Titulaire"} · ${m.minutes} minutes · note ${virg(m.note)}${m.buts ? ` · ${m.buts} but${m.buts > 1 ? 's' : ''}` : ''}${m.passes ? ` · ${m.passes} passe${m.passes > 1 ? 's' : ''} décisive${m.passes > 1 ? 's' : ''}` : ''}`
    : m.statut === 'banc' ? "Resté sur le banc toute la rencontre"
    : m.statut === 'blesse' ? "À l'infirmerie" : m.statut === 'suspendu' ? "Suspendu" : "Hors du groupe";
  const fin = S.journee + 1 >= JOURNEES;
  return `<div class="card">
    <div class="step">${ordinal(S.journee + 1)} journée · terminé</div>
    <div class="score"><span class="big">${score}</span><div><b>${esc(gauche)}</b> – ${esc(droite)}<br><span class="sub">${maLigne}</span></div></div>
    ${m.seance ? `<h3>Ta semaine</h3><p class="narr">${esc(m.seance.texte)}</p>` : ''}
    <h3>Le film du match</h3>
    <div class="tl">${filmHTML(m)}</div>
    ${m.decouverte ? `<h3>${m.decouverte.bon ? "Ce qu'on a vu en toi" : "Ce qui s'est vu aussi"}</h3>
      <div class="bloc ${m.decouverte.bon ? 'gagne' : 'perdu'}"><span class="i">${m.decouverte.ico}</span>
        <div><h4>${esc(m.decouverte.nom)}</h4><p class="narr" style="margin:0">${esc(m.decouverte.dit)}</p>
        <p class="sub" style="margin:4px 0 0">${esc(m.decouverte.axe)} · c'était dans tes chiffres depuis le premier jour.</p></div></div>` : ''}
    ${m.notes && m.notes.length > 1 ? `<h3>Les notes du match</h3>
      ${m.jugement ? `<p class="narr">${esc(m.jugement)}</p>` : ''}
      <div class="notes">${m.notes.map(j => `<div${j.moi ? ' class="me"' : ''}>
        <span class="p">${j.poste}</span><span>${esc(j.nom)}${j.rival ? ' <i>(ton poste)</i>' : ''}</span>
        <span class="n">${virg(j.note)}</span></div>`).join('')}</div>` : ''}
    ${m.mvt && m.mvt.length ? `<h3>Ce que ça change</h3><div class="mvt">${m.mvt.map(x =>
      `<div><span class="${x.up ? 'up' : 'dn'}">${LIEN_ICO[x.k] || '•'}</span><span>${esc(x.mot)}</span></div>`).join('')}</div>` : ''}
    <div class="btn-row"><button class="btn" onclick="apresMatch()">${fin ? "Le bilan de la saison" : "La semaine suivante"}</button></div>
  </div>
  ${classementHTML()}${liensJournal()}`;
}
function filmHTML(m){
  const lignes = [];
  if (m.entree) lignes.push({ min:m.entree, moi:true, ico:'🔄', t:"Tu entres en jeu" });
  m.evs.forEach(e => {
    const eux = !e.nous, qui = e.qui || (eux ? `un joueur de ${m.adv.nom}` : "un coéquipier");
    if (e.type === 'but') lignes.push({ min:e.min, moi:!!(e.moi || e.passeMoi), ico:'⚽',
      t: e.moi ? `<b>Ton but</b>` : e.passeMoi ? `But de ${esc(qui)}, <b>sur ta passe</b>`
        : eux ? `But de ${esc(m.adv.nom)}` : `But de ${esc(qui)}` });
    if (e.type === 'jaune') lignes.push({ min:e.min, moi:!!e.moi, ico:'🟨', t: `${esc(e.moi ? S.moi.nom : qui)} averti` });
    if (e.type === 'rouge') lignes.push({ min:e.min, moi:!!e.moi, ico:'🟥', t: `${esc(e.moi ? S.moi.nom : qui)} exclu` });
    if (e.type === 'penalty') lignes.push({ min:e.min, moi:false, ico:'🎪', t: `Penalty pour ${esc(e.nous ? S.club.nom : m.adv.nom)}` });
    if (e.type === 'blessure') lignes.push({ min:e.min, moi:false, ico:'🩼', t: `Sortie sur blessure — ${esc(qui)}` });
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
    <p class="sub">La trêve, les offres, la progression d'une saison sur l'autre : c'est la suite du moteur. Ici s'arrête ce qui est jouable.</p>
    <div class="btn-row"><button class="btn ghost" onclick="ouvrirJournal()">📓 Le journal</button>
      <button class="btn" onclick="recommencer()">Recommencer</button></div>
  </div>
  ${effectifHTML()}${classementHTML()}`;
}

/* ---------------- le journal ---------------- */
const JRN_ICO = { debut:'🎬', semaine:'🏋️', arret:'💬', moment:'⚡', match:'⚽', decouverte:'✨', saison:'🗓️' };
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
  if (d){ S = d; if (S.ecran === 'journal') S.ecran = 'semaine'; }
  rendre();
}
