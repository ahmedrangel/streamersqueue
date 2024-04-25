import { IttyRouter } from "itty-router";
import JsResponse from "./response";
import JsonResponse from "./jsonResponse";
import twitchApi from "./apis/twitchApi";
import riotApi from "./apis/riotApi";
import { updateGeneralData } from "./crons/update-general-data";
import { updateLolIcons } from "./crons/update-lol-icons";

const router = IttyRouter();

router.post("/add", async (req, env) => {
  const _twitch = new twitchApi(env.TWITCH_CLIENT_ID, env.TWITCH_CLIENT_SECRET);
  const _riot = new riotApi(env.RIOT_KEY);
  try {
    const { riot_name, riot_tag, region, key, twitch, twitter, instagram } = await req.json();
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
    const account = { puuid, summoner_id, riot_name, riot_tag, lol_picture, control: 1 };
    const socials = { twitch_login, twitch_display, twitch_picture, twitter, instagram, twitch_id };
    const { count } = await env.PARTICIPANTS.prepare("SELECT COUNT(*) as count FROM participants").first();
    // Add DB
    await env.PARTICIPANTS.prepare(
      `
        INSERT OR IGNORE INTO participants (puuid, summoner_id, riot_name, riot_tag, lol_picture, control, lol_region, position)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
    ).bind(puuid, summoner_id, riot_name, riot_tag, lol_picture, 1, region.toLowerCase(), count + 1).run();
    await env.PARTICIPANTS.prepare(
      `
        INSERT OR IGNORE INTO socials (puuid, twitch_login, twitch_display, twitch_picture, twitter, instagram, twitch_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `
    ).bind(puuid, twitch_login, twitch_display, twitch_picture, twitter ? twitter : "", instagram ? instagram : "", twitch_id).run();
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

router.get("/renewal", async (req, env) => {
  // Start renewing
  try {
    await env.PARTICIPANTS.prepare("UPDATE control SET renewing = ? WHERE id = ? AND renewing = ?").bind(1, 1, 0).run();
    const { last_updated } = await env.PARTICIPANTS.prepare("SELECT last_updated FROM control WHERE id = ?").bind(1).first();
    const date = new Date(last_updated);
    const now = new Date();
    const remaining = Math.ceil((120000 - (now - date)) / 1000);
    // Error if not passed 2 minutes from last updated
    if (now - date < 120000) {
      await env.PARTICIPANTS.prepare("UPDATE control SET renewing = ? WHERE id = ? AND renewing = ?").bind(0, 1, 1).run();
      return new JsonResponse({ status: `Try again in ${remaining} seconds.`, status_code: 429, control: 1 });
    };
    await updateGeneralData(env);
    // End renewing
    await env.PARTICIPANTS.prepare("UPDATE control SET renewing = ? WHERE id = ? AND renewing = ?").bind(0, 1, 1).run();
    return new JsonResponse({ status: "Renewed", status_code: 200, control: 1 });
  } catch (err) {
    await env.PARTICIPANTS.prepare("UPDATE control SET renewing = ? WHERE id = ? AND renewing = ?").bind(0, 1, 1).run();
    return new JsonResponse({ status: err, status_code: 400, control: 1 });
  }
});

router.post("/update-lol-icons", async (req, env) => {
  try {
    const { key } = await req.json();
    if (key !== env.POST_KEY) return new JsonResponse({ status: "Forbidden", status_code: 403 });
    return new JsonResponse(await updateLolIcons(env));
  } catch {
    return new JsonResponse({ status: "Bad Request", status_code: 400 });
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

router.get("/participants", async (req, env) => {
  const DB = env.PARTICIPANTS;
  const participants = await DB.prepare("SELECT * FROM participants").all();
  const socials = await DB.prepare("SELECT * FROM socials").all();
  const results = participants.results.map(p => {
    const socials_participants = socials.results.filter(s => s.puuid === p.puuid)[0];
    return { ...p, ...socials_participants };
  });

  // remove puuid and summoner_id
  for (const p of results) {
    delete p.puuid;
    delete p.summoner_id;
  }

  const control = await DB.prepare("SELECT last_updated FROM control WHERE id = ?").bind(1).first();

  const sorted = results.sort((a, b) => {
    if (!a.position || !b.position) {
      if (!a.position) return 1; // Colocar a 'a' al final
      if (!b.position) return -1; // Colocar a 'b' al final
    }
    return a.position - b.position;
  });

  const data = { participants: sorted, last_updated: control.last_updated };

  return new JsonResponse(data);
});

router.get("/renewal-status", async (req, env) => {
  const { renewing, last_updated } = await env.PARTICIPANTS.prepare("SELECT renewing, last_updated FROM control WHERE id = ?").bind(1).first();
  return new JsonResponse({ renewing: Boolean(renewing), last_updated, status_code: 200, status: "Renewal status", control_id: 1 });
});

router.all("*", () => new JsResponse("Not Found.", { status: 404 }));

export default {
  async fetch(req, env, ctx) {
    return router.fetch(req, env, ctx);
  },
  async scheduled(event, env) {
    switch (event.cron) {
      case "*/5 * * * *":
        await updateGeneralData(env);
        break;
    }
  }
};

