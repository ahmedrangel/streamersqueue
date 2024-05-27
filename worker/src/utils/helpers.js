import { updateGeneralData } from "../crons/update-general-data";

export const fixRank = (elo, rank) => {
  const elo_name = elo.toLowerCase();
  if (elo_name === "challenger" || elo_name === "grandmaster" || elo_name === "master") {
    return "";
  }
  return rank;
};

export const controls = {
  lan: 1,
  las: 2,
  na: 3,
  euw: 4,
};

export const worker = "https://api-streamers-ladder.ahmedrangel.com";

export const renewalHandler = async (env, region, type) => {
  console.info("region:" + region);
  const control = controls[region];
  const defined_cooldown = 240; // in seconds
  // Start renewing
  try {
    await env.PARTICIPANTS.prepare("UPDATE control SET renewing = ? WHERE id = ? AND renewing = ?").bind(1, control, 0).run();
    const { last_updated } = await env.PARTICIPANTS.prepare("SELECT last_updated FROM control WHERE id = ?").bind(control).first();
    const date = new Date(last_updated);
    const now = new Date();
    const remaining = Math.ceil(((defined_cooldown * 1000) - (now - date)) / 1000);
    // Error if not passed 2 minutes from last updated
    if (now - date < (defined_cooldown * 1000)) {
      await env.PARTICIPANTS.prepare("UPDATE control SET renewing = ? WHERE id = ? AND renewing = ?").bind(0, control, 1).run();
      return { status: `Try again in ${remaining} seconds.`, status_code: 429, control };
    };
    await updateGeneralData(env, control, type);
    // End renewing
    await env.PARTICIPANTS.prepare("UPDATE control SET renewing = ? WHERE id = ? AND renewing = ?").bind(0, control, 1).run();
    return { status: "Renewed", status_code: 200, control };
  } catch (err) {
    await env.PARTICIPANTS.prepare("UPDATE control SET renewing = ? WHERE id = ? AND renewing = ?").bind(0, control, 1).run();
    return { status: String(err), status_code: 400, control };
  }
};

export const sleep = async (ms) => {
  return await new Promise(resolve => setTimeout(resolve, ms));
};