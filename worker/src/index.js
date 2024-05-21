import { IttyRouter } from "itty-router";
import JsResponse from "./response";
import JsonResponse from "./jsonResponse";
import twitchApi from "./apis/twitchApi";
import riotApi from "./apis/riotApi";
import { updateGeneralData } from "./crons/update-general-data";
import { resetPositionChange } from "./crons/reset-position-change";
import { controls, worker } from "./utils/helpers";

const router = IttyRouter();

router.post("/add", async (req, env) => {
  const _twitch = new twitchApi(env.TWITCH_CLIENT_ID, env.TWITCH_CLIENT_SECRET);
  const _riot = new riotApi(env.RIOT_KEY);
  try {
    const { riot_name, riot_tag, region, key, twitch, twitter, instagram, country_flag } = await req.json();
    const control = controls[region.toLowerCase()];
    const route = _riot.route(region);
    const cluster = _riot.cluster(region);
    console.info(riot_name, riot_tag, region, key, twitch, twitter, instagram);
    if (key !== env.POST_KEY) return new JsonResponse({ status: "Forbidden", status_code: 403 });
    if (!riot_name || !riot_tag || !twitch) return new JsonResponse({ status: "Bad Request", status_code: 400 });
    // League of legends
    const { puuid } = await _riot.getAccountByRiotID(riot_name, riot_tag, cluster);
    const summoner = await _riot.getSummonerByPuuid(puuid, route);
    const lol_picture = summoner.profileIconId;
    const summoner_id = summoner.id;
    // Twitch
    const twitch_data = await _twitch.getUserByName(twitch);
    const twitch_id = twitch_data.id;
    const twitch_login = twitch_data.login;
    const twitch_display = twitch_data.display_name;
    const twitch_picture = twitch_data.profile_image_url.replace("https://static-cdn.jtvnw.net/","");
    const account = { puuid, summoner_id, riot_name, riot_tag, lol_picture, control };
    const socials = { twitch_login, twitch_display, twitch_picture, twitter, instagram, twitch_id, country_flag };
    const { count } = await env.PARTICIPANTS.prepare("SELECT COUNT(*) as count FROM participants WHERE control = ? ").bind(control).first();
    // Add DB
    await env.PARTICIPANTS.prepare(
      `
        INSERT OR IGNORE INTO participants (puuid, summoner_id, riot_name, riot_tag, lol_picture, control, lol_region, position)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
    ).bind(puuid, summoner_id, riot_name, riot_tag, lol_picture, control, region.toLowerCase(), count + 1).run();
    await env.PARTICIPANTS.prepare(
      `
        INSERT OR IGNORE INTO socials (puuid, twitch_login, twitch_display, twitch_picture, twitter, instagram, twitch_id, country_flag)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
    ).bind(puuid, twitch_login, twitch_display, twitch_picture, twitter ? twitter : "", instagram ? instagram : "", twitch_id, country_flag ? country_flag : "").run();
    return new JsonResponse({
      participant: { ...account, ...socials },
      status: "Added",
      status_code: 200
    });
  } catch (err) {
    console.info(err);
    return new JsonResponse({ status: "Bad Request", status_code: 400 });
  }
});

router.get("/:region/renewal", async (req, env) => {
  const region = req.params.region.toLowerCase();
  const control = controls[region];
  const defined_cooldown = 240; // in seconds
  // Start renewing
  try {
    await env.PARTICIPANTS.prepare("UPDATE control SET renewing = ? WHERE id = ? AND renewing = ?").bind(1, control, 0).run();
    const { last_updated } = await env.PARTICIPANTS.prepare("SELECT last_updated FROM control WHERE id = ?").bind(control).first();
    const date = new Date(last_updated);
    const now = new Date();
    const remaining = Math.ceil(((defined_cooldown * 1000) - (now - date)) / 1000);
    // Error if not passed 2 minutes from last updated
    if (now - date < (defined_cooldown * 1000)) {
      await env.PARTICIPANTS.prepare("UPDATE control SET renewing = ? WHERE id = ? AND renewing = ?").bind(0, control, 1).run();
      return new JsonResponse({ status: `Try again in ${remaining} seconds.`, status_code: 429, control });
    };
    await updateGeneralData(env, control);
    // End renewing
    await env.PARTICIPANTS.prepare("UPDATE control SET renewing = ? WHERE id = ? AND renewing = ?").bind(0, control, 1).run();
    return new JsonResponse({ status: "Renewed", status_code: 200, control });
  } catch (err) {
    await env.PARTICIPANTS.prepare("UPDATE control SET renewing = ? WHERE id = ? AND renewing = ?").bind(0, control, 1).run();
    return new JsonResponse({ status: String(err), status_code: 400, control });
  }
});

