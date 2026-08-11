#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
echo "=== Installation / validation Sirāfiq v9 ==="
bash TESTS_V9.sh
printf '%s\n' 'v9.0' > VERSION
echo "✅ Sirāfiq v9 prêt à être commité"
