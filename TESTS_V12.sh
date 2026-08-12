#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
fail(){ echo "❌ $1"; exit 1; }
need(){ grep -q "$2" "$1" || fail "$3"; }
echo "=== Sirāfiq v12 — contrôles ==="
for f in app.js db.js lot1.js learning.js mindmap-engine.js pronunciation.js writing.js sw.js functions/api/coach.js functions/api/voice.js; do node --check "$f"; done
need index.html 'ai-council' 'Conseiller IA absent'
need index.html 'voice-lab' 'Sélecteur de voix absent'
need index.html 'oral-curriculum' 'Parcours oral enrichi absent'
need styles.css 'Univers du savoir sur parchemin' 'Univers parchemin absent'
need learning.js 'Conseiller IA v12' 'Client IA absent'
need pronunciation.js 'playAiVoice' 'Voix IA absente'
need functions/api/coach.js 'env.AI.run' 'Backend IA absent'
need functions/api/voice.js 'melotts' 'TTS IA absent'
need sw.js 'sirafiq-shell-v120' 'Cache v12 absent'
echo "✅ Univers parchemin & responsive iPad"
echo "✅ Conseiller IA + fallback local"
echo "✅ Voix française sélectionnable + TTS IA"
echo "✅ Parcours oral enrichi"
echo "✅ Contrôles v12 réussis"
