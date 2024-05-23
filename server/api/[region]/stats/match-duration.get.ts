import { matchDuration } from "~/server/utils/queries";
import { controls } from "~/utils/helpers";

export default defineEventHandler(async (event) => {
  const region = (getRouterParams(event).region).toLowerCase() as string;
  const order = getQuery(event).order as string;
  if (import.meta.dev) {
    return await $fetch<Record<string, any>>(`${process.env.WORKER}/${region}/stats/match-duration?order=${order}`).catch(() => null);
  }

  if (!order || order !== "asc" && order !== "desc") return { status_code: 400, status: "Bad Request" };

  const DB = process.env.PARTICIPANTS as any;
  const control = region === "all" ? "all" : controls[region] as string | number;
  const match_duration = await matchDuration(DB, control, order.toUpperCase());

  const response = {
    stats: {
      match_duration:  match_duration.results,
    },
    status_code: 200,
    status: `Match Duration: ${order === "asc" ? "Shortest" : "Longest"}`,
  };
  return response;
});
