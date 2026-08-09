#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo "=== Sirāfiq v5 : contrôles ==="
for f in app.js db.js lot1.js writing.js pronunciation.js learning.js sw.js; do
  node --check "$f"
done

grep -q 'Réviser avec envie' index.html
grep -q 'learning.js?v=5' index.html
grep -q 'sirafiq-shell-v5' sw.js
grep -q 'db.js?v=5' app.js

echo "✅ Contrôles v5 réussis"
