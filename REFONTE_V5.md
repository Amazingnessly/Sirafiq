# Sirāfiq v5 — Refonte globale du socle pédagogique

## Objectif
Transformer l'accueil technique en tableau de bord de révision, sans casser les fonctions validées en v4 (PDF multipage, stockage local, tracé, enregistrement audio, suppressions).

## Changements fonctionnels
- Accueil entièrement repensé autour d'une séance courte et de huit espaces d'apprentissage.
- Diagnostic relégué à l'icône technique de la barre supérieure.
- Métriques de séance alimentées par les données locales existantes.
- Parcours Écriture française en 6 étapes : gestes, lettres, liaisons, mots, phrases, fluidité.
- Parcours Prononciation française en 5 étapes : sons, contrastes, rythme, enchaînements, expression.
- Hubs dédiés Qurʾān et vocabulaire arabe, reliés aux catégories de la bibliothèque.
- Première carte mentale réellement fonctionnelle à partir d'un texte : génération locale déterministe + nœuds déplaçables au doigt/stylet.
- Cache PWA versionné v5 afin d'éviter le mélange avec les scripts précédents.

## Principes pédagogiques
- Écriture : progression du geste vers régularité, vitesse et fluidité.
- Prononciation : intelligibilité, articulation des sons et prosodie, sans viser artificiellement un accent natif.
- Mémorisation : rappel actif avant vérification, puis retours espacés.

## Limites volontairement explicites
- L'analyse phonème par phonème n'est pas simulée : le navigateur seul ne fournit pas une mesure phonétique fiable.
- L'espace Qurʾān est prêt à recevoir le support fourni par l'utilisateur ; aucune altération automatique du texte source n'est appliquée.
- Le vocabulaire arabe est préparé comme espace dédié mais le moteur complet de cartes/SRS reste un lot fonctionnel séparé.
- La carte mentale v5 structure uniquement le texte fourni ; elle ne prétend pas produire une analyse sémantique par IA.
