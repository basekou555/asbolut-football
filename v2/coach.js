/* ============================================================
   ABSOLUT COACH 2 — LE MODE ENTRAÎNEUR·EUSE
   Le propriétaire, 01/10/2026 : « vas-y pour le mode entraîneur en 2.0 ».

   CE QUI EST RÉUTILISÉ TEL QUEL, et c'est le gros de l'affaire : le monde.
   `moteur.js` porte déjà deux divisions de dix-huit clubs, chacun avec vingt-deux
   joueurs nommés qui vieillissent, un marché qui les échange, des montées et des
   descentes, la coupe, l'Europe, le film d'un match, les notes de tout le monde et
   le journal. Un entraîneur·euse n'a pas besoin d'un autre monde : il a besoin
   d'une autre place dedans. Ce fichier ne refait donc ni la ligue, ni le marché,
   ni les notes — il refait **la semaine, le match vu du banc, les arrêts, le
   président et le bilan**.

   CE QUI CHANGE, DIT EN UNE LIGNE : le joueur·euse se bat pour sa place dans un
   onze ; l'entraîneur·euse se bat pour **garder son poste**, et ce qu'il a entre
   les mains n'est pas son corps mais vingt-deux personnes et une semaine.

   Les sept verrous du 2.0 s'appliquent sans exception : aucune valeur de jauge à
   l'écran, un match en trois clics, le match est simulé et non opéré, quatre axes,
   le journal est la seule mémoire. Et la règle des arrêts du 30/09 : **chaque
   option coûte et gagne quelque chose, dans deux monnaies différentes.**
   ============================================================ */

/* ---------------- les quatre axes ---------------- */
/* Comme pour le joueur·euse : un coût tout de suite, un effet nommé plus tard, et
   surtout **un effet mécanique par axe, pas quatre noms pour « du niveau »** —
   c'est le défaut que le propriétaire avait trouvé en 1.0, où `management`
   n'était lu nulle part et où la barre latérale promettait pourtant « vestiaire,
   jeunes, présidents ». */
const CAXES = ['jeu', 'groupe', 'banc', 'reseau'];
const CAXE_NOM = { jeu:"Le jeu", groupe:"Le vestiaire", banc:"Le banc", reseau:"Le réseau" };
const CAXE_MOT = {
  jeu:"ton jeu", groupe:"ton vestiaire", banc:"ton banc", reseau:"ton réseau" };
/* Ce que chacun fait, et c'est écrit à l'écran parce que sinon ça n'existe pas :
   - `jeu`      : entre dans la force de l'équipe à chaque match (±1,65 quand
                  l'avantage du terrain vaut 2,40) ;
   - `groupe`   : les trois ententes montent plus vite et tombent moins, et il
                  amortit ce qu'une mauvaise série coûte au président ;
   - `banc`     : la réussite de tes décisions en cours de match, et ce qu'un
                  changement rapporte ;
   - `reseau`   : ce que la direction te laisse faire, et qui t'appelle en juin. */
const C_JEU = .055, C_BANC = .006, C_GROUPE = .012;
const CBOOST = 3.2, CTRACE = .55;
const CPOT_MIN = 58, CPOT_MAX = 84;

const CORIGINES = [
  { id:'joueur', nom:"Ancien joueur", sous:"Tu as eu une carrière. Le vestiaire le sait.",
    axes:{ groupe:10, banc:10, jeu:-10 }, liens:{ supporters:8, presse:6 },
    u0:"Tu as porté le maillot. On te le rappellera à chaque défaite." },
  { id:'adjoint', nom:"Monté du banc", sous:"Quinze ans adjoint, des carnets partout.",
    axes:{ jeu:10, banc:10, reseau:-10 }, liens:{ president:6, direction:6 },
    u0:"Tu connais le métier par en dessous. Personne ne te connaît par en haut." },
  { id:'formateur', nom:"Venu du centre",
    sous:"Tu as formé ceux qui jouent aujourd'hui.",
    axes:{ groupe:10, jeu:10, banc:-10 }, liens:{ direction:8, presse:-4 },
    u0:"Tu sais faire grandir quelqu'un. Un soir de match, c'est autre chose." },
];
const CAMBITIONS = [
  { id:'titres', nom:"Gagner", sous:"Un trophée, ou rien.", u0:"Tu es venu pour un trophée." },
  { id:'maison', nom:"Bâtir une maison", sous:"Rester, et laisser un club meilleur.",
    u0:"Tu veux laisser un club meilleur que celui qu'on t'a confié." },
  { id:'jeunes', nom:"Faire éclore", sous:"Des gamins qui deviennent des joueurs.",
    u0:"Tu veux qu'on dise : c'est lui qui les a lancés." },
];
/* La roulette, comme pour le joueur·euse : quinze points en plus sur un axe,
   quinze en moins sur un autre, tirés au sort et jamais plus modifiés. Le
   propriétaire y tenait (« avoir des défauts ça rajoute un peu plus de flou…
   sinon on peut un peu trop optimiser si on connaît ce qui fonctionne »). */
const CQUALITES = [
  { id:'lecture', axe:'jeu', nom:"La lecture du match", t:"Tu vois où ça casse avant que ça casse : tes plans de jeu tombent juste." },
  { id:'verbe', axe:'groupe', nom:"Le verbe", t:"Tu parles et la pièce se tait. Un vestiaire te suit sans qu'on sache pourquoi." },
  { id:'instinct', axe:'banc', nom:"L'instinct", t:"Tes changements tombent à la bonne minute plus souvent qu'ils ne devraient." },
  { id:'carnet', axe:'reseau', nom:"Le carnet", t:"Tu as un numéro pour chaque situation, et on décroche." },
];
const CDEFAUTS = [
  { id:'rigide', axe:'jeu', nom:"La rigidité", t:"Ton plan est bon, et tu t'y accroches même quand il ne marche plus." },
  { id:'distant', axe:'groupe', nom:"La distance", t:"Tu gardes les joueurs à un mètre. Certains n'y arrivent pas." },
  { id:'fige', axe:'banc', nom:"Le banc figé", t:"Tu attends une minute de trop avant de changer quelque chose." },
  { id:'solitaire', axe:'reseau', nom:"Le solitaire", t:"Tu ne demandes rien à personne, et personne ne te propose rien." },
];

/* ---------------- la semaine ---------------- */
/* UNE SEULE DÉCISION PAR SEMAINE, ET ELLE COÛTE LES JAMBES DU GROUPE. C'est la
   transposition exacte de l'arbitrage du joueur·euse : la fraîcheur n'est plus la
   tienne, c'est celle de vingt-deux personnes, et c'est elle qui décide de ce que
   l'équipe produira samedi. Six cartes, chacune avec **un coût et un gain**, et
   aucune qui ait les deux. */
const CSEMAINES = [
  { id:'video', nom:"La vidéo de l'adversaire", ico:'📼',
    sous:"Deux séances devant l'écran, un plan précis",
    fit:-5, axe:'jeu', plan:1.2,
    dits:[{c:'foot', t:"⚽ +de force samedi, un plan sur mesure"}, {c:'foot', t:"🧠 ton jeu : la trace"}, {c:'risk', t:"🫁 des jambes en moins"}] },
  { id:'athle', nom:"La semaine athlétique", ico:'💪',
    sous:"Du volume, des côtes, rien de joli",
    fit:-9, forme:.9, athle:1,
    dits:[{c:'foot', t:"🏋️ le groupe récupère plus vite, et se blesse moins"}, {c:'risk', t:"🫁 samedi se jouera sur les jambes"}] },
  { id:'indiv', nom:"Les individuels", ico:'🎯',
    sous:"Trois joueurs, une heure de plus chacun",
    fit:-5, axe:'banc', indiv:3, formeIndiv:3.4,
    dits:[{c:'foot', t:"👤 trois joueurs nommés retrouvent la forme"}, {c:'foot', t:"🪑 ton banc : la trace"}, {c:'risk', t:"🫁 des jambes en moins"}] },
  { id:'vestiaire', nom:"Le vestiaire", ico:'✊',
    sous:"Une réunion, des quatre-z-yeux, du temps",
    fit:-4, axe:'groupe', ligne:2.6,
    dits:[{c:'foot', t:"✊ les trois lignes se resserrent"}, {c:'foot', t:"🧩 ton vestiaire : la trace"}, {c:'risk', t:"🫁 une séance en moins"}] },
  { id:'bureau', nom:"Le bureau", ico:'📞',
    sous:"Des coups de fil, un déjeuner, des dossiers",
    fit:0, axe:'reseau', ligneDown:2.6,
    dits:[{c:'foot', t:"🤝 ton réseau : la trace"}, {c:'risk', t:"✊ tu n'es pas sur le terrain, ils le sentent"}] },
  { id:'repos', nom:"Deux jours de repos", ico:'🌿',
    sous:"On rentre chez soi, on revient jeudi",
    fit:11,
    dits:[{c:'foot', t:"🫁 les jambes reviennent"}, {c:'risk', t:"🚫 rien de construit"}] },
];
/* Ce que la semaine coûte, et ce qu'elle rend. Un match prend 11 points de
   fraîcheur au groupe, un mercredi européen 7 de plus, et une journée en rend 9,6 —
   donc un calendrier chargé descend tout seul, et c'est au coach de décider quand
   il lâche du lest. */
/* CALIBRÉ PAR LA MESURE, et la première version était fausse. À 9,6 de
   récupération pour 11 de match, le net hebdomadaire était négatif **quelle que
   soit** la semaine choisie : mesuré sur deux saisons, le groupe était collé à 0 de
   la vingtième journée à la fin, donc la décision de la semaine ne coûtait plus
   rien — il n'y avait plus rien à dépenser. À 10,5, une semaine de repos sur trois
   tient la fraîcheur à plat (−5,5 −4,5 +10,5 = +0,5) : on peut donc tout tenir, à
   condition de lâcher du lest régulièrement, et une saison européenne (−7 de plus
   le mercredi) ne se tient pas sans rotation. C'est l'arbitrage. */
const C_MATCH_FR = 11, C_MERCREDI_FR = 7, C_RECUP_FR = 10.5;
/* LA SEMAINE ATHLÉTIQUE N'AVAIT AUCUNE CONTREPARTIE, et le banc d'essai l'a dit :
   29,2 points et 15,8ᵉ place contre 37,7 et 12,8 pour la meilleure ligne, pour une
   trace de 0,7. La cause était mécanique et je ne l'avais pas vue : `bougerForme()`
   est borné à ±5, donc la forme de tout le groupe **saturait au bout de cinq
   semaines** et les vingt-neuf suivantes étaient du coût pur.
   Ce qu'elle construit maintenant, c'est la **condition du groupe** — et c'est la
   formulation que le propriétaire avait lui-même donnée pour le physique du
   joueur·euse le 30/09 (« il ne faut pas qu'un entraînement de physique augmente la
   fraîcheur ; il faut qu'il augmente la vitesse de récupération »). Deux effets
   nommés, aucun sur la fraîcheur du jour : on récupère plus vite entre deux
   journées, et on se blesse moins. Elle s'en va si on ne l'entretient pas. */
const C_ATHLE_MAX = 6, C_ATHLE_OUBLI = .82;
function cCondition(){ return clamp(S.grp.athle || 0, 0, C_ATHLE_MAX); }
function cRecup(){ return C_RECUP_FR * (1 + cCondition() * .05); }

