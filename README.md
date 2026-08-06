# Sirāfiq

Sirāfiq est un projet de PWA personnelle pour iPhone et iPad, centré sur la révision quotidienne, la mémorisation, les mindmaps dynamiques, l’enregistrement vocal, la prononciation et l’écriture.

## État actuel du dépôt

Ce dépôt contient désormais le **cahier d’architecture officiel** et les décisions produit validées. Le code applicatif présent dans l’ancienne archive n’est pas une version fonctionnelle complète : plusieurs ressources auxquelles `index.html` fait référence manquent encore. Il ne faut donc pas considérer cette branche comme une version prête à l’usage.

Le prochain développement doit commencer par le lot 0, puis les lots 1 et 2 :

1. assainissement du socle PWA ;
2. import réel et persistance locale ;
3. enregistrement vocal et bibliothèque.

Aucune finition secondaire ne doit passer avant la réussite de ces parcours sur Safari iPad.

## Documentation

- [Architecture fonctionnelle](docs/ARCHITECTURE.md)
- [Modèle de données](docs/MODELE_DONNEES.md)
- [Parcours utilisateur](docs/PARCOURS_UTILISATEUR.md)
- [Spécification des mindmaps](docs/SPEC_MINDMAPS.md)
- [Roadmap](docs/ROADMAP.md)
- [Tests d’acceptation](docs/TESTS_ACCEPTATION.md)
- [Décisions verrouillées](docs/DECISIONS_VERROUILLEES.md)
- [État technique du dépôt](STATUS_TECHNIQUE.md)
- [Exercices validés](EXERCICES_VALIDES.md)

## Principes non négociables

- texte original préservé ;
- données locales et hors ligne ;
- aucun compte ;
- aucune suppression automatique des vocaux ;
- mindmaps reliées aux extraits sources ;
- aucun texte à trous ;
- aucune remise en ordre de fragments ;
- aucune interprétation automatique du Coran ;
- interface dynamique, rigoureuse, attrayante et non infantile.

## Méthode de développement

Chaque fonctionnalité doit être livrée sous forme de parcours vertical testable : action utilisateur, stockage, reprise après fermeture, gestion des erreurs et test sur iPad. Une interface qui affiche un bouton sans fournir le parcours complet n’est pas une fonctionnalité terminée.
