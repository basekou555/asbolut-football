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

const VERSION = 10;  // la carrière continue : `carriere`, `ete`, `offres`, `fin`
/* MIGRATION 9 → 10 : rien à reconstruire. Une partie en cours reprend telle
   quelle et, arrivée au bilan, enchaîne désormais sur l'été au lieu de s'arrêter.
   `vieillir()` crée `S.carriere` au premier passage. */
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
  { id:'G', nom:"Gardien",            spec:"Réflexes",  mot:"tes réflexes",  w:{ tech:.22, phys:.26, ment:.30, spec:.22 } },
  { id:'D', nom:"Défenseur",          spec:"Placement", mot:"ton placement", w:{ tech:.22, phys:.32, ment:.24, spec:.22 } },
  { id:'M', nom:"Milieu de terrain",  spec:"Vision",    mot:"ta vision",     w:{ tech:.32, phys:.22, ment:.24, spec:.22 } },
  { id:'A', nom:"Attaquant",          spec:"Finition",  mot:"ta finition",   w:{ tech:.30, phys:.24, ment:.20, spec:.26 } },
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
/* LES HUIT TEXTES DISENT D'ABORD LE NIVEAU (le propriétaire, 27/09/2026 : « les
   formulations ne sont pas très bonnes… “tu arrives où le ballon était”, on ne
   comprend pas forcément. Et pareil pour la frappe : on ne comprend pas trop si
   c'est bien ou pas bien quand tu dis “ta frappe n'est pas normale”. Ça peut être
   “une frappe supérieure à la moyenne, le staff apprécie ta qualité de tir”… et
   pour le poste, “tu es en dessous de la moyenne dans tes qualités au poste,
   c'est quelque chose que tu traînes depuis toujours” »). Chaque phrase commence
   donc par **au-dessus** ou **en dessous de la moyenne**, et la suite dit ce que
   ça change concrètement. La phrase ne répète pas l'axe : l'étiquette le nomme déjà,
   et au poste elle le nomme précisément (« ta finition », « tes réflexes »). */
