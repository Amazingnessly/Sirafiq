#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
echo "=== Sirāfiq v8 — contrôles ==="
for f in app.js db.js lot1.js writing.js pronunciation.js learning.js sw.js; do node --check "$f"; done
grep -q 'data-map-layout="radial"' index.html
grep -q 'data-writing-paper="grid"' index.html
grep -q 'french-stats' index.html
grep -q 'sirafiq-shell-v80' sw.js
grep -q 'Sirāfiq v8' REFONTE_V8.md
echo "✅ Contrôles v8 réussis"
