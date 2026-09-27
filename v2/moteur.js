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

const VERSION = 7;   // un effectif nommé et stable : `S.equipe` est neuf
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
/* Ce qu'une séance mentale répare quand la saison t'a entamé : beaucoup plus que
   ce qu'elle construit, parce que réparer n'est pas progresser. */
const REPARE_TETE = 2.6;
const AXE_NOM = { tech:"Technique", phys:"Physique", ment:"Mental", spec:"Au poste" };
/* « Au poste » est un nom de code : à l'écran, c'est Vision, Finition, Réflexes
   ou Placement, selon le poste. */
function axeNom(a){ return a === 'spec' && S && S.moi ? S.moi.specNom : AXE_NOM[a]; }

/* ---------- les trois lignes ----------
   Le propriétaire, 27/09/2026 : « il y a une petite réserve sur la relation avec
   chaque joueur individuellement. J'ai peur que ça fasse beaucoup et que ça ait
   peu d'impact… soit chaque ligne fait la moyenne de la relation du vestiaire,
   et du coup ça peut monter et descendre. » Sa réserve était juste : dix
   relations individuelles étaient dix nombres invisibles qui ne servaient qu'à
   déclencher un arrêt. La ligne est le bon grain — à une condition, qu'elle
   change **le football** et pas seulement une jauge. C'est `LIGNE_CLE` qui s'en
   charge, et le vestiaire n'est plus une jauge : c'est leur moyenne. */
/* Le groupe et le onze. Vingt-deux joueurs : quand deux défenseurs manquent, ce
   sont le cinquième et le sixième qui jouent — pas un trou dans l'équipe. */
const EFFECTIF = { G:3, D:7, M:7, A:5 };
const FORMATION = { G:1, D:4, M:4, A:2 };
const LIGNES = ['def', 'mil', 'att'];
const LIGNE_NOM = { def:"La défense", mil:"Le milieu", att:"L'attaque" };
const LIGNE_LA = { def:"la défense", mil:"le milieu", att:"l'attaque" };
const LIGNE_DU_POSTE = { G:'def', D:'def', M:'mil', A:'att' };
/* La ligne avec qui tu joues, celle dont l'entente te sert vraiment :
   le gardien et le défenseur encaissent avec la défense, le milieu passe
   décisif s'il trouve l'attaque, l'attaquant marque si le milieu le trouve. */
const LIGNE_CLE = { G:'def', D:'def', M:'att', A:'mil' };
const ENJEU_LIGNE = { G:"C'est avec eux que tu encaisses, ou pas.",
  D:"C'est avec eux que tu encaisses, ou pas.",
  M:"Plus tu les trouves, plus tu passes décisif.",
  A:"Plus ils te trouvent, plus tu marques." };
/* Chaque ligne a son vocabulaire : trois fois la même phrase, et le lecteur
   conclut que les lignes ne servent à rien. Une ligne parle de ce qu'elle fait. */
const MOTS_LIGNE = {
  def: ["Derrière, chacun joue pour soi.", "On se marche dessus.",
    "Ça tient un match sur deux.", "On se couvre.",
    "On défend à quatre, jamais à un.", "Personne ne passe entre nous."],
  mil: ["Au milieu, personne ne lève la tête.", "On joue les uns à côté des autres.",
    "Un ballon sur deux se trouve.", "On se trouve.",
    "Trois passes et on est de l'autre côté.", "On joue les yeux fermés."],
  att: ["Devant, on se gêne.", "On se cherche encore.",
    "Un centre sur deux arrive.", "On commence à se trouver.",
    "Un appel, un ballon.", "On sait où l'autre va avant lui."],
};
function vestiaire(){ return (S.lignes.def + S.lignes.mil + S.lignes.att) / 3; }
function bougerLigne(k, v){ if (v) S.lignes[k] = clamp(S.lignes[k] + v); }
function bougerVestiaire(v){ LIGNES.forEach(k => bougerLigne(k, v)); }
function direLigne(k){ return MOTS_LIGNE[k][bande(S.lignes[k])]; }
function ligneFaible(){
  const k = LIGNES.slice().sort((a, b) => S.lignes[a] - S.lignes[b])[0];
  return S.lignes[k] < 44 ? k : null;
}
/* Le visage d'une ligne : le plus ancien. Déterministe, pour que ce soit
   toujours le même tant que la ligne va mal — une histoire, pas un tirage. */
function visageDe(k){
  const l = S.equipe.filter(j => LIGNE_DU_POSTE[j.poste] === k);
  return l.length ? l.slice().sort((a, b) => b.age - a.age)[0] : null;
}

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
  /* Le mental est le seul axe qui **se dépense** : chaque coup dur en retire, et
     seule la séance mentale le répare. Il lui faut donc de la place pour
     descendre — douze points sous le socle des autres. Le preset tient quand
     même : un joueur parti de 60 ne tombera jamais où tombe un joueur parti de 40. */
  socle.ment -= 12;
  const pic = { ...base };   // le plus haut atteint par chaque axe ; on y revient vite
  const liens = { coach:50, club:50, supporters:45, agent:50, selection:0 };
  const lignes = { def:50, mil:50, att:50 };
  Object.entries(c.origine.liens || {}).forEach(([k, v]) => {
    // « vestiaire » d'une origine touche les trois lignes : il en est la moyenne
    if (k === 'vestiaire') LIGNES.forEach(l => lignes[l] = clamp(lignes[l] + v));
    else liens[k] = clamp(liens[k] + v);
  });

  /* Les concurrents au poste. Le propriétaire, 27/09/2026 : « plus on est fort au
     poste, plus on a de chances d'être titulaire par rapport à ses concurrents,
     aux autres joueurs du même poste. C'est une stat que le coach peut prendre en
     compte. » Avant, on se comparait à un nombre abstrait tiré de la force du club ;
     maintenant ce sont des gens, avec un nom, un niveau et une forme qui bouge. */
  const ligue = creerLigue(c.annee);
  const club = ligue.equipes[ri(10, 17)];   // on démarre dans le bas de tableau
  const nb = poste.id === 'G' ? 1 : 2;      // un gardien n'a qu'un rival, c'est binaire
  const pris = [];
  const tirerNom = () => { let n; do { n = pick(NOMS); } while (pris.includes(n)); pris.push(n); return n; };
  const concurrents = [];
  for (let i = 0; i < nb; i++)
    // le titulaire en place est devant toi ; le second est à ta portée
    concurrents.push({ nom:tirerNom(), niv: Math.round(club.force + (i === 0 ? rnd(2, 7) : rnd(-4, 2))),
      forme: 0, blesse: 0, age: ri(23, 31) });
  /* L'EFFECTIF. Des coéquipiers **stables et nommés** : sans eux, « un coéquipier
     progresse », « ça se tend avec ton attaquant » ou « les notes du match »
     n'ont personne de qui parler. Chacun garde son poste, son niveau, son âge et
     une progression sur la saison — mais **plus de relation individuelle** :
     l'entente se joue par ligne, et son visage est un nom. */
  /* VINGT-DEUX JOUEURS, pas onze (le propriétaire, 27/09/2026 : « il me faut au
     moins 18 joueurs voire 22, parce que là s'il y a des blessures, des
     suspensions, il y a des trous dans l'équipe »). `EFFECTIF` est le groupe,
     `FORMATION` est le onze. Ta place et celles de tes rivaux sont déjà comptées
     dans `EFFECTIF` : elles sortent du nombre de coéquipiers à tirer. */
  const equipe = [];
  Object.entries(EFFECTIF).forEach(([po, n]) => {
    const combien = po === poste.id ? n - 1 - nb : n;
    for (let i = 0; i < combien; i++)
      equipe.push({ nom:tirerNom(), poste:po, niv: Math.round(club.force + rnd(-7, 6)),
        age: ri(18, 34), forme: 0, blesse: 0, susp: 0, prog: 0, note: null });
  });
  // un jeune qui monte : c'est de lui que parleront les arrêts « il progresse »
  const jeune = equipe.filter(j => j.age <= 23).sort((a, b) => a.age - b.age)[0];
  if (jeune) jeune.monte = true;

  S = {
    v: VERSION, mode: 'joueur', annee: c.annee,
    moi: { nom: c.nom, poste: poste.id, posteNom: poste.nom, specNom: poste.spec,
      age: 18, base, boost: { tech:0, phys:0, ment:0, spec:0 }, plafond, socle,
      u0: c.origine.u0, origine: c.origine.id, ambition: c.ambition.id, pic,
      qual: { id:q.id, vu:false }, def: { id:f.id, vu:false },
      histo: {} },
    club: { nom: club.nom, force: club.force }, concurrents, equipe,
    ligue, liens, lignes,
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
  return { equipes, N, classement: Object.fromEntries(equipes.map(e => [e.nom, { pts:0, j:0, v:0, n:0, d:0, bp:0, bc:0 }])) };
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
  if (S.moi.pic) S.moi.pic[a] = Math.max(S.moi.pic[a], S.moi.base[a]);
}
/* Ce que le mental porte : encaisser. Renvoie −1 (on prend tout de plein fouet)
   à +1 (rien ne t'atteint vraiment). Amortit les mauvaises notes, les liens qui
   se dégradent et le coût des décisions hors football — jamais les gains. */
