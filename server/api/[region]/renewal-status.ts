import { controls } from "~/utils/helpers";

export default defineEventHandler(async (event) => {
  const region = (getRouterParams(event).region).toLowerCase() as string;
  if (import.meta.dev) {
    return await $fetch(`${process.env.WORKER}/${region}/renewal-status`, {
      parseResponse: JSON.parse
    }).catch(() => null);
  }

  const control = controls[region];

  const DB = process.env.PARTICIPANTS as any;
  const { renewing, last_updated } = await DB.prepare("SELECT renewing, last_updated FROM control WHERE id = ?").bind(controls[region]).first();
  return { renewing: Boolean(renewing), last_updated, status_code: 200, status: "Renewal status", control };
});