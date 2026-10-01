# Absolut Coach

Jeu de simulation de carrière football, 100 % statique (HTML, CSS, JavaScript sans build), en français, inspiré des mécaniques d'Absolut Director. Deux modes : entraîneur·euse et joueur·euse, à travers sept époques (1958 → aujourd'hui) avec clubs et joueurs réels.

## Intention (dite par le propriétaire, 21/09/2026)

**Vivre une carrière, dans un contexte de football.** L'équilibre entre les deux est le sujet,
et il doit rester **impossible à trouver** : devoir sacrifier quelque chose est le plaisir du
jeu, pas son défaut. Référence assumée : *Detroit: Become Human*.

- **On ne fait rien, on choisit.** Le jeu est une suite de décisions face à des interlocuteurs
  et à une situation qui évolue. Il n'exige aucune manipulation. *Composer une équipe,
  remplacer soi-même un blessé : hors sujet.* Décider quoi faire d'un blessé (le remplaçant,
  le jeune, le faire jouer quand même, déléguer à l'adjoint), où porter l'effort entre deux
  compétitions, comment aborder un adversaire qui joue de telle manière : **c'est ça, le jeu.**
- **Chaque décision a un effet court terme et un effet long terme**, et les deux doivent se
  voir. Faire jouer le remplaçant, c'est priver le jeune d'une occasion ; ça se paiera.
- **Après les décisions vient le temps où l'on souffle** et où l'on lit ce qu'elles ont produit.
  Ce moment doit être beau et distinct — c'était la force d'Absolut Director. La fin de saison
  est un **écran-bilan** (réussites, échecs, qui veut partir, qui veut rester, la famille, le
  club, le président, les supporters), pas une liste de plus.
- **Un écran ne doit pas ressembler au précédent.** La répétition visuelle tue le rythme.
- Une session dure **30 min à 1 h par jour**. Environ **dix moments de décision par saison**
  est le bon rythme (calibré et validé).
- Le football est un terrain familier pour le propriétaire : **les chiffres ne le gênent pas**,
  tant qu'ils servent une décision. (Un jeu de foot *sans aucune statistique*, rien que des
  décisions, est une piste qui l'intrigue — à garder en tête, pas à appliquer.)
- **Une carrière doit laisser une trace.** Aujourd'hui elle en laisse trop peu : « on ne
  s'attache pas vraiment aux carrières, c'est un peu sans effet sauf quand c'est le jackpot. »
  C'est le problème de fond à résoudre.
- Le jeu est fait **pour le propriétaire seul** : pas de tutoriel, pas d'onboarding public.
- Le **mercato est sa partie préférée** du mode entraîneur·euse. Le mode joueur·euse doit
  atteindre le même niveau, **mais autrement** : il lui manque son équivalent du mercato.
- Décisions tranchées : la **coupe doit devenir jouable** (comme suite de décisions, pas de
  matchs à opérer).

## Cartographie des deux modes (26/09/2026)

Demandée par le propriétaire : « il y a pas mal de choses construites à droite à gauche et ça manque
de cohérence… j'aimerais qu'on cartographie les deux modes pour identifier les trous, qu'on voie ce
qu'on a ajouté, comment ça s'est intégré, si ça a pris la place de quelque chose qui n'est plus
pertinent, et qu'on redéfinisse l'impact des jauges. » La carte lue est publiée ici :
**https://claude.ai/artifact/Nqe4MTf49wGfaB3qCHHroU**

Mesuré sur le code en production (`c27e4ea`), quatre carrières par mode, 24 saisons chacune, rythme
temps forts : **37,3 décisions par saison en mode entraîneur·euse** (dont 29,1 rendez-vous tirés
dans 19 familles) contre **22,8 en mode joueur·euse**, dont **14,0 la même semaine d'entraînement**
— 61 % des décisions du joueur·euse sont un écran unique à cinq options.

**Les orphelins trouvés** (chacun vérifié dans le code, pas dans ces notes) :
- **L'écran de mi-temps est mort** : `coachKickoff()` n'est plus appelé qu'en mode automatique, sa
  branche manuelle pose encore `pendingChoice='halftime'`, il n'existe aucune fonction de rendu et
  la table de dispatch ne le connaît pas. Les quatre `HALFTIME_CHOICES` sont injouables.
- **Management (`stats.technique`, mode entraîneur·euse) n'a aucune lecture mécanique** : son seul
  consommateur était `ctx.management` dans le choix « recadrer le vestiaire » de la mi-temps — mort,
  et jamais alimenté de toute façon. Huit options de rendez-vous la modifient encore et la barre
  latérale promet « vestiaire, jeunes, présidents ».
- **`coachAlertsAfter()` tourne à vide** : `state.alerts` n'est plus lu côté entraîneur·euse (c'était
  le déclencheur d'arrêt d'avant les rendez-vous). Vivant et utile côté joueur·euse.
- **Les trois libellés de `TEMPOS` décrivent l'ancien jeu** (« chaque journée se joue », « 34 matchs
  par saison », « avec ta compo ») : en mode entraîneur·euse le rythme ne règle plus que le nombre de
  rendez-vous par phase (10 / 8 / 4). Ils restent exacts en mode joueur·euse.
- **Le brassard ne se choisit plus** (posé automatiquement), mais reste lu par le rendez-vous du
  capitaine — l'une des trois familles jamais tirées (avec « deux fronts » et « le symptôme »).
- **`state.focus` et `state.lastFocus`** sont morts dans les deux modes (restes du système remplacé
  par les carrefours).
- **L'argent du joueur·euse** s'accumule dans `totals.earned`, s'affiche, et n'a aucune conséquence.
- **Supporters (entraîneur·euse)** ne fait rien d'autre que +2 de pression par phase sous 3,5 ;
  **Vestiaire (joueur·euse)** n'a aucun effet sur le joueur lui-même.

**Les trous, classés** : (1) le mode joueur·euse n'a aucun interlocuteur — 19 familles contre zéro ;
(2) 61 % de ses décisions sont le même écran ; (3) quatre indicateurs ne servent à rien ; (4) le
bilan de fin de saison n'existe qu'en mode entraîneur·euse ; (5) aucune décision en cours de match ;
(6) la coupe est simulée en un coup dans les deux modes ; (7) trois familles de rendez-vous sont
injouables ; (8) les trois attributs du joueur·euse sont un seul effet à trois noms.

**En attente de décision, non livré** (branche de travail) : le départ des attributs à 5,0 et la
qualité/défaut tirés au sort. Mesuré : les saisons à zéro match disparaissent (5 carrières sur 12 en
première saison → 0) mais le niveau final passe de 7,1 à 8,1 et les titres de 3,4 à 5,6 par
carrière. Baisser le potentiel (7,8-9,6 → 6,4-8,8) n'y change presque rien : ce n'est pas le bon
levier, et il ne se trouvera pas à l'aveugle.

## Le moteur 2.0 (`v2/`, 27/09/2026)

Après la cartographie rejetée, le propriétaire a demandé de repenser le jeu de A à Z, puis a validé
sept verrous, puis les coquilles vides, puis : « **Vas-y pour le moteur** ». Livré ici : **une saison
complète jouable au vrai rythme**, sans contenu de vie ni progression d'une saison sur l'autre —
juste pour qu'il sente les dix secondes par match. `v2/index.html`, servi à **/v2/** ; la version 1.0
reste intacte à la racine. Les deux sont copiées par `vercel.json` et `.github/workflows/pages.yml`.

- **Les sept verrous tenus par le code** : (1) aucune valeur de jauge n'arrive à l'écran — le moteur
  travaille sur 0-100 et ne sort que des phrases (`dire()`, `direCorps()`, `direFraicheur()`,
  `direJambes()`, `direStaff()`) et des directions (`m.mvt`) ; les seuls chiffres affichés sont le
  score, la note de match, les minutes, les journées et le classement ; (2) un match se joue en trois
  clics ; (3) le match est simulé, pas opéré ; (4) quatre axes (`tech`, `phys`, `ment`, `spec`) ;
  (5-7) le journal (`S.journal`) est la seule mémoire, tout y passe.
- **Fichiers** : `v2/moteur.js` (état, ligue, axes, semaine, arrêts, match, journal, sauvegarde
  `localStorage` clé `ac2` avec garde de version), `v2/ecrans.js` (tous les écrans, `rendre()`
  dispatche sur `S.ecran`), **`v2/coach.js`** et **`v2/ecransCoach.js`** (le mode entraîneur·euse,
  qui réutilise la ligue, le marché, la coupe, l'Europe, le film et les notes de `moteur.js` et
  n'écrit que ce qui change), `v2/style.css` (repris des coquilles validées), `v2/coquilles.html`
  (les maquettes, gardées comme référence). `S.mode` (`'joueur'` ou `'coach'`) est choisi à la
  première étape de la création et décide de tout le reste.
- **Trois couches par axe** : `base` (la trace), `boost` (l'acquis récent, divisé par deux à chaque
  match), `plafond` (jamais lu par le joueur). `plafondReel(a) = min(plafond natif, moyenne des
  autres axes + 25)` : on n'a pas un physique à 10 avec un mental à 1.
- **Le poids d'une séance, mesuré puis calibré.** Première version : `base += .25 × r × marge × 4`
  où `r = tirage × marge` — le produit double par la marge donnait **+0,8 de base sur 34 semaines
  tout donné sur un axe**, autant dire rien. Corrigé en `BOOST_SEANCE`=9 et `TRACE_SEANCE`=.55
  appliqués à `r`. Mesuré après, six politiques, huit saisons chacune : **aucune ne domine.**
  Tout donner sur l'axe du poste (`tech` pour un milieu) donne la plus grosse trace (**+7,3**) mais
  fait jouer moins (18,9 matchs) ; ne jamais travailler fait jouer le plus (19,5 matchs, 15,4
  titularisations) et ne laisse **rien** ; deux séances puis un repos est le meilleur compromis
  (22,0 matchs, 14,9 titularisations, +4,5 de trace). Travailler le mauvais axe **et** la semaine la
  plus lourde est puni deux fois (14,1 matchs, 4,0 titularisations).
- **Le compte rendu de séance jugeait le mauvais nombre** : il lisait le rendement `r`, qui près du
  plafond ne dépasse jamais 0,5, et disait donc « pour rien » presque à chaque fois. Il juge
  maintenant le **tirage** (0,4 / 1 / 1,6) ; la proximité du plafond est une phrase à part. Mesuré :
  4 excellentes / 11 correctes / 7 pour rien par saison.
- **Le championnat avait douze clubs à trois points les uns des autres** (`FILLERS` posés à `s:0`) :
  la place finale était un tirage au sort. Chaque club de complément prend maintenant un rang propre
  (`s: rnd(-1.7, 1)`). Un club de bas de tableau finit entre la 12ᵉ et la 15ᵉ place.
- **La note ne récompensait que ce qui se marque** : un gardien finissait à 6,2 de moyenne quand un
  attaquant tournait à 6,8, et cet écart se propageait (la note nourrit la confiance du coach, donc
  le temps de jeu). Le but encaissé compte maintenant pour les postes de derrière (+1 sur un clean
  sheet, +0,35 à un but, −0,5 à partir de quatre). Mesuré après, seize saisons par poste :
  **6,3 / 6,4 / 6,5 / 6,8** et 18 à 22 matchs. Et un gardien ne délivre plus trois passes décisives
  par saison (`chancePasse` par poste).
- **L'origine est un PRESET, et il tient toute la carrière** (le propriétaire, 27/09/2026 :
  « si avant ça tout est à 50-50-50, choisir *arrivé de l'étranger* fait que je commence avec 60 en
  mental, 60 en physique et 40 en technique… c'est mon preset, ça me tient sur toute ma carrière,
  entre guillemets je peux pas descendre, j'ai toujours eu un gros mental »). Deux conséquences dans
  le code : (1) les trois origines sont en **valeurs rondes — deux axes à 60, un à 40**, le quatrième
  (celui du poste) à 50 ; rien d'autre, pour que le départ se lise d'un coup d'œil ; (2) `S.moi.socle`
  est posé à la création (`min(50 + origine, base de départ)`) et **`bougerAxe()` est la seule porte
  par laquelle un axe bouge** : une hausse est libre jusqu'au plafond, une baisse s'arrête au socle.
  L'usure, quand elle viendra, passera par là et n'aura rien de plus à savoir.
  Il avait d'abord recalé le contenu des trois : « le terrain du quartier a la technique en bas alors
  que c'est le physique qui est plus juste ; pour l'étranger c'est l'inverse, le mental en haut et la
  technique en bas, et agent en positif à la place de vestiaire en négatif ; tu as mis agent dans la
  grande académie, mets le physique à la place et mets vestiaire en positif. » Sa lecture du football
  est plus juste que la mienne : **la rue donne le geste, pas le corps préparé**, et **partir à six
  mille kilomètres est d'abord du mental**. Académie = technique + physique, mental à 40, vestiaire ;
  quartier = technique + mental, physique à 40, le stade ; étranger = mental + physique, technique à
  40, l'agent. **Un choix que j'ai fait seul** : le mental de l'académie en défaut — sans lui elle
  n'avait aucun défaut et dominait les deux autres ; c'est l'axe que dit déjà son sous-titre.
  La **qualité et le défaut tirés au sort restent libres** et peuvent tomber sur n'importe quel axe,
  y compris sur le point fort de l'origine : demandé explicitement (« avoir des défauts ça rajoute un
  peu plus de flou… sinon on peut un peu trop optimiser si on connaît ce qui fonctionne »). Le socle
  est borné par le départ réel, donc un défaut qui passe sous lui ne le contredit pas.
- **L'arbitrage de la semaine : l'immédiat contre la trace.** Le banc d'essai a trouvé un défaut que
  je n'avais pas vu — **« toujours le mental » gagnait partout** pour un joueur formé en académie
  (21,4 matchs, 15,1 titularisations et +8,3 de trace, contre 18,8 et +2,7 pour la technique), donc le
  choix de la semaine n'en était pas un. Deux causes séparées, chacune corrigée et re-mesurée :
  1. **Les deux couches répondaient à la même chose.** `boost` et `base` étaient tous deux
     proportionnels au rendement `r = tirage × marge`, donc travailler son point faible gagnait sur
     les deux tableaux. Désormais `boost += BOOST_SEANCE × tirage × acquis` (ce que tu **tiens déjà**)
     et `base += TRACE_SEANCE × tirage × marge` (la **distance au plafond**). Travailler ta force
     répond tout de suite et ne monte plus beaucoup ; travailler ta faiblesse ne se voit pas samedi
     mais reste. `BOOST_SEANCE` retombe de 9 à 3,5 puisqu'il ne passe plus par la marge. Le compte
     rendu de séance dit laquelle des deux tu viens de faire, sans chiffre.
  2. **La séance la moins chère gagnait quoi qu'elle travaille** : la vidéo coûtait −3 de fraîcheur
     quand les autres coûtaient −6 à −11. Les quatre sont alignées (−8 / −11 / −7 / −8).
- **Le fond, la contrepartie du travail physique.** Une fois les coûts alignés, le banc montrait
  « toujours le physique » **dominé partout** (13 à 15 matchs, 24 % de fraîcheur, et pas la meilleure
  trace) : la séance la plus chère n'avait aucune contrepartie. `S.etats.fond` est la réserve que
  seul le travail physique construit (+3,5 par séance, +1 pour la séance de poste, −1,5 par journée) :
  on laisse moins de jambes dans un match (`×(1 − fond×.0022)`), on récupère mieux entre deux journées
  (`+ fond×.05`) et on se blesse moins (`.05 − fond×.0006`, plancher .012). Lisible en mots dans « Ta
  situation » (`direFond()`), jamais en chiffre. Premier calibrage trop fort (+7 par séance) : le
  physique devenait le meilleur choix partout, 23,3 matchs et 96 % de fraîcheur. Mesuré après
  calibrage, 30 saisons par ligne, trois croisements origine × poste : **aucune politique ne domine**,
  et le schéma est le même aux trois — celle qui fait le plus jouer (lever le pied, 17 à 19 matchs)
  laisse presque rien (+0,6), celle qui laisse le plus de trace (l'axe faible, +8 à +9) fait jouer
  deux à quatre matchs de moins, et « deux séances puis un repos » est au milieu (18 à 21 matchs,
  +4 de trace).
- **Chaque axe a son effet long terme, et ce n'est pas « du niveau »** (retour du propriétaire,
  27/09/2026, après lecture du banc : « lorsqu'on travaille le mental, ça nous avantage plus parce
  que c'est moins fatigant… ce qu'il faut, c'est que ce qu'on peut gagner avec le mental soit un peu
  moins important que pour le reste. Et le physique qui consomme beaucoup de fraîcheur, il faut qu'au
  cours de l'année on regagne de la fraîcheur grâce à lui, sur la vitesse de récupération. Pour la
  technique, à long terme, ça peut être sur notre capacité à faire la bonne décision sur les faits
  de match. Pour le mental… encaisser les choix du coach, les faits de match, l'impact de tout ce qui
  est hors football »). Sa lecture est meilleure que la mienne : tout n'allait que dans le niveau,
  donc les quatre séances se distinguaient seulement par leur coût. Désormais **une séance = un coût
  de fraîcheur maintenant, un effet nommé plus tard** :
  | axe | ce que ça coûte samedi | ce que ça construit |
  |---|---|---|
  | **Physique** (−11) | le plus cher | **le fond** : on récupère plus vite, on laisse moins de jambes dans un match, on se blesse moins |
  | **Technique** (−8) | cher | **le geste** : `choisirMoment()` ajoute `(tech−50)×.005` à **tous** les faits de match (et `×.009` quand le fait est déjà technique, sans double compte) |
  | **Au poste** (−8) | cher | **ta place** : `monStatut()` ajoute `(spec−50)×.09`, en plus du poids que `spec` a déjà dans `niveau()` |
  | **Mental** (−7) | le moins cher | **encaisser** : `encaisse()` (−1 à +1) amortit l'aléa **défavorable** de la note (`aleaNote()`), la chute de confiance du coach après un mauvais match, et les effets négatifs des arrêts sur les liens. Jamais les gains. |
  Et `rende` fait suivre la récompense au coût, exactement comme il le demandait : physique 1,15,
  technique et poste 1, **mental 0,85**. Le compte rendu de séance compare au rendement de sa propre
  séance, pas à un barème commun.
  Deux coefficients ont dû être relevés après une première mesure : la technique à `.0028` ne
  changeait la réussite des faits que de trois points, invisible dans le bruit (et donc pour le
  joueur) ; le poste à `.055` ne pesait que +0,28 de crédit face à un seuil à 1,5. Mesuré après,
  40 saisons par ligne, trois croisements : **aucune politique ne prend à la fois les matchs et la
  trace** — l'or des matchs va à « deux séances puis un repos » (18 à 21 matchs) et l'or de la trace
  à l'axe faible de l'origine (+8 à +10), et l'effet technique se voit enfin où il doit se voir
  (étranger attaquant, technique à 40 : **38 % de faits réussis** en la travaillant contre 30 à 34 %
  autrement). Le mental retombe à la moyenne quand il n'est pas l'axe faible (+3,9 contre +8,2 pour
  la technique chez l'étranger). Quatre phrases de plus dans « Ta situation » (`direFond()`,
  `direGeste()`, `direEncaisse()`, `direCorps()`), toujours sans un chiffre.
  **Limite connue du banc** : il ne joue qu'une saison, donc il sous-estime structurellement tout
  entraînement (le coût est immédiat, le gain différé). C'est écrit sous le tableau. Le vrai test
  viendra avec l'intersaison.
- **Ta place se dispute à des gens, pas à un nombre** (le propriétaire, 27/09/2026 : « pour le poste,
  ce qui peut être plus juste, c'est de se dire que plus on est fort au poste, plus on a de chances
  d'être titulaire **par rapport à ses concurrents**, aux autres joueurs du même poste. C'est une
  stat que le coach peut prendre en compte »). `monStatut()` comparait `niveauJour()` à
  `S.club.force + rnd(-4,4)` — un nombre abstrait. Désormais `S.concurrents` porte **un rival pour un
  gardien, deux pour les autres postes**, chacun avec un nom, un niveau (le titulaire en place démarre
  2 à 7 points **au-dessus** de la force du club, le second est à portée), une forme qui dérive
  (`vivreConcurrents()`, rappel vers zéro, borné à ±5) et un risque de blessure (3,5 % par journée) —
  et une absence t'ouvre la porte, ce qui est une des vraies façons d'entrer dans le onze.
  `valeurAuPoste()` rassemble ce que le coach regarde (niveau du jour, `spec` à `.09`, sa confiance,
  l'âge) et se mesure au meilleur rival disponible : au-dessus tu joues, à moins de 2,5 ça se joue à
  pile ou face, au-delà de 8 tu n'es pas dans ses plans. `direPlace()` et `concurrenceHTML()` le
  disent par leur nom, sur l'écran de la semaine : « Bamba est largement devant toi · Ferreira est à
  l'infirmerie ». **Effet secondaire mesuré, et important** : « toujours lever le pied » n'est plus
  la meilleure politique nulle part (11 à 14 matchs, contre 15 à 18 pour « deux séances puis un
  repos ») — quand il faut dépasser quelqu'un, ne rien travailler te laisse derrière lui.
- **LE MENTAL EST UNE RÉSERVE QUI SE VIDE ET QU'ON RECHARGE** (le propriétaire, 27/09/2026, après
  avoir jugé ma première version invisible : « le mental doit encaisser tous les mauvais choix. Il y
  a un fait de match, je tire au lieu de faire la passe, ça me retire un point. Un fait extérieur au
  foot, une mauvaise nouvelle, je perds un point. **Si je veux les regagner, il faut que je
  m'entraîne.** Et plus le mental est fort, moins les événements ont d'effet »). Sa définition est
  meilleure que la mienne, qui amortissait un aléa (`aleaNote()`) que le joueur ne voit jamais.
  Trois règles, et une seule porte : `coutMental(pts, raison)`.
  1. **Il se dépense.** Un fait de match raté coûte 1,1 (1,8 si le moment était chaud), perdre le fil
     2, une note sous 5,6 coûte 1,7, un rouge 2,2, une blessure 2,2, et les arrêts qui portent un
     `axes.ment` négatif passent par la même porte. Chaque perte garde **sa raison**, affichée après
     le match : « Tu rumines : « Presser », à la 85ᵉ, un match que tu voudrais oublier. »
  2. **Plus il est haut, moins il descend** : `perte × (1 − clamp(encaisse(), −.5, .8))`. Le mental
     amortit sa propre usure, exactement comme il le demandait.
  3. **Seule la séance mentale le répare vraiment.** `S.moi.pic` retient le plus haut atteint par
     chaque axe ; tant que la réserve est sous son pic, la séance mentale rend `REPARE_TETE`=2,6 par
     séance au lieu des 0,2 de la trace ordinaire — **retrouver la tête qu'on avait est rapide,
     devenir plus solide qu'on ne l'a jamais été reste lent.** Une petite récupération naturelle
     (+0,12 par journée, jamais au-delà du pic) empêche la spirale sans rendre la séance inutile.
  **Deux pièges trouvés à la mesure, et comment ils ont été fermés** :
  - *La spirale.* Le mental comptait dans `niveau()` (jusqu'à .30 du poids d'un gardien), donc chaque
    coup dur faisait perdre la place, et ne plus jouer coûtait encore du mental : mesuré, **6 à 13
    matchs par saison au lieu de 15 à 18**, et « toujours le mental » redevenait la seule politique
    tenable. Le retirer complètement de `niveau()` était pire — il compensait l'axe faible de
    certaines origines, et un défenseur du quartier tombait à **4,5 matchs et 3,4 de moyenne**. La
    solution : **`niveau()` lit `pic.ment`** (ce que tu vaux quand tu vas bien) et la réserve du
    moment ne pilote que la pression, l'amorti et la lucidité. Les quatre poids du poste restent
    intacts, donc tout le calibrage antérieur aussi. Et **rester sur le banc ne coûte plus de
    mental** : c'était le bout qui refermait la boucle sur elle-même.
  - *Le calibrage croisé.* Récupération naturelle posée à +0,35 alors que les coûts venaient d'être
    divisés par deux : la réserve ne descendait plus du tout, aucune séance de réparation ne se
    déclenchait en une saison entière. Mesuré après correction (30 saisons par ligne) : sans
    entretien le mental perd **8 à 13 points** sur une saison ; « toujours le mental » le remonte
    au-dessus du départ avec **11,2 séances de réparation**, et ne domine pas pour autant (15,5
    matchs contre 17,3 pour « toujours ton poste »).
  Le **banc d'essai** sépare désormais les deux natures : la colonne **trace** ne compte que ce qui
  se construit (technique + physique + poste) et la colonne **tête** montre la réserve restante.
  Trois colonnes, trois gagnants différents — la tête à « toujours le mental » (67 contre 57-60), la
  trace à « toujours la technique » (+7,7), les matchs à « toujours ton poste » (15,8).
  Ce que la première version avait apporté et qui **reste** : un fait de match est `chaud` quand vous
  êtes menés après la 55ᵉ ou dans une fin à un but près, le contexte s'affiche avant le clic suivi de
  `direTete()`, la pression coûte 12 points de réussite amortis par le mental, et perdre le fil
  s'écrit dans le film du match.
- **Une première saison jouée par le propriétaire, et six corrections** (27/09/2026, en gardien :
  « franchement c'est pas mal, mais ça manque de contenu »). Chacune est traitée ci-dessous.
  1. **Un effectif nommé et stable.** `S.equipe` porte dix coéquipiers avec un nom, un poste, un
     niveau, un âge et une **relation** avec toi qui dérive d'une journée à l'autre ; l'un d'eux est
     un jeune qui `monte`. Sans eux, « un coéquipier progresse », « ça se tend avec ton attaquant »
     et les notes du match n'avaient personne de qui parler — `coequipier()` tirait un nom au hasard
     à chaque ligne, donc les gens changeaient d'un match à l'autre.
  2. **Douze familles d'arrêts au lieu de quatre, et une anti-répétition qui marche.** « L'événement
     du kiné apparaît un peu tout le temps » : `ouvrirArrets()` faisait `pick()` sur les familles
     applicables, sans mémoire, et celle qui l'est toujours sortait sans cesse. Deux garde-fous : les
     **trois derniers genres** sont écartés, et le tirage est **pondéré par le nombre de passages**
     (`1/(1+n)^1,8`). Les nouvelles familles viennent de ses exemples : `rival` (ton concurrent a fait
     une séance énorme — tu restes une heure de plus, tu vas lui demander, tu laisses couler),
     `jeune` (le gamin progresse — tu passes du temps avec lui ?), `tension` (ça se tend avec un
     coéquipier nommé, dont la relation est passée sous 44), `agent` (il t'appelle, il bouge ou il
     attend juin), `coachPlan` (la vidéo et le retard d'une demi-seconde), `capitaine` (la réunion
     sans le staff), `serie` (quatre matchs sans se reconnaître), `famille`, `supporters`. Les
     familles qui visent quelqu'un portent `sujet()` et leurs textes sont des fonctions qui le
     **nomment**. Mesuré, 50 saisons : **18,1 arrêts par saison**, douze familles vues, la plus
     fréquente à **13 %** et le kiné retombé à 5 %.
  3. **Les notes des coéquipiers.** « On ne connaît pas la note de ses coéquipiers, du coup on ne sait
     pas si on a fait un bon match par rapport à l'ensemble de l'équipe. » `notesEquipe(m)` note tous
     ceux qui ont joué, l'écran les classe, marque la tienne, et `m.jugement` tranche en une phrase
     (« Le meilleur des tiens ce soir », « Sous le niveau de tes coéquipiers »).
  4. **Les notes osent les extrêmes.** « On fait quasiment que des matchs corrects… on peut appuyer
     un peu plus sur l'impact des faits de match sur la note, avec un point en plus ou en moins. »
     Un fait de match vaut désormais **0,95** au lieu de 0,3 ; perdre le fil coûte 0,7. Mesuré sur 600
     notes : médiane **6,1**, dixième centile **4,6**, quatre-vingt-dixième **8,1**, et **15,5 % de
     matchs sous 5,0** contre **17,5 % au-dessus de 7,5**. Il y a enfin des soirs de gala et des soirs
     qu'on veut oublier.
  5. **Un gardien ne rentre pas en cours de match.** « Normalement on ne fait pas de changement de
     gardien pendant les matchs. » Un gardien sur le banc a désormais **5 % de chances d'entrer**, et
     seulement pour la vraie raison : le titulaire sort blessé. Mesuré : 18 entrées sur 355 journées
     passées sur le banc.
  6. **« Ta situation » porte ses libellés.** « Les icônes, on ne sait pas toujours ce que ça
     représente, il y a plein d'infos. » Chaque ligne annonce de quoi elle parle (LE COACH, TON
     AGENT, TA PLACE, FRAÎCHEUR, TON FOND, TON GESTE, TA TÊTE…) et elles sont rangées en trois blocs :
     **les gens**, **ton corps**, **ton jeu**.
  Et, demandé dans la foulée : le **classement affiche les victoires, nuls et défaites** à côté des
  points, des journées et de la différence de buts.
  **Un piège d'outillage à retenir** : `io.open(p,'w')` vide le fichier *avant* que `write()`
  échoue — une erreur d'encodage a donc effacé `v2/ecrans.js` en entier. Les écritures de fichier
  passent maintenant par un temporaire suivi d'un `os.replace`.