function encaisse(){
  return clamp(((S.moi.base.ment + S.moi.boost.ment) - 50) / 45, -1, 1);
}
/* LE MENTAL SE DÉPENSE. Chaque mauvais choix, chaque mauvaise nouvelle en retire,
   et **plus il est haut, moins il en retire** : c'est lui qui amortit sa propre
   usure. Seule la séance mentale le répare. C'est la définition donnée par le
   propriétaire le 27/09/2026 : « le mental doit encaisser tous les mauvais choix.
   Je tire au lieu de faire la passe, ça me retire un point. Une mauvaise nouvelle
   hors foot, je perds un point. Si je veux les regagner, il faut que je
   m'entraîne. Plus le mental est fort, moins les événements ont d'effet. » */
function coutMental(pts, raison){
  const amorti = clamp(encaisse(), -.5, .8);
  const avant = S.moi.base.ment;
  bougerAxe('ment', -pts * (1 - amorti));
  const reel = avant - S.moi.base.ment;
  if (reel > .2 && raison){ S.coupsTete = S.coupsTete || []; S.coupsTete.push(raison); }
  return reel;
}
/* Le niveau lit le mental par son **pic** — ce que tu vaux quand tu vas bien —
   et non par la réserve du moment. Sinon chaque coup dur te ferait perdre ta
   place, et une spirale s'installait : mesuré, 6 à 13 matchs par saison au lieu
   de 15 à 18, et « toujours le mental » redevenait la seule politique tenable.
   Le retirer complètement du niveau était pire encore : il compensait l'axe
   faible de certaines origines, et un défenseur du quartier tombait à 4 matchs
   et 3,4 de moyenne. Le pic garde les quatre poids du poste intacts, donc tout
   le calibrage antérieur aussi. La réserve du moment, elle, agit là où le
   mental doit agir : la pression, l'amorti des coups, la lucidité. */
