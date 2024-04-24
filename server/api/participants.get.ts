export default defineEventHandler(async () => {
  if (import.meta.dev) {
    return await $fetch(process.env.WORKER + "/participants", {
      parseResponse: JSON.parse
    }).catch(() => null);
  }

  const DB = process.env.PARTICIPANTS as any;
  const participants = await DB.prepare("SELECT * FROM participants").all();
  const socials = await DB.prepare("SELECT * FROM socials").all();
  const results = participants.results.map((p: Record<string, any>) => {
    const socials_participants = socials.results.filter((s: Record<string, any>) => s.puuid === p.puuid)[0];
    return { ...p, ...socials_participants };
  });

  const control = await DB.prepare("SELECT last_updated FROM control WHERE id = ?").bind(1).first();

  const sorted = results.sort((a: Record<string, number>, b: Record<string, number>) => {
    if (!a.position || !b.position) {
      if (!a.position) return 1; // Colocar a 'a' al final
      if (!b.position) return -1; // Colocar a 'b' al final
    }
    return a.position - b.position;
  });

  const data = { participants: sorted, last_updated: control.last_updated };
  return data;
});
