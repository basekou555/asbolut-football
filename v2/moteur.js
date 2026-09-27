/* ============================================================
   ABSOLUT COACH 2 — LE MOTEUR
   Une saison jouable. Pas de vie, pas de mercato, pas de contenu :
   seulement le rythme (une décision de semaine, zéro à trois arrêts,
   zéro à deux faits de match, un résultat) et ce qui le fait tourner.

   Règles verrouillées appliquées ici :
   - aucune valeur de jauge n'est renvoyée à l'écran, jamais ; le moteur
     travaille sur 0-100 et ne sort que des phrases (voir `dire()`) ;
   - un axe a trois couches : `base` (la trace), `boost` (l'acquis récent
     qui s'efface), `plafond` (jamais lu par le joueur) ;
   - le rendement d'une séance baisse près du plafond, et c'est le compte
     rendu de séance qui l'apprend ;
   - tout ce qui arrive est écrit dans `S.journal`, seule mémoire du jeu.
   ============================================================ */

const VERSION = 2;
let S = null;
/* Mis à true par le banc d'essai (labo.html) : les milliers de saisons qu'il
   simule ne doivent pas écraser la carrière rangée dans localStorage. */
let SIM = false;

/* ---------- petits outils ---------- */
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rnd(a, b + 1));
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => [...a].sort(() => Math.random() - .5);
function poisson(l){ let k = 0, p = Math.exp(-l), s = p, u = Math.random();
  while (u > s && k < 12) { k++; p *= l / k; s += p; } return k; }
/* La saturation des scores, reprise de la version précédente : les matchs
   ordinaires sont intacts, la queue est comprimée (plus de 12-0). */
const tameXG = x => x <= 2.6 ? x : 2.6 + (x - 2.6) / (1 + (x - 2.6) / 2.2);

/* ---------- création ---------- */
const POSTES = [
  { id:'G', nom:"Gardien",            spec:"Réflexes",  w:{ tech:.22, phys:.26, ment:.30, spec:.22 } },
  { id:'D', nom:"Défenseur",          spec:"Placement", w:{ tech:.22, phys:.32, ment:.24, spec:.22 } },
  { id:'M', nom:"Milieu de terrain",  spec:"Vision",    w:{ tech:.32, phys:.22, ment:.24, spec:.22 } },
  { id:'A', nom:"Attaquant",          spec:"Finition",  w:{ tech:.30, phys:.24, ment:.20, spec:.26 } },
];
/* Les trois origines, recalées par le propriétaire le 27/09/2026. L'ordre des
   clés est l'ordre des pastilles : les forces d'abord, le défaut en dernier. */
/* Les trois origines. C'est le PRESET : ce que l'origine donne est un socle
   qui tient toute la carrière — « j'ai toujours eu un gros mental ». Deux axes
   à 60, un à 40, le quatrième (celui du poste) à 50 : rien d'autre, pour que
   le départ soit lisible d'un coup d'œil. L'ordre des clés est l'ordre des
   pastilles : les forces d'abord, le défaut en dernier. */
const ORIGINES = [
  { id:'academie', ico:'🏛️', nom:"La grande académie",
    sub:"Formé au centre d'un club pro. On t'a appris à jouer et à préparer ton corps. On t'a aussi appris à attendre.",
    axes:{ tech:10, phys:10, ment:-10 }, liens:{ vestiaire:10 }, u0:{ tech:.5, phys:.6, ment:1.1, spec:.8 } },
  { id:'quartier', ico:'🧱', nom:"Le terrain du quartier",
    sub:"Repéré tard, sur du bitume. Le geste, tu l'as depuis toujours ; le corps, personne ne l'a jamais préparé.",
    axes:{ tech:10, ment:10, phys:-10 }, liens:{ supporters:8 }, u0:{ tech:.6, phys:1.2, ment:.6, spec:1 } },
  { id:'etranger', ico:'✈️', nom:"Arrivé de l'étranger",
    sub:"Un pari de recruteur, une langue à apprendre, une famille à six mille kilomètres. Il en a fallu, du caractère.",
    axes:{ ment:10, phys:10, tech:-10 }, liens:{ agent:15 }, u0:{ tech:1.1, phys:.8, ment:.5, spec:.9 } },
];
const AMBITIONS = [
  { id:'gagner', ico:'🏆', nom:"Tout gagner", sub:"Les trophées, les grands soirs. Le reste attendra." },
  { id:'proches', ico:'🏡', nom:"Rester près des miens", sub:"Jouer, bien gagner, et dîner chez toi le dimanche." },
  { id:'argent', ico:'💰', nom:"Mettre ma famille à l'abri", sub:"Tu es le premier de la famille à vivre du foot." },
  { id:'construire', ico:'🌱', nom:"Construire autre chose", sub:"Une académie, un commerce, un nom qui sert." },
];
/* Une qualité et un défaut, tirés au sort, sur deux axes différents. Les points
   sont dans tes chiffres dès le premier match ; le nom se découvre en jouant. */
const QUALITES = [
  { id:'frappe', axe:'tech', nom:"Une frappe", dit:"Ta frappe n'est pas normale. Le staff s'arrête pour regarder les séances de tirs." },
  { id:'poumons', axe:'phys', nom:"Des poumons", dit:"Tu finis les matchs plus frais que tu ne les as commencés." },
  { id:'nerfs', axe:'ment', nom:"Des nerfs d'acier", dit:"Le stade hurle et tes mains ne tremblent pas." },
  { id:'lecture', axe:'spec', nom:"La lecture du jeu", dit:"Tu es là où le ballon va arriver. C'est tout, et c'est énorme." },
];
const DEFAUTS = [
  { id:'gauche', axe:'tech', nom:"Un pied gauche absent", dit:"Côté gauche, tu ne fais rien. Les défenseurs l'ont compris avant toi." },
  { id:'ischios', axe:'phys', nom:"Des ischios en verre", dit:"Encore cette gêne derrière la cuisse. Le kiné soupire." },
  { id:'doute', axe:'ment', nom:"Le doute", dit:"Un geste raté et tu joues petit pendant vingt minutes." },
  { id:'placement', axe:'spec', nom:"Toujours un temps de retard", dit:"Tu arrives où le ballon était. On te l'a déjà dit." },
];