function niveau(){
  const p = POSTES.find(x => x.id === S.moi.poste);
  let n = 0;
  AXES.forEach(a => n += p.w[a] * ((a === 'ment' ? S.moi.pic.ment : S.moi.base[a]) + S.moi.boost[a]));
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
    axe:'tech', fit:-8, rende:1, dit:[{c:'risk',t:"🫁 samedi : jambes lourdes"},{c:'foot',t:"⚡ la technique, sur les faits de match"},{c:'vie',t:"🏡 tu rentres tard"}] },
  { id:'phys', ico:'💪', nom:"La salle et les sprints", sub:"Le préparateur t'a fait un programme. Il est violent.",
    axe:'phys', fit:-11, fond:3.5, rende:1.15, dit:[{c:'risk',t:"🫁 samedi : fatigué"},{c:'foot',t:"💪 ton corps : tu tiens et tu récupères"}] },
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
    /* Retrouver la tête qu'on avait est rapide ; devenir plus solide qu'on ne
       l'a jamais été reste lent. `pic` retient le plus haut atteint. */
    const manque = S.moi.pic[a] - S.moi.base[a];
    if (a === 'ment' && manque > .5){
      bougerAxe(a, Math.min(REPARE_TETE * tirage, manque));
      S.seanceRepare = true;
    } else bougerAxe(a, TRACE_SEANCE * r);
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
    if (S.seanceRepare){ S.seance.repare = true; S.seanceRepare = false;
      S.seance.texte = `Tu as remis de l'ordre dans ta tête. Ce que la saison t'avait pris, tu en reprends une partie.`; }
    else if (S.seance.plafond) S.seance.texte += ` À ce niveau-là tu ne progresses plus vraiment, mais c'est prêt pour samedi.`;
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
  { id:'ancien', quand: () => S.journee >= 5 && vestiaire() < 52,
    titre:"Le plus ancien du vestiaire te prend à part",
    texte:"« On mange tous ensemble jeudi. Tu viens, ou tu rentres encore chez toi ? »",
    options:[
      { l:"Venir, et rester tard", liens:{ vestiaire:9 }, fit:-4, dit:[{c:'foot',t:"✊ le groupe t'adopte"},{c:'risk',t:"🫁 la nuit sera courte"}] },
      { l:"Passer une heure", liens:{ vestiaire:4 }, dit:[{c:'neutre',t:"↔️ correct, sans plus"}] },
      { l:"Décliner", liens:{ vestiaire:-5 }, dit:[{c:'risk',t:"✊ on l'a remarqué"},{c:'vie',t:"🏡 une soirée chez toi"}] },
    ] },
  /* Les gens autour de toi. Le propriétaire, 27/09/2026 : « pas assez d'éléments
     liés au vestiaire ou au coach ; l'événement du kiné apparaît un peu tout le
     temps. Mon concurrent au poste fait une meilleure séance que moi, est-ce que
     je m'entraîne plus ? Un coéquipier qui s'améliore, est-ce que je passe du
     temps avec lui ? Une situation qui se dégrade avec mon milieu ou mon
     attaquant, comment je réagis ? » Chaque famille vise quelqu'un de nommé. */
  { id:'rival', quand: () => S.journee >= 3 && devantToi(),
    ligne: () => LIGNE_DU_POSTE[S.moi.poste],
    sujet: () => devantToi(),
    titre: q => `${q.nom} a fait une séance énorme`,
    texte: q => `L'adjoint n'a regardé que lui pendant une heure. Le coach a souri deux fois. Toi, tu as fini ton travail dans ton coin.`,
    options:[
      { l:"Rester une heure de plus, seul", fit:-7, axes:{ spec:1.2 }, dit:[{c:'foot',t:"🎽 ta place : tu grattes"},{c:'risk',t:"🫁 samedi dans les jambes"}] },
      { l:"Aller le voir et lui demander comment il fait", ligne:6, axes:{ spec:.5 }, dit:[{c:'foot',t:"✊ ta ligne apprécie"},{c:'neutre',t:"🎯 tu apprends un peu"}] },
      { l:"Laisser couler, ton tour viendra", ment:-1.4, coup:"cette séance où il t'a dépassé", dit:[{c:'risk',t:"🧠 ça te reste en travers"},{c:'foot',t:"🫁 tu es frais samedi"}] },
    ] },
  { id:'jeune', quand: () => S.journee >= 6 && S.equipe.some(j => j.monte),
    ligne: () => { const j = S.equipe.find(x => x.monte); return j ? LIGNE_DU_POSTE[j.poste] : 'mil'; },
    sujet: () => S.equipe.find(j => j.monte),
    titre: q => `${q.nom} progresse vite`,
    texte: q => `Le gamin est arrivé il y a six mois et il a déjà pris dix ans. Il traîne après la séance, il pose des questions. Souvent à toi.`,
    options:[
      { l:"Passer du temps avec lui", fit:-4, ligne:9, dit:[{c:'foot',t:"✊ sa ligne te voit autrement"},{c:'risk',t:"🫁 une heure de plus"}] },
      { l:"Répondre quand il demande, sans plus", ligne:3, dit:[{c:'neutre',t:"↔️ correct"}] },
      { l:"Le laisser se débrouiller", ligne:-5, dit:[{c:'risk',t:"✊ sa ligne l'a remarqué"},{c:'vie',t:"🏡 tu rentres à l'heure"}] },
    ] },
  { id:'tension', quand: () => S.journee >= 5 && !!ligneFaible() && !!visageDe(ligneFaible()),
    ligne: () => ligneFaible(),
    sujet: (l) => visageDe(l),
    titre: (q, l) => `Ça se tend avec ${LIGNE_LA[l]}`,
    texte: (q, l) => `Deux ballons mal donnés, un regard de trop, et ${q.nom} ne te parle plus à l'échauffement. Toute la ligne s'est rangée derrière lui.`,
    options:[
      { l:"Mettre les choses à plat, tout de suite", ligne:13, fit:-3, dit:[{c:'foot',t:"✊ la ligne respire"},{c:'risk',t:"🫁 une soirée de plus"}] },
      { l:"Attendre que ça passe", ligne:2, dit:[{c:'risk',t:"✊ ça pourrit doucement"}] },
      { l:"Lui répondre devant tout le monde", ligne:-11, liens:{ coach:-3 }, ment:-1.2,
        coup:"cette engueulade devant tout le monde", dit:[{c:'risk',t:"✊ la ligne se fige"},{c:'risk',t:"🧠 tu rumines"}] },
    ] },
  { id:'agent', quand: () => S.journee >= 7 && (S.stats.matchs >= 5 || S.liens.coach < 45),
    titre:"Ton agent t'appelle",
    texte:"« Je regarde ta situation. Je peux commencer à bouger, ou on laisse la saison se faire et on voit en juin. Dis-moi. »",
    options:[
      { l:"Qu'il bouge dès maintenant", liens:{ agent:10, club:-5 }, dit:[{c:'foot',t:"🤝 il se met au travail"},{c:'risk',t:"🏟️ le club l'apprendra"}] },
      { l:"Attendre juin", liens:{ agent:2 }, dit:[{c:'neutre',t:"🤝 il note"}] },
      { l:"Lui dire que tu te sens bien ici", liens:{ club:7, agent:-4 }, dit:[{c:'foot',t:"🏟️ le club apprécie"},{c:'risk',t:"🤝 ton agent soupire"}] },
    ] },
  { id:'coachPlan', quand: () => S.journee >= 4,
    titre:"Le coach te montre une vidéo",
    texte:"« Regarde. Là, tu es en retard d'une demi-seconde. Je ne te demande pas d'être plus fort, je te demande d'être là avant. »",
    options:[
      { l:"Travailler ça toute la semaine", fit:-6, axes:{ spec:1 }, liens:{ coach:5 }, dit:[{c:'foot',t:"🎽 il te suit"},{c:'foot',t:"🎯 juste à ton poste"}] },
      { l:"Dire que tu n'es pas d'accord", liens:{ coach:-5 }, axes:{ ment:1 }, dit:[{c:'risk',t:"🎽 il n'aime pas"},{c:'foot',t:"🧠 tu tiens ta position"}] },
      { l:"Acquiescer et passer à autre chose", liens:{ coach:-1 }, dit:[{c:'neutre',t:"↔️ rien ne change"}] },
    ] },
  { id:'capitaine', quand: () => S.journee >= 8 && vestiaire() >= 55,
    sujet: () => pick(S.equipe.filter(j => j.age >= 28)) || S.equipe[0],
    titre: q => `${q.nom} te demande quelque chose`,
    texte: q => `« On perd trop de matchs bêtement. J'organise une réunion entre nous, sans le staff. Tu viens, et tu parles ? »`,
    options:[
      { l:"Venir et prendre la parole", liens:{ vestiaire:9, coach:-2 }, axes:{ ment:1.5 }, dit:[{c:'foot',t:"✊ tu comptes ici"},{c:'risk',t:"🎽 le staff n'aime pas les réunions sans lui"}] },
      { l:"Venir et écouter", liens:{ vestiaire:4 }, dit:[{c:'neutre',t:"✊ présent, c'est déjà ça"}] },
      { l:"Ne pas y aller", liens:{ vestiaire:-6, coach:3 }, dit:[{c:'risk',t:"✊ ils t'ont attendu"},{c:'foot',t:"🎽 le coach le saura"}] },
    ] },
  { id:'serie', quand: () => S.stats.notes.length >= 4 && moyenneNotes() < 5.9,
    titre:"Le coach ferme la porte du bureau",
    texte:"« Quatre matchs que je ne te reconnais pas. Je te laisse encore un peu, mais tu as compris. »",
    options:[
      { l:"Demander à travailler avec lui", liens:{ coach:6 }, fit:-5, axes:{ spec:.8 }, dit:[{c:'foot',t:"🎽 il te donne du temps"},{c:'risk',t:"🫁 des séances en plus"}] },
      { l:"Dire que tu vas le régler seul", liens:{ coach:1 }, axes:{ ment:1.2 }, dit:[{c:'foot',t:"🧠 tu te reprends en main"}] },
      { l:"Expliquer que le problème vient de l'équipe", liens:{ coach:-7, vestiaire:-5 }, ment:-1,
        coup:"cette phrase que tu n'aurais pas dû dire", dit:[{c:'risk',t:"🎽 très mauvaise idée"},{c:'risk',t:"✊ ça a fuité"}] },
    ] },
  { id:'famille', quand: () => S.journee >= 9,
    titre:"Un coup de fil de chez toi",
    texte:"« Ton père a fait un malaise. Rien de grave, il est rentré. Mais il a demandé si tu venais dimanche. »",
    options:[
      { l:"Y aller dimanche, quoi qu'il arrive", fit:-3, ment:-.4, dit:[{c:'vie',t:"🏡 tu seras là"},{c:'risk',t:"🫁 la route fatigue"}] },
      { l:"Appeler tous les soirs de la semaine", ment:-.8, coup:"ce coup de fil", dit:[{c:'vie',t:"🏡 tu gardes le lien"},{c:'risk',t:"🧠 tu n'es pas à l'entraînement"}] },
      { l:"Attendre la trêve", ment:-2, coup:"ce dimanche où tu n'es pas allé", dit:[{c:'risk',t:"🧠 ça te pèse"},{c:'foot',t:"🫁 ta semaine est intacte"}] },
    ] },
  { id:'supporters', quand: () => S.journee >= 6 && S.liens.supporters < 45,
    titre:"Quelqu'un t'attend à la sortie du parking",
    texte:"« Je te suis depuis le début. Là, franchement, tu nous fais quoi ? » Il n'est pas agressif. C'est presque pire.",
    options:[
      { l:"Prendre le temps de lui répondre", liens:{ supporters:8 }, dit:[{c:'foot',t:"📣 ça se raconte en tribune"}] },
      { l:"Signer et partir", liens:{ supporters:1 }, dit:[{c:'neutre',t:"↔️ poli"}] },
      { l:"Passer sans s'arrêter", liens:{ supporters:-6 }, ment:-.8, coup:"ce type sur le parking", dit:[{c:'risk',t:"📣 il le racontera aussi"}] },
    ] },
  { id:'corps', quand: () => S.etats.fraicheur < 70,
    titre:"Le kiné veut te voir avant l'entraînement",
    texte:"« Tu tires sur la corde. Je peux te sortir de la séance de jeudi, mais c'est le coach qui décidera ce qu'il en pense. »",
    options:[
      { l:"Accepter de lever le pied", fit:10, liens:{ coach:-3 }, dit:[{c:'foot',t:"🫁 samedi : frais"},{c:'risk',t:"🎽 le coach le note"}] },
      { l:"Serrer les dents", fit:-4, corps:-3, liens:{ coach:3 }, dit:[{c:'foot',t:"🎽 il apprécie"},{c:'risk',t:"🩼 ton corps encaisse"}] },
    ] },
];
/* « L'événement du kiné apparaît un peu tout le temps. » Il n'y avait pas de
   mémoire : `pick()` sur les familles applicables, et celle qui l'est toujours
   sortait sans cesse. Deux garde-fous : les trois derniers genres sont écartés,
   et le tirage est pondéré par le nombre de passages de la saison. */