function cNouvellePartie(c){
  const base = {}; CAXES.forEach(a => base[a] = 50);
  Object.entries(c.origine.axes).forEach(([a, v]) => base[a] = clamp(base[a] + v));
  const q = pick(CQUALITES);
  const f = pick(CDEFAUTS.filter(x => x.axe !== q.axe));
  base[q.axe] = clamp(base[q.axe] + 15);
  base[f.axe] = clamp(base[f.axe] - 15);
  const plafond = {}; CAXES.forEach(a => plafond[a] = ri(CPOT_MIN, CPOT_MAX));
  const socle = {}; CAXES.forEach(a => socle[a] = Math.min(50 + (c.origine.axes[a] || 0), base[a]));
  const pic = { ...base };
  const ligue = creerLigue(c.annee);
  /* ON NE CONFIE PAS UN GRAND CLUB À UN DÉBUTANT. Le premier banc est dans le bas
     du tableau — c'est là qu'on commence, et c'est ce qui donne un sens à la
     première saison : survivre. */
  const club = ligue.equipes[ri(ligue.equipes.length - 5, ligue.equipes.length - 1)];
  S = {
    v: VERSION, mode: 'coach', annee: c.annee, division: 1, argent: 0, salaire: 0,
    moi: { nom: c.nom, age: ri(36, 46), base, boost: { jeu:0, groupe:0, banc:0, reseau:0 },
      plafond, socle, pic, an0: { ...base }, u0: c.origine.u0,
      origine: c.origine.id, ambition: c.ambition.id,
      qual: { id:q.id }, def: { id:f.id } },
    club: { nom: club.nom, force: club.force },
    equipe: [], concurrents: [],
    ligue, lignes: { def:50, mil:50, att:50 },
    liens: { president:56, direction:50, supporters:46, presse:50 },
    grp: { fr: 100, plan: 0, athle: 0 },
    vie: { proches: 58, chantiers: [], gagne: 0, gagneAvant: 0, salaire0: 0, grosFait: false, prochesPlancher: 0 },
    journee: 0, arrets: 0, saisonsClub: 0, vire: null, serie: [],
    coupe: { vivant:true, tour:0, hist:[], gagnee:false },
    euro: { engage:false, vivant:true, tour:0, pts:0, hist:[], gagnee:false },
    semaine: null, seance: null, match: null, dernier: null, arret: null, annexe: null,
    stats: { j:0, v:0, n:0, d:0, bp:0, bc:0, decisions:0 },
    journal: [], ecran: 'csemaine',
  };
  Object.entries(c.origine.liens || {}).forEach(([k, v]) => {
    if (k === 'vestiaire') LIGNES.forEach(l => S.lignes[l] = clamp(S.lignes[l] + v));
    else S.liens[k] = clamp((S.liens[k] || 50) + v);
  });
  S.ligneRef = { ...S.lignes };
  cLireEffectif();
  cPoserObjectif();
  poserSalaire(cSalaire());
  jrn('debut', `${S.moi.nom}, entraîneur·euse de ${S.club.nom}. ${nomDivision()}, objectif ${S.objectif}ᵉ.`);
  sauver(); return S;
}

/* ---------------- l'effectif, qui est celui du club ---------------- */
/* UN ENTRAÎNEUR·EUSE N'A PAS DE CONCURRENT À SON POSTE : il a un effectif. Les
   vingt-deux joueurs de son club sont **ceux de la ligue** — ceux qu'on lit au
   classement, ceux que le marché déplace — et non un groupe tiré au sort pour
   l'occasion. `S.concurrents` reste vide : c'est ce qui fait que tout le code
   partagé (le onze du jour, les notes, les changements) marche sans savoir qu'il
   n'y a personne qui s'appelle « moi ». */
function cLireEffectif(){
  const e = monClub(); if (!e) return;
  const avant = {}; (S.equipe || []).forEach(j => avant[j.nom] = j);
  const l = [];
  e.sq.forEach(j => {
    const old = avant[j.n];
    if (old){ old.age = j.a; old.niv = Math.round(j.v); old.pot = j.t; old.poste = j.p; l.push(old); }
    else l.push({ nom:j.n, poste:j.p, age:j.a, niv: Math.round(j.v), pot:j.t,
      forme:0, blesse:0, susp:0, prog:0, note:null });
  });
  S.equipe = l; S.concurrents = [];
  delete S.equipe.monte;
  S.equipe.forEach(j => delete j.monte);
  const jeune = S.equipe.filter(j => j.age <= 22).sort((a, b) => a.age - b.age)[0];
  if (jeune) jeune.monte = true;
  S.club.force = e.force;
}
function cSyncEffectif(){
  const e = monClub(); if (!e || !S.equipe.length) return;
  e.sq = S.equipe.map(j => { if (j.pot == null) j.pot = potDe(j.niv, j.age);
    return { n:j.nom, p:j.poste, a:j.age, v:j.niv, t:j.pot }; });
  e.force = forceEffectif(e.sq);
  S.club.force = e.force;
}

/* ---------------- les axes ---------------- */
function cAxe(a){ return clamp(S.moi.base[a] + S.moi.boost[a], 0, 100); }
function cPlafondReel(a){
  const autres = CAXES.filter(x => x !== a).map(x => S.moi.base[x]);
  return Math.min(S.moi.plafond[a], autres.reduce((s, v) => s + v, 0) / autres.length + 25);
}
function cBougerAxe(a, d){
  if (!d) return;
  const v = S.moi.base[a];
  S.moi.base[a] = d > 0 ? Math.min(clamp(v + d), cPlafondReel(a))
    : Math.max(clamp(v + d), S.moi.socle[a]);
  if (S.moi.base[a] > (S.moi.pic[a] || 0)) S.moi.pic[a] = S.moi.base[a];
}
/* Ce que ton vestiaire amortit : une mauvaise série coûte moins de confiance quand
   le groupe tient. Jamais les gains — comme le mental du joueur·euse. */
function cEncaisse(){ return clamp((cAxe('groupe') - 50) / 50, -1, 1); }
function cCoutPresident(pts, raison){
  const p = pts * (1 - clamp(cEncaisse(), -.5, .8) * .5);
  S.liens.president = clamp(S.liens.president - p);
  S.derniereRaison = raison || null;
  return p;
}
/* Le vestiaire fait monter les ententes plus vite et les retient quand elles
   tombent : c'est son effet de football, et il est mesurable. */
function cBougerLigne(k, v){
  if (!v) return;
  const g = (cAxe('groupe') - 50) * C_GROUPE;
  bougerLigne(k, v > 0 ? v * (1 + g) : v / (1 + Math.max(0, g)));
}
function cBougerVestiaire(v){ LIGNES.forEach(k => cBougerLigne(k, v)); }

/* ---------------- le contrat, l'objectif, le salaire ---------------- */
/* L'OBJECTIF EST CE QUI TE JUGE, ET IL EST DIT AVANT LA PREMIÈRE JOURNÉE. En 1.0
   il pouvait être durci en silence (« l'offre disait 10ᵉ, la saison jouait 6ᵉ ») :
   ici il découle du rang de ton effectif dans le championnat, et il est écrit. */
function cRangEffectif(){
  const l = S.ligue.equipes.slice().sort((a, b) => b.force - a.force);
  return l.findIndex(e => e.nom === S.club.nom) + 1;
}
function cPoserObjectif(){
  const r = cRangEffectif(), N = S.ligue.equipes.length;
  /* On te demande un peu mieux que ce que vaut ton groupe : deux places, et jamais
     plus bas que le maintien. C'est ce petit écart qui rend une saison tendue. */
  S.objectif = clamp(Math.round(r - 2), 1, N - MONTEES);
  S.objPromis = S.objectif;
}
function cSalaire(){
  const base = salaireDe(S.club.force, 40, S.club.force, S.division || 1);
  return Math.round(base * clamp(.55 + (S.liens.president - 50) * .006, .4, 1.1) * 1000) / 1000;
}
/* La force de ton équipe un samedi. C'est la seule formule, et tout l'écran en
   découle : quatre contributions nommées, pour qu'aucun chiffre affiché n'existe
   sans conséquence. L'avantage du terrain vaut 2,40 — c'est l'étalon. */
function cForce(ecart){
  return S.club.force + (ecart || 0)
    + (vestiaire() - 50) * .04
    + (cAxe('jeu') - 50) * C_JEU
    + (S.grp.plan || 0)
    + (S.grp.fr - 80) * .022;
}
function cDetailForce(ecart){
  return [
    { k:'effectif', t:"L'effectif", v: S.club.force },
    { k:'groupe', t:"Le vestiaire", v: (vestiaire() - 50) * .04 },
    { k:'jeu', t:"Ton jeu", v: (cAxe('jeu') - 50) * C_JEU },
    { k:'plan', t:"Le plan de la semaine", v: S.grp.plan || 0 },
    { k:'jambes', t:"Les jambes du groupe", v: (S.grp.fr - 80) * .022 },
    { k:'infirmerie', t:"L'infirmerie", v: ecart || 0 },
  ];
}

/* ---------------- la semaine ---------------- */
function cChoisirSemaine(id){
  const s = CSEMAINES.find(x => x.id === id) || CSEMAINES[0];
  S.semaine = s.id;
  S.grp.plan = 0;
  S.grp.fr = clamp(S.grp.fr + s.fit, 0, 100);
  let txt = '';
  if (s.plan){ S.grp.plan = s.plan; txt = `Ils savent où appuyer. Le plan tient — samedi, l'équipe produira plus.`; }
  if (s.forme) S.equipe.forEach(j => bougerForme(j, s.forme));
  if (s.athle){
    S.grp.athle = Math.min(C_ATHLE_MAX, (S.grp.athle || 0) + s.athle);
    txt = `Personne n'a aimé la semaine. Samedi, ils l'auront dans les jambes — et dans quinze jours, ils te remercieront.`;
  }
  if (s.indiv){
    /* Les individuels nomment des gens : c'est ce qui manquait à la 1.0, où
       « travailler avec trois joueurs » ne désignait personne. On prend ceux qui
       vont le moins bien, parce que c'est ce qu'un coach fait. */
    const l = S.equipe.filter(j => dispoDe(j)).sort((a, b) => (a.forme || 0) - (b.forme || 0)).slice(0, s.indiv);
    l.forEach(j => bougerForme(j, s.formeIndiv || 2.2));
    S.semaineIndiv = l.map(j => j.nom);
    txt = l.length ? `Une heure de plus avec ${liste(l.map(j => j.nom))}. Ils sont sortis plus légers.` : '';
  } else S.semaineIndiv = null;
  if (s.ligne){ cBougerVestiaire(s.ligne); txt = `Deux heures à parler. Les lignes se sont reparlé.`; }
  if (s.ligneDown){ cBougerVestiaire(-s.ligneDown); txt = `Tu as avancé des dossiers. Sur le terrain, l'adjoint a tenu la séance.`; }
  if (s.id === 'repos') txt = `Ils sont rentrés chez eux. Jeudi, ils avaient des jambes.`;
  /* La trace : le rendement baisse près du plafond, et c'est le compte rendu qui
     l'apprend — exactement comme pour le joueur·euse. */
  if (s.axe){
    const marge = Math.max(0, cPlafondReel(s.axe) - S.moi.base[s.axe]) / 100;
    const tirage = pick([.4, 1, 1, 1.6]);
    S.moi.boost[s.axe] = clamp(S.moi.boost[s.axe] + CBOOST * tirage * (cAxe(s.axe) / 100), 0, 14);
    cBougerAxe(s.axe, CTRACE * tirage * marge * 4);
    txt += ` ` + (tirage >= 1.6 ? `Tu as appris quelque chose cette semaine.`
      : tirage >= 1 ? `Du travail honnête.` : `Tu n'as rien tiré de cette séance.`);
    if (marge < .08) txt += ` À ce niveau-là, tu ne progresses plus beaucoup là-dessus.`;
  }
  S.seance = { id:s.id, nom:s.nom, texte: txt.trim() };
  jrn('semaine', `${s.nom}.`);
  /* MERCREDI AVANT SAMEDI, comme pour le joueur·euse : le match de coupe ou
     d'Europe se joue avant qu'on pose le groupe du week-end, donc ses jambes
     entrent dans le onze de samedi. C'est là qu'est l'arbitrage de la rotation. */
  const info = matchAnnexe(S.journee);
  S.annexe = info ? cJouerAnnexe(info) : null;
  cApresSemaine();
}
function cApresSemaine(){ cPoserEquipeDuJour(); cOuvrirArrets(); }
function cPoserEquipeDuJour(){
  const eq = equipeDuJour();
  S.eqJour = { onze: eq.onze.map(x => x.nom), banc: eq.banc.map(x => x.nom),
    reserve: eq.reserve.map(x => x.nom), ecart: eq.ecart,
    absents: eq.absents.map(x => ({ nom:x.nom, poste:x.poste, raison: x.ref.susp > 0 ? 'susp' : 'blesse' })),
    choix: Object.fromEntries([...eq.onze, ...eq.banc, ...eq.reserve].map(x => [x.nom, x.choix])) };
}
function cEquipeDuJourLue(){
  const g = groupe();
  const par = {}; g.forEach(x => par[x.nom] = x);
  const e = S.eqJour;
  if (!e){ cPoserEquipeDuJour(); return cEquipeDuJourLue(); }
  const pr = l => (l || []).map(n => par[n]).filter(Boolean);
  const onze = pr(e.onze), banc = pr(e.banc), reserve = pr(e.reserve);
  [...onze, ...banc, ...reserve].forEach(x => x.choix = (e.choix || {})[x.nom] || x.niv);
  return { onze, banc, reserve, ecart: e.ecart || 0,
    absents: g.filter(x => !x.dispo) };
}
const liste = l => l.length <= 1 ? (l[0] || '') : l.slice(0, -1).join(', ') + ' et ' + l[l.length - 1];