const AXES = ['tech', 'phys', 'ment', 'spec'];
/* Le poids d'une séance, et l'arbitrage qu'elle porte.
   Les deux couches ne répondent PAS à la même chose, et c'est tout le sujet :
   - `BOOST_SEANCE` est l'acquis récent (divisé par deux à chaque match, donc il
     porte sur deux ou trois matchs). Il est proportionnel à ce que tu **maîtrises
     déjà** : travailler ta force répond tout de suite ;
   - `TRACE_SEANCE` est ce qui reste pour toujours. Il est proportionnel à la
     **distance au plafond** : travailler ta faiblesse rentre lentement, mais ça
     reste.
   Sans ça, travailler son point faible gagnait sur les deux tableaux à la fois
   (mesuré au banc d'essai : « toujours le mental » donnait 22,3 matchs et +8,3
   de trace quand « toujours la technique » donnait 18,8 et +2,7) — donc le choix
   de la semaine n'en était pas un. */
const BOOST_SEANCE = 3.5;
const TRACE_SEANCE = .55;
const AXE_NOM = { tech:"Technique", phys:"Physique", ment:"Mental", spec:"Au poste" };
/* « Au poste » est un nom de code : à l'écran, c'est Vision, Finition, Réflexes
   ou Placement, selon le poste. */
function axeNom(a){ return a === 'spec' && S && S.moi ? S.moi.specNom : AXE_NOM[a]; }

function nouvellePartie(c){
  const poste = POSTES.find(p => p.id === c.poste) || POSTES[2];
  const base = {}; AXES.forEach(a => base[a] = 50);
  Object.entries(c.origine.axes).forEach(([a, v]) => base[a] = clamp(base[a] + v));
  const q = pick(QUALITES);
  const f = pick(DEFAUTS.filter(x => x.axe !== q.axe));
  base[q.axe] = clamp(base[q.axe] + 15);
  base[f.axe] = clamp(base[f.axe] - 15);

  const plafond = {}; AXES.forEach(a => plafond[a] = ri(72, 96));
  /* Le socle : le plancher de chaque axe pour le reste de la carrière. C'est ce
     que l'origine t'a donné — une carrière peut t'abîmer, elle ne peut pas
     effacer d'où tu viens. Borné par le départ réel pour que la qualité et le
     défaut tirés restent sous lui sans le contredire. */
  const socle = {}; AXES.forEach(a => socle[a] = Math.min(50 + (c.origine.axes[a] || 0), base[a]));
  const liens = { coach:50, vestiaire:50, club:50, supporters:45, agent:50, selection:0 };
  Object.entries(c.origine.liens || {}).forEach(([k, v]) => liens[k] = clamp(liens[k] + v));

  const ligue = creerLigue(c.annee);
  const club = ligue.equipes[ri(10, 17)];   // on démarre dans le bas de tableau

  S = {
    v: VERSION, mode: 'joueur', annee: c.annee,
    moi: { nom: c.nom, poste: poste.id, posteNom: poste.nom, specNom: poste.spec,
      age: 18, base, boost: { tech:0, phys:0, ment:0, spec:0 }, plafond, socle,
      u0: c.origine.u0, origine: c.origine.id, ambition: c.ambition.id,
      qual: { id:q.id, vu:false }, def: { id:f.id, vu:false },
      histo: {} },
    club: { nom: club.nom, force: club.force },
    ligue, liens,
    /* `fond` est la réserve que construit le travail physique : on récupère plus
       vite d'un match à l'autre, on se blesse moins, et on laisse moins de jambes
       dans un match. Il s'use d'une journée sur l'autre : il faut l'entretenir.
       Sans lui la séance physique était la plus chère sans aucune contrepartie,
       et le banc d'essai la montrait dominée à tous les postes. */
    etats: { fraicheur:100, forme:60, blessure:0, suspension:0, corps:88, fond:0 },
    journee: 0, arrets: 0, cartons: 0,
    semaine: null, seance: null, match: null, dernier: null, arret: null,
    stats: { matchs:0, titus:0, buts:0, passes:0, notes:[], minutes:0 },
    journal: [], ecran: 'semaine',
  };
  jrn('debut', `${S.moi.nom}, ${poste.nom.toLowerCase()} de ${S.club.nom}. Première saison.`);
  sauver(); return S;
}

/* ---------- la ligue ---------- */
function creerLigue(annee){
  const dk = typeof decadeKey === 'function' ? decadeKey(annee) : '10';
  const gros = (typeof FR_CLUBS !== 'undefined' ? FR_CLUBS : []).filter(c => (c.s[dk] || 0) >= 2).map(c => ({ nom:c.n, s:c.s[dk] }));
  const petits = (typeof FR_LOWER !== 'undefined' ? FR_LOWER : []).map(n => ({ nom:n, s: rnd(-1.7, 1) }));
  const noms = [...shuffle(gros).slice(0, 6), ...shuffle(petits).slice(0, 12)];
  const equipes = noms.map(x => ({ nom:x.nom, force: Math.round(clamp(52 + x.s * 4 + rnd(-3, 3), 44, 78)) }))
    .sort((a, b) => b.force - a.force);
  const N = equipes.length;
  return { equipes, N, classement: Object.fromEntries(equipes.map(e => [e.nom, { pts:0, j:0, bp:0, bc:0 }])) };
}
function adversaire(j){
  const autres = S.ligue.equipes.filter(e => e.nom !== S.club.nom);
  const i = (j * 7 + 3) % autres.length;          // rotation régulière, pas deux fois de suite
  return { ...autres[i], dom: j % 2 === 0 };
}
const JOURNEES = 34;

/* ---------- les axes ---------- */
function plafondReel(a){
  const autres = AXES.filter(x => x !== a).map(x => S.moi.base[x]);
  const moy = autres.reduce((n, v) => n + v, 0) / autres.length;
  return Math.min(S.moi.plafond[a], moy + 25);          // pas de 100 en physique avec 10 partout
}
/* La seule porte par laquelle un axe bouge. Une hausse est libre jusqu'au
   plafond ; une baisse s'arrête au socle. L'usure, quand elle viendra, passera
   par ici et n'aura rien de plus à savoir. */
