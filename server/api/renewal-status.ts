export default defineEventHandler(async () => {
  if (import.meta.dev) {
    return await $fetch(process.env.WORKER + "/renewal-status", {
      parseResponse: JSON.parse
    }).catch(() => null);
  }

  const DB = process.env.PARTICIPANTS as any;
  const { renewing, last_updated } = await DB.prepare("SELECT renewing, last_updated FROM control WHERE id = ?").bind(1).first();
  return { renewing: Boolean(renewing), last_updated, status_code: 200, status: "Renewal status", control_id: 1 };
});