/* ---------------- le mercredi ---------------- */
function cJouerAnnexe(info){
  const adv = advAnnexe(info);
  const eq = equipeDuJour(info.c === 'coupe' ? ROTATION_COUPE : ROTATION);
  const nous = cForce(eq.ecart) + 1.2;
  const diff = nous - adv.force;
  let bn = poisson(tameXG(1.35 * Math.exp(diff / 19)));
  let be = poisson(tameXG(1.35 * Math.exp(-diff / 19)));
  const m = { comp: info.c, tour: info.t, adv: adv.nom, bn, be, prolong:false, tab:false };
  const groupePhase = info.c === 'euro' && info.t <= 5;
  if (!groupePhase && bn === be){
    if (Math.random() < .5){ m.tab = true; m.tabNous = Math.random() < .5 + diff * .006; }
    else { m.prolong = true;
      if (Math.random() < .5 + diff * .01) m.bn = ++bn; else m.be = ++be; }
  }
  m.res = m.tab ? (m.tabNous ? 'V' : 'D') : bn > be ? 'V' : bn === be ? 'N' : 'D';
  // mercredi coûte samedi, et c'est tout l'intérêt de la rotation
  S.grp.fr = clamp(S.grp.fr - C_MERCREDI_FR, 0, 100);
  /* Les jambes de ceux qui ont joué, pas celles des autres : un coach qui tourne
     en coupe garde un onze frais pour samedi. C'est la décision, et elle est vraie. */
  eq.onze.forEach(x => { if (x.ref) bougerForme(x.ref, (m.res === 'V' ? .3 : -.2)); });
  if (m.res === 'V') cBougerVestiaire(1.2); else if (m.res === 'D') cBougerVestiaire(-.9);
  suiteAnnexe(info, m);
  return m;
}

/* ================== LE MATCH, VU DU BANC ==================
   Mêmes verrous que pour le joueur·euse : le match est **simulé**, pas opéré. On ne
   compose pas (l'adjoint aligne le meilleur onze disponible, comme il le fait déjà
   pour le joueur·euse), on ne déplace personne. Ce qu'on fait, c'est **décider**
   face à ce que le match propose — et c'est exactement ce que le propriétaire avait
   demandé dès le 21/09 : « on ne fait rien, on choisit ».
   L'écran de mi-temps était mort en 1.0 (`HALFTIME_CHOICES` injouables, relevé par
   la cartographie du 26/09). Il revient ici, et il n'est plus seul : dix situations
   peuvent arriver pendant un match.
   RÈGLE DURE, la même que pour les trente et un faits du joueur·euse : **une issue
   n'écrit jamais le score directement**, elle crée un événement réel. Le film, le
   score, les pastilles et les notes viennent donc de la même source et ne peuvent
   pas se contredire. Et une issue n'enlève jamais un but : elle en ajoute un, ou
   elle n'en ajoute pas. */
const CMOMENTS = [
  { id:'mitemps_mene', min:[45, 45],
    quand: cx => cx.eux > cx.nous,
    titre:"La mi-temps", ico:'🚪',
    texte: cx => `Vous rentrez menés ${cx.nous}-${cx.eux}. Quinze minutes, onze paires d'yeux sur toi.`,
    opts:[
      { l:"Changer tout de suite, deux hommes", p:.52, ligneCle:'mil',
        dits:[{c:'foot', t:"🪑 ton banc décide"}, {c:'risk', t:"✊ ceux qui sortent ne comprendront pas"}],
        ok:{ t:"Les deux entrants prennent le jeu à leur compte. Vous égalisez.", but:1, ligne:{ mil:1.4 }, liens:{ presse:3 } },
        ko:{ t:"Le match se déséquilibre et ils en profitent.", butEux:1, ligne:{ mil:-1.6 }, liens:{ president:-2 } } },
      { l:"Ne rien changer, et parler", p:.46, ligneCle:'def',
        dits:[{c:'foot', t:"✊ le vestiaire t'écoute, ou pas"}, {c:'risk', t:"⏳ tu perds quinze minutes si ça ne prend pas"}],
        ok:{ t:"Ils ressortent autrement. Personne n'est entré, et ça repart.", but:1, ligne:{ def:1.2, mil:1.2, att:1.2 }, liens:{ presse:2 } },
        ko:{ t:"Les mêmes, les mêmes erreurs. Le stade a compris avant toi.", butEux:1, liens:{ supporters:-4, president:-3 } } },
    ] },
  { id:'mitemps_devant', min:[45, 45],
    quand: cx => cx.nous > cx.eux,
    titre:"La mi-temps", ico:'🚪',
    texte: cx => `Vous menez ${cx.nous}-${cx.eux}. C'est maintenant que ces matchs se perdent.`,
    opts:[
      { l:"Refermer derrière", p:.60, ligneCle:'def',
        dits:[{c:'foot', t:"🛡️ on ne prend plus rien"}, {c:'risk', t:"📣 le stade s'endort"}],
        ok:{ t:"Plus rien ne passe. Un match de coach, pas un match de gala.", ligne:{ def:1.8 }, liens:{ supporters:-2, president:3 } },
        ko:{ t:"À reculer, on finit par encaisser.", butEux:1, ligne:{ def:-1.6 } } },
      { l:"Aller chercher le deuxième", p:.50, ligneCle:'att',
        dits:[{c:'foot', t:"⚽ le match peut se tuer maintenant"}, {c:'risk', t:"🚪 et s'ouvrir dans l'autre sens"}],
        ok:{ t:"Le deuxième tombe. Le match est mort.", but:1, ligne:{ att:1.8 }, liens:{ supporters:4 } },
        ko:{ t:"Vous laissez des espaces. Ils y entrent.", butEux:1, ligne:{ att:-1.2 } } },
    ] },
  { id:'rouge', min:[30, 75],
    quand: cx => cx.rouge,
    titre:"À dix", ico:'🟥',
    texte: cx => `Expulsion. Il reste ${90 - cx.min} minutes à dix contre onze.`,
    opts:[
      { l:"Sortir un attaquant, reformer les lignes", p:.62, ligneCle:'def',
        dits:[{c:'foot', t:"🛡️ on tient le score"}, {c:'risk', t:"⚽ on ne marquera plus"}],
        ok:{ t:"Le bloc tient jusqu'au bout. Rien n'est passé.", ligne:{ def:1.6 }, liens:{ president:2 } },
        ko:{ t:"À dix, le mur finit par céder.", butEux:1, ligne:{ def:-1.2 } } },
      { l:"Ne rien changer : ils ont dix bonnes raisons d'y croire", p:.38, ligneCle:'mil',
        dits:[{c:'foot', t:"✊ un vestiaire s'en souvient"}, {c:'risk', t:"🫁 à dix, les jambes partent"}],
        ok:{ t:"À dix, ils ont fait le match de leur saison.", but:1, ligne:{ def:2, mil:2, att:2 }, liens:{ supporters:6 } },
        ko:{ t:"Ils ont couru pour rien, et ça s'est vu à la fin.", butEux:1, fit:-4 } },
    ] },
  { id:'blesse', min:[20, 70],
    quand: cx => cx.blesse,
    titre:"Un cadre sort", ico:'🩼',
    texte: cx => `${cx.blesseNom} ne peut pas continuer. Tu as le banc, et dix secondes.`,
    opts:[
      { l:"Le gamin", p:.48, ligneCle:'mil', jeune:true,
        dits:[{c:'foot', t:"🌱 une porte s'ouvre pour lui"}, {c:'risk', t:"🎲 un match se joue là-dessus"}],
        ok:{ t:"Il entre comme s'il avait toujours joué là.", but:1, ligne:{ mil:1.2 }, jeuneUp:3.5, liens:{ presse:4 } },
        ko:{ t:"C'était trop grand pour lui, ce soir.", butEux:1, jeuneDown:2 } },
      { l:"Le vieux briscard", p:.62, ligneCle:'def',
        dits:[{c:'foot', t:"🧱 il ne fera pas d'erreur"}, {c:'risk', t:"🌱 le gamin comprend qu'il attendra"}],
        ok:{ t:"Il a fait exactement ce qu'on attendait de lui. Rien de plus.", ligne:{ def:1 } },
        ko:{ t:"Il n'avait plus les jambes pour ce match-là.", butEux:1, jeuneDown:1.5 } },
    ] },
  { id:'penalty', min:[25, 85],
    quand: cx => cx.penalty,
    titre:"Penalty", ico:'🎯',
    texte: () => `L'arbitre pointe le point. Deux hommes se tournent vers le banc.`,
    opts:[
      { l:"Le buteur attitré", p:.74, ligneCle:'att',
        dits:[{c:'foot', t:"⚽ c'est son métier"}, {c:'risk', t:"✊ l'autre voulait le prendre"}],
        ok:{ t:"Il le met sans trembler.", but:1 },
        ko:{ t:"Il le manque, et il met vingt minutes à s'en remettre.", ligne:{ att:-1.4 }, liens:{ supporters:-3 } } },
      { l:"Celui qui est en confiance ce soir", p:.62, ligneCle:'att',
        dits:[{c:'foot', t:"🔥 il est dedans, ça se voit"}, {c:'risk', t:"🎲 ce n'est pas son rôle"}],
        ok:{ t:"Il le met, et tout le banc se lève.", but:1, ligne:{ att:1.6 }, liens:{ supporters:3 } },
        ko:{ t:"Il le manque. Le buteur attitré n'a rien dit, et c'est pire.", ligne:{ att:-2 } } },
    ] },
  { id:'zero', min:[68, 76],
    quand: cx => cx.nous === cx.eux && cx.nous === 0,
    titre:"Zéro partout", ico:'⏳',
    texte: cx => `${cx.min}ᵉ minute, 0-0. ${cx.dom ? "À domicile, le stade commence à souffler." : "À l'extérieur, un point n'est pas sale."}`,
    opts:[
      { l:"Tout devant", p:.48, ligneCle:'att',
        dits:[{c:'foot', t:"⚽ un but change la saison"}, {c:'risk', t:"🚪 on s'expose"}],
        ok:{ t:"Ça finit par tomber. Trois points volés à la fin.", but:1, liens:{ supporters:6, president:3 } },
        ko:{ t:"Vous vous ouvrez, et c'est eux qui marquent.", butEux:1, liens:{ supporters:-5, president:-3 } } },
      { l:"Prendre le point", p:.70, ligneCle:'def',
        dits:[{c:'foot', t:"📋 un point au classement"}, {c:'risk', t:"📣 personne ne t'applaudira"}],
        ok:{ t:"0-0. Un point, et pas une occasion concédée.", ligne:{ def:1.2 }, liens:{ supporters:-3, president:1 } },
        ko:{ t:"Même en reculant, ils ont trouvé la faille.", butEux:1, liens:{ supporters:-5 } } },
    ] },
  { id:'fin_serree', min:[80, 86],
    quand: cx => cx.nous - cx.eux === 1,
    titre:"Un but d'avance", ico:'⏱️',
    texte: cx => `${cx.min}ᵉ, ${cx.nous}-${cx.eux}. Il faut tenir ${90 - cx.min} minutes.`,
    opts:[
      { l:"Le dernier changement : du muscle derrière", p:.66, ligneCle:'def',
        dits:[{c:'foot', t:"🛡️ on ferme la boutique"}, {c:'risk', t:"⚽ on n'inquiète plus personne"}],
        ok:{ t:"Ils n'ont plus eu un ballon dans la surface.", ligne:{ def:1.4 }, liens:{ president:2 } },
        ko:{ t:"Le changement n'a rien changé, et ils égalisent.", butEux:1, ligne:{ def:-1.4 }, liens:{ president:-3 } } },
      { l:"Garder le ballon, loin de notre surface", p:.56, ligneCle:'mil',
        dits:[{c:'foot', t:"🎛️ on joue, donc ils ne jouent pas"}, {c:'risk', t:"🫁 à ce moment-là, c'est dur"}],
        ok:{ t:"Le ballon n'est jamais revenu. Travail propre.", ligne:{ mil:1.6 }, liens:{ supporters:3 } },
        ko:{ t:"Un ballon perdu au mauvais endroit, et tout est à refaire.", butEux:1, ligne:{ mil:-1.6 } } },
    ] },
  { id:'siffle', min:[55, 80],
    quand: cx => cx.dom && cx.eux >= cx.nous && S.liens.supporters < 52,
    titre:"Le stade s'en prend à un des tiens", ico:'📣',
    texte: cx => `${cx.sujet} touche le ballon, le stade siffle. Il baisse la tête.`,
    opts:[
      { l:"Le sortir, le protéger", p:.58, ligneCle:'mil',
        dits:[{c:'foot', t:"🛡️ tu le protèges, le vestiaire le voit"}, {c:'risk', t:"📣 le stade croira qu'il a eu raison"}],
        ok:{ t:"Il sort sous les sifflets, et son remplaçant fait le travail.", ligne:{ mil:1.6 }, liens:{ supporters:-3 } },
        ko:{ t:"Tu l'as sorti et l'équipe s'est désorganisée.", butEux:1, liens:{ supporters:-3 } } },
      { l:"Le laisser, et aller l'applaudir depuis le banc", p:.44, ligneCle:'att',
        dits:[{c:'foot', t:"✊ un joueur s'en souvient dix ans"}, {c:'risk', t:"📣 si ça rate, c'est toi qu'on siffle"}],
        ok:{ t:"Il a répondu sur le terrain. Le stade s'est tu, puis l'a applaudi.", but:1, ligne:{ def:1.4, mil:1.4, att:1.4 }, liens:{ supporters:5 } },
        ko:{ t:"Il a sombré jusqu'à la fin, et c'est toi qu'on siffle en sortant.", butEux:1, liens:{ supporters:-7, presse:-4 } } },
    ] },
  { id:'boude', min:[35, 70],
    quand: cx => cx.cadre && cx.eux >= cx.nous,
    titre:"Ton meilleur joueur ne court pas", ico:'🥵',
    texte: cx => `${cx.cadreNom} marche depuis dix minutes. Tout le monde le voit.`,
    opts:[
      { l:"Le sortir devant tout le monde", p:.52, ligneCle:'mil',
        dits:[{c:'foot', t:"✊ le groupe voit qu'il n'y a pas de passe-droit"}, {c:'risk', t:"🔥 tu te fais un ennemi"}],
        ok:{ t:"Le message est passé à onze personnes d'un coup.", ligne:{ def:1.8, mil:1.8, att:1.8 }, cadreDown:3, liens:{ presse:3 } },
        ko:{ t:"Il est sorti en claquant la porte, et l'équipe s'est arrêtée avec lui.", butEux:1, cadreDown:5, ligne:{ mil:-2 } } },
      { l:"Le laisser, il peut encore faire la différence", p:.46, ligneCle:'att',
        dits:[{c:'foot', t:"⚽ un joueur comme lui suffit d'une fois"}, {c:'risk', t:"✊ les autres comptent les mètres"}],
        ok:{ t:"Une fois. Il n'a eu besoin que d'une fois.", but:1, liens:{ supporters:4 } },
        ko:{ t:"Rien. Et dans le vestiaire, personne n'a oublié qu'il était resté.", butEux:1, ligne:{ def:-1.4, mil:-1.4, att:-1.4 } } },
    ] },
  { id:'arbitre', min:[40, 85],
    quand: cx => cx.eux >= cx.nous,
    titre:"La décision", ico:'🟨',
    texte: () => `Un contact dans leur surface. L'arbitre fait non de la main, deux fois.`,
    opts:[
      { l:"Te lever et le dire", p:.50, ligneCle:'att',
        dits:[{c:'foot', t:"📣 le stade est avec toi"}, {c:'risk', t:"🟨 et toi en tribune au prochain match"}],
        ok:{ t:"Le stade se réveille avec toi, et l'équipe avec le stade.", but:1, liens:{ supporters:7, presse:3 } },
        ko:{ t:"Tu finis le match en tribune. L'équipe n'a plus eu de banc.", butEux:1, liens:{ supporters:3, president:-4, presse:-3 }, tribune:true } },
      { l:"Rester assis, noter, se taire", p:.60, ligneCle:'def',
        dits:[{c:'foot', t:"🧊 tu gardes la tête, et ton banc"}, {c:'risk', t:"📣 ils attendaient que tu montes"}],
        ok:{ t:"Tu n'as rien dit, et l'équipe a répondu toute seule.", ligne:{ def:1.2, mil:1.2 }, liens:{ president:2 } },
        ko:{ t:"Personne ne s'est révolté. Ni toi, ni eux.", butEux:1, liens:{ supporters:-4 } } },
    ] },
];

