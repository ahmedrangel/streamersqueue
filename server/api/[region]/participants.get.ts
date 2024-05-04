import { controls } from "~/utils/helpers";

export default defineEventHandler(async (event) => {
  const region = (getRouterParams(event).region).toLowerCase() as string;
  if (import.meta.dev) {
    return await $fetch(`${process.env.WORKER}/${region}/participants`, {
      parseResponse: JSON.parse
    }).catch(() => null);
  }

  const DB = process.env.PARTICIPANTS as any;
  const { results } = await DB.prepare("SELECT p.riot_name, p.riot_tag, p.is_ingame, p.wins, p.losses, p.lp, p.elo, p.tier, p.lol_picture, p.lol_region, p.position, p.position_change, s.twitch_login, s.twitch_display, s.twitch_is_live, s.twitch_picture, s.instagram, s.twitter FROM participants as p INNER JOIN socials as s ON p.puuid = s.puuid WHERE p.lol_region = ?")
    .bind(region).all();

  const control = await DB.prepare("SELECT last_updated FROM control WHERE id = ?").bind(controls[region]).first();

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
