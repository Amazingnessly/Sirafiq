#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo "=== Sirāfiq v10 — contrôles structurels ==="

for f in app.js db.js lot1.js writing.js pronunciation.js learning.js mindmap-engine.js sw.js; do
  node --check "$f"
done
echo "✅ Syntaxe JavaScript"

node TEST_MINDMAP_V10.mjs

python3 - <<'PY'
from pathlib import Path
import re, sys
root=Path('.')
html=(root/'index.html').read_text(encoding='utf-8')
ids=set(re.findall(r'\bid=["\']([^"\']+)',html))
critical={
 'startTodaySession','todayAgenda','libraryImportButton','memorySupportSelect','memoryStartTechnique',
 'playPronunciationModel','recordStart','recordSave','writingDrillRail','writingCanvas','addWritingPage',
 'mindmapCanvas','mindmapScene','newManualMap','addMindNode','addMindChild','mindmapNodeLabel','renameMindNode',
 'saveMindmap','deleteMindNode','reviewDueMetric','agentProgressSummary'
}
missing=sorted(critical-ids)
if missing:
    raise SystemExit('IDs critiques absents: '+', '.join(missing))

for f in ['app.js','lot1.js','writing.js','pronunciation.js','learning.js']:
    js=(root/f).read_text(encoding='utf-8')
    refs=set(re.findall(r"\$\(['\"]([^'\"]+)['\"]\)",js))
    # currentTakeAudio est créé dynamiquement par pronunciation.js
    missing_refs=sorted((refs-ids)-{'currentTakeAudio'})
    if missing_refs:
        raise SystemExit(f'{f}: références DOM absentes: {missing_refs}')

assert './styles.css?v=100' in html
for script in ['app.js','lot1.js','writing.js','pronunciation.js','learning.js']:
    assert f'./{script}?v=100' in html, script

sw=(root/'sw.js').read_text(encoding='utf-8')
for asset in ['styles.css?v=100','learning.js?v=100','mindmap-engine.js?v=100']:
    assert asset in sw, asset

# aucune mention de l'ancien identifiant interne visuel
if 'F4-B' in html:
    raise SystemExit('F4-B ne doit jamais apparaître dans l’interface.')
print('✅ Liaisons HTML ↔ JavaScript critiques')
print('✅ Cache PWA v10')
print('✅ Aucun identifiant interne F4-B dans l’interface')
PY

EXPECTED_LOGO="3e58cd9b937b32f662b64a5d6e358e20ca60000fbc0cd43eb4d0c68409b0d750"
ACTUAL_LOGO="$(sha256sum assets/logo-sirafiq-verrouille.png | awk '{print $1}')"
[[ "$ACTUAL_LOGO" == "$EXPECTED_LOGO" ]]
echo "✅ Logo verrouillé inchangé"

grep -q 'data-review-support' lot1.js
grep -q 'sirafiq:review-support' learning.js
grep -q 'data-pron-mastery' index.html
grep -q 'data-writing-mastery' index.html
grep -q 'pointerdown' learning.js
grep -q 'Math.hypot(dx,dy)<7' learning.js
echo "✅ Parcours Réviser / auto-évaluation / carte tactile v10"

echo "✅ Contrôles v10 réussis"
