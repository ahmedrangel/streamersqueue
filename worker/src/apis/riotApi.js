import { ofetch } from "ofetch";

class riotApi {
  constructor(RIOT_KEY) {
    this.RIOT_KEY = RIOT_KEY;
    this.domain = "api.riotgames.com";
  }

  async callRiotApi (options) {
    const endpoint = options?.endpoint;
    const method = options?.method ? options.method : "GET";
    const apiKey = options?.apiKey ? options.apiKey : this.RIOT_KEY;
    return await ofetch(endpoint, {
      method,
      headers: { "X-Riot-Token": apiKey }
    }).catch((e) => { return e; });
  };

  route(region) {
    region = region.toLowerCase();
    switch (region) {
      case "lan":
        region = "la1";
        break;
      case "las":
        region = "la2";
        break;
      case "na":
        region = "na1";
        break;
      case "euw":
        region = "euw1";
        break;
      default:
        region = false;
        break;
    }
    return region;
  }

  cluster(region) {
    if (region === "na" || region === "las" || region ==="lan") {
      return "americas";
    } else if (region === "euw") {
      return "europe";
    }
    return false;
  }

  async getSummonerByPuuid(puuid, route) {
    return this.callRiotApi({ endpoint: `https://${route}.${this.domain}/lol/summoner/v4/summoners/by-puuid/${puuid}` });
  }

  async getAccountByRiotID(name, tag, cluster) {
    return this.callRiotApi({ endpoint: `https://${cluster}.${this.domain}/riot/account/v1/accounts/by-riot-id/${name}/${tag}` });
  }

  async getSpectatorByPuuid(puuid, route) {
    return this.callRiotApi({ endpoint: `https://${route}.${this.domain}/lol/spectator/v5/active-games/by-summoner/${puuid}` });
  }

  async getRankedDataBySummonerId(summoner_id, route) {
    return this.callRiotApi({ endpoint: `https://${route}.${this.domain}/lol/league/v4/entries/by-summoner/${summoner_id}?api_key=${this.RIOT_KEY}` });
  }

  async getMatchesByPuuid(puuid, cluster, count, queueId, startTime) {
    return this.callRiotApi({ endpoint: `https://${cluster}.${this.domain}/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${count}&queue=${queueId ? queueId : ""}&startTime=${startTime ? startTime : ""}` });
  }

  async getMatchById(matchId, cluster) {
    return this.callRiotApi({ endpoint: `https://${cluster}.${this.domain}/lol/match/v5/matches/${matchId}` });
  }
}

export const eloValues = {
  "IRON IV": 1,
  "IRON III": 2,
  "IRON II": 3,
  "IRON I": 4,
  "BRONZE IV": 5,
  "BRONZE III": 6,
  "BRONZE II": 7,
  "BRONZE I": 8,
  "SILVER IV": 9,
  "SILVER III": 10,
  "SILVER II": 11,
  "SILVER I": 12,
  "GOLD IV": 13,
  "GOLD III": 14,
  "GOLD II": 15,
  "GOLD I": 16,
  "PLATINUM IV": 17,
  "PLATINUM III": 18,
  "PLATINUM II": 19,
  "PLATINUM I": 20,
  "EMERALD IV": 21,
  "EMERALD III": 22,
  "EMERALD II": 23,
  "EMERALD I": 24,
  "DIAMOND IV": 25,
  "DIAMOND III": 26,
  "DIAMOND II": 27,
  "DIAMOND I": 28,
  "MASTER I": 29,
  "GRANDMASTER I": 29,
  "CHALLENGER I": 29
};

export default riotApi;