function ouvrirArrets(){
  let dispo = ARRETS.filter(a => { try { return a.quand(); } catch(e){ return false; } });
  const recents = S.recentArrets || [];
  const frais = dispo.filter(a => !recents.includes(a.id));
  if (frais.length) dispo = frais;
  if (!dispo.length || S.arrets >= 2 || Math.random() < .42) return lancerMatch();
  S.vuArrets = S.vuArrets || {};
  const poids = dispo.map(a => 1 / Math.pow(1 + (S.vuArrets[a.id] || 0), 1.8));
  let t = poids.reduce((x, y) => x + y, 0) * Math.random(), k = 0;
  while (k < dispo.length - 1 && (t -= poids[k]) > 0) k++;
  const a = dispo[k];
  S.vuArrets[a.id] = (S.vuArrets[a.id] || 0) + 1;
  S.recentArrets = [a.id, ...recents].slice(0, 3);
  // certaines familles parlent de quelqu'un : on fige qui, et les textes le nomment
  // la ligne dont parle l'arrêt : c'est elle que ses options font monter ou tomber
  const l = a.ligne ? (typeof a.ligne === 'function' ? a.ligne() : a.ligne) : null;
  const q = a.sujet ? a.sujet(l) : null;
  S.arret = { id:a.id, options:a.options, sujet: q ? q.nom : null, ligne: l,
    titre: typeof a.titre === 'function' ? a.titre(q, l) : a.titre,
    texte: typeof a.texte === 'function' ? a.texte(q, l) : a.texte };
  S.arrets++; S.ecran = 'arret'; sauver(); rendre();
}
function choisirArret(i){
  const a = S.arret, o = a.options[i]; if (!o) return;
  appliquer(o);
  jrn('arret', `${a.titre} → ${o.l}`);
  S.arret = null; lancerMatch();
}
function appliquer(o){
  if (o.ment) coutMental(-o.ment, o.coup || "cette histoire");
  const enc = encaisse();
  const amorti = v => v < 0 ? v * (1 - enc * .4) : v;
  // `ligne` vise la ligne dont parle l'arrêt ; `liens.vestiaire` vise les trois
  if (o.ligne && S.arret && S.arret.ligne) bougerLigne(S.arret.ligne, amorti(o.ligne));
  Object.entries(o.liens || {}).forEach(([k, v]) => {
    if (k === 'vestiaire') bougerVestiaire(amorti(v));
    else S.liens[k] = clamp(S.liens[k] + amorti(v));
  });
  Object.entries(o.axes || {}).forEach(([k, v]) => {
    if (k === 'ment' && v < 0) coutMental(-v, o.coup || "cette histoire t'est restée");
    else bougerAxe(k, v);
  });
  if (o.fit) S.etats.fraicheur = clamp(S.etats.fraicheur + o.fit);
  if (o.corps) S.etats.corps = clamp(S.etats.corps + o.corps);
}

/* ---------- le match ---------- */
/* Ta valeur aux yeux du coach quand il fait son onze. `spec` compte une deuxième
   fois : être juste à son poste, c'est exactement ce qu'il regarde. */
function valeurAuPoste(){
  return niveauJour() + (S.moi.base.spec + S.moi.boost.spec - 50) * .09
    + (S.liens.coach - 50) * .16
    + (S.moi.age <= 18 ? -5 : S.moi.age === 19 ? -2.5 : 0);
}
function concurrentsDispos(){ return S.concurrents.filter(c => c.blesse <= 0); }
/* Celui qui te barre la route aujourd'hui, ou null si la voie est libre. */
function devantToi(){
  const d = concurrentsDispos(); if (!d.length) return null;
  const moi = valeurAuPoste();
  let best = null;
  d.forEach(c => { const v = c.niv + c.forme; if (v > moi && (!best || v > best.niv + best.forme)) best = c; });
  return best;
}
function monStatut(adv){
  if (S.etats.blessure > 0) return 'blesse';
  if (S.etats.suspension > 0) return 'suspendu';
  const d = concurrentsDispos();
  const moi = valeurAuPoste() + rnd(-2, 2);
  const meilleur = d.reduce((a, c) => Math.max(a, c.niv + c.forme), -99);
  if (!d.length || moi > meilleur) return 'titulaire';    // plus personne devant : tu joues
  const ecart = meilleur - moi;
  if (ecart < 2.5) return Math.random() < .45 ? 'titulaire' : 'banc';   // ça se joue à rien
  if (ecart < 8) return Math.random() < .75 ? 'banc' : 'hors';
  return 'hors';
}
/* Les rivaux vivent : leur forme bouge, ils se blessent, et une absence t'ouvre
   la porte. C'est aussi une des façons de devenir titulaire. */
