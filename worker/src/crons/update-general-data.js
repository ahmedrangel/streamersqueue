import twitchApi from "../apis/twitchApi";
import riotApi, { eloValues } from "../apis/riotApi";
import { fixRank } from "../utils/helpers";

// Iterated fetch
const updateRankedData = async(env, p) => {
  let participants;
  let updater_participants;
  let updater_history = [];
  const _riot = new riotApi(env.RIOT_KEY);
  const route = _riot.route(p.lol_region);
  const cluster = _riot.cluster(p.lol_region);
  const ranked_data = await _riot.getRankedDataBySummonerId(p.summoner_id, route);
  const soloq = ranked_data ? ranked_data?.filter(item => item?.queueType === "RANKED_SOLO_5x5")[0] : null;

  if (soloq) {
    participants = { puuid: p.puuid, summoner_id: p.summoner_id, wins: soloq.wins, losses: soloq.losses, lp: soloq.leaguePoints, elo: soloq.tier, tier: soloq.rank, position: p.position, position_change: p.position_change };
    if (p.wins !== soloq.wins || p.losses !== soloq.losses || p.lp !== soloq.leaguePoints) {
      updater_participants = { puuid: p.puuid, wins: soloq.wins, losses: soloq.losses, lp: soloq.leaguePoints, elo: soloq.tier.toLowerCase(), tier: fixRank(soloq.tier, soloq.rank) };
    }
    const matches = await _riot.getMatchesByPuuid(p.puuid, cluster, 100, 420, p.lol_region);
    const db_matches = await env.PARTICIPANTS.prepare("SELECT match_id FROM history WHERE puuid = ?")
      .bind(p.puuid).all();
    const db_matches_ids = db_matches.results?.map(item => item.match_id);
    if (matches.length) {
      console.info("saving recent matches");
      for (const m of matches) {
        if (!db_matches_ids.includes(m)) {
          const match_data = await _riot.getMatchById(m, cluster);
          const participant_data = match_data?.info?.participants?.filter(item => item?.puuid === p?.puuid)[0] || null;
          updater_history.push({
            puuid: p.puuid,
            match_id: m,
            kills: participant_data?.kills,
            deaths: participant_data?.deaths,
            assists: participant_data?.assists,
            result: participant_data?.win,
            is_remake: participant_data?.gameEndedInEarlySurrender,
            champion: participant_data?.championId,
            date: match_data?.info?.gameCreation,
            duration: match_data?.info?.gameDuration,
          });
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }
    return { participants, updater_participants, updater_history, updated_data: true };
  } else {
    console.info("fetching matches");
    const matches = await _riot.getMatchesByPuuid(p.puuid, cluster, 20, 420, p.lol_region);
    const db_matches = await env.PARTICIPANTS.prepare("SELECT match_id FROM history WHERE puuid = ?")
      .bind(p.puuid).all();
    const db_matches_ids = db_matches.results?.map(item => item.match_id);
    let wins = 0;
    let losses = 0;
    if (matches.length) {
      for (const m of matches) {
        if (!db_matches_ids.includes(m)) {
          const match_data = await _riot.getMatchById(m, cluster);
          const participant_data = match_data?.info?.participants?.filter(item => item?.puuid === p?.puuid)[0] || null;
          if (participant_data?.win && !participant_data?.gameEndedInEarlySurrender)
            wins = wins + 1;
          if (!participant_data?.win && !participant_data?.gameEndedInEarlySurrender)
            losses = losses + 1;
          updater_history.push({
            puuid: p.puuid,
            match_id: m,
            kills: participant_data?.kills,
            deaths: participant_data?.deaths,
            assists: participant_data?.assists,
            result: participant_data?.win,
            is_remake: participant_data?.gameEndedInEarlySurrender,
            champion: participant_data?.championId,
            date: match_data?.info?.gameCreation,
            duration: match_data?.info?.gameDuration,
          });
        }
      }

      console.info("fetching from db");
      const { db_wins } = await env.PARTICIPANTS.prepare("SELECT COUNT(result) AS db_wins FROM history WHERE result = ? AND is_remake = ? AND puuid = ?")
        .bind(1, 0, p.puuid).first();
      const { db_losses } = await env.PARTICIPANTS.prepare("SELECT COUNT(result) AS db_losses FROM history WHERE result = ? AND is_remake = ? AND puuid = ?")
        .bind(0, 0, p.puuid).first();
      wins = db_wins ? wins + db_wins : wins;
      losses = db_losses ? losses + db_losses : losses;
      participants = { puuid: p.puuid, summoner_id: p.summoner_id, wins, losses, lp: p.lp, elo: null, tier: null, position: p.position, position_change: p.position_change };
      updater_participants = { puuid: p.puuid, wins, losses, lp: null, elo: null, tier: null };
      return { participants, updater_participants, updater_history, updated_data: true };
    } else {
      participants = { puuid: p.puuid, summoner_id: p.summoner_id, wins: 0, losses: 0, lp: null, elo: null, tier: null, position: p.position, position_change: p.position_change };
      updater_participants = { puuid: p.puuid, wins: 0, losses: 0, lp: null, elo: null, tier: null };
      return { participants, updater_participants, updated_data: true };
    }
  }
};

// Iterated fetch
const updateLolIngameStatus = async(env, p) => {
  let updater_ingame;
  let updated_data;
  const _riot = new riotApi(env.RIOT_KEY);
  const route = _riot.route(p.lol_region);
  const ingame_data = await _riot.getSpectatorByPuuid(p.puuid, route);

  if (ingame_data?.participants) {
    const lol_picture = ingame_data?.participants.filter(item => item.puuid === p.puuid)[0].profileIconId;
    const riotId = ingame_data?.participants.filter(item => item.puuid === p.puuid)[0].riotId;
    const riotIdSplitted = riotId.split("#");
    const riot_name = riotIdSplitted[0];
    const riot_tag = riotIdSplitted[1];

    if (lol_picture && lol_picture !== p.lol_picture) {
      console.info("LoL Icon Updated:" + lol_picture);
      await env.PARTICIPANTS.prepare("UPDATE OR IGNORE participants SET lol_picture = ? WHERE puuid = ?").bind(lol_picture, p.puuid).run();
    }

    if (riot_name && riot_name !== p.riot_name) {
      console.info("Riot Name Updated: " + riot_name);
      await env.PARTICIPANTS.prepare("UPDATE OR IGNORE participants SET riot_name = ? WHERE puuid = ?").bind(riot_name, p.puuid).run();
    }

    if (riot_tag && riot_tag !== p.riot_tag) {
      console.info("Riot Tag Updated: " + riot_tag);
      await env.PARTICIPANTS.prepare("UPDATE OR IGNORE participants SET riot_tag = ? WHERE puuid = ?").bind(riot_tag, p.puuid).run();
    }

    if (p.is_ingame !== 1) {
      updater_ingame = { puuid: p.puuid, is_ingame: 1 };
    }
    updated_data = true;
  } else {
    if (p.is_ingame !== 0) {
      updater_ingame = { puuid: p.puuid, is_ingame: 0 };
    }
    updated_data = true;
  }

  return { updater_ingame, updated_data };
};

const sortRankedData = (participants) => {
  if (!participants[0]) return null;
  // Sort participants by elo and lp
  const updater_position_change = [];
  let updated_data;
  const sorted = participants.sort((a, b) => {
    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    } else {
      return a.losses - b.losses;
    }
  }).sort((a, b) => {
    if (a.elo && b.elo) {
      const eloComparison = eloValues[`${b.elo} ${b.tier}`] - eloValues[`${a.elo} ${a.tier}`];
      if (eloComparison !== 0) {
        return eloComparison;
      }
      return b.lp - a.lp;
    } else if (a.elo) {
      return -1;
    } else if (b.elo) {
      return 1;
    }
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
  updated_data = true;
  return { sorted, updater_position_change, updated_data };
};

// Single fetch
const updateTwitchLiveStatus = async(env, twitch_ids, twitch_data) => {
  const _twitch = new twitchApi(env.TWITCH_CLIENT_ID, env.TWITCH_CLIENT_SECRET);
  // Update participants live status
  const data = [];
  const streams_data = await _twitch.getStreamsById(twitch_ids);
  const live_ids = streams_data.map(s => s.user_id);
  for (const p of twitch_data) {
    if (live_ids.includes(String(p.twitch_id))) {
      if (p.twitch_is_live !== 1) {
        data.push({ twitch_id: p.twitch_id, twitch_is_live: 1 });
        await env.PARTICIPANTS.prepare("UPDATE OR IGNORE socials SET twitch_is_live = ? WHERE twitch_id = ?")
          .bind(1, p.twitch_id).run();
      }
    } else {
      if (p.twitch_is_live !== 0) {
        data.push({ twitch_id: p.twitch_id, twitch_is_live: 0 });
        await env.PARTICIPANTS.prepare("UPDATE OR IGNORE socials SET twitch_is_live = ? WHERE twitch_id = ?")
          .bind(0, p.twitch_id).run();
      }
    }
  }
  return data;
};

// Single fetch
const updateTwitchData = async(env, twitch_ids, twitch_data) => {
  const _twitch = new twitchApi(env.TWITCH_CLIENT_ID, env.TWITCH_CLIENT_SECRET);
  const data = [];
  const users_data = await _twitch.getUsersById(twitch_ids);
  for (const u of users_data) {
    const match_participant = twitch_data.filter(p => p.twitch_id == u.id)[0];
    if (u.login !== match_participant.twitch_login || u.display_name !== match_participant.twitch_display || u.profile_image_url.replace("https://static-cdn.jtvnw.net/","") !== match_participant.twitch_picture) {
      data.push(u);
      await env.PARTICIPANTS.prepare("UPDATE OR IGNORE socials SET twitch_login = ?, twitch_display = ?, twitch_picture = ? WHERE twitch_id = ?")
        .bind(u.login, u.display_name, u.profile_image_url.replace("https://static-cdn.jtvnw.net/",""), u.id).run();
    }
  }
  return data;
};

// Export
export const updateGeneralData = async(env, control) => {
  const { results } = await env.PARTICIPANTS.prepare(`
    SELECT
      p.puuid, p.summoner_id, p.riot_name, p.riot_tag, p.position, p.position_change, p.wins, p.losses, p.lp, p.is_ingame, p.lol_region, p.lol_picture,
      s.twitch_id, s.twitch_login, s.twitch_display, s.twitch_picture, s.twitch_is_live
    FROM participants as p
    INNER JOIN socials as s ON p.puuid = s.puuid
    WHERE control = ?
    `)
    .bind(control).all();

  if (!results[0]) return null;

  const participants = [];
  const twitch_data = [];
  const updater_participants = [];
  const updater_ingame = [];
  const updated_data = {};
  const updater_history = [];
  const twitch_ids = [];

  let index = 0;
  // Update ranked data
  for (const p of results) {
    if (index === 166) {
      await new Promise(resolve => setTimeout(resolve, 11000));
      index = 0;
    }
    twitch_ids.push(p.twitch_id);
    const ranked_data = await updateRankedData(env, p);
    if (ranked_data?.participants) participants.push(ranked_data.participants);
    if (ranked_data?.updater_participants) updater_participants.push(ranked_data.updater_participants);
    if (ranked_data?.updated_data) updated_data.ranked = ranked_data.updated_data;
    if (ranked_data?.updater_history) updater_history.push(...ranked_data.updater_history);

    const ingame_data = await updateLolIngameStatus(env, p);
    if (ingame_data.updater_ingame) updater_ingame.push(ingame_data.updater_ingame);
    if (ingame_data.updated_data) updated_data.ingame = ingame_data.updated_data;

    twitch_data.push({ twitch_id: p.twitch_id, twitch_login: p.twitch_login, twitch_display: p.twitch_display, twitch_picture: p.twitch_picture, twitch_is_live: p.twitch_is_live });
    index++;
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const sorted_data = sortRankedData(participants);
  const updater_position_change = sorted_data.updater_position_change;
  updated_data.sorted = sorted_data.updated_data;

  const updater_twitch_data = await updateTwitchData(env, twitch_ids, twitch_data);
  const updater_twitch_live = await updateTwitchLiveStatus(env, twitch_ids, twitch_data);

  // console.info(updater_participants);
  console.info(updater_position_change);
  console.info(updater_ingame);
  console.info(updater_twitch_data);
  console.info(updater_twitch_live);


  // Ranked update
  for (const p of updater_participants) {
    await env.PARTICIPANTS.prepare("UPDATE OR IGNORE participants SET wins = ?, losses = ?, lp = ?, elo = ?, tier = ? WHERE puuid = ? AND control = ?")
      .bind(p.wins, p.losses, p.lp, p.elo, p.tier, p.puuid, control).run();
  }

  // Position change update
  for (const p of updater_position_change) {
    await env.PARTICIPANTS.prepare("UPDATE OR IGNORE participants SET position = ?, position_change = ? WHERE puuid = ? AND control = ?")
      .bind(p.position, p.position_change, p.puuid, control).run();
  }

  // Ingame update
  for (const p of updater_ingame) {
    await env.PARTICIPANTS.prepare("UPDATE OR IGNORE participants SET is_ingame = ? WHERE puuid = ? AND control = ?")
      .bind(p.is_ingame, p.puuid, control).run();
  }

  const matches = Array.from(new Set(updater_history.map(match => match.match_id))).map(matchId => updater_history.find(match => match.match_id === matchId));

  // Matches Insert
  for (const m of matches) {
    await env.PARTICIPANTS.prepare("INSERT OR IGNORE INTO matches (match_id, date, duration) VALUES (?, ?, ?)")
      .bind(m.match_id, String(m.date), String(m.duration)).run();
  }

  // History Insert
  for (const m of updater_history) {
    await env.PARTICIPANTS.prepare("INSERT OR IGNORE INTO history (match_id, puuid, kills, deaths, assists, is_remake, result, champion) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(m.match_id, m.puuid, m.kills, m.deaths, m.assists, m.is_remake, m.result, m.champion).run();
  }

  console.info("Updaters check: " + updated_data.ranked, updated_data.ingame, updated_data.sorted);
  // Update last_updated
  if (updated_data.ranked && updated_data.ingame && updated_data.sorted) {
    await env.PARTICIPANTS.prepare("UPDATE OR IGNORE control SET last_updated = ? WHERE id = ?")
      .bind(new Date().toISOString(), control).run();
  }

  return { sorted: sorted_data.sorted };
};

/*
 * Requests amount:
 * Update Ranked Data (# DB length) + Update Twitch Live Status (1) + UpdateTwitchData (1) + Match (#DB Length + Not saved match length)
 */