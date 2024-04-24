import riotApi from "../apis/riotApi";

const region = "lan";

// Export
export const updateLolIcons = async(env) => {
  const { results } = await env.PARTICIPANTS.prepare("SELECT puuid from participants").all();
  if (!results[0]) return null;

  // Update data
  for (const p of results) {
    const _riot = new riotApi(env.RIOT_KEY);
    const route = _riot.route(region);
    const summoner_data = await _riot.getSummonerByPuuid(p.puuid, route);
    await env.PARTICIPANTS.prepare("UPDATE participants SET lol_picture = ? WHERE puuid = ?")
      .bind(summoner_data.profileIconId, p.puuid).run();
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return "Updated";
};

/*
 * Requests amount:
 * Update Lol Icon (# DB length)
 */