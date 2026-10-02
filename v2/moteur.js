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

const VERSION = 15;  // le sous-système de la sélection : convocation, deux matchs, compteurs
/* MIGRATION 10 → 11 : deux choses à construire, et une partie en cours les reprend
   sans rien perdre — le propriétaire joue la version déployée.
   1. **L'échelon inférieur** (`S.ligue.autre`) n'existait pas : on le fabrique avec
      les clubs qui n'avaient pas été tirés, à leur niveau.
   2. **Ton club avait deux effectifs** : celui de la ligue (fantôme) et le tien.
      `syncClubSq()` est appelé au chargement et le fantôme disparaît. */
let S = null;
/* Mis à true par le banc d'essai (labo.html) : les milliers de saisons qu'il
   simule ne doivent pas écraser la carrière rangée dans localStorage. */
let SIM = false;

/* ---------- petits outils ---------- */
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rnd(a, b + 1));
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
/* LA FRAÎCHEUR PEUT TOMBER DANS LE NÉGATIF (le propriétaire, 30/09/2026 : « celui qui
   ne fait que s'entraîner au physique et enchaîner les matchs se blesse, car la
   fraîcheur ne se régénère pas assez vite — il est censé pouvoir tomber dans le
   négatif »). Elle était bornée à zéro, et le plancher était **réellement atteint** :
   mesuré, « toujours le physique » y était collé **5,1 % des journées** et son
   cinquième centile valait 0. La dette existait donc déjà dans le jeu ; le modèle la
   tronquait, donc elle ne se payait pas. Sous zéro on joue sur la réserve : le niveau
   du jour continue de descendre, on sort tôt, et on se blesse. */
const PLANCHER_FR = -35;
const clampFr = v => clamp(v, PLANCHER_FR, 100);
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
/* Une qualité et un défaut, tirés au sort, sur deux axes différents. Les deux se
   découvrent à la création (écran `ecranTirage`) et sont dans tes chiffres dès le
   premier match. */
/* LES HUIT TEXTES NOMMENT UN AXE QU'ON PEUT TRAVAILLER (le propriétaire,
   27/09/2026, deuxième passe : « au lieu de mettre ta finition, mets ton poste.
   Sinon, c'est pas clair… parce que sinon, ça voudrait dire que c'est une qualité
   sur laquelle on ne peut pas avoir d'impact »). L'étiquette de gauche pointe donc
   vers l'une des quatre séances — ta technique, ton physique, ton mental, ton poste
   — et jamais vers un nom de spécialité (« ta finition ») qui ne se travaille nulle
   part.
   Et la mention « au-dessus / en dessous de la moyenne » n'est plus systématique
   (« je pense qu'on n'est pas obligé de la mettre pour toutes. C'est juste que comme
   la formulation n'était pas bonne, je trouve que c'était bien pour compléter ») :
   elle reste là où la phrase seule ne dirait pas si c'est bien ou mal, elle disparaît
   là où l'image le dit toute seule.
   Et la phrase ne répète jamais l'étiquette : « ton poste — tu réagis une demi-seconde
   après les autres à ton poste » disait deux fois la même chose. */
