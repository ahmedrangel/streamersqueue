import { kda } from "~/server/utils/queries";
import { controls } from "~/utils/helpers";

export default defineEventHandler(async (event) => {
  const region = (getRouterParams(event).region).toLowerCase() as string;
  const order = getQuery(event).order as string;
  if (import.meta.dev) {
    return await $fetch<Record<string, any>>(`${process.env.WORKER}/${region}/stats/kda-avg?order=${order}`).catch(() => null);
  }

  if (!order || (order !== "asc" && order !== "desc")) return { status_code: 400, status: "Bad Request" };

  const DB = process.env.PARTICIPANTS as any;
  const control = region === "all" ? "all" : controls[region] as string | number;
  const kda_result = await kda(DB, control, order.toUpperCase());

  const response = {
    stats: {
      kda: kda_result.results
    },
    status_code: 200,
    status: `${order === "desc" ? "Highest" : "Lowest"} KDA Averages`
  };
  return response;
});