function bougerAxe(a, d){
  const v = clamp(S.moi.base[a] + d);
  S.moi.base[a] = d < 0 ? Math.max(v, S.moi.socle[a] == null ? 0 : S.moi.socle[a]) : v;
}
/* Ce que le mental porte : encaisser. Renvoie −1 (on prend tout de plein fouet)
   à +1 (rien ne t'atteint vraiment). Amortit les mauvaises notes, les liens qui
   se dégradent et le coût des décisions hors football — jamais les gains. */
function encaisse(){
  return clamp(((S.moi.base.ment + S.moi.boost.ment) - 50) / 45, -1, 1);
}
function niveau(){
  const p = POSTES.find(x => x.id === S.moi.poste);
  let n = 0; AXES.forEach(a => n += p.w[a] * (S.moi.base[a] + S.moi.boost[a]));
  return n;
}
function niveauJour(){
  return niveau() + (S.etats.forme - 60) * .06 + (S.etats.fraicheur - 85) * .05;
}

/* ---------- la semaine ---------- */
/* Chaque axe a **son** effet long terme, et ce n'est pas « du niveau » (retour du
   propriétaire, 27/09/2026). Court terme, tout coûte de la fraîcheur ; long terme :
   - physique  → le fond : on récupère plus vite et on se blesse moins ;
   - technique → le geste : on réussit plus souvent les faits de match ;
   - au poste  → ta place : le coach te titularise ;
   - mental    → encaisser : les mauvais soirs et les coups durs t'abîment moins.
   Et `rende` fait suivre la récompense au coût : le mental fatigue moins, donc il
   rapporte moins. « Si le mental est toujours le plus intéressant, ce qu'il faut,
   c'est que ce qu'on gagne avec soit un peu moins important que pour le reste. » */
const SEMAINES = [
  { id:'tech', ico:'⚽', nom:"Rester après l'entraînement", sub:"Frappes, centres, gestes répétés jusqu'à la nuit.",
    axe:'tech', fit:-8, rende:1, dit:[{c:'risk',t:"🫁 samedi : jambes lourdes"},{c:'foot',t:"⚡ le geste, sur les faits de match"},{c:'vie',t:"🏡 tu rentres tard"}] },
  { id:'phys', ico:'💪', nom:"La salle et les sprints", sub:"Le préparateur t'a fait un programme. Il est violent.",
    axe:'phys', fit:-11, fond:3.5, rende:1.15, dit:[{c:'risk',t:"🫁 samedi : fatigué"},{c:'foot',t:"💪 du fond : tu récupères plus vite"}] },
  { id:'ment', ico:'🧠', nom:"La vidéo et le calme", sub:"Tu revois tes matchs, tu parles au préparateur mental.",
    axe:'ment', fit:-7, rende:.85, dit:[{c:'foot',t:"🛡️ encaisser les mauvais soirs"},{c:'vie',t:"🏡 du temps chez toi"}] },
  { id:'spec', ico:'🎯', nom:"Le travail de ton poste", sub:"Une heure seul avec l'adjoint, sur ce que ton poste demande.",
    axe:'spec', fit:-8, fond:1, rende:1, dit:[{c:'foot',t:"🎽 ta place : le coach te titularise"},{c:'risk',t:"🫁 une heure de plus dans les jambes"}] },
  { id:'normale', ico:'🔁', nom:"La semaine normale", sub:"Ce que le coach demande, rien de plus, rien de moins.",
    axe:null, fit:-2, dit:[{c:'neutre',t:"↔️ un peu de tout, rien de marquant"}] },
  { id:'repos', ico:'🛌', nom:"Lever le pied", sub:"Le corps tire. Tu écoutes.",
    axe:null, fit:8, dit:[{c:'foot',t:"🫁 samedi : frais"},{c:'vie',t:"🏡 deux jours avec les tiens"}] },
];
function choisirSemaine(id){
  const s = SEMAINES.find(x => x.id === id); if (!s) return;
  S.semaine = s.id;
  S.etats.fraicheur = clamp(S.etats.fraicheur + s.fit);
  if (s.fond) S.etats.fond = clamp(S.etats.fond + s.fond);
  S.seance = null;
  if (s.axe){
    const a = s.axe, pl = plafondReel(a);
    const marge = clamp(1 - S.moi.base[a] / pl, .12, 1);   // ce qu'il te reste à prendre
    const acquis = clamp(1 - marge, .12, 1);               // ce que tu tiens déjà
    const rende = s.rende == null ? 1 : s.rende;          // la récompense suit le coût
    const tirage = pick([.4, .4, 1, 1, 1, 1.6]) * rende;
    const r = tirage * marge;
    S.moi.boost[a] += BOOST_SEANCE * tirage * acquis;
    bougerAxe(a, TRACE_SEANCE * r);
    S.seance = {
      axe: a,
      mot: tirage >= 1.3 * rende ? "excellente" : tirage >= .7 * rende ? "correcte" : "pour rien",
      texte: tirage >= 1.3 * rende ? `Tout est rentré. L'adjoint t'a regardé deux fois.`
           : tirage >= .7 * rende ? `Du travail honnête, rien de spectaculaire.`
           : `Tu n'as rien senti passer. Certaines séances ne servent à rien.`,
      plafond: marge < .25,
      terrain: acquis >= .6,
    };
    /* Le compte rendu doit apprendre la règle en la faisant sentir, sans chiffre. */
    if (S.seance.plafond) S.seance.texte += ` À ce niveau-là tu ne progresses plus vraiment, mais c'est prêt pour samedi.`;
    else if (S.seance.terrain) S.seance.texte += ` C'est un terrain que tu connais : ça répondra vite, ça ne montera plus beaucoup.`;
    else S.seance.texte += ` Tu pars de loin sur ce point-là : ça ne se verra pas samedi, mais ça reste.`;
  } else if (s.id === 'repos'){
    S.etats.corps = clamp(S.etats.corps + 1);
  }
  jrn('semaine', `${s.nom}${S.seance ? ` — séance ${S.seance.mot}` : ''}.`);
  ouvrirArrets();
}

