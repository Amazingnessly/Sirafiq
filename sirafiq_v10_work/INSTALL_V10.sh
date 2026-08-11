#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
chmod +x TESTS_V10.sh
./TESTS_V10.sh
printf '\n✅ Sirāfiq v10 installé dans le dépôt de travail.\n'
printf 'Étape suivante : git add -A && git commit -m "Sirafiq v10 refonte profonde" && git push origin main\n'
