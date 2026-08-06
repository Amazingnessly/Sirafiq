# Roadmap de développement

## Règle de réalisation

Chaque lot doit produire un parcours vertical testable sur iPad. Une fonction visuellement présente mais non utilisable n’est pas considérée comme livrée.

## Lot 0 — Assainissement du dépôt

- structure réelle des fichiers ;
- page de diagnostic ;
- gestion globale des erreurs ;
- manifeste PWA ;
- service worker ;
- version visible dans les réglages ;
- journal local minimal ;
- tests de démarrage.

**Sortie attendue :** Sirāfiq se charge sans erreur en ligne et hors ligne.

## Lot 1 — Import et persistance

- sélecteur Fichiers et Photos ;
- import texte, PDF, image et audio ;
- aperçu ;
- IndexedDB ;
- détection de doublons ;
- suppression avec confirmation ;
- contrôle après redémarrage.

**Sortie attendue :** un support importé reste présent après fermeture.

## Lot 2 — Enregistrement vocal

- demande d’autorisation explicite ;
- MediaRecorder ;
- solution de secours WAV ;
- pause et reprise ;
- durée et forme d’onde ;
- réécoute ;
- bibliothèque ;
- export d’un vocal ;
- alertes de stockage.

**Sortie attendue :** un vocal peut être enregistré, lu et retrouvé après redémarrage.

## Lot 3 — Contenus, passages et séance

- création d’un contenu ;
- découpage en passages ;
- états de maîtrise ;
- planification locale ;
- séance du jour ;
- reprise exacte ;
- bilan et prochaine révision.

**Sortie attendue :** un passage suit un cycle complet d’apprentissage et de révision.

## Lot 4 — Exercices de mémorisation

- lecture fragmentée ;
- masquage progressif ;
- révélation ciblée ;
- restitution sans texte ;
- restitution vocale ;
- auto-évaluation.

**Sortie attendue :** les résultats modifient réellement les priorités futures.

## Lot 5 — Mindmaps dynamiques

- création manuelle ;
- génération structurée depuis un texte ;
- génération depuis une sélection ;
- validation des nœuds ;
- lien source ;
- zoom, déplacement et repli ;
- mode focus ;
- exercices de révélation ;
- vue exploration.

**Sortie attendue :** une carte peut servir à naviguer, apprendre et enregistrer une restitution.

## Lot 6 — Prononciation française

- bibliothèque de sons et contrastes ;
- écouter et répéter ;
- syllabes, mots, phrases ;
- lecture par groupes de sens ;
- auto-évaluation manuelle ;
- vocaux associés.

## Lot 7 — Écriture

- moteur de tracé vectoriel ;
- démonstration animée ;
- repassage ;
- copie ;
- écriture autonome ;
- séries de régularité ;
- support stylet tiers et doigt.

## Lot 8 — Sauvegarde, accessibilité et finition

- export complet ;
- restauration sans écrasement silencieux ;
- avertissements de stockage ;
- réduction des animations ;
- navigation clavier ;
- contraste ;
- tests iPhone et iPad ;
- finition visuelle premium.

## Ce qui n’entre pas dans la V1

- synchronisation automatique entre appareils ;
- compte utilisateur ;
- serveur distant ;
- analyse automatique de la qualité de prononciation ;
- OCR automatique de tous les PDF et images ;
- génération sémantique non vérifiable ;
- collaboration ou partage social.
