#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
echo "=== Sirāfiq v11.1 — vérification ==="
for f in app.js db.js lot1.js learning.js mindmap-engine.js pronunciation.js writing.js sw.js; do
  node --check "$f"
done
bash ./TESTS_V11.sh
echo "✅ Sirāfiq v11.1 prêt"