- **Le contexte de l'équipe, et une fiche qui se lit** (le propriétaire, 27/09/2026, après la
  deuxième passe : « le bilan est cool. Ça manque un petit peu de clarté dans la page Ta situation.
  Et on a peu d'infos liées au reste de l'équipe : ça peut être cool d'avoir les moyennes de notes
  des autres joueurs, ce genre d'infos, ça apporte un peu plus de contexte à la situation »).
  - **`effectifHTML()`** : un repli qui liste tout le monde — coéquipiers, rivaux à ton poste et toi —
    **classé par moyenne de saison**, avec le nombre de matchs notés, l'âge, l'état de la relation en
    mots (`motRelation()` : proche, en bons termes, correct, un peu froid, tendu), et les marques
    utiles (*toi*, *ton poste*, *il monte*, *à l'infirmerie*). `notesEquipe()` accumule `sum`/`nb`
    sur chaque joueur pour que la moyenne existe. Ouvrable depuis l'écran de la semaine **et** depuis
    le bilan de fin de saison.
  - **« Ta situation » devient une fiche** : les libellés empilés au-dessus de chaque phrase
    hachaient la lecture. Désormais un nom à gauche, la phrase en face (une seule colonne sous
    430 px), trois sections — **Autour de toi**, **Toi**, **Ce qu'on sait de toi** — et le doublon
    de « Ta place » disparaît de l'écran de la semaine puisqu'il est dans la fiche.
- **L'ENTENTE SE JOUE PAR LIGNE, ET ELLE CHANGE LE FOOTBALL** (le propriétaire, 27/09/2026 :
  « il y a une petite réserve sur la relation avec chaque joueur individuellement. J'ai peur que ça
  fasse beaucoup et que ça ait peu d'impact… soit chaque ligne fait la moyenne de la relation du
  vestiaire, et du coup ça peut monter et descendre. Soit il n'y a pas vraiment de ligne, et ce
  qu'on fait a un impact global sur la note du vestiaire »). Sa réserve était juste : dix relations
  individuelles étaient **dix nombres invisibles** qui ne servaient qu'à déclencher un arrêt. Un
  effet purement global, lui, perd les noms — donc les histoires. La **ligne est le bon grain**, à
  une condition que j'ai posée en acceptant : qu'elle change **le football**, pas seulement une
  jauge. Sinon ce serait un nombre de plus.
  - **Trois ententes** (`S.lignes = {def, mil, att}`, 0-100, jamais à l'écran) ; **le vestiaire
    n'est plus une jauge, c'est leur moyenne** (`vestiaire()`). `S.equipe[].rel` a disparu.
  - **Un effet de match par poste, et pas le même** (`LIGNE_CLE`) : gardien et défenseur encaissent
    avec la **défense** (l'entente entre dans la seule espérance de buts encaissés, `ent × .08`,
    à comparer aux 2,4 de l'avantage du terrain) ; le milieu passe décisif s'il trouve l'**attaque**
    (`chancePasse × (1 + ent × .012)`) ; l'attaquant marque si le **milieu** le trouve (`chance`,
    même facteur). Mesuré, 60 saisons par ligne, entente forcée à 25 puis à 80 : le gardien passe de
    **2,03 à 1,91 but encaissé** par match et le défenseur de **2,05 à 1,80** ; le milieu de **7,9 à
    13,1 passes** décisives par saison pleine ; l'attaquant de **14,1 à 26,3 buts**. Sur l'amplitude
    réellement atteinte en jeu (5ᵉ-95ᵉ centile : **36 à 73**, moyenne 54, σ 11), ça fait ±20 %.
  - **Ce qui les fait bouger** : ta note nourrit **ta** ligne (±1,4), la défense répond de ce qu'elle
    encaisse, l'attaque de ce qu'elle marque, le milieu du résultat — que tu aies joué ou non ; une
    dérive d'une journée à l'autre avec rappel de 1 % vers 50, et les arrêts. Trois familles visent
    une ligne (`rival`, `jeune`, `tension`) : **31 % des arrêts** mesurés. `tension` se déclenche
    sur la ligne la plus basse (**sous 44 : 14 à 17 % des semaines**) et lui donne un visage, le plus
    ancien de la ligne — déterministe, pour que ce soit le même tant que ça va mal.
  - **Chaque ligne a son vocabulaire** (`MOTS_LIGNE`, six bandes × trois lignes) : la première
    version en partageait un seul, et les trois lignes affichaient souvent la même phrase — de quoi
    conclure qu'elles ne servent à rien. Une section **Les trois lignes** dans la fiche, avec
    l'enjeu écrit en face de celle qui te sert (« Plus ils te trouvent, plus tu marques »), et les
    mouvements de ligne dans « Ce que ça change » après le match.
  - **Une migration, pas une remise à zéro** (`VERSION` 5 → 6) : il était en train de tester la
    version déployée. `charger()` reconstruit les trois lignes depuis la sauvegarde v5 — le
    vestiaire qu'il avait, nuancé de moitié par ce que valait chaque ligne en relations
    individuelles — puis efface `liens.vestiaire` et les `rel`. Vérifié sur une vraie partie v5 de
    onze matchs : reprise à la 17ᵉ journée, saison terminée sans erreur.
  - **Rien d'autre n'a bougé** : banc d'essai rejoué avant/après (40 saisons par ligne, trois
    croisements), aucune politique ne prend à la fois les matchs et la trace, « deux séances puis un
    repos » reste devant sur les matchs (16,7 / 16,6 / 13,5 contre 16,8 / 15,4 / 13,1 avant).
- **Les mots du joueur, et un écran qui tient** (le propriétaire, 27/09/2026, après une
  deuxième partie en milieu de terrain : « le rythme, il est cool… le fait de faire un
  entraînement par semaine, on voit bien l'effet que ça a sur ton match, et c'est bien expliqué,
  surtout… la mécanique du moteur de base, elle est assez juste »). Deux reproches précis, tous
  deux traités.
  1. **« Le fond, le geste, la tête, comme appellation, c'est pas très clair, et je crois ne pas me
     souvenir de ce que ça représente. Je comprends pas pourquoi on a des mots différents. »**
     Il avait raison : les quatre axes portent déjà un nom sur l'écran de la semaine, et j'en avais
     inventé d'autres à côté. Ses renommages, appliqués tels quels : **corps → blessure**
     (`direCorps()`, ce qui te fait mal), **fond → ton corps** (`direFond()`, tenir et récupérer),
     **geste → technique**, **tête → mental**. Les phrases de `direFond()` ne disent plus « fond »
     et les pastilles des séances non plus (« ton corps : tu tiens et tu récupères », « la technique,
     sur les faits de match »). Et **chaque icône est celle de la séance qui nourrit la chose** —
     ⚽ la technique, 💪 le corps, 🧠 le mental — pour qu'on n'ait jamais à deviner ce qu'une icône
     représente. Sonde sur les six écrans du 2.0 : plus aucun ancien libellé à l'écran.
  2. **« L'écran, il est quand même très long… si on a les bons icônes et mis dans la bonne forme,
     plutôt que tout faire par ligne, ça peut permettre de faire de la place. »** Et l'ordre qu'il
     veut : « ta situation doit être la première chose qu'on voit, ensuite les choix qu'on doit
     faire, et après les autres informations — l'équipe d'abord, ensuite le classement qui est plus
     annexe. »
     - **L'écran de la semaine suit cet ordre** : `situationHTML(true)` ouvert en tête, puis la
       carte des séances, puis l'effectif, puis le classement.
     - **« Ta situation » passe de quatorze lignes à des cases** (`.sit`), deux colonnes sur un
       téléphone. En **colonnes CSS et non en grille** : dans une grille, la rangée prend la hauteur
       de sa case la plus haute, et une phrase de trois lignes en gonflait deux. Mesuré à 430 px,
       même carrière : **971 → 651 px (−33 %)**.
     - **L'effectif passe en tuiles rangées par ligne** : trois blocs (défense, milieu, attaque),
       deux tuiles par rangée, chaque bloc portant l'entente de sa ligne — là où elle a enfin des
       noms. À trois tuiles par rangée les noms se coupaient (« Dos San… ») : `minmax(142px)`.
       Mesuré : **771 → 549 px (−29 %)**, et la page entière tout dépliée **4 123 → 3 617 px**.
     - **Les trois ententes ne sont plus dans la fiche** : seule **celle qui te sert** y reste, avec
       son enjeu et un liéré d'or ; les deux autres sont dans l'effectif, avec les joueurs.
     - **Ce qui n'a pas été touché** : les six cartes de séance, qui font à elles seules le tiers de
       l'écran. C'est exactement ce qu'il vient de dire aimer (« c'est bien expliqué, surtout,
       l'effet que ça a sur ton match ») : raccourcir là aurait coûté ce qu'il garde.
- **VINGT-DEUX JOUEURS, ET DES TROUS QUI SE BOUCHENT** (le propriétaire, 27/09/2026 : « il me
  faut au moins 18 joueurs voire 22, parce que là s'il y a des blessures, des suspensions, il y a
  des trous dans l'équipe »). Le groupe était un onze pile (`PLAN = {G:1, D:4, M:4, A:2}`) : un
  blessé laissait littéralement une case vide, et `notesEquipe()` notait tout le monde avec 12 % de
  chance de ne pas avoir joué — dix à dix-sept notes pour un match à onze.
  - **`EFFECTIF = {G:3, D:7, M:7, A:5}`** (22, toi et tes rivaux compris) et **`FORMATION =
    {G:1, D:4, M:4, A:2}`** (le onze). `NOMS` passe de 16 à 40 : il en faut vingt et un distincts.
  - **Chaque coéquipier vit** (`vivreEquipe()`) : une forme qui dérive, 2,8 % de blessure et 1,3 %
    de suspension par journée. Mesuré : **1,8 absent en moyenne**, aucun absent 17 % des semaines,
    trois ou plus 29 %.
  - **`onzeDuJour(statut)` aligne le onze** parmi les valides et **mesure ce que l'infirmerie
    coûte** : chaque titulaire est comparé à celui qu'il remplace, rang par rang, et l'écart
    étalé sur onze entre dans `nous`. Mesuré : **−0,4 de force en moyenne, −4 au pire** — à
    comparer aux 2,4 de l'avantage du terrain. Un groupe profond absorbe, un groupe court paie.
    *Première version fausse* : je comparais les **sommes** des deux onze, donc un absent comptait
    pour tout son niveau et le onze perdait jusqu'à **onze points de force** pour trois blessés.
  - **`ROTATION` = 3,5** : sans tirage, le onze se choisissait strictement au niveau et **un tiers du
    groupe finissait la saison à zéro match** — vingt-deux joueurs dont onze décoratifs, c'est-à-dire
    le problème d'avant déguisé. Le même tirage sert au onze réel et au onze idéal, pour que
    l'écart ne mesure que l'infirmerie. Mesuré après : **1,1 joueur à zéro match** (le troisième
    gardien, en général), du moins utilisé au plus utilisé : 0 à 33 matchs.
  - **Seuls les onze titulaires sont notés** : **11,2 notes par match** au lieu de 10 à 17.
  - **À l'écran** : deux cases dans la fiche — **L'infirmerie** (qui manque, nommé) et **Le
    groupe** (ce que ça coûte au onze) — et les tuiles des absents grisées, marquées 🩼 ou 🟥.
    `direProfondeur()` tient compte du nombre d'absents : « quatre absents » à côté de « le onze est
    au complet » se lisait comme une contradiction, alors que c'est exactement ce qu'un groupe de
    vingt-deux est censé faire ; il dit maintenant « le groupe absorbe ».
  - **Migration 6 → 7** : le groupe est **complété poste par poste** depuis la sauvegarde existante,
    sans doublon de nom. Vérifié sur une vraie partie v6 (13 joueurs, 17ᵉ journée) : 22 joueurs
    après, lignes conservées, saison terminée sans erreur.
  - **L'équilibre ne bouge pas** : banc d'essai rejoué, « deux séances puis un repos » reste devant
    sur les matchs (17,3 / 16,3 / 15,2) et aucune politique ne prend à la fois les matchs et la trace.
- **Quatre retours de partie, quatre corrections** (le propriétaire, 27/09/2026).
  1. **« "Le geste sort le plus souvent", c'est mal formulé ; ce que tu essayes de dire, c'est
     *tu fais le bon geste au bon moment*. »** C'était exactement ça, et sa phrase est meilleure :
     la technique ne se juge pas à l'entraînement mais à l'instant où il faut la sortir. Les quatre
     bandes de `direGeste()` sont réécrites sur ce modèle.
  2. **« Il y a un onglet attaque à côté de le club, le vestiaire, etc., j'ai pas trop compris ce
     qu'il faisait là. »** La case de ta ligne portait le **nom de la ligne** en libellé, donc elle
     se lisait comme une jauge de plus — et pour un milieu c'était « L'ATTAQUE », ce qui n'a aucun
     sens à côté de « LE CLUB ». Le libellé devient **« Ta ligne »** et la phrase dit laquelle :
     « Avec l'attaque : un appel, un ballon. Plus tu les trouves, plus tu passes décisif. »
  3. **« Dans l'onglet effectif il n'y a pas la colonne des gardiens. »** Ils étaient fondus dans
     la défense, dont ils partagent bien l'entente mais pas le poste. L'effectif a maintenant
     **quatre groupes** (`GROUPES`) — gardiens, défense, milieu, attaque — et l'entente reste
     affichée sur les trois lignes.
  4. **« J'ai une note alors que j'ai pas joué de match… il devrait y avoir que 11 joueurs ou 13
     avec les remplaçants. »** Mesuré sur la version qu'il jouait : la liste de notes allait de
     **6 à 13 entrées** (l'ancien `notesEquipe()` notait tout l'effectif avec 12 % de chance de
     sauter quelqu'un). Le passage à vingt-deux l'avait déjà ramenée au onze ; il restait trois
     défauts, tous corrigés et re-mesurés sur 2 720 matchs, quatre postes, la moitié des carrières
     forcées sur le banc :
     - un poste à court laissait le onze à **neuf ou dix** : on fait monter quelqu'un d'un autre
       poste (la pénalité de −7 reste). **Un joueur de champ peut aller dans les buts, l'inverse
       jamais** — sans cette règle, douze matchs à deux gardiens ;
     - `moyenneNotes()` renvoie **6 quand on n'a aucune note**, commode pour les calculs mais le
       bilan en parlait comme d'une moyenne réelle. `S.bilan.note` vaut `null` à zéro match, et les
       trois textes du bilan ne se déclenchent plus sur ce 6 inventé (16 saisons à zéro match
       vérifiées) ;
     - garde-fou doublé dans `notesEquipe()` : tu n'entres dans les notes que si `m.minutes`.
     Résultat mesuré : **11 notes quand tu ne joues pas, 12 quand tu entres**, jamais autre chose,
     et **zéro note sans avoir joué** sur 2 720 matchs.
- **LE GROUPE VIT : DIX-HUIT CONVOQUÉS, UNE RÉSERVE, DES CHANGEMENTS** (le propriétaire,
  27/09/2026 : « un groupe c'est 18 joueurs, donc sur une équipe de 22 on peut dire qu'il y a
  toujours 4 absents du groupe… ceux qui sont pas dans le groupe, s'ils sont pas blessés ou
  suspendus, ils jouent avec la réserve, donc ils ont du temps de jeu et une note, mais elle n'a
  pas le même impact… l'entraîneur à chaque match fait des changements, au moins 3, parfois
  jusqu'à 5… une équipe qui perd va faire des changements plus tôt et des changements tactiques,
  là où une équipe qui gagne va faire rentrer des joueurs frais »).
  - **`TAILLE_GROUPE` = 18.** `equipeDuJour()` remplace `onzeDuJour()` et rend quatre listes :
    le **onze**, le **banc** (7), la **réserve** (les 4 laissés à la maison et valides) et les
    **absents**. Le choix du coach est `niveau du jour + rotation − rancune`.
  - **`planChangements()`** : trois entrées entre la 45ᵉ et la 68ᵉ (25 à 45 minutes), une ou deux
    en toute fin (5 à 15). **Menés**, on change plus tôt (−6 à −12 minutes) et on fait entrer
    devant ; **devant**, on renforce derrière et on sort **les jambes** les plus usées. Le gardien
    ne sort que blessé (5 %). Mesuré : **3 à 5 changements**, les trois premiers à la 57ᵉ en
    moyenne, les suivants à la 79ᵉ.
  - **Tu es une ligne du onze ou du banc comme les autres** : ton temps de jeu sort des mêmes
    changements. Mesuré : tu entres **71 %** des fois où tu es sur le banc, et tu **sors avant la
    fin 22 %** de tes titularisations (84 minutes en moyenne). *Première version* : « qui sort »
    était strictement le moins bon, donc tu ne sortais **jamais** (14 fois sur 900
    titularisations) ; un tirage de ±4 et la fraîcheur ont réglé ça.
  - **Sortir tôt est une vexation** : `vexer()` pose une `rancune` (2,2, qui s'estompe de 45 % par
    journée) retranchée du choix du onze suivant — « un joueur qui sort peut en vouloir au coach,
    donc il a moins de chances de jouer le match suivant ». Pour **toi**, une sortie avant la 62ᵉ
    coûte du mental et un point de confiance du coach, avec sa raison affichée.
  - **La réserve fait exister les jeunes** : `sumR`/`nbR` à part, une note affichée sous « Avec la
    réserve » après le match, et un effet **trois fois moindre sur la forme** (×.3 contre ×.9) —
    c'est la route lente vers le groupe, et elle existe. **La forme est désormais portée par les
    notes** (persistance .82 au lieu de .75), donc une bonne série en réserve finit par ouvrir la
    porte. Mesuré : **plus aucun joueur à zéro note** en fin de saison.
  - **Les remplaçants sont notés**, avec leurs minutes à l'écran, et leur note est amortie vers la
    moyenne selon le temps joué (×1 au-dessus de 70 minutes, ×.72 au-dessus de 30, ×.45 en
    dessous) : un joueur entré à la 80ᵉ ne fait ni un 10 ni un 3. Mesuré : **14 à 16 notes par
    match** (11 titulaires + 3 à 5 entrants), contre 11 à 12 avant.
  - **Les changements sont dans le film du match** (`m.chgVus`, en noms : sérialiser les objets du
    groupe en aurait fait des copies au rechargement).
  - **Deux bugs trouvés en route** : `m.res` était posé **après** `notesEquipe(m)` qui le lit, donc
    le bonus de victoire sur les notes des coéquipiers valait toujours zéro ; et `coequipier()`
    tirait un nom au hasard dans `NOMS` pour dire qui avait marqué — donc un buteur qui ne joue
    même pas au club. `surLeBanc()` prend quelqu'un qui est **réellement sur le terrain à cette
    minute**. Mesuré : **0 but sur 1 822** attribué à un inconnu.
- **LE 10 REDEVIENT RARE** (le propriétaire, 27/09/2026 : « s'il y a deux ou trois faits de match,
  il arrive parfois qu'on ait une note de 10, et le 10 ça doit quand même rester rare… le premier
  fait vaut un point, le deuxième 0,75, le troisième 0,5. Ça évite d'avoir une note de 10 si on
  met un doublé dans un match »). Sa table appliquée telle quelle (`POIDS_FAIT = [1, .75, .5,
  .35]`), symétrique pour les faits ratés, et **la même logique aux buts** (`POIDS_BUT = [.7, .5,
  .35, .25]`) puisque c'est le doublé qu'il nomme. Mesuré sur 1 207 de tes notes : 10ᵉ centile
  **4,7**, médiane **6,3**, 90ᵉ **8,1** — inchangés — mais le **maximum tombe de 10 à 9,8** et les
  notes à 9,5 et plus ne sont plus que **0,9 %**.
  **Migration 7 → 8** : rien à reconstruire, seulement `rancune`, `sumR` et `nbR` à poser.
  Vérifié sur une vraie partie v7 (17ᵉ journée) : reprise et saison terminée sans erreur.
- **NE PAS JOUER ÉTAIT UNE IMPASSE** (le propriétaire, 27/09/2026 : « j'ai joué 4 matchs alors que
  c'est au moins la 22ᵉ journée… je sais pas trop quoi faire pour entrer dedans… soit j'ai mon
  agent qui vient me voir, soit il y a des discussions avec le coach… ça doit amener des
  événements hors football pour compenser le fait qu'au niveau football il se passe pas
  grand-chose. Étant donné que je ne suis même pas dans le groupe le week-end, ce serait bien
  qu'il y ait des trucs positifs comme le temps avec la famille »). Mesuré avant de toucher à quoi
  que ce soit, 120 carrières par poste : une saison à **six matchs ou moins** arrivait dans **3 %**
  des carrières de milieu — et dans **63 %** de celles de gardien. Son cas n'était pas isolé,
  c'était la queue de la distribution, et elle n'avait aucune issue.
  - **La spirale du coach, fermée.** Ne pas jouer faisait baisser `S.liens.coach` de .5 par
    journée, or `coach` pèse .16 dans `valeurAuPoste()` : donc on jouait encore moins. Exactement
    la spirale du mental, et la seule porte de sortie qui se refermait. **Plancher à 42.**
  - **L'âge se desserre en cours de saison** (`+ journee × .13`, borné à zéro) : un coach ne donne
    pas le onze à un joueur de dix-huit ans **en août**, mais à force de le voir il finit par le
    lancer. Sans ce dégel, un joueur mal classé en août l'était encore en mai.
  - **Trois familles d'arrêts qui ne se déclenchent que là** (`S.sansJouer` compte les journées
    d'affilée sans une minute) : **`coachTemps`** (son bureau : demander ce qu'il faut faire,
    poser un ultimatum, attendre son tour), **`agentTemps`** (« je peux te sortir de là dès cet
    hiver, ou on serre les dents »), **`tempsLibre`** (« pour la première fois depuis longtemps,
    samedi t'appartient » : rentrer chez tes parents, aller au stade en tribune, travailler seul).
    Mesuré : **8 % / 6 % / 5 %** des arrêts, quinze familles au total.
  - **Le coup de fil du père ne tombe plus quand tu as tout ton temps** : `famille` exige
    maintenant que tu joues (`sansJouer < 2`), et `tempsLibre` prend le relais sinon. C'était son
    exemple : « j'ai pas mal de soucis avec mon père alors que j'ai peu de temps de jeu, donc
    normalement j'ai du temps pour lui ».
  - **Le rang est affiché** (`direRang()`), dans « Toi » : « 7ᵉ sur 7 à ton poste, 4 places dans le
    onze », suivi de **`direCommentMonter()`**, la phrase qui nomme le levier le plus court — le
    bureau du coach quand sa confiance est basse, le travail au poste quand l'écart est grand, une
    sortie en réserve quand c'est la forme qui manque.
  - **Mesuré après**, mêmes 120 carrières par poste : les saisons à six matchs ou moins passent de
    **3 % à 0 %** pour un joueur de champ et de **63 % à 36 %** pour un gardien ; le dixième
    centile monte de 15-17 à **20-21 matchs** (gardien : médiane 4 → **9**). L'arbitrage de la
    semaine tient toujours : l'or des matchs à « deux séances puis un repos » aux trois
    croisements (22,5 à 25,5), l'or de la trace ailleurs (physique +11,1 / technique +9,3 /
    poste +7,2).
- **UNE JAUGE QUI BOUGE SANS QUE LES MOTS BOUGENT N'EXISTE PAS** (le propriétaire, 27/09/2026 :
  « la stat "ta ligne", elle bouge jamais, du coup je comprends pas trop l'utilité »). Mesuré
  avant de toucher à quoi que ce soit, 60 carrières : la jauge parcourt bien **22 points** par
  saison, mais les bandes générales (`BANDES`) font **seize points de large**, donc la phrase ne
  changeait que **3,5 fois en 34 journées** — dix semaines avec le même mot, et **3 carrières sur
  60 où elle ne changeait jamais**. Il avait raison : du point de vue du joueur, elle ne bougeait
  pas. Deux corrections.
  1. **Huit paliers au lieu de six**, resserrés autour de là où une entente vit vraiment
     (`BANDES_LIGNE = [30, 38, 45, 51, 57, 63, 70]`, six à sept points de large). Deux phrases de
     plus par ligne.
  2. **La direction, qui est le vrai correctif.** Une jauge qui se déplace de deux points par
     journée ne change pas de palier avant des semaines. `S.ligneRef` est une moyenne lissée
     (`ref × .82 + valeur × .18` à chaque journée) ; l'écart à elle donne « Et ça va dans le bon
     sens » ou « Et ça se dégrade », **à l'intérieur même d'un palier**.
  Mesuré après, mêmes 60 carrières : la lecture de ta ligne change **13,1 fois par saison** (contre
  3,5), **7,3 lectures différentes** sur huit (contre 2,4 sur six), et **plus aucune carrière** où
  elle reste fixe. Aucune migration : `S.ligneRef` se pose tout seul au premier passage.
- **« Ta place » n'existe plus qu'à un seul endroit** (« il y a deux emplacements, celui dans la
  situation et celui dans ta semaine »). C'était vrai : la case **TA PLACE** (rang + levier) était
  dans la fiche et la **liste du poste** sur la carte de la semaine. Les deux sont réunies en une
  section **Ta place** dans « Ta situation » — le rang et le levier en tête, la hiérarchie complète
  en dessous. L'écran de la semaine ne garde que **la décision**, ce qui est sa fonction.
- **LE GROUPE ET LE VESTIAIRE : UN VRAI DOUBLON, MAIS PAS CELUI QU'IL CROYAIT** (le propriétaire,
  27/09/2026 : « c'est quoi la différence entre le groupe et le vestiaire ? Ça se superpose un peu
  les deux… il y a un truc à fusionner. Je sais plus c'est quoi leur utilité »). Mesuré sur 2 040
  semaines, ce que chacun pèse sur la force de l'équipe (l'avantage du terrain vaut **2,40**) :
  | case | ce que ça pèse | ce que c'est |
  |---|---|---|
  | **Le vestiaire** | −0,43 à **+0,77** | la **moyenne des trois ententes de ligne** |
  | **Le groupe** | **−2,44** à 0 | ce que l'infirmerie coûte au onze |
  | **Ta ligne** (gardien, défenseur) | −0,89 à **+1,84** | plus son effet direct sur les buts |
  Deux conclusions, toutes deux appliquées.
  1. **Le vrai doublon était ailleurs** : « L'infirmerie » et « Le groupe » étaient **deux cases
     pour le même événement vu sous deux angles** (qui manque / ce que ça coûte). Elles n'en font
     plus qu'une, **Le groupe** : « 5 absents, dont Hernandez et Nguyen. On est à l'os. Ce match
     part de plus loin. »
  2. **« Le vestiaire » disparaît des cases** (`LIENS_VUS`). Ce n'est pas une jauge à part : c'est,
     au mot près, la moyenne de trois ententes déjà lisibles dans « Ta ligne » et dans l'effectif,
     et elle pèse un tiers d'un avantage du terrain. Par la règle du projet — *chaque chiffre
     affiché doit avoir une conséquence visible* — elle n'avait pas sa place. Le moteur garde
     `vestiaire()` : il décide encore de deux familles d'arrêts et d'une ligne du bilan. Et
     l'effectif répond une fois pour toutes à la question : « L'entente du vestiaire, c'est la
     moyenne de ces trois lignes. »
- **LES SIX CARTES DE SÉANCE, RACCOURCIES** (le propriétaire, 27/09/2026 : « on peut réduire la
  taille de la section semaine, le truc des choix prend beaucoup de place, ça me fait beaucoup
  scroller, et du coup j'ai même pas tout en bas parfois alors que j'aimerais bien aller voir
  l'effectif plus souvent »). C'était le bloc que j'avais **explicitement laissé intact** deux
  passes plus tôt parce qu'il venait de dire l'aimer ; il le reprend, donc on le coupe — mais en
  gardant ce qu'il aime, c'est-à-dire **l'effet annoncé avant le clic**.
  - **Les sous-titres tiennent sur une ligne** (« Frappes, centres, gestés répétés jusqu'à la nuit »
    → « Frappes, centres, gestes répétés »), c'est ce qui doublait la hauteur d'une carte.
  - **Les pastilles sont resserrées** (« la technique, sur les faits de match » → « technique : les
    faits de match », « ta place : le coach te titularise » → « ta place dans le onze ») : à trois
    mots de moins elles tiennent sur **une seule rangée** au lieu de deux.
  - **Moins d'air** : `.opt` passe de 12/14 à 9/12 de marge intérieure, la colonne d'icône de 28 à
    24, l'interligne des pastilles de 7 à 5.
  - **La narration de l'écran disparaît** : « Trois jours de travail, et une seule chose que tu
    peux vraiment décider » était la même **trente-quatre fois par saison**.
  Mesuré à 430 px, même carrière : quatre cartes sur six tombent à **87 px** (une rangée de
  pastilles), la carte « Ta semaine » entière passe de **1 123 à 757 px (−33 %)**, et surtout
  **L'EFFECTIF remonte de 2 279 à 1 896 px** — 383 pixels de défilement en moins pour l'atteindre.
- **L'ÉCRAN DE RÉSULTAT SE CONTREDISAIT** (le propriétaire, 27/09/2026 : « dans ma semaine, il n'y a
  que l'impact de mon choix d'entraînement… le joueur qui met un triplé ou un doublé, dans la note
  du match, ça va pas se ressentir… dans les notes de match, il y a des joueurs qui n'ont pas de
  temps de jeu noté et d'autres qui en ont, on comprend pas »). Sondé sur **1 700 matchs** avant de
  toucher à quoi que ce soit, et le résultat a **corrigé ma lecture** : les minutes du film et
  celles des notes sont **cohérentes à 100 %** (0 écart sur 1 700 matchs), et aucun buteur ne manque
  à la liste des notes. Deux vrais défauts, et un défaut de lisibilité.
  1. **Un but ne se voyait pas dans la note du buteur.** Mesuré : 6,15 sans but, **6,48** avec un
     but, 7,22 avec trois — et encore, seulement parce qu'une équipe qui marque gagne, ce qui donne
     +0,55 à tout le monde. **Rien ne reliait le film à la note.** Les buts, les passes et les
     cartons des coéquipiers y entrent maintenant (`POIDS_BUT_AUTRE = [1.2, .85, .6, .4]`, même
     rendement décroissant que pour toi ; passe +0,4, jaune −0,25, rouge −1,3). Mesuré après :
     **6,15 / 7,63 / 8,47 / 8,72**. Un doublé vaut enfin un 8,5.
  2. **Les coéquipiers marquaient tout seuls** : seule *ta* passe décisive existait. Un but a
     maintenant 55 % de chances d'avoir un passeur nommé, le film le dit (« But de Garnier, servi
     par Nguyen ») et la note le compte.
  3. **La moitié des lignes n'affichait pas de minutes** (celles à 90), ce qui se lisait comme une
     incohérence alors que c'était une économie d'affichage. **Tout le monde a ses minutes.**
  Et **« Ta semaine » rappelle la décision de la semaine**, pas seulement le compte rendu de
  séance : `S.semaineArret` garde le titre de l'arrêt et l'option choisie, et l'écran l'affiche
  au-dessus (« *Nguyen a fait une séance énorme* — tu as choisi : « Rester une heure de plus,
  seul » »). Vérifié que rien ne se dérègle : tes notes restent à 10ᵉ **4,7**, médiane **6,3**,
  90ᵉ **8,1**, ton rang moyen dans la liste est **7,7 sur ~15**, et les quatre jugements se
  répartissent 399 / 383 / 137 / 128.
- **LES MINUTES DU MATCH DEVIENNENT POSSIBLES** (le propriétaire, 27/09/2026, capture à l'appui :
  « tu peux laisser l'économie d'affichage, je trouve que c'est une bonne idée. C'est juste que dans
  le cas sur lequel je suis tombé, il y avait plus que 11 joueurs sans information de temps — c'est
  pas possible — et 7 joueurs avec des durées affichées, c'est forcément un nombre pair sauf s'il y a
  un carton rouge, mais c'est pas indiqué »). Il avait raison sur les trois points, et il m'avait
  aussi repris sur la correction précédente : afficher « 90 min » pour tout le monde était la
  mauvaise réponse à une vraie incohérence. Les minutes ne s'affichent à nouveau que quand elles ne
  valent pas 90 — et derrière, **quatre défauts, une seule cause pour les deux premiers**.
  1. **Un joueur pouvait être deux fois dans le onze.** `equipeDuJour()` bouchait les trous **poste
     par poste** : le dépanneur était pris dans un poste **pas encore traité**, et ce poste le
     reprenait ensuite. D'où exactement ce qu'il a vu — douze joueurs à 90 minutes (un titulaire
     compté deux fois) et un nombre impair de sortants (un sortant compté deux fois). Les trous se
     bouchent maintenant **une fois tous les postes servis**. Mesuré, 2 040 matchs : **29 doublons de
     nom → 0**, jamais plus de onze joueurs à 90 minutes.
  2. **La relecture du groupe se faisait par nom** (`tous.find(y => y.nom === e.n)`) : deux entrées
     pouvaient désigner le même objet. Chaque nom n'est plus rendu qu'une fois.
  3. **Un rouge ne changeait rien** : l'expulsé gardait ses 90 minutes et pouvait même être remplacé
     après coup — y compris toi (« tu sors à la 79ᵉ » après une exclusion à la 67ᵉ). Il est
     désormais choisi parmi ceux qui devaient finir le match, son temps de jeu s'arrête là, son
     changement est annulé, et son rouge ne tombe plus à la 90ᵉ (où il serait invisible). C'est la
     seule façon d'avoir un nombre impair de sortants, exactement comme il le dit.
  4. **« Sortie sur blessure » nommait quelqu'un qui restait sur le terrain.** L'événement s'accroche
     maintenant à un changement réel : le film, les minutes et la pastille disent la même chose.
  **Les pastilles sont de retour** (« j'aimerais bien que sur les notes, à côté des joueurs, ceux qui
  ont marqué un but, ceux qui ont fait une passe décisive, ceux qui ont pris des cartons, ceux qui se
  sont blessés, comme on avait fait avant ») : `faitsHTML()` avec le vocabulaire de la 1.0
  (⚽ 🅰️ 🟨 🟥 🩼), alimenté par **les mêmes faits que ceux qui nourrissent la note**, donc le film et
  la note ne peuvent plus se contredire.
  **Six invariants vérifiés sur 2 040 matchs, tous à zéro écart** : le nombre de notes vaut onze
  titulaires plus un entrant par changement ; jamais plus de onze joueurs à 90 minutes ; les sortants
  valent deux par changement plus les expulsés qui devaient finir ; chaque pastille correspond à un
  événement du film ; un blessé est un vrai sortant à la bonne minute ; un expulsé n'est jamais
  remplacé.
- **ON REMPLACE UN JOUEUR PAR UN JOUEUR DE SON POSTE** (le propriétaire, 27/09/2026, sur la même
  capture : « les deux attaquants, ils ont joué 90 minutes, mais moi j'en ai joué que 34 et il n'y en
  a aucun qui est sorti. Donc là-dessus, c'est incohérent »). `planChangements()` appariait entrants
  et sortants **par ordre de mérite, sans regarder le poste** : le coach faisait donc entrer un
  attaquant à la place d'un défenseur, et le 4-4-2 finissait en 4-3-3 sans que personne ne l'ait
  décidé. Désormais on cherche d'abord **son poste**, puis un **poste voisin** (D↔M, M↔A), et le
  changement **tactique** — pousser devant quand on est mené — est **voulu et unique**.
  - Première version, le tactique en dernier recours : **0 sur 6 250 changements**. Il ne sortait
    jamais, alors qu'il avait été demandé (« une équipe qui perd va faire des changements plus tôt et
    des changements tactiques »). Rendu volontaire (mené, une fois sur trois), il est passé à 5 % —
    mais **deux d'affilée finissaient le match à deux défenseurs** (2-5-3 et 2-6-2 dans 7 % des
    matchs). Garde-fou : une ligne ne peut perdre qu'un homme sur son effectif nominal.
  - Mesuré après, 6 201 changements sur 1 632 matchs : **93,7 % même poste, 3,7 % poste voisin,
    2,6 % tactique**, et le onze finit le match en **4-4-2 dans 76 %** des cas (contre une dérive
    permanente avant). Le film nomme le changement tactique (« — trois devant »).
  - **L'équilibre de la semaine tient.** À 40 saisons par ligne, un croisement semblait basculé
    (« lever le pied » repassant devant « deux séances puis un repos ») ; à **150 saisons par ligne**
    l'écart disparaît (25,4 contre 24,6 matchs, 13,0 contre 11,1 titularisations) — c'était le bruit,
    et la bande de bruit du banc à 40 saisons est de ±1,6 match. Aux trois croisements, l'or des
    matchs et l'or de la trace restent sur deux lignes différentes.
  - **Pas de migration** : rien de tout cela ne vit dans la sauvegarde longue. Vérifié en reprenant
    une vraie partie de la version déployée à la 17ᵉ journée — saison terminée, 17 matchs, zéro
    écart de comptage, zéro erreur.
- **LE CHAMPIONNAT VIT, ET LE TITRE CHANGE DE MAINS** (le propriétaire, 27/09/2026 : « par
  championnat, mettre un petit système aléatoire pour les clubs adverses pour définir leur
  niveau… d'une année à l'autre j'aurai des clubs plus ou moins forts : peut-être une année deux
  clubs plus forts que moi, l'autre année cinq, une autre trois… dans certaines carrières c'était
  tout le temps les mêmes équipes qui gagnaient, donc si tu rejoignais cette équipe tu savais que
  tu allais remporter des trophées »). Le championnat était **entièrement retiré chaque année** :
  les dix-huit clubs changeaient d'identité d'une saison à l'autre et la force de chacun ne devait
  rien à ce qu'il avait fait.
  - **Les mêmes clubs toute la carrière**, chacun avec une **ancre** (son poids historique à cette
    époque, qui ne bouge pas), un **potentiel** qui dérive lentement (un petit club peut monter dans
    la hiérarchie, jamais d'un coup) et une **force qui se rejoue chaque été** :
    `élan + tirage + rappel vers le potentiel`. Ton club passe par la même porte : il n'a plus de
    règle à lui.
  - **L'élan est sur la force, pas sur le potentiel, et il est petit** (`ELAN_CLUB` = .12 par place).
    Mesuré palier par palier : à 0,3 par place c'est une boucle qui s'auto-entretient — le champion
    reste champion, **55 % de titres conservés quel que soit le reste du réglage**, et l'élan appliqué
    au potentiel est pire encore (écart 1ᵉr-5ᵉ de 12,8 au lieu de 8,6). À 0,12, le champion prend un
    point d'avance qui s'efface en deux ou trois ans : un vrai avantage, pas une rente — ce qu'il
    demandait (« elles ont fait un bon résultat… puis l'année d'après ça leur permet d'avoir leur
    chance »).
  - **Le vrai verrou était la pente de la hiérarchie.** À 4 points par point de poids historique, le
    premier était **douze à quatorze points au-dessus du cinquième** et le titre était joué avant
    août, *quel que soit* le tirage : 3,9 champions différents sur vingt saisons, titre conservé 59 %.
    À `PENTE_CLUB` = 2,4 l'écart tombe à neuf ou dix. Mesuré après, 25 carrières de vingt saisons :
    **5,8 champions différents, titre conservé 44 %**, et le nombre de clubs plus forts que le tien
    varie vraiment d'une année sur l'autre (0 dans 21 % des saisons, 1 à 5 dans 43 %, six ou plus
    dans 20 %) — son exemple, tel quel.
  - *(Les clubs adverses ont reçu un effectif nommé juste après — voir la section suivante.)*
- **TON POTENTIEL ET CELUI DES CLUBS SONT SUR LA MÊME ÉCHELLE.** Première version du championnat
  vivant : j'avais resserré la hiérarchie des clubs **sans** toucher à la tienne. Mesuré :
  niveau 88 quand le meilleur club vaut 66, donc `(niveauJour() − force) × .12` te faisait valoir
  **trois points à toi seul** — tu faisais champion ton club, 4,8 titres par carrière et un attaquant
  médian à 40 buts par saison. Le sommet d'un joueur doit rester un peu au-dessus du meilleur club,
  pas vingt points au-dessus : `POT_MIN`/`POT_MAX` = 56/80, niveau maximal médian **70**.
- **UN GRAND CLUB N'APPELLE PAS TOUS LES ÉTÉS.** La fenêtre des offres était symétrique
  (`|force − cote| < 7`), donc une fois ta cote haute **toutes** les offres venaient du haut du
  tableau et tu suivais le meilleur club d'année en année — c'est ça qui faisait les titres, pas le
  championnat. Le tirage est maintenant pondéré : un club à ta portée appelle volontiers, un club
  au-dessus de toi rarement (il a le choix). Mesuré : **3,3 titres** par carrière de vingt saisons
  (médiane 3, maximum 9, trois carrières sur quarante sans rien) et **6,6 clubs** traversés au lieu
  de 2,6.
- **LES BUTS REVIENNENT À L'ÉCHELLE D'UN VRAI CHAMPIONNAT** (« 32 buts par saison au sommet, c'est
  quand même conséquent, donc il faut être un bon joueur »). Ce n'était pas les scores mais **ta
  part** : à .38, un attaquant prenait plus d'un but sur trois de son club, alors qu'ils sont deux
  devant et cinq dans le groupe. Resserré à .28 (milieu .155, défenseur .055). Mesuré :
  | poste | première saison | médiane au sommet | 90ᵉ centile | carrière |
  |---|---|---|---|---|
  | attaquant | 9,4 | **22** | 36 | 454 |
  | milieu | 4,3 | 10 | 16 | 195 |
  | défenseur | 1,2 | 2 | 5 | 50 |
  | gardien | 0 | 0 | 0 | 0 |
  Les 32 buts dont il parlait sont désormais **au-dessus du quatre-vingtième centile** : il faut vraiment
  être un bon joueur, ce qu'il demandait.
  **L'équilibre de la semaine tient** aux trois croisements après tous ces changements, et
  « toujours lever le pied » n'est la meilleure politique nulle part.
- **LES CLUBS ADVERSES ONT UN EFFECTIF, PAS UN NOMBRE** (le propriétaire, 27/09/2026 : « les équipes
  en face et les joueurs d'en face qui ont leur potentiel aléatoire et qui ont leur croissance de
  leur côté, qui est dans les mêmes proportions que la nôtre »). Un club adverse était un nombre qui
  bougeait tout seul ; c'est maintenant **vingt-deux joueurs nommés** par club, avec un âge et un
  potentiel, qui suivent **la même courbe d'âge que tes coéquipiers**. La force du club n'est plus
  tirée : elle **découle** de son onze (`forceEffectif()`).
  - **Ce que ça change vraiment** : un club tombe parce que sa génération vieillit et remonte parce
    qu'il recrute — le mouvement a enfin une cause. Et le buteur d'en face a un nom : « 11ᵉ But de
    R. Chauvin (Olympique de Marseille) », le même homme d'un match à l'autre et d'une saison à
    l'autre. Mesuré : **763 buts adverses sur 763 sont nommés**.
  - **Le vivier** : dix-sept adversaires à vingt-deux joueurs, il en faut près de quatre cents
    distincts — les quarante de `NOMS` ne suffisaient pas. `NOMS_ADV` (232 noms) croisé avec une
    initiale donne 4 640 combinaisons. Un joueur adverse porte son initiale (« A. Sagna »), tes
    coéquipiers non : on connaît les siens par leur nom. Mesuré : **396 joueurs, zéro doublon**, au
    départ comme après vingt saisons.
  - **L'élan, le tirage et le rappel n'agissent plus sur la force mais sur ce que le club arrive à
    recruter** (`vise`). C'est le même mécanisme de loin, et il veut dire quelque chose de près.
  - **Un effectif de vingt-deux lisse tout, et il a fallu lui rendre un mercato.** Chaque joueur
    bouge d'un point par an, donc la force du onze suivait à peine et **le championnat s'est
    refigé** : 4,2 champions différents sur vingt saisons au lieu de 5,8, titre conservé 49 %.
    Désormais un club qui a bien fini **achète** et remplace ses plus faibles ; un club qui a coulé
    **perd ses meilleurs**, partis ailleurs (jusqu'à huit mouvements par été, tant que l'écart à
    `vise` dépasse 1,2). Mesuré après : **5,5 champions différents, titre conservé 45 %** — la bande
    où le réglage avait été posé.
  - **Un piège trouvé à la mesure** : `forceEffectif()` rend la moyenne du onze, et les titulaires
    étaient tirés **au-dessus** du niveau demandé (`+rnd(1,6)`). La force d'un club valait donc trois
    points de plus que ce qu'on lui avait donné — et comme tes coéquipiers se construisent à partir
    de la force de **ton** club, tu perdais ta place : mesuré, **24,8 matchs en première saison
    tombés à 18,5**, et les titularisations de 10,8 à 5,7. Les titulaires sont maintenant centrés
    (`rnd(-2.5, 2.5)`), les doublures en dessous.
  - **Le coût** : la sauvegarde passe de 25 Ko à 268 Ko après vingt saisons — l'essentiel est le
    journal, les 396 joueurs pèsent une vingtaine de kilo-octets. Très loin de la limite de
    `localStorage`.
  - **Ce qui n'est toujours pas fait** : pas de montée ni de descente, et aucun transfert entre le
    club adverse et le tien. Ça viendra avec la coupe et l'Europe.
  - **Vérifié** : l'équilibre de la semaine tient aux trois croisements (l'or des matchs à « deux
    séances puis un repos », l'or de la trace ailleurs) ; 40 carrières jouées de 18 à 38 ans sans une
    erreur ; les six invariants du tableau des notes à zéro écart ; et une vraie sauvegarde de la
    version déployée passe la trêve (les effectifs adverses se fabriquent au premier été) et rejoue
    une saison entière.
- **LA COUPE ET L'EUROPE, EN MILIEU DE SEMAINE** (le propriétaire, 21/09/2026 : « la **coupe doit
  devenir jouable** — comme suite de décisions, pas de matchs à opérer » ; 27/09/2026 : « une fois
  qu'on a vu ça, on peut passer à l'Europe aussi, et à la coupe »).
  - **Elles ne rallongent pas ta semaine, elles la coûtent.** Le match de coupe ou d'Europe se joue
    **avant** qu'on pose le groupe du week-end : ses minutes et sa fatigue entrent donc dans le choix
    du onze de samedi. Un mercredi européen, c'est des jambes en moins samedi — c'est là qu'est
    l'arbitrage, et il n'a pas besoin d'un écran de plus. La semaine garde ses trois clics : le
    mercredi se **lit**, il ne s'opère pas, et il n'a pas de fait de match (ceux-là restent pour
    samedi). L'écran de la semaine **l'annonce avant que tu choisisses ta séance**.
  - **La coupe** : cinq tours (`J_COUPE` = 8, 14, 20, 26, 31). Les deux premiers contre un club de
    division inférieure — c'est là que les surprises arrivent — puis un club du championnat. Un
    match nul se décide en prolongation. **Le coach tourne davantage en coupe** (`ROTATION_COUPE`=7,
    contre 3,5) : c'est la vérité du football, et ça donne au remplaçant une porte d'entrée qui
    n'existait pas.
  - **L'Europe** : on y va si on a fini **sur le podium** ou si on a **gagné la coupe**, donc jamais
    la première saison. Six matchs de groupe (huit points qualifient), puis quarts, demie, finale.
    L'adversaire sort de `EU_CLUBS` à l'époque jouée, avec une pente plus raide que celle du
    championnat de France (`PENTE_EURO`=4,2) : un grand d'Europe est au-dessus d'un grand de France.
  - **Mesuré, 600 saisons** : **44 % des saisons en Europe**, 3,1 tours de coupe par saison (on sort
    généralement en quarts), **79 coupes et 11 Europes gagnées** — la coupe une saison sur sept,
    l'Europe une campagne sur vingt-cinq. 3 628 matchs de mercredi, dont **70 % joués par toi**, et
    28,3 matchs par saison toutes compétitions confondues.
  - **L'équilibre de la semaine tient** aux trois croisements, avec une conséquence émergente qui
    est exactement l'effet recherché : quand le mercredi existe, « lever le pied » reprend de la
    valeur (25,6 matchs contre 26,1 pour « deux séances puis un repos » en académie milieu) — une
    saison européenne se paie.
  - Les trophées entrent dans la carrière (`carriere.coupes`, `carriere.europes`), le bilan de saison
    porte une case **Les coupes**, et le bilan de carrière marque chaque saison d'un 🏆, 🏅 ou ⭐.
- **LA QUALITÉ ET LE DÉFAUT SE DÉCOUVRENT À LA CRÉATION, À LA ROULETTE** (le propriétaire,
  27/09/2026, en deux temps). D'abord : « je ne comprends pas ce que représente nerfs d'acier et
  ischios en verre, pourquoi ils sont là et comme cela ». Ils étaient rangés **dans la même grille
  que la fraîcheur et le mental**, sans dire de quel axe ils parlent : « DES NERFS D'ACIER » (+15 de
  mental, pour toujours) se lisait à côté de « MENTAL : quand ça se tend, tu joues petit » (la
  réserve du moment) — et les deux se contredisaient à l'œil. Puis, une fois l'explication donnée :
  « il faut que ce soit dans la page de création qu'on les découvre. Une fois qu'on a choisi ce
  qu'on voulait pour la partie hors football, on doit les voir apparaître. C'est bien s'il y a une
  petite animation comme une roulette et tout… et là ensuite, tu peux les mettre dans la situation,
  dans la section toi. »
  - **Une quatrième étape de création** (`ecranTirage`), après le choix de l'ambition : deux rouleaux
    défilent parmi les qualités puis parmi les défauts, ralentissent (`55 + 240 × (t/durée)³`) et se
    posent sur les tiens, liséré d'or pour l'une, rouge pour l'autre. Une ligne dit ce que c'est :
    « quinze points en plus sur un axe, quinze en moins sur un autre, dans tes chiffres dès le
    premier match. Ça ne bougera plus : c'est ce que tu es. » `prefers-reduced-motion` les pose
    directement, sans animation.
  - **Chacun nomme son axe**, et ils reviennent **dans la section « Toi »** comme il le demande : une
    fois qu'on sait ce qu'ils sont, ils n'ont plus besoin d'une section à part. Au poste, l'étiquette
    nomme la **spécialité réelle** (« ta finition », « ta vision », « ton placement », « tes
    réflexes ») et non un « ton poste » abstrait.
  - **LES HUIT TEXTES DISENT D'ABORD LE NIVEAU** (le propriétaire, 27/09/2026 : « les formulations ne
    sont pas très bonnes… “tu arrives où le ballon était”, on ne comprend pas forcément. Et pareil
    pour la frappe : on ne comprend pas trop si c'est bien ou pas bien quand tu dis “ta frappe n'est
    pas normale”. Ça peut être “une frappe supérieure à la moyenne, le staff apprécie ta qualité de
    tir”… et pour le poste, “tu es en dessous de la moyenne dans tes qualités au poste, c'est
    quelque chose que tu traînes depuis toujours” »). Chaque phrase commence donc par **au-dessus**
    ou **en dessous de la moyenne**, suivie de ce que ça change concrètement — « Une qualité de tir
    au-dessus de la moyenne : le staff s'arrête pour regarder tes séances de frappe », « Un sens du
    jeu en dessous de la moyenne : tu réagis une demi-seconde après les autres, et tu traînes ça
    depuis toujours ». Les noms aussi (« Une frappe » → « La frappe », « Toujours un temps de
    retard » → « Le temps de retard »).
    **Deux pièges évités en relisant les huit textes aux quatre postes** : une première version
    insérait le nom de la spécialité dans la phrase, ce qui **répétait l'étiquette** (« tes réflexes
    — Tes réflexes est au-dessus… ») **et cassait l'accord** au pluriel. La phrase ne nomme plus
    l'axe : l'étiquette s'en charge.
  - **La découverte en jouant disparaît** : `decouverte()` les révélait au fil des matchs, ce qui était
    précisément la cause de l'incompréhension. `nouvellePartie()` les pose **déjà vus**, et `charger()`
    les donne aussi aux carrières commencées avant — sinon plus rien ne les leur montrerait.