function vivreConcurrents(){
  S.concurrents.forEach(c => {
    if (c.blesse > 0){ c.blesse--; return; }
    c.forme = clamp(c.forme * .7 + rnd(-2.2, 2.2), -5, 5);
    if (Math.random() < .035) c.blesse = ri(1, 4);
  });
}
/* Et tes coéquipiers aussi : sans ça, un effectif de vingt-deux serait vingt-deux
   noms et onze titulaires immuables. Une blessure ou une suspension fait entrer
   le suivant, et c'est là que la profondeur se paie ou rapporte. */
function vivreEquipe(){
  S.equipe.forEach(j => {
    if (j.blesse > 0) j.blesse--;
    if (j.susp > 0) j.susp--;
    j.forme = clamp((j.forme || 0) * .75 + rnd(-2, 2), -5, 5);
    if (j.blesse <= 0 && Math.random() < .028) j.blesse = ri(1, 5);
    else if (j.susp <= 0 && Math.random() < .013) j.susp = ri(1, 2);
  });
}
function dispoDe(j){ return !(j.blesse > 0 || j.susp > 0); }
/* Tous ceux qui peuvent jouer, toi excepté : coéquipiers et rivaux à ton poste. */
function groupe(){
  const l = S.equipe.map(j => ({ ref:j, nom:j.nom, poste:j.poste,
    niv: j.niv + (j.forme || 0), dispo: dispoDe(j) }));
  S.concurrents.forEach(c => l.push({ ref:c, nom:c.nom, poste:S.moi.poste,
    niv: c.niv + c.forme, dispo: c.blesse <= 0, rival:true }));
  return l;
}
/* Le coach tourne. Sans ce tirage, le onze se choisissait strictement au niveau
   et un tiers du groupe finissait la saison à zéro match — un effectif de
   vingt-deux dont onze décoratifs, c'est-à-dire le problème d'avant déguisé.
   Le même tirage sert au onze réel et au onze idéal, pour que l'écart ne mesure
   que l'infirmerie et jamais la rotation. */
const ROTATION = 3.5;
/* LE ONZE DU JOUR, et ce que l'infirmerie coûte. On compare le onze réellement
   alignable au meilleur onze possible si tout le monde était valide : l'écart,
   étalé sur onze joueurs, est ce que le match perd. Un groupe profond l'absorbe,
   un groupe court le prend en pleine figure. */
function onzeDuJour(statut){
  const g = groupe();
  const onze = [], absents = g.filter(x => !x.dispo);
  let perte = 0;
  g.forEach(x => x.choix = x.niv + rnd(-ROTATION, ROTATION));
  const tri = l => l.slice().sort((a, b) => b.choix - a.choix);
  Object.entries(FORMATION).forEach(([po, n]) => {
    let besoin = n;
    if (po === S.moi.poste && statut === 'titulaire') besoin--;   // ta place est prise
    if (besoin <= 0) return;
    const cands = g.filter(x => x.poste === po);
    const pris = tri(cands.filter(x => x.dispo)).slice(0, besoin);
    const ideal = tri(cands).slice(0, besoin);
    onze.push(...pris);
    /* Chacun contre celui qu'il remplace, rang par rang : le cinquième défenseur
       se compare au quatrième, pas à zéro. Comparer les sommes brutes faisait
       compter un absent pour tout son niveau — mesuré, le onze perdait jusqu'à
       onze points de force pour trois blessés. */
    for (let i = 0; i < pris.length; i++) perte += pris[i].niv - ideal[i].niv;
    // pas assez d'hommes à ce poste : on dépanne à dix, et ça se voit
    if (pris.length < besoin) perte -= (besoin - pris.length) * 7;
  });
  return { onze, absents, ecart: perte / 11 };
}
function lancerMatch(){
  const adv = adversaire(S.journee);
  const statut = monStatut(adv);
  const equipeDuJour = onzeDuJour(statut);
  const nous = S.club.force + equipeDuJour.ecart + (vestiaire() - 50) * .04
    + (statut === 'titulaire' ? (niveauJour() - S.club.force) * .12 : 0);
  const eux = adv.force;
  const diff = nous - eux + (adv.dom ? 2.4 : -2.4);
  /* L'ENTENTE DE TA LIGNE CHANGE TON FOOTBALL, pas seulement une jauge — c'est la
     condition que posait le propriétaire, et sans elle la ligne ne serait qu'un
     nombre de plus. Derrière (gardien, défenseur) : on encaisse moins quand on se
     trouve. Milieu : plus il trouve l'attaque, plus il passe décisif. Attaquant :
     plus le milieu le trouve, plus il marque. Trois postes, trois effets. */
  const ent = S.lignes[LIGNE_CLE[S.moi.poste]] - 50;
  const monDerriere = S.moi.poste === 'G' || S.moi.poste === 'D';
  const aide = monDerriere && statut === 'titulaire' ? ent * .08 : 0;
  const bn = poisson(tameXG(1.35 * Math.exp(diff / 19)));
  const be = poisson(tameXG(1.35 * Math.exp(-(diff + aide) / 19)));

  const m = { adv, statut, bn, be, faits: [], minutes: 0, buts:0, passes:0, note:null, moments:[], jaune:0, blessure:0,
    onze: equipeDuJour.onze, absents: equipeDuJour.absents.map(x => ({ nom:x.nom, poste:x.poste,
      raison: (x.ref.susp > 0 ? 'susp' : 'blesse') })), ecartOnze: equipeDuJour.ecart };
  // entrée en jeu
  if (statut === 'titulaire') m.minutes = 90;
  else if (statut === 'banc'){
    /* On ne remplace pas un gardien en cours de match : soit il commence, soit
       il regarde. La seule exception est la vraie — le titulaire sort blessé. */
    if (S.moi.poste === 'G') m.minutes = Math.random() < .05 ? ri(25, 70) : 0;
    else m.minutes = Math.random() < .6 ? ri(12, 35) : 0;
  }
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
  const chance = { G:0, D:.07, M:.20, A:.38 }[S.moi.poste]
    * (S.moi.poste === 'A' ? 1 + ent * .012 : 1);
  const chancePasse = { G:0, D:.10, M:.24, A:.18 }[S.moi.poste]
    * (S.moi.poste === 'M' ? 1 + ent * .012 : 1);
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
    /* Un « mauvais soir » doit être une situation nommée, pas un aléa invisible.
       Un fait de match qui tombe quand vous êtes menés, ou dans une fin serrée,
       est plus dur — et c'est là, et seulement là, que le mental se voit. */
    m.moments.forEach(f => {
      let n = 0, e = 0;
      evs.filter(x => x.type === 'but' && x.min < f.min).forEach(x => x.nous ? n++ : e++);
      /* Être mené à la vingtième minute n'est pas encore la pression : sans ce
         seuil, sept faits sur dix étaient « chauds » et le mot ne voulait plus
         rien dire. */
      const mene = e > n && f.min >= 55, tard = f.min >= 75;
      f.chaud = mene || (tard && Math.abs(n - e) <= 1);
      f.ctx = mene && tard ? "Vous êtes menés et il ne reste presque plus rien."
        : mene ? "Vous êtes menés, le stade s'impatiente."
        : tard ? "Fin de match, tout se joue là." : null;
    });
  }
  m.evs = evs; m.entree = entree;
  S.match = m; S.momentIdx = 0;
  suiteMatch();
}
/* Il en faut au moins vingt-deux distincts : un effectif complet en tire vingt et un
   (toi excepté), et deux joueurs du même nom dans le même vestiaire se voient. */
