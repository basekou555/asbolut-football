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
    v: VERSION, mode: 'coach', annee: c.annee, division: 1, pays: 'FR', argent: 0, salaire: 0,
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
  cLireEffectif(true);
  cPoserObjectif();
  cPoserPlafond();
  poserSalaire(cSalaire());
  S.vie.anVie = S.annee;
  jrn('debut', `${S.moi.nom}, entraîneur·euse de ${S.club.nom}. ${nomDivision()}, objectif ${S.objectif}ᵉ.`);
  /* LA PREMIÈRE SAISON A SON MERCATO AUSSI. Un entraîneur qui signe recrute — et
     faire attendre trente-quatre journées avant de montrer ce qu'il appelle sa partie
     préférée du mode serait le pire ordre possible. */
  cOuvrirMercato(false);
  return S;
}

/* ---------------- l'effectif, qui est celui du club ---------------- */
/* UN ENTRAÎNEUR·EUSE N'A PAS DE CONCURRENT À SON POSTE : il a un effectif. Les
   vingt-deux joueurs de son club sont **ceux de la ligue** — ceux qu'on lit au
   classement, ceux que le marché déplace — et non un groupe tiré au sort pour
   l'occasion. `S.concurrents` reste vide : c'est ce qui fait que tout le code
   partagé (le onze du jour, les notes, les changements) marche sans savoir qu'il
   n'y a personne qui s'appelle « moi ». */
/* LE PARAMÈTRE QUI RÉPARE UNE RÉGRESSION (le propriétaire, 05/10/2026 : « à chaque
   mise à jour je prends les stats de mes joueurs »). La remise à zéro de la saison a
   été posée ici le 04/10 — mais `demarrer()` appelle `cLireEffectif()` **à chaque
   chargement de page**, donc chaque mise en ligne effaçait les statistiques, la forme,
   les blessures, les suspensions et les rancunes de tout le groupe. Elle ne vaut que
   pour un été (`cOuvrirEte`, `cDemarrerSaison`), une signature ailleurs ou une partie
   neuve ; la relecture d'une sauvegarde ne touche à rien. */