- **TES BUTS DE FAIT DE MATCH N'AVAIENT PAS DE PASTILLE** (capture à l'appui : l'entête dit « 1 but »
  et la ligne de notes n'affiche que la passe). `faits` est construit depuis `m.evs`, or un but
  marqué sur un fait de match fait `m.bn++ ; m.buts++` **sans créer d'événement** : il était donc
  invisible. On lit `m.buts`, le vrai total, comme la note le faisait déjà. Mesuré : **zéro écart**
  entre la pastille et le total sur 600 saisons. Et le 🅰️ de la passe décisive, qui se lit comme un
  carton sur un téléphone, devient un crampon 👟.
- **LE MENTAL DIT DEUX CHOSES, ET IL FAUT LES DEUX** (le propriétaire, 27/09/2026 : « malgré le fait
  que j'ai un bon mental, je suis toujours, depuis le début de ma carrière, dans un mental de “quand
  ça se tend, tu joues petit”. Du coup je ne sais pas si c'est positif ou négatif. J'ai l'impression
  que mon mental n'évolue pas alors que je l'ai quand même pas mal entraîné »). `direEncaisse()` ne
  lisait que la **réserve du moment**, qui se vide à chaque coup dur : un joueur avec quinze points
  de mental en plus restait toute sa carrière dans la bande basse, **sans jamais savoir que c'était
  sa force**. Elle dit maintenant **ce que tu vaux quand tu vas bien** (`pic.ment`, ce que lit déjà
  `niveau()`) **et où en est ta réserve** — « Une tête au-dessus de la moyenne, et elle est
  entière », « Une tête dans la moyenne — et là elle est à plat : seule la séance mentale la
  remonte ». Mesuré, 30 carrières de vingt saisons : la ligne change **49 fois par carrière** quand
  on entraîne le mental (90 % du temps « entière ») et **63 fois** quand on ne l'entraîne jamais
  (31 % du temps « entamée » ou « à plat », contre 19 % « entière ») — avant, elle ne bougeait
  pratiquement pas.
- **LA PHRASE DU STAFF ÉTAIT FAUSSE, ET FIGÉE** (même retour, deux reproches) :
  1. « La finition : c'est ce qui te fait jouer. Mental : tu es en retard sur le groupe — alors que
     depuis le début j'ai plus quinze de mental. » `direStaff()` classait les axes sur `base.ment`,
     **la réserve qui se vide** : un joueur au mental fort y passait dernier dès le premier coup dur.
     Elle lit `pic.ment`, comme `niveau()`.
  2. « Cette phrase, elle n'évolue pas, et c'est dommage : ce qui me fait jouer au début, c'est
     peut-être pas ce qui me fait jouer après. » Elle comparait tes axes **entre eux**, un classement
     qui ne se réordonne presque jamais. Ils sont désormais **pesés par ce que ton poste en demande**
     (`POSTES[].w`) et comparés au **niveau du club**, et la phrase nomme ce qui a bougé depuis août
     (`S.moi.an0`, la photo des axes au coup d'envoi). Mesuré : elle change **202 fois par carrière**.
  Un piège évité à la relecture : la première version pouvait **nommer deux fois le même axe** et se
  contredire (« Mental : tu es en retard sur le groupe. Mental a pris un cran depuis août »). Quand
  l'axe qui bouge est déjà nommé, le mouvement se fond dans sa proposition (« … c'est ce qui te
  fait jouer, et ça monte »).
  **Une leçon de méthode, re-apprise à mes dépens** : j'ai écrit `v2/moteur.js` avec un
  `io.open(p,'w')` direct au lieu du temporaire + `os.replace` que ce fichier impose depuis le
  27/09/2026. Une sonde lancée dans la foulée a lu le fichier à moitié écrit et a signalé de faux
  écarts sur le tableau des notes — dix mille deux cents matchs les ont ensuite démentis. L'écriture
  atomique n'est pas une précaution contre les erreurs d'encodage seulement : c'est aussi ce qui
  empêche de mesurer un fichier qui n'existe pas encore.
- **UNE ÉTIQUETTE DOIT NOMMER UNE SÉANCE QU'ON PEUT FAIRE** (le propriétaire, 27/09/2026, deuxième
  passe sur les huit textes : « au lieu de mettre ta finition, mets ton poste. Sinon, c'est pas
  clair… parce que sinon, ça voudrait dire que c'est une qualité sur laquelle on ne peut pas avoir
  d'impact. Là, par exemple, tu as mis ta finition. Puis après, dans l'explication, tu as mis
  lecture du jeu au-dessus de la moyenne… Qu'est-ce que ça augmente ? Est-ce que ça augmente la
  technique ? le physique ? le mental ? le poste ? On ne sait pas »). Son argument est meilleur que
  ma trouvaille de la passe précédente : j'avais donné à chaque poste son mot propre
  (« ta finition », « tes réflexes ») en croyant gagner en précision, et j'avais en fait
  débranché l'étiquette de la seule chose qu'elle sert à désigner — **la séance qu'on peut
  choisir le lundi**. Les quatre séances s'appellent ta technique, ton physique, ton mental et
  ton poste ; une étiquette ne nomme plus rien d'autre.
  - **`motAxe('spec')` rend « ton poste »**, le champ `mot` de `POSTES` disparaît, et
    **`axeNom('spec')` rend « Ton poste »** — donc la phrase du staff ne dit plus
    « La finition, c'est ce qui te fait jouer » (qu'il avait citée comme incompréhensible) mais
    « Ton poste : c'est ce qui te fait jouer, et ça monte ». `POSTES[].spec` reste, pour l'unique
    endroit où la spécialité est à sa place : le nom du poste à la création.
  - **La mention « au-dessus / en dessous de la moyenne » n'est plus sur les huit** (« je pense
    qu'on n'est pas obligé de la mettre pour toutes ») : elle reste là où la phrase seule ne
    dirait pas si c'est bien ou mal (la frappe, le pied faible, le moteur), elle disparaît là où
    l'image tranche toute seule — **les ischios** (« cette gêne derrière la cuisse revient chaque
    hiver »), **le doute** (« un geste raté et tu joues petit pendant vingt minutes »), et **le
    sang-froid**, dont j'ai retiré le préfixe **de ma seule initiative** : « Une tête au-dessus de
    la moyenne » tombait juste à côté de `direEncaisse()`, qui écrit mot pour mot la même chose
    dans la même section.
  - **Ses reformulations, appliquées telles quelles** : « qualité de tir » → **toucher de balle** ;
    « côté gauche tu ne fais rien » → **« tu n'as pas de pied gauche, et les défenseurs l'ont bien
    compris »** ; et la symétrie qu'il a demandée pour le poste (« tu peux mettre la même chose en
    vrai… tu réagis une demi-seconde au-dessus de la moyenne à ton poste ») : **Le temps d'avance**
    fait face au **Temps de retard**, même phrase à un mot près. « La lecture du jeu » disparaît :
    il ne l'aimait pas (« ça fait pas assez jeu au poste ») et proposait « lecture du poste,
    peut-être, à la limite » — **j'ai préféré la symétrie**, qui dit le même football sans
    inventer un mot.
  - **Le piège évité à la relecture** : sa phrase du poste contenait déjà « à ton poste », donc
    la ligne se lisait « ton poste — Tu réagis une demi-seconde après les autres **à ton poste** ».
    L'étiquette le dit ; la phrase ne le répète plus. C'est le même piège que la passe précédente,
    trouvé de la même façon : en imprimant les huit textes aux quatre postes avant de livrer.
  - **Un mort trouvé au passage** : l'écran de création affichait la spécialité du poste à la place
    de « Au poste » dans les pastilles d'origine — sauf qu'**aucune des trois origines ne touche
    `spec`** (elles jouent tech, phys et ment). Du code mort depuis le début : retiré, rien ne
    change à l'écran.
  - **Vérifié** : les huit textes relus aux quatre postes, la phrase du staff et celle du mental
    avec eux ; la roulette de création rejouée jusqu'au coup d'envoi ; les six invariants du
    tableau des notes à zéro écart sur 2 040 matchs. **Aucun chiffre du moteur n'a bougé** — c'est
    une passe de mots.
- **Le banc d'essai (`v2/labo.html`)**, demandé par le propriétaire : « le tableau que tu m'as
  partagé, je sais pas ce que ça représente… j'aimerais bien aussi que je puisse faire [les
  simulations] sur le nombre de matchs en fonction des choix qu'on a fait. » La page rejoue des
  saisons entières avec le moteur du jeu et en fait la moyenne. Deux bancs : les **trois origines aux
  quatre postes**, et les **huit politiques de semaine** pour une origine et un poste choisis.
  Réglages : 5 à 50 saisons par ligne, l'époque. Les colonnes `matchs` et `trace` sont peintes en or
  et en rouge — **si une seule ligne prend les deux, le choix n'en est pas un**, c'est le test de
  l'équilibre. C'est le seul écran du 2.0 où les chiffres sont permis : ce n'est pas le jeu, c'est
  l'outil qui sert à le régler. `SIM = true` coupe `sauver()` pour que les milliers de saisons
  simulées n'écrasent pas la carrière rangée dans `localStorage` (vérifié par sonde). Accessible
  depuis l'écran du journal, et copié par `vercel.json` / le workflow Pages.
  `VERSION` passe à **2** : une sauvegarde v1 n'a ni `socle` ni `fond`, autant repartir propre.
