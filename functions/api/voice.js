export async function onRequestPost({ request, env }) {
  if (!env.AI) return Response.json({ error: "Binding Workers AI 'AI' non configuré" }, { status: 503 });
  const { text = '' } = await request.json().catch(() => ({}));
  if (!text.trim()) return Response.json({ error: 'Texte vide' }, { status: 400 });
  const result = await env.AI.run('@cf/myshell-ai/melotts', { prompt: text.slice(0,1200), lang: 'fr' });
  if (result instanceof Response) return result;
  if (result instanceof ArrayBuffer) return new Response(result, { headers: { 'content-type': 'audio/mpeg', 'cache-control': 'no-store' } });
  if (ArrayBuffer.isView(result)) return new Response(result.buffer, { headers: { 'content-type': 'audio/mpeg', 'cache-control': 'no-store' } });
  return new Response(result, { headers: { 'content-type': 'audio/mpeg', 'cache-control': 'no-store' } });
}