function cLireEffectif(neuf){
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
  /* LA SAISON REPART DE ZÉRO, et elle ne le faisait pas. `relireClubSq()` remet les
     compteurs du joueur·euse chaque été ; ici rien ne les touchait, donc la moyenne
     et les buts affichés dans l'effectif étaient ceux de **toute la carrière** du
     joueur, pas de la saison. Trouvé en branchant les stats de l'effectif
     (04/10/2026) : sans cette ligne, « 23 buts » ne voulait rien dire. */
  if (neuf) S.equipe.forEach(j => { j.forme = 0; j.blesse = 0; j.susp = 0; j.rancune = 0;
    j.note = null; j.noteR = null; j.sum = 0; j.nb = 0; j.sumR = 0; j.nbR = 0;
    j.sB = 0; j.sP = 0; j.sJ = 0; j.sRC = 0; j.sMin = 0; });
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
/* CE QU'ON PAIE UN BANC. Mesuré avant de toucher à la formule, une carrière entière :
   un entraîneur gagnait **2 à 25 k€ par an**, et son compte finissait à 93 k€ après
   vingt-cinq saisons. La cause est une réutilisation abusive : `salaireDe()` est la
   courbe d'un **joueur**, convexe parce qu'un très bon joueur vaut dix fois un bon
   (`((niv-45)/30)^2,6`), et on lui passait la **force d'un club** — or un club de
   seconde division vaut 45, c'est-à-dire le pied de la courbe, c'est-à-dire rien.
   Un banc ne se paie pas comme une star : il se paie au standing du club, plus ce
   qu'on a déjà gagné. D'où une courbe à soi, en millions de 2015 : 0,22 en D2,
   0,6 pour un milieu de Ligue 1, 2,7 pour un grand de France, 5,9 pour un grand
   d'Europe. Le palmarès vaut jusqu'à 80 % de plus — c'est ce qui rend un vainqueur
   cher, et c'est la seule chose du métier qui s'accumule. */
const C_SAL_BASE = .22, C_SAL_PENTE = 10.5;
/* `pays` est facultatif : sans lui on lit celui où tu entraînes. */
function cSalaireDe(force, div, presse, pays){
  const era = typeof eraForYear === 'function' ? eraForYear(S.annee) : { marketSize:1 };
  const c = S.carriere || { titres:0, coupes:0 };
  const palmares = 1 + Math.min(.8, (c.titres || 0) * .12 + (c.coupes || 0) * .05);
  return Math.round(C_SAL_BASE * Math.exp((force - 45) / C_SAL_PENTE)
    * clamp(.65 + ((presse == null ? 50 : presse) - 50) * .006, .45, 1.15)
    * ((div || 1) === 2 ? .45 : 1) * palmares * (era.marketSize || 1)
    * facteurPays(pays || S.pays || 'FR', S.annee) * 1000) / 1000;
}
function cSalaire(){
  return cSalaireDe(S.club.force, S.division || 1, S.liens.president);
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
    /* LA TÊTE AILLEURS. C'est le prix de la méthode qu'on écrit : la pastille le
       promet (« tu as la tête ailleurs cette saison »), donc le moteur doit le
       tenir — une promesse d'écran sans conséquence est le défaut que ce projet
       traque depuis le début. La saison où tu écris, tes séances rendent 35 % de
       moins ; `S.lectureDure` s'efface au bilan suivant. */
    const tete = S.lectureDure ? .65 : 1;
    S.moi.boost[s.axe] = clamp(S.moi.boost[s.axe] + CBOOST * tirage * tete * (cAxe(s.axe) / 100), 0, 14);
    cBougerAxe(s.axe, CTRACE * tirage * tete * marge * 4);
    txt += ` ` + (tirage >= 1.6 ? `Tu as appris quelque chose cette semaine.`
      : tirage >= 1 ? `Du travail honnête.` : `Tu n'as rien tiré de cette séance.`);
    if (S.lectureDure) txt += ` Ton livre te prend la tête, et tes séances en souffrent.`;
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
  /* CE QUE LE MERCREDI A COÛTÉ, RETENU AU MOMENT OÙ IL LE COÛTE. L'écran de résultat
     se lit après le samedi, donc `S.grp.fr` a déjà rebougé : sans cette photo, le
     coach lirait les jambes d'après-match et non le prix de son mercredi. Et
     `cadres` dit ce qu'il a aligné — combien de son onze le plus fort a joué —,
     c'est-à-dire la rotation, qui est tout l'arbitrage de la semaine. */
  m.fr = Math.round(S.grp.fr);
  const forts = (S.equipe || []).slice().sort((a, b) => b.niv - a.niv).slice(0, 11)
    .map(x => x.nom);
  m.cadres = eq.onze.filter(x => forts.includes(x.nom)).length;
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
  /* LES AUTRES MATCHS DE LA JOURNÉE SE JOUENT ICI, PAS UN ÉCRAN PLUS TARD (le
     propriétaire, 05/10/2026 : « des fois je suis à une position du classement, je
     gagne un match, et je descends au classement… j'ai l'impression que le classement
     évolue d'une manière incompréhensible »). Il avait raison, et la cause est un
     défaut d'ordre : `autresMatchs()` était appelé dans `cApresMatch()`, c'est-à-dire
     **après** que tu as lu l'écran de résultat. Le classement de cet écran comptait
     donc ton match et aucun des huit autres — mesuré : **un match d'écart entre les
     clubs à 100 % des journées**. Tu te voyais deuxième sur une journée incomplète,
     puis la semaine suivante affichait la vraie journée et tu avais « descendu en
     gagnant ». Le mode joueur·euse le fait correctement depuis toujours, dans
     `finirMatch()` : c'était une asymétrie, pas un choix. */
  autresMatchs();
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
  /* `cDire` et non `dire` : la seconde lit `MOTS`, le vocabulaire du joueur·euse, et
     sortait donc « Ton nom circule un peu » à un entraîneur là où son propre
     `CMOTS.supporters` dit « On attend de voir ». Trouvé par la sonde de voix du
     05/10, qui ne l'avait pas vu la première fois parce que ses aiguilles étaient
     écrites de mémoire au lieu d'être prises dans `MOTS`. */
  if (Math.abs(S.liens.supporters - g0.supporters) >= 2.4) mot('supporters', S.liens.supporters > g0.supporters, cDire('supporters'));
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
  /* LE RAPPEL DES TIENS, et une correction à ce que j'avais écrit plus haut dans ce
     fichier : j'y affirmais que la jauge du coach n'en avait pas besoin, parce qu'elle
     tenait une médiane de 64. C'était vrai **avant** que l'écran de la vie existe.
     Mesuré après, 240 saisons : elle devient bimodale — 100 de médiane quand on
     s'occupe des siens (la maison vaut +22, « faire vivre les tiens » +14 par an) et
     **5** quand on ne le fait jamais. Les deux bouts sont faux, et un seul rappel les
     ferme tous les deux : il relève le bas et il empêche le haut de se figer. C'est le
     même correctif qu'on a dû faire au stade le 29/09 et aux proches du joueur·euse. */
  if (S.vie) bougerProches((cibleProches() - S.vie.proches) * RAPPEL_PROCHES);
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
  /* LE MERCATO D'HIVER, à la trêve. Le moteur le prévoyait déjà (budget au quart,
     neuf dossiers, pas de centre de formation) : il n'avait pas de porte. C'est la
     fenêtre où l'on répare une première moitié de saison — ou où l'on se grille. */
  if (S.journee === J_HIVER && !S.hiverFait && eraHasWinterMercato(S.annee)){
    S.hiverFait = true; return cOuvrirMercato(true); }
  S.ecran = 'csemaine'; sauver(); rendre();
}
const J_HIVER = 17;
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
  /* UN SUJET EST UN NOM, PAS UN JOUEUR (défaut antérieur, trouvé le 01/10/2026 en
     rendant tous les écrans sur 71 fenêtres de mercato). `visageDe()` rend l'objet,
     et les cinq autres familles rendent une chaîne — donc celle-ci se lisait
     « **[object Object]** est en train de se perdre » **et** `cAppliquer()`, qui
     retrouve le joueur par `S.equipe.find(j => j.nom === sujet)`, n'en trouvait
     jamais aucun : le `formeSujet` de la première option ne s'appliquait à personne. */
  { id:'capitaine', quand: () => S.journee >= 4 && ligneFaible() != null,
    titre:"Le capitaine frappe à la porte",
    sujet: () => { const j = visageDe(ligneFaible()); return j ? j.nom : "Ton joueur"; },
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
  /* LE DOSSIER DU DIRECTEUR SPORTIF ARRIVE VRAIMENT (le propriétaire, 05/10/2026 :
     « la direction me propose des joueurs, je les accepte, mais je les vois jamais
     arriver — ça aussi, c'est pas cohérent »). Il avait raison et c'était un trou
     complet : l'option rendait `axes` et `liens`, et **rien d'autre**. Le texte
     promettait un joueur disponible en janvier, et personne ne venait jamais.
     Désormais le candidat est **tiré avant le clic** (`cible()`), donc le texte le
     **nomme** — sinon on ne pourrait pas le reconnaître en arrivant — et dire oui le
     range dans `S.dossierDS`, que la prochaine fenêtre de mercato pose sur la table à
     coup sûr. Il est cher (×1,3, c'est le mot du texte) et il est à ton poste le plus
     faible, ce qui est la seule chose que le dossier promettait déjà. */
  { id:'direction', quand: () => S.journee >= 6 && !S.dossierDS,
    titre:"Le directeur sportif",
    cible: () => cCandidatDS(),
    texte: (s, c) => c
      ? `« J'ai un dossier : ${c.nom}, ${c.age} ans, ${C_POSTE_NOM[c.poste]}. Cher, mais disponible ${cMotFenetre()}. »`
      : `« J'ai un dossier. Un joueur à ton poste faible, cher, disponible ${cMotFenetre()}. »`,
    options:[
      { l:"Lui dire oui, et porter le dossier", dossier:true, axes:{ reseau:1 },
        liens:{ direction:6, president:-3 },
        dits:[{c:'foot', t:"🤝 il sera sur la table au mercato"}, {c:'risk', t:"🏛️ le président verra la facture"}] },
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
  /* Une famille peut avoir besoin de **quelqu'un qui n'est pas dans ton effectif** :
     le dossier du directeur sportif parle d'un joueur d'ailleurs, et le texte doit le
     nommer avant le clic pour qu'on le reconnaisse quand il arrive sur la table.
     `cible()` le fabrique une fois, et il est rangé en objet simple dans la
     sauvegarde — jamais un pointeur. */
  const cible = a.cible ? a.cible() : null;
  S.arret = { id:a.id, titre:a.titre, texte:a.texte(sujet, cible), sujet, cible,
    options: a.options.map(o => ({ l:o.l, dits:o.dits })) };
  S.ecran = 'carret'; sauver(); rendre();
}
function cChoisirArret(i){
  const a = CARRETS.find(x => x.id === S.arret.id);
  const o = a.options[i] || a.options[0];
  const sujet = S.arret.sujet;
  const suite = cAppliquer(o, sujet, S.arret.cible);
  S.semaineArret = { titre: a.titre, choix: o.l, suite: suite || null };
  S.stats.decisions++;
  jrn('arret', `${a.titre} — « ${o.l} ».`);
  cLancerMatch();
}
function cAppliquer(o, sujet, cible){
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
  if (o.dossier){
    /* Une sauvegarde arrêtée sur cet écran avant ce lot n'a pas de `cible` : on en
       fabrique une. C'est cohérent, puisque son texte ne nommait personne. */
    S.dossierDS = cible || cCandidatDS();
    const cible2 = S.dossierDS;
    suite = `${cible2.nom} sera sur la table ${cMotFenetre()}. Le directeur sportif s'en occupe.`;
  }
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
  /* Les pays traversés : le bilan de carrière les relit. */
  c.pays = c.pays || [];
  if (!c.pays.includes(S.pays || 'FR')) c.pays.push(S.pays || 'FR');
  if (pos === 1 && div === 1) c.titres++;
  if (mont) c.montees++;
  if (S.coupe.gagnee) c.coupes++;
  if (S.euro.gagnee) c.europes++;
  c.annees.push({ annee: S.annee, club: S.club.nom, pays: S.pays || 'FR', pos, div, objectif: S.objectif,
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
  /* FAIRE ÉCLORE N'EST PAS AVOIR UN EFFECTIF JEUNE. Mesuré pour la première fois,
     454 saisons : cette ambition était satisfaite **100 % du temps** — son test était
     « trois joueurs de moins de 23 ans à dix matchs », et un effectif de vingt-deux en
     compte **neuf** de médiane. Elle ne mesurait donc pas une décision mais la pyramide
     des âges du club, qu'on ne choisit pas. Un jeune qui éclôt, c'est un jeune que tu
     as **titularisé** et qui a **répondu** : moins de 23 ans, la moitié de la saison
     jouée, et une moyenne au-dessus de 6,6. Mesuré sur 197 saisons : deux et plus dans
     33 % des saisons, un dans 30 %, aucun dans 37 % — un arbitrage, enfin. */
  const moy = x => (x.nb || 0) ? (x.sum || 0) / x.nb : 0;
  const ecl = S.equipe.filter(x => x.age <= 22 && (x.nb || 0) >= 17 && moy(x) >= 6.6);
  const j = ecl.length;
  const noms = liste(ecl.slice(0, 2).map(x => x.nom));
  return j >= 2 ? { ok:true, t:`${noms} ${j > 2 ? `et ${j - 2} autre${j > 3 ? 's' : ''} ` : ''}ont tenu une saison pleine à ton poste de confiance. C'est ça, ton métier.` }
    : j === 1 ? { ok:null, t:`${noms} a tenu sa saison. Un seul, mais il existe maintenant.` }
    : { ok:false, t:"Aucun jeune n'a percé. Tu as géré, tu n'as pas formé." };
}
/* ---------------- la suite : on reste, on part, on cherche ---------------- */
const C_FIN = 68;
/* ================== L'ARGENT ET LA VIE DU COACH ==================
   Mesuré avant d'écrire une ligne, 10 carrières de huit saisons : `S.argent` a une
   **médiane de zéro et un maximum de zéro**. Il avait un salaire (`cSalaire()`, lu par
   les offres) et **rien ne créditait jamais le compte** — donc rien à en faire, et pas
   d'écran pour le faire. C'est le même trou que le mode joueur·euse avait avant le
   27/09, et il se referme de la même façon.
   Les tiens, eux, avaient besoin de quelque chose à faire : un seul arrêt les touchait,
   et la jauge tenait une médiane de 64 sans rien demander à personne. Ils ont maintenant
   un écran — et, mesuré après, un rappel, parce que cet écran les faisait saturer
   (voir `cApresMatch`). */
function cPrimes(){
  const p = [], sal = S.salaire || 0;
  if (S.bilan && S.bilan.pos === 1 && S.bilan.division === 1) p.push({ q: sal * .7, t:"le titre" });
  if (S.coupe && S.coupe.gagnee) p.push({ q: sal * .35, t:"la coupe" });
  if (S.euro && S.euro.gagnee) p.push({ q: sal * .55, t:"l'Europe" });
  if (S.bilan && S.bilan.montee) p.push({ q: sal * .4, t:"la montée" });
  /* Et la prime d'objectif, qui est la prime d'un entraîneur : il n'a pas de matchs
     joués à faire valoir, il a une place promise en août. */
  if (S.bilan && S.bilan.pos <= S.objectif) p.push({ q: sal * .25, t:"l'objectif tenu" });
  return p;
}
function cEncaisserLaSaison(){
  const primes = cPrimes();
  const total = (S.salaire || 0) + primes.reduce((a, x) => a + x.q, 0);
  S.argent = Math.round(((S.argent || 0) + total) * 1000) / 1000;
  S.vie.gagneAvant = S.vie.gagne || 0;
  S.vie.gagne = Math.round(total * 1000) / 1000;
  S.vie.primes = primes.map(x => x.t);
  S.vie.salaireMax = Math.max(S.vie.salaireMax || 0, S.salaire || 0);
  // une affaire qui tourne rapporte chaque année, et peut couler
  const co = (S.vie.chantiers || []).find(x => x.id === 'commerce' && !x.coule);
  if (co){
    if (Math.random() < .05){ co.coule = true; jrn('argent', `Ton affaire a coulé.`); }
    else { S.argent = Math.round((S.argent + co.rend) * 1000) / 1000;
      S.vie.gagne = Math.round((S.vie.gagne + co.rend) * 1000) / 1000; }
  }
  jrn('argent', `La saison a rapporté ${sous(S.vie.gagne)}.`);
  S.lectureDure = false;   // le livre est sorti, la saison est passée
  /* Le métier éloigne les tiens tout seul, et un entraîneur déménage plus qu'un
     joueur. C'est la même usure que côté joueur·euse, pour la même raison. */
  bougerProches(-2.4);
}
/* TROIS FAÇONS DE PASSER L'ANNÉE, et aucune n'est gratuite — la règle des arrêts du
   30/09 vaut ici aussi. Ce sont celles du joueur·euse, dans les mots d'un coach : ce
   qu'il met de côté, ce qu'il rend aux siens, ce qu'il dépense pour tenir. */
const CVIE_CHOIX = [
  { id:'cote', ico:'🏦', nom:"Mettre de côté",
    sub:"Tu ne touches à rien. Le métier ne dure pas, et tu le sais.",
    dit:[{c:'foot',t:"💰 tout reste pour plus tard"},{c:'risk',t:"🏡 personne chez toi n'en profite"}] },
  { id:'tiens', ico:'🏡', nom:"Faire vivre les tiens",
    sub:"Ils ont déménagé trois fois pour toi. Cette année, c'est pour eux.",
    dit:[{c:'vie',t:"🏡 les tiens se rapprochent"},{c:'risk',t:"💰 ça part vite"}] },
  { id:'staff', ico:'🧑‍🏫', nom:"Payer ton staff de ta poche",
    sub:"Un analyste vidéo que le club ne voulait pas financer. Il reste tard avec toi.",
    dit:[{c:'foot',t:"🧠 ton jeu et ton banc montent"},{c:'risk',t:"💰 c'est toi qui paies"},{c:'risk',t:"🏡 tu rentres encore plus tard"}] },
];
/* CE QUI SURVIT AU PARCOURS. Quatre chantiers, dans les mots d'un entraîneur : un
   joueur laisse une école de foot, un entraîneur laisse **une méthode** et **un centre**.
   Le prix se compte en années de ton meilleur salaire (`coutChantier`), comme pour le
   joueur·euse — sinon un centre devient bon marché à soixante ans. */
const CCHANTIERS = [
  { id:'maison', ico:'🏠', nom:"La maison des tiens",
    sub:"Celle où tu as grandi, rachetée et refaite. Ta mère n'a rien dit, elle a pleuré.",
    cout: 3, trace:"Tu as sorti les tiens de là où tu es né.",
    dit:[{c:'vie',t:"🏡 les tiens, pour toujours"},{c:'risk',t:"💰 trois ans de salaire"}] },
  { id:'methode', ico:'📓', nom:"Écrire ta méthode",
    sub:"Deux cents pages de séances, de principes et de ce que tu as compris trop tard.",
    cout: 1.2, trace:"D'autres entraînent encore avec ce que tu as écrit.",
    dit:[{c:'foot',t:"📰 on te lit, et on te cite"},{c:'risk',t:"🎯 tu as la tête ailleurs cette saison"}] },
  { id:'centre', ico:'⚽', nom:"Un centre à ton nom",
    sub:"Deux terrains, des éducateurs payés, et des gamins qui viennent de ton quartier.",
    cout: 6.5, trace:"Des centaines de gamins ont appris à jouer là où tu as appris.",
    dit:[{c:'foot',t:"📣 ton nom, partout"},{c:'vie',t:"🏡 les tiens en sont fiers"},{c:'risk',t:"💰 très cher"}] },
  { id:'commerce', ico:'🏪', nom:"Monter une affaire",
    sub:"Un restaurant près du stade. Ton beau-frère dit que c'est béton.",
    cout: 4.5, trace:"Ton affaire tournait encore quand tu as raccroché.",
    dit:[{c:'foot',t:"💰 ça rapporte chaque année"},{c:'risk',t:"🎲 un jour, peut-être, ça coulera"}] },
];
function cChantiersDispos(){
  const faits = (S.vie.chantiers || []).map(x => x.id);
  return CCHANTIERS.filter(c => !faits.includes(c.id) && coutChantier(c) <= (S.argent || 0));
}
function cChoisirVie(id){
  const ch = CCHANTIERS.find(c => c.id === id);
  let suite = '';
  if (ch){
    const q = coutChantier(ch);
    S.argent = Math.round(((S.argent || 0) - q) * 1000) / 1000;
    S.vie.chantiers = [...(S.vie.chantiers || []), { id:ch.id, nom:ch.nom, trace:ch.trace,
      annee:S.annee, rend: ch.id === 'commerce' ? Math.round(q * .14 * 1000) / 1000 : 0 }];
    if (ch.id === 'maison'){ bougerProches(22); suite = `${sous(q)}. Ta mère n'a rien dit.`; }
    else if (ch.id === 'methode'){ S.liens.presse = clamp(S.liens.presse + 12); S.lectureDure = true;
      suite = `${sous(q)}. On te lira — et cette saison, tu auras la tête ailleurs.`; }
    else if (ch.id === 'centre'){ S.liens.supporters = clamp(S.liens.supporters + 20); bougerProches(12);
      suite = `${sous(q)}. Les premiers gamins arrivent en septembre.`; }
    else { suite = `${sous(q)}. On verra bien.`; }
    jrn('vie', `${ch.nom}.`);
  } else {
    const c = CVIE_CHOIX.find(x => x.id === id) || CVIE_CHOIX[0];
    if (c.id === 'tiens'){
      const q = Math.min(S.argent || 0, (S.salaire || 0) * .45);
      S.argent = Math.round(((S.argent || 0) - q) * 1000) / 1000;
      bougerProches(14);
      suite = `${sous(q)} pour eux. Ils ne t'ont rien demandé.`;
    } else if (c.id === 'staff'){
      const q = Math.min(S.argent || 0, (S.salaire || 0) * .3);
      S.argent = Math.round(((S.argent || 0) - q) * 1000) / 1000;
      cBougerAxe('jeu', 1.1); cBougerAxe('banc', 1.1); bougerProches(-5);
      suite = `${sous(q)} de ta poche. Il sera là tous les matins avant toi.`;
    } else suite = `Rien dépensé. Le compte monte.`;
    jrn('vie', `${c.nom}.`);
  }
  S.vie.fait = { id, nom: (ch || CVIE_CHOIX.find(x => x.id === id) || {}).nom || '' };
  S.vie.suite = suite;
  sauver(); rendre();
}
function cFinirVie(){
  S.vie.fait = null; S.vie.suite = '';
  if (!S.prepaFaite) return cOuvrirPrepa();
  S.ecran = 'csemaine'; sauver(); rendre();
}
function cOuvrirEte(){
  /* L'ordre est celui du mode joueur·euse, et pour la même raison : on note les
     rangs, les divisions s'échangent, les deux championnats vieillissent, **puis**
     les offres — donc un club t'appelle avec la force qu'il a vraiment cet été. */
  cEncaisserLaSaison();
  S.moi.age++;
  if (S.moi.age >= C_FIN) return cFinCarriere("l'âge");
  noterRangs();
  cSyncEffectif();
  promotionsRelegations();
  faireVivreLigue();
  cLireEffectif(true);
  cGenererOffres();
  S.raccroche = 0;
  S.ecran = 'coffres'; sauver(); rendre();
}
/* QUI T'APPELLE. Une proposition à la fois, comme pour le joueur·euse : refuser la
   fait disparaître, et la suivante peut être pire ou ne pas venir. Ta cote, c'est
   ce que tu as fait (le président, la presse) plus ton réseau. */
/* CE QUE TU VAUX, HORS RÉSEAU — le réseau garde son terme à lui, puisque c'est son
   rôle annoncé à l'écran (« c'est lui qui fait qu'un club t'appelle »). */
function cNiveauCoach(){ return (cAxe('jeu') + cAxe('groupe') + cAxe('banc')) / 3; }
/* LA COTE NE VOYAIT PAS LE COACH. Mesuré, 240 saisons sur neuf carrières entières :
   les axes montent de 59 à 70 (leur plafond) entre la première saison et la dix-septième,
   et la cote ne bouge **que de 49 à 54** — onze points de métier achetaient un point de
   cote, par le seul `reseau` à .08. Donc la force du club d'arrivée stagnait à 48 de
   médiane dans un monde dont le meilleur club vaut 67, 53 % des saisons se jouaient en
   seconde division, et l'ambition « gagner » était hors de portée (0,0 titre par
   carrière). C'est la boucle fermée de ce matin prise par l'autre bout : il fallait un
   grand club pour bien paraître, et bien paraître pour avoir un grand club.
   Ton niveau entre donc dans ta cote. Le club reste la base — un banc se juge d'abord
   à ce qu'on t'a confié — mais vingt points de métier valent maintenant sept points de
   cote, ce qui ouvre la moitié haute du tableau. */
const C_COTE_NIV = .35;
function cCote(){
  return clamp(S.club.force
    + (cNiveauCoach() - 55) * C_COTE_NIV
    + (S.liens.presse - 50) * .10
    + (S.liens.president - 50) * .06
    + (cAxe('reseau') - 50) * .08
    + (S.carriere ? Math.min(6, S.carriere.titres * 2.5 + S.carriere.coupes * 1.2) : 0)
    + (S.bilan && S.bilan.atteint ? 2 : -2), 38, 82);
}
/* OÙ UN BANC SE REPREND : le rang d'un club étranger se lit sur le vivier de son pays,
   pas sur un championnat qui n'existe pas encore — les ancres étant les mêmes, l'objectif
   annoncé en juin sera celui de la saison en août. */
function cRangEtranger(pays, force, dk){
  const pool = poolPays(pays, dk);
  const fs = pool.gros.concat(pool.petits)
    .map(x => clamp(52 + x.s * PENTE_CLUB, 44, 74)).sort((a, b) => b - a).slice(0, 18);
  return clamp(fs.filter(f => f > force).length + 1, 1, 18);
}
/* TON CLUB PEUT AVOIR DISPARU DU CHAMPIONNAT, ET C'ÉTAIT UN PLANTAGE (trouvé en
   mesurant, 05/10/2026 — défaut antérieur à ce lot). Hors de France il n'y a pas de
   division inférieure : les trois derniers **quittent l'élite** et `renouvelerElite()`
   les retire de `S.ligue.equipes`, en posant `S.clubDescendu`. Le mode joueur·euse le
   lit depuis le 02/10 (une offre garantie, `S.libre` forcé) ; le mode
   entraîneur·euse ne le lisait **nulle part**. Un coach pouvait donc « rester » dans un
   club absent du championnat, et `cFinirMatch()` plantait à la première journée sur
   `c[S.club.nom].j++` — le classement n'a pas de ligne pour un club qui n'y est plus.
   Trois conséquences ici : l'offre est **garantie**, rester est **impossible**, et si
   personne n'appelle le parcours s'arrête proprement au lieu de planter. */
function cGenererOffres(){
  const cote = cCote();
  const libre = !!S.vire || (S.bilan && S.liens.president < 32) || !!S.clubDescendu;
  /* UN ENTRAÎNEUR AUSSI PEUT PARTIR. Les mêmes règles que pour le joueur·euse : seuls
     les clubs d'histoire appellent de l'étranger, et avant Bosman c'est rare. */
  const dkO = typeof decadeKey === 'function' ? decadeKey(S.annee) : '10';
  const rare = S.annee >= 1996 ? ETRANGER_APRES : ETRANGER_AVANT;
  const tous = toutesLesEquipes().filter(e => e.nom !== S.club.nom)
    .map(e => ({ nom:e.nom, force:e.force }))
    .concat(candidatsEtrangers(dkO).map(e => ({ ...e, rare })));
  /* Un gros club n'appelle pas tous les étés : le tirage est pondéré, un club à ta
     portée appelle volontiers, un club au-dessus de toi rarement. C'est la
     correction mesurée le 27/09 côté joueur·euse, et elle vaut ici. */
  const poids = e => {
    const d = e.force - cote;
    return d <= 0 ? Math.exp(-Math.abs(d) / 7) : Math.exp(-d / 3.2);
  };
  /* COMBIEN DE CLUBS T'APPELLENT, ET ÇA DÉPEND DE DEUX JAUGES (le propriétaire,
     05/10/2026 : « ça fait trois quatre saisons, j'ai qu'une seule proposition de
     club »). C'était arithmétique : sous contrat, le nombre d'offres valait
     `1 + Bernoulli(0,45)` — donc **une seule offre 55 % des étés** quand on ne prend
     pas l'arrêt qui donne `bonusOffres`, et trois ou quatre étés de suite comme ça
     arrive une fois sur six. Mesuré sur 76 intersaisons sous contrat avec cet
     arrêt : 17 % à une seule offre, et 0 % une fois libre.
     Rien là-dedans ne dépendait de ce qu'il construit. `cAppel()` branche les deux
     jauges qui le disent déjà en mots : **la presse** — dont `cPourquoi('presse')`
     promettait « c'est elle qui fait qu'un autre club pense à toi » sans aucune
     lecture mécanique, sa première — et **le réseau**, qui ne servait qu'à la cote.
     Un coach dont on parle reçoit trois ou quatre dossiers ; un coach dont personne ne
     parle en reçoit un, et c'est alors une conséquence, pas un tirage. */
  const appel = cAppel();
  const n = clamp(1 + (libre ? 1 : 0) + (S.bonusOffres || 0)
    + (Math.random() < .5 + appel * .35 ? 1 : 0)
    + (Math.random() < .18 + appel * .3 ? 1 : 0), 1, 4);
  const l = [];
  for (let k = 0; k < n; k++){
    const cand = tous.filter(e => !l.some(o => o.nom === e.nom));
    if (!cand.length) break;
    const p = cand.map(e => poids(e) * (e.rare || 1)), t = p.reduce((a, b) => a + b, 0);
    let r = Math.random() * t, e = cand[0];
    for (let i = 0; i < cand.length; i++){ r -= p[i]; if (r <= 0){ e = cand[i]; break; } }
    const d2 = e.pays ? 1
      : (S.ligue.autre || []).some(x => x.nom === e.nom) ? (S.division === 1 ? 2 : 1) : S.division;
    /* L'objectif qu'on te promet découle du rang de SON effectif dans SON
       championnat, exactement comme le tien : un club t'annonce donc ce qu'il peut
       honnêtement demander, et l'écran ne pourra pas être démenti en août. */
    const div = e.pays ? null : (d2 === S.division ? S.ligue.equipes : S.ligue.autre);
    const rang = e.pays ? cRangEtranger(e.pays, e.force, dkO)
      : div.slice().sort((a, b) => b.force - a.force).findIndex(x => x.nom === e.nom) + 1;
    const nDiv = e.pays ? 18 : div.length;
    l.push({ nom:e.nom, force:e.force, division:d2, rang, pays: e.pays || null,
      objectif: clamp(rang - 2, 1, Math.max(1, nDiv - MONTEES)),
      salaire: cSalaireDe(e.force, d2, S.liens.presse, e.pays),
      ans: ri(1, 3) });
  }
  S.offres = l; S.offreIdx = 0; S.libre = libre; S.bonusOffres = 0;
}
function cOffreCourante(){ return (S.offres || [])[S.offreIdx || 0] || null; }
function cPasserOffre(){ S.raccroche = 0; S.offreIdx = (S.offreIdx || 0) + 1;
  if (!cOffreCourante() && S.libre) return cFinCarriere("personne n'a rappelé");
  sauver(); rendre(); }
function cSignerOffre(){
  const o = cOffreCourante(); if (!o) return;
  /* Le club étranger n'existe pas encore : on fabrique son championnat d'abord (ou on
     ressort celui qu'on avait quitté), puis on le cherche dedans. */
  if (o.pays && o.pays !== (S.pays || 'FR')){
    changerDePays(o.pays, o);
    bougerProches(-10);
    S.liens.presse = clamp(48); S.liens.direction = 50;
  }
  const club = toutesLesEquipes().find(e => e.nom === o.nom); if (!club) return;
  S.club = { nom: club.nom, force: Math.round(club.force) };
  if ((S.ligue.autre || []).some(x => x.nom === club.nom)){
    const t = S.ligue.equipes; S.ligue.equipes = S.ligue.autre; S.ligue.autre = t;
    S.division = (S.division || 1) === 1 ? 2 : 1;
  }
  S.equipe = []; cLireEffectif(true);
  S.lignes = { def:50, mil:50, att:50 }; S.ligneRef = { ...S.lignes };
  S.liens.president = 58; S.liens.direction = 50; S.liens.supporters = 46; S.liens.presse = clamp(S.liens.presse);
  S.saisonsClub = 0;
  poserSalaire(o.salaire);
  S.clubDescendu = false;
  jrn('offre', `Tu signes à ${club.nom} (${nomDivision(S.division)}), ${sous(o.salaire)} par an.`);
  cDemarrerSaison();
}
function cResterAuClub(){
  /* On ne reste pas dans un club qui n'est plus dans le championnat (voir
     `cGenererOffres()`). S'il n'y a plus personne à qui dire oui, le parcours
     s'arrête — c'est la fin de carrière du joueur·euse quand le téléphone ne sonne
     plus, et elle a sa phrase dans le bilan. */
  if (S.clubDescendu && !(S.ligue.equipes || []).some(e => e.nom === S.club.nom))
    return cFinCarriere("ton club a quitté l'élite, et personne n'a rappelé");
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
/* Voir `raccrocher()` côté joueur·euse : deux temps sur le même bouton. */
function cRaccrocher(){
  if (!S.raccroche){ S.raccroche = 1; sauver(); return rendre(); }
  cFinCarriere('tu as raccroché');
}
function cDemarrerSaison(){
  S.raccroche = 0;
  /* Le marché se joue APRÈS ta signature : un club construit autour de l'entraîneur
     qu'il vient de prendre, et tu lis ce qu'il a fait. */
  const mv = mercato();
  /* ON TE PREND DES JOUEURS, ET TU TOUCHES L'INDEMNITÉ (le propriétaire, 04/10/2026 :
     « on vient me prendre 3 joueurs mais je ne vois pas la valeur dans mon budget de
     transfert »). Il avait raison et c'était un trou complet : `mercato()` déplace les
     joueurs d'un `sq` à l'autre **sans un centime**, parce qu'il a été écrit pour
     équilibrer les forces du championnat, pas pour tenir une comptabilité. Mesuré sur
     271 étés : on te prend **1,22 joueur**, pour une valeur médiane de 55 k€ — et
     **zéro crédité**. Or c'est l'inverse du football : l'indemnité d'un départ est la
     première chose qui finance le marché d'un club vendeur. Au même prix que si tu
     l'avais vendu toi-même (`cVendre`, 90 % de sa valeur) : le club a négocié, pas toi,
     mais l'argent rentre. */
  const partis = mv.filter(x => x.de === S.club.nom);
  const brut = partis.reduce((a, x) => a + cValeur(x.niv, x.age) * .9, 0);
  S.venduPart = cPartVente();
  S.venduAuto = Math.round(brut * S.venduPart * 1000) / 1000;
  S.venduBrut = Math.round(brut * 1000) / 1000;
  if (S.venduAuto) jrn('mercato', partis.length === 1
    ? `Un départ que tu n'as pas décidé : ${sous(S.venduAuto)} pour le mercato.`
    : `${partis.length} départs que tu n'as pas décidés : ${sous(S.venduAuto)} pour le mercato.`);
  cLireEffectif(true);
  S.mercatoVu = mv;
  S.annee++;
  const e = monClub();
  S.club = { nom: S.club.nom, force: e ? e.force : S.club.force };
  S.grp = { fr: 100, plan: 0, athle: 0 };
  S.journee = 0; S.arrets = 0; S.semaine = null; S.seance = null; S.match = null;
  S.dernier = null; S.annexe = null; S.eqJour = null; S.vire = null;
  S.serie = []; S.vuArrets = {}; S.recentArrets = []; S.recentMoments = []; S.hiverFait = false;
  S.prepaFaite = false; S.prepa = null; S.prepaSuite = '';
  S.stats = { j:0, v:0, n:0, d:0, bp:0, bc:0, decisions:0 };
  S.moi.an0 = { ...S.moi.base };
  const podium = S.bilan && S.bilan.pos <= 3 && S.bilan.division === 1;
  const coupe = S.coupe && S.coupe.gagnee;
  S.euro = { engage: !!((S.division || 1) === 1 && (podium || coupe)), vivant:true, tour:0, pts:0, hist:[], gagnee:false };
  S.coupe = { vivant:true, tour:0, hist:[], gagnee:false };
  S.bilan = null;
  cPoserObjectif();
  cPoserPlafond();
  jrn('saison', `${S.annee}-${S.annee + 1} à ${S.club.nom} : objectif ${S.objectif}ᵉ de ${nomDivision()}.`);
  /* Et c'est ici que tu prends la main : le marché a tourné sans recruter pour toi,
     il t'a peut-être pris des joueurs, et la fenêtre s'ouvre sur ce qu'il en reste. */
  cOuvrirMercato(false);
}


/* ================== LA PRÉPARATION D'AVANT-SAISON ==================
   Le propriétaire, 05/10/2026 : « il manque une page prépa avant début du championnat ».
   Il avait raison, et l'audit du 04/10 l'avait relevé sans le traiter : l'intersaison du
   coach fait bilan → offres → mercato → vie, puis la première journée tombe. Le
   joueur·euse a son été depuis le 27/09 ; le coach n'avait rien, alors que la
   préparation est **le seul moment où il décide de l'état dans lequel son groupe
   arrive**. Quatre façons de passer six semaines, un coût et un gain chacune, aucune les
   deux — la règle du 30/09. */
const CPREPA = [
  { id:'stage', ico:'\u26f0\ufe0f', nom:"Trois semaines de stage", sous:"Du volume, des côtes, deux séances par jour",
    fit:-16, athle:4.5, ligne:-1.6,
    dits:[{c:'foot', t:"\ud83c\udfcb\ufe0f la condition du groupe, pour des mois"},
          {c:'risk', t:"\ud83e\udec1 ils arriveront sur les jambes en août"},
          {c:'risk', t:"\u270a personne n'a aimé"}] },
  { id:'amicaux', ico:'\u26bd', nom:"Six amicaux, et une idée par match", sous:"Des petits clubs, et ton plan qu'on répète",
    fit:-8, axe:'jeu', trace:1.4, ligne:3, presse:-2,
    dits:[{c:'foot', t:"\ud83e\udde9 ton jeu : la trace"},
          {c:'foot', t:"\u270a les lignes se trouvent"},
          {c:'risk', t:"\ud83d\udcf0 la presse s'ennuie"}] },
  { id:'tournee', ico:'\u2708\ufe0f', nom:"La tournée que le club a vendue", sous:"Quatre vols, trois galas, des caméras",
    fit:-19, presse:7, supporters:5, prime:1.5,
    dits:[{c:'vie', t:"\ud83d\udcb0 une prime, et on parle de toi"},
          {c:'risk', t:"\ud83e\udec1 six semaines pour rien dans les jambes"},
          {c:'risk', t:"\ud83d\udeab rien de construit"}] },
  { id:'tard', ico:'\ud83c\udf3f', nom:"On reprend tard", sous:"Tu les laisses rentrer, tu reprends à dix jours",
    fit:12, direction:-4,
    dits:[{c:'foot', t:"\ud83e\udec1 ils arriveront frais, et ça se verra"},
          {c:'risk', t:"\ud83d\udcbc la direction trouve ça léger"},
          {c:'risk', t:"\ud83d\udeab rien de construit"}] },
];
function cOuvrirPrepa(){
  S.prepa = null; S.prepaSuite = '';
  S.ecran = 'cprepa'; sauver(); rendre();
}
function cChoisirPrepa(id){
  const x = CPREPA.find(y => y.id === id) || CPREPA[0];
  S.grp.fr = clamp((S.grp.fr == null ? 100 : S.grp.fr) + x.fit, 0, 100);
  let suite = '';
  if (x.athle){ S.grp.athle = Math.min(C_ATHLE_MAX, (S.grp.athle || 0) + x.athle);
    suite = `Ils ont fini à genoux. En novembre, ils enchaîneront.`; }
  if (x.axe){ cBougerAxe(x.axe, x.trace || 1); suite = `Six matchs pour poser une idée. Elle tient.`; }
  if (x.ligne) cBougerVestiaire(x.ligne);
  if (x.presse) S.liens.presse = clamp(S.liens.presse + x.presse);
  if (x.supporters) S.liens.supporters = clamp(S.liens.supporters + x.supporters);
  if (x.direction) S.liens.direction = clamp(S.liens.direction + x.direction);
  if (x.prime){
    const g = Math.round((S.salaire || 0) * x.prime / 12 * 1000) / 1000;
    S.argent = Math.round(((S.argent || 0) + g) * 1000) / 1000;
    suite = `La tournée a rapporté. Ta part : ${sous(g)}.`;
  }
  if (x.id === 'tard') suite = `Ils sont revenus bronzés et frais. La direction, elle, a compté les jours.`;
  S.prepa = { id: x.id, nom: x.nom };
  S.prepaSuite = suite;
  jrn('saison', `Préparation : ${minuscule(x.nom)}.`);
  sauver(); rendre();
}
function cFinirPrepa(){
  S.prepaFaite = true;
  S.ecran = 'csemaine'; sauver(); rendre();
}

/* ================== LE MERCATO, CÔTÉ ENTRAÎNEUR·EUSE ==================
   Le propriétaire, 21/09/2026 : « le **mercato est ma partie préférée** du mode
   entraîneur·euse » ; 01/10/2026 : « vas-y pour le mercato côté entraîneur ».
   Le monde avait déjà un marché qui tourne entre trente-six clubs (`mercato()`) ;
   ce qui manquait, c'est que tu y aies la main. Et il a fallu commencer par lui
   retirer la tienne : le marché automatique traitait ton club comme les autres, donc
   il recrutait à ta place. Il ne le fait plus — mais **il continue de te prendre des
   joueurs**, ce qui est la moitié du mercato qu'un entraîneur ne contrôle pas.

   TROIS MONNAIES, et c'est ce qui en fait une décision et non une liste de courses :
   1. **l'argent** du club, qui est fini ;
   2. **la masse salariale**, qui a un plafond — au-dessus, le président compte les
      journées (et c'est lui qui te démet) ;
   3. **le vestiaire** : une recrue dérange la ligne où elle arrive, et vendre un
      titulaire la casse. Un groupe qu'on ne touche pas est un groupe qui se trouve.
   Donc : recruter rend de la force et coûte les trois ; vendre rend de l'argent et
   coûte la force **et** le vestiaire ; ne rien faire garde le groupe et te laisse
   avec l'effectif que tu as. Aucune des trois n'est gratuite. */
const C_CAP_EFFECTIF = 22;
/* Ce qu'un joueur gagne chez toi : la même formule que la tienne, donc la même
   échelle d'époque (francs avant 2002). */
function cSalDe(j){ return salaireDe(j.niv, j.age, S.club.force, S.division || 1); }
function cMasse(){ return (S.equipe || []).reduce((t, j) => t + cSalDe(j), 0); }
/* LE PLAFOND SE POSE EN AOÛT, ET IL NE SUIT PAS TES DÉPENSES.
   Première version : `salaireDe(force) × 22 × 1.12` — ce qu'un club de cette force
   paierait pour vingt-deux joueurs **à son niveau moyen**. Mesuré sur 60 clubs, avant
   d'y toucher : un effectif intact est à **89 % du plafond** en médiane (ce qui était
   la promesse), mais l'étendue va de **45 % à 131 %** et **12 clubs sur 60 étaient
   déjà au-dessus sans qu'on ait rien fait** — on te punissait pour un effectif dont tu
   hérites. La cause est mécanique : `salaireDe` est **convexe en niveau**
   (`((niv−45)/30)^2,6`), donc la somme de vingt-deux vrais salaires dépasse vingt-deux
   fois le salaire du niveau moyen. Le plafond n'était pas calculé sur la même base que
   la masse.
   Il l'est maintenant : on prend le **plus grand** de ce qu'un club de cette force peut
   payer et de ce qu'il paie déjà, plus douze pour cent. Un effectif cher ne te coûte
   donc pas la place avant ton premier clic, et un effectif bon marché te laisse de quoi
   dépenser. Et il est **figé pour la saison** (`S.plafondMasse`) : c'était le défaut
   nommé de la 1.0 — « chaque recrue relevait le plafond, qui autorisait la suivante ». */
function cPlafondBase(){
  return salaireDe(S.club.force, 27, S.club.force, S.division || 1) * C_CAP_EFFECTIF * 1.12;
}
function cPoserPlafond(){
  S.plafondMasse = Math.max(cPlafondBase(), cMasse() * 1.12);
}
function cPlafond(){ return S.plafondMasse || cPlafondBase(); }
/* Ce que vaut un joueur sur le marché. Adossé au salaire pour hériter de l'échelle
   d'époque sans la recalculer, avec la courbe des valeurs : un jeune se paie cher
   parce qu'on achète ce qu'il sera, un trentenaire ne se paie presque plus. */
function cValeur(niv, age){
  const sal = salaireDe(niv, age, 62, 1);
  const k = age <= 21 ? 7 : age <= 24 ? 6 : age <= 28 ? 4.5 : age <= 31 ? 2.6 : age <= 33 ? 1.3 : .6;
  return Math.max(.002, sal * k);
}
/* L'enveloppe de l'été. Elle suit ce que le club pèse, et ce que ta saison a
   rapporté : un président content ouvre le tiroir, un président qui doute le ferme.
   L'hiver vaut le quart de l'été — de quoi réparer, pas de quoi reconstruire. */
function cBudget(hiver){
  const base = cPlafond() * .40;
  const f = clamp(.45 + (S.liens.president - 50) * .011 + (S.liens.direction - 50) * .006, .25, 1.6);
  return Math.round(base * f * (hiver ? .25 : 1) * 1000) / 1000;
}

/* ---------------- les dossiers ---------------- */
/* QUI EST SUR LE MARCHÉ. Les trois quarts des dossiers sont de **vrais joueurs de
   vrais clubs** — ceux qu'on lit au classement et dans les buts encaissés — et c'est
   tout l'intérêt d'avoir un monde peuplé : le recruter le fait vraiment partir de
   chez eux. On garde la règle du marché automatique sur qui se laisse prendre : un
   remplaçant, un joueur d'un club plus petit, ou un trentenaire. */
const C_POSTE_NOM = { G:"gardien", D:"défenseur", M:"milieu de terrain", A:"attaquant" };
/* En quelle fenêtre un dossier promis arrivera : janvier quand l'époque a un mercato
   d'hiver et qu'il n'est pas encore passé, l'été sinon. Sans ça le texte promettait
   « janvier » dans une époque qui n'en a pas. */
function cMotFenetre(){
  const hiverAVenir = eraHasWinterMercato(S.annee) && !S.hiverFait && S.journee < J_HIVER;
  return hiverAVenir ? "en janvier" : "cet été";
}
/* TON POSTE LE PLUS FAIBLE : celui dont le dernier titulaire est le plus loin de ce
   que vaut le club. C'est l'étalon que `cMonOnze()` sert déjà au mercato, donc le
   dossier du directeur sportif parle du même trou que les dossiers de la table. */
function cPosteFaible(){
  return Object.keys(EFFECTIF).sort((a, b) => cMonOnze(a) - cMonOnze(b))[0] || 'M';
}
/* LE CANDIDAT DU DIRECTEUR SPORTIF — ET IL SE CONSTRUIT SUR LE BUDGET, PAS SUR LE
   NIVEAU. Première version : son niveau était tiré à `cMonOnze + 4 à 11` et son prix
   en découlait. Mesuré sur 150 dossiers, c'était une promesse intenable —
   **0 % achetable tout de suite, 93 % hors de portée quoi qu'on fasse, prix médian
   dix-sept fois le budget** : exactement le défaut que ce lot répare, refabriqué un
   étage plus haut. La cause est que `cValeur()` est convexe, donc onze points
   au-dessus de ton onze est un prix d'un autre monde.
   Il est donc tiré **à l'envers** : on part du prix que l'enveloppe de l'été peut
   tenir (« cher » veut dire qu'il la mange, pas qu'il la dépasse de dix-sept fois) et
   on cherche le niveau qui vaut ce prix-là. Il améliore toujours la ligne d'au moins
   un point — c'est tout l'objet du dossier — et ce plancher est ce qui domine le prix
   le plus souvent : mesuré après, prix médian **1,2 fois le budget**, l'argent suffit
   dans **35 %** des cas, une vente le débloque dans les **65 %** restants et il n'est
   **jamais** hors de portée (contre 0 / 7 / 93 avant). Témoin mesuré en même temps :
   les dossiers de club ordinaires sont payables à 100 %, donc celui-là est bien la
   seule vraie dépense de la table. */
function cCandidatDS(){
  const poste = cPosteFaible();
  const age = ri(23, 29);
  const cible = Math.max(.004, cBudget(false) * rnd(.5, .95)) / 1.3;
  let niv = clamp(cMonOnze(poste) + 1, 42, 86), ecart = Infinity;
  for (let v = Math.round(clamp(cMonOnze(poste) + 1, 42, 86)); v <= 86; v++){
    const e = Math.abs(cValeur(v, age) - cible);
    if (e < ecart){ ecart = e; niv = v; } else break;
  }
  return { nom: nomAdverse(nomsPris()), poste, age, niv: Math.round(niv),
    pot: potDe(Math.round(niv), age), de: null, cle:'ds',
    prix: Math.round(cValeur(niv, age) * 1.3 * 1000) / 1000 };
}
/* CE QUE LA DIRECTION TE LAISSE FAIRE, ENFIN LU (le propriétaire, 05/10/2026 :
   « la place de la direction et de la relation que j'ai avec la direction doit jouer
   dans les propositions de joueurs qu'on me fait. Et je pensais que c'est à ça que
   servait le bureau »). Sa lecture était la bonne et le code ne la tenait pas :
   `reseau` n'avait **qu'une** lecture mécanique — `cCote()`, qui t'appelle en juin —
   alors que son propre commentaire lui promettait deux choses (« ce que la direction
   te laisse faire, et qui t'appelle en juin »), et la première n'existait pas. La
   semaine « bureau » construisait donc un axe dont la moitié de la promesse était
   morte.
   `cRelais()` est ce relais, de −1 à +1 : le réseau pour six dixièmes (c'est toi qui
   décroches le téléphone), la direction pour quatre (c'est elle qui signe). Il décide
   de **deux choses** : combien de dossiers arrivent sur la table, et jusqu'où un club
   plus fort que le tien accepte de lâcher un titulaire. */
/* LE DÉNOMINATEUR EST CELUI DE L'AMPLITUDE RÉELLE, pas des cinquante points
   théoriques. Première version à /50 : mesurée sur cinq carrières par ligne, elle
   donnait **9,50 dossiers contre 8,64** entre « bureau chaque semaine » et « jamais le
   bureau » — un dossier d'écart, c'est-à-dire rien de sensible, parce que `reseau` est
   borné par son plafond (58-84) et que `direction` vit autour de 50. À /28 l'écart
   devient lisible, et c'est ce qu'il demandait : la relation avec la direction **se
   voit** dans ce qu'on te propose. */
function cRelais(){
  return clamp(((cAxe('reseau') - 50) * .6 + ((S.liens.direction || 50) - 50) * .4) / 28, -1, 1);
}
/* ET ÇA SE DIT, sinon ça n'existe pas : une table longue ou courte sans raison
   affichée serait un chiffre de plus. La phrase nomme les deux jauges qui la font. */
function cMotRelais(){
  const r = cRelais();
  return r >= .5 ? "ton carnet et la direction t'ouvrent des portes"
    : r >= .15 ? "on te sort des dossiers quand tu appelles"
    : r >= -.15 ? "ce que le club sort sans se forcer"
    : r >= -.5 ? "tu décroches peu, et on te propose peu"
    : "personne ne te sort rien : le bureau, c'est aussi du travail";
}
/* LA FOURCHETTE EST LA SIENNE (le propriétaire, 05/10/2026 : « j'ai lu quelque part 20 ou
   30 dossiers lors du mercato, c'est beaucoup — une dizaine ça suffit, entre 7 et 15 je
   dirais, même entre 7 et 15 c'est suffisant, 30 c'est trop »). Mesuré sur la version
   livrée ce matin, la pile allait déjà de **7 à 12 l'été et 4 à 8 l'hiver** : les 20 ou 30
   qu'il a lus sont le nombre de **candidats** que la liste interne rassemble avant la
   composition, pas la table. Il reste que l'hiver pouvait descendre à quatre. Les deux
   fenêtres tiennent maintenant dans sa fourchette : **7 à 13 l'été, 5 à 9 l'hiver.** */
/* Ce que le monde du football sait de toi : la presse pour six dixièmes (c'est elle
   qui porte ton nom ailleurs), le réseau pour quatre (c'est lui qui décroche). Même
   forme et même dénominateur que `cRelais()`, pour une raison simple : ces jauges
   vivent dans la même bande. */
function cAppel(){
  return clamp((((S.liens.presse || 50) - 50) * .6 + (cAxe('reseau') - 50) * .4) / 28, -1, 1);
}
function cNbDossiers(hiver){
  const base = hiver ? 7 : 10, amp = hiver ? 2 : 3;
  return clamp(Math.round(base + cRelais() * amp), 5, 13);
}
/* À QUEL POSTE ON TE PROPOSE QUELQU'UN. Un tirage uniforme sur quatre postes donnait
   **un dossier sur quatre pour un gardien** alors qu'un groupe en compte trois sur
   vingt-deux et que le onze n'en aligne qu'un : mesuré avant correction, 20 % de la
   table, et jusqu'à sept dossiers du même poste dans une pile de dix. Les postes sont
   désormais pondérés par ce que le onze **aligne** (G1 · D4 · M4 · A2), doublé par le
   trou que tu as à ce poste : on te propose d'abord là où ça manque. */
function cPoidsPoste(){
  const o = {};
  Object.keys(EFFECTIF).forEach(po => {
    const trou = Math.max(0, S.club.force - cMonOnze(po));
    o[po] = (FORMATION[po] || 1) * (1 + trou * .12);
  });
  return o;
}
function cPosteDemande(){
  const w = cPoidsPoste(), ks = Object.keys(w);
  const t = ks.reduce((a, k) => a + w[k], 0);
  let r = Math.random() * t;
  for (const k of ks){ r -= w[k]; if (r <= 0) return k; }
  return ks[ks.length - 1];
}
/* IL FAUT UN PEU DE TOUT SUR LA TABLE (le propriétaire, 05/10/2026 : « il faut que les
   joueurs que je reçois soient adaptés. Un peu de tout dans les prix, un peu de tout
   dans les postes. Des joueurs libres, des joueurs du centre, des joueurs de mes
   concurrents, des joueurs d'autres pays. Parfois je me retrouvais avec 10 dossiers de
   gardiens »). Le tri au seul mérite faisait exactement ça : mesuré sur 60 fenêtres,
   **35 % des piles ne couvraient même pas les quatre postes** et 25 % avaient cinq
   dossiers ou plus au même poste.
   La table se **compose** maintenant, dans cet ordre : le dossier promis par le
   directeur sportif, puis un de chaque famille présente, puis un de chaque poste, puis
   un de chaque bande de prix, et seulement ensuite le reste au mérite — avec un
   plafond par poste pour qu'aucun ne puisse inonder la pile. */
function cBandePrix(x, budget){
  if (x.prix <= 0) return 'gratuit';
  if (x.prix <= budget * .3) return 'petit';
  if (x.prix <= budget * .85) return 'moyen';
  return 'cher';
}
function cComposerDeck(l, n, budget){
  const pris = [], dedans = new Set(), cnt = {};
  /* LE PLAFOND PAR POSTE S'APPLIQUE AUX GARANTIES AUSSI, et c'est la mesure qui l'a
     dit : une première version ne le posait qu'au remplissage final, donc les
     garanties de famille et de bande de prix pouvaient prendre quatre fois le même
     poste avant lui — six dossiers d'un seul poste dans une pile de dix. Et **les
     postes passent devant les familles** : à six dossiers l'hiver, garantir quatre
     familles d'abord ne laissait plus une ligne pour couvrir les quatre postes
     (mesuré : un quart des piles n'en couvrait pas quatre). */
  const cap = Math.max(2, Math.ceil(n / 4));
  const prendre = (x, fort) => {
    if (!x || dedans.has(x) || pris.length >= n) return;
    if (!fort && (cnt[x.poste] || 0) >= cap) return;
    pris.push(x); dedans.add(x); cnt[x.poste] = (cnt[x.poste] || 0) + 1;
  };
  const libre = () => l.filter(x => !dedans.has(x));
  const mieux = arr => arr.length ? arr[0] : null;       // l est déjà trié au mérite
  /* 1. le dossier promis : il passe devant tout, c'est ce qui le rend vrai */
  prendre(mieux(libre().filter(x => x.cle === 'ds')), true);
  /* 2. un de chaque poste : c'est la garantie qui compte le plus, donc elle passe
     devant les familles — sinon une pile d'hiver n'a plus de place pour les quatre */
  Object.keys(EFFECTIF).forEach(po =>
    prendre(mieux(libre().filter(x => x.poste === po)), true));
  /* 3. une de chaque famille, pour qu'aucune porte ne reste fermée */
  ['libre', 'centre', 'etranger', 'club'].forEach(cle =>
    prendre(mieux(libre().filter(x => x.cle === cle))));
  /* 4. une de chaque bande de prix qui existe vraiment, la plus chère d'abord :
     c'est elle qui manque quand le mérite trie tout seul */
  ['cher', 'moyen', 'petit', 'gratuit'].forEach(b =>
    prendre(mieux(libre().filter(x => cBandePrix(x, budget) === b))));
  /* 5. le reste au mérite, sous le plafond */
  libre().forEach(x => prendre(x));
  /* et s'il manque encore des lignes, on remplit sans le plafond : une table courte
     serait pire qu'une table un peu déséquilibrée */
  libre().forEach(x => prendre(x, true));
  return pris;
}
function cCibles(budget, hiver){
  const pris = nomsPris();
  const mien = monClub();
  const l = [];
  toutesLesEquipes().forEach(e => {
    if (e === mien) return;
    const d2 = (S.ligue.autre || []).some(x => x.nom === e.nom) ? (S.division === 1 ? 2 : 1) : (S.division || 1);
    Object.keys(EFFECTIF).forEach(po => {
      const ordre = e.sq.filter(j => j.p === po).sort((a, b) => b.v - a.v);
      ordre.forEach((j, i) => {
        const remplacant = i >= FORMATION[po];
        const petit = e.force < S.club.force - 2;
        const vieux = j.a >= 29;
        if (!(remplacant || petit || vieux)) return;
        /* Un club plus fort que le tien ne te lâche pas son titulaire : c'est ce qui
           t'empêche de bâtir le meilleur onze du championnat en un été. */
        if (!remplacant && e.force > S.club.force + 1 + cRelais() * 3.5) return;
        l.push({ nom:j.n, poste:po, age:j.a, niv: Math.round(j.v), pot:j.t,
          de:e.nom, div:d2, cle:'club',
          prix: Math.round(cValeur(j.v, j.a) * (remplacant ? .85 : 1.15) * 1000) / 1000 });
      });
    });
  });
  /* De l'étranger : on en a besoin, sinon un championnat serré ne laisse rien à
     acheter. Ils coûtent un peu plus cher — on ne les a pas vus jouer. */
  for (let k = 0; k < 3; k++){
    const niv = Math.round(clamp(S.club.force + rnd(-3, 7), 40, 84));
    const age = ri(21, 30);
    l.push({ nom: nomAdverse(pris), poste: cPosteDemande(), age, niv,
      pot: potDe(niv, age), de: null, cle:'etranger',
      prix: Math.round(cValeur(niv, age) * 1.25 * 1000) / 1000 });
  }
  /* LES JOUEURS LIBRES (le propriétaire, 04/10/2026 : « y'a aucun joueur libre sur le
     mercato en dehors des joueurs du centre »). C'était vrai : la pile n'avait que des
     joueurs sous contrat, trois de l'étranger payants et deux gamins du centre. Or un
     joueur libre est **le levier du club pauvre** — aucune indemnité, seulement un
     salaire, et il le négocie d'autant mieux qu'il ne coûte rien à acheter (×1,3). Deux
     profils, parce que c'est ce que le football donne : un joueur en fin de carrière que
     son club n'a pas prolongé, et un jeune qu'on a laissé partir. */
  for (let k = 0; k < (hiver ? 1 : 2); k++){
    const vieux = Math.random() < .65;
    const age = vieux ? ri(30, 35) : ri(19, 23);
    const niv = Math.round(clamp(S.club.force + (vieux ? rnd(-2, 6) : rnd(-9, 1)), 38, 82));
    l.push({ nom: nomAdverse(pris), poste: cPosteDemande(), age, niv,
      pot: potDe(niv + (vieux ? 0 : rnd(3, 9)), age), de: null, cle:'libre', prix: 0,
      salMult: 1.3 });
  }
  /* Et le centre de formation : gratuit, faible, et c'est la seule porte de
     l'ambition « faire éclore ». */
  if (!hiver) for (let k = 0; k < 2; k++){
    const age = ri(18, 19);
    const niv = Math.round(clamp(S.club.force - rnd(5, 15), 36, 70));
    l.push({ nom: nomAdverse(pris), poste: cPosteDemande(), age, niv,
      pot: potDe(niv + rnd(4, 10), age), de: null, cle:'centre', prix: 0 });
  }
  /* Et le dossier que le directeur sportif a promis en cours de saison : il entre
     ici, et `cComposerDeck()` lui garde la première place de la table. */
  if (S.dossierDS){
    const d = Object.assign({}, S.dossierDS);
    /* Son nom a été tiré en cours de saison : un transfert a pu le prendre depuis.
       On le renomme plutôt que de fabriquer un doublon dans le championnat. */
    if (pris.has(d.nom)) d.nom = nomAdverse(pris);
    l.push(d);
  }
  l.forEach(x => { x.sal = Math.round(salaireDe(x.niv, x.age, S.club.force, S.division || 1)
    * (x.salMult || 1) * 1000) / 1000; });
  /* Faisable d'abord, hors de portée en dernier — c'est le tri de la 1.0, et c'est
     celui qu'il avait validé : on ne veut pas feuilleter dix dossiers injouables.
     **UN JEUNE NE SE JUGE PAS À CE QU'IL APPORTE SAMEDI** (mesuré le 01/10/2026 : sur
     560 dossiers, `{"club":560}` — ni un joueur de l'étranger, ni un gamin du centre
     n'arrivait jamais sur la table, parce que le tri par apport immédiat les coupait.
     Le centre était donc la seule porte de l'ambition « faire éclore » et elle était
     fermée.) Le mérite d'un dossier compte donc **la moitié de sa marge** quand il a
     vingt-et-un ans ou moins : un gamin libre à qui il reste dix points de potentiel
     vaut mieux qu'un trentenaire au niveau de ton onze. */
  const place = x => cMonOnze(x.poste);
  l.forEach(x => { const o = place(x);
    const marge = Math.max(0, (x.pot || x.niv) - x.niv);
    x.gain = x.niv - o;                     // ce qu'il ajoute à ton onze samedi
    x.merite = x.gain + (x.age <= 21 ? marge * .5 : 0);
    x.faisable = x.prix <= budget && cMasse() + x.sal <= cPlafond() * 1.14; });
  l.sort((a, b) => (b.faisable ? 1 : 0) - (a.faisable ? 1 : 0)
    || b.merite - a.merite || a.prix - b.prix);
  /* ELLE EST COURTE (« c'est long », 04/10/2026) ET ELLE EST **COMPOSÉE**
     (05/10/2026) : sa longueur vient maintenant de ton réseau et de ta direction
     (`cNbDossiers()`), et son contenu de `cComposerDeck()` — un peu de tout dans les
     postes, dans les prix et dans les familles. Le tri d'affichage reste le sien :
     faisable d'abord, hors de portée en dernier. */
  /* Le dossier promis par le directeur sportif passe **en tête**, même s'il n'est pas
     faisable : « faisable d'abord » est une règle de feuilletage, et celui-là n'est pas
     à découvrir — c'est un rendez-vous qu'on a pris. Mesuré sans cette exception : il
     tombait en neuvième position sur neuf, donc à neuf clics de l'écran. */
  return cComposerDeck(l, cNbDossiers(hiver), Math.max(.001, budget))
    .sort((a, b) => (b.cle === 'ds' ? 1 : 0) - (a.cle === 'ds' ? 1 : 0)
      || (b.faisable ? 1 : 0) - (a.faisable ? 1 : 0)
      || b.merite - a.merite || a.prix - b.prix);
}
/* Le niveau du dernier titulaire à ce poste : l'étalon auquel on compare un dossier,
   et il se dit en mots, jamais en chiffre. */
function cMonOnze(po){
  const l = (S.equipe || []).filter(j => j.poste === po).sort((a, b) => b.niv - a.niv);
  const n = FORMATION[po] || 1;
  return l.length >= n ? l[n - 1].niv : (l.length ? l[l.length - 1].niv : S.club.force - 8);
}
function cMotNiveau(x){
  const d = x.niv - cMonOnze(x.poste);
  return d >= 7 ? "Très au-dessus de ton onze : il le change tout de suite."
    : d >= 3 ? "Au-dessus de ton onze à ce poste."
    : d >= -1 ? "Au niveau de ton onze : un titulaire de plus."
    : d >= -6 ? "Un cran sous tes titulaires : de la profondeur."
    : "Bien en dessous. Il ne jouera pas cette saison.";
}
function cMotPotentiel(x){
  const d = (x.pot || x.niv) - x.niv;
  return x.age <= 21 && d >= 6 ? "Et il a de la marge — beaucoup."
    : d >= 4 ? "Il peut encore progresser." : x.age >= 31 ? "Il ne progressera plus." : '';
}

/* ---------------- la fenêtre ---------------- */
/* CE QUE LE CLUB GARDE, ET ÇA DÉPEND DE CEUX QUI SIGNENT LES CHÈQUES (le propriétaire,
   05/10/2026 : « 20 % de ce que le joueur rapporte va au club, le reste au budget de
   transfert, et ça varie selon la direction et le président — enfin la relation avec
   eux »). Sa règle est meilleure que mon forfait à 55 % : le club prend sa part, et
   combien il t'en laisse dit ce qu'il pense de toi. C'est une **deuxième lecture
   mécanique** pour les deux jauges, qui n'en avaient qu'une chacune (la porte et le
   budget).
   À 50-50 le club garde 20 %. Au mieux il ne garde que 6 %, au pire 38 % — et
   l'écart entre les deux vaut deux fois ce que vaut le facteur du budget de base. */
function cPartVente(){
  return clamp(.80 + (S.liens.president - 50) * .003 + (S.liens.direction - 50) * .002, .62, .94);
}
function cOuvrirMercato(hiver){
  /* L'indemnité des départs de l'été entre dans la fenêtre d'été, une seule fois :
     `mercato()` ne tourne qu'à `cDemarrerSaison()`, donc l'hiver n'en a pas. */
  const vendu = hiver ? 0 : (S.venduAuto || 0);
  const venduBrut = hiver ? 0 : (S.venduBrut || 0), venduPart = S.venduPart || cPartVente();
  /* Et il se consomme : l'écran du mercato rouvre une fenêtre quand il n'en trouve
     pas (une sauvegarde d'avant le lot du mercato), et sans cette remise à zéro il
     recréditerait l'indemnité de l'été passé. */
  S.venduAuto = 0; S.venduBrut = 0;
  const b = Math.round((cBudget(hiver) + vendu) * 1000) / 1000;
  S.marche = { hiver: !!hiver, budget: b, budget0: b, idx: 0, vendu, venduBrut, venduPart,
    deck: cCibles(b, hiver), in: [], out: [], fini: false };
  S.ecran = 'cmercato'; sauver(); rendre();
}
function cCibleCourante(){ const m = S.marche; return m && m.deck[m.idx] || null; }
function cCibleSuivante(){ if (S.marche && S.marche.idx < S.marche.deck.length - 1){ S.marche.idx++; sauver(); rendre(); } }
function cCiblePrecedente(){ if (S.marche && S.marche.idx > 0){ S.marche.idx--; sauver(); rendre(); } }
/* CE QUI BLOQUE, DIT AVANT LE CLIC ET **AU CENTIME** — avec la vente qui suffirait.
   C'est la seule chose que la coquille validée demandait et que le moteur ne faisait
   pas : « ce qui bloque est écrit au centime avec la vente qui suffirait — c'est ton
   reproche des 10 000 € manquants qu'on ne voyait pas » (`v2/coquilles.html`).
   Dire « il coûte plus que ce qu'il te reste » ne sert à rien : ce qu'on veut savoir,
   c'est **combien il manque** et **qui vendre** pour le trouver. */
function cManque(x){
  if (!x) return null;
  const argent = Math.max(0, x.prix - S.marche.budget);
  const sal = Math.max(0, (cMasse() + x.sal) - cPlafond() * 1.14);
  const place = (S.equipe || []).length >= C_CAP_EFFECTIF;
  return (argent || sal || place) ? { argent, sal, place } : null;
}
/* Qui vendre pour y arriver. On ne propose que des ventes **possibles** (on ne descend
   jamais sous le onze à un poste) et on ne propose que celles qui **suffisent** : une
   liste de ventes qui ne débloquent rien était le défaut de la 1.0. */
function cVentesQuiSuffisent(x){
  const m = cManque(x); if (!m) return [];
  return (S.equipe || []).filter(j => !j.recrue
      && (S.equipe || []).filter(y => y.poste === j.poste).length > FORMATION[j.poste])
    .map(j => ({ j, prix: Math.round(cValeur(j.niv, j.age) * .9 * 1000) / 1000, sal: cSalDe(j) }))
    .filter(v => v.prix >= m.argent && v.sal >= m.sal)
    .sort((a, b) => a.j.niv - b.j.niv)
    .slice(0, 3);
}
function cBlocages(x){
  const m = cManque(x); if (!m) return [];
  const b = [];
  if (m.argent) b.push(`Il te manque ${sous(m.argent)} de budget de transfert.`);
  if (m.sal) b.push(`Et ${sous(m.sal)} de masse salariale : le président la regarde.`);
  if (m.place) b.push(`Ton effectif est au complet : il faut vendre quelqu'un d'abord.`);
  return b;
}
function cRecruter(){
  const m = S.marche, x = cCibleCourante();
  if (!m || !x || cBlocages(x).length) return;
  const pris = nomsPris();
  // il part vraiment de chez eux, et ils comblent le trou
  if (x.de){
    const e = toutesLesEquipes().find(y => y.nom === x.de);
    if (e){
      const i = e.sq.findIndex(j => j.n === x.nom);
      if (i >= 0) e.sq.splice(i, 1);
      while (e.sq.filter(j => j.p === x.poste).length < EFFECTIF[x.poste])
        e.sq.push(jeuneDuCentre(x.poste, e, pris));
      e.force = forceEffectif(e.sq);
    }
  }
  const j = { nom:x.nom, poste:x.poste, age:x.age, niv:x.niv, pot:x.pot,
    forme:0, blesse:0, susp:0, prog:0, note:null, recrue:true };
  S.equipe.push(j);
  m.budget = Math.round((m.budget - x.prix) * 1000) / 1000;
  m.in.push({ ...x });
  m.deck.splice(m.idx, 1);
  if (m.idx >= m.deck.length) m.idx = Math.max(0, m.deck.length - 1);
  /* UNE RECRUE DÉRANGE LA LIGNE OÙ ELLE ARRIVE. C'est la troisième monnaie, et
     c'est elle qui empêche de recruter cinq fois sans rien payer : plus on remue le
     vestiaire en août, moins il se trouve en septembre. */
  cBougerLigne(LIGNE_DU_POSTE[x.poste], -1.5 - m.in.length * .4);
  S.liens.presse = clamp(S.liens.presse + 2.5);
  S.liens.supporters = clamp(S.liens.supporters + (x.gain >= 4 ? 3 : 1));
  cSyncEffectif();
  jrn('mercato', `${x.nom} signe${x.de ? ` (de ${x.de})` : x.cle === 'centre' ? ' (du centre)' : " (de l'étranger)"}${x.prix ? ` pour ${sous(x.prix)}` : ', libre'}.`);
  m.deck.forEach(y => { y.faisable = y.prix <= m.budget && cMasse() + y.sal <= cPlafond() * 1.14; });
  sauver(); rendre();
}
function cVendre(nom){
  const m = S.marche; if (!m) return;
  const j = (S.equipe || []).find(x => x.nom === nom); if (!j) return;
  if ((S.equipe || []).filter(x => x.poste === j.poste).length <= FORMATION[j.poste]) return;
  const prix = Math.round(cValeur(j.niv, j.age) * .9 * 1000) / 1000;
  /* Il va quelque part : un club qui a besoin de ce poste, sinon à l'étranger. Un
     départ sans destination, c'est un joueur qui s'évapore. */
  const pris = nomsPris();
  const cand = toutesLesEquipes().filter(e => e.nom !== S.club.nom
    && e.sq.filter(y => y.p === j.poste).length < EFFECTIF[j.poste] + 1
    && j.niv > (e.sq.filter(y => y.p === j.poste).sort((a, b) => b.v - a.v)[FORMATION[j.poste] - 1] || { v:99 }).v);
  const vers = cand.length ? pick(cand) : null;
  if (vers){
    vers.sq.push({ n:j.nom, p:j.poste, a:j.age, v:j.niv, t:j.pot || potDe(j.niv, j.age) });
    vers.force = forceEffectif(vers.sq);
  }
  const titulaire = cMonOnze(j.poste) <= j.niv;
  S.equipe.splice(S.equipe.indexOf(j), 1);
  m.budget = Math.round((m.budget + prix) * 1000) / 1000;
  m.out.push({ nom:j.nom, poste:j.poste, age:j.age, niv:j.niv, prix, vers: vers ? vers.nom : null, titulaire });
  /* Vendre un titulaire casse la ligne : c'est le coût, et il est plus lourd que
     celui d'une recrue. Vendre un remplaçant ne coûte presque rien — c'est
     exactement ce qu'on veut qu'un coach apprenne. */
  cBougerLigne(LIGNE_DU_POSTE[j.poste], titulaire ? -3.2 : -.8);
  if (titulaire) S.liens.supporters = clamp(S.liens.supporters - 4);
  cSyncEffectif();
  jrn('mercato', `${j.nom} part${vers ? ` à ${vers.nom}` : " à l'étranger"} pour ${sous(prix)}.`);
  m.deck.forEach(y => { y.faisable = y.prix <= m.budget && cMasse() + y.sal <= cPlafond() * 1.14; });
  sauver(); rendre();
}
/* Ce que la fenêtre a produit, et ce qu'elle coûtera. */
function cFermerMercato(){
  /* Le dossier du directeur sportif a été sur la table : il ne revient pas une
     deuxième fenêtre, qu'on l'ait pris ou non. C'est le compteur de carrière que le
     lot du 02/10 avait appris à ses dépens — une porte qui compose se vide. */
  S.dossierDS = null;
  const m = S.marche;
  if (m){
    S.surMasse = cMasse() > cPlafond();
    if (S.surMasse){
      S.liens.direction = clamp(S.liens.direction - 7);
      jrn('mercato', `La masse salariale dépasse le plafond. Le président l'a vu.`);
    }
    /* NE RIEN FAIRE EST AUSSI UNE DÉCISION, et elle a son coût quand le groupe ne
       tient pas : on te reprochera de ne pas avoir bougé. */
    if (!m.in.length && !m.out.length && cRangEffectif() > S.ligue.equipes.length * .6){
      S.liens.supporters = clamp(S.liens.supporters - 4);
      S.liens.presse = clamp(S.liens.presse - 3);
      jrn('mercato', `Aucun mouvement. Personne n'a aimé ça.`);
    }
    m.fini = true;
  }
  /* UNE RECRUE N'EN EST UNE QUE DANS SA FENÊTRE (le propriétaire, 04/10/2026 : « après
     une saison au club on n'est plus une recrue »). `j.recrue` était posé à la signature
     et **jamais retiré** : l'étiquette restait à vie, et surtout `cVentesQuiSuffisent()`
     écarte les recrues — donc un joueur signé une fois ne pouvait **plus jamais** être
     proposé pour financer un achat, dix saisons plus tard. On ne peut annuler un
     transfert que dans la fenêtre où il a été conclu : c'est la règle de la 1.0
     (`p.joinedWindow`), et elle manquait ici. */
  (S.equipe || []).forEach(j => { delete j.recrue; });
  cSyncEffectif();
  /* L'objectif ne se rejuge qu'en août : un président ne révise pas sa demande en
     janvier parce que tu as recruté. */
  if (!(m && m.hiver)) cPoserObjectif();
  /* Et l'été finit sur le seul écran qui ne parle pas de football — jamais à l'hiver,
     où l'on est au milieu d'une saison. */
  if (!(m && m.hiver) && S.annee > (S.vie.anVie || 0)){
    S.vie.anVie = S.annee; S.vie.fait = null; S.vie.suite = '';
    S.ecran = 'cvie'; sauver(); rendre(); return;
  }
  /* La préparation est le dernier temps avant la première journée — y compris la
     première saison, où il n'y a pas d'écran de vie. Jamais à l'hiver : on est au
     milieu d'une saison. */
  if (!(m && m.hiver) && !S.prepaFaite) return cOuvrirPrepa();
  S.ecran = 'csemaine'; sauver(); rendre();
}

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
/* `cDire` ne lit que `CMOTS`, le vocabulaire du coach. Elle portait une branche
   `k === 'vestiaire'` qui renvoyait vers `MOTS.vestiaire`, celui du joueur·euse :
   c'est l'autre porte par laquelle la mauvaise voix entrait, et elle est devenue
   morte en même temps que la case. Retirée, pour qu'ajouter une clé à `CLIENS_VUS`
   ne la rouvre pas sans qu'on le voie. */
function cDire(k){ return CMOTS[k][bande(S.liens[k])]; }
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
    ? "Elle peut te protéger une fois si le président lâche, elle te laisse la main sur l'argent des ventes, et elle te sort des dossiers au mercato."
    : "Elle ne s'interposera pas, elle garde sa part sur l'argent des ventes, et elle ne se fatigue pas à te trouver des joueurs.";
  if (k === 'presse') return S.liens.presse > 56
    ? "On parle de toi ailleurs : plus de clubs t'appelleront en juin."
    : "Personne ne parle de toi ailleurs — et en juin, le téléphone sonne une fois.";
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
    reseau: ["Personne ne décroche : peu de dossiers au mercato, et personne en juin.",
      "Tu as quelques numéros, et quelques dossiers quand le mercato ouvre.",
      "On te rappelle : des dossiers sur la table, et des clubs qui pensent à toi.",
      "Un numéro pour chaque situation : la table est pleine, et on t'appelle en juin."][b],
  }[a];
}
