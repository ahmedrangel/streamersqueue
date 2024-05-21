import { kda, matchDuration, playerChampionWR } from "~/server/utils/queries";
import { controls } from "~/utils/helpers";

export default defineEventHandler(async (event) => {
  const region = (getRouterParams(event).region).toLowerCase() as string;
  if (import.meta.dev) {
    return await $fetch<Record<string, any>>(`${process.env.WORKER}/${region}/stats`).catch(() => null);
  }

  const DB = process.env.PARTICIPANTS as any;
  const control = region === "all" ? "all" : controls[region] as string | number;
  const kda_best = await kda(DB, control, "DESC");
  const kda_worst = await kda(DB, control, "ASC");

  const champion_winrates_best = await playerChampionWR(DB, control, "DESC");
  const champion_winrates_worst = await playerChampionWR(DB, control, "ASC");

  const shortest_matches = await matchDuration(DB, control, "ASC");
  const longest_matches = await matchDuration(DB, control, "DESC");

  const response = {
    stats: {
      best: {
        kda: kda_best.results,
        player_champion_wr: champion_winrates_best.results,
        match_duration: shortest_matches.results,
      },
      worst: {
        kda: kda_worst.results,
        player_champion_wr: champion_winrates_worst.results,
        match_duration: longest_matches.results,
      }
    },
    status_code: 200,
    status: "Stats",
  };
  return response;
});
