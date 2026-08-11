export function createMindMapModel(seed = null) {
  let counter = 0;
  const nodes = new Map();

  function nextId() { counter += 1; return `n${counter}`; }
  function has(id) { return nodes.has(String(id)); }
  function get(id) { return nodes.get(String(id)) || null; }
  function all() { return [...nodes.values()].map(n => ({ ...n })); }
  function root() { return [...nodes.values()].find(n => n.kind === 'root') || null; }

  function add({ id = null, label = 'Nouvelle idée', parentId = '', kind = 'branch', tone = '-1' } = {}) {
    const finalId = id ? String(id) : nextId();
    if (nodes.has(finalId)) throw new Error(`Nœud déjà présent: ${finalId}`);
    if (kind === 'root' && root()) throw new Error('Une carte ne peut avoir qu’un seul centre.');
    if (kind !== 'root' && parentId && !nodes.has(String(parentId))) throw new Error('Parent introuvable.');
    nodes.set(finalId, { id: finalId, label: String(label || 'Nouvelle idée'), parentId: kind === 'root' ? '' : String(parentId || ''), kind, tone: String(tone) });
    const numeric = Number(finalId.replace(/\D/g, '')) || 0; counter = Math.max(counter, numeric);
    return { ...nodes.get(finalId) };
  }

  function rename(id, label) {
    const node = get(id); if (!node) return false;
    const next = String(label || '').trim(); if (!next) return false;
    node.label = next; return true;
  }

  function remove(id, { reparentChildren = true } = {}) {
    const node = get(id); if (!node || node.kind === 'root') return false;
    const parentId = node.parentId;
    if (reparentChildren) {
      nodes.forEach(child => { if (child.parentId === node.id) child.parentId = parentId; });
    } else {
      [...nodes.values()].filter(child => child.parentId === node.id).forEach(child => remove(child.id, { reparentChildren: false }));
    }
    nodes.delete(node.id); return true;
  }

  function reset(rootLabel = null) {
    nodes.clear(); counter = 0;
    if (rootLabel != null) return add({ label: rootLabel, kind: 'root' });
    return null;
  }

  function importNodes(items = []) {
    nodes.clear(); counter = 0;
    const roots = items.filter(x => x.root || x.kind === 'root');
    if (roots.length > 1) throw new Error('Plusieurs centres détectés.');
    const ordered = [...roots, ...items.filter(x => !(x.root || x.kind === 'root'))];
    ordered.forEach(item => add({ id: item.id, label: item.label, parentId: item.parentId || '', kind: item.root || item.kind === 'root' ? 'root' : 'branch', tone: item.tone ?? '-1' }));
    return all();
  }

  if (Array.isArray(seed) && seed.length) importNodes(seed);
  return { add, rename, remove, reset, importNodes, get, has, all, root };
}