/* ---------- les arrêts (placeholders : le contenu viendra après) ---------- */
const ARRETS = [
  { id:'banc', quand: () => S.liens.coach < 46 && S.journee >= 2,
    titre:"Le coach t'attend dans son bureau",
    texte:"« Je vais être direct : samedi, tu commences sur le banc. Ce n'est pas contre toi. »",
    options:[
      { l:"Encaisser sans un mot", liens:{ coach:4 }, dit:[{c:'foot',t:"🎽 il te trouve professionnel"}] },
      { l:"Demander ce qui te manque", liens:{ coach:2 }, axes:{ ment:1 }, dit:[{c:'foot',t:"🎽 il te dit la vérité"},{c:'risk',t:"🧠 elle pique"}] },
      { l:"Lui dire que tu mérites mieux", liens:{ coach:-6, vestiaire:4 }, dit:[{c:'risk',t:"🎽 il ne l'oubliera pas"},{c:'foot',t:"✊ le vestiaire te respecte"}] },
    ] },
  { id:'presse', quand: () => S.stats.notes.length >= 3 && moyenneNotes() >= 6.8,
    titre:"Un journaliste t'attend à la sortie",
    texte:"« Trois bons matchs de suite. On commence à parler de vous ailleurs. Vous vous sentez à l'étroit ici ? »",
    options:[
      { l:"Rester poli et vague", liens:{ club:2 }, dit:[{c:'neutre',t:"🤐 personne n'est fâché"}] },
      { l:"Dire que tu veux plus haut", liens:{ agent:8, club:-6, supporters:-3 }, dit:[{c:'foot',t:"🤝 ton agent adore"},{c:'risk',t:"🏟️ le club beaucoup moins"}] },
      { l:"Parler du groupe, pas de toi", liens:{ vestiaire:7, supporters:3 }, dit:[{c:'foot',t:"✊ le vestiaire lit la presse"}] },
    ] },
  { id:'ancien', quand: () => S.journee >= 5 && S.liens.vestiaire < 52,
    titre:"Le plus ancien du vestiaire te prend à part",
    texte:"« On mange tous ensemble jeudi. Tu viens, ou tu rentres encore chez toi ? »",
    options:[
      { l:"Venir, et rester tard", liens:{ vestiaire:9 }, fit:-4, dit:[{c:'foot',t:"✊ le groupe t'adopte"},{c:'risk',t:"🫁 la nuit sera courte"}] },
      { l:"Passer une heure", liens:{ vestiaire:4 }, dit:[{c:'neutre',t:"↔️ correct, sans plus"}] },
      { l:"Décliner", liens:{ vestiaire:-5 }, dit:[{c:'risk',t:"✊ on l'a remarqué"},{c:'vie',t:"🏡 une soirée chez toi"}] },
    ] },
  { id:'corps', quand: () => S.etats.fraicheur < 70,
    titre:"Le kiné veut te voir avant l'entraînement",
    texte:"« Tu tires sur la corde. Je peux te sortir de la séance de jeudi, mais c'est le coach qui décidera ce qu'il en pense. »",
    options:[
      { l:"Accepter de lever le pied", fit:10, liens:{ coach:-3 }, dit:[{c:'foot',t:"🫁 samedi : frais"},{c:'risk',t:"🎽 le coach le note"}] },
      { l:"Serrer les dents", fit:-4, corps:-3, liens:{ coach:3 }, dit:[{c:'foot',t:"🎽 il apprécie"},{c:'risk',t:"🩼 ton corps encaisse"}] },
    ] },
];
function ouvrirArrets(){
  const dispo = ARRETS.filter(a => { try { return a.quand(); } catch(e){ return false; } });
  if (!dispo.length || S.arrets >= 2 || Math.random() < .45) return lancerMatch();
  S.arret = pick(dispo); S.arrets++; S.ecran = 'arret'; sauver(); rendre();
}
function choisirArret(i){
  const a = S.arret, o = a.options[i]; if (!o) return;
  appliquer(o);
  jrn('arret', `${a.titre} → ${o.l}`);
  S.arret = null; lancerMatch();
}
function appliquer(o){
  const enc = encaisse();
  Object.entries(o.liens || {}).forEach(([k, v]) =>
    S.liens[k] = clamp(S.liens[k] + (v < 0 ? v * (1 - enc * .4) : v)));
  Object.entries(o.axes || {}).forEach(([k, v]) => bougerAxe(k, v));
  if (o.fit) S.etats.fraicheur = clamp(S.etats.fraicheur + o.fit);
  if (o.corps) S.etats.corps = clamp(S.etats.corps + o.corps);
}

