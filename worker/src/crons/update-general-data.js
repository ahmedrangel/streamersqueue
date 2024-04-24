import twitchApi from "../apis/twitchApi";
import riotApi, { eloValues } from "../apis/riotApi";
import { fixRank, resetPositionChange } from "../utils/helpers";

let participants = [];
let twitch_data = [];
let updater_participants = [];
let updater_ingame = [];
let updater_position_change = [];

let updated_data = {};

// Iterated fetch
const updateRankedData = async(env, p) => {
  const _riot = new riotApi(env.RIOT_KEY);
  const route = _riot.route(p.lol_region);
  const ranked_data = await _riot.getRankedDataBySummonerId(p.summoner_id, route);
  if (ranked_data[0]) {
    const soloq = ranked_data.filter(item => item.queueType === "RANKED_SOLO_5x5")[0];

    if (soloq) {
      participants.push({ puuid: p.puuid, summoner_id: p.summoner_id, wins: soloq.wins, losses: soloq.losses, lp: soloq.leaguePoints, elo: soloq.tier, tier: soloq.rank, position: p.position, position_change: p.position_change });
      if (p.wins !== soloq.wins || p.losses !== soloq.losses || p.lp !== soloq.leaguePoints) {
        updater_participants.push({ puuid: p.puuid, wins: soloq.wins, losses: soloq.losses, lp: soloq.leaguePoints, elo: soloq.tier.toLowerCase(), tier: fixRank(soloq.tier, soloq.rank) });
      }
    }
    updated_data.ranked = true;
    return participants;
  }
};

// Iterated fetch
const updateLolIngameStatus = async(env, p) => {
  const _riot = new riotApi(env.RIOT_KEY);
  const route = _riot.route(p.lol_region);
  const ingame_data = await _riot.getSpectatorByPuuid(p.puuid, route);

  if (ingame_data?.participants) {
    if (p.is_ingame !== 1) {
      updater_ingame.push({ puuid: p.puuid, is_ingame: 1 });
    }
    updated_data.ingame = true;
  } else {
    if (p.is_ingame !== 0) {
      updater_ingame.push({ puuid: p.puuid, is_ingame: 0 });
    }
    updated_data.ingame = true;
  }
};

const sortRankedData = () => {
  if (!participants[0]) return null;

  // Sort participants by elo and lp
  const sorted = participants.sort((a, b) => {
    const eloComparison = eloValues[`${b.elo} ${b.tier}`] - eloValues[`${a.elo} ${a.tier}`];
    if (eloComparison !== 0) {
      return eloComparison;
    }
    return b.lp - a.lp;
  });

  // Update participants position and position_change
  let index = 0;
  for (const p of sorted) {
    const next_position = index + 1;
    const position_change = (p.position - next_position) + p.position_change;
    if (p.position !== next_position || p.position_change !== position_change) {
      updater_position_change.push({ puuid: p.puuid, position: next_position, position_change });
    }
    index++;
  }
  updated_data.sorted = true;
  return sorted;
};

// Single fetch
const updateTwitchLiveStatus = async(env, twitch_ids) => {
  const _twitch = new twitchApi(env.TWITCH_CLIENT_ID, env.TWITCH_CLIENT_SECRET);
  // Update participants live status
  const data = [];
  const streams_data = await _twitch.getStreamsById(twitch_ids);
  const live_ids = streams_data.map(s => s.user_id);
  for (const p of twitch_data) {
    if (live_ids.includes(String(p.twitch_id))) {
      if (p.twitch_is_live !== 1) {
        data.push({ twitch_id: p.twitch_id, twitch_is_live: 1 });
        await env.PARTICIPANTS.prepare("UPDATE socials SET twitch_is_live = ? WHERE twitch_id = ?")
          .bind(1, p.twitch_id).run();
      }
    } else {
      if (p.twitch_is_live !== 0) {
        data.push({ twitch_id: p.twitch_id, twitch_is_live: 0 });
        await env.PARTICIPANTS.prepare("UPDATE socials SET twitch_is_live = ? WHERE twitch_id = ?")
          .bind(0, p.twitch_id).run();
      }
    }
  }
  return data;
};

