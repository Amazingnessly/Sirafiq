#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
echo "=== Sirāfiq v7 — contrôles ==="
for f in app.js db.js lot1.js writing.js pronunciation.js learning.js sw.js; do
  node --check "$f"
done
grep -q 'styles.css?v=7' index.html
grep -q 'learning.js?v=7' index.html
grep -q 'writing.js?v=7' index.html
grep -q 'sirafiq-shell-v7' sw.js
grep -q "const DB_VERSION = 5" db.js
grep -q 'data-map-mode="manual"' index.html
grep -q 'data-mastery="solide"' index.html
grep -q 'id="toggleWritingBoard"' index.html
echo "✅ Contrôles v7 réussis"