/* ---------------- le match ---------------- */
function cLancerMatch(){
  const adv = adversaire(S.journee);
  const eq = cEquipeDuJourLue();
  const nous = cForce(eq.ecart);
  const porte = adv.dom ? clamp((S.liens.supporters - 50) * .034, -1.2, 1.2) : 0;
  const diff = nous - adv.force + (adv.dom ? 2.4 : -2.4) + porte;
  const bn = poisson(tameXG(1.35 * Math.exp(diff / 19)));
  /* « Les laisser venir et frapper dans le dos » ouvre vraiment des espaces : sans
     cette ligne, l'option annonçait un risque qui n'existait pas. */
  const be = poisson(tameXG(1.35 * Math.exp(-diff / 19)) * (1 + (S.grp.ouvert || 0)));
  const m = { adv, statut:'coach', bn, be, minutes:0, note:null, buts:0, passes:0,
    faits:[], moments:[], jaune:0, blessure:0,
    onze: eq.onze, banc: eq.banc, reserve: eq.reserve,
    absents: eq.absents.map(x => ({ nom:x.nom, poste:x.poste, raison: x.ref.susp > 0 ? 'susp' : 'blesse' })),
    ecartOnze: eq.ecart, porte, force: nous,
    detail: cDetailForce(eq.ecart),
    ecartForce: (S.club.force + eq.ecart) - adv.force };

  const mins = shuffle([...Array(90).keys()].map(i => i + 1));
  let evs = [];
  for (let i = 0; i < bn; i++) evs.push({ min: mins.pop(), type:'but', nous:true });
  for (let i = 0; i < be; i++) evs.push({ min: mins.pop(), type:'but', nous:false });
  if (Math.random() < .14) evs.push({ min: mins.pop(), type:'penalty', nous: Math.random() < .5 });
  if (Math.random() < .5) evs.push({ min: mins.pop(), type:'jaune', nous: Math.random() < .5 });
  if (Math.random() < .09) evs.push({ min: mins.pop(), type:'rouge', nous: Math.random() < .5 });
  if (Math.random() < .12) evs.push({ min: mins.pop(), type:'blessure', nous: Math.random() < .5 });
  evs.sort((a, b) => a.min - b.min);
  m.evs = evs;

  const chg = planChangements(m, eq.onze, eq.banc);
  m.chg = chg;
  // un expulsé ne finit pas le match : c'est ce qui rend le nombre de sortants impair
  const finissent = new Set((m.onze || []).filter(x => !chg.some(c => c.sortant === x)));
  m.expulses = [];
  evs.filter(e => (e.type === 'jaune' || e.type === 'rouge') && e.nous)
    .forEach(e => { e.qui = surLeBanc(m, e.min, 'carton'); });
  evs.filter(e => e.type === 'rouge' && e.nous).forEach(e => {
    if (e.min > 88) e.min = 88;
    const l = [...finissent];
    if (!l.length){ e.nous = false; e.qui = buteurAdverse(adv) || adv.nom; return; }
    const x = pick(l); finissent.delete(x); e.qui = x.nom;
    m.expulses.push({ nom: e.qui, min: e.min });
  });
  m.evs = evs = evs.filter(e => {
    if (e.type !== 'blessure' || !e.nous) return true;
    const l = chg.filter(c => c.sortant);
    if (!l.length) return false;
    const c = pick(l); e.min = c.min; e.qui = c.sortant.nom; e.sortie = true;
    return true;
  });
  evs.sort((a, b) => a.min - b.min);
  evs.filter(e => e.type === 'but' && e.nous).forEach(e => {
    e.qui = surLeBanc(m, e.min, 'but');
    if (Math.random() < .55){ const p = surLeBanc(m, e.min, 'but'); if (p !== e.qui) e.passe = p; }
  });
  evs.filter(e => e.type === 'but' && !e.nous).forEach(e => e.qui = buteurAdverse(adv) || adv.nom);

  cTirerMoments(m);
  S.match = m; S.momentIdx = 0;
  m.arret = S.semaineArret || null; S.semaineArret = null;
  m.annexe = S.annexe || null; S.annexe = null;
  m.seance = S.seance || null;
  cSuiteMatch();
}
/* ZÉRO À DEUX DÉCISIONS PAR MATCH, et jamais deux fois la même famille de suite :
   le même garde-fou que pour les arrêts, parce que c'est le même défaut (« le
   kiné apparaît un peu tout le temps »). La mi-temps est la plus fréquente, et
   c'est normal — elle arrive à tous les matchs. */
function cTirerMoments(m){
  const score = min => { let n = 0, e = 0;
    (m.evs || []).forEach(x => { if (x.type === 'but' && x.min < min) x.nous ? n++ : e++; });
    return { nous:n, eux:e }; };
  const cadre = S.equipe.filter(j => dispoDe(j)).sort((a, b) => b.niv - a.niv)[0];
  const jeune = S.equipe.find(j => j.monte);
  const dispo = [];
  CMOMENTS.forEach(mo => {
    const min = mo.min[0] === mo.min[1] ? mo.min[0] : ri(mo.min[0], mo.min[1]);
    const s = score(min);
    const cx = { min, nous:s.nous, eux:s.eux, dom: m.adv.dom, journee: S.journee,
      rouge: (m.expulses || []).some(x => x.min <= min),
      blesse: (m.evs || []).some(e => e.type === 'blessure' && e.nous && Math.abs(e.min - min) <= 12),
      blesseNom: ((m.evs || []).find(e => e.type === 'blessure' && e.nous) || {}).qui || (cadre && cadre.nom) || "Ton joueur",
      penalty: (m.evs || []).some(e => e.type === 'penalty' && e.nous && Math.abs(e.min - min) <= 10),
      cadre: !!cadre, cadreNom: cadre ? cadre.nom : '', sujet: cadre ? cadre.nom : '',
      jeuneNom: jeune ? jeune.nom : '' };
    let ok = false; try { ok = mo.quand(cx); } catch(e){ ok = false; }
    if (ok) dispo.push({ mo, min, cx });
  });
  const recents = S.recentMoments || [];
  let frais = dispo.filter(x => !recents.includes(x.mo.id));
  if (!frais.length) frais = dispo;
  const combien = Math.random() < .38 ? 0 : Math.random() < .84 ? 1 : 2;
  const pris = shuffle(frais).slice(0, Math.min(combien, frais.length))
    .sort((a, b) => a.min - b.min);
  m.moments = pris.map(x => ({ id:x.mo.id, min:x.min, titre:x.mo.titre, ico:x.mo.ico,
    texte: x.mo.texte(x.cx), cx:x.cx,
    opts: x.mo.opts.map(o => ({ l:o.l, dits:o.dits })) }));
  m.momentDefs = pris.map(x => x.mo.id);
  S.recentMoments = [...m.momentDefs, ...recents].slice(0, 4);
}
function cSuiteMatch(){
  const m = S.match;
  if (m.moments && S.momentIdx < m.moments.length){ S.ecran = 'cmoment'; sauver(); rendre(); return; }
  cFinirMatch();
}
/* L'ISSUE N'ÉCRIT JAMAIS LE SCORE : elle crée un événement, et le score se recompte
   depuis les événements. C'est la seule façon d'avoir un film qui ne mente pas, et
   c'est la leçon du 27/09 (« un 3-0 dont le film ne montrait que deux buts »). */
