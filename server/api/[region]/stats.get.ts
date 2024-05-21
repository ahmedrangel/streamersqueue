import { controls } from "~/utils/helpers";

export default defineEventHandler(async (event) => {
  const region = (getRouterParams(event).region).toLowerCase() as string;
  if (import.meta.dev) {
    return await $fetch<Record<string, any>>(`${process.env.WORKER}/${region}/stats`).catch(() => null);
  }

  const DB = process.env.PARTICIPANTS as any;
  const control = region === "all" ? "all" : controls[region] as string | number;
  const games = 10 as number;
  const kda_best = await DB.prepare(`
    SELECT
      p.riot_name, p.riot_tag, p.lol_picture, p.lol_region,
      s.twitch_login, s.twitch_display, s.twitch_picture, s.country_flag,
      (p.wins + p.losses) AS total_games,
      ROUND(AVG(h.kills), 2) AS avg_kills,
      ROUND(AVG(h.deaths), 2) AS avg_deaths,
      ROUND(AVG(h.assists), 2) AS avg_assists,
      CASE 
        WHEN AVG(h.deaths) = 0 THEN 'perfect'
        ELSE ROUND((AVG(h.kills) + AVG(h.assists)) / AVG(h.deaths), 2)
      END AS kda
    FROM participants AS p
    INNER JOIN history AS h ON p.puuid = h.puuid
    INNER JOIN socials AS s ON p.puuid = s.puuid
    WHERE h.is_remake = 0 ${control === "all" ? `AND total_games >= ${games}` : `AND p.control = ${control} AND total_games >= ${games}`}
    GROUP BY h.puuid
    ORDER BY kda DESC LIMIT 10
  `).all();

  const kda_worst = await DB.prepare(`
    SELECT
      p.riot_name, p.riot_tag, p.lol_picture, p.lol_region,
      s.twitch_login, s.twitch_display, s.twitch_picture, s.country_flag,
      (p.wins + p.losses) AS total_games,
      ROUND(AVG(h.kills), 2) AS avg_kills,
      ROUND(AVG(h.deaths), 2) AS avg_deaths,
      ROUND(AVG(h.assists), 2) AS avg_assists,
      CASE 
        WHEN AVG(h.deaths) = 0 THEN 'perfect'
        ELSE ROUND((AVG(h.kills) + AVG(h.assists)) / AVG(h.deaths), 2)
      END AS kda
    FROM participants AS p
    INNER JOIN history AS h ON p.puuid = h.puuid
    INNER JOIN socials AS s ON p.puuid = s.puuid
    WHERE h.is_remake = 0 ${control === "all" ? `AND total_games >= ${games}` : `AND p.control = ${control} AND total_games >= ${games}`}
    GROUP BY h.puuid
    ORDER BY kda ASC LIMIT 10
    `).all();

  const champion_winrates_best = await DB.prepare(`
    SELECT
      sq.riot_name, sq.riot_tag, sq.lol_region, sq.champion, sq.wins, sq.losses, sq.lol_picture,
      sq.twitch_login, sq.twitch_display, sq.twitch_picture, sq.country_flag,
      ROUND((CAST(sq.wins AS FLOAT) / (sq.wins + sq.losses) * 100), 2) AS winrate
    FROM (
      SELECT
        p.riot_name, p.riot_tag, p.lol_region, p.lol_picture,
        h.champion,
        s.twitch_login, s.twitch_display, s.twitch_picture, s.country_flag,
        SUM(CASE WHEN h.is_remake = 0 AND h.result = 1 THEN 1 ELSE 0 END) AS wins,
        SUM(CASE WHEN h.is_remake = 0 AND h.result = 0 THEN 1 ELSE 0 END) AS losses
      FROM history AS h
      INNER JOIN participants AS p ON h.puuid = p.puuid
      INNER JOIN socials AS s ON h.puuid = s.puuid
      ${control === "all" ? "" : `WHERE p.control = ${control}`}
      GROUP BY h.puuid, h.champion
    ) AS sq
    WHERE (sq.wins + sq.losses) >= ${games}
    ORDER BY winrate DESC
    LIMIT 10
    `).all();

  const champion_winrates_worst = await DB.prepare(`
    SELECT
      sq.riot_name, sq.riot_tag, sq.lol_region, sq.champion, sq.wins, sq.losses, sq.lol_picture,
      sq.twitch_login, sq.twitch_display, sq.twitch_picture, sq.country_flag,
      ROUND((CAST(sq.wins AS FLOAT) / (sq.wins + sq.losses) * 100), 2) AS winrate
    FROM (
      SELECT
        p.riot_name, p.riot_tag, p.lol_region, p.lol_picture,
        h.champion,
        s.twitch_login, s.twitch_display, s.twitch_picture, s.country_flag,
        SUM(CASE WHEN h.is_remake = 0 AND h.result = 1 THEN 1 ELSE 0 END) AS wins,
        SUM(CASE WHEN h.is_remake = 0 AND h.result = 0 THEN 1 ELSE 0 END) AS losses
      FROM history AS h
      INNER JOIN participants AS p ON h.puuid = p.puuid
      INNER JOIN socials AS s ON h.puuid = s.puuid
      ${control === "all" ? "" : `WHERE p.control = ${control}`}
      GROUP BY h.puuid, h.champion
    ) AS sq
    WHERE (sq.wins + sq.losses) >= ${games}
    ORDER BY winrate ASC
    LIMIT 10
    `).all();
  const response = {
    stats: {
      best: {
        kda: kda_best.results,
        player_champion_wr: champion_winrates_best.results,
      },
      worst: {
        kda: kda_worst.results,
        player_champion_wr: champion_winrates_worst.results,
      }
    },
    status_code: 200,
    status: "Stats",
  };
  return response;
});
