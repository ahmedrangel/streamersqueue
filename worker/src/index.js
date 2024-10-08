import { IttyRouter } from "itty-router";
import JsResponse from "./response";
import JsonResponse from "./jsonResponse";
import twitchApi from "./apis/twitchApi";
import riotApi from "./apis/riotApi";
import { resetPositionChange } from "./crons/reset-position-change";
import { controls, renewalHandler } from "./utils/helpers";
import { kda, matchDuration, playerChampionWR, playerWR } from "./utils/queries";

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
    const twitch_picture = twitch_data.profile_image_url.replace("https://static-cdn.jtvnw.net/", "");
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
  }
  catch (e) {
    console.info(e);
    return new JsonResponse({ error: e.message, status: "An error ocurred", status_code: 400 });
  }
});

// This will only remove from socials table
router.post("/delete", async (req, env) => {
  try {
    const { key, riot_name, riot_tag } = await req.json();
    if (key !== env.POST_KEY) return new JsonResponse({ status: "Forbidden", status_code: 403 });
    if (!riot_name || !riot_tag) return new JsonResponse({ status: "Bad Request", status_code: 400 });
    await env.PARTICIPANTS.prepare("DELETE FROM socials WHERE puuid IN (SELECT puuid FROM participants WHERE riot_name = ? AND riot_tag = ?)").bind(riot_name, riot_tag).run();
    return new JsonResponse({ status: "Deleted", status_code: 200 });
  }
  catch (e) {
    console.info(e);
    return new JsonResponse({ error: e.message, status: "An error ocurred", status_code: 400 });
  }
});

router.get("/:region/renewal", async (req, env) => {
  const region = req.params.region.toLowerCase();
  return new JsonResponse(await renewalHandler(env, region, "endpoint"));
});

router.post("/reset-position-change", async (req, env) => {
  try {
    const { key } = await req.json();
    if (key !== env.POST_KEY) return new JsonResponse({ status: "Forbidden", status_code: 403 });
    await env.PARTICIPANTS.prepare("UPDATE participants SET position_change = 0 WHERE position_change IS NOT 0").run();
    return new JsResponse("Reseted");
  }
  catch (err) {
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
  }
  catch (err) {
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
  }
  catch (err) {
    return new JsResponse(err);
  }
});

router.get("/:region/stats", async (req, env) => {
  const region = req.params.region.toLowerCase();
  const control = region === "all" ? "all" : controls[region];
  const DB = env.PARTICIPANTS;

  const kda_best = await kda(DB, control, "DESC");
  const kda_worst = await kda(DB, control, "ASC");

  const champion_winrates_best = await playerChampionWR(DB, control, "DESC");
  const champion_winrates_worst = await playerChampionWR(DB, control, "ASC");

  const shortest_matches = await matchDuration(DB, control, "ASC");
  const longest_matches = await matchDuration(DB, control, "DESC");

  const player_wr_best = await playerWR(DB, control, "DESC");
  const player_wr_worst = await playerWR(DB, control, "ASC");

  const response = {
    stats: {
      best: {
        kda: kda_best.results,
        player_champion_wr: champion_winrates_best.results,
        match_duration: shortest_matches.results,
        player_wr: player_wr_best.results
      },
      worst: {
        kda: kda_worst.results,
        player_champion_wr: champion_winrates_worst.results,
        match_duration: longest_matches.results,
        player_wr: player_wr_worst.results
      }
    },
    status_code: 200,
    status: "Stats"
  };
  return new JsonResponse(response);
});

router.get("/:region/stats/kda-avg", async (req, env) => {
  const region = req.params.region.toLowerCase();
  const order = req.query.order;
  if (!order || (order !== "desc" && order !== "asc")) return new JsonResponse({ status: "Bad Request", status_code: 400 });

  const control = region === "all" ? "all" : controls[region];
  const DB = env.PARTICIPANTS;
  const kda_result = await kda(DB, control, order.toUpperCase());

  const response = {
    stats: {
      kda: kda_result.results
    },
    status_code: 200,
    status: `${order === "desc" ? "Highest" : "Lowest"} KDA Averages`
  };
  return new JsonResponse(response);
});