/* ---------- le match ---------- */
function monStatut(adv){
  if (S.etats.blessure > 0) return 'blesse';
  if (S.etats.suspension > 0) return 'suspendu';
  const concurrent = S.club.force + rnd(-4, 4);
  /* `spec` compte une deuxième fois ici : être juste à son poste, c'est ce que
     le coach regarde pour faire un onze. C'est l'effet long de cette séance. */
  const credit = niveauJour() - concurrent + (S.liens.coach - 50) * .16
    + (S.moi.base.spec + S.moi.boost.spec - 50) * .09
    + (S.moi.age <= 18 ? -5 : S.moi.age === 19 ? -2.5 : 0) + rnd(-3, 3);
  if (credit > 1.5) return 'titulaire';
  if (credit > -7) return Math.random() < .75 ? 'banc' : 'hors';
  return 'hors';
}
function lancerMatch(){
  const adv = adversaire(S.journee);
  const statut = monStatut(adv);
  const nous = S.club.force + (S.liens.vestiaire - 50) * .04 + (statut === 'titulaire' ? (niveauJour() - S.club.force) * .12 : 0);
  const eux = adv.force;
  const diff = nous - eux + (adv.dom ? 2.4 : -2.4);
  const bn = poisson(tameXG(1.35 * Math.exp(diff / 19)));
  const be = poisson(tameXG(1.35 * Math.exp(-diff / 19)));

  const m = { adv, statut, bn, be, faits: [], minutes: 0, buts:0, passes:0, note:null, moments:[], jaune:0, blessure:0 };
  // entrée en jeu
  if (statut === 'titulaire') m.minutes = 90;
  else if (statut === 'banc') m.minutes = Math.random() < .6 ? ri(12, 35) : 0;
  const entree = statut === 'banc' && m.minutes ? 90 - m.minutes : 0;

  // les buts, répartis dans le temps
  const mins = shuffle([...Array(90).keys()].map(i => i + 1));
  const evs = [];
  for (let i = 0; i < bn; i++) evs.push({ min: mins.pop(), type:'but', nous:true });
  for (let i = 0; i < be; i++) evs.push({ min: mins.pop(), type:'but', nous:false });
  if (Math.random() < .14) evs.push({ min: mins.pop(), type:'penalty', nous: Math.random() < .5 });
  if (Math.random() < .5) evs.push({ min: mins.pop(), type:'jaune', nous: Math.random() < .5 });
  if (Math.random() < .09) evs.push({ min: mins.pop(), type:'rouge', nous: Math.random() < .5 });
  if (Math.random() < .12) evs.push({ min: mins.pop(), type:'blessure', nous: Math.random() < .5 });
  evs.sort((a, b) => a.min - b.min);

  // qui marque chez nous : moi si je suis sur le terrain, sinon un coéquipier
  const chance = { G:0, D:.07, M:.20, A:.38 }[S.moi.poste];
  const chancePasse = { G:0, D:.10, M:.24, A:.18 }[S.moi.poste];
  evs.filter(e => e.type === 'but' && e.nous).forEach(e => {
    const surLeTerrain = m.minutes && e.min >= entree;
    if (surLeTerrain && Math.random() < chance + (S.moi.base.spec - 50) * .002){ e.moi = true; m.buts++; }
    else if (surLeTerrain && Math.random() < chancePasse){ e.passeMoi = true; m.passes++; }
    e.qui = e.moi ? S.moi.nom : coequipier();
  });
  evs.filter(e => e.type === 'but' && !e.nous).forEach(e => e.qui = adv.nom);
  // un carton peut être le mien : c'est lui qui compte pour la suspension
  const pCarton = { G:.04, D:.30, M:.26, A:.16 }[S.moi.poste];
  evs.filter(e => (e.type === 'jaune' || e.type === 'rouge') && e.nous).forEach(e => {
    if (m.minutes && e.min >= entree && Math.random() < pCarton) e.moi = true;
    e.qui = e.moi ? S.moi.nom : coequipier();
  });
  evs.filter(e => e.type === 'blessure' && e.nous).forEach(e => e.qui = coequipier());

  // faits de match : zéro à deux, seulement si je suis sur le terrain
  if (m.minutes){
    const n = Math.random() < .45 ? 0 : Math.random() < .8 ? 1 : 2;
    for (let i = 0; i < n; i++){
      const f = pick(MOMENTS[S.moi.poste]);
      if (!m.moments.some(x => x.id === f.id)) m.moments.push({ ...f, min: ri(Math.max(entree + 2, 10), 88) });
    }
    m.moments.sort((a, b) => a.min - b.min);
  }
  m.evs = evs; m.entree = entree;
  S.match = m; S.momentIdx = 0;
  suiteMatch();
}
function coequipier(){
  const noms = ["Diallo", "Lefort", "Perrin", "Traoré", "Semis", "Bakayoko", "Mendy", "Delecroix", "Riou", "Garnier"];
  return pick(noms);
}
/* Les faits de match, par poste. Aucune probabilité n'est affichée :
   la résolution croise tes axes et le hasard. */
const MOMENTS = {
  G: [
    { id:'pen', q:"Penalty contre toi. Tu choisis ton côté.", axe:'spec',
      opts:[{ l:"Plonger à droite", p:.34 }, { l:"Plonger à gauche", p:.34 }, { l:"Rester au milieu", p:.22 }],
      ok:"Tu l'as arrêté. Le stade explose.", ko:"Il l'a mis de l'autre côté." },
    { id:'sortie', q:"Ballon dans le dos de ta défense, l'attaquant part seul.", axe:'ment',
      opts:[{ l:"Sortir dans les pieds", p:.55 }, { l:"Rester et fermer l'angle", p:.5 }],
      ok:"Tu as tout pris. Sortie parfaite.", ko:"Il t'a éliminé. But." },
  ],
  D: [
    { id:'tacle', q:"Il te prend de vitesse dans le couloir, à l'entrée de la surface.", axe:'spec',
      opts:[{ l:"Tacler", p:.5 }, { l:"Contenir et attendre l'aide", p:.62 }],
      ok:"Bien joué. Ballon récupéré.", ko:"Faute. Et l'arbitre sort le carton." },
    { id:'tete', q:"Corner pour vous. Tu montes ou tu restes derrière ?", axe:'phys',
      opts:[{ l:"Monter", p:.22 }, { l:"Rester en couverture", p:.85 }],
      ok:"Tu as touché le ballon au bon endroit.", ko:"Rien, et le contre est parti." },
  ],
  M: [
    { id:'tir', q:"Vingt mètres, l'angle est fermé, un partenaire appelle dans le dos.", axe:'tech',
      opts:[{ l:"Frapper", p:.24 }, { l:"Le servir", p:.42 }],
      ok:"Au fond.", ko:"Détourné. L'action meurt là." },
    { id:'presse', q:"Tu peux remonter presser leur défense, ou garder ta position.", axe:'phys',
      opts:[{ l:"Presser", p:.4 }, { l:"Tenir la ligne", p:.66 }],
      ok:"Ballon récupéré haut. Tout le monde t'a vu.", ko:"Tu as laissé un trou derrière toi." },
  ],
  A: [
    { id:'face', q:"Seul face au gardien, un coéquipier arrive à ta hauteur.", axe:'spec',
      opts:[{ l:"Frapper", p:.44 }, { l:"Le décaler", p:.56 }],
      ok:"But.", ko:"Le gardien a dit non." },
    { id:'volee', q:"Le ballon tombe sur ton pied gauche, dans la surface.", axe:'tech',
      opts:[{ l:"Reprendre de volée", p:.2 }, { l:"Contrôler d'abord", p:.38 }],
      ok:"Lucarne.", ko:"À côté." },
  ],
};
function suiteMatch(){
  const m = S.match;
  if (S.momentIdx < m.moments.length){ S.ecran = 'moment'; sauver(); return rendre(); }
  finirMatch();
}
function choisirMoment(i){
  const m = S.match, f = m.moments[S.momentIdx], o = f.opts[i];
  /* L'axe du fait décide d'abord, mais la technique pèse sur **tous** les faits :
     c'est elle qui fait que le geste sort, quel que soit le geste. Quand le fait
     est déjà technique, on ne la compte pas deux fois. Mesuré à .0028 : l'écart
     disparaissait dans le bruit, donc le joueur ne pouvait pas le sentir. */
  const axeV = S.moi.base[f.axe] + S.moi.boost[f.axe];
  const techV = S.moi.base.tech + S.moi.boost.tech;
  const bonus = (f.axe === 'tech' ? (techV - 50) * .009
      : (axeV - 50) * .006 + (techV - 50) * .005)
    + (S.etats.fraicheur - 80) * .001;
  const reussi = Math.random() < clamp(o.p + bonus, .05, .95);
  f.choix = o.l; f.reussi = reussi;
  if (reussi && (f.id === 'tir' || f.id === 'face' || f.id === 'volee')){
    if (o.l.startsWith("Frapper") || o.l.startsWith("Reprendre")) { m.bn++; m.buts++; }
    else { m.bn++; m.passes++; }
  }
  if (!reussi && f.id === 'tacle') m.jaune++;
  if (!reussi && f.id === 'sortie') m.be++;
  if (reussi && f.id === 'pen') m.be = Math.max(0, m.be - 1);
  jrn('moment', `${f.min}ᵉ — ${f.q} → ${o.l} : ${reussi ? f.ok : f.ko}`);
  S.momentIdx++; suiteMatch();
}
/* Le soir où rien ne va : c'est là que le mental se voit. Seul l'aléa
   défavorable est amorti, jamais le favorable. */