// Single fetch
const updateTwitchData = async(env, twitch_ids) => {
  const _twitch = new twitchApi(env.TWITCH_CLIENT_ID, env.TWITCH_CLIENT_SECRET);
  const data = [];
  const users_data = await _twitch.getUsersById(twitch_ids);
  for (const u of users_data) {
    const match_participant = twitch_data.filter(p => p.twitch_id == u.id)[0];
    if (u.login !== match_participant.twitch_login || u.display_name !== match_participant.twitch_display || u.profile_image_url.replace("https://static-cdn.jtvnw.net/","") !== match_participant.twitch_picture) {
      data.push(u);
      await env.PARTICIPANTS.prepare("UPDATE socials SET twitch_login = ?, twitch_display = ?, twitch_picture = ? WHERE twitch_id = ?")
        .bind(u.login, u.display_name, u.profile_image_url.replace("https://static-cdn.jtvnw.net/",""), u.id).run();
    }
  }
  return data;
};

// Export
export const updateGeneralData = async(env) => {
  const participants_results = await env.PARTICIPANTS.prepare("SELECT puuid, summoner_id, position, position_change, wins, losses, lp, is_ingame, lol_region from participants").all();
  const socials_results = await env.PARTICIPANTS.prepare("SELECT puuid, twitch_id, twitch_login, twitch_display, twitch_picture, twitch_is_live from socials").all();
  if (!participants_results.results[0] || !socials_results.results[0]) return null;

  const results = participants_results.results.map(p => {
    const socials_participants = socials_results.results.filter(s => s.puuid === p.puuid)[0];
    return { ...p, ...socials_participants };
  });

  console.info(results);

  participants = [];
  twitch_data = [];
  updater_participants = [];
  updater_ingame = [];
  updater_position_change = [];
  const twitch_ids = [];

  let index = 0;
  // Update ranked data
  for (const p of results) {
    if (index === 250) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      index = 0;
    }
    twitch_ids.push(p.twitch_id);
    await updateRankedData(env, p);
    await updateLolIngameStatus(env, p);
    await new Promise(resolve => setTimeout(resolve, 50));
    twitch_data.push({ twitch_id: p.twitch_id, twitch_login: p.twitch_login, twitch_display: p.twitch_display, twitch_picture: p.twitch_picture, twitch_is_live: p.twitch_is_live });
    index++;
  }

  const sorted = sortRankedData();

  const updater_twitch_data = await updateTwitchData(env, twitch_ids);
  const updater_twitch_live = await updateTwitchLiveStatus(env, twitch_ids);

  console.info(updater_participants);
  console.info(updater_position_change);
  console.info(updater_ingame);
  console.info(updater_twitch_data);
  console.info(updater_twitch_live);


  // Ranked update
  for (const p of updater_participants) {
    await env.PARTICIPANTS.prepare("UPDATE participants SET wins = ?, losses = ?, lp = ?, elo = ?, tier = ? WHERE puuid = ?")
      .bind(p.wins, p.losses, p.lp, p.elo, p.tier, p.puuid).run();
  }

  // Position change update
  for (const p of updater_position_change) {
    await env.PARTICIPANTS.prepare("UPDATE participants SET position = ?, position_change = ? WHERE puuid = ?")
      .bind(p.position, p.position_change, p.puuid).run();
  }

  // Ingame update
  for (const p of updater_ingame) {
    await env.PARTICIPANTS.prepare("UPDATE participants SET is_ingame = ? WHERE puuid = ?")
      .bind(p.is_ingame, p.puuid).run();
  }

  // Reset position_change if hour is 0 and minutes < 10
  await resetPositionChange(env);
  console.info("Updaters check: " + updated_data.ranked, updated_data.ingame, updated_data.sorted);
  // Update last_updated
  if (updated_data.ranked && updated_data.ingame && updated_data.sorted) {
    await env.PARTICIPANTS.prepare("UPDATE control SET last_updated = ? WHERE id = ?")
      .bind(new Date().toISOString(), 1).run();
  }

  return { sorted };
};

/*
 * Requests amount:
 * Update Ranked Data (# DB length) + Update Twitch Live Status (1) + UpdateTwitchData (1)
 */