function cEcrireMoment(m, min, o){
  if (o.but){ const qui = surLeBanc(m, min, 'but');
    m.evs.push({ min: Math.min(90, min + ri(1, 8)), type:'but', nous:true, qui, moment:true }); }
  if (o.butEux){ m.evs.push({ min: Math.min(90, min + ri(1, 8)), type:'but', nous:false,
    qui: buteurAdverse(m.adv) || m.adv.nom, moment:true }); }
  m.evs.sort((a, b) => a.min - b.min);
  m.bn = m.evs.filter(e => e.type === 'but' && e.nous).length;
  m.be = m.evs.filter(e => e.type === 'but' && !e.nous).length;
  if (o.ligne) Object.entries(o.ligne).forEach(([k, v]) => cBougerLigne(k, v));
  if (o.liens) Object.entries(o.liens).forEach(([k, v]) => {
    if (k === 'president') v < 0 ? cCoutPresident(-v, null) : (S.liens.president = clamp(S.liens.president + v));
    else S.liens[k] = clamp((S.liens[k] || 50) + v); });
  if (o.fit) S.grp.fr = clamp(S.grp.fr + o.fit, 0, 100);
  if (o.jeuneUp){ const j = S.equipe.find(x => x.monte); if (j){ j.niv += o.jeuneUp * .35; bougerForme(j, 2); } }
  if (o.jeuneDown){ const j = S.equipe.find(x => x.monte); if (j) bougerForme(j, -o.jeuneDown); }
  if (o.cadreDown){ const c = S.equipe.filter(j => dispoDe(j)).sort((a, b) => b.niv - a.niv)[0];
    if (c){ bougerForme(c, -o.cadreDown * .5); c.rancune = (c.rancune || 0) + o.cadreDown; } }
  if (o.tribune) S.tribune = 1;   // tu regardes le prochain match d'en haut
}
function cChoisirMoment(i){
  const m = S.match, vue = m.moments[S.momentIdx];
  const def = CMOMENTS.find(x => x.id === vue.id);
  const o = def.opts[i] || def.opts[0];
  /* La réussite dépend de **ton banc** et de l'entente de la ligne concernée : c'est
     l'effet de football de l'axe `banc`, et il se mesure. */
  const ent = o.ligneCle ? (S.lignes[o.ligneCle] - 50) * .004 : 0;
  const p = clamp(o.p + (cAxe('banc') - 50) * C_BANC + ent + (S.tribune ? -.08 : 0), .1, .93);
  const reussi = Math.random() < p;
  const iss = reussi ? o.ok : o.ko;
  cEcrireMoment(m, vue.min, iss);
  m.faits.push({ min: vue.min, titre: vue.titre, choix: o.l, t: iss.t, ok: reussi });
  S.stats.decisions++;
  jrn('moment', `${vue.titre} — « ${o.l} » : ${reussi ? 'ça marche' : 'ça ne marche pas'}.`);
  S.momentIdx++;
  cSuiteMatch();
}

/* ---------------- la fin du match ---------------- */
function cFinirMatch(){
  const m = S.match, res = m.bn > m.be ? 'V' : m.bn < m.be ? 'D' : 'N';
  const g0 = { ...S.liens }, l0 = { ...S.lignes };
  m.semaine = S.semaine;
  const c = S.ligue.classement;
  c[S.club.nom].j++; c[S.club.nom].bp += m.bn; c[S.club.nom].bc += m.be;
  c[S.club.nom].pts += res === 'V' ? 3 : res === 'N' ? 1 : 0;
  c[S.club.nom][res === 'V' ? 'v' : res === 'N' ? 'n' : 'd']++;
  c[m.adv.nom].j++; c[m.adv.nom].bp += m.be; c[m.adv.nom].bc += m.bn;
  c[m.adv.nom].pts += res === 'D' ? 3 : res === 'N' ? 1 : 0;
  c[m.adv.nom][res === 'D' ? 'v' : res === 'N' ? 'n' : 'd']++;
  m.res = res;                      // avant les notes : elles le lisent
  notesEquipe(m);
  S.stats.j++; S.stats[res === 'V' ? 'v' : res === 'N' ? 'n' : 'd']++;
  S.stats.bp += m.bn; S.stats.bc += m.be;
  S.serie = [res, ...(S.serie || [])].slice(0, 5);

  bougerLigne('def', m.be === 0 ? 1.1 : m.be >= 3 ? -1.2 : 0);
  bougerLigne('att', m.bn >= 2 ? 1 : m.bn === 0 ? -1 : 0);
  bougerLigne('mil', res === 'V' ? .8 : res === 'D' ? -.8 : 0);
  CAXES.forEach(a => S.moi.boost[a] *= .5);

  /* CE QUE LE PRÉSIDENT RETIENT. Un résultat vaut ce qu'il a coûté : battre plus
     fort que soi paie davantage, perdre contre plus faible coûte davantage. C'est
     la même règle que la note du joueur·euse (`duelResultat`), et c'est ce qui
     empêche une saison tranquille dans un gros club de valoir une saison tenue
     dans un petit. */
  /* MESURÉ, PUIS RESSERRÉ. Première version : +2,4 par victoire, −2,4 par défaite et
     aucun oubli — la confiance finissait à **97,9 de médiane** en fin de saison et
     saturait à 100, donc le président ne renvoyait **personne** (0,15 fois par
     carrière de vingt-trois saisons). Un mode entraîneur·euse sans porte n'a pas de
     tension : c'est l'équivalent exact du « ne pas jouer » du joueur·euse, et il
     doit pouvoir arriver. Trois corrections : le gain d'une victoire est plus petit
     que le coût d'une défaite, et surtout **sa confiance s'oublie** — un président
     ne crédite pas en novembre ce qu'on a fait en août. */
  const duel = duelResultat(m.ecartForce);
  if (res === 'V') S.liens.president = clamp(S.liens.president + 1.7 * duel);
  else if (res === 'D') cCoutPresident(2.8 / Math.max(.55, duel), `cette défaite à ${m.adv.nom}`);
  /* **Asymétrique**, comme l'amorti des gains validé le 22/09 : ce qu'on t'a crédité
     s'oublie, ce qu'on te reproche ne s'efface pas tout seul. Un rappel symétrique
     remontait automatiquement une confiance basse, donc une mauvaise série se
     pardonnait sans que tu fasses quoi que ce soit — et la porte ne s'ouvrait
     jamais (mesuré : 0,1 renvoi par carrière de vingt-sept saisons). */
  if (S.liens.president > 48) S.liens.president += (48 - S.liens.president) * .035;
  /* Le stade : il s'entretient. Une jauge qui ne fait que monter n'est pas une
     décision — c'est la leçon des supporters du joueur·euse, mesurée à 100 de
     médiane sur une carrière entière. */
  S.liens.supporters = clamp(S.liens.supporters + (res === 'V' ? (m.adv.dom ? 3.2 : 2.2)
    : res === 'N' ? (m.adv.dom ? -.8 : .6) : (m.adv.dom ? -3.4 : -1.6)));
  S.liens.supporters = clamp(S.liens.supporters + (46 - S.liens.supporters) * .05);
  S.liens.presse = clamp(S.liens.presse + (res === 'V' ? 1.6 : res === 'D' ? -1.6 : 0));
  /* Elle s'oublie, comme le stade : mesuré sans rappel, elle finissait à 77 après
     une saison à dix victoires pour seize défaites, parce que les arrêts ne font
     que la monter. Une jauge qui ne descend pas n'est pas une décision. */
  S.liens.presse = clamp(S.liens.presse + (50 - S.liens.presse) * .04);
  S.liens.direction = clamp(S.liens.direction + (res === 'V' ? .8 : res === 'D' ? -.8 : 0));

  m.mvt = [];
  const mot = (k, up, txt) => m.mvt.push({ k, up, mot: txt });
  if (S.liens.president - g0.president <= -1.6) mot('president', false, cDirePresident());
  if (S.liens.president - g0.president >= 1.6) mot('president', true, cDirePresident());
  if (Math.abs(S.liens.supporters - g0.supporters) >= 2.4) mot('supporters', S.liens.supporters > g0.supporters, dire('supporters'));
  LIGNES.forEach(k => { if (Math.abs(S.lignes[k] - l0[k]) >= 1.4)
    mot('vestiaire', S.lignes[k] > l0[k], `${LIGNE_NOM[k]} : ${minuscule(direLigne(k))}`); });
  if (S.tribune) mot('presse', false, "Tu regarderas le prochain match depuis la tribune.");
  m.detailFin = cDetailForce(m.ecartOnze);
  S.dernier = m; S.ecran = 'cresultat';
  jrn('match', `${m.adv.dom ? '' : '(ext.) '}${S.club.nom} ${m.bn}-${m.be} ${m.adv.nom}.`);
  sauver(); rendre();
}
function cApresMatch(){
  S.eqJour = null;
  vivreEquipe();
  S.equipe.forEach(j => { if (j.monte) j.niv = Math.min(j.niv + .3, S.club.force + 12); });
  LIGNES.forEach(k => S.lignes[k] = clamp(S.lignes[k] * .99 + .5 + rnd(-1.8, 1.8)));
  S.ligneRef = S.ligneRef || { ...S.lignes };
  LIGNES.forEach(k => S.ligneRef[k] = S.ligneRef[k] * .82 + S.lignes[k] * .18);
  autresMatchs();
  /* UN GROUPE VIDÉ SE BLESSE, et c'est la seule conséquence mécanique de la
     fraîcheur collective en dehors de la force du samedi. C'est la même règle que
     celle validée pour le joueur·euse le 30/09 (« la fraîcheur ne se régénère pas
     assez vite, il se blesse ») : ici elle vaut pour vingt-deux personnes. */
  if (S.grp.fr < 48){
    const r = (48 - S.grp.fr) * .0007 * (1 - cCondition() * .085);
    S.equipe.forEach(j => { if (dispoDe(j) && Math.random() < r) j.blesse = ri(1, 4); });
  }
  // les jambes reviennent, et c'est la condition du groupe qui dit à quelle vitesse
  S.grp.fr = clamp(S.grp.fr - C_MATCH_FR + cRecup(), 0, 100);
  S.grp.athle = (S.grp.athle || 0) * C_ATHLE_OUBLI;
  S.grp.plan = 0; S.grp.ouvert = 0;
  S.tribune = 0;
  cSyncEffectif();
  S.journee++;
  /* LE PRÉSIDENT TRANCHE PAR QUART DE SAISON, pas à chaque journée : un couperet
     hebdomadaire rendrait toute mauvaise série fatale, et une saison ne serait
     plus une histoire. C'est l'équivalent, pour l'entraîneur·euse, de « ne pas
     jouer » du côté joueur·euse : la vraie tension du mode. */
  /* Quatre couperets par saison, pas un par journée : une mauvaise série ne doit
     pas être fatale la semaine même, mais elle doit pouvoir l'être. */
  if ([9, 17, 24, 30].includes(S.journee) && cDoitPartir()) return cVirer();
  if (S.journee >= JOURNEES) return cFinSaison();
  S.arrets = 0; S.semaine = null; S.seance = null; S.match = null;
  S.ecran = 'csemaine'; sauver(); rendre();
}
function cPlace(){ return classementTrie().findIndex(x => x.nom === S.club.nom) + 1; }
const C_SEUIL_PORTE = 28;
function cDoitPartir(){
  if (S.liens.president >= C_SEUIL_PORTE) return false;
  // la direction peut te protéger une fois : c'est ce que vaut le réseau
  return !(S.liens.direction > 62 && Math.random() < .45);
}
function cVirer(){
  S.vire = { annee: S.annee, journee: S.journee, club: S.club.nom, place: cPlace() };
  jrn('fin', `Tu es démis de tes fonctions à ${S.club.nom}, ${cPlace()}ᵉ après ${S.journee} journées.`);
  S.ecran = 'cvire'; sauver(); rendre();
}

