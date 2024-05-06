import { IttyRouter } from "itty-router";
import JsResponse from "./response";
import JsonResponse from "./jsonResponse";
import twitchApi from "./apis/twitchApi";
import riotApi from "./apis/riotApi";
import { updateGeneralData } from "./crons/update-general-data";
import { resetPositionChange } from "./crons/reset-position-change";
import { controls } from "./utils/helpers";

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
  }
};

