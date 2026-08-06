# État technique du dépôt

## Contrôle effectué

Le dossier a été inspecté avant la formalisation de l’architecture.

`index.html` référence actuellement les ressources suivantes :

- `manifest.webmanifest` ;
- `assets/apple-touch-icon.png` ;
- `assets/icon-192.png` ;
- `assets/logo-locked.png` ;
- `styles.css` ;
- `app.js`.

Ces ressources ne sont pas présentes dans l’archive contrôlée. Dans cet état, la page ne peut pas charger l’application prévue.

## Conséquence

L’ancienne archive ne doit pas être présentée comme une PWA fonctionnelle ou prête au déploiement. Les documents d’architecture sont exploitables, mais le socle applicatif doit être reconstruit et testé.

## Prochaine étape technique

Créer une branche de développement pour le lot 0 avec :

- structure complète des fichiers ;
- manifeste valide ;
- icônes et logo verrouillé ;
- feuille de style ;
- point d’entrée JavaScript ;
- base IndexedDB versionnée ;
- service worker ;
- écran de diagnostic ;
- test de chargement en ligne et hors ligne.

Le lot 0 ne sera validé qu’après vérification sur l’URL GitHub Pages et sur l’icône ajoutée à l’écran d’accueil.