/* La suite d'un renvoi : la saison se joue sans toi (le championnat a besoin d'un
   champion), puis l'été arrive comme pour tout le monde. C'est du moteur et non un
   écran — le banc d'essai ne charge pas les écrans. */
function cApresVirage(){
  S.carriere = S.carriere || { saisons:0, clubs:[], annees:[], titres:0, coupes:0, europes:0, montees:0, virages:0 };
  S.carriere.virages = (S.carriere.virages || 0) + 1;
  /* La saison continue sans toi : on la joue jusqu'au bout pour que le championnat
     ait un champion, puis l'été arrive comme pour tout le monde. */
  while (S.journee < JOURNEES){ autresMatchs(); S.journee++; }
  S.bilan = { pos: cPlace(), division: S.division || 1, nbClubs: S.ligue.equipes.length,
    objectif: S.objectif, atteint:false, descente:false, montee:false,
    v:S.stats.v, n:S.stats.n, dd:S.stats.d, bp:S.stats.bp, bc:S.stats.bc, decisions:S.stats.decisions };
  cOuvrirEte();
}

/* ================== LES ARRÊTS ==================
   LE MODE JOUEUR·EUSE N'AVAIT AUCUN INTERLOCUTEUR et c'était le trou numéro un de
   la cartographie du 26/09 ; l'entraîneur·euse, lui, n'est QUE des interlocuteurs.
   Quatorze familles, et la règle du 30/09 sans exception : **chaque option coûte et
   gagne quelque chose, dans deux monnaies différentes.** Pas de troisième option
   tiède — c'est elle qui fabriquait les soixante-deux pour cent de décisions
   gratuites qu'il avait mesurées en 1.0. */
const CARRETS = [
  { id:'presse', quand: () => S.journee >= 1,
    titre:"La conférence de presse",
    texte: () => (S.serie[0] === 'D' ? `Trois questions sur la défaite, et une sur ton avenir.`
      : `La salle est pleine. On te tend un micro et une phrase à finir.`),
    options:[
      { l:"Protéger les joueurs, prendre pour eux", liens:{ presse:-6 }, ligne:2.4,
        dits:[{c:'foot', t:"✊ le vestiaire lit les journaux"}, {c:'risk', t:"📰 tu deviens le sujet"}] },
      { l:"Les secouer devant tout le monde", liens:{ presse:6, president:2 }, ligne:-2.6,
        dits:[{c:'foot', t:"📰 la presse aime un coach qui parle"}, {c:'risk', t:"✊ ils l'apprendront par la télé"}] },
    ] },
  { id:'president', quand: () => S.journee >= 3,
    titre:"Le bureau du président", sujet: () => cCadre(),
    texte: s => `« ${s} est payé une fortune et il regarde les matchs. Je ne comprends pas. »`,
    options:[
      { l:"Lui expliquer que c'est toi qui décides", liens:{ president:-7, direction:-3 }, axes:{ jeu:.8 },
        dits:[{c:'foot', t:"🧠 tu gardes ton jeu"}, {c:'risk', t:"🏛️ il n'aime pas qu'on lui réponde"}] },
      { l:"Le faire jouer samedi", liens:{ president:6 }, formeSujet:2, ligne:-2.2,
        dits:[{c:'foot', t:"🏛️ il te laissera tranquille un mois"}, {c:'risk', t:"✊ le groupe sait pourquoi il joue"}] },
    ] },
  { id:'capitaine', quand: () => S.journee >= 4 && ligneFaible() != null,
    titre:"Le capitaine frappe à la porte", sujet: () => visageDe(ligneFaible()),
    texte: s => `« ${s} est en train de se perdre. Il faut que tu lui parles, toi. »`,
    options:[
      { l:"Lui donner une heure", fit:-3, ligne:2.8, axes:{ groupe:.7 },
        dits:[{c:'foot', t:"✊ la ligne se recolle"}, {c:'risk', t:"⏳ une heure que tu n'as pas"}] },
      { l:"« C'est à lui de venir me voir »", liens:{ presse:2 }, ligne:-2.4, axes:{ jeu:.6 },
        dits:[{c:'foot', t:"🧠 tu travailles ton match"}, {c:'risk', t:"✊ le capitaine n'insistera plus"}] },
    ] },
  { id:'agent', quand: () => S.journee >= 5, sujet: () => cCadre(),
    titre:"L'agent de ton meilleur joueur",
    texte: s => `« ${s} a un contrat qui finit. Il y a de l'intérêt. On fait quoi ? »`,
    options:[
      { l:"Promettre qu'il jouera tout", liens:{ direction:-4 }, formeSujet:2.5, axes:{ reseau:.6 },
        dits:[{c:'foot', t:"👤 il reste, et il court"}, {c:'risk', t:"🏛️ la direction paiera la rallonge"}] },
      { l:"Dire que personne n'est indispensable", liens:{ direction:5, presse:2 }, formeSujet:-3,
        dits:[{c:'foot', t:"🏛️ la direction approuve"}, {c:'risk', t:"👤 il a entendu, et il a compris"}] },
    ] },
  { id:'jeune', quand: () => S.journee >= 4 && S.equipe.some(j => j.monte),
    titre:"Le gamin pousse", sujet: () => (S.equipe.find(j => j.monte) || {}).nom || "Le gamin",
    texte: s => `${s} a été le meilleur à l'entraînement toute la semaine. Tout le monde l'a vu.`,
    options:[
      { l:"Le lancer samedi", jeune:4, ligne:-1.4, liens:{ presse:4 },
        dits:[{c:'foot', t:"🌱 il franchit un palier"}, {c:'risk', t:"✊ un cadre perd sa place et le dit"}] },
      { l:"Le faire attendre son tour", jeune:-2.5, ligne:1.8, liens:{ president:2 },
        dits:[{c:'foot', t:"✊ la hiérarchie tient"}, {c:'risk', t:"🌱 il doutera de toi"}] },
    ] },
  { id:'blesse', quand: () => S.equipe.some(j => j.blesse > 0),
    titre:"L'infirmerie", sujet: () => (S.equipe.find(j => j.blesse > 0) || {}).nom || "Un joueur",
    texte: s => `Le médecin est clair : ${s} peut jouer samedi, mais pas sans risque.`,
    options:[
      { l:"Le faire jouer", formeSujet:1.5, risque:.42, liens:{ president:2 },
        dits:[{c:'foot', t:"⚽ ton onze est au complet"}, {c:'risk', t:"🩼 quatre semaines si ça casse"}] },
      { l:"Le protéger trois semaines", soinSujet:true, ligne:1.6, liens:{ president:-3 },
        dits:[{c:'foot', t:"✊ le vestiaire voit qu'on protège"}, {c:'risk', t:"📋 tu joues sans lui"}] },
    ] },
  { id:'supporters', quand: () => S.liens.supporters < 48 || (S.serie[0] === 'D' && S.serie[1] === 'D'),
    titre:"Une délégation de supporters",
    texte: () => `Ils ont attendu deux heures devant le centre. Ils veulent cinq minutes.`,
    options:[
      { l:"Les recevoir, les écouter", fit:-2, liens:{ supporters:8 }, axes:{ reseau:.5 },
        dits:[{c:'foot', t:"📣 ils repartiront avec quelque chose"}, {c:'risk', t:"⏳ deux heures de ta semaine"}] },
      { l:"Faire répondre par le club", liens:{ supporters:-6, direction:4 },
        dits:[{c:'foot', t:"🏛️ la direction préfère ça"}, {c:'risk', t:"📣 ils raconteront que tu as refusé"}] },
    ] },
  { id:'direction', quand: () => S.journee >= 6,
    titre:"Le directeur sportif",
    texte: () => `« J'ai un dossier. Un joueur à ton poste faible, cher, disponible en janvier. »`,
    options:[
      { l:"Lui dire oui, et porter le dossier", axes:{ reseau:1 }, liens:{ direction:6, president:-3 },
        dits:[{c:'foot', t:"🤝 ton réseau travaille"}, {c:'risk', t:"🏛️ le président verra la facture"}] },
      { l:"« On fera avec ce qu'on a »", liens:{ president:5, direction:-5 }, ligne:1.6,
        dits:[{c:'foot', t:"🏛️ le président te trouve raisonnable"}, {c:'risk', t:"🤝 on ne te proposera plus rien"}] },
    ] },
  { id:'maison', quand: () => S.journee >= 5 && proches() >= 30,
    titre:"Chez toi",
    texte: () => `C'est le troisième dimanche de suite que tu travailles. On ne te l'a pas dit, mais on l'a compté.`,
    options:[
      { l:"Rentrer, et couper le téléphone", liens:{ proches:9 }, axes:{ jeu:-.6 }, fit:0,
        dits:[{c:'foot', t:"🏡 les tiens respirent"}, {c:'risk', t:"🧠 ton match n'avancera pas"}] },
      { l:"Rester au centre jusqu'à dimanche soir", liens:{ proches:-7 }, axes:{ jeu:1.1 },
        dits:[{c:'foot', t:"🧠 ton jeu avance vraiment"}, {c:'risk', t:"🏡 ça s'use, et ça ne revient pas"}] },
    ] },
  { id:'adversaire', quand: () => S.journee >= 2,
    titre:"Leur manière de jouer",
    texte: () => `L'adjoint a tout regardé. « Ils laissent un côté ouvert. Mais pour l'exploiter, il faut les laisser venir. »`,
    options:[
      { l:"Les laisser venir et frapper dans le dos", plan:1.6, risqueBut:.3,
        dits:[{c:'foot', t:"⚽ +de force samedi"}, {c:'risk', t:"🚪 et des espaces derrière"}] },
      { l:"Les prendre haut dès la première minute", plan:.8, fit:-5,
        dits:[{c:'foot', t:"⚽ un peu plus de force samedi"}, {c:'risk', t:"🫁 ça coûte des jambes"}] },
    ] },
  { id:'deplacement', quand: () => S.journee >= 3 && !adversaire(S.journee).dom,
    titre:"Le déplacement",
    texte: () => `Six cents kilomètres. L'intendant attend ta réponse pour réserver.`,
    options:[
      { l:"Partir la veille, dormir sur place", fit:2, liens:{ direction:-4 },
        dits:[{c:'foot', t:"🫁 des jambes fraîches"}, {c:'risk', t:"🏛️ une nuit d'hôtel pour vingt-cinq"}] },
      { l:"Le car le matin", fit:-6, liens:{ direction:5 },
        dits:[{c:'foot', t:"🏛️ la direction compte les sous"}, {c:'risk', t:"🫁 ils arriveront fripés"}] },
    ] },
  { id:'serie', quand: () => (S.serie || []).slice(0, 4).filter(r => r !== 'V').length >= 4,
    titre:"Quatre matchs sans gagner",
    texte: () => `Personne ne dit rien, et c'est ça qui est mauvais. Le centre est silencieux.`,
    options:[
      { l:"Tout remettre à plat, une réunion de deux heures", fit:-6, ligne:3.4, axes:{ groupe:1 },
        dits:[{c:'foot', t:"✊ on repart de quelque chose"}, {c:'risk', t:"🫁 deux heures debout, et samedi arrive"}] },
      { l:"Ne rien changer, et le dire", liens:{ presse:4, president:-4 }, ligne:-1.2, axes:{ jeu:.9 },
        dits:[{c:'foot', t:"🧠 tu crois à ton plan, et tu le travailles"}, {c:'risk', t:"🏛️ le président compte les journées"}] },
    ] },
  { id:'cadre', quand: () => S.journee >= 8, sujet: () => cCadre(),
    titre:"Un carton de la suspension",
    texte: s => `${s} est à un avertissement d'un match de suspension. Et le prochain compte.`,
    options:[
      { l:"Le laisser jouer, et tant pis", risqueSusp:.35, liens:{ president:2 },
        dits:[{c:'foot', t:"⚽ ton meilleur joueur sur le terrain"}, {c:'risk', t:"🟨 il peut sauter le match d'après"}] },
      { l:"Le mettre au repos ce week-end", formeSujet:-1.5, ligne:-1.2, fit:3,
        dits:[{c:'foot', t:"📋 il sera là pour le gros match"}, {c:'risk', t:"👤 il n'a pas aimé"}] },
    ] },
  { id:'ailleurs', quand: () => S.journee >= 12 && S.liens.presse > 56 && cPlace() <= 8,
    titre:"Un autre club appelle",
    texte: () => `Un intermédiaire, un café, une question : « Et si tu venais en juin ? »`,
    options:[
      { l:"Écouter, sans rien promettre", axes:{ reseau:1.3 }, liens:{ president:-5 }, offres:1,
        dits:[{c:'foot', t:"🤝 tu existes sur le marché"}, {c:'risk', t:"🏛️ ça finira par se savoir"}] },
      { l:"Ne pas y aller, et le dire au président", liens:{ president:7, direction:4 }, axes:{ reseau:-.8 },
        dits:[{c:'foot', t:"🏛️ il s'en souviendra en juin"}, {c:'risk', t:"🤝 on ne te rappellera pas"}] },
    ] },
];
function cCadre(){
  const l = S.equipe.filter(j => dispoDe(j)).sort((a, b) => b.niv - a.niv);
  return l.length ? l[0].nom : "Ton cadre";
}
function cOuvrirArrets(){
  let dispo = CARRETS.filter(a => { try { return a.quand(); } catch(e){ return false; } });
  const recents = S.recentArrets || [];
  const frais = dispo.filter(a => !recents.includes(a.id));
  if (frais.length) dispo = frais;
  /* 21,5 arrêts et 26 décisions de match par saison à la première mesure, soit 48 —
     au-dessus des « 30 à 40 par saison » qui lui conviennent (22/09/2026). On
     desserre les deux, pas un seul : c'est le total qui compte. */
  if (!dispo.length || S.arrets >= 2 || Math.random() < .52) return cLancerMatch();
  S.vuArrets = S.vuArrets || {};
  const poids = dispo.map(a => 1 / Math.pow(1 + (S.vuArrets[a.id] || 0), 1.8));
  const t = poids.reduce((x, y) => x + y, 0);
  let r = Math.random() * t, a = dispo[0];
  for (let i = 0; i < dispo.length; i++){ r -= poids[i]; if (r <= 0){ a = dispo[i]; break; } }
  S.vuArrets[a.id] = (S.vuArrets[a.id] || 0) + 1;
  S.recentArrets = [a.id, ...recents].slice(0, 3);
  S.arrets++;
  const sujet = a.sujet ? a.sujet() : null;
  S.arret = { id:a.id, titre:a.titre, texte:a.texte(sujet), sujet,
    options: a.options.map(o => ({ l:o.l, dits:o.dits })) };
  S.ecran = 'carret'; sauver(); rendre();
}
function cChoisirArret(i){
  const a = CARRETS.find(x => x.id === S.arret.id);
  const o = a.options[i] || a.options[0];
  const sujet = S.arret.sujet;
  const suite = cAppliquer(o, sujet);
  S.semaineArret = { titre: a.titre, choix: o.l, suite: suite || null };
  S.stats.decisions++;
  jrn('arret', `${a.titre} — « ${o.l} ».`);
  cLancerMatch();
}
function cAppliquer(o, sujet){
  let suite = null;
  if (o.liens) Object.entries(o.liens).forEach(([k, v]) => {
    if (k === 'proches') bougerProches(v);
    else if (k === 'president') v < 0 ? cCoutPresident(-v, null) : (S.liens.president = clamp(S.liens.president + v));
    else S.liens[k] = clamp((S.liens[k] || 50) + v); });
  if (o.ligne) cBougerVestiaire(o.ligne);
  if (o.axes) Object.entries(o.axes).forEach(([k, v]) => cBougerAxe(k, v));
  if (o.fit) S.grp.fr = clamp(S.grp.fr + o.fit, 0, 100);
  if (o.plan) S.grp.plan = (S.grp.plan || 0) + o.plan;
  if (o.risqueBut) S.grp.ouvert = o.risqueBut;
  const qui = sujet ? S.equipe.find(j => j.nom === sujet) : null;
  if (o.formeSujet && qui) bougerForme(qui, o.formeSujet);
  if (o.soinSujet && qui){ qui.blesse = Math.max(qui.blesse, 3);
    suite = `${qui.nom} est arrêté trois semaines. On le reverra en forme.`; }
  if (o.jeune){ const j = S.equipe.find(x => x.monte);
    if (j){ if (o.jeune > 0){ j.niv += o.jeune * .3; bougerForme(j, 2.5);
        suite = `${j.nom} a joué, et il a tenu. Il ne reviendra pas en arrière.`; }
      else bougerForme(j, o.jeune); } }
  if (o.risque && qui && Math.random() < o.risque){
    qui.blesse = ri(3, 6);
    suite = `${qui.nom} est ressorti au bout de vingt minutes. Un mois et demi.`;
  }
  if (o.risqueSusp && qui && Math.random() < o.risqueSusp){
    qui.susp = 1;
    suite = `${qui.nom} a pris son carton. Il manquera le prochain.`;
  }
  if (o.offres) S.bonusOffres = (S.bonusOffres || 0) + o.offres;
  return suite;
}