- **L'ÉCRAN D'AVANT-MATCH NE PEUT PLUS MENTIR SUR SAMEDI** (le propriétaire, 27/09/2026 :
  « je suis tombé sur un fait d'avant-match qui disait que j'étais pas dans le groupe. Mais en fait,
  j'ai joué le match »). Il s'était d'abord repris tout seul sur les faits de match — et il avait
  raison de se reprendre : un `MOMENT` ne se tire que dans `if (m.minutes)`, il ne peut pas arriver
  à quelqu'un qui n'a pas joué. Le vrai défaut était juste avant.
  - **La cause** : le groupe se décidait dans `lancerMatch()`, donc **après** `ouvrirArrets()`. Deux
    familles affirment pourtant le week-end à venir — `banc` (« samedi, tu commences sur le banc »)
    et `tempsLibre` (« tu n'es même pas dans le groupe ») — et elles parlaient d'un onze qui
    n'existait pas encore. Le match, tiré dix secondes plus tard, les démentait.
  - **Le coach annonce son groupe avant les arrêts.** `choisirSemaine()` appelle `poserEquipeDuJour()`
    juste avant `ouvrirArrets()` — **après la séance**, puisque son coût de fraîcheur nourrit
    `valeurAuPoste()`. `S.eqJour` fige le groupe en **noms + `choix`** (les objets vivants portent des
    pointeurs `ref` qui n'ont rien à faire dans une sauvegarde) ; `equipeDuJourLue()` les reconstruit
    par nom et `lancerMatch()` joue **ce** groupe-là. `apresMatch()` remet `S.eqJour` à null : le
    groupe de samedi ne vaut que pour samedi. Les deux familles sont réécrites sur `S.eqJour.statut`.
    Mesuré, 60 carrières, 2 040 journées : **le statut annoncé avant les arrêts est tenu par le match
    2 040 fois sur 2 040**, et aucun des trois écrans qui annoncent le week-end n'est démenti.
  - **Et la mesure a trouvé mieux que le bug.** « Tu n'es même pas dans le groupe » était tiré sur
    `sansJouer >= 2`, sans regarder le groupe. Mesuré sur 120 carrières : dans **la queue** (dix
    matchs ou moins sur la saison, celle que le propriétaire jouait), on est hors du groupe **2,9 %
    des semaines** et sur le banc **79,2 %**. La phrase était donc fausse à peu près chaque fois
    qu'elle sortait — et surtout, **la vie qu'il réclamait était accrochée à la mauvaise
    situation** (« étant donné que je ne suis même pas dans le groupe le week-end, ce serait bien
    qu'il y ait des trucs positifs comme le temps avec la famille », 27/09/2026). Une seizième
    famille, **`bancLong`**, la met où elle se passe vraiment : dans le groupe, sur le banc, trois
    journées sans une minute — « tu voyages, tu t'échauffes, tu t'assois. Il ne se retourne pas.
    Dimanche, en revanche, t'appartient » (le passer avec les tiens / rester seul sur le terrain
    après le match / demander à l'adjoint ce qu'il regarde chez toi). `tempsLibre` reste sur le vrai
    forfait, et y devient rare parce que le forfait l'est.
  - **Mesuré avant/après dans la queue** : les décisions « tu ne joues pas » passent de **5,3 à
    4,7 par saison** (29 % → **25 % des écrans**) — le volume tient, et chacune dit maintenant vrai.
    Diversité générale : 18,3 arrêts par saison, **seize familles**, la plus fréquente à 12 %.
- **LA CARRIÈRE CONTINUE** (le propriétaire, 27/09/2026 : « j'aimerais bien qu'on avance un peu dans
  le process de construction du jeu, parce qu'il reste plein d'autres éléments. Et sortir un peu de
  la phase labo dans laquelle on est »). Le jeu s'arrêtait au bout d'une saison : c'est la pièce qui
  débloque tout le reste, parce que **la trace qu'une carrière doit laisser n'avait nulle part où
  s'inscrire**. L'enchaînement est : bilan → **l'été** → **les offres** → la saison suivante, et au
  bout, le **bilan de carrière**.
  - **L'été est une décision** (`ETE`, quatre options, chacune avec un effet tout de suite et un qui
    dure, aucune n'a les deux) : *rentrer chez toi* (le mental remonte à son pic — ce que la saison
    n'offre jamais — et le corps se répare, mais rien de gagné sur le terrain), *passer l'été à
    travailler* (ton axe le plus loin de son plafond monte, tu arrives à 78 % de fraîcheur en août),
    *réparer ton corps* (du fond d'avance, tu te blesses moins toute l'année), *te montrer* (l'agent,
    les supporters, et de meilleures propositions).
  - **LE PLAFOND EST TON POTENTIEL, ET IL NE MONTE JAMAIS.** Première version : il montait de la
    courbe d'âge chaque saison — mesuré sur 40 carrières entières, **toutes** finissaient au maximum
    (niveau max moyen 99,4, médiane 100). Un potentiel qui se rattrape n'est pas un potentiel. Il est
    tiré à la création, il ne bouge qu'à la baisse (`usureAge()`, à partir de 29 ans), et toute la
    carrière consiste à savoir **quelle part tu en auras révélée et combien de temps tu l'auras
    tenue**. La base monte vers lui d'autant plus vite qu'on a joué et bien joué (`.09 + .26 × part`,
    plus la note), et en redescend sans rien demander à personne.
  - **Le tirage du potentiel était trop haut** (`ri(72, 96)`), ce qui ne se voyait pas sur une seule
    saison puisque `plafondReel` le borne de toute façon à « la moyenne des autres axes + 25 », donc
    à 75 en août. Sur une carrière : niveau médian **88 pour un championnat dont le meilleur club
    vaut 78**. Resserré à `ri(62, 88)` — la première saison ne bouge pas, le sommet oui (niveau max
    médian **78**, de 67 à 88 selon le tirage).
  - **Les offres, une à la fois** (`genererOffres()`), comme il l'avait demandé pour la 1.0 : refuser
    la fait disparaître, la suivante peut être pire ou ne pas venir. Le club est décrit **en mots**
    (`motClub()`, `motPlace()`) : jamais sa force. Ton club peut ne pas prolonger (33 ans et moins de
    dix matchs, ou une saison blanche) — c'est la seule chose qui t'oblige à partir, et si personne
    n'appelle, la carrière s'arrête là.
  - **Le vestiaire n'est pas le même d'une année sur l'autre** (`renouvelerEffectif()`) : chacun
    prend un an et suit sa courbe, les plus de 35 ans s'en vont, le club recrute à ton poste. Changer
    de club refait un effectif entier (`creerEffectif()`, extrait de `nouvellePartie()`) et remet les
    ententes et la confiance du coach à zéro : tout est à refaire ailleurs.
  - **Le club dérivait en marche aléatoire**, donc il s'échappait vers le haut sur vingt saisons :
    mesuré, une carrière sur quarante gagnait **dix-sept titres sur vingt saisons** — exactement ce
    qu'il reprochait à la 1.0 (« j'ai tout gagné pendant 10 ans »). Il est maintenant **rappelé vers
    ce qu'il vaut dans le championnat de cette année-là** (`.55` de lui-même, `.45` du tirage).
    Mesuré après : **3,0 titres** par carrière de vingt saisons, médiane 3, maximum 7.
  - **Un gardien marquait trois buts par saison.** Le bonus de `spec` sur la chance de marquer était
    **additif** (`+ (spec−50) × .002`), donc il s'appliquait même à un poste dont la chance est zéro :
    63 buts en carrière pour un gardien. Il est devenu multiplicatif (`× clamp(1 + (spec−50)×.006,
    .7, 1.3)`) : il amplifie ce que ton poste permet, il ne crée rien, et **à spec 50 il ne change
    rien du tout**, donc la première saison est intacte. Mesuré après : gardien **0**, défenseur 4 buts
    par saison, milieu 13, attaquant 32.
  - **Le bilan de carrière** (`ecranCarriere`) : saisons, matchs, buts, passes, moyenne, titres, la
    meilleure saison nommée, et **saison par saison** — le club, les matchs, les buts, la place et la
    note. C'est là que la trace se lit. La carte porte `no-sticky` : le bouton collant coupait la
    liste en deux.
  - **Le bandeau ne ment plus hors saison** : pendant l'été, le mercato et la fin de carrière, il
    affichait encore « 34ᵉ journée sur 34 » et le classement de l'année passée ; il dit maintenant
    où on en est, avec l'âge et le nombre de saisons.
  - **Vérifié** : 40 carrières jouées de 18 à 38 ans sans une erreur ; l'équilibre de la semaine tient
    aux trois croisements (aucune politique ne prend à la fois les matchs et la trace) ; et une vraie
    partie de la version déployée, reprise à la 17ᵉ journée, finit sa saison, passe la trêve, signe
    ailleurs et **rejoue une saison entière** — `VERSION` 10, migration sans rien à reconstruire.
  - **Ce qui reste haut, et qu'il faudra peut-être resserrer** : un attaquant médian finit à **32 buts
    par saison** au sommet de sa carrière et 653 sur l'ensemble. Les chiffres de **première** saison,
    eux, sont justes (11,6 buts pour un attaquant, 5,3 pour un milieu, 1,3 pour un défenseur) : c'est
    donc le nombre de buts d'une **équipe dominante** qui gonfle, pas la part que tu en prends. Le
    levier serait `tameXG`, et il touche tous les scores : à mesurer avant d'y toucher.
- **LE MERCATO** (le propriétaire, 27/09/2026 : « vas-y pour le mercato »). C'était la dernière
  pièce manquante du monde, et elle a commencé par en révéler une autre : **ton club avait deux
  effectifs**. `S.ligue.equipes` lui donnait vingt-deux joueurs fantômes, vieillis et « transférés »
  comme ceux des autres, et sa force en découlait — pendant que tes vrais coéquipiers étaient tirés
  de cette force. Deux populations pour un seul vestiaire, dont une que tu ne verrais jamais.
  On ne peut transférer que des gens qui existent : il fallait donc les fusionner d'abord.
  - **Une seule population.** `syncClubSq()` écrit ton vestiaire dans l'effectif de ton club (toi
    compris, marqué `moi`), `relireClubSq()` le relit après l'été : ceux qui restent **gardent leur
    objet**, donc leur âge, leurs notes, leur histoire ; ceux qui partent disparaissent ; les
    arrivants naissent là. Le partage rivaux / coéquipiers se refait chaque été, donc une recrue peut
    passer devant toi et un rival qui décline redevient un coéquipier.
  - **Un transfert a un nom, un club de départ et un club d'arrivée.** `mercato()` fait acheter ceux
    qui ont besoin et vendre ceux qui sont au-dessus de ce qu'ils visent ; un club plus fort se sert
    chez un plus petit, un club qui doit vendre perd son meilleur. Mesuré : **82 mouvements par été**
    sur les deux divisions, dont **3,5 pour ton club**. Et quand tu signes ailleurs, **tes nouveaux
    coéquipiers sont les joueurs de ce club** — ceux dont tu lisais les noms au classement et dans
    les buts encaissés — et non un effectif tiré au sort pour l'occasion.
  - **Les ventes forcées, indispensables.** Sans elles le marché ne pousse que vers le haut (un club
    qui a besoin achète, un club qui a de trop ne fait rien) : mesuré, **la moyenne du championnat
    montait de six points en dix saisons**. Un club qui doit vendre vend donc son meilleur, à un
    preneur s'il s'en présente, à l'étranger sinon.
  - **Trois entrées et trois sorties par club et par été** (`MOUV_PAR_CLUB`). Sans plafond, un club
    très au-dessus de ce qu'il vise vend tout d'un coup : mesuré, **quatorze départs et quatorze
    gamins du centre en un seul mercato**, l'écran illisible et l'effectif calibré de la première
    saison effacé. Et le joueur **poussé dehors par une recrue a un nom** : il disparaissait en
    silence, ce qui fabriquait des départs sans départ.
  - **L'écran du mercato** (`ecranMercato`) : ce que le club a fait (arrivées et départs nommés, avec
    le club d'en face et sa division), **ta place** après coup, les montées et descentes, le mercato
    des autres en repli — puis **une décision** : rentrer une semaine plus tôt, aller demander au
    coach où tu en es, mettre ton agent au travail pour l'an prochain, ou prendre les nouveaux avec
    toi. Chacune a un effet tout de suite et un qui dure, aucune n'a les deux. Et après le clic,
    l'écran dit ce que ça a produit avant de lancer la saison.
- **LES MONTÉES ET LES DESCENTES.** Deux divisions existent (`S.ligue.equipes` est **toujours celle
  où tu joues**, `S.ligue.autre` l'autre) ; on ne simule que ton classement, et ce qui ne se joue pas
  se tire au sort pondéré par la force. Les trois derniers de l'élite descendent, les trois premiers
  de l'échelon inférieur montent — et **si c'est ton club, tu descends avec lui** et la saison
  suivante se joue là, avec le même moteur. Signer dans l'autre division change ta division aussi.
  Mesuré, 393 saisons : **16 descentes, 12 montées, 30 saisons passées en bas**. Une place de milieu
  de tableau cesse d'être décorative, et l'Europe ne s'ouvre qu'en première division.
  - **La prime de l'élite** (`PRIME_ELITE`, 6 points de potentiel). Sans elle, l'échange annuel
    gonflait le championnat : l'élite troquait chaque été ses trois plus faibles contre les trois
    meilleurs d'en dessous, dont les potentiels étaient les mêmes — **+5 points de moyenne en dix
    saisons** (mesuré). Un club de l'élite a plus d'argent, il le perd en descendant, et l'échange
    redevient neutre. C'est aussi ce qui donne à une descente son poids.
  - **Un titre est un titre de l'élite** : gagner l'échelon inférieur est une **montée**, comptée à
    part (`carriere.montees`). Sans ça le bilan de carrière annonçait des titres qui n'en étaient
    pas — mesuré, 13 sur 80 premières places.
- **LA FORCE D'UN CLUB EST LA MOYENNE DE SON ONZE, Y COMPRIS LE TIEN — ET C'EST TON CLUB DE DÉPART
  QUI S'ADAPTE.** `creerEffectif()` tirait ses titulaires à `force + 2 à 8` : la moyenne du onze
  valait cinq points de plus que la force annoncée. Tant que ton club avait deux effectifs, personne
  ne s'en apercevait — le moteur de match lisait la force et ignorait l'effectif. Depuis qu'il n'en a
  plus qu'un, cette moyenne **est** sa force, et ta carrière démarrait six places plus haut. Deux
  pistes mesurées et abandonnées : **centrer l'effectif** comme chez les autres clubs donne 17,3
  titularisations à dix-huit ans au lieu de 10,2 (tes rivaux tombent à ton niveau) ; **compenser
  ailleurs dans l'effectif** préserve les titularisations mais fabrique un club bancal et te fait
  entrer dans le groupe trop facilement (29 matchs au lieu de 25). La bonne réponse ne touche ni l'un
  ni l'autre : **on démarre dans un club plus faible**, les quatre derniers du championnat au lieu
  des huit derniers. Mesuré après : première saison **10ᵉ place, club à 52,7** contre 13,9ᵉ et 50,1.
- **CE QUE LE MARCHÉ A CHANGÉ À L'ÉQUILIBRE, MESURÉ.** 45 carrières de vingt saisons avant et après :
  | | avant (`e7e5568`) | après |
  |---|---|---|
  | champions différents sur 20 saisons | 6,0 | **6,7** |
  | titre conservé d'une année sur l'autre | 43 % | **40 %** |
  | écart de ton club à la moyenne, 10ᵉ saison | +9,5 | **+6,5** |
  | tes titres par saison jouée | 0,235 | **0,266** |
  Le championnat change plus souvent de mains et ton club domine moins ; en revanche tu gagnes 13 %
  de titres en plus, parce que les offres te parviennent désormais avec la force **réelle** des clubs
  de cet été-là (le championnat vit avant le mercato, et non après ta signature) et parce qu'un club
  construit autour de toi. Première version du `vise` ancrée sur le seul potentiel : le haut du
  tableau se comprimait et le chiffre montait à **+36 %** ; une mémoire partielle
  (`force × .45 + pot × .55`) le ramène à +13 % sans rendre au champion sa rente.
  **L'arbitrage de la semaine tient** aux trois croisements : l'or des matchs et l'or de la trace
  restent sur deux lignes différentes. « Deux séances puis un repos » garde les matchs et les
  titularisations sur deux croisements ; sur le troisième « lever le pied » passe devant de 1,2 match
  — la bande de bruit du banc à 40 saisons est de ±1,6.
  **Migration 10 → 11**, vérifiée sur une vraie partie de la version déployée (17ᵉ journée) : l'échelon
  inférieur se fabrique avec les clubs restés dehors, l'effectif fantôme est remplacé par le tien au
  chargement, la saison se termine, la trêve passe, le joueur signe **dans l'autre division** et
  rejoue une saison entière. 36 clubs, zéro doublon de nom, zéro effectif mal formé.
- **LE SCORE NE PEUT PLUS CONTREDIRE LE FILM** (le propriétaire, 27/09/2026, capture à l'appui : un
  3-0 dont le film ne montrait que deux buts). Trois endroits ajoutaient ou retiraient un but **sans
  toucher aux événements** : un fait de match réussi (`m.bn++`, donc un but au score qui n'apparaissait
  nulle part — et quand c'était ta passe qui l'avait servi, le buteur ne recevait rien non plus), une
  sortie de gardien ratée (`m.be++`), et un penalty arrêté (`m.be--`, qui effaçait un but que le film
  montrait encore). Les trois passent maintenant par un événement réel : le fait de match crée « Ton
  but » ou « But de X, sur ta passe », la sortie ratée crée un but adverse nommé, et le penalty arrêté
  **retire** le but qu'il arrête et le remplace par « Penalty pour X — tu l'arrêtes ». Septième
  invariant ajouté au tableau : **le score vaut les buts du film, 0 écart sur 2 040 matchs** (25 avant
  correction).
- **UNE BLESSURE A UNE CAUSE, ET TU N'ES PLUS « VALIDE » À L'INFIRMERIE** (le propriétaire,
  27/09/2026 : « je trouve que je me blesse sans explication », capture où la case BLESSURE dit
  « Rien ne te fait mal » pendant que la hiérarchie du poste, dix lignes plus haut, te marque
  *à l'infirmerie*). Trois corrections :
  1. le tirage de blessure avait déjà trois causes — le fond qu'on s'est construit, les ischios quand
     c'est ton défaut, les jambes vides — mais l'écran n'en disait aucune. On garde **celle qui pesait
     le plus lourd** et on l'écrit : « Tu as fini le match sur les jambes », « Encore cette gêne
     derrière la cuisse », « Un appui qui part de travers, personne autour » ;
  2. la case **BLESSURE** parlait de l'usure du corps, jamais de l'arrêt en cours : elle dit
     maintenant les deux, et l'arrêt d'abord (« À l'infirmerie : 3 journées encore ») ;
  3. **tu comptes dans les absents** quand c'est toi qui manques (« Toi et Diallo manquez ce
     samedi »), et « Ta place » ne te conseille plus de rester dans les plans quand tu ne joueras pas.
- **TON CORPS N'ÉTAIT BRANCHÉ SUR RIEN** (le propriétaire, 27/09/2026 : « l'onglet blessure dans ma
  situation n'est pas connecté à ma situation correctement »). Mesuré avant de toucher à quoi que ce
  soit, 1 020 semaines : `S.etats.corps` a une **médiane de 89 et un dixième centile de 86** — la
  case disait « Rien ne te fait mal » **86 % du temps** et n'atteignait jamais ses bandes basses,
  parce que les étés rendaient plus que la saison ne prenait (+12 ou +24 contre −5). Et elle ne
  servait à rien : aucune mécanique ne lisait ce chiffre. Deux fautes d'un coup, contre la règle du
  projet — *chaque chiffre affiché doit avoir une conséquence visible*.
  - **L'usure est une cible qui descend avec l'âge**, pas une punition qui s'empile. `cibleCorps(age)`
    vaut 96 jusqu'à vingt-cinq ans puis perd 1,9 par an ; le corps y revient de 5 % par semaine, et
    ce qu'on lui fait subir l'en écarte (les matchs, davantage quand on finit sur les jambes, les
    blessures, l'été de travail). **On répare, on ne rajeunit pas.**
  - **Première version, trop violente, et corrigée** : une usure qui s'accumulait (matchs + blessures
    + années) avec une blessure qui coûtait du corps et un corps usé qui faisait se blesser — la
    spirale. Mesuré : **corps à 77 dès vingt ans, 47 à vingt-trois, et une semaine sur trois à
    l'infirmerie**. Le rappel vers la cible est ce qui la ferme.
  - **Et elle sert enfin à quelque chose** : on se blesse un peu plus (`(88 − corps) × .0008`) et on
    récupère un peu moins vite (`× (1 − (88 − corps) × .002)`). Comme cela ajoutait des blessures à
    un jeu qui en comptait déjà beaucoup (11 à 20 % des semaines à l'infirmerie **avant** ce lot,
    mesuré sur la version déployée), le coût des jambes vides descend de 5 à 3,5 points : le total
    reste où il était.
  - **Les quatre bandes sont posées là où le corps passe vraiment** (89 / 80 / 71) : mesuré sur 24
    carrières entières, « Rien ne te fait mal » jusqu'à vingt-six ans, « Quelques douleurs » de
    vingt-sept à trente et un, « Tu récupères moins vite » de trente-deux à trente-six, « Ton corps
    commence à te lâcher » après. **La phrase change 127 fois par carrière** — elle ne bougeait
    pratiquement pas.
- **CE QUI S'EST PASSÉ SUR LE TERRAIN PÈSE PLUS QUE LA CHANCE** (le propriétaire, 27/09/2026 : « je
  trouve certaines notes un peu trop justes »). Mesuré sur 14 387 notes de coéquipiers : un but
  rapportait **+1,5** quand le tirage aléatoire de la note en valait **2,6 d'amplitude** — donc un
  buteur pouvait finir sous un défenseur qui n'avait rien fait, ce qu'il avait sous les yeux
  (Chevalier marque et prend 7,2, Garnier ne marque pas et prend 8,9). Le tirage tombe de
  `±1,3` à `±0,95`, un but passe de 1,2 à **1,5**, une passe décisive de 0,4 à **0,55**, et le clean
  sheet d'un défenseur de 0,8 à 0,7 — pour qu'un but batte toujours un match propre. Mesuré après :
  **un but 7,89** (contre 7,59), un doublé **9,20** (contre 8,58), un défenseur en clean sheet
  victorieux **7,10**, et la part des buteurs qui finissent sous la moyenne de ceux qui n'ont rien
  fait tombe de **3 % à 1 %**. L'étendue des notes ne bouge pas (10ᵉ 5,2 · médiane 6,2 · 90ᵉ 7,5) :
  c'est la chance qui a cédé sa place aux faits, pas le relief qui a disparu.
  **Vérifié** : les sept invariants du tableau des notes à zéro écart sur 2 040 matchs, les
  invariants du monde à zéro sur 14 carrières, l'arbitrage de la semaine tient aux trois croisements,
  `tests/simulate.js` → `ERRORS: none`.
- **LA VIE ET L'ARGENT** (le propriétaire, 27/09/2026 : « vas-y pour la vie et l'argent »). C'est le
  chantier qui attaque le problème de fond, dit dès le 21/09 : *« une carrière doit laisser une
  trace. Aujourd'hui elle en laisse trop peu — on ne s'attache pas vraiment aux carrières, c'est un
  peu sans effet sauf quand c'est le jackpot. »* Il n'avait jusqu'ici nulle part où se résoudre : le
  hors-football tenait dans quatre familles d'arrêts sur dix-sept, l'argent n'existait pas, et
  **l'ambition choisie à la création était stockée sans jamais être lue**.
  - **L'argent, à l'échelle de l'époque.** `salaireDe(niveau, âge, force du club, division)` en
    millions de 2015, rendu par `money()` d'`eras.js` : mesuré, un débutant touche **1 kF en 1962,
    19 k€ en 2018**, une star **201 kF** ou **3,5 M€**. Chaque offre porte **son salaire et sa
    durée**, et le salaire ne suit pas la force du club — un club moyen qui te veut vraiment paie
    plus qu'un grand qui hésite. C'est là qu'est l'arbitrage : jouer, ou gagner sa vie. Rester, c'est
    renégocier ; une saison rapporte le salaire plus les primes (titre, coupe, Europe, montée, et
    tes matchs joués).
  - **Les tiens** (`S.vie.proches`) ne sont pas une jauge de plus : ils décident de **ce que ta tête
    encaisse**. Avec du monde derrière toi, un mauvais samedi se répare dans la semaine (la
    récupération mentale passe de +0,12 à +0,3) ; sans personne, il s'installe et chaque coup dur
    coûte jusqu'à 30 % de plus. Le football les éloigne tout seul — chaque saison, et chaque
    changement de club — donc les garder est un arbitrage, pas un acquis. Mesuré, 24 carrières
    entières : ils tiennent autour de **55 à 65** quand on s'en occupe, et tombent quand on ne le
    fait pas.
  - **L'écran de la vie**, dernier temps de l'intersaison et le seul qui ne parle pas de football :
    bilan → l'été (ton corps) → les offres (ton club) → le mercato (ton vestiaire) → **la vie (toi)**.
    Trois façons de passer l'année (mettre de côté, faire vivre les tiens, en profiter) et, quand tu
    peux te le payer, un **chantier**.
  - **Les chantiers sont la seule chose du jeu qui survit à la carrière** : la maison des tiens, le
    diplôme, une école de foot dans ton quartier, une affaire à monter. Chacun coûte un multiple de
    ton **meilleur** salaire — et non de celui du moment, sinon une école de foot devenait bon marché
    à trente-sept ans, quand le salaire s'effondre et que le compte est plein. Premier calibrage trop
    bas : mesuré, **les quatre chantiers étaient construits dans les 24 carrières**. Après
    resserrement : diplôme et maison pour presque tout le monde, **l'affaire dans deux carrières sur
    trois, l'école dans une sur six**. Ce sont les deux grosses qui sont un choix.
  - **L'ambition, enfin lue.** Elle juge chaque saison et donne du mental quand tu obtiens ce que tu
    étais venu chercher, en coûte quand tu passes à côté. **Trois états et non deux** : mesuré avec
    deux, « tout gagner » ratait **97 saisons sur 118** — une ambition qui punit neuf fois sur dix
    n'est plus une ambition, c'est une taxe. Le presque-compte existe donc (un podium, une demi-finale),
    et on ne reproche pas à un joueur de vingt ans de n'avoir rien bâti tant que rien n'est à sa
    portée. Mesuré après, 24 carrières : gagner **63+/55−**, les proches 47/73, l'argent 67/53.
  - **Le bilan de carrière dit ce que tu laisses** : le jugement de ton ambition sur l'ensemble, les
    chantiers qui tiennent encore, ce qui reste sur le compte et où en sont les tiens. C'est là que
    la trace se lit, et c'était précisément ce qui manquait.
  - **Trois promesses d'écran qui ne correspondaient pas au code**, trouvées en relisant les
    pastilles : le diplôme annonçait « tu as la tête ailleurs cette saison » sans rien coûter (il
    coûte maintenant du travail au poste), la maison disait « une saison de salaire » pour trois ans,
    et l'affaire « une fois sur trois, ça coule » pour un risque annuel qui, cumulé, en valait trois
    sur quatre.
  - **Un piège fermé au passage** : `monEntree()` (ton club dans la ligue) était **masquée par une
    variable locale du même nom** dans le moteur de match — ta minute d'entrée. Les deux ne se
    croisaient pas encore ; la fonction s'appelle `monClub()`.
  - **Vérifié** : 24 carrières entières jouées de 18 à 38 ans avec tous les écrans, zéro erreur ;
    les invariants du monde à zéro ; l'arbitrage de la semaine tient aux trois croisements ;
    la monnaie d'époque relue sur quatre époques ; **migration 11 → 12 sur une vraie partie de la
    version déployée** (17ᵉ journée) — salaire recalculé au chargement, saison finie, trêve passée,
    écran de la vie joué, deuxième saison entière.
  - **Un écart connu et non reproduit** : sur un balayage de 8 160 matchs, **un seul** a compté 15
    notes pour 16 attendues (et un sortant de moins). Deux balayages de 8 160 matchs ensuite n'ont
    rien trouvé — environ un match sur seize mille. Le défaut est antérieur à ce lot (rien ici ne
    touche au moteur de match) et la sonde garde désormais le détail du match fautif pour la
    prochaine fois.
- **TRENTE ET UN FAITS DE MATCH, ET LES QUATRE JAUGES REBRANCHÉES** (le propriétaire,
  29/09/2026 : « vas-y code le et rebranche les quatre jauges »). C'est la mise en code de la page
  de décisions écrite avec lui et corrigée cas par cas —
  **https://claude.ai/artifact/VDvYbM8fkUtuAMyfu58eAW** — après une vingtaine d'allers-retours sur
  les récompenses et les conséquences.
  - **Trente et un faits au lieu de huit** : dix-huit par poste (deux à cinq chacun), six communs
    à tous les postes (le coéquipier qui craque, le ballon qu'il ne t'a pas donné, la ligne à dix,
    le jeune, la bagarre, la cuisse) et **sept réservés au mercredi** (le petit club, la pelouse,
    les tirs au but — une version pour le tireur, une pour le gardien —, le déplacement européen,
    le grand joueur en face, la finale). Chaque option porte **une issue réussie et une issue
    ratée**, chacune avec son texte, sa valeur de note, son événement et son deuxième effet.
  - **Chaque issue écrit dans le match** (`ecrireFait()`) : un but, une passe décisive, un but de
    l'équipe, un but encaissé, une occasion, un penalty arrêté ou manqué, un but sauvé, un carton
    (un deuxième jaune fait un rouge), une blessure, une sortie. Le film, le score, les pastilles
    et la note viennent donc **de la même source** : ils ne peuvent plus se contredire. Trois
    pastilles de plus (🧤 penalty arrêté, 🛡️ but sauvé, ❌ penalty manqué).
  - **Le mercredi a son fait**, un seul, joué avant que la note du match tombe. `jouerAnnexe()` rend
    la main à l'écran du moment (`S.faitAnnexe`) et `finirAnnexe()` reprend là où elle s'était
    arrêtée : la semaine garde ses trois clics.
  - **Et parfois ça va aux tirs au but.** Un nul de coupe était **toujours** tranché en
    prolongation, donc la séance n'existait pas — et les deux faits qui en parlent pouvaient tomber
    sur un 3-0, ce qui se lit tout de suite comme un défaut (vu à l'écran avant de livrer). Une fois
    sur deux le match va au bout : mesuré, **65 séances sur 1 107 mercredis**, et **26 faits de tirs
    au but joués, zéro sur un match qui n'y allait pas**.
  - **L'échelle des faits sur la note** (`ECHELLE_FAIT` = 1,8). Chaque issue porte sa valeur, posée
    cas par cas avec lui (« la note paie ce que l'action a évité » : un penalty sauvé 1,2, une action
    mineure évitée 0,4). Ces valeurs disent le **rapport** entre deux actions, pas des points de note
    absolus — et à l'échelle 1, mesuré sur 13 600 notes de trente carrières entières, elles rendaient
    un tiers de ce que rendait l'ancien forfait de 0,95 par fait : les matchs **sous 5,0 tombaient de
    5,8 % à 3,0 %** et les **9,0 et plus de 7,4 % à 2,9 %**, c'est-à-dire exactement le relief qu'il
    avait demandé le 27/09 (« des soirs de gala et des soirs qu'on veut oublier »). Un seul
    coefficient commun préserve tous ses arbitrages relatifs et rend le relief. Mesuré après :
    **10ᵉ 5,4 · médiane 7,0 · 90ᵉ 8,5**, sous 5,0 **5,2 %**, 9,0 et plus **5,0 %**, 9,5 et plus
    **2,1 %** (contre 2,7 % avant : le 10 reste rare). *Le nombre de faits n'était pas le levier* :
    monter à trois faits par match, comme il l'a demandé, n'a déplacé les queues que d'un dixième de
    point — c'est la valeur d'un fait qui les fait, pas leur nombre.
  - **Ton propre carton te coûtait zéro** : `notesEquipe()` retire .25 par jaune et 1,3 sur un rouge
    à un coéquipier, et ta note ne regardait pas les tiens. Il avait pourtant nommé ce canal lui-même
    (« chaque fait de match doit avoir un impact sur la note, que ce soit à travers la conséquence —
    exemple un but, un carton jaune, une suspension »). Même barème pour toi (`poidsCartons()`).
  - **Tu sors, donc quelqu'un entre.** Première version : la sortie coupait seulement tes minutes,
    ce qui était faux deux fois — pour un remplaçant, `m.minutes` est un nombre de minutes jouées et
    non la minute de sortie, donc le fait ne faisait **rien du tout** ; et pour un titulaire, tu
    quittais le terrain sans remplaçant, ce qui laissait **un nombre impair de sortants** (mesuré :
    33 matchs sur 2 040), exactement le défaut qu'il avait relevé sur les rouges. `sortirDuMatch()`
    l'accroche à un changement réel. Et **on ne remplace pas un expulsé** : ton rouge a déjà arrêté
    ton match, t'en faire aussi sortir te comptait deux fois.
  - **Un joueur entré en jeu peut ressortir**, et c'est la sonde qui avait tort : l'invariant
    supposait deux sortants par changement, alors qu'un remplaçant dont la cuisse lâche compte pour
    deux changements et une seule ligne de notes. Il compte désormais les joueurs **distincts**.
  - **Les quatre jauges.** Mesuré sur 25 carrières entières, avant et après :
    | jauge | avant | après | ce qu'elle fait maintenant |
    |---|---|---|---|
    | **le club** | 5ᵉ 23 · méd. 50 · 95ᵉ 70, **lue nulle part** | 5ᵉ 39 · méd. 57 · 95ᵉ 94 | il prolonge ou non en juin (seuils 64 et 28), il paie ±18 % à la renégociation, et il te protège : le plancher de la confiance du coach passe de 42 fixe à **36-50 selon lui** |
    | **les supporters** | 5ᵉ 51 · **méd. 100** | 5ᵉ 49 · méd. 68 · 95ᵉ 89 | **l'avantage du terrain à domicile** (`(v−50)×.034`, borné ±1,2 quand le terrain vaut 2,40) et ta cote aux offres |
    | **la sélection** | **0 partout, jamais lue** | 5ᵉ 0 · méd. 18 · 95ᵉ 74 | converge vers ce que tu vaux face au meilleur club du pays, et ouvre des clubs qui ne t'appelaient pas |
    | **les tiens** | 5ᵉ 0 · méd. 56 | 5ᵉ 1 · méd. 55 · 95ᵉ 100 | **les arrêts l'ouvrent enfin** (`liens:{ proches }`), et une **borne** arrive avec la porte |
  - **Deux jauges ne s'accumulent plus.** Les supporters n'avaient **que des gains** — pas de rappel,
    pas d'oubli — et personne ne s'en apercevait puisque rien ne les lisait : médiane **100** sur une
    carrière entière, donc l'avantage du terrain qu'on venait de leur donner aurait été une constante
    de +1,20, c'est-à-dire pas une décision. Un public s'entretient (rappel de 5 % par journée vers
    46). La sélection, elle, **converge** vers ce que tu vaux cette année-là au lieu de cumuler : un
    sélectionneur ne garde pas un crédit acquis à vingt-deux ans. Mesuré après : le stade pèse
    **−0,05 à +1,20** selon les matchs (médiane +0,63), et **10 carrières sur 25** passent au-dessus
    de 60 en sélection.
  - **LA BORNE, ET LA QUESTION QU'IL AVAIT POSÉE LUI-MÊME** : « si je fais que m'occuper de ma
    famille, ça va arrêter mon mental suffisamment pour pas avoir à entraîner le mental ». Maintenant
    que les arrêts peuvent faire bouger les tiens, la récupération naturelle s'arrête **deux points
    sous ton pic** (`BORNE_TETE`), jamais au pic. Mesuré, trois politiques sur des carrières
    entières :
    | politique | réserve | pic | manque |
    |---|---|---|---|
    | les tiens, jamais le mental | 59,0 | 61,6 | **2,60** |
    | le mental, jamais les tiens | 66,1 | 67,0 | 0,89 |
    | ni l'un ni l'autre | 40,4 | 53,4 | 12,96 |
    Les tiens te tiennent la réserve pleine à un cran près, **et ne montent jamais le pic** : le
    dernier cran ne s'achète qu'à l'entraînement. Sa lecture était juste, et la borne y répond.
  - **Chaque jauge dit ce qu'elle change** (`pourquoiLien()`, une ligne grise sous la phrase, aux
    **seuils du moteur** et non à des seuils d'écriture) : « Le club t'a oublié. *Ils ne passeront
    rien : une saison creuse, et c'est fini.* » Sans elle, rebrancher une jauge ne se verrait pas —
    c'est la règle du projet, chaque chiffre affiché doit avoir une conséquence visible. Première
    version relue à l'écran avant de livrer : le HTML passait par `esc()` et s'affichait en clair,
    et « Le stade t'apprécie » tombait à côté de « le stade est neutre ». Les deux corrigés.
  - **Le calibrage de la cote, mesuré et resserré** : à `.05` et `.055`, le stade et la sélection
    montaient la cote de deux points et demi et **tes titres par carrière de 5,2 à 6,7** — ce n'était
    plus un coup de pouce, c'était une promotion. À `.03` et `.035` ils valent ensemble un point et
    demi, du même ordre que l'agent : mesuré sur 24 carrières de vingt saisons, **5,3 titres contre
    6,3** avant, 4,8 champions différents contre 4,6, titre conservé **43 % contre 49 %**.
  - **Vérifié** : les **sept invariants du tableau des notes à zéro écart sur 6 120 matchs** (trois
    passages) ; **31 faits sur 31** tirés, score = film **0 écart** ; l'arbitrage de la semaine tient
    aux trois croisements (l'or des matchs à « deux séances puis un repos » partout, l'or de la trace
    ailleurs, et « lever le pied » n'est le meilleur nulle part) ; les invariants du monde à zéro
    (effectifs, postes, doublons) ; `tests/simulate.js` → `ERRORS: none` ; **migration 12 → 13** sur
    une vraie partie de la version déployée — saison finie, trêve passée, signature en D2, saison
    entière rejouée — et une sauvegarde prise **en plein match** (les faits ont changé de forme) est
    rendue au lundi de la même journée, sans erreur.
  - **Ce qui reste de la page de décisions** : les dix-sept arrêts réécrits (§ 2) et les douze
    familles nouvelles (§ 3) ne sont pas encore codés, et **le sous-système de la sélection** — la
    convocation, les deux matchs en pleine semaine, les jambes que ça coûte — est celui qu'il a
    lui-même remis au lot suivant (« oui, mais au prochain lot »). Seule la jauge est vivante.
- **LES SOIRS QU'ON VEUT OUBLIER** (le propriétaire, 29/09/2026 : « les matchs en dessous de 5,0,
  c'est très peu, trop peu »). Il lisait le **3,0 %** du lot précédent, qui était la mesure *avant*
  correction — la version livrée était à 5,2 %. Ça ne changeait rien à son point, et la mesure lui
  a donné raison plus fort qu'il ne le disait : ce n'est pas le bas qui manquait, c'est **le haut
  qui débordait**.
  - **Mesuré d'abord, terme par terme, sur 8 700 de tes notes.** Tu **gagnes 61 % de tes matchs**
    (un joueur de carrière finit dans un bon club), et tous les termes du barème tiraient vers le
    haut : résultat +0,22, tes buts +0,21, clean sheet +0,25, ton niveau au-dessus du club +0,13 —
    contre un seul terme négatif, un forfait de −0,4 sur une défaite **quel que soit le score**.
  - **Une défaite lourde est un soir qu'on veut oublier, à tous les postes.** Une défaite 4-0 te
    laissait une médiane de **6,1** et 18 % de notes sous 5,0, et pour un milieu ou un attaquant les
    buts encaissés ne comptaient **pas du tout**. L'écart au score pèse maintenant (−0,38 par but
    au-delà du premier, borné à −1,1) et quatre buts encaissés se paient partout (−0,45 pour les
    postes de devant, le clean sheet d'un défenseur passant de −0,5 à −0,7). Mesuré après : médiane
    **5,3** sur une défaite lourde, et **33 à 42 % de notes sous 5,0** selon le poste.
  - **Un résultat vaut ce qu'il a coûté** (`duelResultat()`). Gagner et garder sa cage inviolée
    payaient le même prix contre n'importe qui : au sommet d'une carrière, **42 % de tes matchs
    passaient au-dessus de 7,5** pour 4 % sous 5,0 — les grands soirs étaient devenus ordinaires,
    exactement l'argument qu'il faisait lui-même sur le 10. La récompense suit désormais la
    difficulté (×0,55 quand on écrase, ×1,3 quand on va chez plus fort) — et **seulement la
    récompense** : une défaite lourde coûte son prix plein quel que soit l'adversaire.
    *Un couplage trouvé à la mesure* : la difficulté incluait d'abord **ton propre apport**
    (`(niveauJour − force) × .12`), donc mieux tu t'entraînais, moins tes victoires payaient. C'est
    la difficulté de **l'équipe** qu'on lit, pas la tienne.
  - **L'aléa de la note n'est plus amorti par le mental.** Il l'était d'un côté seulement — la
    malchance, jamais la chance — ce qui donnait à un joueur au mental entraîné un biais vers le
    haut que rien à l'écran ne nommait. Le propriétaire avait déjà tranché le principe le 27/09 en
    redéfinissant le mental (« ma définition amortissait un aléa que le joueur ne voit jamais ») ;
    le mental se paie depuis par `coutMental()`, sur des événements qui ont un nom. Le tirage est
    symétrique (±0,85, contre ±0,95 chez tes coéquipiers).
  - **Mesuré après, et c'est le tableau qui compte** — la lecture par tranche de carrière, que je
    n'avais jamais faite :
    | saisons | 10ᵉ | médiane | 90ᵉ | sous 5,0 | au-dessus de 7,5 | victoires |
    |---|---|---|---|---|---|---|
    | 1 à 3 | 4,6 | 6,5 | 8,1 | **14,0 %** | 21,6 % | 39 % |
    | 4 à 8 | 5,4 | 7,1 | 8,5 | 5,4 % | 32,8 % | 59 % |
    | 9 à 14 | 5,6 | 7,2 | 8,6 | **3,9 %** | 38,3 % | **70 %** |
    | 15 et + | 4,9 | 6,7 | 8,2 | 10,8 % | 23,7 % | 54 % |
    Sur la carrière entière : **sous 5,0 de 5,2 % à 7,4 %**, au-dessus de 7,5 de 33,7 % à 32,1 %.
    Les mauvais soirs ne manquent pas — ils manquent **au milieu d'une carrière**, quand on gagne
    sept matchs sur dix dans un club qui domine, et c'est du football juste. Ce qui reste à décider,
    et qui est le sien : s'il en veut aussi au sommet, le levier n'est pas la note, c'est **le monde**
    (ton club qui domine son championnat).
  - **Une correction à une affirmation que j'ai faite** : j'avais écrit que « toujours lever le
    pied » n'était la meilleure politique nulle part. **C'est faux, et ça l'était déjà dans la
    version en ligne.** Mesuré à 100 saisons par ligne (ma mesure précédente était à 40, c'est-à-dire
    dans le bruit), sur le code déployé : « lever le pied » prend les matchs **et** les
    titularisations à deux croisements sur trois (académie milieu : 24,4 matchs et 12,7
    titularisations contre 22,1 et 9,8 pour « deux séances puis un repos »). La cause est dans
    `niveauJour()` : 50 points de fraîcheur d'écart valent **+2,5**, quand une saison entière
    d'entraînement en rend 1 à 1,5 en moyenne. Le lot présent **resserre** l'écart sans le fermer
    (+0,1 match et +1,0 titularisation au lieu de +2,3 et +2,9), et l'invariant faible tient
    toujours — aucune ligne ne prend à la fois les matchs et la trace. Fermer vraiment l'écart
    demande de toucher au poids de la fraîcheur dans `niveauJour()`, qui alimente aussi le moteur de
    match et la note : c'est un arbitrage de conception (se reposer *doit-il* faire jouer plus ?),
    donc c'est au propriétaire de trancher, pas un réglage à faire dans son dos.
  - **Vérifié** : les sept invariants du tableau des notes à zéro écart ; 31 faits sur 31, score =
    film 0 écart ; les invariants du monde à zéro ; `tests/simulate.js` → `ERRORS: none` ; **aucune
    migration nécessaire** (`m.ecartForce` manque à une sauvegarde v13 prise en plein match et vaut
    alors zéro, soit un duel neutre) — vérifié en reprenant une vraie partie de la version déployée,
    saison finie, trêve passée, saison entière rejouée.
- **LA SÉLECTION, ET UN COÛT QUI N'EXISTAIT PAS** (le propriétaire, 30/09/2026 : « on enchaîne »).
  Le dernier morceau de la page de décisions : la jauge vivait et ouvrait des clubs depuis le
  29/09, mais la convocation, les deux matchs de milieu de semaine et le calendrier international
  n'existaient pas. Ils existent — et la mesure a démenti ce que j'attendais du reste.
  - **Cinq fenêtres par saison** (`J_SELEC` = 5, 12, 18, 23, 30, toutes hors coupe et Europe), deux
    matchs d'un bloc, joués **avant** que le coach pose le groupe du week-end, comme le mercredi de
    coupe : la semaine garde ses trois clics, le mercredi se lit. **La convocation ne se re-décide
    pas** : le premier appel est l'arrêt `selection`, ensuite tu y es et tu y restes tant qu'on te
    garde — sinon ce serait un clic de plus toutes les cinq journées.
  - **Ta place là-haut n'est pas celle de ton club** (`statutSelec()`) : au-dessus de 75 tu es
    titulaire, au-dessus de 58 trois fois sur cinq, en dessous tu regardes beaucoup. Ce que tu y
    fais décide si on te rappelle (`(note − 6,2) × 7` sur la jauge), ce que le pays retient de toi
    (supporters, agent) et, sous 38, **on ne te rappelle plus** — la sortie du sous-système, sans
    laquelle une sélection obtenue une fois serait acquise à vie.
  - **On ne voyage pas depuis l'infirmerie.** Sans cette porte, la fenêtre jouait deux matchs à un
    joueur que l'écran de la semaine annonce blessé ou suspendu. Mesuré : **717 fenêtres sur 3 168**
    sont perdues comme ça, et ça coûte trois points de jauge — un autre a tenu la place, et il peut
    la garder.
  - **Deux corrections d'échelle, les deux trouvées à l'écran avant de livrer.** (1) Les nations
    étaient étalées comme un championnat (50 à 78) alors que l'espérance de buts est une
    exponentielle de l'écart divisé par 19, calibrée sur des écarts de club : d'où « l'Irlande 7–1 »
    et « le Mexique 6–1 ». Seize points du haut en bas (68 à 84) suffisent — entre nations, le
    dernier tient le match contre le premier. (2) `nous` valait « le meilleur club du pays + 4 »,
    donc **la force de la France dépendait de la division où tu jouais** : mesuré, elle perdait
    **64 %** de ses matchs et encaissait 2,18 buts. `FRANCE_FORCE` = 80, un grand sans être le plus
    grand. Mesuré après, 814 matchs : **1,63 but marqué, 1,24 encaissé, 46 % de victoires, 23 % de
    nuls**, et 3 % de matchs à sept buts ou plus.
  - **Mesuré, 260 carrières entières, 5 084 saisons, 3 168 fenêtres** : **177 carrières sur 260**
    (68 %) sont appelées au moins une fois, **premier appel à 25 ans** (médiane), **22 % des
    saisons** passées dans le groupe, **40 sélections** par carrière appelée (max 96), et **143
    fois** on ne rappelle plus. La note en sélection est de **6,18** contre 6,96 en club : une
    première sélection est dure, et ça se voit enfin dans un chiffre.
  - **CE QUE LA TRÊVE COÛTE, ET CE QU'ELLE NE COÛTE PAS — mesuré, et ça contredit ce que j'avais
    posé.** Elle prend 27 points de fraîcheur sur la semaine (35 au coup d'envoi de samedi contre 63
    une semaine ordinaire) et **rien d'autre** : à l'intérieur des mêmes saisons, le samedi d'après
    est le même : **97,4 % de titularisations contre 97,5 ; 83,8 minutes contre 83,9 ; 1,6 % de
    blessures contre 1,3 %** (n=2 208 contre 106 646 — le dernier écart vaut une erreur-type, donc
    ce n'est pas un résultat). La cause n'est pas la fenêtre, c'est la forme du vestiaire : quand on
    est appelé, on est **24 points au-dessus du dernier titulaire de son poste** (marge médiane,
    mesurée sur 10 828 semaines), et sur 3 168 fenêtres **une seule** est tombée une semaine où la
    place se jouait. J'avais ajouté une pénalité de « retour de sélection » sur le choix du onze et
    sur la minute du changement : mesurée, elle ne pouvait pas se déclencher. **Retirée** — une
    mécanique qui ne se déclenche jamais n'est pas un coût, c'est de la décoration, et c'est
    exactement la règle du projet prise à l'envers. Donc, dit franchement : **la trêve coûte des
    jambes et des blessures de dette, pas ton samedi.**
  - **Ce qui reste à décider, et c'est à lui** : si une semaine internationale doit coûter plus que
    des jambes, le levier n'est pas dans la sélection — c'est le poids de la fraîcheur sur le temps
    de jeu d'un titulaire indiscutable, compressé par construction (−6 minutes du frais au cuit
    après 21 ans, mesuré sur le code déployé). Et une correction à une affirmation de moi : le
    tableau « 71,3 → 52,5 minutes » du 30/09 était mesuré sur **la première saison seulement** (la
    sonde s'arrêtait au premier bilan) ; sur une carrière entière l'écart est de **−6 à −12
    minutes** selon l'âge, et c'est chez le jeune qu'il est fort.
  - **À l'écran** : un bloc « La sélection » sur l'écran de résultat (les deux scores, tes minutes,
    tes notes, et la ligne qui dit qu'on ne te rappelle plus), une case dans le bilan de saison, les
    sélections et les buts dans le bilan de carrière, l'annonce avant le choix de la séance
    (`direMercredi()`), et `pourquoiLien('selection')` qui dit enfin ce que la jauge fait des deux
    côtés : ta place dans la liste **et** les clubs qu'elle ouvre.
  - **Vérifié** : 31 faits sur 31 tirés, **score = film 0 écart** sur 11 332 faits, zéro doublon de
    nom ; 24 carrières entières de 18 à 38 ans avec tous les écrans, zéro erreur ;
    `tests/simulate.js` → `ERRORS: none` ; les notes restent dans leur bande (carrière entière
    moyenne **6,96**, sous 5,0 8,7 % ; saisons 1 à 3 : 17,1 %) et la moyenne reste au-dessus du
    pivot de 6,2 que lit la confiance du coach ; le banc d'essai à **250 saisons par ligne** tient
    l'invariant aux trois croisements (académie·M : matchs technique 22,5±0,44, trace poste +7,2 ;
    quartier·D : matchs mental 21,0±0,45, trace physique +9,9 ; étranger·A : les trois premiers sur
    les matchs sont dans une erreur-type, donc une égalité, et la trace va à la technique +9,2) ;
    les trois variantes de l'écran relues à l'écran (joué, banc, pas parti) sans un `undefined` ;
    **migration 14 → 15** sur une vraie sauvegarde de la version déployée (17ᵉ journée) — on n'y met
    personne d'office, le groupe se gagne par l'arrêt comme pour une carrière neuve — saison finie,
    trêve passée et **deuxième saison entière** jouée, et une sauvegarde prise **pendant** une
    fenêtre internationale se recharge sans erreur.
- **LE MODE ENTRAÎNEUR·EUSE EN 2.0** (le propriétaire, 01/10/2026 : « vas-y pour le mode entraîneur
  en 2.0 »). La dernière pièce du 2.0, et la moins coûteuse à écrire pour la plus grosse surface :
  **le monde était déjà là.** `moteur.js` porte deux divisions de dix-huit clubs à vingt-deux
  joueurs nommés, un marché qui les échange, des montées et des descentes, la coupe, l'Europe, le
  film d'un match et les notes de tout le monde. Un entraîneur·euse n'a pas besoin d'un autre
  monde : il a besoin d'une autre place dedans. `v2/coach.js` et `v2/ecransCoach.js` ne refont donc
  ni la ligue, ni le marché, ni les notes — ils refont **la semaine, le match vu du banc, les
  arrêts, le président et le bilan**. En une phrase : le joueur·euse se bat pour sa place dans un
  onze, l'entraîneur·euse se bat pour **garder son poste**.
  - **UN SEUL `if` DANS LE CODE PARTAGÉ, et c'est ce qui rend le lot possible.** `equipeDuJour()`
    ajoutait une ligne « moi » à la liste du groupe ; en mode entraîneur·euse **personne ne s'appelle
    moi**, et c'est tout ce que le choix du onze a besoin de savoir. Le groupe de dix-huit, les
    changements, les notes, la réserve, les sept invariants du tableau : tout marche ensuite sans une
    ligne de plus (`notesEquipe()` saute déjà `x.moi`, et `S.concurrents` est vide). Deuxième et
    dernier point de contact : `effectifTrie()`, qui poussait une ligne « toi ».
  - **Quatre axes, un effet mécanique chacun** — c'est la correction du défaut que la cartographie
    du 26/09 avait trouvé en 1.0, où `management` n'était lu nulle part : **le jeu** entre dans la
    force de l'équipe à chaque match (±1,65 quand l'avantage du terrain vaut 2,40), **le vestiaire**
    fait monter les trois ententes plus vite et les retient quand elles tombent (et amortit ce qu'une
    mauvaise série coûte au président), **le banc** décide de la réussite de tes décisions en cours
    de match, **le réseau** de ce que la direction te laisse faire et de qui t'appelle en juin.
  - **La semaine : six cartes, et ce sont les jambes de vingt-deux personnes qu'elle coûte.** La
    vidéo (un plan pour samedi), la semaine athlétique, les individuels (trois joueurs **nommés**),
    le vestiaire, le bureau, deux jours de repos. Chacune a un coût et un gain, aucune n'a les deux.
  - **L'écran de mi-temps était mort en 1.0** (`HALFTIME_CHOICES` injouables, relevé par la
    cartographie) : il revient, et il n'est plus seul. **Dix situations de match** — la mi-temps
    menés, la mi-temps devant, à dix, un cadre qui sort, un penalty, 0-0 à la 70ᵉ, un but d'avance à
    la 83ᵉ, le stade qui s'en prend à un des tiens, ton meilleur joueur qui marche, la décision de
    l'arbitre. Règle dure, la même que pour les trente et un faits du joueur·euse : **une issue ne
    touche jamais le score, elle crée un événement** — donc le film, le score, les pastilles et les
    notes viennent de la même source et ne peuvent pas se contredire. La réussite lit `banc` et
    l'entente de la ligne concernée.
  - **Quatorze familles d'arrêts** : la presse, le président, le capitaine, l'agent, le gamin,
    l'infirmerie, les supporters, le directeur sportif, chez toi, l'adversaire, le déplacement, la
    série, le carton qui pend, un autre club qui appelle.
  - **LA PORTE, et c'est le « ne pas jouer » de l'entraîneur·euse** : la confiance du président se
    juge par quart de saison (journées 9, 17, 24, 30) et sous 28 on est démis. La saison se joue
    alors sans toi, puis l'été arrive comme pour tout le monde.
  - **Mesuré, 24 carrières, 653 saisons, zéro erreur** : **40 décisions par saison** (16,9 arrêts +
    23,2 décisions de match) — dans la bande « 30 à 40 » qu'il avait nommée le 22/09 ; **14 familles
    sur 14** et **10 sur 10** tirées, **aucune option jamais prise** sur quarante-huit, la plus
    fréquente à 10,1 % ; objectif atteint **56 %** ; **1,25 renvoi par carrière** de 27 saisons ;
    2,6 titres et 2,1 coupes par carrière ; 9,3 clubs traversés ; 58 montées et 43 descentes.
  - **QUATRE DÉFAUTS TROUVÉS À LA MESURE, dont deux que je n'aurais pas vus à la lecture.**
    1. **Les jambes du groupe étaient collées à zéro** de la vingtième journée à la fin : à 9,6 de
       récupération pour 11 de coût par match, le net hebdomadaire était négatif **quelle que soit**
       la semaine choisie — il n'y avait donc plus rien à dépenser, et la décision ne coûtait plus
       rien. À 10,5, une semaine de repos sur trois tient la fraîcheur à plat ; tout le reste la
       creuse. Mesuré après : 10ᵉ centile 0, médiane 38, 90ᵉ 86 selon la politique.
    2. **Le président saturait à 100** (médiane 97,9 en fin de saison) et ne renvoyait donc
       **personne** : 0,15 fois par carrière de vingt-trois saisons. Un mode entraîneur·euse sans
       porte n'a pas de tension. Trois corrections : une victoire rapporte moins qu'une défaite ne
       coûte, le seuil de renvoi passe à 28, et surtout **sa confiance s'oublie — mais seulement vers
       le bas** (`si > 48`), parce qu'un rappel symétrique pardonnait tout seul une mauvaise série.
       C'est l'asymétrie validée le 22/09 : seuls les gains s'usent.
    3. **« Toujours l'athlétique » était dominée partout** (29,2 points et 15,8ᵉ place contre 37,7 et
       12,8, pour une trace de 0,7), et la cause était mécanique : `bougerForme()` est borné à ±5,
       donc la forme de tout le groupe **saturait au bout de cinq semaines** et les vingt-neuf
       suivantes étaient du coût pur. Ce qu'elle construit maintenant, c'est **la condition du
       groupe** — exactement la formulation qu'il avait donnée pour le physique du joueur·euse le
       30/09 (« il ne faut pas que ça augmente la fraîcheur, il faut que ça augmente la vitesse de
       récupération ») : on récupère plus vite entre deux journées, on se blesse moins, et ça s'en va
       si on ne l'entretient pas.
    4. **Deux options annonçaient un effet qui n'existait pas** : « les laisser venir et frapper dans
       le dos » écrivait `S.grp.ouvert` que rien ne lisait (il entre maintenant dans l'espérance de
       buts encaissés), et « le bureau » ne coûtait presque rien — 78 % de jambes **et** la deuxième
       trace du banc d'essai. Son coût sur les lignes passe de 1,6 à 2,6 : mesuré après, il garde sa
       trace (15,0) et finit **16ᵉ avec un président à 13**. C'est un arbitrage, pas un cadeau.
  - **LE BANC D'ESSAI DE L'ENTRAÎNEUR·EUSE** (neuf politiques, 60 saisons par ligne, erreurs-types) :
    **les trois ors vont à trois lignes différentes** — les points à « vidéo, athlé, repos »
    (34,9±1,5), la place à « vidéo, vestiaire, repos » (14,0±0,4), la trace à « toujours la vidéo »
    (+17,6±1,2). Les trois premiers sur les points sont dans une erreur-type les uns des autres :
    c'est une égalité, pas une victoire, et c'est exactement ce qu'on veut. « Toujours du repos »
    tient 99 % de fraîcheur, finit 14,4ᵉ et ne laisse **rien** (+1,3) — le même visage que « lever le
    pied » côté joueur·euse.
  - **Vérifié côté joueur·euse, parce que c'est là qu'était le risque** : les sept invariants du
    tableau des notes à zéro écart, 31 faits sur 31, **score = film 0 écart** sur 7 764 faits ;
    24 carrières entières de 18 à 38 ans avec tous les écrans, zéro erreur ; le banc d'essai du
    joueur·euse inchangé aux trois croisements (académie·M matchs « deux séances » 22,7 / trace
    « ton poste » +7,3 ; quartier·D 21,6 / physique +10,4 ; étranger·A « le mental » 21,1 /
    technique +9,6) ; `tests/simulate.js` → `ERRORS: none`.
  - **Vérifié côté entraîneur·euse** : les neuf écrans rendus sans un `undefined` (y compris le
    journal depuis chacun, le renvoi forcé et la fin de parcours) ; une partie sauvegardée à la 17ᵉ
    journée se recharge avec ses vingt-deux joueurs, **sans inventer de « moi » dans l'effectif du
    club**, et rejoue deux saisons entières. **Aucune migration** : `S.mode` existe depuis toujours
    dans la sauvegarde, et une vraie partie de joueur·euse de la version déployée (v15, 17ᵉ journée)
    finit sa saison, passe la trêve et rejoue une saison entière. Un défaut fermé au passage :
    `demarrer()` appliquait le chemin joueur·euse à toute sauvegarde — `syncClubSq()` inventait un
    joueur et `niveau()` rendait NaN.
  - **Ce qui n'est pas là, et ce sera le lot suivant** : **le mercato côté entraîneur·euse**. Le
    marché tourne et tu en lis le résultat sur un écran, mais tu ne choisis pas tes recrues — or
    c'est sa partie préférée du mode (21/09/2026). Manquent aussi l'écran de vie et l'argent du
    coach (la jauge `proches` existe et un arrêt la touche, il n'y a pas d'écran), et le banc
    d'essai de l'entraîneur·euse n'est pas encore une page de `labo.html` : il vit dans une sonde.
- **LES MINUTES NE PEUVENT PLUS SE CONTREDIRE** (le propriétaire, 01/10/2026, capture à l'appui :
  un fait de match annoncé à la **25ᵉ minute** dont le texte disait « il entre à la 72ᵉ pour son
  premier match »). Mesuré avant de toucher à quoi que ce soit, 1 985 faits joués : **578
  incohérences**, dans six familles distinctes. Il n'y avait pas un défaut mais une règle qui
  manquait — **un fait qui affirme un événement du match doit s'accrocher à l'événement réel**,
  exactement comme les issues le font depuis le 29/09 (`ecrireFait()`).
  | ce qui se contredisait | combien | ce qui le ferme |
  |---|---|---|
  | « il entre à la 72ᵉ » écrit en dur, fait tiré entre la 10ᵉ et la 88ᵉ | 169 | `ancre` : le jeune est un **entrant réel du film** (≤24 ans), avec son nom et sa minute |
  | « rouge pour un des tiens » sans expulsion au film | 162 | `ancre` sur une **vraie expulsion**, et le fait porte son nom |
  | « il reste vingt-cinq minutes » quelle que soit la minute | 151 | le temps restant est calculé (`90 - min`) |
  | fait du mercredi hors de ton temps de jeu (`ri(20, 85)` en aveugle) | 58 | `momentSemaine()` tire dans ta fenêtre réelle |
  | fait du samedi joué **après** ta sortie (la cuisse, un rouge) | 24 | `suiteMatch()` retire les faits hors fenêtre |
  | « tu sors à l'heure de jeu » / « tu joues les quatre-vingt-dix » démentis par le compteur | 13 | l'issue porte `mins` et **écrit** tes minutes, donc la note et la fraîcheur suivent |
  Deux phrases réécrites par ailleurs : « tu ne le vois plus de la mi-temps » (faux à la 80ᵉ) et
  « perdre le fil — vingt minutes à côté de la partie », qui devient « la fin du match » quand il
  reste moins de vingt minutes (journal **et** film).
  **Deux pièges trouvés à la mesure, et c'est elle qui les a trouvés, pas la lecture** :
  1. **L'âge d'un joueur n'est pas sur l'enveloppe.** Les listes du onze et du banc sont des
     enveloppes (`{nom, poste, niv, ref}`) ; à lire `c.entrant.age` au lieu de `c.entrant.ref.age`,
     le fait du jeune **ne sortait plus jamais** — 173 tirages devenus zéro.
  2. **Un rouge dans ton camp arrive 4,5 % des matchs.** Une fois `adix` ancré, il lui fallait
     l'événement **et** le tirage : 3 sorties sur 1 878 faits, autant dire une famille morte.
     Quand l'expulsion a vraiment eu lieu, le fait qui en parle **passe devant le tirage**
     (`prio`) : il revient à 15 pour 2 092. Et une ancre qui ne trouve pas son événement
     retire une fois dans le sac, sinon les deux familles ancrées mangeaient 10 % des faits.
  **Mesuré après, 2 092 faits joués : zéro incohérence** sur les six contrôles, et **29 familles
  sur 29** toujours tirées. `jeune` passe de 173 à 88 pour mille faits — il demande maintenant un
  jeune qui entre vraiment, ce qui est le prix de la vérité.
  **Vérifié** : les sept invariants du tableau des notes à zéro écart, **31 faits sur 31**,
  **score = film 0 écart** sur 5 045 faits, zéro doublon de nom ; 24 carrières entières de 18 à
  38 ans avec tous les écrans, zéro erreur ; le banc d'essai à 150 saisons par ligne tient
  l'invariant aux trois croisements et « toujours lever le pied » n'est le meilleur nulle part ;
  `tests/simulate.js` → `ERRORS: none` ; **aucune migration** — les textes sont résolus au tirage
  et non stockés comme fonctions, donc une sauvegarde prise en plein match se recharge telle
  quelle.
- **SIGNALER UN PROBLÈME, DEPUIS LE JEU** (le propriétaire, 01/10/2026 : « ça serait bien un bouton
  pour signaler les problèmes comme ça ça t'envoie le screen avec le prompt de correction »). Un ⚠
  dans le bandeau, donc **sur les dix-sept écrans des deux modes**, ouvre une fenêtre où il écrit une
  phrase ; le reste du message se fabrique tout seul.
  - **Ce qui part** : sa phrase, l'écran et la date, la saison et le club, **le détail de l'écran en
    cours** (le fait de match avec son identifiant, sa minute, son texte et ses options ; l'arrêt ;
    le match avec le film, les changements et les notes ; l'offre ; le bilan), **son état** (axes,
    plafonds, liens, lignes, fraîcheur, blessure), **le texte réellement affiché** et les **dix
    dernières lignes du journal**. Un bouton à part copie la sauvegarde, pour rejouer la scène.
  - **Le jeu est statique : il n'y a personne à qui envoyer.** Le bouton passe donc le message à son
    téléphone (`navigator.share`), sinon au presse-papiers, sinon il l'affiche sélectionné — trois
    chemins, parce que le presse-papiers est refusé dans la moitié des contextes mobiles.
  - **Pas de capture d'image, et c'est un choix.** La prendre demanderait une bibliothèque extérieure
    (`html2canvas`) à un jeu qui n'a aucune dépendance et marche hors ligne. Le rapport emporte le
    **texte** de l'écran, qui est ce qui sert vraiment : c'est avec ça qu'on a trouvé les 578
    incohérences de minutes. Il peut toujours joindre sa propre capture à côté.
  - **Les chiffres sont permis dans le rapport** : ce n'est pas le jeu, c'est l'outil qui sert à le
    réparer — la même exception que `labo.html`.
  - **Rien n'est sauvegardé** : `RAP` vit le temps de la fenêtre, et la fenêtre se pose sur le corps
    de la page, donc l'écran qui pose problème reste intact derrière. Le texte est capturé **avant**
    l'ouverture, sinon on rapporterait l'écran du rapport.
  - **La sauvegarde part avec le message** (le propriétaire, 01/10/2026 : « c'est pas pratique de
    devoir copier le texte, vaut mieux intégrer le message dans le copier »). Le bouton ne copiait
    que le JSON, donc il fallait coller la sauvegarde **puis** écrire le problème à côté — c'est
    ce qui s'est passé deux fois. Il copie maintenant **le rapport entier, la phrase en tête**, puis
    la sauvegarde à la suite. Vérifié : 3 Ko de rapport + 57 Ko de sauvegarde, le JSON reste
    relisible tel quel.
  - **Vérifié** : le rapport ouvert et refermé sur les **dix-sept écrans** des deux modes au fil de
    deux saisons, **zéro `undefined`, zéro `[object Object]`, zéro fenêtre qui reste** ; quatre champs
    remis d'aplomb à la mesure (l'adversaire est un objet en championnat et une chaîne le mercredi,
    un fait d'entraîneur·euse porte `titre`/`texte` là où un fait de joueur·euse porte `q`/`opts.p`,
    `m.mvt` est une liste d'objets, une offre porte `ans` et non `duree`) ; l'écran capturé est coupé
    à 1 400 caractères et le dit. Le reste du moteur n'est pas touché.
- **UN PENALTY DOIT FINIR QUELQUE PART** (le propriétaire, 01/10/2026, sauvegarde à l'appui :
  « le penalty n'est pas dans les stats »). Le film montrait « Penalty pour Stade Rennais » à la
  81ᵉ et c'était tout : l'événement était tiré à **14 % des matchs** et ne produisait **rien**
  — ni but au score, ni arrêt, ni raté, et personne ne le tirait. C'est la même règle que les
  minutes du matin même, prise par l'autre bout : **un événement qui affirme quelque chose doit
  se résoudre**.
  - Il s'accroche désormais à un **but réel** de ce camp-là — le film dit « sur penalty » et la
    note le compte déjà — ou il est **manqué**, et il porte alors un nom, une pastille ❌ et
    **1,1 de note en moins** pour celui qui l'a raté. Il se résout **après** que les buteurs sont
    nommés, sinon il n'y a personne à qui l'accrocher.
  - **Il n'est jamais le tien** : ton penalty à toi est une décision (`penA`, `pen`), pas un
    tirage, et un penalty raté tombé du ciel te coûterait sans que tu aies choisi.
  - **Un penalty n'a pas de passeur** : on ne l'accroche qu'à un but qui n'en a pas, sinon le film
    disait « But de X, servi par Y, sur penalty ».
  - **Mesuré, 3 060 matchs** : **0 penalty sans suite** (contre 14 % des matchs avant), 240
    transformés, 194 manqués, **0 penalty avec un passeur**, **score = film 0 écart**.
- **LES MOTS DU PENALTY** (même retour : « la phrase "tu l'envoies à l'opposé" n'est pas claire,
  mets "tu l'envoies au fond du cadre" ou "à côté" »). « À l'opposé » décrit un côté, pas une
  issue : on ne savait pas si c'était dedans. Les quatre issues de `penA` le disent maintenant,
  avec ses mots — **au fond du cadre** / **à côté**, pour toi comme pour le tireur habituel.
  **Vérifié** : les quatre relues à l'écran ; les sept invariants du tableau des notes à zéro
  écart, 31 faits sur 31, score = film 0 écart, zéro doublon de nom ; les minutes à zéro
  incohérence ; 24 carrières entières sans erreur ; `tests/simulate.js` → `ERRORS: none` ;
  **aucune migration** (une sauvegarde prise en plein match garde son événement `penalty`, que le
  film sait toujours afficher).
- **PERSONNE N'APPELAIT PLUS, PARCE QUE J'AVAIS DÉPASSÉ TOUT LE MONDE** (le propriétaire,
  01/10/2026, sauvegarde à l'appui : « ça fait deux saisons que j'ai aucune proposition de club »).
  La fenêtre des offres avait son plancher ancré sur **lui** et non sur le monde
  (`force > cote - 14`) : sa cote valait **99,2** quand le meilleur club du jeu vaut **73**, donc le
  filtre exigeait un club au-dessus de 85 et **aucun des trente-cinq** ne passait. Le garde-fou
  écrit pour qu'un grand club n'appelle pas tous les étés fermait la porte entièrement dès qu'on
  sortait de l'échelle du monde — l'inverse exact de ce que son propre commentaire annonçait.
  - **Mesuré avant de toucher à quoi que ce soit**, 20 carrières entières : ses deux saisons étaient
    le cas doux. De **23 à 32 ans** — tout le sommet d'une carrière — **53 à 68 % des intersaisons
    ne produisaient aucune offre**, et les suites sans rien allaient jusqu'à **douze saisons
    d'affilée**. Au-dessus de 80 de cote : **96 % d'intersaisons à zéro offre**.
  - **La référence est désormais le sommet du monde quand on est au-dessus de lui**
    (`ref = min(cote, sommet)`), donc le plancher suit le championnat et non le joueur. Mesuré
    après : **plus aucune suite au-delà de deux saisons** (une seule fois), et 0 à 10 % de zéro au
    sommet. Sur sa propre sauvegarde : 0 candidat sur 35 → **6 candidats, 2 à 4 offres** par été.
  - **Et la fenêtre a maintenant deux bords**, sans quoi un joueur qui domine son championnat
    recevait les dix-huit clubs **à poids égal** (le terme existant ne pénalise que les clubs
    au-dessus de la cote, et il devient inerte quand plus personne n'est au-dessus) : un club loin
    en dessous n'appelle pas non plus — il n'a pas les moyens, et tu n'irais pas. Mesuré sur un
    joueur qui signe toujours la meilleure offre : il atterrit dans le meilleur club du monde
    **19 % du temps**, 6,3 points en dessous de lui en moyenne.
  - **CE QUE LE DÉFAUT FABRIQUAIT, ET C'EST LE PLUS IMPORTANT** : ne plus recevoir d'offre, c'est
    `resterAuClub()` à vie dans le meilleur club qu'on ait atteint, pendant que le club se
    reconstruit autour de soi. Mesuré, 40 carrières de vingt saisons, avant / après :
    | | déployé | après |
    |---|---|---|
    | titres par carrière | 6,30 (méd. 7, max 14) | **3,27** (méd. 3, max 11) |
    | titres par saison | 0,316 | **0,164** |
    | clubs traversés | 4,7 | **7,3** |
    C'est exactement la bande pour laquelle la pondération des offres avait été calibrée le
    27/09 (**3,3 titres et 6,6 clubs**) : les 6,30 titres de la version en ligne étaient une dérive
    du bug, pas un réglage.
  - **Une sonde qui se trompait, corrigée au passage.** `v2coher.js` comptait 95 à 136
    « incohérences de minutes » — elle attendait `90 − minute d'entrée` pour un entrant et la minute
    de sortie pour un sortant, alors qu'**un joueur peut entrer puis ressortir** (son temps de jeu
    est sortie − entrée). La version déployée en affichait 136 avec la même sonde : c'était elle, pas
    le moteur. Elle lit maintenant l'entrée et la sortie de chaque nom : **0 écart des deux côtés**.
  - **Ce qui reste à décider, et c'est à lui** : avec trois titres au lieu de six, l'ambition
    « tout gagner » n'est plus satisfaite que **23 % des saisons** (contre 37 % sur la version
    déployée, et 53 % le jour où les trois états ont été posés). Sa règle était « une ambition qui
    punit neuf fois sur dix n'est plus une ambition » — 23 % n'y est pas, mais c'est l'ambition dure
    du jeu. Si elle doit redevenir atteignable, le levier est dans son barème, pas dans les offres.
  - **Vérifié** : les sept invariants du tableau des notes à zéro écart (dont la sonde corrigée),
    **31 faits sur 31**, score = film **0 écart** sur 5 567 faits, zéro doublon de nom, les
    incohérences de minutes à zéro ; 24 carrières entières de 18 à 38 ans avec tous les écrans,
    zéro erreur ; `tests/simulate.js` → `ERRORS: none` ; **aucune migration** (`VERSION` ne change
    pas, le calcul se refait à chaque été) — vérifié en reprenant une vraie partie de la version
    déployée à la 17ᵉ journée : saison finie, trêve passée, signature, **deuxième saison entière**
    jouée. Le banc d'essai de la semaine **ne peut pas être touché** : `uneSaison()` s'arrête au
    bilan, donc `genererOffres()` n'y est jamais appelé.
- **LE PLAFOND ÉTAIT DÉCORATIF, ET LES TIENS NE DEMANDAIENT RIEN** (le propriétaire,
  01/10/2026, après les trois propositions : « vas-y dans cet ordre »). Trois questions
  ouvertes, traitées dans l'ordre que j'avais proposé — et **deux des trois diagnostics
  que je lui avais donnés étaient faux**. La mesure les a corrigés avant le code.
  - **1. LE PLAFOND, ET CE N'ÉTAIT PAS UNE ACCUMULATION.** `bougerAxe()` promettait
    « une hausse libre **jusqu'au plafond** » et **ne lisait jamais le plafond** :
    mesuré, 12 carrières entières, **75 % des lectures au-dessus, +5 en moyenne,
    jusqu'à +22,9**. Deux causes séparées, la seconde étant la vraie :
    - le plancher de la marge d'une séance (`.12`) : collé au plafond, une séance rend
      encore deux points de trace par saison, et ça s'accumule vingt ans ;
    - **le potentiel pouvait être tiré sous le point de départ.** `ri(56, 80)` pendant
      que la base de départ monte à 75 (50, plus dix d'origine, plus quinze de qualité
      tirée) : **un axe sur quatre naissait au-dessus de son propre plafond**, jusqu'à
      dix-neuf points. C'est ça, et non la fuite hebdomadaire, qui rendait le plafond
      décoratif.
    Corrigé par deux lignes : `bougerAxe()` borne la hausse à
    `max(base, plafondReel(a), pic[a])`, et le tirage du potentiel garde `MARGE_POT`=6
    au-dessus du départ. **Les trois termes de la borne sont nécessaires** : `base` pour
    ne jamais raboter une carrière déjà au-dessus (elle cesse de monter, elle ne perd
    rien), `plafondReel` pour la vraie limite, et **`pic`** sans quoi la séance mentale
    ne pourrait plus rendre la tête qu'on avait quand `plafondReel` a baissé derrière
    soi — c'est-à-dire la spirale refermée le 27/09, qu'on rouvrirait sans le voir.
    **Mesuré après** : **0 hausse au-dessus de la borne sur 25 882**, **0 axe né
    au-dessus de son plafond**. Le sommet d'une carrière passe de 73,5 à 72,3 et les
    titres de 3,23 à 3,08 (dans le bruit de la sonde) : **`POT_MAX` n'a pas besoin de
    bouger**, ce qui répond à la question que je lui avais laissée.
    **Un résidu que je ne maquille pas** : 71 axes sur 80 finissent la carrière
    au-dessus d'un plafond **usé par l'âge** (jusqu'à +20, au plancher de 40). C'est le
    potentiel qui s'érode plus vite que la base ne le suit (×.55 par saison) — par
    construction, et borné.
  - **2. LE BUT : MESURÉ, ESSAYÉ, PUIS REMIS EN PLACE.** Je lui avais signalé deux
    écarts. Les deux existent, **aucun des deux n'est un défaut** :
    - *ton but paie 0,70, celui d'un coéquipier 1,50.* Essayé une table commune. Mesuré,
      28 carrières : un doublé te mettait à **9,09**, un triplé à **9,60**, les notes à
      9,5 et plus passaient de **3,2 % à 8,6 %** et les matchs au-dessus de 7,5 de
      **32,6 % à 42,5 %** — le 10 cessait d'être rare (27/09) et les grands soirs
      redevenaient ordinaires (29/09). Resserrer la suite de la table ne suffisait pas
      (encore 8,0 %). La raison est structurelle : **les deux notes ne portent pas la
      même chose** — la tienne additionne tes faits de match, ta forme, ta tête, tes
      cartons et la difficulté du duel, celle d'un coéquipier ne porte que le film. Un
      but y pèse plus parce qu'il y est presque seul. **Deux tables, et c'est juste.**
    - *réussir un fait paie +0,70 quand le rater coûte −1,71*, soit 2,4×. **Faux** :
      c'est la lecture de la formule, pas de la note. Mesuré par la note réelle sur
      l'arbre déployé, un fait **réussi paie +0,95** et un fait **raté coûte −1,40** —
      **1,5× et non 2,4×**, parce qu'un fait réussi gagne aussi le match et que le
      résultat se paie à part. Rien à corriger.
    Vérifié que le retour en arrière est complet : contre la version en ligne, la
    distribution est **identique** (moyenne 6,90 → 6,90 · sous 5,0 10,3 → 10,7 % ·
    au-dessus de 7,5 34,9 → 34,8 % · 9,5 et plus 3,5 → 4,0 %).
  - **3. LES TIENS SATURAIENT, COMME LES SUPPORTERS AVANT LE 29/09.** Son ambition
    « rester près des miens » ne lui reprochait jamais rien : mesuré, **satisfaite 100 %
    sur 140 saisons**. J'ai d'abord corrigé son barème (il lit maintenant **ce que la
    saison leur a fait** et non le niveau, avec le niveau comme plancher) — et ça n'a
    rien changé : **100 % → 98 %**. La cause était en dessous. Mesuré : `S.vie.proches`
    a une **médiane de 100**, et **64 % des semaines sont à 100 même en ne faisant
    jamais rien pour eux** — l'usure annuelle de 2,2 ne pèse rien face aux +16 d'un été
    et aux +22 d'une maison. Donc ni l'ambition ne pouvait rien lire, **ni la
    récupération mentale qu'ils pilotent** (+0,12 contre +0,3) ne variait jamais : une
    mécanique qui ne varie pas n'existe pas. Même correctif que pour le stade : **un
    rappel** (2,2 % par journée vers 46), le plancher du premier gros salaire tenant
    toujours en dessous. « Le football les éloigne tout seul » était écrit depuis le
    27/09 ; maintenant c'est vrai.
    **Mesuré après** : quand on s'en occupe, 5ᵉ 69 · **médiane 86** · 95ᵉ 97 ; quand on
    les néglige, 5ᵉ 57 · **médiane 68** · 95ᵉ 80 ; **0 % des semaines à 100** dans les
    deux cas. Et l'ambition devient un arbitrage : **54 % réussi · 46 % « tu as dérivé »
    · 0 % raté**, contre 99/1/0 en ligne.
  - **Et deux chiffres que la mesure a rendus à leur place** : « tout gagner » ne punit
    pas 77 % des saisons comme je l'avais écrit (ce chiffre fondait le presque-compte
    avec l'échec) mais **39 %**, inchangé par ce lot — sa règle (« une ambition qui punit
    neuf fois sur dix ») n'est pas franchie. Et « construire autre chose » n'est pas à
    90 % de raté : c'était une sonde dont le joueur **ne construisait jamais**. Avec un
    joueur qui bâtit : **14 % réussi · 75 % presque · 11 % raté**.
  - **Vérifié** : les sept invariants du tableau des notes à zéro écart, **31 faits sur
    31**, score = film **0 écart**, zéro doublon de nom, les incohérences de minutes à
    zéro ; 24 carrières entières de 18 à 38 ans avec tous les écrans, zéro erreur ;
    `tests/simulate.js` → `ERRORS: none` ; le banc d'essai à **250 saisons par ligne**
    tient l'invariant aux trois croisements (académie·M matchs technique 22,1±0,46 /
    trace poste +7,0 ; quartier·D matchs 21,6 à égalité / trace physique +10,1 ;
    étranger·A matchs physique 19,7 et poste 19,6 à une erreur-type / trace technique
    +9,2) et **« toujours lever le pied » ne prend les matchs nulle part** ; **aucune
    migration** — `MARGE_POT` ne s'applique qu'à la création, la borne de `bougerAxe()`
    ne rabote pas une base acquise, et `prochesAvant` se pose au premier bilan. Vérifié
    en reprenant une vraie partie de la version déployée à la 17ᵉ journée : saison
    finie, trêve passée, **deuxième saison entière** jouée.
- **LE MERCATO DU COACH, SA VIE, ET SON BANC D'ESSAI** (le propriétaire, 01/10/2026 : « Fait les
  3 »). Les trois dernières pièces manquantes du 2.0, dans l'ordre où je les lui avais proposées.
  Chacune a commencé par révéler un défaut plus ancien qu'elle, et c'est la mesure qui les a
  trouvés — aucun ne se voit à la lecture.
  - **1. LE MERCATO (sa partie préférée du mode, 21/09/2026).** Un dossier à la fois, comme en 1.0,
    et il a fallu commencer par fusionner deux effectifs : `S.ligue.equipes` donnait à **ton** club
    vingt-deux joueurs fantômes dont la force découlait, pendant que tes vrais joueurs étaient tirés
    de cette force — deux populations pour un vestiaire, dont une que tu ne verrais jamais. Et on ne
    transfère que des gens qui existent. `cOuvrirMercato()` (l'été **et** l'hiver, à la 17ᵉ journée
    quand l'époque a un mercato d'hiver), `cCibles()` (la pile, triée du faisable au hors de
    portée), `cRecruter()`, `cVendre()`, et surtout **`cManque()` + `cVentesQuiSuffisent()`** : ce
    qui bloque est écrit au centime, avec la vente qui le débloquerait — c'était son reproche de la
    1.0 (« les 10 000 € manquants qu'on ne voyait pas »).
    - **Le plafond salarial était sur la mauvaise base.** `salaireDe()` est **convexe en niveau**,
      donc la somme de vingt-deux vrais salaires dépasse vingt-deux fois le salaire du niveau moyen :
      mesuré, **12 clubs sur 60 étaient déjà au-dessus du plafond avant la moindre action**, et une
      fenêtre fermait à 159 %. `cPoserPlafond()` le fige par saison à
      `max(plafond du club, masse héritée × 1,12)` — ce qui évite aussi le défaut inverse noté en 1.0,
      où le plafond suivait tes propres dépenses. Mesuré après : **0 club sur 60** au-dessus à
      l'ouverture, 115 % au pire à la fermeture.
    - **Une mécanique morte dans la pile** : mesuré `{"club": 560}` — les dossiers de l'étranger et
      du centre de formation n'arrivaient **jamais** sur la table, donc la seule porte vers l'ambition
      « faire éclore » était fermée. Le tri lit maintenant `x.merite` (le potentiel compte pour
      moitié à 21 ans et moins) et des places sont réservées : `{"club":360,"centre":80,"etranger":120}`.
    - **Un `[object Object]` à l'écran, et personne pour le recevoir** : l'arrêt `capitaine` rendait
      l'**objet** joueur là où les cinq autres familles rendent un nom — donc le texte imprimait
      l'objet **et** `cAppliquer`'s `find(j => j.nom === sujet)` ne trouvait personne, si bien que
      l'effet ne s'appliquait à personne. Défaut antérieur, trouvé en rendant tous les écrans sur
      71 fenêtres de mercato.
    - **Mesuré, 86 fenêtres sur 12 carrières** (dont 27 d'hiver) : 12,4 dossiers par fenêtre,
      274 recrues et 333 départs, le marché automatique te prend 0,9 joueur par fenêtre, masse à la
      fermeture **85 % de médiane**, effectif à 22, et **333 des 342 dossiers bloqués** avaient une
      vente qui suffisait.
  - **2. LA VIE ET L'ARGENT DU COACH.** Même trou que côté joueur·euse avant le 27/09 : mesuré,
    `S.argent` avait une **médiane de zéro et un maximum de zéro** — il avait un salaire que
    personne ne lui versait. `cEncaisserLaSaison()` crédite le compte, `cPrimes()` nomme ce que
    l'année a rapporté (le titre, la coupe, l'Europe, la montée, **l'objectif tenu** — la prime d'un
    entraîneur, qui n'a pas de matchs joués à faire valoir), et `ecranCVie()` est le dernier temps
    de l'intersaison : bilan → l'été → les offres → le mercato → **toi**.
    - **Trois façons de passer l'année** (mettre de côté, faire vivre les tiens, payer ton staff de
      ta poche) et **quatre chantiers**, dans les mots d'un entraîneur : la maison des tiens,
      **écrire ta méthode**, **un centre à ton nom**, monter une affaire. Chacun coûte un multiple de
      ton **meilleur** salaire, et chacun laisse une trace que le bilan de carrière relit.
    - **UN ENTRAÎNEUR GAGNAIT 2 À 25 k€ PAR AN.** `cSalaire()` passait la **force d'un club** à
      `salaireDe()`, qui est la courbe d'un **joueur** — convexe, parce qu'un très bon joueur vaut dix
      fois un bon. Un club de D2 vaut 45, c'est-à-dire le pied de la courbe, c'est-à-dire rien :
      mesuré sur une carrière entière, **93 k€ sur le compte après vingt-cinq saisons**, et donc aucun
      chantier possible. `cSalaireDe()` est une courbe à soi (0,22 M€ en D2, 0,6 pour un milieu de
      Ligue 1, 2,7 pour un grand de France), avec le palmarès jusqu'à +80 %. Mesuré après : salaire
      maximal **630 k€ à 1,6 M€**, compte à 3-22 M€, et **2,75 chantiers par carrière** quand on
      bâtit contre 0 quand on garde tout.
    - **LA COTE NE VOYAIT PAS LE COACH.** Mesuré, 240 saisons : ses axes montent de 59 à 70 (leur
      plafond) entre la première saison et la dix-septième et sa cote **ne bougeait que de 49 à 54** —
      onze points de métier achetaient un point de cote, par le seul `reseau` à .08. Donc la force du
      club stagnait à 48 dans un monde dont le meilleur vaut 62-67, **53 % des saisons se jouaient en
      D2**, et « gagner » était hors de portée. C'est la boucle fermée de ce matin prise par l'autre
      bout : il fallait un grand club pour bien paraître, et bien paraître pour avoir un grand club.
      `cNiveauCoach()` (les trois axes hors réseau, qui garde son terme propre) entre dans `cCote()` à
      `.35`. Mesuré après : cote **47 → 63** sur la carrière, club max 65, **43 % de D2**.
    - **LES TIENS SATURAIENT AUX DEUX BOUTS, et mon commentaire disait le contraire.** J'avais écrit
      dans le code que la jauge du coach n'avait pas besoin d'un rappel (médiane 64 mesurée). C'était
      vrai **avant** que l'écran de vie existe : mesuré après, elle devient **bimodale** — 100 de
      médiane quand on s'occupe des siens (la maison vaut +22) et **5** quand on ne le fait jamais.
      Le même rappel que le joueur·euse (2,2 % par journée vers 46) ferme **les deux bouts d'un
      coup**. Mesuré : médiane **64 / 45 / 64** selon la politique, et 0 % de semaines à 100.
    - **UNE PROMESSE D'ÉCRAN SANS CONSÉQUENCE** : la pastille de « écrire ta méthode » annonçait « tu
      as la tête ailleurs cette saison » et `S.lectureDure` n'était **lu nulle part**. La saison où tu
      écris, tes séances rendent 35 % de moins, et le compte rendu le dit.
    - **L'ÉCRAN DE VIE S'OUVRAIT AVANT LA PREMIÈRE SAISON** : `anVie` partait à zéro, donc le mercato
      d'ouverture y renvoyait avant d'avoir entraîné — il n'y a pas d'intersaison avant d'avoir
      entraîné. Trouvé par le banc d'essai, qui cassait au deuxième écran.
    - **FAIRE ÉCLORE N'EST PAS AVOIR UN EFFECTIF JEUNE.** Les trois ambitions du coach n'avaient
      **jamais été mesurées**. Sur 454 saisons : « bâtir une maison » 50/39/11 (bien calibrée),
      « gagner » 10/10/**80**, et « faire éclore » **satisfaite 100 % du temps** — son test était
      « trois joueurs de moins de 23 ans à dix matchs », et un effectif de vingt-deux en compte
      **neuf** de médiane. Elle mesurait la pyramide des âges du club, qu'on ne choisit pas. Un jeune
      qui éclôt est un jeune que tu as **titularisé** et qui a **répondu** : 22 ans ou moins, la
      moitié de la saison, une moyenne au-dessus de 6,6. Mesuré après, sur 149 saisons de carrières
      entières : **24 % réussi · 32 % presque · 44 % raté** — un arbitrage, enfin.
    - **Et le rapport de bug ne savait décrire ni le mercato ni la vie**, dans aucun des deux modes,
      alors que c'est là qu'un chiffre d'argent peut mentir et que le rapport est l'outil avec lequel
      il me le dit. `rapportDetail()` a maintenant les deux branches : le dossier sur la table, le
      budget, la masse contre le plafond, ce qui bloque au centime ; et le compte, le salaire, les
      chantiers construits, ceux qui sont à portée et le catalogue avec ses prix.
  - **3. LE BANC D'ESSAI DU COACH, DANS `labo.html`.** Il vivait dans une sonde, donc le propriétaire
    ne pouvait pas le lancer lui-même alors qu'il lance celui du joueur·euse. Neuf politiques de
    semaine, et **chaque colonne qui décide porte son erreur-type** — y compris, désormais, celles
    des deux bancs du joueur·euse : c'est la leçon de méthode du 29/09, qui ne vivait que dans les
    sondes.
    - **Deux fausses lectures fermées, les deux vues à l'écran avant de livrer.** (a) Le banc cassait
      au premier écran (le mercato que le lot 1 ouvre en août) et annonçait les neuf politiques
      « remercié 100 % ». (b) Une politique qui fait virer à chaque saison affichait une place moyenne
      de **0** et **prenait l'or** : une case sans mesure vaut maintenant `null`, ne se peint pas et
      s'écrit « — ».
    - **Et l'invariant du coach n'était pas celui que j'avais écrit** : la **place** suit les points,
      c'est le même signal vu par le président. Ce qui doit se séparer, c'est **le résultat et la
      trace**. Mesuré à 20 saisons par ligne : le résultat à « vidéo, vestiaire, repos » (38,1±1,7
      points, 13,0ᵉ±0,8), la trace à « toujours la vidéo » (+16,3±1,7), et « toujours du repos » à
      36,0±2,7 — donc à égalité sur les points, ce que l'erreur-type dit et qu'une moyenne nue
      cachait.
  - **Vérifié** : les sept invariants du tableau des notes à zéro écart, **31 faits sur 31**,
    score = film **0 écart** sur 5 541 faits, zéro doublon de nom, les incohérences de minutes à
    zéro ; 24 carrières entières de joueur·euse avec tous les écrans, zéro erreur ;
    `tests/simulate.js` → `ERRORS: none` ; le banc de la semaine à **150 saisons par ligne** tient
    l'invariant aux trois croisements (académie·M matchs technique 22,0±0,61 / trace poste +6,8 ;
    quartier·D matchs semaine normale 21,8±0,63 / trace physique +10,0 ; étranger·A matchs poste
    19,9±0,65 / trace technique +9,1) et **« toujours lever le pied » ne prend les matchs nulle
    part** ; le rapport ouvert et refermé sur **les dix-neuf écrans** des deux modes, zéro
    `undefined`, zéro fenêtre qui reste ; **aucune migration** (`VERSION` ne bouge pas : `plafondMasse`
    retombe sur son calcul, `anVie` manquant ouvre l'écran de vie au premier été) — vérifié sur une
    vraie partie d'**entraîneur·euse** de la version déployée reprise à la 17ᵉ journée : remercié,
    signature ailleurs, mercato d'été, écran de vie, **deux saisons entières**, 22 joueurs, zéro
    doublon ; et sur une vraie partie de joueur·euse, deux saisons entières.
  - **Ce qui reste à décider, et c'est à lui** : l'ambition « gagner » du coach punit **80 à 87 % des
    saisons** (deux mesures de ~160 saisons), pour 0,33 titre et 0,72 coupe par carrière de 25
    saisons. Sa règle est « une ambition qui punit neuf fois sur dix n'est plus une ambition » : on
    n'y est pas, mais c'est deux fois plus dur que le « tout gagner » du joueur·euse (39 %). Si elle
    doit s'adoucir, le levier est sa bande *presque* (aujourd'hui podium ou montée — une finale de
    coupe n'y compte pas) ou le fait qu'un coach reste dans la moitié basse du tableau (force de club
    médiane 49, 90ᵉ centile 54, maximum 64 dans un monde dont le meilleur vaut 62-67).
- **Ce qui n'est pas encore là** : rien du 2.0. (Les deux modes, les trente et un faits de match, les
  vingt-neuf arrêts, les quatorze familles et dix situations de match du coach, la sélection, les deux
  mercatos, la vie et l'argent des deux côtés, la trêve, les offres, la progression d'une saison sur
  l'autre, l'usure et les trois bancs d'essai sont livrés.)
- **ON PEUT ÊTRE MAUVAIS UN SOIR OÙ L'ÉQUIPE GAGNE** (le propriétaire, 29/09/2026, en répondant
  au tableau par la seule ligne du milieu de carrière : « 3 % »). J'avais écrit que le levier des
  mauvais soirs au sommet était « le monde » et que c'était son arbitrage ; il a tranché en pointant
  le chiffre. **Et mon diagnostic était incomplet.**
  - **Mesuré au sommet d'une carrière** : les notes sous 5,0 venaient presque uniquement des
    **défaites** (18,8 % d'entre elles) — et comme on gagne alors 65 % de ses matchs, une victoire
    n'en donnait que **2,0 %**. Quand l'équipe gagnait, tu ne pouvais pas passer à côté de ton match.
  - **La cause n'était pas le monde, c'était que ton état n'entrait pas dans ta note.** Ta forme se
    promène entre 59 et 100 et ta réserve mentale entre 24 et 76, et les deux ne passaient que par
    `(niveauJour − force) × .035` : **moins d'un dixième de note d'un extrême à l'autre**. Contre la
    règle du projet — un chiffre affiché doit avoir une conséquence visible.
  - **`poidsEtat()`, deux termes personnels** : la forme (un creux se paie le samedi suivant, ±0,75)
    et la tête (« quand ça se tend, tu joues petit » n'était qu'une phrase : l'écart à ton pic coûte
    jusqu'à 0,35, une réserve pleine rend 0,1). Aucun des deux ne récompense le repos — c'était la
    condition, pour ne pas renforcer « lever le pied ».
  - **Première version fausse, et la spirale qu'elle rouvrait.** Centrée sur une valeur fixe (78),
    elle punissait deux fois ceux qui n'y peuvent rien : un débutant a une forme basse **en
    permanence** et une tête chroniquement entamée. Mesuré : il tombait à **5,0 de moyenne et perdait
    cinq matchs par saison** (16,2 contre 21,4), exactement l'impasse que le propriétaire avait déjà
    fait fermer. `S.formeRef` est désormais une moyenne lissée de ta propre forme — comme `S.ligneRef`
    l'est pour ton entente : un jeune régulièrement moyen vaut zéro, et **c'est le creux qui se paie,
    à tout âge**.
  - **Mesuré après, 40 carrières entières** :
    | saisons | 10ᵉ | médiane | 90ᵉ | sous 5,0 | au-dessus de 7,5 | victoires |
    |---|---|---|---|---|---|---|
    | 1 à 3 | 4,4 | 6,5 | 8,2 | 16,9 % | 21,4 % | 41 % |
    | 4 à 8 | 5,1 | 7,0 | 8,6 | 8,8 % | 32,6 % | 57 % |
    | 9 à 14 | 5,2 | 7,0 | 8,6 | **7,5 %** | 33,5 % | 66 % |
    | 15 et + | 4,5 | 6,5 | 8,3 | 15,5 % | 22,8 % | 53 % |
    Sa ligne passe de **3,9 % à 7,5 %**. Sur la carrière entière : **sous 5,0 de 5,2 % ce matin à
    11,0 %**, au-dessus de 7,5 de 33,7 % à 30,1 %, moyenne 6,77 (elle reste au-dessus du pivot de
    6,2 que lit la confiance du coach, ce qui est la contrainte à ne pas franchir).
  - **Le banc d'essai s'améliore au passage** : « lever le pied » ne prend le temps de jeu qu'à **un
    croisement sur trois** (contre deux sur trois dans la version déployée), et l'invariant tient
    partout — aucune ligne ne prend à la fois les matchs et la trace.
  - **Vérifié** : les sept invariants du tableau des notes à zéro écart ; les invariants du monde à
    zéro ; `tests/simulate.js` → `ERRORS: none` ; **aucune migration** (`S.formeRef` se pose tout
    seul au premier passage) — vérifié en reprenant une vraie partie de la version déployée, saison
    finie, trêve passée, saison entière rejouée. Ton rang moyen dans la liste des notes reste au
    **47ᵉ centile** : tu restes meilleur que la moyenne de tes coéquipiers, tu es juste plus exposé.
- **CE QUI FAIT JOUER, ET UNE AFFIRMATION DE MOI QUI ÉTAIT FAUSSE** (le propriétaire, 30/09/2026,
  en réponse à la question ouverte : « lever le pied doit faire augmenter la fraîcheur, mais c'est
  la fraîcheur, la qualité au poste, et peut-être aussi le physique et la technique qui fait
  jouer »).
  - **Je lui avais dit deux fois que « toujours lever le pied » dominait. C'est faux.** Le banc
    d'essai (`v2sem.js`) **codait 40 saisons en dur** et ignorait la variable `NS` : quand j'ai
    écrit « mesuré à 100 saisons par ligne », il en tournait toujours 40. À **250 saisons avec
    l'erreur-type** (±0,5 match), « lever le pied » n'est **le meilleur nulle part** : 20,7 contre
    21,1 pour « deux séances puis un repos » en académie milieu, 21,4 contre 22,9 en quartier
    défenseur, 17,7 contre 19,2 chez l'étranger attaquant. L'invariant que le propriétaire avait
    posé tenait depuis le début ; c'est moi qui lisais du bruit. La sonde honore maintenant `NS`.
  - **Et le choix du coach est déjà ce qu'il décrit.** Décomposé terme par terme sur une saison,
    l'écart moyen entre « lever le pied » et « deux séances puis un repos » :
    | terme | lever le pied | deux séances | l'écart |
    |---|---|---|---|
    | fraîcheur | +0,64 | +0,01 | −0,64 |
    | ton niveau (les quatre axes) | +53,81 | +54,56 | **+0,75** |
    | ta qualité au poste | +0,30 | +0,89 | **+0,59** |
    | confiance du coach | −1,87 | −2,38 | −0,52 |
    | **TOTAL** | **+45,94** | **+46,00** | **+0,06** |
    S'entraîner gagne sur le niveau et le poste exactement ce que le repos gagne sur la fraîcheur.
    La fraîcheur, la qualité au poste, le physique et la technique pèsent déjà tous les quatre —
    les trois derniers par les poids de poste de `niveau()` (le physique vaut .32 chez un
    défenseur, la technique .32 chez un milieu).
  - **LE VRAI TROU ÉTAIT AILLEURS : LE PHYSIQUE N'ÉTAIT JAMAIS REMBOURSÉ.** Le propriétaire l'avait
    demandé le 27/09 (« le physique qui consomme beaucoup de fraîcheur, il faut qu'au cours de
    l'année on regagne de la fraîcheur grâce à lui, sur la vitesse de récupération ») et le code ne
    le tenait pas. Mesuré à 200 saisons par ligne : « toujours le physique » finissait avec **la
    fraîcheur la plus basse de toutes les séances** (34 à 43 % contre 80 à 100 %) et était **la
    politique qui faisait le moins jouer aux trois croisements** (16,3 / 20,1 / 15,7). La séance la
    plus chère (−11) n'avait aucun retour : le fond ne rendait que `.05` par point, soit 3,3 par
    journée à fond 65, contre 3 à 4 de surcoût par semaine.
  - **Le fond rend `.13` le point.** À fond 65 il rend 8,5 par journée. Mesuré après, 250 saisons
    par ligne : le physique remonte à **66 à 80 % de fraîcheur** et gagne deux matchs (18,5 / 21,7 /
    16,9), sans prendre l'or des matchs à personne, et il garde l'or de la trace en quartier
    défenseur (+10,6). **Le réglage est chirurgical** : qui ne travaille jamais le physique a un
    fond de zéro et ne voit aucune différence — les autres lignes du banc ne bougent pas.
  - **L'invariant tient aux trois croisements** : l'or des matchs et l'or de la trace restent sur
    deux lignes différentes. Là où « lever le pied » est nominalement en tête (académie milieu 21,0
    contre 20,7 ; quartier défenseur 22,4 contre 22,1), **l'écart est trois fois plus petit que
    l'erreur-type** : c'est une égalité, pas une victoire.
  - **Vérifié** : les sept invariants du tableau des notes à zéro écart ; les invariants du monde à
    zéro ; `tests/simulate.js` → `ERRORS: none` ; la distribution des notes par tranche de carrière
    est inchangée (deux passages : 14,4 / 7,5 / 6,8 / 15,1 puis 15,1 / 9,1 / 8,3 / 16,7 de notes
    sous 5,0 — ils encadrent les 16,9 / 8,8 / 7,5 / 15,5 de la veille) ; aucune migration, `fond`
    existe déjà dans la sauvegarde.
  - **La leçon de méthode** : une sonde qui ignore son propre paramètre d'échantillon est pire
    qu'une sonde absente — elle donne une fausse confiance. Toute conclusion du banc porte
    désormais son **erreur-type** à côté du chiffre, et une différence plus petite qu'elle ne se
    raconte pas comme un résultat.
- **LE PHYSIQUE EST LA RÉSERVE, IL N'EN A PAS UNE À CÔTÉ** (le propriétaire, 30/09/2026 : « le
  physique, il joue sur deux choses. Il joue sur la capacité à se blesser… Et il faut que ça joue
  sur la fraîcheur. **Il ne faut pas qu'un entraînement de physique augmente la fraîcheur. Il faut
  qu'il augmente la vitesse de récupération de la fraîcheur.** Un physique à 30 sur 100 va provoquer
  des blessures fréquentes… un physique à 80, il se blesse très très peu, en vitesse de récupération
  il doit pouvoir enchaîner les matchs, jouer un match complet et faire un entraînement sans que ça
  tape trop dans ses réserves pour le match du week-end. **Plus il y a de physique, plus il peut
  assumer de charge intensive, à l'entraînement et au match, sans avoir à se reposer.** »)
  - **`S.etats.fond` disparaît.** C'était une cinquième valeur à entretenir, inventée par moi à côté
    de l'axe, qui portait exactement les trois effets qu'il vient de décrire — et qui se vidait de
    son côté (−1,5 par journée) pendant que l'axe, lui, restait. Sa lecture est meilleure : ce qui
    encaisse, c'est **le physique lui-même**, celui que la séance entraîne et que le joueur lit à
    l'écran. Deux fonctions et trois branchements remplacent toute la réserve :
    `chargePhys() = clamp(1 − (phys − 50) × .006, .62, 1.24)` sur **le coût** d'une séance et d'un
    match, et `recupPhys() = clamp(1 + (phys − 50) × .016, .62, 1.5)` sur **la vitesse de
    récupération** hebdomadaire. Le risque de blessure lit `(phys − 50) × .0009`. Les deux sont
    **neutres à 50** : qui ne travaille jamais le physique ne voit aucune différence, exactement
    comme avec l'ancien fond à zéro.
  - **Sa règle est tenue à la lettre** : la séance physique reste **la plus chère du jeu** (−11 de
    fraîcheur, contre −8 / −8 / −7). Elle n'en rend jamais ; elle rend la vitesse à laquelle on la
    récupère et la charge qu'on encaisse sans la perdre. C'est pour ça que `fit` n'est amorti que
    quand il est négatif : un coût est amorti par le physique, un gain (lever le pied, +8) ne l'est
    pas.
  - **Son exemple, mesuré tel qu'il l'a posé.** À physique forcé, en s'entraînant chaque semaine et
    sans jamais lever le pied :
    | physique | une blessure tous les | avec les ischios fragiles | fraîcheur |
    |---|---|---|---|
    | 30 | **9,8 matchs** | **5,9 matchs** | 41 % |
    | 50 | 14,6 matchs | 8,7 matchs | 58 % |
    | 80 | **21,7 matchs** | 14,5 matchs | **76 %** |
    Un physique à 80 enchaîne donc les matchs en travaillant toutes les semaines, ce qui était le
    cœur de sa phrase ; un physique à 30 se blesse deux fois plus souvent et ne tient pas le rythme.
    *Une erreur de mesure au passage* : compté en **nombre** de blessures, le physique bas semblait
    se blesser moins (0,8 contre 1,2) — parce qu'il joue beaucoup moins de matchs, donc tire beaucoup
    moins souvent. Seul le **taux par match** dit quelque chose.
  - **À l'échelle d'une carrière entière**, trois politiques :
    | politique | matchs | matchs complets | une blessure tous les | fraîcheur |
    |---|---|---|---|---|
    | jamais le physique | 434 | 337 | 11,9 | 88 % |
    | **le physique une semaine sur trois** | **452** | **361** | **14,1** | 71 % |
    | toujours le physique | 453 | 315 | 12,3 | **43 %** |
    Aucune ne domine : tout donner au physique coûte plus de fraîcheur qu'il n'en rend et fait perdre
    des matchs complets ; ne jamais y toucher se blesse le plus. **Le compromis est le meilleur**, ce
    qui est le comportement qu'on veut d'un axe.
  - **Trois phrases d'écran remises d'aplomb.** `direFond()` disait « Ton corps suit, et récupère
    entre deux matchs » à côté d'une fraîcheur de **9 %** : elle lisait une réserve et se lisait comme
    un état. Elle décrit maintenant une **capacité**, jamais le moment (« Tu encaisses tout : les
    matchs s'enchaînent et une séance ne te coûte presque rien. ») — la fraîcheur, juste au-dessus,
    dit où on en est aujourd'hui. La pastille de la séance physique dit ce qu'elle fait (« 💪
    récupérer vite, se blesser moins ») et la raison de blessure ne parle plus de fond (« Tu n'as pas
    **le corps** pour encaisser ces rythmes-là »).
  - **Deux morts trouvés en nettoyant** : l'été `soin` posait `fond: 26` (devenu `corps: 16`, qui
    porte déjà les blessures et la récupération) et le choix de mercato « rentrer plus tôt » écrivait
    `S.ete.fond += 8` que plus personne ne lisait (devenu `bougerAxe('phys', 1.2)` — dix jours de
    charge, et le corps s'en souvient). `v2/labo.html` affichait encore une colonne `fond` qui serait
    devenue `undefined` : elle montre le physique.
  - **L'invariant de la semaine tient**, banc à **250 saisons par ligne** : aux trois croisements,
    les matchs, les titularisations et la trace vont à **trois lignes différentes** (académie milieu :
    matchs « le mental » 21,8, titularisations « deux séances » 8,9, trace « ton poste » +8,1 ;
    quartier défenseur : 21,5 / 11,9 / +10,8 physique ; étranger attaquant : 20,3 / 6,5 / +10,0
    technique). Et **« toujours lever le pied » ne prend les matchs nulle part**.
  - **Vérifié** : les sept invariants du tableau des notes à **zéro écart sur 4 080 matchs**, score =
    film **0 écart**, zéro doublon de nom, aucun entrant à zéro minute ; 24 carrières entières de 18
    à 38 ans avec tous les écrans, zéro erreur ; les notes par tranche de carrière dans la même bande
    (14,0 / 8,3 / 7,0 / 14,2 % sous 5,0) ; `tests/simulate.js` → `ERRORS: none` ; **aucune migration**
    — une sauvegarde v13 porte un `etats.fond` que plus rien ne lit, et une vraie partie de la version
    déployée reprend à la 17ᵉ journée, finit sa saison, passe la trêve et rejoue une saison entière.

- **LE REMBOURSEMENT DU PHYSIQUE N'ARRIVAIT QU'À L'ÉCHELLE D'UNE CARRIÈRE** (le propriétaire,
  30/09/2026 : « ça doit pas forcément faire augmenter sa fraîcheur. Mais peut-être qu'on avait codé
  quelque chose dans ce style-là : **s'il y a eu un entraînement de physique, dans la semaine qui
  suit, il récupère des points de fraîcheur.** Je ne sais plus comment on l'avait codé, mais il faut
  que ce soit une des deux versions — et celle que je t'ai proposée en premier est peut-être plus
  juste »). Les deux versions ont bien existé, à trois jours d'intervalle : la réserve `fond`
  (supprimée le matin même) et la **vitesse de récupération** pilotée par l'axe. C'est la seconde
  qu'il avait demandée en premier, et c'est celle en place — sa question portait donc sur son
  calibrage, et la mesure lui a donné raison.
  - **Mesuré avant de toucher à quoi que ce soit** : une séance physique rendait **0,36 point de
    fraîcheur** la semaine suivante, pour un coût de 11. Trois pour cent. La séance ajoute 2,3 points
    à l'axe, dont l'essentiel est du `boost` qui se divise par deux à chaque match — et le boost était
    **retombé à 0,39 avant la séance physique suivante**. Le seul vrai paiement venait du **niveau**
    de l'axe (6,5 points par journée à physique 30, **14,2 à 80**), c'est-à-dire d'années de travail.
    À l'échelle de la semaine, la séance la plus chère du jeu n'était toujours pas remboursée.
  - **`recupPhys()` a maintenant deux termes, et il fallait les deux** : *ce que tu es* (le niveau de
    l'axe, `(base.phys − 50) × .016`, la trace d'une carrière) et *ce que tu viens de faire*
    (`min(boost.phys × RECUP_SEANCE, RECUP_SEANCE_MAX)`, avec `RECUP_SEANCE`=.135). Le boost se
    divisant par deux à chaque match, le remboursement **arrive la semaine qui suit, fort, puis
    s'éteint** — exactement la forme qu'il décrit. Mesuré après : une séance rend **2,0 points** au
    lieu de 0,36, puis la récupération retombe (13,7 · 12,5 · 11,8 sur les trois journées qui
    suivent).
  - **`RECUP_SEANCE_MAX` est ce qui garde le choix de la semaine vivant** : une séance est
    remboursée, dix séances d'affilée ne le sont pas dix fois. Sans ce plafond, « toujours le
    physique » encaisse 34 remboursements par saison et redevient la meilleure politique partout —
    le piège déjà rencontré avec le fond à +7.
  - **Avant / après sur la même sonde, 250 saisons par ligne, avec les erreurs-types.** Les deux
    lignes témoins ne font jamais de physique, donc elles ne peuvent pas bouger : elles donnent le
    bruit (0,3 à 1,4 match d'un passage à l'autre).
    | croisement | fraîcheur | matchs | titularisations | trace |
    |---|---|---|---|---|
    | académie · M | 52,0±2,4 → **73,4±1,9** | 18,4±0,46 → 20,9±0,46 | 6,3 → 7,7 | +7,3 → +7,2 |
    | quartier · D | 24,5±1,7 → **38,2±2,0** | 19,8±0,52 → 20,5±0,46 | 9,1 → 9,7 | +10,4 → **+10,8** |
    | étranger · A | 59,1±2,3 → **81,4±1,7** | 17,3±0,44 → 18,8±0,50 | 3,7 → 4,3 | +6,9 → +6,9 |
    Le gain de fraîcheur est de **+14 à +22 points**, loin au-delà du bruit ; le gain en matchs est
    de 0,7 à 2,5, dont il faut retirer le ~0,7 de dérive des témoins. **Le physique cesse d'être la
    ligne punie** sans prendre l'or des matchs à personne : « deux séances puis un repos » garde les
    matchs aux trois croisements (22,2 / 21,4 / 21,0 contre 20,9 / 20,5 / 18,8).
  - **Le remboursement se dit, sinon il n'existe pas** (la règle du projet). Le compte rendu d'une
    séance physique finit par : « Samedi tu le paieras. C'est la semaine d'après que tes jambes te
    le rendront. » Vérifié à l'écran sur dix journées : la phrase sort à chaque séance physique et le
    moteur la tient.
  - **Une correction à une affirmation de moi**, mesurée à 250 saisons avec les erreurs-types : je
    lui avais écrit que « toujours lever le pied » ne prend les matchs nulle part. Sur les **matchs**
    c'est vrai (son avance à quartier·D est de 0,3 sur « au hasard », **dans une erreur-type**), mais
    sur les **titularisations** à quartier·D il prend l'or franchement (12,9±0,56 contre 11,7±0,49,
    trois erreurs-types) — avant comme après ce lot. C'est la question de conception déjà posée et
    non tranchée : **le poids de la fraîcheur dans `niveauJour()`** (50 points d'écart valent +2,5).
    Se reposer *doit-il* faire titulariser plus ? C'est à lui de le dire.
  - **Ce que la fraîcheur gagnée ne fait pas** : elle n'entre dans la note que par
    `(niveauJour − force) × .035`, donc les +22 points du plus gros croisement valent **0,025 de
    note** — calculé sur la formule, pas mesuré. Ce qu'elle change, c'est le temps de jeu, mesuré
    ci-dessus. La sonde des notes par tranche de carrière joue `spec, spec, repos`, donc sans séance
    physique le boost reste à zéro et **les deux formules y donnent le même nombre** : elle est
    inchangée par construction (carrière entière : moyenne 6,96 · médiane 7,0 · 10ᵉ 5,1 · 90ᵉ 8,8 ·
    sous 5,0 8,6 % ; saisons 1 à 3 : 12,5 % sous 5,0).
  - **Un mort d'outillage réparé** : le banc d'essai (`v2sem.js`) affichait encore une colonne `fond`
    à `NaN` depuis sa suppression, et ne portait pas les erreurs-types que la leçon de méthode du
    29/09 impose. Il montre le **physique** et chaque colonne qui décide porte son erreur-type.
  - **Vérifié** : sept invariants du tableau des notes à **zéro écart sur 4 080 matchs**, score =
    film **0 écart**, zéro doublon de nom, aucun entrant à zéro minute ; 24 carrières entières de 18
    à 38 ans avec tous les écrans, zéro erreur ; `tests/simulate.js` → `ERRORS: none` ; **aucune
    migration** (`RECUP_SEANCE` ne lit que `base.phys` et `boost.phys`, déjà dans la sauvegarde).

- **LA FRAÎCHEUR NE FAIT PLUS TITULARISER, ELLE FAIT TENIR — ET ELLE PEUT PASSER SOUS ZÉRO**
  (le propriétaire, 30/09/2026, en tranchant la question de conception que je lui avais laissée :
  « non, le repos — la fraîcheur — ne doit pas faire titulariser plus. Mais par contre il joue sur le
  temps de jeu du joueur : **moins on est frais, moins on peut jouer longtemps.** Et d'ailleurs celui
  qui ne fait que s'entraîner au physique et enchaîner les matchs se blesse, car la fraîcheur ne se
  régénère pas assez vite : **il est censé pouvoir tomber dans le négatif.** ») Trois décisions, trois
  changements.
  1. **LA FRAÎCHEUR SORT DU CHOIX DU ONZE.** Mesuré avant d'y toucher : elle valait **4,5 points** de
     `valeurAuPoste()` entre 100 % et 10 % — plus que la confiance du coach d'un bout à l'autre. Se
     reposer était donc la façon la plus rapide d'entrer dans le onze, ce qui n'est pas du football, et
     c'était la cause que j'avais nommée sans la trancher. `niveauCoach()` (niveau + forme) remplace
     `niveauJour()` dans `valeurAuPoste()` ; `niveauJour()` garde la fraîcheur là où elle doit rester :
     le moteur de match, ta contribution à la force de l'équipe, ta note. Mesuré après : **écart 0** —
     `valeurAuPoste()` vaut 46,2 à 100 % comme à 10 %.
  2. **ELLE DÉCIDE DE COMBIEN DE TEMPS TU RESTES.** Première version : j'ai seulement relevé le poids
     des jambes dans *qui* sort (`.05/.08` → `.09/.13`). Mesuré, et **c'était un dixième de sa
     phrase** : 70,4 minutes en étant frais contre **64,9 à −35**, et **15 % des matchs encore finis à
     90 minutes en pleine dette**. La cause est mécanique : la fraîcheur décidait *qui* sortait mais
     pas *quand*, et comme il n'y a que trois à cinq changements, l'effet **saturait** — être le
     premier candidat plaçait dans le premier créneau (≈ 57ᵉ), rien de plus. `tot()` avance donc la
     minute du changement avec la dette du sortant, jusqu'à vingt-deux minutes plus tôt (plancher à la
     35ᵉ). Mesuré après, 1 143 titularisations rangées par la fraîcheur au coup d'envoi :
     | fraîcheur au coup d'envoi | minutes | a fini les 90 | sorti avant la 60ᵉ |
     |---|---|---|---|
     | 80 à 100 | **71,3** | 33 % | 31 % |
     | 60 à 80 | 69,7 | 29 % | 35 % |
     | 40 à 60 | 65,7 | 25 % | 47 % |
     | 0 à 40 | 57,8 | 16 % | 70 % |
     | **dans le rouge (< 0)** | **52,5** | 18 % | **76 %** |
     **Un résidu que je n'ai pas maquillé** : 18 % des titularisations dans le rouge finissent encore
     les 90 minutes, parce qu'un changement demande un remplaçant **de ton poste ou d'un poste voisin**
     dans les trois à cinq premiers candidats du coach. C'est une vraie contrainte d'effectif, pas un
     oubli, et à n = 78 elle est dans le bruit de la bande 0-40 (16 %). Inventer un chemin « on sort
     toujours l'homme cuit » casserait les garde-fous de formation gagnés le 27/09 (le 2-5-3).
  3. **LA DETTE EXISTE MAINTENANT POUR DE BON.** La fraîcheur était bornée à zéro — et **le plancher
     était réellement atteint** : mesuré, « toujours le physique » y était collé **5,1 % des journées**
     et son cinquième centile valait 0. La dette était donc déjà dans le jeu, le modèle la tronquait,
     donc elle ne se payait pas. `PLANCHER_FR` = −35 et `clampFr()` remplacent le `clamp()` par défaut
     aux six endroits qui écrivent la fraîcheur ; `risqueDette` ajoute `(−fraîcheur) × .0045` au tirage
     de blessure, et la raison s'écrit (« Tu joues sur la réserve depuis des semaines. Ça devait
     arriver. »). Mesuré, son cas exact — ne travailler que le physique :
     | | avant | après |
     |---|---|---|
     | fraîcheur minimale | 0 | **−35** |
     | 5ᵉ centile | 0 | **−18,4** |
     | journées collées au plancher | 5,1 % | 11,8 % |
     | semaines à l'infirmerie | 11,3 % | **15 %** |
     C'est exactement ce qu'il décrivait, et **le cercle se referme tout seul** : l'infirmerie rend les
     14 points de récupération hebdomadaire, donc elle est la seule porte de sortie de la dette.
  - **Les mots du négatif** : un état que le moteur peut atteindre doit pouvoir se dire. `direFraicheur()`
    passe de quatre à six bandes et **nomme la conséquence**, puisque c'est désormais son seul effet sur
    ta place (« Vidé — le coach te sortira tôt », « À bout — tu ne finiras pas le match », « Dans le
    rouge — tu joues sur la réserve, et ça va casser ») et `direJambes()` gagne les deux dernières.
    Vérifié à l'écran de 95 à −35 : aucune bande muette, aucun `undefined`.
  - **L'INVARIANT TIENT AUX TROIS CROISEMENTS — et j'ai failli conclure le contraire sur du bruit.** À
    250 saisons par ligne, étranger·A montrait « toujours la technique » prenant **les matchs (21,4) et
    la trace (+9,8)**, soit une ligne qui prend les deux. L'écart aux suivants ne valait que 1,7
    erreur-type, donc j'ai remonté l'échantillon plutôt que de le raconter : **à 600 saisons c'est
    « toujours le mental » qui prend les matchs** (20,23±0,35 contre 19,92±0,33) et la technique garde
    la trace (+10,0 contre +3,9). C'était du bruit — la leçon de méthode du 29/09, appliquée à temps
    cette fois.
  - **Une conséquence émergente, et c'est la sienne.** À quartier·D (physique 40, donc une charge qui
    coûte 6 % plus cher et une récupération 16 % plus lente), **toutes** les politiques d'entraînement
    finissent la saison entre 5 % et 21 % de fraîcheur, et « lever le pied » reprend l'or des matchs
    (21,9). Mais **plus du tout par le choix du coach** — il n'y lit plus la fraîcheur : par les
    **blessures**, c'est-à-dire par la disponibilité. C'est mot pour mot le mécanisme qu'il a décrit, et
    l'invariant tient puisque cette ligne a la pire trace (+4,4 contre +11,1 pour le physique).
  - **Vérifié** : sept invariants du tableau des notes à **zéro écart sur 4 080 matchs**, score = film
    **0 écart**, zéro doublon de nom, aucun entrant à zéro minute ; 24 carrières entières de 18 à 38 ans
    avec tous les écrans, zéro erreur ; `tests/simulate.js` → `ERRORS: none` ; les notes se creusent
    légèrement comme la dette l'exige (carrière entière : moyenne **6,83**, sous 5,0 de 8,6 % à
    **9,8 %** ; saisons 1 à 3 : 15,9 % sous 5,0) et la moyenne reste **au-dessus du pivot de 6,2** que
    lit la confiance du coach, ce qui est la contrainte à ne pas franchir ; **aucune migration** — une
    sauvegarde v13 porte une fraîcheur positive, qui est dans le nouveau domaine.

- **LES VINGT-NEUF ARRÊTS** (le propriétaire, 30/09/2026 : « vas-y pour les arrêts »). Mise en code
  des §2 et §3 de la page de décisions — **https://claude.ai/artifact/VDvYbM8fkUtuAMyfu58eAW** — soit
  les dix-sept arrêts réécrits et les douze familles nouvelles. C'était le dernier gros morceau de
  contenu : le moteur était solide depuis une semaine, et les décisions qu'il servait étaient encore
  des marqueurs de forme.
  - **Le défaut qu'il avait trouvé en mesurant les cinquante options d'avant** : **dix-neuf étaient un
    gain gratuit, douze une perte sèche, et dix-neuf seulement un vrai arbitrage** — 62 % des options
    du jeu ne décidaient rien. La règle appliquée aux seize familles réécrites, et c'est la seule :
    **chaque option coûte et gagne quelque chose, dans deux monnaies différentes.** La plupart passent
    de trois options à deux, parce qu'une troisième option tiède est exactement ce qui fabriquait les
    gratuités. Le kiné (`corps`) est **laissé tel quel** : c'était déjà la seule famille conforme, et
    c'est elle qui a servi de modèle aux autres.
  - **Douze familles nouvelles**, classées par le trou qu'elles bouchent. Les quatre premières
    n'existaient nulle part dans la semaine et ce sont celles où **l'argent et le contrat deviennent
    des décisions** : `contrat` (signer, demander plus, attendre juin), `sponsor`, `premierGros`
    (une fois par carrière, quand ton salaire a doublé), `offreHiver`. Puis le football qui manquait :
    `nouveauCoach`, `brassard`, `retour` (de blessure), `piqure`, `double` (changer de poste). Puis le
    hors-football : `pereStade`, `rumeur`, `selection`.
  - **Les mécaniques que ça demandait, toutes nouvelles.** Chacune est une **porte** dans `appliquer()`,
    comme `liens` ou `axes` : une option reste une donnée, jamais du code.
    | porte | ce qu'elle fait |
    |---|---|
    | `promesse` | une **conséquence différée** : promettre un résultat au micro, faire venir son père au stade, revenir d'infirmerie trop tôt. `reglerPromesses()` la règle après le match, une fois, et elle se dit |
    | `brassard` | les journées où chaque note sous 5,6 coûte **le double** en mental — c'est tout ce que le brassard coûte, et c'est assez |
    | `piqure` | le corps ne remonte plus **cette saison** : échanger la fin de sa carrière contre samedi |
    | `forfait` | un forfait décidé après que le coach a annoncé son groupe : `poserEquipeDuJour()` est rappelé, sinon le match jouerait le onze d'avant |
    | `renego` | le seul **pari** de la semaine : ce que le club lâche dépend de ce qu'il pense de toi et de ta saison |
    | `poste` | `changerPoste()` — le socle descend avec la base, la seule chose du jeu qui le fasse, et c'est juste : « j'ai toujours été bon à ce poste » ne veut plus rien dire quand on change de poste |
    | `prime` / `debours` | l'argent en mois de salaire, qui entre ou qui sort |
    | `prochesPlancher` | aider les tiens au premier gros salaire **ne s'oublie pas** : la seule jauge du jeu à recevoir un plancher, et il tient toute la carrière |
    | `avant` | une famille peut changer l'état **avant** que tu choisisses : le nouveau coach remet sa confiance à 50 en arrivant, pas après ta réponse |
    Et chaque décision qui produit quelque chose tout de suite **le dit** : `S.semaineArret.suite` ramène
    la phrase (« La prime est tombée : 4 k€ », « Il a pris un stylo et il a barré le chiffre ») sous ton
    choix dans « Ta semaine ».
  - **Mesuré, 40 carrières entières, 774 saisons, 13 977 arrêts** : **29 familles sur 29 tirées**,
    **aucune option jamais prise** sur les soixante-cinq, **18,1 arrêts par saison** (inchangé) et la
    plus fréquente à **9,1 %** contre 12 % avant — la diversité gagne parce qu'il y a douze familles de
    plus, pas parce que le tirage a changé. Les sept phrases de résultat sortent toutes, les six issues
    de promesse aussi, et la rechute du retour de blessure tombe à **41 %** (spec : 40 %). Tu changes de
    poste dans **6 carrières sur 40**.
  - **DEUX DÉFAUTS DANS MON PROPRE CODE, TROUVÉS À LA MESURE.** Le second est le plus intéressant :
    1. `S.reprise = 0` au lieu de 2 à la sortie d'infirmerie — la fenêtre où le coach peut te demander
       de jouer avant l'heure ne s'ouvrait jamais. Elle se pose maintenant là où l'infirmerie se vide.
    2. **Les promesses se réglaient dans `apresMatch()`, donc après l'écran de résultat.** `m.mvt` est
       ce que cet écran affiche : le joueur n'aurait **jamais vu** une promesse se tenir ou se retourner
       contre lui. Mesuré : zéro promesse visible sur 774 saisons. Déplacé dans `finirMatch()`, avant
       le rendu. Une conséquence invisible n'existe pas — c'est la règle du projet, et je l'avais
       enfreinte en écrivant la mécanique censée la servir.
  - **Un cas fermé au passage** : un remplaçant expulsé **à la minute où il entre** restait à zéro
    minute au compteur. Un match sur huit mille, et c'était devenu un peu plus probable depuis que les
    changements peuvent avancer de vingt minutes (lot précédent). Le carton est décalé d'une minute
    après l'entrée ; vérifié trois fois de suite à zéro sur 4 080 matchs.
  - **L'invariant de la semaine, banc à 250 saisons par ligne** : matchs et trace restent sur deux
    lignes différentes à académie·M (mental 22,7 / poste +7,6) et quartier·D (normale 20,9 / physique
    +9,8). À étranger·A les trois premiers sur les matchs sont **dans une erreur-type** (technique
    20,3±0,48 · mental 20,2 · au hasard 20,2) : c'est une égalité, pas une victoire, et la trace va à
    la technique (+9,5). Les titularisations montent partout d'un demi-point à un point, ce qui est
    attendu : les options gratuites ont disparu, donc chaque décision paie désormais quelque chose.
  - **Vérifié** : sept invariants du tableau des notes à zéro écart, score = film **0 écart**, zéro
    doublon de nom, aucun entrant à zéro minute (trois passages) ; 24 carrières entières de 18 à 38 ans
    avec tous les écrans, zéro erreur ; `tests/simulate.js` → `ERRORS: none` ; les notes restent dans
    leur bande (carrière entière : moyenne **6,85**, sous 5,0 **10,1 %** ; saisons 1 à 3 : 16,1 %) et la
    moyenne reste au-dessus du pivot de 6,2 que lit la confiance du coach ; **migration 13 → 14** sur
    une vraie sauvegarde de la version déployée, reprise **en plein match** puis à la 17ᵉ journée, fin
    de saison, trêve passée et **deuxième saison entière** jouée.
  - **Ce qui reste de la page** : le **sous-système** de la sélection. La famille `selection` est
    codée — c'est la décision, et son prix est dans les jambes de samedi (−12 de fraîcheur) — mais la
    convocation, les deux matchs de milieu de semaine dans le film et le calendrier international
    n'existent pas. C'est le sujet qu'il avait lui-même mis après celui-ci.

## Fichiers
- `index.html` charge dans l'ordre : `profile.js` (styles de jeu, nationalités), `players.js` (≈400 joueurs réels `[nom, poste, naissance, niveau, nationalité]`), `eras.js` (époques, clubs FR/Europe/monde avec force par décennie, entraîneurs réels), `content.js` (incidents, coups du sort, dilemmes, carrefours, roulettes, arnaques, présidents — vingt événements de vie et vingt dilemmes par mode), `core.js` (moteur partagé : joueurs, effectifs, marché, championnats, coupes, développement, badges, persistance), `match.js` (le match : familles de styles, approche, entraînement, fraîcheur, suspensions, compo automatique, moteur minute par minute avec buts, penaltys, cartons, blessures, remplacements, mi-temps, notes, récit), `coach.js` (carrière entraîneur·euse), `player.js` (carrière joueur·euse), `ui.js` (tous les écrans).
- Tout l'état d'une carrière est dans l'objet global `state` (sérialisé dans localStorage). `state.pendingChoice` désigne l'écran courant ; `render()` dans `ui.js` dispatche.
- Une saison se joue journée par journée : `state.matchday` avance dans `state.comp.schedule`, le match courant est `state.match` (identifiants de joueurs seulement, résolus via `coachSquadMap()` / `playerSquadMap()`). Écrans entraîneur·euse : `meeting` → `matchResult` → `phaseResult` à la fin de chaque quart de saison → `seasonEnd`. Le mode joueur·euse garde `prematch` → `penalty` → `matchResult` (son pivot reste à faire).
- **Le bilan de fin de saison** (`renderSeasonEnd`) est le temps où l'on souffle : le film de l'année (le grand soir, le soir qu'on oublie, les derniers arbitrages), le vestiaire (qui a grandi, qui veut partir, qui resterait), le président et sa phrase, les jauges avant → après, ce qu'il en reste. Les données sont assemblées dans `season.bilan` par `coachEndSeason()`, à partir de `state.seasonStats.g0` (photo des jauges au coup d'envoi) et `state.seasonStats.decisions`. Le détail chiffré (classement, coupes, progressions) est replié dans un `<details>`.
- **Les rendez-vous (mode entraîneur·euse)** : on ne compose plus et on ne joue plus les matchs. `coachAdvance()` déroule le calendrier, joue tout avec la compo de l'adjoint, et ne s'arrête que si `coachDrawMeeting()` renvoie un rendez-vous (`state.meeting`, écran `meeting`). Chaque rendez-vous est une décision ; `coachChooseMeeting()` applique ses effets puis **joue le match dans la foulée**, et l'écran `matchResult` est la réponse à la décision (rappelée en tête par `recapHTML()` depuis `state.meetingRecap`). Quota par phase : `MEETING_QUOTA` (8 / 6 / 3 selon `state.tempo`), soit **13 à 17 rendez-vous par saison** mesurés. Le propriétaire a corrigé une mauvaise lecture de ma part : le nombre d'arrêts n'a jamais été le problème, c'est leur **nature** (opérer vs choisir). 30 à 40 décisions par saison lui conviendraient ; on monte progressivement. Les matchs joués en coulisses vont dans `state.skipped`, affichés via `state.sinceLast`.
- **Les deux côtés d'une carrière, à parts égales.** Chaque rendez-vous déclare son `side` : `terrain` (le métier) ou `vie` (les gens, la maison, la maison-club). Après l'ajout des cinq familles sportives, le terrain était monté à **84 %** des rendez-vous — parce que ses familles sont presque toujours applicables, quand l'humain restait verrouillé derrière des conditions étroites. Le propriétaire a tranché : « réduis les parties footballistiques, le reste compte aussi ». Quatre familles de plus côté vie — `coachMeetingAgent` (l'agent d'un joueur dont le contrat finit), `coachMeetingFans` (une banderole ou une délégation, quand la jauge supporters descend ou que la série est mauvaise), `coachMeetingHome` (l'anniversaire, le spectacle de fin d'année, le rendez-vous repoussé deux fois, ton père au téléphone — la seule famille qui touche `proches` en plein), `coachMeetingBoard` (le sponsor, le directeur sportif, le conseil) — et surtout `coachDrawMeeting()` **tire du côté en retard sur la saison** dès que l'écart atteint deux (`state.seasonStats.sides`). Un écart de un rendrait la suite prévisible ; deux rendez-vous de terrain d'affilée sont une saison normale. Mesuré après : **56 % terrain / 44 % vie**, 22 décisions par saison.
- **Dix-neuf familles de rendez-vous**, toutes dans `coach.js`. Cinq ajoutées le 22/09/2026 sur demande du propriétaire (« pas assez de problèmes liés au football et au sportif, surtout dans la préparation des matchs, dans la récupération ») : `coachMeetingPrep` (la semaine d'avant : plan de jeu, semaine athlétique, coups de pied arrêtés, deux jours de repos), `coachMeetingRecovery` (les 72 h entre deux matchs, quand la fraîcheur est entre 82 et 92 %), `coachMeetingShape` (un problème de jeu et non d'humeur : plus de 1,7 but encaissé par match, ou moins de 0,9 marqué), `coachMeetingCards` (un cadre à un carton de la suspension avant un match qui compte), `coachMeetingPitch` (la pelouse et le gel, en déplacement l'hiver). Quota relevé à 10 / 8 / 4. L'anti-répétition garde les **cinq** derniers genres, pas trois : celles qui sont toujours disponibles faisaient le papier peint (la semaine d'entraînement montait seule à 24 % des écrans avant correction). Les dix premières : `coachMeetingPress` (la conférence : protéger les joueurs, les secouer, promettre un résultat, langue de bois), `coachMeetingBonus` (la prime avant un gros match), `coachMeetingReturn` (un revenant : le titulariser, une mi-temps, deux semaines de plus), `coachMeetingTravel` (le déplacement : avion la veille, car le matin, car la veille), plus les six premières : `coachMeetingInjured` (un cadre absent : le remplaçant, le jeune, le faire jouer quand même, déléguer à l'adjoint), `coachMeetingFronts` (championnat ou coupe d'Europe → `state.effort`, qui pèse sur `coachBonus()`), `coachMeetingCaptain` (le capitaine plaide pour un joueur au moral bas), `coachMeetingPresident` (le président veut voir jouer son gros salaire), `coachMeetingSquad` (un symptôme : fraîcheur sous 82 %, vestiaire sous 45), `coachMeetingOpponent` (leur style, et comment l'aborder). `coachDrawMeeting()` rassemble **tous** les candidats applicables puis écarte les genres vus dans les trois derniers (`state.recentMeetings`) : deux écrans de suite du même genre tuent le rythme.
- **Une décision ne peut plus être allumée en permanence** (retour du propriétaire, 22/09/2026 : « c'était trop facile au niveau des choix, 1/2 phase ou 1/4 de phase suffisent »). Première mesure : **raccourcir la portée ne changeait rien** — 88 % des matchs portés par une décision avec une portée d'une phase, 92 % avec une demi-phase, parce que les rendez-vous s'enchaînent assez vite pour qu'une décision écrase la précédente avant d'expirer. Le vrai levier n'était pas la durée mais la **répétition** : un joueur qui prend toujours l'option qui aide le match gardait un bonus à plein toute la saison. Deux changements : la portée tombe à une demi-phase (`MEETING_SPAN`) avec une **extinction linéaire** (`activeBoost()` renvoie `v × restant/portée`), et surtout chaque gain immédiat consécutif est amorti (`MEETING_FATIGUE`=.35, `boostFactor()` = `1/(1+.35×streak)`) — accepter un choix qui ne sert pas le match suivant fait remonter la corde, et `state.boostStreak` se remet à zéro à chaque phase. L'amorti est **asymétrique** : seuls les gains s'usent, jamais les coûts. Mesuré : le bonus moyen porté par le joueur glouton tombe de **1,37 à 0,78** (−43 %), et l'équilibre général d'un jeu varié ne bouge pas (51 % du tableau avant comme après, sur 82 et 89 saisons simulées). `matchChip()` affiche la valeur réellement appliquée et dit quand elle est amortie.
- **Le poids d'une décision**, mesuré et calibré : `plan.bonus` × `MEETING_WEIGHT` (2,2) alimente `state.matchBoost={v,until}`, qui porte **jusqu'à la fin de la phase** et non sur un seul match. Un bonus d'un match ne pouvait structurellement pas compenser une jauge abîmée pour toujours ; chercher le gain immédiat était donc une stratégie strictement perdante (mesuré : 0 titre et 71 % du tableau contre 9 titres et 43 % pour la politique inverse). Après correction, aucune ne domine : le court terme prend les titres (7 contre 4), le long terme la régularité et la confiance. Le poids des jauges dans `coachBonus()` passe de .05/.03/.015 à .055/.042/.022 (tactique / vestiaire / staff) — à .06/.06/.03 le jeu devenait trivial, jusqu'à 32 titres par carrière. `activeBoost()` / `boostLabel()` exposent la décision en cours ; elle apparaît avant le clic (`matchChip()`), dans « pourquoi ce résultat » et dans le tableau de bord.
- **Un seul chiffre par question** (check-up du 22/09/2026, demandé par le propriétaire : « les infos ne sont pas toujours les bonnes aux bons endroits »). Quatre écrans répondaient à « quelle est la force de mon équipe » avec quatre formules différentes : `coachBonus()` jouait .055/.042/.022, `coachStrengthBreakdown()` affichait .05/.03/.015, `coachBonusLines()` oubliait le staff, et `impactLines()` (bilan de phase) inventait .08 pour la tactique. Désormais `STRENGTH_W` est la seule définition ; `coachStrengthBreakdown()` en découle et **inclut l'effort** (±0,8, qui manquait au total), `coachBonusLines()` et `impactLines()` ne sont plus que des lectures de ses lignes. `gaugeHelp()` écrit le calcul dans le sens où il se produit (« Tactique 31 : 19 points en dessous de 50, à 0,055 le point »). `phaseRec.strength` passe par `coachStrengthShown()` : l'ancien `coachStrength()` embarquait l'aléa du jour (`rand(-1.5,1.5)`) et affichait donc un tirage au sort comme une mesure. Vocabulaire fixé partout : **niveau de l'effectif** (l'onze et le banc) et **force en match** (tout compris). `tests/simulate.js` assert à chaque phase que le total affiché est celui que le moteur joue et que le détail fait le total.
- **La confiance du président s'explique** : c'est le chiffre qui licencie, il n'avait aucune décomposition. `coachFinishPhase()` construit `ph.confWhy` (place contre objectif, bilan V/D, podium, zone rouge, masse salariale au-delà de 110 % du plafond, tempérament du président qui amplifie ou adoucit une sanction) et `confWhyHTML()` l'affiche sous le bilan de phase.
- **Le détail doit faire le total** : le bilan annonçait « objectif manqué −4 · relégation −6 · +2 » pour une cote qui perdait un point. Les mérites bruts sont désormais affichés **après amortissement** (`scale`), avec une ligne qui nomme l'amorti, une autre le plafond ou le plancher quand la cote sature, et le non-renouvellement (−4) qui tombait après le calcul est réinjecté dans `season.cote`.
- **L'objectif révisé s'annonce** : `coachStartSeason()` ne peut que durcir l'objectif promis à la signature (`Math.min` du promis et du rang de ton effectif). Il le faisait en silence — l'offre disait 10e, la saison jouait 6e. `c.objectivePromised` et `c.objectiveNote` sont posés, journalisés, affichés sur l'écran de plan de jeu et rappelés dans le tableau de bord.
- `coachApplyPlan()` traduit une décision en effet sur le match qui suit : `forceIn` (titulariser quelqu'un, celui qu'on sort perd du moral), `playHurt` (`state.hurtGamble`, 45 % de rechute aggravée), `rotate`, `approach`, `style`, `training`, `bonus` ponctuel (`state.nextMatchBonus`), `effort`, `delegate` (l'adjoint tranche, d'autant mieux que la jauge Staff est haute).
- Tableau de bord : `renderDashboard()` / `renderPlayerDashboard()` dans `ui.js`, ouverts par le bouton `#dashBtn` du bandeau (`openDashboard()` / `closeDashboard()`, état dans la variable `dashOpen` de `ui.js`, hors sauvegarde). `coachStrengthBreakdown()` (coach.js) décompose `coachBonus()` ligne par ligne avec son explication chiffrée ; `state.seasonStats.trainWeeks` compte les semaines de chaque entraînement et `p.lastDev` retient le gain appliqué à chaque joueur par `developSquad()` à l'intersaison. La carte porte la classe `dash-card`, qui la dispense du bouton collant.
- **Un joueur se décrit par sa manière de jouer, plus par son caractère** (demande du propriétaire, 23/09/2026 : « plutôt que d'avoir des joueurs qui ont des personnalités de fêtard ou d'égo, avoir des joueurs liés à un style de jeu qui s'assoit bien ou moins bien au mien »). `TRAITS` (leader, ego, fêtard, fragile…) est remplacé par `PROFILS` dans `profile.js` : dix profils footballistiques (Métronome, Poumon, Flèche, Roc, Dribbleur, Couteau suisse, Renard des surfaces, Tour de contrôle, Cerveau, Soldat), chacun avec `loves` et `hates` parmi les quatorze styles. `styleFit(p,styleId)` renvoie +1 / 0 / −1, `playerProfil(p)` traduit au passage les anciennes sauvegardes via `TRAIT_TO_PROFIL`. Toutes les mécaniques que portaient les traits sont reprises par les profils, mais découlent maintenant du football : `lead` (brassard et `captainBonus`), `aggr` (cartons), `injury` (fragilité), `recovery` (fraîcheur), `dev` (progression), `fans` (popularité).
- **L'accord entre l'effectif et ton style est une ligne de force à part entière** : `coachStyleFit()` compte le onze (`plus` / `minus`) et vaut `moyenne × FIT_WEIGHT` (2,2) dans `coachBonus()` comme dans la décomposition. Mesuré d'abord sans rien d'autre : l'écart entre le meilleur et le pire style pour un effectif donné ne valait que **1,19** de force, parce que des profils tirés au hasard se moyennent à zéro. `generateSquad()` donne donc une identité à chaque effectif — le club a recruté pour le football qu'il veut jouer : 50 % des joueurs prennent un profil qui aime `offer.styleWanted`, la moitié du reste un profil qui au moins ne le déteste pas. Écart mesuré après : **2,65 de force**, davantage que le bonus de style du club (1,2). Imposer son style favori à un effectif bâti pour autre chose se paie donc, et se répare au mercato. L'écran de plan de jeu affiche `✅ n · ⚠️ n` par style et marque le onze type ; la carte du mercato porte `profilCardHTML()` (ce qu'il aime, ce qui le gêne, comment ça tombe dans ton jeu) et l'effectif une pastille `fitTag()`.
- **Écarter un dossier au mercato** : `coachDropTarget(i)` marque `t.dropped`, `marketDeck()` le filtre, la pile raccourcit et le dossier ne revient pas dans la fenêtre ; `coachUndropAll()` remet tout sur la table. Les compteurs d'onglets ignorent les dossiers écartés. `tests/simulate.js` assert que la pile perd bien un dossier, qu'il ne revient pas, et que tout remettre les rend tous.
- **Le championnat répond, et l'échelle des clubs a été resserrée** (retour du propriétaire, 25/09/2026 : « j'ai tout gagné pendant 10 ans »). Diagnostic mesuré, carrière d'élite forcée sur douze saisons : **74 % des saisons championnes à partir de la 6e**, écart à la moyenne du championnat montant de −0,2 à **+15** dès la 4e saison, zéro licenciement. Trois causes, toutes corrigées, chacune vérifiée séparément :
  1. **L'échelle d'un championnat était trop étalée** : `tierBaseStrength` allait de 66 à 88 en Europe, donc un grand club était mécaniquement 15 points au-dessus de la moyenne **dès sa première saison**. Resserrée à 14 points d'amplitude (europe 71→85, ligue1 68→83, etranger 63→77) ; `coteToStrength` recalé en conséquence (`46+cote*.39`). Les clubs de complément (`FILLERS`) étaient posés en dur (56-63, 60-67, 62) et tiraient la moyenne vers le bas : ils se calculent maintenant par rapport au championnat qu'ils remplissent (`fillStrength()` = moyenne − rand(0,5)).
  2. **Le plafond salarial suivait encore ton effectif** : `max(force du club, moyenne du onze − 2)` — chaque recrue relevait le plafond, qui autorisait la suivante. C'était le plancher `squadWages()*1.05` sous un autre nom. Il se calcule désormais sur la seule force du club, et `coachAcceptOffer()` normalise la masse salariale héritée à 85 % du plafond pour qu'on n'arrive jamais déjà au-dessus (mesuré : 0 % de mercatos au-dessus du plafond à la signature, contre 27 % avant).
  3. **Rien ne rattrapait jamais** : `state.leagueArms[championnat]` monte de `min(4, (écart−2)×0,8)` par saison passée au-dessus (plafond 30) et redescend de 1 par saison ordinaire. `coachStartSeason()` l'ajoute à chaque rival, `coachArmLeague()` le calcule en fin de saison sur l'effectif de l'année écoulée, c'est journalisé, affiché dans le bilan (« Le championnat s'arme contre toi ») et dans le tableau de bord. Mémorisé par championnat : on retrouve armé celui qu'on a quitté.
  Résultat mesuré : titres à partir de la 6e saison **74 % → 49 %**, écart au superclub **15,5 → 8,8**, et surtout l'écart **décroît** désormais sur une carrière (10,7 à la 5e saison, 3,7 à la 9e) au lieu de grimper.
- **Les scores saturent** (retour du propriétaire, 25/09/2026 : « il y a des matchs où je gagnais 12-0, 15-0 »). L'espérance de buts était une exponentielle sans borne (`1,35 × exp(écart/19)`) : mesuré sur 4 000 matchs par palier, à +35 de force elle attendait **9,4 buts** et 24 % des matchs finissaient à douze buts ou plus, avec des records à 22. `tameXG()` dans `core.js` laisse les matchs ordinaires intacts (identiques jusqu'à +10 d'écart) et comprime la queue au-delà de 2,6 buts attendus, avec une asymptote à 4,8. Appliqué aux deux moteurs : `simMatch()` (matchs joués en coulisses, donc le classement) et `matchLambdas()` (le tien). Après : à +35, moyenne 4,3 et 0,13 % de matchs à douze buts ou plus ; les buts par match d'une saison restent à 2,6–3,3.
- **La diversité des rendez-vous ne se règle pas au tirage mais à la disponibilité** (« les problèmes revenaient trop vite, trop souvent »). Pondérer le tirage par le nombre de passages (`pickByWeight`, poids `1/(1+n)^1,8`) n'a presque rien changé : à chaque arrêt, seules trois ou quatre familles étaient applicables. Les verrous `it.score>=N` (« ce match compte ») datent d'une époque où l'on s'arrêtait rarement ; avec huit arrêts par phase ils affamaient le tirage. Desserrés (la presse n'en a plus, le président 1, l'adversaire et le déplacement 2, la prime 3, les cartons aucun, la pelouse s'ouvre aux phases 1 et 3), et `MEETING_CAP` (3) **devait** empêcher une famille de revenir plus de trois fois par saison. Mesuré : la famille dominante passe de 15 % à 13 % des écrans, la pelouse de 0 à 6 %, les cartons de 1 à 4 %, quatorze familles au-dessus de 2 %. **Correction du 26/09/2026 (cartographie) : ce gain vient du tirage pondéré, pas du plafond.** Le filtre qui applique `MEETING_CAP` a une porte de sortie — si aucune famille non plafonnée n'est disponible, on retombe sur la liste complète — et avec trois ou quatre familles applicables par arrêt, elle s'ouvre souvent : la presse est mesurée à **5,3 par saison** pour un plafond de 3.
- **Le monde arrête de se répéter** (retour du propriétaire, 26/09/2026 : « il y a des dilemmes qui doivent apparaître qu'une fois et qui apparaissent dix fois dans la carrière avec les mêmes joueurs ; et il y a des dilemmes qui n'apparaissent pas »). Recensement sur 46 saisons simulées avant de toucher à quoi que ce soit — **douze contenus sur cinquante n'étaient jamais tirés** (dont deux seulement datés après 2000, donc hors de portée de la sonde), et « Le micro tendu » était apparu **109 fois**. Trois causes séparées :
  1. **Les vingt dilemmes n'entraient dans le sac que si leur jauge était sous 40.** Supporters, Staff, Formation et Proches ne descendent jamais si bas dans une carrière tenue : dix dilemmes étaient donc morts. La jauge pèse maintenant sur le **poids** et non sur l'admission (sous 25 → 9, sous 40 → 6, sous 55 → 2,5, au-dessus → 0,8). Contenus morts : 12 → 5, dont deux datés.
  2. **Une seule mémoire là où il en fallait deux.** `state.metFor` est remis à zéro chaque saison et suffit pour les histoires qui se répètent légitimement (un blessé, un carton qui pend). Les autres ne se jouent qu'**une fois par joueur et par carrière** : `metOnce()` / `markOnce()` sur `state.seenFor` (jamais remis à zéro) pour `president`, `capitaine`, `agent` et `retour`. Chacune porte désormais `mt.aboutId`, et `tests/simulate.js` échoue si une histoire se rejoue sur le même joueur — l'identifiant plutôt que le nom, pour ne pas confondre deux homonymes.
  3. **Chaque famille n'avait qu'un ou deux textes.** `pickScene(kind, scenes)` tire une scène en évitant la précédente (`state.lastScene`). La presse en a douze selon la série en cours (mauvaise, bonne, quelconque), la semaine d'entraînement cinq, la tribune huit selon la jauge supporters, la prime trois. L'écran le plus revu passe de **109 à 29 fois** sur 45 saisons.
- **Les autres clubs vivent aussi** (« il y a un décalage entre l'évolution de mes joueurs et l'évolution des joueurs des autres équipes »). C'était exact : tes joueurs progressent par `developSquad()`, tandis qu'un club adverse n'était qu'un nombre recalculé à l'identique chaque saison. `coachDriftLeague()` / `leagueDrift()` donnent à chaque club sa propre marche aléatoire, mémorisée par championnat et par club, avec rappel vers zéro (`was*.88 + rand(-1.6,1.6)`, bornée à ±7) pour qu'aucun ne s'échappe indéfiniment. C'est **indépendant de `leagueArms`**, qui est une réaction à toi ; celle-ci est la vie du championnat sans toi. Mesuré sur dix saisons au même club : un rival se déplace de **4,2 places** dans la hiérarchie et sa force varie de 3,9 points, et la dérive persiste d'une saison sur l'autre au lieu d'être un bruit remis à zéro.
- **Le mode joueur·euse a enfin une boucle de décisions : sa semaine** (retour du propriétaire, 26/09/2026 : « le joueur n'a pas assez de choses à faire, de responsabilités. On ne joue pas assez sur ses entraînements. Ce qui serait cool, c'est qu'avant ou après un match il décide de plus ou moins s'entraîner »). Diagnostic : la progression ne tenait qu'à **une seule formule annuelle** d'âge × temps de jeu dans `playerEndSeason()` — l'entraînement n'existait pas, et l'écran d'avant-match était une fiche à lire. `PTRAINING` (cinq semaines : rester après l'entraînement, salle et sprints, vidéo et mental, la semaine du groupe, lever le pied) est posé **sur l'écran d'avant-match**, qui devient la décision : chaque option coûte de la fraîcheur pour le match qui suit (`t.fit`, de +8 à −11) et dépose une charge (`ss.load[aspect]`, `ss.trainLoad`) qui ne paiera qu'en juin. `playerWeekPasses()` fait suivre la récupération au choix. `pEffort()` est la charge moyenne des semaines décidées, `pLoadShare()` dit vers quoi elle a poussé, et `pTrainingCurve()` **dépend de l'archétype** : un bosseur plafonne sans volume (×0,55) et dépasse les autres à plein régime (×1,30) ; un génie n'en tire presque rien (×0,95 à ×1,23). Le travail accélère une progression et freine un déclin, jamais l'inverse. Mesuré sur ~10 saisons, quatre carrières par politique : un **bosseur** finit à 82,6 de niveau en donnant tout contre 70,5 en levant le pied (douze points) ; un **génie** finit *moins bien* en se surentraînant (74,8 contre 78,9) ; un profil neutre arbitre entre le niveau (80,9) et les notes (7,11 en levant le pied contre 6,64). La fraîcheur au coup d'envoi passe de 100 % à 40 % selon la politique. Le tableau de bord joueur·euse affiche la charge, le multiplicateur, la répartition et le bilan de la saison précédente.
- **Ce qui n'arrive qu'une fois dans une vie n'arrive qu'une fois** : le propriétaire a vu « la naissance de ton premier enfant » cinq ou six fois dans une carrière. La mémoire des dix derniers tirages (`state.recentEvents`) ne pouvait pas l'empêcher. Un contenu peut désormais porter `once:true` (mémorisé dans `state.seenEvents`, jamais remis à zéro) et `when:()=>…` pour dépendre d'une situation ; `eventAllowed()` et `markEventSeen()` dans `weightedDraw()` s'en occupent pour les deux modes. Les naissances sont devenues une **suite** : `p-famille` est le premier enfant (`once`), `ph-enfant2` les suivants (`when:()=>state.kids>=1`), et `state.kids` compte la famille. `tests/simulate.js` échoue si un événement unique se rejoue.
- **L'intersaison du joueur·euse est une suite de quatre décisions, pas un écran d'offres** (retour du propriétaire, 26/09/2026 : « l'intersaison d'un joueur ne doit pas seulement être résumée en un seul choix… et plutôt que de me laisser choisir entre les propositions, ce serait bien que j'aie une proposition sans savoir si j'en aurai de meilleures »). Écrans `vacances` → `ete` → `envies` → `offerOne`.
  1. **`PVACANCES`** — **quatre** façons de passer six semaines, chacune avec sa propre raison d'être choisie (retour du propriétaire, 26/09/2026 : « en famille au calme, à deux loin de tout, tous ensemble dans une grande maison, c'est un peu la même chose » — les trois sont fusionnées en une ; « partir un mois avec les amis, qu'est-ce qu'il y a de positif ? Il manque ce point de vue… la famille ça peut être +2 au mental, les amis +4 mais plus fatigant physiquement »). **Du temps avec les proches** (entourage +12, pression −10, corps +7, mental +2, et tout l'été reste pour travailler), **un mois avec les amis** (mental +4 et supporters +3, mais entourage −8, corps −8, forme −12, récupération réduite toute la saison, 10 % de risque de blessure), **surf et sensations** (mental +5, physique +1, 18 % de risque), **tournée commerciale** (argent et notoriété, corps −9, entourage −6, pression +5). Surtout, chaque option porte un `prep` : ce qu'elle laisse de l'été pour travailler — « c'est une période où je ne m'entraîne pas, donc je suis moins performant le reste de l'année ». Un mois d'absence **retient la charge de la préparation à 55 %** (tournée 60 %, sensations 90 %, proches 100 %), et l'écran de préparation affiche la charge **réellement retenue**, pas celle de l'option.
  2. **`PSUMMER`** — repos complet, entretien léger, préparateur personnel, stage intensif (12 % de risque). Pose `state.summerLoad` (la charge qui comptera en juin) et `state.summerFatigue` (0-2), qui **baisse la fraîcheur de départ** (100 / 92 / 85) et **la récupération hebdomadaire de 12 ou 25 % toute la saison** — l'effet long terme sur une saison entière qu'il demandait.
  3. **`PWISHES`** — ce que tu demandes à ton agent (rester, du temps de jeu, un grand club, le meilleur contrat, l'étranger, rentrer chez toi) pondère l'ordre des offres via `playerWishScore()`.
  4. **`offerOne`** — **une proposition à la fois**. Signer ou refuser ; refuser la fait disparaître pour de bon et la suivante peut être pire, ou ne pas venir (mesuré : ~3 offres par intersaison, donc tout refuser laisse sans club dans 30/30 cas). `playerAgentRead()` dit ce que ton agent sait de ce qui reste, **selon la jauge entourage** : formel au-dessus de 70, évasif au-dessus de 45, aveugle en dessous — la jauge sert enfin à trancher.
  `pEffort()` mélange l'été et la saison à **poids fixes** (35 / 65) et non au prorata des semaines : mesuré, un ratio de semaines noyait l'été dans les trente-quatre d'un rythme complet (charge identique à 0,04 près quelle que soit la préparation) et le surpondérait dans un rythme rapide. Grille mesurée en deuxième saison (la première n'a pas d'été), profil bosseur : du repos complet avec des semaines légères (×0,55, +1,5 de progression) au stage intensif avec tout donné (×1,45, +5,2, mais 36 % de fraîcheur) — et une voie intermédiaire qui vaut le détour, charger l'été puis lever le pied en saison (×0,87, +2,8, fraîcheur 99 %). Un facteur 3,5 de progression par saison entre les extrêmes.
- **Une carrière décline, et ça se dit** (retour du propriétaire, 26/09/2026 : « à la fin de carrière le joueur baisse en note globale mais les clubs proposés restent le Real, le Barça, le Bayern… au bout d'un moment le club n'est pas censé vouloir le garder, il faut penser aux prochaines générations… même à partir des stats du joueur, le club devrait dire : nous on trouve que t'es pas performant, physiquement t'es plus au top. On ne ressent pas cette continuité dans le jeu »). Diagnostic mesuré avant de toucher à quoi que ce soit, sur 165 saisons simulées : les offres de grands clubs à 33 ans et plus n'étaient pas absurdes en soi (joueur à 78-81 contre club à 81-85, **écart +3**), mais **rien ne disait le déclin et rien n'en tirait de conséquence** — à 34 ans le joueur gardait 74 % de temps de jeu, et `clubKeeps` ne regardait ni l'âge, ni le niveau par rapport au club. Quatre corrections :
  1. **Qui t'appelle dépend de ton niveau du moment** : `playerTiers()` lisait `state.selected`, un drapeau permanent — une seule sélection à 24 ans ouvrait les super-clubs jusqu'à 38 ans. Il découle maintenant de `pRating()`, avec des coupes à 33 et 35 ans. Mesuré après : écart moyen à 33 ans et plus **+3 → −1,7** (on te propose des clubs légèrement en dessous de toi), et les super-clubs ne recrutent plus personne au-delà de 34 ans.
  2. **Le club décide, une fois, et il le dit** : `playerClubWants()` regarde l'âge, le niveau contre la force du club, la note et le temps de jeu de la saison écoulée, et le corps (« Le médecin du club a été clair : physiquement, tu n'es plus au top »). `playerClubDecision()` tranche **au bilan de saison** et pose `state.clubLeft` ; `playerGenerateOffers()` ne recalcule rien, il lit — sinon l'intersaison pouvait contredire ce que le bilan venait d'annoncer. Un contrat qui court encore protège ta place : le club aimerait tourner la page, c'est dit (`state.clubStuck`, rappelé dans la barre latérale toute la saison), mais il te paie. Mesuré sur 187 saisons : **33 non-renouvellements**, dont les motifs de fin de carrière qui n'existaient pas avant, et **24 saisons « on pense à l'après-toi »**.
  3. **La légende maison** : huit saisons au même club et il te garde jusqu'au bout (`wants.legend`, `state.legendOf`), quoi que disent les chiffres. C'est l'exception que le propriétaire avait imaginée lui-même.
  4. **Ne pas jouer coûte** : une saison sous 18 % de temps de jeu applique mental −3, pression +6, supporters −4, vestiaire −3 (doublé sous 6 %), affiché dans le bilan (`season.idle`). Et les semaines vides deviennent des décisions : `PLAYER_SITUATIONS` (content.js) ne se tire que quand la situation est vraie (`when`) et pèse 14 dans le sac — `ps-tribune` (des semaines sans une minute : parler au coach, travailler seul, passer par l'agent, **mettre la tête ailleurs**), `ps-tribune-long` (une saison qui passe sans toi, dont « vivre autre chose en attendant »), `ps-corps` (le corps ne suit plus), `ps-depart` (le club pense à la suite, dont parler de l'après : le diplôme, un rôle au club), `ps-jeune` (le gamin qui prend ta place). `state.benchRun` compte les journées sans entrer et s'affiche dès trois. Mesuré : **44 situations sur 187 saisons** (≈ 4 par carrière) contre zéro avant ; `renderEvent` accepte un `text` calculé pour que la situation parle de *ta* saison.
- **Une seule échelle à l'écran : sur 10** (demande du propriétaire, 26/09/2026 : « une échelle sur 10, tout à 5 au départ », et, à la question de savoir jusqu'où aller : **tout le jeu**). Décision d'implémentation : **le moteur garde ses valeurs sur 100**, seul l'affichage divise par dix. Tout le calibrage mesuré (`STRENGTH_W`, `tameXG`, `leagueArms`, les seuils de dilemmes, les poids de tirage) reste donc valable, et un point de moteur devient **un dixième affiché**. Trois fonctions dans `core.js` : `sur10()` pour une valeur, `d10()` pour une variation, `fo()` pour une contribution à la force en match (deux décimales, parce qu'un dixième de jauge pèse quelques centièmes de force) ; `niv()` est `sur10()` sous son nom de métier. `SC10` (ui.js) liste les clés concernées et `fxVal()` s'en sert dans `effectChips()`, `effectInline()`, `stateTable()` et `deltaChips()`.
  - Ce qui passe sur 10 : les quatre jauges des deux modes, les attributs (tactique, management, réseau, réputation, technique, physique, mental), la pression, la confiance du président, la confiance du coach, la cote, **et tous les niveaux** — note globale, niveau d'un joueur, force d'un club, force en match. Le niveau ne pouvait pas rester sur 100 quand les attributs qui le composent sont sur 10 : la note globale est leur moyenne pondérée.
  - Ce qui garde son unité : l'argent, les pourcentages (fraîcheur, temps de jeu), les notes de match (déjà sur 10), la dynamique (−6 à +6), les semaines, les buts, les places au classement.
  - Le texte suit le chiffre : `gaugeHelp()` dit maintenant « Vestiaire 7,1 : 2,1 au-dessus de la moyenne (5,0), à 0,042 de force le point », et les descriptions d'entraînement, les seuils écrits en dur dans l'écran des règles et la pénalité de la saison en tribune ont été recalés. **Toute la typographie numérique passe à la virgule française** : « 5,1 » et « 47.1 » sur la même carte étaient un défaut d'un seul coup d'œil.
  - Vérifié par deux sondes qui rendent **tous** les écrans des deux modes (`checkup.js`, `pscreens.js` dans le scratchpad) et cherchent les nombres à deux chiffres restés sur l'ancienne échelle. Deux bugs trouvés comme ça : un `niveau NaN` sur les dossiers de jeunes du mercato (le potentiel inconnu n'est pas un nombre) et les concurrents au poste restés sur 100 dans le tableau de bord.
- Cohérence des clubs : `state.cote` (entraîneur·euse) et `playerTargetStrength()` (joueur·euse) fixent le niveau de club visé ; `generateCoachOffers()` / `playerGenerateOffers()` filtrent les offres autour de ce niveau et respectent les contrats (`club.contractEnd`, offres `poach`, rupture avec malus).
- Nationalités : chaque joueur porte `p.nat` (code pays). `NAT_INFO` dans `profile.js` donne drapeau et nom ; `natTag(p)` dans `ui.js` l'affiche dans l'effectif, sur le marché et dans la composition, et `quotaHTML()` nomme les joueurs qui occupent le quota. `quotaActive()` : le quota ne concerne que les clubs français avant l'arrêt Bosman (`eraForeignersMax`).
- **Le mercato en dossiers** : `renderMercato()` présente **un joueur à la fois** (`state.market.idx`, `marketDeck()` trié par `marketRank()` — faisable d'abord, hors de portée en dernier). Sous la carte : ma situation (budget, masse salariale et sa barre, effectif, quota), les joueurs que j'ai déjà à son poste (`coachRivals`), ce qui bloque (`coachBlockers`) et les ventes qui débloqueraient (`coachSaleOptions`, affichées seulement si `coachSalesCover()` confirme qu'elles suffisent). Trois actions : précédent, recruter, passer. **L'effectif complet reste affiché sous la carte** (demande du propriétaire : c'est là qu'il choisit qui vendre), avec niveau, salaire, valeur et un bouton Vendre par joueur.
- Écrans longs : la carte du mercato et celles des tableaux de bord portent la classe `no-sticky`, qui les dispense du bouton collant en bas d'écran.
- Salaires : `playerWage(p, year, tier)` (niveau, âge, palier, époque). Le plafond `clubWageCap(club)` se calcule sur le **niveau réel de l'effectif** (`max(force du club, moyenne du onze − 2)`), plus sur `Math.max(squadWages()*1.05, …)` : ce plancher faisait monter le plafond avec tes propres dépenses, donc on ne pouvait jamais le dépasser et la pénalité de confiance du président ne se déclenchait jamais. Mesuré avant de le retirer : il ne dominait que dans 8 % des cas, dépassement maximal 1,22×.
- **Vendre une recrue** : `coachSell()` n'annule un transfert que dans la **fenêtre de mercato où il a été conclu** (`p.joinedWindow`, `marketWindow()` → `2015-E` ou `2015-H`). Avant, `joinedYear===state.year` rendait un joueur acheté en été non vendable à sa valeur en hiver : on ne pouvait que le rendre au prix payé, alors qu'il avait joué une demi-saison et évolué. L'écran marque ces joueurs d'une étiquette « recrue » et le bouton dit « Annuler » au lieu de « Vendre ».
- **Valeur d'un joueur** : `playerValue()` = `valueForRating(niveau, âge, année)` × la forme de la saison en cours (moyenne des notes, `p.sumRating/p.rated`, bornée à ±25 %, dès quatre matchs notés) — sans ce second terme la valeur ne bougeait qu'une fois l'an et le mercato d'hiver semblait figé. `valueAgeFactor()` est une **courbe continue** à trois pentes (×.93/an de 23 à 28, ×.85 jusqu'à 32, ×.75 ensuite) : l'ancienne fonction en escalier à quatre marches faisait perdre 13 % à un joueur qui progressait en passant 24 ans, valait exactement pareil à 26, 27 et 28 ans, puis chutait de 35 % d'un coup à 29. `developSquad()` fait aussi dériver `dev` entre 24 et 30 ans selon le temps de jeu et le staff : cette tranche d'âge était complètement figée.
- **La progression suit les performances**, pas seulement le temps de jeu : `developSquad()` calcule `perf = (moyenne des notes − 6,1) × min(1, matchs/12)`, borné à ±0,6, et l'ajoute à `dev` avec un coefficient par tranche d'âge (.025 avant 24 ans, .022 de 24 à 30, .018 après 31). Le centre 6,1 est mesuré : sur 228 saisons simulées, médiane 6,13, dixième centile 5,63, quatre-vingt-dixième 6,52. Effet mesuré sur cinq saisons à temps de jeu égal — un jeune de 21 ans gagne **+10, +15 ou +20** de niveau selon qu'il tourne à 5,6, 6,1 ou 6,6 ; un joueur de 27 ans perd **−10, −6 ou −3**. `devNotes` nomme les joueurs dont la saison a fait la différence, dans un sens comme dans l'autre.
- Mercato d'hiver : ouvert par `coachAfterPhase()` quand `state.phase===2` et `eraHasWinterMercato(state.year)` (à partir de 2000). Son enveloppe est les restes de l'été **plus 25 % du budget du club** — sans ce rappel, un été dépensé le rendait vide donc invisible. Une crise de pression à la phase 2 repasse par `coachAfterPhase()` (`next:'afterPhase'`) pour ne pas le sauter.
- Roulette : `coachChooseRoulette()` laisse toujours une suite. `state.rouletteEcho` ({icon,label,short,delta,seasons}) s'ajoute à `coachBonus()` et s'use d'une saison à chaque `coachEndSeason()`. `state.rouletteFate` (`exclusive` ou `exile`, défini par `fate` dans `COACH_ROULETTES`) contraint `generateCoachOffers()` et `accessibleTiers()` ; l'exclusivité fait signer dans le club de l'émir (objectif 1er, +10 de pression par saison) puis `coachFateProtects()` empêche tout licenciement, l'exil fait rompre le contrat d'un club de l'élite et se lève sur un titre ou une coupe deux saisons après.
- Un carrefour par phase : `coachPlayPhase()` / `playerPlayPhase()` appellent `coachDrawPhaseEvent()` / `playerDrawPhaseEvent()`, qui construisent **un seul sac pondéré** (dilemmes dont la jauge est sous 40, carrefours, incidents, événements de vie) et tirent via `weightedDraw()` ; `state.recentEvents` (dix derniers) évite les répétitions. La phase 0 est toujours un carrefour de reprise. L'intersaison ne tire plus d'événement : elle garde la roulette, les graines et les offres.
- Carrefours : `COACH_CROSSROADS` / `PLAYER_CROSSROADS` (content.js) sont des situations `{id,icon,title,text,phase?,menu:[3 clés]}` dont le `menu` renvoie à `FOCUS_AREAS` (coach.js) / `PFOCUS_AREAS` (player.js). `coachChooseCrossroad()` applique `focusScaled(gain,read,.7)` au chantier choisi et `focusScaled(loss,read,.65)` aux deux autres. `focusScaled()` applique des rendements décroissants aux gains et amortit les pertes près du bas, pour que rien ne tende vers 0 ni vers 100. `renderCrossroad()` dans `ui.js` les affiche comme n'importe quel événement.
- La jauge `proches` (coach) et `entourage` (joueur·euse) amortissent ou amplifient les montées de pression dans `coachApplyEffects` ; l'usure annuelle de `proches` dans `coachEndSeason()` est proportionnelle à son niveau, pour qu'une longue carrière abîme le foyer sans l'effacer. Projections : `coachProject(k,v,base)` / `playerProject(k,v)` renvoient `{cur,next}` (et `as` quand l'effet vise une autre jauge que son nom, comme `reputation` → supporters) ; `coachApplyEffects` / `playerApplyEffects` **appliquent via ces mêmes fonctions**, donc l'affichage ne peut pas diverger du moteur, et `tests/simulate.js` l'assert à chaque événement. `coachApplyEffects` fige `base={proches}` au début du lot pour que l'amorti de la pression ne dépende pas de l'ordre des clés. Côté écran, `effectChips()` montre `43→54`, `effectInline()` la même chose en une ligne pour les renoncements, et `stateTable()` liste sous les choix l'état des indicateurs touchés. `renderCrossroad()` calcule les effets avec `focusScaled(...,.7/.65)`, exactement comme `coachChooseCrossroad()`. Chaque option d'événement affiche son coût via `effectChips()` dans `ui.js` ; un choix peut porter une `seed` que `plantSeed()` range dans `state.seeds` et que `coachRipeSeed()` fait germer deux ou trois saisons plus tard.
- Interface : les polices sont chargées par `<link>` dans `index.html` (pas d'`@import`). Sous 900 px, la dernière `.btn-row` d'une carte qui contient un bouton principal devient collante (`position:sticky`), la barre latérale est repliée dans `<details class="side-fold">` (état retenu par `applySideFold()` dans `ui.js`) et les colonnes âge et saison du tableau de compo sont masquées.
- Argent interne en « millions de 2015 », affiché via `money(v, year)` (francs avant 2002, échelle d'époque).

## Conventions
- Pas de dépendance ni d'outil de build : `vercel.json` et `.github/workflows/pages.yml` copient simplement les fichiers.
- Textes en français avec écriture inclusive (entraîneur·euse, joueur·euse).
- Chaque chiffre affiché doit avoir une conséquence visible en jeu (retour du propriétaire après la version 1).
- **Les comptes rendus sont courts, mais ils expliquent** (le propriétaire, 30/09/2026 : « il y a
  trop de blabla et trop d'explications, je veux que tu sois plus synthétique quand tu as fini tes
  productions », puis : « tu peux expliquer de manière concise »). Quand un lot est livré : le lien,
  ce qui change et **pourquoi, en une phrase chacun**, les chiffres qui comptent, ce qui reste à
  décider. Ce qu'on coupe, ce n'est pas l'explication, c'est ce qui l'entoure : le récit du
  raisonnement, les fausses pistes, la reformulation de ce qu'il vient de dire, et les tableaux qui
  n'appuient aucune décision. Le détail va dans ce fichier et dans la description de la pull
  request.

## Vérifier
- Syntaxe : `for f in *.js; do node -e "new Function(require('fs').readFileSync('$f','utf8'))"; done`
- Simulation complète des deux modes : `node tests/simulate.js` (Chromium headless via playwright-core). Doit finir par `ERRORS: none`. Les lignes par carrière servent à juger l'équilibrage (licenciements, titres, arnaques, écart de force `gap`).
