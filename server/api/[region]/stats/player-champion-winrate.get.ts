import { controls } from "~/utils/helpers";

export default defineEventHandler(async (event) => {
  const region = (getRouterParams(event).region).toLowerCase() as string;
  const order = getQuery(event).order as string;
  if (import.meta.dev) {
    return await $fetch<Record<string, any>>(`${process.env.WORKER}/${region}/stats/player-champion-winrate?order=${order}`).catch(() => null);
  }

  if (!order || (order !== "asc" && order !== "desc")) return { status_code: 400, status: "Bad Request" };

  const DB = process.env.PARTICIPANTS as any;
  const control = region === "all" ? "all" : controls[region] as string | number;
  const player_champion_wr = await playerChampionWR(DB, control, order.toUpperCase());

  const response = {
    stats: {
      player_champion_wr: player_champion_wr.results
    },
    status_code: 200,
    status: `${order === "desc" ? "Highest" : "Lowest"} Champion Winrates`
  };
  return response;
});
