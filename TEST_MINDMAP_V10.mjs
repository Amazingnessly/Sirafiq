import assert from 'node:assert/strict';
import { createMindMapModel } from './mindmap-engine.js';

const map = createMindMapModel();
const root = map.reset('Idée centrale');
assert.equal(root.kind, 'root');
assert.equal(map.all().length, 1);

const b1 = map.add({ label: 'Idée 1', parentId: root.id });
const b2 = map.add({ label: 'Idée 2', parentId: root.id });
const child = map.add({ label: 'Sous-idée', parentId: b1.id });
assert.equal(map.all().length, 4);
assert.equal(map.get(child.id).parentId, b1.id);

assert.equal(map.rename(b1.id, 'Idée principale'), true);
assert.equal(map.get(b1.id).label, 'Idée principale');

assert.equal(map.remove(b1.id, { reparentChildren: true }), true);
assert.equal(map.get(child.id).parentId, root.id);
assert.equal(map.all().length, 3);
assert.equal(map.remove(root.id), false);

assert.throws(() => map.add({ label: 'Autre centre', kind: 'root' }));

const exported = map.all();
const restored = createMindMapModel(exported);
assert.equal(restored.all().length, exported.length);
assert.equal(restored.root().label, 'Idée centrale');
assert.equal(restored.get(child.id).parentId, root.id);

console.log('✅ Moteur carte mentale v10 : création → branche → sous-idée → renommage → suppression/reparentage → restauration');