/* ================== LA FIN DE SAISON ==================
   « Après les décisions vient le temps où l'on souffle et où l'on lit ce qu'elles
   ont produit » (le propriétaire, 21/09/2026). C'était la force de la 1.0 côté
   entraîneur·euse, et c'est le seul écran du mode qui ne demande rien. */
function cFinSaison(){
  const pos = cPlace(), N = S.ligue.equipes.length, div = S.division || 1;
  const atteint = pos <= S.objectif;
  /* Le verdict du président, en une seule formule pour qu'aucun écran ne puisse en
     raconter une autre : la place contre l'objectif, le podium, la zone rouge, et
     son humeur de l'année. */
  const ecart = S.objectif - pos;               // positif = mieux que demandé
  let d = clamp(ecart * 3.2, -24, 11);
  if (pos === 1 && div === 1) d += 10;
  if (S.coupe.gagnee) d += 8;
  if (S.euro.gagnee) d += 10;
  if (div === 1 && pos > N - MONTEES) d -= 14;  // la descente
  if (div === 2 && pos <= MONTEES) d += 16;     // la montée
  if (d < 0) cCoutPresident(-d, "la saison"); else S.liens.president = clamp(S.liens.president + d);
  const desc = div === 1 && pos > N - MONTEES, mont = div === 2 && pos <= MONTEES;
  S.bilan = {
    pos, division: div, nbClubs: N, objectif: S.objectif, atteint,
    descente: desc, montee: mont,
    v: S.stats.v, n: S.stats.n, dd: S.stats.d, bp: S.stats.bp, bc: S.stats.bc,
    decisions: S.stats.decisions,
    grand: cGrandSoir(), oubli: cSoirOublie(),
    vestiaire: cQuiVeutQuoi(),
    phrase: cPhrasePresident(atteint, pos, desc, mont),
    ambition: cJugerAmbition(pos, desc, mont),
  };
  S.carriere = S.carriere || { saisons:0, clubs:[], annees:[], titres:0, coupes:0, europes:0, montees:0, virages:0 };
  const c = S.carriere;
  c.saisons++;
  if (!c.clubs.includes(S.club.nom)) c.clubs.push(S.club.nom);
  if (pos === 1 && div === 1) c.titres++;
  if (mont) c.montees++;
  if (S.coupe.gagnee) c.coupes++;
  if (S.euro.gagnee) c.europes++;
  c.annees.push({ annee: S.annee, club: S.club.nom, pos, div, objectif: S.objectif,
    v: S.stats.v, n: S.stats.n, d: S.stats.d, coupe: S.coupe.gagnee, euro: S.euro.gagnee });
  jrn('saison', `${S.club.nom} finit ${pos}ᵉ de ${nomDivision()} (objectif ${S.objectif}ᵉ). ${S.stats.v}V ${S.stats.n}N ${S.stats.d}D.`);
  S.saisonsClub++;
  S.ecran = 'cbilan'; sauver(); rendre();
}
function cGrandSoir(){
  const l = S.journal.filter(x => x.annee === S.annee && x.type === 'match');
  return l.length ? l[l.length - 1].txt : null;
}
/* Le soir qu'on veut oublier : la défaite la plus lourde de l'année. Le bilan de la
   1.0 en faisait son film, et c'est ce qui le rendait beau. */
function cSoirOublie(){
  const l = S.journal.filter(x => x.annee === S.annee && x.type === 'match');
  let pire = null, ecart = 0;
  l.forEach(x => {
    const mm = /(\d+)-(\d+)/.exec(x.txt); if (!mm) return;
    const e = +mm[2] - +mm[1];
    if (e > ecart){ ecart = e; pire = x.txt; }
  });
  return ecart >= 2 ? pire : null;
}
/* Qui veut partir, qui resterait : le vestiaire du bilan, qui était la meilleure
   partie de l'écran en 1.0. On le lit sur ce que la saison leur a donné. */
function cQuiVeutQuoi(){
  const l = S.equipe.map(j => ({ nom:j.nom, poste:j.poste, age:j.age, niv:j.niv,
    moy: moyDe(j), nb: j.nb || 0, forme: j.forme || 0, monte: !!j.monte }));
  const joue = l.filter(x => x.nb >= 6);
  const grandi = joue.filter(x => x.age <= 23).sort((a, b) => (b.moy || 0) - (a.moy || 0))[0] || null;
  const part = l.filter(x => x.nb <= 3 && x.age >= 24).sort((a, b) => b.niv - a.niv)[0] || null;
  const reste = joue.sort((a, b) => (b.moy || 0) - (a.moy || 0))[0] || null;
  return { grandi, part, reste };
}
function cPhrasePresident(atteint, pos, desc, mont){
  if (desc) return `« On descend. Je ne peux pas faire comme si de rien n'était. »`;
  if (mont) return `« On remonte. Je n'oublierai pas qui nous a remontés. »`;
  if (pos === 1) return `« Champions. Tu sais ce que ça fait, ici ? »`;
  if (atteint && S.liens.president > 64) return `« C'est exactement ce que je voulais. On continue. »`;
  if (atteint) return `« L'objectif est tenu. Je ne dis pas que tout m'a plu. »`;
  if (S.liens.president < 34) return `« Je ne vais pas te mentir. Je regarde ailleurs. »`;
  return `« Ce n'est pas la saison qu'on avait prévue. J'attends autre chose. »`;
}
/* L'ambition, lue — c'était un champ mort en 1.0 comme en 2.0 joueur avant la vie. */
function cJugerAmbition(pos, desc, mont){
  const a = S.moi.ambition;
  if (a === 'titres'){
    const t = pos === 1 || S.coupe.gagnee || S.euro.gagnee;
    return t ? { ok:true, t:"Tu étais venu pour un trophée. Il est là." }
      : pos <= 3 || mont ? { ok:null, t:"Tu t'en approches. Ce n'est pas la même chose." }
      : { ok:false, t:"Tu étais venu pour gagner. On ne gagne pas." };
  }
  if (a === 'maison'){
    return S.saisonsClub >= 3 && !desc ? { ok:true, t:`Trois saisons ici, et le club va mieux qu'à ton arrivée.` }
      : desc ? { ok:false, t:"Bâtir une maison, et la laisser tomber d'un étage." }
      : { ok:null, t:"On ne bâtit pas une maison en une saison." };
  }
  const j = S.equipe.filter(x => x.age <= 23 && (x.nb || 0) >= 10).length;
  return j >= 3 ? { ok:true, t:`${j} joueurs de moins de 23 ans ont joué dix matchs ou plus. C'est ça, ton métier.` }
    : j >= 1 ? { ok:null, t:`${j} jeune${j > 1 ? 's' : ''} a vraiment joué. C'est un début.` }
    : { ok:false, t:"Aucun jeune n'a percé. Tu as géré, tu n'as pas formé." };
}
/* ---------------- la suite : on reste, on part, on cherche ---------------- */
const C_FIN = 68;
function cOuvrirEte(){
  /* L'ordre est celui du mode joueur·euse, et pour la même raison : on note les
     rangs, les divisions s'échangent, les deux championnats vieillissent, **puis**
     les offres — donc un club t'appelle avec la force qu'il a vraiment cet été. */
  S.moi.age++;
  if (S.moi.age >= C_FIN) return cFinCarriere("l'âge");
  noterRangs();
  cSyncEffectif();
  promotionsRelegations();
  faireVivreLigue();
  cLireEffectif();
  cGenererOffres();
  S.ecran = 'coffres'; sauver(); rendre();
}
/* QUI T'APPELLE. Une proposition à la fois, comme pour le joueur·euse : refuser la
   fait disparaître, et la suivante peut être pire ou ne pas venir. Ta cote, c'est
   ce que tu as fait (le président, la presse) plus ton réseau. */
