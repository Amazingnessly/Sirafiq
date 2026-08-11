#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
echo "=== Sirāfiq v9 — contrôles ==="
for f in app.js db.js lot1.js writing.js pronunciation.js learning.js sw.js; do
  node --check "$f"
done
# Contrôles des moteurs demandés
grep -q 'id="memorySupportSelect"' index.html
grep -q 'data-memory-technique="recall"' index.html
grep -q 'id="playOralModel"' index.html
grep -q 'data-oral-stage="aisance"' index.html
grep -q 'data-writing-language="ar"' index.html
grep -q 'id="moveTool"' index.html
grep -q 'id="addWritingPage"' index.html
grep -q 'id="newManualMap"' index.html
grep -q 'id="generateMindmap"' index.html
grep -q 'id="agentProgressSummary"' index.html
grep -q "const DB_VERSION = 6" db.js
grep -q "sirafiq-shell-v90" sw.js
# Évite la regex lookbehind qui a une compatibilité Safari plus fragile.
if grep -R -n '(?<=' -- *.js >/dev/null; then
  echo "❌ Lookbehind JS détecté" >&2
  exit 1
fi
echo "✅ Contrôles v9 réussis"