const NOMS = ["Diallo", "Lefort", "Perrin", "Traoré", "Semis", "Bakayoko", "Mendy", "Delecroix",
  "Riou", "Garnier", "Kouassi", "Vasseur", "Bamba", "Lemoine", "Ferreira", "Dos Santos",
  "Hernandez", "Bouaziz", "Le Guen", "Konaté", "Marchand", "Silva", "Tavares", "Nguyen",
  "Sarr", "Boucher", "Lavigne", "Cissé", "Roussel", "Aubert", "Pereira", "Keita",
  "Fontaine", "Moreau", "Barbosa", "Zidani", "Chevalier", "Ndiaye", "Rossi", "Guillon"];
function coequipier(){ return pick(NOMS); }
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
  /* PRESSION : un moment chaud coûte douze points de réussite, et le mental les
     rend — ou les aggrave quand il est bas. C'est le seul endroit où il agit sur
     le terrain, et l'écran le dit avant le clic. */
  const pression = f.chaud ? .12 * (1 - clamp(encaisse(), -.6, 1)) : 0;
  const bonus = (f.axe === 'tech' ? (techV - 50) * .009
      : (axeV - 50) * .006 + (techV - 50) * .005)
    + (S.etats.fraicheur - 80) * .001 - pression;
  const reussi = Math.random() < clamp(o.p + bonus, .05, .95);
  f.choix = o.l; f.reussi = reussi;
  /* Et quand ça casse dans un moment chaud, on sort du match. Ça porte un nom,
     ça s'écrit dans le film, et ça coûte. Le mental décide si ça arrive. */
  if (!reussi && f.chaud && !m.perduLeFil && Math.random() < .5 - encaisse() * .42){
    m.perduLeFil = f.min;
    jrn('moment', `${f.min}ᵉ — Tu as perdu le fil. Vingt minutes à côté de la partie.`);
    coutMental(2, "tu es sorti du match après cette action");
  }
  if (reussi && f.chaud) f.tenu = true;
  /* « Je tire au lieu de faire la passe, ça me retire un point de mental. »
     Le mauvais choix se paie tout de suite, et plus lourdement quand ça comptait. */
  if (!reussi) coutMental(f.chaud ? 1.8 : 1.1, `« ${o.l} », à la ${f.min}ᵉ`);
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
  const g0 = { ...S.liens }, e0 = { ...S.etats }, l0 = { ...S.lignes };
  m.semaine = S.semaine; m.seance = S.seance;
  if (m.minutes){
    const derriere = S.moi.poste === 'G' || S.moi.poste === 'D';
    m.note = clamp(6.1 + (res === 'V' ? .5 : res === 'D' ? -.4 : 0) + m.buts * .7 + m.passes * .4
      + (derriere ? (m.be === 0 ? 1 : m.be === 1 ? .35 : m.be >= 4 ? -.5 : 0) : 0)
      /* Un fait de match pèse **un point de note**, pas trois dixièmes (demande du
         propriétaire, 27/09/2026 : « on fait quasiment que des matchs corrects, il
         n'y a pas de très bons ni de très mauvais matchs ; on peut appuyer un peu
         plus sur l'impact des faits de match sur la note, avec un point en plus ou
         en moins »). C'est ce qui fait qu'une saison a des soirs de gala et des
         soirs qu'on veut oublier. */
      + (niveauJour() - S.club.force) * .035 + m.moments.filter(f => f.reussi).length * .95
      - m.moments.filter(f => f.reussi === false).length * .95
      - (m.perduLeFil ? .7 : 0) + (m.moments.some(f => f.tenu) ? .35 : 0) + aleaNote(), 3, 10);
    m.note = Math.round(m.note * 10) / 10;
    S.stats.matchs++; S.stats.minutes += m.minutes; S.stats.buts += m.buts; S.stats.passes += m.passes;
    S.stats.notes.push(m.note); if (m.statut === 'titulaire') S.stats.titus++;
    S.etats.fraicheur = clamp(S.etats.fraicheur - (m.minutes / 90) * ri(10, 16) * (1 - S.etats.fond * .0022));
    S.etats.corps = clamp(S.etats.corps - (m.minutes / 90) * .4);
    let dCoach = clamp((m.note - 6.2) * 2.4, -4, 4);
    if (dCoach < 0){
      const amorti = encaisse() * .5;
      if (amorti > .15) m.amortiCoach = true;              // à dire, sinon ça n'existe pas
      dCoach *= (1 - amorti);
    }
    S.liens.coach = clamp(S.liens.coach + dCoach);
    // ta ligne te juge sur ta note : c'est avec eux que tu viens de jouer
    bougerLigne(LIGNE_DU_POSTE[S.moi.poste], m.note >= 7 ? 1.4 : m.note < 5.5 ? -1.2 : 0);
    S.liens.supporters = clamp(S.liens.supporters + (m.buts ? 2 : 0) + (m.note >= 7.5 ? 1 : 0) - (m.note < 5.4 ? 1 : 0));
    S.etats.forme = clamp(S.etats.forme + (m.note >= 7 ? 5 : m.note >= 6 ? 1 : -4));
    if (m.note < 5.6) coutMental(1.7, "un match que tu voudrais oublier");
    if (m.rouge) coutMental(2.2, "ce carton rouge");
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
  /* Rester sur le banc ne retire PAS de mental : ça fermait la spirale sur
     elle-même. Le banc coûte déjà la confiance du coach, ça suffit. */
  if (m.blessure) coutMental(2.2, "cette blessure");
  /* Et chaque ligne se juge sur ce dont elle répond, que tu aies joué ou non : la
     défense sur ce qu'elle a encaissé, l'attaque sur ce qu'elle a marqué, le
     milieu sur le résultat. Le vestiaire suit, puisqu'il en est la moyenne. */
  bougerLigne('def', m.be === 0 ? 1.1 : m.be >= 3 ? -1.2 : 0);
  bougerLigne('att', m.bn >= 2 ? 1 : m.bn === 0 ? -1 : 0);
  bougerLigne('mil', res === 'V' ? .8 : res === 'D' ? -.8 : 0);
  AXES.forEach(a => S.moi.boost[a] *= .5);
  // classement
  const c = S.ligue.classement;
  c[S.club.nom].j++; c[S.club.nom].bp += m.bn; c[S.club.nom].bc += m.be;
  c[S.club.nom].pts += res === 'V' ? 3 : res === 'N' ? 1 : 0;
  c[S.club.nom][res === 'V' ? 'v' : res === 'N' ? 'n' : 'd']++;
  c[m.adv.nom].j++; c[m.adv.nom].bp += m.be; c[m.adv.nom].bc += m.bn;
  c[m.adv.nom].pts += res === 'D' ? 3 : res === 'N' ? 1 : 0;
  c[m.adv.nom][res === 'D' ? 'v' : res === 'N' ? 'n' : 'd']++;
  notesEquipe(m);
  autresMatchs();
  m.res = res; S.dernier = m;
  // ce qui a bougé, en direction seulement : l'écran n'aura jamais le chiffre
  m.mvt = [];
  Object.keys(g0).forEach(k => { const d = S.liens[k] - g0[k];
    if (Math.abs(d) >= .8) m.mvt.push({ k, up: d > 0, mot: dire(k) }); });
  LIGNES.forEach(k => { const d = S.lignes[k] - l0[k];
    if (Math.abs(d) >= .8) m.mvt.push({ k, up: d > 0, mot: `${LIGNE_NOM[k]} \u2014 ${direLigne(k)}` }); });
  if (S.etats.fraicheur - e0.fraicheur <= -8) m.mvt.push({ k:'fraicheur', up:false, mot:direJambes() });
  if (m.blessure) m.mvt.push({ k:'blessure', up:false, mot:`Tu sors touché : ${m.blessure} journée${m.blessure > 1 ? 's' : ''} d'absence.` });
  if (m.suspendu) m.mvt.push({ k:'suspension', up:false, mot:`Suspendu ${m.suspendu} match${m.suspendu > 1 ? 's' : ''}.` });
  if (m.amortiCoach) m.mvt.push({ k:'mental', up:true, mot:"Mauvais soir, mais tu n'as rien lâché : le coach t'en tient moins rigueur." });
  /* Ce que la soirée t'a pris dans la tête, avec ses raisons : c'est ça, un
     mauvais soir, et c'est la seule façon de le rendre visible. */
  if (S.coupsTete && S.coupsTete.length){
    const l = S.coupsTete.slice(0, 3);
    m.mvt.push({ k:'mental', up:false,
      mot:`Tu rumines : ${l.join(', ')}${S.coupsTete.length > 3 ? ', et le reste' : ''}.` });
    m.coupsTete = S.coupsTete.slice();
  }
  S.coupsTete = [];
  jrn('match', `J${S.journee + 1} · ${m.adv.dom ? S.club.nom + ' – ' + m.adv.nom : m.adv.nom + ' – ' + S.club.nom} ${m.adv.dom ? m.bn + '-' + m.be : m.be + '-' + m.bn}`
    + (m.minutes ? ` · toi : ${m.minutes} min, note ${nb(m.note)}${m.buts ? `, ${m.buts} but${m.buts > 1 ? 's' : ''}` : ''}${m.passes ? `, ${m.passes} passe${m.passes > 1 ? 's' : ''}` : ''}` : ` · ${m.statut === 'banc' ? 'resté sur le banc' : m.statut === 'blesse' ? "à l'infirmerie" : m.statut === 'suspendu' ? 'suspendu' : 'hors du groupe'}`)
    + (m.blessure ? ` · sorti touché, ${m.blessure} journée${m.blessure > 1 ? 's' : ''} d'absence` : '')
    + (m.suspendu ? ` · suspendu ${m.suspendu} match${m.suspendu > 1 ? 's' : ''}` : ''));
  decouverte(m);
  S.ecran = 'resultat'; sauver(); rendre();
}
/* « On ne connaît pas la note de ses coéquipiers, du coup on ne sait pas si on a
   fait un bon match par rapport à l'ensemble de l'équipe. » Chaque coéquipier qui
   a joué reçoit sa note, tirée autour du résultat et de son niveau, et l'écran les
   affiche. C'est le seul repère qui dit si ta note est bonne ce soir-là. */
