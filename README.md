# Sirāfiq — Lot 0 fonctionnel

Ce lot installe le socle réel de la PWA Sirāfiq :

- navigation responsive Accueil, Mémoriser, Prononcer, Écrire et Progrès ;
- manifeste installable ;
- service worker et cache hors ligne ;
- base IndexedDB locale ;
- écran de diagnostic ;
- identité visuelle rubis et logo verrouillé ;
- aucun import ou enregistrement simulé.

## État des fonctions

Le Lot 0 ne contient pas encore l’import de supports ni le véritable enregistreur. Ces fonctions appartiennent aux Lots 1 et 2. Les écrans les présentent explicitement comme planifiées.

## Déploiement GitHub Pages

Après avoir ajouté ces fichiers à la racine du dépôt :

1. ouvrir **Settings → Pages** ;
2. choisir **Deploy from a branch** ;
3. sélectionner `main` et `/(root)` ;
4. enregistrer.

## Données

Les diagnostics sont conservés uniquement dans IndexedDB sur l’appareil. Aucun compte, cloud ou suivi externe n’est utilisé.