function aleaNote(){
  const a = rnd(-.7, .7);
  return a < 0 ? a * (1 - encaisse() * .55) : a;
}
function moyenneNotes(){ const n = S.stats.notes; return n.length ? n.reduce((a, b) => a + b, 0) / n.length : 6; }
function finirMatch(){
  const m = S.match, res = m.bn > m.be ? 'V' : m.bn < m.be ? 'D' : 'N';
  const g0 = { ...S.liens }, e0 = { ...S.etats };
  m.semaine = S.semaine; m.seance = S.seance;
  if (m.minutes){
    const derriere = S.moi.poste === 'G' || S.moi.poste === 'D';
    m.note = clamp(6.1 + (res === 'V' ? .5 : res === 'D' ? -.4 : 0) + m.buts * .7 + m.passes * .4
      + (derriere ? (m.be === 0 ? 1 : m.be === 1 ? .35 : m.be >= 4 ? -.5 : 0) : 0)
      + (niveauJour() - S.club.force) * .035 + m.moments.filter(f => f.reussi).length * .3
      - m.moments.filter(f => f.reussi === false).length * .3 + aleaNote(), 3, 10);
    m.note = Math.round(m.note * 10) / 10;
    S.stats.matchs++; S.stats.minutes += m.minutes; S.stats.buts += m.buts; S.stats.passes += m.passes;
    S.stats.notes.push(m.note); if (m.statut === 'titulaire') S.stats.titus++;
    S.etats.fraicheur = clamp(S.etats.fraicheur - (m.minutes / 90) * ri(10, 16) * (1 - S.etats.fond * .0022));
    S.etats.corps = clamp(S.etats.corps - (m.minutes / 90) * .4);
    let dCoach = clamp((m.note - 6.2) * 2.4, -4, 4);
    if (dCoach < 0) dCoach *= (1 - encaisse() * .5);       // on encaisse le jugement
    S.liens.coach = clamp(S.liens.coach + dCoach);
    S.liens.vestiaire = clamp(S.liens.vestiaire + (m.note >= 7 ? 1.2 : m.note < 5.5 ? -1 : 0));
    S.liens.supporters = clamp(S.liens.supporters + (m.buts ? 2 : 0) + (m.note >= 7.5 ? 1 : 0) - (m.note < 5.4 ? 1 : 0));
    S.etats.forme = clamp(S.etats.forme + (m.note >= 7 ? 5 : m.note >= 6 ? 1 : -4));
    if (Math.random() < Math.max(.012, .05 - S.etats.fond * .0006) + (S.moi.def.id === 'ischios' ? .04 : 0) + (S.etats.fraicheur < 60 ? .05 : 0)){
      m.blessure = ri(1, 5); S.etats.corps = clamp(S.etats.corps - m.blessure);
    }
    m.jaunes = m.evs.filter(e => e.type === 'jaune' && e.moi).length + m.jaune;
    m.rouge = m.evs.some(e => e.type === 'rouge' && e.moi);
    S.cartons += m.jaunes;
    if (m.rouge){ m.suspendu = 2; S.cartons = 0; }
    else if (S.cartons >= 5){ m.suspendu = 1; S.cartons = 0; }
  } else {
    S.liens.coach = clamp(S.liens.coach - (m.statut === 'banc' ? .5 : .2));
  }
  AXES.forEach(a => S.moi.boost[a] *= .5);
  // classement
  const c = S.ligue.classement;
  c[S.club.nom].j++; c[S.club.nom].bp += m.bn; c[S.club.nom].bc += m.be;
  c[S.club.nom].pts += res === 'V' ? 3 : res === 'N' ? 1 : 0;
  c[m.adv.nom].j++; c[m.adv.nom].bp += m.be; c[m.adv.nom].bc += m.bn;
  c[m.adv.nom].pts += res === 'D' ? 3 : res === 'N' ? 1 : 0;
  autresMatchs();
  m.res = res; S.dernier = m;
  // ce qui a bougé, en direction seulement : l'écran n'aura jamais le chiffre
  m.mvt = [];
  Object.keys(g0).forEach(k => { const d = S.liens[k] - g0[k];
    if (Math.abs(d) >= .8) m.mvt.push({ k, up: d > 0, mot: dire(k) }); });
  if (S.etats.fraicheur - e0.fraicheur <= -8) m.mvt.push({ k:'fraicheur', up:false, mot:direJambes() });
  if (m.blessure) m.mvt.push({ k:'blessure', up:false, mot:`Tu sors touché : ${m.blessure} journée${m.blessure > 1 ? 's' : ''} d'absence.` });
  if (m.suspendu) m.mvt.push({ k:'suspension', up:false, mot:`Suspendu ${m.suspendu} match${m.suspendu > 1 ? 's' : ''}.` });
  jrn('match', `J${S.journee + 1} · ${m.adv.dom ? S.club.nom + ' – ' + m.adv.nom : m.adv.nom + ' – ' + S.club.nom} ${m.adv.dom ? m.bn + '-' + m.be : m.be + '-' + m.bn}`
    + (m.minutes ? ` · toi : ${m.minutes} min, note ${nb(m.note)}${m.buts ? `, ${m.buts} but${m.buts > 1 ? 's' : ''}` : ''}${m.passes ? `, ${m.passes} passe${m.passes > 1 ? 's' : ''}` : ''}` : ` · ${m.statut === 'banc' ? 'resté sur le banc' : m.statut === 'blesse' ? "à l'infirmerie" : m.statut === 'suspendu' ? 'suspendu' : 'hors du groupe'}`)
    + (m.blessure ? ` · sorti touché, ${m.blessure} journée${m.blessure > 1 ? 's' : ''} d'absence` : '')
    + (m.suspendu ? ` · suspendu ${m.suspendu} match${m.suspendu > 1 ? 's' : ''}` : ''));
  decouverte(m);
  S.ecran = 'resultat'; sauver(); rendre();
}
function autresMatchs(){
  const eq = S.ligue.equipes.filter(e => e.nom !== S.club.nom && e.nom !== S.match.adv.nom);
  const m = shuffle(eq);
  for (let i = 0; i + 1 < m.length; i += 2){
    const a = m[i], b = m[i + 1];
    const d = a.force - b.force + 2.4;
    const ga = poisson(tameXG(1.35 * Math.exp(d / 19))), gb = poisson(tameXG(1.35 * Math.exp(-d / 19)));
    const c = S.ligue.classement;
    c[a.nom].j++; c[b.nom].j++; c[a.nom].bp += ga; c[a.nom].bc += gb; c[b.nom].bp += gb; c[b.nom].bc += ga;
    c[a.nom].pts += ga > gb ? 3 : ga === gb ? 1 : 0; c[b.nom].pts += gb > ga ? 3 : ga === gb ? 1 : 0;
  }
}
/* La qualité et le défaut se révèlent sur un match qui leur ressemble,
   et au plus tard au douzième match. */
