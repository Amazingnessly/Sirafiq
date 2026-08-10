#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
echo "=== Sirāfiq v7.1 — contrôles ==="
for f in app.js db.js lot1.js writing.js pronunciation.js learning.js sw.js; do
  node --check "$f"
done
grep -q 'styles.css?v=71' index.html
grep -q 'learning.js?v=71' index.html
grep -q 'sirafiq-shell-v71' sw.js
grep -q 'sw.js?v=71' app.js
grep -q 'grid-template-columns: repeat(6' styles.css
grep -q 'reviewDueMetric' index.html
grep -q 'refreshLearningProgress' learning.js
echo "✅ Contrôles v7.1 réussis"