const QUALITES = [
  { id:'frappe', axe:'tech', nom:"La frappe",
    dit:"Une qualité de tir au-dessus de la moyenne : le staff s'arrête pour regarder tes séances de frappe." },
  { id:'poumons', axe:'phys', nom:"Le moteur",
    dit:"Un volume de course au-dessus de la moyenne : tu finis les matchs plus frais que ceux d'en face." },
  { id:'nerfs', axe:'ment', nom:"Le sang-froid",
    dit:"Une tête au-dessus de la moyenne : le stade hurle et tes mains ne tremblent pas." },
  { id:'lecture', axe:'spec', nom:"La lecture du jeu",
    dit:"Une lecture du jeu au-dessus de la moyenne : tu prends l'information avant les autres." },
];
const DEFAUTS = [
  { id:'gauche', axe:'tech', nom:"Le pied faible",
    dit:"Une qualité balle au pied en dessous de la moyenne : côté gauche tu ne fais rien, et les défenseurs l'ont compris avant toi." },
  { id:'ischios', axe:'phys', nom:"Les ischios",
    dit:"Un corps en dessous de la moyenne : cette gêne derrière la cuisse revient chaque hiver, et le kiné soupire." },
  { id:'doute', axe:'ment', nom:"Le doute",
    dit:"Une tête en dessous de la moyenne : un geste raté et tu joues petit pendant vingt minutes." },
  { id:'placement', axe:'spec', nom:"Le temps de retard",
    dit:"Un sens du jeu en dessous de la moyenne : tu réagis une demi-seconde après les autres, et tu traînes ça depuis toujours." },
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
/* « ta finition », « tes réflexes »… : le possessif suit le poste. */
function motAxe(a){
  if (a !== 'spec') return { tech:"ta technique", phys:"ton physique", ment:"ton mental" }[a];
  const p = S && S.moi ? POSTES.find(x => x.id === S.moi.poste) : null;
  return p ? p.mot : "ton poste";
}


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
   conclut que les lignes ne servent à rien. Une ligne parle de ce qu'elle fait.
   **HUIT PALIERS ET NON SIX** (le propriétaire, 27/09/2026 : « la stat "ta ligne",
   elle bouge jamais, du coup je comprends pas trop l'utilité »). Mesuré avant de
   toucher à quoi que ce soit : la jauge parcourt **22 points** par saison, mais
   les bandes générales font seize points de large, donc la phrase ne changeait
   que **3,5 fois en 34 journées** — dix semaines avec le même mot. Les paliers
   d'une ligne sont resserrés autour de là où elle vit vraiment (36 à 73). */
const MOTS_LIGNE = {
  def: ["Derrière, chacun joue pour soi.", "On se marche dessus.",
    "Chacun défend son bout.", "Ça tient un match sur deux.",
    "On commence à se couvrir.", "On se couvre.",
    "On défend à quatre, jamais à un.", "Personne ne passe entre nous."],
  mil: ["Au milieu, personne ne lève la tête.", "On joue les uns à côté des autres.",
    "On se trouve une fois sur trois.", "Un ballon sur deux se trouve.",
    "Ça commence à circuler.", "On se trouve.",
    "Trois passes et on est de l'autre côté.", "On joue les yeux fermés."],
  att: ["Devant, on se gêne.", "On se cherche encore.",
    "Un centre sur trois arrive.", "Un centre sur deux arrive.",
    "On se regarde un peu moins.", "On commence à se trouver.",
    "Un appel, un ballon.", "On sait où l'autre va avant lui."],
};
const BANDES_LIGNE = [30, 38, 45, 51, 57, 63, 70];
function bandeLigne(v){
  for (let i = 0; i < BANDES_LIGNE.length; i++) if (v < BANDES_LIGNE[i]) return i;
  return BANDES_LIGNE.length;
}
/* Et surtout : **la direction**. Une jauge qui se déplace de deux points par
   journée ne change pas de palier avant des semaines, donc le joueur la croit
   immobile. `S.ligneRef` est une moyenne lissée : l'écart entre la valeur du
   jour et elle dit si ça monte ou si ça se dégrade, même à l'intérieur d'un
   palier. C'est ce qui rend le mouvement visible toutes les semaines. */
function tendanceLigne(k){
  if (!S.ligneRef) return 0;
  return S.lignes[k] - S.ligneRef[k];
}
function direTendance(k){
  const d = tendanceLigne(k);
  return d > 1.6 ? " Et ça va dans le bon sens." : d < -1.6 ? " Et ça se dégrade." : "";
}
function vestiaire(){ return (S.lignes.def + S.lignes.mil + S.lignes.att) / 3; }
function bougerLigne(k, v){ if (v) S.lignes[k] = clamp(S.lignes[k] + v); }
function bougerVestiaire(v){ LIGNES.forEach(k => bougerLigne(k, v)); }
function direLigne(k){ return MOTS_LIGNE[k][bandeLigne(S.lignes[k])]; }
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

/* L'EFFECTIF, fabriqué d'un bloc — à la création comme à chaque changement de club.
   Des coéquipiers **stables et nommés** : sans eux, « un coéquipier progresse »,
   « ça se tend avec ton attaquant » ou « les notes du match » n'ont personne de
   qui parler. Vingt-deux joueurs (`EFFECTIF` est le groupe, `FORMATION` le onze),
   ta place et celles de tes rivaux comprises. Une hiérarchie par poste :
   `FORMATION[po]` joueurs au-dessus de la force du club, le reste en dessous —
   sans elle, tu passais titulaire dès ta première saison (26 matchs à dix-huit
   ans, mesuré). Tes rivaux nommés occupent les places de titulaire de ton poste. */
function creerEffectif(club, posteId, pris){
  pris = pris ? pris.slice() : [];
  const tirerNom = () => { let n, k = 0;
    do { n = pick(NOMS); k++; } while (pris.includes(n) && k < 300); pris.push(n); return n; };
  const nb = posteId === 'G' ? 1 : 2;      // un gardien n'a qu'un rival, c'est binaire
  const concurrents = [];
  for (let i = 0; i < nb; i++)
    // le titulaire en place est devant toi ; le second est à ta portée
    concurrents.push({ nom:tirerNom(), niv: Math.round(club.force + (i === 0 ? rnd(3, 8) : rnd(1, 6))),
      forme: 0, blesse: 0, age: ri(23, 31) });
  const equipe = [];
  Object.entries(EFFECTIF).forEach(([po, n]) => {
    const combien = po === posteId ? n - 1 - nb : n;
    const cadres = Math.max(0, FORMATION[po] - (po === posteId ? nb : 0));
    for (let i = 0; i < combien; i++)
      equipe.push({ nom:tirerNom(), poste:po,
        niv: Math.round(club.force + (i < cadres ? rnd(2, 8) : rnd(-10, 0))),
        age: ri(18, 34), forme: 0, blesse: 0, susp: 0, prog: 0, note: null });
  });
  // un jeune qui monte : c'est de lui que parleront les arrêts « il progresse »
  const jeune = equipe.filter(j => j.age <= 23).sort((a, b) => a.age - b.age)[0];
  if (jeune) jeune.monte = true;
  return { concurrents, equipe };
}

function nouvellePartie(c){
  const poste = POSTES.find(p => p.id === c.poste) || POSTES[2];
  const base = {}; AXES.forEach(a => base[a] = 50);
  Object.entries(c.origine.axes).forEach(([a, v]) => base[a] = clamp(base[a] + v));
  const q = pick(QUALITES);
  const f = pick(DEFAUTS.filter(x => x.axe !== q.axe));
  base[q.axe] = clamp(base[q.axe] + 15);
  base[f.axe] = clamp(base[f.axe] - 15);

  /* LE POTENTIEL, TIRÉ UNE FOIS POUR TOUTE LA CARRIÈRE. Il était tiré entre 72 et
     96, ce qui ne se voyait pas tant que le jeu s'arrêtait au bout d'une saison
     (`plafondReel` le borne de toute façon à la moyenne des autres axes + 25, donc
     à 75 en août) — mais sur une carrière entière, **tout le monde devenait une
     star** : niveau médian 88 pour un championnat dont le meilleur club vaut 78,
     et 37 buts par saison pour un attaquant médian. Resserré : la première saison
     ne bouge pas, le sommet d'une carrière oui. */
  const plafond = {}; AXES.forEach(a => plafond[a] = ri(POT_MIN, POT_MAX));
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
  const { concurrents, equipe } = creerEffectif(club, poste.id);
  S = {
    v: VERSION, mode: 'joueur', annee: c.annee,
    moi: { nom: c.nom, poste: poste.id, posteNom: poste.nom, specNom: poste.spec,
      age: 18, base, boost: { tech:0, phys:0, ment:0, spec:0 }, plafond, socle,
      u0: c.origine.u0, origine: c.origine.id, ambition: c.ambition.id, pic,
      qual: { id:q.id, vu:true }, def: { id:f.id, vu:true },
      an0: { ...base },   // la photo des axes en août : ce qui a bougé se lit contre elle
      histo: {} },
    club: { nom: club.nom, force: club.force }, concurrents, equipe,
    ligue, liens, lignes, ligneRef: { ...lignes },
    /* `fond` est la réserve que construit le travail physique : on récupère plus
       vite d'un match à l'autre, on se blesse moins, et on laisse moins de jambes
       dans un match. Il s'use d'une journée sur l'autre : il faut l'entretenir.
       Sans lui la séance physique était la plus chère sans aucune contrepartie,
       et le banc d'essai la montrait dominée à tous les postes. */
    etats: { fraicheur:100, forme:60, blessure:0, suspension:0, corps:88, fond:0 },
    journee: 0, arrets: 0, cartons: 0,
    coupe: { vivant:true, tour:0, hist:[], gagnee:false },
    euro: { engage:false, vivant:true, tour:0, pts:0, hist:[], gagnee:false },
    semaine: null, seance: null, match: null, dernier: null, arret: null,
    stats: { matchs:0, titus:0, buts:0, passes:0, notes:[], minutes:0 },
    journal: [], ecran: 'semaine',
  };
  jrn('debut', `${S.moi.nom}, ${poste.nom.toLowerCase()} de ${S.club.nom}. Première saison.`);
  sauver(); return S;
}

/* ---------- la ligue ---------- */
/* ================== LE CHAMPIONNAT VIT ==================
   Le propriétaire, 27/09/2026 : « par championnat, mettre un petit système
   aléatoire pour les clubs adverses pour définir leur niveau… d'une année à
   l'autre j'aurai des clubs plus ou moins forts : peut-être une année deux clubs
   plus forts que moi, l'autre année cinq, une autre trois… dans certaines
   carrières c'était tout le temps les mêmes équipes qui gagnaient, donc si tu
   rejoignais cette équipe tu savais que tu allais remporter des trophées. »
   Le championnat était **entièrement retiré chaque année** : les dix-huit clubs
   changeaient d'identité d'une saison à l'autre et la force de chacun ne devait
   rien à ce qu'il avait fait. Désormais ce sont **les mêmes clubs toute la
   carrière**, chacun avec :
   - une **ancre** : son poids historique à cette époque (`eras.js`), qui ne bouge pas ;
   - un **potentiel** (`pot`) : ce qu'il peut être, tiré autour de son ancre et qui
     dérive lentement — un petit club peut monter dans la hiérarchie, un grand
     s'installer dans le ventre mou, mais jamais d'un coup ;
   - une **force** qui se rejoue chaque été : ce que la saison passée a rapporté,
     un vrai tirage, et un rappel vers son potentiel.
   C'est le tirage qui fait qu'on ne sait jamais qui sera fort — exactement ce
   qu'il demande : « avec un bon tirage au sort, avoir leur chance pour gagner le
   trophée ». Les clubs adverses n'ont pas d'effectif nommé : leur force **est**
   leur effectif, et elle suit la même logique potentiel + croissance que la tienne. */
const PENTE_CLUB = 2.4;
/* Ce qu'un bon classement rapporte l'année suivante. Mesuré palier par palier :
   à 0,3 par place c'est une boucle qui s'auto-entretient (le champion reste
   champion, 55 % de titres conservés quel que soit le reste du réglage) ; à 0
   la saison passée ne compte plus du tout, ce que le propriétaire ne veut pas
   (« elles ont fait un bon résultat, elles ont des bons joueurs, puis l'année
   d'après ça leur permet d'avoir leur chance »). À 0,12, le champion prend un
   point d'avance qui s'efface en deux ou trois ans : un vrai avantage, pas une
   rente. */
const ELAN_CLUB = .12;
const TIRAGE_CLUB = 7.5;   // c'est lui qui fait qu'on ne sait jamais qui sera fort
const RAPPEL_CLUB = .35;   // et lui qui empêche un club de s'échapper

/* ========== LES CLUBS ADVERSES ONT UN EFFECTIF, PAS UN NOMBRE ==========
   Le propriétaire, 27/09/2026 : « les équipes en face et les joueurs d'en face qui
   ont leur potentiel aléatoire et qui ont leur croissance de leur côté, qui est
   dans les mêmes proportions que la nôtre. » Un club adverse était un nombre qui
   bougeait tout seul ; c'est maintenant **vingt-deux joueurs nommés**, avec un âge
   et un potentiel, qui suivent **la même courbe d'âge que tes coéquipiers**. La
   force du club n'est plus tirée : elle **découle** de son onze.
   Ce que ça change vraiment : un club tombe parce que sa génération vieillit et
   remonte parce qu'il recrute — le mouvement a enfin une cause, et le buteur d'en
   face a un nom. L'élan, le tirage et le rappel vers le potentiel n'agissent plus
   sur la force directement mais sur **ce que le club arrive à recruter**, ce qui
   revient au même de loin et veut dire quelque chose de près. */
function nomAdverse(pris){
  for (let k = 0; k < 400; k++){
    const n = `${pick(INITIALES)}. ${pick(NOMS_ADV)}`;
    if (!pris.has(n)){ pris.add(n); return n; }
  }
  return `${pick(INITIALES)}. ${pick(NOMS_ADV)}`;
}
/* Le niveau du onze, pondéré comme une équipe : c'est ça, la force d'un club. */
function forceEffectif(sq){
  let t = 0, n = 0;
  Object.entries(FORMATION).forEach(([po, k]) => {
    sq.filter(j => j.p === po).sort((a, b) => b.v - a.v).slice(0, k)
      .forEach(j => { t += j.v; n++; });
  });
  return n ? Math.round(clamp(t / n, 40, 82)) : 50;
}
function creerEffectifAdverse(niveau, pris){
  const sq = [];
  Object.entries(EFFECTIF).forEach(([po, n]) => {
    for (let i = 0; i < n; i++){
      const age = ri(18, 33);
      // les titulaires sont au-dessus du niveau du club, les doublures en dessous
      /* Les titulaires sont **centrés** sur le niveau du club, pas au-dessus : sinon
         `forceEffectif()` (la moyenne du onze) rendait systématiquement trois points
         de plus que le niveau demandé, et comme tes coéquipiers se construisent à
         partir de la force de ton club, tu perdais ta place — mesuré, 24,8 matchs
         en première saison tombés à 18,5. */
      const v = clamp(niveau + (i < FORMATION[po] ? rnd(-2.5, 2.5) : rnd(-12, -2)), 38, 84);
      sq.push({ n: nomAdverse(pris), p: po, a: age,
        v: Math.round(v * 10) / 10,
        // le potentiel : ce qu'il peut devenir, borné par ce qu'il est déjà
        t: Math.round(clamp(v + (age <= 23 ? rnd(2, 12) : rnd(0, 4)), 40, 88) * 10) / 10 });
    }
  });
  return sq;
}
/* Une année passe chez eux aussi : chacun vieillit et suit sa courbe vers son
   potentiel, les plus vieux s'en vont, et le club recrute à la hauteur de ce
   qu'il pèse — mieux s'il a bien fini, moins bien sinon, avec un vrai tirage. */
function recrue(po, niveau, pris){
  const age = ri(18, 29);
  const v = clamp(niveau, 38, 84);
  return { n: nomAdverse(pris), p: po, a: age, v: Math.round(v * 10) / 10,
    t: Math.round(clamp(v + (age <= 23 ? rnd(2, 12) : rnd(0, 4)), 40, 88) * 10) / 10 };
}
function vivreEffectifAdverse(e, vise, pris){
  e.sq.forEach(j => {
    j.a++;
    const c = courbeAge(j.a);
    j.v = Math.round(clamp(j.v + (c > 0 ? Math.min(c, Math.max(0, j.t - j.v)) : c) + rnd(-.8, .8), 38, 86) * 10) / 10;
  });
  e.sq = e.sq.filter(j => j.a < 35 && !(j.a >= 31 && Math.random() < .3) && Math.random() > .1);
  Object.entries(EFFECTIF).forEach(([po, n]) => {
    while (e.sq.filter(j => j.p === po).length < n){
      const titu = e.sq.filter(j => j.p === po).length < FORMATION[po];
      e.sq.push(recrue(po, vise + (titu ? rnd(-2.5, 2.5) : rnd(-12, -2)), pris));
    }
  });
  /* LE MERCATO DU CLUB. Sans lui, un effectif de vingt-deux **lisse tout** : chaque
     joueur bouge d'un point par an, la force du onze suit à peine, et le
     championnat se refige (mesuré : 4,2 champions différents sur vingt saisons au
     lieu de 5,8, titre conservé 49 %). Un club qui a bien fini **achète** et
     remplace ses plus faibles ; un club qui a coulé **perd ses meilleurs**, partis
     ailleurs. C'est ça qui fait bouger une hiérarchie, et c'est vrai. */
  const postes = Object.keys(EFFECTIF);
  for (let k = 0; k < 8; k++){
    const ecart = vise - forceEffectif(e.sq);
    if (Math.abs(ecart) < 1.2) break;
    const po = pick(postes);
    const l = e.sq.filter(j => j.p === po);
    if (l.length < 2) continue;
    // on achète par le bas, on se fait piller par le haut
    const cible = ecart > 0 ? l.sort((a, b) => a.v - b.v)[0] : l.sort((a, b) => b.v - a.v)[0];
    e.sq.splice(e.sq.indexOf(cible), 1);
    e.sq.push(recrue(po, ecart > 0 ? vise + rnd(-1, 4) : vise + rnd(-10, -2), pris));
  }
}
/* Qui marque chez eux : quelqu'un de leur onze, et plutôt un attaquant. */
function buteurAdverse(adv){
  const e = (S.ligue.equipes || []).find(x => x.nom === adv.nom);
  if (!e || !e.sq || !e.sq.length) return null;
  const onze = [];
  Object.entries(FORMATION).forEach(([po, k]) => {
    onze.push(...e.sq.filter(j => j.p === po).sort((a, b) => b.v - a.v).slice(0, k));
  });
  const poids = onze.map(j => ({ G:.02, D:.5, M:1.4, A:3 }[j.p] || 1));
  let t = poids.reduce((a, x) => a + x, 0) * Math.random(), i = 0;
  while (i < onze.length - 1 && (t -= poids[i]) > 0) i++;
  return onze[i] ? onze[i].n : null;
}
function nomsPris(){
  const s = new Set();
  (S.ligue.equipes || []).forEach(e => (e.sq || []).forEach(j => s.add(j.n)));
  return s;
}

function creerLigue(annee){
  const dk = typeof decadeKey === 'function' ? decadeKey(annee) : '10';
  const gros = (typeof FR_CLUBS !== 'undefined' ? FR_CLUBS : []).filter(c => (c.s[dk] || 0) >= 2).map(c => ({ nom:c.n, s:c.s[dk] }));
  const petits = (typeof FR_LOWER !== 'undefined' ? FR_LOWER : []).map(n => ({ nom:n, s: rnd(-1.7, 1) }));
  const noms = [...shuffle(gros).slice(0, 6), ...shuffle(petits).slice(0, 12)];
  /* LA PENTE : l'écart historique entre un gros et un petit club. À 4 par point de
     poids, le premier était **douze à quatorze points au-dessus du cinquième** et le
     titre était joué avant août : mesuré, 3,9 champions différents sur vingt saisons
     et le titre conservé 59 % du temps. À 2,4, l'écart tombe à neuf ou dix, et une
     saison peut basculer. */
  const pris = new Set();
  const equipes = noms.map(x => {
    const ancre = clamp(52 + x.s * PENTE_CLUB, 44, 74);
    const pot = clamp(ancre + rnd(-3, 3), 44, 78);
    const sq = creerEffectifAdverse(clamp(pot + rnd(-3, 3), 42, 80), pris);
    return { nom:x.nom, ancre: Math.round(ancre * 10) / 10, pot: Math.round(pot * 10) / 10,
      sq, force: forceEffectif(sq) };
  }).sort((a, b) => b.force - a.force);
  const N = equipes.length;
  return { equipes, N, classement: Object.fromEntries(equipes.map(e => [e.nom, { pts:0, j:0, v:0, n:0, d:0, bp:0, bc:0 }])) };
}
/* L'été du championnat : chaque club rejoue son niveau. Ton club passe par la
   même porte que les autres — il n'a plus de règle à lui. */
function faireVivreLigue(){
  const cl = classementTrie(), N = S.ligue.equipes.length;
  const pris = nomsPris();
  S.ligue.equipes.forEach(e => {
    if (e.ancre == null){ e.ancre = e.force; e.pot = e.force; }   // ligue d'avant
    const rang = cl.findIndex(x => x.nom === e.nom) + 1;
    // ce que la saison passée a rapporté : une bonne place attire, une mauvaise vide
    const elan = rang ? (N / 2 - rang) * ELAN_CLUB : 0;
    // le potentiel dérive lentement, rappelé vers ce que le club pèse historiquement :
    // un petit club peut monter dans la hiérarchie, jamais d'un coup
    e.pot = Math.round(clamp(e.pot * .95 + e.ancre * .05 + rnd(-1.6, 1.6), 44, 78) * 10) / 10;
    /* Le club recrute à la hauteur de `vise` : élan de la saison passée, tirage,
       et rappel vers son potentiel. La force n'est plus posée, elle **découle** de
       l'effectif une fois qu'il a vieilli et qu'on a comblé les trous. */
    const vise = clamp(e.force + elan + rnd(-TIRAGE_CLUB, TIRAGE_CLUB)
      + (e.pot - e.force) * RAPPEL_CLUB, 42, 80);
    if (!e.sq) e.sq = creerEffectifAdverse(e.force, pris);
    vivreEffectifAdverse(e, vise, pris);
    e.force = forceEffectif(e.sq);
  });
  S.ligue.equipes.sort((a, b) => b.force - a.force);
  S.ligue.classement = Object.fromEntries(S.ligue.equipes.map(e => [e.nom, { pts:0, j:0, v:0, n:0, d:0, bp:0, bc:0 }]));
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
  { id:'tech', ico:'⚽', nom:"Rester après l'entraînement", sub:"Frappes, centres, gestes répétés.",
    axe:'tech', fit:-8, rende:1, dit:[{c:'risk',t:"🫁 samedi : lourd"},{c:'foot',t:"⚡ technique : les faits de match"},{c:'vie',t:"🏡 tu rentres tard"}] },
  { id:'phys', ico:'💪', nom:"La salle et les sprints", sub:"Le programme du préparateur. Violent.",
    axe:'phys', fit:-11, fond:3.5, rende:1.15, dit:[{c:'risk',t:"🫁 samedi : fatigué"},{c:'foot',t:"💪 ton corps : tenir, récupérer"}] },
  { id:'ment', ico:'🧠', nom:"La vidéo et le calme", sub:"Tes matchs revus, et du silence.",
    axe:'ment', fit:-7, rende:.85, dit:[{c:'foot',t:"🛡️ mental : encaisser"},{c:'vie',t:"🏡 du temps chez toi"}] },
  { id:'spec', ico:'🎯', nom:"Le travail de ton poste", sub:"Une heure seul avec l'adjoint.",
    axe:'spec', fit:-8, fond:1, rende:1, dit:[{c:'foot',t:"🎽 ta place dans le onze"},{c:'risk',t:"🫁 une heure de plus"}] },
  { id:'normale', ico:'🔁', nom:"La semaine normale", sub:"Ce que le coach demande, pas plus.",
    axe:null, fit:-2, dit:[{c:'neutre',t:"↔️ un peu de tout"}] },
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
  /* LE COACH ANNONCE SON GROUPE AVANT LE WEEK-END, ET LES ARRÊTS LE SAVENT.
     Le propriétaire, 27/09/2026 : « je suis tombé sur un fait d'avant-match qui
     disait que j'étais pas dans le groupe, mais en fait j'ai joué le match ».
     Le groupe se décidait dans `lancerMatch()`, donc **après** l'arrêt : un
     écran pouvait affirmer une chose que le match démentait cinq secondes plus
     tard. Il se décide maintenant ici, juste après la séance (elle pèse sur ta
     fraîcheur, donc sur le choix du coach) et il est figé pour la journée. */
  /* MERCREDI AVANT SAMEDI. Le match de coupe ou d'Europe se joue **avant** qu'on
     pose le groupe du week-end : ses minutes et sa fatigue entrent donc dans le
     choix du onze de samedi, ce qui est exactement le coût qu'on veut. */
  S.annexe = matchAnnexe(S.journee) ? jouerAnnexe(matchAnnexe(S.journee)) : null;
  poserEquipeDuJour();
  ouvrirArrets();
}
/* Le groupe du jour, gelé en noms pour tenir dans la sauvegarde : les objets du
   groupe portent une référence vers l'effectif, et les sérialiser en ferait des
   copies. `equipeDuJourLue()` les retrouve par leur nom. */
function poserEquipeDuJour(){
  const eq = equipeDuJour();
  const geler = l => l.map(x => ({ n:x.nom, c:x.choix }));
  S.eqJour = { statut: eq.statut, ecart: eq.ecart,
    onze: geler(eq.onze), banc: geler(eq.banc), reserve: geler(eq.reserve) };
  return S.eqJour;
}
function equipeDuJourLue(){
  if (!S.eqJour) return equipeDuJour();
  const g = groupe();
  const moi = { moi:true, nom:S.moi.nom, poste:S.moi.poste, niv:valeurAuPoste(),
    dispo: S.etats.blessure <= 0 && S.etats.suspension <= 0, ref:{} };
  const tous = [...g, moi];
  // chaque nom n'est rendu qu'une fois : personne ne peut se retrouver à la fois
  // dans le onze et sur le banc, ni deux fois dans la même liste
  const reste = new Map(tous.map(x => [x.nom, x]));
  const lire = l => l.map(e => { const x = reste.get(e.n); if (!x) return null;
    reste.delete(e.n); x.choix = e.c; return x; }).filter(Boolean);
  return { statut: S.eqJour.statut, ecart: S.eqJour.ecart,
    onze: lire(S.eqJour.onze), banc: lire(S.eqJour.banc), reserve: lire(S.eqJour.reserve),
    absents: g.filter(x => !x.dispo) };
}

/* ---------- les arrêts (placeholders : le contenu viendra après) ---------- */
const ARRETS = [
  // il ne peut plus te dire ça si tu commences le match : le groupe est déjà connu
  { id:'banc', quand: () => S.journee >= 2 && S.eqJour && S.eqJour.statut === 'banc',
    titre:"Le coach t'attend dans son bureau",
    texte:"« Je vais être direct : samedi, tu commences sur le banc. Ce n'est pas contre toi. »",
    options:[
      { l:"Encaisser sans un mot", liens:{ coach:4 }, dit:[{c:'foot',t:"🎽 il te trouve professionnel"}] },
      { l:"Demander ce qui te manque", liens:{ coach:2 }, axes:{ ment:1 }, dit:[{c:'foot',t:"🎽 il te dit la vérité"},{c:'risk',t:"🧠 elle pique"}] },
      { l:"Lui dire que tu mérites mieux", liens:{ coach:-6, vestiaire:4 }, dit:[{c:'risk',t:"🎽 il ne l'oubliera pas"},{c:'foot',t:"✊ le vestiaire te respecte"}] },
    ] },
  /* QUAND TU NE JOUES PAS, LA VIE PREND LA PLACE (le propriétaire, 27/09/2026 :
     « j'ai joué 4 matchs alors que c'est la 22ᵉ journée… soit j'ai mon agent qui
     vient me voir, soit il y a des discussions avec le coach qui doivent
     s'installer… ça doit amener des événements hors football pour compenser le
     fait qu'au niveau football il se passe pas grand-chose. Là, étant donné que
     je ne suis même pas dans le groupe le week-end, ce serait bien qu'il y ait
     des trucs positifs comme le temps avec la famille »). Trois familles qui ne
     se déclenchent que là, et qui sont les seules portes de sortie. */
  { id:'coachTemps', quand: () => (S.sansJouer || 0) >= 3,
    titre:"Tu frappes à la porte du coach",
    texte:"« Entre. Je sais pourquoi tu viens. » Il repousse son ordinateur. Tu as deux minutes et une phrase à trouver.",
    options:[
      { l:"« Dites-moi ce que je dois faire pour jouer »", liens:{ coach:9 }, fit:-5, axes:{ spec:1.2 },
        dit:[{c:'foot',t:"🎽 il te donne un programme"},{c:'risk',t:"🫁 des séances en plus"},{c:'foot',t:"🎯 juste à ton poste"}] },
      { l:"« Je veux jouer, sinon je pars en juin »", liens:{ coach:-7, agent:10, club:-5 },
        dit:[{c:'risk',t:"🎽 il n'aime pas les ultimatums"},{c:'foot',t:"🤝 ton agent se met au travail"}] },
      { l:"« Je vais attendre mon tour »", liens:{ coach:3 }, axes:{ ment:1.4 },
        dit:[{c:'foot',t:"🎽 il apprécie"},{c:'foot',t:"🧠 tu tiens"},{c:'neutre',t:"↔️ rien ne change samedi"}] },
    ] },
  { id:'agentTemps', quand: () => (S.sansJouer || 0) >= 4 && S.journee >= 8,
    titre:"Ton agent ne prend plus de gants",
    texte:"« Tu n'as pas joué depuis un moment. Je peux te sortir de là dès cet hiver, ou on serre les dents. Ce n'est pas la même carrière. »",
    options:[
      { l:"Qu'il cherche un club où tu joues", liens:{ agent:12, club:-8, coach:-3 },
        dit:[{c:'foot',t:"🤝 il décroche son téléphone"},{c:'risk',t:"🏟️ le club le saura"}] },
      { l:"Rester et se battre", liens:{ coach:6, club:5, agent:-4 }, axes:{ ment:1.2 },
        dit:[{c:'foot',t:"🎽 le coach le remarque"},{c:'risk',t:"🤝 ton agent soupire"}] },
      { l:"Ne pas répondre tout de suite", ment:-.8, coup:"cette décision que tu repousses",
        dit:[{c:'risk',t:"🧠 ça te travaille"},{c:'neutre',t:"🤝 il rappellera"}] },
    ] },
  // « Tu n'es même pas dans le groupe » : désormais c'est vrai quand ça s'affiche
  { id:'tempsLibre', quand: () => S.eqJour && S.eqJour.statut === 'hors',
    titre:"Un week-end à toi",
    texte:"Tu n'es même pas dans le groupe. Pour la première fois depuis longtemps, samedi t'appartient.",
    options:[
      { l:"Rentrer chez tes parents", axes:{ ment:1.4 }, corps:3, fit:4,
        dit:[{c:'vie',t:"🏡 deux jours qui font du bien"},{c:'foot',t:"🧠 tu respires"}] },
      { l:"Aller voir le match depuis la tribune", liens:{ coach:4, vestiaire:3 },
        dit:[{c:'foot',t:"🎽 il t'a vu dans les tribunes"},{c:'foot',t:"✊ le groupe aussi"}] },
      { l:"Travailler seul au centre", fit:-6, axes:{ spec:1.4 }, ment:-.6, coup:"ce samedi à t'entraîner seul",
        dit:[{c:'foot',t:"🎯 personne ne te le demandait"},{c:'risk',t:"🫁 tu y laisses ta semaine"},{c:'risk',t:"🧠 le stade te manque"}] },
    ] },
  /* LA VRAIE SITUATION QUAND ON NE JOUE PAS, MESURÉE. Dans la queue des
     carrières (dix matchs ou moins sur la saison), on est **hors du groupe 2,9 %
     des semaines et sur le banc 79,2 %** : « tu n'es même pas dans le groupe »
     ne pouvait donc presque jamais être vrai — c'était le défaut que le
     propriétaire a vu. La vie qu'il réclamait s'accroche donc au banc, là où elle
     se passe vraiment : le week-end n'est pas libre, mais le dimanche l'est. */
  { id:'bancLong', quand: () => S.eqJour && S.eqJour.statut === 'banc' && (S.sansJouer || 0) >= 3,
    titre:"Encore un survêtement",
    texte:"Tu voyages, tu t'échauffes, tu t'assois. Il ne se retourne pas. Dimanche, en revanche, t'appartient.",
    options:[
      { l:"Le passer avec les tiens", axes:{ ment:1.5 }, corps:3, fit:3,
        dit:[{c:'vie',t:"🏡 on ne te parle pas de foot"},{c:'foot',t:"🧠 tu reviens entier"}] },
      { l:"Rester seul sur le terrain après le match", fit:-7, axes:{ spec:1.3 }, liens:{ coach:3 },
        dit:[{c:'foot',t:"🎯 personne ne te le demandait"},{c:'foot',t:"🎽 l'adjoint l'a noté"},{c:'risk',t:"🫁 tu y laisses ta semaine"}] },
      { l:"Demander à l'adjoint ce qu'il regarde chez toi", liens:{ coach:6, vestiaire:2 }, axes:{ ment:.8 },
        dit:[{c:'foot',t:"🎽 il te répond franchement"},{c:'foot',t:"✊ ça circule dans le vestiaire"}] },
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
  // celle-ci suppose une semaine chargée : quand tu ne joues pas, `tempsLibre` prend le relais
  { id:'famille', quand: () => S.journee >= 9 && (S.sansJouer || 0) < 2,
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
  /* Le propriétaire, 27/09/2026 : « dans ma semaine, il n'y a que l'impact de
     mon choix d'entraînement. » La décision de la semaine y manquait : on la
     garde pour l'afficher à côté du compte rendu de séance. */
  S.semaineArret = { titre: a.titre, choix: o.l };
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
    /* L'âge pèse : depuis que ta place se décide dans le classement de tout
       l'effectif, c'est le principal frein d'un débutant, et un coach ne donne pas
       le onze à un joueur de dix-huit ans **en août**. Mais il se desserre au fil
       de la saison : à force de le voir tous les jours, il finit par te lancer.
       Sans ce dégel, un joueur mal classé en août l'était encore en mai, et sa
       saison n'avait aucune issue. */
    + Math.min(0, (S.moi.age <= 18 ? -8 : S.moi.age === 19 ? -5 : S.moi.age === 20 ? -2.5 : 0)
      + S.journee * .13);
}
function concurrentsDispos(){ return S.concurrents.filter(c => c.blesse <= 0); }
/* TOUS CEUX QUI JOUENT À TON POSTE, toi compris, classés comme le coach les
   classe. Tes rivaux nommés en font partie mais ils ne sont plus les seuls :
   c'est l'effectif entier qui se dispute les places, donc une blessure chez
   n'importe lequel d'entre eux te fait remonter d'un cran. */
function monPoste(){
  const l = groupe().filter(x => x.poste === S.moi.poste).map(x => ({
    nom:x.nom, niv:x.niv, dispo:x.dispo, rival: !!x.rival,
    raison: x.ref.susp > 0 ? "suspendu" : x.ref.blesse > 0 ? "\u00e0 l'infirmerie" : null }));
  l.push({ nom:S.moi.nom, niv:valeurAuPoste(), moi:true,
    dispo: S.etats.blessure <= 0 && S.etats.suspension <= 0,
    raison: S.etats.blessure > 0 ? "\u00e0 l'infirmerie" : S.etats.suspension > 0 ? "suspendu" : null });
  return l.sort((a, b) => b.niv - a.niv);
}
/* Celui qui te barre la route aujourd'hui, ou null si la voie est libre. */
function devantToi(){
  const d = concurrentsDispos(); if (!d.length) return null;
  const moi = valeurAuPoste();
  let best = null;
  d.forEach(c => { const v = c.niv + c.forme; if (v > moi && (!best || v > best.niv + best.forme)) best = c; });
  return best;
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
    /* La forme persiste davantage (.82 au lieu de .75) et le bruit est réduit :
       depuis que les notes la nourrissent, c'est elle qui raconte la série en
       cours, et un tirage qui l'écrase chaque journée lui retirait ce rôle. */
    j.forme = clamp((j.forme || 0) * .82 + rnd(-1.4, 1.4), -5, 5);
    j.rancune = (j.rancune || 0) * .55;      // on s'en remet en deux ou trois journées
    if (j.blesse <= 0 && Math.random() < .028) j.blesse = ri(1, 5);
    else if (j.susp <= 0 && Math.random() < .013) j.susp = ri(1, 2);
  });
  S.concurrents.forEach(c => { c.rancune = (c.rancune || 0) * .55; });
}
function bougerForme(j, d){ j.forme = clamp((j.forme || 0) + d, -5, 5); }
/* Sortir tôt, c'est une vexation. Le propriétaire, 27/09/2026 : « un joueur qui
   sort, il peut d'une certaine manière en vouloir au coach, donc il a moins de
   chances de jouer le match suivant. » `rancune` se retranche du choix du onze. */
function vexer(j, min){
  if (min < 62 && Math.random() < .4) j.rancune = Math.min(6, (j.rancune || 0) + 2.2);
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
/* « Un groupe, c'est 18 joueurs. Sur une équipe de 22, on peut dire qu'il y a
   toujours 4 absents du groupe » (le propriétaire, 27/09/2026). Les quatre
   laissés à la maison, s'ils ne sont ni blessés ni suspendus, **jouent avec la
   réserve** : ils ont du temps de jeu et une note, qui ne pèse pas autant que
   celle d'un match avec le onze. C'est ce qui permet à un jeune d'exister. */
const TAILLE_GROUPE = 18;
/* RENDEMENT DÉCROISSANT SUR LA NOTE (le propriétaire, 27/09/2026 : « s'il y a
   deux ou trois faits de match, il arrive parfois qu'on ait une note de 10, et
   le 10 ça doit quand même rester rare… le premier fait vaut un point, le
   deuxième 0,75, le troisième 0,5. Ça évite d'avoir une note de 10 si on met un
   doublé dans un match »). Sa proposition, appliquée telle quelle aux faits, et
   la même logique aux buts puisque c'est le doublé qu'il nomme. Symétrique : un
   deuxième fait raté ne coûte pas autant que le premier non plus. */
const POIDS_FAIT = [1, .75, .5, .35];
const POIDS_BUT = [.7, .5, .35, .25];
/* Pour un coéquipier, un but pèse plus que pour toi : sa note n'a pas de faits
   de match pour la porter, seulement ce que le film raconte de lui. */
const POIDS_BUT_AUTRE = [1.2, .85, .6, .4];
function cumul(n, table){
  let t = 0;
  for (let i = 0; i < n; i++) t += table[i] != null ? table[i] : table[table.length - 1];
  return t;
}
/* LE GROUPE, LE ONZE, LE BANC ET LA RÉSERVE — et ce que l'infirmerie coûte.
   On compare le onze réellement alignable au meilleur onze possible si tout le
   monde était valide : l'écart, étalé sur onze joueurs, est ce que le match
   perd. Un groupe profond l'absorbe, un groupe court le prend en pleine figure. */
function equipeDuJour(rot){
  const g = groupe();
  const absents = g.filter(x => !x.dispo);
  /* TU ES DANS LE MÊME POT QUE TOUT LE MONDE (le propriétaire, 27/09/2026 :
     « mes concurrents à mon poste, lorsqu'ils se blessent ou sont suspendus, si
     je suis hors du groupe je vais pas passer dans le groupe… imaginons le
     titulaire se blesse, faut que le remplaçant devienne titulaire et que celui
     qui était hors du groupe passe dans le groupe pour compenser »). Il avait
     raison, et la cause était structurelle : ta place se décidait **à part**
     (`monStatut()` te comparait à tes un ou deux rivaux nommés) pendant que le
     groupe et le onze se choisissaient sur l'effectif entier. Deux systèmes qui
     ne se parlaient pas. Désormais **une seule liste** : tu y entres avec ta
     valeur aux yeux du coach, et tout le reste en découle — une blessure chez un
     milieu fait remonter tout le monde d'un cran, toi compris. */
  const moi = { moi:true, nom:S.moi.nom, poste:S.moi.poste, niv:valeurAuPoste(),
    dispo: S.etats.blessure <= 0 && S.etats.suspension <= 0, ref:{} };
  const tout = [...g, moi];
  // le choix du coach : le niveau du jour, un peu de rotation, moins la rancune
  const R = rot == null ? ROTATION : rot;
  tout.forEach(x => x.choix = x.niv + rnd(-R, R) - (x.ref.rancune || 0));
  const tri = l => l.slice().sort((a, b) => b.choix - a.choix);
  const dispo = tri(tout.filter(x => x.dispo));
  /* On réserve d'abord de quoi aligner un onze à chaque poste, **plus un gardien
     de rechange**, puis on complète le groupe au mérite. Sans cette garantie, un
     gardien mal classé n'était pas convoqué et l'équipe partait sans personne
     dans les buts : mesuré, huit cas sur huit cents. */
  const conv = [];
  Object.entries(FORMATION).forEach(([po, n]) => {
    const besoin = n + (po === 'G' ? 1 : 0);
    conv.push(...dispo.filter(x => x.poste === po).slice(0, besoin));
  });
  dispo.forEach(x => { if (conv.length < TAILLE_GROUPE && !conv.includes(x)) conv.push(x); });
  const reserve = dispo.filter(x => !conv.includes(x));   // ils joueront avec la réserve

  const onze = [];
  let perte = 0;
  const trous = [];
  Object.entries(FORMATION).forEach(([po, n]) => {
    const pris = tri(conv.filter(x => x.poste === po)).slice(0, n);
    const ideal = tri(tout.filter(x => x.poste === po)).slice(0, n);
    onze.push(...pris);
    /* Chacun contre celui qu'il remplace, rang par rang : le cinquième défenseur
       se compare au quatrième, pas à zéro. Comparer les sommes brutes faisait
       compter un absent pour tout son niveau — mesuré, le onze perdait jusqu'à
       onze points de force pour trois blessés. */
    for (let i = 0; i < pris.length; i++) perte += pris[i].niv - ideal[i].niv;
    if (pris.length < n) trous.push({ po, n: n - pris.length });
  });
  /* Pas assez d'hommes à ce poste : quelqu'un dépanne. Un onze reste un onze, et
     **un joueur de champ peut aller dans les buts, l'inverse jamais**.
     LES TROUS SE BOUCHENT UNE FOIS TOUS LES POSTES SERVIS. Quand ça se faisait
     poste par poste, le dépanneur était pris dans un poste **pas encore traité**
     — et ce poste le reprenait ensuite, donc il était **deux fois dans le onze**.
     C'est ce que le propriétaire a vu à l'écran : plus de onze joueurs sans temps
     de jeu affiché (un titulaire compté deux fois à 90) et un nombre impair de
     joueurs sortis (un sortant compté deux fois). */
  trous.forEach(t => {
    perte -= t.n * 7;
    const reste = tri(conv.filter(x => !onze.includes(x) && (t.po === 'G' || x.poste !== 'G')));
    onze.push(...reste.slice(0, t.n));
  });
  const banc = conv.filter(x => !onze.includes(x));
  const statut = S.etats.blessure > 0 ? 'blesse' : S.etats.suspension > 0 ? 'suspendu'
    : onze.includes(moi) ? 'titulaire' : banc.includes(moi) ? 'banc' : 'hors';
  return { onze, banc, reserve, absents, ecart: perte / 11, statut, moi };
}

/* LES CHANGEMENTS. Le propriétaire, 27/09/2026 : « l'entraîneur, à chaque match,
   il fait des changements quand même, au moins 3 en général, parfois jusqu'à 5…
   une équipe qui perd va avoir tendance à faire des changements plus tôt et à
   faire des changements tactiques, là où une équipe qui gagne va faire rentrer
   des joueurs frais. » Trois entrées entre la 45ᵉ et la 68ᵉ (donc 25 à 45
   minutes), une ou deux en toute fin (5 à 15). Menés, on change plus tôt et on
   fait entrer devant ; devant, on renforce derrière. */
function planChangements(m, onze, banc){
  const etat = min => { let n = 0, e = 0;
    m.evs.filter(x => x.type === 'but' && x.min <= min).forEach(x => x.nous ? n++ : e++);
    return n - e; };
  const chg = [];
  // le gardien ne sort que blessé, et c'est rare : soit il commence, soit il regarde
  const gBanc = banc.find(x => x.poste === 'G');
  const gOnze = onze.find(x => x.poste === 'G');
  if (gBanc && gOnze && Math.random() < .05)
    chg.push({ min: ri(20, 70), entrant: gBanc, sortant: gOnze, gardien: true });

  const mene = etat(62) < 0;
  /* On juge sur `choix`, la lecture du coach **de ce jour-là**, et non sur le
     niveau brut : sinon le plus faible du onze — toi, à dix-huit ans — sortait
     systématiquement et n'entrait presque jamais. Mesuré avec `niv` : 62 % de
     sorties avant la fin et 55 % d'entrées depuis le banc. */
  const envie = x => x.choix + (mene ? { A:5, M:3, D:0, G:-99 }[x.poste] : { D:3.5, M:3, A:1, G:-99 }[x.poste]);
  /* Qui sort : celui qui rend le moins, et **les jambes**. « Une équipe qui gagne
     va faire entrer des joueurs frais, faire sortir les joueurs les plus
     fatigués. » Pour toi la fraîcheur est connue ; pour les autres, le tirage en
     tient lieu. Sans ce tirage, le coach sortait toujours les mêmes et tu ne
     sortais jamais : mesuré, 14 sorties sur 900 titularisations. */
  const jambes = mene ? .05 : .08;
  const laisse = x => x.choix + rnd(-3, 3) - (x.moi ? (100 - S.etats.fraicheur) * jambes : 0);
  /* ON REMPLACE UN JOUEUR PAR UN JOUEUR DE SON POSTE (le propriétaire, 27/09/2026,
     capture à l'appui : « les deux attaquants ont joué 90 minutes, mais moi j'en
     ai joué que 34, et il n'y en a aucun qui est sorti »). Le coach appariait
     entrants et sortants par ordre de mérite, sans regarder le poste : il faisait
     donc entrer un attaquant à la place d'un défenseur, et le 4-4-2 finissait en
     4-3-3 sans que personne ne l'ait décidé. Désormais on cherche d'abord son
     poste, puis un poste voisin, et le changement **tactique** — pousser devant
     quand on est mené, refermer derrière quand on mène — reste **un par match**. */
  const VOISIN = { D:['M'], M:['D', 'A'], A:['M'] };
  const TACTIQUE = mene ? { A:['D'], M:['D'] } : { D:['A'], M:['A'] };
  const dedans = new Set(chg.map(c => c.entrant));
  const dehors = new Set(chg.map(c => c.sortant));
  const nb = 3 + (Math.random() < .5 ? 1 : 0) + (Math.random() < .25 ? 1 : 0);
  /* Le changement tactique doit être **voulu**, pas un dernier recours : en
     dernier recours il ne sortait jamais (0 sur 6 250 mesurés), alors que le
     propriétaire l'avait demandé (« une équipe qui perd va faire des changements
     plus tôt et des changements tactiques »). Mené, le coach passe à trois devant
     une fois sur deux — et le film le dit, pour que ça se lise comme une
     décision et non comme une erreur de poste. */
  let tactiques = mene && Math.random() < .35 ? 0 : 1;
  /* Un changement hors poste dégarnit une ligne : sans garde-fou, deux d'affilée
     finissaient le match à deux défenseurs (mesuré : 2-5-3 et 2-6-2 dans 7 % des
     matchs). Une ligne ne peut perdre qu'un homme sur son effectif nominal. */
  const surPoste = { G:0, D:0, M:0, A:0 };
  onze.forEach(x => { if (surPoste[x.poste] != null) surPoste[x.poste]++; });
  chg.forEach(c => { if (c.sortant) surPoste[c.sortant.poste]--; if (c.entrant) surPoste[c.entrant.poste]++; });
  const peutSortir = po => surPoste[po] >= (FORMATION[po] || 0);
  for (let i = 0; i < nb; i++){
    const banc2 = banc.filter(x => x.poste !== 'G' && !dedans.has(x))
      .slice().sort((a, b) => envie(b) - envie(a));
    const sur = onze.filter(x => x.poste !== 'G' && !dehors.has(x))
      .slice().sort((a, b) => laisse(a) - laisse(b));
    let e = null, s = null;
    for (const cand of banc2){
      const pool = po => sur.filter(x => po.includes(x.poste));
      const ailleurs = po => pool(po).filter(x => peutSortir(x.poste));
      const veutTactique = tactiques < 1 && (TACTIQUE[cand.poste] || []).length
        && chg.filter(c => !c.gardien).length >= 1;
      const cible = (veutTactique ? ailleurs(TACTIQUE[cand.poste])[0] : null)
        || pool([cand.poste])[0]
        || ailleurs(VOISIN[cand.poste] || [])[0]
        || (tactiques < 1 ? ailleurs(TACTIQUE[cand.poste] || [])[0] : null);
      if (cible){ e = cand; s = cible;
        if (cible.poste !== cand.poste && !(VOISIN[cand.poste] || []).includes(cible.poste)) tactiques++;
        break; }
    }
    if (!e) break;
    dedans.add(e); dehors.add(s);
    surPoste[s.poste]--; surPoste[e.poste]++;
    const tact = s.poste !== e.poste && !(VOISIN[e.poste] || []).includes(s.poste);
    let min;
    if (chg.filter(c => !c.gardien).length < 3){ const b = ri(56, 68); min = etat(b) < 0 ? Math.max(45, b - ri(6, 12)) : b; }
    else min = ri(74, 86);
    chg.push({ min, entrant: e, sortant: s, tactique: tact });
  }
  return chg.sort((a, b) => a.min - b.min);
}


/* ================== LA COUPE ET L'EUROPE ==================
   Le propriétaire, 21/09/2026 : « la **coupe doit devenir jouable** — comme suite
   de décisions, pas de matchs à opérer » ; et le 27/09/2026 : « une fois qu'on a
   vu ça, on peut passer à l'Europe aussi, et à la coupe ».
   Elles se jouent **en milieu de semaine**, donc elles ne rallongent pas ta
   semaine : elles la **coûtent**. Un mercredi européen, c'est des jambes en moins
   samedi — c'est là qu'est l'arbitrage, et il n'a pas besoin d'un écran de plus.
   Tu ne les opères pas : tu les lis, exactement comme il le demandait. Ce que tu
   décides, c'est ta semaine en les sachant là, et ce que tu réponds au coach qui
   te propose de te ménager.
   Le coach **tourne davantage en coupe** (`ROTATION_COUPE`) : c'est la vérité du
   football, et ça donne au remplaçant une porte d'entrée qui n'existait pas. */
const J_COUPE = [8, 14, 20, 26, 31];
/* Les libellés portent leur préposition : « éliminés en seizièmes » se dit,
   « éliminés à les quarts » non. */
const TOURS_COUPE = ["en seizièmes", "en huitièmes", "en quarts", "en demi-finale", "en finale"];
const J_EURO = [3, 6, 10, 13, 17, 21, 24, 28, 33];
const TOURS_EURO = ["1re journée", "2e journée", "3e journée", "4e journée", "5e journée",
  "6e et dernière journée", "en quarts", "en demi-finale", "en finale"];
const ROTATION_COUPE = 7;
const PENTE_EURO = 4.2;   // un grand d'Europe est au-dessus d'un grand de France

function matchAnnexe(j){
  let i = J_COUPE.indexOf(j);
  if (i >= 0 && S.coupe && S.coupe.vivant) return { c:'coupe', t:i };
  i = J_EURO.indexOf(j);
  if (i >= 0 && S.euro && S.euro.engage && S.euro.vivant) return { c:'euro', t:i };
  return null;
}
/* Qui on affronte. En coupe, les premiers tours sont contre un petit club de
   division inférieure — c'est là que les surprises arrivent ; à partir des quarts
   c'est un club du championnat. En Europe, un club européen de l'époque. */
function advAnnexe(info){
  if (info.c === 'coupe'){
    if (info.t <= 1){
      const dedans = S.ligue.equipes.map(e => e.nom);
      const petits = (typeof FR_LOWER !== 'undefined' ? FR_LOWER : []).filter(n => !dedans.includes(n));
      const nom = petits.length ? pick(petits) : "un club de National";
      return { nom, force: Math.round(clamp(S.club.force - rnd(5, 16), 38, 76)), petit:true };
    }
    const autres = S.ligue.equipes.filter(e => e.nom !== S.club.nom);
    const e = pick(autres.slice(0, Math.max(4, Math.round(autres.length * (info.t >= 3 ? .35 : .6)))));
    return { nom:e.nom, force:e.force };
  }
  const dk = typeof decadeKey === 'function' ? decadeKey(S.annee) : '10';
  const eu = (typeof EU_CLUBS !== 'undefined' ? EU_CLUBS : []).filter(c => (c.s[dk] || 0) >= 2);
  if (!eu.length) return { nom:"un club européen", force: S.club.force };
  // plus on avance, plus on tombe sur du lourd
  const tri = eu.slice().sort((a, b) => (b.s[dk] || 0) - (a.s[dk] || 0));
  const c = pick(info.t >= 6 ? tri.slice(0, 10) : tri);
  return { nom:c.n, force: Math.round(clamp(52 + (c.s[dk] || 2) * PENTE_EURO, 46, 80)), euro:true };
}
/* Le match de mercredi : on le joue, on ne l'opère pas. Même moteur de score,
   même sélection (avec plus de rotation en coupe), mais pas de fait de match —
   ceux-là restent pour samedi, pour que la semaine garde ses trois clics. */
function jouerAnnexe(info){
  const adv = advAnnexe(info);
  const eq = equipeDuJour(info.c === 'coupe' ? ROTATION_COUPE : ROTATION);
  const ent = S.lignes[LIGNE_CLE[S.moi.poste]] - 50;
  const nous = S.club.force + eq.ecart + (vestiaire() - 50) * .04
    + (eq.statut === 'titulaire' ? (niveauJour() - S.club.force) * .12 : 0) + 1.2;
  const diff = nous - adv.force;
  let bn = poisson(tameXG(1.35 * Math.exp(diff / 19)));
  let be = poisson(tameXG(1.35 * Math.exp(-diff / 19)));
  const m = { comp: info.c, tour: info.t, adv: adv.nom, bn, be, statut: eq.statut,
    minutes: 0, note: null, buts: 0, passes: 0 };
  // un match à élimination directe se décide, même mal
  const groupe = info.c === 'euro' && info.t <= 5;
  if (!groupe && bn === be){
    m.prolong = true;
    if (Math.random() < .5 + diff * .012) bn += 1; else be += 1;
    m.bn = bn; m.be = be;
  }
  m.res = bn > be ? 'V' : bn < be ? 'D' : 'N';
  // ton match : le même calcul de temps de jeu, en plus simple
  if (eq.statut === 'titulaire') m.minutes = Math.random() < .25 ? ri(55, 80) : 90;
  else if (eq.statut === 'banc' && Math.random() < (info.c === 'coupe' ? .6 : .45)) m.minutes = ri(12, 45);
  if (m.minutes){
    const derriere = S.moi.poste === 'G' || S.moi.poste === 'D';
    const chance = { G:0, D:.055, M:.155, A:.28 }[S.moi.poste]
      * clamp(1 + (S.moi.base.spec - 50) * .006, .7, 1.3) * (m.minutes / 90);
    for (let k = 0; k < bn; k++){
      if (Math.random() < chance) m.buts++;
      else if (Math.random() < { G:0, D:.10, M:.24, A:.18 }[S.moi.poste] * (m.minutes / 90)) m.passes++;
    }
    m.note = Math.round(clamp(6.1 + (m.res === 'V' ? .5 : m.res === 'D' ? -.4 : 0)
      + cumul(m.buts, POIDS_BUT) + m.passes * .4
      + (derriere ? (be === 0 ? .8 : be >= 4 ? -.7 : 0) : 0)
      + (niveauJour() - S.club.force) * .05 + aleaNote(), 3, 10) * 10) / 10;
    S.stats.matchs++; S.stats.buts += m.buts; S.stats.passes += m.passes;
    S.stats.minutes += m.minutes; S.stats.notes.push(m.note);
    if (eq.statut === 'titulaire') S.stats.titus++;
    bougerLigne(LIGNE_CLE[S.moi.poste], (m.note - 6.1) * .9);
    if (m.note < 5.6) coutMental(1.2, `ce mercredi à ${adv.nom}`);
  }
  // mercredi coûte samedi : c'est tout l'intérêt
  S.etats.fraicheur = clamp(S.etats.fraicheur - (m.minutes ? 7 + m.minutes * .14 : 4));
  S.etats.fond = clamp(S.etats.fond - 1);
  suiteAnnexe(info, m);
  return m;
}
/* Ce que le résultat fait à la compétition : on avance, on sort, on compte. */
function suiteAnnexe(info, m){
  const nom = info.c === 'coupe' ? 'Coupe' : 'Europe';
  if (info.c === 'coupe'){
    S.coupe.hist.push({ t:info.t, adv:m.adv, bn:m.bn, be:m.be });
    if (m.res === 'V'){
      S.coupe.tour = info.t + 1;
      if (info.t === TOURS_COUPE.length - 1){
        S.coupe.vivant = false; S.coupe.gagnee = true;
        jrn('trophee', `🏆 Vous gagnez la Coupe, ${m.bn}-${m.be} contre ${m.adv}.`);
      } else jrn('coupe', `Coupe ${TOURS_COUPE[info.t]} : ${m.bn}-${m.be} contre ${m.adv}. Ça continue.`);
    } else {
      S.coupe.vivant = false;
      jrn('coupe', `Coupe : éliminés ${TOURS_COUPE[info.t]}, ${m.bn}-${m.be} contre ${m.adv}.`);
    }
    return;
  }
  S.euro.hist.push({ t:info.t, adv:m.adv, bn:m.bn, be:m.be });
  if (info.t <= 5){
    S.euro.pts += m.res === 'V' ? 3 : m.res === 'N' ? 1 : 0;
    if (info.t === 5){
      // deux qualifiés sur quatre : huit points suffisent presque toujours
      S.euro.vivant = S.euro.pts >= 8;
      jrn('euro', S.euro.vivant
        ? `Europe : qualifiés pour les quarts avec ${S.euro.pts} points.`
        : `Europe : éliminés en phase de groupes avec ${S.euro.pts} points.`);
    } else jrn('euro', `Europe, ${TOURS_EURO[info.t]} : ${m.bn}-${m.be} contre ${m.adv}.`);
    return;
  }
  if (m.res === 'V'){
    if (info.t === J_EURO.length - 1){
      S.euro.vivant = false; S.euro.gagnee = true;
      jrn('trophee', `🏆 Vous gagnez l'Europe, ${m.bn}-${m.be} contre ${m.adv}.`);
    } else jrn('euro', `Europe ${TOURS_EURO[info.t]} : ${m.bn}-${m.be} contre ${m.adv}. Ça continue.`);
  } else {
    S.euro.vivant = false;
    jrn('euro', `Europe : éliminés ${TOURS_EURO[info.t]}, ${m.bn}-${m.be} contre ${m.adv}.`);
  }
}
/* Ce qu'on dit du mercredi qui vient, sur l'écran de la semaine : la décision
   d'entraînement doit le savoir. */
function direMercredi(){
  const info = matchAnnexe(S.journee);
  if (!info) return null;
  return info.c === 'coupe'
    ? `Mercredi, la Coupe ${TOURS_COUPE[info.t]}.`
    : `Mercredi, l'Europe — ${TOURS_EURO[info.t]}.`;
}

function lancerMatch(){
  const adv = adversaire(S.journee);
  const eq = equipeDuJourLue();
  const statut = eq.statut;
  const nous = S.club.force + eq.ecart + (vestiaire() - 50) * .04
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
    onze: eq.onze, banc: eq.banc, reserve: eq.reserve,
    absents: eq.absents.map(x => ({ nom:x.nom, poste:x.poste,
      raison: (x.ref.susp > 0 ? 'susp' : 'blesse') })), ecartOnze: eq.ecart };

  // les buts, répartis dans le temps
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

  /* TON TEMPS DE JEU SORT DES MÊMES CHANGEMENTS QUE CELUI DES AUTRES. Tu es une
     ligne du banc comme les autres si tu n'es pas titulaire, et une ligne du onze
     si tu l'es : tu peux donc sortir avant l'heure, comme n'importe qui. */
  const chg = planChangements(m, eq.onze, eq.banc);
  m.chg = chg;
  let entree = 0, sortie = 90;
  const monEntree = chg.find(c => c.entrant && c.entrant.moi);
  const maSortie = chg.find(c => c.sortant && c.sortant.moi);
  if (statut === 'titulaire'){ sortie = maSortie ? maSortie.min : 90; m.minutes = sortie; }
  else if (statut === 'banc' && monEntree){ entree = monEntree.min; m.minutes = 90 - entree; }
  m.sorti = statut === 'titulaire' && !!maSortie ? sortie : 0;

  // un carton peut être le mien : c'est lui qui compte pour la suspension
  const pCarton = { G:.04, D:.30, M:.26, A:.16 }[S.moi.poste];
  evs.filter(e => (e.type === 'jaune' || e.type === 'rouge') && e.nous).forEach(e => {
    if (m.minutes && e.min >= entree && e.min <= sortie && Math.random() < pCarton) e.moi = true;
    e.qui = e.moi ? S.moi.nom : surLeBanc(m, e.min, 'carton');
  });
  /* UN EXPULSÉ NE FINIT PAS LE MATCH, ET C'EST LA SEULE FAÇON D'AVOIR UN NOMBRE
     IMPAIR DE JOUEURS SORTIS (le propriétaire, 27/09/2026 : « c'est forcément un
     nombre pair sauf s'il y a un carton rouge — mais c'est pas indiqué »). Le
     rouge ne changeait rien : l'expulsé gardait ses 90 minutes, et pouvait même
     être remplacé après coup. On le choisit donc parmi ceux qui devaient finir le
     match, et son temps de jeu s'arrête là. */
  const finissent = new Set((m.onze || []).filter(x => !chg.some(c => c.sortant === x)));
  m.expulses = [];
  evs.filter(e => e.type === 'rouge' && e.nous).forEach(e => {
    // un rouge à la 90ᵉ laissait l'expulsé à 90 minutes, donc invisible au compte
    if (e.min > 88) e.min = 88;
    if (!e.moi){
      const l = [...finissent].filter(x => !x.moi);
      if (!l.length){ e.nous = false; e.qui = buteurAdverse(adv) || adv.nom; return; }
      const x = pick(l); finissent.delete(x); e.qui = x.nom;
    }
    m.expulses.push({ nom: e.qui, min: e.min });
  });
  /* « Sortie sur blessure » doit être une vraie sortie : l'événement nommait
     quelqu'un qui restait sur le terrain jusqu'à la fin. On l'accroche désormais
     à un changement réel — le film, les minutes et la pastille disent la même
     chose — et s'il n'y en a aucun, il n'y a pas de blessé. */
  m.evs = evs = evs.filter(e => {
    if (e.type !== 'blessure' || !e.nous) return true;
    const l = chg.filter(c => c.sortant && !c.sortant.moi);
    if (!l.length) return false;
    const c = pick(l); e.min = c.min; e.qui = c.sortant.nom; e.sortie = true;
    return true;
  });
  evs.sort((a, b) => a.min - b.min);   // la blessure a changé de minute
  /* Ton propre rouge arrête ton match ici, avant les buts et les faits de match :
     sinon tu marquais à la 80ᵉ après avoir été expulsé à la 60ᵉ. */
  const monRouge = evs.find(e => e.type === 'rouge' && e.nous && e.moi);
  if (monRouge && m.minutes){
    /* Expulsé, tu n'es pas remplacé : le changement prévu n'a pas lieu. Sans ça,
       le film disait « tu sors à la 79ᵉ » après t'avoir exclu à la 67ᵉ, et ton
       remplaçant prenait une note pour un temps de jeu qui n'existait pas. */
    for (let i = chg.length - 1; i >= 0; i--) if (chg[i].sortant && chg[i].sortant.moi) chg.splice(i, 1);
    sortie = monRouge.min; m.minutes = sortie - entree; m.sorti = 0;
  }

  // qui marque chez nous : moi si je suis sur le terrain, sinon un coéquipier
  /* Le bonus de `spec` était **additif** (`+ (spec-50)*.002`), donc il s'appliquait
     même à un poste dont la chance de marquer est zéro : mesuré sur des carrières
     entières, un **gardien marquait trois buts par saison** et finissait à 63 buts.
     Il est désormais multiplicatif : il amplifie ce que ton poste permet, il ne
     crée rien. À spec 50 (la première saison) il ne change rien du tout. */
  /* TA PART DES BUTS DE L'ÉQUIPE. À .38, un attaquant prenait plus d'un but sur
     trois de son club — alors qu'ils sont deux devant et cinq dans le groupe. Ce
     n'était pas visible sur une saison (11,6 buts pour une recrue de dix-huit ans
     au bas du tableau) mais sur une carrière oui : **36 buts par saison au sommet
     et 732 en tout**, le double de ce qu'un grand attaquant marque. Resserré à
     .28 : le meilleur buteur d'une équipe en prend un peu plus du quart, ce qui
     est ce qu'on voit dans un vrai championnat. */
  const chance = { G:0, D:.055, M:.155, A:.28 }[S.moi.poste]
    * (S.moi.poste === 'A' ? 1 + ent * .012 : 1)
    * clamp(1 + (S.moi.base.spec - 50) * .006, .7, 1.3);
  const chancePasse = { G:0, D:.10, M:.24, A:.18 }[S.moi.poste]
    * (S.moi.poste === 'M' ? 1 + ent * .012 : 1);
  evs.filter(e => e.type === 'but' && e.nous).forEach(e => {
    const surLeTerrain = m.minutes && e.min >= entree && e.min <= sortie;
    if (surLeTerrain && Math.random() < chance){ e.moi = true; m.buts++; }
    else if (surLeTerrain && Math.random() < chancePasse){ e.passeMoi = true; m.passes++; }
    e.qui = e.moi ? S.moi.nom : surLeBanc(m, e.min, 'but');
    /* Un but a souvent un passeur, et jusqu'ici seul le tien existait : les
       coéquipiers marquaient tout seuls. Le film le dit, et la note le compte. */
    if (!e.passeMoi && Math.random() < .55){
      const p = surLeBanc(m, e.min, 'but');
      if (p !== e.qui) e.passe = p;
    }
  });
  /* Le buteur d'en face a un nom : c'est le premier bénéfice visible de leur
     donner un effectif. Un attaquant marque plus souvent qu'un défenseur. */
  evs.filter(e => e.type === 'but' && !e.nous).forEach(e => e.qui = buteurAdverse(adv) || adv.nom);
  // faits de match  // faits de match : zéro à deux, seulement si je suis sur le terrain
  if (m.minutes){
    const n = Math.random() < .45 ? 0 : Math.random() < .8 ? 1 : 2;
    for (let i = 0; i < n; i++){
      const f = pick(MOMENTS[S.moi.poste]);
      const bas = Math.max(entree + 2, 10), haut = Math.min(sortie - 2, 88);
      if (haut > bas && !m.moments.some(x => x.id === f.id))
        m.moments.push({ ...f, min: ri(bas, haut) });
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
  m.entree = entree;
  m.arret = S.semaineArret || null; S.semaineArret = null;
  m.annexe = S.annexe || null; S.annexe = null;
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
/* LE VIVIER DES AUTRES CLUBS. Dix-sept adversaires à vingt-deux joueurs, il en
   faut près de quatre cents distincts : les quarante de `NOMS` ne suffisent pas.
   Un joueur adverse porte une initiale (« A. Sagna »), tes coéquipiers non — on
   connaît les siens par leur nom. */
const NOMS_ADV = [
  "Abadie", "Amrani", "Andrieu", "Angevin", "Aubry", "Bacar", "Badji", "Balde",
  "Barreto", "Bastos", "Baudry", "Beaumont", "Bellanger", "Benali", "Benitez", "Bernard",
  "Berthier", "Besson", "Bianchi", "Bocquet", "Bonnet", "Bordes", "Bourgeois", "Boutin",
  "Brancato", "Brisset", "Cabral", "Cadiou", "Camara", "Cardoso", "Carlier", "Carpentier",
  "Castel", "Cavalli", "Chabert", "Chapuis", "Charrier", "Chauvin", "Clement", "Cointe",
  "Colin", "Cormier", "Costa", "Coulibaly", "Courtois", "Crespo", "Dabo", "Dagba",
  "Daniel", "Danjou", "Darmon", "Dauphin", "Delage", "Delaunay", "Deschamps", "Desmarets",
  "Devaux", "Dieng", "Dione", "Dubois", "Ducret", "Dufour", "Dumas", "Dupire",
  "Durand", "Eloi", "Esteves", "Fabre", "Faivre", "Fall", "Fauvel", "Ferrand",
  "Fournier", "Fresnel", "Gaillard", "Galtier", "Gantier", "Garcia", "Gaspard", "Gauthier",
  "Gendron", "Genest", "Gomis", "Gonçalves", "Goncalves", "Gosselin", "Goujon", "Gourdon",
  "Grandin", "Grasset", "Gremont", "Guerin", "Guilbert", "Haddad", "Hamon", "Herault",
  "Hulot", "Imbert", "Jacquet", "Jallet", "Janvier", "Joubert", "Jourdain", "Kanté",
  "Karim", "Kebe", "Kerbrat", "Khelifi", "Labbé", "Lacroix", "Lagarde", "Lambert",
  "Lanvin", "Laporte", "Larose", "Lassalle", "Laurent", "Lebreton", "Leclerc", "Ledoux",
  "Lefranc", "Legrand", "Lemarchand", "Leroy", "Lesage", "Lombard", "Loiseau", "Lopes",
  "Lucas", "Maillard", "Malinowski", "Mangin", "Marechal", "Marinho", "Martel", "Martins",
  "Masson", "Mathieu", "Maurel", "Menard", "Mercier", "Meunier", "Michaud", "Millet",
  "Miranda", "Monnier", "Montel", "Morel", "Moulin", "Nallet", "Navarro", "Nectoux",
  "Neveu", "Nicolas", "Nogueira", "Nunes", "Obispo", "Olivier", "Ouattara", "Paillard",
  "Pascal", "Pastore", "Payet", "Pelletier", "Peron", "Petit", "Pichon", "Pinto",
  "Poirier", "Pontet", "Pouget", "Prevost", "Quentin", "Rabier", "Ramos", "Raynaud",
  "Rebelo", "Regnier", "Remy", "Renaud", "Ribeiro", "Richard", "Rivet", "Robin",
  "Rocha", "Rodrigues", "Rolland", "Roques", "Rouault", "Rouvier", "Sabatier", "Sagna",
  "Salmon", "Sanchez", "Sangaré", "Sauvage", "Savary", "Schmitt", "Sebastien", "Seck",
  "Serrano", "Sissoko", "Soares", "Sorel", "Sow", "Stefani", "Talbot", "Tanguy",
  "Teixeira", "Theron", "Thibault", "Thomas", "Toure", "Tremblay", "Turpin", "Valero",
  "Vallet", "Varela", "Vasconcelos", "Verdier", "Vergne", "Verne", "Vial", "Vidal",
  "Vieira", "Vigier", "Vincent", "Vitali", "Voisin", "Weber", "Zanetti", "Zerbo"];
const INITIALES = "ABCDEFGHJKLMNOPRSTVY".split("");

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
    m.note = clamp(6.1 + (res === 'V' ? .5 : res === 'D' ? -.4 : 0)
      + cumul(m.buts, POIDS_BUT) + m.passes * .4
      + (derriere ? (m.be === 0 ? 1 : m.be === 1 ? .35 : m.be >= 4 ? -.5 : 0) : 0)
      /* Un fait de match pèse **un point de note**, pas trois dixièmes (demande du
         propriétaire, 27/09/2026 : « on fait quasiment que des matchs corrects, il
         n'y a pas de très bons ni de très mauvais matchs ; on peut appuyer un peu
         plus sur l'impact des faits de match sur la note, avec un point en plus ou
         en moins »). C'est ce qui fait qu'une saison a des soirs de gala et des
         soirs qu'on veut oublier. */
      + (niveauJour() - S.club.force) * .035
      + cumul(m.moments.filter(f => f.reussi).length, POIDS_FAIT)
      - cumul(m.moments.filter(f => f.reussi === false).length, POIDS_FAIT)
      - (m.perduLeFil ? .7 : 0) + (m.moments.some(f => f.tenu) ? .35 : 0) + aleaNote(), 3, 10);
    m.note = Math.round(m.note * 10) / 10;
    S.sansJouer = 0;
    S.stats.matchs++; S.stats.minutes += m.minutes; S.stats.buts += m.buts; S.stats.passes += m.passes;
    S.stats.notes.push(m.note); if (m.statut === 'titulaire') S.stats.titus++;
    /* Entrer en jeu coûte moins que commencer : on arrive frais, sur une demi-heure.
       Depuis que tu entres 71 % des fois où tu es sur le banc, le total de minutes
       a bondi et la fraîcheur s'effondrait — « lever le pied » redevenait la
       meilleure politique partout, ce qui tue le choix de la semaine. */
    S.etats.fraicheur = clamp(S.etats.fraicheur
      - (m.minutes / 90) * ri(10, 16) * (m.entree ? .7 : 1) * (1 - S.etats.fond * .0022));
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
    /* Le propriétaire : « un joueur qui sort, il peut en vouloir au coach. »
       Pour toi ça se paie en tête et en confiance du coach, pas en rancune. */
    if (m.sorti && m.sorti < 62){
      coutMental(1.2, `cette sortie à la ${m.sorti}e minute`);
      S.liens.coach = clamp(S.liens.coach - 1);
    }
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
    /* Un coach ne perd pas indéfiniment confiance en quelqu'un qu'il n'utilise
       simplement pas. Sans ce plancher, ne pas jouer faisait baisser `coach`,
       qui pèse .16 dans `valeurAuPoste()`, donc on jouait encore moins : la même
       spirale que celle du mental, et la seule porte de sortie se refermait. */
    if (S.liens.coach > 42) S.liens.coach = clamp(S.liens.coach - (m.statut === 'banc' ? .5 : .2));
    S.sansJouer = (S.sansJouer || 0) + 1;
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
  /* `m.res` était posé APRÈS `notesEquipe(m)`, qui le lit : le bonus de victoire
     sur les notes des coéquipiers valait donc toujours zéro. */
  m.res = res;
  notesEquipe(m);
  /* Hors du groupe mais valide : tu as joué avec la réserve. Ça ne compte pas
     dans tes statistiques de première, mais une bonne sortie se voit — c'est la
     route du retour, celle qui manquait à un jeune écarté du groupe. */
  if (m.noteReserve != null){
    S.reserveMatchs = (S.reserveMatchs || 0) + 1;
    S.liens.coach = clamp(S.liens.coach + (m.noteReserve - 6.1) * .5);
    S.etats.fraicheur = clamp(S.etats.fraicheur - ri(4, 8));
    S.etats.forme = clamp(S.etats.forme + (m.noteReserve >= 7 ? 3 : m.noteReserve >= 6 ? 1 : -2));
    m.mvtReserve = m.noteReserve >= 7 ? "Le coach a eu un retour sur ton match."
      : m.noteReserve >= 6 ? "Une sortie correcte, rien de plus." : "Même là, tu n'as pas existé.";
  }
  autresMatchs();
  S.dernier = m;
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
  if (m.noteReserve != null) m.mvt.push({ k:'reserve', up: m.noteReserve >= 6.1, mot: m.mvtReserve });
  jrn('match', `J${S.journee + 1} · ${m.adv.dom ? S.club.nom + ' – ' + m.adv.nom : m.adv.nom + ' – ' + S.club.nom} ${m.adv.dom ? m.bn + '-' + m.be : m.be + '-' + m.bn}`
    + (m.minutes ? ` · toi : ${m.minutes} min, note ${nb(m.note)}${m.buts ? `, ${m.buts} but${m.buts > 1 ? 's' : ''}` : ''}${m.passes ? `, ${m.passes} passe${m.passes > 1 ? 's' : ''}` : ''}` : ` · ${m.statut === 'banc' ? 'resté sur le banc' : m.statut === 'blesse' ? "à l'infirmerie" : m.statut === 'suspendu' ? 'suspendu' : 'hors du groupe'}`)
    + (m.noteReserve != null ? ` · match avec la réserve, note ${nb(m.noteReserve)}` : '')
    + (m.blessure ? ` · sorti touché, ${m.blessure} journée${m.blessure > 1 ? 's' : ''} d'absence` : '')
    + (m.suspendu ? ` · suspendu ${m.suspendu} match${m.suspendu > 1 ? 's' : ''}` : ''));
  S.ecran = 'resultat'; sauver(); rendre();
}
/* « On ne connaît pas la note de ses coéquipiers, du coup on ne sait pas si on a
   fait un bon match par rapport à l'ensemble de l'équipe. » Les onze titulaires
   **et les remplaçants entrés** reçoivent leur note ; ceux qui n'étaient pas dans
   le groupe jouent avec la réserve et reçoivent la leur, à part. */
function surLeTerrainA(m, min){
  const dehors = new Set();
  (m.chg || []).forEach(c => { if (c.min <= min && c.sortant) dehors.add(c.sortant); });
  const l = (m.onze || []).filter(x => !dehors.has(x));
  (m.chg || []).forEach(c => { if (c.min <= min && c.entrant && !dehors.has(c.entrant)) l.push(c.entrant); });
  return l;
}
/* Qui marque, qui prend le carton, qui sort blessé : quelqu'un qui est vraiment
   sur le terrain. `coequipier()` tirait un nom au hasard dans la liste des noms,
   donc un buteur qui ne joue même pas au club. */
function surLeBanc(m, min, genre){
  const l = surLeTerrainA(m, min).filter(x => !x.moi && (genre !== 'but' || x.poste !== 'G'));
  return l.length ? pick(l).nom : coequipier();
}
function notesEquipe(m){
  const bonus = m.res === 'V' ? .55 : m.res === 'D' ? -.45 : 0;
  const joueurs = [];
  S.equipe.forEach(j => { j.note = null; j.noteR = null; });
  S.concurrents.forEach(c => { c.note = null; c.noteR = null; });
  const sorti = new Map();
  (m.chg || []).forEach(c => { if (c.sortant) sorti.set(c.sortant, c.min); });
  // un expulsé s'arrête à la minute de son rouge : c'est ce qui rend le nombre
  // de joueurs sortis impair, et la pastille 🟥 le dit à côté de sa note
  const expulse = new Map((m.expulses || []).map(x => [x.nom, x.min]));
  const blesses = new Set((m.evs || []).filter(e => e.nous && e.type === 'blessure').map(e => e.qui));

  /* CE QU'ILS ONT FAIT DOIT SE VOIR DANS LEUR NOTE (le propriétaire, 27/09/2026 :
     « le joueur qui met un triplé ou un doublé, dans la note du match, ça va pas
     se ressentir »). Mesuré avant : un buteur tournait à 6,48 contre 6,15 sans
     but, et un triplé à 7,22 — et encore, seulement parce qu'une équipe qui
     marque gagne. Rien ne reliait le film à la note. Les buts, les passes et les
     cartons des coéquipiers y entrent maintenant, avec le même rendement
     décroissant que pour toi. */
  const faits = {};
  const compte = (nom, k) => { if (!nom) return; faits[nom] = faits[nom] || { b:0, p:0, j:0, r:0 }; faits[nom][k]++; };
  (m.evs || []).filter(e => e.nous).forEach(e => {
    if (e.type === 'but'){ compte(e.qui, 'b'); compte(e.passe, 'p'); }
    if (e.type === 'jaune') compte(e.qui, 'j');
    if (e.type === 'rouge') compte(e.qui, 'r');
  });
  const noter = (x, minutes) => {
    if (x.moi || !x.ref) return;
    const derriere = x.poste === 'G' || x.poste === 'D';
    /* Moins de minutes, moins d'écart : un joueur entré à la 80ᵉ ne fait ni un 10
       ni un 3, sa note colle à la moyenne. C'est aussi ce qui fait que la note
       d'un remplaçant ne pèse pas comme celle d'un titulaire. */
    const a = minutes >= 70 ? 1 : minutes >= 30 ? .72 : .45;
    const f = faits[x.nom] || { b:0, p:0, j:0, r:0 };
    const n = 6.1 + (bonus + (x.niv - S.club.force) * .05 + rnd(-1.3, 1.3)
      + (derriere ? (m.be === 0 ? .8 : m.be >= 4 ? -.7 : 0) : 0)) * a
      + cumul(f.b, POIDS_BUT_AUTRE) + f.p * .4 - f.j * .25 - f.r * 1.3;
    x.ref.note = Math.round(clamp(n, 3, 10) * 10) / 10;
    x.ref.sum = (x.ref.sum || 0) + x.ref.note; x.ref.nb = (x.ref.nb || 0) + 1;
    // une bonne note, c'est une place la semaine prochaine
    bougerForme(x.ref, (x.ref.note - 6.1) * .9 * a);
    /* CE QU'ILS ONT FAIT SE LIT À CÔTÉ DE LEUR NOTE (le propriétaire, 27/09/2026 :
       « sur les notes des joueurs, ceux qui ont marqué un but, ceux qui ont fait
       une passe décisive, ceux qui ont pris des cartons, ceux qui se sont blessés,
       comme on avait fait avant »). Les mêmes faits que ceux qui nourrissent la
       note, donc le film et la note ne peuvent pas se contredire. */
    joueurs.push({ nom:x.nom, poste:x.poste, note:x.ref.note, rival: !!x.rival, min: minutes,
      f: { b:f.b, p:f.p, j:f.j, r:f.r, bl: blesses.has(x.nom) ? 1 : 0 } });
  };
  (m.onze || []).forEach(x => noter(x,
    expulse.has(x.nom) ? expulse.get(x.nom) : sorti.has(x) ? sorti.get(x) : 90));
  (m.chg || []).forEach(c => { if (c.entrant) noter(c.entrant, 90 - c.min); });

  /* LA RÉSERVE. « Ceux qui sont pas dans le groupe, s'ils sont pas blessés ou
     suspendus, ils jouent avec la réserve, donc ils ont du temps de jeu et donc
     une note — mais elle n'a pas le même impact que celle du joueur qui a joué
     avec le onze. » Elle est comptée à part (`sumR`/`nbR`) et pèse un tiers sur
     la forme : c'est la route lente vers le groupe, et elle existe. */
  (m.reserve || []).forEach(x => {
    if (x.moi){
      // hors du groupe mais valide : toi aussi, tu joues avec la réserve
      m.noteReserve = Math.round(clamp(6.1 + (x.niv - S.club.force) * .04 + rnd(-1.5, 1.5), 3, 10) * 10) / 10;
      return;
    }
    if (!x.ref) return;
    const n = clamp(6.1 + (x.niv - S.club.force) * .04 + rnd(-1.5, 1.5), 3, 10);
    x.ref.noteR = Math.round(n * 10) / 10;
    x.ref.sumR = (x.ref.sumR || 0) + x.ref.noteR; x.ref.nbR = (x.ref.nbR || 0) + 1;
    bougerForme(x.ref, (x.ref.noteR - 6.1) * .3);
  });
  m.reserveVue = (m.reserve || []).filter(x => x.ref && !x.moi)
    .map(x => ({ nom:x.nom, poste:x.poste, note:x.ref.noteR }));

  // sortir tôt, c'est une vexation : on s'en souvient deux ou trois journées
  (m.chg || []).forEach(c => { if (c.sortant && c.sortant.ref && !c.sortant.moi) vexer(c.sortant.ref, c.min); });

  if (m.minutes && m.note != null){
    /* TES BUTS DE FAIT DE MATCH N'AVAIENT PAS DE PASTILLE (le propriétaire,
       27/09/2026, capture à l'appui : l'entête dit « 1 but » et la ligne de notes
       n'affiche que la passe). `faits` est construit depuis `m.evs`, or un but
       marqué sur un fait de match fait `m.bn++ ; m.buts++` **sans créer
       d'événement** : il était donc invisible. On lit `m.buts`, qui est le vrai
       total, exactement comme la note le fait déjà. */
    const mien = faits[S.moi.nom] || { b:0, p:0, j:0, r:0 };
    joueurs.push({ nom:S.moi.nom, poste:S.moi.poste, note:m.note, moi:true, min:m.minutes,
      // ta passe décisive ne passe pas par `faits` : elle est marquée `passeMoi`
      f: { b:m.buts || 0, p:m.passes || 0, j:mien.j, r:mien.r, bl:0 } });
  }
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
  /* Le film garde les changements, mais en noms : les objets du groupe portent
     une référence vers l'effectif, et les sérialiser dans la sauvegarde en
     ferait des copies — deux joueurs pour un seul nom au rechargement. */
  m.chgVus = (m.chg || []).map(c => ({ min:c.min,
    e: c.entrant ? c.entrant.nom : '', s: c.sortant ? c.sortant.nom : '',
    moiE: !!(c.entrant && c.entrant.moi), moiS: !!(c.sortant && c.sortant.moi),
    tact: !!c.tactique, pe: c.entrant ? c.entrant.poste : '', ps: c.sortant ? c.sortant.poste : '' }));
  delete m.onze; delete m.banc; delete m.reserve; delete m.chg;
}
/* Qui tourne bien, qui décroche, et où tu te situes là-dedans. */
function moyDe(j){ return j.nb ? j.sum / j.nb : null; }
function moyReserve(j){ return j.nbR ? j.sumR / j.nbR : null; }
function effectifTrie(){
  const l = [];
  S.equipe.forEach(j => l.push({ nom:j.nom, poste:j.poste, age:j.age, nb:j.nb || 0,
    moy: moyDe(j), res: moyReserve(j), nbR: j.nbR || 0,
    cle: LIGNE_DU_POSTE[j.poste], monte: !!j.monte,
    blesse: j.blesse > 0, susp: j.susp > 0, boude: (j.rancune || 0) > 1.5 }));
  S.concurrents.forEach(c => l.push({ nom:c.nom, poste:S.moi.poste, age:c.age, nb:c.nb || 0,
    moy: moyDe(c), res: moyReserve(c), nbR: c.nbR || 0,
    cle: LIGNE_DU_POSTE[S.moi.poste], rival:true, blesse: c.blesse > 0 }));
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
/* LA QUALITÉ ET LE DÉFAUT SE DÉCOUVRENT À LA CRÉATION, PAS EN JOUANT (le
   propriétaire, 27/09/2026 : « pour les qualités et défauts, il faut que ce soit
   dans la page de création qu'on les découvre. Une fois qu'on a choisi ce qu'on
   voulait pour la partie hors football, on doit les voir apparaître. C'est bien
   s'il y a une petite animation comme une roulette »). Ils étaient révélés au
   fil des matchs par `decouverte()`, ce qui les faisait apparaître dans « Ta
   situation « sans qu'on sache ce qu'ils étaient. `nouvellePartie()` les pose
   donc **déjà vus**, et l'écran du tirage les montre avant le premier match. */

/* ---------- la suite ---------- */
function apresMatch(){
  const d = S.dernier;
  S.eqJour = null;                 // le groupe de samedi ne vaut que pour samedi
  vivreConcurrents(); vivreEquipe();
  S.equipe.forEach(j => { if (j.monte) j.niv = Math.min(j.niv + .35, S.club.force + 12); });
  /* Une entente qui ne bouge pas n'existe pas — mais elle ne doit pas s'échapper
     non plus : un rappel de 1 % vers 50 tient l'écart-type autour de sept points,
     assez pour que les arrêts et le match pèsent plus que le hasard. */
  LIGNES.forEach(k => S.lignes[k] = clamp(S.lignes[k] * .99 + .5 + rnd(-1.8, 1.8)));
  S.ligneRef = S.ligneRef || { ...S.lignes };
  LIGNES.forEach(k => S.ligneRef[k] = S.ligneRef[k] * .82 + S.lignes[k] * .18);
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
  S.etats.fraicheur = clamp(S.etats.fraicheur + (S.etats.blessure ? 14 : 9.6) + S.etats.fond * .05);
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
  /* `moyenneNotes()` renvoie 6 quand on n'a aucune note : c'est commode pour les
     calculs, mais le bilan ne doit pas parler d'une moyenne qui n'existe pas. */
  const note = S.stats.notes.length ? moyenneNotes() : null;
  S.bilan = {
    pos, note: note == null ? null : Math.round(note * 100) / 100,
    gagne: bilanGagne(note, pos), perdu: bilanPerdu(note), suite: bilanSuite(pos, note),
  };
  jrn('saison', `Saison terminée : ${S.stats.matchs} matchs, ${S.stats.buts} buts${S.bilan.note == null ? '' : `, note ${nb(S.bilan.note)}`}. ${S.club.nom} ${pos}ᵉ.`);
  S.ecran = 'bilan'; sauver(); rendre();
}
function bilanGagne(note, pos){
  const t = [];
  if (S.stats.titus >= 15) t.push(`Tu as gagné ta place : ${S.stats.titus} titularisations, et plus personne ne discute.`);
  if (S.stats.buts >= 8) t.push(`${S.stats.buts} buts, ce qui ne s'était jamais vu pour toi.`);
  if (note != null && note >= 6.8) t.push(`Une moyenne que le staff a remarquée avant les journalistes.`);
  if (vestiaire() > 62) t.push(`Le vestiaire est avec toi, et ça se sent sur le terrain.`);
  if (pos <= 5) t.push(`Le club a fini dans le haut du tableau, ce que personne n'attendait en août.`);
  return t.length ? t : [`Une saison d'apprentissage. Tu es encore là, c'est déjà quelque chose.`];
}
function bilanPerdu(note){
  const t = [];
  if (S.stats.matchs < 12) t.push(`Une saison passée à regarder : ${S.stats.matchs} matchs seulement.`);
  if (S.etats.corps < 78) t.push(`Ton corps a payé. Tu le sentiras l'an prochain.`);
  if (S.liens.coach < 42) t.push(`Le coach ne compte plus vraiment sur toi.`);
  if (note != null && note < 6) t.push(`Trop de matchs où tu n'as pas existé.`);
  if (S.liens.supporters < 40) t.push(`Le stade ne connaît toujours pas ton nom.`);
  return t.length ? t : [`Rien de grave, cette fois.`];
}
function bilanSuite(pos, note){
  const t = [];
  /* On ne prédit plus le marché ici : les offres se tirent **après** l'été, et ce
     qu'on fait de l'été les change. « Personne n'a appelé » était donc une phrase
     que le mercato démentait dix secondes plus tard — le même défaut que les
     arrêts qui annonçaient le week-end avant que le groupe soit connu. */
  t.push(note != null && note >= 6.6 ? `Ton agent dit qu'on commence à parler de toi.`
    : S.stats.matchs >= 18 ? `Tu as fait ta saison. La suite se joue cet été.`
    : `Tu as une saison à rattraper.`);
  if (S.etats.corps < 80) t.push(`Ton corps demande un été calme.`);
  if (S.liens.coach >= 58) t.push(`Le coach veut construire autour de toi.`);
  if (S.moi.age >= 31) t.push(`On ne te demande plus ton âge au club : on le sait.`);
  return t;
}

/* ================== LA CARRIÈRE CONTINUE ==================
   Le jeu s'arrêtait au bout d'une saison (le propriétaire, 27/09/2026 : « j'aimerais
   bien qu'on avance dans le process de construction du jeu… et sortir un peu de la
   phase labo »). C'est la pièce qui débloque tout le reste : sans deuxième saison,
   la trace qu'une carrière doit laisser n'a nulle part où s'inscrire.
   L'enchaînement : bilan → **l'été** (une décision) → **les offres** (une à la fois)
   → la saison suivante. Et au bout, le **bilan de carrière**. */
const FIN_CARRIERE = 38;
/* TON POTENTIEL ET CELUI DES CLUBS SONT SUR LA MÊME ÉCHELLE. Première version du
   championnat vivant : j'avais resserré la hiérarchie des clubs (pour que le titre
   change de mains) **sans** toucher à la tienne. Résultat mesuré : niveau 88 quand
   le meilleur club vaut 66, donc `(niveauJour() − force) × .12` te faisait valoir
   trois points à toi seul — tu faisais champion ton club, 4,8 titres par carrière
   et un attaquant médian à 40 buts par saison. Le sommet d'un joueur doit rester
   un peu au-dessus du meilleur club, pas vingt points au-dessus. */
const POT_MIN = 56, POT_MAX = 80;

/* Quatre façons de passer l'été. Chacune donne quelque chose tout de suite et
   quelque chose qui dure — et aucune ne donne les deux. */
const ETE = [
  { id:'proches', ico:'🏡', nom:"Rentrer chez toi",
    sub:"Six semaines chez les tiens. Personne ne te parle de football.",
    dit:[{c:'vie',t:"🏡 tu reviens entier"},{c:'foot',t:"🧠 la tête se répare"},{c:'neutre',t:"↔️ rien de gagné sur le terrain"}] },
  { id:'travail', ico:'💪', nom:"Passer l'été à travailler",
    sub:"Un préparateur, un plan, et ton point faible comme seul sujet.",
    dit:[{c:'foot',t:"📈 ton axe le plus faible monte"},{c:'risk',t:"🫁 tu arrives cuit en août"},{c:'risk',t:"🧠 aucune coupure"}] },
  { id:'soin', ico:'🩺', nom:"Réparer ton corps",
    sub:"Le kiné, la table, et tout ce que tu traînes depuis l'automne.",
    dit:[{c:'foot',t:"🩼 tu te blesses moins toute l'année"},{c:'foot',t:"💪 tu tiens les matchs"},{c:'neutre',t:"↔️ tu ne progresses pas"}] },
  { id:'montrer', ico:'📸', nom:"Te montrer",
    sub:"Une tournée, des caméras, un agent qui décroche son téléphone.",
    dit:[{c:'foot',t:"🤝 de meilleures propositions"},{c:'foot',t:"🏟️ on parle de toi"},{c:'risk',t:"🫁 l'été n'a servi qu'à ça"}] },
];
function ouvrirEte(){ S.ecran = 'ete'; sauver(); rendre(); }
function choisirEte(id){
  const e = ETE.find(x => x.id === id) || ETE[0];
  S.ete = { id: e.id, nom: e.nom, fraicheur: 100, fond: 0, corps: 0, offres: 0, travail: 0 };
  if (e.id === 'proches'){
    S.ete.corps = 12;
    // la tête se répare vraiment : on remonte au pic, ce que la saison n'offre jamais
    AXES.forEach(a => { if (a === 'ment' && S.moi.base.ment < S.moi.pic.ment) bougerAxe('ment', S.moi.pic.ment - S.moi.base.ment); });
  } else if (e.id === 'travail'){ S.ete.travail = 3.6; S.ete.corps = -6; S.ete.fraicheur = 78; }
  else if (e.id === 'soin'){ S.ete.corps = 24; S.ete.fond = 26; }
  else if (e.id === 'montrer'){ S.ete.offres = 2;
    S.liens.agent = clamp(S.liens.agent + 14); S.liens.supporters = clamp(S.liens.supporters + 10); }
  jrn('ete', `L'été : ${e.nom.toLowerCase()}.`);
  vieillir();
  if (S.moi.age >= FIN_CARRIERE) return finCarriere("l'âge");
  genererOffres();
  S.ecran = 'offres'; sauver(); rendre();
}

/* CE QUE LA SAISON A CONSTRUIT. Le plafond est la vraie histoire d'une carrière :
   il monte tant qu'on est jeune **et qu'on joue**, il descend après la trentaine
   quoi qu'on fasse. La base le suit — vers le haut d'autant plus vite qu'on a
   joué et bien joué, vers le bas sans rien demander à personne : c'est l'usure. */
/* La courbe d'un coéquipier : il progresse jeune, il décline vieux. */
function courbeAge(age){
  return age <= 20 ? 3.4 : age <= 23 ? 2.5 : age <= 26 ? 1.3 : age <= 29 ? .3
    : age <= 32 ? -1.5 : age <= 35 ? -3.2 : -5;
}
/* LE PLAFOND EST TON POTENTIEL, ET IL NE MONTE JAMAIS. Première version : il
   montait de la courbe d'âge chaque saison, donc **toutes** les carrières
   finissaient au maximum (niveau max 99,4 de moyenne, médiane 100 sur 40
   carrières simulées) — un potentiel qui se rattrape n'est pas un potentiel.
   Il est tiré à la création, il ne bouge qu'à la baisse, et toute la carrière
   consiste à savoir **quelle part tu en auras révélée, et combien de temps tu
   l'auras tenue**. */
function usureAge(age){ return age <= 28 ? 0 : age <= 31 ? -1.3 : age <= 34 ? -3 : -5; }
function progresserAxes(){
  const part = Math.min(1, S.stats.matchs / 26);
  const note = S.stats.notes.length ? moyenneNotes() : 5.6;   // ne pas jouer coûte
  const perf = clamp((note - 6.1) * 1.5, -1.8, 1.8);
  const u = usureAge(S.moi.age);
  const gain = {};
  // l'été de travail vise l'axe le plus loin de son plafond : ce qui te manque
  const faible = AXES.slice().sort((a, b) => (plafondReel(b) - S.moi.base[b]) - (plafondReel(a) - S.moi.base[a]))[0];
  AXES.forEach(a => {
    const avant = S.moi.base[a];
    S.moi.plafond[a] = clamp(S.moi.plafond[a] + u, 40, 99);
    const cible = plafondReel(a);
    // on monte vers son potentiel d'autant plus vite qu'on a joué et bien joué ;
    // on en redescend sans rien demander à personne
    const vers = cible > S.moi.base[a]
      ? (cible - S.moi.base[a]) * (.09 + .26 * part) + perf * .5
      : (cible - S.moi.base[a]) * .55;
    bougerAxe(a, vers + (a === faible ? (S.ete ? S.ete.travail : 0) : 0));
    if (cible < S.moi.pic[a]) S.moi.pic[a] = Math.max(S.moi.base[a], cible);
    gain[a] = S.moi.base[a] - avant;
  });
  S.moi.boost = { tech:0, phys:0, ment:0, spec:0 };
  return gain;
}

/* Une année passe : on vieillit, on progresse ou on s'use, et le monde autour
   bouge — le championnat se rejoue, les coéquipiers prennent un an, certains
   s'en vont. Sans ça la deuxième saison serait la première avec les mêmes gens. */
function vieillir(){
  const pos = S.bilan ? S.bilan.pos : null;
  S.carriere = S.carriere || { saisons:0, matchs:0, titus:0, buts:0, passes:0,
    sum:0, nbNotes:0, titres:0, clubs:[], annees:[] };
  const c = S.carriere;
  c.saisons++; c.matchs += S.stats.matchs; c.titus += S.stats.titus;
  c.buts += S.stats.buts; c.passes += S.stats.passes;
  S.stats.notes.forEach(n => { c.sum += n; c.nbNotes++; });
  if (pos === 1) c.titres++;
  if (S.coupe && S.coupe.gagnee) c.coupes = (c.coupes || 0) + 1;
  if (S.euro && S.euro.gagnee) c.europes = (c.europes || 0) + 1;
  if (!c.clubs.includes(S.club.nom)) c.clubs.push(S.club.nom);
  c.annees.push({ annee:S.annee, club:S.club.nom, pos, matchs:S.stats.matchs,
    buts:S.stats.buts, note: S.bilan ? S.bilan.note : null, niveau: Math.round(niveau()),
    coupe: !!(S.coupe && S.coupe.gagnee), euro: !!(S.euro && S.euro.gagnee) });
  S.moi.age++; S.annee++;
  S.progres = progresserAxes();
}

/* LES OFFRES, UNE À LA FOIS. « Plutôt que de me laisser choisir entre les
   propositions, ce serait bien que j'aie une proposition sans savoir si j'en
   aurai de meilleures » (le propriétaire, 26/09/2026, sur la 1.0). Refuser fait
   disparaître l'offre pour de bon, et la suivante peut être pire, ou ne pas venir. */
function genererOffres(){
  const n = niveau();
  const joue = S.stats.matchs >= 12, bonne = S.stats.notes.length && moyenneNotes() >= 6.4;
  // ta cote : ce que tu vaux, ce que tu as montré, et ce que ton agent a fait de l'été
  const cote = n + (joue ? 2 : -3) + (bonne ? 2.5 : 0) + (S.ete ? S.ete.offres : 0)
    + (S.liens.agent - 50) * .06 + (S.moi.age >= 33 ? -4 : 0);
  /* UN GRAND CLUB N'APPELLE PAS TOUS LES ÉTÉS. La fenêtre était symétrique
     (`|force − cote| < 7`), donc une fois ta cote haute **toutes** les offres
     venaient du haut du tableau et tu suivais le meilleur club d'année en année.
     Désormais un club à ta portée appelle volontiers, un club au-dessus de toi
     rarement : il a le choix. C'est ce qui rend une signature au sommet rare, et
     donc intéressante. */
  const cand = S.ligue.equipes.filter(e => e.nom !== S.club.nom && e.force > cote - 14);
  const poids = cand.map(e => 1 / (1 + Math.max(0, e.force - (cote - 5)) * .55));
  const combien = Math.min(cand.length, Math.max(0, ri(0, 2) + (S.ete && S.ete.offres ? 1 : 0) + (bonne && joue ? 1 : 0)));
  const tires = [];
  for (let k = 0; k < combien && cand.length; k++){
    let t = poids.reduce((a, x) => a + x, 0) * Math.random(), i = 0;
    while (i < cand.length - 1 && (t -= poids[i]) > 0) i++;
    tires.push(cand[i]); cand.splice(i, 1); poids.splice(i, 1);
  }
  S.offres = tires.map(e => ({ nom:e.nom, force:e.force }));
  S.offreIdx = 0;
  /* Ton club peut ne plus vouloir de toi : trop vieux, ou une saison sans jouer.
     C'est la seule chose qui t'oblige à partir. */
  S.libre = (S.moi.age >= 33 && S.stats.matchs < 10) || (S.stats.matchs === 0 && S.moi.age >= 21);
  if (S.libre) jrn('offre', `${S.club.nom} ne prolonge pas.`);
  return S.offres;
}
function offreCourante(){ return (S.offres || [])[S.offreIdx || 0] || null; }
function passerOffre(){
  S.offreIdx = (S.offreIdx || 0) + 1;
  if (S.offreIdx >= (S.offres || []).length && S.libre) return finCarriere("personne");
  sauver(); rendre();
}
function signerOffre(){
  const o = offreCourante(); if (!o) return;
  jrn('offre', `Tu signes à ${o.nom}.`);
  demarrerSaison({ nom:o.nom, force:o.force }, false);
}
function resterAuClub(){
  if (S.libre) return;
  jrn('offre', `Tu restes à ${S.club.nom}.`);
  demarrerSaison(S.club, true);
}

/* La saison suivante commence : nouveau championnat, effectif renouvelé, tout
   ce qui se compte remis à zéro — et rien de ce qui se construit. */
function demarrerSaison(club, reste){
  /* Le championnat rejoue ses niveaux, ton club compris : il n'a plus de règle à
     lui. Avant, il dérivait seul en marche aléatoire pendant que la ligue était
     retirée à neuf — mesuré, une carrière sur quarante gagnait **dix-sept titres
     sur vingt saisons**, ce que le propriétaire reprochait déjà à la 1.0. */
  faireVivreLigue();
  const e = S.ligue.equipes.find(x => x.nom === club.nom);
  const force = e ? e.force : Math.round(club.force);
  S.club = { nom: club.nom, force };
  if (reste) renouvelerEffectif(); else {
    const n = creerEffectif(S.club, S.moi.poste);
    S.concurrents = n.concurrents; S.equipe = n.equipe;
    S.lignes = { def:50, mil:50, att:50 };
    S.liens.coach = 50; S.liens.club = 52;   // tout est à refaire ailleurs
  }
  S.ligneRef = { ...S.lignes };
  S.etats = { fraicheur: S.ete ? S.ete.fraicheur : 100, forme:60, blessure:0, suspension:0,
    corps: clamp((S.etats.corps || 88) + (S.ete ? S.ete.corps : 0)), fond: S.ete ? S.ete.fond : 0 };
  S.stats = { matchs:0, titus:0, buts:0, passes:0, notes:[], minutes:0 };
  /* L'EUROPE SE GAGNE SUR LE TERRAIN. On y va si on a fini sur le podium ou si
     on a gagné la coupe — donc jamais la première saison, en bas de tableau. */
  const podium = S.bilan && S.bilan.pos <= 3;
  const coupeGagnee = S.coupe && S.coupe.gagnee;
  S.euro = { engage: !!(podium || coupeGagnee), vivant: true, tour: 0, pts: 0, hist: [], gagnee: false };
  S.coupe = { vivant: true, tour: 0, hist: [], gagnee: false };
  if (S.euro.engage) jrn('euro', `L'Europe cette saison : ${podium ? `${S.bilan.pos}ᵉ la saison passée` : 'vainqueurs de la Coupe'}.`);
  S.moi.an0 = { tech:S.moi.base.tech, phys:S.moi.base.phys, ment:S.moi.pic.ment, spec:S.moi.base.spec };
  S.journee = 0; S.arrets = 0; S.sansJouer = 0; S.cartons = 0;
  S.semaine = null; S.seance = null; S.match = null; S.dernier = null; S.arret = null;
  S.eqJour = null; S.bilan = null; S.offres = null; S.vuArrets = {}; S.recentArrets = [];
  jrn('debut', `${S.annee}-${S.annee + 1}, ${S.moi.age} ans, ${S.club.nom}.`);
  S.ecran = 'semaine'; sauver(); rendre();
}

/* Un vestiaire n'est pas le même d'une année sur l'autre : on prend un an, les
   plus vieux s'en vont, des jeunes arrivent — et le club recrute à ton poste. */
function renouvelerEffectif(){
  const pris = S.equipe.map(j => j.nom).concat(S.concurrents.map(c => c.nom));
  const tirer = () => { let n, k = 0;
    do { n = pick(NOMS); k++; } while (pris.includes(n) && k < 300); pris.push(n); return n; };
  S.equipe.forEach(j => { j.age++; j.forme = 0; j.blesse = 0; j.susp = 0; j.rancune = 0;
    j.note = null; j.noteR = null; j.sum = 0; j.nb = 0; j.sumR = 0; j.nbR = 0;
    j.niv = Math.round(clamp(j.niv + courbeAge(j.age) * .55 + rnd(-1, 1.6), 40, 92)); });
  S.concurrents.forEach(c => { c.age++; c.forme = 0; c.blesse = 0;
    c.niv = Math.round(clamp(c.niv + courbeAge(c.age) * .55 + rnd(-1, 1.6), 40, 92)); });
  // les départs : les plus vieux, et quelques-uns qui ne jouaient pas
  const partis = [];
  S.equipe = S.equipe.filter(j => {
    const part = j.age >= 35 || (j.age >= 31 && Math.random() < .3) || Math.random() < .12;
    if (part) partis.push(j.nom); return !part;
  });
  S.concurrents = S.concurrents.filter(c => {
    const part = c.age >= 35 || (c.age >= 32 && Math.random() < .35);
    if (part) partis.push(c.nom); return !part;
  });
  // on complète poste par poste, et le club se renforce là où il a perdu du monde
  const nb = S.moi.poste === 'G' ? 1 : 2;
  while (S.concurrents.length < nb)
    S.concurrents.push({ nom:tirer(), niv: Math.round(S.club.force + rnd(1, 7)),
      forme:0, blesse:0, age: ri(21, 29) });
  Object.entries(EFFECTIF).forEach(([po, n]) => {
    const vise = po === S.moi.poste ? n - 1 - nb : n;
    while (S.equipe.filter(j => j.poste === po).length < vise)
      S.equipe.push({ nom:tirer(), poste:po,
        niv: Math.round(S.club.force + rnd(-9, 5)), age: ri(18, 28),
        forme:0, blesse:0, susp:0, prog:0, note:null });
  });
  S.equipe.forEach(j => { delete j.monte; });
  const jeune = S.equipe.filter(j => j.age <= 22).sort((a, b) => a.age - b.age)[0];
  if (jeune) jeune.monte = true;
  S.partis = partis.slice(0, 4);
  if (partis.length) jrn('ete', `${partis.length} départ${partis.length > 1 ? 's' : ''} au club : ${S.partis.join(', ')}.`);
}

/* Le bout de la route. Une carrière doit laisser une trace : c'est ici qu'on la lit. */
function finCarriere(raison){
  if (S.stats && S.journee >= JOURNEES && S.bilan) { /* déjà comptée par vieillir() */ }
  S.fin = { raison, age: S.moi.age, annee: S.annee };
  jrn('fin', `Fin de carrière à ${S.moi.age} ans.`);
  S.ecran = 'carriere'; sauver(); rendre();
}
function moyCarriere(){ const c = S.carriere; return c && c.nbNotes ? c.sum / c.nbNotes : null; }

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
/* LE MENTAL DIT DEUX CHOSES, ET IL FAUT LES DEUX (le propriétaire, 27/09/2026 :
   « malgré le fait que j'ai un bon mental, je suis toujours, depuis le début de
   ma carrière, dans un mental de “quand ça se tend, tu joues petit”. Du coup je ne
   sais pas si c'est positif ou négatif. J'ai l'impression que mon mental n'évolue
   pas alors que je l'ai quand même pas mal entraîné »). La phrase ne lisait que la
   **réserve du moment**, qui se vide à chaque coup dur : un joueur avec quinze
   points de mental en plus restait toute sa carrière dans la bande basse, sans
   jamais savoir que c'était sa force. Elle dit maintenant **ce que tu vaux quand
   tu vas bien** (`pic`, ce que lit déjà `niveau()`) **et où en est ta réserve** —
   donc elle bouge chaque semaine, et la séance mentale se voit. */
function direEncaisse(){
  const pic = S.moi.pic.ment, v = S.moi.base.ment + S.moi.boost.ment;
  const niv = pic > 68 ? "Une tête au-dessus de la moyenne"
    : pic > 54 ? "Une tête dans la moyenne"
    : pic > 42 ? "Une tête un cran en dessous"
    : "Une tête qui lâche vite";
  const etat = v >= pic - 2 ? ", et elle est entière."
    : v >= pic - 7 ? ", un peu entamée en ce moment."
    : v >= pic - 14 ? " — mais la saison l'a entamée : la séance mentale la répare."
    : " — et là elle est à plat : seule la séance mentale la remonte.";
  return niv + etat;
}
/* Le propriétaire, 27/09/2026 : « "le geste sort le plus souvent", c'est mal
   formulé ; ce que tu essayes de dire, c'est tu fais le bon geste au bon
   moment. » C'est exactement ça : la technique ne se juge pas à l'entraînement
   mais à l'instant où il faut la sortir. */
function direGeste(){ const v = S.moi.base.tech + S.moi.boost.tech;
  return v > 68 ? "Tu fais le bon geste au bon moment, presque à chaque fois."
    : v > 54 ? "Tu fais le bon geste au bon moment, le plus souvent."
    : v > 42 ? "Le bon geste, tu le fais une fois sur deux."
    : "Au moment de faire le bon geste, tu le rates."; }
/* Ce que ta tête va faire dans le moment qui vient. Dit avant le clic, pour que
   le mental se sente au lieu de s'expliquer. */
function direTete(){ const v = S.moi.base.ment + S.moi.boost.ment;
  return v > 68 ? "Tu as déjà vécu ça." : v > 54 ? "Tu respires, et tu joues."
    : v > 42 ? "Tes jambes se font lourdes d'un coup." : "Le stade hurle et tu ne l'entends plus."; }
/* LE GROUPE, EN UNE SEULE PHRASE : qui manque **et** ce que ça coûte au onze.
   Le propriétaire, 27/09/2026 : « c'est quoi la différence entre le groupe et le
   vestiaire ? Ça se superpose un peu… il y a un truc à fusionner. » Il avait
   raison sur la superposition, mais pas là où il croyait : « L'infirmerie » et
   « Le groupe » étaient deux cases pour **le même événement vu sous deux
   angles**. Elles n'en font plus qu'une. */
function direInfirmerie(){
  const a = groupe().filter(x => !x.dispo);
  if (!a.length) return "Tout le monde est valide.";
  const n = a.length;
  const qui = a.slice(0, 2).map(x => x.nom).join(' et ');
  return n === 1 ? `${qui} manque ce samedi.`
    : n === 2 ? `${qui} manquent ce samedi.`
    : `${n} absents, dont ${qui}.`;
}
function direGroupe(){ return direInfirmerie() + ' ' + direProfondeur(); }
/* Ce que la profondeur du groupe absorbe. Il faut le dire en tenant compte des
   absents : « quatre absents » à côté de « le onze est au complet » se lisait
   comme une contradiction, alors que c'est justement ce qu'un groupe de
   vingt-deux est censé faire. */
function direProfondeur(){
  const abs = groupe().filter(x => !x.dispo).length;
  const e = (S.eqJour ? equipeDuJourLue() : equipeDuJour()).ecart;
  if (!abs) return "Tout le monde est là : le coach a le choix.";
  return e > -.25 ? "Ça s'absorbe : le onze ne s'en ressent pas."
    : e > -.8 ? "Le coach bricole un peu, sans plus."
    : e > -1.8 ? "Deux ou trois remplaçants entrent : ça se sentira."
    : "On est à l'os. Ce match part de plus loin.";
}
/* Le propriétaire, 27/09/2026 : « on peut mettre le numéro qu'on est dans la
   hiérarchie… je sais pas trop quoi faire pour entrer dedans ». Le rang, et la
   phrase qui nomme le levier le plus court — sans quoi on subit sans comprendre. */
function monRang(){
  const l = monPoste();
  return { rang: l.findIndex(x => x.moi) + 1, sur: l.length, places: FORMATION[S.moi.poste] };
}
function direRang(){
  const r = monRang();
  return `${r.rang}\u1d49 sur ${r.sur} \u00e0 ton poste, ${r.places} place${r.places > 1 ? 's' : ''} dans le onze.`;
}
function direCommentMonter(){
  const r = monRang();
  if (r.rang <= r.places) return "Tu es dans les plans. Reste-y.";
  const l = monPoste();
  const devant = l[Math.min(r.places, l.length) - 1];   // le dernier titulaire du poste
  if (!devant) return "Il n'y a personne devant toi \u00e0 ton poste.";
  const ecart = devant.niv - valeurAuPoste();
  if (S.liens.coach < 46) return "Le coach ne te voit pas. \u00c7a se gagne dans son bureau autant qu'\u00e0 l'entra\u00eenement.";
  if (ecart > 6) return `Tu es encore loin de ${devant.nom}. Il n'y a que le travail \u00e0 ton poste.`;
  if (S.etats.forme < 55) return "Tu n'es pas en forme. Une bonne sortie, m\u00eame en r\u00e9serve, et il te regardera.";
  return `${devant.nom} n'est pas loin. Une blessure, une suspension, une bonne semaine, et la place s'ouvre.`;
}
function direPlace(){
  const l = monPoste(), places = FORMATION[S.moi.poste];
  const dispo = l.filter(x => x.dispo);
  const rang = dispo.findIndex(x => x.moi);
  const manquent = l.length - dispo.length;
  const dit = manquent ? ` ${manquent} manque${manquent > 1 ? 'nt' : ''} à ton poste.` : '';
  if (rang < 0) return "Tu n'es pas disponible cette semaine.";
  const devant = dispo.slice(0, rang).map(x => x.nom);
  if (rang < places) return (rang === 0 ? "Personne ne te passe devant."
    : `Tu es dans le onze, derrière ${devant.slice(-1)[0]}.`) + dit;
  if (rang === places) return `${devant.slice(-1)[0]} te passe devant, mais ça se joue à rien.` + dit;
  if (rang <= places + 1) return `${devant.slice(-2).join(' et ')} sont devant toi.` + dit;
  return `Tu es loin dans la hiérarchie du poste. Tu n'es pas dans ses plans.` + dit;
}
function direCorps(){ const v = S.etats.corps;
  return v > 85 ? "Rien ne te fait mal." : v > 72 ? "Quelques douleurs, rien de sérieux." : v > 58 ? "Tu récupères moins vite qu'avant." : "Ton corps commence à te lâcher."; }
function direJambes(){ const v = S.etats.fraicheur;
  return v > 88 ? "Tu sors du match sans une courbature." : v > 72 ? "Les jambes ont tenu."
    : v > 58 ? "Tu as fini sur les nerfs." : "Tes jambes ont pris cher."; }
function direFraicheur(){ const v = S.etats.fraicheur;
  return v > 88 ? "Frais" : v > 72 ? "En jambes" : v > 58 ? "Émoussé" : "Vidé"; }
/* CE QUE LE STAFF DIT DE TOI. Deux défauts, tous deux relevés par le propriétaire
   le 27/09/2026 :
   1. « La finition : c'est ce qui te fait jouer. Mental : tu es en retard sur le
      groupe — alors que depuis le début j'ai plus quinze de mental ». La phrase
      classait les axes sur `base.ment`, **la réserve qui se vide** : un joueur au
      mental fort y passait dernier dès le premier coup dur. Elle lit maintenant
      `pic.ment`, comme `niveau()`.
   2. « Cette phrase, elle n'évolue pas, et c'est dommage : ce qui me fait jouer au
      début, c'est peut-être pas ce qui me fait jouer après. » Elle comparait tes
      axes **entre eux**, un classement qui ne se réordonne presque jamais. Elle
      les pèse désormais par ce que **ton poste** en demande et les compare au
      **niveau du club**, et elle nomme ce qui a bougé depuis août. */
function direStaff(){
  const p = POSTES.find(x => x.id === S.moi.poste);
  const val = a => (a === 'ment' ? S.moi.pic.ment : S.moi.base[a]) + S.moi.boost[a];
  const l = AXES.map(a => ({ a, v: val(a), poids: (val(a) - S.club.force) * p.w[a] }))
    .sort((x, y) => y.poids - x.poids);
  const f = l[0], d = l[l.length - 1];
  /* Ce qui a bougé depuis août : c'est ça qui fait vivre la phrase. On ne nomme
     jamais deux fois le même axe — sinon elle se contredisait toute seule
     (« Mental : tu es en retard sur le groupe. Mental a pris un cran »). */
  const a0 = S.moi.an0;
  let b = null;
  if (a0){
    const m = AXES.map(a => ({ a, d: val(a) - (a0[a] == null ? val(a) : a0[a]) }))
      .sort((x, y) => Math.abs(y.d) - Math.abs(x.d))[0];
    if (Math.abs(m.d) >= 2) b = m;
  }
  const mot = x => b && b.a === x ? (b.d > 0 ? ", et ça monte" : ", et ça s'en va") : '';
  const t = [`${axeNom(f.a)} : c'est ce qui te fait jouer${mot(f.a)}.`];
  t.push(d.v < S.club.force - 4 ? `${axeNom(d.a)} : tu es en retard sur le groupe${mot(d.a)}.`
    : d.v < S.club.force + 3 ? `${axeNom(d.a)} : c'est ce qu'il te reste à prendre${mot(d.a)}.`
    : `${axeNom(d.a)} : même là, tu tiens le niveau${mot(d.a)}.`);
  if (b && b.a !== f.a && b.a !== d.a)
    t.push(b.d > 0 ? `${axeNom(b.a)} a pris un cran depuis août.` : `${axeNom(b.a)} s'en va.`);
  return `« ${t.join(' ')} »`;
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
    /* MIGRATION 7 → 8 : le groupe de dix-huit, la réserve et la rancune. Rien à
       reconstruire, seulement des champs à poser — une partie en cours continue. */
    if (d.v === 7 && d.equipe){
      d.equipe.forEach(j => { j.rancune = 0; j.sumR = j.sumR || 0; j.nbR = j.nbR || 0; });
      (d.concurrents || []).forEach(c => { c.rancune = 0; c.sumR = c.sumR || 0; c.nbR = c.nbR || 0; });
      d.v = 8;
    }
    /* MIGRATION 8 → 9 : ta place se décide maintenant dans le même classement que
       celui de tout l'effectif, et cela suppose une hiérarchie par poste. Un
       effectif tiré à l'ancienne (force du club ±7) ferait de toi un titulaire du
       jour au lendemain. On relève donc les titulaires de chaque poste au niveau
       qui est désormais le leur, et on ne touche à personne d'autre. */
    if (d.v === 8 && d.equipe && d.club){
      const f = d.club.force;
      Object.entries(FORMATION).forEach(([po, n]) => {
        const l = d.equipe.filter(j => j.poste === po)
          .concat(po === d.moi.poste ? (d.concurrents || []) : [])
          .sort((a, b) => b.niv - a.niv).slice(0, n);
        l.forEach(j => { if (j.niv < f + 2) j.niv = Math.round(f + rnd(2, 8)); });
      });
      d.v = 9;
    }
    /* MIGRATION 9 → 10 : rien à reconstruire. La carrière naît au premier bilan,
       et une partie en cours au moment de la mise à jour la commence là. */
    if (d.v === 9) d.v = 10;
    /* La qualité et le défaut se découvrent désormais à la création : une carrière
       commencée avant ne les a peut-être pas encore vus, et plus rien ne les lui
       montrerait. On les lui donne. */
    if (d.moi && d.moi.qual){ d.moi.qual.vu = true; d.moi.def.vu = true; }
    if (d.v !== VERSION) return null;
    return d;
  } catch(e){ return null; }
}
function effacer(){ try { localStorage.removeItem('ac2'); } catch(e){} S = null; }