function notesEquipe(m){
  const socleNote = 6.1 + (m.res === 'V' ? .55 : m.res === 'D' ? -.45 : 0);
  const joueurs = [];
  S.equipe.forEach(j => j.note = null);
  S.concurrents.forEach(c => c.note = null);
  /* Seuls les onze qui ont commencé sont notés. Avec un groupe de vingt-deux,
     noter tout le monde donnait dix-sept notes pour un match à onze. */
  (m.onze || []).forEach(x => {
    const derriere = x.poste === 'G' || x.poste === 'D';
    const n = socleNote + (x.niv - S.club.force) * .05 + rnd(-1.3, 1.3)
      + (derriere ? (m.be === 0 ? .8 : m.be >= 4 ? -.7 : 0) : 0);
    x.ref.note = Math.round(clamp(n, 3, 10) * 10) / 10;
    x.ref.sum = (x.ref.sum || 0) + x.ref.note; x.ref.nb = (x.ref.nb || 0) + 1;
    joueurs.push({ nom:x.nom, poste:x.poste, note:x.ref.note, rival: !!x.rival });
  });
  if (m.note != null) joueurs.push({ nom:S.moi.nom, poste:S.moi.poste, note:m.note, moi:true });
  joueurs.sort((a, b) => b.note - a.note);
  m.notes = joueurs;
  if (m.note != null && joueurs.length > 1){
    const moy = joueurs.reduce((a, x) => a + x.note, 0) / joueurs.length;
    const rang = joueurs.findIndex(x => x.moi) + 1;
    m.placeNote = rang;
    m.jugement = rang === 1 ? "Le meilleur des tiens ce soir."
      : m.note >= moy + .8 ? "Un des rares à surnager."
      : m.note >= moy - .3 ? "Dans la moyenne du groupe."
      : "Sous le niveau de tes coéquipiers.";
  }
}
/* « On a peu d'infos liées au reste de l'équipe ; ça peut être cool d'avoir les
   moyennes de notes des autres joueurs, ça apporte plus de contexte à la
   situation » (le propriétaire, 27/09/2026). La liste de l'effectif, classée par
   moyenne, avec ta ligne dedans pour que la comparaison soit immédiate. */
