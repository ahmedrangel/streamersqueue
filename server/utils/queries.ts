export const kda = async (DB: any, control: string | number, order: string) => {
  const games = 10;
  const o = order.toUpperCase() === "ASC" ? "ASC" : "DESC";
  return await DB.prepare(`
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
    ORDER BY kda ${o} LIMIT 10
  `).all();
};

export const playerChampionWR = async (DB: any, control: string | number, order: string) => {
  const games = 10;
  const o = order.toUpperCase() === "ASC" ? "ASC" : "DESC";
  return await DB.prepare(`
    SELECT
      sq.riot_name, sq.riot_tag, sq.lol_region, sq.champion, sq.wins, sq.losses, sq.lol_picture,
      sq.twitch_login, sq.twitch_display, sq.twitch_picture, sq.country_flag,
      ROUND((CAST(sq.wins AS FLOAT) / (sq.wins + sq.losses) * 100), 1) AS winrate
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
    ORDER BY winrate ${o}
    LIMIT 10
  `).all();
};

export const matchDuration = async (DB: any, control: string | number, order: string) => {
  const o = order.toUpperCase() === "ASC" ? "ASC" : "DESC";
  return await DB.prepare(`
    SELECT
      p.riot_name, p.riot_tag, p.lol_picture, p.lol_region,
      s.twitch_login, s.twitch_display, s.twitch_picture, s.country_flag,
      h.match_id, h.kills, h.deaths, h.assists, h.champion, h.result,
      m.date, m.duration
    FROM history as h
    INNER JOIN participants AS p ON h.puuid = p.puuid
    INNER JOIN matches AS m ON h.match_id = m.match_id
    INNER JOIN socials AS s ON h.puuid = s.puuid
    WHERE h.is_remake = 0 AND h.game_surrendered = 0 ${control === "all" ? "" : `AND p.control = ${control}`}
    GROUP BY h.puuid, h.match_id
    ORDER BY m.duration ${o} LIMIT 10
  `).all();
};

export const playerWR = async (DB: any, control: string | number, order: string) => {
  const o = order.toUpperCase() === "ASC" ? "ASC" : "DESC";
  const games = 10;
  return await DB.prepare(`
    SELECT
      p.riot_name, p.riot_tag, p.lol_picture, p.lol_region, p.wins, p.losses, p.elo, p.tier, p.lp,
      s.twitch_login, s.twitch_display, s.twitch_picture, s.country_flag,
      ROUND((CAST(p.wins AS FLOAT) / (p.wins + p.losses) * 100), 1) AS winrate
    FROM participants AS p
    INNER JOIN socials AS s ON p.puuid = s.puuid
    WHERE (p.wins + p.losses) >= ${games} ${control === "all" ? "" : `AND p.control = ${control}`}
    ORDER BY winrate ${o} LIMIT 10
  `).all();
};