function decouverte(m){
  const tard = S.stats.matchs >= 12;
  const cands = [];
  const q = QUALITES.find(x => x.id === S.moi.qual.id), f = DEFAUTS.find(x => x.id === S.moi.def.id);
  const vu = { frappe: m.buts > 0, poumons: m.minutes >= 80, nerfs: m.note >= 7, lecture: m.note >= 7.2 };
  const vuD = { gauche: m.note != null && m.note < 6, ischios: m.blessure > 0 || m.minutes >= 75,
    doute: m.note != null && m.note < 5.8, placement: m.minutes >= 45 && m.note != null && m.note < 6.3 };
  if (!S.moi.qual.vu && (tard || vu[q.id])) cands.push(['qual', q, "✨"]);
  if (!S.moi.def.vu && (tard || vuD[f.id])) cands.push(['def', f, "⚠️"]);
  if (!cands.length) return;
  const [k, it, ico] = pick(cands);
  S.moi[k].vu = true;
  m.decouverte = { ico, nom: it.nom, dit: it.dit, axe: axeNom(it.axe), bon: k === 'qual' };
  jrn('decouverte', `${ico} ${it.nom} — ${it.dit}`);
}

/* ---------- la suite ---------- */
function apresMatch(){
  const d = S.dernier;
  if (S.etats.blessure > 0) S.etats.blessure--;
  if (S.etats.suspension > 0) S.etats.suspension--;
  if (d && d.blessure) S.etats.blessure = d.blessure;
  if (d && d.suspendu) S.etats.suspension = d.suspendu;
  S.etats.fond = clamp(S.etats.fond - 1.5);                 // le fond s'use si on ne l'entretient pas
  S.etats.fraicheur = clamp(S.etats.fraicheur + (S.etats.blessure ? 14 : 9) + S.etats.fond * .05);
  S.journee++;
  if (S.journee >= JOURNEES) return finSaison();
  S.arrets = 0; S.semaine = null; S.seance = null; S.match = null;
  S.ecran = 'semaine'; sauver(); rendre();
}
function avancerVite(n){
  for (let i = 0; i < n && S.journee < JOURNEES; i++){
    choisirSemaine('normale');
    if (S.ecran === 'arret') choisirArret(0);
    while (S.ecran === 'moment') choisirMoment(0);
    if (S.journee < JOURNEES) apresMatch(); else break;
  }
  rendre();
}
function finSaison(){
  const pos = classementTrie().findIndex(x => x.nom === S.club.nom) + 1;
  const note = moyenneNotes();
  S.bilan = {
    pos, note: Math.round(note * 100) / 100,
    gagne: bilanGagne(note, pos), perdu: bilanPerdu(note), suite: bilanSuite(pos, note),
  };
  jrn('saison', `Saison terminée : ${S.stats.matchs} matchs, ${S.stats.buts} buts, note ${nb(S.bilan.note)}. ${S.club.nom} ${pos}ᵉ.`);
  S.ecran = 'bilan'; sauver(); rendre();
}
function bilanGagne(note, pos){
  const t = [];
  if (S.stats.titus >= 15) t.push(`Tu as gagné ta place : ${S.stats.titus} titularisations, et plus personne ne discute.`);
  if (S.stats.buts >= 8) t.push(`${S.stats.buts} buts, ce qui ne s'était jamais vu pour toi.`);
  if (note >= 6.8) t.push(`Une moyenne que le staff a remarquée avant les journalistes.`);
  if (S.liens.vestiaire > 62) t.push(`Le vestiaire est avec toi, et ça se sent sur le terrain.`);
  if (pos <= 5) t.push(`Le club a fini dans le haut du tableau, ce que personne n'attendait en août.`);
  return t.length ? t : [`Une saison d'apprentissage. Tu es encore là, c'est déjà quelque chose.`];
}
function bilanPerdu(note){
  const t = [];
  if (S.stats.matchs < 12) t.push(`Une saison passée à regarder : ${S.stats.matchs} matchs seulement.`);
  if (S.etats.corps < 78) t.push(`Ton corps a payé. Tu le sentiras l'an prochain.`);
  if (S.liens.coach < 42) t.push(`Le coach ne compte plus vraiment sur toi.`);
  if (note < 6) t.push(`Trop de matchs où tu n'as pas existé.`);
  if (S.liens.supporters < 40) t.push(`Le stade ne connaît toujours pas ton nom.`);
  return t.length ? t : [`Rien de grave, cette fois.`];
}
function bilanSuite(pos, note){
  const t = [];
  t.push(note >= 6.6 ? `Ton agent dit que des clubs regardent.` : `Personne n'a appelé.`);
  if (S.etats.corps < 80) t.push(`Ton corps demande un été calme.`);
  if (S.liens.coach >= 58) t.push(`Le coach veut construire autour de toi.`);
  return t;
}
function classementTrie(){
  return Object.entries(S.ligue.classement).map(([nom, c]) => ({ nom, ...c, diff: c.bp - c.bc }))
    .sort((a, b) => b.pts - a.pts || b.diff - a.diff || b.bp - a.bp);
}

