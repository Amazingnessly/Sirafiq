# État technique — stabilisation v2

## Problèmes trouvés dans l’archive auditée

- `writing.js` était vide (0 octet) alors que l’interface d’écriture était affichée ;
- le service worker ne mettait pas en cache `lot1.js` ni `writing.js` et utilisait encore un cache `lot0` ;
- l’écran Prononcer était un placeholder sans enregistreur ;
- plusieurs composants de la bibliothèque existaient sans styles adaptés ;
- l’écran Progrès ne reflétait pas l’activité réellement enregistrée ;
- la documentation ne correspondait plus au code du dépôt.

## Corrections v2

- base IndexedDB migrée en version 4 avec stores supports, enregistrements et tracés ;
- moteur d’écriture tactile/stylet réel ;
- enregistreur audio local réel ;
- visualiseur de supports ;
- progression locale synchronisée ;
- cache PWA versionné et cohérent ;
- interface responsive stabilisée.

## Contrôles exécutés

- syntaxe de tous les fichiers JavaScript : OK ;
- aucun ID HTML dupliqué ;
- toutes les références DOM critiques résolues ;
- parcours UI automatisé : navigation, diagnostic, import, aperçu support, écriture, sauvegarde tracé, enregistrement audio simulé, sauvegarde audio et compteurs : OK ;
- contrôle d’overflow aux largeurs 390, 768 et 1024 px : OK.

La permission microphone et le comportement du stylet doivent toujours être confirmés une fois sur l’iPad réel après déploiement, car un test automatisé ne remplace pas le matériel.