router.get("/:region/stats/match-duration", async (req, env) => {
  const region = req.params.region.toLowerCase();
  const order = req.query.order;
  if (!order || (order !== "desc" && order !== "asc")) return new JsonResponse({ status: "Bad Request", status_code: 400 });

  const control = region === "all" ? "all" : controls[region];
  const DB = env.PARTICIPANTS;
  const match_duration = await matchDuration(DB, control, order.toUpperCase());

  const response = {
    stats: {
      match_duration: match_duration.results
    },
    status_code: 200,
    status: `Match Duration: ${order === "asc" ? "Shortest" : "Longest"}`
  };
  return new JsonResponse(response);
});

router.get("/:region/stats/player-champion-winrate", async (req, env) => {
  const region = req.params.region.toLowerCase();
  const order = req.query.order;
  if (!order || (order !== "desc" && order !== "asc")) return new JsonResponse({ status: "Bad Request", status_code: 400 });

  const control = region === "all" ? "all" : controls[region];
  const DB = env.PARTICIPANTS;
  const player_champion_wr = await playerChampionWR(DB, control, order.toUpperCase());

  const response = {
    stats: {
      player_champion_wr: player_champion_wr.results
    },
    status_code: 200,
    status: `${order === "desc" ? "Highest" : "Lowest"} Champion Winrates`
  };
  return new JsonResponse(response);
});

router.get("/:region/stats/player-winrate", async (req, env) => {
  const region = req.params.region.toLowerCase();
  const order = req.query.order;
  if (!order || (order !== "desc" && order !== "asc")) return new JsonResponse({ status: "Bad Request", status_code: 400 });

  const control = region === "all" ? "all" : controls[region];
  const DB = env.PARTICIPANTS;
  const player_wr = await playerWR(DB, control, order.toUpperCase());

  const response = {
    stats: {
      player_wr: player_wr.results
    },
    status_code: 200,
    status: `${order === "desc" ? "Highest" : "Lowest"} Player Winrates`
  };
  return new JsonResponse(response);
});

/*
router.get("/sync-history", async (req, env) => {
  const DB = env.PARTICIPANTS;
  const { results } = await DB.prepare("SELECT h.puuid, h.match_id, p.lol_region FROM history AS h INNER JOIN participants AS p ON h.puuid = p.puuid WHERE game_surrendered IS NULL LIMIT 400").all();
  const _riot = new riotApi(env.RIOT_KEY);
  for (const h of results) {
    const cluster = _riot.cluster(h.lol_region);
    const match_data = await _riot.getMatchById(h.match_id, cluster);
    const participant_data = match_data?.info?.participants?.filter(item => item?.puuid === h?.puuid)[0];
    const game_surrendered = participant_data.gameEndedInSurrender || participant_data.gameEndedInEarlySurrender ? 1 : 0;
    await DB.prepare("UPDATE history SET game_surrendered = ? WHERE puuid = ? AND match_id = ?").bind(game_surrendered, h.puuid, h.match_id).run();
    await sleep(100);
  }
  return new JsonResponse(results);
});
*/

router.all("*", () => new JsResponse("Not Found.", { status: 404 }));

export default {
  async fetch (req, env, ctx) {
    return router.fetch(req, env, ctx);
  },
  async scheduled (event, env) {
    switch (event.cron) {
      case "0 6 * * *":
        await resetPositionChange(env);
        break;
      case "0 5/12 * * *":
        await renewalHandler(env, "las", "cron");
        break;
      case "0 4/12 * * *":
        await renewalHandler(env, "na", "cron");
        break;
      case "0 3/12 * * *":
        await renewalHandler(env, "euw", "cron");
        break;
      case "0 2/12 * * *":
        await renewalHandler(env, "lan", "cron");
        break;
    }
  }
};