/* ---------- les mots, jamais les chiffres ---------- */
const BANDES = [
  [18, 0], [35, 1], [52, 2], [68, 3], [85, 4], [101, 5],
];
function bande(v){ for (const [seuil, i] of BANDES) if (v < seuil) return i; return 5; }
const MOTS = {
  coach: ["Il ne te regarde plus.", "Il ne compte pas sur toi.", "Il te fait entrer, il ne te lance pas.", "Il te fait confiance.", "Tu es un de ses cadres.", "Il construit autour de toi."],
  vestiaire: ["Le groupe t'ignore.", "On te tolère.", "Tu es un joueur du groupe.", "On te sert volontiers.", "Tu comptes ici.", "Le vestiaire te suit."],
  club: ["Le club veut te voir partir.", "Le club t'a oublié.", "Le club te paie, sans plus.", "Le club tient à toi.", "Le club te protège.", "Tu es leur joueur."],
  supporters: ["On te siffle.", "Personne ne te connaît.", "Ton nom circule un peu.", "Le stade t'apprécie.", "Le stade t'attend.", "Tu es leur chouchou."],
  agent: ["Il ne répond plus.", "Il est évasif.", "Il dit ce qu'il veut bien dire.", "Il répond vite.", "Il te dit tout ce qu'il sait.", "Il travaille pour toi jour et nuit."],
};
function dire(lien){ return MOTS[lien] ? MOTS[lien][bande(S.liens[lien])] : ''; }
function direFond(){ const v = S.etats.fond;
  return v > 55 ? "Tu tiens les quatre-vingt-dix minutes sans y penser." : v > 32 ? "Tu as du fond."
    : v > 14 ? "Tu tiens, sans plus." : "Tu manques de fond, et ça se paie en fin de match."; }
function direEncaisse(){ const v = S.moi.base.ment + S.moi.boost.ment;
  return v > 68 ? "Un mauvais soir ne te fait plus rien." : v > 54 ? "Tu encaisses bien ce qui ne va pas."
    : v > 42 ? "Un mauvais match te reste en travers." : "Le moindre coup dur te met par terre."; }
function direGeste(){ const v = S.moi.base.tech + S.moi.boost.tech;
  return v > 68 ? "Quand il faut faire le geste, il sort." : v > 54 ? "Le geste sort le plus souvent."
    : v > 42 ? "Le geste te trahit encore." : "Dans les moments qui comptent, tu rates le geste."; }
function direCorps(){ const v = S.etats.corps;
  return v > 85 ? "Rien ne te fait mal." : v > 72 ? "Quelques douleurs, rien de sérieux." : v > 58 ? "Tu récupères moins vite qu'avant." : "Ton corps commence à te lâcher."; }
function direJambes(){ const v = S.etats.fraicheur;
  return v > 88 ? "Tu sors du match sans une courbature." : v > 72 ? "Les jambes ont tenu."
    : v > 58 ? "Tu as fini sur les nerfs." : "Tes jambes ont pris cher."; }
function direFraicheur(){ const v = S.etats.fraicheur;
  return v > 88 ? "Frais" : v > 72 ? "En jambes" : v > 58 ? "Émoussé" : "Vidé"; }
function direStaff(){
  const l = AXES.map(a => ({ a, v: S.moi.base[a] })).sort((x, y) => y.v - x.v);
  const f = l[0], d = l[l.length - 1];
  return `« ${axeNom(f.a)} : c'est ce qui te fait jouer. ${axeNom(d.a)} : tu es en retard sur le groupe. »`;
}

/* ---------- journal, sauvegarde ---------- */
const nb = v => (Math.round(v * 100) / 100).toString().replace('.', ',');
function jrn(type, txt){ S.journal.push({ j: S.journee + 1, annee: S.annee, type, txt }); }
function sauver(){ if (SIM) return; try { localStorage.setItem('ac2', JSON.stringify(S)); } catch(e){} }
function charger(){
  try {
    const d = JSON.parse(localStorage.getItem('ac2') || 'null');
    if (!d) return null;
    if (d.v !== VERSION) return null;      // migration : à écrire quand la forme bougera
    return d;
  } catch(e){ return null; }
}
function effacer(){ try { localStorage.removeItem('ac2'); } catch(e){} S = null; }
