# Sirāfiq v10 — refonte profonde

Cette version ne cherche pas à ajouter une nouvelle couche de cartes sur la v9. Elle corrige la méthode de construction du produit.

## 1. Carte mentale reconstruite

- modèle de données séparé et testable (`mindmap-engine.js`)
- sélection tactile immédiate d'un nœud
- déplacement déclenché uniquement après un vrai mouvement du doigt/stylet
- création : centre → idée principale → sous-idée
- renommage, suppression, reparentage, dispositions radiale/arbre/libre
- sauvegarde locale et restauration
- test unitaire du parcours complet

## 2. Supports transformés en actions

Chaque carte de support propose désormais **Réviser** en plus de Ouvrir/Supprimer. Le bouton envoie le support directement au laboratoire de mémorisation et sélectionne le support concerné.

## 3. Accueil orienté séance

L'accueil met maintenant en avant un itinéraire de séance avec priorité, français oral et geste d'écriture. Les propositions sont alimentées par les données locales (révisions, pratiques, supports), sans inventer de score.

## 4. Français oral et écriture alimentent la Boussole

Après un exercice, l'utilisateur peut classer le point travaillé : À revoir / Fragile / Acquis / Maîtrisé. La prochaine révision est enregistrée localement et apparaît dans le programme.

## 5. Écriture enrichie

- parcours séparés français / arabe
- exercices multiples par étape
- familles de gestes et de lettres
- liaisons, mots, lignes, fluidité
- grand cahier multi-pages défilable conservé
- stylo, surligneur, gomme, couleurs, épaisseurs, papier, déplacer, annuler, ajouter une page

## 6. Refonte visuelle

- univers moderne du savoir en mouvement
- logo verrouillé inchangé
- palette Sirāfiq conservée
- plus de profondeur, hiérarchie, lumière rubis et cartes de travail
- aucun identifiant interne de design dans l'interface
- aucun symbole religieux ajouté à l'habillage

## Limites assumées

- Sirāfiq ne prétend toujours pas effectuer une notation phonétique automatique fiable. La comparaison audio et les repères pédagogiques restent explicites ; l'auto-évaluation alimente l'espacement.
- La génération automatique de carte exploite directement le texte fourni. L'extraction sémantique complète de tous les PDF n'est pas présentée comme une IA locale dans cette version.
