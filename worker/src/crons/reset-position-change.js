export const resetPositionChange = async (env) => {
  const timeZone = "America/Mexico_City";
  const now = new Date();
  const nowInCDMX = new Date(now.toLocaleString("en-US", { timeZone }));
  const hours = nowInCDMX.getHours();
  const minutes = nowInCDMX.getMinutes();
  if (hours === 0 && minutes < 5) {
    await env.PARTICIPANTS.prepare("UPDATE participants SET position_change = 0 WHERE position_change IS NOT 0").run();
    console.info("position change reseted");
  }
  console.info(hours, minutes);
};
