#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
chmod +x TESTS_V12.sh INSTALL_V12.sh
bash ./TESTS_V12.sh
echo "✅ Sirāfiq v12 prêt"