function cCote(){
  return clamp(S.club.force
    + (S.liens.presse - 50) * .10
    + (S.liens.president - 50) * .06
    + (cAxe('reseau') - 50) * .08
    + (S.carriere ? Math.min(6, S.carriere.titres * 2.5 + S.carriere.coupes * 1.2) : 0)
    + (S.bilan && S.bilan.atteint ? 2 : -2), 38, 82);
}
function cGenererOffres(){
  const cote = cCote();
  const libre = !!S.vire || (S.bilan && S.liens.president < 32);
  const tous = toutesLesEquipes().filter(e => e.nom !== S.club.nom);
  /* Un gros club n'appelle pas tous les étés : le tirage est pondéré, un club à ta
     portée appelle volontiers, un club au-dessus de toi rarement. C'est la
     correction mesurée le 27/09 côté joueur·euse, et elle vaut ici. */
  const poids = e => {
    const d = e.force - cote;
    return d <= 0 ? Math.exp(-Math.abs(d) / 7) : Math.exp(-d / 3.2);
  };
  const n = clamp(1 + (libre ? 1 : 0) + (S.bonusOffres || 0) + (Math.random() < .45 ? 1 : 0), 1, 4);
  const l = [];
  for (let k = 0; k < n; k++){
    const cand = tous.filter(e => !l.some(o => o.nom === e.nom));
    if (!cand.length) break;
    const p = cand.map(poids), t = p.reduce((a, b) => a + b, 0);
    let r = Math.random() * t, e = cand[0];
    for (let i = 0; i < cand.length; i++){ r -= p[i]; if (r <= 0){ e = cand[i]; break; } }
    const d2 = (S.ligue.autre || []).some(x => x.nom === e.nom) ? (S.division === 1 ? 2 : 1) : S.division;
    /* L'objectif qu'on te promet découle du rang de SON effectif dans SON
       championnat, exactement comme le tien : un club t'annonce donc ce qu'il peut
       honnêtement demander, et l'écran ne pourra pas être démenti en août. */
    const div = d2 === S.division ? S.ligue.equipes : S.ligue.autre;
    const rang = div.slice().sort((a, b) => b.force - a.force).findIndex(x => x.nom === e.nom) + 1;
    l.push({ nom:e.nom, force:e.force, division:d2, rang,
      objectif: clamp(rang - 2, 1, Math.max(1, div.length - MONTEES)),
      salaire: Math.round(salaireDe(e.force, 40, e.force, d2) * clamp(.55 + (S.liens.presse - 50) * .006, .4, 1.1) * 1000) / 1000,
      ans: ri(1, 3) });
  }
  S.offres = l; S.offreIdx = 0; S.libre = libre; S.bonusOffres = 0;
}
function cOffreCourante(){ return (S.offres || [])[S.offreIdx || 0] || null; }
function cPasserOffre(){ S.offreIdx = (S.offreIdx || 0) + 1;
  if (!cOffreCourante() && S.libre) return cFinCarriere("personne n'a rappelé");
  sauver(); rendre(); }
function cSignerOffre(){
  const o = cOffreCourante(); if (!o) return;
  const club = toutesLesEquipes().find(e => e.nom === o.nom); if (!club) return;
  S.club = { nom: club.nom, force: Math.round(club.force) };
  if ((S.ligue.autre || []).some(x => x.nom === club.nom)){
    const t = S.ligue.equipes; S.ligue.equipes = S.ligue.autre; S.ligue.autre = t;
    S.division = (S.division || 1) === 1 ? 2 : 1;
  }
  S.equipe = []; cLireEffectif();
  S.lignes = { def:50, mil:50, att:50 }; S.ligneRef = { ...S.lignes };
  S.liens.president = 58; S.liens.direction = 50; S.liens.supporters = 46; S.liens.presse = clamp(S.liens.presse);
  S.saisonsClub = 0;
  poserSalaire(o.salaire);
  jrn('offre', `Tu signes à ${club.nom} (${nomDivision(S.division)}), ${sous(o.salaire)} par an.`);
  cDemarrerSaison();
}
function cResterAuClub(){
  /* Rester, c'est renégocier : ce que le club lâche dépend de ce qu'il pense de toi. */
  const v = cSalaire() * clamp(1 + (S.liens.president - 50) * .006, .8, 1.25);
  poserSalaire(Math.round(v * 1000) / 1000);
  jrn('offre', `Tu restes à ${S.club.nom}. ${sous(S.salaire)} par an.`);
  cDemarrerSaison();
}
function cFinCarriere(raison){
  S.fin = { raison, annee: S.annee };
  jrn('fin', `Fin du parcours : ${raison}.`);
  S.ecran = 'ccarriere'; sauver(); rendre();
}
function cDemarrerSaison(){
  /* Le marché se joue APRÈS ta signature : un club construit autour de l'entraîneur
     qu'il vient de prendre, et tu lis ce qu'il a fait. */
  const mv = mercato();
  cLireEffectif();
  S.mercatoVu = mv;
  S.annee++;
  const e = monClub();
  S.club = { nom: S.club.nom, force: e ? e.force : S.club.force };
  S.grp = { fr: 100, plan: 0, athle: 0 };
  S.journee = 0; S.arrets = 0; S.semaine = null; S.seance = null; S.match = null;
  S.dernier = null; S.annexe = null; S.eqJour = null; S.vire = null;
  S.serie = []; S.vuArrets = {}; S.recentArrets = []; S.recentMoments = [];
  S.stats = { j:0, v:0, n:0, d:0, bp:0, bc:0, decisions:0 };
  S.moi.an0 = { ...S.moi.base };
  const podium = S.bilan && S.bilan.pos <= 3 && S.bilan.division === 1;
  const coupe = S.coupe && S.coupe.gagnee;
  S.euro = { engage: !!((S.division || 1) === 1 && (podium || coupe)), vivant:true, tour:0, pts:0, hist:[], gagnee:false };
  S.coupe = { vivant:true, tour:0, hist:[], gagnee:false };
  S.bilan = null;
  cPoserObjectif();
  jrn('saison', `${S.annee}-${S.annee + 1} à ${S.club.nom} : objectif ${S.objectif}ᵉ de ${nomDivision()}.`);
  S.ecran = 'cmercato'; sauver(); rendre();
}
function cFinirMercato(){ S.ecran = 'csemaine'; sauver(); rendre(); }

/* ---------------- les mots, jamais les chiffres ---------------- */
const CMOTS = {
  president: ["Il cherche ton remplaçant.", "Il ne te défend plus.", "Il attend de voir.",
    "Il te fait confiance.", "Il te soutient publiquement.", "Il construit avec toi."],
  direction: ["La direction te contourne.", "On t'informe, on ne te demande rien.",
    "On t'écoute, parfois.", "On te consulte.", "On te suit.", "C'est toi qui décides, en haut aussi."],
  presse: ["On écrit que tu es fini.", "On ne parle de toi qu'en mal.",
    "On t'ignore.", "On te cite.", "On t'écoute.", "Tu fais les titres, et en bien."],
  supporters: ["Le stade te siffle.", "On ne te croit pas.", "On attend de voir.",
    "Le stade t'apprécie.", "Le stade t'attend.", "C'est ton stade."],
};
function cDire(k){ return k === 'vestiaire' ? MOTS.vestiaire[bande(vestiaire())] : CMOTS[k][bande(S.liens[k])]; }
function cDirePresident(){ return CMOTS.president[bande(S.liens.president)]; }
/* Ce que chaque jauge change, écrit sous la phrase : la règle du projet, sans quoi
   rebrancher une jauge ne se voit pas. Les seuils sont ceux du moteur. */
function cPourquoi(k){
  if (k === 'president'){
    const v = S.liens.president;
    return v >= 64 ? "Il passera l'éponge sur une mauvaise série."
      : v >= 40 ? "C'est lui qui décidera en juin."
      : v >= 22 ? "Une mauvaise série de plus et c'est fini."
      : "Au prochain bilan de quart de saison, tu peux sauter.";
  }
  if (k === 'direction') return S.liens.direction > 62
    ? "Elle peut te protéger une fois si le président lâche." : "Elle ne s'interposera pas.";
  if (k === 'presse') return S.liens.presse > 56
    ? "C'est elle qui fait qu'un autre club pense à toi." : "Personne ne parle de toi ailleurs.";
  if (k === 'supporters'){
    const v = S.liens.supporters;
    return v >= 72 ? "À domicile, ils vous portent : un demi-terrain de plus."
      : v >= 56 ? "À domicile, ils poussent un peu."
      : v >= 44 ? "À domicile, ça ne pèse presque rien."
      : "À domicile, le stade vous pèse plus qu'il ne vous porte.";
  }
  return null;
}
function cDireJambes(){
  const v = S.grp.fr;
  return v > 88 ? "Le groupe est frais. Tout est possible samedi."
    : v > 72 ? "Les jambes vont bien."
    : v > 58 ? "Ils tirent un peu la langue en fin de séance."
    : v > 40 ? "Le groupe est émoussé — samedi se jouera sur les nerfs."
    : v > 22 ? "Ils sont cuits. Tu le vois à la façon dont ils marchent."
    : "Vidés. Si tu ne lâches pas du lest, ça va casser quelque part.";
}
function cDireCondition(){
  const v = cCondition();
  return v >= 4.5 ? "Ils encaissent tout : ils récupèrent vite et ne se blessent presque plus."
    : v >= 2.5 ? "Le groupe est bien préparé : ça se voit à la récupération."
    : v >= 1 ? "Un peu de fond, pas beaucoup."
    : "Aucun fond. Ils récupèrent lentement et ça casse au moindre enchaînement.";
}
function cDireObjectif(){
  const p = cPlace();
  return p <= S.objectif ? `${p}ᵉ pour un objectif ${S.objectif}ᵉ — tu es dans les clous.`
    : p <= S.objectif + 3 ? `${p}ᵉ pour un objectif ${S.objectif}ᵉ — ça se joue de peu.`
    : `${p}ᵉ pour un objectif ${S.objectif}ᵉ. Il faut remonter.`;
}
function cDireAxe(a){
  const v = cAxe(a);
  const b = v >= 72 ? 3 : v >= 58 ? 2 : v >= 44 ? 1 : 0;
  return {
    jeu: ["Ton équipe ne produit rien que l'adversaire n'ait vu venir.",
      "Ton équipe joue, sans surprendre personne.",
      "Ton équipe sait ce qu'elle fait, et ça se voit au tableau.",
      "Ton équipe applique des choses que personne d'autre ne fait."][b],
    groupe: ["Le vestiaire t'échappe : ce qui tombe ne se relève pas.",
      "Le vestiaire tient, sans plus.",
      "Le vestiaire absorbe les coups durs.",
      "Le vestiaire te suivrait n'importe où, et ça se répare vite."][b],
    banc: ["Tes décisions de match tombent à côté plus souvent qu'elles ne devraient.",
      "Tu décides correctement, sans génie.",
      "Tes coups du banc marchent souvent.",
      "Tu changes un match avec un changement, et ça se sait."][b],
    reseau: ["Personne ne décroche quand tu appelles.",
      "Tu as quelques numéros.",
      "On te rappelle, et on t'écoute.",
      "Tu as un numéro pour chaque situation, et on décroche."][b],
  }[a];
}
