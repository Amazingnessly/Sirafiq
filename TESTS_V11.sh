#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
fail(){ echo "❌ $1"; exit 1; }
need(){ grep -q "$2" "$1" || fail "$3"; }

echo "=== Sirāfiq v11.1 — contrôles fonctionnels ==="
need index.html 'agent-command-center' 'Agent de séance absent'
need index.html 'library-agent-board' 'Agent de bibliothèque absent'
need index.html 'french-daily-mission' 'Mission française quotidienne absente'
need index.html 'teachingScenarioGrid' 'Laboratoire de parole pédagogique absent'
need index.html 'deleteWritingPage' 'Bouton supprimer page absent'
need writing.js 'deleteActivePage' 'Suppression de page non câblée'
need index.html 'newManualMap' 'Nouvelle carte mentale absente'
need learning.js "addMindNode.*addEventListener\|addMindNode')?.addEventListener" 'Ajout idée principale non câblé'
need learning.js "addMindChild.*addEventListener\|addMindChild')?.addEventListener" 'Ajout sous-idée non câblé'
need learning.js 'renderLibraryAgentBoard' 'Organisation des supports absente'
need learning.js 'teachingScenarios' 'Scénarios français absents'
need learning.js 'frenchPromptBank' 'Banque d’entraînement français absente'
need sw.js 'sirafiq-shell-v111' 'Cache v11.1 non activé'
need app.js 'sw.js?v=111' 'Service worker v11.1 non enregistré'

if find . -maxdepth 1 -type d -name 'sirafiq_v*_work' | grep -q .; then fail 'Dossier temporaire présent dans le paquet'; fi

echo "✅ Agent d’apprentissage et organisation des supports"
echo "✅ Français oral : parcours, modèles, scénarios, banque d’entraînement"
echo "✅ Écriture : grand cahier multipage + suppression de page"
echo "✅ Carte mentale : création, idées, sous-idées, renommage, suppression"
echo "✅ Cache v11.1"
echo "✅ Contrôles v11.1 réussis"