const QUALITES = [
  { id:'frappe', axe:'tech', nom:"La frappe",
    dit:"Un toucher de balle au-dessus de la moyenne : le staff s'arrête pour regarder tes séances de frappe." },
  { id:'poumons', axe:'phys', nom:"Le moteur",
    dit:"Un volume de course au-dessus de la moyenne : tu finis les matchs plus frais que ceux d'en face." },
  { id:'nerfs', axe:'ment', nom:"Le sang-froid",
    dit:"Le stade hurle et tes mains ne tremblent pas." },
  { id:'lecture', axe:'spec', nom:"Le temps d'avance",
    dit:"Tu réagis une demi-seconde avant les autres, et tu l'as depuis toujours." },
];
const DEFAUTS = [
  { id:'gauche', axe:'tech', nom:"Le pied faible",
    dit:"Une qualité balle au pied en dessous de la moyenne : tu n'as pas de pied gauche, et les défenseurs l'ont bien compris." },
  { id:'ischios', axe:'phys', nom:"Les ischios",
    dit:"Cette gêne derrière la cuisse revient chaque hiver, et le kiné soupire." },
  { id:'doute', axe:'ment', nom:"Le doute",
    dit:"Un geste raté et tu joues petit pendant vingt minutes." },
  { id:'placement', axe:'spec', nom:"Le temps de retard",
    dit:"Tu réagis une demi-seconde après les autres, et tu traînes ça depuis toujours." },
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
/* Le dernier cran de la tête ne se répare qu'à l'entraînement : la récupération
   naturelle, celle que les tiens accélèrent, plafonne deux points sous ton pic. */
const BORNE_TETE = 2;
const AXE_NOM = { tech:"Technique", phys:"Physique", ment:"Mental", spec:"Au poste" };
/* Le nom que le joueur lit dans une phrase : au poste, c'est « Ton poste » et
   non « Finition ». Une phrase qui dit « La finition, c'est ce qui te fait jouer »
   ne dit pas quoi faire de cette information ; « Ton poste » désigne une séance. */
function axeNom(a){ return a === 'spec' ? "Ton poste" : AXE_NOM[a]; }
/* Le même nom en minuscules, pour l'étiquette d'une qualité ou d'un défaut. */
function motAxe(a){
  return { tech:"ta technique", phys:"ton physique", ment:"ton mental", spec:"ton poste" }[a];
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
  /* LA FORCE D'UN CLUB EST LA MOYENNE DE SON ONZE, Y COMPRIS LE TIEN. Les titulaires
     étaient tirés à `force + 2 à 8`, donc la moyenne du onze valait cinq points de
     plus que la force annoncée. Ça ne se voyait pas tant que ton club était le seul
     à avoir deux effectifs — le moteur de match lisait la force annoncée et ignorait
     l'effectif. Depuis que ton club n'en a plus qu'un, cette moyenne **est** sa force :
     mesuré, elle faisait démarrer une carrière à 54,9 au lieu de 50,1 et gagner six
     places en première saison. Les titulaires sont donc centrés, comme chez les
     autres (`creerEffectifAdverse`), et tes rivaux au poste restent un cran au-dessus
     de toi : c'est là qu'était la difficulté de la première saison, pas dans la force
     du club. */
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

/* LA FORCE D'UN CLUB EST LA MOYENNE DE SON ONZE, Y COMPRIS LE TIEN — ET C'EST TON
   CLUB DE DÉPART QUI S'ADAPTE, PAS TON EFFECTIF.
   `creerEffectif()` tire ses titulaires à `force + 2 à 8` : la moyenne du onze vaut
   donc cinq points de plus que la force annoncée. Tant que ton club avait deux
   effectifs, personne ne s'en apercevait — le moteur de match lisait la force et
   ignorait l'effectif. Depuis que le mercato n'en laisse qu'un, cette moyenne **est**
   sa force, et il fallait choisir ce qu'on sacrifiait.
   Deux pistes mesurées et abandonnées : centrer l'effectif comme chez les autres
   clubs donne **17,3 titularisations à dix-huit ans au lieu de 10,2** (tes rivaux
   tombent à ton niveau, et « toujours lever le pied » devient la meilleure politique
   partout) ; compenser ailleurs dans l'effectif préserve les titularisations mais
   fabrique un club bancal, très fourni à ton poste et court partout ailleurs — et
   tu entres alors dans le groupe trop facilement (29 matchs au lieu de 25).
   La bonne réponse ne touche ni l'un ni l'autre : **on démarre dans un club plus
   faible**, les quatre derniers du championnat au lieu des huit derniers. Ton
   effectif garde exactement la hiérarchie calibrée, ton club vaut honnêtement ce
   que vaut son onze, et tu démarres toujours dans le bas du tableau. */
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
  /* ET UN POTENTIEL NE PEUT PAS ÊTRE SOUS LÀ OÙ TU COMMENCES. Il était tiré entre
     56 et 80 pendant que la base de départ monte à 75 (50, plus dix d'origine, plus
     quinze de qualité tirée) : un axe sur quatre naissait donc **au-dessus de son
     propre plafond**, jusqu'à dix-neuf points. C'est ça — et non une accumulation —
     qui rendait le plafond décoratif. Le tirage garde une marge de progression
     au-dessus du départ : une qualité veut dire que l'axe peut monter, pas qu'il
     est déjà fini. */
  const plafond = {}; AXES.forEach(a => plafond[a] = Math.max(ri(POT_MIN, POT_MAX), base[a] + MARGE_POT));
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
  /* Les quatre derniers : une fois ton effectif posé, ton club vaudra cinq points
     de plus que le leur, donc tu démarreras autour de la douzième place — là où la
     première saison avait été calibrée. */
  const club = ligue.equipes[ri(ligue.equipes.length - 4, ligue.equipes.length - 1)];
  const { concurrents, equipe } = creerEffectif(club, poste.id);
  S = {
    v: VERSION, mode: 'joueur', annee: c.annee, division: 1, pays: 'FR', natal: 'FR', bonusOffres: 0,
    argent: 0, salaire: 0,
    /* CE QUE LES ARRÊTS PEUVENT MAINTENANT PROMETTRE OU PORTER (30/09/2026).
       `promesses` : les conséquences différées — une phrase à la presse qu'on peut
       avoir à tenir, un père dans les tribunes. Elles se règlent après le match
       suivant, une fois, et elles se disent. `brassard` : les journées qu'il te
       reste à le porter. `piqure` : le corps ne remonte plus cette saison. */
    promesses: [], brassard: 0, piqure: false, prolonge: false, reprise: 0,
    /* La sélection : `dedans` dit si tu es dans le groupe du sélectionneur. Le
       premier appel passe par l'arrêt `selection` ; ensuite les fenêtres se jouent
       d'elles-mêmes, et on peut ne plus être rappelé. */
    selec: { dedans:false, caps:0, buts:0, passes:0, notes:[] }, selecVue: null,
    vie: { proches: 58, chantiers: [], achats: [], gagne: 0, gagneAvant: 0, salaire0: 0, grosFait: false, prochesPlancher: 0 },
    moi: { nom: c.nom, poste: poste.id, posteNom: poste.nom, specNom: poste.spec,
      age: 18, base, boost: { tech:0, phys:0, ment:0, spec:0 }, plafond, socle,
      u0: c.origine.u0, origine: c.origine.id, ambition: c.ambition.id, pic,
      qual: { id:q.id, vu:true }, def: { id:f.id, vu:true },
      an0: { ...base },   // la photo des axes en août : ce qui a bougé se lit contre elle
      histo: {} },
    club: { nom: club.nom, force: club.force }, concurrents, equipe,
    ligue, liens, lignes, ligneRef: { ...lignes },
    /* Ce que le travail physique rend — récupérer plus vite, se blesser moins,
       encaisser une charge sans y laisser samedi — est porté par l'axe `phys`
       lui-même (`chargePhys()`, `recupPhys()`), et non par une réserve à part. */
    etats: { fraicheur:100, forme:60, blessure:0, suspension:0, corps:88 },
    journee: 0, arrets: 0, cartons: 0,
    coupe: { vivant:true, tour:0, hist:[], gagnee:false },
    euro: { engage:false, vivant:true, tour:0, pts:0, hist:[], gagnee:false },
    semaine: null, seance: null, match: null, dernier: null, arret: null,
    stats: { matchs:0, titus:0, buts:0, passes:0, notes:[], minutes:0, faits:0, faitsOk:0 },
    journal: [], ecran: 'semaine',
  };
  /* Ton club n'a qu'un effectif, et c'est le tien : on écrase celui que la ligue
     venait de lui tirer. Sans ça il en aurait deux dès la première minute. */
  syncClubSq();
  poserSalaire(salaireDe(niveau(), S.moi.age, S.club.force, 1));
  S.vie.salaire0 = S.salaire;      // « quand ton salaire double » se mesure d'ici
  jrn('argent', `Premier contrat : ${sous(S.salaire)} par an.`);
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
   potentiel, les plus vieux s'arrêtent, et le centre de formation comble les trous.
   Ce qui manque ici, c'est le marché : il ne se joue plus club par club mais
   **entre les clubs**, dans `mercato()`. */
const dec1 = v => Math.round(v * 10) / 10;
/* Le potentiel d'un joueur qu'on n'avait pas encore mesuré : ce qu'il peut devenir,
   large quand il est jeune, presque rien quand il ne l'est plus. */
function potDe(niv, age){
  return dec1(clamp(niv + (age <= 23 ? rnd(2, 12) : rnd(0, 4)), 40, 88));
}
function recrue(po, niveau, pris){
  const age = ri(18, 29);
  const v = clamp(niveau, 38, 84);
  return { n: nomAdverse(pris), p: po, a: age, v: dec1(v), t: potDe(v, age) };
}
/* Le centre de formation. Un club qui perd du monde et qui n'achète pas descend
   d'un cran : c'est ce gamin-là qui joue. C'est la cause de la baisse, et c'est
   le marché qui la répare — ou pas. */
function jeuneDuCentre(po, e, pris){
  const age = ri(18, 20);
  const v = clamp((e.vise || e.force) - rnd(4, 14), 38, 76);
  return { n: nomAdverse(pris), p: po, a: age, v: dec1(v), t: potDe(v, age) };
}
function vieillirEffectif(e, pris){
  e.sq.forEach(j => {
    if (j.moi) return;               // toi, c'est `vieillir()` qui s'en occupe
    j.a++;
    if (j.t == null) j.t = potDe(j.v, j.a);
    const c = courbeAge(j.a);
    j.v = dec1(clamp(j.v + (c > 0 ? Math.min(c, Math.max(0, j.t - j.v)) : c) + rnd(-.8, .8), 38, 86));
  });
  /* Les fins de carrière et les départs à l'étranger : ce qui sort du monde qu'on
     simule. Le reste des mouvements passe par le marché, donc cette usure est bien
     plus faible qu'avant (elle valait 10 % par joueur et par an) — sinon l'écran du
     mercato affiche huit départs muets et huit gamins du centre, et on n'y lit rien. */
  e.sq = e.sq.filter(j => j.moi || (j.a < 37 && !(j.a >= 33 && Math.random() < .2) && Math.random() > .02));
  Object.entries(EFFECTIF).forEach(([po, n]) => {
    while (e.sq.filter(j => j.p === po).length < n) e.sq.push(jeuneDuCentre(po, e, pris));
  });
  e.force = forceEffectif(e.sq);
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
/* Tous les noms du monde, les deux divisions comprises. Quand il n'en lisait
   qu'une, un jeune de l'échelon inférieur pouvait naître avec le nom d'un joueur
   de l'élite : mesuré, plus de six mille homonymes sur douze carrières. */
function nomsPris(){
  const s = new Set();
  toutesLesEquipes().forEach(e => (e.sq || []).forEach(j => s.add(j.n)));
  (S.equipe || []).forEach(j => s.add(j.nom));
  (S.concurrents || []).forEach(j => s.add(j.nom));
  return s;
}

/* ========== LES PAYS ==========
   « C'est ennuyeux de rester dans un seul pays » (le propriétaire, 02/10/2026). Le monde
   du 2.0 était **trente-six clubs français** : `EU_CLUBS` ne servait que d'adversaire de
   coupe d'Europe et `WORLD_CLUBS` n'était lu nulle part.
   Ce qui décide des destinations, c'est le **vivier** : il faut dix-huit clubs pour une
   saison de trente-quatre journées, sur laquelle tout est calibré (le rythme des
   décisions, les cinq tours de coupe, les cinq fenêtres de sélection, les trois bancs
   d'essai). Mesuré sur `EU_CLUBS` + les clubs de complément : l'Angleterre en fournit 28,
   l'Italie 23, l'Espagne et l'Allemagne 22 — mais les Pays-Bas 15, le Portugal 13, la
   Belgique 12, et l'Amérique du Sud neuf en 1970. Les quatre premiers sont donc jouables ;
   les autres restent ce qu'ils étaient, des adversaires d'Europe.
   `S.pays` est le pays où tu joues, et le monde simulé est **le sien**. Le championnat que
   tu quittes est rangé dans `S.mondes` : y revenir, c'est retrouver les clubs qu'on a
   connus, vieillis du temps passé ailleurs. */
const PAYS = {
  FR: { nom:"la France", dr:'🇫🇷', nat:'FR', d2:true, abr:'FR',
        lig: a => a >= 2002 ? "Ligue 1" : "Division 1", sal: () => 1 },
  /* Pas le drapeau à croix de saint Georges : c'est un drapeau de subdivision, il
     s'affiche en carré vide sur la moitié des téléphones. */
  /* Les facteurs sont petits exprès : le gros de l'écart de salaire vient déjà de la
     force du club, et **tous** les clubs qui appellent de l'étranger sont des clubs
     d'histoire. Mesuré à 1,9 / 1,7 / 1,55 / 1,3 : le salaire médian d'une offre
     étrangère valait **deux fois** celui d'une offre française, ce qui rendait l'argent
     sans arbitrage. Ce qui reste vrai et voulu : l'Italie des années 80 et l'Angleterre
     d'après les droits télé paient mieux que la France de la même année. */
  EN: { nom:"l'Angleterre", dr:'🇬🇧', nat:'EN', abr:'ENG',
        lig: a => a >= 1993 ? "Premier League" : "First Division",
        sal: a => a >= 2004 ? 1.5 : a >= 1996 ? 1.3 : 1 },
  IT: { nom:"l'Italie", dr:'🇮🇹', nat:'IT', abr:'ITA', lig: () => "Serie A",
        sal: a => a >= 1984 && a < 2000 ? 1.45 : 1.15 },
  ES: { nom:"l'Espagne", dr:'🇪🇸', nat:'ES', abr:'ESP', lig: () => "Liga",
        sal: a => a >= 2000 ? 1.35 : 1.12 },
  DE: { nom:"l'Allemagne", dr:'🇩🇪', nat:'DE', abr:'GER', lig: () => "Bundesliga",
        sal: a => a >= 1974 ? 1.2 : 1.05 },
};
/* Les clubs de complément de chaque championnat : ceux qui n'ont pas de poids
   historique dans `EU_CLUBS` mais qui remplissent un tableau. Ils vivent ici et non
   dans `eras.js`, que la 1.0 partage avec sa propre table. */
/* IL EN FAUT VINGT-DEUX, PAS DIX-HUIT, et c'est la mesure qui l'a dit. Avec un vivier de
   dix-huit à dix-neuf clubs, `renouvelerElite()` sortait les trois derniers et ne trouvait
   personne pour les remplacer : mesuré, le championnat d'Espagne **tombait de 18 à 16
   clubs** en deux saisons, et l'Allemagne à 15. Un championnat a besoin de clubs de
   réserve pour que son bas de tableau veuille dire quelque chose. */
const CLUBS_PAYS = {
  EN:["Aston Villa","West Ham","Leicester City","Southampton","Crystal Palace","Fulham",
      "Wolverhampton","Sheffield United","Ipswich Town","Norwich City","Derby County",
      "Coventry City","Sunderland","Middlesbrough","Blackburn","Stoke City","West Bromwich",
      "Birmingham City","Queens Park Rangers","Portsmouth","Charlton","Luton Town"],
  ES:["Getafe","Osasuna","Deportivo Alavés","Cádiz CF","RCD Mallorca","Celta Vigo","Espanyol",
      "Real Sociedad","Real Betis","Villarreal","Rayo Vallecano","Real Saragosse",
      "Real Valladolid","Sporting Gijón","Las Palmas","Deportivo La Corogne","Real Oviedo",
      "Racing Santander","Málaga CF","Elche CF","Levante","Hércules"],
  IT:["Torino","Bologna","Genoa","Sampdoria","Udinese","Lecce","Cagliari","Hellas Vérone",
      "Parme","Lazio","Bari","Brescia","Vicenza","Catane","Pérouse","Côme","Foggia","Ascoli",
      "Cesena","Avellino","Pise","Reggiana"],
  DE:["VfB Stuttgart","Eintracht Francfort","Schalke 04","Werder Brême","SC Fribourg",
      "Mayence","FC Cologne","Hertha Berlin","Kaiserslautern","Bochum","Nuremberg","Hanovre",
      "MSV Duisbourg","Fortuna Düsseldorf","Karlsruhe","Arminia Bielefeld","Hansa Rostock",
      "Eintracht Brunswick","Rot-Weiss Essen","Uerdingen","SpVgg Fürth","Wattenscheid"],
};
function paysCourant(){ return (typeof S !== 'undefined' && S && S.pays) || 'FR'; }
function monPays(){ return PAYS[paysCourant()] || PAYS.FR; }
function nomPays(p){ return (PAYS[p] || PAYS.FR).nom; }
function nomChampionnat(p, a){ return (PAYS[p] || PAYS.FR).lig(a == null ? S.annee : a); }
/* L'année est passée explicitement partout où `S` peut ne pas exister encore. */
/* CE QU'ON VA CHERCHER AILLEURS : le niveau, et l'argent. L'Italie des années 80 et
   l'Angleterre d'après les droits télé payaient ce que la France ne payait pas — c'est
   la moitié de la raison de partir, et elle se lit dans le salaire de l'offre. */
function facteurPays(p, a){ return (PAYS[p] || PAYS.FR).sal(a == null ? (typeof S !== 'undefined' && S ? S.annee : 2018) : a); }
/* Le vivier d'un pays à une époque : les clubs d'histoire, puis ceux qui remplissent. */
function poolPays(pays, dk){
  if ((pays || 'FR') === 'FR') return {
    gros: (typeof FR_CLUBS !== 'undefined' ? FR_CLUBS : []).filter(c => (c.s[dk] || 0) >= 2)
      .map(c => ({ nom:c.n, s:c.s[dk] })),
    petits: (typeof FR_LOWER !== 'undefined' ? FR_LOWER : []).map(n => ({ nom:n, s: rnd(-1.7, 1) })) };
  const nat = (PAYS[pays] || {}).nat;
  return {
    gros: (typeof EU_CLUBS !== 'undefined' ? EU_CLUBS : []).filter(c => c.nat === nat && (c.s[dk] || 0) >= 2)
      .map(c => ({ nom:c.n, s:c.s[dk] })),
    petits: (CLUBS_PAYS[pays] || []).map(n => ({ nom:n, s: rnd(-1.7, 1) })) };
}

function creerLigue(annee, pays){
  const p = pays || paysCourant();
  const dk = typeof decadeKey === 'function' ? decadeKey(annee) : '10';
  const pool = poolPays(p, dk);
  const gros = shuffle(pool.gros), petits = shuffle(pool.petits);
  /* LA PENTE : l'écart historique entre un gros et un petit club. À 4 par point de
     poids, le premier était **douze à quatorze points au-dessus du cinquième** et le
     titre était joué avant août : mesuré, 3,9 champions différents sur vingt saisons
     et le titre conservé 59 % du temps. À 2,4, l'écart tombe à neuf ou dix, et une
     saison peut basculer. */
  const pris = new Set();
  const faire = (x, elite) => {
    const ancre = clamp(52 + x.s * PENTE_CLUB, 44, 74);
    const pot = clamp(ancre - (elite ? 0 : PRIME_ELITE) + rnd(-3, 3), 40, 80);
    const sq = creerEffectifAdverse(clamp(pot + rnd(-3, 3), 42, 80), pris);
    return { nom:x.nom, ancre: dec1(ancre), pot: dec1(pot), sq, force: forceEffectif(sq) };
  };
  /* L'élite : six clubs d'histoire et douze qui remplissent. L'échelon inférieur :
     ce qui reste, et **les gros clubs qui n'ont pas été tirés** — un grand peut donc
     être en bas et remonter, ce qui arrive vraiment. */
  /* À l'étranger, le vivier ne porte pas deux divisions : l'Angleterre en fournit 28
     clubs en tout, l'Espagne 22. Les grands clubs d'histoire n'y sont pas six non plus
     (trois en Espagne en 1962) : on prend ce qu'il y a et on complète, pour que le
     tableau fasse bien dix-huit. Conséquence assumée : **pas de montée ni de descente
     hors de France** — ce qui s'y joue à la place est dans `renouvelerElite()`. */
  const nG = Math.min(6, gros.length);
  const d1 = [...gros.slice(0, nG), ...petits.slice(0, 18 - nG)].map(x => faire(x, true))
    .sort((a, b) => b.force - a.force);
  const d2 = PAYS[p] && PAYS[p].d2
    ? [...gros.slice(6, 9), ...petits.slice(12, 27)].map(x => faire(x, false))
      .sort((a, b) => b.force - a.force)
    : [];
  return { equipes: d1, autre: d2, N: d1.length,
    classement: Object.fromEntries(d1.map(e => [e.nom, { pts:0, j:0, v:0, n:0, d:0, bp:0, bc:0 }])) };
}
/* ========== LES MONTÉES ET LES DESCENTES ==========
   Deux divisions existent ; on ne simule que le classement de la tienne. Les trois
   derniers de l'élite descendent, les trois premiers de l'échelon inférieur montent
   — et si c'est ton club qui descend, **tu descends avec lui** et la saison suivante
   se joue là, avec le même moteur. Une place de milieu de tableau cesse d'être
   décorative : c'est ce qui manquait au classement. Ce qui ne se joue pas se tire
   au sort, pondéré par la force : on ne sait jamais qui montera. */
const MONTEES = 3;
/* CE QUE VAUT L'ÉLITE. Sans cette prime, monter et descendre **gonflait le
   championnat** : chaque été l'élite échangeait ses trois plus faibles contre les
   trois meilleurs de l'échelon inférieur, dont les potentiels étaient les mêmes —
   donc sa moyenne montait de cinq points en dix saisons (mesuré). Un club de
   l'élite a plus d'argent, donc un potentiel plus haut, et il le perd en
   descendant : la descente coûte, la montée rapporte, et l'échange redevient
   neutre. C'est aussi ce qui donne à une descente son poids. */
const PRIME_ELITE = 6;
function abrDivision(d){
  if ((S.pays || 'FR') !== 'FR') return monPays().abr;
  return `${S.annee >= 2002 ? 'L' : 'D'}${d == null ? (S.division || 1) : d}`;
}
function nomDivision(d){
  /* Hors de France il n'y a qu'un échelon : le nom du championnat EST la division. */
  if ((S.pays || 'FR') !== 'FR') return nomChampionnat(S.pays, S.annee);
  const n = d == null ? (S.division || 1) : d;
  return n === 1 ? (S.annee >= 2002 ? "Ligue 1" : "Division 1")
    : (S.annee >= 2002 ? "Ligue 2" : "Division 2");
}
function toutesLesEquipes(){ return (S.ligue.equipes || []).concat(S.ligue.autre || []); }
/* Un tirage pondéré par la force : les meilleurs montent le plus souvent, pas
   toujours. `sens` = 1 pour le haut, -1 pour le bas. */
function tirerBout(l, n, sens){
  const rest = l.slice(), out = [];
  const moy = rest.reduce((a, e) => a + e.force, 0) / Math.max(1, rest.length);
  while (out.length < n && rest.length){
    const poids = rest.map(e => Math.pow(Math.max(.3, 1 + sens * (e.force - moy) * .35), 2));
    let t = poids.reduce((a, x) => a + x, 0) * Math.random(), i = 0;
    while (i < rest.length - 1 && (t -= poids[i]) > 0) i++;
    out.push(rest[i]); rest.splice(i, 1);
  }
  return out;
}
/* Le rang de la saison passée, noté avant que les divisions s'échangent : c'est lui
   qui donne l'élan. Les clubs de l'autre division n'ont pas de classement joué, donc
   leur élan se lit sur leur force. */
function noterRangs(){
  const cl = classementTrie();
  (S.ligue.equipes || []).forEach(e => {
    const i = cl.findIndex(x => x.nom === e.nom);
    e.rang = i >= 0 ? i + 1 : null;
  });
  (S.ligue.autre || []).forEach(e => { e.rang = null; });
}
function promotionsRelegations(){
  const mienne = S.ligue.equipes || [], autre = S.ligue.autre || [];
  if (!monPays().d2) return renouvelerElite();
  if (!autre.length || mienne.length < 6) return;
  const cl = classementTrie().filter(x => mienne.some(e => e.nom === x.nom));
  const nomsDe = l => l.map(e => e.nom);
  let d1, d2, bas, haut;
  if ((S.division || 1) === 1){
    bas = cl.slice(-MONTEES).map(x => x.nom);
    haut = tirerBout(autre, MONTEES, 1);
    d1 = mienne.filter(e => !bas.includes(e.nom)).concat(haut);
    d2 = autre.filter(e => !haut.includes(e)).concat(mienne.filter(e => bas.includes(e.nom)));
  } else {
    // tu joues l'échelon inférieur : les trois premiers de TA division montent
    const monte = cl.slice(0, MONTEES).map(x => x.nom);
    const descend = tirerBout(autre, MONTEES, -1);
    d1 = autre.filter(e => !descend.includes(e)).concat(mienne.filter(e => monte.includes(e.nom)));
    d2 = mienne.filter(e => !monte.includes(e.nom)).concat(descend);
    bas = nomsDe(descend); haut = mienne.filter(e => monte.includes(e.nom));
  }
  /* L'argent arrive et repart le jour de l'échange : une montée ne se paie pas en
     dix ans. */
  const etait1 = new Set(((S.division || 1) === 1 ? mienne : autre).map(e => e.nom));
  d1.forEach(e => { if (!etait1.has(e.nom)) e.pot = dec1(clamp(e.pot + PRIME_ELITE, 40, 80)); });
  d2.forEach(e => { if (etait1.has(e.nom)) e.pot = dec1(clamp(e.pot - PRIME_ELITE, 40, 80)); });
  const avant = S.division || 1;
  S.division = d1.some(e => e.nom === S.club.nom) ? 1 : 2;
  S.ligue.equipes = S.division === 1 ? d1 : d2;
  S.ligue.autre = S.division === 1 ? d2 : d1;
  S.mouvDiv = { montent: haut.map(e => e.nom), descendent: bas.slice() };
  if (S.division !== avant)
    jrn('division', S.division === 2 ? `${S.club.nom} descend en ${nomDivision(2)}.`
      : `${S.club.nom} remonte en ${nomDivision(1)}.`);
}

/* CE QUI REMPLACE LA MONTÉE ET LA DESCENTE HORS DE FRANCE. Le vivier d'un pays
   étranger ne porte pas deux divisions (voir `creerLigue`), mais un classement qui a un
   bas de tableau sans conséquence est un chiffre affiché sans conséquence — la règle du
   projet. Les trois derniers **quittent donc le monde simulé** et trois clubs du vivier
   restant prennent leur place. Et si c'est ton club, tu descends avec lui : il n'y a pas
   d'échelon inférieur où te suivre, donc **ton contrat tombe** et il faut partir. C'est
   la deuxième chose du jeu qui t'y oblige, après le non-renouvellement. */
function renouvelerElite(){
  const l = S.ligue.equipes || [];
  if (l.length < 6) return;
  const cl = classementTrie().filter(x => l.some(e => e.nom === x.nom));
  const bas = cl.slice(-MONTEES).map(x => x.nom);
  if (!bas.length) return;
  /* `bas` est rangé du moins mauvais au dernier : si on ne peut en remplacer que deux,
     ce sont les **deux derniers** qui partent, pas les deux premiers de la charrette. */
  const dk = typeof decadeKey === 'function' ? decadeKey(S.annee) : '10';
  const dedans = l.map(e => e.nom);
  const pool = poolPays(S.pays, dk);
  const libres = shuffle(pool.gros.concat(pool.petits).filter(x => !dedans.includes(x.nom)));
  const pris = nomsPris();
  /* On ne sort que ce qu'on peut remplacer : un championnat garde sa taille, sinon le
     tableau se vide d'une saison sur l'autre (mesuré avant la correction du vivier). */
  const neufs = libres.slice(0, Math.min(bas.length, libres.length)).map(x => {
    const ancre = clamp(52 + x.s * PENTE_CLUB, 44, 74);
    const pot = clamp(ancre - PRIME_ELITE + rnd(-3, 3), 40, 80);
    const sq = creerEffectifAdverse(clamp(pot + rnd(-3, 3), 42, 80), pris);
    return { nom:x.nom, ancre:dec1(ancre), pot:dec1(pot), sq, force:forceEffectif(sq) };
  });
  const sortent = bas.slice(bas.length - neufs.length);
  S.ligue.equipes = l.filter(e => !sortent.includes(e.nom)).concat(neufs);
  S.mouvDiv = { montent: neufs.map(e => e.nom), descendent: sortent.slice() };
  if (sortent.includes(S.club.nom)){
    S.clubDescendu = true;
    jrn('division', `${S.club.nom} descend. Il n'y a pas de division en dessous pour toi : il faut partir.`);
  }
}

/* L'été du championnat : chaque club rejoue son niveau, dans les deux divisions.
   Ton club passe par la même porte que les autres — il n'a plus de règle à lui, et
   depuis `syncClubSq()` il n'a plus d'effectif fantôme non plus. */
function faireVivreLigue(){
  const pris = nomsPris();
  const divs = [S.ligue.equipes || [], S.ligue.autre || []];
  divs.forEach((div, i) => {
    const elite = (i === 0) === ((S.division || 1) === 1);
    const N = Math.max(1, div.length);
    const ordre = div.slice().sort((a, b) => b.force - a.force);
    div.forEach(e => {
      if (e.ancre == null){ e.ancre = e.force; e.pot = e.force; }   // ligue d'avant
      const rang = e.rang || (ordre.findIndex(x => x.nom === e.nom) + 1);
      // ce que la saison passée a rapporté : une bonne place attire, une mauvaise vide
      const elan = rang ? (N / 2 - rang) * ELAN_CLUB : 0;
      // le potentiel dérive lentement, rappelé vers ce que le club pèse
      // historiquement — plus la prime de sa division
      const cible = e.ancre - (elite ? 0 : PRIME_ELITE);
      e.pot = dec1(clamp(e.pot * .93 + cible * .07 + rnd(-1.6, 1.6), 40, 80));
      /* Ce que le club cherchera sur le marché : élan de la saison passée, tirage,
         et rappel vers son potentiel. La force n'est plus posée, elle **découle** de
         l'effectif une fois qu'il a vieilli et que le marché a fait son travail. */
      e.vise = clamp(e.force * .45 + e.pot * .55 + elan + rnd(-TIRAGE_CLUB, TIRAGE_CLUB), 42, 80);
      if (!e.sq) e.sq = creerEffectifAdverse(e.force, pris);
      vieillirEffectif(e, pris);
      e.rang = null;
    });
  });
  /* Le classement suit la division où tu joues, et il vient d'en changer. */
  S.ligue.classement = Object.fromEntries((S.ligue.equipes || []).map(e => [e.nom, { pts:0, j:0, v:0, n:0, d:0, bp:0, bc:0 }]));
}

/* ========== LE MERCATO ==========
   Le propriétaire, 27/09/2026 : « vas-y pour le mercato ». C'était la dernière
   pièce manquante du monde : les clubs se renforçaient en **inventant** des recrues
   et en effaçant des joueurs, donc personne ne partait jamais nulle part et le
   marché n'existait pas. Désormais un transfert a un nom, un club de départ et un
   club d'arrivée — et ton vestiaire est dans le même sac que les autres, donc on
   peut te prendre ton milieu et t'amener un concurrent.
   Qui achète : celui qui a besoin. Qui vend : celui qui a du rab à ce poste, celui
   qui est plus petit que l'acheteur, ou celui qui doit vendre. */
const MOUVEMENTS_ETE = 40;
/* CE QU'UN CLUB FAIT EN UN ÉTÉ. Sans plafond, un club très au-dessus de ce qu'il
   vise **vend tout** en une fois : mesuré, quatorze départs et quatorze gamins du
   centre en un seul mercato — l'écran devenait illisible et l'effectif calibré de
   la première saison disparaissait d'un coup. Trois entrées, trois sorties : un
   club se refait en deux ou trois étés, comme dans la vraie vie. */
const MOUV_PAR_CLUB = 3;
/* Le poste où l'acheteur est le plus loin de ce qu'il vise : c'est là qu'il cherche. */
function posteFaible(e){
  let pire = null;
  Object.entries(FORMATION).forEach(([po, k]) => {
    const l = e.sq.filter(j => j.p === po).sort((a, b) => b.v - a.v).slice(0, k);
    const moy = l.length ? l.reduce((a, j) => a + j.v, 0) / l.length : 40;
    if (!pire || moy < pire.moy) pire = { po, moy };
  });
  return pire ? pire.po : 'M';
}
function tirerPoids(l, f){
  const poids = l.map(f);
  let t = poids.reduce((a, x) => a + x, 0) * Math.random(), i = 0;
  while (i < l.length - 1 && (t -= poids[i]) > 0) i++;
  return l[i];
}
/* Une recrue pousse quelqu'un dehors, et ce quelqu'un a un nom. Il disparaissait
   en silence : l'écran du mercato montrait alors des départs sans départ et des
   gamins du centre sans raison. */
function pousserDehors(e, po, mouv){
  const trop = e.sq.filter(j => j.p === po);
  if (trop.length <= EFFECTIF[po]) return;
  const sorti = trop.filter(j => !j.moi).sort((a, b) => a.v - b.v)[0];
  if (!sorti) return;
  e.sq.splice(e.sq.indexOf(sorti), 1);
  e.nOut = (e.nOut || 0) + 1;
  mouv.push({ nom:sorti.n, poste:po, age:sorti.a, niv: Math.round(sorti.v), de:e.nom, vers:null });
}
/* EN MODE ENTRAÎNEUR·EUSE, LE MARCHÉ NE RECRUTE PAS À TA PLACE — MAIS IL TE PREND
   ENCORE DES JOUEURS (le propriétaire, 21/09/2026 : « le mercato est ma partie
   préférée du mode »). C'est la seule chose que le marché automatique avait besoin
   d'apprendre : ton club cesse d'être un **acheteur** (c'est toi, sur l'écran du
   mercato) et reste un **vendeur** comme les autres. Un entraîneur ne contrôle que
   la moitié d'un mercato ; l'autre moitié, c'est un club qui vient chercher son
   milieu et qu'il faut remplacer. En mode joueur·euse rien ne change : ton club
   recrute tout seul et tu le lis sur l'écran. */
function achetePasSeul(e){ return S.mode === 'coach' && e.nom === S.club.nom; }
function mercato(){
  const eqs = toutesLesEquipes();
  if (eqs.length < 4) return [];
  const pris = nomsPris();
  eqs.forEach(e => { e.force = forceEffectif(e.sq); if (e.vise == null) e.vise = e.force; });
  const mouv = [];
  eqs.forEach(e => { e.nIn = 0; e.nOut = 0; });
  /* LES VENTES FORCÉES, ET POURQUOI ELLES SONT INDISPENSABLES. Sans elles le marché
     ne pousse que vers le haut : un club qui a besoin achète, un club qui a de trop
     ne fait rien — et la moyenne du championnat monte de six points en dix saisons
     (mesuré). Un club qui doit vendre vend donc son meilleur, à un club qui en a
     besoin si l'un se présente, à l'étranger sinon, et c'est un jeune du centre qui
     prend la place. C'est ce que faisait l'ancien « on se fait piller par le haut ». */
  for (let k = 0; k < MOUVEMENTS_ETE; k++){
    const vendeurs = eqs.filter(e => e.force - e.vise > 1 && e.nOut < MOUV_PAR_CLUB);
    if (!vendeurs.length) break;
    const vend = tirerPoids(vendeurs, e => Math.pow(e.force - e.vise, 1.3));
    const postes = Object.keys(EFFECTIF).filter(po => vend.sq.filter(j => j.p === po).length > FORMATION[po]);
    if (!postes.length) break;
    const po = pick(postes);
    const j = vend.sq.filter(x => x.p === po && !x.moi).sort((a, b) => b.v - a.v)[0];
    if (!j) continue;
    // un club qui en a besoin à ce poste se sert avant l'étranger
    const preneurs = eqs.filter(e => e !== vend && !achetePasSeul(e) && e.vise - e.force > .8 && e.nIn < MOUV_PAR_CLUB
      && j.v > (e.sq.filter(x => x.p === po).sort((a, b) => b.v - a.v)[FORMATION[po] - 1] || { v:99 }).v);
    const ach = preneurs.length ? tirerPoids(preneurs, e => Math.pow(e.vise - e.force, 1.3)) : null;
    vend.sq.splice(vend.sq.indexOf(j), 1);
    if (ach){
      ach.sq.push(j);
      pousserDehors(ach, po, mouv);
      ach.force = forceEffectif(ach.sq);
    }
    vend.sq.push(jeuneDuCentre(po, vend, pris));
    vend.force = forceEffectif(vend.sq);
    vend.nOut++; if (ach) ach.nIn++;
    mouv.push({ nom:j.n, poste:po, age:j.a, niv: Math.round(j.v),
      de:vend.nom, vers: ach ? ach.nom : null });
  }
  for (let k = 0; k < MOUVEMENTS_ETE; k++){
    const acheteurs = eqs.filter(e => !achetePasSeul(e) && e.vise - e.force > .8 && e.nIn < MOUV_PAR_CLUB);
    if (!acheteurs.length) break;
    const ach = tirerPoids(acheteurs, e => Math.pow(e.vise - e.force, 1.3));
    const po = posteFaible(ach);
    const chezMoi = ach.sq.filter(j => j.p === po).sort((a, b) => b.v - a.v);
    const seuil = (chezMoi[FORMATION[po] - 1] ? chezMoi[FORMATION[po] - 1].v : 40) + 1;
    // qui est sur le marché, et à qui
    const cand = [];
    eqs.forEach(vend => {
      if (vend === ach) return;
      if (vend.nOut >= MOUV_PAR_CLUB) return;           // il a déjà fait son été
      const l = vend.sq.filter(j => j.p === po).sort((a, b) => b.v - a.v);
      if (l.length <= FORMATION[po]) return;            // il n'a personne à perdre
      l.forEach((j, i) => {
        if (j.moi || j.v < seuil) return;
        const rab = i >= FORMATION[po];                  // il ne joue pas là-bas
        const petit = vend.force < ach.force - 2;        // un plus grand se sert
        const doitVendre = vend.vise < vend.force - 1;   // il doit vendre
        const vieux = j.a >= 29 && vend.vise <= vend.force;
        if (rab || petit || doitVendre || vieux) cand.push({ j, vend, rab });
      });
    });
    if (!cand.length) continue;
    /* On veut le meilleur possible, mais un club plus fort que l'acheteur ne lâche
       pas son titulaire : c'est ce qui empêche le marché de tout niveler. */
    const c = tirerPoids(cand, x => Math.pow(Math.max(.5, x.j.v - seuil + 2), 1.4)
      / (1 + Math.max(0, x.vend.force - ach.force) * (x.rab ? .25 : .7)));
    c.vend.sq.splice(c.vend.sq.indexOf(c.j), 1);
    ach.sq.push(c.j);
    // le vendeur comble son trou s'il n'a plus assez de monde
    Object.entries(EFFECTIF).forEach(([p2, n]) => {
      while (c.vend.sq.filter(j => j.p === p2).length < n) c.vend.sq.push(jeuneDuCentre(p2, c.vend, pris));
    });
    // et l'acheteur laisse partir son plus faible à ce poste s'il est en surnombre
    pousserDehors(ach, po, mouv);
    ach.force = forceEffectif(ach.sq); c.vend.force = forceEffectif(c.vend.sq);
    ach.nIn++; c.vend.nOut++;
    mouv.push({ nom:c.j.n, poste:po, age:c.j.a, niv: Math.round(c.j.v),
      de:c.vend.nom, vers:ach.nom });
  }
  eqs.forEach(e => { e.force = forceEffectif(e.sq); });
  S.ligue.equipes.sort((a, b) => b.force - a.force);
  (S.ligue.autre || []).sort((a, b) => b.force - a.force);
  S.ligue.classement = Object.fromEntries(S.ligue.equipes.map(e => [e.nom, { pts:0, j:0, v:0, n:0, d:0, bp:0, bc:0 }]));
  return mouv;
}

/* ========== TON CLUB N'A PLUS DEUX EFFECTIFS ==========
   `S.ligue.equipes` donnait à ton club vingt-deux joueurs fantômes, vieillis et
   transférés comme ceux des autres, et sa force en découlait — pendant que tes vrais
   coéquipiers étaient tirés de cette force. Deux populations pour un seul vestiaire,
   dont une que tu ne verrais jamais. Maintenant il n'en a qu'une : la tienne. C'est
   ce qui rend le mercato possible, parce qu'on ne peut transférer que des gens qui
   existent. */
function monClub(){ return toutesLesEquipes().find(e => e.nom === S.club.nom) || null; }
function syncClubSq(){
  const e = monClub(); if (!e || !S.equipe) return;
  const sq = [];
  S.equipe.forEach(j => { if (j.pot == null) j.pot = potDe(j.niv, j.age);
    sq.push({ n:j.nom, p:j.poste, a:j.age, v:j.niv, t:j.pot }); });
  (S.concurrents || []).forEach(c => { if (c.pot == null) c.pot = potDe(c.niv, c.age);
    sq.push({ n:c.nom, p:S.moi.poste, a:c.age, v:c.niv, t:c.pot }); });
  const v = Math.round(niveau());
  sq.push({ n:S.moi.nom, p:S.moi.poste, a:S.moi.age, v, t:v, moi:true });
  e.sq = sq;
  e.force = forceEffectif(sq);
  S.club.force = e.force;
}
/* Et le retour : on relit l'effectif du club et on retrouve ses gens. Ceux qui sont
   restés gardent leur objet — donc leur histoire, leurs notes, leur relation ; ceux
   qui sont partis disparaissent ; les arrivés naissent ici. */
function relireClubSq(){
  const e = monClub(); if (!e) return { arrivees:[], partis:[] };
  const avant = {};
  (S.equipe || []).forEach(j => avant[j.nom] = j);
  (S.concurrents || []).forEach(c => avant[c.nom] = c);
  const partis = Object.keys(avant).filter(n => !e.sq.some(j => j.n === n))
    .map(n => ({ nom:n, poste: avant[n].poste || S.moi.poste, age: avant[n].age }));
  const arrivees = [], joueurs = [];
  e.sq.forEach(j => {
    if (j.moi) return;
    const old = avant[j.n];
    if (old){
      old.age = j.a; old.niv = Math.round(j.v); old.pot = j.t; old.poste = j.p;
      joueurs.push(old);
    } else {
      const o = { nom:j.n, poste:j.p, age:j.a, niv: Math.round(j.v), pot:j.t,
        forme:0, blesse:0, susp:0, prog:0, note:null };
      joueurs.push(o); arrivees.push(o);
    }
  });
  joueurs.forEach(j => { j.forme = 0; j.blesse = 0; j.susp = 0; j.rancune = 0;
    j.note = null; j.noteR = null; j.sum = 0; j.nb = 0; j.sumR = 0; j.nbR = 0;
    delete j.monte; });
  /* Le partage : à ton poste, les meilleurs sont tes rivaux, les autres des
     coéquipiers. Il se refait chaque été — donc une recrue peut passer devant toi,
     et un rival qui décline redevient un coéquipier. */
  const nb = S.moi.poste === 'G' ? 1 : 2;
  const auPoste = joueurs.filter(j => j.poste === S.moi.poste).sort((a, b) => b.niv - a.niv);
  S.concurrents = auPoste.slice(0, nb);
  S.equipe = joueurs.filter(j => S.concurrents.indexOf(j) < 0);
  const jeune = S.equipe.filter(j => j.age <= 22).sort((a, b) => a.age - b.age)[0];
  if (jeune) jeune.monte = true;
  return { arrivees: arrivees.map(o => ({ nom:o.nom, poste:o.poste, age:o.age, niv:o.niv,
      rival: S.concurrents.indexOf(o) >= 0 })), partis };
}
/* Tu signes ailleurs. Deux choses arrivent, et elles sont vraies : ton ancien club
   te remplace, et ton nouveau club te fait de la place. Tes nouveaux coéquipiers
   sont **les joueurs de ce club** — ceux dont tu lisais les noms au classement et
   dans les buts encaissés, pas un effectif tiré au sort pour l'occasion. */
/* ON RANGE LE MONDE QU'ON QUITTE. Sans ça, dix saisons de noms de clubs et de buteurs
   s'effaceraient en signant ailleurs, et revenir en France donnerait un championnat
   d'inconnus — alors que « une carrière doit laisser une trace » est le sujet du jeu.
   Le championnat mis de côté continue sans toi : on le fait vivre d'autant d'étés que
   tu as passés ailleurs (plafonné à six, au-delà ce n'est plus le même monde de toute
   façon et chaque passage coûte un vieillissement de vingt-deux joueurs par club). */
function changerDePays(pays, club){
  const vieux = S.pays || 'FR';
  S.mondes = S.mondes || {};
  S.mondes[vieux] = { ligue:S.ligue, division:S.division || 1, an:S.annee };
  const garde = S.mondes[pays];
  S.pays = pays;
  if (garde){
    S.ligue = garde.ligue; S.division = garde.division || 1;
    delete S.mondes[pays];
    const n = clamp(Math.round(S.annee - (garde.an || S.annee)), 0, 6);
    for (let k = 0; k < n; k++) faireVivreLigue();
  } else {
    S.division = 1; S.ligue = creerLigue(S.annee, pays);
  }
  assurerClub(club);
  S.ligue.N = (S.ligue.equipes || []).length;
  S.ligue.classement = Object.fromEntries((S.ligue.equipes || [])
    .map(e => [e.nom, { pts:0, j:0, v:0, n:0, d:0, bp:0, bc:0 }]));
  S.clubDescendu = false;
  jrn('pays', `Tu quittes ${nomPays(vieux)} pour ${nomPays(pays)} : ${nomChampionnat(pays, S.annee)}.`);
}
/* Le club qui t'appelle de l'étranger n'a pas d'effectif tant que tu n'as pas signé :
   une offre n'est qu'un nom et une force. S'il n'est pas dans le championnat qu'on vient
   de fabriquer (un tirage l'a laissé dehors), on l'y met — sinon `monClub()` rendrait
   null et la première journée planterait. */
function assurerClub(club){
  const l = S.ligue.equipes || (S.ligue.equipes = []);
  /* IL FAUT REGARDER LES DEUX DIVISIONS. Mesuré : en rentrant en France, un club rangé
     dans l'échelon inférieur du monde qu'on avait quitté n'était pas trouvé dans
     l'élite, on l'y ajoutait — et il existait **deux fois**, avec ses vingt-deux
     joueurs. 204 doublons de club et 272 de joueur sur dix-huit carrières. Le
     changement de division, lui, se fait juste après dans `rejoindre()`. */
  if (toutesLesEquipes().some(e => e.nom === club.nom)) return;
  const f = clamp(club.force || 55, 42, 80);
  const sq = creerEffectifAdverse(f, nomsPris());
  if (l.length >= 18){ l.sort((a, b) => b.force - a.force); l.pop(); }
  l.push({ nom:club.nom, ancre:dec1(f), pot:dec1(f), sq, force:forceEffectif(sq) });
}
function rejoindre(club){
  const pris = nomsPris();
  const vieux = monClub();
  if (vieux){
    const i = vieux.sq.findIndex(j => j.moi);
    if (i >= 0){
      vieux.sq.splice(i, 1);
      vieux.sq.push(recrue(S.moi.poste, (vieux.vise || vieux.force) + rnd(-2, 3), pris));
    }
    vieux.force = forceEffectif(vieux.sq);
  }
  if (club.pays && club.pays !== (S.pays || 'FR')) changerDePays(club.pays, club);
  S.club = { nom: club.nom, force: Math.round(club.force) };
  /* Signer dans l'autre division, c'est changer de division. `S.ligue.equipes` est
     toujours celle où tu joues : sans cet échange, ton club n'était plus au
     classement et la première journée plantait. */
  if ((S.ligue.autre || []).some(x => x.nom === club.nom)){
    const t = S.ligue.equipes; S.ligue.equipes = S.ligue.autre; S.ligue.autre = t;
    S.division = (S.division || 1) === 1 ? 2 : 1;
    jrn('division', `Tu joues ${nomDivision()} cette saison.`);
  }
  const e = monClub();
  if (e){
    const l = e.sq.filter(j => j.p === S.moi.poste).sort((a, b) => a.v - b.v);
    if (l.length >= EFFECTIF[S.moi.poste] && l[0]) e.sq.splice(e.sq.indexOf(l[0]), 1);
    const v = Math.round(niveau());
    e.sq.push({ n:S.moi.nom, p:S.moi.poste, a:S.moi.age, v, t:v, moi:true });
    e.force = forceEffectif(e.sq);
    S.club.force = e.force;
  }
  S.equipe = []; S.concurrents = [];
  relireClubSq();
  S.lignes = { def:50, mil:50, att:50 };
  S.ligneRef = { ...S.lignes };
  S.liens.coach = 50; S.liens.club = 52;   // tout est à refaire ailleurs
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
   plafond ; une baisse s'arrête au socle. L'usure passe par ici et n'a rien de
   plus à savoir.
   LE PLAFOND ÉTAIT DÉCORATIF (le propriétaire, 01/10/2026 : sa technique à 80,8
   pour un plafond de 79). Cette fonction promettait « une hausse libre jusqu'au
   plafond » **et ne lisait jamais le plafond** : mesuré sur 12 carrières entières,
   75 % des lectures étaient au-dessus, de +5 en moyenne et jusqu'à +22,9. La cause
   est le plancher de la marge d'une séance (`.12`) : même collé au plafond, une
   séance rend encore deux points de trace par saison, et ça s'accumule vingt ans.
   Le plafond est maintenant lu — et la borne retient **trois** choses, pour ne
   rien casser au passage :
   — `base`, donc une carrière déjà au-dessus n'est jamais rabotée : elle cesse de
     monter, elle ne perd rien de ce qu'elle a gagné ;
   — `plafondReel(a)`, la vraie limite (ton potentiel, borné par la moyenne des
     autres axes + 25) ;
   — `pic[a]`, sans quoi la séance mentale ne pourrait plus te rendre la tête que
     tu avais quand `plafondReel` a baissé derrière toi — c'est-à-dire la spirale
     refermée le 27/09, qu'on rouvrirait sans le voir. */
function bougerAxe(a, d){
  let v = clamp(S.moi.base[a] + d);
  if (d > 0) v = Math.min(v, Math.max(S.moi.base[a], plafondReel(a),
    (S.moi.pic && S.moi.pic[a]) || 0));
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
  /* Seul, tout cogne plus fort. C'est le deuxième bout de l'effet des tiens : ils
     n'amortissent pas ta semaine, ils amortissent ta vie. */
  pts *= clamp(1 + (50 - proches()) * .005, .8, 1.3);
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
/* CE QUE TU VAUX SUR LE TERRAIN AUJOURD'HUI : le niveau, la forme, et la fraîcheur.
   C'est ce que lit le moteur de match, ta contribution à la force de l'équipe et ta
   note — là où être vidé se paie pour de bon. */
function niveauJour(){
  return niveau() + (S.etats.forme - 60) * .06 + (S.etats.fraicheur - 85) * .05;
}
/* CE QUE LE COACH REGARDE QUAND IL FAIT SON ONZE — et **la fraîcheur n'en fait pas
   partie** (le propriétaire, 30/09/2026 : « le repos, la fraîcheur, ne doit pas faire
   titulariser plus, mais par contre il joue sur le temps de jeu du joueur : moins on
   est frais, moins on peut jouer longtemps »). Mesuré avant de le retirer : la
   fraîcheur valait **4,5 points** de `valeurAuPoste()` entre 100 % et 10 %, soit plus
   que la confiance du coach d'un bout à l'autre — donc se reposer était la façon la
   plus rapide d'entrer dans le onze, ce qui n'est pas du football. Elle décide
   maintenant de **combien de temps tu restes sur le terrain**, jamais de ta
   présence sur la feuille. */
function niveauCoach(){
  return niveau() + (S.etats.forme - 60) * .06;
}

/* ---------- la semaine ---------- */
/* Chaque axe a **son** effet long terme, et ce n'est pas « du niveau » (retour du
   propriétaire, 27/09/2026). Court terme, tout coûte de la fraîcheur ; long terme :
   - physique  → ton corps : on récupère plus vite, on se blesse moins, et une
     charge coûte moins cher ;
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
    axe:'phys', fit:-11, rende:1.15, dit:[{c:'risk',t:"🫁 samedi : fatigué"},{c:'foot',t:"💪 récupérer vite, se blesser moins"}] },
  { id:'ment', ico:'🧠', nom:"La vidéo et le calme", sub:"Tes matchs revus, et du silence.",
    axe:'ment', fit:-7, rende:.85, dit:[{c:'foot',t:"🛡️ mental : encaisser"},{c:'vie',t:"🏡 du temps chez toi"}] },
  { id:'spec', ico:'🎯', nom:"Le travail de ton poste", sub:"Une heure seul avec l'adjoint.",
    axe:'spec', fit:-8, rende:1, dit:[{c:'foot',t:"🎽 ta place dans le onze"},{c:'risk',t:"🫁 une heure de plus"}] },
  { id:'normale', ico:'🔁', nom:"La semaine normale", sub:"Ce que le coach demande, pas plus.",
    axe:null, fit:-2, dit:[{c:'neutre',t:"↔️ un peu de tout"}] },
  { id:'repos', ico:'🛌', nom:"Lever le pied", sub:"Le corps tire. Tu écoutes.",
    axe:null, fit:8, dit:[{c:'foot',t:"🫁 samedi : frais"},{c:'vie',t:"🏡 deux jours avec les tiens"}] },
];
/* CE QUE LE PHYSIQUE FAIT, ET IL FAIT TROIS CHOSES (le propriétaire, 30/09/2026 :
   « le physique joue sur la capacité à se blesser, et sur la **vitesse de
   récupération** de la fraîcheur — il ne faut pas qu'un entraînement de physique
   augmente la fraîcheur… Un physique à 30 sur 100 provoque des blessures
   fréquentes ; un physique à 80, il se blesse très très peu, il enchaîne les
   matchs, il peut jouer un match complet et faire un entraînement sans que ça tape
   trop dans ses réserves pour le week-end. Plus il y a de physique, plus il peut
   assumer de charge intensive, à l'entraînement et au match, sans avoir à se
   reposer »).
   Son modèle est **l'axe lui-même**, sur 0-100 — pas la réserve `fond` que j'avais
   inventée à côté et qui faisait un cinquième chiffre à entretenir. `fond`
   disparaît : les trois effets qu'il portait sont repris par `phys`, qui est déjà
   ce que la séance physique entraîne et ce que le joueur lit à l'écran.
   Et la règle qu'il pose est respectée à la lettre : **une séance physique coûte de
   la fraîcheur comme les autres** (−11, la plus chère) ; ce qu'elle rend, c'est la
   vitesse à laquelle on la récupère et la charge qu'on encaisse sans la perdre. */
function physique(){ return clamp(S.moi.base.phys + S.moi.boost.phys, 0, 100); }
/* Ce que coûte une charge — une séance, un match. À 80 on paie 82 % du prix, à 30
   on en paie 112 %. C'est le « sans avoir à se reposer » de sa phrase. */
function chargePhys(){ return clamp(1 - (physique() - 50) * .006, .62, 1.24); }
/* Et la vitesse à laquelle la semaine te rend ce que samedi t'a pris. Elle a
   **deux termes, et il fallait les deux** (le propriétaire, 30/09/2026 : « ça doit
   pas forcément faire augmenter sa fraîcheur, mais s'il y a eu un entraînement de
   physique, dans la semaine qui suit il récupère des points de fraîcheur »).
   1. **Ce que tu es** : le niveau de l'axe, la trace d'une carrière. À 80 tu
      récupères une fois et demie plus vite qu'à 50, à 30 deux tiers moins.
   2. **Ce que tu viens de faire** : la séance de la semaine, par le `boost`, qui se
      divise par deux à chaque match — donc le remboursement arrive la semaine qui
      suit, fort, puis s'éteint. Sans ce terme, mesuré : une séance physique rendait
      **0,36 point de fraîcheur** la semaine suivante pour un coût de 11, et le boost
      était retombé à 0,39 avant la séance physique suivante. Le remboursement
      n'existait qu'à l'échelle d'une carrière, jamais à celle de la semaine.
   `RECUP_SEANCE_MAX` empêche de l'empiler : une séance est remboursée, dix séances
   d'affilée ne le sont pas dix fois. C'est ce qui garde le choix de la semaine
   vivant — et c'est vrai du football. */
const RECUP_SEANCE = .135, RECUP_SEANCE_MAX = .34;
function recupPhys(){
  /* 2/5 : un préparateur personnel ajoute un cran à la récupération — le même canal
     que la séance physique, donc on sait exactement ce qu'il vaut. */
  return clamp((1 + (S.moi.base.phys - 50) * .016
    + Math.min(S.moi.boost.phys * RECUP_SEANCE, RECUP_SEANCE_MAX))
    * (aAchat('prepa') ? 1.14 : 1), .62, 1.6);
}
function choisirSemaine(id){
  const s = SEMAINES.find(x => x.id === id); if (!s) return;
  S.semaine = s.id;
  // un coût de fraîcheur est amorti par le physique ; un gain ne l'est pas
  S.etats.fraicheur = clampFr(S.etats.fraicheur + (s.fit < 0 ? s.fit * chargePhys() : s.fit));
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
    /* Le remboursement du physique doit se voir, sinon il n'existe pas (la règle du
       projet). Il arrive **après** samedi, pas avant : la séance coûte plein tarif
       maintenant, et la semaine d'après on récupère mieux. */
    if (a === 'phys') S.seance.texte += ` Samedi tu le paieras. C'est la semaine d'après que tes jambes te le rendront.`;
  } else if (s.id === 'repos'){
    S.etats.corps = clamp(S.etats.corps + .8, 0, 100);
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
  /* La fenêtre internationale, au même endroit et pour la même raison : ses jambes
     doivent entrer dans le choix du onze de samedi. */
  S.selecVue = (S.selec && S.selec.dedans && J_SELEC.includes(S.journee)) ? jouerSelection() : null;
  /* Un fait de mercredi prend la main : l'écran du moment s'ouvre, et la semaine
     reprend où elle en était une fois le choix fait. */
  if (S.faitAnnexe) return;
  apresSemaine();
}
function apresSemaine(){ poserEquipeDuJour(); ouvrirArrets(); }
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
/* ====================== LES ARRÊTS ======================
   LA MISE EN CODE DE LA PAGE DE DÉCISIONS (le propriétaire, 30/09/2026 : « vas-y
   pour les arrêts »), §2 et §3 de
   https://claude.ai/artifact/VDvYbM8fkUtuAMyfu58eAW
   Ce qu'il avait trouvé en mesurant les cinquante options d'avant : **dix-neuf
   étaient un gain gratuit, douze une perte sèche, et dix-neuf seulement un vrai
   arbitrage** — 62 % des options du jeu ne décidaient rien. La règle appliquée
   partout ci-dessous, et c'est la seule : **chaque option coûte et gagne quelque
   chose**, dans deux monnaies différentes. La plupart passent de trois options à
   deux, parce qu'une troisième option tiède est ce qui fabriquait les gratuités.
   `corps` (le kiné) est laissé tel quel : c'était déjà la seule famille conforme,
   et c'est elle qui a servi de modèle aux seize autres. */
const ARRETS = [
  // il ne peut plus te dire ça si tu commences le match : le groupe est déjà connu
  { id:'banc', quand: () => S.journee >= 2 && S.eqJour && S.eqJour.statut === 'banc',
    titre:"Le coach t'attend dans son bureau",
    texte:"« Je vais être direct : samedi, tu commences sur le banc. Ce n'est pas contre toi. »",
    options:[
      { l:"Encaisser sans un mot", liens:{ coach:5 }, ment:-1, coup:"ce que tu as ravalé dans son bureau",
        dit:[{c:'foot',t:"🎽 il te trouve professionnel"},{c:'risk',t:"🧠 tu ravales"}] },
      { l:"Demander ce qu'il te manque", liens:{ coach:2 }, axes:{ spec:1 }, fit:-4, ment:-.8,
        coup:"sa réponse, qui était franche",
        dit:[{c:'foot',t:"🎯 il te donne du travail"},{c:'risk',t:"🫁 des séances en plus"},{c:'risk',t:"🧠 sa réponse pique"}] },
      { l:"Lui dire que tu mérites mieux", liens:{ vestiaire:6, coach:-6 }, axes:{ ment:1 },
        dit:[{c:'foot',t:"✊ tu t'es fait entendre"},{c:'risk',t:"🎽 il ne l'oubliera pas"}] },
    ] },
  /* QUAND TU NE JOUES PAS, LA VIE PREND LA PLACE (le propriétaire, 27/09/2026 :
     « ça doit amener des événements hors football pour compenser le fait qu'au
     niveau football il se passe pas grand-chose… ce serait bien qu'il y ait des
     trucs positifs comme le temps avec la famille »). Ces familles ne se
     déclenchent que là, et ce sont les seules portes de sortie. */
  { id:'coachTemps', quand: () => (S.sansJouer || 0) >= 3,
    titre:"Tu frappes à la porte du coach",
    texte:"« Entre. Je sais pourquoi tu viens. » Il repousse son ordinateur. Tu as deux minutes et une phrase à trouver.",
    options:[
      { l:"« Dites-moi ce que je dois faire pour jouer »", liens:{ coach:9 }, fit:-5, axes:{ spec:1.2 },
        dit:[{c:'foot',t:"🎽 il te donne un programme"},{c:'foot',t:"🎯 juste à ton poste"},{c:'risk',t:"🫁 des séances en plus"}] },
      { l:"« Je veux jouer, sinon je pars en juin »", liens:{ agent:10, coach:-7, club:-8 }, axes:{ ment:1 },
        dit:[{c:'foot',t:"🤝 il se met au travail"},{c:'risk',t:"🎽 il n'aime pas les ultimatums"},{c:'risk',t:"🏟️ ça remonte au directeur sportif"}] },
      /* « Attendre mon tour » était gratuit. Son prix est le bon : ton agent
         arrête de travailler pour toi, et ça se paiera en juin. */
      { l:"« Je vais attendre mon tour »", liens:{ coach:3, agent:-5 }, axes:{ ment:1.4 },
        dit:[{c:'foot',t:"🧠 tu tiens"},{c:'foot',t:"🎽 il apprécie"},{c:'risk',t:"🤝 ton agent comprend que tu ne pousses pas"}] },
    ] },
  { id:'agentTemps', quand: () => (S.sansJouer || 0) >= 4 && S.journee >= 8,
    titre:"Ton agent ne prend plus de gants",
    texte:"« Tu n'as pas joué depuis un moment. Je peux te sortir de là dès cet hiver, ou on serre les dents. Ce n'est pas la même carrière. »",
    options:[
      { l:"Qu'il cherche un club où tu joues", liens:{ agent:12, club:-8, coach:-3 },
        dit:[{c:'foot',t:"🤝 il décroche son téléphone"},{c:'risk',t:"🏟️ le club le saura"}] },
      { l:"Rester et se battre", liens:{ coach:6, club:5, agent:-6 }, axes:{ ment:1.2 },
        dit:[{c:'foot',t:"🎽 le coach le remarque"},{c:'foot',t:"🏟️ le club aussi"},{c:'risk',t:"🤝 ton agent te lâche un peu"}] },
    ] },
  // « Tu n'es même pas dans le groupe » : désormais c'est vrai quand ça s'affiche
  { id:'tempsLibre', quand: () => S.eqJour && S.eqJour.statut === 'hors',
    titre:"Un week-end à toi",
    texte:"Tu n'es même pas dans le groupe. Pour la première fois depuis longtemps, samedi t'appartient.",
    options:[
      { l:"Rentrer chez tes parents", liens:{ proches:8, coach:-4 }, axes:{ ment:1.4 }, corps:3,
        dit:[{c:'vie',t:"🏡 les tiens comptent les week-ends"},{c:'foot',t:"🧠 tu respires"},{c:'risk',t:"🎽 il t'a cherché samedi"}] },
      { l:"Aller voir le match depuis la tribune", liens:{ coach:5, vestiaire:3, proches:-4 },
        dit:[{c:'foot',t:"🎽 il t'a vu dans les tribunes"},{c:'foot',t:"✊ le groupe aussi"},{c:'risk',t:"🏡 encore un week-end sans toi"}] },
      { l:"Travailler seul au centre", fit:-6, axes:{ spec:1.4 }, liens:{ proches:-3 }, ment:-.6,
        coup:"ce samedi à t'entraîner seul",
        dit:[{c:'foot',t:"🎯 personne ne te le demandait"},{c:'risk',t:"🫁 tu y laisses ta semaine"},{c:'risk',t:"🏡 le stade te manque"}] },
    ] },
  /* LA VRAIE SITUATION QUAND ON NE JOUE PAS, MESURÉE. Dans la queue des carrières,
     on est **hors du groupe 2,9 % des semaines et sur le banc 79,2 %** : la vie
     s'accroche donc au banc, là où elle se passe vraiment. */
  { id:'bancLong', quand: () => S.eqJour && S.eqJour.statut === 'banc' && (S.sansJouer || 0) >= 3,
    titre:"Encore un survêtement",
    texte:"Tu voyages, tu t'échauffes, tu t'assois. Il ne se retourne pas. Dimanche, en revanche, t'appartient.",
    options:[
      { l:"Le passer avec les tiens", liens:{ proches:8, coach:-3 }, axes:{ ment:1.5 },
        dit:[{c:'vie',t:"🏡 un dimanche entier"},{c:'foot',t:"🧠 tu recharges"},{c:'risk',t:"🎽 la séance du dimanche était ouverte"}] },
      { l:"Rester seul sur le terrain après le match", liens:{ coach:3, proches:-3 }, fit:-7, axes:{ spec:1.3 },
        dit:[{c:'foot',t:"🎯 tu grattes"},{c:'risk',t:"🫁 samedi dans les jambes"},{c:'risk',t:"🏡 encore un dimanche"}] },
      /* La franchise de l'adjoint a maintenant son prix, qui est celui qu'elle a
         dans la vraie vie : elle ne fait pas plaisir. */
      { l:"Demander à l'adjoint ce qu'il regarde chez toi", liens:{ coach:6, vestiaire:2 }, ment:-1.2,
        coup:"ce que l'adjoint t'a dit sans détour",
        dit:[{c:'foot',t:"🎽 il aime qu'on demande"},{c:'risk',t:"🧠 il te répond franchement"}] },
    ] },
  /* LA PIRE DES DIX-SEPT : une option qui ne faisait **strictement rien** (« rester
     poli et vague », club +2 sur une jauge alors morte) et deux options gratuites.
     « Promettre un résultat » est la seule option du jeu dont le coût tombe **la
     semaine suivante** — une phrase qu'on peut avoir à tenir. */
  { id:'presse', quand: () => S.stats.notes.length >= 3 && moyenneNotes() >= 6.8,
    titre:"Un journaliste t'attend à la sortie",
    texte:"« Trois bons matchs de suite. On commence à parler de vous ailleurs. Vous vous sentez à l'étroit ici ? »",
    options:[
      { l:"Dire que tu veux jouer plus haut", liens:{ agent:9, club:-7, supporters:-4 },
        dit:[{c:'foot',t:"🤝 ton agent adore"},{c:'risk',t:"🏟️ le club beaucoup moins"},{c:'risk',t:"📣 la tribune l'a lu"}] },
      { l:"Parler du groupe, pas de toi", liens:{ vestiaire:7, club:4, agent:-5 },
        dit:[{c:'foot',t:"✊ le vestiaire lit la presse"},{c:'foot',t:"🏟️ le club apprécie"},{c:'risk',t:"🤝 il voulait du bruit"}] },
      { l:"Promettre un résultat", liens:{ supporters:8, club:3 }, promesse:'resultat',
        dit:[{c:'foot',t:"📣 le stade s'enflamme"},{c:'risk',t:"⏳ si vous perdez samedi, tu le paieras"}] },
    ] },
  { id:'ancien', quand: () => S.journee >= 5 && vestiaire() < 52,
    titre:"Le plus ancien du vestiaire te prend à part",
    texte:"« On mange tous ensemble jeudi. Tu viens, ou tu rentres encore chez toi ? »",
    options:[
      { l:"Venir, et rester tard", liens:{ vestiaire:9, proches:-3 }, fit:-5,
        dit:[{c:'foot',t:"✊ le groupe t'adopte"},{c:'risk',t:"🫁 la nuit sera courte"},{c:'risk',t:"🏡 encore un jeudi soir dehors"}] },
      /* Deux options exactement opposées, et « décliner » n'est plus une punition :
         la soirée chez toi compte pour de vrai. */
      { l:"Décliner, tu rentres chez toi", liens:{ proches:6, vestiaire:-5 }, fit:2,
        dit:[{c:'vie',t:"🏡 une soirée qui compte"},{c:'foot',t:"🫁 tu dors"},{c:'risk',t:"✊ on l'a remarqué"}] },
    ] },
  /* Les gens autour de toi. Chaque famille vise quelqu'un de nommé. */
  { id:'rival', quand: () => S.journee >= 3 && devantToi(),
    ligne: () => LIGNE_DU_POSTE[S.moi.poste],
    sujet: () => devantToi(),
    titre: q => `${q.nom} a fait une séance énorme`,
    texte: q => `L'adjoint n'a regardé que lui pendant une heure. Le coach a souri deux fois. Toi, tu as fini ton travail dans ton coin.`,
    options:[
      { l:"Rester une heure de plus, seul", fit:-7, axes:{ spec:1.2 },
        dit:[{c:'foot',t:"🎯 ta place : tu grattes"},{c:'risk',t:"🫁 samedi dans les jambes"}] },
      // demander à ton rival lui donne de la confiance : c'est ce qui se passe
      { l:"Aller le voir et lui demander comment il fait", ligne:6, axes:{ spec:.5 }, rivalForme:2,
        dit:[{c:'foot',t:"✊ ta ligne apprécie"},{c:'foot',t:"🎯 tu apprends un peu"},{c:'risk',t:"🎽 il sait que tu t'inquiètes"}] },
      /* « Tu es frais samedi » était promis **sans ajouter un point de fraîcheur** :
         la pastille mentait par omission. Elle en donne quatre. */
      { l:"Laisser couler, ton tour viendra", fit:4, ment:-1.4, coup:"cette séance où il t'a dépassé",
        dit:[{c:'foot',t:"🫁 samedi : frais, pour de vrai"},{c:'risk',t:"🧠 ça te reste en travers"}] },
    ] },
  { id:'jeune', quand: () => S.journee >= 6 && S.equipe.some(j => j.monte),
    ligne: () => { const j = S.equipe.find(x => x.monte); return j ? LIGNE_DU_POSTE[j.poste] : 'mil'; },
    sujet: () => S.equipe.find(j => j.monte),
    titre: q => `${q.nom} progresse vite`,
    texte: q => `Le gamin est arrivé il y a six mois et il a déjà pris dix ans. Il traîne après la séance, il pose des questions. Souvent à toi.`,
    options:[
      { l:"Passer du temps avec lui", ligne:9, fit:-4,
        dit:[{c:'foot',t:"✊ sa ligne te voit autrement"},{c:'risk',t:"🫁 une heure de plus"}] },
      // « tu rentres à l'heure » était une pastille sans effet : elle en a deux
      { l:"Le laisser se débrouiller", ligne:-5, liens:{ proches:4 }, fit:2,
        dit:[{c:'vie',t:"🏡 tu rentres à l'heure"},{c:'foot',t:"🫁 tu récupères"},{c:'risk',t:"✊ sa ligne l'a remarqué"}] },
    ] },
  /* C'ÉTAIT LA PERTE SÈCHE LA PLUS LOURDE DU JEU (ligne −11, coach −3, mental −1,2,
     rien à gagner). Elle gagne maintenant ce qu'une engueulade donne vraiment : tu
     joues libéré. Et « attendre que ça passe » était gratuit : supprimée. */
  { id:'tension', quand: () => S.journee >= 5 && !!ligneFaible() && !!visageDe(ligneFaible()),
    ligne: () => ligneFaible(),
    sujet: (l) => visageDe(l),
    titre: (q, l) => `Ça se tend avec ${LIGNE_LA[l]}`,
    texte: (q, l) => `Deux ballons mal donnés, un regard de trop, et ${q.nom} ne te parle plus à l'échauffement. Toute la ligne s'est rangée derrière lui.`,
    options:[
      { l:"Mettre les choses à plat, tout de suite", ligne:13, fit:-3, ment:-1,
        coup:"cette conversation qu'il fallait avoir",
        dit:[{c:'foot',t:"✊ la ligne respire"},{c:'risk',t:"🫁 une soirée de plus"},{c:'risk',t:"🧠 la conversation coûte"}] },
      { l:"Lui répondre devant tout le monde", ligne:-11, liens:{ coach:-3 }, axes:{ ment:1.5 },
        dit:[{c:'foot',t:"🧠 tu t'es vidé, tu joues libéré"},{c:'risk',t:"✊ la ligne se fige"},{c:'risk',t:"🎽 le coach a vu"}] },
    ] },
  /* La famille que la jauge morte abîmait le plus : « je me sens bien ici » ne
     gagnait **que du club, que rien ne lisait** — donc c'était une perte pure.
     Rebranchée, elle devient l'exact contraire de la première. */
  { id:'agent', quand: () => S.journee >= 7 && (S.stats.matchs >= 5 || S.liens.coach < 45),
    titre:"Ton agent t'appelle",
    texte:"« Je regarde ta situation. Je peux commencer à bouger, ou on laisse la saison se faire et on voit en juin. Dis-moi. »",
    options:[
      { l:"Qu'il bouge dès maintenant", liens:{ agent:10, club:-6 },
        dit:[{c:'foot',t:"🤝 il se met au travail"},{c:'risk',t:"🏟️ le club l'apprendra"}] },
      { l:"Lui dire que tu te sens bien ici", liens:{ club:8, coach:3, agent:-6 },
        dit:[{c:'foot',t:"🏟️ le club apprécie"},{c:'foot',t:"🎽 le coach aussi"},{c:'risk',t:"🤝 ton agent soupire"}] },
    ] },
  /* « Acquiescer et passer à autre chose » était coach −1 et rien : une punition
     pour n'avoir rien choisi. Supprimée. La famille la plus fréquente du jeu
     (2,47 par saison) devient un vrai duel. */
  { id:'coachPlan', quand: () => S.journee >= 4,
    titre:"Le coach te montre une vidéo",
    texte:"« Regarde. Là, tu es en retard d'une demi-seconde. Je ne te demande pas d'être plus fort, je te demande d'être là avant. »",
    options:[
      { l:"Travailler ça toute la semaine", liens:{ coach:5 }, fit:-6, axes:{ spec:1 },
        dit:[{c:'foot',t:"🎽 il te suit"},{c:'foot',t:"🎯 juste à ton poste"},{c:'risk',t:"🫁 la semaine y passe"}] },
      { l:"Dire que tu n'es pas d'accord", liens:{ coach:-5 }, axes:{ ment:1.5 },
        dit:[{c:'foot',t:"🧠 tu tiens ta lecture du jeu"},{c:'risk',t:"🎽 il n'aime pas"}] },
    ] },
  // coach −2 contre vestiaire +9 et mental +1,5, ce n'était pas un coût : il passe à −5
  { id:'capitaine', quand: () => S.journee >= 8 && vestiaire() >= 55,
    sujet: () => pick(S.equipe.filter(j => j.age >= 28)) || S.equipe[0],
    titre: q => `${q.nom} te demande quelque chose`,
    texte: q => `« On perd trop de matchs bêtement. J'organise une réunion entre nous, sans le staff. Tu viens, et tu parles ? »`,
    options:[
      { l:"Venir et prendre la parole", liens:{ vestiaire:9, coach:-5 }, axes:{ ment:1.5 },
        dit:[{c:'foot',t:"✊ tu comptes ici"},{c:'foot',t:"🧠 tu prends la parole"},{c:'risk',t:"🎽 le staff n'aime pas les réunions sans lui"}] },
      { l:"Ne pas y aller", liens:{ coach:4, vestiaire:-6 },
        dit:[{c:'foot',t:"🎽 le coach le saura"},{c:'risk',t:"✊ ils t'ont attendu"}] },
    ] },
  /* SA CORRECTION : la condition exige maintenant qu'**aucune blessure des quatre
     dernières journées n'explique la série**. Un coach ne reproche pas à un joueur
     d'être revenu d'infirmerie. Et « le problème vient de l'équipe » était la
     triple perte sèche : supprimée. */
  { id:'serie', quand: () => S.stats.notes.length >= 4 && moyenneNotes() < 5.9
      && !S.etats.blessure && !(S.reprise || 0),
    titre:"Le coach ferme la porte du bureau",
    texte:"« Quatre matchs que je ne te reconnais pas. Je te laisse encore un peu, mais tu as compris. »",
    options:[
      { l:"Demander à travailler avec lui", liens:{ coach:6 }, fit:-5, axes:{ spec:.8 },
        dit:[{c:'foot',t:"🎽 il te donne du temps"},{c:'foot',t:"🎯 à ton poste"},{c:'risk',t:"🫁 des séances en plus"}] },
      { l:"Dire que tu vas le régler seul", liens:{ coach:-4 }, axes:{ ment:1.2 },
        dit:[{c:'foot',t:"🧠 tu te reprends en main"},{c:'risk',t:"🎽 il n'aime pas qu'on refuse son aide"}] },
    ] },
  /* C'ÉTAIT TROIS OPTIONS, TROIS PERTES, AUCUN GAIN — la seule famille du jeu dont
     on ne pouvait que sortir perdant, et c'est justement celle où il demandait
     « des trucs positifs avec la famille ». Y aller **rapporte** maintenant. */
  { id:'famille', quand: () => S.journee >= 9 && (S.sansJouer || 0) < 2,
    titre:"Un coup de fil de chez toi",
    texte:"« Ton père a fait un malaise. Rien de grave, il est rentré. Mais il a demandé si tu venais dimanche. »",
    options:[
      { l:"Y aller dimanche, quoi qu'il arrive", liens:{ proches:9 }, axes:{ ment:1 }, fit:-4,
        dit:[{c:'vie',t:"🏡 tu seras là, et ils s'en souviendront"},{c:'foot',t:"🧠 tu as fait ce qu'il fallait"},{c:'risk',t:"🫁 la route"}] },
      { l:"Attendre la trêve", fit:3, liens:{ proches:-7 }, ment:-2,
        coup:"ce dimanche où tu n'es pas allé",
        dit:[{c:'foot',t:"🫁 ta semaine est intacte, pour de vrai"},{c:'risk',t:"🏡 il avait demandé si tu venais"},{c:'risk',t:"🧠 ça te restera"}] },
    ] },
  // les deux premières étaient gratuites, la troisième une perte sèche
  { id:'supporters', quand: () => S.journee >= 6 && S.liens.supporters < 45,
    titre:"Quelqu'un t'attend à la sortie du parking",
    texte:"« Je te suis depuis le début. Là, franchement, tu nous fais quoi ? » Il n'est pas agressif. C'est presque pire.",
    options:[
      { l:"Prendre le temps de lui répondre", liens:{ supporters:8 }, ment:-.8,
        coup:"ce que ce type t'a dit sur le parking",
        dit:[{c:'foot',t:"📣 ça se raconte en tribune"},{c:'risk',t:"🧠 ce qu'il te dit reste"}] },
      { l:"Passer sans s'arrêter", liens:{ proches:2, supporters:-6 },
        dit:[{c:'vie',t:"🏡 tu rentres à l'heure"},{c:'risk',t:"📣 il le racontera aussi"}] },
    ] },
  /* JE N'Y TOUCHE PAS. C'était déjà la seule des dix-sept où chaque option coûte
     et gagne — c'est le modèle appliqué aux seize autres. */
  { id:'corps', quand: () => S.etats.fraicheur < 70,
    titre:"Le kiné veut te voir avant l'entraînement",
    texte:"« Tu tires sur la corde. Je peux te sortir de la séance de jeudi, mais c'est le coach qui décidera ce qu'il en pense. »",
    options:[
      { l:"Accepter de lever le pied", fit:10, liens:{ coach:-3 }, dit:[{c:'foot',t:"🫁 samedi : frais"},{c:'risk',t:"🎽 le coach le note"}] },
      { l:"Serrer les dents", fit:-4, corps:-3, liens:{ coach:3 }, dit:[{c:'foot',t:"🎽 il apprécie"},{c:'risk',t:"🩼 ton corps encaisse"}] },
    ] },

  /* ============ LES DOUZE FAMILLES NOUVELLES (§3 de la page) ============
     Classées par le trou qu'elles bouchent. Les quatre premières n'existaient
     nulle part dans la semaine, et ce sont celles où **l'argent et le contrat
     deviennent des décisions** — ce qui manquait le plus, de son avis comme du
     mien. Les familles qui ne doivent sortir qu'une fois par saison le disent dans
     leur propre `quand` en lisant `S.vuArrets`, qui compte les passages et que
     `demarrerSaison()` remet à zéro chaque été. */

  /* À MON AVIS LA DÉCISION LA PLUS IMPORTANTE QUI MANQUAIT, et elle est dans sa
     partie préférée : elle met l'argent, ta place et ton avenir dans un écran. */
  { id:'contrat',
    quand: () => S.journee >= 20 && S.journee <= 26 && S.liens.club >= 52
      && !S.prolonge && !(S.vuArrets || {}).contrat,
    titre:"Le contrat",
    texte:"Le directeur sportif te tend une feuille. Un an de plus, même salaire. « On est content de toi. Signe et on n'en parle plus. »",
    options:[
      { l:"Signer tout de suite", liens:{ club:10, agent:-7 }, prolonge:true,
        dit:[{c:'foot',t:"🏟️ tu es de la maison"},{c:'foot',t:"💰 un an garanti"},{c:'risk',t:"🤝 il voulait attendre juin"},{c:'risk',t:"⏳ aucune offre cet été"}] },
      { l:"Demander plus", renego:true,
        dit:[{c:'foot',t:"💰 +15 à +30 % s'il cède"},{c:'risk',t:"🏟️ et la proposition disparaît s'il refuse"}] },
      { l:"Attendre juin", liens:{ agent:6, club:-8 }, pasProlonge:true,
        dit:[{c:'foot',t:"🤝 il a les mains libres"},{c:'foot',t:"⏳ de meilleures offres cet été"},{c:'risk',t:"🏟️ le club peut ne pas prolonger du tout"}] },
    ] },
  /* ========== LES PROJETS VIVENT ==========
     « Je pensais qu'il y aurait des arrêts pour les projets, pour l'image »
     (le propriétaire, 02/10/2026). Un chantier était un achat et une ligne au bilan de
     carrière : il ne se passait plus rien après. Ces quatre familles ne se déclenchent
     que si tu **possèdes** la chose, donc elles sont la suite de ce que tu as payé —
     et chacune peut te la faire perdre ou la faire grandir. */
  { id:'projetEcole',
    quand: () => aChantier('ecole') && ((S.vuArrets || {}).projetEcole || 0) < 2,
    titre:"L'école de foot",
    texte:"L'éducateur que tu payes a reçu une offre d'un club. Il part en juin, et les gamins l'appellent par son prénom. Il y a quarante inscriptions à traiter et personne pour le remplacer.",
    options:[
      { l:"Y passer tes lundis", debours:.4, liens:{ supporters:7, proches:5 }, axes:{ spec:-.8 }, fit:-5,
        dit:[{c:'vie',t:"⚽ l'école tient, et grandit"},{c:'foot',t:"📣 le quartier le sait"},{c:'risk',t:"🎯 tes lundis n'y sont plus"},{c:'risk',t:"💰 tu remets de l'argent"}] },
      { l:"Déléguer et payer quelqu'un", debours:.9, liens:{ supporters:2 },
        dit:[{c:'foot',t:"🫁 ta semaine est à toi"},{c:'risk',t:"💰 presque un mois de salaire"},{c:'risk',t:"🏡 ce n'est plus vraiment la tienne"}] },
    ] },
  /* UNE AFFAIRE NE S'AGRANDIT QU'UNE FOIS. `vuArrets` est remis à zéro chaque saison :
     le choix « remettre de l'argent et agrandir » multipliait donc le rendement par 1,6
     **deux fois par saison, vingt saisons de suite** — mesuré, une carrière a terminé à
     **3 937 M€ de gains** contre 51 de médiane. C'est la même cause que l'examen du
     diplôme, et c'est le piège de ce lot : une porte qui compose doit avoir un compteur
     de carrière, jamais de saison. */
  { id:'projetAffaire',
    quand: () => aChantier('commerce') && !((S.vie.chantiers || [])
        .find(x => x.id === 'commerce') || {}).grandi
      && ((S.vuArrets || {}).projetAffaire || 0) < 1,
    titre:"L'affaire",
    texte:"Ton beau-frère appelle un mardi soir : il y a une ardoise, un fournisseur qui menace, et une occasion de reprendre le local d'à côté. Il te demande de trancher ce week-end.",
    options:[
      { l:"Remettre de l'argent et agrandir", debours:1.3, affaire:'grandir', ment:-1.5,
        dit:[{c:'foot',t:"💰 ça rapportera davantage"},{c:'risk',t:"💰 un mois et demi de salaire"},{c:'risk',t:"🧠 tu y penseras samedi"}] },
      { l:"Lui dire d'arrêter les frais", affaire:'serrer', liens:{ proches:-8 },
        dit:[{c:'foot',t:"💰 tu ne remets rien"},{c:'foot',t:"🧠 la tête libre"},{c:'risk',t:"🏡 c'est ta famille, et elle l'entend mal"}] },
    ] },
  /* `vuArrets` est remis à zéro chaque saison : sans compteur de carrière, l'examen
     revenait **1,3 fois par saison jusqu'à la retraite** (mesuré). Un diplôme se finit :
     deux dossiers rendus et on n'en parle plus. */
  { id:'projetDiplome',
    quand: () => !!(S.vie && S.vie.diplome) && (S.vie.diplomeAvance || 0) < 2
      && ((S.vuArrets || {}).projetDiplome || 0) < 1,
    titre:"L'examen",
    texte:"Le dossier est à rendre jeudi, et il y a un déplacement mercredi. Personne au club ne sait que tu passes un examen cette semaine.",
    options:[
      { l:"Rendre le dossier", axes:{ spec:-1.1 }, fit:-6, liens:{ proches:4 }, diplome:'avance',
        dit:[{c:'vie',t:"🎓 tu avances, et tu finiras"},{c:'risk',t:"🫁 la semaine y passe"},{c:'risk',t:"🎯 pas pour ton poste"}] },
      { l:"Demander un report", liens:{ coach:3 }, fit:2, ment:-1.2,
        dit:[{c:'foot',t:"🎽 ta semaine est entière"},{c:'risk',t:"🧠 ça traîne, et tu le sais"}] },
    ] },
  { id:'projetImage',
    quand: () => aAchat('presse') && ((S.vuArrets || {}).projetImage || 0) < 2,
    titre:"Ton attaché de presse",
    texte:"« J'ai une grande marque, sur un an. Beaucoup d'argent. Mais ils veulent un personnage : le gamin du quartier qui a réussi, et ils écriront l'histoire à leur façon. »",
    options:[
      { l:"Signer et jouer le personnage", prime:1.1, presse:1.5, liens:{ supporters:12, proches:-9 }, ment:-1.4,
        dit:[{c:'foot',t:"💰 beaucoup d'argent"},{c:'foot',t:"📣 le stade t'adore"},{c:'risk',t:"🏡 chez toi on ne se reconnaît pas"},{c:'risk',t:"🧠 ce n'est pas toi"}] },
      { l:"Refuser cette histoire-là", liens:{ supporters:-4, proches:6 },
        dit:[{c:'vie',t:"🏡 tu restes celui qu'ils connaissent"},{c:'risk',t:"📣 le stade n'en saura rien"},{c:'risk',t:"💰 l'argent part ailleurs"}] },
    ] },
  /* 4/5 : avec un attaché de presse, les marques viennent **plus souvent** (trois fois
     par saison au lieu de deux, et sans attendre d'être connu) et elles paient la moitié
     de plus. C'est le seul achat qui se rembourse. */
  { id:'sponsor',
    quand: () => S.journee >= 5 && ((S.vuArrets || {}).sponsor || 0) < (aAchat('presse') ? 3 : 2)
      && (aAchat('presse') || S.liens.supporters >= 55 || niveau() >= S.club.force + 4),
    titre:"Le sponsor",
    texte:"Une marque veut ton visage sur une affiche. Une journée de tournage. Mercredi. En pleine semaine.",
    options:[
      { l:"Y aller", prime:1/6, presse:1.5, liens:{ supporters:6, coach:-3 }, fit:-7,
        dit:[{c:'foot',t:"💰 deux mois de salaire"},{c:'foot',t:"📣 ton visage partout"},{c:'risk',t:"🫁 mercredi y passe"},{c:'risk',t:"🎽 il apprendra où tu étais"}] },
      { l:"Refuser", liens:{ coach:3, agent:-5 }, fit:2,
        dit:[{c:'foot',t:"🎽 le coach apprécie"},{c:'foot',t:"🫁 ta semaine est à toi"},{c:'risk',t:"🤝 c'est lui qui avait monté le coup"}] },
    ] },
  /* LE SEUL ÉCRAN DU JEU OÙ L'ARGENT EST UN ARBITRAGE **MORAL** et pas comptable.
     Et il pèse sur la carrière entière, puisque *les tiens* décident de ce que ta
     tête encaisse. Une fois par carrière, quand ton salaire a doublé. */
  { id:'premierGros',
    quand: () => !S.vie.grosFait && S.vie.salaire0 > 0 && S.salaire >= 2 * S.vie.salaire0,
    titre:"Le premier gros salaire",
    texte:"Tu viens de signer pour trois fois ce que tu gagnais. Ton frère a un projet. Ton père n'a jamais demandé, mais la maison a quarante ans.",
    options:[
      { l:"Aider les tiens", liens:{ proches:14 }, prochesPlancher:52, debours:1, grosFait:true,
        dit:[{c:'vie',t:"🏡 les tiens, et ça ne redescendra plus vraiment"},{c:'risk',t:"💰 un an de salaire"}] },
      { l:"Tout mettre de côté", liens:{ proches:-7 }, ment:-1.5, grosFait:true,
        coup:"ce que tu aurais pu faire avec cet argent",
        dit:[{c:'foot',t:"💰 ton compte, et un chantier plus tôt"},{c:'risk',t:"🏡 les tiens l'ont compris"},{c:'risk',t:"🧠 tu sais ce que tu aurais pu faire"}] },
    ] },
  /* Les offres n'arrivaient qu'en été. Celle-ci arrive **au milieu de ta saison**,
     quand elle coûte quelque chose. */
  { id:'offreHiver',
    quand: () => S.journee >= 18 && S.journee <= 22 && S.liens.agent >= 60
      && !(S.vuArrets || {}).offreHiver,
    titre:"L'offre d'hiver",
    texte:"« Un club appelle. Maintenant, pas en juin. Tu joues tout de suite, mais tu pars au milieu de la saison. »",
    options:[
      { l:"Écouter", liens:{ agent:8, club:-8, coach:-5, vestiaire:-4 },
        dit:[{c:'foot',t:"🤝 une bien meilleure offre en juin"},{c:'risk',t:"🏟️ le club le prend mal"},{c:'risk',t:"✊ ils savent"}] },
      { l:"Fermer la porte", liens:{ club:8, coach:4, agent:-8 },
        dit:[{c:'foot',t:"🏟️ le club te le rend"},{c:'foot',t:"🎽 le coach aussi"},{c:'risk',t:"🤝 il ne t'appellera plus pour rien"}] },
    ] },

  /* ---- le football qui manquait à la semaine ---- */
  /* ELLE REMET LE CLASSEMENT DE TON POSTE À ZÉRO AU MILIEU D'UNE SAISON : la seule
     famille qui peut **sauver** une saison morte, ou tuer une saison réussie. La
     confiance du coach est remise à 50 **avant** le choix — c'est à ça que sert le
     hook `avant`. */
  { id:'nouveauCoach',
    quand: () => S.nouveauCoachJ && S.journee >= S.nouveauCoachJ && !S.nouveauCoachFait,
    avant: () => { S.liens.coach = 50; S.nouveauCoachFait = true;
      jrn('coach', `Le coach est parti. Le nouveau veut voir tout le monde.`); },
    titre:"Le nouveau coach",
    texte:"Celui d'avant est parti hier soir. Le nouveau a demandé à voir les joueurs un par un. Tu passes en premier. Sa confiance est à refaire, dans les deux sens.",
    options:[
      { l:"Lui dire ce que tu sais faire", liens:{ coach:8, vestiaire:-4 },
        dit:[{c:'foot',t:"🎽 tu existes pour lui dès le premier jour"},{c:'risk',t:"✊ les anciens trouvent que tu t'es placé"}] },
      { l:"Attendre qu'il te regarde", liens:{ vestiaire:5, coach:-4 },
        dit:[{c:'foot',t:"✊ le vestiaire apprécie"},{c:'risk',t:"🎽 il a déjà son onze en tête"}] },
    ] },
  { id:'brassard',
    quand: () => S.journee >= 6 && vestiaire() >= 55 && !S.brassard
      && S.equipe.some(j => j.age >= 28 && (j.blesse > 0 || j.susp > 0)),
    titre:"Le brassard",
    texte:"« Le capitaine est out trois semaines. Samedi, c'est toi qui sors avec le brassard. Si tu le veux. »",
    options:[
      { l:"Accepter", liens:{ vestiaire:8, coach:5 }, axes:{ ment:1 }, brassard:3,
        dit:[{c:'foot',t:"✊ le vestiaire te suit"},{c:'foot',t:"🎽 le coach cherchait un patron"},{c:'risk',t:"🧠 chaque mauvais soir pèsera double"}] },
      { l:"Proposer quelqu'un d'autre", liens:{ vestiaire:4, coach:-5 },
        dit:[{c:'foot',t:"✊ le geste est vu"},{c:'risk',t:"🎽 il cherchait un patron"}] },
    ] },
  { id:'retour', quand: () => (S.reprise || 0) > 0 && !S.etats.blessure,
    titre:"Le retour de blessure",
    texte:"« Le kiné dit deux semaines. Moi, j'ai besoin de toi samedi. Je ne te forcerai pas. »",
    options:[
      { l:"Jouer quand même", liens:{ coach:6 }, corps:-5, promesse:'rechute',
        dit:[{c:'foot',t:"🎽 tu gardes ta place"},{c:'risk',t:"🩼 quatre fois sur dix, ça relâche"},{c:'risk',t:"🩼 et plus longtemps que la première fois"}] },
      { l:"Attendre deux semaines", corps:6, liens:{ coach:-5 }, forfait:2,
        dit:[{c:'foot',t:"🩼 aucun risque"},{c:'risk',t:"🎽 ton concurrent prend ta place"},{c:'risk',t:"🎽 et il la garde"}] },
    ] },
  /* ELLE FAIT EXACTEMENT CE QUE LA JAUGE *CORPS* ATTENDAIT : échanger la fin de ta
     carrière contre samedi. */
  { id:'piqure', quand: () => S.etats.corps < 78 && !S.piqure && S.journee >= 5,
    titre:"La piqûre",
    texte:"« Une injection et tu ne sens plus rien pendant quatre-vingt-dix minutes. Ce n'est pas interdit. Ce n'est pas rien non plus. »",
    options:[
      { l:"Accepter", fit:8, liens:{ coach:3 }, corps:-6, piqure:true,
        dit:[{c:'foot',t:"🫁 tu ne sentiras plus rien"},{c:'foot',t:"🎽 le coach est soulagé"},{c:'risk',t:"🩼 ton corps ne remontera plus cette saison"}] },
      { l:"Refuser", corps:2, liens:{ coach:-4 },
        dit:[{c:'foot',t:"🩼 tu ménages ton corps"},{c:'risk',t:"🎽 il avait besoin de toi"},{c:'risk',t:"🫁 tu joues comme tu es"}] },
    ] },
  /* CHANGER DE POSTE EN COURS DE CARRIÈRE n'existait pas, et ça devrait : c'est une
     vraie histoire de footballeur, et le coût (ton poste −8, socle compris) est
     assez lourd pour que ce soit une décision et pas une porte de sortie facile. */
  { id:'double',
    quand: () => S.moi.poste !== 'G' && (S.sansJouer || 0) >= 8 && !!devantToi(),
    titre:"Il t'a doublé",
    texte:"Ce n'est plus une mauvaise passe. Il joue, tu ne joues pas, et le coach n'hésite même plus. L'adjoint te glisse qu'il te voit ailleurs sur le terrain.",
    options:[
      { l:"Demander à changer de poste", poste:true, ment:-1.5,
        coup:"ce poste que tu n'as jamais appris",
        dit:[{c:'foot',t:"🎽 tu repasses devant, ailleurs"},{c:'risk',t:"🎯 tout ce que tu savais ne sert qu'à moitié"},{c:'risk',t:"🧠 recommencer, à ton âge"}] },
      { l:"Rester et attendre ton heure", axes:{ spec:1 }, liens:{ coach:2 }, ment:-1.5,
        coup:"toutes ces semaines à attendre",
        dit:[{c:'foot',t:"🎯 tu continues à travailler"},{c:'foot',t:"🎽 il apprécie"},{c:'risk',t:"🧠 et rien ne change samedi"}] },
    ] },

  /* ---- le hors-football, une fois les portes ouvertes ---- */
  { id:'pereStade',
    quand: () => S.journee >= 4 && proches() >= 55 && !(S.vuArrets || {}).pereStade,
    titre:"Ton père au stade",
    texte:"Il n'est jamais venu. Il a soixante ans. Il a demandé s'il y avait de la place samedi.",
    options:[
      { l:"Le faire venir", liens:{ proches:8 }, axes:{ ment:1 }, promesse:'pere',
        dit:[{c:'vie',t:"🏡 il sera là"},{c:'foot',t:"🧠 tu joues pour lui"},{c:'risk',t:"⏳ et s'il te voit rater ton match…"}] },
      { l:"Une autre fois", liens:{ proches:-4 }, axes:{ ment:.5 },
        dit:[{c:'foot',t:"🧠 tu joues sans ce regard"},{c:'risk',t:"🏡 il a soixante ans"}] },
    ] },
  { id:'rumeur',
    quand: () => S.journee >= 6 && (S.liens.agent >= 60
      || (S.stats.notes.length >= 3 && moyenneNotes() >= 6.8)),
    titre:"La rumeur",
    texte:"Un journal écrit que tu as déjà signé ailleurs. C'est faux. Le vestiaire l'a lu avant toi.",
    options:[
      { l:"Démentir publiquement", liens:{ club:8, vestiaire:5, agent:-7 },
        dit:[{c:'foot',t:"🏟️ le club respire"},{c:'foot',t:"✊ le vestiaire aussi"},{c:'risk',t:"🤝 le bruit lui servait"}] },
      { l:"Laisser dire", liens:{ agent:8, club:-6, vestiaire:-4 },
        dit:[{c:'foot',t:"🤝 les clubs appellent"},{c:'risk',t:"🏟️ le club n'aime pas"},{c:'risk',t:"✊ le vestiaire non plus"}] },
    ] },
  /* LE TROU QU'IL A NOMMÉ LUI-MÊME, et la seule chose du jeu qui fait de la
     **fatigue une conséquence de la réussite** : plus tu es bon, plus on te prend
     tes semaines. Ici c'est la décision, pas le sous-système — les deux matchs ne
     se jouent pas, ils se lisent, et leur prix est dans les jambes de samedi. */
  { id:'selection',
    quand: () => S.journee >= 8 && S.liens.selection >= 55
      && !(S.selec || {}).dedans && !(S.vuArrets || {}).selection,
    titre:"La sélection",
    texte:"Une lettre, pas un coup de fil. Deux matchs, en pleine semaine, à trois mille kilomètres.",
    options:[
      { l:"Y aller", liens:{ supporters:8, agent:10 }, fit:-12, corps:-3, selec:true,
        dit:[{c:'foot',t:"📣 le pays te regarde"},{c:'foot',t:"🤝 ta cote monte pour juin"},{c:'risk',t:"🫁 tu joueras samedi sur les jambes"}] },
      { l:"Te faire porter pâle", liens:{ club:6, coach:4, selection:-15, supporters:-5 },
        dit:[{c:'foot',t:"🏟️ le club approuve"},{c:'foot',t:"🎽 il n'a jamais aimé les trêves"},{c:'risk',t:"🇫🇷 ils ne rappellent pas deux fois"}] },
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
  /* Une famille peut avoir à changer l'état **avant** que tu choisisses : le
     nouveau coach remet sa confiance à 50 en arrivant, pas après ta réponse. */
  if (a.avant) a.avant();
  const l = a.ligne ? (typeof a.ligne === 'function' ? a.ligne() : a.ligne) : null;
  const q = a.sujet ? a.sujet(l) : null;
  S.arret = { id:a.id, options:a.options, sujet: q ? q.nom : null, ligne: l,
    titre: typeof a.titre === 'function' ? a.titre(q, l) : a.titre,
    texte: typeof a.texte === 'function' ? a.texte(q, l) : a.texte };
  S.arrets++; S.ecran = 'arret'; sauver(); rendre();
}
function choisirArret(i){
  const a = S.arret, o = a.options[i]; if (!o) return;
  const suite = appliquer(o);
  jrn('arret', `${a.titre} → ${o.l}`);
  /* Le propriétaire, 27/09/2026 : « dans ma semaine, il n'y a que l'impact de
     mon choix d'entraînement. » La décision de la semaine y manquait : on la
     garde pour l'afficher à côté du compte rendu de séance. */
  S.semaineArret = { titre: a.titre, choix: o.l, suite: suite || null };
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
    /* LES ARRÊTS OUVRENT LES TIENS (29/09/2026). Jusqu'ici `S.vie.proches` ne
       bougeait qu'à l'intersaison : la jauge qui amortit chaque coup dur était la
       seule sur laquelle aucune décision de la saison n'avait prise. */
    else if (k === 'proches') bougerProches(amorti(v));
    else S.liens[k] = clamp(S.liens[k] + amorti(v));
  });
  Object.entries(o.axes || {}).forEach(([k, v]) => {
    if (k === 'ment' && v < 0) coutMental(-v, o.coup || "cette histoire t'est restée");
    else bougerAxe(k, v);
  });
  if (o.fit) S.etats.fraicheur = clampFr(S.etats.fraicheur + o.fit);
  if (o.corps) S.etats.corps = clamp(S.etats.corps + o.corps, 0, 100);
  /* ---- ce que les douze familles nouvelles ont demandé en plus (30/09/2026) ----
     Chaque clé est une porte, comme `liens` ou `axes` : l'option est une donnée,
     jamais du code. Elles rendent une phrase quand il y a quelque chose à dire, et
     c'est cette phrase que « Ta semaine » affiche sous ton choix. */
  let suite = '';
  // l'argent, en mois de salaire : une prime qui rentre, une somme qui sort
  if (o.prime){
    /* `o.presse` : l'attaché de presse négocie cette prime-là. Une option qui ne le
       porte pas n'est pas concernée — il vend de l'image, pas des primes de match. */
    const mult = o.presse && aAchat('presse') ? o.presse : 1;
    const q = S.salaire * o.prime * mult;
    S.argent += q;
    suite = `La prime est tombée : ${sous(q)}.`
      + (mult > 1 ? ` Ton attaché de presse avait négocié la moitié de plus.` : ''); }
  if (o.debours){ S.argent -= S.salaire * o.debours;
    suite = `Tu as sorti ${sous(S.salaire * o.debours)}. Tu ne le regrettes pas.`; }
  if (o.brassard){ S.brassard = o.brassard;
    suite = `Tu le porteras ${o.brassard} journées. Chaque mauvais soir pèsera double.`; }
  /* L'AFFAIRE GRANDIT OU SE SERRE, et c'est le chantier lui-même qui change : son
     rendement annuel est déjà lu par le bilan, donc il n'y a rien à inventer. */
  if (o.affaire){
    const a = (S.vie.chantiers || []).find(x => x.id === 'commerce');
    if (a){
      if (o.affaire === 'grandir'){
        a.grandi = true;
        a.rend = Math.round((a.rend || 0) * 1.6 * 1000) / 1000;
        suite = `Le local d'à côté est à toi. Si ça tient, ça rapportera davantage.`; }
      else { a.rend = Math.round((a.rend || 0) * .8 * 1000) / 1000; a.serre = true;
        suite = `Tu as dit non. Il a raccroché le premier.`; }
    }
  }
  if (o.diplome){ S.vie.diplomeAvance = (S.vie.diplomeAvance || 0) + 1;
    suite = (S.vie.diplomeAvance >= 2)
      ? `Dossier rendu jeudi à 23 h 50. Tu l'as, ton diplôme.`
      : `Dossier rendu jeudi à 23 h 50. Il en reste un.`; }
  if (o.piqure){ S.piqure = true;
    suite = `Tu ne sentiras plus rien samedi. Ton corps ne remontera plus cette saison.`; }
  if (o.promesse) S.promesses = [...(S.promesses || []), { k:o.promesse }];
  /* Un forfait décidé **après** que le coach a annoncé son groupe : il faut le
     reposer, sinon le match jouerait le onze d'avant et démentirait l'écran. */
  if (o.forfait){ S.etats.blessure = o.forfait; poserEquipeDuJour();
    suite = `Tu ne joueras pas les ${o.forfait} prochaines journées. Ton concurrent a le champ libre.`; }
  // prolonger : un an de plus, et plus aucune offre cet été
  if (o.prolonge){ S.contrat = (S.contrat || 0) + 1; S.prolonge = true;
    jrn('argent', `Prolongation d'un an, ${sous(S.salaire)} par an.`);
    suite = `Un an de plus, au même salaire. Cet été, personne ne t'appellera.`; }
  /* Renégocier est un pari, et c'est le seul de la semaine : ce que le club lâche
     dépend de ce qu'il pense de toi et de la saison que tu fais. */
  if (o.renego){
    const chance = clamp(.34 + (S.liens.club - 50) * .006 + (moyenneNotes() - 6.2) * .12, .08, .8);
    if (Math.random() < chance){ const f = rnd(1.15, 1.30); poserSalaire(S.salaire * f);
      jrn('argent', `Il a cédé : ${sous(S.salaire)} par an.`);
      suite = `Il a pris un stylo et il a barré le chiffre. ${sous(S.salaire)} par an.`; }
    else { S.liens.club = clamp(S.liens.club - 6);
      suite = `Il a rangé la feuille dans son tiroir. On n'en reparlera pas cette saison.`; }
  }
  if (o.coach50){ S.liens.coach = 50; }
  if (o.pasProlonge) S.prolonge = false;
  // changer de poste : la seule décision du jeu qui touche à ce que tu es
  if (o.poste){ const n = changerPoste();
    suite = n ? `Tu t'entraînes à ${POSTE_A[n]} depuis lundi. Ça ne ressemble à rien pour l'instant.` : ''; }
  // ton rival prend confiance : c'est ce qui se passe quand on va lui demander
  if (o.rivalForme && S.concurrents[0]) S.concurrents[0].forme = clamp(S.concurrents[0].forme + o.rivalForme, -5, 5);
  /* Les tiens ne redescendent jamais complètement après ça : c'est le seul effet
     du jeu qui pose un plancher sur une jauge, et il est mérité. */
  if (o.prochesPlancher) S.vie.prochesPlancher = Math.max(S.vie.prochesPlancher || 0, o.prochesPlancher);
  if (o.grosFait) S.vie.grosFait = true;
  /* Dire oui au sélectionneur te met dans le groupe : les fenêtres suivantes se
     jouent sans qu'on te redemande, jusqu'à ce qu'il ne te rappelle plus. */
  if (o.selec){ S.selec.dedans = true;
    suite = `Tu es dans le groupe. Les prochaines trêves, tu pars sans qu'on te le demande.`; }
  return suite;
}
const POSTE_A = { G:'dans les buts', D:'en défense', M:'au milieu', A:'devant' };
/* CHANGER DE POSTE EN COURS DE CARRIÈRE. Ça n'existait pas, et c'est une vraie
   histoire de footballeur : on te voit ailleurs, tu rejoues, mais tout ce que tu
   avais appris ne sert qu'à moitié. Le socle descend avec la base — c'est la seule
   chose du jeu qui le fasse, et c'est juste : « j'ai toujours été bon à ce poste »
   ne veut plus rien dire quand on change de poste. */
const VOISIN_POSTE = { D:['M'], M:['D', 'A'], A:['M'] };
function changerPoste(){
  const n = pick(VOISIN_POSTE[S.moi.poste] || []); if (!n) return null;
  S.moi.poste = n;
  S.moi.socle.spec = Math.max(30, S.moi.socle.spec - 8);
  bougerAxe('spec', -8);
  // tout l'effectif se re-partage : tes anciens rivaux redeviennent des coéquipiers
  const tous = [...S.concurrents, ...S.equipe];
  const auPoste = tous.filter(j => j.poste === n).sort((a, b) => b.niv - a.niv);
  S.concurrents = auPoste.slice(0, n === 'G' ? 1 : 2);
  S.equipe = tous.filter(j => S.concurrents.indexOf(j) < 0);
  jrn('poste', `Tu changes de poste : ${POSTE_A[n]}.`);
  return n;
}

/* ---------- le match ---------- */
/* Ta valeur aux yeux du coach quand il fait son onze. `spec` compte une deuxième
   fois : être juste à son poste, c'est exactement ce qu'il regarde. */
function valeurAuPoste(){
  return niveauCoach() + (S.moi.base.spec + S.moi.boost.spec - 50) * .09
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
/* UN BUT VAUT UN BUT, POUR TOI COMME POUR LES AUTRES (le propriétaire, 01/10/2026).
   Il y avait deux tables pour le même événement : **ton** but payait 0,70 et celui
   d'un coéquipier 1,50**. L'écart était justifié par « ta note a des faits de match
   pour la porter » — sauf qu'un fait qui marque porte `n:0`, précisément pour ne pas
   payer deux fois : le but était donc payé **une seule fois, à 0,70**. Deux
   conséquences mesurées, et la même cause : un but te rapportait +0,79 de note là
   où il rapportait le double à Garnier, et sur une même décision de fait de match,
   réussir valait +0,70 quand rater coûtait **−1,71** (0,95 × `ECHELLE_FAIT`) — un
   rapport de 2,4 sur le même geste. Une seule table pour tout le monde ferme les
   deux d'un coup, et garde le rendement décroissant qui rend le 10 rare. */
/* CE QU'UN BUT VAUT DANS UNE NOTE. Mesuré sur 14 387 notes : à 1,2,
   un but rapportait +1,5 quand le tirage de la note en valait 2,6 d'amplitude — donc
   un buteur pouvait finir sous un défenseur qui n'avait rien fait, et c'est ce que le
   propriétaire a vu (« certaines notes un peu trop justes »). Le fait pèse plus, la
   chance pèse moins. */
/* QUATRE BUTS DOIVENT FAIRE UN SOIR DE GALA (le propriétaire, 02/10/2026, rapport à
   l'appui : « c'est assez rare de mettre 4 buts et d'avoir 8 » — 7,9, derrière deux
   défenseurs qui n'avaient pas marqué et un remplaçant entré dix minutes). Mesuré
   avant d'y toucher, 26 624 de tes notes contre 491 229 notes de coéquipiers : ta
   soirée à quatre buts payait **8,74** quand le doublé d'un coéquipier payait
   **9,21** — un coéquipier qui en met deux passait devant toi qui en mets quatre.
   La cause n'est pas la forme de la table (le rendement décroissant est sa propre
   règle du 27/09, et elle reste) mais son **échelle** : le premier but valait .7 là
   où le premier fait de match vaut 1, donc la somme plafonnait à +1,8 quelle que
   soit la soirée. C'est désormais la même table que les faits — un but est un fait
   de match, le rendement décroît comme il l'a dit, et rien de plus. Mesuré après :
   un but 7,52 · un doublé 8,41 · un triplé 8,94 · quatre buts **9,37**, et tu es le
   meilleur des tiens 53 % des soirs où tu marques au moins deux fois (contre 37 %).
   Ce qui reste écarté, et c'est la mesure du 01/10 qui le dit : prendre la table des
   coéquipiers (1,5 / 1 / 0,7 / 0,45) mettrait **10 % de tes notes à 9,5 et plus** et
   39 % au-dessus de 7,5 — le 10 cesserait d'être rare. */
const POIDS_BUT = [1, .75, .5, .35];
/* DEUX TABLES, ET C'EST JUSTE : MESURÉ, PUIS REMIS EN PLACE (01/10/2026). Ton but
   paie 0,70 et celui d'un coéquipier 1,50, ce qui se lit comme une incohérence sur
   la liste des notes. Essayé : une table commune. Mesuré, 28 carrières entières —
   un doublé te mettait à **9,09** et un triplé à **9,60**, les notes à 9,5 et plus
   passaient de **3,2 % à 8,6 %** et les matchs au-dessus de 7,5 de **32,6 % à
   42,5 %**. C'est-à-dire le défaut que le propriétaire avait fait corriger le 27/09
   (« le 10 doit rester rare ») et celui du 29/09 (« les grands soirs étaient devenus
   ordinaires »). La raison est structurelle : **les deux notes ne portent pas la même
   chose** — la tienne additionne tes faits de match, ta forme, ta tête, tes cartons
   et la difficulté du duel, celle d'un coéquipier ne porte que ce que le film raconte
   de lui. Un but y pèse donc plus parce qu'il y est presque seul.
   Et l'écart réussir / rater d'un fait de match n'est pas celui que la formule
   suggère : mesuré par la note réelle, un fait **réussi paie +0,95** et un fait
   **raté coûte −1,40** — un rapport de 1,5 et non de 2,4, parce qu'un fait réussi
   gagne aussi le match et que le résultat se paie à part. Rien à corriger. */
/* ET FINALEMENT : UN BUT VAUT UN BUT, POUR TOI COMME POUR EUX (02/10/2026). La
   deuxième table existait pour une seule raison — la tienne était trop petite, donc
   il fallait payer leurs buts plus cher pour qu'un but se voie dans la liste. Cette
   raison a disparu avec l'échelle ci-dessus. La garder serait un privilège sans
   explication, et c'est lui qui se voyait à l'écran : mesuré, un **triplé de toi à
   8,2 derrière trois coéquipiers à un but** (8,8 · 8,6 · 8,3) dans un 6-0. Mesuré sur
   18 000 de tes matchs, le nombre de coéquipiers qui te dépassent en ayant marqué
   **moins** de buts que toi : 0,98 avec leur table, **0,80** avec la tienne, et
   personne au-dessus de toi 68 % → **77 %** des soirs où tu marques deux fois ou
   plus. Leurs notes ne bougent que de 6,41 à 6,35 en moyenne : c'est le haut de la
   liste qui se range, pas le niveau général.
   Ce qui n'est **pas** aligné, et volontairement : leur part de chance reste à ±0,95
   contre ±0,85 chez toi. C'est la décision du 29/09 — ta note a tes faits de match,
   ta forme, ta tête et tes cartons pour faire l'écart, la leur n'a que le film, donc
   sans un tirage un peu plus large elle n'aurait aucun relief. */
const POIDS_BUT_AUTRE = POIDS_BUT.slice();
/* Et une passe décisive, de même : la même valeur pour tout le monde. */
const PASSE_NOTE = .4, PASSE_NOTE_AUTRE = PASSE_NOTE;
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
  /* EN MODE ENTRAÎNEUR·EUSE, PERSONNE NE S'APPELLE « MOI », et c'est la seule
     chose que le choix du onze a besoin de savoir. Tout le reste de ce fichier —
     le groupe de dix-huit, les changements, les notes, la réserve — marche
     ensuite sans modification : il n'y a simplement pas de ligne `moi` dans la
     liste. C'est ce qui permet au mode entraîneur·euse de réutiliser le monde
     entier au lieu de s'en fabriquer un deuxième. */
  const coach = S.mode === 'coach';
  const moi = coach ? null : { moi:true, nom:S.moi.nom, poste:S.moi.poste, niv:valeurAuPoste(),
    dispo: S.etats.blessure <= 0 && S.etats.suspension <= 0, ref:{} };
  const tout = coach ? [...g] : [...g, moi];
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
  const statut = coach ? 'coach'
    : S.etats.blessure > 0 ? 'blesse' : S.etats.suspension > 0 ? 'suspendu'
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
  /* Et elle pèse **plus lourd** depuis qu'elle ne pèse plus rien dans le choix du
     onze : c'est devenu son seul canal, donc il doit se sentir. Dans le rouge tu es
     le premier que le coach sort. */
  const jambes = mene ? .09 : .13;
  /* ET SURTOUT : UN JOUEUR CUIT SORT **PLUS TÔT**. La fraîcheur décidait seulement de
     *qui* sortait, jamais de *quand* — or il n'y a que trois à cinq changements, donc
     l'effet saturait : être le premier candidat plaçait dans le premier créneau
     (≈ 57ᵉ), rien de plus. Mesuré ainsi : 70,4 minutes en étant frais contre 64,9
     **à −35 de fraîcheur**, et 15 % des matchs encore finis à 90 minutes en pleine
     dette. Ce n'était pas « moins on est frais, moins on peut jouer longtemps », c'était
     un dixième de ça. La minute du changement avance donc avec la dette du sortant,
     jusqu'à vingt-deux minutes plus tôt. Pour toi la fraîcheur est connue ; pour les
     autres, le tirage de `laisse` en tient lieu, comme avant. */
  const tot = x => x.moi ? Math.min(22, Math.max(0, (70 - S.etats.fraicheur) * .21)) : 0;
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
    // un sortant qui n'a plus rien dans les jambes ne va pas au bout du créneau
    min = Math.max(35, Math.round(min - tot(s)));
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
  /* `dom` est déterministe sur la journée : `matchAnnexe()` est appelé deux fois
     de suite dans `choisirSemaine()`, un tirage rendrait deux matchs différents. */
  let i = J_COUPE.indexOf(j);
  if (i >= 0 && S.coupe && S.coupe.vivant)
    return { c:'coupe', t:i, dom: j % 2 === 0, finale: i === TOURS_COUPE.length - 1 };
  i = J_EURO.indexOf(j);
  if (i >= 0 && S.euro && S.euro.engage && S.euro.vivant)
    return { c:'euro', t:i, dom: j % 2 === 1, finale: i === J_EURO.length - 1 };
  return null;
}
/* Qui on affronte. En coupe, les premiers tours sont contre un petit club de
   division inférieure — c'est là que les surprises arrivent ; à partir des quarts
   c'est un club du championnat. En Europe, un club européen de l'époque. */
function advAnnexe(info){
  if (info.c === 'coupe'){
    if (info.t <= 1){
      const dedans = toutesLesEquipes().map(e => e.nom);
      /* Le petit club des premiers tours est un club **du pays où tu joues** : en
         Italie, « LB Châteauroux » se lisait comme un défaut au premier coup d'œil. */
      const dk0 = typeof decadeKey === 'function' ? decadeKey(S.annee) : '10';
      const petits = poolPays(S.pays, dk0).petits.map(x => x.nom).filter(n => !dedans.includes(n));
      const nom = petits.length ? pick(petits) : "un club de l'échelon inférieur";
      return { nom, force: Math.round(clamp(S.club.force - rnd(5, 16), 38, 76)), petit:true };
    }
    const autres = S.ligue.equipes.filter(e => e.nom !== S.club.nom);
    const e = pick(autres.slice(0, Math.max(4, Math.round(autres.length * (info.t >= 3 ? .35 : .6)))));
    return { nom:e.nom, force:e.force };
  }
  const dk = typeof decadeKey === 'function' ? decadeKey(S.annee) : '10';
  /* On ne tire pas un club de son propre championnat en Europe : il est déjà au
     classement, et on le joue deux fois en championnat. */
  const moiNat = monPays().nat;
  const eu = (typeof EU_CLUBS !== 'undefined' ? EU_CLUBS : [])
    .filter(c => (c.s[dk] || 0) >= 2 && c.nat !== moiNat);
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
    minutes: 0, note: null, buts: 0, passes: 0,
    ecartForce: (S.club.force + eq.ecart) - adv.force };
  // un match à élimination directe se décide, même mal
  const groupe = info.c === 'euro' && info.t <= 5;
  if (!groupe && bn === be){
    /* ET PARFOIS ÇA VA AUX TIRS AU BUT. Un nul était **toujours** tranché en
       prolongation, donc la séance de tirs au but n'existait pas — et les deux faits
       de match qui en parlent (le tireur, le gardien) pouvaient tomber sur un 3-0,
       ce qui se lit tout de suite comme un défaut. Une fois sur deux, le match va
       au bout : le score reste nul, et c'est la séance qui départage. */
    if (Math.random() < .5){
      m.tab = true;
      m.tabNous = Math.random() < .5 + diff * .006;
    } else {
      m.prolong = true;
      if (Math.random() < .5 + diff * .012) bn += 1; else be += 1;
      m.bn = bn; m.be = be;
    }
  }
  m.res = m.tab ? (m.tabNous ? 'V' : 'D') : bn > be ? 'V' : bn < be ? 'D' : 'N';
  // ton match : le même calcul de temps de jeu, en plus simple
  if (eq.statut === 'titulaire') m.minutes = Math.random() < .25 ? ri(55, 80) : 90;
  else if (eq.statut === 'banc' && Math.random() < (info.c === 'coupe' ? .6 : .45)) m.minutes = ri(12, 45);
  m.evs = []; m.moments = []; m.noteFaits = [];
  /* UN SEUL FAIT LE MERCREDI (le propriétaire, 29/09/2026 : « ajouter des faits
     pour les matchs de coupe et Europe »). Il se joue avant que la note tombe, pour
     qu'il compte dedans — et il ne rallonge la semaine que les semaines où il y a
     vraiment un match en plus. */
  const fa = m.minutes ? momentSemaine(info, m) : null;
  if (fa){
    m.moments = [fa]; S.match = m; S.momentIdx = 0;
    S.faitAnnexe = { info, m };
    S.ecran = 'moment'; sauver(); rendre();
    return m;
  }
  return finirAnnexe(info, m);
}
function finirAnnexe(info, m){
  const { bn, be } = m;
  if (m.minutes){
    const derriere = S.moi.poste === 'G' || S.moi.poste === 'D';
    const chance = { G:0, D:.055, M:.155, A:.28 }[S.moi.poste]
      * clamp(1 + (S.moi.base.spec - 50) * .006, .7, 1.3) * (m.minutes / 90);
    for (let k = 0; k < bn; k++){
      if (Math.random() < chance) m.buts++;
      else if (Math.random() < { G:0, D:.10, M:.24, A:.18 }[S.moi.poste] * (m.minutes / 90)) m.passes++;
    }
    const duel = duelResultat(m.ecartForce);
    m.note = Math.round(plafonnerNote(6.1 + poidsResultat(m.res, m.bn, m.be, derriere, m.ecartForce)
      + cumul(m.buts, POIDS_BUT) + m.passes * PASSE_NOTE
      + (derriere ? (be === 0 ? .8 * duel : be >= 4 ? -.7 : 0) : 0)
      + (niveauJour() - S.club.force) * .05 + poidsEtat() + poidsFaits(m) + poidsCartons(m) + aleaNote()) * 10) / 10;
    S.stats.matchs++; S.stats.buts += m.buts; S.stats.passes += m.passes;
    S.stats.minutes += m.minutes; S.stats.notes.push(m.note);
    if (m.statut === 'titulaire') S.stats.titus++;
    bougerLigne(LIGNE_CLE[S.moi.poste], (m.note - 6.1) * .9);
    if (m.note < 5.6) coutMental(1.2, `ce mercredi à ${m.adv}`);
  }
  // mercredi coûte samedi : c'est tout l'intérêt
  S.etats.fraicheur = clampFr(S.etats.fraicheur - (m.minutes ? 7 + m.minutes * .14 : 4));
  suiteAnnexe(info, m);
  return m;
}
/* Ce que le résultat fait à la compétition : on avance, on sort, on compte. */
function suiteAnnexe(info, m){
  const nom = info.c === 'coupe' ? 'Coupe' : 'Europe';
  if (info.c === 'coupe'){
    S.coupe.hist.push({ t:info.t, adv:m.adv, bn:m.bn, be:m.be, prolong:!!m.prolong, tab:!!m.tab, tabNous:!!m.tabNous });
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
  S.euro.hist.push({ t:info.t, adv:m.adv, bn:m.bn, be:m.be, prolong:!!m.prolong, tab:!!m.tab, tabNous:!!m.tabNous });
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
/* ================== LA SÉLECTION ==================
   LE SOUS-SYSTÈME (le propriétaire, 29/09/2026, en le remettant au lot d'après :
   « la convocation, les deux matchs en pleine semaine, les jambes que ça coûte »).
   La jauge vivait depuis le 29/09 et la décision d'y aller depuis le 30 ; il
   manquait ce qui se passe quand on dit oui.
   **Elle obéit aux mêmes verrous que la coupe** : on ne l'opère pas, on la lit, et
   elle ne rallonge pas la semaine — elle la coûte. Mais elle coûte plus cher que
   tout le reste, et c'est le sujet : **deux matchs en une semaine, à trois mille
   kilomètres**, et samedi tombe quand même. C'est la seule chose du jeu qui fait de
   la fatigue une conséquence de la réussite : plus tu es bon, plus on te prend tes
   semaines.
   La convocation ne se re-décide pas chaque fois — ce serait un clic de plus toutes
   les cinq journées. Le premier appel est l'arrêt `selection` ; ensuite tu es dans
   le groupe, et tu y restes tant que le sélectionneur te garde. */
const J_SELEC = [5, 12, 18, 23, 30];   // cinq fenêtres, toutes hors coupe et Europe
/* Les adversaires sont des nations, pas des clubs : une sélection ne joue pas
   contre Lens. L'échelle est celle du jeu, pour que `nous − force` reste lisible
   par le même moteur — mais **resserrée**, et c'est une correction trouvée à
   l'écran avant de livrer. Première version étalée comme un championnat
   (50 à 78) : l'espérance de buts est une exponentielle de l'écart divisé par 19,
   calibrée sur des écarts de club (0 à 15 points), donc un écart de trente points
   donnait des scores de handball — vu tel quel, « l'Irlande 7–1 » et « le Mexique
   6–1 ». Entre nations l'écart réel est petit : le dernier du tableau tient le
   match contre le premier. Seize points du haut en bas, et la France (le meilleur
   club du pays + 4, soit 82 en 2018) est dans le peloton de tête. */
/* La France : un grand, pas le plus grand. C'est aussi l'étalon de la note d'un
   match de sélection — à 80, un joueur à 70 joue dix points au-dessus de lui-même,
   et c'est pour ça qu'une première sélection est dure. */
const FRANCE_FORCE = 80;
const NATIONS = [
  ['le Brésil', 84], ['l\'Argentine', 83], ['l\'Allemagne', 83], ['l\'Italie', 82],
  ['l\'Espagne', 82], ['l\'Angleterre', 82], ['les Pays-Bas', 81], ['le Portugal', 81],
  ['la Belgique', 79], ['la Croatie', 78], ['l\'Uruguay', 78], ['le Danemark', 77],
  ['la Suisse', 77], ['la Suède', 76], ['le Mexique', 75], ['la Pologne', 75],
  ['le Japon', 75], ['le Sénégal', 75], ['le Maroc', 75], ['la Serbie', 74],
  ['l\'Autriche', 74], ['la Norvège', 73], ['la Grèce', 73], ['l\'Écosse', 71],
  ['la Hongrie', 70], ['l\'Irlande', 70], ['la Finlande', 69], ['l\'Islande', 68],
];
/* Ta place en sélection n'est pas celle de ton club : le sélectionneur a ses
   propres hommes, et c'est la jauge qui dit où tu en es dans sa tête. Au-dessus de
   75 tu es titulaire, en dessous de 50 tu regardes. */
function statutSelec(){
  const v = S.liens.selection || 0;
  if (v >= 75) return 'titulaire';
  if (v >= 58) return Math.random() < .62 ? 'titulaire' : 'banc';
  return Math.random() < .3 ? 'titulaire' : 'banc';
}
/* Les deux matchs de la fenêtre. Ils se jouent d'un bloc, on les lit après, et
   leur prix est dans les jambes de samedi. */
function jouerSelection(){
  /* ON NE VOYAGE PAS DEPUIS L'INFIRMERIE. Sans cette porte, la fenêtre jouerait
     deux matchs à un joueur que l'écran de la semaine annonce blessé ou suspendu —
     exactement le genre de contradiction qu'il a déjà relevée deux fois. Ça ne
     coûte rien aux jambes (elles sont déjà à l'arrêt) mais la place se perd un peu :
     le sélectionneur en essaie un autre, et cet autre peut rester. */
  if (S.etats.blessure > 0 || S.etats.suspension > 0){
    const quoi = S.etats.blessure > 0 ? "blessé" : "suspendu";
    S.liens.selection = clamp((S.liens.selection || 0) - 3);
    jrn('selection', `Tu as dû renoncer à la trêve : ${quoi}. Un autre a joué à ta place.`);
    const f = { caps:0, buts:0, passes:0, notes:[], matchs:[], mins:0, absent:quoi };
    if ((S.liens.selection || 0) < 38){
      S.selec.dedans = false; f.sorti = true;
      jrn('selection', `La liste est sortie sans toi. Ils ne t'ont pas rappelé.`);
    }
    return f;
  }
  /* LA FRANCE N'EST PAS UNE FONCTION DE TON CLUB. Première version : le meilleur
     club du pays + 4 — mesuré, elle perdait **64 % de ses matchs** et encaissait
     2,18 buts, parce que la force dépendait de la division où *tu* jouais (en
     deuxième division le meilleur club tombe à 60, soit huit points sous
     l'Islande). Une sélection nationale ne vaut pas ce que vaut ton employeur :
     c'est une valeur du pays, posée sur l'échelle des nations, un cran sous le
     Brésil. */
  const nous = FRANCE_FORCE;
  const tirage = NATIONS.slice().sort(() => Math.random() - .5).slice(0, 2);
  const f = { caps:0, buts:0, passes:0, notes:[], matchs:[], mins:0 };
  tirage.forEach(([nom, force], k) => {
    const statut = statutSelec();
    const mins = statut === 'titulaire' ? ri(70, 90) : (Math.random() < .55 ? ri(12, 35) : 0);
    const dom = k === 0;
    const diff = nous - force + (dom ? 2.4 : -2.4);
    const bn = poisson(tameXG(1.35 * Math.exp(diff / 19)));
    const be = poisson(tameXG(1.35 * Math.exp(-diff / 19)));
    const res = bn > be ? 'V' : bn === be ? 'N' : 'D';
    const m = { adv:nom, dom, bn, be, res, statut, minutes:mins, buts:0, passes:0, note:null };
    if (mins){
      f.caps++; f.mins += mins;
      const chance = { G:0, D:.055, M:.155, A:.28 }[S.moi.poste]
        * clamp(1 + (S.moi.base.spec - 50) * .006, .7, 1.3) * (mins / 90);
      for (let i = 0; i < bn; i++){
        if (Math.random() < chance) m.buts++;
        else if (Math.random() < { G:0, D:.10, M:.24, A:.18 }[S.moi.poste] * (mins / 90)) m.passes++;
      }
      const derriere = S.moi.poste === 'G' || S.moi.poste === 'D';
      /* Une sélection se joue au-dessus de ton niveau de club : `niveauJour()` se
         compare au niveau de la nation, pas à celui de ton club — c'est pour ça
         qu'une première sélection est dure. */
      m.note = Math.round(plafonnerNote(6.1 + poidsResultat(res, bn, be, derriere, nous - force)
        + cumul(m.buts, POIDS_BUT) + m.passes * PASSE_NOTE
        + (derriere ? (be === 0 ? .8 : be >= 4 ? -.7 : 0) : 0)
        + (niveauJour() - nous) * .05 + poidsEtat() + aleaNote()) * 10) / 10;
      f.notes.push(m.note); f.buts += m.buts; f.passes += m.passes;
    }
    f.matchs.push(m);
  });
  /* CE QUE ÇA COÛTE, et c'est le cœur du sujet : deux matchs, le voyage, et samedi
     dans trois jours. Le prix est volontairement plus lourd qu'un mercredi de
     coupe (7 + minutes × .14) : il y a deux rencontres et six mille kilomètres. */
  S.etats.fraicheur = clampFr(S.etats.fraicheur - (10 + f.mins * .16));
  S.etats.corps = clamp(S.etats.corps - 2, 0, 100);
  /* CE QUE LA TRÊVE COÛTE, ET CE QU'ELLE NE COÛTE PAS — mesuré, et ça contredit ce
     que j'attendais. Elle prend 27 points de fraîcheur sur la semaine (35 au coup
     d'envoi de samedi contre 63 une semaine ordinaire) et c'est tout : à
     l'intérieur des mêmes saisons, le samedi d'après est le même — 97,4 % de
     titularisations contre 97,5, 83,8 minutes contre 83,9, 1,6 % de blessures
     contre 1,3 % (n=2 208 contre 106 646, et le dernier écart vaut une
     erreur-type). La cause n'est pas la fenêtre, c'est la forme du vestiaire :
     quand on est appelé, on est **24 points au-dessus du dernier titulaire de son
     poste** (marge médiane sur 10 828 semaines), et sur 3 168 fenêtres **une
     seule** est tombée une semaine où la place se jouait. J'avais ajouté ici une
     pénalité de « retour de sélection » sur le choix du onze : mesurée, elle ne
     pouvait pas se déclencher. Retirée — une mécanique qui ne se déclenche jamais
     n'est pas un coût, c'est de la décoration. Ce qui reste à décider est au
     propriétaire : si une semaine internationale doit coûter plus que des jambes,
     le levier n'est pas ici mais dans le poids de la fraîcheur sur le temps de jeu
     d'un titulaire indiscutable. */
  // ce que tu y as fait décide si on te rappelle, et ce que le pays retient de toi
  const moy = f.notes.length ? f.notes.reduce((a, b) => a + b, 0) / f.notes.length : null;
  if (moy != null){
    S.liens.selection = clamp((S.liens.selection || 0) + (moy - 6.2) * 7);
    S.liens.supporters = clamp(S.liens.supporters + (moy >= 6.5 ? 4 : moy < 5.6 ? -2 : 1));
    S.liens.agent = clamp(S.liens.agent + (moy >= 6.5 ? 5 : 1));
    if (moy < 5.6) coutMental(1.4, "ces deux matchs en sélection");
  } else S.liens.selection = clamp((S.liens.selection || 0) - 6);  // rester sur le banc se paie
  S.selec.caps += f.caps; S.selec.buts += f.buts; S.selec.passes += f.passes;
  f.notes.forEach(n => S.selec.notes.push(n));
  const c = S.carriere; if (c){ c.caps = (c.caps || 0) + f.caps; c.butsSelec = (c.butsSelec || 0) + f.buts; }
  jrn('selection', `Sélection : ${f.matchs.map(m => `${m.adv} ${m.bn}-${m.be}`).join(', ')}` +
    (f.caps ? ` — ${f.caps} sélection${f.caps > 1 ? 's' : ''}${f.buts ? `, ${f.buts} but${f.buts > 1 ? 's' : ''}` : ''}.` : ` — tu n'as pas joué.`));
  /* ET ON PEUT NE PLUS ÊTRE RAPPELÉ. C'est la sortie du sous-système, et elle doit
     exister : sinon une sélection obtenue une fois serait acquise à vie, ce qui est
     exactement le défaut qu'il avait relevé sur la jauge en 1.0. */
  if ((S.liens.selection || 0) < 38){
    S.selec.dedans = false;
    jrn('selection', `La liste est sortie sans toi. Ils ne t'ont pas rappelé.`);
    f.sorti = true;
  }
  return f;
}
/* Ce qu'on dit du mercredi qui vient, sur l'écran de la semaine : la décision
   d'entraînement doit le savoir. */
function direMercredi(){
  if (S.selec && S.selec.dedans && J_SELEC.includes(S.journee))
    return `Cette semaine, **deux matchs en sélection**, à trois mille kilomètres. Samedi tombe quand même.`;
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
  /* LE STADE TE PORTE, ET ÇA SE JOUE (jauge rebranchée le 29/09/2026 : elle ne
     servait qu'à déclencher sa propre famille et à écrire une phrase). À domicile,
     ta popularité s'ajoute à l'avantage du terrain — jusqu'à ±1,2 quand le terrain
     lui-même vaut 2,4. À l'extérieur le stade n'est pas le tien : elle ne fait
     rien. C'est un demi-avantage du terrain qu'on gagne ou qu'on perd. */
  const porte = adv.dom ? clamp((S.liens.supporters - 50) * .034, -1.2, 1.2) : 0;
  const diff = nous - eux + (adv.dom ? 2.4 : -2.4) + porte;
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

  /* LA PHOTO D'AVANT-MATCH SE PREND AU COUP D'ENVOI. Elle était prise dans
     `finirMatch()`, c'est-à-dire **après** que les faits de match ont appliqué leurs
     effets : « Ce que ça change » comparait donc un état d'après à un état d'après, et
     tout ce qu'un fait avait fait bouger disparaissait de la comparaison. Mesuré sur
     449 faits joués, 490 effets appliqués : **52 % n'arrivaient jamais à l'écran**.
     Elle est posée sur `m` et non dans une variable locale, pour qu'une sauvegarde
     prise **en plein match** la retrouve au rechargement. */
  const m = { adv, statut, bn, be, faits: [], minutes: 0, buts:0, passes:0, note:null, moments:[], jaune:0, blessure:0,
    av: photoAvantMatch(),
    onze: eq.onze, banc: eq.banc, reserve: eq.reserve,
    absents: eq.absents.map(x => ({ nom:x.nom, poste:x.poste,
      raison: (x.ref.susp > 0 ? 'susp' : 'blesse') })), ecartOnze: eq.ecart, porte,
    /* La difficulté est celle de **l'équipe**, pas la tienne : `nous` contient ton
       propre apport (`(niveauJour() − force) × .12` quand tu es titulaire), et le
       laisser dedans voulait dire que mieux tu t'entraînais, moins tes victoires
       payaient. Mesuré avec ce couplage, le banc d'essai renvoyait « lever le pied »
       en tête des matchs à deux croisements sur trois — l'inverse de ce que le jeu
       doit dire. */
    ecartForce: (S.club.force + eq.ecart) - eux };

  // les buts, répartis dans le temps
  const mins = shuffle([...Array(90).keys()].map(i => i + 1));
  let evs = [];
  for (let i = 0; i < bn; i++) evs.push({ min: mins.pop(), type:'but', nous:true });
  for (let i = 0; i < be; i++) evs.push({ min: mins.pop(), type:'but', nous:false });
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
    /* UN ROUGE À LA MINUTE OÙ TU ENTRES te laissait **zéro minute** au compteur —
       mesuré une fois sur huit mille matchs, et c'est devenu un peu plus probable
       depuis que les changements peuvent avancer de vingt minutes. Ça arrive au
       football, mais ça ne s'écrit pas « 0 min » : on décale le carton d'une
       minute après l'entrée. */
    if (monRouge.min <= entree) monRouge.min = Math.min(90, entree + 1);
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
  /* UN PENALTY DOIT FINIR QUELQUE PART (le propriétaire, 01/10/2026 : « le penalty
     n'est pas dans les stats »). Il était tiré à 14 % et ne produisait **rien** : ni
     but au score, ni arrêt, ni raté, et personne ne le tirait — le film affichait
     « Penalty pour Stade Rennais » à la 81ᵉ et c'était tout. Même règle que les faits
     de match : il s'accroche à un **but réel** de ce camp-là (le film dit alors
     « sur penalty » et la note le compte déjà), ou il est **manqué**, et il porte un
     nom. Il n'est jamais le tien : ton penalty à toi est une décision (`penA`,
     `pen`), pas un tirage, et il coûterait sur ta note sans que tu aies choisi. */
  if (Math.random() < .14){
    const pourNous = Math.random() < .5;
    // un penalty n'a pas de passeur : on ne l'accroche qu'à un but qui n'en a pas
    const buts = evs.filter(e => e.type === 'but' && e.nous === pourNous
      && !e.pen && !e.passe && !e.passeMoi);
    if (buts.length) pick(buts).pen = true;
    else {
      const min = mins.pop();
      evs.push({ type:'penratee', nous: pourNous, min,
        qui: pourNous ? surLeBanc(m, min, 'but') : (buteurAdverse(adv) || adv.nom) });
      evs.sort((a, b) => a.min - b.min);
    }
  }
  // faits de match : zéro à deux, seulement si je suis sur le terrain
  if (m.minutes){
    tirerMoments(m, entree, sortie);
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
  /* La fenêtre internationale se lit sur l'écran de résultat, comme le mercredi :
     `apresMatch()` remet l'état de la semaine à zéro, donc elle doit voyager sur `m`. */
  m.selec = S.selecVue || null; S.selecVue = null;
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
/* ---------- les faits de match ----------
   TRENTE ET UN FAITS, et chaque issue dit trois choses (le propriétaire, 28/09/2026 :
   « chaque fait de match doit avoir un impact sur la note, que ce soit à travers la
   conséquence — un but, un carton jaune, une suspension — ou directement. Et il doit
   y avoir une deuxième conséquence : un impact sur un des axes ou sur la situation
   du joueur »). D'où la forme : `t` ce qui se passe, `n` ce que ça vaut sur ta note,
   `ev` l'événement que ça écrit dans le match, `e` le deuxième effet.
   `n:0` veut dire que la note est déjà payée par l'événement (le but marqué passe par
   POIDS_BUT, le but encaissé par le clean sheet) : jamais deux fois pour la même chose. */
const MOMENTS = {
G: [
  { id:'pen', q:"Penalty contre toi. Il pose le ballon et te regarde.", axe:'spec',
    opts:[
      { l:"Plonger du côté qu'il préfère", p:.34, aide:'spec',
        ok:{ t:"Le but est retiré du score.", n:1.2, ev:['arret'], e:{ spec:.8 } },
        ko:{ t:"Tu pars du mauvais côté, le but reste.", n:0, ev:['encaisse'], e:{ ment:-.8 } } },
      { l:"Rester debout le plus longtemps possible", p:.24, aide:'ment',
        ok:{ t:"Tu bloques : aucun renvoi, l'action est morte.", n:1.2, ev:['arret'], e:{ ment:1.2 } },
        ko:{ t:"Elle part dans l'angle, le but reste.", n:0, ev:['encaisse'], e:{ ligne:-1 } } } ] },
  { id:'sortie', q:"Ballon dans le dos de ta défense, leur attaquant part seul.", axe:'ment',
    opts:[
      { l:"Sortir dans les pieds", p:.55,
        ok:{ t:"But certain évité, sortie parfaite.", n:.9, ev:['sauve'], e:{ spec:.6 } },
        ko:{ t:"Il t'élimine.", n:0, ev:['encaisse'], e:{ ligne:-2 } } },
      { l:"Rester et fermer l'angle", p:.5,
        ok:{ t:"Il frappe sur toi : but certain évité.", n:.9, ev:['sauve'], e:{ ment:.8 } },
        ko:{ t:"Tu as reculé, il te passe dessus.", n:0, ev:['encaisse'], e:{ ligne:-1 } } } ] },
  { id:'relance', q:"Leur attaquant est sur toi. Ton défenseur appelle court, le stade crie de dégager.", axe:'tech',
    opts:[
      { l:"Jouer court", p:.6,
        ok:{ t:"Sortie de balle propre, le bloc remonte.", n:.4, e:{ ligne:3 } },
        ko:{ t:"Perte de balle dans ta surface.", n:-.3, ev:['encaisse'], e:{ ment:-1.5 } } },
      { l:"Dégager loin", p:.9,
        ok:{ t:"Leur temps fort est cassé.", n:.2, e:{ fit:1 } },
        ko:{ t:"Touche pour eux, ils repartent de là.", n:-.2, e:{ ligne:-1 } } } ] },
  { id:'corner', q:"Le ballon flotte au-dessus du paquet. Tu peux y aller.", axe:'phys',
    opts:[
      { l:"Sortir au poing", p:.55,
        ok:{ t:"Occasion nette cassée, ballon loin.", n:.6, ev:['sauve'], e:{ ligne:2 } },
        ko:{ t:"Battu dans les airs.", n:0, ev:['encaisse'], e:{ ligne:-2 } } },
      { l:"Rester sur ta ligne", p:.8,
        ok:{ t:"Un défenseur dégage, tu es prêt sur la frappe qui suit.", n:.3, e:{ ment:.4 } },
        ko:{ t:"Il fallait sortir.", n:0, ev:['encaisse'], e:{ ligne:-1 } } } ] },
  { id:'mur', q:"Ton mur est mal placé et l'arbitre siffle dans trois secondes.", axe:'spec',
    opts:[
      { l:"Replacer le mur", p:.62,
        ok:{ t:"Le mur tient : but évité.", n:.9, ev:['sauve'], e:{ ligne:2 } },
        ko:{ t:"Il ouvre le pied à côté du mur, et c'est ton mur.", n:0, ev:['encaisse'], e:{ spec:-.5 } } },
      { l:"Rester dans ton angle", p:.5,
        ok:{ t:"Tu la sors, sur tes appuis.", n:.9, ev:['sauve'], e:{ ment:.8 } },
        ko:{ t:"Le mur s'ouvre, tu ne l'as pas replacé.", n:0, ev:['encaisse'], e:{ ligne:-1 } } } ] },
],
D: [
  { id:'tacle', q:"Il te prend de vitesse dans le couloir, à l'entrée de la surface.", axe:'spec',
    opts:[
      { l:"Tacler", p:.5,
        ok:{ t:"Occasion nette cassée, ballon récupéré.", n:.6, ev:['sauve'], e:{ spec:.6 } },
        ko:{ t:"Tacle manqué : coup franc pour eux à l'entrée de la surface.", n:-.3, ev:['jaune'], e:{ ment:-.8 } } },
      { l:"Contenir et attendre l'aide", p:.62,
        ok:{ t:"L'attaque est contenue, le bloc se replace.", n:.3, e:{ ligne:2 } },
        ko:{ t:"Il centre, et ils marquent.", n:0, ev:['encaisse'], e:{ ment:-.6 } } } ] },
  { id:'horsjeu', q:"Leur attaquant part dans ton dos. Tu peux monter la ligne, ou décrocher avec lui.", axe:'spec',
    opts:[
      { l:"Jouer le hors-jeu", p:.46,
        ok:{ t:"Il est hors-jeu : tu récupères un bon ballon.", n:.6, ev:['sauve'], e:{ ligne:4 } },
        ko:{ t:"Tu es resté un pas derrière : il est en jeu et part seul au but.", n:0, ev:['encaisse'], e:{ ligne:-3 } } },
      { l:"Décrocher avec lui", p:.7,
        ok:{ t:"Tu le contiens jusqu'à la sortie de but.", n:.3, e:{ spec:.5 } },
        ko:{ t:"Il te prend de vitesse : tu es obligé de le faucher.", n:-.3, ev:['jaune'], e:{ spec:-.3 } } } ] },
  { id:'retour', q:"Il te déborde, tu reviens de trois mètres derrière lui. Dans la surface.", axe:'phys',
    opts:[
      { l:"Tenter le tacle glissé", p:.42,
        ok:{ t:"But certain évité, le stade se lève.", n:.9, ev:['sauve'], e:{ ligne:3 } },
        ko:{ t:"Penalty, et le carton avec.", n:-.3, ev:['jaune','encaisse'], e:{ coach:-2, ment:-1.5 } } },
      { l:"Le pousser vers l'extérieur", p:.74,
        ok:{ t:"Il centre mal, le danger meurt.", n:.3, e:{ spec:.5 } },
        ko:{ t:"Il centre bien.", n:-.4, e:{ ligne:-1 } } } ] },
  { id:'longue', q:"Tu as le ballon, leur ligne est haute, ton attaquant part. Quarante mètres.", axe:'tech',
    opts:[
      { l:"La tenter", p:.26,
        ok:{ t:"Ballon parfait, il n'a plus qu'à la mettre.", n:0, ev:['passe'], e:{ tech:.8 } },
        ko:{ t:"Perte de balle et contre-attaque.", n:-.4, e:{ ligne:-2 } } },
      { l:"Ressortir court", p:.86,
        ok:{ t:"Le ballon reste à l'équipe.", n:.2, e:{ ligne:2 } },
        ko:{ t:"Tu subis le pressing et dégages en touche.", n:-.2, e:{ ment:-.4 } } } ] },
  { id:'montee', q:"Corner pour vous. Vous êtes menés et il ne reste plus rien. Le coach ne dit rien — mais il ne te rappelle pas non plus.", axe:'phys', chaudSeul:true,
    opts:[
      { l:"Monter", p:.2,
        ok:{ t:"Tu la mets au fond.", n:0, ev:['but'], e:{ supporters:3 } },
        ko:{ t:"Rien devant, et tu es loin de ton poste.", n:-.5, e:{ ligne:-2 } } },
      { l:"Rester en couverture", p:.92,
        ok:{ t:"Tu coupes le contre.", n:.3, e:{ ligne:1 } },
        ko:{ t:"L'équipe attaque à un de moins et ne marque pas.", n:-.2, e:{ coach:-1 } } } ] },
],
M: [
  { id:'tir', q:"Vingt mètres, l'angle est fermé, un partenaire appelle dans le dos.", axe:'tech',
    opts:[
      { l:"Frapper", p:.24,
        ok:{ t:"Au fond.", n:0, ev:['but'], e:{ tech:.8 } },
        ko:{ t:"Détourné, l'action meurt là.", n:-.95, e:{ ligne:-1 } } },
      { l:"Le servir", p:.42,
        ok:{ t:"Il n'a plus qu'à la pousser.", n:0, ev:['passe'], e:{ ligne:4 } },
        ko:{ t:"Interception, l'action meurt aussi.", n:-.95, e:{ ment:-.5 } } } ] },
  { id:'coupfranc', q:"Coup franc à vingt-deux mètres, légèrement excentré. Le ballon est pour toi.", axe:'tech',
    opts:[
      { l:"La tenter", p:.18,
        ok:{ t:"Par-dessus le mur, dans le petit filet.", n:0, ev:['but'], e:{ tech:1 } },
        ko:{ t:"Le mur, rien.", n:-.95, e:{ ligne:-1 } } },
      { l:"Centrer", p:.34,
        ok:{ t:"Ballon posé sur la tête.", n:0, ev:['passe'], e:{ ligne:3 } },
        ko:{ t:"Dégagé de la tête.", n:-.95, e:{ ment:-.4 } } } ] },
  { id:'faute', q:"Ils partent en contre à quatre contre trois. Tu peux l'accrocher maintenant.", axe:'ment',
    opts:[
      { l:"L'accrocher", p:.82,
        ok:{ t:"Le contre est mort — mais le carton est pour toi.", n:-.3, ev:['jaune','sauve'], e:{ ligne:3 } },
        ko:{ t:"Il se dégage, le contre part quand même, et le carton tombe.", n:-.3, ev:['jaune'], e:{ ment:-.8 } } },
      { l:"Le laisser filer", p:.42,
        ok:{ t:"La défense s'en sort, aucun carton.", n:.2, e:{ ment:.4 } },
        ko:{ t:"Ils marquent au bout du contre.", n:0, ev:['encaisse'], e:{ ligne:-2 } } } ] },
  { id:'presse', q:"Tu peux remonter presser leur défense, ou tenir ta position.", axe:'phys',
    opts:[
      { l:"Presser", p:.35,
        ok:{ t:"Ballon récupéré à vingt-cinq mètres : une occasion nette.", n:0, ev:['occas'], e:{ phys:.8 } },
        ko:{ t:"Un trou derrière toi.", n:-.4, e:{ fit:-3 } } },
      { l:"Tenir la ligne", p:.7,
        ok:{ t:"Le bloc a tenu, ils repassent en arrière.", n:.2, e:{ ligne:2 } },
        ko:{ t:"Ils ressortent proprement.", n:-.4, e:{ coach:-1 } } } ] },
],
A: [
  { id:'face', q:"Seul face au gardien, un coéquipier arrive à ta hauteur.", axe:'spec',
    opts:[
      { l:"Frapper", p:.44,
        ok:{ t:"Sous la barre.", n:0, ev:['but'], e:{ ment:1 } },
        ko:{ t:"Le gardien dit non.", n:-.95, e:{ ment:-1.2 } } },
      { l:"Le décaler", p:.56,
        ok:{ t:"Il pousse dans le but vide.", n:0, ev:['passe'], e:{ ligne:4 } },
        ko:{ t:"Il est repris.", n:-.95, e:{ ligne:-1 } } } ] },
  { id:'volee', q:"Le ballon tombe sur ton pied, dans la surface.", axe:'tech',
    opts:[
      { l:"Reprendre de volée", p:.2,
        ok:{ t:"Lucarne.", n:0, ev:['but'], e:{ tech:1 } },
        ko:{ t:"À côté.", n:-.95, e:{ ment:-.5 } } },
      { l:"Contrôler d'abord", p:.38,
        ok:{ t:"Tu la glisses au premier poteau.", n:0, ev:['but'], e:{ spec:.6 } },
        ko:{ t:"Le défenseur revient.", n:-.95, e:{ ligne:-1 } } } ] },
  { id:'penA', q:"Penalty pour vous. Le tireur habituel te regarde et attend.", axe:'ment',
    opts:[
      { l:"Le tirer", p:.76,
        ok:{ t:"Tu l'envoies au fond du cadre.", n:0, ev:['but'], e:{ ment:1.5, supporters:3 } },
        ko:{ t:"Tu l'envoies à côté, et le stade s'en souvient.", n:-1.2, ev:['manque'], e:{ ment:-2.2, vestiaire:-4 } } },
      { l:"Le laisser au tireur habituel", p:.78,
        ok:{ t:"Il l'envoie au fond : un but pour l'équipe, rien pour toi.", n:-.2, ev:['equipe'], e:{ ligne:2 } },
        ko:{ t:"Il l'envoie à côté.", n:-.2, ev:['manque'], e:{ ment:-.5 } } } ] },
  { id:'hjA', q:"Le ballon part derrière la défense. Tu es sur la limite.", axe:'spec',
    opts:[
      { l:"Partir", p:.45,
        ok:{ t:"Tu es lancé, et tu la mets.", n:0, ev:['but'], e:{ phys:.6 } },
        ko:{ t:"Hors-jeu signalé, rien.", n:-.95, e:{ spec:-.3 } } },
      { l:"Attendre une demi-seconde", p:.62,
        ok:{ t:"Tu reçois dos au but et tu remises.", n:0, ev:['passe'], e:{ spec:.6 } },
        ko:{ t:"L'action est déjà morte.", n:-.95, e:{ ment:-.4 } } } ] },
],
};

/* LES FAITS QUI NE DÉPENDENT PAS DU POSTE (le propriétaire, 28/09/2026 : « on peut
   ajouter des faits de match en lien avec les coéquipiers qui n'ont rien à voir
   avec le poste »). Ils sont les seuls à faire bouger le vestiaire en plein match.
   `gk` : ce qui change quand c'est un gardien — « pour le gardien c'est un peu
   différent, il y a de plus gros risques donc de plus grosses récompenses ». */
const MOMENTS_TOUS = [
  { id:'craque', q:"Un coéquipier vient de commettre l'erreur du match. Il est resté à genoux, les mains sur le visage.", axe:'ment',
    gk:{ 0:{ ok:{ ligne:6 } }, 1:{ ko:{ ligne:-5, coach:-3 } } },
    opts:[
      { l:"Aller le relever", p:.6,
        ok:{ t:"Il se remet dedans et finit le match debout.", n:.3, e:{ ligne:4 } },
        ko:{ t:"Il te repousse : tu as perdu vingt secondes et le fil.", n:-.3, e:{ ment:-.5 } } },
      { l:"Le laisser, tu as un match à jouer", p:.75,
        ok:{ t:"Tu restes dans ton match, personne ne t'en veut.", n:.4, e:{ spec:.3 } },
        ko:{ t:"Il replonge, et le banc a vu que tu n'as pas bougé.", n:-.2, e:{ ligne:-3, coach:-2 } } } ] },
  { id:'ballon', q:"Tu étais seul, il a frappé, il a raté. Tu lèves les bras. Il ne te regarde même pas.", axe:'ment', pasG:true,
    opts:[
      { l:"Lui dire, tout de suite, sur le terrain", p:.5,
        ok:{ t:"Il te cherche la fois d'après.", n:.3, e:{ ligne:3 } },
        ko:{ t:"Il se braque, et tu ne reçois plus un ballon propre de lui.", n:-.3, e:{ ligne:-3 } } },
      { l:"Ne rien dire, repartir", p:.7,
        ok:{ t:"Il s'excuse tout seul à la pause.", n:.2, e:{ ligne:2 } },
        ko:{ t:"Il recommence deux fois, tu finis le match sans un ballon propre.", n:-.4, e:{ ment:-.8 } } } ] },
  /* UN FAIT QUI AFFIRME UN ÉVÉNEMENT DU MATCH S'ACCROCHE À L'ÉVÉNEMENT RÉEL. Celui-ci
     annonçait un rouge que le film ne montrait pas, et un temps restant écrit en dur
     (« il reste vingt-cinq minutes ») démenti par la minute du fait. */
  { id:'adix', q:"Rouge pour un des tiens. Vous êtes un de moins. Personne ne dit rien, et tout le monde te regarde.", axe:'ment', prio:true,
    ancre:(m, bas, haut) => {
      const l = (m.expulses || []).filter(x => x.nom !== S.moi.nom && x.min + 1 >= bas && x.min + 1 <= haut);
      if (!l.length) return null;
      const x = pick(l), mn = x.min + 1;
      return { min:mn, q:`Rouge pour ${x.nom}. Il reste ${90 - mn} minutes et vous êtes un de moins. Personne ne dit rien, et tout le monde te regarde.` };
    },
    gk:{ 0:{ ok:{ ligne:6 }, ko:{ ligne:-4 } } },
    opts:[
      { l:"Reculer tout le monde et tenir", p:.65,
        ok:{ t:"Le bloc tient, vous sortez le point.", n:.5, e:{ vestiaire:4 } },
        ko:{ t:"Vous reculez trop et vous encaissez.", n:0, ev:['encaisse'], e:{ ment:-.8 } } },
      { l:"Continuer à jouer haut", p:.4,
        ok:{ t:"Vous marquez à dix, le stade se lève.", n:0, ev:['equipe'], e:{ vestiaire:6, supporters:4 } },
        ko:{ t:"Ils vous prennent dans le dos.", n:0, ev:['encaisse'], e:{ ligne:-3 } } } ] },
  /* « Il entre à la 72ᵉ » était écrit en dur, quand le fait se tirait entre la 10ᵉ et la
     88ᵉ : le propriétaire l'a vu à la 25ᵉ. Et personne n'entrait vraiment. Le jeune est
     désormais un entrant réel du film, il a son nom et sa minute. */
  { id:'jeune', q:"Il entre pour son premier match. Il a les jambes qui tremblent, et il se place à côté de toi.", axe:'ment',
    ancre:(m, bas, haut) => {
      /* L'âge est sur `ref` : les listes du onze et du banc sont des enveloppes, pas
         les joueurs eux-mêmes. À le lire sur l'enveloppe, le fait ne sortait plus
         jamais — 173 tirages devenus zéro, et la sonde l'a dit tout de suite. */
      const age = c => (c.entrant.ref && c.entrant.ref.age) || 30;
      const l = (m.chg || []).filter(c => c.entrant && !c.entrant.moi && age(c) <= 24
        && c.min >= bas && c.min <= haut);
      if (!l.length) return null;
      const c = l.sort((a, b) => age(a) - age(b))[0];
      const quoi = age(c) <= 21 ? "pour son premier match" : "pour l'un de ses premiers matchs";
      return { min:c.min, q:`${c.entrant.nom} entre à la ${c.min}ᵉ ${quoi}. Il a les jambes qui tremblent, et il se place à côté de toi.` };
    },
    gk:{ 0:{ ok:{ vestiaire:7 } }, 1:{ ko:{ coach:-3, vestiaire:-4 } } },
    opts:[
      { l:"Jouer facile avec lui, le mettre dedans", p:.7,
        ok:{ t:"Il touche dix ballons et il en réussit neuf.", n:.2, e:{ vestiaire:5 } },
        ko:{ t:"Tu le sers mal, il perd deux ballons, on croit que c'est lui.", n:-.3, e:{ vestiaire:-2 } } },
      { l:"Jouer ton match", p:.8,
        ok:{ t:"Tu finis ton match comme tu l'avais commencé.", n:.4, e:{ spec:.3 } },
        ko:{ t:"Il n'existe pas, et le coach t'a regardé faire.", n:-.2, e:{ coach:-2, vestiaire:-3 } } } ] },
  { id:'bagarre', q:"Il l'a fauché, il reste au-dessus de lui, et il lui parle. Tout le monde monte.", axe:'ment',
    gk:{ 0:{ p:-.05, ok:{ vestiaire:9 }, ko:{ coach:-4 } }, 1:{ ko:{ vestiaire:-2 } } },
    opts:[
      { l:"Y aller", p:.55,
        ok:{ t:"Tu le relèves et tu écartes l'autre, l'arbitre te laisse.", n:.2, e:{ vestiaire:6 } },
        ko:{ t:"Tu en prends un aussi.", n:-.3, ev:['jaune'], e:{ coach:-2 } } },
      { l:"Rester à l'écart", p:.85,
        ok:{ t:"Tu gardes la tête froide, l'arbitre le note.", n:.3, e:{ coach:2 } },
        ko:{ t:"Ils ont compté qui est venu, et tu n'y étais pas.", n:-.2, e:{ vestiaire:-5 } } } ] },
  { id:'cuisse', q:"Ça tire derrière la cuisse. Le banc t'a vu la toucher.", axe:'phys', tard:true,
    opts:[
      { l:"Demander le changement", p:.7,
        ok:{ t:"Le kiné confirme : tu as bien fait de sortir, aucune blessure.", n:0, ev:['sortie'], e:{ corps:3, coach:1 } },
        ko:{ t:"Il ne trouve rien : une crampe, tu es sorti pour rien.", n:0, ev:['sortie'], e:{ coach:-5, vestiaire:-2 } } },
      { l:"Serrer les dents", p:.65,
        ok:{ t:"Tu finis le match, la cuisse tient.", n:0, e:{ coach:4 } },
        ko:{ t:"Ça lâche.", n:-.5, ev:['bless'], e:{ corps:-5, ment:-2.2 } } } ] },
];
/* LES SOIRS DE SEMAINE (le propriétaire, 29/09/2026 : « ajouter des faits pour les
   matchs de coupe et Europe »). Un seul par match de mercredi, jamais deux : la
   semaine ne gonfle que les semaines où il y a vraiment un match en plus. */
const MOMENTS_CE = [
  { id:'petit', q:"Terrain gras, trois mille personnes collées au bord, et une équipe qui n'a rien à perdre.", axe:'ment', ou:'coupe', tour:2, titu:true,
    opts:[
      { l:"Jouer sérieux dès la première minute", p:.8,
        ok:{ t:"Vous pliez le match avant la mi-temps, tu sors à l'heure de jeu.", n:.5, mins:60, e:{ fit:-4 } },
        ko:{ t:"Ils s'accrochent, tu joues les quatre-vingt-dix.", n:.2, mins:90, e:{ fit:-12 } } },
      { l:"Économiser tes jambes pour samedi", p:.55,
        ok:{ t:"Vous passez sans forcer.", n:.2, e:{ fit:-5 } },
        ko:{ t:"Éliminés par un club de division inférieure.", n:-.6, e:{ vestiaire:-6, supporters:-8 } } } ] },
  { id:'pelouse', q:"Un champ de patates. Le ballon ne roule pas, il saute.", axe:'tech', ou:'coupe',
    opts:[
      { l:"Jouer court quand même", p:.4,
        ok:{ t:"Vous gardez le ballon, ils n'y touchent pas.", n:.6, e:{ tech:.6 } },
        ko:{ t:"Deux contrôles ratés, deux contres.", n:-.5, e:{ ligne:-2 } } },
      { l:"Tout balancer devant", p:.75,
        ok:{ t:"C'est laid, mais vous passez.", n:.2, e:{ ligne:1 } },
        ko:{ t:"Vous rendez le ballon trente fois, ils y croient.", n:-.3, e:{ fit:-6 } } } ] },
  { id:'tab', q:"Zéro partout. Le capitaine fait le tour et demande qui veut tirer.", axe:'ment', ou:'coupe', pasG:true, tab:true,
    opts:[
      { l:"Prendre le premier", p:.8,
        ok:{ t:"Tu lances la série, tout le monde suit.", n:.6, e:{ ment:1.2, vestiaire:4 } },
        ko:{ t:"Tu le manques d'entrée, la série part de travers.", n:-.8, e:{ ment:-2.5 } } },
      { l:"Prendre le cinquième", p:.72,
        ok:{ t:"Celui qui qualifie. Tu es porté jusqu'au vestiaire.", n:1, e:{ ment:2, supporters:8 } },
        ko:{ t:"Celui qui élimine. Tu connais le silence du vestiaire.", n:-1.2, e:{ ment:-3, vestiaire:-5 } } } ] },
  { id:'tabG', q:"Cinq tireurs, et tu es seul au milieu. Le premier pose déjà le ballon. Pour la première fois du match, plus personne ne peut rien faire à ta place.", axe:'spec', ou:'coupe', gOnly:true, tab:true,
    opts:[
      { l:"Suivre ce que tu as préparé", p:.3, aide:'spec',
        ok:{ t:"Tu pars du bon côté deux fois, tu en sors un : vous êtes qualifiés.", n:1.5, ev:['arretTab'], e:{ spec:1.2, supporters:8 } },
        ko:{ t:"Ils les mettent tous les cinq. Tu n'as rien à te reprocher, et ça ne console pas.", n:-.3, e:{ ment:-1.5 } } },
      { l:"Partir au feeling, et les regarder dans les yeux", p:.25, aide:'ment',
        ok:{ t:"Tu en sors deux. Personne ne t'avait rien dit : c'est toi, tout seul.", n:1.8, ev:['arretTab'], e:{ ment:3, vestiaire:8 } },
        ko:{ t:"Tu plonges trois fois avant la frappe : ils t'ont lu.", n:-.6, e:{ ment:-2, ligne:-2 } } } ] },
  { id:'depl', q:"Trois mille kilomètres, un stade plein et hostile, et samedi dans trois jours.", axe:'phys', ou:'euro', dehors:true, titu:true,
    opts:[
      { l:"Tout donner", p:.6,
        ok:{ t:"Tu tiens les quatre-vingt-dix et vous ramenez un résultat.", n:.7, mins:90, e:{ agent:6 } },
        ko:{ t:"Tu es cuit à l'heure de jeu, tu sors.", n:-.3, mins:60, e:{ fit:-14 } } },
      { l:"Gérer", p:.8,
        ok:{ t:"Tu fais le match qu'il fallait, sans éclat.", n:.2, e:{ fit:-6 } },
        ko:{ t:"Le coach voit que tu as gardé tes jambes.", n:-.2, e:{ coach:-4 } } } ] },
  { id:'grand', q:"En face, quelqu'un que tu regardais à la télé il y a trois ans.", axe:'spec', ou:'euro',
    opts:[
      { l:"Le prendre de front", p:.35,
        ok:{ t:"Tu le tiens toute la soirée, et tout le monde l'a vu.", n:1, e:{ agent:10, supporters:6 } },
        ko:{ t:"Il te passe dessus, et c'est diffusé dans quarante pays.", n:-.9, e:{ ment:-2 } } },
      { l:"Jouer ton match", p:.7,
        ok:{ t:"Tu fais ce que tu sais faire, il fait le reste.", n:.3, e:{ spec:.5 } },
        ko:{ t:"Tu t'effaces, on ne t'a pas vu.", n:-.4, e:{ coach:-3 } } } ] },
  { id:'finale', q:"Le bus a mis quarante minutes à traverser la ville, personne n'a parlé. Le coach demande si quelqu'un veut dire quelque chose.", axe:'ment', finale:true,
    opts:[
      { l:"Parler", p:.6,
        ok:{ t:"Tu trouves les mots, ils sortent du vestiaire différents.", n:.4, e:{ vestiaire:8 } },
        ko:{ t:"Tu bafouilles, et le silence retombe plus lourd.", n:-.3, e:{ ment:-1.5 } } },
      { l:"Laisser le capitaine le faire", p:.85,
        ok:{ t:"Il dit ce qu'il faut, et toi tu te concentres sur toi.", n:.4, e:{ ment:1 } },
        ko:{ t:"Personne ne dit rien, vous entrez froids.", n:-.4, e:{ vestiaire:-3 } } } ] },
];
function suiteMatch(){
  const m = S.match;
  /* TU NE JOUES PAS UN FAIT APRÈS ÊTRE SORTI. Les faits sont tirés dans ta fenêtre,
     mais un fait peut la refermer en cours de route (la cuisse qui lâche, un rouge) :
     mesuré, 24 faits sur 1 985 se jouaient après ta sortie. Ceux-là n'ont pas eu lieu. */
  const e0 = m.entree || 0, fin = e0 + (m.minutes || 0);
  while (S.momentIdx < m.moments.length){
    const f = m.moments[S.momentIdx];
    if (f.min >= e0 && f.min <= fin) break;
    m.moments.splice(S.momentIdx, 1);
  }
  if (S.momentIdx < m.moments.length){ S.ecran = 'moment'; sauver(); return rendre(); }
  finirMatch();
}
/* ---------- ce qu'un fait écrit dans le match ---------- */
/* LES ÉVÉNEMENTS NE PEUVENT PLUS RESTER DES PHRASES (le propriétaire, 29/09/2026 :
   « les événements liés aux faits de match doivent apparaître et être comptabilisés
   dans le résultat du match, la note du jour et les faits du joueur »). Chaque issue
   déclare ce qu'elle écrit ; `ecrireFait()` est la seule porte, donc le score, le film
   et les pastilles ne peuvent plus se contredire. */
function ecrireFait(m, f, quoi){
  const min = f.min;
  const tri = () => m.evs.sort((a, b) => a.min - b.min);
  quoi.forEach(k => {
    if (k === 'but'){
      m.bn++; m.buts++;
      m.evs.push({ type:'but', nous:true, min, qui:S.moi.nom, moi:true }); tri();
    } else if (k === 'passe'){
      m.bn++; m.passes++;
      m.evs.push({ type:'but', nous:true, min, qui: surLeBanc(m, min, 'but'), passeMoi:true }); tri();
    } else if (k === 'equipe'){
      m.bn++;
      m.evs.push({ type:'but', nous:true, min, qui: surLeBanc(m, min, 'but') }); tri();
    } else if (k === 'encaisse'){
      m.be++;
      m.evs.push({ type:'but', nous:false, min, qui: buteurAdverse(m.adv) || m.adv.nom }); tri();
    } else if (k === 'occas'){
      /* « Retire le but, c'est trop, mais une chance de mettre un but c'est bien —
         ou une passe décisive. » Un pressing réussi ne fait pas un but : il fait une
         occasion, qui finit dedans une fois sur deux. */
      if (Math.random() < .5) ecrireFait(m, f, [Math.random() < .5 ? 'but' : 'passe']);
      else f.occasSeche = true;
    } else if (k === 'arret'){
      // le penalty arrêté retire le but qu'il arrête : le film montrait les deux
      const cand = m.evs.filter(e => e.type === 'but' && !e.nous && Math.abs(e.min - min) <= 12);
      if (cand.length){
        const cible = cand.reduce((a, e) => Math.abs(e.min - min) < Math.abs(a.min - min) ? e : a, cand[0]);
        m.evs.splice(m.evs.indexOf(cible), 1); m.be = Math.max(0, m.be - 1); f.min = cible.min;
      }
      m.arrets = (m.arrets || 0) + 1;
      m.evs.push({ type:'penalty', nous:false, min:f.min, arrete:true, moi:true }); tri();
    } else if (k === 'arretTab'){
      m.arrets = (m.arrets || 0) + 1;
      m.evs.push({ type:'tab', min:90, moi:true }); tri();
    } else if (k === 'sauve'){
      m.sauves = (m.sauves || 0) + 1;
      m.evs.push({ type:'sauve', nous:true, min, moi:true }); tri();
    } else if (k === 'jaune'){
      // et on ne prend pas un carton après être sorti
      if (m.sorti && min > m.sorti) return;
      /* Un deuxième jaune est un rouge : c'est la règle, et c'est ce qui rend la
         faute tactique dangereuse quand on en traîne déjà un. */
      if (m.evs.some(e => e.type === 'jaune' && e.moi)){
        /* Un rouge né d'un fait arrête ton match comme celui que le moteur tire.
           Le moteur, lui, choisit ses expulsés parmi ceux qui devaient finir, donc il
           n'a jamais de changement à annuler ; ici si — et un expulsé ne se remplace
           pas. Sans ça le film montrait « tu sors à la 57ᵉ » pour un match arrêté à
           la 49ᵉ (vu par la sonde des invariants, 1 match sur 850). */
        m.evs.push({ type:'rouge', min, moi:true }); tri();
        const ic = (m.chg || []).findIndex(c => c.sortant && c.sortant.moi);
        if (ic >= 0) m.chg.splice(ic, 1);
        (m.expulses = m.expulses || []).push({ nom:S.moi.nom, min });
        finirTonMatch(m, min);
      } else { m.jaune++; m.evs.push({ type:'jaune', min, moi:true }); tri(); }
    } else if (k === 'manque'){
      m.evs.push({ type:'penratee', nous:true, min, moi:f.choixMoi !== false }); tri();
    } else if (k === 'bless'){
      f.blesse = true;
    } else if (k === 'sortie'){
      sortirDuMatch(m, min);
    }
  });
}
/* TU SORS, DONC QUELQU'UN ENTRE. Première version : la sortie coupait seulement tes
   minutes (`m.minutes = min`), ce qui était faux deux fois — pour un remplaçant,
   `m.minutes` est un nombre de minutes jouées et non la minute de sortie, donc le
   fait ne faisait rien du tout ; et pour un titulaire, tu quittais le terrain sans
   remplaçant, ce qui laissait **un nombre impair de sortants**. C'est exactement le
   défaut que le propriétaire avait relevé sur les cartons rouges (« c'est forcément
   un nombre pair sauf s'il y a un carton rouge, mais c'est pas indiqué »), et la
   sonde l'a rattrapé : 33 matchs sur 2 040 avec neuf sortants pour quatre
   changements. La sortie s'accroche donc à un changement réel — celui qui était
   prévu pour toi, avancé à la minute du fait, ou un nouveau pris sur le banc. */
/* TU NE MARQUES PAS APRÈS AVOIR QUITTÉ LE TERRAIN (le propriétaire, 02/10/2026,
   rapport à l'appui : « je suis sorti et j'ai mis 2 buts » — sorti à la 66ᵉ sur la
   cuisse, et le film lui donnait un but à la 72ᵉ et un autre à la 73ᵉ).
   **C'est un défaut d'ordre, pas de tirage.** Le moteur attribue tes buts dans la
   fenêtre `entree`-`sortie` qu'il connaît (`e.min >= entree && e.min <= sortie`),
   puis un **fait de match referme cette fenêtre** — la cuisse qu'on écoute, un
   deuxième jaune — et les buts déjà posés restaient les tiens. Un rouge tiré *avant*
   l'attribution était déjà traité ; celui qu'un fait crée ne l'était pas.
   `finirTonMatch()` est la porte unique : elle coupe tes minutes **et rend à un
   coéquipier réellement sur le terrain** les buts et les passes qui tombent après.
   Les événements ne sont ni ajoutés ni retirés, donc le score vaut toujours le film :
   c'est le buteur qui change, pas le but. Mesuré avant : 117 matchs sur 20 794
   (96 buts, 41 passes) et 17 matchs qui continuaient après ton propre rouge. */
function finirTonMatch(m, min){
  const e0 = m.entree || 0;
  m.minutes = Math.max(0, min - e0);
  (m.evs || []).forEach(e => {
    if (e.type !== 'but' || !e.nous || e.min <= min) return;
    if (e.moi){
      e.moi = false; m.buts = Math.max(0, m.buts - 1);
      e.qui = surLeBanc(m, e.min, 'but');
      // un buteur ne se sert pas lui-même
      if (e.passe === e.qui) delete e.passe;
    }
    if (e.passeMoi){ e.passeMoi = false; m.passes = Math.max(0, m.passes - 1); }
  });
}
function sortirDuMatch(m, min){
  const e0 = m.entree || 0;
  if (!m.minutes || min <= e0 + 1 || min >= 89) return;
  /* On ne remplace pas un expulsé : ton rouge a déjà arrêté ton match, et te faire
     aussi sortir en changement te comptait deux fois. C'est l'unique écart que la
     sonde des sept invariants trouvait encore (1 match sur 2 040). */
  if ((m.evs || []).some(e => e.type === 'rouge' && e.moi)) return;
  const chg = m.chg || (m.chg = []);
  const mien = chg.find(c => c.sortant && c.sortant.moi);
  if (mien){ if (min < mien.min) mien.min = min; else return; }
  else {
    const pris = chg.filter(c => c.entrant).map(c => c.entrant);
    const libre = (m.banc || []).filter(x => !x.moi && pris.indexOf(x) < 0);
    const moi = (m.onze || []).find(x => x.moi) || (m.banc || []).find(x => x.moi);
    // plus personne sur le banc : tu finis le match, en serrant les dents
    if (!libre.length || !moi) return;
    chg.push({ min, entrant: pick(libre), sortant: moi });
  }
  m.sorti = min; finirTonMatch(m, min);
}
/* ---------- le tirage des faits ---------- */
/* « Tu peux monter le nombre de faits par match. » Mesuré avant : 64 % des matchs
   n'en avaient aucun, 32 % un, 3 % deux. Avec trente et un faits au lieu de huit,
   on peut se le permettre : 60 % au moins un, 15 % deux. */
function tirerMoments(m, entree, sortie){
  if (!m.minutes) return;
  const bas = Math.max(entree + 2, 10), haut = Math.min(sortie - 2, 88);
  if (haut <= bas) return;
  const gard = S.moi.poste === 'G';
  const sac = MOMENTS[S.moi.poste].concat(MOMENTS_TOUS.filter(f => !(f.pasG && gard)));
  /* JUSQU'À TROIS FAITS DANS UN MATCH (le propriétaire, 29/09/2026 : « c'est ok
     pour les faits à 3 »). Le rendement décroissant de `POIDS_FAIT` empêche le
     triplé de faits de faire un 10 ; ce qu'il rend, c'est le relief. */
  const t = Math.random();
  const n = t < .35 ? 0 : t < .77 ? 1 : t < .94 ? 2 : 3;
  /* UN ROUGE DANS TON CAMP EST LE MOMENT DU MATCH. Une fois le fait ancré sur une
     vraie expulsion, il lui fallait l'événement **et** le tirage : mesuré, 3 sorties
     sur 1 878 faits, autant dire une famille morte. Quand l'événement a vraiment eu
     lieu, le fait qui en parle passe donc devant le tirage. */
  if (n) for (const f of sac){
    if (!f.prio) continue;
    const a = f.ancre(m, bas, haut);
    if (!a || Math.random() >= .6) continue;
    const mo = { ...f, min:a.min, q:a.q }; delete mo.ancre; m.moments.push(mo); break;
  }
  for (let i = m.moments.length; i < n; i++){
    /* Une ancre qui ne trouve pas son événement ne doit pas coûter le fait : on retire
       une fois dans le sac. Sans ça, les deux familles ancrées mangeaient 10 % des faits. */
    let f = pick(sac);
    if (f.ancre && !f.ancre(m, bas, haut)) f = pick(sac);
    if (m.moments.some(x => x.id === f.id)) continue;
    // la cuisse ne tire qu'en seconde période, la montée qu'en fin de match serré
    let mn = ri(bas, haut), q = f.q;
    if (f.tard) mn = ri(Math.max(bas, 55), haut);
    if (f.chaudSeul){ if (m.bn >= m.be || haut < 70) continue; mn = ri(Math.max(bas, 70), haut); }
    /* Un fait qui affirme un événement du match (une entrée, un rouge) s'accroche à
       l'événement réel : il prend sa minute et le nom de celui qu'il concerne, et il ne
       se tire pas du tout quand l'événement n'a pas eu lieu. Le texte est résolu ici,
       jamais stocké comme fonction : `m.moments` passe par la sauvegarde. */
    if (f.ancre){
      const a = f.ancre(m, bas, haut);
      if (!a) continue;
      mn = a.min; q = a.q;
    }
    const mo = { ...f, min:mn, q };
    delete mo.ancre;
    m.moments.push(mo);
  }
  m.moments.sort((a, b) => a.min - b.min);
}
/* UN SEUL FAIT LE MERCREDI. « Ça ne rallonge pas ta semaine, ça la coûte » : la coupe
   et l'Europe gardent leur clic unique, et le fait qui s'y joue parle de la soirée —
   le petit club, la pelouse, les tirs au but, le déplacement, le grand d'Europe. */
function momentSemaine(info, m){
  const ou = info.c, gard = S.moi.poste === 'G';
  /* LE FAIT DU MERCREDI TOMBAIT N'IMPORTE QUAND (`ri(20, 85)`), y compris avant
     l'entrée d'un remplaçant ou après la sortie d'un titulaire : mesuré, 58 faits
     sur 192 hors du temps de jeu. Il se tire désormais dans ta fenêtre, et deux
     familles qui parlent de toute la soirée (`titu`) ou de la fin (`fin`, les tirs
     au but) ne se tirent que quand c'est vrai. */
  const titu = m && m.statut === 'titulaire';
  const mins = (m && m.minutes) || 0;
  const ent = titu ? 0 : 90 - mins, sor = titu ? mins : 90;
  const bas = Math.max(ent + 2, 12), haut = Math.min(sor - 2, 85);
  if (haut <= bas) return null;
  const sac = MOMENTS_CE.filter(f =>
    (!f.ou || f.ou === ou) && !(f.pasG && gard) && !(f.gOnly && !gard)
    && !(f.tour && (info.t == null || info.t >= f.tour))
    && !(f.dehors && info.dom) && !(f.finale && !info.finale)
    && !(f.titu && !titu) && !(f.tab && sor < 90)
    // les tirs au but ne se tirent que s'il y a vraiment une séance de tirs au but
    && !(f.tab && !(m && m.tab)));
  if (!sac.length) return null;
  const f = pick(sac);
  return { ...f, min: f.tab ? 90 : ri(bas, haut) };
}

/* ---------- le deuxième effet ---------- */
/* Chaque issue porte un effet sur un axe que tu entraînes ou sur ta situation.
   C'est la deuxième moitié de la demande du 28/09 : la note dit ce que ça vaut
   aujourd'hui, celui-ci dit ce que ça laisse. */
function effetFait(e, raison){
  if (!e) return;
  Object.entries(e).forEach(([k, v]) => {
    if (k === 'ligne') bougerLigne(LIGNE_DU_POSTE[S.moi.poste], v);
    else if (k === 'vestiaire') bougerVestiaire(v);
    else if (k === 'ment') v < 0 ? coutMental(-v, raison) : bougerAxe('ment', v);
    else if (k === 'tech' || k === 'phys' || k === 'spec') bougerAxe(k, v);
    else if (k === 'fit') S.etats.fraicheur = clampFr(S.etats.fraicheur + v);
    else if (k === 'corps') S.etats.corps = clamp(S.etats.corps + v, 0, 100);
    else if (k === 'proches') bougerProches(v);
    else S.liens[k] = clamp(S.liens[k] + v);
  });
}
function choisirMoment(i){
  const m = S.match, f = m.moments[S.momentIdx], o = f.opts[i];
  /* L'axe du fait décide d'abord, mais la technique pèse sur **tous** les faits :
     c'est elle qui fait que le geste sort, quel que soit le geste. Quand le fait
     est déjà technique, on ne la compte pas deux fois. */
  const axeV = S.moi.base[f.axe] + S.moi.boost[f.axe];
  const techV = S.moi.base.tech + S.moi.boost.tech;
  /* PRESSION : un moment chaud coûte douze points de réussite, et le mental les
     rend — ou les aggrave quand il est bas. C'est le seul endroit où il agit sur
     le terrain, et l'écran le dit avant le clic. */
  const pression = f.chaud ? .12 * (1 - clamp(encaisse(), -.6, 1)) : 0;
  /* CERTAINES OPTIONS SONT RÉCOMPENSÉES PAR UNE SÉANCE PRÉCISE (le propriétaire,
     29/09/2026, sur le penalty du gardien : « on garde la lecture contre le
     réflexe »). Lire sa course est payé par ta séance de poste, tenir jusqu'au
     bout par ton mental : deux options, deux entraînements. */
  const aide = o.aide ? ((S.moi.base[o.aide] + S.moi.boost[o.aide]) - 50) * .006 : 0;
  const gk = f.gk && f.gk[i] && S.moi.poste === 'G' ? f.gk[i] : null;
  const bonus = (f.axe === 'tech' ? (techV - 50) * .009
      : (axeV - 50) * .006 + (techV - 50) * .005)
    + aide + (gk && gk.p ? gk.p : 0)
    /* 3/5 : l'analyste vidéo. Il ne change pas ce que tu vaux, il change ce que tu
       reconnais — donc la réussite d'un fait, et rien d'autre. */
    + (aAchat('video') ? .06 : 0)
    + (S.etats.fraicheur - 80) * .001 - pression;
  const reussi = Math.random() < clamp(o.p + bonus, .05, .95);
  const r = reussi ? o.ok : o.ko;
  /* « Tu sors à l'heure de jeu » et « tu joues les quatre-vingt-dix » étaient des
     phrases : le compteur de minutes du mercredi, tiré avant le fait, disait souvent
     l'inverse. L'issue l'écrit maintenant, donc la note et la fraîcheur suivent. */
  if (r.mins != null && m.comp && m.minutes) m.minutes = Math.max(f.min, Math.min(90, r.mins));
  f.choix = o.l; f.reussi = reussi; f.txt = r.t;
  f.choixMoi = i === 0;
  /* TES FAITS DE MATCH N'ÉTAIENT COMPTÉS NULLE PART (le propriétaire, 02/10/2026 :
     « pourquoi mon fait de match n'est pas comptabilisé dans résultat et dans mes
     stat »). Le but d'un penalty entrait bien dans le score et dans tes buts, mais le
     fait lui-même ne laissait aucune trace chiffrée : ni dans la saison, ni dans la
     carrière. C'est pourtant la décision du jeu. */
  S.stats.faits = (S.stats.faits || 0) + 1;
  if (reussi) S.stats.faitsOk = (S.stats.faitsOk || 0) + 1;
  /* Et quand ça casse dans un moment chaud, on sort du match. Ça porte un nom,
     ça s'écrit dans le film, et ça coûte. Le mental décide si ça arrive. */
  if (!reussi && f.chaud && !m.perduLeFil && Math.random() < .5 - encaisse() * .42){
    m.perduLeFil = f.min;
    jrn('moment', `${f.min}ᵉ — Tu as perdu le fil. ${90 - f.min >= 20 ? "Vingt minutes à côté de la partie." : "Tu finis le match à côté de la partie."}`);
    coutMental(2, "tu es sorti du match après cette action");
  }
  if (reussi && f.chaud) f.tenu = true;
  // ce que l'issue écrit dans le match : score, film, pastilles
  if (r.ev) ecrireFait(m, f, r.ev);
  // ce qu'elle vaut sur ta note : zéro quand l'événement la paie déjà
  if (r.n) (m.noteFaits = m.noteFaits || []).push(r.n);
  // et le deuxième effet, fusionné avec la variante gardien quand il y en a une
  const eff = { ...(r.e || {}), ...((gk && (reussi ? gk.ok : gk.ko)) || {}) };
  effetFait(eff, `« ${o.l} », à la ${f.min}ᵉ`);
  if (f.blesse){
    S.etats.blessure = ri(2, 5);
    m.blessure = { n:S.etats.blessure, pourquoi:"Cette cuisse que tu as voulu tenir" };
    // on ne finit pas un match sur une cuisse qui a lâché : le staff te sort
    sortirDuMatch(m, f.min);
  }
  jrn('moment', `${f.min}ᵉ — ${f.q} → ${o.l} : ${r.t}`);
  S.momentIdx++;
  if (S.faitAnnexe){
    const { info, m: ma } = S.faitAnnexe; S.faitAnnexe = null; S.match = null;
    S.annexe = finirAnnexe(info, ma);
    return apresSemaine();
  }
  suiteMatch();
}
/* CE QUE LES FAITS PÈSENT SUR LA NOTE. Le forfait de ±0,95 par fait est remplacé par
   la valeur propre de chaque issue — arrêter un penalty ne vaut pas la même chose que
   pousser un ailier vers l'extérieur. Le rendement décroissant du propriétaire reste :
   « le premier fait vaut un point, le deuxième 0,75, le troisième 0,5 ». */
/* TON PROPRE CARTON NE TE COÛTAIT RIEN (asymétrie trouvée le 29/09/2026 en
   relisant les deux formules) : `notesEquipe()` retire .25 par jaune et 1.3 sur
   un rouge à un coéquipier, et ta note ne regardait pas les tiens. Le propriétaire
   avait pourtant nommé exactement ce canal : « chaque fait de match doit avoir un
   impact sur la note, que ce soit à travers la conséquence — exemple un but, un
   carton jaune, une suspension ». Même barème que pour les autres. */
/* L'ÉCHELLE DES FAITS. Chaque issue porte sa propre valeur de note, posée cas par
   cas avec le propriétaire (« la note paie ce que l'action a évité ») : un penalty
   sauvé vaut 1,2, une action mineure évitée 0,4. Ces valeurs disent le **rapport**
   entre deux actions, pas des points de note absolus — et à l'échelle 1, mesuré sur
   13 600 notes de trente carrières entières, elles rendaient un tiers de ce que
   rendait l'ancien forfait de 0,95 par fait : les matchs sous 5,0 tombaient de
   5,8 % à 3,0 % et les 9,0 et plus de 7,4 % à 2,9 %, c'est-à-dire exactement le
   relief qu'il avait demandé le 27/09 (« des soirs de gala et des soirs qu'on veut
   oublier »). Un seul coefficient commun préserve tous ses arbitrages relatifs et
   rend le relief. Un seul nombre à bouger. */
const ECHELLE_FAIT = 1.8;
/* UNE DÉFAITE LOURDE EST UN SOIR QU'ON VEUT OUBLIER, POUR TOUT LE MONDE (le
   propriétaire, 29/09/2026 : « les matchs en dessous de 5,0 c'est très peu, trop
   peu »). Mesuré sur 8 700 de tes notes avant d'y toucher : tu **gagnes 61 % de tes
   matchs** (un joueur de carrière finit dans un bon club), et le seul terme négatif
   du barème était un forfait de −0,4 sur une défaite, quel que soit le score. Une
   défaite **4-0** te laissait donc une médiane de 6,1 et seulement 18 % de notes
   sous 5,0 — et pour un milieu ou un attaquant, les buts encaissés ne comptaient
   pas du tout. Désormais l'écart au score pèse (−0,38 par but au-delà du premier,
   borné à −1,1), et une équipe qui prend quatre buts le paie **à tous les postes**.
   C'est le contrepoids qui manquait aux buts, aux passes et au clean sheet. */
/* ET IL VAUT CE QU'IL A COÛTÉ. Mesuré par tranche de carrière, 9 000 de tes notes :
   en saisons 1 à 3 tu gagnes **41 %** de tes matchs et 15 % de tes notes sont sous
   5,0 — exactement le relief validé le 27/09 ; au sommet (saisons 4 à 14) tu gagnes
   **69 %**, et alors **42 % de tes matchs passent au-dessus de 7,5** pour 4 % sous
   5,0. Ce n'est pas que les mauvais soirs manquent, c'est que les grands soirs sont
   devenus ordinaires — le même argument qu'il faisait lui-même sur le 10. La cause
   est que gagner et garder sa cage inviolée payaient **le même prix contre n'importe
   qui**. Un clean sheet dans une équipe qui domine son championnat est un dimanche
   de travail ; le même contre plus fort que soi est une performance. `duelResultat()`
   fait donc suivre la récompense à la difficulté (0,55 quand on écrase, 1,3 quand on
   va chez plus fort), et **seulement la récompense** : une défaite lourde coûte son
   prix plein quel que soit l'adversaire. */
/* ON PEUT ÊTRE MAUVAIS UN SOIR OÙ L'ÉQUIPE GAGNE (le propriétaire, 29/09/2026,
   en montrant la ligne du milieu de carrière : « 3 % »). Mesuré au sommet d'une
   carrière : tes notes sous 5,0 venaient **presque uniquement des défaites**
   (18,8 % d'entre elles) — et comme on gagne alors 65 % de ses matchs, une victoire
   n'en donnait que **2,0 %**. Autrement dit, quand l'équipe gagnait, tu ne pouvais
   pas passer à côté de ton match.
   La cause : **ton état n'entrait quasiment pas dans ta note**. Ta forme se promène
   entre 59 et 100 et ta réserve mentale entre 24 et 76, et les deux ne passaient que
   par `(niveauJour − force) × .035`, soit **moins d'un dixième de note d'un extrême
   à l'autre**. Contre la règle du projet : un chiffre affiché doit avoir une
   conséquence visible.
   Deux termes, tous deux personnels, tous deux liés à une décision — et aucun des
   deux ne récompense le repos, pour ne pas renforcer « lever le pied » :
   - **la forme** : une mauvaise série se paie le samedi suivant (±0,5) ;
   - **la tête** : « quand ça se tend, tu joues petit » n'était qu'une phrase.
     L'écart à ton pic coûte jusqu'à 0,8, et une réserve pleine rend 0,15. C'est ce
     qui donne enfin à la séance mentale un effet qu'on lit dans la note. */
function poidsEtat(){
  /* L'ÉCART À TA PROPRE NORMALE, PAS UNE BARRE ABSOLUE. Première version centrée sur
     une valeur fixe (78) : elle punissait deux fois ceux qui n'y peuvent rien — un
     débutant a une forme basse **en permanence** et une tête chroniquement entamée.
     Mesuré, il tombait à **5,0 de moyenne et perdait cinq matchs** par saison, la
     spirale exacte que le propriétaire avait déjà fait fermer (« ne pas jouer était
     une impasse »). `S.formeRef` est une moyenne lissée de ta propre forme, comme
     `S.ligneRef` l'est pour ton entente : un jeune régulièrement moyen vaut zéro,
     et c'est **le creux** qui se paie, à tout âge. */
  const ref = S.formeRef == null ? S.etats.forme : S.formeRef;
  const forme = clamp((S.etats.forme - ref) * .048, -.75, .75);
  const manque = Math.max(0, S.moi.pic.ment - S.moi.base.ment);
  const tete = manque <= 3 ? .1 : -Math.min(.35, (manque - 3) * .025);
  return forme + tete;
}
function duelResultat(ecart){ return clamp(1 - (ecart || 0) * .045, .55, 1.3); }
function poidsResultat(res, bn, be, derriere, ecart){
  const d = duelResultat(ecart);
  let v = res === 'V' ? .5 * d : res === 'D' ? -.4 - Math.min(1.1, Math.max(0, be - bn - 1) * .38) : 0;
  // les buts encaissés étaient l'affaire des seuls postes de derrière
  if (!derriere && be >= 4) v -= .45;
  return v;
}
function poidsCartons(m){
  const j = (m.evs || []).filter(e => e.type === 'jaune' && e.moi).length + (m.jaune || 0);
  const r = (m.evs || []).some(e => e.type === 'rouge' && e.moi);
  return -j * .25 - (r ? 1.3 : 0);
}
function poidsFaits(m){
  const l = (m.noteFaits || []);
  const p = l.filter(x => x > 0).sort((a, b) => b - a);
  const n = l.filter(x => x < 0).sort((a, b) => a - b);
  const somme = t => t.reduce((a, v, k) => a + v * (POIDS_FAIT[k] == null ? .25 : POIDS_FAIT[k]), 0);
  return (somme(p) + somme(n)) * ECHELLE_FAIT;
}

/* LA PART DE CHANCE D'UNE NOTE, ET POURQUOI ELLE N'EST PLUS AMORTIE (29/09/2026).
   Elle l'était par le mental — la malchance seule, jamais la chance — ce qui donnait
   à un joueur au mental entraîné un **biais vers le haut d'environ deux dixièmes
   que rien à l'écran ne nommait**. Le propriétaire avait déjà tranché le principe le
   27/09 en redéfinissant le mental : « ma définition amortissait un aléa
   (`aleaNote()`) que le joueur ne voit jamais » — le mental se paie depuis par
   `coutMental()`, sur des événements qui ont un nom. L'amorti restait en place :
   c'était compter le mental deux fois, et par le bout invisible. Le tirage est
   désormais symétrique, et de la même amplitude que celui de tes coéquipiers
   (±0,95 chez eux, ±0,85 chez toi, qui as déjà tes faits de match pour faire
   l'écart). */
function aleaNote(){ return rnd(-.85, .85); }
/* LE HAUT D'UNE NOTE SE COMPRIME, ET C'EST L'ENTRE-DEUX QU'IL DEMANDAIT (le
   propriétaire, 02/10/2026, après le lot des quatre buts : « il faut trouver un
   [milieu] entre 2 » — entre un quadruplé à 8,7 avec 1,9 % de notes à 9,5 et plus,
   et un quadruplé à 9,4 avec 4,8 %).
   **Le levier n'est pas celui que j'avais annoncé.** J'avais dit que c'était la
   queue de `POIDS_BUT` (le troisième et le quatrième but) ; mesuré sur 45 carrières
   entières par ligne, c'est faux : resserrer la queue à `[1,.6,.4,.25]` reprend le
   quadruplé (9,36 → 9,18) et **ne descend les 9,5+ que de 4,2 % à 3,3 %**. Normal :
   une soirée à trois ou quatre buts est rare, donc sa queue ne pèse presque rien
   dans la distribution — les 9,5 se fabriquent sur des soirées à **un ou deux**
   buts, quand tous les termes positifs tombent du même côté.
   Donc on ne touche pas à ce qu'un but vaut : on comprime **le haut de la somme**,
   ce qui est son propre principe du 27/09 (le rendement décroissant) appliqué au
   total au lieu de chaque table. Au-dessus de `SEUIL_HAUT`, un dixième de plus n'en
   vaut plus que `PENTE_HAUT`. Mesuré : le quadruplé garde **9,21**, les 9,5+
   retombent à **1,7 %** (le niveau d'avant le lot) et **un 10 passe de 2,1 % à
   0,3 %** — plus rare qu'il ne l'a jamais été.
   **Elle s'applique à toute la liste des notes, la tienne et les leurs.** Ne
   comprimer que la tienne rouvrirait exactement l'asymétrie fermée le matin même :
   un coéquipier pourrait monter à 10 là où tu plafonnes à 9,8. Mesuré après : zéro
   coéquipier à 9,5 et plus, et tu restes le meilleur des tiens 73 % des soirs où tu
   marques deux fois (contre 75 % sans compression, 63 % avant le lot). */
const SEUIL_HAUT = 8.6, PENTE_HAUT = .65;
function plafonnerNote(x){
  return clamp(x <= SEUIL_HAUT ? x : SEUIL_HAUT + (x - SEUIL_HAUT) * PENTE_HAUT, 3, 10);
}
/* CE QU'ON COMPARE APRÈS LE MATCH. Les liens, les lignes et la fraîcheur y étaient
   déjà ; les **axes** et le **corps** n'avaient aucun canal vers l'écran, donc un fait
   qui donnait un demi-point de poste ou qui réparait la cuisse ne se voyait nulle
   part — mesuré, 98 effets sur 98 invisibles pour `tech`, `phys`, `spec` et `corps`. */
function photoAvantMatch(){
  /* On photographie la **base** et non `base + boost` : le boost se divise par deux à
     chaque match par construction, donc le comparer ferait sortir « ton poste t'en a
     pris un peu » à **chaque** match, fait ou pas — vu à l'écran sur trois matchs de
     suite. La base est la trace, et c'est elle qu'un fait déplace (`bougerAxe`). */
  return { liens: { ...S.liens }, lignes: { ...S.lignes },
    fraicheur: S.etats.fraicheur, corps: S.etats.corps, axes: { ...S.moi.base } };
}
function moyenneNotes(){ const n = S.stats.notes; return n.length ? n.reduce((a, b) => a + b, 0) / n.length : 6; }
function finirMatch(){
  const m = S.match, res = m.bn > m.be ? 'V' : m.bn < m.be ? 'D' : 'N';
  /* Une sauvegarde v15 prise en plein match n'a pas de photo : on retombe alors sur
     l'ancien comportement (l'état du moment) plutôt que de planter. */
  const av = m.av || photoAvantMatch();
  const g0 = av.liens, l0 = av.lignes;
  m.semaine = S.semaine; m.seance = S.seance;
  if (m.minutes){
    const derriere = S.moi.poste === 'G' || S.moi.poste === 'D';
    const duel = duelResultat(m.ecartForce);
    m.note = plafonnerNote(6.1 + poidsResultat(res, m.bn, m.be, derriere, m.ecartForce)
      + cumul(m.buts, POIDS_BUT) + m.passes * PASSE_NOTE
      + (derriere ? (m.be === 0 ? 1 * duel : m.be === 1 ? .35 * duel : m.be >= 4 ? -.7 : 0) : 0)
      /* Un fait de match pèse **un point de note**, pas trois dixièmes (demande du
         propriétaire, 27/09/2026 : « on fait quasiment que des matchs corrects, il
         n'y a pas de très bons ni de très mauvais matchs ; on peut appuyer un peu
         plus sur l'impact des faits de match sur la note, avec un point en plus ou
         en moins »). C'est ce qui fait qu'une saison a des soirs de gala et des
         soirs qu'on veut oublier. */
      + (niveauJour() - S.club.force) * .035 + poidsEtat()
      + poidsFaits(m) + poidsCartons(m)
      - (m.perduLeFil ? .7 : 0) + (m.moments.some(f => f.tenu) ? .35 : 0) + aleaNote());
    m.note = Math.round(m.note * 10) / 10;
    S.sansJouer = 0;
    S.stats.matchs++; S.stats.minutes += m.minutes; S.stats.buts += m.buts; S.stats.passes += m.passes;
    S.stats.notes.push(m.note); if (m.statut === 'titulaire') S.stats.titus++;
    /* Entrer en jeu coûte moins que commencer : on arrive frais, sur une demi-heure.
       Depuis que tu entres 71 % des fois où tu es sur le banc, le total de minutes
       a bondi et la fraîcheur s'effondrait — « lever le pied » redevenait la
       meilleure politique partout, ce qui tue le choix de la semaine. */
    S.etats.fraicheur = clampFr(S.etats.fraicheur
      - (m.minutes / 90) * ri(10, 16) * (m.entree ? .7 : 1) * chargePhys());
    /* L'USURE S'ACCUMULE, ET ELLE COÛTE PLUS CHER QUAND ON FINIT SUR LES JAMBES. */
    S.etats.corps = clamp(S.etats.corps - (m.minutes / 90) * .4 * (S.etats.fraicheur < 55 ? 1.6 : 1), 0, 100);
    let dCoach = clamp((m.note - 6.2) * 2.4, -4, 4);
    if (dCoach < 0){
      const amorti = encaisse() * .5;
      if (amorti > .15) m.amortiCoach = true;              // à dire, sinon ça n'existe pas
      dCoach *= (1 - amorti);
    }
    S.liens.coach = clamp(S.liens.coach + dCoach);
    // ta ligne te juge sur ta note : c'est avec eux que tu viens de jouer
    bougerLigne(LIGNE_DU_POSTE[S.moi.poste], m.note >= 7 ? 1.4 : m.note < 5.5 ? -1.2 : 0);
    /* LE STADE OUBLIE (29/09/2026). Cette ligne n'a jamais fait que monter — pas de
       rappel, pas d'oubli — et personne ne s'en apercevait puisque rien ne lisait la
       jauge. Mesuré avant de la brancher, 20 carrières entières : **médiane 100**,
       donc l'avantage du terrain qu'on vient de lui donner aurait été une constante
       de +1,20, c'est-à-dire pas une décision. Un public s'entretient : il revient
       de 2 % par journée vers ce qu'il donne à n'importe qui, et ce que tu fais
       samedi l'en écarte. */
    S.liens.supporters = clamp(S.liens.supporters * .95 + 46 * .05
      + (m.buts ? 1.5 : 0) + (m.passes ? .7 : 0) + (m.note >= 7.5 ? 1.2 : 0) - (m.note < 5.4 ? 1.4 : 0));
    S.etats.forme = clamp(S.etats.forme + (m.note >= 7 ? 5 : m.note >= 6 ? 1 : -4));
    /* Le propriétaire : « un joueur qui sort, il peut en vouloir au coach. »
       Pour toi ça se paie en tête et en confiance du coach, pas en rancune. */
    if (m.sorti && m.sorti < 62){
      coutMental(1.2, `cette sortie à la ${m.sorti}e minute`);
      S.liens.coach = clamp(S.liens.coach - 1);
    }
    /* LE BRASSARD SE PAIE LES MAUVAIS SOIRS. C'est tout ce qu'il coûte, et c'est
       assez : on accepte de porter le poids du groupe, donc un match raté pèse
       double. */
    if (m.note < 5.6) coutMental((S.brassard > 0 ? 3.4 : 1.7),
      S.brassard > 0 ? "ce match raté avec le brassard" : "un match que tu voudrais oublier");
    if (m.rouge) coutMental(2.2, "ce carton rouge");
    /* UNE BLESSURE A UNE CAUSE, ET ELLE SE DIT (le propriétaire, 27/09/2026 :
       « je trouve que je me blesse sans explication »). Le tirage en avait déjà
       trois — le physique qu'on s'est construit, les ischios quand c'est ton défaut,
       les jambes vides — mais l'écran n'en disait aucune : on sortait touché sans
       savoir pourquoi, donc sans rien pouvoir y faire. On garde la raison qui pesait
       le plus lourd dans le tirage, et on l'écrit. */
    const risqueBase = Math.max(.012, .05 - (physique() - 50) * .0009)
      + Math.max(0, 88 - S.etats.corps) * .0008;
    const risqueIschios = S.moi.def.id === 'ischios' ? .04 : 0;
    /* Une semaine sur cinq à l'infirmerie, c'était déjà le cas avant l'usure du corps
       (mesuré : 11 à 20 % des semaines selon l'âge). Le corps usé ajoutant sa part,
       on rend un peu de ce que coûtent les jambes vides — sinon la correction se
       paie en blessures qu'on n'a pas demandées. */
    const risqueVide = S.etats.fraicheur < 60 ? .035 : 0;
    /* ET LA DETTE SE PAIE. En dessous de zéro on ne récupère plus entre deux matchs :
       chaque journée de plus creuse le trou, et c'est là que le corps lâche. C'est le
       cas nommé par le propriétaire — ne travailler que le physique **et** enchaîner
       les matchs — et c'est la seule porte de sortie du cercle, puisque l'infirmerie
       rend enfin le temps de remonter. */
    const risqueDette = Math.max(0, -S.etats.fraicheur) * .0045;
    /* CE QUE LA BOUTIQUE CHANGE, 1/5 : un kiné à toi voit venir ce qui casse, et le
       soin de la trêve d'hiver tient jusqu'en juin. Les deux se multiplient au tirage
       entier, pas à un seul de ses termes : ce qu'on achète, c'est le risque. */
    const soin = (aAchat('kine') ? .66 : 1) * (S.treveSoin ? .85 : 1);
    if (Math.random() < (risqueBase + risqueIschios + risqueVide + risqueDette) * soin){
      m.blessure = ri(1, 5);
      S.etats.corps = clamp(S.etats.corps - 1.5, 0, 100);
      m.pourquoi = risqueDette >= Math.max(risqueBase, risqueIschios, risqueVide)
          ? "Tu joues sur la réserve depuis des semaines. Ça devait arriver."
        : risqueVide >= Math.max(risqueBase, risqueIschios)
          ? "Tu as fini le match sur les jambes, et le corps a lâché là où il lâche toujours."
        : risqueIschios >= risqueBase
          ? "Encore cette gêne derrière la cuisse. Tu la connais par cœur."
        : physique() < 42
          ? "Tu n'as pas le corps pour encaisser ces rythmes-là. Ça finit par se payer."
        : "Un appui qui part de travers, personne autour. Ça arrive.";
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
    /* Et il te protège quand la saison tourne mal : le plancher de la confiance du
       coach — ce qui avait fermé la spirale du banc — monte avec la confiance du
       club. Un club qui tient à toi le dit au coach ; un club qui t'a oublié le
       laisse t'enterrer. De 36 à 50 au lieu d'un 42 fixe. */
    const sol = 36 + (S.liens.club - 50) * .28;
    if (S.liens.coach > sol) S.liens.coach = clamp(S.liens.coach - (m.statut === 'banc' ? .5 : .2));
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
  if (S.etats.fraicheur - av.fraicheur <= -8) m.mvt.push({ k:'fraicheur', up:false, mot:direJambes() });
  /* Les axes et le corps, enfin dits. Le seuil est plus bas que celui des jauges
     parce qu'un fait de match donne volontairement peu sur un axe, et il peut l'être
     sans risque : entre le coup d'envoi et la fin, **seuls les faits** touchent la
     technique, le physique et le poste (la séance, elle, est d'avant la photo), donc
     il n'y a aucun bruit à filtrer. Le mental garde .4 : il se mélange à ce que la
     soirée coûte (`coutMental`), et un net proche de zéro ne doit pas s'annoncer comme
     un gain. Mesuré : les invisibles passent de **52 % à 22 %**, et le reste n'est pas
     un défaut d'affichage — c'est un effet qui n'a réellement rien fait : un axe déjà
     à son plafond (`bougerAxe` ne monte plus), une jauge à 100, ou un net annulé par
     le match lui-même (un fait qui donne +0,4 de mental dans une soirée qui en coûte
     1,7 n'a pas à s'annoncer comme un gain). */
  AXES.forEach(a => { const d = S.moi.base[a] - av.axes[a];
    /* Le mental n'entre ici **qu'en gain** : ce qu'il perd est déjà écrit juste en
       dessous avec sa raison (« Tu rumines : … »), et deux lignes pour la même chose
       se lisent comme un doublon — vu à l'écran sur un penalty manqué. */
    if (a === 'ment' && d < 0) return;
    if (Math.abs(d) >= (a === 'ment' ? .4 : .25)) m.mvt.push({ k:a, up: d > 0, mot: `${axeNom(a)} — ${d > 0
      ? "ce que tu viens de faire reste." : "ce match t'en a pris un peu."}` }); });
  if (Math.abs(S.etats.corps - av.corps) >= 1.5)
    m.mvt.push({ k:'corps', up: S.etats.corps > av.corps, mot: direCorps() });
  /* LES PROMESSES SE RÈGLENT ICI, et pas dans `apresMatch()` où je les avais mises
     d'abord : `m.mvt` est ce que l'écran de résultat affiche, or `apresMatch()`
     tourne **après** cet écran. Le joueur n'aurait donc jamais vu une promesse se
     tenir ou se retourner contre lui — une conséquence invisible n'existe pas. */
  reglerPromesses(m);
  if (m.blessure) m.mvt.push({ k:'blessure', up:false,
    mot:`${m.pourquoi || ''} ${m.blessure} journée${m.blessure > 1 ? 's' : ''} d'absence.`.trim() });
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
  /* LA MÊME SOIRÉE SE JUGE SUR UNE SEULE ÉCHELLE. `duelResultat()` fait suivre la
     récompense à la difficulté depuis le 29/09 — mais il n'était appliqué qu'à
     **ta** note. Dans une victoire 5-0 chez plus faible, ton résultat payait donc
     0,28 et le leur 0,55, et le clean sheet d'un défenseur 0,55 pour toi contre
     0,70 pour lui : la liste des notes comparait deux barèmes, et c'est ce qui
     mettait deux défenseurs sans un but au-dessus d'un quadruplé (rapport du
     02/10/2026). La récompense d'un coéquipier est amortie comme la tienne.
     Ce qui n'est pas aligné, et volontairement : **le coût** d'une défaite lourde,
     qui te prend jusqu'à 1,1 point quand il leur en prend 0,45. Ta note est plus
     exposée que la leur, c'est la demande du 29/09 (« on peut être mauvais un soir
     où l'équipe gagne ») et ça ne se touche pas. */
  const duelE = duelResultat(m.ecartForce);
  const bonus = m.res === 'V' ? .55 * duelE : m.res === 'D' ? -.45 : 0;
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
  const compte = (nom, k) => { if (!nom) return; faits[nom] = faits[nom] || { b:0, p:0, j:0, r:0, pm:0 }; faits[nom][k]++; };
  (m.evs || []).filter(e => e.nous).forEach(e => {
    if (e.type === 'but'){ compte(e.qui, 'b'); compte(e.passe, 'p'); }
    if (e.type === 'jaune') compte(e.qui, 'j');
    if (e.type === 'rouge') compte(e.qui, 'r');
    // un penalty manqué par un des tiens se lit à côté de sa note, comme le tien
    if (e.type === 'penratee' && !e.moi) compte(e.qui, 'pm');
  });
  const noter = (x, minutes) => {
    if (x.moi || !x.ref) return;
    const derriere = x.poste === 'G' || x.poste === 'D';
    /* Moins de minutes, moins d'écart : un joueur entré à la 80ᵉ ne fait ni un 10
       ni un 3, sa note colle à la moyenne. C'est aussi ce qui fait que la note
       d'un remplaçant ne pèse pas comme celle d'un titulaire. */
    const a = minutes >= 70 ? 1 : minutes >= 30 ? .72 : .45;
    const f = faits[x.nom] || { b:0, p:0, j:0, r:0, pm:0 };
    const n = 6.1 + (bonus + (x.niv - S.club.force) * .05 + rnd(-.95, .95)
      + (derriere ? (m.be === 0 ? .7 * duelE : m.be >= 4 ? -.7 : 0) : 0)) * a
      + cumul(f.b, POIDS_BUT_AUTRE) + f.p * PASSE_NOTE_AUTRE - f.j * .25 - f.r * 1.3 - (f.pm || 0) * 1.1;
    x.ref.note = Math.round(plafonnerNote(n) * 10) / 10;
    x.ref.sum = (x.ref.sum || 0) + x.ref.note; x.ref.nb = (x.ref.nb || 0) + 1;
    // une bonne note, c'est une place la semaine prochaine
    bougerForme(x.ref, (x.ref.note - 6.1) * .9 * a);
    /* CE QU'ILS ONT FAIT SE LIT À CÔTÉ DE LEUR NOTE (le propriétaire, 27/09/2026 :
       « sur les notes des joueurs, ceux qui ont marqué un but, ceux qui ont fait
       une passe décisive, ceux qui ont pris des cartons, ceux qui se sont blessés,
       comme on avait fait avant »). Les mêmes faits que ceux qui nourrissent la
       note, donc le film et la note ne peuvent pas se contredire. */
    joueurs.push({ nom:x.nom, poste:x.poste, note:x.ref.note, rival: !!x.rival, min: minutes,
      f: { b:f.b, p:f.p, j:f.j, r:f.r, pm:f.pm || 0, bl: blesses.has(x.nom) ? 1 : 0 } });
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
      /* « Un petit icône pour chaque, c'est sympa. » Le penalty arrêté, le but
         sauvé et le penalty manqué n'avaient aucune trace : ils en ont une. */
      f: { b:m.buts || 0, p:m.passes || 0, j:mien.j, r:mien.r, bl:m.blessure ? 1 : 0,
        ar:m.arrets || 0, sv:m.sauves || 0,
        pm:m.evs.filter(e => e.type === 'penratee' && e.moi).length } });
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
  if (S.mode !== 'coach'){
    S.concurrents.forEach(c => l.push({ nom:c.nom, poste:S.moi.poste, age:c.age, nb:c.nb || 0,
      moy: moyDe(c), res: moyReserve(c), nbR: c.nbR || 0,
      cle: LIGNE_DU_POSTE[S.moi.poste], rival:true, blesse: c.blesse > 0 }));
    l.push({ nom:S.moi.nom, poste:S.moi.poste, age:S.moi.age, nb:S.stats.notes.length,
      cle: LIGNE_DU_POSTE[S.moi.poste],
      moy: S.stats.notes.length ? moyenneNotes() : null, moi:true });
  }
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
/* UNE PHRASE QU'ON PEUT AVOIR À TENIR (30/09/2026). Les arrêts pouvaient déjà
   coûter tout de suite ; il leur manquait la conséquence **différée** — promettre
   un résultat à un journaliste, faire venir son père au stade. Chaque promesse se
   règle après le match suivant, une seule fois, et elle passe par `m.mvt` pour que
   le joueur lise pourquoi ça vient de lui tomber dessus. */
function reglerPromesses(m){
  const reste = [];
  (S.promesses || []).forEach(pr => {
    if (pr.k === 'resultat'){
      if (m.res === 'D'){ coutMental(2.5, "ce résultat que tu avais promis");
        S.liens.supporters = clamp(S.liens.supporters - 7);
        m.mvt.push({ k:'promesse', up:false, mot:"Tu avais promis un résultat au micro. Le stade s'en souvient." }); }
      else m.mvt.push({ k:'promesse', up:true, mot:"Tu avais promis un résultat. Tu l'as tenu." });
    } else if (pr.k === 'pere'){
      if (m.minutes && m.note < 5.5){ coutMental(2.5, "ce match-là, devant ton père");
        m.mvt.push({ k:'promesse', up:false, mot:"Il était dans les tribunes pour la première fois. Tu n'as pas fait le match qu'il fallait." }); }
      else m.mvt.push({ k:'promesse', up:true, mot:"Il était là, et il t'a vu jouer." });
    } else if (pr.k === 'rechute'){
      if (Math.random() < .4){ S.etats.blessure = ri(3, 7);
        m.blessure = S.etats.blessure; coutMental(2.2, "cette rechute que tu avais cherchée");
        m.pourquoi = "Tu es revenu trop tôt, et c'est reparti au même endroit. Plus longtemps, cette fois.";
        m.mvt.push({ k:'promesse', up:false, mot:"La rechute. Tu savais que c'était possible." }); }
      else m.mvt.push({ k:'promesse', up:true, mot:"Tu as joué sur une jambe et demie, et ça a tenu." });
    }
  });
  S.promesses = reste;
}
function apresMatch(){
  const d = S.dernier;
  // les journées où tu portes le brassard s'écoulent, et la reprise se périme
  if (S.brassard > 0) S.brassard--;
  if (S.reprise > 0) S.reprise--;
  S.eqJour = null;                 // le groupe de samedi ne vaut que pour samedi
  vivreConcurrents(); vivreEquipe();
  S.equipe.forEach(j => { if (j.monte) j.niv = Math.min(j.niv + .35, S.club.force + 12); });
  /* Une entente qui ne bouge pas n'existe pas — mais elle ne doit pas s'échapper
     non plus : un rappel de 1 % vers 50 tient l'écart-type autour de sept points,
     assez pour que les arrêts et le match pèsent plus que le hasard. */
  LIGNES.forEach(k => S.lignes[k] = clamp(S.lignes[k] * .99 + .5 + rnd(-1.8, 1.8)));
  /* LES TIENS S'ÉLOIGNENT TOUT SEULS (le propriétaire, 01/10/2026, en demandant
     pourquoi son ambition « rester près des miens » ne lui reprochait jamais rien).
     Mesuré avant d'y toucher, 28 carrières entières : **médiane 100**, et **64 % des
     semaines à 100 même en ne faisant jamais rien pour eux** — l'usure annuelle de
     2,2 ne pesait rien face aux +16 d'un été et aux +22 d'une maison. Donc ni
     l'ambition ne pouvait rien lire, ni la récupération mentale qu'ils pilotent
     (+0,12 contre +0,3) ne variait jamais. C'est exactement le défaut des supporters,
     réglé le 29/09 de la même façon : **un rappel**. « Le football les éloigne tout
     seul » était écrit depuis le 27/09 ; maintenant c'est vrai, et les garder devient
     l'arbitrage qu'on avait promis. Le plancher du premier gros salaire tient
     toujours en dessous. */
  if (S.vie) bougerProches((cibleProches() - S.vie.proches) * RAPPEL_PROCHES);
  S.ligneRef = S.ligneRef || { ...S.lignes };
  LIGNES.forEach(k => S.ligneRef[k] = S.ligneRef[k] * .82 + S.lignes[k] * .18);
  // ta forme de référence : ce que tu vaux d'habitude, pour que la note lise le creux
  S.formeRef = S.formeRef == null ? S.etats.forme : S.formeRef * .85 + S.etats.forme * .15;
  /* LA SORTIE D'INFIRMERIE OUVRE UNE FENÊTRE DE DEUX SEMAINES : c'est là que le
     coach peut te demander de jouer avant l'heure, et c'est là que la famille
     `retour` se déclenche. */
  if (S.etats.blessure > 0){ S.etats.blessure--; if (!S.etats.blessure) S.reprise = 2; }
  if (S.etats.suspension > 0) S.etats.suspension--;
  if (d && d.blessure) S.etats.blessure = d.blessure;
  if (d && d.suspendu) S.etats.suspension = d.suspendu;
  /* Une semaine passe, on digère : le temps répare une part de ce qu'on a pris,
     jamais au-delà de ce qu'on avait. Sans ça, seule la séance mentale répare et
     elle devient obligatoire — mesuré, elle écrasait toutes les autres. */
  /* Ce que les tiens changent, et c'est leur seul effet : avec du monde derrière
     toi, un mauvais samedi se répare dans la semaine ; sans personne, il s'installe. */
  /* UNE BORNE ARRIVE AVEC LA PORTE (29/09/2026). Maintenant que les arrêts peuvent
     faire bouger les tiens, la récupération naturelle s'arrête **un cran sous ton
     pic**, jamais au pic : les tiens te sortent du trou, le dernier cran ne
     s'achète qu'à l'entraînement mental. Sans cette borne, s'occuper des siens
     remplaçait la séance mentale — ce que le propriétaire avait vu venir tout seul
     (« si je fais que m'occuper de ma famille, ça va arrêter mon mental
     suffisamment pour pas avoir à entraîner le mental »). */
  const repare = .12 + (proches() - 50) * .006;
  const plafondTete = S.moi.pic.ment - BORNE_TETE;
  if (repare > 0 && S.moi.base.ment < plafondTete - .2)
    bougerAxe('ment', Math.min(repare, plafondTete - S.moi.base.ment));
  // le corps revient vers ce que l'âge permet : c'est ça qui empêche la spirale
  // la piqûre a un prix, et c'est celui-là : le corps ne remonte plus cette saison
  if (!S.piqure) S.etats.corps = clamp(S.etats.corps + (cibleCorps() - S.etats.corps) * .05, 0, 100);
  /* LE PHYSIQUE REND SA FRAÎCHEUR AU COURS DE L'ANNÉE (le propriétaire, 27/09/2026 :
     « le physique qui consomme beaucoup de fraîcheur, il faut qu'au cours de l'année
     on regagne de la fraîcheur grâce à lui, sur la vitesse de récupération » ;
     30/09/2026 : « il faut que ça joue sur la vitesse de récupération de la
     fraîcheur »). La récupération de base est la même pour tout le monde ; c'est
     `recupPhys()` qui la multiplie, de .62 à 1,5 selon l'axe. À physique 80 on
     récupère une fois et demie plus vite qu'à 50, et deux tiers moins vite à 30.
     C'est la seule contrepartie de la séance la plus chère du jeu, et elle est
     neutre à 50 : qui ne travaille jamais le physique ne voit aucune différence. */
  S.etats.fraicheur = clampFr(S.etats.fraicheur
    + (S.etats.blessure ? 14 : 9.6) * recupPhys()
      * (1 - Math.max(0, 88 - S.etats.corps) * .002));
  S.journee++;
  if (S.journee >= JOURNEES) return finSaison();
  S.arrets = 0; S.semaine = null; S.seance = null; S.match = null;
  /* LA TRÊVE D'HIVER (le propriétaire, 02/10/2026 : « je pensais qu'il y aurait des
     pauses dans les trêves »). Il n'y en avait aucune : trente-quatre journées
     d'affilée, et le seul temps où l'on souffle était en juin. La moitié de saison
     s'arrête donc ici — on lit où on en est, la boutique ouvre, et on décide de ces
     quinze jours. C'est aussi le seul moment de la saison où l'argent sert. */
  if (S.journee === J_TREVE && !S.treveFaite) return ouvrirTreve();
  S.ecran = 'semaine'; sauver(); rendre();
}
const J_TREVE = 17;
/* Quatre façons de passer quinze jours, et aucune n'a le beurre et l'argent du beurre. */
const TREVE = [
  { id:'soleil', ico:'🏝️', nom:"Dix jours au soleil",
    sub:"Tu coupes pour de bon. Personne ne t'appelle, et tu ne regardes pas les résultats.",
    dit:[{c:'foot',t:"🫁 tu repars avec des jambes"},{c:'vie',t:"🧠 la tête se répare"},{c:'risk',t:"🎽 le coach te trouvera en retard"}] },
  { id:'travail', ico:'🎯', nom:"Rester au centre",
    sub:"Les terrains sont vides, les portes sont ouvertes, et tu y es tous les matins.",
    dit:[{c:'foot',t:"📈 ton axe le plus loin de son plafond monte"},{c:'foot',t:"🎽 il voit qui est là"},{c:'risk',t:"🫁 tu ne te reposes pas"},{c:'risk',t:"🏡 les tiens t'attendaient"}] },
  { id:'chez', ico:'🏡', nom:"Rentrer chez toi",
    sub:"Quinze jours là où personne ne parle de football, et où on t'appelle par ton prénom.",
    dit:[{c:'vie',t:"🏡 les tiens, vraiment"},{c:'vie',t:"🧠 tu reviens entier"},{c:'risk',t:"🫁 tu n'as rien travaillé"}] },
  { id:'soigner', ico:'🩹', nom:"Te faire soigner",
    sub:"Ce qui traîne depuis septembre, on s'en occupe maintenant et on serre les dents.",
    dit:[{c:'foot',t:"🩼 le corps se répare"},{c:'foot',t:"🩹 moins de blessures d'ici juin"},{c:'risk',t:"🫁 ce ne sont pas des vacances"}] },
];
function ouvrirTreve(){
  if (!S.vie) S.vie = { proches: 50, chantiers: [], achats: [], gagne: 0 };
  S.treve = { fait: null, suite: null, suiteAchat: null };
  S.ecran = 'treve'; sauver(); rendre();
}
function choisirTreve(id){
  const t = TREVE.find(x => x.id === id); if (!t || (S.treve && S.treve.fait)) return;
  let suite = '';
  if (id === 'soleil'){
    S.etats.fraicheur = clampFr(S.etats.fraicheur + 26);
    if (S.moi.base.ment < S.moi.pic.ment) bougerAxe('ment', Math.min(4, S.moi.pic.ment - S.moi.base.ment));
    S.liens.coach = clamp(S.liens.coach - 5);
    suite = `Tu es rentré noir et reposé. À la reprise, il a regardé ta montre et il n'a rien dit.`;
  } else if (id === 'travail'){
    const a = AXES.slice().sort((x, y) => (plafondReel(y) - S.moi.base[y]) - (plafondReel(x) - S.moi.base[x]))[0];
    bougerAxe(a, 2.4);
    S.liens.coach = clamp(S.liens.coach + 5);
    S.etats.fraicheur = clampFr(S.etats.fraicheur - 6);
    bougerProches(-8);
    suite = `Quinze jours de janvier sur un terrain gelé, presque seul. ${axeNom(a)} y a gagné quelque chose, et il t'a vu.`;
  } else if (id === 'chez'){
    bougerProches(18);
    if (S.moi.base.ment < S.moi.pic.ment) bougerAxe('ment', Math.min(3, S.moi.pic.ment - S.moi.base.ment));
    S.etats.fraicheur = clampFr(S.etats.fraicheur + 8);
    suite = `Quinze jours sans un ballon. Ta mère a fait à manger pour douze, et tu as dormi.`;
  } else {
    S.etats.corps = clamp(S.etats.corps + 11);
    S.treveSoin = true;
    S.etats.fraicheur = clampFr(S.etats.fraicheur + 4);
    suite = `Table de massage, piscine, et une aiguille dans le genou un matin. Ça tient, pour l'instant.`;
  }
  S.treve.fait = { id, nom:t.nom }; S.treve.suite = suite;
  jrn('treve', `Trêve : ${t.nom.toLowerCase()}.`);
  sauver(); rendre();
}
function finirTreve(){
  S.treveFaite = true; S.treve = null;
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
  /* LA DESCENTE SE LIT AU BILAN, PAS À LA REPRISE. C'est la même règle que
     `promotionsRelegations()` appliquera cet été, sur le même classement : l'écran
     ne peut donc pas annoncer autre chose que ce qui arrivera. */
  const N = S.ligue.equipes.length;
  const div = S.division || 1;
  S.bilan = {
    pos, division: div, nbClubs: N,
    descente: div === 1 && pos > N - MONTEES,
    montee: div === 2 && pos <= MONTEES,
    note: note == null ? null : Math.round(note * 100) / 100,
    gagne: bilanGagne(note, pos), perdu: bilanPerdu(note), suite: bilanSuite(pos, note),
    faits: S.stats.faits || 0, faitsOk: S.stats.faitsOk || 0,
  };
  /* L'ordre compte : la place, puis ce que la saison a rapporté, puis le jugement de
     ton ambition — qui lit les deux. Compter l'argent dans `vieillir()` le faisait
     juger sur les chiffres de l'année d'avant. */
  encaisserLaSaison();
  bougerClubEtSelection(note, pos);
  S.bilan.ambition = jugerAmbition();
  jrn('saison', `Saison terminée : ${S.stats.matchs} matchs, ${S.stats.buts} buts${S.bilan.note == null ? '' : `, note ${nb(S.bilan.note)}`}. ${S.club.nom} ${pos}ᵉ de ${nomDivision()}.`);
  if (S.bilan.descente) jrn('division', `${S.club.nom} descend.`);
  if (S.bilan.montee) jrn('division', `${S.club.nom} monte.`);
  S.ecran = 'bilan'; sauver(); rendre();
}
/* CE QUE TA SAISON FAIT À DEUX JAUGES QUI N'AVAIENT AUCUNE VIE (29/09/2026).
   La confiance du club ne bougeait que sur trois familles d'arrêts, donc elle
   restait à 50 des carrières entières — une jauge qu'on rebranche sans la faire
   vivre ne vaut pas mieux qu'une jauge morte. Et la sélection existait à 0 sans
   jamais rien faire ni jamais bouger : c'était la seule du jeu dans ce cas.
   Toutes deux se jugent sur la même chose, et ce n'est pas la même lecture : le
   club regarde ce que tu lui as **donné** (ta présence, ta régularité, ce que
   l'équipe a fait avec toi), le sélectionneur regarde ce que tu **vaux** à ton
   poste dans le pays. Le reste de la sélection — la convocation, les deux matchs
   en pleine semaine, les jambes qu'ils coûtent — est le lot suivant : le
   propriétaire l'a lui-même remis à plus tard (« oui, mais au prochain lot »). */
function bougerClubEtSelection(note, pos){
  const m = S.stats.matchs, n = note == null ? null : note;
  let d = 0;
  d += m >= 28 ? 6 : m >= 18 ? 3 : m >= 8 ? 0 : -7;      // ta présence
  if (n != null) d += n >= 6.8 ? 5 : n >= 6.3 ? 2 : n < 5.9 ? -4 : 0;
  if (S.coupe && S.coupe.gagnee) d += 4;
  if (S.euro && S.euro.gagnee) d += 4;
  if (S.bilan && S.bilan.descente) d -= 3;
  if (S.bilan && S.bilan.montee) d += 3;
  if (S.moi.age >= 34) d -= 3;                            // on pense à la suite
  /* Avec un rappel vers 50 : sans lui, mesuré, une bonne carrière la collait à 100
     dès la sixième saison et « le club te protège » devenait un acquis. Une direction
     se refait une opinion chaque été. */
  S.liens.club = clamp(S.liens.club * .82 + 50 * .18 + d);
  /* La sélection ne s'accumule pas, elle **converge** vers ce que tu vaux cette
     année-là : un sélectionneur ne garde pas un crédit acquis à vingt-deux ans. Son
     étalon est le meilleur club du pays, pas le tien — un très bon joueur d'un club
     moyen est vu. Première version en cumul (+14 par bonne saison, plancher −4) :
     mesuré sur 20 carrières, **médiane 100 au sommet, 16 carrières sur 20 au-dessus
     de 60** — une jauge qui monte toujours ne dit rien. */
  const sommet = Math.max(...toutesLesEquipes().map(e => e.force));
  const ecart = niveau() - sommet;
  let cible = 0;
  if (m >= 15){
    cible = clamp(18 + ecart * 5.2, 0, 100);
    if (n != null) cible += n >= 6.9 ? 14 : n >= 6.5 ? 6 : n < 6 ? -14 : 0;
    if ((S.division || 1) > 1) cible -= 26;               // on ne va pas les chercher en bas
  } else cible = m >= 6 ? 14 : 0;
  if (S.moi.age >= 32) cible -= (S.moi.age - 31) * 11;    // ils regardent devant
  /* ET ON TE VOIT MOINS DE LOIN. Avant Bosman, un sélectionneur ne se déplaçait pas
     pour suivre un expatrié : la cible est fortement amortie. Après, les matchs passent
     à la télévision et l'amorti est léger — mais il reste, parce qu'un championnat
     étranger n'est pas celui que le sélectionneur regarde chaque semaine. */
  /* Calibré : à .5 et .82 la sélection **disparaissait** — zéro sélection de médiane
     pour qui part, contre sept en restant. Taxer un sous-système est une décision, le
     supprimer n'en est pas une. À .68 et .9 on en perd la moitié. */
  if ((S.pays || 'FR') !== 'FR') cible *= S.annee >= 1996 ? .9 : .68;
  cible = clamp(cible, 0, 100);
  S.liens.selection = clamp((S.liens.selection || 0) * .5 + cible * .5);
  if (S.liens.selection >= 60) jrn('selection', `On parle de toi pour la sélection.`);
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
  if (S.bilan && S.bilan.descente) t.push(`Le club descend. Ce qui se passera cet été ne dépend plus de toi.`);
  if (S.bilan && S.bilan.montee) t.push(`Le club monte. L'an prochain, ce sera un autre football.`);
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


/* ================== LA VIE ET L'ARGENT ==================
   Le propriétaire, 21/09/2026 : « une carrière doit laisser une trace. Aujourd'hui
   elle en laisse trop peu : on ne s'attache pas vraiment aux carrières, c'est un peu
   sans effet sauf quand c'est le jackpot. » C'est le problème de fond du jeu, et il
   n'avait jusqu'ici aucun endroit où se résoudre : le hors-football tenait dans
   quatre familles d'arrêts sur dix-sept, l'argent n'existait pas, et l'ambition
   choisie à la création était **stockée sans jamais être lue**.
   Trois pièces, et elles se tiennent :
   - **l'argent** : un salaire qu'on lit avant de signer, des primes, et de quoi
     faire quelque chose ;
   - **les tiens** (`S.vie.proches`) : ce qui reste quand le football s'arrête, et
     qui pendant la carrière décide de ce que ta tête encaisse ;
   - **les chantiers** : ce qu'on construit avec l'argent et qui survit à la carrière.
   Et l'**ambition** devient la règle qui juge tout ça, saison après saison. */

/* Le salaire, en millions de 2015 comme toute la monnaie du jeu ; `money()` (eras.js)
   le rend en francs avant 2002 et à l'échelle de l'époque. Calibré pour qu'un
   débutant de bas de tableau touche quelques dizaines de milliers, un titulaire
   confirmé quelques centaines, et une star quelques millions. */
/* LE SALAIRE SUIT LE PAYS. `pays` est facultatif : sans lui on lit celui où tu joues,
   donc tous les appels existants continuent de dire la même chose. */
function salaireDe(niv, age, force, div, pays){
  const base = Math.pow(Math.max(0, niv - 45) / 30, 2.6) * 3.2;
  const ageF = age <= 19 ? .3 : age <= 21 ? .5 : age <= 23 ? .75 : age <= 31 ? 1 : age <= 33 ? .85 : .7;
  const clubF = clamp(.45 + (force - 50) * .045, .35, 2.2);
  const era = typeof eraForYear === 'function' ? eraForYear(S ? S.annee : 2018) : { marketSize:1 };
  return Math.max(.004, base * ageF * clubF * ((div || 1) === 2 ? .45 : 1) * (era.marketSize || 1)
    * facteurPays(pays || paysCourant(), S ? S.annee : 2018));
}
/* La monnaie, à l'échelle de l'époque (francs avant 2002) et à la virgule française
   comme tous les autres nombres du jeu. */
function sous(v){
  const t = typeof money === 'function' ? money(v, S.annee) : `${Math.round(v * 1000)} k`;
  return t.replace('.', ',');
}
/* Ce que tu as gagné cette saison : ton salaire, et ce que l'année a rapporté. */
function primesDeLaSaison(){
  const p = [];
  const sal = S.salaire || 0;
  if (S.bilan && S.bilan.pos === 1 && S.bilan.division === 1) p.push({ q: sal * .55, t:"le titre" });
  if (S.coupe && S.coupe.gagnee) p.push({ q: sal * .3, t:"la coupe" });
  if (S.euro && S.euro.gagnee) p.push({ q: sal * .45, t:"l'Europe" });
  if (S.bilan && S.bilan.montee) p.push({ q: sal * .3, t:"la montée" });
  if (S.stats.matchs >= 25) p.push({ q: sal * .12, t:"tes matchs joués" });
  return p;
}

/* LES TIENS. Ce n'est pas une jauge de plus : c'est **ce qui décide de ce que ta tête
   encaisse**. Quand il y a du monde derrière toi, un mauvais samedi se répare dans la
   semaine ; quand il n'y a plus personne, il s'installe. C'est le seul effet, et il
   passe par la seule porte du mental (`coutMental`, et la récupération hebdomadaire). */
/* Vers quoi les tiens reviennent quand on ne fait rien, et à quelle vitesse. */
const RAPPEL_PROCHES = .022, RAPPEL_PROCHES_VERS = 46;
/* LE COÛT D'UN DÉPART DOIT ÊTRE UN ÉTAT, PAS UN ÉVÉNEMENT. Mesuré sur 30 carrières par
   ligne : partir dès qu'on pouvait laissait **les tiens à 64 et sept sélections**,
   exactement comme en restant — le −12 du jour de la signature était effacé en une saison
   par le rappel (2,2 % par journée vers 46), et le −16 sur la sélection par sa
   convergence. Je promettais donc un prix que personne ne payait, ce qui est la règle du
   projet prise à l'envers. Vivre à l'étranger **abaisse la cible** : les tiens sont à six
   cents kilomètres toute l'année, pas seulement le jour du déménagement. */
const PROCHES_LOIN = 33;
function cibleProches(){ return (S.pays || 'FR') === 'FR' ? RAPPEL_PROCHES_VERS : PROCHES_LOIN; }
function proches(){ return S.vie ? S.vie.proches : 50; }
/* LE PLANCHER DES TIENS. Aider sa famille au premier gros salaire ne s'oublie
   pas : c'est la seule chose du jeu qui pose un plancher sur une jauge, et elle
   tient toute la carrière. Le reste de l'usure joue normalement au-dessus. */
function bougerProches(d){
  if (!S.vie) return;
  S.vie.proches = clamp(Math.max(S.vie.prochesPlancher || 0, S.vie.proches + d));
}
function direProches(){
  const v = proches(), t = [];
  t.push(v > 78 ? "Il y a du monde derrière toi, et ça se sent."
    : v > 62 ? "Les tiens sont là, même de loin."
    : v > 46 ? "Tu donnes des nouvelles, et c'est à peu près tout."
    : v > 30 ? "Ça fait longtemps que tu n'as vu personne."
    : "Tu es seul, et le football ne suffit pas à remplir ça.");
  return t.join(' ');
}

/* LES CHANTIERS : ce qu'on construit avec l'argent, et qui reste après. Chacun coûte
   un multiple de ton salaire du moment — donc un jeune n'achète rien, et une star ne
   les achète pas tous. Chacun donne quelque chose pendant la carrière **et** une
   ligne au bilan, qui est le seul endroit où une carrière se lit en entier. */
const CHANTIERS = [
  { id:'maison', ico:'🏠', nom:"La maison des tiens",
    sub:"Celle où tu as grandi, rachetée et refaite. Ta mère n'a rien dit, elle a pleuré.",
    cout: 3, trace:"Tu as sorti les tiens de là où tu es né.",
    dit:[{c:'vie',t:"🏡 les tiens, pour toujours"},{c:'risk',t:"💰 trois ans de salaire"}] },
  { id:'diplome', ico:'🎓', nom:"Reprendre les études",
    sub:"Deux soirs par semaine, un dossier à rendre. Personne au club ne comprend.",
    cout: 1.2, trace:"Tu avais un métier le jour où le football s'est arrêté.",
    dit:[{c:'vie',t:"🎓 quelque chose après"},{c:'risk',t:"🎯 tu as la tête ailleurs cette saison"}] },
  { id:'ecole', ico:'⚽', nom:"Une école de foot dans ton quartier",
    sub:"Deux terrains, un éducateur payé, et des gamins qui portent ton nom sur le dos.",
    /* 6,5 fois le meilleur salaire : jamais construite une seule fois sur dix carrières,
       parce que la boutique passait devant. À 5 elle reste la plus chère de loin, et elle
       devient atteignable pour qui renonce à se payer un staff. */
    cout: 5, trace:"Des centaines de gamins ont appris à jouer là où tu as appris.",
    dit:[{c:'foot',t:"📣 ton nom, partout"},{c:'vie',t:"🏡 les tiens en sont fiers"},{c:'risk',t:"💰 très cher"}] },
  { id:'commerce', ico:'🏪', nom:"Monter une affaire",
    sub:"Un restaurant, une salle, une concession. Ton beau-frère dit que c'est béton.",
    cout: 4.5, trace:"Ton affaire tournait encore quand tu as raccroché.",
    dit:[{c:'foot',t:"💰 ça rapporte chaque année"},{c:'risk',t:"🎲 un jour, peut-être, ça coulera"}] },
];
/* Le prix se compte en années de ton **meilleur** salaire, pas de celui du moment :
   sinon une école de foot devenait bon marché à trente-sept ans, quand ton salaire
   s'effondre et que ton compte est plein. Une chose vaut ce qu'elle vaut. */
function coutChantier(c){
  const ref = Math.max(.05, (S.vie && S.vie.salaireMax) || S.salaire || .05);
  return Math.round(c.cout * ref * 1000) / 1000;
}
function poserSalaire(v){
  S.salaire = Math.round(v * 1000) / 1000;
  if (S.vie) S.vie.salaireMax = Math.max(S.vie.salaireMax || 0, S.salaire);
}
function chantierFait(id){ return (S.vie && S.vie.chantiers || []).some(x => x.id === id); }

/* CE QUE TU FAIS DE CE QUE TU AS GAGNÉ. Quatre options, et la règle du jeu : chacune
   donne quelque chose tout de suite **ou** quelque chose qui dure, jamais les deux. */
/* ========== LA BOUTIQUE ==========
   « Où est la boutique ? » (le propriétaire, 02/10/2026). L'argent n'avait que quatre
   choses à acheter — les quatre chantiers — une fois par an, rangées comme des options
   parmi d'autres. Il n'y avait donc pas de **lieu** où dépenser, et rien qui transforme
   un compte en football.
   Ce qui est en vente ici n'est pas décoratif : chaque ligne branche une mécanique qui
   existait déjà, et chacune se paie une fois, cher. **L'arbitrage est entre le football
   et la trace** : deux achats valent une maison, trois valent une école de foot. On ne
   peut pas avoir les deux, et c'est le sujet du jeu.
   `S.vie.achats` est la liste des identifiants possédés ; `aAchat(id)` est la seule porte
   de lecture, pour qu'un achat ne puisse pas être promis sans être branché. */
const BOUTIQUE = [
  { id:'kine', ico:'🩹', nom:"Un kiné à toi",
    sub:"Il te suit, il te connaît, il te voit avant que ça casse.",
    cout: 2.2, quoi:"tu te blesses beaucoup moins",
    dit:[{c:'foot',t:"🩼 un tiers de blessures en moins"},{c:'risk',t:"💰 deux ans de salaire"}] },
  { id:'prepa', ico:'💪', nom:"Un préparateur personnel",
    sub:"Il vient chez toi le dimanche, et il ne parle que de récupération.",
    cout: 1.8, quoi:"tu récupères plus vite entre deux journées",
    dit:[{c:'foot',t:"🫁 récupération d'un cran"},{c:'risk',t:"💰 deux ans de salaire"}] },
  { id:'video', ico:'🎥', nom:"Ton analyste vidéo",
    sub:"Il découpe tes matchs image par image et t'attend le lundi avec trois séquences.",
    cout: 1.6, quoi:"tu fais plus souvent le bon geste au bon moment",
    dit:[{c:'foot',t:"⚽ les faits de match réussissent plus"},{c:'risk',t:"💰 un an et demi de salaire"}] },
  { id:'presse', ico:'📣', nom:"Un attaché de presse",
    sub:"Il choisit ce qui sort de toi, et il décroche ce que ton agent n'ose pas demander.",
    cout: 2, quoi:"les marques viennent plus souvent, et elles paient mieux",
    dit:[{c:'foot',t:"📣 le stade et les sponsors"},{c:'risk',t:"💰 deux ans de salaire"}] },
  { id:'agentPro', ico:'🤝', nom:"L'agent qui compte",
    sub:"Celui dont les présidents prennent les appels. Il ne travaille pas pour rien.",
    cout: 2.6, quoi:"les clubs te regardent de plus haut en juin",
    dit:[{c:'foot',t:"📞 ta cote aux offres"},{c:'risk',t:"💰 deux ans et demi de salaire"}] },
];
/* L'ENTRETIEN, CALIBRÉ EN DEUX PASSES. À 30 % du prix par an, **plus rien ne tenait** :
   mesuré sur dix carrières, zéro achat possédé à la fin, le compte à sec et aucun
   chantier construit — les cinq achats valaient trois fois un salaire annuel d'entretien.
   À 12 %, garder les cinq coûte encore plus que ce qu'une saison rapporte (1,2 fois),
   mais **un ou deux se tiennent** pour le prix d'un demi-chantier par an. C'est la bande
   qu'on veut : on s'offre un staff, pas tout un staff. */
const ENTRETIEN = .12;
function aAchat(id){ return !!(S.vie && (S.vie.achats || []).includes(id)); }
function aChantier(id){ return !!(S.vie && (S.vie.chantiers || []).some(x => x.id === id && !x.coule)); }
function coutAchat(c){
  const ref = Math.max(.05, (S.vie && S.vie.salaireMax) || S.salaire || .05);
  return Math.round(c.cout * ref * 1000) / 1000;
}
function acheter(id){
  const c = BOUTIQUE.find(x => x.id === id); if (!c || aAchat(id)) return;
  const q = coutAchat(c);
  if (q > S.argent) return;
  S.argent = Math.round((S.argent - q) * 1000) / 1000;
  S.vie.achats = (S.vie.achats || []).concat(id);
  S.vie.suiteAchat = `${c.nom} : ${sous(q)}. ${c.sub}`;
  jrn('vie', `${c.nom} — ${sous(q)}.`);
  sauver(); rendre();
}

const VIE_CHOIX = [
  { id:'cote', ico:'🏦', nom:"Mettre de côté",
    sub:"Tu ne touches à rien. Ton conseiller appelle ça être raisonnable.",
    dit:[{c:'foot',t:"💰 tout reste pour plus tard"},{c:'neutre',t:"↔️ rien ne change cette année"}] },
  { id:'tiens', ico:'🏡', nom:"Faire vivre les tiens",
    sub:"Les factures, la voiture du frère, les vacances de tout le monde.",
    dit:[{c:'vie',t:"🏡 les tiens se rapprochent"},{c:'foot',t:"🧠 tu reviens la tête claire"},{c:'risk',t:"💰 ça part vite"}] },
  { id:'profiter', ico:'🕶️', nom:"En profiter",
    sub:"Une voiture, des hôtels, des gens qui te trouvent formidable.",
    dit:[{c:'foot',t:"📣 on parle de toi"},{c:'foot',t:"🧠 tu décompresses"},{c:'risk',t:"🏡 les tiens te voient moins"}] },
];

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
/* La marge de progression qu'un axe garde toujours au-dessus de son départ. */
const MARGE_POT = 6;

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
  S.ete = { id: e.id, nom: e.nom, fraicheur: 100, corps: 0, offres: 0, travail: 0 };
  if (e.id === 'proches'){
    S.ete.corps = 3;
    // la tête se répare vraiment : on remonte au pic, ce que la saison n'offre jamais
    AXES.forEach(a => { if (a === 'ment' && S.moi.base.ment < S.moi.pic.ment) bougerAxe('ment', S.moi.pic.ment - S.moi.base.ment); });
  } else if (e.id === 'travail'){ S.ete.travail = 3.6; S.ete.corps = -3; S.ete.fraicheur = 78; }
  // `soin` passe par le corps, qui porte déjà les blessures et la récupération
  else if (e.id === 'soin'){ S.ete.corps = 16; }
  else if (e.id === 'montrer'){ S.ete.offres = 2;
    S.liens.agent = clamp(S.liens.agent + 14); S.liens.supporters = clamp(S.liens.supporters + 10); }
  jrn('ete', `L'été : ${e.nom.toLowerCase()}.`);
  vieillir();
  if (S.moi.age >= FIN_CARRIERE) return finCarriere("l'âge");
  /* L'ORDRE DE L'ÉTÉ, ET POURQUOI IL EST CELUI-LÀ. On note les rangs (l'élan du
     championnat), les divisions s'échangent, les deux vieillissent, **puis** les
     offres — donc un club t'appelle avec la force qu'il a vraiment cet été, et non
     celle de l'an passé. Le marché, lui, se joue **après** ta signature : un club
     construit autour du joueur qu'il vient de prendre, et tu lis ce qu'il a fait. */
  noterRangs();
  syncClubSq();
  promotionsRelegations();
  faireVivreLigue();
  genererOffres();
  S.raccroche = 0;
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
/* TON CORPS NE REDEVIENT PAS NEUF. `S.etats.corps` ne bougeait pratiquement pas :
   mesuré sur 1 020 semaines, médiane 89 et dixième centile 86 — la phrase disait
   « Rien ne te fait mal » 86 % du temps et n'atteignait jamais les bandes basses,
   parce que les étés rendaient plus que la saison ne prenait. C'est le propriétaire
   qui l'a vu (« l'onglet blessure n'est pas connecté à ma situation »), et il avait
   raison : un chiffre affiché qui ne bouge pas n'existe pas, et celui-là ne servait
   à rien non plus.
   Premier essai, trop violent : une usure qui s'empile (matchs, blessures, années)
   avec une blessure qui coûte du corps et un corps usé qui fait se blesser — la
   spirale. Mesuré : corps à 77 dès vingt ans, 47 à vingt-trois, et **une semaine sur
   trois à l'infirmerie**. La bonne forme n'est pas une punition qui s'accumule mais
   **une cible qui descend avec l'âge** : le corps y revient tout seul chaque semaine,
   et ce qu'on lui fait subir l'en écarte. On répare, on ne rajeunit pas. */
function cibleCorps(age){
  const a = age == null ? (S && S.moi ? S.moi.age : 20) : age;
  return clamp(96 - Math.max(0, a - 25) * 1.9, 58, 96);
}
const plafondCorps = cibleCorps;
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
/* CE QUE LA SAISON A RAPPORTÉ, ET CE QU'ELLE A COÛTÉ AUX TIENS. Le football prend
   de la place : une saison passe, et si on n'a rien fait pour eux, les tiens
   s'éloignent un peu. C'est lent, ça ne s'efface pas, et c'est le seul endroit du
   jeu où le temps joue contre toi sans qu'on te prévienne. */
function encaisserLaSaison(){
  const primes = primesDeLaSaison();
  const total = (S.salaire || 0) + primes.reduce((a, x) => a + x.q, 0);
  S.argent = Math.round((S.argent + total) * 1000) / 1000;
  S.vie.gagneAvant = S.vie.gagne || 0;
  S.vie.gagne = Math.round(total * 1000) / 1000;
  S.vie.primes = primes.map(x => x.t);
  // un commerce qui tourne rapporte chaque année
  const co = (S.vie.chantiers || []).find(x => x.id === 'commerce' && !x.coule);
  if (co){
    if (Math.random() < .05){ co.coule = true; jrn('argent', `Ton affaire a coulé.`); }
    else { S.argent = Math.round((S.argent + co.rend) * 1000) / 1000;
      S.vie.gagne = Math.round((S.vie.gagne + co.rend) * 1000) / 1000; }
  }
  /* CE QU'ON A ACHETÉ SE PAIE CHAQUE ANNÉE. Mesuré sans entretien, dix carrières :
     **les cinq achats étaient pris dans dix carrières sur dix** et l'école de foot
     n'était **jamais** construite — donc la boutique n'était pas un arbitrage, c'était
     une liste de courses qu'on finit par cocher entièrement, et elle mangeait la seule
     chose qui survit à la carrière. Un kiné à soi, un préparateur, un attaché de presse
     sont des salaires : ils reviennent tous les ans, et le jour où tu ne peux plus
     payer, ils vont ailleurs. Les chantiers, eux, ne coûtent rien après : c'est ce qui
     les distingue. */
  const garde = [];
  (S.vie.achats || []).forEach(id => {
    const c = BOUTIQUE.find(x => x.id === id); if (!c) return;
    const q = Math.round(coutAchat(c) * ENTRETIEN * 1000) / 1000;
    if (q <= S.argent){ S.argent = Math.round((S.argent - q) * 1000) / 1000; garde.push(id); }
    else jrn('argent', `Tu n'as plus de quoi payer ${c.nom.toLowerCase()}. Il est parti ailleurs.`);
  });
  S.vie.achats = garde;
  /* L'entretien affiché est celui de ce qu'on **garde**, pas de ce qu'on vient de perdre :
     il se calcule donc après le tri, sinon l'écran de la semaine annoncerait le prix d'un
     kiné qui est déjà parti. */
  S.vie.entretien = Math.round(garde.reduce((a, id) => {
    const c = BOUTIQUE.find(x => x.id === id); return a + (c ? coutAchat(c) * ENTRETIEN : 0); }, 0) * 1000) / 1000;
  jrn('argent', `La saison a rapporté ${sous(S.vie.gagne)}.`);
  bougerProches(-2.2 - Math.max(0, (S.moi.age - 27)) * .18);
}
function vieillir(){
  const pos = S.bilan ? S.bilan.pos : null;
  /* L'année qui passe use, et de plus en plus vite. C'est ce qui fait qu'une carrière
     finit par se terminer dans le corps avant de se terminer dans les chiffres. */
  if (S.moi.age >= 29) S.etats.corps = clamp(S.etats.corps - (S.moi.age - 28) * .3);
  S.carriere = S.carriere || { saisons:0, matchs:0, titus:0, buts:0, passes:0, caps:0, butsSelec:0,
    sum:0, nbNotes:0, titres:0, clubs:[], annees:[], gagne:0 };
  const c = S.carriere;
  c.saisons++; c.matchs += S.stats.matchs; c.titus += S.stats.titus;
  c.gagne = Math.round(((c.gagne || 0) + (S.vie.gagne || 0)) * 1000) / 1000;
  c.buts += S.stats.buts; c.passes += S.stats.passes;
  c.faits = (c.faits || 0) + (S.stats.faits || 0);
  c.faitsOk = (c.faitsOk || 0) + (S.stats.faitsOk || 0);
  S.stats.notes.forEach(n => { c.sum += n; c.nbNotes++; });
  /* Un titre est un titre de l'élite. Gagner l'échelon inférieur est une **montée**,
     et ça se compte ailleurs : sans ça le bilan de carrière annonçait des titres qui
     n'en étaient pas (mesuré : 13 sur 80 premières places). */
  if (pos === 1 && S.bilan && S.bilan.division === 1) c.titres++;
  if (S.bilan && S.bilan.montee) c.montees = (c.montees || 0) + 1;
  if (S.coupe && S.coupe.gagnee) c.coupes = (c.coupes || 0) + 1;
  if (S.euro && S.euro.gagnee) c.europes = (c.europes || 0) + 1;
  if (!c.clubs.includes(S.club.nom)) c.clubs.push(S.club.nom);
  /* Les pays traversés : c'est une trace, donc le bilan de carrière la relit. */
  c.pays = c.pays || [];
  if (!c.pays.includes(S.pays || 'FR')) c.pays.push(S.pays || 'FR');
  c.annees.push({ annee:S.annee, club:S.club.nom, pays:S.pays || 'FR', pos, matchs:S.stats.matchs,
    buts:S.stats.buts, note: S.bilan ? S.bilan.note : null, niveau: Math.round(niveau()),
    div: S.bilan ? S.bilan.division : 1, montee: !!(S.bilan && S.bilan.montee),
    descente: !!(S.bilan && S.bilan.descente),
    coupe: !!(S.coupe && S.coupe.gagnee), euro: !!(S.euro && S.euro.gagnee) });
  S.moi.age++; S.annee++;
  S.progres = progresserAxes();
}

/* LES OFFRES, UNE À LA FOIS. « Plutôt que de me laisser choisir entre les
   propositions, ce serait bien que j'aie une proposition sans savoir si j'en
   aurai de meilleures » (le propriétaire, 26/09/2026, sur la 1.0). Refuser fait
   disparaître l'offre pour de bon, et la suivante peut être pire, ou ne pas venir. */
/* QUI T'APPELLE DE L'ÉTRANGER. Un club étranger n'a pas d'effectif tant que tu n'as
   pas signé : une offre, c'est un nom, un pays et une force — celle que lui donne son
   poids historique à cette époque, par la même pente que le championnat où tu joues.
   **ET C'EST L'ÉPOQUE QUI DÉCIDE DE QUI APPELLE, pas seulement de la fréquence.** Avant
   l'arrêt Bosman, un club ne peut aligner que deux étrangers : il ne dépense donc une de
   ces deux places que pour quelqu'un dont il est sûr, et seuls les **clubs d'histoire**
   font venir un joueur de l'étranger. Après 1995, tout le tableau peut appeler.
   Ce n'est pas qu'une couleur d'époque, c'est ce qui empêche l'étranger de dominer :
   mesuré avec les seuls clubs d'histoire, **toute** offre venue d'ailleurs était un grand
   club, donc partir n'était pas une décision mais une promotion — 4,45 titres par
   carrière pour qui partait systématiquement contre 2,83 sur la version déployée. */
/* Mesuré à .13 et .5 sur dix-huit carrières : une offre de l'étranger arrivait dans
   **40 % des intersaisons avant Bosman et 61 à 65 % après** — autant dire tous les étés,
   ce qui n'est ni rare ni une décision. À .055 et .28 on retombe dans la bande visée. */
const ETRANGER_AVANT = .055, ETRANGER_APRES = .28;
function candidatsEtrangers(dk){
  const out = [], bosman = S.annee >= 1996;
  Object.keys(PAYS).filter(p => p !== (S.pays || 'FR')).forEach(p => {
    const q = poolPays(p, dk);
    (bosman ? q.gros.concat(q.petits) : q.gros).forEach(x => out.push({ nom:x.nom, pays:p,
      force: dec1(clamp(52 + x.s * PENTE_CLUB + rnd(-2, 2), 44, 76)) }));
  });
  return out;
}
/* CE QU'ON DIT AVANT DE SIGNER AILLEURS. Une offre de l'étranger n'est pas une offre
   de plus : elle change le monde, le public, les tiens, et avant Bosman la sélection.
   Les trois conséquences sont écrites avant le clic, parce qu'aucune ne se devine. */
function motEtranger(o){
  const rentre = o.pays === (S.natal || 'FR');
  const l = [`Tu jouerais ${nomChampionnat(o.pays, S.annee)}`];
  l.push("tout le vestiaire et le public sont à refaire");
  l.push("le coach ne te connaît pas : la première saison se gagne");
  l.push(rentre ? "mais tu rentres, et les tiens sont là" : "les tiens restent ici");
  if (S.annee < 1996 && (S.liens.selection || 0) > 12)
    l.push(rentre ? "et le sélectionneur te reverra jouer chaque semaine"
      : "et en " + S.annee + " le sélectionneur te verra beaucoup moins");
  const f = facteurPays(o.pays, S.annee), ici = facteurPays(S.pays || 'FR', S.annee);
  if (f > ici * 1.15) l.push("mais on y paie mieux qu'ici");
  else if (f < ici * .9) l.push("et on y paie moins bien qu'ici");
  return l.join(" · ") + ".";
}
function genererOffres(){
  const n = niveau();
  const joue = S.stats.matchs >= 12, bonne = S.stats.notes.length && moyenneNotes() >= 6.4;
  // ta cote : ce que tu vaux, ce que tu as montré, et ce que ton agent a fait de l'été
  /* TA COTE : ce que tu vaux, ce que tu as montré, ce que ton agent a fait de l'été
     — et, depuis le 29/09/2026, **le stade et la sélection**. Un joueur que son
     public porte se vend mieux ; un joueur que le sélectionneur regarde reçoit des
     appels de clubs qui ne le connaissaient pas. */
  const cote = n + (joue ? 2 : -3) + (bonne ? 2.5 : 0) + (S.ete ? S.ete.offres : 0)
    + (S.bonusOffres || 0)
    + (S.liens.agent - 50) * .06 + (S.moi.age >= 33 ? -4 : 0)
    + (S.liens.supporters - 50) * .03 + (S.liens.selection || 0) * .035
    /* 5/5 : l'agent qui compte. Trois points de cote, c'est deux fois ce que vaut le
       stade d'un bout à l'autre — il se paie, et il se voit en juin. */
    + (aAchat('agentPro') ? 3 : 0);
  /* Calibré : à .05 et .055, la cote médiane montait de deux points et demi et tes
     titres par carrière de 5,2 à 6,7 (mesuré, 12 carrières de vingt saisons) — ce
     n'était plus un coup de pouce, c'était une promotion. À .03 et .035 le stade et
     la sélection valent ensemble un point et demi de cote, du même ordre que ce que
     l'agent pèse déjà. */
  /* UN GRAND CLUB N'APPELLE PAS TOUS LES ÉTÉS. La fenêtre était symétrique
     (`|force − cote| < 7`), donc une fois ta cote haute **toutes** les offres
     venaient du haut du tableau et tu suivais le meilleur club d'année en année.
     Désormais un club à ta portée appelle volontiers, un club au-dessus de toi
     rarement : il a le choix. C'est ce qui rend une signature au sommet rare, et
     donc intéressante. */
  /* Les offres viennent des deux divisions : un club de l'élite peut venir te
     chercher en bas, et c'est la seule porte de sortie quand ton club descend. */
  /* TA PLACE SE MESURE AU MONDE, PAS À TOI-MÊME. Le plancher était ancré sur ta
     seule cote (`force > cote - 14`) : une fois que tu dépasses tout le monde — ce
     qui arrive au sommet d'une carrière, puisque le meilleur club vaut 65 et qu'une
     cote de pointe vaut 80 — **plus un seul club ne passait le filtre**, et tu ne
     recevais plus rien pendant des saisons entières. On compare donc au sommet du
     monde quand tu es au-dessus de lui. */
  const tous = toutesLesEquipes().filter(e => e.nom !== S.club.nom);
  const dkO = typeof decadeKey === 'function' ? decadeKey(S.annee) : '10';
  const etr = candidatsEtrangers(dkO);
  const sommet = tous.concat(etr).reduce((a, e) => Math.max(a, e.force), 0);
  const ref = Math.min(cote, sommet);
  const cand = tous.filter(e => e.force > ref - 14).map(e => ({ nom:e.nom, force:e.force }))
    .concat(etr.filter(e => e.force > ref - 10));
  /* Et la fenêtre est désormais à deux bords : un club **au-dessus** de toi appelle
     rarement (il a le choix), un club **loin en dessous** aussi (il n'a pas les
     moyens, et tu n'irais pas). Entre les deux, il appelle volontiers, d'autant plus
     qu'il est proche de ce que tu vaux. Sans ce second bord, un joueur qui domine son
     championnat recevait les dix-huit clubs à poids égal. */
  const rare = S.annee >= 1996 ? ETRANGER_APRES : ETRANGER_AVANT;
  const poids = cand.map(e => { const d = e.force - ref;
    const w = d > 0 ? 1 / (1 + d * .55) : 1 / (1 + (-d) * .09);
    return e.pays ? w * rare : w; });
  let combien = Math.min(cand.length, Math.max(0, ri(0, 2) + (S.ete && S.ete.offres ? 1 : 0) + (bonne && joue ? 1 : 0)));
  /* La descente d'un club étranger te met dehors sans qu'il y ait d'échelon inférieur où
     te suivre : c'est la seule cause de départ forcé que ce lot ajoute, donc elle ne doit
     pas pouvoir finir une carrière à vingt-quatre ans sur un tirage à zéro offre. Une
     proposition au moins arrive. Les deux vieilles causes (l'âge, la saison blanche)
     gardent leur dureté. */
  if (S.clubDescendu && !combien && cand.length) combien = 1;
  const tires = [];
  for (let k = 0; k < combien && cand.length; k++){
    let t = poids.reduce((a, x) => a + x, 0) * Math.random(), i = 0;
    while (i < cand.length - 1 && (t -= poids[i]) > 0) i++;
    tires.push(cand[i]); cand.splice(i, 1); poids.splice(i, 1);
  }
  const d1 = (S.ligue.equipes || []);
  const maDiv = S.division || 1;
  S.offres = tires.map(e => {
    /* Un club étranger n'est dans aucune de tes deux divisions : il joue l'élite de
       chez lui. Sans ce cas, il arrivait annoncé en « Ligue 2 ». */
    const div = e.pays ? 1 : (d1.some(x => x.nom === e.nom) ? maDiv : (maDiv === 1 ? 2 : 1));
    /* Le salaire est dans l'offre, et il ne suit pas la force du club : un club
       moyen qui te veut vraiment paie plus qu'un grand qui hésite. C'est ça,
       l'arbitrage — jouer ou gagner sa vie. */
    return { nom:e.nom, force:e.force, div, pays: e.pays || null,
      salaire: Math.round(salaireDe(n, S.moi.age, e.force, div, e.pays) * rnd(.8, 1.45) * 1000) / 1000,
      ans: ri(2, 4) };
  });
  S.offreIdx = 0;
  /* LA CONFIANCE DU CLUB DÉCIDE DE JUIN (jauge rebranchée le 29/09/2026 : huit
     options la faisaient bouger, rien ne la lisait, et les pastilles « le club
     apprécie » ne correspondaient à rien). Elle ne remplace pas les deux vieilles
     raisons de non-renouvellement — l'âge et la saison blanche — elle les arbitre :
     un club qui tient à toi passe l'éponge, un club qui ne te croit plus n'attend
     pas tes trente-trois ans. C'est la seule chose qui t'oblige à partir. */
  const cl = S.liens.club;
  const dur = (S.moi.age >= 33 && S.stats.matchs < 10) || (S.stats.matchs === 0 && S.moi.age >= 21);
  /* Et la descente à l'étranger : il n'y a pas d'échelon inférieur où te suivre. */
  S.libre = (dur && cl < 64) || (cl < 28 && S.stats.matchs < 18) || !!S.clubDescendu;
  if (S.libre) jrn('offre', cl < 28 && !dur
    ? `${S.club.nom} ne prolonge pas : ils ont tourné la page depuis longtemps.`
    : `${S.club.nom} ne prolonge pas.`);
  return S.offres;
}
function offreCourante(){ return (S.offres || [])[S.offreIdx || 0] || null; }
function passerOffre(){
  S.raccroche = 0;
  S.offreIdx = (S.offreIdx || 0) + 1;
  if (S.offreIdx >= (S.offres || []).length && S.libre) return finCarriere("personne");
  sauver(); rendre();
}
function signerOffre(){
  const o = offreCourante(); if (!o) return;
  jrn('offre', `Tu signes à ${o.nom} : ${sous(o.salaire)} par an, ${o.ans} ans.`);
  poserSalaire(o.salaire); S.contrat = o.ans;
  /* CE QUE PARTIR COÛTE, et c'est ce qui en fait une décision plutôt qu'une promotion :
     changer de club éloigne les tiens, changer de **pays** les laisse derrière. Le public
     est à refaire entièrement, la première saison se joue dans une langue qu'on ne parle
     pas — et avant Bosman, un sélectionneur ne voyait plus jouer ceux qui étaient partis. */
  /* RENTRER N'EST PAS PARTIR. Relu à l'écran : une offre française quand on joue en
     Angleterre affichait « les tiens restent ici » — alors que c'est exactement l'inverse,
     on revient là où ils sont. `S.natal` est le pays où la carrière a commencé. */
  const loin = !!(o.pays && o.pays !== (S.pays || 'FR'));
  const rentre = loin && o.pays === (S.natal || 'FR');
  bougerProches(rentre ? 10 : loin ? -12 : -4);
  rejoindre(o);
  if (loin){
    S.liens.supporters = 46;
    if (!rentre) coutMental(2.2, "une ville que tu ne connais pas, une langue que tu ne parles pas");
    /* IL FAUT S'ADAPTER, ET ÇA SE PAIE SUR LE TERRAIN. Mesuré sans ce coût, 30 carrières
       par ligne : partir dès qu'on peut rapportait **3,93 titres par carrière contre 3,13
       en restant** — parce qu'avec quatre championnats de plus, il se trouve toujours un
       club à ta portée qui appelle, donc on signe mieux qu'en restant chez soi. Ce n'était
       pas une décision, c'était un meilleur tirage.
       Le coût n'invente rien : `rejoindre()` remet déjà la confiance du coach à 50 et celle
       du club à 52 quand on change de club. En changeant de **pays** on démarre plus bas —
       le coach ne te connaît pas, tu ne parles pas la langue, et la confiance du coach pèse
       sur le choix du onze. C'est la première saison qui se paie, et elle se rattrape. */
    S.liens.coach = 40; S.liens.club = 44;
    if (!rentre && S.annee < 1996 && (S.liens.selection || 0) > 0){
      S.liens.selection = clamp((S.liens.selection || 0) - 10);
      jrn('selection', `Partir à l'étranger, en ${S.annee} : le sélectionneur te verra moins.`);
    }
  }
  ouvrirMercato(false);
}
function resterAuClub(){
  if (S.libre) return;
  const e = monClub();
  if (e) S.club = { nom: e.nom, force: e.force };
  /* Rester, c'est renégocier : ton salaire suit ce que tu es devenu, en bien
     comme en mal. */
  /* Et il décide de ce qu'il met sur la table : ±18 % entre un club qui t'a oublié
     et un club dont tu es le joueur. La renégociation est le seul endroit du jeu où
     la confiance du club se compte en argent. */
  const neuf = salaireDe(niveau(), S.moi.age, S.club.force, S.division || 1)
    * (1 + (S.liens.club - 50) * .006);
  poserSalaire(Math.max(S.salaire * .8, (S.salaire + neuf) / 2));
  jrn('offre', `Tu restes à ${S.club.nom} : ${sous(S.salaire)} par an.`);
  ouvrirMercato(true);
}

/* ========== L'ÉTÉ DE TON CLUB, ET LA DÉCISION QUI VA AVEC ==========
   Le mercato du joueur n'est pas un marché qu'on opère — c'est un marché qu'on
   **subit**, et dont on décide quoi faire. On lit qui arrive, qui part, ce que ça
   fait à sa place dans la hiérarchie du poste, puis on choisit : se mettre au
   travail avant tout le monde, aller demander au coach où on en est, mettre son
   agent au travail pour l'an prochain, ou prendre les nouveaux avec soi. */
const MERCATO_CHOIX = [
  { id:'bosser', ico:'🎯', nom:"Rentrer une semaine plus tôt",
    sub:"Le centre est vide. Toi, l'adjoint, et ton poste.",
    dit:[{c:'foot',t:"🎽 le coach te voit avant les autres"},{c:'foot',t:"🎯 ton poste"},{c:'risk',t:"🫁 tu arrives déjà entamé"}] },
  { id:'coach', ico:'🎽', nom:"Lui demander où tu en es",
    sub:"Son bureau, dix minutes, et une réponse que tu n'as pas forcément envie d'entendre.",
    dit:[{c:'foot',t:"🎽 il te situe, et tu sais quoi faire"},{c:'risk',t:"🧠 s'il est franc, ça cogne"}] },
  { id:'agent', ico:'🤝', nom:"Dire à ton agent de chercher",
    sub:"Pas pour cet été. Pour le prochain, et pour que ça se sache.",
    dit:[{c:'foot',t:"🤝 de meilleures propositions l'an prochain"},{c:'risk',t:"🏟️ le club l'apprendra"}] },
  { id:'vestiaire', ico:'🤲', nom:"Prendre les nouveaux avec toi",
    sub:"Les dîners, l'appartement, la langue. Ça ne se voit sur aucune feuille de match.",
    dit:[{c:'foot',t:"🧑‍🤝‍🧑 les trois lignes"},{c:'neutre',t:"↔️ rien pour toi"}] },
];
function ouvrirMercato(reste){
  S.raccroche = 0;
  const mouv = mercato();
  const r = relireClubSq();
  S.ligneRef = { ...S.lignes };
  /* Ce qui se voit d'un mercato, de l'intérieur : ce que ton club a fait, et les
     trois ou quatre mouvements dont tout le monde parle ailleurs. */
  const nous = mouv.filter(m => m.vers === S.club.nom || m.de === S.club.nom);
  const ailleurs = mouv.filter(m => m.vers !== S.club.nom && m.de !== S.club.nom)
    .sort((a, b) => b.niv - a.niv).slice(0, 4);
  const div = nom => ((S.ligue.equipes || []).some(e => e.nom === nom) ? (S.division || 1) : ((S.division || 1) === 1 ? 2 : 1));
  S.mercato = { reste: !!reste, total: mouv.length, arrivees: r.arrivees, partis: r.partis,
    achats: nous.filter(m => m.vers === S.club.nom).map(m => ({ ...m, div: div(m.de) })),
    ventes: nous.filter(m => m.de === S.club.nom).map(m => ({ ...m, div: div(m.vers) })),
    ailleurs, choix: null, suite: null,
    montent: (S.mouvDiv || {}).montent || [], descendent: (S.mouvDiv || {}).descendent || [] };
  if (S.mercato.partis.length)
    jrn('mercato', `${S.mercato.partis.length} départ${S.mercato.partis.length > 1 ? 's' : ''} : ${S.mercato.partis.slice(0, 4).map(x => x.nom).join(', ')}.`);
  S.mercato.achats.forEach(m => jrn('mercato', `${S.club.nom} prend ${m.nom} à ${m.de}.`));
  S.ecran = 'mercato'; sauver(); rendre();
}
/* Où tu en es à ton poste, maintenant que le marché est passé. C'est la seule
   chose qu'un joueur regarde vraiment dans un mercato. */
function placeApresMercato(){
  const moi = Math.round(niveau());
  const l = (S.concurrents || []).map(c => c.niv).concat(
    (S.equipe || []).filter(j => j.poste === S.moi.poste).map(j => j.niv));
  const devant = l.filter(v => v > moi).length;
  return { rang: devant + 1, total: l.length + 1,
    places: FORMATION[S.moi.poste],
    neuf: (S.mercato && S.mercato.arrivees || []).filter(a => a.poste === S.moi.poste) };
}
/* Ce que le mercato t'a fait, en une phrase et sans un chiffre de jauge. La seule
   question qu'un joueur se pose devant un mercato : est-ce que je joue encore ? */
function direMercatoPlace(){
  const p = placeApresMercato();
  const neuf = p.neuf.filter(a => a.rival);
  const t = [];
  if (p.rang <= p.places) t.push(`Tel que le groupe est là, tu commences la saison dans le onze.`);
  else if (p.rang === p.places + 1) t.push(`Tu es le premier à attendre son tour à ton poste. Il ne manque pas grand-chose.`);
  else t.push(`${p.rang - 1} joueurs devant toi à ton poste, pour ${p.places} place${p.places > 1 ? 's' : ''}.`);
  if (neuf.length) t.push(`${neuf.map(a => a.nom).join(' et ')} ${neuf.length > 1 ? 'arrivent' : 'arrive'} à ton poste, et au-dessus de toi.`);
  else if (p.neuf.length) t.push(`${p.neuf[0].nom} arrive à ton poste, derrière toi.`);
  return t.join(' ');
}
function choisirMercato(id){
  const c = MERCATO_CHOIX.find(x => x.id === id) || MERCATO_CHOIX[0];
  const p = placeApresMercato();
  const dur = p.rang > p.places;      // tu n'es pas dans le onze tel qu'il est là
  let suite = '';
  if (c.id === 'bosser'){
    bougerAxe('spec', 2.2);
    S.liens.coach = clamp(S.liens.coach + 5);
    S.ete.fraicheur = clamp(S.ete.fraicheur - 12);
    bougerAxe('phys', 1.2);         // dix jours de charge, et le corps s'en souvient
    suite = `Dix jours seul avec l'adjoint. Quand le groupe est rentré, tu étais déjà dedans — et il l'a vu. Tu commenceras la saison fatigué, mais devant.`;
  } else if (c.id === 'coach'){
    S.liens.coach = clamp(S.liens.coach + (dur ? 5 : 9));
    if (dur){
      coutMental(2.2, "ce qu'il t'a dit en juillet");
      suite = `Il n'a pas tourné autour : tel que c'est parti, tu n'es pas dans son onze. Il t'a dit quoi faire pour y entrer. Tu es reparti avec ça, et avec le reste.`;
    } else {
      suite = `Il compte sur toi, et il l'a dit sans y mettre de conditions. C'est rare, et ça se garde.`;
    }
  } else if (c.id === 'agent'){
    S.liens.agent = clamp(S.liens.agent + 12);
    S.liens.club = clamp(S.liens.club - 8);
    S.liens.coach = clamp(S.liens.coach - 4);
    S.bonusOffres = 2.5;
    suite = `Il a passé trois coups de fil dans la semaine. Le club l'a su avant toi — ces choses-là se savent — mais l'été prochain, on t'appellera.`;
  } else {
    LIGNES.forEach(l => S.lignes[l] = clamp(S.lignes[l] + 6));
    S.ligneRef = { ...S.lignes };
    S.liens.club = clamp(S.liens.club + 4);
    suite = `Trois dîners, un appartement trouvé, un permis de conduire expliqué. Rien pour toi sur une feuille de match — et un vestiaire qui commence la saison ensemble.`;
  }
  S.mercato.choix = { id:c.id, nom:c.nom };
  S.mercato.suite = suite;
  jrn('mercato', `${c.nom}.`);
  sauver(); rendre();
}
function finirMercato(){
  ouvrirVie();
}

/* ========== L'ÉCRAN DE LA VIE ==========
   Dernier temps de l'intersaison, et le seul qui ne parle pas de football : ton
   bilan, ton corps (l'été), ton club (les offres), ton vestiaire (le mercato), puis
   **toi**. C'est là que l'argent sert à quelque chose et que se décide ce qu'il
   restera de tout ça. */
function ouvrirVie(){
  /* Trouvé en cherchant pourquoi il ne voyait pas les pages hors football : une
     sauvegarde sans objet `vie` faisait **planter le bouton du mercato en silence**,
     donc on ne pouvait jamais atteindre cet écran. Seule une partie d'avant la vie et
     l'argent peut être dans cet état, mais le plantage était réel. */
  if (!S.vie) S.vie = { proches: 50, chantiers: [], achats: [], gagne: 0, gagneAvant: 0 };
  S.vie.achats = S.vie.achats || [];
  S.vie.fait = null; S.vie.suite = null; S.vie.suiteAchat = null;
  S.ecran = 'vie'; sauver(); rendre();
}
function chantiersDispos(){
  return CHANTIERS.filter(c => !chantierFait(c.id) && coutChantier(c) <= S.argent);
}
function choisirVie(id){
  const c = VIE_CHOIX.find(x => x.id === id);
  if (c) return faireVie(c);
  const ch = CHANTIERS.find(x => x.id === id);
  if (ch) return faireChantier(ch);
}
function faireVie(c){
  let suite = '';
  if (c.id === 'cote'){
    suite = `Tu n'as rien touché. ${sous(S.argent)} dorment quelque part, et personne au club n'en sait rien.`;
  } else if (c.id === 'tiens'){
    const q = Math.min(S.argent, (S.vie.gagne || S.salaire) * .55);
    S.argent = Math.round((S.argent - q) * 1000) / 1000;
    bougerProches(16);
    if (S.moi.base.ment < S.moi.pic.ment) bougerAxe('ment', Math.min(3, S.moi.pic.ment - S.moi.base.ment));
    suite = `${sous(q)} partis en six semaines, et tu n'as pas compté. Ils étaient tous là, et tu es reparti la tête claire.`;
  } else {
    const q = Math.min(S.argent, (S.vie.gagne || S.salaire) * .7);
    S.argent = Math.round((S.argent - q) * 1000) / 1000;
    S.liens.supporters = clamp(S.liens.supporters + 9);
    if (S.moi.base.ment < S.moi.pic.ment) bougerAxe('ment', Math.min(2, S.moi.pic.ment - S.moi.base.ment));
    bougerProches(-7);
    suite = `${sous(q)} en un été. Tu as coupé, vraiment — et chez toi, on a lu ça dans les journaux comme tout le monde.`;
  }
  S.vie.fait = { id:c.id, nom:c.nom }; S.vie.suite = suite;
  jrn('vie', `${c.nom}.`);
  sauver(); rendre();
}
function faireChantier(ch){
  const q = coutChantier(ch);
  if (q > S.argent) return;
  S.argent = Math.round((S.argent - q) * 1000) / 1000;
  const fait = { id:ch.id, nom:ch.nom, annee:S.annee, trace:ch.trace };
  let suite = '';
  if (ch.id === 'maison'){ bougerProches(22);
    suite = `Les clés sur la table de la cuisine. Ta mère n'a rien dit. C'est la première chose que ce métier t'a permis de faire pour eux.`; }
  else if (ch.id === 'diplome'){ S.vie.diplome = true; bougerProches(5);
    // « tu as la tête ailleurs cette saison » : la pastille le promet, le code le fait
    bougerAxe('spec', -1.2);
    suite = `Deux soirs par semaine, un an. Au club, personne n'a compris — mais le jour où ça s'arrêtera, tu ne seras pas seulement un ancien joueur.`; }
  else if (ch.id === 'ecole'){ S.liens.supporters = clamp(S.liens.supporters + 20); bougerProches(12);
    suite = `Deux terrains, un éducateur, et cinquante gamins le mercredi. Il y a ton nom sur le portail, et tu n'as pas su quoi en penser.`; }
  else { fait.rend = Math.round(q * .16 * 1000) / 1000;
    suite = `Signé chez le notaire un mardi matin, entre deux entraînements. Ça tournera, ou ça ne tournera pas.`; }
  S.vie.chantiers.push(fait);
  S.vie.fait = { id:ch.id, nom:ch.nom }; S.vie.suite = suite;
  jrn('vie', `${ch.nom} — ${sous(q)}.`);
  sauver(); rendre();
}
function finirVie(){
  demarrerSaison(S.club, S.mercato ? S.mercato.reste : true);
}

/* ========== L'AMBITION, ENFIN LUE ==========
   Elle était choisie au troisième écran de la création, rangée dans `S.moi.ambition`
   et **jamais relue** : un écran qui ne promettait rien. Elle décide maintenant de ce
   qu'une saison te fait — ce que tu es venu chercher te porte quand tu l'obtiens et
   te pèse quand tu passes à côté — et de la phrase qui juge toute la carrière. */
function jugerAmbition(){
  const a = S.moi.ambition, b = S.bilan;
  if (!a || !b) return null;
  const trophee = (b.pos === 1 && b.division === 1) || (S.coupe && S.coupe.gagnee) || (S.euro && S.euro.gagnee);
  /* Trois états et non deux : une ambition qui punit neuf saisons sur dix n'est plus
     une ambition, c'est une taxe. Mesuré avec deux états : « tout gagner » ratait
     97 saisons sur 118. Le presque-compte doit exister — c'est ce qui fait qu'on
     continue. */
  let note = 0, mot = '';
  if (a === 'gagner'){
    const pres = b.pos <= 3 || (S.coupe && S.coupe.hist.length >= 4) || (S.euro && S.euro.hist.length > 6);
    note = trophee ? 1 : pres ? 0 : -1;
    mot = trophee ? "Tu es venu pour ça, et cette année tu l'as eu."
      : pres ? "Vous y étiez presque. C'est ce qui fait qu'on recommence."
      : "Une saison sans rien à mettre dans l'armoire. Ce n'est pas pour ça que tu joues.";
  } else if (a === 'proches'){
    /* ELLE NE DEMANDAIT RIEN (mesuré le 01/10/2026 : **satisfaite 100 % du temps**
       sur 140 saisons, jamais un seul reproche). Elle lisait le **niveau** de la
       jauge, or les tiens ne descendent pratiquement plus : l'été, les chantiers et
       le plancher du premier gros salaire les tiennent en haut, donc le seuil était
       franchi d'office. Elle lit maintenant **ce que la saison leur a fait** — le
       niveau reste le plancher (on ne prétend pas être près des siens quand ils sont
       à trente), mais le « oui » demande en plus de ne pas les avoir laissés glisser
       cette année. Le football les éloigne tout seul : les garder est l'arbitrage,
       c'est écrit depuis le 27/09, et c'est ce que l'ambition doit mesurer. */
    const p = proches(), av = S.vie.prochesAvant == null ? p : S.vie.prochesAvant;
    const tenu = p >= av - 1;
    note = p >= 60 && S.stats.matchs >= 15 && tenu ? 1 : p >= 46 ? 0 : -1;
    mot = note > 0 ? "Tu joues, et les dimanches sont à eux. C'est exactement ce que tu voulais."
      : note === 0 ? (tenu
        ? "Tu donnes des nouvelles, ils comprennent. Ce n'est pas tout à fait ce que tu voulais."
        : "Ils ont compris que tu avais une saison. Il y a quand même des dimanches où personne n'a appelé.")
      : "Tu as joué, et tu n'as vu personne. Ce n'était pas le marché.";
    S.vie.prochesAvant = p;
  } else if (a === 'argent'){
    const g = S.vie.gagne || 0, av = S.vie.gagneAvant || 0;
    note = g >= av ? 1 : g >= av * .8 ? 0 : -1;
    mot = note > 0 ? `${sous(g)} cette saison. Personne chez toi n'avait jamais vu ça.`
      : note === 0 ? `${sous(g)} : un peu moins que l'an dernier, rien d'alarmant.`
      : "Tu as gagné bien moins que l'an dernier. C'est le genre de chose qui tient éveillé.";
  } else {
    const n = (S.vie.chantiers || []).length, av = S.vie.chantiersAvant || 0;
    /* On ne reproche pas à un joueur de vingt ans de n'avoir rien bâti : tant que
       rien n'est à sa portée, la saison ne compte ni pour ni contre. Sans ça, une
       ambition de bâtisseur coûtait du mental à chacune des cinq premières saisons. */
    const portee = CHANTIERS.some(c => coutChantier(c) <= S.argent);
    note = n > av ? 1 : n || !portee ? 0 : -1;
    mot = note > 0 ? "Il y a maintenant quelque chose de plus qui existe en dehors du terrain."
      : n ? "Rien de neuf cette année, mais ce que tu as monté tourne sans toi."
      : !portee ? "Rien de construit encore — tu n'en as pas les moyens. Ça viendra, ou ça ne viendra pas."
      : "Toujours rien de construit, et tu pourrais. Le football ne durera pas éternellement.";
  }
  S.vie.chantiersAvant = (S.vie.chantiers || []).length;
  if (note > 0){ if (S.moi.base.ment < S.moi.pic.ment) bougerAxe('ment', Math.min(2.5, S.moi.pic.ment - S.moi.base.ment)); }
  else if (note < 0) coutMental(1.4, "une saison qui n'était pas celle que tu voulais");
  return { note, ok: note > 0, mot, nom: (AMBITIONS.find(x => x.id === a) || {}).nom };
}

/* La saison suivante commence : nouveau championnat, effectif renouvelé, tout
   ce qui se compte remis à zéro — et rien de ce qui se construit. */
function demarrerSaison(club, reste){
  S.raccroche = 0;
  /* La trêve est une fois par saison, et le soin d'hiver ne passe pas l'été. */
  S.treveFaite = false; S.treveSoin = false; S.treve = null;
  /* Tout ce qui concerne le monde s'est déjà joué : les divisions se sont échangées,
     les deux championnats ont vieilli, le marché est passé et ton vestiaire a été
     relu. Ici on ne fait plus que remettre à zéro ce qui ne dure qu'une saison. */
  const e = monClub();
  S.club = { nom: club.nom, force: e ? e.force : Math.round(club.force) };
  S.ligneRef = { ...S.lignes };
  S.etats = { fraicheur: S.ete ? S.ete.fraicheur : 100, forme:60, blessure:0, suspension:0,
    corps: clamp((S.etats.corps || 88) + (S.ete ? S.ete.corps : 0), 0, cibleCorps()),
  };
  S.stats = { matchs:0, titus:0, buts:0, passes:0, notes:[], minutes:0, faits:0, faitsOk:0 };
  S.promesses = []; S.brassard = 0; S.piqure = false; S.prolonge = false; S.reprise = 0;
  S.selecVue = null;
  S.selec = S.selec || { dedans:false, caps:0, buts:0, passes:0, notes:[] };
  /* UN COACH PEUT ÊTRE VIRÉ EN COURS DE SAISON, et c'est la seule chose qui remet
     le classement de ton poste à zéro au milieu d'une année : elle peut sauver une
     saison morte comme tuer une saison réussie. Une saison sur huit, et la journée
     est tirée à l'avance pour que la famille puisse s'ouvrir à partir de là. */
  S.nouveauCoachJ = Math.random() < .125 ? ri(6, 26) : 0;
  S.nouveauCoachFait = false;
  /* L'EUROPE SE GAGNE SUR LE TERRAIN, ET DANS L'ÉLITE. On y va si on a fini sur le
     podium de la première division ou si on a gagné la coupe — un podium de Ligue 2
     ne l'ouvre pas, il ouvre la montée. */
  const podium = S.bilan && S.bilan.pos <= 3 && S.bilan.division === 1;
  const coupeGagnee = S.coupe && S.coupe.gagnee;
  const enElite = (S.division || 1) === 1;
  S.euro = { engage: !!(enElite && (podium || coupeGagnee)), vivant: true, tour: 0, pts: 0, hist: [], gagnee: false };
  S.coupe = { vivant: true, tour: 0, hist: [], gagnee: false };
  if (S.euro.engage) jrn('euro', `L'Europe cette saison : ${podium ? `${S.bilan.pos}ᵉ la saison passée` : 'vainqueurs de la Coupe'}.`);
  S.moi.an0 = { tech:S.moi.base.tech, phys:S.moi.base.phys, ment:S.moi.pic.ment, spec:S.moi.base.spec };
  S.journee = 0; S.arrets = 0; S.sansJouer = 0; S.cartons = 0;
  S.semaine = null; S.seance = null; S.match = null; S.dernier = null; S.arret = null;
  S.eqJour = null; S.bilan = null; S.offres = null; S.vuArrets = {}; S.recentArrets = [];
  S.mercato = null; S.mouvDiv = null;
  jrn('debut', `${S.annee}-${S.annee + 1}, ${S.moi.age} ans, ${S.club.nom}, ${nomDivision()}.`);
  S.ecran = 'semaine'; sauver(); rendre();
}

/* Le bout de la route. Une carrière doit laisser une trace : c'est ici qu'on la lit. */
function finCarriere(raison){
  if (S.stats && S.journee >= JOURNEES && S.bilan) { /* déjà comptée par vieillir() */ }
  S.fin = { raison, age: S.moi.age, annee: S.annee };
  jrn('fin', `Fin de carrière à ${S.moi.age} ans.`);
  S.ecran = 'carriere'; sauver(); rendre();
}
/* Raccrocher quand on l'a décidé. L'âge et le téléphone qui ne sonne plus tranchaient
   déjà à sa place ; ici il tranche seul. **Deux temps sur le même bouton** — une
   carrière de vingt saisons ne s'efface pas sur un clic de travers — et aucune boîte
   de dialogue : un bouton suffit. Tout autre geste de l'écran annule (`S.raccroche`
   est remis à zéro à l'ouverture des offres, en refusant, et en démarrant la saison). */
function raccrocher(){
  if (!S.raccroche){ S.raccroche = 1; sauver(); return rendre(); }
  finCarriere('tu as raccroché');
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
  /* La sélection part de 0 et se gagne : les deux premières bandes disent qu'il
     n'y a rien, pas qu'on t'a écarté. */
  selection: ["Personne ne t'a jamais regardé de là-haut.", "Ton nom n'est pas sur leur liste.",
    "On t'a cité une fois, sans suite.", "Tu es dans leur carnet.",
    "Le sélectionneur te suit, et ça se sait.", "Tu es dans les plans de la sélection."],
};
/* CE QUE CHAQUE JAUGE CHANGE, en une proposition, accrochée à la phrase. La règle
   du projet — chaque chiffre affiché doit avoir une conséquence visible — ne vaut
   que si la conséquence est **écrite** : trois de ces quatre jauges viennent d'être
   rebranchées, et sans cette ligne le joueur n'aurait aucun moyen de le savoir. */
function pourquoiLien(lien){
  /* Les seuils sont ceux du moteur, pas des seuils d'écriture : 64 est la valeur
     au-dessus de laquelle le club passe l'éponge sur l'âge, 28 celle sous laquelle
     il ne prolonge pas quoi qu'il arrive. Une phrase qui dirait autre chose que ce
     que le code fait serait pire qu'une jauge muette. */
  if (lien === 'club'){
    const v = S.liens.club;
    return v >= 64 ? "Si l'âge ou une saison creuse te rattrape, ils passeront l'éponge — et ils paieront."
      : v >= 45 ? "C'est ce qui décidera de juin, et de ce qu'ils mettront sur la table."
      : v >= 28 ? "Ils ne passeront rien : une saison creuse, et c'est fini."
      : "À ce niveau-là, ils ne prolongeront pas.";
  }
  if (lien === 'supporters'){
    // ce qu'ils valent vraiment : (v − 50) × .034, quand le terrain vaut 2,4
    const v = S.liens.supporters;
    return v >= 72 ? "À domicile, ils vous portent : un demi-terrain de plus."
      : v >= 56 ? "À domicile, ils poussent un peu."
      : v >= 44 ? "À domicile, ça ne pèse presque rien."
      : "À domicile, le stade vous pèse plus qu'il ne vous porte.";
  }
  /* Depuis que la convocation existe, la jauge fait deux choses : elle ouvre des
     clubs, et elle décide de ta place dans la liste. Les seuils sont ceux de
     `statutSelec()` et de la sortie du groupe (38), pas des seuils d'écriture. */
  if (lien === 'selection'){
    const v = S.liens.selection || 0, dans = (S.selec || {}).dedans;
    const caps = (S.selec || {}).caps || 0;
    if (dans) return (v >= 75 ? "Tu es titulaire en sélection" : v >= 58 ? "Tu joues souvent en sélection" : "Tu y vas, mais tu regardes beaucoup")
      + `${caps ? ` (${caps} sélection${caps > 1 ? 's' : ''})` : ''}. `
      + (v < 45 ? "Sous ce niveau-là, la liste finira par sortir sans toi."
         : "Les trêves coûtent deux matchs et le voyage, et samedi arrive quand même.");
    return v >= 55 ? "Assez haut pour qu'ils appellent. Les trêves te prendront des jambes."
      : v >= 45 ? "Ça t'ouvre des clubs qui ne t'appelaient pas, pas encore la liste."
      : "Trop peu, encore, pour qu'un club s'en serve.";
  }
  return null;
}
function dire(lien){
  if (lien === 'vestiaire') return MOTS.vestiaire[bande(vestiaire())];   // la moyenne des lignes
  return MOTS[lien] ? MOTS[lien][bande(S.liens[lien])] : '';
}
/* « Le fond, le geste, la tête, comme appellation, c'est pas très clair, et je
   crois ne pas me souvenir de ce que ça représente » (le propriétaire,
   27/09/2026). Les axes ont déjà un nom sur l'écran de la semaine : technique,
   physique, mental. Le jeu s'en tient à ceux-là. Ici, ce que le corps sait
   faire — tenir un match et récupérer — s'appelle simplement ton corps. */
/* La phrase dit une **capacité**, jamais l'état du moment : « Ton corps suit, et
   récupère entre deux matchs » tombait à côté d'une fraîcheur à 9 % et les deux se
   lisaient comme une contradiction. Ce qu'on décrit ici, c'est ce que ton corps sait
   encaisser — la fraîcheur, juste au-dessus, dit où tu en es aujourd'hui. */
function direFond(){ const v = physique();
  return v > 68 ? "Tu encaisses tout : les matchs s'enchaînent et une séance ne te coûte presque rien."
    : v > 56 ? "Tu récupères vite, et une séance de plus ne te fait pas peur."
    : v > 44 ? "Tu récupères normalement. Une grosse semaine se sent le samedi."
    : v > 34 ? "Tu récupères lentement, et chaque séance se paie plein tarif."
    : "Ton corps ne suit pas : tu récupères mal, et tu te blesses souvent."; }
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
/* Tu comptes dans les absents quand c'est toi qui manques : « Ferreira et Barbosa
   manquent ce samedi » à côté de « toi à l'infirmerie » se lisait comme un oubli. */
function direInfirmerie(){
  const a = groupe().filter(x => !x.dispo);
  const moiOut = S.etats.blessure > 0 || S.etats.suspension > 0;
  const n = a.length + (moiOut ? 1 : 0);
  if (!n) return "Tout le monde est valide.";
  const noms = (moiOut ? ["Toi"] : []).concat(a.map(x => x.nom));
  const qui = noms.slice(0, 2).join(' et ');
  if (n === 1) return moiOut ? "Tu manques ce samedi." : `${qui} manque ce samedi.`;
  if (n === 2) return `${qui} ${moiOut ? 'manquez' : 'manquent'} ce samedi.`;
  return `${n} absents, dont ${moiOut ? `toi et ${a[0] ? a[0].nom : ''}`.trim() : qui}.`;
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
  if (S.etats.blessure > 0) return "Tu ne joueras pas samedi. La place que tu laisses, un autre la prend.";
  if (S.etats.suspension > 0) return "Suspendu. Tu regarderas les autres tenir ton poste.";
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
/* La case BLESSURE disait « Rien ne te fait mal » pendant que la hiérarchie du
   poste, dix lignes plus haut, te marquait « à l'infirmerie » (le propriétaire,
   27/09/2026, capture à l'appui). Elle parlait de l'usure du corps, jamais de
   l'arrêt en cours. Elle dit maintenant les deux, et l'arrêt d'abord. */
function direCorps(){
  const v = S.etats.corps;
  /* Les quatre bandes sont posées là où le corps passe vraiment, maintenant qu'il
     descend : mesuré sur 24 carrières entières, 93 à vingt ans, 87 à vingt-huit,
     80 à trente et un, 71 à trente-sept. Les quatre se lisent donc dans une carrière,
     et plus tôt pour qui joue blessé. */
  const usure = v > 89 ? "Rien ne te fait mal." : v > 80 ? "Quelques douleurs, rien de sérieux."
    : v > 71 ? "Tu récupères moins vite qu'avant." : "Ton corps commence à te lâcher.";
  if (S.etats.blessure > 0)
    return `À l'infirmerie : ${S.etats.blessure} journée${S.etats.blessure > 1 ? 's' : ''} encore. `
      + (v > 85 ? "Le reste va bien." : usure);
  if (S.etats.suspension > 0)
    return `Suspendu ${S.etats.suspension} match${S.etats.suspension > 1 ? 's' : ''}. ` + usure;
  return usure;
}
function direJambes(){ const v = S.etats.fraicheur;
  return v > 88 ? "Tu sors du match sans une courbature." : v > 72 ? "Les jambes ont tenu."
    : v > 58 ? "Tu as fini sur les nerfs." : v > 20 ? "Tes jambes ont pris cher."
    : v > 0 ? "Tu n'avais plus rien à donner sur la fin."
    : "Tu as fini le match en dette. Il n'y a plus rien à prendre."; }
/* Un état que le moteur peut atteindre doit pouvoir se dire : sous zéro, on joue sur
   la réserve, et l'écran le nomme pour que la blessure qui suit ne sorte pas de nulle
   part. La phrase dit aussi ce que ça change — on sort tôt — puisque c'est désormais
   le seul effet de la fraîcheur sur ta place. */
function direFraicheur(){ const v = S.etats.fraicheur;
  return v > 88 ? "Frais" : v > 72 ? "En jambes" : v > 58 ? "Émoussé"
    : v > 20 ? "Vidé — le coach te sortira tôt"
    /* Sa formulation, 01/10/2026 : « tu n'as qu'une heure dans les jambes » plutôt
       que « tu ne finiras pas le match ». Elle dit la même chose en donnant la
       mesure, et elle colle à ce que le moteur fait — à ce niveau de fraîcheur le
       changement avance de vingt-deux minutes, donc on sort vers l'heure de jeu. */
    : v > 0 ? "À bout — tu n'as qu'une heure dans les jambes"
    : "Dans le rouge — tu joues sur la réserve, et ça va casser"; }
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
    /* MIGRATION 10 → 11 : le mercato. L'échelon inférieur se fabrique à partir des
       clubs restés dehors, et l'effectif fantôme de ton club est remplacé par le
       tien au premier `syncClubSq()` (appelé par `demarrer()`). */
    if (d.v === 10){
      d.division = 1;
      d.bonusOffres = 0;
      if (d.ligue && !d.ligue.autre){
        const dk = typeof decadeKey === 'function' ? decadeKey(d.annee) : '10';
        const dedans = d.ligue.equipes.map(e => e.nom);
        const gros = (typeof FR_CLUBS !== 'undefined' ? FR_CLUBS : [])
          .filter(c => (c.s[dk] || 0) >= 2 && !dedans.includes(c.n)).map(c => ({ nom:c.n, s:c.s[dk] }));
        const petits = (typeof FR_LOWER !== 'undefined' ? FR_LOWER : [])
          .filter(n => !dedans.includes(n)).map(n => ({ nom:n, s: rnd(-1.7, 1) }));
        const pris = new Set();
        d.ligue.equipes.forEach(e => (e.sq || []).forEach(j => pris.add(j.n)));
        d.ligue.autre = [...shuffle(gros).slice(0, 3), ...shuffle(petits).slice(0, 15)].map(x => {
          const ancre = clamp(52 + x.s * PENTE_CLUB, 44, 74);
          const pot = clamp(ancre + rnd(-3, 3), 44, 78);
          const sq = creerEffectifAdverse(clamp(pot + rnd(-3, 3), 42, 80), pris);
          return { nom:x.nom, ancre: dec1(ancre), pot: dec1(pot), sq, force: forceEffectif(sq) };
        }).sort((a, b) => b.force - a.force);
      }
      d.v = 11;
    }
    /* MIGRATION 11 → 12 : la vie et l'argent. Une carrière commencée avant n'a ni
       compte, ni salaire, ni personne derrière elle — on lui donne des proches au
       milieu et un compte vide ; le salaire se calcule au chargement (`demarrer()`),
       parce qu'il dépend de `niveau()` et que l'état n'existe pas encore ici. */
    if (d.v === 11){
      d.argent = d.argent || 0;
      d.vie = d.vie || { proches: 58, chantiers: [], gagne: 0, gagneAvant: 0 };
      d.v = 12;
    }

    /* MIGRATION 12 → 13 : les trente et un faits de match, et les quatre jauges.
       Un fait de match a changé de forme (`opts` avec `ok`/`ko` au lieu de deux
       textes) : une sauvegarde prise **pendant** un match porte les anciens objets
       dans `S.match.moments`, et l'écran du moment les lirait à vide. On rend donc
       la journée en cours au lundi — on perd un match, jamais une carrière. Le reste
       n'a rien à reconstruire : `liens.selection` existait déjà à 0, et les trois
       autres jauges avaient leur valeur, elles n'avaient simplement aucun lecteur. */
    if (d.v === 12){
      if (d.match || d.faitAnnexe || d.ecran === 'moment' || d.ecran === 'resultat'){
        d.match = null; d.faitAnnexe = null; d.annexe = null; d.momentIdx = 0;
        d.eqJour = null; d.arret = null; d.semaine = null; d.seance = null;
        d.ecran = 'semaine';
      }
      d.v = 13;
    }
    /* MIGRATION 13 → 14 : les arrêts de la page de décisions. Presque rien à
       reconstruire — les nouveaux états sont lus partout avec un défaut (`||`),
       donc une sauvegarde v13 les prend à zéro sans broncher. La seule exception
       est `vie.salaire0`, qui sert de repère au « premier gros salaire » : sans lui
       la famille ne pourrait jamais se déclencher. On le pose au salaire **actuel**,
       donc l'écran arrivera quand il aura doublé à partir d'aujourd'hui — plutôt
       que de tomber tout de suite sur une carrière déjà avancée. */
    if (d.v === 13){
      d.promesses = []; d.brassard = 0; d.piqure = false; d.prolonge = false; d.reprise = 0;
      d.nouveauCoachJ = 0; d.nouveauCoachFait = false;
      if (d.vie){ d.vie.salaire0 = d.salaire || 0; d.vie.grosFait = false; d.vie.prochesPlancher = 0; }
      d.v = 14;
    }
    /* MIGRATION 14 → 15 : la sélection devient un sous-système. La jauge existait
       déjà (elle convergeait et ouvrait des clubs) ; ce qui manque à une sauvegarde
       v14, c'est le groupe et les compteurs. On n'y met personne d'office : être
       dans la liste se décide par l'arrêt `selection`, qui s'ouvrira comme pour
       une carrière neuve. */
    if (d.v === 14){
      d.selec = { dedans:false, caps:0, buts:0, passes:0, notes:[] };
      d.selecVue = null;
      if (d.carriere){ d.carriere.caps = d.carriere.caps || 0; d.carriere.butsSelec = d.carriere.butsSelec || 0; }
      d.v = 15;
    }
    /* La qualité et le défaut se découvrent désormais à la création : une carrière
       commencée avant ne les a peut-être pas encore vus, et plus rien ne les lui
       montrerait. On les lui donne. */
    if (d.moi && d.moi.qual){ d.moi.qual.vu = true; d.moi.def.vu = true; }
    if (d.v !== VERSION) return null;
    return d;
  } catch(e){ return null; }
}
function effacer(){ try { localStorage.removeItem('ac2'); } catch(e){} S = null; }
