# Spécification des mindmaps Sirāfiq

## Rôle pédagogique

La mindmap est à la fois :

- une représentation du contenu ;
- un outil de navigation ;
- un support de mémorisation ;
- un point d’accès aux passages, vocaux et exercices ;
- une vue de progression.

Elle ne doit jamais devenir une décoration autonome ni remplacer le texte source.

## Modes de création

### 1. Depuis tout le texte

Sirāfiq analyse uniquement la structure disponible : titres, sous-titres, paragraphes, phrases et groupes de sens. Le résultat est un brouillon modifiable.

### 2. Depuis une sélection

L’utilisateur choisit un passage. La carte ne contient aucun élément extérieur à cette sélection sans ajout manuel explicite.

### 3. Construction manuelle

L’utilisateur crée librement les branches et rattache chaque nœud à un extrait facultatif.

## Niveaux de détail

- **Essentiel** : thème central et branches principales ;
- **Équilibré** : branches et sous-branches ;
- **Détaillé** : unités plus fines, toujours vérifiables dans la source.

## Interaction

- toucher : sélectionner ;
- double toucher : ouvrir ou replier une branche ;
- pincement : zoomer ;
- glissement du fond : déplacer la carte ;
- glissement d’un nœud en mode édition : repositionner ;
- appui prolongé : ouvrir les actions ;
- mode focus : isoler visuellement une branche ;
- retour source : afficher l’extrait exact.

## Animations

Les animations servent à comprendre l’état de la carte :

- apparition séquentielle des branches ;
- transition douce lors du repli ;
- liaison rubis vers le nœud actif ;
- déplacement fluide vers la branche sélectionnée ;
- signal lumineux bref lors d’une validation ;
- interpolation douce du zoom.

Aucune animation permanente, rebondissante ou décorative.

## Exercices fondés sur la carte

- révélation progressive des branches ;
- restitution du centre vers les branches ;
- restitution d’une branche isolée ;
- lecture de la carte puis restitution sans aide ;
- enregistrement vocal associé à un nœud ou une branche ;
- comparaison entre deux restitutions.

Sont exclus :

- texte à trous ;
- remise en ordre de nœuds imposée comme exercice.

## Fidélité à la source

Chaque nœud généré conserve :

- l’identifiant de la source ;
- la position de début et de fin ;
- l’extrait exact ;
- un indicateur de validation utilisateur.

Un nœud dont le libellé est reformulé doit être marqué comme **intitulé utilisateur** ou **suggestion à valider**.

## Cas du Coran

Pour un passage coranique :

- le texte arabe fourni reste verrouillé ;
- la segmentation peut suivre les versets ou les portions définies par l’utilisateur ;
- les titres thématiques ne sont jamais générés automatiquement ;
- aucun résumé, commentaire, traduction, translittération, tafsīr ou interprétation n’est produit ;
- tout intitulé thématique doit être écrit et validé par l’utilisateur.

## Performance mobile

La V1 vise :

- 100 à 150 nœuds visibles maximum par carte ;
- rendu SVG ou Canvas optimisé ;
- regroupement des sous-arbres volumineux ;
- sauvegarde différée des déplacements ;
- respect de `prefers-reduced-motion` ;
- aucune dépendance à la pression ou à l’inclinaison du stylet.