function moyDe(j){ return j.nb ? j.sum / j.nb : null; }
function effectifTrie(){
  const l = [];
  S.equipe.forEach(j => l.push({ nom:j.nom, poste:j.poste, age:j.age, nb:j.nb || 0,
    moy: moyDe(j), cle: LIGNE_DU_POSTE[j.poste], monte: !!j.monte,
    blesse: j.blesse > 0, susp: j.susp > 0 }));
  S.concurrents.forEach(c => l.push({ nom:c.nom, poste:S.moi.poste, age:c.age, nb:c.nb || 0,
    moy: moyDe(c), cle: LIGNE_DU_POSTE[S.moi.poste], rival:true, blesse: c.blesse > 0 }));
  l.push({ nom:S.moi.nom, poste:S.moi.poste, age:S.moi.age, nb:S.stats.notes.length,
    cle: LIGNE_DU_POSTE[S.moi.poste],
    moy: S.stats.notes.length ? moyenneNotes() : null, moi:true });
  return l.sort((a, b) => (b.moy == null ? -1 : b.moy) - (a.moy == null ? -1 : a.moy));
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
    c[a.nom][ga > gb ? 'v' : ga === gb ? 'n' : 'd']++; c[b.nom][gb > ga ? 'v' : ga === gb ? 'n' : 'd']++;
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
  vivreConcurrents(); vivreEquipe();
  S.equipe.forEach(j => { if (j.monte) j.niv = Math.min(j.niv + .35, S.club.force + 12); });
  /* Une entente qui ne bouge pas n'existe pas — mais elle ne doit pas s'échapper
     non plus : un rappel de 1 % vers 50 tient l'écart-type autour de sept points,
     assez pour que les arrêts et le match pèsent plus que le hasard. */
  LIGNES.forEach(k => S.lignes[k] = clamp(S.lignes[k] * .99 + .5 + rnd(-1.8, 1.8)));
  if (S.etats.blessure > 0) S.etats.blessure--;
  if (S.etats.suspension > 0) S.etats.suspension--;
  if (d && d.blessure) S.etats.blessure = d.blessure;
  if (d && d.suspendu) S.etats.suspension = d.suspendu;
  /* Une semaine passe, on digère : le temps répare une part de ce qu'on a pris,
     jamais au-delà de ce qu'on avait. Sans ça, seule la séance mentale répare et
     elle devient obligatoire — mesuré, elle écrasait toutes les autres. */
  if (S.moi.base.ment < S.moi.pic.ment - .2)
    bougerAxe('ment', Math.min(.12, S.moi.pic.ment - S.moi.base.ment));
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
  if (vestiaire() > 62) t.push(`Le vestiaire est avec toi, et ça se sent sur le terrain.`);
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
function dire(lien){
  if (lien === 'vestiaire') return MOTS.vestiaire[bande(vestiaire())];   // la moyenne des lignes
  return MOTS[lien] ? MOTS[lien][bande(S.liens[lien])] : '';
}
/* « Le fond, le geste, la tête, comme appellation, c'est pas très clair, et je
   crois ne pas me souvenir de ce que ça représente » (le propriétaire,
   27/09/2026). Les axes ont déjà un nom sur l'écran de la semaine : technique,
   physique, mental. Le jeu s'en tient à ceux-là. Ici, ce que le corps sait
   faire — tenir un match et récupérer — s'appelle simplement ton corps. */
function direFond(){ const v = S.etats.fond;
  return v > 55 ? "Tu tiens tout le match, et tu récupères vite."
    : v > 32 ? "Ton corps suit, et récupère entre deux matchs."
    : v > 14 ? "Tu tiens, sans plus."
    : "Tu lâches en fin de match, et tu récupères mal."; }
function direEncaisse(){ const v = S.moi.base.ment + S.moi.boost.ment;
  return v > 68 ? "Menés à dix minutes de la fin, tu joues comme à l'entraînement."
    : v > 54 ? "Quand ça se tend, tu restes dans ton match."
    : v > 42 ? "Quand ça se tend, tu joues petit."
    : "Un but encaissé et tu sors du match pendant vingt minutes."; }
function direGeste(){ const v = S.moi.base.tech + S.moi.boost.tech;
  return v > 68 ? "Quand il faut faire le geste, il sort." : v > 54 ? "Le geste sort le plus souvent."
    : v > 42 ? "Le geste te trahit encore." : "Dans les moments qui comptent, tu rates le geste."; }
/* Ce que ta tête va faire dans le moment qui vient. Dit avant le clic, pour que
   le mental se sente au lieu de s'expliquer. */
function direTete(){ const v = S.moi.base.ment + S.moi.boost.ment;
  return v > 68 ? "Tu as déjà vécu ça." : v > 54 ? "Tu respires, et tu joues."
    : v > 42 ? "Tes jambes se font lourdes d'un coup." : "Le stade hurle et tu ne l'entends plus."; }
/* L'infirmerie, en mots : c'est ce qui justifie un groupe de vingt-deux. */
function direInfirmerie(){
  const a = groupe().filter(x => !x.dispo);
  if (!a.length) return "Tout le monde est valide.";
  const n = a.length;
  const qui = a.slice(0, 2).map(x => x.nom).join(' et ');
  return n === 1 ? `${qui} manque ce samedi.`
    : n === 2 ? `${qui} manquent ce samedi.`
    : `${n} absents, dont ${qui}.`;
}
/* Ce que la profondeur du groupe absorbe. Il faut le dire en tenant compte des
   absents : « quatre absents » à côté de « le onze est au complet » se lisait
   comme une contradiction, alors que c'est justement ce qu'un groupe de
   vingt-deux est censé faire. */
function direProfondeur(){
  const abs = groupe().filter(x => !x.dispo).length;
  const e = onzeDuJour(monStatutSec()).ecart;
  if (!abs) return "Tout le monde est là : le coach a le choix.";
  return e > -.25 ? "Le groupe absorbe : le onze ne s'en ressent pas."
    : e > -.8 ? "Le coach bricole un peu, sans plus."
    : e > -1.8 ? "Deux ou trois remplaçants entrent : ça se sentira."
    : "Le groupe est à l'os. Ce match part de plus loin.";
}
// une lecture sans tirage au sort, pour l'affichage : on suppose que tu joues
function monStatutSec(){ return S.etats.blessure > 0 || S.etats.suspension > 0 ? 'banc' : 'titulaire'; }
function direPlace(){
  const d = devantToi();
  if (!d) return "Personne ne te passe devant en ce moment.";
  const ecart = (d.niv + d.forme) - valeurAuPoste();
  return ecart < 2.5 ? `${d.nom} est devant toi, mais ça se joue à rien.`
    : ecart < 8 ? `${d.nom} est devant toi, et le coach ne doute pas.`
    : `${d.nom} est loin devant. Tu n'es pas dans ses plans.`;
}
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
    /* MIGRATION 5 → 6 : les relations individuelles deviennent trois ententes de
       ligne. Le propriétaire testait la partie précédente au moment du changement :
       on reconstruit ses lignes depuis ce qu'il avait plutôt que d'effacer. */
    if (d.v === 5 && d.liens && d.equipe){
      const vest = d.liens.vestiaire == null ? 50 : d.liens.vestiaire;
      d.lignes = {};
      LIGNES.forEach(k => {
        const l = d.equipe.filter(j => LIGNE_DU_POSTE[j.poste] === k && j.rel != null);
        const moy = l.length ? l.reduce((a, j) => a + j.rel, 0) / l.length : 50;
        // le vestiaire qu'il avait, nuancé par ce que valait cette ligne
        d.lignes[k] = clamp(vest + (moy - 50) * .5);
      });
      delete d.liens.vestiaire;
      d.equipe.forEach(j => { delete j.rel; });
      d.v = 6;
    }
    /* MIGRATION 6 → 7 : le groupe passe de onze à vingt-deux. On garde les
       coéquipiers existants et on complète poste par poste, plutôt que de jeter
       une carrière en cours. */
    if (d.v === 6 && d.equipe && d.club){
      const pris = d.equipe.map(j => j.nom).concat((d.concurrents || []).map(c => c.nom));
      const tirer = () => { let n, k = 0;
        do { n = pick(NOMS); k++; } while (pris.includes(n) && k < 200); pris.push(n); return n; };
      d.equipe.forEach(j => { j.forme = j.forme || 0; j.blesse = j.blesse || 0; j.susp = j.susp || 0; });
      const nb = d.moi.poste === 'G' ? 1 : 2;
      Object.entries(EFFECTIF).forEach(([po, n]) => {
        const vise = po === d.moi.poste ? n - 1 - nb : n;
        let ont = d.equipe.filter(j => j.poste === po).length;
        while (ont < vise){
          d.equipe.push({ nom:tirer(), poste:po, niv: Math.round(d.club.force + rnd(-7, 6)),
            age: ri(18, 34), forme: 0, blesse: 0, susp: 0, prog: 0, note: null });
          ont++;
        }
      });
      d.v = 7;
    }
    if (d.v !== VERSION) return null;
    return d;
  } catch(e){ return null; }
}
function effacer(){ try { localStorage.removeItem('ac2'); } catch(e){} S = null; }
