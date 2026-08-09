# Sirāfiq — socle stabilisé v2

Cette version distingue les fonctions réellement disponibles des fonctions pédagogiques encore à construire.

## Fonctionnel dans cette version

- navigation Accueil / Mémoriser / Prononcer / Écrire / Progrès ;
- diagnostic de compatibilité et stockage local IndexedDB ;
- import local de PDF, images, textes, documents et audio ;
- bibliothèque avec recherche, filtre, aperçu et suppression confirmée ;
- enregistreur microphone avec pause, reprise, arrêt, réécoute, conservation locale et suppression confirmée ;
- surface d’écriture au doigt ou au stylet, annulation, effacement confirmé, sauvegarde locale et galerie ;
- compteurs locaux dans Progrès ;
- PWA et cache hors ligne du socle applicatif ;
- aucune donnée envoyée à un serveur applicatif, aucun compte ni cloud.

## Pas encore implémenté

Les moteurs pédagogiques avancés de mémorisation, répétition espacée, prononciation guidée, cursus d’écriture et mindmaps ne sont pas présentés ici comme déjà fonctionnels.

## Déploiement

Le projet est statique. Après remplacement des fichiers du dépôt et un push sur `main`, Cloudflare Pages peut redéployer automatiquement le site connecté au dépôt.
