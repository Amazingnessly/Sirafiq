#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
echo "=== Sirāfiq v6 : contrôles ==="
for f in app.js db.js lot1.js writing.js pronunciation.js learning.js sw.js; do node --check "$f"; done
for f in index.html styles.css app.js db.js lot1.js writing.js pronunciation.js learning.js sw.js manifest.webmanifest; do test -s "$f"; done
echo "✅ Contrôles v6 réussis"
