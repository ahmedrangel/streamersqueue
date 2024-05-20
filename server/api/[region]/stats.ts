import { controls } from "~/utils/helpers";

export default defineEventHandler(async (event) => {
  const region = (getRouterParams(event).region).toLowerCase() as string;
  if (import.meta.dev) {
    return await $fetch(`${process.env.WORKER}/${region}/stats`, {
      parseResponse: JSON.parse
    }).catch(() => null);
  }

  const DB = process.env.PARTICIPANTS as any;
  const control = region === "all" ? "all" : controls[region] as string | number;
  const games = "total_games >= 10" as string;
  const kda_best = await DB.prepare(
    `
    SELECT
      p.riot_name, p.riot_tag, p.lol_picture, p.lol_region,
      s.twitch_login, s.twitch_display, s.twitch_picture, s.country_flag,
      (p.wins + p.losses) AS total_games,
      ROUND(AVG(h.kills), 2) AS avg_kills,
      ROUND(AVG(h.deaths), 2) AS avg_deaths,
      ROUND(AVG(h.assists), 2) AS avg_assists,
      CASE 
        WHEN AVG(deaths) = 0 THEN 'perfect'
        ELSE ROUND((AVG(kills) + AVG(assists)) / AVG(deaths), 2)
      END AS kda
      FROM participants AS p
      INNER JOIN history AS h ON p.puuid = h.puuid
      INNER JOIN socials AS s ON p.puuid = s.puuid
      WHERE h.is_remake = 0 ${control === "all" ? `AND ${games}` : `AND p.control = ${control} AND ${games}`}
      GROUP BY h.puuid
      ORDER BY kda DESC LIMIT 10
    `).all();

  const kda_worst = await DB.prepare(
    `
      SELECT
        p.riot_name, p.riot_tag, p.lol_picture, p.lol_region,
        s.twitch_login, s.twitch_display, s.twitch_picture, s.country_flag,
        (p.wins + p.losses) AS total_games,
        ROUND(AVG(h.kills), 2) AS avg_kills,
        ROUND(AVG(h.deaths), 2) AS avg_deaths,
        ROUND(AVG(h.assists), 2) AS avg_assists,
        CASE 
          WHEN AVG(deaths) = 0 THEN 'perfect'
          ELSE ROUND((AVG(kills) + AVG(assists)) / AVG(deaths), 2)
        END AS kda
        FROM participants AS p
        INNER JOIN history AS h ON p.puuid = h.puuid
        INNER JOIN socials AS s ON p.puuid = s.puuid
        WHERE h.is_remake = 0 ${control === "all" ? `AND ${games}` : `AND p.control = ${control} AND ${games}`}
        GROUP BY h.puuid
        ORDER BY kda ASC LIMIT 10
      `).all();
  const response = {
    stats: {
      best: {
        kda: kda_best.results
      },
      worst: {
        kda: kda_worst.results
      }
    },
    status_code: 200,
    status: "Stats",
  };
  return response;
});