router.post("/reset-position-change", async (req, env) => {
  try {
    const { key } = await req.json();
    if (key !== env.POST_KEY) return new JsonResponse({ status: "Forbidden", status_code: 403 });
    await env.PARTICIPANTS.prepare("UPDATE participants SET position_change = 0 WHERE position_change IS NOT 0").run();
    return new JsResponse("Reseted");
  } catch (err) {
    console.info(err);
    return new JsonResponse({ status: "Bad Request", status_code: 400 });
  }
});

router.get("/:region/participants", async (req, env) => {
  const region = req.params.region.toLowerCase();
  const DB = env.PARTICIPANTS;
  const { results } = await DB.prepare("SELECT p.riot_name, p.riot_tag, p.is_ingame, p.wins, p.losses, p.lp, p.elo, p.tier, p.lol_picture, p.lol_region, p.position, p.position_change, s.twitch_login, s.twitch_display, s.twitch_is_live, s.twitch_picture, s.instagram, s.twitter, s.country_flag FROM participants as p INNER JOIN socials as s ON p.puuid = s.puuid WHERE p.lol_region = ?")
    .bind(region).all();

  const control = await DB.prepare("SELECT last_updated FROM control WHERE id = ?").bind(controls[region]).first();

  const sorted = results.sort((a, b) => {
    if (!a.position || !b.position) {
      if (!a.position) return 1; // Colocar a 'a' al final
      if (!b.position) return -1; // Colocar a 'b' al final
    }
    return a.position - b.position;
  });

  let i = 0;
  for (const participant of sorted) {
    participant.raw_position = ++i;
    participant.is_ingame = Boolean(participant.is_ingame);
    participant.twitch_is_live = Boolean(participant.twitch_is_live);
  }

  const data = { participants: sorted, last_updated: control.last_updated };

  return new JsonResponse(data);
});

router.get("/:region/renewal-status", async (req, env) => {
  const region = req.params.region.toLowerCase();
  const control = controls[region];
  const { renewing, last_updated } = await env.PARTICIPANTS.prepare("SELECT renewing, last_updated FROM control WHERE id = ?").bind(control).first();
  return new JsonResponse({ renewing: Boolean(renewing), last_updated, status_code: 200, status: "Renewal status", control });
});

router.post("/reset-position-change", async (req, env) => {
  try {
    const { key } = await req.json();
    if (key !== env.POST_KEY) return new JsonResponse({ status: "Forbidden", status_code: 403 });
    await resetPositionChange(env);
    return new JsResponse("Reseted");
  } catch (err) {
    console.info(err);
    return new JsonResponse({ status: "Bad Request", status_code: 400 });
  }
});

router.post("/tails/revert-renewal", async (req, env) => {
  const data = await req.json();
  const url = data.event.request.url;
  const parts = new URL(url).pathname.split("/");
  const lastPart = parts[parts.length - 1];
  const control = controls[parts[parts.length - 2]];
  try {
    if (data.outcome === "canceled" && lastPart === "renewal") {
      await env.PARTICIPANTS.prepare("UPDATE control SET renewing = ? WHERE id = ? AND renewing = ?").bind(0, control, 1).run();
    }
    return new JsonResponse(data);
  } catch (err) {
    return new JsResponse(err);
  }
});

router.get("/:region/stats", async (req, env) => {
  const region = req.params.region.toLowerCase();
  const control = region === "all" ? "all" : controls[region];
  const DB = env.PARTICIPANTS;
  const games = 10;
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
  return new JsonResponse(response);
});

/*
router.get("/sync-history-champions", async (req, env) => {
  const DB = env.PARTICIPANTS;
  const { results } = await DB.prepare("SELECT h.puuid, h.match_id, p.lol_region FROM history AS h INNER JOIN participants AS p ON h.puuid = p.puuid WHERE champion IS NULL LIMIT 500").all();
  const _riot = new riotApi(env.RIOT_KEY);
  for (const h of results) {
    const cluster = _riot.cluster(h.lol_region);
    const match_data = await _riot.getMatchById(h.match_id, cluster);
    const participant_data = match_data?.info?.participants?.filter(item => item?.puuid === h?.puuid)[0];
    await DB.prepare("UPDATE history SET champion = ? WHERE puuid = ? AND match_id = ?").bind(participant_data.championId, h.puuid, h.match_id).run();
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return new JsonResponse(results);
});
*/

router.all("*", () => new JsResponse("Not Found.", { status: 404 }));

export default {
  async fetch(req, env, ctx) {
    return router.fetch(req, env, ctx);
  },
  async scheduled(event, env) {
    switch (event.cron) {
      case "0 6 * * *":
        await resetPositionChange(env);
        break;
    }
  },
  async tail(events, env, ctx) {
    const url = events[0].event.request.url;
    const parts = new URL(url).pathname.split("/");
    const lastPart = parts[parts.length - 1];
    if (lastPart === "renewal" && events[0].outcome === "canceled") {
      ctx.waitUntil(fetch(worker + "/tails/revert-renewal", {
        method: "POST",
        body: JSON.stringify(events[0]),
      }));
    }
  }
};

