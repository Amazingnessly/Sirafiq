# Activer le conseiller IA et la voix IA de Sirāfiq v12

La v12 fonctionne sans IA grâce à la Boussole locale. Pour activer les fonctions IA :

1. Dans Cloudflare Dashboard, ouvrez le projet Pages Sirāfiq.
2. Ouvrez **Settings / Bindings** (le libellé peut être présenté sous Functions/Bindings selon l'interface).
3. Ajoutez un **Workers AI binding** nommé exactement `AI`.
4. Redéployez le projet.

Fonctions utilisées :
- `/api/coach` : construit une séance personnalisée à partir des métadonnées de vos supports et de votre historique. Si vous cochez l'autorisation, le texte du support sélectionné est envoyé temporairement pour analyse.
- `/api/voice` : génère une voix française avec MeloTTS.

Confidentialité : aucun contenu de support n'est envoyé à l'IA tant que la case d'autorisation du support n'est pas cochée. La Boussole locale, le stockage, l'écriture et les cartes mentales continuent de fonctionner sans binding IA.
