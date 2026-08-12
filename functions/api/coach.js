export async function onRequestPost({ request, env }) {
  if (!env.AI) return Response.json({ error: "Binding Workers AI 'AI' non configuré" }, { status: 503 });
  const data = await request.json().catch(() => ({}));
  const prompt = `Tu es le conseiller pédagogique de Sirāfiq. Tu aides à organiser des révisions à partir UNIQUEMENT des données fournies.
Principes: rappel actif avant relecture, espacement, pratique variée, petites unités, feedback après tentative. Pour le français oral: intelligibilité, articulation des sons, prosodie et parole pédagogique; ne jamais promettre un accent natif.
Réponds en JSON strict avec: title (court), reason (2 phrases max), steps (3 à 5 actions concrètes avec durée). Ne déduis jamais une maîtrise absente des données.
Données: ${JSON.stringify(data).slice(0,14000)}`;
  const out = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', { messages: [{ role: 'user', content: prompt }], max_tokens: 700, temperature: 0.25 });
  const raw = out?.response || out?.result?.response || '';
  let parsed; try { parsed = JSON.parse(String(raw).replace(/^```json\s*|\s*```$/g,'')); } catch { parsed = { title: 'Séance proposée par l’IA', reason: 'Plan généré à partir de vos données actuelles.', steps: String(raw).split(/\r?\n+/).filter(Boolean).slice(0,5) }; }
  return Response.json(parsed, { headers: { 'cache-control': 'no-store' } });
}
